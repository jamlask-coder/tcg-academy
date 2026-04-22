/**
 * Reglas de arquitectura — dependency-cruiser.
 *
 * Objetivo: proteger los límites entre capas para que el SSOT del registry
 * no se degrade con el tiempo.
 *
 * Correr: `npx depcruise src --include-only "^src"`
 * Incluido en `npm run quality:gate`.
 */
module.exports = {
  forbidden: [
    // ─── Integridad básica ────────────────────────────────────────────────
    {
      name: "no-circular",
      severity: "error",
      comment:
        "Las dependencias circulares rompen el orden de carga y ocultan " +
        "acoplamientos. Refactorizar extrayendo el tipo/helper compartido.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment:
        "Módulos huérfanos (ningún consumidor) suelen ser código muerto. " +
        "Excepciones: páginas Next, tipos globales, tests, configs.",
      from: {
        orphan: true,
        pathNot:
          "(^src/app/|^src/proxy\\.ts$|^src/types/|\\.d\\.ts$|\\.test\\.|\\.spec\\.|^src/config/|^tests/)",
      },
      to: {},
    },

    // ─── Aislamiento de capas ─────────────────────────────────────────────
    {
      name: "public-no-admin",
      severity: "error",
      comment:
        "Rutas públicas (carrito, producto, cuenta...) NO deben importar " +
        "código del dashboard admin. Romperlo contamina el bundle de cliente " +
        "con lógica interna.",
      from: {
        path: "^src/app/(?!admin|api)",
        pathNot: "^src/app/admin/",
      },
      to: { path: "^src/app/admin/" },
    },
    {
      name: "services-no-components",
      severity: "error",
      comment:
        "La capa de servicios es lógica pura. No debe depender de componentes " +
        "React ni de hooks — eso invierte la dependencia.",
      from: { path: "^src/services/" },
      to: { path: "^src/components/" },
    },
    {
      name: "lib-no-app",
      severity: "error",
      comment:
        "src/lib es infra reutilizable. Si importa de src/app es que la capa " +
        "está mal elegida — la lógica pertenece a src/app o a un servicio.",
      from: { path: "^src/lib/" },
      to: { path: "^src/app/" },
    },
    {
      name: "data-no-services",
      severity: "warn",
      comment:
        "src/data son datos estáticos/seed. Si dependen de servicios hay " +
        "riesgo de import cycle y de lógica escondida en datos.",
      from: { path: "^src/data/" },
      to: { path: "^src/services/" },
    },
    {
      name: "config-is-leaf",
      severity: "error",
      comment:
        "src/config define constantes del sitio — no debe importar nada " +
        "más que tipos (es hoja del grafo).",
      from: { path: "^src/config/" },
      to: {
        path: "^src/(services|lib|components|app|hooks|context|data)/",
      },
    },

    // ─── Imports peligrosos ───────────────────────────────────────────────
    {
      name: "no-deprecated-modules",
      severity: "error",
      comment:
        "Entidades marcadas deprecated en el registry SSOT no deben tener " +
        "nuevos consumidores.",
      from: {},
      to: { path: "legacyStores|SentEmails|paymentStatus$" },
    },
    {
      name: "no-non-package",
      severity: "error",
      from: {},
      to: {
        dependencyTypes: ["unknown", "undetermined", "npm-no-pkg", "npm-unknown"],
      },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    includeOnly: "^src/",
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
