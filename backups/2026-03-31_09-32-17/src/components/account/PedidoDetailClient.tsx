"use client";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Package,
  MapPin,
  CreditCard,
  Truck,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { MOCK_ORDERS } from "@/data/mockData";
import {
  printInvoice,
  buildInvoiceFromOrder,
  generateInvoiceNumber,
} from "@/utils/invoiceGenerator";

const TRACKING_STEPS = [
  { label: "Pedido confirmado", done: true, date: "28 Ene 2025, 10:23" },
  { label: "En preparación", done: true, date: "28 Ene 2025, 14:05" },
  { label: "Enviado", done: true, date: "29 Ene 2025, 08:30" },
  { label: "En reparto", done: false, date: null },
  { label: "Entregado", done: false, date: null },
];

interface Props {
  id: string;
}

export function PedidoDetailClient({ id }: Props) {
  const [copied, setCopied] = useState(false);

  const order = MOCK_ORDERS.find((o) => o.id === id);
  const trackingNumber = order?.trackingNumber;

  const handleDownloadInvoice = () => {
    const invNum = generateInvoiceNumber(id);
    const data = buildInvoiceFromOrder(
      {
        id,
        date: new Date().toISOString(),
        items:
          order?.items?.map((i) => ({
            name: i.name,
            quantity: i.qty ?? 1,
            price: i.price,
          })) ?? [],
        total: order?.total ?? 0,
      },
      invNum,
    );
    printInvoice(data);
  };

  const copyTracking = () => {
    if (trackingNumber) {
      navigator.clipboard?.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          href="/cuenta/pedidos"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900">Pedido {id}</h1>
          <p className="text-sm text-gray-500">28 Enero 2025</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadInvoice}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#1a3a5c]/20 px-3 py-2 text-sm font-medium text-[#1a3a5c] transition hover:bg-blue-50"
          >
            <Download size={15} /> Descargar factura
          </button>
          <Link
            href="/cuenta/devoluciones"
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <RefreshCw size={15} /> Solicitar devolución
          </Link>
        </div>
      </div>

      {/* Tracking number */}
      {trackingNumber && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <Truck size={18} className="text-green-500" /> Número de seguimiento
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="font-mono text-sm font-bold tracking-widest text-gray-800">
                {trackingNumber}
              </span>
              <button
                onClick={copyTracking}
                className="ml-auto flex min-h-[36px] items-center gap-1.5 px-2 text-xs text-gray-500 transition hover:text-[#1a3a5c]"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-green-500" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copiar
                  </>
                )}
              </button>
            </div>
            <a
              href={`https://gls-group.com/track/${trackingNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[44px] items-center text-sm font-semibold whitespace-nowrap text-[#1a3a5c] hover:underline"
            >
              Seguir en GLS →
            </a>
          </div>
        </div>
      )}

      {/* Tracking timeline */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-6 font-bold text-gray-900">Seguimiento del envío</h2>
        <div className="relative">
          {TRACKING_STEPS.map((step, i) => (
            <div
              key={i}
              className="relative flex items-start gap-4 pb-6 last:pb-0"
            >
              {i < TRACKING_STEPS.length - 1 && (
                <div
                  className="absolute top-7 left-3.5 h-full w-0.5"
                  style={{ backgroundColor: step.done ? "#1a3a5c" : "#e5e7eb" }}
                />
              )}
              <div
                className={`z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                  step.done ? "bg-[#1a3a5c]" : "bg-gray-200"
                }`}
              >
                {step.done ? (
                  <svg
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                )}
              </div>
              <div className="pt-0.5">
                <p
                  className={`text-sm font-semibold ${step.done ? "text-gray-900" : "text-gray-400"}`}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="mt-0.5 text-xs text-gray-500">{step.date}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
          <Package size={18} className="text-gray-400" /> Productos
        </h2>
        <div className="space-y-4">
          {[
            {
              name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)",
              qty: 1,
              price: 79.95,
            },
            {
              name: "Naruto Starter Pack — Naruto Uzumaki",
              qty: 2,
              price: 14.95,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                  🍃
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">Cantidad: {item.qty}</p>
                </div>
              </div>
              <p className="font-bold whitespace-nowrap text-gray-900">
                {(item.price * item.qty).toFixed(2)}€
              </p>
            </div>
          ))}
          <div className="space-y-2 pt-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>109.85€</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span className="text-green-600">Gratis</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>109.85€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Address + payment */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <MapPin size={18} className="text-gray-400" /> Dirección de envío
          </h2>
          <div className="space-y-1 text-sm text-gray-600">
            <p className="font-medium text-gray-800">Cliente TCG</p>
            <p>Calle Mayor 15, 2ºB</p>
            <p>28001 Madrid, Madrid</p>
            <p>España</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <CreditCard size={18} className="text-gray-400" /> Método de pago
          </h2>
          <div className="space-y-1 text-sm text-gray-600">
            <p className="font-medium text-gray-800">Tarjeta de crédito</p>
            <p>Visa terminada en 4242</p>
            <p className="mt-2 text-xs text-gray-400">
              Pago procesado correctamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
