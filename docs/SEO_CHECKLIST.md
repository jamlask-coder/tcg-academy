# SEO Checklist — qué hacer cuando se publica el dominio

Esta guía asume que **tcgacademy.es** está en producción. Los cambios de código
(JSON-LD, sitemap, robots, metadata) ya están subidos. Lo que queda son pasos
manuales en servicios de Google/Bing que sólo puede hacer el admin.

## 1. Google Search Console (15 min)

Da de alta el dominio y manda el sitemap para que Google empiece a indexar.

1. Entra en https://search.google.com/search-console
2. **Añadir propiedad → Dominio** (no URL): escribe `tcgacademy.es`.
3. Verifica con DNS: Google te da un registro TXT tipo
   `google-site-verification=...`. Añádelo en el panel de tu registrador (IONOS,
   Namecheap, GoDaddy, etc.). Propagación: 5-60 min.
4. Una vez verificado: **Sitemaps → Añadir sitemap** → escribe `/sitemap.xml`
   (la URL ya la genera Next: https://tcgacademy.es/sitemap.xml).
5. Pide **inspección de URL** para la home y una ficha de producto — dale a
   "Solicitar indexación".

### Alternativa si no puedes tocar DNS

Puedes verificar con un tag HTML: añade el string que te da Google al campo
`verification.google` en `src/app/layout.tsx`:

```ts
verification: {
  google: "xxxxxxxxxxxxxxxxxxxxxxxx",
},
```

## 2. Bing Webmaster Tools (10 min)

Mismo proceso, menos usado pero cubre +3% del tráfico y no cuesta nada.

1. https://www.bing.com/webmasters
2. **Importar desde Google Search Console** (lo más rápido — copia tu
   verificación y sitemap automáticamente).
3. Si no: añadir propiedad, verificar DNS, enviar sitemap.

## 3. Google Business Profile — 4 fichas de tienda (30 min, reclamar una por una)

Cada tienda física necesita su propia ficha en Google Maps para aparecer en
búsquedas locales ("tienda pokémon calpe", "magic béjar").

### Pasos por tienda (repite x4: Calpe, Béjar, Madrid, Barcelona)

1. https://business.google.com → **Gestionar ahora**
2. Busca el nombre "TCG Academy [ciudad]". Si ya existe (porque alguien la
   creó, típicamente un cliente), **reclámala**. Si no, **crear nueva ficha**.
3. Rellena:
   - Nombre exacto: `TCG Academy Calpe` (igual que en la web)
   - Categoría primaria: **Tienda de juegos de cartas** (existe literal) o
     **Tienda de juguetes** si la anterior no aparece
   - Dirección: la que figura en `src/data/stores.ts`
   - Teléfono y URL: `https://tcgacademy.es/tiendas/calpe`
   - Horario: tal cual está en la web
4. Verificación: Google manda una postal (10-15 días) O verifica por vídeo
   (más rápido, sólo algunos países). Elige lo que te ofrezca.
5. Sube **≥ 10 fotos**: fachada, interior, zona de juego, productos
   destacados, cartel con precio, equipo. Sin fotos, la ficha no convierte.
6. Añade servicios: "Retirada en tienda", "Compra en tienda", "Acepta
   tarjetas", "Wi-Fi gratuito".

### Consejo fuerte

Pide a clientes satisfechos que te dejen reseña. **Las reseñas pesan más que
casi cualquier otra cosa** en SEO local. Genera un short link tipo
`g.page/r/XXX/review` desde el panel de la ficha y ponlo en:

- Factura (código QR en el ticket)
- Email post-venta automático
- Instagram bio

## 4. Validadores y auditoría (cuando el sitio esté vivo)

Ejecútalos después del primer push a producción:

- **Rich Results Test** → https://search.google.com/test/rich-results  
  Pega una URL de ficha de producto. Debería detectar: Product, Breadcrumb.
- **Rich Results Test** en una guía (/guias/xxx) → debe detectar Article.
- **Schema.org Validator** → https://validator.schema.org
- **PageSpeed Insights** → https://pagespeed.web.dev → corrige lo que marque
  "red" en Core Web Vitals.
- **Ahrefs Site Audit (free)** o **Screaming Frog (free hasta 500 URL)** →
  detecta duplicate content, meta descriptions faltantes, etc.

## 5. Google Analytics 4 (opcional pero recomendado)

Sin datos, no sabemos qué funciona.

1. https://analytics.google.com → crear propiedad para tcgacademy.es
2. Copiar measurement ID `G-XXXXXXX`
3. Añadir en `.env.local`: `NEXT_PUBLIC_GA_ID=G-XXXXXXX`
4. Integrar script en `layout.tsx` (hacer issue en el repo cuando tengas el
   ID y lo añado).

## 6. Redes sociales — verificar perfiles con el dominio

Hacer que los perfiles de Instagram ENLACEN a tcgacademy.es (no a un Linktree)
aporta link juice + credibilidad. Los 3 perfiles ya están en el JSON-LD
(`sameAs`): calpe, bejar, madrid. Añadir el de Barcelona cuando exista.

## Orden recomendado (de más a menos urgente)

1. Google Search Console → enviar sitemap (sin esto Google no sabe que
   existes).
2. Google Business Profile → 4 fichas (tráfico local crítico para tienda
   física).
3. Bing Webmaster (copia del anterior).
4. Validar rich results.
5. PageSpeed Insights → iterar si hay rojos.
6. GA4 para medir.
