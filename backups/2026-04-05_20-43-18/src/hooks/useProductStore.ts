"use client";
import { useState, useEffect, useCallback } from "react";
import type { LocalProduct } from "@/data/products";
import {
  getMergedProducts,
  getMergedByGame,
  getMergedByGameAndCategory,
} from "@/lib/productStore";

export function useProductStore() {
  const [products, setProducts] = useState<LocalProduct[]>([]);

  const refresh = useCallback(() => {
    setProducts(getMergedProducts());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("tcga:products:updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("tcga:products:updated", refresh);
    };
  }, [refresh]);

  return { products, refresh };
}

export function useProductsByGame(game: string) {
  const [products, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    const load = () => setProducts(getMergedByGame(game));
    load();
    window.addEventListener("storage", load);
    window.addEventListener("tcga:products:updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("tcga:products:updated", load);
    };
  }, [game]);

  return products;
}

export function useProductsByGameAndCategory(game: string, category: string) {
  const [products, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    const load = () => setProducts(getMergedByGameAndCategory(game, category));
    load();
    window.addEventListener("storage", load);
    window.addEventListener("tcga:products:updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("tcga:products:updated", load);
    };
  }, [game, category]);

  return products;
}
