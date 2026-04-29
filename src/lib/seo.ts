/**
 * Helpers para JSON-LD (schema.org). Los objetos se insertan vía
 * `<script type="application/ld+json">` en las páginas.
 *
 * Todas las URLs son absolutas (schema.org exige FQDN) — usamos `SITE_URL`
 * como base. Si cambias dominio, solo hay que tocar aquí.
 */

import { SITE_CONFIG } from "@/config/siteConfig";
import type { Store } from "@/data/stores";
import type { LocalProduct } from "@/data/products";
import type { Event } from "@/types";

export const SITE_URL = "https://tcgacademy.es";

export const abs = (path: string): string =>
  path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

/** Organización — se inyecta en el layout raíz (una sola vez por web). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    email: SITE_CONFIG.email,
    telephone: SITE_CONFIG.phone,
    taxID: SITE_CONFIG.cif,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.address,
      addressCountry: "ES",
    },
    sameAs: [
      "https://www.instagram.com/tcgacademycalpe",
      "https://www.instagram.com/tcg_academy_bejar",
      "https://www.instagram.com/tcgacademy.madrid",
    ],
  };
}

/** WebSite — habilita el cuadro de búsqueda ("sitelinks searchbox") en Google. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_CONFIG.name,
    inLanguage: "es-ES",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/busqueda?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * LocalBusiness para cada tienda física — alimenta Google Business Profile
 * y Maps. Se inserta en cada página de tienda.
 */
export function localBusinessJsonLd(store: Store) {
  // Solo emitimos `geo` si tenemos coordenadas reales — mejor omitir que enviar
  // imprecisiones que confundirían a Google Maps.
  const geo = store.geo
    ? {
        geo: {
          "@type": "GeoCoordinates",
          latitude: store.geo.lat,
          longitude: store.geo.lng,
        },
      }
    : {};
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/tiendas/${store.id}/#store`,
    name: store.name,
    image: `${SITE_URL}/images/tiendas/${store.id}.jpg`,
    description: store.longDesc,
    url: `${SITE_URL}/tiendas/${store.id}`,
    telephone: store.phone,
    email: store.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address,
      addressLocality: store.city,
      addressCountry: "ES",
    },
    ...geo,
    priceRange: "€€",
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
    openingHoursSpecification: store.hours
      .filter((h) => !/cerrado/i.test(h.time))
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: parseDayOfWeek(h.day),
        opens: parseOpens(h.time),
        closes: parseCloses(h.time),
      })),
  };
}

/** "Lunes – Viernes" → ["Monday", ..., "Friday"] */
function parseDayOfWeek(day: string): string[] {
  const map: Record<string, string> = {
    lunes: "Monday",
    martes: "Tuesday",
    miércoles: "Wednesday",
    miercoles: "Wednesday",
    jueves: "Thursday",
    viernes: "Friday",
    sábado: "Saturday",
    sabado: "Saturday",
    domingo: "Sunday",
  };
  const parts = day
    .toLowerCase()
    .split(/[-–]/)
    .map((s) => s.trim());
  if (parts.length === 1) return [map[parts[0]] ?? "Monday"];
  const order = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const from = map[parts[0]] ?? "Monday";
  const to = map[parts[1]] ?? "Friday";
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  return order.slice(a, b + 1);
}

function parseOpens(time: string): string {
  const m = time.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "10:00";
}
function parseCloses(time: string): string {
  const all = [...time.matchAll(/(\d{1,2}):(\d{2})/g)];
  const last = all[all.length - 1];
  return last ? `${last[1].padStart(2, "0")}:${last[2]}` : "20:00";
}

