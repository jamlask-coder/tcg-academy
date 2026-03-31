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
    <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium animate-fade-in">
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
      <div className={`relative group ${className}`}>
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
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all rounded-xl opacity-0 group-hover:opacity-100"
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
        className={`relative group inline-flex items-start gap-1 ${className}`}
      >
        {children ?? value}
        <button
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded text-gray-400 hover:text-[#1a3a5c] hover:bg-gray-100 transition-all flex-shrink-0"
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
          className="border-2 border-[#1a3a5c] rounded-lg px-2 py-1 text-sm focus:outline-none resize-none w-full"
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
          className="border-2 border-[#1a3a5c] rounded-lg px-2 py-1 text-sm focus:outline-none w-full"
        />
      )}
      <button
        onClick={handleSave}
        className="p-1 rounded-lg bg-green-500 text-white hover:bg-green-600 transition flex-shrink-0"
        title="Guardar"
      >
        <Save size={13} />
      </button>
      <button
        onClick={handleCancel}
        className="p-1 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition flex-shrink-0"
        title="Cancelar"
      >
        <X size={13} />
      </button>
      {showToast && <SavedToast message={toastMessage} />}
    </span>
  );
}
