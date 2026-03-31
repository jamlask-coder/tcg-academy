/**
 * Alignment checks — all containers are max-w-[1400px] mx-auto px-6
 *
 * Verifies that the left edge of the first visible content element in:
 *   topbar  /  header logo  /  first navbar game  /  page content h1|h2
 * are all within ±2px of the same X position.
 *
 * Also checks: no horizontal scroll on any tested viewport.
 *
 * Requires a running server on port 3000.
 */
import { test, expect } from "@playwright/test";

const TOLERANCE = 2; // px

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1024", width: 1024, height: 768 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Alignment at ${vp.name} (${vp.width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });
    });

    test("topbar, header logo and navbar first game share the same left margin", async ({ page }) => {
      // Topbar first text span (only visible on lg+)
      const topbarSpan = page.locator("header > div:first-child span").first();
      const topbarVisible = await topbarSpan.isVisible();

      // Header logo link
      const logoLink = page.locator("header a[href='/']").first();
      const logoBox = await logoLink.boundingBox();
      expect(logoBox, "Logo must be visible").not.toBeNull();
      const logoLeft = logoBox!.x;

      // Navbar first game link (inside nav.border-b)
      const navFirstLink = page.locator("nav.border-b a").first();
      const navVisible = await navFirstLink.isVisible();
      if (navVisible) {
        const navBox = await navFirstLink.boundingBox();
        expect(navBox, "First nav game must have bounding box").not.toBeNull();
        const diff = Math.abs(logoLeft - navBox!.x);
        expect(diff, `Logo left (${logoLeft.toFixed(1)}) vs nav game left (${navBox!.x.toFixed(1)}): diff ${diff.toFixed(1)}px`).toBeLessThanOrEqual(TOLERANCE);
      }

      if (topbarVisible) {
        const topbarBox = await topbarSpan.boundingBox();
        expect(topbarBox, "Topbar span must have bounding box").not.toBeNull();
        const diff = Math.abs(logoLeft - topbarBox!.x);
        expect(diff, `Logo left (${logoLeft.toFixed(1)}) vs topbar left (${topbarBox!.x.toFixed(1)}): diff ${diff.toFixed(1)}px`).toBeLessThanOrEqual(TOLERANCE);
      }
    });

    test("cart right edge aligns with last navbar element right edge", async ({ page }) => {
      const cartLink = page.locator("header a[aria-label*='Carrito']");
      const cartBox = await cartLink.boundingBox();
      expect(cartBox, "Cart must be visible").not.toBeNull();
      const cartRight = cartBox!.x + cartBox!.width;

      // Last element in the navbar (Profesionales button or Tiendas link)
      const navLastEl = page.locator("nav.border-b > div > div > div, nav.border-b > div > div > a").last();
      const navVisible = await navLastEl.isVisible().catch(() => false);
      if (!navVisible) return;

      const navLastBox = await navLastEl.boundingBox();
      expect(navLastBox).not.toBeNull();
      const navRight = navLastBox!.x + navLastBox!.width;

      const diff = Math.abs(cartRight - navRight);
      expect(diff, `Cart right (${cartRight.toFixed(1)}) vs nav last right (${navRight.toFixed(1)}): diff ${diff.toFixed(1)}px`).toBeLessThanOrEqual(TOLERANCE);
    });

    test("page content h2 left edge aligns with logo left edge", async ({ page }) => {
      const logoLink = page.locator("header a[href='/']").first();
      const logoBox = await logoLink.boundingBox();
      expect(logoBox).not.toBeNull();
      const logoLeft = logoBox!.x;

      // First h2 in page main content
      const mainH2 = page.locator("main h2, section h2").first();
      const h2Visible = await mainH2.isVisible().catch(() => false);
      if (!h2Visible) return;

      const h2Box = await mainH2.boundingBox();
      expect(h2Box).not.toBeNull();
      const diff = Math.abs(logoLeft - h2Box!.x);
      expect(diff, `Logo left (${logoLeft.toFixed(1)}) vs h2 left (${h2Box!.x.toFixed(1)}): diff ${diff.toFixed(1)}px`).toBeLessThanOrEqual(TOLERANCE);
    });

    test("no horizontal overflow", async ({ page }) => {
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      );
      expect(hasOverflow, "Page must not have horizontal scroll").toBe(false);
    });
  });
}
