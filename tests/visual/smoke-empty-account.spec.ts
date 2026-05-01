/**
 * Smoke e2e — un usuario real recién registrado NO debe ver datos demo.
 *
 * Complementa los tests estáticos 36/37/38 (que verifican código fuente):
 * estos comprueban el RESULTADO renderizado en navegador.
 *
 * Si en el futuro alguien re-introduce un mock que se filtra a /cuenta/*,
 * este test lo caza aunque el grep estático no lo detecte (p.ej. mock
 * inyectado vía servicio o RSC con shape distinto al import directo).
 *
 * Pre-requisito: servidor corriendo en :3000 (`npm run build && npm start`).
 *
 * Estrategia:
 *   1. Inyectar un usuario "real" nuevo en localStorage antes de cargar
 *      (id NO empieza con "demo-", emailVerified true, sin pedidos).
 *   2. Navegar a cada página privada de /cuenta/*.
 *   3. Verificar que el HTML no contiene marcadores típicos de mocks
 *      previamente eliminados.
 */
import { test, expect } from "@playwright/test"

// Marcadores de los datos mock que la Fase 3 eliminó. Si reaparecen en
// /cuenta/* es regresión. Lista CONSERVADORA — se puede ampliar.
const MOCK_LEAK_MARKERS = [
  // IDs de pedidos demo (formato TCG-YYYYMMDD-NNN antiguos)
  "TCG-20250128",
  "TCG-20241",
  "TCG-20250",
  // Notificaciones demo típicas
  "TCG Academy Tournament",
  "Tournament Madrid",
  // Nombres genéricos de productos seed
  "Pikachu VMAX (mock)",
  "Black Lotus (demo)",
]

const PRIVATE_ROUTES = [
  "/cuenta",
  "/cuenta/pedidos",
  "/cuenta/facturas",
  "/cuenta/cupones",
  "/cuenta/devoluciones",
  "/cuenta/mensajes",
  "/cuenta/notificaciones",
]

test.describe("smoke — cuenta real sin datos no ve mocks", () => {
  test.beforeEach(async ({ context }) => {
    // Inyectar un usuario real nuevo antes de cargar cualquier página.
    // El id "usr_smoke_*" no matchea el gate isDemoUser (startsWith "demo-")
    // ni ningún MOCK_USERS legacy.
    await context.addInitScript(() => {
      const now = Date.now()
      const fakeUser = {
        id: `usr_smoke_${now}`,
        email: `smoke_${now}@example.test`,
        name: "Smoke",
        lastName: "Test",
        username: `smoke${now}`,
        role: "cliente" as const,
        nif: "00000000T",
        nifType: "DNI" as const,
        phone: "+34 000 000 000",
        addresses: [],
        favorites: [],
        createdAt: new Date().toISOString(),
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        _loginAt: now,
        _loginExpiresAt: now + 24 * 60 * 60 * 1000,
      }
      try {
        localStorage.setItem("tcgacademy_user", JSON.stringify(fakeUser))
      } catch {
        /* SecurityError en algunos navegadores headless — se ignora */
      }
    })
  })

  for (const route of PRIVATE_ROUTES) {
    test(`${route} sin marcadores de mock leak`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))

      await page.goto(route, { waitUntil: "domcontentloaded" })
      // Esperar a que la hidratación cliente termine de pintar.
      await page.waitForTimeout(800)

      const html = (await page.content()).toLowerCase()
      for (const marker of MOCK_LEAK_MARKERS) {
        expect(
          html.includes(marker.toLowerCase()),
          `${route} contiene marker de mock leak: "${marker}"`,
        ).toBe(false)
      }

      // No errores de consola JS — los crashes en /cuenta/* tras login
      // limpio son señal de un mock-data crash (caso real 2026-04-30).
      expect(errors, `${route} lanzó errores: ${errors.join(" | ")}`).toEqual([])
    })
  }
})
