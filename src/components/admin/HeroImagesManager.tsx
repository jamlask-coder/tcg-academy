"use client";

// ─── Admin — gestión del carrusel de la home ────────────────────────────────
// Permite subir, reordenar y eliminar las imágenes del HeroCarousel sin tocar
// ficheros ni redeploy. Las imágenes se guardan en localStorage como base64
// mediante `heroImageService`. Si no hay imágenes subidas, el carrusel cae a
// /public/images/hero/slide-1.png y slide-2.png (defaults).

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Trash2, GripVertical, Image as ImageIcon, AlertCircle } from "lucide-react";
import { DataHub } from "@/lib/dataHub";
import {
  addHeroImage,
  getHeroImages,
  readFileAsDataUrl,
  removeHeroImage,
  reorderHeroImages,
  updateHeroImage,
  type HeroImage,
} from "@/services/heroImageService";

// Imágenes por defecto (mostradas sólo si el admin no ha subido nada).
const DEFAULTS = [
  { filename: "slide-1.png", src: "/images/hero/slide-1.png", alt: "Magic: The Gathering x TMNT" },
  { filename: "slide-2.png", src: "/images/hero/slide-2.png", alt: "Secrets of Strixhaven" },
];

const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — suficiente margen para un hero.

export function HeroImagesManager({
  onToast,
}: {
  onToast: (msg: string) => void;
}) {
  // Lazy initializer: lee de localStorage sólo en cliente (SSR seguro).
  const [images, setImages] = useState<HeroImage[]>(() =>
    typeof window === "undefined" ? [] : getHeroImages(),
  );
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza con cambios externos (otros tabs, otros componentes).
  useEffect(() => {
    return DataHub.on("heroImages", () => setImages(getHeroImages()));
  }, []);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4500);
  };

  const addFiles = async (files: File[]) => {
    let added = 0;
    for (const file of files) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        showError(`"${file.name}" no es PNG/JPG/WebP/GIF`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        showError(`"${file.name}" supera 4 MB`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        addHeroImage({
          filename: file.name,
          dataUrl,
          mime: file.type,
          alt: file.name.replace(/\.[^.]+$/, ""),
        });
        added++;
      } catch {
        showError(`Error leyendo "${file.name}"`);
      }
    }
    if (added > 0) {
      onToast(`${added} imagen${added === 1 ? "" : "es"} subida${added === 1 ? "" : "s"}`);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    void addFiles(Array.from(list));
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;
    void addFiles(Array.from(list));
  };

  const onDelete = (img: HeroImage) => {
    if (!confirm(`¿Eliminar "${img.filename}" del carrusel?`)) return;
    removeHeroImage(img.id);
    onToast("Imagen eliminada");
  };

  const onAltChange = (id: string, alt: string) => {
    updateHeroImage(id, { alt });
  };

  const onHrefChange = (id: string, href: string) => {
    updateHeroImage(id, { href: href.trim() || undefined });
  };

  const onRowDragStart = (id: string) => setDragId(id);
  const onRowDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onRowDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const order = images.map((x) => x.id);
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) { setDragId(null); return; }
    order.splice(to, 0, ...order.splice(from, 1));
    reorderHeroImages(order);
    setDragId(null);
  };

  const hasImages = images.length > 0;

  return (
    <div className="mb-8">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
        <ImageIcon size={18} className="text-[#2563eb]" /> Carrusel de la home
      </h2>
      <p className="mb-1 text-sm text-gray-500">
        Imágenes rotativas que aparecen en la parte superior de la página de inicio.
        Se muestran en el orden indicado.
      </p>
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
        <strong>Tamaño de visualización fijo:</strong> el carrusel siempre muestra las imágenes
        recortadas al mismo marco, da igual el tamaño que subas.
        <ul className="mt-1 ml-4 list-disc space-y-0.5">
          <li>Móvil: relación <strong>16:9</strong> — sube al menos <strong>1600 × 900 px</strong>.</li>
          <li>Escritorio: relación <strong>~2.14:1</strong> — sube al menos <strong>1600 × 750 px</strong>.</li>
          <li>Ideal: <strong>1920 × 900 px</strong> (cubre ambos formatos sin pérdida).</li>
          <li>El centro de la imagen es lo que siempre se verá; deja margen en los bordes.</li>
        </ul>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Subir imágenes al carrusel"
        className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragOver
            ? "border-[#2563eb] bg-blue-50"
            : "border-gray-300 bg-white hover:border-[#2563eb] hover:bg-blue-50/40"
        }`}
      >
        <Upload size={24} className="text-[#2563eb]" />
        <p className="text-sm font-semibold text-gray-900">
          Arrastra imágenes aquí o haz clic para seleccionar
        </p>
        <p className="text-xs text-gray-500">PNG, JPG, WebP o GIF · máx. 4 MB por imagen</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          multiple
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Lista de imágenes */}
      {hasImages ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100" role="list" aria-label="Imágenes del carrusel">
            {images.map((img) => (
              <div
                key={img.id}
                draggable
                role="listitem"
                aria-label={`Imagen ${img.filename} — arrastra para reordenar`}
                onDragStart={() => onRowDragStart(img.id)}
                onDragOver={onRowDragOver}
                onDrop={() => onRowDrop(img.id)}
                className={`flex items-center gap-3 px-4 py-3 ${
                  dragId === img.id ? "opacity-50" : ""
                }`}
              >
                <GripVertical
                  size={16}
                  className="shrink-0 cursor-grab text-gray-400 active:cursor-grabbing"
                  aria-label="Reordenar"
                />
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <Image
                    src={img.dataUrl}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="96px"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="truncate text-sm font-semibold text-gray-900">{img.filename}</p>
                  <div className="flex flex-col gap-1.5 sm:flex-row">
                    <input
                      type="text"
                      value={img.alt}
                      onChange={(e) => onAltChange(img.id, e.target.value)}
                      placeholder="Texto alternativo (accesibilidad)"
                      aria-label="Texto alternativo"
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:border-[#2563eb] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={img.href ?? ""}
                      onChange={(e) => onHrefChange(img.id, e.target.value)}
                      placeholder="Enlace al hacer clic (opcional)"
                      aria-label="Enlace al hacer clic"
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => onDelete(img)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  aria-label={`Eliminar ${img.filename}`}
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Placeholder: mostrar los 2 defaults para que el admin vea qué hay ahora.
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
            <AlertCircle size={13} /> Mostrando imágenes por defecto. Sube las tuyas para reemplazarlas.
          </div>
          <div className="divide-y divide-gray-100">
            {DEFAULTS.map((d) => (
              <div key={d.filename} className="flex items-center gap-3 px-4 py-3">
                <div className="h-5 w-4 shrink-0" />
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <Image src={d.src} alt={d.alt} fill className="object-cover" sizes="96px" />
                </div>
                <div className="flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{d.filename}</p>
                  <p className="truncate text-xs text-gray-500">{d.alt}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                  Por defecto
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
