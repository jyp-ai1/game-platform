/**
 * One-shot: apply migration 0035 if game_comments missing.
 * Usage: node tools/qa/apply-migration-0035.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv() {
  const path = join(ROOT, "apps/web/.env.local");
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in apps/web/.env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const sql = readFileSync(join(ROOT, "supabase/migrations/0035_game_comments.sql"), "utf8");

const { error: probeErr } = await admin.from("game_comments").select("id").limit(1);
if (!probeErr) {
  console.log("game_comments table already exists — skip");
  process.exit(0);
}

if (!probeErr?.message.includes("game_comments") && !probeErr?.message.includes("schema cache")) {
  console.error("Probe error:", probeErr?.message);
}

// Supabase JS has no DDL — use postgres meta if available
const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.log("TABLE_MISSING");
  console.log("Apply manually in Supabase SQL editor:");
  console.log(sql);
  process.exit(2);
}

try {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Migration 0035 applied via DATABASE_URL");
  process.exit(0);
} catch (e) {
  console.error("Failed to apply via pg:", e instanceof Error ? e.message : e);
  console.log("Apply manually in Supabase SQL editor:");
  console.log(sql);
  process.exit(2);
}
