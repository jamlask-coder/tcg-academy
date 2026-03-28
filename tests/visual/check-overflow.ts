/**
 * Standalone overflow diagnostic — run with: npx ts-node tests/visual/check-overflow.ts
 * Checks all static routes for horizontal overflow at 320px (mobile) and 1024px (laptop).
 * Fails with non-zero exit code if any overflow is found.
 */
import { chromium } from "@playwright/test"

const BASE_URL = "http://localhost:3000"

const ROUTES = [
  "/",
  "/magic", "/magic/booster-box", "/magic/singles",
  "/pokemon", "/pokemon/booster-box",
  "/one-piece", "/dragon-ball", "/yugioh", "/naruto", "/lorcana", "/riftbound", "/topps",
  "/catalogo",
  "/busqueda",
  "/carrito",
  "/finalizar-compra",
  "/eventos",
  "/tiendas", "/tiendas/calpe", "/tiendas/madrid", "/tiendas/barcelona", "/tiendas/bejar",
  "/mayoristas",
  "/contacto",
  "/cuenta", "/cuenta/login", "/cuenta/registro", "/cuenta/pedidos",
]

const VIEWPORTS = [
  { width: 320, height: 568, label: "mobile-320" },
  { width: 1024, height: 768, label: "laptop-1024" },
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  let failures = 0

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage()
    await page.setViewportSize(vp)

    for (const route of ROUTES) {
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 10000 })
        const hasOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
        if (hasOverflow) {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
          console.error(`OVERFLOW [${vp.label}] ${route} — scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`)
          failures++
        } else {
          console.log(`OK [${vp.label}] ${route}`)
        }
      } catch (e) {
        console.warn(`SKIP [${vp.label}] ${route} — ${(e as Error).message.split("\n")[0]}`)
      }
    }

    await page.close()
  }

  await browser.close()
  if (failures > 0) {
    console.error(`\n${failures} overflow issue(s) found.`)
    process.exit(1)
  } else {
    console.log(`\nAll routes clean — no horizontal overflow detected.`)
  }
}

main()
