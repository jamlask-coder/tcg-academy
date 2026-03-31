"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit } from "@/utils/sanitize";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit("login", 5, 60_000)) {
      setError(
        "Demasiados intentos. Espera un minuto antes de volver a intentarlo.",
      );
      return;
    }
    setError("");
    setLoading(true);
    const { ok, error: err } = await login(email, password);
    setLoading(false);
    if (ok) {
      router.push("/cuenta");
    } else {
      setError(err ?? "Error al iniciar sesion");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3a5c]">
              <span className="font-bold text-white">T</span>
            </div>
            <span className="text-xl font-bold text-[#1a3a5c]">
              TCG Academy
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido de nuevo
          </h1>
          <p className="mt-1 text-sm text-gray-500">Accede a tu cuenta</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Demo hint */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2.5 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              Cuentas de demo
            </p>
            <div className="space-y-1.5">
              {[
                { email: "cliente@test.com", role: "Cliente" },
                { email: "mayorista@test.com", role: "Mayorista" },
                { email: "tienda@test.com", role: "Tienda" },
                { email: "admin@tcgacademy.com", role: "Admin" },
              ].map(({ email, role }) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    setEmail(email);
                    setPassword("test123");
                  }}
                  className="group flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-1.5 text-xs transition-all hover:border-gray-200 hover:bg-white hover:shadow-sm"
                >
                  <span className="font-mono text-gray-500 transition-colors group-hover:text-gray-800">
                    {email}
                  </span>
                  <span className="font-semibold text-gray-400 transition-colors group-hover:text-[#1a3a5c]">
                    {role}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400">
              Haz clic para rellenar · contraseña: test123
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="h-11 w-full rounded-xl border-2 border-gray-200 pr-4 pl-10 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <Link
                  href="/cuenta/recuperar"
                  className="text-xs text-[#1a3a5c] hover:underline"
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
                  className="h-11 w-full rounded-xl border-2 border-gray-200 pr-10 pl-10 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                  remember ? "border-[#1a3a5c] bg-[#1a3a5c]" : "border-gray-300"
                }`}
                onClick={() => setRemember(!remember)}
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

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1a3a5c] font-bold text-white transition hover:bg-[#15304d] disabled:opacity-60"
            >
              {loading ? (
                "Accediendo..."
              ) : (
                <>
                  <LogIn size={18} /> Iniciar sesion
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{" "}
            <Link
              href="/cuenta/registro"
              className="font-semibold text-[#1a3a5c] hover:underline"
            >
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
