import * as THREE from 'three';
import { tools, sessions } from './content.js';

// Inside the lens: a dark vortex lined with every work — the four tools, then the sessions —
// twisting slowly around the flight path. A white hexagon at the far end is the way out.
const BASE = import.meta.env.BASE_URL;
const SPACING = 1.05; // metres along -z between consecutive works
const RADIUS = 1.75; // distance of the walls from the axis
const TWIST = 0.11; // radians of spiral per metre of depth
const START_Z = -3;

const two = (n) => String(n).padStart(2, '0');

function captionTexture(no, title, sub) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 168;
  const ctx = c.getContext('2d');
  ctx.font = '500 30px "IBM Plex Mono", Menlo, monospace';
  ctx.fillStyle = '#ff5b14';
  ctx.fillText(no, 0, 40);
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fillText(sub, 76, 40);
  ctx.font = '700 46px "Inter Tight", "PingFang SC", sans-serif';
  ctx.fillStyle = '#fff';
  // Wrap the title to two lines at most.
  let line = '', y = 104;
  for (const ch of title) {
    if (ctx.measureText(line + ch).width > 1000) {
      if (y > 104) { line = line.slice(0, -1) + '…'; break; }
      ctx.fillText(line, 0, y); line = ''; y += 56;
    }
    line += ch;
  }
  ctx.fillText(line, 0, y);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTunnel() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 3, 15);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 60);

  const works = [
    ...tools.map((t, i) => ({ img: t.tape, href: t.href, no: two(i + 1), sub: t.code, title: t.title, tape: true })),
    ...sessions.map((s, i) => ({ img: s.cover, href: s.href, no: two(i + 1), sub: s.meta, title: s.title })),
  ];
  const depth = -START_Z + (works.length - 1) * SPACING;
  const exitZ = START_Z - (works.length - 1) * SPACING - 4;

  const world = new THREE.Group(); // scaled in x/y on narrow screens
  scene.add(world);
  const loader = new THREE.TextureLoader();
  const items = [];

  works.forEach((w, i) => {
    const z = START_Z - i * SPACING;
    // Alternate walls, wobble up and down, and wind the whole thing into a slow spiral.
    const side = i % 2 ? 0 : Math.PI;
    const angle = side + (((i * 37) % 7) / 7 - 0.5) * 0.7 + z * TWIST;
    const g = new THREE.Group();
    g.position.set(Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS, z);
    g.lookAt(0, 0, z + 1.6); // face the axis, angled toward the approaching camera

    const width = w.tape ? 0.62 : 1.3;
    const cover = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, toneMapped: false, side: THREE.DoubleSide })
    );
    cover.scale.set(width, width * (w.tape ? 1.45 : 0.4), 1);
    loader.load(`${BASE}${w.img}`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      cover.material.map = tex;
      cover.material.color.set(0xffffff);
      cover.material.needsUpdate = true;
      cover.scale.y = width * (tex.image.height / tex.image.width);
      caption.position.y = -cover.scale.y / 2 - 0.14;
    });
    const caption = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3 * (168 / 1024)),
      new THREE.MeshBasicMaterial({ map: captionTexture(w.no, w.title, w.sub), transparent: true, toneMapped: false })
    );
    caption.position.set(0, -cover.scale.y / 2 - 0.14, 0.001);
    g.add(cover, caption);
    world.add(g);
    items.push({ g, cover, href: w.href, z, hover: 0 });
  });

  // Star streaks: white and a few orange, scattered around the walls.
  const N = 1400;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const orange = new THREE.Color(0xff5b14), white = new THREE.Color(0xffffff);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.4 + Math.random() * 5;
    pos.set([Math.cos(a) * r, Math.sin(a) * r, 4 - Math.random() * (depth + 12)], i * 3);
    col.set((Math.random() < 0.18 ? orange : white).toArray(), i * 3);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry()
      .setAttribute('position', new THREE.BufferAttribute(pos, 3))
      .setAttribute('color', new THREE.BufferAttribute(col, 3)),
    new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.9, toneMapped: false })
  );
  world.add(stars);

  // The exit: a white hexagon, unaffected by fog so it reads as light at the end.
  const hex = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    hex[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 1.2, Math.sin(a) * 1.2);
  }
  const exit = new THREE.Mesh(new THREE.ShapeGeometry(hex), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false }));
  exit.position.z = exitZ;
  scene.add(exit);

  const startZ = 2;
  const endZ = exitZ + 0.12; // the hexagon fills the screen here
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;

  function resize(aspect) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const s = THREE.MathUtils.clamp(aspect * 0.95, 0.5, 1);
    world.scale.set(s, s, 1);
  }

  // t: 0 at the lens, 1 at the exit.
  function update(t, pointer, now, dt) {
    camera.position.set(pointer.sx * 0.25, -pointer.sy * 0.18, startZ + (endZ - startZ) * t);
    camera.rotation.set(-pointer.sy * 0.06, -pointer.sx * 0.1, t * 0.9);
    world.rotation.z = Math.sin(now * 0.0002) * 0.05;
    exit.rotation.z = t * 1.4;

    ndc.set(pointer.x, -pointer.y);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(items.map((it) => it.cover))[0];
    hovered = hit ? items.find((it) => it.cover === hit.object) : null;
    const ease = 1 - Math.exp(-10 * dt);
    for (const it of items) {
      it.hover += ((it === hovered ? 1 : 0) - it.hover) * ease;
      it.g.scale.setScalar(1 + it.hover * 0.08);
    }
  }

  // Which work the camera is passing, 1-based.
  const indexAt = (t) => {
    const z = startZ + (endZ - startZ) * t;
    return THREE.MathUtils.clamp(Math.round((START_Z - z) / SPACING) + 1, 1, works.length);
  };

  return { scene, camera, update, resize, indexAt, count: works.length, get hovered() { return hovered; } };
}
