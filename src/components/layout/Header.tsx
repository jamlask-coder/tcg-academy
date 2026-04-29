"use client";
import { SITE_CONFIG } from "@/config/siteConfig";
import { Container } from "@/components/ui/Container";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ShoppingCart,
  User,
  Search,
  X,
  Settings,
  Bell,
  Package,
  Truck,
  Zap,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Inbox,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { GAME_CONFIG } from "@/data/products";
import { getMergedProducts, getProductUrl } from "@/lib/productStore";
import { useNotifications } from "@/context/NotificationContext";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeForSearch } from "@/utils/searchNormalize";
import { MobileDrawer } from "./MobileDrawer";
import { countPendingOrdersToShip } from "@/lib/orderAdapter";
import { DataHub } from "@/lib/dataHub";
import { countNewIncidents } from "@/services/incidentService";
import { countNuevasSolicitudes } from "@/services/solicitudService";

// ─── Recent search history helpers ────────────────────────────────────────────
const RECENT_KEY = "tcga_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveRecentSearch(q: string): void {
  if (!q.trim()) return;
  const prev = getRecentSearches();
  const next = [q.trim(), ...prev.filter((s) => s !== q.trim())].slice(
    0,
    MAX_RECENT,
  );
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function removeRecentSearch(q: string): void {
  const next = getRecentSearches().filter((s) => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ─── Predictive search dropdown ───────────────────────────────────────────────

function SearchDropdown({
  query,
  onSelect,
  onHistorySearch,
}: {
  query: string;
  onSelect: () => void;
  onHistorySearch: (q: string) => void;
}) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(getRecentSearches());
  }, [query]);

  const results = useMemo(() => {
    const q = normalizeForSearch(query);
    if (q.length < 2) return [];
    const all = getMergedProducts();
    return all
      .filter(
        (p) =>
          normalizeForSearch(p.name).includes(q) ||
          p.tags.some((t) => normalizeForSearch(t).includes(q)),
      )
      .slice(0, 6);
  }, [query]);

  const hasQuery = query.trim().length >= 2;

  // Empty input — show recent searches
  if (!hasQuery) {
    if (recentSearches.length === 0) return null;
    return (
      <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Búsquedas recientes
          </span>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(RECENT_KEY, "[]");
              setRecentSearches([]);
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Borrar todo
          </button>
        </div>
        <div className="py-1">
          {recentSearches.map((s) => (
            <div key={s} className="flex items-center px-2">
              <button
                type="button"
                onClick={() => onHistorySearch(s)}
                className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Search size={12} className="flex-shrink-0 text-gray-400" />
                {s}
              </button>
              <button
                type="button"
                aria-label={`Eliminar búsqueda "${s}"`}
                onClick={() => {
                  removeRecentSearch(s);
                  setRecentSearches(getRecentSearches());
                }}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-gray-300 hover:text-gray-500"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {results.length === 0 ? (
        <p className="px-4 py-4 text-center text-sm text-gray-400">
          Sin resultados para &ldquo;{query}&rdquo;
        </p>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {results.map((p) => {
              const config = GAME_CONFIG[p.game];
              const href = getProductUrl(p);
              const img = p.images?.[0];
              return (
                <Link
                  key={p.id}
                  href={href}
                  onClick={onSelect}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={p.name}
                      loading="lazy"
                      className="h-10 w-10 flex-shrink-0 rounded-xl border border-gray-100 bg-white object-contain"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = "none";
                        const fb = el.nextElementSibling as HTMLElement | null;
                        if (fb) fb.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{
                      display: img ? "none" : "flex",
                      backgroundColor: config?.bgColor || "#f3f4f6",
                    }}
                  >
                    <span aria-hidden="true">{config?.emoji || "🃏"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {p.name}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] font-semibold"
                      style={{ color: config?.color || "#6b7280" }}
                    >
                      {config?.name || p.game}
                    </p>
                  </div>
                  <p className="text-sm font-bold whitespace-nowrap text-[#2563eb]">
                    {p.price.toFixed(2)}€
                  </p>
                </Link>
              );
            })}
          </div>
          <Link
            href={`/busqueda?q=${encodeURIComponent(query.trim())}`}
            onClick={onSelect}
            className="flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-[#2563eb] transition-colors hover:bg-gray-100"
          >
            <Search size={14} />
            Ver todos los resultados para &ldquo;{query.trim()}&rdquo;
          </Link>
        </>
      )}
    </div>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────

function MobileTrustBar() {
  // Mensaje fijo en móvil: "Envío gratis desde X€" siempre visible, sin
  // rotación. Color sólido uniforme — coherente con la trust bar desktop.
  return (
    <div
      className="flex h-7 items-end justify-center px-4 text-xs leading-none text-white lg:hidden"
      style={{ backgroundColor: "#132B5F" }}
    >
      <span className="inline-flex items-center gap-1.5 font-medium leading-none">
        <Truck
          size={12}
          className="shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <span className="text-white">Envío gratis desde</span>
        <strong className="text-amber-400">{SITE_CONFIG.shippingThreshold}€</strong>
      </span>
    </div>
  );
}

// Desktop trust bar: 1 mensaje a la vez, centrado, con slide-up entre ellos.
// Color sólido uniforme #132B5F — sin gradiente.
function DesktopTrustBar() {
  const items = [
    {
      key: "envio-gratis",
      Icon: Truck,
      label: "Envío gratis desde",
      highlight: `${SITE_CONFIG.shippingThreshold}€`,
    },
    {
      key: "envio-rapido",
      Icon: Zap,
      label: "Envío en",
      highlight: `${SITE_CONFIG.dispatchHours}h`,
    },
    {
      key: "pago-seguro",
      Icon: ShieldCheck,
      label: "Pago",
      highlight: "100% seguro",
    },
    {
      key: "originales",
      Icon: CheckCircle2,
      label: "Productos",
      highlight: "100% originales",
    },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % items.length),
      3500,
    );
    return () => clearInterval(id);
  }, [items.length]);
  const total = items.length;
  return (
    <div
      className="hidden text-xs leading-none text-white lg:block"
      style={{ backgroundColor: "#132B5F" }}
      aria-live="polite"
      aria-atomic="true"
    >
      <Container className="flex h-7 items-center justify-center">
        <div className="relative h-5 w-full max-w-[420px] overflow-hidden">
          {items.map((item, i) => {
            const offset = (i - idx + total) % total;
            const positionCls =
              offset === 0
                ? "opacity-100 translate-y-0"
                : offset === total - 1
                  ? "opacity-0 -translate-y-full"
                  : "opacity-0 translate-y-full";
            return (
              <span
                key={item.key}
                className={`absolute inset-0 flex items-center justify-center gap-1.5 font-medium leading-none transition-all duration-500 ease-out ${positionCls}`}
              >
                <item.Icon
                  size={13}
                  className="shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                <span className="text-white">{item.label}</span>
                <strong className="text-amber-400">{item.highlight}</strong>
              </span>
            );
          })}
        </div>
      </Container>
    </div>
  );
}

