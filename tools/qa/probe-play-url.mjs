import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = join(ROOT, "apps/web/.env.local");
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;
const res = await fetch(`${url}/rest/v1/games?select=play_url,source_type&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const body = await res.json();
console.log(JSON.stringify({ status: res.status, body }, null, 2));
