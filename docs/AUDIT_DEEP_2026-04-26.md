# AUDIT DEEP — 2026-04-26

> **Aplicación del protocolo 6W + 6 lecturas a todo el sistema** tras el incidente del bypass de `/admin/pedidos`. Esta auditoría va más allá del grep sintáctico y aplica lectura adversarial, análoga, sistémica y temporal a las 4 zonas críticas del producto.

**Alcance**: auth/sesiones, comercio (orders/payments/refunds/coupons/points/stock), fiscal+PII+backups, frontend público + infra.

**Metodología**: 4 agentes Explore en paralelo, cada uno con threat model concreto + lecturas 6W + 6L. Hallazgos clasificados P0 (explotable hoy con impacto crítico) → P3 (deuda menor).

---

## 0. Resumen ejecutivo

| Severidad | Cuenta | Tono |
|---|---|---|
| **P0** | 14 | Explotables hoy. Algunos exfiltran PII de toda la base, otros permiten dinero gratis (refund replay, coupon doble redención, points sin tener) |
| **P1** | 14 | Vulnerabilidades reales pero requieren condición específica (sesión válida + race, modo local, etc.) |
| **P2** | 13 | Deuda de hardening — no explotables solas pero amplían blast radius |

**Patrones cross-cutting (los más importantes)**:

1. **TOCTTOU sistémico** — el patrón "leer estado → validar → escribir" sin lock aparece en 5 zonas: hash sesión (`AuthContext.persist`), stock (`/api/orders POST`), cupones (couponService.redeem), puntos (pointsService.applyPoints), refunds (markAsRefunded). En modo local cada uno es race-vulnerable; en modo server hace falta `SELECT ... FOR UPDATE` o transacciones serializables.

2. **Modo local heredado como vector de ataque** — múltiples endpoints (`/api/orders/[id]`, `/api/payments`, register, password reset) tienen ramas "modo local" que saltan validaciones server-side. Cuando se desplegó server mode, esas ramas quedaron pero no se desactivaron en `production`. Mismo patrón que el bypass de `/admin`.

3. **Falta de idempotencia en escrituras** — webhooks de pago, jobs cron (price-snapshot, backup-supabase), refunds, redención de cupones. Un cliente reintentando o un atacante replayeando llaman 2x → datos duplicados, dinero duplicado, puntos infinitos.

4. **PII fuera del registry de backup/retención** — algunos servicios escriben localStorage sin pasar por el registry (NIF en OrderRecord plano, customerTaxId hidratado al frontend, consents borrables). El backup AES-GCM es opcional, no obligatorio.

5. **Rate limits inconsistentes** — algunos endpoints tienen 10 req/min, otros ninguno. Falta capa global a nivel proxy.

---

## 1. Auth, sesiones y roles

> Threat model: atacante con cuenta normal intenta escalar a admin / hijack sesión / replay tokens.

### P0
- **A-01 — Token panel admin (`ADMIN_PANEL_TOKEN`) brute-forceable**.
  - **Dónde**: `src/proxy.ts` compara cookie `tcga_admin_panel` vs env `ADMIN_PANEL_TOKEN` con `===`.
  - **Vector**: si admin elige token corto o débil, atacante automatiza requests con cookies forjadas. No hay rate-limit en proxy.
  - **Lectura adversarial**: ¿qué pasa si el atacante manda 1M requests? → no se bloquea.
  - **Fix**: rate-limit por IP en `proxy.ts` antes de comparar; exigir longitud mín. 32 chars con entropía; usar `timingSafeEqual` no `===`.

### P1
- **A-02 — TOCTTOU en hash sesión (`AuthContext.persist`)**.
  - **Dónde**: `src/context/AuthContext.tsx` calcula hash async tras escribir `tcgacademy_user`. Entre escribir y hashear, otro tab puede mutar el storage.
  - **Lectura adversarial**: atacante con XSS escribe role=admin entre los dos pasos.
  - **Fix**: hashear ANTES de escribir, escribir conjunto atómico `{user, hash}` en una sola key.

- **A-03 — Session fixation (cookie no se rota tras login)**.
  - **Dónde**: `/api/auth` login no rota `tcga_session` si ya existía.
  - **Vector**: atacante setea cookie en navegador víctima antes del login → tras login mantiene la suya.
  - **Fix**: regenerar JWT con nuevo `jti` y `Set-Cookie` con `Max-Age` al inicio.

