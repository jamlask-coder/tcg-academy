"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle } from "lucide-react";

export default function FacturacionPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nif: user?.billing?.nif ?? "",
    razonSocial: user?.billing?.razonSocial ?? "",
    calle: user?.billing?.calle ?? "",
    cp: user?.billing?.cp ?? "",
    ciudad: user?.billing?.ciudad ?? "",
    provincia: user?.billing?.provincia ?? "",
    pais: user?.billing?.pais ?? "ES",
  });
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const inputCls =
    "w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] transition";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Datos de facturacion
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Tus datos fiscales para las facturas
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              NIF / CIF *
            </label>
            <input
              type="text"
              value={form.nif}
              onChange={set("nif")}
              placeholder="12345678A"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Razon social (si empresa)
            </label>
            <input
              type="text"
              value={form.razonSocial}
              onChange={set("razonSocial")}
              placeholder="Nombre empresa S.L."
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Direccion fiscal *
            </label>
            <input
              type="text"
              value={form.calle}
              onChange={set("calle")}
              placeholder="Calle y numero"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Codigo postal *
            </label>
            <input
              type="text"
              value={form.cp}
              onChange={set("cp")}
              placeholder="28001"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Ciudad *
            </label>
            <input
              type="text"
              value={form.ciudad}
              onChange={set("ciudad")}
              placeholder="Madrid"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Provincia
            </label>
            <input
              type="text"
              value={form.provincia}
              onChange={set("provincia")}
              placeholder="Madrid"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Pais
            </label>
            <select
              value={form.pais}
              onChange={set("pais")}
              className={inputCls}
            >
              <option value="ES">España</option>
              <option value="PT">Portugal</option>
              <option value="FR">Francia</option>
              <option value="DE">Alemania</option>
            </select>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
            <CheckCircle size={16} /> Datos guardados correctamente
          </div>
        )}

        <button
          type="submit"
          className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          Guardar datos fiscales
        </button>
      </form>
    </div>
  );
}
