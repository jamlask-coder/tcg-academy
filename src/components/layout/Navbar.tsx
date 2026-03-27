"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const GAMES = [
  { label: "Pokemon", href: "/pokemon", color: "#f59e0b" },
  { label: "Magic", href: "/magic", color: "#7c3aed" },
  { label: "Yu-Gi-Oh!", href: "/yugioh", color: "#dc2626" },
  { label: "Naruto", href: "/naruto", color: "#ea580c" },
  { label: "Lorcana", href: "/lorcana", color: "#0891b2" },
  { label: "Dragon Ball", href: "/dragon-ball", color: "#d97706" },
]

export function Navbar() {
  const pathname = usePathname()
  return (
    <nav className="sticky top-16 z-40 bg-white border-b border-gray-200 hidden md:block">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="flex items-center">
          {GAMES.map(({ label, href, color }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link key={href} href={href}
                className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px"
                style={{
                  borderBottomColor: active ? color : "transparent",
                  color: active ? color : "#374151",
                }}>
                {label}
              </Link>
            )
          })}
          <div className="w-px h-5 bg-gray-200 mx-2 flex-shrink-0" />
          {[
            ["Tiendas", "/tiendas"],
            ["Eventos", "/eventos"],
            ["Mayoristas B2B", "/mayoristas"],
          ].map(([label, href]) => (
            <Link key={href} href={href}
              className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                pathname.startsWith(href)
                  ? "border-[#1a3a5c] text-[#1a3a5c]"
                  : "border-transparent text-gray-500 hover:text-[#1a3a5c]"
              }`}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
