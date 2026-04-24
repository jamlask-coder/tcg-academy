# ENTITIES — Mapa SSOT del negocio

**Lee esto ANTES de crear una clave, tabla, servicio, evento o componente nuevo.**
Si la entidad ya existe aquí → reutiliza. Si no → añade entrada al registry antes de tocar código.

---

## 3 capas de verdad

| Capa | Qué contiene | Archivo SSOT |
|---|---|---|
| **1. Constantes de negocio** | IVA, umbrales, datos fiscales de la empresa, carrier | `src/config/siteConfig.ts` |
| **2. Registry de entidades** | Toda clave localStorage, evento, PII, adapter, retención | `src/lib/dataHub/registry.ts` |
| **3. Servicios canónicos** | ÚNICO punto de escritura por entidad (adapter del registry) | `src/services/*` + `src/lib/*` |

**Regla de oro**: leer → adapter del registry. Escribir → servicio canónico + `DataHub.emit("<entity>")`. Escuchar cambios → `DataHub.on("<entity>", reload)`.

---

## Entidades STABLE (SSOT sólida — reutilizar siempre)

| Entity | Qué es | Servicio para escribir | Evento |
|---|---|---|---|
| `orders` | Pedidos (checkout + admin inbox) | `@/lib/orderAdapter` | `tcga:orders:updated` |
| `users` | Registrados, sesión, roles | `@/context/AuthContext` | `tcga:users:updated` |
| `products` | Catálogo: estáticos + admin + overrides | `@/lib/productStore` | `tcga:products:updated` |
| `invoices` | Libro VeriFactu (hash encadenado, inmutable) | `@/services/invoiceService` | `tcga:invoices:updated` |
| `coupons` | Cupones admin + asignados a usuario | `@/services/couponService` | `tcga:coupons:updated` |
| `points` | Saldos + historial fidelidad (100pts/€) | `@/services/pointsService` | `tcga:points:updated` |
| `incidents` | Incidencias de pedido | `@/services/incidentService` | `tcga:incidents:updated` |
| `returns` | RMA + reembolsos | `@/services/returnService` | `tcga:returns:updated` |
| `cart` | Carrito del navegador | `@/context/CartContext` | `tcga:cart:updated` |
| `favorites` | Wishlist (dual: anón + User.favorites) | `@/context/FavoritesContext` | `tcga:favorites:updated` |
| `associations` | Grupos / invites / refcodes | `@/services/associationService` | `tcga:assoc:updated` |
| `consents` | RGPD + preferencias comunicación | `@/services/consentService` | `tcga:settings:updated` |
| `settings` | Config operacional admin | `@/services/settingsService` | `tcga:settings:updated` |
| `invoiceTemplate` | Branding visual factura (NO datos fiscales) | `@/lib/invoiceTemplate` | `tcga:invoice_template:updated` |
| `subcategories` | Subcategorías por juego | `@/data/subcategories` | `tcga:subcategories:updated` |
| `competitorPrices` | Cache 24h precios rivales | `@/services/competitorPriceService` | `tcga:competitor_prices:updated` |
| `priceHistory` | Snapshots diarios Cardmarket EUR | `@/services/priceHistoryService` | `tcga:price_history:updated` |

---

## Entidades PARTIAL (funcionan pero con scatter — refactor pendiente)

`messages`, `notifications`, `logs`, `reviews`, `complaints`, `solicitudes`, `pendingCheckout`, `heroImages`, `backups`, `emailTemplates`, `priceOverrides`, `discounts`, `presupuestos`, `userActivity`, `systemOps`, `breach_incidents`, `megamenu`, `backups_server`.

→ Antes de tocar: leer su entry en `registry.ts` para saber qué keys usa y si hay adapter.

## Entidades STUB (reservadas — NO implementar sin alinear)

`affiliates`, `subscriptions`, `warehouses`, `stockMovements`, `suppliers`, `purchaseOrders`, `tickets`, `promotions`, `banners`, `pages`, `languages`, `currencies`, `shippingMethods`, `paymentMethods`, `stores`, `sellers`, `integrations`, `trackingEvents`.

→ Clave + evento reservados. Si las implementas, reutiliza la entry del registry (no crees una nueva).

---

## Reglas inviolables

1. **SITE_CONFIG es SSOT vivo** — cambia ahí y se propaga. Nunca hardcodear 21, 149, 24h, VAT.
2. **Pedidos/facturas congelan con `captureSellerSnapshot()`** — una vez emitidos, NO releer issuer desde SITE_CONFIG (inmutabilidad fiscal).
3. **Factura ≠ editable** — solo anular + rectificativa vía `createInvoice()`. La cadena hash SHA-256 detecta manipulaciones.
4. **Precio con IVA siempre** en público. `usePrice` aplica rol + IVA automáticamente.
5. **Badge NUEVO** → `isNewProduct(product)` (45 días desde `createdAt`). NUNCA `product.isNew`.
6. **Un write = un emit**. Si escribes a una entidad sin disparar su evento, los listeners quedan desincronizados.
7. **Claves no registradas = huérfanas** → panel `/admin/herramientas` las muestra. Si aparece, o registrar en el registry o eliminar.

---

## Prompt recomendado para cada sesión nueva

> Lee primero `CLAUDE.md`, `AGENTS.md` y `ENTITIES.md`. Antes de tocar código para la funcionalidad X:
> 1. Busca en `src/lib/dataHub/registry.ts` si ya existe una entidad relacionada.
> 2. Dime qué servicio canónico usarías para escribir y qué evento emitirías.
> 3. Lista los archivos que tocarías y por qué.
> 4. NO escribas código hasta que confirme.

---

## Cómo añadir una entidad nueva

1. Añade entry a `STABLE` / `PARTIAL` / `STUBS` en `registry.ts` con `storageKeys`, `event`, `pii`, `retentionMonths`, `adapter`.
2. Añade el evento a `DataHubEvents` y al mapa `ENTITY_EVENT` en `events.ts`.
3. Crea el servicio canónico en `src/services/<entity>Service.ts` con `read()` y `write()` que llame a `DataHub.emit("<entity>")` al final.
4. Consumidores: `useEffect(() => DataHub.on("<entity>", reload), [])`.

Verificación: `/admin/herramientas` → "Integridad DataHub" no debe listar keys huérfanas.
