import { credits, tools, sessions, parlour, links } from './content.js';
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

  // Each tool is a small machine: what goes in, the steps, what comes out.
  $('shelf').innerHTML = tools.map((t, i) => `
    <li class="tool reveal ${i % 2 ? 'd1' : ''}"><a href="${t.href}" ${ext} data-glyph="${two(i + 1)}">
      <span class="tool-top micro"><span>${t.code}</span><span>${esc(t.role)}</span><i></i></span>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.copy)}</p>
      <ol class="flow micro">${t.demo.split('→').map((step, n) => `<li style="--i:${n}">${esc(step.trim())}</li>`).join('')}</ol>
      <span class="tool-foot micro"><span>${t.scenes.map(esc).join(' / ')}</span><span class="arr">Open ↗</span></span>
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

  $('links').innerHTML = links.map((l) => `<li class="reveal"><a href="${l.href}" ${ext}><span class="micro">${esc(l.label)}</span><b>${esc(l.handle)}</b><span class="arr">↗</span></a></li>`).join('') +
    `<li class="reveal"><button type="button" data-qr><span class="micro">微信</span><b>扫码添加</b><span class="arr">→</span></button></li>`;

  const qr = $('qr');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-qr]')) qr.showModal();
    else if (e.target.closest('[data-close]') || e.target === qr) qr.close();
  });

  initFaceHover();
  initSections();
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

// Whichever section crosses the middle of the screen sets the page colour and the companion's mood.
function initSections() {
  const root = document.documentElement;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      face.section = el.dataset.face;
      root.style.setProperty('--sec-bg', el.dataset.bg);
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('[data-face]').forEach((el) => io.observe(el));
}

// Side B is pinned while vertical scroll slides the sessions sideways (twice as far as you scroll).
const SLIDE = 0.5;
let layoutCrate = null;
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
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', layoutCrate);
  wide.addEventListener('change', layoutCrate);
  new ResizeObserver(() => layoutCrate()).observe(row); // cards may size after styles/fonts settle
  document.fonts?.ready.then(layoutCrate);
  layoutCrate();
}
