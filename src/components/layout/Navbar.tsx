"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { MegaMenu } from "./MegaMenu";
import { EventosMenu } from "./EventosMenu";
import { OtrosMenu } from "./OtrosMenu";
import { MEGA_MENU_DATA } from "@/data/megaMenuData";
import { getMergedMegaMenu } from "@/lib/megaMenuOverrides";
import { loadSubcategories } from "@/data/subcategories";
import { DataHub } from "@/lib/dataHub";
import { Container } from "@/components/ui/Container";

// ─── Cardmarket sprite sheet ───────────────────────────────────────────────────
const CM_SPRITE = "/images/ssGamesBig.png";
const SPRITE_SHEET_H = 140; // original sprite sheet height in px
const TARGET_H = 46;        // display height for normal logos
const TARGET_W = 130;       // normalized visual width for all logos

// Per-logo target overrides [maxW, maxH] — increase both to scale the logo up
const CM_SPRITE_TARGET: Record<string, [number, number]> = {
  // Pokémon: reducido 2026-04-22 — a 128x46 se cortaba la "N" por la derecha
  // y aparecía un artefacto del sprite vecino a la izquierda de la "P".
  pokemon: [134, 46],
  magic: [140, 48],
  "one-piece": [134, 48],
};

// Per-slug width/height overrides for image-based logos (not sprites)
const LOGO_SIZE_OVERRIDE: Record<string, { w: number; h: string }> = {
  topps: { w: 72, h: "h-7" },
};

// Logos that use a white version for the dark navbar
const WHITE_LOGO_OVERRIDE: Record<string, string> = {
  "one-piece": "/images/logos/onepiece-white.png",
};

// [origW, origX, vNudgePx, filter?]
// vNudgePx = desplazamiento vertical en px aplicado al logo renderizado
//   (negativo = sube, positivo = baja). Permite corregir el centrado óptico
//   cuando el arte dentro del sprite tiene padding asimétrico top/bottom.
// All logos are rendered at TARGET_W wide and TARGET_H tall (object-contain style)
const CM_SPRITES: Record<string, [number, number, number, string?]> = {
  magic: [408, 0, -4],
  yugioh: [392, 696, 0],
  pokemon: [273, 1228, 0],
  "dragon-ball": [382, 3288, 0],
  lorcana: [310, 5124, 0],
  riftbound: [319, 5976, 0, "brightness(0) invert(1) drop-shadow(0 0 4px rgba(0,0,0,0.9)) drop-shadow(0 0 8px rgba(0,0,0,0.7))"],
};

// NAV_HEIGHT: total navbar height in px — drives the center line position
const NAV_HEIGHT = 58;
// CENTER_LINE_Y: where the center of logo names sits (50% of nav)
const CENTER_LINE_Y = NAV_HEIGHT / 2;

// Total sprite sheet width (rightmost: riftbound origX=5976 + origW=319)
const SHEET_ORIG_W = 6295;

