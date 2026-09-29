import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // The real package throws outside a React Server environment.
      "server-only": path.resolve(import.meta.dirname, "test/support/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/support/global-setup.ts"],
    // Integration files share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      // Point the app at the test database — never the dev one.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      AUTH_SECRET: "test-secret-that-is-long-enough-for-hmac-signing",
      GEMINI_API_KEY: "",
      RESEND_API_KEY: "",
    },
  },
});
