// test/helpers/fixtureHelper.ts
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { randomBytes } from "node:crypto";

/**
 * テスト用 fixture が格納されているディレクトリへの絶対パス。
 *
 * プロジェクト構成が
 *
 * と決まっていれば `__dirname` から相対で取得できるので、環境依存が少なくなります。
 */
export const FIXTURE_ROOT = path.resolve(__dirname, "../../..", "fixtures");

/**
 * ランダムかつ一意になるサブディレクトリ名を生成します。
 *
 * `os.tmpdir()` の下に作成するので OS が管理してくれる安全な領域です。
 */
function makeRandomTmpDirName(): string {
  // 16 バイト (32 文字の hex) で衝突確率は実質ゼロ
  return `fixture-${randomBytes(16).toString("hex")}`;
}

/**
 * 一時ディレクトリを作成し、そのパスを返します。
 *
 * 呼び出し側は **必ず** `removeTempDir` を呼んでクリーンアップしてください。
 */
export async function createTempDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), makeRandomTmpDirName());
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * 与えられた一時ディレクトリを再帰的に削除します。
 *
 * `fs.rm` は Node.js v14.14+ で利用可能です。古いバージョンの場合は
 * `fs.rmdir(..., { recursive: true })` に置き換えてください。
 */
export async function removeTempDir(tmpDir: string): Promise<void> {
  // `force:true` でディレクトリが既に無くても例外を出さないようにする
  await fs.rm(tmpDir, { recursive: true, force: true });
}

/**
 * Node 標準の cp (>= v16.7) をラップ。古い環境の場合は ncp / cpy 等に差し替えてください。
 */
async function copyRecursive(src: string, dest: string): Promise<void> {
  await fs.cp(src, dest, { recursive: true });
}

/* -------------------------------------------------
   2️⃣ 単体用ヘルパー（従来の API）
------------------------------------------------- */
export async function useFixture(
  fixtureName: string,
): Promise<{ fixturePath: string; cleanup: () => Promise<void> }> {
  const tmpDir = await createTempDir();

  const srcPath = path.resolve(FIXTURE_ROOT, fixtureName);
  await fs.access(srcPath).catch(() => {
    throw new Error(`Fixture not found: ${srcPath}`);
  });

  const destPath = path.join(tmpDir, path.basename(fixtureName));
  await copyRecursive(srcPath, destPath);

  return {
    fixturePath: destPath,
    cleanup: async () => {
      await removeTempDir(tmpDir);
    },
  };
}

/**
 * 複数の fixture を一時領域へコピーし、クリーンアップ関数を返す。
 *
 * @param fixtures 配列で渡す。相対パスは `fixtures/` ディレクトリ以下を指す
 *
 * @returns {
 *   fixturePaths: string[];   // コピー先の絶対パス配列
 *   cleanup: () => Promise<void>  // テスト終了時に呼び出すだけで一時領域が丸ごと削除される
 * }
 */
export async function useFixtures(
  fixtures: readonly string[],
): Promise<{ fixturePaths: string[]; cleanup: () => Promise<void> }> {
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error(
      "useFixtures() requires a non‑empty array of fixture names.",
    );
  }

  // -------------------------------------------------
  // 1️⃣ 一時ディレクトリ作成（全てのコピー先は同じ場所に入れる）
  // -------------------------------------------------
  const tmpDir = await createTempDir();

  // -------------------------------------------------
  // 2️⃣ 各 fixture を順番にコピー
  // -------------------------------------------------
  const fixturePaths: string[] = [];

  for (const name of fixtures) {
    const srcPath = path.resolve(FIXTURE_ROOT, name);
    await fs.access(srcPath).catch(() => {
      throw new Error(`Fixture not found: ${srcPath}`);
    });

    // コピー先は <tmp>/<basename> にする（同名が衝突しないことを前提）
    const destPath = path.join(tmpDir, path.basename(name));
    await copyRecursive(srcPath, destPath);
    fixturePaths.push(destPath);
  }

  // -------------------------------------------------
  // 3️⃣ クリーンアップ関数を作って返す
  // -------------------------------------------------
  return {
    fixturePaths,
    cleanup: async () => {
      await removeTempDir(tmpDir);
    },
  };
}
