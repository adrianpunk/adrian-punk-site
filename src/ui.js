// Page chrome: custom cursor, Shanghai clock, scroll reveals.
export function initUI() {
  const fine = matchMedia('(pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const cursor = document.getElementById('cursor');
  let px = innerWidth / 2, py = innerHeight / 2, cx = px, cy = py, raf = 0;
  const paint = () => {
    raf = 0;
    cx += (px - cx) * 0.25;
    cy += (py - cy) * 0.25;
    cursor.style.left = cx + 'px';
    cursor.style.top = cy + 'px';
    if (Math.abs(px - cx) + Math.abs(py - cy) > 0.1) raf = requestAnimationFrame(paint);
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    px = e.clientX; py = e.clientY;
    cursor.classList.add('is-visible');
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
  document.querySelectorAll('a,button').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });

  const clock = document.getElementById('clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);

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
}
