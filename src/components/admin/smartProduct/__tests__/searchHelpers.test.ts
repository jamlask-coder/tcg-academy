import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock mínimo de window.localStorage para que los tests de persistencia
// funcionen sin jsdom/happy-dom (nuestro vitest corre en env node).
function installLocalStorageMock() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal("window", { localStorage: ls });
  return ls;
}
import type { ProductCandidate } from "@/lib/productIdentifier";
import {
  buildHighlightSegments,
  countByGame,
  countBySource,
  filterAndSort,
  HISTORY_MAX,
  pushHistory,
} from "../searchHelpers";

function makeCandidate(partial: Partial<ProductCandidate>): ProductCandidate {
  return {
    id: partial.id ?? "x",
    game: partial.game ?? "magic",
    setId: partial.setId ?? "x",
    setName: partial.setName ?? "X",
    images: partial.images ?? [],
    suggestedImages: partial.suggestedImages ?? [],
    sources: partial.sources ?? ["scryfall"],
    score: partial.score ?? 0.5,
    releasedAt: partial.releasedAt,
    cardCount: partial.cardCount,
    note: partial.note,
    categoryGuess: partial.categoryGuess,
  };
}

describe("searchHelpers — pushHistory", () => {
  it("añade nueva query al principio", () => {
    const next = pushHistory(["foo", "bar"], "baz");
    expect(next).toEqual(["baz", "foo", "bar"]);
  });

  it("ignora queries demasiado cortas (< 2 chars)", () => {
    expect(pushHistory(["foo"], "")).toEqual(["foo"]);
    expect(pushHistory(["foo"], "x")).toEqual(["foo"]);
  });

  it("dedupe case-insensitive, conserva última forma escrita", () => {
    const next = pushHistory(["bloomburrow"], "Bloomburrow");
    expect(next).toEqual(["Bloomburrow"]);
  });

  it("capea a HISTORY_MAX", () => {
    const many = Array.from({ length: HISTORY_MAX + 3 }, (_, i) => `q${i}`);
    const next = pushHistory(many, "new");
    expect(next).toHaveLength(HISTORY_MAX);
    expect(next[0]).toBe("new");
  });

  it("trimea espacios", () => {
    const next = pushHistory([], "  foo  ");
    expect(next).toEqual(["foo"]);
  });
});

describe("searchHelpers — buildHighlightSegments", () => {
  it("marca tokens exactos de la query", () => {
    const segs = buildHighlightSegments("Prismatic Evolutions", "prismatic");
    const matchedText = segs
      .filter((s) => s.matched)
      .map((s) => s.text)
      .join("");
    expect(matchedText.toLowerCase()).toBe("prismatic");
  });

  it("preserva separadores no-palabra", () => {
    const segs = buildHighlightSegments("A & B", "a");
    const rebuilt = segs.map((s) => s.text).join("");
    expect(rebuilt).toBe("A & B");
  });

  it("aplica sinónimos ES→EN (fundaciones → foundations)", () => {
    const segs = buildHighlightSegments("Foundations Booster Box", "fundaciones");
    const matched = segs.filter((s) => s.matched).map((s) => s.text);
    expect(matched).toContain("Foundations");
  });

  it("query vacía deja el texto sin marcas", () => {
    const segs = buildHighlightSegments("Bloomburrow", "");
    expect(segs.every((s) => !s.matched)).toBe(true);
  });

  it("no matchea tokens muy cortos (< 2)", () => {
    const segs = buildHighlightSegments("A B C", "a");
    expect(segs.every((s) => !s.matched)).toBe(true);
  });
});

describe("searchHelpers — filterAndSort", () => {
  const cs: ProductCandidate[] = [
    makeCandidate({
      id: "a",
      game: "magic",
      score: 0.9,
      releasedAt: "2024-01-01",
      cardCount: 100,
    }),
    makeCandidate({
      id: "b",
      game: "pokemon",
      score: 0.7,
      releasedAt: "2025-06-01",
      cardCount: 200,
    }),
    makeCandidate({
      id: "c",
      game: "pokemon",
      score: 0.8,
      releasedAt: "2023-01-01",
      cardCount: 50,
    }),
  ];

  it("filtra por juego", () => {
    const out = filterAndSort(cs, { gameFilter: "pokemon", sortBy: "score" });
    expect(out.map((x) => x.id)).toEqual(["c", "b"]);
  });

  it("ordena por score (default)", () => {
    const out = filterAndSort(cs, { gameFilter: null, sortBy: "score" });
    expect(out[0].id).toBe("a");
  });

  it("ordena por más reciente", () => {
    const out = filterAndSort(cs, { gameFilter: null, sortBy: "recent" });
    expect(out[0].id).toBe("b");
    expect(out[out.length - 1].id).toBe("c");
  });

  it("ordena por más cartas", () => {
    const out = filterAndSort(cs, { gameFilter: null, sortBy: "cards" });
    expect(out[0].id).toBe("b");
  });
});

describe("searchHelpers — countByGame / countBySource", () => {
  const cs: ProductCandidate[] = [
    makeCandidate({ id: "a", game: "magic", sources: ["scryfall"] }),
    makeCandidate({ id: "b", game: "pokemon", sources: ["pokemontcg", "tcgdex"] }),
    makeCandidate({ id: "c", game: "pokemon", sources: ["tcgcsv", "tcgdex"] }),
  ];

  it("cuenta por juego", () => {
    expect(countByGame(cs)).toEqual({ magic: 1, pokemon: 2 });
  });

  it("cuenta por fuente (multi-fuente por candidato)", () => {
    expect(countBySource(cs)).toEqual({
      scryfall: 1,
      pokemontcg: 1,
      tcgdex: 2,
      tcgcsv: 1,
    });
  });
});

describe("searchHelpers — history localStorage integration", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("persiste y recupera", async () => {
    const { loadHistory, saveHistory } = await import("../searchHelpers");
    saveHistory(["foo", "bar"]);
    expect(loadHistory()).toEqual(["foo", "bar"]);
  });

  it("tolera JSON corrupto", async () => {
    const { loadHistory, HISTORY_KEY } = await import("../searchHelpers");
    window.localStorage.setItem(HISTORY_KEY, "{not json");
    expect(loadHistory()).toEqual([]);
  });
});
