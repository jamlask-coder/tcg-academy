import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Insertar fila vacía a propósito para que el error revele las columnas requeridas.
const { data, error } = await sb.from("users").select("*").limit(1);
console.log("Sample row (or empty):", data);
if (error) console.log("Err:", error.message);

// También columnas via RPC information_schema (si está expuesto).
const { data: cols, error: cErr } = await sb.rpc("get_table_columns", { table_name: "users" });
if (cErr) console.log("(RPC no disponible:", cErr.message, ")");
else console.log("Columns:", cols);
