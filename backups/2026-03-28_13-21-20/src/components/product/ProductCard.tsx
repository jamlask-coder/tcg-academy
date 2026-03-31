"use client"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { useState } from "react"
import type { Product } from "@/types"

interface Props {
  product: Product
}

export function ProductCard({ product }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  const price = parseFloat(product.price || "0")
  const regularPrice = parseFloat(product.regular_price || "0")
  const onSale = product.on_sale && regularPrice > price
  const image = product.images?.[0]?.src || "/placeholder-card.jpg"
  const inStock = product.stock_status === "instock"

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!inStock) return
    addItem(product.id, product.name, price, image)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
      <Link href={`/producto/${product.slug}`} className="relative aspect-[3/4] overflow-hidden bg-gray-50 block">
        <Image
          src={image} alt={product.images?.[0]?.alt || product.name}
          fill className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {onSale && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">OFERTA</span>
          )}
          {product.featured && (
            <span className="bg-[#1a3a5c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NUEVO</span>
          )}
          {!inStock && (
            <span className="bg-gray-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">AGOTADO</span>
          )}
        </div>
        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted) }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition opacity-0 group-hover:opacity-100">
          <Heart size={15} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"} />
        </button>
      </Link>

      <div className="p-3 flex flex-col flex-1 gap-1">
        {product.categories?.[0] && (
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {product.categories[0].name}
          </span>
        )}
        <Link href={`/producto/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 hover:text-[#1a3a5c] transition">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-auto pt-1">
          <span className="text-lg font-bold text-[#1a3a5c]">{price.toFixed(2)}€</span>
          {onSale && (
            <span className="text-sm text-gray-400 line-through">{regularPrice.toFixed(2)}€</span>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={handleAddToCart}
          disabled={!inStock || added}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            !inStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : added
              ? "bg-green-500 text-white"
              : "bg-[#1a3a5c] text-white hover:bg-[#15304d] active:scale-95"
          }`}>
          <ShoppingCart size={15} />
          {!inStock ? "Sin stock" : added ? "Anadido!" : "Anadir al carrito"}
        </button>
      </div>
    </div>
  )
}
