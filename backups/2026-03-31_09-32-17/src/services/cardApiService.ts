// Generic card API service interface — implement for each TCG (Pokemon, Magic, etc.)
import type { ExternalCardData, CardSet } from "@/types/card";

export interface CardApiService {
  searchCards(query: string, setId?: string): Promise<ExternalCardData[]>;
  getCard(id: string): Promise<ExternalCardData | null>;
  getSets(): Promise<CardSet[]>;
}
