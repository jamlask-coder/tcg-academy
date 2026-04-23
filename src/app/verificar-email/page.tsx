"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, MailCheck } from "lucide-react";
import { consumeVerificationToken } from "@/services/emailVerificationService";

type Status = "checking" | "ok" | "expired" | "mismatch" | "missing";

async function consumeTokenByMode(
  email: string,
  token: string,
): Promise<{ ok: boolean; reason?: "missing" | "expired" | "mismatch" }> {
  const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
  if (mode !== "server") {
    return consumeVerificationToken(email, token);
  }
  // Server mode → validación contra Supabase vía /api/auth
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-email", email, token }),
    });
    if (res.ok) return { ok: true };
    const errText = (await res.text()).toLowerCase();
    if (errText.includes("expirad")) return { ok: false, reason: "expired" };
    return { ok: false, reason: "mismatch" };
  } catch {
    return { ok: false, reason: "mismatch" };
  }
}

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = (params.get("email") ?? "").toLowerCase();

  // Status inicial derivado de los params (evita cascading render por setState
  // dentro de un useEffect).
  const initialStatus: Status = !token || !email ? "missing" : "checking";
  const [status, setStatus] = useState<Status>(initialStatus);

  useEffect(() => {
    if (initialStatus !== "checking") return;
    let cancelled = false;
    consumeTokenByMode(email, token).then((res) => {
      if (cancelled) return;
      if (res.ok) setStatus("ok");
      else setStatus(res.reason ?? "mismatch");
    });
    return () => {
      cancelled = true;
    };
  }, [token, email, initialStatus]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        {status === "checking" ? (
          <div className="flex flex-col items-center text-center">
            <Loader2 size={32} className="animate-spin text-[#2563eb]" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Verificando tu email…
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Esto sólo tarda un momento.
            </p>
          </div>
        ) : null}

        {status === "ok" ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              ¡Email verificado!
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Tu cuenta ya está completamente activa. Gracias por confirmar.
            </p>
            <Link
              href="/cuenta"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#2563eb] px-6 font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : null}

        {status === "expired" ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle size={28} className="text-amber-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Enlace caducado
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Este enlace de verificación ya no es válido. Entra en tu cuenta
              y pulsa &ldquo;Reenviar email de verificación&rdquo; para recibir
              uno nuevo.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#2563eb] px-6 font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : null}

        {status === "mismatch" || status === "missing" ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertCircle size={28} className="text-red-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Enlace no válido
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              El enlace está incompleto o no coincide con ningún email
              pendiente. Pide uno nuevo desde tu cuenta.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#2563eb] px-6 font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center bg-gray-50">
          <MailCheck size={32} className="animate-pulse text-[#2563eb]" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
