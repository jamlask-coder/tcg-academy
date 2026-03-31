"use client";
import { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  X,
  Check,
  Inbox,
  PenSquare,
  Megaphone,
  Users,
  Info,
  Mail,
  Bell,
  Eye,
} from "lucide-react";
import {
  MOCK_MESSAGES,
  MOCK_USERS,
  MOCK_BROADCASTS,
  MSG_STORAGE_KEY,
  BROADCAST_STORAGE_KEY,
  type AppMessage,
  type AdminUser,
  type Broadcast,
  type BroadcastChannel,
  type BroadcastTarget,
} from "@/data/mockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 86400000;
    if (diff < 1)
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (diff < 7) return d.toLocaleDateString("es-ES", { weekday: "short" });
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function loadMessages(): AppMessage[] {
  if (typeof window === "undefined") return MOCK_MESSAGES;
  try {
    const saved = localStorage.getItem(MSG_STORAGE_KEY);
    const local: AppMessage[] = saved ? JSON.parse(saved) : [];
    const ids = new Set(local.map((m) => m.id));
    return [...local, ...MOCK_MESSAGES.filter((m) => !ids.has(m.id))].sort(
      (a, b) => b.date.localeCompare(a.date),
    );
  } catch {
    return MOCK_MESSAGES;
  }
}

function saveMessages(msgs: AppMessage[]) {
  try {
    localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(msgs));
  } catch {}
}

function loadBroadcasts(): Broadcast[] {
  if (typeof window === "undefined") return MOCK_BROADCASTS;
  try {
    const saved = localStorage.getItem(BROADCAST_STORAGE_KEY);
    const local: Broadcast[] = saved ? JSON.parse(saved) : [];
    const ids = new Set(local.map((b) => b.id));
    return [...local, ...MOCK_BROADCASTS.filter((b) => !ids.has(b.id))].sort(
      (a, b) => b.date.localeCompare(a.date),
    );
  } catch {
    return MOCK_BROADCASTS;
  }
}

