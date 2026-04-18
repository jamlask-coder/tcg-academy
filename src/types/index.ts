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

export interface Event {
  id: number;
  title: string;
  date: string;
  store: string;
  game: string;
  price: number;
  image: string;
  description: string;
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
