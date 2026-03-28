/**
 * Sticky-element overlap detection tests.
 *
 * Strategy: for each interactive element (button, a, input, select) that
 * appears in the viewport, check whether elementFromPoint() at its centre
 * returns the element itself (or a descendant). If another element is on top,
 * the interactive element is "covered" and we report it.
 *
 * We test at multiple scroll positions and viewports so we catch the
 * common case where a sticky header covers content only after scroll.
 */
import { test, expect } from "@playwright/test"

const VIEWPORTS = [
  { name: "mobile",  width: 375,  height: 812 },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "laptop",  width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
]

// Pages with sticky category filter bars that historically caused overlap
const GAME_PAGES = ["/magic", "/pokemon", "/one-piece", "/riftbound"]
const CATEGORY_PAGES = ["/magic/booster-box", "/pokemon/booster-box"]
const ALL_PAGES = [...GAME_PAGES, ...CATEGORY_PAGES, "/", "/catalogo", "/carrito"]

// Returns a list of covered interactive elements at the current scroll position
async function findCoveredElements(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const INTERACTIVE_SELECTORS = "button, a[href], input, select, textarea, [role='button'], [tabindex]"
    const elements = Array.from(document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTORS))
    const vw = window.innerWidth
    const vh = window.innerHeight
    const covered: Array<{ tag: string; text: string; rect: string; coveredBy: string }> = []

    for (const el of elements) {
      const rect = el.getBoundingClientRect()
      // Skip elements not in viewport
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) continue
      // Skip zero-size elements
      if (rect.width < 1 || rect.height < 1) continue
      // Skip invisible elements
      const style = window.getComputedStyle(el)
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue

      const cx = Math.round(rect.left + rect.width / 2)
      const cy = Math.round(rect.top + rect.height / 2)
      // Clamp to viewport
      if (cx < 0 || cx >= vw || cy < 0 || cy >= vh) continue

      const topEl = document.elementFromPoint(cx, cy)
      if (!topEl) continue
      // If the top element IS the el or a descendant, it's fine
      if (topEl === el || el.contains(topEl)) continue

      // Check if the covering element is a known sticky/fixed overlay
      const coverStyle = window.getComputedStyle(topEl as HTMLElement)
      const position = coverStyle.position
      if (position === "sticky" || position === "fixed") {
        covered.push({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 60) ?? "",
          rect: `top:${Math.round(rect.top)} left:${Math.round(rect.left)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          coveredBy: `${(topEl as HTMLElement).tagName.toLowerCase()}.${(topEl as HTMLElement).className.slice(0, 80)} [${position}]`,
        })
      }
    }
    return covered
  })
}

for (const vp of VIEWPORTS) {
  for (const route of ALL_PAGES) {
    test(`no sticky overlap on ${route} at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(route, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(300) // let animations settle

      // Test at top of page
      const topCovered = await findCoveredElements(page)
      expect(topCovered, `Covered elements at top of ${route} [${vp.name}]: ${JSON.stringify(topCovered, null, 2)}`).toHaveLength(0)

      // Scroll halfway down and recheck
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5))
      await page.waitForTimeout(150)
      const midCovered = await findCoveredElements(page)
      expect(midCovered, `Covered elements after scroll on ${route} [${vp.name}]: ${JSON.stringify(midCovered, null, 2)}`).toHaveLength(0)
    })
  }
}

// Specific test: category filter buttons are clickable after scroll
test("category filter buttons are clickable after scroll on game page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/magic", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(300)

  // Scroll past the hero to where category nav sticks
  await page.evaluate(() => window.scrollBy(0, 500))
  await page.waitForTimeout(200)

  // The "Todo" filter button should be visible and clickable
  const todoBtn = page.locator("text=Todo").first()
  await expect(todoBtn).toBeVisible()

  // Get bounding box and verify no element covers it
  const box = await todoBtn.boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    const coveredBy = await page.evaluate(({ cx, cy }) => {
      const el = document.elementFromPoint(cx, cy)
      return el ? el.tagName + "." + (el as HTMLElement).className.slice(0, 60) : "null"
    }, { cx: box.x + box.width / 2, cy: box.y + box.height / 2 })

    // The element at the filter button's centre should be the button or its child
    const isButton = coveredBy.toLowerCase().includes("a") ||
                     coveredBy.toLowerCase().includes("button") ||
                     coveredBy.toLowerCase().includes("span")
    expect(isButton, `"Todo" filter covered by: ${coveredBy}`).toBe(true)
  }
})
