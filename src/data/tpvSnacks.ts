/**
 * Snacks de mostrador — TPV-only.
 * ===============================
 *
 * Estos productos viven SOLO en el TPV físico de tienda. NO aparecen en el
 * catálogo web, ni en `/[game]`, ni en megamenu, ni en SEO. Tampoco se
 * pueden comprar online — son productos para venta directa de mostrador
 * (refrescos, snacks…) que se cobran junto con los TCG en el TPV.
 *
 * Por qué viven aparte de `PRODUCTS`:
 *  - No queremos que `getMergedProducts()` los devuelva → no se filtran
 *    en /catalogo, /[game], /search.
 *  - No queremos que aparezcan en stats SEO ni rich snippets.
 *  - Pero el TPV (carrito + invoiceService + completeTpvSale) sí necesita
 *    resolverlos por ID. Para eso, `getMergedById()` los detecta vía
 *    `isSnackId()` y los resuelve con `resolveSnackProduct()`.
 *
 * Estilo igual que `eventProduct.ts` — rango de IDs reservado para que
 * no choquen con el catálogo estático ni con admin-creados.
 *
 * IDs reservados: 80_000_000 .. 89_999_999.
 */

import type { LocalProduct } from "@/data/products";

/** Base del rango reservado para snacks de TPV. */
export const SNACK_PRODUCT_ID_BASE = 80_000_000;
const SNACK_PRODUCT_ID_LIMIT = 89_999_999;

export function isSnackId(id: number): boolean {
  return id >= SNACK_PRODUCT_ID_BASE && id <= SNACK_PRODUCT_ID_LIMIT;
}

/**
 * Catálogo TPV-only de snacks. Editar aquí para añadir/cambiar precios o
 * fotos. `images: []` muestra el fallback emoji+nombre del TpvProductCard
 * hasta que se añada una foto real en `/public/images/snacks/`.
 *
 * Precios = PV mostrador con IVA incluido (España, 21% genérico para
 * bebidas/snacks). Cambiar `vatRate` si la categoría exigiese otro tipo.
 */
export const TPV_SNACKS: LocalProduct[] = [
  {
    id: SNACK_PRODUCT_ID_BASE + 1,
    name: "Coca-Cola 33 cl",
    slug: "snack-cocacola-33",
    price: 1.8,
    wholesalePrice: 1.8,
    storePrice: 1.8,
    description: "Lata de Coca-Cola 33 cl. Sólo venta en tienda.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/cocacola-33.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 21,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 2,
    name: "Coca-Cola Zero 33 cl",
    slug: "snack-cocacola-zero-33",
    price: 1.8,
    wholesalePrice: 1.8,
    storePrice: 1.8,
    description: "Lata de Coca-Cola Zero 33 cl.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/cocacola-zero-33.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 21,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 3,
    name: "Fanta Naranja 33 cl",
    slug: "snack-fanta-naranja-33",
    price: 1.8,
    wholesalePrice: 1.8,
    storePrice: 1.8,
    description: "Lata de Fanta Naranja 33 cl.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/fanta-naranja-33.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 21,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 4,
    name: "Fanta Limón 33 cl",
    slug: "snack-fanta-limon-33",
    price: 1.8,
    wholesalePrice: 1.8,
    storePrice: 1.8,
    description: "Lata de Fanta Limón 33 cl.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/fanta-limon-33.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 21,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 5,
    name: "Aquarius Limón 33 cl",
    slug: "snack-aquarius-limon-33",
    price: 1.8,
    wholesalePrice: 1.8,
    storePrice: 1.8,
    description: "Lata de Aquarius Limón 33 cl.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/aquarius-limon-33.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 21,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 6,
    name: "Aquarius Naranja 33 cl",
    slug: "snack-aquarius-naranja-33",
    price: 1.8,
    wholesalePrice: 1.8,
    storePrice: 1.8,
    description: "Lata de Aquarius Naranja 33 cl.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/aquarius-naranja-33.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 21,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 7,
    name: "Agua mineral 50 cl",
    slug: "snack-agua-50",
    price: 1.0,
    wholesalePrice: 1.0,
    storePrice: 1.0,
    description: "Botella de agua mineral 50 cl.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/agua-50.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 10,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 8,
    name: "Red Bull 25 cl",
    slug: "snack-redbull-25",
    price: 2.5,
    wholesalePrice: 2.5,
    storePrice: 2.5,
    description: "Lata de Red Bull 25 cl.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/redbull-25.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "bebida"],
    vatRate: 21,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 9,
    name: "Lay's Clásicas",
    slug: "snack-lays-clasicas",
    price: 1.5,
    wholesalePrice: 1.5,
    storePrice: 1.5,
    description: "Bolsa de patatas fritas Lay's clásicas.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/lays-clasicas.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "salado"],
    vatRate: 10,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 10,
    name: "Doritos Tex-Mex",
    slug: "snack-doritos-texmex",
    price: 1.5,
    wholesalePrice: 1.5,
    storePrice: 1.5,
    description: "Bolsa de Doritos Tex-Mex.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/doritos-texmex.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "salado"],
    vatRate: 10,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 11,
    name: "KitKat 4 dedos",
    slug: "snack-kitkat",
    price: 1.2,
    wholesalePrice: 1.2,
    storePrice: 1.2,
    description: "Barrita KitKat de 4 dedos.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/kitkat.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "dulce"],
    vatRate: 10,
  },
  {
    id: SNACK_PRODUCT_ID_BASE + 12,
    name: "Snickers",
    slug: "snack-snickers",
    price: 1.2,
    wholesalePrice: 1.2,
    storePrice: 1.2,
    description: "Barrita Snickers.",
    category: "snacks",
    game: "snacks",
    images: ["/images/snacks/snickers.png"],
    inStock: true,
    isNew: false,
    language: "ES",
    tags: ["snack", "tpv-only", "dulce"],
    vatRate: 10,
  },
];

/** Resolver para `getMergedById` — devuelve el snack o undefined. */
export function resolveSnackProduct(id: number): LocalProduct | undefined {
  if (!isSnackId(id)) return undefined;
  return TPV_SNACKS.find((s) => s.id === id);
}
