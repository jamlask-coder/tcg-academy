// adapters/noop.ts — para juegos sin fuente de cartas (topps, panini, cyberpunk).

import type { LocalProduct, ResolveResult, SetAdapter, HighlightCard } from "../types";

function makeNoop(game: string): SetAdapter {
  return {
    game,
    supported: false,
    async resolveSetId(
      _product: LocalProduct,
      _strategyTried: string[],
      _errors: string[],
    ): Promise<ResolveResult | null> {
      return null;
    },
    async fetchTopCards(
      _setId: string,
      _lang: string,
      _product: LocalProduct,
      _errors: string[],
    ): Promise<HighlightCard[]> {
      return [];
    },
  };
}

export const noopAdapter: SetAdapter = makeNoop("unknown");
export const toppsAdapter: SetAdapter = makeNoop("topps");
export const paniniAdapter: SetAdapter = makeNoop("panini");
export const cyberpunkAdapter: SetAdapter = makeNoop("cyberpunk");
