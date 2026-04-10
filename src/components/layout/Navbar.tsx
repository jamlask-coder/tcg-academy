"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { MegaMenu } from "./MegaMenu";
import { TiendasMenu } from "./TiendasMenu";
import { MayoristasMenu } from "./MayoristasMenu";
import { OtrosMenu } from "./OtrosMenu";
import { MEGA_MENU_DATA } from "@/data/megaMenuData";
import { Container } from "@/components/ui/Container";

// ─── Constants ─────────────────────────────────────────────────────────────────
// NAV_HEIGHT: total navbar height in px
const NAV_HEIGHT = 56;
const TIENDAS_KEY = "tiendas";
const MAYORISTAS_KEY = "mayoristas";
const OTROS_KEY = "otros";

const NAVBAR_GAMES = MEGA_MENU_DATA.slice(0, 6);

export function Navbar() {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setActiveItem(null), 300);
  }, [cancelClose]);

  const openItem = useCallback(
    (key: string) => {
      if (lockedRef.current) return;
      cancelClose();
      setActiveItem(key);
    },
    [cancelClose],
  );

  const closeNow = useCallback(() => {
    cancelClose();
    setActiveItem(null);
  }, [cancelClose]);

  const handleNavMouseLeave = useCallback(() => {
    lockedRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const handleLinkClick = useCallback(() => {
    lockedRef.current = true;
    closeNow();
  }, [closeNow]);

  const activeGameData =
    activeItem &&
    activeItem !== TIENDAS_KEY &&
    activeItem !== MAYORISTAS_KEY &&
    activeItem !== OTROS_KEY
      ? (MEGA_MENU_DATA.find((g) => g.slug === activeItem) ?? null)
      : null;

  return (
    <div className="z-40 hidden lg:block" onMouseLeave={handleNavMouseLeave}>
      <nav
        className="relative overflow-hidden border-b border-white/10"
        style={{ background: "#1f2937", minHeight: NAV_HEIGHT }}
      >
        <Container>
          <div className="flex items-center justify-center" style={{ minHeight: NAV_HEIGHT }}>
            {/* ── Games group ───────────────────────────────────────────────── */}
            <div className="flex min-w-0 items-stretch" style={{ height: NAV_HEIGHT }}>
              {/* ── 6 game names — text only, no logos, no scale animations ── */}
              {NAVBAR_GAMES.map(
                ({ slug, label, href, color }) => {
                  const active =
                    pathname === href || pathname.startsWith(href + "/");
                  const open = activeItem === slug;
                  const highlighted = active || open;
                  // Pokémon already has good subtle glow; others get stronger effect
                  const glowStrength = slug === "pokemon" ? "55" : "90";
                  const bgStrength = slug === "pokemon" ? "33" : "55";
                  return (
                    <div
                      key={slug}
                      className="flex items-stretch"
                      onMouseEnter={() => openItem(slug)}
                    >
                      <Link
                        href={href}
                        onClick={handleLinkClick}
                        className="relative z-10 flex items-center justify-center rounded-lg px-4 transition-colors duration-150"
                        style={{
                          background: highlighted
                            ? `radial-gradient(ellipse at center, ${color}${bgStrength} 0%, ${color}22 60%, transparent 85%)`
                            : "transparent",
                        }}
                        title={label}
                      >
                        <span
                          className="text-sm font-bold tracking-wide whitespace-nowrap"
                          style={{
                            color: highlighted ? color : "rgba(255,255,255,0.85)",
                            textShadow: highlighted
                              ? `0 0 14px ${color}${glowStrength}, 0 0 28px ${color}44`
                              : "none",
                          }}
                        >
                          {label}
                        </span>
                      </Link>
                    </div>
                  );
                },
              )}

              {/* ── "Otros TCG" ───────────────────────────────────────────────── */}
              <div
                className="flex shrink-0 items-stretch"
                onMouseEnter={() => openItem(OTROS_KEY)}
              >
                <button
                  aria-label="Otros TCG: Dragon Ball, Naruto, Lorcana, Panini, Digimon"
                  aria-expanded={activeItem === OTROS_KEY}
                  className={`relative z-10 -mb-px flex items-center gap-1 border-b-2 px-3.5 text-sm font-semibold transition-all ${
                    activeItem === OTROS_KEY
                      ? "border-white text-white"
                      : "border-transparent text-white/80 hover:text-white"
                  }`}
                >
                  Otros TCG
                  <ChevronDown
                    size={11}
                    className={`ml-0.5 transition-transform duration-200 ${
                      activeItem === OTROS_KEY ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* ── Separator ────────────────────────────────────────────────── */}
            <div className="relative z-10 mx-2 h-5 w-px flex-shrink-0 bg-white/20" />

            {/* ── Eventos ──────────────────────────────────────────────────── */}
            <div
              onMouseEnter={() => setActiveItem(null)}
              className="flex items-stretch"
            >
              <Link
                href="/eventos"
                className={`relative z-10 -mb-px flex items-center border-b-2 px-3.5 text-sm font-semibold whitespace-nowrap transition ${
                  pathname.startsWith("/eventos")
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-white/80 hover:text-white"
                }`}
              >
                Eventos
              </Link>
            </div>

            {/* ── Tiendas ──────────────────────────────────────────────────── */}
            <div
              onMouseEnter={() => openItem(TIENDAS_KEY)}
              className="flex items-stretch"
            >
              <button
                aria-label="Ver nuestras tiendas"
                aria-expanded={activeItem === TIENDAS_KEY}
                className={`relative z-10 -mb-px flex items-center gap-1 border-b-2 px-3.5 text-sm font-semibold whitespace-nowrap transition ${
                  activeItem === TIENDAS_KEY || pathname.startsWith("/tiendas")
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-white/80 hover:text-white"
                }`}
              >
                Tiendas
                <ChevronDown
                  size={11}
                  className={`ml-0.5 transition-transform duration-200 ${
                    activeItem === TIENDAS_KEY ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* ── Profesionales ────────────────────────────────────────────── */}
            <div
              onMouseEnter={() => openItem(MAYORISTAS_KEY)}
              className="flex items-stretch"
            >
              <button
                aria-label="Ver soluciones para profesionales"
                aria-expanded={activeItem === MAYORISTAS_KEY}
                className={`relative z-10 -mb-px flex items-center gap-1 border-b-2 px-3.5 text-sm font-semibold whitespace-nowrap transition ${
                  activeItem === MAYORISTAS_KEY ||
                  pathname.startsWith("/mayoristas")
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-white/80 hover:text-white"
                }`}
              >
                Profesionales
                <ChevronDown
                  size={11}
                  className={`ml-0.5 transition-transform duration-200 ${
                    activeItem === MAYORISTAS_KEY ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </Container>
      </nav>

      {/* Dropdown panels */}
      <div className="absolute right-0 left-0">
        <AnimatePresence>
          {activeGameData && (
            <MegaMenu game={activeGameData} onClose={closeNow} />
          )}
          {activeItem === TIENDAS_KEY && (
            <TiendasMenu key="tiendas" onClose={closeNow} />
          )}
          {activeItem === MAYORISTAS_KEY && (
            <MayoristasMenu key="mayoristas" onClose={closeNow} />
          )}
          {activeItem === OTROS_KEY && (
            <OtrosMenu key="otros" onClose={closeNow} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
