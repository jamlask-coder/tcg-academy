"use client";
import { useCallback } from "react";
import { Upload, X } from "lucide-react";

interface Props {
  game: string;
  category: string;
  productName: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export function ImageSelector({
  images,
  onImagesChange,
}: Props) {
  const canAdd = images.length < 5;

  const removeImage = useCallback(
    (idx: number) => {
      onImagesChange(images.filter((_, i) => i !== idx));
    },
    [images, onImagesChange],
  );

  const readFiles = (files: File[], replace?: number) => {
    if (files.length === 0) return;

    if (replace !== undefined) {
      // Replace a single image at index
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const next = [...images];
        next[replace] = base64;
        onImagesChange(next);
      };
      reader.readAsDataURL(files[0]);
      return;
    }

    // Add new images up to limit
    const slots = 5 - images.length;
    const toRead = files.slice(0, slots);
    const collected: string[] = [];
    let done = 0;

    toRead.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        collected[idx] = ev.target?.result as string;
        done += 1;
        if (done === toRead.length) {
          onImagesChange([...images, ...collected].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    readFiles(files);
  };

  const handleReplaceFile = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    readFiles(files, idx);
  };

  return (
    <div>
      {/* Current images */}
      {images.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <label
              key={i}
              className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50 transition hover:border-[#2563eb]"
              title="Pulsa para cambiar la imagen"
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
              {/* Overlay on hover */}
              <div className="absolute inset-0 hidden flex-col items-center justify-center bg-black/40 group-hover:flex">
                <Upload size={14} className="text-white" />
                <span className="mt-0.5 text-[9px] font-bold text-white">Cambiar</span>
              </div>
              {i === 0 && (
                <span className="absolute right-0 bottom-0 left-0 bg-[#2563eb]/80 px-1 py-0.5 text-center text-[8px] font-bold text-white">
                  Principal
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleReplaceFile(i, e)}
              />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(i); }}
                className="absolute top-0.5 right-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                aria-label="Quitar imagen"
              >
                <X size={10} />
              </button>
            </label>
          ))}
        </div>
      )}

      {/* Add images — file picker only */}
      {canAdd && (
        <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-[#2563eb] hover:bg-blue-50/30">
          <Upload size={20} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            Seleccionar imágenes desde el PC
          </span>
          <span className="text-xs text-gray-400">
            {images.length}/5 · JPG, PNG, WEBP
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleAddFiles}
          />
        </label>
      )}

      {images.length >= 5 && (
        <p className="mt-2 text-xs text-gray-500">Máximo 5 imágenes alcanzado.</p>
      )}
    </div>
  );
}
