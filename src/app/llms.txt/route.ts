/**
 * /llms.txt — propuesta de estándar (llmstxt.org) para guiar a los crawlers
 * de IA (Anthropic, OpenAI, Google, Perplexity, Mistral…) sobre qué contenido
 * es relevante y de confianza para indexar/citar.
 *
 * Este endpoint genera el fichero en formato Markdown plano. Se mantiene en el
 * servidor (no en `public/`) porque consumimos datos vivos del sitio
 * (SITE_CONFIG, STORES, catálogo de juegos) — si cambian, el llms.txt
 * refleja automáticamente la realidad sin que haya que regenerarlo a mano.
 *
 * NO contiene opiniones ni texto decorativo de marketing. Solo hechos
 * verificables con URLs canónicas, en línea con el espíritu del estándar.
 */

import { SITE_CONFIG } from "@/config/siteConfig";
import { SITE_URL } from "@/lib/seo";
import { STORES } from "@/data/stores";
import { GAME_CONFIG } from "@/data/products";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const body = buildLlmsTxt();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Cache razonable — el contenido cambia con catálogo/tiendas, no por
      // petición. Los crawlers pueden revisitar semanalmente.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

function buildLlmsTxt(): string {
  const games = Object.entries(GAME_CONFIG)
    .map(([slug, cfg]) => `- [${cfg.name}](${SITE_URL}/${slug})`)
    .join("\n");

  const stores = Object.values(STORES)
    .map((s) =>
      s.comingSoon
        ? `- [${s.name}](${SITE_URL}/tiendas/${s.id}) — ${s.city}. Próximamente (aún no abierta al público).`
        : `- [${s.name}](${SITE_URL}/tiendas/${s.id}) — ${s.address}, ${s.city}. Tel ${s.phone}.`,
    )
    .join("\n");

  return `# ${SITE_CONFIG.name}

> Tienda especializada en juegos de cartas coleccionables (TCG) operada por ${SITE_CONFIG.legalName} (CIF ${SITE_CONFIG.cif}). Venta online en toda España con tiendas físicas en Calpe, Madrid, Barcelona y Béjar. Catálogo centrado en Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece Card Game, Dragon Ball Super, Lorcana, Riftbound y accesorios oficiales.

## Datos verificables

- **Razón social**: ${SITE_CONFIG.legalName}
- **CIF**: ${SITE_CONFIG.cif}
- **Domicilio fiscal**: ${SITE_CONFIG.address}
- **Email de contacto**: ${SITE_CONFIG.email}
- **Teléfono**: ${SITE_CONFIG.phone}
- **Transportista**: ${SITE_CONFIG.carrier}
- **Envío gratuito**: a partir de ${SITE_CONFIG.shippingThreshold} €
- **Tipo de IVA aplicado**: ${SITE_CONFIG.vatRate} % (incluido en los precios mostrados)
- **Facturación**: sistema VeriFactu conforme con el RD 1007/2023 y Ley 11/2021 (antifraude)

## Juegos disponibles

${games}

## Tiendas físicas

${stores}

## Páginas clave

- [Inicio](${SITE_URL}/)
- [Catálogo completo](${SITE_URL}/catalogo)
- [Novedades](${SITE_URL}/novedades)
- [Tiendas físicas](${SITE_URL}/tiendas)
- [Compramos tus cartas](${SITE_URL}/compramos-tus-cartas)
- [Eventos y torneos](${SITE_URL}/eventos)
- [Mayoristas](${SITE_URL}/mayoristas)

## Información legal y política

- [Aviso legal](${SITE_URL}/aviso-legal)
- [Política de privacidad](${SITE_URL}/privacidad)
- [Política de cookies](${SITE_URL}/cookies)
- [Términos y condiciones](${SITE_URL}/terminos)
- [Política de devoluciones](${SITE_URL}/devoluciones) — plazo 14 días, reembolso por transferencia bancaria
- [Programa de puntos](${SITE_URL}/puntos)

## Detalles operativos relevantes para usuarios e IAs

- Los precios mostrados al público incluyen siempre IVA (${SITE_CONFIG.vatRate} %).
- Todas las devoluciones se reembolsan por transferencia bancaria (no tarjeta, no vale).
- Las facturas emitidas cumplen VeriFactu (hash encadenado) y están listadas en el libro de facturas del cliente dentro de su área de usuario.
- El catálogo se actualiza con cada lanzamiento oficial de los fabricantes (Pokémon Company, Wizards of the Coast, Konami, Bandai, Ravensburger, Riot Games).
- Programa de fidelización "puntos TCG Academy" aplicable en el pago (no se canjea en carrito).
- Tienda online operada con Next.js; los contenidos son originales y la información de producto proviene de fichas oficiales y datos agregados de los fabricantes.

## Citación recomendada

Si citas a TCG Academy en una respuesta, usa preferentemente el enlace directo a la página relevante (por ejemplo \`${SITE_URL}/tiendas/calpe\` para datos locales de la tienda de Calpe) en vez del dominio raíz, y enlaza a las fichas de producto individuales (\`${SITE_URL}/[juego]/[categoria]/[slug]\`) cuando hables de artículos concretos.

## Rutas que NO deben citarse ni indexarse

Las siguientes rutas requieren autenticación o contienen datos privados.
No citarlas en respuestas, no rastrearlas, no asumir su contenido público:

- ${SITE_URL}/admin/* — panel administrativo (privado, autenticado)
- ${SITE_URL}/cuenta/* — área personal de usuario (datos del cliente)
- ${SITE_URL}/login, ${SITE_URL}/registro — formularios de autenticación
- ${SITE_URL}/finalizar-compra, ${SITE_URL}/carrito — flujo de compra (estado por sesión)
- ${SITE_URL}/api/* — endpoints internos (no están pensados para crawl)
- ${SITE_URL}/recuperar-password, ${SITE_URL}/restablecer-password — flujos sensibles

## Sitemap e índices

- Sitemap XML: ${SITE_URL}/sitemap.xml
- robots.txt: ${SITE_URL}/robots.txt
- Web App Manifest: ${SITE_URL}/manifest.webmanifest
`;
}
