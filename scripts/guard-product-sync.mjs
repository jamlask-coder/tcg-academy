#!/usr/bin/env node
// scripts/guard-product-sync.mjs
//
// Guard anti-regresión para el bug StrixHaven (2026-04-22):
// componente con `useState(product.XXX)` + state/prop `product` que puede
// cambiar → los inline* quedan desfasados si no hay useEffect de sync.
//
// Busca componentes bajo src/components/ y src/app/ (excluyendo admin puro,
// donde este patrón es intencional de edición) que cumplan:
//   (A) tengan `useState(product.<ident>)` o `useState(product.<ident> ??`
//   (B) también reciban `product` como prop desestructurado o como state local
//
// Y verifica que para cada componente así haya AL MENOS un `useEffect(...)`
// con `[product]` o `[product.id, ..., product, ...]` en sus deps, donde se
// invoque `setInline*` / `setProduct`. Si no lo encuentra → error.
//
// Uso: `node scripts/guard-product-sync.mjs`
// Se integra en `npm run quality:gate`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

// Archivos que admiten el patrón intencionadamente (form de edición admin):
// react-hook-form usa defaultValues congelados y tiene su propio ciclo.
const ALLOWLIST = new Set(
  [
    "src/app/admin/productos/editar/[id]/EditProductClient.tsx",
    "src/components/admin/ProductForm.tsx",
  ].map((p) => p.replaceAll("/", sep)),
);

const INCLUDE_DIRS = ["components", "app"];
const EXT = /\.(tsx|ts)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "__tests__" || name === ".next" || name === "node_modules") continue;
      walk(full, out);
    } else if (EXT.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = INCLUDE_DIRS.flatMap((d) => walk(join(SRC, d))).filter(
  (f) => !ALLOWLIST.has(relative(ROOT, f)),
);

const offenders = [];
for (const file of files) {
  const src = readFileSync(file, "utf8");

  // ¿Tiene `useState(product.<ident>` ?
  const usesInlineFromProduct = /useState\(\s*product\.[A-Za-z_]/.test(src);
  if (!usesInlineFromProduct) continue;

  // ¿Tiene un useEffect con dep [product] que llame setInline* / setProduct?
  // Busca bloque useEffect(() => { ... }, [..., product, ...])
  const useEffectBlocks = [
    ...src.matchAll(
      /useEffect\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([^\]]*)\]\s*\)/g,
    ),
  ];
  const hasSyncEffect = useEffectBlocks.some(([, body, deps]) => {
    const depList = deps.split(",").map((s) => s.trim());
    const depsIncludesProduct = depList.some(
      (d) => d === "product" || d.startsWith("product.") === false && d === "product",
    );
    const bodyCallsSet = /\bset(Inline[A-Z]|Product)\w*\(/.test(body);
    return depsIncludesProduct && bodyCallsSet;
  });

  if (!hasSyncEffect) {
    offenders.push(relative(ROOT, file));
  }
}

if (offenders.length > 0) {
  console.error(
    "\n❌ guard-product-sync: componentes con `useState(product.XXX)` SIN useEffect de sync con dep [product]:\n",
  );
  for (const o of offenders) console.error("   • " + o);
  console.error(
    `\nIncidente de referencia: StrixHaven 2026-04-22 (H1 / breadcrumb / precio divergentes).`,
  );
  console.error(
    `Fix: añadir useEffect(() => { if (editMode) return; setInline*(product.XXX); }, [product, editMode]);`,
  );
  console.error(
    `Ver: memory/feedback_catalog_detail_consistency.md\n`,
  );
  process.exit(1);
}

console.log(
  `✅ guard-product-sync: ${files.length} archivos revisados, 0 ofensores.`,
);
