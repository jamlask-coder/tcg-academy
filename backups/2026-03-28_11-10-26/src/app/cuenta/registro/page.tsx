"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, UserPlus } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

interface FormData {
  nombre: string
  apellidos: string
  email: string
  password: string
  confirmPassword: string
  telefono: string
  calle: string
  numero: string
  piso: string
  cp: string
  ciudad: string
  provincia: string
  pais: string
  terminos: boolean
}

const INITIAL: FormData = {
  nombre: "", apellidos: "", email: "", password: "", confirmPassword: "",
  telefono: "", calle: "", numero: "", piso: "", cp: "", ciudad: "",
  provincia: "", pais: "ES", terminos: false,
}

const FIELD = (
  id: keyof FormData,
  label: string,
  type: string = "text",
  placeholder: string = "",
  required = true
) => ({ id, label, type, placeholder, required })

export default function RegistroPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<FormData>(INITIAL)
  const [showPwd, setShowPwd] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.nombre.trim()) newErrors.nombre = "El nombre es obligatorio"
    if (!form.apellidos.trim()) newErrors.apellidos = "Los apellidos son obligatorios"
    if (!form.email.includes("@")) newErrors.email = "Email invalido"
    if (form.password.length < 6) newErrors.password = "Minimo 6 caracteres"
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden"
    if (!form.calle.trim()) newErrors.calle = "La calle es obligatoria"
    if (!form.numero.trim()) newErrors.numero = "El numero es obligatorio"
    if (!form.cp.match(/^\d{5}$/)) newErrors.cp = "CP invalido (5 digitos)"
    if (!form.ciudad.trim()) newErrors.ciudad = "La ciudad es obligatoria"
    if (!form.terminos) newErrors.terminos = "Debes aceptar los terminos"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setServerError("")
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
    })
    setLoading(false)
    if (ok) {
      router.push("/cuenta")
    } else {
      setServerError(error ?? "Error al registrarse")
    }
  }

  const inputClass = (key: keyof FormData) =>
    `w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${
      errors[key] ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#1a3a5c]"
    }`

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#1a3a5c] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-[#1a3a5c]">TCG Academy</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">Es gratis y solo tarda un minuto</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal data */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Datos personales</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  FIELD("nombre", "Nombre *", "text", "Tu nombre"),
                  FIELD("apellidos", "Apellidos *", "text", "Tus apellidos"),
                  FIELD("email", "Email *", "email", "tu@email.com"),
                  FIELD("telefono", "Telefono", "tel", "+34 600 000 000", false),
                ].map(({ id, label, type, placeholder }) => (
                  <div key={id}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                    <input
                      type={type}
                      value={form[id] as string}
                      onChange={set(id)}
                      placeholder={placeholder}
                      className={inputClass(id)}
                    />
                    {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Contraseña</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {(["password", "confirmPassword"] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {key === "password" ? "Contraseña *" : "Confirmar contraseña *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={form[key]}
                        onChange={set(key)}
                        placeholder="Minimo 6 caracteres"
                        className={inputClass(key)}
                      />
                      {key === "password" && (
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                    {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping address */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Direccion de envio</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Calle *</label>
                    <input type="text" value={form.calle} onChange={set("calle")} placeholder="Nombre de la calle" className={inputClass("calle")} />
                    {errors.calle && <p className="text-xs text-red-500 mt-1">{errors.calle}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Numero *</label>
                    <input type="text" value={form.numero} onChange={set("numero")} placeholder="Nº" className={inputClass("numero")} />
                    {errors.numero && <p className="text-xs text-red-500 mt-1">{errors.numero}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Piso / Puerta</label>
                  <input type="text" value={form.piso} onChange={set("piso")} placeholder="2º B" className={inputClass("piso")} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Codigo postal *</label>
                  <input type="text" value={form.cp} onChange={set("cp")} placeholder="28001" className={inputClass("cp")} />
                  {errors.cp && <p className="text-xs text-red-500 mt-1">{errors.cp}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ciudad *</label>
                  <input type="text" value={form.ciudad} onChange={set("ciudad")} placeholder="Madrid" className={inputClass("ciudad")} />
                  {errors.ciudad && <p className="text-xs text-red-500 mt-1">{errors.ciudad}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Provincia</label>
                  <input type="text" value={form.provincia} onChange={set("provincia")} placeholder="Madrid" className={inputClass("provincia")} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pais</label>
                  <select value={form.pais} onChange={set("pais")} className={inputClass("pais")}>
                    <option value="ES">España</option>
                    <option value="PT">Portugal</option>
                    <option value="FR">Francia</option>
                    <option value="DE">Alemania</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <div
                className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition mt-0.5 ${
                  form.terminos ? "bg-[#1a3a5c] border-[#1a3a5c]" : errors.terminos ? "border-red-400" : "border-gray-300"
                }`}
                onClick={() => setForm((f) => ({ ...f, terminos: !f.terminos }))}
              >
                {form.terminos && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600">
                Acepto los{" "}
                <Link href="/legal/terminos" className="text-[#1a3a5c] hover:underline">terminos y condiciones</Link>
                {" "}y la{" "}
                <Link href="/legal/privacidad" className="text-[#1a3a5c] hover:underline">politica de privacidad</Link>
                {" "}*
              </span>
            </label>
            {errors.terminos && <p className="text-xs text-red-500 -mt-4">{errors.terminos}</p>}

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1a3a5c] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition disabled:opacity-60"
            >
              {loading ? "Creando cuenta..." : <><UserPlus size={18} /> Crear cuenta</>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link href="/cuenta/login" className="text-[#1a3a5c] font-semibold hover:underline">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
