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

// Falling tetromino cluster (L, square, line) stacked on a partial board —
// generic block shapes, no copied branding.
function iconTetris(accent) {
  const colors = [accent, BRAND_AMBER, "#22c55e", "#ef4444"];
  return `
    <g transform="translate(362,20)">
      <rect x="0" y="180" width="280" height="60" rx="6" fill="${CARD}"/>
      <rect x="20" y="196" width="24" height="24" rx="3" fill="${colors[0]}"/>
      <rect x="44" y="196" width="24" height="24" rx="3" fill="${colors[0]}"/>
      <rect x="68" y="196" width="24" height="24" rx="3" fill="${colors[0]}"/>
      <rect x="120" y="196" width="24" height="24" rx="3" fill="${colors[2]}"/>
      <rect x="144" y="196" width="24" height="24" rx="3" fill="${colors[2]}"/>
      <rect x="200" y="0" width="30" height="30" rx="4" fill="${colors[1]}"/>
      <rect x="230" y="0" width="30" height="30" rx="4" fill="${colors[1]}"/>
      <rect x="200" y="30" width="30" height="30" rx="4" fill="${colors[1]}"/>
      <rect x="230" y="30" width="30" height="30" rx="4" fill="${colors[1]}"/>
      <rect x="40" y="60" width="28" height="28" rx="4" fill="${colors[3]}"/>
      <rect x="40" y="88" width="28" height="28" rx="4" fill="${colors[3]}"/>
      <rect x="40" y="116" width="28" height="28" rx="4" fill="${colors[3]}"/>
      <rect x="68" y="116" width="28" height="28" rx="4" fill="${colors[3]}"/>
    </g>`;
}

// A pivot at the top with a taut rope down to a gold nugget — generic
// claw-machine motif, no copied character/branding.
function iconGoldMiner(accent) {
  return `
    <g transform="translate(362,20)">
      <circle cx="140" cy="10" r="14" fill="${FG}"/>
      <line x1="140" y1="10" x2="70" y2="190" stroke="#a8a29e" stroke-width="5"/>
      <circle cx="70" cy="190" r="9" fill="${accent}"/>
      <circle cx="70" cy="205" r="30" fill="${BRAND_AMBER}"/>
      <circle cx="180" cy="220" r="20" fill="#78716c"/>
      <circle cx="230" cy="180" r="16" fill="#67e8f9"/>
    </g>`;
}

// Small ship on the left with a horizontal bullet trail toward enemies
// entering from the right — explicitly side-scrolling to differentiate from
// the vertical Galaxy/Space Defender shooters.
function iconSpaceImpact(accent) {
  return `
    <g transform="translate(352,60)">
      <path d="M0,60 l40,-24 l0,16 l40,0 l0,16 l-40,0 l0,16 Z" fill="${accent}"/>
      <line x1="90" y1="60" x2="180" y2="60" stroke="${FG}" stroke-width="4" stroke-dasharray="10 8" opacity="0.6"/>
      <rect x="200" y="20" width="26" height="26" rx="4" fill="#ef4444"/>
      <rect x="240" y="70" width="26" height="26" rx="4" fill="#ef4444" opacity="0.8"/>
      <rect x="200" y="90" width="20" height="20" rx="4" fill="#ef4444" opacity="0.6"/>
    </g>`;
}

// A cluster of colored square tiles with one group of same-color tiles
// highlighted mid-clear (fading opacity + a couple already-cleared gaps) --
// visually distinct from Bubble Pop's circles and Color Match's swatch row.
function iconSameGame(accent) {
  const colors = [accent, "#ef4444", BRAND_AMBER, "#22c55e"];
  const grid = [
    [0, 0, 1, 2], [0, 1, 1, 2], [3, 1, 1, null], [3, 3, 2, 2],
  ];
  const tiles = [];
  const size = 56;
  const gap = 6;
  grid.forEach((row, r) => {
    row.forEach((colorIndex, c) => {
      if (colorIndex === null) {
        return;
      }
      const fading = r === 1 && (c === 1 || c === 2);
      tiles.push(
        `<rect x="${c * (size + gap)}" y="${r * (size + gap)}" width="${size}" height="${size}" rx="8" fill="${colors[colorIndex]}" opacity="${fading ? 0.35 : 1}"/>`
      );
    });
  });
  return `
    <g transform="translate(362,30)">
      ${tiles.join("\n")}
    </g>`;
}

