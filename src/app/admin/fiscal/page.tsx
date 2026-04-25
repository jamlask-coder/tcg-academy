"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Euro,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  BarChart2,
  Globe,
  BookOpen,
  Download,
  Plus,
  Palette,
  Settings,
  ListChecks,
  Circle,
  RotateCcw,
  Trash2,
  Truck,
  LayoutDashboard,
  Banknote,
} from "lucide-react";
import { loadInvoices } from "@/services/invoiceService";
import {
  generateQuarterlyReport,
  getTaxPeriod,
  getQuarter,
} from "@/services/taxService";
import { VerifactuStatus, InvoiceStatus } from "@/types/fiscal";
import { VERIFACTU_CONFIG } from "@/config/verifactuConfig";
import type { Quarter } from "@/types/tax";
import {
  loadFiscalConfig,
  seedKnownStateIfMissing,
  resolvePendingTask,
  reopenPendingTask,
  deletePendingTask,
} from "@/services/fiscalConfigService";
import type { PendingFiscalTask } from "@/types/fiscalConfig";
import { DataHub } from "@/lib/dataHub";

// ─── Nav cards ────────────────────────────────────────────────────────────────

const FISCAL_SECTIONS = [
  {
    href: "/admin/fiscal/nueva-factura",
    icon: Plus,
    title: "Nueva Factura Manual",
    desc: "Crea una factura manualmente con productos del catálogo",
    color: "#16a34a",
  },
  {
    href: "/admin/fiscal/facturas",
    icon: FileText,
    title: "Libro de Facturas",
    desc: "Todas las facturas emitidas con filtros y exportación",
    color: "#2563eb",
  },
  {
    href: "/admin/fiscal/proveedores",
    icon: Truck,
    title: "Facturas de Proveedores",
    desc: "Libro de compras: IVA soportado, retenciones 111/115 y gastos deducibles",
    color: "#475569",
  },
  {
    href: "/admin/fiscal/conciliacion",
    icon: Banknote,
    title: "Conciliación bancaria",
    desc: "Importa el extracto del banco y empareja cobros con pedidos / pagos con facturas",
    color: "#0891b2",
  },
  {
    href: "/admin/fiscal/contabilidad",
    icon: BookOpen,
    title: "Contabilidad PGC",
    desc: "Libro diario, sumas y saldos, pérdidas y ganancias, validación cruzada",
    color: "#0f766e",
  },
  {
    href: "/admin/fiscal/trimestral",
    icon: BarChart2,
    title: "Informe Trimestral",
    desc: "Modelo 303 — IVA repercutido por trimestre",
    color: "#16a34a",
  },
  {
    href: "/admin/fiscal/anual",
    icon: TrendingUp,
    title: "Informe Anual",
    desc: "Modelo 390 — Resumen anual del IVA",
    color: "#9333ea",
  },
  {
    href: "/admin/fiscal/anual-dashboard",
    icon: LayoutDashboard,
    title: "Dashboard Anual",
    desc: "Vista 360º del ejercicio: IVA, IS, retenciones, vinculadas y dividendos",
    color: "#0ea5e9",
  },
  {
    href: "/admin/fiscal/intracomunitario",
    icon: Globe,
    title: "Intracomunitario",
    desc: "Operaciones UE — Modelo 349",
    color: "#0284c7",
  },
  {
    href: "/admin/fiscal/calendario",
    icon: Calendar,
    title: "Calendario Fiscal",
    desc: "Obligaciones tributarias, plazos, instrucciones y alertas automáticas",
    color: "#7c3aed",
  },
  {
    href: "/admin/fiscal/configuracion",
    icon: Settings,
    title: "Configuración fiscal",
    desc: "Alquileres, dividendos, OSS, 720, vinculadas, método 202 — alimenta los borradores automáticos",
    color: "#0891b2",
  },
  {
    href: "/admin/fiscal/control",
    icon: AlertCircle,
    title: "Piloto Automático",
    desc: "Sistema autónomo: detecta, repara y verifica facturas sin intervención humana",
    color: "#dc2626",
  },
  {
    href: "/admin/fiscal/verifactu",
    icon: ShieldCheck,
    title: "Estado VeriFactu",
    desc: "Conexión AEAT, hashes e integridad de la cadena",
    color: "#d97706",
  },
  {
    href: "/admin/fiscal/editor-factura",
    icon: Palette,
    title: "Editor de Factura",
    desc: "Edita visualmente la plantilla: colores, márgenes, bloques, marca de agua",
    color: "#db2777",
  },
  {
    href: "/admin/fiscal/documentacion",
    icon: BookOpen,
    title: "Documentación",
    desc: "Guía fiscal: VeriFactu, gestoría, rectificativas",
    color: "#6b7280",
  },
];

// ─── Pending tasks helpers ────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<PendingFiscalTask["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_STYLES: Record<
  PendingFiscalTask["priority"],
  { dot: string; label: string; badge: string }
