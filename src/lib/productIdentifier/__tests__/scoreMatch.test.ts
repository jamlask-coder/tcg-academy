import { describe, expect, it } from "vitest";
import { scoreMatch } from "@/lib/productIdentifier/catalog";

describe("productIdentifier/catalog/scoreMatch", () => {
  // ─── Filtrado de tokens genéricos ────────────────────────────────────────

  it("ignora tokens genéricos ('etb', 'booster', 'box') en la query", () => {
    // Antes del fix: 2/3 = 0.67 (la 'etb' cuenta como miss).
    // Después del fix: 2/2 = 1.0 (genéricos se filtran).
    const score = scoreMatch("prismatic evolutions etb", "Prismatic Evolutions");
    expect(score).toBe(1);
  });

  it("ignora 'box', 'display', 'caja' en la query", () => {
    expect(scoreMatch("bloomburrow play booster box", "Bloomburrow")).toBe(1);
    expect(scoreMatch("caja sobres bloomburrow", "Bloomburrow")).toBe(1);
  });

  it("también ignora el nombre del juego en la query ('pokemon', 'mtg')", () => {
    expect(scoreMatch("pokemon prismatic evolutions", "Prismatic Evolutions")).toBe(
      1,
    );
    expect(scoreMatch("mtg bloomburrow", "Bloomburrow")).toBe(1);
  });

  it("query sólo de tokens genéricos → score 0 (nada discriminativo)", () => {
    expect(scoreMatch("booster box", "Prismatic Evolutions")).toBe(0);
  });

  // ─── Sinónimos ES → EN ───────────────────────────────────────────────────

  it("enriquece la query con sinónimos ES→EN (Magic)", () => {
    // "fundaciones" → "foundations" vía ES_TO_EN_SYNONYMS.
    const score = scoreMatch("caja fundaciones", "Foundations");
    expect(score).toBeGreaterThan(0);
  });

  it("enriquece la query con sinónimos Lorcana ES→EN", () => {
    // "recuerdos del mar" → "azurite sea"
    const score = scoreMatch("recuerdos del mar etb", "Azurite Sea");
    expect(score).toBeGreaterThan(0);
  });

  // ─── Matching tolerante ──────────────────────────────────────────────────

  it("match parcial: 'strix' matchea 'Strixhaven'", () => {
    const score = scoreMatch("strix", "Strixhaven: School of Mages");
    expect(score).toBe(1);
  });

  it("sin match → 0", () => {
    expect(scoreMatch("xxxxx", "Bloomburrow")).toBe(0);
  });

  it("query vacía → 0", () => {
    expect(scoreMatch("", "Bloomburrow")).toBe(0);
  });

  // ─── Caso real que falló: Pokemon ES ─────────────────────────────────────

  it("query 'prismatic evolutions' matchea perfectamente el set", () => {
    const score = scoreMatch("prismatic evolutions", "Prismatic Evolutions");
    expect(score).toBe(1);
  });

  it("query con mucha paja encuentra el set ('pokemon scarlet violet prismatic evolutions etb español')", () => {
    const score = scoreMatch(
      "pokemon scarlet violet prismatic evolutions etb español",
      "Scarlet & Violet—Prismatic Evolutions",
    );
    // scarlet + violet + prismatic + evolutions = 4 matches sobre
    // {scarlet, violet, prismatic, evolutions, espanol} (tras filtrar 'pokemon', 'etb')
    expect(score).toBeGreaterThanOrEqual(0.7);
  });
});
