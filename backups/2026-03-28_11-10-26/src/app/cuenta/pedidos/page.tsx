"use client"
import Link from "next/link"
import { Package, ChevronRight, Clock, Truck, CheckCircle, XCircle, RefreshCw } from "lucide-react"

type OrderStatus = "Pendiente" | "Procesando" | "Enviado" | "Entregado" | "Cancelado"

interface MockOrder {
  id: string
  date: string
  status: OrderStatus
  total: number
  items: { name: string; qty: number; price: number }[]
}

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; icon: typeof Clock }> = {
  Pendiente:   { color: "#d97706", bg: "#fef3c7", icon: Clock },
  Procesando:  { color: "#2563eb", bg: "#dbeafe", icon: RefreshCw },
  Enviado:     { color: "#7c3aed", bg: "#ede9fe", icon: Truck },
  Entregado:   { color: "#16a34a", bg: "#dcfce7", icon: CheckCircle },
  Cancelado:   { color: "#dc2626", bg: "#fee2e2", icon: XCircle },
}

const MOCK_ORDERS: MockOrder[] = [
  {
    id: "TCG-20250128-001",
    date: "28 Enero 2025",
    status: "Enviado",
    total: 109.95,
    items: [
      { name: "Naruto Mythos: Konoha Shido Booster Box", qty: 1, price: 79.95 },
      { name: "Naruto Starter Pack — Naruto Uzumaki", qty: 2, price: 14.95 },
    ],
  },
  {
    id: "TCG-20250115-002",
    date: "15 Enero 2025",
    status: "Entregado",
    total: 249.95,
    items: [
      { name: "Bloomburrow Collector Booster Display", qty: 1, price: 249.95 },
    ],
  },
  {
    id: "TCG-20241230-003",
    date: "30 Diciembre 2024",
    status: "Entregado",
    total: 74.85,
    items: [
      { name: "One Piece OP-08 Two Legends Booster Box", qty: 1, price: 74.95 },
    ],
  },
  {
    id: "TCG-20241201-004",
    date: "01 Diciembre 2024",
    status: "Cancelado",
    total: 19.95,
    items: [
      { name: "Yu-Gi-Oh! Tin of Ancient Battles 2024", qty: 1, price: 19.95 },
    ],
  },
]

export default function PedidosPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis pedidos</h1>
        <p className="text-gray-500 text-sm mt-1">{MOCK_ORDERS.length} pedidos realizados</p>
      </div>

      {MOCK_ORDERS.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="font-bold text-gray-700 mb-2">No tienes pedidos todavia</p>
          <p className="text-gray-500 text-sm mb-6">Explora el catalogo y haz tu primer pedido</p>
          <Link href="/catalogo" className="bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#15304d] transition">
            Ver catalogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {MOCK_ORDERS.map((order) => {
            const { color, bg, icon: Icon } = STATUS_CONFIG[order.status]
            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{order.id}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{order.date} · {order.items.length} producto{order.items.length !== 1 ? "s" : ""}</p>
                    <div className="mt-3 space-y-1">
                      {order.items.map((item, i) => (
                        <p key={i} className="text-sm text-gray-600">
                          {item.qty}× {item.name} — <span className="font-medium">{(item.price * item.qty).toFixed(2)}€</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ color, backgroundColor: bg }}
                    >
                      <Icon size={12} /> {order.status}
                    </span>
                    <p className="font-bold text-gray-900">{order.total.toFixed(2)}€</p>
                    <Link
                      href={`/cuenta/pedidos/${order.id}`}
                      className="inline-flex items-center gap-1 text-sm text-[#1a3a5c] hover:underline font-medium"
                    >
                      Ver detalle <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
