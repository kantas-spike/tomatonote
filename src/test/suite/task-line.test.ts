import * as assert from "assert";

import { describe, it } from "mocha";
import {
  isTaskLine,
  getCheckboxValue,
  checked,
  getTaskId,
  getTaskName,
  createTaskId,
} from "../../task-line";

describe("Task Line Utilities", () => {
  it("detects task lines", () => {
    assert.ok(isTaskLine("- [ ] Do something"));
    assert.ok(isTaskLine("   - [x] Done"));
    assert.strictEqual(isTaskLine("Just a line"), false);
  });

  it("parses checkbox values", () => {
    assert.strictEqual(getCheckboxValue("- [ ] open"), " ");
    assert.strictEqual(getCheckboxValue("- [x] closed"), "x");
    assert.strictEqual(getCheckboxValue("- [X] Upper"), "X");
  });

  it("checks completed status", () => {
    assert.strictEqual(checked("- [ ] task"), false);
    assert.strictEqual(checked("- [x] task"), true);
    assert.strictEqual(checked("- [X] task"), true);
  });

  it("extracts task id and name", () => {
    const line = "- [ ] Write docs <!-- id: abc123 -->";
    assert.strictEqual(getTaskId(line), "abc123");
    assert.strictEqual(getTaskName(line), "Write"); // first word after checkbox
  });

  it("creates task ids", () => {
    const id = createTaskId();
    assert.ok(typeof id === "string" && id.length > 0);
  });
});

