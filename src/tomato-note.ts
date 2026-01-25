import { commands, ExtensionContext, workspace, window } from "vscode";
import { TomatoTimer } from "./tomato-timer";
import { buildConfig } from "./config/config";
import { SoundPlayer } from "./sound-player";

export class TomatoNote {
  private timer: TomatoTimer;

  constructor(extensionPath: string) {
    const soundPlayer = new SoundPlayer(extensionPath);
    this.timer = new TomatoTimer(soundPlayer);

    this.configure();
  }

  private configure() {
    commands.registerCommand("tomatonote.startTimer", async () => {
      this.timer.start();
    });

    commands.registerCommand("tomatonote.stopTimer", async () => {
      this.timer.stop();
    });

    commands.registerCommand("tomatonote.openMarkdownFileAtTask", async () => {
      const task = this.timer.getCurrentTask();
      if (task) {
        task.openMarkdownFileAtTask();
      } else {
        window.showInformationMessage(`⏰ タスクが選択されていません。`);
      }
    });

    workspace.onDidChangeConfiguration(this.loadConfig);
    this.loadConfig();
  }

  private loadConfig = () => {
    const config = workspace.getConfiguration("tomatonote");
    this.timer.refreshConfig(buildConfig(config));
  };
}
