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
        <p className="text-gray-500 text-sm mt-1">
          Actualiza tu perfil y contraseña
        </p>
      </div>

      {/* Profile form */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5"
      >
        <h2 className="font-bold text-gray-900">Informacion personal</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {(
            [
              ["name", "Nombre", form.name],
              ["lastName", "Apellidos", form.lastName],
              ["phone", "Telefono", form.phone],
              ["email", "Email", user.email],
            ] as const
          ).map(([key, label, value]) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                className={`w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none transition ${
                  key === "email"
                    ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                    : "focus:border-[#1a3a5c]"
                }`}
              />
              {key === "email" && (
                <p className="text-xs text-gray-400 mt-1">
                  El email no se puede cambiar
                </p>
              )}
            </div>
          ))}
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
            <CheckCircle size={16} /> Cambios guardados correctamente
          </div>
        )}

        <button
          type="submit"
          className="bg-[#1a3a5c] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition"
        >
          Guardar cambios
        </button>
      </form>

      {/* Password form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h2 className="font-bold text-gray-900">Cambiar contraseña</h2>
        <div className="space-y-4 max-w-sm">
          {(["current", "next", "confirm"] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                  className="w-full h-11 px-4 pr-10 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
                />
                {key === "current" && (
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 border border-blue-100 text-blue-600 text-xs rounded-xl px-4 py-3">
          El cambio de contraseña estara disponible cuando se conecte con el
          backend de autenticacion.
        </div>
      </div>
    </div>
  );
}
