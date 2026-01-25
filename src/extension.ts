import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "node:path";

/**
 * Returns an absolute file‑system path by resolving `relativePath`
 * against the extension’s root folder.
 *
 * @param context   The ExtensionContext passed to your activate() function.
 * @param relativePath  Path relative to the extension root (e.g. "assets/icon.png").
 */
export function getAbsolutePath(
  context: vscode.ExtensionContext,
  relativePath: string,
): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.resolve(context.extensionPath, relativePath);
}

// Helper to determine if a line is a Markdown TODO task (e.g. "- [ ] Task" or "- [x] Task")
function isTodoLine(line: string): boolean {
  return /^\s*-\s\[[ xX]\]\s/.test(line);
}

// ------------------------------------------------------------
// Helper: play a sound (custom file or fallback beep)
function playSound(soundPath: string) {
  if (soundPath && fs.existsSync(soundPath)) {
    const cp = require("child_process");
    const cmd = process.platform === "darwin" ? "afplay" : "aplay";
    try {
      cp.spawn(cmd, [soundPath]);
    } catch {}
  } else {
    vscode.window.showInformationMessage("⏰");
  }
}

// ------------------------------------------------------------
// Helper: increment pomodoro count in front‑matter (YAML or TOML)
// Increment pomodoro count for the given task ID inside front‑matter.
function incrementPomodoroCount(document: vscode.TextDocument, taskId: string) {
  const text = document.getText();
  const yamlMatch = text.match(/^---\s*([\s\S]*?)\s*---/m);
  const tomlMatch = text.match(/^\+\+\+\s*([\s\S]*?)\s*\+\+\+/m);

  if (yamlMatch) {
    // YAML format – store under params.tasks.<id>.pomodoro
    const delimiter = "---";
    let front = yamlMatch[1];
    const tasksPath = /params\.tasks:/m;
    if (!tasksPath.test(front)) {
      front += "\nparams.tasks:";
    }
    const idBlock = new RegExp(
      `(${taskId}):\\s*\n(?: {2,})?pomodoro:\s*(\d+)`,
      "m",
    );
    if (idBlock.test(front)) {
      front = front.replace(
        idBlock,
        (_, id, num) => `${id}:\n  pomodoro: ${parseInt(num) + 1}`,
      );
    } else {
      // Append new entry
      front = front.replace(
        /(params\.tasks:\s*)/,
        `$1\n  ${taskId}:\n    pomodoro: 1`,
      );
    }
    const newBlock = `${delimiter}\n${front}\n${delimiter}`;
    const newText = text.replace(
      new RegExp(`^${delimiter}\\s*[\\s\\S]*?\s*${delimiter}`, "m"),
      newBlock,
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length),
      ),
      newText,
    );
    vscode.workspace.applyEdit(edit);
  } else if (tomlMatch) {
    // TOML format – expect a [params.tasks] table with id and pomodoro fields
    const delimiter = "+++";
    let front = tomlMatch[1];
    const tasksTable = /\[params\.tasks\]/m;
    if (!tasksTable.test(front)) {
      front += "\n[params.tasks]";
    }
    // Find existing block for this id
    const blockPattern = new RegExp(
      `id\s*=\s*\"${taskId}\"[\s\S]*?pomodoro\s*=\s*(\d+)`,
    );
    if (blockPattern.test(front)) {
      front = front.replace(
        blockPattern,
        (_, num) => `id = \"${taskId}\"\npomodoro = ${parseInt(num) + 1}`,
      );
    } else {
      // Append new block under the table
      front += `\nid = \"${taskId}\"\npomodoro = 1`;
    }
    const newBlock = `${delimiter}\n${front}\n${delimiter}`;
    const newText = text.replace(
      new RegExp(`^${delimiter}\\s*[\\s\\S]*?\s*${delimiter}`, "m"),
      newBlock,
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length),
      ),
      newText,
    );
    vscode.workspace.applyEdit(edit);
  }
}

