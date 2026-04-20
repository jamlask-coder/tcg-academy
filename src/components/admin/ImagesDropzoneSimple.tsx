"use client";
// Dropzone independiente (NO modifica ImageSelector existente).
// Acepta drag & drop y click-to-upload. Convierte los File a Data URLs.
// Devuelve tanto las imágenes como los filenames originales (útiles para el
// extractor de pistas cuando el OCR no distingue bien).

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

interface Props {
  images: string[];
  filenames: string[];
  onChange: (images: string[], filenames: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImagesDropzoneSimple({
  images,
  filenames,
  onChange,
  maxImages = 5,
  disabled = false,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: File[]) => {
      const slots = maxImages - images.length;
      if (slots <= 0) return;
      const take = files.slice(0, slots);
      const newImages: string[] = [];
      const newNames: string[] = [];
      for (const f of take) {
        try {
          const dataUrl = await fileToDataUrl(f);
          newImages.push(dataUrl);
          newNames.push(f.name);
        } catch {
          /* skip broken file */
        }
      }
      onChange([...images, ...newImages], [...filenames, ...newNames]);
    },
    [filenames, images, maxImages, onChange],
  );

  const removeAt = (idx: number) => {
    const nextImgs = images.filter((_, i) => i !== idx);
    const nextNames = filenames.filter((_, i) => i !== idx);
    onChange(nextImgs, nextNames);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length > 0) void addFiles(files);
    },
    [addFiles, disabled],
  );

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void addFiles(files);
  };

  const canAdd = images.length < maxImages && !disabled;

  return (
    <div>
      {/* Grid de imágenes ya subidas */}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div
              key={i}
              className="group relative h-24 w-24 overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={filenames[i] ?? `Imagen ${i + 1}`}
                className="h-full w-full object-contain p-1"
              />
              {i === 0 && (
                <span className="absolute right-0 bottom-0 left-0 bg-[#2563eb]/80 px-1 py-0.5 text-center text-[8px] font-bold text-white">
                  Principal
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Quitar imagen"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {canAdd && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
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
          className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
            dragActive
              ? "border-[#2563eb] bg-blue-50"
              : "border-gray-200 bg-gray-50 hover:border-[#2563eb] hover:bg-blue-50/30"
          }`}
          aria-label="Arrastra imágenes aquí o haz click para seleccionar"
        >
          <Upload
            size={22}
            className={dragActive ? "text-[#2563eb]" : "text-gray-400"}
          />
          <span className="text-sm font-semibold text-gray-700">
            {dragActive
              ? "Suelta aquí las imágenes"
              : "Arrastra imágenes o haz click"}
          </span>
          <span className="text-xs text-gray-400">
            {images.length}/{maxImages} · JPG, PNG, WEBP
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onSelect}
          />
        </div>
      )}

      {images.length >= maxImages && (
        <p className="mt-2 text-xs text-gray-500">
          Máximo {maxImages} imágenes alcanzado.
        </p>
      )}
    </div>
  );
}
