#!/usr/bin/env node
/**
 * migrate-wp-users.mjs
 *
 * Extrae usuarios + roles + datos billing del backup SQL de WordPress
 * (`u357847309_0zFd1.sql` o equivalente) y genera dos artefactos:
 *
 *   1. `migrations/wp_users_import.sql`   — INSERTs idempotentes para Supabase
 *      - users (con password_hash legacy `$wp$...` → `verifyPassword` lo soporta)
 *      - addresses (1 dirección por user con datos billing si existen)
 *
 *   2. `migrations/wp_users_summary.csv`  — auditoría human-readable
 *
 * Uso:
 *   node scripts/migrate-wp-users.mjs <ruta-al-backup.sql>
 *
 * Idempotencia: usa `ON CONFLICT (email) DO UPDATE` para que se pueda re-correr
 * sin duplicar — útil si pides un backup más fresco antes del go-live.
 *
 * NO migra: orders, invoices, products. Los pedidos antiguos quedan en el
 * backup como referencia histórica; la cadena VeriFactu nueva arranca limpia.
 *
 * Mapeo roles WP → tcg-academy:
 *   administrator → admin
 *   customer      → cliente
 *   shop_manager  → admin (no aplica aquí, conservador)
 *   (otros)       → cliente
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Uso: node scripts/migrate-wp-users.mjs <backup.sql>");
  process.exit(1);
}

const raw = fs.readFileSync(sqlPath, "utf8");

// ─── Parsers ────────────────────────────────────────────────────────────────

/**
 * Parsea filas de un INSERT INTO `tabla` (...) VALUES (...),(...),...;
 * Asume que `match` es la cadena entre el primer "VALUES " y el ";" final.
 *
 * No usa CSV completo — los volcados de phpMyAdmin son consistentes:
 * cada fila es `(val, val, val, ...)` con strings entre comillas simples
 * y escapes `\'`, `\\`, `\n`.
 */
function parseValues(valuesStr) {
  const rows = [];
  let i = 0;
  while (i < valuesStr.length) {
    // Saltar espacios/comas
    while (i < valuesStr.length && /[\s,]/.test(valuesStr[i])) i++;
    if (valuesStr[i] !== "(") break;
    i++; // consumir '('
    const row = [];
    let cur = "";
    let inStr = false;
    while (i < valuesStr.length) {
      const c = valuesStr[i];
      if (inStr) {
        if (c === "\\") {
          cur += c + valuesStr[i + 1];
          i += 2;
          continue;
        }
        if (c === "'") {
          inStr = false;
          i++;
          continue;
        }
        cur += c;
        i++;
        continue;
      }
      if (c === "'") {
        inStr = true;
        i++;
        continue;
      }
      if (c === ",") {
        row.push(unquote(cur));
        cur = "";
        i++;
        continue;
      }
      if (c === ")") {
        row.push(unquote(cur));
        rows.push(row);
        i++;
        break;
      }
      cur += c;
      i++;
    }
  }
  return rows;
}

function unquote(s) {
  const t = s.trim();
  if (t === "NULL" || t === "") return null;
  // si nos llegó string con escapes, deshacerlos
  return t
    .replace(/\\\\/g, "\\")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function extractInserts(table) {
  const rows = [];
  const re = new RegExp(
    `INSERT INTO \`${table}\` \\([^)]+\\) VALUES\\s*([\\s\\S]*?);\\s*\\n`,
    "g",
  );
  let m;
  while ((m = re.exec(raw)) !== null) {
    rows.push(...parseValues(m[1]));
  }
  return rows;
}

// ─── Extract ────────────────────────────────────────────────────────────────

// wp_users: ID, user_login, user_pass, user_nicename, user_email, user_url,
//           user_registered, user_activation_key, user_status, display_name
const wpUsers = extractInserts("wp_users").map((r) => ({
  id: r[0],
  login: r[1],
  pass: r[2],
  nicename: r[3],
  email: r[4],
  registered: r[6],
  display: r[9] ?? "",
}));

// wp_usermeta: umeta_id, user_id, meta_key, meta_value
const wpUsermeta = extractInserts("wp_usermeta");
const metaByUser = new Map();
for (const [, userId, key, value] of wpUsermeta) {
  if (!metaByUser.has(userId)) metaByUser.set(userId, {});
  metaByUser.get(userId)[key] = value;
}

// PHP-serialized capabilities → role
function parseRole(serialized) {
  if (!serialized) return "cliente";
  if (serialized.includes('"administrator"')) return "admin";
  if (serialized.includes('"shop_manager"')) return "admin";
  if (serialized.includes('"customer"')) return "cliente";
  return "cliente";
}

const ES_PROVINCES = {
  // Iso → name (subset suficiente para validación liviana; fallback usa string crudo)
};

function normNif(s) {
  return (s || "").trim().toUpperCase().replace(/\s+/g, "");
}

function detectNifType(nif) {
  if (!nif) return null;
  if (/^[A-HJ-NP-SUVW]\d{7}[A-Z0-9]$/.test(nif)) return "CIF";
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) return "NIE";
  if (/^\d{8}[A-Z]$/.test(nif)) return "DNI";
  return null;
}

