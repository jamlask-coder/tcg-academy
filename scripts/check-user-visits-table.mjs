// Comprueba si la tabla user_visits ya existe en Supabase.
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
  .from("user_visits")
  .select("*", { count: "exact", head: true });

if (error) {
  console.log("user_visits NO existe →", error.code, error.message);
  process.exit(1);
}
console.log(`user_visits EXISTE — filas actuales: ${count}`);
