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
  /** Rutas públicas a fotos reales de la tienda (ej: "/images/stores/bejar/1.webp"). */
  photos?: string[];
  /**
   * Coordenadas rooftop de la tienda. Se emiten como `GeoCoordinates` en
   * LocalBusiness JSON-LD — Google las usa para Maps y resultados locales.
   * Rellenar con las coords reales de cada tienda (no las inferimos
   * automáticamente para no meter imprecisiones).
   */
  geo?: { lat: number; lng: number };
  /**
   * Tienda en apertura. Cuando `true`, la ficha muestra "Próximamente" y se
   * ocultan tel/mail/dirección (evita `tel:` vacíos, mailto rotos, JSON-LD
   * LocalBusiness con datos falsos, etc.). Los campos `address/phone/email/
   * hours/instagram` pueden quedarse en cadena/array vacío sin romper nada.
   */
  comingSoon?: boolean;
}

export const STORES: Record<string, Store> = {
  calpe: {
    id: "calpe",
    name: "TCG Academy Calpe",
    city: "Calpe, Alicante",
    address: "Calle Libertad 16, 03710 Calpe",
    phone: "+34 648 635 723",
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
    geo: { lat: 38.6447318, lng: 0.042768 },
  },
  bejar: {
    id: "bejar",
    name: "TCG Academy Béjar",
    city: "Béjar, Salamanca",
    address: "Travesía de la Cruz 2, 37700 Béjar, Salamanca",
    phone: "+34 614 55 21 91",
    email: "tcgacademybejar@gmail.com",
    color: "#3b82f6",
    bg: "#e8f3fc",
    shortDesc:
      "Tienda de juegos en Béjar. Cartas coleccionables, juego organizado y atención personal.",
    longDesc:
      "Nuestra tienda en Béjar (Salamanca). Cartas coleccionables de Magic, Pokémon, Yu-Gi-Oh! y más. Ven a conocernos.",
    hours: [
      { day: "Lunes – Sábado", time: "10:00 – 14:00 · 17:30 – 19:30" },
    ],
    instagram: "@tcg_academy_bejar",
    photos: [
      "/images/stores/bejar/1.webp",
      "/images/stores/bejar/2.webp",
      "/images/stores/bejar/3.webp",
    ],
    geo: { lat: 40.3853315, lng: -5.7605224 },
  },
  madrid: {
    id: "madrid",
    name: "TCG Academy Madrid",
    city: "Torrejón de Ardoz, Madrid",
    address:
      "C.C. El Círculo, Av. de la Constitución 90, Local 22, 28850 Torrejón de Ardoz, Madrid",
    phone: "+34 614 28 59 11",
    email: "tcgacademymadrid@gmail.com",
    color: "#dc2626",
    bg: "#fef2f2",
    shortDesc:
      "Tienda TCG en el C.C. El Círculo de Torrejón de Ardoz. Cartas, torneos y zona de juego.",
    longDesc:
      "Nuestra tienda en el Centro Comercial El Círculo de Torrejón de Ardoz, a 20 minutos del centro de Madrid. Amplio catálogo de singles, torneos oficiales y zona de juego. Parking gratuito en el CC.",
    hours: [
      { day: "Lunes – Sábado", time: "10:00 – 21:00" },
      { day: "Domingo", time: "11:00 – 19:00" },
    ],
    instagram: "@tcgacademy.madrid",
    geo: { lat: 40.4569179, lng: -3.4734488 },
  },
  barcelona: {
    id: "barcelona",
    name: "TCG Academy Barcelona",
    city: "Barcelona",
    address: "",
    phone: "",
    email: "",
    color: "#7c3aed",
    bg: "#f5f3ff",
    shortDesc: "Próximamente en Barcelona.",
    longDesc:
      "Estamos preparando nuestra llegada a Barcelona. Muy pronto anunciaremos la dirección, el horario y la fecha de apertura.",
    hours: [],
    comingSoon: true,
  },
};
