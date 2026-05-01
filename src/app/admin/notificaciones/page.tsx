"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Package,
  AlertTriangle,
  Building2,
  MessageSquare,
  UserPlus,
  CheckCheck,
  Store,
  Package2,
} from "lucide-react";
import { readAdminOrdersMerged, isStatsCountableOrder } from "@/lib/orderAdapter";
import { loadIncidents } from "@/services/incidentService";
import { loadMessages as loadAllMessages } from "@/services/messageService";
import { loadSolicitudes } from "@/services/solicitudService";
import type { Incident } from "@/types/incident";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminNotifType =
  | "pedido_nuevo"
  | "incidencia_nueva"
  | "solicitud_b2b"
  | "solicitud_franquicia"
  | "solicitud_vending"
  | "mensaje_usuario"
  | "registro_nuevo";

interface AdminNotification {
  id: string;
  type: AdminNotifType;
  title: string;
  message: string;
  date: string;
  link: string;
  sourceId: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  AdminNotifType,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  pedido_nuevo: {
    icon: Package,
    color: "text-[#2563eb]",
    bg: "bg-blue-100",
    label: "Nuevo pedido",
  },
  incidencia_nueva: {
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-100",
    label: "Incidencia",
  },
  solicitud_b2b: {
    icon: Building2,
    color: "text-[#2563eb]",
    bg: "bg-blue-100",
    label: "Solicitud B2B",
  },
  solicitud_franquicia: {
    icon: Store,
    color: "text-teal-600",
    bg: "bg-teal-100",
    label: "Solicitud franquicia",
  },
  solicitud_vending: {
    icon: Package2,
    color: "text-purple-600",
    bg: "bg-purple-100",
    label: "Solicitud vending",
  },
  mensaje_usuario: {
    icon: MessageSquare,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "Mensaje",
  },
  registro_nuevo: {
    icon: UserPlus,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "Nuevo usuario",
  },
};

const READ_KEY = "tcgacademy_admin_notifs_read";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  return `Hace ${Math.floor(days / 30)} meses`;
}

function loadReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

interface RegisteredUser {
  password: string;
  user: { id: string; name: string; lastName: string; email: string; createdAt: string };
}

// ─── Build notifications from live data ───────────────────────────────────────

async function fetchRecentRegisteredUsers(): Promise<
  { id: string; name: string; lastName: string; email: string; createdAt: string }[]
> {
  const isServerMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "server";

  if (isServerMode) {
    try {
      const res = await fetch("/api/admin/users?limit=200", {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        ok: boolean;
        users: { id: string; name: string; lastName: string; email: string; registeredAt: string }[];
      };
      return (data.users ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        lastName: u.lastName,
        email: u.email,
        createdAt: u.registeredAt,
      }));
    } catch {
      return [];
    }
  }

  // Local-mode dev fallback
  try {
    const raw = localStorage.getItem("tcgacademy_registered");
    if (!raw) return [];
    const registered: Record<string, RegisteredUser> = JSON.parse(raw);
    return Object.values(registered).map((e) => ({
      id: e.user.id,
      name: e.user.name,
      lastName: e.user.lastName,
      email: e.user.email,
      createdAt: e.user.createdAt,
    }));
  } catch {
    return [];
  }
}

