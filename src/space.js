import * as THREE from 'three';

// Deep space, on the far side of the lens: the most-viewed works hang along a tunnel of stars,
// most-viewed first, and a white Saturn waits at the end. Scroll (0..1) flies the camera down it;
// the faster you scroll, the longer the stars streak.
const LEAD = 16;    // open space before the first work
const SPACING = 6;  // distance between works along the tunnel
const AHEAD = 70;   // how far ahead the works start to appear

export function createSpace(works, base) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  const length = LEAD + works.length * SPACING;
  const saturnZ = -(length + 36); // where the tunnel ends
  const startZ = 8, endZ = saturnZ + 7;
  const small = matchMedia('(max-width: 900px)').matches;

  // ---- Stars: a head point plus a tail segment each, in a long cylinder around the path.
  const N = small ? 1800 : 3600;
  const stars = new Float32Array(N * 3);
  const tint = new Float32Array(N * 3);
  const palette = [[1, 1, 1], [0.92, 0.92, 0.9], [1, 0.96, 0.9], [1, 0.9, 0.8]];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.5 + Math.pow(Math.random(), 0.7) * 46;
    stars.set([Math.cos(a) * r, Math.sin(a) * r, startZ + 20 - Math.random() * (startZ + 20 - saturnZ + 40)], i * 3);
    const c = palette[Math.random() < 0.7 ? 0 : 1 + Math.floor(Math.random() * 3)];
    const b = 0.35 + Math.random() * 0.65;
    tint.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
  }
  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  headGeo.setAttribute('color', new THREE.BufferAttribute(tint, 3));
  scene.add(new THREE.Points(headGeo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, toneMapped: false })));

  const tail = new Float32Array(N * 6);
  const tailTint = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) {
    tail.set([stars[i * 3], stars[i * 3 + 1], stars[i * 3 + 2], stars[i * 3], stars[i * 3 + 1], stars[i * 3 + 2]], i * 6);
    tailTint.set([tint[i * 3], tint[i * 3 + 1], tint[i * 3 + 2], 0, 0, 0], i * 6); // bright head, dark tail
  }
  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tail, 3));
  tailGeo.setAttribute('color', new THREE.BufferAttribute(tailTint, 3));
  scene.add(new THREE.LineSegments(tailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false })));
  let streak = -1;
  const setStreak = (len) => {
    if (Math.abs(len - streak) < 0.02) return;
    streak = len;
    for (let i = 0; i < N; i++) tail[i * 6 + 5] = stars[i * 3 + 2] + len;
    tailGeo.attributes.position.needsUpdate = true;
  };

  // ---- Nebulae: a few huge soft glows, faint and colourless.
  const glow = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const nebulae = [0x8a8a8a, 0x6e6e6e, 0x9a948c, 0x7a7a7a, 0x8c8680, 0x707070];
  nebulae.forEach((color, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const a = i * 2.1;
    s.position.set(Math.cos(a) * 26, Math.sin(a) * 16, -i * (length / nebulae.length) - 20);
    s.scale.setScalar(70 + (i % 3) * 25);
    scene.add(s);
  });

  // ---- The works: covers on a golden-angle spiral round the path, tilted toward it.
  const loader = new THREE.TextureLoader();
  const top = works[0].views;
  const plane = new THREE.PlaneGeometry(1, 0.4); // the covers are 5:2
  const items = works.map((w, i) => {
    const a = i * 2.39996;
    const r = (small ? 2.1 : 3.1) + (i % 3) * 0.55;
    const z = -(LEAD + i * SPACING);
    const mat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    const mesh = new THREE.Mesh(plane, mat);
    const size = (small ? 2.2 : 2.9) * (0.7 + 0.45 * Math.pow(w.views / top, 0.35));
    mesh.scale.setScalar(size);
    mesh.position.set(Math.cos(a) * r * (small ? 0.6 : 1.25), Math.sin(a) * r * (small ? 1.3 : 0.75), z); // spread to the screen's shape
    mesh.lookAt(mesh.position.x * 0.35, mesh.position.y * 0.35, z + 12);
    mesh.userData = { href: w.href, title: w.title, src: base + w.cover, loaded: false, size, spin: (Math.random() - 0.5) * 0.08 };
    scene.add(mesh);
    return mesh;
  });
  const load = (mesh) => {
    mesh.userData.loaded = true;
    loader.load(mesh.userData.src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      mesh.material.map = tex;
      mesh.material.color.set(0xffffff);
      mesh.material.needsUpdate = true;
    });
  };

  // ---- Saturn at the end: a white planet with faint bands and a wide banded ring, lit from one side.
  const bands = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const globeMap = bands(16, 256, (g) => {
    for (let y = 0; y < 256; y++) {
      const v = 236 + Math.round(10 * Math.sin(y * 0.21) + 6 * Math.sin(y * 0.057 + 1.3));
      g.fillStyle = `rgb(${v},${v},${v - 2})`;
      g.fillRect(0, y, 16, 1);
    }
  });
  const ringMap = bands(512, 4, (g) => {
    for (let x = 0; x < 512; x++) {
      const u = x / 511; // inner edge .. outer edge
      let a = 0.55 + 0.3 * Math.sin(u * 46) * Math.sin(u * 9 + 0.6);
      if (u > 0.58 && u < 0.63) a *= 0.12;  // the gap
      a *= Math.min(1, u * 8) * Math.min(1, (1 - u) * 10);
      g.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, a)).toFixed(3)})`;
      g.fillRect(x, 0, 1, 4);
    }
  });
  const saturn = new THREE.Group();
  const globe = new THREE.Mesh(new THREE.SphereGeometry(4, 64, 48), new THREE.MeshStandardMaterial({ map: globeMap, roughness: 0.9, metalness: 0 }));
  saturn.add(globe);
  const ringGeo = new THREE.RingGeometry(5.4, 10.5, 128, 1);
  const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv; // map the texture across the ring's width
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - 5.4) / 5.1, 0.5);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringMap, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2 + 0.38;
  saturn.add(ring);
  saturn.rotation.z = 0.32;
  saturn.position.set(0, 0, saturnZ - 10);
  scene.add(saturn);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(-6, 5, saturnZ + 14);
  sun.target = saturn;
  scene.add(sun);

  // ---- Per frame.
  const pointer = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  let lastZ = startZ, speed = 0, hover = null;
  function update(s, px, py, dt, now) {
    const z = startZ + (endZ - startZ) * s;
    speed += ((Math.abs(lastZ - z) / Math.max(dt, 0.001)) - speed) * Math.min(1, dt * 6);
    lastZ = z;
    setStreak(Math.min(9, 0.15 + speed * 0.09));
    camera.position.set(Math.sin(z * 0.025) * 0.5 + px * 0.6, Math.cos(z * 0.02) * 0.3 - py * 0.4, z);
    camera.lookAt(px * 0.3, -py * 0.2, z - 20);
    camera.rotation.z += Math.sin(z * 0.01) * 0.04;
    saturn.rotation.y = now / 1000 * 0.05;
    for (const m of items) {
      const d = m.position.z - z; // negative = ahead
      if (!m.userData.loaded && d > -AHEAD - 40) load(m);
      const far = THREE.MathUtils.smoothstep(-d, 8, AHEAD); // 0 close by .. 1 at the edge of sight
      const op = d > 0.5 ? Math.max(0, 1 - (d - 0.5) / 2) : 1 - far; // and gone once passed
      m.material.opacity = op;
      m.visible = op > 0.01;
      const want = m.userData.size * (m === hover ? 1.08 : 1);
      m.scale.setScalar(m.scale.x + (want - m.scale.x) * Math.min(1, dt * 10));
      m.rotation.z += m.userData.spin * dt;
    }
  }

  // Which work is under the pointer (normalized device coords), if any.
  function pick(nx, ny) {
    pointer.set(nx, ny);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(items.filter((m) => m.visible && m.material.opacity > 0.5), false)[0];
    hover = hit ? hit.object : null;
    return hover ? hover.userData : null;
  }

  // The first few covers start loading during the dive, so the tunnel opens full.
  const warm = () => items.slice(0, 12).forEach((m) => m.userData.loaded || load(m));

  function resize(aspect) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  return { scene, camera, update, pick, resize, warm };
}
