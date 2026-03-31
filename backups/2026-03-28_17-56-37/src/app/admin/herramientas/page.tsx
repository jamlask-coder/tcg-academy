"use client"
import { useState } from "react"
import { Download, Database, Users, ShoppingBag, BarChart2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { PRODUCTS } from "@/data/products"
import { MOCK_USERS, ALL_ORDERS } from "@/data/mockData"

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportCatalog() {
  const headers = ["ID", "Nombre", "Juego", "Precio", "Precio mayorista", "Precio tienda", "En stock"]
  const rows = PRODUCTS.map((p) => [
    String(p.id),
    p.name,
    p.game,
    String(p.price),
    String(p.wholesalePrice ?? ""),
    String(p.storePrice ?? ""),
    p.inStock ? "Sí" : "No",
  ])
  downloadCSV(`tcgacademy_catalogo_${new Date().toISOString().slice(0, 10)}.csv`, rows, headers)
}

function exportUsers() {
  const headers = ["ID", "Nombre", "Apellido", "Email", "Rol", "Pedidos", "Gasto total", "Puntos", "Registrado"]
  const rows = MOCK_USERS.map((u) => [
    u.id, u.name, u.lastName, u.email, u.role,
    String(u.totalOrders), u.totalSpent.toFixed(2), String(u.points), u.registeredAt,
  ])
  downloadCSV(`tcgacademy_usuarios_${new Date().toISOString().slice(0, 10)}.csv`, rows, headers)
}

function exportOrders() {
  const headers = ["ID pedido", "Usuario", "Fecha", "Estado", "Subtotal", "Envío", "Total", "Dirección", "Pago", "Tracking"]
  const rows = ALL_ORDERS.map((o) => [
    o.id, o.userId, o.date, o.status,
    o.subtotal.toFixed(2), o.shipping.toFixed(2), o.total.toFixed(2),
    o.address, o.paymentMethod, o.trackingNumber ?? "",
  ])
  downloadCSV(`tcgacademy_pedidos_${new Date().toISOString().slice(0, 10)}.csv`, rows, headers)
}

const SYSTEM_CHECKS = [
  { label: "Base de datos", status: "ok" as const },
  { label: "WooCommerce API", status: "ok" as const },
  { label: "Servicio de email (Resend)", status: "ok" as const },
  { label: "CDN de imágenes", status: "ok" as const },
  { label: "Pasarela de pago (Stripe)", status: "warning" as const },
  { label: "Backup automático", status: "ok" as const },
]

export default function AdminHerramientasPage() {
  const [toast, setToast] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => { setRefreshing(false); showToast("Estado del sistema actualizado") }, 1200)
  }

  const totalRevenue = ALL_ORDERS.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0)
  const avgOrderValue = totalRevenue / ALL_ORDERS.filter((o) => o.status !== "cancelado").length
  const inStockCount = PRODUCTS.filter((p) => p.inStock).length
  const outOfStockCount = PRODUCTS.filter((p) => !p.inStock).length
  const activeUsers = MOCK_USERS.filter((u) => u.active).length
  const totalPointsIssued = MOCK_USERS.reduce((s, u) => s + u.points, 0)

  const exports = [
    {
      title: "Exportar catálogo",
      description: `${PRODUCTS.length} productos · campos: nombre, juego, precios, stock`,
      icon: Database,
      color: "#1a3a5c",
      action: () => { exportCatalog(); showToast("Catálogo exportado correctamente") },
    },
    {
      title: "Exportar usuarios",
      description: `${MOCK_USERS.length} usuarios · campos: nombre, email, rol, gasto, puntos`,
      icon: Users,
      color: "#0891b2",
      action: () => { exportUsers(); showToast("Usuarios exportados correctamente") },
    },
    {
      title: "Exportar pedidos",
      description: `${ALL_ORDERS.length} pedidos · campos: id, estado, total, dirección, tracking`,
      icon: ShoppingBag,
      color: "#7c3aed",
      action: () => { exportOrders(); showToast("Pedidos exportados correctamente") },
    },
  ]

  const stats = [
    { label: "Ingresos totales (demo)", value: `${totalRevenue.toFixed(2)}€`, icon: BarChart2, color: "#1a3a5c" },
    { label: "Ticket medio", value: `${avgOrderValue.toFixed(2)}€`, icon: ShoppingBag, color: "#7c3aed" },
    { label: "Productos en stock", value: `${inStockCount} / ${PRODUCTS.length}`, icon: Database, color: "#059669" },
    { label: "Sin stock", value: String(outOfStockCount), icon: AlertCircle, color: "#dc2626" },
    { label: "Usuarios activos", value: `${activeUsers} / ${MOCK_USERS.length}`, icon: Users, color: "#0891b2" },
    { label: "Puntos emitidos", value: totalPointsIssued.toLocaleString("es"), icon: BarChart2, color: "#d97706" },
  ]

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 size={22} className="text-[#1a3a5c]" /> Herramientas
        </h1>
        <p className="text-gray-500 text-sm mt-1">Exportaciones, estadísticas y estado del sistema</p>
      </div>

      {/* CSV Exports */}
      <div className="mb-8">
        <h2 className="font-bold text-gray-900 mb-4">Exportar datos (CSV)</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {exports.map(({ title, description, icon: Icon, color, action }) => (
            <button
              key={title}
              onClick={action}
              className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:shadow-md transition group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition group-hover:scale-110"
                style={{ backgroundColor: `${color}18` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{description}</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
                <Download size={13} /> Descargar CSV
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <h2 className="font-bold text-gray-900 mb-4">Estadísticas generales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Estado del sistema</h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-[#1a3a5c] border border-gray-200 px-3 py-2 rounded-xl hover:border-[#1a3a5c] transition min-h-[40px]"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {SYSTEM_CHECKS.map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex items-center gap-1.5">
                  {status === "ok" ? (
                    <>
                      <CheckCircle size={15} className="text-green-500" />
                      <span className="text-xs font-semibold text-green-600">Operativo</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={15} className="text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600">Atención</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Estado simulado para demo · Última comprobación: {new Date().toLocaleTimeString("es")}
        </p>
      </div>
    </div>
  )
}
