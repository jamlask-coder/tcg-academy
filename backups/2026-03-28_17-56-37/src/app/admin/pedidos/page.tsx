"use client"
import { useState, useMemo } from "react"
import { Search, ChevronDown, X, Check, Truck, Send, AlertTriangle } from "lucide-react"
import { ALL_ORDERS, type Order, type OrderStatus, type OrderItem } from "@/data/mockData"

const STATUS_OPTIONS: OrderStatus[] = ["pendiente", "procesando", "enviado", "entregado", "cancelado"]

const STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente:  "bg-amber-100 text-amber-700 border-amber-200",
  procesando: "bg-blue-100 text-blue-700 border-blue-200",
  enviado:    "bg-purple-100 text-purple-700 border-purple-200",
  entregado:  "bg-green-100 text-green-700 border-green-200",
  cancelado:  "bg-red-100 text-red-600 border-red-200",
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pendiente:  "procesando",
  procesando: "enviado",
  enviado:    "entregado",
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm">
      <Check size={16} className="text-green-300 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white">
        <X size={14} />
      </button>
    </div>
  )
}

function isPartialOrder(order: Order) {
  return order.items.some((item) => item.qtyShipped !== undefined && item.qtyShipped < item.qty)
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>(ALL_ORDERS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("")
  const [toast, setToast] = useState<string | null>(null)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [qtyShippedInputs, setQtyShippedInputs] = useState<Record<string, Record<number, number>>>({})
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return o.id.toLowerCase().includes(q) || o.userId.toLowerCase().includes(q)
      }
      return true
    })
  }, [orders, search, statusFilter])

  const updateStatus = (orderId: string, newStatus: OrderStatus, tracking?: string) => {
    const qtyMap = qtyShippedInputs[orderId] ?? {}
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        const updatedItems: OrderItem[] = o.items.map((item) => ({
          ...item,
          qtyShipped: qtyMap[item.id] !== undefined ? qtyMap[item.id] : item.qty,
        }))
        return {
          ...o,
          status: newStatus,
          items: updatedItems,
          ...(tracking ? { trackingNumber: tracking } : {}),
        }
      })
    )
    const srcOrder = orders.find((o) => o.id === orderId)
    const partial = Object.entries(qtyMap).some(([itemIdStr, shipped]) => {
      const item = srcOrder?.items.find((it) => it.id === Number(itemIdStr))
      return item && shipped < item.qty
    })
    showToast(
      partial
        ? `Pedido ${orderId} marcado como enviado (suministro parcial). Email al cliente.`
        : `Pedido ${orderId} actualizado a "${newStatus}". Email enviado al cliente.`
    )
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID o cliente..."
            className="w-full h-10 pl-8 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
            className="h-10 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#1a3a5c] text-gray-700"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Pedido</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 hidden md:table-cell">Cliente</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 hidden sm:table-cell">Fecha</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#1a3a5c]">{order.id}</td>
                    <td className="px-3 py-3 text-gray-600 hidden md:table-cell capitalize">
                      {order.userId.replace("demo_", "")}
                    </td>
                    <td className="px-3 py-3 text-gray-500 hidden sm:table-cell">{order.date}</td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900">{order.total.toFixed(2)}€</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                        {isPartialOrder(order) && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={9} /> Parcial
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const next = NEXT_STATUS[order.status]!
                            if (next === "enviado") {
                              setExpandedOrder(order.id)
                            } else {
                              updateStatus(order.id, next)
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[#1a3a5c] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition ml-auto min-h-[36px]"
                        >
                          {NEXT_STATUS[order.status] === "enviado" ? (
                            <><Truck size={13} /> Marcar enviado</>
                          ) : (
                            <><Send size={13} /> Avanzar estado</>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded row */}
                  {expandedOrder === order.id && (
                    <tr key={`${order.id}-expanded`}>
                      <td colSpan={6} className="px-4 pb-4 bg-blue-50/40">
                        <div className="pt-3 space-y-3">
                          {/* Items with qty shipped */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1.5">PRODUCTOS</p>
                            {order.items.map((item) => {
                              const shipped = item.qtyShipped ?? item.qty
                              const pending = item.qty - shipped
                              return (
                                <div key={item.id} className="flex items-center gap-3 py-1 text-sm text-gray-700 flex-wrap">
                                  <span className="flex-1 min-w-[180px]">
                                    {item.qty}x {item.name} — <span className="font-medium">{(item.price * item.qty).toFixed(2)}€</span>
                                  </span>
                                  {item.qtyShipped !== undefined && item.qtyShipped < item.qty && (
                                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                      {shipped}/{item.qty} enviados · {pending} pendiente{pending !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Tracking + partial qty when processing */}
                          {order.status === "procesando" && (
                            <div className="space-y-3">
                              {/* Per-item qty shipped */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">CANTIDAD A ENVIAR (dejar vacío = todo)</p>
                                <div className="space-y-2">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 flex-wrap">
                                      <span className="text-xs text-gray-600 flex-1 min-w-[160px] truncate">{item.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">de {item.qty} →</span>
                                        <input
                                          type="number"
                                          min={0}
                                          max={item.qty}
                                          placeholder={String(item.qty)}
                                          value={qtyShippedInputs[order.id]?.[item.id] ?? ""}
                                          onChange={(e) => {
                                            const val = e.target.value === "" ? undefined : Math.min(item.qty, Math.max(0, parseInt(e.target.value) || 0))
                                            setQtyShippedInputs((p) => ({
                                              ...p,
                                              [order.id]: { ...p[order.id], [item.id]: val as number },
                                            }))
                                          }}
                                          className="w-16 h-8 px-2 border-2 border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-[#1a3a5c]"
                                        />
                                        <span className="text-xs text-gray-400">unid.</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex-1 min-w-[200px]">
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    Número de seguimiento GLS
                                  </label>
                                  <input
                                    type="text"
                                    value={trackingInputs[order.id] || ""}
                                    onChange={(e) => setTrackingInputs((p) => ({ ...p, [order.id]: e.target.value }))}
                                    placeholder="Ej: ES2025012800010"
                                    className="w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#1a3a5c]"
                                  />
                                </div>
                                <button
                                  onClick={() => updateStatus(order.id, "enviado", trackingInputs[order.id])}
                                  className="flex items-center gap-1.5 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition mt-5 min-h-[44px]"
                                >
                                  <Truck size={15} /> Confirmar envío
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Address */}
                          <p className="text-xs text-gray-500"><span className="font-semibold">Dirección:</span> {order.address}</p>
                          {order.trackingNumber && (
                            <p className="text-xs text-gray-500"><span className="font-semibold">Tracking:</span> <span className="font-mono">{order.trackingNumber}</span></p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No se encontraron pedidos</p>
        )}
      </div>
    </div>
  )
}
