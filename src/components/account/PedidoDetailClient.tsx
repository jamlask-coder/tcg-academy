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
  MessageSquare,
  ChevronDown,
  Send,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { saveIncident, getIncidentsByOrder } from "@/services/incidentService";
import type { Incident } from "@/types/incident";
import { MOCK_ORDERS } from "@/data/mockData";
import {
  printInvoiceWithCSV,
  buildInvoiceFromOrder,
  generateInvoiceNumber,
} from "@/utils/invoiceGenerator";

type OrderStatus = "pedido" | "enviado" | "entregado" | "incidencia" | "cancelado" | "devolucion";

const INCIDENT_TYPES = [
  { value: "direccion_incorrecta",  label: "Dirección de envío incorrecta" },
  { value: "paquete_no_recibido",   label: "Paquete no recibido / retraso excesivo" },
  { value: "articulo_incorrecto",   label: "Artículo recibido incorrecto" },
  { value: "articulo_faltante",     label: "Falta un artículo en el pedido" },
  { value: "paquete_extraviado",    label: "Paquete extraviado o robado" },
  { value: "seguimiento_error",     label: "El seguimiento no se actualiza" },
  { value: "otros",                 label: "Otros" },
];

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
  { label: "Entregado",         icon: CheckCircle },
];
const TIMELINE_DONE_AT: Record<string, number> = {
  pedido: 2, enviado: 3, entregado: 4,
};

interface Props {
  id: string;
}

