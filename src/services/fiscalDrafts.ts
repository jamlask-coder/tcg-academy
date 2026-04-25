/**
 * Fiscal Drafts — Pre-generador de borradores de modelos AEAT.
 *
 * Para cada modelo y período, devuelve:
 *   - Casillas precompletadas (campos del modelo con valor calculado)
 *   - Warnings (situaciones a revisar)
 *   - Missing (datos que el sistema no puede inferir)
 *   - Totales y resumen
 *
 * Ningún borrador presenta nada por sí solo — todos requieren validación de
 * Luri antes del envío a AEAT. Se calcula bajo demanda (cuando se abre el
 * modal de un modelo) o ante cambios en `fiscalConfig` / `invoices`.
 */

import { loadInvoices } from "@/services/invoiceService";
import { loadFiscalConfig } from "@/services/fiscalConfigService";
import {
  generateQuarterlyReport,
  generateAnnualReport,
} from "@/services/taxService";
import { generateModelo347 } from "@/accounting/advancedAccounting";
import { readAdminOrdersMerged } from "@/lib/orderAdapter";
import type { Quarter } from "@/types/tax";
import { isIntraCommunityOperation } from "@/services/taxService";
import {
  getDeductibleVATForQuarter,
  getDeductibleVATForYear,
  getInputVATBreakdown,
  getRetentionsForQuarter,
  getSupplierInvoicesByQuarter,
  getSupplierInvoicesByYear,
} from "@/services/supplierInvoiceService";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DraftField {
  /** Número de casilla AEAT (vacío si no aplica) */
  box?: string;
  /** Etiqueta humana */
  label: string;
  /** Valor calculado (en €) */
  value: number;
  /** Cómo se ha calculado este campo */
  hint?: string;
}

export interface DraftSection {
  title: string;
  fields: DraftField[];
}

