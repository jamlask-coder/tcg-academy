"use client";
import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
  Download,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  checkFiscalDeadlines,
  acknowledgeFiscalNotification,
  isFiscalResponsible,
  type FiscalNotification,
} from "@/lib/fiscalNotifications";
import {
  generateTaxCalendar,
  exportTaxCalendarCSV,
} from "@/accounting/advancedAccounting";
import { generateDraft, type FiscalDraft } from "@/services/fiscalDrafts";
import { downloadDraftCsv, printDraftAsPdf } from "@/lib/fiscalExport";

const SEV_STYLE = {
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-400", label: "Próximo" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-400", label: "Atención" },
  urgent: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500", label: "Urgente" },
  overdue: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", dot: "bg-red-500", label: "Vencido" },
};

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS_ES = ["L", "M", "X", "J", "V", "S", "D"];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface MonthGridProps {
  year: number;
  month: number; // 0-11
  todayKey: string;
  obligationsByDate: Map<string, Array<{ modelo: string; description: string; deadline: string }>>;
}

function MonthGrid({ year, month, todayKey, obligationsByDate }: MonthGridProps) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=Dom, 1=Lun ... convertimos a Lunes=0 ... Domingo=6
  const startWeekday = (firstDay.getDay() + 6) % 7;

  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ day: d, key: formatDateKey(dt) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-center text-sm font-bold text-gray-800">
        {MONTH_NAMES_ES[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400 uppercase">
        {WEEKDAYS_ES.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="aspect-square" />;
          const isToday = cell.key === todayKey;
          const obs = obligationsByDate.get(cell.key) ?? [];
          const hasObs = obs.length > 0;
          const tooltip = hasObs
            ? obs.map((o) => `${o.modelo} — ${o.description}`).join("\n")
            : undefined;

          let cellCls =
            "relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition";
          if (isToday) {
            cellCls += " bg-[#2563eb] text-white font-bold ring-2 ring-[#2563eb] ring-offset-1";
          } else if (hasObs) {
            cellCls += " bg-amber-50 text-amber-900 border border-amber-300 cursor-help hover:bg-amber-100";
          } else {
            cellCls += " text-gray-600 hover:bg-gray-50";
          }

          return (
            <div key={idx} className={cellCls} title={tooltip}>
              <span>{cell.day}</span>
              {hasObs && (
                <div className="mt-0.5 flex gap-0.5">
                  {obs.slice(0, 3).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-1 rounded-full ${isToday ? "bg-white" : "bg-amber-500"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Lista compacta de obligaciones del mes */}
      {(() => {
        const monthEvents = Array.from(obligationsByDate.entries())
          .filter(([key]) => {
            const [y, m] = key.split("-").map(Number);
            return y === year && m - 1 === month;
          })
          .sort(([a], [b]) => a.localeCompare(b));
        if (monthEvents.length === 0) {
          return (
            <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400 text-center">
              Sin obligaciones este mes
            </p>
          );
        }
        return (
          <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs">
            {monthEvents.flatMap(([key, items]) =>
              items.map((ob, i) => (
                <li key={`${key}-${i}`} className="flex items-start gap-2">
                  <span className="mt-0.5 font-mono font-bold text-amber-600">
                    {key.slice(8, 10)}
                  </span>
                  <span className="text-gray-600">
                    <span className="font-bold text-[#2563eb]">{ob.modelo}</span> — {ob.description}
                  </span>
                </li>
              )),
            )}
          </ul>
        );
      })()}
    </div>
  );
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CalendarioFiscalPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FiscalNotification[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const isLuri = user ? isFiscalResponsible(user.id) : false;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifications(checkFiscalDeadlines());
  }, []);

  const visible = showAcknowledged
    ? notifications
    : notifications.filter((n) => !n.acknowledged);

  const pending = notifications.filter((n) => !n.acknowledged);
  const overdue = pending.filter((n) => n.severity === "overdue");
  const urgent = pending.filter((n) => n.severity === "urgent");

  function handleAcknowledge(id: string) {
    acknowledgeFiscalNotification(id);
    setNotifications(checkFiscalDeadlines());
  }

  const fullCalendar = generateTaxCalendar(year);

  // Para el grid visual: agrupamos obligaciones (del año actual + siguiente)
  // por fecha exacta YYYY-MM-DD, para los próximos 3 meses.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  const calendarThisYear = generateTaxCalendar(today.getFullYear());
  const calendarNextYear = generateTaxCalendar(today.getFullYear() + 1);
  const allObligations = [...calendarThisYear, ...calendarNextYear];

  const obligationsByDate = new Map<string, typeof allObligations>();
  for (const ob of allObligations) {
    const list = obligationsByDate.get(ob.deadline) ?? [];
    list.push(ob);
    obligationsByDate.set(ob.deadline, list);
  }

  const months = [0, 1, 2].map((offset) => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Calendar size={24} className="text-[#2563eb]" />
            Calendario Fiscal
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Obligaciones tributarias con plazos, instrucciones y documentación preparada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => downloadCSV(exportTaxCalendarCSV(fullCalendar), `calendario_fiscal_${year}.csv`)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Vista de 3 meses (mes actual + 2 siguientes) */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Próximos 3 meses
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#2563eb]" />
              Hoy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-amber-300 bg-amber-50" />
              Con obligación
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {months.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              todayKey={todayKey}
              obligationsByDate={obligationsByDate}
            />
          ))}
        </div>
      </div>

      {/* Alert banner — only for Luri */}
      {isLuri && overdue.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <XCircle size={24} className="flex-shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-red-800">
              {overdue.length} obligación(es) fiscal(es) VENCIDA(S)
            </p>
            <p className="text-sm text-red-600">
              {overdue.map((n) => `${n.modelo} (${n.deadline})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {isLuri && urgent.length > 0 && overdue.length === 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <AlertTriangle size={24} className="flex-shrink-0 text-orange-600" />
          <div>
            <p className="font-bold text-orange-800">
              {urgent.length} modelo(s) con plazo en menos de 5 días
            </p>
          </div>
        </div>
      )}

      {!isLuri && user?.role === "admin" && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Las alertas fiscales se envían únicamente a Luri (responsable fiscal).
          Este calendario es solo de consulta.
        </div>
      )}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total obligaciones</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{fullCalendar.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Pendientes alerta</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pending.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Urgentes (≤5d)</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{urgent.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase">Vencidas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{overdue.length}</p>
        </div>
      </div>

      {/* Toggle acknowledged */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(e) => setShowAcknowledged(e.target.checked)}
            className="accent-[#2563eb]"
          />
          Mostrar modelos ya vistos
        </label>
        <span className="ml-auto text-sm text-gray-400">{visible.length} notificaciones</span>
      </div>

      {/* Notifications list */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-12 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
          <p className="text-lg font-bold text-green-800">Sin obligaciones pendientes</p>
          <p className="mt-1 text-sm text-green-600">Todas las obligaciones fiscales próximas están al día.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((notif) => {
            const sev = SEV_STYLE[notif.severity];
            const isExpanded = expandedId === notif.id;

            return (
              <div
                key={notif.id}
                className={`overflow-hidden rounded-2xl border ${notif.acknowledged ? "border-gray-200 bg-gray-50 opacity-60" : sev.border + " " + sev.bg}`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className={`h-3 w-3 flex-shrink-0 rounded-full ${sev.dot}`} />
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${sev.text}`}>{notif.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                      {notif.acknowledged && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Visto</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600">{notif.body}</p>
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`text-xs font-bold ${notif.daysRemaining < 0 ? "text-red-600" : notif.daysRemaining <= 5 ? "text-orange-600" : "text-gray-500"}`}>
                      {notif.daysRemaining < 0 ? `Vencido ${Math.abs(notif.daysRemaining)}d` : `${notif.daysRemaining}d`}
                    </span>
                    {isLuri && !notif.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(notif.id)}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700"
                        title="Marcar como visto"
                      >
                        <CheckCircle size={13} />
                        Visto
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-white px-5 py-4 space-y-4">
                    {/* Instructions */}
                    <div>
                      <p className="mb-1 text-xs font-bold text-gray-500 uppercase">Instrucciones para presentar</p>
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{notif.instructions}</pre>
                    </div>

                    {/* Prepared data */}
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                      <p className="mb-1 text-xs font-bold text-blue-700">Datos preparados automáticamente</p>
                      <p className="text-xs text-blue-600">{notif.preparedData}</p>
                    </div>

                    {/* Borrador auto-generado */}
                    <DraftPreview modelo={notif.modelo} period={notif.period} />


                    {/* Where to present */}
                    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <FileText size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
                      <div>
                        <p className="text-xs font-bold text-gray-700">Dónde presentar</p>
                        <p className="text-xs text-gray-500">{MODELO_INFO_MAP[notif.modelo]?.where ?? "Sede electrónica AEAT"}</p>
                        <a
                          href={notif.aeatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline"
                        >
                          Abrir en AEAT <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock size={12} />
                      Fecha límite: <strong className="text-gray-700">{notif.deadline}</strong>
                      {notif.acknowledgedAt && (
                        <span className="ml-4">Visto el: {new Date(notif.acknowledgedAt).toLocaleDateString("es-ES")}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full calendar table */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-gray-700 uppercase tracking-wide">
          Calendario completo {year}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                  <th className="px-4 py-3 text-left font-semibold">Descripción</th>
                  <th className="px-4 py-3 text-left font-semibold">Período</th>
                  <th className="px-4 py-3 text-left font-semibold">Fecha límite</th>
                  <th className="px-4 py-3 text-right font-semibold">Días</th>
                  <th className="px-4 py-3 text-left font-semibold">Base legal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fullCalendar.map((ob, i) => (
                  <tr key={i} className={ob.daysRemaining < 0 ? "bg-red-50/50" : ob.daysRemaining <= 5 ? "bg-orange-50/50" : ""}>
                    <td className="px-4 py-3 font-bold text-[#2563eb]">{ob.modelo}</td>
                    <td className="px-4 py-3 text-gray-700">{ob.description}</td>
                    <td className="px-4 py-3 text-gray-500">{ob.period}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ob.deadline}</td>
                    <td className={`px-4 py-3 text-right font-bold ${ob.daysRemaining < 0 ? "text-red-600" : ob.daysRemaining <= 5 ? "text-orange-600" : "text-gray-500"}`}>
                      {ob.daysRemaining < 0 ? `-${Math.abs(ob.daysRemaining)}` : ob.daysRemaining}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{ob.legalBasis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Borrador auto-generado del modelo ─────────────────────────────────────

function DraftPreview({ modelo, period }: { modelo: string; period: string }) {
  const [draft, setDraft] = useState<FiscalDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      setDraft(generateDraft(modelo, period));
    } catch {
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [modelo, period]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-400">
        Generando borrador...
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-400">
        No hay borrador disponible para este modelo / período.
      </div>
    );
  }

  const statusBadge =
    draft.status === "ok"
      ? { label: "Borrador listo", cls: "bg-green-100 text-green-700" }
      : draft.status === "incomplete"
        ? { label: "Faltan datos", cls: "bg-amber-100 text-amber-700" }
        : { label: "No procede", cls: "bg-gray-100 text-gray-600" };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-gray-700">Borrador generado</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {draft.resultado !== 0 && (
            <span className="text-xs font-bold text-gray-700">
              {draft.resultado >= 0 ? "A ingresar:" : "A devolver:"}{" "}
              <span className="text-[#2563eb]">
                {Math.abs(draft.resultado).toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}€
              </span>
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => downloadDraftCsv(draft)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-50"
              aria-label="Descargar borrador en CSV"
              title="Descargar CSV"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => printDraftAsPdf(draft)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-50"
              aria-label="Imprimir o guardar borrador como PDF"
              title="Imprimir / Guardar PDF"
            >
              <FileText className="h-3 w-3" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3">
        <p className="text-xs italic text-gray-500">{draft.summary}</p>

        {draft.skipReason && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
            {draft.skipReason}
          </p>
        )}

        {draft.sections.map((section, si) => (
          <div key={si} className="rounded-md border border-gray-100">
            <p className="border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {section.title}
            </p>
            <table className="w-full text-xs">
              <tbody>
                {section.fields.map((f, fi) => (
                  <tr key={fi} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-1.5">
                      {f.box && (
                        <span className="mr-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                          {f.box}
                        </span>
                      )}
                      <span className="text-gray-700">{f.label}</span>
                      {f.hint && (
                        <p className="mt-0.5 text-[10px] text-gray-400">{f.hint}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono font-semibold text-gray-800">
                      {typeof f.value === "number"
                        ? f.value.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : f.value}
                      {typeof f.value === "number" && f.label.toLowerCase().includes("%") ? "" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {draft.warnings.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Avisos</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-700">
              {draft.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {draft.missing.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Datos pendientes</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-red-700">
              {draft.missing.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Info map for "where to present" (subset of fiscal notifications data)
const MODELO_INFO_MAP: Record<string, { where: string }> = {
  "303": { where: "Sede electrónica AEAT → IVA → Modelo 303" },
  "390": { where: "Sede electrónica AEAT → IVA → Modelo 390" },
  "349": { where: "Sede electrónica AEAT → Intracomunitarias → Modelo 349" },
  "347": { where: "Sede electrónica AEAT → Declaraciones informativas → Modelo 347" },
  "111": { where: "Sede electrónica AEAT → IRPF → Modelo 111" },
  "190": { where: "Sede electrónica AEAT → IRPF → Modelo 190" },
  "115": { where: "Sede electrónica AEAT → IRPF → Modelo 115 (alquileres)" },
  "180": { where: "Sede electrónica AEAT → IRPF → Modelo 180 (resumen alquileres)" },
  "123": { where: "Sede electrónica AEAT → IRPF → Modelo 123 (capital mobiliario)" },
  "193": { where: "Sede electrónica AEAT → IRPF → Modelo 193 (resumen capital mobiliario)" },
  "200": { where: "Sede electrónica AEAT → Sociedades → Modelo 200" },
  "202": { where: "Sede electrónica AEAT → Sociedades → Modelo 202 (pago fraccionado IS)" },
  "232": { where: "Sede electrónica AEAT → Sociedades → Modelo 232 (operaciones vinculadas)" },
  "369": { where: "Sede electrónica AEAT → IVA → OSS Ventanilla Única → Modelo 369" },
  "720": { where: "Sede electrónica AEAT → Declaraciones informativas → Modelo 720" },
  "INTRASTAT": { where: "Aduanas (Mº Industria) — aduanas.serviciosmin.gob.es/intrastat" },
  "CCAA": { where: "Registro Mercantil (registradores.org)" },
};
