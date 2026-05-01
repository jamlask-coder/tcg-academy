import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "backups/**",
    "tests/**",
    "scripts/**",
  ]),
  {
    rules: {
      // ── No debug artifacts ───────────────────────────────────────
      "no-console": "error",
      "no-debugger": "error",

      // ── TypeScript strictness ────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports" },
      ],

      // ── React ────────────────────────────────────────────────────
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // ── Accessibility ─────────────────────────────────────────────
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",

      // ── Anti-mock-leak: mockData solo expone TYPES ───────────────
      // Tras la purga Fase 3 (2026-05-01) mockData.ts solo contiene types.
      // Si alguien intenta importar valores de ahí, ESLint lo bloquea.
      // Solo `import type { ... } from "@/data/mockData"` está permitido.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/data/mockData",
              message:
                "mockData solo expone TYPES. Importa valores del servicio canónico (ver ENTITIES.md). Si necesitas un type, usa `import type`.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
