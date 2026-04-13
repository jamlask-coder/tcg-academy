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
    "w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] transition";

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis direcciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tus direcciones de envío
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          <Plus size={16} /> Añadir dirección
        </button>
      </div>

      {/* Address list */}
      {addresses.length === 0 && !showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="mb-2 font-bold text-gray-700">
            No tienes direcciones guardadas
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm font-semibold text-[#2563eb] hover:underline"
          >
            + Añadir primera dirección
          </button>
        </div>
      )}

      <div className="mb-6 space-y-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`rounded-2xl border-2 bg-white p-5 ${
              addr.predeterminada ? "border-[#2563eb]" : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {addr.label}
                  </span>
                  {addr.predeterminada && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                      <Star size={10} className="fill-[#2563eb]" />{" "}
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
              <div className="flex flex-shrink-0 flex-col gap-2">
                <button
                  onClick={() => handleEdit(addr)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 transition hover:text-[#2563eb]"
                >
                  <Pencil size={13} /> Editar
                </button>
                {!addr.predeterminada && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 transition hover:text-[#2563eb]"
                  >
                    <Star size={13} /> Predeterminar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="flex items-center gap-1.5 text-xs text-red-400 transition hover:text-red-600"
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-bold text-gray-900">
            {editId ? "Editar dirección" : "Nueva dirección"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">
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
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Número
                </label>
                <input
                  type="text"
                  value={form.numero ?? ""}
                  onChange={set("numero")}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Código postal
              </label>
              <input
                type="text"
                value={form.cp ?? ""}
                onChange={set("cp")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                País
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
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="rounded-xl border-2 border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
