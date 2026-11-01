import { sound } from './sound.js';

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
  // About's "Punk" gets its blue underline once the page is on screen.
  const hello = document.querySelector('.about-hello');
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { hello.classList.add('in'); io.disconnect(); } }, { threshold: 0.6 }).observe(hello);
  // On the last page "Work with me" turns blue.
  new IntersectionObserver(([en]) => document.documentElement.classList.toggle('at-end', en.isIntersecting), { rootMargin: '0px 0px -40% 0px' }).observe(document.getElementById('contact'));
}

// The music is one small button: a note while it's quiet, a pause sign (two bars) while it plays.
function initPlayer() {
  const btn = document.getElementById('play');
  btn.addEventListener('click', () => sound.toggle());
  sound.onChange((on) => btn.setAttribute('aria-pressed', on));
}
