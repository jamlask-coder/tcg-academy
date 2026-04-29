"use client";
import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  ChevronDown,
  Zap,
  Eye,
  Lock,
} from "lucide-react";
import {
  runFiscalAutopilot,
  loadAutopilotLog,
  exportAutopilotCSV,
  type AutopilotReport,
  type AutopilotAction,
} from "@/lib/fiscalAutopilot";
import { exportReconciliationCSV } from "@/lib/fiscalAudit";
import { exportIssuesCSV } from "@/lib/invoiceRecovery";
import { loadInvoices } from "@/services/invoiceService";
import { readAdminOrdersMerged, isCountableOrder } from "@/lib/orderAdapter";

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEV_STYLE = {
  info: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-400" },
  warning: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400" },
  error: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-400" },
  critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-400" },
};

const STATUS_CONFIG = {
  all_clear: { label: "Todo correcto", icon: CheckCircle, cls: "bg-green-100 border-green-300 text-green-800" },
  repaired: { label: "Reparaciones realizadas", icon: Zap, cls: "bg-blue-100 border-blue-300 text-blue-800" },
  alerts_pending: { label: "Alertas pendientes", icon: AlertTriangle, cls: "bg-amber-100 border-amber-300 text-amber-800" },
  critical: { label: "Alertas críticas", icon: XCircle, cls: "bg-red-100 border-red-300 text-red-800" },
};

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtTime(iso: string): string {
  return iso.slice(0, 19).replace("T", " ");
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ControlFiscalPage() {
  const [currentReport, setCurrentReport] = useState<AutopilotReport | null>(null);
  const [history, setHistory] = useState<AutopilotReport[]>([]);
  const [running, setRunning] = useState(true);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Auto-ejecutar al montar — sin intervención humana
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const report = await runFiscalAutopilot();
      if (!cancelled) {
        setCurrentReport(report);
        setHistory(loadAutopilotLog());
        setRunning(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Shield size={32} className="animate-pulse text-[#2563eb]" />
        </div>
        <p className="text-lg font-bold text-gray-800">Piloto Automático Fiscal</p>
        <p className="mt-1 text-sm text-gray-500">Escaneando, verificando y reparando...</p>
      </div>
    );
  }

  if (!currentReport) return null;

  const statusCfg = STATUS_CONFIG[currentReport.finalStatus];
  const StatusIcon = statusCfg.icon;

  return (
    <div>
      {/* Header — read only, no action buttons */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Lock size={20} className="text-gray-400" />
            Piloto Automático Fiscal
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sistema autónomo — Solo lectura. Se ejecuta automáticamente al cargar esta página.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadCSV(exportAutopilotCSV(), `autopilot_fiscal_${new Date().toISOString().slice(0, 10)}.csv`)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            <Download size={14} /> Log completo
          </button>
          <button
            onClick={() => {
              const csv = exportIssuesCSV();
              downloadCSV(csv, `incidencias_fiscales_${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            className="flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            title="Todas las incidencias detectadas (NIF faltantes, hashes rotos, rectificativas huérfanas...)"
          >
            <Download size={14} /> Incidencias
          </button>
          <button
            onClick={() => {
              const orders = readAdminOrdersMerged().filter(isCountableOrder);
              const invoices = loadInvoices();
              const csv = exportReconciliationCSV(orders, invoices);
              downloadCSV(csv, `reconciliacion_pedidos_facturas_${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            title="Cruce pedido↔factura: detecta pedidos cobrados sin factura o facturas sin pedido"
          >
            <Download size={14} /> Reconciliación
          </button>
        </div>
      </div>

      {/* Autonomy notice */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3">
        <Lock size={16} className="flex-shrink-0 text-gray-400" />
        <p className="text-xs text-gray-500">
          Este sistema opera con <strong>total independencia</strong>. No puede ser manipulado por ningún usuario.
          Detecta incidencias, repara lo que es seguro y documenta todo en un log inmutable.
          Las facturas con discrepancias fiscales NO se modifican automáticamente — requieren rectificativa formal (art. 15 RD 1619/2012).
        </p>
      </div>

      {/* Current run status */}
      <div className={`mb-6 flex items-center gap-3 rounded-2xl border p-5 ${statusCfg.cls}`}>
        <StatusIcon size={28} />
        <div className="flex-1">
          <p className="font-bold">{statusCfg.label}</p>
          <p className="text-sm opacity-80">{currentReport.summary}</p>
        </div>
        <div className="text-right text-xs opacity-70">
          <p>{fmtTime(currentReport.startedAt)}</p>
          <p>{currentReport.durationMs}ms</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Detectadas</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{currentReport.issuesDetected}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Reparadas</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{currentReport.issuesRepaired}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Verificaciones</p>
          <p className="mt-1 text-2xl font-bold text-[#2563eb]">{currentReport.verificationsPassed}/{currentReport.verificationsRun}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Ejecuciones hist.</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">{history.length}</p>
        </div>
      </div>

      {/* Current run actions */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
          <Eye size={14} />
          Acciones de esta ejecución
        </h2>
        <div className="space-y-2">
          {currentReport.actions.map((action, i) => (
            <ActionRow key={i} action={action} />
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
          <Clock size={14} />
          Historial de ejecuciones
        </h2>
        <div className="space-y-2">
          {history.slice(1, 21).map((report) => {
            const cfg = STATUS_CONFIG[report.finalStatus];
            const Icon = cfg.icon;
            const isExpanded = expandedRun === report.runId;
            return (
              <div key={report.runId} className="rounded-xl border border-gray-200 bg-white">
                <button
                  onClick={() => setExpandedRun(isExpanded ? null : report.runId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Icon size={16} className={cfg.cls.includes("green") ? "text-green-600" : cfg.cls.includes("blue") ? "text-blue-600" : cfg.cls.includes("amber") ? "text-amber-600" : "text-red-600"} />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-800">{report.summary}</span>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">{fmtTime(report.startedAt)}</span>
                  <span className="flex-shrink-0 text-xs text-gray-400">{report.durationMs}ms</span>
                  <ChevronDown size={14} className={`text-gray-400 transition ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="mb-3 flex gap-4 text-xs text-gray-500">
                      <span>Detectadas: <strong>{report.issuesDetected}</strong></span>
                      <span>Reparadas: <strong className="text-green-600">{report.issuesRepaired}</strong></span>
                      <span>Verificaciones: <strong>{report.verificationsPassed}/{report.verificationsRun}</strong></span>
                    </div>
                    <div className="space-y-1.5">
                      {report.actions.map((action, i) => (
                        <ActionRow key={i} action={action} compact />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legal footer */}
      <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-400">
        <p className="font-semibold text-gray-500">Base legal del Piloto Automático</p>
        <ul className="mt-1 space-y-0.5">
          <li>Art. 11 RD 1619/2012 — Emisión automática de facturas dentro de plazo legal.</li>
          <li>Art. 12 RD 1007/2023 — Monitorización de plazos VeriFactu (4 días naturales).</li>
          <li>Art. 15 RD 1619/2012 — Rectificativas NO se emiten automáticamente (requieren criterio humano).</li>
          <li>Art. 6 RD 1619/2012 — Correlatividad verificada en cada ejecución.</li>
          <li>Ley 11/2021 (Antifraude) — Log inmutable de todas las acciones del sistema.</li>
          <li>Código de Comercio art. 30 — Conservación de documentos contables durante 6 años.</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Action row component ───────────────────────────────────────────────────

function ActionRow({ action, compact }: { action: AutopilotAction; compact?: boolean }) {
  const sev = SEV_STYLE[action.severity];
  return (
    <div className={`flex items-start gap-2.5 rounded-lg ${compact ? "px-2 py-1.5" : "px-3 py-2.5"} ${sev.bg} ${sev.border} border`}>
      <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${sev.dot}`} />
      <div className="min-w-0 flex-1">
        <p className={`${compact ? "text-xs" : "text-sm"} ${sev.color}`}>
          {action.description}
        </p>
        {action.legalBasis && !compact && (
          <p className="mt-0.5 text-xs text-gray-400 italic">{action.legalBasis}</p>
        )}
        {action.proposedSolution && !compact && (
          <div className="mt-1.5 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
            <p className="text-xs font-semibold text-blue-700">Propuesta de solución automática:</p>
            <p className="mt-0.5 text-xs text-blue-600">{action.proposedSolution}</p>
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {action.actionTaken && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            {action.verified === true ? "Reparado + Verificado" : action.verified === false ? "Reparado — Verif. FALLO" : "Reparado"}
          </span>
        )}
        {!action.actionTaken && action.severity === "critical" && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            Alerta
          </span>
        )}
        {action.amount !== undefined && (
          <span className="text-xs font-bold text-gray-600">{action.amount.toFixed(2)}€</span>
        )}
      </div>
    </div>
  );
}
