"use client";
import { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import {
  loadSubcategories,
  saveSubcategories,
  type SubcategoryMap,
  type Subcategory,
} from "@/data/subcategories";
import { MEGA_MENU_DATA, type MegaMenuColumn } from "@/data/megaMenuData";
import {
  getMergedMegaMenu,
  loadMegaMenuOverrides,
  saveMegaMenuOverrides,
} from "@/lib/megaMenuOverrides";

// Mostramos todos los juegos del mega-menú — así puede editar Pokémon, Magic,
// One Piece, Yu-Gi-Oh!, Topps, Dragon Ball, Naruto y Riftbound.
const ALL_GAMES = MEGA_MENU_DATA.map((g) => g.slug);
// Juegos con colecciones: los 3 juegos principales que sí tienen desplegable
// en la navbar. Pokémon y los de "Otros TCG" no usan colecciones.
const COLLECTION_GAMES = ["magic", "one-piece", "riftbound"];

type Tab = "categorias" | "colecciones";

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminCategoriasPage() {
  const [tab, setTab] = useState<Tab>("categorias");
  const [game, setGame] = useState(ALL_GAMES[0]);
  const [toast, setToast] = useState<string | null>(null);

  // ─── Mega-menú overrides (tab "categorias") ────────────────────────────────
  const [columns, setColumns] = useState<MegaMenuColumn[]>([]);
  const [newItemByCol, setNewItemByCol] = useState<Record<number, string>>({});
  const [newColTitle, setNewColTitle] = useState("");

  // ─── Subcategorías (tab "colecciones") ─────────────────────────────────────
  const [subMap, setSubMap] = useState<SubcategoryMap>({});
  const [newSubLabel, setNewSubLabel] = useState("");
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubLabel, setEditSubLabel] = useState("");

  const reloadColumns = (slug: string) => {
    const merged = getMergedMegaMenu().find((g) => g.slug === slug);
    setColumns(merged ? structuredClone(merged.columns) : []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubMap(loadSubcategories());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadColumns(game);
  }, [game]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const gameLabel = (slug: string) =>
    MEGA_MENU_DATA.find((g) => g.slug === slug)?.label ?? slug;

  // ─── Persistir overrides del mega-menú ─────────────────────────────────────
  const persistColumns = (next: MegaMenuColumn[]) => {
    setColumns(next);
    const overrides = loadMegaMenuOverrides();
    overrides[game] = { columns: next };
    saveMegaMenuOverrides(overrides);
  };

  const resetColumns = () => {
    if (!confirm(`¿Restaurar las categorías por defecto de ${gameLabel(game)}?`)) return;
    const overrides = loadMegaMenuOverrides();
    delete overrides[game];
    saveMegaMenuOverrides(overrides);
    const defaults = MEGA_MENU_DATA.find((g) => g.slug === game);
    setColumns(defaults ? structuredClone(defaults.columns) : []);
    showToast("Categorías restauradas a los valores por defecto");
  };

  const addItem = (colIdx: number) => {
    const raw = (newItemByCol[colIdx] ?? "").trim();
    if (!raw) return;
    const slug = slugifyLabel(raw);
    const href = `/${game}/${slug}`;
    const next = structuredClone(columns);
    next[colIdx].items.push({ label: raw, href });
    persistColumns(next);
    setNewItemByCol((prev) => ({ ...prev, [colIdx]: "" }));
    showToast(`Categoría "${raw}" añadida`);
  };

  const removeItem = (colIdx: number, itemIdx: number) => {
    const next = structuredClone(columns);
    const [removed] = next[colIdx].items.splice(itemIdx, 1);
    persistColumns(next);
    showToast(`"${removed.label}" eliminada`);
  };

  const updateItemLabel = (colIdx: number, itemIdx: number, label: string) => {
    const next = structuredClone(columns);
    next[colIdx].items[itemIdx].label = label;
    persistColumns(next);
  };

  const updateItemHref = (colIdx: number, itemIdx: number, href: string) => {
    const next = structuredClone(columns);
    next[colIdx].items[itemIdx].href = href;
    persistColumns(next);
  };

  const moveItem = (colIdx: number, itemIdx: number, dir: -1 | 1) => {
    const next = structuredClone(columns);
    const items = next[colIdx].items;
    const target = itemIdx + dir;
    if (target < 0 || target >= items.length) return;
    [items[itemIdx], items[target]] = [items[target], items[itemIdx]];
    persistColumns(next);
  };

  const addColumn = () => {
    const title = newColTitle.trim();
    if (!title) return;
    persistColumns([...columns, { title, items: [] }]);
    setNewColTitle("");
    showToast(`Columna "${title}" añadida`);
  };

  const removeColumn = (colIdx: number) => {
    const col = columns[colIdx];
    if (!confirm(`¿Eliminar la columna "${col.title}" y sus ${col.items.length} items?`)) return;
    const next = structuredClone(columns);
    next.splice(colIdx, 1);
    persistColumns(next);
  };

  const updateColumnTitle = (colIdx: number, title: string) => {
    const next = structuredClone(columns);
    next[colIdx].title = title;
    persistColumns(next);
  };

  // ─── Colecciones (subcategorías) ───────────────────────────────────────────
  const subItems = subMap[game] ?? [];

  const persistSub = (next: SubcategoryMap) => {
    setSubMap(next);
    saveSubcategories(next);
  };

  const handleAddSub = () => {
    const label = newSubLabel.trim();
    if (!label) return;
    const id = slugifyLabel(label) + "-" + Date.now();
    const current = subMap[game] ?? [];
    persistSub({ ...subMap, [game]: [...current, { id, label }] });
    setNewSubLabel("");
    showToast(`Colección "${label}" añadida`);
  };

  const handleDeleteSub = (id: string) => {
    const current = subMap[game] ?? [];
    persistSub({ ...subMap, [game]: current.filter((s) => s.id !== id) });
    showToast("Colección eliminada");
  };

  const startEditSub = (s: Subcategory) => {
    setEditSubId(s.id);
    setEditSubLabel(s.label);
  };

  const confirmEditSub = () => {
    if (!editSubId) return;
    const label = editSubLabel.trim();
    if (!label) return;
    const current = subMap[game] ?? [];
    persistSub({
      ...subMap,
      [game]: current.map((s) =>
        s.id === editSubId ? { ...s, label } : s,
      ),
    });
    setEditSubId(null);
    showToast("Nombre actualizado");
  };

  const handleMoveSub = (id: string, dir: -1 | 1) => {
    const current = subMap[game] ?? [];
    const idx = current.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= current.length) return;
    const next = [...current];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    persistSub({ ...subMap, [game]: next });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const hasOverride = Boolean(loadMegaMenuOverrides()[game]);

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Layers size={22} className="text-[#2563eb]" /> Categorías
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Diseña las categorías del mega-menú y las colecciones de cada juego.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => setTab("categorias")}
          className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
            tab === "categorias"
              ? "bg-white text-[#2563eb] shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Categorías
        </button>
        <button
          onClick={() => setTab("colecciones")}
          className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
            tab === "colecciones"
              ? "bg-white text-[#2563eb] shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Colecciones
        </button>
      </div>

      {/* Game selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(tab === "colecciones" ? COLLECTION_GAMES : ALL_GAMES).map((slug) => (
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

      {tab === "categorias" ? (
        <CategoriesEditor
          gameLabel={gameLabel(game)}
          columns={columns}
          newItemByCol={newItemByCol}
          onChangeNewItem={(idx, val) =>
            setNewItemByCol((prev) => ({ ...prev, [idx]: val }))
          }
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItemLabel={updateItemLabel}
          onUpdateItemHref={updateItemHref}
          onMoveItem={moveItem}
          onRemoveColumn={removeColumn}
          onUpdateColumnTitle={updateColumnTitle}
          newColTitle={newColTitle}
          onChangeNewColTitle={setNewColTitle}
          onAddColumn={addColumn}
          hasOverride={hasOverride}
          onResetColumns={resetColumns}
        />
      ) : (
        <CollectionsEditor
          gameLabel={gameLabel(game)}
          game={game}
          items={subItems}
          newLabel={newSubLabel}
          onChangeNewLabel={setNewSubLabel}
          onAdd={handleAddSub}
          onDelete={handleDeleteSub}
          editId={editSubId}
          editLabel={editSubLabel}
          onChangeEditLabel={setEditSubLabel}
          onStartEdit={startEditSub}
          onConfirmEdit={confirmEditSub}
          onCancelEdit={() => setEditSubId(null)}
          onMove={handleMoveSub}
        />
      )}
    </div>
  );
}

// ─── Subcomponente: editor de categorías (mega menú) ─────────────────────────

interface CategoriesEditorProps {
  gameLabel: string;
  columns: MegaMenuColumn[];
  newItemByCol: Record<number, string>;
  onChangeNewItem: (idx: number, val: string) => void;
  onAddItem: (colIdx: number) => void;
  onRemoveItem: (colIdx: number, itemIdx: number) => void;
  onUpdateItemLabel: (colIdx: number, itemIdx: number, label: string) => void;
  onUpdateItemHref: (colIdx: number, itemIdx: number, href: string) => void;
  onMoveItem: (colIdx: number, itemIdx: number, dir: -1 | 1) => void;
  onRemoveColumn: (colIdx: number) => void;
  onUpdateColumnTitle: (colIdx: number, title: string) => void;
  newColTitle: string;
  onChangeNewColTitle: (val: string) => void;
  onAddColumn: () => void;
  hasOverride: boolean;
  onResetColumns: () => void;
}

function CategoriesEditor(props: CategoriesEditorProps) {
  const {
    gameLabel,
    columns,
    newItemByCol,
    onChangeNewItem,
    onAddItem,
    onRemoveItem,
    onUpdateItemLabel,
    onUpdateItemHref,
    onMoveItem,
    onRemoveColumn,
    onUpdateColumnTitle,
    newColTitle,
    onChangeNewColTitle,
    onAddColumn,
    hasOverride,
    onResetColumns,
  } = props;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Categorías de <strong>{gameLabel}</strong> — agrupadas en columnas
          (tal y como se muestran en el mega-menú del navbar).
        </div>
        {hasOverride && (
          <button
            onClick={onResetColumns}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-amber-400 hover:text-amber-600"
          >
            <RotateCcw size={12} /> Restaurar por defecto
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {columns.map((col, colIdx) => (
          <div
            key={colIdx}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-4 py-3">
              <input
                value={col.title}
                onChange={(e) => onUpdateColumnTitle(colIdx, e.target.value)}
                className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-gray-900 transition focus:border-[#2563eb] focus:bg-white focus:outline-none"
              />
              <button
                onClick={() => onRemoveColumn(colIdx)}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-red-300 hover:text-red-500"
                aria-label={`Eliminar columna ${col.title}`}
              >
                <Trash2 size={13} />
              </button>
            </div>

            {col.items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">
                Columna vacía — añade la primera categoría abajo.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {col.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className="flex flex-col gap-1.5 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={item.label}
                        onChange={(e) =>
                          onUpdateItemLabel(colIdx, itemIdx, e.target.value)
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm transition focus:border-[#2563eb] focus:outline-none"
                        placeholder="Nombre de la categoría"
                      />
                      <button
                        onClick={() => onMoveItem(colIdx, itemIdx, -1)}
                        disabled={itemIdx === 0}
                        className="rounded-lg border border-gray-200 p-1 text-gray-400 transition hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-30"
                        aria-label="Subir"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => onMoveItem(colIdx, itemIdx, 1)}
                        disabled={itemIdx === col.items.length - 1}
                        className="rounded-lg border border-gray-200 p-1 text-gray-400 transition hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-30"
                        aria-label="Bajar"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(colIdx, itemIdx)}
                        className="rounded-lg border border-gray-200 p-1 text-gray-400 transition hover:border-red-300 hover:text-red-500"
                        aria-label={`Eliminar ${item.label}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      value={item.href}
                      onChange={(e) =>
                        onUpdateItemHref(colIdx, itemIdx, e.target.value)
                      }
                      className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-500 transition focus:border-[#2563eb] focus:bg-white focus:text-gray-800 focus:outline-none"
                      placeholder="/juego/slug"
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-gray-100 bg-gray-50/30 px-4 py-3">
              <div className="flex gap-2">
                <input
                  value={newItemByCol[colIdx] ?? ""}
                  onChange={(e) => onChangeNewItem(colIdx, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onAddItem(colIdx)}
                  placeholder="Nueva categoría"
                  className="h-9 flex-1 rounded-lg border border-gray-200 px-2 text-sm transition focus:border-[#2563eb] focus:outline-none"
                />
                <button
                  onClick={() => onAddItem(colIdx)}
                  disabled={!(newItemByCol[colIdx] ?? "").trim()}
                  className="flex h-9 items-center gap-1 rounded-lg bg-[#2563eb] px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  <Plus size={13} /> Añadir
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Añadir columna */}
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-500">Nueva columna</p>
          <input
            value={newColTitle}
            onChange={(e) => onChangeNewColTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddColumn()}
            placeholder='Ej: "Accesorios"'
            className="h-9 w-full max-w-[240px] rounded-lg border border-gray-200 px-3 text-sm transition focus:border-[#2563eb] focus:outline-none"
          />
          <button
            onClick={onAddColumn}
            disabled={!newColTitle.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            <Plus size={13} /> Añadir columna
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
        <p className="font-semibold">¿Cómo funciona?</p>
        <ul className="mt-1 space-y-1 text-blue-600">
          <li>• Los cambios aparecen al instante en el mega-menú del navbar.</li>
          <li>• La ruta (<code>/juego/slug</code>) determina la URL pública de la categoría.</li>
          <li>• &ldquo;Restaurar por defecto&rdquo; elimina tus cambios y vuelve a los valores del archivo base.</li>
        </ul>
      </div>
    </>
  );
}

