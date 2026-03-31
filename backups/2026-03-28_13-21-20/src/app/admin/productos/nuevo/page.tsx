"use client"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, X, ShoppingCart } from "lucide-react"
import { GAME_CONFIG, LANGUAGE_FLAGS, LANGUAGE_NAMES, CATEGORY_LABELS } from "@/data/products"
import { LanguageFlag } from "@/components/ui/LanguageFlag"

// ─── Categories per game ──────────────────────────────────────────────────────

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

// ─── Zod Schema ───────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-")
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NuevoProductoPage() {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [images, setImages] = useState<string[]>([])
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
      inStock: true,
      isNew: false,
      language: "",
    },
  })

  const watchedName = watch("name")
  const watchedGame = watch("game")
  const watchedLanguage = watch("language")
  const watchedPrice = watch("price")
  const watchedIsNew = watch("isNew")
  const watchedCategory = watch("category")

  // Auto-generate slug from name
  useEffect(() => {
    if (watchedName) setValue("slug", slugify(watchedName))
  }, [watchedName, setValue])

  // Reset category when game changes
  useEffect(() => {
    setValue("category", "")
  }, [watchedGame, setValue])

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

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const names = files.slice(0, 5 - images.length).map((f) => f.name)
    setImages((prev) => [...prev, ...names].slice(0, 5))
    e.target.value = ""
  }

  const saveProduct = (data: FormValues, andAnother: boolean) => {
    const id = Date.now()
    const product = { ...data, id, tags, images, slug: data.slug }
    const stored = JSON.parse(localStorage.getItem("tcgacademy_new_products") ?? "[]")
    localStorage.setItem("tcgacademy_new_products", JSON.stringify([...stored, product]))
    showToast(`Producto "${data.name}" guardado`)
    if (andAnother) {
      router.refresh()
      window.location.reload()
    } else {
      router.push("/admin/productos")
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Añadir nuevo producto</h1>
          <p className="text-gray-500 text-sm mt-0.5">Completa todos los campos obligatorios (*)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => saveProduct(d, false))} noValidate>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-5">

            {/* Información básica */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Información básica</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre del producto *</label>
                  <input {...register("name")} className={inputCls} placeholder="Ej: Bloomburrow Draft Booster Display" />
                  {errors.name && <p className={errorCls}>{errors.name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Slug (URL)</label>
                  <input {...register("slug")} className={`${inputCls} font-mono text-xs`} placeholder="auto-generado" />
                  {errors.slug && <p className={errorCls}>{errors.slug.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Descripción corta</label>
                  <textarea {...register("shortDescription")} rows={2}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-none"
                    placeholder="2-3 líneas resumen del producto" />
                </div>
                <div>
                  <label className={labelCls}>Descripción completa</label>
                  <textarea {...register("description")} rows={5}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-y"
                    placeholder="Descripción detallada del producto" />
                </div>
              </div>
            </section>

            {/* Clasificación */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Clasificación</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Juego *</label>
                  <select {...register("game")} className={`${inputCls} appearance-none`}>
                    <option value="">Seleccionar juego...</option>
                    {Object.entries(GAME_CONFIG).map(([slug, { name }]) => (
                      <option key={slug} value={slug}>{name}</option>
                    ))}
                  </select>
                  {errors.game && <p className={errorCls}>{errors.game.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Categoría *</label>
                  <select {...register("category")} className={`${inputCls} appearance-none`} disabled={!watchedGame}>
                    <option value="">Seleccionar categoría...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                    ))}
                  </select>
                  {errors.category && <p className={errorCls}>{errors.category.message}</p>}
                </div>
              </div>
              {/* Tags */}
              <div className="mt-4">
                <label className={labelCls}>Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Escribe tags separados por coma y Enter"
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={addTag}
                    className="h-10 px-4 bg-gray-100 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                    <Plus size={14} />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-500">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Idioma */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Idioma</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setValue("language", "")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition min-h-[44px] ${
                    !watchedLanguage ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Sin idioma
                </button>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setValue("language", lang)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition min-h-[44px] ${
                      watchedLanguage === lang ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_NAMES[lang]}
                  </button>
                ))}
              </div>
              {watchedLanguage && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <span>Preview de bandera:</span>
                  <LanguageFlag language={watchedLanguage} showLabel />
                  <span className="text-gray-400 text-xs">(esquina superior izquierda de la imagen)</span>
                </div>
              )}
            </section>

            {/* Precios */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Precios</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>PVP General (€) *</label>
                  <input type="number" step="0.01" min="0"
                    {...register("price", { valueAsNumber: true })}
                    className={inputCls} placeholder="0.00" />
                  {errors.price && <p className={errorCls}>{errors.price.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>PVP Mayorista (€) *</label>
                  <input type="number" step="0.01" min="0"
                    {...register("wholesalePrice", { valueAsNumber: true })}
                    className={inputCls} placeholder="0.00" />
                  {errors.wholesalePrice && <p className={errorCls}>{errors.wholesalePrice.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>PVP Tienda TCG (€) *</label>
                  <input type="number" step="0.01" min="0"
                    {...register("storePrice", { valueAsNumber: true })}
                    className={inputCls} placeholder="0.00" />
                  {errors.storePrice && <p className={errorCls}>{errors.storePrice.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Precio anterior (€, tachado)</label>
                  <input type="number" step="0.01" min="0"
                    {...register("comparePrice", { valueAsNumber: true })}
                    className={inputCls} placeholder="0.00 (opcional)" />
                </div>
              </div>
            </section>

            {/* Stock y estado */}
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

            {/* Imágenes */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-2">Imágenes</h2>
              <p className="text-xs text-gray-400 mb-4">Hasta 5 imágenes. La primera es la imagen principal.</p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#1a3a5c] transition bg-gray-50 hover:bg-blue-50/30">
                <Plus size={20} className="text-gray-400 mb-1" />
                <span className="text-sm text-gray-500 font-medium">Añadir imágenes</span>
                <span className="text-xs text-gray-400">{images.length}/5 seleccionadas</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageInput} disabled={images.length >= 5} />
              </label>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                      {i === 0 && <span className="text-[10px] font-bold text-[#1a3a5c] uppercase">Principal</span>}
                      <span className="text-xs text-gray-700 truncate max-w-[120px]">{img}</span>
                      <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-400 transition">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pb-6">
              <Link href="/admin/productos"
                className="flex-1 sm:flex-none border-2 border-gray-200 text-gray-700 font-bold px-5 py-3 rounded-xl text-sm hover:bg-gray-50 transition text-center min-h-[44px] flex items-center justify-center">
                Cancelar
              </Link>
              <button type="button" onClick={handleSubmit((d) => saveProduct(d, true))}
                className="flex-1 sm:flex-none border-2 border-[#1a3a5c] text-[#1a3a5c] font-bold px-5 py-3 rounded-xl text-sm hover:bg-blue-50 transition min-h-[44px]">
                Guardar y añadir otro
              </button>
              <button type="submit"
                className="flex-1 sm:flex-none bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#15304d] transition min-h-[44px]">
                Guardar producto
              </button>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-36">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Vista previa en tienda</p>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Image area */}
                <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden"
                  style={{ background: gameConfig ? `linear-gradient(135deg, ${gameConfig.color}18, ${gameConfig.color}30)` : "#f9fafb" }}>
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                    <span className="text-6xl">{gameConfig?.emoji ?? "🃏"}</span>
                    <span className="text-xs font-bold text-center leading-tight line-clamp-3 px-2 text-gray-700">
                      {watch("name") || "Nombre del producto"}
                    </span>
                  </div>
                  {/* Language flag preview */}
                  {watchedLanguage && (
                    <div className="absolute top-2 left-2">
                      <LanguageFlag language={watchedLanguage} />
                    </div>
                  )}
                  {/* Badge preview */}
                  {watchedIsNew && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NUEVO</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  {watchedCategory && (
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {CATEGORY_LABELS[watchedCategory] ?? watchedCategory}
                    </p>
                  )}
                  <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 mb-2">
                    {watch("name") || "Nombre del producto"}
                  </h3>
                  <p className="text-lg font-bold" style={{ color: gameConfig?.color ?? "#1a3a5c" }}>
                    {watchedPrice ? `${watchedPrice.toFixed(2)}€` : "0.00€"}
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
