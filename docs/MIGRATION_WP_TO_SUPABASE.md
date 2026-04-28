# Migración WordPress → Supabase

> Fecha: 2026-04-28
> Origen: backup `u357847309_0zFd1.sql` (WP + WooCommerce, 80 MB, 86 627 líneas)
> Destino: Supabase (PostgreSQL) — schema en `supabase/schema.sql`
> Stack confirmado: **Supabase es la BD** (clave `NEXT_PUBLIC_BACKEND_MODE=server`, ver memoria `project_server_mode_active.md`).

---

## 1. Resumen ejecutivo

| Tabla origen WP | Filas (estimado) | Acción | Tabla destino Supabase |
|---|---|---|---|
| `wp_users` | **33** | **Migrar** | `users` |
| `wp_usermeta` (billing_*) | ~600 | **Migrar** (subset) | `users.tax_id` + `addresses` |
| `wp_wc_orders` | **33** | **NO migrar** (ver §4) | — |
| `wp_wc_orders_meta` | ~1 000 | NO migrar | — |
| `wp_wc_order_addresses` | ~70 | NO migrar | — |
| `wp_wc_order_product_lookup` | ~150 | NO migrar | — |
| `wp_wcpdf_invoice_number` | ~30 | NO migrar (cadena VeriFactu reinicia) | `invoices` (vacía) |
| `wp_posts` (post_type=product) | ~50 | **NO migrar** | `products` (hardcoded en `src/data/products.ts`) |
| `wp_posts` (post_type=shop_order) | ~33 | NO migrar (legacy duplicate) | — |
| `wp_terms` / `wp_term_taxonomy` | ~200 | NO migrar | `categories` (manual) |
| `wp_options` | ~1 200 | NO migrar | `settings` (manual cuando aplique) |
| `wp_comments` (reviews) | ? | Evaluar §5 | `reviews` (futuro) |
| Resto (wsal, action_scheduler, yoast, hostinger_reach, e_*, cky_*, cartflows) | ~80k | NO migrar | — |

**Total a migrar: 33 usuarios + sus direcciones billing.**

---

## 2. Por qué NO migramos pedidos / facturas / productos

### Pedidos (`wp_wc_orders`)
Los 33 pedidos del backup referencian SKUs de WooCommerce (IDs `wp_posts.ID`). En la web nueva los productos se definen en `src/data/products.ts` con IDs propios — **no hay correspondencia 1:1**. Si forzáramos la migración, los `order_items.product_id` quedarían como FKs colgantes (constraint violation con `REFERENCES products(id) ON DELETE RESTRICT`).

Alternativa contemplada y descartada: crear un mapa `wp_post_id → local_product_id`. Inviable porque:
- WooCommerce permitía variations (ej: misma carta en idiomas) que la web nueva no replica.
- Los precios y stock cambiaron entre webs.
- Los snapshots fiscales (`captureSellerSnapshot`) en pedidos antiguos llevan datos de la SL anterior (autónomo Adrián); la SL nueva (constituida 2026) tiene CIF distinto → mezclar = problema fiscal.

### Facturas / VeriFactu
La cadena hash SHA-256 de VeriFactu es **inmutable y por sociedad emisora**. La SL nueva arranca su propia cadena desde la primera factura (memoria `project_company_incorporation_2026.md`). Los PDFs antiguos (`wp_wcpdf_invoice_number`) son de la actividad como autónomo y se conservan en el backup como **registro fiscal de un periodo distinto** — accesibles para inspección AEAT pero fuera del nuevo sistema.

### Productos
El catálogo TCG es muy volátil (sets nuevos cada 2-3 meses, idiomas KR/JP, variantes alt-art). Mantenerlo en `src/data/products.ts` permite:
- Hot-reload en deploys
- Versionado git
- Linting + types

La BD `products` de Supabase es un mirror sincronizado por `productStore.ts`, no una fuente alternativa.

---

## 3. Migración de usuarios — checklist completo

### 3.1 Pre-flight ✅

