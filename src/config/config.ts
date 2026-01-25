import { ExtensionContext, WorkspaceConfiguration } from "vscode";

const DEFAULT_POMODORO_MINUTES = 25;
const DEFAULT_SHORT_BREAK_MINUTES = 5;
const DEFAULT_LONG_BREAK_MINUTES = 15;
const DEFAULT_SOUND_POMODORO_TO_LONG = "sounds/soundPomodoroToLong.mp3";
const DEFAULT_SOUND_POMODORO_TO_SHORT = "sounds/soundPomodoroToShort.mp3";
const DEFAULT_SOUND_SHORT_TO_POMODORO = "sounds/soundShortToPomodoro.mp3";
const DEFAULT_SOUND_LONG_TO_POMODORO = "sounds/soundLongToPomodoro.mp3";

export class Config {
  public pomodoroMinutes: number = DEFAULT_POMODORO_MINUTES;
  public shortBreakMinutes: number = DEFAULT_SHORT_BREAK_MINUTES;
  public longBreakMinutes: number = DEFAULT_LONG_BREAK_MINUTES;
  public soundPomodoroToLong: string = DEFAULT_SOUND_POMODORO_TO_LONG;
  public soundPomodoroToShort: string = DEFAULT_SOUND_POMODORO_TO_SHORT;

  public soundShortToPomodoro: string = DEFAULT_SOUND_SHORT_TO_POMODORO;
  public soundLongToPomodoro: string = DEFAULT_SOUND_LONG_TO_POMODORO;
}

export function buildConfig(cfg: WorkspaceConfiguration) {
  const config = new Config();

  config.pomodoroMinutes = cfg.get("pomodoroMinutes", DEFAULT_POMODORO_MINUTES);
  config.shortBreakMinutes = cfg.get(
    "shortBreakMinutes",
    DEFAULT_SHORT_BREAK_MINUTES,
  );
  config.longBreakMinutes = cfg.get(
    "longBreakMinutes",
    DEFAULT_LONG_BREAK_MINUTES,
  );
  config.soundPomodoroToLong = cfg.get(
    "soundPomodoroToLong",
    DEFAULT_SOUND_POMODORO_TO_LONG,
  );
  config.soundPomodoroToShort = cfg.get(
    "soundPomodoroToShort",
    DEFAULT_SOUND_POMODORO_TO_SHORT,
  );
  config.soundShortToPomodoro = cfg.get(
    "soundShortToPomodoro",
    DEFAULT_SOUND_SHORT_TO_POMODORO,
  );
  config.soundLongToPomodoro = cfg.get(
    "soundLongToPomodoro",
    DEFAULT_SOUND_LONG_TO_POMODORO,
  );

  return config;
}
