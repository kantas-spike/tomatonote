import * as fs from "fs";
import { useFixtures } from "../helpers/fixture-helper";
import { DailyStats } from "../../daily-stats";
import * as assert from "assert";
import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { Uri } from "vscode";
import { createTask } from "../helpers/task-helper";

describe("DailyStats", () => {
  let paths!: string[];
  let cleanup!: () => Promise<void>;

  beforeEach(async () => {
    const ctx = await useFixtures(["daily-stats/daily-empty.json"]);
    paths = ctx.fixturePaths;
    cleanup = ctx.cleanup;
  });
  after(async () => {
    await cleanup();
  });

  it("increments and persists counts", async () => {
    const stats = new DailyStats();
    // Override internal path for isolation
    const testFile = paths[0];
    (stats as any).filePath = testFile;

    const taskA = createTask({
      uri: Uri.parse("/tmp/1.md"),
      id: "taskA",
    });
    const taskB = createTask({
      uri: Uri.parse("/tmp/2.md"),
      id: "taskB",
    });
    const taskC = createTask({
      uri: Uri.parse("/tmp/2.md"),
      id: "taskC",
    });

    await stats.increment(taskA);
    await stats.increment(taskA);
    await stats.increment(taskB);
    await stats.increment(taskC);
    await stats.increment(taskC);
    const data = JSON.parse(await fs.promises.readFile(testFile, "utf-8"));
    assert.deepStrictEqual(data, {
      "file:///tmp/1.md": { taskA: 2 },
      "file:///tmp/2.md": { taskB: 1, taskC: 2 },
    });
  });
});
