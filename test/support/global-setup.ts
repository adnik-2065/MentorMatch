import { execSync } from "node:child_process";

/** Brings the test database up to the current migrations before any file runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn("\nTEST_DATABASE_URL is not set — integration tests will be skipped.\n");
    return;
  }
  // Global setup runs before test.env is applied, so DATABASE_URL here is still the dev one.
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL points at the development database. Use a separate one — tests wipe it.");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });
}
