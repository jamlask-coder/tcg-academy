// ─── Hero image service — imágenes del carrusel de inicio ─────────────────────
// Las imágenes se guardan en localStorage como base64 (dataURL). El carrusel
// las lee en runtime: si hay slides guardados, los usa; si no, cae a los
// estáticos de /public/images/hero/. Permite al admin gestionar el carrusel
// sin tocar ficheros ni hacer deploy.
//
// Registro: la entidad está declarada en `src/lib/dataHub/registry.ts`
// (`heroImages`, evento `tcga:hero_images:updated`).

import { DataHub } from "@/lib/dataHub";
import { safeReadArray, safeWrite, safeRemove } from "@/lib/safeStorage";

export const HERO_IMAGES_KEY = "tcgacademy_hero_images";

export interface HeroImage {
  /** Identificador único generado al subir. */
  id: string;
  /** Nombre original del archivo (informativo). */
  filename: string;
  /** DataURL base64 (image/png, image/jpeg, etc). */
  dataUrl: string;
  /** Mime declarado por el archivo. */
  mime: string;
  /** Destino del slide al hacer click (opcional). Si vacío, no es link. */
  href?: string;
  /** Alt text accesible. */
  alt: string;
  /** Timestamp de creación (ms epoch). */
  createdAt: number;
  /** Orden dentro del carrusel (0..N). */
  order: number;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

export function getHeroImages(): HeroImage[] {
  const arr = safeReadArray<HeroImage>(HERO_IMAGES_KEY);
  return arr.slice().sort((a, b) => a.order - b.order);
}

function persist(images: HeroImage[]): void {
  safeWrite(HERO_IMAGES_KEY, images);
  DataHub.emit("heroImages");
}

export function addHeroImage(input: {
  filename: string;
  dataUrl: string;
  mime: string;
  alt?: string;
  href?: string;
}): HeroImage {
  const list = getHeroImages();
  const img: HeroImage = {
    id: `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    filename: input.filename,
    dataUrl: input.dataUrl,
    mime: input.mime,
    alt: input.alt ?? input.filename,
    href: input.href,
    createdAt: Date.now(),
    order: list.length,
  };
  list.push(img);
  persist(list);
  return img;
}

export function removeHeroImage(id: string): void {
  const list = getHeroImages()
    .filter((x) => x.id !== id)
    .map((x, i) => ({ ...x, order: i }));
  persist(list);
}

export function updateHeroImage(
  id: string,
  patch: Partial<Pick<HeroImage, "alt" | "href" | "order">>,
): void {
  const list = getHeroImages().map((x) => (x.id === id ? { ...x, ...patch } : x));
  persist(list.sort((a, b) => a.order - b.order));
}

export function reorderHeroImages(orderedIds: string[]): void {
  const map = new Map(getHeroImages().map((x) => [x.id, x]));
  const reordered: HeroImage[] = [];
  orderedIds.forEach((id, i) => {
    const it = map.get(id);
    if (it) reordered.push({ ...it, order: i });
  });
  persist(reordered);
}

export function clearHeroImages(): void {
  safeRemove(HERO_IMAGES_KEY);
  DataHub.emit("heroImages");
}

// ─── Helper: leer un File como dataURL ────────────────────────────────────

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
