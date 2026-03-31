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
  bgColor,
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
      <span className="text-xs font-semibold mt-1.5" style={{ color }}>
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
              className="w-24 border-2 border-[#1a3a5c] rounded-lg px-2 py-1 text-sm font-mono text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3a5c] focus-visible:ring-offset-1"
            />
            <span className="text-sm text-gray-500">€</span>
            <button
              onClick={commit}
              className="p-1 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
              title="Guardar"
            >
              <Check size={12} />
            </button>
            <button
              onClick={cancel}
              className="p-1 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition"
              title="Cancelar"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="text-sm font-bold flex items-center gap-1 group/pr cursor-default">
            <span style={{ color }}>{value.toFixed(2)}€</span>
            <button
              onClick={() => {
                setDraft(value.toFixed(2));
                setEditing(true);
              }}
              className="opacity-0 group-hover/pr:opacity-100 p-0.5 rounded text-gray-400 hover:text-[#1a3a5c] transition-opacity"
              title={`Editar ${label}`}
            >
              <Pencil size={11} />
            </button>
          </span>
        )}
        {error && (
          <p className="text-[10px] text-red-500 max-w-[200px] text-right">
            {error}
          </p>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium animate-fade-in">
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
}) {
  const { role } = useAuth();
  const {
    displayPrice,
    comparePrice: origComparePrice,
    hasDiscount: origHasDiscount,
    discountPct: origDiscountPct,
    etiquetaRol,
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
        {/* Big PVP General */}
        <div className="flex items-end gap-3 flex-wrap">
          <span className="text-2xl font-bold" style={{ color }}>
            <InlineEdit
              type="number"
              step="0.01"
              min="0"
              value={inlinePrice}
              onSave={onPriceChange}
              toastMessage="PVP General actualizado"
              className="inline-flex"
            >
              {inlinePrice.toFixed(2)}€
            </InlineEdit>
          </span>
          {effectiveHasDiscount && (
            <span className="text-base text-gray-400 line-through mb-1">
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
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
          <AdminPriceRow
            label="PVP General"
            value={inlinePrice}
            onSave={(v) => onPriceChange(String(v))}
            validate={(v) =>
              v > inlineWholesalePrice
                ? null
                : "El PVP General debe ser mayor que el precio Mayoristas"
            }
            toastMessage="PVP General actualizado"
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
                return "El precio Mayoristas debe ser menor que el PVP General";
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
            validate={(v) =>
              v < inlineWholesalePrice
                ? null
                : "El precio Tiendas TCG debe ser menor que el PVP Mayoristas"
            }
            toastMessage="PVP Tiendas TCG actualizado"
            color="#15803d"
            bgColor="#15803d18"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {etiquetaRol && (
        <span
          className="inline-flex items-center self-start px-3 py-1 rounded-xl text-xs font-bold mb-1"
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
            <span className="text-base text-gray-400 line-through mb-0.5">
              {effectiveComparePrice!.toFixed(2)}€
            </span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-lg mb-0.5"
              style={{ backgroundColor: `${color}18`, color }}
            >
              -{effectiveDiscountPct}%
            </span>
          </>
        )}
      </div>
      <span className="text-xs text-gray-400">IVA incl.</span>
    </div>
  );
}

export function ProductDetailClient({ product, config, catLabel }: Props) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { name, color, bgColor } = config;

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
  const [inlineComparePrice, setInlineComparePrice] = useState<
    number | undefined
  >(product.comparePrice);
  const [inlineStock, setInlineStock] = useState(product.inStock);
  const [descExpanded, setDescExpanded] = useState(false);
  const [inlineImages, setInlineImages] = useState(product.images);

  const isAdmin = user?.role === "admin";

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
    <div className="max-w-[1180px] mx-auto px-6 py-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
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
        <span className="text-gray-800 font-medium truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      <div className="grid md:grid-cols-[40%_1fr] gap-6 mb-8">
        {/* Gallery */}
        <div>
          <div
            ref={imgContainerRef}
            className="relative aspect-[4/5] max-h-[450px] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-3 cursor-zoom-in select-none"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={handleMouseMove}
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
                className="w-full h-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImages[activeImg]!}
                  alt={inlineTitle}
                  className="w-full h-full object-contain p-4 pointer-events-none"
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
                className="w-full h-full flex flex-col items-center justify-center gap-4"
                style={{
                  background: `linear-gradient(135deg, ${color}18, ${color}35)`,
                }}
              >
                <span className="text-8xl">{config.emoji}</span>
                <span
                  className="text-sm font-bold text-center px-6 leading-tight"
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
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
                  wishlisted
                    ? "bg-red-500 text-white"
                    : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-white"
                }`}
              >
                <Heart size={16} className={wishlisted ? "fill-white" : ""} />
              </button>
              {isNewProduct(product) && (
                <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
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
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition ${
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
                    className="w-full h-full object-cover"
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
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:underline"
            style={{ color }}
          >
            <ChevronLeft size={14} /> {catLabel}
          </Link>

          {/* 1. Title */}
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border-2"
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
          />

          {/* 4. Stock */}
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 text-sm font-semibold ${inlineStock ? "text-green-600" : "text-red-500"}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${inlineStock ? "bg-green-500" : "bg-red-400"}`}
              />
              {inlineStock ? "En stock — Listo para enviar" : "Sin stock"}
            </div>
            {isAdmin && (
              <button
                onClick={() => setInlineStock(!inlineStock)}
                className="text-xs font-semibold border px-2 py-0.5 rounded-lg transition hover:bg-gray-50"
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
              className={`text-sm text-gray-600 leading-relaxed overflow-hidden transition-all ${descExpanded ? "" : "line-clamp-3"}`}
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
                className="text-xs font-semibold mt-1 hover:underline"
                style={{ color }}
              >
                {descExpanded ? "Leer menos" : "Leer más"}
              </button>
            )}
          </div>

          {/* 6. Qty + Add to cart */}
          <div className="flex gap-3 items-center">
            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold text-lg">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || added}
              className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                !product.inStock
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
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
              className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center transition ${
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
          <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl text-sm">
            <Clock size={16} className="text-[#1a3a5c] flex-shrink-0" />
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
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-12">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Ficha técnica</h2>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-3">
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
              className="flex justify-between py-2 border-b border-gray-100"
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
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
