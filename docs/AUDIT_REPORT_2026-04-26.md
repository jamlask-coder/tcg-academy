# Informe ejecutivo de auditoría — TCG Academy

**Fecha:** 2026-04-26
**Base:** commits `553b6bc` (factura base+IVA) + audit AAA + hold 14d (comprador y asociados)
**Agentes:** 4 testers paralelos (Seguridad, E-commerce/QA, SEO/Perf, Arquitectura/UX) — auditoría inicial 2026-04-25
**Verificación cruzada + extensión:** 2026-04-26
**Estado del código:** ESLint 0 errores · TypeScript clean · Build clean · Audit 30/30 · Regression hold 15/15

---

## 0. Cómo se cruzaron las conclusiones

Los 4 agentes operaron en dominios distintos (security, e-commerce, SEO, arquitectura) → poca redundancia directa. La verificación se hizo en 3 capas:

1. **Cada hallazgo "confirmado" se reverificó** abriendo el archivo y línea citados.
2. **Falsos positivos se identificaron** (3 en total) y se descartaron del informe consolidado.
3. **Convergencias temáticas** se agruparon: distintos agentes apuntan al mismo síntoma raíz aunque desde ángulos diferentes.

Resultado: 14 hallazgos válidos, 3 falsos positivos descartados, 4 convergencias que justifican proyecto transversal.

---

## 1. CONSENSO — convergencias entre agentes (raíz común)

| Convergencia | Agentes | Síntomas reportados | Causa raíz |
|---|---|---|---|
| **C1 — Storage layer cliente sobrecargado de datos sensibles** | A + D | A: PII sin cifrar (`tcgacademy_user`) + passwords PBKDF2 localStorage. D: 96 keys ~200KB/usuario, sin paginación, `localStorage cap risk` en escala | Diseño "local-first" que mezcla datos sensibles, históricos y operativos en el mismo storage del navegador. **Decisión** estratégica: migrar auth+PII a server (Supabase) cuando se active `BACKEND_MODE=server`. Mientras tanto: aceptar como riesgo conocido de modo demo. |
| **C2 — Páginas críticas son CSR y monolitos** | C + D | C: `/`, `/busqueda`, `/catalogo` son `"use client"` (SEO LCP degradado, googlebot ve HTML vacío). D: 5 componentes > 1500 líneas (FacturaAlbaranForm 2003, finalizar-compra 1783, etc.) | Mismo síntoma desde dos ángulos: SEO + mantenibilidad. Refactor: convertir home/busqueda/catalogo a RSC con islands de filtro, partir los monolitos en sub-componentes con responsabilidades únicas. |
| **C3 — Confianza excesiva en datos del cliente** | A + B | A: rate limits OK, pero datos en body se aceptan tal cual. B: `pointsDiscount` y descuento de cupón se sumaban sin recomputar server-side (P0 ya cerrado en audit AAA con `validateAndComputeDiscounts`) | Patrón "el cliente envía cifras finales". **Cerrado** para points/coupons. Pendiente revisar otros endpoints (returns, incidents, settings) por si reciben cifras precomputadas. |
| **C4 — Observabilidad fragmentada** | A + D | A: errores tragados en `.catch()`. D: logger sin Sentry/external, errorReporter infrautilizado, 119 throws sin notificación al usuario | UX → "el botón no hace nada y nadie sabe por qué". Solución: política unificada — todo `catch` debe llamar `errorReporter.report()` y mostrar toast/banner. Fase 2: Sentry server-side. |

---

## 2. DISCREPANCIAS y FALSOS POSITIVOS detectados

| Reportado por | Afirmación | Realidad | Lección |
|---|---|---|---|
| Agente B | Race condition en `addItem` carrito (P1) | JS es single-threaded en el mismo tab. Race entre tabs SÍ existe pero `verifyOrder` server-side la cubre. **Falso positivo** | Tester debe verificar mentalmente el modelo de ejecución antes de marcar "race condition". |
| Agente D | RLS no habilitada en Supabase (P0) | `supabase/schema.sql` tiene 25× `ENABLE ROW LEVEL SECURITY` + 19× `CREATE POLICY`. **Falso positivo** | Tester se quedó en `next.config.ts` y no abrió el SQL. Auditoría DB requiere mirar el schema, no la config. |
| Agente D | "174 tests" en el repo | Real: ~38 (25 audit + 6 regression invoice + 7 unit lib + 8 visual/a11y). **Cifra inventada** | Tester estaba estimando, no contando. Conclusión: pedir SIEMPRE el comando exacto que produce el número. |

