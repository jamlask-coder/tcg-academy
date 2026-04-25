/**
 * Fiscal draft export — CSV + PDF
 * ================================
 * Convierte un `FiscalDraft` (borrador auto-generado de modelo AEAT) en:
 *  - CSV plano (apto para gestoría / Excel)
 *  - HTML imprimible que el navegador convierte a PDF (window.print)
 *
 * No depende de librerías externas: usamos el nativo `window.print()`
 * sobre un documento autocontenido (mismo patrón que la factura).
 */

import type { FiscalDraft } from "@/services/fiscalDrafts";
import { SITE_CONFIG } from "@/config/siteConfig";

// ── CSV ─────────────────────────────────────────────────────────────────────

function csvEscape(v: string | number | undefined): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtNumber(n: number): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Devuelve una representación CSV del borrador. Una fila por casilla.
 * Campos: Sección · Casilla · Etiqueta · Valor · Notas.
 */
export function draftToCsv(draft: FiscalDraft): string {
  const rows: string[] = [];
  rows.push(["Sección", "Casilla", "Etiqueta", "Valor (EUR)", "Notas"].join(";"));
  for (const section of draft.sections) {
    for (const f of section.fields) {
      rows.push(
        [
          csvEscape(section.title),
          csvEscape(f.box ?? ""),
          csvEscape(f.label),
          csvEscape(fmtNumber(f.value)),
          csvEscape(f.hint ?? ""),
        ].join(";"),
      );
    }
  }
  rows.push("");
  rows.push(["", "", "Resultado", csvEscape(fmtNumber(draft.resultado)), ""].join(";"));
  if (draft.warnings.length > 0) {
    rows.push("");
    rows.push("Avisos");
    for (const w of draft.warnings) rows.push(csvEscape(w));
  }
  if (draft.missing.length > 0) {
    rows.push("");
    rows.push("Datos pendientes");
    for (const m of draft.missing) rows.push(csvEscape(m));
  }
  return rows.join("\n");
}

/**
 * Descarga el CSV (cliente). Genera un nombre de archivo del estilo
 * `borrador-303-2026Q1.csv`.
 */
export function downloadDraftCsv(draft: FiscalDraft): void {
  if (typeof window === "undefined") return;
  const csv = draftToCsv(draft);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `borrador-${draft.modelo}-${draft.period}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PDF (vía window.print) ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Devuelve un documento HTML autocontenido (con estilos inline) listo para
 * imprimir como PDF. Mismo patrón que la factura: pestaña nueva → window.print().
 */
export function draftToPrintableHtml(draft: FiscalDraft): string {
  const generatedDate = new Date(draft.generatedAt).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel =
    draft.status === "ok"
      ? "Borrador listo"
      : draft.status === "incomplete"
        ? "Faltan datos"
        : "No procede";

  const sectionsHtml = draft.sections
    .map(
      (s) => `
      <section class="block">
        <h3>${escapeHtml(s.title)}</h3>
        <table>
          <thead>
            <tr><th class="box">Casilla</th><th>Concepto</th><th class="num">Importe (€)</th></tr>
          </thead>
          <tbody>
            ${s.fields
              .map(
                (f) => `
                <tr>
                  <td class="box">${escapeHtml(f.box ?? "—")}</td>
                  <td>
                    ${escapeHtml(f.label)}
                    ${f.hint ? `<div class="hint">${escapeHtml(f.hint)}</div>` : ""}
                  </td>
                  <td class="num">${fmtNumber(f.value)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </section>`,
    )
    .join("");

  const warningsHtml = draft.warnings.length
    ? `<section class="block warn">
        <h3>Avisos</h3>
        <ul>${draft.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
      </section>`
    : "";

  const missingHtml = draft.missing.length
    ? `<section class="block missing">
        <h3>Datos pendientes</h3>
        <ul>${draft.missing.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>
      </section>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Borrador modelo ${escapeHtml(draft.modelo)} — ${escapeHtml(draft.period)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #111827;
      margin: 0;
      padding: 32px;
      background: #fff;
      font-size: 12px;
      line-height: 1.4;
    }
    header.doc {
      border-bottom: 2px solid #111827;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    header.doc h1 { margin: 0; font-size: 20px; }
    header.doc .meta { text-align: right; font-size: 11px; color: #6b7280; }
    header.doc .meta strong { color: #111827; }
    .summary {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-style: italic;
      color: #374151;
    }
    .resultado {
      display: inline-block;
      border-radius: 4px;
      padding: 4px 10px;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      margin-bottom: 16px;
    }
    .status {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 10px;
      font-weight: 700;
      margin-left: 6px;
    }
    .status.ok { background: #dcfce7; color: #166534; }
    .status.incomplete { background: #fef3c7; color: #92400e; }
    .status.skip { background: #f3f4f6; color: #4b5563; }
    section.block { margin-bottom: 14px; page-break-inside: avoid; }
    section.block h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin: 0 0 6px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; text-align: left; vertical-align: top; }
    th {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }
    td { border-bottom: 1px solid #f3f4f6; }
    .box { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #6b7280; width: 70px; }
    .num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .hint { color: #9ca3af; font-size: 10px; margin-top: 2px; }
    .warn ul, .missing ul { margin: 4px 0; padding-left: 18px; }
    .warn { color: #92400e; }
    .missing { color: #b91c1c; }
    footer.doc {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { padding: 12mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <header class="doc">
    <div>
      <h1>Borrador modelo ${escapeHtml(draft.modelo)}</h1>
      <p style="margin: 4px 0 0; color: #6b7280;">
        Período <strong>${escapeHtml(draft.period)}</strong>
        <span class="status ${draft.status}">${escapeHtml(statusLabel)}</span>
      </p>
    </div>
    <div class="meta">
      <div><strong>${escapeHtml(SITE_CONFIG.legalName)}</strong></div>
      <div>CIF ${escapeHtml(SITE_CONFIG.cif)}</div>
      <div>Generado: ${escapeHtml(generatedDate)}</div>
    </div>
  </header>

  <p class="summary">${escapeHtml(draft.summary)}</p>

  ${
    draft.resultado !== 0
      ? `<div class="resultado">${draft.resultado >= 0 ? "A ingresar" : "A devolver"}: ${fmtNumber(Math.abs(draft.resultado))} €</div>`
      : ""
  }

  ${sectionsHtml}
  ${warningsHtml}
  ${missingHtml}

  <footer class="doc">
    Documento generado automáticamente por TCG Academy. Borrador no vinculante —
    debe verificarse antes de su presentación en la Sede Electrónica de la AEAT.
  </footer>

  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 250));
  </script>
</body>
</html>`;
}

/**
 * Abre el borrador en una nueva pestaña ya lista para imprimir como PDF.
 * El usuario elige "Guardar como PDF" en el diálogo del navegador.
 */
export function printDraftAsPdf(draft: FiscalDraft): void {
  if (typeof window === "undefined") return;
  const html = draftToPrintableHtml(draft);
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
