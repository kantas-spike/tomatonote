import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Task } from "./task";

export class DailyStats {
  private filePath: string;

  /**
   * Convert a Date object to a YYYYMMDD string in the local timezone.
   */
  public static formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  constructor() {
    const home = process.env.HOME || os.homedir();
    // Generate YYYYMMDD in local timezone
    const today = DailyStats.formatLocalDate(new Date());
    this.filePath = path.join(home, ".tomatonote", `${today}.json`);
  }

  async load(): Promise<any> {
    try {
      const raw = await fs.promises.readFile(this.filePath, "utf-8");
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }

  async save(stats: Record<string, number>): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + ".tmp";
    await fs.promises.writeFile(tmp, JSON.stringify(stats, null, 2));
    await fs.promises.rename(tmp, this.filePath);
  }

  async increment(task: Task): Promise<void> {
    const taskId = task.id;
    const uri = task.uri.toString();

    if (taskId) {
      const stats = await this.load();
      stats[uri] = stats[uri] ?? {};
      stats[uri][taskId] = (stats[uri][taskId] ?? 0) + 1;
      await this.save(stats);
    }
  }
}
