"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Plus, X, ShoppingCart } from "lucide-react";
import {
  GAME_CONFIG,
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  CATEGORY_LABELS,
} from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";

// ─── Shared constants ─────────────────────────────────────────────────────────

export const GAME_CATEGORIES: Record<string, string[]> = {
  magic: [
    "booster-box",
    "sobres",
    "commander",
    "secret-lair",
    "singles",
    "sleeves",
    "playmats",
    "deckboxes",
    "dados",
    "foil",
    "full-art-lands",
  ],
  pokemon: [
    "booster-box",
    "etb",
    "sobres",
    "blisters",
    "singles",
    "tins",
    "gradeadas",
    "promo",
    "lotes",
    "prize-cards",
  ],
  "one-piece": [
    "booster-box",
    "sobres",
    "singles",
    "starter",
    "premium",
    "especiales",
    "promo",
  ],
  riftbound: ["booster-box", "sobres", "singles", "starter", "promo"],
  topps: [
    "futbol",
    "nba",
    "f1",
    "wwe",
    "star-wars",
    "albumes",
    "latas",
    "cajas",
  ],
  lorcana: [
    "booster-box",
    "sobres",
    "singles",
    "enchanted",
    "trove",
    "gift-sets",
    "starter",
    "promo",
  ],
  "dragon-ball": [
    "booster-box",
    "sobres",
    "singles",
    "starter",
    "scr",
    "especiales",
    "premium",
  ],
  yugioh: [
    "booster-box",
    "sobres",
    "singles",
    "structure-decks",
    "tins",
    "starlight",
    "prize-cards",
    "field-centers",
    "alternate-art",
  ],
  naruto: [
    "booster-box",
    "sobres",
    "singles",
    "starter",
    "especiales",
    "promo",
  ],
};

export const productSchema = z
  .object({
    name: z.string().min(3, "Mínimo 3 caracteres").max(200),
    slug: z.string().min(3, "El slug es obligatorio").max(100),
    shortDescription: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    game: z.string().min(1, "Selecciona un juego").max(50),
    category: z.string().min(1, "Selecciona una categoría").max(50),
    language: z.string().max(20).optional(),
    price: z.number().min(0.01, "Debe ser mayor que 0"),
    wholesalePrice: z.number().min(0.01, "Debe ser mayor que 0"),
    storePrice: z.number().min(0.01, "Debe ser mayor que 0"),
    costPrice: z.number().min(0.01).optional(),
    comparePrice: z.number().optional(),
    inStock: z.boolean(),
    isNew: z.boolean(),
  })
  .refine((d) => d.wholesalePrice < d.price, {
    message: "Mayorista debe ser menor que PVP Público",
    path: ["wholesalePrice"],
  })
  .refine((d) => d.storePrice < d.wholesalePrice, {
    message: "Tienda debe ser menor que Mayorista",
    path: ["storePrice"],
  })
  .refine((d) => !d.costPrice || d.costPrice < d.storePrice, {
    message: "Coste debe ser menor que PVP Tiendas TCG",
    path: ["costPrice"],
  });

export type ProductFormValues = z.infer<typeof productSchema>;

