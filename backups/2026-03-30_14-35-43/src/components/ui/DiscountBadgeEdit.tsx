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
          className="w-10 rounded border-2 border-[#1a3a5c] bg-white px-1 py-0.5 text-center text-[10px] font-bold focus:outline-none"
        />
        <span className="text-[10px] font-bold text-red-500">%</span>
        <button
          onClick={handleSave}
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-green-500 text-white transition hover:bg-green-600"
          title="Confirmar"
        >
          <Check size={9} />
        </button>
        <button
          onClick={handleCancel}
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-gray-200 text-gray-600 transition hover:bg-gray-300"
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
          className="flex-shrink-0 rounded p-0.5 text-gray-400 opacity-0 transition-opacity group-hover/disc:opacity-100 hover:text-[#1a3a5c]"
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
      className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:border-red-400 hover:text-red-400"
      title="Añadir descuento"
    >
      <Plus size={8} /> dto
    </button>
  );
}
