import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createLED } from './led.js';
import { initUI } from './ui.js';
import { renderContent } from './render.js';
import { sound } from './sound.js';
import { face } from './face.js';
import { startIntro } from './intro.js';
import { createSpace } from './space.js';
import { works } from './content.js';

const intro = startIntro();
renderContent();
initUI();

const MODEL_URL = `${import.meta.env.BASE_URL}models/camera_head_sax.glb`;

// Lens of the camera head, measured from the model (metres, model space, facing +Z).
const LENS = { center: new THREE.Vector3(0.038, 1.687, 0.154), radius: 0.064 };
const START_TARGET = new THREE.Vector3(0, 0.96, 0);
// The hero track is two flights: the dive into the lens, then the tunnel of works beyond it.
const DIVE = 0.26;
const FOV = 30;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const hero = document.getElementById('top');
const canvas = document.getElementById('scene');
const nameEl = document.getElementById('heroName');
const iris = document.getElementById('iris');
const flash = document.getElementById('flash');
const hud = document.getElementById('hud');
const loader = document.getElementById('loader');
const loaderPct = document.getElementById('loaderPct');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const camera = new THREE.PerspectiveCamera(FOV, 1, 0.002, 50);

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(1.8, 3.2, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -1.2;
key.shadow.camera.right = key.shadow.camera.top = 1.2;
key.shadow.radius = 6;
key.shadow.bias = -0.0005;
scene.add(key);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.12 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Everything that turns with the pointer lives in `rig`, including the LED panel.
const rig = new THREE.Group();
scene.add(rig);

const space = createSpace(works, import.meta.env.BASE_URL);

const led = createLED();
face.ledCanvas = led.canvas;
const ledDisc = new THREE.Mesh(
  new THREE.CircleGeometry(LENS.radius, 64),
  new THREE.MeshBasicMaterial({ map: led.texture, toneMapped: false })
);
ledDisc.position.copy(LENS.center);
rig.add(ledDisc);

// ---------- Load model ----------
// The model is meshopt-compressed with WebP textures (1.5 MB, was 27 MB); see README for how it was made.
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
  MODEL_URL,
  (gltf) => {
    gltf.scene.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    rig.add(gltf.scene);
    loader.classList.add('is-done');
    canvas.classList.add('is-ready');
    intro.ready();
    space.warm(Infinity); // with the figure in, fetch every cover in the tunnel (≈1 MB) before the dive
  },
  (e) => {
    if (e.total) { loaderPct.textContent = Math.round((e.loaded / e.total) * 100); intro.progress(e.loaded / e.total); }
  },
  (err) => {
    console.error(err);
    loader.lastElementChild.textContent = 'Model failed to load';
    intro.ready();
    space.warm(Infinity);
  }
);

// ---------- Input / scroll ----------
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
const aim = (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
};
addEventListener('pointermove', aim, { passive: true });