// Same bricks/ball/paddle composition as iconBreakout but with a falling
// power-up capsule ("W") -- the one visual element Breakout's icon doesn't
// have, mirroring the one real gameplay differentiator (power-ups + stages)
// this game adds over Breakout.
function iconArkanoidDx(accent) {
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
      <circle cx="255" cy="130" r="16" fill="#3b82f6"/>
      <text x="255" y="136" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">W</text>
    </g>`;
}

function iconStackTower(accent) {
  const blocks = [];
  for (let i = 0; i < 5; i++) {
    const w = 120 - i * 12;
    blocks.push(
      `<rect x="${(140 - w) / 2}" y="${180 - i * 36}" width="${w}" height="28" rx="6" fill="${accent}" opacity="${1 - i * 0.12}"/>`
    );
  }
  return `<g transform="translate(362,40)">${blocks.join("\n")}</g>`;
}

function iconBallSort(accent) {
  const tubes = [];
  for (let t = 0; t < 3; t++) {
    const balls = [];
    for (let b = 0; b < 3; b++) {
      balls.push(`<circle cx="30" cy="${150 - b * 28}" r="12" fill="${[accent, "#ef4444", BRAND_AMBER][b]}"/>`);
    }
    tubes.push(`<g transform="translate(${t * 70},0)"><rect x="0" y="60" width="60" height="120" rx="10" fill="${CARD}" stroke="${accent}" stroke-width="3"/>${balls.join("\n")}</g>`);
  }
  return `<g transform="translate(362,30)">${tubes.join("\n")}</g>`;
}

function iconColorSort(accent) {
  const tubes = [];
  for (let t = 0; t < 3; t++) {
    const fills = [
      `<rect x="8" y="140" width="44" height="30" rx="4" fill="#ef4444"/>`,
      `<rect x="8" y="105" width="44" height="30" rx="4" fill="${accent}"/>`,
      `<rect x="8" y="70" width="44" height="30" rx="4" fill="#22c55e"/>`,
    ];
    tubes.push(`<g transform="translate(${t * 72},0)"><rect x="0" y="60" width="60" height="120" rx="10" fill="${CARD}" stroke="${accent}" stroke-width="3"/>${fills[t] ?? fills[0]}</g>`);
  }
  return `<g transform="translate(362,30)">${tubes.join("\n")}</g>`;
}

function iconPenaltyShootout(accent) {
  return `
    <g transform="translate(362,40)">
      <rect x="20" y="80" width="240" height="120" rx="8" fill="none" stroke="${accent}" stroke-width="8"/>
      <circle cx="140" cy="200" r="22" fill="${FG}"/>
      <path d="M140,178 L140,120" stroke="${FG}" stroke-width="4" marker-end="url(#arrow)"/>
      <circle cx="140" cy="110" r="14" fill="${BRAND_AMBER}"/>
    </g>`;
}

function iconDarts(accent) {
  return `
    <g transform="translate(362,30)">
      <circle cx="140" cy="140" r="110" fill="${CARD}" stroke="${accent}" stroke-width="6"/>
      <circle cx="140" cy="140" r="70" fill="none" stroke="${accent}" stroke-width="4" opacity="0.6"/>
      <circle cx="140" cy="140" r="30" fill="#ef4444"/>
      <line x1="140" y1="140" x2="220" y2="80" stroke="${FG}" stroke-width="4"/>
    </g>`;
}

function iconBubbleShooter(accent) {
  const colors = [accent, "#ef4444", BRAND_AMBER];
  const grid = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      grid.push(`<circle cx="${c * 36 + 20}" cy="${r * 32 + 20}" r="14" fill="${colors[(r + c) % 3]}"/>`);
    }
  }
  return `
    <g transform="translate(362,30)">
      ${grid.join("\n")}
      <circle cx="90" cy="210" r="16" fill="${accent}"/>
      <polygon points="90,190 80,210 100,210" fill="${FG}" opacity="0.5"/>
    </g>`;
}

function iconMergeBlocks(accent) {
  const vals = ["2", "4", "8", "16"];
  const tiles = [];
  for (let i = 0; i < 4; i++) {
    tiles.push(
      `<rect x="${(i % 2) * 70}" y="${Math.floor(i / 2) * 70}" width="60" height="60" rx="10" fill="${accent}" opacity="${0.5 + i * 0.12}"/><text x="${(i % 2) * 70 + 30}" y="${Math.floor(i / 2) * 70 + 38}" font-size="22" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">${vals[i]}</text>`
    );
  }
  return `<g transform="translate(382,50)">${tiles.join("\n")}</g>`;
}

