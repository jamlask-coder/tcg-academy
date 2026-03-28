"use client"
import { useState, useCallback } from "react"
import { Ticket, Plus, X, Check, ToggleLeft, ToggleRight, Trash2, ChevronDown } from "lucide-react"
import { MOCK_ADMIN_COUPONS, type AdminCoupon } from "@/data/mockData"

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return "TCG" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

const DEFAULT_FORM: Omit<AdminCoupon, "timesUsed" | "totalSaved"> = {
  code: "",
  description: "",
  discountType: "percent",
  value: 10,
  startsAt: new Date().toISOString().split("T")[0],
  endsAt: "",
  active: true,
  applicableTo: "all",
  maxUses: 100,
  usesPerUser: 1,
}

export default function AdminCuponesPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>(MOCK_ADMIN_COUPONS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<AdminCoupon, "timesUsed" | "totalSaved">>(DEFAULT_FORM)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const toggleCoupon = useCallback((code: string) => {
    setCoupons((prev) => prev.map((c) => c.code === code ? { ...c, active: !c.active } : c))
    showToast("Estado del cupón actualizado")
  }, [])

  const deleteCoupon = useCallback((code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code))
    showToast(`Cupón ${code} eliminado`)
  }, [])

  const handleSubmit = () => {
    if (!form.code || !form.endsAt) return
    const newCoupon: AdminCoupon = { ...form, timesUsed: 0, totalSaved: 0 }
    setCoupons((prev) => [newCoupon, ...prev])
    setShowForm(false)
    setForm(DEFAULT_FORM)
    showToast(`Cupón ${form.code} creado correctamente`)
  }

  const inputCls = "w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket size={22} className="text-[#1a3a5c]" /> Gestión de cupones
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {coupons.filter(c => c.active).length} activos · {coupons.length} total
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition min-h-[44px]"
        >
          <Plus size={16} /> Nuevo cupón
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border-2 border-[#1a3a5c]/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Crear nuevo cupón</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Código *</label>
              <div className="flex gap-2">
                <input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="Ej: VERANO25" className={`${inputCls} flex-1 font-mono`} />
                <button onClick={() => setForm(f => ({ ...f, code: generateCode() }))}
                  className="h-10 px-3 text-xs font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition whitespace-nowrap">
                  Auto
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descripción *</label>
              <input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ej: Descuento verano 2025" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de descuento</label>
              <div className="flex gap-2">
                <button onClick={() => setForm(f => ({ ...f, discountType: "percent" }))}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold border-2 transition ${form.discountType === "percent" ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-600"}`}>
                  % Porcentaje
                </button>
                <button onClick={() => setForm(f => ({ ...f, discountType: "fixed" }))}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold border-2 transition ${form.discountType === "fixed" ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-600"}`}>
                  € Fijo
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Valor ({form.discountType === "percent" ? "%" : "€"}) *
              </label>
              <input type="number" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                min="0" step={form.discountType === "percent" ? "1" : "0.01"} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Válido desde</label>
              <input type="date" value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Válido hasta *</label>
              <input type="date" value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Usos máximos totales</label>
              <input type="number" value={form.maxUses} onChange={(e) => setForm(f => ({ ...f, maxUses: parseInt(e.target.value) || 1 }))}
                min="1" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Usos por usuario</label>
              <input type="number" value={form.usesPerUser} onChange={(e) => setForm(f => ({ ...f, usesPerUser: parseInt(e.target.value) || 1 }))}
                min="1" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aplicable a</label>
              <div className="relative">
                <select value={form.applicableTo} onChange={(e) => setForm(f => ({ ...f, applicableTo: e.target.value as AdminCoupon["applicableTo"] }))}
                  className={`${inputCls} appearance-none pr-8`}>
                  <option value="all">Todo el catálogo</option>
                  <option value="game">Juego específico</option>
                  <option value="category">Categoría específica</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowForm(false)}
              className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.code || !form.endsAt}
              className="flex-1 bg-[#1a3a5c] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#15304d] transition disabled:opacity-40"
            >
              <Check size={14} className="inline mr-1.5 -mt-0.5" />
              Crear cupón
            </button>
          </div>
        </div>
      )}

      {/* Coupons list */}
      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div key={coupon.code}
            className={`bg-white border rounded-2xl p-5 transition ${coupon.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono font-bold text-[#1a3a5c] text-base tracking-wider">{coupon.code}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${coupon.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {coupon.active ? "Activo" : "Inactivo"}
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                    {coupon.discountType === "percent" ? `${coupon.value}%` : `${coupon.value}€`}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">{coupon.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {coupon.startsAt} → {coupon.endsAt}
                  {" · "}{coupon.timesUsed}/{coupon.maxUses} usos
                  {" · "}{coupon.totalSaved.toFixed(2)}€ ahorrados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleCoupon(coupon.code)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {coupon.active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => deleteCoupon(coupon.code)}
                  className="p-2 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
