// @vitest-environment jsdom
//
// REPRODUCCIÓN REAL (no simulada) del bug StrixHaven 2026-04-22.
//
// El usuario reporta —literalmente 5-6 veces— que:
//   1) Entra al detalle de un producto con precio 40 €.
//   2) Pulsa "Editar", cambia 40 → 50, pulsa "Guardar".
//   3) Navega de vuelta a la categoría.
//   4) Vuelve a entrar al detalle.
//   5) Ve 40 € otra vez.
//
// Los tests a nivel de `productStore` (persistPatch.test.ts) pasan en verde
// pero el usuario sigue viendo el bug. Este test monta el COMPONENTE REAL
// `ProductDetailClient` con React Testing Library para capturar si el bug
// está en la capa React (hidratación, one-shot sync effect, refs, etc.) y
// NO en la capa de almacenamiento.
//
// Estrategia:
//   - Mockeamos los hooks de contexto (AuthContext/CartContext/FavoritesContext/
//     DiscountContext) y las sub-componentes pesadas (SetHighlightCards,
//     RecentlyViewedSection, LocalProductCard, HoloCard, ShareButtons,
//     ConfirmationModal, LanguageFlag, DiscountBadgeEdit) para aislar la
//     lógica de ProductDetailClient.
//   - Mantenemos REAL: `getMergedById`/`getMergedProducts` (productStore),
//     `usePrice` usa el DiscountContext mockeado con computeEffectivePrice real,
//     `InlineEdit` (es parte del flujo de edición),
//     `ProductDetailClient` en sí.
//
// Si alguno de los 3 CASOS falla → tenemos reproducción del bug.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Util — el JSX `{price.toFixed(2)}€` se separa en 2 text nodes ("50.00" + "€").
// Esta función busca elementos cuyo textContent concatenado iguale la target.
function priceMatcher(target: string) {
  return (_content: string, node: Element | null): boolean => {
    if (!node) return false;
    const text = (node.textContent ?? "").replace(/\s+/g, "").trim();
    return text === target;
  };
}

function queryAllByPrice(target: string) {
  const all = Array.from(document.querySelectorAll<Element>("*"));
  return all.filter((el) => {
    const text = (el.textContent ?? "").replace(/\s+/g, "").trim();
    // Sólo aceptamos nodos "hoja" o cuya concatenación sea exactamente el target,
    // para evitar matchear el <body> entero.
    if (text !== target) return false;
    // Chequea que NO tenga hijos con el mismo texto (para quedarnos con el más profundo).
    for (const child of Array.from(el.children)) {
      const childText = (child.textContent ?? "").replace(/\s+/g, "").trim();
      if (childText === target) return false;
    }
    return true;
  });
}

function expectPriceVisible(target: string) {
  const found = queryAllByPrice(target);
  if (found.length === 0) {
    throw new Error(`No DOM element has textContent === "${target}"`);
  }
}

function expectPriceNotVisible(target: string) {
  const found = queryAllByPrice(target);
  if (found.length !== 0) {
    throw new Error(
      `Expected NO element with textContent === "${target}", found ${found.length}`,
    );
  }
}

// Silencia el warning de priceMatcher no usado en algunos paths.
void priceMatcher;

import { PRODUCTS, GAME_CONFIG, type LocalProduct } from "@/data/products";
import { computeEffectivePrice } from "@/lib/priceEngine";

// ── Mocks de contextos ────────────────────────────────────────────────────────

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, email: "admin@test", role: "admin", name: "Admin" },
    role: "admin",
  }),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items: [],
    addItem: vi.fn().mockReturnValue({ added: true }),
    removeItem: vi.fn(),
    updateQty: vi.fn(),
  }),
}));

vi.mock("@/context/FavoritesContext", () => ({
  useFavorites: () => ({
    toggle: vi.fn(),
    isFavorite: () => false,
  }),
}));

vi.mock("@/context/DiscountContext", () => ({
  useDiscounts: () => ({
    discounts: {},
    priceOverrides: {},
    getEffectivePrice: (p: LocalProduct, role: "cliente" | "mayorista" | "tienda" | "admin" | null) =>
      computeEffectivePrice(p, role, {}),
  }),
}));

