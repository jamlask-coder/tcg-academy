"use client";

// ─── Mobile Drawer — estilo lista dark (tipo pokemillon/battledeck) ────────
// Sidebar oscura con secciones en mayúsculas (INICIO / OTROS TCG / EXPLORAR
// / INFO) y filas simples con icono + texto. Reinterpretado con la paleta
// TCG Academy: azul profundo + blanco + acentos ámbar.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Menu,
  User,
  LogOut,
  ChevronRight,
  ChevronDown,
  Gift,
  Package,
  Heart,
  FileText,
  Mail,
  MessageCircle,
  Briefcase,
  Building2,
  ShoppingBag,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import {
  MOBILE_GAMES as DRAWER_GAMES,
  MOBILE_GAMES_SPRITE_SRC as SPRITE_SRC,
  MOBILE_GAMES_SPRITE_H as SPRITE_H,
  type MobileGame,
} from "@/data/mobileGames";
import { SITE_CONFIG } from "@/config/siteConfig";

interface UserData {
  name: string;
  email?: string;
  role?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserData | null;
  logout: () => void;
  pathname: string;
}

// ─── Items estáticos reutilizables ─────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  /** Si se provee, se usa este nodo como icono en lugar del componente Lucide.
   *  Útil para filas con logo PNG (ej. B2B tintado ámbar). */
  customIcon?: React.ReactNode;
};

// Profesionales — orden: Vending → B2B → Franquicia
// Los 3 llevan icono custom (PNG procesado a ámbar) porque los Lucide no
// transmiten tan bien el concepto.
const PRO_ITEMS: NavItem[] = [
  {
    href: "/mayoristas/vending",
    label: "Vending",
    icon: ShoppingBag,
    customIcon: (
      // Máquina expendedora tintada en ámbar — concepto de vending directo.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/images/logos/vending-amber.png"
        alt=""
        className="h-[22px] w-[22px] object-contain"
      />
    ),
  },
  {
    href: "/mayoristas/b2b",
    label: "B2B",
    icon: Briefcase,
    customIcon: (
      // 3 tienditas conectadas con arcos — concepto de red B2B / red de
      // comercios conectados (silueta ámbar).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/images/logos/franquicias-amber.png"
        alt=""
        className="h-[22px] w-[22px] object-contain"
      />
    ),
  },
  {
    href: "/mayoristas/franquicias",
    label: "Franquicia",
    icon: Building2,
    customIcon: (
      // Sello "QUALITY SATISFACTION GUARANTEED" — concepto de marca certificada
      // / franquicia de calidad. Tinte ámbar con textura vintage preservada.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/images/logos/quality-seal-amber.png"
        alt=""
        className="h-[22px] w-[22px] object-contain"
      />
    ),
  },
];

// Info y ayuda — reducido a lo esencial (Nuestras tiendas + Contacto)
const HELP_ITEMS: NavItem[] = [
  { href: "/tiendas", label: "Nuestras tiendas", icon: MapPin },
  { href: "/contacto", label: "Contacto", icon: Mail },
];

// Slugs de juegos que aparecen bajo "Otros" (colapsado por defecto).
// El resto de DRAWER_GAMES aparece directamente en "Inicio".
const OTROS_SLUGS = new Set(["yugioh", "panini", "digimon", "lorcana", "naruto"]);

const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/cuenta/puntos", label: "Mis puntos", icon: Gift },
  { href: "/cuenta/facturas", label: "Facturas", icon: FileText },
  { href: "/cuenta/mensajes", label: "Mensajes", icon: MessageCircle },
];

// ─── Componentes auxiliares ────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-3 pb-1">
      <span className="text-[11px] font-black tracking-[0.22em] text-amber-300 uppercase">
        {children}
      </span>
    </div>
  );
}

