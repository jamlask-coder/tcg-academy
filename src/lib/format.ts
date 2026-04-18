/**
 * Shared formatting helpers (dates, money, etc.).
 * Prefer importing from here over redefining in components.
 */

/** Format an ISO date string or Date as "28 de enero de 2025" (Spanish). */
export function formatDate(input: string | Date): string {
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return String(input);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(input);
  }
}

/** Format as "28/01/2025". Useful for compact tables. */
export function formatDateShort(input: string | Date): string {
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return String(input);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(input);
  }
}

/** Format with date + time: "28 ene 2025, 14:32". */
export function formatDateTime(input: string | Date): string {
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return String(input);
    return d.toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(input);
  }
}

/** Format a number as "1.234,56 €" (Spanish locale). */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
