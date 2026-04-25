/**
 * Product import service — Importación masiva desde distribuidor.
 * ================================================================
 *
 * Permite cargar listados CSV de proveedores (Asmodee, Heidelberger, Bandai…)
 * y dar de alta productos en bloque. Al confirmar, cada fila se traduce a un
 * `LocalProduct` admin-creado (escrito vía `persistNewProduct`) — el catálogo
 * mostrará los nuevos productos con createdAt = hoy → badge NUEVO.
 *
 * Funciones puras: el parser no escribe nada. La escritura sólo ocurre en
 * `importProducts()`, lo cual permite previsualizar antes de confirmar.
 */

import type { LocalProduct } from "@/data/products";
import { GAME_CONFIG, CATEGORY_LABELS } from "@/data/products";
import {
  generateLocalProductId,
  getMergedBySlug,
  findProductBySlugExcluding,
} from "@/lib/productStore";
import { persistNewProduct } from "@/lib/productPersist";
import { SITE_CONFIG } from "@/config/siteConfig";

// ── Tipos ─────────────────────────────────────────────────────────────────

/** Mapeo lógico de columnas del CSV. -1 = no presente. */
export interface ProductColumnMap {
  name: number;
  ean: number;
  sku: number;
  costPrice: number;
  pvp: number;
  stock: number;
  category: number;
  language: number;
  description: number;
}

/** Preset de un distribuidor: cabecera, defaults y mapeo recomendado. */
export interface DistributorPreset {
  id: string;
  name: string;
  /** Patrones (regex) que identifican CSVs de este distribuidor */
  detect: RegExp[];
  defaults: {
    game: string;
    category: string;
    language: string;
    /** Margen sugerido (% sobre coste) para calcular price si falta PVP */
    suggestedMarginPct: number;
  };
  /** Mapeo recomendado por nombres de columna (case-insensitive). */
  columnHints: Partial<Record<keyof ProductColumnMap, string[]>>;
}

/** Fila ya parseada (con valores tipados). */
export interface ParsedProductRow {
  rowIndex: number;
  name: string;
  ean: string;
  sku: string;
  costPrice: number | null;
  pvp: number | null;
  stock: number | null;
  category: string;
  language: string;
  description: string;
  warnings: string[];
}

export interface DistributorImportPreview {
  preset: DistributorPreset;
  detectedColumns: ProductColumnMap;
  rows: ParsedProductRow[];
  errors: string[];
  rawHeader: string[];
}

