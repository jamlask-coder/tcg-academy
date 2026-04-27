"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, LogIn, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit } from "@/utils/sanitize";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetOk = searchParams.get("reset") === "ok";
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
  const [showResetBanner, setShowResetBanner] = useState(resetOk);

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
    if (user) router.push(user.role === "admin" ? "/admin" : "/cuenta");
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
    const { ok, error: err } = await login(email, password, remember);
    setLoading(false);
    if (!ok) {
      setError(err ?? "Credenciales incorrectas");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    // On success, the useEffect above handles the redirect once `user`
    // state updates (admin → /admin, others → /cuenta resumen).
  };

  return (
    <div className="flex items-center justify-center bg-gray-50 px-4 py-10 sm:py-16">
      <div
        className="w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-7 pt-5 pb-5 shadow-sm">
          <h1 className="mb-0.5 text-xl font-bold text-gray-900">Inicia sesión</h1>
          <p className="mb-4 text-xs text-gray-500">Accede a tu cuenta de TCG Academy</p>

          {showResetBanner && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle size={18} className="shrink-0 text-green-500" />
              <span>
                <strong>Contraseña restablecida correctamente.</strong> Ya puedes iniciar sesión con tu nueva contraseña.
              </span>
              <button
                onClick={() => setShowResetBanner(false)}
                className="ml-auto shrink-0 text-green-400 hover:text-green-600"
                aria-label="Cerrar mensaje"
              >
                ✕
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-3"
            style={
              shake
                ? { animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both" }
                : {}
            }
          >
            {/* Email or username */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email o nombre de usuario
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com o tu_usuario"
                  maxLength={254}
                  autoComplete="username"
                  className="h-11 w-full rounded-xl border-2 border-gray-200 pr-4 pl-10 text-base transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:outline-none"
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
                  className="h-11 w-full rounded-xl border-2 border-gray-200 pr-10 pl-10 text-base transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:outline-none"
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

            {/* Remember me — el <input> hace todo el trabajo (estado +
                accesibilidad + foco + tecla espacio nativa). El <div>
                visible es PURAMENTE decorativo: aria-hidden y sin onClick
                propio. Tener antes un onClick en el div + label envolvente
                provocaba doble toggle (div onClick + label→input.click)
                que se anulaba a sí mismo en algunos re-renders. */}
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="peer sr-only"
              />
              <div
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#2563eb]/40 peer-focus-visible:ring-offset-1 ${
                  remember ? "border-[#2563eb] bg-[#2563eb]" : "border-gray-300"
                }`}
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
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
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
          <div className="my-3 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Google Sign-In (only renders if NEXT_PUBLIC_GOOGLE_CLIENT_ID is set) */}
          <GoogleSignInButton redirectTo="/cuenta" />

          {/* Register CTA */}
          <Link
            href="/registro"
            className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-amber-400 text-sm font-bold text-gray-900 transition hover:bg-amber-300"
          >
            Crear cuenta nueva
          </Link>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center bg-gray-50 py-20">
          <p className="text-gray-500">Cargando...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
