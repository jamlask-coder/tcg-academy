import { describe, it, expect } from "vitest";
import {
  isFiscalProfileComplete,
  isAddressComplete,
} from "@/lib/validations/profileComplete";
import type { User, Address } from "@/types/user";

function mkAddr(overrides: Partial<Address> = {}): Address {
  return {
    id: "addr_1",
    label: "Casa",
    calle: "Gran Vía",
    numero: "10",
    cp: "28013",
    ciudad: "Madrid",
    provincia: "Madrid",
    pais: "España",
    predeterminada: true,
    ...overrides,
  };
}

function mkUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "a@b.com",
    name: "Ana",
    lastName: "Pérez",
    phone: "+34612345678",
    role: "cliente",
    nif: "00000000T", // válido (00000000 → T)
    nifType: "DNI",
    addresses: [mkAddr()],
    favorites: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("isAddressComplete", () => {
  it("acepta dirección con los 5 campos postales", () => {
    expect(isAddressComplete(mkAddr())).toBe(true);
  });

  it("rechaza si falta calle", () => {
    expect(isAddressComplete(mkAddr({ calle: "" }))).toBe(false);
  });

  it("rechaza si falta CP", () => {
    expect(isAddressComplete(mkAddr({ cp: "" }))).toBe(false);
  });

  it("rechaza null/undefined", () => {
    expect(isAddressComplete(null)).toBe(false);
    expect(isAddressComplete(undefined)).toBe(false);
  });
});

describe("isFiscalProfileComplete", () => {
  it("acepta perfil completo (NIF válido + teléfono + dirección)", () => {
    const res = isFiscalProfileComplete(mkUser());
    expect(res.ok).toBe(true);
    expect(res.missing).toEqual([]);
  });

  it("user=null → todo falta", () => {
    const res = isFiscalProfileComplete(null);
    expect(res.ok).toBe(false);
    expect(res.missing).toContain("nif");
    expect(res.missing).toContain("phone");
    expect(res.missing).toContain("address");
  });

  it("replica el caso típico Google OAuth (phone='', addresses=[], sin NIF)", () => {
    const googleUser = mkUser({
      phone: "",
      addresses: [],
      nif: undefined,
      nifType: undefined,
    });
    const res = isFiscalProfileComplete(googleUser);
    expect(res.ok).toBe(false);
    expect(res.missing).toContain("nif");
    expect(res.missing).toContain("phone");
    expect(res.missing).toContain("address");
  });

  it("detecta NIF inválido (mala letra de control)", () => {
    // 12345678 % 23 = 14 → letra correcta Z; A (=4) es incorrecta
    const res = isFiscalProfileComplete(mkUser({ nif: "12345678A" }));
    expect(res.ok).toBe(false);
    expect(res.missing).toContain("nif");
  });

  it("rechaza teléfono de menos de 9 caracteres", () => {
    const res = isFiscalProfileComplete(mkUser({ phone: "12345" }));
    expect(res.ok).toBe(false);
    expect(res.missing).toContain("phone");
  });

  it("rechaza si ninguna dirección tiene CP", () => {
    const res = isFiscalProfileComplete(
      mkUser({ addresses: [mkAddr({ cp: "" })] }),
    );
    expect(res.ok).toBe(false);
    expect(res.missing).toContain("address");
  });

  it("acepta si tiene 1 dirección incompleta + 1 completa", () => {
    const res = isFiscalProfileComplete(
      mkUser({
        addresses: [
          mkAddr({ id: "a1", cp: "", predeterminada: false }),
          mkAddr({ id: "a2", predeterminada: true }),
        ],
      }),
    );
    expect(res.ok).toBe(true);
  });
});
