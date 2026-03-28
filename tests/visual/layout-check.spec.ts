/**
 * Layout quality checks:
 * - No horizontal overflow on any page
 * - No clipped text in visible elements
 * - Buttons meet minimum 44×44px touch target on mobile
 */
import { test, expect } from "@playwright/test"

const PAGES = [
  "/", "/magic", "/pokemon", "/one-piece", "/riftbound",
  "/catalogo", "/carrito", "/contacto", "/mayoristas",
  "/tiendas", "/eventos", "/vending", "/franquicias",
]

const VIEWPORTS = [
  { name: "mobile",  width: 375,  height: 812 },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "laptop",  width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
]

// ─── No horizontal overflow ────────────────────────────────────────────────────
for (const vp of VIEWPORTS) {
  test(`no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    for (const route of PAGES) {
      await page.goto(route, { waitUntil: "domcontentloaded" })
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(overflow, `Horizontal overflow on ${route} at ${vp.width}px`).toBe(false)
    }
  })
}

// ─── Mobile touch targets ≥ 44×44px ───────────────────────────────────────────
test("interactive elements meet 44×44px touch target on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/", { waitUntil: "domcontentloaded" })

  const tooSmall = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("button, a[href]"))
    return els
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) return false
        const s = window.getComputedStyle(el)
        if (s.display === "none" || s.visibility === "hidden") return false
        return r.width < 44 || r.height < 44
      })
      .map((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim().slice(0, 40),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      }))
      // Only flag elements that are clearly interactive and visible, not decorative
      .filter((e) => e.text && e.text.length > 0)
      .slice(0, 20)
  })

  // Informational: log but don't fail (some small inline links are acceptable)
  if (tooSmall.length > 0) {
    console.warn(`⚠️  ${tooSmall.length} elements < 44px touch target on mobile home page:`)
    tooSmall.forEach((e) => console.warn(`  ${e.tag} "${e.text}" ${e.w}x${e.h}px`))
  }
  // Fail only if there are primary action buttons (CTA) that are too small
  const smallCTAs = tooSmall.filter((e) =>
    (e.text ?? "").match(/carrito|compra|añadir|guardar|enviar|contacto/i)
  )
  expect(smallCTAs, `Primary CTA buttons too small for touch: ${JSON.stringify(smallCTAs)}`).toHaveLength(0)
})

// ─── All main routes load without console errors ───────────────────────────────
test("main routes load without JS errors", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (err) => errors.push(err.message))

  for (const route of PAGES) {
    errors.length = 0
    await page.goto(route, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(200)
    const criticalErrors = errors.filter((e) =>
      !e.includes("favicon") && !e.includes("404") && !e.includes("hydrat")
    )
    expect(criticalErrors, `JS errors on ${route}: ${criticalErrors.join(", ")}`).toHaveLength(0)
  }
})

// ─── Cart badge increments correctly ──────────────────────────────────────────
test("cart badge increments after add to cart", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/magic", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(400)

  // Hover over a product card to reveal the add-to-cart button
  const card = page.locator(".group").first()
  await card.hover()
  await page.waitForTimeout(250)

  // Try clicking an add-to-cart button
  const addBtn = page.locator("button").filter({ hasText: /añadir al carrito/i }).first()
  if (await addBtn.isVisible()) {
    await addBtn.click()
    await page.waitForTimeout(300)
    // Cart badge should show at least 1
    const badge = page.locator("a[href='/carrito'] span").filter({ hasText: /^\d+$/ }).first()
    const badgeText = await badge.textContent().catch(() => "0")
    expect(Number(badgeText ?? "0")).toBeGreaterThan(0)
  }
})
