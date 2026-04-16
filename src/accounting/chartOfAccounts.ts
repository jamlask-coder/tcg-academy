/**
 * Cuadro de Cuentas — Plan General Contable (PGC) español.
 * Subset relevante para TCG Academy (e-commerce minorista).
 *
 * Grupos PGC:
 *   1 - Financiación básica (capital, reservas, deudas L/P)
 *   2 - Inmovilizado (activo no corriente)
 *   3 - Existencias (stock)
 *   4 - Acreedores y deudores (proveedores, clientes, HP)
 *   5 - Cuentas financieras (caja, bancos)
 *   6 - Compras y gastos
 *   7 - Ventas e ingresos
 */

import type { PGCAccount, AccountGroup, AccountType } from "@/types/accounting";

// ─── Chart of Accounts ──────────────────────────────────────────────────────

const ACCOUNTS: PGCAccount[] = [
  // ── GRUPO 1: Financiación básica ──
  { code: "100", name: "Capital social", group: 1, type: "equity", debitNature: false },
  { code: "112", name: "Reserva legal", group: 1, type: "equity", debitNature: false },
  { code: "113", name: "Reservas voluntarias", group: 1, type: "equity", debitNature: false },
  { code: "120", name: "Remanente", group: 1, type: "equity", debitNature: false },
  { code: "129", name: "Resultado del ejercicio", group: 1, type: "equity", debitNature: false },
  { code: "170", name: "Deudas a L/P con entidades de crédito", group: 1, type: "liability", debitNature: false },

  // ── GRUPO 2: Inmovilizado ──
  { code: "206", name: "Aplicaciones informáticas", group: 2, type: "asset", debitNature: true },
  { code: "217", name: "Equipos proceso información", group: 2, type: "asset", debitNature: true },
  { code: "218", name: "Elementos de transporte", group: 2, type: "asset", debitNature: true },
  { code: "281", name: "Amort. acum. inmov. material", group: 2, type: "asset", debitNature: false, description: "Contrapartida del inmovilizado" },

  // ── GRUPO 3: Existencias ──
  { code: "300", name: "Mercaderías", group: 3, type: "asset", debitNature: true, description: "Stock de cartas TCG y accesorios" },
  { code: "310", name: "Materias primas", group: 3, type: "asset", debitNature: true },

  // ── GRUPO 4: Acreedores y deudores ──
  { code: "400", name: "Proveedores", group: 4, type: "liability", debitNature: false },
  { code: "410", name: "Acreedores por prestación de servicios", group: 4, type: "liability", debitNature: false },
  { code: "430", name: "Clientes", group: 4, type: "asset", debitNature: true },
  { code: "431", name: "Clientes efectos comerciales a cobrar", group: 4, type: "asset", debitNature: true },
  { code: "435", name: "Clientes de dudoso cobro", group: 4, type: "asset", debitNature: true },
  { code: "440", name: "Deudores", group: 4, type: "asset", debitNature: true },
  { code: "460", name: "Anticipos de remuneraciones", group: 4, type: "asset", debitNature: true },
  { code: "465", name: "Remuneraciones pendientes de pago", group: 4, type: "liability", debitNature: false },
  { code: "470", name: "HP deudora por diversos conceptos", group: 4, type: "asset", debitNature: true },
  { code: "4700", name: "HP deudora por IVA", group: 4, type: "asset", debitNature: true },
  { code: "471", name: "Organismos SS deudores", group: 4, type: "asset", debitNature: true },
  { code: "472", name: "HP IVA soportado", group: 4, type: "asset", debitNature: true, description: "IVA de compras (deducible)" },
  { code: "473", name: "HP retenciones y pagos a cuenta", group: 4, type: "asset", debitNature: true },
  { code: "475", name: "HP acreedora por conceptos fiscales", group: 4, type: "liability", debitNature: false },
  { code: "4750", name: "HP acreedora por IVA", group: 4, type: "liability", debitNature: false },
  { code: "4751", name: "HP acreedora ret. practicadas", group: 4, type: "liability", debitNature: false },
  { code: "476", name: "Organismos SS acreedores", group: 4, type: "liability", debitNature: false },
  { code: "477", name: "HP IVA repercutido", group: 4, type: "liability", debitNature: false, description: "IVA de ventas (deuda con Hacienda)" },
  { code: "490", name: "Deterioro valor créditos comerciales", group: 4, type: "asset", debitNature: false },

  // ── GRUPO 5: Cuentas financieras ──
  { code: "520", name: "Deudas a C/P con entidades de crédito", group: 5, type: "liability", debitNature: false },
  { code: "523", name: "Proveedores inmov. a C/P", group: 5, type: "liability", debitNature: false },
  { code: "555", name: "Partidas pendientes de aplicación", group: 5, type: "asset", debitNature: true },
  { code: "570", name: "Caja, euros", group: 5, type: "asset", debitNature: true },
  { code: "572", name: "Bancos c/c", group: 5, type: "asset", debitNature: true },
  { code: "573", name: "Bancos c/c moneda extranjera", group: 5, type: "asset", debitNature: true },
  { code: "5720", name: "Banco principal", group: 5, type: "asset", debitNature: true, parent: "572" },
  { code: "5721", name: "PayPal", group: 5, type: "asset", debitNature: true, parent: "572" },
  { code: "5722", name: "Stripe", group: 5, type: "asset", debitNature: true, parent: "572" },
  { code: "5723", name: "Bizum", group: 5, type: "asset", debitNature: true, parent: "572" },

  // ── GRUPO 6: Compras y gastos ──
  { code: "600", name: "Compras de mercaderías", group: 6, type: "expense", debitNature: true },
  { code: "602", name: "Compras de otros aprovisionamientos", group: 6, type: "expense", debitNature: true },
  { code: "606", name: "Desc. s/ compras por pronto pago", group: 6, type: "expense", debitNature: false },
  { code: "608", name: "Devoluciones de compras", group: 6, type: "expense", debitNature: false },
  { code: "610", name: "Variación de existencias mercaderías", group: 6, type: "expense", debitNature: true },
  { code: "621", name: "Arrendamientos y cánones", group: 6, type: "expense", debitNature: true },
  { code: "622", name: "Reparaciones y conservación", group: 6, type: "expense", debitNature: true },
  { code: "623", name: "Servicios profesionales independientes", group: 6, type: "expense", debitNature: true },
  { code: "624", name: "Transportes", group: 6, type: "expense", debitNature: true },
  { code: "625", name: "Primas de seguros", group: 6, type: "expense", debitNature: true },
  { code: "626", name: "Servicios bancarios y similares", group: 6, type: "expense", debitNature: true },
  { code: "627", name: "Publicidad, propaganda y RRPP", group: 6, type: "expense", debitNature: true },
  { code: "628", name: "Suministros", group: 6, type: "expense", debitNature: true },
  { code: "629", name: "Otros servicios", group: 6, type: "expense", debitNature: true },
  { code: "630", name: "Impuesto sobre beneficios", group: 6, type: "expense", debitNature: true },
  { code: "631", name: "Otros tributos", group: 6, type: "expense", debitNature: true },
  { code: "640", name: "Sueldos y salarios", group: 6, type: "expense", debitNature: true },
  { code: "642", name: "Seguridad Social a cargo empresa", group: 6, type: "expense", debitNature: true },
  { code: "649", name: "Otros gastos sociales", group: 6, type: "expense", debitNature: true },
  { code: "650", name: "Pérdidas de créditos comerc. incobrables", group: 6, type: "expense", debitNature: true },
  { code: "662", name: "Intereses de deudas", group: 6, type: "expense", debitNature: true },
  { code: "669", name: "Otros gastos financieros", group: 6, type: "expense", debitNature: true },
  { code: "678", name: "Gastos excepcionales", group: 6, type: "expense", debitNature: true },
  { code: "681", name: "Amort. inmov. material", group: 6, type: "expense", debitNature: true },
  { code: "682", name: "Amort. inmov. intangible", group: 6, type: "expense", debitNature: true },
  { code: "694", name: "Pérd. deterioro créditos comerciales", group: 6, type: "expense", debitNature: true },

  // ── GRUPO 7: Ventas e ingresos ──
  { code: "700", name: "Ventas de mercaderías", group: 7, type: "income", debitNature: false, description: "Ingresos por venta de cartas TCG" },
  { code: "705", name: "Prestaciones de servicios", group: 7, type: "income", debitNature: false },
  { code: "706", name: "Desc. s/ ventas por pronto pago", group: 7, type: "income", debitNature: true },
  { code: "708", name: "Devoluciones de ventas y op. similares", group: 7, type: "income", debitNature: true, description: "Rectificativas y devoluciones" },
  { code: "709", name: "Rappels sobre ventas", group: 7, type: "income", debitNature: true },
  { code: "759", name: "Ingresos por servicios diversos", group: 7, type: "income", debitNature: false },
  { code: "769", name: "Otros ingresos financieros", group: 7, type: "income", debitNature: false },
  { code: "778", name: "Ingresos excepcionales", group: 7, type: "income", debitNature: false },
  { code: "794", name: "Reversión deterioro créditos comerciales", group: 7, type: "income", debitNature: false },
];

// ─── Access functions ───────────────────────────────────────────────────────

export function getFullChartOfAccounts(): PGCAccount[] {
  return ACCOUNTS;
}

export function getAccountByCode(code: string): PGCAccount | undefined {
  return ACCOUNTS.find((a) => a.code === code);
}

export function getAccountsByGroup(group: AccountGroup): PGCAccount[] {
  return ACCOUNTS.filter((a) => a.group === group);
}

export function getAccountsByType(type: AccountType): PGCAccount[] {
  return ACCOUNTS.filter((a) => a.type === type);
}

export function isDebitNature(code: string): boolean {
  const account = getAccountByCode(code);
  return account?.debitNature ?? true;
}

export function validateAccountCode(code: string): boolean {
  return ACCOUNTS.some((a) => a.code === code);
}

export function getAccountName(code: string): string {
  return getAccountByCode(code)?.name ?? `Cuenta ${code}`;
}