**Lección transversal:** los 3 falsos positivos vinieron del mismo agente en 2 casos (D) y de B una vez. Todos eran "cualitativos" (nombres impresionantes pero no verificados con código). Para futuros barridos: exigir `file:line` + comando reproducible en cada hallazgo.

---

## 3. HALLAZGOS por criticidad

### 🔴 P0 — Crítico (bloquea producción / pérdida de dinero)

**Estado: 0 abiertos.** Los P0 detectados (DEMO_USERS sin guard, fraude pointsDiscount/coupon, og-default.png ausente, backups/ leak) ya están **cerrados** en el commit `553b6bc` + Audit AAA 2026-04-25 + Test 28-30 del audit suite.

### 🟠 P1 — Alto (UX rota, SEO bloqueante, escalado bloqueado)

| Id | Hallazgo | Archivo | Impacto | Fix recomendado |
|---|---|---|---|---|
| P1.1 | Home `/` es `"use client"` | `src/app/page.tsx:1` | LCP +1-2s, Googlebot ve HTML vacío hasta hidratar → ranking degradado | Migrar a RSC: hero + grids estáticos en server, islands solo donde haya estado (`AddToCart`, `FavoriteButton`) |
| P1.2 | `/busqueda` y `/catalogo` CSR puro | idem | Filtros con query params no indexables | Server Component que resuelve filtros en server, devuelve products renderizados |
| P1.3 | XSS en checkout — Zod valida pero no sanitiza | `finalizar-compra/page.tsx` | `nombre/apellidos/direccion` se renderizan en factura/email sin pasar por `sanitizeString()` | Aplicar `sanitizeString()` en el handler antes de persistir. Zod transform o middleware |
| P1.4 | PII unencrypted en localStorage | `tcgacademy_user`, `tcgacademy_registered` | XSS → robo PII (GDPR). Mientras `BACKEND_MODE=local` se asume modo demo | Migrar auth a Supabase + cifrar PII restante con `encryption.ts` (ya existe AES-GCM). |
| P1.5 | Dependencias circulares | `orderAdapter ↔ productStore ↔ dataHub`, `fiscalAudit ↔ invoiceService` | Bundle bloat, riesgo SSR | depcruise + romper ciclos extrayendo tipos a `*/types.ts` independientes |

### 🟡 P2 — Medio (calidad UX, mantenibilidad)

| Id | Hallazgo | Archivo | Fix |
|---|---|---|---|
| P2.1 | Componentes > 1500 líneas | FacturaAlbaranForm (2003), admin/pedidos (1993), finalizar-compra (1783), ProductDetailClient (1516), GameCharacterIllustration (1443) | Partir en sub-componentes por sección; extraer hooks |
| P2.2 | Sin componente `<EmptyState>` reutilizable | carrito vacío, búsqueda 0, pedidos 0, favoritos 0 | Crear `src/components/ui/EmptyState.tsx` y reemplazar |
| P2.3 | Botones submit sin loading/disabled state | varios admin pages | Hook `useFormSubmit` con `isSubmitting` flag |
| P2.4 | `verification: {}` vacío en metadata | `src/app/layout.tsx` | Añadir Google/Bing verification tags cuando se verifique dominio |
| P2.5 | Sin `revalidate` ISR en `[game]/[category]/[slug]/` | rutas producto | `export const revalidate = 300` (5min); stock fresca tras admin update |
| P2.6 | 20+ imágenes con `alt=""` mezclando decorativas y funcionales | varios | Auditar caso por caso: decorativas → `alt=""` + `role="presentation"`, funcionales → texto descriptivo |
| P2.7 | N+1 admin orders (`getMergedById` por orden) | `admin/pedidos/page.tsx` | Indexar productos en Map antes del loop |
| P2.8 | Logger sin Sentry/external | `src/lib/logger.ts` | Adapter externo opcional con `LOGGER_BACKEND` env |
| P2.9 | Adapters faltantes en registry | `priceOverrides`, `solicitudes`, `complaints` (PARTIAL) | Implementar adapter cuando se toque la zona (ver `project_ssot_audit_2026_04_21`) |
| P2.10 | Email verification bypass en local mode (default false) | `isEmailVerificationRequired()` | Aceptable en demo; documentar y forzar `true` en server mode |

### 🟢 P3 — Bajo (nice-to-have)

