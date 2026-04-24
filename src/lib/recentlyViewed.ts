import type { LocalProduct } from "@/data/products";
import { getProductsByIds } from "@/lib/productStore";

const KEY = "tcgacademy_recently_viewed";
const LEGACY_KEY = "tcgacademy_recent_views"; // Dead key — kept for one-time cleanup
const MAX = 8;

/** One-time cleanup: removes the legacy dead key if it exists. */
function cleanupLegacyKey(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(LEGACY_KEY) !== null) {
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // ignore
  }
}

export function addToRecentlyViewed(productId: number): void {
  if (typeof window === "undefined") return;
  cleanupLegacyKey();
  try {
    const stored: number[] = JSON.parse(
      localStorage.getItem(KEY) ?? "[]",
    ) as number[];
    const updated = [productId, ...stored.filter((id) => id !== productId)].slice(
      0,
      MAX,
    );
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getRecentlyViewedIds(): number[] {
  if (typeof window === "undefined") return [];
  cleanupLegacyKey();
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

/**
 * Helper canónico "Vista 360°": productos recientemente vistos, ya
 * hidratados a LocalProduct (los eliminados se filtran).
 */
export function getRecentlyViewed(): LocalProduct[] {
  return getProductsByIds(getRecentlyViewedIds());
}
