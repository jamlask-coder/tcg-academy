/**
 * Admin IP allowlist — DESHABILITADA por defecto.
 *
 * Si el env `ADMIN_ALLOWED_IPS` está vacío o no definido → permite cualquier IP
 * (no aplica el filtro). Si tiene valor → solo permite las IPs listadas
 * (separadas por coma; soporta exact match e IPv6 normal).
 *
 * Para activarlo más adelante:
 *   ADMIN_ALLOWED_IPS="91.117.45.12, 2a01:c50f:abcd::1"
 *
 * Compatible con Edge runtime (no usa node:* APIs).
 */

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isIpAllowedForAdmin(ip: string): boolean {
  const list = parseList(process.env.ADMIN_ALLOWED_IPS);
  if (list.length === 0) return true; // allowlist vacía = no aplica
  if (!ip || ip === "unknown") return false; // sin IP fiable, denegamos
  const norm = ip.toLowerCase();
  // IPv4-mapped IPv6 (::ffff:1.2.3.4) → comparar también la forma corta
  const stripped = norm.startsWith("::ffff:") ? norm.slice(7) : norm;
  return list.includes(norm) || list.includes(stripped);
}

export function adminAllowlistEnabled(): boolean {
  return parseList(process.env.ADMIN_ALLOWED_IPS).length > 0;
}