// ─── Rotating tagline (debajo de "TCG Academy", sólo móvil) ──────────────────
// Ciclo de frases cortas que cambian cada 3.5s con fade + slide sutil.
// Además un dot verde pulsante estilo "live" para transmitir actividad.
const HEADER_TAGLINES = [
  "4 tiendas en España",
  "Madrid · Barcelona · Calpe · Béjar",
];

function HeaderTagline() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % HEADER_TAGLINES.length),
      2800,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <span className="-mt-0.5 flex h-[12px] items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold tracking-wide lg:mt-0 lg:ml-0 lg:text-[10px]">
      <span
        aria-hidden="true"
        className="relative flex h-[6px] w-[6px] shrink-0"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
        <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-amber-400 shadow-[0_0_5px_rgba(252,211,77,0.85)]" />
      </span>
      {/* Crossfade: todos los mensajes siempre en el DOM, apilados. El activo
          tiene opacity:1, los demás 0. No hay momento sin texto visible. */}
      <span className="relative flex-1 overflow-hidden">
        {HEADER_TAGLINES.map((msg, i) => (
          <span
            key={i}
            className="absolute inset-0 inline-block text-white/85 transition-opacity duration-500"
            style={{ opacity: i === idx ? 1 : 0 }}
          >
            {msg}
          </span>
        ))}
        {/* Spacer invisible para que el contenedor tome la altura/ancho
            del mensaje más largo y el layout no salte. */}
        <span className="invisible inline-block" aria-hidden="true">
          {HEADER_TAGLINES.reduce((a, b) => (a.length > b.length ? a : b))}
        </span>
      </span>
    </span>
  );
}

