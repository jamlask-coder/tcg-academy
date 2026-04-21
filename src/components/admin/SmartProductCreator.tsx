"use client";
// SmartProductCreator — Buscador premium Phase 2.
//
// El admin escribe unas palabras ("bloomburrow booster box", "stellar crown etb", ...).
// Busca en paralelo en 5 catálogos TCG públicos (TCGCSV, Scryfall, pokemontcg.io,
// TCGDex, ygoprodeck), fusiona duplicados por game+setName y muestra una rejilla
// con las posibles opciones. Al seleccionar una, el ProductForm se prellena con
// nombre, slug, juego, categoría, precios estimados, descripción, tags e
// imágenes sugeridas (logos del set). Puede limpiar el fondo de cada imagen
// con flood-fill de bordes.
//
// Extras premium:
//   - Chips de filtro por juego (in-memory, sobre los candidatos devueltos)
//   - Ordenación: relevancia / reciente / más cartas
//   - Historial de búsqueda (localStorage, 8 últimas)
//   - Sugerencias curadas cuando la query está vacía
//   - Resaltado de tokens coincidentes en el nombre del set
//   - Esqueletos de carga (animate-pulse)
//   - Atajos de teclado: "/" enfoca buscador · ↑↓←→ navega · Enter selecciona · Esc limpia
//   - Badges con conteo por fuente (tcgcsv, scryfall, ...)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  Keyboard,
  Loader2,
  Search,
  Sparkles,
  X,
  Eraser,
} from "lucide-react";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";
import {
  searchProducts,
  candidateToDraft,
  removeBackgroundFromImage,
  runOcrOnImages,
  extractClues,
  type ProductCandidate,
  type ProductDraft,
  type CatalogSearchResult,
} from "@/lib/productIdentifier";
import { GAME_CONFIG, CATEGORY_LABELS } from "@/data/products";
import { logger } from "@/lib/logger";
import { GameFilterChips } from "./smartProduct/GameFilterChips";
import { HighlightedText } from "./smartProduct/HighlightedText";
import { ResultSkeleton } from "./smartProduct/ResultSkeleton";
import { SearchEmptyState } from "./smartProduct/SearchEmptyState";
import { SortDropdown } from "./smartProduct/SortDropdown";
import {
  clearHistory,
  countByGame,
  countBySource,
  filterAndSort,
  loadHistory,
  pushHistory,
  saveHistory,
  type SortMode,
} from "./smartProduct/searchHelpers";

