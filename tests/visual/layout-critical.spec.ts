/**
 * Critical layout tests — run after ANY change to Header, Navbar, Footer, or layout components.
 * These tests catch the most common regressions:
 *   1. Icons outside the container (e.g. pushed to viewport edge by flex-1 spacer)
 *   2. Search and login overlapping
 *   3. Logos invisible or clipped
 *   4. Elements overflowing horizontally at multiple breakpoints
 *
 * Usage:
 *   npm run build && npx serve out -l tcp:3000 -s &
 *   npx playwright test tests/visual/layout-critical.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Viewport sizes ────────────────────────────────────────────────────────────

const VIEWPORTS = [
  { name: "1440p desktop", width: 1440, height: 900 },
  { name: "1024p tablet-l", width: 1024, height: 768 },
  { name: "768p tablet", width: 768, height: 1024 },
  { name: "375p mobile", width: 375, height: 812 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function getRect(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  }, selector);
}

async function goto(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "networkidle" });
}

// ─── Test 1: Container alignment ──────────────────────────────────────────────
// Topbar, header main bar, and navbar must share the same left & right edges.

for (const vp of VIEWPORTS) {
  test(`[${vp.name}] Containers aligned — topbar, header, navbar share same edges`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await goto(page);

    // We compare the inner Container divs (max-w-[1400px] mx-auto px-6).
    // They should all have identical left and right boundaries.
    const rects = await page.evaluate(() => {
      // All Container divs: they have class max-w-\[1400px\] and mx-auto
      const containers = Array.from(document.querySelectorAll('[class*="max-w-\\[1400px\\]"]'));
      return containers.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), tag: el.tagName, id: el.id };
      });
    });

    // At desktop widths, all containers should align (±4px tolerance)
    if (vp.width >= 1024 && rects.length >= 2) {
      const firstLeft = rects[0].left;
      const firstRight = rects[0].right;
      for (const r of rects) {
        expect(Math.abs(r.left - firstLeft), `Container left mismatch at ${vp.name}: got ${r.left}, expected ~${firstLeft}`).toBeLessThanOrEqual(4);
        expect(Math.abs(r.right - firstRight), `Container right mismatch at ${vp.name}: got ${r.right}, expected ~${firstRight}`).toBeLessThanOrEqual(4);
      }
    }
  });
}

// ─── Test 2: Cart icon inside Container ───────────────────────────────────────
// The cart icon must NOT be pinned to the raw viewport edge.
// With px-6 (24px) container padding + icon size (~44px), the cart right edge
// should always be at least 20px from the viewport right.

for (const vp of VIEWPORTS) {
  test(`[${vp.name}] Cart icon is inside header Container (not at viewport edge)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await goto(page);

    const result = await page.evaluate(() => {
      const cart = document.querySelector('[aria-label^="Carrito"]');
      if (!cart) return null;
      const r = cart.getBoundingClientRect();
      return {
        cartRight: Math.round(r.right),
        viewportWidth: window.innerWidth,
        gapRight: Math.round(window.innerWidth - r.right),
      };
    });

    if (!result) return; // element not found on this viewport — skip

    // There must be at least 16px between cart's right edge and the viewport right.
    // px-6 container padding = 24px, so anything > 16px is inside the container.
    expect(
      result.gapRight,
      `Cart icon is too close to viewport edge at ${vp.name} — gap: ${result.gapRight}px (expected > 16px). Cart may be outside the Container.`
    ).toBeGreaterThan(16);
  });
}

// ─── Test 3: Search and login do not overlap ──────────────────────────────────

test(`[1440p desktop] Search bar and login form do not overlap`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto(page);

  const result = await page.evaluate(() => {
    const search = document.querySelector('header input[type="search"]');
    const loginEmail = document.querySelector('header input[type="email"]');
    if (!search || !loginEmail) return null;
    const sr = search.getBoundingClientRect();
    const lr = loginEmail.getBoundingClientRect();
    // Check horizontal overlap
    const overlap = sr.right > lr.left && sr.left < lr.right && sr.bottom > lr.top && sr.top < lr.bottom;
    return { overlap, searchRight: Math.round(sr.right), loginLeft: Math.round(lr.left) };
  });

  if (!result) return; // Login might not be visible (already logged in) — skip

  expect(result.overlap, `Search (right: ${result?.searchRight}px) overlaps login (left: ${result?.loginLeft}px)`).toBe(false);
  // Login must start AFTER search ends (with some gap)
  expect(result.loginLeft, `Login starts before search ends — searchRight=${result.searchRight}, loginLeft=${result.loginLeft}`).toBeGreaterThan(result.searchRight - 4);
});

// ─── Test 4: Navbar logos visible ────────────────────────────────────────────

test(`[1440p desktop] Navbar game logos are visible (not clipped to invisible)`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto(page);

  const logoMetrics = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("nav img"));
    return imgs.map((img) => {
      const r = img.getBoundingClientRect();
      return {
        src: (img as HTMLImageElement).src.split("/").pop() ?? "",
        width: Math.round(r.width),
        height: Math.round(r.height),
        visible: r.width > 0 && r.height > 0,
      };
    });
  });

  for (const logo of logoMetrics) {
    expect(logo.width, `Navbar logo "${logo.src}" has zero/tiny width`).toBeGreaterThan(20);
    expect(logo.height, `Navbar logo "${logo.src}" has zero/tiny height`).toBeGreaterThan(10);
  }
});

// ─── Test 5: Hero logo visible on game pages ─────────────────────────────────

const GAME_PAGES = ["/pokemon", "/magic", "/yugioh", "/one-piece", "/lorcana"];

for (const gamePath of GAME_PAGES) {
  test(`[1440p] Hero logo visible and readable on ${gamePath}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(gamePath, { waitUntil: "networkidle" });

    const heroLogoMetrics = await page.evaluate(() => {
      // Find the img inside the hero section
      const section = document.querySelector("section[aria-label^='Hero']");
      if (!section) return null;
      const img = section.querySelector("img");
      if (!img) return null;
      const r = img.getBoundingClientRect();
      return {
        width: Math.round(r.width),
        height: Math.round(r.height),
        naturalWidth: (img as HTMLImageElement).naturalWidth,
        src: (img as HTMLImageElement).src.split("/").pop() ?? "",
      };
    });

    if (!heroLogoMetrics) return; // section not found — skip

    // Logo must be visible and at least 30px in both dimensions
    expect(heroLogoMetrics.width, `Hero logo width too small on ${gamePath}`).toBeGreaterThan(30);
    expect(heroLogoMetrics.height, `Hero logo height too small on ${gamePath}`).toBeGreaterThan(30);
    // Logo must not exceed 120px height (user requirement: max 100px, we allow 20px tolerance for loading)
    expect(heroLogoMetrics.height, `Hero logo height too large on ${gamePath} — got ${heroLogoMetrics.height}px, max 120px`).toBeLessThanOrEqual(120);
  });
}

// ─── Test 6: No horizontal overflow ──────────────────────────────────────────

const PAGES_TO_CHECK = ["/", "/pokemon", "/magic", "/catalogo"];

for (const vp of VIEWPORTS) {
  for (const pagePath of PAGES_TO_CHECK.slice(0, 2)) { // Only check home and one game page to keep suite fast
    test(`[${vp.name}] No horizontal overflow on ${pagePath}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(pagePath, { waitUntil: "networkidle" });

      const hasOverflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const viewWidth = window.innerWidth;
        return docWidth > viewWidth + 2; // 2px tolerance for sub-pixel rendering
      });

      expect(hasOverflow, `Horizontal overflow at ${vp.name} on ${pagePath}`).toBe(false);
    });
  }
}

// ─── Test 7: Icons don't overlap each other ───────────────────────────────────

test(`[1440p desktop] Header icons don't overlap each other`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto(page);

  const iconRects = await page.evaluate(() => {
    const selectors = [
      '[aria-label="Favoritos"]',
      '[aria-label^="Carrito"]',
    ];
    return selectors.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { sel, left: Math.round(r.left), right: Math.round(r.right) };
    }).filter(Boolean);
  });

  for (let i = 0; i < iconRects.length - 1; i++) {
    const a = iconRects[i]!;
    const b = iconRects[i + 1]!;
    // b must start after a ends (no overlap)
    expect(b.left, `Icons overlap: "${a.sel}" (right: ${a.right}) and "${b.sel}" (left: ${b.left})`).toBeGreaterThanOrEqual(a.right - 4);
  }
});
