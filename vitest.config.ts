import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // include tests from legacy `tests/` dir and all colocated tests
    include: ["tests/**/*.test.ts", "**/*.test.{ts,tsx}"],
  },
});
