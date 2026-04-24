"use client";
import { useCallback, useState } from "react";

/**
 * Field-level error state with red-border highlighting and on-blur validators.
 *
 * Pattern used across every page that writes to the User ID (registro,
 * completar-datos, cuenta/datos, finalizar-compra, admin/usuarios...).
 *
 * - `failWith(field, msg)` → sets the shared error message + marks the field
 * - `fieldCls(field, base)` → appends red border classes when that field failed
 * - `clearIfCurrent(field)` → called from onFocus/onChange to clear the mark
 * - `clearAll()` → called before re-validating
 *
 * Intentionally framework-agnostic: plain useState works with react-hook-form
 * (manual handling) OR with hand-rolled forms. For forms already using
 * react-hook-form + Zod, just pass `mode: "onTouched"` to `useForm()` — the
 * library does this natively and this hook is unnecessary there.
 */
export function useFieldErrors() {
  const [error, setError] = useState<string>("");
  const [errorField, setErrorField] = useState<string | null>(null);

  const failWith = useCallback((field: string, msg: string): void => {
    setError(msg);
    setErrorField(field);
  }, []);

  const clearIfCurrent = useCallback((field: string): void => {
    setErrorField((prev) => {
      if (prev === field) {
        setError("");
        return null;
      }
      return prev;
    });
  }, []);

  const clearAll = useCallback((): void => {
    setError("");
    setErrorField(null);
  }, []);

  const fieldCls = useCallback(
    (
      field: string,
      base: string,
      opts?: { errorClasses?: string; okClasses?: string },
    ): string => {
      const isBad = errorField === field;
      const bad = opts?.errorClasses ?? "border-red-400 focus:border-red-500";
      const ok =
        opts?.okClasses ?? "border-gray-200 focus:border-[#2563eb]";
      return `${base} ${isBad ? bad : ok}`;
    },
    [errorField],
  );

  const isFieldInvalid = useCallback(
    (field: string): boolean => errorField === field,
    [errorField],
  );

  return {
    error,
    errorField,
    failWith,
    clearIfCurrent,
    clearAll,
    fieldCls,
    isFieldInvalid,
  };
}
