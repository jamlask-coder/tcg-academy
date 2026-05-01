"use client";
import { useState } from "react";
import { Search, CheckCircle, XCircle, FileText, Shield } from "lucide-react";
import { MOCK_INVOICES } from "@/data/mockData";

type VerifyResult =
  | { found: true; id: string; date: string; total: number; clientName: string | undefined; status: string }
  | { found: false };

export default function VerificarFacturaPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    // Check CSV store first (codes generated from admin invoice PDFs)
    try {
      const csvStore: Record<string, string> = JSON.parse(
        localStorage.getItem("tcgacademy_invoice_csv") ?? "{}",
      );
      const matchedOrderId = Object.entries(csvStore).find(
        ([, csv]) => csv.toUpperCase() === trimmed,
      )?.[0];
      if (matchedOrderId) {
        const { ADMIN_ORDERS } = await import("@/data/mockData");
        const order = ADMIN_ORDERS.find((o) => o.id === matchedOrderId);
        if (order) {
          setResult({
            found: true,
            id: `FAC-${order.id.replace("TCG-", "")}`,
            date: order.date,
            total: order.total,
            clientName: order.userName,
            status: order.adminStatus === "enviado" ? "pagada" : "pendiente",
          });
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    // Fallback: check mock invoices ONLY in development. En producción NUNCA
    // devolver datos de MOCK_INVOICES — es un endpoint público y mostraría
    // PII falsa (nombre/total/fecha de un cliente demo) como si fuera real.
    // Bug 2026-04-30 (mega test puntos ciegos).
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      const inv = MOCK_INVOICES.find(
        (i) => i.id.toUpperCase() === trimmed || i.orderId.toUpperCase() === trimmed,
      );
      if (inv) {
        setResult({
          found: true,
          id: inv.id,
          date: inv.date,
          total: inv.total,
          clientName: inv.clientName,
          status: inv.status,
        });
        setLoading(false);
        return;
      }
    }
    setResult({ found: false });
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563eb]">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Verificar factura
        </h1>
        <p className="mx-auto max-w-md text-gray-500">
          Introduce el número de factura o pedido para comprobar su autenticidad
          en el sistema VeriFactu de TCG Academy.
        </p>
      </div>

      {/* Verification form */}
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
            <FileText size={18} className="text-[#2563eb]" />
            Código de verificación
          </h2>

          <div className="flex gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="Ej: A1B2C3-XY12-FF00 (código CSV de la factura)"
              className="h-12 flex-1 rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
            />
            <button
              onClick={handleVerify}
              disabled={loading || !code.trim()}
              className="flex h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-5 font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Search size={16} />
              )}
              Verificar
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-6">
              {result.found ? (
                <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <CheckCircle size={28} className="text-green-500" />
                    <div>
                      <p className="font-bold text-green-800">
                        Factura verificada correctamente
                      </p>
                      <p className="text-sm text-green-600">
                        Esta factura existe en el sistema TCG Academy
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-green-200 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Número de factura</span>
                      <span className="font-mono font-bold text-gray-900">
                        {result.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha</span>
                      <span className="font-medium">{result.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold text-[#2563eb]">
                        {result.total.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${result.status === "pagada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {result.status === "pagada" ? "Pagada" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
                  <div className="flex items-center gap-3">
                    <XCircle size={28} className="text-red-500" />
                    <div>
                      <p className="font-bold text-red-800">
                        Factura no encontrada
                      </p>
                      <p className="text-sm text-red-600">
                        No existe ninguna factura con ese número en nuestro
                        sistema. Si crees que es un error, contacta con
                        nosotros.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-700">
          <p className="font-semibold">¿Para qué sirve esta herramienta?</p>
          <p className="mt-1 text-blue-600">
            TCG Academy utiliza el sistema <strong>VeriFactu</strong> para
            garantizar la integridad de todas las facturas emitidas. Puedes
            verificar la autenticidad de cualquier factura de TCG Academy
            introduciendo su número aquí.
          </p>
        </div>
      </div>
    </div>
  );
}
