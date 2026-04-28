"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, MailX } from "lucide-react";

type Status = "checking" | "ok" | "invalid" | "missing" | "error";

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const initialStatus: Status = !token ? "missing" : "checking";
  const [status, setStatus] = useState<Status>(initialStatus);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (initialStatus !== "checking") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;

        if (res.ok) {
          const data = (await res.json()) as { email?: string };
          setEmail(data.email ?? "");
          setStatus("ok");
        } else if (res.status === 400) {
          setStatus("invalid");
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, initialStatus]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        {status === "checking" ? (
          <div className="flex flex-col items-center text-center">
            <Loader2 size={32} className="animate-spin text-[#132B5F]" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Procesando tu baja…
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
              Te has dado de baja
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              {email ? (
                <>
                  La dirección <strong>{email}</strong> ya no recibirá más
                  emails comerciales de TCG Academy.
                </>
              ) : (
                <>Ya no recibirás más emails comerciales de TCG Academy.</>
              )}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Seguirás recibiendo correos transaccionales de tus pedidos
              (confirmaciones, envíos, facturas), porque son obligatorios por
              contrato. Puedes ajustar tus preferencias en cualquier momento
              desde tu cuenta.
            </p>
            <Link
              href="/cuenta/notificaciones"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#132B5F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1530]"
            >
              Gestionar mis preferencias
            </Link>
          </div>
        ) : null}

        {status === "invalid" ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle size={28} className="text-amber-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Enlace no válido
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              El enlace que has usado ha caducado o no es correcto. Puedes
              gestionar tus preferencias de comunicación desde tu cuenta.
            </p>
            <Link
              href="/cuenta/notificaciones"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#132B5F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1530]"
            >
              Ir a mis preferencias
            </Link>
          </div>
        ) : null}

        {status === "missing" ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <MailX size={28} className="text-gray-500" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Falta el enlace
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              Este enlace de baja sólo funciona desde un email recibido. Si
              quieres dejar de recibir comunicaciones, entra en tu cuenta.
            </p>
            <Link
              href="/cuenta/notificaciones"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#132B5F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1530]"
            >
              Gestionar preferencias
            </Link>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertCircle size={28} className="text-red-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              No hemos podido procesarlo
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              Ha habido un problema al registrar tu baja. Vuelve a intentarlo
              en unos minutos o gestiona tus preferencias desde tu cuenta.
            </p>
            <Link
              href="/cuenta/notificaciones"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#132B5F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1530]"
            >
              Ir a mis preferencias
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[#132B5F]" />
        </div>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
