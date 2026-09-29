import { Pool } from "pg";

/*
 * One pool per server process. Dev-mode hot reload re-evaluates modules, so
 * the pool lives on globalThis instead of a module variable.
 */
const globalForDb = globalThis as unknown as { mentormatchPool?: Pool };

/** Returns null when DATABASE_URL isn't configured — callers must report that, not pretend to save. */
export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  globalForDb.mentormatchPool ??= new Pool({ connectionString: url, max: 5 });
  return globalForDb.mentormatchPool;
}
