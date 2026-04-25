"use client";
/**
 * Escáner de tickets / facturas de proveedor.
 *
 * El admin sube una foto (móvil o scanner). Tesseract corre en cliente y
 * extraemos razón social, CIF, número, fecha, bases imponibles, IVA y total.
 * El admin valida los campos sugeridos y, al confirmar, se persiste vía
 * supplierInvoiceService → cadena fiscal estándar (303, 347, etc.).
 */

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileImage,
  X,
} from "lucide-react";
import {
  scanTicketImages,
  type OcrTicketDraft,
} from "@/services/ticketOcrService";
import { addSupplierInvoice } from "@/services/supplierInvoiceService";
import {
  TaxIdType,
  type SupplierInvoiceCategory,
  type SupplierInvoiceLine,
} from "@/types/fiscal";
import { useRouter } from "next/navigation";

const CATEGORY_LABELS: Record<SupplierInvoiceCategory, string> = {
  mercaderias: "Mercadería (reventa)",
  alquiler: "Alquiler local",
  suministros: "Suministros (luz/agua/internet)",
  servicios_profesionales: "Servicios profesionales",
  transporte: "Transporte",
  marketing: "Marketing / publicidad",
  material_oficina: "Material de oficina",
  amortizable: "Inmovilizado (amortizable)",
  otros: "Otros",
};

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EscanearTicketPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ msg: string; pct: number } | null>(
    null,
  );
  const [draft, setDraft] = useState<OcrTicketDraft | null>(null);
  const [category, setCategory] = useState<SupplierInvoiceCategory>("mercaderias");
  const [retentionPct, setRetentionPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSelectFiles = async (files: FileList) => {
    const arr: string[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await readAsDataUrl(f);
      arr.push(dataUrl);
    }
    setImages(arr);
    setDraft(null);
    setSaved(false);
    setError(null);
  };

  const onScan = async () => {
    if (images.length === 0) {
      setError("Sube al menos una imagen.");
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const result = await scanTicketImages(images, (msg, pct) =>
        setProgress({ msg, pct }),
      );
      setDraft(result);
      // Si la fila trae retención, prepoblamos.
      if (result.retentionPct) setRetentionPct(result.retentionPct);
    } catch (e) {
      setError(`Error escaneando: ${(e as Error).message}`);
    } finally {
      setScanning(false);
      setProgress(null);
    }
  };

  const onSave = () => {
    if (!draft) return;
    if (!draft.supplierName) {
      setError("Falta razón social del proveedor.");
      return;
    }
    if (!draft.invoiceNumber) {
      setError("Falta número de factura.");
      return;
    }
    if (!draft.invoiceDate) {
      setError("Falta fecha de factura.");
      return;
    }

    const lines: SupplierInvoiceLine[] = draft.lines.length
      ? draft.lines.map((l) => ({
          description: `Base ${l.vatRate}%`,
          quantity: 1,
          taxableBase: l.taxableBase,
          vatRate: l.vatRate,
          vatAmount: l.vatAmount,
          deductiblePct: 100,
          deductibleVAT: l.vatAmount,
          retentionPct,
          retentionAmount:
            retentionPct > 0
              ? Math.round(((l.taxableBase * retentionPct) / 100) * 100) / 100
              : 0,
          totalLine:
            l.taxableBase +
            l.vatAmount -
            (retentionPct > 0
              ? Math.round(((l.taxableBase * retentionPct) / 100) * 100) / 100
              : 0),
        }))
      : [
          {
            description: draft.invoiceNumber || "Línea única",
            quantity: 1,
            taxableBase: draft.totalTaxableBase || draft.totalAmount,
            vatRate: 21,
            vatAmount: draft.totalVAT,
            deductiblePct: 100,
            deductibleVAT: draft.totalVAT,
            retentionPct,
            retentionAmount: 0,
            totalLine: draft.totalAmount,
          },
        ];
    addSupplierInvoice({
      supplierInvoiceNumber: draft.invoiceNumber,
      invoiceDate: draft.invoiceDate,
      receivedDate: new Date().toISOString().slice(0, 10),
      supplier: {
        name: draft.supplierName,
        taxId: draft.supplierCif,
        taxIdType: TaxIdType.CIF,
        address: {
          street: draft.supplierAddress,
          city: "",
          postalCode: "",
          province: "",
          country: "España",
          countryCode: "ES",
        },
        phone: "",
        email: "",
        isEU: false,
        countryCode: "ES",
      },
      category,
      lines,
      paymentMethod: null,
      paymentDate: null,
      notes: `OCR confianza ${Math.round(draft.confidence * 100)}%`,
    });
    setSaved(true);
    setTimeout(() => router.push("/admin/fiscal/proveedores"), 1200);
  };

  // ── Helpers de edición sobre el draft ─────────────────────────────────────
  const updateDraft = (patch: Partial<OcrTicketDraft>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
  };

  return (
    <div>
      <Link
        href="/admin/fiscal/proveedores"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
      >
        <ArrowLeft size={14} /> Volver a Facturas de Proveedores
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Camera size={22} className="text-[#475569]" /> Escanear ticket /
          factura
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sube una foto y el sistema rellenará los campos. Tú validas antes de
          guardar.
        </p>
      </div>

      {/* Step 1: subir imágenes */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-gray-900">1. Subir imágenes</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#475569] px-3 py-2 text-sm font-semibold text-white hover:bg-[#334155]"
          >
            <FileImage size={14} /> Seleccionar fotos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void onSelectFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={onScan}
            disabled={images.length === 0 || scanning}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0891b2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {scanning ? "Escaneando…" : "Escanear OCR"}
          </button>
        </div>

        {progress && (
          <div className="mt-3">
            <div className="mb-1 text-xs text-gray-600">{progress.msg}</div>
            <div className="h-1.5 overflow-hidden rounded bg-gray-100">
              <div
                className="h-full bg-[#0891b2] transition-all"
                style={{ width: `${Math.round(progress.pct * 100)}%` }}
              />
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview de imagen subida por admin (data URL) */}
                <img
                  src={src}
                  alt={`Vista previa ${i + 1}`}
                  className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, k) => k !== i))
                  }
                  aria-label="Eliminar imagen"
                  className="absolute -top-1 -right-1 rounded-full bg-red-600 p-0.5 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: validación de campos */}
      {draft && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">2. Validar datos</h2>
            <ConfidenceBadge value={draft.confidence} />
          </div>

          {draft.warnings.length > 0 && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <AlertTriangle size={12} /> Avisos OCR
              </p>
              <ul className="ml-4 list-disc">
                {draft.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Razón social">
              <input
                value={draft.supplierName}
                onChange={(e) => updateDraft({ supplierName: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="CIF / NIF">
              <input
                value={draft.supplierCif}
                onChange={(e) => updateDraft({ supplierCif: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Nº factura">
              <input
                value={draft.invoiceNumber}
                onChange={(e) => updateDraft({ invoiceNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Fecha (YYYY-MM-DD)">
              <input
                type="date"
                value={draft.invoiceDate}
                onChange={(e) => updateDraft({ invoiceDate: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Dirección">
              <input
                value={draft.supplierAddress}
                onChange={(e) => updateDraft({ supplierAddress: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Categoría">
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as SupplierInvoiceCategory)
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Retención (%)">
              <select
                value={retentionPct}
                onChange={(e) => setRetentionPct(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value={0}>Sin retención</option>
                <option value={15}>15% (IRPF profesionales)</option>
                <option value={19}>19% (alquileres)</option>
                <option value={7}>7% (IRPF reducido)</option>
              </select>
            </Field>
            <Field label="Total">
              <input
                type="number"
                step="0.01"
                value={draft.totalAmount}
                onChange={(e) =>
                  updateDraft({ totalAmount: Number(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>

          {/* Tabla de líneas IVA */}
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Líneas IVA
            </h3>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">Tipo</th>
                  <th className="px-2 py-1 text-right font-semibold">Base</th>
                  <th className="px-2 py-1 text-right font-semibold">IVA</th>
                </tr>
              </thead>
              <tbody>
                {draft.lines.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-2 text-gray-400">
                      No se detectaron líneas IVA. Se asumirá una línea única
                      al 21% con la base = total − IVA.
                    </td>
                  </tr>
                ) : (
                  draft.lines.map((l, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 font-medium text-gray-700">
                        {l.vatRate}%
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={l.taxableBase}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            const next = [...draft.lines];
                            next[i] = {
                              ...next[i],
                              taxableBase: v,
                              vatAmount: Math.round(((v * l.vatRate) / 100) * 100) / 100,
                            };
                            updateDraft({ lines: next });
                          }}
                          className="w-24 rounded border border-gray-200 px-1.5 py-1 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">{fmt(l.vatAmount)} €</td>
                    </tr>
                  ))
                )}
                <tr className="border-t border-gray-200 bg-gray-50 font-bold">
                  <td className="px-2 py-1.5">Subtotal</td>
                  <td className="px-2 py-1.5 text-right">
                    {fmt(draft.totalTaxableBase)} €
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {fmt(draft.totalVAT)} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Texto OCR para depurar */}
          {draft.rawText && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-semibold text-gray-600">
                Ver texto OCR original
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[10px] whitespace-pre-wrap text-gray-700">
                {draft.rawText}
              </pre>
            </details>
          )}

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saved}
              className="inline-flex items-center gap-2 rounded-xl bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <CheckCircle2 size={14} /> Guardar factura proveedor
            </button>
          </div>

          {saved && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Factura guardada. Redirigiendo…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const cls =
    pct >= 75
      ? "bg-green-100 text-green-700"
      : pct >= 40
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      Confianza {pct}%
    </span>
  );
}
