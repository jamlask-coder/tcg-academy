"use client";
import Link from "next/link";
import {
  Bell,
  Package,
  Truck,
  Gift,
  Star,
  Megaphone,
  RefreshCw,
  Settings,
  CheckCheck,
  Users,
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import type { Notification } from "@/data/mockData";

const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: React.ElementType; color: string; bg: string }
> = {
  pedido: { icon: Package, color: "text-[#2563eb]", bg: "bg-blue-100" },
  envio: { icon: Truck, color: "text-green-600", bg: "bg-green-100" },
  cupon: { icon: Gift, color: "text-purple-600", bg: "bg-purple-100" },
  puntos: { icon: Star, color: "text-amber-600", bg: "bg-amber-100" },
  oferta: { icon: Megaphone, color: "text-red-500", bg: "bg-red-100" },
  devolucion: {
    icon: RefreshCw,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  sistema: { icon: Settings, color: "text-gray-500", bg: "bg-gray-100" },
  asociacion: { icon: Users, color: "text-[#2563eb]", bg: "bg-blue-100" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  return `Hace ${Math.floor(days / 30)} meses`;
}

export default function AdminNotificacionesPage() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();

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
            {unreadCount === 0 ? "Todo al día" : `${unreadCount} sin leer`}
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
          <p className="text-gray-500">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type];
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`flex gap-4 rounded-2xl border bg-white p-4 transition ${
                  !notif.read
                    ? "border-[#2563eb]/20 shadow-sm"
                    : "border-gray-200"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}
                >
                  <Icon size={20} className={config.color} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-snug font-bold ${notif.read ? "text-gray-700" : "text-gray-900"}`}
                    >
                      {notif.title}
                      {!notif.read && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />
                      )}
                    </p>
                    <span className="flex-shrink-0 text-xs whitespace-nowrap text-gray-400">
                      {timeAgo(notif.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
                    {notif.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => markRead(notif.id)}
                        className="text-xs font-semibold text-[#2563eb] hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    )}
                    {!notif.read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        className="text-xs text-gray-400 transition hover:text-gray-600"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
