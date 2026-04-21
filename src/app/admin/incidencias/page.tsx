"use client";
import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { loadIncidents, updateIncident } from "@/services/incidentService";
import { sendIncidentReplyEmail } from "@/services/emailService";
import type { Incident, IncidentStatus } from "@/types/incident";
import { clickableProps } from "@/lib/a11y";

const STATUS_CFG: Record<IncidentStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  nueva:      { label: "Nueva",       color: "#dc2626", bg: "#fee2e2", icon: AlertTriangle },
  en_gestion: { label: "En gestión",  color: "#d97706", bg: "#fef3c7", icon: Clock        },
  resuelta:   { label: "Resuelta",    color: "#16a34a", bg: "#dcfce7", icon: CheckCircle  },
};

const TABS: { key: IncidentStatus | "todas"; label: string }[] = [
  { key: "todas",      label: "Todas"       },
  { key: "nueva",      label: "Nuevas"      },
  { key: "en_gestion", label: "En gestión"  },
  { key: "resuelta",   label: "Resueltas"   },
];

function IncidentCard({ incident, onUpdate }: { incident: Incident; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState(incident.reply ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(!!incident.reply);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  const stCfg = STATUS_CFG[incident.status];
  const StatusIcon = stCfg.icon;

  const dateStr = new Date(incident.createdAt).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handleStatusChange = (status: IncidentStatus) => {
    updateIncident(incident.id, { status });
    onUpdate();
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const repliedAt = new Date().toISOString();
    updateIncident(incident.id, {
      reply: reply.trim(),
      repliedAt,
      status: "resuelta",
    });
    await sendIncidentReplyEmail({
      toEmail: incident.userEmail,
      toName: incident.userName,
      orderId: incident.orderId,
      incidentTypeLabel: incident.typeLabel,
      adminReply: reply.trim(),
      repliedAt: new Date(repliedAt).toLocaleString("es-ES"),
    });
    setSending(false);
    setSent(true);
    onUpdate();
  };

  return (
    <div className={`rounded-2xl border-2 bg-white transition-colors ${incident.status === "nueva" ? "border-red-200" : "border-gray-200"}`}>
      {/* Summary row */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left"
      >
        <span
          className="mt-0.5 flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ color: stCfg.color, backgroundColor: stCfg.bg }}
        >
          <StatusIcon size={11} /> {stCfg.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">{incident.typeLabel}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {incident.userName} · {incident.userEmail} · Pedido <span className="font-mono">{incident.orderId}</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{dateStr}</p>
        </div>
        {incident.photos.length > 0 && (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
            <ImageIcon size={11} /> {incident.photos.length}
          </span>
        )}
        <div className="flex-shrink-0 text-gray-400">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
          {/* Detail text */}
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {incident.detail || <span className="italic text-gray-400">Sin descripción adicional</span>}
            </p>
          </div>

          {/* Photos */}
          {incident.photos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fotos adjuntas</p>
              <div className="flex flex-wrap gap-2">
                {incident.photos.map((src, i) => (
                  <button key={i} onClick={() => setPhotoIndex(i)} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`foto ${i + 1}`} className="h-20 w-20 rounded-xl border border-gray-200 object-cover hover:opacity-80 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.svg"; }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo lightbox */}
          {photoIndex !== null && (
            <div
              {...clickableProps(() => setPhotoIndex(null))}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={incident.photos[photoIndex]}
                alt="foto ampliada"
                className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
                onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.svg"; }}
              />
            </div>
          )}

          {/* Status change */}
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cambiar estado</p>
            <div className="flex flex-wrap gap-2">
              {(["nueva", "en_gestion", "resuelta"] as IncidentStatus[]).map((s) => {
                const cfg = STATUS_CFG[s];
                const active = incident.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition border-2 ${active ? "border-transparent" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}
                    style={active ? { color: cfg.color, backgroundColor: cfg.bg, borderColor: "transparent" } : {}}
                  >
                    <cfg.icon size={11} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reply */}
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {sent ? "Respuesta enviada" : "Responder al cliente"}
            </p>
            {sent && incident.reply ? (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                {incident.reply}
                <p className="mt-2 text-xs text-green-600">
                  ✓ Enviado al cliente por email · {incident.repliedAt ? new Date(incident.repliedAt).toLocaleString("es-ES") : ""}
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Editar respuesta
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Escribe tu respuesta al cliente…"
                  rows={3}
                  className="w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none transition"
                />
                <div className="flex items-center gap-2">
                  <button
                    disabled={!reply.trim() || sending}
                    onClick={handleReply}
                    className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
                  >
                    {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    {sending ? "Enviando…" : "Enviar respuesta"}
                  </button>
                  <p className="text-xs text-gray-400">El cliente recibirá la respuesta por email y la verá en su pedido</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminIncidenciasPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tab, setTab] = useState<IncidentStatus | "todas">("todas");

  const reload = useCallback(() => {
    setIncidents(loadIncidents());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    window.addEventListener("tcga:incidents:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:incidents:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, [reload]);

  const filtered = tab === "todas" ? incidents : incidents.filter((i) => i.status === tab);

  const counts: Record<IncidentStatus | "todas", number> = {
    todas:      incidents.length,
    nueva:      incidents.filter((i) => i.status === "nueva").length,
    en_gestion: incidents.filter((i) => i.status === "en_gestion").length,
    resuelta:   incidents.filter((i) => i.status === "resuelta").length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona y responde las incidencias de los clientes
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? "bg-[#2563eb] text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === key ? "bg-white/20" : key === "nueva" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center">
          <MessageSquare size={40} className="mx-auto mb-4 text-gray-200" />
          <p className="font-bold text-gray-600">No hay incidencias</p>
          <p className="mt-1 text-sm text-gray-400">
            {tab === "todas" ? "Los clientes aún no han reportado ninguna incidencia" : `No hay incidencias con estado "${TABS.find(t => t.key === tab)?.label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} onUpdate={reload} />
          ))}
        </div>
      )}
    </div>
  );
}
