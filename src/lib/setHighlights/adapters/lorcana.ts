// adapters/lorcana.ts — lorcana-api.com (tiene CORS).

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { dedup } from "../cache";
import { getJson } from "../fetcher";
import { bestFuzzyMatch, enrichForMatch } from "../matching";
import { LORCANA_SET_MAP, isHoloRarity } from "../setMaps";

interface LorcanaSetApi {
  Set_ID?: string | number;
  Set_Name?: string;
}

interface LorcanaCard {
  Set_Num: string | number;
  Name: string;
  Image?: string;
  Rarity?: string;
  Set_Name?: string;
}

const LORCANA_RARITY_ORDER: Record<string, number> = {
  enchanted: 5,
  legendary: 4,
  "super rare": 3,
  rare: 2,
  common: 1,
};

let lorcanaSetsCache: LorcanaSetApi[] | null = null;
let lorcanaAllCardsCache: LorcanaCard[] | null = null;

async function getLorcanaSets(): Promise<LorcanaSetApi[]> {
  if (lorcanaSetsCache) return lorcanaSetsCache;
  const list = await dedup("lorcana:sets", async () => {
    const data = await getJson<LorcanaSetApi[]>("https://api.lorcana-api.com/sets");
    return Array.isArray(data) ? data : [];
  });
  lorcanaSetsCache = list;
  return list;
}

async function getLorcanaAllCards(): Promise<LorcanaCard[]> {
  if (lorcanaAllCardsCache) return lorcanaAllCardsCache;
  const list = await dedup("lorcana:all", async () => {
    const data = await getJson<LorcanaCard[]>(
      "https://api.lorcana-api.com/cards/all",
    );
    return Array.isArray(data) ? data : [];
  });
  lorcanaAllCardsCache = list;
  return list;
}

async function resolveLorcana(
  product: LocalProduct,
  strategyTried: string[],
  errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");

  // S1 hardcoded-map (ES + EN)
  strategyTried.push("hardcoded-map");
  for (const [re, setName] of LORCANA_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: setName, provenance: "hardcoded-map", setLabel: setName };
    }
  }

  // S3 fuzzy
  strategyTried.push("fuzzy-sets-en");
  const sets = await getLorcanaSets().catch((e) => {
    errors.push(`lorcana:sets:${String(e)}`);
    return [] as LorcanaSetApi[];
  });
  if (sets.length > 0) {
    const searchEn = enrichForMatch(searchIn);
    const match = bestFuzzyMatch(sets, (s) => s.Set_Name ?? "", searchEn, 0.6);
    if (match?.Set_Name) {
      return {
        setId: match.Set_Name,
        provenance: "fuzzy-sets-en",
        setLabel: match.Set_Name,
      };
    }

    // S4 sinónimos ES→EN ya están dentro de enrichForMatch. Probamos score más bajo.
    strategyTried.push("fuzzy-sets-localized");
    const matchLoc = bestFuzzyMatch(sets, (s) => s.Set_Name ?? "", searchEn, 0.45);
    if (matchLoc?.Set_Name) {
      return {
        setId: matchLoc.Set_Name,
        provenance: "fuzzy-sets-localized",
        setLabel: matchLoc.Set_Name,
      };
    }
  }

  return null;
}

async function fetchTopCards(
  setName: string,
  _lang: string,
  _product: LocalProduct,
  errors: string[],
): Promise<HighlightCard[]> {
  try {
    // Intento primario — endpoint ligero por set
    const bySet = await getJson<LorcanaCard[]>(
      `https://api.lorcana-api.com/bySet/${encodeURIComponent(setName)}`,
    );
    let pool: LorcanaCard[] = Array.isArray(bySet) ? bySet : [];

    if (pool.length === 0) {
      // Fallback — descarga todo y filtra local
      const all = await getLorcanaAllCards();
      pool = all.filter((c) => c.Set_Name === setName);
    }

    return pool
      .filter((c) => c.Image)
      .sort(
        (a, b) =>
          (LORCANA_RARITY_ORDER[(b.Rarity ?? "").toLowerCase()] ?? 0) -
          (LORCANA_RARITY_ORDER[(a.Rarity ?? "").toLowerCase()] ?? 0),
      )
      .slice(0, 20)
      .map<HighlightCard>((c) => ({
        id: `${c.Set_Num}-${c.Name}`,
        name: c.Name,
        imageUrl: c.Image ?? "",
        rarity: c.Rarity ?? "",
        isHolo: isHoloRarity(c.Rarity),
        game: "lorcana",
      }));
  } catch (e) {
    errors.push(`lorcana:bySet:${String(e)}`);
    return [];
  }
}

export const lorcanaAdapter: SetAdapter = {
  game: "lorcana",
  supported: true,
  resolveSetId: resolveLorcana,
  fetchTopCards,
};
