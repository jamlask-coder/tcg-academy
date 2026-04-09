"use client";
import { SITE_CONFIG } from "@/config/siteConfig";
import { Container } from "@/components/ui/Container";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu,
  X,
  Settings,
  Bell,
  Package,
  Zap,
  ShieldCheck,
  ChevronDown,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { GAME_CONFIG } from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { useNotifications } from "@/context/NotificationContext";
import { useDebounce } from "@/hooks/useDebounce";
import { checkRateLimit } from "@/utils/sanitize";

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
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const all = getMergedProducts();
    return all
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
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
          <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
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
              const href =
                p.id > 1_700_000_000_000
                  ? `/producto/${p.id}`
                  : `/${p.game}/${p.category}/${p.slug}`;
              return (
                <Link
                  key={p.id}
                  href={href}
                  onClick={onSelect}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: config?.bgColor || "#f3f4f6" }}
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

const TRUST_MESSAGES = [
  {
    icon: Package,
    text: `Envío gratis desde ${SITE_CONFIG.shippingThreshold}€`,
    highlight: `${SITE_CONFIG.shippingThreshold}€`,
  },
  {
    icon: Zap,
    text: `Envío en ${SITE_CONFIG.dispatchHours}h`,
    highlight: `${SITE_CONFIG.dispatchHours}h`,
  },
  { icon: ShieldCheck, text: "Pago 100% seguro", highlight: "100%" },
];

function MobileTrustBar() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % TRUST_MESSAGES.length);
        setVisible(true);
      }, 350);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const { icon: Icon, text } = TRUST_MESSAGES[idx];
  return (
    <div
      className="px-4 py-1.5 text-center text-xs text-white lg:hidden"
      style={{
        background:
          "linear-gradient(to right, #0a0f1a 0%, #1e3a8a 55%, #2563eb 100%)",
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 font-medium"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(5px)",
          transition: "opacity 0.32s ease, transform 0.32s ease",
        }}
      >
        <span
          className="text-amber-300"
          style={{
            display: "inline-flex",
            animation: visible
              ? "mobileIconPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both"
              : "none",
          }}
        >
          <Icon size={12} />
        </span>
        {text}
      </span>
    </div>
  );
}

// ─── Inline login form / logged-in greeting (desktop only) ───────────────────

