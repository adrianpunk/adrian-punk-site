import { journey, shelves, tools, parlour, links, wechat } from './content.js';
import { face } from './face.js';
import { createLine } from './line.js';
import { initWordmark } from './wordmark.js';
import { initBook } from './book.js';
import { createTable } from './table.js';

const BASE = import.meta.env.BASE_URL;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ext = 'target="_blank" rel="noopener noreferrer"';
const $ = (id) => document.getElementById(id);

export function renderContent() {
  initBook({ book: $('book'), tabs: $('bookTabs'), prev: $('bookPrev'), next: $('bookNext'), caption: $('bookCap') }, shelves, BASE);
  renderJourney();

  // The two ways to meet, as two tickets (one blue, one white): a black-and-white picture, the name pressed
  // into the card on an uneven Swiss grid, then a stub with the price and a barcode.
  $('rates').innerHTML = parlour.map((p) => `
    <li class="ticket t-${p.tone} reveal">
      <figure class="t-pic"><img src="${BASE}${p.pic}" alt="" loading="lazy" /></figure>
      <div class="t-main">
        <p class="t-top"><span>Adrian.Punk®</span><span>Chat</span></p>
        <h3>${p.name.split(' ').map(esc).join('<br>')}</h3>
        <p class="t-zh">${esc(p.zh)}</p>
        <dl><div><dt>Mode</dt><dd>${esc(p.mode)}</dd></div><div><dt>Length</dt><dd>60 min</dd></div><div><dt>Booking</dt><dd>微信预约</dd></div></dl>
        <span class="t-no" aria-hidden="true">${p.no}</span>
      </div>
      <div class="t-stub">
        <p class="t-vert">Admit one · No.${p.no}</p>
        <b>¥${p.price}</b>
        <span class="barcode" aria-hidden="true"></span>
        <small>N° 0${p.price}/${p.no}</small>
      </div>
    </li>`).join('');

  renderTools();
  createTable($('tableCanvas'));

  $('links').innerHTML = links.map((l) => `<li><a href="${l.href}" ${ext}><span>${esc(l.label)}</span><b>${esc(l.handle)}</b></a></li>`).join('') +
    `<li><a href="https://aftno.com/" ${ext}><span>社群</span><b>AfterNoise</b></a></li>` +
    `<li><button type="button" data-copy="${wechat}"><span>微信</span><b>${wechat}</b></button></li>`;

  // Anything with data-copy puts its text on the clipboard (the WeChat ID).
  const toast = $('toast');
  let hide = 0;
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-copy]');
    if (!el) return;
    try { await navigator.clipboard.writeText(el.dataset.copy); toast.textContent = `已复制微信号 ${el.dataset.copy}`; }
    catch { toast.textContent = `微信号 ${el.dataset.copy}`; }
    toast.classList.add('is-on');
    clearTimeout(hide);
    hide = setTimeout(() => toast.classList.remove('is-on'), 2200);
  });

  initWordmark($('wordmark'));
  initFaceHover();
}

// Big words in staggered rows, nothing else. Pointing at (or tapping) one opens its picture
// in the line, with a few words under it. As the section scrolls past, the rows drift sideways.
const INDENT = [0.42, 0.06, 0.3, 0.5, 0.14, 0.36]; // each row's start, as a share of the spare width
function renderJourney() {
  const rows = $('journeyRows'), section = $('journey');
  rows.innerHTML = journey.map((j) => {
    const note = `<small>${j.tail ? `<b>${esc(j.tail)}</b> ` : ''}${esc(j.note)}</small>`;
    const img = `<img src="${BASE}${j.photo}" alt="" loading="lazy" />`;
    return `<li>
      <button type="button">${esc(j.word)}</button>
      <span class="journey-pic">${j.href ? `<a href="${j.href}" ${ext} aria-label="${esc(j.word)}" tabindex="-1">${img}</a>` : img}${note}</span>
    </li>`;
  }).join('');
  const lis = [...rows.children];
  const open = (li) => lis.forEach((l) => l.toggleAttribute('data-on', l === li));
  lis.forEach((li) => {
    li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') open(li); });
    li.querySelector('button').addEventListener('click', () => open(li.hasAttribute('data-on') && matchMedia('(hover: none)').matches ? null : li));
    li.querySelector('button').addEventListener('focus', () => open(li));
  });
  rows.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') open(null); });
  // The rows are placed as if every picture were open, so they don't jump about.
  const place = () => {
    const spare = rows.clientWidth, em = parseFloat(getComputedStyle(lis[0]).fontSize);
    lis.forEach((li, i) => {
      const full = li.querySelector('button').offsetWidth + em * 1.9;
      li.style.setProperty('--x', `${Math.max(0, spare - full) * INDENT[i % INDENT.length]}px`);
    });
  };
  const onScroll = () => {
    const r = section.getBoundingClientRect();
    const t = (innerHeight - r.top) / (innerHeight + r.height) - 0.5; // -0.5 .. 0.5 while on screen
    section.style.setProperty('--drift', t.toFixed(3));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { place(); onScroll(); });
  document.fonts?.ready.then(place);
  place();
  onScroll();
}

// Hovering a tool puts its number on the companion's face.
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

// A list on the left, the production line on the right: pointing at (or tapping) a tool,
// or clicking its machine, lights that machine up; the word on the right of each row opens the tool.
function renderTools() {
  const root = $('toolPick');
  root.innerHTML = `
    <ol class="pick-list">${tools.map((t, i) => `
      <li><button type="button" data-i="${i}" data-glyph="${t.code.replace('AP-', '')}"><b>${esc(t.title)}</b><small>${esc(t.short)}</small></button><a class="pick-tag" href="${t.href}" ${ext} title="打开 ${esc(t.title)}">${esc(t.tag)}</a></li>`).join('')}</ol>
    <figure class="line"><div class="line-box"><canvas aria-label="四台机器组成的生产线：一篇稿子依次变成封面、IP 插图、小红书卡片和公众号文章"></canvas></div></figure>`;
  const rows = [...root.querySelectorAll('.pick-list button')];
  const line = createLine(root.querySelector('canvas'), tools.map((t) => t.code.replace('AP-', '')));
  let now = -1;
  const show = (i) => {
    if (i === now) return;
    now = i;
    rows.forEach((b, j) => b.setAttribute('aria-current', j === i));
    line.focus(i);
  };
  rows.forEach((b, i) => {
    b.addEventListener('pointerenter', () => show(i));
    b.addEventListener('focus', () => show(i));
    b.addEventListener('click', () => show(i));
  });
  line.onPick(show);
  show(0);
}
