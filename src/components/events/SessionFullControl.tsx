"use client";

/**
 * Control compacto de "lleno" por sesión:
 *   - Visible a todos: badge "Lleno" cuando el admin marcó la sesión.
 *   - Visible sólo a admin: botón toggle "Marcar lleno" / "Reabrir".
 *
 * Caso de uso: alguien se apunta presencialmente en la tienda y el admin
 * cierra ese día desde la página del evento sin tocar el aforo programado.
 */

import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import {
  isSessionMarkedFull,
  markSessionFull,
  unmarkSessionFull,
} from "@/services/eventSessionStatusService";
import { useAuth } from "@/context/AuthContext";
import * as DataHub from "@/lib/dataHub";

interface Props {
  eventId: number;
  sessionIdx: number;
  /** Color de acento del evento — usado en el badge para coherencia visual. */
  accent?: string;
}

export function SessionFullControl({ eventId, sessionIdx }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isFull, setIsFull] = useState(() =>
    isSessionMarkedFull(eventId, sessionIdx),
  );

  // Sincroniza si otra pestaña/admin cambia el estado.
  useEffect(() => {
    const reload = () => setIsFull(isSessionMarkedFull(eventId, sessionIdx));
    reload();
    return DataHub.on("event_sessions", reload);
  }, [eventId, sessionIdx]);

  function handleToggle() {
    if (!isAdmin) return;
    if (isFull) {
      unmarkSessionFull(eventId, sessionIdx);
    } else {
      markSessionFull(eventId, sessionIdx);
    }
  }

  // Si no hay nada que mostrar, devolver null para no romper el grid del padre.
  if (!isFull && !isAdmin) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      {isFull && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-red-700 uppercase">
          <Lock size={9} aria-hidden="true" />
          Lleno
        </span>
      )}
      {isAdmin && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={
            isFull
              ? "Reabrir esta sesión a ventas online"
              : "Marcar esta sesión como llena"
          }
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] uppercase transition ${
            isFull
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-gray-300 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          {isFull ? (
            <>
              <Unlock size={9} aria-hidden="true" />
              Reabrir
            </>
          ) : (
            <>
              <Lock size={9} aria-hidden="true" />
              Marcar lleno
            </>
          )}
        </button>
      )}
    </div>
  );
}
