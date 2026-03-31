"use client";
import { useState, useCallback } from "react";
import {
  Ticket,
  Plus,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { MOCK_ADMIN_COUPONS, type AdminCoupon } from "@/data/mockData";

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return (
    "TCG" +
    Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("")
  );
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
};

export default function AdminCuponesPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>(MOCK_ADMIN_COUPONS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] =
    useState<Omit<AdminCoupon, "timesUsed" | "totalSaved">>(DEFAULT_FORM);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleCoupon = useCallback((code: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, active: !c.active } : c)),
    );
    showToast("Estado del cupón actualizado");
  }, []);

  const deleteCoupon = useCallback((code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
    showToast(`Cupón ${code} eliminado`);
  }, []);

  const handleSubmit = () => {
    if (!form.code || !form.endsAt) return;
    const newCoupon: AdminCoupon = { ...form, timesUsed: 0, totalSaved: 0 };
    setCoupons((prev) => [newCoupon, ...prev]);
    setShowForm(false);
    setForm(DEFAULT_FORM);
    showToast(`Cupón ${form.code} creado correctamente`);
  };

  const inputCls =
    "w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] transition";

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Ticket size={22} className="text-[#2563eb]" /> Gestión de cupones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {coupons.filter((c) => c.active).length} activos · {coupons.length}{" "}
            total
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          <Plus size={16} /> Nuevo cupón
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border-2 border-[#2563eb]/20 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Crear nuevo cupón</h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Código *
              </label>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Ej: VERANO25"
                  className={`${inputCls} flex-1 font-mono`}
                />
                <button
                  onClick={() =>
                    setForm((f) => ({ ...f, code: generateCode() }))
                  }
                  className="h-10 rounded-xl bg-gray-100 px-3 text-xs font-bold whitespace-nowrap transition hover:bg-gray-200"
                >
                  Auto
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Descripción *
              </label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Ej: Descuento verano 2025"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Tipo de descuento
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setForm((f) => ({ ...f, discountType: "percent" }))
                  }
                  className={`h-10 flex-1 rounded-xl border-2 text-sm font-bold transition ${form.discountType === "percent" ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-gray-200 text-gray-600"}`}
                >
                  % Porcentaje
                </button>
                <button
                  onClick={() =>
                    setForm((f) => ({ ...f, discountType: "fixed" }))
                  }
                  className={`h-10 flex-1 rounded-xl border-2 text-sm font-bold transition ${form.discountType === "fixed" ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-gray-200 text-gray-600"}`}
                >
                  € Fijo
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Valor ({form.discountType === "percent" ? "%" : "€"}) *
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    value: parseFloat(e.target.value) || 0,
                  }))
                }
                min="0"
                step={form.discountType === "percent" ? "1" : "0.01"}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Válido desde
              </label>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsAt: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Válido hasta *
              </label>
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Usos máximos totales
              </label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxUses: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Usos por usuario
              </label>
              <input
                type="number"
                value={form.usesPerUser}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    usesPerUser: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Aplicable a
              </label>
              <div className="relative">
                <select
                  value={form.applicableTo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      applicableTo: e.target
                        .value as AdminCoupon["applicableTo"],
                    }))
                  }
                  className={`${inputCls} appearance-none pr-8`}
                >
                  <option value="all">Todo el catálogo</option>
                  <option value="game">Juego específico</option>
                  <option value="category">Categoría específica</option>
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.code || !form.endsAt}
              className="flex-1 rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
            >
              <Check size={14} className="-mt-0.5 mr-1.5 inline" />
              Crear cupón
            </button>
          </div>
        </div>
      )}

      {/* Coupons list */}
      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div
            key={coupon.code}
            className={`rounded-2xl border bg-white p-5 transition ${coupon.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-bold tracking-wider text-[#2563eb]">
                    {coupon.code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${coupon.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {coupon.active ? "Activo" : "Inactivo"}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                    {coupon.discountType === "percent"
                      ? `${coupon.value}%`
                      : `${coupon.value}€`}
                  </span>
                </div>
                <p className="truncate text-sm text-gray-600">
                  {coupon.description}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {coupon.startsAt} → {coupon.endsAt}
                  {" · "}
                  {coupon.timesUsed}/{coupon.maxUses} usos
                  {" · "}
                  {coupon.totalSaved.toFixed(2)}€ ahorrados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCoupon(coupon.code)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                >
                  {coupon.active ? (
                    <ToggleRight size={20} className="text-green-500" />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
                </button>
                <button
                  onClick={() => deleteCoupon(coupon.code)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