function iconConnect4(accent) {
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const fill = c === 2 && r > 1 ? accent : c === 3 && r === 2 ? "#ef4444" : CARD;
      cells.push(`<circle cx="${c * 44 + 22}" cy="${r * 44 + 22}" r="18" fill="${fill}"/>`);
    }
  }
  return `<g transform="translate(372,40)">${cells.join("\n")}</g>`;
}

function iconReversi(accent) {
  const stones = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const fill = (r + c) % 3 === 0 ? accent : (r + c) % 3 === 1 ? "#111" : "#eee";
      stones.push(`<circle cx="${c * 36 + 18}" cy="${r * 36 + 18}" r="14" fill="${fill}"/>`);
    }
  }
  return `<g transform="translate(382,50)">${stones.join("\n")}</g>`;
}

function iconGomoku(accent) {
  const dots = [];
  for (let i = 0; i < 5; i++) {
    dots.push(`<circle cx="${i * 32 + 16}" cy="${160 - i * 28}" r="${i === 4 ? 14 : 10}" fill="${i % 2 ? '#111' : '#eee'}"/>`);
  }
  return `<g transform="translate(372,30)"><rect width="160" height="160" fill="${accent}" opacity="0.2" rx="8"/>${dots.join("\n")}</g>`;
}

function iconBowling(accent) {
  return `
    <g transform="translate(362,40)">
      ${[0, 1, 2, 3].map((i) => `<circle cx="${60 + i * 28}" cy="80" r="16" fill="${FG}"/>`).join("")}
      <circle cx="140" cy="200" r="20" fill="${accent}"/>
    </g>`;
}

function iconArchery(accent) {
  return `
    <g transform="translate(362,30)">
      <circle cx="140" cy="140" r="100" fill="none" stroke="${accent}" stroke-width="8"/>
      <circle cx="140" cy="140" r="60" fill="none" stroke="${accent}" stroke-width="4" opacity="0.6"/>
      <circle cx="140" cy="140" r="20" fill="#ef4444"/>
      <line x1="140" y1="140" x2="220" y2="90" stroke="${FG}" stroke-width="4"/>
    </g>`;
}

function iconSlidingPuzzle(accent) {
  const tiles = [];
  for (let i = 1; i <= 8; i++) {
    tiles.push(
      `<rect x="${((i - 1) % 3) * 52}" y="${Math.floor((i - 1) / 3) * 52}" width="46" height="46" rx="8" fill="${accent}" opacity="${0.5 + (i % 4) * 0.1}"/><text x="${((i - 1) % 3) * 52 + 23}" y="${Math.floor((i - 1) / 3) * 52 + 30}" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">${i}</text>`
    );
  }
  return `<g transform="translate(382,50)">${tiles.join("\n")}</g>`;
}

function iconWhackAMole(accent) {
  const holes = [];
  for (let i = 0; i < 9; i++) {
    const up = i === 4;
    holes.push(
      `<rect x="${(i % 3) * 52}" y="${Math.floor(i / 3) * 52}" width="46" height="46" rx="10" fill="${up ? accent : CARD}"/>`
    );
  }
  return `<g transform="translate(382,50)">${holes.join("\n")}</g>`;
}

function iconChess(accent) {
  return `
    <g transform="translate(382,40)">
      <text x="80" y="100" font-size="72" fill="${FG}" text-anchor="middle" font-family="Arial">♔</text>
      <text x="80" y="180" font-size="48" fill="${accent}" text-anchor="middle" font-family="Arial">♟</text>
    </g>`;
}

function iconCheckers(accent) {
  return `
    <g transform="translate(382,50)">
      ${[0, 1, 2, 3].map((i) => `<circle cx="${(i % 2) * 50 + 25}" cy="${Math.floor(i / 2) * 50 + 25}" r="18" fill="${i % 2 ? accent : '#111'}"/>`).join("")}
    </g>`;
}

function iconJigsaw(accent) {
  const tiles = [];
  const colors = [accent, "#0ea5e9", "#22c55e", "#FFB800", "#ef4444", "#a855f7", "#14b8a6", "#f97316"];
  for (let i = 0; i < 8; i++) {
    tiles.push(
      `<rect x="${(i % 3) * 54}" y="${Math.floor(i / 3) * 54}" width="48" height="48" rx="6" fill="${colors[i % colors.length]}"/>`
    );
  }
  return `<g transform="translate(382,50)">${tiles.join("\n")}</g>`;
}

