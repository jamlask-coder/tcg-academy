"use client";
import { useState } from "react";
import {
  Download,
  Database,
  Users,
  ShoppingBag,
  BarChart2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { PRODUCTS } from "@/data/products";
import { MOCK_USERS, ALL_ORDERS } from "@/data/mockData";

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCatalog() {
  const headers = [
    "ID",
    "Nombre",
    "Juego",
    "PVP Público",
    "PVP Mayoristas",
    "PVP Tiendas TCG",
    "Coste",
    "En stock",
  ];
  const rows = PRODUCTS.map((p) => [
    String(p.id),
    p.name,
    p.game,
    String(p.price),
    String(p.wholesalePrice ?? ""),
    String(p.storePrice ?? ""),
    String(p.costPrice ?? ""),
    p.inStock ? "Sí" : "No",
  ]);
  downloadCSV(
    `tcgacademy_catalogo_${new Date().toISOString().slice(0, 10)}.csv`,
    rows,
    headers,
  );
}

function exportUsers() {
  const headers = [
    "ID",
    "Nombre",
    "Apellido",
    "Email",
    "Rol",
    "Pedidos",
    "Gasto total",
    "Puntos",
    "Registrado",
  ];
  const rows = MOCK_USERS.map((u) => [
    u.id,
    u.name,
    u.lastName,
    u.email,
    u.role,
    String(u.totalOrders),
    u.totalSpent.toFixed(2),
    String(u.points),
    u.registeredAt,
  ]);
  downloadCSV(
    `tcgacademy_usuarios_${new Date().toISOString().slice(0, 10)}.csv`,
    rows,
    headers,
  );
}

function exportOrders() {
  const headers = [
    "ID pedido",
    "Usuario",
    "Fecha",
    "Estado",
    "Subtotal",
    "Envío",
    "Total",
    "Dirección",
    "Pago",
    "Tracking",
  ];
  const rows = ALL_ORDERS.map((o) => [
    o.id,
    o.userId,
    o.date,
    o.status,
    o.subtotal.toFixed(2),
    o.shipping.toFixed(2),
    o.total.toFixed(2),
    o.address,
    o.paymentMethod,
    o.trackingNumber ?? "",
  ]);
  downloadCSV(
    `tcgacademy_pedidos_${new Date().toISOString().slice(0, 10)}.csv`,
    rows,
    headers,
  );
}

const SYSTEM_CHECKS = [
  { label: "Base de datos", status: "ok" as const },
  { label: "WooCommerce API", status: "ok" as const },
  { label: "Servicio de email (Resend)", status: "ok" as const },
  { label: "CDN de imágenes", status: "ok" as const },
  { label: "Pasarela de pago (Stripe)", status: "warning" as const },
  { label: "Backup automático", status: "ok" as const },
];

export default function AdminHerramientasPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showToast("Estado del sistema actualizado");
    }, 1200);
  };

  const totalRevenue = ALL_ORDERS.reduce((s, o) => s + o.total, 0);
  const avgOrderValue = totalRevenue / ALL_ORDERS.length;
  const inStockCount = PRODUCTS.filter((p) => p.inStock).length;
  const outOfStockCount = PRODUCTS.filter((p) => !p.inStock).length;
  const activeUsers = MOCK_USERS.filter((u) => u.active).length;
  const totalPointsIssued = MOCK_USERS.reduce((s, u) => s + u.points, 0);

  const exports = [
    {
      title: "Exportar catálogo",
      description: `${PRODUCTS.length} productos · campos: nombre, juego, precios, stock`,
      icon: Database,
      color: "#2563eb",
      action: () => {
        exportCatalog();
        showToast("Catálogo exportado correctamente");
      },
    },
    {
      title: "Exportar usuarios",
      description: `${MOCK_USERS.length} usuarios · campos: nombre, email, rol, gasto, puntos`,
      icon: Users,
      color: "#0891b2",
      action: () => {
        exportUsers();
        showToast("Usuarios exportados correctamente");
      },
    },
    {
      title: "Exportar pedidos",
      description: `${ALL_ORDERS.length} pedidos · campos: id, estado, total, dirección, tracking`,
      icon: ShoppingBag,
      color: "#7c3aed",
      action: () => {
        exportOrders();
        showToast("Pedidos exportados correctamente");
      },
    },
  ];

  const stats = [
    {
      label: "Ingresos totales (demo)",
      value: `${totalRevenue.toFixed(2)}€`,
      icon: BarChart2,
      color: "#2563eb",
    },
    {
      label: "Ticket medio",
      value: `${avgOrderValue.toFixed(2)}€`,
      icon: ShoppingBag,
      color: "#7c3aed",
    },
    {
      label: "Productos en stock",
      value: `${inStockCount} / ${PRODUCTS.length}`,
      icon: Database,
      color: "#059669",
    },
    {
      label: "Sin stock",
      value: String(outOfStockCount),
      icon: AlertCircle,
      color: "#dc2626",
    },
    {
      label: "Usuarios activos",
      value: `${activeUsers} / ${MOCK_USERS.length}`,
      icon: Users,
      color: "#0891b2",
    },
    {
      label: "Puntos emitidos",
      value: totalPointsIssued.toLocaleString("es"),
      icon: BarChart2,
      color: "#d97706",
    },
  ];

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BarChart2 size={22} className="text-[#2563eb]" /> Herramientas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Exportaciones, estadísticas y estado del sistema
        </p>
      </div>

      {/* CSV Exports */}
      <div className="mb-8">
        <h2 className="mb-4 font-bold text-gray-900">Exportar datos (CSV)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {exports.map(({ title, description, icon: Icon, color, action }) => (
            <button
              key={title}
              onClick={action}
              className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:shadow-md"
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-110"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <p className="mb-1 text-sm font-bold text-gray-900">{title}</p>
              <p className="mb-4 text-xs leading-relaxed text-gray-500">
                {description}
              </p>
              <div
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color }}
              >
                <Download size={13} /> Descargar CSV
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <h2 className="mb-4 font-bold text-gray-900">Estadísticas generales</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">{label}</p>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}18` }}
                >
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Estado del sistema</h2>
          <button
            onClick={handleRefresh}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-[#2563eb] hover:text-[#2563eb]"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {SYSTEM_CHECKS.map(({ label, status }) => (
              <div
                key={label}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex items-center gap-1.5">
                  {status === "ok" ? (
                    <>
                      <CheckCircle size={15} className="text-green-500" />
                      <span className="text-xs font-semibold text-green-600">
                        Operativo
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={15} className="text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600">
                        Atención
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">
          Estado simulado para demo · Última comprobación:{" "}
          {new Date().toLocaleTimeString("es")}
        </p>
      </div>
    </div>
  );
}
