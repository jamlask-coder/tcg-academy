"use client";
/**
 * Importación masiva de productos desde CSV de distribuidor.
 *
 * Flujo:
 *  1) Admin sube un CSV (Asmodee / Heidelberger / Bandai / genérico).
 *  2) El sistema autodetecta preset y mapea columnas.
 *  3) Admin revisa la previsualización con avisos por fila.
 *  4) Admin ajusta defaults (juego, categoría, idioma, margen).
 *  5) Confirma → cada fila se vuelve un producto admin-creado con NUEVO badge.
 *
 * SSOT: `productImportService` parsea y valida; `persistNewProduct` escribe.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Sparkles,
} from "lucide-react";
import {
  parseDistributorCsv,
  importProducts,
  suggestedDefaults,
  DISTRIBUTOR_PRESETS,
  type DistributorImportPreview,
  type ImportDefaults,
  type ImportResult,
  type ParsedProductRow,
} from "@/services/productImportService";
import { GAME_CONFIG, CATEGORY_LABELS } from "@/data/products";

const LANGUAGES = ["EN", "ES", "JP", "FR", "DE", "IT", "KO", "PT", "ZH"];
const fmt = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ImportarProductosPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<DistributorImportPreview | null>(null);
  const [defaults, setDefaults] = useState<ImportDefaults | null>(null);
  const [presetOverride, setPresetOverride] = useState<string>("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseMsg, setParseMsg] = useState<string | null>(null);
  const [skipFlags, setSkipFlags] = useState<Record<number, boolean>>({});

  const onFileSelected = async (file: File) => {
    setResult(null);
    setSkipFlags({});
    try {
      const text = await file.text();
      const pv = parseDistributorCsv(
        text,
        presetOverride || undefined,
      );
      setPreview(pv);
      setDefaults(suggestedDefaults(pv.preset));
      setParseMsg(
        `Detectado preset "${pv.preset.name}" — ${pv.rows.length} filas válidas, ${pv.errors.length} errores.`,
      );
    } catch (e) {
      setParseMsg(`Error leyendo el fichero: ${(e as Error).message}`);
    }
  };

  const filteredRows = useMemo<ParsedProductRow[]>(() => {
    if (!preview) return [];
    return preview.rows.filter((_, i) => !skipFlags[i]);
  }, [preview, skipFlags]);

  const onConfirm = () => {
    if (!preview || !defaults) return;
    const ok = window.confirm(
      `Vas a crear ${filteredRows.length} productos en el catálogo. ¿Continuar?`,
    );
    if (!ok) return;
    const r = importProducts(filteredRows, defaults);
    setResult(r);
  };

  return (
    <div>
      <Link
        href="/admin/productos"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
      >
        <ArrowLeft size={14} /> Volver al catálogo
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Boxes size={22} className="text-[#16a34a]" /> Importación masiva
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sube el CSV de tu distribuidor. Auto-detectamos columnas y damos de
            alta cada producto con el badge NUEVO activado.
          </p>
        </div>
      </div>

      {/* Step 1: subir fichero */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-gray-900">1. Subir CSV</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={presetOverride}
            onChange={(e) => setPresetOverride(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
          >
            <option value="">Auto-detectar distribuidor</option>
            {DISTRIBUTOR_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                Forzar: {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#16a34a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#15803d]"
          >
            <Upload size={14} /> Seleccionar CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFileSelected(f);
              e.target.value = "";
            }}
          />
          {parseMsg && (
            <p className="text-xs text-gray-600">{parseMsg}</p>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Columnas reconocidas: nombre, EAN, SKU/referencia, coste, PVP, stock,
          categoría, idioma, descripción. Soporta delimitadores `;`, `,` y `\t`.
        </p>
      </div>

      {/* Step 2: defaults */}
      {preview && defaults && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-gray-900">2. Defaults</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Juego">
              <select
                value={defaults.game}
                onChange={(e) =>
                  setDefaults({ ...defaults, game: e.target.value })
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                {Object.entries(GAME_CONFIG).map(([slug, g]) => (
                  <option key={slug} value={slug}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoría">
              <select
                value={defaults.category}
                onChange={(e) =>
                  setDefaults({ ...defaults, category: e.target.value })
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Idioma">
              <select
                value={defaults.language}
                onChange={(e) =>
                  setDefaults({ ...defaults, language: e.target.value })
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="IVA (%)">
              <input
                type="number"
                value={defaults.vatRate}
                onChange={(e) =>
                  setDefaults({
                    ...defaults,
                    vatRate: Number(e.target.value) || 21,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Margen sobre coste (%)">
              <input
                type="number"
                value={defaults.marginPct}
                onChange={(e) =>
                  setDefaults({
                    ...defaults,
                    marginPct: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
              <span className="text-[10px] text-gray-400">
                Aplicado solo cuando la fila no trae PVP
              </span>
            </Field>
            <Field label="Forzar inStock">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={defaults.forceInStock}
                  onChange={(e) =>
                    setDefaults({ ...defaults, forceInStock: e.target.checked })
                  }
                />
                Marcar todos como disponibles
              </label>
            </Field>
            <Field label="Badge NUEVO">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={defaults.markNew}
                  onChange={(e) =>
                    setDefaults({ ...defaults, markNew: e.target.checked })
                  }
                />
                createdAt = hoy (45 días en home)
              </label>
            </Field>
          </div>
        </div>
      )}

      {/* Step 3: previsualización */}
      {preview && preview.rows.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">
              3. Previsualización ({filteredRows.length} de {preview.rows.length})
            </h2>
            {preview.errors.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                <AlertTriangle size={12} /> {preview.errors.length} errores
              </span>
            )}
          </div>

          {preview.errors.length > 0 && (
            <ul className="mb-3 max-h-32 overflow-y-auto rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {preview.errors.slice(0, 12).map((er, i) => (
                <li key={i}>{er}</li>
              ))}
            </ul>
          )}

          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left text-[11px] tracking-wide text-gray-500 uppercase">
                  <th className="px-2 py-2 font-semibold">Incl.</th>
                  <th className="px-2 py-2 font-semibold">Fila</th>
                  <th className="px-2 py-2 font-semibold">Nombre</th>
                  <th className="px-2 py-2 font-semibold">EAN/SKU</th>
                  <th className="px-2 py-2 text-right font-semibold">Coste</th>
                  <th className="px-2 py-2 text-right font-semibold">PVP</th>
                  <th className="px-2 py-2 text-right font-semibold">Stock</th>
                  <th className="px-2 py-2 font-semibold">Avisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((row, i) => (
                  <tr key={i} className={skipFlags[i] ? "opacity-40" : ""}>
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={!skipFlags[i]}
                        onChange={(e) =>
                          setSkipFlags((prev) => ({
                            ...prev,
                            [i]: !e.target.checked,
                          }))
                        }
                        aria-label={`Incluir fila ${row.rowIndex}`}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-gray-500">
                      {row.rowIndex}
                    </td>
                    <td className="px-2 py-1.5 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-2 py-1.5 text-gray-600">
                      {[row.ean, row.sku].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-700">
                      {row.costPrice !== null ? `${fmt(row.costPrice)} €` : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-700">
                      {row.pvp !== null ? `${fmt(row.pvp)} €` : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-700">
                      {row.stock !== null ? row.stock : "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      {row.warnings.length > 0 ? (
                        <span className="text-amber-700">
                          {row.warnings.join(", ")}
                        </span>
                      ) : (
                        <span className="text-green-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Sparkles size={14} /> Confirmar importación de{" "}
              {filteredRows.length} productos
            </button>
          </div>
        </div>
      )}

      {/* Step 4: resultado */}
      {result && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold text-green-800">
            <CheckCircle2 size={18} /> Importación finalizada
          </h2>
          <p className="text-sm text-green-800">
            Productos creados: <strong>{result.created}</strong> · Saltados:{" "}
            <strong>{result.skipped}</strong>
          </p>
          {result.errors.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-semibold text-amber-700">
                Ver {result.errors.length} avisos
              </summary>
              <ul className="mt-1 ml-5 list-disc text-amber-700">
                {result.errors.slice(0, 50).map((er, i) => (
                  <li key={i}>{er}</li>
                ))}
              </ul>
            </details>
          )}
          <Link
            href="/admin/productos"
            className="mt-3 inline-block text-xs font-semibold text-green-800 underline"
          >
            Ver catálogo →
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}
