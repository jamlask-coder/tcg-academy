# Activación de modo servidor

Este documento describe cómo pasar de **modo local** (todo en `localStorage`) a
**modo servidor** (Supabase + Stripe + Resend + VeriFactu real) sin reescribir
la aplicación.

La arquitectura está preparada: interfaces, adaptadores, esquema SQL y rutas
API. Sólo falta conectar credenciales y migrar los servicios uno a uno.

---

## 1. Estado actual

### Lo que ya funciona en ambos modos

| Capa | Local | Server |
|------|-------|--------|
| Interfaz `DbAdapter` | ✅ | ✅ |
| `LocalDbAdapter` | ✅ (orders/users/invoices/settings reales; resto = stubs) | n/a |
| `ServerDbAdapter` | n/a | ✅ orders/users/invoices/settings/audit. Resto: stubs. |
| Checkout | ✅ | ✅ (misma API) |
| Admin panel | ✅ | ✅ |
| Sistema fiscal VeriFactu | ✅ (Mock) | ✅ (pendiente conectar proveedor real) |

### Servicios que siguen escribiendo a `localStorage` directamente

En modo local **sigue siendo el camino canónico** de escritura. En modo server,
cuando llegue el momento, se migrarán uno a uno a `getDb()`:

- `src/services/couponService.ts` → `tcgacademy_user_coupons`, `tcgacademy_admin_coupons`
- `src/services/pointsService.ts` → `tcgacademy_pts`, `tcgacademy_pts_history`, `tcgacademy_assoc`, `tcgacademy_refcodes`, `tcgacademy_usercodes`, `tcgacademy_pts_attr`
- `src/services/incidentService.ts` → `tcgacademy_incidents`
- `src/services/notificationService.ts` → `tcgacademy_notif_dynamic`
- `src/services/messageService.ts` → `tcgacademy_messages`
- `src/services/returnService.ts` → `tcgacademy_returns`
- `src/services/invoiceService.ts` → `tcgacademy_invoices`, `tcgacademy_invoices_hash`
- `src/lib/productStore.ts` → `tcgacademy_new_products`, `tcgacademy_product_overrides`, `tcgacademy_deleted_products`

Todas estas claves están catalogadas en `src/lib/dataHub/registry.ts` (SSOT).

---

## 2. Pasos de activación (orden recomendado)

### Paso 1 — Proyecto Supabase

1. Crear proyecto en <https://supabase.com/dashboard>.
2. En el SQL Editor, aplicar `supabase/schema.sql` completo.
3. Revisar `docs/DATABASE.md` para entender las 34 tablas y los 18 stubs.
4. Verificar:
   - Extensiones `uuid-ossp` y `pgcrypto` activas.
   - RLS habilitado en todas las tablas con datos de usuario.
   - Triggers `updated_at` creados.

### Paso 2 — Variables de entorno

Copiar `.env.example` a `.env.local` y rellenar:

```bash
NEXT_PUBLIC_BACKEND_MODE=server

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>  # server-side only

# Email
RESEND_API_KEY=<re_...>
RESEND_FROM_EMAIL=noreply@<tudominio>

# Pagos (Stripe)
STRIPE_SECRET_KEY=<sk_live_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_live_...>

# VeriFactu (ver src/config/verifactuConfig.ts)
VERIFACTU_API_URL=...
VERIFACTU_API_KEY=...
```

### Paso 3 — Flipear modo

Con `NEXT_PUBLIC_BACKEND_MODE=server`, `getDb()` usa `ServerDbAdapter`. Los
servicios que ya pasan por `getDb()` (orders/users/invoices/settings) escriben
a Supabase. Los que siguen en localStorage no se ven afectados.

### Paso 4 — Migrar servicios (uno a uno)

Para cada servicio, la receta es mecánica:

1. En `ServerDbAdapter` (src/lib/db.ts), reemplazar el stub por la query real
   de Supabase.
2. En el servicio (`src/services/<x>Service.ts`), cambiar `safeRead/safeWrite`
   por llamadas a `getDb().<método>()`.
3. Mantener los `DataHub.emit("<entidad>")` para que las vistas reactivas
   sigan funcionando igual en ambos modos.
4. Test: un pedido/acción que toque ese servicio, verificar en Supabase que
   la fila aparece.

Orden sugerido por valor / dependencias:

