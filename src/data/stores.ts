export interface StoreHours {
  day: string;
  time: string;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  color: string;
  bg: string;
  shortDesc: string;
  longDesc: string;
  hours: StoreHours[];
  instagram?: string;
  /**
   * Coordenadas rooftop de la tienda. Se emiten como `GeoCoordinates` en
   * LocalBusiness JSON-LD — Google las usa para Maps y resultados locales.
   * Rellenar con las coords reales de cada tienda (no las inferimos
   * automáticamente para no meter imprecisiones).
   */
  geo?: { lat: number; lng: number };
}

export const STORES: Record<string, Store> = {
  calpe: {
    id: "calpe",
    name: "TCG Academy Calpe",
    city: "Calpe, Alicante",
    address: "Calle Libertad 16, 03710 Calpe",
    phone: "+34 648 63 57 23",
    email: "tcgacademycalpe@gmail.com",
    color: "#2563eb",
    bg: "#e8f0f9",
    shortDesc:
      "Nuestra tienda flagship en la Costa Blanca. Amplio catálogo, zona de juego y torneos semanales.",
    longDesc:
      "Nuestra tienda flagship en la Costa Blanca. Más de 10.000 referencias, zona de juego con 8 mesas y torneos oficiales cada semana. El punto de encuentro de los aficionados al TCG en Alicante.",
    hours: [
      { day: "Lunes – Viernes", time: "10:00 – 20:00" },
      { day: "Sábado", time: "10:00 – 20:00" },
      { day: "Domingo", time: "10:00 – 14:00" },
    ],
    instagram: "@tcgacademycalpe",
  },
  bejar: {
    id: "bejar",
    name: "TCG Academy Béjar",
    city: "Béjar, Salamanca",
    address: "C/ Mayor 15, 37700 Béjar",
    phone: "+34 923 000 002",
    email: "bejar@tcgacademy.es",
    color: "#3b82f6",
    bg: "#e8f3fc",
    shortDesc:
      "La tienda de referencia en Salamanca. Especializada en Magic y Pokémon competitivo.",
    longDesc:
      "La tienda de referencia en Salamanca. Especializada en Magic: The Gathering y Pokémon competitivo. Juego organizado con Liga semanal y Pre-releases oficiales.",
    hours: [
      { day: "Lunes – Viernes", time: "10:00 – 20:00" },
      { day: "Sábado", time: "10:00 – 14:00" },
      { day: "Domingo", time: "Cerrado" },
    ],
    instagram: "@tcg_academy_bejar",
  },
  madrid: {
    id: "madrid",
    name: "TCG Academy Madrid",
    city: "Madrid",
    address: "C/ Gran Vía 28, 28013 Madrid",
    phone: "+34 910 000 003",
    email: "madrid@tcgacademy.es",
    color: "#dc2626",
    bg: "#fef2f2",
    shortDesc:
      "En el corazón de Madrid. La mayor selección de cartas singles de la capital.",
    longDesc:
      "En el corazón de Madrid. La mayor selección de singles de la capital. Torneo Premier cada fin de semana. Zona de compra-venta de cartas singles con tasación gratuita.",
    hours: [
      { day: "Lunes – Sábado", time: "10:00 – 21:00" },
      { day: "Domingo", time: "11:00 – 19:00" },
    ],
    instagram: "@tcgacademy.madrid",
  },
  barcelona: {
    id: "barcelona",
    name: "TCG Academy Barcelona",
    city: "Barcelona",
    address: "C/ Pelai 12, 08001 Barcelona",
    phone: "+34 930 000 004",
    email: "barcelona@tcgacademy.es",
    color: "#7c3aed",
    bg: "#f5f3ff",
    shortDesc:
      "La tienda TCG más completa de Cataluña. Juego organizado y campeonatos oficiales.",
    longDesc:
      "La tienda TCG más completa de Cataluña. Juego organizado oficial, campeonatos regionales y el mayor stock de Lorcana y Dragon Ball de Barcelona.",
    hours: [
      { day: "Lunes – Sábado", time: "10:00 – 21:00" },
      { day: "Domingo", time: "11:00 – 19:00" },
    ],
    instagram: "@tcgacademybcn",
  },
};
