import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createLED } from './led.js';
import { initUI } from './ui.js';
import { renderContent, refreshCrate, dropBadge } from './render.js';
import { sound } from './sound.js';
import { face } from './face.js';
import { createCorridor } from './corridor.js';
import { doors } from './content.js';
import { createTunnel } from './tunnel.js';
import { createAboutScene, createToolsScene, createParlourScene } from './scenes.js';

renderContent();
initUI();

const MODEL_URL = `${import.meta.env.BASE_URL}models/camera_head_sax.glb`;

// Lens of the camera head, measured from the model (metres, model space, facing +Z).
const LENS = { center: new THREE.Vector3(0.038, 1.687, 0.154), radius: 0.064 };
const START_TARGET = new THREE.Vector3(0, 0.96, 0);
const FOV = 30;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const hero = document.getElementById('top');
const canvas = document.getElementById('scene');
const nameEl = document.getElementById('heroName');
const iris = document.getElementById('iris');
const hud = document.getElementById('hud');
const loader = document.getElementById('loader');
const loaderPct = document.getElementById('loaderPct');
const pages = document.getElementById('pages');
const pageNow = document.getElementById('pageNow');
const roomHud = document.getElementById('roomHud');
const roomNow = document.getElementById('roomNow');
const roomHint = document.getElementById('roomHint');
const veil = document.getElementById('veil');
const cursor = document.getElementById('cursor');
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

const led = createLED();
face.ledCanvas = led.canvas;
const ledDisc = new THREE.Mesh(
  new THREE.CircleGeometry(LENS.radius, 64),
  new THREE.MeshBasicMaterial({ map: led.texture, toneMapped: false })
);
ledDisc.position.copy(LENS.center);
rig.add(ledDisc);

// One door per part of the site, down a corridor; the porthole at the end is the lens you came in through.
const corridor = createCorridor({
  envMap: scene.environment,
  ledTexture: led.texture,
  doors,
});

// Behind each door, a small world for that section; the Writing door opens onto the tunnel of works.
// Contact has none: its page is the scene (a badge drops in).
const tunnel = createTunnel();
const behind = {
  notes: createAboutScene(),
  tools: createToolsScene(),
  sessions: { ...tunnel, duration: 6 },
  parlour: createParlourScene(),
};

// ---------- Load model ----------
new GLTFLoader().load(
  MODEL_URL,
  (gltf) => {
    gltf.scene.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    rig.add(gltf.scene);
    loader.classList.add('is-done');
    canvas.classList.add('is-ready');
  },
  (e) => {
    if (e.total) loaderPct.textContent = Math.round((e.loaded / e.total) * 100);
  },
  (err) => {
    console.error(err);
    loader.textContent = 'Model failed to load';
  }
);

// ---------- Input / scroll ----------
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
const aim = (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
};
addEventListener('pointermove', aim, { passive: true });
addEventListener('pointerdown', aim, { passive: true }); // a tap aims too, so doors can be tapped
const finePointer = matchMedia('(pointer: fine)');

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
  corridor.resize(w / h);
  Object.values(behind).forEach((b) => b.resize(w / h));
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

// The face on the player while a page is open; hover glyphs win.
let section = '', sectionSince = 0;
function sectionGlyph(now) {
  if (face.section !== section) { section = face.section; sectionSince = now; }
  if (section === 'notes' && now - sectionSince < 2200) return 'HI';
  if (section === 'parlour') return '?';
  if (section === 'contact') return 'heart';
  return null;
}

// Scroll timeline of the hero track (0..1): dive into the lens, then walk down the corridor,
// stopping at each door. Clicking a door walks you through it into its world, then its page;
// the page closes back to the same spot in the corridor.
const DIVE = 0.3; // the original dive, compressed into [0, DIVE]; the screen is dark by ~0.26
const ROOM_IN = 0.26;
const WALK = [0.33, 1];
const DOOR_IN = 1.4; // seconds from a door click to its world

const lerp = (a, b, t) => a + (b - a) * t;
function poseAt(u) {
  const st = corridor.stations, n = st.length - 1;
  const x = clamp(u) * n, i = Math.min(Math.floor(x), n - 1);
  const b = smooth(0.22, 0.78, x - i); // pause at each stop
  const a = st[i], c = st[i + 1];
  return { x: lerp(a.x, c.x, b), z: lerp(a.z, c.z, b), yaw: lerp(a.yaw, c.yaw, b), stop: Math.round(x) };
}
// Window scroll position that stands you in front of door k.
function stationTop(k) {
  const p = WALK[0] + ((k + 1) / (corridor.stations.length - 1)) * (WALK[1] - WALK[0]);
  return hero.offsetTop + p * (hero.offsetHeight - innerHeight);
}

