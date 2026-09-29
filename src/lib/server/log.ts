import "server-only";

/**
 * Structured one-line logs. Never pass prompts, AI output, emails, notes or
 * other learner text in `data` — ids, codes and durations only.
 */

type Data = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, data: Data = {}) {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, data?: Data) => write("info", event, data),
  warn: (event: string, data?: Data) => write("warn", event, data),
  error: (event: string, error: unknown, data?: Data) =>
    write("error", event, {
      ...data,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    }),
};
