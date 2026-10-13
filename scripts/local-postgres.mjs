/** Run an isolated PostgreSQL 16 instance for local development on Ubuntu 24.04. */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = fileURLToPath(new URL("../", import.meta.url));
const local = join(root, ".local-postgres");
const packages = join(local, "packages");
const runtime = join(local, "runtime");
const bin = join(runtime, "usr/lib/postgresql/16/bin");
const data = join(local, "data");
const socket = join(local, "socket");
const envFile = join(root, ".env.local");
const port = 5432;
const pgEnv = {
  ...process.env,
  LD_LIBRARY_PATH: [join(runtime, "usr/lib/x86_64-linux-gnu"), process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
};

function run(command, args, cwd = root, env = pgEnv) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function isRunning() {
  return spawnSync(join(bin, "pg_ctl"), ["-D", data, "status"], { env: pgEnv, stdio: "ignore" }).status === 0;
}

function installBinaries() {
  if (["postgres", "initdb", "pg_ctl"].every((name) => existsSync(join(bin, name))) &&
      existsSync(join(runtime, "usr/lib/x86_64-linux-gnu/libpq.so.5"))) return;
  mkdirSync(packages, { recursive: true });
  mkdirSync(runtime, { recursive: true });
  const names = ["postgresql-16", "libpq5", "libllvm17t64"];
  for (const name of names) {
    if (!readdirSync(packages).some((file) => file.startsWith(`${name}_`) && file.endsWith(".deb"))) {
      run("apt-get", ["download", name], packages);
    }
  }
  for (const name of names) {
    const archive = readdirSync(packages).find((file) => file.startsWith(`${name}_`) && file.endsWith(".deb"));
    run("dpkg-deb", ["-x", join(packages, archive), runtime]);
  }
}

function start() {
  if (!existsSync(join(data, "PG_VERSION"))) {
    throw new Error("Database is not initialized. Run npm run db:local:setup first.");
  }
  if (isRunning()) {
    console.log("Local PostgreSQL is already running.");
    return;
  }
  mkdirSync(socket, { recursive: true });
  run(join(bin, "pg_ctl"), [
    "-D", data, "-l", join(local, "server.log"),
    "-o", `-h 127.0.0.1 -p ${port} -k ${socket}`, "-w", "start",
  ]);
}

async function createDatabase(url, name) {
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const found = await client.query("select 1 from pg_database where datname = $1", [name]);
    if (found.rowCount === 0) await client.query(`create database ${name}`);
  } finally {
    await client.end();
  }
}

async function setup() {
  installBinaries();
  if (!existsSync(join(data, "PG_VERSION"))) {
    if (existsSync(envFile)) {
      throw new Error(".env.local already exists. Move its settings aside before initializing this local database.");
    }
    mkdirSync(local, { recursive: true });
    const password = randomBytes(24).toString("hex");
    const passwordFile = join(local, "init-password");
    writeFileSync(passwordFile, `${password}\n`, { mode: 0o600 });
    try {
      run(join(bin, "initdb"), [
        "-D", data, "-U", "mentormatch", "--encoding=UTF8",
        "--auth-local=scram-sha-256", "--auth-host=scram-sha-256",
        "--pwfile", passwordFile, "--no-instructions",
      ]);
      const base = `postgresql://mentormatch:${password}@127.0.0.1:${port}`;
      writeFileSync(envFile,
        `DATABASE_URL="${base}/mentormatch"\nTEST_DATABASE_URL="${base}/mentormatch_test"\n`,
        { mode: 0o600 });
      chmodSync(envFile, 0o600);
    } finally {
      unlinkSync(passwordFile);
    }
  }
  if (!existsSync(envFile)) throw new Error(".env.local is missing; cannot connect to the initialized database.");
  const content = readFileSync(envFile, "utf8");
  const url = content.match(/^DATABASE_URL="([^"]+)"/m)?.[1];
  if (!url) throw new Error(".env.local must contain a quoted DATABASE_URL.");
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" || parsed.port !== String(port) ||
      parsed.pathname !== "/mentormatch" || parsed.username !== "mentormatch") {
    throw new Error(".env.local must point to this project's local PostgreSQL database.");
  }
  start();
  await createDatabase(url, "mentormatch");
  await createDatabase(url, "mentormatch_test");
  run("npm", ["run", "db:migrate"], root, { ...pgEnv, DATABASE_URL: url });
  console.log("Local PostgreSQL is ready at 127.0.0.1:5432. The app and test database URLs are in .env.local.");
}

try {
  const action = process.argv[2];
  if (action === "setup") await setup();
  else if (action === "start") start();
  else if (action === "stop") {
    if (isRunning()) run(join(bin, "pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"]);
    else console.log("Local PostgreSQL is already stopped.");
  } else {
    console.error("Usage: node scripts/local-postgres.mjs <setup|start|stop>");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
