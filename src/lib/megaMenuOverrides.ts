/**
 * Overrides del mega menú — permite editar las categorías por juego desde
 * /admin/categorias sin tocar `src/data/megaMenuData.ts`.
 *
 * Estructura:
 *   {
 *     [gameSlug]: {
 *       columns: MegaMenuColumn[]    // sustituye las columnas del juego
 *     }
 *   }
 *
 * Solo las columnas son editables desde admin. El resto (slug, color, logo…)
 * sigue viniendo del archivo hardcodeado para no complicarlo.
 */

import {
  MEGA_MENU_DATA,
  type MegaMenuColumn,
  type MegaMenuGame,
} from "@/data/megaMenuData";

const STORAGE_KEY = "tcgacademy_megamenu_overrides";

export interface MegaMenuOverride {
  columns: MegaMenuColumn[];
}

export type MegaMenuOverrideMap = Record<string, MegaMenuOverride>;

export function loadMegaMenuOverrides(): MegaMenuOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MegaMenuOverrideMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMegaMenuOverrides(map: MegaMenuOverrideMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  try {
    window.dispatchEvent(new Event("tcga:megamenu:updated"));
  } catch {
    /* non-fatal */
  }
}

/**
 * Devuelve el mega menú completo con los overrides aplicados. Los juegos sin
 * override conservan sus columnas por defecto. Si un juego existe en el
 * override pero ya no en `MEGA_MENU_DATA`, se ignora (no introducimos juegos
 * huérfanos desde admin — solo se editan los existentes).
 */
export function getMergedMegaMenu(): MegaMenuGame[] {
  if (typeof window === "undefined") return MEGA_MENU_DATA;
  const overrides = loadMegaMenuOverrides();
  if (Object.keys(overrides).length === 0) return MEGA_MENU_DATA;
  return MEGA_MENU_DATA.map((game) => {
    const override = overrides[game.slug];
    if (!override || !Array.isArray(override.columns)) return game;
    return { ...game, columns: override.columns };
  });
}

export function getMergedGame(slug: string): MegaMenuGame | undefined {
  return getMergedMegaMenu().find((g) => g.slug === slug);
}