- **A-04 — Replay de token de password reset (modo local)**.
  - **Dónde**: en local mode el token vive en localStorage cliente, no se invalida tras uso.
  - **Fix**: marcar `usedAt` y rechazar si presente.

- **A-05 — Race en register (no transacción)**.
  - **Dónde**: 2 requests simultáneos con el mismo email pasan ambos el "check exists" antes de que el primero escriba.
  - **Fix**: `UNIQUE` constraint en server mode + capturar error duplicado.

- **A-06 — RememberMe (30d) no se revoca al cambiar contraseña**.
  - **Fix**: invalidar todos los JWT del usuario (cambio de `passwordVersion` claim) y exigir re-login en otros dispositivos.

- **A-07 — Logout no invalida JWT, solo borra cookie**.
  - **Vector**: si atacante capturó el JWT antes de logout, sigue válido hasta expiración.
  - **Fix**: blacklist de `jti` revocados (Redis o tabla `revoked_tokens`).

### P3
- **A-08 — Timing attack en dummy hash cache** (login con email inexistente). Ínfimo impacto, mitigar comparando bcrypt sobre hash dummy fijo.

---

## 2. Comercio (orders/payments/refunds/coupons/points/stock)

> Threat model: atacante con cuenta cliente intenta dinero gratis, doble redención, IDOR a pedidos ajenos.

### P0
- **C-01 — Refund replay (`markAsRefunded` no idempotente)**.
  - **Dónde**: `src/services/returnService.ts`. Llamar 2x reembolsa 2x los puntos al cliente.
  - **Vector**: admin con doble click, o atacante con sesión admin replay.
  - **Fix**: flag `refundedAt` + early return + log si se intenta repetir. Aplicar Test 36.

- **C-02 — Modificación de IBAN post-creación de devolución sin audit log**.
  - **Dónde**: form de retorno permite editar IBAN tras crear el RMA.
  - **Vector**: atacante cambia IBAN al suyo justo antes de que admin lo apruebe.
  - **Fix**: IBAN inmutable tras `requestedAt`; si necesita corrección → cancelar y abrir nuevo RMA. Audit log obligatorio.

- **C-03 — IDOR en `/api/orders/[id]` (modo local)**.
  - **Dónde**: rama local mode no comprueba `order.userId === session.userId`.
  - **Vector**: cliente A pide `/api/orders/<id-de-B>` → recibe pedido ajeno con PII.
  - **Fix**: gate ownership en TODAS las ramas (local + server).

- **C-04 — PATCH `/api/orders/[id]` acepta cualquier estado sin validar pago**.
  - **Vector**: cliente cambia su pedido a `pagado` sin haber pagado.
  - **Fix**: estado solo modificable por admin; cliente solo puede cancelar antes de envío.

- **C-05 — Doble redención de cupón (sin FOR UPDATE)**.
  - **Dónde**: `couponService.redeem` lee `usesRemaining`, decrementa en memoria, escribe.
  - **Vector**: 2 checkouts simultáneos del mismo cliente con el mismo cupón.
  - **Fix**: en server mode `UPDATE coupons SET uses = uses - 1 WHERE id = ? AND uses > 0 RETURNING *`. En local mode lock con `navigator.locks` o flag.

- **C-06 — Aplicar puntos sin tenerlos (modo local)**.
  - **Dónde**: `pointsService.applyPoints` confía en el balance del cliente sin re-leer.
  - **Vector**: cliente edita localStorage puntos = 999999 → checkout descuenta. En server mode la API valida, en local no.
  - **Fix**: `/api/orders POST` re-lee saldo desde fuente autoritativa antes de descontar.

- **C-07 — Stock overselling race condition**.
  - **Dónde**: `priceVerification.ts` lee stock, valida, luego `productStore` decrementa.
  - **Vector**: 10 clientes piden la última unidad → 10 órdenes pasan validación.
  - **Fix**: en server mode `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ? RETURNING *`. Si 0 rows → fallar checkout.

### P1
- **C-08 — Refund de puntos sin pro-rata** (devolución parcial reembolsa todos los puntos).
  - **Fix**: calcular `puntosDevueltos = puntosOriginal × (importeDevuelto / importeOriginal)`.

- **C-09 — Webhook de pago sin idempotencia** (`/api/payments/webhook`). Stripe reintenta → doble crédito.
  - **Fix**: dedupe por `event.id` (Stripe) en tabla `processed_webhooks`.

