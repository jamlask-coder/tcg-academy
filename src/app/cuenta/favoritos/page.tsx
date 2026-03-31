"use client";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PRODUCTS } from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";

export default function FavoritosPage() {
  const { user } = useAuth();
  const favorites = PRODUCTS.filter((p) => user?.favorites.includes(p.id));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis favoritos</h1>
        <p className="mt-1 text-sm text-gray-500">
          {favorites.length} producto{favorites.length !== 1 ? "s" : ""}{" "}
          guardados
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center">
          <Heart size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="mb-2 font-bold text-gray-700">
            No tienes favoritos todavia
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Haz click en el corazon de cualquier producto para guardarlo aqui
          </p>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <ShoppingBag size={16} /> Explorar catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((p) => (
            <LocalProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
