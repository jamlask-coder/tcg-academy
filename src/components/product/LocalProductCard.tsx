"use client"
import Link from "next/link"
import { ShoppingCart, Heart, Check, Star } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { useState } from "react"
import { GAME_CONFIG, CATEGORY_LABELS, type LocalProduct } from "@/data/products"
import { LanguageFlag } from "@/components/ui/LanguageFlag"
import { usePrice } from "@/hooks/usePrice"

interface Props {
  product: LocalProduct
}

export function LocalProductCard({ product }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  const config = GAME_CONFIG[product.game]
  const color = config?.color ?? "#1a3a5c"
  const image = product.images[0]
  const { displayPrice, comparePrice, hasDiscount, discountPct, showVATBreakdown, priceWithoutVAT, etiquetaRol } = usePrice(product)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!product.inStock) return
    addItem(product.id, product.name, displayPrice, image ?? "")
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    setWishlisted(!wishlisted)
  }

  const href = `/${product.game}/${product.category}/${product.slug}`

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300">
      <Link href={href} className="relative aspect-[3/4] overflow-hidden bg-gray-50 block flex-shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3 p-4"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}30)` }}
          >
            <span className="text-5xl">{config?.emoji ?? "🃏"}</span>
            <span
              className="text-[11px] font-bold text-center leading-tight line-clamp-3 px-2"
              style={{ color }}
            >
              {product.name}
            </span>
          </div>
        )}

        {/* ── ESQUINA SUPERIOR IZQUIERDA: bandera de idioma + badge descuento ── */}
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
          {product.language && (
            <LanguageFlag language={product.language} />
          )}
          {hasDiscount && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              -{discountPct}%
            </span>
          )}
        </div>

        {/* ── ESQUINA SUPERIOR DERECHA: corazón (SIEMPRE visible) + badges ── */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          {/* Heart — always visible */}
          <button
            onClick={toggleWishlist}
            aria-label={wishlisted ? "Quitar de favoritos" : "Añadir a favoritos"}
            className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
              wishlisted
                ? "bg-red-500 text-white"
                : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-white"
            }`}
          >
            <Heart size={13} className={wishlisted ? "fill-white" : ""} />
          </button>
          {/* NUEVO badge */}
          {product.isNew && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-badge-pulse">
              NUEVO
            </span>
          )}
          {/* AGOTADO badge */}
          {!product.inStock && (
            <span className="bg-gray-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              AGOTADO
            </span>
          )}
        </div>

        {/* ── FRANJA INFERIOR: Añadir al carrito (desktop hover) ── */}
        {product.inStock && (
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
            <div className="bg-gradient-to-t from-black/50 via-black/20 to-transparent pt-6 pb-2 px-2">
              <button
                onClick={handleAddToCart}
                className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                  added ? "bg-green-500 text-white" : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                {added
                  ? <><Check size={14} /> Añadido</>
                  : <><ShoppingCart size={14} /> Añadir al carrito</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── MÓVIL: icono carrito (abajo a la derecha, siempre visible) ── */}
        {product.inStock && (
          <button
            onClick={handleAddToCart}
            aria-label="Añadir al carrito"
            className={`sm:hidden absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md z-10 transition-all ${
              added ? "bg-green-500 text-white" : "bg-white text-gray-700"
            }`}
          >
            {added ? <Check size={15} /> : <ShoppingCart size={15} />}
          </button>
        )}
      </Link>

      {/* ── INFO ── */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </span>
        <Link href={href}>
          <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 hover:text-[#1a3a5c] transition">
            {product.name}
          </h3>
        </Link>
        {/* Mock ratings */}
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map((s) => (
            <Star key={s} size={10} className={s <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
          ))}
          <span className="text-[10px] text-gray-400 ml-0.5">(4.{(product.id % 9) + 1})</span>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {etiquetaRol && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: etiquetaRol === "Precio B2B" ? "#1e40af18" : "#15803d18",
                    color: etiquetaRol === "Precio B2B" ? "#1e40af" : "#15803d",
                  }}
                >
                  {etiquetaRol}
                </span>
              )}
              <span className="text-lg font-bold" style={{ color }}>{displayPrice.toFixed(2)}€</span>
              {hasDiscount && (
                <span className="text-sm text-gray-400 line-through">{comparePrice!.toFixed(2)}€</span>
              )}
            </div>
            {showVATBreakdown && (
              <span className="text-[10px] text-gray-400">{priceWithoutVAT.toFixed(2)}€ s/IVA</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
