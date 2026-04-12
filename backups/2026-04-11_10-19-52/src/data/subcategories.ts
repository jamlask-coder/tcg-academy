// ── Subcategory collections per game ────────────────────────────────────────
// Used by: sidebar filters on category pages, admin subcategories panel.
// Storage: localStorage["tcgacademy_subcategories"] (keyed by game slug).

export interface Subcategory {
  id: string;
  label: string;
}

export type SubcategoryMap = Record<string, Subcategory[]>;

// Default subcategories bundled with the build (admin can add/edit/delete more)
export const DEFAULT_SUBCATEGORIES: SubcategoryMap = {
  magic: [
    { id: "tmnt", label: "Tortugas Ninja" },
    { id: "hobbit", label: "El Hobbit" },
    { id: "mh3", label: "Modern Horizons 3" },
    { id: "bloomburrow", label: "Bloomburrow" },
    { id: "dsk", label: "Duskmourn" },
    { id: "fdn", label: "Foundations" },
  ],
  "one-piece": [
    { id: "op14", label: "OP-14" },
    { id: "op15", label: "OP-15" },
    { id: "eb03", label: "EB-03" },
  ],
  riftbound: [
    { id: "spiritforged", label: "Spiritforged" },
  ],
};

const STORAGE_KEY = "tcgacademy_subcategories";

export function loadSubcategories(): SubcategoryMap {
  if (typeof window === "undefined") return DEFAULT_SUBCATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SUBCATEGORIES;
    return { ...DEFAULT_SUBCATEGORIES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SUBCATEGORIES;
  }
}

export function saveSubcategories(map: SubcategoryMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("tcga:subcategories:updated"));
  } catch {}
}
