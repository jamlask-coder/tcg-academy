"use client";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileWarning,
  User,
  AlertTriangle,
  CheckCircle2,
  Eye,
  X,
} from "lucide-react";
import {
  loadInvoices,
  rectifyInvoice,
  buildLineItem,
} from "@/services/invoiceService";
import {
  InvoiceType,
  PaymentMethod,
  TaxIdType,
  CorrectionType,
} from "@/types/fiscal";
import type {
  InvoiceRecord,
  CompanyData,
  CustomerData,
  CorrectionData,
  InvoiceLineItem,
} from "@/types/fiscal";
import { useAuth } from "@/context/AuthContext";
import { validateSpanishNIF } from "@/lib/validations/nif";
import { moneyRound as roundTo2 } from "@/lib/money";

// ─── Tipos y constantes ──────────────────────────────────────────────────────

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

// Códigos AEAT para rectificativas (VeriFactu / SII).
const REASON_CODES: Array<{
  code: CorrectionData["reasonCode"];
  label: string;
  hint: string;
}> = [
  { code: "R1", label: "R1 — Error fundado en derecho", hint: "Error en la factura original: datos, concepto, importe o tipo de IVA incorrectos." },
  { code: "R2", label: "R2 — Concurso de acreedores", hint: "El receptor ha entrado en concurso (art. 80.3 LIVA)." },
  { code: "R3", label: "R3 — Deudor no establecido en TAI", hint: "Créditos incobrables de deudores no establecidos en territorio de aplicación del impuesto." },
  { code: "R4", label: "R4 — Otras causas", hint: "Causa distinta a R1/R2/R3/R5 (devolución de mercancía, rappel por volumen, etc.)." },
  { code: "R5", label: "R5 — Factura simplificada", hint: "Rectificación de factura simplificada (ticket)." },
];

function calcLine(dl: DraftLine) {
  const unitNoVAT = roundTo2(dl.unitPriceWithVAT / (1 + dl.vatRate / 100));
  const subtotal = roundTo2(unitNoVAT * dl.quantity);
  const discountAmt = roundTo2(subtotal * (dl.discount / 100));
  const taxableBase = roundTo2(subtotal - discountAmt);
  const vatAmt = roundTo2(taxableBase * (dl.vatRate / 100));
  const total = roundTo2(taxableBase + vatAmt);
  return { taxableBase, vatAmt, total };
}

// ─── Prefill desde factura original ──────────────────────────────────────────

function linesFromInvoice(inv: InvoiceRecord): DraftLine[] {
  return inv.items
    // Evitamos precargar líneas "envío" o "cupón" internas — se reconstruyen si hace falta.
    .map((item) => {
      const unitWithVAT = roundTo2(item.unitPrice * (1 + item.vatRate / 100));
      return {
        id: crypto.randomUUID(),
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPriceWithVAT: unitWithVAT,
        vatRate: item.vatRate,
        discount: item.discount,
      };
    });
}

// ─── Componente ──────────────────────────────────────────────────────────────

// Carga síncrona inicial: se ejecuta una sola vez dentro del lazy initializer
// de useState, evitando `setState` en useEffect (regla react-hooks/set-state-in-effect).
function loadOriginalSync(invoiceId: string): InvoiceRecord | null {
  try {
    return loadInvoices().find((i) => i.invoiceId === invoiceId) ?? null;
  } catch {
    return null;
  }
}

