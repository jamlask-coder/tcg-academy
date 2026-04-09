"use client";
import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { PRODUCTS, GAME_CONFIG } from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import Link from "next/link";
import { CategoryTags } from "@/components/filters/CategoryTags";

const SORT_OPTIONS = [
  { value: "featured", label: "Destacados primero" },
  { value: "new", label: "Mas recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
];

const PAGE_SIZE = 24;

export default function CatalogoPage() {
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  const games = Object.entries(GAME_CONFIG);

  const filtered = useMemo(() => {
    let list = [...PRODUCTS];
    if (selectedGame) list = list.filter((p) => p.game === selectedGame);
    if (inStockOnly) list = list.filter((p) => p.inStock);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (sort === "new")
      list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    else if (sort === "featured")
      list = [...list].sort(
        (a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0),
      );
    else if (sort === "price-asc")
      list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc")
      list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [selectedGame, inStockOnly, search, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">
          Catálogo completo
        </h1>
        <p className="text-gray-500">
          {PRODUCTS.length} referencias de los mejores juegos TCG
        </p>
      </div>

      {/* Game filter pills */}
      <div className="mb-6">
        <CategoryTags
          items={[
            {
              id: "all",
              label: "Todos",
              onClick: () => {
                setSelectedGame(null);
                setPage(1);
              },
            },
            ...games.map(([slug, { name }]) => ({
              id: slug,
              label: name,
              onClick: () => {
                setSelectedGame(selectedGame === slug ? null : slug);
                setPage(1);
              },
            })),
          ]}
          activeId={selectedGame ?? "all"}
          color={
            selectedGame
              ? (GAME_CONFIG[selectedGame]?.color ?? "#2563eb")
              : "#2563eb"
          }
        />
      </div>

      {/* Search + sort + filters bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar cartas, sobres, mazos..."
            className="h-11 w-full rounded-xl border-2 border-gray-200 pr-4 pl-10 text-sm transition focus:border-[#2563eb] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="h-11 cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white pr-9 pl-4 text-sm font-medium text-gray-700 transition focus:border-[#2563eb] focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
          />
        </div>

        <button
          aria-label="Mostrar filtros"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex h-11 items-center gap-2 rounded-xl border-2 px-4 text-sm font-semibold transition ${
            filtersOpen
              ? "border-[#2563eb] bg-[#2563eb] text-white"
              : "border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <SlidersHorizontal size={15} /> Filtros
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                inStockOnly
                  ? "border-[#2563eb] bg-[#2563eb]"
                  : "border-gray-300"
              }`}
              onClick={() => {
                setInStockOnly(!inStockOnly);
                setPage(1);
              }}
            >
              {inStockOnly && (
                <svg
                  className="h-3 w-3 text-white"
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
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">
              Solo en stock
            </span>
          </label>
          {inStockOnly && (
            <button
              aria-label="Limpiar filtros"
              onClick={() => setInStockOnly(false)}
              className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
            >
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Active game filter label */}
      {selectedGame && (
        <div className="mb-4 text-sm text-gray-500">
          Mostrando:{" "}
          <Link
            href={`/${selectedGame}`}
            className="font-semibold text-[#2563eb] hover:underline"
          >
            {GAME_CONFIG[selectedGame]?.name ?? selectedGame}
          </Link>
          <button
            onClick={() => setSelectedGame(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <Search size={48} className="mx-auto mb-4 text-gray-200" />
          <h2 className="mb-2 text-xl font-bold text-gray-700">
            No se encontraron productos
          </h2>
          <p className="mb-6 text-gray-500">
            Prueba con otros términos o elimina los filtros
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedGame(null);
              setInStockOnly(false);
            }}
            className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Limpiar todo
          </button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {filtered.length} productos
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-xl border-2 border-[#2563eb] bg-white px-10 py-3.5 font-bold text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white"
              >
                Cargar mas productos
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
