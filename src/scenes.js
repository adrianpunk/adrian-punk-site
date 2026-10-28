import * as THREE from 'three';
import { credits, tools, parlour, links } from './content.js';

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

// 01 About: five black monoliths, one per chapter of his life, lining a path to the statement.
export function createAboutScene() {
  const { scene, camera, resize } = base(0xf4f4f4, [6, 22]);
  const black = new THREE.MeshLambertMaterial({ color: 0x0c0c0c });
  const path = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 40), new THREE.MeshBasicMaterial({ color: ORANGE }));
  path.position.set(0, 0, -16);
  scene.add(path);
  credits.forEach((c, i) => {
    const side = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    g.position.set(side * 1.5, 0, -3 - i * 3.2);
    g.rotation.y = -side * 0.45;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.9, 0.14), black);
    slab.position.y = 1.45;
    const label = textPlane([[c.no, MONO(64), '#ff5b14'], [c.title, BOLD(150), '#ffffff'], [c.en, SANS(46), 'rgba(255,255,255,.6)'], [c.role, SANS(46), 'rgba(255,255,255,.6)']], { width: 0.9 });
    label.position.set(0, 2.25, 0.075);
    g.add(slab, label);
    scene.add(g);
  });
  const end = -3 - credits.length * 3.2 - 2;
  const statement = textPlane([['我把经验拆成问题、变量与系统，', BOLD(84), '#0a0a0a'], ['再用 AI 把想象力变成看得见的作品。', BOLD(84), '#0a0a0a']], { width: 3.4, px: 1600, align: 'center' });
  statement.position.set(0, 1.55, end);
  scene.add(statement);

  function update(t, pointer) {
    const k = ease(t);
    camera.position.set(pointer.sx * 0.2, 1.5 - pointer.sy * 0.08, 3 + (end + 3.2 - 3) * k);
    camera.lookAt(pointer.sx * 0.4, 1.45, camera.position.z - 6);
  }
  return { scene, camera, resize, update, duration: 4.2 };
}

// 02 Tools: an assembly line of four machines. Into each goes what you bring (a white card),
// out comes what it makes (an orange card) — the same input → output each tool promises.
export function createToolsScene() {
  const { scene, camera, resize } = base(0xf4f4f4, [9, 22]);
  const black = new THREE.MeshLambertMaterial({ color: 0x0c0c0c });
  const GAP = 2.8, BELT_Y = 0.62;
  const span = (tools.length - 1) * GAP;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(span + 3.4, 0.04, 0.5), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
  belt.position.set(0, BELT_Y - 0.02, 0);
  scene.add(belt);
  for (const z of [-0.26, 0.26]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(span + 3.4, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: ORANGE }));
    rail.position.set(0, BELT_Y + 0.005, z);
    scene.add(rail);
  }
  for (let x = -span / 2 - 1.5; x <= span / 2 + 1.5; x += 1.2) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, BELT_Y - 0.04, 0.4), black);
    leg.position.set(x, (BELT_Y - 0.04) / 2, 0);
    scene.add(leg);
  }

  const machines = tools.map((tl, i) => {
    const x = i * GAP - span / 2;
    const steps = tl.demo.split('→').map((v) => v.trim());
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 0.9), black);
    body.position.set(x, BELT_Y + 0.52, 0);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false }));
    mouth.position.set(x, BELT_Y + 0.15, 0.452);
    const label = textPlane([[`${tl.code}  ${tl.role}`, MONO(44), '#ff5b14'], [tl.title, BOLD(120), '#ffffff']], { width: 1.1, align: 'center' });
    label.position.set(x, BELT_Y + 0.72, 0.452);
    // Middle steps, if any, sit on top of the machine like a little display.
    const middle = steps.slice(1, -1).join(' → ');
    if (middle) {
      const screen = textPlane([[middle, SANS(64), '#0a0a0a']], { width: 1.5, align: 'center', bg: '#ffffff', pad: 18 });
      screen.position.set(x, BELT_Y + 1.32, 0);
      screen.scale.setScalar(0.75);
      scene.add(screen);
    }
    const input = textPlane([[steps[0], SANS(70), '#0a0a0a']], { width: 1.05, align: 'center', bg: '#ffffff', pad: 26 });
    const output = textPlane([[steps[steps.length - 1], SANS(70), '#ffffff']], { width: 1.05, align: 'center', bg: '#ff5b14', pad: 26 });
    scene.add(input, output); // standing up on the belt, facing you
    scene.add(body, mouth, label);
    return { x, input, output, phase: i * 0.37 };
  });

  function update(t, pointer, now) {
    const k = ease(t);
    const x = -span / 2 - 1.2 + (span + 2.4) * k; // travel along the line
    camera.position.set(x + pointer.sx * 0.3, 2.3 - pointer.sy * 0.15, 4.6 - Math.sin(k * Math.PI) * 0.6);
    camera.lookAt(x + 0.4, 1, 0);
    for (const m of machines) {
      // One loop: the input slides in from the left, the output slides out to the right.
      const c = (now / 3200 + m.phase) % 1;
      const inX = m.x - 1.3 + smooth(0, 0.45, c) * 1.3;
      const outX = m.x + smooth(0.5, 0.95, c) * 1.3;
      m.input.position.set(inX, BELT_Y + 0.1, 0.1);
      m.output.position.set(outX, BELT_Y + 0.1, 0.1);
      m.input.visible = c < 0.42; // swallowed by the machine
      m.output.visible = c > 0.55;
    }
  }
  return { scene, camera, resize, update, duration: 4.2 };
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