- [x] Backup SQL inspeccionado (`wp_users` line 28266, `wp_usermeta` line 26802)
- [x] Schema Supabase revisado (`supabase/schema.sql`: `users`, `addresses`)
- [x] Hashes WP identificados como formato 6.8 (prefijo `$wp$2y$10$`)
- [x] Algoritmo de verificación documentado:
  - `pre = base64(HMAC-SHA384(password, "wp-sha384"))`
  - `bcryptCompare(pre, hash.substring(3))`

### 3.2 Cambios de código ✅

- [x] `src/lib/auth.ts` — `verifyPassword` detecta `$wp$` y delega a `verifyLegacyWpPassword`
- [x] `src/lib/auth.ts` — exportada `isLegacyWpHash(hash)` para que el caller decida re-hashear
- [x] `src/app/api/auth/route.ts` — tras login válido con hash legacy, re-hashea con `hashPassword(password)` y persiste vía `db.updateUser(id, { passwordHash })`. **Migración silenciosa**: el usuario no nota nada y al siguiente login ya usa bcrypt nativo.
- [x] `scripts/migrate-wp-users.mjs` — parsea SQL, mapea roles (`administrator`→`admin`, resto→`cliente`), genera `migrations/wp_users_import.sql` idempotente con `ON CONFLICT (email) DO UPDATE`.

### 3.3 Artefactos generados ✅

- `migrations/wp_users_import.sql` — 33 INSERTs `users` + 24 INSERTs `addresses` (los que tenían billing data en WP)
- `migrations/wp_users_summary.csv` — auditoría human-readable

### 3.4 Pasos a ejecutar (manual)

1. **Backup pre-import de Supabase**:
   ```bash
   # En Supabase Studio → Database → Backups → "Create backup now"
   # O desde CLI:
   supabase db dump -f backups/pre-wp-import-2026-04-28.sql
   ```

2. **Aplicar el script**:
   ```bash
   # Opción A — Supabase Studio → SQL Editor → pegar contenido de wp_users_import.sql → Run
   # Opción B — psql:
   psql "$DATABASE_URL" -f migrations/wp_users_import.sql
   ```

3. **Verificar inserciones**:
   ```sql
   SELECT count(*) FROM users WHERE password_hash LIKE '$wp$%';
   -- Esperado: 33
   SELECT count(*) FROM addresses;
   -- Esperado: ≥ 24 (más los que ya existieran)
   SELECT email, role FROM users WHERE role = 'admin';
   -- Esperado: 3 (salvabertomeu2001, elermous, fran_puchu)
   ```

4. **Verificar login con un usuario test**:
   - Email: `truenazos@gmail.com` (Salvador BD, contraseña conocida por el usuario)
   - Tras login OK → confirmar que en BD el hash ya empieza por `$2a$13$` (bcrypt nativo).

5. **Comunicación a usuarios**:
   - **No** enviar email masivo. Las cuentas funcionan transparentemente.
   - Sí enviar a Luri/Font internamente: "vuestras credenciales WP funcionan en la nueva web".

### 3.5 Mapeo roles

| WP capability | TCG-academy `user_role` |
|---|---|
| `administrator` | `admin` |
| `shop_manager` | `admin` (defensivo, no hay en este backup) |
| `customer` | `cliente` |
| (cualquier otro) | `cliente` |

3 admins detectados:
| ID WP | Email | Display name | Notas |
|---|---|---|---|
| 2 | salvabertomeu2001@gmail.com | Salvador Bertomeu | **Luri** (fiscal) — ver memoria `project_admin_roles.md` |
| 3 | elermous@gmail.com | Adrian Font | **Font** (operaciones, 75% SL) |
| 5 | fran_puchu@hotmail.com | francisco boronat devesa (puxu7) | **Inesperado** — confirmar con usuario si debe seguir admin o pasar a cliente |

⚠️ **Acción manual pendiente**: confirmar el caso de `fran_puchu@hotmail.com`. Si el usuario decide degradar a cliente, ejecutar:
```sql
UPDATE users SET role = 'cliente' WHERE email = 'fran_puchu@hotmail.com';
```