async function buildAdminNotifications(): Promise<AdminNotification[]> {
  const notifs: AdminNotification[] = [];

  // 1. Pedidos pendientes de envío (acción del cliente, no del admin)
  try {
    // Merge: incluye pedidos del checkout aunque el mirror al inbox fallara.
    // Incluimos heredados (carry-over) — son envíos reales que el admin
    // tiene que gestionar aunque la factura sea de la SL anterior.
    const orders = readAdminOrdersMerged().filter(isStatsCountableOrder);
    orders
      .filter((o) => o.adminStatus === "pendiente_envio")
      .forEach((o) => {
        const roleLabel =
          o.userRole === "mayorista"
            ? " (mayorista)"
            : o.userRole === "tienda"
              ? " (tienda)"
              : "";
        notifs.push({
          id: `pedido-${o.id}`,
          type: "pedido_nuevo",
          title: `Nuevo pedido ${o.id}`,
          message: `${o.userName}${roleLabel} — ${o.total.toFixed(2)}€ · ${o.items.length} artículo${o.items.length !== 1 ? "s" : ""}`,
          date: o.statusHistory[0]?.date ?? o.date,
          link: "/admin/pedidos",
          sourceId: o.id,
        });
      });
  } catch {
    /* ignore */
  }

  // 2. Incidencias nuevas (abiertas por el cliente)
  try {
    const incidents: Incident[] = loadIncidents();
    incidents
      .filter((i) => i.status === "nueva")
      .forEach((i) => {
        notifs.push({
          id: `incidencia-${i.id}`,
          type: "incidencia_nueva",
          title: `Nueva incidencia: ${i.typeLabel}`,
          message: `${i.userName} (${i.userEmail}) — Pedido ${i.orderId}`,
          date: i.createdAt,
          link: "/admin/incidencias",
          sourceId: i.id,
        });
      });
  } catch {
    /* ignore */
  }

  // 3. Solicitudes nuevas (B2B, franquicia, vending)
  try {
    const sols = loadSolicitudes();
    sols
      .filter((s) => s.estado === "nueva")
      .forEach((s) => {
        const tipoMap = {
          b2b: "solicitud_b2b",
          franquicia: "solicitud_franquicia",
          vending: "solicitud_vending",
        } as const;
        const tipoLabel = {
          b2b: "Distribuidor B2B",
          franquicia: "Franquicia TCG",
          vending: "Vending TCG",
        };
        const contact =
          (s.datos.razonSocial as string) ||
          (s.datos.nombre as string) ||
          (s.datos.emailContacto as string) ||
          (s.datos.email as string) ||
          "Sin nombre";
        notifs.push({
          id: `solicitud-${s.id}`,
          type: tipoMap[s.tipo],
          title: `Nueva solicitud: ${tipoLabel[s.tipo]}`,
          message: contact,
          date: s.fechaSolicitud,
          link: "/admin/solicitudes",
          sourceId: s.id,
        });
      });
  } catch {
    /* ignore */
  }

  // 4. Mensajes de usuarios al admin (no los que envía el admin).
  // Fuente única: messageService → evento canónico `tcga:messages:updated`.
  try {
    loadAllMessages()
      .filter((m) => m.toUserId === "admin" && !m.read)
      .forEach((m) => {
        notifs.push({
          id: `mensaje-${m.id}`,
          type: "mensaje_usuario",
          title: `Mensaje de ${m.fromName}`,
          message: m.subject,
          date: m.date,
          link: "/admin/mensajes",
          sourceId: m.id,
        });
      });
  } catch {
    /* ignore */
  }

  // 5. Registros recientes (últimos 7 días)
  try {
    const recentUsers = await fetchRecentRegisteredUsers();
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    recentUsers.forEach((u) => {
      const created = new Date(u.createdAt).getTime();
      if (Number.isFinite(created) && created > sevenDaysAgo) {
        notifs.push({
          id: `registro-${u.id}`,
          type: "registro_nuevo",
          title: "Nuevo registro de usuario",
          message: `${u.name} ${u.lastName} (${u.email})`,
          date: u.createdAt,
          link: "/admin/usuarios",
          sourceId: u.id,
        });
      }
    });
  } catch {
    /* ignore */
  }

  // Sort by date descending
  notifs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return notifs;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNotificacionesPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const next = await buildAdminNotifications();
    setNotifications(next);
    setReadIds(loadReadIds());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = setInterval(() => void refresh(), 5000);
    const onStorage = () => void refresh();
    const onIncidents = () => void refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("tcga:incidents:updated", onIncidents);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tcga:incidents:updated", onIncidents);
    };
  }, [refresh]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    // merge with existing
    const prev = loadReadIds();
    allIds.forEach((id) => prev.add(id));
    saveReadIds(prev);
    setReadIds(prev);
  };

  // Group: unread first, then read
  const unread = notifications.filter((n) => !readIds.has(n.id));
  const read = notifications.filter((n) => readIds.has(n.id));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Bell size={22} className="text-[#2563eb]" />
            Notificaciones
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount === 0
              ? "Todo al día — no hay acciones pendientes"
              : `${unreadCount} pendiente${unreadCount !== 1 ? "s" : ""} de atención`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#2563eb]/20 px-4 py-2.5 text-sm font-semibold text-[#2563eb] transition hover:bg-blue-50"
          >
            <CheckCheck size={16} /> Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center">
          <Bell size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-bold text-gray-700">No hay notificaciones</p>
          <p className="mt-1 text-sm text-gray-500">
            Aquí aparecerán los pedidos, incidencias, solicitudes y mensajes que
            requieran tu atención
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unread */}
          {unread.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                Pendientes ({unread.length})
              </h2>
              <div className="space-y-2">
                {unread.map((notif) => (
                  <NotifCard
                    key={notif.id}
                    notif={notif}
                    isRead={false}
                    onMarkRead={markRead}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Read */}
          {read.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                Leídas ({read.length})
              </h2>
              <div className="space-y-2">
                {read.map((notif) => (
                  <NotifCard
                    key={notif.id}
                    notif={notif}
                    isRead={true}
                    onMarkRead={markRead}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NotifCard({
  notif,
  isRead,
  onMarkRead,
}: {
  notif: AdminNotification;
  isRead: boolean;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notif.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex gap-4 rounded-2xl border bg-white p-4 transition ${
        !isRead ? "border-[#2563eb]/20 shadow-sm" : "border-gray-200 opacity-75"
      }`}
    >
      <div
        className={`mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}
      >
        <Icon size={20} className={config.color} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{
                backgroundColor: `${config.bg.replace("bg-", "").includes("blue") ? "#dbeafe" : config.bg.includes("red") ? "#fee2e2" : config.bg.includes("teal") ? "#ccfbf1" : config.bg.includes("purple") ? "#f3e8ff" : config.bg.includes("amber") ? "#fef3c7" : config.bg.includes("green") ? "#dcfce7" : "#f3f4f6"}`,
              }}
            >
              {config.label}
            </span>
            <p
              className={`text-sm leading-snug font-bold ${isRead ? "text-gray-500" : "text-gray-900"}`}
            >
              {notif.title}
              {!isRead && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />
              )}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs whitespace-nowrap text-gray-400">
            {timeAgo(notif.date)}
          </span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
          {notif.message}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href={notif.link}
            onClick={() => onMarkRead(notif.id)}
            className="text-xs font-semibold text-[#2563eb] hover:underline"
          >
            Ver detalle →
          </Link>
          {!isRead && (
            <button
              onClick={() => onMarkRead(notif.id)}
              className="text-xs text-gray-400 transition hover:text-gray-600"
            >
              Marcar como leída
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