// 05 Contact: an orange light in the dark, his handles orbiting it like the lines of a tune.
export function createContactScene() {
  const { scene, camera, resize } = base(0x050505, [6, 16]);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 64, 32), new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false }));
  core.position.y = 1.5;
  scene.add(core);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.81, 128), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  halo.position.y = 1.5;
  scene.add(halo);

  const items = [...links.map((l) => [l.label, l.handle]), ['微信', '扫码添加']];
  const cards = items.map(([label, handle], i) => {
    const card = textPlane([[label, MONO(64), '#ff5b14'], [handle, BOLD(130), '#ffffff']], { width: 1.5, align: 'center' });
    scene.add(card);
    return { card, a: (i / items.length) * Math.PI * 2, tilt: (i % 2 ? 1 : -1) * 0.35 };
  });
  const title = textPlane([['Let’s jam.', BOLD(170), '#ffffff']], { width: 2.8, align: 'center' });
  title.position.set(0, 2.95, 0);
  scene.add(title);

  // A little dust around the light.
  const N = 500, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pos.set([(Math.random() - 0.5) * 12, Math.random() * 5, (Math.random() - 0.5) * 12], i * 3);
  scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.6 })));

  function update(t, pointer, now) {
    const k = ease(t);
    camera.position.set(pointer.sx * 0.3, 1.7 - pointer.sy * 0.15, 7 - k * 3.4);
    camera.lookAt(0, 1.65, 0);
    const pulse = 1 + Math.sin(now * 0.003) * 0.04;
    core.scale.setScalar(pulse);
    halo.lookAt(camera.position);
    halo.scale.setScalar(1 + smooth(0, 1, (now % 2400) / 2400) * 0.8);
    halo.material.opacity = 0.5 * (1 - (now % 2400) / 2400);
    for (const c of cards) {
      const a = c.a + now * 0.00025 + t * 1.2;
      c.card.position.set(Math.cos(a) * 2.1, 1.5 + Math.sin(a) * c.tilt * 2.1, Math.sin(a) * 2.1);
      c.card.quaternion.copy(camera.quaternion);
    }
    title.quaternion.copy(camera.quaternion);
  }
  return { scene, camera, resize, update, duration: 3.8 };
}
