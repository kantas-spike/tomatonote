import * as assert from "assert";
import { map } from "ramda";
import * as sinon from "sinon";
import {
  commands,
  DecorationOptions,
  Position,
  Range,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceConfiguration,
} from "vscode";
import { RecursivePartial } from "../recursive-partial";

export class ScenarioBuilder {
  private sandbox: sinon.SinonSandbox;
  private commandsStub: sinon.SinonStub;
  private editorStub: sinon.SinonStub;
  private statusSpy: sinon.SinonSpy;
  private warningMessageSpy: sinon.SinonSpy;
  private realEditor: TextEditor | undefined;
  private getConfigurationStub: sinon.SinonStub;
  public fakeTimer: sinon.SinonFakeTimers;
  private spawnStub: sinon.SinonStub | undefined;

  constructor() {
    this.sandbox = sinon.createSandbox();
    this.commandsStub = this.sandbox.stub(commands, "registerCommand");
    this.editorStub = this.sandbox
      .stub(window, "activeTextEditor")
      .get(() => this.realEditor);

    this.statusSpy = this.sandbox.spy(window, "setStatusBarMessage");
    this.warningMessageSpy = this.sandbox.spy(window, "showWarningMessage");
    this.getConfigurationStub = this.sandbox.stub();
    this.fakeTimer = this.sandbox.useFakeTimers({
      shouldClearNativeTimers: true,
    });
  }

  public restore() {
    this.fakeTimer.restore();
    this.sandbox.restore();
  }

  public reset() {
    this.editorStub.reset();
    this.commandsStub.reset();
    this.statusSpy.resetHistory();
    this.warningMessageSpy.resetHistory();
    this.getConfigurationStub.reset();
    this.fakeTimer.restore();
    this.spawnStub?.reset();
  }

  public setupCofiguration(config: any) {
    this.getConfigurationStub = this.sandbox
      .stub(workspace, "getConfiguration")
      .returns({
        get: this.sandbox.stub().callsFake((key: string) => {
          // key が存在しなければ undefined をそのまま返す
          return (config as any)[key];
        }),
      } as unknown as WorkspaceConfiguration);
  }

  public getCp() {
    const cp = require("child_process");
    if (this.spawnStub) {
      this.spawnStub.restore();
    }
    this.spawnStub = this.sandbox.stub(cp, "spawn");
    return cp;
  }

  public async getEditor(
    filePath: string,
    selected: Range | undefined = undefined,
  ) {
    const fileUri = Uri.file(filePath);
    const doc = await workspace.openTextDocument(fileUri);
    const editor = await window.showTextDocument(doc, {
      selection: selected,
    });
    return editor;
  }

  public withRealEditor(editor: TextEditor | undefined) {
    this.realEditor = editor;
  }

  public withCommands(...texts: string[]) {
    let i = 0;
    this.commandsStub.callsFake((_, callback) => {
      if (texts.length - 1 < i) {
        throw new Error("called more commands than expected");
      }
      callback({ text: texts[i++] });
    });

    return this;
  }

  public hasStatusBarMessages(...statuses: string[]) {
    const allArgs = map((call) => call.args[0], this.statusSpy.getCalls());

    assert.deepEqual(statuses, allArgs, `${statuses} did not match ${allArgs}`);
  }

  public hasWarningMessages(...msgs: string[]) {
    const allArgs = map(
      (call) => call.args[0],
      this.warningMessageSpy.getCalls(),
    );
    assert.deepEqual(msgs, allArgs, `${msgs} did not match ${allArgs}`);
  }

  public hasCommandLines(...cmds: string[]) {
    const allArgs = map(
      (call) => `${call.args[0]} ${call.args[1]}`,
      this.spawnStub!.getCalls(),
    );
    assert.deepEqual(cmds, allArgs, `${cmds} did not match ${allArgs}`);
  }
}

interface SinonCall {
  args: Array<Range[] | DecorationOptions[]>;
}
