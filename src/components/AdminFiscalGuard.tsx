"use client";
/**
 * AdminFiscalGuard — Ejecuta el autopilot fiscal + notificaciones al entrar al admin.
 *
 * Se ejecuta en background cuando cualquier página admin se carga.
 * Notificaciones fiscales SOLO se muestran a Luri (responsable fiscal).
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, X, Calendar, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface AlertItem {
  id: string;
  type: "ok" | "warning" | "critical" | "fiscal";
  message: string;
  link?: string;
}

export function AdminFiscalGuard() {
  const hasRun = useRef(false);
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    if (hasRun.current || !user) return;
    hasRun.current = true;

    void (async () => {
      const newAlerts: AlertItem[] = [];

      // 1. Fiscal autopilot (for all admins)
      try {
        const { runFiscalAutopilot } = await import("@/lib/fiscalAutopilot");
        const report = await runFiscalAutopilot();

        if (report.finalStatus === "critical") {
          newAlerts.push({
            id: "autopilot",
            type: "critical",
            message: `Autopilot fiscal: ${report.summary}`,
            link: "/admin/fiscal/control",
          });
        } else if (report.issuesRepaired > 0) {
          newAlerts.push({
            id: "autopilot",
            type: "ok",
            message: `Autopilot: ${report.issuesRepaired} incidencia(s) reparada(s).`,
          });
        }
      } catch { /* non-critical */ }

      // 2. Fiscal deadline notifications (ONLY for Luri)
      try {
        const { isFiscalResponsible, checkFiscalDeadlines, getPendingFiscalNotifications } = await import("@/lib/fiscalNotifications");
        if (isFiscalResponsible(user.id)) {
          checkFiscalDeadlines();
          const pending = getPendingFiscalNotifications();
          const overdue = pending.filter((n) => n.severity === "overdue");
          const urgent = pending.filter((n) => n.severity === "urgent");

          if (overdue.length > 0) {
            newAlerts.push({
              id: "fiscal-overdue",
              type: "critical",
              message: `${overdue.length} modelo(s) fiscal(es) VENCIDO(S): ${overdue.map((n) => n.modelo).join(", ")}`,
              link: "/admin/fiscal/calendario",
            });
          } else if (urgent.length > 0) {
            newAlerts.push({
              id: "fiscal-urgent",
              type: "warning",
              message: `${urgent.length} modelo(s) con plazo en menos de 5 días`,
              link: "/admin/fiscal/calendario",
            });
          }
        }
      } catch { /* non-critical */ }

      setAlerts(newAlerts);

      // Auto-dismiss "ok" alerts after 8s
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.type !== "ok"));
      }, 8000);
    })();
  }, [user]);

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
            alert.type === "critical"
              ? "border-red-200 bg-red-50 text-red-800"
              : alert.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : alert.type === "fiscal"
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {alert.type === "critical" ? (
            <AlertTriangle size={18} className="flex-shrink-0" />
          ) : alert.type === "warning" ? (
            <Bell size={18} className="flex-shrink-0" />
          ) : alert.type === "fiscal" ? (
            <Calendar size={18} className="flex-shrink-0" />
          ) : (
            <CheckCircle size={18} className="flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">{alert.message}</p>
            {alert.link && (
              <Link href={alert.link} className="text-xs font-semibold underline">
                Ver detalle
              </Link>
            )}
          </div>
          <button
            onClick={() => dismiss(alert.id)}
            className="flex-shrink-0 rounded p-1 transition hover:bg-black/5"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
