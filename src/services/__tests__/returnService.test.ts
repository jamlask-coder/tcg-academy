import { beforeEach, describe, expect, it } from "vitest";
import {
  isWithinReturnWindow,
  createReturnRequest,
  updateReturnStatus,
  getReturns,
  getReturnById,
  restoreStockForReturn,
  getReturnStats,
  type ReturnItem,
} from "@/services/returnService";

// Minimal localStorage + window shim for node test env.
// The service only uses getItem/setItem/removeItem and `typeof window !== "undefined"`.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? (this.store.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
}

const storage = new MemoryStorage();
// Some of these globals may already exist (node 19+ has crypto) — we only set what's missing.
(globalThis as unknown as { window: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = storage;

function sampleItems(): ReturnItem[] {
  return [
    {
      productId: 101,
      productName: "Booster Box Magic",
      quantity: 1,
      unitPrice: 120,
      reason: "defectuoso",
    },
    {
      productId: 202,
      productName: "Sleeves",
      quantity: 2,
      unitPrice: 5,
      reason: "no_deseado",
    },
  ];
}

beforeEach(() => {
  storage.clear();
});

// ─── isWithinReturnWindow ───────────────────────────────────────────────────

describe("returnService — isWithinReturnWindow (14 días)", () => {
  it("pedido de hoy está dentro de la ventana", () => {
    expect(isWithinReturnWindow(new Date().toISOString())).toBe(true);
  });

  it("pedido de hace 13 días sigue dentro", () => {
    const d = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    expect(isWithinReturnWindow(d.toISOString())).toBe(true);
  });

  it("pedido de hace 15 días está fuera", () => {
    const d = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(isWithinReturnWindow(d.toISOString())).toBe(false);
  });
});

// ─── createReturnRequest ────────────────────────────────────────────────────

describe("returnService — createReturnRequest", () => {
  it("calcula total refundable sumando unitPrice * quantity", () => {
    const rma = createReturnRequest(
      "ORD-1",
      "user-1",
      "cliente@example.com",
      "Cliente Ejemplo",
      sampleItems(),
    );
    expect(rma.totalRefundAmount).toBe(130); // 120 + 5*2
  });

  it("genera RMA id con formato RMA-YYMMDD-XXXX", () => {
    const rma = createReturnRequest(
      "ORD-1",
      "user-1",
      "c@e.com",
      "Cliente",
      sampleItems(),
    );
    expect(rma.id).toMatch(/^RMA-\d{6}-[A-Z0-9]{1,4}$/);
  });

  it("estado inicial 'solicitada' + entrada en statusHistory", () => {
    const rma = createReturnRequest("ORD-1", "u", "c@e.com", "C", sampleItems());
    expect(rma.status).toBe("solicitada");
    expect(rma.statusHistory).toHaveLength(1);
    expect(rma.statusHistory[0].status).toBe("solicitada");
  });

  it("persiste y se puede recuperar con getReturns", () => {
    createReturnRequest("ORD-1", "u1", "a@e.com", "A", sampleItems());
    createReturnRequest("ORD-2", "u2", "b@e.com", "B", sampleItems());
    const all = getReturns();
    expect(all).toHaveLength(2);
  });
});

// ─── updateReturnStatus ─────────────────────────────────────────────────────

describe("returnService — updateReturnStatus", () => {
  it("transición solicitada → aprobada añade entrada al historial", async () => {
    const rma = createReturnRequest("ORD-1", "u", "c@e.com", "C", sampleItems());
    const updated = await updateReturnStatus(rma.id, "aprobada", "Aprobada por admin");
    expect(updated?.status).toBe("aprobada");
    expect(updated?.statusHistory).toHaveLength(2);
    expect(updated?.statusHistory[1].note).toBe("Aprobada por admin");
  });

  it("admite extras: tracking y adminNotes", async () => {
    const rma = createReturnRequest("ORD-1", "u", "c@e.com", "C", sampleItems());
    const updated = await updateReturnStatus(rma.id, "en_transito", undefined, {
      trackingNumber: "TRK-999",
      adminNotes: "OK",
    });
    expect(updated?.trackingNumber).toBe("TRK-999");
    expect(updated?.adminNotes).toBe("OK");
  });

  it("RMA id inexistente devuelve null", async () => {
    expect(await updateReturnStatus("RMA-404", "aprobada")).toBeNull();
  });
});

// ─── getReturns con filtros ─────────────────────────────────────────────────

describe("returnService — getReturns con filtros", () => {
  it("filtra por status, orderId y customerId", async () => {
    const a = createReturnRequest("ORD-1", "u1", "a@e.com", "A", sampleItems());
    createReturnRequest("ORD-2", "u2", "b@e.com", "B", sampleItems());
    await updateReturnStatus(a.id, "aprobada");

    expect(getReturns({ status: "aprobada" })).toHaveLength(1);
    expect(getReturns({ orderId: "ORD-2" })).toHaveLength(1);
    expect(getReturns({ customerId: "u1" })).toHaveLength(1);
    expect(getReturns({ status: "rechazada" })).toHaveLength(0);
  });

  it("getReturnById devuelve null si no existe", () => {
    expect(getReturnById("RMA-NOPE")).toBeNull();
  });
});

// ─── restoreStockForReturn ──────────────────────────────────────────────────

describe("returnService — restoreStockForReturn", () => {
  it("incrementa stock de producto admin-created y marca inStock=true", () => {
    const items = sampleItems();
    // Productos admin-created (ids > 1.7e12 en prod; aquí usamos 101/202 que
    // persistProductPatch detecta como admin-created por estar en new_products).
    storage.setItem(
      "tcgacademy_new_products",
      JSON.stringify([
        { id: 101, name: "Booster Box Magic", stock: 3, inStock: false },
        { id: 202, name: "Sleeves", stock: 0, inStock: false },
      ]),
    );

    restoreStockForReturn(items);

    const newProducts = JSON.parse(
      storage.getItem("tcgacademy_new_products") as string,
    );
    const p101 = newProducts.find((p: { id: number }) => p.id === 101);
    const p202 = newProducts.find((p: { id: number }) => p.id === 202);
    expect(p101.stock).toBe(4); // 3 + 1
    expect(p101.inStock).toBe(true);
    expect(p202.stock).toBe(2); // 0 + 2
    expect(p202.inStock).toBe(true);
  });

  it("crea overrides desde cero si no existían", () => {
    restoreStockForReturn([sampleItems()[0]]);
    const overrides = JSON.parse(
      storage.getItem("tcgacademy_product_overrides") as string,
    );
    expect(overrides["101"].stock).toBe(1);
  });
});

// ─── getReturnStats ─────────────────────────────────────────────────────────

describe("returnService — getReturnStats", () => {
  it("cuenta por estado y suma refund total", async () => {
    const a = createReturnRequest("ORD-1", "u1", "a@e.com", "A", sampleItems());
    const b = createReturnRequest("ORD-2", "u2", "b@e.com", "B", sampleItems());
    const c = createReturnRequest("ORD-3", "u3", "c@e.com", "C", sampleItems());
    await updateReturnStatus(a.id, "aprobada");
    await updateReturnStatus(b.id, "reembolsada");
    await updateReturnStatus(c.id, "rechazada");

    const stats = getReturnStats();
    expect(stats.total).toBe(3);
    expect(stats.pending).toBe(0);
    expect(stats.approved).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.totalRefundAmount).toBe(130); // solo la reembolsada
  });

  it("sin returns devuelve todos los contadores a 0", () => {
    const stats = getReturnStats();
    expect(stats).toEqual({
      total: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      totalRefundAmount: 0,
    });
  });
});
