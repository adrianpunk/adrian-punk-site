import * as THREE from 'three';
import { theme } from './theme.js';

// The tools as a sandbox production line: a draft rides a conveyor through four machines,
// one per tool, and comes out changed by each. The focused tool's machine lights up blue.
// It only renders while it is on screen.
const INK = 0x161616, BLUE = 0x2525c8, PAPER = 0xffffff, GREY = 0xe6e6e6, MID = 0xbdbdbd;
const STATIONS = [-4.5, -1.5, 1.5, 4.5];
const START = -8, END = 8, GAP = 2.6, SPEED = 0.9;

export function createLine(canvas, labels) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8de, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 8, bottom: -8 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.radius = 4;
  scene.add(sun);

  const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
  const box = (w, h, d, m, x = 0, y = 0, z = 0, parent = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  // ---- The table: a white slab with a faint grid on it.
  const slab = box(19, 0.4, 7.4, mat(0xf4f4f4), 0, -0.2, 0);
  const grid = new THREE.GridHelper(18, 36, 0xdedede, 0xe9e9e9);
  grid.scale.z = 7 / 18;
  grid.position.y = 0.005;
  scene.add(grid);

  // ---- The belt: dark, with slats that run along it.
  box(17, 0.22, 1.7, mat(MID), 0, 0.11, 0);
  box(16.6, 0.06, 1.5, mat(INK, { roughness: 0.6 }), 0, 0.25, 0);
  const slats = [];
  const slatMat = mat(0x2c2c2c, { roughness: 0.5 });
  for (let x = START; x < END; x += 0.5) slats.push(box(0.06, 0.02, 1.5, slatMat, x, 0.29, 0));
  [-8.3, 8.3].forEach((x) => { // rollers at each end
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.72, 20), mat(MID));
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 0.17, 0);
    scene.add(r);
  });

  // ---- The machines: a gantry over the belt, a press that drops when work passes, a lamp, a number plate.
  const plate = (text) => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const font = '600 64px "Inter Tight", Arial, sans-serif';
    const draw = () => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#111'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 128, 68);
    };
    draw();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    document.fonts?.load(font).then(() => { draw(); t.needsUpdate = true; }); // again once the page font is in
    return t;
  };
  const machines = STATIONS.map((x, i) => {
    const g = new THREE.Group();
    g.position.x = x;
    scene.add(g);
    const body = mat(GREY), accent = mat(GREY);
    box(0.34, 1.9, 0.34, body, 0, 0.95, -1.05, g);
    box(0.34, 1.9, 0.34, body, 0, 0.95, 1.05, g);
    box(1.3, 0.5, 2.6, accent, 0, 2.1, 0, g); // the head, which lights up
    const press = box(0.8, 0.5, 0.9, mat(0xd2d2d2), 0, 1.6, 0, g);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mat(MID, { emissive: 0x000000 }));
    lamp.position.set(0.35, 2.5, -0.9);
    g.add(lamp);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: plate(labels[i]), toneMapped: false }));
    sign.position.set(0, 2.1, 1.31);
    g.add(sign);
    // a small control box beside each machine
    box(0.6, 0.7, 0.6, body, 0, 0.35, 2.4, g);
    box(0.4, 0.04, 0.3, mat(INK), 0, 0.72, 2.4, g);
    return { group: g, accent, lamp, press, hit: [] };
  });
  machines.forEach((m) => m.group.traverse((o) => o.isMesh && m.hit.push(o)));

  // On the dark page the table goes dark and its grid fades.
  theme.onChange((dark) => {
    slab.material.color.set(dark ? 0x1c1c1b : 0xf4f4f4);
    grid.material.color.setScalar(dark ? 0.22 : 1);
  });

  // ---- The work: one draft, and what each machine adds to it.
  //  0 a page of text → 1 + a cover → 2 + the IP character → 3 cut into cards → 4 a phone-ready article.
  const makeItem = () => {
    const g = new THREE.Group();
    const page = new THREE.Group();
    box(0.9, 0.04, 1.1, mat(PAPER), 0, 0.02, 0, page);
    for (let k = 0; k < 4; k++) box(0.62 - (k === 3 ? 0.24 : 0), 0.01, 0.06, mat(0xbcbcbc), -0.06 + (k === 3 ? -0.12 : 0), 0.05, 0.08 + k * 0.16, page);
    const cover = box(0.9, 0.02, 0.36, mat(BLUE), 0, 0.055, -0.36, page);
    const guy = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 14), mat(INK));
    body.position.y = 0.2;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.17), mat(0x2a2a2a));
    head.position.y = 0.42;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14), mat(BLUE));
    lens.rotation.z = Math.PI / 2;
    lens.position.set(0.12, 0.42, 0);
    [body, head, lens].forEach((o) => { o.castShadow = true; guy.add(o); });
    guy.position.set(0.18, 0.04, -0.36);
    page.add(guy);
    g.add(page);
    const cards = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Group();
      box(0.5, 0.03, 0.66, mat(PAPER), 0, 0, 0, c);
      box(0.5, 0.012, 0.2, mat(k === 0 ? BLUE : 0xdedede), 0, 0.02, -0.23, c);
      c.position.set(-0.32 + k * 0.32, 0.02 + k * 0.035, (k - 1) * 0.08);
      c.rotation.y = (k - 1) * -0.18;
      cards.add(c);
    }
    g.add(cards);
    const phone = new THREE.Group();
    box(0.56, 0.95, 0.07, mat(INK, { roughness: 0.4 }), 0, 0.5, 0, phone);
    box(0.48, 0.84, 0.01, mat(PAPER), 0, 0.5, 0.04, phone);
    box(0.48, 0.24, 0.012, mat(BLUE), 0, 0.78, 0.046, phone);
    for (let k = 0; k < 3; k++) box(0.36, 0.035, 0.012, mat(0xc4c4c4), -0.02, 0.56 - k * 0.11, 0.046, phone);
    phone.rotation.x = -0.22;
    g.add(phone);
    scene.add(g);
    return { g, page, cover, guy, cards, phone, stage: -1 };
  };
  const show = (it, stage) => {
    if (it.stage === stage) return;
    it.stage = stage;
    it.page.visible = stage <= 2;
    it.cover.visible = stage >= 1;
    it.guy.visible = stage >= 2;
    it.cards.visible = stage === 3;
    it.phone.visible = stage === 4;
  };
  const items = [];
  for (let x = START; x < END; x += GAP) items.push(makeItem());
  let travel = 0;

  // ---- Framing: an isometric view that fits the line to the canvas.
  let focus = 0, w = 1, h = 1, visible = false, raf = 0, last = 0;
  const pointer = new THREE.Vector2(), ray = new THREE.Raycaster();
  let tilt = 0, tiltTo = 0;
  function frameCamera() {
    const aspect = w / h;
    const span = aspect > 1.25 ? 5.9 : 7.6 / aspect; // half-height of the view
    camera.left = -span * aspect; camera.right = span * aspect; camera.top = span; camera.bottom = -span;
    camera.updateProjectionMatrix();
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    frameCamera();
  }

  const lit = new THREE.Color(BLUE), dull = new THREE.Color(GREY), off = new THREE.Color(0);
  function tick(now) {
    raf = visible ? requestAnimationFrame(tick) : 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    travel += dt * SPEED;
    tilt += (tiltTo - tilt) * Math.min(1, dt * 4);
    const a = -Math.PI / 4 + tilt * 0.25;
    camera.position.set(Math.sin(a) * 20, 14, Math.cos(a) * 20);
    camera.lookAt(0, 0.6, 0);

    slats.forEach((s, k) => { s.position.x = START + ((k * 0.5 + travel) % (END - START)); });
    items.forEach((it, k) => {
      const x = START + ((k * GAP + travel) % (items.length * GAP));
      it.g.position.set(x, 0.3, 0);
      it.g.visible = x < END - 0.4;
      show(it, STATIONS.filter((sx) => x > sx + 0.05).length);
    });
    machines.forEach((m, i) => {
      const near = items.some((it) => Math.abs(it.g.position.x - STATIONS[i]) < 0.45);
      const y = near ? 0.95 : 1.6;
      m.press.position.y += (y - m.press.position.y) * Math.min(1, dt * (near ? 14 : 5));
      const on = i === focus;
      m.accent.color.lerp(on ? lit : dull, Math.min(1, dt * 8));
      m.lamp.material.emissive.lerp(on ? lit : off, Math.min(1, dt * 8));
      m.lamp.material.color.lerp(on ? lit : dull, Math.min(1, dt * 8));
    });
    renderer.render(scene, camera);
  }
  const run = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Which machine is under the pointer (-1 for none).
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    return machines.findIndex((m) => ray.intersectObjects(m.hit, false).length);
  }
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tiltTo = ((e.clientX - r.left) / r.width - 0.5) * 2;
    canvas.style.cursor = pick(e) >= 0 ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { tiltTo = 0; });

  return {
    focus(i) { focus = i; },
    onPick(fn) { canvas.addEventListener('click', (e) => { const i = pick(e); if (i >= 0) fn(i); }); },
  };
}
