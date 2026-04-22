// @vitest-environment jsdom
//
// REGRESIÓN StrixHaven 2026-04-22 — flujo completo edición detalle → catálogo.
//
// Reproduce el bug reportado por el usuario literalmente 5-6 veces:
//   "cambio precio de 40 a 50, guardo, vuelvo a la categoría, sigue siendo 40"
//
// Cubre las dos rutas que alimentan la UI:
//   (A) `getMergedById/getMergedProducts` → catálogo/detalle/carrito/admin
//   (B) `computeEffectivePrice` → lo que `usePrice` devuelve a cada tarjeta
//
// Y la corrupción clásica: hay basura legacy en `tcgacademy_price_overrides`
// con un precio viejo. Antes del fix GOTCHA 4, esa basura ganaba al merged
// product y bloqueaba la edición. Después del fix, debe ser ignorada.

import { describe, it, expect, beforeEach } from "vitest";
import { getMergedById, getMergedByGameAndCategory } from "@/lib/productStore";
import { computeEffectivePrice } from "@/lib/priceEngine";
import { persistProductPatch } from "@/lib/productPersist";
import type { LocalProduct } from "@/data/products";
import { PRODUCTS } from "@/data/products";

const OVERRIDES_KEY = "tcgacademy_product_overrides";
const NEW_PRODUCTS_KEY = "tcgacademy_new_products";
const LEGACY_PRICE_OVERRIDES = "tcgacademy_price_overrides"; // canal zombie

// Wrapper de test que delega a la utility oficial.
function persistPatch(productId: number, patch: Partial<LocalProduct>) {
  persistProductPatch(productId, patch);
}

describe("SSOT — edición en detalle se propaga al catálogo", () => {
  // Producto real del catálogo para que getMergedById lo encuentre.
  const victim = PRODUCTS[0];

  beforeEach(() => {
    localStorage.clear();
  });

  it("tras persistPatch({price:50}), getMergedById devuelve price=50", () => {
    expect(victim.price).not.toBe(50); // asume precio base distinto
    persistPatch(victim.id, { price: 50 });
    const merged = getMergedById(victim.id);
    expect(merged).toBeDefined();
    expect(merged!.price).toBe(50);
  });

  it("el catálogo (getMergedByGameAndCategory) ve el nuevo precio", () => {
    persistPatch(victim.id, { price: 77.77 });
    const catalog = getMergedByGameAndCategory(victim.game, victim.category);
    const inCatalog = catalog.find((p) => p.id === victim.id);
    expect(inCatalog).toBeDefined();
    expect(inCatalog!.price).toBe(77.77);
  });

  it("múltiples patches sobre campos distintos se acumulan (merge, no replace)", () => {
    persistPatch(victim.id, { price: 50 });
    persistPatch(victim.id, { stock: 999, inStock: true });
    persistPatch(victim.id, { name: "Nombre Editado" });

    const merged = getMergedById(victim.id);
    expect(merged!.price).toBe(50);
    expect(merged!.stock).toBe(999);
    expect(merged!.inStock).toBe(true);
    expect(merged!.name).toBe("Nombre Editado");
    // Campos no tocados se preservan del estático:
    expect(merged!.slug).toBe(victim.slug);
    expect(merged!.game).toBe(victim.game);
  });

  it("patches sucesivos sobre el MISMO campo pisan el valor (último gana)", () => {
    persistPatch(victim.id, { price: 40 });
    persistPatch(victim.id, { price: 50 });
    persistPatch(victim.id, { price: 60 });
    expect(getMergedById(victim.id)!.price).toBe(60);
  });
});

describe("REGRESIÓN GOTCHA 4 — canal legacy tcgacademy_price_overrides no contamina", () => {
  const victim = PRODUCTS[0];

  beforeEach(() => {
    localStorage.clear();
  });

  it("computeEffectivePrice usa product.price aunque el canal legacy contenga basura vieja", () => {
    // Setup: basura legacy que ANTES del fix ganaba al merged.
    localStorage.setItem(
      LEGACY_PRICE_OVERRIDES,
      JSON.stringify({
        [victim.id]: { productId: victim.id, price: 40 }, // ← valor zombie
      }),
    );
    // Usuario edita a 50 desde el detalle:
    persistPatch(victim.id, { price: 50 });

    // El catálogo lee el merged y lo pasa a computeEffectivePrice:
    const merged = getMergedById(victim.id)!;
    const { displayPrice } = computeEffectivePrice(merged, "cliente", {});

    // ANTES del fix: displayPrice === 40 (bug reportado 5-6 veces).
    // DESPUÉS del fix: displayPrice === 50.
    expect(displayPrice).toBe(50);
  });

  it("computeEffectivePrice para admin también usa el merged, no el zombie", () => {
    localStorage.setItem(
      LEGACY_PRICE_OVERRIDES,
      JSON.stringify({ [victim.id]: { productId: victim.id, price: 40 } }),
    );
    persistPatch(victim.id, { price: 50 });
    const merged = getMergedById(victim.id)!;
    const { displayPrice } = computeEffectivePrice(merged, "admin", {});
    expect(displayPrice).toBe(50);
  });

  it("para mayorista usa wholesalePrice del merged, no el zombie", () => {
    localStorage.setItem(
      LEGACY_PRICE_OVERRIDES,
      JSON.stringify({
        [victim.id]: {
          productId: victim.id,
          wholesalePrice: 10,
        },
      }),
    );
    persistPatch(victim.id, { wholesalePrice: 25 });
    const merged = getMergedById(victim.id)!;
    const { displayPrice } = computeEffectivePrice(merged, "mayorista", {});
    expect(displayPrice).toBe(25);
  });
});

