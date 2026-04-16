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
import { ensureReferralCode, registerWithReferral } from "@/services/pointsService";
import { sanitizeString } from "@/utils/sanitize";

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (
    emailOrUsername: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (
    updates: Partial<Pick<User, "name" | "lastName" | "phone">>,
  ) => void;
  checkUsernameAvailable: (username: string) => boolean;
  toggleFavorite: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "tcgacademy_user";
const REGISTERED_KEY = "tcgacademy_registered";
const USERNAMES_KEY = "tcgacademy_usernames"; // username (lowercase) → email
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

// ─── Crypto helpers ───────────────────────────────────────────────────────────
// Salts are client-side only (static export). They prevent casual localStorage
// tampering but are not a substitute for server-side session management.
const SESSION_HASH_SALT = "tcga-2025-session-v1";
const PASSWORD_HASH_SALT = "tcga-2025-pwd-v1";

async function sha256hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash a password for storage — used for registered (non-demo) users */
export async function hashPassword(pw: string): Promise<string> {
  return sha256hex(PASSWORD_HASH_SALT + pw);
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
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "cliente@test.com": {
    password: "test123",
    user: {
      id: "demo-cliente",
      email: "cliente@test.com",
      name: "Maria",
      lastName: "Garcia",
      phone: "+34 666 111 111",
      role: "cliente",
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
      addresses: [],
      favorites: [],
      empresa: {
        cif: "B12345678",
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
      id: "demo-admin",
      email: "admin@tcgacademy.es",
      name: "Admin",
      lastName: "TCG",
      phone: "+34 666 000 000",
      role: "admin" as const,
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
      addresses: [],
      favorites: [],
      empresa: {
        cif: "B98765432",
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage — expire after 24h, verify integrity hash
  useEffect(() => {
    const verify = async () => {
      try {
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

          setUser(parsed);
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
          const hashed = await hashPassword(password);
          const matches =
            entry.password === hashed || entry.password === password;
          if (matches) {
            if (entry.password === password) {
              entry.password = hashed;
              localStorage.setItem(REGISTERED_KEY, JSON.stringify(registered));
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

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  const register = useCallback(
    async (data: RegisterData): Promise<{ ok: boolean; error?: string }> => {
      const email = data.email.toLowerCase();
      const username = data.username ? normalizeUsername(data.username) : undefined;

      if (DEMO_USERS[email])
        return { ok: false, error: "Este email ya está registrado" };

      try {
        const registered = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, unknown>;
        if (registered[email])
          return { ok: false, error: "Este email ya está registrado" };

        // Check username uniqueness
        if (username) {
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
        const newUser: User = {
          id: newUserId,
          email,
          ...(sanitizedUsername ? { username: sanitizedUsername } : {}),
          name: sanitizedName,
          lastName: sanitizedLastName,
          phone: sanitizedPhone,
          role: "cliente",
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
          const refResult = registerWithReferral(newUserId, data.referralCode);
          if (refResult.ok) newUser.referredBy = data.referralCode;
        }

        const hashedPw = await hashPassword(data.password);
        registered[email] = { password: hashedPw, user: newUser };
        localStorage.setItem(REGISTERED_KEY, JSON.stringify(registered));

        // Register username in the index
        if (username) {
          const index = loadUsernameIndex();
          index[username] = email;
          saveUsernameIndex(index);
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
    const index = loadUsernameIndex();
    return !index[key];
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Pick<User, "name" | "lastName" | "phone">>) => {
      if (!user) return;
      const sanitizedUpdates: Partial<Pick<User, "name" | "lastName" | "phone">> = {};
      if (updates.name !== undefined) sanitizedUpdates.name = sanitizeString(updates.name);
      if (updates.lastName !== undefined) sanitizedUpdates.lastName = sanitizeString(updates.lastName);
      if (updates.phone !== undefined) sanitizedUpdates.phone = sanitizeString(updates.phone);
      const updated = { ...user, ...sanitizedUpdates };
      persist(updated);
      // Also update in registered store if applicable
      try {
        const registered = JSON.parse(
          localStorage.getItem("tcgacademy_registered") ?? "{}",
        ) as Record<string, { password: string; user: User }>;
        if (registered[user.email]) {
          registered[user.email].user = updated;
          localStorage.setItem(
            "tcgacademy_registered",
            JSON.stringify(registered),
          );
        }
      } catch {
        /* ignore */
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
        logout,
        register,
        updateProfile,
        checkUsernameAvailable,
        toggleFavorite,
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
