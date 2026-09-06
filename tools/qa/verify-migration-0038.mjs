/**
 * Migration 0038 — feedback_provenance column + QA backfill verify.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/feedback-intelligence");

function loadEnv() {
  for (const path of [join(ROOT, "apps/web/.env.qa.tmp"), join(ROOT, "apps/web/.env.local")]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      let val = trimmed.slice(eq + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[trimmed.slice(0, eq)] = val;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(2);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const results = {};

  const { data: probe, error: probeErr } = await admin
    .from("game_comments")
    .select("feedback_provenance")
    .limit(1);

  results.columnExists = !probeErr;
  if (probeErr) {
    console.error("Column probe:", probeErr.message);
    writeReport(results);
    process.exit(1);
  }

  const { data: all } = await admin
    .from("game_comments")
    .select("feedback_provenance, author, content")
    .limit(5000);

  const rows = all ?? [];
  const real = rows.filter((r) => r.feedback_provenance === "REAL_PLAYER");
  const qa = rows.filter((r) => r.feedback_provenance === "QA_AUTOMATION");
  results.total = rows.length;
  results.realPlayer = real.length;
  results.qaAutomation = qa.length;

  const qaAuthors = qa.filter((r) => String(r.author).toUpperCase().startsWith("QA-"));
  results.qaTaggedAuthors = qaAuthors.length;

  const { data: insert, error: insErr } = await admin
    .from("game_comments")
    .insert({
      game_slug: "snake",
      author: "PlayerTest",
      content: `prov-verify-${Date.now()} real player signal`,
      feedback_type: "bug",
      status: "NEW",
      feedback_provenance: "REAL_PLAYER",
    })
    .select("id, feedback_provenance")
    .single();

  results.realInsert = !insErr && insert?.feedback_provenance === "REAL_PLAYER";
  const realId = insert?.id;

  const { data: qaInsert, error: qaErr } = await admin
    .from("game_comments")
    .insert({
      game_slug: "snake",
      author: "QA-PROV",
      content: `fbops-prov-${Date.now()}`,
      feedback_type: "mobile",
      status: "NEW",
      feedback_provenance: "QA_AUTOMATION",
    })
    .select("id, feedback_provenance")
    .single();

  results.qaInsert = !qaErr && qaInsert?.feedback_provenance === "QA_AUTOMATION";
  const qaId = qaInsert?.id;

  if (realId) await admin.from("game_comments").update({ status: "RELEASED" }).eq("id", realId);
  if (qaId) await admin.from("game_comments").update({ status: "RELEASED" }).eq("id", qaId);

  writeReport(results);
  const pass = Object.values(results).every(Boolean);
  console.log("Migration 0038 verify:", pass ? "PASS" : "FAIL", results);
  process.exit(pass ? 0 : 1);
}

function writeReport(results) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, "migration-0038-verify.json"),
    JSON.stringify({ results, verifiedAt: new Date().toISOString() }, null, 2)
  );
}

run();
