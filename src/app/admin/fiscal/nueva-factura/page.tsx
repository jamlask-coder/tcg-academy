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
  CreditCard,
  FileText,
  CheckCircle2,
} from "lucide-react";
import {
  createInvoice,
  saveInvoice,
  buildLineItem,
} from "@/services/invoiceService";
import { getMergedProducts } from "@/lib/productStore";
import { SITE_CONFIG } from "@/config/siteConfig";
import {
  InvoiceType,
  PaymentMethod,
  TaxIdType,
} from "@/types/fiscal";
import type { CompanyData, CustomerData, InvoiceLineItem } from "@/types/fiscal";

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

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.TARJETA]: "Tarjeta",
  [PaymentMethod.TRANSFERENCIA]: "Transferencia",
  [PaymentMethod.EFECTIVO]: "Efectivo",
  [PaymentMethod.BIZUM]: "Bizum",
  [PaymentMethod.PAYPAL]: "PayPal",
  [PaymentMethod.CONTRA_REEMBOLSO]: "Contra reembolso",
};

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

// ─── Product picker ───────────────────────────────────────────────────────────

function ProductPicker({ onAdd }: { onAdd: (line: Omit<DraftLine, "id">) => void }) {
  const [query, setQuery] = useState("");
  const allProducts = useMemo(() => getMergedProducts(), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(q) || p.game.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allProducts]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
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
                <p className="text-xs text-gray-400">{p.price.toFixed(2)} € IVA incl.</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // — Tipo y metadatos
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.COMPLETA);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TARJETA);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // — Datos del cliente
  const [clientName, setClientName] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [clientTaxIdType, setClientTaxIdType] = useState<TaxIdType>(TaxIdType.NIF);
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientStreet, setClientStreet] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientPostal, setClientPostal] = useState("");
  const [clientProvince, setClientProvince] = useState("");

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

  // — Totales en vivo
  const totals = useMemo(() => {
    let base = 0, vat = 0, total = 0;
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

  // — Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lines.every((l) => !l.description.trim())) {
      setError("Añade al menos una línea con descripción.");
      return;
    }

    setSaving(true);
    try {
      const builtItems: InvoiceLineItem[] = lines
        .filter((l) => l.description.trim())
        .map((l, i) =>
          buildLineItem({
            lineNumber: i + 1,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPriceWithVAT: l.unitPriceWithVAT,
            vatRate: l.vatRate,
            discount: l.discount,
          }),
        );

      let recipient: CompanyData | CustomerData;

      if (invoiceType === InvoiceType.COMPLETA && clientTaxId) {
        recipient = {
          name: clientName,
          taxId: clientTaxId,
          taxIdType: clientTaxIdType,
          address: {
            street: clientStreet,
            city: clientCity,
            postalCode: clientPostal,
            province: clientProvince,
            country: "España",
            countryCode: "ES",
          },
          phone: clientPhone,
          email: clientEmail,
          isEU: false,
          countryCode: "ES",
        } satisfies CompanyData;
      } else {
        recipient = {
          name: clientName || "Cliente particular",
          taxId: clientTaxId || undefined,
          email: clientEmail || undefined,
          phone: clientPhone || undefined,
          countryCode: "ES",
        } satisfies CustomerData;
      }

      const invoice = await createInvoice({
        recipient,
        items: builtItems,
        paymentMethod,
        invoiceDate: new Date(invoiceDate),
        invoiceType,
      });

      saveInvoice(invoice);
      setSaved(true);
      setTimeout(() => router.push("/admin/fiscal/facturas"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la factura");
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <CheckCircle2 size={48} className="text-green-500" />
        <p className="text-xl font-bold text-gray-800">Factura creada correctamente</p>
        <p className="text-sm text-gray-500">Redirigiendo al libro de facturas…</p>
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
        <h1 className="text-xl font-bold text-gray-900">Nueva factura manual</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* — Sección 1: Metadatos ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText size={15} /> Datos de la factura
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tipo de factura
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value={InvoiceType.COMPLETA}>Completa</option>
                <option value={InvoiceType.SIMPLIFICADA}>Simplificada</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Fecha de factura
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Método de pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              >
                {Object.entries(PAYMENT_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* — Emisor (sólo lectura) ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Emisor (precargado)
          </h2>
          <p className="text-sm font-semibold text-gray-700">TCG Academy S.L.</p>
          <p className="text-xs text-gray-500">
            CIF: {SITE_CONFIG.cif} · {SITE_CONFIG.email} · {SITE_CONFIG.phone}
          </p>
        </div>

        {/* — Sección 2: Cliente ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <User size={15} /> Datos del cliente
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="flex gap-2">
              <div className="w-24 shrink-0">
                <label className="mb-1 block text-xs font-medium text-gray-600">Tipo ID</label>
                <select
                  value={clientTaxIdType}
                  onChange={(e) => setClientTaxIdType(e.target.value as TaxIdType)}
                  className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm focus:border-blue-400 focus:outline-none"
                >
                  {Object.values(TaxIdType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  NIF / CIF
                </label>
                <input
                  type="text"
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value.toUpperCase())}
                  placeholder="B12345678"
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Teléfono</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            {invoiceType === InvoiceType.COMPLETA && (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Dirección</label>
                  <input
                    type="text"
                    value={clientStreet}
                    onChange={(e) => setClientStreet(e.target.value)}
                    placeholder="Calle, número, piso..."
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Ciudad</label>
                  <input
                    type="text"
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    placeholder="Ciudad"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-28 shrink-0">
                    <label className="mb-1 block text-xs font-medium text-gray-600">CP</label>
                    <input
                      type="text"
                      value={clientPostal}
                      onChange={(e) => setClientPostal(e.target.value)}
                      placeholder="03001"
                      className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Provincia</label>
                    <input
                      type="text"
                      value={clientProvince}
                      onChange={(e) => setClientProvince(e.target.value)}
                      placeholder="Alicante"
                      className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* — Sección 3: Líneas ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Package size={15} /> Líneas de factura
          </h2>

          {/* Buscador de catálogo */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-gray-500">
              Añadir producto del catálogo web
            </p>
            <ProductPicker onAdd={addLine} />
          </div>

          {/* Tabla de líneas */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="pb-2 text-left font-medium">Descripción</th>
                  <th className="pb-2 w-16 text-center font-medium">Cant.</th>
                  <th className="pb-2 w-28 text-right font-medium">Precio IVA incl.</th>
                  <th className="pb-2 w-20 text-center font-medium">IVA %</th>
                  <th className="pb-2 w-16 text-center font-medium">Dto. %</th>
                  <th className="pb-2 w-24 text-right font-medium">Total</th>
                  <th className="pb-2 w-8" />
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
                            updateLine(line.id, { description: e.target.value })
                          }
                          placeholder="Descripción del producto o servicio"
                          className="h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-1">
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
                      <td className="py-1.5 px-1">
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
                      <td className="py-1.5 px-1">
                        <select
                          value={line.vatRate}
                          onChange={(e) =>
                            updateLine(line.id, {
                              vatRate: Number(e.target.value) as 0 | 4 | 10 | 21,
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        >
                          {VAT_OPTIONS.map((v) => (
                            <option key={v} value={v}>{v}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={line.discount}
                          onChange={(e) =>
                            updateLine(line.id, {
                              discount: Math.min(100, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right font-semibold text-gray-700">
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

        {/* — Sección 4: Totales ───────────────────────────────────────────── */}
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

        {/* — Error ───────────────────────────────────────────────────────── */}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {/* — Acciones ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/fiscal/facturas"
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <CreditCard size={15} />
            {saving ? "Generando…" : "Crear factura"}
          </button>
        </div>
      </form>
    </div>
  );
}
