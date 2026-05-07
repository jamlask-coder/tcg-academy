// Comprueba si existe tabla communication_preferences o algo similar.
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

for (const t of ["communication_preferences", "comm_preferences", "user_preferences"]) {
  const { error, count } = await sb.from(t).select("*", { count: "exact", head: true });
  console.log(`${t}:`, error ? `NO existe (${error.code})` : `EXISTE (${count} filas)`);
}

// También miramos si users tiene una columna jsonb de preferences
const { data, error: uErr } = await sb.from("users").select("*").limit(1);
if (!uErr && data?.[0]) {
  const cols = Object.keys(data[0]);
  console.log("\nColumnas users relacionadas con preferences:", cols.filter((c) => /pref|comm|notif|marketing|newsletter/i.test(c)));
}
