import { sound } from './sound.js';
import { theme } from './theme.js';

// Page chrome: scroll reveals, music button, tab-title aside.
export function initUI() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // He keeps playing while you're away.
  const title = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? '♪ 还在吹，等你回来…' : title;
  });

  initPlayer();
  initTheme();
  // On the last page "Work with me" turns blue.
  new IntersectionObserver(([en]) => document.documentElement.classList.toggle('at-end', en.isIntersecting), { rootMargin: '0px 0px -40% 0px' }).observe(document.getElementById('contact'));
  initMenu();
}

// The music is one small button: a note while it's quiet, a pause sign (two bars) while it plays.
function initPlayer() {
  const btn = document.getElementById('play');
  btn.addEventListener('click', () => sound.toggle());
  sound.onChange((on) => btn.setAttribute('aria-pressed', on));
}

// The moon: light or dark.
function initTheme() {
  const btn = document.getElementById('themeBtn');
  btn.addEventListener('click', () => theme.toggle());
  theme.onChange((dark) => btn.setAttribute('aria-pressed', dark));
}

// The menu slides in from the right. Anything marked data-close (the scrim, Close, each link)
// shuts it, and so does Escape; focus goes in with it and comes back to the button after.
function initMenu() {
  const menu = document.getElementById('menu');
  const btn = document.getElementById('menuBtn');
  const set = (open) => {
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    btn.setAttribute('aria-expanded', open);
    document.documentElement.classList.toggle('menu-on', open);
    if (open) menu.querySelector('.menu-close').focus();
    else btn.focus({ preventScroll: true });
  };
  btn.addEventListener('click', () => set(true));
  menu.addEventListener('click', (e) => {
    const el = e.target.closest('[data-close]');
    if (!el) return;
    set(false);
    // a link: the panel is inert now, which would cancel the jump, so make it here
    const to = el.hash && document.querySelector(el.hash);
    if (to) { e.preventDefault(); to.scrollIntoView(); history.replaceState(null, '', el.hash); }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) set(false); });
}
