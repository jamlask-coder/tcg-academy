"use client";
// Layout para /admin/productos/* — añade una tab bar "Manual / Con IA"
// sólo en las rutas de creación (nuevo y nuevo-ia). En /editar/[id] no se
// muestra porque allí editas un producto concreto y el flujo es otro.
//
// Este archivo es aditivo: no modifica las páginas existentes, sólo las
// envuelve añadiendo navegación entre dos modos de creación.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackagePlus, Sparkles, Boxes } from "lucide-react";

const TABS = [
  {
    href: "/admin/productos/nuevo",
    label: "Modo manual",
    icon: PackagePlus,
    match: "/admin/productos/nuevo",
    // match exacto para no activar también /nuevo-ia (que empieza por /nuevo-)
    exact: true,
  },
  {
    href: "/admin/productos/nuevo-ia",
    label: "Buscador IA",
    icon: Sparkles,
    match: "/admin/productos/nuevo-ia",
    exact: true,
  },
  {
    href: "/admin/productos/importar",
    label: "Importar CSV",
    icon: Boxes,
    match: "/admin/productos/importar",
    exact: true,
  },
] as const;

export default function ProductosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showTabs =
    pathname === "/admin/productos/nuevo" ||
    pathname === "/admin/productos/nuevo-ia" ||
    pathname === "/admin/productos/importar";

  return (
    <div>
      {showTabs && (
        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-gray-100 p-1.5">
          {TABS.map((t) => {
            const active = t.exact
              ? pathname === t.match
              : pathname.startsWith(t.match);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                  active
                    ? "bg-white text-[#2563eb] shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon size={15} />
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}
