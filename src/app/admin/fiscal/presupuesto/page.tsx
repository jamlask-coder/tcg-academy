"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getMergedProducts, getMergedById } from "@/lib/productStore";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";
import { generateInvoiceHTML } from "@/utils/invoiceGenerator";
import type { InvoiceData } from "@/utils/invoiceGenerator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraftLine {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPriceWithVAT: number;
  vatRate: 0 | 4 | 10 | 21;
  discount: number;
}

const VAT_OPTIONS: Array<0 | 4 | 10 | 21> = [0, 4, 10, 21];

const PRESUPUESTO_STORAGE_KEY = "tcgacademy_presupuestos";

interface SavedPresupuesto {
  id: string;
  number: string;
  date: string;
  clientName: string;
  lines: DraftLine[];
  total: number;
  validated: boolean;
  stockDeducted: boolean;
}

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcLine(dl: DraftLine) {
  const unitNoVAT = roundTo2(dl.unitPriceWithVAT / (1 + dl.vatRate / 100));
  const subtotal = roundTo2(unitNoVAT * dl.quantity);
  const discountAmt = roundTo2(subtotal * (dl.discount / 100));
  const taxableBase = roundTo2(subtotal - discountAmt);
  const vatAmt = roundTo2(taxableBase * (dl.vatRate / 100));
  const total = roundTo2(taxableBase + vatAmt);
  return { unitNoVAT, taxableBase, vatAmt, total };
}

function generatePresupuestoNumber(): string {
  const year = new Date().getFullYear();
  const existing: SavedPresupuesto[] = JSON.parse(
    localStorage.getItem(PRESUPUESTO_STORAGE_KEY) ?? "[]",
  );
  const seq = String(existing.length + 1).padStart(5, "0");
  return `PRE-${year}-${seq}`;
}

// ─── Product picker ───────────────────────────────────────────────────────────

function ProductPicker({
  onAdd,
}: {
  onAdd: (line: Omit<DraftLine, "id">) => void;
}) {
  const [query, setQuery] = useState("");
  const allProducts = useMemo(() => getMergedProducts(), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.game.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, allProducts]);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto del catálogo..."
          className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onAdd({
                  productId: String(p.id),
                  description: p.name,
                  quantity: 1,
                  unitPriceWithVAT: p.price,
                  vatRate: SITE_CONFIG.vatRate as 21,
                  discount: 0,
                });
                setQuery("");
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <Package size={14} className="shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-400">
                  {p.price.toFixed(2)} € IVA incl.
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stock deduction ──────────────────────────────────────────────────────────

function deductStock(lines: DraftLine[]) {
  const overrides = JSON.parse(
    localStorage.getItem("tcgacademy_product_overrides") ?? "{}",
  );

  for (const line of lines) {
    if (line.productId === "manual") continue;
    const productId = Number(line.productId);
    const product = getMergedById(productId);
    if (product?.stock !== undefined && typeof product.stock === "number") {
      const newStock = Math.max(0, product.stock - line.quantity);
      overrides[productId] = {
        ...overrides[productId],
        stock: newStock,
        inStock: newStock > 0,
      };
    }
  }

  localStorage.setItem(
    "tcgacademy_product_overrides",
    JSON.stringify(overrides),
  );
  window.dispatchEvent(new Event("tcga:products:updated"));
}

// ─── PDF generation for presupuesto ───────────────────────────────────────────

