"use client";
import { useState, useCallback } from "react";
import {
  Search,
  Link as LinkIcon,
  Upload,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { searchProductImages } from "@/services/imageSearchService";
import type { ImageSearchResult } from "@/services/imageSearchService";

type Tab = "search" | "url" | "file";

interface Props {
  game: string;
  category: string;
  productName: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export function ImageSelector({
  game,
  category,
  productName,
  images,
  onImagesChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlPreviewOk, setUrlPreviewOk] = useState(false);

  const canAdd = images.length < 5;

  const addImage = useCallback(
    (url: string) => {
      if (!url || images.includes(url) || images.length >= 5) return;
      onImagesChange([...images, url]);
    },
    [images, onImagesChange],
  );

  const removeImage = useCallback(
    (idx: number) => {
      onImagesChange(images.filter((_, i) => i !== idx));
    },
    [images, onImagesChange],
  );

  const handleSearch = async () => {
    const q = searchQuery.trim() || productName.trim();
    if (!q) return;
    setSearching(true);
    setSearched(false);
    setResults([]);
    const found = await searchProductImages(q, game, category);
    setResults(found);
    setSearched(true);
    setSearching(false);
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    addImage(urlInput.trim());
    setUrlInput("");
    setUrlPreviewOk(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - images.length);
    e.target.value = "";
    if (files.length === 0) return;

    const collected: string[] = [];
    let done = 0;

    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        collected[idx] = base64;
        done += 1;
        if (done === files.length) {
          onImagesChange([...images, ...collected].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const tabBtn = (t: Tab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        tab === t
          ? "bg-[#2563eb] text-white"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div>
      {/* Current images */}
      {images.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div
              key={i}
              className="group relative h-20 w-20 overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Imagen ${i + 1}`}
                className="h-full w-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {i === 0 && (
                <span className="absolute right-0 bottom-0 left-0 bg-[#2563eb]/80 px-1 py-0.5 text-center text-[8px] font-bold text-white">
                  Principal
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                aria-label="Quitar imagen"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {canAdd && (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400">
              {images.length}/5
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {canAdd && (
        <div>
          <div className="mb-3 flex gap-1">
            {tabBtn("search", "Buscar imagen", <Search size={11} />)}
            {tabBtn("url", "Pegar URL", <LinkIcon size={11} />)}
            {tabBtn("file", "Subir archivo", <Upload size={11} />)}
          </div>

          {/* Tab: Buscar */}
          {tab === "search" && (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleSearch())
                  }
                  placeholder={productName || "Término de búsqueda…"}
                  className="h-9 flex-1 rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 text-xs font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {searching ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Search size={13} />
                  )}
                  {searching ? "Buscando…" : "Buscar"}
                </button>
              </div>

              {searched && results.length === 0 && (
                <p className="mt-3 text-center text-xs text-gray-400">
                  Sin resultados. Prueba a cambiar el término o usa &ldquo;Pegar URL&rdquo;.
                </p>
              )}

              {results.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {results.map((r, i) => {
                    const already = images.includes(r.url);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => addImage(r.url)}
                        disabled={already || !canAdd}
                        title={r.label}
                        className={`group relative overflow-hidden rounded-xl border-2 transition ${
                          already
                            ? "border-green-400 bg-green-50"
                            : "border-gray-200 hover:border-[#2563eb] hover:shadow-md"
                        } disabled:cursor-not-allowed`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.url}
                          alt={r.label}
                          className="aspect-[3/4] w-full bg-gray-50 object-contain p-1"
                        />
                        {already && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                            <Check size={16} className="text-green-600" />
                          </div>
                        )}
                        <p className="truncate bg-white px-1 py-0.5 text-center text-[9px] text-gray-500">
                          {r.source}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {!searched && (
                <p className="mt-2 text-xs text-gray-400">
                  {game === "pokemon" &&
                    "Busca sets (Prismatic Evolutions…) o cartas por nombre."}
                  {game === "magic" &&
                    "Busca cartas Magic por nombre (inglés)."}
                  {game === "yugioh" && "Busca cartas Yu-Gi-Oh! por nombre."}
                  {game !== "pokemon" &&
                    game !== "magic" &&
                    game !== "yugioh" &&
                    "Usa Pegar URL para añadir imágenes manualmente."}
                </p>
              )}
            </div>
          )}

          {/* Tab: URL */}
          {tab === "url" && (
            <div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlPreviewOk(false);
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddUrl())
                  }
                  placeholder="https://..."
                  className="h-9 flex-1 rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 text-xs font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  Añadir
                </button>
              </div>
              {urlInput && (
                <div className="mt-3 flex items-start gap-3">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlInput}
                      alt="Preview"
                      className="h-full w-full object-contain p-1"
                      onLoad={() => setUrlPreviewOk(true)}
                      onError={() => setUrlPreviewOk(false)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {urlPreviewOk
                      ? "✓ La imagen carga correctamente."
                      : "Esperando imagen…"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Archivo */}
          {tab === "file" && (
            <div>
              <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-[#2563eb] hover:bg-blue-50/30">
                <Upload size={18} className="mb-1 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">
                  Seleccionar imágenes
                </span>
                <span className="text-xs text-gray-400">
                  {images.length}/5 añadidas
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={images.length >= 5}
                />
              </label>
              <p className="mt-2 text-xs text-gray-400">
                Nota: en modo estático las imágenes subidas solo se
                previsualizan. Usa &ldquo;Pegar URL&rdquo; con una URL pública para
                producción.
              </p>
            </div>
          )}
        </div>
      )}

      {images.length >= 5 && (
        <p className="mt-2 text-xs text-gray-500">
          Máximo 5 imágenes alcanzado.
        </p>
      )}
    </div>
  );
}
