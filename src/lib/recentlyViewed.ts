const KEY = "tcgacademy_recently_viewed";
const MAX = 8;

export function addToRecentlyViewed(productId: number): void {
  if (typeof window === "undefined") return;
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
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}
