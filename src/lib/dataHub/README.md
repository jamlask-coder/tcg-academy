# DataHub — Arquitectura de datos central (SSOT)

> **Regla de oro**: cada dato existe una sola vez y todo lo demás se conecta a él. Antes de crear cualquier tabla, clave, colección, endpoint, estado o servicio, **busca aquí** si ya existe.

## Por qué existe

Antes del DataHub, el proyecto tenía:
- 4 almacenes solapados para notificaciones
- 7 sistemas de logs sin coordinación
- Código de mensajes disperso entre 5+ ficheros
- Claves paralelas como `tcgacademy_payment_status` y `tcgacademy_stock_overrides` que duplicaban información ya presente en otras entidades
- Tipos duplicados (`CartItem` en 2 sitios, `Order` legacy + `AdminOrder`, etc.)
- Cálculos independientes que generaban números distintos para la misma cosa

El DataHub consolida todo en una sola arquitectura:
- **Un registry** que lista todas las entidades con sus keys, eventos y adapters.
- **Eventos canónicos** que sustituyen strings mágicos.
- **Un sistema de integridad** que detecta keys huérfanas.
- **Stubs de tipo** para entidades futuras (afiliados, suscripciones, almacenes, etc.) que ya tienen su sitio reservado.

## Archivos

```
src/lib/dataHub/
├── index.ts          Public API (DataHub namespace)
├── registry.ts       Listado central de TODAS las entidades
├── events.ts         Constantes de eventos canónicos + emit/on
├── types.ts          Tipos canónicos + stubs para futuro
├── integrity.ts      Detección de zombie keys y huérfanos
└── README.md         Este documento
```

## Uso

### Suscribirse a cambios en una entidad

```tsx
import { DataHub } from "@/lib/dataHub";

useEffect(() => {
  const unsub = DataHub.on("orders", () => {
    setOrders(readAdminOrdersMerged());
  });
  return unsub;
}, []);
```

### Emitir tras un write

```ts
import { DataHub } from "@/lib/dataHub";

function saveInvoice(inv) {
  localStorage.setItem("tcgacademy_invoices", JSON.stringify([...invoices, inv]));
  DataHub.emit("invoices");  // Notifica a todas las vistas subscritas.
}
```

### Consultar metadatos de una entidad

```ts
import { DataHub } from "@/lib/dataHub";

const entity = DataHub.getEntity("orders");
// { key: "orders", storageKeys: ["tcgacademy_admin_orders", ...], event: "tcga:orders:updated", pii: true, retentionMonths: 72, adapter: "@/lib/orderAdapter", maturity: "stable", ... }
```

### Integridad: detectar keys huérfanas

```ts
import { DataHub } from "@/lib/dataHub";

const report = DataHub.buildIntegrityReport();
// { orphanKeys: [...], emptyEntities: [...], ... }
```

## Ciclo de vida de una entidad

| Estado | Significado |
|--------|-------------|
| `stable` | SSOT consolidada, adapter canónico existe, eventos disparados. |
| `partial` | Existe pero con scatter/duplicados o sin evento consistente. |
| `stub` | Reservada para futuro, solo hay type + entry en registry. |
| `deprecated` | Se está eliminando; no usar en código nuevo. |

Una entidad empieza en `stub`, se promueve a `partial` cuando se implementa su servicio, y a `stable` cuando tiene:
- Un único adapter canónico.
- Un evento canónico disparado en todos los writes.
- Sin claves paralelas.
- Sin MOCK_ constants usadas como datos vivos.

## Cómo añadir una nueva entidad

### Paso 1 — comprobar si ya existe

Buscar en `registry.ts` si alguna entidad cubre el caso (total o parcialmente). Si ya existe:
- Si es **total**: reutilizar, no crear nueva.
- Si es **parcial**: añadir campos a la entidad existente; no crear tabla paralela.

### Paso 2 — añadir al registry

En `registry.ts`, añade la entrada en la sección apropiada (`STABLE`, `PARTIAL` o `STUBS`):

```ts
{
  key: "warranties",
  description: "Garantías extendidas de productos",
  storageKeys: ["tcgacademy_warranties"],
  event: "tcga:warranties:updated" as DataHubEventName,
  pii: true,
  retentionMonths: 72,
  adapter: "@/services/warrantyService",
  maturity: "stub",
  dependsOn: ["orders", "products"],
  notes: "FUTURO: vincular a pedido original + producto específico.",
}
```

### Paso 3 — añadir evento canónico

En `events.ts`, añade la constante:

```ts
WARRANTIES_UPDATED: "tcga:warranties:updated",
```

Y el mapping en `ENTITY_EVENT`:
```ts
warranties: DataHubEvents.WARRANTIES_UPDATED,
```

### Paso 4 — añadir type

En `types.ts`, añade el interface:

```ts
export interface Warranty {
  id: string;
  orderId: string;
  productId: number;
  // ...
}
```

### Paso 5 — crear servicio adapter

```ts
// src/services/warrantyService.ts
import { DataHub } from "@/lib/dataHub";

export function saveWarranty(w) {
  localStorage.setItem("tcgacademy_warranties", JSON.stringify([...all, w]));
  DataHub.emit("warranties");
}
```

### Paso 6 — actualizar backup + selfHeal

Ambos leen del registry automáticamente si usas `DataHub.allRegisteredKeys()`.

## Entidades registradas (snapshot 2026-04-18)

### Stable (14)
orders · users · products · coupons · points · incidents · invoices · returns · cart · favorites · subcategories · associations · consents · settings

### Partial (6)
messages · notifications · logs · reviews · complaints · solicitudes

### Stub — futuro (17)
affiliates · subscriptions · warehouses · stockMovements · suppliers · purchaseOrders · tickets · promotions · banners · pages · languages · currencies · shippingMethods · paymentMethods · stores · sellers · integrations · trackingEvents

## Reglas duras

1. **Un dato = una entidad = una clave canónica.** Si necesitas el mismo dato en 2 sitios, léelo del mismo sitio.
2. **Un evento = un nombre canónico.** No inventes strings; usa `DataHubEvents.X`.
3. **Un tipo por concepto.** Si ves 2 interfaces modelando lo mismo, uno debe irse.
4. **Emit después de cada write.** Las vistas reactivas dependen de esto.
5. **No MOCK_ como datos vivos.** Los mocks son para seed y tests.
6. **No hardcodes lógica de negocio dispersa.** Si el cálculo de "¿es pedido pendiente?" vive en 3 sitios distintos, uno debe ser la fuente; los otros lo llaman.
7. **Cambio de shape → migración escrita.** Si cambias el shape de una entidad, documenta la migración y actualiza `selfHeal`.

## Integración con backup / selfHeal

- `backupService.ts` → recorre `DataHub.allRegisteredKeys()` para saber qué incluir en snapshots.
- `selfHeal.ts` → valida JSON de todas las keys registradas.
- `/admin/herramientas` → muestra `DataHub.buildIntegrityReport()`.

## Migración (para el futuro backend)

Cuando se active `NEXT_PUBLIC_BACKEND_MODE=server`:
- Los `storageKeys` quedan como cache local o se ignoran.
- Cada `adapter` pasa a usar un cliente de API (`@/lib/db`).
- El `event` sigue siendo canónico: se emite tras la respuesta del servidor.
- Los tipos en `types.ts` se convierten en el contrato de API (mismo shape frontend y backend).

El objetivo: **migrar a backend real no requiere reescribir el resto de la app**, solo los 20-ish adapters.
