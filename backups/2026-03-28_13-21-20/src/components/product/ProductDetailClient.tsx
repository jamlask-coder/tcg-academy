"use client"
import Link from "next/link"
import { ShoppingCart, Heart, Truck, Shield, ChevronLeft, Plus, Minus, Star } from "lucide-react"
import { useState, useRef } from "react"
import { useCart } from "@/context/CartContext"
import { LANGUAGE_FLAGS, LANGUAGE_NAMES, type LocalProduct } from "@/data/products"
import { LanguageFlag } from "@/components/ui/LanguageFlag"
import { usePrice } from "@/hooks/usePrice"

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

export function ProductDetailClient({ product, config, catLabel }: Props) {
  const { addItem } = useCart()
  const { name, color, bgColor } = config

  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [tab, setTab] = useState<"desc" | "specs" | "envio">("desc")

  const { displayPrice, comparePrice, hasDiscount, discountPct, priceLabel } = usePrice(product)

  // Image zoom state
  const [zoom, setZoom] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const imgContainerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPos({ x, y })
  }

  const handleAddToCart = () => {
    if (!product.inStock) return
    addItem(product.id, product.name, displayPrice, product.images[0] ?? "", qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const displayImages =
    product.images.length > 0 ? product.images : [null]

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
          {/* Main image with zoom */}
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
                  transition: zoom
                    ? "transform 0.08s ease-out"
                    : "transform 0.25s ease-out",
                }}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-4"
                style={{ background: `linear-gradient(135deg, ${color}18, ${color}35)` }}
              >
                <span className="text-8xl">{config.emoji}</span>
                <span className="text-sm font-bold text-center px-6 leading-tight" style={{ color }}>
                  {product.name}
                </span>
              </div>
            )}
            {/* Language flag overlay */}
            {product.language && (
              <div className="absolute top-3 left-3 z-10">
                <LanguageFlag language={product.language} showLabel />
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                -{discountPct}%
              </div>
            )}
            {product.isNew && (
              <div className={`absolute ${hasDiscount ? "top-10 right-3" : "top-3 right-3"} bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full`}>
                NUEVO
              </div>
            )}
          </div>

          {/* Thumbnails */}
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

        {/* Buy Box */}
        <div className="flex flex-col gap-5">
          {/* Back to category */}
          <Link
            href={`/${product.game}/${product.category}`}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:underline"
            style={{ color }}
          >
            <ChevronLeft size={14} /> {catLabel}
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>

          {/* Language + tags */}
          <div className="flex flex-wrap items-center gap-2">
            {product.language && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2"
                style={{ borderColor: color, color }}
              >
                {LANGUAGE_FLAGS[product.language] ?? ""}{" "}
                Idioma: {LANGUAGE_NAMES[product.language] ?? product.language}
              </span>
            )}
            {product.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1">
            {priceLabel && (
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                {priceLabel}
              </span>
            )}
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold" style={{ color }}>
                {displayPrice.toFixed(2)}€
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-gray-400 line-through mb-1">
                    {comparePrice!.toFixed(2)}€
                  </span>
                  <span
                    className="text-sm font-bold px-2 py-0.5 rounded-lg mb-1"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Stock indicator */}
          <div
            className={`inline-flex items-center gap-2 text-sm font-semibold ${
              product.inStock ? "text-green-600" : "text-red-500"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                product.inStock ? "bg-green-500" : "bg-red-400"
              }`}
            />
            {product.inStock ? "En stock" : "Sin stock"}
          </div>

          {/* Short description */}
          <p className="text-sm text-gray-600 leading-relaxed border-l-4 pl-4" style={{ borderColor: bgColor }}>
            {product.shortDescription}
          </p>

          {/* Quantity + Add to cart */}
          <div className="flex gap-3 items-center">
            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold text-lg">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || added}
              className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                !product.inStock
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : added
                  ? "bg-green-500 text-white"
                  : "bg-[#1a3a5c] text-white hover:bg-[#15304d] active:scale-[0.98]"
              }`}
            >
              <ShoppingCart size={18} />
              {!product.inStock ? "Sin stock" : added ? "Anadido al carrito!" : "Anadir al carrito"}
            </button>
            <button
              onClick={() => setWishlisted(!wishlisted)}
              className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-red-300 transition"
            >
              <Heart size={18} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-500"} />
            </button>
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {(
              [
                [Truck, "Envio gratis", "+49EUR en pedidos"],
                [Shield, "Pago seguro", "Visa, PayPal, Bizum"],
              ] as const
            ).map(([Icon, title, sub], i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                <Icon size={18} className="text-[#1a3a5c] flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-800">{title}</div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {(
            [
              ["desc", "Descripcion"],
              ["specs", "Caracteristicas"],
              ["envio", "Envio y Devoluciones"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-6 py-4 text-sm font-semibold transition border-b-2 -mb-px ${
                tab === id
                  ? "border-[#1a3a5c] text-[#1a3a5c] bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "desc" && (
            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
              {product.description || product.shortDescription}
            </div>
          )}
          {tab === "specs" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["Juego", name],
                ["Categoria", catLabel],
                ["Idioma", `${LANGUAGE_FLAGS[product.language] ?? ""} ${product.language}`],
                ["Estado", product.inStock ? "En stock" : "Sin stock"],
                ["Referencia", `TCG-${product.id}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "envio" && (
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <Truck size={18} className="text-[#1a3a5c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Envio gratuito en pedidos de +49€</p>
                  <p>Para pedidos inferiores a 49€, el envio tiene un coste de 3,99€. Envio en 24-48h laborables.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-[#1a3a5c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Devoluciones gratuitas en 30 dias</p>
                  <p>Si no estas satisfecho con tu compra, puedes devolverla sin coste alguno en los 30 dias siguientes a la recepcion.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star size={18} className="text-[#1a3a5c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Productos 100% oficiales</p>
                  <p>Todos nuestros productos son originales y proceden de distribuidores oficiales. Garantia de autenticidad.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
