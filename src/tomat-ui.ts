import * as vscode from "vscode";
import { Task } from "./task";
import { Phase } from "./types";

export class TomatoUI {
  private timerButton: vscode.StatusBarItem;
  private taskNameButton: vscode.StatusBarItem;

  constructor() {
    this.timerButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
    );
    this.timerButton.text = "⏰ idle";
    this.timerButton.show();
    this.timerButton.command = "tomatonote.startTimer";
    this.timerButton.tooltip = "タイマーを開始します。";

    this.taskNameButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
    );
    this.taskNameButton.text = "-";
    this.taskNameButton.show();
    this.taskNameButton.command = "tomatonote.openMarkdownFileAtTask";
    this.taskNameButton.tooltip = "タスクの場所にジャンプします。";
  }

  public Stop(task: Task | undefined) {
    this.timerButton.text = `⏰ stopped`;
    this.timerButton.command = "tomatonote.startTimer";
    this.timerButton.tooltip = "タイマーを開始します。";
    this.taskNameButton.text = `${task ? task.getTaskName() : "-"}`;
  }

  public UpdateStatus(
    phase: Phase,
    remainingSec: number,
    task: Task | undefined,
  ) {
    const mins = Math.floor(remainingSec / 60);
    const secs = ("0" + (remainingSec % 60)).slice(-2);
    let icon = "🍅";
    if (phase === "shortBreak") {
      icon = "☕";
    } else if (phase === "longBreak") {
      icon = "🛌";
    }
    this.timerButton.text = `${icon} ${mins}:${secs}`;
    this.timerButton.command = "tomatonote.stopTimer";
    this.timerButton.tooltip = "タイマーを停止します。";
    this.taskNameButton.text = `${task ? task.getTaskName() : "-"}`;
  }
}