function sqlQuote(s) {
  if (s === null || s === undefined) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function splitName(displayName, fallbackLogin) {
  const dn = (displayName || "").trim();
  if (!dn) return { first: fallbackLogin || "Cliente", last: "" };
  const parts = dn.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  };
}

// ─── Build SQL ──────────────────────────────────────────────────────────────

const usersSql = [];
const addrSql = [];
const csvLines = [
  "wp_id,email,role,display_name,login,registered,billing_first_name,billing_last_name,billing_phone,billing_city,billing_postcode,billing_country,nif,has_address",
];

for (const u of wpUsers) {
  const meta = metaByUser.get(u.id) ?? {};
  const role = parseRole(meta.wp_capabilities);
  const { first, last } = splitName(
    u.display || meta.first_name || meta.billing_first_name,
    u.login,
  );
  const phone = meta.billing_phone || "";
  // Algunos plugins guardan NIF en `billing_eu_vat_number`, `_billing_vat`,
  // `billing_nif`, `_billing_dni`. Probamos varios nombres conservadores.
  const nifRaw =
    meta.billing_eu_vat_number ||
    meta.billing_vat ||
    meta._billing_vat ||
    meta.billing_nif ||
    meta._billing_dni ||
    "";
  const nif = normNif(nifRaw);
  const nifType = detectNifType(nif);

  // username inválido si lleva "@" (regla schema: `^[a-zA-Z0-9_.]{3,20}$`)
  const usernameOk =
    u.login && /^[a-zA-Z0-9_.]{3,20}$/.test(u.login) ? u.login : null;

  // INSERT users — idempotente por email
  usersSql.push(
    `INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES (${sqlQuote((u.email || "").toLowerCase())}, ${sqlQuote(usernameOk)}, ${sqlQuote(u.pass)}, ${sqlQuote(first)}, ${sqlQuote(last)}, ${sqlQuote(phone)}, '${role}'::user_role, ${sqlQuote(nif || null)}, ${nifType ? `'${nifType}'::tax_id_type` : "NULL"}, ${sqlQuote(u.registered)}::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);
`,
  );

  // INSERT address si tenemos calle + ciudad + cp
  const street1 = meta.billing_address_1 || "";
  const street2 = meta.billing_address_2 || "";
  const city = meta.billing_city || "";
  const cp = meta.billing_postcode || "";
  const country = (meta.billing_country || "ES").substring(0, 2);
  const province = meta.billing_state || "";
  const recipient = `${meta.billing_first_name || first} ${meta.billing_last_name || last}`.trim();
  const hasAddr = Boolean(street1 && city && cp);

  if (hasAddr) {
    addrSql.push(
      `WITH u AS (SELECT id FROM users WHERE email = ${sqlQuote((u.email || "").toLowerCase())})
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', ${sqlQuote(recipient)}, ${sqlQuote([street1, street2].filter(Boolean).join(", "))}, NULL, ${sqlQuote(cp)}, ${sqlQuote(city)}, ${sqlQuote(province)}, ${sqlQuote(country)}, ${sqlQuote(phone || null)}, TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);
`,
    );
  }

  csvLines.push(
    [
      u.id,
      u.email,
      role,
      JSON.stringify(u.display || ""),
      u.login,
      u.registered,
      meta.billing_first_name || "",
      meta.billing_last_name || "",
      phone,
      city,
      cp,
      country,
      nif,
      hasAddr ? "yes" : "no",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
}

// ─── Output ─────────────────────────────────────────────────────────────────

const outDir = path.join(ROOT, "migrations");
fs.mkdirSync(outDir, { recursive: true });

const sqlOut = `-- Generado por scripts/migrate-wp-users.mjs (no editar a mano)
-- Fuente: ${path.basename(sqlPath)}
-- Total: ${wpUsers.length} usuarios
-- Re-ejecutable: ON CONFLICT actualiza, NO duplica.
--
-- Tras correr este script, los usuarios podrán hacer login con su contraseña
-- de WordPress. El primer login válido re-hashea automáticamente al formato
-- bcrypt nativo (ver verifyPassword + isLegacyWpHash en src/lib/auth.ts).

BEGIN;

${usersSql.join("\n")}
${addrSql.join("\n")}

COMMIT;
`;

fs.writeFileSync(path.join(outDir, "wp_users_import.sql"), sqlOut);
fs.writeFileSync(path.join(outDir, "wp_users_summary.csv"), csvLines.join("\n"));

console.log(`✓ ${wpUsers.length} usuarios procesados`);
console.log(`✓ ${addrSql.length} direcciones`);
console.log(`✓ Generado: migrations/wp_users_import.sql`);
console.log(`✓ Generado: migrations/wp_users_summary.csv`);

const adminCount = wpUsers.filter(
  (u) => parseRole((metaByUser.get(u.id) ?? {}).wp_capabilities) === "admin",
).length;
console.log(`  - admin: ${adminCount}`);
console.log(`  - cliente: ${wpUsers.length - adminCount}`);
