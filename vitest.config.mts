import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // Each component file spins up its own jsdom. The default 5s is enough
    // when the machine is idle and not when it isn't, which reads as a flaky
    // suite rather than a busy laptop.
    testTimeout: 20_000,
  },
});
