"use client";
import { useState } from "react";
import { Mail, Check } from "lucide-react";

// ─── Notification settings (was /admin/ajustes) ───────────────────────────────

const NOTIFICATION_SETTINGS_KEY = "tcgacademy_admin_settings";

interface NotificationSettings {
  notificationEmail: string;
  senderName: string;
  replyToEmail: string;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notificationEmail: "admin@tcgacademy.es",
  senderName: "TCG Academy",
  replyToEmail: "admin@tcgacademy.es",
};

function loadNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(JSON.parse(raw) as Partial<NotificationSettings>),
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

const NOTIFICATION_FIELDS: {
  key: keyof NotificationSettings;
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
    help: "Dirección donde se envían las notificaciones del sistema (nuevos pedidos, incidencias, etc.)",
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
    help: "Cuando un cliente responde a un email automático, la respuesta llegará a esta dirección.",
  },
];

export default function AdminEmailsPage() {
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    () => loadNotificationSettings(),
  );
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const handleSave = () => {
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notifSettings));
      setSaveMsg("Ajustes de notificaciones guardados");
    } catch {
      setSaveMsg("Error al guardar los ajustes");
    }
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleReset = () => {
    setNotifSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setSaveMsg("Valores por defecto restaurados (pulsa Guardar para aplicar)");
    setTimeout(() => setSaveMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {saveMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          <Check size={15} /> {saveMsg}
        </div>
      )}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Mail size={22} className="text-[#2563eb]" /> Emails
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura las direcciones de email del sistema.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Datos emails</h2>
        <p className="mb-6 text-sm text-gray-500">
          Configura las direcciones de email del sistema (nuevos pedidos, incidencias, etc.).
        </p>

        <div className="space-y-5">
          {NOTIFICATION_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                {field.label}
              </label>
              <input
                type={field.type}
                value={notifSettings[field.key]}
                onChange={(e) =>
                  setNotifSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">{field.help}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <Check size={16} /> Guardar ajustes
          </button>
          <button
            onClick={handleReset}
            className="rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
          >
            Restaurar por defecto
          </button>
        </div>
      </div>
    </div>
  );
}
