// Generates on-brand PNG thumbnails (1024x576) and screenshot-gallery
// variants (1280x720, 3 per game) for every game as a placeholder until real
// art/AI-generated images replace them. No image-generation model is
// available in this environment, so these are procedurally drawn SVG icons
// rasterized via `sharp`, in the Re:Play "modern retro" dark palette.
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
const GALLERY_WIDTH = 1280;
const GALLERY_HEIGHT = 720;
const BG = "#0F172A";
const CARD = "#1E293B";
const FG = "#F8FAFC";
const BRAND_PRIMARY = "#5B5BD6";
const BRAND_AMBER = "#FFB800";

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
      <circle cx="${1 * (size + gap) + size / 2}" cy="${1 * (size + gap) + size / 2}" r="16" fill="${BG}"/>
    </g>`;
}

// Abstract maze-chase icon: a wedge-cut circle (the runner) chasing a row of
// dots, with two small "chaser" circles trailing — no ghost/character shapes
// copied from any specific game, just generic geometric shapes.
function iconMazeRunner(accent) {
  const dots = [];
  for (let i = 0; i < 4; i++) {
    dots.push(`<circle cx="${140 + i * 40}" cy="130" r="7" fill="${FG}" opacity="0.7"/>`);
  }
  return `
    <g transform="translate(340,20)">
      <rect x="0" y="0" width="320" height="260" rx="16" fill="${CARD}"/>
      <path d="M60,130 L60,60 L260,60 L260,200 L60,200 Z" fill="none" stroke="${accent}" stroke-width="6" opacity="0.35"/>
      ${dots.join("\n")}
      <path d="M55,130 L95,105 A45,45 0 1 1 95,155 Z" fill="${BRAND_AMBER}"/>
      <circle cx="220" cy="130" r="17" fill="${accent}"/>
      <circle cx="180" cy="100" r="15" fill="#ef4444" opacity="0.85"/>
    </g>`;
}

// Top-down tanks facing off across a destructible brick wall — generic
// rectangle-body/circle-turret tanks, no copied vehicle design.
function iconTankBattle(accent) {
  function tank(x, y, color, rotate) {
    return `
      <g transform="translate(${x},${y}) rotate(${rotate})">
        <rect x="-28" y="-20" width="56" height="40" rx="6" fill="${color}"/>
        <rect x="-8" y="-34" width="16" height="20" rx="3" fill="${color}"/>
        <circle cx="0" cy="0" r="10" fill="${BG}"/>
      </g>`;
  }
  const bricks = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      bricks.push(
        `<rect x="${145 + col * 34}" y="${60 + row * 26}" width="28" height="20" rx="3" fill="${FG}" opacity="0.5"/>`
      );
    }
  }
  return `
    <g transform="translate(352,90)">
      ${tank(40, 60, accent, 90)}
      ${bricks.join("\n")}
      ${tank(280, 60, "#ef4444", -90)}
    </g>`;
}

// Player ship with a loose V-formation of enemies overhead, diagonal
// motion streaks hinting at the dive-attack mechanic (distinct from Space
// Defender's rigid grid below).
function iconGalaxyDefender(accent) {
  const formation = [];
  const cols = 5;
  for (let i = 0; i < cols; i++) {
    const dx = Math.abs(i - (cols - 1) / 2);
    formation.push(
      `<path d="M${i * 46},${dx * 26} l14,22 l-28,0 Z" fill="${accent}" opacity="${1 - dx * 0.15}"/>`
    );
  }
  return `
    <g transform="translate(372,50)">
      <g transform="translate(0,10)">${formation.join("\n")}</g>
      <path d="M100,150 l90,60 l-15,-25 l-60,0 l-15,25 Z" fill="${BRAND_AMBER}"/>
      <line x1="120" y1="90" x2="70" y2="150" stroke="${accent}" stroke-width="3" opacity="0.4" stroke-dasharray="4 5"/>
    </g>`;
}

// Rigid marching grid of invaders + a bottom-row ship + shield blocks — the
// grid/shield motif is the visual differentiator from Galaxy Defender.
function iconSpaceDefender(accent) {
  const cells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      cells.push(
        `<rect x="${col * 34}" y="${row * 30}" width="24" height="20" rx="4" fill="${accent}" opacity="${1 - row * 0.2}"/>`
      );
    }
  }
  return `
    <g transform="translate(320,40)">
      ${cells.join("\n")}
      <rect x="20" y="170" width="34" height="16" rx="4" fill="${FG}" opacity="0.5"/>
      <rect x="140" y="170" width="34" height="16" rx="4" fill="${FG}" opacity="0.5"/>
      <path d="M85,230 l16,-24 l16,24 Z" fill="${BRAND_AMBER}"/>
    </g>`;
}

// Cluster of colored bubbles with a shooter + aim line — no character
// shapes, just circles.
function iconBubblePop(accent) {
  const colors = [accent, "#ef4444", BRAND_AMBER, "#22c55e"];
  const bubbles = [];
  const positions = [
    [0, 0], [48, 0], [24, 42], [72, 42], [0, 84], [48, 84],
  ];
  positions.forEach(([x, y], i) => {
    bubbles.push(`<circle cx="${x + 20}" cy="${y + 20}" r="20" fill="${colors[i % colors.length]}"/>`);
  });
  return `
    <g transform="translate(372,30)">
      ${bubbles.join("\n")}
      <circle cx="130" cy="220" r="18" fill="${FG}"/>
      <line x1="130" y1="220" x2="90" y2="150" stroke="${FG}" stroke-width="3" stroke-dasharray="4 5" opacity="0.6"/>
    </g>`;
}

function iconSudoku(accent) {
  const boxes = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      boxes.push(
        `<rect x="${col * 84}" y="${row * 84}" width="78" height="78" rx="6" fill="${CARD}" stroke="${accent}" stroke-width="3"/>`
      );
    }
  }
  return `
    <g transform="translate(362,30)">
      ${boxes.join("\n")}
      <text x="42" y="55" font-size="34" font-weight="700" fill="${FG}" text-anchor="middle" font-family="Arial, sans-serif">5</text>
      <text x="126" y="139" font-size="34" font-weight="700" fill="${accent}" text-anchor="middle" font-family="Arial, sans-serif">9</text>
      <text x="210" y="223" font-size="34" font-weight="700" fill="${FG}" text-anchor="middle" font-family="Arial, sans-serif">2</text>
    </g>`;
}

// Two paddles + a puck between them on a table split by a center line —
// mirrors the visual language of iconBreakout's composition (simple
// geometric shapes, no character/branding references).
function iconAirHockey(accent) {
  return `
    <g transform="translate(362,30)">
      <rect x="0" y="0" width="300" height="240" rx="16" fill="${CARD}"/>
      <line x1="0" y1="120" x2="300" y2="120" stroke="${FG}" stroke-width="4" stroke-dasharray="10 8" opacity="0.4"/>
      <circle cx="150" cy="55" r="26" fill="#ef4444" opacity="0.85"/>
      <circle cx="150" cy="120" r="14" fill="${FG}"/>
      <circle cx="150" cy="185" r="26" fill="${accent}"/>
    </g>`;
}

function iconTicTacToe(accent) {
  return `
    <g transform="translate(392,40)">
      <line x1="80" y1="0" x2="80" y2="240" stroke="${FG}" stroke-width="6" opacity="0.5"/>
      <line x1="160" y1="0" x2="160" y2="240" stroke="${FG}" stroke-width="6" opacity="0.5"/>
      <line x1="0" y1="80" x2="240" y2="80" stroke="${FG}" stroke-width="6" opacity="0.5"/>
      <line x1="0" y1="160" x2="240" y2="160" stroke="${FG}" stroke-width="6" opacity="0.5"/>
      <line x1="18" y1="18" x2="62" y2="62" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
      <line x1="62" y1="18" x2="18" y2="62" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
      <circle cx="120" cy="120" r="24" fill="none" stroke="${BRAND_AMBER}" stroke-width="10"/>
      <line x1="178" y1="178" x2="222" y2="222" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
      <line x1="222" y1="178" x2="178" y2="222" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
    </g>`;
}

function iconSimon(accent) {
  const colors = [accent, "#ef4444", BRAND_AMBER, "#22c55e"];
  return `
    <g transform="translate(392,30)">
      <path d="M120,120 L120,0 A120,120 0 0 1 240,120 Z" fill="${colors[0]}"/>
      <path d="M120,120 L240,120 A120,120 0 0 1 120,240 Z" fill="${colors[1]}"/>
      <path d="M120,120 L120,240 A120,120 0 0 1 0,120 Z" fill="${colors[2]}"/>
      <path d="M120,120 L0,120 A120,120 0 0 1 120,0 Z" fill="${colors[3]}"/>
      <circle cx="120" cy="120" r="34" fill="${BG}"/>
    </g>`;
}

// Abstract gallows (no figure) + underscores for unguessed letters.
function iconHangman(accent) {
  return `
    <g transform="translate(372,20)">
      <line x1="20" y1="240" x2="140" y2="240" stroke="${FG}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
      <line x1="50" y1="240" x2="50" y2="10" stroke="${FG}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
      <line x1="50" y1="10" x2="160" y2="10" stroke="${FG}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
      <line x1="160" y1="10" x2="160" y2="40" stroke="${FG}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
      <circle cx="160" cy="65" r="22" fill="${accent}"/>
      <line x1="160" y1="87" x2="160" y2="150" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
      <line x1="160" y1="105" x2="130" y2="135" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
      <line x1="160" y1="105" x2="190" y2="135" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
      <text x="205" y="220" font-size="42" font-weight="700" fill="${FG}" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="6">_ _ _</text>
    </g>`;
}

// A target swatch above a row of option swatches — reflex color-matching.
function iconColorMatch(accent) {
  const colors = [accent, "#ef4444", BRAND_AMBER, "#22c55e", "#a855f7"];
  const swatches = colors
    .map((c, i) => `<circle cx="${i * 56}" cy="150" r="24" fill="${c}"/>`)
    .join("\n");
  return `
    <g transform="translate(345,30)">
      <rect x="88" y="0" width="60" height="60" rx="12" fill="${accent}"/>
      <line x1="118" y1="70" x2="118" y2="110" stroke="${FG}" stroke-width="4" opacity="0.4" stroke-dasharray="4 5"/>
      ${swatches}
    </g>`;
}

// Striped big-top tent silhouette + a small ball balanced on the peak —
// generic circus-tent motif, no copied character art.
function iconCircus(accent) {
  const stripes = [];
  for (let i = 0; i < 5; i++) {
    stripes.push(
      `<path d="M${20 + i * 52},240 L${140},40 L${140 + 26},40 L${72 + i * 52},240 Z" fill="${i % 2 === 0 ? accent : FG}" opacity="${i % 2 === 0 ? 0.9 : 0.15}"/>`
    );
  }
  return `
    <g transform="translate(352,20)">
      <clipPath id="circus-tent"><path d="M0,240 L140,20 L280,240 Z"/></clipPath>
      <g clip-path="url(#circus-tent)">${stripes.join("\n")}</g>
      <path d="M0,240 L140,20 L280,240 Z" fill="none" stroke="${FG}" stroke-width="4" opacity="0.4"/>
      <circle cx="140" cy="10" r="14" fill="${BRAND_AMBER}"/>
      <rect x="0" y="240" width="280" height="14" rx="4" fill="${CARD}"/>
    </g>`;
}

// Three-step podium blocks (gold/silver/bronze) + a curved track lane —
// generic "athletic competition" motif, no trademarked Olympic rings.
function iconOlympic(accent) {
  return `
    <g transform="translate(352,40)">
      <path d="M0,220 Q140,150 280,220" stroke="${accent}" stroke-width="10" fill="none" opacity="0.35"/>
      <rect x="20" y="120" width="70" height="90" rx="6" fill="#94a3b8"/>
      <rect x="105" y="90" width="70" height="120" rx="6" fill="${BRAND_AMBER}"/>
      <rect x="190" y="140" width="70" height="70" rx="6" fill="#c2703d"/>
      <text x="140" y="150" font-size="30" font-weight="700" fill="${BG}" text-anchor="middle" font-family="Arial, sans-serif">1</text>
    </g>`;
}

// Curved sword silhouette resting across two stone platform blocks — generic
// "adventure platformer" motif, no copied character silhouette.
function iconPrinceOfPersia(accent) {
  return `
    <g transform="translate(352,30)">
      <rect x="0" y="180" width="90" height="50" rx="6" fill="${CARD}" stroke="${accent}" stroke-width="3"/>
      <rect x="190" y="140" width="90" height="90" rx="6" fill="${CARD}" stroke="${accent}" stroke-width="3"/>
      <g transform="translate(70,60) rotate(35)">
        <rect x="-8" y="0" width="16" height="130" rx="6" fill="${FG}"/>
        <rect x="-30" y="120" width="60" height="16" rx="6" fill="${accent}"/>
        <rect x="-10" y="130" width="20" height="34" rx="6" fill="${BRAND_AMBER}"/>
      </g>
    </g>`;
}

const games = [
  { slug: "2048", title: "2048", accent: BRAND_PRIMARY, icon: icon2048 },
  { slug: "snake", title: "Snake", accent: "#22c55e", icon: iconSnake },
  { slug: "breakout", title: "Breakout", accent: BRAND_AMBER, icon: iconBreakout },
  { slug: "memory", title: "Memory", accent: "#a855f7", icon: iconMemory },
  { slug: "minesweeper", title: "Minesweeper", accent: "#ef4444", icon: iconMinesweeper },
  { slug: "maze-runner", title: "Maze Runner", accent: BRAND_PRIMARY, icon: iconMazeRunner },
  { slug: "tank-battle", title: "Tank Battle", accent: "#22c55e", icon: iconTankBattle },
  { slug: "galaxy-defender", title: "Galaxy Defender", accent: BRAND_PRIMARY, icon: iconGalaxyDefender },
  { slug: "space-defender", title: "Space Defender", accent: "#0ea5e9", icon: iconSpaceDefender },
  { slug: "bubble-pop", title: "Bubble Pop", accent: "#22c55e", icon: iconBubblePop },
  { slug: "sudoku", title: "Sudoku", accent: BRAND_AMBER, icon: iconSudoku },
  { slug: "tic-tac-toe", title: "Tic Tac Toe", accent: "#0ea5e9", icon: iconTicTacToe },
  { slug: "simon", title: "Simon", accent: BRAND_PRIMARY, icon: iconSimon },
  { slug: "hangman", title: "Hangman", accent: "#a855f7", icon: iconHangman },
  { slug: "color-match", title: "Color Match", accent: "#ef4444", icon: iconColorMatch },
  { slug: "air-hockey", title: "Air Hockey", accent: "#0ea5e9", icon: iconAirHockey },
  { slug: "circus", title: "Circus", accent: "#ef4444", icon: iconCircus },
  { slug: "olympic", title: "Olympic", accent: BRAND_AMBER, icon: iconOlympic },
  { slug: "prince-of-persia", title: "Prince of Persia", accent: "#a855f7", icon: iconPrinceOfPersia },
];

function buildSvg({ title, accent, icon }) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
      <rect x="0" y="0" width="${WIDTH}" height="8" fill="${accent}"/>
      ${icon(accent)}
      <text x="512" y="420" font-size="56" font-weight="700" fill="${FG}" text-anchor="middle" font-family="Arial, sans-serif">${title}</text>
      <text x="512" y="466" font-size="24" font-weight="700" fill="${accent}" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="6">RE:PLAY</text>
    </svg>`;
}

