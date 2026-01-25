import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { buildConfig } from "../../config/config";
import { describe, it, before, after } from "mocha";
import { ScenarioBuilder } from "../scenarios/scenario.builder";
// import * as myExtension from '../../extension';

describe("Config Test Suite", () => {
  let scenario: ScenarioBuilder;

  before(() => {
    scenario = new ScenarioBuilder();
  });
  after(() => {
    scenario.restore();
  });

  it("buildConfig", () => {
    // Arrange
    const testConfig = {
      pomodoroMinutes: 26,
      shortBreakMinutes: 6,
      longBreakMinutes: 16,
      soundLongToPomodoro: "sounds1.mp3",
      soundPomodoroToLong: "sounds2.mp3",
      soundPomodoroToShort: "sounds3.mp3",
      soundShortToPomodoro: "sounds4.mp3",
    };
    scenario.setupCofiguration(testConfig);
    const cfg = vscode.workspace.getConfiguration("tomatonote");

    // Act
    const config = buildConfig(cfg);

    // Assert
    assert.strictEqual(26, config.pomodoroMinutes);
    assert.strictEqual(6, config.shortBreakMinutes);
    assert.strictEqual(16, config.longBreakMinutes);
    assert.strictEqual("sounds1.mp3", config.soundLongToPomodoro);
    assert.strictEqual("sounds2.mp3", config.soundPomodoroToLong);
    assert.strictEqual("sounds3.mp3", config.soundPomodoroToShort);
    assert.strictEqual("sounds4.mp3", config.soundShortToPomodoro);
  });
});