// ── Mocks de navegación Next.js ───────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) => {
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    return <a href={href} {...rest}>{children}</a>;
  },
}));

// ── Mocks de sub-componentes pesados ──────────────────────────────────────────

vi.mock("@/components/product/SetHighlightCards", () => ({
  SetHighlightCards: () => null,
}));

vi.mock("@/components/product/RecentlyViewedSection", () => ({
  RecentlyViewedSection: () => null,
}));

vi.mock("@/components/product/LocalProductCard", () => ({
  LocalProductCard: () => null,
}));

vi.mock("@/components/product/HoloCard", () => ({
  HoloCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/ShareButtons", () => ({
  ShareButtons: () => null,
}));

vi.mock("@/components/ui/ConfirmationModal", () => ({
  ConfirmationModal: () => null,
}));

vi.mock("@/components/ui/LanguageFlag", () => ({
  LanguageFlag: () => null,
}));

vi.mock("@/components/ui/DiscountBadgeEdit", () => ({
  DiscountBadgeEdit: () => null,
}));

vi.mock("@/services/restockService", () => ({
  subscribeRestock: vi.fn(),
  isSubscribed: () => false,
  triggerRestockEmails: () => ({ sent: 0 }),
  getSubsForProduct: () => [],
}));

vi.mock("@/lib/recentlyViewed", () => ({
  addToRecentlyViewed: vi.fn(),
}));

// ── Import del componente REAL después de los mocks ───────────────────────────

import { ProductDetailClient } from "@/components/product/ProductDetailClient";

const OVERRIDES_KEY = "tcgacademy_product_overrides";

/** Producto víctima: primer booster-box de Magic REAL del array PRODUCTS.
 *  Usamos sus precios reales porque `getMergedById` lee siempre del PRODUCTS
 *  estático — cualquier mutación en-memoria que hagamos aquí será ignorada
 *  por la capa de hidratación del componente.
 *
 *  Para el bug StrixHaven, las dos cifras de interés son:
 *    · `baseline` = victim.price (lo que pinta el detalle SIN overrides)
 *    · `edited`   = 77.77 (lo que el admin guarda vía persistPatch)
 */
function makeVictim(): LocalProduct {
  const real = PRODUCTS.find((p) => p.category === "booster-box" && p.game === "magic");
  if (!real) throw new Error("No booster-box Magic en PRODUCTS");
  return real;
}

/** Formatea un número como lo hace el componente: `${n.toFixed(2)}€`. */
function fmt(n: number): string {
  return `${n.toFixed(2)}€`;
}

function renderDetail(victim: LocalProduct) {
  const gameCfg = GAME_CONFIG[victim.game] ?? {
    name: victim.game,
    color: "#000",
    bgColor: "#fff",
    description: "",
    emoji: "?",
  };
  return render(
    <ProductDetailClient
      product={victim}
      config={gameCfg}
      catLabel="Booster Box"
    />,
  );
}

