"use client";
import { SITE_CONFIG } from "@/config/siteConfig";
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
  Clock,
  ShieldCheck,
  Store,
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
                    <p className="truncate text-sm font-medium text-gray-800">
                      {p.name}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] font-semibold"
                      style={{ color: config?.color || "#6b7280" }}
                    >
                      {config?.name || p.game}
                    </p>
                  </div>
                  <p className="text-sm font-bold whitespace-nowrap text-[#1a3a5c]">
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
    icon: Clock,
    text: `Enviamos en menos de ${SITE_CONFIG.dispatchHours}h`,
    highlight: `${SITE_CONFIG.dispatchHours}h`,
  },
  { icon: ShieldCheck, text: "Pago 100% seguro", highlight: "100%" },
  { icon: Store, text: "4 tiendas físicas en España", highlight: "4 tiendas" },
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
          transform: visible ? "translateY(0)" : "translateY(4px)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        <Icon size={12} className="text-amber-300" /> {text}
      </span>
    </div>
  );
}

// ─── Inline header login / user greeting ──────────────────────────────────────

function HeaderAuth() {
  const { user, login, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      const { ok } = await login(email, pwd);
      setLoading(false);
      if (ok) {
        setEmail("");
        setPwd("");
      } else {
        setErrorShake(true);
        setTooltip(true);
        setTimeout(() => {
          setErrorShake(false);
          setTooltip(false);
        }, 2000);
      }
    },
    [email, pwd, login],
  );

  if (user) {
    const firstName = user.name.split(" ")[0];
    return (
      <div className="relative hidden xl:block" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a3a5c]">
            <span className="text-[10px] font-bold text-white">{user.name[0]}</span>
          </div>
          <span>Hola, {firstName}</span>
          <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl">
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
                <LayoutDashboard size={15} className="text-amber-400" /> Panel admin
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

  return (
    <form
      onSubmit={handleSubmit}
      className="relative hidden items-center gap-1.5 xl:flex"
    >
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          maxLength={254}
          autoComplete="email"
          className={`h-8 w-36 rounded-lg border px-3 text-xs transition focus:outline-none focus:ring-2 ${
            errorShake
              ? "border-red-400 focus:ring-red-100"
              : "border-gray-200 bg-gray-50 focus:border-[#1a3a5c] focus:ring-[#1a3a5c]/10"
          }`}
          style={
            errorShake
              ? { animation: "headerShake 0.4s cubic-bezier(.36,.07,.19,.97) both" }
              : {}
          }
        />
      </div>
      <input
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        placeholder="Contraseña"
        required
        maxLength={128}
        autoComplete="current-password"
        className={`h-8 w-28 rounded-lg border px-3 text-xs transition focus:outline-none focus:ring-2 ${
          errorShake
            ? "border-red-400 focus:ring-red-100"
            : "border-gray-200 bg-gray-50 focus:border-[#1a3a5c] focus:ring-[#1a3a5c]/10"
        }`}
        style={
          errorShake
            ? { animation: "headerShake 0.4s cubic-bezier(.36,.07,.19,.97) both" }
            : {}
        }
      />
      <div className="relative">
        <button
          type="submit"
          disabled={loading}
          className="flex h-8 items-center gap-1 rounded-lg bg-[#1a3a5c] px-3 text-xs font-semibold text-white transition hover:bg-[#15304d] disabled:opacity-60"
        >
          {loading ? "..." : "Entrar"}
        </button>
        {tooltip && (
          <div className="absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg">
            Credenciales incorrectas
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-red-600" />
          </div>
        )}
      </div>
    </form>
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
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-0">
            <span className="flex items-center gap-1.5 font-medium">
              <Package size={12} className="text-amber-300" />
              Envío gratis desde{" "}
              <strong className="ml-1 text-amber-300">
                {SITE_CONFIG.shippingThreshold}€
              </strong>
            </span>
            <span className="mx-4 h-3 border-l border-white/20" />
            <span className="flex items-center gap-1.5 font-medium">
              <Clock size={12} className="text-amber-300" />
              Enviamos en menos de{" "}
              <strong className="ml-1 text-amber-300">
                {SITE_CONFIG.dispatchHours}h
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-0">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={12} className="text-amber-300" /> Pago{" "}
              <strong className="ml-1 text-amber-300">100% seguro</strong>
            </span>
            <span className="mx-4 h-3 border-l border-white/20" />
            <Link
              href="/tiendas"
              className="flex items-center gap-1.5 font-medium transition-colors hover:text-amber-300"
            >
              <Store size={12} className="text-amber-300" />{" "}
              <strong className="text-amber-300">4</strong>&nbsp;Tiendas físicas
            </Link>
          </div>
        </div>
      </div>
      {/* Topbar — mobile rotating */}
      <MobileTrustBar />

      {/* Main bar */}
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-6">
        {/* Logo */}
        <Link href="/" className="flex flex-shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a3a5c]">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          <span className="hidden text-xl font-bold text-[#1a3a5c] sm:block">
            TCG Academy
          </span>
        </Link>

        {/* Desktop predictive search */}
        <div
          className="relative hidden max-w-xl flex-1 lg:block"
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
              placeholder="Busca cartas, sobres, mazos..."
              className="h-10 w-full rounded-xl border-2 border-gray-200 bg-gray-50 pr-10 pl-4 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-3 -mr-3 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-gray-400 hover:text-[#1a3a5c]"
            >
              <Search size={18} />
            </button>
          </form>

          {desktopDropdownOpen && (
            <SearchDropdown
              query={debouncedDesktopQuery}
              onSelect={closeDesktopSearch}
            />
          )}
        </div>

        {/* Right-side icons */}
        <div className="ml-auto flex items-center gap-1">
          {/* Mobile search toggle */}
          <button
            onClick={() => {
              setMobileSearchOpen(!mobileSearchOpen);
              if (mobileSearchOpen) {
                setMobileQuery("");
                setMobileDropdownOpen(false);
              }
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition hover:bg-gray-100 lg:hidden"
            aria-label="Buscar"
          >
            <Search size={20} className="text-gray-700" />
          </button>

          {/* Admin shortcut (small screens) */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition hover:bg-gray-100 sm:flex xl:hidden"
              title="Panel Admin"
            >
              <Settings size={20} className="text-amber-600" />
            </Link>
          )}

          {/* Notifications (visible when logged in) */}
          {user && (
            <Link
              href="/cuenta/notificaciones"
              className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition hover:bg-gray-100 sm:flex"
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
            >
              <Bell size={20} className="text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] leading-none font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* ── Inline login / greeting (xl only) ── */}
          <HeaderAuth />

          {/* User icon (→ /login if not logged, /cuenta if logged) */}
          <Link
            href={user ? "/cuenta" : "/login"}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition hover:bg-gray-100 xl:hidden"
            aria-label="Mi cuenta"
          >
            {user ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a3a5c]">
                <span className="text-[10px] font-bold text-white">
                  {user.name[0]}
                </span>
              </div>
            ) : (
              <User size={20} className="text-gray-700" />
            )}
          </Link>

          {/* Favorites */}
          <Link
            href="/cuenta/favoritos"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition hover:bg-gray-100"
            aria-label="Favoritos"
          >
            <Heart size={20} className="text-gray-700" />
          </Link>

          {/* Cart */}
          <Link
            href="/carrito"
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition hover:bg-gray-100"
            aria-label={`Carrito (${count} artículos)`}
          >
            <ShoppingCart size={20} className="text-gray-700" />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex h-4.5 min-h-[18px] w-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] leading-none font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition hover:bg-gray-100 lg:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

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
            ["Eventos", "/eventos"],
            ["Tiendas", "/tiendas"],
            ["Mayoristas B2B", "/mayoristas"],
            ["Mi cuenta", user ? "/cuenta" : "/login"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block flex min-h-[44px] items-center border-b border-gray-100 px-6 py-3.5 text-sm font-medium text-gray-700 last:border-0 hover:bg-gray-50"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      <style>{`
        @keyframes headerShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(3px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
    </header>
  );
}
