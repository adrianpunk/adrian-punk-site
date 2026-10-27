// Adrian's own sax recording, off by default. An AnalyserNode turns it into
// band levels (0..1) that the LED panel, the About equalizer and the dock all read.
const audio = new Audio(`${import.meta.env.BASE_URL}audio/saxlele.mp3`);
audio.loop = true;
audio.preload = 'none';

let ctx = null, analyser = null, bins = null, fadeRaf = 0;
let on = false; // intended state; the element keeps playing during the fade-out
const listeners = new Set();

function fade(to, ms, done) {
  cancelAnimationFrame(fadeRaf);
  const from = audio.volume, start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    audio.volume = from + (to - from) * t;
    if (t < 1) fadeRaf = requestAnimationFrame(step);
    else done?.();
  };
  fadeRaf = requestAnimationFrame(step);
}

export const sound = {
  get playing() { return on; },
  get time() { return audio.currentTime; },
  get duration() { return audio.duration || 0; },
  onChange(fn) { listeners.add(fn); },

  async toggle() {
    on = !on;
    if (on) {
      if (!ctx) {
        ctx = new AudioContext();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.82;
        ctx.createMediaElementSource(audio).connect(analyser);
        analyser.connect(ctx.destination);
        bins = new Uint8Array(analyser.frequencyBinCount);
      }
      try {
        await ctx.resume();
        if (audio.paused) audio.volume = 0;
        await audio.play();
        fade(0.85, 900);
      } catch (err) {
        console.warn('Audio failed to start', err);
        on = false;
      }
    } else {
      fade(0, 400, () => audio.pause());
    }
    listeners.forEach((fn) => fn(on));
  },

  // `n` log-spaced bands between ~100 Hz and ~6 kHz, or null when silent.
  // Higher bands get a gentle boost so the sax's thin top end still moves.
  levels(n) {
    if (!analyser || audio.paused) return null;
    analyser.getByteFrequencyData(bins);
    const nyq = ctx.sampleRate / 2, out = new Array(n);
    for (let i = 0; i < n; i++) {
      const lo = Math.floor((100 * Math.pow(60, i / n)) / nyq * bins.length);
      const hi = Math.max(lo + 1, Math.floor((100 * Math.pow(60, (i + 1) / n)) / nyq * bins.length));
      let sum = 0;
      for (let b = lo; b < hi; b++) sum += bins[b];
      out[i] = Math.min(1, (sum / (hi - lo) / 255) * (1.15 + i * 0.22) * audio.volume / 0.85);
    }
    return out;
  },
};
