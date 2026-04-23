"use client";
import Link from "next/link";
import {
  ShoppingCart,
  Heart,
  Plus,
  Minus,
  Trash2,
  Check,
  Bell,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { subscribeRestock, isSubscribed, triggerRestockEmails, getSubsForProduct } from "@/services/restockService";
import { addToRecentlyViewed } from "@/lib/recentlyViewed";
import { getStockInfo, getEffectiveStock, isProductInStock } from "@/utils/stockStatus";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import {
  isNewProduct,
  type LocalProduct,
  GAME_CONFIG,
  CARD_CATEGORIES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
} from "@/data/products";
import { getMergedProducts, getMergedById, getProductUrl } from "@/lib/productStore";
import { persistProductPatch } from "@/lib/productPersist";
import { SetHighlightCards } from "@/components/product/SetHighlightCards";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { DiscountBadgeEdit } from "@/components/ui/DiscountBadgeEdit";
import { usePrice } from "@/hooks/usePrice";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { HoloCard } from "@/components/product/HoloCard";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { clickableProps } from "@/lib/a11y";

interface GameConfig {
  name: string;
  color: string;
  bgColor: string;
  description: string;
  emoji: string;
}

interface Props {
  product: LocalProduct;
  config: GameConfig;
  catLabel: string;
}

// Find same product in other languages (same game + category + slug base)
// Sorted: in-stock first, then by priority (ES > EN > JP > KO > rest)
const LANG_PRIORITY: Record<string, number> = { ES: 0, EN: 1, JP: 2, KO: 3, FR: 4, DE: 5, IT: 6, PT: 7 };

function getLangVariants(product: LocalProduct) {
  if (!product.language) return [];
  const base = product.slug.replace(/-(?:es|en|jp|fr|de|it|ko|pt)$/i, "");
  return getMergedProducts()
    .filter(
      (p) =>
        p.game === product.game &&
        p.category === product.category &&
        p.id !== product.id &&
        p.language !== product.language &&
        p.slug.replace(/-(?:es|en|jp|fr|de|it|ko|pt)$/i, "") === base,
    )
    .sort((a, b) => {
      // In-stock first, then by language priority
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      return (LANG_PRIORITY[a.language] ?? 99) - (LANG_PRIORITY[b.language] ?? 99);
    })
    .slice(0, 6);
}

// Find related products from same game
function getRelated(product: LocalProduct) {
  return getMergedProducts()
    .filter(
      (p) => p.game === product.game && p.id !== product.id && p.inStock,
    )
    .slice(0, 4);
}

// ── Admin inline price row ────────────────────────────────────────────────────

function AdminPriceRow({
  label,
  value,
  onSave,
  color,
  editMode,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
  color: string;
  editMode: boolean;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [focused, setFocused] = useState(false);

  // Mantén draft sincronizado con `value` SOLO si el input no está enfocado.
  // Fix 2026-04-22: antes el effect machacaba lo que el usuario tecleaba —
  // cada keystroke disparaba onSave → re-render del padre → effect reseteaba
  // draft a `value.toFixed(2)` haciendo imposible escribir cifras de varios
  // dígitos. Ahora el save ocurre solo en blur/Enter.
  useEffect(() => {
    if (focused) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización externa controlada: solo actualiza draft cuando el input NO está enfocado
    setDraft(value.toFixed(2));
  }, [value, focused]);

  const commit = () => {
    const n = parseFloat(draft.replace(",", "."));
    if (!isNaN(n) && n > 0) {
      onSave(n);
      setDraft(n.toFixed(2));
    } else {
      setDraft(value.toFixed(2));
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold" style={{ color }}>
        {label}
      </span>
      {editMode ? (
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(value.toFixed(2));
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-24 rounded border border-[#2563eb] px-1.5 py-0.5 text-right font-mono text-sm focus:outline-none"
        />
      ) : (
        <span className="text-sm font-bold" style={{ color }}>
          {value.toFixed(2)}€
        </span>
      )}
    </div>
  );
}

// ── Price display ─────────────────────────────────────────────────────────────

function PriceDisplay({
  product,
  color,
  inlinePrice,
  onPriceChange,
  inlineWholesalePrice,
  onWholesalePriceChange,
  inlineStorePrice,
  onStorePriceChange,
  inlineComparePrice,
  onComparePriceChange,
  inlineCostPrice,
  onCostPriceChange,
  editMode,
}: {
  product: LocalProduct;
  color: string;
  inlinePrice: number;
  onPriceChange: (v: string) => void;
  inlineWholesalePrice: number;
  onWholesalePriceChange: (v: number) => void;
  inlineStorePrice: number;
  onStorePriceChange: (v: number) => void;
  inlineComparePrice: number | undefined;
  onComparePriceChange: (v: number | undefined) => void;
  inlineCostPrice: number;
  onCostPriceChange: (v: number) => void;
  editMode: boolean;
}) {
  const { role } = useAuth();
  const {
    displayPrice,
    comparePrice: origComparePrice,
    hasDiscount: _hasDiscount,
    discountPct: origDiscountPct,
    etiquetaRol,
    retailPrice,
    wholesaleRef,
  } = usePrice(product);

  const isAdmin = role === "admin";
  const isB2B = role === "mayorista" || role === "tienda";
  const effectiveComparePrice = isAdmin ? inlineComparePrice : origComparePrice;
  const effectiveHasDiscount =
    effectiveComparePrice !== undefined && effectiveComparePrice > displayPrice;
  const effectiveDiscountPct = effectiveHasDiscount
    ? Math.round((1 - displayPrice / (effectiveComparePrice ?? 1)) * 100)
    : origDiscountPct;

  if (isAdmin) {
    return (
      <div className="space-y-3">
        {/* Big PV Público */}
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-2xl font-bold" style={{ color }}>
            <InlineEdit
              type="number"
              step="0.01"
              min="0"
              value={inlinePrice}
              onSave={onPriceChange}
              toastMessage="PV Público actualizado"
              className="inline-flex"
            >
              {inlinePrice.toFixed(2)}€
            </InlineEdit>
          </span>
          {effectiveHasDiscount && (
            <span className="mb-1 text-base text-gray-400 line-through">
              {(effectiveComparePrice ?? 0).toFixed(2)}€
            </span>
          )}
          <span className="mb-1">
            <DiscountBadgeEdit
              displayPrice={inlinePrice}
              comparePrice={inlineComparePrice}
              onSave={onComparePriceChange}
              badgeClassName="inline-flex items-center bg-red-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-lg shadow-sm"
            />
          </span>
        </div>

        {/* Editable price breakdown */}
        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <AdminPriceRow label="PV Público" value={inlinePrice} onSave={(v) => onPriceChange(String(v))} color="#2563eb" editMode={editMode} />
          <div className="border-t border-gray-200" />
          <AdminPriceRow label="PV Mayorista" value={inlineWholesalePrice} onSave={onWholesalePriceChange} color="#1d4ed8" editMode={editMode} />
          <div className="border-t border-gray-200" />
          <AdminPriceRow label="PV Tiendas" value={inlineStorePrice} onSave={onStorePriceChange} color="#15803d" editMode={editMode} />
          <div className="border-t border-gray-200" />
          <AdminPriceRow label="Precio Adquisición" value={inlineCostPrice} onSave={onCostPriceChange} color="#7c3aed" editMode={editMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {etiquetaRol && (
        <span
          className="mb-1 inline-flex items-center self-start rounded-xl px-3 py-1 text-xs font-bold"
          style={{
            backgroundColor:
              etiquetaRol === "Precio Mayoristas" ? "#1e40af18" : "#15803d18",
            color: etiquetaRol === "Precio Mayoristas" ? "#1e40af" : "#15803d",
          }}
        >
          {etiquetaRol}
        </span>
      )}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {displayPrice.toFixed(2)}€
        </span>
        <span className="text-xs text-gray-400">IVA incluido</span>
        {effectiveHasDiscount && !isB2B && (
          <>
            <span className="text-base text-gray-400 line-through">
              {(effectiveComparePrice ?? 0).toFixed(2)}€
            </span>
            <span
              className="rounded-lg px-1.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: `${color}18`, color }}
            >
              -{effectiveDiscountPct}%
            </span>
          </>
        )}
      </div>
      {/* Savings badge moved to box/pack pills row */}
      {/* Reference prices for privileged roles */}
      {(retailPrice !== undefined || wholesaleRef !== undefined) && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
          {retailPrice !== undefined && (
            <span>
              PV Público:{" "}
              <span className="line-through decoration-gray-400 decoration-[0.75px]">
                {retailPrice.toFixed(2)} €
              </span>
            </span>
          )}
          {wholesaleRef !== undefined && (
            <span>Mayoristas: {wholesaleRef.toFixed(2)} €</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ProductDetailClient({ product: initialProduct, config, catLabel }: Props) {
  // Fix 2026-04-22 — divergencia catálogo↔detalle.
  // La ruta `/[game]/[category]/[slug]` es Server Component y pasa `product`
  // desde `PRODUCTS` (estático) sin mezclar `tcgacademy_product_overrides`.
  // Resultado: el catálogo (que sí usa `getMergedProducts`) mostraba el nombre
  // y precio editados por el admin, pero el detalle mostraba los estáticos.
  // Hidratamos aquí para que TODA la UI del detalle use el producto mergeado.
  // Ver: feedback_catalog_detail_consistency.md + feedback_ssr_override_hydration.md
  const [product, setProduct] = useState<LocalProduct>(initialProduct);
  // Flag anti-loop: cuando persistPatch dispara `tcga:products:updated`
  // este listener NO debe reaccionar (si lo hace, setProduct → product
  // cambia con nueva referencia → sync effect re-dispara → bucle infinito
  // que bloquea la página y hace imposible navegar).
  // Los eventos externos (otras pestañas, otros componentes) siguen
  // llegando vía `storage` o vía `tcga:products:updated` cuando no estamos
  // auto-despachando.
  const isSelfDispatchingRef = useRef(false);
  useEffect(() => {
    const merged = getMergedById(initialProduct.id);
    if (merged) setProduct(merged);
    const onUpdated = () => {
      if (isSelfDispatchingRef.current) return;
      const m = getMergedById(initialProduct.id);
      if (m) setProduct(m);
    };
    window.addEventListener("tcga:products:updated", onUpdated);
    window.addEventListener("storage", onUpdated);
    return () => {
      window.removeEventListener("tcga:products:updated", onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, [initialProduct.id]);

  const { addItem, items, removeItem, updateQty } = useCart();
  const { user } = useAuth();
  const { toggle: toggleFavorite, isFavorite } = useFavorites();
  const { name, color } = config;
  const router = useRouter();
  const langVariants = getLangVariants(product);

  const [added, setAdded] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | undefined>(undefined);
  const [floatAnims, setFloatAnims] = useState<{ type: "plus" | "minus"; key: number }[]>([]);
  const [heartAnimKey, setHeartAnimKey] = useState(0);
  const [restockSubscribed, setRestockSubscribed] = useState(() =>
    user?.email ? isSubscribed(product.id, user.email) : false,
  );
  const [variantRestockIds, setVariantRestockIds] = useState<Set<number>>(() => {
    if (!user?.email) return new Set();
    return new Set(langVariants.filter((v) => !v.inStock && isSubscribed(v.id, user.email)).map((v) => v.id));
  });

  const cartKey = `item_${product.id}`;
  const cartItem = items.find((i) => i.key === cartKey);
  const cartQty = cartItem?.quantity ?? 0;

  const triggerFloat = (type: "plus" | "minus") => {
    const key = Date.now() + Math.random();
    setFloatAnims((prev) => [...prev, { type, key }]);
    setTimeout(() => setFloatAnims((prev) => prev.filter((a) => a.key !== key)), 900);
  };
  const [activeImg, setActiveImg] = useState(0);

  const isOutOfStock = !isProductInStock(product);

  // Track recently viewed
  useEffect(() => {
    addToRecentlyViewed(product.id);
  }, [product.id]);

  // Admin inline edits — local session overrides only (no backend)
  const [inlineTitle, setInlineTitle] = useState(product.name);
  const [inlineDesc, setInlineDesc] = useState(product.description || "");
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const [inlinePrice, setInlinePrice] = useState(product.price);
  const [inlineWholesalePrice, setInlineWholesalePrice] = useState(
    product.wholesalePrice,
  );
  const [inlineStorePrice, setInlineStorePrice] = useState(product.storePrice);
  const [inlineCostPrice, setInlineCostPrice] = useState(
    product.costPrice ?? 0,
  );
  const [inlineComparePrice, setInlineComparePrice] = useState<
    number | undefined
  >(product.comparePrice);
  const [inlineStock] = useState(product.inStock);
  const [inlineStockQty, setInlineStockQty] = useState<string>(
    product.stock !== undefined ? String(product.stock) : "",
  );
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);
  const [inlineImages, setInlineImages] = useState(product.images);
  const [inlineGame] = useState(product.game);
  const [inlineCategory] = useState(product.category);
  const [inlineLanguage] = useState(product.language ?? "");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Sincroniza los inline* con el producto hidratado.
  //
  // ONE-SHOT al montar: initialProduct llega del Server Component (estático,
  // sin overrides aplicados). El useEffect de arriba hidrata product con
  // getMergedById. Cuando eso ocurre, sync TODOS los inline* al merged para
  // cerrar el bug StrixHaven (catálogo 50€, detalle 40€).
  //
  // DESPUÉS de la hidratación NO volvemos a sincronizar automáticamente
  // — cada editor (precios, stock, título, descripción, imágenes) es dueño
  // de su propio campo y persiste directamente vía persistPatch.
  // Si otra pestaña edita el producto, el listener de tcga:products:updated
  // actualiza `product` pero NO machacamos inline* porque el admin podría
  // estar editando localmente.
  //
  // Historia: intentos previos con sync continuo [product, editMode]
  // provocaban machacones entre ciclos de edición y pérdida del valor nuevo
  // justo después de guardar. Ver feedback_controlled_input_loop.md y
  // feedback_catalog_detail_consistency.md.
  const didInitialHydrate = useRef(false);
  useEffect(() => {
    if (didInitialHydrate.current) return;
    if (product === initialProduct) return; // aún no ha hidratado
    didInitialHydrate.current = true;
    setInlineTitle(product.name);
    setInlineDesc(product.description || "");
    setInlinePrice(product.price);
    setInlineWholesalePrice(product.wholesalePrice);
    setInlineStorePrice(product.storePrice);
    setInlineCostPrice(product.costPrice ?? 0);
    setInlineComparePrice(product.comparePrice);
    setInlineStockQty(
      product.stock !== undefined ? String(product.stock) : "",
    );
    setInlineImages(product.images);
  }, [product, initialProduct]);

  // Detect if description overflows line-clamp-3
  useEffect(() => {
    if (!descRef.current || descExpanded) return;
    const el = descRef.current;
    setDescOverflows(el.scrollHeight > el.clientHeight + 2);
  }, [inlineDesc, descExpanded]);

  const isAdmin = user?.role === "admin";
  const isCardCategory = CARD_CATEGORIES.has(product.category);

  const { displayPrice } = usePrice(product);

  // Admin: drag to reorder thumbnails
  const dragIdx = useRef<number | null>(null);
  const handleDragStart = (i: number) => { dragIdx.current = i; };
  const handleDrop = (targetIdx: number) => {
    const from = dragIdx.current;
    if (from === null || from === targetIdx) return;
    const imgs = [...inlineImages];
    const [moved] = imgs.splice(from, 1);
    imgs.splice(targetIdx, 0, moved);
    setInlineImages(imgs);
    persistPatch({ images: imgs });
    setActiveImg(targetIdx);
    dragIdx.current = null;
  };

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const handleAddToCart = () => {
    if (!isProductInStock(product)) return;
    triggerFloat("plus");
    const result = addItem(
      product.id,
      product.name,
      displayPrice,
      product.images[0] ?? "",
    );
    if (result.added) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } else {
      setLimitMsg(result.reason);
      setTimeout(() => setLimitMsg(undefined), 3000);
    }
  };

  const handleGenerateDesc = useCallback(async () => {
    setGeneratingDesc(true);
    try {
      const name = inlineTitle;
      const game = inlineGame;
      const cat = inlineCategory;
      const tags = product.tags;

      // Build a rich description based on product metadata
      const lines: string[] = [];
      const gameName = GAME_CONFIG[game]?.name ?? game;

      if (cat === "booster-box") {
        const packs = product.packsPerBox;
        const cards = product.cardsPerPack;
        lines.push(`${name} — caja de sobres oficial de ${gameName}.`);
        if (packs) lines.push(`Contiene ${packs} sobres${cards ? ` de ${cards} cartas cada uno` : ""}.`);
        lines.push(`Producto sellado de fábrica. Cada sobre incluye cartas de distintas rarezas, con posibilidad de encontrar cartas holográficas, ultra raras y cartas especiales de alto valor para coleccionistas.`);
      } else if (cat === "sobres") {
        const cards = product.cardsPerPack;
        lines.push(`${name} — sobre individual oficial de ${gameName}.`);
        if (cards) lines.push(`Cada sobre contiene ${cards} cartas aleatorias.`);
        lines.push(`Incluye cartas de distintas rarezas. Posibilidad de obtener cartas holográficas, raras y cartas especiales de colección.`);
      } else if (cat === "etb") {
        lines.push(`${name} — Elite Trainer Box oficial de ${gameName}.`);
        lines.push(`Incluye sobres, energías, dados, fundas protectoras y caja de almacenamiento premium. Ideal para jugadores y coleccionistas.`);
      } else if (cat === "starter") {
        lines.push(`${name} — mazo de inicio oficial de ${gameName}.`);
        lines.push(`Mazo preconstruido listo para jugar. Incluye cartas exclusivas y todo lo necesario para empezar a competir.`);
      } else if (cat === "commander") {
        lines.push(`${name} — mazo Commander oficial de ${gameName}.`);
        lines.push(`Mazo de 100 cartas preconstruido para el formato Commander. Incluye cartas exclusivas y nuevas mecánicas.`);
      } else if (cat === "singles" || cat === "gradeadas") {
        lines.push(`${name} — carta individual de ${gameName}.`);
        lines.push(`Carta en perfecto estado, ideal para completar tu colección o mejorar tu mazo competitivo.`);
      } else {
        lines.push(`${name} — producto oficial de ${gameName}.`);
        lines.push(`Producto original sellado de fábrica.`);
      }

      // Add tag-based info
      if (tags.some(t => /collector|premium|foil/i.test(t))) {
        lines.push(`Edición premium con acabados especiales y cartas de alta calidad.`);
      }

      lines.push(`Envío rápido y embalaje protegido para garantizar que tu producto llega en perfectas condiciones.`);

      const generated = lines.join(" ");
      setInlineDesc(generated);
      persistPatch({ description: generated });
    } finally {
      setGeneratingDesc(false);
    }
    // persistPatch se declara más abajo (TDZ). Es estable por useCallback
    // con dep [product.id], así que no añadirlo aquí no causa stale-closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineTitle, inlineGame, inlineCategory, product.tags, product.packsPerBox, product.cardsPerPack]);

  // Persiste UN campo (o varios) del producto, haciendo MERGE con lo que ya
  // había. La lógica canónica vive en `@/lib/productPersist` y distingue
  // automáticamente entre:
  //   - Producto estático (PRODUCTS[]) → escribe a `tcgacademy_product_overrides`
  //   - Producto admin-created → actualiza `tcgacademy_new_products` in-place
  //
  // Por qué esto importa (incidente StrixHaven 6ª iteración 2026-04-22):
  // StrixHaven es admin-created (id > 1.7e12, ruta `/producto/<slug>`).
  // `getMergedProducts` no aplica overrides a admin-created → escribir siempre
  // a "overrides" desde aquí dejaba el precio huérfano. El mismo producto
  // editado desde /admin/precios sí funcionaba porque ese panel SÍ
  // distingue. Centralizamos la lógica en `persistProductPatch`.
  //
  // Por qué merge y no replace: approach anterior (persistOverrides full-state
  // con closure) tenía stale-closure y autosave races. Con persistPatch por
  // campo + valor explícito en el handler + useCallback con dep única estable
  // [product.id], cada editor es idempotente.
  //
  // Ver: feedback_catalog_detail_consistency.md GOTCHA 5.
  const persistPatch = useCallback((patch: Partial<LocalProduct>) => {
    persistProductPatch(product.id, patch);
    // Suprime el listener propio durante el dispatch síncrono para romper
    // el loop persist → evento → setProduct → sync effect → setInline* →
    // persist. Otros listeners (admin/catálogo/carrito) reciben el evento
    // con normalidad.
    isSelfDispatchingRef.current = true;
    window.dispatchEvent(new Event("tcga:products:updated"));
    isSelfDispatchingRef.current = false;
  }, [product.id]);

  // Debounce del título editado para no disparar llamadas de resolución de
  // cartas (Scryfall / TCGDex / etc.) en cada keystroke. 600ms es suficiente
  // para cubrir pausas cortas sin sentirse laggy.
  const [debouncedTitle, setDebouncedTitle] = useState(inlineTitle);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitle(inlineTitle), 600);
    return () => clearTimeout(t);
  }, [inlineTitle]);

  // Producto "editado" con los valores inline — se usa para los consumidores
  // que dependen del contenido (p.ej. SetHighlightCards re-resuelve top cards
  // y colección según el nombre/juego/idioma editados, no el estático).
  // Fix 2026-04-22: al cambiar el título inline las "cartas más cotizadas" y
  // la "colección" seguían apuntando al set del nombre antiguo.
  const editedProduct: LocalProduct = useMemo(
    () => ({
      ...product,
      name: debouncedTitle,
      game: inlineGame,
      category: inlineCategory,
      language: inlineLanguage || product.language,
    }),
    [product, debouncedTitle, inlineGame, inlineCategory, inlineLanguage],
  );

  const handleSave = useCallback(async () => {
    // Pasada DEFENSIVA: garantiza que todos los campos inline actuales
    // queden persistidos, incluso si algún editor (ej. título) no llegó a
    // disparar blur antes del click en Guardar. Como persistPatch hace
    // MERGE (no replace), esto es idempotente y nunca machaca otros campos.
    persistPatch({
      name: inlineTitle,
      description: inlineDesc,
      price: inlinePrice,
      wholesalePrice: inlineWholesalePrice,
      storePrice: inlineStorePrice,
      costPrice: inlineCostPrice,
      comparePrice: inlineComparePrice,
      stock: inlineStockQty.trim() === "" ? undefined : parseInt(inlineStockQty),
      inStock: inlineStockQty.trim() === "" ? inlineStock : parseInt(inlineStockQty) > 0,
      images: inlineImages,
    });

    // Trigger restock emails if product went from out-of-stock to in-stock
    const wasOutOfStock = !isProductInStock(product);
    const nowInStock = inlineStock && (inlineStockQty.trim() === "" || parseInt(inlineStockQty) > 0);
    if (wasOutOfStock && nowInStock && getSubsForProduct(product.id).length > 0) {
      const url = `https://tcgacademy.es${getProductUrl(product)}`;
      const img = product.images[0] ?? "";
      const { sent } = await triggerRestockEmails(product.id, inlineTitle, url, img);
      if (sent > 0) alert(`Restock: ${sent} email(s) de aviso enviados.`);
    }

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
    setEditMode(false);
  }, [
    persistPatch,
    product,
    inlineTitle,
    inlineDesc,
    inlinePrice,
    inlineWholesalePrice,
    inlineStorePrice,
    inlineCostPrice,
    inlineComparePrice,
    inlineStock,
    inlineStockQty,
    inlineImages,
  ]);

  const handleDelete = useCallback(() => {
    const deleted = JSON.parse(
      localStorage.getItem("tcgacademy_deleted_products") ?? "[]",
    ) as number[];
    if (!deleted.includes(product.id)) deleted.push(product.id);
    localStorage.setItem("tcgacademy_deleted_products", JSON.stringify(deleted));
    router.push(`/${product.game}`);
  }, [product.id, product.game, router]);

  const displayImages = inlineImages.length > 0 ? inlineImages : [null];
  const productUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://tcgacademy.es/${product.game}/${product.category}/${product.slug}`;
  const related = getRelated(product);

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-1 pb-4 sm:px-8 sm:py-4 lg:px-10">
      {/* Confirm delete modal */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        type="error"
        title="Eliminar producto"
        message={`¿Seguro que quieres eliminar "${inlineTitle}"? Esta acción no se puede deshacer.`}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={[
          {
            label: "Cancelar",
            onClick: () => setDeleteConfirmOpen(false),
            variant: "secondary" as const,
          },
          {
            label: "Eliminar",
            onClick: () => { setDeleteConfirmOpen(false); handleDelete(); },
            variant: "danger" as const,
          },
        ]}
      />

      {/* Save toast */}
      {savedToast && (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-xl">
          <Check size={15} /> Cambios guardados
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="mb-1 flex flex-wrap items-center gap-2 text-sm leading-tight text-gray-500 sm:mb-2">
        <Link href="/" className="text-[#2563eb] hover:text-[#1d4ed8]">
          Inicio
        </Link>
        <span>/</span>
        <Link href={`/${product.game}`} className="text-[#2563eb] hover:text-[#1d4ed8]">
          {name}
        </Link>
        <span>/</span>
        <Link
          href={`/${product.game}/${product.category}`}
          className="text-[#2563eb] hover:text-[#1d4ed8]"
        >
          {catLabel}
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-800">
          {product.name}
        </span>
      </nav>

      <div className="mb-4 grid gap-2 md:grid-cols-[45%_1fr] md:gap-6">
        {/* Gallery */}
        <div className="relative">
          <HoloCard
            intensity="full"
            active={isCardCategory}
            className="mb-0 rounded-2xl md:mb-1.5"
          >
            <div
              ref={imgContainerRef}
              {...clickableProps(() => { if (displayImages[activeImg]) setLightboxOpen(true); })}
              className={`group/img relative ${isCardCategory ? "aspect-[2/3] overflow-hidden" : "flex items-center justify-center"} max-h-[510px] cursor-pointer rounded-2xl border border-gray-100 bg-gray-50 select-none`}
            >
              {displayImages[activeImg] ? (
                <InlineEdit
                  type="image"
                  value={displayImages[activeImg]!}
                  onSave={(url) => {
                    const imgs = [...inlineImages];
                    imgs[activeImg] = url;
                    setInlineImages(imgs);
                    persistPatch({ images: imgs });
                  }}
                  className="h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImages[activeImg]!}
                    alt={inlineTitle}
                    className={`pointer-events-none w-full object-contain transition-transform duration-300 group-hover/img:scale-[1.03] ${isCardCategory ? "h-full p-4" : "max-h-[500px] p-2"}`}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.svg"; }}
                  />
                  {/* Ampliar button — aparece al hacer hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxOpen(true);
                    }}
                    aria-label="Ampliar imagen"
                    className="absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/img:opacity-100 hover:bg-black/80"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M9 21H3v-6" />
                      <path d="M21 3l-7 7" />
                      <path d="M3 21l7-7" />
                    </svg>
                    Ampliar
                  </button>
                </InlineEdit>
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center gap-4"
                  style={{
                    background: "#ffffff",
                  }}
                >
                  <span className="text-8xl">{config.emoji}</span>
                  <span
                    className="px-6 text-center text-sm leading-tight font-bold"
                    style={{ color }}
                  >
                    {product.name}
                  </span>
                </div>
              )}
              {/* ── ESQUINA SUPERIOR IZQUIERDA: stock → NUEVO → descuento → corazón ── */}
              <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
                {(() => {
                  const si = getStockInfo(getEffectiveStock(product));
                  if (si.level === "unlimited" || si.level === "available") return null;
                  return (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm ${
                        si.level === "out"
                          ? "bg-gray-500 text-white"
                          : si.level === "last"
                            ? "bg-red-500 text-white"
                            : "bg-amber-500 text-white"
                      }`}
                    >
                      {si.level === "out" ? "AGOTADO" : si.label.toUpperCase()}
                    </span>
                  );
                })()}
                {isNewProduct(product) && (
                  <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                    NUEVO
                  </span>
                )}
                <DiscountBadgeEdit
                  displayPrice={inlinePrice}
                  comparePrice={inlineComparePrice}
                  onSave={(v) => {
                    setInlineComparePrice(v);
                    persistPatch({ comparePrice: v });
                  }}
                  badgeClassName="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm"
                />
                {user && user.role !== "admin" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHeartAnimKey((k) => k + 1);
                      toggleFavorite(product.id);
                    }}
                    aria-label={isFavorite(product.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                    className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
                      isFavorite(product.id)
                        ? "bg-red-500 text-white"
                        : "bg-white/90 text-gray-400 backdrop-blur-sm hover:bg-white hover:text-red-500"
                    }`}
                  >
                    <Heart
                      size={16}
                      className={isFavorite(product.id) ? "fill-white" : ""}
                    />
                  </button>
                )}
              </div>

            </div>
          </HoloCard>
          {inlineImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {inlineImages.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  onClick={() => setActiveImg(i)}
                  draggable={isAdmin}
                  onDragStart={isAdmin ? () => handleDragStart(i) : undefined}
                  onDragOver={isAdmin ? (e) => e.preventDefault() : undefined}
                  onDrop={isAdmin ? () => handleDrop(i) : undefined}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === activeImg
                      ? "border-[#2563eb]"
                      : "border-gray-200 hover:border-gray-300"
                  } ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    loading="lazy"
                    className="pointer-events-none h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.svg"; }}
                  />
                  {isAdmin && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-bold text-white">{i + 1}</span>
                  )}
                </button>
              ))}
            </div>
          )}


        </div>

        {/* Lightbox */}
        {lightboxOpen && displayImages[activeImg] && (
          <div
            {...clickableProps(() => setLightboxOpen(false))}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImages[activeImg]!}
              alt={inlineTitle}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.svg"; }}
            />
            <button
              onClick={() => setLightboxOpen(false)}
              aria-label="Cerrar imagen"
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Buy box */}
        <div className="flex flex-col gap-1.5 sm:gap-2.5">
          {/* 1. Title + admin buttons */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="flex flex-1 items-center gap-2.5 text-xl leading-tight font-bold text-gray-900 md:text-2xl">
              {editMode ? (
                <input
                  type="text"
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
                  onBlur={() => persistPatch({ name: inlineTitle })}
                  className="w-full rounded-lg border border-[#2563eb] px-2 py-0.5 text-xl font-bold focus:outline-none"
                />
              ) : (
                <span>{inlineTitle.replace(/\s*\(\d+\s*(?:cartas|sobres)\)/gi, "")}</span>
              )}
            </h1>
            {isAdmin && (
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-100"
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  onClick={editMode ? handleSave : () => setEditMode(true)}
                  className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 transition hover:bg-green-100"
                >
                  {editMode ? "Guardar" : "Editar"}
                </button>
              </div>
            )}
          </div>

          {/* 2. (moved below stock) */}

          {/* 3. Price */}
          <PriceDisplay
            product={product}
            color={color}
            inlinePrice={inlinePrice}
            onPriceChange={(v) => {
              const next = parseFloat(v) || inlinePrice;
              setInlinePrice(next);
              persistPatch({ price: next });
            }}
            inlineWholesalePrice={inlineWholesalePrice}
            onWholesalePriceChange={(v) => {
              setInlineWholesalePrice(v);
              persistPatch({ wholesalePrice: v });
            }}
            inlineStorePrice={inlineStorePrice}
            onStorePriceChange={(v) => {
              setInlineStorePrice(v);
              persistPatch({ storePrice: v });
            }}
            inlineComparePrice={inlineComparePrice}
            onComparePriceChange={(v) => {
              setInlineComparePrice(v);
              persistPatch({ comparePrice: v });
            }}
            inlineCostPrice={inlineCostPrice}
            onCostPriceChange={(v) => {
              setInlineCostPrice(v);
              persistPatch({ costPrice: v });
            }}
            editMode={editMode}
          />

          {/* 4. Stock */}
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const stockNum = inlineStockQty.trim() === "" ? undefined : parseInt(inlineStockQty);
              const si = getStockInfo(inlineStock ? stockNum : 0);
              return (
                <>
                  <div className={`inline-flex items-center gap-2 text-sm font-semibold ${si.color}`}>
                    <span className="relative flex h-2 w-2">
                      {si.pulse && (
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${si.dotColor}`} />
                      )}
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${si.dotColor}`} />
                    </span>
                    {si.label}
                  </div>
                  {/* Cantidad exacta — editable SOLO admin.
                      En editMode (botón Editar pulsado) se muestra input directo
                      igual que las filas de precio: evitar un 2º click al lápiz.
                      Fuera de editMode, InlineEdit con lápiz-hover para edición rápida puntual. */}
                  {isAdmin && editMode ? (
                    <span className={`text-2xl font-bold ${si.color}`}>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={inlineStockQty}
                        onChange={(e) => setInlineStockQty(e.target.value)}
                        onBlur={() => {
                          const trimmed = inlineStockQty.trim();
                          if (trimmed === "") {
                            persistPatch({ stock: undefined });
                            return;
                          }
                          const n = parseInt(trimmed);
                          const clamped = isNaN(n) || n < 0 ? 0 : n;
                          setInlineStockQty(String(clamped));
                          persistPatch({ stock: clamped, inStock: clamped > 0 });
                        }}
                        className={`w-24 rounded border border-current bg-white px-2 py-0.5 text-right font-mono text-2xl font-bold focus:outline-none ${si.color}`}
                        aria-label="Unidades en stock"
                      />
                      <span className="ml-1 text-2xl font-bold">ud.</span>
                    </span>
                  ) : isAdmin ? (
                    <span className={`text-2xl font-bold ${si.color}`}>
                      <InlineEdit
                        type="number"
                        step="1"
                        min="0"
                        value={stockNum ?? ""}
                        onSave={(v) => {
                          const trimmed = v.trim();
                          if (trimmed === "") {
                            setInlineStockQty("");
                            persistPatch({ stock: undefined });
                            return;
                          }
                          const n = parseInt(trimmed);
                          const clamped = isNaN(n) || n < 0 ? 0 : n;
                          setInlineStockQty(String(clamped));
                          persistPatch({ stock: clamped, inStock: clamped > 0 });
                        }}
                        toastMessage="Stock actualizado"
                        className="inline-flex"
                      >
                        {stockNum !== undefined ? `${stockNum} ud.` : "— ud."}
                      </InlineEdit>
                    </span>
                  ) : null}
                </>
              );
            })()}
          </div>

          {/* 4b. Language flags + Box/Pack pills */}
          {(() => {
            const linkedId = product.linkedPackId ?? product.linkedBoxId;
            const linked = linkedId ? getMergedById(linkedId) : null;
            const hasFlags = !!product.language && !editMode;
            const hasPills = linked != null;
            const hasVariants = langVariants.length > 0;
            if (!hasFlags && !hasPills) return null;

            const pillBase = "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold sm:py-1";
            const pillActive = `${pillBase} border-gray-900 text-gray-900`;
            const pillInactive = `${pillBase} border-gray-200 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-700`;

            return (
              <div className="flex flex-col gap-2">
                {/* Row 1: language flags */}
                {hasFlags && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Current product flag — black border */}
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-900 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 sm:py-1">
                      <LanguageFlag language={product.language} size="md" bare />
                      <span>{LANGUAGE_NAMES[product.language.toUpperCase()] ?? product.language}</span>
                    </span>
                    {/* Variant flags — gray border */}
                    {hasVariants && langVariants.map((v) => {
                      const vOut = !v.inStock;
                      const vSubscribed = variantRestockIds.has(v.id);

                      if (vOut) {
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              if (vSubscribed) return;
                              const email = user?.email ?? prompt("Tu email para avisarte:");
                              if (!email) return;
                              const name = user?.name ?? email.split("@")[0];
                              subscribeRestock(v.id, v.name, email, name);
                              setVariantRestockIds((prev) => { const next = new Set(prev); next.add(v.id); return next; });
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1.5 text-xs font-semibold transition sm:py-1 ${
                              vSubscribed
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-gray-200 bg-gray-50 text-gray-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600"
                            }`}
                          >
                            <LanguageFlag language={v.language} size="md" bare />
                            {vSubscribed ? (
                              <>
                                <span>Te avisaremos</span>
                                <Bell size={11} className="fill-amber-500 text-amber-500" />
                              </>
                            ) : (
                              <>
                                <span>Agotado</span>
                                <Bell size={11} className="text-gray-300" />
                              </>
                            )}
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={v.id}
                          href={`/${v.game}/${v.category}/${v.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-gray-400 hover:text-gray-700 sm:py-1"
                        >
                          <LanguageFlag language={v.language} size="md" bare />
                          <span>{LANGUAGE_NAMES[v.language?.toUpperCase()] ?? v.language}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {/* Row 2: Box/Pack pills */}
                {hasPills && linked && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {(() => {
                      const isBox = product.category === "booster-box";
                      const linkedHref = `/${linked.game}/${linked.category}/${linked.slug}`;
                      const boxProduct = isBox ? product : linked;
                      const packProduct = isBox ? linked : product;
                      const boxHref = isBox ? "#" : linkedHref;
                      const packHref = isBox ? linkedHref : "#";
                      const boxLabel = `📦 Caja${boxProduct.packsPerBox ? ` · ${boxProduct.packsPerBox} sobres` : ""}`;
                      const packLabel = `🃏 Sobre${packProduct.cardsPerPack ? ` · ${packProduct.cardsPerPack} cartas` : ""}`;
                      // Savings: only when viewing a box with linked pack
                      const savingsEl = isBox && product.packsPerBox ? (() => {
                        const packPrice = linked.price * product.packsPerBox;
                        const saved = packPrice - product.price;
                        if (saved <= 0) return null;
                        const pct = Math.round((saved / packPrice) * 100);
                        return (
                          <span className="text-xs font-semibold text-green-600">
                            Ahorras {saved.toFixed(2)}€ ({pct}%) vs comprar los sobres sueltos
                          </span>
                        );
                      })() : null;
                      return (
                        <>
                          {isBox ? (
                            <span className={pillActive}>{boxLabel}</span>
                          ) : (
                            <Link href={boxHref} className={pillInactive}>{boxLabel}</Link>
                          )}
                          {!isBox ? (
                            <span className={pillActive}>{packLabel}</span>
                          ) : (
                            <Link href={packHref} className={pillInactive}>{packLabel}</Link>
                          )}
                          {savingsEl}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 4c. Admin — crear producto derivado / superior / paralelo */}
          {isAdmin && (() => {
            const canCreatePack =
              product.category === "booster-box" && !product.linkedPackId;
            const canCreateBox =
              product.category === "sobres" && !product.linkedBoxId;
            const existingLangs = new Set<string>([
              (product.language ?? "").toUpperCase(),
              ...langVariants.map((v) => (v.language ?? "").toUpperCase()),
            ]);
            const missingLangs = Object.keys(LANGUAGE_FLAGS).filter(
              (l) => !existingLangs.has(l),
            );
            if (!canCreatePack && !canCreateBox && missingLangs.length === 0) return null;

            const baseBtn =
              "inline-flex items-center gap-1.5 rounded-full border-2 border-dashed px-3 py-1.5 text-xs font-semibold transition sm:py-1";
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-2.5">
                {canCreatePack && (
                  <Link
                    href={`/admin/productos/nuevo?derivedFrom=${product.id}&mode=pack`}
                    className={`${baseBtn} border-blue-300 bg-white text-blue-700 hover:border-blue-500 hover:bg-blue-50`}
                  >
                    <Plus size={12} /> Sobre suelto
                  </Link>
                )}
                {canCreateBox && (
                  <Link
                    href={`/admin/productos/nuevo?derivedFrom=${product.id}&mode=box`}
                    className={`${baseBtn} border-blue-300 bg-white text-blue-700 hover:border-blue-500 hover:bg-blue-50`}
                  >
                    <Plus size={12} /> Caja de sobres
                  </Link>
                )}
                {missingLangs.length > 0 && (
                  <div className="relative">
                    <select
                      aria-label="Duplicar en otro idioma"
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        router.push(
                          `/admin/productos/nuevo?derivedFrom=${product.id}&mode=lang&lang=${v}`,
                        );
                      }}
                      className={`${baseBtn} cursor-pointer appearance-none border-blue-300 bg-white pr-7 text-blue-700 hover:border-blue-500 hover:bg-blue-50`}
                    >
                      <option value="" disabled>
                        + Otro idioma
                      </option>
                      {missingLangs.map((l) => (
                        <option key={l} value={l}>
                          {LANGUAGE_FLAGS[l]} {LANGUAGE_NAMES[l] ?? l}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 5. Description */}
          <div
            className="border-l-4 pl-4"
            style={{ borderColor: `${color}60` }}
          >
            <div
              ref={descRef}
              className={`overflow-hidden text-sm leading-snug text-gray-600 text-justify transition-all ${descExpanded ? "" : "line-clamp-3"}`}
            >
              {editMode ? (
                <>
                  <textarea
                    value={inlineDesc}
                    onChange={(e) => setInlineDesc(e.target.value)}
                    onBlur={() => persistPatch({ description: inlineDesc })}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[#2563eb] px-2 py-1 text-sm leading-snug text-gray-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateDesc}
                    disabled={generatingDesc}
                    className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    {generatingDesc ? "Generando..." : "Generar descripción"}
                  </button>
                </>
              ) : (
                inlineDesc
              )}
            </div>
            {(descOverflows || descExpanded) && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-1 text-xs font-semibold hover:underline"
                style={{ color }}
              >
                {descExpanded ? "Leer menos" : "Leer más"}
              </button>
            )}
          </div>

          {/* 6. Add to cart + favorite */}
          <div className="mt-1 flex flex-col gap-2">
            <div className="relative flex items-center gap-2">
              {/* Float animations */}
              <style>{`
                @keyframes detailFloatUp {
                  0% { opacity: 1; transform: translateY(0) scale(1); }
                  70% { opacity: 1; }
                  100% { opacity: 0; transform: translateY(-32px) scale(1); }
                }
                @keyframes detailScaleIn {
                  0% { transform: scale(0.5); opacity: 0; }
                  50% { transform: scale(1.08); }
                  100% { transform: scale(1); opacity: 1; }
                }
                @keyframes heartPop {
                  0% { transform: scale(1); }
                  30% { transform: scale(1.35); }
                  60% { transform: scale(0.9); }
                  100% { transform: scale(1); }
                }
              `}</style>
              {/* Float animations are rendered inside the counter below */}

              {/* Cart button — flex-1 on mobile, fixed min on desktop */}
              <div className="min-w-0 flex-1 sm:min-w-[240px] sm:flex-none" style={{ animation: cartQty === 1 && added ? "detailScaleIn 0.3s ease-out" : "none" }}>
                {isOutOfStock ? (
                  restockSubscribed ? (
                    <button
                      disabled
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-bold text-green-600"
                    >
                      <Check size={15} /> Te avisaremos
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const email = user?.email ?? prompt("Tu email para avisarte:");
                        if (!email) return;
                        const name = user?.name ?? email.split("@")[0];
                        subscribeRestock(product.id, product.name, email, name);
                        setRestockSubscribed(true);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-200 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 active:scale-[0.97]"
                    >
                      <Bell size={15} /> Avisarme cuando haya stock
                    </button>
                  )
                ) : cartQty > 0 ? (
                  <div className="relative flex w-full items-center justify-center overflow-visible rounded-xl border-2 border-[#2563eb]/30 bg-white shadow-sm">
                    <button
                      onClick={() => {
                        triggerFloat("minus");
                        if (cartQty <= 1) removeItem(cartKey);
                        else updateQty(cartKey, cartQty - 1);
                      }}
                      className="flex h-10 flex-1 items-center justify-center rounded-l-xl text-gray-700 transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
                      aria-label={cartQty <= 1 ? "Eliminar del carrito" : "Quitar uno"}
                    >
                      {cartQty <= 1 ? <Trash2 size={14} /> : <Minus size={15} />}
                    </button>
                    <span className="relative flex h-10 min-w-[48px] items-center justify-center border-x border-gray-100 px-3 text-sm font-bold text-gray-900">
                      {cartQty}
                      {/* Float animations — between qty and + button */}
                      {floatAnims.map((anim, i) => (
                        <span
                          key={anim.key}
                          className="pointer-events-none absolute right-0 bottom-full z-20 text-base font-black"
                          style={{
                            color: anim.type === "plus" ? "#22c55e" : "#f87171",
                            WebkitTextStroke: "0.3px rgba(150,150,150,0.35)",
                            textShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            animation: "detailFloatUp 0.9s ease-out forwards",
                            marginRight: i % 2 !== 0 ? "-8px" : "4px",
                          }}
                        >
                          {anim.type === "plus" ? "+1" : "\u22121"}
                        </span>
                      ))}
                    </span>
                    <button
                      onClick={handleAddToCart}
                      className="flex h-10 flex-1 items-center justify-center text-gray-700 transition-all duration-150 hover:bg-green-50 hover:text-green-600 active:scale-90"
                      aria-label="Añadir uno más"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:bg-[#1d4ed8] hover:shadow-xl active:scale-[0.97]"
                  >
                    <ShoppingCart size={15} /> Añadir al carrito
                  </button>
                )}
              </div>

              {/* Favorite — circular button (desktop only; on mobile use heart in image corner) */}
              <button
                onClick={() => {
                  setHeartAnimKey((k) => k + 1);
                  toggleFavorite(product.id);
                }}
                aria-label={isFavorite(product.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                className={`hidden h-10 w-10 items-center justify-center rounded-full transition-all duration-300 sm:flex ${
                  isFavorite(product.id)
                    ? "bg-red-50 text-red-500 shadow-md"
                    : "bg-gray-100 text-gray-400 hover:text-red-400 hover:bg-red-50"
                }`}
              >
                <Heart
                  key={heartAnimKey}
                  size={16}
                  fill={isFavorite(product.id) ? "#ef4444" : "none"}
                  color={isFavorite(product.id) ? "#ef4444" : "currentColor"}
                  style={{ animation: heartAnimKey > 0 ? "heartPop 0.4s ease-out" : "none" }}
                />
              </button>

            </div>
            {(() => {
              const who = user?.role === "mayorista" ? "mayorista" : user?.role === "tienda" ? "tienda" : "cliente";
              const limit =
                user?.role === "mayorista"
                  ? product.maxPerWholesaler
                  : user?.role === "tienda"
                    ? product.maxPerStore
                    : product.maxPerClient;
              const effectiveLimit = typeof limit === "number" ? limit : product.maxPerUser;
              return typeof effectiveLimit === "number" ? (
                <p className="text-xs text-gray-500">
                  Máx. {effectiveLimit} uds/{who} (acumulado histórico)
                </p>
              ) : null;
            })()}
            {limitMsg && (
              <p className="text-xs font-semibold text-red-500">{limitMsg}</p>
            )}
          </div>

          {/* 7. Payment + Shipping + points */}
          <div className="-mt-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-start gap-3">
              {/* Left: payment */}
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-green-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  <span>Pago 100% seguro</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {[
                    { src: "/images/payment/paypal.svg", alt: "PayPal", h: "h-8" },
                    { src: "/images/payment/bizum.svg", alt: "Bizum", h: "h-8" },
                    { src: "/images/payment/visa.svg", alt: "Visa", h: "h-8" },
                    { src: "/images/payment/mastercard.svg", alt: "Mastercard", h: "h-9" },
                  ].map(({ src, alt, h }) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt={alt} className={`${h} w-auto rounded-md border border-gray-200 bg-white p-1`} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-1.5 border-t border-gray-100 pt-1.5">
              <div className="flex items-center gap-1.5 text-xs text-amber-700">
                <span className="inline-block animate-star-glow text-base leading-none text-amber-300/80">★</span>
                <span>
                  Consigue <strong>{Math.round(displayPrice * 100)}</strong> puntos con esta compra
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Compra y consigue puntos para ti y tus amigos.{" "}
                <Link href="/puntos" className="font-semibold text-[#2563eb] hover:underline">¿Cómo funcionan?</Link>
              </p>
            </div>
          </div>

          {/* Share */}
          <div className="-mt-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5">
            <ShareButtons url={productUrl} title={inlineTitle} />
          </div>

        </div>
      </div>

      {/* Best cards — full width */}
      {(product.category === "booster-box" || product.category === "sobres") && (
        <SetHighlightCards product={editedProduct} />
      )}



      {/* Box ↔ Pack link removed — info already shown in buy box pills */}

      {/* Cross-sell */}
      {related.length > 0 && (
        <section className="mt-10 mb-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {related.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      <RecentlyViewedSection excludeId={product.id} />
    </div>
  );
}
