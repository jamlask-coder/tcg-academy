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
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <Link
          href="/cuenta/pedidos"
          className="text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Pedido {id}</h1>
          <p className="text-gray-500 text-sm">28 Enero 2025</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadInvoice}
            className="flex items-center gap-1.5 text-sm text-[#1a3a5c] hover:bg-blue-50 px-3 py-2 rounded-lg transition font-medium min-h-[44px] border border-[#1a3a5c]/20"
          >
            <Download size={15} /> Descargar factura
          </button>
          <Link
            href="/cuenta/devoluciones"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition font-medium min-h-[44px] border border-gray-200"
          >
            <RefreshCw size={15} /> Solicitar devolución
          </Link>
        </div>
      </div>

      {/* Tracking number */}
      {trackingNumber && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Truck size={18} className="text-green-500" /> Número de seguimiento
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <span className="font-mono font-bold text-gray-800 text-sm tracking-widest">
                {trackingNumber}
              </span>
              <button
                onClick={copyTracking}
                className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1a3a5c] transition min-h-[36px] px-2"
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
              className="text-sm font-semibold text-[#1a3a5c] hover:underline whitespace-nowrap min-h-[44px] flex items-center"
            >
              Seguir en GLS →
            </a>
          </div>
        </div>
      )}

      {/* Tracking timeline */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-gray-900 mb-6">Seguimiento del envío</h2>
        <div className="relative">
          {TRACKING_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-4 pb-6 last:pb-0 relative"
            >
              {i < TRACKING_STEPS.length - 1 && (
                <div
                  className="absolute left-3.5 top-7 w-0.5 h-full"
                  style={{ backgroundColor: step.done ? "#1a3a5c" : "#e5e7eb" }}
                />
              )}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                  step.done ? "bg-[#1a3a5c]" : "bg-gray-200"
                }`}
              >
                {step.done ? (
                  <svg
                    className="w-3.5 h-3.5 text-white"
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
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                )}
              </div>
              <div className="pt-0.5">
                <p
                  className={`text-sm font-semibold ${step.done ? "text-gray-900" : "text-gray-400"}`}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.date}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
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
              className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                  🍃
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">Cantidad: {item.qty}</p>
                </div>
              </div>
              <p className="font-bold text-gray-900 whitespace-nowrap">
                {(item.price * item.qty).toFixed(2)}€
              </p>
            </div>
          ))}
          <div className="pt-2 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>109.85€</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span className="text-green-600">Gratis</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>109.85€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Address + payment */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-gray-400" /> Dirección de envío
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-800">Cliente TCG</p>
            <p>Calle Mayor 15, 2ºB</p>
            <p>28001 Madrid, Madrid</p>
            <p>España</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-gray-400" /> Método de pago
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-800">Tarjeta de crédito</p>
            <p>Visa terminada en 4242</p>
            <p className="text-xs text-gray-400 mt-2">
              Pago procesado correctamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
