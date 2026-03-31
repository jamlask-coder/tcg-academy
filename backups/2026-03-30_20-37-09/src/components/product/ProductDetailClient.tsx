"use client";
import Link from "next/link";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  Plus,
  Minus,
  Clock,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useState, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  PRODUCTS,
  isNewProduct,
  type LocalProduct,
} from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { DiscountBadgeEdit } from "@/components/ui/DiscountBadgeEdit";
import { usePrice } from "@/hooks/usePrice";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { SITE_CONFIG } from "@/config/siteConfig";
import { HoloCard } from "@/components/product/HoloCard";

const CARD_CATEGORIES = new Set([
  "singles", "foil", "enchanted", "starlight", "prize-cards",
  "alternate-art", "secret-lair", "gradeadas", "scr", "field-centers",
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
  return PRODUCTS.filter(
    (p) =>
      p.game === product.game &&
      p.category === product.category &&
      p.id !== product.id &&
      p.language !== product.language &&
      p.slug.replace(/-(?:es|en|jp|fr|de|it|ko|pt)$/i, "") === base,
  ).slice(0, 4);
}

// Find related products from same game
function getRelated(product: LocalProduct) {
  return PRODUCTS.filter(
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
  validate,
  toastMessage,
  color,
  bgColor: _bgColor,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
  validate: (v: number) => string | null;
  toastMessage: string;
  color: string;
  bgColor: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const commit = () => {
    const n = parseFloat(draft);
    if (isNaN(n) || n <= 0) {
      setError("Precio inválido");
      return;
    }
    const err = validate(n);
    if (err) {
      setError(err);
      return;
    }
    onSave(n);
    setEditing(false);
    setError(null);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const cancel = () => {
    setDraft(value.toFixed(2));
    setEditing(false);
    setError(null);
  };

  return (
    <div className="flex items-start justify-between gap-2">
      <span className="mt-1.5 text-xs font-semibold" style={{ color }}>
        {label}
      </span>
      <div className="flex flex-col items-end gap-0.5">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0.01"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-24 rounded-lg border-2 border-[#1a3a5c] px-2 py-1 text-right font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3a5c] focus-visible:ring-offset-1"
            />
            <span className="text-sm text-gray-500">€</span>
            <button
              onClick={commit}
              className="rounded-lg bg-green-500 p-1 text-white transition hover:bg-green-600"
              title="Guardar"
            >
              <Check size={12} />
            </button>
            <button
              onClick={cancel}
              className="rounded-lg bg-gray-200 p-1 text-gray-600 transition hover:bg-gray-300"
              title="Cancelar"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="group/pr flex cursor-default items-center gap-1 text-sm font-bold">
            <span style={{ color }}>{value.toFixed(2)}€</span>
            <button
              onClick={() => {
                setDraft(value.toFixed(2));
                setEditing(true);
              }}
              className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity group-hover/pr:opacity-100 hover:text-[#1a3a5c]"
              title={`Editar ${label}`}
            >
              <Pencil size={11} />
            </button>
          </span>
        )}
        {error && (
          <p className="max-w-[200px] text-right text-[10px] text-red-500">
            {error}
          </p>
        )}
      </div>
      {toast && (
        <div className="animate-fade-in fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl bg-[#1a3a5c] px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          <Check size={14} className="text-green-300" /> {toastMessage}
        </div>
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
        {/* Big PVP Público */}
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-2xl font-bold" style={{ color }}>
            <InlineEdit
              type="number"
              step="0.01"
              min="0"
              value={inlinePrice}
              onSave={onPriceChange}
              toastMessage="PVP Público actualizado"
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
          <AdminPriceRow
            label="PVP Público"
            value={inlinePrice}
            onSave={(v) => onPriceChange(String(v))}
            validate={(v) =>
              v > inlineWholesalePrice
                ? null
                : "El PVP Público debe ser mayor que el precio Mayoristas"
            }
            toastMessage="PVP Público actualizado"
            color="#1a3a5c"
            bgColor="#1a3a5c18"
          />
          <div className="border-t border-gray-200" />
          <AdminPriceRow
            label="PVP Mayoristas"
            value={inlineWholesalePrice}
            onSave={onWholesalePriceChange}
            validate={(v) => {
              if (v >= inlinePrice)
                return "El precio Mayoristas debe ser menor que el PVP Público";
              if (v <= inlineStorePrice)
                return "El precio Mayoristas debe ser mayor que el PVP Tiendas TCG";
              return null;
            }}
            toastMessage="PVP Mayoristas actualizado"
            color="#1d4ed8"
            bgColor="#1d4ed818"
          />
          <div className="border-t border-gray-200" />
          <AdminPriceRow
            label="PVP Tiendas TCG"
            value={inlineStorePrice}
            onSave={onStorePriceChange}
            validate={(v) => {
              if (v >= inlineWholesalePrice)
                return "El precio Tiendas TCG debe ser menor que el PVP Mayoristas";
              if (v <= inlineCostPrice)
                return "El precio Tiendas TCG debe ser mayor que el Coste";
              return null;
            }}
            toastMessage="PVP Tiendas TCG actualizado"
            color="#15803d"
            bgColor="#15803d18"
          />
          <div className="border-t border-gray-200" />
          <AdminPriceRow
            label="Coste"
            value={inlineCostPrice}
            onSave={onCostPriceChange}
            validate={(v) =>
              v < inlineStorePrice
                ? null
                : "El Coste debe ser menor que el PVP Tiendas TCG"
            }
            toastMessage="Precio de coste actualizado"
            color="#7c3aed"
            bgColor="#7c3aed18"
          />
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
            <span>PVP Público: {retailPrice.toFixed(2)} €</span>
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
  const { user } = useAuth();
  const { name, color, bgColor: _bgColor2 } = config;

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // Admin inline edits — local session overrides only (no backend)
  const [inlineTitle, setInlineTitle] = useState(product.name);
  const [inlineDesc, setInlineDesc] = useState(
    product.description || product.shortDescription || "",
  );
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
  const [inlineImages, setInlineImages] = useState(product.images);

  const isAdmin = user?.role === "admin";
  const isCardCategory = CARD_CATEGORIES.has(product.category);

  const { displayPrice } = usePrice(product);

  // Image zoom
  const [zoom, setZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

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

  const displayImages = inlineImages.length > 0 ? inlineImages : [null];
  const productUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://tcgacademy.es/${product.game}/${product.category}/${product.slug}`;
  const langVariants = getLangVariants(product);
  const related = getRelated(product);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-4">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#1a3a5c]">
          Inicio
        </Link>
        <span>/</span>
        <Link href={`/${product.game}`} className="hover:text-[#1a3a5c]">
          {name}
        </Link>
        <span>/</span>
        <Link
          href={`/${product.game}/${product.category}`}
          className="hover:text-[#1a3a5c]"
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
          <HoloCard intensity="full" active={isCardCategory} className="mb-3 rounded-2xl">
          <div
            ref={imgContainerRef}
            className={`relative aspect-[4/5] max-h-[450px] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 select-none${isCardCategory ? "" : " cursor-zoom-in"}`}
            onMouseEnter={isCardCategory ? undefined : () => setZoom(true)}
            onMouseLeave={isCardCategory ? undefined : () => setZoom(false)}
            onMouseMove={isCardCategory ? undefined : handleMouseMove}
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
                  className="pointer-events-none h-full w-full object-contain p-4"
                  style={{
                    transform: zoom ? "scale(2.2)" : "scale(1)",
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transition: zoom
                      ? "transform 0.08s ease-out"
                      : "transform 0.25s ease-out",
                  }}
                />
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
              <button
                onClick={() => setWishlisted(!wishlisted)}
                aria-label={
                  wishlisted ? "Quitar de favoritos" : "Añadir a favoritos"
                }
                className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
                  wishlisted
                    ? "bg-red-500 text-white"
                    : "bg-white/90 text-gray-400 backdrop-blur-sm hover:bg-white hover:text-red-500"
                }`}
              >
                <Heart size={16} className={wishlisted ? "fill-white" : ""} />
              </button>
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
                <LanguageFlag language={product.language} showLabel />
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
                      ? "border-[#1a3a5c]"
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

          {/* 1. Title */}
          <h1 className="text-xl leading-tight font-bold text-gray-900 md:text-2xl">
            <InlineEdit
              value={inlineTitle}
              onSave={setInlineTitle}
              className="w-full"
            >
              {inlineTitle}
            </InlineEdit>
          </h1>

          {/* 2. Language */}
          {product.language && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold"
                  style={{ borderColor: color, color }}
                >
                  {LANGUAGE_FLAGS[product.language] ?? ""}{" "}
                  {LANGUAGE_NAMES[product.language] ?? product.language}
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
                        className="font-semibold hover:underline"
                        style={{ color }}
                      >
                        {LANGUAGE_FLAGS[v.language] ?? ""}{" "}
                        {LANGUAGE_NAMES[v.language] ?? v.language}
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
            {isAdmin && (
              <button
                onClick={() => setInlineStock(!inlineStock)}
                className="rounded-lg border px-2 py-0.5 text-xs font-semibold transition hover:bg-gray-50"
                style={{
                  borderColor: inlineStock ? "#16a34a40" : "#dc262640",
                  color: inlineStock ? "#16a34a" : "#dc2626",
                }}
              >
                {inlineStock ? "Marcar agotado" : "Marcar en stock"}
              </button>
            )}
          </div>

          {/* 5. Description */}
          <div
            className="border-l-4 pl-4"
            style={{ borderColor: `${color}60` }}
          >
            <div
              className={`overflow-hidden text-sm leading-relaxed text-gray-600 transition-all ${descExpanded ? "" : "line-clamp-3"}`}
            >
              <InlineEdit
                type="textarea"
                value={inlineDesc}
                onSave={setInlineDesc}
                className="w-full"
              >
                {inlineDesc}
              </InlineEdit>
            </div>
            {inlineDesc.length > 120 && (
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
                    : "bg-[#1a3a5c] text-white hover:bg-[#15304d] active:scale-[0.98]"
              }`}
            >
              <ShoppingCart size={18} />
              {!product.inStock
                ? "Sin stock"
                : added
                  ? "¡Añadido al carrito!"
                  : "Añadir al carrito"}
            </button>
            <button
              onClick={() => setWishlisted(!wishlisted)}
              aria-label={
                wishlisted ? "Quitar de favoritos" : "Añadir a favoritos"
              }
              className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition ${
                wishlisted
                  ? "border-red-400 bg-red-50"
                  : "border-gray-200 hover:border-red-300"
              }`}
            >
              <Heart
                size={18}
                className={
                  wishlisted ? "fill-red-500 text-red-500" : "text-gray-500"
                }
              />
            </button>
          </div>

          {/* 7. Shipping info */}
          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 p-3 text-sm">
            <Clock size={16} className="flex-shrink-0 text-[#1a3a5c]" />
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
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          {[
            ["Juego", name],
            ["Categoría", catLabel],
            [
              "Idioma",
              product.language
                ? `${LANGUAGE_FLAGS[product.language] ?? ""} ${LANGUAGE_NAMES[product.language] ?? product.language}`
                : "—",
            ],
            ["Estado", product.inStock ? "✅ En stock" : "❌ Agotado"],
            ["Referencia", `TCG-${product.id}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between border-b border-gray-100 py-2"
            >
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
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
    </div>
  );
}
