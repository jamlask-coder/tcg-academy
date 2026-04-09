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

// ─── Cardmarket sprite sheet ───────────────────────────────────────────────────
const CM_SPRITE = "/images/ssGamesBig.png";
const H = 44; // display height in px
const SCALE = H / 140; // original sprite height is 140px

// [origW, origX, vOffset, filter?]
const CM_SPRITES: Record<string, [number, number, number, string?]> = {
  magic: [408, 0, 0],
  yugioh: [392, 696, 0],
  pokemon: [273, 1228, 0],
  "dragon-ball": [382, 3288, 0],
  "one-piece": [482, 4642, 12, "brightness(0) invert(1)"],
  lorcana: [310, 5124, 0],
  riftbound: [319, 5976, 0, "brightness(0) invert(1)"],
};

// NAV_HEIGHT: total navbar height in px — drives the center line position
const NAV_HEIGHT = 76;
// CENTER_LINE_Y: where the center of logo names sits (50% of nav)
const CENTER_LINE_Y = NAV_HEIGHT / 2;

function CmSpriteLogo({ slug, label }: { slug: string; label: string }) {
  const data = CM_SPRITES[slug];
  if (!data) return null;
  const [origW, origX, vOffset, cssFilter] = data;
  const w = Math.round(origW * SCALE);
  const x = Math.round(origX * SCALE);
  return (
    <span
      aria-label={label}
      style={{
        display: "inline-block",
        width: w,
        height: H,
        backgroundImage: `url('${CM_SPRITE}')`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `auto ${H}px`,
        backgroundPosition: `-${x}px ${vOffset}px`,
        filter: cssFilter,
        transition: "transform 0.2s",
        flexShrink: 0,
      }}
      className="group-hover/logo:scale-105"
    />
  );
}

// ─── Logo component ────────────────────────────────────────────────────────────
function GameLogo({
  slug,
  src,
  abbrev,
  color,
  label,
}: {
  slug: string;
  src: string;
  abbrev: string;
  color: string;
  label: string;
}) {
  const [errored, setErrored] = useState(false);

  if (CM_SPRITES[slug]) {
    return <CmSpriteLogo slug={slug} label={label} />;
  }

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
      width={110}
      height={28}
      className="relative z-10 h-10 w-auto max-w-[130px] object-contain transition-transform duration-200 group-hover/logo:scale-105"
      onError={() => setErrored(true)}
    />
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────
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
        {/* ── Centro de alineación — línea horizontal en el centro del nombre ── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: CENTER_LINE_Y,
            left: 0,
            right: 0,
            height: 1,
            background: "transparent",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <Container>
          <div className="flex items-center" style={{ minHeight: NAV_HEIGHT }}>
            {/* ── Games group ───────────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 items-stretch">
              {/* ── 6 game logos — seamless ───────────────────────────────────── */}
              {NAVBAR_GAMES.map(
                ({ slug, label, href, color, abbrev, logoSrc }) => {
                  const active =
                    pathname === href || pathname.startsWith(href + "/");
                  const open = activeItem === slug;
                  return (
                    <div
                      key={slug}
                      className="group/logo flex flex-1 items-stretch"
                      onMouseEnter={() => openItem(slug)}
                    >
                      <Link
                        href={href}
                        onClick={handleLinkClick}
                        className="relative z-10 -mb-px flex flex-1 items-center justify-center border-b-2 transition-all duration-200"
                        style={{
                          borderBottomColor:
                            active || open ? color : "transparent",
                          background:
                            active || open ? `${color}12` : "transparent",
                        }}
                        title={label}
                      >
                        <GameLogo
                          slug={slug}
                          src={logoSrc}
                          abbrev={abbrev}
                          color={color}
                          label={label}
                        />
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