1. **products** (bloquea catálogo)
2. **cart + favorites** (UX básica logueada)
3. **coupons** (depende de users y orders)
4. **points** (depende de orders)
5. **notifications + messages** (no bloqueantes)
6. **incidents + returns** (requieren orders)
7. **complaints + solicitudes + company_profiles**

### Paso 5 — Pagos reales

1. Dar de alta webhook Stripe apuntando a
   `https://<tudominio>/api/payments/webhook`.
2. Verificar firma con `STRIPE_WEBHOOK_SECRET`.
3. Probar un pago de 1 € en modo sandbox antes de pasar a live.
4. Confirmar que `payment_intent.succeeded` dispara `setOrderPaymentStatus` →
   emisión de factura automática (si hay NIF).

### Paso 6 — Email real (Resend)

1. Verificar dominio en Resend.
2. Crear plantillas HTML (confirmación, envío, factura adjunta).
3. `src/lib/email.ts` ya tiene `ResendEmailAdapter` — sólo falta la API key.
4. Probar con `POST /api/notifications` enviando un correo a una cuenta real.

### Paso 7 — VeriFactu real

1. Contratar proveedor homologado (Seres, Edicom, B2Brouter…).
2. Crear `src/services/providers/<Nombre>VerifactuProvider.ts` implementando
   la interfaz `VerifactuProvider`.
3. En `src/services/verifactuService.ts::getVerifactuProvider()` sustituir
   `MockVerifactuProvider` por la nueva clase.
4. En `src/config/verifactuConfig.ts` cambiar `mode: "sandbox"` → `"production"`.
5. Emitir una factura de prueba y verificar en `/admin/fiscal/verifactu` que
   el estado pasa de `pendiente` → `aceptada`.

---

## 3. Regla inmutable — facturas

**NO se emite factura al confirmar un pedido con pago diferido** (tienda,
transferencia, contrarreembolso). La factura sólo se crea cuando:

1. `paymentStatus === "cobrado"` (marcado por webhook o por el admin).
2. El pedido tiene NIF/NIE/CIF válido (Art. 6.1.d RD 1619/2012).

Esto es **igual en local y en server**. No se cambia al migrar.

Implementado en:
- `src/app/finalizar-compra/page.tsx` — skip createInvoice si `form.pago` es `tienda` o `transferencia`.
- `src/lib/invoiceRecovery.ts::regenerateInvoiceForOrder` — valida cobrado + NIF.
- `src/lib/fiscalAutopilot.ts` — escanea al arrancar y emite las pendientes.
- `src/app/admin/pedidos/[id]/PedidoDetailClient.tsx` — al marcar "cobrado" para un pago diferido, dispara `regenerateInvoiceForOrder` automáticamente.

---

## 4. Recogida en tienda — flujo completo

1. Cliente elige "Recogida en tienda" → `form.envio = "tienda"`, `form.pago = "tienda"`.
2. Selecciona una de las 4 tiendas (Calpe, Béjar, Madrid, Barcelona) → `form.tiendaRecogida`.
3. Al enviar: pedido se crea con `paymentStatus = "pendiente"` y **sin factura**.
4. Admin ve el pedido en `/admin/pedidos` con el filtro "Recogidas/transf. pend." activado.
5. Cliente llega a la tienda y paga → admin pulsa "Marcar como cobrado".
6. El toggle dispara `regenerateInvoiceForOrder` → si hay NIF, emite factura y
   muestra el número; si no, avisa al admin para añadir el NIF antes.

Las 4 tiendas están definidas en `src/app/finalizar-compra/page.tsx` (array
`TIENDAS`). Para añadir una nueva, basta con ampliar ese array y actualizar el
mapeo de `pickupStore` en admin si procede.

---

## 5. Checklist mínimo antes de "ir a live"

- [ ] `schema.sql` aplicado en Supabase de producción.
- [ ] RLS activo y probado con un usuario no-admin (no debe ver pedidos de otros).
- [ ] `.env.local` con todas las claves reales (sin ningún placeholder).
- [ ] Stripe webhook firmado y recibiendo eventos reales.
- [ ] Resend dominio verificado y email de prueba enviado.
- [ ] VeriFactu en modo `production` con proveedor real y una factura de prueba aceptada.
- [ ] Un pedido real (1 €) completado: pago → email → factura.
- [ ] Backup manual ejecutado (`/admin/copias`) y descargado.
- [ ] Monitorización: Sentry o equivalente conectado.
- [ ] Tests `npm run build && npm run test:visual` y auditoría OK.
