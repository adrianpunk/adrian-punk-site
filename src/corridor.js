import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { links } from './content.js';

// Inside the lens: a long dark gallery. Doors 01–04 alternate left and right, each with orange light
// at its threshold; at the far end a projector throws his contact card onto the wall.
// Black mirror floor, lines of white light, orange only where a door is.
const W = 3.4; // width
const H = 3.3; // height
const T = 0.32; // wall thickness: the depth of each door's reveal
const DOOR_W = 1.2, DOOR_H = 2.4;
const EYE = 1.6;
const Z0 = 2.5; // the wall behind you
const SIDE_Z = [-3, -7.4, -11.8, -16.2];
const ZEND = -20.6;
const ORANGE = 0xff5b14;
const BG = 0x0a0a0a;
const BASE = import.meta.env.BASE_URL;

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const labelTexture = (no, name) => canvasTexture(1024, 200, (ctx) => {
  ctx.textAlign = 'center';
  ctx.font = '500 30px "IBM Plex Mono", Menlo, monospace';
  ctx.fillStyle = '#ff5b14';
  ctx.fillText(no, 512, 44);
  ctx.font = '600 92px "Inter Tight", "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#f2f2f2';
  ctx.fillText(name, 512, 160);
});

const numberTexture = (no) => canvasTexture(256, 128, (ctx) => {
  ctx.font = '500 60px "IBM Plex Mono", Menlo, monospace';
  ctx.fillStyle = '#ff5b14';
  ctx.fillText(no, 8, 80);
});

// Light leaking under a door, fading into the corridor.
const spillTexture = () => canvasTexture(64, 256, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,91,20,.9)');
  g.addColorStop(0.3, 'rgba(255,91,20,.25)');
  g.addColorStop(1, 'rgba(255,91,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
});

// The glow the projection throws on the wall around it.
const haloTexture = () => canvasTexture(256, 256, (ctx) => {
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
});

// The projected contact card: one layout for landscape screens, one for portrait.
const LAYOUTS = {
  wide: { w: 2.72, h: 1.53, cw: 2048, ch: 1152, cy: 1.62 },
  tall: { w: 1.9, h: 2.53, cw: 1200, ch: 1600, cy: 1.52 },
};
const DISPLAY = (s, w = 800) => `${w} ${s}px "Inter Tight", "Helvetica Neue", Arial, "PingFang SC", sans-serif`;
const MONO = (s) => `500 ${s}px "IBM Plex Mono", Menlo, monospace`;

// Draws the card and returns where its links are (canvas pixels).
function drawCard(ctx, L, img) {
  const tall = L === LAYOUTS.tall;
  const { cw, ch } = L;
  ctx.fillStyle = '#f4f2ee';
  ctx.fillRect(0, 0, cw, ch);
  // A projector's hot spot: brighter in the middle, falling off to the corners.
  const v = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.2, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.14)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, cw, ch);

  const m = tall ? 90 : 120;
  const av = tall ? 150 : 168;
  if (img.avatar) {
    ctx.imageSmoothingEnabled = false;
    ctx.filter = 'grayscale(1) contrast(1.2)';
    ctx.drawImage(img.avatar, m, m, av, av);
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = true;
  }
  ctx.fillStyle = '#0a0a0a';
  ctx.font = DISPLAY(tall ? 64 : 68);
  ctx.fillText('Adrian.Punk', m + av + 40, m + av * 0.42);
  ctx.fillStyle = '#8a8a8a';
  ctx.font = MONO(tall ? 22 : 26);
  ctx.fillText('AI VISUAL CREATOR · SAXOPHONE · SHANGHAI', m + av + 42, m + av * 0.42 + (tall ? 50 : 56));

  // "Let's jam." with the orange dot.
  const jamY = tall ? 520 : 600;
  ctx.font = DISPLAY(tall ? 190 : 230);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillText('Let’s jam', m - 10, jamY);
  ctx.fillStyle = '#ff5b14';
  ctx.fillText('.', m - 10 + ctx.measureText('Let’s jam').width, jamY);

  const hits = [];
  const colW = tall ? 530 : 520;
  const y0 = tall ? 660 : 760, rowH = tall ? 140 : 150;
  links.forEach((l, i) => {
    const x = m + (i % 2) * colW, y = y0 + Math.floor(i / 2) * rowH;
    ctx.fillStyle = '#8a8a8a';
    ctx.font = MONO(tall ? 24 : 26);
    ctx.fillText(`${l.label} ↗`, x, y);
    ctx.fillStyle = '#0a0a0a';
    ctx.font = DISPLAY(tall ? 46 : 52, 700);
    ctx.fillText(l.handle, x, y + (tall ? 58 : 64));
    hits.push({ x, y: y - 36, w: colW - 30, h: rowH - 20, href: l.href, label: `${l.label} · ${l.handle}` });
  });

  // The WeChat QR, big enough to scan straight off the wall.
  const q = tall ? { x: m, y: 980, s: 440 } : { x: cw - m - 420, y: 280, s: 420 };
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(q.x - 16, q.y - 16, q.s + 32, q.s + 32);
  if (img.qr) ctx.drawImage(img.qr, q.x, q.y, q.s, q.s);
  ctx.fillStyle = '#0a0a0a';
  ctx.font = DISPLAY(tall ? 44 : 34, 700);
  const cap = tall ? { x: q.x + q.s + 50, y: q.y + q.s / 2 } : { x: q.x - 16, y: q.y + q.s + 80 };
  ctx.fillText('微信扫一扫', cap.x, cap.y);
  ctx.fillStyle = '#ff5b14';
  ctx.font = MONO(24);
  ctx.fillText('WECHAT · 加我聊聊', cap.x, cap.y + (tall ? 50 : 44));
  if (!tall) {
    ctx.fillStyle = 'rgba(10,10,10,.14)';
    ctx.fillRect(cw - m - 520, m, 2, ch - 2 * m);
  }
  hits.push({ x: q.x - 16, y: q.y - 16, w: q.s + 32, h: q.s + 32, qr: true, label: '微信 · 放大二维码' });
  return hits;
}