interface Props {
  onSubmit: (data: ProductFormValues, tags: string[], images: string[]) => void;
  onSubmitAndNew?: (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => void;
}

type Stage = "search" | "selected";

function draftToFormValues(d: ProductDraft): Partial<ProductFormValues> {
  return {
    name: d.name,
    slug: d.slug,
    description: d.description,
    game: d.game,
    category: d.category,
    language: d.language,
    price: d.price,
    wholesalePrice: d.wholesalePrice,
    storePrice: d.storePrice,
    costPrice: d.costPrice,
    comparePrice: d.comparePrice,
    inStock: d.inStock,
    isNew: d.isNew,
  };
}

// ─── Candidate card ──────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  query,
  focused,
  onSelect,
}: {
  candidate: ProductCandidate;
  query: string;
  focused: boolean;
  onSelect: () => void;
}) {
  const game = GAME_CONFIG[candidate.game];
  const cover = candidate.suggestedImages[0] ?? candidate.images[0];
  const scorePct = Math.round(candidate.score * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      data-candidate-card
      className={`group flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none ${
        focused
          ? "-translate-y-0.5 border-[#2563eb] shadow-lg ring-4 ring-[#2563eb]/15"
          : "border-gray-200 hover:border-[#2563eb]"
      }`}
    >
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={candidate.setName}
            className="max-h-28 max-w-[80%] object-contain drop-shadow-sm transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl opacity-40">{game?.emoji ?? "📦"}</span>
        )}
        <span
          className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
            scorePct >= 80
              ? "bg-green-100 text-green-700"
              : scorePct >= 50
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600"
          }`}
          title={`Relevancia: ${scorePct}%`}
        >
          {scorePct}%
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: game?.bgColor ?? "#f3f4f6",
              color: game?.color ?? "#374151",
            }}
          >
            {game?.emoji} {game?.name ?? candidate.game}
          </span>
          {candidate.categoryGuess && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
              {CATEGORY_LABELS[candidate.categoryGuess] ??
                candidate.categoryGuess}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm font-bold text-gray-900">
          <HighlightedText text={candidate.setName} query={query} />
        </p>
        <div className="mt-auto flex flex-wrap gap-1 text-[10px] text-gray-500">
          {candidate.releasedAt && <span>{candidate.releasedAt}</span>}
          {candidate.cardCount ? <span>· {candidate.cardCount} cartas</span> : null}
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {candidate.sources.map((s) => (
            <span
              key={s}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-[#2563eb]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ─── Image picker with background removal ───────────────────────────────────

function ImagePickerWithBg({
  candidate,
  onImagesChange,
}: {
  candidate: ProductCandidate;
  onImagesChange: (images: string[]) => void;
}) {
  // Mapa src original → src limpia (o mismo si no se limpia)
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [cleaning, setCleaning] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidate.suggestedImages),
  );

  const resolveImage = (src: string) => overrides[src] ?? src;

  useEffect(() => {
    const list = candidate.images
      .filter((src) => selected.has(src))
      .map(resolveImage);
    onImagesChange(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, selected]);

  const toggleSelect = (src: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

  const cleanBg = async (src: string) => {
    setCleaning(src);
    try {
      const cleaned = await removeBackgroundFromImage(src, {
        tolerance: 28,
        requireUniformBg: false,
      });
      if (cleaned) {
        setOverrides((prev) => ({ ...prev, [src]: cleaned }));
      }
    } finally {
      setCleaning(null);
    }
  };

  if (candidate.images.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No se encontraron imágenes en los catálogos. Podrás subir las tuyas en
        el formulario.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {candidate.images.map((src) => {
        const actual = resolveImage(src);
        const isSel = selected.has(src);
        const isCleaning = cleaning === src;
        const wasCleaned = !!overrides[src];
        return (
          <div
            key={src}
            className={`group relative overflow-hidden rounded-xl border-2 bg-white transition ${
              isSel
                ? "border-[#2563eb] ring-2 ring-[#2563eb]/20"
                : "border-gray-200"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleSelect(src)}
              className="relative flex aspect-square w-full items-center justify-center bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23f3f4f6%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23f3f4f6%22/></svg>')] bg-gray-50 p-2"
              aria-pressed={isSel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={actual}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
              {isSel && (
                <span className="absolute top-1.5 left-1.5 rounded-full bg-[#2563eb] p-1 text-white">
                  <CheckCircle2 size={12} />
                </span>
              )}
            </button>
            <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1.5">
              <span className="text-[10px] text-gray-500">
                {wasCleaned ? "Fondo limpio" : "Original"}
              </span>
              <button
                type="button"
                onClick={() => cleanBg(src)}
                disabled={isCleaning || wasCleaned}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#2563eb] hover:bg-blue-50 disabled:opacity-40"
                title="Eliminar fondo"
              >
                {isCleaning ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Eraser size={10} />
                )}
                {wasCleaned ? "OK" : "Limpiar"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

// Convierte un File a dataURL para poder pasarlo a tesseract.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Con OCR + filename construye la mejor query posible:
//   - Si extractClues saca game/category, las suma para afinar la búsqueda.
//   - Usa las 2 primeras nameFragments (líneas grandes del OCR).
//   - Fallback: primeras 8 palabras del texto OCR plano.
function buildQueryFromOcr(
  ocrText: string,
  filenames: string[],
): { query: string; note: string } {
  const clues = extractClues(ocrText, filenames);
  const parts: string[] = [];

  // nameFragments son candidatos a nombre del set (las líneas "grandes").
  const fragments = clues.nameFragments.slice(0, 2).join(" ").trim();
  if (fragments.length >= 3) parts.push(fragments);

  if (clues.category) parts.push(clues.category.replace(/-/g, " "));

  let query = parts.join(" ").trim();
  if (!query && ocrText.trim()) {
    // Fallback: primeras palabras significativas.
    query = ocrText
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 8)
      .join(" ");
  }
  if (!query && filenames.length > 0) {
    query = filenames[0].replace(/\.[a-z0-9]+$/i, "").replace(/[-_]/g, " ");
  }

  const note = `OCR: ${ocrText.length} chars · game=${clues.game ?? "?"} · cat=${clues.category ?? "?"}`;
  return { query, note };
}

