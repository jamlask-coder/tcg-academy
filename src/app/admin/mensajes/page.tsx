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
  MSG_STORAGE_KEY,
  BROADCAST_STORAGE_KEY,
  type AppMessage,
  type AdminUser,
  type Broadcast,
  type BroadcastChannel,
  type BroadcastTarget,
} from "@/data/mockData";

const MOCK_USERS: AdminUser[] = [];
import {
  sendMessage as sendCanonicalMessage,
  markAsRead as markMessageAsRead,
} from "@/services/messageService";
import { DataHub } from "@/lib/dataHub";
import { clickableProps } from "@/lib/a11y";

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
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(MSG_STORAGE_KEY);
    const local: AppMessage[] = saved ? JSON.parse(saved) : [];
    return local.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function loadBroadcasts(): Broadcast[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(BROADCAST_STORAGE_KEY);
    const local: Broadcast[] = saved ? JSON.parse(saved) : [];
    return local.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
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
      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(loadMessages());

    setBroadcasts(loadBroadcasts());
    const unsub = DataHub.on("messages", () => {
      setMessages(loadMessages());
    });
    return unsub;
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
      // Replica al servidor en server-mode + emite evento (re-hidrata UI).
      markMessageAsRead(msg.id);
    }
  };

  const handleReply = () => {
    if (!selected || !replyBody.trim()) return;
    sendCanonicalMessage({
      fromUserId: "admin",
      toUserId: selected.fromUserId,
      fromName: "TCG Academy",
      toName: selected.fromName,
      subject: `Re: ${selected.subject}`,
      body: replyBody,
      parentId: selected.id,
    });
    setReplyBody("");
    showToast(`Respuesta enviada a ${selected.fromName}`);
  };

  const handleNewMessage = () => {
    if (!toUser || !subject || !body.trim()) return;
    const recipient = MOCK_USERS.find((u) => u.id === toUser);
    if (!recipient) return;
    sendCanonicalMessage({
      fromUserId: "admin",
      toUserId: toUser,
      fromName: "TCG Academy",
      toName: `${recipient.name} ${recipient.lastName}`,
      subject,
      body,
    });
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

    // Create individual AppMessages for internal/both channel.
    // Cada mensaje pasa por sendCanonicalMessage → escribe LS, emite el
    // evento `tcga:messages:updated` (la UI se rehidrata via DataHub) y
    // replica al backend en server-mode. La metadata `isBroadcast`/
    // `broadcastId` queda en el cache local (la tabla BD no tiene esas
    // columnas todavía), así que el icono de megáfono aparece en este
    // dispositivo y en otros admins se verá como mensaje normal.
    if (bcChannel === "interno" || bcChannel === "ambos") {
      for (const u of bcRecipients) {
        sendCanonicalMessage({
          id: `msg-${bcId}-${u.id}`,
          fromUserId: "admin",
          toUserId: u.id,
          fromName: "TCG Academy",
          toName: `${u.name} ${u.lastName}`,
          subject: bcSubject,
          body: bcBody,
          isBroadcast: true,
          broadcastId: bcId,
        });
      }
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
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          <Check size={14} className="text-green-300" /> {toast}
        </div>
      )}

      {/* Confirm modal */}
      {bcConfirm && (
        <div
          {...clickableProps(() => setBcConfirm(false))}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            {...clickableProps((e) => e?.stopPropagation())}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-3 flex items-center gap-2">
              <Megaphone size={18} className="text-[#2563eb]" />
              <h3 className="font-bold text-gray-900">
                Confirmar envío masivo
              </h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              ¿Enviar <strong>&quot;{bcSubject}&quot;</strong> a{" "}
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
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendBroadcast}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-2.5 text-sm font-bold text-white hover:bg-[#3b82f6]"
              >
                <Send size={14} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            Mensajes
            {unread > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-sm font-bold text-white">
                {unread}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
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
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
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
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#3b82f6]"
          >
            <PenSquare size={15} /> Nuevo mensaje
          </button>
        </div>
      </div>

      {/* View selector */}
      <div className="mb-4 flex gap-2">
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
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${view === id ? "bg-[#2563eb] text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Individual messages view ─── */}
      {view === "individual" && (
        <div className="grid min-h-[500px] gap-4 lg:grid-cols-[300px_1fr]">
          {/* Left list */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="space-y-2 border-b border-gray-100 p-3">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-200 py-1.5 pr-3 pl-8 text-xs focus:border-[#2563eb] focus:outline-none"
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
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${tab === id ? "bg-[#2563eb] text-white" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    {lbl}
                    {id === "inbox" && unread > 0 && (
                      <span className="ml-1 rounded-full bg-red-500 px-1 text-[9px] text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
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
                    className={`w-full p-3 text-left transition hover:bg-gray-50 ${selected?.id === msg.id ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                          )}
                          {msg.isBroadcast && (
                            <Megaphone
                              size={10}
                              className="flex-shrink-0 text-amber-500"
                            />
                          )}
                          <p
                            className={`truncate text-xs ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}
                          >
                            {isIncoming ? msg.fromName : msg.toName}
                          </p>
                        </div>
                        <p
                          className={`mt-0.5 truncate text-xs ${isUnread ? "font-semibold text-gray-700" : "text-gray-500"}`}
                        >
                          {msg.subject}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-gray-400">
                          {msg.body.substring(0, 50)}…
                        </p>
                      </div>
                      <span className="mt-0.5 flex-shrink-0 text-[10px] text-gray-400">
                        {fmtDate(msg.date)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right detail / compose */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {composingIndividual ? (
              <div className="flex-1 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold text-gray-900">
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
                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                      Destinatario
                    </label>
                    <select
                      value={toUser}
                      onChange={(e) => setToUser(e.target.value)}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-[#2563eb] focus:outline-none"
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
                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                      Asunto
                    </label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={200}
                      className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                      Mensaje
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      maxLength={2000}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setComposingIndividual(false)}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleNewMessage}
                      disabled={!toUser || !subject || !body.trim()}
                      className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#3b82f6] disabled:opacity-50"
                    >
                      <Send size={14} /> Enviar
                    </button>
                  </div>
                </div>
              </div>
            ) : selected ? (
              <div className="flex flex-1 flex-col">
                <div className="border-b border-gray-100 px-6 py-4">
                  <div className="flex items-start gap-2">
                    {selected.isBroadcast && (
                      <Megaphone
                        size={14}
                        className="mt-0.5 flex-shrink-0 text-amber-500"
                      />
                    )}
                    <h3 className="text-base font-bold text-gray-900">
                      {selected.subject}
                    </h3>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
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
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                      Pedido: {selected.orderId}
                    </span>
                  )}
                  {selected.isBroadcast && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                      <Megaphone size={9} /> Mensaje masivo
                    </span>
                  )}
                </div>
                <div className="flex-1 px-6 py-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line text-gray-700">
                    {selected.body}
                  </p>
                </div>
                {selected.toUserId === "admin" && (
                  <div className="space-y-2 border-t border-gray-100 px-6 py-4">
                    <p className="text-xs font-semibold text-gray-500">
                      Responder
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
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-gray-300">
                <MessageSquare size={40} className="mb-3" />
                <p className="text-sm">Selecciona un mensaje para leerlo</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Broadcast / mass messaging view ─── */}
      {view === "masivo" && (
        <div className="grid min-h-[500px] gap-4 lg:grid-cols-[320px_1fr]">
          {/* Left: broadcast list */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                Historial de envíos masivos
              </p>
              <span className="text-xs text-gray-400">
                {broadcasts.length} envíos
              </span>
            </div>
            <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
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
                  className={`w-full p-3 text-left transition hover:bg-gray-50 ${selectedBroadcast?.id === bc.id ? "bg-amber-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800">
                        {bc.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <ChannelBadge channel={bc.channel} />
                        <span className="text-[10px] text-gray-400">
                          {bc.targetLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        <Users size={9} className="mr-0.5 inline" />
                        {bc.recipientCount} usuarios · {fmtDate(bc.date)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: broadcast detail or compose */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {composingBroadcast ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold text-gray-900">
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
                    <label className="mb-2 block text-xs font-bold tracking-wide text-gray-600 uppercase">
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
                          className={`rounded-xl border-2 px-3 py-2.5 text-left text-xs font-semibold transition ${bcTarget === t.id ? "border-[#2563eb] bg-blue-50 text-[#2563eb]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                        >
                          {t.label}
                          {bcTarget === t.id && t.id !== "manual" && (
                            <span className="mt-0.5 block text-[10px] font-normal text-gray-400">
                              {getTargetUsers(t.id, [], today).length} usuarios
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Manual selection */}
                    {bcTarget === "manual" && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                        <div className="border-b border-gray-100 p-2">
                          <div className="relative">
                            <Search
                              size={12}
                              className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
                            />
                            <input
                              value={bcManualSearch}
                              onChange={(e) =>
                                setBcManualSearch(e.target.value)
                              }
                              placeholder="Buscar usuario..."
                              maxLength={100}
                              className="w-full py-1.5 pr-3 pl-7 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-40 divide-y divide-gray-50 overflow-y-auto">
                          {filteredManualUsers.map((u) => (
                            <label
                              key={u.id}
                              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
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
                                className="h-3.5 w-3.5 accent-[#2563eb]"
                              />
                              <span className="text-xs text-gray-700">
                                {u.name} {u.lastName}
                              </span>
                              <span className="ml-auto text-[10px] text-gray-400">
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
                    <label className="mb-2 block text-xs font-bold tracking-wide text-gray-600 uppercase">
                      Canal de envío
                    </label>
                    <div className="space-y-2">
                      {CHANNEL_OPTIONS.map((c) => (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${bcChannel === c.id ? "border-[#2563eb] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                        >
                          <input
                            type="radio"
                            name="bcChannel"
                            value={c.id}
                            checked={bcChannel === c.id}
                            onChange={() => setBcChannel(c.id)}
                            className="accent-[#2563eb]"
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
                    <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-600 uppercase">
                      Asunto
                    </label>
                    <input
                      value={bcSubject}
                      onChange={(e) => setBcSubject(e.target.value)}
                      maxLength={200}
                      placeholder="Ej: Nuevas expansiones disponibles"
                      className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-600 uppercase">
                      Mensaje
                    </label>
                    <textarea
                      value={bcBody}
                      onChange={(e) => setBcBody(e.target.value)}
                      rows={6}
                      maxLength={2000}
                      placeholder="Escribe el mensaje para tus usuarios..."
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none"
                    />
                    <p className="mt-1 text-right text-[10px] text-gray-400">
                      {bcBody.length}/2000
                    </p>
                  </div>

                  {/* Counter / preview */}
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 ${bcRecipients.length > 0 ? "border border-blue-100 bg-blue-50" : "border border-gray-200 bg-gray-50"}`}
                  >
                    <Info
                      size={14}
                      className={
                        bcRecipients.length > 0
                          ? "text-blue-500"
                          : "text-gray-400"
                      }
                    />
                    <p className="flex-1 text-sm text-gray-700">
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
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Eye size={12} /> {bcPreview ? "Ocultar" : "Ver lista"}
                      </button>
                    )}
                  </div>

                  {bcPreview && bcRecipients.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 p-3">
                      {bcRecipients.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between border-b border-gray-50 py-1 text-xs text-gray-600 last:border-0"
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
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
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
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      <Send size={14} /> Enviar a {bcRecipients.length} usuario
                      {bcRecipients.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedBroadcast ? (
              <div className="flex-1 p-6">
                <div className="mb-4 flex items-start gap-3">
                  <Megaphone
                    size={18}
                    className="mt-0.5 flex-shrink-0 text-amber-500"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedBroadcast.subject}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {fmtDateTime(selectedBroadcast.date)}
                    </p>
                  </div>
                </div>
                <div className="mb-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">
                      {selectedBroadcast.recipientCount}
                    </p>
                    <p className="mt-0.5 text-[10px] tracking-wide text-gray-500 uppercase">
                      Destinatarios
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <ChannelBadge channel={selectedBroadcast.channel} />
                    <p className="mt-1.5 text-[10px] tracking-wide text-gray-500 uppercase">
                      Canal
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xs font-semibold text-gray-700">
                      {selectedBroadcast.targetLabel}
                    </p>
                    <p className="mt-0.5 text-[10px] tracking-wide text-gray-500 uppercase">
                      Segmento
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Contenido del mensaje
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-gray-700">
                    {selectedBroadcast.body}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-gray-300">
                <Megaphone size={40} className="mb-3" />
                <p className="mb-4 text-sm">
                  Selecciona un envío para ver su detalle
                </p>
                <button
                  onClick={() => setComposingBroadcast(true)}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
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