// ─── Subcomponente: editor de colecciones (subcategorías) ────────────────────

interface CollectionsEditorProps {
  gameLabel: string;
  game: string;
  items: Subcategory[];
  newLabel: string;
  onChangeNewLabel: (val: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  editId: string | null;
  editLabel: string;
  onChangeEditLabel: (val: string) => void;
  onStartEdit: (s: Subcategory) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onMove: (id: string, dir: -1 | 1) => void;
}

function CollectionsEditor(props: CollectionsEditorProps) {
  const {
    gameLabel,
    game,
    items,
    newLabel,
    onChangeNewLabel,
    onAdd,
    onDelete,
    editId,
    editLabel,
    onChangeEditLabel,
    onStartEdit,
    onConfirmEdit,
    onCancelEdit,
    onMove,
  } = props;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">
            Colecciones de {gameLabel}
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {items.length} {items.length === 1 ? "colección" : "colecciones"}
          </p>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Sin colecciones. Añade la primera desde el panel de la derecha.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((s, idx) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                {editId === s.id ? (
                  <>
                    <input
                      value={editLabel}
                      onChange={(e) => onChangeEditLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && onConfirmEdit()}
                      className="h-8 flex-1 rounded-lg border border-[#2563eb] px-2 text-sm focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={onConfirmEdit}
                      className="rounded-lg bg-[#2563eb] p-1.5 text-white"
                      aria-label="Guardar"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={onCancelEdit}
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
                      onClick={() => onMove(s.id, -1)}
                      disabled={idx === 0}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-[#2563eb] hover:text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400"
                      aria-label={`Subir ${s.label}`}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => onMove(s.id, 1)}
                      disabled={idx === items.length - 1}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-[#2563eb] hover:text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400"
                      aria-label={`Bajar ${s.label}`}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      onClick={() => onStartEdit(s)}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-[#2563eb] hover:text-[#2563eb]"
                      aria-label={`Editar ${s.label}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(s.id)}
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

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">Añadir colección</h2>
        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
          Nombre de la colección
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => onChangeNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder={
              game === "magic"
                ? "Ej: Bloomburrow"
                : game === "one-piece"
                  ? "Ej: OP-16"
                  : "Ej: Nueva expansión"
            }
            className="h-10 flex-1 rounded-xl border-2 border-gray-200 px-3 text-sm transition focus:border-[#2563eb] focus:outline-none"
          />
          <button
            onClick={onAdd}
            disabled={!newLabel.trim()}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            <Plus size={15} /> Añadir
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Las colecciones aparecen como filtro lateral en la página de{" "}
          {gameLabel}.
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
  );
}
