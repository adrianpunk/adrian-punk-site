import * as THREE from 'three';

// A 32×32 dot-matrix panel that lives behind the lens glass. It is the character's face:
// two amber eyes that follow the pointer and blink; `close` (0..1) shuts them as the camera
// dives in; `eq` (8 levels) turns them into an equalizer while music plays; `glyph` shows
// a number or icon (hovered track numbers, "HI", "?", a heart, a note).
const GRID = 32;
const SIZE = 512;
const CELL = SIZE / GRID;

// 5×7 font, drawn at 2× (each glyph 10×14 dots).
const FONT = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '¥': ['10001', '01010', '00100', '11111', '00100', '11111', '00100'],
};
// 7×7 icons, drawn at 2×.
const ICONS = {
  heart: ['0110110', '1111111', '1111111', '1111111', '0111110', '0011100', '0001000'],
  note: ['0000110', '0000111', '0000101', '0000100', '0111100', '1111100', '0111000'],
};

// Rasterise a glyph into a Set of "x,y" dot keys centred on the panel.
const glyphCache = new Map();
function glyphDots(glyph) {
  if (glyphCache.has(glyph)) return glyphCache.get(glyph);
  const rows = ICONS[glyph] ? [ICONS[glyph]] : [...glyph].map((ch) => FONT[ch]).filter(Boolean);
  const widths = rows.map((r) => r[0].length * 2);
  const total = widths.reduce((a, b) => a + b, 0) + (rows.length - 1) * 2;
  const dots = new Set();
  let ox = Math.round((GRID - total) / 2);
  rows.forEach((bitmap, i) => {
    const oy = Math.round((GRID - bitmap.length * 2) / 2);
    bitmap.forEach((line, y) => [...line].forEach((bit, x) => {
      if (bit === '1') for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) dots.add(`${ox + x * 2 + dx},${oy + y * 2 + dy}`);
    }));
    ox += widths[i] + 2;
  });
  glyphCache.set(glyph, dots);
  return dots;
}

export function createLED() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const state = { gazeX: 0, gazeY: 0, close: 0, eq: null, glyph: null };
  let nextBlink = performance.now() + 2600;
  let blinkUntil = 0;
  let signature = '';

  function draw(now) {
    if (now >= nextBlink) {
      blinkUntil = now + 150;
      nextBlink = now + 3200 + Math.random() * 2600;
    }
    const gx = Math.round(state.gazeX * 2.5);
    const gy = Math.round(state.gazeY * 2);
    // Eye height shrinks from 8 rows to a 1-row line as `close` → 1.
    const blink = now < blinkUntil;
    const half = blink ? 0 : Math.round(4 * (1 - state.close));
    const off = state.close >= 0.999;
    // Equalizer: 8 bars, 2 dots wide, rising from row 24 (max 16 rows), squashed as the eyes close.
    const bars = state.eq?.map((v) => Math.round(v * 16 * (1 - state.close)));
    const glyph = !bars && state.glyph ? glyphDots(state.glyph) : null;
    const sig = [gx, gy, half, off, bars, state.glyph].join(':');
    if (sig === signature) return false;
    signature = sig;

    ctx.fillStyle = '#080b0c';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const cy = 16 + gy;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (Math.hypot(x - 15.5, y - 15.5) > 15.6) continue;
        let lit;
        if (off) lit = false;
        else if (bars) {
          const col = Math.floor((x - 4) / 3);
          lit = x >= 4 && col < 8 && (x - 4) % 3 < 2 && y <= 24 && y > 24 - Math.max(1, bars[col]);
        } else if (glyph) {
          lit = glyph.has(`${x},${y}`);
        } else {
          const inEye = (x >= 9 + gx && x <= 12 + gx) || (x >= 19 + gx && x <= 22 + gx);
          lit = inEye && (half === 0 ? y === cy : y >= cy - half && y <= cy + half - 1);
          // Round off the eye corners.
          if (lit && half >= 3 && (y === cy - half || y === cy + half - 1) && [9, 12, 19, 22].includes(x - gx)) lit = false;
        }
        ctx.shadowBlur = lit ? 10 : 0;
        ctx.shadowColor = 'rgba(255,91,20,.6)';
        ctx.fillStyle = lit ? '#ff6a24' : '#22140c';
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, lit ? CELL * 0.31 : CELL * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    const gleam = ctx.createLinearGradient(40, 8, 350, 480);
    gleam.addColorStop(0, 'rgba(209,232,231,.08)');
    gleam.addColorStop(0.48, 'rgba(209,232,231,0)');
    ctx.fillStyle = gleam;
    ctx.fillRect(0, 0, SIZE, SIZE);
    texture.needsUpdate = true;
    return true;
  }

  return { canvas, texture, state, draw };
}
