import * as THREE from 'three';

// A 32×32 dot-matrix panel that lives behind the lens glass: two amber eyes that
// follow the pointer and blink. `close` (0..1) shuts the eyes as the camera dives in.
const GRID = 32;
const SIZE = 512;
const CELL = SIZE / GRID;

export function createLED() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const state = { gazeX: 0, gazeY: 0, close: 0 };
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
    const sig = [gx, gy, half, off].join(':');
    if (sig === signature) return false;
    signature = sig;

    ctx.fillStyle = '#080b0c';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const cy = 16 + gy;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (Math.hypot(x - 15.5, y - 15.5) > 15.6) continue;
        const inEye = (x >= 9 + gx && x <= 12 + gx) || (x >= 19 + gx && x <= 22 + gx);
        let lit = !off && inEye && (half === 0 ? y === cy : y >= cy - half && y <= cy + half - 1);
        // Round off the eye corners.
        if (lit && half >= 3 && (y === cy - half || y === cy + half - 1) && [9, 12, 19, 22].includes(x - gx)) lit = false;
        ctx.shadowBlur = lit ? 10 : 0;
        ctx.shadowColor = 'rgba(255,157,45,.55)';
        ctx.fillStyle = lit ? '#ffb650' : '#21190f';
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

  return { texture, state, draw };
}