/** Defaults aplicados al confirmar import (una sola pasada). */
export interface ImportDefaults {
  game: string;
  category: string;
  language: string;
  vatRate: number;
  /** Si la fila no trae PVP, calcular como cost × (1 + margin/100). */
  marginPct: number;
  /** Marca todos como `inStock = true` aunque no haya stock numérico. */
  forceInStock: boolean;
  /** Activa el badge NUEVO automáticamente (createdAt = hoy). */
  markNew: boolean;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ── Presets distribuidores ────────────────────────────────────────────────

export const DISTRIBUTOR_PRESETS: DistributorPreset[] = [
  {
    id: "asmodee",
    name: "Asmodee",
    detect: [/asmodee/i, /\bref\b.+\bean\b/i],
    defaults: {
      game: "magic",
      category: "booster-box",
      language: "EN",
      suggestedMarginPct: 35,
    },
    columnHints: {
      name: ["nombre", "name", "descripcion", "producto"],
      ean: ["ean", "ean13", "barcode"],
      sku: ["ref", "sku", "referencia", "codigo"],
      costPrice: ["pvd", "precio", "neto", "coste", "cost"],
      pvp: ["pvp", "rrp", "precio venta"],
      stock: ["stock", "existencias", "uds", "qty"],
      category: ["categoria", "category", "tipo"],
      language: ["idioma", "language", "lang"],
    },
  },
  {
    id: "heidelberger",
    name: "Heidelberger",
    detect: [/heidelberger/i, /artikel/i, /einkaufspreis/i],
    defaults: {
      game: "magic",
      category: "booster-box",
      language: "DE",
      suggestedMarginPct: 30,
    },
    columnHints: {
      name: ["artikel", "name", "bezeichnung", "title"],
      ean: ["ean", "barcode"],
      sku: ["artikelnummer", "sku", "art-nr"],
      costPrice: ["einkaufspreis", "ek", "preis", "cost"],
      pvp: ["uvp", "vk", "verkaufspreis", "rrp"],
      stock: ["bestand", "lager", "stock"],
      language: ["sprache", "language"],
    },
  },
  {
    id: "bandai",
    name: "Bandai",
    detect: [/bandai/i, /one\s*piece/i, /digimon/i],
    defaults: {
      game: "onepiece",
      category: "booster-box",
      language: "EN",
      suggestedMarginPct: 30,
    },
    columnHints: {
      name: ["product", "name", "title"],
      ean: ["ean", "jan", "barcode"],
      sku: ["item", "sku", "code"],
      costPrice: ["cost", "wholesale", "price"],
      pvp: ["msrp", "rrp", "retail"],
      stock: ["stock", "qty", "inventory"],
      language: ["language", "lang"],
    },
  },
  {
    id: "generic",
    name: "Genérico",
    detect: [],
    defaults: {
      game: "magic",
      category: "booster-box",
      language: "EN",
      suggestedMarginPct: 30,
    },
    columnHints: {
      name: ["name", "nombre", "product", "producto"],
      ean: ["ean", "barcode"],
      sku: ["sku", "ref", "code"],
      costPrice: ["cost", "coste", "price", "precio"],
      pvp: ["pvp", "rrp", "msrp"],
      stock: ["stock", "qty"],
      language: ["language", "idioma", "lang"],
      category: ["category", "categoria"],
      description: ["description", "descripcion"],
    },
  },
];

// ── CSV parser ────────────────────────────────────────────────────────────

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts = {
    ";": (firstLine.match(/;/g) ?? []).length,
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  const sorted = (Object.entries(counts) as Array<[string, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  return sorted[0]?.[1] > 0 ? sorted[0][0] : ";";
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/€|\$|£/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseInt0(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d-]/g, "");
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ── Detección de preset y columnas ────────────────────────────────────────

export function detectPreset(text: string): DistributorPreset {
  for (const p of DISTRIBUTOR_PRESETS) {
    if (p.detect.length > 0 && p.detect.some((rx) => rx.test(text))) return p;
  }
  return DISTRIBUTOR_PRESETS[DISTRIBUTOR_PRESETS.length - 1]; // generic
}

function buildColumnMap(
  header: string[],
  preset: DistributorPreset,
): ProductColumnMap {
  const norm = header.map(normalize);
  const find = (hints: string[] | undefined): number => {
    if (!hints) return -1;
    for (let i = 0; i < norm.length; i++) {
      if (hints.some((h) => norm[i].includes(normalize(h)))) return i;
    }
    return -1;
  };
  return {
    name: find(preset.columnHints.name),
    ean: find(preset.columnHints.ean),
    sku: find(preset.columnHints.sku),
    costPrice: find(preset.columnHints.costPrice),
    pvp: find(preset.columnHints.pvp),
    stock: find(preset.columnHints.stock),
    category: find(preset.columnHints.category),
    language: find(preset.columnHints.language),
    description: find(preset.columnHints.description),
  };
}

// ── Preview ───────────────────────────────────────────────────────────────

/**
 * Parsea un CSV de distribuidor y devuelve filas estructuradas listas para
 * confirmar. NO toca el catálogo. La detección de columnas usa los
 * `columnHints` del preset; si una columna no aparece, queda en -1.
 */
export function parseDistributorCsv(
  text: string,
  forcedPresetId?: string,
): DistributorImportPreview {
  const errors: string[] = [];
  const clean = text.replace(/^\uFEFF/, "");
  const delim = detectDelimiter(clean);
  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const preset = forcedPresetId
    ? (DISTRIBUTOR_PRESETS.find((p) => p.id === forcedPresetId) ??
      detectPreset(clean))
    : detectPreset(clean);

  if (lines.length === 0) {
    return {
      preset,
      detectedColumns: emptyColumnMap(),
      rows: [],
      errors: ["El CSV está vacío"],
      rawHeader: [],
    };
  }

  const header = parseCsvLine(lines[0], delim);
  const cols = buildColumnMap(header, preset);

  if (cols.name < 0) {
    errors.push(
      "No se detectó columna de nombre. Usa cabecera 'name' / 'nombre' / 'producto'.",
    );
  }

  const rows: ParsedProductRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delim);
    if (cells.length === 0 || cells.every((c) => !c)) continue;
    const warnings: string[] = [];
    const name = cols.name >= 0 ? (cells[cols.name] ?? "").trim() : "";
    if (!name) {
      errors.push(`Fila ${i + 1}: nombre vacío, descartada.`);
      continue;
    }
    const ean = cols.ean >= 0 ? (cells[cols.ean] ?? "").trim() : "";
    const sku = cols.sku >= 0 ? (cells[cols.sku] ?? "").trim() : "";
    const costPrice =
      cols.costPrice >= 0 ? parseAmount(cells[cols.costPrice] ?? "") : null;
    const pvp = cols.pvp >= 0 ? parseAmount(cells[cols.pvp] ?? "") : null;
    const stock = cols.stock >= 0 ? parseInt0(cells[cols.stock] ?? "") : null;
    const category =
      cols.category >= 0 ? (cells[cols.category] ?? "").trim() : "";
    const language =
      cols.language >= 0 ? (cells[cols.language] ?? "").trim() : "";
    const description =
      cols.description >= 0 ? (cells[cols.description] ?? "").trim() : "";

    if (cols.costPrice >= 0 && costPrice === null)
      warnings.push("coste no parseable");
    if (cols.pvp >= 0 && pvp === null) warnings.push("PVP no parseable");
    if (costPrice === null && pvp === null)
      warnings.push("ni coste ni PVP — habrá que fijar precio manual");

    rows.push({
      rowIndex: i + 1,
      name,
      ean,
      sku,
      costPrice,
      pvp,
      stock,
      category,
      language,
      description,
      warnings,
    });
  }

  return { preset, detectedColumns: cols, rows, errors, rawHeader: header };
}

function emptyColumnMap(): ProductColumnMap {
  return {
    name: -1,
    ean: -1,
    sku: -1,
    costPrice: -1,
    pvp: -1,
    stock: -1,
    category: -1,
    language: -1,
    description: -1,
  };
}

// ── Slug + producto canónico ──────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(base: string, ownId: number): string {
  let candidate = base || "producto";
  let n = 2;
  while (
    findProductBySlugExcluding(candidate, ownId) ||
    getMergedBySlug(candidate)
  ) {
    candidate = `${base}-${n}`;
    n++;
    if (n > 100) {
      candidate = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return candidate;
}

/** Convierte una fila parseada en LocalProduct usando los defaults. */
function rowToProduct(
  row: ParsedProductRow,
  defaults: ImportDefaults,
): LocalProduct | { error: string } {
  const id = generateLocalProductId();
  const slugBase = slugify(row.name);
  const slug = uniqueSlug(slugBase, id);

  // Resolver precio
  let price = row.pvp ?? 0;
  if (price <= 0 && row.costPrice && row.costPrice > 0) {
    price = Math.round(row.costPrice * (1 + defaults.marginPct / 100) * 100) / 100;
  }
  if (price <= 0) {
    return {
      error: `Sin precio para "${row.name}" — establece coste o margen mayor.`,
    };
  }

  // Categoría: si la fila trae una válida, usarla; si no, default
  const rowCategory = row.category && CATEGORY_LABELS[row.category]
    ? row.category
    : defaults.category;
  const language = row.language || defaults.language;
  const game = defaults.game;

  if (!GAME_CONFIG[game]) {
    return { error: `Juego inválido: ${game}` };
  }

  const stockNumber = row.stock ?? null;
  const inStock = defaults.forceInStock || (stockNumber !== null && stockNumber > 0);

  const product: LocalProduct = {
    id,
    name: row.name.slice(0, 200),
    slug,
    price,
    wholesalePrice: row.costPrice
      ? Math.round(row.costPrice * 1.15 * 100) / 100
      : Math.round(price * 0.85 * 100) / 100,
    storePrice: row.costPrice
      ? Math.round(row.costPrice * 1.1 * 100) / 100
      : Math.round(price * 0.8 * 100) / 100,
    costPrice: row.costPrice ?? undefined,
    description:
      row.description ||
      `${row.name}${row.ean ? ` (EAN: ${row.ean})` : ""}${row.sku ? ` · ref ${row.sku}` : ""}`,
    category: rowCategory,
    game,
    images: [],
    inStock,
    stock: stockNumber !== null ? stockNumber : undefined,
    isNew: defaults.markNew,
    createdAt: defaults.markNew
      ? new Date().toISOString().slice(0, 10)
      : undefined,
    language,
    tags: [],
    vatRate: defaults.vatRate,
  };
  return product;
}

// ── Confirmar importación ─────────────────────────────────────────────────

/**
 * Aplica el import. Itera filas, genera LocalProducts y los persiste vía
 * `persistNewProduct`. Devuelve el resumen para mostrar al admin.
 *
 * Cada producto válido emite el evento `tcga:products:updated`. Para
 * importaciones grandes esto puede generar muchas notificaciones — es
 * aceptable porque el throttle del listener de catálogo coalesce.
 */
export function importProducts(
  rows: ParsedProductRow[],
  defaults: ImportDefaults,
): ImportResult {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const row of rows) {
    const result = rowToProduct(row, defaults);
    if ("error" in result) {
      skipped++;
      errors.push(`Fila ${row.rowIndex}: ${result.error}`);
      continue;
    }
    persistNewProduct(result);
    created++;
  }
  return { created, skipped, errors };
}

// ── Defaults sugeridos ────────────────────────────────────────────────────

export function suggestedDefaults(preset: DistributorPreset): ImportDefaults {
  return {
    game: preset.defaults.game,
    category: preset.defaults.category,
    language: preset.defaults.language,
    vatRate: SITE_CONFIG.vatRate,
    marginPct: preset.defaults.suggestedMarginPct,
    forceInStock: false,
    markNew: true,
  };
}
