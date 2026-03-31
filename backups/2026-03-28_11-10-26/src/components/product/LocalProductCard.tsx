"use client"
import Link from "next/link"
import { ShoppingCart, Heart } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { useState } from "react"
import { GAME_CONFIG, LANGUAGE_FLAGS, CATEGORY_LABELS, type LocalProduct } from "@/data/products"
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
          /* Gradient placeholder */
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

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
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

        {/* Language flag */}
        {product.language && (
          <div className="absolute top-2 right-2 text-base leading-none">
            {LANGUAGE_FLAGS[product.language] ?? product.language}
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted) }}
          className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition opacity-0 group-hover:opacity-100"
        >
          <Heart size={15} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"} />
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
        <div className="flex items-center gap-2 mt-auto pt-1">
          <span className="text-lg font-bold" style={{ color }}>{displayPrice.toFixed(2)}€</span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">{comparePrice!.toFixed(2)}€</span>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock || added}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            !product.inStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : added
              ? "bg-green-500 text-white"
              : "bg-[#1a3a5c] text-white hover:bg-[#15304d] active:scale-95"
          }`}
        >
          <ShoppingCart size={15} />
          {!product.inStock ? "Sin stock" : added ? "Anadido!" : "Anadir al carrito"}
        </button>
      </div>
    </div>
  )
}
