import type { ProductReview } from "@/types/reviews";

const KEY = "tcgacademy_reviews";

function load(): ProductReview[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ProductReview[];
  } catch {
    return [];
  }
}

function save(reviews: ProductReview[]): void {
  localStorage.setItem(KEY, JSON.stringify(reviews));
}

export function getReviewsForProduct(productId: number): ProductReview[] {
  return load()
    .filter((r) => r.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addReview(
  review: Omit<ProductReview, "id" | "createdAt">,
): ProductReview {
  const full: ProductReview = {
    ...review,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  save([...load(), full]);
  return full;
}

export function getAverageRating(productId: number): {
  avg: number;
  count: number;
} {
  const reviews = getReviewsForProduct(productId);
  if (!reviews.length) return { avg: 0, count: 0 };
  return {
    avg: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
    count: reviews.length,
  };
}

export function hasUserReviewed(productId: number, userId: string): boolean {
  return load().some((r) => r.productId === productId && r.userId === userId);
}
