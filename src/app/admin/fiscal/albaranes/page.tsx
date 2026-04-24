"use client";
/**
 * Libro de albaranes.
 *
 * Vista administrativa de los documentos de entrega (DeliveryNoteRecord).
 * A diferencia del libro de facturas:
 *  - NO hay cadena VeriFactu ni estados AEAT (enviada/verificada/rechazada).
 *  - NO entra en modelos 303/390/349.
 *  - Hay 3 estados: pendiente / facturado / anulado.
 *  - Acción principal: "Facturar" — convierte el albarán en factura real
 *    llamando a `convertToInvoice()` (dispara el pipeline fiscal completo).
 */
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Printer,
  Search,
  Truck,
  FileCheck2,
  XCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  loadDeliveryNotes,
  convertToInvoice,
  annulDeliveryNote,
} from "@/services/deliveryNoteService";
import { DeliveryNoteStatus } from "@/types/fiscal";
import type { DeliveryNoteRecord } from "@/types/fiscal";
import { printInvoice } from "@/utils/invoiceGenerator";
import type { InvoiceData } from "@/utils/invoiceGenerator";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";
import { DataHub } from "@/lib/dataHub";
import { formatDateShort as formatDate } from "@/lib/format";

type StatusFilter = DeliveryNoteStatus | "all";
type SortKey = "deliveryNoteNumber" | "deliveryNoteDate" | "total";

