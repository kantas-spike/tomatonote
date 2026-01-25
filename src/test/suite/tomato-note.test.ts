import * as assert from "assert";

import * as vscode from "vscode";
import { describe, it, before, after, afterEach } from "mocha";
import { TomatoNote } from "../../tomato-note";
import { ScenarioBuilder } from "../scenarios/scenario.builder";

describe("TomatoNote Test Suite", () => {
  let scenario: ScenarioBuilder;

  before(() => {
    scenario = new ScenarioBuilder();
  });
  after(() => {
    scenario.restore();
  });
  afterEach(() => {
    scenario.reset();
  });

  it("constructor", async () => {
    const extension = vscode.extensions.getExtension("kantas-spike.tomatonote");
    if (extension) {
      // Arrange
      let calls = scenario["commandsStub"].getCalls();
      assert.strictEqual(0, calls.length);

      // Act
      const tomatoNote = new TomatoNote(extension.extensionPath);

      // Assert
      assert.notStrictEqual(undefined, tomatoNote["timer"]["config"]);
      assert.notStrictEqual(undefined, tomatoNote["timer"]["soundPlayer"]);
      calls = scenario["commandsStub"].getCalls();
      assert.strictEqual("tomatonote.startTimer", calls[0].args[0]);
      assert.strictEqual("tomatonote.stopTimer", calls[1].args[0]);
      assert.strictEqual("tomatonote.openMarkdownFileAtTask", calls[2].args[0]);
    }
  });
});
