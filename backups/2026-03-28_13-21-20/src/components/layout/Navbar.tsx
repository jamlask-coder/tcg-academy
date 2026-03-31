"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useRef, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { MegaMenu } from "./MegaMenu"
import { OtrosTCGsMenu } from "./OtrosTCGsMenu"
import { TiendasMenu } from "./TiendasMenu"
import { MEGA_MENU_DATA } from "@/data/megaMenuData"

// ─── Logo component ────────────────────────────────────────────────────────────
// Shows the real logo image if available; falls back to a styled abbreviation div.
// Place logo file at `public/images/logos/<slug>.svg` to enable it.
function GameLogo({
  src,
  abbrev,
  color,
  label,
}: {
  src: string
  abbrev: string
  color: string
  label: string
}) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div
        className="h-8 px-2.5 rounded-md flex items-center justify-center text-white text-[10px] font-black tracking-wide whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {abbrev}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      width={96}
      height={32}
      className="h-8 w-auto object-contain max-w-[96px] transition-transform duration-200 group-hover/logo:scale-105"
      onError={() => setErrored(true)}
    />
  )
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const OTROS_KEY = "otros"
const TIENDAS_KEY = "tiendas"

export function Navbar() {
  const pathname = usePathname()
  const [activeItem, setActiveItem] = useState<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setActiveItem(null), 300)
  }, [cancelClose])

  const openItem = useCallback(
    (key: string) => {
      cancelClose()
      setActiveItem(key)
    },
    [cancelClose]
  )

  const closeNow = useCallback(() => {
    cancelClose()
    setActiveItem(null)
  }, [cancelClose])

  const activeGameData =
    activeItem && activeItem !== OTROS_KEY && activeItem !== TIENDAS_KEY
      ? (MEGA_MENU_DATA.find((g) => g.slug === activeItem) ?? null)
      : null

  return (
    <div
      className="z-40 hidden md:block"
      onMouseLeave={scheduleClose}
    >
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center">

            {/* ── Primary game items ──────────────────────────────────────── */}
            {MEGA_MENU_DATA.map(({ slug, label, href, color, abbrev, logoSrc }) => {
              const active = pathname === href || pathname.startsWith(href + "/")
              const open = activeItem === slug
              return (
                <div key={slug} className="group/logo" onMouseEnter={() => openItem(slug)}>
                  <Link
                    href={href}
                    className="flex items-center px-3.5 py-3 border-b-2 -mb-px transition-all duration-200"
                    style={{
                      borderBottomColor: active || open ? color : "transparent",
                      filter: active || open ? "none" : "grayscale(20%) opacity(0.85)",
                    }}
                    title={label}
                  >
                    <GameLogo src={logoSrc} abbrev={abbrev} color={color} label={label} />
                  </Link>
                </div>
              )
            })}

            {/* ── Otros TCGs ──────────────────────────────────────────────── */}
            <div onMouseEnter={() => openItem(OTROS_KEY)}>
              <button
                className={`flex items-center gap-1 px-4 py-3.5 border-b-2 -mb-px transition-all ${
                  activeItem === OTROS_KEY
                    ? "border-gray-400 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-[10px] font-bold whitespace-nowrap">Otros TCGs</span>
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-200 ${activeItem === OTROS_KEY ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200 mx-2 flex-shrink-0" />

            {/* ── Eventos — plain link ────────────────────────────────────── */}
            <div onMouseEnter={() => setActiveItem(null)}>
              <Link
                href="/eventos"
                className={`block px-4 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                  pathname.startsWith("/eventos")
                    ? "border-[#1a3a5c] text-[#1a3a5c]"
                    : "border-transparent text-gray-500 hover:text-[#1a3a5c]"
                }`}
              >
                Eventos
              </Link>
            </div>

            {/* ── Tiendas — dropdown ──────────────────────────────────────── */}
            <div onMouseEnter={() => openItem(TIENDAS_KEY)}>
              <button
                className={`flex items-center gap-1 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                  activeItem === TIENDAS_KEY || pathname.startsWith("/tiendas")
                    ? "border-[#1a3a5c] text-[#1a3a5c]"
                    : "border-transparent text-gray-500 hover:text-[#1a3a5c]"
                }`}
              >
                Tiendas
                <ChevronDown
                  size={11}
                  className={`ml-0.5 transition-transform duration-200 ${activeItem === TIENDAS_KEY ? "rotate-180" : ""}`}
                />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Dropdown panels */}
      <div className="absolute left-0 right-0">
        <AnimatePresence>
          {activeGameData && (
            <MegaMenu
              key={activeGameData.slug}
              game={activeGameData}
              onClose={closeNow}
            />
          )}
          {activeItem === OTROS_KEY && (
            <OtrosTCGsMenu key="otros" onClose={closeNow} />
          )}
          {activeItem === TIENDAS_KEY && (
            <TiendasMenu key="tiendas" onClose={closeNow} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
