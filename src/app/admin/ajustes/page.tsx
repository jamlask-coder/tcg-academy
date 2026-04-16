"use client";
import { useState } from "react";
import { Settings, Check, X } from "lucide-react";

const STORAGE_KEY = "tcgacademy_admin_settings";

interface AdminSettings {
  notificationEmail: string;
  senderName: string;
  replyToEmail: string;
}

const DEFAULT_SETTINGS: AdminSettings = {
  notificationEmail: "admin@tcgacademy.es",
  senderName: "TCG Academy",
  replyToEmail: "admin@tcgacademy.es",
};

function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AdminSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="animate-fade-in fixed right-6 bottom-6 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-[#2563eb] px-5 py-3 text-white shadow-xl">
      <Check size={16} className="flex-shrink-0 text-green-300" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}

export default function AdminAjustesPage() {
  const [settings, setSettings] = useState<AdminSettings>(() => loadSettings());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      showToast("Ajustes guardados correctamente");
    } catch {
      showToast("Error al guardar los ajustes");
    }
  };

  const fields: {
    key: keyof AdminSettings;
    label: string;
    placeholder: string;
    type: string;
    help: string;
  }[] = [
    {
      key: "notificationEmail",
      label: "Email de notificaciones",
      placeholder: "admin@tcgacademy.es",
      type: "email",
      help: "Direccion donde se envian las notificaciones del sistema (nuevos pedidos, incidencias, etc.)",
    },
    {
      key: "senderName",
      label: "Nombre de la tienda en emails",
      placeholder: "TCG Academy",
      type: "text",
      help: "Nombre que aparece como remitente en los emails enviados a clientes.",
    },
    {
      key: "replyToEmail",
      label: "Email de respuesta (reply-to)",
      placeholder: "admin@tcgacademy.es",
      type: "email",
      help: "Cuando un cliente responde a un email automatico, la respuesta llegara a esta direccion.",
    },
  ];

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Settings size={24} className="text-[#2563eb]" />
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configuracion general del panel de administracion
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Notification settings card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900">
            Notificaciones por email
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Configura las direcciones de email para las notificaciones del sistema.
          </p>

          <div className="space-y-5">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={settings[field.key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">{field.help}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              <Check size={16} />
              Guardar ajustes
            </button>
            <button
              onClick={() => {
                setSettings(DEFAULT_SETTINGS);
                showToast("Valores por defecto restaurados (pulsa Guardar para aplicar)");
              }}
              className="rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
            >
              Restaurar por defecto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
