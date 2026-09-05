const levels = ["debug", "info", "warn", "error"] as const;
type Level = (typeof levels)[number];

function ts(): string {
  return new Date().toISOString();
}

export const logger = {
  log(level: Level, message: string, meta?: unknown): void {
    const suffix = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
    void level;
    const line = `${ts()} [${level}] ${message}${suffix}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  },
  debug(message: string, meta?: unknown): void {
    this.log("debug", message, meta);
  },
  info(message: string, meta?: unknown): void {
    this.log("info", message, meta);
  },
  warn(message: string, meta?: unknown): void {
    this.log("warn", message, meta);
  },
  error(message: string, meta?: unknown): void {
    this.log("error", message, meta);
  },
};