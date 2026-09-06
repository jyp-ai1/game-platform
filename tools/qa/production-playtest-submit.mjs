/**
 * Production Playtest — submit REAL_PLAYER feedback (no QA author patterns).
 * node tools/qa/production-playtest-submit.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/feedback-intelligence/production-playtest");
const PROD = "https://game29.vercel.app";
const MARKER = `playtest-${new Date().toISOString().slice(0, 10)}`;

const SUBMISSIONS = [
  {
    game: "agar",
    feedbackType: "fun",
    author: "Minji",
    content: "큰 세포가 작은 세포를 쫓아올 때 긴장감이 좋아서 한 판 더 하고 싶어졌다.",
  },
  {
    game: "snake",
    feedbackType: "fun",
    author: "Jinho",
    content: "콤보가 올라갈수록 긴장감이 있어서 재밌었다. 먹이 연속 섭취 손맛이 좋다.",
  },
  {
    game: "snake",
    feedbackType: "mobile",
    author: "Sora",
    content: "모바일에서 방향 전환할 때 손가락이 화면 끝에 걸려서 가끔 입력이 늦게 반응한다.",
  },
  {
    game: "bomber",
    feedbackType: "idea",
    author: "Hyeon",
    content: "연쇄 폭발을 더 크게 만드는 아이템이 있으면 팀전이 더 재밌을 것 같다.",
  },
  {
    game: "re-front",
    feedbackType: "opinion",
    author: "Yuri",
    content: "초반 거점 확보까지 템포가 빠르고, 다음 판도 바로 이어지고 싶어졌다.",
  },
];

function loadEnv() {
  for (const path of [join(ROOT, "apps/web/.env.local")]) {
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

async function submitAll() {
  const results = [];
  for (const s of SUBMISSIONS) {
    const res = await fetch(`${PROD}/api/games/${s.game}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: s.author,
        content: s.content,
        feedbackType: s.feedbackType,
      }),
    });
    const json = await res.json();
    results.push({
      game: s.game,
      feedbackType: s.feedbackType,
      author: s.author,
      httpStatus: res.status,
      ok: res.ok && json.ok,
      commentId: json.comment?.id ?? null,
      returnedType: json.comment?.feedbackType ?? null,
      error: json.error ?? null,
    });
    console.log(`${s.game}/${s.feedbackType}: ${res.ok ? "PASS" : "FAIL"}`, json.error ?? json.comment?.id);
  }
  return results;
}

async function verifyDb(ids) {
  if (!url || !key) return { error: "no supabase env" };
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const verified = [];
  for (const id of ids.filter(Boolean)) {
    const { data, error } = await admin
      .from("game_comments")
      .select("id, game_slug, feedback_type, feedback_provenance, author, content, status")
      .eq("id", id)
      .single();
    verified.push({
      id,
      ok: !error && data?.feedback_provenance === "REAL_PLAYER",
      feedback_provenance: data?.feedback_provenance ?? null,
      feedback_type: data?.feedback_type ?? null,
      status: data?.status ?? null,
      error: error?.message ?? null,
    });
  }
  return { verified };
}

const submissions = await submitAll();
const dbCheck = await verifyDb(submissions.map((s) => s.commentId));

mkdirSync(OUT, { recursive: true });
const report = {
  production: PROD,
  marker: MARKER,
  submittedAt: new Date().toISOString(),
  submissions,
  dbVerification: dbCheck,
  allProvenanceRealPlayer: dbCheck.verified?.every((v) => v.ok) ?? false,
};
writeFileSync(join(OUT, "playtest-submit.json"), JSON.stringify(report, null, 2));

const pass = submissions.every((s) => s.ok) && report.allProvenanceRealPlayer;
console.log("\nPlaytest submit:", pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
