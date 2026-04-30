"use client";

/**
 * Botón "Comprar entrada · Xe€" para fichas de evento.
 *
 * Click → abre `<EventTicketModal>` que pide:
 *   1. Sesión (si hay >1) — sábado o domingo, etc.
 *   2. Cantidad
 *   3. Nombre por asistente
 *
 * El submit del modal añade UNA línea al carrito por sesión, con
 * `meta.attendees`, así una compra de 4 entradas = 4 nombres registrados
 * que viajan al pedido y a la factura.
 *
 * El producto virtual se resuelve vía `getMergedById` del CartContext —
 * el flujo (pago, pedido, factura, IVA, puntos) es el mismo que cualquier
 * otro producto.
 */

import { useState } from "react";
import { Ticket, Check } from "lucide-react";
import { EventTicketModal } from "./EventTicketModal";
import type { Event } from "@/types";

interface Props {
  event: Event;
}

export function AddEventTicketButton({ event }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleAdded() {
    setOpen(false);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2400);
  }

  if (confirmed) {
    return (
      <button
        type="button"
        disabled
        aria-label="Entradas añadidas al carrito"
        className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-emerald-500 bg-gradient-to-r from-white to-emerald-50 px-6 py-3.5 text-sm font-bold text-emerald-700 shadow-[0_2px_12px_rgba(16,185,129,0.28)]"
      >
        <Check size={15} />
        Entradas añadidas
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Comprar entrada para ${event.title}`}
        className="gold-sweep inline-flex items-center gap-2 rounded-xl border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 px-6 py-3.5 text-sm font-bold text-amber-800 shadow-[0_2px_12px_rgba(217,119,6,0.28)] transition-all hover:scale-[1.02] hover:from-amber-50 hover:to-amber-100 hover:shadow-[0_6px_24px_rgba(217,119,6,0.4)] active:scale-[0.98]"
      >
        <Ticket size={15} />
        Comprar entrada · {event.entryFee}€
      </button>

      {open && (
        <EventTicketModal
          event={event}
          onClose={() => setOpen(false)}
          onAdded={handleAdded}
        />
      )}
    </>
  );
}
