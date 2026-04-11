"use client";
import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Package,
  MapPin,
  CreditCard,
  Truck,
  Copy,
  Check,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Ban,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { MOCK_ORDERS } from "@/data/mockData";
import {
  printInvoice,
  buildInvoiceFromOrder,
  generateInvoiceNumber,
} from "@/utils/invoiceGenerator";

type OrderStatus = "pedido" | "enviado" | "entregado" | "incidencia" | "cancelado" | "devolucion";

const STATUS_CFG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pedido:     { label: "Pendiente de envío", color: "#c2410c", bg: "#fff7ed",  icon: Clock        },
  enviado:    { label: "Enviado",             color: "#7c3aed", bg: "#ede9fe",  icon: Truck        },
  entregado:  { label: "Entregado",           color: "#16a34a", bg: "#dcfce7",  icon: CheckCircle  },
  incidencia: { label: "Incidencia",          color: "#dc2626", bg: "#fee2e2",  icon: AlertTriangle },
  cancelado:  { label: "Cancelado",           color: "#374151", bg: "#f3f4f6",  icon: Ban          },
  devolucion: { label: "Devolución",          color: "#6d28d9", bg: "#ede9fe",  icon: RotateCcw    },
};

const GAME_EMOJI: Record<string, string> = {
  magic: "🧙", pokemon: "⚡", "one-piece": "☠️", naruto: "🍃",
  yugioh: "⭐", lorcana: "✨", riftbound: "🌀", topps: "⚽", "dragon-ball": "🐉",
};

// Timeline progression: how many steps are "done" for each status
const TIMELINE_STEPS = [
  { label: "Pedido confirmado", icon: CheckCircle },
  { label: "En preparación",    icon: Package     },
  { label: "Enviado",           icon: Truck       },
  { label: "En reparto",        icon: Truck       },
  { label: "Entregado",         icon: CheckCircle },
];
const TIMELINE_DONE_AT: Record<string, number> = {
  pedido: 2, enviado: 3, entregado: 5,
};

interface Props {
  id: string;
}

