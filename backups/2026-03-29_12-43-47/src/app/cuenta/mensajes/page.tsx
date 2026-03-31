"use client";
import { useState, useEffect } from "react";
import { MessageSquare, Send, Inbox, Check, Megaphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  MOCK_MESSAGES,
  MSG_STORAGE_KEY,
  type AppMessage,
} from "@/data/mockData";

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
    const ids = new Set(local.map((m) => m.id));
    const all = [...local, ...MOCK_MESSAGES.filter((m) => !ids.has(m.id))];
    return all
      .filter((m) => m.fromUserId === userId || m.toUserId === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function saveMessages(msgs: AppMessage[]) {
  try {
    const all: AppMessage[] = JSON.parse(
      localStorage.getItem(MSG_STORAGE_KEY) ?? "[]",
    );
    const ids = new Set(msgs.map((m) => m.id));
    const rest = all.filter((m) => !ids.has(m.id));
    localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify([...msgs, ...rest]));
  } catch {}
}

export default function MensajesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [selected, setSelected] = useState<AppMessage | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setMessages(loadMessages(user.id));
  }, [user]);

  if (!user) return null;

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
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <Check size={14} className="text-green-300" /> {toast}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Mis mensajes</h1>
        {unread > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unread} nuevo{unread !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 min-h-[400px]">
        {/* List */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
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
                  className={`w-full text-left p-4 hover:bg-gray-50 transition ${selected?.id === msg.id ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isUnread && (
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        {msg.isBroadcast ? (
                          <Megaphone
                            size={11}
                            className="text-amber-500 flex-shrink-0"
                          />
                        ) : (
                          <MessageSquare
                            size={10}
                            className="text-gray-300 flex-shrink-0"
                          />
                        )}
                        <p
                          className={`text-xs truncate ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}
                        >
                          {isIncoming ? msg.fromName : `→ ${msg.toName}`}
                        </p>
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${isUnread ? "text-gray-800 font-semibold" : "text-gray-500"}`}
                      >
                        {msg.subject}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {fmtDate(msg.date)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
          {selected ? (
            <>
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-start gap-2">
                  {selected.isBroadcast && (
                    <Megaphone
                      size={14}
                      className="text-amber-500 flex-shrink-0 mt-0.5"
                    />
                  )}
                  <h3 className="font-bold text-gray-900">
                    {selected.subject}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>
                    De: <strong>{selected.fromName}</strong>
                  </span>
                  <span>·</span>
                  <span>{fmtDate(selected.date)}</span>
                </div>
                {selected.orderId && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full mt-1">
                    Pedido: {selected.orderId}
                  </span>
                )}
                {selected.isBroadcast && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full mt-1">
                    <Megaphone size={9} /> Comunicación general
                  </span>
                )}
              </div>
              <div className="px-6 py-5 flex-1">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {selected.body}
                </p>
              </div>
              {selected.toUserId === user.id && (
                <div className="px-6 py-4 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-semibold text-gray-500">
                    Responder a TCG Academy
                  </p>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Escribe tu respuesta..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyBody.trim()}
                    className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-[#2d6a9f] disabled:opacity-50"
                  >
                    <Send size={14} /> Responder
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-16">
              <MessageSquare size={40} className="mb-3" />
              <p className="text-sm">Selecciona un mensaje</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
