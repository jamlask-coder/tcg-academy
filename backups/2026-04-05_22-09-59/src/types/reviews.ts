export interface ProductReview {
  id: string;
  productId: number;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  body: string;
  createdAt: string; // ISO
  verified: boolean; // verified purchase
}
