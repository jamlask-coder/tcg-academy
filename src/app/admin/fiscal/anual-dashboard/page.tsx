"use client";
/**
 * Dashboard fiscal anual.
 * =======================
 * Vista única que agrega para un ejercicio fiscal:
 *  - KPIs anuales (ventas, IVA repercutido/soportado, retenciones, resultado)
 *  - Estimación cuota IS (Modelo 200) con tipo reducido si aplica
 *  - Estimación pago fraccionado (Modelo 202)
 *  - Operaciones vinculadas (Modelo 232)
 *  - Reparto de dividendos previsto (Modelo 123/193)
 *  - Estado por modelo: presentado / pendiente / borrador listo
 *
 * Pensado para que Luri tenga la foto completa del ejercicio sin saltar
 * entre pestañas.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Euro,
  Receipt,
  Calculator,
  Users,
  Coins,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { loadInvoices } from "@/services/invoiceService";
import { generateAnnualReport } from "@/services/taxService";
import {
  getDeductibleVATForYear,
  getSupplierInvoicesByYear,
} from "@/services/supplierInvoiceService";
import { loadFiscalConfig } from "@/services/fiscalConfigService";
import { generateTaxCalendar } from "@/accounting/advancedAccounting";
import { DataHub } from "@/lib/dataHub";

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FiscalAnnualDashboardPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tick, setTick] = useState(0);

  // Re-render cuando cambien facturas, compras o config
  useEffect(() => {
    const offs = [
      DataHub.on("invoices", () => setTick((t) => t + 1)),
      DataHub.on("supplierInvoices", () => setTick((t) => t + 1)),
      DataHub.on("fiscal_config", () => setTick((t) => t + 1)),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  const data = useMemo(() => {
    const invoices = loadInvoices();
    const cfg = loadFiscalConfig();
    const annualReport = generateAnnualReport(invoices, year);
    const supplierYear = getSupplierInvoicesByYear(year);
    const totalInputVAT = round2(getDeductibleVATForYear(year));
    const ivaResult = round2(annualReport.totalOutputVAT - totalInputVAT);

    // Gastos deducibles (base imponible de proveedores) — aproximación P&G
    const totalGastosBase = round2(
      supplierYear.reduce((s, inv) => s + inv.totalTaxableBase, 0),
    );

    // Resultado contable estimado: ingresos − gastos deducibles
    const resultadoContable = round2(annualReport.totalTaxableBase - totalGastosBase);

    // Tipo IS: 15% si nueva creación los 2 primeros años, si no 25%
    const yearsSinceIncorp =
      cfg.company.yearOfIncorporation
        ? year - cfg.company.yearOfIncorporation
        : null;
    const tipoIS =
      cfg.company.tipoReducidoIS && yearsSinceIncorp !== null && yearsSinceIncorp < 2
        ? 15
        : 25;

    const cuotaIS = resultadoContable > 0 ? round2(resultadoContable * (tipoIS / 100)) : 0;

    // Pago fraccionado 202 — método cuota: 18% sobre cuota líquida última 200
    // Como aún no hay 200 presentado en el primer ejercicio, mostramos 0 con nota.
    const pagoFraccionado202 = round2(cuotaIS * 0.18);

    // Retenciones soportadas (a profesionales) y repercutidas
    const retencionesSoportadas = round2(
      supplierYear.reduce((s, inv) => s + inv.totalRetention, 0),
    );

    // Operaciones vinculadas: vienen de fiscalConfig (filtradas por ejercicio)
    const vinculadasYear = cfg.relatedParties.filter((p) => p.fiscalYear === year);
    const totalVinculadas = vinculadasYear.reduce((s, p) => s + p.annualAmount, 0);
    const requiere232 = vinculadasYear.length > 0;

    // Dividendos previstos
    const dividendosPrevistos = cfg.dividends
      .filter((d) => new Date(d.date).getFullYear() === year)
      .reduce(
        (acc, d) => {
          const retencion = round2((d.grossAmount * d.retentionRate) / 100);
          const neto = round2(d.grossAmount - retencion);
          acc.bruto = round2(acc.bruto + d.grossAmount);
          acc.retencion = round2(acc.retencion + retencion);
          acc.neto = round2(acc.neto + neto);
          return acc;
        },
        { bruto: 0, retencion: 0, neto: 0 },
      );

    // Calendario fiscal del año
    const calendar = generateTaxCalendar(year);

    return {
      annualReport,
      supplierYear,
      totalInputVAT,
      ivaResult,
      totalGastosBase,
      resultadoContable,
      tipoIS,
      cuotaIS,
      pagoFraccionado202,
      retencionesSoportadas,
      cfg,
      totalVinculadas,
      requiere232,
      dividendosPrevistos,
      calendar,
    };
  }, [year, tick]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        href="/admin/fiscal"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al panel fiscal
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard fiscal anual</h1>
          <p className="text-sm text-gray-500">
            Estado consolidado del ejercicio: IVA, IS, retenciones, vinculadas y dividendos.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
          aria-label="Seleccionar ejercicio fiscal"
        >
          {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>
              Ejercicio {y}
            </option>
          ))}
        </select>
      </div>

      {/* KPIs principales */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          icon={TrendingUp}
          label="Ingresos (base imponible)"
          value={`${fmt(data.annualReport.totalTaxableBase)}€`}
          sub={`${data.annualReport.totalInvoices} facturas emitidas`}
          color="#2563eb"
        />
        <KPI
          icon={Receipt}
          label="Gastos deducibles"
          value={`${fmt(data.totalGastosBase)}€`}
          sub={`${data.supplierYear.length} facturas recibidas`}
          color="#475569"
        />
        <KPI
          icon={Euro}
          label="Resultado contable"
          value={`${fmt(data.resultadoContable)}€`}
          sub={data.resultadoContable >= 0 ? "Beneficio estimado" : "Pérdida estimada"}
          color={data.resultadoContable >= 0 ? "#16a34a" : "#dc2626"}
        />
        <KPI
          icon={Calculator}
          label={`Cuota IS estimada (${data.tipoIS}%)`}
          value={`${fmt(data.cuotaIS)}€`}
          sub={`Pago fraccionado 202: ${fmt(data.pagoFraccionado202)}€`}
          color="#9333ea"
        />
      </section>

      {/* IVA anual */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
          IVA anual (Modelo 390)
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DataCell
            label="IVA repercutido"
            value={`${fmt(data.annualReport.totalOutputVAT)}€`}
          />
          <DataCell
            label="IVA soportado deducible"
            value={`${fmt(data.totalInputVAT)}€`}
          />
          <DataCell
            label="Resultado anual"
            value={`${fmt(data.ivaResult)}€`}
            highlight={data.ivaResult > 0 ? "blue" : "green"}
          />
          <DataCell
            label="Base imponible facturada"
            value={`${fmt(data.annualReport.totalTaxableBase)}€`}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {data.annualReport.quarters.map((q) => (
            <div
              key={q.quarter}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                T{q.quarter}
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {fmt(q.totalOutputVAT)}€{" "}
                <span className="text-xs text-gray-400">repercutido</span>
              </p>
              <p className="text-[11px] text-gray-500">{q.invoiceCount} facturas</p>
            </div>
          ))}
        </div>
      </section>

      {/* Retenciones */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card icon={Users} title="Retenciones IRPF practicadas">
          <DataCell
            label="A profesionales (Modelo 111)"
            value={`${fmt(data.retencionesSoportadas)}€`}
            tiny
          />
          <p className="mt-2 text-xs text-gray-500">
            Importe retenido en facturas de proveedores con servicios profesionales y/o alquileres.
            Se ingresa trimestralmente vía Modelo 111 y/o 115.
          </p>
        </Card>

        <Card icon={Coins} title="Dividendos previstos (Modelo 123)">
          {data.dividendosPrevistos.bruto > 0 ? (
            <div className="space-y-1">
              <DataCell
                label="Bruto repartido"
                value={`${fmt(data.dividendosPrevistos.bruto)}€`}
                tiny
              />
              <DataCell
                label="Retención 19%"
                value={`${fmt(data.dividendosPrevistos.retencion)}€`}
                tiny
              />
              <DataCell
                label="Neto a socios"
                value={`${fmt(data.dividendosPrevistos.neto)}€`}
                tiny
                highlight="blue"
              />
            </div>
          ) : (
            <p className="py-3 text-sm text-gray-400">
              No hay reparto de dividendos previsto para {year}. Configurable en{" "}
              <Link href="/admin/fiscal/configuracion" className="text-[#2563eb] hover:underline">
                /admin/fiscal/configuracion
              </Link>
              .
            </p>
          )}
        </Card>
      </section>

      {/* Operaciones vinculadas */}
      <section className="mb-6">
        <Card icon={AlertTriangle} title="Operaciones vinculadas (Modelo 232)">
          {data.requiere232 ? (
            <>
              <DataCell
                label="Volumen total operaciones vinculadas"
                value={`${fmt(data.totalVinculadas)}€`}
                tiny
                highlight={data.totalVinculadas > 250000 ? "amber" : undefined}
              />
              <p className="mt-2 text-xs text-gray-500">
                Operaciones registradas con socios o entidades vinculadas.{" "}
                {data.totalVinculadas > 250000
                  ? "Supera el umbral de 250.000€/año → Modelo 232 obligatorio."
                  : "Por debajo de 250.000€/año, pero algunas operaciones específicas (>100.000€) pueden requerir Modelo 232."}
              </p>
            </>
          ) : (
            <p className="py-3 text-sm text-gray-400">
              No hay operaciones vinculadas registradas para {year}. Si has hecho préstamos a/de socios,
              alquileres con socios, o ventas a sociedades del grupo, regístralas en{" "}
              <Link href="/admin/fiscal/configuracion" className="text-[#2563eb] hover:underline">
                /admin/fiscal/configuracion
              </Link>
              .
            </p>
          )}
        </Card>
      </section>

      {/* Calendario de modelos */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-gray-900">
          Modelos del ejercicio {year} ({data.calendar.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Plazo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.calendar.map((c) => {
                const isPast = c.daysRemaining < -7; // ya pasó el plazo
                const isClose = c.daysRemaining <= 30 && c.daysRemaining >= 0;
                const StatusIcon = isPast ? Clock : isClose ? AlertTriangle : CheckCircle2;
                const statusCls = isPast
                  ? "text-gray-500"
                  : isClose
                    ? "text-amber-600"
                    : "text-green-600";
                const statusText = isPast
                  ? "Plazo cerrado"
                  : isClose
                    ? `En ${c.daysRemaining} días`
                    : "Próximo";
                return (
                  <tr
                    key={`${c.modelo}-${c.period}`}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-mono text-xs font-bold text-gray-700">
                      {c.modelo}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{c.period}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{c.deadline}</td>
                    <td className={`px-3 py-2 text-xs font-semibold ${statusCls}`}>
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusText}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href="/admin/fiscal/calendario"
                        className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#2563eb] hover:underline"
                      >
                        Ver borrador
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Nota:</strong> Las cifras de IS y resultado contable son estimaciones a partir
        de la información registrada en el sistema (facturas emitidas + facturas de proveedores).
        Antes de presentar el Modelo 200, la gestoría debe validar la P&G completa, ajustes
        fiscales (no deducibles, amortizaciones, BIN, etc.) y posibles deducciones.
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function KPI({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${color}1a`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>
    </div>
  );
}

function DataCell({
  label,
  value,
  tiny,
  highlight,
}: {
  label: string;
  value: string;
  tiny?: boolean;
  highlight?: "blue" | "green" | "amber";
}) {
  const colorMap = {
    blue: "text-[#2563eb]",
    green: "text-green-700",
    amber: "text-amber-700",
  };
  return (
    <div className={tiny ? "" : "rounded-lg border border-gray-100 bg-gray-50 p-3"}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`font-bold ${tiny ? "text-sm" : "text-lg"} ${highlight ? colorMap[highlight] : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
        <Icon className="h-4 w-4 text-gray-500" />
        {title}
      </h3>
      {children}
    </div>
  );
}
