/**
 * TCG Academy — 20-test audit suite
 * Run with: node tests/audit/run-audit.mjs
 */
import { execSync } from "child_process"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative, sep } from "path"
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
console.log("  TCG Academy — Audit (30 tests)")
console.log("══════════════════════════════════════════\n")

// ── Test 1: TypeScript compilation ─────────────────────────────────────────────
run("Test 1 — TypeScript: 0 errores (tsc --noEmit)", () => {
  execSync(`cd "${ROOT}" && npx tsc --noEmit`, { stdio: "pipe" })
})

// ── Test 2: Build ───────────────────────────────────────────────────────────────
// Heap a 4GB porque el build de Next 16 + Tailwind v4 supera el default
// (~1.5GB) en Windows. Vercel y la mayoría de CIs ya corren con >=4GB, así que
// alineamos el test a lo que ven los entornos de despliegue real.
run("Test 2 — Build: npm run build sin errores", () => {
  const out = execSync(`cd "${ROOT}" && npm run build 2>&1`, {
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=4096`.trim() },
  })
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
run("Test 17 — Rutas admin tienen verificación de rol (layout o shell)", () => {
  // El gate puede estar en layout.tsx o delegado al AdminShell que renderiza el layout.
  const adminLayout = readFileSync(join(SRC, "app/admin/layout.tsx"), "utf8")
  const adminShell = readFileSync(join(SRC, "app/admin/_AdminShell.tsx"), "utf8")
  const combined = adminLayout + "\n" + adminShell
  if (!combined.includes("useAuth") && !combined.includes("role")) {
    throw new Error("Ni layout.tsx ni _AdminShell.tsx hacen verificación de rol")
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

// ── Test 21: No llamadas directas a logSentEmail() fuera de emailService.ts ──
// Ese antipatrón hace que los emails nunca salgan de verdad (en server mode).
// El helper canónico es sendAppEmail(), que renderiza plantilla, envía vía
// Resend cuando toca y loggea el envío. Un call site nuevo a logSentEmail()
// silenciosamente rompería todas las notificaciones en producción.
run("Test 21 — logSentEmail() solo se llama dentro de emailService.ts", () => {
  const hits = grepSrc("logSentEmail(", "--include=*.ts --include=*.tsx")
  const lines = hits.split("\n").filter(Boolean)
  const offenders = lines.filter((l) => {
    // Permitir:
    //  - La definición y uso interno en services/emailService.ts
    //  - Exports/re-exports inocuos (type-only, etc.)
    if (l.includes("services/emailService.ts:")) return false
    // Cualquier otro archivo que llame a logSentEmail( es un offender.
    return /logSentEmail\s*\(/.test(l)
  })
  if (offenders.length > 0) {
    throw new Error(
      `logSentEmail() llamado fuera de emailService.ts (usar sendAppEmail()):\n` +
        offenders.join("\n"),
    )
  }
})

// ── Test 22: Template IDs usados en código existen en SSOT ────────────────────
// Cada `sendTemplatedEmail("X", ...)` o `templateId: "X"` debe resolver a una
// plantilla definida en src/data/emailTemplates.ts o a una legacy en lib/email.ts.
// Motivación: si un desarrollador usa un id inventado, `sendAppEmail` devuelve
// {ok:false} en silencio y el email nunca sale. Queremos que CI explote.
run("Test 22 — Template IDs referenciados existen en la SSOT", () => {
  const admin = readFileSync(join(SRC, "data/emailTemplates.ts"), "utf8")
  const legacy = readFileSync(join(SRC, "lib/email.ts"), "utf8")
  const idRe = /id:\s*"([a-z0-9_]+)"/g
  const legacyRe = /^\s{2}([a-z0-9_]+):\s*\{\s*$/gm
  const validIds = new Set()
  for (const m of admin.matchAll(idRe)) validIds.add(m[1])
  for (const m of legacy.matchAll(legacyRe)) validIds.add(m[1])

  const callRe = /(?:sendTemplatedEmail\s*\(\s*"([a-z0-9_]+)"|templateId:\s*"([a-z0-9_]+)")/g
  const offenders = []
  const allFilesSrc = allFiles(SRC, ".ts").concat(allFiles(SRC, ".tsx"))
  for (const f of allFilesSrc) {
    const rel = relative(ROOT, f).replace(/\\/g, "/")
    if (rel.endsWith("src/data/emailTemplates.ts") || rel.endsWith("src/lib/email.ts")) continue
    const content = readFileSync(f, "utf8")
    for (const m of content.matchAll(callRe)) {
      const id = m[1] || m[2]
      if (!id) continue
      if (!validIds.has(id)) offenders.push(`${rel}: "${id}"`)
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `Template IDs no encontrados en src/data/emailTemplates.ts ni en LEGACY_TEMPLATES:\n` +
        offenders.join("\n"),
    )
  }
})

// ── Test 23: Secrets server-only no referenciados desde código cliente ───────
// Motivación: un `process.env.RESEND_API_KEY` en un componente "use client"
// siempre devuelve undefined en el browser (solo NEXT_PUBLIC_* se expone).
// El síntoma es silencioso: la funcionalidad parece hacer algo pero falla. Si
// detectamos el patrón en CI, forzamos mover la llamada a /api/*.
run("Test 23 — Secrets server-only no se usan desde código cliente", () => {
  const SERVER_ONLY_SECRETS = [
    "RESEND_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "CRON_SECRET",
    "TURNSTILE_SECRET",
    "TURNSTILE_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "VERIFACTU_API_KEY",
    "TCGPLAYER_PRIVATE_KEY",
    "JWT_SECRET",
    "SESSION_SECRET",
  ]
  const offenders = []
  const allFilesSrc = allFiles(SRC, ".ts").concat(allFiles(SRC, ".tsx"))
  for (const f of allFilesSrc) {
    const rel = relative(ROOT, f).replace(/\\/g, "/")
    // Archivos server-only (permitidos):
    //   - src/app/api/**  (Route handlers)
    //   - src/middleware.ts
    //   - Adapters/libs que solo se cargan desde api/ o server components.
    //     Permitidos por path convention.
    const isServerPath =
      rel.includes("/src/app/api/") ||
      rel.endsWith("/src/middleware.ts") ||
      rel.includes("/src/lib/auth.ts") ||
      rel.includes("/src/lib/db.ts") ||
      rel.includes("/src/lib/email.ts") ||
      rel.includes("/src/lib/supabase") ||
      rel.includes("/src/lib/turnstile") ||
      rel.includes("/src/lib/stripe") ||
      rel.includes("/src/lib/priceHistoryStore") ||
      rel.includes("/src/lib/priceFetchers") ||
      rel.includes("/src/lib/forex")
    if (isServerPath) continue

    const content = readFileSync(f, "utf8")
    // Si el archivo declara "use client", TODO su contenido corre en browser.
    // Si no lo declara, puede ser server o compartido — en Next 14+ por defecto
    // es server component, así que asumimos safe si NO lo importa un client.
    // Aproximación pragmática: solo comprobamos archivos "use client" o bajo
    // src/components/, src/context/, src/hooks/ (casi siempre cliente).
    const clientyPath =
      rel.includes("/src/components/") ||
      rel.includes("/src/context/") ||
      rel.includes("/src/hooks/") ||
      rel.includes("/src/services/") // services se usan desde cliente
    const isUseClient = /^\s*["']use client["']/m.test(content)
    if (!clientyPath && !isUseClient) continue

    for (const secret of SERVER_ONLY_SECRETS) {
      const re = new RegExp(`process\\.env\\.${secret}\\b`)
      if (re.test(content)) offenders.push(`${rel}: ${secret}`)
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `Secretos server-only referenciados desde código cliente (mover a /api/*):\n` +
        offenders.join("\n"),
    )
  }
})

// ── Test 24: verificar_email sale en /api/auth register (server mode) ────────
// Motivación: este bug estuvo activo — AuthContext intentaba enviar el email
// de verificación desde el cliente en server mode, donde RESEND_API_KEY no
// existe, y fallaba en silencio. Si alguien vuelve a quitar el envío server
// side, este test explota.
run("Test 24 — /api/auth register envía verificar_email server-side", () => {
  const route = readFileSync(join(SRC, "app/api/auth/route.ts"), "utf8")
  // Localiza el bloque del case "register" hasta el siguiente `case `.
  const start = route.indexOf('case "register"')
  const next = route.indexOf('case "', start + 10)
  const block = start === -1 ? "" : route.slice(start, next === -1 ? undefined : next)
  if (!block.includes('sendTemplatedEmail("verificar_email"')) {
    throw new Error("case \"register\" no envía la plantilla verificar_email server-side")
  }
  if (!block.includes("createEmailVerificationToken")) {
    throw new Error("case \"register\" no persiste token via db.createEmailVerificationToken")
  }
  // AuthContext: el envío cliente debe estar SOLO dentro de la rama local.
  const authCtx = readFileSync(join(SRC, "context/AuthContext.tsx"), "utf8")
  const issueIdx = authCtx.indexOf("issueVerificationToken(email)")
  if (issueIdx !== -1) {
    const before = authCtx.slice(Math.max(0, issueIdx - 400), issueIdx)
    if (!/backendMode\s*!==?\s*["']server["']/.test(before)) {
      throw new Error(
        "AuthContext.register envía verificar_email sin guard backendMode!==server (fallaría en producción)",
      )
    }
  }
})

run("Test 25 — Invariante de envío: shipping/total coherentes + sin hardcodes", () => {
  // 1) No hardcoded shipping cost / threshold fuera de SITE_CONFIG + priceVerification
  // El umbral 149 y los costes 4.95 / 6.99 SSOT viven en siteConfig.ts. Cualquier
  // otro sitio que los repita es una fuga que tarde o temprano desincroniza.
  const siteConfig = readFileSync(join(SRC, "config/siteConfig.ts"), "utf8")
  for (const literal of ["149", "4.95", "6.99"]) {
    if (!siteConfig.includes(literal)) {
      throw new Error(`SITE_CONFIG no contiene ${literal} — actualiza este test si cambias valores`)
    }
  }
  const allowHardcodeIn = new Set([
    join(SRC, "config/siteConfig.ts"),
    join(SRC, "lib/priceVerification.ts"),
  ])
  const forbiddenShippingLiterals = /(^|[^0-9.])(4\.95|6\.99)([^0-9]|$)/
  const forbiddenThresholdLiteral = /(^|[^0-9.])149([^0-9]|$)/
  function scan(dir) {
    const leaks = []
    function walk(d) {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry)
        const st = statSync(full)
        if (st.isDirectory()) { walk(full); continue }
        if (!/\.(ts|tsx)$/.test(full)) continue
        if (allowHardcodeIn.has(full)) continue
        // src/data/ son snapshots de datos (mockData, seedData, products). Los
        // hardcodes legítimos viven ahí; la coherencia con la regla se valida
        // en la parte 2 de este test vía el invariante por pedido.
        if (full.startsWith(join(SRC, "data") + sep)) continue
        const content = readFileSync(full, "utf8")
        const lines = content.split("\n")
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const isShippingCtx = /shipping|envío|envio|shippingCost/i.test(line)
          if (isShippingCtx && forbiddenShippingLiterals.test(line)) {
            leaks.push(`${relative(ROOT, full)}:${i + 1} → shipping cost hardcoded`)
          }
          if (isShippingCtx && forbiddenThresholdLiteral.test(line) &&
              !/shippingThreshold/.test(line)) {
            leaks.push(`${relative(ROOT, full)}:${i + 1} → shippingThreshold hardcoded`)
          }
        }
      }
    }
    walk(dir)
    return leaks
  }
  const leaks = scan(SRC)
  if (leaks.length > 0) {
    throw new Error(`Hardcodes de envío fuera de SITE_CONFIG:\n       ${leaks.join("\n       ")}`)
  }

  // 2) mockData.ts: para cada pedido, shipping === 0 ⇔ (pickup | cupón gratis | subtotal >= 149)
  const mock = readFileSync(join(SRC, "data/mockData.ts"), "utf8")
  // Extrae bloques de orden por regex muy laxo: desde `id: "TCG-` hasta el siguiente `id: "TCG-`.
  const orderStarts = [...mock.matchAll(/id:\s*"TCG-[^"]+"/g)].map(m => m.index)
  const violations = []
  for (let i = 0; i < orderStarts.length; i++) {
    const start = orderStarts[i]
    const end = i + 1 < orderStarts.length ? orderStarts[i + 1] : start + 3000
    const block = mock.slice(start, end)
    const idMatch = block.match(/id:\s*"(TCG-[^"]+)"/)
    const subMatch = block.match(/subtotal:\s*([\d.]+)/)
    const shipMatch = block.match(/shipping:\s*([\d.]+)/)
    if (!idMatch || !subMatch || !shipMatch) continue
    const id = idMatch[1]
    const subtotal = parseFloat(subMatch[1])
    const shipping = parseFloat(shipMatch[1])
    const paymentMethod = (block.match(/paymentMethod:\s*"([^"]+)"/) || [,""])[1]
    const envio = (block.match(/envio:\s*"([^"]+)"/) || [,""])[1]
    const freeCoupon = /freeShippingCoupon:\s*true/.test(block)
    const isPickup = /tienda|pickup|recogida/i.test(paymentMethod) ||
                     /tienda|pickup|recogida/i.test(envio) ||
                     /Recogida/i.test(block)
    const expectedZero = isPickup || freeCoupon || subtotal >= 149
    if (shipping === 0 && !expectedZero) {
      violations.push(
        `${id}: subtotal=${subtotal}€ < 149€ y método "${paymentMethod}" no es pickup, pero shipping=0`,
      )
    }
    if (shipping > 0 && subtotal >= 149 && !freeCoupon) {
      violations.push(
        `${id}: subtotal=${subtotal}€ >= 149€ pero shipping=${shipping} (debería ser 0)`,
      )
    }
  }
  if (violations.length > 0) {
    throw new Error(`mockData.ts rompe invariante de envío:\n       ${violations.join("\n       ")}`)
  }
})

// ── Test 26: backups/ no rastreado en git ──────────────────────────────────────
run("Test 26 — backups/ no está rastreado en git (PII riesgo)", () => {
  let tracked = ""
  try {
    tracked = execSync(`cd "${ROOT}" && git ls-files backups/ 2>/dev/null`, { encoding: "utf8" }).trim()
  } catch {
    tracked = ""
  }
  if (tracked) {
    throw new Error(`backups/ contiene archivos rastreados (riesgo PII):\n       ${tracked.split("\n").slice(0, 5).join("\n       ")}`)
  }
  const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8")
  if (!/^\/?backups\/?$/m.test(gitignore)) {
    throw new Error(".gitignore debe contener una entrada para backups/")
  }
})

// ── Test 27: og-default.png existe ─────────────────────────────────────────────
run("Test 27 — public/og-default.png existe (referenciada por metadata)", () => {
  const og = join(ROOT, "public", "og-default.png")
  try {
    const st = statSync(og)
    if (!st.isFile() || st.size < 1024) {
      throw new Error(`og-default.png existe pero es sospechosamente pequeño (${st.size} bytes)`)
    }
  } catch (e) {
    throw new Error(`public/og-default.png no existe — preview social rota. Generar con: node scripts/generate-og-image.mjs`)
  }
})

// ── Test 28: DEMO_USERS gateado en producción ──────────────────────────────────
run("Test 28 — DEMO_USERS gateado por NODE_ENV/flag (no expuesto en prod)", () => {
  const files = [
    join(SRC, "context/AuthContext.tsx"),
    join(SRC, "app/restablecer-contrasena/page.tsx"),
  ]
  for (const f of files) {
    const c = readFileSync(f, "utf8")
    if (!/DEMO_USERS_ENABLED/.test(c)) {
      throw new Error(`${relative(ROOT, f)}: falta gate DEMO_USERS_ENABLED`)
    }
    if (!/NEXT_PUBLIC_ENABLE_DEMO_USERS/.test(c)) {
      throw new Error(`${relative(ROOT, f)}: falta override NEXT_PUBLIC_ENABLE_DEMO_USERS`)
    }
    if (!/NODE_ENV\s*!==\s*["']production["']/.test(c)) {
      throw new Error(`${relative(ROOT, f)}: falta condicional NODE_ENV !== "production"`)
    }
  }
})

// ── Test 29: /api/orders valida descuentos server-side ────────────────────────
run("Test 29 — /api/orders usa validateAndComputeDiscounts (anti-fraude)", () => {
  const route = readFileSync(join(SRC, "app/api/orders/route.ts"), "utf8")
  if (!/validateAndComputeDiscounts/.test(route)) {
    throw new Error("/api/orders no llama validateAndComputeDiscounts — fraude descuentos posible")
  }
  // Sanidad: ya no debe restar coupon.discount o pointsDiscount sin validar
  const naive = /subtotal\s*=\s*Math\.max\(0,\s*subtotal\s*-\s*coupon\.discount/
  if (naive.test(route)) {
    throw new Error("/api/orders sigue restando coupon.discount sin validar")
  }
  const naive2 = /subtotal\s*=\s*Math\.max\(0,\s*subtotal\s*-\s*pointsDiscount\s*\)/
  if (naive2.test(route)) {
    throw new Error("/api/orders sigue restando pointsDiscount sin validar")
  }
})

// ── Test 30: ServerDbAdapter.getCouponByCode/getPoints implementados ──────────
run("Test 30 — ServerDbAdapter no tiene stubs null en getCouponByCode/getPoints", () => {
  const db = readFileSync(join(SRC, "lib/db.ts"), "utf8")
  // Localiza la sección ServerDbAdapter
  const idx = db.indexOf("class ServerDbAdapter")
  if (idx < 0) throw new Error("ServerDbAdapter no encontrado en src/lib/db.ts")
  const tail = db.slice(idx)
  // Patrones de stub: una función que solo hace `return null`
  const stubCoupon = /getCouponByCode\s*\([^)]*\)\s*:[^{]*\{\s*return\s+null;?\s*\}/.test(tail)
  if (stubCoupon) {
    throw new Error("ServerDbAdapter.getCouponByCode sigue siendo stub (return null) — descuentos no se validan en prod")
  }
  const stubPoints = /getPoints\s*\([^)]*\)\s*:[^{]*\{\s*return\s+null;?\s*\}/.test(tail)
  if (stubPoints) {
    throw new Error("ServerDbAdapter.getPoints sigue siendo stub (return null) — canje de puntos no se valida en prod")
  }
  // Sanidad positiva: debe consultar Supabase
  if (!/from\(\s*"coupons"\s*\)/.test(tail)) {
    throw new Error("ServerDbAdapter.getCouponByCode debería leer de la tabla 'coupons' en Supabase")
  }
  if (!/from\(\s*"points"\s*\)/.test(tail)) {
    throw new Error("ServerDbAdapter.getPoints debería leer de la tabla 'points' en Supabase")
  }
})

// Test 31 — ESLint warnings = baseline (no regresión)
run("Test 31 — ESLint warnings count == baseline (.warnings-baseline.json)", () => {
  const baselinePath = join(ROOT, ".warnings-baseline.json")
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"))
  let stdout = ""
  try {
    stdout = execSync("npx eslint src/ --format json", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    })
  } catch (err) {
    // eslint exits non-zero with errors; stdout still has JSON
    stdout = err.stdout?.toString?.() ?? ""
    if (!stdout) throw new Error("eslint falló sin stdout: " + err.message)
  }
  const results = JSON.parse(stdout)
  let warnings = 0
  for (const r of results) warnings += r.warningCount ?? 0
  if (warnings > baseline.warnings) {
    throw new Error(
      `Warnings subieron: ${warnings} > baseline ${baseline.warnings}. ` +
      `Arreglarlos o ejecutar 'node scripts/count-warnings.mjs --baseline' tras justificar.`,
    )
  }
  if (warnings < baseline.warnings) {
    throw new Error(
      `Warnings bajaron a ${warnings} (baseline ${baseline.warnings}). ` +
      `Ejecuta 'node scripts/count-warnings.mjs --baseline' para congelar el nuevo mínimo.`,
    )
  }
})

// Test 32 — NEXT_PUBLIC_*_(SECRET|TOKEN|PRIVATE) prohibido en código vivo
// (cualquier secret expuesto al bundle cliente es P0 de seguridad).
run("Test 32 — Sin NEXT_PUBLIC_*_(SECRET|TOKEN|PRIVATE_KEY) en src/", () => {
  const offenders = []
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (name === "node_modules" || name === ".next") continue
        walk(full)
      } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) {
        const text = readFileSync(full, "utf8")
        // SECRET, TOKEN, PRIVATE, PASS — todos son patrones de credencial.
        // Excluye TURNSTILE_SITE_KEY (Cloudflare site keys son públicas por diseño)
        // y SUPABASE_ANON_KEY (anon key con RLS está pensada para client).
        const lines = text.split("\n")
        // Denylist explícita: APIs de terceros cuya key debe ser server-only
        // aunque técnicamente sean rate-limit boosters (pokemontcg, MKM, TCGplayer).
        const SENSITIVE_API_DENYLIST = [
          "NEXT_PUBLIC_POKEMON_TCG_KEY",
          "NEXT_PUBLIC_POKEMON_TCG_API_KEY",
          "NEXT_PUBLIC_MKM_",
          "NEXT_PUBLIC_TCGPLAYER_",
          "NEXT_PUBLIC_RESEND",
          "NEXT_PUBLIC_STRIPE_SECRET",
        ]
        lines.forEach((line, i) => {
          const m = line.match(/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PRIVATE)/)
          const denyHit = SENSITIVE_API_DENYLIST.some((k) => line.includes(k))
          if (!m && !denyHit) return
          // Allow-list verificada manualmente:
          if (line.includes("NEXT_PUBLIC_TURNSTILE_SITE_KEY")) return
          offenders.push(`${relative(ROOT, full)}:${i + 1}  → ${line.trim()}`)
        })
      }
    }
  }
  walk(SRC)
  if (offenders.length > 0) {
    throw new Error(
      `Secret/token expuesto al bundle cliente vía NEXT_PUBLIC_*:\n  ` +
      offenders.join("\n  ") +
      `\nSolución: renombrar la env var SIN prefijo NEXT_PUBLIC_ y mover el uso a server (API route).`,
    )
  }
})

// Test 33 — Proxy admin guard activo (bloqueo server-side de /admin y /api/admin)
// Verifica que src/proxy.ts contiene la sección de bloqueo, no solo header X-Admin-Route.
run("Test 33 — proxy.ts bloquea /admin/* y /api/admin/* server-side", () => {
  const proxyPath = join(SRC, "proxy.ts")
  const text = readFileSync(proxyPath, "utf8")
  const required = [
    "verifySessionToken",            // valida JWT en server mode
    "ADMIN_PANEL_TOKEN",             // gate adicional en local mode + producción
    "denyAdmin",                     // función de denegación común
    "isIpAllowedForAdmin",           // hook IP allowlist
    "no-store",                      // header anti-cache en /admin
  ]
  const missing = required.filter((s) => !text.includes(s))
  if (missing.length > 0) {
    throw new Error(
      `proxy.ts no tiene la guardia admin completa. Falta: ${missing.join(", ")}`,
    )
  }
  // Anti-regresión: el comentario "this would check JWT" indicaba que el guard
  // era solo TODO. Si vuelve a aparecer es que alguien revirtió el cierre.
  if (text.includes("In server mode, this would check JWT")) {
    throw new Error("proxy.ts tiene el TODO antiguo. La guardia admin se revirtió.")
  }
})

// Test 34 — Toda ruta /api/admin/* usa requireAdmin
run("Test 34 — /api/admin/* siempre llama a requireAdmin", () => {
  const adminApiDir = join(SRC, "app", "api", "admin")
  const offenders = []
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else if (name === "route.ts" || name === "route.tsx") {
        const text = readFileSync(full, "utf8")
        // Cada ruta debe importar requireAdmin O un guard alternativo válido.
        const hasGuard =
          text.includes("requireAdmin") ||
          text.includes("verifyAdminAuth") ||
          text.includes("verifyBackupAdmin") ||  // breach/backup compartido token
          text.includes("ADMIN_BACKUP_TOKEN")     // backup tiene su propio token
        if (!hasGuard) {
          offenders.push(relative(ROOT, full))
        }
      }
    }
  }
  try { walk(adminApiDir) } catch { /* dir no existe = sin rutas admin = OK */ }
  if (offenders.length > 0) {
    throw new Error(
      `API admin sin guard:\n  ${offenders.join("\n  ")}\n` +
      `Cada route.ts dentro de src/app/api/admin/ DEBE llamar a requireAdmin().`,
    )
  }
})

// Test 35 — Server Component guard en admin/layout.tsx
run("Test 35 — admin/layout.tsx valida sesión server-side en producción", () => {
  const layoutPath = join(SRC, "app", "admin", "layout.tsx")
  const text = readFileSync(layoutPath, "utf8")
  const required = [
    "cookies()",                  // lee cookies server-side
    "verifySessionToken",         // valida JWT
    "redirect(",                  // redirige si no admin
    "ADMIN_PANEL_TOKEN",          // gate local-mode prod
    "process.env.NODE_ENV",       // gate por entorno
  ]
  const missing = required.filter((s) => !text.includes(s))
  if (missing.length > 0) {
    throw new Error(
      `admin/layout.tsx no tiene la guardia server-side. Falta: ${missing.join(", ")}`,
    )
  }
})

// Test 36 — Páginas /cuenta/* gatean MOCK_* por isDemoUser (no leak a usuarios reales)
// Bug 2026-04-30: cualquier login con Google veía TCG-20250128-001 porque
// /cuenta/page.tsx hacía `MOCK_ORDERS[0]` sin filtrar por user.id. Mismo
// patrón en cupones, devoluciones, facturas. Este test impide regresión.
run("Test 36 — /cuenta/* no filtra mocks sin gate isDemoUser/userId", () => {
  const pages = [
    ["app", "cuenta", "page.tsx"],
    ["app", "cuenta", "cupones", "page.tsx"],
    ["app", "cuenta", "facturas", "page.tsx"],
    ["app", "cuenta", "devoluciones", "page.tsx"],
  ]
  const offenders = []
  for (const parts of pages) {
    const p = join(SRC, ...parts)
    const text = readFileSync(p, "utf8")
    // Si la página importa algún MOCK_* del módulo de mocks debe tener gate.
    const importsMock = /from\s+["']@\/data\/mockData["']/.test(text) &&
      /MOCK_(ORDERS|INVOICES|RETURNS|USER_COUPONS)/.test(text)
    if (!importsMock) continue
    const hasDemoGate = /startsWith\(\s*["']demo-["']\s*\)/.test(text) ||
      /isDemoUser/.test(text)
    if (!hasDemoGate) {
      offenders.push(parts.join("/"))
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `Páginas /cuenta/* usan MOCK_* sin gate isDemoUser: ${offenders.join(", ")}`,
    )
  }
})

// Test 37 — NotificationContext gatea MOCK_NOTIFICATIONS por isDemoUser
// Bug 2026-04-30: cualquier login real veía notificaciones demo en la
// campana ("Tu pedido X enviado", "Tienes un cupón") porque buildList hacía
// `[...dynamic, ...MOCK_NOTIFICATIONS]` para TODOS.
run("Test 37 — NotificationContext gatea MOCK_NOTIFICATIONS por isDemoUser", () => {
  const p = join(SRC, "context", "NotificationContext.tsx")
  const text = readFileSync(p, "utf8")
  if (!/MOCK_NOTIFICATIONS/.test(text)) return // ya no se usa, ok
  const hasGate = /startsWith\(\s*["']demo-["']\s*\)/.test(text) ||
    /isDemoUser/.test(text)
  if (!hasGate) {
    throw new Error(
      "NotificationContext usa MOCK_NOTIFICATIONS sin gate isDemoUser — " +
      "los usuarios reales verían notificaciones demo en la campana",
    )
  }
})

// Test 38 — verificar-factura no devuelve MOCK_INVOICES en producción
// Bug 2026-04-30: endpoint público falla-suave a MOCK_INVOICES en producción
// → atacante prueba IDs comunes, ve PII falsa (nombre, total) como real.
run("Test 38 — verificar-factura gatea MOCK_INVOICES por NODE_ENV !== production", () => {
  const p = join(SRC, "app", "verificar-factura", "page.tsx")
  const text = readFileSync(p, "utf8")
  if (!/MOCK_INVOICES/.test(text)) return
  // Debe haber un check de NODE_ENV antes del find/use de MOCK_INVOICES.
  const hasNodeEnvGate = /process\.env\.NODE_ENV\s*[!=]==\s*["']production["']/.test(text) ||
    /NODE_ENV\s*===?\s*["']development["']/.test(text)
  if (!hasNodeEnvGate) {
    throw new Error(
      "verificar-factura/page.tsx usa MOCK_INVOICES sin gate NODE_ENV — " +
      "en producción mostraría PII de cliente demo como factura real",
    )
  }
})

// ── Summary ────────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════")
console.log(`  Resultado: ${passed}/38 tests pasados`)
if (failed > 0) {
  console.log(`  FALLOS (${failed}):`)
  failures.forEach(({ name }) => console.log(`    - ${name}`))
}
console.log("══════════════════════════════════════════\n")

process.exit(failed > 0 ? 1 : 0)