function CmSpriteLogo({ slug, label }: { slug: string; label: string }) {
  const data = CM_SPRITES[slug];
  if (!data) return null;
  const [origW, origX, vNudgePx, cssFilter] = data;

  const [targetW, targetH] = CM_SPRITE_TARGET[slug] ?? [TARGET_W, TARGET_H];
  // object-contain: scale by whichever axis fills the box first
  const scale = Math.min(targetW / origW, targetH / SPRITE_SHEET_H);
  const displayW = Math.round(origW * scale);
  const displayH = Math.round(SPRITE_SHEET_H * scale);
  const sheetW = Math.round(SHEET_ORIG_W * scale);
  const bgX = (-origX * scale).toFixed(1);

  return (
    <span
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: displayW,
        height: NAV_HEIGHT,
        flexShrink: 0,
        transition: "transform 0.2s",
      }}
      className="transition-transform duration-300 group-hover/logo:scale-110"
    >
      <span
        style={{
          display: "inline-block",
          width: displayW,
          height: displayH,
          backgroundImage: `url('${CM_SPRITE}')`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${sheetW}px ${displayH}px`,
          backgroundPosition: `${bgX}px 0px`,
          filter: cssFilter,
          transform: vNudgePx ? `translateY(${vNudgePx}px)` : undefined,
        }}
      />
    </span>
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

  const sizeOverride = LOGO_SIZE_OVERRIDE[slug];
  const w = sizeOverride?.w ?? TARGET_W;
  const hClass = sizeOverride?.h ?? "h-11";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={WHITE_LOGO_OVERRIDE[slug] ?? src}
      alt={label}
      width={110}
      height={28}
      className={`relative z-10 ${hClass} object-contain transition-transform duration-300 group-hover/logo:scale-110`}
      style={{ width: w, maxWidth: w }}
      onError={() => setErrored(true)}
    />
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const EVENTOS_KEY = "eventos";
const TIENDAS_KEY = "tiendas";
const MAYORISTAS_KEY = "mayoristas";
const OTROS_KEY = "otros";

// Juegos cuyo logo abre un dropdown de COLECCIONES al pasar el ratón. Pokémon
// NO tiene desplegable — el resto de juegos ("Otros TCG") tampoco; ellos usan
// el menú "Otros" aparte.
const COLLECTION_PRIMARY_SLUGS = ["magic", "one-piece", "riftbound"];

export function Navbar() {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);
  const navRef = useRef<HTMLDivElement>(null);
  const logoRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeLogoLeft, setActiveLogoLeft] = useState<number | null>(null);
  const [menuData, setMenuData] = useState(() => MEGA_MENU_DATA);
  useEffect(() => {
    const reload = () => {
      const base = getMergedMegaMenu();
      const subs = loadSubcategories();
      // Para los 4 juegos principales: sustituimos las columnas del mega-menú
      // por una sola columna "Colecciones" — primero "Todos" (link al juego)
      // y luego cada colección en el orden definido en admin.
      const transformed = base.map((g) => {
        if (!COLLECTION_PRIMARY_SLUGS.includes(g.slug)) return g;
        const collections = subs[g.slug] ?? [];
        return {
          ...g,
          columns: [
            {
              title: "Colecciones",
              items: [
                { label: "Todos", href: `/${g.slug}` },
                ...collections.map((c) => ({
                  label: c.label,
                  href: `/${g.slug}?coleccion=${c.id}`,
                })),
              ],
            },
          ],
        };
      });
      setMenuData(transformed);
    };
    reload();
    const offMega = DataHub.on("megamenu", reload);
    const offSubs = DataHub.on("subcategories", reload);
    return () => {
      offMega();
      offSubs();
    };
  }, []);
  const NAVBAR_GAMES = menuData.slice(0, 4);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setActiveItem(null), 150);
  }, [cancelClose]);

  const openItem = useCallback(
    (key: string) => {
      if (lockedRef.current) return;
      cancelClose();
      setActiveItem(key);
      // Calculate center X of the logo relative to the navRef container
      const logoEl = logoRefsMap.current.get(key);
      if (logoEl && navRef.current) {
        const logoRect = logoEl.getBoundingClientRect();
        const navRect = navRef.current.getBoundingClientRect();
        setActiveLogoLeft(logoRect.left + logoRect.width / 2 - navRect.left);
      } else {
        setActiveLogoLeft(null);
      }
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
    activeItem !== EVENTOS_KEY &&
    activeItem !== TIENDAS_KEY &&
    activeItem !== MAYORISTAS_KEY &&
    activeItem !== OTROS_KEY &&
    COLLECTION_PRIMARY_SLUGS.includes(activeItem)
      ? (menuData.find((g) => g.slug === activeItem) ?? null)
      : null;

  // Home: el hero ya muestra la navegación por juegos — ocultamos la barra
  // secundaria para no duplicar el contenido.
  if (pathname === "/") return null;

  return (
    <div ref={navRef} role="presentation" className="relative z-40 hidden lg:block" onMouseLeave={handleNavMouseLeave}>
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
          <div className="flex items-center justify-center" style={{ minHeight: NAV_HEIGHT }}>
            {/* ── Grupo izquierda: juegos + Otros TCG ───────────────────────── */}
            <div className="flex min-w-0 items-stretch" style={{ height: NAV_HEIGHT }}>
              {/* ── 6 game logos ──────────────────────────────────────────────── */}
              {NAVBAR_GAMES.map(
                ({ slug, label, href, color, abbrev, logoSrc }) => {
                  const active =
                    pathname === href || pathname.startsWith(href + "/");
                  const open = activeItem === slug;
                  const isHoveredGame = activeItem === slug;
                  return (
                    <div
                      key={slug}
                      ref={(el) => { if (el) logoRefsMap.current.set(slug, el); }}
                      role="presentation"
                      className="group/logo flex items-stretch"
                      onMouseEnter={() => openItem(slug)}
                      style={(() => {
                        const anyGameInNavHovered = activeItem !== null && activeItem !== EVENTOS_KEY && activeItem !== TIENDAS_KEY && activeItem !== MAYORISTAS_KEY && activeItem !== OTROS_KEY;
                        const onAGamePage = NAVBAR_GAMES.some(g => pathname === `/${g.slug}` || pathname.startsWith(`/${g.slug}/`));

                        // Hover takes priority
                        if (anyGameInNavHovered) {
                          return {
                            transform: isHoveredGame ? "scale(1.18)" : "scale(0.88)",
                            opacity: isHoveredGame ? 1 : 0.45,
                            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
                            zIndex: isHoveredGame ? 5 : 1,
                          };
                        }
                        // On a game page: current big, rest dimmed
                        if (onAGamePage) {
                          return {
                            transform: active ? "scale(1.18)" : "scale(0.92)",
                            opacity: active ? 1 : 0.4,
                            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
                            zIndex: active ? 5 : 1,
                          };
                        }
                        // Default: all normal
                        return {
                          transform: "scale(1)",
                          opacity: 1,
                          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
                          zIndex: 1,
                        };
                      })()}
                    >
                      <Link
                        href={href}
                        onClick={handleLinkClick}
                        className="relative z-10 flex items-center justify-center px-3"
                        style={{
                          // ellipse 60px×30px (radio) → 120×60 total. Cabe holgado
                          // dentro de cualquier caja de logo (≥130px de ancho con
                          // px-3) → el borde transparente queda dentro de la
                          // caja y no se ve el corte vertical lateral.
                          background:
                            active || open
                              ? `radial-gradient(ellipse 60px 30px at center, ${color}DD 0%, ${color}55 55%, transparent 95%)`
                              : "transparent",
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
                role="presentation"
                className="flex shrink-0 items-stretch"
                onMouseEnter={() => openItem(OTROS_KEY)}
              >
                <button
                  aria-label="Otros TCG: Yu-Gi-Oh!, Topps, Dragon Ball, Naruto, Lorcana, Panini, Digimon"
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
            <div className="relative z-10 mx-2 h-5 w-px flex-shrink-0 self-center bg-white/20" />

            {/* ── Grupo derecha: Eventos · Tiendas · Profesionales ─────────── */}
            <div className="flex items-stretch" style={{ height: NAV_HEIGHT }}>
              {/* ── Eventos ──────────────────────────────────────────────────── */}
              <div
                role="presentation"
                onMouseEnter={() => openItem(EVENTOS_KEY)}
                className="flex items-stretch"
              >
                <button
                  aria-label="Ver próximos eventos"
                  aria-expanded={activeItem === EVENTOS_KEY}
                  className={`relative z-10 -mb-px flex items-center gap-1 border-b-2 px-3.5 text-sm font-semibold whitespace-nowrap transition ${
                    activeItem === EVENTOS_KEY || pathname.startsWith("/eventos")
                      ? "border-amber-400 text-amber-300"
                      : "border-transparent text-white/80 hover:text-white"
                  }`}
                >
                  Eventos
                  <ChevronDown
                    size={11}
                    className={`ml-0.5 transition-transform duration-200 ${
                      activeItem === EVENTOS_KEY ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* ── Tiendas ──────────────────────────────────────────────────── */}
              <div
                role="presentation"
                onMouseEnter={() => setActiveItem(null)}
                className="flex items-stretch"
              >
                <Link
                  href="/tiendas"
                  className={`relative z-10 -mb-px flex items-center border-b-2 px-3.5 text-sm font-semibold whitespace-nowrap transition ${
                    pathname.startsWith("/tiendas")
                      ? "border-amber-400 text-amber-300"
                      : "border-transparent text-white/80 hover:text-white"
                  }`}
                >
                  Tiendas
                </Link>
              </div>

              {/* ── Profesionales ────────────────────────────────────────────── */}
              <div
                role="presentation"
                onMouseEnter={() => setActiveItem(null)}
                className="flex items-stretch"
              >
                <Link
                  href="/mayoristas"
                  className={`relative z-10 -mb-px flex items-center border-b-2 px-3.5 text-sm font-semibold whitespace-nowrap transition ${
                    pathname.startsWith("/mayoristas")
                      ? "border-amber-400 text-amber-300"
                      : "border-transparent text-white/80 hover:text-white"
                  }`}
                >
                  Profesionales
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </nav>

      {/* Dropdown panels — absolute, positioned by navRef (relative parent) */}
      <div className="absolute right-0 left-0 z-50">
        <AnimatePresence>
          {activeGameData && (
            <MegaMenu game={activeGameData} onClose={closeNow} logoCenterX={activeLogoLeft ?? undefined} />
          )}
          {activeItem === EVENTOS_KEY && (
            <EventosMenu key="eventos" onClose={closeNow} />
          )}
          {activeItem === OTROS_KEY && (
            <OtrosMenu key="otros" onClose={closeNow} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
