"use client";
import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  /** The current sale price (used to convert % ↔ comparePrice) */
  displayPrice: number;
  /** Current original/compare price. undefined = no discount */
  comparePrice: number | undefined;
  /** Called on confirm. Pass undefined to remove the discount */
  onSave: (newComparePrice: number | undefined) => void;
  /** CSS class for the badge element */
  badgeClassName?: string;
}

function calcComparePrice(displayPrice: number, pct: number): number {
  return parseFloat((displayPrice / (1 - pct / 100)).toFixed(2));
}

function calcDiscountPct(displayPrice: number, comparePrice: number): number {
  return Math.round((1 - displayPrice / comparePrice) * 100);
}

export function DiscountBadgeEdit({
  displayPrice,
  comparePrice,
  onSave,
  badgeClassName,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const hasDiscount = comparePrice !== undefined && comparePrice > displayPrice;
  const currentPct = hasDiscount
    ? calcDiscountPct(displayPrice, comparePrice!)
    : 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(currentPct));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const openEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(String(currentPct || ""));
    setEditing(true);
  };

  const handleSave = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const pct = parseInt(draft, 10);
    if (!isNaN(pct) && pct > 0 && pct < 100) {
      onSave(calcComparePrice(displayPrice, pct));
    } else {
      onSave(undefined);
    }
    setEditing(false);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDraft(String(currentPct || ""));
    setEditing(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  const defaultBadgeClass =
    badgeClassName ??
    "bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm";

  if (!isAdmin) {
    if (!hasDiscount) return null;
    return <span className={defaultBadgeClass}>-{currentPct}%</span>;
  }

  /* ── Admin: editing mode ─────────────────────────────────────── */
  if (editing) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <span className="text-[10px] font-bold text-red-500">-</span>
        <input
          ref={inputRef}
          type="number"
          min="1"
          max="99"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          className="w-10 border-2 border-[#1a3a5c] rounded px-1 py-0.5 text-[10px] font-bold focus:outline-none text-center bg-white"
        />
        <span className="text-[10px] font-bold text-red-500">%</span>
        <button
          onClick={handleSave}
          className="w-4 h-4 bg-green-500 text-white rounded flex items-center justify-center hover:bg-green-600 transition flex-shrink-0"
          title="Confirmar"
        >
          <Check size={9} />
        </button>
        <button
          onClick={handleCancel}
          className="w-4 h-4 bg-gray-200 text-gray-600 rounded flex items-center justify-center hover:bg-gray-300 transition flex-shrink-0"
          title="Cancelar"
        >
          <X size={9} />
        </button>
      </span>
    );
  }

  /* ── Admin: has discount → badge + pencil on hover ───────────── */
  if (hasDiscount) {
    return (
      <span className="group/disc inline-flex items-center gap-0.5">
        <span className={defaultBadgeClass}>-{currentPct}%</span>
        <button
          onClick={openEdit}
          className="opacity-0 group-hover/disc:opacity-100 p-0.5 rounded text-gray-400 hover:text-[#1a3a5c] transition-opacity flex-shrink-0"
          title="Editar descuento"
        >
          <Pencil size={9} />
        </button>
      </span>
    );
  }

  /* ── Admin: no discount → small "+" button ───────────────────── */
  return (
    <button
      onClick={openEdit}
      className="inline-flex items-center gap-0.5 border border-dashed border-gray-300 text-gray-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full hover:border-red-400 hover:text-red-400 transition-colors"
      title="Añadir descuento"
    >
      <Plus size={8} /> dto
    </button>
  );
}
