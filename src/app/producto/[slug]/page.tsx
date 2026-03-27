"use client"
import { useCart } from "@/context/CartContext"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart, Star, Truck, Shield, ChevronLeft, Plus, Minus } from "lucide-react"
import { useState, useEffect } from "react"
import { wc } from "@/lib/woocommerce/client"
import type { Product } from "@/types"

export default function ProductPage({ params }: { params: { slug: string } }) {
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [tab, setTab] = useState("desc")

  useEffect(() => {
    wc.getProductBySlug(params.slug)
      .then(p => { setProduct(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.slug])

  if (loading) return (
    <div className="max-w-[1180px] mx-auto px-6 py-12 animate-pulse">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-200 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-10 bg-gray-200 rounded w-1/4" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )

  if (!product) return (
    <div className="max-w-[1180px] mx-auto px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-700 mb-4">Producto no encontrado</h1>
      <Link href="/catalogo" className="text-[#1a3a5c] hover:underline">Volver al catalogo</Link>
    </div>
  )

  const price = parseFloat(product.price || "0")
  const regularPrice = parseFloat(product.regular_price || "0")
  const onSale = product.on_sale && regularPrice > price
  const inStock = product.stock_status === "instock"
  const images = product.images?.length ? product.images : [{ src: "/placeholder-card.jpg", alt: product.name }]

  const handleAdd = () => {
    addItem(product.id, product.name, price, images[0].src, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-[#1a3a5c]">Inicio</Link>
        <span>/</span>
        <Link href="/catalogo" className="hover:text-[#1a3a5c]">Catalogo</Link>
        {product.categories?.[0] && <>
          <span>/</span>
          <Link href={`/${product.categories[0].slug}`} className="hover:text-[#1a3a5c]">{product.categories[0].name}</Link>
        </>}
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 mb-16">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-3">
            <Image src={images[activeImg]?.src || "/placeholder-card.jpg"} alt={images[activeImg]?.alt || product.name}
              fill className="object-contain p-4" sizes="(max-width: 768px) 100vw, 50vw" priority />
            {onSale && <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">OFERTA</div>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition ${i === activeImg ? "border-[#1a3a5c]" : "border-gray-200 hover:border-gray-300"}`}>
                  <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy Box */}
        <div className="flex flex-col gap-5">
          {product.categories?.[0] && (
            <Link href={`/${product.categories[0].slug}`}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#1a3a5c] hover:underline">
              <ChevronLeft size={14} /> {product.categories[0].name}
            </Link>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

          {parseFloat(product.average_rating) > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">{Array.from({length:5}).map((_,i)=><Star key={i} size={16} className={i<Math.round(parseFloat(product.average_rating))?"fill-yellow-400 text-yellow-400":"text-gray-200"} />)}</div>
              <span className="text-sm text-gray-500">({product.rating_count} valoraciones)</span>
            </div>
          )}

          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-[#1a3a5c]">{price.toFixed(2)}€</span>
            {onSale && <span className="text-xl text-gray-400 line-through mb-1">{regularPrice.toFixed(2)}€</span>}
            {onSale && <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-lg">-{Math.round((1-price/regularPrice)*100)}%</span>}
          </div>

          <div className={`inline-flex items-center gap-2 text-sm font-semibold ${inStock ? "text-green-600" : "text-red-500"}`}>
            <div className={`w-2 h-2 rounded-full ${inStock ? "bg-green-500" : "bg-red-400"}`} />
            {inStock ? `En stock${product.stock_quantity ? ` — ${product.stock_quantity} unidades` : ""}` : "Sin stock"}
          </div>

          {product.short_description && (
            <div className="text-sm text-gray-600 leading-relaxed border-l-4 border-blue-100 pl-4"
              dangerouslySetInnerHTML={{ __html: product.short_description }} />
          )}

          {/* Quantity + Add to cart */}
          <div className="flex gap-3 items-center">
            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty-1))} className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition">
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold text-lg">{qty}</span>
              <button onClick={() => setQty(qty+1)} className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 transition">
                <Plus size={16} />
              </button>
            </div>
            <button onClick={handleAdd} disabled={!inStock || added}
              className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                !inStock ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : added ? "bg-green-500 text-white"
                : "bg-[#1a3a5c] text-white hover:bg-[#15304d] active:scale-[0.98]"
              }`}>
              <ShoppingCart size={18} />
              {!inStock ? "Sin stock" : added ? "Anadido al carrito!" : "Anadir al carrito"}
            </button>
            <button className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-red-300 hover:text-red-500 transition">
              <Heart size={18} />
            </button>
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[[Truck,"Envio gratis","+49EUR"],[Shield,"Pago seguro","Visa, PayPal, Bizum"]].map(([Icon,title,sub],i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                <Icon size={18} className="text-[#1a3a5c] flex-shrink-0" />
                <div><div className="text-xs font-semibold text-gray-800">{title as string}</div><div className="text-xs text-gray-500">{sub as string}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[["desc","Descripcion"],["specs","Caracteristicas"],["reviews","Valoraciones"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-6 py-4 text-sm font-semibold transition border-b-2 -mb-px ${tab===id ? "border-[#1a3a5c] text-[#1a3a5c] bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "desc" && (
            product.description
              ? <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: product.description }} />
              : <p className="text-gray-400">No hay descripcion disponible.</p>
          )}
          {tab === "specs" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {product.categories?.[0] && <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">Categoria</span><span className="text-sm font-medium">{product.categories[0].name}</span></div>}
              {product.stock_quantity !== null && <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">Stock</span><span className="text-sm font-medium">{product.stock_quantity} uds.</span></div>}
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">SKU</span><span className="text-sm font-medium">{product.id}</span></div>
            </div>
          )}
          {tab === "reviews" && (
            <div className="text-center py-8 text-gray-400">
              <Star size={32} className="mx-auto mb-3 text-gray-200" />
              <p>Aun no hay valoraciones. Se el primero en valorar este producto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
