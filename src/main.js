import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createLED } from './led.js';
import { initUI } from './ui.js';
import { renderContent } from './render.js';
import { sound } from './sound.js';
import { face } from './face.js';
import { createRoom, wallAngle } from './room.js';

renderContent();
initUI();

const MODEL_URL = `${import.meta.env.BASE_URL}models/camera_head_sax.glb`;

// Lens of the camera head, measured from the model (metres, model space, facing +Z).
const LENS = { center: new THREE.Vector3(0.038, 1.687, 0.154), radius: 0.064 };
const START_TARGET = new THREE.Vector3(0, 0.96, 0);
const COMPANION_TARGET = new THREE.Vector3(0, 0.93, 0);
const FOV = 30;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const hero = document.getElementById('top');
const canvas = document.getElementById('scene');
const nameEl = document.getElementById('heroName');
const iris = document.getElementById('iris');
const hud = document.getElementById('hud');
const backdrop = document.getElementById('backdrop');
const loader = document.getElementById('loader');
const loaderPct = document.getElementById('loaderPct');
const roomHud = document.getElementById('roomHud');
const roomNow = document.getElementById('roomNow');
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

// One door per part of the site; the sixth wall is the lens you came in through.
const room = createRoom({
  envMap: scene.environment,
  ledTexture: led.texture,
  doors: [
    { no: '01', name: 'About', zh: '关于我', section: 'notes' },
    { no: '02', name: 'Tools', zh: '工具', section: 'tools' },
    { no: '03', name: 'Writing', zh: '写在 X 上', section: 'sessions' },
    { no: '04', name: 'Parlour', zh: '约我聊聊', section: 'parlour' },
    { no: '05', name: 'Contact', zh: '联系我', section: 'contact' },
  ],
});

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
  room.resize(w / h);
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

// After the hero the figure stays on as a companion in the right third (desktop only).
const wide = matchMedia('(min-width: 901px)');
function companionDistance() {
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return 1.95 / 0.74 / 2 / halfTan;
}

// The face per page; hover glyphs win, music wins over everything.
let section = '', sectionSince = 0;
function sectionGlyph(now) {
  if (face.section !== section) { section = face.section; sectionSince = now; }
  if (section === 'notes' && now - sectionSince < 2200) return 'HI';
  if (section === 'parlour') return '?';
  if (section === 'contact') return 'heart';
  return null;
}

// Scroll timeline of the hero track (0..1):
//   dive into the lens → look around the room, door by door → walk through door 01 onto the page.
const DIVE = 0.36; // the original dive, compressed into [0, DIVE]; the screen is dark by ~0.30
const ROOM_IN = 0.3, ROOM_OUT = 0.91;
const LOOK = [0.35, 0.82]; // one full turn, pausing at each wall

// Turn of the head in the room: 60° per wall with a pause in front of each.
function lookYaw(u) {
  const x = u * 6, i = Math.floor(x);
  return wallAngle(i) + (wallAngle(1) * smooth(0.3, 0.7, x - i));
}

