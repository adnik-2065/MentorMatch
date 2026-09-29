import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js reads .env.local on its own; the Prisma CLI needs to be told.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: env("DATABASE_URL"),
    // Optional — only needed where Postgres can't create the shadow database itself.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
