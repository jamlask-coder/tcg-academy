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
    // `environmentMatchGlobs` fue deprecado en vitest 3.x (reemplazado por
    // `projects`). Lo mantenemos como fallback runtime; el cast evita que
    // el build de tsc falle con la versión actualizada de @vitest/core.
    ...({
      environmentMatchGlobs: [
        ["src/**/__tests__/integration/**", "jsdom"],
        ["src/**/*.integration.test.tsx", "jsdom"],
      ],
    } as Record<string, unknown>),
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/**"],
  },
});
