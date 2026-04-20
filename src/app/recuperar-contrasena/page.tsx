"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Send, CheckCircle, ArrowLeft, Copy, Check, AlertTriangle } from "lucide-react";

const REGISTERED_KEY = "tcgacademy_registered";
const TOKENS_KEY = "tcgacademy_reset_tokens";

/** Known demo emails — always considered "existing" accounts */
const DEMO_EMAILS = [
  "cliente@test.com",
  "mayorista@test.com",
  "tienda@test.com",
  "admin@tcgacademy.es",
  "luri@tcgacademy.es",
  "font@tcgacademy.es",
];

/** Check whether an email belongs to any account (demo or registered) */
function emailExists(email: string): boolean {
  const key = email.toLowerCase().trim();
  if (DEMO_EMAILS.includes(key)) return true;
  try {
    const registered = JSON.parse(
      localStorage.getItem(REGISTERED_KEY) ?? "{}",
    ) as Record<string, unknown>;
    return !!registered[key];
  } catch {
    return false;
  }
}

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);

    const normalizedEmail = email.toLowerCase().trim();

    // Validate that the account exists
    if (!emailExists(normalizedEmail)) {
      // Security: show same "sent" screen to prevent email enumeration,
      // but don't generate a real token and don't show the link
      setResetLink("");
      setNotFound(true);
      setLoading(false);
      setSubmitted(true);
      return;
    }

    // Generate a crypto-random reset token
    const tokenArr = new Uint8Array(24);
    crypto.getRandomValues(tokenArr);
    const token = Array.from(tokenArr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store reset token with 1h expiry
    try {
      const tokens = JSON.parse(
        localStorage.getItem(TOKENS_KEY) ?? "{}",
      ) as Record<string, { token: string; expiresAt: number }>;
      tokens[normalizedEmail] = {
        token,
        expiresAt: Date.now() + 3600000,
      };
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } catch {
      /* ignore */
    }

    // Build the reset link
    const link = `${window.location.origin}/restablecer-contrasena?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // Log "sent email" entry in the CANONICAL log
    // (tcgacademy_email_log; duplicate tcgacademy_sent_emails eliminated).
    try {
      const emailLog = JSON.parse(
        localStorage.getItem("tcgacademy_email_log") ?? "[]",
      ) as Array<Record<string, unknown>>;
      emailLog.unshift({
        date: new Date().toISOString(),
        to: normalizedEmail,
        subject: "Restablece tu contraseña — TCG Academy",
        body: `Has solicitado restablecer tu contraseña. Usa el siguiente enlace (válido 1 hora): ${link}`,
        status: "enviado",
      });
      if (emailLog.length > 100) emailLog.length = 100;
      localStorage.setItem(
        "tcgacademy_email_log",
        JSON.stringify(emailLog),
      );
    } catch {
      /* ignore */
    }

    setResetLink(link);
    setLoading(false);
    setSubmitted(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: select the text */
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
              {notFound ? (
                <>
                  <CheckCircle
                    size={48}
                    className="mx-auto mb-4 text-green-500"
                  />
                  <h2 className="mb-2 text-center text-lg font-bold text-gray-900">
                    Revisa tu bandeja de entrada
                  </h2>
                  <p className="mb-6 text-center text-sm text-gray-500">
                    Si existe una cuenta con ese email, recibirás instrucciones
                    para restablecer tu contraseña.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle
                    size={48}
                    className="mx-auto mb-4 text-green-500"
                  />
                  <h2 className="mb-2 text-center text-lg font-bold text-gray-900">
                    Enlace generado
                  </h2>
                  <p className="mb-4 text-center text-sm text-gray-500">
                    En producción este enlace se enviaría por email. Como estamos
                    en modo local, puedes usarlo directamente:
                  </p>

                  {/* Reset link box */}
                  <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span className="text-xs font-semibold text-gray-600">
                        Enlace de restablecimiento (válido 1 hora)
                      </span>
                    </div>
                    <p className="mb-3 break-all rounded-lg bg-white p-2.5 font-mono text-xs text-gray-600 select-all">
                      {resetLink}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#1d4ed8]"
                        aria-label="Copiar enlace"
                      >
                        {copied ? (
                          <>
                            <Check size={13} /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copiar enlace
                          </>
                        )}
                      </button>
                      <Link
                        href={resetLink.replace(window.location.origin, "")}
                        className="flex items-center gap-1.5 rounded-lg border-2 border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        Ir al enlace
                      </Link>
                    </div>
                  </div>
                </>
              )}

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
