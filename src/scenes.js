import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { credits, tools, parlour } from './content.js';

// The small worlds behind the doors. About and Tools are places you stay and look around;
// Parlour plays once (t: 0..1) on the way to its page.
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
  return { scene, camera, resize, sun };
}

// Worlds you stay in (About, Tools) share this: an intro from the door to an overview, a `view`
// (0..1) you move with scroll or drag, and things to point at.
function interactive(camera, targets) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  return (x, y) => {
    ndc.set(x, -y);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(targets.map((t) => t.mesh), true)[0];
    if (!hit) return null;
    return targets.find((t) => { let o = hit.object; while (o) { if (o === t.mesh) return true; o = o.parent; } return false; }) || null;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
const shadowSun = (sun, cx, cz, r) => {
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.5, far: 60 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.target.position.set(cx, 0, cz);
  sun.parent.add(sun.target);
};
const shadowGround = (scene, opacity, z = 0) => {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity }));
  g.rotation.x = -Math.PI / 2;
  g.position.z = z;
  g.receiveShadow = true;
  scene.add(g);
};

// A flat square label for the top of a plate: number, then title.
function plateTexture(no, title, en) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.font = MONO(96);
  ctx.fillStyle = '#ff5b14';
  ctx.fillText(no, 90, 190);
  ctx.font = BOLD(150);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillText(title, 84, 800);
  ctx.font = MONO(40);
  ctx.fillStyle = '#9a9a9a';
  ctx.fillText(en.toUpperCase(), 90, 900);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// 01 About: his life as a path seen from above, running away from you into the distance.
// Four chapters branch off it, flat on the ground; click one to see its photo.
export function createAboutScene() {
  const { scene, camera, resize, sun } = base(0xf1f0ec, [14, 34]);
  shadowSun(sun, 0, -11, 18);
  sun.position.set(7, 16, -3);
  shadowGround(scene, 0.09, -11);
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a3a3a, toneMapped: false }); // tops read pure white
  const orange = new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false });
  const solid = (geo, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const Z_START = 3, Z_END = -25;
  const SPINE_H = 0.22;
  solid(new THREE.BoxGeometry(1.3, SPINE_H, Z_START - Z_END), white, 0, SPINE_H / 2, (Z_START + Z_END) / 2);
  // Orange dashes walking down the middle of the path.
  const GAP = 0.5, dashes = [];
  for (let i = 0; i < (Z_START - Z_END) / GAP; i++) dashes.push(solid(new THREE.BoxGeometry(0.05, 0.006, 0.24), orange, 0, SPINE_H + 0.003, 0));

  const targets = credits.map((c, i) => {
    const s = i % 2 ? 1 : -1;
    const z = -2 - i * 6.2;
    solid(new THREE.BoxGeometry(2.4, 0.14, 0.5), white, s * 1.85, 0.07, z);
    for (let x = 0.9; x < 3.1; x += 0.5) solid(new THREE.BoxGeometry(0.24, 0.005, 0.05), orange, s * x, 0.143, z);
    const plate = new THREE.Group();
    plate.position.set(s * 4.3, 0, z);
    scene.add(plate);
    solid(new THREE.BoxGeometry(2.5, 0.3, 2.5), white, 0, 0.15, 0, plate);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: plateTexture(c.no, c.title, c.en.split(' · ')[0]), transparent: true, toneMapped: false }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.302;
    plate.add(top);
    // A pin where the branch meets the plate, pulsing gently.
    const pin = solid(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 32), orange, -s * 1.05, 0.32, 0, plate);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.14, 48), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-s * 1.05, 0.305, 0);
    plate.add(ring);
    return { mesh: plate, ring, lift: 0, z, photo: c.photo, no: c.no, title: c.title, role: c.role, hint: `${c.no} ${c.title} · 点开看照片` };
  });
  const pick = interactive(camera, targets);
  let hovered = null;

  const from = new THREE.Vector3(), at = new THREE.Vector3(), look = new THREE.Vector3();
  function update(view, pointer, now, dt, intro = 1) {
    // Overview: high above the path, looking down and ahead. Portrait screens stand further back.
    // On a tall screen, look more straight down: the path then runs up the screen.
    const tall = camera.aspect < 1;
    const fz = tall ? lerp(-6, -14, view) : lerp(-3, -17, view);
    if (tall) at.set(pointer.sx * 0.5, 22 - pointer.sy * 0.4, fz + 6);
    else at.set(pointer.sx * 0.5, 7 - pointer.sy * 0.4, fz + 9);
    look.set(0, 0, fz - (tall ? 1.5 : 3));
    scene.fog.near = tall ? 30 : 14;
    scene.fog.far = tall ? 60 : 34;
    // Intro: from standing at the start of the path, rise into the overview.
    const k = ease(intro);
    from.set(0, 1.5, 5);
    camera.position.lerpVectors(from, at, k);
    camera.lookAt(lerp(0, look.x, k), lerp(1.1, look.y, k), lerp(-3, look.z, k));

    for (const [i, d] of dashes.entries()) d.position.z = Z_START - 0.2 - ((i * GAP + now * 0.0004) % (Z_START - Z_END - 0.4));
    hovered = intro >= 1 ? pick(pointer.x, pointer.y) : null;
    const e = 1 - Math.exp(-10 * dt);
    for (const t of targets) {
      t.lift += ((t === hovered ? 1 : 0) - t.lift) * e;
      t.mesh.position.y = t.lift * 0.14;
      const p = (now * 0.0006 + t.z * 0.1) % 1;
      t.ring.scale.setScalar(1 + p * 2.2);
      t.ring.material.opacity = 1 - p;
    }
  }
  return { scene, camera, resize, update, pick, interactive: true, get hovered() { return hovered; } };
}

