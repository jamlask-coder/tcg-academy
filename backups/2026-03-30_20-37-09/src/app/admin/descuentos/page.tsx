"use client";
import { useState, useMemo } from "react";
import { PRODUCTS, GAME_CONFIG, CATEGORY_LABELS } from "@/data/products";
import { useDiscounts, type ProductDiscount } from "@/context/DiscountContext";
import { Tag, Zap, Save, X, ChevronDown } from "lucide-react";

export default function AdminDescuentosPage() {
  const {
    discounts,
    setDiscount,
    removeDiscount: _removeDiscount,
    bulkSetDiscount,
    saveToStorage,
  } = useDiscounts();

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
      ? PRODUCTS.filter((p) => p.game === bulk.game)
      : PRODUCTS;
    return [...new Set(src.map((p) => p.category))].sort();
  }, [bulk.game]);

  const filtered = useMemo(() => {
    let list = [...PRODUCTS];
    if (gameFilter) list = list.filter((p) => p.game === gameFilter);
    if (search.trim())
      list = list.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      );
    return list;
  }, [gameFilter, search]);

  const handleSave = () => {
    saveToStorage();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleBulk = () => {
    const pct = parseInt(bulk.pct);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    const targets = PRODUCTS.filter((p) => {
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

  const selectCls =
    "h-9 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#1a3a5c] text-gray-700";
  const inputCls =
    "h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion de descuentos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeCount} descuentos activos
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
            className="flex items-center gap-2 rounded-xl bg-[#1a3a5c] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#15304d]"
          >
            <Save size={16} /> Guardar todo
          </button>
        </div>
      </div>

      {/* Bulk discount */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
          <Zap size={18} className="text-yellow-500" /> Descuento masivo
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          Aplica un descuento a un juego o categoria entera de golpe
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
              <option value="">Todas las categorias</option>
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
            <input
              type="date"
              value={bulk.endsAt}
              onChange={(e) =>
                setBulk((b) => ({ ...b, endsAt: e.target.value }))
              }
              placeholder="Caduca (opcional)"
              className={`w-full ${inputCls}`}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${bulk.active ? "border-[#1a3a5c] bg-[#1a3a5c]" : "border-gray-300"}`}
              onClick={() => setBulk((b) => ({ ...b, active: !b.active }))}
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
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-[#1a3a5c] transition hover:bg-yellow-300"
          >
            <Zap size={14} /> Aplicar a{" "}
            {
              PRODUCTS.filter(
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
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
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
                  Caduca
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
                        className="h-7 rounded-lg border border-gray-200 px-2 text-xs text-gray-600 focus:border-[#1a3a5c] focus:outline-none"
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
            <strong>Caduca:</strong> Si se establece una fecha, el descuento se
            desactiva automáticamente cuando pase.
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