function iconMancala(accent) {
  const pits = [];
  for (let i = 0; i < 6; i++) {
    pits.push(`<ellipse cx="${i * 28 + 14}" cy="40" rx="12" ry="8" fill="${accent}" opacity="0.8"/>`);
  }
  return `<g transform="translate(382,50)">${pits.join("\n")}</g>`;
}

function iconMiniGolf(accent) {
  return `
    <g transform="translate(362,60)">
      <circle cx="40" cy="120" r="14" fill="${FG}"/>
      <circle cx="200" cy="120" r="18" fill="#111"/>
      <rect x="0" y="130" width="240" height="8" rx="4" fill="${accent}"/>
    </g>`;
}

function iconBilliards(accent) {
  return `
    <g transform="translate(362,70)">
      <rect width="240" height="120" rx="12" fill="${accent}" opacity="0.3"/>
      <circle cx="60" cy="60" r="14" fill="${FG}"/>
      <circle cx="160" cy="50" r="12" fill="#ef4444"/>
      <circle cx="180" cy="70" r="12" fill="#0ea5e9"/>
    </g>`;
}

function iconBasketball(accent) {
  return `
    <g transform="translate(362,60)">
      <rect x="80" y="0" width="80" height="50" rx="4" fill="none" stroke="${accent}" stroke-width="4"/>
      <circle cx="120" cy="130" r="28" fill="${accent}"/>
      <path d="M92,130 L148,130 M120,102 L120,158" stroke="${BG}" stroke-width="3"/>
    </g>`;
}

function iconTableTennis(accent) {
  return `
    <g transform="translate(362,80)">
      <rect width="240" height="100" rx="8" fill="${accent}" opacity="0.25"/>
      <rect x="10" y="30" width="8" height="40" rx="4" fill="${FG}"/>
      <rect x="222" y="30" width="8" height="40" rx="4" fill="${FG}"/>
      <circle cx="120" cy="50" r="10" fill="${accent}"/>
    </g>`;
}

function iconDomino(accent) {
  return `
    <g transform="translate(382,70)">
      <rect x="0" y="20" width="50" height="80" rx="8" fill="${FG}"/>
      <text x="25" y="55" font-size="22" fill="${accent}" text-anchor="middle" font-family="Arial">3</text>
      <text x="25" y="85" font-size="22" fill="${accent}" text-anchor="middle" font-family="Arial">5</text>
      <rect x="60" y="20" width="50" height="80" rx="8" fill="${FG}"/>
      <text x="85" y="55" font-size="22" fill="${accent}" text-anchor="middle" font-family="Arial">5</text>
      <text x="85" y="85" font-size="22" fill="${accent}" text-anchor="middle" font-family="Arial">2</text>
    </g>`;
}

function iconCrossword(accent) {
  const cells = [];
  for (let i = 0; i < 9; i++) {
    const x = (i % 3) * 36;
    const y = Math.floor(i / 3) * 36;
    cells.push(`<rect x="${x}" y="${y}" width="32" height="32" rx="4" fill="${i % 2 ? accent : FG}" opacity="${i % 2 ? 0.7 : 0.9}"/>`);
  }
  return `<g transform="translate(392,70)">${cells.join("\n")}</g>`;
}

function iconChess960(accent) {
  return `
    <g transform="translate(382,60)">
      <rect width="160" height="160" rx="8" fill="${accent}" opacity="0.2"/>
      <text x="80" y="95" font-size="72" fill="${FG}" text-anchor="middle" font-family="Arial">♞</text>
      <text x="140" y="40" font-size="20" fill="${accent}" font-family="Arial">960</text>
    </g>`;
}

function iconShuffleboard(accent) {
  return `
    <g transform="translate(362,90)">
      <rect width="240" height="40" rx="20" fill="${accent}" opacity="0.35"/>
      <circle cx="180" cy="20" r="16" fill="${FG}"/>
      <rect x="60" y="16" width="40" height="8" rx="4" fill="${accent}"/>
    </g>`;
}

function iconKakuro(accent) {
  return `
    <g transform="translate(392,70)">
      <rect width="36" height="36" fill="#111"/>
      <rect x="40" width="36" height="36" fill="${accent}" opacity="0.5"/>
      <rect x="80" width="36" height="36" fill="${FG}"/>
      <rect y="40" width="36" height="36" fill="${accent}" opacity="0.5"/>
      <rect x="40" y="40" width="36" height="36" fill="${FG}"/>
      <rect x="80" y="40" width="36" height="36" fill="${FG}"/>
    </g>`;
}

