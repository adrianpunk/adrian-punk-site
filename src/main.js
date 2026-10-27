import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createLED } from './led.js';
import { initUI } from './ui.js';

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
const ledDisc = new THREE.Mesh(
  new THREE.CircleGeometry(LENS.radius, 64),
  new THREE.MeshBasicMaterial({ map: led.texture, toneMapped: false })
);
ledDisc.position.copy(LENS.center);
rig.add(ledDisc);

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
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

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
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitName();
  readScroll();
}
addEventListener('resize', resize);
document.fonts?.ready.then(fitName);
resize();

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

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!visible) return;

  const k = reduced.matches ? 1 : 1 - Math.exp(-7 * dt);
  smoothed += (progress - smoothed) * k;
  pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-4 * dt));
  pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-4 * dt));

  const p = smoothed;
  const t = easeInOut(clamp(p / 0.9));
  const d0 = startDistance(), d1 = endDistance();
  const d = d0 * Math.pow(d1 / d0, t); // log-distance dolly: constant perceived speed
  const approach = (d0 - d) / (d0 - d1); // 0 far → 1 at the lens
  const free = 1 - smooth(0, 0.35, p); // pointer influence fades as we commit to the dive

  rig.rotation.y = pointer.sx * 0.28 * free;
  rig.rotation.x = pointer.sy * 0.05 * free;
  rig.updateMatrixWorld();
  lensWorld.copy(LENS.center).applyMatrix4(rig.matrixWorld);
  lensNormal.set(0, 0, 1).transformDirection(rig.matrixWorld);

  target.lerpVectors(START_TARGET, lensWorld, approach);
  dir.lerpVectors(startDir, lensNormal, smooth(0.1, 0.8, approach)).normalize();
  camera.position.copy(target).addScaledVector(dir, d);
  camera.position.x += pointer.sx * -0.15 * free;
  camera.position.y += pointer.sy * 0.1 * free;
  camera.lookAt(target);

  led.state.gazeX = pointer.sx * free;
  led.state.gazeY = pointer.sy * free;
  led.state.close = smooth(0.8, 0.93, p);
  led.draw(now);

  // DOM layers riding the same progress.
  const sx = +nameEl.dataset.sx || 1, sy = +nameEl.dataset.sy || 1;
  const grow = 1 + approach * 1.6;
  nameEl.firstElementChild.style.transform = `scale(${sx * grow},${sy * grow})`;
  nameEl.style.opacity = 1 - smooth(0.02, 0.3, p);
  hud.style.opacity = 1 - smooth(0, 0.12, p);
  iris.style.opacity = smooth(0.88, 0.99, p);

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) window.__debug = { camera, ledDisc, get p() { return smoothed; } };
