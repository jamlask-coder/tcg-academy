import type { LocalProduct } from "@/data/products";
import type { ProductFormValues } from "@/components/admin/ProductForm";
import { slugify } from "@/components/admin/ProductForm";
import { persistProductPatch } from "@/lib/productPersist";

export type DerivationMode = "pack" | "box" | "lang";

export interface DerivedFormState {
  values: Partial<ProductFormValues>;
  tags: string[];
  images: string[];
  /** Extra fields no cubiertos por el schema del form — se mezclan al persistir. */
  extra: Partial<Pick<LocalProduct, "linkedPackId" | "linkedBoxId" | "packsPerBox" | "cardsPerPack">>;
}

const LANG_SUFFIX = /-(?:es|en|jp|fr|de|it|ko|pt|zh)$/i;

function stripLangSuffix(slug: string): string {
  return slug.replace(LANG_SUFFIX, "");
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cleanBoxNameToPack(name: string): string {
  // Español: "Caja de sobres X" / "Display X" → "Sobre de X"
  // (antes devolvía "Caja de sobres X Booster Pack", incoherente)
  const esMatch = name.match(/^caja\s+de\s+sobres?\s+(.+)$/i);
  if (esMatch) return `Sobre de ${esMatch[1].replace(/\s*\(\s*\d+\s*sobres?\s*\)/i, "").trim()}`;

  // Inglés: quita "Display"/"Booster Box"/"(N sobres)" y añade "Booster Pack"
  const out = name
    .replace(/\s*\(\s*\d+\s*sobres?\s*\)/i, "")
    .replace(/\s*Booster\s*Box\s*/i, " ")
    .replace(/\s*Display\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/booster\s*pack\b/i.test(out) || /\bsobre\b/i.test(out)) return out;
  // Evita duplicar "Booster": si ya termina en "Booster", añade solo "Pack"
  if (/\bbooster$/i.test(out)) return `${out} Pack`;
  return `${out} Booster Pack`;
}

function cleanPackNameToBox(name: string, packsPerBox: number): string {
  // Español: "Sobre de X" / "Sobre individual X" → "Caja de sobres X (N sobres)"
  const esMatch = name.match(/^sobre(?:\s+individual)?\s+(?:de\s+)?(.+)$/i);
  if (esMatch) {
    const base = esMatch[1].replace(/\s*\(\s*\d+\s*cartas?\s*\)/i, "").trim();
    return `Caja de sobres ${base} (${packsPerBox} sobres)`;
  }

  // Inglés: quita sufijos de pack/sobre y añade "Booster Display (N sobres)"
  let out = name
    .replace(/\s*\(\s*\d+\s*cartas?\s*\)/i, "")
    .replace(/\s*Booster\s*Pack\s*/i, " ")
    .replace(/\s*Sobre(?:\s+individual)?\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/display|booster\s*box/i.test(out)) {
    out += /\bbooster$/i.test(out) ? " Display" : " Booster Display";
  }
  return `${out} (${packsPerBox} sobres)`;
}

/** Caja → Sobre suelto. Precio sugerido = boxPrice / packsPerBox. */
export function derivePackDefaults(box: LocalProduct): DerivedFormState {
  const packs = box.packsPerBox ?? 36;
  const base = stripLangSuffix(box.slug).replace(/-display$|-box$|-booster-display$/i, "");
  const newName = cleanBoxNameToPack(box.name);
  return {
    values: {
      name: newName,
      slug: slugify(`${base}-pack`),
      // Hereda la descripción del padre (admin ya invirtió tiempo escribiéndola).
      // Si queda incoherente, se ajusta desde el form o con "Generar descripción".
      description: box.description ?? "",
      game: box.game,
      category: "sobres",
      language: box.language ?? "",
      price: r2(box.price / packs),
      wholesalePrice: r2(box.wholesalePrice / packs),
      storePrice: r2(box.storePrice / packs),
      costPrice: box.costPrice ? r2(box.costPrice / packs) : undefined,
      comparePrice: box.comparePrice ? r2(box.comparePrice / packs) : undefined,
      inStock: true,
      isNew: false,
    },
    tags: box.tags.filter((t) => t !== "display" && t !== "box"),
    images: box.images,
    extra: {
      linkedBoxId: box.id,
      // cardsPerPack lo rellena el admin — no tenemos dato fiable derivable
    },
  };
}

/** Sobre → Caja. Precio sugerido = packPrice * packsPerBox (admin ajusta descuento). */
export function deriveBoxDefaults(
  pack: LocalProduct,
  packsPerBox = 36,
): DerivedFormState {
  const base = stripLangSuffix(pack.slug).replace(/-pack$|-sobre$|-booster-pack$/i, "");
  const newName = cleanPackNameToBox(pack.name, packsPerBox);
  return {
    values: {
      name: newName,
      slug: slugify(`${base}-display`),
      // Hereda la descripción del padre (admin ya invirtió tiempo escribiéndola).
      description: pack.description ?? "",
      game: pack.game,
      category: "booster-box",
      language: pack.language ?? "",
      price: r2(pack.price * packsPerBox),
      wholesalePrice: r2(pack.wholesalePrice * packsPerBox),
      storePrice: r2(pack.storePrice * packsPerBox),
      costPrice: pack.costPrice ? r2(pack.costPrice * packsPerBox) : undefined,
      inStock: true,
      isNew: false,
    },
    tags: pack.tags.filter((t) => t !== "pack" && t !== "sobre"),
    images: pack.images,
    extra: {
      linkedPackId: pack.id,
      packsPerBox,
    },
  };
}

/** Mismo producto en otro idioma. NO hereda linkedPackId/linkedBoxId (cada idioma lleva su par). */
export function deriveLangDefaults(
  source: LocalProduct,
  targetLang: string,
): DerivedFormState {
  const base = stripLangSuffix(source.slug);
  const suffix = targetLang.toLowerCase();
  return {
    values: {
      name: source.name,
      slug: slugify(`${base}-${suffix}`),
      description: source.description,
      game: source.game,
      category: source.category,
      language: targetLang.toUpperCase(),
      price: source.price,
      wholesalePrice: source.wholesalePrice,
      storePrice: source.storePrice,
      costPrice: source.costPrice,
      comparePrice: source.comparePrice,
      inStock: true,
      isNew: false,
    },
    tags: source.tags,
    images: source.images,
    extra: {
      packsPerBox: source.packsPerBox,
      cardsPerPack: source.cardsPerPack,
    },
  };
}

/**
 * Actualiza el override localStorage del producto padre para cerrar la
 * vinculación bidireccional tras crear el derivado/superior.
 * - mode "pack" (padre = caja) → padre.linkedPackId = childId
 * - mode "box"  (padre = sobre) → padre.linkedBoxId = childId, padre.packsPerBox = packsPerBox del hijo
 */
export function closeParentLink(
  parentId: number,
  mode: DerivationMode,
  childId: number,
  packsPerBox?: number,
): void {
  if (mode === "lang") return; // los paralelos se detectan por slug base, no necesitan FK
  // Delegamos en la utility canónica: `persistProductPatch` detecta si el
  // padre es admin-created (vive en `tcgacademy_new_products`) o estático
  // (patch en `tcgacademy_product_overrides`). Antes escribía siempre a
  // overrides → si el padre era admin-created el linkedPackId/linkedBoxId
  // quedaba huérfano (incidente StrixHaven, feedback_catalog_detail_consistency.md GOTCHA 5).
  if (mode === "pack") {
    persistProductPatch(parentId, { linkedPackId: childId });
  } else if (mode === "box") {
    persistProductPatch(parentId, {
      linkedBoxId: childId,
      ...(packsPerBox ? { packsPerBox } : {}),
    });
  }
}
