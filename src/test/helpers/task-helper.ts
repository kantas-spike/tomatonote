import { RecursivePartial } from "../recursive-partial";
import { Task } from "../../task";

export function createTask(options: any) {
  const taskMock: RecursivePartial<Task> = options;
  return taskMock as Task;
}
