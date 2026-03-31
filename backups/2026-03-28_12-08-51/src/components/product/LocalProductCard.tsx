"use client"
import Link from "next/link"
import { ShoppingCart, Heart, Check } from "lucide-react"
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
  const { displayPrice, comparePrice, hasDiscount, discountPct } = usePrice(product)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!product.inStock) return
    addItem(product.id, product.name, displayPrice, image ?? "")
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const href = `/${product.game}/${product.category}/${product.slug}`

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:border-gray-300">
      <Link href={href} className="relative aspect-[3/4] overflow-hidden bg-gray-50 block flex-shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
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

        {/* Language flag — top-left, always visible */}
        {product.language && (
          <div className="absolute top-2 left-2 z-10">
            <LanguageFlag language={product.language} />
          </div>
        )}

        {/* Badges — top-right */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {product.isNew && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NUEVO</span>
          )}
          {hasDiscount && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{discountPct}%</span>
          )}
          {!product.inStock && (
            <span className="bg-gray-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">AGOTADO</span>
          )}
        </div>

        {/* Desktop hover overlay — add to cart button appears on hover */}
        {product.inStock && (
          <div className="hidden sm:flex absolute inset-0 items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/40 via-transparent to-transparent">
            <button
              onClick={handleAddToCart}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                added ? "bg-green-500 text-white" : "bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              {added ? <><Check size={15} /> Añadido</> : <><ShoppingCart size={15} /> Añadir al carrito</>}
            </button>
          </div>
        )}

        {/* Mobile always-visible cart icon — bottom-right corner */}
        {product.inStock && (
          <button
            onClick={handleAddToCart}
            className={`sm:hidden absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
              added ? "bg-green-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {added ? <Check size={16} /> : <ShoppingCart size={16} />}
          </button>
        )}

        {/* Wishlist button — desktop hover */}
        <button
          onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted) }}
          className="absolute bottom-2 left-2 w-8 h-8 bg-white/90 rounded-full hidden sm:flex items-center justify-center shadow-sm hover:bg-white transition opacity-0 group-hover:opacity-100"
        >
          <Heart size={14} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"} />
        </button>
      </Link>

      <div className="p-3 flex flex-col flex-1 gap-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </span>
        <Link href={href}>
          <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 hover:text-[#1a3a5c] transition">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color }}>{displayPrice.toFixed(2)}€</span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">{comparePrice!.toFixed(2)}€</span>
            )}
          </div>
          {/* Mobile wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted) }}
            className="sm:hidden w-8 h-8 flex items-center justify-center"
          >
            <Heart size={14} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-300"} />
          </button>
        </div>
      </div>
    </div>
  )
}
