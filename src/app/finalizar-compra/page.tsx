"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { SITE_CONFIG } from "@/config/siteConfig";
import { calculateShipping } from "@/lib/priceVerification";
import { useCart } from "@/context/CartContext";
import { getMergedById } from "@/lib/productStore";
import { persistProductPatch } from "@/lib/productPersist";
import { useAuth } from "@/context/AuthContext";
import {
  awardPurchasePoints,
  deductPoints,
  loadPoints,
  buildRedemptionTiers,
  getAssociations,
  POINTS_PER_EURO,
  POINTS_MAX_DISCOUNT_PCT,
  REFERRAL_ASSOC_PTS_PER_100,
} from "@/services/pointsService";
import { pushUserNotification } from "@/services/notificationService";
import {
  createInvoice,
  saveInvoice,
  buildLineItem,
} from "@/services/invoiceService";
import { PaymentMethod, TaxIdType } from "@/types/fiscal";
import type { CustomerData } from "@/types/fiscal";
import { recordCouponUsage, markCouponUsed } from "@/services/couponService";
import { sendAppEmail } from "@/services/emailService";
import { sanitizeString, isValidEmail, clampNumber } from "@/utils/sanitize";
import {
  acquireCheckoutLock,
  releaseCheckoutLock,
  checkOrderIdempotency,
  orderFingerprint,
} from "@/lib/checkoutGuard";
import { safeWrite, safeRead, emergencyTrimStorage, aggressiveCleanup } from "@/lib/safeStorage";
import {
  appendToAdminInbox,
  patchCheckoutOrder,
  isDeferredPayment,
  type CheckoutOrder,
} from "@/lib/orderAdapter";
import {
  detectImpossibleDiscount,
  detectRapidFire,
  detectTimeTravel,
  detectNumericOverflow,
} from "@/lib/anomalyDetection";
import { enqueueDeadLetter } from "@/lib/circuitBreaker";
import {
  Shield,
  Truck,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Tag,
  Star,
  Store,
  Trophy,
  ChevronDown,
  X,
  MapPin,
  Plus,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { STORES } from "@/data/stores";
import { isFiscalProfileComplete } from "@/lib/validations/profileComplete";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { validateSpanishNIF } from "@/lib/validations/nif";

// Regex locales — mismos que /registro y /cuenta/datos para coherencia UX.
const CHECKOUT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKOUT_PHONE_REGEX = /^[\d\s\-()+]{6,20}$/;

// Proyección ligera del registro central de tiendas para el checkout.
// Fuente única: src/data/stores.ts — añadir/editar tiendas ahí.
// Sólo tiendas abiertas son seleccionables como punto de recogida — una tienda
// "próximamente" no puede aceptar pedidos aún.
const TIENDAS = Object.values(STORES)
  .filter((s) => !s.comingSoon)
  .map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    email: s.email,
  }));

// Flujo consolidado: el método de envío se elige en el primer paso "datos"
// junto con los datos personales. La dirección sólo se pide si NO es recogida
// en tienda — así no tiene sentido pedirla sin saber si el cliente recoge.
type Step = "datos" | "pago" | "confirmado";

interface PendingCheckout {
  appliedCoupon: {
    code: string;
    discountType: "percent" | "fixed" | "shipping";
    value: number;
    description: string;
  } | null;
  couponDiscount: number;
  freeShippingCoupon?: boolean;
}