function buildPresupuestoData(
  number: string,
  date: string,
  clientName: string,
  lines: DraftLine[],
): InvoiceData {
  const issuer = getIssuerAddress();
  return {
    invoiceNumber: number,
    date,
    issuerName: SITE_CONFIG.legalName,
    issuerCIF: SITE_CONFIG.cif,
    issuerAddress: issuer.street || SITE_CONFIG.address,
    issuerCity: issuer.cityLine,
    issuerPhone: SITE_CONFIG.phone,
    issuerEmail: SITE_CONFIG.email,
    clientName: clientName || "Cliente",
    items: lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        name: l.description,
        quantity: l.quantity,
        unitPriceWithVAT: l.unitPriceWithVAT,
        vatRate: l.vatRate,
      })),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PresupuestoPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStockConfirm, setShowStockConfirm] = useState(false);
  const [pendingPresupuesto, setPendingPresupuesto] =
    useState<SavedPresupuesto | null>(null);

  // — Datos
  const [presupuestoDate, setPresupuestoDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  // — Líneas
  const [lines, setLines] = useState<DraftLine[]>([
    {
      id: crypto.randomUUID(),
      productId: "manual",
      description: "",
      quantity: 1,
      unitPriceWithVAT: 0,
      vatRate: 21,
      discount: 0,
    },
  ]);

  const addLine = useCallback((preset?: Omit<DraftLine, "id">) => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "manual",
        description: "",
        quantity: 1,
        unitPriceWithVAT: 0,
        vatRate: 21,
        discount: 0,
        ...preset,
      },
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLine = useCallback(
    (id: string, patch: Partial<Omit<DraftLine, "id">>) => {
      setLines((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      );
    },
    [],
  );

  // — Totales
  const totals = useMemo(() => {
    let base = 0,
      vat = 0,
      total = 0;
    for (const l of lines) {
      const c = calcLine(l);
      base += c.taxableBase;
      vat += c.vatAmt;
      total += c.total;
    }
    return {
      base: roundTo2(base),
      vat: roundTo2(vat),
      total: roundTo2(total),
    };
  }, [lines]);

  // — Validar presupuesto
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lines.every((l) => !l.description.trim())) {
      setError("Añade al menos una línea con descripción.");
      return;
    }

    const number = generatePresupuestoNumber();
    const presupuesto: SavedPresupuesto = {
      id: crypto.randomUUID(),
      number,
      date: presupuestoDate,
      clientName: clientName || "Cliente particular",
      lines,
      total: totals.total,
      validated: true,
      stockDeducted: false,
    };

    setPendingPresupuesto(presupuesto);
    setShowStockConfirm(true);
  }

  function finalizePresupuesto(deductStockFlag: boolean) {
    if (!pendingPresupuesto) return;

    const presupuesto = {
      ...pendingPresupuesto,
      stockDeducted: deductStockFlag,
    };

    // Guardar en localStorage (NO en facturas, NO en contabilidad)
    const existing: SavedPresupuesto[] = JSON.parse(
      localStorage.getItem(PRESUPUESTO_STORAGE_KEY) ?? "[]",
    );
    existing.push(presupuesto);
    localStorage.setItem(PRESUPUESTO_STORAGE_KEY, JSON.stringify(existing));

    // Descontar stock si el usuario lo confirmó
    if (deductStockFlag) {
      deductStock(presupuesto.lines);
    }

    // Generar PDF del presupuesto
    const invoiceData = buildPresupuestoData(
      presupuesto.number,
      presupuesto.date,
      presupuesto.clientName,
      presupuesto.lines,
    );
    const html = generateInvoiceHTML(invoiceData);
    // Reemplazar "Factura" por "Presupuesto" en el HTML generado
    const presupuestoHtml = html
      .replace(/<title>Factura/g, "<title>Presupuesto")
      .replace(/>Factura</g, ">Presupuesto<")
      .replace(/class="inv-meta-label">Factura/g, 'class="inv-meta-label">Presupuesto')
      .replace(
        /Factura expedida conforme/g,
        "Presupuesto orientativo. Este documento no tiene validez fiscal ni contable",
      )
      .replace(
        /Reglamento de facturación.*?\./,
        "Los precios incluyen IVA y están sujetos a disponibilidad de stock.",
      );

    // Inyectar banner de presupuesto
    const bannerHtml = `<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:10px 16px;margin-bottom:18px;text-align:center;font-size:11pt;font-weight:700;color:#92400e;">PRESUPUESTO — Documento sin validez fiscal</div>`;
    const finalHtml = presupuestoHtml.replace(
      '<!-- ── HEADER:',
      `${bannerHtml}\n  <!-- ── HEADER:`,
    );

    const baseTag = `<base href="${window.location.origin}/">`;
    const htmlWithBase = finalHtml.replace("<head>", `<head>${baseTag}`);

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlWithBase);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {}
          }, 2000);
        }
      }, 600);
    }

    setShowStockConfirm(false);
    setSaved(true);
    setTimeout(() => router.push("/admin/fiscal/facturas"), 2000);
  }

  // — Confirmación de stock
  if (showStockConfirm && pendingPresupuesto) {
    const hasProducts = lines.some((l) => l.productId !== "manual");
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <AlertTriangle size={48} className="text-amber-500" />
        <div>
          <p className="text-xl font-bold text-gray-800">
            Presupuesto {pendingPresupuesto.number}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Total: {pendingPresupuesto.total.toFixed(2)} € — Cliente:{" "}
            {pendingPresupuesto.clientName}
          </p>
        </div>

        {hasProducts ? (
          <>
            <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                ¿Desea reservar el stock de los productos incluidos en este
                presupuesto?
              </p>
              <p className="mt-2 text-xs text-amber-700">
                Si confirma, las cantidades se descontarán del inventario
                disponible. Esto es útil si quiere asegurar la disponibilidad
                para el cliente mientras el presupuesto está pendiente de
                aceptación.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => finalizePresupuesto(true)}
                className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
              >
                Sí, reservar stock
              </button>
              <button
                onClick={() => finalizePresupuesto(false)}
                className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                No, solo guardar presupuesto
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Este presupuesto no contiene productos del catálogo, por lo que no
              afecta al stock.
            </p>
            <button
              onClick={() => finalizePresupuesto(false)}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Guardar presupuesto y generar PDF
            </button>
          </>
        )}

        <button
          onClick={() => setShowStockConfirm(false)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Volver a editar
        </button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <CheckCircle2 size={48} className="text-green-500" />
        <p className="text-xl font-bold text-gray-800">
          Presupuesto guardado correctamente
        </p>
        <p className="text-sm text-gray-500">
          El PDF se ha generado. Redirigiendo al libro de facturas…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/fiscal/facturas"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={15} /> Facturas
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          Nuevo presupuesto manual
        </h1>
      </div>

      {/* Info banner */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Presupuesto:</strong> Este documento es orientativo y no se
        registra en la contabilidad ni se comunica a VeriFactu/AEAT.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* — Sección 1: Metadatos */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText size={15} /> Datos del presupuesto
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Fecha del presupuesto
              </label>
              <input
                type="date"
                value={presupuestoDate}
                onChange={(e) => setPresupuestoDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Notas internas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas para referencia interna..."
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* — Emisor (sólo lectura) */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Emisor (precargado)
          </h2>
          <p className="text-sm font-semibold text-gray-700">
            {SITE_CONFIG.legalName}
          </p>
          <p className="text-xs text-gray-500">
            CIF: {SITE_CONFIG.cif} · {SITE_CONFIG.email} · {SITE_CONFIG.phone}
          </p>
        </div>

        {/* — Sección 2: Cliente */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <User size={15} /> Datos del cliente
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nombre / Razón social
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Email
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Teléfono
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* — Sección 3: Líneas */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Package size={15} /> Líneas del presupuesto
          </h2>

          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-gray-500">
              Añadir producto del catálogo web
            </p>
            <ProductPicker onAdd={addLine} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="pb-2 text-left font-medium">Descripción</th>
                  <th className="w-16 pb-2 text-center font-medium">Cant.</th>
                  <th className="w-28 pb-2 text-right font-medium">
                    Precio IVA incl.
                  </th>
                  <th className="w-20 pb-2 text-center font-medium">IVA %</th>
                  <th className="w-16 pb-2 text-center font-medium">Dto. %</th>
                  <th className="w-24 pb-2 text-right font-medium">Total</th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lines.map((line) => {
                  const c = calcLine(line);
                  return (
                    <tr key={line.id}>
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Descripción del producto o servicio"
                          className="h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.id, {
                              quantity: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={line.unitPriceWithVAT}
                          onChange={(e) =>
                            updateLine(line.id, {
                              unitPriceWithVAT: Number(e.target.value),
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-right text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <select
                          value={line.vatRate}
                          onChange={(e) =>
                            updateLine(line.id, {
                              vatRate: Number(e.target.value) as
                                | 0
                                | 4
                                | 10
                                | 21,
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        >
                          {VAT_OPTIONS.map((v) => (
                            <option key={v} value={v}>
                              {v}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={line.discount}
                          onChange={(e) =>
                            updateLine(line.id, {
                              discount: Math.min(
                                100,
                                Math.max(0, Number(e.target.value)),
                              ),
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5 text-right font-semibold text-gray-700">
                        {c.total.toFixed(2)} €
                      </td>
                      <td className="py-1.5 pl-1">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length === 1}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Eliminar línea"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => addLine()}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <Plus size={13} /> Añadir línea manual
          </button>
        </div>

        {/* — Sección 4: Totales */}
        <div className="flex justify-end">
          <div className="w-64 rounded-2xl border border-gray-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 text-gray-500">
              <span>Base imponible</span>
              <span>{totals.base.toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between py-2 text-gray-500">
              <span>IVA</span>
              <span>{totals.vat.toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
              <span>Total</span>
              <span>{totals.total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* — Error */}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* — Acciones */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/fiscal/facturas"
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            <FileText size={15} />
            Validar presupuesto
          </button>
        </div>
      </form>
    </div>
  );
}