export function PedidoDetailClient({ id }: Props) {
  const [copied, setCopied] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentType, setIncidentType] = useState("");
  const [incidentDetail, setIncidentDetail] = useState("");
  const [incidentPhotos, setIncidentPhotos] = useState<string[]>([]);
  const [incidentSent, setIncidentSent] = useState(false);
  const [existingIncident, setExistingIncident] = useState<Incident | null>(null);
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

  useEffect(() => {
    if (!order) return;
    const incidents = getIncidentsByOrder(order.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (incidents.length > 0) setExistingIncident(incidents[0]);
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDownloadInvoice = async () => {
    const invNum = generateInvoiceNumber(order.id);
    const addrParts = order.address ? order.address.split(",").map((s) => s.trim()) : [];
    const data = buildInvoiceFromOrder(
      {
        id: order.id,
        date: order.date,
        items: order.items.map((i) => ({ name: i.name, quantity: i.qty, price: i.price })),
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
    await printInvoiceWithCSV(data);
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
      <div className="mb-6 flex flex-wrap items-center gap-3">
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
          {status === "entregado" && (
            <Link
              href="/cuenta/devoluciones"
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              <RefreshCw size={15} /> Solicitar devolución
            </Link>
          )}
        </div>
      </div>

      {/* ── Timeline horizontal + tracking + factura ── */}
      {status !== "incidencia" && status !== "cancelado" && status !== "devolucion" ? (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-900">Estado del envío</h2>
            {/* Download invoice — prominent inside the status card */}
            <button
              onClick={handleDownloadInvoice}
              className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              <Download size={15} /> Descargar factura
            </button>
          </div>

          {/* Horizontal stepper */}
          <div className="relative flex items-start justify-between">
            {/* connector line behind steps */}
            <div className="absolute top-3.5 right-0 left-0 h-0.5 bg-gray-200" />
            <div
              className="absolute top-3.5 left-0 h-0.5 transition-all"
              style={{
                backgroundColor: "#2563eb",
                width: doneTo > 0 ? `${((doneTo - 1) / (TIMELINE_STEPS.length - 1)) * 100}%` : "0%",
              }}
            />
            {TIMELINE_STEPS.map((step, i) => {
              const done = i < doneTo;
              const StepIcon = step.icon;
              return (
                <div key={i} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white"
                    style={{ backgroundColor: done ? "#2563eb" : "#e5e7eb" }}
                  >
                    {done ? (
                      <StepIcon size={13} className="text-white" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                    )}
                  </div>
                  <p className={`text-center text-[11px] font-semibold leading-tight ${done ? "text-gray-800" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Tracking number inline */}
          {order.trackingNumber && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
              <Truck size={15} className="flex-shrink-0 text-green-500" />
              <span className="text-xs text-gray-500">Seguimiento:</span>
              <span className="font-mono text-sm font-bold tracking-wider text-gray-800">
                {order.trackingNumber}
              </span>
              <button
                onClick={copyTracking}
                className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-[#2563eb]"
              >
                {copied ? <><Check size={12} className="text-green-500" /> Copiado</> : <><Copy size={12} /> Copiar</>}
              </button>
              <a
                href={`https://www.gls-spain.es/es/seguimiento-envios/?match=${order.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1.5 rounded-xl border-2 border-[#2563eb] px-4 py-2 text-sm font-bold text-[#2563eb] transition hover:bg-blue-50"
              >
                <ExternalLink size={14} /> Seguir en GLS
              </a>
            </div>
          )}
        </div>
      ) : (
        /* Cancelled / incident / return: no timeline, just prominent download */
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleDownloadInvoice}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <Download size={15} /> Descargar factura
          </button>
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
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
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

      {/* Incident report */}
      {existingIncident ? (
        <div className={`rounded-2xl border-2 p-5 ${existingIncident.reply ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex-shrink-0 ${existingIncident.reply ? "text-green-500" : "text-orange-500"}`}>
              {existingIncident.reply ? <CheckCircle size={18} /> : <Clock size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${existingIncident.reply ? "text-green-800" : "text-orange-800"}`}>
                {existingIncident.reply ? "Incidencia resuelta" : "Incidencia en proceso"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {existingIncident.typeLabel} · {new Date(existingIncident.createdAt).toLocaleDateString("es-ES")}
              </p>
              {existingIncident.reply && (
                <div className="mt-3 rounded-xl border border-green-200 bg-white px-4 py-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Respuesta de TCG Academy</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{existingIncident.reply}</p>
                  {existingIncident.repliedAt && (
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(existingIncident.repliedAt).toLocaleString("es-ES")}
                    </p>
                  )}
                </div>
              )}
              {!existingIncident.reply && (
                <p className="mt-2 text-xs text-orange-600">
                  Nuestro equipo revisará tu incidencia en breve. Recibirás una respuesta por email.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border bg-white transition-colors ${incidentOpen ? "border-red-300" : "border-red-200"}`}>
          <button
            onClick={() => { setIncidentOpen(!incidentOpen); setIncidentSent(false); setIncidentPhotos([]); }}
            className="flex w-full items-center justify-between px-5 py-4 text-sm text-red-500 transition hover:text-red-600"
          >
            <span className="flex items-center gap-2">
              <MessageSquare size={15} />
              ¿Tienes algún problema con este pedido? Abre una incidencia
            </span>
            <ChevronDown
              size={15}
              className={`flex-shrink-0 transition-transform ${incidentOpen ? "rotate-180" : ""}`}
            />
          </button>

          {incidentOpen && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4">
              {incidentSent ? (
                <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-4 text-sm font-semibold text-green-700">
                  <CheckCircle size={18} className="flex-shrink-0 text-green-500" />
                  Incidencia enviada correctamente. Nuestro equipo la revisará en breve.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      Tipo de incidencia
                    </label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
                    >
                      <option value="">Selecciona una opción…</option>
                      {INCIDENT_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      Cuéntanos qué ha pasado
                    </label>
                    <textarea
                      value={incidentDetail}
                      onChange={(e) => setIncidentDetail(e.target.value)}
                      placeholder="Describe el problema con el mayor detalle posible…"
                      rows={3}
                      className="w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      Fotos (opcional)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 transition hover:border-[#2563eb] hover:text-[#2563eb]">
                      <Package size={15} />
                      Adjuntar fotos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          files.forEach((file) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result)
                                setIncidentPhotos((p) => [...p, ev.target!.result as string]);
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {incidentPhotos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {incidentPhotos.map((src, i) => (
                          <div key={i} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`foto ${i + 1}`}
                              className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => setIncidentPhotos((p) => p.filter((_, j) => j !== i))}
                              aria-label="Eliminar foto"
                              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white hover:bg-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      disabled={!incidentType}
                      onClick={() => {
                        if (!user || !incidentType) return;
                        const incident: Incident = {
                          id: `inc-${Date.now()}`,
                          orderId: order.id,
                          userId: user.id,
                          userEmail: user.email,
                          userName: `${user.name} ${user.lastName ?? ""}`.trim(),
                          type: incidentType,
                          typeLabel: INCIDENT_TYPES.find((t) => t.value === incidentType)?.label ?? incidentType,
                          detail: incidentDetail,
                          photos: incidentPhotos,
                          status: "nueva",
                          createdAt: new Date().toISOString(),
                        };
                        saveIncident(incident);
                        setExistingIncident(incident);
                        setIncidentSent(true);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
                    >
                      <Send size={14} /> Enviar incidencia
                    </button>
                    <button
                      onClick={() => setIncidentOpen(false)}
                      className="rounded-xl border-2 border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
