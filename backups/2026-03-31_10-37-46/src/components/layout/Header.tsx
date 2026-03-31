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
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { PRODUCTS, GAME_CONFIG } from "@/data/products";
import { useNotifications } from "@/context/NotificationContext";
import { useDebounce } from "@/hooks/useDebounce";
import { checkRateLimit } from "@/utils/sanitize";

// ─── Predictive search dropdown ───────────────────────────────────────────────

function SearchDropdown({
  query,
  onSelect,
}: {
  query: string;
  onSelect: () => void;
}) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  if (query.trim().length < 2) return null;

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
              return (
                <Link
                  key={p.id}
                  href={`/${p.game}/${p.category}/${p.slug}`}
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
                  <p className="whitespace-nowrap text-sm font-bold text-[#1a3a5c]">
                    {p.price.toFixed(2)}€
                  </p>
                </Link>
              );
            })}
          </div>
          <Link
            href={`/busqueda?q=${encodeURIComponent(query.trim())}`}
            onClick={onSelect}
            className="flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-[#1a3a5c] transition-colors hover:bg-gray-100"
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
    text: `Enviamos en menos de ${SITE_CONFIG.dispatchHours}h`,
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
          "linear-gradient(90deg, #0f2744 0%, #1a3a5c 50%, #1e4976 100%)",
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
          className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 transition hover:bg-gray-100"
        >
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1a3a5c]">
            <span className="text-[9px] font-bold text-white">{user.name[0]}</span>
          </div>
          <span className="text-xs text-gray-500">Hola,&nbsp;</span>
          <span className="text-xs font-bold text-orange-500">{firstName}</span>
          <ChevronDown
            size={10}
            className={`text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Account dropdown */}
        {menuOpen && (
          <div className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl">
            <div className="border-b border-gray-100 px-4 pb-2.5 pt-2">
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
      className="hidden lg:flex items-center"
      style={{ animation: shake ? "headerShake 0.45s ease" : "none" }}
    >
      <form onSubmit={handleSubmit} className="flex items-stretch">
        <div
          className={`flex items-stretch h-8 rounded-xl overflow-hidden border transition-colors ${
            error ? "border-red-400" : "border-gray-200"
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
            className={`h-full w-[90px] xl:w-[118px] px-3 text-xs bg-gray-50 focus:bg-white focus:outline-none border-r transition-colors ${
              error ? "border-red-300 bg-red-50" : "border-gray-200"
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
            className={`h-full w-[90px] xl:w-[118px] px-3 text-xs bg-gray-50 focus:bg-white focus:outline-none border-r transition-colors ${
              error ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}
          />
          <button
            type="submit"
            disabled={loading}
            className="h-full px-4 text-xs font-semibold bg-[#1a3a5c] text-white hover:bg-[#15304d] transition disabled:opacity-60 whitespace-nowrap border-r border-[#15304d]"
          >
            {loading ? "…" : "Entrar"}
          </button>
          <Link
            href="/registro"
            className="flex h-full items-center px-4 text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition whitespace-nowrap"
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
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [desktopQuery, setDesktopQuery] = useState("");
  const debouncedDesktopQuery = useDebounce(desktopQuery, 300);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  const [mobileQuery, setMobileQuery] = useState("");
  const debouncedMobileQuery = useDebounce(mobileQuery, 300);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

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
    <header className="border-b border-gray-200 bg-white shadow-sm">
      {/* Topbar — desktop */}
      <div
        className="hidden py-1.5 text-xs text-white lg:block"
        style={{
          background:
            "linear-gradient(90deg, #0f2744 0%, #1a3a5c 45%, #1e4976 100%)",
        }}
      >
        <Container className="flex items-center justify-center gap-8">
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
            Enviamos en menos de{" "}
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
            Pago{" "}
            <strong className="ml-1 text-amber-300">100% seguro</strong>
          </span>
        </Container>
      </div>
      {/* Topbar — mobile rotating */}
      <MobileTrustBar />

      {/* ── Main bar: todo en una sola fila, de izquierda a derecha ──── */}
      <Container className="flex h-16 items-center gap-3">

        {/* Logo */}
        <Link href="/" className="flex flex-shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a3a5c]">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          <span className="hidden text-xl font-bold text-[#1a3a5c] sm:block">
            TCG Academy
          </span>
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
                setDesktopDropdownOpen(e.target.value.trim().length >= 2);
              }}
              onFocus={() => {
                if (desktopQuery.trim().length >= 2)
                  setDesktopDropdownOpen(true);
              }}
              placeholder="Busca cartas, sobres..."
              className="h-8 w-full rounded-xl border-2 border-gray-200 bg-gray-50 pr-8 pl-3 text-xs transition focus:border-[#1a3a5c] focus:bg-white focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-[#1a3a5c]"
              aria-label="Buscar"
            >
              <Search size={14} />
            </button>
          </form>

          {desktopDropdownOpen && (
            <SearchDropdown
              query={debouncedDesktopQuery}
              onSelect={closeDesktopSearch}
            />
          )}
        </div>

        {/* Desktop inline login / greeting */}
        <HeaderInlineAuth />

        {/* Iconos — directamente después del login, sin spacer */}
        <div className="flex flex-shrink-0 items-center gap-0.5">

          {/* Mobile search toggle */}
          <button
            onClick={() => {
              setMobileSearchOpen(!mobileSearchOpen);
              if (mobileSearchOpen) {
                setMobileQuery("");
                setMobileDropdownOpen(false);
              }
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100 lg:hidden"
            aria-label="Buscar"
          >
            <Search size={20} className="text-gray-700" />
          </button>

          {/* Admin shortcut (sm, not desktop where panel admin is in greeting menu) */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100 sm:flex lg:hidden"
              title="Panel Admin"
            >
              <Settings size={20} className="text-amber-600" />
            </Link>
          )}

          {/* Notifications (visible on desktop when logged in) */}
          {user && (
            <Link
              href="/cuenta/notificaciones"
              className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100 lg:flex"
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
            >
              <Bell size={18} className="text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Mobile: user icon → /cuenta or /login */}
          <Link
            href={user ? "/cuenta" : "/login"}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100"
            aria-label="Mi cuenta"
          >
            <User size={20} className="text-gray-700" />
          </Link>

          {/* Favorites */}
          <Link
            href="/cuenta/favoritos"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100"
            aria-label="Favoritos"
          >
            <Heart size={20} className="text-gray-700" />
          </Link>

          {/* Cart */}
          <Link
            href="/carrito"
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100"
            aria-label={`Carrito (${count} artículos)`}
          >
            <ShoppingCart size={20} className="text-gray-700" />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100 lg:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </Container>

      {/* Mobile search panel */}
      {mobileSearchOpen && (
        <div
          className="border-t border-gray-100 px-4 pb-3 lg:hidden"
          ref={mobileSearchRef}
        >
          <form onSubmit={handleMobileSubmit} className="relative">
            <input
              type="search"
              value={mobileQuery}
              onChange={(e) => {
                setMobileQuery(e.target.value);
                setMobileDropdownOpen(e.target.value.trim().length >= 2);
              }}
              placeholder="Buscar productos..."
              autoFocus
              className="h-11 w-full rounded-xl border-2 border-[#1a3a5c] pr-10 pl-4 text-sm focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#1a3a5c]"
              aria-label="Buscar"
            >
              <Search size={18} />
            </button>
          </form>
          {mobileDropdownOpen && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <SearchDropdown
                query={debouncedMobileQuery}
                onSelect={closeMobileSearch}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile hamburger menu */}
      {menuOpen && (
        <nav className="border-t border-gray-100 bg-white lg:hidden">
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
            ["Panini", "/panini"],
            ["Digimon TCG", "/digimon"],
            ["Eventos", "/eventos"],
            ["Tiendas", "/tiendas"],
            ["Profesionales B2B", "/mayoristas"],
            ["Mi cuenta", user ? "/cuenta" : "/login"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[44px] items-center border-b border-gray-100 px-6 py-3.5 text-sm font-medium text-gray-700 last:border-0 hover:bg-gray-50"
            >
              {label}
            </Link>
          ))}
        </nav>
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
