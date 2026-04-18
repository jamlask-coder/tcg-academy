"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { AdminOrder } from "@/data/mockData";

// ─── Carriers (transportistas soportados) ─────────────────────────────────────

export type Carrier = "GLS" | "Correos";
export const CARRIERS: Carrier[] = ["GLS", "Correos"];

export function buildTrackingUrl(carrier: Carrier, tracking: string): string {
  const t = encodeURIComponent(tracking);
  if (carrier === "Correos") {
    return `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${t}`;
  }
  return `https://www.gls-spain.es/es/seguimiento-envios/?match=${t}`;
}

// ─── ShipModal ───────────────────────────────────────────────────────────────
// Se muestra al cambiar un pedido a "enviado". Pide número de seguimiento +
// transportista y, al confirmar, marca el pedido como enviado y manda al
// comprador el email "Pedido enviado" con el link de tracking correcto.

interface ShipModalProps {
  order: AdminOrder;
  onClose: () => void;
  onConfirm: (tracking: string, carrier: Carrier) => void;
}

export function ShipModal({ order, onClose, onConfirm }: ShipModalProps) {
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [carrier, setCarrier] = useState<Carrier>("GLS");
  const trimmed = tracking.trim();
  const canSubmit = trimmed.length >= 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Marcar como enviado</h3>
            <p className="text-xs text-gray-500">
              Pedido {order.id} · {order.userName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="ship-tracking">
              Número de seguimiento
            </label>
            <input
              id="ship-tracking"
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              autoFocus
              placeholder="Ej. 12345678901234"
              className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              El código que aparece en el albarán del transportista.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-gray-600">Transportista</span>
            <div className="flex gap-2">
              {CARRIERS.map((c) => {
                const active = carrier === c;
                const activeClasses =
                  c === "Correos"
                    ? "border-amber-400 bg-amber-400 text-gray-900"
                    : "border-[#2563eb] bg-[#2563eb] text-white";
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCarrier(c)}
                    className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? activeClasses
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                    aria-pressed={active}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Por defecto GLS. Cambia a Correos si usas ese servicio.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => canSubmit && onConfirm(trimmed, carrier)}
            disabled={!canSubmit}
            className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aceptar y enviar email al comprador
          </button>
        </div>
      </div>
    </div>
  );
}
