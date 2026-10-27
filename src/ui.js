import { sound } from './sound.js';

// Page chrome: custom cursor, Shanghai clock, scroll reveals, sound dock, About equalizer.
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
    cursor.classList.toggle('is-hover', !!e.target.closest('a,button'));
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

  initSound();
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function initSound() {
  const btn = document.getElementById('sound');
  const label = document.getElementById('soundLabel');
  const bars = btn.querySelectorAll('.bars i');
  const eq = document.getElementById('eq');
  const ectx = eq.getContext('2d');
  let eqVisible = false;
  new IntersectionObserver(([e]) => { eqVisible = e.isIntersecting; }).observe(eq);

  btn.addEventListener('click', () => sound.toggle());
  sound.onChange((on) => {
    btn.setAttribute('aria-pressed', on);
    btn.classList.toggle('is-on', on);
    if (!on) label.textContent = 'Sound off';
  });

  // Amber dot-matrix strip across the top of the About page — the lens panel, continued.
  const DOT = 11, ROWS = 7;
  function drawEq(levels, now) {
    const w = eq.clientWidth, h = DOT * ROWS;
    if (eq.width !== w * 2) { eq.width = w * 2; eq.height = h * 2; }
    ectx.setTransform(2, 0, 0, 2, 0, 0);
    ectx.clearRect(0, 0, w, h);
    const cols = Math.floor(w / DOT);
    for (let c = 0; c < cols; c++) {
      const band = levels ? levels[Math.floor((c / cols) * levels.length)] : 0;
      // Idle: a slow breathing wave. Playing: the music's spectrum with a little ripple.
      const v = levels ? band * (0.75 + 0.25 * Math.sin(now * 0.004 + c * 0.9)) : 0.12 + 0.1 * Math.sin(now * 0.0012 + c * 0.35);
      const lit = Math.round(v * ROWS);
      for (let r = 0; r < ROWS; r++) {
        const on = ROWS - r <= lit;
        ectx.fillStyle = on ? '#ffb650' : '#21190f';
        ectx.beginPath();
        ectx.arc(c * DOT + DOT / 2, r * DOT + DOT / 2, on ? 3.2 : 2.4, 0, Math.PI * 2);
        ectx.fill();
      }
    }
  }

  const loop = (now) => {
    requestAnimationFrame(loop);
    const levels = sound.levels(8);
    bars.forEach((b, i) => { b.style.transform = `scaleY(${levels ? 0.2 + levels[i * 2] * 0.8 : 0.2})`; });
    if (sound.playing) label.textContent = `${mmss(sound.time)} / ${mmss(sound.duration)}`;
    if (eqVisible) drawEq(levels, now);
  };
  requestAnimationFrame(loop);
}