function iconNonogram(accent) {
  const cells = [];
  for (let i = 0; i < 25; i++) {
    const filled = [6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18].includes(i);
    cells.push(
      `<rect x="${(i % 5) * 14}" y="${Math.floor(i / 5) * 14}" width="12" height="12" fill="${filled ? accent : CARD}"/>`
    );
  }
  return `<g transform="translate(392,70)">${cells.join("\n")}</g>`;
}

function iconWordSearch(accent) {
  const letters = "GAMEPLAYFUNWINZX";
  const cells = [];
  for (let i = 0; i < 16; i++) {
    cells.push(
      `<text x="${(i % 4) * 22 + 8}" y="${Math.floor(i / 4) * 22 + 14}" font-size="12" fill="${i < 8 ? accent : FG}" text-anchor="middle" font-family="monospace">${letters[i]}</text>`
    );
  }
  return `<g transform="translate(392,70)">${cells.join("\n")}</g>`;
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
  { slug: "tetris", title: "Tetris", accent: BRAND_PRIMARY, icon: iconTetris },
  { slug: "gold-miner", title: "Gold Miner", accent: BRAND_AMBER, icon: iconGoldMiner },
  { slug: "space-impact", title: "Space Impact", accent: "#22c55e", icon: iconSpaceImpact },
  { slug: "samegame", title: "SameGame", accent: "#a855f7", icon: iconSameGame },
  { slug: "arkanoid-dx", title: "Arkanoid DX", accent: BRAND_AMBER, icon: iconArkanoidDx },
  { slug: "stack-tower", title: "Stack Tower", accent: BRAND_PRIMARY, icon: iconStackTower },
  { slug: "ball-sort", title: "Ball Sort", accent: "#0ea5e9", icon: iconBallSort },
  { slug: "color-sort", title: "Color Sort", accent: "#a855f7", icon: iconColorSort },
  { slug: "penalty-shootout", title: "Penalty Shootout", accent: "#22c55e", icon: iconPenaltyShootout },
  { slug: "darts", title: "Darts", accent: "#ef4444", icon: iconDarts },
  { slug: "bubble-shooter", title: "Bubble Shooter", accent: "#22c55e", icon: iconBubbleShooter },
  { slug: "merge-blocks", title: "Merge Blocks", accent: BRAND_AMBER, icon: iconMergeBlocks },
  { slug: "connect4", title: "Connect 4", accent: BRAND_PRIMARY, icon: iconConnect4 },
  { slug: "reversi", title: "Reversi", accent: "#22c55e", icon: iconReversi },
  { slug: "gomoku", title: "Gomoku", accent: "#a855f7", icon: iconGomoku },
  { slug: "bowling", title: "Bowling", accent: "#0ea5e9", icon: iconBowling },
  { slug: "archery", title: "Archery", accent: "#ef4444", icon: iconArchery },
  { slug: "sliding-puzzle", title: "Sliding Puzzle", accent: BRAND_AMBER, icon: iconSlidingPuzzle },
  { slug: "whack-a-mole", title: "Whack-a-Mole", accent: "#22c55e", icon: iconWhackAMole },
  { slug: "chess", title: "Chess", accent: "#FFB800", icon: iconChess },
  { slug: "checkers", title: "Checkers", accent: "#ef4444", icon: iconCheckers },
  { slug: "jigsaw", title: "Jigsaw", accent: "#a855f7", icon: iconJigsaw },
  { slug: "mancala", title: "Mancala", accent: "#5B5BD6", icon: iconMancala },
  { slug: "mini-golf", title: "Mini Golf", accent: "#22c55e", icon: iconMiniGolf },
  { slug: "billiards", title: "Billiards", accent: "#FFB800", icon: iconBilliards },
  { slug: "basketball", title: "Basketball", accent: "#ef4444", icon: iconBasketball },
  { slug: "table-tennis", title: "Table Tennis", accent: "#22c55e", icon: iconTableTennis },
  { slug: "domino", title: "Domino", accent: "#FFB800", icon: iconDomino },
  { slug: "crossword", title: "Crossword", accent: "#5B5BD6", icon: iconCrossword },
  { slug: "chess960", title: "Chess960", accent: "#FFB800", icon: iconChess960 },
  { slug: "shuffleboard", title: "Shuffleboard", accent: "#0ea5e9", icon: iconShuffleboard },
  { slug: "kakuro", title: "Kakuro", accent: "#a855f7", icon: iconKakuro },
  { slug: "nonogram", title: "Nonogram", accent: "#5B5BD6", icon: iconNonogram },
  { slug: "word-search", title: "Word Search", accent: "#22c55e", icon: iconWordSearch },
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
