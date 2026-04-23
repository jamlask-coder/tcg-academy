/**
 * Flujo de verificación de email.
 *
 * En local mode (default) todo vive en localStorage:
 *   - Al registrarse se genera token crypto-random (32 bytes hex).
 *   - Se guarda solo el hash SHA-256 en `tcgacademy_email_verification`.
 *   - Email "verificar_email" se envía vía `getEmailService()` (LocalAdapter
 *     lo loggea, ResendAdapter lo envía de verdad).
 *   - El usuario abre `/verificar-email?token=XXX&email=YYY`.
 *   - Se hashea el token, se compara, si coincide → `emailVerified = true`.
 *
 * En server mode, estos helpers siguen funcionando en el cliente para la UX
 * (hash, comparaciones), pero la persistencia real pasa por `/api/auth`
 * contra Supabase.
 *
 * Feature flag `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true` bloquea el
 * login si el email no está verificado. Por defecto false (solo muestra un
 * banner informativo en /cuenta). Se puede cambiar sin redeploy.
 */

const STORAGE_KEY = "tcgacademy_email_verification";
const REGISTERED_KEY = "tcgacademy_registered";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

interface StoredTokenRecord {
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

type VerificationStore = Record<string, StoredTokenRecord>; // email → record

export function isEmailVerificationRequired(): boolean {
  return process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED === "true";
}

function loadStore(): VerificationStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as VerificationStore;
  } catch {
    return {};
  }
}

function saveStore(store: VerificationStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Hash SHA-256 hex — identical shape to password reset tokens. */
export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Genera un token crypto-random de 32 bytes codificado en hex. */
export function generateRawToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Crea y guarda un token de verificación para un email. Devuelve el token
 * en claro, que debe enviarse por email (nunca se persiste en claro).
 */
export async function issueVerificationToken(email: string): Promise<string> {
  const rawToken = generateRawToken();
  const tokenHash = await hashToken(rawToken);
  const now = new Date();
  const record: StoredTokenRecord = {
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
  };
  const store = loadStore();
  store[email.toLowerCase()] = record;
  saveStore(store);
  return rawToken;
}

export interface ConsumeTokenResult {
  ok: boolean;
  reason?: "missing" | "expired" | "mismatch";
}

/**
 * Consume el token: valida, marca usuario como verificado, limpia store.
 * Idempotente: si el usuario ya está verificado, devuelve ok=true.
 */
export async function consumeVerificationToken(
  email: string,
  rawToken: string,
): Promise<ConsumeTokenResult> {
  const cleanEmail = email.toLowerCase();

  // Idempotencia: si el usuario ya aparece como verificado, ok.
  if (typeof window !== "undefined") {
    try {
      const registered = JSON.parse(
        localStorage.getItem(REGISTERED_KEY) ?? "{}",
      ) as Record<string, { user: { emailVerified?: boolean } }>;
      const entry = registered[cleanEmail];
      if (entry?.user?.emailVerified) return { ok: true };
    } catch {
      /* fall through */
    }
  }

  const store = loadStore();
  const record = store[cleanEmail];
  if (!record) return { ok: false, reason: "missing" };
  if (new Date(record.expiresAt) < new Date()) {
    return { ok: false, reason: "expired" };
  }
  const incomingHash = await hashToken(rawToken);
  if (incomingHash !== record.tokenHash) {
    return { ok: false, reason: "mismatch" };
  }

  // Marca al usuario como verificado en el registro local.
  if (typeof window !== "undefined") {
    try {
      const registered = JSON.parse(
        localStorage.getItem(REGISTERED_KEY) ?? "{}",
      ) as Record<
        string,
        { password: string; user: Record<string, unknown> }
      >;
      const entry = registered[cleanEmail];
      if (entry) {
        entry.user.emailVerified = true;
        entry.user.emailVerifiedAt = new Date().toISOString();
        localStorage.setItem(REGISTERED_KEY, JSON.stringify(registered));
      }
    } catch {
      /* ignore */
    }
  }

  // Token consumido → eliminar.
  delete store[cleanEmail];
  saveStore(store);

  return { ok: true };
}

export function hasPendingVerification(email: string): boolean {
  const store = loadStore();
  const record = store[email.toLowerCase()];
  if (!record) return false;
  return new Date(record.expiresAt) >= new Date();
}
