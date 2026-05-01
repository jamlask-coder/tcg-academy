// ─── User handle ───────────────────────────────────────────────────────────
// Handle legible para URLs admin (`/admin/usuarios/{handle}`). Prioridad:
//   1. `user.username` explícito (poblado en el registro).
//   2. Slug derivado de `name` + `lastName` (ej. "Miguel Torres" → "miguel-torres").
//   3. Fallback al `id` crudo (nunca debería ocurrir en producción, pero evita
//      romper URLs si un usuario migrado no tiene username ni nombre legibles).
//
// Case-insensitive. Si el campo viene con mayúsculas, se normaliza a minúsculas
// aquí; el resto del sistema asume que los handles almacenados ya son slug.

export interface HasHandle {
  id: string;
  username?: string;
  name?: string;
  lastName?: string;
}

/**
 * Handles reservados — no se pueden registrar por un usuario nuevo.
 *
 * Palabras del sistema / rutas sensibles (admin, api, login…).
 *
 * Nota: la lista se normaliza (lowercase) al usar. Edita esta constante
 * si añades una ruta nueva bajo `/admin/usuarios/` que pueda colisionar.
 */
const SYSTEM_RESERVED_HANDLES = [
  "admin",
  "administrador",
  "api",
  "app",
  "cuenta",
  "login",
  "logout",
  "registro",
  "register",
  "recuperar-contrasena",
  "restablecer-contrasena",
  "null",
  "undefined",
  "root",
  "superadmin",
  "support",
  "soporte",
  "help",
  "ayuda",
  "tcgacademy",
  "new",
  "edit",
  "delete",
  "nuevo",
  "editar",
  "borrar",
] as const;

let _reservedSet: Set<string> | null = null;

/**
 * Set de handles reservados (system words).
 * Se cachea tras la primera llamada.
 */
export function getReservedHandles(): Set<string> {
  if (_reservedSet) return _reservedSet;
  _reservedSet = new Set<string>(SYSTEM_RESERVED_HANDLES);
  return _reservedSet;
}

/**
 * ¿Este handle está reservado y no puede ser usado por un nuevo registro?
 * Case-insensitive. Comprueba palabras reservadas del sistema.
 */
export function isHandleReserved(handle: string): boolean {
  if (!handle) return false;
  return getReservedHandles().has(handle.toLowerCase().trim());
}

export function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getUserHandle(user: HasHandle): string {
  if (user.username && user.username.trim()) {
    return user.username.toLowerCase();
  }
  const full = [user.name, user.lastName].filter(Boolean).join(" ");
  if (full) {
    const slug = slugifyName(full);
    if (slug) {
      // Si el slug derivado colisiona con un handle reservado del sistema,
      // uniquificamos con sufijo derivado del id para que cada usuario tenga
      // una URL distinta. El lookup se resuelve via `findUserByHandle` que
      // coincide por username → id → slug, así que un id-suffix siempre resuelve.
      if (isHandleReserved(slug)) {
        const suffix = user.id
          .replace(/[^a-z0-9]/gi, "")
          .slice(-6)
          .toLowerCase();
        return suffix ? `${slug}-${suffix}` : slug;
      }
      return slug;
    }
  }
  return user.id;
}

/**
 * Genera un username único legible para un usuario recién creado
 * (p.ej. auto-registro por Google sign-in) que no colisiona con reservados
 * ni con usernames ya tomados.
 *
 * Estrategia:
 *   1. Base = slug(name lastName) o prefijo del email.
 *   2. Truncar a 20 chars (límite del regex de registro).
 *   3. Si colisiona, añadir sufijo random de 4 chars y reintentar (10 veces).
 *   4. Fallback extremo: sufijo timestamp-base36.
 *
 * @param isUsed callback que devuelve true si el handle ya está tomado o reservado
 */
export function generateUniqueUsername(opts: {
  name?: string;
  lastName?: string;
  email: string;
  isUsed: (handle: string) => boolean;
}): string {
  const full = [opts.name, opts.lastName].filter(Boolean).join(" ").trim();
  const base = full || opts.email.split("@")[0] || "user";
  let candidate = slugifyName(base).slice(0, 20);
  if (!candidate || candidate.length < 3) candidate = "user";
  if (!opts.isUsed(candidate)) return candidate;
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const truncated = candidate.slice(0, 20 - suffix.length - 1);
    const next = `${truncated}-${suffix}`;
    if (!opts.isUsed(next)) return next;
  }
  const ts = Date.now().toString(36).slice(-4);
  return `${candidate.slice(0, 20 - ts.length - 1)}-${ts}`;
}

/**
 * Resuelve un handle (username o id) al usuario correspondiente.
 * Busca primero por username (case-insensitive), luego por id,
 * luego por slug derivado de name+lastName (backward-compat).
 */
export function findUserByHandle<T extends HasHandle>(
  users: T[],
  handle: string,
): T | undefined {
  const h = handle.toLowerCase();
  return (
    users.find((u) => u.username?.toLowerCase() === h) ??
    users.find((u) => u.id === handle) ??
    users.find((u) => {
      const full = [u.name, u.lastName].filter(Boolean).join(" ");
      return full && slugifyName(full) === h;
    })
  );
}

/**
 * Convierte un `userId` (el que viaja con los pedidos) al handle legible para
 * URLs. Busca en localStorage `tcgacademy_registered`. Si no encuentra el
 * user, devuelve el propio userId como fallback — la página de detalle admin
 * igualmente lo resuelve via `findUserByHandle`.
 *
 * Safe en SSR: si no hay `localStorage` (server), devuelve userId sin cambios.
 */
export function userIdToHandle(
  userId: string,
  _legacy: HasHandle[] = [],
): string {
  void _legacy;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("tcgacademy_registered");
      if (raw) {
        const registered = JSON.parse(raw) as Record<
          string,
          { user: HasHandle }
        >;
        const match = Object.values(registered).find(
          (e) => e.user.id === userId,
        );
        if (match) return getUserHandle(match.user);
      }
    } catch {
      // ignore
    }
  }

  return userId;
}
