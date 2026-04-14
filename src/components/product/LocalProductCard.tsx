"use client";
import { memo, useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Heart, Check } from "lucide-react";
import { getStockInfo } from "@/utils/stockStatus";
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
  const { addItem, items, updateQty, removeItem } = useCart();
  const { user, toggleFavorite, isFavorite } = useAuth();
  const isAdmin = user?.role === "admin";

  const [added, setAdded] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | undefined>(undefined);
  const [hovered, setHovered] = useState(false);
  const [floatAnims, setFloatAnims] = useState<{ type: "plus" | "minus"; key: number }[]>([]);
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

  const isOutOfStock = !product.inStock || (typeof product.stock === "number" && product.stock === 0);
  const cartKey = `item_${product.id}`;
  const cartItem = items.find((i) => i.key === cartKey);
  const cartQty = cartItem?.quantity ?? 0;

  const triggerFloat = (type: "plus" | "minus") => {
    const key = Date.now() + Math.random();
    setFloatAnims((prev) => [...prev, { type, key }]);
    setTimeout(() => setFloatAnims((prev) => prev.filter((a) => a.key !== key)), 900);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    const result = addItem(product.id, product.name, displayPrice, image ?? "");
    if (result.added) {
      triggerFloat("plus");
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } else {
      setLimitMsg(result.reason);
      setTimeout(() => setLimitMsg(undefined), 3000);
    }
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
  const imageAspect = "aspect-square";
  const imageObjectFit = "object-contain p-2";
  // Show second image on hover if available
  const displayImage = hovered && product.images[1] ? product.images[1] : image;

  // Inner image block — shared between holo and non-holo variants
  const imageBlock = (
    <Link
      href={href}
      className={`relative block ${imageAspect} flex-shrink-0 overflow-hidden`}
      style={{ background: "#ffffff" }}
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
            background: "#ffffff",
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
        {user && user.role !== "admin" && (
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
        {product.language && <LanguageFlag language={product.language} size="md" />}
        {(() => {
          const si = getStockInfo(product.inStock ? product.stock : 0);
          if (si.level === "unlimited" || si.level === "available") return null;
          return (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${si.level === "out" ? "bg-gray-500 text-white" : si.level === "last" ? "bg-red-500 text-white" : "bg-amber-500 text-white"}`}>
              {si.level === "out" ? "AGOTADO" : si.label.toUpperCase()}
            </span>
          );
        })()}
      </div>

      {/* ── FRANJA INFERIOR: Añadir al carrito (desktop hover) ── */}
      {!isOutOfStock && (
        <div className="absolute right-0 bottom-0 left-0 hidden translate-y-2 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 sm:block">
          <div className="relative bg-gradient-to-t from-black/60 via-black/25 to-transparent px-2 pt-8 pb-2">
            <style>{`
              @keyframes floatUp {
                0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
                15% { opacity: 1; transform: translateX(-50%) translateY(-18px) scale(1.3); }
                30% { opacity: 1; transform: translateX(-50%) translateY(-14px) scale(1); }
                45% { opacity: 1; transform: translateX(-50%) translateY(-22px) scale(1.1); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-36px) scale(0.8); }
              }
              @keyframes scaleIn {
                0% { transform: scale(0.5); opacity: 0; }
                50% { transform: scale(1.08); }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>
            {/* +1 / -1 floats — positioned on stable container */}
            {floatAnims.map((anim, i) => (
              <span
                key={anim.key}
                className="pointer-events-none absolute left-1/2 bottom-[calc(100%-8px)] z-20 text-base font-black"
                style={{
                  color: anim.type === "plus" ? "#22c55e" : "#f87171",
                  WebkitTextStroke: "0.3px rgba(150,150,150,0.35)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  animation: "floatUp 0.9s ease-out forwards",
                  letterSpacing: "0.5px",
                  marginLeft: i % 2 !== 0 ? "12px" : "-12px",
                }}
              >
                {anim.type === "plus" ? "+1" : "−1"}
              </span>
            ))}
            <div style={{ animation: cartQty === 1 && added ? "scaleIn 0.3s ease-out" : "none" }}>
              {cartQty > 0 ? (
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      triggerFloat("minus");
                      if (cartQty <= 1) removeItem(cartKey);
                      else updateQty(cartKey, cartQty - 1);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-l-lg bg-white text-gray-700 shadow-lg transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
                    aria-label="Quitar uno"
                  >
                    −
                  </button>
                  <span className="flex h-8 min-w-[32px] items-center justify-center bg-white px-2 text-sm font-bold text-gray-900 shadow-lg">
                    {cartQty}
                  </span>
                  <button
                    onClick={(e) => { handleAddToCart(e); }}
                    className="flex h-8 w-8 items-center justify-center rounded-r-lg bg-white text-gray-700 shadow-lg transition-all duration-150 hover:bg-green-50 hover:text-green-600 active:scale-90"
                    aria-label="Añadir uno más"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-gradient-to-r from-white to-amber-50 py-2 text-sm font-bold text-amber-800 shadow-[0_2px_12px_rgba(245,158,11,0.25)] transition-all duration-200 hover:from-amber-50 hover:to-amber-100 hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:scale-[1.03] active:scale-[0.97]"
                >
                  <ShoppingCart size={14} /> Añadir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MÓVIL: carrito (abajo a la derecha, siempre visible) ── */}
      {!isOutOfStock && (
        cartQty > 0 ? (
          <div
            className="absolute right-1.5 bottom-1.5 z-10 sm:hidden"
            style={{ animation: cartQty === 1 && added ? "scaleIn 0.3s ease-out" : "none" }}
          >
            {/* +1 / -1 floats mobile */}
            {floatAnims.map((anim, i) => (
              <span
                key={anim.key}
                className="pointer-events-none absolute left-1/2 bottom-full text-sm font-black"
                style={{
                  color: anim.type === "plus" ? "#22c55e" : "#f87171",
                  WebkitTextStroke: "0.3px rgba(150,150,150,0.35)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  animation: "floatUp 0.9s ease-out forwards",
                  marginLeft: i % 2 !== 0 ? "8px" : "-8px",
                }}
              >
                {anim.type === "plus" ? "+1" : "−1"}
              </span>
            ))}
            <div className="flex items-center gap-0 rounded-full bg-white shadow-md">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  triggerFloat("minus");
                  if (cartQty <= 1) removeItem(cartKey);
                  else updateQty(cartKey, cartQty - 1);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-l-full text-xs font-bold text-gray-700 transition-colors active:text-red-500"
                aria-label="Quitar uno"
              >
                −
              </button>
              <span className="min-w-[18px] text-center text-xs font-bold text-gray-900">{cartQty}</span>
              <button
                onClick={handleAddToCart}
                className="flex h-7 w-7 items-center justify-center rounded-r-full text-xs font-bold text-gray-700 transition-colors active:text-green-500"
                aria-label="Añadir uno más"
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            aria-label="Añadir al carrito"
            className="absolute right-2 bottom-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-all sm:hidden"
          >
            <ShoppingCart size={15} className="text-gray-700" />
          </button>
        )
      )}
    </Link>
  );

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: `${color}22` }}>
        {isCardCategory ? (
          <div className="relative">
            <HoloCard intensity="subtle">{imageBlock}</HoloCard>
            {/* Badges outside holo tilt */}
            <div className="pointer-events-none absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
              {product.language && <LanguageFlag language={product.language} size="md" />}
              {(() => {
                const si2 = getStockInfo(product.inStock ? product.stock : 0);
                if (si2.level === "unlimited" || si2.level === "available") return null;
                return (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${si2.level === "out" ? "bg-gray-500 text-white" : si2.level === "last" ? "bg-red-500 text-white" : "bg-amber-500 text-white"}`}>
                    {si2.level === "out" ? "AGOTADO" : si2.label.toUpperCase()}
                  </span>
                );
              })()}
            </div>
          </div>
        ) : (
          imageBlock
        )}

        {/* ── INFO ── */}
        <div className="mt-auto flex flex-col gap-1 px-2.5 py-2">
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
              <span className="text-[10px] text-gray-300">IVA incl.</span>
              {effectiveHasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  {effectiveComparePrice!.toFixed(2)}€
                </span>
              )}
            </div>
          </div>
          {typeof product.maxPerUser === "number" && (
            <span className="text-[10px] text-gray-400">
              Máx. {product.maxPerUser} uds/persona
            </span>
          )}
          {limitMsg && (
            <span className="text-[10px] font-semibold text-red-500">
              {limitMsg}
            </span>
          )}
        </div>
      </div>

    </>
  );
}

export const LocalProductCard = memo(LocalProductCardInner);
