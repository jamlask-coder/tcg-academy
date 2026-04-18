"use client";
import { useState, useCallback } from "react";
import {
  X,
  Ticket,
  Percent,
  Banknote,
  Truck,
  RefreshCw,
  Send,
  CheckCircle,
} from "lucide-react";
import {
  saveUserCoupon,
  generateCouponCode,
  formatCouponValueForEmail,
  formatExpiryDate,
  type CouponDiscountType,
} from "@/services/couponService";
import { sendCouponEmail } from "@/services/emailService";
import { SITE_CONFIG } from "@/config/siteConfig";

// ── Props ──────────────────────────────────────────────────────────────────────

interface SendCouponProps {
  userId: string;
  userName: string;
  userLastName: string;
  userEmail: string;
}

// ── Trigger button (exported for use in server pages) ─────────────────────────

export function SendCouponButton(props: SendCouponProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-400 active:scale-95"
      >
        <Ticket size={16} />
        Enviar cupón
      </button>
      {open && (
        <SendCouponModal {...props} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function SendCouponModal({
  userId,
  userName,
  userLastName,
  userEmail,
  onClose,
}: SendCouponProps & { onClose: () => void }) {
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percent");
  const [value, setValue] = useState("15");
  const [code, setCode] = useState(() => generateCouponCode());
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [description, setDescription] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [tab, setTab] = useState<"form" | "preview">("form");

  const numVal = Number(value) || 0;

  const displayValue =
    discountType === "shipping"
      ? "Envío gratis"
      : discountType === "percent"
        ? `${numVal}%`
        : `${numVal.toFixed(2)}€`;

  const emailValue = formatCouponValueForEmail(discountType, numVal);

  const autoDesc =
    discountType === "shipping"
      ? "Envío gratis en tu próximo pedido"
      : discountType === "percent"
        ? `${numVal}% de descuento en tu próximo pedido`
        : `${numVal.toFixed(2)}€ de descuento en tu próximo pedido`;

  const finalDesc = description.trim() || autoDesc;
  const expiryFormatted = formatExpiryDate(expiresAt);

  const canSend =
    code.trim().length >= 3 &&
    (discountType === "shipping" || numVal > 0);

  // ── Send handler ────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const coupon = {
        id: `uc_${Date.now()}`,
        userId,
        userEmail,
        code: code.trim().toUpperCase(),
        description: finalDesc,
        discountType,
        value: discountType === "shipping" ? 0 : numVal,
        createdAt: new Date().toISOString(),
        expiresAt,
        active: true,
        sentByAdmin: "admin",
        personalMessage: personalMessage.trim() || undefined,
      };
      saveUserCoupon(coupon);

      await sendCouponEmail({
        toEmail: userEmail,
        toName: userName,
        couponCode: coupon.code,
        couponDescription: finalDesc,
        couponValue: emailValue,
        expiresAt: expiryFormatted,
        personalMessage: personalMessage.trim() || undefined,
        shopUrl: typeof window !== "undefined" ? window.location.origin : "",
      });

      setSent(true);
    } finally {
      setSending(false);
    }
  }, [
    canSend,
    userId,
    userEmail,
    code,
    finalDesc,
    discountType,
    numVal,
    expiresAt,
    personalMessage,
    userName,
    emailValue,
    expiryFormatted,
  ]);

  // ── Success view ────────────────────────────────────────────────────────────

  if (sent) {
    return (
      <ModalWrapper onClose={onClose}>
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="mb-1 text-xl font-bold text-gray-900">
            ¡Cupón enviado!
          </h3>
          <p className="mb-1 text-sm text-gray-500">
            El cupón{" "}
            <span className="font-mono font-bold text-gray-800">
              {code.trim().toUpperCase()}
            </span>{" "}
            ha sido asignado a {userName} {userLastName}.
          </p>
          <p className="mb-6 text-sm text-gray-400">
            Email de notificación enviado a{" "}
            <strong className="text-gray-600">{userEmail}</strong>.
          </p>

          {/* Coupon card */}
          <div className="mx-auto mb-6 max-w-xs rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 text-center shadow-sm">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">
              Cupón asignado
            </p>
            <p className="font-mono text-2xl font-black tracking-wider text-amber-600">
              {code.trim().toUpperCase()}
            </p>
            <p className="mt-1 text-lg font-bold text-amber-700">
              {displayValue}
            </p>
            <p className="mt-0.5 text-xs text-amber-600">{finalDesc}</p>
            <p className="mt-2 text-[11px] text-gray-400">
              Válido hasta {expiryFormatted}
            </p>
          </div>

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

  // ── Main form ───────────────────────────────────────────────────────────────

  return (
    <ModalWrapper onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Ticket size={18} className="text-amber-500" />
            Enviar cupón
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

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === t
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "form" ? "Configurar cupón" : "Previsualizar email"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="max-h-[55vh] overflow-y-auto">
        {tab === "form" ? (
          <div className="space-y-5 px-6 py-5">
            {/* Type selector */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Tipo de descuento
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      type: "percent" as CouponDiscountType,
                      Icon: Percent,
                      label: "Porcentaje",
                    },
                    {
                      type: "fixed" as CouponDiscountType,
                      Icon: Banknote,
                      label: "Importe fijo",
                    },
                    {
                      type: "shipping" as CouponDiscountType,
                      Icon: Truck,
                      label: "Envío gratis",
                    },
                  ] as const
                ).map(({ type, Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setDiscountType(type)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-bold transition ${
                      discountType === type
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-600"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Value — hidden for shipping */}
            {discountType !== "shipping" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  {discountType === "percent"
                    ? "Porcentaje de descuento"
                    : "Importe de descuento (IVA incluido)"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={discountType === "percent" ? "100" : "999"}
                    step={discountType === "percent" ? "1" : "0.01"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-12 w-full rounded-xl border-2 border-gray-200 pl-4 pr-12 text-xl font-bold transition focus:border-amber-500 focus:outline-none"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base font-bold text-gray-400">
                    {discountType === "percent" ? "%" : "€"}
                  </span>
                </div>
                {discountType === "fixed" && (
                  <p className="mt-1 text-xs text-gray-400">
                    El importe incluye IVA. Se aplicará directamente sobre el
                    total del pedido.
                  </p>
                )}
              </div>
            )}

            {/* Code */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Código del cupón
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    )
                  }
                  maxLength={20}
                  className="h-11 flex-1 rounded-xl border-2 border-gray-200 px-4 font-mono text-sm font-bold uppercase transition focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCode(generateCouponCode())}
                  aria-label="Generar código aleatorio"
                  className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-gray-200 px-3.5 text-xs font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                >
                  <RefreshCw size={14} />
                  Generar
                </button>
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Válido hasta
              </label>
              <input
                type="date"
                value={expiresAt}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Descripción{" "}
                <span className="normal-case font-normal text-gray-400">
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={autoDesc}
                maxLength={120}
                className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Personal message */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Mensaje personal{" "}
                <span className="normal-case font-normal text-gray-400">
                  (opcional)
                </span>
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Ej: ¡Gracias por tu fidelidad! Esperamos verte pronto en la tienda."
                rows={2}
                maxLength={220}
                className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Live preview card */}
            <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Vista previa del cupón
              </p>
              <p className="font-mono text-2xl font-black tracking-wider text-amber-600">
                {code.trim().toUpperCase() || "CÓDIGO"}
              </p>
              <p className="mt-1 text-base font-bold text-amber-700">
                {displayValue}
              </p>
              <p className="mt-0.5 text-xs text-amber-600">{finalDesc}</p>
              <p className="mt-2 text-[11px] text-gray-400">
                Válido hasta {expiryFormatted}
              </p>
            </div>
          </div>
        ) : (
          /* Email preview */
          <div className="p-4">
            <p className="mb-3 text-center text-xs text-gray-400">
              Así verá el cliente el email en su bandeja de entrada
            </p>
            <div
              className="overflow-hidden rounded-2xl border border-gray-200"
              style={{ fontSize: 13 }}
            >
              {/* Email header */}
              <div
                style={{
                  background: "#2563eb",
                  padding: "20px 24px",
                }}
              >
                <p
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: 900,
                    margin: 0,
                    letterSpacing: -0.5,
                  }}
                >
                  TCG Academy
                </p>
                <p
                  style={{
                    color: "#93c5fd",
                    fontSize: 11,
                    margin: "3px 0 0",
                  }}
                >
                  La tienda TCG de referencia
                </p>
              </div>
              {/* Hero */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                  padding: "28px 24px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: 800,
                    margin: "0 0 4px",
                  }}
                >
                  🎁 ¡Tienes un cupón exclusivo!
                </p>
                <p style={{ color: "#bfdbfe", fontSize: 12, margin: 0 }}>
                  Un regalo especial solo para ti
                </p>
              </div>
              {/* Body */}
              <div style={{ padding: "24px" }}>
                <p style={{ color: "#374151", marginBottom: 12 }}>
                  Hola, <strong>{userName}</strong> 👋
                </p>
                <p
                  style={{
                    color: "#374151",
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}
                >
                  Queremos sorprenderte con un descuento exclusivo para tu
                  próxima compra en TCG Academy.
                </p>
                {/* Coupon box */}
                <div
                  style={{
                    border: "2px dashed #f59e0b",
                    borderRadius: 16,
                    padding: "20px",
                    textAlign: "center",
                    background: "#fffbeb",
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      color: "#92400e",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 2,
                      margin: "0 0 6px",
                      textTransform: "uppercase",
                    }}
                  >
                    Tu código de descuento
                  </p>
                  <p
                    style={{
                      color: "#d97706",
                      fontSize: 28,
                      fontWeight: 900,
                      letterSpacing: 4,
                      fontFamily: "monospace",
                      margin: "6px 0",
                    }}
                  >
                    {code.trim().toUpperCase() || "CÓDIGO"}
                  </p>
                  <p
                    style={{
                      color: "#b45309",
                      fontSize: 18,
                      fontWeight: 800,
                      margin: "0 0 4px",
                    }}
                  >
                    {emailValue}
                  </p>
                  <p
                    style={{
                      color: "#92400e",
                      fontSize: 12,
                      margin: "0 0 6px",
                    }}
                  >
                    {finalDesc}
                  </p>
                  {personalMessage && (
                    <p
                      style={{
                        color: "#78716c",
                        fontSize: 12,
                        fontStyle: "italic",
                        margin: "8px 0 0",
                        borderTop: "1px solid #fde68a",
                        paddingTop: 8,
                      }}
                    >
                      {personalMessage}
                    </p>
                  )}
                </div>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                    marginBottom: 16,
                  }}
                >
                  ⏰ Válido hasta:{" "}
                  <strong>{expiryFormatted}</strong>
                </p>
                <div style={{ textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#2563eb",
                      color: "white",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "12px 28px",
                      borderRadius: 12,
                    }}
                  >
                    Ir a la tienda →
                  </span>
                </div>
              </div>
              {/* Footer */}
              <div
                style={{
                  background: "#f8fafc",
                  borderTop: "1px solid #e5e7eb",
                  padding: "14px 24px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{ color: "#9ca3af", fontSize: 11, margin: "0 0 2px" }}
                >
                  {SITE_CONFIG.name} · {SITE_CONFIG.email} · {SITE_CONFIG.phone}
                </p>
                <p style={{ color: "#d1d5db", fontSize: 10, margin: 0 }}>
                  {SITE_CONFIG.address} · CIF: {SITE_CONFIG.cif}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-gray-100 px-6 py-4">
        <button
          onClick={handleSend}
          disabled={sending || !canSend}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-white shadow transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <>
              <RefreshCw size={15} className="animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <Send size={15} /> Enviar cupón a {userName}
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Se crea el cupón y se notifica al cliente por email automáticamente
        </p>
      </div>
    </ModalWrapper>
  );
}

// ── Shared wrapper ─────────────────────────────────────────────────────────────

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
