import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "@/data/products";
import { isGameSupported, resolveHighlights } from "@/lib/setHighlights";
import {
  MAGIC_SET_MAP,
  POKEMON_SET_MAP,
} from "@/lib/setHighlights/setMaps";
import type { LocalProduct } from "@/data/products";

function makeProduct(overrides: Partial<LocalProduct>): LocalProduct {
  return {
    id: 1,
    name: "",
    slug: "",
    description: "",
    game: "pokemon",
    category: "booster-box",
    price: 0,
    images: [],
    inStock: true,
    stock: 0,
    language: "EN",
    ...overrides,
  } as LocalProduct;
}

describe("setHighlights — arquitectura", () => {
  it("todos los juegos de GAME_CONFIG responden a isGameSupported", () => {
    const unknown: string[] = [];
    for (const game of Object.keys(GAME_CONFIG)) {
      try {
        // Debe devolver bool sin lanzar
        const supported = isGameSupported(game);
        expect(typeof supported).toBe("boolean");
      } catch (e) {
        unknown.push(`${game}: ${String(e)}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("cromos (topps, panini, cyberpunk) NO están soportados", () => {
    expect(isGameSupported("topps")).toBe(false);
    expect(isGameSupported("panini")).toBe(false);
    expect(isGameSupported("cyberpunk")).toBe(false);
  });

  it("TCGs principales SÍ están soportados", () => {
    const supportedGames = [
      "magic",
      "pokemon",
      "yugioh",
      "one-piece",
      "dragon-ball",
      "lorcana",
      "riftbound",
      "digimon",
      "naruto",
    ];
    for (const g of supportedGames) {
      expect(isGameSupported(g), `juego ${g} debería estar soportado`).toBe(
        true,
      );
    }
  });

  it("juego desconocido cae en noop y devuelve resultado vacío", async () => {
    const p = makeProduct({ game: "foo-bar-xyz" });
    const r = await resolveHighlights(p);
    expect(r.cards).toEqual([]);
    expect(r.provenance).toBe("none");
  });
});

describe("setHighlights — hardcoded maps", () => {
  it("MAGIC_SET_MAP tiene entradas únicas y códigos de 3-4 letras", () => {
    const codes = new Set<string>();
    for (const [re, code] of MAGIC_SET_MAP) {
      expect(re).toBeInstanceOf(RegExp);
      expect(code).toMatch(/^[a-z0-9]{3,4}$/);
      codes.add(code);
    }
    // Al menos 20 sets mapeados (documenta crecimiento)
    expect(MAGIC_SET_MAP.length).toBeGreaterThanOrEqual(20);
  });

  it("POKEMON_SET_MAP tiene entradas únicas y códigos tipo sv1/swsh", () => {
    for (const [re, code] of POKEMON_SET_MAP) {
      expect(re).toBeInstanceOf(RegExp);
      // sv1, sv10, sv8pt5, swsh12pt5, etc.
      expect(code).toMatch(/^[a-z]{2,6}\d{1,3}(pt\d)?$/);
    }
    expect(POKEMON_SET_MAP.length).toBeGreaterThanOrEqual(15);
  });

  it("MAGIC_SET_MAP resuelve 'Bloomburrow' → blb sin red", async () => {
    const p = makeProduct({
      game: "magic",
      name: "Bloomburrow Play Booster Box",
    });
    const r = await resolveHighlights(p);
    expect(r.resolved?.setId).toBe("blb");
    expect(r.resolved?.provenance).toBe("hardcoded-map");
    expect(r.strategyTried[0]).toBe("hardcoded-map");
  });

  it("POKEMON_SET_MAP resuelve 'Prismatic Evolutions' → sv8pt5 sin red", async () => {
    const p = makeProduct({
      game: "pokemon",
      name: "Pokémon Prismatic Evolutions ETB",
    });
    const r = await resolveHighlights(p);
    expect(r.resolved?.setId).toBe("sv8pt5");
    expect(r.resolved?.provenance).toBe("hardcoded-map");
  });
});
