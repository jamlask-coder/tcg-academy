"use client"
import { useAuth } from "@/context/AuthContext"
import { getFeaturedProducts } from "@/data/products"
import { Tag, TrendingDown } from "lucide-react"

export default function PreciosPage() {
  const { user } = useAuth()
  if (!user) return null

  const isWholesale = user.role === "mayorista"
  const isStore = user.role === "tienda"

  if (user.role === "cliente") {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <Tag size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="font-bold text-gray-700">Esta seccion es solo para mayoristas y tiendas</p>
      </div>
    )
  }

  const sampleProducts = getFeaturedProducts(6)
  const label = isWholesale ? "Mayorista" : "Tienda TCG"
  const getSpecialPrice = (p: typeof sampleProducts[0]) =>
    isWholesale ? p.wholesalePrice : p.storePrice

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tus precios especiales</h1>
        <p className="text-gray-500 text-sm mt-1">Nivel: <strong>{label}</strong></p>
      </div>

      {/* Savings banner */}
      <div
        className={`rounded-2xl p-6 mb-8 text-white ${isStore ? "bg-gradient-to-br from-purple-700 to-purple-900" : "bg-gradient-to-br from-blue-700 to-blue-900"}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <TrendingDown size={24} />
          <h2 className="text-lg font-bold">
            {isStore ? "Descuento Tienda TCG activo" : "Descuento Mayorista activo"}
          </h2>
        </div>
        <p className="text-blue-100 text-sm">
          {isStore
            ? "Como tienda asociada, tienes un descuento del 25% sobre el PVP general en todo el catalogo."
            : "Como mayorista verificado, tienes un descuento del 18% sobre el PVP general en todo el catalogo."}
        </p>
        <p className="text-blue-200 text-xs mt-2">
          Los precios que ves en el catalogo ya reflejan tu descuento automaticamente.
        </p>
      </div>

      {/* Comparison table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Comparativa de precios — productos destacados</h2>
          <p className="text-xs text-gray-500 mt-0.5">Tu ahorro vs. PVP General</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Producto</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">PVP General</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: isStore ? "#7c3aed" : "#2563eb" }}>
                  PVP {label}
                </th>
                <th className="text-right px-6 py-3 font-semibold text-green-600">Ahorro</th>
              </tr>
            </thead>
            <tbody>
              {sampleProducts.map((p) => {
                const special = getSpecialPrice(p)
                const saving = p.price - special
                const pct = Math.round((saving / p.price) * 100)
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 line-clamp-1">{p.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{p.game}</p>
                    </td>
                    <td className="text-right px-4 py-4 text-gray-500 line-through">{p.price.toFixed(2)}€</td>
                    <td className="text-right px-4 py-4 font-bold" style={{ color: isStore ? "#7c3aed" : "#2563eb" }}>
                      {special.toFixed(2)}€
                    </td>
                    <td className="text-right px-6 py-4">
                      <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full">
                        -{pct}% ({saving.toFixed(2)}€)
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
