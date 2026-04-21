/**
 * Volcado de tablas Supabase a NDJSON.
 *
 * Paginado (1000 filas/petición) para evitar problemas con tablas grandes.
 * Cada tabla → NDJSON (newline-delimited JSON) → encrypt → sube a S3.
 *
 * Las tablas críticas están definidas aquí. Se incluyen TODAS las tablas con
 * datos transaccionales/PII. Catálogo/logs no se excluyen porque son baratos
 * y simplifican el restore.
 */

import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Lista de tablas a respaldar. Orden importa en restore (FK dependencies):
 * padres primero, hijos después.
 */
export const BACKUP_TABLES: readonly string[] = [
  // Fundacionales
  "users",
  "addresses",
  "company_profiles",
  "consents",
  "comm_preferences",
  "reset_tokens",
  "sessions",
  // Catálogo
  "categories",
  "products",
  // Engagement
  "favorites",
  "carts",
  "cart_items",
  // Pedidos
  "orders",
  "order_items",
  "incidents",
  // Fidelidad
  "coupons",
  "coupon_usage",
  "points",
  "points_history",
  // Fiscal
  "invoices",
  // Post-venta
  "returns",
  "return_items",
  "messages",
  "notifications",
  // Grupos
  "groups",
  "group_members",
  "group_invites",
  // Social
  "reviews",
  "complaints",
  "solicitudes",
  // Auditoría/logs
  "audit_log",
  "app_logs",
  "email_log",
  "settings",
] as const;

const PAGE_SIZE = 1000;

export interface DumpedTable {
  table: string;
  ndjson: Buffer;
  rowCount: number;
}

/**
 * Vuelca una tabla a NDJSON (cada línea = una fila JSON).
 * Si la tabla no existe, devuelve { rowCount: 0, ndjson: Buffer(0) }.
 */
export async function dumpTable(table: string): Promise<DumpedTable> {
  const supabase = getSupabaseAdmin();
  const chunks: string[] = [];
  let from = 0;
  let rowCount = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      // Si la tabla no existe (42P01) devolvemos dump vacío — el esquema
      // puede variar entre entornos.
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        return { table, ndjson: Buffer.alloc(0), rowCount: 0 };
      }
      throw new Error(`dumpTable(${table}): ${error.message}`);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      chunks.push(JSON.stringify(row));
    }
    rowCount += data.length;

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const ndjson = Buffer.from(chunks.join("\n") + (chunks.length ? "\n" : ""), "utf8");
  return { table, ndjson, rowCount };
}

/**
 * Restaura una tabla a partir de un NDJSON.
 * Usa `upsert` con `on_conflict: id` por defecto. Devuelve filas insertadas.
 *
 * ATENCIÓN: este método NO trunca la tabla antes de insertar — es additivo.
 * Si se necesita restore destructivo, usar `truncateFirst: true`.
 */
export async function restoreTable(
  table: string,
  ndjson: Buffer,
  opts: { truncateFirst?: boolean; conflictColumn?: string } = {},
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const lines = ndjson.toString("utf8").split("\n").filter((l) => l.trim());
  if (lines.length === 0) return 0;

  if (opts.truncateFirst) {
    const { error } = await supabase.rpc("exec_sql", {
      sql: `truncate table ${table} cascade;`,
    });
    if (error) {
      throw new Error(
        `restoreTable(${table}): truncate falló: ${error.message}. ¿Tienes la función exec_sql creada?`,
      );
    }
  }

  let inserted = 0;
  // Bulk insert en lotes de 500 para no saturar.
  for (let i = 0; i < lines.length; i += 500) {
    const batch = lines.slice(i, i + 500).map((l) => JSON.parse(l));
    const query = supabase.from(table);
    const { error } = opts.conflictColumn
      ? await query.upsert(batch, { onConflict: opts.conflictColumn })
      : await query.insert(batch);
    if (error) {
      throw new Error(`restoreTable(${table}) lote ${i}: ${error.message}`);
    }
    inserted += batch.length;
  }
  return inserted;
}
