"use client";
import { useState, useMemo } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Link,
} from "lucide-react";
import { loadInvoices, verifyIntegrity } from "@/services/invoiceService";
import type { InvoiceRecord } from "@/types/fiscal";
import { VerifactuStatus } from "@/types/fiscal";
import { VERIFACTU_CONFIG } from "@/config/verifactuConfig";

function verifactuBadge(status: VerifactuStatus) {
  const map: Record<VerifactuStatus, { label: string; cls: string }> = {
    [VerifactuStatus.PENDIENTE]: {
      label: "Pendiente",
      cls: "bg-amber-100 text-amber-800",
    },
    [VerifactuStatus.ENVIADA]: {
      label: "Enviada",
      cls: "bg-blue-100 text-blue-800",
    },
    [VerifactuStatus.ACEPTADA]: {
      label: "Aceptada",
      cls: "bg-green-100 text-green-800",
    },
    [VerifactuStatus.RECHAZADA]: {
      label: "Rechazada",
      cls: "bg-red-100 text-red-800",
    },
  };
  const { label, cls } = map[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export default function VerifactuPage() {
  const [invoices] = useState<InvoiceRecord[]>(() => loadInvoices());
  const [integrityResult, setIntegrityResult] = useState<boolean | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [showProviderGuide, setShowProviderGuide] = useState(false);

  const stats = useMemo(
    () => ({
      pending: invoices.filter(
        (i) => i.verifactuStatus === VerifactuStatus.PENDIENTE,
      ).length,
      sent: invoices.filter(
        (i) => i.verifactuStatus === VerifactuStatus.ENVIADA,
      ).length,
      accepted: invoices.filter(
        (i) => i.verifactuStatus === VerifactuStatus.ACEPTADA,
      ).length,
      rejected: invoices.filter(
        (i) => i.verifactuStatus === VerifactuStatus.RECHAZADA,
      ).length,
    }),
    [invoices],
  );

  const last20 = useMemo(
    () =>
      [...invoices]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 20),
    [invoices],
  );

  const chainLast5 = useMemo(
    () =>
      [...invoices]
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .slice(-5),
    [invoices],
  );

  async function handleVerifyIntegrity() {
    setCheckingIntegrity(true);
    try {
      const result = await verifyIntegrity(invoices);
      setIntegrityResult(result);
    } finally {
      setCheckingIntegrity(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estado VeriFactu</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sistema de verificación de facturas — RD 1007/2023
        </p>
      </div>

      {/* Demo banner */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <AlertTriangle size={20} className="shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-900">
            Modo Demo — Sin conexión real con AEAT
          </p>
          <p className="text-sm text-amber-700">
            Modo actual: <strong>{VERIFACTU_CONFIG.mode}</strong>. Las facturas
            no se envían a la Agencia Tributaria. Consulta la guía de conexión
            más abajo para activar un proveedor real.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Pendientes",
            value: stats.pending,
            color: "#d97706",
            bgCls: "bg-amber-50 border-amber-200",
          },
          {
            label: "Enviadas",
            value: stats.sent,
            color: "#2563eb",
            bgCls: "bg-blue-50 border-blue-200",
          },
          {
            label: "Aceptadas",
            value: stats.accepted,
            color: "#16a34a",
            bgCls: "bg-green-50 border-green-200",
          },
          {
            label: "Rechazadas",
            value: stats.rejected,
            color: "#dc2626",
            bgCls: "bg-red-50 border-red-200",
          },
        ].map(({ label, value, color, bgCls }) => (
          <div key={label} className={`rounded-2xl border p-5 ${bgCls}`}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Integrity check */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-[#2563eb]" />
            <div>
              <p className="font-bold text-gray-900">
                Integridad de la cadena VeriFactu
              </p>
              <p className="text-sm text-gray-500">
                Verifica que ninguna factura ha sido manipulada.
              </p>
            </div>
          </div>
          <button
            onClick={handleVerifyIntegrity}
            disabled={checkingIntegrity}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {checkingIntegrity ? "Verificando…" : "Verificar integridad"}
          </button>
        </div>
        {integrityResult !== null && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${integrityResult ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
          >
            {integrityResult ? (
              <>
                <CheckCircle size={16} /> La cadena de hashes es correcta. No se
                han detectado manipulaciones.
              </>
            ) : (
              <>
                <XCircle size={16} /> ERROR: La cadena de hashes no coincide.
                Puede haberse manipulado alguna factura.
              </>
            )}
          </div>
        )}
      </div>

      {/* Chain visualization */}
      {chainLast5.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Link size={18} className="text-[#2563eb]" />
            <h2 className="font-bold text-gray-900">
              Visualización de la cadena (últimas {chainLast5.length})
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {chainLast5.map((inv, idx) => (
              <div key={inv.invoiceId} className="flex items-center gap-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                  <p className="text-xs font-bold text-[#2563eb]">
                    {inv.invoiceNumber}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">
                    {inv.verifactuChainHash
                      ? inv.verifactuChainHash.slice(0, 16) + "…"
                      : "sin hash"}
                  </p>
                </div>
                {idx < chainLast5.length - 1 && (
                  <span className="text-gray-300">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Cada factura encadena su hash con el de la anterior, garantizando la
            integridad.
          </p>
        </div>
      )}

      {/* Last 20 invoices table */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">
            Últimas {last20.length} facturas — Estado VeriFactu
          </h2>
        </div>
        {last20.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400">
            Sin facturas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left font-semibold">
                    Nº Factura
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Estado VeriFactu
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Hash (16 chars)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {last20.map((inv) => (
                  <tr key={inv.invoiceId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#2563eb]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {inv.totals.totalInvoice.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-center">
                      {verifactuBadge(inv.verifactuStatus)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(inv.verifactuTimestamp)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {inv.verifactuChainHash
                        ? inv.verifactuChainHash.slice(0, 16)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provider guide */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          onClick={() => setShowProviderGuide(!showProviderGuide)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="font-bold text-gray-900">
            Cómo conectar un proveedor VeriFactu real
          </span>
          {showProviderGuide ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </button>
        {showProviderGuide && (
          <div className="space-y-3 border-t border-gray-100 px-6 py-5 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">
              Pasos para activar un proveedor real:
            </p>
            <ol className="list-inside list-decimal space-y-2">
              <li>
                Contrata un proveedor certificado (Seres, Edicom, B2Brouter,
                Wolters Kluwer…).
              </li>
              <li>
                Abre{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  src/config/verifactuConfig.ts
                </code>{" "}
                y rellena{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  apiUrl
                </code>
                ,{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  apiKey
                </code>{" "}
                y{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  companyId
                </code>
                .
              </li>
              <li>
                Cambia el campo{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  mode
                </code>{" "}
                a{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  &ldquo;sandbox&rdquo;
                </code>{" "}
                para pruebas o{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  &ldquo;production&rdquo;
                </code>{" "}
                para producción real.
              </li>
              <li>
                Crea{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  src/services/providers/TuProveedorVerifactuProvider.ts
                </code>{" "}
                implementando la interfaz{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  VerifactuProvider
                </code>
                .
              </li>
              <li>
                En{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  src/services/verifactuService.ts
                </code>
                , función{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  getVerifactuProvider()
                </code>
                , sustituye{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  MockVerifactuProvider
                </code>{" "}
                por tu proveedor. <strong>Solo cambia una línea.</strong>
              </li>
              <li>
                Guarda las credenciales en{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  .env.local
                </code>{" "}
                (nunca en el código fuente).
              </li>
            </ol>
            <p className="pt-2 text-xs text-gray-400">
              El plazo máximo de envío a AEAT es de 4 días naturales desde la
              emisión (RD 1007/2023).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
