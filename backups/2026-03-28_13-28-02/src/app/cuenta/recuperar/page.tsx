"use client"
import { useState } from "react"
import Link from "next/link"
import { Mail, Send, CheckCircle } from "lucide-react"

export default function RecuperarPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000)) // simulate
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#1a3a5c] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-[#1a3a5c]">TCG Academy</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Te enviaremos un enlace para restablecer tu contraseña</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">Email enviado</h2>
              <p className="text-gray-500 text-sm mb-6">
                Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña.
              </p>
              <Link href="/cuenta/login" className="text-[#1a3a5c] font-semibold hover:underline text-sm">
                Volver al inicio de sesion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email de tu cuenta</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full h-11 pl-10 pr-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#1a3a5c] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition disabled:opacity-60"
              >
                {loading ? "Enviando..." : <><Send size={18} /> Enviar enlace</>}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link href="/cuenta/login" className="text-[#1a3a5c] hover:underline">
                  Volver al inicio de sesion
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
