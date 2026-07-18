// Generates simple, on-brand 1024x576 PNG thumbnails for each game as a
// placeholder until real art/AI-generated images replace them (see Sprint 4
// report). No image-generation model is available in this environment, so
// these are procedurally drawn SVG icons rasterized via `sharp`.
//
// Usage: node scripts/generate-thumbnails.mjs
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "apps", "web", "public", "images", "games");

const WIDTH = 1024;
const HEIGHT = 576;
const BG = "#18181b";
const FG = "#fafafa";

function icon2048(accent) {
  return `
    <g transform="translate(372,70)">
      <rect x="0" y="0" width="130" height="130" rx="14" fill="${accent}" opacity="0.9"/>
      <text x="65" y="82" font-size="48" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">2</text>
      <rect x="150" y="0" width="130" height="130" rx="14" fill="${accent}" opacity="0.7"/>
      <text x="215" y="82" font-size="48" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">4</text>
      <rect x="0" y="150" width="130" height="130" rx="14" fill="${accent}" opacity="0.55"/>
      <text x="65" y="232" font-size="48" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">8</text>
      <rect x="150" y="150" width="130" height="130" rx="14" fill="${accent}"/>
      <text x="215" y="232" font-size="40" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">16</text>
    </g>`;
}

function iconSnake(accent) {
  return `
    <g transform="translate(360,60)">
      <path d="M20,260 L20,190 L110,190 L110,110 L200,110 L200,40" stroke="${accent}" stroke-width="34" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="260" cy="40" r="20" fill="#ef4444"/>
    </g>`;
}

function iconBreakout(accent) {
  const bricks = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      bricks.push(
        `<rect x="${col * 58}" y="${row * 32}" width="50" height="22" rx="4" fill="${accent}" opacity="${1 - row * 0.25}"/>`
      );
    }
  }
  return `
    <g transform="translate(362,50)">
      ${bricks.join("\n")}
      <circle cx="145" cy="190" r="12" fill="${FG}"/>
      <rect x="95" y="225" width="100" height="16" rx="8" fill="${accent}"/>
    </g>`;
}

function iconMemory(accent) {
  return `
    <g transform="translate(372,60)">
      <rect x="30" y="40" width="150" height="190" rx="18" fill="${accent}" opacity="0.45" transform="rotate(-10 105 135)"/>
      <rect x="90" y="20" width="150" height="190" rx="18" fill="${accent}"/>
      <circle cx="165" cy="115" r="32" fill="#fff" opacity="0.9"/>
    </g>`;
}

function iconMinesweeper(accent) {
  const cells = [];
  const size = 76;
  const gap = 8;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const isMine = row === 1 && col === 1;
      cells.push(
        `<rect x="${col * (size + gap)}" y="${row * (size + gap)}" width="${size}" height="${size}" rx="8" fill="${isMine ? "#ef4444" : accent}" opacity="${isMine ? 1 : 0.6}"/>`
      );
    }
  }
  return `
    <g transform="translate(372,50)">
      ${cells.join("\n")}
      <circle cx="${1 * (size + gap) + size / 2}" cy="${1 * (size + gap) + size / 2}" r="16" fill="#18181b"/>
    </g>`;
}

const games = [
  { slug: "2048", title: "2048", accent: "#10b981", icon: icon2048 },
  { slug: "snake", title: "Snake", accent: "#22c55e", icon: iconSnake },
  { slug: "breakout", title: "Breakout", accent: "#f59e0b", icon: iconBreakout },
  { slug: "memory", title: "Memory", accent: "#a855f7", icon: iconMemory },
  { slug: "minesweeper", title: "Minesweeper", accent: "#ef4444", icon: iconMinesweeper },
];

function buildSvg({ title, accent, icon }) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
      <rect x="0" y="0" width="${WIDTH}" height="8" fill="${accent}"/>
      ${icon(accent)}
      <text x="512" y="420" font-size="56" font-weight="700" fill="${FG}" text-anchor="middle" font-family="Arial, sans-serif">${title}</text>
      <text x="512" y="466" font-size="24" font-weight="700" fill="${accent}" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="6">PLAY29</text>
    </svg>`;
}

await mkdir(outDir, { recursive: true });

for (const game of games) {
  const svg = buildSvg(game);
  const outPath = path.join(outDir, `${game.slug}.png`);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`generated ${outPath}`);
}
