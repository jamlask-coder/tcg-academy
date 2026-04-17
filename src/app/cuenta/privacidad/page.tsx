"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Download,
  Trash2,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { exportUserData, deleteUserData } from "@/services/gdprService";
import {
  getAllConsentStatuses,
  getConsentHistory,
  getCommPreferences,
  saveCommPreferences,
  recordConsent,
  exportConsentData,
  type ConsentType,
  type CommChannel,
} from "@/services/consentService";
import { AccountTabs } from "@/components/cuenta/AccountTabs";

const CONSENT_LABELS: Record<ConsentType, { label: string; description: string; revocable: boolean }> = {
  terms: {
    label: "Términos y condiciones",
    description: "Aceptación de las condiciones generales de uso y contratación.",
    revocable: false,
  },
  privacy: {
    label: "Política de privacidad",
    description: "Información sobre el tratamiento de tus datos personales.",
    revocable: false,
  },
  data_processing: {
    label: "Tratamiento de datos (contrato)",
    description: "Base legal: ejecución del contrato de compraventa (Art. 6.1.b RGPD).",
    revocable: false,
  },
  marketing_email: {
    label: "Comunicaciones comerciales",
    description: "Envío de ofertas, novedades y promociones por email.",
    revocable: true,
  },
  cookies_analytics: {
    label: "Cookies de análisis",
    description: "Cookies para medir el uso del sitio web de forma anónima.",
    revocable: true,
  },
  cookies_marketing: {
    label: "Cookies publicitarias",
    description: "Cookies para mostrar publicidad personalizada.",
    revocable: true,
  },
};

const CHANNEL_LABELS: Record<CommChannel, { label: string; description: string; locked: boolean }> = {
  email_orders: {
    label: "Confirmaciones de pedido",
    description: "Emails sobre el estado de tus pedidos (confirmación, factura).",
    locked: true,
  },
  email_shipping: {
    label: "Avisos de envío",
    description: "Notificaciones cuando tu pedido se envía o entrega.",
    locked: true,
  },
  email_marketing: {
    label: "Ofertas y promociones",
    description: "Descuentos exclusivos, ofertas flash y campañas especiales.",
    locked: false,
  },
  email_newsletter: {
    label: "Newsletter semanal",
    description: "Resumen semanal con novedades del mundo TCG.",
    locked: false,
  },
  email_offers: {
    label: "Alertas de precio",
    description: "Aviso cuando un producto de tu lista de favoritos baje de precio.",
    locked: false,
  },
};

