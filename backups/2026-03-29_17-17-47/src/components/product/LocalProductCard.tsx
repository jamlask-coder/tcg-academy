"use client";
import { memo } from "react";
import Link from "next/link";
import { ShoppingCart, Heart, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  isNewProduct,
  type LocalProduct,
} from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { DiscountBadgeEdit } from "@/components/ui/DiscountBadgeEdit";
import { usePrice } from "@/hooks/usePrice";

interface Props {
  product: LocalProduct;
}

function LocalProductCardInner({ product }: Props) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [inlineComparePrice, setInlineComparePrice] = useState<
    number | undefined
  >(product.comparePrice);

  const config = GAME_CONFIG[product.game];
  const color = config?.color ?? "#1a3a5c";
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.inStock) return;
    addItem(product.id, product.name, displayPrice, image ?? "");
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    setWishlisted(!wishlisted);
  };

  const href = `/${product.game}/${product.category}/${product.slug}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg">
      <Link
        href={href}
        className="relative block aspect-[4/3] flex-shrink-0 overflow-hidden bg-gray-50"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-3 p-4"
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

        {/* ── ESQUINA SUPERIOR IZQUIERDA: corazón + badges ── */}
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
          <button
            onClick={toggleWishlist}
            aria-label={
              wishlisted ? "Quitar de favoritos" : "Añadir a favoritos"
            }
            className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
              wishlisted
                ? "bg-red-500 text-white"
                : "bg-white/90 text-gray-400 backdrop-blur-sm hover:bg-white hover:text-red-500"
            }`}
          >
            <Heart size={13} className={wishlisted ? "fill-white" : ""} />
          </button>
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
        </div>

        {/* ── ESQUINA SUPERIOR DERECHA: bandera de idioma + agotado ── */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          {product.language && <LanguageFlag language={product.language} />}
          {!product.inStock && (
            <span className="rounded-full bg-gray-400 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              AGOTADO
            </span>
          )}
        </div>

        {/* ── FRANJA INFERIOR: Añadir al carrito (desktop hover, fade-in) ── */}
        {product.inStock && (
          <div className="absolute right-0 bottom-0 left-0 hidden translate-y-2 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 sm:block">
            <div className="bg-gradient-to-t from-black/60 via-black/25 to-transparent px-2 pt-8 pb-2">
              <button
                onClick={handleAddToCart}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold shadow-lg transition-all ${
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
                    <ShoppingCart size={14} /> Añadir al carrito
                  </>
                )}
              </button>
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

      {/* ── INFO ── */}
      <div className="flex flex-col gap-0.5 p-2">
        <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </span>
        <Link href={href}>
          <h3 className="line-clamp-1 text-xs leading-tight font-semibold text-gray-800 transition hover:text-[#1a3a5c]">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-1.5">
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
                <span className="text-sm text-gray-400 line-through">
                  {effectiveComparePrice!.toFixed(2)}€
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400">IVA incl.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const LocalProductCard = memo(LocalProductCardInner);
