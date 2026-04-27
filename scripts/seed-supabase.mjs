/**
 * Seed inicial Supabase desde PRODUCTS / GAME_CONFIG / CATEGORY_LABELS.
 *
 *   node --experimental-strip-types scripts/seed-supabase.mjs
 *
 * - Crea categorías top-level (slug = game) y sub-categorías ("game-category").
 * - Hace upsert de cada producto en `products` con FK a la sub-categoría.
 * - Idempotente: vuelve a ejecutarse sin duplicar (UPSERT por id).
 *
 * Lee credenciales desde .env.local — requiere:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// ── Cargar .env.local ────────────────────────────────────────────────────────

const envPath = path.join(repoRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[seed] faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Cargar PRODUCTS via Node 24 --experimental-strip-types ───────────────────

const productsModule = await import(
  pathToFileURL(path.join(repoRoot, "src/data/products.ts")).href
);
const { PRODUCTS, GAME_CONFIG, CATEGORY_LABELS } = productsModule;

console.log(`[seed] PRODUCTS=${PRODUCTS.length} GAMES=${Object.keys(GAME_CONFIG).length}`);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** UUID-shape determinista (sha1 del slug). Estable entre seeds, ids reproducibles. */
function deterministicUuid(slug) {
  const h = crypto.createHash("sha1").update(slug).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "5" + h.slice(13, 16),
    "8" + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

// ── 1. Categorías top-level (una por juego) ──────────────────────────────────

const gameTopIds = new Map();
for (const [gameSlug, cfg] of Object.entries(GAME_CONFIG)) {
  const id = deterministicUuid(`game:${gameSlug}`);
  gameTopIds.set(gameSlug, id);
  const { error } = await sb.from("categories").upsert(
    {
      id,
      parent_id: null,
      slug: gameSlug,
      name: cfg.name,
      description: cfg.description ?? null,
      emoji: cfg.emoji ?? null,
      color: cfg.color ?? null,
      bg_color: cfg.bgColor ?? null,
      sort_order: 0,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[seed] error categoría top", gameSlug, error.message);
    process.exit(1);
  }
}
console.log(`[seed] top-level categories: ${gameTopIds.size}`);

// ── 2. Sub-categorías (una por par game/category) ────────────────────────────

const subCategoryIds = new Map();
const uniquePairs = new Set();
for (const p of PRODUCTS) uniquePairs.add(`${p.game}/${p.category}`);
for (const pair of uniquePairs) {
  const [gameSlug, catSlug] = pair.split("/");
  const id = deterministicUuid(`subcat:${pair}`);
  subCategoryIds.set(pair, id);
  const parentId = gameTopIds.get(gameSlug) ?? null;
  if (!parentId) {
    console.warn(`[seed] juego desconocido: ${gameSlug} (categoría ${catSlug})`);
  }
  const { error } = await sb.from("categories").upsert(
    {
      id,
      parent_id: parentId,
      slug: `${gameSlug}-${catSlug}`,
      name: CATEGORY_LABELS[catSlug] ?? catSlug,
      sort_order: 1,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[seed] error sub-categoría", pair, error.message);
    process.exit(1);
  }
}
console.log(`[seed] sub-categories: ${subCategoryIds.size}`);

// ── 3. Productos ─────────────────────────────────────────────────────────────

let inserted = 0;
let failed = 0;
for (const p of PRODUCTS) {
  const subKey = `${p.game}/${p.category}`;
  const categoryId = subCategoryIds.get(subKey);
  if (!categoryId) {
    console.warn(`[seed] saltado ${p.id} (${p.slug}): subcategoría no encontrada ${subKey}`);
    failed++;
    continue;
  }

  // Toda la metadata "extendida" que no encaja en columnas → JSONB.
  const metadata = {
    game: p.game,
    category: p.category,
    tags: p.tags ?? [],
    isFeatured: p.isFeatured ?? false,
    isNew: p.isNew ?? false,
    createdAt: p.createdAt ?? null,
    comparePrice: p.comparePrice ?? null,
    wholesalePrice: p.wholesalePrice,
    storePrice: p.storePrice,
    costPrice: p.costPrice ?? null,
    linkedPackId: p.linkedPackId ?? null,
    linkedBoxId: p.linkedBoxId ?? null,
    packsPerBox: p.packsPerBox ?? null,
    cardsPerPack: p.cardsPerPack ?? null,
    gtin13: p.gtin13 ?? null,
    mpn: p.mpn ?? null,
    maxPerClient: p.maxPerClient ?? null,
    maxPerWholesaler: p.maxPerWholesaler ?? null,
    maxPerStore: p.maxPerStore ?? null,
    inStock: p.inStock,
  };

  const row = {
    id: p.id,
    slug: p.slug,
    category_id: categoryId,
    name: p.name,
    short_description: p.description?.slice(0, 200) ?? null,
    description: p.description ?? null,
    price: p.price,
    sale_price: p.comparePrice ? p.price : null,
    vat_rate: p.vatRate ?? 21,
    stock: p.stock ?? 9999,
    max_per_user: p.maxPerUser ?? null,
    language: p.language ?? null,
    barcode: p.gtin13 ?? null,
    images: p.images ?? [],
    metadata,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("products").upsert(row, { onConflict: "id" });
  if (error) {
    console.error(`[seed] error producto ${p.id} (${p.slug}): ${error.message}`);
    failed++;
  } else {
    inserted++;
  }
}

console.log(`[seed] productos: ok=${inserted} ko=${failed}`);
console.log("[seed] hecho.");
