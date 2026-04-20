#!/usr/bin/env node
/**
 * count-warnings.mjs — Mide warnings ESLint y compara con baseline.
 *
 * Uso:
 *   node scripts/count-warnings.mjs                → compara con baseline
 *   node scripts/count-warnings.mjs --baseline     → congela el número actual
 *
 * Política: el número de warnings NO puede crecer entre commits.
 * Si baja, se actualiza automáticamente el baseline.
 * Archivo de estado: .warnings-baseline.json (checkeado en el repo).
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BASELINE_PATH = resolve(ROOT, ".warnings-baseline.json");

const args = process.argv.slice(2);
const setBaseline = args.includes("--baseline");

function runEslintJson() {
  try {
    const out = execSync("npx eslint src/ --format json", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch (err) {
    // eslint exits non-zero when there are errors; stdout still has the JSON.
    const stdout = err.stdout?.toString?.() ?? "";
    if (!stdout) {
      console.error("[count-warnings] Error ejecutando eslint:", err.message);
      process.exit(2);
    }
    return JSON.parse(stdout);
  }
}

function countWarnings(results) {
  let warnings = 0;
  let errors = 0;
  for (const r of results) {
    warnings += r.warningCount ?? 0;
    errors += r.errorCount ?? 0;
  }
  return { warnings, errors };
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    const raw = readFileSync(BASELINE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeBaseline(warnings) {
  const payload = {
    warnings,
    updatedAt: new Date().toISOString(),
    note: "Generado por scripts/count-warnings.mjs. No editar a mano. Los warnings NO pueden subir.",
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + "\n");
}

const results = runEslintJson();
const { warnings, errors } = countWarnings(results);

console.log(`ESLint: ${errors} error(es), ${warnings} warning(s).`);

if (setBaseline) {
  writeBaseline(warnings);
  console.log(`Baseline guardado: ${warnings} warnings.`);
  process.exit(0);
}

const baseline = readBaseline();

if (!baseline) {
  console.log(
    "No hay baseline todavía. Crea uno con: npm run warnings:baseline",
  );
  process.exit(0);
}

if (warnings > baseline.warnings) {
  console.error(
    `\n✖ Warnings subieron: ${baseline.warnings} → ${warnings} (+${
      warnings - baseline.warnings
    }).\n  No se permite introducir warnings nuevos.\n  Arréglalos o, si es intencional, ejecuta: npm run warnings:baseline`,
  );
  process.exit(1);
}

if (warnings < baseline.warnings) {
  console.log(
    `✓ Warnings bajaron: ${baseline.warnings} → ${warnings}. Actualizando baseline.`,
  );
  writeBaseline(warnings);
  process.exit(0);
}

console.log(`✓ Warnings estables en ${warnings} (baseline).`);
process.exit(0);
