"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Download,
  Upload,
  Database,
  Users,
  ShoppingBag,
  Wrench,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { type LocalProduct } from "@/data/products";
import { Package as PackageIcon } from "lucide-react";
import { STOCK_THRESHOLDS } from "@/utils/stockStatus";
import { getMergedProducts } from "@/lib/productStore";
import { MOCK_USERS, ALL_ORDERS } from "@/data/mockData";
import type { User } from "@/types/user";

// ─── CSV export helpers ───────────────────────────────────────────────────────

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

function exportCatalog(products: LocalProduct[]) {
  const headers = [
    "ID",
    "Nombre",
    "Juego",
    "PV Público",
    "PV Mayorista",
    "PV Tiendas",
    "Precio Adquisición",
    "En stock",
  ];
  const rows = products.map((p) => [
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

// ─── User JSON export / import helpers ───────────────────────────────────────

type RegisteredEntry = { password: string; user: User };

function loadRegistered(): Record<string, RegisteredEntry> {
  try {
    return JSON.parse(localStorage.getItem("tcgacademy_registered") ?? "{}") as Record<string, RegisteredEntry>;
  } catch { return {}; }
}

function exportUsersJSON() {
  const data = loadRegistered();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tcgacademy-users-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportUsersCSV() {
  const data = loadRegistered();
  const rows = Object.values(data).map(({ user }) =>
    [user.id, user.name, user.lastName, user.email, user.role, user.phone ?? "", user.createdAt?.slice(0, 10) ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = ["ID,Nombre,Apellidos,Email,Rol,Teléfono,Registro", ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tcgacademy-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function importUsersJSON(file: File, onDone: (count: number) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target?.result as string) as Record<string, RegisteredEntry>;
      const current = loadRegistered();
      let count = 0;
      for (const [email, entry] of Object.entries(imported)) {
        if (!current[email]) { current[email] = entry; count++; }
      }
      localStorage.setItem("tcgacademy_registered", JSON.stringify(current));
      onDone(count);
    } catch { onDone(-1); }
  };
  reader.readAsText(file);
}

// ─── Constants ───────────────────────────────────────────────────────────────

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
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [allProducts, setAllProducts] = useState<LocalProduct[]>(() =>
    getMergedProducts(),
  );

  useEffect(() => {
    const reload = () =>
       
      setAllProducts(getMergedProducts());
    window.addEventListener("tcga:products:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:products:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setAllProducts(getMergedProducts());
    setTimeout(() => {
      setRefreshing(false);
      showToast("Estado del sistema actualizado");
    }, 1200);
  };

  const exports = [
    {
      title: "Exportar catálogo",
      description: `${allProducts.length} productos · campos: nombre, juego, precios, stock`,
      icon: Database,
      color: "#2563eb",
      action: () => {
        exportCatalog(allProducts);
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

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Wrench size={22} className="text-[#2563eb]" /> Herramientas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Exportaciones y estado del sistema
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

      {/* User DB — JSON export / import */}
      <div className="mb-8">
        <h2 className="mb-4 font-bold text-gray-900">Base de datos de usuarios</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Exportar JSON</p>
                <p className="text-xs text-gray-500">Usuarios registrados en la sesión actual</p>
              </div>
              <button
                onClick={() => { exportUsersJSON(); showToast("Usuarios exportados como JSON"); }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Download size={14} className="text-[#2563eb]" /> Exportar JSON
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Exportar CSV</p>
                <p className="text-xs text-gray-500">Usuarios registrados en formato hoja de cálculo</p>
              </div>
              <button
                onClick={() => { exportUsersCSV(); showToast("Usuarios exportados como CSV"); }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Download size={14} className="text-green-600" /> Exportar CSV
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Importar JSON</p>
                <p className="text-xs text-gray-500">Añade usuarios desde un archivo JSON exportado previamente</p>
              </div>
              <div className="flex items-center gap-3">
                {importMsg && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <CheckCircle2 size={14} /> {importMsg}
                  </span>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Upload size={14} className="text-amber-600" /> Importar JSON
                </button>
              </div>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            importUsersJSON(file, (count) => {
              if (count >= 0) {
                setImportMsg(`${count} usuario(s) importados`);
              } else {
                setImportMsg("Error al importar el archivo");
              }
              setTimeout(() => setImportMsg(null), 4000);
            });
            e.target.value = "";
          }}
        />
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

      {/* Stock criteria */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
          <PackageIcon size={18} className="text-[#2563eb]" /> Criterios de Stock
        </h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Stock disponible</p>
                  <p className="text-xs text-gray-500">{STOCK_THRESHOLDS.available} o más unidades</p>
                </div>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">En stock</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pocas unidades</p>
                  <p className="text-xs text-gray-500">Entre {STOCK_THRESHOLDS.lastUnits + 1} y {STOCK_THRESHOLDS.lowStock} unidades</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">Pocas unidades</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">¡Últimas unidades!</p>
                  <p className="text-xs text-gray-500">{STOCK_THRESHOLDS.lastUnits} o menos unidades</p>
                </div>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">¡Últimas unidades!</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Agotado</p>
                  <p className="text-xs text-gray-500">0 unidades — no se puede comprar</p>
                </div>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">Agotado</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Sin stock definido</p>
                  <p className="text-xs text-gray-500">No se ha indicado cantidad — se asume stock ilimitado</p>
                </div>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">En stock</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">
          Estos criterios se aplican automáticamente en la ficha de producto visible al cliente
        </p>
      </div>

      {/* Manual */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-gray-900">
              <Wrench size={18} className="text-gray-400" /> Manual de administración
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Guía completa de uso del panel de administración
            </p>
          </div>
          <Link
            href="/admin/manual"
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Abrir manual
          </Link>
        </div>
      </div>
    </div>
  );
}
