/**
 * Apply migration 0037 (feedback_work_orders) when missing.
 * Usage: node tools/qa/apply-migration-0037.mjs
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
  console.error("Missing Supabase env in apps/web/.env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const sql = readFileSync(join(ROOT, "supabase/migrations/0037_feedback_work_orders.sql"), "utf8");

const { error: probeErr } = await admin.from("feedback_work_orders").select("id").limit(1);
if (!probeErr) {
  console.log("feedback_work_orders already exists — skip");
  process.exit(0);
}

const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function applyViaManagementApi(token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    console.error("Management API failed:", res.status, await res.text());
    return false;
  }
  console.log("Migration 0037 applied via SUPABASE_ACCESS_TOKEN");
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
  console.log("Migration 0037 applied via DATABASE_URL");
}

try {
  if (dbUrl) await applyViaPg(dbUrl);
  else if (accessToken) {
    if (!(await applyViaManagementApi(accessToken))) process.exit(2);
  } else {
    console.log("Apply manually in Supabase SQL Editor:");
    console.log(sql);
    process.exit(2);
  }
  const { error } = await admin.from("feedback_work_orders").select("id").limit(1);
  if (error) throw new Error(error.message);
  console.log("Verified: feedback_work_orders");
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
}
