import { credits, tools, sessions, parlour, links } from './content.js';

const BASE = import.meta.env.BASE_URL;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ext = 'target="_blank" rel="noopener noreferrer"';
const $ = (id) => document.getElementById(id);

const FIRST_SESSIONS = 8;
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
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// Everything the viewfinder can frame, in page order.
const shots = [
  ...tools.map((t) => ({ img: `${BASE}${t.tape}`, code: t.code, meta: t.role })),
  ...sessions.map((s, i) => ({ img: `${BASE}${s.cover}`, code: `${String(i + 1).padStart(2, '0')}A · ${postDate(s.href)}`, meta: s.meta })),
];

export function renderContent() {
  $('credits').innerHTML = credits.map((c) => `
    <li class="reveal"><span class="no micro">${c.no}</span><b>${esc(c.title)}</b><span>${esc(c.role)}</span></li>`).join('');

  $('tools').innerHTML = tools.map((t, i) => `
    <li><a href="${t.href}" ${ext} data-shot="${i}">
      <span class="k micro">${t.code}</span>
      <span class="t"><img class="thumb tape" src="${BASE}${t.tape}" alt="" loading="lazy" />${esc(t.title)}<small>${esc(t.copy)}</small></span>
      <span class="x">↗</span>
    </a></li>`).join('');

  $('filters').innerHTML = CATEGORIES.map((c, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-cat="${c.id}">${c.label}</button>`).join('');
  let cat = 'all', all = false;
  const draw = () => renderSessions(cat, all);
  $('filters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    $('filters').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b === btn));
    cat = btn.dataset.cat;
    all = false;
    draw();
  });
  $('moreSessions').addEventListener('click', () => { all = true; draw(); });
  draw();

  $('rates').innerHTML = parlour.map((p) => `
    <li class="reveal">
      <span class="k micro">No. ${p.no}</span>
      <h3>${esc(p.zh)}<small class="micro">${esc(p.name)}</small></h3>
      <p>${p.topics.map(esc).join(' · ')}</p>
      <span class="price">¥${p.price}<span> / 小时</span></span>
    </li>`).join('');

  $('links').innerHTML = links.map((l) => `<li><a class="u" href="${l.href}" ${ext}><span>${esc(l.label)}</span><b>${esc(l.handle)}</b></a></li>`).join('') +
    `<li><button class="u" type="button" data-qr><span>微信</span><b>扫码添加</b></button></li>`;

  const qr = $('qr');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-qr]')) qr.showModal();
    else if (e.target.closest('[data-close]') || e.target === qr) qr.close();
  });

  initViewfinder();
}

function renderSessions(cat, all) {
  const list = sessions.filter((s) => cat === 'all' || s.category === cat);
  const shown = all ? list : list.slice(0, FIRST_SESSIONS);
  $('sessions').innerHTML = shown.map((s) => {
    const i = sessions.indexOf(s);
    return `
    <li><a href="${s.href}" ${ext} data-shot="${tools.length + i}">
      <span class="k micro">${postDate(s.href).slice(2)}</span>
      <span class="t">${esc(s.title)}<img class="thumb" src="${BASE}${s.cover}" alt="" loading="lazy" /></span>
      <span class="x">↗</span>
    </a></li>`;
  }).join('');
  $('moreSessions').hidden = shown.length >= list.length;
  $('moreSessions').textContent = `Show all ${list.length}`;
}

// One sticky frame frames whatever row you point at: a quick defocus, then the new shot snaps sharp.
function initViewfinder() {
  const frame = $('vfFrame'), img = $('vfImg');
  let current = -1, timer = 0;
  const show = (i) => {
    if (i === current) return;
    current = i;
    const s = shots[i];
    document.querySelectorAll('.rows a.is-active').forEach((a) => a.classList.remove('is-active'));
    document.querySelector(`.rows a[data-shot="${i}"]`)?.classList.add('is-active');
    frame.classList.add('is-focusing');
    clearTimeout(timer);
    timer = setTimeout(() => {
      img.src = s.img;
      $('vfCode').textContent = s.code;
      $('vfMeta').textContent = s.meta;
      $('vfCount').textContent = `${String(i + 1).padStart(2, '0')} / ${shots.length}`;
      const done = () => frame.classList.remove('is-focusing');
      if (img.complete) requestAnimationFrame(done); else img.onload = done;
    }, 160);
  };
  document.querySelector('.index-lists').addEventListener('pointerover', (e) => {
    const a = e.target.closest('a[data-shot]');
    if (a) show(+a.dataset.shot);
  });
  document.querySelector('.index-lists').addEventListener('focusin', (e) => {
    const a = e.target.closest('a[data-shot]');
    if (a) show(+a.dataset.shot);
  });
  show(0);
}
