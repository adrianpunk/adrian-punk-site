import * as THREE from 'three';
import { theme } from './theme.js';

// Parlour: a round table for two under one warm lamp, a cup of coffee on it, steam rising.
// The furniture is black on the light page and cream on the dark one. It only renders while on screen.
export function createTable(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfcfcf, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-3, 7, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.radius = 5;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.12 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const wood = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
  const china = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const add = (geo, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // ---- The table: a round top on one stem and a foot.
  const TOP = 0.76;
  add(new THREE.CylinderGeometry(0.82, 0.82, 0.05, 72), wood, 0, TOP, 0);
  add(new THREE.CylinderGeometry(0.04, 0.05, TOP - 0.03, 20), wood, 0, (TOP - 0.03) / 2, 0);
  add(new THREE.CylinderGeometry(0.34, 0.36, 0.025, 56), wood, 0, 0.012, 0);

  // ---- Two chairs, facing each other across it.
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.x = s * 1.12;
    g.rotation.y = s > 0 ? Math.PI : 0;
    scene.add(g);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 48), wood, 0, 0.47, 0, g);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = add(new THREE.CylinderGeometry(0.014, 0.014, 0.47, 10), wood, Math.cos(a) * 0.17, 0.235, Math.sin(a) * 0.17, g);
      leg.rotation.set(Math.sin(a) * -0.08, 0, Math.cos(a) * 0.08);
    }
    // a bent back: a strip of a ring behind the seat, on two posts
    const back = add(new THREE.TorusGeometry(0.22, 0.016, 8, 40, Math.PI * 0.9), wood, -0.02, 0.82, 0, g);
    back.rotation.set(-Math.PI / 2, Math.PI * 0.55, 0, 'YXZ'); // laid flat, its middle turned away from the table
    for (const z of [-0.15, 0.15]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8), wood, -Math.sqrt(0.22 ** 2 - z * z) - 0.02, 0.645, z, g);
  }

  // ---- The coffee: saucer, cup (a turned profile), its handle, the coffee itself, a spoon.
  const cup = new THREE.Group();
  cup.position.set(0.12, TOP + 0.025, 0.12);
  cup.scale.setScalar(1.35);
  scene.add(cup);
  add(new THREE.CylinderGeometry(0.17, 0.12, 0.018, 48), china, 0, 0.009, 0, cup);
  const profile = [[0, 0.02], [0.05, 0.02], [0.062, 0.03], [0.075, 0.07], [0.088, 0.13], [0.092, 0.15], [0.086, 0.15], [0.082, 0.13], [0.07, 0.07], [0.058, 0.035], [0, 0.035]].map(([x, y]) => new THREE.Vector2(x, y));
  add(new THREE.LatheGeometry(profile, 48), china, 0, 0, 0, cup);
  const handle = add(new THREE.TorusGeometry(0.034, 0.009, 10, 24, Math.PI * 1.3), china, 0.094, 0.085, 0, cup);
  handle.rotation.z = -Math.PI * 0.65;
  const coffee = add(new THREE.CircleGeometry(0.084, 40), new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.2 }), 0, 0.128, 0, cup);
  coffee.rotation.x = -Math.PI / 2;
  const spoon = add(new THREE.BoxGeometry(0.15, 0.004, 0.014), new THREE.MeshStandardMaterial({ color: 0xb9b9b9, metalness: 0.9, roughness: 0.25 }), -0.04, 0.022, 0.12, cup);
  spoon.rotation.y = 0.5;

  // ---- Steam: soft puffs that rise from the cup, sway, swell and fade.
  const puff = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const steam = Array.from({ length: 22 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0xbdbdbd, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { age: i / 22, seed: Math.random() * 10 };
    cup.add(s);
    return s;
  });

  // ---- The lamp: a cord, a shade, a warm bulb lighting the table.
  const LAMP = 1.95;
  add(new THREE.CylinderGeometry(0.004, 0.004, 2, 6), wood, 0, LAMP + 1, 0).castShadow = false;
  const shade = add(new THREE.SphereGeometry(0.2, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5, side: THREE.DoubleSide }), 0, LAMP, 0);
  shade.castShadow = false;
  const bulb = add(new THREE.SphereGeometry(0.05, 20, 12), new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false }), 0, LAMP - 0.02, 0);
  bulb.castShadow = false;
  const lamp = new THREE.PointLight(0xffe2b8, 2.2, 4, 1.4);
  lamp.position.set(0, LAMP - 0.08, 0);
  scene.add(lamp);

  // ---- Colours for the two themes.
  theme.onChange((dark) => {
    wood.color.set(dark ? 0xe8e3d8 : 0x141414);
    shade.material.color.set(dark ? 0xe8e3d8 : 0x141414);
    ground.material.opacity = dark ? 0.45 : 0.12;
    hemi.intensity = dark ? 0.9 : 1.5;
    steam.forEach((s) => s.material.color.set(dark ? 0xffffff : 0xa8a8a8));
  });

  // ---- Framing and motion.
  let w = 1, h = 1, visible = false, raf = 0, last = 0, tilt = 0, tiltTo = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1.1 ? 44 : 34;
    camera.updateProjectionMatrix();
  }
  function tick(now) {
    raf = visible ? requestAnimationFrame(tick) : 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    tilt += (tiltTo - tilt) * Math.min(1, dt * 3);
    const a = 0.55 + Math.sin(now / 6000) * 0.12 + tilt * 0.35;
    camera.position.set(Math.sin(a) * 4.1, 2.3, Math.cos(a) * 4.1);
    camera.lookAt(0, 0.85, 0);
    steam.forEach((s) => {
      const u = s.userData;
      u.age = (u.age + dt / 2.6) % 1;
      const t = u.age;
      s.position.set(Math.sin(t * 5 + u.seed) * 0.035 * (1 + t * 2), 0.16 + t * 0.5, Math.cos(t * 4 + u.seed) * 0.02);
      s.scale.setScalar(0.05 + t * 0.16);
      s.material.opacity = Math.sin(Math.PI * t) * 0.32;
    });
    renderer.render(scene, camera);
  }
  const run = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tiltTo = ((e.clientX - r.left) / r.width - 0.5) * 2;
  });
  canvas.addEventListener('pointerleave', () => { tiltTo = 0; });
  resize();
  if (import.meta.env.DEV) canvas.__tick = tick; // lets a hidden preview draw a frame
}