export function createCorridor({ envMap, doors }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 10, 30);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.5));

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.92 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 });
  const satin = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.32, metalness: 0.4, envMap, envMapIntensity: 0.35 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.22, metalness: 1, envMap });
  const glow = new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false });
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const dimLight = new THREE.MeshBasicMaterial({ color: 0x8c8c8c, toneMapped: false });

  const box = (w, h, d, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // A frame whose local +z faces into the corridor: walls and doors are built in it.
  const frame = (x, z, ry) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
    return g;
  };
  // A solid wall of `length`, face at local z = 0, with door openings centred at `holes` (local x).
  // A thin line of light runs along its foot, broken by each door.
  const wall = (g, length, holes) => {
    let from = -length / 2;
    const run = (a, b) => {
      if (b - a < 0.01) return;
      box(b - a, H, T, wallMat, (a + b) / 2, H / 2, -T / 2, g);
      box(b - a, 0.012, 0.012, dimLight, (a + b) / 2, 0.07, 0.006, g);
    };
    for (const hx of [...holes].sort((a, b) => a - b)) {
      run(from, hx - DOOR_W / 2 - 0.08);
      for (const sx of [-1, 1]) box(0.08, H, T, wallMat, hx + sx * (DOOR_W / 2 + 0.04), H / 2, -T / 2, g);
      box(DOOR_W, H - DOOR_H, T, wallMat, hx, DOOR_H + (H - DOOR_H) / 2, -T / 2, g);
      from = hx + DOOR_W / 2 + 0.08;
    }
    run(from, length / 2);
  };

  const L = Z0 - ZEND;
  const zMid = (Z0 + ZEND) / 2;
  const sides = SIDE_Z.map((_, i) => (i % 2 ? 1 : -1)); // left, right, left, right
  const left = frame(-W / 2, zMid, Math.PI / 2); // local x = zMid − z
  const right = frame(W / 2, zMid, -Math.PI / 2); // local x = z − zMid
  const end = frame(0, ZEND, 0);
  const back = frame(0, Z0, Math.PI);
  wall(left, L, SIDE_Z.filter((_, i) => sides[i] < 0).map((z) => zMid - z));
  wall(right, L, SIDE_Z.filter((_, i) => sides[i] > 0).map((z) => z - zMid));
  wall(end, W, []);
  wall(back, W, []);

  // Floor: a dark mirror, so every line of light doubles.
  const floor = new Reflector(new THREE.PlaneGeometry(W, L), { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x5c5c5c });
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = zMid;
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, L), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, zMid);
  scene.add(ceiling);
  // Lines of light: a slot down the middle of the ceiling, and one where each wall meets it.
  box(0.1, 0.02, L - 0.8, light, 0, H - 0.01, zMid);
  for (const s of [-1, 1]) box(0.02, 0.02, L, light, s * (W / 2 - 0.012), H - 0.012, zMid);
  for (const z of [0.5, -5.2, -9.6, -14, -18.6]) {
    const p = new THREE.PointLight(0xffffff, 3.2, 7, 1.4);
    p.position.set(0, H - 0.25, z);
    scene.add(p);
  }

  // ---------- The projection at the far end ----------
  const screenCanvas = document.createElement('canvas');
  let screenTex = null;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }));
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: haloTexture(), opacity: 0.3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  screen.position.z = 0.004;
  halo.position.z = 0.002;
  end.add(screen, halo);
  const projector = new THREE.Group();
  const PZ = ZEND + 3.4, PY = H - 0.42;
  projector.position.set(0, PY, PZ);
  box(0.4, 0.15, 0.34, satin, 0, 0, 0, projector);
  box(0.02, 0.27, 0.02, satin, 0, 0.21, 0, projector);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  lens.position.set(0, 0, -0.171);
  lens.rotation.y = Math.PI;
  projector.add(lens);
  scene.add(projector);
  const beamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  const beam = new THREE.Mesh(new THREE.BufferGeometry(), beamMat);
  scene.add(beam);
  const screenLight = new THREE.PointLight(0xfff4ea, 0.5, 5, 1.5);
  screenLight.position.set(0, 1.6, ZEND + 1.2);
  scene.add(screenLight);

  const img = {};
  let layout = null, hits = [];
  const paintCard = () => {
    if (!layout) return;
    hits = drawCard(screenCanvas.getContext('2d'), layout, img);
    screenTex.needsUpdate = true;
  };
  for (const [k, src] of [['avatar', 'img/avatar.jpg'], ['qr', 'img/wechat-qr.jpg']]) {
    const im = new Image();
    im.onload = () => { img[k] = im; paintCard(); };
    im.src = `${BASE}${src}`;
  }
  document.fonts?.ready.then(paintCard);
  function setLayout(next) {
    if (layout === next) return;
    layout = next;
    screenCanvas.width = layout.cw;
    screenCanvas.height = layout.ch;
    // A canvas that changed size needs a fresh texture.
    screenTex?.dispose();
    screenTex = new THREE.CanvasTexture(screenCanvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.anisotropy = 8;
    screen.material.map = screenTex;
    screen.material.needsUpdate = true;
    screen.scale.set(layout.w, layout.h, 1);
    screen.position.y = layout.cy;
    halo.scale.set(layout.w * 2.2, layout.h * 2.4, 1);
    halo.position.y = layout.cy;
    // The beam: a pyramid from the projector's lens to the corners of the picture.
    const a = [0, PY, PZ - 0.17];
    const zc = ZEND + 0.01, x = layout.w / 2, y0 = layout.cy - layout.h / 2, y1 = layout.cy + layout.h / 2;
    const c = [[-x, y0, zc], [x, y0, zc], [x, y1, zc], [-x, y1, zc]];
    const pos = [], col = [];
    for (let i = 0; i < 4; i++) {
      pos.push(...a, ...c[i], ...c[(i + 1) % 4]);
      col.push(0.16, 0.16, 0.15, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025);
    }
    beam.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    beam.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    beam.geometry.computeBoundingSphere();
    paintCard();
  }

  // ---------- Doors ----------
  const spill = spillTexture();
  const doorItems = doors.map((d, k) => {
    const s = sides[k];
    const z = SIDE_Z[k];
    const g = frame(s * (W / 2), z, -s * Math.PI / 2);

    // A thin line of light framing the opening.
    const fx = DOOR_W / 2 + 0.11;
    box(2 * fx + 0.012, 0.012, 0.01, dimLight, 0, DOOR_H + 0.11, 0.005, g);
    for (const sx of [-1, 1]) box(0.012, DOOR_H + 0.11, 0.01, dimLight, sx * fx, (DOOR_H + 0.11) / 2, 0.005, g);

    // Behind the door: warm light, and a line of it under the leaf.
    const behind = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W * 3, DOOR_H * 1.5), glow);
    behind.position.set(0, DOOR_H / 2, -T - 1);
    g.add(behind);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, T), glow);
    under.rotation.x = -Math.PI / 2;
    under.position.set(0, 0.003, -T / 2);
    g.add(under);
    const lamp = new THREE.PointLight(ORANGE, 1.6, 2.6, 1.6);
    lamp.position.set(0, 0.15, 0.3);
    g.add(lamp);

    // The leaf sits at the back of the reveal, hinged on its left edge; opening swings it away from you.
    const hinge = new THREE.Group();
    hinge.position.set(-DOOR_W / 2 + 0.01, 0, -T + 0.03);
    g.add(hinge);
    const panel = box(DOOR_W - 0.02, DOOR_H - 0.01, 0.045, satin, DOOR_W / 2 - 0.01, DOOR_H / 2, 0, hinge);
    box(0.018, 0.62, 0.018, steel, DOOR_W - 0.14, 1.05, 0.06, hinge);
    for (const hy of [0.8, 1.3]) box(0.012, 0.012, 0.04, steel, DOOR_W - 0.14, hy, 0.035, hinge);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: numberTexture(d.no), transparent: true, toneMapped: false }));
    num.position.set(0.2, DOOR_H - 0.22, 0.024);
    hinge.add(num);

    const leak = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W * 1.1, 1.3), new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, toneMapped: false }));
    leak.rotation.x = -Math.PI / 2;
    leak.position.set(0, 0.004, 0.65);
    g.add(leak);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7 * (200 / 1024)), new THREE.MeshBasicMaterial({ map: labelTexture(d.no, d.name), transparent: true }));
    label.position.set(0, DOOR_H + 0.5, 0.01);
    g.add(label);

    // Where you stop while walking past (looking at it at an angle),
    // and the path in when you click it: square in front, then through.
    const station = { x: -s * 0.55, z: z + 2.7, yaw: -s * 0.62 };
    const stand = { x: s * (W / 2 - 1.25), z, yaw: -s * Math.PI / 2 };
    const through = { x: s * (W / 2 + 0.8), z };
    return { k, hinge, panel, light: behind, leak, open: 0, target: 0, station, stand, through, ...d };
  });

  // The first stop is just inside, looking down the whole corridor; the last faces the projection.
  const endStation = { x: 0, z: ZEND + 2.4, yaw: 0 };
  const stations = [{ x: 0, z: 1.2, yaw: 0 }, ...doorItems.map((d) => d.station), endStation];

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hitTargets = doorItems.flatMap((d) => [d.panel, d.light]);
  const cast = (x, y) => { ndc.set(x, -y); raycaster.setFromCamera(ndc, camera); };
  const hitDoor = (x, y) => {
    cast(x, y);
    const hit = raycaster.intersectObjects(hitTargets)[0];
    return hit ? doorItems.find((d) => d.panel === hit.object || d.light === hit.object) : null;
  };
  // Which link on the projection is under the pointer, if any.
  const hitScreen = (x, y) => {
    cast(x, y);
    const hit = raycaster.intersectObject(screen)[0];
    if (!hit) return null;
    const px = hit.uv.x * layout.cw, py = (1 - hit.uv.y) * layout.ch;
    return hits.find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) || null;
  };
  let hovered = null, hoveredLink = null;

  function resize(aspect, w, h) {
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 80 : 62; // portrait screens need a wider lens to see a door
    camera.updateProjectionMatrix();
    if (w) floor.getRenderTarget().setSize(Math.round(w * 0.6), Math.round(h * 0.6));
    setLayout(aspect < 1 ? LAYOUTS.tall : LAYOUTS.wide);
    // Stand back just far enough for the projection to fill most of the view.
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), halfH = halfV * aspect;
    endStation.z = ZEND + Math.max(layout.w / 2 / (0.8 * halfH), (layout.h / 2 + Math.abs(EYE - layout.cy)) / (0.82 * halfV));
  }

  // pose: { x, z, yaw } — yaw turns left for positive values. opens: extra opening per door index.
  function update({ pose, opens = {}, pointer, dt, nudge = true, pickable = true }) {
    camera.position.set(pose.x + pointer.sx * 0.1, EYE - pointer.sy * 0.05, pose.z);
    camera.rotation.set(-0.03 - pointer.sy * 0.06, pose.yaw - pointer.sx * 0.15, 0);
    camera.updateMatrixWorld();

    hovered = pickable ? hitDoor(pointer.x, pointer.y) : null;
    hoveredLink = pickable && !hovered ? hitScreen(pointer.x, pointer.y) : null;

    const ease = 1 - Math.exp(-8 * dt);
    for (const d of doorItems) {
      d.target = Math.max(nudge && d === hovered ? 0.2 : 0, opens[d.k] || 0);
      d.open += (d.target - d.open) * ease;
      d.hinge.rotation.y = d.open * 1.5;
      d.leak.material.opacity = 0.7 + d.open * 1.2;
    }
  }

  return {
    scene, camera, resize, update, pick: hitDoor, pickScreen: hitScreen, doors: doorItems, stations,
    get hovered() { return hovered; }, get hoveredLink() { return hoveredLink; },
  };
}
