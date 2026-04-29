"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Send, CheckCircle, ArrowLeft } from "lucide-react";

/**
 * Página /recuperar-contrasena
 *
 * Llama a `POST /api/auth` con `action: "reset-password"`. El endpoint:
 *   - Busca el usuario por email en BD (Supabase en server-mode).
 *   - Crea un reset token con hash + expiración 1h.
 *   - Envía email con la plantilla `recuperar_contrasena` vía Resend.
 *   - Es silencioso si el email no existe (anti-enumeración).
 *
 * Aquí siempre mostramos el mensaje "Si existe una cuenta…" — ni el cliente
 * ni el server revelan si el email está registrado.
 */
export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          email: normalizedEmail,
        }),
      });
    } catch {
      /* silencioso — UX igual exista o no */
    }

    setLoading(false);
    setSubmitted(true);
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
          <h1 className="text-2xl font-bold text-gray-900">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {submitted ? (
            <div className="py-2">
              <CheckCircle
                size={48}
                className="mx-auto mb-4 text-green-500"
              />
              <h2 className="mb-2 text-center text-lg font-bold text-gray-900">
                Revisa tu bandeja de entrada
              </h2>
              <p className="mb-6 text-center text-sm text-gray-500">
                Si existe una cuenta con ese email, recibirás instrucciones
                para restablecer tu contraseña. Revisa también la carpeta de
                spam.
              </p>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] hover:underline"
                >
                  <ArrowLeft size={14} /> Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Email de tu cuenta
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
                    className="h-11 w-full rounded-xl border-2 border-gray-200 pr-4 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {loading ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send size={18} /> Enviar enlace
                  </>
                )}
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
