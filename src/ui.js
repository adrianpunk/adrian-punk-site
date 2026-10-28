import { sound } from './sound.js';
import wave from './waveform.json';
import { face } from './face.js';

// Page chrome: custom cursor, Shanghai clock, scroll reveals, waveform player, tab-title aside.
export function initUI() {
  const fine = matchMedia('(pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const cursor = document.getElementById('cursor');
  let px = innerWidth / 2, py = innerHeight / 2, cx = px, cy = py, raf = 0;
  const paint = () => {
    raf = 0;
    cx += (px - cx) * 0.25;
    cy += (py - cy) * 0.25;
    cursor.style.left = cx + 'px';
    cursor.style.top = cy + 'px';
    if (Math.abs(px - cx) + Math.abs(py - cy) > 0.1) raf = requestAnimationFrame(paint);
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    px = e.clientX; py = e.clientY;
    cursor.classList.add('is-visible');
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
  // Delegated, so content rendered from data gets the hover state too.
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('is-hover', !!e.target.closest('a,button,canvas#wave'));
  });

  const clock = document.getElementById('clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // He keeps playing while you're away.
  const title = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? '♪ 还在吹，等你回来…' : title;
  });

  initPlayer();
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// The music is one line: the sax track's real waveform. Played part in ink, the rest faint,
// playhead in the accent. Click anywhere on it to jump there.
function initPlayer() {
  const btn = document.getElementById('play');
  const time = document.getElementById('time');
  const canvas = document.getElementById('wave');
  const ctx = canvas.getContext('2d');
  const peaks = wave.peaks;
  const mini = document.getElementById('miniFace').getContext('2d');
  let last = '';

  btn.addEventListener('click', () => sound.toggle());
  sound.onChange((on) => btn.setAttribute('aria-pressed', on));
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    sound.seek((e.clientX - r.left) / r.width);
  });

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio, 2);
    const progress = sound.duration ? sound.time / sound.duration : 0;
    const sig = [w, h, Math.round(progress * 400), sound.playing].join(':');
    if (sig === last) return;
    last = sig;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const n = Math.max(24, Math.floor(w / 3));
    for (let i = 0; i < n; i++) {
      const v = peaks[Math.floor((i / n) * peaks.length)];
      const bh = Math.max(2, v * h);
      ctx.fillStyle = i / n < progress ? '#0a0a0a' : 'rgba(10,10,10,.18)';
      ctx.fillRect(i * (w / n), (h - bh) / 2, 1.5, bh);
    }
    if (sound.playing || progress > 0) {
      ctx.fillStyle = '#ff5b14';
      ctx.fillRect(Math.round(progress * w), 0, 1.5, h);
    }
  }

  const loop = () => {
    requestAnimationFrame(loop);
    draw();
    // A tiny live copy of his LED face — the companion on phones, where the 3D figure is hidden.
    if (face.ledCanvas) mini.drawImage(face.ledCanvas, 0, 0, 64, 64);
    time.textContent = sound.playing || sound.time ? `${mmss(sound.time)} / ${mmss(sound.duration || wave.duration)}` : 'Saxlele · 03:13';
  };
  requestAnimationFrame(loop);
}
