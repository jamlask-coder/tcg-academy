"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Scale, TrendingUp, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  loadJournal,
  getPeriodKey,
} from "@/accounting/journalEngine";
import {
  generateTrialBalance,
  generateProfitAndLoss,
  runCrossValidation,
} from "@/accounting/ledger";
import { loadInvoices } from "@/services/invoiceService";
import type { JournalEntry } from "@/types/accounting";

type Tab = "diario" | "sumas" | "pyg" | "validacion";

export default function AdminContabilidadPage() {
  const [tab, setTab] = useState<Tab>("diario");
  const [period, setPeriod] = useState(() => getPeriodKey(new Date()));
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  useEffect(() => {
    setJournal(loadJournal());
  }, []);

  const periodEntries = useMemo(
    () => journal.filter((e) => e.periodKey === period && e.status === "posted"),
    [journal, period],
  );

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    journal.forEach((e) => set.add(e.periodKey));
    return Array.from(set).sort().reverse();
  }, [journal]);

  const trial = useMemo(
    () => (periodEntries.length ? generateTrialBalance(periodEntries, period) : null),
    [periodEntries, period],
  );
  const pyg = useMemo(
    () => (periodEntries.length ? generateProfitAndLoss(periodEntries, period) : null),
    [periodEntries, period],
  );
  const cross = useMemo(() => {
    if (!periodEntries.length) return null;
    const invoices = loadInvoices().filter(
      (i) => getPeriodKey(new Date(i.invoiceDate)) === period,
    );
    return runCrossValidation(invoices, periodEntries, period);
  }, [periodEntries, period]);

  const totalDebit = periodEntries.reduce(
    (s, e) => s + e.lines.reduce((sl, l) => sl + l.debit, 0),
    0,
  );
  const totalCredit = periodEntries.reduce(
    (s, e) => s + e.lines.reduce((sl, l) => sl + l.credit, 0),
    0,
  );
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/admin/fiscal" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline">
        <ArrowLeft size={16} /> Volver al panel fiscal
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-black text-gray-900">Contabilidad PGC</h1>
        <p className="mt-2 text-sm text-gray-600">
          Libro diario, balance de sumas y saldos, cuenta de pérdidas y ganancias.
          Derivado automáticamente de las facturas emitidas (partida doble).
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">Periodo:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
          aria-label="Seleccionar periodo contable"
        >
          {availablePeriods.length === 0 && <option value={period}>{period}</option>}
          {availablePeriods.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${balanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {balanced ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {balanced ? "Cuadrado" : "DESCUADRADO"}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPI label="Asientos" value={periodEntries.length.toString()} color="#2563eb" />
        <KPI label="Total Debe" value={`${totalDebit.toFixed(2)}€`} color="#059669" />
        <KPI label="Total Haber" value={`${totalCredit.toFixed(2)}€`} color="#dc2626" />
        <KPI
          label="Resultado"
          value={pyg ? `${pyg.netResult.toFixed(2)}€` : "—"}
          color={pyg && pyg.netResult >= 0 ? "#059669" : "#dc2626"}
        />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
        <TabBtn active={tab === "diario"} onClick={() => setTab("diario")} icon={BookOpen}>Libro Diario</TabBtn>
        <TabBtn active={tab === "sumas"} onClick={() => setTab("sumas")} icon={Scale}>Sumas y Saldos</TabBtn>
        <TabBtn active={tab === "pyg"} onClick={() => setTab("pyg")} icon={TrendingUp}>Pérdidas y Ganancias</TabBtn>
        <TabBtn active={tab === "validacion"} onClick={() => setTab("validacion")} icon={ShieldCheck}>Validación Cruzada</TabBtn>
      </nav>

      {tab === "diario" && (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Nº</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Concepto</th>
                <th className="px-3 py-2 text-left">Cuenta</th>
                <th className="px-3 py-2 text-right">Debe</th>
                <th className="px-3 py-2 text-right">Haber</th>
              </tr>
            </thead>
            <tbody>
              {periodEntries.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Sin asientos en este periodo.</td></tr>
              )}
              {periodEntries.map((entry) =>
                entry.lines.map((line, idx) => (
                  <tr key={`${entry.entryId}-${idx}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{idx === 0 ? entry.entryNumber : ""}</td>
                    <td className="px-3 py-2 text-gray-700">{idx === 0 ? entry.date : ""}</td>
                    <td className="px-3 py-2 text-gray-700">{idx === 0 ? entry.description : ""}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono font-bold text-gray-900">{line.accountCode}</span>
                      <span className="ml-2 text-xs text-gray-500">{line.accountName}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{line.debit > 0 ? line.debit.toFixed(2) : ""}</td>
                    <td className="px-3 py-2 text-right font-mono">{line.credit > 0 ? line.credit.toFixed(2) : ""}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === "sumas" && trial && (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Cuenta</th>
                <th className="px-3 py-2 text-left">Denominación</th>
                <th className="px-3 py-2 text-right">Sumas Debe</th>
                <th className="px-3 py-2 text-right">Sumas Haber</th>
                <th className="px-3 py-2 text-right">Saldo Deudor</th>
                <th className="px-3 py-2 text-right">Saldo Acreedor</th>
              </tr>
            </thead>
            <tbody>
              {trial.accounts.map((row) => (
                <tr key={row.accountCode} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono font-bold">{row.accountCode}</td>
                  <td className="px-3 py-2 text-gray-700">{row.accountName}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.totalDebit.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.totalCredit.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-green-700">{row.debitBalance > 0 ? row.debitBalance.toFixed(2) : ""}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-700">{row.creditBalance > 0 ? row.creditBalance.toFixed(2) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right">TOTAL</td>
                <td className="px-3 py-2 text-right font-mono">{trial.totals.totalDebit.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{trial.totals.totalCredit.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-green-700">{trial.totals.debitBalance.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-red-700">{trial.totals.creditBalance.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {tab === "pyg" && pyg && (
        <section className="space-y-6">
          <PLBlock title="Ingresos de explotación" sections={pyg.operatingIncome} />
          <PLBlock title="Gastos de explotación" sections={pyg.operatingExpenses} />
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex items-center justify-between font-bold">
              <span>Resultado de explotación</span>
              <span className={pyg.operatingResult >= 0 ? "text-green-700" : "text-red-700"}>
                {pyg.operatingResult.toFixed(2)}€
              </span>
            </div>
          </div>
          <PLBlock title="Ingresos financieros" sections={pyg.financialIncome} />
          <PLBlock title="Gastos financieros" sections={pyg.financialExpenses} />
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex items-center justify-between font-bold">
              <span>Resultado financiero</span>
              <span className={pyg.financialResult >= 0 ? "text-green-700" : "text-red-700"}>
                {pyg.financialResult.toFixed(2)}€
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>Resultado antes de impuestos</span>
              <span className="font-mono">{pyg.preTaxResult.toFixed(2)}€</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Impuesto sobre beneficios</span>
              <span className="font-mono">{pyg.taxExpense.toFixed(2)}€</span>
            </div>
          </div>
          <div className={`rounded-xl p-5 ${pyg.netResult >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex items-center justify-between text-lg font-black">
              <span>RESULTADO DEL EJERCICIO</span>
              <span className={pyg.netResult >= 0 ? "text-green-700" : "text-red-700"}>
                {pyg.netResult.toFixed(2)}€
              </span>
            </div>
          </div>
        </section>
      )}

      {tab === "validacion" && cross && (
        <section className="space-y-4">
          <div className={`rounded-xl p-4 ${cross.allAgree ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
            <div className="flex items-center gap-2 text-lg font-black">
              {cross.allAgree ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              {cross.allAgree ? "Los 4 métodos coinciden al céntimo" : `DISCREPANCIA detectada: ${cross.maxDiscrepancy.toFixed(2)}€`}
            </div>
            {cross.discrepancies.length > 0 && (
              <ul className="mt-3 list-inside list-disc text-sm">
                {cross.discrepancies.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[cross.methodA, cross.methodB, cross.methodC, cross.methodD].map((m) => (
              <div key={m.name} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-2 font-bold text-gray-900">{m.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Ingresos:</span> <span className="font-mono font-bold">{m.revenue.toFixed(2)}€</span></div>
                  <div><span className="text-gray-500">IVA:</span> <span className="font-mono font-bold">{m.vat.toFixed(2)}€</span></div>
                </div>
                <p className="mt-2 text-xs text-gray-500">{m.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-bold transition ${active ? "border-b-2 border-[#2563eb] text-[#2563eb]" : "text-gray-600 hover:text-gray-900"}`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

type PLSection = { label: string; accounts: { code: string; name: string; amount: number }[]; subtotal: number };

function PLBlock({ title, sections }: { title: string; sections: PLSection[] }) {
  const total = sections.reduce((s, sec) => s + sec.subtotal, 0);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-bold text-gray-900">{title}</h3>
      {sections.map((sec) => (
        sec.accounts.length > 0 && (
          <div key={sec.label} className="mb-3">
            <div className="mb-1 text-sm font-semibold text-gray-700">{sec.label}</div>
            {sec.accounts.map((a) => (
              <div key={a.code} className="flex items-center justify-between pl-4 text-sm text-gray-600">
                <span><span className="font-mono">{a.code}</span> {a.name}</span>
                <span className="font-mono">{a.amount.toFixed(2)}€</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-gray-100 pt-1 pl-4 text-sm font-semibold">
              <span>Subtotal {sec.label}</span>
              <span className="font-mono">{sec.subtotal.toFixed(2)}€</span>
            </div>
          </div>
        )
      ))}
      <div className="flex items-center justify-between border-t border-gray-200 pt-2 font-bold">
        <span>Total {title}</span>
        <span className="font-mono">{total.toFixed(2)}€</span>
      </div>
    </div>
  );
}
