"use client";
import { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Inbox,
  CheckCircle,
  Megaphone,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  MSG_STORAGE_KEY,
  type AppMessage,
} from "@/data/mockData";
import { DataHub } from "@/lib/dataHub";
import { SITE_CONFIG } from "@/config/siteConfig";

/**
 * Asuntos predefinidos para mensajes B2B (mayoristas y tiendas).
 * Forzamos un asunto concreto para que el admin pueda clasificar y priorizar.
 */
const B2B_SUBJECTS = [
  "Problema técnico",
  "Consulta sobre pedido",
  "Consulta de stock / disponibilidad",
  "Facturación",
  "Devolución",
  "Precios / condiciones comerciales",
  "Sugerencia",
  "Reclamación",
  "Otros",
] as const;

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 86400000;
    if (diff < 1)
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function loadMessages(userId: string): AppMessage[] {
  try {
    const saved = localStorage.getItem(MSG_STORAGE_KEY);
    const local: AppMessage[] = saved ? JSON.parse(saved) : [];
    return local
      .filter((m) => m.fromUserId === userId || m.toUserId === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function saveMessages(msgs: AppMessage[]) {
  // Merge-write: preserve messages from other users not in the current scope,
  // then emit the canonical `tcga:messages:updated` event via DataHub so admin
  // views and notifications stay in sync.
  try {
    const all: AppMessage[] = JSON.parse(
      localStorage.getItem(MSG_STORAGE_KEY) ?? "[]",
    );
    const ids = new Set(msgs.map((m) => m.id));
    const rest = all.filter((m) => !ids.has(m.id));
    localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify([...msgs, ...rest]));
    DataHub.emit("messages");
  } catch {}
}

export default function MensajesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [selected, setSelected] = useState<AppMessage | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] =
    useState<(typeof B2B_SUBJECTS)[number] | "">("");
  const [composeBody, setComposeBody] = useState("");

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(loadMessages(user.id));
    const unsub = DataHub.on("messages", () => {
      setMessages(loadMessages(user.id));
    });
    return unsub;
  }, [user]);

  if (!user) return null;

  const isB2B = user.role === "mayorista" || user.role === "tienda";
  if (!isB2B) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mis mensajes</h1>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-amber-400" />
          <p className="font-semibold text-amber-700">
            La sección de mensajes es exclusiva para mayoristas y tiendas.
          </p>
          <p className="mt-1 text-sm text-amber-600">
            Si necesitas ayuda, escríbenos a{" "}
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="font-semibold underline"
            >
              {SITE_CONFIG.email}
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const unread = messages.filter(
    (m) => m.toUserId === user.id && !m.read,
  ).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelect = (msg: AppMessage) => {
    setSelected(msg);
    setReplyBody("");
    if (!msg.read && msg.toUserId === user.id) {
      const updated = messages.map((m) =>
        m.id === msg.id ? { ...m, read: true } : m,
      );
      setMessages(updated);
      saveMessages(updated);
    }
  };

  const handleCompose = () => {
    if (!composeSubject || !composeBody.trim()) return;
    const newMsg: AppMessage = {
      id: `msg-${Date.now()}`,
      fromUserId: user.id,
      toUserId: "admin",
      fromName: `${user.name} ${user.lastName}`.trim() || user.email,
      toName: "TCG Academy",
      subject: `[${composeSubject}] — ${user.empresa?.razonSocial ?? user.name}`,
      body: composeBody,
      date: new Date().toISOString(),
      read: false,
    };
    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveMessages(updated);
    setComposeSubject("");
    setComposeBody("");
    setComposeOpen(false);
    showToast("Mensaje enviado a TCG Academy");
  };

  const handleReply = () => {
    if (!selected || !replyBody.trim()) return;
    const newMsg: AppMessage = {
      id: `msg-${Date.now()}`,
      fromUserId: user.id,
      toUserId: "admin",
      fromName: `${user.name} ${user.lastName}`,
      toName: "TCG Academy",
      subject: selected.subject.startsWith("Re:")
        ? selected.subject
        : `Re: ${selected.subject}`,
      body: replyBody,
      date: new Date().toISOString(),
      read: false,
      parentId: selected.id,
    };
    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveMessages(updated);
    setReplyBody("");
    showToast("Mensaje enviado");
  };

  return (
    <div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 shadow-xl"
        >
          <CheckCircle size={18} className="text-green-600" />
          {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Mis mensajes</h1>
        {unread > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {unread} nuevo{unread !== 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={() => setComposeOpen((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          {composeOpen ? <X size={14} /> : <Plus size={14} />}
          {composeOpen ? "Cancelar" : "Nuevo mensaje"}
        </button>
      </div>

      {composeOpen && (
        <div className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <label
              htmlFor="compose-subject"
              className="mb-1.5 block text-sm font-semibold text-gray-700"
            >
              Asunto *
            </label>
            <select
              id="compose-subject"
              value={composeSubject}
              onChange={(e) =>
                setComposeSubject(
                  e.target.value as (typeof B2B_SUBJECTS)[number],
                )
              }
              className="h-11 w-full rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
            >
              <option value="">Selecciona un asunto…</option>
              {B2B_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="compose-body"
              className="mb-1.5 block text-sm font-semibold text-gray-700"
            >
              Mensaje *
            </label>
            <textarea
              id="compose-body"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Cuéntanos tu duda, sugerencia o problema con el máximo detalle posible…"
              className="w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
            />
            <p className="mt-1 text-right text-[11px] text-gray-400">
              {composeBody.length} / 2000
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setComposeOpen(false);
                setComposeSubject("");
                setComposeBody("");
              }}
              className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCompose}
              disabled={!composeSubject || !composeBody.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              <Send size={14} /> Enviar
            </button>
          </div>
        </div>
      )}

      <div className="grid min-h-[400px] gap-4 lg:grid-cols-[280px_1fr]">
        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                <Inbox size={32} className="mb-2" />
                <p className="text-xs">No tienes mensajes</p>
              </div>
            )}
            {messages.map((msg) => {
              const isIncoming = msg.toUserId === user.id;
              const isUnread = !msg.read && isIncoming;
              return (
                <button
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`w-full p-4 text-left transition hover:bg-gray-50 ${selected?.id === msg.id ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isUnread && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                        )}
                        {msg.isBroadcast ? (
                          <Megaphone
                            size={11}
                            className="flex-shrink-0 text-amber-500"
                          />
                        ) : (
                          <MessageSquare
                            size={10}
                            className="flex-shrink-0 text-gray-300"
                          />
                        )}
                        <p
                          className={`truncate text-xs ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}
                        >
                          {isIncoming ? msg.fromName : `→ ${msg.toName}`}
                        </p>
                      </div>
                      <p
                        className={`mt-0.5 truncate text-xs ${isUnread ? "font-semibold text-gray-800" : "text-gray-500"}`}
                      >
                        {msg.subject}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] text-gray-400">
                      {fmtDate(msg.date)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {selected ? (
            <>
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-start gap-2">
                  {selected.isBroadcast && (
                    <Megaphone
                      size={14}
                      className="mt-0.5 flex-shrink-0 text-amber-500"
                    />
                  )}
                  <h3 className="font-bold text-gray-900">
                    {selected.subject}
                  </h3>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>
                    De: <strong>{selected.fromName}</strong>
                  </span>
                  <span>·</span>
                  <span>{fmtDate(selected.date)}</span>
                </div>
                {selected.orderId && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                    Pedido: {selected.orderId}
                  </span>
                )}
                {selected.isBroadcast && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                    <Megaphone size={9} /> Comunicación general
                  </span>
                )}
              </div>
              <div className="flex-1 px-6 py-5">
                <p className="text-sm leading-relaxed whitespace-pre-line text-gray-700">
                  {selected.body}
                </p>
              </div>
              {selected.toUserId === user.id && (
                <div className="space-y-2 border-t border-gray-100 px-6 py-4">
                  <p className="text-xs font-semibold text-gray-500">
                    Responder a TCG Academy
                  </p>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Escribe tu respuesta..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyBody.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#3b82f6] disabled:opacity-50"
                  >
                    <Send size={14} /> Responder
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-gray-300">
              <MessageSquare size={40} className="mb-3" />
              <p className="text-sm">Selecciona un mensaje</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