// 02 Tools: a quiet production line in cream and mist blue. Blank tiles ride the belt through
// four machines and come out a little bluer each time. Point at a machine to see what it does,
// click it to open the tool.
export function createToolsScene() {
  const { scene, camera, resize, sun } = base(0xf2efe9);
  shadowSun(sun, 0, 0, 9);
  sun.position.set(-3, 10, 6);
  shadowGround(scene, 0.07);
  const MIST = new THREE.Color(0x8fa8bd);
  const shell = new THREE.MeshLambertMaterial({ color: 0xfdfcfa, emissive: 0x3a3936, toneMapped: false });
  const bed = new THREE.MeshLambertMaterial({ color: 0xd9e2ea, emissive: 0x2c3540, toneMapped: false });
  const solid = (geo, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const GAP = 2.8, BELT_Y = 0.72;
  const span = (tools.length - 1) * GAP;
  const x0 = -span / 2 - 1.9, x1 = span / 2 + 1.9;
  solid(new RoundedBoxGeometry(x1 - x0, BELT_Y - 0.02, 0.8, 4, 0.06), shell, 0, (BELT_Y - 0.02) / 2, 0);
  solid(new THREE.BoxGeometry(x1 - x0 - 0.2, 0.02, 0.52), bed, 0, BELT_Y, 0);

  const targets = tools.map((tl, i) => {
    const x = i * GAP - span / 2;
    const g = new THREE.Group();
    g.position.set(x, 0, 0);
    scene.add(g);
    for (const sx of [-1, 1]) solid(new RoundedBoxGeometry(0.16, 0.52, 0.96, 3, 0.05), shell, sx * 0.64, BELT_Y + 0.26, 0, g);
    const head = new THREE.Group();
    g.add(head);
    solid(new RoundedBoxGeometry(1.46, 0.5, 1.02, 4, 0.1), shell, 0, BELT_Y + 0.77, 0, head);
    const line = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: MIST, toneMapped: false }));
    line.position.set(0, BELT_Y + 0.6, 0.512);
    head.add(line);
    const label = textPlane([[tl.code.replace('AP-', ''), MONO(44), '#8fa8bd'], [tl.title, `600 ${96}px "Inter Tight", "PingFang SC", sans-serif`, '#2b3440']], { width: 1.25, align: 'center' });
    label.position.set(0, BELT_Y + 0.82, 0.512);
    head.add(label);
    return { mesh: g, head, line, lift: 0, x, href: tl.href, hint: `${tl.title} — ${tl.short} ↗` };
  });

  // Tiles on the belt: white going in, a step bluer after each machine.
  const tiles = [];
  for (let i = 0; i < 16; i++) {
    const m = solid(new RoundedBoxGeometry(0.26, 0.05, 0.32, 2, 0.015), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x333333, toneMapped: false }), 0, BELT_Y + 0.035, 0);
    tiles.push({ m, o: i / 16 });
  }
  const pick = interactive(camera, targets);
  let hovered = null;
  const white = new THREE.Color(0xffffff);

  function update(view, pointer, now, dt, intro = 1) {
    // Pull back until the whole line fits; if it still doesn't (phones), pan along it with `view`.
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const half = span / 2 + 1.2;
    const far = Math.min(1.9, Math.max(0.9, half / (tanH * 5.6)));
    const range = Math.max(0, half - tanH * 5.6 * far);
    const cx = lerp(-range, range, view);
    const k = ease(intro);
    const d = lerp(0.55, 1, k) * far;
    camera.position.set(cx + pointer.sx * 0.35, 0.7 + 4.6 * d - pointer.sy * 0.15, 5 * d);
    camera.lookAt(cx, 0.75, -0.1);

    for (const t of tiles) {
      const u = (now / 60000 + t.o) % 1;
      const x = x0 + 0.2 + (x1 - x0 - 0.4) * u;
      t.m.position.x = x;
      t.m.scale.setScalar(smooth(0, 0.03, u) * (1 - smooth(0.97, 1, u)) || 0.001);
      const passed = targets.filter((m) => x > m.x).length;
      t.m.material.color.lerpColors(white, MIST, passed / targets.length);
    }
    hovered = intro >= 1 ? pick(pointer.x, pointer.y) : null;
    const e = 1 - Math.exp(-10 * dt);
    for (const t of targets) {
      t.lift += ((t === hovered ? 1 : 0) - t.lift) * e;
      t.head.position.y = t.lift * 0.08;
      t.line.scale.x = 1 + t.lift * 0.25;
      t.line.material.color.lerpColors(MIST, new THREE.Color(0x4f7393), t.lift);
    }
  }
  return { scene, camera, resize, update, pick, interactive: true, get hovered() { return hovered; } };
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
