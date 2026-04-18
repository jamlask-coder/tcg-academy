"use client";

// ─── Mobile Drawer — estilo lista dark (tipo pokemillon/battledeck) ────────
// Sidebar oscura con secciones en mayúsculas (INICIO / OTROS TCG / EXPLORAR
// / INFO) y filas simples con icono + texto. Reinterpretado con la paleta
// TCG Academy: azul profundo + blanco + acentos ámbar.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  X,
  User,
  LogOut,
  ChevronRight,
  Search,
  Sparkles,
  LayoutGrid,
  Calendar,
  Gift,
  Package,
  Heart,
  FileText,
  Mail,
  MessageCircle,
  Briefcase,
  Building2,
  ShoppingBag,
  RotateCcw,
  HelpCircle,
  MapPin,
  Phone,
  Truck,
  Home,
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
};

const EXPLORE_ITEMS: NavItem[] = [
  { href: "/novedades", label: "Novedades", icon: Sparkles },
  { href: "/catalogo", label: "Catálogo", icon: LayoutGrid },
  { href: "/eventos", label: "Eventos", icon: Calendar },
  { href: "/puntos", label: "Puntos TCG", icon: Gift, badge: "×1.5" },
];

const PRO_ITEMS: NavItem[] = [
  { href: "/mayoristas/b2b", label: "Zona B2B", icon: Briefcase },
  { href: "/mayoristas/franquicias", label: "Franquicias", icon: Building2 },
  { href: "/mayoristas/vending", label: "Vending", icon: ShoppingBag },
];

const HELP_ITEMS: NavItem[] = [
  { href: "/tiendas", label: "Nuestras tiendas", icon: MapPin },
  { href: "/contacto", label: "Contacto", icon: Mail },
  { href: "/devoluciones", label: "Devoluciones", icon: RotateCcw },
  { href: "/condiciones-puntos", label: "Ayuda puntos", icon: HelpCircle },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/cuenta/puntos", label: "Mis puntos", icon: Gift },
  { href: "/cuenta/facturas", label: "Facturas", icon: FileText },
  { href: "/cuenta/mensajes", label: "Mensajes", icon: MessageCircle },
];

// Juegos principales vs otros TCG (división visual como en el reference).
const PRIMARY_SLUGS = new Set(["pokemon", "magic", "one-piece", "riftbound"]);

// ─── Componentes auxiliares ────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-6 pb-3">
      <span className="text-[11px] font-black tracking-[0.22em] text-amber-400 uppercase">
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
        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-gray-900">
          {badge}
        </span>
      )}
      <ChevronRight size={15} className="shrink-0 text-white/30" />
    </Link>
  );
}

/** Thumbnail circular para un juego — usa sprite/logo a tamaño reducido. */
function GameThumb({ game }: { game: MobileGame }) {
  const renderH = 26;
  const sprite = game.sprite;
  const spriteScale = sprite ? renderH / SPRITE_H : 1;
  const spriteW = sprite ? sprite.origW * spriteScale : 0;
  const spriteX = sprite ? sprite.origX * spriteScale : 0;

  return (
    <span
      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-sm ring-1 ring-white/20"
      aria-hidden="true"
    >
      {sprite ? (
        <span
          style={{
            display: "block",
            width: Math.min(spriteW, 24),
            height: renderH,
            backgroundImage: `url(${SPRITE_SRC})`,
            backgroundSize: `auto ${renderH}px`,
            backgroundPosition: `-${spriteX}px 0`,
            backgroundRepeat: "no-repeat",
            filter: sprite.filter ?? undefined,
          }}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={game.logo}
          alt=""
          className="max-h-5 max-w-5 object-contain"
          style={{
            filter: game.filter ?? undefined,
            mixBlendMode: game.blend ? "multiply" : undefined,
          }}
        />
      )}
    </span>
  );
}

// ─── Drawer principal ──────────────────────────────────────────────────────