export interface FiscalDraft {
  modelo: string;
  period: string;
  /** "ok" → puede presentarse, "incomplete" → faltan datos, "skip" → no procede */
  status: "ok" | "incomplete" | "skip";
  /** Razón si status==="skip" (ej: "No hay alquileres registrados") */
  skipReason?: string;
  /** Resultado a ingresar (positivo) o devolver (negativo) */
  resultado: number;
  /** Secciones del borrador (cada una con casillas) */
  sections: DraftSection[];
  /** Avisos a revisar */
  warnings: string[];
  /** Datos que faltan */
  missing: string[];
  /** Resumen humano (1-2 líneas) */
  summary: string;
  /** Generado el */
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const round2 = (n: number) => Math.round(n * 100) / 100;

function getQuarterRange(year: number, q: Quarter): { start: Date; end: Date } {
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function emptyDraft(modelo: string, period: string, reason: string): FiscalDraft {
  return {
    modelo,
    period,
    status: "skip",
    skipReason: reason,
    resultado: 0,
    sections: [],
    warnings: [],
    missing: [],
    summary: reason,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 303 — IVA TRIMESTRAL
// ═══════════════════════════════════════════════════════════════════════════════

export function draft303(year: number, quarter: Quarter): FiscalDraft {
  const invoices = loadInvoices();
  const report = generateQuarterlyReport(invoices, year, quarter);

  // IVA soportado calculado a partir del libro de facturas recibidas.
  // Si aún no hay facturas de proveedores registradas, totalInputVAT === 0.
  const supplierInvoices = getSupplierInvoicesByQuarter(year, quarter);
  const totalInputVAT = round2(getDeductibleVATForQuarter(year, quarter));
  const inputBreakdown = getInputVATBreakdown(supplierInvoices);
  const finalResult = round2(report.totalOutputVAT - totalInputVAT);

  const sections: DraftSection[] = [
    {
      title: "IVA devengado (repercutido)",
      fields: report.outputVAT.map((b) => ({
        box: b.vatRate === 21 ? "07/08" : b.vatRate === 10 ? "04/05" : b.vatRate === 4 ? "01/02" : "—",
        label: `Operaciones al ${b.vatRate}% (${b.invoiceCount} facturas)`,
        value: b.vatAmount,
        hint: `Base ${b.taxableBase.toFixed(2)}€ · IVA ${b.vatAmount.toFixed(2)}€`,
      })),
    },
    {
      title: "Operaciones intracomunitarias / exentas",
      fields: [
        { box: "59", label: "Entregas intracomunitarias exentas", value: report.intraCommunityAmount },
        { box: "60", label: "Exportaciones y exentas", value: report.exemptAmount },
      ],
    },
    {
      title: "IVA soportado (deducible)",
      fields:
        inputBreakdown.length > 0
          ? inputBreakdown.map((b) => ({
              box: b.vatRate === 21 ? "28/29" : b.vatRate === 10 ? "30/31" : b.vatRate === 4 ? "32/33" : "—",
              label: `Compras al ${b.vatRate}%${b.deductiblePct < 100 ? ` (deducible ${b.deductiblePct}%)` : ""}`,
              value: b.deductibleAmount,
              hint: `Base ${b.taxableBase.toFixed(2)}€ · IVA ${b.vatAmount.toFixed(2)}€ · deducible ${b.deductibleAmount.toFixed(2)}€`,
            }))
          : [
              {
                box: "—",
                label: "Sin facturas de proveedores registradas",
                value: 0,
                hint: "Registra las compras en /admin/fiscal/proveedores",
              },
            ],
    },
    {
      title: "Resultado",
      fields: [
        { box: "65", label: "Total devengado", value: report.totalOutputVAT },
        { box: "—", label: "IVA soportado deducible total", value: totalInputVAT },
        { box: "71", label: "A ingresar (resultado)", value: finalResult },
      ],
    },
  ];

  const warnings: string[] = [];
  const missing: string[] = [];
  if (supplierInvoices.length === 0) {
    missing.push(
      "No hay facturas de proveedores en este trimestre. Si has tenido compras, regístralas en /admin/fiscal/proveedores antes de presentar — el resultado actual sobreestima lo a ingresar.",
    );
  }
  if (report.invoiceCount === 0) {
    warnings.push("No hay facturas emitidas en este período. ¿Confirmas presentar a 0?");
  }

  return {
    modelo: "303",
    period: `T${quarter} ${year}`,
    status: missing.length > 0 ? "incomplete" : "ok",
    resultado: finalResult,
    sections,
    warnings,
    missing,
    summary: `${report.invoiceCount} facturas emitidas · ${supplierInvoices.length} recibidas · IVA repercutido ${report.totalOutputVAT.toFixed(2)}€ · IVA soportado ${totalInputVAT.toFixed(2)}€ · resultado ${finalResult.toFixed(2)}€`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 390 — RESUMEN ANUAL IVA
// ═══════════════════════════════════════════════════════════════════════════════

export function draft390(year: number): FiscalDraft {
  const invoices = loadInvoices();
  const report = generateAnnualReport(invoices, year);
  const totalInputVAT = round2(getDeductibleVATForYear(year));
  const annualResult = round2(report.totalOutputVAT - totalInputVAT);
  const supplierInvoicesYear = getSupplierInvoicesByYear(year);

  const sections: DraftSection[] = [
    {
      title: "Resumen trimestral",
      fields: report.quarters.map((q) => {
        const inputQ = round2(getDeductibleVATForQuarter(year, q.quarter));
        const resultQ = round2(q.totalOutputVAT - inputQ);
        return {
          label: `T${q.quarter} ${year}`,
          value: resultQ,
          hint: `Base ${q.totalTaxableBase.toFixed(2)}€ · ${q.invoiceCount} facturas · IVA repercutido ${q.totalOutputVAT.toFixed(2)}€ · IVA soportado ${inputQ.toFixed(2)}€`,
        };
      }),
    },
    {
      title: "Totales anuales",
      fields: [
        { label: "Base imponible total (ventas)", value: report.totalTaxableBase },
        { label: "IVA repercutido total", value: report.totalOutputVAT },
        { label: "IVA soportado deducible total", value: totalInputVAT },
        { label: "Resultado anual", value: annualResult },
      ],
    },
  ];

  return {
    modelo: "390",
    period: `Anual ${year}`,
    status: "ok",
    resultado: annualResult,
    sections,
    warnings: [],
    missing:
      supplierInvoicesYear.length === 0
        ? ["No hay facturas de proveedores registradas en el ejercicio. Si has tenido compras, regístralas en /admin/fiscal/proveedores."]
        : [],
    summary: `Resumen anual: ${report.totalInvoices} emitidas · ${supplierInvoicesYear.length} recibidas · IVA repercutido ${report.totalOutputVAT.toFixed(2)}€ · IVA soportado ${totalInputVAT.toFixed(2)}€`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 349 — INTRACOMUNITARIAS
// ═══════════════════════════════════════════════════════════════════════════════

export function draft349(year: number, quarter: Quarter): FiscalDraft {
  const invoices = loadInvoices();
  const { start, end } = getQuarterRange(year, quarter);
  const intraInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate);
    return d >= start && d <= end && inv.status !== "anulada" && isIntraCommunityOperation(inv.recipient);
  });

  if (intraInvoices.length === 0) {
    return emptyDraft("349", `T${quarter} ${year}`, "No hay operaciones intracomunitarias en este trimestre.");
  }

  // Agrupa por NIF intracomunitario
  const byNif = new Map<string, { name: string; country: string; total: number; count: number }>();
  for (const inv of intraInvoices) {
    const nif = inv.recipient.taxId ?? "??";
    const key = nif;
    const existing = byNif.get(key);
    const base = inv.taxBreakdown.reduce((s, b) => s + b.taxableBase, 0);
    if (existing) {
      existing.total = round2(existing.total + base);
      existing.count += 1;
    } else {
      byNif.set(key, {
        name: inv.recipient.name,
        country: typeof nif === "string" && nif.length >= 2 ? nif.slice(0, 2) : "??",
        total: base,
        count: 1,
      });
    }
  }

  const total = round2(Array.from(byNif.values()).reduce((s, v) => s + v.total, 0));

  return {
    modelo: "349",
    period: `T${quarter} ${year}`,
    status: "ok",
    resultado: 0, // Modelo informativo
    sections: [
      {
        title: `Operadores intracomunitarios (${byNif.size})`,
        fields: Array.from(byNif.entries()).map(([nif, v]) => ({
          label: `${v.country} · ${v.name}`,
          value: v.total,
          hint: `NIF-IVA ${nif} · ${v.count} operaciones`,
        })),
      },
      {
        title: "Total",
        fields: [{ label: "Total intracomunitarias", value: total }],
      },
    ],
    warnings: [],
    missing: [],
    summary: `${byNif.size} operadores UE · ${total.toFixed(2)}€ total`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 347 — OPERACIONES CON TERCEROS
// ═══════════════════════════════════════════════════════════════════════════════

export function draft347(year: number): FiscalDraft {
  const invoices = loadInvoices();
  const m347 = generateModelo347(invoices, year);

  if (m347.entries.length === 0) {
    return emptyDraft("347", `Anual ${year}`, "Ningún tercero supera el umbral de 3.005,06€/año.");
  }

  return {
    modelo: "347",
    period: `Anual ${year}`,
    status: "ok",
    resultado: 0,
    sections: [
      {
        title: `Terceros con operaciones >3.005,06€ (${m347.entries.length})`,
        fields: m347.entries.map((e) => ({
          label: `${e.type === "cliente" ? "C" : "P"} · ${e.name} (${e.nif})`,
          value: e.totalAmount,
          hint: `T1 ${e.q1.toFixed(2)} · T2 ${e.q2.toFixed(2)} · T3 ${e.q3.toFixed(2)} · T4 ${e.q4.toFixed(2)} · ${e.invoiceCount} facturas`,
        })),
      },
    ],
    warnings: m347.entries.length > 50 ? ["Muchos terceros — verifica que ningún cliente con NIF anonimizado se haya colado."] : [],
    missing: [],
    summary: `${m347.entries.length} terceros declarables · total ${m347.entries.reduce((s, e) => s + e.totalAmount, 0).toFixed(2)}€`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 115 / 180 — RETENCIONES POR ALQUILERES
// ═══════════════════════════════════════════════════════════════════════════════

function calcRentalsForRange(start: Date, end: Date) {
  const cfg = loadFiscalConfig();
  let totalBase = 0;
  let totalRetention = 0;
  let totalIVA = 0;
  const breakdown: Array<{ name: string; nif: string; base: number; retention: number; iva: number }> = [];

  for (const r of cfg.rentals) {
    if (r.retentionExempt) continue;
    const rStart = new Date(r.startDate);
    const rEnd = r.endDate ? new Date(r.endDate) : new Date(2100, 0, 1);
    // Cuántos meses del rango hay dentro de la vigencia del contrato
    let months = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      if (cursor >= rStart && cursor <= rEnd) months += 1;
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (months === 0) continue;
    const base = round2(r.rentaMensualBase * months);
    const retention = round2(base * (r.retentionRate / 100));
    const iva = round2(base * (r.vatRate / 100));
    totalBase = round2(totalBase + base);
    totalRetention = round2(totalRetention + retention);
    totalIVA = round2(totalIVA + iva);
    breakdown.push({ name: r.arrendadorName, nif: r.arrendadorNif, base, retention, iva });
  }
  return { totalBase, totalRetention, totalIVA, breakdown };
}

export function draft115(year: number, quarter: Quarter): FiscalDraft {
  const cfg = loadFiscalConfig();
  if (cfg.rentals.length === 0) {
    return emptyDraft("115", `T${quarter} ${year}`, "No hay contratos de alquiler registrados en /admin/fiscal/configuracion.");
  }
  const { start, end } = getQuarterRange(year, quarter);
  const r = calcRentalsForRange(start, end);

  if (r.breakdown.length === 0) {
    return emptyDraft("115", `T${quarter} ${year}`, "Ningún contrato vigente con retención durante este trimestre.");
  }

  return {
    modelo: "115",
    period: `T${quarter} ${year}`,
    status: "ok",
    resultado: r.totalRetention,
    sections: [
      {
        title: `Arrendadores (${r.breakdown.length})`,
        fields: r.breakdown.map((b) => ({
          label: `${b.name} (${b.nif})`,
          value: b.retention,
          hint: `Base ${b.base.toFixed(2)}€ · IVA repercutido por arrendador ${b.iva.toFixed(2)}€`,
        })),
      },
      {
        title: "Resultado",
        fields: [
          { box: "01", label: "Nº perceptores", value: r.breakdown.length },
          { box: "02", label: "Base de retenciones", value: r.totalBase },
          { box: "03", label: "Retenciones e ingresos a cuenta", value: r.totalRetention },
        ],
      },
    ],
    warnings: [],
    missing: [],
    summary: `${r.breakdown.length} arrendadores · base ${r.totalBase.toFixed(2)}€ · a ingresar ${r.totalRetention.toFixed(2)}€`,
    generatedAt: new Date().toISOString(),
  };
}

export function draft180(year: number): FiscalDraft {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  const r = calcRentalsForRange(start, end);

  if (r.breakdown.length === 0) {
    return emptyDraft("180", `Anual ${year}`, "No hay alquileres con retención registrados.");
  }

  return {
    modelo: "180",
    period: `Anual ${year}`,
    status: "ok",
    resultado: r.totalRetention,
    sections: [
      {
        title: `Resumen anual de arrendadores (${r.breakdown.length})`,
        fields: r.breakdown.map((b) => ({
          label: `${b.name} (${b.nif})`,
          value: b.retention,
          hint: `Base anual ${b.base.toFixed(2)}€`,
        })),
      },
      {
        title: "Total anual",
        fields: [
          { label: "Base total anual", value: r.totalBase },
          { label: "Retenciones totales", value: r.totalRetention },
        ],
      },
    ],
    warnings: [],
    missing: [],
    summary: `Resumen anual ${r.breakdown.length} arrendadores · ${r.totalRetention.toFixed(2)}€ retenidos`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 123 / 193 — CAPITAL MOBILIARIO (DIVIDENDOS)
// ═══════════════════════════════════════════════════════════════════════════════

function calcDividendsForRange(start: Date, end: Date) {
  const cfg = loadFiscalConfig();
  const list = cfg.dividends.filter((d) => {
    const dt = new Date(d.date);
    return dt >= start && dt <= end;
  });
  let totalGross = 0;
  let totalRetention = 0;
  for (const d of list) {
    totalGross = round2(totalGross + d.grossAmount);
    totalRetention = round2(totalRetention + d.grossAmount * (d.retentionRate / 100));
  }
  return { list, totalGross, totalRetention };
}

export function draft123(year: number, quarter: Quarter): FiscalDraft {
  const { start, end } = getQuarterRange(year, quarter);
  const r = calcDividendsForRange(start, end);
  if (r.list.length === 0) {
    return emptyDraft("123", `T${quarter} ${year}`, "Ningún reparto de dividendos en este trimestre.");
  }
  return {
    modelo: "123",
    period: `T${quarter} ${year}`,
    status: "ok",
    resultado: r.totalRetention,
    sections: [
      {
        title: `Beneficiarios (${r.list.length})`,
        fields: r.list.map((d) => ({
          label: `${d.recipientName} (${d.recipientNif})`,
          value: round2(d.grossAmount * (d.retentionRate / 100)),
          hint: `Bruto ${d.grossAmount.toFixed(2)}€ · ret. ${d.retentionRate}%`,
        })),
      },
      {
        title: "Resultado",
        fields: [
          { label: "Base total", value: r.totalGross },
          { label: "Retenciones a ingresar", value: r.totalRetention },
        ],
      },
    ],
    warnings: [],
    missing: [],
    summary: `${r.list.length} repartos · ${r.totalRetention.toFixed(2)}€ a ingresar`,
    generatedAt: new Date().toISOString(),
  };
}

export function draft193(year: number): FiscalDraft {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  const r = calcDividendsForRange(start, end);
  if (r.list.length === 0) {
    return emptyDraft("193", `Anual ${year}`, "Sin dividendos repartidos este año.");
  }
  return {
    modelo: "193",
    period: `Anual ${year}`,
    status: "ok",
    resultado: r.totalRetention,
    sections: [
      {
        title: `Resumen anual (${r.list.length} repartos)`,
        fields: [
          { label: "Bruto total", value: r.totalGross },
          { label: "Retenciones totales", value: r.totalRetention },
        ],
      },
    ],
    warnings: [],
    missing: [],
    summary: `Anual: ${r.totalRetention.toFixed(2)}€ retenidos`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 202 — PAGO FRACCIONADO IS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Período del 202:
 *   1P (abril): cierre marzo (resultado enero-marzo)
 *   2P (octubre): cierre septiembre (resultado enero-septiembre)
 *   3P (diciembre): cierre noviembre (resultado enero-noviembre)
 */
export function draft202(year: number, period: "1P" | "2P" | "3P"): FiscalDraft {
  const cfg = loadFiscalConfig();
  const m = cfg.modelo202;
  const sections: DraftSection[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  // Resultado contable acumulado del período (P&G)
  const lastMonth = period === "1P" ? 3 : period === "2P" ? 9 : 11;
  const start = new Date(year, 0, 1);
  const end = new Date(year, lastMonth, 0, 23, 59, 59, 999);
  const invoices = loadInvoices();
  const periodInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate);
    return d >= start && d <= end && inv.status !== "anulada";
  });
  const ingresos = round2(periodInvoices.reduce((s, inv) => s + inv.totals.totalTaxableBase, 0));

  let cuotaCalculada = 0;

  if (m.method === "cuota") {
    if (!m.lastIsCuota || m.lastIsCuota <= 0) {
      missing.push("Falta indicar la cuota íntegra del último modelo 200 presentado en /admin/fiscal/configuracion.");
    } else {
      // Art. 40.2 LIS: 18% sobre cuota íntegra del último 200
      cuotaCalculada = round2(m.lastIsCuota * 0.18);
      sections.push({
        title: "Cálculo método cuota (art. 40.2 LIS)",
        fields: [
          { label: "Cuota íntegra último 200", value: m.lastIsCuota, hint: m.lastIsYear ? `Año ${m.lastIsYear}` : undefined },
          { label: "% aplicable", value: 18 },
          { label: "Pago fraccionado", value: cuotaCalculada },
        ],
      });
    }
  } else {
    // Método base — 17% sobre resultado del período
    const tipo = m.basePercentage ?? 17;
    cuotaCalculada = round2(ingresos * (tipo / 100));
    sections.push({
      title: "Cálculo método base (art. 40.3 LIS)",
      fields: [
        { label: "Ingresos acumulados período", value: ingresos, hint: `Enero a ${["", "marzo", "junio", "septiembre", "diciembre"][[3,6,9,11].indexOf(lastMonth) + 1] || `mes ${lastMonth}`}` },
        { label: "% aplicable", value: tipo },
        { label: "Pago fraccionado (estimado)", value: cuotaCalculada },
      ],
    });
    missing.push("Método base requiere conocer GASTOS deducibles para calcular el resultado contable real. El sistema solo conoce ingresos por facturación; el cálculo definitivo lo debe hacer la gestoría con la P&G completa.");
  }

  if (cuotaCalculada === 0) warnings.push("Aunque el resultado sea 0, el modelo 202 ES OBLIGATORIO presentarlo.");

  return {
    modelo: "202",
    period: `${period} ${year}`,
    status: missing.length > 0 ? "incomplete" : "ok",
    resultado: cuotaCalculada,
    sections,
    warnings,
    missing,
    summary: `Método ${m.method} · pago fraccionado ${cuotaCalculada.toFixed(2)}€`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 232 — OPERACIONES VINCULADAS
// ═══════════════════════════════════════════════════════════════════════════════

export function draft232(year: number): FiscalDraft {
  const cfg = loadFiscalConfig();
  const ops = cfg.relatedParties.filter((o) => o.fiscalYear === year);
  if (ops.length === 0) {
    return emptyDraft("232", `Anual ${year}`, "No hay operaciones vinculadas registradas para este ejercicio.");
  }

  // Por entidad: si suma >250.000€ → declarar
  const byNif = new Map<string, { name: string; total: number; ops: typeof ops }>();
  for (const op of ops) {
    const ex = byNif.get(op.nif);
    if (ex) {
      ex.total = round2(ex.total + op.annualAmount);
      ex.ops.push(op);
    } else {
      byNif.set(op.nif, { name: op.name, total: op.annualAmount, ops: [op] });
    }
  }

  const declarables = Array.from(byNif.entries()).filter(([, v]) => v.total >= 250000);
  const paraisos = ops.filter((o) => o.relationship === "paraiso");

  if (declarables.length === 0 && paraisos.length === 0) {
    return emptyDraft("232", `Anual ${year}`, "Ninguna entidad supera el umbral de 250.000€ y no hay operaciones con paraísos fiscales.");
  }

  return {
    modelo: "232",
    period: `Anual ${year}`,
    status: "ok",
    resultado: 0,
    sections: [
      {
        title: `Entidades vinculadas declarables (${declarables.length})`,
        fields: declarables.map(([nif, v]) => ({
          label: `${v.name} (${nif})`,
          value: v.total,
          hint: `${v.ops.length} operaciones`,
        })),
      },
      ...(paraisos.length > 0
        ? [{
            title: `Operaciones con paraísos fiscales (${paraisos.length})`,
            fields: paraisos.map((o) => ({
              label: `${o.name} (${o.nif})`,
              value: o.annualAmount,
              hint: o.opType,
            })),
          }]
        : []),
    ],
    warnings: paraisos.length > 0 ? ["Operaciones con paraísos fiscales — declaración obligatoria sin importar importe."] : [],
    missing: [],
    summary: `${declarables.length} entidades + ${paraisos.length} paraísos`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 369 — OSS VENTANILLA ÚNICA (B2C UE)
// ═══════════════════════════════════════════════════════════════════════════════

const VAT_BY_COUNTRY: Record<string, number> = {
  // Tipos generales UE 2026 (verificar actualizaciones)
  AT: 20, BE: 21, BG: 20, HR: 25, CY: 19, CZ: 21, DK: 25, EE: 22, FI: 25.5,
  FR: 20, DE: 19, GR: 24, HU: 27, IE: 23, IT: 22, LV: 21, LT: 21, LU: 17,
  MT: 18, NL: 21, PL: 23, PT: 23, RO: 21, SK: 23, SI: 22, SE: 25,
};

function extractCountryFromOrder(order: { address?: string; shippingAddress?: { country?: string } }): string | null {
  const c = order.shippingAddress?.country;
  if (c) return c.toUpperCase().slice(0, 2);
  if (typeof order.address === "string") {
    const m = order.address.match(/,\s*([A-Z]{2})\s*$/i);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

export function draft369(year: number, quarter: Quarter): FiscalDraft {
  const cfg = loadFiscalConfig();
  if (!cfg.oss.registered) {
    return {
      ...emptyDraft("369", `T${quarter} ${year}`, "No estás dado de alta en OSS (modelo 035)."),
      warnings: ["Si tienes ventas B2C UE > 10.000€/año, debes registrarte en OSS o repercutir IVA local en cada país."],
      missing: ["Registro OSS pendiente — alta vía modelo 035."],
    };
  }

  const { start, end } = getQuarterRange(year, quarter);
  const orders = readAdminOrdersMerged([]);
  const ueOrders = orders.filter((o) => {
    const d = new Date(o.date ?? "");
    if (d < start || d > end) return false;
    const country = extractCountryFromOrder(o as { address?: string; shippingAddress?: { country?: string } });
    if (!country || country === "ES") return false;
    return Object.keys(VAT_BY_COUNTRY).includes(country);
  });

  if (ueOrders.length === 0) {
    return emptyDraft("369", `T${quarter} ${year}`, "Sin ventas B2C UE este trimestre.");
  }

  const byCountry = new Map<string, { count: number; base: number; iva: number }>();
  for (const o of ueOrders) {
    const country = extractCountryFromOrder(o as { address?: string; shippingAddress?: { country?: string } })!;
    const rate = VAT_BY_COUNTRY[country] / 100;
    // Total del pedido / (1 + rate) = base
    const total = (o as { total?: number }).total ?? 0;
    const base = round2(total / (1 + rate));
    const iva = round2(total - base);
    const existing = byCountry.get(country);
    if (existing) {
      existing.count += 1;
      existing.base = round2(existing.base + base);
      existing.iva = round2(existing.iva + iva);
    } else {
      byCountry.set(country, { count: 1, base, iva });
    }
  }

  const totalIva = round2(Array.from(byCountry.values()).reduce((s, v) => s + v.iva, 0));

  return {
    modelo: "369",
    period: `T${quarter} ${year}`,
    status: "ok",
    resultado: totalIva,
    sections: [
      {
        title: `Ventas por país UE (${byCountry.size} países)`,
        fields: Array.from(byCountry.entries()).map(([c, v]) => ({
          label: `${c} (${VAT_BY_COUNTRY[c]}% IVA local)`,
          value: v.iva,
          hint: `${v.count} pedidos · base ${v.base.toFixed(2)}€`,
        })),
      },
      {
        title: "Total a ingresar",
        fields: [{ label: "IVA OSS total", value: totalIva }],
      },
    ],
    warnings: [
      "Tipos IVA de cada país verificar en https://taxation-customs.ec.europa.eu/",
      "El detalle anonimiza al cliente pero conserva el desglose por país (suficiente para el 369).",
    ],
    missing: [],
    summary: `${ueOrders.length} pedidos UE · ${byCountry.size} países · ${totalIva.toFixed(2)}€ IVA OSS`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 720 — BIENES EN EL EXTRANJERO
// ═══════════════════════════════════════════════════════════════════════════════

export function draft720(year: number): FiscalDraft {
  const cfg = loadFiscalConfig();
  const assets = cfg.foreignAssets.filter((a) => a.fiscalYear === year);

  if (assets.length === 0) {
    return emptyDraft("720", `Anual ${year}`, "No hay bienes en el extranjero registrados.");
  }

  // Bloques C/V/I y comprobar umbrales de 50.000€
  const byBlock = { C: 0, V: 0, I: 0 };
  for (const a of assets) byBlock[a.block] = round2(byBlock[a.block] + a.yearEndValue);

  const triggered = (Object.keys(byBlock) as Array<"C" | "V" | "I">).filter((b) => byBlock[b] > 50000);

  if (triggered.length === 0) {
    return emptyDraft("720", `Anual ${year}`, "Ningún bloque supera los 50.000€ — no hay obligación de presentar.");
  }

  return {
    modelo: "720",
    period: `Anual ${year}`,
    status: "ok",
    resultado: 0,
    sections: [
      {
        title: "Bloques a declarar",
        fields: triggered.map((b) => ({
          label: `Bloque ${b} ${b === "C" ? "(Cuentas)" : b === "V" ? "(Valores)" : "(Inmuebles)"}`,
          value: byBlock[b],
          hint: `Supera el umbral de 50.000€`,
        })),
      },
      {
        title: `Activos (${assets.length})`,
        fields: assets.map((a) => ({
          label: `[${a.block}] ${a.entity} · ${a.country}`,
          value: a.yearEndValue,
          hint: a.identifier,
        })),
      },
    ],
    warnings: [],
    missing: [],
    summary: `${assets.length} activos · ${triggered.length} bloques con obligación`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 111 / 190 — RETENCIONES IRPF (PROFESIONALES)
// ═══════════════════════════════════════════════════════════════════════════════
// Estos modelos requieren registro de facturas de proveedores con retención.
// Por ahora devolvemos un borrador "incomplete" indicando la limitación.

export function draft111(year: number, quarter: Quarter): FiscalDraft {
  const ret = getRetentionsForQuarter(year, quarter);
  // Solo proveedores con categoria "servicios_profesionales" → Modelo 111
  const list = getSupplierInvoicesByQuarter(year, quarter).filter(
    (s) => s.category === "servicios_profesionales" && s.totalRetention > 0,
  );

  if (list.length === 0) {
    return emptyDraft(
      "111",
      `T${quarter} ${year}`,
      "Sin facturas de proveedores profesionales con retención IRPF en este trimestre.",
    );
  }

  return {
    modelo: "111",
    period: `T${quarter} ${year}`,
    status: "ok",
    resultado: ret.mod111,
    sections: [
      {
        title: `Perceptores (${list.length})`,
        fields: list.map((inv) => ({
          label: `${inv.supplier.name} (${inv.supplier.taxId})`,
          value: inv.totalRetention,
          hint: `Base ${inv.totalTaxableBase.toFixed(2)}€ · Factura ${inv.supplierInvoiceNumber} (${inv.invoiceDate})`,
        })),
      },
      {
        title: "Resultado",
        fields: [
          { box: "01", label: "Nº perceptores", value: list.length },
          {
            box: "02",
            label: "Base de retenciones",
            value: round2(list.reduce((s, i) => s + i.totalTaxableBase, 0)),
          },
          { box: "03", label: "Retenciones a ingresar", value: ret.mod111 },
        ],
      },
    ],
    warnings: [],
    missing: [],
    summary: `${list.length} perceptores · retenciones ${ret.mod111.toFixed(2)}€`,
    generatedAt: new Date().toISOString(),
  };
}

export function draft190(year: number): FiscalDraft {
  const all = getSupplierInvoicesByYear(year).filter(
    (s) => s.category === "servicios_profesionales" && s.totalRetention > 0,
  );
  if (all.length === 0) {
    return emptyDraft(
      "190",
      `Anual ${year}`,
      "Sin retenciones IRPF a profesionales en el ejercicio — Modelo 190 no procede.",
    );
  }

  // Agrupar por NIF del proveedor para no duplicar perceptores
  const byNif = new Map<
    string,
    { name: string; nif: string; base: number; retention: number; count: number }
  >();
  for (const inv of all) {
    const key = inv.supplier.taxId;
    const cur = byNif.get(key) ?? {
      name: inv.supplier.name,
      nif: inv.supplier.taxId,
      base: 0,
      retention: 0,
      count: 0,
    };
    cur.base = round2(cur.base + inv.totalTaxableBase);
    cur.retention = round2(cur.retention + inv.totalRetention);
    cur.count += 1;
    byNif.set(key, cur);
  }
  const perceptores = Array.from(byNif.values()).sort((a, b) => b.retention - a.retention);
  const totalRetencion = round2(perceptores.reduce((s, p) => s + p.retention, 0));
  const totalBase = round2(perceptores.reduce((s, p) => s + p.base, 0));

  return {
    modelo: "190",
    period: `Anual ${year}`,
    status: "ok",
    resultado: totalRetencion,
    sections: [
      {
        title: `Perceptores (${perceptores.length})`,
        fields: perceptores.map((p) => ({
          label: `${p.name} (${p.nif})`,
          value: p.retention,
          hint: `Base ${p.base.toFixed(2)}€ · ${p.count} facturas`,
        })),
      },
      {
        title: "Totales anuales",
        fields: [
          { label: "Base total retenciones", value: totalBase },
          { label: "Total retenido", value: totalRetencion },
        ],
      },
    ],
    warnings: [],
    missing: [],
    summary: `${perceptores.length} perceptores · retenciones anuales ${totalRetencion.toFixed(2)}€`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 200 — IMPUESTO SOCIEDADES (anual)
// ═══════════════════════════════════════════════════════════════════════════════

export function draft200(year: number): FiscalDraft {
  const cfg = loadFiscalConfig();
  const invoices = loadInvoices();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  const periodInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate);
    return d >= start && d <= end && inv.status !== "anulada";
  });
  const ingresos = round2(periodInvoices.reduce((s, inv) => s + inv.totals.totalTaxableBase, 0));

  const tipoIS = cfg.company.tipoReducidoIS && cfg.company.yearOfIncorporation
    ? (year - cfg.company.yearOfIncorporation < 2 ? 15 : 25)
    : 25;

  return {
    modelo: "200",
    period: `Anual ${year}`,
    status: "incomplete",
    resultado: 0,
    sections: [
      {
        title: "Datos disponibles",
        fields: [
          { label: "Ingresos por facturación", value: ingresos },
          { label: "Tipo IS aplicable", value: tipoIS, hint: tipoIS === 15 ? "Tipo reducido nuevas (2 primeros años)" : "General" },
        ],
      },
    ],
    warnings: ["El IS requiere balance + cuenta P&G completa (gastos, amortización, ajustes fiscales). El sistema solo aporta ingresos."],
    missing: [
      "Cuenta de pérdidas y ganancias completa (con gastos deducibles y amortizaciones).",
      "Balance de situación a cierre.",
      "Memoria.",
      "Ajustes fiscales (provisiones, deducciones, bases imponibles negativas...).",
    ],
    summary: `Ingresos brutos ${ingresos.toFixed(2)}€ · cálculo definitivo en gestoría`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTRASTAT — mensual
// ═══════════════════════════════════════════════════════════════════════════════

export function draftIntrastat(year: number, month: number): FiscalDraft {
  const cfg = loadFiscalConfig();
  if (!cfg.intrastat.thresholdIntroducciones && !cfg.intrastat.thresholdExpediciones) {
    return emptyDraft("INTRASTAT", `${String(month).padStart(2, "0")}/${year}`, "Umbrales Intrastat no superados — no hay obligación.");
  }

  const { start, end } = getMonthRange(year, month);
  const orders = readAdminOrdersMerged([]);
  const expediciones = orders.filter((o) => {
    const d = new Date(o.date ?? "");
    if (d < start || d > end) return false;
    const country = extractCountryFromOrder(o as { address?: string; shippingAddress?: { country?: string } });
    return country && country !== "ES" && Object.keys(VAT_BY_COUNTRY).includes(country);
  });

  if (expediciones.length === 0 && !cfg.intrastat.thresholdIntroducciones) {
    return emptyDraft("INTRASTAT", `${String(month).padStart(2, "0")}/${year}`, "Sin operaciones UE este mes.");
  }

  const byCountry = new Map<string, { count: number; total: number }>();
  for (const o of expediciones) {
    const country = extractCountryFromOrder(o as { address?: string; shippingAddress?: { country?: string } })!;
    const total = (o as { total?: number }).total ?? 0;
    const ex = byCountry.get(country);
    if (ex) {
      ex.count += 1;
      ex.total = round2(ex.total + total);
    } else {
      byCountry.set(country, { count: 1, total });
    }
  }

  return {
    modelo: "INTRASTAT",
    period: `${String(month).padStart(2, "0")}/${year}`,
    status: "incomplete",
    resultado: 0,
    sections: [
      {
        title: `Expediciones (ventas) UE (${byCountry.size} países)`,
        fields: Array.from(byCountry.entries()).map(([c, v]) => ({
          label: c,
          value: v.total,
          hint: `${v.count} envíos`,
        })),
      },
    ],
    warnings: ["Falta clasificación TARIC por producto y peso neto — no se puede presentar sin esos datos."],
    missing: [
      cfg.intrastat.defaultTaricCode ? `Código TARIC default: ${cfg.intrastat.defaultTaricCode}` : "Código TARIC por defecto no configurado.",
      "Peso neto por envío — no registrado en pedidos.",
      "Introducciones (compras UE): pendiente módulo de compras.",
    ],
    summary: `${expediciones.length} expediciones · ${byCountry.size} países UE`,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve el borrador del modelo solicitado para el período.
 *
 * `period` espera:
 *   - Trimestre: "T1 2026"
 *   - Anual: "Anual 2026"
 *   - 202: "1P 2026" / "2P 2026" / "3P 2026"
 *   - INTRASTAT: "MM/YYYY" (ej "03/2026")
 */
export function generateDraft(modelo: string, period: string): FiscalDraft | null {
  // Trimestre
  const tMatch = period.match(/^T([1-4])\s+(\d{4})$/);
  // Anual
  const aMatch = period.match(/^Anual\s+(\d{4})$/);
  // 202
  const pMatch = period.match(/^([123])P\s+(\d{4})$/);
  // Intrastat
  const iMatch = period.match(/^(\d{2})\/(\d{4})$/);

  if (modelo === "303" && tMatch) return draft303(Number(tMatch[2]), Number(tMatch[1]) as Quarter);
  if (modelo === "390" && aMatch) return draft390(Number(aMatch[1]));
  if (modelo === "349" && tMatch) return draft349(Number(tMatch[2]), Number(tMatch[1]) as Quarter);
  if (modelo === "347" && aMatch) return draft347(Number(aMatch[1]));
  if (modelo === "115" && tMatch) return draft115(Number(tMatch[2]), Number(tMatch[1]) as Quarter);
  if (modelo === "180" && aMatch) return draft180(Number(aMatch[1]));
  if (modelo === "123" && tMatch) return draft123(Number(tMatch[2]), Number(tMatch[1]) as Quarter);
  if (modelo === "193" && aMatch) return draft193(Number(aMatch[1]));
  if (modelo === "202" && pMatch) return draft202(Number(pMatch[2]), `${pMatch[1]}P` as "1P" | "2P" | "3P");
  if (modelo === "232" && aMatch) return draft232(Number(aMatch[1]));
  if (modelo === "369" && tMatch) return draft369(Number(tMatch[2]), Number(tMatch[1]) as Quarter);
  if (modelo === "720" && aMatch) return draft720(Number(aMatch[1]));
  if (modelo === "111" && tMatch) return draft111(Number(tMatch[2]), Number(tMatch[1]) as Quarter);
  if (modelo === "190" && aMatch) return draft190(Number(aMatch[1]));
  if (modelo === "200" && aMatch) return draft200(Number(aMatch[1]));
  if (modelo === "INTRASTAT" && iMatch) return draftIntrastat(Number(iMatch[2]), Number(iMatch[1]));

  return null;
}

// Re-exports para integración con tests / scripts
export { loadFiscalConfig as _loadFiscalConfig } from "@/services/fiscalConfigService";
