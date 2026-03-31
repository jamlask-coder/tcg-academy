"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import type { Address } from "@/types/user";

export default function DireccionesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses ?? []);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Address>>({
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
  });

  if (!user) return null;

  const set =
    (key: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    if (editId) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editId ? ({ ...a, ...form } as Address) : a)),
      );
    } else {
      const newAddr: Address = {
        id: `addr-${Date.now()}`,
        predeterminada: addresses.length === 0,
        ...form,
      } as Address;
      setAddresses((prev) => [...prev, newAddr]);
    }
    setShowForm(false);
    setEditId(null);
    setForm({
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
    });
  };

  const handleDelete = (id: string) =>
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  const handleSetDefault = (id: string) =>
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, predeterminada: a.id === id })),
    );

  const handleEdit = (addr: Address) => {
    setForm(addr);
    setEditId(addr.id);
    setShowForm(true);
  };

  const inputCls =
    "w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis direcciones</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona tus direcciones de envio
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
          }}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition"
        >
          <Plus size={16} /> Añadir direccion
        </button>
      </div>

      {/* Address list */}
      {addresses.length === 0 && !showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <MapPin size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="font-bold text-gray-700 mb-2">
            No tienes direcciones guardadas
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-[#1a3a5c] font-semibold hover:underline text-sm"
          >
            + Añadir primera direccion
          </button>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`bg-white border-2 rounded-2xl p-5 ${
              addr.predeterminada ? "border-[#1a3a5c]" : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-sm">
                    {addr.label}
                  </span>
                  {addr.predeterminada && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#1a3a5c] bg-blue-50 px-2 py-0.5 rounded-full">
                      <Star size={10} className="fill-[#1a3a5c]" />{" "}
                      Predeterminada
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  {addr.nombre} {addr.apellidos}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.calle} {addr.numero}
                  {addr.piso ? `, ${addr.piso}` : ""}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.cp} {addr.ciudad}, {addr.provincia}
                </p>
                <p className="text-sm text-gray-500">{addr.pais}</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(addr)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#1a3a5c] transition"
                >
                  <Pencil size={13} /> Editar
                </button>
                {!addr.predeterminada && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#1a3a5c] transition"
                  >
                    <Star size={13} /> Predeterminar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/edit form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 mb-4">
            {editId ? "Editar direccion" : "Nueva direccion"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Etiqueta
              </label>
              <select
                value={form.label}
                onChange={set("label")}
                className={inputCls}
              >
                <option>Casa</option>
                <option>Trabajo</option>
                <option>Otra</option>
              </select>
            </div>
            <div />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={form.nombre ?? ""}
                onChange={set("nombre")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={form.apellidos ?? ""}
                onChange={set("apellidos")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Calle
              </label>
              <input
                type="text"
                value={form.calle ?? ""}
                onChange={set("calle")}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Numero
                </label>
                <input
                  type="text"
                  value={form.numero ?? ""}
                  onChange={set("numero")}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Piso
                </label>
                <input
                  type="text"
                  value={form.piso ?? ""}
                  onChange={set("piso")}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Codigo postal
              </label>
              <input
                type="text"
                value={form.cp ?? ""}
                onChange={set("cp")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={form.ciudad ?? ""}
                onChange={set("ciudad")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Provincia
              </label>
              <input
                type="text"
                value={form.provincia ?? ""}
                onChange={set("provincia")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Pais
              </label>
              <select
                value={form.pais ?? "ES"}
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
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="bg-[#1a3a5c] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="border-2 border-gray-200 text-gray-600 font-semibold px-6 py-2.5 rounded-xl text-sm hover:border-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