function saveBroadcasts(list: Broadcast[]) {
  try {
    localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

// ─── Target computing ─────────────────────────────────────────────────────────

const TARGET_OPTIONS: { id: BroadcastTarget; label: string }[] = [
  { id: "todos", label: "Todos los usuarios" },
  { id: "clientes", label: "Solo clientes" },
  { id: "mayoristas", label: "Solo mayoristas" },
  { id: "tiendas", label: "Solo tiendas TCG" },
  { id: "ultimos30", label: "Clientes últimos 30 días" },
  { id: "sin_compra_60", label: "Sin compra últimos 60 días" },
  { id: "manual", label: "Selección manual" },
];

const CHANNEL_OPTIONS: {
  id: BroadcastChannel;
  label: string;
  icon: typeof Bell;
}[] = [
  { id: "interno", label: "Solo notificación interna", icon: Bell },
  { id: "email", label: "Solo email (simulado)", icon: Mail },
  { id: "ambos", label: "Notificación interna + email", icon: MessageSquare },
];

function getTargetUsers(
  target: BroadcastTarget,
  manualIds: string[],
  today: Date,
): AdminUser[] {
  const nonAdmin = MOCK_USERS.filter((u) => u.role !== "admin");
  if (target === "todos") return nonAdmin;
  if (target === "clientes")
    return nonAdmin.filter((u) => u.role === "cliente");
  if (target === "mayoristas")
    return nonAdmin.filter((u) => u.role === "mayorista");
  if (target === "tiendas") return nonAdmin.filter((u) => u.role === "tienda");
  if (target === "ultimos30") {
    return nonAdmin.filter((u) => {
      if (!u.lastOrderDate) return false;
      const diff =
        (today.getTime() - new Date(u.lastOrderDate).getTime()) / 86400000;
      return diff <= 30;
    });
  }
  if (target === "sin_compra_60") {
    return nonAdmin.filter((u) => {
      if (!u.lastOrderDate) return true;
      const diff =
        (today.getTime() - new Date(u.lastOrderDate).getTime()) / 86400000;
      return diff > 60;
    });
  }
  if (target === "manual")
    return nonAdmin.filter((u) => manualIds.includes(u.id));
  return [];
}

// ─── Channel badge ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: BroadcastChannel }) {
  const cfg = {
    interno: { label: "Interno", color: "#7c3aed", bg: "#ede9fe" },
    email: { label: "Email", color: "#0891b2", bg: "#e0f2fe" },
    ambos: { label: "Interno+Email", color: "#16a34a", bg: "#dcfce7" },
  }[channel];
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminMensajesPage() {
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [selected, setSelected] = useState<AppMessage | null>(null);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(
    null,
  );
  const [view, setView] = useState<"individual" | "masivo">("individual");
  const [composingIndividual, setComposingIndividual] = useState(false);
  const [composingBroadcast, setComposingBroadcast] = useState(false);
  const [tab, setTab] = useState<"inbox" | "sent" | "all">("inbox");
  const [search, setSearch] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [toUser, setToUser] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Broadcast form state
  const [bcTarget, setBcTarget] = useState<BroadcastTarget>("todos");
  const [bcChannel, setBcChannel] = useState<BroadcastChannel>("interno");
  const [bcSubject, setBcSubject] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcManualIds, setBcManualIds] = useState<string[]>([]);
  const [bcManualSearch, setBcManualSearch] = useState("");
  const [bcPreview, setBcPreview] = useState(false);
  const [bcConfirm, setBcConfirm] = useState(false);

  useEffect(() => {
    setMessages(loadMessages());
    setBroadcasts(loadBroadcasts());
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const today = useMemo(() => new Date(), []);
  const bcRecipients = useMemo(
    () => getTargetUsers(bcTarget, bcManualIds, today),
    [bcTarget, bcManualIds, today],
  );

  const unread = messages.filter(
    (m) => m.toUserId === "admin" && !m.read,
  ).length;

  // ── Individual messages ──
  const filtered = useMemo(() => {
    let list = messages.filter((m) => {
      if (tab === "inbox") return m.toUserId === "admin";
      if (tab === "sent") return m.fromUserId === "admin";
      return true;
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.fromName.toLowerCase().includes(q) ||
          m.toName.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q),
      );
    }
    return list;
  }, [messages, tab, search]);

  const handleSelect = (msg: AppMessage) => {
    setSelected(msg);
    setReplyBody("");
    if (!msg.read && msg.toUserId === "admin") {
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
      fromUserId: "admin",
      toUserId: selected.fromUserId,
      fromName: "TCG Academy",
      toName: selected.fromName,
      subject: `Re: ${selected.subject}`,
      body: replyBody,
      date: new Date().toISOString(),
      read: false,
      parentId: selected.id,
    };
    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveMessages(updated);
    setReplyBody("");
    showToast(`Respuesta enviada a ${selected.fromName}`);
  };

  const handleNewMessage = () => {
    if (!toUser || !subject || !body.trim()) return;
    const recipient = MOCK_USERS.find((u) => u.id === toUser);
    if (!recipient) return;
    const newMsg: AppMessage = {
      id: `msg-${Date.now()}`,
      fromUserId: "admin",
      toUserId: toUser,
      fromName: "TCG Academy",
      toName: `${recipient.name} ${recipient.lastName}`,
      subject,
      body,
      date: new Date().toISOString(),
      read: false,
    };
    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveMessages(updated);
    setComposingIndividual(false);
    setToUser("");
    setSubject("");
    setBody("");
    showToast(`Mensaje enviado a ${recipient.name}`);
  };

  // ── Broadcast ──
  const handleSendBroadcast = () => {
    if (!bcSubject || !bcBody.trim() || bcRecipients.length === 0) return;
    const bcId = `bc-${Date.now()}`;
    const bc: Broadcast = {
      id: bcId,
      subject: bcSubject,
      body: bcBody,
      channel: bcChannel,
      target: bcTarget,
      targetLabel:
        TARGET_OPTIONS.find((t) => t.id === bcTarget)?.label ?? bcTarget,
      recipientCount: bcRecipients.length,
      date: new Date().toISOString(),
      sentBy: "admin",
    };
    const newBroadcasts = [bc, ...broadcasts];
    setBroadcasts(newBroadcasts);
    saveBroadcasts(newBroadcasts);

    // Create individual AppMessages for internal/both channel
    if (bcChannel === "interno" || bcChannel === "ambos") {
      const newMsgs: AppMessage[] = bcRecipients.map((u) => ({
        id: `msg-${bcId}-${u.id}`,
        fromUserId: "admin",
        toUserId: u.id,
        fromName: "TCG Academy",
        toName: `${u.name} ${u.lastName}`,
        subject: bcSubject,
        body: bcBody,
        date: new Date().toISOString(),
        read: false,
        isBroadcast: true,
        broadcastId: bcId,
      }));
      const updated = [...newMsgs, ...messages];
      setMessages(updated);
      saveMessages(updated);
    }

    setBcConfirm(false);
    setComposingBroadcast(false);
    setBcSubject("");
    setBcBody("");
    setBcTarget("todos");
    setBcChannel("interno");
    setBcManualIds([]);
    setBcPreview(false);
    showToast(`Mensaje masivo enviado a ${bcRecipients.length} usuarios`);
    setView("masivo");
  };

  const nonAdminUsers = MOCK_USERS.filter((u) => u.role !== "admin");
  const filteredManualUsers = nonAdminUsers.filter(
    (u) =>
      bcManualSearch === "" ||
      `${u.name} ${u.lastName} ${u.email}`
        .toLowerCase()
        .includes(bcManualSearch.toLowerCase()),
  );

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <Check size={14} className="text-green-300" /> {toast}
        </div>
      )}

      {/* Confirm modal */}
      {bcConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setBcConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <Megaphone size={18} className="text-[#1a3a5c]" />
              <h3 className="font-bold text-gray-900">
                Confirmar envío masivo
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              ¿Enviar <strong>"{bcSubject}"</strong> a{" "}
              <strong>
                {bcRecipients.length} usuario
                {bcRecipients.length !== 1 ? "s" : ""}
              </strong>{" "}
              por{" "}
              <strong>
                {CHANNEL_OPTIONS.find((c) => c.id === bcChannel)?.label}
              </strong>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBcConfirm(false)}
                className="flex-1 border border-gray-200 text-sm text-gray-600 py-2.5 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendBroadcast}
                className="flex-1 bg-[#1a3a5c] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#2d6a9f] flex items-center justify-center gap-2"
              >
                <Send size={14} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Mensajes
            {unread > 0 && (
              <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                {unread}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Mensajes con clientes, mayoristas y tiendas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setComposingBroadcast(true);
              setComposingIndividual(false);
              setSelected(null);
              setSelectedBroadcast(null);
              setView("masivo");
            }}
            className="flex items-center gap-2 bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition"
          >
            <Megaphone size={15} /> Envío masivo
          </button>
          <button
            onClick={() => {
              setComposingIndividual(true);
              setComposingBroadcast(false);
              setSelected(null);
              setSelectedBroadcast(null);
              setView("individual");
            }}
            className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#2d6a9f] transition"
          >
            <PenSquare size={15} /> Nuevo mensaje
          </button>
        </div>
      </div>

      {/* View selector */}
      <div className="flex gap-2 mb-4">
        {(
          [
            ["individual", "Mensajes individuales", MessageSquare],
            ["masivo", "Historial masivo", Megaphone],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => {
              setView(id);
              setComposingBroadcast(false);
              setComposingIndividual(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${view === id ? "bg-[#1a3a5c] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Individual messages view ─── */}
      {view === "individual" && (
        <div className="grid lg:grid-cols-[300px_1fr] gap-4 min-h-[500px]">
          {/* Left list */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  maxLength={100}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#1a3a5c]"
                />
              </div>
              <div className="flex gap-1">
                {(
                  [
                    ["inbox", "Recibidos"],
                    ["sent", "Enviados"],
                    ["all", "Todos"],
                  ] as const
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${tab === id ? "bg-[#1a3a5c] text-white" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    {lbl}
                    {id === "inbox" && unread > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-[9px] px-1 rounded-full">
                        {unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <Inbox size={28} className="mb-2" />
                  <p className="text-xs">Sin mensajes</p>
                </div>
              )}
              {filtered.map((msg) => {
                const isIncoming = msg.toUserId === "admin";
                const isUnread = !msg.read && isIncoming;
                return (
                  <button
                    key={msg.id}
                    onClick={() => {
                      handleSelect(msg);
                      setComposingIndividual(false);
                    }}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition ${selected?.id === msg.id ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                          {msg.isBroadcast && (
                            <Megaphone
                              size={10}
                              className="text-amber-500 flex-shrink-0"
                            />
                          )}
                          <p
                            className={`text-xs truncate ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}
                          >
                            {isIncoming ? msg.fromName : msg.toName}
                          </p>
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${isUnread ? "text-gray-700 font-semibold" : "text-gray-500"}`}
                        >
                          {msg.subject}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          {msg.body.substring(0, 50)}…
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
                        {fmtDate(msg.date)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right detail / compose */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
            {composingIndividual ? (
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <PenSquare size={16} /> Nuevo mensaje
                  </h3>
                  <button
                    onClick={() => setComposingIndividual(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Destinatario
                    </label>
                    <select
                      value={toUser}
                      onChange={(e) => setToUser(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] bg-white"
                    >
                      <option value="">Selecciona un usuario...</option>
                      {nonAdminUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.lastName} ({u.email}) — {u.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Asunto
                    </label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={200}
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Mensaje
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      maxLength={2000}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setComposingIndividual(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleNewMessage}
                      disabled={!toUser || !subject || !body.trim()}
                      className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-[#2d6a9f] disabled:opacity-50"
                    >
                      <Send size={14} /> Enviar
                    </button>
                  </div>
                </div>
              </div>
            ) : selected ? (
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start gap-2">
                    {selected.isBroadcast && (
                      <Megaphone
                        size={14}
                        className="text-amber-500 flex-shrink-0 mt-0.5"
                      />
                    )}
                    <h3 className="font-bold text-gray-900 text-base">
                      {selected.subject}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>
                      De: <strong>{selected.fromName}</strong>
                    </span>
                    <span>→</span>
                    <span>
                      Para: <strong>{selected.toName}</strong>
                    </span>
                    <span className="ml-auto">{fmtDate(selected.date)}</span>
                  </div>
                  {selected.orderId && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full mt-1">
                      Pedido: {selected.orderId}
                    </span>
                  )}
                  {selected.isBroadcast && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full mt-1">
                      <Megaphone size={9} /> Mensaje masivo
                    </span>
                  )}
                </div>
                <div className="px-6 py-4 flex-1">
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {selected.body}
                  </p>
                </div>
                {selected.toUserId === "admin" && (
                  <div className="px-6 py-4 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">
                      Responder
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
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-16">
                <MessageSquare size={40} className="mb-3" />
                <p className="text-sm">Selecciona un mensaje para leerlo</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Broadcast / mass messaging view ─── */}
      {view === "masivo" && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 min-h-[500px]">
          {/* Left: broadcast list */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Historial de envíos masivos
              </p>
              <span className="text-xs text-gray-400">
                {broadcasts.length} envíos
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {broadcasts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <Megaphone size={28} className="mb-2" />
                  <p className="text-xs">Sin envíos masivos</p>
                </div>
              )}
              {broadcasts.map((bc) => (
                <button
                  key={bc.id}
                  onClick={() => {
                    setSelectedBroadcast(bc);
                    setComposingBroadcast(false);
                  }}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition ${selectedBroadcast?.id === bc.id ? "bg-amber-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {bc.subject}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <ChannelBadge channel={bc.channel} />
                        <span className="text-[10px] text-gray-400">
                          {bc.targetLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        <Users size={9} className="inline mr-0.5" />
                        {bc.recipientCount} usuarios · {fmtDate(bc.date)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: broadcast detail or compose */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
            {composingBroadcast ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Megaphone size={16} className="text-amber-500" /> Nuevo
                    envío masivo
                  </h3>
                  <button
                    onClick={() => setComposingBroadcast(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Target selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wide">
                      Destinatarios
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TARGET_OPTIONS.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setBcTarget(t.id);
                            setBcManualIds([]);
                          }}
                          className={`text-left px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${bcTarget === t.id ? "border-[#1a3a5c] bg-blue-50 text-[#1a3a5c]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                        >
                          {t.label}
                          {bcTarget === t.id && t.id !== "manual" && (
                            <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                              {getTargetUsers(t.id, [], today).length} usuarios
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Manual selection */}
                    {bcTarget === "manual" && (
                      <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search
                              size={12}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                              value={bcManualSearch}
                              onChange={(e) =>
                                setBcManualSearch(e.target.value)
                              }
                              placeholder="Buscar usuario..."
                              maxLength={100}
                              className="w-full pl-7 pr-3 py-1.5 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                          {filteredManualUsers.map((u) => (
                            <label
                              key={u.id}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={bcManualIds.includes(u.id)}
                                onChange={(e) =>
                                  setBcManualIds((prev) =>
                                    e.target.checked
                                      ? [...prev, u.id]
                                      : prev.filter((id) => id !== u.id),
                                  )
                                }
                                className="w-3.5 h-3.5 accent-[#1a3a5c]"
                              />
                              <span className="text-xs text-gray-700">
                                {u.name} {u.lastName}
                              </span>
                              <span className="text-[10px] text-gray-400 ml-auto">
                                {u.role}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Channel */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wide">
                      Canal de envío
                    </label>
                    <div className="space-y-2">
                      {CHANNEL_OPTIONS.map((c) => (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${bcChannel === c.id ? "border-[#1a3a5c] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                        >
                          <input
                            type="radio"
                            name="bcChannel"
                            value={c.id}
                            checked={bcChannel === c.id}
                            onChange={() => setBcChannel(c.id)}
                            className="accent-[#1a3a5c]"
                          />
                          <c.icon size={14} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {c.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">
                      Asunto
                    </label>
                    <input
                      value={bcSubject}
                      onChange={(e) => setBcSubject(e.target.value)}
                      maxLength={200}
                      placeholder="Ej: Nuevas expansiones disponibles"
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c]"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">
                      Mensaje
                    </label>
                    <textarea
                      value={bcBody}
                      onChange={(e) => setBcBody(e.target.value)}
                      rows={6}
                      maxLength={2000}
                      placeholder="Escribe el mensaje para tus usuarios..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                      {bcBody.length}/2000
                    </p>
                  </div>

                  {/* Counter / preview */}
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl ${bcRecipients.length > 0 ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-200"}`}
                  >
                    <Info
                      size={14}
                      className={
                        bcRecipients.length > 0
                          ? "text-blue-500"
                          : "text-gray-400"
                      }
                    />
                    <p className="text-sm text-gray-700 flex-1">
                      {bcRecipients.length > 0 ? (
                        <>
                          Este mensaje se enviará a{" "}
                          <strong>
                            {bcRecipients.length} usuario
                            {bcRecipients.length !== 1 ? "s" : ""}
                          </strong>
                        </>
                      ) : (
                        "Selecciona destinatarios para ver el contador"
                      )}
                    </p>
                    {bcRecipients.length > 0 && (
                      <button
                        onClick={() => setBcPreview(!bcPreview)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Eye size={12} /> {bcPreview ? "Ocultar" : "Ver lista"}
                      </button>
                    )}
                  </div>

                  {bcPreview && bcRecipients.length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                      {bcRecipients.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between py-1 text-xs text-gray-600 border-b border-gray-50 last:border-0"
                        >
                          <span>
                            {u.name} {u.lastName}
                          </span>
                          <span className="text-gray-400">{u.email}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setComposingBroadcast(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setBcConfirm(true)}
                      disabled={
                        !bcSubject ||
                        !bcBody.trim() ||
                        bcRecipients.length === 0
                      }
                      className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50"
                    >
                      <Send size={14} /> Enviar a {bcRecipients.length} usuario
                      {bcRecipients.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedBroadcast ? (
              <div className="flex-1 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Megaphone
                    size={18}
                    className="text-amber-500 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {selectedBroadcast.subject}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fmtDateTime(selectedBroadcast.date)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">
                      {selectedBroadcast.recipientCount}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                      Destinatarios
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <ChannelBadge channel={selectedBroadcast.channel} />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1.5">
                      Canal
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs font-semibold text-gray-700">
                      {selectedBroadcast.targetLabel}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                      Segmento
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Contenido del mensaje
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {selectedBroadcast.body}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-16">
                <Megaphone size={40} className="mb-3" />
                <p className="text-sm mb-4">
                  Selecciona un envío para ver su detalle
                </p>
                <button
                  onClick={() => setComposingBroadcast(true)}
                  className="flex items-center gap-2 bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition"
                >
                  <Megaphone size={14} /> Nuevo envío masivo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
