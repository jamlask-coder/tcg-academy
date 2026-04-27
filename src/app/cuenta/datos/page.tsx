"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, Eye, EyeOff, MapPin, Plus, Pencil, Trash2, Star, AlertCircle } from "lucide-react";
import type { Address } from "@/types/user";
import { AccountTabs } from "@/components/cuenta/AccountTabs";
import { validateSpanishNIF } from "@/lib/validations/nif";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import {
  validatePasswordForRole,
  describePasswordRequirements,
} from "@/lib/passwordPolicy";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-()+]{6,20}$/;

const ADDR_EMPTY: Partial<Address> = {
  label: "",
  calle: "",
  numero: "",
  piso: "",
  cp: "",
  ciudad: "",
  provincia: "",
  pais: "ES",
};

export default function DatosPage() {
  const { user, updateProfile, changePassword, changeEmail } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    nif: user?.nif ?? "",
    email: user?.email ?? "",
  });
  // Errores por campo del formulario de perfil (name/lastName/nif/phone/email).
  // Mismo hook que registro y completar-datos → un único contrato visual.
  const profileErrors = useFieldErrors();
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Address management
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses ?? []);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editAddrId, setEditAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState<Partial<Address>>(ADDR_EMPTY);
  const addrErrors = useFieldErrors();
  const [addrSaved, setAddrSaved] = useState(false);

  if (!user) return null;

  const setAddr =
    (key: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddrForm((f) => ({ ...f, [key]: e.target.value }));

  /** Persist addresses to AuthContext + localStorage and sync local state */
  const persistAddresses = (next: Address[]) => {
    setAddresses(next);
    updateProfile({ addresses: next });
    setAddrSaved(true);
    setTimeout(() => setAddrSaved(false), 2500);
  };

  const handleSaveAddr = () => {
    addrErrors.clearAll();
    // Validación mínima: campos obligatorios para que la dirección sea usable en checkout.
    // Recorremos en orden — el primer hueco marca el campo a resaltar en rojo.
    const required: Array<keyof Address> = [
      "label",
      "calle",
      "numero",
      "cp",
      "ciudad",
      "provincia",
    ];
    for (const k of required) {
      if (!(addrForm[k] as string | undefined)?.toString().trim()) {
        addrErrors.failWith(k, "Rellena todos los campos obligatorios");
        return;
      }
    }
    // Validación básica de código postal español (5 dígitos) si país = ES
    if (
      (addrForm.pais ?? "ES") === "ES" &&
      !/^\d{5}$/.test((addrForm.cp ?? "").trim())
    ) {
      addrErrors.failWith("cp", "El código postal debe tener 5 dígitos");
      return;
    }

    let next: Address[];
    if (editAddrId) {
      next = addresses.map((a) =>
        a.id === editAddrId ? ({ ...a, ...addrForm } as Address) : a,
      );
    } else {
      const newAddr: Address = {
        id: `addr-${crypto.randomUUID()}`,
        predeterminada: addresses.length === 0,
        ...addrForm,
      } as Address;
      next = [...addresses, newAddr];
    }
    persistAddresses(next);
    setShowAddrForm(false);
    setEditAddrId(null);
    setAddrForm(ADDR_EMPTY);
  };

  const handleDeleteAddr = (id: string) => {
    const wasDefault = addresses.find((a) => a.id === id)?.predeterminada;
    let next = addresses.filter((a) => a.id !== id);
    // Si eliminamos la predeterminada y quedan otras, la primera pasa a serlo
    if (wasDefault && next.length > 0) {
      next = next.map((a, i) => ({ ...a, predeterminada: i === 0 }));
    }
    persistAddresses(next);
  };

  const handleSetDefaultAddr = (id: string) => {
    const next = addresses.map((a) => ({
      ...a,
      predeterminada: a.id === id,
    }));
    persistAddresses(next);
  };

  const handleEditAddr = (addr: Address) => {
    setAddrForm(addr);
    setEditAddrId(addr.id);
    setShowAddrForm(true);
    addrErrors.clearAll();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    profileErrors.clearAll();
    if (!form.name.trim()) {
      profileErrors.failWith("name", "El nombre es obligatorio.");
      return;
    }
    if (!form.lastName.trim()) {
      profileErrors.failWith("lastName", "Los apellidos son obligatorios.");
      return;
    }
    // NIF obligatorio y validado (Art. 6.1.d RD 1619/2012)
    const nifResult = validateSpanishNIF(form.nif);
    if (!nifResult.valid) {
      profileErrors.failWith("nif", nifResult.error ?? "NIF inválido");
      return;
    }
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
      profileErrors.failWith(
        "phone",
        "Teléfono: solo dígitos, espacios, + y -().",
      );
      return;
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      profileErrors.failWith("email", "Email inválido.");
      return;
    }

    setSavingProfile(true);

    // Si el email ha cambiado, procesarlo primero (puede fallar por colisión)
    const nextEmail = form.email.trim().toLowerCase();
    if (nextEmail !== user.email.toLowerCase()) {
      const { ok, error } = await changeEmail(nextEmail);
      if (!ok) {
        profileErrors.failWith("email", error ?? "No se pudo cambiar el email");
        setSavingProfile(false);
        return;
      }
    }

    const profileResult = updateProfile({
      name: form.name,
      lastName: form.lastName,
      phone: form.phone,
      nif: nifResult.normalized,
      nifType: nifResult.type === "OTHER" ? undefined : nifResult.type,
    });
    if (!profileResult.ok) {
      profileErrors.failWith(
        "nif",
        profileResult.error ?? "No se pudo guardar",
      );
      setSavingProfile(false);
      return;
    }
    setSavingProfile(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      <AccountTabs group="perfil" />

      {/* Profile form */}
      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <h2 className="font-bold text-gray-900">Información personal</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Nombre", form.name],
              ["lastName", "Apellidos", form.lastName],
              ["nif", "NIF / NIE / CIF", form.nif],
              ["phone", "Teléfono", form.phone],
              ["email", "Email", form.email],
            ] as const
          ).map(([key, label, value]) => {
            const isNif = key === "nif";
            const isEmail = key === "email";
            const isPhone = key === "phone";
            // Validación on-blur por campo: feedback visual en cuanto el
            // usuario pasa a otro input, no solo al enviar.
            const onBlur = () => {
              const v = value.trim();
              if (!v) return; // requireds se validan en submit
              if (isNif) {
                const r = validateSpanishNIF(v);
                if (!r.valid) {
                  profileErrors.failWith(
                    "nif",
                    r.error ?? "NIF / NIE / CIF inválido",
                  );
                }
                return;
              }
              if (isEmail && !EMAIL_REGEX.test(v)) {
                profileErrors.failWith("email", "Email inválido.");
                return;
              }
              if (isPhone && !PHONE_REGEX.test(v)) {
                profileErrors.failWith(
                  "phone",
                  "Teléfono: solo dígitos, espacios, + y -().",
                );
                return;
              }
            };
            return (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                {label}
              </label>
              <input
                type={isEmail ? "email" : "text"}
                value={value}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [key]: isNif
                      ? e.target.value.toUpperCase()
                      : e.target.value,
                  }))
                }
                onFocus={() => profileErrors.clearIfCurrent(key)}
                onBlur={onBlur}
                aria-invalid={profileErrors.isFieldInvalid(key)}
                maxLength={isNif ? 9 : isEmail ? 254 : undefined}
                autoComplete={isNif ? "off" : isEmail ? "email" : undefined}
                className={profileErrors.fieldCls(
                  key,
                  `h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${
                    isNif ? "font-mono uppercase tracking-wider" : ""
                  }`,
                )}
              />
              {isEmail && (
                <p className="mt-1 text-xs text-gray-500">
                  Se usa para iniciar sesión y recibir notificaciones.
                </p>
              )}
              {isNif && (
                <p className="mt-1 text-xs text-gray-500">
                  DNI, NIE o CIF. Se valida con letra de control.
                </p>
              )}
            </div>
            );
          })}
        </div>

        {profileErrors.error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" /> {profileErrors.error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
            <CheckCircle size={16} /> Cambios guardados correctamente
          </div>
        )}

        <button
          type="submit"
          disabled={savingProfile}
          className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {savingProfile ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      {/* Password form */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPwdError("");
          setPwdSuccess(false);

          // Política según rol del usuario actual:
          // admin → ≥12 chars con mayúscula, minúscula, dígito y especial.
          // resto → ≥6 chars sin más reglas.
          const pwdCheck = validatePasswordForRole(pwdForm.next, user?.role);
          if (!pwdCheck.ok) {
            setPwdError(pwdCheck.error ?? "Contraseña no válida");
            return;
          }
          if (pwdForm.next !== pwdForm.confirm) {
            setPwdError("Las contraseñas no coinciden");
            return;
          }
          if (pwdForm.current === pwdForm.next) {
            setPwdError("La nueva contraseña debe ser diferente a la actual");
            return;
          }

          setPwdLoading(true);
          const { ok, error } = await changePassword(pwdForm.current, pwdForm.next);
          setPwdLoading(false);

          if (ok) {
            setPwdSuccess(true);
            setPwdForm({ current: "", next: "", confirm: "" });
            setTimeout(() => setPwdSuccess(false), 4000);
          } else {
            setPwdError(error ?? "Error al cambiar la contraseña");
          }
        }}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <h2 className="font-bold text-gray-900">Cambiar contraseña</h2>
        <div className="max-w-sm space-y-4">
          {(["current", "next", "confirm"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                {key === "current"
                  ? "Contraseña actual"
                  : key === "next"
                    ? "Nueva contraseña"
                    : "Confirmar nueva contraseña"}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwdForm[key]}
                  onChange={(e) =>
                    setPwdForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  placeholder={key === "next" ? describePasswordRequirements(user?.role) : "••••••••"}
                  maxLength={128}
                  className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 pr-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                />
                {key === "current" && (
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {pwdError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" /> {pwdError}
          </div>
        )}
        {pwdSuccess && (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
            <CheckCircle size={16} /> Contraseña actualizada correctamente
          </div>
        )}

        <button
          type="submit"
          disabled={pwdLoading}
          className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {pwdLoading ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>

      {/* Addresses */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Mis direcciones</h2>
            <p className="mt-0.5 text-sm text-gray-500">Gestiona tus direcciones de envío</p>
          </div>
          <button
            onClick={() => { setShowAddrForm(true); setEditAddrId(null); setAddrForm(ADDR_EMPTY); }}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <Plus size={15} /> Añadir
          </button>
        </div>

        {addresses.length === 0 && !showAddrForm && (
          <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
            <MapPin size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="mb-1 text-sm font-semibold text-gray-600">No tienes direcciones guardadas</p>
            <button
              onClick={() => setShowAddrForm(true)}
              className="mt-3 text-sm font-semibold text-[#2563eb] hover:underline"
            >
              + Añadir primera dirección
            </button>
          </div>
        )}

        {addresses.length > 0 && (
          <div className="mb-6 space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`rounded-xl border-2 p-4 ${addr.predeterminada ? "border-[#2563eb]" : "border-gray-200"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{addr.label}</span>
                      {addr.predeterminada && (
                        <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                          <Star size={9} className="fill-[#2563eb]" /> Predeterminada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{(addr.nombre || user.name)} {(addr.apellidos || user.lastName)}</p>
                    <p className="text-sm text-gray-600">{addr.calle} {addr.numero}{addr.piso ? `, ${addr.piso}` : ""}</p>
                    <p className="text-sm text-gray-600">{addr.cp} {addr.ciudad}, {addr.provincia}</p>
                    <p className="text-sm text-gray-500">{addr.pais}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-2">
                    <button onClick={() => handleEditAddr(addr)} className="flex items-center gap-1.5 text-xs text-gray-600 transition hover:text-[#2563eb]">
                      <Pencil size={12} /> Editar
                    </button>
                    {!addr.predeterminada && (
                      <button onClick={() => handleSetDefaultAddr(addr.id)} className="flex items-center gap-1.5 text-xs text-gray-600 transition hover:text-[#2563eb]">
                        <Star size={12} /> Predeterminar
                      </button>
                    )}
                    <button onClick={() => handleDeleteAddr(addr.id)} className="flex items-center gap-1.5 text-xs text-red-400 transition hover:text-red-600">
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddrForm && (
          <div className="border-t border-gray-100 pt-6">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              {editAddrId ? "Editar dirección" : "Nueva dirección"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["label", "Etiqueta", "text", "ej: Casa"],
                [null, null, null, null],
                ["calle", "Calle", "text", ""],
                ["numero", "Número", "text", ""],
                ["piso", "Piso / Puerta (opcional)", "text", ""],
                ["cp", "Código postal", "text", ""],
                ["ciudad", "Ciudad", "text", ""],
                ["provincia", "Provincia", "text", ""],
                ["pais", "País", "select", ""],
              ] as [keyof Address | null, string | null, string | null, string | null][]).map(([key, label, type, placeholder], i) => {
                if (!key) return <div key={i} />;
                return (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
                    {type === "select" && key === "pais" ? (
                      <select value={addrForm.pais ?? "ES"} onChange={setAddr("pais")} className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none">
                        <option value="ES">España</option>
                        <option value="PT">Portugal</option>
                        <option value="FR">Francia</option>
                        <option value="DE">Alemania</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={(addrForm[key] as string) ?? ""}
                        onChange={setAddr(key)}
                        onFocus={() => addrErrors.clearIfCurrent(key)}
                        onBlur={() => {
                          // Validación on-blur: CP español (5 dígitos).
                          // El resto de required se comprueba en submit.
                          if (key === "cp") {
                            const v = ((addrForm.cp as string) ?? "").trim();
                            if (!v) return;
                            if (
                              (addrForm.pais ?? "ES") === "ES" &&
                              !/^\d{5}$/.test(v)
                            ) {
                              addrErrors.failWith(
                                "cp",
                                "El código postal debe tener 5 dígitos",
                              );
                            }
                          }
                        }}
                        aria-invalid={addrErrors.isFieldInvalid(key)}
                        placeholder={placeholder ?? ""}
                        maxLength={key === "label" ? 30 : undefined}
                        className={addrErrors.fieldCls(
                          key,
                          "h-10 w-full rounded-xl border-2 px-3 text-sm focus:outline-none transition",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {addrErrors.error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" /> {addrErrors.error}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleSaveAddr}
                className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Guardar dirección
              </button>
              <button
                onClick={() => {
                  setShowAddrForm(false);
                  setEditAddrId(null);
                  addrErrors.clearAll();
                }}
                className="rounded-xl border-2 border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {addrSaved && (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-green-600">
            <CheckCircle size={16} /> Direcciones actualizadas
          </div>
        )}
      </div>
    </div>
  );
}
