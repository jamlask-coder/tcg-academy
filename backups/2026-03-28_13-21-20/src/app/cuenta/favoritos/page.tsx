"use client"
import Link from "next/link"
import { Heart, ShoppingBag } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { PRODUCTS } from "@/data/products"
import { LocalProductCard } from "@/components/product/LocalProductCard"

export default function FavoritosPage() {
  const { user } = useAuth()
  const favorites = PRODUCTS.filter((p) => user?.favorites.includes(p.id))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis favoritos</h1>
        <p className="text-gray-500 text-sm mt-1">{favorites.length} producto{favorites.length !== 1 ? "s" : ""} guardados</p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Heart size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="font-bold text-gray-700 mb-2">No tienes favoritos todavia</p>
          <p className="text-gray-500 text-sm mb-6">
            Haz click en el corazon de cualquier producto para guardarlo aqui
          </p>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#15304d] transition"
          >
            <ShoppingBag size={16} /> Explorar catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((p) => (
            <LocalProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
