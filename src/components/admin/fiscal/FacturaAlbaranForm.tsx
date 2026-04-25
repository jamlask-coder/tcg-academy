"use client";
/**
 * Formulario compartido por "Emitir factura" y "Emitir albarán".
 *
 * Ambos comparten 100% de los campos (cliente, líneas, descuentos, envío,
 * previsualización). Lo que cambia es el submit final:
 *
 *  - `mode="factura"` ─ llama a `createInvoice()` + `saveInvoice()`
 *    (cadena VeriFactu, libro de facturas, invitación por email al cliente
 *    si era nuevo).
 *  - `mode="albaran"` ─ llama a `createDeliveryNote()` del servicio de
 *    albaranes. NO entra en la cadena VeriFactu, NO genera asiento, NO
 *    invita al usuario. Si posteriormente se convierte a factura, ese
 *    paso sí dispara el pipeline fiscal completo.
 *
 * Además, en modo albarán:
 *  - Se fuerza `InvoiceType.COMPLETA` (un albarán necesita datos fiscales
 *    completos del cliente igual que una factura completa).
 *  - Se oculta el selector de Origen (E/P/R) — los albaranes no llevan
 *    marca de origen en la numeración.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  User,
  UserPlus,
  FileText,
  CheckCircle2,
  Percent,
  Eye,
  Truck,
  X,
  AlertTriangle,
  Save,
} from "lucide-react";
import {
  createInvoice,
  saveInvoice,
  buildLineItem,
} from "@/services/invoiceService";
import { createDeliveryNote } from "@/services/deliveryNoteService";
import { getMergedProducts } from "@/lib/productStore";
import { deductStockForInvoiceItems } from "@/lib/stockMovement";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";
import {
  generateInvoiceHTML,
  printInvoice,
  ensureVerifactuHash,
  type InvoiceData,
} from "@/utils/invoiceGenerator";
import { Send } from "lucide-react";
import {
  InvoiceType,
  PaymentMethod,
  TaxIdType,
  InvoiceOrigin,
} from "@/types/fiscal";
import type { CompanyData, CustomerData, InvoiceLineItem } from "@/types/fiscal";
import { validateSpanishNIF } from "@/lib/validations/nif";
import {
  searchUsersByQuery,
  findUserByEmail,
  createUserFromInvoice,
  generateActivationToken,
  loadFullUser,
  saveUserData,
  ACTIVATION_TOKEN_TTL_DAYS,
  type UserSearchResult,
} from "@/services/userAdminService";
import type { User as AppUser, Address } from "@/types/user";
import { sendAppEmail } from "@/services/emailService";
import { logger } from "@/lib/logger";
import { COUNTRY_OPTIONS } from "@/data/countryPrefixes";
import { PhonePrefixPicker } from "@/components/ui/PhonePrefixPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FacturaAlbaranMode = "factura" | "albaran";

interface DraftLine {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPriceWithVAT: number;
  vatRate: 0 | 4 | 10 | 21;
  discount: number;
}

const VAT_OPTIONS: Array<0 | 4 | 10 | 21> = [0, 4, 10, 21];

// Métodos disponibles en facturación manual. `CONTRA_REEMBOLSO` queda fuera —
// solo se conserva en el enum para facturas históricas.
const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: PaymentMethod.TARJETA, label: "Tarjeta" },
  { value: PaymentMethod.DATAFONO, label: "Datáfono" },
  { value: PaymentMethod.TRANSFERENCIA, label: "Transferencia" },
  { value: PaymentMethod.EFECTIVO, label: "Efectivo" },
  { value: PaymentMethod.BIZUM, label: "Bizum" },
  { value: PaymentMethod.PAYPAL, label: "PayPal" },
];

const ORIGIN_OPTIONS: Array<{ value: InvoiceOrigin; label: string; hint: string }> = [
  { value: InvoiceOrigin.PRESENCIAL, label: "P — Presencial", hint: "Venta en tienda física" },
  { value: InvoiceOrigin.WEB, label: "E — Web / internet", hint: "Pedido desde la tienda online" },
];

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcLine(dl: DraftLine) {
  // `unitPriceWithVAT` es el precio final IVA incluido que teclea el usuario —
  // tratarlo como autoritativo y derivar base/IVA hacia atrás evita perder
  // céntimos por redondeos intermedios (ej: envío 10 € con IVA 21 % no debe
  // caer a 9,99 €). Primero calculamos el total, luego descomponemos.
  const gross = roundTo2(dl.unitPriceWithVAT * dl.quantity);
  const total = roundTo2(gross * (1 - dl.discount / 100));
  const taxableBase = roundTo2(total / (1 + dl.vatRate / 100));
  const vatAmt = roundTo2(total - taxableBase);
  const unitNoVAT = roundTo2(dl.unitPriceWithVAT / (1 + dl.vatRate / 100));
  return { unitNoVAT, taxableBase, vatAmt, total };
}

// ─── Product picker ───────────────────────────────────────────────────────────

function ProductPicker({ onAdd }: { onAdd: (line: Omit<DraftLine, "id">) => void }) {
  const [query, setQuery] = useState("");
  const allProducts = useMemo(() => getMergedProducts(), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(q) || p.game.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allProducts]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto del catálogo..."
          className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onAdd({
                  productId: String(p.id),
                  description: p.name,
                  quantity: 1,
                  unitPriceWithVAT: p.price,
                  vatRate: SITE_CONFIG.vatRate as 21,
                  discount: 0,
                });
                setQuery("");
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <Package size={14} className="shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-400">{p.price.toFixed(2)} € IVA incl.</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export function FacturaAlbaranForm({ mode }: { mode: FacturaAlbaranMode }) {
  const isAlbaran = mode === "albaran";

  // Labels / rutas — centralizados aquí para no ensuciar el JSX con ternarios.
  const labels = {
    docNoun: isAlbaran ? "albarán" : "factura",
    docNounCap: isAlbaran ? "Albarán" : "Factura",
    pageTitle: isAlbaran ? "Nuevo albarán" : "Nueva factura manual",
    backHref: isAlbaran ? "/admin/pedidos/albaranes" : "/admin/fiscal/facturas",
    backLabel: isAlbaran ? "Albaranes" : "Facturas",
    sectionData: isAlbaran ? "Datos del albarán" : "Datos de la factura",
    previewButton: isAlbaran ? "Previsualizar albarán" : "Previsualizar factura",
    confirmButton: isAlbaran ? "Confirmar y crear albarán" : "Confirmar y crear",
    savingLabel: isAlbaran ? "Creando albarán…" : "Creando…",
    successTitle: isAlbaran
      ? "Albarán creado correctamente"
      : "Factura creada correctamente",
    successRedirect: isAlbaran
      ? "Redirigiendo al libro de albaranes…"
      : "Redirigiendo al libro de facturas…",
    invitationNote: isAlbaran
      ? "rellena los datos del cliente"
      : "rellena los datos y enviaremos una invitación por email al emitir la factura",
  };

  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // — Tipo y metadatos. Albarán fuerza COMPLETA (sin simplificada posible).
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.COMPLETA);
  const effectiveInvoiceType = isAlbaran ? InvoiceType.COMPLETA : invoiceType;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TARJETA);
  const [origin, setOrigin] = useState<InvoiceOrigin>(InvoiceOrigin.PRESENCIAL);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // — Datos del cliente
  const [clientName, setClientName] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [clientTaxIdType, setClientTaxIdType] = useState<TaxIdType>(TaxIdType.NIF);
  const [clientEmail, setClientEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("ES");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [clientStreet, setClientStreet] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientPostal, setClientPostal] = useState("");
  const [clientProvince, setClientProvince] = useState("");
  const [clientCountryCode, setClientCountryCode] = useState("ES");

  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [emailExistsFor, setEmailExistsFor] = useState<UserSearchResult | null>(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const clientFormOpen = linkedUserId !== null || newClientMode;
  const [linkedUserOriginal, setLinkedUserOriginal] = useState<AppUser | null>(null);
  const [userSaveMsg, setUserSaveMsg] = useState<string | null>(null);

  const runClientSearch = useCallback((q: string) => {
    setClientQuery(q);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchResults(searchUsersByQuery(trimmed, 8));
  }, []);

  const applyExistingUser = useCallback((u: UserSearchResult) => {
    const full = loadFullUser(u.id);
    setLinkedUserOriginal(full);
    setLinkedUserId(u.id);
    setNewClientMode(false);
    setClientName(`${u.name} ${u.lastName}`.trim());
    setClientEmail(u.email);
    setClientTaxId(u.nif ?? "");
    if (u.phone) {
      const match = u.phone.match(/^\+(\d{1,4})\s*(.*)$/);
      if (match) {
        const dial = `+${match[1]}`;
        const country = COUNTRY_OPTIONS.find((c) => c.dialCode === dial);
        if (country) setPhoneCountryCode(country.code);
        setPhoneDigits(match[2].replace(/\D/g, ""));
      } else {
        setPhoneDigits(u.phone.replace(/\D/g, ""));
      }
    }
    const defaultAddr =
      full?.addresses?.find((a) => a.predeterminada) ?? full?.addresses?.[0];
    if (defaultAddr) {
      const street = [defaultAddr.calle, defaultAddr.numero, defaultAddr.piso]
        .filter(Boolean)
        .join(", ");
      setClientStreet(street);
      setClientCity(defaultAddr.ciudad ?? "");
      setClientPostal(defaultAddr.cp ?? "");
      setClientProvince(defaultAddr.provincia ?? "");
      const match = COUNTRY_OPTIONS.find(
        (c) => c.name.toLowerCase() === (defaultAddr.pais ?? "").toLowerCase(),
      );
      if (match) setClientCountryCode(match.code);
    }
    setClientQuery("");
    setSearchResults([]);
    setEmailExistsFor(null);
    setUserSaveMsg(null);
  }, []);

  const startNewClient = useCallback(() => {
    setLinkedUserId(null);
    setLinkedUserOriginal(null);
    setUserSaveMsg(null);
    setNewClientMode(true);
    setClientName("");
    setClientEmail("");
    setClientTaxId("");
    setPhoneDigits("");
    setClientStreet("");
    setClientCity("");
    setClientPostal("");
    setClientProvince("");
    setClientQuery("");
    setSearchResults([]);
    setEmailExistsFor(null);
  }, []);

  const resetClient = useCallback(() => {
    setLinkedUserId(null);
    setLinkedUserOriginal(null);
    setUserSaveMsg(null);
    setNewClientMode(false);
    setClientName("");
    setClientEmail("");
    setClientTaxId("");
    setPhoneDigits("");
    setClientStreet("");
    setClientCity("");
    setClientPostal("");
    setClientProvince("");
    setSearchResults([]);
    setEmailExistsFor(null);
  }, []);

  const handleEmailBlur = useCallback(() => {
    const email = clientEmail.trim();
    if (!email) {
      setEmailExistsFor(null);
      return;
    }
    if (linkedUserId) return;
    const existing = findUserByEmail(email);
    if (existing) {
      setEmailExistsFor({
        id: existing.id,
        name: existing.name,
        lastName: existing.lastName,
        email: existing.email,
        phone: existing.phone ?? "",
        nif: existing.nif,
        role: existing.role,
      });
    } else {
      setEmailExistsFor(null);
    }
  }, [clientEmail, linkedUserId]);

  const hasUserChanges = useMemo(() => {
    if (!linkedUserOriginal) return false;
    const dial =
      COUNTRY_OPTIONS.find((c) => c.code === phoneCountryCode)?.dialCode ?? "";
    const composedPhone = phoneDigits ? `${dial} ${phoneDigits}`.trim() : "";
    const [firstName = "", ...rest] = clientName.trim().split(/\s+/);
    const lastName = rest.join(" ");
    if ((linkedUserOriginal.name ?? "") !== firstName) return true;
    if ((linkedUserOriginal.lastName ?? "") !== lastName) return true;
    if ((linkedUserOriginal.email ?? "") !== clientEmail.trim()) return true;
    if ((linkedUserOriginal.nif ?? "") !== clientTaxId.trim()) return true;
    if ((linkedUserOriginal.phone ?? "") !== composedPhone) return true;
    if (effectiveInvoiceType === InvoiceType.COMPLETA) {
      const origAddr =
        linkedUserOriginal.addresses?.find((a) => a.predeterminada) ??
        linkedUserOriginal.addresses?.[0];
      const origStreet = origAddr
        ? [origAddr.calle, origAddr.numero, origAddr.piso]
            .filter(Boolean)
            .join(", ")
        : "";
      if (origStreet !== clientStreet.trim()) return true;
      if ((origAddr?.cp ?? "") !== clientPostal.trim()) return true;
      if ((origAddr?.ciudad ?? "") !== clientCity.trim()) return true;
      if ((origAddr?.provincia ?? "") !== clientProvince.trim()) return true;
    }
    return false;
  }, [
    linkedUserOriginal,
    clientName,
    clientEmail,
    clientTaxId,
    phoneCountryCode,
    phoneDigits,
    clientStreet,
    clientCity,
    clientPostal,
    clientProvince,
    effectiveInvoiceType,
  ]);

  const saveChangesToUser = useCallback(() => {
    if (!linkedUserOriginal || !linkedUserId) return;
    const dial =
      COUNTRY_OPTIONS.find((c) => c.code === phoneCountryCode)?.dialCode ?? "";
    const composedPhone = phoneDigits ? `${dial} ${phoneDigits}`.trim() : "";
    const [firstName = "", ...rest] = clientName.trim().split(/\s+/);
    const newLastName = rest.join(" ");
    const countryMeta = COUNTRY_OPTIONS.find((c) => c.code === clientCountryCode);

    const existingAddrs = linkedUserOriginal.addresses ?? [];
    const defaultIdx = existingAddrs.findIndex((a) => a.predeterminada);
    const baseAddr =
      defaultIdx >= 0 ? existingAddrs[defaultIdx] : existingAddrs[0];

    let nextAddresses = existingAddrs;
    if (effectiveInvoiceType === InvoiceType.COMPLETA && clientStreet.trim()) {
      const updated: Address = {
        id: baseAddr?.id ?? crypto.randomUUID(),
        label: baseAddr?.label ?? "Facturación",
        nombre: baseAddr?.nombre,
        apellidos: baseAddr?.apellidos,
        calle: clientStreet.trim(),
        numero: baseAddr?.numero ?? "",
        piso: baseAddr?.piso,
        cp: clientPostal.trim(),
        ciudad: clientCity.trim(),
        provincia: clientProvince.trim(),
        pais: countryMeta?.name ?? "España",
        telefono: composedPhone || baseAddr?.telefono,
        predeterminada: true,
      };
      if (defaultIdx >= 0) {
        nextAddresses = existingAddrs.map((a, i) =>
          i === defaultIdx ? updated : { ...a, predeterminada: false },
        );
      } else {
        nextAddresses = [
          updated,
          ...existingAddrs.map((a) => ({ ...a, predeterminada: false })),
        ];
      }
    }

    const nextUser: AppUser = {
      ...linkedUserOriginal,
      name: firstName || clientName.trim(),
      lastName: newLastName,
      email: clientEmail.trim() || linkedUserOriginal.email,
      phone: composedPhone,
      nif: clientTaxId.trim() || linkedUserOriginal.nif,
      nifType:
        clientTaxIdType === TaxIdType.CIF
          ? "CIF"
          : clientTaxIdType === TaxIdType.NIE
            ? "NIE"
            : "DNI",
      addresses: nextAddresses,
    };

    try {
      const changes = saveUserData(linkedUserId, nextUser);
      setLinkedUserOriginal(nextUser);
      setUserSaveMsg(
        changes.length > 0
          ? `Cambios guardados en el usuario (${changes.length} campo${changes.length === 1 ? "" : "s"}).`
          : "Sin cambios que guardar.",
      );
      setTimeout(() => setUserSaveMsg(null), 3500);
    } catch (err) {
      setUserSaveMsg(
        err instanceof Error ? `Error: ${err.message}` : "Error al guardar",
      );
    }
  }, [
    linkedUserOriginal,
    linkedUserId,
    clientName,
    clientEmail,
    clientTaxId,
    clientTaxIdType,
    phoneCountryCode,
    phoneDigits,
    clientStreet,
    clientCity,
    clientPostal,
    clientProvince,
    clientCountryCode,
    effectiveInvoiceType,
  ]);

  const [globalDiscountPct, setGlobalDiscountPct] = useState(0);
  const [couponAmount, setCouponAmount] = useState(0);
  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);

  const addLine = useCallback((preset?: Omit<DraftLine, "id">) => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "manual",
        description: "",
        quantity: 1,
        unitPriceWithVAT: 0,
        vatRate: 21,
        discount: 0,
        ...preset,
      },
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLine = useCallback(
    (id: string, patch: Partial<Omit<DraftLine, "id">>) => {
      setLines((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      );
    },
    [],
  );

  const totals = useMemo(() => {
    // Cálculo CON el descuento general ya aplicado (va por línea).
    let base = 0, vat = 0, total = 0;
    // Cálculo SIN el descuento general — para poder mostrar al usuario el
    // importe exacto que está descontando y cómo cambia el total.
    let totalBefore = 0;
    for (const l of lines) {
      const adjusted: DraftLine = {
        ...l,
        discount: Math.min(100, l.discount + globalDiscountPct),
      };
      const c = calcLine(adjusted);
      base += c.taxableBase;
      vat += c.vatAmt;
      total += c.total;

      const cBefore = calcLine(l); // mismo cálculo pero con el descuento propio de la línea
      totalBefore += cBefore.total;
    }
    let shippingBase = 0, shippingVat = 0, shippingTotal = 0;
    if (shippingEnabled && shippingAmount > 0) {
      const shipLine = calcLine({
        id: "shipping",
        productId: "shipping",
        description: "Envío",
        quantity: 1,
        unitPriceWithVAT: roundTo2(shippingAmount),
        vatRate: 21,
        discount: 0,
      });
      shippingBase = shipLine.taxableBase;
      shippingVat = shipLine.vatAmt;
      shippingTotal = shipLine.total;
    }
    const coupon = Math.max(0, roundTo2(couponAmount));
    const subtotal = roundTo2(total + shippingTotal);
    // Subtotal pre-descuento general (sí incluye descuentos por línea y envío).
    const subtotalBeforeGlobal = roundTo2(totalBefore + shippingTotal);
    const globalDiscountAmount = Math.max(
      0,
      roundTo2(subtotalBeforeGlobal - subtotal),
    );
    const finalTotal = Math.max(0, roundTo2(subtotal - coupon));

    // ── Prorrateo del cupón sobre base/IVA ────────────────────────────────
    // El cupón es un importe fijo en € (con IVA) que se resta del total.
    // Para mantener coherencia fiscal (Art. 78.3.2º LIVA: los descuentos
    // reducen la base imponible) prorrateamos el cupón entre base y cuota
    // proporcionalmente al peso de cada uno. Así la regla
    // `base + vat === finalTotal` se cumple SIEMPRE.
    const baseWithShip = base + shippingBase;
    const vatWithShip = vat + shippingVat;
    const subtotalGross = roundTo2(baseWithShip + vatWithShip);
    const couponEffective = Math.min(coupon, subtotalGross);
    const couponBase =
      subtotalGross > 0
        ? roundTo2((baseWithShip / subtotalGross) * couponEffective)
        : 0;
    const couponVat = roundTo2(couponEffective - couponBase);

    return {
      base: roundTo2(baseWithShip - couponBase),
      vat: roundTo2(vatWithShip - couponVat),
      linesTotal: roundTo2(total),
      // Subtotal de líneas SIN aplicar el descuento general — es el que se
      // muestra arriba ("Subtotal productos") para que el admin vea el importe
      // real de lo facturado antes de rebajas globales. El descuento general
      // aparece más abajo como resta explícita.
      linesTotalBeforeGlobal: roundTo2(totalBefore),
      shippingTotal: roundTo2(shippingTotal),
      subtotal,
      subtotalBeforeGlobal,
      globalDiscountAmount,
      coupon,
      couponBase,
      couponVat,
      finalTotal,
    };
  }, [lines, globalDiscountPct, couponAmount, shippingEnabled, shippingAmount]);

  // ── Preview HTML — render real del PDF final (mismo generador que imprime).
  // Se recalcula solo cuando el modal está abierto para no gastar CPU mientras
  // edita. Incluye envío y cupón como items (igual que en createInvoice).
  // Es async porque necesitamos `ensureVerifactuHash` para que la vista previa
  // muestre el CSV (Código Seguro de Verificación) igual que el PDF final.
  const [previewHtml, setPreviewHtml] = useState("");
  // Ref + altura del iframe. El iframe se redimensiona al alto real del
  // documento (scrollHeight del body del iframe) para que el scroll lo maneje
  // el contenedor exterior y se vean todos los saltos de página (indicador
  // visual gris+rojo cada 297mm). Con h-full el iframe quedaba clavado al
  // alto del modal y el usuario no veía los saltos ni las páginas siguientes.
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewHeight, setPreviewHeight] = useState<number>(0);
  const resizePreview = useCallback(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;
    // Math.max: usamos scrollHeight y offsetHeight porque el motor puede
    // diferir 1-2px según si el documento tiene decimales en márgenes.
    const h = Math.max(
      doc.body.scrollHeight,
      doc.body.offsetHeight,
      doc.documentElement.scrollHeight,
    );
    if (h > 0) setPreviewHeight(h);
  }, []);
  useEffect(() => {
    if (!showPreview) {
      setPreviewHtml("");
      setPreviewHeight(0);
      return;
    }
    let cancelled = false;
    const activeLines = lines.filter(
      (l) => l.description.trim() && l.unitPriceWithVAT > 0,
    );
    // El `l.discount` específico de la línea sí se bakea en el precio unitario
    // (es un descuento atado a ese producto concreto). El descuento general
    // (`globalDiscountPct`) NUNCA se bakea: se pasa aparte en `globalDiscount`
    // para que el PDF lo muestre como línea separada, al igual que el cupón.
    // Art. 6.1.f RD 1619/2012: los descuentos deben constar separadamente y
    // no incluidos en el precio unitario.
    const items = activeLines.map((l) => ({
      name: l.description,
      quantity: l.quantity,
      unitPriceWithVAT: roundTo2(
        l.unitPriceWithVAT * (1 - Math.min(100, l.discount) / 100),
      ),
      vatRate: l.vatRate,
    }));
    const countryMeta =
      COUNTRY_OPTIONS.find((c) => c.code === clientCountryCode) ??
      COUNTRY_OPTIONS[0];
    const data: InvoiceData = {
      invoiceNumber: isAlbaran
        ? `ALB-${new Date(invoiceDate).getFullYear()}-PREVIEW`
        : `FAC-${new Date(invoiceDate).getFullYear()}-PREVIEW`,
      date: new Date(invoiceDate).toISOString(),
      paymentMethod:
        PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label ?? "",
      paymentStatus: "paid",
      issuerName: SITE_CONFIG.legalName,
      issuerCIF: SITE_CONFIG.cif,
      issuerAddress: getIssuerAddress().street,
      issuerCity: getIssuerAddress().cityLine,
      issuerCountry: SITE_CONFIG.country,
      issuerPhone: SITE_CONFIG.phone,
      issuerEmail: SITE_CONFIG.email,
      clientName: clientName || "—",
      clientCIF: clientTaxId || undefined,
      clientEmail: clientEmail || undefined,
      clientAddress:
        effectiveInvoiceType === InvoiceType.COMPLETA
          ? `${clientStreet}${clientPostal ? `, ${clientPostal}` : ""}`
          : undefined,
      clientCity: clientCity || undefined,
      clientProvince: clientProvince || undefined,
      clientCountry: countryMeta.name,
      items,
      shipping: shippingEnabled && shippingAmount > 0 ? shippingAmount : undefined,
      couponDiscount: couponAmount > 0 ? couponAmount : undefined,
      globalDiscount:
        globalDiscountPct > 0 && totals.globalDiscountAmount > 0
          ? { pct: globalDiscountPct, amount: totals.globalDiscountAmount }
          : undefined,
      isDeliveryNote: isAlbaran,
    };
    (async () => {
      const withHash = await ensureVerifactuHash(data);
      if (cancelled) return;
      const html = generateInvoiceHTML(withHash);
      // srcDoc no tiene origin → las URLs relativas (logo, watermark) rompen.
      // Inyectar <base> resuelve las rutas igual que en printInvoice().
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setPreviewHtml(html.replace("<head>", `<head><base href="${origin}/">`));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showPreview,
    lines,
    globalDiscountPct,
    totals.globalDiscountAmount,
    shippingEnabled,
    shippingAmount,
    couponAmount,
    invoiceDate,
    paymentMethod,
    clientName,
    clientTaxId,
    clientEmail,
    clientStreet,
    clientPostal,
    clientCity,
    clientProvince,
    clientCountryCode,
    effectiveInvoiceType,
    isAlbaran,
  ]);

  function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const activeLines = lines.filter((l) => l.description.trim() && l.unitPriceWithVAT > 0);
    if (activeLines.length === 0) {
      setError("Añade al menos una línea con descripción e importe.");
      return;
    }

    if (!clientEmail.trim()) {
      setError("El email del cliente es obligatorio.");
      return;
    }
    if (!phoneDigits.trim()) {
      setError("El teléfono del cliente es obligatorio.");
      return;
    }

    // Duplicado de email (solo aplicable en modo factura — en albarán no
    // creamos cuenta y por tanto no bloqueamos).
    if (!isAlbaran && !linkedUserId) {
      const existing = findUserByEmail(clientEmail.trim());
      if (existing) {
        setEmailExistsFor({
          id: existing.id,
          name: existing.name,
          lastName: existing.lastName,
          email: existing.email,
          phone: existing.phone ?? "",
          nif: existing.nif,
          role: existing.role,
        });
        setError(
          "Ya hay un cliente con ese email. Vincúlalo desde el aviso o cambia el email antes de continuar.",
        );
        return;
      }
    }

    if (effectiveInvoiceType === InvoiceType.COMPLETA) {
      const missing: string[] = [];
      if (!clientName.trim()) missing.push("Nombre / Razón social");
      if (!clientTaxId.trim()) missing.push("NIF / NIE / CIF");
      if (!clientStreet.trim()) missing.push("Dirección");
      if (!clientCity.trim()) missing.push("Ciudad");
      if (!clientPostal.trim()) missing.push("Código postal");
      if (!clientProvince.trim()) missing.push("Provincia");
      if (!clientCountryCode) missing.push("País");
      if (missing.length > 0) {
        setError(
          `Faltan campos obligatorios (Art. 6.1 RD 1619/2012): ${missing.join(", ")}.`,
        );
        return;
      }
      if (clientCountryCode === "ES") {
        const v = validateSpanishNIF(clientTaxId.trim());
        if (!v.valid) {
          setError(`NIF/NIE/CIF no válido: ${v.error ?? "formato incorrecto"}`);
          return;
        }
      } else {
        const raw = clientTaxId.trim().toUpperCase().replace(/\s/g, "");
        const eu = COUNTRY_OPTIONS.find((c) => c.code === clientCountryCode);
        if (eu?.isEU && !raw.startsWith(clientCountryCode)) {
          setError(
            `Para clientes de ${eu.name} el VAT debe empezar por "${clientCountryCode}" (ej: ${clientCountryCode}123456789).`,
          );
          return;
        }
        if (raw.length < 5) {
          setError("Identificación fiscal demasiado corta.");
          return;
        }
      }
    }

    setShowPreview(true);
  }

  async function confirmAndCreate(opts: { sendByEmail: boolean } = { sendByEmail: false }) {
    setError(null);
    setSaving(true);
    try {
      const activeLines = lines.filter((l) => l.description.trim() && l.unitPriceWithVAT > 0);
      // El descuento general (`globalDiscountPct`) ya NO se bakea en el `discount`
      // por línea — se persiste como un item negativo separado al final
      // (mismo patrón que el cupón). Así queda auditable en el InvoiceRecord y
      // el PDF lo muestra como línea independiente (Art. 6.1.f RD 1619/2012).
      const builtItems: InvoiceLineItem[] = activeLines.map((l, i) =>
        buildLineItem({
          lineNumber: i + 1,
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPriceWithVAT: l.unitPriceWithVAT,
          vatRate: l.vatRate,
          discount: Math.min(100, l.discount),
        }),
      );

      if (shippingEnabled && shippingAmount > 0) {
        builtItems.push(
          buildLineItem({
            lineNumber: builtItems.length + 1,
            productId: "shipping",
            description: "Envío",
            quantity: 1,
            unitPriceWithVAT: roundTo2(shippingAmount),
            vatRate: 21,
            discount: 0,
          }),
        );
      }

      if (globalDiscountPct > 0 && totals.globalDiscountAmount > 0) {
        const gdVat = (activeLines[0]?.vatRate ?? 21) as 0 | 4 | 10 | 21;
        builtItems.push(
          buildLineItem({
            lineNumber: builtItems.length + 1,
            productId: "global-discount",
            description: `Descuento general (${globalDiscountPct}%)`,
            quantity: 1,
            unitPriceWithVAT: -roundTo2(totals.globalDiscountAmount),
            vatRate: gdVat,
            discount: 0,
          }),
        );
      }

      if (couponAmount > 0) {
        const couponVat = (activeLines[0]?.vatRate ?? 21) as 0 | 4 | 10 | 21;
        builtItems.push(
          buildLineItem({
            lineNumber: builtItems.length + 1,
            productId: "coupon",
            description: "Descuento cupón",
            quantity: 1,
            unitPriceWithVAT: -roundTo2(couponAmount),
            vatRate: couponVat,
            discount: 0,
          }),
        );
      }

      const countryMeta =
        COUNTRY_OPTIONS.find((c) => c.code === clientCountryCode) ??
        COUNTRY_OPTIONS[0];
      const phoneDial =
        COUNTRY_OPTIONS.find((c) => c.code === phoneCountryCode)?.dialCode ?? "";
      const clientPhone = phoneDigits
        ? `${phoneDial} ${phoneDigits}`.trim()
        : "";
      let recipient: CompanyData | CustomerData;

      if (effectiveInvoiceType === InvoiceType.COMPLETA && clientTaxId) {
        recipient = {
          name: clientName,
          taxId: clientTaxId,
          taxIdType: clientTaxIdType,
          address: {
            street: clientStreet,
            city: clientCity,
            postalCode: clientPostal,
            province: clientProvince,
            country: countryMeta.name,
            countryCode: countryMeta.code === "OTRO" ? "XX" : countryMeta.code,
          },
          phone: clientPhone,
          email: clientEmail,
          isEU: countryMeta.isEU && countryMeta.code !== "ES",
          countryCode: countryMeta.code === "OTRO" ? "XX" : countryMeta.code,
        } satisfies CompanyData;
      } else {
        recipient = {
          name: clientName || "Cliente particular",
          taxId: clientTaxId || undefined,
          email: clientEmail || undefined,
          phone: clientPhone || undefined,
          countryCode: countryMeta.code === "OTRO" ? "XX" : countryMeta.code,
        } satisfies CustomerData;
      }

      if (isAlbaran) {
        // Albarán — NO entra en cadena VeriFactu, NO invita usuario.
        createDeliveryNote({
          recipient,
          items: builtItems,
          paymentMethod,
          deliveryNoteDate: new Date(invoiceDate),
        });
        // Salida física del producto → resta stock. Si luego se convierte a
        // factura vía convertToInvoice(), NO se vuelve a restar.
        deductStockForInvoiceItems(builtItems);
        setSaved(true);
        setTimeout(() => router.push("/admin/pedidos/albaranes"), 1500);
        return;
      }

      // Factura — pipeline fiscal completo.
      const invoice = await createInvoice({
        recipient,
        items: builtItems,
        paymentMethod,
        invoiceDate: new Date(invoiceDate),
        invoiceType: effectiveInvoiceType,
        origin,
      });

      saveInvoice(invoice);

      // Factura manual directa (sin albarán previo) → resta stock.
      // Las facturas web ya lo restan en /finalizar-compra; las generadas
      // por convertToInvoice() ya lo restaron al crear el albarán.
      deductStockForInvoiceItems(invoice.items);

      // Construir InvoiceData una sola vez (se usa para openPdf y email).
      const pdfData: InvoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        date: new Date(invoice.invoiceDate).toISOString(),
        paymentMethod:
          PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label ?? "",
        paymentStatus: "paid",
        verifactuHash: invoice.verifactuHash ?? undefined,
        issuerName: SITE_CONFIG.legalName,
        issuerCIF: SITE_CONFIG.cif,
        issuerAddress: getIssuerAddress().street,
        issuerCity: getIssuerAddress().cityLine,
        issuerCountry: SITE_CONFIG.country,
        issuerPhone: SITE_CONFIG.phone,
        issuerEmail: SITE_CONFIG.email,
        clientName: clientName || "—",
        clientCIF: clientTaxId || undefined,
        clientEmail: clientEmail || undefined,
        clientAddress:
          effectiveInvoiceType === InvoiceType.COMPLETA
            ? `${clientStreet}${clientPostal ? `, ${clientPostal}` : ""}`
            : undefined,
        clientCity: clientCity || undefined,
        clientProvince: clientProvince || undefined,
        clientCountry:
          (COUNTRY_OPTIONS.find((c) => c.code === clientCountryCode) ??
            COUNTRY_OPTIONS[0]).name,
        items: invoice.items
          .filter((li) => li.productId !== "coupon")
          .map((li) => ({
            name: li.description,
            quantity: li.quantity,
            // InvoiceLineItem.unitPrice es SIN IVA; el generador espera
            // CON IVA, así que rehidratamos desde base+cuota de la línea.
            unitPriceWithVAT:
              li.quantity > 0
                ? (li.taxableBase + li.vatAmount) / li.quantity
                : 0,
            vatRate: li.vatRate,
          })),
        couponDiscount: couponAmount > 0 ? couponAmount : undefined,
      };

      // Descarga local del PDF para el admin (ambos botones la disparan).
      // Abre el diálogo imprimir/guardar PDF del navegador desde un iframe
      // oculto — no cambia el hash VeriFactu ni la cadena; solo visualiza.
      try {
        await printInvoice(pdfData);
      } catch (pdfErr) {
        logger.warn(
          "Fallo al abrir PDF tras guardar factura",
          "fiscal.nueva-factura",
          {
            error: pdfErr instanceof Error ? pdfErr.message : String(pdfErr),
            invoice: invoice.invoiceNumber,
          },
        );
      }

      if (opts.sendByEmail && clientEmail.trim()) {
        try {
          const siteOrigin =
            typeof window !== "undefined" ? window.location.origin : "";

          // Generar PDF de la factura ya firmada (con hash VeriFactu real)
          // y adjuntarlo al email. Import dinámico para no cargar
          // jspdf/html2canvas a quien no adjunta.
          const { generateInvoicePdfBase64 } = await import("@/lib/invoicePdf");
          const pdfBase64 = await generateInvoicePdfBase64(pdfData);

          await sendAppEmail({
            toEmail: clientEmail.trim(),
            toName: clientName.trim() || "Cliente",
            templateId: "factura_disponible",
            vars: {
              nombre: (clientName.trim().split(/\s+/)[0] || clientName.trim()) || "cliente",
              invoice_id: invoice.invoiceNumber,
              order_id: invoice.invoiceNumber,
              invoice_date: new Date(invoice.invoiceDate).toLocaleDateString("es-ES"),
              total: totals.finalTotal.toFixed(2),
              download_url: `${siteOrigin}/cuenta/facturas`,
              unsubscribe_link: `${siteOrigin}/cuenta/privacidad`,
            },
            attachments: [
              {
                filename: `${invoice.invoiceNumber}.pdf`,
                content: pdfBase64,
                contentType: "application/pdf",
              },
            ],
          });
        } catch (mailErr) {
          logger.warn(
            "Fallo al enviar email de factura al cliente",
            "fiscal.nueva-factura",
            {
              error: mailErr instanceof Error ? mailErr.message : String(mailErr),
              invoice: invoice.invoiceNumber,
            },
          );
        }
      }

      if (!linkedUserId && clientEmail.trim()) {
        try {
          const [firstName, ...rest] = clientName.trim().split(/\s+/);
          const newUser = createUserFromInvoice({
            name: firstName ?? clientName.trim(),
            lastName: rest.join(" "),
            email: clientEmail.trim(),
            phone: clientPhone,
            nif: clientTaxId.trim() || undefined,
            nifType:
              clientTaxIdType === TaxIdType.CIF
                ? "CIF"
                : clientTaxIdType === TaxIdType.NIE
                  ? "NIE"
                  : "DNI",
            address:
              effectiveInvoiceType === InvoiceType.COMPLETA
                ? {
                    calle: clientStreet,
                    cp: clientPostal,
                    ciudad: clientCity,
                    provincia: clientProvince,
                    pais: countryMeta.name,
                    countryCode:
                      countryMeta.code === "OTRO" ? "XX" : countryMeta.code,
                  }
                : undefined,
          });
          const token = generateActivationToken(
            newUser.id,
            newUser.email,
            invoice.invoiceNumber,
          );
          const siteOrigin =
            typeof window !== "undefined" ? window.location.origin : "";
          const urlActivacion = `${siteOrigin}/activar-cuenta?token=${encodeURIComponent(token)}`;
          await sendAppEmail({
            toEmail: newUser.email,
            toName: `${newUser.name} ${newUser.lastName}`.trim(),
            templateId: "invitacion_cuenta",
            vars: {
              nombre: newUser.name || newUser.email,
              numeroFactura: invoice.invoiceNumber,
              urlActivacion,
              expiraEn: `${ACTIVATION_TOKEN_TTL_DAYS} días`,
            },
          });
        } catch (invitErr) {
          logger.warn(
            "Fallo al crear usuario/invitación desde factura manual",
            "fiscal.nueva-factura",
            {
              error:
                invitErr instanceof Error ? invitErr.message : String(invitErr),
              invoice: invoice.invoiceNumber,
            },
          );
        }
      }

      setSaved(true);
      setTimeout(() => router.push("/admin/fiscal/facturas"), 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Error al crear ${labels.docNoun === "albarán" ? "el albarán" : "la factura"}`,
      );
      setSaving(false);
      setShowPreview(false);
    }
  }

  if (saved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <CheckCircle2 size={48} className="text-green-500" />
        <p className="text-xl font-bold text-gray-800">{labels.successTitle}</p>
        <p className="text-sm text-gray-500">{labels.successRedirect}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={labels.backHref}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={15} /> {labels.backLabel}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{labels.pageTitle}</h1>
      </div>

      <form onSubmit={handlePreview} className="space-y-6">
        {/* — Sección 1: Metadatos ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText size={15} /> {labels.sectionData}
          </h2>
          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isAlbaran ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
          >
            {!isAlbaran && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Tipo de factura
                </label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                >
                  <option value={InvoiceType.COMPLETA}>Completa</option>
                  <option value={InvoiceType.SIMPLIFICADA}>Simplificada</option>
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Fecha de {labels.docNoun}
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Método de pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {!isAlbaran && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Origen
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as InvoiceOrigin)}
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                  title={ORIGIN_OPTIONS.find((o) => o.value === origin)?.hint}
                >
                  {ORIGIN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} title={opt.hint}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">
                  {ORIGIN_OPTIONS.find((o) => o.value === origin)?.hint}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* — Sección 2: Cliente ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User size={15} /> Datos del cliente
            </h2>
          </div>

          {!clientFormOpen && (
            <div className="relative">
              <p className="mb-1.5 text-xs font-medium text-gray-500">
                Buscar cliente existente por nombre, email o NIF
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => runClientSearch(e.target.value)}
                    placeholder="Empieza a escribir (mín. 2 caracteres)…"
                    className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={startNewClient}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <UserPlus size={13} />
                  Nuevo cliente
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => applyExistingUser(u)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-800">
                          {u.name} {u.lastName}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {u.email}
                          {u.nif ? ` · ${u.nif}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {clientQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Sin coincidencias. Pulsa <strong>Nuevo cliente</strong> para
                  rellenar los datos manualmente.
                </p>
              )}
            </div>
          )}

          {clientFormOpen && linkedUserId && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={15} />
                  <span>
                    Cliente existente:{" "}
                    <strong>{clientName}</strong> ({clientEmail})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetClient}
                  className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-900"
                >
                  Cambiar cliente
                </button>
              </div>
              {userSaveMsg && (
                <p className="mt-1.5 text-xs text-emerald-700">{userSaveMsg}</p>
              )}
              {hasUserChanges && !userSaveMsg && (
                <p className="mt-1.5 text-[11px] text-emerald-700/80">
                  Has modificado datos del cliente. Pulsa{" "}
                  <strong>Guardar cambios</strong> al final del bloque para
                  aplicarlos al registro del usuario (ID-Usuario #{linkedUserId}).
                </p>
              )}
            </div>
          )}

          {clientFormOpen && !linkedUserId && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm">
              <div className="flex items-center gap-2 text-blue-800">
                <UserPlus size={15} />
                <span>
                  <strong>Cliente nuevo</strong> — {labels.invitationNote}.
                </span>
              </div>
              <button
                type="button"
                onClick={resetClient}
                className="text-xs font-semibold text-blue-800 underline hover:text-blue-900"
              >
                Cancelar
              </button>
            </div>
          )}

          {clientFormOpen && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nombre / Razón social
                {effectiveInvoiceType === InvoiceType.COMPLETA && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
                required={effectiveInvoiceType === InvoiceType.COMPLETA}
                aria-required={effectiveInvoiceType === InvoiceType.COMPLETA}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="w-24 shrink-0">
                <label className="mb-1 block text-xs font-medium text-gray-600">Tipo ID</label>
                <select
                  value={clientTaxIdType}
                  onChange={(e) => setClientTaxIdType(e.target.value as TaxIdType)}
                  className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm focus:border-blue-400 focus:outline-none"
                >
                  {Object.values(TaxIdType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  NIF / NIE / CIF
                  {effectiveInvoiceType === InvoiceType.COMPLETA && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="text"
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value.toUpperCase())}
                  placeholder="B12345678"
                  required={effectiveInvoiceType === InvoiceType.COMPLETA}
                  aria-required={effectiveInvoiceType === InvoiceType.COMPLETA}
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Email<span className="text-red-500"> *</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => {
                  setClientEmail(e.target.value);
                  if (emailExistsFor) setEmailExistsFor(null);
                  if (linkedUserId) setLinkedUserId(null);
                }}
                onBlur={handleEmailBlur}
                placeholder="cliente@ejemplo.com"
                required
                aria-required
                className={`h-9 w-full rounded-lg border px-3 text-sm focus:outline-none ${
                  emailExistsFor
                    ? "border-amber-400 bg-amber-50/50 focus:border-amber-500"
                    : "border-gray-200 focus:border-blue-400"
                }`}
              />
              {emailExistsFor && !linkedUserId && (
                <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p>
                      Ya existe un cliente con este email:{" "}
                      <strong>
                        {emailExistsFor.name} {emailExistsFor.lastName}
                      </strong>
                      . No puedes continuar con el mismo email — usa otro
                      diferente o vincula al cliente existente.
                    </p>
                    <button
                      type="button"
                      onClick={() => applyExistingUser(emailExistsFor)}
                      className="mt-1 font-semibold underline hover:text-amber-900"
                    >
                      Usar este cliente existente
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Teléfono<span className="text-red-500"> *</span>
              </label>
              <div className="flex">
                <PhonePrefixPicker
                  size="sm"
                  value={phoneCountryCode}
                  onChange={setPhoneCountryCode}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneDigits}
                  onChange={(e) =>
                    setPhoneDigits(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="600000000"
                  required
                  aria-required
                  className="h-9 w-full rounded-r-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>
            {effectiveInvoiceType === InvoiceType.COMPLETA && (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Dirección<span className="text-red-500"> *</span>
                  </label>
                  <input
                    type="text"
                    value={clientStreet}
                    onChange={(e) => setClientStreet(e.target.value)}
                    placeholder="Calle, número, piso..."
                    required
                    aria-required
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Ciudad<span className="text-red-500"> *</span>
                  </label>
                  <input
                    type="text"
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    placeholder="Ciudad"
                    required
                    aria-required
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-28 shrink-0">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      CP<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={clientPostal}
                      onChange={(e) => setClientPostal(e.target.value)}
                      placeholder="5 dígitos"
                      required
                      aria-required
                      className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Provincia<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={clientProvince}
                      onChange={(e) => setClientProvince(e.target.value)}
                      placeholder="Provincia"
                      required
                      aria-required
                      className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    País<span className="text-red-500"> *</span>
                  </label>
                  <select
                    value={clientCountryCode}
                    onChange={(e) => setClientCountryCode(e.target.value)}
                    required
                    aria-required
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                        {c.isEU && c.code !== "ES" ? " · UE" : ""}
                      </option>
                    ))}
                  </select>
                  {clientCountryCode !== "ES" && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      {COUNTRY_OPTIONS.find((c) => c.code === clientCountryCode)?.isEU
                        ? "Cliente UE: introduce el VAT intracomunitario (prefijo del país)."
                        : "Cliente fuera de UE: operación exenta de IVA (exportación)."}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          )}

          {clientFormOpen && linkedUserId && hasUserChanges && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={saveChangesToUser}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Save size={13} />
                Guardar cambios en ficha del cliente
              </button>
            </div>
          )}
        </div>

        {/* — Sección 3: Líneas ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Package size={15} /> Líneas de {labels.docNoun}
          </h2>

          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-gray-500">
              Añadir producto del catálogo web
            </p>
            <ProductPicker onAdd={addLine} />
          </div>

          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center">
              <Package size={20} className="mx-auto mb-1.5 text-gray-300" />
              <p className="text-xs text-gray-500">
                Aún no hay líneas. Busca un producto del catálogo o añade una línea manual.
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="pb-2 text-left font-medium">Descripción</th>
                  <th className="pb-2 w-16 text-center font-medium">Cant.</th>
                  <th className="pb-2 w-28 text-right font-medium">Precio IVA incl.</th>
                  <th className="pb-2 w-20 text-center font-medium">IVA %</th>
                  <th className="pb-2 w-16 text-center font-medium">Dto. %</th>
                  <th className="pb-2 w-24 text-right font-medium">Total</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lines.map((line) => {
                  const c = calcLine(line);
                  return (
                    <tr key={line.id}>
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.id, { description: e.target.value })
                          }
                          placeholder="Descripción del producto o servicio"
                          className="h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.id, {
                              quantity: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={line.unitPriceWithVAT}
                          onChange={(e) =>
                            updateLine(line.id, {
                              unitPriceWithVAT: Number(e.target.value),
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-right text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <select
                          value={line.vatRate}
                          onChange={(e) =>
                            updateLine(line.id, {
                              vatRate: Number(e.target.value) as 0 | 4 | 10 | 21,
                            })
                          }
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        >
                          {VAT_OPTIONS.map((v) => (
                            <option key={v} value={v}>{v}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={line.discount === 0 ? "" : line.discount}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateLine(line.id, {
                              discount:
                                raw === ""
                                  ? 0
                                  : Math.min(100, Math.max(0, Number(raw) || 0)),
                            });
                          }}
                          placeholder="0"
                          className="h-8 w-full rounded-md border border-gray-200 px-1 text-center text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right font-semibold text-gray-700">
                        {c.total.toFixed(2)} €
                      </td>
                      <td className="py-1.5 pl-1">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                          aria-label="Eliminar línea"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          <button
            type="button"
            onClick={() => addLine()}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <Plus size={13} /> Añadir línea manual
          </button>

          {lines.length > 0 && (
            // pr-9 (36px) = ancho de la columna "papelera" de la tabla
            // (w-8 + pl-1). Con ese padding derecho, la cifra del subtotal
            // queda alineada verticalmente con los precios de la columna
            // "Total" de cada línea.
            <div className="mt-4 flex items-center justify-end gap-6 border-t border-gray-100 pt-3 pr-9 text-sm">
              <span className="font-medium text-gray-600">Subtotal productos</span>
              <span className="font-semibold tabular-nums text-gray-800">
                {totals.linesTotalBeforeGlobal.toFixed(2)} €
              </span>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={shippingEnabled}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShippingEnabled(next);
                    if (next && shippingAmount === 0) {
                      setShippingAmount(SITE_CONFIG.standardShippingCost);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <Truck size={14} className="text-gray-500" />
                Añadir envío
              </label>
              {shippingEnabled && (
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-gray-500">Coste IVA incl.</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={shippingAmount === 0 ? "" : shippingAmount}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setShippingAmount(raw === "" ? 0 : Math.max(0, Number(raw) || 0));
                    }}
                    placeholder="0,00"
                    className="h-8 w-28 rounded-md border border-gray-200 px-2 text-right text-xs focus:border-blue-400 focus:outline-none"
                  />
                  <span className="text-xs text-gray-400">€</span>
                </div>
              )}
            </div>
            {shippingEnabled && totals.shippingTotal > 0 && (
              <div className="mt-3 space-y-1 border-t border-gray-200/70 pt-2 text-sm">
                <div className="flex items-center justify-between text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <Truck size={13} className="text-gray-400" />
                    Envío (21% IVA)
                  </span>
                  <span className="font-medium tabular-nums">
                    +{totals.shippingTotal.toFixed(2)} €
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold text-gray-800">
                  <span>Subtotal con envío</span>
                  <span className="tabular-nums">
                    {totals.subtotalBeforeGlobal.toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* — Sección 4: Descuentos adicionales ────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Percent size={15} /> Descuentos
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Descuento general (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={globalDiscountPct === 0 ? "" : globalDiscountPct}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setGlobalDiscountPct(
                      raw === ""
                        ? 0
                        : Math.min(100, Math.max(0, Number(raw) || 0)),
                    );
                  }}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-gray-200 pl-3 pr-8 text-sm focus:border-blue-400 focus:outline-none"
                />
                <Percent
                  size={13}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Se aplica sobre cada línea (suma al descuento existente).
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Descuento cupón / promoción (€)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={couponAmount === 0 ? "" : couponAmount}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCouponAmount(raw === "" ? 0 : Math.max(0, Number(raw) || 0));
                }}
                placeholder="0,00"
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Cuantía fija en € a restar del total.
              </p>
            </div>
          </div>

          {(totals.globalDiscountAmount > 0 || totals.coupon > 0) && (
            // pr-9 por la misma razón: alinear cifras con la columna "Total"
            // de la tabla de líneas (hay una columna papelera w-8 + pl-1).
            <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 pr-9 text-sm">
              <div className="flex items-center justify-end gap-6 text-gray-600">
                <span>Subtotal (sin descuentos generales)</span>
                <span className="tabular-nums">
                  {totals.subtotalBeforeGlobal.toFixed(2)} €
                </span>
              </div>
              {totals.globalDiscountAmount > 0 && (
                <div className="flex items-center justify-end gap-6 text-rose-600">
                  <span>Descuento general ({globalDiscountPct}%)</span>
                  <span className="font-medium tabular-nums">
                    −{totals.globalDiscountAmount.toFixed(2)} €
                  </span>
                </div>
              )}
              {totals.coupon > 0 && (
                <div className="flex items-center justify-end gap-6 text-rose-600">
                  <span>Descuento cupón / promoción</span>
                  <span className="font-medium tabular-nums">
                    −{totals.coupon.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TOTAL: barra destacada. El padding derecho px-4 del bloque más
              pr-5 extra iguala los ~36px del offset de la columna papelera. */}
          <div className="mt-4 flex items-center justify-end gap-6 rounded-xl bg-blue-50 py-3 pl-4 pr-9 text-lg font-bold text-gray-900">
            <span>TOTAL CON IVA</span>
            <span className="tabular-nums">
              {totals.finalTotal.toFixed(2)} €
            </span>
          </div>
          <div className="mt-2 flex items-center justify-end gap-4 text-[11px] text-gray-500">
            <span>
              Base imponible:{" "}
              <span className="tabular-nums">{totals.base.toFixed(2)} €</span>
            </span>
            <span>
              IVA: <span className="tabular-nums">{totals.vat.toFixed(2)} €</span>
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <Link
            href={labels.backHref}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <Eye size={15} />
            {labels.previewButton}
          </button>
        </div>
      </form>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
        >
          <div className="flex h-[95vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h3 id="preview-title" className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Eye size={16} className="text-blue-600" />
                Previsualización de {labels.docNoun}
              </h3>
              <button
                type="button"
                onClick={() => !saving && setShowPreview(false)}
                disabled={saving}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                aria-label="Cerrar previsualización"
              >
                <X size={18} />
              </button>
            </div>

            {/* El documento interior mide 210mm exactos (A4). El HTML generado
                incluye un script de paginación que divide el contenido en
                N .sheet A4 de 210×297mm. En pantalla cada hoja se ve como
                un folio blanco con sombra, separadas por el body gris. Al
                imprimir, cada .sheet fuerza salto de página → PDF idéntico.
                El iframe se auto-ajusta vía onLoad a la altura real del
                documento ya paginado (N × 297mm + gaps). */}
            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
              <iframe
                ref={previewIframeRef}
                title={`Vista previa de ${labels.docNoun}`}
                srcDoc={previewHtml}
                onLoad={resizePreview}
                style={{ height: previewHeight ? `${previewHeight}px` : "100%" }}
                className="mx-auto block w-[210mm] rounded-lg border border-gray-200 bg-white shadow-inner"
              />
            </div>

            {error && (
              <p className="mx-6 mb-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ArrowLeft size={15} />
                Volver a editar
              </button>
              <div className="flex items-center gap-2">
                <div className="mr-2 text-right text-xs leading-tight text-gray-500">
                  <div>
                    Total{" "}
                    <span className="font-bold text-gray-800">
                      {totals.finalTotal.toFixed(2)} €
                    </span>
                  </div>
                  <div>IVA incl.</div>
                </div>
                <button
                  type="button"
                  onClick={() => void confirmAndCreate({ sendByEmail: false })}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
                >
                  <CheckCircle2 size={15} />
                  {saving
                    ? labels.savingLabel
                    : isAlbaran
                      ? "Confirmar y guardar albarán"
                      : "Confirmar"}
                </button>
                {!isAlbaran && (
                  <button
                    type="button"
                    onClick={() => void confirmAndCreate({ sendByEmail: true })}
                    disabled={saving || !clientEmail.trim()}
                    title={
                      !clientEmail.trim()
                        ? "Introduce un email de cliente para poder enviar"
                        : `Confirmar y enviar a ${clientEmail}`
                    }
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    <Send size={14} />
                    {saving ? "Enviando…" : "Confirmar y enviar al cliente"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
