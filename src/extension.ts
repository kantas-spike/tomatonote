import * as vscode from "vscode";
import { TomatoNote } from "./tomato-note";

// ------------------------------------------------------------
export function activate(context: vscode.ExtensionContext) {
  const tomatoNote = new TomatoNote(context.extensionPath);
}

export function deactivate() {}
