import { Config } from "./config/config";
import * as fm from "./frontmatter";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "node:path";
import { Task } from "./task";
import { TomatoUI } from "./tomat-ui";
import { Phase } from "./types";
import { SoundPlayer } from "./sound-player";
import { DailyStats } from "./daily-stats";

export class TomatoTimer {
  private config: Config | undefined;
  private timer: NodeJS.Timeout | undefined;
  private phase: Phase = "pomodoro";
  private remainingSec = 0;
  private tomatoUI: TomatoUI;
  private completedPomodoros = 0;
  private currentTask: Task | undefined;
  private extensionPath: string | undefined;
  private soundPlayer: SoundPlayer | undefined;

  constructor(soundPlayer: SoundPlayer | undefined = undefined) {
    this.tomatoUI = new TomatoUI();
    this.soundPlayer = soundPlayer;
  }

  public start() {
    if (!this.config) {
      throw new Error("configが設定されていません。");
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(
        "TomatoNote: ファイルを開いてください。",
      );
      return;
    }
    if (!fm.isMarkdown(editor.document)) {
      vscode.window.showWarningMessage(
        "TomatoNote: Markdownファイルを開いてください。",
      );
      return;
    }
    if (!fm.hasFrontMatter(editor.document)) {
      vscode.window.showWarningMessage(
        "TomatoNote: FrontMatterが記載されたMarkdownファイルを開いてください。",
      );
      return;
    }
    // Ensure cursor is on a Markdown TODO line and obtain/create a stable ID
    const line = editor.document.lineAt(editor.selection.active.line);
    this.currentTask = new Task(editor.document.uri, line);

    if (!this.currentTask.isTaskLine()) {
      vscode.window.showWarningMessage(
        "TomatoNote: タスク行にカーソルを置いてください。(e.g. `- [ ] task1`)",
      );
      return;
    }

    // Look for existing ID comment `<!-- id:xxxx -->`
    if (!this.currentTask.id) {
      // generate short base‑36 random string
      this.currentTask.appendTaskId(editor, line);
    }
    this.phase = "pomodoro";
    this.remainingSec = this.config.pomodoroMinutes * 60;
    this.updateStatus();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.remainingSec = 0;
    // this.statusBar.text = `⏰: stopped ${this.currentTask?.getTaskName()}`;
    this.tomatoUI.Stop(this.currentTask);
  }

  public refreshConfig(config: Config) {
    this.config = config;
  }

  public async incrementPomodoroCount(editor: vscode.TextEditor, task: Task) {
    const taskId = task.id;

    if (!taskId) {
      throw new Error("taskidの取得に失敗しました");
    }

    // frontmatterを取得
    const data = fm.getFrontMatter(editor);
    if (!("params" in data)) {
      data["params"] = {};
    }
    if (!("tasks" in data["params"])) {
      data["params"]["tasks"] = {};
    }
    if (!(taskId in data["params"]["tasks"])) {
      data["params"]["tasks"][taskId] = { tomato: 0 };
    }
    data["params"]["tasks"][taskId]["tomato"] += 1;

    fm.updateFrontMatter(editor, data, true);
    // console.log(data);

    // ~/.tomatonote
    const daily = new DailyStats();
    await daily.increment(task);
  }

  public tick() {
    if (!this.config) {
      throw new Error("configが設定されていません。");
    }
    this.remainingSec--;
    if (this.remainingSec <= 0) {
      clearInterval(this.timer!);
      // handle phase transition and play appropriate sound
      if (this.phase === "pomodoro") {
        // increment count for current task ID
        const editor = vscode.window.activeTextEditor;
        if (
          editor &&
          editor.document.languageId === "markdown" &&
          this.currentTask
        ) {
          this.incrementPomodoroCount(editor, this.currentTask);
        }
        this.completedPomodoros++;
        // decide next break length and play transition sound
        if (this.completedPomodoros % 4 === 0) {
          this.phase = "longBreak";
          this.remainingSec = this.config.longBreakMinutes * 60;
        } else {
          this.phase = "shortBreak";
          this.remainingSec = this.config.shortBreakMinutes * 60;
          this.soundPlayer?.play(this.config.soundPomodoroToShort);
        }
      } else if (this.phase === "shortBreak") {
        // short break finished, back to pomodoro
        this.phase = "pomodoro";
        this.remainingSec = this.config.pomodoroMinutes * 60;
        this.soundPlayer?.play(this.config.soundShortToPomodoro);
      } else if (this.phase === "longBreak") {
        // long break finished, back to pomodoro
        this.phase = "pomodoro";
        this.remainingSec = this.config.pomodoroMinutes * 60;
        this.soundPlayer?.play(this.config.soundLongToPomodoro);
      }
      this.updateStatus();
      this.timer = setInterval(() => this.tick(), 1000);
    } else {
      this.updateStatus();
    }
  }

  public updateStatus() {
    this.tomatoUI.UpdateStatus(this.phase, this.remainingSec, this.currentTask);
  }

  public getCurrentTask(): Task | undefined {
    return this.currentTask;
  }
}
