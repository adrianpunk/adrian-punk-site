import { credits, tools, sessions, parlour, links } from './content.js';

const BASE = import.meta.env.BASE_URL;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ext = 'target="_blank" rel="noopener noreferrer"';
const $ = (id) => document.getElementById(id);

const FIRST_SESSIONS = 12;
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'design', label: '设计提示词' },
  { id: 'tutorial', label: '小白教程' },
];

export function renderContent() {
  $('credits').innerHTML = credits.map((c, i) => `
    <li class="credit reveal ${i % 2 ? 'd1' : ''}">
      <span class="no micro">${c.no}</span>
      <div class="who"><h3>${esc(c.title)}</h3><p class="micro">${esc(c.role)}</p></div>
      <p class="story">${esc(c.story)}</p>
      <p class="tags micro">${c.tags.map(esc).join(' / ')}</p>
    </li>`).join('');

  $('tracklist').innerHTML = tools.map((t) => `
    <li class="track reveal" data-tape="${BASE}${t.tape}">
      <a href="${t.href}" ${ext}>
        <span class="code micro">${t.code}</span>
        <span class="title">${esc(t.title)}</span>
        <span class="role micro">${esc(t.role)}</span>
        <span class="go micro">Open ↗</span>
        <span class="detail">
          <img class="tape-inline" src="${BASE}${t.tape}" alt="${esc(t.title)} 录像带封面" loading="lazy" />
          <span class="copy">${esc(t.copy)}</span>
          <span class="demo micro">${esc(t.demo)}</span>
          <span class="scenes">${t.scenes.map((s) => `<i>${esc(s)}</i>`).join('')}</span>
        </span>
      </a>
    </li>`).join('');

  renderSessions('all', false);
  $('filters').innerHTML = CATEGORIES.map((c, i) => {
    const n = c.id === 'all' ? sessions.length : sessions.filter((s) => s.category === c.id).length;
    return `<button type="button" role="tab" aria-selected="${i === 0}" data-cat="${c.id}">${c.label} <sup>${n}</sup></button>`;
  }).join('');
  $('filters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    $('filters').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b === btn));
    renderSessions(btn.dataset.cat, false);
  });
  $('moreSessions').addEventListener('click', () => {
    const cat = $('filters').querySelector('[aria-selected="true"]')?.dataset.cat || 'all';
    renderSessions(cat, true);
  });

  $('tickets').innerHTML = parlour.map((p, i) => `
    <article class="ticket reveal ${i ? 'd1' : ''}">
      <div class="stub micro"><span>No. ${p.no}</span><span>Admit one</span></div>
      <div class="body">
        <p class="micro name">${esc(p.name)}</p>
        <h3>${esc(p.zh)}</h3>
        <p class="price"><b>¥${p.price}</b><span class="micro"> / 小时</span></p>
        <ul>${p.topics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <button class="book micro" type="button" data-qr>微信预约 →</button>
      </div>
    </article>`).join('');

  $('links').innerHTML = links.map((l) => `
    <li class="reveal"><a href="${l.href}" ${ext}><span class="micro">${esc(l.label)}</span><b>${esc(l.handle)}</b><span class="arr">↗</span></a></li>`).join('') +
    `<li class="reveal"><button type="button" data-qr><span class="micro">微信</span><b>扫码添加</b><span class="arr">→</span></button></li>`;

  // WeChat QR dialog, opened from the tickets and the links.
  const qr = $('qr');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-qr]')) qr.showModal();
    else if (e.target.closest('[data-close]') || e.target === qr) qr.close();
  });

  initTapeFloat();
}

function renderSessions(cat, all) {
  const list = sessions.filter((s) => cat === 'all' || s.category === cat);
  const shown = all ? list : list.slice(0, FIRST_SESSIONS);
  $('sheet').innerHTML = shown.map((s, i) => `
    <a class="frame ${i === 0 && cat === 'all' ? 'is-new' : ''}" href="${s.href}" ${ext}>
      <span class="strip"><img src="${BASE}${s.cover}" alt="" loading="lazy" /></span>
      <span class="cap"><span class="micro">${String(sessions.indexOf(s) + 1).padStart(2, '0')}A ▸ ${esc(s.meta)}</span><b>${esc(s.title)}</b></span>
    </a>`).join('');
  $('moreSessions').hidden = shown.length >= list.length;
}

// On pointer devices the tape cassette floats beside the cursor while hovering a track.
function initTapeFloat() {
  const float = $('tapeFloat');
  if (!matchMedia('(pointer: fine)').matches) return;
  let x = 0, y = 0, raf = 0;
  const place = () => { raf = 0; float.style.transform = `translate(${x + 28}px, ${y - 120}px) rotate(-6deg)`; };
  $('tracklist').addEventListener('pointerover', (e) => {
    const track = e.target.closest('.track');
    if (!track) return;
    if (float.getAttribute('src') !== track.dataset.tape) float.src = track.dataset.tape;
    float.classList.add('is-on');
  });
  $('tracklist').addEventListener('pointerleave', () => float.classList.remove('is-on'));
  addEventListener('scroll', () => float.classList.remove('is-on'), { passive: true });
  $('tracklist').addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(place);
  }, { passive: true });
}
