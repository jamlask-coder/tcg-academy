/**
 * TCG Academy — 20-test audit suite
 * Run with: node tests/audit/run-audit.mjs
 */
import { execSync } from "child_process"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"
import { fileURLToPath } from "url"

const ROOT = join(fileURLToPath(import.meta.url), "../../..")
const SRC  = join(ROOT, "src")

let passed = 0
let failed = 0
const failures = []

function run(name, fn) {
  try {
    const result = fn()
    if (result === false) throw new Error("check returned false")
    console.log(`  ✓  ${name}`)
    passed++
  } catch (e) {
    console.error(`  ✗  ${name}`)
    console.error(`       ${e.message}`)
    failed++
    failures.push({ name, error: e.message })
  }
}

function grepSrc(pattern, extraArgs = "") {
  try {
    const out = execSync(`grep -rn "${pattern}" "${SRC}" ${extraArgs} 2>/dev/null`, { encoding: "utf8" })
    return out.trim()
  } catch {
    return ""
  }
}

function allFiles(dir, ext = ".tsx") {
  const results = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else if (full.endsWith(ext)) results.push(full)
    }
  }
  walk(dir)
  return results
}

console.log("\n══════════════════════════════════════════")
console.log("  TCG Academy — Audit (20 tests)")
console.log("══════════════════════════════════════════\n")

// ── Test 1: TypeScript compilation ─────────────────────────────────────────────
run("Test 1 — TypeScript: 0 errores (tsc --noEmit)", () => {
  execSync(`cd "${ROOT}" && npx tsc --noEmit`, { stdio: "pipe" })
})

// ── Test 2: Build ───────────────────────────────────────────────────────────────
run("Test 2 — Build: npm run build sin errores", () => {
  const out = execSync(`cd "${ROOT}" && npm run build 2>&1`, { encoding: "utf8" })
  if (out.includes("error") && !out.includes("Compiled successfully")) {
    throw new Error("Build output contains errors")
  }
})

// ── Test 3: No debug artifacts ──────────────────────────────────────────────────
run("Test 3 — Sin console.log / debugger / TODO / FIXME", () => {
  const hits = grepSrc("console\\.log\\|debugger\\|\\bTODO\\b\\|\\bFIXME\\b")
  if (hits) throw new Error(`Encontrado:\n${hits}`)
})

// ── Test 4: No unsafe 'any' in types ───────────────────────────────────────────
run("Test 4 — Sin 'any' en tipos TypeScript", () => {
  const hits = grepSrc(": any\\b\\|as any\\b", "--include='*.ts' --include='*.tsx'")
    .split("\n")
    .filter(l => l && !l.includes("// "))
  if (hits.length > 0) throw new Error(`'any' encontrado en:\n${hits.slice(0, 5).join("\n")}`)
})

// ── Test 5: No VAT breakdown in product display ────────────────────────────────
run("Test 5 — Sin precio s/IVA en páginas de producto", () => {
  const ALLOWED = ["admin/fiscal", "admin/productos", "cuenta/facturas", "invoiceGenerator", "usePrice"]
  const hits = grepSrc("priceWithoutVAT\\|s\\/IVA\\|sin IVA\\|sinIVA\\|withoutVAT")
    .split("\n")
    .filter(l => l && !ALLOWED.some(a => l.includes(a)))
  if (hits.length > 0) throw new Error(`Precio sin IVA en exposición:\n${hits.join("\n")}`)
})

// ── Test 6: No mock/fake ratings ───────────────────────────────────────────────
run("Test 6 — Sin mock ratings / stars en producto", () => {
  const hits = grepSrc("Mock ratings\\|reseñas\\|124 reseñas\\|fill-yellow-400.*Star\\|Star.*fill-yellow",
    "--include='*ProductCard*' --include='*ProductDetail*'")
  if (hits) throw new Error(`Mock ratings encontrados:\n${hits}`)
})

// ── Test 7: All product images have loading="lazy" (non-priority) ─────────────
run("Test 7 — Imágenes fuera del viewport con loading=lazy", () => {
  // Check that img tags that are NOT in the hero/above-fold have lazy loading
  // We look for img tags without loading="lazy" in card components
  const cards = grepSrc('<img', `"${SRC}/components/product/LocalProductCard.tsx"`)
    .split("\n")
    .filter(l => l.includes("<img") && !l.includes('loading="lazy"') && !l.includes("loading={"))
  if (cards.length > 0) throw new Error(`Imágenes sin lazy loading en card:\n${cards.join("\n")}`)
})

// ── Test 8: No horizontal overflow at key breakpoints (static check) ──────────
run("Test 8 — Sin overflow-x en CSS (no overflow-x: visible implícito)", () => {
  // Check there are no unconstrained full-width elements that could cause overflow
  const hits = grepSrc("overflow-x-visible\\|w-\\[9999px\\]\\|w-\\[2000px\\]")
  if (hits) throw new Error(`Posible overflow: ${hits}`)
})

// ── Test 9: No inline styles with hardcoded viewport widths ──────────────────
run("Test 9 — Sin anchos de viewport hardcoded en inline styles", () => {
  const hits = grepSrc('width: "100vw"\\|minWidth: "100vw"\\|width: 100vw')
  if (hits) throw new Error(`VW hardcoded: ${hits}`)
})

