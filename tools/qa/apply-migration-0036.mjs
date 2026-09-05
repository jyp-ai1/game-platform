/**
 * Apply migration 0036 (game_comments feedback_type + status) when missing.
 * Usage: node tools/qa/apply-migration-0036.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_REF = "fecwbzyuktkzrbqqxtid";

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
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in apps/web/.env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const sql = readFileSync(join(ROOT, "supabase/migrations/0036_game_comment_feedback.sql"), "utf8");

async function probeMissing() {
  const { error } = await admin
    .from("game_comments")
    .select("id, feedback_type, status")
    .limit(1);
  if (!error) return false;
  return error.message.includes("feedback_type") || error.message.includes("status");
}

async function applyViaManagementApi(token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error("Management API failed:", res.status, body.slice(0, 300));
    return false;
  }
  console.log("Migration 0036 applied via SUPABASE_ACCESS_TOKEN");
  return true;
}

async function applyViaPg(dbUrl) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Migration 0036 applied via DATABASE_URL");
  return true;
}

async function verify() {
  const { error } = await admin
    .from("game_comments")
    .select("id, feedback_type, status")
    .limit(1);
  if (error) throw new Error(`Post-apply verify failed: ${error.message}`);
  console.log("Verified: game_comments.feedback_type + game_comments.status");
}

const missing = await probeMissing();
if (!missing) {
  console.log("game_comments.feedback_type already exists — skip");
  process.exit(0);
}

console.log("COLUMN_MISSING — applying migration 0036…");

const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

try {
  if (dbUrl) {
    await applyViaPg(dbUrl);
  } else if (accessToken) {
    const ok = await applyViaManagementApi(accessToken);
    if (!ok) process.exit(2);
  } else {
    console.log("COLUMN_MISSING");
    console.log("Set DATABASE_URL or SUPABASE_ACCESS_TOKEN, or apply manually in Supabase SQL editor:");
    console.log(sql);
    process.exit(2);
  }
  await verify();
  process.exit(0);
} catch (e) {
  console.error("Failed:", e instanceof Error ? e.message : e);
  console.log("Apply manually in Supabase SQL editor:");
  console.log(sql);
  process.exit(2);
}