// ─── Logged-in greeting / "Entrar" button (desktop only) ──────────────────────
//
// Diseño 2026-04-25 (alineado con imagen aprobada): cuando el usuario NO está
// logado mostramos un único botón amarillo "Entrar" como CTA limpio (en vez del
// formulario inline email+contraseña anterior, que saturaba la cabecera).
// Cuando SÍ está logado mantenemos el saludo + dropdown idénticos.

function HeaderInlineAuth() {
  const { user } = useAuth();

  // ── Logged in: SOLO la pill de rol (Admin/Mayorista/Tienda). El saludo
  //    "Bienvenido, X" vive ahora en `HeaderGreeting`, que se renderiza
  //    DESPUÉS del icono persona para que el orden visual sea:
  //    [ADMIN] [icono persona] [Bienvenido, Ricardo]   (aprobado 2026-04-29)
  if (user) {
    const isAdmin = user.role === "admin";
    const showRoleBadge = user.role === "mayorista" || user.role === "tienda" || isAdmin;
    const roleBadgeLabel = user.role === "mayorista" ? "Mayorista" : user.role === "tienda" ? "Tienda" : "Admin";
    const rolePillClass =
      "inline-flex h-9 items-center justify-center rounded-full bg-amber-400 px-4 text-xs font-extrabold uppercase tracking-wider text-[#0a1628]";

    if (!showRoleBadge) return null;

    return (
      <div className="hidden lg:flex items-center">
        {isAdmin ? (
          <Link
            href="/admin"
            aria-label="Ir al panel de administración"
            title="Ir al panel admin"
            className={`${rolePillClass} transition hover:bg-amber-300 hover:ring-2 hover:ring-amber-300/60`}
          >
            Admin
          </Link>
        ) : (
          <span className={rolePillClass} aria-label={`Rol: ${user.role}`}>
            {roleBadgeLabel}
          </span>
        )}
      </div>
    );
  }

  // ── No logado: botón amarillo "Entrar" estilo CTA limpio ─────────────────
  return (
    <Link
      href="/login"
      className="hidden h-9 items-center justify-center rounded-full bg-amber-400 px-7 text-sm font-bold text-[#0a1628] shadow-md transition hover:bg-amber-300 hover:shadow-lg active:scale-[0.98] lg:inline-flex"
      aria-label="Iniciar sesión"
    >
      Entrar
    </Link>
  );
}

// Saludo "Bienvenido, X" — vive separado del HeaderInlineAuth para poder
// renderizarlo a la DERECHA del icono persona. Solo se muestra si hay sesión.
function HeaderGreeting() {
  const { user } = useAuth();
  if (!user) return null;
  const firstName = user.name.split(" ")[0] ?? "";
  return (
    <span className="hidden text-xs text-white lg:inline">
      Bienvenido, <span className="font-bold">{firstName}</span>
    </span>
  );
}

