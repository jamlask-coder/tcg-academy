"use client";
import { useState } from "react";
import { ShoppingCart, Plus, Minus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getMergedProducts } from "@/lib/productStore";
import { ACCESSORY_CATEGORIES, GAME_CONFIG } from "@/data/products";

interface Props {
  game: string;
  category: string;
}

const PER_VIEW = 4;

export function CompleteYourOrder({ game, category }: Props) {
  const { addItem, items, removeItem, updateQty } = useCart();
  const [offset, setOffset] = useState(0);

  if (ACCESSORY_CATEGORIES.has(category)) return null;

  const accessories = getMergedProducts()
    .filter((p) => p.inStock && !p.name.startsWith("[DEMO]") && ACCESSORY_CATEGORIES.has(p.category) && (p.game === game || p.game === "magic"));

  if (accessories.length === 0) return null;

  const visible = accessories.slice(offset, offset + PER_VIEW);
  const canLeft = offset > 0;
  const canRight = offset + PER_VIEW < accessories.length;

  return (
    <div className="mt-1.5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">Completa tu pedido</h3>
        {accessories.length > PER_VIEW && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOffset((p) => Math.max(0, p - PER_VIEW))}
              disabled={!canLeft}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Anteriores"
            >
              <ChevronLeft size={11} className="text-gray-600" />
            </button>
            <button
              onClick={() => setOffset((p) => Math.min(accessories.length - PER_VIEW, p + PER_VIEW))}
              disabled={!canRight}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Siguientes"
            >
              <ChevronRight size={11} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {visible.map((acc) => {
          const cartKey = `item_${acc.id}`;
          const cartItem = items.find((i) => i.key === cartKey);
          const qty = cartItem?.quantity ?? 0;

          return (
            <div key={acc.id} className="flex flex-col items-center rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
              {acc.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={acc.images[0]} alt={acc.name} className="mb-1.5 h-16 w-16 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.svg"; }} />
              ) : (
                <div className="mb-1.5 flex h-16 w-16 items-center justify-center rounded bg-gray-50 text-xl">{GAME_CONFIG[acc.game]?.emoji ?? "🃏"}</div>
              )}
              <span className="line-clamp-2 text-center text-[9px] leading-tight text-gray-600">{acc.name}</span>
              <span className="mt-0.5 text-[10px] font-bold text-gray-900">{acc.price.toFixed(2)}€</span>
              {qty > 0 ? (
                <div className="mt-1.5 flex items-center overflow-hidden rounded-full border border-gray-200">
                  <button
                    onClick={() => qty <= 1 ? removeItem(cartKey) : updateQty(cartKey, qty - 1)}
                    className="flex h-5 w-5 items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500"
                    aria-label="Quitar"
                  >
                    {qty <= 1 ? <Trash2 size={8} /> : <Minus size={8} />}
                  </button>
                  <span className="min-w-[16px] text-center text-[9px] font-bold text-gray-900">{qty}</span>
                  <button
                    onClick={() => addItem(acc.id, acc.name, acc.price, acc.images[0] ?? "")}
                    className="flex h-5 w-5 items-center justify-center text-gray-500 hover:bg-green-50 hover:text-green-500"
                    aria-label="Añadir"
                  >
                    <Plus size={8} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addItem(acc.id, acc.name, acc.price, acc.images[0] ?? "")}
                  className="mt-1.5 flex items-center gap-0.5 rounded-full bg-[#2563eb] px-2 py-1 text-[9px] font-bold text-white transition hover:bg-[#1d4ed8]"
                  aria-label={`Añadir ${acc.name}`}
                >
                  <ShoppingCart size={9} />
                  Añadir
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
