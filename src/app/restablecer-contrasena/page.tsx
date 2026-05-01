"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { hashPassword } from "@/context/AuthContext";
import type { User } from "@/types/user";
import { validatePasswordForRole } from "@/lib/passwordPolicy";

/**
 * Modo backend del cliente. En server mode el token de reset está en
 * Supabase (lo emite /api/auth reset-password en after()) — esta página
 * NO puede verificar el token localmente; sólo lo valida en el submit
 * llamando a /api/auth reset-confirm. En local mode mantenemos la
 * lógica antigua contra localStorage para que dev/preview siga
 * funcionando sin BD.
 */
const SERVER_MODE =
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

const REGISTERED_KEY = "tcgacademy_registered";
const TOKENS_KEY = "tcgacademy_reset_tokens";

interface ResetToken {
  token: string;
  expiresAt: number;
}

// Modo real 100%: mapa de cuentas demo eliminado. El reset de contraseña sólo
// migra cuentas que ya existen en `tcgacademy_registered` (local-mode dev) o
// va contra /api/auth (server-mode). Mantenemos el símbolo vacío para no
// romper los callsites — `DEMO_USERS[email]` devolverá undefined.
const DEMO_USERS: Record<string, { id: string; name: string; lastName: string; phone: string; role: string }> = {};

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const email = (searchParams.get("email") ?? "").toLowerCase();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token || !email) {
      setTokenValid(false);
      return;
    }
    // En server mode el token se valida server-side al enviar el form.
    // Sólo bloqueamos aquí los enlaces obviamente malformados (sin token o
    // sin email). El servidor responderá 400 si el token está expirado o no
    // coincide con el hash almacenado.
    if (SERVER_MODE) {
      setTokenValid(true);
      return;
    }
    try {
      const tokens = JSON.parse(
        localStorage.getItem(TOKENS_KEY) ?? "{}",
      ) as Record<string, ResetToken>;
      const entry = tokens[email];
      if (!entry || entry.token !== token || Date.now() > entry.expiresAt) {
        setTokenValid(false);
      } else {
        setTokenValid(true);
      }
    } catch {
      setTokenValid(false);
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Detectar el rol del email para aplicar la política correspondiente.
    // Admin → ≥12 chars Aa1*. Resto → ≥6 chars cualquier cosa.
    //
    // En SERVER_MODE saltamos esta comprobación porque el rol real no está
    // en localStorage (vive en BD): aplicar "cliente" por defecto sería
    // demasiado laxo para admins. El servidor reaplica la política correcta
    // con el rol auténtico de BD en /api/auth reset-confirm y devuelve un
    // mensaje claro si la contraseña no cumple.
    if (!SERVER_MODE) {
      let targetRole = "cliente";
      try {
        const registeredPeek = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, { password: string; user: User }>;
        targetRole =
          registeredPeek[email]?.user.role ?? DEMO_USERS[email]?.role ?? "cliente";
      } catch { /* ignore */ }
      const pwdCheck = validatePasswordForRole(password, targetRole);
      if (!pwdCheck.ok) {
        setError(pwdCheck.error ?? "Contraseña no válida");
        return;
      }
    }

    setLoading(true);

    // ── Server mode ───────────────────────────────────────────────
    // Delegamos en /api/auth reset-confirm. El servidor:
    //   - hace SHA-256 del token y lo compara con el hash almacenado
    //   - valida la expiración (1 h)
    //   - aplica `validatePasswordForRole(user.role)` (admin ≥12 Aa1*)
    //   - hashea con bcrypt y persiste en BD
    //   - invalida el token tras consumo (single-use)
    //   - envía email de confirmación
    if (SERVER_MODE) {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset-confirm",
            email,
            token,
            newPassword: password,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Mensajes posibles: "Enlace no válido o expirado",
          // "Enlace expirado. Solicita uno nuevo.", o errores de
          // política de contraseña.
          setError(data?.error ?? "No se ha podido restablecer la contraseña.");
          setLoading(false);
          return;
        }
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?reset=ok");
        }, 2000);
      } catch {
        setError("Error de red. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const registered = JSON.parse(
        localStorage.getItem(REGISTERED_KEY) ?? "{}",
      ) as Record<string, { password: string; user: User }>;

      const hashed = await hashPassword(password);

      if (registered[email]) {
        // Normal registered user — update password
        registered[email].password = hashed;
      } else if (DEMO_USERS[email]) {
        // Demo user — migrate to registered with new password
        const demo = DEMO_USERS[email];
        registered[email] = {
          password: hashed,
          user: {
            id: demo.id,
            email,
            name: demo.name,
            lastName: demo.lastName,
            phone: demo.phone,
            role: demo.role as User["role"],
            addresses: [],
            favorites: [],
            createdAt: new Date().toISOString(),
          },
        };
      } else {
        setError("No se encontró la cuenta asociada a este email");
        setLoading(false);
        return;
      }

      localStorage.setItem(REGISTERED_KEY, JSON.stringify(registered));

      // Remove the used token
      try {
        const tokens = JSON.parse(
          localStorage.getItem(TOKENS_KEY) ?? "{}",
        ) as Record<string, ResetToken>;
        delete tokens[email];
        localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
      } catch {
        /* ignore */
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=ok");
      }, 2000);
    } catch {
      setError("Error al restablecer la contraseña. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-20">
        <div className="text-white">Verificando enlace...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb]">
              <span className="font-bold text-white">T</span>
            </div>
            <span className="text-xl font-bold text-[#2563eb]">
              TCG Academy
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Restablecer contraseña
          </h1>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {!tokenValid ? (
            <div className="py-4 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
              <h2 className="mb-2 text-lg font-bold text-gray-900">
                Enlace no válido o expirado
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Este enlace de restablecimiento ha expirado o no es válido.
                Solicita uno nuevo.
              </p>
              <Link
                href="/recuperar-contrasena"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                <ArrowLeft size={14} /> Solicitar nuevo enlace
              </Link>
            </div>
          ) : success ? (
            <div className="py-4 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="mb-2 text-lg font-bold text-gray-900">
                Contraseña actualizada
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Tu contraseña ha sido restablecida correctamente. Redirigiendo
                al inicio de sesión...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500">
                Introduce tu nueva contraseña para{" "}
                <strong className="text-gray-700">{email}</strong>
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    maxLength={128}
                    className="h-11 w-full rounded-xl border-2 border-gray-200 pr-10 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    maxLength={128}
                    className="h-11 w-full rounded-xl border-2 border-gray-200 pr-10 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Restablecer contraseña"}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-[#2563eb] hover:underline"
                >
                  <ArrowLeft size={13} /> Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center bg-gray-50 py-20">
          <p className="text-gray-500">Cargando...</p>
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
