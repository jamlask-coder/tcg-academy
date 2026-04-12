"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, Eye, EyeOff, MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import type { Address } from "@/types/user";

const ADDR_EMPTY: Partial<Address> = {
  label: "Casa",
  nombre: "",
  apellidos: "",
  calle: "",
  numero: "",
  piso: "",
  cp: "",
  ciudad: "",
  provincia: "",
  pais: "ES",
};

export default function DatosPage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  });
  const [pwdForm, setPwdForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [saved, setSaved] = useState(false);

  // Address management
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses ?? []);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editAddrId, setEditAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState<Partial<Address>>(ADDR_EMPTY);

  if (!user) return null;

  const setAddr =
    (key: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddrForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSaveAddr = () => {
    if (editAddrId) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editAddrId ? ({ ...a, ...addrForm } as Address) : a)),
      );
    } else {
      const newAddr: Address = {
        id: `addr-${Date.now()}`,
        predeterminada: addresses.length === 0,
        ...addrForm,
      } as Address;
      setAddresses((prev) => [...prev, newAddr]);
    }
    setShowAddrForm(false);
    setEditAddrId(null);
    setAddrForm(ADDR_EMPTY);
  };

  const handleDeleteAddr = (id: string) =>
    setAddresses((prev) => prev.filter((a) => a.id !== id));

  const handleSetDefaultAddr = (id: string) =>
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, predeterminada: a.id === id })),
    );

  const handleEditAddr = (addr: Address) => {
    setAddrForm(addr);
    setEditAddrId(addr.id);
    setShowAddrForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Mis datos personales
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Actualiza tu perfil y contraseña
        </p>
      </div>

      {/* Profile form */}
      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <h2 className="font-bold text-gray-900">Informacion personal</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Nombre", form.name],
              ["lastName", "Apellidos", form.lastName],
              ["phone", "Telefono", form.phone],
              ["email", "Email", user.email],
            ] as const
          ).map(([key, label, value]) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                {label}
              </label>
              <input
                type={key === "email" ? "email" : "text"}
                value={value}
                onChange={
                  key !== "email"
                    ? (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
                    : undefined
                }
                readOnly={key === "email"}
                className={`h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:outline-none ${
                  key === "email"
                    ? "cursor-not-allowed bg-gray-50 text-gray-400"
                    : "focus:border-[#2563eb]"
                }`}
              />
              {key === "email" && (
                <p className="mt-1 text-xs text-gray-400">
                  El email no se puede cambiar
                </p>
              )}
            </div>
          ))}
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
            <CheckCircle size={16} /> Cambios guardados correctamente
          </div>
        )}

        <button
          type="submit"
          className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          Guardar cambios
        </button>
      </form>

      {/* Password form */}
      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
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
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 pr-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
                />
                {key === "current" && (
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-600">
          El cambio de contraseña estara disponible cuando se conecte con el
          backend de autenticacion.
        </div>
      </div>

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
                    <p className="text-sm text-gray-700">{addr.nombre} {addr.apellidos}</p>
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
                ["label", "Etiqueta", "select"],
                [null, null, null],
                ["nombre", "Nombre", "text"],
                ["apellidos", "Apellidos", "text"],
                ["calle", "Calle", "text"],
                ["numero", "Número", "text"],
                ["piso", "Piso / Puerta (opcional)", "text"],
                ["cp", "Código postal", "text"],
                ["ciudad", "Ciudad", "text"],
                ["provincia", "Provincia", "text"],
                ["pais", "País", "select"],
              ] as [keyof Address | null, string | null, string | null][]).map(([key, label, type], i) => {
                if (!key) return <div key={i} />;
                return (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
                    {type === "select" && key === "label" ? (
                      <select value={addrForm.label ?? "Casa"} onChange={setAddr("label")} className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none">
                        <option>Casa</option><option>Trabajo</option><option>Otra</option>
                      </select>
                    ) : type === "select" && key === "pais" ? (
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
                        className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none transition"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleSaveAddr}
                className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Guardar dirección
              </button>
              <button
                onClick={() => { setShowAddrForm(false); setEditAddrId(null); }}
                className="rounded-xl border-2 border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
