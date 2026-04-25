/**
 * Regression test — Vista 360° del Usuario
 * =========================================
 * Verifica que los helpers canónicos documentados en ENTITIES.md siguen
 * existiendo y exportados, y que ningún consumidor "olvida" usarlos
 * filtrando inline por userId (lo que rompería silenciosamente cuando el
 * shape de la entidad cambia, como pasó con InvoiceRecord.sourceOrderId).
 *
 * Run with: node tests/regression/user-360.mjs
 */
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");
const SRC = join(ROOT, "src");

let passed = 0;
let failed = 0;
const failures = [];

function run(name, fn) {
  try {
    const result = fn();
    if (result === false) throw new Error("check returned false");
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}`);
    console.error(`       ${e.message}`);
    failed++;
    failures.push({ name, error: e.message });
  }
}

function readSrc(rel) {
  return readFileSync(join(SRC, rel), "utf8");
}

function grepSrc(pattern, extraArgs = "") {
  try {
    const out = execSync(
      `grep -rn "${pattern}" "${SRC}" ${extraArgs} 2>/dev/null`,
      { encoding: "utf8" },
    );
    return out.trim();
  } catch {
    return "";
  }
}

console.log("\n══════════════════════════════════════════");
console.log("  Vista 360° Usuario — Regression");
console.log("══════════════════════════════════════════\n");

// ── 1. Helpers canónicos documentados en ENTITIES.md siguen exportándose ─────

const HELPERS = [
  { file: "lib/orderAdapter.ts", name: "getOrdersByUser" },
  { file: "services/invoiceService.ts", name: "getInvoicesByUser" },
  { file: "services/pointsService.ts", name: "loadPoints" },
  { file: "services/pointsService.ts", name: "getPointsHistory" },
  { file: "services/couponService.ts", name: "getUserCoupons" },
  { file: "services/messageService.ts", name: "getMessagesForUser" },
  { file: "services/incidentService.ts", name: "getIncidentsByUser" },
  { file: "services/returnService.ts", name: "getReturnsByUser" },
  { file: "services/purchaseLimitService.ts", name: "getRemainingForUser" },
];

for (const h of HELPERS) {
  run(`Helper canónico exportado: ${h.name}() en ${h.file}`, () => {
    const path = join(SRC, h.file);
    if (!existsSync(path)) throw new Error(`Falta el archivo ${h.file}`);
    const src = readFileSync(path, "utf8");
    const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${h.name}\\b`);
    if (!re.test(src)) {
      throw new Error(`No se encuentra "export function ${h.name}" en ${h.file}`);
    }
  });
}

// ── 2. Sin filtros inline `.userId ===` fuera de los servicios canónicos ─────
// Detectamos `(x) => x.userId === ...` o `.filter(... .userId === ...)` en
// archivos que no sean los propios servicios. Si aparece, alguien está
// re-implementando el helper en lugar de reutilizarlo (riesgo: shape change
// rompe silenciosamente).

const ALLOWED_INLINE = [
  "src/services/",
  "src/lib/orderAdapter.ts",
  "tests/",
];

run("Sin filtros inline `.userId ===` fuera de servicios canónicos", () => {
  const hits = grepSrc("\\.userId === ", "--include='*.ts' --include='*.tsx'")
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      const path = line.split(":")[0].replaceAll("\\", "/");
      // Quitar prefijo absoluto de ROOT para comparar con paths relativos
      const rel = path.includes("/src/") ? path.slice(path.indexOf("/src/") + 1) : path;
      return !ALLOWED_INLINE.some((allow) => rel.startsWith(allow));
    });
  if (hits.length > 0) {
    throw new Error(
      `Filtros inline detectados (usar helper canónico):\n  ${hits.slice(0, 10).join("\n  ")}`,
    );
  }
});

// ── 3. ENTITIES.md sigue documentando la tabla de Vista 360° ────────────────

run("ENTITIES.md mantiene la tabla 'Vista 360° del Usuario'", () => {
  const path = join(ROOT, "ENTITIES.md");
  if (!existsSync(path)) throw new Error("Falta ENTITIES.md");
  const md = readFileSync(path, "utf8");
  if (!md.includes("Vista 360° del Usuario")) {
    throw new Error("Falta la sección 'Vista 360° del Usuario' en ENTITIES.md");
  }
  // Cada helper debe estar mencionado en la tabla
  for (const h of HELPERS) {
    if (!md.includes(h.name)) {
      throw new Error(
        `ENTITIES.md no menciona el helper "${h.name}" — actualiza la tabla 360° si has renombrado.`,
      );
    }
  }
});

// ── 4. orderAdapter.getOrdersByUser sigue siendo la SSOT ─────────────────────
// readAdminOrdersMerged debe existir y getOrdersByUser debe usarlo (no leer
// localStorage por su cuenta).

run("orderAdapter.getOrdersByUser delega en readAdminOrdersMerged", () => {
  const src = readSrc("lib/orderAdapter.ts");
  if (!/export\s+function\s+readAdminOrdersMerged/.test(src)) {
    throw new Error("Falta readAdminOrdersMerged en orderAdapter.ts");
  }
  const fnMatch = src.match(
    /export\s+function\s+getOrdersByUser[\s\S]*?\r?\n\}\r?\n/,
  );
  if (!fnMatch) throw new Error("No pude leer el cuerpo de getOrdersByUser");
  if (!fnMatch[0].includes("readAdminOrdersMerged")) {
    throw new Error(
      "getOrdersByUser ya no llama a readAdminOrdersMerged — riesgo de divergencia entre vistas.",
    );
  }
});

// ── 5. invoiceService.getInvoicesByUser resuelve via Order.userId ────────────
// (InvoiceRecord no tiene userId; lo deriva de sourceOrderId). Si alguien
// re-introduce `invoice.userId === id`, el filtro romperá.

run("invoiceService.getInvoicesByUser resuelve por sourceOrderId", () => {
  const src = readSrc("services/invoiceService.ts");
  const fnMatch = src.match(
    /export\s+function\s+getInvoicesByUser[\s\S]*?\r?\n\}\r?\n/,
  );
  if (!fnMatch) throw new Error("No pude leer el cuerpo de getInvoicesByUser");
  if (!/sourceOrderId/i.test(fnMatch[0])) {
    throw new Error(
      "getInvoicesByUser ya no usa sourceOrderId — esto rompería la resolución porque InvoiceRecord no tiene userId directo.",
    );
  }
});

// ── Summary ─────────────────────────────────────────────────────────────────

console.log("\n──────────────────────────────────────────");
console.log(`  ${passed} passed · ${failed} failed`);
console.log("──────────────────────────────────────────\n");

if (failed > 0) {
  console.error("FAILURES:");
  for (const f of failures) console.error(`  - ${f.name}: ${f.error}`);
  process.exit(1);
}
process.exit(0);
