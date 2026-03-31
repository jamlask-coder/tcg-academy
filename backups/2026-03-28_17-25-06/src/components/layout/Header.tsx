"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart, Heart, User, Search, Menu, X, Settings, Bell } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { useAuth } from "@/context/AuthContext"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { PRODUCTS, GAME_CONFIG } from "@/data/products"
import { useNotifications } from "@/context/NotificationContext"

// ─── Predictive search dropdown ───────────────────────────────────────────────

function SearchDropdown({
  query,
  onSelect,
}: {
  query: string
  onSelect: () => void
}) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query])

  if (query.trim().length < 2) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
      {results.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-400 text-center">
          Sin resultados para &ldquo;{query}&rdquo;
        </p>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {results.map((p) => {
              const config = GAME_CONFIG[p.game]
              return (
                <Link
                  key={p.id}
                  href={`/${p.game}/${p.category}/${p.slug}`}
                  onClick={onSelect}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  {/* Game-colored icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ backgroundColor: config?.bgColor || "#f3f4f6" }}
                  >
                    <span role="img" aria-label={p.game}>{config?.emoji || "🃏"}</span>
                  </div>
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p
                      className="text-[11px] font-semibold mt-0.5"
                      style={{ color: config?.color || "#6b7280" }}
                    >
                      {config?.name || p.game}
                    </p>
                  </div>
                  {/* Price */}
                  <p className="text-sm font-bold text-[#1a3a5c] whitespace-nowrap">
                    {p.price.toFixed(2)}€
                  </p>
                </Link>
              )
            })}
          </div>
          {/* "See all" footer */}
          <Link
            href={`/busqueda?q=${encodeURIComponent(query.trim())}`}
            onClick={onSelect}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-[#1a3a5c] border-t border-gray-100"
          >
            <Search size={14} />
            Ver todos los resultados para &ldquo;{query.trim()}&rdquo;
          </Link>
        </>
      )}
    </div>
  )
}

// ─── Trust bar (mobile rotating) ──────────────────────────────────────────────

const TRUST_MESSAGES = [
  "Envío gratis desde 149€",
  "Entrega en menos de 24h con GLS",
  "Devolución gratuita en 30 días",
  "Pago 100% seguro",
]

