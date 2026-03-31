"use client"
import Link from "next/link"
import { Bell, Package, Truck, Gift, Star, Megaphone, RefreshCw, Settings, CheckCheck } from "lucide-react"
import { useNotifications } from "@/context/NotificationContext"
import type { Notification } from "@/data/mockData"

const TYPE_CONFIG: Record<Notification["type"], { icon: React.ElementType; color: string; bg: string }> = {
  pedido:    { icon: Package,    color: "text-[#1a3a5c]", bg: "bg-blue-100" },
  envio:     { icon: Truck,      color: "text-green-600", bg: "bg-green-100" },
  cupon:     { icon: Gift,       color: "text-purple-600", bg: "bg-purple-100" },
  puntos:    { icon: Star,       color: "text-amber-600", bg: "bg-amber-100" },
  oferta:    { icon: Megaphone,  color: "text-red-500", bg: "bg-red-100" },
  devolucion:{ icon: RefreshCw,  color: "text-orange-600", bg: "bg-orange-100" },
  sistema:   { icon: Settings,   color: "text-gray-500", bg: "bg-gray-100" },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Hoy"
  if (days === 1) return "Ayer"
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`
  return `Hace ${Math.floor(days / 30)} meses`
}

export default function NotificacionesPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={22} className="text-[#1a3a5c]" />
            Notificaciones
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount === 0 ? "Todo al día" : `${unreadCount} sin leer`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#1a3a5c] hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-[#1a3a5c]/20 transition min-h-[44px]"
          >
            <CheckCheck size={16} /> Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Bell size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type]
            const Icon = config.icon
            return (
              <div
                key={notif.id}
                className={`bg-white border rounded-2xl p-4 transition flex gap-4 ${
                  !notif.read ? "border-[#1a3a5c]/20 shadow-sm" : "border-gray-200"
                }`}
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}>
                  <Icon size={20} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className={`text-sm font-bold leading-snug ${notif.read ? "text-gray-700" : "text-gray-900"}`}>
                      {notif.title}
                      {!notif.read && (
                        <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full align-middle" />
                      )}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo(notif.date)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => markRead(notif.id)}
                        className="text-xs font-semibold text-[#1a3a5c] hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    )}
                    {!notif.read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
