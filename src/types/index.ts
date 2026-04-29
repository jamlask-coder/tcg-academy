// TCG Academy — Types
//
// NOTE: Legacy `Product` (WooCommerce-shape) and `CartItem` interfaces were
// removed during SSOT cleanup — the canonical types live in
// `src/data/products.ts` (`LocalProduct`) and `src/context/CartContext.tsx`
// (`CartItem` exported from the cart context) respectively.

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: { src: string; alt: string } | null;
  count: number;
  parent: number;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  mapUrl: string;
  color: string;
}

export interface EventSession {
  /** Etiqueta del día — p.ej. "Sábado" / "Domingo" */
  label: string;
  /** ISO date — "2026-05-09" */
  date: string;
  /** "10:30" */
  time: string;
}

export interface Event {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  /** Slug del juego ("riftbound", "magic", "pokemon"…) — ver GAME_CONFIG */
  game: string;
  /** ID de la tienda en STORES */
  storeId: string;
  /** Dirección donde se celebra el evento (puede diferir de la tienda) */
  address: string;
  city: string;
  postalCode?: string;
  /** Una o varias sesiones (sábado, domingo…) */
  sessions: EventSession[];
  /** Inscripción en € (incluye IVA) */
  entryFee: number;
  /** Texto del premio — "Sobre por victoria", "Sobre + booster"… */
  prizeText: string;
  /** Ruta pública al cartel (relativa a /public) */
  posterImage: string;
  /** Color HEX de acento — gradientes y bordes */
  accentColor: string;
  /** Resumen corto — 1 frase, lo que ve el usuario en la card cerrada */
  shortDescription: string;
  /** Descripción larga — markdown ligero permitido (\n para párrafos) */
  longDescription: string;
  /** Bullets destacados — qué se entrega, qué se juega */
  highlights: string[];
  /**
   * URL externa para reservar plaza (store locator del editor, formulario
   * de Eventbrite, etc.). Si se omite, el CTA cae en mailto a la tienda.
   */
  registrationUrl?: string;
}

export interface B2BApplication {
  empresa: string;
  nif: string;
  email: string;
  telefono: string;
  volumen: string;
  juegos: string[];
  mensaje: string;
}

export type GameSlug =
  | "pokemon"
  | "magic"
  | "yugioh"
  | "naruto"
  | "lorcana"
  | "dragon-ball";

export interface Game {
  slug: GameSlug;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
  categorySlug: string;
}