| Id | Hallazgo | Fix |
|---|---|---|
| P3.1 | Sin hreflang | Cuando exista multi-idioma |
| P3.2 | Sin redirects de URLs legacy | Auditar Search Console y crear `redirects()` en `next.config.ts` |
| P3.3 | Pricing PBKDF2 hashes en localStorage (modo demo) | Aceptable en local; migrar con BACKEND_MODE=server |
| P3.4 | JSON.parse sin safeRead en algunos sitios minoritarios | Sustituir progresivamente por `safeStorage.ts` |

---

## 4. APLICAR YA (fixes seguros y baratos, sin riesgo de regresión)

Por orden de coste/impacto:

1. **`<EmptyState>` reutilizable** (P2.2) — 1 componente, 4 reemplazos. UX consistente.
2. **`revalidate` ISR en producto** (P2.5) — 1 línea por ruta. Stock fresca sin refetch manual.
3. **Sanitizar `nombre/apellidos/direccion` en checkout** (P1.3) — 3 líneas en el handler. Bloquea XSS persistente en factura.
4. **`useFormSubmit` con loading state** (P2.3) — evita doble factura, mejora UX.
5. **Auditar `alt=""` decorativas vs funcionales** (P2.6) — accesibilidad + SEO sin riesgo.

---

## 5. REQUIERE DECISIÓN (cambios con riesgo o impacto de negocio)

1. **Refactor home/busqueda/catalogo a RSC** (P1.1, P1.2) — ganancia SEO grande, pero toca componentes muy visuales. Necesita:
   - Confirmación de que NO cambia la apariencia (memory `feedback_no_structural_changes`).
   - Plan por fases: primero `/` → medir LCP → si OK seguir con `/busqueda` y `/catalogo`.
2. **Migración auth+PII a server** (P1.4 + C1) — desbloquea retirada de DEMO_USERS, cifrado real, GDPR. Impacto: requiere Supabase + Resend keys + plan de migración de usuarios mock. Decisión de timing.
3. **Partir monolitos > 1500 líneas** (P2.1) — necesario antes de añadir features pesadas (multi-vendor, multi-idioma). Requiere plan: por archivo, con tests visuales antes/después.
4. **Logger externo (Sentry o equivalente)** (P2.8 + C4) — implica gasto recurrente y configuración de proyectos. Decisión de presupuesto.

---

## 6. Oportunidades de producto (no bugs — backlog priorizado por impacto)

| Oportunidad | Impacto estimado | Estado actual |
|---|---|---|
| Reviews & ratings de producto | +15-20% conversión TCG (peer trust) | Servicio stub en registry, sin UI |
| Wishlist compartible (link público) | Adquisición orgánica + viralidad | Solo local, sin URL pública |
| Email re-engagement (carrito abandonado, win-back) | +5-10% recuperación carritos | Resend listo, plantillas no creadas |
| Comparador de productos (lado a lado) | Diferenciador en TCG | Sin implementar |
| Smart recommendations ("también vieron…") | +AOV | Sin algoritmo |
| Programa de afiliados monetizado | Crecimiento incentivado | Entity stub `affiliates` reservada |
| Trustpilot embed | Trust signal en home | No integrado |
| Live chat / chatbot | Conversión + soporte | No integrado |

---

## 7. Plan de mejora propuesto (3 fases)

**Fase 1 — Saneamiento inmediato (sin tocar layout, ~1-2 días):**
APLICAR YA (sección 4) + cierre de los 4 ítems P2 más baratos (P2.4, P2.7, P2.9, P2.10).

**Fase 2 — SEO + UX core (con permiso, ~1 semana):**
RSC en home → medir → busqueda+catalogo. Refactor 2 monolitos prioritarios (FacturaAlbaranForm, finalizar-compra). EmptyState desplegado a todas las vistas vacías.

**Fase 3 — Plataforma / escalado (decisión estratégica):**
Migración auth+PII a server (BACKEND_MODE=server real). Logger externo. Partir el resto de monolitos. Reviews & ratings (mayor ROI de las oportunidades de producto).

---

## 8. Estado actual verificable

| Comprobación | Comando | Resultado |
|---|---|---|
| ESLint | `npm run lint` | 0 errores, 3 warnings pre-existentes (RHF watch + tailwind) |
| TypeScript | `npx tsc --noEmit` | 0 errores |
| Build | `npm run build` | OK |
| Audit suite | `node tests/audit/run-audit.mjs` | 30/30 |
| Regression hold 14d | `node tests/regression/points-hold-14d.mjs` | 15/15 |
| Regression facturas | `node tests/regression/invoice-base-vat-coherence.mjs` | 6/6 |
| `.gitignore` backups | `grep backups .gitignore` | `/backups/` presente |
