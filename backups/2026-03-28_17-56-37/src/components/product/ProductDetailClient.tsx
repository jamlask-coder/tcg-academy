"use client"
import Link from "next/link"
import { ShoppingCart, Heart, ChevronLeft, Plus, Minus, Clock, Star } from "lucide-react"
import { useState, useRef } from "react"
import { useCart } from "@/context/CartContext"
import { useAuth } from "@/context/AuthContext"
import { LANGUAGE_FLAGS, LANGUAGE_NAMES, PRODUCTS, type LocalProduct } from "@/data/products"
import { LanguageFlag } from "@/components/ui/LanguageFlag"
import { usePrice } from "@/hooks/usePrice"
import { LocalProductCard } from "@/components/product/LocalProductCard"

interface GameConfig {
  name: string
  color: string
  bgColor: string
  description: string
  emoji: string
}

interface Props {
  product: LocalProduct
  config: GameConfig
  catLabel: string
}

// Find same product in other languages (same game + category + slug base)
function getLangVariants(product: LocalProduct) {
  if (!product.language) return []
  const base = product.slug.replace(/-(?:es|en|jp|fr|de|it|ko|pt)$/i, "")
  return PRODUCTS.filter(
    (p) =>
      p.game === product.game &&
      p.category === product.category &&
      p.id !== product.id &&
      p.language !== product.language &&
      p.slug.replace(/-(?:es|en|jp|fr|de|it|ko|pt)$/i, "") === base
  ).slice(0, 4)
}

// Find related products from same game
function getRelated(product: LocalProduct) {
  return PRODUCTS.filter(
    (p) => p.game === product.game && p.id !== product.id && p.inStock
  )
    .sort(() => 0)
    .slice(0, 4)
}

