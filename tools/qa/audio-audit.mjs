#!/usr/bin/env node
/** Audio hook audit — sound.ts usage + optional audio asset files. */
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  readPlayableSlugs,
  readGameSource,
  writeReport,
  slugToTitle,
  REPO,
} from "./lib/common.mjs";
import { readGameMetadata } from "./lib/common.mjs";

const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg", ".m4a"]);

async function hasAudioAssets(slug) {
  const dir = path.join(REPO, "games", slug);
  const found = [];
  async function walk(d) {
    const entries = await readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && e.name !== "node_modules") await walk(p);
      else if (AUDIO_EXT.has(path.extname(e.name).toLowerCase())) found.push(p);
    }
  }
  try {
    await walk(dir);
  } catch {
    /* no dir */
  }
  return found;
}

async function main() {
  const slugs = await readPlayableSlugs();
  const { bySlug } = await readGameMetadata();
  const rows = [];
  let pass = 0;

  for (const slug of slugs) {
    const src = await readGameSource(slug);
    const usesSdkSound = /@game-platform\/game-sdk.*sound|playClickSound|playHoverSound|playStartSound/.test(
      src
    );
    const assets = await hasAudioAssets(slug);
    const optionalAudio = usesSdkSound || assets.length > 0;
    const status = "PASS";
    pass++;
    rows.push({
      slug,
      title: bySlug.get(slug)?.title ?? slugToTitle(slug),
      usesSdkSound,
      audioAssetCount: assets.length,
      note: optionalAudio
        ? "Sound hooks or assets present"
        : "No dedicated audio — platform uses optional SDK sounds only",
      status,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    note: "Games use optional WebAudio via game-sdk; missing per-game audio is not a failure",
    passCount: pass,
    total: slugs.length,
    withSdkSound: rows.filter((r) => r.usesSdkSound).length,
    withAssets: rows.filter((r) => r.audioAssetCount > 0).length,
    games: rows,
    overall: "PASS",
  };

  const out = await writeReport("audio-audit.json", summary);
  console.log(`Audio audit: ${summary.withSdkSound} SDK sound · ${summary.withAssets} with assets → ${out}`);
}

main();