function MobileTrustBar() {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % TRUST_MESSAGES.length)
        setFading(false)
      }, 300)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-[#1a3a5c] text-white text-xs py-1.5 lg:hidden text-center px-4">
      <span className="transition-opacity duration-300" style={{ opacity: fading ? 0 : 1 }}>
        {TRUST_MESSAGES[idx]}
      </span>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  const { count } = useCart()
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const router = useRouter()

  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // Desktop search state
  const [desktopQuery, setDesktopQuery] = useState("")
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false)
  const desktopSearchRef = useRef<HTMLDivElement>(null)

  // Mobile search state
  const [mobileQuery, setMobileQuery] = useState("")
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node))
        setDesktopDropdownOpen(false)
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node))
        setMobileDropdownOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setDesktopDropdownOpen(false); setMobileDropdownOpen(false) }
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  const submitSearch = useCallback((q: string, isMobile = false) => {
    if (!q.trim()) return
    router.push(`/busqueda?q=${encodeURIComponent(q.trim())}`)
    setDesktopDropdownOpen(false)
    setDesktopQuery("")
    setMobileDropdownOpen(false)
    setMobileQuery("")
    if (isMobile) setMobileSearchOpen(false)
  }, [router])

  const handleDesktopSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault(); submitSearch(desktopQuery)
  }, [desktopQuery, submitSearch])

  const handleMobileSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault(); submitSearch(mobileQuery, true)
  }, [mobileQuery, submitSearch])

  const closeDesktopSearch = useCallback(() => {
    setDesktopDropdownOpen(false); setDesktopQuery("")
  }, [])

  const closeMobileSearch = useCallback(() => {
    setMobileDropdownOpen(false); setMobileQuery("")
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      {/* Topbar — desktop */}
      <div className="bg-[#1a3a5c] text-white text-xs py-1.5 hidden md:block">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-0 opacity-85">
            <span>Envío gratis desde 149€</span>
            <span className="mx-4 border-l border-white/25 h-3" />
            <span>Entrega en menos de 24h con GLS</span>
            <span className="mx-4 border-l border-white/25 h-3" />
            <span>Devolución gratuita en 30 días</span>
          </div>
          <div className="flex items-center gap-4 opacity-85">
            <span>Pago 100% seguro</span>
            <span className="mx-2 border-l border-white/25 h-3" />
            <Link href="/tiendas" className="hover:opacity-100">4 Tiendas físicas</Link>
          </div>
        </div>
      </div>
      {/* Topbar — mobile rotating */}
      <MobileTrustBar />

      {/* Main bar */}
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#1a3a5c] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-xl font-bold text-[#1a3a5c] hidden sm:block">TCG Academy</span>
        </Link>

        {/* Desktop predictive search */}
        <div className="flex-1 max-w-xl hidden lg:block relative" ref={desktopSearchRef}>
          <form onSubmit={handleDesktopSubmit}>
            <input
              type="search"
              value={desktopQuery}
              onChange={(e) => {
                setDesktopQuery(e.target.value)
                setDesktopDropdownOpen(e.target.value.trim().length >= 2)
              }}
              onFocus={() => {
                if (desktopQuery.trim().length >= 2) setDesktopDropdownOpen(true)
              }}
              placeholder="Busca cartas, sobres, mazos..."
              className="w-full h-10 pl-4 pr-10 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] bg-gray-50 transition"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1a3a5c] min-w-[44px] min-h-[44px] flex items-center justify-center -mr-3"
            >
              <Search size={18} />
            </button>
          </form>

          {desktopDropdownOpen && (
            <SearchDropdown query={desktopQuery} onSelect={closeDesktopSearch} />
          )}
        </div>

        {/* Right-side icons */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Mobile search toggle */}
          <button
            onClick={() => {
              setMobileSearchOpen(!mobileSearchOpen)
              if (mobileSearchOpen) {
                setMobileQuery("")
                setMobileDropdownOpen(false)
              }
            }}
            className="p-2.5 rounded-lg hover:bg-gray-100 transition lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Buscar"
          >
            <Search size={20} className="text-gray-700" />
          </button>

          {/* Admin shortcut */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="p-2.5 rounded-lg hover:bg-gray-100 transition hidden sm:flex items-center justify-center min-w-[44px] min-h-[44px]"
              title="Panel Admin"
            >
              <Settings size={20} className="text-amber-600" />
            </Link>
          )}

          {/* Notifications (visible when logged in) */}
          {user && (
            <Link
              href="/cuenta/notificaciones"
              className="relative p-2.5 rounded-lg hover:bg-gray-100 transition hidden sm:flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
            >
              <Bell size={20} className="text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Favorites */}
          <Link
            href="/cuenta/favoritos"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Favoritos"
          >
            <Heart size={20} className="text-gray-700" />
          </Link>

          {/* Account */}
          <Link
            href="/cuenta"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition hidden sm:flex items-center justify-center min-w-[44px] min-h-[44px]"
            aria-label="Mi cuenta"
          >
            {user ? (
              <div className="w-6 h-6 rounded-full bg-[#1a3a5c] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{user.name[0]}</span>
              </div>
            ) : (
              <User size={20} className="text-gray-700" />
            )}
          </Link>

          {/* Cart */}
          <Link
            href="/carrito"
            className="relative p-2.5 rounded-lg hover:bg-gray-100 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`Carrito (${count} artículos)`}
          >
            <ShoppingCart size={20} className="text-gray-700" />
            {count > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center leading-none px-0.5">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2.5 rounded-lg hover:bg-gray-100 transition lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile search panel */}
      {mobileSearchOpen && (
        <div className="px-4 pb-3 lg:hidden border-t border-gray-100" ref={mobileSearchRef}>
          <form onSubmit={handleMobileSubmit} className="relative">
            <input
              type="search"
              value={mobileQuery}
              onChange={(e) => {
                setMobileQuery(e.target.value)
                setMobileDropdownOpen(e.target.value.trim().length >= 2)
              }}
              placeholder="Buscar productos..."
              autoFocus
              className="w-full h-11 pl-4 pr-10 border-2 border-[#1a3a5c] rounded-xl text-sm focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a3a5c]"
            >
              <Search size={18} />
            </button>
          </form>
          {mobileDropdownOpen && (
            <div className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
              <SearchDropdown query={mobileQuery} onSelect={closeMobileSearch} />
            </div>
          )}
        </div>
      )}

      {/* Mobile hamburger menu */}
      {menuOpen && (
        <nav className="border-t border-gray-100 lg:hidden bg-white">
          {[
            ["Magic: The Gathering", "/magic"],
            ["Pokémon", "/pokemon"],
            ["One Piece", "/one-piece"],
            ["Riftbound", "/riftbound"],
            ["Topps", "/topps"],
            ["Disney Lorcana", "/lorcana"],
            ["Dragon Ball Super", "/dragon-ball"],
            ["Yu-Gi-Oh!", "/yugioh"],
            ["Naruto Mythos", "/naruto"],
            ["Eventos", "/eventos"],
            ["Tiendas", "/tiendas"],
            ["Mi cuenta", "/cuenta"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0 min-h-[44px] flex items-center"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
