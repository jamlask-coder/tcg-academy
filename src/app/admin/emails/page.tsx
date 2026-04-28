"use client";

/**
 * /admin/emails — configura las direcciones de notificación del sistema.
 *
 * Antes guardaba en localStorage (clave `tcgacademy_admin_settings`), pero
 * /api/orders y /api/payments/webhook leen de la BD (`db.getSetting`), así
 * que el cambio NUNCA se aplicaba al envío real. Ahora va contra
 * `/api/admin/settings` (GET/PUT), que persiste en Supabase. La fuente única
 * es la BD; localStorage queda fuera para esta entidad.
 */

import { useState, useEffect, useCallback } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

interface NotificationSettings {
  notificationEmail: string;
  senderName: string;
  replyToEmail: string;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notificationEmail: "tcgacademycalpe@gmail.com",
  senderName: "TCG Academy",
  replyToEmail: "tcgacademycalpe@gmail.com",
};

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
    placeholder: "tcgacademycalpe@gmail.com",
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
    placeholder: "tcgacademycalpe@gmail.com",
    type: "email",
    help: "Cuando un cliente responde a un email automático, la respuesta llegará a esta dirección.",
  },
];

interface ApiSettings {
  notificationEmail?: string;
  senderName?: string;
  replyToEmail?: string;
}

export default function AdminEmailsPage() {
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Carga inicial desde BD vía API.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/settings", { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { settings?: ApiSettings };
        if (cancelled || !data.settings) return;
        setNotifSettings({
          notificationEmail:
            data.settings.notificationEmail ??
            DEFAULT_NOTIFICATION_SETTINGS.notificationEmail,
          senderName:
            data.settings.senderName ?? DEFAULT_NOTIFICATION_SETTINGS.senderName,
          replyToEmail:
            data.settings.replyToEmail ??
            DEFAULT_NOTIFICATION_SETTINGS.replyToEmail,
        });
      } catch {
        if (!cancelled) {
          setSaveMsg("No se pudieron cargar los ajustes (usando defaults)");
          setTimeout(() => setSaveMsg(null), 3000);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifSettings),
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaveMsg("Ajustes guardados en la base de datos");
    } catch {
      setSaveMsg("Error al guardar los ajustes");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }, [notifSettings]);

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

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Cargando ajustes…
          </div>
        ) : (
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
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "Guardando…" : "Guardar ajustes"}
          </button>
          <button
            onClick={handleReset}
            disabled={loading || saving}
            className="rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Restaurar por defecto
          </button>
        </div>
      </div>
    </div>
  );
}
