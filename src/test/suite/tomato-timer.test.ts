import * as assert from "assert";

import * as vscode from "vscode";
import { describe, it, before, after, beforeEach, afterEach } from "mocha";

import { ScenarioBuilder } from "../scenarios/scenario.builder";
import { TomatoTimer } from "../../tomato-timer";
import { buildConfig, Config } from "../../config/config";

import { useFixtures } from "../helpers/fixture-helper";

describe("TomatoTimer Test Suite", () => {
  let scenario: ScenarioBuilder;
  let config: Config;

  beforeEach(() => {
    scenario = new ScenarioBuilder();
    const testConfig = {
      pomodoroMinutes: 0.3,
      shortBreakMinutes: 0.1,
      longBreakMinutes: 0.2,
      soundLongToPomodoro: "sounds1.mp3",
      soundPomodoroToLong: "sounds2.mp3",
      soundPomodoroToShort: "sounds3.mp3",
      soundShortToPomodoro: "sounds4.mp3",
    };
    scenario.setupCofiguration(testConfig);
    config = buildConfig(vscode.workspace.getConfiguration("tomatonote"));
  });
  afterEach(() => {
    scenario.restore();
  });
  describe("start & stop", () => {
    let paths!: string[];
    let cleanup!: () => Promise<void>;
    beforeEach(async () => {
      const ctx = await useFixtures(["markdowns/with-frontmatter.md"]);
      paths = ctx.fixturePaths;
      cleanup = ctx.cleanup;
    });
    afterEach(async () => {
      await cleanup();
    });
    after(() => {
      scenario.reset();
    });
    it("selected task", async () => {
      // Arrange
      const editor = await scenario.getEditor(
        paths[0],
        new vscode.Range(11, 0, 11, 0),
      );
      scenario.withRealEditor(editor);
      const timer = new TomatoTimer();
      timer.refreshConfig(config);

      // Act
      assert.strictEqual(undefined, timer["timer"]);
      timer.start();

      // Assert
      assert.strictEqual("bbb", timer.getCurrentTask()?.getTaskName());
      assert.notStrictEqual(undefined, timer["timer"]);
    });

    it("pomodoro -> sb -> pomodoro -> sb -> pomodoro -> sb -> pomodoro -> lb", async () => {
      // Arrange
      const editor = await scenario.getEditor(
        paths[0],
        new vscode.Range(11, 0, 11, 0),
      );
      scenario.withRealEditor(editor);
      const timer = new TomatoTimer();
      timer.refreshConfig(config);

      const pomo_sec = config.pomodoroMinutes * 60 * 1000;
      const sb_sec = config.shortBreakMinutes * 60 * 1000;
      const lb_sec = config.longBreakMinutes * 60 * 1000;

      // Act
      assert.strictEqual(undefined, timer["timer"]);
      assert.strictEqual(timer["completedPomodoros"], 0);
      timer.start();
      assert.strictEqual(timer["phase"], "pomodoro");

      scenario.fakeTimer.tick(pomo_sec);
      assert.strictEqual(timer["phase"], "shortBreak");
      assert.strictEqual(timer["completedPomodoros"], 1);

      scenario.fakeTimer.tick(sb_sec);
      assert.strictEqual(timer["phase"], "pomodoro");
      assert.strictEqual(timer["completedPomodoros"], 1);

      scenario.fakeTimer.tick(pomo_sec);
      assert.strictEqual(timer["phase"], "shortBreak");
      assert.strictEqual(timer["completedPomodoros"], 2);

      scenario.fakeTimer.tick(sb_sec);
      assert.strictEqual(timer["phase"], "pomodoro");
      assert.strictEqual(timer["completedPomodoros"], 2);

      scenario.fakeTimer.tick(pomo_sec);
      assert.strictEqual(timer["phase"], "shortBreak");
      assert.strictEqual(timer["completedPomodoros"], 3);

      scenario.fakeTimer.tick(sb_sec);
      assert.strictEqual(timer["phase"], "pomodoro");
      assert.strictEqual(timer["completedPomodoros"], 3);

      scenario.fakeTimer.tick(pomo_sec);
      assert.strictEqual(timer["phase"], "longBreak");
      assert.strictEqual(timer["completedPomodoros"], 4);
      scenario.fakeTimer.tick(lb_sec);

      // Assert
      assert.strictEqual(timer["phase"], "pomodoro");
      assert.strictEqual(timer["completedPomodoros"], 4);
    });

    it("stop", async () => {
      // Arrange
      const editor = await scenario.getEditor(
        paths[0],
        new vscode.Range(11, 0, 11, 0),
      );
      scenario.withRealEditor(editor);
      const timer = new TomatoTimer();
      timer.refreshConfig(config);

      // Act
      assert.strictEqual(undefined, timer["timer"]);
      timer.start();
      assert.notStrictEqual(undefined, timer["timer"]);
      timer.stop();

      // Assert
      assert.strictEqual("bbb", timer.getCurrentTask()?.getTaskName());
      assert.strictEqual(undefined, timer["timer"]);
    });
  });

  describe("warning", () => {
    let paths!: string[];
    let cleanup!: () => Promise<void>;
    after(() => {
      scenario.reset();
    });
    beforeEach(async () => {
      const ctx = await useFixtures([
        "markdowns/not-markdown.txt",
        "markdowns/without-frontmatter.md",
        "markdowns/with-frontmatter.md",
      ]);
      paths = ctx.fixturePaths;
      cleanup = ctx.cleanup;
    });
    afterEach(async () => {
      await cleanup();
    });
    it("no editor", () => {
      // Arrange
      scenario.withRealEditor(undefined);
      const timer = new TomatoTimer();
      timer.refreshConfig(config);

      // Act
      assert.strictEqual(undefined, timer["timer"]);
      timer.start();

      // Assert
      scenario.hasWarningMessages("TomatoNote: ファイルを開いてください。");
      assert.strictEqual(undefined, timer["timer"]);
    });
    it("no markdown file", async () => {
      // Arrange
      const editor = await scenario.getEditor(
        paths[0],
        new vscode.Range(8, 0, 8, 0),
      );
      scenario.withRealEditor(editor);
      const timer = new TomatoTimer();
      timer.refreshConfig(config);

      // Act
      assert.strictEqual(undefined, timer["timer"]);
      timer.start();

      // Assert
      scenario.hasWarningMessages(
        "TomatoNote: Markdownファイルを開いてください。",
      );
      assert.strictEqual(undefined, timer["timer"]);
    });
    it("no frontmatter in .md", async () => {
      // Arrange
      const editor = await scenario.getEditor(
        paths[1],
        new vscode.Range(8, 0, 8, 0),
      );
      scenario.withRealEditor(editor);
      const timer = new TomatoTimer();
      timer.refreshConfig(config);

      // Act
      assert.strictEqual(undefined, timer["timer"]);
      timer.start();

      // Assert
      scenario.hasWarningMessages(
        "TomatoNote: FrontMatterが記載されたMarkdownファイルを開いてください。",
      );
      assert.strictEqual(undefined, timer["timer"]);
    });
    it("not task line", async () => {
      // Arrange
      const editor = await scenario.getEditor(
        paths[2],
        new vscode.Range(2, 0, 2, 0),
      );
      scenario.withRealEditor(editor);
      const timer = new TomatoTimer();
      timer.refreshConfig(config);

      // Act
      assert.strictEqual(undefined, timer["timer"]);
      timer.start();

      // Assert
      scenario.hasWarningMessages(
        "TomatoNote: タスク行にカーソルを置いてください。(e.g. `- [ ] task1`)",
      );
      assert.strictEqual(undefined, timer["timer"]);
    });
  });
});
