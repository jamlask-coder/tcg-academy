"use client";
// SmartProductCreator — Flujo buscador (Phase 2).
//
// El admin escribe unas palabras ("bloomburrow booster box", "stellar crown etb", ...).
// Busca en paralelo en 4 catálogos TCG públicos (Scryfall, pokemontcg.io, TCGDex,
// ygoprodeck), fusiona duplicados por game+setName y muestra una rejilla con
// las posibles opciones. Al seleccionar una, el ProductForm se prellena con
// nombre, slug, juego, categoría, precios estimados, descripción, tags e
// imágenes sugeridas (logos del set). Puede limpiar el fondo de cada imagen
// con flood-fill de bordes.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
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
  onSelect,
}: {
  candidate: ProductCandidate;
  onSelect: () => void;
}) {
  const game = GAME_CONFIG[candidate.game];
  const cover = candidate.suggestedImages[0] ?? candidate.images[0];
  const scorePct = Math.round(candidate.score * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:shadow-md"
    >
      <div className="relative flex h-32 items-center justify-center bg-gray-50">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={candidate.setName}
            className="max-h-28 max-w-[80%] object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl opacity-40">{game?.emoji ?? "📦"}</span>
        )}
        <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-700 shadow-sm">
          {scorePct}%
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center gap-1.5">
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
          {candidate.setName}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce de la query (450 ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 450);
    return () => clearTimeout(id);
  }, [query]);

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
        // eslint-disable-next-line no-console
        console.error("[SmartProductCreator] search error", e);
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

  const pickCandidate = (c: ProductCandidate) => {
    setSelected(c);
    setFinalImages(c.suggestedImages);
    setStage("selected");
  };

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
      // eslint-disable-next-line no-console
      console.error("[SmartProductCreator] OCR upload error", e);
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
          Scryfall, pokemontcg.io, TCGDex y ygoprodeck, fusionamos duplicados y
          te mostramos candidatos. Al seleccionar uno, el formulario se rellena
          solo; tú solo validas.
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
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca un set, producto o juego..."
                aria-label="Buscar producto"
                className="h-14 w-full rounded-2xl border-2 border-gray-200 bg-white pl-12 pr-12 text-base text-gray-900 transition focus:border-[#2563eb] focus:outline-none"
              />
              {(searching || ocrRunning) && (
                <Loader2
                  size={18}
                  className="absolute top-1/2 right-4 -translate-y-1/2 animate-spin text-[#2563eb]"
                  aria-label={ocrRunning ? "Leyendo imagen" : "Buscando"}
                />
              )}
              {!searching && !ocrRunning && query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
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
          </div>

          {ocrNote && !ocrRunning && (
            <div className="-mt-3 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-[11px] text-gray-600">
              {ocrNote}
            </div>
          )}

          {/* Resultados */}
          {result && !searching && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  {result.candidates.length} candidato
                  {result.candidates.length === 1 ? "" : "s"} · fuentes:{" "}
                  {result.sourcesQueried.join(", ")} · {result.tookMs} ms
                </span>
                {result.errors.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle size={12} /> {result.errors.length} avisos
                  </span>
                )}
              </div>

              {result.candidates.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Sin resultados para{" "}
                    <strong>&quot;{debouncedQuery}&quot;</strong>. Prueba con
                    otras palabras (nombre del set en inglés suele funcionar
                    mejor).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {result.candidates.map((c) => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      onSelect={() => pickCandidate(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && !searching && debouncedQuery.length < 2 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
              <Search size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">
                Escribe al menos 2 caracteres para empezar la búsqueda.
              </p>
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
