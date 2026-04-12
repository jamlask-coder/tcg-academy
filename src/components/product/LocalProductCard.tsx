"use client";
import { memo, useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Heart, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  CARD_CATEGORIES,
  isNewProduct,
  type LocalProduct,
} from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { DiscountBadgeEdit } from "@/components/ui/DiscountBadgeEdit";
import { usePrice } from "@/hooks/usePrice";
import { HoloCard } from "@/components/product/HoloCard";
import { isLocalProduct } from "@/lib/productStore";

interface Props {
  product: LocalProduct;
}

function LocalProductCardInner({ product }: Props) {
  const { addItem } = useCart();
  const { user, toggleFavorite, isFavorite } = useAuth();
  const isAdmin = user?.role === "admin";

  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inlineComparePrice, setInlineComparePrice] = useState<
    number | undefined
  >(product.comparePrice);

  const config = GAME_CONFIG[product.game];
  const color = config?.color ?? "#2563eb";
  const image = product.images[0];
  const {
    displayPrice,
    comparePrice: origComparePrice,
    hasDiscount: _origHasDiscount,
    etiquetaRol,
  } = usePrice(product);

  // Admin override: use inlineComparePrice; otherwise use usePrice values
  const effectiveComparePrice = isAdmin ? inlineComparePrice : origComparePrice;
  const effectiveHasDiscount =
    effectiveComparePrice !== undefined && effectiveComparePrice > displayPrice;

  const favorited = isFavorite(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.inStock) return;
    addItem(product.id, product.name, displayPrice, image ?? "");
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    toggleFavorite(product.id);
  };

  // Defer localStorage check to after hydration to avoid SSR mismatch
  const staticHref = `/${product.game}/${product.category}/${product.slug}`;
  const [href, setHref] = useState(staticHref);
  useEffect(() => {
    if (isLocalProduct(product.id)) setHref(`/producto?id=${product.id}`);
  }, [product.id, staticHref]);
  const isCardCategory =
    CARD_CATEGORIES.has(product.category) &&
    (product.game === "pokemon" || product.game === "riftbound");

  // Singles/card categories get portrait TCG-card aspect ratio
  const isSingles = isCardCategory;
  const imageAspect = isSingles ? "aspect-[5/7]" : "aspect-[4/5]";
  const imageObjectFit = "object-contain p-2";
  // Show second image on hover if available
  const displayImage = hovered && product.images[1] ? product.images[1] : image;

  // Inner image block — shared between holo and non-holo variants
  const imageBlock = (
    <Link
      href={href}
      className={`relative block ${imageAspect} flex-shrink-0 overflow-hidden`}
      style={{ background: `linear-gradient(145deg, ${color}0d, ${color}18)` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {displayImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayImage}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full ${imageObjectFit} transition-all duration-300 ${!product.inStock ? "opacity-50" : ""}`}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-3 p-4 ${!product.inStock ? "opacity-50" : ""}`}
          style={{
            background: `linear-gradient(135deg, ${color}18, ${color}30)`,
          }}
        >
          <span className="text-5xl">{config?.emoji ?? "🃏"}</span>
          <span
            className="line-clamp-3 px-2 text-center text-[11px] leading-tight font-bold"
            style={{ color }}
          >
            {product.name}
          </span>
        </div>
      )}

      {/* ── ESQUINA SUPERIOR IZQUIERDA: NUEVO → descuento → corazón ── */}
      <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
        {isNewProduct(product) && (
          <span className="animate-badge-pulse rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            NUEVO
          </span>
        )}
        <DiscountBadgeEdit
          displayPrice={displayPrice}
          comparePrice={effectiveComparePrice}
          onSave={setInlineComparePrice}
        />
        {user && (
          <button
            onClick={handleFavoriteToggle}
            aria-label={favorited ? "Quitar de favoritos" : "Añadir a favoritos"}
            className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
              favorited
                ? "bg-red-500 text-white"
                : "bg-white/90 text-gray-400 backdrop-blur-sm hover:bg-white hover:text-red-500"
            }`}
          >
            <Heart size={13} className={favorited ? "fill-white" : ""} />
          </button>
        )}
      </div>

      {/* ── ESQUINA SUPERIOR DERECHA: bandera de idioma + estado stock ── */}
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
        {product.language && <LanguageFlag language={product.language} />}
        {!product.inStock && (
          <span className="rounded-full bg-gray-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            AGOTADO
          </span>
        )}
      </div>

      {/* ── FRANJA INFERIOR: Añadir al carrito + Vista rápida (desktop hover) ── */}
      {product.inStock && (
        <div className="absolute right-0 bottom-0 left-0 hidden translate-y-2 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 sm:block">
          <div className="bg-gradient-to-t from-black/60 via-black/25 to-transparent px-2 pt-8 pb-2">
            <div className="flex gap-1.5">
              <button
                onClick={handleAddToCart}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold shadow-lg transition-all ${
                  added
                    ? "bg-green-500 text-white"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                {added ? (
                  <>
                    <Check size={14} /> Añadido
                  </>
                ) : (
                  <>
                    <ShoppingCart size={14} /> Añadir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MÓVIL: icono carrito (abajo a la derecha, siempre visible) ── */}
      {product.inStock && (
        <button
          onClick={handleAddToCart}
          aria-label="Añadir al carrito"
          className={`absolute right-2 bottom-2 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all sm:hidden ${
            added ? "bg-green-500 text-white" : "bg-white text-gray-700"
          }`}
        >
          {added ? <Check size={15} /> : <ShoppingCart size={15} />}
        </button>
      )}
    </Link>
  );

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: `${color}22` }}>
        {isCardCategory ? (
          <HoloCard intensity="subtle">{imageBlock}</HoloCard>
        ) : (
          imageBlock
        )}

        {/* ── INFO ── */}
        <div className="flex flex-col gap-1 px-2.5 py-2">
          <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </span>
          <Link href={href}>
            <h3 className="line-clamp-2 text-xs leading-snug font-semibold text-gray-800 transition hover:text-[#2563eb]">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {etiquetaRol && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    backgroundColor:
                      etiquetaRol === "Precio Mayoristas"
                        ? "#1e40af18"
                        : "#15803d18",
                    color:
                      etiquetaRol === "Precio Mayoristas"
                        ? "#1e40af"
                        : "#15803d",
                  }}
                >
                  {etiquetaRol}
                </span>
              )}
              <span className="text-sm font-bold" style={{ color }}>
                {displayPrice.toFixed(2)}€
              </span>
              {effectiveHasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  {effectiveComparePrice!.toFixed(2)}€
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-gray-300">IVA incluido</span>
        </div>
      </div>

    </>
  );
}

export const LocalProductCard = memo(LocalProductCardInner);
