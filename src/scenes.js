import * as THREE from 'three';
import { credits, tools, parlour } from './content.js';

// The small worlds behind the doors. Each one is driven by t (0..1): played by a timer when you
// click a door, or by scroll when you walk through door 01. Same look as the site: white or black,
// with orange as the only colour.
const BASE = import.meta.env.BASE_URL;
const ORANGE = 0xff5b14;
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// A flat text card: lines of [text, font, colour], drawn left- or centre-aligned, optionally on a filled card.
function textPlane(lines, { width = 2, px = 1024, align = 'left', pad = 0, bg = null } = {}) {
  const c = document.createElement('canvas');
  c.width = px;
  const sizes = lines.map(([, font]) => +font.match(/(\d+)px/)[1]);
  c.height = Math.ceil(sizes.reduce((a, s) => a + s * 1.25, 0) + pad * 2);
  const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.textAlign = align;
  let y = pad;
  lines.forEach(([text, font, color], i) => {
    y += sizes[i] * 1.05;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, align === 'center' ? px / 2 : pad, y);
    y += sizes[i] * 0.2;
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, (width * c.height) / px),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false })
  );
  return mesh;
}

const MONO = (s) => `500 ${s}px "IBM Plex Mono", Menlo, monospace`;
const BOLD = (s) => `800 ${s}px "Inter Tight", "PingFang SC", sans-serif`;
const SANS = (s) => `500 ${s}px "Inter", "PingFang SC", sans-serif`;

function base(bg, fog) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(bg, fog[0], fog[1]);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
  const resize = (aspect) => {
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 68 : 50;
    camera.updateProjectionMatrix();
  };
  return { scene, camera, resize };
}

const loader = new THREE.TextureLoader();
const photo = (src, w, h) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false }));
  loader.load(`${BASE}${src}`, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    m.material.map = tex;
    m.material.color.set(0xffffff);
    m.material.needsUpdate = true;
  });
  return m;
};

// 01 About: five black monoliths, one per chapter of his life, each with a photo, lining a path to the statement.
export function createAboutScene() {
  const { scene, camera, resize } = base(0xf4f4f4, [6, 22]);
  const black = new THREE.MeshLambertMaterial({ color: 0x0c0c0c });
  const path = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 40), new THREE.MeshBasicMaterial({ color: ORANGE }));
  path.position.set(0, 0, -16);
  scene.add(path);
  credits.forEach((c, i) => {
    const side = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    g.position.set(side * 1.55, 0, -3 - i * 3.2);
    g.rotation.y = -side * 0.45;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.25, 3.1, 0.14), black);
    slab.position.y = 1.55;
    const pic = photo(c.photo, 1.05, 1.4);
    pic.position.set(0, 2.25, 0.075);
    const label = textPlane([[c.no, MONO(64), '#ff5b14'], [c.title, BOLD(150), '#ffffff'], [c.role, SANS(46), 'rgba(255,255,255,.6)']], { width: 1.05 });
    label.position.set(0, 1.08, 0.075);
    g.add(slab, pic, label);
    scene.add(g);
  });
  const end = -3 - credits.length * 3.2 - 2;
  const statement = textPlane([['我把经验拆成问题、变量与系统，', BOLD(84), '#0a0a0a'], ['再用 AI 把想象力变成看得见的作品。', BOLD(84), '#0a0a0a']], { width: 3.4, px: 1600, align: 'center' });
  statement.position.set(0, 1.55, end);
  scene.add(statement);

  function update(t, pointer) {
    const k = ease(t);
    camera.position.set(pointer.sx * 0.2, 1.6 - pointer.sy * 0.08, 3 + (end + 3.2 - 3) * k);
    camera.lookAt(pointer.sx * 0.4, 1.6, camera.position.z - 6);
  }
  return { scene, camera, resize, update, duration: 5.5 };
}

