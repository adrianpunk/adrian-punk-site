// Light or dark. The moon button flips it and remembers the choice; until then the system decides.
// index.html sets data-theme before first paint; the 3D scenes listen here to recolour.
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();
const saved = () => { try { return localStorage.getItem('theme'); } catch { return null; } };

function apply(dark) {
  root.dataset.theme = dark ? 'dark' : 'light';
  listeners.forEach((fn) => fn(dark));
}

export const theme = {
  get dark() { return root.dataset.theme === 'dark'; },
  toggle() {
    const dark = !this.dark;
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
    apply(dark);
  },
  onChange(fn) { listeners.add(fn); fn(this.dark); },
};

system.addEventListener('change', (e) => { if (!saved()) apply(e.matches); });
