"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  X,
  Banknote,
  CreditCard,
  Receipt,
  FileText,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Package,
  ScanLine,
  User as UserIcon,
  PenLine,
  Tag,
  RotateCcw,
  Search as SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getMergedProducts } from "@/lib/productStore";
import Image from "next/image";
import { GAME_CONFIG, isNewProduct } from "@/data/products";
import type { LocalProduct } from "@/data/products";
import { TPV_SNACKS } from "@/data/tpvSnacks";
import { EVENTS } from "@/data/events";
import { eventToVirtualProduct } from "@/lib/eventProduct";
import {
  MOBILE_GAMES,
  MOBILE_GAMES_BG,
  MOBILE_GAMES_SPRITE_SRC,
  MOBILE_GAMES_SPRITE_H,
  type MobileGame,
} from "@/data/mobileGames";
import { LanguageFlag } from "@/components/ui/LanguageFlag";
import { getEffectivePriceWithVat } from "@/lib/pricing";
import { SITE_CONFIG } from "@/config/siteConfig";
import {
  completeTpvSale,
  computeTpvTotal,
  newManualLineId,
  type TpvSaleLine,
  type TpvCustomer,
  type CompleteSaleResult,
} from "@/services/tpvService";
import { loadInvoices, rectifyInvoice } from "@/services/invoiceService";
import {
  loadStoreInvoices,
  rectifyStoreInvoice,
} from "@/services/tpvStoreInvoiceService";
import { CorrectionType, type InvoiceRecord } from "@/types/fiscal";
import { DataHub } from "@/lib/dataHub";
import { TPV_STORES, type TpvStoreSlug } from "@/config/tpvStores";
import { getStoreStockMap } from "@/services/tpvStoreStockService";

// ─── Tipos UI ────────────────────────────────────────────────────────────────

type SaleMode = "ticket" | "factura";
type PaymentMethod = "efectivo" | "tarjeta";

/**
 * Descuento manual aplicado al total. El operador elige el modo:
 *   · "percent" → value es el % (0-100)
 *   · "euro"    → value es el importe absoluto en € a descontar.
 * En ambos casos el descuento se reparte proporcionalmente entre las líneas
 * (factor común sobre el unit price con IVA), así el desglose de IVA por
 * línea queda coherente y no hay que tocar `calcVAT()`.
 */
type TpvDiscount = { type: "percent" | "euro"; value: number };

/** Importe €€ que representa un descuento sobre un subtotal dado. */
function discountAmount(d: TpvDiscount | null, subtotal: number): number {
  if (!d || d.value <= 0 || subtotal <= 0) return 0;
  if (d.type === "percent") {
    const pct = Math.min(100, Math.max(0, d.value));
    return +(subtotal * (pct / 100)).toFixed(2);
  }
  return +Math.min(subtotal, Math.max(0, d.value)).toFixed(2);
}