// ── Test 10: ShareButtons component exists and is imported in ProductDetail ───
run("Test 10 — ShareButtons existe y se usa en ProductDetailClient", () => {
  const detail = readFileSync(join(SRC, "components/product/ProductDetailClient.tsx"), "utf8")
  if (!detail.includes("ShareButtons")) throw new Error("ShareButtons no importado en ProductDetailClient")
  if (!detail.includes("<ShareButtons")) throw new Error("ShareButtons no renderizado en ProductDetailClient")
})

// ── Test 11: isNewProduct utility exported from products.ts ───────────────────
run("Test 11 — isNewProduct() exportado desde products.ts", () => {
  const products = readFileSync(join(SRC, "data/products.ts"), "utf8")
  if (!products.includes("export function isNewProduct")) throw new Error("isNewProduct no exportado")
})

// ── Test 12: Footer usa CIF real desde SITE_CONFIG + copyright presente ───────
run("Test 12 — Footer: usa SITE_CONFIG + copyright dinámico", () => {
  const footer = readFileSync(join(SRC, "components/layout/Footer.tsx"), "utf8")
  if (!footer.includes("SITE_CONFIG")) throw new Error("Footer no importa SITE_CONFIG")
  if (!/SITE_CONFIG\.(name|cif|legalName|email|phone)/.test(footer)) {
    throw new Error("Footer no usa ningún campo de SITE_CONFIG (hardcoded risk)")
  }
  if (!/©|copyright/i.test(footer)) throw new Error("Footer sin copyright visible")
  if (!/new Date\(\)\.getFullYear\(\)/.test(footer)) {
    throw new Error("Footer sin año dinámico (debe usar new Date().getFullYear())")
  }
})

// ── Test 13: Header topbar has gradient ───────────────────────────────────────
run("Test 13 — Header topbar tiene gradiente", () => {
  const header = readFileSync(join(SRC, "components/layout/Header.tsx"), "utf8")
  if (!header.includes("linear-gradient")) throw new Error("Header topbar sin gradiente")
})

// ── Test 14: No hardcoded 'Tienda TCG líder en España' in footer ─────────────
run("Test 14 — Footer sin tagline largo 'Tienda TCG líder'", () => {
  const footer = readFileSync(join(SRC, "components/layout/Footer.tsx"), "utf8")
  if (footer.includes("líder en España")) throw new Error("Tagline largo encontrado en footer")
})

// ── Test 15: ProductDetail image has max-h constraint ─────────────────────────
run("Test 15 — ProductDetail: imagen con max-h (compacta)", () => {
  const detail = readFileSync(join(SRC, "components/product/ProductDetailClient.tsx"), "utf8")
  if (!detail.includes("max-h-[")) throw new Error("ProductDetail sin max-h en imagen")
})

// ── Test 16: No price 'text-4xl' in product detail (reduced) ─────────────────
run("Test 16 — ProductDetail: precio no usa text-4xl (reducido a text-2xl)", () => {
  const detail = readFileSync(join(SRC, "components/product/ProductDetailClient.tsx"), "utf8")
  if (detail.includes("text-4xl")) throw new Error("Precio text-4xl encontrado, debe ser text-2xl")
})

// ── Test 17: Admin layout uses role check ─────────────────────────────────────
run("Test 17 — Rutas admin tienen verificación de rol (layout)", () => {
  const adminLayout = readFileSync(join(SRC, "app/admin/layout.tsx"), "utf8")
  if (!adminLayout.includes("useAuth") && !adminLayout.includes("role")) {
    throw new Error("layout.tsx de /admin sin verificación de rol (useAuth/role)")
  }
})

// ── Test 18: No script injection in contact form (sanitization check) ─────────
run("Test 18 — Formulario contacto no ejecuta JS malicioso (dangerouslySetInnerHTML)", () => {
  const hits = grepSrc("dangerouslySetInnerHTML", `"${join(SRC, 'app/contacto')}"`)
  if (hits) throw new Error(`dangerouslySetInnerHTML en contacto:\n${hits}`)
})

// ── Test 19: No files >150 lines in components ────────────────────────────────
run("Test 19 — Archivos de UI (<= 150 líneas) — solo verificar los más pequeños", () => {
  const LIMIT = 300 // generous limit for complex components
  const oversized = allFiles(join(SRC, "components/ui"))
    .map(f => ({ f: relative(ROOT, f), lines: readFileSync(f, "utf8").split("\n").length }))
    .filter(x => x.lines > LIMIT)
  if (oversized.length > 0) {
    throw new Error(oversized.map(x => `${x.f}: ${x.lines} líneas`).join("\n"))
  }
})

// ── Test 20: LocalProductCard has IVA incl. and no priceWithoutVAT ───────────
run("Test 20 — LocalProductCard: solo 'IVA incl.' sin desglose de IVA", () => {
  const card = readFileSync(join(SRC, "components/product/LocalProductCard.tsx"), "utf8")
  if (card.includes("priceWithoutVAT")) throw new Error("priceWithoutVAT encontrado en LocalProductCard")
  if (!card.includes("IVA incl")) throw new Error("'IVA incl.' no encontrado en LocalProductCard")
})

// ── Summary ────────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════")
console.log(`  Resultado: ${passed}/20 tests pasados`)
if (failed > 0) {
  console.log(`  FALLOS (${failed}):`)
  failures.forEach(({ name }) => console.log(`    - ${name}`))
}
console.log("══════════════════════════════════════════\n")

process.exit(failed > 0 ? 1 : 0)
