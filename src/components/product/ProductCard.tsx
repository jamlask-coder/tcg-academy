"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const price = parseFloat(product.price || "0");
  const regularPrice = parseFloat(product.regular_price || "0");
  const onSale = product.on_sale && regularPrice > price;
  const image = product.images?.[0]?.src || "/placeholder-card.jpg";
  const inStock = product.stock_status === "instock";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inStock) return;
    addItem(product.id, product.name, price, image);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-gray-50"
      >
        <Image
          src={image}
          alt={product.images?.[0]?.alt || product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {onSale && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              OFERTA
            </span>
          )}
          {product.featured && (
            <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white">
              NUEVO
            </span>
          )}
          {!inStock && (
            <span className="rounded-full bg-gray-400 px-2 py-0.5 text-[10px] font-bold text-white">
              AGOTADO
            </span>
          )}
        </div>
        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setWishlisted(!wishlisted);
          }}
          aria-label={wishlisted ? "Quitar de favoritos" : "Añadir a favoritos"}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-white"
        >
          <Heart
            size={15}
            className={
              wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"
            }
          />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.categories?.[0] && (
          <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            {product.categories[0].name}
          </span>
        )}
        <Link href={`/producto/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm leading-tight font-semibold text-gray-800 transition hover:text-[#2563eb]">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <span className="text-lg font-bold text-[#2563eb]">
            {price.toFixed(2)}€
          </span>
          {onSale && (
            <span className="text-sm text-gray-400 line-through">
              {regularPrice.toFixed(2)}€
            </span>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={handleAddToCart}
          disabled={!inStock || added}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all ${
            !inStock
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : added
                ? "bg-green-500 text-white"
                : "bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:scale-95"
          }`}
        >
          <ShoppingCart size={15} />
          {!inStock ? "Sin stock" : added ? "Añadido!" : "Añadir al carrito"}
        </button>
      </div>
    </div>
  );
}
