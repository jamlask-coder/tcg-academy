"use client";
import { memo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Heart, Check, Trash2, Bell } from "lucide-react";
import { getStockInfo, getEffectiveStock, isProductInStock } from "@/utils/stockStatus";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { subscribeRestock, isSubscribed } from "@/services/restockService";
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
import { isLocalProduct, getProductUrl } from "@/lib/productStore";

interface Props {
  product: LocalProduct;
}

function LocalProductCardInner({ product }: Props) {
  const { addItem, items, updateQty, removeItem } = useCart();
  const { user } = useAuth();
  const { toggle: toggleFavorite, isFavorite } = useFavorites();
  const isAdmin = user?.role === "admin";

  const [added, setAdded] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | undefined>(undefined);
  const [hovered, setHovered] = useState(false);
  const [floatAnims, setFloatAnims] = useState<{ type: "plus" | "minus"; key: number }[]>([]);
  const [imageBroken, setImageBroken] = useState(false);
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
  const [restockSub, setRestockSub] = useState(() =>
    user?.email ? isSubscribed(product.id, user.email) : false,
  );

  const isOutOfStock = !isProductInStock(product);
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

  // Defer localStorage check to after hydration to avoid SSR mismatch.
  // Los productos creados en admin (id > 1.7B) no están en build estático;
  // van a `/producto/{slug}`. El resto usa la ruta canónica SEO.
  const staticHref = `/${product.game}/${product.category}/${product.slug}`;
  const [href, setHref] = useState(staticHref);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLocalProduct(product.id)) setHref(getProductUrl(product));
  }, [product]);
  const isCardCategory =
    CARD_CATEGORIES.has(product.category) &&
    (product.game === "pokemon" || product.game === "riftbound");

  // 2026-04-29: aspect-square → 5/6 para que el producto respire un poco más
  // bajo el botón flotante (queja del usuario: "se ve poco porque sale este
  // mismo botón"). Subida moderada — no más para no romper la grid.
  const imageAspect = "aspect-[5/6]";
  // 2026-04-29: object-top → la imagen se ancla arriba en lugar de centrarse.
  // Para productos landscape (displays, sobres anchos) object-contain dejaba
  // mucho aire arriba Y abajo. Ahora ese aire se concentra abajo (donde la
  // card respira hacia el footer/precio) y la imagen queda pegada bajo los
  // badges. Padding mínimo arriba para no chocar con el badge NUEVO.
  const imageObjectFit =
    "object-contain object-top !px-2 !pt-1 !pb-0";
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
      {displayImage && !imageBroken ? (
        <Image
          src={displayImage}
          alt={`${product.name} — ${config?.name ?? product.game} | TCG Academy`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
          onError={() => setImageBroken(true)}
          unoptimized={
            displayImage.startsWith("data:") ||
            displayImage.startsWith("blob:") ||
            displayImage.startsWith("http")
          }
          className={`${imageObjectFit} transition-all duration-300 ${isOutOfStock ? "opacity-50" : ""}`}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-3 p-4 ${isOutOfStock ? "opacity-50" : ""}`}
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

      {/* ── ESQUINA SUPERIOR IZQUIERDA: NUEVO → stock → descuento → corazón ── */}
      <div className="absolute top-2 left-2 z-10 flex max-w-[calc(100%-2.75rem)] flex-col items-start gap-1">
        {isNewProduct(product) && (
          <span className="animate-badge-pulse inline-flex h-5 items-center rounded-full bg-green-500 px-2 text-[10px] leading-none font-bold text-white shadow-sm">
            NUEVO
          </span>
        )}
        {(() => {
          const si = getStockInfo(getEffectiveStock(product));
          if (si.level === "unlimited" || si.level === "available") return null;
          if (si.level === "out") {
            return (
              <span className="inline-flex h-5 items-center rounded-full bg-gray-500 px-2 text-[10px] leading-none font-bold text-white shadow-sm">
                AGOTADO
              </span>
            );
          }
          const bg = si.level === "last" ? "bg-red-500" : "bg-amber-500";
          const shortLabel = si.level === "last" ? "¡ÚLTIMAS!" : "POCAS";
          return (
            <span className={`inline-flex h-5 max-w-full items-center rounded-full px-2 text-[10px] leading-none font-bold whitespace-nowrap text-white shadow-sm ${bg}`}>
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{si.label.toUpperCase()}</span>
            </span>
          );
        })()}
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

      {/* ── ESQUINA SUPERIOR DERECHA: bandera de idioma ── */}
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
        {product.language && <LanguageFlag language={product.language} size="md" />}
      </div>

      {/* ── FRANJA INFERIOR: Añadir al carrito (desktop, SIEMPRE visible) ──
          Fix 2026-04-22: antes solo aparecía en hover (`hidden opacity-0
          group-hover:opacity-100`) y el usuario lo consideró un bug grave.
          Ver memory: feedback_cart_button_always_visible.md */}
      {!isOutOfStock && (
        <div className="absolute right-0 bottom-0 left-0 hidden sm:block">
          <div className="relative bg-gradient-to-t from-black/60 via-black/25 to-transparent px-2 pt-3 pb-1.5">
            <style>{`
              @keyframes floatUp {
                0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                70% { opacity: 1; }
                100% { opacity: 0; transform: translateX(-50%) translateY(-32px) scale(1); }
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
                // 2026-04-29: pill unificado "− X en la cesta +" — sustituye al
                // stepper blanco + pastilla "Añadido" debajo (eran 2 piezas).
                // Mantiene los colores amber del botón "Añadir" para que la
                // continuidad visual sea total.
                <div className="flex w-full items-stretch overflow-hidden rounded-lg border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 shadow-[0_2px_12px_rgba(217,119,6,0.28)]">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      triggerFloat("minus");
                      if (cartQty <= 1) removeItem(cartKey);
                      else updateQty(cartKey, cartQty - 1);
                    }}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-amber-800 transition-colors duration-150 hover:bg-amber-100/60 active:scale-90"
                    aria-label={cartQty <= 1 ? "Eliminar del carrito" : "Quitar uno"}
                  >
                    {cartQty <= 1 ? (
                      <Trash2 size={13} />
                    ) : (
                      <span className="text-lg leading-none font-bold">−</span>
                    )}
                  </button>
                  <span className="flex flex-1 items-center justify-center gap-1.5 px-1 text-sm font-bold text-amber-800">
                    <ShoppingCart size={13} strokeWidth={2.5} />
                    {cartQty} en la cesta
                  </span>
                  <button
                    onClick={(e) => { handleAddToCart(e); }}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-amber-800 transition-colors duration-150 hover:bg-amber-100/60 active:scale-90"
                    aria-label="Añadir uno más"
                  >
                    <span className="text-lg leading-none font-bold">+</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="gold-sweep flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 py-2 text-sm font-bold text-amber-800 shadow-[0_2px_12px_rgba(217,119,6,0.28)] transition-all duration-200 hover:from-amber-50 hover:to-amber-100 hover:shadow-[0_6px_24px_rgba(217,119,6,0.45)] hover:scale-[1.03] active:scale-[0.97]"
                >
                  <ShoppingCart size={14} /> Añadir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Restock alert (desktop, SIEMPRE visible) ── */}
      {isOutOfStock && (
        <div className="absolute right-0 bottom-0 left-0 hidden sm:block">
          <div className="bg-gradient-to-t from-black/60 via-black/25 to-transparent px-2 pt-3 pb-1.5">
            {restockSub ? (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-green-50 py-2 text-xs font-bold text-green-600">
                <Check size={13} /> Te avisaremos
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const email = user?.email ?? prompt("Tu email para avisarte:");
                  if (!email) return;
                  subscribeRestock(product.id, product.name, email, email.split("@")[0]);
                  setRestockSub(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
              >
                <Bell size={12} /> Avisar cuando haya stock
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MÓVIL: carrito (botón ancho debajo de la imagen, siempre visible) ── */}
      {!isOutOfStock && (
        <div className="absolute right-0 bottom-0 left-0 z-10 px-2 pb-0.5 sm:hidden">
          {cartQty > 0 ? (
            <div
              style={{ animation: cartQty === 1 && added ? "scaleIn 0.3s ease-out" : "none" }}
              className="relative"
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
              {/* Mobile pill — mismo lenguaje que desktop, dimensiones reducidas */}
              <div className="flex items-stretch overflow-hidden rounded-md border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 shadow-[0_2px_8px_rgba(217,119,6,0.22)]">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    triggerFloat("minus");
                    if (cartQty <= 1) removeItem(cartKey);
                    else updateQty(cartKey, cartQty - 1);
                  }}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-amber-800 transition-colors active:scale-90"
                  aria-label={cartQty <= 1 ? "Eliminar del carrito" : "Quitar uno"}
                >
                  {cartQty <= 1 ? (
                    <Trash2 size={10} />
                  ) : (
                    <span className="text-sm leading-none font-bold">−</span>
                  )}
                </button>
                <span className="flex flex-1 items-center justify-center gap-1 text-[11px] font-bold text-amber-800">
                  <ShoppingCart size={10} strokeWidth={2.5} />
                  {cartQty} en la cesta
                </span>
                <button
                  onClick={handleAddToCart}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-amber-800 transition-colors active:scale-90"
                  aria-label="Añadir uno más"
                >
                  <span className="text-sm leading-none font-bold">+</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="gold-sweep flex w-full items-center justify-center gap-1.5 rounded-md border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 py-1.5 text-[11px] font-bold text-amber-800 shadow-[0_2px_8px_rgba(217,119,6,0.22)] transition-all duration-200 active:scale-[0.97]"
            >
              <ShoppingCart size={13} /> Añadir
            </button>
          )}
        </div>
      )}
    </Link>
  );

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: `${color}22` }}>
        {isCardCategory ? (
          <div className="relative">
            <HoloCard intensity="subtle">{imageBlock}</HoloCard>
            {/* Badge idioma — derecha */}
            <div className="pointer-events-none absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
              {product.language && <LanguageFlag language={product.language} size="md" />}
            </div>
            {/* Badge stock — izquierda */}
            {(() => {
              const si2 = getStockInfo(getEffectiveStock(product));
              if (si2.level === "unlimited" || si2.level === "available") return null;
              if (si2.level === "out") {
                return (
                  <div className="pointer-events-none absolute top-2 left-2 z-20">
                    <span className="rounded-full bg-gray-500 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white shadow-sm">
                      AGOTADO
                    </span>
                  </div>
                );
              }
              const bg2 = si2.level === "last" ? "bg-red-500" : "bg-amber-500";
              const shortLabel2 = si2.level === "last" ? "¡ÚLTIMAS!" : "POCAS";
              return (
                <div className="pointer-events-none absolute top-2 left-2 z-20 max-w-[calc(100%-2.75rem)]">
                  <span className={`inline-block max-w-full rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white shadow-sm ${bg2}`}>
                    <span className="sm:hidden">{shortLabel2}</span>
                    <span className="hidden sm:inline">{si2.label.toUpperCase()}</span>
                  </span>
                </div>
              );
            })()}
          </div>
        ) : (
          imageBlock
        )}

        {/* ── INFO ── */}
        <div className="flex flex-col gap-0.5 px-2.5 pt-0.5 pb-2 sm:gap-1 sm:pt-2">
          <span className="text-[9px] font-semibold tracking-wider text-gray-400 uppercase sm:text-[10px]">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </span>
          <Link href={href}>
            <h3 className="line-clamp-2 text-[11px] leading-tight font-semibold text-gray-800 transition hover:text-[#2563eb] sm:text-xs sm:leading-snug">
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
              <span className="text-[10px] text-gray-300">IVA incl.</span>
            </div>
          </div>
          {(() => {
            const who = user?.role === "mayorista" ? "mayorista" : user?.role === "tienda" ? "tienda" : "cliente";
            const roleLimit =
              user?.role === "mayorista"
                ? product.maxPerWholesaler
                : user?.role === "tienda"
                  ? product.maxPerStore
                  : product.maxPerClient;
            const effectiveLimit = typeof roleLimit === "number" ? roleLimit : product.maxPerUser;
            return typeof effectiveLimit === "number" ? (
              <span className="text-[10px] text-gray-400">
                Máx. {effectiveLimit} uds/{who}
              </span>
            ) : null;
          })()}
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
