"use client";
import Link from "next/link";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  Plus,
  Minus,
  Trash2,
  Clock,
  Check,
  Bell,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { subscribeRestock, isSubscribed, triggerRestockEmails, getSubsForProduct } from "@/services/restockService";
import { addToRecentlyViewed } from "@/lib/recentlyViewed";
import { getStockInfo } from "@/utils/stockStatus";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import {
  isNewProduct,
  type LocalProduct,
  GAME_CONFIG,
  CATEGORY_LABELS,
  CARD_CATEGORIES,
  LANGUAGE_NAMES,
} from "@/data/products";
import { getMergedProducts, getMergedById } from "@/lib/productStore";
import { SetHighlightCards } from "@/components/product/SetHighlightCards";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { DiscountBadgeEdit } from "@/components/ui/DiscountBadgeEdit";
import { usePrice } from "@/hooks/usePrice";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { SITE_CONFIG } from "@/config/siteConfig";
import { HoloCard } from "@/components/product/HoloCard";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

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
    .slice(0, 4);
}

// Find related products from same game
function getRelated(product: LocalProduct) {
  return getMergedProducts()
    .filter(
      (p) => p.game === product.game && p.id !== product.id && p.inStock,
    )
    .sort(() => 0)
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

  // keep draft in sync when value changes externally
  useEffect(() => {
    setDraft(value.toFixed(2));
  }, [value]);

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
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (!isNaN(n) && n > 0) onSave(n);
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
    hasDiscount: _origHasDiscount,
    discountPct: origDiscountPct,
    etiquetaRol,
    retailPrice,
    wholesaleRef,
  } = usePrice(product);

  const isAdmin = role === "admin";
  const effectiveComparePrice = isAdmin ? inlineComparePrice : origComparePrice;
  const effectiveHasDiscount =
    effectiveComparePrice !== undefined && effectiveComparePrice > displayPrice;
  const effectiveDiscountPct = effectiveHasDiscount
    ? Math.round((1 - displayPrice / effectiveComparePrice!) * 100)
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
              {effectiveComparePrice!.toFixed(2)}€
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
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {displayPrice.toFixed(2)}€
        </span>
        <span className="mb-0.5 text-xs text-gray-400">IVA incl.</span>
        {effectiveHasDiscount && (
          <>
            <span className="mb-0.5 text-base text-gray-400 line-through">
              {effectiveComparePrice!.toFixed(2)}€
            </span>
            <span
              className="mb-0.5 rounded-lg px-1.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: `${color}18`, color }}
            >
              -{effectiveDiscountPct}%
            </span>
          </>
        )}
      </div>
      {/* Reference prices for privileged roles */}
      {(retailPrice !== undefined || wholesaleRef !== undefined) && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
          {retailPrice !== undefined && (
            <span>PV Público: {retailPrice.toFixed(2)} €</span>
          )}
          {wholesaleRef !== undefined && (
            <span>Mayoristas: {wholesaleRef.toFixed(2)} €</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ProductDetailClient({ product, config, catLabel }: Props) {
  const { addItem, items, removeItem, updateQty } = useCart();
  const { user } = useAuth();
  const { toggle: toggleFavorite, isFavorite } = useFavorites();
  const { name, color, bgColor: _bgColor2 } = config;
  const router = useRouter();

  const [added, setAdded] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | undefined>(undefined);
  const [floatAnims, setFloatAnims] = useState<{ type: "plus" | "minus"; key: number }[]>([]);
  const [heartAnimKey, setHeartAnimKey] = useState(0);
  const [restockSubscribed, setRestockSubscribed] = useState(() =>
    user?.email ? isSubscribed(product.id, user.email) : false,
  );

  const cartKey = `item_${product.id}`;
  const cartItem = items.find((i) => i.key === cartKey);
  const cartQty = cartItem?.quantity ?? 0;

  const triggerFloat = (type: "plus" | "minus") => {
    const key = Date.now() + Math.random();
    setFloatAnims((prev) => [...prev, { type, key }]);
    setTimeout(() => setFloatAnims((prev) => prev.filter((a) => a.key !== key)), 900);
  };
  const [activeImg, setActiveImg] = useState(0);

  const isOutOfStock = !product.inStock || (typeof product.stock === "number" && product.stock === 0);

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
  const [inlineStock, setInlineStock] = useState(product.inStock);
  const [inlineStockQty, setInlineStockQty] = useState<string>(
    product.stock !== undefined ? String(product.stock) : "",
  );
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);
  const [inlineImages, setInlineImages] = useState(product.images);
  const [inlineGame, setInlineGame] = useState(product.game);
  const [inlineCategory, setInlineCategory] = useState(product.category);
  const [inlineLanguage, setInlineLanguage] = useState(product.language ?? "");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Detect if description overflows line-clamp-5
  useEffect(() => {
    if (!descRef.current || descExpanded) return;
    const el = descRef.current;
    setDescOverflows(el.scrollHeight > el.clientHeight + 2);
  }, [inlineDesc, descExpanded]);

  const isAdmin = user?.role === "admin";
  const isCardCategory = CARD_CATEGORIES.has(product.category);

  const { displayPrice } = usePrice(product);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const handleAddToCart = () => {
    if (!product.inStock) return;
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

      setInlineDesc(lines.join(" "));
    } finally {
      setGeneratingDesc(false);
    }
  }, [inlineTitle, inlineGame, inlineCategory, product.tags, product.packsPerBox, product.cardsPerPack]);

  const handleSave = useCallback(() => {
    const overrides = JSON.parse(
      localStorage.getItem("tcgacademy_product_overrides") ?? "{}",
    );
    overrides[product.id] = {
      name: inlineTitle,
      description: inlineDesc,
      game: inlineGame,
      category: inlineCategory,
      language: inlineLanguage || undefined,
      price: inlinePrice,
      wholesalePrice: inlineWholesalePrice,
      storePrice: inlineStorePrice,
      costPrice: inlineCostPrice,
      comparePrice: inlineComparePrice,
      inStock: inlineStock,
      stock: inlineStockQty.trim() === "" ? undefined : parseInt(inlineStockQty),
      images: inlineImages,
    };
    localStorage.setItem(
      "tcgacademy_product_overrides",
      JSON.stringify(overrides),
    );
    // Also save stock override
    const stockOverrides = JSON.parse(localStorage.getItem("tcgacademy_stock_overrides") ?? "{}");
    stockOverrides[product.id] = inlineStockQty.trim() === "" ? null : parseInt(inlineStockQty);
    localStorage.setItem("tcgacademy_stock_overrides", JSON.stringify(stockOverrides));
    window.dispatchEvent(new Event("tcga:products:updated"));

    // Trigger restock emails if product went from out-of-stock to in-stock
    const wasOutOfStock = !product.inStock || (typeof product.stock === "number" && product.stock === 0);
    const nowInStock = inlineStock && (inlineStockQty.trim() === "" || parseInt(inlineStockQty) > 0);
    if (wasOutOfStock && nowInStock && getSubsForProduct(product.id).length > 0) {
      const url = `https://tcgacademy.es/producto?id=${product.id}`;
      const img = product.images[0] ?? "";
      const { sent } = triggerRestockEmails(product.id, inlineTitle, url, img);
      if (sent > 0) alert(`Restock: ${sent} email(s) de aviso enviados.`);
    }

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
    setEditMode(false);
  }, [product.id, inlineTitle, inlineDesc, inlineGame, inlineCategory, inlineLanguage, inlinePrice, inlineWholesalePrice, inlineStorePrice, inlineCostPrice, inlineComparePrice, inlineStock, inlineStockQty, inlineImages]);

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
  const langVariants = getLangVariants(product);
  const related = getRelated(product);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-4 sm:px-6 lg:px-12">
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
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#2563eb]">
          Inicio
        </Link>
        <span>/</span>
        <Link href={`/${product.game}`} className="hover:text-[#2563eb]">
          {name}
        </Link>
        <span>/</span>
        <Link
          href={`/${product.game}/${product.category}`}
          className="hover:text-[#2563eb]"
        >
          {catLabel}
        </Link>
        <span>/</span>
        <span className="max-w-[200px] truncate font-medium text-gray-800">
          {product.name}
        </span>
      </nav>

      <div className="mb-8 grid gap-6 md:grid-cols-[45%_1fr]">
        {/* Gallery */}
        <div className="relative">
          <HoloCard
            intensity="full"
            active={isCardCategory}
            className="mb-3 rounded-2xl"
          >
            <div
              ref={imgContainerRef}
              className={`group/img relative ${isCardCategory ? "aspect-[2/3]" : ""} max-h-[600px] cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 select-none`}
              onClick={() => displayImages[activeImg] && setLightboxOpen(true)}
            >
              {displayImages[activeImg] ? (
                <InlineEdit
                  type="image"
                  value={displayImages[activeImg]!}
                  onSave={(url) => {
                    const imgs = [...inlineImages];
                    imgs[activeImg] = url;
                    setInlineImages(imgs);
                  }}
                  className="h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImages[activeImg]!}
                    alt={inlineTitle}
                    className={`pointer-events-none h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-[1.03] ${isCardCategory ? "p-4" : "p-2"}`}
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
              {/* ── ESQUINA SUPERIOR IZQUIERDA: corazón + badges ── */}
              <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
                {user && user.role !== "admin" && (
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    aria-label={
                      isFavorite(product.id)
                        ? "Quitar de favoritos"
                        : "Añadir a favoritos"
                    }
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
                {isNewProduct(product) && (
                  <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                    NUEVO
                  </span>
                )}
                <DiscountBadgeEdit
                  displayPrice={inlinePrice}
                  comparePrice={inlineComparePrice}
                  onSave={setInlineComparePrice}
                  badgeClassName="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm"
                />
              </div>

            </div>
          </HoloCard>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === activeImg
                      ? "border-[#2563eb]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Best cards from this set — below image */}
          {(product.category === "booster-box" || product.category === "sobres") && (
            <SetHighlightCards product={product} />
          )}
        </div>

        {/* Lightbox */}
        {lightboxOpen && displayImages[activeImg] && (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImages[activeImg]!}
              alt={inlineTitle}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
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
        <div className="flex flex-col gap-3">
          {/* 1. Title + admin buttons */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="flex flex-1 items-center gap-2.5 text-xl leading-tight font-bold text-gray-900 md:text-2xl">
              {product.language && !editMode && (
                <span className="flex-shrink-0">
                  <LanguageFlag language={product.language} size="md" />
                </span>
              )}
              {editMode ? (
                <input
                  type="text"
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
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

          {/* 2. Box/Pack pills + language variants */}
          {(() => {
            const linkedId = product.linkedPackId ?? product.linkedBoxId;
            const linked = linkedId ? getMergedById(linkedId) : null;
            const showPills = linked != null;
            const showVariants = langVariants.length > 0;
            if (!showPills && !showVariants) return null;
            return (
              <div className="space-y-1">
                {showPills && linked && (
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const isBox = product.category === "booster-box";
                      const linkedHref = `/${linked.game}/${linked.category}/${linked.slug}`;
                      const boxProduct = isBox ? product : linked;
                      const packProduct = isBox ? linked : product;
                      const boxHref = isBox ? "#" : linkedHref;
                      const packHref = isBox ? linkedHref : "#";
                      const boxLabel = `📦 Caja${boxProduct.packsPerBox ? ` · ${boxProduct.packsPerBox} sobres` : ""}`;
                      const packLabel = `🃏 Sobre${packProduct.cardsPerPack ? ` · ${packProduct.cardsPerPack} cartas` : ""}`;
                      return (
                        <>
                          {isBox ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold text-gray-900" style={{ borderColor: color }}>{boxLabel}</span>
                          ) : (
                            <Link href={boxHref} className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-200 px-3 py-1 text-sm font-semibold text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-700">{boxLabel}</Link>
                          )}
                          {!isBox ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold text-gray-900" style={{ borderColor: color }}>{packLabel}</span>
                          ) : (
                            <Link href={packHref} className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-200 px-3 py-1 text-sm font-semibold text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-700">{packLabel}</Link>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                {showVariants && (
                  <p className="text-xs text-gray-500">
                    También disponible en:{" "}
                    {langVariants.map((v, i) => (
                      <span key={v.id}>
                        {i > 0 && ", "}
                        <Link href={`/${v.game}/${v.category}/${v.slug}`} className="inline-flex items-center gap-1 font-semibold hover:underline" style={{ color }}>
                          <LanguageFlag language={v.language} showLabel size="md" />
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            );
          })()}

          {/* 3. Price */}
          <PriceDisplay
            product={product}
            color={color}
            inlinePrice={inlinePrice}
            onPriceChange={(v) => setInlinePrice(parseFloat(v) || inlinePrice)}
            inlineWholesalePrice={inlineWholesalePrice}
            onWholesalePriceChange={setInlineWholesalePrice}
            inlineStorePrice={inlineStorePrice}
            onStorePriceChange={setInlineStorePrice}
            inlineComparePrice={inlineComparePrice}
            onComparePriceChange={setInlineComparePrice}
            inlineCostPrice={inlineCostPrice}
            onCostPriceChange={setInlineCostPrice}
            editMode={editMode}
          />

          {/* 4. Stock */}
          <div className="flex items-center gap-3">
            {(() => {
              const stockNum = inlineStockQty.trim() === "" ? undefined : parseInt(inlineStockQty);
              const si = getStockInfo(inlineStock ? stockNum : 0);
              return (
                <div className={`inline-flex items-center gap-2 text-sm font-semibold ${si.color}`}>
                  <div className={`h-2 w-2 rounded-full ${si.dotColor}`} />
                  {si.label}
                </div>
              );
            })()}
          </div>

          {/* 5. Description */}
          <div
            className="border-l-4 pl-4"
            style={{ borderColor: `${color}60` }}
          >
            <div
              ref={descRef}
              className={`overflow-hidden text-sm leading-relaxed text-gray-600 transition-all ${descExpanded ? "" : "line-clamp-5"}`}
            >
              {editMode ? (
                <>
                  <textarea
                    value={inlineDesc}
                    onChange={(e) => setInlineDesc(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[#2563eb] px-2 py-1 text-sm leading-relaxed text-gray-600 focus:outline-none"
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
          <div className="flex flex-col gap-2">
            <div className="relative flex items-center gap-0">
              {/* Float animations */}
              <style>{`
                @keyframes detailFloatUp {
                  0% { opacity: 1; transform: translateY(0) scale(0.8); }
                  15% { opacity: 1; transform: translateY(-14px) scale(1.2); }
                  100% { opacity: 0; transform: translateY(-32px) scale(0.9); }
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
              {floatAnims.map((anim, i) => (
                <span
                  key={anim.key}
                  className="pointer-events-none absolute left-[60px] bottom-full z-20 text-base font-black"
                  style={{
                    color: anim.type === "plus" ? "#22c55e" : "#f87171",
                    WebkitTextStroke: "0.3px rgba(150,150,150,0.35)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    animation: "detailFloatUp 0.9s ease-out forwards",
                    marginLeft: i % 2 !== 0 ? "12px" : "-12px",
                  }}
                >
                  {anim.type === "plus" ? "+1" : "\u22121"}
                </span>
              ))}

              {/* Cart button */}
              <div style={{ animation: cartQty === 1 && added ? "detailScaleIn 0.3s ease-out" : "none" }}>
                {isOutOfStock ? (
                  restockSubscribed ? (
                    <button
                      disabled
                      className="flex items-center justify-center gap-2 rounded-l-xl bg-green-50 px-8 py-2.5 text-sm font-bold text-green-600"
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
                      className="flex items-center justify-center gap-2 rounded-l-xl bg-amber-50 border border-amber-200 px-8 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100 active:scale-[0.97]"
                    >
                      <Bell size={15} /> Avisarme cuando haya stock
                    </button>
                  )
                ) : cartQty > 0 ? (
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => {
                        triggerFloat("minus");
                        if (cartQty <= 1) removeItem(cartKey);
                        else updateQty(cartKey, cartQty - 1);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-l-xl bg-white text-gray-700 shadow-lg transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
                      aria-label={cartQty <= 1 ? "Eliminar del carrito" : "Quitar uno"}
                    >
                      {cartQty <= 1 ? <Trash2 size={14} /> : <Minus size={15} />}
                    </button>
                    <span className="flex h-10 min-w-[36px] items-center justify-center bg-white px-2 text-sm font-bold text-gray-900 shadow-lg">
                      {cartQty}
                    </span>
                    <button
                      onClick={handleAddToCart}
                      className="flex h-10 w-10 items-center justify-center rounded-r-xl bg-white text-gray-700 shadow-lg transition-all duration-150 hover:bg-green-50 hover:text-green-600 active:scale-90"
                      aria-label="Añadir uno más"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center justify-center gap-2 rounded-l-xl bg-[#2563eb] px-10 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:bg-[#1d4ed8] hover:shadow-xl active:scale-[0.97]"
                  >
                    <ShoppingCart size={15} /> Añadir al carrito
                  </button>
                )}
              </div>

              {/* Favorite — attached to the right of the cart button */}
              <button
                onClick={() => {
                  setHeartAnimKey((k) => k + 1);
                  toggleFavorite(product.id);
                }}
                aria-label={isFavorite(product.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                className={`flex h-10 items-center justify-center rounded-r-xl border-l px-3 transition-all duration-300 ${
                  isOutOfStock
                    ? "bg-gray-50 text-gray-400 border-gray-200"
                    : cartQty > 0
                      ? "bg-white text-gray-400 border-gray-200 shadow-lg hover:text-red-400 hover:bg-red-50"
                      : "bg-[#1d4ed8] text-white/70 border-white/20 hover:text-white hover:bg-[#1a3fc7]"
                }`}
              >
                <Heart
                  key={heartAnimKey}
                  size={15}
                  fill={isFavorite(product.id) ? (cartQty > 0 ? "#ef4444" : "white") : "none"}
                  color={isFavorite(product.id) ? (cartQty > 0 ? "#ef4444" : "white") : "currentColor"}
                  style={{ animation: heartAnimKey > 0 ? "heartPop 0.4s ease-out" : "none" }}
                />
              </button>
            </div>
            {typeof product.maxPerUser === "number" && (
              <p className="text-xs text-gray-500">Máx. {product.maxPerUser} uds/persona</p>
            )}
            {limitMsg && (
              <p className="text-xs font-semibold text-red-500">{limitMsg}</p>
            )}
          </div>

          {/* 7. Payment + points */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-green-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Pago 100% seguro</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/payment/visa.svg" alt="Visa" className="h-5 rounded bg-white px-1.5 py-0.5" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/payment/mastercard.svg" alt="Mastercard" className="h-5 rounded bg-white px-1 py-0.5" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/payment/paypal.svg" alt="PayPal" className="h-5 rounded bg-white px-1.5 py-0.5" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/payment/bizum.svg" alt="Bizum" className="h-5 rounded bg-white px-1.5 py-0.5" />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-700">
              <span className="text-amber-400">★</span>
              <span>
                Consigue <strong>{Math.round(displayPrice * 100)}</strong> puntos con esta compra
              </span>
            </div>
          </div>

          {/* 8. Shipping info */}
          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 p-3 text-sm">
            <Clock size={16} className="flex-shrink-0 text-[#2563eb]" />
            <span className="text-gray-600">
              Enviamos en menos de {SITE_CONFIG.dispatchHours}h con{" "}
              <strong>{SITE_CONFIG.carrier}</strong> — Envío gratis desde{" "}
              {SITE_CONFIG.shippingThreshold}€
            </span>
          </div>

          {/* Share */}
          <ShareButtons url={productUrl} title={inlineTitle} />
        </div>
      </div>

      {/* Box ↔ Pack link */}
      {(() => {
        const linkedId = product.linkedPackId ?? product.linkedBoxId;
        if (!linkedId) return null;
        const linked = getMergedById(linkedId);
        if (!linked) return null;
        const isBox = !!product.linkedPackId;
        const linkedImage = linked.images[0];
        const gameConfig = GAME_CONFIG[linked.game];
        const linkedHref = linked.slug.includes("-")
          ? `/${linked.game}/${linked.category}/${linked.slug}`
          : `/producto?id=${linked.id}`;
        return (
          <section className="mb-8">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <Link href={linkedHref} className="flex-shrink-0 bg-gray-50 p-4 sm:w-36">
                  {linkedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={linkedImage} alt={linked.name} className="mx-auto h-28 w-auto object-contain" />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-4xl">
                      {gameConfig?.emoji ?? "🃏"}
                    </div>
                  )}
                </Link>
                {/* Info */}
                <div className="flex flex-1 flex-col justify-center p-5">
                  <p className="mb-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    {isBox ? "También disponible como sobre suelto" : "Compra la caja completa y ahorra"}
                  </p>
                  <Link href={linkedHref} className="mb-2 text-base font-bold text-gray-900 hover:text-[#2563eb]">
                    {linked.name}
                  </Link>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="text-lg font-bold" style={{ color: gameConfig?.color ?? "#2563eb" }}>
                      {linked.price.toFixed(2)}€
                    </span>
                    <span className="text-xs text-gray-400">IVA incl.</span>
                    {isBox && product.packsPerBox && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                        Precio por sobre: {(product.price / product.packsPerBox).toFixed(2)}€
                      </span>
                    )}
                    {!isBox && linked.packsPerBox && (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-600">
                        {linked.packsPerBox} sobres · Ahorras {((product.price * linked.packsPerBox) - linked.price).toFixed(2)}€
                      </span>
                    )}
                  </div>
                  {/* Pack/box info badges */}
                  <div className="flex flex-wrap gap-2">
                    {product.packsPerBox && (
                      <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        📦 {product.packsPerBox} sobres por caja
                      </span>
                    )}
                    {product.cardsPerPack && (
                      <span className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                        🃏 {product.cardsPerPack} cartas por sobre
                      </span>
                    )}
                    {linked.packsPerBox && !isBox && (
                      <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        📦 {linked.packsPerBox} sobres en la caja
                      </span>
                    )}
                    {linked.cardsPerPack && isBox && (
                      <span className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                        🃏 {linked.cardsPerPack} cartas por sobre
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Cross-sell */}
      {related.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
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
