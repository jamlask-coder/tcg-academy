"use client";

/**
 * Onboarding forzoso — completar datos fiscales obligatorios.
 *
 * Se muestra después de login (incluido Google OAuth) si el usuario no tiene
 * todos los datos legalmente obligatorios para factura: NIF válido, teléfono
 * y una dirección fiscal completa. No permite salir sin rellenar.
 *
 * Cumplimiento:
 *  - Art. 6.1.d RD 1619/2012 — NIF del destinatario
 *  - Art. 6.1.e RD 1619/2012 — Domicilio fiscal del destinatario
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { validateSpanishNIF } from "@/lib/validations/nif";
import {
  isFiscalProfileComplete,
  FISCAL_FIELD_LABELS,
} from "@/lib/validations/profileComplete";
import type { Address } from "@/types/user";
import { AlertCircle, ShieldCheck, CheckCircle } from "lucide-react";
import { PhonePrefixPicker } from "@/components/ui/PhonePrefixPicker";
import {
  COUNTRY_OPTIONS,
  findCountryOption,
} from "@/data/countryPrefixes";
import { useFieldErrors } from "@/hooks/useFieldErrors";

/**
 * Separa un `User.phone` guardado como "+34 600 000 000" en (código país,
 * resto). Usado para pre-rellenar el picker si el usuario ya tenía teléfono.
 * Fallback: ES + el string completo en el input nacional.
 */
function splitStoredPhone(raw: string): { code: string; rest: string } {
  if (!raw) return { code: "ES", rest: "" };
  const trimmed = raw.trim();
  // COUNTRY_OPTIONS ordenado con dialCodes más largos primero para evitar
  // que "+3" coincida antes que "+34".
  const sorted = [...COUNTRY_OPTIONS]
    .filter((c) => c.code !== "OTRO")
    .sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (trimmed.startsWith(c.dialCode)) {
      return { code: c.code, rest: trimmed.slice(c.dialCode.length).trim() };
    }
  }
  return { code: "ES", rest: trimmed };
}

