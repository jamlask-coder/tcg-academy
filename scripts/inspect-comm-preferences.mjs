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

const { data: a } = await sb.from("comm_preferences").select("*").limit(2);
console.log("comm_preferences (2 filas):", a);

const { data: b } = await sb.from("communication_preferences").select("*").limit(2);
console.log("communication_preferences:", b);

const { data: c } = await sb.from("user_preferences").select("*").limit(2);
console.log("user_preferences:", c);
