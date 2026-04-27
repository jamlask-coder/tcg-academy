"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, UserRole, RegisterData } from "@/types/user";
import {
  ensureReferralCode,
  registerWithReferral,
  getReferrerUserId,
  REFERRAL_INVITER_BONUS,
  REFERRAL_NEW_USER_BONUS,
} from "@/services/pointsService";
import { pushUserNotification } from "@/services/notificationService";
import { sanitizeString } from "@/utils/sanitize";
import { recordBulkConsent, type ConsentType } from "@/services/consentService";
import { DataHub } from "@/lib/dataHub";
import { SITE_CONFIG } from "@/config/siteConfig";
import { isHandleReserved, generateUniqueUsername } from "@/lib/userHandle";
import {
  issueVerificationToken,
  isEmailVerificationRequired,
} from "@/services/emailVerificationService";
import { getEmailService } from "@/lib/email";

export interface GoogleSignInPayload {
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  sub: string;
}

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (
    emailOrUsername: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: (
    payload: GoogleSignInPayload,
  ) => Promise<{ ok: boolean; error?: string; created?: boolean }>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (
    updates: Partial<Pick<User, "name" | "lastName" | "phone" | "addresses" | "nif" | "nifType">>,
  ) => { ok: boolean; error?: string };
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  changeEmail: (newEmail: string) => Promise<{ ok: boolean; error?: string }>;
  checkUsernameAvailable: (username: string) => boolean;
  toggleFavorite: (productId: number) => void;
  /** Merge atómico de favoritos (usado al hacer login para fusionar anon→auth
   *  sin el bug de closure estale que tenía el for-loop con toggleFavorite). */
  mergeFavorites: (productIds: number[]) => void;
  isFavorite: (productId: number) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "tcgacademy_user";
const REGISTERED_KEY = "tcgacademy_registered";
const USERNAMES_KEY = "tcgacademy_usernames"; // username (lowercase) → email
const NIFS_KEY = "tcgacademy_nifs";           // NIF (uppercase) → email
const SESSION_EXPIRY_MS = SITE_CONFIG.sessionExpiryHours * 60 * 60 * 1000;
const REMEMBER_ME_MS = SITE_CONFIG.rememberMeDays * 24 * 60 * 60 * 1000;

/**
 * Modo server vs local. En server mode, register/login/logout/changePassword
 * pasan por `/api/auth`, que persiste en Supabase y emite cookie httpOnly
 * `tcga_session`. localStorage queda como caché optimista para que el header
 * se pinte sin esperar al fetch — la fuente de verdad es la cookie JWT.
 */
const IS_SERVER_MODE =
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

/** Persist the registered-users map and notify reactive consumers (admin dashboard). */
function persistRegistered(registered: Record<string, unknown>): void {
  try { localStorage.setItem(REGISTERED_KEY, JSON.stringify(registered)); } catch { /* ignore */ }
  DataHub.emit("users");
}

/** Normalize username: lowercase, trim */
function normalizeUsername(u: string): string {
  return u.toLowerCase().trim();
}

/** Load the username→email index from localStorage */
function loadUsernameIndex(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(USERNAMES_KEY) ?? "{}") as Record<string, string>;
  } catch { return {}; }
}

/** Save the username→email index */
function saveUsernameIndex(index: Record<string, string>) {
  try { localStorage.setItem(USERNAMES_KEY, JSON.stringify(index)); } catch { /* ignore */ }
}

/** Normalize NIF: uppercase, strip spaces/dashes. Matches invoice validators. */
function normalizeNif(nif: string): string {
  return nif.toUpperCase().replace(/[\s-]/g, "").trim();
}

/** Load the NIF→email index (política: 1 NIF = 1 usuario). */
function loadNifIndex(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NIFS_KEY) ?? "{}") as Record<string, string>;
  } catch { return {}; }
}

/** Save the NIF→email index */
function saveNifIndex(index: Record<string, string>) {
  try { localStorage.setItem(NIFS_KEY, JSON.stringify(index)); } catch { /* ignore */ }
}

/**
 * Reconstruye el índice NIF→email recorriendo todos los usuarios registrados.
 * Se ejecuta una vez al boot (migración para instalaciones previas que ya
 * tienen NIFs guardados pero no el índice). Mantiene la semántica "1 NIF = 1
 * usuario" — el primer email encontrado gana si existía un duplicado previo;
 * los conflictos se reportan en consola para que el admin los resuelva.
 */
