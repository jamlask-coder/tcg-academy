"use client";
import Link from "next/link";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  Plus,
  Minus,
  Clock,
  Check,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { addToRecentlyViewed } from "@/lib/recentlyViewed";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import {
  isNewProduct,
  type LocalProduct,
  GAME_CONFIG,
  CATEGORY_LABELS,
  LANGUAGE_NAMES,
} from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { DiscountBadgeEdit } from "@/components/ui/DiscountBadgeEdit";
import { usePrice } from "@/hooks/usePrice";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { SITE_CONFIG } from "@/config/siteConfig";
import { HoloCard } from "@/components/product/HoloCard";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

const CARD_CATEGORIES = new Set([
  "singles",
  "foil",
  "enchanted",
  "starlight",
  "prize-cards",
  "alternate-art",
  "secret-lair",
  "gradeadas",
  "scr",
  "field-centers",
]);

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
          <AdminPriceRow label="PV Mayoristas" value={inlineWholesalePrice} onSave={onWholesalePriceChange} color="#1d4ed8" editMode={editMode} />
          <div className="border-t border-gray-200" />
          <AdminPriceRow label="PV Tiendas TCG Academy" value={inlineStorePrice} onSave={onStorePriceChange} color="#15803d" editMode={editMode} />
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
      <span className="text-xs text-gray-400">IVA incl.</span>
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
  const { addItem } = useCart();
  const { user, toggleFavorite, isFavorite } = useAuth();
  const { name, color, bgColor: _bgColor2 } = config;
  const router = useRouter();

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // Track recently viewed
  useEffect(() => {
    addToRecentlyViewed(product.id);
  }, [product.id]);

  // Admin inline edits — local session overrides only (no backend)
  const [inlineTitle, setInlineTitle] = useState(product.name);
  const [inlineDesc, setInlineDesc] = useState(product.description || "");

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

  // Detect if description actually overflows line-clamp-3
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
    addItem(
      product.id,
      product.name,
      displayPrice,
      product.images[0] ?? "",
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

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
      images: inlineImages,
    };
    localStorage.setItem(
      "tcgacademy_product_overrides",
      JSON.stringify(overrides),
    );
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
    setEditMode(false);
  }, [product.id, inlineTitle, inlineDesc, inlineGame, inlineCategory, inlineLanguage, inlinePrice, inlineWholesalePrice, inlineStorePrice, inlineCostPrice, inlineComparePrice, inlineStock, inlineImages]);

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
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
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

      <div className="mb-8 grid gap-6 md:grid-cols-[40%_1fr]">
        {/* Gallery */}
        <div>
          <HoloCard
            intensity="full"
            active={isCardCategory}
            className="mb-3 rounded-2xl"
          >
            <div
              ref={imgContainerRef}
              className="group/img relative aspect-[4/5] max-h-[450px] cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 select-none"
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
                    className="pointer-events-none h-full w-full object-contain p-4 transition-transform duration-300 group-hover/img:scale-[1.03]"
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
                    background: `linear-gradient(135deg, ${color}18, ${color}35)`,
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
                {user && (
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

              {/* ── ESQUINA SUPERIOR DERECHA: bandera de idioma ── */}
              {product.language && (
                <div className="absolute top-3 right-3 z-10">
                  <LanguageFlag language={product.language} showLabel size="md" />
                </div>
              )}
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
          {/* Back link */}
          <Link
            href={`/${product.game}/${product.category}`}
            className="inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase hover:underline"
            style={{ color }}
          >
            <ChevronLeft size={14} /> {catLabel}
          </Link>

          {/* 1. Title + admin buttons */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="flex-1 text-xl leading-tight font-bold text-gray-900 md:text-2xl">
              {editMode ? (
                <input
                  type="text"
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#2563eb] px-2 py-0.5 text-xl font-bold focus:outline-none"
                />
              ) : (
                inlineTitle
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

          {/* 2. Language */}
          {product.language && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold"
                  style={{ borderColor: color, color }}
                >
                  <LanguageFlag language={product.language} showLabel size="md" />
                </span>
              </div>
              {langVariants.length > 0 && (
                <p className="text-xs text-gray-500">
                  También disponible en:{" "}
                  {langVariants.map((v, i) => (
                    <span key={v.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/${v.game}/${v.category}/${v.slug}`}
                        className="inline-flex items-center gap-1 font-semibold hover:underline"
                        style={{ color }}
                      >
                        <LanguageFlag language={v.language} showLabel size="md" />
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

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
            <div
              className={`inline-flex items-center gap-2 text-sm font-semibold ${inlineStock ? "text-green-600" : "text-red-500"}`}
            >
              <div
                className={`h-2 w-2 rounded-full ${inlineStock ? "bg-green-500" : "bg-red-400"}`}
              />
              {inlineStock ? "En stock — Listo para enviar" : "Sin stock"}
            </div>
          </div>

          {/* 5. Description */}
          <div
            className="border-l-4 pl-4"
            style={{ borderColor: `${color}60` }}
          >
            <div
              ref={descRef}
              className={`overflow-hidden text-sm leading-relaxed text-gray-600 transition-all ${descExpanded ? "" : "line-clamp-3"}`}
            >
              {editMode ? (
                <textarea
                  value={inlineDesc}
                  onChange={(e) => setInlineDesc(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#2563eb] px-2 py-1 text-sm leading-relaxed text-gray-600 focus:outline-none"
                />
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

          {/* 6. Qty + Add to cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center overflow-hidden rounded-xl border-2 border-gray-200">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-12 w-10 items-center justify-center transition hover:bg-gray-50"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center text-lg font-bold">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="flex h-12 w-10 items-center justify-center transition hover:bg-gray-50"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || added}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-bold transition-all ${
                !product.inStock
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : added
                    ? "bg-green-500 text-white"
                    : "bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:scale-[0.98]"
              }`}
            >
              <ShoppingCart size={18} />
              {!product.inStock
                ? "Sin stock"
                : added
                  ? "¡Añadido al carrito!"
                  : "Añadir al carrito"}
            </button>
            {user && (
              <button
                onClick={() => toggleFavorite(product.id)}
                aria-label={
                  isFavorite(product.id)
                    ? "Quitar de favoritos"
                    : "Añadir a favoritos"
                }
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition ${
                  isFavorite(product.id)
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                <Heart
                  size={18}
                  className={
                    isFavorite(product.id)
                      ? "fill-red-500 text-red-500"
                      : "text-gray-500"
                  }
                />
              </button>
            )}
          </div>

          {/* 7. Shipping info */}
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

      {/* Specs table */}
      <div className="mb-12 overflow-hidden rounded-2xl border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="font-bold text-gray-900">Ficha técnica</h2>
        </div>
        <div className="grid gap-0 p-6 sm:grid-cols-2">
          {/* Juego */}
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm text-gray-500">Juego</span>
            {editMode ? (
              <select
                value={inlineGame}
                onChange={(e) => setInlineGame(e.target.value)}
                className="rounded border border-[#2563eb] px-1.5 py-0.5 text-sm focus:outline-none"
              >
                {Object.entries(GAME_CONFIG).map(([key, g]) => (
                  <option key={key} value={key}>{g.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium">{GAME_CONFIG[inlineGame]?.name ?? inlineGame}</span>
            )}
          </div>
          {/* Categoría */}
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm text-gray-500">Categoría</span>
            {editMode ? (
              <select
                value={inlineCategory}
                onChange={(e) => setInlineCategory(e.target.value)}
                className="rounded border border-[#2563eb] px-1.5 py-0.5 text-sm focus:outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium">{CATEGORY_LABELS[inlineCategory] ?? inlineCategory}</span>
            )}
          </div>
          {/* Estado */}
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm text-gray-500">Estado</span>
            {editMode ? (
              <button
                type="button"
                onClick={() => setInlineStock(!inlineStock)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${inlineStock ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-600"}`}
              >
                {inlineStock ? "En stock" : "Agotado"}
              </button>
            ) : (
              <span className="text-sm font-medium">{inlineStock ? "✅ En stock" : "❌ Agotado"}</span>
            )}
          </div>
          {/* Referencia */}
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm text-gray-500">Referencia</span>
            <span className="text-sm font-medium">TCG-{product.id}</span>
          </div>
          {/* Idioma */}
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm text-gray-500">Idioma</span>
            {editMode ? (
              <select
                value={inlineLanguage}
                onChange={(e) => setInlineLanguage(e.target.value)}
                className="rounded border border-[#2563eb] px-1.5 py-0.5 text-sm focus:outline-none"
              >
                <option value="">— Sin idioma —</option>
                {Object.entries(LANGUAGE_NAMES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            ) : inlineLanguage ? (
              <LanguageFlag language={inlineLanguage} showLabel size="md" />
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Cross-sell */}
      {related.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
