"use client";
import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { InlineEdit } from "./InlineEdit";
import { type LocalProduct } from "@/data/products";

interface ProductAdminCardProps {
  product: LocalProduct;
  onEdit: (p: LocalProduct) => void;
  onDelete: (p: LocalProduct) => void;
  onPriceChange: (id: number, field: keyof LocalProduct, value: number) => void;
}

export function ProductAdminCard({
  product,
  onEdit,
  onDelete,
  onPriceChange,
}: ProductAdminCardProps) {
  const img = product.images?.[0];
  const hasDiscount =
    product.comparePrice && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(
        (1 - product.price / (product.comparePrice ?? product.price)) * 100,
      )
    : 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-md">
      {/* Action buttons — shown on hover */}
      <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(product)}
          aria-label={`Editar ${product.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-md transition hover:bg-[#2563eb] hover:text-white"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(product)}
          aria-label={`Eliminar ${product.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-md transition hover:bg-red-500 hover:text-white"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {!product.inStock && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
            Agotado
          </span>
        )}
        {product.isNew && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">
            Nuevo
          </span>
        )}
        {discountPct > 0 && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
            -{discountPct}%
          </span>
        )}
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        {img ? (
          <Image
            src={img}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, 240px"
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-40">
            📦
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="mb-3 line-clamp-2 text-xs leading-tight font-semibold text-gray-900">
          {product.name}
        </p>

        {/* Prices — each editable inline */}
        <div className="space-y-1.5">
          <PriceRow
            label="PV Público"
            color="#2563eb"
            value={product.price}
            onSave={(v) => onPriceChange(product.id, "price", Math.max(0, v))}
          />
          <PriceRow
            label="Mayoristas"
            color="#0891b2"
            value={product.wholesalePrice}
            onSave={(v) =>
              onPriceChange(product.id, "wholesalePrice", Math.max(0, v))
            }
          />
          <PriceRow
            label="Tiendas TCG"
            color="#059669"
            value={product.storePrice}
            onSave={(v) =>
              onPriceChange(product.id, "storePrice", Math.max(0, v))
            }
          />
          <PriceRow
            label="Precio Adquisición"
            color="#7c3aed"
            value={product.costPrice ?? 0}
            onSave={(v) =>
              onPriceChange(product.id, "costPrice", Math.max(0, v))
            }
          />
        </div>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  color,
  value,
  onSave,
}: {
  label: string;
  color: string;
  value: number;
  onSave: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-1 text-xs">
      <span className="shrink-0 text-gray-400">{label}</span>
      <InlineEdit
        value={value}
        type="number"
        step="0.01"
        min="0"
        onSave={(v) => onSave(parseFloat(v) || 0)}
        toastMessage={`${label} actualizado`}
      >
        <span className="font-semibold" style={{ color }}>
          {value.toFixed(2)} €
        </span>
      </InlineEdit>
    </div>
  );
}