export default function RectificarClient({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { user } = useAuth();

  // Carga síncrona del original (lazy init — sólo corre en el primer render).
  const [original] = useState<InvoiceRecord | null>(() =>
    loadOriginalSync(invoiceId),
  );
  const notFound = original === null;

  // Prefill derivado del original una sola vez.
  const recipient = useMemo(
    () =>
      (original?.recipient ?? {}) as Partial<CompanyData & CustomerData>,
    [original],
  );

  // Parámetros de la rectificación — política fiscal FIJA:
  //   · Tipo: siempre SUSTITUCIÓN (la rectificativa reemplaza y anula la
  //     original). Es el camino limpio y el único que usamos; "Por
  //     diferencias" complica la cadena hash sin aportar valor real.
  //   · Código AEAT: siempre R1 (error fundado en derecho). Los otros
  //     códigos (R2/R3/R4/R5) aplican a supuestos que no se dan en el
  //     negocio — mantenerlos en la UI invita a seleccionarlos por error.
  // Ambos quedan visibles en la UI pero deshabilitados para que el admin
  // entienda qué se va a emitir, sin posibilidad de cambiarlo.
  const correctionType = CorrectionType.SUSTITUCION;
  const reasonCode: CorrectionData["reasonCode"] = "R1";
  const [reason, setReason] = useState("");

  // Cliente (prefill desde factura original vía lazy initializer)
  const [clientName, setClientName] = useState(() => recipient.name ?? "");
  const [clientTaxId, setClientTaxId] = useState(() => recipient.taxId ?? "");
  const [clientTaxIdType, setClientTaxIdType] = useState<TaxIdType>(
    () => (recipient.taxIdType as TaxIdType | undefined) ?? TaxIdType.NIF,
  );
  const [clientEmail, setClientEmail] = useState(() => recipient.email ?? "");
  const [clientPhone, setClientPhone] = useState(() => recipient.phone ?? "");
  const [clientStreet, setClientStreet] = useState(
    () => recipient.address?.street ?? "",
  );
  const [clientCity, setClientCity] = useState(
    () => recipient.address?.city ?? "",
  );
  const [clientPostal, setClientPostal] = useState(
    () => recipient.address?.postalCode ?? "",
  );
  const [clientProvince, setClientProvince] = useState(
    () => recipient.address?.province ?? "",
  );
  // País y método de pago se heredan de la factura original (no editables aquí:
  // si hace falta cambiarlos, se anula y se emite una nueva — no es rectificativa).
  const [clientCountryCode] = useState(
    () =>
      recipient.address?.countryCode ?? recipient.countryCode ?? "ES",
  );
  const [paymentMethod] = useState<PaymentMethod>(
    () => original?.paymentMethod ?? PaymentMethod.TARJETA,
  );

  // Líneas
  const [lines, setLines] = useState<DraftLine[]>(() =>
    original ? linesFromInvoice(original) : [],
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Helpers de líneas
  const addLine = useCallback(() => {
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
      },
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLine = useCallback(
    (id: string, patch: Partial<Omit<DraftLine, "id">>) => {
      setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [],
  );

  // Totales de la RECTIFICATIVA (lo que realmente se va a emitir).
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

  // Validación + abrir preview
  function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!original) {
      setError("No se pudo cargar la factura original.");
      return;
    }
    if (!reason.trim()) {
      setError("El motivo de la rectificación es obligatorio.");
      return;
    }
    const activeLines = lines.filter((l) => l.description.trim());
    if (activeLines.length === 0) {
      setError("La rectificativa debe tener al menos una línea con descripción.");
      return;
    }

    // Validación legal (Art. 6.1 RD 1619/2012) — las rectificativas completas
    // mantienen los mismos requisitos que la factura normal.
    if (original.invoiceType === InvoiceType.COMPLETA) {
      const missing: string[] = [];
      if (!clientName.trim()) missing.push("Nombre / Razón social");
      if (!clientTaxId.trim()) missing.push("NIF / NIE / CIF");
      if (!clientStreet.trim()) missing.push("Dirección");
      if (!clientCity.trim()) missing.push("Ciudad");
      if (!clientPostal.trim()) missing.push("Código postal");
      if (!clientProvince.trim()) missing.push("Provincia");
      if (missing.length > 0) {
        setError(
          `Faltan campos obligatorios (Art. 6.1 RD 1619/2012): ${missing.join(", ")}.`,
        );
        return;
      }
      if (clientCountryCode === "ES") {
        const v = validateSpanishNIF(clientTaxId.trim());
        if (!v.valid) {
          setError(`NIF/NIE/CIF no válido: ${v.error ?? "formato incorrecto"}`);
          return;
        }
      }
    }

    setShowPreview(true);
  }

  async function confirmAndCreate() {
    if (!original) return;
    setError(null);
    setSaving(true);
    try {
      const activeLines = lines.filter((l) => l.description.trim());
      const items: InvoiceLineItem[] = activeLines.map((l, i) =>
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
      if (original.invoiceType === InvoiceType.COMPLETA) {
        recipient = {
          name: clientName,
          taxId: clientTaxId,
          taxIdType: clientTaxIdType,
          address: {
            street: clientStreet,
            city: clientCity,
            postalCode: clientPostal,
            province: clientProvince,
            country: clientCountryCode === "ES" ? "España" : clientCountryCode,
            countryCode: clientCountryCode,
          },
          phone: clientPhone,
          email: clientEmail,
          isEU: clientCountryCode !== "ES" && /^[A-Z]{2}$/.test(clientCountryCode),
          countryCode: clientCountryCode,
        } satisfies CompanyData;
      } else {
        recipient = {
          name: clientName || "Cliente particular",
          taxId: clientTaxId || undefined,
          email: clientEmail || undefined,
          phone: clientPhone || undefined,
          countryCode: clientCountryCode,
        } satisfies CustomerData;
      }

      const correctionData: CorrectionData = {
        originalInvoiceId: original.invoiceId,
        originalInvoiceNumber: original.invoiceNumber,
        originalInvoiceDate: new Date(original.invoiceDate),
        correctionType,
        reason: reason.trim(),
        reasonCode,
      };

      await rectifyInvoice(original.invoiceId, {
        recipient,
        items,
        paymentMethod,
        correctionData,
        userId: user?.id,
        userName: user?.name ?? user?.email,
      });

      setSaved(true);
      setTimeout(() => router.push("/admin/fiscal/facturas"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rectificar la factura");
      setSaving(false);
      setShowPreview(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (notFound || !original) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <FileWarning size={40} className="mx-auto mb-3 text-red-400" />
        <p className="font-semibold text-gray-800">Factura no encontrada</p>
        <p className="mt-1 text-sm text-gray-500">
          La factura con ID <code className="rounded bg-gray-100 px-1">{invoiceId}</code> no existe en el libro.
        </p>
        <Link
          href="/admin/fiscal/facturas"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <ArrowLeft size={14} /> Volver al libro
        </Link>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <CheckCircle2 size={48} className="text-green-500" />
        <p className="text-xl font-bold text-gray-800">Rectificativa creada correctamente</p>
        <p className="text-sm text-gray-500">
          {correctionType === CorrectionType.SUSTITUCION
            ? "La factura original ha sido anulada. Redirigiendo…"
            : "La factura original sigue vigente. Redirigiendo…"}
        </p>
      </div>
    );
  }

  const isSubstitution = correctionType === CorrectionType.SUSTITUCION;

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
          Rectificar factura{" "}
          <span className="font-mono text-blue-600">{original.invoiceNumber}</span>
        </h1>
      </div>

      {/* Resumen factura original */}
      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-sm">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
          Factura original
        </p>
        <div className="grid grid-cols-1 gap-2 text-gray-700 sm:grid-cols-4">
          <div>
            <span className="text-xs text-gray-500">Nº</span>{" "}
            <span className="font-mono font-semibold">{original.invoiceNumber}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500">Fecha</span>{" "}
            {new Date(original.invoiceDate).toLocaleDateString("es-ES")}
          </div>
          <div>
            <span className="text-xs text-gray-500">Total</span>{" "}
            <span className="font-semibold">
              {original.totals.totalInvoice.toFixed(2)} €
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-500">Tipo</span>{" "}
            <span className="capitalize">{original.invoiceType}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handlePreview} className="space-y-6">
        {/* — Motivo y tipo de rectificación ─────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <AlertTriangle size={15} /> Motivo de la rectificación
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Código AEAT<span className="text-red-500"> *</span>
              </label>
              <select
                value={reasonCode}
                disabled
                aria-disabled
                title="Fijo por política fiscal — todas las rectificativas se emiten con R1."
                className="h-9 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700"
              >
                <option value="R1">
                  {REASON_CODES.find((r) => r.code === "R1")?.label}
                </option>
              </select>
              <p className="mt-1 text-[11px] text-gray-400">
                {REASON_CODES.find((r) => r.code === reasonCode)?.hint}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tipo de corrección<span className="text-red-500"> *</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled
                  aria-disabled
                  aria-pressed="true"
                  title="Fijo por política fiscal — todas las rectificativas son por sustitución."
                  className="cursor-not-allowed rounded-lg border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                >
                  Por sustitución
                </button>
                <button
                  type="button"
                  disabled
                  aria-disabled
                  aria-pressed="false"
                  title="Deshabilitado — política fiscal fija en sustitución."
                  className="cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400"
                >
                  Por diferencias
                </button>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                La rectificativa reemplaza la original. La original se ANULA.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Descripción del motivo<span className="text-red-500"> *</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explica el motivo de la rectificación (se guarda en el libro y se envía a AEAT)."
                rows={2}
                required
                aria-required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* — Cliente (prefilled) ────────────────────────────────────────── */}
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
                  NIF / NIE / CIF
                </label>
                <input
                  type="text"
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value.toUpperCase())}
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
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Teléfono</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Dirección</label>
              <input
                type="text"
                value={clientStreet}
                onChange={(e) => setClientStreet(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Ciudad</label>
              <input
                type="text"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
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
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Provincia</label>
                <input
                  type="text"
                  value={clientProvince}
                  onChange={(e) => setClientProvince(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* — Líneas rectificadas ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            Líneas rectificadas
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            {isSubstitution
              ? "Edita las líneas con los valores correctos. La rectificativa contendrá estos importes completos."
              : "Introduce sólo la diferencia: importes positivos para añadir, negativos para restar de la original."}
          </p>

          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center text-xs text-gray-500">
              No hay líneas. Añade al menos una línea manual.
            </div>
          ) : (
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
                            className="h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-blue-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.id, {
                                quantity: Number(e.target.value),
                              })
                            }
                            className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <input
                            type="number"
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
                            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-300 transition hover:bg-red-50 hover:text-red-500"
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
          )}

          <button
            type="button"
            onClick={addLine}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <Plus size={13} /> Añadir línea manual
          </button>
        </div>

        {/* — Totales ─────────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <div className="w-72 rounded-2xl border border-gray-200 bg-white p-4 text-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Totales de la rectificativa
            </p>
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

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
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
            <Eye size={15} />
            Previsualizar rectificativa
          </button>
        </div>
      </form>

      {/* — Modal de previsualización ─────────────────────────────────────── */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Eye size={16} className="text-blue-600" /> Previsualización rectificativa
              </h3>
              <button
                type="button"
                onClick={() => !saving && setShowPreview(false)}
                disabled={saving}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">
                  {isSubstitution
                    ? "Al confirmar, la factura original se ANULARÁ."
                    : "La factura original permanecerá VIGENTE."}
                </p>
                <p className="mt-1">
                  Motivo {reasonCode}: {reason}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Factura original
                  </p>
                  <p className="mt-1 font-mono text-gray-800">
                    {original.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(original.invoiceDate).toLocaleDateString("es-ES")} ·{" "}
                    {original.totals.totalInvoice.toFixed(2)} €
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Cliente
                  </p>
                  <p className="mt-1 text-gray-800">{clientName || "—"}</p>
                  <p className="text-xs text-gray-500">
                    {clientTaxId || "—"}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                      <th className="px-2 py-2 w-12 text-center font-semibold">Cant.</th>
                      <th className="px-2 py-2 w-20 text-right font-semibold">Precio</th>
                      <th className="px-2 py-2 w-16 text-center font-semibold">IVA</th>
                      <th className="px-3 py-2 w-24 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines
                      .filter((l) => l.description.trim())
                      .map((l) => {
                        const c = calcLine(l);
                        return (
                          <tr key={l.id}>
                            <td className="px-3 py-2 text-gray-800">{l.description}</td>
                            <td className="px-2 py-2 text-center text-gray-600">{l.quantity}</td>
                            <td className="px-2 py-2 text-right text-gray-600">
                              {l.unitPriceWithVAT.toFixed(2)} €
                            </td>
                            <td className="px-2 py-2 text-center text-gray-600">{l.vatRate}%</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800">
                              {c.total.toFixed(2)} €
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Base imponible</span>
                    <span>{totals.base.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-500">
                    <span>IVA</span>
                    <span>{totals.vat.toFixed(2)} €</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-gray-200 pt-1.5 text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span>{totals.total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ArrowLeft size={15} /> Volver a editar
              </button>
              <button
                type="button"
                onClick={confirmAndCreate}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle2 size={15} />
                {saving ? "Creando…" : "Confirmar y rectificar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