function statusBadge(status: DeliveryNoteStatus) {
  const map: Record<DeliveryNoteStatus, { label: string; cls: string }> = {
    [DeliveryNoteStatus.PENDIENTE]: {
      label: "Pendiente",
      cls: "bg-amber-100 text-amber-800",
    },
    [DeliveryNoteStatus.FACTURADO]: {
      label: "Facturado",
      cls: "bg-green-100 text-green-800",
    },
    [DeliveryNoteStatus.ANULADO]: {
      label: "Anulado",
      cls: "bg-red-100 text-red-700",
    },
  };
  const { label, cls } = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function LibroAlbaranesPage() {
  const [notes, setNotes] = useState<DeliveryNoteRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("deliveryNoteDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [confirmConvert, setConfirmConvert] =
    useState<DeliveryNoteRecord | null>(null);
  const [confirmAnnul, setConfirmAnnul] =
    useState<DeliveryNoteRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => setNotes(loadDeliveryNotes());

  useEffect(() => {
    reload();
    return DataHub.on("deliveryNotes", reload);
  }, []);

  const filtered = useMemo(() => {
    let list = notes;
    if (statusFilter !== "all")
      list = list.filter((n) => n.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((n) => {
        const recipient = n.recipient as { name?: string; taxId?: string };
        return (
          n.deliveryNoteNumber.toLowerCase().includes(q) ||
          (recipient.name ?? "").toLowerCase().includes(q) ||
          (recipient.taxId ?? "").toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "deliveryNoteNumber")
        cmp = a.deliveryNoteNumber.localeCompare(b.deliveryNoteNumber);
      else if (sortKey === "deliveryNoteDate")
        cmp =
          new Date(a.deliveryNoteDate).getTime() -
          new Date(b.deliveryNoteDate).getTime();
      else cmp = a.totals.totalInvoice - b.totals.totalInvoice;
      return sortAsc ? cmp : -cmp;
    });
  }, [notes, statusFilter, query, sortKey, sortAsc]);

  const counts = useMemo(() => {
    return {
      all: notes.length,
      pendiente: notes.filter((n) => n.status === DeliveryNoteStatus.PENDIENTE)
        .length,
      facturado: notes.filter((n) => n.status === DeliveryNoteStatus.FACTURADO)
        .length,
      anulado: notes.filter((n) => n.status === DeliveryNoteStatus.ANULADO)
        .length,
    };
  }, [notes]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function downloadPDF(dn: DeliveryNoteRecord) {
    const recipient = dn.recipient as {
      name?: string;
      taxId?: string;
      address?: {
        street?: string;
        postalCode?: string;
        city?: string;
        province?: string;
        country?: string;
      };
      email?: string;
      phone?: string;
      isEU?: boolean;
    };
    const addr = recipient.address;
    const issuer = getIssuerAddress();
    const issuerAddress = issuer.street || SITE_CONFIG.address;
    const issuerCity = issuer.cityLine;
    const data: InvoiceData = {
      invoiceNumber: dn.deliveryNoteNumber,
      orderId: dn.sourceOrderId ?? undefined,
      date: new Date(dn.deliveryNoteDate).toISOString(),
      paymentMethod: dn.paymentMethod,
      issuerName: SITE_CONFIG.legalName,
      issuerCIF: SITE_CONFIG.cif,
      issuerAddress,
      issuerCity,
      issuerPhone: SITE_CONFIG.phone,
      issuerEmail: SITE_CONFIG.email,
      clientName: recipient.name ?? "—",
      clientCIF: recipient.taxId,
      clientAddress: addr?.street,
      clientCity: addr
        ? `${addr.postalCode ?? ""} ${addr.city ?? ""}`.trim()
        : undefined,
      clientProvince: addr?.province,
      clientCountry: addr?.country ?? "España",
      intracomunitario: !!recipient.isEU,
      items: dn.items.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        unitPriceWithVAT: item.totalLine / item.quantity,
        vatRate: item.vatRate,
      })),
      isDeliveryNote: true,
    };
    void printInvoice(data);
  }

  async function handleConvert() {
    if (!confirmConvert) return;
    setError(null);
    setBusyId(confirmConvert.deliveryNoteId);
    try {
      const invoice = await convertToInvoice(confirmConvert.deliveryNoteId);
      setConfirmConvert(null);
      reload();
      // Pequeño feedback: abrimos la factura recién creada.
      setTimeout(() => {
        alert(
          `Albarán facturado correctamente.\nFactura emitida: ${invoice.invoiceNumber}`,
        );
      }, 50);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al facturar el albarán",
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleAnnul() {
    if (!confirmAnnul) return;
    setError(null);
    try {
      annulDeliveryNote(
        confirmAnnul.deliveryNoteId,
        "Anulado desde libro de albaranes",
      );
      setConfirmAnnul(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al anular");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/fiscal"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={15} /> Facturación
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Truck size={20} className="text-blue-600" /> Libro de albaranes
          </h1>
        </div>
        <Link
          href="/admin/fiscal/nuevo-albaran"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={15} /> Emitir albarán
        </Link>
      </div>

      <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <strong>Recordatorio:</strong> los albaranes son documentos de entrega
        — no se envían a la AEAT ni entran en la cadena VeriFactu. Para
        convertir un albarán en factura real pulsa <strong>Facturar</strong> en
        la acción correspondiente.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `Todos (${counts.all})`],
            [DeliveryNoteStatus.PENDIENTE, `Pendientes (${counts.pendiente})`],
            [DeliveryNoteStatus.FACTURADO, `Facturados (${counts.facturado})`],
            [DeliveryNoteStatus.ANULADO, `Anulados (${counts.anulado})`],
          ] as Array<[StatusFilter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número, cliente o NIF…"
            className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold"
                onClick={() => toggleSort("deliveryNoteNumber")}
              >
                Nº albarán
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold"
                onClick={() => toggleSort("deliveryNoteDate")}
              >
                Fecha
              </th>
              <th className="px-3 py-3 text-left font-semibold">Cliente</th>
              <th className="px-3 py-3 text-left font-semibold">NIF</th>
              <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                Base
              </th>
              <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                IVA
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold whitespace-nowrap"
                onClick={() => toggleSort("total")}
              >
                Total
              </th>
              <th className="px-3 py-3 text-center font-semibold">Estado</th>
              <th className="px-3 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-gray-400">
                  <Truck size={24} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {notes.length === 0
                      ? "Aún no hay albaranes emitidos."
                      : "Sin resultados con los filtros actuales."}
                  </p>
                  {notes.length === 0 && (
                    <Link
                      href="/admin/fiscal/nuevo-albaran"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={13} /> Crear el primer albarán
                    </Link>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((dn) => {
                const r = dn.recipient as { name?: string; taxId?: string };
                const isPendiente = dn.status === DeliveryNoteStatus.PENDIENTE;
                const isBusy = busyId === dn.deliveryNoteId;
                return (
                  <tr
                    key={dn.deliveryNoteId}
                    className="hover:bg-gray-50/60"
                  >
                    <td className="px-3 py-3 font-mono text-xs text-gray-800">
                      {dn.deliveryNoteNumber}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(new Date(dn.deliveryNoteDate))}
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      {r.name ?? "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-600">
                      {r.taxId ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-gray-700">
                      {dn.totals.totalTaxableBase.toFixed(2)}&nbsp;€
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-gray-700">
                      {dn.totals.totalVAT.toFixed(2)}&nbsp;€
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums font-bold text-gray-900">
                      {dn.totals.totalInvoice.toFixed(2)}&nbsp;€
                    </td>
                    <td className="px-3 py-3 text-center">
                      {statusBadge(dn.status)}
                      {dn.status === DeliveryNoteStatus.FACTURADO &&
                        dn.invoiceNumber && (
                          <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-gray-500">
                            <ExternalLink size={10} />
                            <span className="font-mono">
                              {dn.invoiceNumber.replace(/^FAC-/, "")}
                            </span>
                          </p>
                        )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => downloadPDF(dn)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Ver PDF del albarán"
                          title="Ver PDF"
                        >
                          <Printer size={14} />
                        </button>
                        {isPendiente && (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirmConvert(dn)}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-40"
                              title="Facturar: convierte en factura real (VeriFactu)"
                            >
                              {isBusy ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <FileCheck2 size={12} />
                              )}
                              Facturar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmAnnul(dn)}
                              disabled={isBusy}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              aria-label="Anular albarán"
                              title="Anular albarán"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {confirmConvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="convert-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3
                id="convert-title"
                className="flex items-center gap-2 text-base font-bold text-gray-900"
              >
                <FileCheck2 size={16} className="text-green-600" />
                Convertir albarán en factura
              </h3>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700">
              <p className="mb-3">
                Vas a facturar el albarán{" "}
                <strong className="font-mono">
                  {confirmConvert.deliveryNoteNumber}
                </strong>{" "}
                por un total de{" "}
                <strong>
                  {confirmConvert.totals.totalInvoice.toFixed(2)} €
                </strong>
                .
              </p>
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Esta acción <strong>sí</strong> emite una factura real:
                cadena VeriFactu, libro fiscal y asiento contable. El albarán
                original queda marcado como <strong>facturado</strong> con el
                número de la factura generada.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmConvert(null)}
                disabled={busyId !== null}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={busyId !== null}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {busyId ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileCheck2 size={14} />
                )}
                Confirmar y facturar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAnnul && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="annul-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3
                id="annul-title"
                className="flex items-center gap-2 text-base font-bold text-gray-900"
              >
                <XCircle size={16} className="text-red-600" />
                Anular albarán
              </h3>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700">
              <p>
                ¿Seguro que quieres anular el albarán{" "}
                <strong className="font-mono">
                  {confirmAnnul.deliveryNoteNumber}
                </strong>
                ? Una vez anulado no se podrá facturar.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmAnnul(null)}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnnul}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <XCircle size={14} />
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
