"use client";

/**
 * Onboarding forzoso — completar datos fiscales obligatorios.
 *
 * Se muestra después de login (incluido Google OAuth) si el usuario no tiene
 * un NIF válido. No permite salir sin rellenar.
 *
 * Cumplimiento: Art. 6.1.d RD 1619/2012.
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { validateSpanishNIF } from "@/lib/validations/nif";
import { AlertCircle, ShieldCheck, CheckCircle } from "lucide-react";

function CompletarDatosInner() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") ?? "/cuenta";

  const [nif, setNif] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = validateSpanishNIF(nif);
    if (!result.valid) {
      setError(result.error ?? "NIF/CIF inválido");
      return;
    }
    if (!phone || phone.trim().length < 9) {
      setError("Teléfono obligatorio");
      return;
    }
    setSubmitting(true);
    updateProfile({
      nif: result.normalized,
      nifType: result.type === "OTHER" ? undefined : result.type,
      phone: phone.trim(),
    });
    router.replace(returnTo);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-2xl items-center px-4 py-10">
      <div className="w-full overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-lg">
        <div className="bg-amber-50 px-6 py-5 border-b border-amber-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <ShieldCheck size={22} className="text-amber-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-amber-900">
                Completa tus datos fiscales
              </h1>
              <p className="mt-1 text-sm text-amber-800">
                Por ley, necesitamos tu NIF/NIE/CIF para poder emitirte
                facturas válidas.{" "}
                <span className="font-semibold">
                  No podrás hacer compras hasta completar este dato.
                </span>
              </p>
              <p className="mt-1 text-[11px] text-amber-700">
                Art. 6.1.d RD 1619/2012 — Reglamento de facturación.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
            <p className="text-gray-600">
              Bienvenido,{" "}
              <strong className="text-gray-900">
                {user.name} {user.lastName}
              </strong>
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              NIF / NIE / CIF <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nif}
              onChange={(e) => setNif(e.target.value.toUpperCase())}
              placeholder="12345678A"
              maxLength={9}
              autoComplete="off"
              autoFocus
              required
              className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 font-mono text-sm uppercase tracking-wider transition focus:border-[#2563eb] focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Se valida automáticamente — DNI (8 dígitos + letra), NIE (X/Y/Z +
              7 dígitos + letra) o CIF empresas (letra + 7 dígitos + control).
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 612 345 678"
              maxLength={20}
              required
              className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            <CheckCircle size={16} />
            {submitting ? "Guardando..." : "Guardar y continuar"}
          </button>

          <p className="text-center text-xs text-gray-400">
            Estos datos solo se usan para generar facturas legales y nunca se
            comparten con terceros.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function CompletarDatosPage() {
  return (
    <Suspense fallback={null}>
      <CompletarDatosInner />
    </Suspense>
  );
}