// ─── Profile icon dropdown (desktop) ──────────────────────────────────────────
//
// Sustituye al antiguo dropdown que vivía en el pill del saludo. Ahora cliquear
// el icono persona abre un menú con Resumen + Cerrar sesión. El logout llama a
// `logout()` del AuthContext y redirige a la home.
function ProfileIconMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="hidden items-center justify-center gap-1.5 rounded-lg p-2 transition hover:bg-white/10 lg:flex lg:min-h-9"
        aria-label="Iniciar sesión"
      >
        <User size={22} className="text-white" />
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Mi cuenta"
        aria-expanded={open}
        className="hidden items-center justify-center gap-1 rounded-lg p-2 transition hover:bg-white/10 lg:flex lg:min-h-9"
      >
        <User size={22} className="text-white" />
        <ChevronDown
          size={14}
          className={`text-white/70 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
              router.push("/");
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={15} className="text-red-400" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  // Avoid hydration mismatch: cart/auth state comes from localStorage (client only)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // For admin: track separate counts for header badges
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingNotifs, setPendingNotifs] = useState(0);
  const [pendingSolicitudes, setPendingSolicitudes] = useState(0);
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    const calc = () => {
      setPendingOrders(countPendingOrdersToShip());
      setPendingNotifs(countNewIncidents());
      setPendingSolicitudes(countNuevasSolicitudes());
    };
    calc();
    // Canonical: react al evento del DataHub en vez de polling corto.
    const offOrders = DataHub.on("orders", calc);
    const offIncidents = DataHub.on("incidents", calc);
    const offSolicitudes = DataHub.on("solicitudes", calc);
    // Fallback poll cada 15s por si algún write legacy no emite evento.
    const id = setInterval(calc, 15000);
    return () => {
      offOrders?.();
      offIncidents?.();
      offSolicitudes?.();
      clearInterval(id);
    };
  }, [user]);

  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const [desktopQuery, setDesktopQuery] = useState("");
  const debouncedDesktopQuery = useDebounce(desktopQuery, 300);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  const [mobileQuery, setMobileQuery] = useState("");
  const debouncedMobileQuery = useDebounce(mobileQuery, 300);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // El buscador móvil aparece en todas las páginas EXCEPTO la home, donde
  // la propia portada ya comunica el catálogo de forma visual. El usuario
  // lo pidió así explícitamente.
  const showMobileSearch = pathname !== "/";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(e.target as Node)
      )
        setDesktopDropdownOpen(false);
      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target as Node)
      )
        setMobileDropdownOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDesktopDropdownOpen(false);
        setMobileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const submitSearch = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      saveRecentSearch(q.trim());
      router.push(`/busqueda?q=${encodeURIComponent(q.trim())}`);
      setDesktopDropdownOpen(false);
      setDesktopQuery("");
      setMobileDropdownOpen(false);
      setMobileQuery("");
    },
    [router],
  );

  const handleDesktopSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submitSearch(desktopQuery);
    },
    [desktopQuery, submitSearch],
  );

  const handleMobileSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submitSearch(mobileQuery);
    },
    [mobileQuery, submitSearch],
  );

  const closeDesktopSearch = useCallback(() => {
    setDesktopDropdownOpen(false);
    setDesktopQuery("");
  }, []);

  const closeMobileSearch = useCallback(() => {
    setMobileDropdownOpen(false);
    setMobileQuery("");
  }, []);

  // Al cambiar de ruta, vaciar el buscador para que no quede la búsqueda previa.
  // Sincroniza estado UI con el sistema externo (router): imposible sin setState en effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync con router (cambio de ruta → limpiar buscador)
    setDesktopQuery("");
    setDesktopDropdownOpen(false);
    setMobileQuery("");
    setMobileDropdownOpen(false);
  }, [pathname]);

  return (
    <>
    <header
      className="sticky top-0 z-50 overflow-visible"
      style={{
        // Color sólido azul marino (#132B5F) en todo el header — desktop y
        // móvil. Comparte color con la trust bar para que el bloque superior
        // se lea como una sola pieza uniforme.
        backgroundColor: "#132B5F",
      }}
    >
      {/* Topbar — desktop rotating */}
      <DesktopTrustBar />
      {/* Topbar — mobile rotating */}
      <MobileTrustBar />

      {/* ── Main bar: logo LEFT · search FILL · icons RIGHT ──── */}
      {/* En móvil usamos items-start para que el hamburger y los iconos de la
          derecha queden alineados con el borde superior de "TCG Academy"
          (no con el centro del bloque logo+tagline). pt y pb simétricos para
          que el tagline tenga el mismo aire arriba (hacia TCG Academy) que
          abajo (hacia la imagen). */}
      <Container className="flex h-14 items-start justify-center gap-6 py-[6px] lg:grid lg:h-14 lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:justify-stretch lg:gap-3 lg:py-0">
        {/* Hamburger + Logo */}
        <div className="flex shrink-0 items-start gap-2 lg:items-center lg:justify-self-end">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-mt-[3px] flex items-center justify-center rounded-lg p-1 text-white transition hover:bg-white/10 lg:mt-0 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <Link
            href="/"
            className="flex flex-col items-start leading-none"
          >
            <span className="text-[1.9rem] font-black tracking-tight text-white lg:text-3xl">
              TCG <span className="text-amber-400">Academy</span>
            </span>
            {/* Tagline rotativa con dot "live" — visible en móvil y desktop, debajo del título */}
            <HeaderTagline />
          </Link>
        </div>

        {/* Middle zone: search + auth — ancho fijo, sin separar.
            En móvil solo se muestra la píldora de login (estilo YouTube):
            con `justify-between` en el contenedor padre, esta zona central
            queda automáticamente centrada en el hueco entre TCG Academy y
            los iconos de la derecha. */}
        <div className="flex items-center gap-3">
          {/* Mobile: perfil + carrito como pareja compacta (reemplaza la píldora
              "Iniciar sesión"). El carrito ya funciona sin estar identificado —
              el usuario puede llenarlo antes de hacer login. */}
          <div className="flex items-center gap-1 lg:hidden">
            <Link
              href={
                user
                  ? user.role === "admin"
                    ? "/admin"
                    : "/cuenta"
                  : "/login"
              }
              className="flex items-center justify-center rounded-lg p-1.5 transition active:scale-[0.95] hover:bg-white/10"
              aria-label={user ? "Mi cuenta" : "Iniciar sesión"}
            >
              <User size={24} className="text-white" />
            </Link>
            <Link
              href="/carrito"
              className="relative flex items-center justify-center rounded-lg p-1.5 transition active:scale-[0.95] hover:bg-white/10"
              aria-label={mounted ? `Carrito (${count} artículos)` : "Carrito"}
            >
              <ShoppingCart size={24} className="text-white" />
              {mounted && count > 0 && (
                <span className="absolute top-0 right-0 flex h-4 min-w-[16px] badge-ping-wrap items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-gray-900 shadow-[0_0_6px_rgba(252,211,77,0.6)]">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop search — píldora blanca grande (diseño 2026-04-25).
              Va sola en la columna middle del grid `[1fr_auto_1fr]` → su
              centro coincide con el centro de la página y por tanto con el
              de la trust bar superior. */}
          <div
            className="relative hidden w-[600px] lg:block"
            ref={desktopSearchRef}
          >
          <form onSubmit={handleDesktopSubmit}>
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={desktopQuery}
              onChange={(e) => {
                setDesktopQuery(e.target.value);
                setDesktopDropdownOpen(true);
              }}
              onFocus={() => {
                setDesktopDropdownOpen(true);
              }}
              placeholder="Buscar cartas, sobres..."
              className="h-9 w-full rounded-full border-0 bg-white pr-5 pl-12 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:shadow-md focus:outline-none"
              autoComplete="off"
              aria-label="Buscar productos"
            />
            <button
              type="submit"
              className="sr-only"
              aria-label="Buscar"
            >
              Buscar
            </button>
          </form>

          {desktopDropdownOpen && (
            <SearchDropdown
              query={debouncedDesktopQuery}
              onSelect={() => {
                saveRecentSearch(desktopQuery);
                closeDesktopSearch();
              }}
              onHistorySearch={(q) => submitSearch(q)}
            />
          )}
          </div>

        </div>
        {/* Fin zona central */}

        {/* Iconos — siempre a la derecha, con margen para el badge.
            En móvil alineados al top para cuadrar con "TCG Academy".
            Orden invariante: HeaderInlineAuth (login/greeting pill, solo desktop)
            → Perfil → [atajos admin / bell notificaciones] → Carrito.
            HeaderInlineAuth vive aquí (no en la zona central) para que el
            buscador quede SIEMPRE centrado en la página, independiente de si
            el usuario está logueado y del ancho del pill. */}
        <div className="flex shrink-0 items-start gap-0.5 pr-2 lg:items-start lg:justify-self-start lg:gap-2 lg:pr-0">
          {/* Desktop login/greeting pill — único elemento que cambia entre
              estados logueado / no logueado. Su ancho variable NO afecta al
              centrado del buscador porque está en la columna derecha del grid. */}
          <HeaderInlineAuth />
          {/* Orden aprobado 2026-04-29: ADMIN pill → icono persona → saludo.
              El icono va ANTES del saludo (no después como estaba), siguiendo
              petición explícita del usuario para que el icono quede a la
              izquierda de "Bienvenido, X". */}
          <ProfileIconMenu />
          <HeaderGreeting />

          {/* Admin shortcut (sm, not desktop where panel admin is in greeting menu) */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10 sm:flex lg:hidden"
              title="Panel Admin"
            >
              <Settings size={20} className="text-amber-600" />
            </Link>
          )}

          {/* Admin: dynamic icons — only visible when there are pending items */}
          {user && user.role === "admin" && mounted && (
            <>
              {([
                { count: pendingOrders, href: "/admin/pedidos", Icon: Package, label: "pedidos pendientes por enviar", title: "Pedidos pendientes por enviar" },
                { count: pendingNotifs, href: "/admin/notificaciones", Icon: Bell, label: "incidencias nuevas", title: "Incidencias nuevas" },
                { count: pendingSolicitudes, href: "/admin/solicitudes", Icon: Inbox, label: "solicitudes nuevas", title: "Solicitudes nuevas" },
              ] as const).filter(({ count }) => count > 0).map(({ count, href, Icon, label, title }) => (
                <Link
                  key={href}
                  href={href}
                  title={`${title}: ${count}`}
                  className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10 lg:flex lg:min-h-9"
                  aria-label={`${count} ${label}`}
                >
                  <Icon size={18} className="text-white" />
                  {/* Badge amarillo Academy — ancho mínimo 18px + padding 1.5 para
                      que 2-3 dígitos (94, 150, 999+) se vean completos sin recortar. */}
                  <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] leading-none font-bold text-gray-900 shadow-[0_0_6px_rgba(252,211,77,0.6)] whitespace-nowrap">
                    {count > 999 ? "999+" : count}
                  </span>
                </Link>
              ))}
            </>
          )}

          {/* User: notifications bell */}
          {user && user.role !== "admin" && (
            <Link
              href="/cuenta/notificaciones"
              className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10 lg:flex lg:min-h-9"
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
            >
              <Bell size={18} className="text-white" />
              {mounted && unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] badge-ping-wrap items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-gray-900 shadow-[0_0_6px_rgba(252,211,77,0.6)]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* 2. Cart — SIEMPRE el último (derecha del todo). Desktop only: en
              móvil el carrito va junto al icono de perfil en la zona central,
              justo a la derecha de TCG Academy. */}
          {user?.role !== "admin" && (
            <Link
              href="/carrito"
              className="relative hidden items-center justify-center overflow-visible rounded-lg transition hover:bg-white/10 lg:flex lg:min-h-9 lg:min-w-[44px] lg:p-2"
              aria-label={mounted ? `Carrito (${count} artículos)` : "Carrito"}
            >
              <ShoppingCart size={22} className="text-white" />
              {mounted && count > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] badge-ping-wrap items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-gray-900 shadow-[0_0_6px_rgba(252,211,77,0.6)]">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          )}

        </div>
      </Container>

      {/* Mobile search bar — en todas las páginas EXCEPTO home */}
      {showMobileSearch && (
        <div
          className="border-t border-white/10 px-4 pt-1 pb-1.5 lg:hidden"
          ref={mobileSearchRef}
        >
          <form onSubmit={handleMobileSubmit} className="relative">
            <input
              type="search"
              value={mobileQuery}
              onChange={(e) => {
                setMobileQuery(e.target.value);
                setMobileDropdownOpen(true);
              }}
              onFocus={() => setMobileDropdownOpen(true)}
              placeholder="Buscar cartas, sobres..."
              className="h-9 w-full rounded-xl border-0 bg-white pr-10 pl-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:shadow-md focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Buscar"
            >
              <Search size={18} />
            </button>
          </form>
          {mobileDropdownOpen && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <SearchDropdown
                query={debouncedMobileQuery}
                onSelect={() => {
                  saveRecentSearch(mobileQuery);
                  closeMobileSearch();
                }}
                onHistorySearch={(q) => submitSearch(q)}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile full-screen drawer */}
      <MobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        logout={logout}
        pathname={pathname}
      />

      <style>{`
        @keyframes headerShake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-5px); }
          40%, 60% { transform: translateX(5px); }
        }

        /* ── Trust bar shimmer ── */
        @keyframes trustShimmer {
          0%   { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateX(380%) skewX(-18deg); opacity: 0; }
        }
        @keyframes trustIconPop {
          0%   { transform: scale(0.7) rotate(-10deg); opacity: 0.5; }
          60%  { transform: scale(1.25) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .trust-item {
          position: relative;
          overflow: hidden;
        }
        .trust-item::after {
          content: '';
          position: absolute;
          top: -20%;
          left: 0;
          width: 40%;
          height: 140%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%);
          transform: translateX(-180%) skewX(-18deg);
          animation: trustShimmer 3s ease-in-out var(--shimmer-delay, 0s) infinite;
          animation-delay: var(--shimmer-delay, 0s);
          pointer-events: none;
        }
        .trust-icon {
          animation: trustIconPop 0.5s ease-out var(--shimmer-delay, 0s) both;
        }
        @keyframes mobileIconPop {
          0%   { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          65%  { transform: scale(1.3) rotate(8deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes taglineSlideIn {
          0%   { opacity: 0; transform: translateY(8px); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: translateY(0); }
        }
        .badge-ping-wrap {
          animation: badgePulse 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .trust-item::after { animation: none; }
          .trust-icon { animation: none; }
          [style*="mobileIconPop"] { animation: none !important; }
          [style*="taglineSlideIn"] { animation: none !important; }
          .animate-badge-blink { animation: none; }
        }
      `}</style>
    </header>

    {/* Bottom nav removed — navigation via header + drawer */}
    </>
  );
}
