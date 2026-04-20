import { resolveHighlights } from "../src/lib/setHighlights/index";

const tmntProduct = {
  id: 3123,
  name: "Caja de Sobres de Juego — Tortugas Ninja",
  description: "Caja de sobres de juego de Teenage Mutant Ninja Turtles en inglés. El crossover entre Magic y las Tortugas Ninja. 36 sobres Play Booster.",
  category: "booster-box",
  game: "magic",
  language: "EN",
  tags: ["tmnt", "tortugas-ninja", "booster-box"],
  images: [],
  inStock: true,
  stock: 21,
  price: 148.95,
  slug: "x",
};

(async () => {
  const r = await resolveHighlights(tmntProduct as any, "EN");
  console.log("cards:", r.cards.length);
  console.log("provenance:", r.provenance);
  console.log("resolved:", r.resolved);
  console.log("strategyTried:", r.strategyTried);
  console.log("errors:", r.errors);
  if (r.cards[0]) console.log("first:", r.cards[0].name, "=>", r.cards[0].imageUrl);
})();