// ---------- Pages: one section at a time, over the corridor ----------
const sections = corridor.doors.map((d) => d.section);
let openSection = null;
let inLens = false, flight = null, poseNow = { ...corridor.stations[0], stop: 0 };
function openPage(section) {
  const el = document.getElementById(section);
  const door = corridor.doors.find((d) => d.section === section);
  openSection = section;
  flight = null;
  sections.forEach((id) => { document.getElementById(id).hidden = id !== section; });
  pages.querySelectorAll('.page-end').forEach((nav) => { nav.hidden = nav.dataset.for !== section; });
  pages.style.setProperty('--page-bg', el.dataset.bg);
  pages.classList.toggle('is-dark', el.dataset.bg !== '#fff');
  pageNow.innerHTML = `<b>${door.no}</b> ${door.name}`;
  pages.hidden = false;
  pages.scrollTop = 0;
  document.documentElement.classList.add('page-open');
  face.section = el.dataset.face;
  if (section === 'sessions') refreshCrate();
  if (section === 'contact') dropBadge();
  if (location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`);
}
// Back to the corridor, standing in front of door k (by default the one you came out of).
function closePage(k = corridor.doors.find((d) => d.section === openSection)?.k) {
  veil.style.background = '#ededed';
  veil.classList.add('on');
  setTimeout(() => {
    pages.hidden = true;
    openSection = null;
    document.documentElement.classList.remove('page-open');
    face.section = 'hero';
    history.replaceState(null, '', location.pathname + location.search);
    if (k != null) scrollTo({ top: stationTop(k), behavior: 'instant' });
    readScroll();
    smoothed = progress;
    requestAnimationFrame(() => veil.classList.remove('on'));
  }, 360);
}
function land(section, color) {
  veil.style.background = color;
  veil.classList.add('on');
  setTimeout(() => {
    openPage(section);
    requestAnimationFrame(() => veil.classList.remove('on'));
  }, 360);
}
pages.addEventListener('click', (e) => {
  const back = e.target.closest('[data-back]');
  if (back) closePage(back.dataset.back === '' ? undefined : +back.dataset.back);
});
// The hero menu goes straight to a page.
document.querySelectorAll('nav a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  const id = a.getAttribute('href').slice(1);
  land(id, document.getElementById(id).dataset.bg);
}));
// A link to #tools (etc.) opens that page, on load or later.
const openFromHash = () => { const id = location.hash.slice(1); if (sections.includes(id) && id !== openSection) openPage(id); };
addEventListener('hashchange', openFromHash);
openFromHash();

// Clicking a door: square up to it, walk through into its world, then land on its page.
// Once inside a world, a click, wheel, key or touch skips ahead to the page.
function enter(d) {
  flight = { door: d, world: behind[d.section] || null, from: { ...poseNow }, t0: performance.now() };
}
addEventListener('click', (e) => {
  if (!inLens || openSection || e.target.closest('a,button,.player')) return;
  if (flight) { skip(); return; }
  const d = corridor.pick((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  if (d) enter(d);
});
function skip() {
  if (flight && flight.inside && !flight.landing) { flight.landing = true; land(flight.door.section, document.getElementById(flight.door.section).dataset.bg); }
}
addEventListener('wheel', skip, { passive: true });
addEventListener('touchstart', skip, { passive: true });
addEventListener('keydown', (e) => {
  if (openSection) { if (e.key === 'Escape') closePage(); return; }
  if (flight) { skip(); return; }
  // Enter opens the door you're standing at.
  if (inLens && e.key === 'Enter') { const d = corridor.doors[poseNow.stop - 1]; if (d) enter(d); }
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

  // The LED is also the porthole and the player's little face, so it keeps drawing.
  led.state.eq = sound.levels(8);
  if (openSection) {
    led.state.gazeX = 0; led.state.gazeY = 0; led.state.close = 0;
    led.state.glyph = face.glyph ?? sectionGlyph(now);
    led.draw(now);
    return; // the page covers everything
  }

  const p = smoothed;
  const pd = clamp(p / DIVE); // progress of the dive itself, timed as before at the old scale
  inLens = p >= ROOM_IN || !!flight;
  // The corridor doesn't need the figure's model, so it shows even before that has loaded.
  canvas.style.opacity = inLens ? '1' : '';
  const t = easeInOut(clamp(pd / 0.78));
  const d0 = startDistance(), d1 = endDistance();
  const d = d0 * Math.pow(d1 / d0, t); // log-distance dolly: constant perceived speed
  const approach = (d0 - d) / (d0 - d1); // 0 far → 1 at the lens
  const free = 1 - smooth(0, 0.35, pd); // pointer influence fades as we commit to the dive

  // DOM layers riding the same progress.
  const sx = +nameEl.dataset.sx || 1, sy = +nameEl.dataset.sy || 1;
  const grow = 1 + approach * 1.6;
  nameEl.firstElementChild.style.transform = `scale(${sx * grow},${sy * grow})`;
  nameEl.style.opacity = 1 - smooth(0.02, 0.3, pd);
  hud.style.opacity = 1 - smooth(0, 0.12, pd);
  // The iris goes dark into the lens and opens again onto the corridor.
  iris.style.opacity = smooth(0.76, 0.84, pd) * (1 - smooth(0.27, 0.31, p));
  iris.style.visibility = flight ? 'hidden' : '';

  if (inLens) {
    let world = null, wt = 0;
    if (flight) {
      const ft = (now - flight.t0) / 1000;
      if (ft > DOOR_IN - 0.3 && !flight.flash) { flight.flash = true; veil.style.background = '#ff5b14'; veil.classList.add('on'); }
      if (ft >= DOOR_IN) {
        if (!flight.world) {
          // No world behind this door: straight onto the page.
          if (!flight.landing) { flight.landing = true; land(flight.door.section, '#ff5b14'); }
        } else {
          if (!flight.inside) { flight.inside = true; veil.classList.remove('on'); }
          world = flight.world;
          wt = clamp((ft - DOOR_IN) / world.duration);
          if (wt >= 1) skip();
        }
      }
    }

    roomHud.style.visibility = '';
    if (world) {
      roomHud.style.opacity = 1;
      roomHud.classList.toggle('on-light', world.scene.background.getHSL({}).l > 0.5);
      roomNow.innerHTML = `<b>${flight.door.no}</b> ${flight.door.name}`;
      roomHint.textContent = 'Click or scroll to skip';
      cursor.classList.remove('is-hover');
      world.update(wt, pointer, now, dt);
      renderer.render(world.scene, world.camera);
      return;
    }

    let pose;
    const opens = {};
    if (flight) {
      const ft = (now - flight.t0) / 1000, dr = flight.door;
      const a = easeInOut(clamp(ft / 0.8)), w = easeInOut(clamp((ft - 0.8) / 0.6));
      pose = {
        x: lerp(lerp(flight.from.x, dr.stand.x, a), dr.through.x, w),
        z: lerp(lerp(flight.from.z, dr.stand.z, a), dr.through.z, w),
        yaw: lerp(flight.from.yaw, dr.stand.yaw, a),
      };
      opens[dr.k] = smooth(0.5, 0.95, ft);
    } else {
      pose = poseAt(clamp((p - WALK[0]) / (WALK[1] - WALK[0])));
      poseNow = pose;
    }
    roomHud.classList.add('on-light');
    corridor.update({ pose, opens, pointer, dt, nudge: finePointer.matches, pickable: !flight });
    roomHud.style.opacity = flight ? 0 : smooth(0.3, 0.34, p);
    const door = corridor.doors[poseNow.stop - 1];
    roomNow.innerHTML = door ? `<b>${door.no}</b> ${door.name}` : '<b>00</b> Corridor';
    roomHint.textContent = finePointer.matches ? 'Scroll to walk · Click a door to enter' : 'Swipe to walk · Tap a door to enter';
    cursor.classList.toggle('is-hover', !!corridor.hovered);
    led.state.gazeX = pointer.sx; led.state.gazeY = pointer.sy; led.state.close = 0; led.state.glyph = null;
    led.draw(now);
    renderer.render(corridor.scene, corridor.camera);
    return;
  }
  roomHud.style.visibility = 'hidden';

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
  led.state.close = smooth(0.68, 0.8, pd);
  led.state.glyph = null;
  led.draw(now);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) window.__debug = { camera, ledDisc, corridor, behind, get p() { return smoothed; }, settle() { readScroll(); smoothed = progress; },
  stationTop, openPage, closePage,
  // Jump straight into the world behind door k, `at` seconds in.
  enter(k, at = DOOR_IN) { const d = corridor.doors[k]; flight = { door: d, world: behind[d.section] || null, from: { ...d.stand }, t0: performance.now() - at * 1000, flash: true }; } };
