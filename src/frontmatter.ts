import * as vscode from "vscode";
import YAML from "yaml";
const TOML = require("smol-toml");

const FM_YAML_SEPARATOR = "---";
const FM_TOML_SEPARATOR = "+++";

export function isMarkdown(doc: vscode.TextDocument): boolean {
  return doc.languageId === "markdown";
}

// Helper: ensure the active document is a markdown file with front‑matter
export function hasFrontMatter(doc: vscode.TextDocument): boolean {
  if (!isMarkdown(doc)) {
    return false;
  }
  const text = doc.getText();
  return (
    /^---\s*[\s\S]*?\s*---/m.test(text) ||
    /^\+\+\+\s*[\s\S]*?\s*\+\+\+/m.test(text)
  );
}

function getFrontmatterRange(editor: vscode.TextEditor) {
  if (!editor) {
    vscode.window.showWarningMessage("テキストエディタを取得できません。");
    return null;
  }
  let separator = null;
  if (editor.document.lineAt(0).text === FM_YAML_SEPARATOR) {
    separator = FM_YAML_SEPARATOR;
  } else if (editor.document.lineAt(0).text === FM_TOML_SEPARATOR) {
    separator = FM_TOML_SEPARATOR;
  } else {
    vscode.window.showWarningMessage("ファイルにFrontMatterがありません。");
    return null;
  }
  const fmStart = editor.document.lineAt(0).range.end;

  let fmEnd = null;
  for (let i = 1; i < editor.document.lineCount; i++) {
    if (editor.document.lineAt(i).text === separator) {
      fmEnd = editor.document.lineAt(i).range.start;
      break;
    }
  }
  if (!fmEnd) {
    vscode.window.showWarningMessage(
      "ファイルにFrontMatterの終了行がありません。",
    );
    return null;
  }

  const range = new vscode.Range(fmStart, fmEnd);
  return { separator, range };
}

function fmToObject(
  editor: vscode.TextEditor,
  range: vscode.Range,
  separator: string,
) {
  const fmStr = editor.document.getText(range);
  let obj = null;
  if (separator === FM_YAML_SEPARATOR) {
    obj = YAML.parse(fmStr) ?? {};
  } else {
    obj = TOML.parse(fmStr);
  }
  /* vscode.window.showWarningMessage(
    `DEBUG: sep: ${separator}, str: ${fmStr}, obj: ${obj}`,
  ); */
  return obj;
}

function objToFmStr(obj: object, separator: string = FM_TOML_SEPARATOR) {
  if (separator === FM_YAML_SEPARATOR) {
    return YAML.stringify(obj);
  } else {
    return TOML.stringify(obj);
  }
}

export function getFrontMatter(editor: vscode.TextEditor) {
  const result = getFrontmatterRange(editor);
  if (result) {
    return fmToObject(editor, result.range, result.separator);
  } else {
    return null;
  }
}

export async function updateFrontMatter(
  editor: vscode.TextEditor,
  data: any,
  forceSave = false,
) {
  const result = getFrontmatterRange(editor);
  if (result) {
    const { separator, range } = result;
    const obj = fmToObject(editor, range, separator);
    for (let k in data) {
      obj[k] = data[k];
    }
    await editor.edit((builder) => {
      builder.replace(range, `\n${objToFmStr(obj)}\n`);
    });
    if (forceSave) {
      await editor.document.save();
    }
  }
}