function CompletarDatosInner() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") ?? "/cuenta";

  // Estado local inicial: pre-rellenar con lo que ya tenga el usuario (por si
  // entra porque le falta solo 1 campo concreto).
  const existingAddr =
    user?.addresses?.find((a) => a.predeterminada) ?? user?.addresses?.[0] ?? null;

  const [nif, setNif] = useState(user?.nif ?? "");
  // Teléfono en 2 piezas — mismo patrón que /registro: picker con bandera +
  // prefijo (SSOT `countryPrefixes.ts`) e input con la parte nacional. Al
  // enviar se concatenan → `User.phone = "+34 600 000 000"`.
  const initialPhoneSplit = splitStoredPhone(user?.phone ?? "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    initialPhoneSplit.code,
  );
  const [phone, setPhone] = useState(initialPhoneSplit.rest);
  const [calle, setCalle] = useState(existingAddr?.calle ?? "");
  const [numero, setNumero] = useState(existingAddr?.numero ?? "");
  const [piso, setPiso] = useState(existingAddr?.piso ?? "");
  const [cp, setCp] = useState(existingAddr?.cp ?? "");
  const [ciudad, setCiudad] = useState(existingAddr?.ciudad ?? "");
  const [provincia, setProvincia] = useState(existingAddr?.provincia ?? "");
  const [pais, setPais] = useState(existingAddr?.pais ?? "España");
  const [submitting, setSubmitting] = useState(false);

  // Errores por campo + clases rojas al vuelo. Mismo hook en toda la web
  // (registro, cuenta/datos, finalizar-compra) → un solo contrato de estilos.
  const { error, errorField, failWith, clearIfCurrent, clearAll, fieldCls } =
    useFieldErrors();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    // Si el usuario llega aquí con el perfil ya completo (p. ej. volviendo
    // atrás en el navegador tras completar), redirigimos al destino.
    if (isFiscalProfileComplete(user).ok) {
      router.replace(returnTo);
    }
    // Solo se evalúa una vez al montar — los cambios locales del form no
    // deben redirigir hasta submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  // Estado de completitud al entrar — usado solo para mostrar "Te faltan: X".
  // El gating real (useEffect arriba) decide si redirigir o no; este preCheck
  // alimenta el mensaje informativo del header.
  const preCheck = isFiscalProfileComplete(user);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();

    // ── NIF ──
    const nifResult = validateSpanishNIF(nif);
    if (!nifResult.valid) {
      failWith("nif", nifResult.error ?? "NIF / NIE / CIF inválido");
      return;
    }

    // ── Teléfono ── (mismas reglas que /registro: dígitos, espacios, -())
    const phoneRaw = phone.trim();
    if (!phoneRaw || phoneRaw.length < 6) {
      failWith("phone", "El teléfono debe tener al menos 6 caracteres.");
      return;
    }
    if (!/^[\d\s\-()]{6,20}$/.test(phoneRaw)) {
      failWith("phone", "Teléfono: solo dígitos, espacios y los símbolos -().");
      return;
    }
    const dial = findCountryOption(phoneCountryCode).dialCode;
    const composedPhone = `${dial} ${phoneRaw}`.trim();

    // ── Dirección fiscal (5 campos postales obligatorios + número) ──
    // [key interno, label visible, valor]. El key alimenta el highlight.
    const fields: Array<[string, string, string]> = [
      ["calle", "calle", calle],
      ["numero", "número", numero],
      ["cp", "código postal", cp],
      ["ciudad", "ciudad", ciudad],
      ["provincia", "provincia", provincia],
      ["pais", "país", pais],
    ];
    for (const [key, label, value] of fields) {
      if (!value.trim()) {
        failWith(key, `Falta el campo: ${label}.`);
        return;
      }
    }
    if (!/^\d{5}$/.test(cp.trim())) {
      failWith("cp", "El código postal debe tener 5 dígitos.");
      return;
    }

    setSubmitting(true);

    // Construimos la dirección manteniendo las existentes (si las hay) y
    // marcando la nueva como predeterminada. Si ya había una predeterminada
    // se reemplaza — el usuario está aquí porque algún campo estaba mal.
    const newAddress: Address = {
      id: existingAddr?.id ?? `addr_${Date.now()}`,
      label: existingAddr?.label ?? "Principal",
      calle: calle.trim(),
      numero: numero.trim(),
      piso: piso.trim() || undefined,
      cp: cp.trim(),
      ciudad: ciudad.trim(),
      provincia: provincia.trim(),
      pais: pais.trim(),
      telefono: composedPhone,
      predeterminada: true,
    };
    const otherAddresses = (user.addresses ?? []).filter(
      (a) => a.id !== newAddress.id,
    ).map((a) => ({ ...a, predeterminada: false }));

    const saveResult = updateProfile({
      nif: nifResult.normalized,
      nifType: nifResult.type === "OTHER" ? undefined : nifResult.type,
      phone: composedPhone,
      addresses: [newAddress, ...otherAddresses],
    });
    if (!saveResult.ok) {
      // Error devuelto por el servicio de guardado. No sabemos qué campo lo
      // provocó (la mayoría de mensajes de updateProfile suelen ser sobre NIF
      // duplicado → apuntamos al NIF como mejor heurística).
      failWith("nif", saveResult.error ?? "No se pudo guardar");
      setSubmitting(false);
      return;
    }
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
                Por ley, necesitamos tu NIF/NIE/CIF y tu domicilio fiscal para
                poder emitirte facturas válidas.{" "}
                <span className="font-semibold">
                  No podrás finalizar compras hasta completar estos datos.
                </span>
              </p>
              <p className="mt-1 text-[11px] text-amber-700">
                Art. 6.1.d y 6.1.e RD 1619/2012 — Reglamento de facturación.
              </p>
              {preCheck.missing.length > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Te faltan:{" "}
                  <strong>
                    {preCheck.missing
                      .map((f) => FISCAL_FIELD_LABELS[f])
                      .join(", ")}
                  </strong>
                </p>
              )}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                NIF / NIE / CIF <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value.toUpperCase())}
                onFocus={() => clearIfCurrent("nif")}
                onBlur={() => {
                  // Validación instantánea al salir del campo. Si está vacío
                  // no marcamos error (el usuario puede estar solo haciendo
                  // tab rápido) — el submit ya valida required.
                  const v = nif.trim();
                  if (!v) return;
                  const r = validateSpanishNIF(v);
                  if (!r.valid) {
                    failWith("nif", r.error ?? "NIF / NIE / CIF inválido");
                  }
                }}
                placeholder="12345678A"
                maxLength={9}
                autoComplete="off"
                autoFocus
                required
                aria-invalid={errorField === "nif"}
                className={fieldCls(
                  "nif",
                  "h-11 w-full rounded-xl border-2 px-4 font-mono text-sm uppercase tracking-wider transition focus:outline-none",
                )}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <PhonePrefixPicker
                  value={phoneCountryCode}
                  onChange={setPhoneCountryCode}
                  disabled={submitting}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => clearIfCurrent("phone")}
                  onBlur={() => {
                    // Mismas reglas que /registro: dígitos, espacios y -()
                    const v = phone.trim();
                    if (!v) return;
                    if (v.length < 6) {
                      failWith("phone", "El teléfono debe tener al menos 6 caracteres.");
                      return;
                    }
                    if (!/^[\d\s\-()]{6,20}$/.test(v)) {
                      failWith("phone", "Teléfono: solo dígitos, espacios y los símbolos -().");
                    }
                  }}
                  placeholder="600 000 000"
                  maxLength={20}
                  autoComplete="tel-national"
                  required
                  aria-invalid={errorField === "phone"}
                  className={fieldCls(
                    "phone",
                    "h-11 w-full rounded-r-xl border-2 border-l-0 px-4 text-sm transition focus:outline-none",
                  )}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h2 className="mb-3 text-sm font-bold text-gray-900">
              Domicilio fiscal <span className="text-red-500">*</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px_120px]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Calle
                </label>
                <input
                  type="text"
                  value={calle}
                  onChange={(e) => setCalle(e.target.value)}
                  placeholder="Gran Vía"
                  required
                  aria-invalid={errorField === "calle"}
                  className={fieldCls(
                    "calle",
                    "h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none",
                  )}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Número
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="10"
                  required
                  aria-invalid={errorField === "numero"}
                  className={fieldCls(
                    "numero",
                    "h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none",
                  )}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Piso/Puerta
                </label>
                <input
                  type="text"
                  value={piso}
                  onChange={(e) => setPiso(e.target.value)}
                  placeholder="3ºB"
                  className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[130px_1fr_1fr]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  CP
                </label>
                <input
                  type="text"
                  value={cp}
                  onChange={(e) =>
                    setCp(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  onFocus={() => clearIfCurrent("cp")}
                  onBlur={() => {
                    const v = cp.trim();
                    if (!v) return;
                    if (!/^\d{5}$/.test(v)) {
                      failWith("cp", "El código postal debe tener 5 dígitos.");
                    }
                  }}
                  placeholder="28013"
                  maxLength={5}
                  inputMode="numeric"
                  required
                  aria-invalid={errorField === "cp"}
                  className={fieldCls(
                    "cp",
                    "h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none",
                  )}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Madrid"
                  required
                  aria-invalid={errorField === "ciudad"}
                  className={fieldCls(
                    "ciudad",
                    "h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none",
                  )}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Provincia
                </label>
                <input
                  type="text"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  placeholder="Madrid"
                  required
                  aria-invalid={errorField === "provincia"}
                  className={fieldCls(
                    "provincia",
                    "h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none",
                  )}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                País
              </label>
              <input
                type="text"
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                placeholder="España"
                required
                aria-invalid={errorField === "pais"}
                className={fieldCls(
                  "pais",
                  "h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none",
                )}
              />
            </div>
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
