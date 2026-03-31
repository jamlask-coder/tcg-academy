"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Package, Clock, Truck, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Download, MapPin, CreditCard,
  Hash, AlertCircle,
} from "lucide-react"

type OrderStatus = "pedido" | "enviado" | "entregado" | "incidencia"

interface OrderItem {
  name: string
  qty?: number
  quantity?: number
  price: number
  image?: string
  game?: string
  qtyShipped?: number
}

interface StoredOrder {
  id: string
  date: string
  status: string
  total: number
  items: OrderItem[]
  shippingAddress?: {
    nombre?: string; apellidos?: string; direccion?: string
    ciudad?: string; cp?: string; provincia?: string
  }
  address?: string
  paymentMethod?: string
  pago?: string
  trackingNumber?: string
  envio?: string
  tiendaRecogida?: string | null
}

interface Order extends StoredOrder {
  status: OrderStatus
  dateFormatted: string
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pedido:     { label: "Pedido recibido", color: "#d97706", bg: "#fef3c7", icon: Clock },
  enviado:    { label: "Enviado",         color: "#7c3aed", bg: "#ede9fe", icon: Truck },
  entregado:  { label: "Entregado",       color: "#16a34a", bg: "#dcfce7", icon: CheckCircle },
  incidencia: { label: "Incidencia",      color: "#dc2626", bg: "#fee2e2", icon: AlertTriangle },
}

const MOCK_ORDERS: Order[] = [
  {
    id: "TCG-20250128-001",
    date: "2025-01-28",
    dateFormatted: "28 enero 2025",
    status: "enviado",
    total: 109.85,
    trackingNumber: "ES2025012800001",
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****4242",
    envio: "estandar",
    items: [
      { name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)", qty: 1, price: 79.95, game: "naruto" },
      { name: "Naruto Starter Pack — Naruto Uzumaki", qty: 2, price: 14.95, game: "naruto" },
    ],
  },
  {
    id: "TCG-20250115-002",
    date: "2025-01-15",
    dateFormatted: "15 enero 2025",
    status: "entregado",
    total: 174.90,
    trackingNumber: "ES2025011500002",
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "PayPal",
    envio: "estandar",
    items: [
      { name: "Magic The Gathering: Bloomburrow Draft Booster Box", qty: 1, price: 129.95, game: "magic" },
      { name: "MTG Bloomburrow Bundle", qty: 1, price: 44.95, game: "magic" },
    ],
  },
  {
    id: "TCG-20241230-003",
    date: "2024-12-30",
    dateFormatted: "30 diciembre 2024",
    status: "entregado",
    total: 109.90,
    trackingNumber: "ES2024123000003",
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Bizum",
    envio: "estandar",
    items: [
      { name: "Pokémon: Prismatic Evolutions Elite Trainer Box", qty: 2, price: 54.95, game: "pokemon" },
    ],
  },
  {
    id: "TCG-20241201-004",
    date: "2024-12-01",
    dateFormatted: "01 diciembre 2024",
    status: "entregado",
    total: 104.90,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****4242",
    envio: "estandar",
    items: [
      { name: "One Piece OP-07 500 Years in the Future Booster Box", qty: 1, price: 89.95, game: "one-piece" },
      { name: "One Piece Starter Deck ST-21 Land of Wano", qty: 1, price: 14.95, game: "one-piece" },
    ],
  },
]

const GAME_EMOJI: Record<string, string> = {
  magic: "🧙", pokemon: "⚡", "one-piece": "☠️", naruto: "🍃",
  yugioh: "⭐", lorcana: "✨", riftbound: "🌀", topps: "⚽", "dragon-ball": "🐉",
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
  } catch { return isoString }
}

function normalizeStatus(s: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pedido: "pedido", pendiente: "pedido", procesando: "pedido",
    enviado: "enviado", entregado: "entregado",
    cancelado: "incidencia", incidencia: "incidencia",
  }
  return map[s.toLowerCase()] ?? "pedido"
}

// Simple timeline steps
const TIMELINE: OrderStatus[] = ["pedido", "enviado", "entregado"]

interface IncidentModalProps {
  orderId: string
  onClose: () => void
  onSubmit: (orderId: string, type: string, description: string) => void
}

