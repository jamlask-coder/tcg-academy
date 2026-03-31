"use client";
import { useState, useMemo } from "react";
import { Download, FileText, Euro, TrendingUp, Calendar } from "lucide-react";
import { MOCK_ORDERS } from "@/data/mockData";
import { IVA_GENERAL, calcVAT } from "@/hooks/usePrice";
import {
  printInvoice,
  buildInvoiceFromOrder,
  generateInvoiceNumber,
} from "@/utils/invoiceGenerator";

interface AnyOrder {
  id: string;
  date: string;
  total: number;
  items: { name: string; quantity?: number; qty?: number; price: number }[];
  shipping?: number;
  couponDiscount?: number;
  pointsDiscount?: number;
  coupon?: { code: string } | null;
  shippingAddress?: Record<string, string>;
  pago?: string;
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

export default function AdminFiscalPage() {
  const [localOrders] = useState<AnyOrder[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("tcgacademy_orders")
          : null;
      return raw ? (JSON.parse(raw) as AnyOrder[]) : [];
    } catch {
      return [];
    }
  });
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [quarterFilter, setQuarterFilter] = useState<number | "all">("all");

  const allOrders: AnyOrder[] = useMemo(() => {
    const mock = MOCK_ORDERS.map((o) => ({
      ...o,
      date: o.date,
      items: o.items.map((i) => ({
        name: i.name,
        quantity: i.qty ?? 1,
        price: i.price,
      })),
    }));
    return [...localOrders, ...mock];
  }, [localOrders]);

  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
      const d = new Date(o.date);
      if (isNaN(d.getTime())) return true; // mock orders with non-ISO dates
      const y = d.getFullYear();
      const q = getQuarter(d);
      if (y !== yearFilter) return false;
      if (quarterFilter !== "all" && q !== quarterFilter) return false;
      return true;
    });
  }, [allOrders, yearFilter, quarterFilter]);

  // Fiscal calculations
  const fiscalData = useMemo(() => {
    let baseImponible = 0;
    let ivaRepercutido = 0;
    let totalFacturado = 0;

    for (const o of filtered) {
      const total = o.total;
      const { priceWithoutVAT, vatAmount } = calcVAT(total, IVA_GENERAL);
      baseImponible += priceWithoutVAT;
      ivaRepercutido += vatAmount;
      totalFacturado += total;
    }

    return {
      baseImponible,
      ivaRepercutido,
      totalFacturado,
      count: filtered.length,
    };
  }, [filtered]);

  // By quarter breakdown
  const byQuarter = useMemo(() => {
    const q: Record<
      number,
      { base: number; iva: number; total: number; count: number }
    > = {
      1: { base: 0, iva: 0, total: 0, count: 0 },
      2: { base: 0, iva: 0, total: 0, count: 0 },
      3: { base: 0, iva: 0, total: 0, count: 0 },
      4: { base: 0, iva: 0, total: 0, count: 0 },
    };
    for (const o of allOrders.filter((o) => {
      const d = new Date(o.date);
      return !isNaN(d.getTime()) && d.getFullYear() === yearFilter;
    })) {
      const quarter = getQuarter(new Date(o.date));
      const { priceWithoutVAT, vatAmount } = calcVAT(o.total, IVA_GENERAL);
      q[quarter].base += priceWithoutVAT;
      q[quarter].iva += vatAmount;
      q[quarter].total += o.total;
      q[quarter].count++;
    }
    return q;
  }, [allOrders, yearFilter]);

  const exportCSV = () => {
    const rows = [
      [
        "Nº Factura",
        "Fecha",
        "Cliente",
        "Base Imponible",
        "IVA (21%)",
        "Total",
        "Forma Pago",
      ],
      ...filtered.map((o) => {
        const { priceWithoutVAT, vatAmount } = calcVAT(o.total, IVA_GENERAL);
        const inv = generateInvoiceNumber(o.id);
        const addr = o.shippingAddress ?? {};
        return [
          inv,
          new Date(o.date).toLocaleDateString("es-ES"),
          `${addr.nombre ?? ""} ${addr.apellidos ?? ""}`.trim() || "Cliente",
          priceWithoutVAT.toFixed(2),
          vatAmount.toFixed(2),
          o.total.toFixed(2),
          o.pago ?? "-",
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturas_${yearFilter}${quarterFilter !== "all" ? `_T${quarterFilter}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintInvoice = (order: AnyOrder) => {
    const invNum = generateInvoiceNumber(order.id);
    const data = buildInvoiceFromOrder(order, invNum);
    printInvoice(data);
  };

  const QUARTER_LABELS = [
    "T1 (Ene-Mar)",
    "T2 (Abr-Jun)",
    "T3 (Jul-Sep)",
    "T4 (Oct-Dic)",
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión Fiscal</h1>
        <p className="mt-1 text-sm text-gray-500">
          Informes de IVA repercutido — Modelo 303 — Real Decreto 1619/2012
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#1a3a5c] focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <select
          value={quarterFilter}
          onChange={(e) =>
            setQuarterFilter(
              e.target.value === "all" ? "all" : Number(e.target.value),
            )
          }
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#1a3a5c] focus:outline-none"
        >
          <option value="all">Todos los trimestres</option>
          <option value={1}>T1 (Ene-Mar)</option>
          <option value={2}>T2 (Abr-Jun)</option>
          <option value={3}>T3 (Jul-Sep)</option>
          <option value={4}>T4 (Oct-Dic)</option>
        </select>
        <button
          onClick={exportCSV}
          className="ml-auto flex h-9 items-center gap-2 rounded-lg bg-[#1a3a5c] px-4 text-sm font-semibold text-white transition hover:bg-[#15304d]"
        >
          <Download size={15} /> Exportar CSV (Modelo 303)
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Base imponible",
            value: `${fiscalData.baseImponible.toFixed(2)} €`,
            icon: Euro,
            color: "#1a3a5c",
          },
          {
            label: "IVA repercutido (21%)",
            value: `${fiscalData.ivaRepercutido.toFixed(2)} €`,
            icon: TrendingUp,
            color: "#dc2626",
          },
          {
            label: "Total facturado",
            value: `${fiscalData.totalFacturado.toFixed(2)} €`,
            icon: FileText,
            color: "#16a34a",
          },
          {
            label: "Nº de facturas",
            value: String(fiscalData.count),
            icon: FileText,
            color: "#d97706",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon size={16} style={{ color }} />
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Quarterly breakdown */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-bold text-gray-900">
          Resumen por trimestres — {yearFilter}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs tracking-wide text-gray-500 uppercase">
                <th className="pb-3 text-left font-semibold">Trimestre</th>
                <th className="pb-3 text-right font-semibold">Nº Facturas</th>
                <th className="pb-3 text-right font-semibold">
                  Base Imponible
                </th>
                <th className="pb-3 text-right font-semibold">IVA (21%)</th>
                <th className="pb-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((q) => (
                <tr key={q} className="border-b border-gray-50">
                  <td className="py-3 font-semibold text-gray-700">
                    {QUARTER_LABELS[q - 1]}
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {byQuarter[q].count}
                  </td>
                  <td className="py-3 text-right text-gray-800">
                    {byQuarter[q].base.toFixed(2)} €
                  </td>
                  <td className="py-3 text-right font-medium text-red-600">
                    {byQuarter[q].iva.toFixed(2)} €
                  </td>
                  <td className="py-3 text-right font-bold text-gray-900">
                    {byQuarter[q].total.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice list */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">
            Listado de facturas ({filtered.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                <th className="px-6 py-3 text-left font-semibold">
                  Nº Factura
                </th>
                <th className="px-4 py-3 text-left font-semibold">Pedido</th>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Base Imp.
                </th>
                <th className="px-4 py-3 text-right font-semibold">IVA 21%</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-center font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o) => {
                const { priceWithoutVAT, vatAmount } = calcVAT(
                  o.total,
                  IVA_GENERAL,
                );
                const invNum = generateInvoiceNumber(o.id);
                const dateStr = (() => {
                  const d = new Date(o.date);
                  return isNaN(d.getTime())
                    ? o.date
                    : d.toLocaleDateString("es-ES");
                })();
                return (
                  <tr key={o.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs font-bold text-[#1a3a5c]">
                      {invNum}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{o.id}</td>
                    <td className="px-4 py-3 text-gray-600">{dateStr}</td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      {priceWithoutVAT.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {vatAmount.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {o.total.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handlePrintInvoice(o)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#1a3a5c]/20 px-2.5 py-1.5 text-xs font-semibold text-[#1a3a5c] transition hover:bg-blue-50"
                      >
                        <FileText size={12} /> PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
