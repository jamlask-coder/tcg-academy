"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, Eye, EyeOff } from "lucide-react";

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

  if (!user) return null;

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
                    : "focus:border-[#1a3a5c]"
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
          className="rounded-xl bg-[#1a3a5c] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#15304d]"
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
                  className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 pr-10 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
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
    </div>
  );
}
