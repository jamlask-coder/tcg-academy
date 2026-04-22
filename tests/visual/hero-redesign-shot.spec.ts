import { test } from "@playwright/test";

test("hero desktop slide 1", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "tests/visual/out/hero-desktop-slide1.png", clip: { x: 0, y: 0, width: 1400, height: 700 } });
});

test("hero desktop slide 2", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  // Esperar ciclo autoplay 2.8s + fade 0.7s + margen
  await page.waitForTimeout(3800);
  await page.screenshot({ path: "tests/visual/out/hero-desktop-slide2.png", clip: { x: 0, y: 0, width: 1400, height: 700 } });
});

test("hero mobile slide 1", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "tests/visual/out/hero-mobile-slide1.png", clip: { x: 0, y: 0, width: 390, height: 500 } });
});

test("hero mobile slide 2", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3800);
  await page.screenshot({ path: "tests/visual/out/hero-mobile-slide2.png", clip: { x: 0, y: 0, width: 390, height: 500 } });
});
