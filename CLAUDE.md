@AGENTS.md

## Architecture

- **Framework**: Next.js static export (`output: 'export'`) — no API routes, no SSR
- **Business constants**: All in `src/config/siteConfig.ts` (`SITE_CONFIG`). Never hardcode 149, 24h, 21% VAT.
- **Pricing**: `usePrice` hook reads role from `AuthContext` and applies VAT. Always display `IVA incl.` — never show price-without-VAT to public users.
- **New product badge**: Use `isNewProduct(product)` from `@/data/products` (45-day window from `createdAt`). Never use `product.isNew`.
- **Auth**: `AuthContext` — localStorage demo auth with 24h session expiry.
- **Types**: `LocalProduct` interface in `src/data/products.ts`. Config type in `src/config/siteConfig.ts`.

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

## Backend integration notes (for when connecting real backend)

- Replace `src/data/products.ts` mock data with API calls
- Replace `src/context/AuthContext.tsx` localStorage with real session/JWT
- Replace `src/context/CartContext.tsx` localStorage with server cart
- All prices come from backend — `usePrice` hook needs updating
- `src/utils/sanitize.ts` covers client-side XSS; backend must also validate
- Remove `output: 'export'` from `next.config.ts` to enable SSR/API routes
- Security headers will need to move from `public/_headers` to `next.config.ts` `headers()`
