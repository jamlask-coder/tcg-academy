"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Building2, CheckCircle } from "lucide-react";

export default function EmpresaPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    cif: user?.empresa?.cif ?? "",
    razonSocial: user?.empresa?.razonSocial ?? "",
    direccionFiscal: user?.empresa?.direccionFiscal ?? "",
    personaContacto: user?.empresa?.personaContacto ?? "",
    telefonoEmpresa: user?.empresa?.telefonoEmpresa ?? "",
    emailFacturacion: user?.empresa?.emailFacturacion ?? "",
  });
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  if (user.role === "cliente") {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="font-bold text-gray-700">
          Esta seccion es solo para mayoristas y tiendas
        </p>
      </div>
    );
  }

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const inputCls =
    "w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Datos de empresa</h1>
        <p className="text-gray-500 text-sm mt-1">
          Informacion comercial y fiscal de tu empresa
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["cif", "CIF / NIF empresa *", "B12345678"],
            ["razonSocial", "Razon social *", "Mi Empresa S.L."],
            [
              "direccionFiscal",
              "Direccion fiscal *",
              "Calle Mayor 1, 28001 Madrid",
            ],
            ["personaContacto", "Persona de contacto *", "Nombre Apellido"],
            ["telefonoEmpresa", "Telefono empresa", "+34 910 000 000"],
            [
              "emailFacturacion",
              "Email de facturacion *",
              "facturas@empresa.com",
            ],
          ].map(([key, label, placeholder]) => (
            <div
              key={key}
              className={key === "direccionFiscal" ? "sm:col-span-2" : ""}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label}
              </label>
              <input
                type={key === "emailFacturacion" ? "email" : "text"}
                value={form[key as keyof typeof form]}
                onChange={set(key)}
                placeholder={placeholder}
                className={inputCls}
              />
            </div>
          ))}
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
            <CheckCircle size={16} /> Datos guardados correctamente
          </div>
        )}

        <button
          type="submit"
          className="bg-[#1a3a5c] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition"
        >
          Guardar datos empresa
        </button>
      </form>
    </div>
  );
}