function HeaderInlineAuth() {
  const { user, login, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside closes account dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!checkRateLimit("header-login", 5, 60_000)) return;
      setLoading(true);
      setError(false);
      const { ok } = await login(email, pwd);
      setLoading(false);
      if (ok) {
        setEmail("");
        setPwd("");
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setError(false);
          setShake(false);
        }, 2000);
      }
    },
    [email, pwd, login],
  );

  const firstName = user?.name.split(" ")[0] ?? "";

  // ── Logged in: greeting + account dropdown ────────────────────────────────
  if (user) {
    return (
      <div className="relative hidden lg:block" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Mi cuenta"
          aria-expanded={menuOpen}
          className="flex h-8 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 transition hover:bg-white/20"
        >
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400">
            <span className="text-[9px] font-bold text-white">
              {user.name[0]}
            </span>
          </div>
          <span className="text-xs text-white/70">Hola,&nbsp;</span>
          <span className="text-xs font-bold text-amber-300">{firstName}</span>
          <ChevronDown
            size={10}
            className={`text-white/50 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Account dropdown */}
        {menuOpen && (
          <div className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl">
            <div className="border-b border-gray-100 px-4 pt-2 pb-2.5">
              <p className="text-xs font-semibold text-gray-800">
                Hola, {firstName}
              </p>
              <p className="truncate text-[11px] text-gray-400">
                {user.email ?? ""}
              </p>
            </div>
            <Link
              href="/cuenta"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <User size={15} className="text-gray-400" /> Mi cuenta
            </Link>
            <Link
              href="/cuenta/pedidos"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <Package size={15} className="text-gray-400" /> Mis pedidos
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 transition hover:bg-amber-50"
              >
                <LayoutDashboard size={15} className="text-amber-400" /> Panel
                admin
              </Link>
            )}
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={() => {
                setMenuOpen(false);
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

  // ── Not logged in: inline login pill ─────────────────────────────────────
  return (
    <div
      ref={menuRef}
      className="hidden items-center lg:flex"
      style={{ animation: shake ? "headerShake 0.45s ease" : "none" }}
    >
      <form onSubmit={handleSubmit} className="flex items-stretch">
        <div
          className={`flex h-8 items-stretch overflow-hidden rounded-xl border transition-colors ${
            error ? "border-red-400" : "border-white/25"
          }`}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            maxLength={254}
            autoComplete="email"
            aria-label="Email de acceso"
            className={`h-full w-[90px] border-r px-3 text-xs text-white transition-colors placeholder:text-white/50 focus:outline-none xl:w-[118px] ${
              error
                ? "border-red-400 bg-red-900/30"
                : "border-white/20 bg-white/10 focus:bg-white/20"
            }`}
          />
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Contraseña"
            required
            maxLength={128}
            autoComplete="current-password"
            aria-label="Contraseña"
            className={`h-full w-[90px] border-r px-3 text-xs text-white transition-colors placeholder:text-white/50 focus:outline-none xl:w-[118px] ${
              error
                ? "border-red-400 bg-red-900/30"
                : "border-white/20 bg-white/10 focus:bg-white/20"
            }`}
          />
          <button
            type="submit"
            disabled={loading}
            className="h-full border-r border-amber-600 bg-amber-500 px-4 text-xs font-semibold whitespace-nowrap text-white transition hover:bg-amber-400 disabled:opacity-60"
          >
            {loading ? "…" : "Entrar"}
          </button>
          <Link
            href="/registro"
            className="flex h-full items-center bg-white/15 px-4 text-xs font-semibold whitespace-nowrap text-white transition hover:bg-white/25"
          >
            Registrarse
          </Link>
        </div>
      </form>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [desktopQuery, setDesktopQuery] = useState("");
  const debouncedDesktopQuery = useDebounce(desktopQuery, 300);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  const [mobileQuery, setMobileQuery] = useState("");
  const debouncedMobileQuery = useDebounce(mobileQuery, 300);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Mount drawer immediately on open; unmount after close animation (300ms)
  useEffect(() => {
    if (menuOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawerMounted(true);
      return;
    }
    const t = setTimeout(() => setDrawerMounted(false), 300);
    return () => clearTimeout(t);
  }, [menuOpen]);

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
    (q: string, isMobile = false) => {
      if (!q.trim()) return;
      saveRecentSearch(q.trim());
      router.push(`/busqueda?q=${encodeURIComponent(q.trim())}`);
      setDesktopDropdownOpen(false);
      setDesktopQuery("");
      setMobileDropdownOpen(false);
      setMobileQuery("");
      if (isMobile) setMobileSearchOpen(false);
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
      submitSearch(mobileQuery, true);
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

  return (
    <header
      className="border-b border-white/10"
      style={{
        background:
          "linear-gradient(to right, #0a0f1a 0%, #1e3a8a 55%, #2563eb 100%)",
      }}
    >
      {/* Topbar — desktop */}
      <div
        className="hidden py-1.5 text-xs text-white lg:block"
        style={{
          background:
            "linear-gradient(to right, #0a0f1a 0%, #1e3a8a 55%, #2563eb 100%)",
        }}
      >
        <Container className="flex items-center justify-start gap-8">
          <span
            className="trust-item flex items-center gap-1.5 font-medium"
            style={{ "--shimmer-delay": "0s" } as React.CSSProperties}
          >
            <Package size={12} className="trust-icon text-amber-300" />
            Envío gratis desde{" "}
            <strong className="ml-1 text-amber-300">
              {SITE_CONFIG.shippingThreshold}€
            </strong>
          </span>
          <span className="h-3 border-l border-white/20" />
          <span
            className="trust-item flex items-center gap-1.5 font-medium"
            style={{ "--shimmer-delay": "2.5s" } as React.CSSProperties}
          >
            <Zap size={12} className="trust-icon text-amber-300" />
            Envío en{" "}
            <strong className="ml-1 text-amber-300">
              {SITE_CONFIG.dispatchHours}h
            </strong>
          </span>
          <span className="h-3 border-l border-white/20" />
          <span
            className="trust-item flex items-center gap-1.5 font-medium"
            style={{ "--shimmer-delay": "5s" } as React.CSSProperties}
          >
            <ShieldCheck size={12} className="trust-icon text-amber-300" />
            Pago <strong className="ml-1 text-amber-300">100% seguro</strong>
          </span>
        </Container>
      </div>
      {/* Topbar — mobile rotating */}
      <MobileTrustBar />

      {/* ── Main bar: todo en una sola fila, de izquierda a derecha ──── */}
      <Container className="flex h-16 items-center gap-3">
        {/* Logo — banner "TCG ACADEMY" a la izquierda del buscador */}
        <Link href="/" className="flex flex-shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-tcg.png"
            alt="TCG Academy"
            className="max-w-[76px] sm:max-w-[140px] lg:max-w-none"
            style={{
              height: 42,
              width: "auto",
            }}
          />
        </Link>

        {/* Desktop search */}
        <div
          className="relative hidden w-[230px] flex-shrink-0 lg:block xl:w-[460px]"
          ref={desktopSearchRef}
        >
          <form onSubmit={handleDesktopSubmit}>
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
              placeholder="Busca cartas, sobres..."
              className="h-8 w-full rounded-xl border-2 border-white/25 bg-white/12 pr-8 pl-3 text-xs text-white transition placeholder:text-white/50 focus:border-white/60 focus:bg-white/20 focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-white/50 hover:text-white"
              aria-label="Buscar"
            >
              <Search size={14} />
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

        {/* Desktop inline login / greeting */}
        <HeaderInlineAuth />

        {/* Iconos — al extremo derecho del contenedor */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
          {/* Mobile search toggle */}
          <button
            onClick={() => {
              setMobileSearchOpen(!mobileSearchOpen);
              if (mobileSearchOpen) {
                setMobileQuery("");
                setMobileDropdownOpen(false);
              }
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10 lg:hidden"
            aria-label="Buscar"
          >
            <Search size={20} className="text-white" />
          </button>

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

          {/* Notifications (visible on desktop when logged in) */}
          {user && (
            <Link
              href="/cuenta/notificaciones"
              className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10 lg:flex"
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
            >
              <Bell size={18} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] leading-none font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Mobile: user icon → /admin (admin) | /cuenta (user) | /login (guest) */}
          <Link
            href={
              user ? (user.role === "admin" ? "/admin" : "/cuenta") : "/login"
            }
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10"
            aria-label={
              user?.role === "admin" ? "Panel de administración" : "Mi cuenta"
            }
          >
            <User size={20} className="text-white" />
          </Link>

          {/* Favorites */}
          <Link
            href="/cuenta/favoritos"
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10 sm:flex"
            aria-label="Favoritos"
          >
            <Heart size={20} className="text-white" />
          </Link>

          {/* Cart */}
          <Link
            href="/carrito"
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10"
            aria-label={`Carrito (${count} artículos)`}
          >
            <ShoppingCart size={20} className="text-white" />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] leading-none font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-white/10 lg:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? (
              <X size={20} className="text-white" />
            ) : (
              <Menu size={20} className="text-white" />
            )}
          </button>
        </div>
      </Container>

      {/* Mobile search panel */}
      {mobileSearchOpen && (
        <div
          className="border-t border-white/10 px-4 pb-3 lg:hidden"
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
              placeholder="Buscar productos..."
              autoFocus
              className="h-11 w-full rounded-xl border-2 border-[#2563eb] pr-10 pl-4 text-sm focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#2563eb]"
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
                onHistorySearch={(q) => submitSearch(q, true)}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile full-screen drawer — only mounted during open/close, never in DOM while fully closed */}
      {drawerMounted && (
        <div
          className="fixed inset-0 z-[100] lg:hidden"
          style={{
            pointerEvents: menuOpen ? "auto" : "none",
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity duration-300"
            style={{ opacity: menuOpen ? 1 : 0 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div
            className="absolute top-0 right-0 flex h-full w-[85vw] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out"
            style={{
              transform: menuOpen ? "translateX(0)" : "translateX(100%)",
            }}
          >
            {/* Drawer header */}
            <div
              className="flex flex-shrink-0 items-center justify-between px-5 py-4"
              style={{
                background:
                  "linear-gradient(to right, #0a0f1a 0%, #1e3a8a 55%, #2563eb 100%)",
              }}
            >
              <Link href="/" onClick={() => setMenuOpen(false)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo-tcg.png"
                  alt="TCG Academy"
                  style={{ height: 32, width: "auto" }}
                />
              </Link>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Games section */}
              <div className="px-4 pt-5 pb-3">
                <p className="mb-3 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                  Juegos TCG
                </p>
                <div className="space-y-1">
                  {(
                    [
                      ["Magic: The Gathering", "/magic", "#7c3aed", "🧙"],
                      ["Pokémon TCG", "/pokemon", "#f59e0b", "⚡"],
                      ["One Piece TCG", "/one-piece", "#ef4444", "⚓"],
                      ["Riftbound", "/riftbound", "#06b6d4", "💎"],
                      ["Disney Lorcana", "/lorcana", "#8b5cf6", "✨"],
                      ["Dragon Ball Super", "/dragon-ball", "#f97316", "🐉"],
                      ["Yu-Gi-Oh!", "/yugioh", "#eab308", "👁"],
                      ["Naruto Mythos", "/naruto", "#f97316", "🍃"],
                      ["Digimon TCG", "/digimon", "#3b82f6", "🌐"],
                      ["Topps", "/topps", "#10b981", "⭐"],
                      ["Panini", "/panini", "#6366f1", "📦"],
                    ] as [string, string, string, string][]
                  ).map(([label, href, color, emoji]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-gray-100"
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <span aria-hidden="true">{emoji}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mx-4 border-t border-gray-100" />

              {/* Other links */}
              <div className="px-4 pt-3 pb-3">
                <p className="mb-3 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                  Más
                </p>
                <div className="space-y-1">
                  {(
                    [
                      ["Eventos", "/eventos", "#f59e0b"],
                      ["Tiendas", "/tiendas", "#10b981"],
                      ["Profesionales B2B", "/mayoristas", "#2563eb"],
                    ] as [string, string, string][]
                  ).map(([label, href, color]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-gray-100"
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mx-4 border-t border-gray-100" />

              {/* Auth section */}
              <div className="px-4 pt-4 pb-6">
                {user ? (
                  <div>
                    <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-400">
                        <span className="text-sm font-bold text-white">
                          {user.name[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {user.email ?? ""}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/cuenta"
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-gray-100"
                      >
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">
                          Mi cuenta
                        </span>
                      </Link>
                      <Link
                        href="/cuenta/pedidos"
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-gray-100"
                      >
                        <Package size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">
                          Mis pedidos
                        </span>
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-amber-50"
                        >
                          <Settings size={16} className="text-amber-500" />
                          <span className="text-sm font-medium text-amber-700">
                            Panel admin
                          </span>
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-red-50"
                      >
                        <LogOut size={16} className="text-red-400" />
                        <span className="text-sm font-medium text-red-600">
                          Cerrar sesión
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2563eb] text-sm font-bold text-white transition active:bg-[#1d4ed8]"
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/registro"
                      onClick={() => setMenuOpen(false)}
                      className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 transition active:bg-gray-50"
                    >
                      Crear cuenta
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
        @media (prefers-reduced-motion: reduce) {
          .trust-item::after { animation: none; }
          .trust-icon { animation: none; }
          [style*="mobileIconPop"] { animation: none !important; }
        }
      `}</style>
    </header>
  );
}
