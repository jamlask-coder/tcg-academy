"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Send, CheckCircle, ArrowLeft } from "lucide-react";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Generate a crypto-random reset token
    const tokenArr = new Uint8Array(24);
    crypto.getRandomValues(tokenArr);
    const token = Array.from(tokenArr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store reset token with 1h expiry
    try {
      const tokens = JSON.parse(
        localStorage.getItem("tcgacademy_reset_tokens") ?? "{}",
      ) as Record<string, { token: string; expiresAt: number }>;
      tokens[email.toLowerCase()] = {
        token,
        expiresAt: Date.now() + 3600000,
      };
      localStorage.setItem("tcgacademy_reset_tokens", JSON.stringify(tokens));
    } catch {
      /* ignore */
    }

    // Log "sent email" entry
    const resetLink = `${window.location.origin}/restablecer-contrasena?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;
    try {
      const sentEmails = JSON.parse(
        localStorage.getItem("tcgacademy_sent_emails") ?? "[]",
      ) as Array<Record<string, unknown>>;
      sentEmails.unshift({
        date: new Date().toISOString(),
        to: email.toLowerCase(),
        subject: "Restablece tu contraseña",
        body: `Enlace para restablecer tu contraseña: ${resetLink}`,
        status: "enviado",
      });
      if (sentEmails.length > 100) sentEmails.length = 100;
      localStorage.setItem("tcgacademy_sent_emails", JSON.stringify(sentEmails));
    } catch {
      /* ignore */
    }

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
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
            <div className="py-4 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="mb-2 text-lg font-bold text-gray-900">
                Email enviado
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Si existe una cuenta con ese email, recibirás instrucciones para
                restablecer tu contraseña.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
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
