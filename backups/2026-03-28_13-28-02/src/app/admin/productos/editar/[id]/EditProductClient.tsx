"use client"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, X, ShoppingCart } from "lucide-react"
import { GAME_CONFIG, LANGUAGE_FLAGS, LANGUAGE_NAMES, CATEGORY_LABELS, type LocalProduct } from "@/data/products"
import { LanguageFlag } from "@/components/ui/LanguageFlag"

const GAME_CATEGORIES: Record<string, string[]> = {
  magic:         ["booster-box", "sobres", "commander", "secret-lair", "singles", "sleeves", "playmats", "deckboxes", "dados", "foil", "full-art-lands"],
  pokemon:       ["booster-box", "etb", "sobres", "blisters", "singles", "tins", "gradeadas", "promo", "lotes", "prize-cards"],
  "one-piece":   ["booster-box", "sobres", "singles", "starter", "premium", "especiales", "promo"],
  riftbound:     ["booster-box", "sobres", "singles", "starter", "promo"],
  topps:         ["futbol", "nba", "f1", "wwe", "star-wars", "albumes", "latas", "cajas"],
  lorcana:       ["booster-box", "sobres", "singles", "enchanted", "trove", "gift-sets", "starter", "promo"],
  "dragon-ball": ["booster-box", "sobres", "singles", "starter", "scr", "especiales", "premium"],
  yugioh:        ["booster-box", "sobres", "singles", "structure-decks", "tins", "starlight", "prize-cards", "field-centers", "alternate-art"],
  naruto:        ["booster-box", "sobres", "singles", "starter", "especiales", "promo"],
}

const LANGUAGES = Object.keys(LANGUAGE_FLAGS)

const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres"),
  slug: z.string().min(3, "El slug es obligatorio"),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  game: z.string().min(1, "Selecciona un juego"),
  category: z.string().min(1, "Selecciona una categoría"),
  language: z.string().optional(),
  price: z.number().min(0.01, "Debe ser mayor que 0"),
  wholesalePrice: z.number().min(0.01, "Debe ser mayor que 0"),
  storePrice: z.number().min(0.01, "Debe ser mayor que 0"),
  comparePrice: z.number().optional(),
  inStock: z.boolean(),
  isNew: z.boolean(),
}).refine((d) => d.wholesalePrice < d.price, {
  message: "Mayorista debe ser menor que PVP General",
  path: ["wholesalePrice"],
}).refine((d) => d.storePrice < d.wholesalePrice, {
  message: "Tienda debe ser menor que Mayorista",
  path: ["storePrice"],
})

type FormValues = z.infer<typeof schema>

function slugify(str: string) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-")
}