function DarkRow({
  href,
  onClick,
  icon,
  label,
  badge,
  active,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex min-h-[52px] items-center gap-3 px-5 py-3 text-white transition-colors active:bg-white/10 ${
        active ? "bg-white/5" : "hover:bg-white/[0.04]"
      }`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span
        className={`flex-1 text-[13px] font-black tracking-[0.05em] uppercase ${
          active ? "text-amber-300" : "text-white"
        }`}
      >
        {label}
      </span>
      {badge && (
        <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-gray-900">
          {badge}
        </span>
      )}
      <ChevronRight size={15} className="shrink-0 text-white/30" />
    </Link>
  );
}

/** Icono a la IZQUIERDA del título de cada juego. Para los juegos con
 *  símbolo icónico (Pokeball, Riftbound, Magic) usamos SVG. Para el resto,
 *  usamos el logo oficial ya presente en el proyecto (sprite o imagen). */
function GameIcon({ game }: { game: MobileGame }) {
  const { slug, logo, sprite, filter, blend } = game;
  const box = "flex h-6 w-6 shrink-0 items-center justify-center";

  // Pokeball — imagen real que pasó el usuario, procesada (fondo recortado).
  if (slug === "pokemon") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/pokeball.png?v=2"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Riftbound — vórtice naranja (imagen real del usuario, fondo negro quitado
  // por umbral de calidez/luminancia).
  if (slug === "riftbound") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/riftbound-vortex.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Magic — símbolo Planeswalker (imagen real que pasó el usuario, con
  // fondo oscuro eliminado por umbral de color).
  if (slug === "magic") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/magic-planeswalker.png?v=2"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Dragon Ball — bola naranja 4 estrellas (imagen real del usuario, fondo
  // marrón oscuro quitado por flood fill por luminancia). ?v=2 = cache-buster
  // porque navegadores móviles tienden a cachear agresivamente los PNG.
  if (slug === "dragon-ball") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/dragonball-4stars.png?v=3"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Yu-Gi-Oh — triángulo rojo con letras (imagen real del usuario, fondo
  // negro quitado por umbral de luminancia).
  if (slug === "yugioh") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/yugioh-triangle.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // One Piece — calavera Straw Hat (imagen real del usuario, fondo blanco
  // quitado por flood fill desde los bordes — el cráneo interior queda intacto).
  if (slug === "one-piece") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/onepiece-strawhat.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Topps — wordmark rojo con contorno blanco (imagen real del usuario,
  // fondo negro quitado por umbral de luminancia). ?v=2 = cache-buster tras
  // cambiar el logo del círculo deportivo al nuevo wordmark.
  if (slug === "topps") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/topps-sports.png?v=4"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Naruto — sol con espiral naranja (imagen real del usuario, fondo blanco
  // quitado por flood fill).
  if (slug === "naruto") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/naruto-sun.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Lorcana — estrella dorada con adornos (imagen real del usuario, fondo
  // navy quitado por umbral de luminancia).
  if (slug === "lorcana") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/lorcana-star.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Digimon — Digivice amarillo (imagen real del usuario, fondo claro
  // quitado + chispitas decorativas eliminadas por keep-largest-component).
  if (slug === "digimon") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/digimon-digivice.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Cyberpunk — rayo amarillo/verde (imagen real del usuario, fondo negro
  // quitado por flood-fill desde los bordes con umbral de luminancia).
  if (slug === "cyberpunk") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/cyberpunk-bolt.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Panini — "P" roja con contorno negro (imagen real del usuario, fondo
  // amarillo eliminado; el hueco interior de la P se limpia por pasada global
  // porque el flood-fill desde bordes no alcanza áreas cerradas).
  if (slug === "panini") {
    return (
      <span className={box} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/panini-p.png"
          alt=""
          className="h-[22px] w-[22px] object-contain"
        />
      </span>
    );
  }

  // Resto: usar el logo oficial ya presente en el proyecto (sprite o imagen),
  // sobre fondo circular claro para que contraste con el drawer oscuro.
  if (sprite) {
    const renderH = 22;
    const scale = renderH / SPRITE_H;
    const w = sprite.origW * scale;
    const x = sprite.origX * scale;
    return (
      <span
        className={`${box} overflow-hidden rounded-full bg-white/95 p-0.5 ring-1 ring-white/20`}
        aria-hidden="true"
      >
        <span
          style={{
            display: "block",
            width: Math.min(w, 20),
            height: renderH,
            backgroundImage: `url(${SPRITE_SRC})`,
            backgroundSize: `auto ${renderH}px`,
            backgroundPosition: `-${x}px 0`,
            backgroundRepeat: "no-repeat",
            filter: sprite.filter ?? undefined,
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={`${box} overflow-hidden rounded-full bg-white/95 p-0.5 ring-1 ring-white/20`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        className="max-h-4 max-w-4 object-contain"
        style={{
          filter: filter ?? undefined,
          mixBlendMode: blend ? "multiply" : undefined,
        }}
      />
    </span>
  );
}

/** Fila de juego: icono IZQUIERDA + label + chevron derecha. Altura reducida. */
function GameRow({
  game,
  active,
  onClick,
}: {
  game: MobileGame;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={`/${game.slug}`}
      onClick={onClick}
      className={`flex min-h-[42px] items-center gap-3 px-5 py-2 text-white transition-colors active:bg-white/10 ${
        active ? "bg-white/5" : "hover:bg-white/[0.04]"
      }`}
    >
      <GameIcon game={game} />
      <span
        className={`flex-1 text-[13px] font-black tracking-[0.05em] uppercase ${
          active ? "text-amber-300" : "text-white"
        }`}
      >
        {game.label}
      </span>
      <ChevronRight size={15} className="shrink-0 text-white/30" />
    </Link>
  );
}

// ─── Drawer principal ──────────────────────────────────────────────────────

export function MobileDrawer({ open, onClose, user, logout, pathname }: Props) {
  // Estado del panel "Otros" (juegos secundarios). Cerrado por defecto.
  const [otrosOpen, setOtrosOpen] = useState(false);

  // Bloquear scroll del body al abrir
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleClose = () => onClose();

  const go = () => handleClose();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className="fixed inset-0 z-[100] lg:hidden"
      style={{ pointerEvents: open ? "auto" : "none" }}
      role="dialog"
      aria-modal="true"
      aria-label="Menú principal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer — full dark */}
      <div
        className="absolute top-0 left-0 flex h-full w-[76vw] max-w-[305px] flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: open ? "translateX(0)" : "translateX(-100%)",
          background:
            "linear-gradient(180deg, #0a1432 0%, #0a1024 55%, #070e1f 100%)",
        }}
      >
        {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
        <div className="relative flex-shrink-0 border-b border-white/10 pb-2">
          {/* Cerrar con las 3 rayas — mismo Y que el Menu del Header (trust bar
              24 + container pt 6 - mt 3 = 27px), para que al abrir/cerrar el
              drawer el icono no "salte". Centro del icono ≈ centro del texto. */}
          <button
            onClick={handleClose}
            className="absolute top-[27px] left-4 z-10 flex items-center justify-center rounded-lg p-1 text-white transition hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <Menu size={24} />
          </button>

          {/* Texto — pt-[30px] para que TCG Academy aparezca en la misma
              coordenada Y que en el Header cerrado (trust bar 24 + 6). */}
          <div className="pt-[30px] pr-4 pl-14">
            <span className="block text-[1.7rem] leading-none font-black tracking-tight whitespace-nowrap text-white">
              TCG <span className="text-amber-300">Academy</span>
            </span>
            {user && (
              <span className="mt-1 block truncate text-[13px] leading-none font-semibold text-white/70">
                Hola,{" "}
                <span className="font-black text-amber-300">
                  {user.name.split(" ")[0]}
                </span>
              </span>
            )}
          </div>

          {/* CTAs auth — compactos, pegados al texto */}
          <div className="mt-2 flex gap-2 px-4">
            {user ? (
              <>
                <Link
                  href={user.role === "admin" ? "/admin" : "/cuenta"}
                  onClick={go}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-amber-300 px-2 py-1.5 text-xs font-black text-gray-900 shadow-sm transition hover:bg-amber-200 active:scale-[0.97]"
                >
                  <User size={13} />
                  {user.role === "admin" ? "Panel Admin" : "Mi cuenta"}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    handleClose();
                  }}
                  className="flex items-center justify-center gap-1 rounded-md border border-white/20 px-2 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 active:scale-[0.97]"
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={12} />
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={go}
                  className="flex flex-1 items-center justify-center rounded-md bg-amber-300 px-2 py-1.5 text-xs font-black text-gray-900 shadow-sm transition hover:bg-amber-200 active:scale-[0.97]"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  onClick={go}
                  className="flex flex-1 items-center justify-center rounded-md border border-white/25 px-2 py-1.5 text-xs font-bold text-white transition hover:border-white/50 hover:bg-white/10 active:scale-[0.97]"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

        </div>

        {/* ═══ CONTENIDO SCROLL ═════════════════════════════════════════════
            Wrapper relativo para colocar el escudo como marca de agua detrás
            de los títulos del menú. Queda fijo mientras el contenido hace
            scroll por encima. Muy baja opacidad + ajustado a los laterales. */}
        <div className="relative flex-1 overflow-hidden">
          {/* Altura FIJA (h-[240px]) para que la banda "TCG ACADEMY" del
              escudo caiga siempre en el mismo Y (≈195px desde el top del
              scroll: justo en el divisor entre Game 4 y Game 5). Con
              object-contain se preserva la proporción aunque cambie el ancho
              del drawer. inset-x-2 mantiene la sensación "ajustado a los
              laterales" sin violar la proporción del escudo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-tcg-shield-trimmed.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-[55px] h-[240px] w-[calc(100%-16px)] select-none object-contain opacity-[0.08]"
          />
          <div className="relative h-full overflow-y-auto overscroll-contain">
          {/* ═══ INICIO (juegos principales, excluyendo "Otros") ════════════ */}
          <SectionTitle>Juegos TCG</SectionTitle>
          <div className="divide-y divide-white/[0.06]">
            {DRAWER_GAMES.filter((g) => !OTROS_SLUGS.has(g.slug)).map((game) => (
              <GameRow
                key={game.slug}
                game={game}
                active={isActive(`/${game.slug}`)}
                onClick={go}
              />
            ))}

            {/* ─── Botón "Otros" — despliega los juegos secundarios con una
                transición suave (grid-rows trick: 0fr → 1fr). */}
            <button
              type="button"
              onClick={() => setOtrosOpen((v) => !v)}
              aria-expanded={otrosOpen}
              aria-controls="drawer-otros-panel"
              className={`flex min-h-[42px] w-full items-center gap-3 px-5 py-2 text-white transition-colors active:bg-white/10 ${
                otrosOpen ? "bg-white/5" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <MoreHorizontal size={18} className="text-amber-300" />
              </span>
              <span
                className={`flex-1 text-left text-[13px] font-black tracking-[0.05em] uppercase ${
                  otrosOpen ? "text-amber-300" : "text-white"
                }`}
              >
                OTROS TCG
              </span>
              <ChevronDown
                size={15}
                className={`shrink-0 text-white/40 transition-transform duration-300 ${
                  otrosOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Panel "Otros" — transición de altura via grid-rows + opacidad.
              Sin layout shift brusco: pasa de 0fr a 1fr de forma animada. */}
          <div
            id="drawer-otros-panel"
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
              otrosOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!otrosOpen}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="divide-y divide-white/[0.06] border-t border-white/[0.06] bg-white/[0.02]">
                {DRAWER_GAMES.filter((g) => OTROS_SLUGS.has(g.slug)).map((game) => (
                  <GameRow
                    key={game.slug}
                    game={game}
                    active={isActive(`/${game.slug}`)}
                    onClick={go}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ═══ SERVICIOS — Compramos tus cartas ═══════════════════════════ */}
          <SectionTitle>Servicios</SectionTitle>
          <div className="divide-y divide-white/[0.06]">
            <DarkRow
              href="/compramos-tus-cartas"
              onClick={go}
              icon={
                // Fajo de billetes (blanco → ámbar por tint + alpha según
                // brillo original; fondo negro quitado por flood-fill por
                // luminancia).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/logos/money-amber.png"
                  alt=""
                  className="h-[22px] w-[22px] object-contain"
                />
              }
              label="Compramos tus cartas"
              active={isActive("/compramos-tus-cartas")}
            />
          </div>

          {/* ═══ MI CUENTA — solo logeado no-admin ══════════════════════════ */}
          {user && user.role !== "admin" && (
            <>
              <SectionTitle>Mi cuenta</SectionTitle>
              <div className="divide-y divide-white/[0.06]">
                {ACCOUNT_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DarkRow
                      key={item.href}
                      href={item.href}
                      onClick={go}
                      icon={<Icon size={18} className="text-amber-300" />}
                      label={item.label}
                      active={isActive(item.href)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* ═══ PROFESIONALES ══════════════════════════════════════════════ */}
          <SectionTitle>Profesionales</SectionTitle>
          <div className="divide-y divide-white/[0.06]">
            {PRO_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <DarkRow
                  key={item.href}
                  href={item.href}
                  onClick={go}
                  icon={
                    item.customIcon ?? (
                      <Icon size={18} className="text-amber-300" />
                    )
                  }
                  label={item.label}
                  active={isActive(item.href)}
                />
              );
            })}
          </div>

          {/* ═══ INFO ═══════════════════════════════════════════════════════ */}
          <SectionTitle>Info y ayuda</SectionTitle>
          <div className="divide-y divide-white/[0.06]">
            {HELP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <DarkRow
                  key={item.href}
                  href={item.href}
                  onClick={go}
                  icon={<Icon size={18} className="text-amber-300" />}
                  label={item.label}
                  active={isActive(item.href)}
                />
              );
            })}
          </div>

          {/* ═══ FOOTER ═════════════════════════════════════════════════════ */}
          <div className="mt-6 border-t border-white/10 px-5 py-5">
            <p className="text-center text-[11px] text-white/40">
              4 tiendas · Madrid · Barcelona · Calpe · Béjar
            </p>
            <p className="mt-3 text-center text-[10px] font-semibold tracking-wide text-white/50">
              CIF {SITE_CONFIG.cif}
            </p>
            <p className="mt-0.5 text-center text-[10px] text-white/30">
              © {new Date().getFullYear()} TCG Academy
            </p>
          </div>

          {/* Espacio para notch/gesture bar */}
          <div className="h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
