import { doors, sessions, parlour } from './content.js';
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

  // The end of each page leads back into the corridor: to the same door, or on to the next stop
  // (after the last door, the projection at the end).
  doors.forEach((d, i) => {
    if (!$(d.section)) return; // About and Tools have no page
    const next = doors[i + 1];
    const nav = document.createElement('nav');
    nav.className = 'page-end micro';
    nav.dataset.for = d.section;
    nav.hidden = true;
    nav.innerHTML = `<button type="button" data-back>← 回到走廊</button>` +
      `<button type="button" data-back="${i + 1}">${next ? `下一扇门 · ${next.no} ${next.name}` : '走到尽头 · Contact'} →</button>`;
    $(d.section).after(nav); // outside the section, so Writing's pinned strip can't cover it
  });

  const qr = $('qr');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-qr]')) qr.showModal();
    else if (e.target.closest('[data-close]') || e.target === qr) qr.close();
  });

  initFaceHover();
  initCrate();
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
