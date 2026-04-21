"use client";

/**
 * Simple WYSIWYG email editor.
 *
 * Uses `contentEditable` + `document.execCommand` so there are no external
 * dependencies. The host controls template switching via `resetKey` — when it
 * changes the editor's innerHTML is rebuilt from `html`, otherwise we never
 * write `innerHTML` from a prop (which would blow the caret away mid-typing).
 */

import type { ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Layers,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Plus,
  Redo2,
  Trash2,
  Type as TypeIcon,
  Underline,
  Undo2,
  Unlink,
  Variable,
} from "lucide-react";

interface EmailEditorProps {
  html: string;
  onChange: (html: string) => void;
  variables?: string[];
  resetKey?: string | number;
}

const COLORS = ["#111827", "#6b7280", "#2563eb", "#dc2626", "#059669", "#d97706"];

const MAX_IMAGE_WIDTH_PX = 1200;
const IMAGE_JPEG_QUALITY = 0.85;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB pre-compresión

/**
 * Redimensiona una imagen del explorador a <=1200px de ancho y la devuelve
 * como data URL (JPEG 0.85 para fotos, PNG si el original lleva alpha).
 * Mantiene las plantillas en localStorage con un tamaño razonable.
 */
async function fileToResizedDataUrl(file: File): Promise<string> {
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("lectura"));
    reader.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("decode"));
    img.src = dataUrl;
  });
  const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / img.width);
  if (scale === 1 && file.size < 400 * 1024) return dataUrl; // ya pequeña
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  const isPng = file.type === "image/png";
  return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", IMAGE_JPEG_QUALITY);
}

/** Atributos transitorios (selección UI) — no deben persistirse en la plantilla. */
function cleanTransientAttrs(html: string): string {
  return html.replace(/\s*data-img-selected="[^"]*"/g, "");
}