// Clicking a door: turn to it, walk through, and land on that part of the page.
let inRoom = false, flight = null, yawNow = 0;
addEventListener('click', (e) => {
  if (!inRoom || flight || e.target.closest('a,button,.player')) return;
  const d = room.pick((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  if (!d) return;
  let to = wallAngle(d.k);
  while (to - yawNow > Math.PI) to -= Math.PI * 2;
  while (yawNow - to > Math.PI) to += Math.PI * 2;
  flight = { door: d, from: yawNow, to, t0: performance.now() };
});
function land(section) {
  const el = document.getElementById(section);
  veil.style.background = el.dataset.bg;
  veil.classList.add('on');
  setTimeout(() => {
    scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' });
    readScroll();
    smoothed = progress;
    flight = null;
    requestAnimationFrame(() => veil.classList.remove('on'));
  }, 380);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const k = reduced.matches ? 1 : 1 - Math.exp(-7 * dt);
  smoothed += (progress - smoothed) * k;
  pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-4 * dt));
  pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-4 * dt));

  const p = smoothed;
  const pd = clamp(p / DIVE); // progress of the dive itself, timed as before at the old scale
  const companion = p > ROOM_OUT && !flight; // switched while the exit is fully white
  inRoom = (p >= ROOM_IN && !companion) || !!flight;
  // He steps aside for the Writing strip, which needs the full width.
  const showFigure = inRoom || !companion || (wide.matches && face.section !== 'sessions');
  // The room doesn't need the figure's model, so it shows even before that has loaded.
  canvas.style.opacity = inRoom ? '1' : showFigure ? '' : '0';
  backdrop.style.opacity = companion ? 1 : 0;
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
  // Dark as we enter the lens, clearing onto the room; white through the first door, clearing onto the page.
  const white = p > 0.6;
  iris.style.background = white ? '#fff' : '';
  iris.style.opacity = white
    ? smooth(0.875, 0.9, p) * (1 - smooth(0.92, 0.97, p))
    : smooth(0.76, 0.84, pd) * (1 - smooth(0.31, 0.35, p));
  iris.style.visibility = p >= 0.999 ? 'hidden' : '';
  roomHud.style.opacity = flight ? 0 : smooth(0.34, 0.37, p) * (1 - smooth(0.82, 0.85, p));
  roomHud.style.visibility = inRoom ? '' : 'hidden';

  // The LED is also the porthole in the room, so it keeps drawing.
  led.state.eq = sound.levels(8);

  if (inRoom) {
    let yaw, walk = 0, walkTo = 0;
    const opens = {};
    if (flight) {
      const ft = (now - flight.t0) / 1000;
      yaw = flight.from + (flight.to - flight.from) * easeInOut(clamp(ft / 0.55));
      walkTo = flight.door.k;
      opens[walkTo] = smooth(0.35, 0.8, ft);
      walk = easeInOut(clamp((ft - 0.5) / 0.7)) * 0.95;
      if (ft > 0.95 && !flight.landing) { flight.landing = true; land(flight.door.section); }
    } else {
      const u = clamp((p - LOOK[0]) / (LOOK[1] - LOOK[0]));
      yaw = lookYaw(u);
      opens[0] = smooth(0.82, 0.86, p);
      walk = smooth(0.83, 0.9, p);
    }
    yawNow = yaw;
    room.update({ yaw, walk, walkTo, opens, pointer, dt, nudge: finePointer.matches });
    const facing = ((Math.round(yaw / wallAngle(1)) % 6) + 6) % 6;
    const door = room.doors.find((x) => x.k === facing);
    roomNow.innerHTML = door ? `<b>${door.no}</b> ${door.name}` : '<b>00</b> Lens';
    cursor.classList.toggle('is-hover', !!room.hovered);
    led.state.gazeX = pointer.sx; led.state.gazeY = pointer.sy; led.state.close = 0; led.state.glyph = null;
    led.draw(now);
    renderer.render(room.scene, room.camera);
    return;
  }

  if (companion) {
    // Turned a little toward the page content, still following the pointer.
    rig.rotation.y = -0.32 + pointer.sx * 0.22;
    rig.rotation.x = pointer.sy * 0.04;
    rig.rotation.z = sound.playing ? Math.sin(now * 0.004) * 0.025 : 0;
  } else {
    rig.rotation.set(pointer.sy * 0.05 * free, pointer.sx * 0.28 * free, 0);
  }
  rig.updateMatrixWorld();
  lensWorld.copy(LENS.center).applyMatrix4(rig.matrixWorld);
  lensNormal.set(0, 0, 1).transformDirection(rig.matrixWorld);

  if (companion) {
    // Same perspective, frame shifted so the figure stands at ~77% of the width.
    camera.setViewOffset(innerWidth, innerHeight, -0.27 * innerWidth, 0, innerWidth, innerHeight);
    camera.position.copy(COMPANION_TARGET).add(new THREE.Vector3(0, 0.05, companionDistance()));
    camera.lookAt(COMPANION_TARGET);
  } else {
    camera.clearViewOffset();
    target.lerpVectors(START_TARGET, lensWorld, approach);
    dir.lerpVectors(startDir, lensNormal, smooth(0.1, 0.8, approach)).normalize();
    camera.position.copy(target).addScaledVector(dir, d);
    camera.position.x += pointer.sx * -0.15 * free;
    camera.position.y += pointer.sy * 0.1 * free;
    camera.lookAt(target);
  }

  // Eyes look toward the pointer from wherever the figure stands on screen.
  led.state.gazeX = companion ? clamp((pointer.sx - 0.54) * 1.4, -1, 1) : pointer.sx * free;
  led.state.gazeY = companion ? pointer.sy : pointer.sy * free;
  led.state.close = companion ? 0 : smooth(0.68, 0.8, pd);
  led.state.glyph = companion ? face.glyph ?? sectionGlyph(now) : null;
  led.draw(now);
  if (!showFigure) return;

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) window.__debug = { camera, ledDisc, room, get p() { return smoothed; }, settle() { readScroll(); smoothed = progress; } };