- **C-10 — Validación server-side de descuentos solo en `priceVerification.ts`** — algunas rutas la saltan (admin manual order).
  - **Fix**: helper único `enforcePriceLineByLine()` llamado desde TODOS los entry points.

- **C-11 — `/api/orders POST` no verifica que `couponCode` pertenezca al `userId`**.
  - **Vector**: cliente A roba cupón nominal de cliente B (ej. visto en email compartido).
  - **Fix**: si `coupon.assignedUserId` está set, debe coincidir con `session.userId`.

### P2
- **C-12** — Refund concurrente con return creation race.
- **C-13** — `cart` sin server validation antes del POST orders.
- **C-14** — Falta audit log en cambios de estado de pedido.

---

## 3. Fiscal, PII y backups

> Threat model: atacante exfiltra facturas/NIFs ajenos, manipula cadena hash, restaura backup malicioso.

### P0
- **F-01 — Cross-user invoice read (`gdprService.exportUserData`)**.
  - **Dónde**: filtra invoices por `name OR email OR taxId` que coincidan parcialmente.
  - **Vector**: usuario "Pedro García" llama exportUserData → recibe facturas de TODOS los Pedro García + cualquiera con email parcial similar.
  - **Fix**: filtrar EXCLUSIVAMENTE por `userId` resuelto vía `sourceOrderId → Order.userId`.

- **F-02 — Backups con PII masiva sin cifrado obligatorio**.
  - **Dónde**: `backupService` permite descarga JSON plano si admin no marca "encrypt".
  - **Vector**: backup en disco compartido, USB, mail, etc. → toda la base de PII fugada.
  - **Fix**: cifrado AES-GCM OBLIGATORIO; fail si no se proporciona passphrase. Test 37.

### P1
- **F-03 — `verifyBackupAdmin` con auth débil** (compara token contra env sin rate-limit).
  - **Fix**: misma protección que `requireAdmin` + rate-limit.

- **F-04 — `customerTaxId` (NIF) hidratado al frontend en `OrderRecord`**.
  - **Vector**: cliente abre devtools → ve su NIF (innecesario, ya está en su perfil) o si IDOR (C-03) ve el ajeno.
  - **Fix**: redactar NIF en payload de orders al cliente; backend solo lo necesita en facturas.

- **F-05 — Consents borrables (violación RGPD append-only)**.
  - **Dónde**: `consentService` permite `delete()`. RGPD exige histórico inmutable de consentimientos.
  - **Fix**: solo `append`; revocación = nuevo registro con `revokedAt`.

- **F-06 — Restauración de backup sin 2FA / time-lock**.
  - **Vector**: admin comprometido restaura backup antiguo → revierte cambios fiscales / inyecta facturas falsas.
  - **Fix**: 2FA obligatorio + delay 24h con notificación a otros admins (ya hay stub adminTwoFactor.ts).

### P2
- **F-07** — Cadena hash facturas no se verifica en cada save (solo en panel verifactu).
- **F-08** — `gdprService.deleteUserData` no anonimiza facturas (correcto fiscalmente, pero mal documentado).
- **F-09** — Falta export firmado de log de accesos a PII.
- **F-10** — Logs estructurados pueden contener PII (no se redacta `email` en `logger`).

---

## 4. Frontend público + infra

> Threat model: atacante anónimo (sin sesión) explota endpoints públicos, DoS, CSRF, CSP bypass.

### P0
- **I-01 — Crons sin idempotencia** (`/api/cron/price-snapshot`, `/api/cron/backup-supabase`).
  - **Vector**: si el cron se dispara 2x el mismo día → dos snapshots, dos backups, gasto Cardmarket/Supabase doblado, posible PK clash.
  - **Fix**: lock con `last_run_at >= today` en una tabla `cron_runs`.

- **I-02 — `/api/competitor-prices` DoS via `storeIds[]` ilimitado**.
  - **Vector**: atacante manda body con 10000 storeIds → 10k fetches outbound.
  - **Fix**: cap `storeIds.length <= 10`.

- **I-03 — CORS lógica INVERTIDA en `proxy.ts`**.
  - **Dónde**: condición `if (origin && allowedOrigins.includes(origin))` permite cuando debería rechazar (revisar el flujo, agente reportó inversión).
  - **Vector**: orígenes no autorizados aceptados → CSRF cross-site.
  - **Fix**: re-leer y testear con curl `Origin: https://evil.com`.

