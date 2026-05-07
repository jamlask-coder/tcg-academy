// Comprueba si la tabla consents existe en Supabase + structure check.
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

const { data, error, count } = await sb
  .from("consents")
  .select("*", { count: "exact", head: true });

if (error) {
  console.log("consents NO existe →", error.code, error.message);
  process.exit(1);
}
console.log(`consents EXISTE — filas actuales: ${count}`);

// Try to get one row to see columns
const { data: sample } = await sb.from("consents").select("*").limit(1);
if (sample && sample.length > 0) {
  console.log("Columnas:", Object.keys(sample[0]));
} else {
  console.log("Tabla vacía — sin sample para inspeccionar columnas");
}