function IncidentModal({ orderId, onClose, onSubmit }: IncidentModalProps) {
  const [type, setType] = useState("")
  const [description, setDescription] = useState("")
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" /> Abrir incidencia
        </h2>
        <p className="text-sm text-gray-500 mb-4">Pedido: <span className="font-mono font-bold text-gray-700">{orderId}</span></p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de incidencia *</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] bg-white">
              <option value="">Selecciona el tipo...</option>
              <option value="no_recibido">No he recibido el pedido</option>
              <option value="producto_defectuoso">Producto defectuoso o dañado</option>
              <option value="producto_incorrecto">Producto incorrecto</option>
              <option value="falta_producto">Falta un producto en el pedido</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe el problema con el mayor detalle posible..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
              Cancelar
            </button>
            <button
              disabled={!type || description.length < 10}
              onClick={() => onSubmit(orderId, type, description)}
              className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Enviar incidencia
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [incidentModal, setIncidentModal] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tcgacademy_orders")
      if (!raw) return
      const local = JSON.parse(raw) as StoredOrder[]
      const normalized: Order[] = local.map(o => ({
        ...o,
        status: normalizeStatus(o.status),
        dateFormatted: formatDate(o.date),
      }))
      setOrders([...normalized, ...MOCK_ORDERS])
    } catch {}
  }, [])

  const handleIncidentSubmit = (orderId: string, type: string, _desc: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "incidencia" as OrderStatus } : o))
    setIncidentModal(null)
    setSuccessMsg(`Incidencia registrada para el pedido ${orderId}. Nos pondremos en contacto contigo en menos de 24h.`)
    setTimeout(() => setSuccessMsg(null), 6000)
    void type
  }

  const downloadFakturame = (order: Order) => {
    const lines = order.items.map(item => {
      const qty = item.qty ?? item.quantity ?? 1
      return `${qty}x ${item.name} — ${(item.price * qty).toFixed(2)}€`
    }).join("\n")
    const content = [
      "FACTURA SIMPLIFICADA",
      "====================",
      `Pedido: ${order.id}`,
      `Fecha: ${order.dateFormatted}`,
      "",
      "PRODUCTOS:",
      lines,
      "",
      `TOTAL: ${order.total.toFixed(2)}€`,
      "",
      "TCG Academy — www.tcgacademy.es",
    ].join("\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `factura-${order.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {incidentModal && (
        <IncidentModal
          orderId={incidentModal}
          onClose={() => setIncidentModal(null)}
          onSubmit={handleIncidentSubmit}
        />
      )}

      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl max-w-sm text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis pedidos</h1>
        <p className="text-gray-500 text-sm mt-1">{orders.length} pedidos realizados</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="font-bold text-gray-700 mb-2">No tienes pedidos todavia</p>
          <p className="text-gray-500 text-sm mb-6">Explora el catalogo y haz tu primer pedido</p>
          <Link href="/catalogo" className="bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#15304d] transition">
            Ver catalogo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const { label, color, bg, icon: Icon } = STATUS_CONFIG[order.status]
            const isOpen = expanded === order.id
            const isPartial = order.items.some(i => i.qtyShipped !== undefined && i.qtyShipped < (i.qty ?? i.quantity ?? 1))
            const timelineStep = TIMELINE.indexOf(order.status as OrderStatus)

            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/60 transition"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm font-mono">{order.id}</span>
                      {isPartial && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Suministro parcial
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.dateFormatted} · {order.items.length} producto{order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ color, backgroundColor: bg }}>
                        <Icon size={11} /> {label}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">{order.total.toFixed(2)}€</span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-5">
                    {/* Progress timeline — not for incidencia */}
                    {order.status !== "incidencia" && (
                      <div className="flex items-center gap-0 my-5">
                        {TIMELINE.map((step, i) => {
                          const cfg = STATUS_CONFIG[step]
                          const done = timelineStep >= i
                          return (
                            <div key={step} className="flex items-center flex-1 last:flex-none">
                              <div className="flex flex-col items-center gap-1">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all"
                                  style={{ backgroundColor: done ? cfg.color : "#e5e7eb" }}
                                >
                                  {done ? <cfg.icon size={13} /> : <span className="text-gray-400 text-xs">{i + 1}</span>}
                                </div>
                                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: done ? cfg.color : "#9ca3af" }}>
                                  {cfg.label}
                                </span>
                              </div>
                              {i < TIMELINE.length - 1 && (
                                <div className="flex-1 h-0.5 mx-1 mb-4" style={{ backgroundColor: timelineStep > i ? cfg.color : "#e5e7eb" }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Incidencia badge */}
                    {order.status === "incidencia" && (
                      <div className="my-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                        <span className="text-sm font-semibold text-red-700">Incidencia abierta — en revisión por nuestro equipo</span>
                      </div>
                    )}

                    {/* Products */}
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Productos</p>
                      {order.items.map((item, i) => {
                        const qty = item.qty ?? item.quantity ?? 1
                        const shipped = item.qtyShipped ?? qty
                        const emoji = GAME_EMOJI[item.game ?? ""] ?? "🃏"
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                              {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-1">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                {qty}× · {(item.price * qty).toFixed(2)}€
                                {item.qtyShipped !== undefined && shipped < qty && (
                                  <span className="ml-2 text-amber-600 font-semibold">{shipped}/{qty} enviados</span>
                                )}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-gray-900 flex-shrink-0">{(item.price * qty).toFixed(2)}€</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Meta info */}
                    <div className="grid sm:grid-cols-2 gap-3 mb-4 text-xs text-gray-600">
                      {(order.address || order.shippingAddress) && (
                        <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                          <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-700 mb-0.5">Dirección de envío</p>
                            {order.shippingAddress ? (
                              <p className="text-gray-500 leading-relaxed">
                                {[order.shippingAddress.nombre, order.shippingAddress.apellidos].filter(Boolean).join(" ")}<br />
                                {order.shippingAddress.direccion}<br />
                                {[order.shippingAddress.cp, order.shippingAddress.ciudad, order.shippingAddress.provincia].filter(Boolean).join(", ")}
                              </p>
                            ) : (
                              <p className="text-gray-500">{order.address}</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                        <CreditCard size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-700 mb-0.5">Pago</p>
                          <p className="text-gray-500">{order.paymentMethod ?? order.pago ?? "—"}</p>
                        </div>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-xl p-3 sm:col-span-2">
                          <Hash size={13} className="text-purple-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-purple-700 mb-0.5">Número de seguimiento GLS</p>
                            <p className="font-mono text-purple-600">{order.trackingNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => downloadFakturame(order)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a3a5c] border border-[#1a3a5c]/30 hover:bg-blue-50 px-3 py-2 rounded-xl transition"
                      >
                        <Download size={13} /> Descargar factura
                      </button>
                      {order.status !== "incidencia" && (
                        <button
                          onClick={() => setIncidentModal(order.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition"
                        >
                          <AlertCircle size={13} /> Abrir incidencia
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
