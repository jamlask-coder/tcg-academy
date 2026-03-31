"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit } from "@/utils/sanitize";

interface FormData {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  confirmPassword: string;
  telefono: string;
  calle: string;
  numero: string;
  piso: string;
  cp: string;
  ciudad: string;
  provincia: string;
  pais: string;
  terminos: boolean;
}

const INITIAL: FormData = {
  nombre: "",
  apellidos: "",
  email: "",
  password: "",
  confirmPassword: "",
  telefono: "",
  calle: "",
  numero: "",
  piso: "",
  cp: "",
  ciudad: "",
  provincia: "",
  pais: "ES",
  terminos: false,
};

const FIELD = (
  id: keyof FormData,
  label: string,
  type: string = "text",
  placeholder: string = "",
  required = true,
) => ({ id, label, type, placeholder, required });

export default function RegistroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const set =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!form.apellidos.trim())
      newErrors.apellidos = "Los apellidos son obligatorios";
    if (!form.email.includes("@")) newErrors.email = "Email invalido";
    if (form.password.length < 6) newErrors.password = "Minimo 6 caracteres";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    if (!form.calle.trim()) newErrors.calle = "La calle es obligatoria";
    if (!form.numero.trim()) newErrors.numero = "El numero es obligatorio";
    if (!form.cp.match(/^\d{5}$/)) newErrors.cp = "CP invalido (5 digitos)";
    if (!form.ciudad.trim()) newErrors.ciudad = "La ciudad es obligatoria";
    if (!form.terminos) newErrors.terminos = "Debes aceptar los terminos";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit("registro", 5, 60_000)) {
      setServerError(
        "Demasiados intentos. Espera un minuto antes de volver a intentarlo.",
      );
      return;
    }
    if (!validate()) return;
    setLoading(true);
    setServerError("");
    const { ok, error } = await register({
      email: form.email,
      password: form.password,
      name: form.nombre,
      lastName: form.apellidos,
      phone: form.telefono,
      address: {
        nombre: form.nombre,
        apellidos: form.apellidos,
        calle: form.calle,
        numero: form.numero,
        piso: form.piso,
        cp: form.cp,
        ciudad: form.ciudad,
        provincia: form.provincia,
        pais: form.pais,
      },
    });
    setLoading(false);
    if (ok) {
      router.push("/cuenta");
    } else {
      setServerError(error ?? "Error al registrarse");
    }
  };

  const inputClass = (key: keyof FormData) =>
    `w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${
      errors[key]
        ? "border-red-400 focus:border-red-500"
        : "border-gray-200 focus:border-[#1a3a5c]"
    }`;

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3a5c]">
              <span className="font-bold text-white">T</span>
            </div>
            <span className="text-xl font-bold text-[#1a3a5c]">
              TCG Academy
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="mt-1 text-sm text-gray-500">
            Es gratis y solo tarda un minuto
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal data */}
            <div>
              <h2 className="mb-4 text-sm font-bold tracking-wider text-gray-400 uppercase">
                Datos personales
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  FIELD("nombre", "Nombre *", "text", "Tu nombre"),
                  FIELD("apellidos", "Apellidos *", "text", "Tus apellidos"),
                  FIELD("email", "Email *", "email", "tu@email.com"),
                  FIELD(
                    "telefono",
                    "Telefono",
                    "tel",
                    "+34 600 000 000",
                    false,
                  ),
                ].map(({ id, label, type, placeholder }) => (
                  <div key={id}>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={form[id] as string}
                      onChange={set(id)}
                      placeholder={placeholder}
                      maxLength={
                        type === "email" ? 254 : type === "tel" ? 20 : 100
                      }
                      className={inputClass(id)}
                    />
                    {errors[id] && (
                      <p className="mt-1 text-xs text-red-500">{errors[id]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <h2 className="mb-4 text-sm font-bold tracking-wider text-gray-400 uppercase">
                Contraseña
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["password", "confirmPassword"] as const).map((key) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {key === "password"
                        ? "Contraseña *"
                        : "Confirmar contraseña *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={form[key]}
                        onChange={set(key)}
                        placeholder="Minimo 6 caracteres"
                        maxLength={128}
                        className={inputClass(key)}
                      />
                      {key === "password" && (
                        <button
                          type="button"
                          onClick={() => setShowPwd(!showPwd)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
                        >
                          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                    {errors[key] && (
                      <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping address */}
            <div>
              <h2 className="mb-4 text-sm font-bold tracking-wider text-gray-400 uppercase">
                Direccion de envio
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid grid-cols-3 gap-4 sm:col-span-2">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Calle *
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={form.calle}
                      onChange={set("calle")}
                      placeholder="Nombre de la calle"
                      className={inputClass("calle")}
                    />
                    {errors.calle && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.calle}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Numero *
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={form.numero}
                      onChange={set("numero")}
                      placeholder="Nº"
                      className={inputClass("numero")}
                    />
                    {errors.numero && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.numero}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Piso / Puerta
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={form.piso}
                    onChange={set("piso")}
                    placeholder="2º B"
                    className={inputClass("piso")}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Codigo postal *
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={form.cp}
                    onChange={set("cp")}
                    placeholder="28001"
                    className={inputClass("cp")}
                  />
                  {errors.cp && (
                    <p className="mt-1 text-xs text-red-500">{errors.cp}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.ciudad}
                    onChange={set("ciudad")}
                    placeholder="Madrid"
                    className={inputClass("ciudad")}
                  />
                  {errors.ciudad && (
                    <p className="mt-1 text-xs text-red-500">{errors.ciudad}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Provincia
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.provincia}
                    onChange={set("provincia")}
                    placeholder="Madrid"
                    className={inputClass("provincia")}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Pais
                  </label>
                  <select
                    value={form.pais}
                    onChange={set("pais")}
                    className={inputClass("pais")}
                  >
                    <option value="ES">España</option>
                    <option value="PT">Portugal</option>
                    <option value="FR">Francia</option>
                    <option value="DE">Alemania</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-2.5 select-none">
              <div
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                  form.terminos
                    ? "border-[#1a3a5c] bg-[#1a3a5c]"
                    : errors.terminos
                      ? "border-red-400"
                      : "border-gray-300"
                }`}
                onClick={() =>
                  setForm((f) => ({ ...f, terminos: !f.terminos }))
                }
              >
                {form.terminos && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600">
                Acepto los{" "}
                <Link
                  href="/contacto"
                  className="text-[#1a3a5c] hover:underline"
                >
                  terminos y condiciones
                </Link>{" "}
                y la{" "}
                <Link
                  href="/contacto"
                  className="text-[#1a3a5c] hover:underline"
                >
                  politica de privacidad
                </Link>{" "}
                *
              </span>
            </label>
            {errors.terminos && (
              <p className="-mt-4 text-xs text-red-500">{errors.terminos}</p>
            )}

            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1a3a5c] font-bold text-white transition hover:bg-[#15304d] disabled:opacity-60"
            >
              {loading ? (
                "Creando cuenta..."
              ) : (
                <>
                  <UserPlus size={18} /> Crear cuenta
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/cuenta/login"
              className="font-semibold text-[#1a3a5c] hover:underline"
            >
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
