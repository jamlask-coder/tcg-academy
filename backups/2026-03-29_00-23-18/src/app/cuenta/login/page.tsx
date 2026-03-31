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
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#1a3a5c] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-[#1a3a5c]">
              TCG Academy
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido de nuevo
          </h1>
          <p className="text-gray-500 text-sm mt-1">Accede a tu cuenta</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Demo hint */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
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
                  className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-200"
                >
                  <span className="text-gray-500 group-hover:text-gray-800 transition-colors font-mono">
                    {email}
                  </span>
                  <span className="text-gray-400 group-hover:text-[#1a3a5c] font-semibold transition-colors">
                    {role}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              Haz clic para rellenar · contraseña: test123
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full h-11 pl-10 pr-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="w-full h-11 pl-10 pr-10 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  remember ? "bg-[#1a3a5c] border-[#1a3a5c]" : "border-gray-300"
                }`}
                onClick={() => setRemember(!remember)}
              >
                {remember && (
                  <svg
                    className="w-3 h-3 text-white"
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
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1a3a5c] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition disabled:opacity-60"
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

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{" "}
            <Link
              href="/cuenta/registro"
              className="text-[#1a3a5c] font-semibold hover:underline"
            >
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
