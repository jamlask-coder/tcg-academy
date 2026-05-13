/**
 * TPV IP allowlist — DESHABILITADA por defecto.
 *
 * Paralela a `adminIpAllowlist` pero con env propio para que las IPs de las
 * tiendas físicas (Calpe / Béjar / Madrid / Barcelona) puedan whitelistarse
 * independientemente de la oficina de administración.
 *
 * Si el env `TPV_ALLOWED_IPS` está vacío o no definido → permite cualquier IP
 * (no aplica el filtro; el gate de rol JWT sigue activo). Si tiene valor →
 * solo permite las IPs listadas (separadas por coma; soporta exact match e
 * IPv6 normal y IPv4-mapped).
 *
 * Para activarlo:
 *   TPV_ALLOWED_IPS="91.117.45.12, 80.58.12.34, 2a01:c50f:abcd::1"
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

export function isIpAllowedForTpv(ip: string): boolean {
  const list = parseList(process.env.TPV_ALLOWED_IPS);
  if (list.length === 0) return true; // allowlist vacía = no aplica
  if (!ip || ip === "unknown") return false; // sin IP fiable, denegamos
  const norm = ip.toLowerCase();
  // IPv4-mapped IPv6 (::ffff:1.2.3.4) → comparar también la forma corta
  const stripped = norm.startsWith("::ffff:") ? norm.slice(7) : norm;
  return list.includes(norm) || list.includes(stripped);
}

export function tpvAllowlistEnabled(): boolean {
  return parseList(process.env.TPV_ALLOWED_IPS).length > 0;
}
