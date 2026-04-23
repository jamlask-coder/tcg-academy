"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "tcga_favorites";

interface FavoritesCtx {
  favorites: number[];
  count: number;
  toggle: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
}

const FavoritesContext = createContext<FavoritesCtx | null>(null);

function readLocal(): number[] {
  try {
    const s = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return s ? (JSON.parse(s) as number[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    logger.warn("No se pudo guardar favoritos", "favorites", { err: String(err) });
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, toggleFavorite: authToggle, mergeFavorites } = useAuth();
  const [local, setLocal] = useState<number[]>(readLocal);

  // On login: merge atomic de favoritos anónimos → cuenta. Antes hacíamos
  // `for (id of pending) authToggle(id)` pero authToggle tenía closure stale
  // del user.favorites → solo se añadía el último. mergeFavorites usa Set
  // sobre el estado vigente (SSOT).
  useEffect(() => {
    if (!user) return;
    const pending = readLocal();
    if (pending.length === 0) return;
    const toAdd = pending.filter((id) => !user.favorites.includes(id));
    if (toAdd.length > 0) mergeFavorites(toAdd);
    writeLocal([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal([]);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const ids = user ? user.favorites : local;

  const toggle = useCallback((productId: number) => {
    if (user) {
      authToggle(productId);
    } else {
      setLocal((prev) => {
        const next = prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId];
        writeLocal(next);
        return next;
      });
    }
  }, [user, authToggle]);

  const isFavorite = useCallback(
    (productId: number) => ids.includes(productId),
    [ids],
  );

  return (
    <FavoritesContext.Provider value={{ favorites: ids, count: ids.length, toggle, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be inside FavoritesProvider");
  return ctx;
};