/** Aplica el descuento como factor multiplicativo sobre el unit price con IVA. */
function applyDiscountToLines(
  lines: TpvSaleLine[],
  discount: TpvDiscount | null,
): TpvSaleLine[] {
  if (!discount || discount.value <= 0) return lines;
  const subtotal = lines.reduce(
    (s, l) => s + l.unitPriceWithVat * l.quantity,
    0,
  );
  if (subtotal <= 0) return lines;
  const desc = discountAmount(discount, subtotal);
  if (desc <= 0) return lines;
  const factor = (subtotal - desc) / subtotal;
  return lines.map((l) => ({
    ...l,
    unitPriceWithVat: +(l.unitPriceWithVat * factor).toFixed(2),
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `${n.toFixed(2)} €`;

/**
 * Resuelve un query del scanner/búsqueda a un producto:
 *   1. Match exacto por `gtin13` (EAN-13 del lector de códigos).
 *   2. Match exacto por `id` numérico.
 *   3. Match exacto por `mpn` (referencia interna).
 *   4. Fuzzy por `name` (substring case-insensitive) — sólo si query >= 3 chars.
 */
function findProduct(
  products: LocalProduct[],
  rawQuery: string,
): LocalProduct | null {
  const q = rawQuery.trim();
  if (!q) return null;
  // 1) gtin13 exacto — caso del lector de códigos.
  const byGtin = products.find((p) => p.gtin13 && p.gtin13 === q);
  if (byGtin) return byGtin;
  // 2) id numérico exacto.
  const asNum = Number(q);
  if (Number.isFinite(asNum)) {
    const byId = products.find((p) => p.id === asNum);
    if (byId) return byId;
  }
  // 3) mpn.
  const byMpn = products.find((p) => p.mpn && p.mpn.toLowerCase() === q.toLowerCase());
  if (byMpn) return byMpn;
  // 4) fuzzy nombre.
  if (q.length >= 3) {
    const lc = q.toLowerCase();
    return products.find((p) => p.name.toLowerCase().includes(lc)) ?? null;
  }
  return null;
}

// ─── Filtros TPV — set fijo ──────────────────────────────────────────────────
//
// La home muestra los 12 juegos del catálogo. El TPV agrupa para que el
// operador encuentre el producto rápido: 4 juegos principales + "Otros TCG"
// para todo lo demás (Yu-Gi-Oh, Lorcana, Dragon Ball, Digimon, Naruto,
// Topps, Panini, Cyberpunk, accesorios) + 2 "no-TCG": Eventos y Snacks.
//
// Para los 4 juegos principales se renderiza el MISMO logo que la home
// (sprite de `ssGamesBig.png` o PNG suelta), reutilizando MOBILE_GAMES como
// SSOT. Para los filtros "agrupados" (Otros TCG, Eventos, Snacks) se
// muestra solo texto, sin imagen — tal como aparecen en la web.

// Juegos con pill propio en el TPV. El pill "Otros TCG" agrupa el resto.
// Accesorios, eventos y snacks tienen pill aparte y NO entran en "Otros TCG".
const MAIN_GAME_SLUGS = new Set(["pokemon", "magic", "one-piece", "riftbound"]);
const TPV_NON_OTROS = new Set([
  ...MAIN_GAME_SLUGS,
  "accesorios",
  "eventos",
  "snacks",
]);

type TpvFilter = {
  key: string;
  label: string;
  /** Color de fondo del pill (estética igual que la home). */
  bg: string;
  /**
   * Slug en MOBILE_GAMES — si existe, el pill renderiza el logo del juego
   * usando el sprite/PNG canónico de la home.
   */
  mobileGameSlug?: string;
  /** Predicate sobre un producto. */
  matches: (p: LocalProduct) => boolean;
};

// Orden idéntico al de la web (MOBILE_GAMES en `src/data/mobileGames.ts`):
// Pokémon → Magic → One Piece → Riftbound → resto agrupado en Otros TCG.
// "Todos" se renderiza aparte como primer pill (siempre el más a la izquierda).
const TPV_FILTERS: TpvFilter[] = [
  {
    key: "pokemon",
    label: "Pokémon",
    bg: MOBILE_GAMES_BG,
    mobileGameSlug: "pokemon",
    matches: (p) => p.game === "pokemon",
  },
  {
    key: "magic",
    label: "Magic",
    bg: MOBILE_GAMES_BG,
    mobileGameSlug: "magic",
    matches: (p) => p.game === "magic",
  },
  {
    key: "one-piece",
    label: "One Piece",
    bg: MOBILE_GAMES_BG,
    mobileGameSlug: "one-piece",
    matches: (p) => p.game === "one-piece",
  },
  {
    key: "riftbound",
    label: "Riftbound",
    bg: MOBILE_GAMES_BG,
    mobileGameSlug: "riftbound",
    matches: (p) => p.game === "riftbound",
  },
  {
    key: "otros",
    label: "Otros TCG",
    bg: "#f1f5f9",
    matches: (p) => !TPV_NON_OTROS.has(p.game),
  },
  {
    key: "accesorios",
    label: "Accesorios",
    bg: "#e2e8f0",
    matches: (p) => p.game === "accesorios",
  },
  {
    key: "eventos",
    label: "Eventos",
    bg: "#ede9fe",
    matches: (p) => p.game === "eventos" || p.category === "evento",
  },
  {
    key: "snacks",
    label: "Snacks",
    bg: "#dcfce7",
    matches: (p) => p.game === "snacks",
  },
];

/**
 * Logo "home-style" del juego dentro del pill. Mismo pattern que el
 * componente de la home (recorte de sprite o <img> suelta). TARGET_H
 * más bajo que en la home porque el pill TPV es compacto (h-14).
 */
function GameLogoForFilter({ game }: { game: MobileGame }) {
  const TARGET_H = 38;
  if (game.sprite) {
    const renderH = game.sprite.renderH
      ? Math.round(game.sprite.renderH * (TARGET_H / 48))
      : TARGET_H;
    const scale = renderH / MOBILE_GAMES_SPRITE_H;
    const w = Math.round(game.sprite.origW * scale);
    const x = Math.round(game.sprite.origX * scale);
    return (
      <span
        role="img"
        aria-label={game.label}
        style={{
          width: w,
          height: renderH,
          maxWidth: "100%",
          backgroundImage: `url(${MOBILE_GAMES_SPRITE_SRC})`,
          backgroundSize: `auto ${renderH}px`,
          backgroundPosition: `-${x}px 0`,
          backgroundRepeat: "no-repeat",
          filter: game.sprite.filter,
        }}
      />
    );
  }
  if (!game.logo) {
    return <span className="text-xs font-bold">{game.label}</span>;
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={game.logo}
      alt={game.label}
      loading="lazy"
      style={{
        maxHeight: TARGET_H,
        maxWidth: "100%",
        filter: game.filter,
        mixBlendMode: game.blend ? "multiply" : undefined,
      }}
    />
  );
}

/**
 * Render del contenido del pill. Para los 4 juegos principales, logo
 * estilo home; para los grupos (Otros TCG, Eventos, Snacks), solo texto.
 */
function FilterPillContent({ filter }: { filter: TpvFilter }) {
  if (filter.mobileGameSlug) {
    const game = MOBILE_GAMES.find((g) => g.slug === filter.mobileGameSlug);
    if (game) return <GameLogoForFilter game={game} />;
  }
  return (
    <span className="text-center text-[11px] font-black uppercase leading-tight tracking-wide text-slate-700">
      {filter.label}
    </span>
  );
}

// ─── Card de producto TPV ────────────────────────────────────────────────────
//
// Replica el lenguaje visual de `LocalProductCard` del catálogo web (imagen
// blanca arriba con aspect 5/6, badges en esquinas, info debajo) pero
// despojada de favoritos/restock/holo/hover-zoom. El click en cualquier
// parte añade al carrito TPV — comportamiento touch-first.

function TpvProductCard({
  product,
  price,
  stock,
  disabled,
  onClick,
}: {
  product: LocalProduct;
  price: number;
  stock: number | undefined;
  disabled: boolean;
  onClick: () => void;
}) {
  const config = GAME_CONFIG[product.game];
  const color = config?.color ?? "#2563eb";
  const image = product.images[0];
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
      style={{ borderColor: `${color}33` }}
    >
      {/* Imagen — aspect cuadrado, mucho más compacto que el catálogo web */}
      <div
        className="relative aspect-square w-full flex-shrink-0 overflow-hidden"
        style={{ background: "#ffffff" }}
      >
        {image && !broken ? (
          <Image
            src={image}
            alt={`${product.name} — ${config?.name ?? product.game}`}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
            loading="lazy"
            onError={() => setBroken(true)}
            unoptimized={
              image.startsWith("data:") ||
              image.startsWith("blob:") ||
              image.startsWith("http")
            }
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1.5">
            <span className="text-2xl">{config?.emoji ?? "🃏"}</span>
            <span
              className="line-clamp-2 px-1 text-center text-[9px] font-bold leading-tight"
              style={{ color }}
            >
              {product.name}
            </span>
          </div>
        )}
        {/* Badges esquinas — sólo stock (NUEVO se quita por densidad) */}
        {stock !== undefined && (
          <span
            className={`absolute left-1.5 top-1.5 z-10 inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold leading-none text-white shadow-sm ${
              stock > 5
                ? "bg-emerald-500"
                : stock > 0
                  ? "bg-amber-500"
                  : "bg-gray-500"
            }`}
          >
            {stock > 0 ? `${stock}` : "0"}
          </span>
        )}
        {isNewProduct(product) && (
          <span className="absolute left-1.5 top-7 z-10 inline-flex h-4 items-center rounded-full bg-green-500 px-1.5 text-[9px] font-bold leading-none text-white shadow-sm">
            NEW
          </span>
        )}
        {product.language && (
          <div className="absolute right-1 top-1 z-10 scale-75 origin-top-right">
            <LanguageFlag language={product.language} size="sm" />
          </div>
        )}
      </div>
      {/* Info — densa, una sola línea de nombre */}
      <div className="flex flex-col gap-0 px-1.5 pb-1.5 pt-1">
        <h3 className="line-clamp-2 text-[10px] font-semibold leading-tight text-slate-800">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1 pt-0.5">
          <span className="text-xs font-black tabular-nums" style={{ color }}>
            {price.toFixed(2)}€
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function TpvClient({ storeSlug }: { storeSlug: TpvStoreSlug }) {
  const { user, role } = useAuth();
  const store = TPV_STORES[storeSlug];
  const [products, setProducts] = useState<LocalProduct[]>([]);
  /**
   * Stock visible al operador. Para Calpe = stock central. Para tiendas
   * standalone = map de stock propio. Se recalcula al re-cargar productos
   * y al recibir el evento `tcga:tpv_stock:updated`.
   */
  const [storeStockMap, setStoreStockMap] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [lines, setLines] = useState<TpvSaleLine[]>([]);
  const [mode, setMode] = useState<SaleMode>("ticket");
  const [customer, setCustomer] = useState<TpvCustomer>({ name: "" });
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);

  const [paying, setPaying] = useState<PaymentMethod | null>(null);
  const [cashTendered, setCashTendered] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [lastSale, setLastSale] = useState<
    (CompleteSaleResult & { lines: TpvSaleLine[]; payment: PaymentMethod; mode: SaleMode; customer?: TpvCustomer; storeName: string }) | null
  >(null);

  /**
   * Descuento manual del operador. Vive en el componente — no se persiste
   * entre ventas; al cerrar el ticket vuelve a null. La UI vive como
   * popover en el panel del ticket.
   */
  const [discount, setDiscount] = useState<TpvDiscount | null>(null);
  const [showDiscountPopover, setShowDiscountPopover] = useState(false);
  const [discountDraftType, setDiscountDraftType] = useState<"percent" | "euro">("percent");
  const [discountDraftValue, setDiscountDraftValue] = useState<string>("");

  // Modales de toolbar — línea manual y devolución.
  const [showManualLineModal, setShowManualLineModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Carga inicial + suscripción a cambios de productos (otra venta o admin que edita).
  useEffect(() => {
    const reload = () => setProducts(getMergedProducts());
    reload();
    return DataHub.on("products", reload);
  }, []);

  // Si la tienda es standalone, escuchamos cambios de su stock propio.
  useEffect(() => {
    if (store.sharesWebStock) return;
    const reload = () => setStoreStockMap(getStoreStockMap(storeSlug));
    reload();
    return DataHub.on("tpv_stock", reload);
  }, [storeSlug, store.sharesWebStock]);

  // Foco automático en el buscador — clave para que el lector de códigos
  // funcione sin clicks: el operador escanea y aparece la línea.
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Re-foco después de cada cambio en el carrito / modal cerrado.
  useEffect(() => {
    if (paying === null && !lastSale) {
      searchRef.current?.focus();
    }
  }, [lines, paying, lastSale]);

  /**
   * Resuelve el stock visible para el operador según la tienda actual.
   * Calpe = stock central (`product.stock`). Standalone = stock map propio
   * (puede ser undefined si la tienda no tiene aún ese producto registrado,
   * en cuyo caso el producto no se muestra como vendible).
   */
  function stockFor(p: LocalProduct): number | undefined {
    if (store.sharesWebStock) return p.stock;
    const v = storeStockMap[String(p.id)];
    return Number.isFinite(v) ? v : undefined;
  }

  /**
   * Productos virtuales TPV — eventos próximos + snacks de mostrador.
   * Se concatenan al pool real para que el operador los vea como si
   * fuesen productos físicos. No se persisten — los IDs viven en sus
   * rangos reservados (snacks 80M, eventos 90M).
   */
  const tpvVirtualProducts = useMemo<LocalProduct[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcomingEvents: LocalProduct[] = [];
    for (const e of EVENTS) {
      e.sessions.forEach((s, idx) => {
        if (s.date < today) return;
        try {
          upcomingEvents.push(eventToVirtualProduct(e, idx));
        } catch {
          /* sesión inválida — ignoramos */
        }
      });
    }
    return [...upcomingEvents, ...TPV_SNACKS];
  }, []);

  // ─── Productos visibles (filtro juego + búsqueda parcial) ────────────────
  const visibleProducts = useMemo(() => {
    const lc = query.trim().toLowerCase();
    // Pool: catálogo real + eventos próximos + snacks. El stock-gate
    // standalone sólo se aplica a productos del catálogo real (snacks/
    // eventos llevan stock propio o ilimitado).
    const realCatalog = products.filter((p) => {
      if (store.sharesWebStock) return p.inStock !== false;
      const v = storeStockMap[String(p.id)];
      return Number.isFinite(v) && (v as number) > 0;
    });
    const fullPool = [...realCatalog, ...tpvVirtualProducts];

    // Filtro de categoría
    const filterFn = TPV_FILTERS.find((f) => f.key === gameFilter)?.matches;
    return fullPool
      .filter((p) => {
        if (gameFilter === "all") return true;
        return filterFn ? filterFn(p) : false;
      })
      .filter((p) => {
        if (!lc) return true;
        return (
          p.name.toLowerCase().includes(lc) ||
          (p.gtin13 && p.gtin13.startsWith(lc)) ||
          String(p.id).startsWith(lc)
        );
      })
      .slice(0, 120); // límite UI — el TPV no es un catálogo
  }, [products, query, gameFilter, store.sharesWebStock, storeStockMap, tpvVirtualProducts]);

  const subtotal = useMemo(() => computeTpvTotal(lines), [lines]);
  const discountAmt = useMemo(
    () => discountAmount(discount, subtotal),
    [discount, subtotal],
  );
  const total = useMemo(
    () => +(Math.max(0, subtotal - discountAmt)).toFixed(2),
    [subtotal, discountAmt],
  );

  // ─── Acciones de carrito ────────────────────────────────────────────────
  function addProductToCart(p: LocalProduct) {
    if (!role) return;
    // Cliente final del TPV se trata como "cliente" para precios públicos.
    const pricing = getEffectivePriceWithVat(p, "cliente");
    const stock = stockFor(p);
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === p.id);
      if (idx >= 0) {
        const cur = prev[idx];
        if (stock !== undefined && cur.quantity + 1 > stock) {
          setFeedback(`Stock insuficiente: ${p.name} (${stock} disp. en ${store.name})`);
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...cur, quantity: cur.quantity + 1 };
        return next;
      }
      if (stock !== undefined && stock < 1) {
        setFeedback(`Sin stock en ${store.name}: ${p.name}`);
        return prev;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          quantity: 1,
          unitPriceWithVat: pricing.displayPrice,
          vatRate: pricing.vatRate as 0 | 4 | 10 | 21,
        },
      ];
    });
    setQuery("");
    setFeedback("");
  }

  function changeQty(productId: number, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const product = products.find((p) => p.id === productId);
          const stock = product ? stockFor(product) : undefined;
          const nextQty = l.quantity + delta;
          if (nextQty <= 0) return null;
          if (stock !== undefined && nextQty > stock) {
            setFeedback(`Stock insuficiente: ${l.name} (${stock} disp. en ${store.name})`);
            return l;
          }
          return { ...l, quantity: nextQty };
        })
        .filter((l): l is TpvSaleLine => l !== null),
    );
  }

  function removeLine(productId: number) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function clearCart() {
    setLines([]);
    setCustomer({ name: "" });
    setShowCustomerPanel(false);
    setMode("ticket");
    setFeedback("");
    setDiscount(null);
    setShowDiscountPopover(false);
    setDiscountDraftType("percent");
    setDiscountDraftValue("");
  }

  // ─── Búsqueda — Enter del lector dispara venta automática ────────────────
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const p = findProduct(products, query);
      if (p) {
        addProductToCart(p);
      } else if (query.trim()) {
        setFeedback(`No encontrado: "${query}"`);
      }
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }

  // ─── Cobro ───────────────────────────────────────────────────────────────
  async function handleConfirmPayment() {
    if (!user || !paying) return;
    if (lines.length === 0) return;
    if (paying === "efectivo") {
      const tendered = Number(cashTendered.replace(",", "."));
      if (!Number.isFinite(tendered) || tendered < total) {
        setFeedback(`Efectivo insuficiente. Total: ${fmt(total)}`);
        return;
      }
    }
    if (mode === "factura") {
      const c = customer;
      if (!c.name?.trim() || !c.taxId?.trim() || !c.address?.street || !c.address?.city || !c.address?.postalCode) {
        setFeedback("Factura completa requiere nombre, NIF y dirección.");
        return;
      }
    }
    setProcessing(true);
    setFeedback("");
    try {
      const tendered = paying === "efectivo"
        ? Number(cashTendered.replace(",", "."))
        : undefined;
      // El descuento se aplica como factor multiplicativo sobre el unit
      // price con IVA de cada línea — preserva el desglose por tipo de IVA
      // que `calcVAT` calcula a partir de cada línea.
      const linesToSell = applyDiscountToLines(lines, discount);
      const result = await completeTpvSale({
        storeSlug,
        lines: linesToSell,
        payment: paying,
        cashTendered: tendered,
        mode,
        customer: mode === "factura" ? customer : (customer.name ? customer : undefined),
        operatorId: user.id,
        operatorName: `${user.name ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
      });
      if (!result.ok && !result.invoiceId) {
        setFeedback(result.error ?? "No se pudo completar la venta.");
        setProcessing(false);
        return;
      }
      // Snapshot para el ticket de impresión: guardamos las líneas con el
      // descuento ya aplicado para que el ticket impreso refleje los precios
      // realmente cobrados.
      setLastSale({
        ...result,
        lines: linesToSell,
        payment: paying,
        mode,
        customer: customer.name ? customer : undefined,
        storeName: store.name,
      });
      // Limpiamos para la siguiente venta.
      clearCart();
      setPaying(null);
      setCashTendered("");
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Error inesperado al cobrar.",
      );
    } finally {
      setProcessing(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  if (!user || role !== "admin") {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
          <p className="font-semibold">Acceso restringido al personal admin.</p>
          <Link
            href="/login?from=/tpv"
            className="mt-4 inline-block rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const cashTenderedNum = Number(cashTendered.replace(",", ".")) || 0;
  const change = paying === "efectivo" ? Math.max(0, cashTenderedNum - total) : 0;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-50 text-slate-900">
      {/* ─── TOOLBAR PROFESIONAL ─────────────────────────────────────────
          Uso interno — NO publicidad. Tres zonas:
            · Izquierda: badge tienda (prefijo + nombre + libro + fecha)
            · Centro:    acciones operativas (línea manual / descuento /
                         devolución / reimprimir última)
            · Derecha:   operador + Salir
      */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm">
        {/* Badge de tienda — color del prefijo refleja el régimen fiscal */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-white shadow-sm ${
              store.sharesWebInvoicing ? "bg-blue-500" : "bg-purple-500"
            }`}
            title={
              store.sharesWebInvoicing
                ? "Libro central TCG Academy SL"
                : "Libro independiente"
            }
          >
            {store.invoiceSeriesPrefix}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">{store.name}</p>
            <p className="text-[10.5px] text-slate-500">
              {store.sharesWebInvoicing ? "Libro central" : "Libro propio"}
              {" · "}
              {new Date().toLocaleDateString("es-ES")}
            </p>
          </div>
        </div>

        {/* Acciones operativas — toolbar central */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowManualLineModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            title="Añadir una línea manualmente (carta suelta, artículo no catalogado)"
          >
            <PenLine size={14} className="text-blue-600" />
            Línea manual
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDiscountPopover(true);
              setDiscountDraftValue(discount ? String(discount.value) : "");
              if (discount) setDiscountDraftType(discount.type);
            }}
            disabled={lines.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Aplicar descuento manual al total (% o €)"
          >
            <Tag size={14} className="text-amber-600" />
            Descuento
            {discount && (
              <span className="ml-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                {discount.type === "percent"
                  ? `−${discount.value}%`
                  : `−${discount.value.toFixed(2)} €`}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowReturnModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            title="Procesar devolución (factura rectificativa)"
          >
            <RotateCcw size={14} className="text-rose-600" />
            Devolución
          </button>
        </div>

        {/* Operador + salida */}
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
            <UserIcon size={11} className="mr-1 inline" />
            {(user.name ?? user.email).split(" ")[0]}
          </span>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            <LogOut size={11} /> Salir
          </Link>
        </div>
      </div>

      {/* ─── MAIN GRID ────────────────────────────────────────────────── */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_440px]">
        {/* ─── PANEL IZQUIERDO — productos ──────────────────────────── */}
        <div className="flex flex-col overflow-hidden border-r border-slate-200">
          {/* Buscador — el campo donde el lector escribe */}
          <div className="border-b border-slate-200 bg-white p-3">
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
                placeholder="Escanea código de barras, escribe nombre o pulsa un producto…"
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-base font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Filtros TPV — set fijo: 4 juegos principales + Otros TCG +
              Eventos + Snacks. Pills compactos (h-14) para que el grid de
              productos respire. Active state = anillo azul. */}
          <div className="flex items-stretch gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
            <button
              onClick={() => setGameFilter("all")}
              aria-pressed={gameFilter === "all"}
              className={`flex h-14 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl text-xs font-black uppercase tracking-wide transition ${
                gameFilter === "all"
                  ? "bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-2 ring-offset-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Todos
            </button>
            {TPV_FILTERS.map((f) => {
              const active = gameFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setGameFilter(f.key)}
                  aria-label={f.label}
                  aria-pressed={active}
                  className={`relative flex h-14 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl px-2 transition ${
                    active
                      ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-white"
                      : "opacity-90 hover:opacity-100"
                  }`}
                  style={{ background: f.bg }}
                >
                  <FilterPillContent filter={f} />
                </button>
              );
            })}
          </div>

          {/* Grid de productos — cards estilo catálogo web (imagen arriba +
              nombre + precio). 5 por fila para ver más SKUs en pantalla
              sin abandonar la lectura visual del catálogo. */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
            {visibleProducts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <Package size={48} className="mb-3 opacity-40" />
                <p className="text-sm">Sin resultados</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {visibleProducts.map((p) => {
                  const pricing = getEffectivePriceWithVat(p, "cliente");
                  const stock = stockFor(p);
                  const noStock = stock !== undefined && stock <= 0;
                  return (
                    <TpvProductCard
                      key={p.id}
                      product={p}
                      price={pricing.displayPrice}
                      stock={stock}
                      disabled={noStock}
                      onClick={() => addProductToCart(p)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── PANEL DERECHO — ticket + cobro ─────────────────────────── */}
        <div className="flex flex-col overflow-hidden bg-blue-50">
          {/* Modo ticket / factura */}
          <div className="border-b border-slate-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMode("ticket"); setShowCustomerPanel(false); }}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                  mode === "ticket"
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Receipt size={16} /> Ticket
              </button>
              <button
                onClick={() => { setMode("factura"); setShowCustomerPanel(true); }}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                  mode === "factura"
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FileText size={16} /> Factura
              </button>
            </div>
            {mode === "factura" && (
              <button
                onClick={() => setShowCustomerPanel(true)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100"
              >
                <span className="text-slate-500">Cliente: </span>
                <span className="font-semibold text-slate-800">
                  {customer.name && customer.taxId
                    ? `${customer.name} · ${customer.taxId}`
                    : "(pulsa para introducir datos)"}
                </span>
              </button>
            )}
          </div>

          {/* Líneas del ticket */}
          <div className="flex-1 overflow-y-auto p-3">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <Receipt size={40} className="mb-2 opacity-40" />
                <p className="text-sm">Carrito vacío</p>
                <p className="mt-1 text-xs text-slate-400">Escanea o pulsa un producto</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((l) => (
                  <div
                    key={l.productId}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <p className="line-clamp-1 text-sm font-semibold leading-tight text-slate-900">
                      {l.name}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => changeQty(l.productId, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-base font-black text-slate-900">
                          {l.quantity}
                        </span>
                        <button
                          onClick={() => changeQty(l.productId, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-black tabular-nums text-blue-700">
                          {fmt(l.unitPriceWithVat * l.quantity)}
                        </p>
                        <button
                          onClick={() => removeLine(l.productId)}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Eliminar línea"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aviso */}
          {feedback && (
            <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} /> {feedback}
            </div>
          )}

          {/* Descuento — popover inline encima del bloque de totales.
              UX: un único botón compacto que despliega un mini-form con
              toggle %/€ + input + Aplicar/Quitar. Cuando hay descuento
              activo el botón pasa a "chip" con el valor para que sea
              obvio que la venta lleva descuento. */}
          <div className="border-t border-slate-200 bg-white px-3 pt-3">
            {discount ? (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                <span className="font-semibold text-emerald-700">
                  Descuento aplicado:{" "}
                  {discount.type === "percent"
                    ? `−${discount.value}%`
                    : `−${discount.value.toFixed(2)} €`}
                </span>
                <button
                  onClick={() => {
                    setDiscount(null);
                    setShowDiscountPopover(false);
                    setDiscountDraftValue("");
                  }}
                  className="rounded px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  Quitar
                </button>
              </div>
            ) : !showDiscountPopover ? (
              <button
                onClick={() => {
                  setShowDiscountPopover(true);
                  setDiscountDraftValue("");
                }}
                disabled={lines.length === 0}
                className="mb-2 w-full rounded-lg border border-dashed border-slate-300 bg-white py-2 text-xs font-semibold text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Añadir descuento
              </button>
            ) : (
              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Descuento
                  </span>
                  <button
                    onClick={() => setShowDiscountPopover(false)}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Cerrar descuento"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Toggle %/€ */}
                <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    onClick={() => setDiscountDraftType("percent")}
                    className={`rounded-md py-1.5 text-xs font-bold transition ${
                      discountDraftType === "percent"
                        ? "bg-blue-500 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setDiscountDraftType("euro")}
                    className={`rounded-md py-1.5 text-xs font-bold transition ${
                      discountDraftType === "euro"
                        ? "bg-blue-500 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    €
                  </button>
                </div>
                {/* Input + apply */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={discountDraftValue}
                      onChange={(e) => setDiscountDraftValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = Number(discountDraftValue.replace(",", "."));
                          if (Number.isFinite(v) && v > 0) {
                            setDiscount({ type: discountDraftType, value: v });
                            setShowDiscountPopover(false);
                          }
                        }
                      }}
                      autoFocus
                      placeholder={discountDraftType === "percent" ? "10" : "5,00"}
                      className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white pl-3 pr-9 text-sm font-bold tabular-nums text-slate-900 outline-none focus:border-blue-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {discountDraftType === "percent" ? "%" : "€"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const v = Number(discountDraftValue.replace(",", "."));
                      if (!Number.isFinite(v) || v <= 0) return;
                      setDiscount({ type: discountDraftType, value: v });
                      setShowDiscountPopover(false);
                    }}
                    className="rounded-lg bg-blue-500 px-4 text-xs font-bold text-white hover:bg-blue-600"
                  >
                    Aplicar
                  </button>
                </div>
                {/* Atajos rápidos para descuentos % comunes */}
                {discountDraftType === "percent" && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[5, 10, 15, 20].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setDiscount({ type: "percent", value: p });
                          setShowDiscountPopover(false);
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700"
                      >
                        −{p}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total + acciones */}
          <div className="border-t border-slate-200 bg-white p-3">
            {discountAmt > 0 && (
              <div className="mb-2 space-y-0.5 text-xs tabular-nums">
                <div className="flex items-baseline justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex items-baseline justify-between font-semibold text-emerald-700">
                  <span>
                    Descuento{" "}
                    {discount?.type === "percent" ? `(−${discount.value}%)` : ""}
                  </span>
                  <span>−{fmt(discountAmt)}</span>
                </div>
              </div>
            )}
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-500">TOTAL</span>
              <span className="text-3xl font-black tabular-nums text-slate-900">
                {fmt(total)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setPaying("efectivo"); setCashTendered(""); }}
                disabled={lines.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <Banknote size={20} /> Efectivo
              </button>
              <button
                onClick={() => setPaying("tarjeta")}
                disabled={lines.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <CreditCard size={20} /> Tarjeta
              </button>
            </div>
            {lines.length > 0 && (
              <button
                onClick={clearCart}
                className="mt-2 w-full rounded-lg border border-slate-300 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                Cancelar venta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL: cobro efectivo / tarjeta ──────────────────────────── */}
      {paying && (
        <PaymentModal
          method={paying}
          total={total}
          mode={mode}
          cashTendered={cashTendered}
          setCashTendered={setCashTendered}
          change={change}
          processing={processing}
          onConfirm={handleConfirmPayment}
          onCancel={() => { setPaying(null); setCashTendered(""); setFeedback(""); }}
          feedback={feedback}
        />
      )}

      {/* ─── MODAL: panel cliente para factura ────────────────────────── */}
      {showCustomerPanel && (
        <CustomerModal
          customer={customer}
          setCustomer={setCustomer}
          onClose={() => setShowCustomerPanel(false)}
        />
      )}

      {/* ─── MODAL: post-venta — éxito + impresión ────────────────────── */}
      {lastSale && (
        <PostSaleModal
          sale={lastSale}
          onClose={() => { setLastSale(null); searchRef.current?.focus(); }}
        />
      )}

      {/* ─── MODAL: línea manual ────────────────────────────────────────
          Para vender artículos no catalogados (cartas sueltas, ítems
          puntuales). El operador teclea concepto, cantidad, precio con
          IVA y tipo de IVA. La línea entra al carrito con un id en el
          rango reservado MANUAL_LINE_ID_BASE — no toca stock.
      */}
      {showManualLineModal && (
        <ManualLineModal
          onCancel={() => setShowManualLineModal(false)}
          onConfirm={(line) => {
            setLines((prev) => [...prev, line]);
            setShowManualLineModal(false);
            setFeedback("");
          }}
        />
      )}

      {/* ─── MODAL: devolución ──────────────────────────────────────────
          Busca factura por número, muestra preview, y al confirmar emite
          una rectificativa SUSTITUCIÓN (anula la original). Calpe usa
          rectifyInvoice() central; las standalone usan rectifyStoreInvoice().
      */}
      {showReturnModal && (
        <ReturnModal
          storeSlug={storeSlug}
          isCentralBook={store.sharesWebInvoicing}
          operatorId={user.id}
          operatorName={
            `${user.name ?? ""} ${user.lastName ?? ""}`.trim() || user.email
          }
          onClose={() => setShowReturnModal(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function PaymentModal({
  method, total, mode, cashTendered, setCashTendered, change, processing, onConfirm, onCancel, feedback,
}: {
  method: PaymentMethod;
  total: number;
  mode: SaleMode;
  cashTendered: string;
  setCashTendered: (s: string) => void;
  change: number;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  feedback: string;
}) {
  const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200];
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
        <div className={`flex items-center justify-between px-5 py-4 ${method === "efectivo" ? "bg-emerald-500" : "bg-blue-500"} text-white`}>
          <div className="flex items-center gap-2">
            {method === "efectivo" ? <Banknote size={22} /> : <CreditCard size={22} />}
            <p className="text-base font-black uppercase tracking-wide">
              Cobro {method}
            </p>
          </div>
          <button onClick={onCancel} className="rounded p-1 hover:bg-white/20" aria-label="Cancelar">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-slate-100 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total a cobrar</p>
            <p className="mt-1 text-4xl font-black tabular-nums">{fmt(total)}</p>
          </div>
          {method === "efectivo" ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Efectivo entregado</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  autoFocus
                  placeholder="0,00"
                  className="h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-2xl font-black tabular-nums text-slate-900 outline-none focus:border-emerald-500"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setCashTendered(String(a))}
                      className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50"
                    >
                      {a} €
                    </button>
                  ))}
                  <button
                    onClick={() => setCashTendered(total.toFixed(2))}
                    className="rounded-lg border-2 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    Justo
                  </button>
                </div>
              </div>
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cambio a devolver</p>
                <p className="mt-1 text-3xl font-black tabular-nums text-emerald-900">{fmt(change)}</p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-bold">Datáfono</p>
              <p className="mt-1 text-xs">
                Introduce el importe en el datáfono y procesa el pago físicamente.
                Cuando esté <strong>autorizado por el banco</strong>, pulsa &laquo;Confirmar venta&raquo;.
              </p>
            </div>
          )}
          {feedback && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {feedback}
            </div>
          )}
          <div className="text-center text-xs text-slate-500">
            Salida: <strong>{mode === "ticket" ? "Ticket (factura simplificada)" : "Factura completa"}</strong>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCancel}
              disabled={processing}
              className="rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={processing}
              className={`rounded-xl py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-50 ${
                method === "efectivo"
                  ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30"
                  : "bg-blue-500 hover:bg-blue-400 shadow-blue-500/30"
              }`}
            >
              {processing ? "Procesando…" : "Confirmar venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerModal({
  customer, setCustomer, onClose,
}: {
  customer: TpvCustomer;
  setCustomer: (c: TpvCustomer) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TpvCustomer>(customer);

  function setField<K extends keyof TpvCustomer>(key: K, value: TpvCustomer[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function setAddr<K extends keyof NonNullable<TpvCustomer["address"]>>(key: K, value: string) {
    setDraft((d) => ({
      ...d,
      address: {
        street: d.address?.street ?? "",
        city: d.address?.city ?? "",
        postalCode: d.address?.postalCode ?? "",
        province: d.address?.province ?? "",
        country: d.address?.country,
        ...{ [key]: value },
      },
    }));
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <p className="text-base font-black">Datos del cliente</p>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nombre o razón social *</label>
            <input
              type="text" value={draft.name} onChange={(e) => setField("name", e.target.value)}
              autoFocus
              className="h-11 w-full rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">NIF / CIF / NIE *</label>
              <input
                type="text" value={draft.taxId ?? ""} onChange={(e) => setField("taxId", e.target.value.toUpperCase())}
                className="h-11 w-full rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Tipo</label>
              <select
                value={draft.taxIdType ?? "DNI"}
                onChange={(e) => setField("taxIdType", e.target.value as TpvCustomer["taxIdType"])}
                className="h-11 w-full rounded-lg border-2 border-slate-300 px-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="DNI">DNI</option>
                <option value="NIE">NIE</option>
                <option value="CIF">CIF</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Email</label>
              <input
                type="email" value={draft.email ?? ""} onChange={(e) => setField("email", e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Teléfono</label>
              <input
                type="tel" value={draft.phone ?? ""} onChange={(e) => setField("phone", e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Dirección fiscal *</p>
            <div className="space-y-2">
              <input
                type="text" placeholder="Calle, nº, piso"
                value={draft.address?.street ?? ""} onChange={(e) => setAddr("street", e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text" placeholder="CP"
                  value={draft.address?.postalCode ?? ""} onChange={(e) => setAddr("postalCode", e.target.value)}
                  className="h-11 rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
                <input
                  type="text" placeholder="Ciudad"
                  value={draft.address?.city ?? ""} onChange={(e) => setAddr("city", e.target.value)}
                  className="h-11 col-span-2 rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <input
                type="text" placeholder="Provincia"
                value={draft.address?.province ?? ""} onChange={(e) => setAddr("province", e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => { setCustomer(draft); onClose(); }}
            className="rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function PostSaleModal({
  sale, onClose,
}: {
  sale: CompleteSaleResult & { lines: TpvSaleLine[]; payment: PaymentMethod; mode: SaleMode; customer?: TpvCustomer; storeName: string };
  onClose: () => void;
}) {
  const total = computeTpvTotal(sale.lines);
  function handlePrint() {
    document.body.classList.add("tpv-print");
    window.print();
    setTimeout(() => document.body.classList.remove("tpv-print"), 500);
  }
  return (
    <>
      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
          <div className="bg-emerald-500 px-5 py-4 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={22} />
              <p className="text-base font-black uppercase">Venta completada</p>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <div className="rounded-xl bg-slate-100 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total cobrado</p>
              <p className="mt-1 text-3xl font-black tabular-nums">{fmt(total)}</p>
              {sale.payment === "efectivo" && sale.change > 0 && (
                <p className="mt-2 text-sm font-bold text-emerald-700">
                  Cambio: {fmt(sale.change)}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p>Tienda: <strong>{sale.storeName}</strong></p>
              <p>Venta: <strong>{sale.saleId}</strong></p>
              {sale.invoiceNumber && <p>Factura: <strong>{sale.invoiceNumber}</strong></p>}
            </div>
            {sale.error && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {sale.error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Printer size={16} /> Imprimir
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-400"
              >
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Área imprimible — sólo visible cuando body.tpv-print está activo */}
      <div className="tpv-print-area">
        <div style={{ textAlign: "center", marginBottom: "6mm" }}>
          <strong style={{ fontSize: "14px" }}>{SITE_CONFIG.name}</strong><br />
          {SITE_CONFIG.legalName}<br />
          CIF: {SITE_CONFIG.cif}<br />
          {SITE_CONFIG.address}<br />
          Tel: {SITE_CONFIG.phone}
        </div>
        <div className="ticket-line" />
        <div style={{ marginBottom: "3mm" }}>
          {sale.mode === "ticket" ? "TICKET (Factura simplificada)" : "FACTURA"}<br />
          {sale.invoiceNumber && <>Nº {sale.invoiceNumber}<br /></>}
          Tienda: {sale.storeName}<br />
          Venta: {sale.saleId}<br />
          Fecha: {new Date().toLocaleString("es-ES")}<br />
          Pago: {sale.payment === "efectivo" ? "Efectivo" : "Tarjeta (datáfono)"}
        </div>
        {sale.customer && sale.customer.name && (
          <>
            <div className="ticket-line" />
            <div style={{ margin: "3mm 0" }}>
              <strong>Cliente:</strong><br />
              {sale.customer.name}<br />
              {sale.customer.taxId && <>NIF: {sale.customer.taxId}<br /></>}
              {sale.customer.address?.street && (
                <>
                  {sale.customer.address.street}<br />
                  {sale.customer.address.postalCode} {sale.customer.address.city}<br />
                </>
              )}
            </div>
          </>
        )}
        <div className="ticket-line" />
        <table style={{ width: "100%", margin: "3mm 0", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Producto</th>
              <th style={{ textAlign: "right" }}>Cant.</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((l) => (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td style={{ textAlign: "right" }}>{l.quantity}×{l.unitPriceWithVat.toFixed(2)}</td>
                <td style={{ textAlign: "right" }}>{(l.unitPriceWithVat * l.quantity).toFixed(2)}€</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ticket-line" />
        <div style={{ margin: "3mm 0", textAlign: "right" }}>
          <strong style={{ fontSize: "14px" }}>TOTAL: {total.toFixed(2)}€</strong><br />
          <span style={{ fontSize: "10px", color: "#555" }}>IVA incluido ({SITE_CONFIG.vatRate}%)</span>
        </div>
        {sale.payment === "efectivo" && sale.change > 0 && (
          <div style={{ textAlign: "right" }}>
            Cambio: {sale.change.toFixed(2)}€
          </div>
        )}
        <div className="ticket-line" />
        <div style={{ marginTop: "5mm", textAlign: "center", fontSize: "10px" }}>
          Gracias por tu compra<br />
          {SITE_CONFIG.email}
        </div>
      </div>
    </>
  );
}

// ─── MODAL: Línea manual ─────────────────────────────────────────────────────

/**
 * Permite añadir un artículo no catalogado al carrito (ej: "Pikachu 281",
 * carta suelta, accesorio puntual). El operador teclea descripción, cantidad,
 * precio con IVA por unidad y tipo de IVA. La línea entra al carrito con un
 * `productId` en el rango `MANUAL_LINE_ID_BASE` para que el flujo de cobro
 * la trate sin tocar inventario.
 */
function ManualLineModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (line: TpvSaleLine) => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [vatRate, setVatRate] = useState<0 | 4 | 10 | 21>(21);
  const [error, setError] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleConfirm() {
    const q = parseInt(qty, 10);
    const p = Number(price.replace(",", "."));
    if (!name.trim()) {
      setError("Falta el concepto.");
      return;
    }
    if (!Number.isFinite(q) || q <= 0) {
      setError("Cantidad inválida.");
      return;
    }
    if (!Number.isFinite(p) || p <= 0) {
      setError("Precio inválido.");
      return;
    }
    onConfirm({
      productId: newManualLineId(),
      name: name.trim(),
      quantity: q,
      unitPriceWithVat: +p.toFixed(2),
      vatRate,
    });
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Línea manual</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Para artículos no catalogados (cartas sueltas, etc.). No toca el stock.
        </p>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="manual-line-name"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Concepto
            </label>
            <input
              id="manual-line-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pikachu 281 — Surging Sparks"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="manual-line-qty"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Cantidad
              </label>
              <input
                id="manual-line-qty"
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label
                htmlFor="manual-line-price"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                PVP unitario (IVA incl.)
              </label>
              <input
                id="manual-line-price"
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00 €"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-700">
              Tipo IVA
            </span>
            <div className="flex gap-2">
              {([21, 10, 4, 0] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setVatRate(r)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-bold transition ${
                    vatRate === r
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-md bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-600"
          >
            Añadir línea
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: Devolución ───────────────────────────────────────────────────────

/**
 * Procesa una devolución total contra una factura previa de esta tienda.
 * Flujo: número → buscar (libro central si Calpe, libro propio si standalone)
 * → preview → confirmar → emitir rectificativa SUSTITUCIÓN (anula la original).
 *
 * Nota: sólo se ofrece SUSTITUCIÓN (devolución total). Para devoluciones
 * parciales (líneas concretas) el flujo es más complejo y se maneja desde
 * `/admin/fiscal/facturas` por el responsable contable.
 */
function ReturnModal({
  storeSlug,
  isCentralBook,
  operatorId,
  operatorName,
  onClose,
}: {
  storeSlug: TpvStoreSlug;
  isCentralBook: boolean;
  operatorId: string;
  operatorName: string;
  onClose: () => void;
}) {
  const [number, setNumber] = useState("");
  const [found, setFound] = useState<InvoiceRecord | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<{ rectificativaNumber: string; total: number } | null>(null);

  const numberRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    numberRef.current?.focus();
  }, []);

  function handleSearch() {
    setError("");
    setFound(null);
    const q = number.trim();
    if (!q) {
      setError("Escribe el número de factura.");
      return;
    }
    const list = isCentralBook ? loadInvoices() : loadStoreInvoices(storeSlug);
    const match = list.find(
      (inv) =>
        inv.invoiceNumber === q ||
        inv.invoiceNumber.toLowerCase() === q.toLowerCase(),
    );
    if (!match) {
      setError(
        isCentralBook
          ? "No encontrada en el libro central."
          : `No encontrada en el libro de ${storeSlug}.`,
      );
      return;
    }
    setFound(match);
  }

  async function handleConfirm() {
    if (!found) return;
    if (!reason.trim()) {
      setError("Indica el motivo de la devolución.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      let rectNumber: string;
      if (isCentralBook) {
        const rec = await rectifyInvoice(found.invoiceId, {
          correctionData: {
            originalInvoiceId: found.invoiceId,
            originalInvoiceNumber: found.invoiceNumber,
            originalInvoiceDate: new Date(found.invoiceDate),
            correctionType: CorrectionType.SUSTITUCION,
            reasonCode: "R1",
            reason: `Devolución TPV: ${reason.trim()}`,
          },
          userId: operatorId,
          userName: operatorName,
        });
        rectNumber = rec.invoiceNumber;
      } else {
        const rec = await rectifyStoreInvoice({
          storeSlug,
          originalId: found.invoiceId,
          correctionData: {
            originalInvoiceId: found.invoiceId,
            originalInvoiceNumber: found.invoiceNumber,
            originalInvoiceDate: new Date(found.invoiceDate),
            correctionType: CorrectionType.SUSTITUCION,
            reasonCode: "R1",
            reason: `Devolución TPV: ${reason.trim()}`,
          },
          userId: operatorId,
          userName: operatorName,
        });
        rectNumber = rec.invoiceNumber;
      }
      setDone({
        rectificativaNumber: rectNumber,
        total: found.totals.totalInvoice,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo emitir la rectificativa.",
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900">Devolución</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 p-4 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-900">
                Rectificativa emitida
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Nº {done.rectificativaNumber}
              </p>
              <p className="mt-2 text-base font-black text-emerald-900">
                Reintegrar al cliente: {done.total.toFixed(2)} €
              </p>
            </div>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>Importante:</strong> entrega el reembolso al cliente por la
              misma vía con la que pagó (efectivo desde caja o reverso de tarjeta
              en el datáfono).
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        ) : !found ? (
          <>
            <p className="mb-4 text-xs text-slate-500">
              Localiza la factura por su número exacto. Sólo se buscan facturas
              de {isCentralBook ? "el libro central" : "esta tienda"}.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  ref={numberRef}
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder={isCentralBook ? "FAC-2026-00123" : "PB-2026-00045"}
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"
              >
                Buscar
              </button>
            </div>
            {error && (
              <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">
                  Factura original
                </p>
                <p className="text-xs font-bold text-slate-900">
                  {found.invoiceNumber}
                </p>
              </div>
              <p className="text-xs text-slate-600">
                {new Date(found.invoiceDate).toLocaleDateString("es-ES")}
                {" · "}
                {"name" in found.recipient ? found.recipient.name : "Cliente final"}
              </p>
              <div className="mt-3 max-h-40 overflow-y-auto rounded-md bg-white p-2 text-xs">
                {found.items.map((it) => (
                  <div
                    key={it.lineNumber}
                    className="flex justify-between border-b border-slate-100 py-1 last:border-0"
                  >
                    <span className="truncate pr-2 text-slate-700">
                      {it.quantity}× {it.description}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-900">
                      {it.totalLine.toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-xs font-semibold text-slate-500">
                  Total a devolver
                </span>
                <span className="text-base font-black text-rose-700">
                  {found.totals.totalInvoice.toFixed(2)} €
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="return-reason"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Motivo de la devolución
              </label>
              <input
                id="return-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Producto defectuoso / cambio de opinión"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              Se emitirá una factura rectificativa (SUSTITUCIÓN) que anula la
              original. La cadena hash VeriFactu deja constancia inmutable.
            </p>

            {error && (
              <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setFound(null)}
                disabled={processing}
                className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={processing || !reason.trim()}
                className="flex-1 rounded-md bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? "Emitiendo…" : "Confirmar devolución"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