export function SmartProductCreator({ onSubmit, onSubmitAndNew }: Props) {
  const [stage, setStage] = useState<Stage>("search");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CatalogSearchResult | null>(null);
  const [selected, setSelected] = useState<ProductCandidate | null>(null);
  const [finalImages, setFinalImages] = useState<string[]>([]);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("score");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Carga inicial del historial desde localStorage
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Debounce de la query (300 ms — más reactivo que los 450 originales)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Al cambiar de query resetea el focus del grid y el filtro por juego
  useEffect(() => {
    setFocusedIndex(-1);
  }, [debouncedQuery, gameFilter, sortBy]);

  // Ejecuta búsqueda cuando cambia debouncedQuery
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResult(null);
      return;
    }
    let alive = true;
    setSearching(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void searchProducts(debouncedQuery)
      .then((r) => {
        if (!alive || ctrl.signal.aborted) return;
        setResult(r);
      })
      .catch((e) => {
        if (!alive) return;
        logger.error("search error", "SmartProductCreator", { err: String(e) });
        setResult({
          candidates: [],
          rawHits: [],
          errors: [String(e)],
          sourcesQueried: [],
          tookMs: 0,
        });
      })
      .finally(() => {
        if (alive) setSearching(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedQuery]);

  // Filtrado + ordenación in-memory (no re-dispara búsqueda)
  const displayedCandidates = useMemo(() => {
    if (!result) return [];
    return filterAndSort(result.candidates, { gameFilter, sortBy });
  }, [result, gameFilter, sortBy]);

  const gamesPresent = useMemo(() => {
    if (!result) return [];
    const set = new Set(result.candidates.map((c) => c.game));
    return Array.from(set);
  }, [result]);

  const gameCounts = useMemo(
    () => (result ? countByGame(result.candidates) : {}),
    [result],
  );

  const sourceCounts = useMemo(
    () => (result ? countBySource(result.candidates) : {}),
    [result],
  );

  const pickCandidate = useCallback(
    (c: ProductCandidate) => {
      setSelected(c);
      setFinalImages(c.suggestedImages);
      setStage("selected");
      // Guarda la query que llevó a este resultado en el historial
      setHistory((prev) => {
        const next = pushHistory(prev, debouncedQuery);
        saveHistory(next);
        return next;
      });
    },
    [debouncedQuery],
  );

  // Atajos de teclado globales
  useEffect(() => {
    if (stage !== "search") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // "/" enfoca buscador desde cualquier sitio (salvo si ya estás escribiendo)
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Esc: limpia query o quita focus
      if (e.key === "Escape") {
        if (inInput && query) {
          e.preventDefault();
          setQuery("");
          return;
        }
        setFocusedIndex(-1);
        return;
      }
      // Navegación del grid sólo cuando hay resultados y no estás escribiendo
      if (inInput && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        // Con flechas desde el input, saltamos al grid
        if (displayedCandidates.length === 0) return;
        e.preventDefault();
        setFocusedIndex(0);
        searchInputRef.current?.blur();
        return;
      }
      if (displayedCandidates.length === 0) return;
      // Cols responsive: asumimos 4 en desktop. Para navegación sin medir el DOM.
      const cols = 4;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((i) =>
          Math.min(displayedCandidates.length - 1, (i < 0 ? 0 : i + 1)),
        );
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, (i < 0 ? 0 : i - 1)));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) =>
          Math.min(displayedCandidates.length - 1, (i < 0 ? 0 : i + cols)),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => {
          if (i < 0) return 0;
          const next = i - cols;
          return next < 0 ? 0 : next;
        });
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        const c = displayedCandidates[focusedIndex];
        if (c) {
          e.preventDefault();
          pickCandidate(c);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, displayedCandidates, focusedIndex, query, pickCandidate]);

  // Scroll into view del candidato enfocado
  useEffect(() => {
    if (focusedIndex < 0) return;
    const cards = document.querySelectorAll<HTMLButtonElement>(
      "[data-candidate-card]",
    );
    cards[focusedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).slice(0, 3);
    setOcrRunning(true);
    setOcrNote("Leyendo imagen...");
    try {
      const dataUrls = await Promise.all(selected.map(fileToDataUrl));
      const filenames = selected.map((f) => f.name);
      const ocrText = await runOcrOnImages(dataUrls);
      if (!ocrText.trim()) {
        setOcrNote(
          "No se pudo leer texto en la imagen. Prueba con otra foto o escribe a mano.",
        );
        return;
      }
      const { query: q, note } = buildQueryFromOcr(ocrText, filenames);
      setOcrNote(note);
      if (q) {
        setQuery(q);
      } else {
        setOcrNote(
          "Texto leído pero sin candidatos claros. Edita el buscador manualmente.",
        );
      }
    } catch (e) {
      logger.error("OCR upload error", "SmartProductCreator", { err: String(e) });
      setOcrNote("Error procesando la imagen.");
    } finally {
      setOcrRunning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const backToSearch = () => {
    setSelected(null);
    setStage("search");
  };

  const draftBundle = useMemo(() => {
    if (!selected) return null;
    return candidateToDraft(selected, finalImages);
  }, [selected, finalImages]);

  const formDefaults = useMemo(
    () => (draftBundle ? draftToFormValues(draftBundle.draft) : undefined),
    [draftBundle],
  );
  const formTags = draftBundle?.draft.tags ?? [];
  const formImages = draftBundle?.draft.images ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasQuery = debouncedQuery.length >= 2;
  const totalCandidates = result?.candidates.length ?? 0;
  const showEmptyState = stage === "search" && !hasQuery && !ocrRunning;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="rounded-2xl border-2 border-dashed border-[#2563eb]/30 bg-blue-50/40 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles size={18} className="text-[#2563eb]" />
          <h2 className="text-base font-bold text-gray-900">
            Añadir producto con IA — buscador
          </h2>
        </div>
        <p className="text-sm text-gray-700">
          Escribe el producto (ej. <em>&quot;bloomburrow booster box&quot;</em>,{" "}
          <em>&quot;stellar crown etb&quot;</em>). Buscamos en paralelo en
          TCGCSV, Scryfall, pokemontcg.io, TCGDex y ygoprodeck, fusionamos
          duplicados y te mostramos candidatos. Al seleccionar uno, el
          formulario se rellena solo; tú solo validas.
        </p>
      </div>

      {stage === "search" && (
        <>
          {/* Buscador + botón subir imagen */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchInputRef}
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca un set, producto o juego..."
                aria-label="Buscar producto"
                className="h-14 w-full rounded-2xl border-2 border-gray-200 bg-white pl-12 pr-28 text-base text-gray-900 transition focus:border-[#2563eb] focus:outline-none focus:ring-4 focus:ring-[#2563eb]/10"
              />
              {/* Indicador / badge atajo "/" */}
              <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
                {(searching || ocrRunning) && (
                  <Loader2
                    size={18}
                    className="animate-spin text-[#2563eb]"
                    aria-label={ocrRunning ? "Leyendo imagen" : "Buscando"}
                  />
                )}
                {!searching && !ocrRunning && query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
                {!query && !searching && !ocrRunning && (
                  <kbd
                    className="hidden select-none items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 sm:flex"
                    aria-hidden="true"
                    title='Pulsa "/" para enfocar el buscador'
                  >
                    /
                  </kbd>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrRunning}
              className="flex h-14 min-w-[160px] items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-50"
              aria-label="Buscar por imagen (OCR)"
            >
              {ocrRunning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImagePlus size={16} />
              )}
              {ocrRunning ? "Leyendo..." : "Subir imagen"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void handleImageUpload(e.target.files)}
            />

            <button
              type="button"
              onClick={() => setShowShortcuts((v) => !v)}
              className="hidden h-14 w-14 items-center justify-center rounded-2xl border-2 border-gray-200 bg-white text-gray-500 transition hover:border-[#2563eb] hover:text-[#2563eb] md:flex"
              aria-label="Atajos de teclado"
              aria-expanded={showShortcuts}
              title="Atajos de teclado"
            >
              <Keyboard size={18} />
            </button>
          </div>

          {showShortcuts && (
            <div className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 sm:grid-cols-2 md:grid-cols-4">
              <ShortcutRow keys={["/"]} label="Enfocar buscador" />
              <ShortcutRow keys={["↑", "↓", "←", "→"]} label="Navegar candidatos" />
              <ShortcutRow keys={["Enter"]} label="Seleccionar candidato" />
              <ShortcutRow keys={["Esc"]} label="Limpiar búsqueda" />
            </div>
          )}

          {ocrNote && !ocrRunning && (
            <div className="-mt-3 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-[11px] text-gray-600">
              {ocrNote}
            </div>
          )}

          {/* Empty state: historial + sugerencias */}
          {showEmptyState && (
            <SearchEmptyState
              history={history}
              onPick={(q) => setQuery(q)}
              onClearHistory={() => setHistory(clearHistory())}
            />
          )}

          {/* Skeletons durante búsqueda */}
          {hasQuery && searching && <ResultSkeleton />}

          {/* Resultados */}
          {hasQuery && !searching && result && (
            <div className="space-y-4">
              {/* Barra de estado: contadores, fuentes, errores */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {displayedCandidates.length}
                    {gameFilter ? ` / ${totalCandidates}` : ""} candidato
                    {displayedCandidates.length === 1 ? "" : "s"}
                  </span>
                  <span>· {result.tookMs} ms</span>
                  {result.errors.length > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle size={12} />
                      {result.errors.length} avisos
                    </span>
                  )}
                </div>
                {totalCandidates > 0 && <SortDropdown value={sortBy} onChange={setSortBy} />}
              </div>

              {/* Conteo por fuente */}
              {result.sourcesQueried.length > 0 && totalCandidates > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-semibold text-gray-500">Fuentes:</span>
                  {result.sourcesQueried.map((s) => (
                    <span
                      key={s}
                      className={`rounded-md px-1.5 py-0.5 font-semibold ${
                        (sourceCounts[s] ?? 0) > 0
                          ? "bg-blue-50 text-[#2563eb]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {s}:{sourceCounts[s] ?? 0}
                    </span>
                  ))}
                </div>
              )}

              {/* Chips por juego */}
              {gamesPresent.length > 1 && (
                <GameFilterChips
                  games={gamesPresent}
                  counts={gameCounts}
                  selected={gameFilter}
                  onChange={setGameFilter}
                  totalCount={totalCandidates}
                />
              )}

              {/* Grid resultados */}
              {totalCandidates === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Sin resultados para{" "}
                    <strong>&quot;{debouncedQuery}&quot;</strong>. Prueba con
                    otras palabras (nombre del set en inglés suele funcionar
                    mejor).
                  </p>
                </div>
              ) : displayedCandidates.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <p className="text-sm text-gray-500">
                    No hay candidatos para el filtro activo.
                  </p>
                  <button
                    type="button"
                    onClick={() => setGameFilter(null)}
                    className="mt-3 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
                  >
                    Ver todos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {displayedCandidates.map((c, i) => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      query={debouncedQuery}
                      focused={i === focusedIndex}
                      onSelect={() => pickCandidate(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {stage === "selected" && selected && draftBundle && (
        <>
          {/* Cabecera del candidato seleccionado */}
          <section className="rounded-2xl border border-green-200 bg-green-50/50 p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {selected.setName}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {GAME_CONFIG[selected.game]?.name ?? selected.game} ·
                    Fuentes: {selected.sources.join(", ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={backToSearch}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <X size={12} /> Cambiar
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-600">
                Imágenes sugeridas (click para marcar/desmarcar, Limpiar para
                eliminar fondo):
              </p>
              <ImagePickerWithBg
                candidate={selected}
                onImagesChange={setFinalImages}
              />
            </div>
          </section>

          {/* ProductForm prellenado */}
          <section className="rounded-2xl border border-gray-200 bg-white p-1">
            <ProductForm
              title="Valida y guarda"
              subtitle="Los campos están rellenos a partir del set seleccionado. Edita lo que haga falta."
              defaultValues={formDefaults}
              initialTags={formTags}
              initialImages={formImages}
              resetCategoryOnGame={false}
              submitLabel="Guardar producto"
              onSubmit={onSubmit}
              onSubmitAndNew={onSubmitAndNew}
            />
          </section>
        </>
      )}
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="inline-flex min-w-[22px] items-center justify-center rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 shadow-sm"
          >
            {k}
          </kbd>
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}
