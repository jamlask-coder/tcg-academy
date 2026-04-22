import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    // Default: node. Tests que necesiten DOM declaran
    // `// @vitest-environment jsdom` en la primera línea, o son .tsx dentro
    // de `src/**/__tests__/integration/**` (configurado abajo).
    environment: "node",
    environmentMatchGlobs: [
      ["src/**/__tests__/integration/**", "jsdom"],
      ["src/**/*.integration.test.tsx", "jsdom"],
    ],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/**"],
  },
});
