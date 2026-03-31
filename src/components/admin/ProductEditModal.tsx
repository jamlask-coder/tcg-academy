"use client";
import { useState } from "react";
import { X, Save, AlertTriangle } from "lucide-react";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  type LocalProduct,
} from "@/data/products";

interface ProductEditModalProps {
  /** null = create mode */
  product: LocalProduct | null;
  defaultGame?: string;
  nextId: number;
  onSave: (product: LocalProduct) => void;
  onCancel: () => void;
}

const LANGUAGES = [
  { code: "ES", label: "🇪🇸 ES" },
  { code: "EN", label: "🇬🇧 EN" },
  { code: "JP", label: "🇯🇵 JP" },
  { code: "FR", label: "🇫🇷 FR" },
  { code: "DE", label: "🇩🇪 DE" },
  { code: "IT", label: "🇮🇹 IT" },
  { code: "KO", label: "🇰🇷 KO" },
  { code: "PT", label: "🇵🇹 PT" },
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm transition focus:border-[#2563eb] focus:outline-none";

export function ProductEditModal({
  product,
  defaultGame,
  nextId,
  onSave,
  onCancel,
}: ProductEditModalProps) {
  const isCreate = product === null;
  const initGame = product?.game ?? defaultGame ?? Object.keys(GAME_CONFIG)[0];

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(product?.name ?? "");
  const [shortDescription, setShortDescription] = useState(
    product?.shortDescription ?? "",
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [game, setGame] = useState(initGame);
  const [category, setCategory] = useState(product?.category ?? "");
  const [language, setLanguage] = useState(product?.language ?? "ES");
  const [priceStr, setPriceStr] = useState(
    product ? String(product.price) : "",
  );
  const [wholesaleStr, setWholesaleStr] = useState(
    product ? String(product.wholesalePrice) : "",
  );
  const [storeStr, setStoreStr] = useState(
    product ? String(product.storePrice) : "",
  );
  const [costStr, setCostStr] = useState(
    product?.costPrice ? String(product.costPrice) : "",
  );
  const [compareStr, setCompareStr] = useState(
    product?.comparePrice ? String(product.comparePrice) : "",
  );
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [isNew, setIsNew] = useState(product?.isNew ?? false);
  const [tagsStr, setTagsStr] = useState(
    product?.tags?.join(", ") ?? "",
  );
  const [imageUrl, setImageUrl] = useState(product?.images?.[0] ?? "");
  const [_tagInput, _setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Validation & save ──────────────────────────────────────────────────────
  const handleSave = () => {
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    const price = parseFloat(priceStr);
    const wholesale = parseFloat(wholesaleStr);
    const store = parseFloat(storeStr);
    const cost = costStr ? parseFloat(costStr) : undefined;
    const compare = compareStr ? parseFloat(compareStr) : undefined;

    if (isNaN(price) || price <= 0) {
      setError("PVP Público inválido");
      return;
    }
    if (isNaN(wholesale) || wholesale <= 0) {
      setError("Precio Mayoristas inválido");
      return;
    }
    if (isNaN(store) || store <= 0) {
      setError("Precio Tiendas TCG inválido");
      return;
    }
    if (cost !== undefined && (isNaN(cost) || cost <= 0)) {
      setError("Precio de coste inválido");
      return;
    }
    if (cost !== undefined && cost > store) {
      setError("El coste no puede superar el precio para Tiendas");
      return;
    }
    if (store > wholesale) {
      setError("PVP Tiendas no puede superar PVP Mayoristas");
      return;
    }
    if (wholesale > price) {
      setError("PVP Mayoristas no puede superar PVP Público");
      return;
    }

    const tags = tagsStr
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const saved: LocalProduct = {
      id: product?.id ?? nextId,
      name: name.trim(),
      slug: product?.slug ?? toSlug(name.trim()),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      game,
      category,
      language,
      price,
      wholesalePrice: wholesale,
      storePrice: store,
      costPrice: cost,
      comparePrice: compare,
      inStock,
      isNew,
      tags,
      images: imageUrl ? [imageUrl] : (product?.images ?? []),
      createdAt:
        product?.createdAt ?? new Date().toISOString().slice(0, 10),
      isFeatured: product?.isFeatured,
      vatRate: product?.vatRate,
    };

    onSave(saved);
  };

  const gameCfg = GAME_CONFIG[game];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8"
      style={{
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isCreate ? "Añadir producto" : "Editar producto"}
          </h2>
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Image */}
          <div>
            <FieldLabel>Imagen (URL)</FieldLabel>
            <div className="flex gap-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="preview"
                  className="h-16 w-16 shrink-0 rounded-xl border border-gray-200 object-contain bg-gray-50"
                />
              )}
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                className={inputCls}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <FieldLabel required>Nombre del producto</FieldLabel>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className={inputCls}
            />
          </div>

          {/* Short description */}
          <div>
            <FieldLabel>Descripción corta</FieldLabel>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              maxLength={300}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Descripción completa</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Game + Category + Language */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel required>Juego</FieldLabel>
              <select
                value={game}
                onChange={(e) => {
                  setGame(e.target.value);
                  setCategory("");
                }}
                className={inputCls}
              >
                {Object.entries(GAME_CONFIG).map(([slug, cfg]) => (
                  <option key={slug} value={slug}>
                    {cfg.emoji} {cfg.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel required>Categoría</FieldLabel>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
              >
                <option value="">Selecciona...</option>
                {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Idioma</FieldLabel>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputCls}
              >
                {LANGUAGES.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Precios — Coste ≤ Tiendas ≤ Mayoristas ≤ PVP Público
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  {
                    label: "PVP Público",
                    color: "#2563eb",
                    value: priceStr,
                    set: setPriceStr,
                  },
                  {
                    label: "Mayoristas",
                    color: "#0891b2",
                    value: wholesaleStr,
                    set: setWholesaleStr,
                  },
                  {
                    label: "Tiendas TCG",
                    color: "#059669",
                    value: storeStr,
                    set: setStoreStr,
                  },
                  {
                    label: "Coste (admin)",
                    color: "#7c3aed",
                    value: costStr,
                    set: setCostStr,
                  },
                ] as {
                  label: string;
                  color: string;
                  value: string;
                  set: (v: string) => void;
                }[]
              ).map(({ label, color, value, set }) => (
                <div key={label}>
                  <label
                    className="mb-1 block text-xs font-semibold"
                    style={{ color }}
                  >
                    {label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Compare price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Precio anterior (tachado)</FieldLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                value={compareStr}
                onChange={(e) => setCompareStr(e.target.value)}
                placeholder="0.00 (sin descuento)"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col">
              <FieldLabel>Estado</FieldLabel>
              <div className="flex flex-wrap gap-3 pt-1">
                <Toggle
                  checked={inStock}
                  onChange={setInStock}
                  label="En stock"
                  colorOn="#059669"
                />
                <Toggle
                  checked={isNew}
                  onChange={setIsNew}
                  label="Novedad"
                  colorOn="#f59e0b"
                />
              </div>
              {isNew && (
                <p className="mt-1 text-[10px] text-amber-600">
                  El badge NUEVO caduca a los{" "}
                  {
                    /* newProductDays from SITE_CONFIG is 45 */
                    45
                  }{" "}
                  días desde createdAt
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <FieldLabel>Tags (separados por comas)</FieldLabel>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="magic, booster, edición limitada..."
                maxLength={500}
                className={inputCls}
              />
            </div>
            {tagsStr && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tagsStr
                  .split(/[,;]+/)
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: gameCfg?.color ?? "#2563eb" }}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={15} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <Save size={15} />
            {isCreate ? "Crear producto" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  colorOn,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  colorOn: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
      style={
        checked
          ? { backgroundColor: colorOn + "20", color: colorOn, border: `1.5px solid ${colorOn}40` }
          : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "1.5px solid transparent" }
      }
    >
      <span
        className="h-3.5 w-3.5 rounded-full border-2"
        style={
          checked
            ? { backgroundColor: colorOn, borderColor: colorOn }
            : { borderColor: "#9ca3af" }
        }
      />
      {label}
    </button>
  );
}
