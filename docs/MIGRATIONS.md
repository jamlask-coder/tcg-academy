# Migraciones Supabase — guía rápida

Este proyecto usa la CLI oficial de Supabase para aplicar migraciones SQL al
proyecto remoto `fdfpuxccxftpsjzffaes`. El workflow es semi-automático: tú
escribes el `.sql` en `supabase/migrations/`, la CLI lo empuja al servidor.

---

## 0. Instalación (solo la primera vez por máquina)

La CLI de Supabase **no se instala como dependencia npm** (intencionado, evita
incrustar el binario en `node_modules`). Hay que instalarla globalmente.

### Windows (Scoop — recomendado)
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Windows (descarga directa)
1. Descarga el binario de https://github.com/supabase/cli/releases (busca
   `supabase_windows_amd64.tar.gz`).
2. Extrae `supabase.exe` a una carpeta del PATH (ej. `C:\Users\<tu>\bin\`).

### macOS
```bash
brew install supabase/tap/supabase
```

### Linux
```bash
curl -fsSL https://supabase.com/install.sh | sh
```

Verifica:
```bash
supabase --version
```

---

## 1. Login (una vez por máquina)

```bash
supabase login
```

Te abrirá el navegador para autorizar la CLI con tu cuenta Supabase. El token
se guarda en `~/.supabase/access-token` y NO toca el repo.

---

## 2. Linkar el proyecto (una vez por clon del repo)

```bash
npm run db:link
```

Equivale a `supabase link --project-ref fdfpuxccxftpsjzffaes`. Te pedirá la
**database password** (la del usuario `postgres` del proyecto, NO la API key).
Está en el dashboard → Project Settings → Database → Connection string.

Tras linkar, la CLI guarda metadata en `supabase/.temp/` (gitignored).

---

## 3. Crear una migración nueva

```bash
supabase migration new <slug_descriptivo>
```

Te crea `supabase/migrations/<timestamp>_<slug>.sql` vacío. Editas el SQL ahí.

> **IMPORTANTE — migraciones legacy**: las 9 migraciones SQL ya existentes
> (`price_history.sql`, `email_verification.sql`, `rate_limits.sql`,
> `tax_id_unique.sql`, `messages_broadcast.sql`, `order_items_legacy.sql`,
> `orders_rebind_orphans.sql`, `users_last_seen_at.sql`, `user_visits.sql`)
> NO siguen el formato `<timestamp>_<slug>.sql` y están aplicadas a mano vía
> Dashboard. La CLI las **salta** por nombre — exactamente lo que queremos:
> no debe re-ejecutarlas. Déjalas tal cual.
>
> A partir de ahora, **todas las nuevas migraciones** las creas con
> `supabase migration new <slug>` que genera el formato correcto y serán
> gestionadas por `db:push` automáticamente.

---

## 4. Verificar antes de aplicar (opcional pero recomendado)

```bash
npm run db:diff
```

Compara tu migración contra el shadow database local. Útil para ver el SQL
real que se va a ejecutar (Supabase a veces transforma DDL).

> Requiere Docker corriendo localmente. Si no usas Docker, sáltatelo.

---

## 5. Aplicar al proyecto remoto

```bash
npm run db:push
```

Aplica todas las migraciones de `supabase/migrations/` que aún NO están en la
tabla `supabase_migrations.schema_migrations` del proyecto remoto. Es
**idempotente**: si una ya está aplicada, la salta.

Tras correrlo, verifica:
```bash
npm run db:status
```

---

## 6. Workflow típico

```bash
# 1. Crear nueva migración
supabase migration new add_user_loyalty_tier

# 2. Editar el .sql que crea
# (lo abres en el editor)

# 3. Verificar el diff (opcional)
npm run db:diff

# 4. Aplicar a Supabase
npm run db:push

# 5. Confirmar
npm run db:status
```

---

## Reglas de oro

1. **Una migración = un cambio coherente**. No mezcles "añadir tabla X" con
   "modificar tabla Y" en el mismo `.sql`.
2. **Nunca edites una migración ya aplicada** — crea otra que rectifique.
3. **Backup antes de cambios destructivos** (`DROP TABLE`, `ALTER ... DROP
   COLUMN`). Usa `/admin/copias` o `npm run backup`.
4. **RLS por defecto**: toda tabla nueva debe tener `ENABLE ROW LEVEL
   SECURITY` y al menos una policy explícita (denegar acceso anónimo si no
   procede).
5. **Evita `IF NOT EXISTS` en migraciones nuevas** — si tu migración es
   idempotente "para si acaso", revísala: probablemente no debería estar.

---

## Variables de entorno necesarias

| Var | Para qué | Dónde está |
|-----|----------|------------|
| `SUPABASE_ACCESS_TOKEN` | Auth de la CLI | `~/.supabase/access-token` (auto, tras `supabase login`) |
| `SUPABASE_DB_PASSWORD` | Password de Postgres | NO la metas en `.env`, te la pide la CLI al linkar |

---

## Troubleshooting

### "supabase: command not found"
La CLI no está en el PATH. Ver paso 0.

### "failed to connect to db: password authentication failed"
La password que diste al linkar es incorrecta. Bórrala con
`supabase link --project-ref fdfpuxccxftpsjzffaes` y re-introdúcela.

### "migration X is already applied"
No es error — la CLI te avisa de que esa migración ya está. `db:push` salta
las aplicadas y solo ejecuta las nuevas.

### "Docker is not running" durante `db:diff`
`db:diff` necesita Docker para levantar el shadow DB. Si no quieres
instalarlo, omite ese paso y aplica directo con `db:push` (asumiendo que el
SQL está revisado).
