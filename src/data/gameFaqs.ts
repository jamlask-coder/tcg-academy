/**
 * FAQ por juego — se renderiza en /{game} como sección colapsable
 * y se inyecta como FAQPage JSON-LD para rich results.
 *
 * Regla: preguntas reales que hace la gente. Respuestas cortas y claras.
 */

import type { FaqItem } from "@/lib/seo";

export const GENERIC_FAQ: FaqItem[] = [
  {
    question: "¿Cuánto tarda el envío?",
    answer:
      "Enviamos en 24 horas desde cualquiera de nuestras 4 tiendas físicas en España. Pedidos antes de las 14:00 salen el mismo día.",
  },
  {
    question: "¿Las cartas son originales?",
    answer:
      "Sí, 100%. Todos los productos son oficiales, comprados directamente a distribuidores autorizados. Los singles se verifican antes de enviarse.",
  },
  {
    question: "¿Puedo devolver un producto?",
    answer:
      "Tienes 14 días naturales para devolver cualquier producto sellado sin coste. Los productos abiertos sólo se devuelven si tienen defecto de fábrica.",
  },
];

export const GAME_FAQS: Record<string, FaqItem[]> = {
  magic: [
    {
      question: "¿Qué es mejor para empezar en Magic, un Starter Deck o un Commander Deck?",
      answer:
        "Un Commander Deck preconstruido te da un mazo completo de 100 cartas listo para jugar y es el formato más popular para casual. Si quieres aprender rápido y a bajo coste, un Starter Deck de 60 cartas es suficiente.",
    },
    {
      question: "¿Cuántas cartas trae una Booster Box de Magic?",
      answer:
        "Las Booster Boxes de Play Booster o Draft Booster contienen 30-36 sobres de 14-15 cartas cada uno, más una Box Topper promo en muchas ediciones recientes.",
    },
    {
      question: "¿Qué es Commander y cuántos jugadores se necesitan?",
      answer:
        "Commander (antes EDH) es un formato de Magic para 3-4 jugadores con mazos de 100 cartas únicas y un comandante legendario. Cada jugador empieza con 40 puntos de vida y el objetivo es ser el último en pie.",
    },
    {
      question: "¿Las cartas de Magic en inglés y español valen lo mismo?",
      answer:
        "Sí, a efectos de juego son idénticas. En el mercado, el inglés suele tener más liquidez; el español puede tener sobreprecio en cartas icónicas por escasez.",
    },
    ...GENERIC_FAQ,
  ],
  pokemon: [
    {
      question: "¿Qué sobre de Pokémon comprar ahora?",
      answer:
        "Las expansiones más populares en 2026 son Scarlet & Violet y sus ampliaciones (Temporal Forces, Twilight Masquerade). Para coleccionar, una Elite Trainer Box (ETB) es la mejor relación coste/contenido.",
    },
    {
      question: "¿Cómo saber si una carta de Pokémon es falsa?",
      answer:
        "Las falsas suelen tener bordes con tonos azulados, tipografía irregular, textura lisa (las originales tienen textura al tacto) y peso distinto. Compra siempre en tiendas especializadas con garantía.",
    },
    {
      question: "¿Qué es un pull rate de Pokémon?",
      answer:
        "Es la probabilidad estadística de sacar una carta concreta en un sobre. Un Full Art tiene pull rate aproximado de 1:20 sobres, un Secret Rare 1:100+. Son medias — una caja completa puede no tener lo que esperas.",
    },
    {
      question: "¿La Elite Trainer Box incluye sobres garantizados?",
      answer:
        "Sí, cada ETB oficial trae 9-10 sobres de la expansión correspondiente, además de fundas, dados, marcadores y guía de reglas.",
    },
    ...GENERIC_FAQ,
  ],
  "yu-gi-oh": [
    {
      question: "¿Qué set de Yu-Gi-Oh es el más popular en 2026?",
      answer:
        "En 2026, los sets más buscados son Quarter Century Stampede y los reprints de Legend of Blue-Eyes 25th Anniversary. Para competitivo, las Structure Decks actuales son la entrada más barata al meta.",
    },
    {
      question: "¿Qué es una carta Starlight Rare?",
      answer:
        "Starlight Rare (también llamada Ghost Rare en Japón) es la máxima rareza en Yu-Gi-Oh. Tiene holograma de estrella completo y un pull rate aproximado de 1 por caja de 24 sobres.",
    },
    {
      question: "¿Dónde se juega Yu-Gi-Oh competitivo en España?",
      answer:
        "Los eventos oficiales (Regionales, WCQ) se organizan mensualmente. Puedes ver el calendario en la web de Konami Digital Entertainment. En nuestras tiendas hay juego organizado semanal.",
    },
    ...GENERIC_FAQ,
  ],
  "one-piece": [
    {
      question: "¿Merece la pena empezar en One Piece Card Game?",
      answer:
        "Sí — es uno de los TCGs con mayor crecimiento en 2025-2026. El meta es fresco, las cartas tienen arte espectacular y el formato Standard es accesible con 2-3 Starter Decks.",
    },
    {
      question: "¿Qué Starter Deck de One Piece es el mejor para empezar?",
      answer:
        "Los Starter Decks ST-01 (Straw Hat Crew), ST-05 (Film Edition) y ST-13 (The Three Captains) son buenas puertas de entrada: mazos completos de 50 cartas listos para jugar.",
    },
    ...GENERIC_FAQ,
  ],
  lorcana: [
    {
      question: "¿Qué es Disney Lorcana y cómo se juega?",
      answer:
        "Lorcana es el TCG oficial de Disney lanzado en 2023. Usas mazos de 60 cartas con personajes, canciones y hechizos para conseguir 20 lore antes que tu rival. Partidas de 15-20 minutos.",
    },
    {
      question: "¿Las cartas Enchanted son numeradas?",
      answer:
        "No — las Enchanted no tienen número de serie, pero tienen pull rate muy bajo (1 cada 4-5 cajas). Las Legendary foil dorado de las primeras expansiones son las más demandadas.",
    },
    ...GENERIC_FAQ,
  ],
  "dragon-ball": [
    {
      question: "¿Qué es Dragon Ball Super Card Game Fusion World?",
      answer:
        "Fusion World es el nuevo TCG de Dragon Ball lanzado en 2024, con reglas simplificadas y mazos de 50 cartas. Los Starter Decks oficiales son la mejor entrada.",
    },
    {
      question: "¿Merece la pena comprar singles de Dragon Ball Super antiguo?",
      answer:
        "Sólo si son cartas promo específicas (SCR, God Rare). El juego antiguo (Meteor Booster) ya no tiene soporte oficial, pero mantiene escena casual y valor de colección.",
    },
    ...GENERIC_FAQ,
  ],
};

export function getFaqForGame(game: string): FaqItem[] {
  return GAME_FAQS[game] ?? GENERIC_FAQ;
}
