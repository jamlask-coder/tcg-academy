# Backups y recuperación (RGPD/LOPDGDD)

Copias diarias cifradas, verificación de integridad y restauración.
Cumplimiento del **art. 32 RGPD** (seguridad del tratamiento) y del
**art. 33** (notificación de brechas en 72h).

## Resumen

| Elemento | Valor por defecto |
|----------|-------------------|
| Frecuencia | Diaria a las 03:00 UTC |
| Ubicación 1 | Supabase (primaria) |
| Ubicación 2 | Cloudflare R2 / AWS S3 / B2 (cifrada) |
| Cifrado | AES-256-GCM |
| Integridad | SHA-256 por tabla + hash encadenado (patrón VeriFactu) |
| Retención | 90 días (configurable con `BACKUP_RETENTION_DAYS`) |
| Ventana AEPD | 72h desde detección |

## 1. Variables de entorno obligatorias (producción)

```bash
# S3-compatible destination (Cloudflare R2 recomendado — sin egress fees)
BACKUP_S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
BACKUP_S3_BUCKET=tcgacademy-backups
BACKUP_S3_ACCESS_KEY=...
BACKUP_S3_SECRET_KEY=...
BACKUP_S3_REGION=auto

# Clave AES-256-GCM (hex, 64 chars = 32 bytes).
# Genera UNA VEZ y guarda fuera del repo (password manager).
# SIN esta clave los backups son irrecuperables.
BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Retención en días (mínimo 30 recomendado; RGPD fiscal exige 72 meses para
# facturas — ver sección "Retención fiscal" abajo).
BACKUP_RETENTION_DAYS=90

# Cron secret (mismo que /api/cron/price-snapshot)
CRON_SECRET=$(openssl rand -base64 32)

# Admin token para operar el panel
ADMIN_BACKUP_TOKEN=$(openssl rand -base64 32)

# Token anti-accidente para restores destructivos
BACKUP_RESTORE_CONFIRM=$(openssl rand -hex 16)

# Notificación brecha AEPD
AEPD_NOTIFICATION_EMAIL=brecha@aepd.es
DPO_EMAIL=dpo@tudominio.es
```

## 2. Alta del bucket en Cloudflare R2 (recomendado)

1. `dash.cloudflare.com → R2 → Create bucket` → nombre `tcgacademy-backups`.
2. Desactivar "Public access" (debe ser privado).
3. Generar un API token con permiso **Object Read/Write** sobre ese bucket.
4. Copiar `Endpoint` (con formato `https://<accountid>.r2.cloudflarestorage.com`)
   y las credenciales al `.env`.
5. (Opcional) Habilitar "Object Lock" en modo governance → evita borrados
   accidentales incluso desde el panel admin.

## 3. Cron job

Vercel ya lo dispara a diario (ver `vercel.json`). Si se despliega fuera de
Vercel, configurar un cron externo (GitHub Actions, cron-job.org) con:

```bash
curl -X POST https://tudominio.es/api/cron/backup-supabase \
  -H "x-cron-secret: $CRON_SECRET"
```

## 4. Disparar un backup manual

Desde `/admin/herramientas → Backups producción → Ejecutar ahora`, o:

```bash
curl -X POST https://tudominio.es/api/admin/backup-server/run \
  -H "x-admin-token: $ADMIN_BACKUP_TOKEN"
```

## 5. Verificar integridad

Cada backup lleva un manifest con SHA-256 por tabla + hash encadenado con el
backup previo. Si alguien manipula un backup antiguo, todos los posteriores
quedan con la cadena rota.

Panel: `/admin/herramientas → fila del backup → Verificar`. Devuelve:

- `manifestHashOk: true` → firma del manifest intacta
- `chainHashOk: true` → cadena con el backup anterior intacta
- `tableHashMismatches: []` → todas las tablas descifran y coinciden con el hash

Si aparece cualquier mismatch → **NO usar ese backup para restaurar** — buscar
uno anterior verificado e investigar el origen de la manipulación.

## 6. Restaurar

**Cualquier restore destructivo requiere `BACKUP_RESTORE_CONFIRM` y un admin con
`ADMIN_BACKUP_TOKEN`.** Nunca se restaura desde el código por accidente.

Desde el panel: `Backups producción → fila del backup → Restaurar`. Introducir
el valor de `BACKUP_RESTORE_CONFIRM` cuando pida confirmación.