/** Producto — ficha enriquecida (precio, stock) en SERPs. */
export function productJsonLd(
  product: LocalProduct,
  opts: { priceWithVat: number; url: string },
) {
  const inStock =
    typeof product.stock === "number" ? product.stock > 0 : true;
  // Identificadores de producto opcionales — Google premia con rich results
  // si están presentes. EAN-13 es el barcode estándar UE.
  const gtinFields: Record<string, string> = {};
  if (product.gtin13) gtinFields.gtin13 = product.gtin13;
  if (product.mpn) gtinFields.mpn = product.mpn;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => abs(i)),
    sku: product.slug,
    ...gtinFields,
    brand: { "@type": "Brand", name: product.game },
    offers: {
      "@type": "Offer",
      url: abs(opts.url),
      priceCurrency: "EUR",
      price: opts.priceWithVat.toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceValidUntil: nextYearIso(),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
    },
  };
}

/**
 * ItemList — usado tanto en páginas de catálogo (/[game]/[category]) como
 * en /tiendas para declarar la lista de elementos visibles. Mejora SERPs y
 * elegibilidad para "Listings" rich results.
 */
export interface ItemListEntry {
  url: string;
  name: string;
}

export function itemListJsonLd(items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: abs(item.url),
      name: item.name,
    })),
  };
}

/**
 * CollectionPage — wrapper para páginas que listan productos de una categoría.
 * Se inyecta junto al ItemList para clarificar a Google que la URL es una
 * colección, no una página de detalle.
 */
export function collectionPageJsonLd(opts: {
  url: string;
  name: string;
  description: string;
  numberOfItems: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${abs(opts.url)}#collection`,
    url: abs(opts.url),
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.numberOfItems,
    },
  };
}

function nextYearIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

/** Breadcrumbs — mejor navegación en el resultado de Google. */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

/** Article — guías y posts de blog. Da elegibilidad a rich results.
 *  `type: "BlogPosting"` cuando es un post editorial (las guías lo son).
 */
export interface ArticleLdInput {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  type?: "Article" | "BlogPosting" | "NewsArticle";
}

export function articleJsonLd(input: ArticleLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "Article",
    headline: input.title,
    description: input.description,
    image: abs(input.image ?? "/og-default.png"),
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": abs(input.url),
    },
  };
}

/**
 * Event — esquema schema.org/Event con location + offers de inscripción.
 * Da elegibilidad a "Eventos" en Google (carruseles + Lens). El campo
 * `eventStatus` permanece scheduled hasta que el evento expira por fecha.
 *
 * Si el evento tiene varias sesiones, exponemos la primera como
 * `startDate` y la última como `endDate` (Google admite el rango).
 */
export function eventJsonLd(event: Event, store: Store | undefined) {
  const first = event.sessions[0];
  const last = event.sessions[event.sessions.length - 1];
  const startDate = first ? `${first.date}T${first.time ?? "10:00"}:00+02:00` : undefined;
  const endDate = last ? `${last.date}T${last.time ?? "20:00"}:00+02:00` : undefined;

  const location = store
    ? {
        "@type": "Place",
        name: store.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: event.address,
          addressLocality: event.city,
          postalCode: event.postalCode,
          addressCountry: "ES",
        },
      }
    : {
        "@type": "Place",
        name: event.city,
        address: {
          "@type": "PostalAddress",
          streetAddress: event.address,
          addressLocality: event.city,
          postalCode: event.postalCode,
          addressCountry: "ES",
        },
      };

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.shortDescription,
    image: abs(event.posterImage),
    startDate,
    endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location,
    organizer: { "@id": `${SITE_URL}/#organization` },
    offers: {
      "@type": "Offer",
      url: event.registrationUrl ?? `${SITE_URL}/eventos/${event.slug}`,
      price: event.entryFee.toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      validFrom: new Date().toISOString().slice(0, 10),
    },
  };
}

/** FAQPage — para pages con preguntas frecuentes. */
export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** Helper para renderizar JSON-LD como atributo dangerouslySetInnerHTML. */
export function jsonLdProps(data: unknown) {
  return {
    type: "application/ld+json" as const,
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  };
}
