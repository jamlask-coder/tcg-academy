# Conectar pasarela Redsys (TPV virtual bancario)

Esta guía describe el proceso completo para activar Redsys en TCG Academy
una vez el banco entregue las credenciales del comercio.

> **Estado actual:** scaffolding listo (`REDSYS_MODE=off`). El endpoint
> `/api/payments/redsys` devuelve 501 mientras no haya credenciales.

---

## 1. Qué pedir al banco

Al solicitar el TPV virtual, el banco entrega un **PDF de alta** con:

| Dato | Variable de entorno | Ejemplo |
|------|---------------------|---------|
| Código de comercio (FUC) | `REDSYS_MERCHANT_CODE` | `123456789` |
| Número de terminal | `REDSYS_TERMINAL` | `001` |
| Clave de cifrado SHA-256 (base64) | `REDSYS_SECRET_KEY` | `sq7HjrUOBfKmC576ILgskD5srU870gJ7` |
| Modo | `REDSYS_MODE` | `test` → `production` |

Además debes proporcionar al banco las URLs de:

- **Notificación on-line:** `https://tcgacademy.es/api/payments/redsys/notify`
- **Retorno OK:** `https://tcgacademy.es/cuenta/pedidos?pago=ok`
- **Retorno KO:** `https://tcgacademy.es/cuenta/pedidos?pago=ko`

> Algunos bancos exigen **IP fija de origen**. Vercel no garantiza IP
> estática; si el banco lo exige, hablar con ellos para que admitan
> rangos CIDR de Vercel o usar un proxy con IP fija.

---

## 2. Requisitos técnicos cumplidos por TCG Academy

El scaffolding actual ya cubre los requisitos técnicos del banco:

- [x] **HTTPS obligatorio** en todo el dominio (Vercel + cert auto-renovado).
- [x] **URL de notificación accesible públicamente** sin auth ni rate-limit
      agresivo (`/api/payments/redsys/notify`).
- [x] **Verificación HMAC-SHA256** de cada notificación antes de tocar BD
      (`verifyRedsysNotification` en `redsysProvider.ts`).
- [x] **Idempotencia** de notificaciones (Set en memoria con TTL 24h —
      mismo patrón que el webhook Stripe).
- [x] **Logs persistentes** vía `db.logAudit()` para conciliación.
- [x] **3DS2 / PSD2 / SCA**: el provider envía `DS_MERCHANT_EMV3DS` con
      email, teléfono e IP del titular para reducir fricción.
- [x] **Información comercial visible al cliente** antes de pagar:
      razón social, CIF, dirección, teléfono, email, política de
      desistimiento, condiciones aceptadas con checkbox no preseleccionado
      (validado en checkout actual).
- [x] **PCI-DSS SAQ-A**: TCG Academy nunca ve datos de tarjeta — el cliente
      pasa por el TPV alojado en SIS.

Pendientes de la integración (cuando se active):

- [ ] Persistir mapping `dsOrder ↔ orderId` si los IDs internos no cumplen
      el formato Redsys (4-12 chars, 4 primeros numéricos). De momento la
      función `normalizeOrderId()` reusa el ID si cumple.
- [ ] Auto-declaración anual PCI-DSS SAQ-A en el portal del banco.
- [ ] Procedimiento documentado de chargebacks (cuando llegue el primero).

---

## 3. Activación paso a paso

### 3.1 Pruebas en SIS de test

1. Añade en `.env.local` (y en Vercel para preview/staging):
   ```bash
   REDSYS_MODE=test
   REDSYS_MERCHANT_CODE=999008881   # FUC de pruebas que da el banco
   REDSYS_TERMINAL=001
   REDSYS_SECRET_KEY=sq7HjrUOBfKmC576ILgskD5srU870gJ7   # clave de pruebas pública Redsys
   ```
2. Reinicia el servidor.
3. Endpoint `POST /api/payments/redsys` con body:
   ```json
   {
     "orderId": "0001TEST",
     "amount": 12.34,
     "description": "Pedido TCG Academy #0001TEST",
     "cardholder": { "name": "JUAN PRUEBA", "email": "test@example.com" }
   }
   ```
4. Devuelve `endpoint`, `merchantParameters`, `signature` — el frontend hace
   POST automático con esos campos al `endpoint` (form HTML invisible).
5. **Tarjetas de prueba** (oficiales Redsys):
   - **Aprobada:** `4548 8120 4940 0004` · CVV 123 · Cualquier fecha futura
   - **Aprobada con 3DS2:** clave SMS `123456`
   - **Denegada:** `4548 8127 4440 0007`

### 3.2 Migración a producción

1. Cuando el banco autorice (recibirás email/llamada):
   ```bash
   REDSYS_MODE=production
   REDSYS_MERCHANT_CODE=<FUC_real>
   REDSYS_TERMINAL=001
   REDSYS_SECRET_KEY=<clave_produccion>
   ```
2. Probar UNA transacción real de bajo importe (ej. 1€).
3. Verificar:
   - Llega notificación a `/api/payments/redsys/notify` con `Ds_Response < 100`.
   - Estado del pedido pasa a `confirmado` + `paymentStatus: cobrado`.
   - Se emite factura VeriFactu (cuando esté en producción) con NIF del
     cliente.
   - Audit log `redsys_payment_succeeded` queda registrado.

### 3.3 Conciliación

- **Diaria:** descargar extracto del banco y cruzar con `redsys_payment_*`
  en audit log. Discrepancias → revisar manualmente con el código de
  autorización (`Ds_AuthorisationCode`).
- **Mensual:** verificar que no hay pedidos `confirmado` sin notificación
  (= pedidos cobrados que no llegaron por webhook por algún motivo). El
  banco permite reenviar manualmente desde el panel TPV.

---

## 4. Códigos de respuesta Redsys

| Rango | Significado |
|-------|-------------|
| `0000`–`0099` | Autorizada |
| `0101`–`0102` | Tarjeta caducada / restringida |
| `0129` | CVV erróneo |
| `0180` | Operación rechazada por el emisor |
| `0184` | Error en autenticación 3DS2 |
| `0190`–`0191` | Denegación genérica |
| `0900` | Operación de devolución correcta |
| `9XXX` | Errores técnicos / firma inválida / formato |

Tabla completa: panel TPV del banco o documentación oficial Redsys.

---

## 5. Ficheros del scaffolding

| Archivo | Función |
|---------|---------|
| `src/config/redsysConfig.ts` | Config + flag `isRedsysConfigured()` |
| `src/services/providers/redsysProvider.ts` | Firma HMAC-SHA256 + verify + 3DS2 payload |
| `src/app/api/payments/redsys/route.ts` | POST que prepara el form para el SIS |
| `src/app/api/payments/redsys/notify/route.ts` | Recibe notificación banco + actualiza pedido |

No se ha tocado UI de checkout — el botón "Pagar con tarjeta (Redsys)" se
añadirá al checkout cuando el provider esté autorizado en producción.
