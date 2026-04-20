import { describe, expect, it } from "vitest";
import { extractClues } from "@/lib/productIdentifier/extract";

describe("productIdentifier/extract", () => {
  it("detecta Magic y booster-box a partir de OCR típico", () => {
    const text = `
      MAGIC: THE GATHERING
      BLOOMBURROW
      PLAY BOOSTER DISPLAY
      36 BOOSTERS · 14 CARDS PER PACK
    `;
    const clues = extractClues(text);
    expect(clues.game).toBe("magic");
    expect(clues.category).toBe("booster-box");
    expect(clues.packsPerBox).toBe(36);
    expect(clues.cardsPerPack).toBe(14);
  });

  it("detecta Pokémon JP cuando hay katakana/hiragana", () => {
    const text = `
      ポケモンカードゲーム
      ブースターパック
      Nihil Zero
    `;
    const clues = extractClues(text);
    expect(clues.game).toBe("pokemon");
    expect(clues.language).toBe("JP");
  });

  it("detecta Yu-Gi-Oh y extrae set code 4 letras", () => {
    const text = `
      YU-GI-OH! TRADING CARD GAME
      LEGACY OF DESTRUCTION
      LEDE
      BOOSTER BOX · 24 PACKS
    `;
    const clues = extractClues(text);
    expect(clues.game).toBe("yugioh");
    expect(clues.setCode).toBe("lede");
    expect(clues.packsPerBox).toBe(24);
  });

  it("detecta Lorcana y categoría starter deck", () => {
    const text = `
      DISNEY LORCANA
      THE FIRST CHAPTER
      STARTER DECK
    `;
    const clues = extractClues(text);
    expect(clues.game).toBe("lorcana");
    expect(clues.category).toBe("starter");
  });

  it("cae a filename si OCR está vacío", () => {
    const clues = extractClues("", ["pokemon-prismatic-evolutions-etb.jpg"]);
    expect(clues.game).toBe("pokemon");
    expect(clues.category).toBe("etb");
  });

  it("devuelve Clues válidas aunque no detecte nada", () => {
    const clues = extractClues("blablabla texto irrelevante 12345");
    expect(clues.game).toBeUndefined();
    expect(clues.category).toBeUndefined();
    expect(clues.keywords).toBeInstanceOf(Array);
  });

  it("extrae fragmentos ordenados por longitud descendente y filtra ruido", () => {
    const text = `
      TM
      ®
      Bloomburrow Play Booster
      MAGIC
      12345
    `;
    const clues = extractClues(text);
    // "Bloomburrow Play Booster" es la línea más larga válida
    expect(clues.nameFragments[0]).toContain("Bloomburrow");
    expect(clues.nameFragments.some((f) => f === "TM")).toBe(false);
    expect(clues.nameFragments.some((f) => f === "12345")).toBe(false);
  });

  it("detecta One Piece por código OP-NN", () => {
    const text = `
      One Piece Card Game
      OP-11
      Booster Box
    `;
    const clues = extractClues(text);
    expect(clues.game).toBe("one-piece");
    expect(clues.setCode).toBe("op-11");
  });

  it("prioriza 'booster box' sobre 'booster pack' (específico antes que genérico)", () => {
    const text = "BOOSTER BOX - 36 BOOSTER PACKS INSIDE";
    const clues = extractClues(text);
    expect(clues.category).toBe("booster-box");
  });

  it("descarta packsPerBox fuera de rango sensato (<3 o >72)", () => {
    const c1 = extractClues("999 boosters");
    expect(c1.packsPerBox).toBeUndefined();
    const c2 = extractClues("1 booster");
    expect(c2.packsPerBox).toBeUndefined();
    const c3 = extractClues("36 booster packs");
    expect(c3.packsPerBox).toBe(36);
  });
});
