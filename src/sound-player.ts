import { existsSync } from "fs";
import path from "path";
import { window } from "vscode";

export class SoundPlayer {
  private readonly baseDirectoryPath: string;
  private readonly cp: typeof import("child_process");
  constructor(
    private readonly basePath: string,
    cp: typeof import("child_process") = require("child_process"),
  ) {
    this.baseDirectoryPath = basePath;
    this.cp = cp;
  }

  public play(soundPath: string) {
    if (!path.isAbsolute(soundPath)) {
      soundPath = path.resolve(this.baseDirectoryPath, soundPath);
    }

    if (!existsSync(soundPath)) {
      window.showWarningMessage(`TomatoNote: ${soundPath} は存在しません。`);
    } else {
      const cmd = process.platform === "darwin" ? "afplay" : "aplay";
      try {
        this.cp.spawn(cmd, [soundPath]);
      } catch (e) {
        console.error("SoundPlayer: spawn failed", e);
      }
    }
  }
}
