"use client";

/**
 * SendPointsModal — regalo manual de puntos desde el panel admin.
 *
 * Antes el botón "Enviar puntos" del perfil de usuario llevaba a /admin/bonos
 * (configuración global del programa). Eso es la pantalla equivocada para un
 * gesto puntual hacia un cliente concreto. Aquí abrimos un modal con:
 *   - Nombre del cliente (no se puede equivocar de destino).
 *   - Casilla de puntos (positivo, entero, hasta 1.000.000).
 *   - Motivo opcional (queda en el historial del cliente).
 *
 * Al confirmar: `giftPoints()` añade el saldo + escribe history type "regalo".
 * Disponible inmediatamente (sin hold de 14 días — es un detalle, no fidelidad).
 */

import { useState, useCallback } from "react";
import { Star, X, Send, CheckCircle } from "lucide-react";
import { giftPoints } from "@/services/pointsService";
import { sendAppEmail } from "@/services/emailService";

interface SendPointsProps {
  userId: string;
  userName: string;
  userLastName: string;
  userEmail: string;
}

export function SendPointsButton(props: SendPointsProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-[#0a1628] shadow-md transition hover:bg-amber-300 active:scale-95"
      >
        <Star size={16} />
        Enviar puntos
      </button>
      {open && <SendPointsModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function SendPointsModal({
  userId,
  userName,
  userLastName,
  userEmail,
  onClose,
}: SendPointsProps & { onClose: () => void }) {
  const [pointsStr, setPointsStr] = useState("1000");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const points = Math.floor(Number(pointsStr) || 0);
  // Limitar a 1M para que un dedo en un cero extra no convierta la cuenta del
  // cliente en un saldo absurdo. Si en el futuro hace falta más, se sube.
  const canSend = points > 0 && points <= 1_000_000;

  const handleSend = useCallback(async () => {
    if (!canSend || sending) return;
    setSending(true);
    try {
      const res = giftPoints(userId, points, note);
      if (!res.ok) {
        setSending(false);
        return;
      }

      // Email al destinatario para que sepa que tiene puntos nuevos.
      // Usa la plantilla canónica `puntos_anadidos` (editable en /admin/emails).
      // Pasa por sendAppEmail → en server-mode proxifica a /api/admin/email/send
      // y sale por Resend; en local-mode queda en el log.
      const reason = note.trim()
        ? note.trim()
        : "Como agradecimiento por confiar en nosotros.";
      const shopUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://tcgacademy.es";

      await sendAppEmail({
        toEmail: userEmail,
        toName: `${userName} ${userLastName}`.trim(),
        templateId: "puntos_anadidos",
        vars: {
          nombre: userName,
          points: points.toLocaleString("es-ES"),
          reason,
          current_balance: res.balance.toLocaleString("es-ES"),
          redeem_url: `${shopUrl}/cuenta/puntos`,
        },
        preview: `+${points.toLocaleString("es-ES")} pts añadidos`,
      });

      setSent(true);
    } catch {
      setSending(false);
    }
  }, [canSend, sending, userId, points, note, userEmail, userName, userLastName]);

  if (sent) {
    return (
      <ModalWrapper onClose={onClose}>
        <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Puntos enviados
          </h3>
          <p className="text-sm text-gray-500">
            Se han añadido{" "}
            <span className="font-bold text-amber-600">
              {points.toLocaleString("es-ES")} pts
            </span>{" "}
            al saldo de{" "}
            <span className="font-semibold text-gray-700">
              {userName} {userLastName}
            </span>
            .
          </p>
          <button
            onClick={onClose}
            className="mt-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Star size={18} className="text-amber-500" />
            Enviar puntos
          </h2>
          <p className="text-xs text-gray-400">
            Para:{" "}
            <span className="font-semibold text-gray-600">
              {userName} {userLastName}
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-5 px-6 py-5">
        <div>
          <label
            htmlFor="gift-points-amount"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500"
          >
            Puntos a regalar
          </label>
          <div className="relative">
            <input
              id="gift-points-amount"
              type="number"
              min={1}
              max={1_000_000}
              step={1}
              value={pointsStr}
              onChange={(e) => setPointsStr(e.target.value)}
              autoFocus
              className="h-12 w-full rounded-xl border-2 border-gray-200 pl-4 pr-16 text-xl font-bold text-gray-900 transition focus:border-amber-500 focus:outline-none"
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold text-gray-400">
              pts
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Referencia: 10.000 pts = 1 € de descuento al canjear.
          </p>
        </div>

        <div>
          <label
            htmlFor="gift-points-note"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500"
          >
            Motivo{" "}
            <span className="normal-case font-normal text-gray-400">
              (opcional, lo verá el cliente en su historial)
            </span>
          </label>
          <input
            id="gift-points-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            placeholder="Ej: Disculpa por el retraso del último pedido"
            className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 transition focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-[#0a1628] shadow-md transition hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        >
          <Send size={15} />
          {sending ? "Enviando…" : `Enviar ${points.toLocaleString("es-ES")} pts`}
        </button>
      </div>
    </ModalWrapper>
  );
}

function ModalWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {children}
      </div>
    </div>
  );
}