Para restores destructivos (TRUNCATE + insert) se necesita la función SQL
`exec_sql` en la base de datos:

```sql
create or replace function exec_sql(sql text) returns void as $$
begin
  execute sql;
end;
$$ language plpgsql security definer;

revoke all on function exec_sql(text) from public;
-- solo el service_role la usa
```

## 7. Retención

- Los backups con `lastModified` anterior a `BACKUP_RETENTION_DAYS` se eliminan
  automáticamente al final de cada cron (función `pruneOldBackups`).
- **Retención fiscal**: las facturas exigen **72 meses** (art. 29.2 LGT).
  Opciones:
  1. Fijar `BACKUP_RETENTION_DAYS=2190` (6 años · ~25GB/año esperados).
  2. Mantener `90` para backups operativos + hacer un **backup fiscal mensual
     separado** solo de la tabla `invoices` con retención 2190. Pendiente de
     implementar (issue futuro).

## 8. Runbook: brecha de datos detectada

1. **Contener** (mismo día): cambiar credenciales comprometidas, revocar
   tokens, aislar infraestructura afectada.
2. **Registrar** en `/admin/herramientas → Brechas de seguridad`. Rellenar
   severidad, sujetos afectados, categorías de datos, descripción y medidas.
   **El reloj de 72h arranca desde el `detectedAt`**.
3. **Analizar** (≤48h): alcance real, vector, datos expuestos, personas
   afectadas. Documentar en el campo "medidas adoptadas".
4. **Notificar AEPD** (≤72h) si hay riesgo para los interesados → botón
   `Notificar AEPD + DPO` del panel envía email a `AEPD_NOTIFICATION_EMAIL`
   + `DPO_EMAIL`. **Además** hay que presentar la notificación formal vía
   https://sedeagpd.gob.es/sede-electronica-web/vistas/formBrechaSeguridad/formulario.jsf
5. **Notificar interesados** si el riesgo es **ALTO** (art. 34) —
   plantilla en `src/data/emailTemplates.ts` (pendiente de añadir una
   específica de brecha).
6. **Cerrar** el incidente cuando esté resuelto. El registro queda inmutable.

## 9. Pruebas de recuperación periódicas

RGPD exige **capacidad comprobada** de restaurar, no solo de hacer backups.
Cada trimestre:

1. Crear una BD Supabase "staging" con el mismo schema (`supabase/schema.sql`).
2. Apuntar temporalmente `NEXT_PUBLIC_SUPABASE_URL` a staging.
3. Restaurar el último backup: `/admin/backup-server/restore` con
   `truncateFirst: true`.
4. Verificar que la app arranca con los datos restaurados.
5. Documentar el ejercicio (fecha, duración, incidencias) en el log interno.

## 10. Arquitectura de los archivos

```
src/lib/backup/
├── types.ts              # Tipos compartidos
├── encryption.ts         # AES-256-GCM wrap/unwrap
├── integrity.ts          # SHA-256 + hash encadenado
├── s3Client.ts           # SigV4 fetch-based (sin @aws-sdk)
├── supabaseDump.ts       # Dump/restore NDJSON por tabla
├── backupJob.ts          # Orquestador + retention
└── adminAuth.ts          # x-admin-token check

src/app/api/
├── cron/backup-supabase/         # POST diario desde Vercel
└── admin/backup-server/
    ├── list/                     # GET listar backups
    ├── run/                      # POST ad-hoc
    ├── verify/                   # POST verificar integridad
    └── restore/                  # POST restaurar (requiere confirmToken)

src/components/admin/
├── BackupServerPanel.tsx         # UI /admin/herramientas
└── BreachIncidentsPanel.tsx      # UI /admin/herramientas

src/services/
└── breachNotificationService.ts  # Registro + email dispatch (art. 33)
```

## 11. Límites conocidos

- **Sin @aws-sdk**: el cliente S3 propio soporta PUT/GET/DELETE/LIST. No
  soporta multipart upload, por lo que tablas que superen 5GB crudos fallarán
  en la subida (improbable al alcance del proyecto).
- **No hay deduplicación**: cada backup es completo, no incremental.
- **Sin restore destructivo granular** a nivel fila: si se necesita recuperar
  una sola factura antigua, descargar el NDJSON cifrado y restaurar a mano.