// 02 Tools: a clean white production line, drawn like a technical model — white bodies, fine grey
// edges, glass hoods with an orange light strip. A turntable feeds the line; inside each hood one
// tool turns what you bring (a white card) into what it makes (an orange card).
export function createToolsScene() {
  const { scene, camera, resize } = base(0xf6f6f4, [10, 26]);
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xa8a8a8 });
  const belt = new THREE.MeshLambertMaterial({ color: 0xe9ecee, emissive: 0x929496 });
  const glass = new THREE.MeshBasicMaterial({ color: 0xd7e8f3, transparent: true, opacity: 0.32, depthWrite: false });
  const orange = new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false });
  const edge = new THREE.LineBasicMaterial({ color: 0x4a4a4a });
  const soft = new THREE.LineBasicMaterial({ color: 0x9a9a9a });
  const add = (geo, mat, x, y, z, lines = edge) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (lines) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), lines));
    scene.add(m);
    return m;
  };
  const GAP = 3.1, BELT_Y = 0.9;
  const span = (tools.length - 1) * GAP;
  const x0 = -span / 2 - 1.6, x1 = span / 2 + 1.6;

  // Floor line and the long base cabinet under the belt.
  const floorLine = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.01), new THREE.MeshBasicMaterial({ color: 0x8a8a8a }));
  floorLine.position.set(0, 0.001, -1.2);
  floorLine.rotation.x = -Math.PI / 2;
  scene.add(floorLine);
  add(new THREE.BoxGeometry(x1 - x0, BELT_Y - 0.06, 0.9), white, (x0 + x1) / 2, (BELT_Y - 0.06) / 2, 0);
  add(new THREE.BoxGeometry(x1 - x0, 0.06, 0.62), belt, (x0 + x1) / 2, BELT_Y - 0.03, 0);
  for (let x = x0 + 0.8; x < x1; x += 1.6) add(new THREE.BoxGeometry(0.004, 0.42, 0.004), white, x, 0.35, 0.452, soft); // cabinet doors

  // The turntable at the head of the line, vials riding round its rim.
  const tx = x0 - 0.9;
  add(new THREE.CylinderGeometry(0.12, 0.12, BELT_Y - 0.04, 24), white, tx, (BELT_Y - 0.04) / 2, 0);
  const table = new THREE.Group();
  table.position.set(tx, BELT_Y, 0);
  scene.add(table);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.04, 64), belt);
  disc.add(new THREE.LineSegments(new THREE.EdgesGeometry(disc.geometry, 30), edge));
  table.add(disc);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16), white);
    v.add(new THREE.LineSegments(new THREE.EdgesGeometry(v.geometry, 30), soft));
    v.position.set(Math.cos(a) * 0.7, 0.08, Math.sin(a) * 0.7);
    table.add(v);
  }

  // Small blank tokens that keep moving along the belt: the line is always running.
  const tokens = [];
  for (let i = 0; i < 26; i++) {
    const tkn = add(new THREE.BoxGeometry(0.12, 0.05, 0.16), white, 0, BELT_Y + 0.025, -0.15, soft);
    tokens.push({ m: tkn, o: i / 26 });
  }

  const machines = tools.map((tl, i) => {
    const x = i * GAP - span / 2;
    const steps = tl.demo.split('→').map((v) => v.trim());
    // A glass hood over the belt, a white housing on top, a duct (and on the first, a tall stack).
    add(new THREE.BoxGeometry(1.7, 0.72, 0.96), glass, x, BELT_Y + 0.36, 0);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.72, 0.96), white, x + sx * 0.85, BELT_Y + 0.36, 0);
    add(new THREE.BoxGeometry(1.76, 0.42, 1.0), white, x, BELT_Y + 0.93, 0);
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.26, 32), white, x + 0.45, BELT_Y + 1.27, -0.1);
    if (i === 0) add(new THREE.BoxGeometry(0.22, 1.1, 0.22), white, x - 0.55, BELT_Y + 1.69, -0.25);
    add(new THREE.BoxGeometry(1.5, 0.025, 0.025), orange, x, BELT_Y + 0.68, 0.46, null); // the orange light strip inside the hood
    const label = textPlane([[`${tl.code}`, MONO(46), '#ff5b14'], [tl.title, BOLD(96), '#0a0a0a']], { width: 1.3, align: 'center' });
    label.position.set(x - 0.12, BELT_Y + 0.93, 0.505);
    scene.add(label);
    const input = textPlane([[steps[0], SANS(56), '#0a0a0a']], { width: 1.15, px: 760, align: 'center', bg: '#ffffff', pad: 30 });
    const output = textPlane([[steps[steps.length - 1], SANS(56), '#ffffff']], { width: 1.15, px: 760, align: 'center', bg: '#ff5b14', pad: 30 });
    input.add(new THREE.LineSegments(new THREE.EdgesGeometry(input.geometry), edge));
    scene.add(input, output);
    return { x, input, output }; // all on one beat, so one machine's output never meets the next one's input
  });

  const LOOP = 7000; // one card in, one card out: slow and calm
  function update(t, pointer, now) {
    const k = ease(t);
    const x = x0 + 0.4 + (x1 - x0 - 1.2) * k; // drift along the line
    camera.position.set(x - 2.4 + pointer.sx * 0.3, 3.3 - pointer.sy * 0.15, 5.2);
    camera.lookAt(x + 0.5, BELT_Y + 0.35, 0);
    table.rotation.y = now * 0.00025;
    for (const tk of tokens) {
      const u = (now / 52000 + tk.o) % 1;
      tk.m.position.x = x0 + 0.1 + (x1 - x0 - 0.2) * u;
    }
    for (const m of machines) {
      const c = (now / LOOP) % 1;
      m.input.position.set(m.x - 1.45 + smooth(0, 0.42, c) * 1.0, BELT_Y + 0.32, 0.18);
      m.output.position.set(m.x + 0.45 + smooth(0.55, 0.95, c) * 1.0, BELT_Y + 0.32, 0.18);
      m.input.visible = c < 0.4; // taken in under the hood
      m.output.visible = c > 0.56;
    }
  }
  return { scene, camera, resize, update, duration: 7.5 };
}

