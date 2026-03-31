"use client"
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User, UserRole, RegisterData } from "@/types/user"

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>
  updateProfile: (updates: Partial<Pick<User, "name" | "lastName" | "phone">>) => void
  toggleFavorite: (productId: number) => void
  isFavorite: (productId: number) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = "tcgacademy_user"

// ─── Demo users (client-side simulation) ─────────────────────────────────────
// In a real backend these would be server-verified. For the static demo, we
// pre-seed three role accounts so the buyer experience can be shown end-to-end.
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "cliente@demo.com": {
    password: "demo123",
    user: {
      id: "demo-cliente",
      email: "cliente@demo.com",
      name: "Maria",
      lastName: "Garcia",
      phone: "+34 666 111 111",
      role: "cliente",
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
    },
  },
  "mayorista@demo.com": {
    password: "demo123",
    user: {
      id: "demo-mayorista",
      email: "mayorista@demo.com",
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
  "admin@tcgacademy.com": {
    password: "admin123",
    user: {
      id: "demo-admin",
      email: "admin@tcgacademy.com",
      name: "Admin",
      lastName: "TCG",
      phone: "+34 666 000 000",
      role: "admin" as const,
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
    },
  },
  "tienda@demo.com": {
    password: "demo123",
    user: {
      id: "demo-tienda",
      email: "tienda@demo.com",
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
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Rehydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored) as User)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  const persist = useCallback((u: User | null) => {
    setUser(u)
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      // Try demo users first
      const demo = DEMO_USERS[email.toLowerCase()]
      if (demo && demo.password === password) {
        persist(demo.user)
        return { ok: true }
      }
      // Try stored registered users
      try {
        const registered = JSON.parse(localStorage.getItem("tcgacademy_registered") ?? "{}") as Record<
          string,
          { password: string; user: User }
        >
        const entry = registered[email.toLowerCase()]
        if (entry && entry.password === password) {
          persist(entry.user)
          return { ok: true }
        }
      } catch { /* ignore */ }
      return { ok: false, error: "Email o contraseña incorrectos" }
    },
    [persist]
  )

  const logout = useCallback(() => {
    persist(null)
  }, [persist])

  const register = useCallback(
    async (data: RegisterData): Promise<{ ok: boolean; error?: string }> => {
      const email = data.email.toLowerCase()
      if (DEMO_USERS[email]) return { ok: false, error: "Este email ya esta registrado" }
      try {
        const registered = JSON.parse(localStorage.getItem("tcgacademy_registered") ?? "{}") as Record<string, unknown>
        if (registered[email]) return { ok: false, error: "Este email ya esta registrado" }
        const newUser: User = {
          id: `user-${Date.now()}`,
          email,
          name: data.name,
          lastName: data.lastName,
          phone: data.phone,
          role: "cliente",
          addresses: [
            {
              id: `addr-${Date.now()}`,
              label: "Principal",
              ...data.address,
              predeterminada: true,
            },
          ],
          favorites: [],
          createdAt: new Date().toISOString(),
        }
        registered[email] = { password: data.password, user: newUser }
        localStorage.setItem("tcgacademy_registered", JSON.stringify(registered))
        persist(newUser)
        return { ok: true }
      } catch {
        return { ok: false, error: "Error al crear la cuenta. Intentalo de nuevo." }
      }
    },
    [persist]
  )

  const updateProfile = useCallback(
    (updates: Partial<Pick<User, "name" | "lastName" | "phone">>) => {
      if (!user) return
      const updated = { ...user, ...updates }
      persist(updated)
      // Also update in registered store if applicable
      try {
        const registered = JSON.parse(localStorage.getItem("tcgacademy_registered") ?? "{}") as Record<
          string,
          { password: string; user: User }
        >
        if (registered[user.email]) {
          registered[user.email].user = updated
          localStorage.setItem("tcgacademy_registered", JSON.stringify(registered))
        }
      } catch { /* ignore */ }
    },
    [user, persist]
  )

  const toggleFavorite = useCallback(
    (productId: number) => {
      if (!user) return
      const favorites = user.favorites.includes(productId)
        ? user.favorites.filter((id) => id !== productId)
        : [...user.favorites, productId]
      const updated = { ...user, favorites }
      persist(updated)
    },
    [user, persist]
  )

  const isFavorite = useCallback(
    (productId: number) => {
      return user?.favorites.includes(productId) ?? false
    },
    [user]
  )

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
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