// In the tunnel the works are links: point at one and it grows, click and it opens.
let inSpace = false, overWork = null;
addEventListener('pointermove', (e) => {
  overWork = inSpace && !e.target.closest('a,button,.player') ? space.pick((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1) : null;
  document.documentElement.classList.toggle('over-work', !!overWork);
}, { passive: true });
addEventListener('click', (e) => {
  if (!overWork || e.target.closest('a,button,.player')) return;
  window.open(overWork.href, '_blank', 'noopener');
});

let progress = 0; // raw scroll progress through the hero track, 0..1
let smoothed = 0;
function readScroll() {
  const track = hero.offsetHeight - innerHeight;
  progress = clamp(-hero.getBoundingClientRect().top / Math.max(1, track));
}
addEventListener('scroll', readScroll, { passive: true });

function fitName() {
  const span = nameEl.firstElementChild;
  const w = innerWidth;
  nameEl.style.fontSize = Math.min(w * 0.175, 330) + 'px';
  span.style.transform = 'none';
  const sx = (w * 0.985) / Math.max(1, span.getBoundingClientRect().width);
  nameEl.dataset.sx = sx;
  nameEl.dataset.sy = sx * (w <= 600 ? 1.55 : 1.85);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  space.resize(w / h);
  fitName();
  readScroll();
}
addEventListener('resize', resize);
document.fonts?.ready.then(fitName);
resize();
smoothed = progress; // a reload mid-page starts where it is, not by replaying the dive

// ---------- Camera path ----------
const lensWorld = new THREE.Vector3();
const lensNormal = new THREE.Vector3();
const target = new THREE.Vector3();
const startDir = new THREE.Vector3(0, 0.02, 1).normalize();
const dir = new THREE.Vector3();

function startDistance() {
  // Keep the whole figure (≈1.9 m) in frame, also on narrow portrait screens.
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const byHeight = 2.05 / 0.68 / 2 / halfTan;
  const byWidth = 1.1 / 2 / (halfTan * camera.aspect);
  return Math.max(byHeight, byWidth);
}

function endDistance() {
  // Close enough that the lens disc covers the whole viewport (incl. corners).
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return (LENS.radius * 0.7) /(halfTan * Math.sqrt(1 + camera.aspect * camera.aspect));
}


// The face on the player follows the section on screen; hover glyphs win.
let section = '', sectionSince = 0;
function sectionGlyph(now) {
  if (face.section !== section) { section = face.section; sectionSince = now; }
  if (section === 'notes' && now - sectionSince < 2200) return 'HI';
  if (section === 'parlour') return '?';
  return null;
}

// After the flight the page is a plain run of sections; the face follows the one on screen.
// The menu links scroll to them.
const screens = [...document.querySelectorAll('main > section, main > footer')];
const seen = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    face.section = en.target.dataset.face;
  }
}, { rootMargin: '-45% 0px -45% 0px' });
screens.forEach((el) => seen.observe(el));
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  const el = a && document.getElementById(a.hash.slice(1));
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
});

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const k = reduced.matches ? 1 : 1 - Math.exp(-7 * dt);
  smoothed += (progress - smoothed) * k;
  pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-4 * dt));
  pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-4 * dt));

  // The LED is also the player's little face, so it keeps drawing after the dive.
  led.state.eq = sound.levels(8);
  const pd = smoothed;
  const past = hero.getBoundingClientRect().bottom <= 0;
  if (past) {
    inSpace = false;
    led.state.gazeX = 0; led.state.gazeY = 0; led.state.close = 0;
    led.state.glyph = face.glyph ?? sectionGlyph(now);
    led.draw(now);
    return; // the sections cover the scene
  }
  // Beyond the lens: black, then out into the tunnel; through the black hole it all goes white.
  const sp = clamp((pd - DIVE) / (1 - DIVE));
  flash.style.opacity = smooth(0.94, 1, sp);
  inSpace = pd > DIVE && sp < 0.97;
  if (pd > DIVE) {
    face.section = 'space';
    canvas.classList.add('is-ready'); // the tunnel doesn't wait for the figure to load
    iris.style.opacity = 1 - smooth(0.01, 0.07, sp);
    nameEl.style.opacity = 0;
    hud.style.opacity = 0;
    hud.style.visibility = 'hidden';
    space.update(sp, pointer.sx, pointer.sy, dt, now);
    led.state.glyph = face.glyph ?? sectionGlyph(now);
    led.draw(now);
    renderer.render(space.scene, space.camera);
    return;
  }
  if (overWork) { overWork = null; document.documentElement.classList.remove('over-work'); }

  // The dive, on its own 0..0.9 scale: at 0.86 the lens has gone black.
  const op = (pd / DIVE) * 0.9;
  face.section = 'hero';
  if (op > 0.3) space.warm();
  const t = easeInOut(clamp(op / 0.78));
  const d0 = startDistance(), d1 = endDistance();
  const d = d0 * Math.pow(d1 / d0, t); // log-distance dolly: constant perceived speed
  const approach = (d0 - d) / (d0 - d1); // 0 far → 1 at the lens
  const free = 1 - smooth(0, 0.35, op); // pointer influence fades as we commit to the dive

  // DOM layers riding the same progress.
  const sx = +nameEl.dataset.sx || 1, sy = +nameEl.dataset.sy || 1;
  const grow = 1 + approach * 1.6;
  nameEl.firstElementChild.style.transform = `scale(${sx * grow},${sy * grow})`;
  nameEl.style.opacity = 1 - smooth(0.02, 0.3, op);
  hud.style.opacity = 1 - smooth(0, 0.12, op);
  hud.style.visibility = op > 0.12 ? 'hidden' : ''; // so the faded menu can't be clicked
  iris.style.opacity = smooth(0.76, 0.86, op);

  rig.rotation.set(pointer.sy * 0.05 * free, pointer.sx * 0.28 * free, 0);
  rig.updateMatrixWorld();
  lensWorld.copy(LENS.center).applyMatrix4(rig.matrixWorld);
  lensNormal.set(0, 0, 1).transformDirection(rig.matrixWorld);
  target.lerpVectors(START_TARGET, lensWorld, approach);
  dir.lerpVectors(startDir, lensNormal, smooth(0.1, 0.8, approach)).normalize();
  camera.position.copy(target).addScaledVector(dir, d);
  camera.position.x += pointer.sx * -0.15 * free;
  camera.position.y += pointer.sy * 0.1 * free;
  camera.lookAt(target);

  // Eyes look toward the pointer.
  led.state.gazeX = pointer.sx * free;
  led.state.gazeY = pointer.sy * free;
  led.state.close = smooth(0.68, 0.8, op);
  led.state.glyph = null;
  led.draw(now);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) window.__debug = { camera, ledDisc, get p() { return smoothed; }, settle() { readScroll(); smoothed = progress; } };
