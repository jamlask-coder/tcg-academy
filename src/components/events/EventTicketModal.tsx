"use client";

/**
 * Modal para comprar entradas a un evento.
 *
 * Lógica:
 *   - Si el evento tiene >1 sesión (sábado + domingo), el primer paso es
 *     que el usuario elija UNA sesión. Cada sesión tiene su propio stock —
 *     llenarse el sábado no afecta al domingo.
 *   - Selector de cantidad (1..stockRestante de la sesión seleccionada).
 *   - Por cada entrada, un input "Nombre del asistente".
 *   - La primera entrada se prerellena con el nombre del comprador (si está
 *     logueado), pero es editable: el comprador puede comprar para otra
 *     persona si quiere.
 *   - Validamos que todos los nombres estén rellenos antes de permitir
 *     "Añadir al carrito".
 *   - El stock se respeta vía `getLimitForItem` del CartContext, que ya
 *     consulta el producto virtual de la sesión (capacity = stock).
 *   - Si el admin marcó la sesión como "Lleno" en la página del evento,
 *     `eventToVirtualProduct` devuelve stock=0 → la sesión se ve agotada
 *     pero el resto sigue disponible.
 *
 * El submit añade UNA línea al carrito (con la cantidad solicitada y
 * `meta.attendees` con los nombres) usando el virtualId de la SESIÓN.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Ticket,
  User as UserIcon,
  Minus,
  Plus,
  CalendarDays,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  eventVirtualId,
  eventToVirtualProduct,
} from "@/lib/eventProduct";
import type { Event } from "@/types";

interface Props {
  event: Event;
  onClose: () => void;
  onAdded: () => void;
}

const MIN_NAME_LEN = 3;

export function EventTicketModal({ event, onClose, onAdded }: Props) {
  const { addItem, getLimitForItem, items } = useCart();
  const { user } = useAuth();

  const hasMultipleSessions = event.sessions.length > 1;
  const [sessionIdx, setSessionIdx] = useState(0);
  const session = event.sessions[sessionIdx];

  const virtualId = eventVirtualId(event.id, sessionIdx);

  // Stock disponible = capacity − ya en el carrito de este usuario para esta sesión.
  const limitInfo = getLimitForItem(virtualId);
  const inCart =
    items.find((i) => i.product_id === virtualId)?.quantity ?? 0;
  const remaining = Math.max(0, limitInfo.max - inCart);

  // Nombre por defecto del comprador (si lo conocemos).
  const buyerName = useMemo(() => {
    if (!user) return "";
    const parts = [user.name, user.lastName].filter(
      (s): s is string => !!s && s.trim() !== "",
    );
    return parts.join(" ").trim();
  }, [user]);

  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState<string[]>([buyerName]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cambia cantidad y reajusta el array de nombres en una sola operación,
  // evitando un useEffect que dispararía un set-state-in-effect (cascading
  // renders). Toda la mutación va de la mano.
  const setQty = useCallback((next: number) => {
    setQuantity(next);
    setAttendees((prev) => {
      if (prev.length === next) return prev;
      if (prev.length < next) {
        return [...prev, ...Array(next - prev.length).fill("")];
      }
      return prev.slice(0, next);
    });
  }, []);

  // Al cambiar de sesión, reseteamos cantidad a 1 + array de nombres a [buyer].
  // Si la nueva sesión tiene menos stock disponible que el cantidad actual,
  // este reset evita inconsistencias.
  const handleSelectSession = useCallback(
    (idx: number) => {
      setSessionIdx(idx);
      setQuantity(1);
      setAttendees([buyerName]);
      setSubmitError(null);
    },
    [buyerName],
  );

  // Cierre con Escape — UX estándar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-focus el primer input al abrir o al cambiar de sesión.
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    firstInputRef.current?.focus();
    firstInputRef.current?.select();
  }, [sessionIdx]);

  function changeQty(delta: number) {
    const next = quantity + delta;
    if (next < 1) return setQty(1);
    if (next > remaining) return setQty(remaining);
    setQty(next);
  }

  function setName(idx: number, value: string) {
    setAttendees((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function handleSubmit() {
    setSubmitError(null);

    // Validación: todos los nombres rellenos y con longitud mínima.
    const cleaned = attendees.map((n) => n.trim());
    const empty = cleaned.findIndex((n) => n.length < MIN_NAME_LEN);
    if (empty >= 0) {
      setSubmitError(
        `Falta el nombre del asistente ${empty + 1} (mín. ${MIN_NAME_LEN} caracteres).`,
      );
      return;
    }

    const virtual = eventToVirtualProduct(event, sessionIdx);
    const result = addItem(
      virtual.id,
      virtual.name,
      virtual.price,
      virtual.images[0] ?? "",
      quantity,
      { attendees: cleaned },
    );

    if (!result.added) {
      setSubmitError(result.reason ?? "No se pudieron añadir las entradas.");
      return;
    }
    onAdded();
  }

  return (
    <Backdrop onClose={onClose}>
      <Panel onClose={onClose} title="Comprar entradas">
        {/* Encabezado del evento */}
        <div className="mb-5 rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-[13px] font-semibold text-gray-900">
            {event.title}
          </p>
          <p className="text-[12px] text-gray-500">
            {event.entryFee.toFixed(2)}€ por entrada
          </p>
        </div>

        {/* Selector de sesión — solo si hay más de una */}
        {hasMultipleSessions && (
          <>
            <label className="mb-2 block text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              ¿Qué día vas?
            </label>
            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {event.sessions.map((s, idx) => {
                const sessionVirtualId = eventVirtualId(event.id, idx);
                const sessionLimit = getLimitForItem(sessionVirtualId);
                const inCartForSession =
                  items.find((i) => i.product_id === sessionVirtualId)
                    ?.quantity ?? 0;
                const sessionRemaining = Math.max(
                  0,
                  sessionLimit.max - inCartForSession,
                );
                const isFull = sessionRemaining <= 0;
                const isSelected = idx === sessionIdx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => !isFull && handleSelectSession(idx)}
                    disabled={isFull}
                    aria-pressed={isSelected}
                    aria-label={`Sesión ${s.label} ${s.date} a las ${s.time}${isFull ? " (lleno)" : ""}`}
                    className={`flex flex-col items-start gap-1 rounded-xl border-[1.5px] px-3.5 py-3 text-left transition ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/70 shadow-[0_2px_12px_rgba(217,119,6,0.18)]"
                        : isFull
                          ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                          : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/30"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
                      <CalendarDays
                        size={12}
                        className={
                          isSelected ? "text-amber-600" : "text-gray-400"
                        }
                        aria-hidden="true"
                      />
                      {s.label}
                    </span>
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      {s.date} · {s.time}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tracking-wider uppercase tabular-nums ${
                        isFull
                          ? "text-red-600"
                          : sessionRemaining <= 4
                            ? "text-orange-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {isFull
                        ? "Lleno"
                        : `${sessionRemaining} plaza${sessionRemaining === 1 ? "" : "s"}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Resumen de la sesión seleccionada cuando solo hay una */}
        {!hasMultipleSessions && session && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2.5">
            <CalendarDays size={13} className="text-gray-400" aria-hidden="true" />
            <span className="text-[12px] font-semibold text-gray-700">
              {session.label} · {session.date} · {session.time}
            </span>
            <span className="ml-auto text-[11px] font-bold tracking-wider text-emerald-600 uppercase tabular-nums">
              {remaining} plaza{remaining === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {/* Caso sesión llena — mostrar mensaje y nada más */}
        {remaining <= 0 ? (
          <>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-800">
              {inCart > 0
                ? `Ya tienes ${inCart} entrada${inCart > 1 ? "s" : ""} de esta sesión en el carrito.`
                : "Esta sesión está completa."}
              {hasMultipleSessions && (
                <span className="mt-1 block text-[12px] font-medium text-red-700">
                  Selecciona otro día arriba si quieres otra fecha.
                </span>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Selector de cantidad */}
            <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              ¿Cuántas entradas?
            </label>
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => changeQty(-1)}
                disabled={quantity <= 1}
                aria-label="Reducir cantidad"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={15} />
              </button>
              <span className="w-12 text-center text-[18px] font-bold text-gray-900 tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => changeQty(1)}
                disabled={quantity >= remaining}
                aria-label="Aumentar cantidad"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={15} />
              </button>
              <span className="ml-auto text-[13px] font-semibold text-gray-700 tabular-nums">
                {(quantity * event.entryFee).toFixed(2)}€
              </span>
            </div>

            {/* Inputs por asistente */}
            <label className="mb-2 block text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              {quantity === 1
                ? "Nombre del asistente"
                : "Nombre de cada asistente"}
            </label>
            <div className="space-y-2">
              {attendees.map((name, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                    {idx + 1}
                  </span>
                  <UserIcon
                    size={13}
                    className="flex-shrink-0 text-gray-300"
                    aria-hidden="true"
                  />
                  <input
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="text"
                    value={name}
                    onChange={(e) => setName(idx, e.target.value)}
                    placeholder={
                      idx === 0
                        ? buyerName
                          ? "Tu nombre completo"
                          : "Nombre del asistente principal"
                        : `Asistente ${idx + 1}`
                    }
                    aria-label={`Nombre del asistente ${idx + 1}`}
                    maxLength={80}
                    className="w-full bg-transparent py-2.5 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <p className="mt-3 text-[11px] leading-snug text-gray-400">
              La primera entrada se asigna por defecto al comprador. Puedes
              modificar todos los nombres si vienes acompañado.
            </p>

            {submitError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
                {submitError}
              </p>
            )}

            {/* Acciones */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="gold-sweep inline-flex items-center gap-2 rounded-xl border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 shadow-[0_2px_12px_rgba(217,119,6,0.28)] transition hover:scale-[1.02] hover:from-amber-50 hover:to-amber-100"
              >
                <Ticket size={14} />
                Añadir al carrito · {(quantity * event.entryFee).toFixed(2)}€
              </button>
            </div>
          </>
        )}
      </Panel>
    </Backdrop>
  );
}

// ─── Subcomponentes presentacionales ────────────────────────────────────────

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  // Patrón canónico (memo feedback_warning_fix_patterns #1):
  //  - role="presentation" en wrapper no-interactivo
  //  - target === currentTarget para cerrar sólo al clicar el backdrop
  //  - onKeyDown con Escape para satisfacer click-events-have-key-events
  //  - role="dialog" + aria-modal en el panel interno (Panel ya lo expone)
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-ticket-modal-title"
      className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2
          id="event-ticket-modal-title"
          className="text-[15px] font-bold text-gray-900"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={15} />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}