function backfillNifIndex(): void {
  if (typeof window === "undefined") return;
  try {
    const registered = JSON.parse(
      localStorage.getItem(REGISTERED_KEY) ?? "{}",
    ) as Record<string, { password: string; user: User }>;
    const index: Record<string, string> = {};
    const conflicts: Array<{ nif: string; first: string; dup: string }> = [];
    for (const entry of Object.values(registered)) {
      const rawNif = entry.user.nif;
      if (!rawNif) continue;
      const key = normalizeNif(rawNif);
      if (!key) continue;
      if (index[key] && index[key] !== entry.user.email) {
        conflicts.push({ nif: key, first: index[key], dup: entry.user.email });
        continue;
      }
      index[key] = entry.user.email.toLowerCase();
    }
    saveNifIndex(index);
    if (conflicts.length > 0) {
      // No bloquea. El admin verá los duplicados en /admin/usuarios y podrá
      // resolverlos manualmente. Se expone vía logger (no console directo).
      try {
        const win = window as unknown as { __tcgaNifConflicts?: typeof conflicts };
        win.__tcgaNifConflicts = conflicts;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────
//
// Los hashes sólo protegen el localStorage de lecturas casuales (inspector,
// malware de bajo nivel). NO sustituyen autenticación server-side — en
// producción, usar NEXT_PUBLIC_BACKEND_MODE=server con JWT + bcrypt.
//
// Formato de almacenamiento (2026-04, v2):
//   `v2:<saltB64>:<iterations>:<hashB64>`
//
// PBKDF2-SHA256 con 600.000 iteraciones (recomendación OWASP 2023) y salt
// único por usuario (128 bits). Sustituye al SHA-256 crudo anterior, que era
// rápido de brute-forcear con cualquier GPU.
//
// Migración automática: `verifyStoredPassword` acepta formato legacy (SHA-256
// hex 64 chars o texto plano) y los callers rehashan al primer login exitoso.
const SESSION_HASH_SALT = "tcga-2025-session-v1";
const PASSWORD_HASH_SALT = "tcga-2025-pwd-v1"; // Legacy — solo para verify legacy
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BITS = 256;

async function sha256hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  bits: number,
): Promise<Uint8Array> {
  const pwBytes = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pwBytes as unknown as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const buf = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    bits,
  );
  return new Uint8Array(buf);
}

/**
 * Hashea una contraseña para almacenamiento local (formato v2: PBKDF2 con
 * salt único por usuario). Llamar SIEMPRE al crear usuario o rotar password.
 */
export async function hashPassword(pw: string): Promise<string> {
  const salt = new Uint8Array(PBKDF2_SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(pw, salt, PBKDF2_ITERATIONS, PBKDF2_HASH_BITS);
  return `v2:${bytesToB64(salt)}:${PBKDF2_ITERATIONS}:${bytesToB64(hash)}`;
}

function timingSafeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Verifica una password contra un hash almacenado. Acepta:
 *   - v2: PBKDF2 (formato actual) — seguro.
 *   - legacy SHA-256 hex (64 chars) — se re-hashea al próximo login.
 *   - texto plano — pre-hashing era opcional. También se re-hashea.
 *
 * Devuelve `{ ok, needsRehash }` — si `needsRehash`, el caller debe llamar
 * `hashPassword(pw)` y guardar el resultado para migrar al formato v2.
 */
export async function verifyStoredPassword(
  pw: string,
  stored: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  if (stored.startsWith("v2:")) {
    const parts = stored.split(":");
    if (parts.length !== 4) return { ok: false, needsRehash: false };
    const [, saltB64, iterStr, hashB64] = parts;
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations < 1000) {
      return { ok: false, needsRehash: false };
    }
    try {
      const salt = b64ToBytes(saltB64);
      const expected = b64ToBytes(hashB64);
      const candidate = await pbkdf2(pw, salt, iterations, expected.length * 8);
      return { ok: timingSafeEquals(candidate, expected), needsRehash: false };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }
  // Legacy SHA-256 hex (64 chars de [0-9a-f])
  if (/^[0-9a-f]{64}$/i.test(stored)) {
    const legacy = await sha256hex(PASSWORD_HASH_SALT + pw);
    return { ok: stored.toLowerCase() === legacy.toLowerCase(), needsRehash: true };
  }
  // Plaintext (compatibilidad con cuentas creadas antes de hashing)
  return { ok: stored === pw, needsRehash: true };
}

/** Integrity hash that ties id+role+email+loginAt together */
async function sessionHash(u: User & { _loginAt?: number }): Promise<string> {
  return sha256hex(
    `${u.id}|${u.role}|${u.email}|${u._loginAt ?? 0}|${SESSION_HASH_SALT}`,
  );
}

// ─── Demo users (client-side simulation) ─────────────────────────────────────
// In a real backend these would be server-verified. For the static demo, we
// pre-seed four role accounts so the buyer experience can be shown end-to-end.
//
// SEGURIDAD: en producción este mapa se vacía obligatoriamente. Sólo se rellena
// cuando estamos fuera de producción O cuando se pide explícitamente con la
// flag NEXT_PUBLIC_ENABLE_DEMO_USERS=true (útil para Vercel preview/staging).
// Así, una build de producción jamás expone "admin@tcgacademy.es / test123".
//
// Auditado por tests/audit/run-audit.mjs (Test 26).
const DEMO_USERS_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO_USERS === "true";

const DEMO_USERS_FULL: Record<string, { password: string; user: User }> = {
  "cliente@test.com": {
    password: "test123",
    user: {
      id: "demo-cliente",
      email: "cliente@test.com",
      name: "Maria",
      lastName: "Garcia",
      phone: "+34 666 111 111",
      role: "cliente",
      nif: "12345678Z",
      nifType: "DNI",
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
      birthDate: "1998-04-15",
    },
  },
  "mayorista@test.com": {
    password: "test123",
    user: {
      id: "demo-mayorista",
      email: "mayorista@test.com",
      name: "Carlos",
      lastName: "Lopez",
      phone: "+34 666 222 222",
      role: "mayorista",
      nif: "B12345674",
      nifType: "CIF",
      addresses: [],
      favorites: [],
      empresa: {
        cif: "B12345674",
        razonSocial: "Distribuciones TCG S.L.",
        direccionFiscal: "Calle Mayor 10, 28001 Madrid",
        personaContacto: "Carlos Lopez",
        telefonoEmpresa: "+34 910 000 100",
        emailFacturacion: "facturacion@distribuciones-tcg.com",
      },
      createdAt: new Date().toISOString(),
    },
  },
  "admin@tcgacademy.es": {
    password: "test123",
    user: {
      // Cuenta genérica "admin" = el operador fiscal/contable (Luri). El email
      // admin@ se mantiene por compatibilidad con sesiones antiguas, pero el
      // display name es el real para que el header y la sidebar muestren
      // "Luri" en vez del placeholder "Admin TCG".
      id: "demo-admin",
      email: "admin@tcgacademy.es",
      name: "Luri",
      lastName: "",
      phone: "+34 666 000 000",
      role: "admin" as const,
      nif: "00000001R",
      nifType: "DNI",
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
    },
  },
  "luri@tcgacademy.es": {
    password: "test123",
    user: {
      id: "admin-luri",
      email: "luri@tcgacademy.es",
      name: "Luri",
      lastName: "",
      phone: "+34 666 000 001",
      role: "admin" as const,
      nif: "00000001R",
      nifType: "DNI",
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
    },
  },
  "font@tcgacademy.es": {
    password: "test123",
    user: {
      id: "admin-font",
      email: "font@tcgacademy.es",
      name: "Font",
      lastName: "",
      phone: "+34 666 000 002",
      role: "admin" as const,
      nif: "00000002W",
      nifType: "DNI",
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
    },
  },
  "tienda@test.com": {
    password: "test123",
    user: {
      id: "demo-tienda",
      email: "tienda@test.com",
      name: "Ana",
      lastName: "Martinez",
      phone: "+34 666 333 333",
      role: "tienda",
      nif: "A12345674",
      nifType: "CIF",
      addresses: [],
      favorites: [],
      empresa: {
        cif: "A12345674",
        razonSocial: "La Tienda TCG S.L.",
        direccionFiscal: "Avda. Diagonal 200, 08013 Barcelona",
        personaContacto: "Ana Martinez",
        telefonoEmpresa: "+34 930 000 200",
        emailFacturacion: "compras@latiendatcg.com",
      },
      createdAt: new Date().toISOString(),
    },
  },
};

/**
 * Mapa de demo expuesto al runtime. En producción, salvo activación explícita,
 * es {} — los logins demo (admin/cliente/mayorista/tienda/luri/font) NO existen.
 */
const DEMO_USERS: Record<string, { password: string; user: User }> =
  DEMO_USERS_ENABLED ? DEMO_USERS_FULL : {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage — expire after 24h, verify integrity hash.
  // En server mode, además, intentamos hidratar desde /api/auth/me (cookie
  // httpOnly como fuente de verdad). Si la cookie es válida, sobreescribimos
  // el caché localStorage con los datos canónicos del backend.
  useEffect(() => {
    const verify = async () => {
      try {
        // ── Server mode: cookie JWT es fuente de verdad ────────────────
        if (IS_SERVER_MODE) {
          try {
            const res = await fetch("/api/auth/me", {
              credentials: "include",
              cache: "no-store",
            });
            if (res.ok) {
              const data = (await res.json()) as { ok: boolean; user?: User };
              if (data.ok && data.user) {
                // Hidratar campos de catálogo cliente (favorites, addresses)
                // desde el caché local — no viven en BD aún.
                let cachedExtras: Partial<User> = {};
                try {
                  const stored = localStorage.getItem(STORAGE_KEY);
                  if (stored) {
                    const parsed = JSON.parse(stored) as Partial<User>;
                    cachedExtras = {
                      favorites: parsed.favorites ?? [],
                      addresses: parsed.addresses ?? [],
                    };
                  }
                } catch { /* ignore */ }
                const merged: User = {
                  ...data.user,
                  favorites: cachedExtras.favorites ?? [],
                  addresses: cachedExtras.addresses ?? [],
                } as User;
                setUser(merged);
                // Actualizar caché optimista
                try {
                  const loginAt = Date.now();
                  const cached = { ...merged, _loginAt: loginAt, _expiresIn: REMEMBER_ME_MS };
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
                } catch { /* ignore */ }
                return;
              }
            }
            // 401 → cookie inválida o ausente: limpiar caché legacy.
            if (res.status === 401) {
              try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
              return;
            }
            // 204 (modo local en server) o 5xx → continuar con localStorage abajo.
          } catch {
            // Network error: caer al caché localStorage para no romper la UX.
          }
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as User & {
            _loginAt?: number;
            _hash?: string;
            _expiresIn?: number;
          };
          const loginAt = parsed._loginAt ?? 0;
          const expiresIn = parsed._expiresIn ?? SESSION_EXPIRY_MS;

          // Expired session
          if (Date.now() - loginAt >= expiresIn) {
            localStorage.removeItem(STORAGE_KEY);
            return;
          }

          // Integrity check: if hash is present, verify it matches
          if (parsed._hash) {
            const expected = await sessionHash(parsed);
            if (expected !== parsed._hash) {
              // Session tampered (e.g. role elevation via devtools) — reject it
              localStorage.removeItem(STORAGE_KEY);
              return;
            }
          }

          // One-time migration: el usuario admin@tcgacademy.es antes se
          // almacenaba como "Admin" / "TCG". Ahora el display correcto es
          // "Luri" (el admin real). Si detectamos el valor antiguo, lo
          // reescribimos y regeneramos el hash de integridad.
          if (
            parsed.email === "admin@tcgacademy.es" &&
            parsed.name === "Admin" &&
            parsed.lastName === "TCG"
          ) {
            parsed.name = "Luri";
            parsed.lastName = "";
            const next = { ...parsed };
            const newHash = await sessionHash({
              ...next,
              _loginAt: loginAt,
            });
            next._hash = newHash;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }

          // Migración NIF: sesiones antiguas de demo users guardadas antes de
          // que DEMO_USERS tuviese NIF. Reescribimos el NIF desde DEMO_USERS
          // para que el FiscalDataGuard no los atrape en /completar-datos.
          const demoSeed = DEMO_USERS[parsed.email?.toLowerCase() ?? ""];
          if (demoSeed && demoSeed.user.nif && !parsed.nif) {
            parsed.nif = demoSeed.user.nif;
            parsed.nifType = demoSeed.user.nifType;
            const migrated = { ...parsed };
            const newHash = await sessionHash({
              ...migrated,
              _loginAt: loginAt,
            });
            migrated._hash = newHash;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          }

          setUser(parsed);
          // SSOT: al restaurar sesión, reconcilia puntos desde historial.
          // Si balance y transacciones divergieron por un write fallido,
          // el historial gana (ver pointsService.reconcilePointsFromHistory).
          try {
            const { reconcilePointsFromHistory } = await import("@/services/pointsService");
            reconcilePointsFromHistory(parsed.id);
          } catch { /* non-fatal */ }
        }
      } catch {
        // corrupt storage — clear it
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } finally {
        setIsLoading(false);
      }
    };
    verify();
    // Backfill del índice NIF→email para instalaciones que ya tenían NIFs
    // guardados antes de la política "1 NIF = 1 usuario". Idempotente.
    backfillNifIndex();
  }, []);

  const persist = useCallback((u: User | null, expiresIn?: number) => {
    setUser(u);
    if (u) {
      const loginAt = Date.now();
      const data = { ...u, _loginAt: loginAt, _expiresIn: expiresIn ?? SESSION_EXPIRY_MS };
      // Write immediately so auth state is available synchronously
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Then append integrity hash asynchronously
      sessionHash({ ...u, _loginAt: loginAt })
        .then((hash) => {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const obj = JSON.parse(raw) as Record<string, unknown>;
              obj._hash = hash;
              localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
            }
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          /* ignore — session still works without hash */
        });
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (
      emailOrUsername: string,
      password: string,
      rememberMe?: boolean,
    ): Promise<{ ok: boolean; error?: string }> => {
      const expiresIn = rememberMe ? REMEMBER_ME_MS : SESSION_EXPIRY_MS;

      // ── Server mode: pasar por /api/auth ────────────────────────────────
      // El backend resuelve username→email, valida bcrypt timing-safe, aplica
      // rate-limit por IP/admin y emite cookie JWT. Aquí solo refrescamos el
      // AuthContext con el perfil devuelto.
      if (IS_SERVER_MODE) {
        try {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              action: "login",
              email: emailOrUsername.trim(),
              password,
              rememberMe: !!rememberMe,
            }),
          });
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            user?: User;
            error?: string;
          };
          if (!res.ok || !json.ok || !json.user) {
            return { ok: false, error: json.error ?? "Usuario o contraseña incorrectos" };
          }
          // Hidratar favorites/addresses desde caché local (no viven en BD).
          let cachedExtras: Partial<User> = {};
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const parsed = JSON.parse(stored) as Partial<User>;
              if (parsed.email?.toLowerCase() === json.user.email.toLowerCase()) {
                cachedExtras = {
                  favorites: parsed.favorites ?? [],
                  addresses: parsed.addresses ?? [],
                };
              }
            }
          } catch { /* ignore */ }
          const merged: User = {
            ...json.user,
            favorites: cachedExtras.favorites ?? [],
            addresses: cachedExtras.addresses ?? [],
          } as User;
          persist(merged, expiresIn);
          return { ok: true };
        } catch {
          return { ok: false, error: "Error de red al iniciar sesión" };
        }
      }

      // Resolve username → email if input has no @
      let resolvedEmail = emailOrUsername.trim();
      if (!resolvedEmail.includes("@")) {
        const index = loadUsernameIndex();
        const mapped = index[normalizeUsername(resolvedEmail)];
        if (!mapped) {
          return { ok: false, error: "Usuario o contraseña incorrectos" };
        }
        resolvedEmail = mapped;
      }

      const key = resolvedEmail.toLowerCase();

      // Demo users — plaintext comparison (by design; no real backend)
      const demo = DEMO_USERS[key];
      if (demo && demo.password === password) {
        persist(demo.user, expiresIn);
        return { ok: true };
      }

      // Registered users — compare against SHA-256 hash first, then
      // fall back to plaintext for accounts created before hashing was added
      try {
        const registered = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, { password: string; user: User }>;
        const entry = registered[key];
        if (entry) {
          const { ok: matches, needsRehash } = await verifyStoredPassword(
            password,
            entry.password,
          );
          if (matches) {
            if (needsRehash) {
              // Migración silenciosa: cuenta legacy (SHA-256/plaintext) →
              // re-hasheamos a PBKDF2 en el primer login exitoso.
              entry.password = await hashPassword(password);
              persistRegistered(registered);
            }
            // Feature flag: si `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true`
            // bloqueamos el acceso hasta que el usuario verifique el email.
            if (
              isEmailVerificationRequired() &&
              !entry.user.emailVerified
            ) {
              return {
                ok: false,
                error:
                  "Tu email no está verificado. Revisa tu bandeja de entrada.",
              };
            }
            persist(entry.user, expiresIn);
            return { ok: true };
          }
        }
      } catch {
        /* ignore */
      }
      return { ok: false, error: "Usuario o contraseña incorrectos" };
    },
    [persist],
  );

  const loginWithGoogle = useCallback(
    async (
      payload: GoogleSignInPayload,
    ): Promise<{ ok: boolean; error?: string; created?: boolean }> => {
      if (!payload?.email) {
        return { ok: false, error: "Google no devolvió un email" };
      }
      if (payload.email_verified === false) {
        return { ok: false, error: "Tu email de Google no está verificado" };
      }
      const email = payload.email.toLowerCase();

      // Existing demo account with same email → log in directly
      const demo = DEMO_USERS[email];
      if (demo) {
        persist(demo.user, REMEMBER_ME_MS);
        return { ok: true };
      }

      try {
        const registered = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, { password: string; user: User }>;

        if (registered[email]) {
          // Usuario ya existía (p.ej. registrado antes con email/password).
          // Enriquecemos con datos de Google si faltan: Google ya validó el
          // correo, así que su `emailVerified` es autoritativo; y guardamos
          // la foto de perfil si no tenía.
          const existing = registered[email].user;
          const nowIso = new Date().toISOString();
          const upgraded: User = {
            ...existing,
            emailVerified: existing.emailVerified || payload.email_verified === true,
            emailVerifiedAt:
              existing.emailVerifiedAt ??
              (payload.email_verified === true ? nowIso : undefined),
            avatarUrl: existing.avatarUrl ?? payload.picture,
          };
          registered[email] = { ...registered[email], user: upgraded };
          persistRegistered(registered);
          persist(upgraded, REMEMBER_ME_MS);
          return { ok: true };
        }

        // Auto-register as cliente (B2B must register manually with CIF)
        const newUserId = `user-${crypto.randomUUID()}`;
        const refCode = ensureReferralCode(newUserId);
        const rawName =
          payload.given_name ?? payload.name?.split(" ")[0] ?? "";
        const rawLastName =
          payload.family_name ??
          payload.name?.split(" ").slice(1).join(" ") ??
          "";
        const name = sanitizeString(rawName);
        const lastName = sanitizeString(rawLastName);

        // Auto-genera un username único legible para que el usuario de
        // Google tenga URL admin limpia (`/admin/usuarios/{handle}`) y no
        // colisione con MOCK_USERS/reservados ni otros registrados.
        const usernameIndex = loadUsernameIndex();
        const autoUsername = generateUniqueUsername({
          name,
          lastName,
          email,
          isUsed: (h) => !!usernameIndex[h] || isHandleReserved(h),
        });

        // Google ya ha validado el email (claim `email_verified`). No
        // emitimos token de verificación ni email nuestro — damos la cuenta
        // por verificada desde el minuto 0. Además extraemos el máximo
        // posible de los claims OIDC: foto de perfil (picture), nombre
        // completo (ya separado arriba en name/lastName) y el flag de
        // verificación. Campos como NIF/teléfono/dirección los pedimos
        // solo en checkout (FiscalDataGuard).
        const nowIso = new Date().toISOString();
        const newUser: User = {
          id: newUserId,
          email,
          username: autoUsername,
          name,
          lastName,
          phone: "",
          role: "cliente",
          addresses: [],
          favorites: [],
          createdAt: nowIso,
          referralCode: refCode,
          emailVerified: payload.email_verified === true,
          emailVerifiedAt:
            payload.email_verified === true ? nowIso : undefined,
          avatarUrl: payload.picture,
        };

        // Random password — Google users can still request a password reset
        // to set their own if they ever want to log in without Google.
        const randomPw = `${crypto.randomUUID()}${crypto.randomUUID()}`;
        const hashedPw = await hashPassword(randomPw);
        registered[email] = { password: hashedPw, user: newUser };
        persistRegistered(registered);

        // Registrar el username auto-generado en el índice para que
        // futuras comprobaciones de unicidad lo detecten.
        usernameIndex[autoUsername] = email;
        saveUsernameIndex(usernameIndex);

        // Record GDPR consents (Art. 7 — proof of consent)
        const consentEntries: Array<{
          type: ConsentType;
          status: "granted" | "revoked";
        }> = [
          { type: "terms", status: "granted" },
          { type: "privacy", status: "granted" },
          { type: "data_processing", status: "granted" },
        ];
        recordBulkConsent({
          userId: newUserId,
          consents: consentEntries,
          method: "google_signin",
        });

        persist(newUser, REMEMBER_ME_MS);
        return { ok: true, created: true };
      } catch {
        return { ok: false, error: "Error al iniciar sesión con Google" };
      }
    },
    [persist],
  );

  const logout = useCallback(() => {
    // En server mode, además de limpiar el caché local, pedimos al backend
    // que invalide la cookie httpOnly. Si el fetch falla (offline), la
    // cookie expirará por sí sola al sessionExpiry y la próxima llamada a
    // /api/auth/me devolverá 401 → AuthContext quedará sin usuario.
    if (IS_SERVER_MODE) {
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "logout" }),
        keepalive: true,
      }).catch(() => { /* fire-and-forget */ });
    }
    persist(null);
  }, [persist]);

  const register = useCallback(
    async (data: RegisterData): Promise<{ ok: boolean; error?: string }> => {
      const email = data.email.toLowerCase();
      const username = data.username ? normalizeUsername(data.username) : undefined;

      // ── Server mode: delegar todo al endpoint /api/auth ────────────────
      // El backend valida unicidad de email/username/NIF, hashea con bcrypt,
      // graba consents en BD, emite cookie JWT y dispara emails de bienvenida
      // + verificación. Aquí solo refrescamos el AuthContext y el caché local.
      if (IS_SERVER_MODE) {
        try {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              action: "register",
              name: data.name,
              lastName: data.lastName,
              email,
              password: data.password,
              phone: data.phone,
              username,
              nif: data.nif,
              nifType: data.nifType,
              referralCode: data.referralCode,
              marketingConsent: data.marketingConsent,
              captchaToken: data.captchaToken,
            }),
          });
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            user?: User;
            error?: string;
          };
          if (!res.ok || !json.ok || !json.user) {
            return { ok: false, error: json.error ?? "No se pudo crear la cuenta" };
          }
          // El servidor no devuelve addresses/favorites — son datos cliente.
          // La dirección del registro la guardamos local como caché para que
          // el checkout/profile la prepoblen (el backend la persistirá en
          // tabla addresses cuando hagamos el primer pedido).
          const newUser: User = {
            ...json.user,
            addresses: [
              {
                id: `addr-${crypto.randomUUID()}`,
                label: "Principal",
                ...data.address,
                predeterminada: true,
              },
            ],
            favorites: [],
          };
          persist(newUser);
          DataHub.emit("users");
          return { ok: true };
        } catch {
          return { ok: false, error: "Error de red al crear la cuenta" };
        }
      }

      if (DEMO_USERS[email])
        return { ok: false, error: "Este email ya está registrado" };

      try {
        const registered = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, unknown>;
        if (registered[email])
          return { ok: false, error: "Este email ya está registrado" };

        // Check username uniqueness + reserved handles.
        // `isHandleReserved` cubre system words (admin, api, login…) y
        // MOCK_USERS usernames (demo accounts que viven en URLs admin).
        if (username) {
          if (isHandleReserved(username))
            return { ok: false, error: "Este nombre de usuario está reservado, elige otro" };
          const index = loadUsernameIndex();
          if (index[username])
            return { ok: false, error: "Este nombre de usuario ya está en uso" };
        }

        const newUserId = `user-${crypto.randomUUID()}`;
        const refCode = ensureReferralCode(newUserId);
        const sanitizedName = sanitizeString(data.name);
        const sanitizedLastName = sanitizeString(data.lastName);
        const sanitizedPhone = data.phone ? sanitizeString(data.phone) : "";
        const sanitizedUsername = username ? sanitizeString(username) : undefined;
        const sanitizedNif = data.nif ? sanitizeString(data.nif).toUpperCase() : "";
        const newUser: User = {
          id: newUserId,
          email,
          ...(sanitizedUsername ? { username: sanitizedUsername } : {}),
          name: sanitizedName,
          lastName: sanitizedLastName,
          phone: sanitizedPhone,
          gender: data.gender,
          role: "cliente",
          ...(sanitizedNif ? { nif: sanitizedNif, nifType: data.nifType } : {}),
          addresses: [
            {
              id: `addr-${crypto.randomUUID()}`,
              label: "Principal",
              ...data.address,
              predeterminada: true,
            },
          ],
          favorites: [],
          createdAt: new Date().toISOString(),
          referralCode: refCode,
        };

        ensureReferralCode(newUserId);
        if (data.referralCode) {
          const displayName = `${sanitizedName} ${sanitizedLastName.charAt(0)}.`;
          const refResult = registerWithReferral(
            newUserId,
            displayName,
            data.referralCode,
          );
          if (refResult.ok) {
            newUser.referredBy = data.referralCode;

            // Notify the inviter: they earned the bonus
            const inviterId = getReferrerUserId(data.referralCode);
            if (inviterId) {
              pushUserNotification(inviterId, {
                type: "asociacion",
                title: `${displayName} se ha unido con tu código`,
                message: `Has recibido ${REFERRAL_INVITER_BONUS.toLocaleString("es-ES")} puntos (${(REFERRAL_INVITER_BONUS / 10000).toFixed(0)}€) como recompensa.`,
                date: new Date().toISOString(),
                link: "/cuenta/grupo",
              });
            }

            // Notify the new user about their welcome points
            pushUserNotification(newUserId, {
              type: "puntos",
              title: `¡Bienvenido! Tienes ${REFERRAL_NEW_USER_BONUS.toLocaleString("es-ES")} puntos`,
              message: `Hemos añadido ${REFERRAL_NEW_USER_BONUS.toLocaleString("es-ES")} puntos (${(REFERRAL_NEW_USER_BONUS / 10000).toFixed(0)}€) a tu cuenta. Los puedes canjear como descuento al finalizar tu próxima compra.`,
              date: new Date().toISOString(),
              link: "/cuenta/puntos",
            });
          }
        }

        const hashedPw = await hashPassword(data.password);
        registered[email] = { password: hashedPw, user: newUser };
        persistRegistered(registered);

        // Register username in the index
        if (username) {
          const index = loadUsernameIndex();
          index[username] = email;
          saveUsernameIndex(index);
        }

        // Record GDPR consents (Art. 7 — proof of consent)
        const consentEntries: Array<{ type: ConsentType; status: "granted" | "revoked" }> = [
          { type: "terms", status: "granted" },
          { type: "privacy", status: "granted" },
          { type: "data_processing", status: "granted" },
          { type: "marketing_email", status: data.marketingConsent ? "granted" : "revoked" },
        ];
        recordBulkConsent({
          userId: newUserId,
          consents: consentEntries,
          method: "registration_form",
        });

        // Issue email verification token (preparado — no bloquea login
        // salvo que NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true).
        // En server mode el token + email los emite `/api/auth` server-side
        // (RESEND_API_KEY no está expuesto al cliente). Aquí solo local.
        const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
        if (backendMode !== "server") {
          try {
            const rawToken = await issueVerificationToken(email);
            const appUrl =
              (typeof window !== "undefined" && window.location?.origin) ||
              process.env.NEXT_PUBLIC_APP_URL ||
              "http://localhost:3000";
            const verifyUrl = `${appUrl}/verificar-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
            const emailService = getEmailService();
            await emailService.sendTemplatedEmail(
              "verificar_email",
              email,
              {
                nombre: sanitizedName,
                verify_url: verifyUrl,
                expires_in: "7 días",
              },
            );
          } catch {
            /* no-op: no bloquear el registro si el email falla */
          }
        }

        persist(newUser);
        return { ok: true };
      } catch {
        return { ok: false, error: "Error al crear la cuenta. Inténtalo de nuevo." };
      }
    },
    [persist],
  );

  const checkUsernameAvailable = useCallback((username: string): boolean => {
    const key = normalizeUsername(username);
    if (!key) return false;
    // Bloquea handles reservados del sistema + MOCK_USERS (demo accounts).
    // Sin este check, un cliente real podría registrarse como "admin" o "laura"
    // y colisionar con URLs de `/admin/usuarios/{handle}`.
    if (isHandleReserved(key)) return false;
    const index = loadUsernameIndex();
    return !index[key];
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Pick<User, "name" | "lastName" | "phone" | "addresses" | "nif" | "nifType">>): { ok: boolean; error?: string } => {
      if (!user) return { ok: false, error: "No has iniciado sesión" };
      const sanitizedUpdates: Partial<Pick<User, "name" | "lastName" | "phone" | "addresses" | "nif" | "nifType">> = {};
      if (updates.name !== undefined) sanitizedUpdates.name = sanitizeString(updates.name);
      if (updates.lastName !== undefined) sanitizedUpdates.lastName = sanitizeString(updates.lastName);
      if (updates.phone !== undefined) sanitizedUpdates.phone = sanitizeString(updates.phone);
      if (updates.addresses !== undefined) sanitizedUpdates.addresses = updates.addresses;
      if (updates.nif !== undefined) sanitizedUpdates.nif = sanitizeString(updates.nif).toUpperCase();
      if (updates.nifType !== undefined) sanitizedUpdates.nifType = updates.nifType;

      // Política "1 NIF = 1 usuario": si el NIF cambia o se añade por primera
      // vez, comprobamos que no esté asignado a otro email.
      const newNif = sanitizedUpdates.nif;
      if (newNif !== undefined) {
        const key = normalizeNif(newNif);
        if (key) {
          const nifIndex = loadNifIndex();
          const owner = nifIndex[key];
          if (owner && owner.toLowerCase() !== user.email.toLowerCase()) {
            return {
              ok: false,
              error: "Este NIF ya está asignado a otra cuenta. Contacta con soporte si crees que es un error.",
            };
          }
        }
      }

      const updated = { ...user, ...sanitizedUpdates };
      persist(updated);
      // Also update in registered store if applicable
      try {
        const registered = JSON.parse(
          localStorage.getItem("tcgacademy_registered") ?? "{}",
        ) as Record<string, { password: string; user: User }>;
        if (registered[user.email]) {
          registered[user.email].user = updated;
          persistRegistered(registered);
        }
      } catch {
        /* ignore */
      }

      // Sincronizar el índice NIF→email tras el guardado.
      if (newNif !== undefined) {
        try {
          const nifIndex = loadNifIndex();
          // Limpiar NIF anterior del índice si apuntaba a este usuario.
          if (user.nif) {
            const oldKey = normalizeNif(user.nif);
            if (oldKey && nifIndex[oldKey]?.toLowerCase() === user.email.toLowerCase()) {
              delete nifIndex[oldKey];
            }
          }
          const newKey = normalizeNif(newNif);
          if (newKey) nifIndex[newKey] = user.email.toLowerCase();
          saveNifIndex(nifIndex);
        } catch { /* ignore */ }
      }

      return { ok: true };
    },
    [user, persist],
  );

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "No has iniciado sesión" };

      // ── Server mode: rotar password en BD vía /api/auth ────────────────
      if (IS_SERVER_MODE) {
        try {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              action: "change-password",
              userId: user.id,
              currentPassword,
              newPassword,
            }),
          });
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
          };
          if (!res.ok || !json.ok) {
            return { ok: false, error: json.error ?? "No se pudo cambiar la contraseña" };
          }
          return { ok: true };
        } catch {
          return { ok: false, error: "Error de red al cambiar la contraseña" };
        }
      }

      const email = user.email.toLowerCase();

      // Check if it's a demo user (demo passwords are plaintext)
      const demo = DEMO_USERS[email];
      if (demo) {
        if (demo.password !== currentPassword) {
          return { ok: false, error: "La contraseña actual no es correcta" };
        }
        // Migrate demo user to registered with new password
        try {
          const registered = JSON.parse(
            localStorage.getItem(REGISTERED_KEY) ?? "{}",
          ) as Record<string, { password: string; user: User }>;
          const hashedNew = await hashPassword(newPassword);
          registered[email] = { password: hashedNew, user };
          persistRegistered(registered);
          return { ok: true };
        } catch {
          return { ok: false, error: "Error al guardar la nueva contraseña" };
        }
      }

      // Registered user — verify current password
      try {
        const registered = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, { password: string; user: User }>;
        const entry = registered[email];
        if (!entry) return { ok: false, error: "Cuenta no encontrada" };

        const { ok: matches } = await verifyStoredPassword(
          currentPassword,
          entry.password,
        );
        if (!matches) {
          return { ok: false, error: "La contraseña actual no es correcta" };
        }

        entry.password = await hashPassword(newPassword);
        persistRegistered(registered);
        return { ok: true };
      } catch {
        return { ok: false, error: "Error al cambiar la contraseña" };
      }
    },
    [user],
  );

  const changeEmail = useCallback(
    async (
      newEmailRaw: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "No has iniciado sesión" };
      const newEmail = sanitizeString(newEmailRaw).toLowerCase().trim();

      // Basic format + length sanity (Zod rules in registro/login)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 254) {
        return { ok: false, error: "Email inválido" };
      }

      const oldEmail = user.email.toLowerCase();
      if (newEmail === oldEmail) return { ok: true };

      // Collision con demo users (admin@, luri@, font@, cliente@, etc.)
      if (DEMO_USERS[newEmail]) {
        return { ok: false, error: "Este email ya está registrado" };
      }

      try {
        const registered = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, { password: string; user: User }>;

        if (registered[newEmail]) {
          return { ok: false, error: "Este email ya está registrado" };
        }

        const updated: User = { ...user, email: newEmail };

        // Mover (o crear) entrada en REGISTERED_KEY bajo el nuevo email
        if (registered[oldEmail]) {
          const entry = registered[oldEmail];
          delete registered[oldEmail];
          registered[newEmail] = { password: entry.password, user: updated };
        } else {
          // Demo user cambiando email → migrar a REGISTERED con el password
          // demo hasheado para preservar login. DEMO_USERS[oldEmail] no se
          // puede borrar (es const en memoria), pero el usuario ya no lo usa.
          const demo = DEMO_USERS[oldEmail];
          if (demo) {
            const hashedPw = await hashPassword(demo.password);
            registered[newEmail] = { password: hashedPw, user: updated };
          }
        }
        persistRegistered(registered);

        // Actualizar índice de usernames si aplica (username → email)
        if (user.username) {
          const index = loadUsernameIndex();
          const key = normalizeUsername(user.username);
          if (index[key] === oldEmail) {
            index[key] = newEmail;
            saveUsernameIndex(index);
          }
        }

        // Re-persistir sesión con nuevo email (regenera hash de integridad)
        persist(updated);

        return { ok: true };
      } catch {
        return { ok: false, error: "Error al cambiar el email" };
      }
    },
    [user, persist],
  );

  const toggleFavorite = useCallback(
    (productId: number) => {
      if (!user) return;
      const favorites = user.favorites.includes(productId)
        ? user.favorites.filter((id) => id !== productId)
        : [...user.favorites, productId];
      persist({ ...user, favorites });
    },
    [user, persist],
  );

  const mergeFavorites = useCallback(
    (productIds: number[]) => {
      if (!user || productIds.length === 0) return;
      const current = new Set(user.favorites);
      for (const id of productIds) current.add(id);
      const merged = Array.from(current);
      if (merged.length === user.favorites.length) return; // nada que añadir
      persist({ ...user, favorites: merged });
    },
    [user, persist],
  );

  const isFavorite = useCallback(
    (productId: number) => {
      return user?.favorites.includes(productId) ?? false;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        register,
        updateProfile,
        changePassword,
        changeEmail,
        checkUsernameAvailable,
        toggleFavorite,
        mergeFavorites,
        isFavorite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
