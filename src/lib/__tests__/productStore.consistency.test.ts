import { afterEach, beforeEach, describe, expect, it } from "vitest";

// productStore usa `typeof window === "undefined"` como guard antes de leer
// localStorage. Inyectamos un window mínimo en Node para que el test
// ejercite la ruta cliente sin necesidad de jsdom.
const store: Record<string, string> = {};
const fakeLocalStorage: Storage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() {
    return Object.keys(store).length;
  },
} as Storage;

(globalThis as unknown as { window: { localStorage: Storage } }).window = {
  localStorage: fakeLocalStorage,
};
(globalThis as unknown as { localStorage: Storage }).localStorage =
  fakeLocalStorage;
import { PRODUCTS } from "@/data/products";
import {
  getMergedById,
  getMergedBySlug,
  getMergedProducts,
} from "@/lib/productStore";

// Barrera de regresión — incidente 2026-04-22 "StrixHaven": el catálogo usaba
// `getMergedProducts()` (nombre/precio editados por el admin) mientras que el
// detalle `/[game]/[category]/[slug]` recibía `product` desde `PRODUCTS`
// (estático) sin mergear overrides. Resultado: mismo producto con nombre y
// precio distintos según la vista.
//
// Estos tests fijan el contrato: una edición admin persiste en
// `tcgacademy_product_overrides` y CUALQUIER lectura posterior por id/slug
// debe devolver los valores mergeados, nunca los estáticos.
//
// Ver: memory/feedback_catalog_detail_consistency.md
//      memory/feedback_ssr_override_hydration.md

const OVERRIDES_KEY = "tcgacademy_product_overrides";

// Usa un producto real del catálogo estático para evitar drift si cambia.
const SAMPLE = PRODUCTS.find((p) => p.slug === "magic-strixhaven-play-booster-box-en");

describe("productStore — catálogo↔detalle consistency (StrixHaven barrier)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("el producto de muestra debe existir en el catálogo estático", () => {
    expect(SAMPLE).toBeDefined();
  });

  it("getMergedById aplica el override de name/price", () => {
    if (!SAMPLE) return;
    const edited = {
      name: "Caja de sobres StrixHaven (EDITADO)",
      price: 40,
    };
    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify({ [String(SAMPLE.id)]: edited }),
    );
    const merged = getMergedById(SAMPLE.id);
    expect(merged?.name).toBe(edited.name);
    expect(merged?.price).toBe(edited.price);
  });

  it("getMergedBySlug devuelve los mismos valores mergeados que getMergedById", () => {
    if (!SAMPLE) return;
    const edited = { name: "Nombre X", price: 42.5 };
    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify({ [String(SAMPLE.id)]: edited }),
    );
    const byId = getMergedById(SAMPLE.id);
    const bySlug = getMergedBySlug(SAMPLE.slug);
    expect(bySlug?.name).toBe(byId?.name);
    expect(bySlug?.price).toBe(byId?.price);
    expect(bySlug?.name).toBe(edited.name);
  });

  it("getMergedProducts y getMergedById coinciden en name/price para todo override", () => {
    if (!SAMPLE) return;
    const edited = { name: "Edit Z", price: 99.99, description: "Nueva desc" };
    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify({ [String(SAMPLE.id)]: edited }),
    );
    const all = getMergedProducts();
    const fromList = all.find((p) => p.id === SAMPLE.id);
    const fromId = getMergedById(SAMPLE.id);
    expect(fromList?.name).toBe(fromId?.name);
    expect(fromList?.price).toBe(fromId?.price);
    expect(fromList?.description).toBe(fromId?.description);
  });
});
