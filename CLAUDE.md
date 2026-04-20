@AGENTS.md

## Architecture

- **Framework**: Next.js with API routes and SSR (`output: 'export'` removed)
- **Business constants**: All in `src/config/siteConfig.ts` (`SITE_CONFIG`). Never hardcode 149, 24h, 21% VAT.
- **Pricing**: `usePrice` hook reads role from `AuthContext` and applies VAT. Always display `IVA incl.` — never show price-without-VAT to public users.
- **New product badge**: Use `isNewProduct(product)` from `@/data/products` (45-day window from `createdAt`). Never use `product.isNew`.
- **Auth**: `AuthContext` — localStorage auth with 24h expiry (30d with "Recordarme"). Password reset functional.
- **Security**: Input sanitization via `sanitizeString()` (XSS + SQL patterns). Server-side rate limiting in `src/utils/sanitize.ts`.
- **Returns**: `src/services/returnService.ts` — Full RMA workflow (request → approve → ship → refund).
- **Logging**: `src/lib/logger.ts` — Structured logging (localStorage client / stdout server).
- **Price verification**: `src/lib/priceVerification.ts` — Server-side price + stock validation.
- **Types**: `LocalProduct` interface in `src/data/products.ts`. Config type in `src/config/siteConfig.ts`.

## DataHub — SSOT Registry (fuente única de verdad)

**Antes de crear una clave, tabla, tipo, evento o servicio nuevo → BUSCAR en el registry.**

### Archivos clave
- `src/lib/dataHub/registry.ts` — Registro de TODAS las entidades (stable + partial + stub). SSOT de `storageKeys`, `event`, `pii`, `retentionMonths`, `category`, `criticalJson`.
- `src/lib/dataHub/events.ts` — Eventos canónicos `tcga:<entity>:updated`.
- `src/lib/dataHub/integrity.ts` — Detección de claves huérfanas (no registradas).
- `src/lib/dataHub/index.ts` — Fachada pública `DataHub.emit(...)` / `DataHub.on(...)`.

### Reglas
1. **Escribir** a una entidad → llamar su servicio canónico (adapter en el registry) + `DataHub.emit("<entidad>")`.
2. **Leer cambios** en componentes → `useEffect(() => DataHub.on("<entidad>", reload), [])`.
3. **Nueva funcionalidad** → mirar en `listEntities()` si ya existe. Si sí, reutilizar. Si no, añadir entrada al registry antes de crear código.
4. **No hardcodear** listas de claves en servicios. `backupService.TRACKED_KEYS` y `selfHeal.criticalKeys` se derivan del registry vía `getBackupTrackedKeys()` y `getCriticalJsonKeys()`.
5. **Claves huérfanas** visibles en `/admin/herramientas` → "Integridad DataHub".

### Panel admin
- `/admin/herramientas` — estado del registry, claves huérfanas (eliminar con 1 click).

## Sistema Fiscal VeriFactu

### Archivos clave
- `src/types/fiscal.ts` — Todos los tipos fiscales (InvoiceRecord, CompanyData, etc.)
- `src/types/tax.ts` — TaxPeriod, TaxSummary, AnnualSummary, Modelo 303/390/349
- `src/config/verifactuConfig.ts` — **AQUÍ se conecta el proveedor real** (1 línea)
- `src/services/invoiceService.ts` — createInvoice(), hash, encadenamiento, storage
- `src/services/taxService.ts` — calculateVAT(), generateQuarterlyReport(), exportCSV
- `src/services/verifactuService.ts` — VerifactuProvider interface + MockVerifactuProvider

### Cómo funciona el hash encadenado (VeriFactu)
1. Al crear cada factura: `generateInvoiceHash(invoice)` → SHA-256 de campos clave
2. `chainInvoiceHash(hash, prevChainHash)` → SHA-256(hash+prev), forma cadena inmutable
3. La cadena detecta manipulaciones: si falla → alerta en `/admin/fiscal/verifactu`
4. Regla crítica: las facturas NO se modifican. Solo anular + crear rectificativa.

### Cómo conectar un proveedor VeriFactu real
1. Edita `src/config/verifactuConfig.ts`: cambia `mode: "sandbox"`, rellena `apiUrl` y `apiKey`
2. Crea `src/services/providers/SeresVerifactuProvider.ts` implementando `VerifactuProvider`
3. En `getVerifactuProvider()` (verifactuService.ts): sustituye `new MockVerifactuProvider()` por tu clase
4. Cambia `mode: "production"` cuando todo funcione en sandbox
- Proveedores documentados: Seres, Edicom, B2Brouter, Facturae, Wolters Kluwer