export default function PrivacidadPage() {
  const { user, logout } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // ─── Data Export ────────────────────────────────────────────────────────
  // Hooks must be called before any early return to satisfy rules-of-hooks.
  const handleExport = useCallback(() => {
    if (!user) return;
    setDownloading(true);

    // Collect ALL user data + consents
    const userData = exportUserData(user.id);
    const consentData = exportConsentData(user.id);
    const fullExport = {
      exportDate: new Date().toISOString(),
      requestedBy: user.email,
      legalBasis: "RGPD Art. 20 — Derecho a la portabilidad de datos",
      data: userData,
      consents: consentData,
    };

    const json = JSON.stringify(fullExport, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tcgacademy_datos_${user.email}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloading(false);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  }, [user]);

  // ─── Account Deletion ──────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (!user) return;
    if (deleteConfirmText !== "ELIMINAR") return;
    setDeleting(true);

    deleteUserData(user.id, true);

    // Also clean consent records
    // (keeping a minimal audit record of the deletion itself)
    recordConsent({
      userId: user.id,
      type: "data_processing",
      status: "revoked",
      method: "account_deletion",
    });

    setDeleting(false);
    setDeleted(true);

    // Log out after 3 seconds
    setTimeout(() => {
      logout();
    }, 3000);
  }, [user, deleteConfirmText, logout]);

  // Communication preferences state — must be called unconditionally.
  const initialChannels = user ? getCommPreferences(user.id).channels : ({} as ReturnType<typeof getCommPreferences>["channels"]);
  const [channels, setChannels] = useState(initialChannels);

  if (!user) return null;

  const consents = getAllConsentStatuses(user.id);
  const history = getConsentHistory(user.id);

  // ─── Consent Revocation ────────────────────────────────────────────────
  const handleRevokeConsent = (type: ConsentType) => {
    recordConsent({
      userId: user.id,
      type,
      status: "revoked",
      method: "privacy_dashboard",
    });
    // Force re-render by triggering state
    setPrefsSaved(false);
    window.location.reload();
  };

  const handleGrantConsent = (type: ConsentType) => {
    recordConsent({
      userId: user.id,
      type,
      status: "granted",
      method: "privacy_dashboard",
    });
    window.location.reload();
  };

  // ─── Communication Preferences ─────────────────────────────────────────
  const handleSavePrefs = () => {
    saveCommPreferences(user.id, channels);

    // Record marketing consent change if marketing channels changed
    const marketingEnabled = channels.email_marketing || channels.email_newsletter || channels.email_offers;
    const currentConsent = consents.marketing_email;
    const wasGranted = currentConsent?.status === "granted";

    if (marketingEnabled && !wasGranted) {
      recordConsent({
        userId: user.id,
        type: "marketing_email",
        status: "granted",
        method: "preferences_page",
      });
    } else if (!marketingEnabled && wasGranted) {
      recordConsent({
        userId: user.id,
        type: "marketing_email",
        status: "revoked",
        method: "preferences_page",
      });
    }

    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 3000);
  };

  if (deleted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={48} className="mb-4 text-green-500" />
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Cuenta eliminada
        </h2>
        <p className="text-sm text-gray-500">
          Tus datos personales han sido eliminados. Las facturas se conservan
          por obligación legal (6 años). Serás redirigido...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AccountTabs group="perfil" />

      {/* ─── GDPR Rights Cards ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Export Data */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Download size={20} className="text-[#2563eb]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Exportar mis datos</h3>
              <p className="text-xs text-gray-400">Art. 20 RGPD — Portabilidad</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Descarga una copia completa de todos tus datos personales en formato
            JSON: perfil, pedidos, facturas, puntos, mensajes y consentimientos.
          </p>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {downloading ? (
              "Preparando..."
            ) : downloaded ? (
              <>
                <CheckCircle size={16} /> Descargado
              </>
            ) : (
              <>
                <Download size={16} /> Descargar datos
              </>
            )}
          </button>
        </div>

        {/* Delete Account */}
        <div className="rounded-2xl border border-red-100 bg-white p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Eliminar mi cuenta</h3>
              <p className="text-xs text-gray-400">Art. 17 RGPD — Derecho al olvido</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Elimina permanentemente tu cuenta y todos tus datos personales. Las
            facturas se conservan 6 años por obligación legal (Ley General
            Tributaria). Los pedidos se anonimizan.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-xl border-2 border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50"
            >
              <Trash2 size={16} /> Solicitar eliminación
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-red-700">
                <AlertTriangle size={16} /> Esta acción es irreversible
              </div>
              <p className="mb-3 text-xs text-red-600">
                Escribe <strong>ELIMINAR</strong> para confirmar la eliminación
                permanente de tu cuenta y todos tus datos personales.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='Escribe "ELIMINAR"'
                className="mb-3 h-10 w-full rounded-lg border-2 border-red-200 px-3 text-sm font-mono transition focus:border-red-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== "ELIMINAR" || deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-40"
                >
                  {deleting ? "Eliminando..." : "Confirmar eliminación"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Consent Management ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <FileCheck size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Mis consentimientos</h3>
            <p className="text-xs text-gray-400">
              Art. 7 RGPD — Gestión del consentimiento
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(Object.entries(CONSENT_LABELS) as [ConsentType, typeof CONSENT_LABELS[ConsentType]][]).map(
            ([type, config]) => {
              const consent = consents[type];
              const isGranted = consent?.status === "granted";
              const hasRecord = consent !== null;

              return (
                <div
                  key={type}
                  className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {config.label}
                      </span>
                      {hasRecord && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isGranted
                              ? "bg-green-50 text-green-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isGranted ? "Activo" : "Revocado"}
                        </span>
                      )}
                      {!hasRecord && (
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">
                          Sin registro
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {config.description}
                    </p>
                    {hasRecord && consent.timestamp && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock size={10} />
                        {new Date(consent.timestamp).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · v"}{consent.version}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {config.revocable ? (
                      isGranted ? (
                        <button
                          onClick={() => handleRevokeConsent(type)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          Revocar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGrantConsent(type)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-green-200 hover:bg-green-50 hover:text-green-600"
                        >
                          Otorgar
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        No revocable
                      </span>
                    )}
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* Consent History */}
        <div className="mt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-700"
          >
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Historial completo de consentimientos ({history.length} registros)
          </button>
          {showHistory && history.length > 0 && (
            <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Método</th>
                    <th className="px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-gray-50 text-gray-600"
                    >
                      <td className="px-3 py-1.5">
                        {CONSENT_LABELS[h.type]?.label ?? h.type}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`font-semibold ${
                            h.status === "granted"
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {h.status === "granted" ? "Otorgado" : "Revocado"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-400">
                        {h.method}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-400">
                        {new Date(h.timestamp).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Communication Preferences ───────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
            <Mail size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              Preferencias de comunicación
            </h3>
            <p className="text-xs text-gray-400">
              Elige qué emails quieres recibir
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(Object.entries(CHANNEL_LABELS) as [CommChannel, typeof CHANNEL_LABELS[CommChannel]][]).map(
            ([channel, config]) => (
              <label
                key={channel}
                className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                  config.locked
                    ? "border-gray-100 bg-gray-50"
                    : "cursor-pointer border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={channels[channel]}
                  disabled={config.locked}
                  onChange={(e) =>
                    setChannels((c) => ({ ...c, [channel]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] disabled:opacity-50"
                  aria-label={config.label}
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800">
                    {config.label}
                    {config.locked && (
                      <span className="ml-2 rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 uppercase">
                        Obligatorio
                      </span>
                    )}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {config.description}
                  </p>
                </div>
              </label>
            ),
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSavePrefs}
            className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Guardar preferencias
          </button>
          {prefsSaved && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <CheckCircle size={16} /> Guardado
            </span>
          )}
        </div>
      </div>

      {/* ─── Legal Info ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="mb-3 font-bold text-gray-900">Tus derechos</h3>
        <p className="mb-4 text-sm leading-relaxed text-gray-600">
          Conforme al <strong>Reglamento (UE) 2016/679</strong> (RGPD) y la{" "}
          <strong>Ley Orgánica 3/2018</strong> (LOPDGDD), puedes ejercer en
          cualquier momento tus derechos de acceso, rectificación, supresión,
          oposición, portabilidad y limitación del tratamiento. Puedes hacerlo
          desde este panel o escribiendo a{" "}
          <a
            href="mailto:hola@tcgacademy.es"
            className="font-medium text-[#2563eb] hover:underline"
          >
            hola@tcgacademy.es
          </a>{" "}
          adjuntando copia de tu documento de identidad.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/privacidad"
            className="rounded-lg border border-gray-200 px-3.5 py-2 font-semibold text-gray-600 transition hover:border-blue-200 hover:text-[#2563eb]"
          >
            Política de privacidad
          </Link>
          <Link
            href="/cookies"
            className="rounded-lg border border-gray-200 px-3.5 py-2 font-semibold text-gray-600 transition hover:border-blue-200 hover:text-[#2563eb]"
          >
            Política de cookies
          </Link>
          <Link
            href="/aviso-legal"
            className="rounded-lg border border-gray-200 px-3.5 py-2 font-semibold text-gray-600 transition hover:border-blue-200 hover:text-[#2563eb]"
          >
            Aviso legal
          </Link>
        </div>
      </div>
    </div>
  );
}