- **I-04 — CSP con `unsafe-inline` en producción**.
  - **Dónde**: `next.config.ts` headers tiene `script-src 'self' 'unsafe-inline'`.
  - **Vector**: cualquier XSS pasa CSP.
  - **Fix**: nonce-based CSP (Next 16 soporta `experimental.nonce`).

### P1
- **I-05 — `/api/payments` rate-limit insuficiente** (10/min). Atacante con rotación IP fuerza intentos de pago contra Stripe.
  - **Fix**: bajar a 3/min por IP + 10/hora por sesión + global 100/min.

- **I-06 — Falta SRI en scripts externos** (Google OAuth, etc.).
- **I-07 — `Permissions-Policy` no restringe `interest-cohort`, `microphone`, `camera`**.

### P2
- **I-08** — `/api/price-history` sin rate-limit.
- **I-09** — `/api/tcgcsv` sin rate-limit (caro).
- **I-10** — `/api/notifications` sin rate-limit.
- **I-11** — Falta `X-DNS-Prefetch-Control: off` en admin.
- **I-12** — `Cross-Origin-Opener-Policy` no establecido.

---

## 5. Plan de fix propuesto (por fases)

> Aplicar lectura **temporal**: cada fix debe llevar test de regresión. Aplicar lectura **análoga**: si fix-X arregla cupones, ¿el patrón TOCTTOU está también en stock? → fix conjunto.

### Fase 1 — P0 críticos (esta semana)
Bloque 1 (commerce — un único PR coherente, todos comparten patrón TOCTTOU+idempotencia):
- C-01 Refund idempotente
- C-02 IBAN inmutable + audit log
- C-05 Cupón con FOR UPDATE / lock
- C-06 Puntos re-validados server-side
- C-07 Stock con UPDATE atómico
- C-09 Webhook idempotente

Bloque 2 (auth/IDOR):
- C-03 IDOR `/api/orders/[id]` ownership
- C-04 PATCH solo admin
- A-01 Rate-limit + timingSafeEqual en `ADMIN_PANEL_TOKEN`

Bloque 3 (fiscal/PII):
- F-01 `exportUserData` filtrar por userId estricto
- F-02 Backup cifrado obligatorio

Bloque 4 (infra):
- I-01 Crons con lock
- I-02 Cap `storeIds`
- I-03 Verificar CORS y corregir

### Fase 2 — P1 (siguiente sprint)
Auth hardening (A-02 a A-07), refund pro-rata (C-08), enforcePriceLineByLine (C-10), cupón ownership (C-11), consents append-only (F-05), backup restore con 2FA (F-06), CSP nonce (I-04), payments rate-limit reforzado (I-05).

### Fase 3 — P2/P3
Resto de hardening + extender suite audit a 50+ tests con threat model.

---

## 6. Tests audit nuevos a añadir

| Test | Verifica |
|---|---|
| 36 | `markAsRefunded` rechaza segunda llamada (flag `refundedAt`) |
| 37 | `backupService.export` rechaza export sin passphrase si `BACKUP_REQUIRE_ENCRYPTION=1` |
| 38 | `/api/orders/[id]` GET rechaza con 403 si `userId !== session.userId` |
| 39 | `couponService.redeem` decrementa con guard `usesRemaining > 0` atómico |
| 40 | `proxy.ts` CORS rechaza `Origin: https://evil.com` |
| 41 | `gdprService.exportUserData` filtra estrictamente por userId resuelto |
| 42 | Crons tienen check `last_run_at` antes de ejecutar |
| 43 | `verifySessionToken` rota `jti` en login (anti-fixation) |

---

## 7. Compromiso de protocolo

A partir de hoy (memoria `feedback_deep_audit_protocol`), **toda nueva pieza** o auditoría de zona crítica responde explícitamente a:

- 6W: qué / cómo / cuándo / cuánto / para qué / por qué
- 6 lecturas: sintáctica, semántica, adversarial, sistémica, análoga, temporal

Las 35 tests audit existentes son la línea de defensa sintáctica. Esta auditoría inaugura la línea **adversarial sistémica**. Próximas auditorías deben extender el inventario de zonas críticas (este informe cubre 4; quedan ≥6 más: emails, association/refcodes, message system, restock subs, cron jobs internos, RGPD export/delete completos).