export default function EditProductClient({ product }: { product: LocalProduct }) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>(product.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [toast, setToast] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      game: product.game,
      category: product.category,
      language: product.language ?? "",
      price: product.price,
      wholesalePrice: product.wholesalePrice,
      storePrice: product.storePrice,
      comparePrice: product.comparePrice ?? 0,
      inStock: product.inStock,
      isNew: product.isNew,
    },
  })

  const watchedName = watch("name")
  const watchedGame = watch("game")
  const watchedLanguage = watch("language")
  const watchedPrice = watch("price")
  const watchedIsNew = watch("isNew")
  const watchedCategory = watch("category")

  // Auto-update slug when name changes (only if user hasn't manually edited)
  useEffect(() => {
    if (watchedName && watchedName !== product.name) setValue("slug", slugify(watchedName))
  }, [watchedName, product.name, setValue])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const addTag = () => {
    const raw = tagInput.trim().toLowerCase()
    if (!raw) return
    const newTags = raw.split(",").map((t) => t.trim()).filter((t) => t && !tags.includes(t))
    setTags((prev) => [...prev, ...newTags])
    setTagInput("")
  }

  const saveProduct = (data: FormValues) => {
    const overrides = JSON.parse(localStorage.getItem("tcgacademy_product_overrides") ?? "{}")
    overrides[product.id] = { ...data, tags }
    localStorage.setItem("tcgacademy_product_overrides", JSON.stringify(overrides))
    showToast(`Producto actualizado`)
    setTimeout(() => router.push("/admin/productos"), 1200)
  }

  const categories = GAME_CATEGORIES[watchedGame] ?? []
  const gameConfig = GAME_CONFIG[watchedGame]

  const inputCls = "w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5"
  const errorCls = "text-xs text-red-500 mt-1"

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/productos" className="p-2 hover:bg-gray-100 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar producto</h1>
          <p className="text-gray-500 text-sm mt-0.5 truncate max-w-md">{product.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(saveProduct)} noValidate>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Información básica</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre del producto *</label>
                  <input {...register("name")} className={inputCls} />
                  {errors.name && <p className={errorCls}>{errors.name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Slug (URL)</label>
                  <input {...register("slug")} className={`${inputCls} font-mono text-xs`} />
                  {errors.slug && <p className={errorCls}>{errors.slug.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Descripción corta</label>
                  <textarea {...register("shortDescription")} rows={2}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-none" />
                </div>
                <div>
                  <label className={labelCls}>Descripción completa</label>
                  <textarea {...register("description")} rows={5}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-y" />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Clasificación</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Juego *</label>
                  <select {...register("game")} className={`${inputCls} appearance-none`}>
                    {Object.entries(GAME_CONFIG).map(([slug, { name }]) => (
                      <option key={slug} value={slug}>{name}</option>
                    ))}
                  </select>
                  {errors.game && <p className={errorCls}>{errors.game.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Categoría *</label>
                  <select {...register("category")} className={`${inputCls} appearance-none`}>
                    <option value="">Seleccionar...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                    ))}
                  </select>
                  {errors.category && <p className={errorCls}>{errors.category.message}</p>}
                </div>
              </div>
              <div className="mt-4">
                <label className={labelCls}>Tags</label>
                <div className="flex gap-2 mb-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Añadir tags separados por coma" className={`${inputCls} flex-1`} />
                  <button type="button" onClick={addTag} className="h-10 px-4 bg-gray-100 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                    <Plus size={14} />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        {tag}
                        <button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Idioma</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setValue("language", "")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition min-h-[44px] ${
                    !watchedLanguage ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  Sin idioma
                </button>
                {LANGUAGES.map((lang) => (
                  <button key={lang} type="button" onClick={() => setValue("language", lang)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition min-h-[44px] ${
                      watchedLanguage === lang ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_NAMES[lang]}
                  </button>
                ))}
              </div>
              {watchedLanguage && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <span>Preview:</span>
                  <LanguageFlag language={watchedLanguage} showLabel />
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Precios</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>PVP General (€) *</label>
                  <input type="number" step="0.01" min="0" {...register("price", { valueAsNumber: true })} className={inputCls} />
                  {errors.price && <p className={errorCls}>{errors.price.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>PVP Mayorista (€) *</label>
                  <input type="number" step="0.01" min="0" {...register("wholesalePrice", { valueAsNumber: true })} className={inputCls} />
                  {errors.wholesalePrice && <p className={errorCls}>{errors.wholesalePrice.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>PVP Tienda TCG (€) *</label>
                  <input type="number" step="0.01" min="0" {...register("storePrice", { valueAsNumber: true })} className={inputCls} />
                  {errors.storePrice && <p className={errorCls}>{errors.storePrice.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Precio anterior (€, tachado)</label>
                  <input type="number" step="0.01" min="0" {...register("comparePrice", { valueAsNumber: true })} className={inputCls} />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Stock y estado</h2>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <input type="checkbox" {...register("inStock")} className="w-5 h-5 rounded accent-[#1a3a5c]" />
                  <span className="text-sm font-medium text-gray-800">En stock</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <input type="checkbox" {...register("isNew")} className="w-5 h-5 rounded accent-[#1a3a5c]" />
                  <span className="text-sm font-medium text-gray-800">Marcar como novedad</span>
                </label>
              </div>
            </section>

            <div className="flex flex-wrap gap-3 pb-6">
              <Link href="/admin/productos"
                className="flex-1 sm:flex-none border-2 border-gray-200 text-gray-700 font-bold px-5 py-3 rounded-xl text-sm hover:bg-gray-50 transition text-center min-h-[44px] flex items-center justify-center">
                Cancelar
              </Link>
              <button type="submit"
                className="flex-1 sm:flex-none bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#15304d] transition min-h-[44px]">
                Actualizar producto
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-36">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Vista previa</p>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="relative aspect-[3/4] overflow-hidden"
                  style={{ background: gameConfig ? `linear-gradient(135deg, ${gameConfig.color}18, ${gameConfig.color}30)` : "#f9fafb" }}>
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                    <span className="text-6xl">{gameConfig?.emoji ?? "🃏"}</span>
                    <span className="text-xs font-bold text-center leading-tight line-clamp-3 px-2 text-gray-700">
                      {watch("name")}
                    </span>
                  </div>
                  {watchedLanguage && (
                    <div className="absolute top-2 left-2"><LanguageFlag language={watchedLanguage} /></div>
                  )}
                  {watchedIsNew && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NUEVO</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  {watchedCategory && (
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {CATEGORY_LABELS[watchedCategory] ?? watchedCategory}
                    </p>
                  )}
                  <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 mb-2">{watch("name")}</h3>
                  <p className="text-lg font-bold" style={{ color: gameConfig?.color ?? "#1a3a5c" }}>
                    {watchedPrice ? `${Number(watchedPrice).toFixed(2)}€` : "0.00€"}
                  </p>
                </div>
                <div className="px-3 pb-3">
                  <button type="button" className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-[#1a3a5c] text-white">
                    <ShoppingCart size={15} /> Añadir al carrito
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