export function PedidoDetailClient({ id }: Props) {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  // Try localStorage orders first, then fall back to MOCK_ORDERS
  const order = (() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("tcgacademy_orders") : null;
      if (raw) {
        const local = JSON.parse(raw) as typeof MOCK_ORDERS;
        const found = local.find((o) => o.id === id);
        if (found) return found;
      }
    } catch {}
    return MOCK_ORDERS.find((o) => o.id === id) ?? null;
  })();

  if (!order) {
    return (
      <div className="py-20 text-center">
        <Package size={48} className="mx-auto mb-4 text-gray-200" />
        <p className="mb-1 font-bold text-gray-700">Pedido no encontrado</p>
        <p className="mb-6 text-sm text-gray-500">No hemos podido encontrar el pedido <span className="font-mono">{id}</span></p>
        <Link href="/cuenta/pedidos" className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]">
          Volver a mis pedidos
        </Link>
      </div>
    );
  }

  const status = (order.status ?? "pedido") as OrderStatus;
  const stCfg = STATUS_CFG[status] ?? STATUS_CFG.pedido;
  const StatusIcon = stCfg.icon;
  const doneTo = TIMELINE_DONE_AT[status] ?? 0;

  const dateStr = new Date(order.date + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  const handleDownloadInvoice = () => {
    const invNum = generateInvoiceNumber(order.id);
    // Parse flat address string into parts where possible
    const addrParts = order.address ? order.address.split(",").map((s) => s.trim()) : [];
    const data = buildInvoiceFromOrder(
      {
        id: order.id,
        date: order.date,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.qty,
          price: i.price,
        })),
        shipping: order.shipping,
        total: order.total,
        paymentMethod: order.paymentMethod,
        clientName: user ? `${user.name} ${user.lastName ?? ""}`.trim() : undefined,
        shippingAddress: order.address ? {
          direccion: addrParts[0],
          cp: addrParts[1]?.match(/\d{5}/)?.[0],
          ciudad: addrParts[1]?.replace(/\d{5}\s*/, "").trim() || addrParts[2],
          pais: "España",
        } : undefined,
      },
      invNum,
    );
    printInvoice(data);
  };

  const copyTracking = () => {
    if (order.trackingNumber) {
      navigator.clipboard?.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          href="/cuenta/pedidos"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-xl font-bold text-gray-900">Pedido {order.id}</h1>
          <p className="text-sm text-gray-500">{dateStr}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
            style={{ color: stCfg.color, backgroundColor: stCfg.bg }}
          >
            <StatusIcon size={12} /> {stCfg.label}
          </span>
          <button
            onClick={handleDownloadInvoice}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#2563eb]/20 px-3 py-2 text-sm font-medium text-[#2563eb] transition hover:bg-blue-50"
          >
            <Download size={15} /> Descargar factura
          </button>
          {(status === "entregado") && (
            <Link
              href="/cuenta/devoluciones"
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              <RefreshCw size={15} /> Solicitar devolución
            </Link>
          )}
        </div>
      </div>

      {/* Tracking number */}
      {order.trackingNumber && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <Truck size={18} className="text-green-500" /> Número de seguimiento
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="font-mono text-sm font-bold tracking-widest text-gray-800">
                {order.trackingNumber}
              </span>
              <button
                onClick={copyTracking}
                className="ml-auto flex min-h-[36px] items-center gap-1.5 px-2 text-xs text-gray-500 transition hover:text-[#2563eb]"
              >
                {copied ? (
                  <><Check size={13} className="text-green-500" /> Copiado</>
                ) : (
                  <><Copy size={13} /> Copiar</>
                )}
              </button>
            </div>
            <a
              href={`https://www.gls-spain.es/es/seguimiento-envios/?match=${order.trackingNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[44px] items-center gap-1 text-sm font-semibold whitespace-nowrap text-[#2563eb] hover:underline"
            >
              <ExternalLink size={14} /> Seguir en GLS
            </a>
          </div>
        </div>
      )}

      {/* Timeline */}
      {status !== "incidencia" && status !== "cancelado" && status !== "devolucion" && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-6 font-bold text-gray-900">Estado del envío</h2>
          <div className="relative">
            {TIMELINE_STEPS.map((step, i) => {
              const done = i < doneTo;
              const StepIcon = step.icon;
              return (
                <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      className="absolute top-7 left-3.5 h-full w-0.5"
                      style={{ backgroundColor: done ? "#2563eb" : "#e5e7eb" }}
                    />
                  )}
                  <div
                    className="z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: done ? "#2563eb" : "#e5e7eb" }}
                  >
                    {done ? (
                      <StepIcon size={13} className="text-white" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p className={`text-sm font-semibold ${done ? "text-gray-900" : "text-gray-400"}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
          <Package size={18} className="text-gray-400" /> Productos
        </h2>
        <div className="space-y-3">
          {order.items.map((item, i) => {
            const qty = item.qty ?? 1;
            const emoji = GAME_EMOJI[item.game ?? ""] ?? "🃏";
            return (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-xl">
                  {emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{item.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Cantidad: {qty}</p>
                </div>
                <p className="flex-shrink-0 text-sm font-bold text-gray-900 whitespace-nowrap">
                  {(item.price * qty).toFixed(2)}€
                </p>
              </div>
            );
          })}

          {/* Totals */}
          <div className="space-y-1.5 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{order.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span className={order.shipping === 0 ? "font-semibold text-green-600" : ""}>
                {order.shipping === 0 ? "Gratis" : `${order.shipping.toFixed(2)}€`}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
              <span>Total (IVA incl.)</span>
              <span>{order.total.toFixed(2)}€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Address + payment */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <MapPin size={18} className="text-gray-400" /> Dirección de envío
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {order.address ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <CreditCard size={18} className="text-gray-400" /> Método de pago
          </h2>
          <p className="text-sm text-gray-600">
            {order.paymentMethod ?? "—"}
          </p>
          <p className="mt-2 text-xs text-gray-400">Pago procesado correctamente</p>
        </div>
      </div>
    </div>
  );
}
