/**
 * Shared payment info block — shows payment logo + method + status icon.
 * Used in order detail views (customer and admin).
 */
import Image from "next/image";
import { CheckCircle, RefreshCw, XCircle } from "lucide-react";

export type PaymentStatus = "paid" | "refunded" | "failed";

interface LogoInfo {
  src: string;
  alt: string;
  w: number;
  h: number;
}

export function paymentLogo(method?: string): LogoInfo | null {
  if (!method) return null;
  const m = method.toLowerCase();
  if (m.includes("visa"))
    return { src: "/images/payment/visa.svg", alt: "Visa", w: 36, h: 22 };
  if (m.includes("master"))
    return {
      src: "/images/payment/mastercard.svg",
      alt: "Mastercard",
      w: 36,
      h: 22,
    };
  if (m.includes("paypal"))
    return { src: "/images/payment/paypal.svg", alt: "PayPal", w: 60, h: 22 };
  if (m.includes("bizum"))
    return { src: "/images/payment/bizum.svg", alt: "Bizum", w: 50, h: 22 };
  if (m.includes("apple"))
    return {
      src: "/images/payment/apple-pay.svg",
      alt: "Apple Pay",
      w: 42,
      h: 22,
    };
  if (m.includes("google"))
    return {
      src: "/images/payment/google-pay.svg",
      alt: "Google Pay",
      w: 46,
      h: 22,
    };
  if (m.includes("sepa"))
    return { src: "/images/payment/sepa.svg", alt: "SEPA", w: 42, h: 22 };
  return null;
}

export function PaymentStatusIcon({ status }: { status: PaymentStatus }) {
  if (status === "paid")
    return (
      <span
        className="inline-flex items-center gap-1 text-green-600"
        title="Pago verificado y cobrado"
      >
        <CheckCircle size={14} /> Cobrado
      </span>
    );
  if (status === "refunded")
    return (
      <span
        className="inline-flex items-center gap-1 text-orange-600"
        title="Pago devuelto"
      >
        <RefreshCw size={14} className="rotate-180" /> Devuelto
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 text-red-600"
      title="Pago no completado"
    >
      <XCircle size={14} /> Fallido
    </span>
  );
}

export function PaymentInfo({
  method,
  status = "paid",
}: {
  method?: string;
  status?: PaymentStatus;
}) {
  const logo = paymentLogo(method);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {logo ? (
        <span className="inline-flex h-6 items-center rounded-md border border-gray-200 bg-white px-1.5">
          <Image
            src={logo.src}
            alt={logo.alt}
            width={logo.w}
            height={logo.h}
            className="h-4 w-auto"
          />
        </span>
      ) : (
        <span className="text-xs text-gray-500">{method || "—"}</span>
      )}
      <span className="text-xs font-semibold">
        <PaymentStatusIcon status={status} />
      </span>
    </div>
  );
}
