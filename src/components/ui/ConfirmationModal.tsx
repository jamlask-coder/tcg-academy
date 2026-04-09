"use client";
import { useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import Link from "next/link";

export interface ConfirmationModalAction {
  label: string;
  href?: string; // navigate on click
  onClick?: () => void; // or call a handler
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  type: "success" | "error";
  title: string;
  message?: string;
  productName?: string;
  productImage?: string;
  errors?: string[];
  actions?: ConfirmationModalAction[];
  onClose: () => void;
}

const VARIANT_CLS: Record<string, string> = {
  primary:
    "min-h-[44px] rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]",
  secondary:
    "min-h-[44px] rounded-xl border-2 border-[#2563eb] px-6 py-2.5 text-sm font-bold text-[#2563eb] transition hover:bg-blue-50",
  ghost:
    "min-h-[44px] rounded-xl border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50",
  danger:
    "min-h-[44px] rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-700",
};

export function ConfirmationModal({
  isOpen,
  type,
  title,
  message,
  productName,
  productImage,
  errors,
  actions = [],
  onClose,
}: ConfirmationModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuccess = type === "success";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ animation: "cmFadeIn 0.18s ease-out both" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
        style={{
          animation: "cmScaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>

        {/* Header strip */}
        <div
          className={`rounded-t-2xl px-6 pt-6 pb-5 ${
            isSuccess ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle size={36} className="flex-shrink-0 text-green-500" />
            ) : (
              <XCircle size={36} className="flex-shrink-0 text-red-500" />
            )}
            <div>
              <h2
                id="cm-title"
                className={`text-lg font-bold ${
                  isSuccess ? "text-green-800" : "text-red-800"
                }`}
              >
                {title}
              </h2>
              {message && (
                <p
                  className={`mt-0.5 text-sm ${
                    isSuccess ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Product info (success) */}
          {isSuccess && (productName || productImage) && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              {productImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productImage}
                  alt={productName ?? "Producto"}
                  className="h-14 w-14 flex-shrink-0 rounded-lg object-contain"
                />
              )}
              {!productImage && (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200 text-2xl">
                  🃏
                </div>
              )}
              <p className="line-clamp-2 text-sm font-semibold text-gray-800">
                {productName}
              </p>
            </div>
          )}

          {/* Errors list */}
          {!isSuccess && errors && errors.length > 0 && (
            <ul className="mb-4 space-y-1.5">
              {errors.map((e, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-red-700"
                >
                  <span className="mt-0.5 flex-shrink-0 text-red-400">•</span>
                  {e}
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-wrap justify-end gap-3">
              {actions.map((action, i) => {
                const cls = VARIANT_CLS[action.variant ?? "primary"];
                if (action.href) {
                  return (
                    <Link
                      key={i}
                      href={action.href}
                      className={cls}
                      onClick={onClose}
                    >
                      {action.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => {
                      action.onClick?.();
                      if (!action.href) onClose();
                    }}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cmScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
