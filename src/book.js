// The works as a book: every cover is folded down the middle, its left half on the left page and
// its right half on the right. Turning a leaf swings the right half over the spine, and its back is
// the left half of the next cover. Click either side of the book, swipe, or use the arrow keys;
// the category names above it open that category's own book at its first cover.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ext = 'target="_blank" rel="noopener noreferrer"';
const pad = (n) => String(n).padStart(2, '0');
const NEAR = 3; // covers this many turns away get their pictures loaded

export function initBook({ book, tabs, caption }, shelves, base) {
  let all = [], leaves = [], imgs = [], at = 0, shelf = 0;

  // One half of cover k: the whole cover sits inside at double width, and the page shows its left or right half.
  const half = (k, side) => {
    const w = all[k];
    const art = w.cover
      ? `<img data-src="${base}${w.cover}" alt="" />`
      : `<div class="set-cover"><small>${w.cat}</small><b>${esc(w.title)}</b><span>Adrian.Punk</span></div>`;
    return `<div class="half ${side}" data-k="${k}">${art}</div>`;
  };
  tabs.innerHTML = shelves.map((s, si) => `<button type="button" data-shelf="${si}">${s.name}<sup>${s.items.length}</sup></button>`).join('');

  // Bind the book for a category, opened at its first cover.
  function open(si) {
    shelf = si;
    all = shelves[si].items;
    at = 0;
    let html = `<div class="book-base left">${half(0, 'l')}</div><div class="book-base right">${half(all.length - 1, 'r')}</div>`;
    for (let k = 0; k < all.length - 1; k++) html += `<div class="leaf"><div class="face front">${half(k, 'r')}</div><div class="face back">${half(k + 1, 'l')}</div></div>`;
    book.innerHTML = html;
    leaves = [...book.querySelectorAll('.leaf')];
    imgs = [...book.querySelectorAll('img[data-src]')];
    stack();
    label();
  }

  // Turned leaves pile up on the left, the last one turned on top; the rest on the right, the next one on top.
  const stack = () => leaves.forEach((l, i) => { if (!l.classList.contains('is-moving')) l.style.zIndex = i < at ? i + 1 : leaves.length - i; });

  function label() {
    const w = all[at];
    imgs.forEach((im) => { if (!im.src && Math.abs(+im.parentNode.dataset.k - at) <= NEAR) im.src = im.dataset.src; });
    [...tabs.children].forEach((b, i) => b.setAttribute('aria-current', i === shelf));
    caption.innerHTML = `<span class="book-no">${w.cat} · ${pad(at + 1)} / ${pad(all.length)} · ${esc(w.views)}浏览</span><a href="${w.href}" ${ext}>${esc(w.title)} ↗</a>`;
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

  function go(target) {
    target = Math.max(0, Math.min(all.length - 1, target));
    if (target !== at) turn(target > at ? 1 : -1);
  }

  let down = null, swiped = false;
  book.addEventListener('click', (e) => {
    if (swiped) return (swiped = false); // the swipe already turned it
    const r = book.getBoundingClientRect();
    go(at + (e.clientX > r.left + r.width / 2 ? 1 : -1));
  });
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shelf]');
    if (b && +b.dataset.shelf !== shelf) open(+b.dataset.shelf);
  });
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

  open(0);
}