export function MobileDrawer({ open, onClose, user, logout, pathname }: Props) {
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

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

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const go = () => handleClose();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    handleClose();
    setTimeout(() => {
      window.location.href = `/busqueda?q=${encodeURIComponent(q)}`;
    }, 150);
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const primaryGames = DRAWER_GAMES.filter((g) => PRIMARY_SLUGS.has(g.slug));
  const otherGames = DRAWER_GAMES.filter((g) => !PRIMARY_SLUGS.has(g.slug));

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
        className="absolute top-0 left-0 flex h-full w-[90vw] max-w-[400px] flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: open ? "translateX(0)" : "translateX(-100%)",
          background:
            "linear-gradient(180deg, #050912 0%, #0a1024 45%, #0a0f1a 100%)",
        }}
      >
        {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
        <div className="relative flex-shrink-0 border-b border-white/10 pb-4">
          {/* Cerrar */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Cerrar menú"
          >
            <X size={17} />
          </button>

          <div className="flex items-center gap-3 px-5 pt-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-tcg-shield-trimmed.png"
              alt="TCG Academy"
              className="h-14 w-auto shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black tracking-[0.22em] text-amber-400 uppercase">
                TCG Academy
              </p>
              <p className="mt-0.5 truncate text-base leading-tight font-black text-white">
                {user ? (
                  <>
                    Hola,{" "}
                    <span className="text-amber-300">
                      {user.name.split(" ")[0]}
                    </span>
                  </>
                ) : (
                  "Bienvenido"
                )}
              </p>
            </div>
          </div>

          {/* CTAs auth */}
          <div className="mt-4 flex gap-2 px-5">
            {user ? (
              <>
                <Link
                  href={user.role === "admin" ? "/admin" : "/cuenta/datos"}
                  onClick={go}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-black text-gray-900 shadow-md transition active:scale-[0.97]"
                >
                  <User size={15} />
                  {user.role === "admin" ? "Panel Admin" : "Mi cuenta"}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    handleClose();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 active:scale-[0.97]"
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={14} />
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={go}
                  className="flex flex-1 items-center justify-center rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-black text-gray-900 shadow-md transition hover:bg-amber-300 active:scale-[0.97]"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  onClick={go}
                  className="flex flex-1 items-center justify-center rounded-lg border-2 border-white/25 px-3 py-2.5 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/10 active:scale-[0.97]"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          {/* Barra envío */}
          <div className="mt-3 mx-5 flex items-center gap-2 rounded-md bg-white/[0.06] px-3 py-1.5 text-[11px]">
            <Truck size={12} className="text-amber-300" />
            <span className="text-white/80">
              Envío gratis desde{" "}
              <strong className="text-amber-300">
                {SITE_CONFIG.shippingThreshold}€
              </strong>
            </span>
          </div>
        </div>

        {/* ═══ CONTENIDO SCROLL ═════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* BUSCADOR */}
          <div className="px-5 pt-4 pb-2">
            <form ref={formRef} onSubmit={handleSearchSubmit} className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cartas, sobres, juegos…"
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] pr-4 pl-9 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:bg-white/[0.08] focus:outline-none"
                autoComplete="off"
              />
            </form>
          </div>

          {/* ═══ INICIO ═════════════════════════════════════════════════════ */}
          <SectionTitle>Inicio</SectionTitle>
          <div className="divide-y divide-white/[0.06]">
            <DarkRow
              href="/"
              onClick={go}
              icon={<Home size={18} className="text-amber-400" />}
              label="Home"
              active={pathname === "/"}
            />
            {primaryGames.map((game) => (
              <DarkRow
                key={game.slug}
                href={`/${game.slug}`}
                onClick={go}
                icon={<GameThumb game={game} />}
                label={game.label}
                active={isActive(`/${game.slug}`)}
              />
            ))}
          </div>

          {/* ═══ OTROS TCG ══════════════════════════════════════════════════ */}
          <SectionTitle>Otros TCG</SectionTitle>
          <div className="divide-y divide-white/[0.06]">
            {otherGames.map((game) => (
              <DarkRow
                key={game.slug}
                href={`/${game.slug}`}
                onClick={go}
                icon={<GameThumb game={game} />}
                label={game.label}
                active={isActive(`/${game.slug}`)}
              />
            ))}
          </div>

          {/* ═══ EXPLORAR ═══════════════════════════════════════════════════ */}
          <SectionTitle>Explorar</SectionTitle>
          <div className="divide-y divide-white/[0.06]">
            {EXPLORE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <DarkRow
                  key={item.href}
                  href={item.href}
                  onClick={go}
                  icon={<Icon size={18} className="text-amber-400" />}
                  label={item.label}
                  badge={item.badge}
                  active={isActive(item.href)}
                />
              );
            })}
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
                      icon={<Icon size={18} className="text-amber-400" />}
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
                  icon={<Icon size={18} className="text-amber-400" />}
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
                  icon={<Icon size={18} className="text-amber-400" />}
                  label={item.label}
                  active={isActive(item.href)}
                />
              );
            })}
          </div>

          {/* ═══ FOOTER ═════════════════════════════════════════════════════ */}
          <div className="mt-6 border-t border-white/10 px-5 py-5">
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-bold text-white/80 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                <Mail size={14} className="text-amber-400" />
                Email
              </a>
              <a
                href={`tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-bold text-white/80 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                <Phone size={14} className="text-amber-400" />
                Llamar
              </a>
            </div>
            <p className="mt-4 text-[11px] text-white/40">
              4 tiendas · Madrid · Barcelona · Calpe · Béjar
            </p>
            <p className="mt-1 text-[10px] text-white/30">
              © {new Date().getFullYear()} TCG Academy · {SITE_CONFIG.cif}
            </p>
          </div>

          {/* Espacio para notch/gesture bar */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