export default function EmailEditor({
  html,
  onChange,
  variables = [],
  resetKey,
}: EmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorBoxRef = useRef<HTMLDivElement>(null);
  const varBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  // Push content into the editor only when the external reset signal changes.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
      setSelectedImg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Close popovers when the user clicks anywhere outside their anchors.
  useEffect(() => {
    if (!showVarMenu && !showColorMenu) return;
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (showColorMenu && colorBoxRef.current && !colorBoxRef.current.contains(target)) {
        setShowColorMenu(false);
      }
      if (showVarMenu && varBoxRef.current && !varBoxRef.current.contains(target)) {
        setShowVarMenu(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [showVarMenu, showColorMenu]);

  const exec = useCallback(
    (command: string, value?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand(command, false, value);
      onChange(cleanTransientAttrs(el.innerHTML));
    },
    [onChange],
  );

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange(cleanTransientAttrs(editorRef.current.innerHTML));
  }, [onChange]);

  // ── Imágenes ─────────────────────────────────────────────────────────────

  const clearImageSelection = useCallback(() => {
    if (!editorRef.current) return;
    const marked = editorRef.current.querySelectorAll<HTMLImageElement>(
      "img[data-img-selected]",
    );
    marked.forEach((i) => i.removeAttribute("data-img-selected"));
    setSelectedImg(null);
  }, []);

  const pickImage = useCallback(() => {
    setImgError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setImgError("El archivo no es una imagen.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImgError(
          `Imagen demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB, máx 6 MB).`,
        );
        return;
      }
      try {
        const dataUrl = await fileToResizedDataUrl(file);
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        document.execCommand("insertImage", false, dataUrl);
        const imgs = el.querySelectorAll("img");
        const inserted = imgs[imgs.length - 1] as HTMLImageElement | undefined;
        if (inserted) {
          inserted.style.maxWidth = "100%";
          inserted.style.height = "auto";
          inserted.style.display = "block";
          inserted.style.margin = "8px 0";
          inserted.setAttribute("alt", file.name.replace(/\.[^.]+$/, ""));
        }
        onChange(cleanTransientAttrs(el.innerHTML));
      } catch (err) {
        setImgError(
          err instanceof Error
            ? `No se pudo cargar la imagen: ${err.message}`
            : "No se pudo cargar la imagen.",
        );
      }
    },
    [onChange],
  );

  const handleEditorClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        clearImageSelection();
        img.setAttribute("data-img-selected", "1");
        setSelectedImg(img);
      } else if (selectedImg) {
        clearImageSelection();
      }
    },
    [selectedImg, clearImageSelection],
  );

  const updateSelectedImg = useCallback(
    (mutate: (img: HTMLImageElement) => void) => {
      if (!selectedImg || !editorRef.current) return;
      mutate(selectedImg);
      onChange(cleanTransientAttrs(editorRef.current.innerHTML));
    },
    [selectedImg, onChange],
  );

  const scaleImg = useCallback(
    (factor: number) => {
      updateSelectedImg((img) => {
        const current = img.getBoundingClientRect().width;
        const next = Math.max(40, Math.round(current * factor));
        img.style.width = `${next}px`;
        img.style.height = "auto";
        img.style.maxWidth = "100%";
      });
    },
    [updateSelectedImg],
  );

  const setImgWidthPct = useCallback(
    (pct: number) => {
      updateSelectedImg((img) => {
        img.style.width = `${pct}%`;
        img.style.height = "auto";
        img.style.maxWidth = "100%";
      });
    },
    [updateSelectedImg],
  );

  type Placement = "inline" | "left" | "right" | "center" | "front" | "back";
  const setPlacement = useCallback(
    (mode: Placement) => {
      updateSelectedImg((img) => {
        img.style.float = "";
        img.style.display = "";
        img.style.margin = "";
        img.style.position = "";
        img.style.zIndex = "";
        img.style.verticalAlign = "";
        img.style.opacity = "";
        img.style.boxShadow = "";
        switch (mode) {
          case "left":
            img.style.float = "left";
            img.style.margin = "4px 12px 4px 0";
            break;
          case "right":
            img.style.float = "right";
            img.style.margin = "4px 0 4px 12px";
            break;
          case "center":
            img.style.display = "block";
            img.style.margin = "8px auto";
            break;
          case "front":
            img.style.opacity = "1";
            img.style.display = "block";
            img.style.margin = "8px 0";
            img.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
            break;
          case "back":
            // Marca de agua (el efecto "detrás del texto" real no lo soportan
            // los clientes de email; lo aproximamos con opacidad baja).
            img.style.opacity = "0.25";
            img.style.display = "block";
            img.style.margin = "8px 0";
            img.style.boxShadow = "";
            break;
          case "inline":
          default:
            img.style.display = "inline";
            img.style.verticalAlign = "middle";
            img.style.margin = "0 4px";
            break;
        }
      });
    },
    [updateSelectedImg],
  );

  const deleteSelectedImg = useCallback(() => {
    if (!selectedImg || !editorRef.current) return;
    selectedImg.remove();
    setSelectedImg(null);
    onChange(cleanTransientAttrs(editorRef.current.innerHTML));
  }, [selectedImg, onChange]);

  const handleInsertVariable = useCallback(
    (name: string) => {
      exec("insertText", `{{${name}}}`);
      setShowVarMenu(false);
    },
    [exec],
  );

  const handleLink = useCallback(() => {
    const url = window.prompt("URL del enlace:");
    if (url) exec("createLink", url);
  }, [exec]);

  const handleColor = useCallback(
    (color: string) => {
      exec("foreColor", color);
      setShowColorMenu(false);
    },
    [exec],
  );

  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 hover:text-gray-900";
  const divider = "mx-1 h-6 w-px bg-gray-200";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <style>{`
        .email-editor-surface img { cursor: pointer; }
        .email-editor-surface img[data-img-selected] {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/60 p-2">
        <button type="button" aria-label="Deshacer" title="Deshacer" onClick={() => exec("undo")} className={btn}>
          <Undo2 size={16} />
        </button>
        <button type="button" aria-label="Rehacer" title="Rehacer" onClick={() => exec("redo")} className={btn}>
          <Redo2 size={16} />
        </button>
        <span className={divider} />

        <button type="button" aria-label="Negrita" title="Negrita" onClick={() => exec("bold")} className={btn}>
          <Bold size={16} />
        </button>
        <button type="button" aria-label="Cursiva" title="Cursiva" onClick={() => exec("italic")} className={btn}>
          <Italic size={16} />
        </button>
        <button type="button" aria-label="Subrayado" title="Subrayado" onClick={() => exec("underline")} className={btn}>
          <Underline size={16} />
        </button>
        <span className={divider} />

        <button
          type="button"
          aria-label="Título grande"
          title="Título grande"
          onClick={() => exec("formatBlock", "<h1>")}
          className={btn}
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          aria-label="Título mediano"
          title="Título mediano"
          onClick={() => exec("formatBlock", "<h2>")}
          className={btn}
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          aria-label="Párrafo"
          title="Párrafo"
          onClick={() => exec("formatBlock", "<p>")}
          className={btn}
        >
          <Pilcrow size={16} />
        </button>
        <span className={divider} />

        <button
          type="button"
          aria-label="Lista con viñetas"
          title="Lista con viñetas"
          onClick={() => exec("insertUnorderedList")}
          className={btn}
        >
          <List size={16} />
        </button>
        <button
          type="button"
          aria-label="Lista numerada"
          title="Lista numerada"
          onClick={() => exec("insertOrderedList")}
          className={btn}
        >
          <ListOrdered size={16} />
        </button>
        <span className={divider} />

        <button
          type="button"
          aria-label="Alinear a la izquierda"
          title="Alinear a la izquierda"
          onClick={() => exec("justifyLeft")}
          className={btn}
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Centrar"
          title="Centrar"
          onClick={() => exec("justifyCenter")}
          className={btn}
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          aria-label="Alinear a la derecha"
          title="Alinear a la derecha"
          onClick={() => exec("justifyRight")}
          className={btn}
        >
          <AlignRight size={16} />
        </button>
        <span className={divider} />

        {/* Color */}
        <div className="relative" ref={colorBoxRef}>
          <button
            type="button"
            aria-label="Color del texto"
            title="Color del texto"
            onClick={() => {
              setShowColorMenu((o) => !o);
              setShowVarMenu(false);
            }}
            className={btn}
          >
            <Palette size={16} />
          </button>
          {showColorMenu && (
            <div className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColor(c)}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                  title={c}
                  className="h-6 w-6 rounded-full border border-gray-200 transition hover:scale-110"
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Insertar enlace"
          title="Insertar enlace"
          onClick={handleLink}
          className={btn}
        >
          <LinkIcon size={16} />
        </button>
        <button
          type="button"
          aria-label="Quitar enlace"
          title="Quitar enlace"
          onClick={() => exec("unlink")}
          className={btn}
        >
          <Unlink size={16} />
        </button>
        <button
          type="button"
          aria-label="Insertar imagen"
          title="Insertar imagen desde el explorador"
          onClick={pickImage}
          className={btn}
        >
          <ImageIcon size={16} />
        </button>
        <button
          type="button"
          aria-label="Quitar formato"
          title="Quitar formato"
          onClick={() => exec("removeFormat")}
          className={btn}
        >
          <Eraser size={16} />
        </button>

        <div className="flex-1" />

        {/* Variables */}
        {variables.length > 0 && (
          <div className="relative" ref={varBoxRef}>
            <button
              type="button"
              onClick={() => {
                setShowVarMenu((o) => !o);
                setShowColorMenu(false);
              }}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:text-[#2563eb]"
            >
              <Variable size={13} /> Insertar variable
            </button>
            {showVarMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Disponibles en esta plantilla
                </p>
                {variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="block w-full px-3 py-1.5 text-left font-mono text-xs text-gray-700 transition hover:bg-blue-50 hover:text-[#2563eb]"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input para subir imagen desde el explorador */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Aviso de error al insertar imagen */}
      {imgError && (
        <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          <span>{imgError}</span>
          <button
            type="button"
            onClick={() => setImgError(null)}
            className="text-red-400 transition hover:text-red-600"
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      {/* Toolbar contextual visible cuando hay imagen seleccionada */}
      {selectedImg && (
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-blue-50/70 px-3 py-2 text-[11px]">
          <span className="mr-2 font-bold uppercase tracking-wide text-[#2563eb]">
            Imagen
          </span>

          <button
            type="button"
            onClick={() => scaleImg(0.9)}
            title="Empequeñecer"
            aria-label="Empequeñecer imagen"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={() => scaleImg(1.1)}
            title="Agrandar"
            aria-label="Agrandar imagen"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={() => setImgWidthPct(25)}
            className="rounded-md bg-white px-2 py-1 font-semibold text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => setImgWidthPct(50)}
            className="rounded-md bg-white px-2 py-1 font-semibold text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => setImgWidthPct(100)}
            className="rounded-md bg-white px-2 py-1 font-semibold text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            100%
          </button>

          <span className="mx-1 h-5 w-px bg-gray-200" />

          <button
            type="button"
            onClick={() => setPlacement("inline")}
            title="Entre texto"
            aria-label="Colocar entre texto"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <TypeIcon size={13} />
          </button>
          <button
            type="button"
            onClick={() => setPlacement("left")}
            title="Flotar a la izquierda (texto a la derecha)"
            aria-label="Flotar a la izquierda"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <AlignLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => setPlacement("center")}
            title="Centrar"
            aria-label="Centrar imagen"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <AlignCenter size={13} />
          </button>
          <button
            type="button"
            onClick={() => setPlacement("right")}
            title="Flotar a la derecha (texto a la izquierda)"
            aria-label="Flotar a la derecha"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <AlignRight size={13} />
          </button>

          <span className="mx-1 h-5 w-px bg-gray-200" />

          <button
            type="button"
            onClick={() => setPlacement("front")}
            title="Delante del texto"
            className="flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <Layers size={12} /> Delante
          </button>
          <button
            type="button"
            onClick={() => setPlacement("back")}
            title="Detrás del texto (marca de agua)"
            className="flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-gray-600 shadow-sm transition hover:text-[#2563eb]"
          >
            <Layers size={12} className="rotate-180" /> Detrás
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={deleteSelectedImg}
            title="Eliminar imagen"
            aria-label="Eliminar imagen"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-red-500 shadow-sm transition hover:bg-red-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Editable area */}
      {/* contentEditable es focusable por defecto; eslint no lo detecta.
          El onClick sólo selecciona imágenes, no reemplaza interacción de teclado. */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus, jsx-a11y/click-events-have-key-events */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleEditorClick}
        role="textbox"
        aria-label="Contenido del email"
        aria-multiline="true"
        spellCheck
        className="email-editor-surface max-h-[560px] min-h-[440px] overflow-y-auto bg-white p-5 text-sm leading-relaxed focus:outline-none"
      />
    </div>
  );
}