### Modelos fiscales generados
- **Modelo 303**: `/admin/fiscal/trimestral` — IVA trimestral
- **Modelo 390**: `/admin/fiscal/anual` — Resumen anual IVA
- **Modelo 349**: `/admin/fiscal/intracomunitario` — Operaciones UE (preparado)

### Panel admin fiscal
- `/admin/fiscal` — Dashboard: KPIs, alertas, navegación
- `/admin/fiscal/facturas` — Libro de facturas con filtros y exportación CSV
- `/admin/fiscal/trimestral` — Modelo 303 + exportar para gestoría
- `/admin/fiscal/anual` — Modelo 390
- `/admin/fiscal/intracomunitario` — Operaciones UE
- `/admin/fiscal/verifactu` — Estado conexión, verificación integridad cadena
- `/admin/fiscal/documentacion` — Guía fiscal para el administrador

### Almacenamiento (preparado para BD)
- Facturas: `localStorage["tcgacademy_invoices"]` → reemplazar `loadInvoices()`/`saveInvoice()` en invoiceService.ts
- Hash integridad: `localStorage["tcgacademy_invoices_hash"]`

## Rules

- No `dangerouslySetInnerHTML` except in safe, sanitized contexts.
- All interactive elements (buttons, inputs) must have `aria-label` if they lack visible text.
- No hardcoded business values — use `SITE_CONFIG`.
- No ratings/stars UI anywhere on the site.
- No price-without-VAT in any public product display.
- No `console.log` or `debugger` in committed code.
- No `any` types — use proper TypeScript types.

## How to add a new product

1. Open `src/data/products.ts`
2. Add a new entry to `PRODUCTS` array following the `LocalProduct` interface
3. Set `createdAt: "YYYY-MM-DD"` for the NUEVO badge (shows 45 days)
4. Set `game` to an existing key from `GAME_CONFIG`
5. `images: []` — will show placeholder until real image URLs are added

## How to add a new game/category

1. In `src/data/products.ts`, add to `GAME_CONFIG`: `{ name, color, emoji, bgColor }`
2. Add to `CATEGORY_LABELS` if new categories are needed
3. Create `src/app/[game]/page.tsx` (copy existing game page)
4. Add logo to `public/images/logos/<slug>.svg`
5. Add to `src/data/megaMenuData.ts` for navbar

## How to change company data

Everything is in `src/config/siteConfig.ts`:
```ts
export const SITE_CONFIG = {
  name, cif, email, phone,
  carrier,            // nombre del transportista
  shippingThreshold,  // umbral envío gratis (€)
  dispatchHours,      // horas de envío
  vatRate,            // tipo IVA (%)
  newProductDays,     // días para badge NUEVO
}
```

## Quality tools

| Tool | Command | Purpose |
|------|---------|---------|
| ESLint | `npm run lint` | Static analysis, a11y, hooks rules |
| ESLint fix | `npm run lint:fix` | Auto-fix safe issues |
| Prettier | `npm run format` | Format + sort Tailwind classes |
| TypeScript | `npm run typecheck` | Strict type checking |
| Audit | `npm run audit` | npm vulnerability scan |
| Bundle analysis | `npm run analyze` | Visual bundle size breakdown |
| Accessibility | `npm run test:a11y` | axe-core WCAG 2.0 AA scan |
| Visual tests | `npm run test:visual` | Layout, overflow, no-error tests |
| Image opt | `npm run optimize:images` | Compress images >100KB |

## Code standards

- TypeScript strict mode (see tsconfig.json)
- ESLint: 0 errors required, warnings accepted
- Prettier: auto-formats on `npm run format`, sorts Tailwind classes
- Security headers: in `public/_headers` (Netlify/Cloudflare format)
- Accessibility: WCAG 2.0 AA via axe-core tests

## Visual Quality Gate

Before marking ANY visual change as complete, run:

```
npm run build && npm run test:visual
```

Tests live in `tests/visual/`. They verify:
- No horizontal overflow at 320px, 768px, 1024px, 1440px
- All navbar logos visible and not clipped
- Mega-menu Y position stays fixed when switching games (no jump)
- All main routes load without console errors
- Cart badge increments correctly
- ProductCard responsive layout

## Accessibility test

Requires a running server on port 3000:
```
npm run build && npm start &
npm run test:a11y
```

## Audit

Run the 20-test audit suite after significant changes:
```
node tests/audit/run-audit.mjs
```

## Deploy checklist

```
npm run check:all          # lint + format + typecheck + build + audit
node tests/audit/run-audit.mjs   # 20 custom tests
npm run backup             # timestamped backup to backups/
```

