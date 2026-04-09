"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  LogIn,
  Package,
  Clock,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit } from "@/utils/sanitize";

const DEMO_ACCOUNTS = [
  { email: "cliente@test.com", role: "Cliente" },
  { email: "mayorista@test.com", role: "Mayorista" },
  { email: "tienda@test.com", role: "Tienda" },
  { email: "admin@tcgacademy.com", role: "Admin" },
];

const FEATURES = [
  { icon: Package, text: "100% productos originales" },
  { icon: Clock, text: "Envío en menos de 24h" },
  { icon: ShieldCheck, text: "Precios exclusivos para profesionales" },
  { icon: Star, text: "Programa de puntos y recompensas" },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutUntil) return;
    // Set initial value immediately via requestAnimationFrame to avoid sync setState-in-effect
    const initial = Math.ceil((lockoutUntil - Date.now()) / 1000);
    requestAnimationFrame(() => setCountdown(initial > 0 ? initial : 0));
    const id = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setCountdown(0);
        setError("");
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  useEffect(() => {
    if (user) router.push("/cuenta");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit("login", 5, 60_000)) {
      try {
        const timestamps = JSON.parse(
          sessionStorage.getItem("rl:login") ?? "[]",
        ) as number[];
        if (timestamps.length > 0) {
          setLockoutUntil(Math.min(...timestamps) + 60_000);
        }
      } catch {
        setLockoutUntil(Date.now() + 60_000);
      }
      setError("Demasiados intentos.");
      return;
    }
    setError("");
    setLoading(true);
    const { ok, error: err } = await login(email, password);
    setLoading(false);
    if (ok) {
      router.push("/cuenta");
    } else {
      setError(err ?? "Credenciales incorrectas");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ───────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[45%]"
        style={{
          background:
            "linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #1d4ed8 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-10 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          {/* Decorative card shapes */}
          <div
            className="absolute top-32 right-8 h-36 w-24 rotate-12 rounded-xl bg-white/5 shadow-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <div
            className="absolute top-44 right-20 h-36 w-24 rotate-6 rounded-xl bg-white/5 shadow-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <div
            className="absolute right-10 bottom-32 h-28 w-20 -rotate-6 rounded-xl bg-amber-400/10 shadow-2xl"
            style={{ border: "1px solid rgba(251,191,36,0.15)" }}
          />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
            <span className="text-xl font-bold text-white">T</span>
          </div>
          <span className="text-2xl font-bold text-white">TCG Academy</span>
        </Link>

        {/* Main copy */}
        <div className="relative z-10">
          <h1 className="mb-4 text-4xl leading-tight font-bold text-white">
            Bienvenido a la mejor tienda TCG de España
          </h1>
          <p className="mb-10 text-lg text-blue-200">
            Miles de productos, precios competitivos y envíos rápidos.
          </p>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon size={18} className="text-amber-300" />
                </div>
                <span className="text-base font-medium text-blue-100">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-blue-300/60">
          © 2025 TCG Academy · Todos los derechos reservados
        </p>
      </div>

      {/* ── Right panel ──────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb]">
            <span className="font-bold text-white">T</span>
          </div>
          <span className="text-xl font-bold text-[#2563eb]">TCG Academy</span>
        </Link>

        <div
          className="w-full max-w-md"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Inicia sesión</h2>
            <p className="mt-1 text-gray-500">
              Accede a tu cuenta de TCG Academy
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            style={
              shake
                ? { animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both" }
                : {}
            }
          >
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  maxLength={254}
                  className="h-12 w-full rounded-xl border-2 border-gray-200 pr-4 pl-10 text-base transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <Link
                  href="/recuperar-contrasena"
                  className="text-xs text-[#2563eb] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  maxLength={128}
                  className="h-12 w-full rounded-xl border-2 border-gray-200 pr-10 pl-10 text-base transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={
                    showPwd ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                  remember ? "border-[#2563eb] bg-[#2563eb]" : "border-gray-300"
                }`}
                onClick={() => setRemember(!remember)}
                role="checkbox"
                aria-checked={remember}
                aria-label="Recordarme"
                tabIndex={0}
                onKeyDown={(e) => e.key === " " && setRemember(!remember)}
              >
                {remember && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600">Recordarme</span>
            </label>

            {/* Error / lockout */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
                {countdown > 0 && (
                  <span className="ml-1 font-bold">
                    Reintenta en {countdown}s
                  </span>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || countdown > 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {loading ? (
                "Accediendo..."
              ) : (
                <>
                  <LogIn size={18} /> Entrar
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Register CTA */}
          <Link
            href="/registro"
            className="flex h-11 w-full items-center justify-center rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 transition hover:border-[#2563eb] hover:text-[#2563eb]"
          >
            Crear cuenta nueva
          </Link>

          {/* Demo credentials */}
          <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-2.5 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              Cuentas de demo
            </p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map(({ email: demoEmail, role }) => (
                <button
                  key={demoEmail}
                  type="button"
                  onClick={() => {
                    setEmail(demoEmail);
                    setPassword("test123");
                  }}
                  className="group flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-1.5 text-xs transition-all hover:border-gray-200 hover:bg-white hover:shadow-sm"
                >
                  <span className="font-mono text-gray-500 transition-colors group-hover:text-gray-800">
                    {demoEmail}
                  </span>
                  <span className="font-semibold text-gray-400 transition-colors group-hover:text-[#2563eb]">
                    {role}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400">
              Haz clic para rellenar · contraseña: test123
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-6px); }
          40%, 60% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