describe("REGRESIÓN StrixHaven 6ª iteración — producto admin-created persistido correctamente", () => {
  // StrixHaven real: id > 1.7e12 (Date.now()*1000 + rand), ruta /producto/<slug>.
  // Vive en `tcgacademy_new_products`, NO en PRODUCTS[]. getMergedProducts lo
  // lee directamente del array admin-created y NO aplica overrides a él.
  const adminCreatedVictim = {
    id: 1_750_000_000_001,
    slug: "caja-de-sobres-strixhaven",
    name: "Caja de sobres StrixHaven",
    description: "",
    price: 40,
    wholesalePrice: 30,
    storePrice: 35,
    costPrice: 25,
    comparePrice: undefined,
    stock: 10,
    inStock: true,
    images: [],
    game: "magic",
    category: "booster-box",
    language: "es",
    tags: [],
    createdAt: "2026-04-22",
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      NEW_PRODUCTS_KEY,
      JSON.stringify([adminCreatedVictim]),
    );
  });

  it("BUG reproducido: persistPatch({price:50}) sobre admin-created NO queda huérfano en overrides", () => {
    persistPatch(adminCreatedVictim.id, { price: 50 });

    // El precio DEBE verse en getMergedById, aunque el producto no sea estático.
    const merged = getMergedById(adminCreatedVictim.id);
    expect(merged).toBeDefined();
    expect(merged!.price).toBe(50);
  });

  it("persistPatch sobre admin-created actualiza el array newProducts, no overrides", () => {
    persistPatch(adminCreatedVictim.id, { price: 50 });

    // Lee directo del storage: el array newProducts debe tener el precio nuevo.
    const newProducts = JSON.parse(
      localStorage.getItem(NEW_PRODUCTS_KEY) ?? "[]",
    );
    expect(newProducts[0].price).toBe(50);

    // Y overrides NO debe contener basura huérfana con ese id.
    const overrides = JSON.parse(
      localStorage.getItem(OVERRIDES_KEY) ?? "{}",
    );
    expect(overrides[String(adminCreatedVictim.id)]).toBeUndefined();
  });

  it("múltiples patches sobre admin-created se acumulan (merge, no replace)", () => {
    persistPatch(adminCreatedVictim.id, { price: 50 });
    persistPatch(adminCreatedVictim.id, { stock: 999, inStock: true });
    persistPatch(adminCreatedVictim.id, { name: "Nombre Editado" });

    const merged = getMergedById(adminCreatedVictim.id);
    expect(merged!.price).toBe(50);
    expect(merged!.stock).toBe(999);
    expect(merged!.inStock).toBe(true);
    expect(merged!.name).toBe("Nombre Editado");
    // Campos no tocados se preservan:
    expect(merged!.slug).toBe(adminCreatedVictim.slug);
    expect(merged!.game).toBe("magic");
  });

  it("flujo E2E StrixHaven: edito 40→50, navego, vuelvo → sigue 50", () => {
    persistPatch(adminCreatedVictim.id, { price: 50 });
    expect(getMergedById(adminCreatedVictim.id)!.price).toBe(50);

    // Pasada defensiva de handleSave con todos los inline* actuales.
    persistPatch(adminCreatedVictim.id, {
      price: 50,
      name: adminCreatedVictim.name,
      description: adminCreatedVictim.description,
    });
    expect(getMergedById(adminCreatedVictim.id)!.price).toBe(50);

    // Lectura fresca desde cero (simula remount): sigue 50.
    const merged = getMergedById(adminCreatedVictim.id);
    expect(merged!.price).toBe(50);
  });
});

describe("Flujo end-to-end: edición repetida NO regresiona al valor original", () => {
  const victim = PRODUCTS[0];

  beforeEach(() => {
    localStorage.clear();
  });

  it("simula: edito 40→50, guardo, navego, vuelvo, vuelvo a entrar → sigue 50", () => {
    // Estado inicial: no hay overrides. El catálogo muestra el precio base.
    const baseline = getMergedById(victim.id)!.price;
    expect(baseline).toBe(victim.price);

    // Usuario entra en el detalle, pulsa Editar, cambia a 50, pulsa Guardar.
    persistPatch(victim.id, { price: 50 });
    expect(getMergedById(victim.id)!.price).toBe(50);

    // Navega a la categoría.
    const cat1 = getMergedByGameAndCategory(victim.game, victim.category);
    expect(cat1.find((p) => p.id === victim.id)!.price).toBe(50);

    // Vuelve al detalle (otra lectura fresca).
    expect(getMergedById(victim.id)!.price).toBe(50);

    // Pulsa Editar de nuevo — `handleSave` hace pasada defensiva con TODOS
    // los inline* (incluye price=50 actual). NO debe regresar a 40.
    persistPatch(victim.id, {
      price: 50,
      name: victim.name,
      description: victim.description,
    });
    expect(getMergedById(victim.id)!.price).toBe(50);

    // Lee por slug desde el catálogo otra vez.
    const cat2 = getMergedByGameAndCategory(victim.game, victim.category);
    expect(cat2.find((p) => p.id === victim.id)!.price).toBe(50);
  });
});
