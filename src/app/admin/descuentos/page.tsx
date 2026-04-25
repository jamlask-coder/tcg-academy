"use client";
import { useState, useMemo, useEffect } from "react";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  type LocalProduct,
} from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { useDiscounts, type ProductDiscount } from "@/context/DiscountContext";
import { Tag, Zap, Save, X, ChevronDown, Plus, Trash2, ToggleRight } from "lucide-react";

export default function AdminDescuentosPage() {
  const {
    discounts,
    setDiscount,
    removeDiscount,
    bulkSetDiscount,
    saveToStorage,
  } = useDiscounts();

  const [allProducts, setAllProducts] = useState<LocalProduct[]>(() =>
    getMergedProducts(),
  );

  useEffect(() => {
    const reload = () => setAllProducts(getMergedProducts());
    window.addEventListener("tcga:products:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:products:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  // Per-product discount editing
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [saved, setSaved] = useState(false);

  // Bulk discount form
  const [bulk, setBulk] = useState({
    game: "",
    category: "",
    pct: "10",
    endsAt: "",
    active: true,
  });

  const games = Object.entries(GAME_CONFIG);

  const allCats = useMemo(() => {
    const src = bulk.game
      ? allProducts.filter((p) => p.game === bulk.game)
      : allProducts;
    return [...new Set(src.map((p) => p.category))].sort();
  }, [bulk.game, allProducts]);

  const filtered = useMemo(() => {
    let list = [...allProducts];
    if (gameFilter) list = list.filter((p) => p.game === gameFilter);
    if (search.trim())
      list = list.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      );
    return list;
  }, [gameFilter, search, allProducts]);

  const handleSave = () => {
    saveToStorage();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleBulk = () => {
    const pct = parseInt(bulk.pct);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    const targets = allProducts.filter((p) => {
      if (bulk.game && p.game !== bulk.game) return false;
      if (bulk.category && p.category !== bulk.category) return false;
      return true;
    });
    bulkSetDiscount(
      targets.map((p) => p.id),
      pct,
      bulk.active,
      bulk.endsAt || undefined,
    );
    saveToStorage();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const activeCount = Object.values(discounts).filter((d) => d.active).length;

  const activeProductDiscounts = useMemo(() => {
    return Object.values(discounts)
      .filter((d) => d.active && d.pct > 0)
      .map((d) => {
        const product = allProducts.find((p) => p.id === d.productId);
        return { ...d, productName: product?.name ?? `Producto #${d.productId}`, game: product?.game ?? "" };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [discounts, allProducts]);

  const selectCls =
    "h-9 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#2563eb] text-gray-700";
  const inputCls =
    "h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] transition";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de descuentos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeCount} descuento{activeCount !== 1 ? "s" : ""} activo{activeCount !== 1 ? "s" : ""} en productos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
              ✓ Guardado
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <Save size={16} /> Guardar todo
          </button>
        </div>
      </div>

      {/* ── Activos ahora ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-100 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">
              {activeCount}
            </span>
            <h2 className="font-bold text-gray-900">Descuentos activos ahora</h2>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("tabla-descuentos");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#2563eb] hover:text-[#2563eb]"
          >
            <Plus size={12} /> Añadir descuento
          </button>
        </div>

        {activeProductDiscounts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No hay descuentos activos en este momento
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Product discounts */}
            {activeProductDiscounts.map((d) => (
              <div key={d.productId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{d.productName}</p>
                  <p className="text-xs capitalize text-gray-400">{d.game}{d.endsAt ? ` · Finaliza ${d.endsAt}` : ""}</p>
                </div>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-sm font-black text-red-600">
                  -{d.pct}%
                </span>
                {/* Edit pct inline */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={d.pct}
                    onChange={(e) => {
                      setDiscount(d.productId, { pct: parseInt(e.target.value) || 0 });
                    }}
                    onBlur={saveToStorage}
                    className="h-7 w-14 rounded-lg border border-gray-200 px-2 text-center text-xs focus:border-red-400 focus:outline-none"
                    aria-label={`Porcentaje de descuento para ${d.productName}`}
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                {/* Toggle active */}
                <button
                  onClick={() => { setDiscount(d.productId, { active: false }); saveToStorage(); }}
                  title="Desactivar"
                  aria-label={`Desactivar descuento de ${d.productName}`}
                  className="text-green-500 transition hover:text-gray-400"
                >
                  <ToggleRight size={20} />
                </button>
                {/* Delete */}
                <button
                  onClick={() => { removeDiscount(d.productId); saveToStorage(); }}
                  title="Eliminar descuento"
                  aria-label={`Eliminar descuento de ${d.productName}`}
                  className="text-gray-300 transition hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}


          </div>
        )}
      </div>

      {/* Bulk discount */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
          <Zap size={18} className="text-yellow-500" /> Descuento masivo
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          Aplica un descuento a un juego o categoría entera de golpe
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <select
              value={bulk.game}
              onChange={(e) =>
                setBulk((b) => ({ ...b, game: e.target.value, category: "" }))
              }
              className={`w-full ${selectCls}`}
            >
              <option value="">Todos los juegos</option>
              {games.map(([slug, { name }]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <div className="relative">
            <select
              value={bulk.category}
              onChange={(e) =>
                setBulk((b) => ({ ...b, category: e.target.value }))
              }
              className={`w-full ${selectCls}`}
            >
              <option value="">Todas las categorías</option>
              {allCats.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={bulk.pct}
              onChange={(e) => setBulk((b) => ({ ...b, pct: e.target.value }))}
              className={`w-20 ${inputCls} text-right`}
            />
            <span className="text-sm font-bold text-gray-500">%</span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Finalización del descuento
            </label>
            <input
              type="date"
              value={bulk.endsAt}
              onChange={(e) =>
                setBulk((b) => ({ ...b, endsAt: e.target.value }))
              }
              className={`w-full ${inputCls}`}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <div
              role="checkbox"
              aria-checked={bulk.active}
              tabIndex={0}
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${bulk.active ? "border-[#2563eb] bg-[#2563eb]" : "border-gray-300"}`}
              onClick={() => setBulk((b) => ({ ...b, active: !b.active }))}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setBulk((b) => ({ ...b, active: !b.active }));
                }
              }}
            >
              {bulk.active && (
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
            <span className="text-sm text-gray-700">Activar descuento</span>
          </label>
          <button
            onClick={handleBulk}
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-[#2563eb] transition hover:bg-yellow-300"
          >
            <Zap size={14} /> Aplicar a{" "}
            {
              allProducts.filter(
                (p) =>
                  (bulk.game ? p.game === bulk.game : true) &&
                  (bulk.category ? p.category === bulk.category : true),
              ).length
            }{" "}
            productos
          </button>
        </div>
      </div>

      {/* Per-product discounts */}
      <div id="tabla-descuentos" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-wrap gap-3 border-b border-gray-100 px-4 py-3">
          <div className="relative min-w-[160px] flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className={`w-full ${inputCls} pl-3`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className={selectCls}
            >
              <option value="">Todos</option>
              {games.map(([slug, { name }]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">
                  Producto
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">
                  PVP
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-red-500">
                  Descuento %
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">
                  Precio final
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">
                  Finalización
                </th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-600">
                  Activo
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 40).map((p) => {
                const disc = discounts[p.id] as ProductDiscount | undefined;
                const pct = disc?.pct ?? 0;
                const finalPrice =
                  pct > 0 ? p.price * (1 - pct / 100) : p.price;
                const active = disc?.active ?? false;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 transition hover:bg-gray-50 ${active && pct > 0 ? "bg-red-50" : ""}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="line-clamp-1 block max-w-[240px] font-medium text-gray-800">
                        {p.name}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {p.game}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500">
                      {p.price.toFixed(2)}€
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={disc?.pct ?? 0}
                          onChange={(e) =>
                            setDiscount(p.id, {
                              pct: parseInt(e.target.value) || 0,
                            })
                          }
                          className="h-7 w-16 rounded-lg border border-gray-200 px-2 text-center text-sm focus:border-red-400 focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={
                          pct > 0 && active
                            ? "font-bold text-red-600"
                            : "text-gray-500"
                        }
                      >
                        {finalPrice.toFixed(2)}€
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="date"
                        value={disc?.endsAt ?? ""}
                        onChange={(e) =>
                          setDiscount(p.id, {
                            endsAt: e.target.value || undefined,
                          })
                        }
                        className="h-7 rounded-lg border border-gray-200 px-2 text-xs text-gray-600 focus:border-[#2563eb] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => setDiscount(p.id, { active: !active })}
                        className={`relative h-5 w-10 rounded-full transition-colors ${active ? "bg-green-500" : "bg-gray-300"}`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${active ? "left-5.5 translate-x-0.5" : "left-0.5"}`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 40 && (
          <div className="border-t border-gray-100 py-3 text-center text-xs text-gray-400">
            Mostrando 40 de {filtered.length} — usa el buscador para filtrar
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <Tag size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <div className="space-y-1 text-xs text-gray-500">
          <p>
            <strong>Descuento activo:</strong> El porcentaje se aplica al precio
            de cada nivel de usuario (General, Mayoristas, Tiendas TCG)
            automáticamente.
          </p>
          <p>
            <strong>Finalización del descuento:</strong> Fecha en la que el
            descuento dejará de aplicarse. Al llegar esa fecha, el descuento se
            desactiva automáticamente. Si no se indica fecha, el descuento
            permanece activo indefinidamente.
          </p>
          <p>
            <strong>Descuento masivo:</strong> Aplica el mismo % a un juego o
            categoría entera. Los valores individuales se sobrescriben.
          </p>
        </div>
      </div>
    </div>
  );
}
