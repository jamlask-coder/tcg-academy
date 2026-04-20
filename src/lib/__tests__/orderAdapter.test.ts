import { describe, expect, it } from "vitest";
import { derivePaymentStatus, isDeferredPayment } from "@/lib/orderAdapter";

// Tests que blindan la regla fiscal de BUG #2 (audit 2026-04-20):
// "Pago diferido != pedido": transferencia, tienda, recogida, contrarrembolso
// NO emiten factura hasta que el admin marca el pedido como cobrado.
describe("orderAdapter — isDeferredPayment", () => {
  it("marca como diferidos los 4 métodos sin cobro inmediato", () => {
    expect(isDeferredPayment("tienda")).toBe(true);
    expect(isDeferredPayment("transferencia")).toBe(true);
    expect(isDeferredPayment("recogida")).toBe(true);
    expect(isDeferredPayment("contrarrembolso")).toBe(true);
    expect(isDeferredPayment("contra reembolso")).toBe(true);
  });

  it("trata los métodos con cobro inmediato como NO diferidos", () => {
    expect(isDeferredPayment("tarjeta")).toBe(false);
    expect(isDeferredPayment("paypal")).toBe(false);
    expect(isDeferredPayment("bizum")).toBe(false);
    expect(isDeferredPayment("google-pay")).toBe(false);
    expect(isDeferredPayment("apple-pay")).toBe(false);
  });

  it("tolera espacios y mayúsculas", () => {
    expect(isDeferredPayment("TIENDA")).toBe(true);
    expect(isDeferredPayment("Transferencia bancaria")).toBe(true);
    expect(isDeferredPayment("")).toBe(false);
  });
});

describe("orderAdapter — derivePaymentStatus", () => {
  it("pago inmediato + pendiente_envio → cobrado", () => {
    expect(derivePaymentStatus("tarjeta", "pendiente_envio")).toBe("cobrado");
  });

  it("pago diferido + pendiente_envio → pendiente", () => {
    expect(derivePaymentStatus("tienda", "pendiente_envio")).toBe("pendiente");
    expect(derivePaymentStatus("recogida", "pendiente_envio")).toBe("pendiente");
    expect(derivePaymentStatus("transferencia", "pendiente_envio")).toBe(
      "pendiente",
    );
  });

  it("cancelado y devolución son terminales para el estado de pago", () => {
    expect(derivePaymentStatus("tarjeta", "cancelado")).toBe("cancelado");
    expect(derivePaymentStatus("tienda", "cancelado")).toBe("cancelado");
    expect(derivePaymentStatus("tarjeta", "devolucion")).toBe("reembolsado");
  });
});
