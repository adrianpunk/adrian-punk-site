// The footer's "Adrian.Punk", built from geometric pieces (bars, arcs, squares) that draw in
// and settle as you scroll to the end of the page, left to right: faint first, then solid.
// Letters sit on a 100-unit cap height; strokes are 14 wide, butt-capped.
const STROKE = 14, GAP = 16;

// Each letter: its advance width and its pieces as SVG path data, drawn from x = 0.
const LETTERS = {
  A: [80, ['M0 100 L40 0 L80 100', 'M18 64 H62']],
  d: [70, ['M63 65 A28 28 0 0 0 7 65', 'M7 65 A28 28 0 0 0 63 65', 'M63 0 V100']],
  r: [52, ['M7 30 V100', 'M7 65 A28 28 0 0 1 35 37 H52']],
  i: [14, ['M7 0 V14', 'M7 30 V100']],
  a: [70, ['M63 65 A28 28 0 0 0 7 65', 'M7 65 A28 28 0 0 0 63 65', 'M63 30 V100']],
  n: [66, ['M7 30 V100', 'M7 65 A26 26 0 0 1 59 65', 'M59 65 V100']],
  '.': [14, ['M7 86 V100']],
  P: [66, ['M7 0 V100', 'M7 7 H33 A26 26 0 0 1 33 59 H7']],
  u: [66, ['M7 30 V65', 'M7 65 A26 26 0 0 0 59 65', 'M59 30 V100']],
  k: [60, ['M7 0 V100', 'M56 30 L12 72', 'M27 58 L58 100']],
};

const NS = 'http://www.w3.org/2000/svg';
const ease = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (v) => Math.min(1, Math.max(0, v));

export function initWordmark(svg, text = 'Adrian.Punk') {
  let x = 0;
  const pieces = [];
  for (const ch of text) {
    const [w, paths] = LETTERS[ch];
    paths.forEach((d, k) => {
      const g = document.createElementNS(NS, 'g'), p = document.createElementNS(NS, 'path');
      g.setAttribute('transform', `translate(${x} 0)`); // the letter's place; the path's own transform is the motion
      p.setAttribute('d', d);
      if (ch === '.') p.classList.add('wm-dot'); // the dot is a blue square
      g.appendChild(p);
      svg.appendChild(g);
      // where it comes in from: alternately from below and above, a little to the right
      pieces.push({ p, x, len: p.getTotalLength(), dx: 18 + (k % 2) * 10, dy: (pieces.length % 2 ? -1 : 1) * 46 });
    });
    x += w + GAP;
  }
  const width = x - GAP;
  svg.setAttribute('viewBox', `-${STROKE / 2} -${STROKE / 2} ${width + STROKE} ${100 + STROKE}`);
  svg.style.setProperty('--stroke', STROKE);
  pieces.forEach((it) => { it.start = (it.x / width) * 0.6; it.p.style.strokeDasharray = it.len; });

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The scroll sets where it should be; each frame eases toward it, so wheel steps don't make it jump.
  let target = 0, shown = -1, raf = 0;
  const read = () => {
    // 0 as the mark's top comes up into view, 1 when the page is scrolled to the very end (the footer is pinned meanwhile)
    const r = svg.getBoundingClientRect();
    const seen = innerHeight - r.top, left = document.documentElement.scrollHeight - innerHeight - scrollY;
    target = still ? 1 : clamp(seen / Math.max(1, seen + left));
    if (!raf) raf = requestAnimationFrame(draw);
  };
  const draw = () => {
    raf = 0;
    shown = shown < 0 ? target : shown + (target - shown) * 0.14;
    if (Math.abs(target - shown) < 0.0005) shown = target;
    else raf = requestAnimationFrame(draw);
    for (const it of pieces) {
      const t = clamp((shown - it.start) / 0.4), e = ease(t);
      it.p.style.strokeDashoffset = (it.len * (1 - e)).toFixed(1);
      it.p.style.transform = `translate(${(it.dx * (1 - e)).toFixed(2)}px, ${(it.dy * (1 - e)).toFixed(2)}px)`;
      it.p.style.opacity = t > 0 ? (0.25 + 0.75 * ease(clamp((t - 0.55) / 0.45))).toFixed(3) : 0; // faint while it travels
    }
  };
  addEventListener('scroll', read, { passive: true });
  addEventListener('resize', read);
  read();
}
