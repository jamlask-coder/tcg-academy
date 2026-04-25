"use client";
import { useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  User as UserIcon,
  Calendar,
  Phone,
} from "lucide-react";
import { hashPassword } from "@/context/AuthContext";
import {
  peekActivationToken,
  consumeActivationToken,
  completeActivation,
  type ActivationTokenRecord,
} from "@/services/userAdminService";
import { loadFullUser } from "@/services/userAdminService";
import { DataHub } from "@/lib/dataHub";

const USERNAMES_KEY = "tcgacademy_usernames";

function normalizeUsername(u: string): string {
  return u.toLowerCase().trim();
}

function isUsernameTaken(username: string): boolean {
  try {
    const idx = JSON.parse(
      localStorage.getItem(USERNAMES_KEY) ?? "{}",
    ) as Record<string, string>;
    return Boolean(idx[normalizeUsername(username)]);
  } catch {
    return false;
  }
}

function indexUsername(username: string, email: string): void {
  try {
    const idx = JSON.parse(
      localStorage.getItem(USERNAMES_KEY) ?? "{}",
    ) as Record<string, string>;
    idx[normalizeUsername(username)] = email.toLowerCase();
    localStorage.setItem(USERNAMES_KEY, JSON.stringify(idx));
  } catch {
    /* ignore */
  }
}

function ActivationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const initialRecord: ActivationTokenRecord | null = useMemo(() => {
    if (typeof window === "undefined" || !token) return null;
    return peekActivationToken(token);
  }, [token]);

  const existingUser = useMemo(() => {
    if (!initialRecord) return null;
    return loadFullUser(initialRecord.userId);
  }, [initialRecord]);

  const needsPhone = !existingUser?.phone;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState(existingUser?.phone ?? "");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tokenValid = initialRecord !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const trimmedUser = username.trim();
    if (trimmedUser.length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres");
      return;
    }
    if (!/^[a-z0-9_.-]+$/i.test(trimmedUser)) {
      setError("Usuario sólo puede contener letras, números, '.', '-' y '_'");
      return;
    }
    if (!birthDate) {
      setError("La fecha de nacimiento es obligatoria");
      return;
    }
    if (needsPhone && !phone.trim()) {
      setError("El teléfono es obligatorio");
      return;
    }
    if (isUsernameTaken(trimmedUser)) {
      setError("Ese nombre de usuario ya está en uso");
      return;
    }

    setLoading(true);
    try {
      const rec = consumeActivationToken(token);
      if (!rec) {
        setError("El enlace ha caducado o ya se ha usado. Solicita uno nuevo.");
        setLoading(false);
        return;
      }
      const hashed = await hashPassword(password);
      const updated = completeActivation(rec.userId, {
        password: hashed,
        username: trimmedUser,
        birthDate,
        phone: needsPhone ? phone.trim() : undefined,
      });
      indexUsername(trimmedUser, updated.email);
      DataHub.emit("users");
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?activated=ok");
      }, 2200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al activar la cuenta.",
      );
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Activa tu cuenta</h1>
          <p className="mt-2 text-sm text-gray-500">
            Completa los datos para acceder a tu área de cliente
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {!tokenValid ? (
            <div className="py-4 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
              <h2 className="mb-2 text-lg font-bold text-gray-900">
                Enlace no válido o expirado
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Este enlace de activación ha caducado (14 días) o ya se ha usado.
                Contacta con nosotros para recibir uno nuevo.
              </p>
              <Link
                href="/contacto"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                <ArrowLeft size={14} /> Contactar con soporte
              </Link>
            </div>
          ) : success ? (
            <div className="py-4 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="mb-2 text-lg font-bold text-gray-900">
                Cuenta activada
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Tu cuenta se ha activado correctamente. Redirigiendo al inicio
                de sesión…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500">
                Estás activando la cuenta de{" "}
                <strong className="text-gray-700">
                  {existingUser?.name} {existingUser?.lastName}
                </strong>{" "}
                (
                <strong className="text-gray-700">{initialRecord?.email}</strong>
                ).
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Nombre de usuario (@handle)
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. ricardo.luri"
                    className="h-11 w-full rounded-xl border-2 border-gray-200 pr-3 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    maxLength={128}
                    className="h-11 w-full rounded-xl border-2 border-gray-200 pr-10 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
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
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    maxLength={128}
                    className="h-11 w-full rounded-xl border-2 border-gray-200 pr-10 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={
                      showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Fecha de nacimiento
                </label>
                <div className="relative">
                  <Calendar
                    size={16}
                    className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-gray-200 pr-3 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                </div>
              </div>

              {needsPhone && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+34 600000000"
                      maxLength={30}
                      className="h-11 w-full rounded-xl border-2 border-gray-200 pr-3 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                </div>
              )}

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
                {loading ? "Activando…" : "Activar cuenta"}
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

export default function ActivarCuentaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center bg-gray-50 py-20">
          <p className="text-gray-500">Cargando…</p>
        </div>
      }
    >
      <ActivationForm />
    </Suspense>
  );
}
