"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getEmailService } from "@/lib/email";
import {
  issueVerificationToken,
  hasPendingVerification,
  isEmailVerificationRequired,
} from "@/services/emailVerificationService";

/**
 * Banner no bloqueante que aparece en `/cuenta` cuando el email no ha sido
 * verificado. Permite reenviar el enlace de verificación. Con la feature
 * flag `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true` el login ya está
 * bloqueado, por lo que este banner es el canal natural de resolución.
 */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    setPending(hasPendingVerification(user.email));
  }, [user?.email]);

  const handleResend = useCallback(async () => {
    if (!user?.email) return;
    setSending(true);
    setError("");
    try {
      const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
      if (mode === "server") {
        // Server mode: el API emite el token + envía el email (RESEND_API_KEY
        // solo existe server-side). 429 si el usuario reenvía demasiado rápido.
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resend-verification", email: user.email }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "resend failed");
        }
      } else {
        const rawToken = await issueVerificationToken(user.email);
        const origin =
          (typeof window !== "undefined" && window.location?.origin) ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000";
        const verifyUrl = `${origin}/verificar-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
        await getEmailService().sendTemplatedEmail("verificar_email", user.email, {
          nombre: user.name || "",
          verify_url: verifyUrl,
          expires_in: "7 días",
        });
      }
      setSent(true);
      setPending(true);
    } catch {
      setError("No se ha podido reenviar el email. Inténtalo en unos minutos.");
    } finally {
      setSending(false);
    }
  }, [user?.email, user?.name]);

  if (!user) return null;
  if (user.emailVerified) return null;

  const required = isEmailVerificationRequired();

  return (
    <div
      className={`mb-5 rounded-2xl border px-5 py-4 ${
        required
          ? "border-amber-200 bg-amber-50"
          : "border-blue-100 bg-blue-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
            required ? "bg-amber-100" : "bg-blue-100"
          }`}
        >
          {sent ? (
            <CheckCircle
              size={18}
              className={required ? "text-amber-600" : "text-blue-600"}
            />
          ) : (
            <Mail
              size={18}
              className={required ? "text-amber-600" : "text-blue-600"}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${
              required ? "text-amber-900" : "text-blue-900"
            }`}
          >
            {sent
              ? "¡Email reenviado!"
              : required
                ? "Confirma tu email para desbloquear tu cuenta"
                : "Verifica tu email"}
          </p>
          <p
            className={`mt-0.5 text-xs ${
              required ? "text-amber-700" : "text-blue-700"
            }`}
          >
            {sent
              ? `Te hemos enviado un nuevo enlace a ${user.email}. Revisa también la carpeta de spam.`
              : pending
                ? `Tienes un enlace pendiente en ${user.email}. Si no te ha llegado, puedes reenviarlo.`
                : `Enviaremos un enlace de un solo uso a ${user.email}.`}
          </p>
          {error && (
            <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
          )}
        </div>
        {!sent && (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className={`inline-flex h-9 flex-shrink-0 items-center justify-center rounded-xl px-4 text-xs font-bold text-white transition disabled:opacity-60 ${
              required
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[#2563eb] hover:bg-[#1d4ed8]"
            }`}
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : pending ? (
              "Reenviar"
            ) : (
              "Enviar enlace"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
