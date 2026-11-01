import { categories } from './content.js';
import { mountChrome } from './chrome.js';

// The articles page, on one grid: every row has a label on the left (it stays in view while the row scrolls)
// and its content on the right, so all the edges line up. The All tab has a row per category, listing its
// modules as pictures that open them;
// a category has a row per module with a reading list; a `covers` category drops the left column and spreads its covers
// across the full width.
const root = document.documentElement.dataset.root;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const size = (m) => m.posts.filter(Array.isArray).length;
const total = (c) => c.modules.reduce((n, m) => n + size(m), 0);
const coverOf = (id) => `${root}works/book/${id}.webp`;
const postUrl = (status) => `https://x.com/AdrianPunk115/status/${status}`;
const ARTICLE = 'target="_blank" rel="noopener noreferrer"';

mountChrome({ root, home: false });

const tabs = document.getElementById('blogTabs');
const list = document.getElementById('blogCats');
const all = categories.reduce((n, c) => n + total(c), 0);

// The heatmap beside the title: one cell per article, most-viewed first, in five steps of the blue.
const views = (p) => parseFloat(p[3]);
const everyPost = categories.flatMap((c) => c.modules.flatMap((m) => m.posts.filter(Array.isArray))).sort((a, b) => views(b) - views(a));
const map = document.getElementById('tutorialMap');
const summary = `${all} 篇文章 · ${categories.reduce((n, c) => n + c.modules.length, 0)} 个模块 · ${Math.round(everyPost.reduce((n, p) => n + views(p), 0))} 万浏览`;
map.innerHTML = `
  <div class="heat">${everyPost.map((p, n) =>
    `<a class="h${4 - Math.floor((n / everyPost.length) * 5)}" href="${postUrl(p[1])}" ${ARTICLE} data-tip="${esc(p[0])} · ${esc(p[3])}浏览" aria-label="${esc(p[0])}"></a>`).join('')}</div>
  <p class="heat-foot"><span aria-live="polite">${summary}</span><i aria-hidden="true"><b class="h0"></b><b class="h1"></b><b class="h2"></b><b class="h3"></b><b class="h4"></b></i></p>`;
const tip = map.querySelector('.heat-foot span');
map.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-tip]'); tip.textContent = a ? a.dataset.tip : summary; tip.classList.toggle('is-on', !!a); });
map.addEventListener('pointerleave', () => { tip.textContent = summary; tip.classList.remove('is-on'); });

tabs.innerHTML = `<button type="button" data-i="0">All<sup>${all}</sup></button>` +
  categories.map((c, i) => `<button type="button" data-i="${i + 1}">${esc(c.name)}<sup>${total(c)}</sup></button>`).join('');

// A reading list, in blocks: each subheading starts a new one, and the numbering with it.
function reading(posts) {
  const blocks = [];
  for (const p of posts) {
    if (!Array.isArray(p)) blocks.push({ title: p, posts: [] });
    else { if (!blocks.length) blocks.push({ posts: [] }); blocks.at(-1).posts.push(p); }
  }
  return blocks.map((b) => `<div class="block">${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<ol>${b.posts.map((p, n) =>
    `<li><a href="${postUrl(p[1])}" ${ARTICLE} data-cover="${coverOf(p[2])}"><small>${pad(n + 1)}</small><span>${esc(p[0])}</span><i aria-hidden="true">↗</i></a></li>`).join('')}</ol></div>`).join('');
}

const shelf = (m) => `<div class="covers">${m.posts.map(([title, status, id]) =>
  `<a href="${postUrl(status)}" ${ARTICLE} title="${esc(title)}" aria-label="${esc(title)}"><img src="${coverOf(id)}" alt="" width="1600" height="640" loading="lazy" /></a>`).join('')}</div>`;

const moduleCover = (m) => m.cover || m.posts.find(Array.isArray)[2];
const moduleRow = (c, m, k) => {
  const cover = c.covers ? '' : `<img src="${coverOf(moduleCover(m))}" alt="" width="1600" height="640" loading="lazy" />`;
  return `
    <section class="row" data-mod="${k}">
      <header class="row-label">${cover}<h3>${esc(m.title)}</h3><p>${size(m)} 篇</p></header>
      <div class="row-body">${c.covers ? shelf(m) : reading(m.posts)}</div>
    </section>`;
};

list.innerHTML = `
  <div class="view" data-i="0">${categories.map((c, n) => `
    <section class="row">
      <header class="row-label"><button type="button" class="cat-link" data-open="${n + 1}"><b>${esc(c.name)}</b><small>${c.modules.length} 个模块 · ${total(c)} 篇</small></button></header>
      <div class="row-body mods">${c.modules.map((m, k) => `
        <button type="button" class="mod" data-open="${n + 1}" data-mod="${k}">
          <img src="${coverOf(moduleCover(m))}" alt="" width="1600" height="640" loading="lazy" />
          <span><b>${esc(m.title)}</b><small>${size(m)} 篇</small></span>
        </button>`).join('')}
      </div>
    </section>`).join('')}
  </div>` + categories.map((c, n) => `
  <div class="view${c.covers ? ' is-spread' : ''}" data-i="${n + 1}">
    <h2 class="view-title">${esc(c.name)}</h2>
    ${c.modules.map((m, k) => moduleRow(c, m, k)).join('')}
  </div>`).join('');

function show(i) {
  [...tabs.children].forEach((b) => b.setAttribute('aria-current', +b.dataset.i === i));
  list.querySelectorAll('.view').forEach((v) => { v.hidden = +v.dataset.i !== i; });
}
tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) show(+b.dataset.i); });
list.addEventListener('click', (e) => {
  const door = e.target.closest('[data-open]');
  if (!door) return;
  show(+door.dataset.open);
  // a module opens its category at that module's row; a category name, at the top
  const target = door.dataset.mod && list.querySelector(`.view[data-i="${door.dataset.open}"] .row[data-mod="${door.dataset.mod}"]`);
  (target || tabs).scrollIntoView();
});
show(0);

// Pointing at an article in a list shows its cover at the right end of its row.
if (matchMedia('(hover: hover)').matches) {
  const peek = document.createElement('img');
  peek.className = 'peek';
  peek.alt = '';
  document.body.append(peek);
  const hide = () => peek.classList.remove('is-on');
  const point = (row) => {
    peek.src = row.dataset.cover;
    const r = row.getBoundingClientRect(), h = peek.offsetHeight, gap = 8;
    peek.style.left = `${r.right - peek.offsetWidth}px`;
    peek.style.top = `${Math.max(gap, Math.min(innerHeight - h - gap, r.top + r.height / 2 - h / 2))}px`;
    peek.classList.add('is-on');
  };
  list.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-cover]'); if (a) point(a); else hide(); });
  list.addEventListener('pointerleave', hide);
  list.addEventListener('focusin', (e) => { const a = e.target.closest('[data-cover]'); if (a) point(a); });
  list.addEventListener('focusout', hide);
  addEventListener('scroll', hide, { passive: true });
}
