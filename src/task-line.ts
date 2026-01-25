// Helper to determine if a line is a Markdown TODO task (e.g. "- [ ] Task" or "- [x] Task")
export function isTaskLine(line: string): boolean {
  return /^\s*-\s\[[ xX]\]\s/.test(line);
}

export function getCheckboxValue(line: string): string | undefined {
  const checkValue = line.match(/^\s*-\s\[([ xX])\]\s/);
  return checkValue ? checkValue[1] : undefined;
}

export function checked(line: string): boolean {
  const val = getCheckboxValue(line);
  if (val === "x" || val === "X") {
    return true;
  } else {
    return false;
  }
}

export function getTaskId(line: string): string | undefined {
  const idMatch = line.match(/<!--\s*id:\s*([a-zA-Z0-9]+)\s*-->/);
  return idMatch ? idMatch[1] : undefined;
}

export function getTaskName(line: string): string | undefined {
  const idMatch = line.match(
    /^\s*-\s\[[ xX]\]\s*(\S+)(<!--\s*id:\s*([a-zA-Z0-9]+)\s*-->)?/,
  );
  return idMatch ? idMatch[1] : undefined;
}

export function createTaskId() {
  return Math.random().toString(36).substr(2, 8);
}