export default function CheckoutPage() {
  const { items, total, count, clearCart } = useCart();
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("datos");

  // ── Guard de perfil fiscal completo ─────────────────────────────────────
  // Si el usuario está logueado pero le faltan datos legalmente obligatorios
  // (típico de cuentas creadas vía Google OAuth — ver AuthContext.loginWithGoogle),
  // lo mandamos a completar-datos antes de poder tocar el formulario. Un
  // invitado (user=null) sigue el flujo normal (rellena todo en el form).
  // Base legal: Art. 6.1.d / 6.1.e RD 1619/2012.
  const [profileGuardReady, setProfileGuardReady] = useState(false);
  useEffect(() => {
    if (!user) {
      setProfileGuardReady(true);
      return;
    }
    const completeness = isFiscalProfileComplete(user);
    if (!completeness.ok) {
      const ret = encodeURIComponent("/finalizar-compra");
      router.replace(`/cuenta/completar-datos?return=${ret}`);
      return;
    }
    setProfileGuardReady(true);
  }, [user, router]);
  const [pending] = useState<PendingCheckout | null>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("tcgacademy_pending_checkout")
          : null;
      return raw ? (JSON.parse(raw) as PendingCheckout) : null;
    } catch {
      return null;
    }
  });
  const [orderId, setOrderId] = useState("");
  const [appliedPoints, setAppliedPoints] = useState<{ points: number; euros: number } | null>(null);
  const [showPointsPanel, setShowPointsPanel] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [triedSubmitDatos, setTriedSubmitDatos] = useState(false);
  // Validación de FORMATO on-blur (NIF letra control, email, teléfono, CP 5
  // dígitos). Complementa al check de "required" existente (`triedSubmitDatos`)
  // marcando el campo en rojo en el instante en que el usuario sale de él.
  const fmt = useFieldErrors();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  useEffect(() => {
    if (user?.role === "cliente") setUserPoints(loadPoints(user.id));
  }, [user]);

  const [form, setForm] = useState({
    nombre: "",
    apellidos: "",
    nif: "",
    email: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    cp: "",
    provincia: "",
    pais: "ES",
    envio: "estandar",
    pago: "tarjeta",
    tiendaRecogida: "",
  });

  // ── Address selector ────────────────────────────────────────────────────────
  // "new" = el usuario introduce manualmente una nueva dirección.
  // Si tiene direcciones guardadas preseleccionamos la predeterminada.
  const [selectedAddrId, setSelectedAddrId] = useState<string>("new");
  const savedAddresses = useMemo(() => user?.addresses ?? [], [user]);

  // Pre-rellenar al montar (una sola vez) con la dirección predeterminada del usuario + sus datos personales
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!user) return;
    prefilledRef.current = true;
    const defaultAddr =
      savedAddresses.find((a) => a.predeterminada) ?? savedAddresses[0] ?? null;
    setForm((f) => ({
      ...f,
      nombre: f.nombre || user.name || "",
      apellidos: f.apellidos || user.lastName || "",
      nif: f.nif || user.nif || "",
      email: f.email || user.email || "",
      telefono: f.telefono || user.phone || "",
      ...(defaultAddr
        ? {
            direccion: `${defaultAddr.calle} ${defaultAddr.numero}${defaultAddr.piso ? ", " + defaultAddr.piso : ""}`.trim(),
            cp: defaultAddr.cp,
            ciudad: defaultAddr.ciudad,
            provincia: defaultAddr.provincia,
            pais: defaultAddr.pais || "ES",
          }
        : {}),
    }));
    if (defaultAddr) setSelectedAddrId(defaultAddr.id);
  }, [user, savedAddresses]);

  /** Cambiar dirección seleccionada → rellenar (o limpiar) los campos de envío */
  const applySelectedAddress = (id: string) => {
    setSelectedAddrId(id);
    if (id === "new") {
      setForm((f) => ({
        ...f,
        direccion: "",
        cp: "",
        ciudad: "",
        provincia: "",
        pais: "ES",
      }));
      return;
    }
    const addr = savedAddresses.find((a) => a.id === id);
    if (!addr) return;
    setForm((f) => ({
      ...f,
      direccion: `${addr.calle} ${addr.numero}${addr.piso ? ", " + addr.piso : ""}`.trim(),
      cp: addr.cp,
      ciudad: addr.ciudad,
      provincia: addr.provincia,
      pais: addr.pais || "ES",
    }));
  };

  /** true si el usuario está usando una dirección guardada (no editable inline) */
  const usingSavedAddress = selectedAddrId !== "new" && savedAddresses.some((a) => a.id === selectedAddrId);

  const isStorePickup = form.envio === "tienda";
  const hasFreeShippingCoupon = pending?.freeShippingCoupon === true;

  const shipping = calculateShipping(
    isStorePickup ? "tienda" : "estandar",
    total,
    { freeShippingCoupon: hasFreeShippingCoupon },
  );
  const couponDiscount = pending?.couponDiscount ?? 0;
  const pointsDiscount = appliedPoints?.euros ?? 0;
  const maxPointsDiscount = Math.floor(total * POINTS_MAX_DISCOUNT_PCT * 100) / 100;
  const pointsTiers = buildRedemptionTiers(userPoints).filter((t) => t.euros <= maxPointsDiscount);
  const finalTotal = Math.max(0, total - couponDiscount - pointsDiscount + shipping);
  // Points are awarded on products only — shipping excluded
  const pointsBase = Math.max(0, total - couponDiscount - pointsDiscount);

  const [orderError, setOrderError] = useState<string | null>(null);

  const handleOrder = async () => {
    // ── Guard 1: Prevent double-click ──
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setOrderError(null);

    // ── Guard 2: Anomaly detection — time travel + rapid fire ──
    detectTimeTravel();
    if (detectRapidFire("checkout", 5)) {
      setOrderError("Demasiados intentos de pedido. Espera un momento.");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    // ── Guard 3: Cross-tab lock ──
    if (!acquireCheckoutLock()) {
      setOrderError("Hay otro pedido en proceso en otra pestaña. Espera a que termine.");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      // ── Guard 3: Cart not empty ──
      if (!items.length) {
        setOrderError("Tu carrito está vacío.");
        return;
      }

      // ── Guard 4: Validate quantities ──
      const overLimitItem = items.find(
        (i) => i.quantity > 99 || i.quantity < 1 || !Number.isFinite(i.quantity),
      );
      if (overLimitItem) {
        setOrderError(`El artículo "${overLimitItem.name}" tiene una cantidad no válida.`);
        return;
      }

      // ── Guard 5: Validate email ──
      if (!isValidEmail(form.email)) {
        setOrderError("El email introducido no es válido.");
        return;
      }

      // ── Guard 5b: Validate NIF (obligatorio para factura — Art. 6.1.d RD 1619/2012) ──
      const { validateSpanishNIF } = await import("@/lib/validations/nif");
      const nifCheck = validateSpanishNIF(form.nif);
      if (!nifCheck.valid) {
        setOrderError(
          nifCheck.error
            ? `NIF / NIE / CIF: ${nifCheck.error}`
            : "El NIF / NIE / CIF es obligatorio para emitir la factura.",
        );
        return;
      }

      // ── Guard 6: Validate prices are sane ──
      const badPriceItem = items.find(
        (i) => !Number.isFinite(i.price) || i.price <= 0,
      );
      if (badPriceItem) {
        setOrderError(`Precio inválido en "${badPriceItem.name}". Vuelve al carrito e inténtalo de nuevo.`);
        return;
      }

      // ── Guard 6b: Stock + roleLimit availability (client-side doble-check) ──
      // Si el admin editó stock/límites justo antes de que el usuario confirmase,
      // o si hubo una carrera con otra compra, debemos bloquear aquí. El API
      // hace verifyOrder en modo server, pero en modo local necesitamos este
      // check explícito antes de crear pedido + factura (incidente 2026-04-22).
      try {
        const { verifyStockAvailability, verifyPurchaseLimits } = await import(
          "@/lib/priceVerification"
        );
        const cartItems = items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          price: it.price,
        }));
        const stockCheck = verifyStockAvailability(cartItems);
        if (!stockCheck.available) {
          const issue = stockCheck.issues[0];
          setOrderError(
            `"${issue.name}": solicitadas ${issue.requested} uds pero solo hay ${issue.available} en stock. Ajusta el carrito.`,
          );
          return;
        }
        if (user?.id) {
          const roleForLimit: "cliente" | "mayorista" | "tienda" =
            user.role === "mayorista" || user.role === "tienda"
              ? user.role
              : "cliente";
          const limitCheck = verifyPurchaseLimits(
            cartItems,
            user.id,
            roleForLimit,
          );
          if (!limitCheck.valid) {
            const issue = limitCheck.issues[0];
            setOrderError(
              `"${issue.name}": máximo ${issue.limit} uds por ${roleForLimit} (${issue.purchased} ya comprado, ${issue.remaining} disponibles).`,
            );
            return;
          }
        }
      } catch { /* guardia no-bloqueante si el módulo falla al importar */ }

      // ── Guard 7: Idempotency (prevent exact duplicate orders) ──
      const fp = orderFingerprint(items, form.email, finalTotal);
      if (!checkOrderIdempotency(fp)) {
        setOrderError("Este pedido ya se ha creado recientemente. Comprueba \"Mis pedidos\".");
        return;
      }

      // ── Sanitize all customer-provided strings ──
      const sNombre = sanitizeString(form.nombre, 80);
      const sApellidos = sanitizeString(form.apellidos, 120);
      const sDireccion = sanitizeString(form.direccion, 200);
      const sCiudad = sanitizeString(form.ciudad, 100);
      const sProvincia = sanitizeString(form.provincia, 100);
      const sCp = sanitizeString(form.cp, 5);
      const sTelefono = sanitizeString(form.telefono, 20);

      // ── Anomaly: detect impossible discounts ──
      detectImpossibleDiscount(total, couponDiscount + pointsDiscount);

      // ── Anomaly: numeric overflow on all monetary values ──
      detectNumericOverflow("checkout.total", total);
      detectNumericOverflow("checkout.couponDiscount", couponDiscount);
      detectNumericOverflow("checkout.pointsDiscount", pointsDiscount);
      detectNumericOverflow("checkout.shipping", shipping);

      // ── Validate finalTotal is sane ──
      const safeFinalTotal = clampNumber(finalTotal, 0, 99999.99, 0);
      if (safeFinalTotal <= 0 && !appliedPoints && !pending?.appliedCoupon) {
        setOrderError("El total del pedido no puede ser 0€ sin descuento aplicado.");
        return;
      }

      // ── Generate order ID ──
      const idArr = new Uint8Array(4);
      crypto.getRandomValues(idArr);
      const rand = Array.from(idArr).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 6).toUpperCase();
      const id = `TCG-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${rand}`;
      setOrderId(id);

      // ── Build order with FULL discount breakdown ──
      const order = {
        id,
        date: new Date().toISOString(),
        status: "procesando",
        items: items.map((i) => ({
          id: i.key,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
        })),
        subtotal: total,
        coupon: pending?.appliedCoupon ?? null,
        couponDiscount,
        points: appliedPoints,
        pointsDiscount,
        // FULL discount breakdown for admin reconciliation
        discountBreakdown: {
          couponCode: pending?.appliedCoupon?.code ?? null,
          couponType: pending?.appliedCoupon?.discountType ?? null,
          couponValue: pending?.appliedCoupon?.value ?? 0,
          couponEuros: couponDiscount,
          pointsUsed: appliedPoints?.points ?? 0,
          pointsEuros: pointsDiscount,
          freeShippingCoupon: hasFreeShippingCoupon,
          totalDiscounts: couponDiscount + pointsDiscount,
        },
        shipping,
        total: safeFinalTotal,
        // Points awarded on discounted base (correct fiscal calculation)
        pointsBase,
        shippingAddress: {
          nombre: sNombre,
          apellidos: sApellidos,
          email: form.email,
          telefono: sTelefono,
          direccion: sDireccion,
          ciudad: sCiudad,
          cp: sCp,
          provincia: sProvincia,
          pais: form.pais,
        },
        envio: form.envio,
        tiendaRecogida: form.tiendaRecogida || null,
        pago: form.pago,
        userRole: user?.role ?? "guest",
        userId: user?.id ?? null,
        // NIF del comprador (ya validado arriba con validateSpanishNIF)
        // — obligatorio para factura (Art. 6.1.d RD 1619/2012).
        nif: nifCheck.normalized,
        nifType:
          nifCheck.type === "NIE"
            ? "NIE"
            : nifCheck.type === "CIF"
              ? "CIF"
              : "DNI",
      };

      // ── INTENT BRANCH — pago diferido (recogida en tienda / transferencia) ──
      // Regla de negocio (2026-04-18): cobro pendiente ≠ pedido. Para pago
      // diferido NO se persiste el pedido, NO se crea factura, NO se acumulan
      // puntos ni se descuenta stock. Solo se envía un email a la tienda con
      // la intención del cliente y un email de confirmación al cliente. Si
      // finalmente compra (viene a tienda, hace la transferencia), la venta
      // real se registrará desde el PoS/admin en ese momento.
      if (isDeferredPayment(form.pago)) {
        try {
          const tienda =
            isStorePickup && form.tiendaRecogida
              ? TIENDAS.find((t) => t.id === form.tiendaRecogida)
              : null;
          const productList = items
            .map((i) => `${i.quantity}× ${i.name}`)
            .join(", ");
          const customerContact = `${form.nombre} ${form.apellidos} · ${form.email} · ${form.telefono}`;
          const intentVars = {
            nombre: form.nombre || "cliente",
            order_id: "intención",
            order_date: new Date().toLocaleDateString("es-ES"),
            items_html: items
              .map(
                (i) =>
                  `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${(i.price * i.quantity).toFixed(2)}€</td></tr>`,
              )
              .join(""),
            subtotal: total.toFixed(2),
            shipping: "—",
            total: safeFinalTotal.toFixed(2),
            address: tienda
              ? `Recogida en: ${tienda.name}`
              : `${form.direccion}, ${form.ciudad} ${form.cp}, ${form.provincia}`,
            payment_method: form.pago,
            unsubscribe_link: "#",
          };

          // Email a la tienda / admin con la intención
          await sendAppEmail({
            toEmail: tienda ? tienda.email : SITE_CONFIG.email,
            toName: tienda ? tienda.name : SITE_CONFIG.name,
            templateId: "confirmacion_pedido",
            vars: intentVars,
            preview: `${customerContact} · ${productList} · Total aprox: ${safeFinalTotal.toFixed(2)}€ · ${tienda ? "cobrar al recoger" : form.pago}`,
          });

          // Email al cliente confirmando la intención (no es un pedido cerrado)
          await sendAppEmail({
            toEmail: form.email,
            toName: `${form.nombre} ${form.apellidos}`.trim(),
            templateId: "confirmacion_pedido",
            vars: intentVars,
            preview: tienda
              ? `Pasa por ${tienda.name} para abonar y recoger tu pedido (${safeFinalTotal.toFixed(2)}€). Recomendamos confirmar disponibilidad por teléfono antes de desplazarte.`
              : `Hemos recibido tu solicitud. Te contactaremos para confirmar el pago y los siguientes pasos.`,
          });
        } catch {
          /* email send es non-critical */
        }

        clearCart();
        setStep("confirmado");
        return;
      }

    // ── PHASE 1: Save order (CRITICAL — must succeed) ──
    const orderSaved = safeWrite(
      "tcgacademy_orders",
      (() => {
        const existing = safeRead<unknown[]>("tcgacademy_orders", []);
        return [order, ...existing];
      })(),
    );

    if (!orderSaved) {
      // Level 1: gentle trim + retry
      emergencyTrimStorage();
      let retryData = safeRead<unknown[]>("tcgacademy_orders", []);
      let retrySaved = safeWrite("tcgacademy_orders", [order, ...retryData]);
      if (!retrySaved) {
        // Level 2: aggressive purge of non-essential keys + retry
        aggressiveCleanup();
        retryData = safeRead<unknown[]>("tcgacademy_orders", []);
        retrySaved = safeWrite("tcgacademy_orders", [order, ...retryData]);
      }
      if (!retrySaved) {
        // Level 3: last resort — trim oldest orders (keep last 200)
        const existing = safeRead<unknown[]>("tcgacademy_orders", []);
        const trimmed = existing.slice(0, 200);
        retrySaved = safeWrite("tcgacademy_orders", [order, ...trimmed]);
      }
      if (!retrySaved) {
        setOrderError("Error al guardar el pedido: almacenamiento lleno. Por favor, contacta con soporte.");
        return;
      }
    }

    localStorage.removeItem("tcgacademy_pending_checkout");

    // ── PHASE 1.2: Mirror order to admin inbox ────────────────────────────
    // Sin esto el pedido vive sólo en `tcgacademy_orders` y el panel admin
    // NO lo ve (lee de `tcgacademy_admin_orders`). Es la relación comprador-
    // vendedor: cada pedido de cliente/mayorista/tienda debe llegarnos.
    try {
      appendToAdminInbox(order as CheckoutOrder);
    } catch {
      // Best-effort: si falla, el admin panel lo recupera con
      // readAdminOrdersMerged() al leer (escanea también tcgacademy_orders).
    }

    // ── PHASE 1.5: Persist shipping address to user profile if new ──
    // Fixes bug where addresses used in checkout don't appear in "Mis direcciones".
    // Match by calle+cp+ciudad (case-insensitive) to avoid duplicates.
    // Solo persistimos si el usuario NO está usando una dirección ya guardada
    // (evita duplicar la existente con formato "calle numero, piso" distinto).
    if (user && !isStorePickup && !usingSavedAddress) {
      try {
        const norm = (s: string) => s.trim().toLowerCase();
        const exists = user.addresses.some(
          (a) =>
            norm(a.calle) === norm(sDireccion) &&
            norm(a.cp) === norm(sCp) &&
            norm(a.ciudad) === norm(sCiudad),
        );
        if (!exists) {
          const newAddr = {
            id: `addr-${crypto.randomUUID()}`,
            label: "Envío",
            nombre: sNombre,
            apellidos: sApellidos,
            calle: sDireccion,
            numero: "",
            cp: sCp,
            ciudad: sCiudad,
            provincia: sProvincia,
            pais: form.pais,
            telefono: sTelefono,
            predeterminada: user.addresses.length === 0,
          };
          updateProfile({ addresses: [...user.addresses, newAddr] });
        }
      } catch {
        /* non-blocking — address save is best-effort */
      }
    }

    // ── PHASE 2: Points deduction (must happen BEFORE award) ──
    let pointsDeducted = false;
    if (user?.role === "cliente" && appliedPoints?.points) {
      try {
        deductPoints(user.id, appliedPoints.points);
        pointsDeducted = true;
      } catch (err) {
        // CRITICAL: points deduction failed but order is saved.
        // Log incident but DON'T block order — admin will reconcile.
        const incidentLog = safeRead<unknown[]>("tcgacademy_incidents", []);
        incidentLog.unshift({
          ts: new Date().toISOString(),
          type: "points_deduction_failed",
          orderId: id,
          userId: user.id,
          pointsAttempted: appliedPoints.points,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        safeWrite("tcgacademy_incidents", incidentLog);
      }
    }

    // ── PHASE 3: Generate fiscal invoice ──
    // Invoice amounts reflect ACTUAL discounted prices for correct VAT.
    // Regla fiscal: NO emitir factura mientras el pago esté pendiente (pago
    // diferido: tienda, transferencia, recogida, contrarrembolso). La factura
    // se emitirá cuando admin marque el pedido como "cobrado" vía
    // regenerateInvoiceForOrder.
    if (!isDeferredPayment(form.pago)) {
      try {
        const paymentMethodMap: Record<string, PaymentMethod> = {
          tarjeta: PaymentMethod.TARJETA,
          paypal: PaymentMethod.PAYPAL,
          bizum: PaymentMethod.BIZUM,
          "google-pay": PaymentMethod.TARJETA,
          "apple-pay": PaymentMethod.TARJETA,
        };

        const recipient: CustomerData = {
          name: `${sNombre} ${sApellidos}`.trim(),
          taxId: nifCheck.normalized,
          taxIdType:
            nifCheck.type === "DNI"
              ? TaxIdType.NIF
              : nifCheck.type === "NIE"
                ? TaxIdType.NIE
                : nifCheck.type === "CIF"
                  ? TaxIdType.CIF
                  : TaxIdType.NIF,
          email: form.email,
          phone: sTelefono,
          countryCode: form.pais || "ES",
          address: {
            street: sDireccion,
            city: sCiudad,
            postalCode: sCp,
            province: sProvincia,
            country: form.pais === "ES" ? "España" : form.pais,
            countryCode: form.pais || "ES",
          },
        };

        // FIXED: Distribute discount with remainder correction on last line
        // This prevents rounding drift (0.01-0.02€) across multiple lines
        const totalProductDiscount = couponDiscount + pointsDiscount;
        const discountRatio = total > 0 ? totalProductDiscount / total : 0;

        let discountDistributed = 0;
        const invoiceItems = items.map((item, idx) => {
          const lineGross = Math.round(item.price * item.quantity * 100) / 100;
          let lineDiscountAmt: number;
          if (idx === items.length - 1) {
            // Last line absorbs remaining cents
            lineDiscountAmt = Math.round((totalProductDiscount - discountDistributed) * 100) / 100;
          } else {
            lineDiscountAmt = Math.round(lineGross * discountRatio * 100) / 100;
          }
          discountDistributed = Math.round((discountDistributed + lineDiscountAmt) * 100) / 100;
          const lineDiscountPct = lineGross > 0 ? Math.min((lineDiscountAmt / lineGross) * 100, 100) : 0;

          return buildLineItem({
            lineNumber: idx + 1,
            productId: item.key,
            description: item.name,
            quantity: item.quantity,
            unitPriceWithVAT: item.price,
            vatRate: 21,
            discount: lineDiscountPct,
          });
        });

        const invoice = await createInvoice({
          recipient,
          items: invoiceItems,
          paymentMethod: paymentMethodMap[form.pago] ?? PaymentMethod.TARJETA,
          sourceOrderId: id,
        });

        saveInvoice(invoice);
        // saveInvoice also generates the journal entry (partida doble) automatically.

        // Generate payment entry for immediate payment methods
        // (tarjeta, bizum, paypal, google-pay, apple-pay → cobro inmediato)
        const immediatePayments = ["tarjeta", "bizum", "paypal", "google-pay", "apple-pay"];
        if (immediatePayments.includes(form.pago)) {
          void (async () => {
            try {
              const { createPaymentEntry } = await import("@/accounting/journalEngine");
              await createPaymentEntry(
                invoice.invoiceNumber,
                form.pago,
                invoice.totals.totalInvoice,
                new Date().toISOString().slice(0, 10),
              );
            } catch { /* payment entry is non-critical — autopilot detects gaps */ }
          })();
        }

        // Store invoice ID in the order (vía adapter SSOT: safeWrite + evento).
        patchCheckoutOrder(id, { invoiceId: invoice.invoiceId } as Partial<CheckoutOrder> & { invoiceId: string });
      } catch (invoiceErr) {
        // Dead letter queue — invoice can be regenerated later by admin
        enqueueDeadLetter("invoice_send", {
          orderId: id,
          total: safeFinalTotal,
          email: form.email,
          pago: form.pago,
          itemCount: items.length,
        }, invoiceErr instanceof Error ? invoiceErr.message : "Unknown error");

        // Also log as incident
        const incidentLog = safeRead<unknown[]>("tcgacademy_incidents", []);
        incidentLog.unshift({
          ts: new Date().toISOString(),
          type: "invoice_generation_failed",
          orderId: id,
          error: invoiceErr instanceof Error ? invoiceErr.message : "Unknown error",
          total: safeFinalTotal,
        });
        safeWrite("tcgacademy_incidents", incidentLog);
      }
    }

    // ── PHASE 4: Payment status is set by checkoutOrderToAdmin()
    // via derivePaymentStatus() when appendToAdminInbox() runs.
    // No separate storage key needed — SSOT lives on AdminOrder.paymentStatus.

    // ── PHASE 5: Award purchase points (on discounted base, not full price) ──
    if (user?.role === "cliente") {
      // Award on pointsBase (subtotal minus discounts, excluding shipping)
      // This prevents earning points on free orders from stacked discounts
      if (pointsBase > 0) {
        awardPurchasePoints(user.id, pointsBase);

        // Notify every group member that this buyer just purchased
        const buyerDisplay = `${user.name} ${user.lastName.charAt(0)}.`;
        const euros = Math.floor(pointsBase);
        const assocPts = Math.floor((euros * REFERRAL_ASSOC_PTS_PER_100) / 100);
        const assocs = getAssociations(user.id);
        for (const assoc of assocs) {
          pushUserNotification(assoc.referrerId, {
            type: "asociacion",
            title: `${buyerDisplay} ha hecho una compra`,
            message: assocPts > 0
              ? `Un miembro de tu grupo acaba de comprar €${euros}. Has recibido ${assocPts} puntos.`
              : `Un miembro de tu grupo acaba de hacer una compra.`,
            date: new Date().toISOString(),
            link: "/cuenta/grupo",
          });
        }
      }
    }

    // ── PHASE 6: Decrement stock ──
    // Usar persistProductPatch para que el decremento se aplique a la colección
    // correcta (admin-created → tcgacademy_new_products; estático → overrides).
    // Antes, escribir siempre a overrides dejaba huérfano el decremento para
    // productos admin-created → se vendía stock infinito. Ver GOTCHA 5.
    try {
      for (const item of items) {
        const productId = parseInt(item.key?.replace("item_", "") ?? "0");
        if (!productId) continue;
        const product = getMergedById(productId);
        if (product?.stock !== undefined && typeof product.stock === "number") {
          const newStock = Math.max(0, product.stock - item.quantity);
          persistProductPatch(productId, {
            stock: newStock,
            inStock: newStock > 0,
          });
        }
      }
      window.dispatchEvent(new Event("tcga:products:updated"));
    } catch { /* stock update is non-critical */ }

    // ── PHASE 7: Record coupon usage ──
    if (pending?.appliedCoupon?.code && user?.id) {
      try {
        recordCouponUsage(pending.appliedCoupon.code, user.id, id);
        markCouponUsed(pending.appliedCoupon.code, form.email);
      } catch { /* coupon tracking is non-critical */ }
    }

    // ── PHASE 8: Send confirmation emails (renders template + Resend en server mode) ──
    try {
      const tienda = isStorePickup && form.tiendaRecogida
        ? TIENDAS.find(t => t.id === form.tiendaRecogida)
        : null;
      const paymentLabel: Record<string, string> = {
        tarjeta: "Tarjeta",
        paypal: "PayPal",
        bizum: "Bizum",
        "google-pay": "Google Pay",
        "apple-pay": "Apple Pay",
        transferencia: "Transferencia bancaria",
        tienda: "Pago en tienda al recoger",
      };
      const itemsHtml = items
        .map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${(i.price * i.quantity).toFixed(2)}€</td></tr>`)
        .join("");
      const addressBlock = tienda
        ? `Recogida en: ${tienda.name} — ${tienda.address ?? ""}`
        : `${form.direccion}, ${form.ciudad} ${form.cp}, ${form.provincia}`;

      const confirmVars = {
        nombre: form.nombre || "cliente",
        order_id: id,
        order_date: new Date().toLocaleDateString("es-ES"),
        items_html: itemsHtml,
        subtotal: total.toFixed(2),
        shipping: isStorePickup ? "Gratis (recogida)" : shipping === 0 ? "Gratis" : `${shipping.toFixed(2)}€`,
        total: safeFinalTotal.toFixed(2),
        address: addressBlock,
        payment_method: paymentLabel[form.pago] ?? form.pago,
        unsubscribe_link: "#",
      };

      await sendAppEmail({
        toEmail: form.email,
        toName: `${form.nombre} ${form.apellidos}`.trim(),
        templateId: "confirmacion_pedido",
        vars: confirmVars,
        preview: isStorePickup && tienda
          ? `Pedido ${id} para recoger en ${tienda.name}. Total: ${safeFinalTotal.toFixed(2)}€ (pago al recoger)`
          : `Pedido ${id} confirmado. Total: ${safeFinalTotal.toFixed(2)}€`,
      });

      // Notificación adicional a la tienda para pedidos de recogida
      if (tienda) {
        const productList = items.map(i => `${i.quantity}× ${i.name}`).join(", ");
        await sendAppEmail({
          toEmail: tienda.email,
          toName: tienda.name,
          templateId: "confirmacion_pedido",
          vars: confirmVars,
          preview: `Cliente: ${form.nombre} ${form.apellidos} · ${productList} · Total: ${safeFinalTotal.toFixed(2)}€ (cobrar al recoger)`,
        });
      }
    } catch { /* email log is non-critical */ }

    // ── Log point deduction failure for admin to see ──
    if (user?.role === "cliente" && appliedPoints?.points && !pointsDeducted) {
      // Order went through but points weren't deducted — flag it vía adapter SSOT.
      patchCheckoutOrder(id, { pointsDeductionFailed: true } as Partial<CheckoutOrder> & { pointsDeductionFailed: boolean });
    }

    clearCart();
    setStep("confirmado");
    } finally {
      releaseCheckoutLock();
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!count && step !== "confirmado")
    return (
      <div className="mx-auto max-w-[600px] px-4 py-12 sm:px-6 sm:py-24 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-700">
          Tu carrito está vacío
        </h1>
        <Link
          href="/catalogo"
          className="font-semibold text-[#2563eb] hover:underline"
        >
          Volver al catálogo
        </Link>
      </div>
    );

  // Si estamos redirigiendo al usuario a completar-datos, no renderizamos el
  // formulario (evita un flash del checkout con datos vacíos).
  if (!profileGuardReady && step !== "confirmado") {
    return (
      <div className="mx-auto flex min-h-[300px] max-w-[600px] items-center justify-center px-4 py-12 text-center text-sm text-gray-500">
        Verificando tus datos…
      </div>
    );
  }

  if (step === "confirmado") {
    const pickupStore = form.tiendaRecogida ? TIENDAS.find(t => t.id === form.tiendaRecogida) : null;
    return (
      <div className="mx-auto max-w-[600px] px-4 py-12 sm:px-6 sm:py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          {pickupStore ? "Pedido listo para recoger" : "Pedido confirmado"}
        </h1>
        <p className="mb-2 text-gray-600">
          {pickupStore
            ? "Hemos recibido tu pedido. Te avisaremos cuando esté preparado para recoger."
            : "Gracias por tu compra. Te hemos enviado un email de confirmación."}
        </p>
        <p className="mb-4 text-sm text-gray-500">
          Número de pedido:{" "}
          <span className="font-bold text-gray-800">{orderId}</span>
        </p>

        {/* Store pickup info */}
        {pickupStore && (
          <div className="mx-auto mb-6 max-w-sm rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left">
            <p className="mb-1 text-sm font-bold text-gray-900">
              Recogida en {pickupStore.name}
            </p>
            <p className="mb-1 text-sm text-gray-600">{pickupStore.address}</p>
            <p className="mb-2 text-xs text-gray-400">Pago al recoger — {finalTotal.toFixed(2)}€</p>
            <p className="text-xs text-blue-600">
              Hemos notificado a la tienda. Te enviaremos un email cuando tu pedido esté listo.
            </p>
          </div>
        )}

        {user?.role === "cliente" && finalTotal > 0 && !pickupStore && (
          <div className="mx-auto mb-6 flex max-w-xs items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <Trophy size={16} className="flex-shrink-0 text-amber-500" />
            <span>
              Has ganado{" "}
              <strong>+{Math.floor(pointsBase * POINTS_PER_EURO)} puntos</strong>{" "}
              por esta compra
            </span>
          </div>
        )}
        {/* Right of withdrawal notice — Art. 102 TRLGDCU */}
        <div className="mx-auto mb-6 max-w-md rounded-xl border border-gray-200 bg-gray-50 p-4 text-left text-xs leading-relaxed text-gray-500">
          <p className="mb-1 font-semibold text-gray-700">
            Derecho de desistimiento
          </p>
          <p>
            De conformidad con el art. 102 del TRLGDCU, dispones de{" "}
            <strong>14 días naturales</strong> desde la recepción del pedido
            para ejercer tu derecho de desistimiento sin necesidad de
            justificación.{" "}
            <Link
              href="/devoluciones"
              className="font-medium text-[#2563eb] hover:underline"
            >
              Más información y formulario
            </Link>
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/cuenta/pedidos"
            className="inline-block rounded-xl bg-[#2563eb] px-8 py-4 font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/"
            className="inline-block rounded-xl border-2 border-gray-200 px-8 py-4 font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/carrito"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#2563eb]"
      >
        <ArrowLeft size={14} /> Volver al carrito
      </Link>

      {/* Steps */}
      <div className="mb-10 flex items-center gap-2">
        {(isStorePickup ? (["datos"] as Step[]) : (["datos", "pago"] as Step[])).map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${step === s ? "bg-[#2563eb] text-white" : arr.indexOf(step) > i ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              {arr.indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm font-medium ${step === s ? "text-[#2563eb]" : "text-gray-400"}`}
            >
              {s === "datos" ? "Datos y entrega" : "Pago"}
            </span>
            {i < arr.length - 1 && <div className="mx-1 h-0.5 w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          {step === "datos" && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setTriedSubmitDatos(true);
                const formEl = e.currentTarget;
                // Validación extra: si es pickup, debe haber tienda seleccionada.
                if (isStorePickup && !form.tiendaRecogida) return;
                if (!formEl.checkValidity()) return;
                // Pickup → sin pago online, confirmamos directo.
                // Envío a domicilio → al paso "pago".
                if (isStorePickup) {
                  handleOrder();
                } else {
                  setStep("pago");
                }
              }}
              className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6"
            >
              {/* Método de entrega — PRIMERO, para saber si pedir dirección */}
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                <Truck size={20} /> ¿Cómo quieres recibirlo?
              </h2>
              <div className="space-y-2">
                {[
                  {
                    id: "estandar",
                    label: "Envío a domicilio (GLS)",
                    sub: "Entrega en menos de 24h",
                    price: total >= SITE_CONFIG.shippingThreshold ? "Gratis" : "3,99€",
                    icon: null,
                  },
                  {
                    id: "tienda",
                    label: "Recogida en tienda",
                    sub: "Sin coste de envío · paga al recoger si quieres",
                    price: "Gratis",
                    icon: <Store size={14} className="text-[#2563eb]" />,
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                      form.envio === opt.id ? "border-[#2563eb] bg-blue-50/40" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="envio"
                      value={opt.id}
                      checked={form.envio === opt.id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          envio: e.target.value,
                          // Si elige pickup, limpiar tienda previa si queda inválida.
                          tiendaRecogida: e.target.value === "tienda" ? f.tiendaRecogida : "",
                          // Pago coherente con método de entrega.
                          pago: e.target.value === "tienda" ? "tienda" : f.pago === "tienda" ? "tarjeta" : f.pago,
                        }))
                      }
                      className="accent-[#2563eb]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        {opt.icon}
                        {opt.label}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">{opt.sub}</div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{opt.price}</span>
                  </label>
                ))}
              </div>

              {/* Selector de tienda — inline, sólo si pickup */}
              {isStorePickup && (
                <div className="space-y-2 rounded-xl border-2 border-[#2563eb]/20 bg-blue-50/30 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    Elige la tienda de recogida:
                  </p>
                  {TIENDAS.map((t) => (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                        form.tiendaRecogida === t.id ? "border-[#2563eb] bg-white" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tiendaRecogida"
                        value={t.id}
                        checked={form.tiendaRecogida === t.id}
                        onChange={(e) => setForm((f) => ({ ...f, tiendaRecogida: e.target.value }))}
                        className="accent-[#2563eb]"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.address}</div>
                      </div>
                    </label>
                  ))}
                  {triedSubmitDatos && !form.tiendaRecogida && (
                    <p className="text-xs font-semibold text-red-600">
                      Selecciona una tienda para poder continuar.
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-gray-600">
                    <strong>Pagarás al recoger.</strong> Recibirás la factura
                    oficial en el momento de la recogida, una vez confirmado el
                    cobro.
                  </p>
                </div>
              )}

              <h2 className="mb-4 pt-4 text-lg font-bold text-gray-900">
                Datos personales
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["nombre", "Nombre *", "text", true],
                    ["apellidos", "Apellidos *", "text", true],
                    ["nif", "NIF / NIE / CIF *", "text", true],
                    ["email", "Email *", "email", true],
                    ["telefono", "Teléfono *", "tel", true],
                  ] as [keyof typeof form, string, string, boolean][]
                ).map(([key, label, type, req]) => {
                  const isNif = key === "nif";
                  const isEmail = key === "email";
                  const isPhone = key === "telefono";
                  // Borde rojo si: submit intentado con campo vacío, O validación
                  // on-blur falló (letra NIF, email, teléfono mal formateado).
                  const missingOnSubmit =
                    triedSubmitDatos && req && !form[key].toString().trim();
                  const fmtInvalid = fmt.isFieldInvalid(key);
                  const hasError = missingOnSubmit || fmtInvalid;
                  const onBlur = () => {
                    const v = form[key].toString().trim();
                    if (!v) return; // vacío lo gestiona el check de required
                    if (isNif) {
                      const r = validateSpanishNIF(v);
                      if (!r.valid) {
                        fmt.failWith(
                          "nif",
                          r.error ?? "NIF / NIE / CIF inválido",
                        );
                      }
                      return;
                    }
                    if (isEmail && !CHECKOUT_EMAIL_REGEX.test(v)) {
                      fmt.failWith("email", "Email inválido.");
                      return;
                    }
                    if (isPhone && !CHECKOUT_PHONE_REGEX.test(v)) {
                      fmt.failWith(
                        "telefono",
                        "Teléfono: solo dígitos, espacios, + y -().",
                      );
                      return;
                    }
                  };
                  return (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {label}
                    </label>
                    <input
                      required={req}
                      type={type}
                      value={form[key]}
                      maxLength={isNif ? 9 : undefined}
                      autoComplete={isNif ? "off" : undefined}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [key]: isNif
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                        }))
                      }
                      onFocus={() => fmt.clearIfCurrent(key)}
                      onBlur={onBlur}
                      aria-invalid={hasError}
                      className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none ${hasError ? "border-red-400" : "border-gray-200"} ${isNif ? "font-mono uppercase tracking-wider" : ""}`}
                    />
                    {isNif && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Obligatorio para factura (Art. 6.1.d RD 1619/2012)
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
              {/* ── Dirección de envío — SÓLO si NO es recogida en tienda ── */}
              {!isStorePickup && (
              <>
              <h2 className="pt-4 text-lg font-bold text-gray-900">
                Dirección de envío
              </h2>

              {/* Selector de direcciones guardadas (solo usuarios con direcciones) */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500">
                    Elige una dirección guardada o añade una nueva
                  </p>
                  {savedAddresses.map((addr) => {
                    const checked = selectedAddrId === addr.id;
                    return (
                      <label
                        key={addr.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                          checked
                            ? "border-[#2563eb] bg-blue-50/40"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          value={addr.id}
                          checked={checked}
                          onChange={() => applySelectedAddress(addr.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <MapPin size={14} className="text-gray-400" />
                            <span className="text-sm font-bold text-gray-900">
                              {addr.label}
                            </span>
                            {addr.predeterminada && (
                              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                                <Star size={9} className="fill-[#2563eb]" /> Predeterminada
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-700">
                            {addr.nombre} {addr.apellidos}
                          </p>
                          <p className="text-sm text-gray-600">
                            {addr.calle} {addr.numero}
                            {addr.piso ? `, ${addr.piso}` : ""} · {addr.cp}{" "}
                            {addr.ciudad}
                            {addr.provincia ? `, ${addr.provincia}` : ""}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                      selectedAddrId === "new"
                        ? "border-[#2563eb] bg-blue-50/40"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      value="new"
                      checked={selectedAddrId === "new"}
                      onChange={() => applySelectedAddress("new")}
                      className="h-4 w-4 shrink-0 accent-[#2563eb]"
                    />
                    <Plus size={16} className="text-[#2563eb]" />
                    <span className="text-sm font-semibold text-gray-800">
                      Añadir nueva dirección
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Dirección *
                </label>
                <input
                  required
                  value={form.direccion}
                  readOnly={usingSavedAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                  placeholder="Calle, número, piso..."
                  className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none ${
                    usingSavedAddress ? "cursor-not-allowed bg-gray-50 text-gray-500" : ""
                  } ${triedSubmitDatos && !form.direccion.trim() ? "border-red-400" : "border-gray-200"}`}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    CP *
                  </label>
                  <input
                    required
                    pattern="[0-9]{5}"
                    title="Código postal de 5 dígitos"
                    value={form.cp}
                    readOnly={usingSavedAddress}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cp: e.target.value }))
                    }
                    onFocus={() => fmt.clearIfCurrent("cp")}
                    onBlur={() => {
                      const v = form.cp.trim();
                      if (!v) return;
                      if (!/^[0-9]{5}$/.test(v)) {
                        fmt.failWith(
                          "cp",
                          "El código postal debe tener 5 dígitos.",
                        );
                      }
                    }}
                    aria-invalid={
                      fmt.isFieldInvalid("cp") ||
                      (triedSubmitDatos &&
                        (!form.cp.trim() || !/^[0-9]{5}$/.test(form.cp)))
                    }
                    placeholder="28001"
                    className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none ${
                      usingSavedAddress ? "cursor-not-allowed bg-gray-50 text-gray-500" : ""
                    } ${fmt.isFieldInvalid("cp") || (triedSubmitDatos && (!form.cp.trim() || !/^[0-9]{5}$/.test(form.cp))) ? "border-red-400" : "border-gray-200"}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Ciudad *
                  </label>
                  <input
                    required
                    value={form.ciudad}
                    readOnly={usingSavedAddress}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ciudad: e.target.value }))
                    }
                    className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none ${
                      usingSavedAddress ? "cursor-not-allowed bg-gray-50 text-gray-500" : ""
                    } ${triedSubmitDatos && !form.ciudad.trim() ? "border-red-400" : "border-gray-200"}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Provincia
                  </label>
                  <input
                    value={form.provincia}
                    readOnly={usingSavedAddress}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, provincia: e.target.value }))
                    }
                    className={`h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none ${
                      usingSavedAddress ? "cursor-not-allowed bg-gray-50 text-gray-500" : ""
                    }`}
                  />
                </div>
              </div>
              {usingSavedAddress && (
                <p className="text-xs text-gray-500">
                  Editando bloqueado — para modificar esta dirección, ve a{" "}
                  <Link href="/cuenta/datos" className="font-semibold text-[#2563eb] underline">
                    Mis direcciones
                  </Link>
                  .
                </p>
              )}
              </>
              )}
              {fmt.error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="shrink-0">⚠</span> {fmt.error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || (isStorePickup && !form.tiendaRecogida)}
                className="w-full rounded-xl bg-[#2563eb] py-4 font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStorePickup
                  ? submitting
                    ? "Procesando…"
                    : `Confirmar pedido — ${finalTotal.toFixed(2)}€`
                  : "Continuar al pago"}
              </button>
            </form>
          )}

          {step === "pago" && (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <CreditCard size={20} /> Método de pago
              </h2>
              {[
                ...(isStorePickup
                  ? [
                      {
                        id: "tienda",
                        label: "Pago en tienda",
                        sub: "Paga al recoger tu pedido en la tienda",
                        logos: null,
                      },
                    ]
                  : []),
                ...(!isStorePickup
                  ? [
                      {
                        id: "tarjeta",
                        label: "Tarjeta de crédito/débito",
                        sub: "Visa, Mastercard, Amex",
                        logos: [
                          { src: "/images/payment/visa.svg", alt: "Visa", w: 36, h: 12 },
                          { src: "/images/payment/mastercard.svg", alt: "Mastercard", w: 28, h: 18 },
                        ],
                      },
                      {
                        id: "paypal",
                        label: "PayPal",
                        sub: "Pago rápido con tu cuenta PayPal",
                        logos: [
                          { src: "/images/payment/paypal.svg", alt: "PayPal", w: 56, h: 15 },
                        ],
                      },
                      {
                        id: "bizum",
                        label: "Bizum",
                        sub: "Solo para clientes de bancos españoles",
                        logos: [
                          { src: "/images/payment/bizum.svg", alt: "Bizum", w: 48, h: 14 },
                        ],
                      },
                      {
                        id: "google-pay",
                        label: "Google Pay",
                        sub: "Pago rápido con tu cuenta Google",
                        logos: [
                          { src: "/images/payment/google-pay.svg", alt: "Google Pay", w: 50, h: 18 },
                        ],
                      },
                      {
                        id: "apple-pay",
                        label: "Apple Pay",
                        sub: "Pago rápido con tu dispositivo Apple",
                        logos: [
                          { src: "/images/payment/apple-pay.svg", alt: "Apple Pay", w: 50, h: 18 },
                        ],
                      },
                    ]
                  : []),
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${form.pago === opt.id ? "border-[#2563eb] bg-blue-50/40" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <input
                    type="radio"
                    name="pago"
                    value={opt.id}
                    checked={form.pago === opt.id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pago: e.target.value }))
                    }
                    className="accent-[#2563eb]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {opt.id === "tienda" && (
                        <Store size={14} className="text-[#2563eb]" />
                      )}
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {opt.sub}
                    </div>
                  </div>
                  {opt.logos && (
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {opt.logos.map((logo) => (
                        <span key={logo.alt} className="flex items-center justify-center rounded border border-gray-200 bg-white px-1.5 py-0.5">
                          <Image src={logo.src} alt={logo.alt} width={logo.w} height={logo.h} className="object-contain" />
                        </span>
                      ))}
                    </div>
                  )}
                </label>
              ))}
              {/* Points redemption — only for clientes */}
              {user?.role === "cliente" && userPoints > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                      <Star size={14} className="text-amber-500" />
                      Usar mis puntos
                    </p>
                    <span className="text-xs font-semibold text-amber-600">
                      {userPoints.toLocaleString("es-ES")} pts disponibles
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-amber-600">
                    Máximo {(POINTS_MAX_DISCOUNT_PCT * 100).toFixed(0)}% del subtotal — hasta{" "}
                    <strong>{maxPointsDiscount.toFixed(2)}€</strong> de descuento en esta compra.
                  </p>
                  {appliedPoints ? (
                    <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-white px-3 py-2.5">
                      <p className="text-sm font-bold text-amber-700">
                        <Star size={12} className="mr-1 inline text-amber-400" />
                        {appliedPoints.points.toLocaleString("es-ES")} pts = <strong>-{appliedPoints.euros.toFixed(2)}€</strong>
                      </p>
                      <button
                        onClick={() => setAppliedPoints(null)}
                        aria-label="Quitar puntos"
                        className="flex min-h-[28px] min-w-[28px] items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : pointsTiers.length === 0 ? (
                    <p className="text-xs text-amber-600">
                      Con tu saldo actual no puedes aplicar puntos a este pedido.
                    </p>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setShowPointsPanel(!showPointsPanel)}
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-amber-300 bg-white px-3 text-sm text-gray-700 transition hover:border-amber-400"
                      >
                        <span className="text-amber-700">Seleccionar cantidad a descontar...</span>
                        <ChevronDown size={14} className={`text-amber-500 transition ${showPointsPanel ? "rotate-180" : ""}`} />
                      </button>
                      {showPointsPanel && (
                        <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
                          {pointsTiers.map((tier) => (
                            <button
                              key={tier.points}
                              onClick={() => { setAppliedPoints({ points: tier.points, euros: tier.euros }); setShowPointsPanel(false); }}
                              className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-gray-800 transition hover:bg-amber-50"
                            >
                              <span className="flex items-center gap-1.5">
                                <Star size={12} className="text-amber-400" />
                                {tier.points.toLocaleString("es-ES")} puntos
                              </span>
                              <span className="font-bold text-amber-600">-{tier.euros.toFixed(2)}€</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                <Shield size={14} className="flex-shrink-0 text-green-500" />
                Pago 100% seguro con cifrado SSL. Tus datos bancarios nunca se
                almacenan en nuestros servidores.
              </div>
              {orderError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {orderError}
                </div>
              )}
              {/* Información precontractual — Art. 97 TRLGDCU + Art. 60 RD 1/2007 */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-900">
                <p className="mb-1.5 font-bold text-blue-800">Información precontractual obligatoria</p>
                <ul className="space-y-1 text-blue-900/90">
                  <li>
                    <strong>Total a pagar:</strong> {finalTotal.toFixed(2)}€ (IVA {SITE_CONFIG.vatRate}% incluido). Envío: {shipping === 0 ? "gratuito" : `${shipping.toFixed(2)}€`}.
                  </li>
                  <li>
                    <strong>Vendedor:</strong> {SITE_CONFIG.legalName} — CIF {SITE_CONFIG.cif} — {SITE_CONFIG.address}.
                  </li>
                  <li>
                    <strong>Derecho de desistimiento:</strong> 14 días naturales desde la recepción (Art. 102 TRLGDCU), sin justificación.
                  </li>
                  <li>
                    <strong>Entrega estimada:</strong> {SITE_CONFIG.dispatchHours}h laborables tras confirmación de pago.
                  </li>
                </ul>
              </div>
              {/* Legal checkboxes — Art. 97 TRLGDCU + Art. 6 RGPD */}
              <div className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <label className="flex cursor-pointer items-start gap-2.5 select-none">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                    aria-label="Aceptar términos y condiciones"
                  />
                  <span className="text-xs leading-relaxed text-gray-600">
                    He leído y acepto los{" "}
                    <Link href="/terminos" target="_blank" className="font-semibold text-[#2563eb] hover:underline">
                      términos y condiciones
                    </Link>{" "}
                    y el{" "}
                    <Link href="/devoluciones" target="_blank" className="font-semibold text-[#2563eb] hover:underline">
                      derecho de desistimiento
                    </Link>{" "}
                    (14 días) *
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 select-none">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                    aria-label="Aceptar política de privacidad"
                  />
                  <span className="text-xs leading-relaxed text-gray-600">
                    He leído la{" "}
                    <Link href="/privacidad" target="_blank" className="font-semibold text-[#2563eb] hover:underline">
                      política de privacidad
                    </Link>{" "}
                    y autorizo el tratamiento de mis datos para procesar este pedido (Art. 6.1.b RGPD) *
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("datos")}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Atrás
                </button>
                <button
                  onClick={handleOrder}
                  disabled={submitting || !acceptTerms || !acceptPrivacy}
                  className="flex-1 rounded-xl bg-[#2563eb] py-3.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Procesando..." : `Confirmar pedido — ${finalTotal.toFixed(2)}€`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="sticky top-36 h-fit rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-bold text-gray-900">Tu pedido ({count})</h3>
          <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  <Image
                    src={item.image || "/placeholder-card.jpg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized={
                      !!item.image &&
                      (item.image.startsWith("http") ||
                        item.image.startsWith("data:") ||
                        item.image.startsWith("blob:"))
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-semibold text-gray-800">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">x{item.quantity}</p>
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-gray-900">
                  {(item.price * item.quantity).toFixed(2)}€
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{total.toFixed(2)}€</span>
            </div>
            {pending?.appliedCoupon && pending.appliedCoupon.discountType !== "shipping" && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-green-600">
                  <Tag size={12} /> {pending.appliedCoupon.code}
                </span>
                <span className="font-semibold text-green-600">
                  -{couponDiscount.toFixed(2)}€
                </span>
              </div>
            )}
            {appliedPoints && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-amber-600">
                  <Star size={12} /> {appliedPoints.points.toLocaleString("es-ES")} puntos
                </span>
                <span className="font-semibold text-amber-600">
                  -{pointsDiscount.toFixed(2)}€
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Envío</span>
              <span className="font-semibold text-green-600">
                {shipping === 0
                  ? hasFreeShippingCoupon
                    ? `Gratis · ${pending!.appliedCoupon!.code}`
                    : "Gratis"
                  : `${shipping.toFixed(2)}€`}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
              <span>Total</span>
              <span className="text-[#2563eb]">{finalTotal.toFixed(2)}€</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
