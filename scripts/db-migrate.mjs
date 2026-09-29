// Applies db/schema.sql to DATABASE_URL. Safe to re-run.
import { readFile } from "node:fs/promises";
import pg from "pg";

// Same file Next reads in development; an exported DATABASE_URL still wins.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(new URL("../.env.local", import.meta.url));
  } catch {
    // No .env.local — fall through to the error below.
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see README → Environment).");
  process.exit(1);
}

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
