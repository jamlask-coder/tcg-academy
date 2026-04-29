"use client";
/**
 * SendMessageModal — admin envía un mensaje directo a un usuario.
 *
 * Flujo:
 *   1. Crea un AppMessage en la bandeja interna del usuario via
 *      `sendMessage()`. En server mode esto replica al backend
 *      (POST /api/messages) y aparece en /cuenta/mensajes del usuario.
 *   2. Envía un email íntegro con el mismo contenido (asunto + cuerpo)
 *      usando la plantilla `mensaje_admin` (incluye logo + botón a la
 *      bandeja). Vía `sendAdminMessageEmail()` → `sendAppEmail()`.
 *
 * Diseño: paralelo a `SendCouponModal`. El botón disparador es BLANCO
 * (solicitado por el admin para diferenciarlo visualmente del flujo
 * de cupón / puntos, que son acciones que *otorgan* algo).
 */
import { useState, useCallback } from "react";
import {
  X,
  MessageCircle,
  Send,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { sendMessage } from "@/services/messageService";
import { sendAdminMessageEmail } from "@/services/emailService";

interface SendMessageProps {
  userId: string;
  userName: string;
  userLastName: string;
  userEmail: string;
}

export function SendMessageButton(props: SendMessageProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0a1628] shadow-md transition hover:bg-gray-100 active:scale-95"
        aria-label="Enviar mensaje al usuario"
      >
        <MessageCircle size={16} />
        Enviar mensaje
      </button>
      {open && <SendMessageModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function SendMessageModal({
  userId,
  userName,
  userLastName,
  userEmail,
  onClose,
}: SendMessageProps & { onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [tab, setTab] = useState<"form" | "preview">("form");

  const canSend = subject.trim().length >= 3 && body.trim().length >= 5;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      // 1. Bandeja interna del usuario.
      sendMessage({
        fromUserId: "admin",
        fromName: "TCG Academy",
        toUserId: userId,
        toName: `${userName} ${userLastName}`.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });

      // 2. Email íntegro con logo y CTA a la bandeja interna.
      await sendAdminMessageEmail({
        toEmail: userEmail,
        toName: userName,
        subject: subject.trim(),
        bodyText: body.trim(),
      });

      setSent(true);
    } finally {
      setSending(false);
    }
  }, [canSend, userId, userName, userLastName, userEmail, subject, body]);

  if (sent) {
    return (
      <ModalWrapper onClose={onClose}>
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="mb-1 text-xl font-bold text-gray-900">¡Mensaje enviado!</h3>
          <p className="mb-1 text-sm text-gray-500">
            El mensaje ha sido entregado a {userName} {userLastName}.
          </p>
          <p className="mb-6 text-sm text-gray-400">
            Aparece en su bandeja interna y se ha enviado una copia íntegra a{" "}
            <strong className="text-gray-600">{userEmail}</strong>.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-[#2563eb] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Cerrar
          </button>
        </div>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <MessageCircle size={18} className="text-blue-600" />
            Enviar mensaje
          </h2>
          <p className="text-xs text-gray-400">
            Para:{" "}
            <span className="font-semibold text-gray-600">
              {userName} {userLastName}
            </span>{" "}
            · {userEmail}
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

      <div className="flex border-b border-gray-100">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "form" ? "Redactar mensaje" : "Previsualizar email"}
          </button>
        ))}
      </div>

      <div className="max-h-[55vh] overflow-y-auto">
        {tab === "form" ? (
          <div className="space-y-5 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Asunto
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Información sobre tu pedido"
                maxLength={140}
                className="h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">
                {subject.length}/140 caracteres
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Mensaje
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe aquí el mensaje íntegro que recibirá el usuario tanto en su bandeja como en su email..."
                rows={10}
                maxLength={4000}
                className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">
                {body.length}/4000 caracteres · Los saltos de línea se respetan.
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-800">
              <strong>Doble entrega:</strong> el mensaje se guardará en la
              bandeja interna del usuario (visible al iniciar sesión) y se le
              enviará una copia íntegra por email con el logo de TCG Academy.
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="mb-3 text-center text-xs text-gray-400">
              Así verá el cliente el email en su bandeja
            </p>
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div style={{ background: "#132B5F", padding: "20px 24px", textAlign: "center" }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 3, margin: 0, textTransform: "uppercase" }}>
                  TCG Academy
                </p>
              </div>
              <div style={{ background: "#fff", padding: "28px 24px", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
                <h1 style={{ color: "#0f172a", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
                  Tienes un mensaje
                </h1>
                <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
                  Del equipo de TCG Academy
                </p>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ color: "#374151", marginBottom: 14, fontSize: 14 }}>
                  Hola, <strong>{userName}</strong>
                </p>
                <div
                  style={{
                    background: "#f4f7fc",
                    borderLeft: "4px solid #2549a8",
                    padding: "16px 18px",
                    borderRadius: "0 12px 12px 0",
                    margin: "16px 0",
                    color: "#1e293b",
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {body || "(Aquí aparecerá el cuerpo del mensaje)"}
                </div>
                <div style={{ textAlign: "center", margin: "20px 0" }}>
                  <span style={{ display: "inline-block", background: "#fbbf24", color: "#0a1628", fontWeight: 800, fontSize: 14, padding: "12px 28px", borderRadius: 999 }}>
                    Ver mis mensajes
                  </span>
                </div>
                <p style={{ color: "#475569", fontSize: 12, marginTop: 18 }}>
                  <strong>El equipo de TCG Academy</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-6 py-4">
        <button
          onClick={handleSend}
          disabled={sending || !canSend}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3.5 text-sm font-bold text-white shadow transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <>
              <RefreshCw size={15} className="animate-spin" /> Enviando…
            </>
          ) : (
            <>
              <Send size={15} /> Enviar mensaje a {userName}
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Llega a su bandeja interna y a su email de forma simultánea
        </p>
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
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {children}
      </div>
    </div>
  );
}
