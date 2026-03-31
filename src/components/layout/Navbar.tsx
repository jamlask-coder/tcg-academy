"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { MegaMenu } from "./MegaMenu";
import { TiendasMenu } from "./TiendasMenu";
import { MayoristasMenu } from "./MayoristasMenu";
import { OtrosMenu } from "./OtrosMenu";
import { MEGA_MENU_DATA } from "@/data/megaMenuData";
import { Container } from "@/components/ui/Container";

// ─── Logo component ────────────────────────────────────────────────────────────
function GameLogo({
  src,
  abbrev,
  color,
  label,
}: {
  src: string;
  abbrev: string;
  color: string;
  label: string;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className="flex h-7 items-center justify-center rounded-md px-2 text-[9px] font-black tracking-wide whitespace-nowrap text-white"
        style={{ backgroundColor: color }}
      >
        {abbrev}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      width={80}
      height={28}
      className="h-8 w-auto max-w-[80px] object-contain transition-transform duration-200 group-hover/logo:scale-105"
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }}
      onError={() => setErrored(true)}
    />
  );
}

// ─── Overflow mini-dropdown (shown at lg, hidden at xl) ───────────────────────
function OverflowDropdown({
  games,
  onClose,
  onGameHover,
}: {
  games: typeof MEGA_MENU_DATA;
  onClose: () => void;
  onGameHover: (slug: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="border-t-2 border-t-gray-200 bg-white shadow-xl"
    >
      <Container className="py-4">
        <p className="mb-3 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
          Más juegos
        </p>
        <div className="flex flex-wrap gap-3">
          {games.map((game) => (
            <div
              key={game.slug}
              onMouseEnter={() => onGameHover(game.slug)}
              className="group/logo cursor-pointer rounded-xl border border-gray-100 px-4 py-2.5 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              <Link href={game.href} onClick={onClose}>
                <GameLogo
                  src={game.logoSrc}
                  abbrev={game.abbrev}
                  color={game.color}
                  label={game.label}
                />
              </Link>
            </div>
          ))}
          {/* Otros section */}
          <div className="flex items-center gap-2 border-l border-gray-100 pl-3 ml-1">
            {[
              { href: "/lorcana", label: "Lorcana", emoji: "🌀", color: "#0891b2" },
              { href: "/panini", label: "Panini", emoji: "⚽", color: "#16a34a" },
              { href: "/digimon", label: "Digimon", emoji: "🦖", color: "#2563eb" },
            ].map(({ href, label, emoji, color }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl border border-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-200 hover:shadow-sm"
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </motion.div>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const OVERFLOW_KEY = "overflow";
const TIENDAS_KEY = "tiendas";
const MAYORISTAS_KEY = "mayoristas";
const OTROS_KEY = "otros";

// First 6 games always visible at lg+, last 3 in overflow at lg / direct at xl
const PRIMARY_GAMES = MEGA_MENU_DATA.slice(0, 6);
const OVERFLOW_GAMES = MEGA_MENU_DATA.slice(6);

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

  // Find game data for active item (works for all 9 games)
  const activeGameData =
    activeItem &&
    activeItem !== OVERFLOW_KEY &&
    activeItem !== TIENDAS_KEY &&
    activeItem !== MAYORISTAS_KEY &&
    activeItem !== OTROS_KEY
      ? (MEGA_MENU_DATA.find((g) => g.slug === activeItem) ?? null)
      : null;

  return (
    <div className="z-40 hidden lg:block" onMouseLeave={handleNavMouseLeave}>
      <nav className="border-b border-gray-200 bg-white">
        <Container>
          <div className="flex items-center">
            {/* ── Primary 6 games — always visible at lg+ ─────────────────── */}
            {PRIMARY_GAMES.map(({ slug, label, href, color, abbrev, logoSrc }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              const open = activeItem === slug;
              return (
                <div
                  key={slug}
                  className="group/logo rounded-xl transition-colors duration-200"
                  onMouseEnter={() => openItem(slug)}
                >
                  <Link
                    href={href}
                    onClick={handleLinkClick}
                    className="-mb-px flex items-center border-b-2 px-1.5 py-4 transition-all duration-200"
                    style={{
                      borderBottomColor:
                        active || open ? color : "transparent",
                    }}
                    title={label}
                  >
                    <span
                      className="flex items-center rounded-lg px-2.5 py-1.5 transition-all duration-200 group-hover/logo:scale-[1.03] group-hover/logo:bg-blue-100"
                      style={{
                        backgroundColor:
                          active || open ? "rgba(37,99,235,0.10)" : "rgba(219,234,254,0.55)",
                      }}
                    >
                      <GameLogo
                        src={logoSrc}
                        abbrev={abbrev}
                        color={color}
                        label={label}
                      />
                    </span>
                  </Link>
                </div>
              );
            })}

            {/* ── Overflow games — visible at xl+, in "+" at lg ────────────── */}
            {OVERFLOW_GAMES.map(({ slug, label, href, color, abbrev, logoSrc }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              const open = activeItem === slug;
              return (
                <div
                  key={slug}
                  className="group/logo hidden rounded-xl transition-colors duration-200 xl:block"
                  onMouseEnter={() => openItem(slug)}
                >
                  <Link
                    href={href}
                    onClick={handleLinkClick}
                    className="-mb-px flex items-center border-b-2 px-1.5 py-4 transition-all duration-200"
                    style={{
                      borderBottomColor:
                        active || open ? color : "transparent",
                    }}
                    title={label}
                  >
                    <span
                      className="flex items-center rounded-lg px-2.5 py-1.5 transition-all duration-200 group-hover/logo:scale-[1.03] group-hover/logo:bg-blue-100"
                      style={{
                        backgroundColor:
                          active || open ? "rgba(37,99,235,0.10)" : "rgba(219,234,254,0.55)",
                      }}
                    >
                      <GameLogo
                        src={logoSrc}
                        abbrev={abbrev}
                        color={color}
                        label={label}
                      />
                    </span>
                  </Link>
                </div>
              );
            })}

            {/* ── "+" overflow button — only at lg (hidden at xl) ───────────── */}
            <div
              className="xl:hidden"
              onMouseEnter={() => openItem(OVERFLOW_KEY)}
            >
              <button
                aria-label="Ver más juegos"
                aria-expanded={activeItem === OVERFLOW_KEY}
                className={`-mb-px flex items-center gap-1 border-b-2 px-3 py-4 transition-all ${
                  activeItem === OVERFLOW_KEY
                    ? "border-gray-400 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-[10px] font-bold whitespace-nowrap">
                  +{OVERFLOW_GAMES.length + 1}
                </span>
                <ChevronDown
                  size={10}
                  className={`transition-transform duration-200 ${
                    activeItem === OVERFLOW_KEY ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* ── "Otros" — visible at xl+ ──────────────────────────────────── */}
            <div
              className="hidden xl:block"
              onMouseEnter={() => openItem(OTROS_KEY)}
            >
              <button
                aria-label="Otros juegos: Lorcana, Panini, Digimon"
                aria-expanded={activeItem === OTROS_KEY}
                className={`-mb-px flex items-center gap-1 border-b-2 px-3.5 py-4 text-sm transition-all ${
                  activeItem === OTROS_KEY
                    ? "border-gray-500 font-medium text-gray-800"
                    : "border-transparent font-normal italic text-gray-400 hover:text-gray-700"
                }`}
              >
                Otros
                <ChevronDown
                  size={11}
                  className={`ml-0.5 transition-transform duration-200 ${
                    activeItem === OTROS_KEY ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* ── Separator ────────────────────────────────────────────────── */}
            <div className="mx-2 h-5 w-px flex-shrink-0 bg-gray-200" />

            {/* ── Eventos — plain link ─────────────────────────────────────── */}
            <div onMouseEnter={() => setActiveItem(null)}>
              <Link
                href="/eventos"
                className={`-mb-px block border-b-2 px-3.5 py-4 text-sm font-medium whitespace-nowrap transition ${
                  pathname.startsWith("/eventos")
                    ? "border-[#2563eb] text-[#2563eb]"
                    : "border-transparent text-gray-500 hover:text-[#2563eb]"
                }`}
              >
                Eventos
              </Link>
            </div>

            {/* ── Tiendas — dropdown ───────────────────────────────────────── */}
            <div onMouseEnter={() => openItem(TIENDAS_KEY)}>
              <button
                aria-label="Ver nuestras tiendas"
                aria-expanded={activeItem === TIENDAS_KEY}
                className={`-mb-px flex items-center gap-1 border-b-2 px-3.5 py-4 text-sm font-medium whitespace-nowrap transition ${
                  activeItem === TIENDAS_KEY || pathname.startsWith("/tiendas")
                    ? "border-[#2563eb] text-[#2563eb]"
                    : "border-transparent text-gray-500 hover:text-[#2563eb]"
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

            {/* ── Profesionales — dropdown ────────────────────────────────────── */}
            <div onMouseEnter={() => openItem(MAYORISTAS_KEY)}>
              <button
                aria-label="Ver soluciones para profesionales"
                aria-expanded={activeItem === MAYORISTAS_KEY}
                className={`-mb-px flex items-center gap-1 border-b-2 px-3.5 py-4 text-sm font-medium whitespace-nowrap transition ${
                  activeItem === MAYORISTAS_KEY ||
                  pathname.startsWith("/mayoristas")
                    ? "border-[#2563eb] font-semibold text-[#2563eb]"
                    : "border-transparent text-gray-500 hover:text-[#2563eb]"
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
          {activeItem === OVERFLOW_KEY && !activeGameData && (
            <OverflowDropdown
              key="overflow"
              games={OVERFLOW_GAMES}
              onClose={closeNow}
              onGameHover={openItem}
            />
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
