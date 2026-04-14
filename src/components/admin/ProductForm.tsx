"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import {
  GAME_CONFIG,
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  CATEGORY_LABELS,
} from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { CardSearchPanel } from "@/components/admin/CardSearchPanel";
import { ImageSelector } from "@/components/admin/ImageSelector";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import type { ExternalCardData } from "@/types/card";

const CARD_SEARCH_GAMES = new Set(["pokemon"]);

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
  .refine((d) => d.wholesalePrice <= d.price, {
    message: "Mayorista no puede superar el PV Público",
    path: ["wholesalePrice"],
  })
  .refine((d) => d.storePrice <= d.price, {
    message: "Tienda no puede superar el PV Público",
    path: ["storePrice"],
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
  initialImages?: string[];
  originalName?: string; // edit mode: skip slug auto-update when name unchanged
  resetCategoryOnGame?: boolean; // create mode: reset category when game changes
  submitLabel: string;
  onSubmit: (data: ProductFormValues, tags: string[], images: string[]) => void;
  onSubmitAndNew?: (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => void;
  onDelete?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const LANGUAGES = Object.keys(LANGUAGE_FLAGS);
const inputCls =
  "w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] transition";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const errorCls = "text-xs text-red-500 mt-1";

export function ProductForm({
  title,
  subtitle,
  defaultValues,
  initialTags = [],
  initialImages,
  originalName,
  resetCategoryOnGame,
  submitLabel,
  onSubmit,
  onSubmitAndNew,
  onDelete,
}: ProductFormProps) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<string[]>(initialImages ?? []);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    type: "success" | "error";
    name?: string;
    image?: string;
    href?: string;
    errors?: string[];
    isSaveAndNew?: boolean;
  }>({ open: false, type: "success" });

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

  const handleSave = (data: ProductFormValues) => {
    onSubmit(data, tags, images);
    const productHref = `/${data.game}/${data.category}/${data.slug}`;
    setModal({
      open: true,
      type: "success",
      name: data.name,
      image: images[0],
      href: productHref,
      isSaveAndNew: false,
    });
  };

  const handleSaveAndNew = (data: ProductFormValues) => {
    onSubmitAndNew?.(data, tags, images);
    const productHref = `/${data.game}/${data.category}/${data.slug}`;
    setModal({
      open: true,
      type: "success",
      name: data.name,
      image: images[0],
      href: productHref,
      isSaveAndNew: true,
    });
  };

  const handleInvalid = () => {
    const errorMessages = Object.values(errors)
      .map((e) => e?.message)
      .filter(Boolean) as string[];
    if (errorMessages.length > 0) {
      setModal({
        open: true,
        type: "error",
        errors: errorMessages,
      });
    }
  };

  const categories = GAME_CATEGORIES[watchedGame] ?? [];
  const _gameConfig = GAME_CONFIG[watchedGame];

  const handleCardSelect = (card: ExternalCardData) => {
    setValue("name", card.name);
    const shortDesc = [
      card.setName,
      card.rarity,
      card.hp ? `HP ${card.hp}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (shortDesc) setValue("description", shortDesc);
    if (card.imageUrl) {
      setImages(
        [
          card.imageUrl,
          ...(card.imageUrlHiRes ? [card.imageUrlHiRes] : []),
        ].slice(0, 2),
      );
    }
    const autoTags = [
      card.setName,
      card.rarity,
      ...(card.types ?? []),
      card.artist ? `art:${card.artist}` : "",
    ]
      .filter(Boolean)
      .map((t) => (t as string).toLowerCase().replace(/\s+/g, "-"));
    setTags((prev) => [...new Set([...prev, ...autoTags])]);
    showToast(`Datos de "${card.name}" cargados`);
  };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  return (
    <div>
      {/* Toast for card-search feedback only */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      {/* Confirmation / Error modal */}
      <ConfirmationModal
        isOpen={modal.open}
        type={modal.type}
        title={
          modal.type === "success"
            ? "Producto guardado correctamente"
            : "Error al guardar el producto"
        }
        message={
          modal.type === "success"
            ? "El producto ha sido añadido al catálogo."
            : "Corrige los siguientes errores antes de guardar:"
        }
        productName={modal.name}
        productImage={modal.image}
        errors={modal.errors}
        onClose={closeModal}
        actions={
          modal.type === "success"
            ? [
                {
                  label: "Ver producto",
                  href: modal.href,
                  variant: "primary" as const,
                },
                onSubmitAndNew
                  ? {
                      label: "Añadir otro",
                      onClick: modal.isSaveAndNew
                        ? undefined
                        : () => {
                            closeModal();
                            // Trigger "Guardar y añadir otro" flow navigates via nuevo/page.tsx reload
                            router.push("/admin/productos/nuevo");
                          },
                      variant: "secondary" as const,
                    }
                  : {
                      label: "Volver al catálogo",
                      href: "/admin/preciosystock",
                      variant: "ghost" as const,
                    },
              ].filter(Boolean)
            : [
                {
                  label: "Corregir",
                  onClick: closeModal,
                  variant: "primary" as const,
                },
              ]
        }
      />

      {/* Confirm delete modal */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        type="error"
        title="Eliminar producto"
        message={`¿Seguro que quieres eliminar "${subtitle ?? "este producto"}"? Esta acción no se puede deshacer.`}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={[
          {
            label: "Cancelar",
            onClick: () => setDeleteConfirmOpen(false),
            variant: "secondary" as const,
          },
          {
            label: "Eliminar",
            onClick: () => {
              setDeleteConfirmOpen(false);
              onDelete?.();
            },
            variant: "danger" as const,
          },
        ]}
      />

      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/preciosystock"
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 max-w-md truncate text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 hover:border-red-300"
          >
            <Trash2 size={15} />
            Eliminar producto
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(handleSave, handleInvalid)} noValidate>
        {/* Card API search — shown only for Pokemon (or other future supported games) */}
        {CARD_SEARCH_GAMES.has(watchedGame) && (
          <div className="mb-5">
            <CardSearchPanel game={watchedGame} onSelect={handleCardSelect} />
          </div>
        )}

        <div className="space-y-5">
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
                  <label className={labelCls}>Descripción</label>
                  <textarea
                    {...register("description")}
                    rows={5}
                    className="w-full resize-y rounded-xl border-2 border-gray-200 px-3 py-2 text-sm transition focus:border-[#2563eb] focus:outline-none"
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
                      ? "border-[#2563eb] bg-[#2563eb] text-white"
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
                        ? "border-[#2563eb] bg-[#2563eb] text-white"
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
                  <label className={labelCls}>PV Público (€) *</label>
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
                  <label className={labelCls}>PV Mayorista (€) *</label>
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
                  <label className={labelCls}>PV Tiendas (€) *</label>
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
                    Precio de adquisición (€) — solo admin
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("costPrice", {
                      setValueAs: (v) =>
                        v === "" || v === null || isNaN(Number(v))
                          ? undefined
                          : Number(v),
                    })}
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
                    {...register("comparePrice", {
                      setValueAs: (v) =>
                        v === "" || v === null || isNaN(Number(v))
                          ? undefined
                          : Number(v),
                    })}
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
                    className="h-5 w-5 rounded accent-[#2563eb]"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    En stock
                  </span>
                </label>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    {...register("isNew")}
                    className="h-5 w-5 rounded accent-[#2563eb]"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Marcar como novedad
                  </span>
                </label>
              </div>
            </section>

            {/* Imágenes */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-2 font-bold text-gray-900">Imágenes</h2>
              <p className="mb-4 text-xs text-gray-400">
                Hasta 5 imágenes. La primera es la imagen principal.
              </p>
              <ImageSelector
                game={watchedGame ?? ""}
                category={watchedCategory ?? ""}
                productName={watchedName ?? ""}
                images={images}
                onImagesChange={setImages}
              />
            </section>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pb-6">
              <Link
                href="/admin/preciosystock"
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-2 border-gray-200 px-5 py-3 text-center text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:flex-none"
              >
                Cancelar
              </Link>
              {onSubmitAndNew && (
                <button
                  type="button"
                  onClick={handleSubmit(handleSaveAndNew, handleInvalid)}
                  className="min-h-[44px] flex-1 rounded-xl border-2 border-[#2563eb] px-5 py-3 text-sm font-bold text-[#2563eb] transition hover:bg-blue-50 sm:flex-none"
                >
                  Guardar y añadir otro
                </button>
              )}
              <button
                type="submit"
                className="min-h-[44px] flex-1 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] sm:flex-none"
              >
                {submitLabel}
              </button>
            </div>
          </div>
      </form>
    </div>
  );
}
