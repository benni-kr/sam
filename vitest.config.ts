import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      /** * Maps the "@" prefix to the root directory for clean imports.
       * Matches the configuration in tsconfig.json.
       */
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // Allows using describe, it, and expect without manual imports in every file.
    globals: true,
    // Replaces the default 'node' environment with a simulated browser (JSDOM).
    environment: "jsdom",
    // Patterns to locate test files across the feature-based directory structure.
    include: ["**/*.test.{ts,tsx}"],
    // Optional: Setup file for global mocks (like matchMedia or ResizeObserver)
    // setupFiles: ["./vitest.setup.ts"],
  },
});