function PriceDisplay({ product, color }: { product: LocalProduct; color: string }) {
  const { role } = useAuth()
  const { displayPrice, comparePrice, hasDiscount, discountPct, etiquetaRol } = usePrice(product)

  if (role === "admin") {
    return (
      <div className="space-y-2">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold" style={{ color }}>{displayPrice.toFixed(2)}€</span>
          {hasDiscount && (
            <span className="text-xl text-gray-400 line-through mb-1">{comparePrice!.toFixed(2)}€</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-medium">
            PVP General: {product.price.toFixed(2)}€
          </span>
          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">
            Mayorista: {product.wholesalePrice.toFixed(2)}€
          </span>
          <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium">
            Tienda: {product.storePrice.toFixed(2)}€
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {etiquetaRol && (
        <span
          className="inline-flex items-center self-start px-3 py-1 rounded-xl text-xs font-bold mb-1"
          style={{
            backgroundColor: etiquetaRol === "Precio B2B" ? "#1e40af18" : "#15803d18",
            color: etiquetaRol === "Precio B2B" ? "#1e40af" : "#15803d",
          }}
        >
          {etiquetaRol}
        </span>
      )}
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold" style={{ color }}>
          {displayPrice.toFixed(2)}€
        </span>
        {hasDiscount && (
          <>
            <span className="text-xl text-gray-400 line-through mb-1">{comparePrice!.toFixed(2)}€</span>
            <span className="text-sm font-bold px-2 py-0.5 rounded-lg mb-1" style={{ backgroundColor: `${color}18`, color }}>
              -{discountPct}%
            </span>
          </>
        )}
      </div>
      {etiquetaRol && (
        <span className="text-xs text-gray-500">(IVA incluido)</span>
      )}
    </div>
  )
}

export function ProductDetailClient({ product, config, catLabel }: Props) {
  const { addItem } = useCart()
  const { name, color, bgColor } = config

  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  const { displayPrice } = usePrice(product)

  // Image zoom
  const [zoom, setZoom] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const imgContainerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const handleAddToCart = () => {
    if (!product.inStock) return
    addItem(product.id, product.name, displayPrice, product.images[0] ?? "", qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const displayImages = product.images.length > 0 ? product.images : [null]
  const langVariants = getLangVariants(product)
  const related = getRelated(product)

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
        <Link href="/" className="hover:text-[#1a3a5c]">Inicio</Link>
        <span>/</span>
        <Link href={`/${product.game}`} className="hover:text-[#1a3a5c]">{name}</Link>
        <span>/</span>
        <Link href={`/${product.game}/${product.category}`} className="hover:text-[#1a3a5c]">{catLabel}</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 mb-16">
        {/* Gallery */}
        <div>
          <div
            ref={imgContainerRef}
            className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-3 cursor-zoom-in select-none"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={handleMouseMove}
          >
            {displayImages[activeImg] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImages[activeImg]!}
                alt={product.name}
                className="w-full h-full object-contain p-4 pointer-events-none"
                style={{
                  transform: zoom ? "scale(2.2)" : "scale(1)",
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transition: zoom ? "transform 0.08s ease-out" : "transform 0.25s ease-out",
                }}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-4"
                style={{ background: `linear-gradient(135deg, ${color}18, ${color}35)` }}
              >
                <span className="text-8xl">{config.emoji}</span>
                <span className="text-sm font-bold text-center px-6 leading-tight" style={{ color }}>{product.name}</span>
              </div>
            )}
            {product.language && (
              <div className="absolute top-3 left-3 z-10"><LanguageFlag language={product.language} showLabel /></div>
            )}
            {product.isNew && (
              <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">NUEVO</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition ${
                    i === activeImg ? "border-[#1a3a5c]" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="flex flex-col gap-5">
          {/* Back link */}
          <Link
            href={`/${product.game}/${product.category}`}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:underline"
            style={{ color }}
          >
            <ChevronLeft size={14} /> {catLabel}
          </Link>

          {/* 1. Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

          {/* 2. Language */}
          {product.language && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border-2"
                  style={{ borderColor: color, color }}
                >
                  {LANGUAGE_FLAGS[product.language] ?? ""} {LANGUAGE_NAMES[product.language] ?? product.language}
                </span>
              </div>
              {langVariants.length > 0 && (
                <p className="text-xs text-gray-500">
                  También disponible en:{" "}
                  {langVariants.map((v, i) => (
                    <span key={v.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/${v.game}/${v.category}/${v.slug}`}
                        className="font-semibold hover:underline"
                        style={{ color }}
                      >
                        {LANGUAGE_FLAGS[v.language] ?? ""} {LANGUAGE_NAMES[v.language] ?? v.language}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

          {/* Mock ratings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={s <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">4.8 (124 reseñas)</span>
          </div>

          {/* 3. Price */}
          <PriceDisplay product={product} color={color} />

          {/* 4. Stock */}
          <div className={`inline-flex items-center gap-2 text-sm font-semibold ${product.inStock ? "text-green-600" : "text-red-500"}`}>
            <div className={`w-2 h-2 rounded-full ${product.inStock ? "bg-green-500" : "bg-red-400"}`} />
            {product.inStock ? "En stock — Listo para enviar" : "Sin stock"}
          </div>

          {/* 5. Description */}
          <div className="text-sm text-gray-600 leading-relaxed border-l-4 pl-4" style={{ borderColor: `${color}60` }}>
            {product.description || product.shortDescription}
          </div>

          {/* 6. Qty + Add to cart */}
          <div className="flex gap-3 items-center">
            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition">
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold text-lg">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition">
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || added}
              className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                !product.inStock ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : added ? "bg-green-500 text-white"
                : "bg-[#1a3a5c] text-white hover:bg-[#15304d] active:scale-[0.98]"
              }`}
            >
              <ShoppingCart size={18} />
              {!product.inStock ? "Sin stock" : added ? "¡Añadido al carrito!" : "Añadir al carrito"}
            </button>
            <button
              onClick={() => setWishlisted(!wishlisted)}
              className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-red-300 transition"
            >
              <Heart size={18} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-500"} />
            </button>
          </div>

          {/* 7. Shipping info */}
          <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl text-sm">
            <Clock size={16} className="text-[#1a3a5c] flex-shrink-0" />
            <span className="text-gray-600">Enviamos en menos de 24h con <strong>GLS</strong> — Envío gratis desde 149€</span>
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.slice(0, 5).map((tag) => (
                <span key={tag} className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Specs table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-12">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Ficha técnica</h2>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-3">
          {[
            ["Juego", name],
            ["Categoría", catLabel],
            ["Idioma", product.language ? `${LANGUAGE_FLAGS[product.language] ?? ""} ${LANGUAGE_NAMES[product.language] ?? product.language}` : "—"],
            ["Estado", product.inStock ? "✅ En stock" : "❌ Agotado"],
            ["Referencia", `TCG-${product.id}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-sell */}
      {related.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