// ------------------------------------------------------------
export function activate(context: vscode.ExtensionContext) {
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
  );
  statusBar.text = "Pomodoro: idle";
  statusBar.show();

  let timer: NodeJS.Timeout | undefined;
  let remainingSec = 0;
  type Phase = "pomodoro" | "shortBreak" | "longBreak";
  let phase: Phase = "pomodoro";
  let completedPomodoros = 0;
  let currentTaskId: string | undefined = undefined;

  const cfg = vscode.workspace.getConfiguration("tomatonote");

  // Helper: ensure the active document is a markdown file with front‑matter
  function hasFrontMatter(doc: vscode.TextDocument): boolean {
    if (doc.languageId !== "markdown") {
      return false;
    }
    const text = doc.getText();
    return (
      /^---\s*[\s\S]*?\s*---/m.test(text) ||
      /^\+\+\+\s*[\s\S]*?\s*\+\+\+/m.test(text)
    );
  }

  const startCmd = vscode.commands.registerCommand(
    "tomatonote.startTimer",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !hasFrontMatter(editor.document)) {
        vscode.window.showWarningMessage(
          "TomatoNote: Open a markdown file with front‑matter to start the timer.",
        );
        return;
      }
      // Ensure cursor is on a Markdown TODO line and obtain/create a stable ID
      const line = editor.document.lineAt(editor.selection.active.line);
      const lineText = line.text;
      if (!isTodoLine(lineText)) {
        vscode.window.showWarningMessage(
          '🛑 Place the cursor on a Markdown TODO line (e.g. "- [ ] task") before starting.',
        );
        return;
      }

      // Look for existing ID comment `<!-- id:xxxx -->`
      const idMatch = lineText.match(/<!--\s*id:\s*([a-zA-Z0-9]+)\s*-->/);
      let taskId = idMatch ? idMatch[1] : null;
      if (!taskId) {
        // generate short base‑36 random string
        taskId = Math.random().toString(36).substr(2, 8);
        const edit = new vscode.WorkspaceEdit();
        // Insert before line end, preserving a space before comment
        edit.insert(
          editor.document.uri,
          line.range.end,
          ` <!-- id:${taskId} -->`,
        );
        vscode.workspace.applyEdit(edit);
      }

      // Store the current task ID for later pomodoro increment
      currentTaskId = taskId;
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      phase = "pomodoro";
      remainingSec = (cfg.get<number>("pomodoroMinutes") ?? 25) * 60;
      updateStatus();
      timer = setInterval(tick, 1000);
    },
  );

  const stopCmd = vscode.commands.registerCommand(
    "tomatonote.stopTimer",
    () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      remainingSec = 0;
      statusBar.text = "Pomodoro: stopped";
    },
  );

  function tick() {
    remainingSec--;
    if (remainingSec <= 0) {
      clearInterval(timer!);
      // handle phase transition and play appropriate sound
      if (phase === "pomodoro") {
        // increment count for current task ID
        const editor = vscode.window.activeTextEditor;
        if (
          editor &&
          editor.document.languageId === "markdown" &&
          currentTaskId
        ) {
          incrementPomodoroCount(editor.document, currentTaskId);
        }
        completedPomodoros++;
        // decide next break length and play transition sound
        if (completedPomodoros % 4 === 0) {
          phase = "longBreak";
          remainingSec = (cfg.get<number>("longBreakMinutes") ?? 15) * 60;
          playSound(
            getAbsolutePath(
              context,
              cfg.get<string>("soundPomodoroToLong") ?? "",
            ),
          );
        } else {
          phase = "shortBreak";
          remainingSec = (cfg.get<number>("shortBreakMinutes") ?? 5) * 60;
          playSound(
            getAbsolutePath(
              context,
              cfg.get<string>("soundPomodoroToShort") ?? "",
            ),
          );
        }
      } else if (phase === "shortBreak") {
        // short break finished, back to pomodoro
        phase = "pomodoro";
        remainingSec = (cfg.get<number>("pomodoroMinutes") ?? 25) * 60;
        playSound(
          getAbsolutePath(
            context,
            cfg.get<string>("soundShortToPomodoro") ?? "",
          ),
        );
      } else if (phase === "longBreak") {
        // long break finished, back to pomodoro
        phase = "pomodoro";
        remainingSec = (cfg.get<number>("pomodoroMinutes") ?? 25) * 60;
        playSound(
          getAbsolutePath(
            context,
            cfg.get<string>("soundLongToPomodoro") ?? "",
          ),
        );
      }
      updateStatus();
      timer = setInterval(tick, 1000);
    } else {
      updateStatus();
    }
  }

  function updateStatus() {
    const mins = Math.floor(remainingSec / 60);
    const secs = ("0" + (remainingSec % 60)).slice(-2);
    let icon = "🍅";
    if (phase === "shortBreak") {
      icon = "☕";
    } else if (phase === "longBreak") {
      icon = "🛌";
    }
    statusBar.text = `${icon} ${mins}:${secs}`;
  }

  context.subscriptions.push(startCmd, stopCmd, statusBar);
}

export function deactivate() {}