describe("ProductDetailClient — bug StrixHaven (reproducción real)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("CASO A — override presente ANTES del mount → pinta precio editado, no el base", async () => {
    const victim = makeVictim();
    const baseline = victim.price;   // lo que hay en PRODUCTS estático
    const edited = 50;               // lo que el admin ya guardó

    // Simula: admin ya guardó `edited` en sesión anterior y ahora vuelve a entrar.
    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify({ [victim.id]: { price: edited } }),
    );

    renderDetail(victim);

    // El useEffect de hidratación debe correr y poblar inlinePrice = edited.
    await waitFor(
      () => {
        expectPriceVisible(fmt(edited));
      },
      { timeout: 2000 },
    );

    // No debería haber ningún precio base visible (si baseline !== edited).
    if (baseline !== edited) {
      expectPriceNotVisible(fmt(baseline));
    }
  });

  it("CASO B — edición dentro del componente (baseline → edited con commit en blur)", async () => {
    const victim = makeVictim();
    const baseline = victim.price;
    const edited = 77.77; // valor distinto a cualquier precio base

    renderDetail(victim);

    // Estado inicial: precio baseline visible.
    await waitFor(() => {
      expectPriceVisible(fmt(baseline));
    });

    // Activar editMode pulsando el botón "Editar" global. Hay varios botones
    // con title="Editar" (InlineEdit de cada campo), pero el TOGGLE global
    // es un <button> con texto visible "Editar" / "Editando…". Lo buscamos
    // priorizando el que tenga texto visible exactamente "Editar".
    const allEditar = screen.queryAllByRole("button", { name: /editar/i });
    const toggleBtn =
      allEditar.find((b) => (b.textContent ?? "").trim() === "Editar") ??
      allEditar[0];
    if (toggleBtn) {
      await act(async () => {
        fireEvent.click(toggleBtn);
      });
    }

    // Localiza el input PV Público del AdminPriceRow. Como AdminPriceRow
    // usa <input type="number" value="{baseline.toFixed(2)}" ...>, lo
    // buscamos por su valor inicial `baseline.toFixed(2)`.
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="number"]');
    const baselineStr = baseline.toFixed(2);
    const priceInput = Array.from(inputs).find((el) => el.value === baselineStr);

    if (!priceInput) {
      // No pudimos aislar el input del admin por UI → escribimos directo via
      // persistPatch simulado (que es lo que hace handleSave de todas formas).
      // Esto cae al equivalente del test ya existente productStore.persistPatch.
      // Marcamos el caso como SKIP-UI y seguimos con verificación de storage.
      // Pero para ser honestos con la orden del usuario, fallamos el test para
      // no dar falso verde.
      expect(priceInput, "no se localizó input de PV Público en edit mode (UI)").toBeTruthy();
      return;
    }

    // Simula: focus, cambio a `edited`, blur → commit.
    await act(async () => {
      fireEvent.focus(priceInput);
      fireEvent.change(priceInput, { target: { value: String(edited) } });
      fireEvent.blur(priceInput);
    });

    // 1) localStorage debe tener el override con price = edited.
    const raw = localStorage.getItem(OVERRIDES_KEY);
    expect(raw, "persistPatch no escribió override tras blur").toBeTruthy();
    const parsed = JSON.parse(raw!) as Record<string, { price?: number }>;
    expect(parsed[String(victim.id)]?.price).toBe(edited);

    // 2) El big PV Público debe haberse re-renderizado a `edited`.
    await waitFor(() => {
      expectPriceVisible(fmt(edited));
    });
  });

  it("CASO C — remount tras navegación sigue mostrando precio editado (el bug reportado)", async () => {
    const victim = makeVictim();
    const baseline = victim.price;
    const edited = 123.45; // inequívocamente distinto del baseline

    // Primer mount: sin overrides → precio baseline.
    const { unmount } = renderDetail(victim);
    await waitFor(() => {
      expectPriceVisible(fmt(baseline));
    });

    // Escribe override como lo hace persistPatch dentro del componente
    // (equivale al save del admin: 40 → 50 en el caso StrixHaven original).
    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify({ [victim.id]: { price: edited } }),
    );
    await act(async () => {
      window.dispatchEvent(new Event("tcga:products:updated"));
    });

    // Unmount (equivale a navegar fuera del detalle).
    unmount();

    // Segundo mount: mismo initialProduct ESTÁTICO (price baseline). El
    // Server Component pasaría `victim` con precio base; el componente
    // debe hidratar desde localStorage y mostrar `edited`, nunca baseline.
    renderDetail(victim);

    // Tras la hidratación (useEffect en líneas 331-345 + sync one-shot en
    // 434-449), inlinePrice DEBE ser `edited` porque el merged ya lo contiene.
    await waitFor(
      () => {
        expectPriceVisible(fmt(edited));
      },
      { timeout: 2000 },
    );

    // Y no debería quedar ningún baseline pintado.
    if (baseline !== edited) {
      expectPriceNotVisible(fmt(baseline));
    }
  });
});