> = {
  urgent: {
    dot: "text-red-600",
    label: "URGENTE",
    badge: "bg-red-100 text-red-700",
  },
  high: {
    dot: "text-amber-600",
    label: "Alta",
    badge: "bg-amber-100 text-amber-800",
  },
  medium: {
    dot: "text-blue-600",
    label: "Media",
    badge: "bg-blue-100 text-blue-800",
  },
  low: {
    dot: "text-gray-400",
    label: "Baja",
    badge: "bg-gray-100 text-gray-700",
  },
};

function PendingTaskRow({
  task,
  onResolve,
  onDelete,
}: {
  task: PendingFiscalTask;
  onResolve: () => void;
  onDelete: () => void;
}) {
  const style = PRIORITY_STYLES[task.priority];
  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
      <button
        type="button"
        onClick={onResolve}
        className={`mt-0.5 flex-shrink-0 ${style.dot} hover:text-green-600`}
        aria-label="Marcar como resuelto"
        title="Marcar como resuelto"
      >
        <Circle size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${style.badge}`}>
            {style.label}
          </span>
        </div>
        {task.description && (
          <p className="mt-0.5 text-xs text-gray-600">{task.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="mt-0.5 text-gray-300 hover:text-red-500"
        aria-label="Eliminar"
        title="Eliminar"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminFiscalPage() {
  const [yearFilter] = useState(new Date().getFullYear());
  const [pendingTasks, setPendingTasks] = useState<PendingFiscalTask[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    seedKnownStateIfMissing();
    const reload = () => setPendingTasks(loadFiscalConfig().pendingTasks);
    reload();
    return DataHub.on("fiscal_config", reload);
  }, []);

  const openTasks = pendingTasks.filter((t) => !t.resolvedAt);
  const doneTasks = pendingTasks.filter((t) => !!t.resolvedAt);
  const urgentCount = openTasks.filter((t) => t.priority === "urgent").length;

  const invoices = useMemo(() => loadInvoices(), []);

  const currentQuarter = getQuarter(new Date().getMonth() + 1) as Quarter;
  const currentPeriod = getTaxPeriod(yearFilter, currentQuarter);
  const quarterSummary = useMemo(
    () => generateQuarterlyReport(invoices, yearFilter, currentQuarter),
    [invoices, yearFilter, currentQuarter],
  );

  // Alertas VeriFactu
  const pendingVerifactu = invoices.filter(
    (inv) => inv.verifactuStatus === VerifactuStatus.PENDIENTE,
  ).length;
  const rejectedVerifactu = invoices.filter(
    (inv) => inv.verifactuStatus === VerifactuStatus.RECHAZADA,
  ).length;
  const activeInvoices = invoices.filter(
    (inv) => inv.status !== InvoiceStatus.ANULADA,
  ).length;

  // Días hasta vencimiento del trimestre
  const daysUntilDue = Math.ceil(
    (currentPeriod.dueDate.getTime() - Date.now()) / 86400000,
  );

  const quarterLabel = `T${currentQuarter} ${yearFilter}`;

  // Exportar CSV rápido del trimestre actual
  const handleQuickExport = () => {
    import("@/services/taxService").then(({ generateCSVForAdvisor }) => {
      const csv = generateCSVForAdvisor(invoices, {
        period: currentPeriod,
        format: "CSV",
        includeLineItems: false,
        includeRecipientData: true,
        filterByVatRate: null,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facturas_T${currentQuarter}_${yearFilter}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión Fiscal</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sistema VeriFactu preparado — RD 1619/2012 · Ley 11/2021 · RD
            1007/2023
          </p>
        </div>
        <button
          onClick={handleQuickExport}
          className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
        >
          <Download size={15} /> Exportar {quarterLabel}
        </button>
      </div>

      {/* VeriFactu mode banner */}
      <div
        className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
          VERIFACTU_CONFIG.mode === "mock"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : VERIFACTU_CONFIG.mode === "sandbox"
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : "border-green-200 bg-green-50 text-green-800"
        }`}
      >
        <ShieldCheck size={16} />
        {VERIFACTU_CONFIG.mode === "mock" ? (
          <>
            <span>
              Modo Demo — Sin conexión real con AEAT. Las facturas se almacenan
              localmente y los hashes se calculan correctamente.
            </span>
            <Link
              href="/admin/fiscal/verifactu"
              className="ml-auto text-xs whitespace-nowrap underline"
            >
              Configurar proveedor →
            </Link>
          </>
        ) : VERIFACTU_CONFIG.mode === "sandbox" ? (
          <span>
            Modo Sandbox — Conectado al entorno de pruebas del proveedor
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            Producción — Conectado a AEAT mediante proveedor certificado
          </span>
        )}
      </div>

      {/* KPI Cards — trimestre actual */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: `Base imp. ${quarterLabel}`,
            value: `${quarterSummary.totalTaxableBase.toFixed(2)} €`,
            icon: Euro,
            color: "#2563eb",
          },
          {
            label: `IVA repercutido ${quarterLabel}`,
            value: `${quarterSummary.totalOutputVAT.toFixed(2)} €`,
            icon: TrendingUp,
            color: "#dc2626",
          },
          {
            label: `Facturas emitidas`,
            value: String(activeInvoices),
            icon: FileText,
            color: "#16a34a",
          },
          {
            label: `Pendientes VeriFactu`,
            value: String(pendingVerifactu),
            icon: Clock,
            color: pendingVerifactu > 0 ? "#d97706" : "#16a34a",
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

      {/* Alerts */}
      {(pendingVerifactu > 0 ||
        rejectedVerifactu > 0 ||
        daysUntilDue <= 14) && (
        <div className="mb-6 space-y-2">
          {daysUntilDue <= 14 && daysUntilDue > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Calendar size={15} />
              <span>
                Vencimiento modelo 303 {quarterLabel}: queda
                {daysUntilDue === 1 ? " 1 día" : ` ${daysUntilDue} días`} (
                {currentPeriod.dueDate.toLocaleDateString("es-ES")})
              </span>
            </div>
          )}
          {pendingVerifactu > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={15} />
              <span>
                {pendingVerifactu} factura
                {pendingVerifactu !== 1 ? "s" : ""} pendiente
                {pendingVerifactu !== 1 ? "s" : ""} de envío a VeriFactu
              </span>
              <Link
                href="/admin/fiscal/verifactu"
                className="ml-auto text-xs font-semibold underline"
              >
                Ver →
              </Link>
            </div>
          )}
          {rejectedVerifactu > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle size={15} />
              <span>
                {rejectedVerifactu} factura
                {rejectedVerifactu !== 1 ? "s" : ""} rechazada
                {rejectedVerifactu !== 1 ? "s" : ""} por VeriFactu — requieren
                atención
              </span>
              <Link
                href="/admin/fiscal/verifactu"
                className="ml-auto text-xs font-semibold underline"
              >
                Ver →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Datos fiscales pendientes */}
      {pendingTasks.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks size={18} className="text-[#0891b2]" />
              <h2 className="font-bold text-gray-900">
                Datos fiscales pendientes
              </h2>
              {urgentCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {doneTasks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="text-xs font-semibold text-gray-500 underline"
              >
                {showCompleted ? "Ocultar" : "Mostrar"} {doneTasks.length} resueltos
              </button>
            )}
          </div>

          {openTasks.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay datos pendientes. Buen trabajo.
            </p>
          ) : (
            <ul className="space-y-2">
              {openTasks
                .slice()
                .sort(
                  (a, b) =>
                    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
                )
                .map((t) => (
                  <PendingTaskRow
                    key={t.id}
                    task={t}
                    onResolve={() => resolvePendingTask(t.id)}
                    onDelete={() => deletePendingTask(t.id)}
                  />
                ))}
            </ul>
          )}

          {showCompleted && doneTasks.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {doneTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 flex-shrink-0 text-green-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-700 line-through">
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => reopenPendingTask(t.id)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                    aria-label="Reabrir"
                    title="Reabrir"
                  >
                    <RotateCcw size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Section navigation grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FISCAL_SECTIONS.map(({ href, icon: Icon, title, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
            </div>
            <ChevronRight
              size={16}
              className="mt-0.5 flex-shrink-0 text-gray-300 transition group-hover:text-gray-500"
            />
          </Link>
        ))}
      </div>

      {/* VAT breakdown for current quarter */}
      {quarterSummary.outputVAT.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-bold text-gray-900">
            Desglose IVA — {quarterLabel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs tracking-wide text-gray-500 uppercase">
                  <th className="pb-3 text-left font-semibold">Tipo IVA</th>
                  <th className="pb-3 text-right font-semibold">
                    Base Imponible
                  </th>
                  <th className="pb-3 text-right font-semibold">Cuota IVA</th>
                  <th className="pb-3 text-right font-semibold">Facturas</th>
                </tr>
              </thead>
              <tbody>
                {quarterSummary.outputVAT.map((row) => (
                  <tr
                    key={row.vatRate}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="py-3 font-semibold text-gray-700">
                      {row.vatRate}%
                    </td>
                    <td className="py-3 text-right text-gray-800">
                      {row.taxableBase.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right font-medium text-red-600">
                      {row.vatAmount.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {row.invoiceCount}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold text-gray-900">
                  <td className="pt-3">Total</td>
                  <td className="pt-3 text-right">
                    {quarterSummary.totalTaxableBase.toFixed(2)} €
                  </td>
                  <td className="pt-3 text-right text-red-700">
                    {quarterSummary.totalOutputVAT.toFixed(2)} €
                  </td>
                  <td className="pt-3 text-right text-gray-500">
                    {quarterSummary.invoiceCount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoices.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">
            No hay facturas registradas
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Las facturas se generan automáticamente al confirmar pedidos.
          </p>
        </div>
      )}
    </div>
  );
}
