"use client";
import { useState, useEffect } from "react";
import { Layers, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  loadSubcategories,
  saveSubcategories,
  type SubcategoryMap,
  type Subcategory,
} from "@/data/subcategories";
import { MEGA_MENU_DATA } from "@/data/megaMenuData";

const SUPPORTED_GAMES = ["magic", "one-piece", "riftbound"];

export default function AdminCategoriasPage() {
  const [map, setMap] = useState<SubcategoryMap>({});
  const [game, setGame] = useState(SUPPORTED_GAMES[0]);
  const [newLabel, setNewLabel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMap(loadSubcategories());
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const persist = (next: SubcategoryMap) => {
    setMap(next);
    saveSubcategories(next);
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    const current = map[game] ?? [];
    persist({ ...map, [game]: [...current, { id, label }] });
    setNewLabel("");
    showToast(`Subcategoría "${label}" añadida`);
  };

  const handleDelete = (id: string) => {
    const current = map[game] ?? [];
    persist({ ...map, [game]: current.filter((s) => s.id !== id) });
    showToast("Subcategoría eliminada");
  };

  const startEdit = (s: Subcategory) => {
    setEditId(s.id);
    setEditLabel(s.label);
  };

  const confirmEdit = () => {
    if (!editId) return;
    const label = editLabel.trim();
    if (!label) return;
    const current = map[game] ?? [];
    persist({
      ...map,
      [game]: current.map((s) => (s.id === editId ? { ...s, label } : s)),
    });
    setEditId(null);
    showToast("Nombre actualizado");
  };

  const gameLabel = (slug: string) =>
    MEGA_MENU_DATA.find((g) => g.slug === slug)?.label ?? slug;

  const items = map[game] ?? [];

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Layers size={22} className="text-[#2563eb]" /> Subcategorías / Colecciones
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona las colecciones que aparecen como filtro lateral en cada juego.
        </p>
      </div>

      {/* Game selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {SUPPORTED_GAMES.map((slug) => (
          <button
            key={slug}
            onClick={() => setGame(slug)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              game === slug
                ? "bg-[#2563eb] text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-[#2563eb] hover:text-[#2563eb]"
            }`}
          >
            {gameLabel(slug)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current list */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">
              Colecciones de {gameLabel(game)}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {items.length} {items.length === 1 ? "colección" : "colecciones"}
            </p>
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Sin subcategorías. Añade la primera desde el panel de la derecha.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  {editId === s.id ? (
                    <>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirmEdit()}
                        className="h-8 flex-1 rounded-lg border border-[#2563eb] px-2 text-sm focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={confirmEdit}
                        className="rounded-lg bg-[#2563eb] p-1.5 text-white"
                        aria-label="Guardar"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-400"
                        aria-label="Cancelar"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {s.label}
                      </span>
                      <button
                        onClick={() => startEdit(s)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-[#2563eb] hover:text-[#2563eb]"
                        aria-label={`Editar ${s.label}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-red-300 hover:text-red-500"
                        aria-label={`Eliminar ${s.label}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add new */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">
            Añadir subcategoría
          </h2>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">
            Nombre de la colección
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={game === "magic" ? "Ej: Bloomburrow" : game === "one-piece" ? "Ej: OP-16" : "Ej: Nueva expansión"}
              className="h-10 flex-1 rounded-xl border-2 border-gray-200 px-3 text-sm transition focus:border-[#2563eb] focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus size={15} /> Añadir
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Las subcategorías aparecen automáticamente en el filtro lateral de la página de {gameLabel(game)}.
          </p>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
            <p className="font-semibold">¿Cómo funciona?</p>
            <ul className="mt-1 space-y-1 text-blue-600">
              <li>• Añade una colección → aparece en el sidebar de la tienda</li>
              <li>• Los clientes pueden filtrar productos por colección</li>
              <li>• Puedes editar o eliminar colecciones en cualquier momento</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
