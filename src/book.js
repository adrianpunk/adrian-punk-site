// The works as a book: every cover is folded down the middle, its left half on the left page and
// its right half on the right. Turning a leaf swings the right half over the spine, and its back is
// the left half of the next cover. Tutorials come first, then prompts. Click either side of the
// book, swipe, use the arrows or the keys; the shelf names jump straight to a shelf's first cover.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ext = 'target="_blank" rel="noopener noreferrer"';
const pad = (n) => String(n).padStart(2, '0');
const NEAR = 3; // covers this many turns away get their pictures loaded

export function initBook({ book, tabs, prev, next, caption }, shelves, base) {
  const all = shelves.flatMap((s, si) => s.items.map((w, i) => ({ ...w, si, no: i + 1 })));
  let at = 0, timer = 0;

  // One half of cover k: the whole cover sits inside at double width, and the page shows its left or right half.
  const half = (k, side) => {
    const w = all[k];
    const art = w.cover
      ? `<img data-src="${base}${w.cover}" alt="" />`
      : `<div class="set-cover"><small>${shelves[w.si].name}</small><b>${esc(w.title)}</b><span>Adrian.Punk</span></div>`;
    return `<div class="half ${side}" data-k="${k}">${art}</div>`;
  };
  let html = `<div class="book-base left">${half(0, 'l')}</div><div class="book-base right">${half(all.length - 1, 'r')}</div>`;
  for (let k = 0; k < all.length - 1; k++) html += `<div class="leaf"><div class="face front">${half(k, 'r')}</div><div class="face back">${half(k + 1, 'l')}</div></div>`;
  book.innerHTML = html;
  const leaves = [...book.querySelectorAll('.leaf')];
  const imgs = [...book.querySelectorAll('img[data-src]')];
  tabs.innerHTML = shelves.map((s, si) => `<button type="button" data-shelf="${si}">${s.name}<sup>${s.items.length}</sup></button>`).join('');

  // Turned leaves pile up on the left, the last one turned on top; the rest on the right, the next one on top.
  const stack = () => leaves.forEach((l, i) => { if (!l.classList.contains('is-moving')) l.style.zIndex = i < at ? i + 1 : leaves.length - i; });

  function label() {
    const w = all[at];
    imgs.forEach((im) => { if (!im.src && Math.abs(+im.parentNode.dataset.k - at) <= NEAR) im.src = im.dataset.src; });
    [...tabs.children].forEach((b, i) => b.setAttribute('aria-current', i === w.si));
    caption.innerHTML = `<span class="book-no">${shelves[w.si].name} · ${pad(w.no)} / ${pad(shelves[w.si].items.length)} · ${esc(w.views)}浏览</span><a href="${w.href}" ${ext}>${esc(w.title)} ↗</a>`;
    prev.disabled = at === 0;
    next.disabled = at === all.length - 1;
  }

  function turn(dir) {
    const i = dir > 0 ? at : at - 1;
    const leaf = leaves[i];
    if (!leaf) return false;
    at += dir;
    leaf.classList.add('is-moving');
    leaf.style.zIndex = leaves.length + 1; // above both piles while it's in the air
    leaf.classList.toggle('is-turned', dir > 0);
    clearTimeout(leaf._t);
    leaf._t = setTimeout(() => { leaf.classList.remove('is-moving'); stack(); }, 950);
    stack();
    label();
    return true;
  }

  // Several leaves at once, a beat apart, so you see the pages riffle.
  function go(target) {
    clearInterval(timer);
    target = Math.max(0, Math.min(all.length - 1, target));
    if (target === at) return;
    const dir = target > at ? 1 : -1;
    turn(dir);
    if (target !== at) timer = setInterval(() => { if (target === at || !turn(dir)) clearInterval(timer); }, 70);
  }

  // Straight to a page (a shelf's first cover), no riffle: every leaf goes to its side at once.
  function jump(target) {
    clearInterval(timer);
    if (target === at) return;
    at = target;
    book.classList.add('is-instant');
    leaves.forEach((l, i) => { l.classList.remove('is-moving'); l.classList.toggle('is-turned', i < at); });
    stack();
    label();
    book.offsetWidth; // apply it before the transitions come back
    book.classList.remove('is-instant');
  }

  let down = null, swiped = false;
  book.addEventListener('click', (e) => {
    if (swiped) return (swiped = false); // the swipe already turned it
    const r = book.getBoundingClientRect();
    go(at + (e.clientX > r.left + r.width / 2 ? 1 : -1));
  });
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shelf]');
    if (b) jump(all.findIndex((w) => w.si === +b.dataset.shelf));
  });
  prev.addEventListener('click', () => go(at - 1));
  next.addEventListener('click', () => go(at + 1));
  book.addEventListener('pointerdown', (e) => { down = e.clientX; swiped = false; });
  book.addEventListener('pointerup', (e) => {
    if (down === null || e.pointerType === 'mouse') return (down = null);
    const dx = e.clientX - down;
    down = null;
    if (Math.abs(dx) > 40) { swiped = true; go(at + (dx < 0 ? 1 : -1)); }
  });
  // The arrow keys turn pages while the book is on screen.
  let onScreen = false;
  new IntersectionObserver(([en]) => { onScreen = en.intersectionRatio > 0.5; }, { threshold: [0, 0.5, 1] }).observe(book);
  addEventListener('keydown', (e) => {
    if (!onScreen || document.documentElement.classList.contains('menu-on')) return;
    if (e.key === 'ArrowRight') { go(at + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(at - 1); e.preventDefault(); }
  });

  stack();
  label();
}