### 3.6 Rollback

Si algo va mal:
```sql
-- Borrar SOLO los importados (los que tienen hash legacy)
DELETE FROM addresses WHERE user_id IN (SELECT id FROM users WHERE password_hash LIKE '$wp$%');
DELETE FROM users WHERE password_hash LIKE '$wp$%';
```

O restaurar el backup pre-import desde Supabase Studio.

---

## 4. Datos no migrados — qué hacemos con ellos

### Histórico de pedidos / facturas
- El backup SQL queda archivado en `~/Downloads/u357847309_0zFd1.sql` y debe trasladarse a almacenamiento seguro (S3/Backblaze o similar) con cifrado.
- Si la AEAT solicita información sobre operaciones del autónomo (2025-2026 H1), se restaura un MariaDB local con el dump y se exporta lo que pidan.
- **Retención mínima legal**: 4 años (LGT) — calendario hasta 2030 para los más antiguos.

### Productos / categorías
- Se reconstruyen manualmente en `src/data/products.ts` cuando se ofrecen en la web nueva.
- No tiene sentido migrar porque los precios/stock/idiomas han cambiado.

### Reviews (`wp_comments` con `comment_type='review'`)
- Si las reviews son interesantes para SEO / prueba social, evaluar caso por caso. Por ahora **no migrar** — la web nueva no tiene UI de ratings activa (regla `CLAUDE.md`: "No ratings/stars UI").

### Cookies / consents (`wp_cky_*`)
- No relevante: la web nueva tiene su propio banner RGPD y guarda consents en tabla `consents`.

---

## 5. Validación de la migración

Tras importar, ejecutar este checklist:

- [ ] `SELECT count(*) FROM users` ≥ 33 + cuentas creadas en server-mode (algunas ya existen como demo/admin sembrados).
- [ ] Todas las contraseñas legacy verifican: probar `verifyPassword("test", "$wp$2y$10$...")` en una unit test.
- [ ] El primer login con cuenta legacy emite cookie sesión + re-hashea (verificar en BD que `password_hash LIKE '$2a$%'`).
- [ ] Las direcciones tienen `is_default=TRUE` (1 sola por usuario, garantizado por `idx_addresses_one_default`).
- [ ] Audit log creado: `SELECT * FROM audit_log WHERE action LIKE 'wp_import%' LIMIT 5;` (opcional — añadir si se quiere trazabilidad).

---

## 6. Lecciones aprendidas (para futuras importaciones)

1. **WordPress 6.8+ cambió el formato de hash** — los importadores genéricos de phpass NO funcionan. Hay que detectar el prefijo `$wp$` y aplicar HMAC-SHA384 antes de bcrypt.
2. **Los `wp_usermeta.billing_*`** son la única fuente de NIF/teléfono/dirección — `wp_users` solo tiene email + nombre.
3. **No mezclar cadenas VeriFactu** entre sociedades. Importar facturas antiguas de un autónomo a una SL nueva crea inconsistencia fiscal.
4. **WooCommerce HPOS** (`wp_wc_orders`) duplica datos en `wp_posts` (legacy). Para análisis usar SOLO `wp_wc_*` que es el sistema activo.

---

## 7. Próximos pasos opcionales

- [ ] **Boletín de bienvenida** a los 33 usuarios anunciando la web nueva (con permiso explícito del usuario; ahora mismo NO está pedido).
- [ ] **Migrar suscripciones a restock** (`tcgacademy_restock_subs` no existe en WP — empieza desde cero).
- [ ] **Promover los referrals** generando `referral_code` para cada usuario importado (script aparte que UPDATE `users` con códigos cortos únicos).

---

## Anexo: comando de regeneración

Si llega un backup más fresco antes del go-live:
```bash
node scripts/migrate-wp-users.mjs ~/Downloads/u357847309_NUEVO.sql
# Genera de nuevo migrations/wp_users_import.sql (idempotente — ON CONFLICT actualiza)
psql "$DATABASE_URL" -f migrations/wp_users_import.sql
```