// 04 Parlour: a table for two under one orange lamp, the two ways to book on the table.
export function createParlourScene() {
  const { scene, camera, resize } = base(0xf4f4f4, [7, 18]);
  const black = new THREE.MeshLambertMaterial({ color: 0x0c0c0c });
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); return m; };
  add(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 64), black, 0, 0.76, 0);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.74, 16), black, 0, 0.37, 0);
  add(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 48), black, 0, 0.01, 0);
  for (const s of [-1, 1]) {
    // A plain chair on each side, and a cup in front of it.
    add(new THREE.BoxGeometry(0.5, 0.05, 0.5), black, s * 1.05, 0.46, 0);
    add(new THREE.BoxGeometry(0.05, 0.6, 0.5), black, s * 1.3, 0.78, 0);
    for (const [dx, dz] of [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]]) add(new THREE.BoxGeometry(0.03, 0.45, 0.03), black, s * 1.05 + dx, 0.225, dz);
    add(new THREE.CylinderGeometry(0.06, 0.05, 0.11, 32), white, s * 0.42, 0.84, 0.1);
  }
  // The lamp: a cord and a glowing shade, lighting the table orange.
  add(new THREE.CylinderGeometry(0.004, 0.004, 1.6, 6), black, 0, 2.6, 0);
  const shade = add(new THREE.SphereGeometry(0.22, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), black, 0, 1.8, 0);
  shade.material = black;
  const bulb = add(new THREE.CircleGeometry(0.2, 48), new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false, side: THREE.DoubleSide }), 0, 1.8, 0);
  bulb.rotation.x = Math.PI / 2;
  const lamp = new THREE.PointLight(ORANGE, 6, 4, 1.5);
  lamp.position.set(0, 1.6, 0);
  scene.add(lamp);
  const pool = add(new THREE.CircleGeometry(1.6, 64), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.12, depthWrite: false }), 0, 0.002, 0);
  pool.rotation.x = -Math.PI / 2;

  const cards = parlour.map((p, i) => {
    const card = textPlane([[`${p.no} · ${p.name}`, MONO(52), '#ff5b14'], [`¥${p.price}`, BOLD(220), '#0a0a0a'], [p.zh, SANS(60), '#555555']], { width: 1, align: 'center' });
    card.position.set((i ? 1 : -1) * 1.15, 1.9, 0.2);
    scene.add(card);
    return card;
  });
  const title = textPlane([['约我聊一小时.', BOLD(130), '#0a0a0a']], { width: 2.4, align: 'center' });
  title.position.set(0, 2.75, -0.4);
  scene.add(title);

  function update(t, pointer, now) {
    const k = ease(t);
    const a = 0.9 - k * 0.9;
    const r = 6 - k * 2.3;
    camera.position.set(Math.sin(a) * r + pointer.sx * 0.2, 1.7 + k * 0.2 - pointer.sy * 0.1, Math.cos(a) * r);
    camera.lookAt(0, 1.45, 0);
    lamp.intensity = 6 + Math.sin(now * 0.004) * 0.4;
    for (const c of [...cards, title]) c.quaternion.copy(camera.quaternion);
  }
  return { scene, camera, resize, update, duration: 3.8 };
}