// Gallery variants: 1 = the thumbnail composition at gallery aspect ratio,
// 2 = a zoomed-in detail crop of the same icon (no title, more "in-game"
// feel), 3 = an alternate accent pass. All illustrative/stylized, not real
// gameplay captures — appropriate for a retro/pixel-art brand.
function buildGallerySvg({ title, accent, icon }, variant) {
  const offsetX = (GALLERY_WIDTH - WIDTH) / 2;
  const offsetY = (GALLERY_HEIGHT - HEIGHT) / 2;

  if (variant === 2) {
    // Zoom in on the icon, keeping it centered: map the original 1024x576
    // frame's center (512,288) to the gallery canvas's center, then scale.
    const zoom = 1.6;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${GALLERY_WIDTH}" height="${GALLERY_HEIGHT}" viewBox="0 0 ${GALLERY_WIDTH} ${GALLERY_HEIGHT}">
        <rect width="${GALLERY_WIDTH}" height="${GALLERY_HEIGHT}" fill="${CARD}"/>
        <g transform="translate(${GALLERY_WIDTH / 2},${GALLERY_HEIGHT / 2}) scale(${zoom}) translate(-512,-288)">
          ${icon(accent)}
        </g>
      </svg>`;
  }

  const altAccent = variant === 3 ? BRAND_AMBER : accent;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${GALLERY_WIDTH}" height="${GALLERY_HEIGHT}" viewBox="0 0 ${GALLERY_WIDTH} ${GALLERY_HEIGHT}">
      <rect width="${GALLERY_WIDTH}" height="${GALLERY_HEIGHT}" fill="${BG}"/>
      <rect x="0" y="0" width="${GALLERY_WIDTH}" height="8" fill="${altAccent}"/>
      <g transform="translate(${offsetX},${offsetY})">
        ${icon(altAccent)}
        <text x="512" y="420" font-size="56" font-weight="700" fill="${FG}" text-anchor="middle" font-family="Arial, sans-serif">${title}</text>
      </g>
    </svg>`;
}

await mkdir(outDir, { recursive: true });

for (const game of games) {
  const svg = buildSvg(game);
  const outPath = path.join(outDir, `${game.slug}.png`);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`generated ${outPath}`);

  for (let variant = 1; variant <= 3; variant++) {
    const gallerySvg = buildGallerySvg(game, variant);
    const galleryPath = path.join(outDir, `${game.slug}-gallery-${variant}.png`);
    await sharp(Buffer.from(gallerySvg)).png().toFile(galleryPath);
    console.log(`generated ${galleryPath}`);
  }
}
