"use client";
import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Camera, Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface InlineEditProps {
  /** The current value to display and edit */
  value: string | number;
  /** 'text' | 'number' | 'textarea' | 'image' */
  type?: "text" | "number" | "textarea" | "image";
  /** Called with the new value when user confirms */
  onSave: (value: string) => void;
  /** Extra className for the wrapper */
  className?: string;
  /** Render the display content (if not provided, falls back to value) */
  children?: React.ReactNode;
  /** Step for number inputs */
  step?: string;
  /** Min for number inputs */
  min?: string;
  /** Custom toast message (defaults to "Cambio guardado") */
  toastMessage?: string;
}

/** Toast shown after save */
function SavedToast({ message = "Cambio guardado" }: { message?: string }) {
  return (
    <div className="animate-fade-in fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl bg-[#1a3a5c] px-4 py-2.5 text-sm font-medium text-white shadow-xl">
      <Check size={14} className="text-green-300" /> {message}
    </div>
  );
}

export function InlineEdit({
  value,
  type = "text",
  onSave,
  className = "",
  children,
  step,
  min,
  toastMessage,
}: InlineEditProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [showToast, setShowToast] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Only render edit controls for admin
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (!isAdmin) {
    return <span className={className}>{children ?? value}</span>;
  }

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleCancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  // Image type: show camera overlay button
  if (type === "image") {
    return (
      <div className={`group relative ${className}`}>
        {children ?? <span>{value}</span>}
        <button
          onClick={() => {
            const url = window.prompt("URL de la nueva imagen:", String(value));
            if (url && url !== String(value)) {
              onSave(url);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 2500);
            }
          }}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
          title="Cambiar imagen"
        >
          <Camera size={24} className="text-white drop-shadow-lg" />
        </button>
        {showToast && <SavedToast message={toastMessage} />}
      </div>
    );
  }

  if (!editing) {
    return (
      <span
        className={`group relative inline-flex items-start gap-1 ${className}`}
      >
        {children ?? value}
        <button
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          className="ml-1 flex-shrink-0 rounded p-0.5 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-[#1a3a5c]"
          title="Editar"
        >
          <Pencil size={12} />
        </button>
        {showToast && <SavedToast message={toastMessage} />}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {type === "textarea" ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          rows={3}
          className="w-full resize-none rounded-lg border-2 border-[#1a3a5c] px-2 py-1 text-sm focus:outline-none"
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          step={step}
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          className="w-full rounded-lg border-2 border-[#1a3a5c] px-2 py-1 text-sm focus:outline-none"
        />
      )}
      <button
        onClick={handleSave}
        className="flex-shrink-0 rounded-lg bg-green-500 p-1 text-white transition hover:bg-green-600"
        title="Guardar"
      >
        <Save size={13} />
      </button>
      <button
        onClick={handleCancel}
        className="flex-shrink-0 rounded-lg bg-gray-200 p-1 text-gray-600 transition hover:bg-gray-300"
        title="Cancelar"
      >
        <X size={13} />
      </button>
      {showToast && <SavedToast message={toastMessage} />}
    </span>
  );
}
