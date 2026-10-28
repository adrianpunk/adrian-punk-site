import { doors, credits, tools, sessions, parlour, links } from './content.js';
import { face } from './face.js';

const BASE = import.meta.env.BASE_URL;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ext = 'target="_blank" rel="noopener noreferrer"';
const $ = (id) => document.getElementById(id);
const two = (n) => String(n).padStart(2, '0');
const wide = matchMedia('(min-width: 901px)');

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'design', label: '设计提示词' },
  { id: 'tutorial', label: '小白教程' },
];

// X post ids are snowflakes: the top bits are a millisecond timestamp.
const postDate = (href) => {
  const id = href.match(/status\/(\d+)/)?.[1];
  if (!id) return '';
  const d = new Date(Number(BigInt(id) >> 22n) + 1288834974657);
  return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}`;
};

export function renderContent() {
  $('credits').innerHTML = credits.map((c) => `
    <li class="reveal"><span class="no micro">${c.no}</span><b>${esc(c.title)}<small>${esc(c.en)}</small></b><span>${esc(c.role)}</span></li>`).join('');

  // Each tool is a channel on a small mixing desk: push the fader (hover) and it plays.
  $('shelf').innerHTML = tools.map((t, i) => `
    <li class="strip" style="--lvl:${[0.38, 0.52, 0.3, 0.45][i % 4]}"><a href="${t.href}" ${ext} data-glyph="${two(i + 1)}">
      <span class="ch micro"><span>CH ${two(i + 1)}</span><i></i></span>
      <span class="knob" aria-hidden="true"></span>
      <span class="bay" aria-hidden="true"><span class="meter"><span class="lvl"></span></span><span class="fader"><span class="cap"></span></span></span>
      <span class="scribble"><b>${esc(t.title)}</b><small>${esc(t.short)}</small></span>
      <span class="open micro">Open ↗</span>
    </a></li>`).join('');

  $('filters').innerHTML = CATEGORIES.map((c, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-cat="${c.id}">${c.label}</button>`).join('');
  $('filters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    $('filters').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b === btn));
    renderSessions(btn.dataset.cat);
  });
  renderSessions('all');

  $('rates').innerHTML = parlour.map((p) => `
    <li class="reveal">
      <h3><small class="micro">No. ${p.no} · ${esc(p.name)}</small>${esc(p.zh)}</h3>
      <p>${p.topics.map(esc).join(' · ')}</p>
      <span class="price">¥${p.price}<span> / 小时</span></span>
    </li>`).join('');

  $('links').innerHTML = links.map((l) => `<li><a href="${l.href}" ${ext}><span class="micro">${esc(l.label)}</span><b>${esc(l.handle)}</b><span class="arr">↗</span></a></li>`).join('') +
    `<li><button type="button" data-qr><span class="micro">微信</span><b>扫码添加</b><span class="arr">→</span></button></li>`;

  // The end of every page leads back into the corridor: to the same door, or on to the next one.
  doors.forEach((d, i) => {
    const next = doors[i + 1];
    const nav = document.createElement('nav');
    nav.className = 'page-end micro';
    nav.dataset.for = d.section;
    nav.hidden = true;
    nav.innerHTML = `<button type="button" data-back>← 回到走廊</button>` +
      (next ? `<button type="button" data-back="${i + 1}">下一扇门 · ${next.no} ${next.name} →</button>` : '');
    $(d.section).after(nav); // outside the section, so Writing's pinned strip can't cover it
  });

  const qr = $('qr');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-qr]')) qr.showModal();
    else if (e.target.closest('[data-close]') || e.target === qr) qr.close();
  });

  initFaceHover();
  initCrate();
  initBadge();
}

function renderSessions(cat) {
  const list = sessions.filter((s) => cat === 'all' || s.category === cat);
  $('trackRow').innerHTML = list.map((s) => {
    const n = two(sessions.indexOf(s) + 1);
    return `
    <li class="session"><a href="${s.href}" ${ext} data-glyph="${n}">
      <span class="cover"><img src="${BASE}${s.cover}" alt="" loading="lazy" /><span class="num">${n}</span></span>
      <span class="meta micro"><span>${esc(s.meta)}</span><span>${postDate(s.href)}</span></span>
      <h3>${esc(s.title)}</h3>
    </a></li>`;
  }).join('');
  $('crateTotal').textContent = two(list.length);
  layoutCrate?.();
}

