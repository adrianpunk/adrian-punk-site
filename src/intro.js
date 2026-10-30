// The opening: a long message box. "Welcome to Punk's blog" types itself in, key by key
// (the W of Welcome and the P of Punk set bigger), and once the model
// is in, the black send arrow gets pressed and the message flies off. Once per visit; a click
// anywhere (or on the arrow) sends it straight away.
// The line in pieces; `big` ones are set larger.
const PARTS = [['W', true], ['elcome to ', false], ['P', true], ["unk's blog", false]];
const MESSAGE = PARTS.map(([t]) => t).join('');
// The first n characters of the line, each piece in its own span.
function typed(n) {
  let html = '';
  for (const [t, big] of PARTS) {
    if (n <= 0) break;
    const part = t.slice(0, n).replace(/'/g, '&#39;');
    html += big ? `<b>${part}</b>` : part;
    n -= t.length;
  }
  return html;
}
const MAX = 7000; // the most it waits for a slow load

export function startIntro() {
  const el = document.getElementById('intro');
  const text = document.getElementById('introText');
  const send = document.getElementById('introSend');
  const pct = document.getElementById('introPct');
  let seen = false;
  try { seen = sessionStorage.getItem('intro') === '1'; } catch {}
  if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.remove();
    return { progress() {}, ready() {} };
  }
  document.documentElement.classList.add('intro-on');
  const t0 = performance.now();
  let loaded = false, done = false, shown = 0, target = 0, gone = false;

  // A typist's rhythm: a beat before starting, uneven keys, a little pause at the space.
  let i = 0;
  const key = () => {
    if (gone) return;
    i++;
    text.innerHTML = typed(i);
    el.classList.add('is-typing');
    send.classList.add('is-ready');
    if (i < MESSAGE.length) setTimeout(key, (MESSAGE[i] === ' ' ? 220 : 90) + Math.random() * 70);
    else { done = true; setTimeout(check, 450); }
  };
  setTimeout(key, 700);

  const check = () => {
    if (gone || !done) return;
    if (loaded || performance.now() - t0 > MAX) press();
  };
  const press = () => {
    if (gone) return;
    gone = true;
    text.innerHTML = typed(MESSAGE.length);
    pct.textContent = '100';
    el.classList.add('is-typing');
    send.classList.add('is-ready', 'is-pressed');
    setTimeout(() => el.classList.add('is-sent'), 160); // the message lifts off the box
    setTimeout(() => {
      el.classList.add('is-out');
      document.documentElement.classList.remove('intro-on');
      try { sessionStorage.setItem('intro', '1'); } catch {}
    }, 700);
    setTimeout(() => el.remove(), 1500);
  };
  el.addEventListener('click', press);

  const tick = () => {
    if (gone) return;
    shown += (target - shown) * 0.12;
    pct.textContent = Math.round(shown);
    if (performance.now() - t0 > MAX) check();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    progress(p) { target = Math.max(target, Math.min(96, p * 100)); },
    ready() { loaded = true; target = 100; setTimeout(check, 300); },
  };
}
