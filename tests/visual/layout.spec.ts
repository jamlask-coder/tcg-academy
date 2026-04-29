import { test, expect } from "@playwright/test"

const VIEWPORTS = [
  { name: "mobile-sm", width: 320, height: 568 },
  { name: "tablet",    width: 768, height: 1024 },
  { name: "laptop",    width: 1024, height: 768 },
  { name: "desktop",   width: 1440, height: 900 },
]

const MAIN_ROUTES = [
  "/",
  "/magic",
  "/pokemon",
  "/carrito",
  "/eventos",
  "/tiendas",
  "/mayoristas",
  "/contacto",
]

// ─── No horizontal overflow at any viewport ────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto("/", { waitUntil: "networkidle" })
    const result = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth
      const hasOverflow = document.documentElement.scrollWidth > docWidth
      if (!hasOverflow) return { overflow: false, elements: [] }
      const elements: string[] = []
      for (const el of Array.from(document.querySelectorAll("*"))) {
        const rect = el.getBoundingClientRect()
        if (rect.right > docWidth + 2 && rect.width > 1) {
          elements.push(`<${el.tagName} right=${Math.round(rect.right)} w=${Math.round(rect.width)}: "${el.textContent?.trim().slice(0, 40) || ""}"`)
        }
      }
      return { overflow: true, elements: [...new Set(elements)].slice(0, 5) }
    })
    expect(result.overflow, `Horizontal overflow at ${vp.width}px: ${result.elements.join(" | ")}`).toBe(false)
  })
}

// ─── All main routes load without console errors ───────────────────────────────

for (const route of MAIN_ROUTES) {
  test(`${route} loads without errors`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })
    await page.goto(route, { waitUntil: "networkidle" })
    expect(errors, `Console errors on ${route}: ${errors.join(", ")}`).toHaveLength(0)
  })
}

// ─── Navbar logos are fully visible (not clipped) ─────────────────────────────
//
// En `/` la Navbar está oculta a propósito (el hero de home ya muestra la
// navegación por juegos). Vamos a una página interna para que la Navbar
// renderice y podamos auditar sus logos.

test("navbar logos are visible and not clipped at 1024px", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto("/magic")
  await page.waitForSelector("nav img")

  const logos = await page.$$("nav img")
  for (const logo of logos) {
    const box = await logo.boundingBox()
    const vp = page.viewportSize()!
    expect(box).not.toBeNull()
    if (!box) continue
    // Logo must be fully within viewport horizontally
    expect(box.x, "Logo starts off-screen left").toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, "Logo extends off-screen right").toBeLessThanOrEqual(vp.width + 1)
    // Logo must have a reasonable rendered size (not collapsed)
    expect(box.height, "Logo has zero height").toBeGreaterThan(0)
  }
})

// ─── Mega-menu: no vertical jump when switching between games ─────────────────

test("mega-menu stays at fixed Y position when switching games", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  // El hero de `/` tiene su propio sistema de navegación; la Navbar
  // (donde vive el mega-menú) sólo aparece fuera de home.
  await page.goto("/magic")
  await page.waitForSelector("nav a[href='/magic']")

  // Hover first game logo
  const firstLogo = page.locator("nav a[href='/magic']").first()
  await firstLogo.hover()
  await page.waitForTimeout(200)

  // Capture menu Y position
  const menuBefore = await page.locator("[data-testid='mega-menu']").first().boundingBox()
  expect(menuBefore).not.toBeNull()

  // Move to second game logo without leaving the nav.
  // OJO: el mega-menú sólo se abre para los juegos en
  // COLLECTION_PRIMARY_SLUGS (magic, one-piece, riftbound). Pokemon
  // no tiene mega-menú, así que probamos contra `one-piece`.
  const secondLogo = page.locator("nav a[href='/one-piece']").first()
  await secondLogo.hover()
  await page.waitForTimeout(250) // wait for content fade

  const menuAfter = await page.locator("[data-testid='mega-menu']").first().boundingBox()
  expect(menuAfter).not.toBeNull()

  if (menuBefore && menuAfter) {
    // Y position must not change (allow 2px tolerance for subpixel rendering)
    expect(
      Math.abs(menuAfter.y - menuBefore.y),
      `Mega-menu jumped ${Math.abs(menuAfter.y - menuBefore.y)}px vertically`
    ).toBeLessThan(3)
  }
})

// ─── Cart: page loads and shows cart icon ─────────────────────────────────────

test("cart page loads and shows empty state", async ({ page }) => {
  await page.goto("/carrito", { waitUntil: "load" })
  // Cart page should load without redirect
  expect(page.url()).toContain("/carrito")
  // Should show some content (empty cart message or items)
  const body = await page.textContent("body")
  expect(body).toBeTruthy()
})

// ─── ProductCard responsive layout ────────────────────────────────────────────

test("ProductCards render without overflow at mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/magic/booster-box")
  await page.waitForSelector("[data-testid='product-card'], .group.bg-white")

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  expect(overflow, "Horizontal overflow on product listing mobile").toBe(false)
})