Full command:
```
npm run lint:fix && npm run format && npm run typecheck && npm run build && node tests/audit/run-audit.mjs && npm run backup
```

## Backend architecture (dual mode: local / server)

The app runs in two modes controlled by `NEXT_PUBLIC_BACKEND_MODE` in `.env.local`:
- **local** (default): All data in localStorage. No external services needed.
- **server**: Uses real database, email, and payment services.

### Infrastructure files
- `.env.example` — All production environment variables
- `src/lib/db.ts` — Database adapter (LocalDbAdapter / ServerDbAdapter)
- `src/lib/email.ts` — Email adapter (LocalEmailAdapter / ResendEmailAdapter)
- `src/lib/orderIds.ts` — Cryptographic order ID generation
- `src/lib/validations/checkout.ts` — Zod schemas for checkout validation

### API routes (src/app/api/)
- `POST /api/orders` — Create order (server-side price verification)
- `GET /api/orders` — List orders
- `PATCH /api/orders/[id]` — Update status + auto-notify customer
- `POST /api/auth` — Login, register, password reset
- `POST /api/payments` — Create payment intent (Stripe/Redsys)
- `POST /api/payments/webhook` — Payment provider webhooks
- `POST /api/notifications` — Send customer notifications
- `GET/PUT /api/admin/settings` — Admin configuration

### To connect real services (server mode)
1. Set `NEXT_PUBLIC_BACKEND_MODE=server` in `.env.local`
2. Fill in Supabase credentials → data persists in PostgreSQL
3. Fill in Resend API key → real emails sent
4. Fill in Stripe keys → real payment processing
5. Fill in VeriFactu credentials → invoices sent to AEAT
6. Security headers already in `next.config.ts` `headers()`

## Sistema de histórico de precios (gráfico evolución Cardmarket)

Gráfico SVG que aparece en el CardLightbox (debajo de la carta ampliada) mostrando
la evolución EUR de cada carta con datos Cardmarket (trend). Todos los visitantes
ven la misma serie — no es por-usuario. Se alimenta con snapshots diarios.

### Archivos clave
- `src/components/product/PriceHistoryChart.tsx` — componente SVG (sin libs externas)
- `src/services/priceHistoryService.ts` — API cliente read-only (cache 1h localStorage)
- `src/lib/priceHistoryStore.ts` — storage server (file JSON local / Supabase server)
- `src/lib/priceFetchers.ts` — adaptadores por juego (Scryfall, ygoprodeck, pokemontcg.io, TCGplayer)
- `src/lib/forex.ts` — USD→EUR vía frankfurter.app (BCE), cache 24h
- `src/app/api/price-history/route.ts` — GET público + POST bootstrap
- `src/app/api/cron/price-snapshot/route.ts` — refresco diario (header `x-cron-secret`)
- `supabase/migrations/price_history.sql` — tabla + RLS lectura pública

### Fuentes de precio por juego
| Juego | API | Moneda | Conversión |
|-------|-----|--------|-----------|
| Magic | Scryfall `prices.eur` | EUR | — |
| Yu-Gi-Oh | ygoprodeck `cardmarket_price` | EUR | — |
| Pokemon | pokemontcg.io `cardmarket.trendPrice` | EUR | — (solo sets EN) |
| One Piece, Dragon Ball, Riftbound, Lorcana | TCGplayer marketPrice | USD | frankfurter.app (BCE) |

### Cron diario
- Vercel: añadir `{ "crons": [{ "path": "/api/cron/price-snapshot", "schedule": "0 4 * * *" }] }` en `vercel.json`
- Netlify / externo: POST con header `x-cron-secret: $CRON_SECRET`
- 4:00 UTC = después del cierre BCE y del refresco trend de Cardmarket

### Modo local vs server
- **local**: snapshots en `<repo>/data/price-history.json` (ok para dev, fs efímero en Vercel)
- **server**: tabla Supabase `price_history` (PK `card_id,date`, retención 36 meses)

### Variables de entorno requeridas
- `CRON_SECRET` — secret para /api/cron/price-snapshot
- `TCGPLAYER_PUBLIC_KEY` + `TCGPLAYER_PRIVATE_KEY` — solo si quieres histórico OP/DB/Lorcana/Riftbound
- `POKEMON_TCG_API_KEY` — opcional (rate limit)

### Añadir un juego nuevo al histórico
1. Implementa `fetchNuevoPrice(id)` en `src/lib/priceFetchers.ts`
2. Añádelo al dispatcher `fetchPriceByGame(game, externalId)`
3. En `SetHighlightCards.tsx`, popula `game` + `externalId` en los highlights de ese juego
4. El chart aparece automáticamente si `card.externalId && card.game` en el lightbox