export function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ProductFormProps {
  title: string;
  subtitle?: string;
  defaultValues?: Partial<ProductFormValues>;
  initialTags?: string[];
  originalName?: string; // edit mode: skip slug auto-update when name unchanged
  resetCategoryOnGame?: boolean; // create mode: reset category when game changes
  showImageUpload?: boolean; // create mode only
  submitLabel: string;
  onSubmit: (data: ProductFormValues, tags: string[], images: string[]) => void;
  onSubmitAndNew?: (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const LANGUAGES = Object.keys(LANGUAGE_FLAGS);
const inputCls =
  "w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const errorCls = "text-xs text-red-500 mt-1";

export function ProductForm({
  title,
  subtitle,
  defaultValues,
  initialTags = [],
  originalName,
  resetCategoryOnGame,
  showImageUpload,
  submitLabel,
  onSubmit,
  onSubmitAndNew,
}: ProductFormProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      inStock: true,
      isNew: false,
      language: "",
      ...defaultValues,
    },
  });

  const watchedName = watch("name");
  const watchedGame = watch("game");
  const watchedLanguage = watch("language");
  const watchedPrice = watch("price");
  const watchedIsNew = watch("isNew");
  const watchedCategory = watch("category");

  useEffect(() => {
    if (!watchedName) return;
    if (originalName !== undefined && watchedName === originalName) return;
    setValue("slug", slugify(watchedName));
  }, [watchedName, originalName, setValue]);

  useEffect(() => {
    if (resetCategoryOnGame) setValue("category", "");
  }, [watchedGame, resetCategoryOnGame, setValue]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addTag = () => {
    const raw = tagInput.trim().toLowerCase();
    if (!raw) return;
    const newTags = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    setTags((prev) => [...prev, ...newTags]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag));

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const names = files.slice(0, 5 - images.length).map((f) => f.name);
    setImages((prev) => [...prev, ...names].slice(0, 5));
    e.target.value = "";
  };

  const handleSave = (data: ProductFormValues) => {
    onSubmit(data, tags, images);
    showToast(`Producto "${data.name}" guardado`);
  };

  const handleSaveAndNew = (data: ProductFormValues) => {
    onSubmitAndNew?.(data, tags, images);
    showToast(`Producto "${data.name}" guardado`);
  };

  const categories = GAME_CATEGORIES[watchedGame] ?? [];
  const gameConfig = GAME_CONFIG[watchedGame];

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#1a3a5c] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/productos"
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 max-w-md truncate text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(handleSave)} noValidate>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Información básica */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 font-bold text-gray-900">
                Información básica
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre del producto *</label>
                  <input
                    {...register("name")}
                    className={inputCls}
                    placeholder="Ej: Bloomburrow Draft Booster Display"
                  />
                  {errors.name && (
                    <p className={errorCls}>{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Slug (URL)</label>
                  <input
                    {...register("slug")}
                    className={`${inputCls} font-mono text-xs`}
                    placeholder="auto-generado"
                  />
                  {errors.slug && (
                    <p className={errorCls}>{errors.slug.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Descripción corta</label>
                  <textarea
                    {...register("shortDescription")}
                    rows={2}
                    className="w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                    placeholder="2-3 líneas resumen del producto"
                  />
                </div>
                <div>
                  <label className={labelCls}>Descripción completa</label>
                  <textarea
                    {...register("description")}
                    rows={5}
                    className="w-full resize-y rounded-xl border-2 border-gray-200 px-3 py-2 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                    placeholder="Descripción detallada del producto"
                  />
                </div>
              </div>
            </section>

            {/* Clasificación */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 font-bold text-gray-900">Clasificación</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Juego *</label>
                  <select
                    {...register("game")}
                    className={`${inputCls} appearance-none`}
                  >
                    <option value="">Seleccionar juego...</option>
                    {Object.entries(GAME_CONFIG).map(([slug, { name }]) => (
                      <option key={slug} value={slug}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {errors.game && (
                    <p className={errorCls}>{errors.game.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Categoría *</label>
                  <select
                    {...register("category")}
                    className={`${inputCls} appearance-none`}
                    disabled={!watchedGame}
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c] ?? c}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className={errorCls}>{errors.category.message}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className={labelCls}>Tags</label>
                <div className="mb-2 flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                    placeholder="Escribe tags separados por coma y Enter"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="h-10 rounded-xl bg-gray-100 px-4 text-sm font-semibold transition hover:bg-gray-200"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Idioma */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 font-bold text-gray-900">Idioma</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setValue("language", "")}
                  className={`flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                    !watchedLanguage
                      ? "border-[#1a3a5c] bg-[#1a3a5c] text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Sin idioma
                </button>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setValue("language", lang)}
                    className={`flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                      watchedLanguage === lang
                        ? "border-[#1a3a5c] bg-[#1a3a5c] text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
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

            {/* Precios */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 font-bold text-gray-900">Precios</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>PVP Público (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("price", { valueAsNumber: true })}
                    className={inputCls}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className={errorCls}>{errors.price.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>PVP Mayoristas (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("wholesalePrice", { valueAsNumber: true })}
                    className={inputCls}
                    placeholder="0.00"
                  />
                  {errors.wholesalePrice && (
                    <p className={errorCls}>{errors.wholesalePrice.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>PVP Tiendas TCG (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("storePrice", { valueAsNumber: true })}
                    className={inputCls}
                    placeholder="0.00"
                  />
                  {errors.storePrice && (
                    <p className={errorCls}>{errors.storePrice.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>
                    Precio de coste (€) — solo admin
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("costPrice", { valueAsNumber: true })}
                    className={inputCls}
                    placeholder="0.00 (opcional)"
                  />
                  {errors.costPrice && (
                    <p className={errorCls}>{errors.costPrice.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>
                    Precio anterior (€, tachado)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("comparePrice", { valueAsNumber: true })}
                    className={inputCls}
                    placeholder="0.00 (opcional)"
                  />
                </div>
              </div>
            </section>

            {/* Stock y estado */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 font-bold text-gray-900">Stock y estado</h2>
              <div className="flex flex-wrap gap-6">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    {...register("inStock")}
                    className="h-5 w-5 rounded accent-[#1a3a5c]"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    En stock
                  </span>
                </label>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    {...register("isNew")}
                    className="h-5 w-5 rounded accent-[#1a3a5c]"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Marcar como novedad
                  </span>
                </label>
              </div>
            </section>

            {/* Imágenes (create mode only) */}
            {showImageUpload && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-2 font-bold text-gray-900">Imágenes</h2>
                <p className="mb-4 text-xs text-gray-400">
                  Hasta 5 imágenes. La primera es la imagen principal.
                </p>
                <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-[#1a3a5c] hover:bg-blue-50/30">
                  <Plus size={20} className="mb-1 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">
                    Añadir imágenes
                  </span>
                  <span className="text-xs text-gray-400">
                    {images.length}/5 seleccionadas
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageInput}
                    disabled={images.length >= 5}
                  />
                </label>
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2"
                      >
                        {i === 0 && (
                          <span className="text-[10px] font-bold text-[#1a3a5c] uppercase">
                            Principal
                          </span>
                        )}
                        <span className="max-w-[120px] truncate text-xs text-gray-700">
                          {img}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setImages((p) => p.filter((_, j) => j !== i))
                          }
                          className="text-gray-400 transition hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pb-6">
              <Link
                href="/admin/productos"
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-2 border-gray-200 px-5 py-3 text-center text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:flex-none"
              >
                Cancelar
              </Link>
              {onSubmitAndNew && (
                <button
                  type="button"
                  onClick={handleSubmit(handleSaveAndNew)}
                  className="min-h-[44px] flex-1 rounded-xl border-2 border-[#1a3a5c] px-5 py-3 text-sm font-bold text-[#1a3a5c] transition hover:bg-blue-50 sm:flex-none"
                >
                  Guardar y añadir otro
                </button>
              )}
              <button
                type="submit"
                className="min-h-[44px] flex-1 rounded-xl bg-[#1a3a5c] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#15304d] sm:flex-none"
              >
                {submitLabel}
              </button>
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-36">
              <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Vista previa en tienda
              </p>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div
                  className="relative aspect-[3/4] overflow-hidden bg-gray-50"
                  style={{
                    background: gameConfig
                      ? `linear-gradient(135deg, ${gameConfig.color}18, ${gameConfig.color}30)`
                      : "#f9fafb",
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
                    <span className="text-6xl">
                      {gameConfig?.emoji ?? "🃏"}
                    </span>
                    <span className="line-clamp-3 px-2 text-center text-xs leading-tight font-bold text-gray-700">
                      {watchedName || "Nombre del producto"}
                    </span>
                  </div>
                  {watchedLanguage && (
                    <div className="absolute top-2 left-2">
                      <LanguageFlag language={watchedLanguage} />
                    </div>
                  )}
                  {watchedIsNew && (
                    <div className="absolute top-2 right-2">
                      <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        NUEVO
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  {watchedCategory && (
                    <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                      {CATEGORY_LABELS[watchedCategory] ?? watchedCategory}
                    </p>
                  )}
                  <h3 className="mb-2 line-clamp-2 text-sm leading-tight font-semibold text-gray-800">
                    {watchedName || "Nombre del producto"}
                  </h3>
                  <p
                    className="text-lg font-bold"
                    style={{ color: gameConfig?.color ?? "#1a3a5c" }}
                  >
                    {watchedPrice
                      ? `${Number(watchedPrice).toFixed(2)}€`
                      : "0.00€"}
                  </p>
                </div>
                <div className="px-3 pb-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3a5c] py-2.5 text-sm font-semibold text-white"
                  >
                    <ShoppingCart size={15} /> Añadir al carrito
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