// Hovering a tool or a session puts its number on the companion's face.
function initFaceHover() {
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-glyph]');
    face.glyph = el ? el.dataset.glyph : null;
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest('[data-glyph]');
    face.glyph = el ? el.dataset.glyph : null;
  });
}

// Side B is pinned while vertical scroll slides the sessions sideways (twice as far as you scroll).
const SLIDE = 0.5;
let layoutCrate = null;
// Called when the Writing page opens: it can only be measured while it's shown.
export const refreshCrate = () => layoutCrate?.();
function initCrate() {
  const section = $('sessions'), row = $('trackRow');
  let distance = 0;
  layoutCrate = () => {
    if (!wide.matches) { section.style.height = ''; return; }
    // offsetLeft ignores the current translate, so this is stable mid-scroll.
    distance = Math.max(0, row.scrollWidth - (innerWidth - row.offsetLeft) + 56);
    section.style.height = `${innerHeight + distance * SLIDE}px`;
    onScroll();
  };
  const onScroll = () => {
    if (!wide.matches) return;
    const t = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / Math.max(1, distance * SLIDE)));
    row.style.transform = `translate3d(${-t * distance}px,0,0)`;
    const cards = row.children;
    if (cards.length) $('crateNow').textContent = two(Math.min(cards.length, Math.floor(t * (cards.length - 1) + 1.5)));
  };
  $('pages').addEventListener('scroll', onScroll, { passive: true }); // pages scroll inside their own layer
  addEventListener('resize', layoutCrate);
  wide.addEventListener('change', layoutCrate);
  new ResizeObserver(() => layoutCrate()).observe(row); // cards may size after styles/fonts settle
  document.fonts?.ready.then(layoutCrate);
  layoutCrate();
}

// The contact page: a work badge on a lanyard drops in from the top, swings, and settles.
// Drag it and it swings again. A spring for the drop, a damped pendulum for the swing.
let dropBadge = () => {};
export { dropBadge };
function initBadge() {
  const el = $('badge');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let y = 0, vy = 0, a = 0, va = 0, raf = 0, last = 0, drag = null;
  const paint = () => { el.style.transform = `translate3d(-50%, ${y}px, 0) rotate(${a}rad)`; };
  const step = (now) => {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!drag) {
      vy += (-170 * y - 13 * vy) * dt; // spring back to the hook
      y += vy * dt;
      va += (-16 * Math.sin(a) - 1.1 * va) * dt; // pendulum
      a += va * dt;
    }
    paint();
    const still = !drag && Math.abs(y) + Math.abs(vy) < 0.5 && Math.abs(a) + Math.abs(va) < 0.002;
    raf = still ? 0 : requestAnimationFrame(step);
    if (still) { y = 0; a = 0; paint(); }
  };
  const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
  dropBadge = () => {
    if (reduce.matches) { y = 0; a = 0; paint(); return; }
    y = -innerHeight * 1.1; vy = 0; a = (Math.random() < 0.5 ? -1 : 1) * 0.18; va = 0;
    paint();
    run();
  };
  // The pivot is the top of the lanyard (the top edge of the screen).
  const angleTo = (e) => {
    const r = el.getBoundingClientRect();
    return Math.atan2(-(e.clientX - (r.left + r.width / 2)), e.clientY - el.parentElement.getBoundingClientRect().top + 1) ;
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button')) return;
    drag = { id: e.pointerId, a0: a, p0: angleTo(e), t: performance.now() };
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-drag');
    run();
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const next = Math.max(-0.9, Math.min(0.9, drag.a0 + (angleTo(e) - drag.p0)));
    const now = performance.now();
    va = (next - a) / Math.max(0.008, (now - drag.t) / 1000);
    drag.t = now;
    a = next;
  });
  const release = () => { if (!drag) return; drag = null; el.classList.remove('is-drag'); va = Math.max(-6, Math.min(6, va)); run(); };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}
