import * as assert from "assert";
import * as vscode from "vscode";
import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { ScenarioBuilder } from "../scenarios/scenario.builder";
import { SoundPlayer } from "../../sound-player";
import path from "path";

describe("TomatoTimer Test Suite", () => {
  let scenario: ScenarioBuilder;
  let tempDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(() => {
    scenario = new ScenarioBuilder();
  });
  afterEach(() => {
    scenario.restore();
  });

  describe("SoundPlayer", () => {
    const extension = vscode.extensions.getExtension("kantas-spike.tomatonote");
    after(() => {
      scenario.reset();
    });
    it("play non-existent file", () => {
      const basePath = extension!.extensionPath;
      const player = new SoundPlayer(basePath);
      const soundFile = "not_exists_file.mp3";
      player.play(soundFile);
      scenario.hasWarningMessages(
        `TomatoNote: ${path.resolve(basePath, soundFile)} は存在しません。`,
      );
    });
    it("play existent file", () => {
      const basePath = extension!.extensionPath;
      const cp = scenario.getCp();
      const player = new SoundPlayer(basePath, cp);
      const soundFile = "sounds/soundLongToPomodoro.mp3";
      player.play(soundFile);
      scenario.hasCommandLines(`afplay ${path.join(basePath, soundFile)}`);
    });
  });
});
