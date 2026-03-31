import { test, expect } from "@playwright/test";
import path from "path";

// axe-core browser script path (no external package needed)
const AXE_SCRIPT = path.resolve(
  __dirname,
  "../../node_modules/axe-core/axe.js",
);

const MAIN_ROUTES = [
  "/",
  "/catalogo",
  "/eventos",
  "/tiendas",
  "/contacto",
  "/mayoristas",
  "/carrito",
  "/cuenta/login",
  "/cuenta/registro",
];

for (const route of MAIN_ROUTES) {
  test(`a11y: ${route} has 0 critical violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });

    // Inject axe-core into the page
    await page.addScriptTag({ path: AXE_SCRIPT });

    // Run axe and collect critical + serious violations
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      const axeResults = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        resultTypes: ["violations"],
      });
      return axeResults.violations
        .filter(
          (v: { impact: string }) =>
            v.impact === "critical" || v.impact === "serious",
        )
        .map((v: { id: string; impact: string; description: string; nodes: unknown[] }) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodeCount: v.nodes.length,
        }));
    });

    expect(
      results,
      `Critical/serious a11y violations on ${route}:\n${JSON.stringify(results, null, 2)}`,
    ).toHaveLength(0);
  });
}
