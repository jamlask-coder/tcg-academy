"use client"
import Link from "next/link"
import { ShoppingCart, Heart, User, Search, Menu, X } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { useState } from "react"

export function Header() {
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Topbar */}
      <div className="bg-[#1a3a5c] text-white text-xs py-1.5 hidden md:block">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-6 opacity-85">
            <span>Envio gratis en pedidos +49EUR</span>
            <span>Entrega en 24/48h</span>
            <span>+500 mayoristas satisfechos</span>
          </div>
          <div className="flex items-center gap-4 opacity-85">
            <Link href="/tiendas" className="hover:opacity-100">4 Tiendas fisicas</Link>
            <span>|</span>
            <Link href="/mayoristas" className="hover:opacity-100">Mayoristas B2B</Link>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1180px] mx-auto px-6 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#1a3a5c] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-xl font-bold text-[#1a3a5c] hidden sm:block">TCG Academy</span>
        </Link>

        <div className="flex-1 max-w-xl hidden md:block">
          <form action="/buscar" className="relative">
            <input
              type="search" name="q"
              placeholder="Busca cartas, sobres, mazos..."
              className="w-full h-10 pl-4 pr-10 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] bg-gray-50 transition"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1a3a5c]">
              <Search size={18} />
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setSearchOpen(!searchOpen)} className="p-2.5 rounded-lg hover:bg-gray-100 transition md:hidden">
            <Search size={20} className="text-gray-700" />
          </button>
          <Link href="/cuenta/favoritos" className="p-2.5 rounded-lg hover:bg-gray-100 transition">
            <Heart size={20} className="text-gray-700" />
          </Link>
          <Link href="/cuenta" className="p-2.5 rounded-lg hover:bg-gray-100 transition hidden sm:flex">
            <User size={20} className="text-gray-700" />
          </Link>
          <Link href="/carrito" className="relative p-2.5 rounded-lg hover:bg-gray-100 transition">
            <ShoppingCart size={20} className="text-gray-700" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2.5 rounded-lg hover:bg-gray-100 transition md:hidden">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="px-4 pb-3 md:hidden border-t border-gray-100">
          <form action="/buscar">
            <input type="search" name="q" placeholder="Buscar..." autoFocus
              className="w-full h-10 px-4 border-2 border-[#1a3a5c] rounded-xl text-sm focus:outline-none" />
          </form>
        </div>
      )}

      {menuOpen && (
        <nav className="border-t border-gray-100 md:hidden bg-white">
          {[
            ["Pokemon", "/pokemon"], ["Magic", "/magic"], ["Yu-Gi-Oh!", "/yugioh"],
            ["Naruto", "/naruto"], ["Lorcana", "/lorcana"], ["Dragon Ball", "/dragon-ball"],
            ["Tiendas", "/tiendas"], ["Eventos", "/eventos"], ["Mayoristas B2B", "/mayoristas"],
          ].map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className="block px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0">
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
