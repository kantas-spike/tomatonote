import * as tl from "./task-line";
import * as vscode from "vscode";

export class Task {
  private _uri: vscode.Uri;
  private line: vscode.TextLine;
  private text: string;
  private name: string | undefined;
  private _id: string | undefined;
  private checked: boolean = false;

  constructor(uri: vscode.Uri, line: vscode.TextLine) {
    this._uri = uri;
    this.line = line;
    this.text = line.text;
    if (this.isTaskLine()) {
      this.name = tl.getTaskName(this.text);
      this.checked = tl.checked(this.text);
    }
  }

  public appendTaskId(editor: vscode.TextEditor, line: vscode.TextLine) {
    this._id = tl.getTaskId(this.text);
    if (!this._id) {
      this._id = Math.random().toString(36).substr(2);
    }
    this.updateTaskLine(editor, line);
  }

  public updateTaskLine(editor: vscode.TextEditor, line: vscode.TextLine) {
    const edit = new vscode.WorkspaceEdit();
    // Insert before line end, preserving a space before comment
    const pos = line.text.indexOf("-");
    if (pos < 0) {
      throw new Error(`'${line.text}'に'-'が含まれていません。`);
    }
    const startPos = new vscode.Position(line.lineNumber, pos);
    const targetRange = new vscode.Range(startPos, line.range.end);
    edit.replace(editor.document.uri, targetRange, this.taskLine());
    vscode.workspace.applyEdit(edit);
  }

  public isTaskLine() {
    return tl.isTaskLine(this.text);
  }

  get id(): string | undefined {
    return this._id;
  }

  set id(id: string | undefined) {
    this._id = id;
  }

  get uri(): vscode.Uri {
    return this._uri;
  }

  set uri(uri: vscode.Uri) {
    this._uri = uri;
  }

  public getTaskName() {
    return this.name;
  }

  public taskLine() {
    return `- [${this.checked ? "x" : " "}] ${this.name} <!-- id:${this._id} -->`;
  }

  public openMarkdownFileAtTask() {
    const pos = new vscode.Position(
      this.line.lineNumber,
      this.line.firstNonWhitespaceCharacterIndex,
    );
    vscode.window.showTextDocument(this._uri, {
      selection: new vscode.Range(pos, pos),
    });
  }
}
