import * as THREE from 'three';

// Inside the lens: a long white corridor. Doors 01–04 alternate left and right, door 05 waits at
// the far end next to a round porthole showing his LED face — the lens you came in through.
// White walls with real thickness, a black gloss floor, portal frames for rhythm, orange only as light.
const W = 3.4; // width
const H = 3.3; // height
const T = 0.32; // wall thickness: the depth of each door's reveal
const DOOR_W = 1.2, DOOR_H = 2.4;
const EYE = 1.6;
const Z0 = 2.5; // the wall behind you
const SIDE_Z = [-3, -7.4, -11.8, -16.2];
const ZEND = -20.6;
const END_DOOR_X = -0.55;
const ORANGE = 0xff5b14;

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const labelTexture = (no, name, zh) => canvasTexture(1024, 256, (ctx) => {
  ctx.textAlign = 'center';
  ctx.font = '500 34px "IBM Plex Mono", Menlo, monospace';
  ctx.fillStyle = '#ff5b14';
  ctx.fillText(`● ${no}`, 512, 48);
  ctx.font = '800 120px "Inter Tight", "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#0a0a0a';
  ctx.fillText(name, 512, 170);
  ctx.font = '500 36px "PingFang SC", "Inter", sans-serif';
  ctx.fillStyle = '#8a8a8a';
  ctx.fillText(zh, 512, 236);
});

const numberTexture = (no) => canvasTexture(256, 128, (ctx) => {
  ctx.font = '500 72px "IBM Plex Mono", Menlo, monospace';
  ctx.fillStyle = '#ff5b14';
  ctx.fillText(no, 8, 80);
});

// Light leaking under a door, fading into the corridor.
const spillTexture = () => canvasTexture(64, 256, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,91,20,.8)');
  g.addColorStop(0.25, 'rgba(255,91,20,.25)');
  g.addColorStop(1, 'rgba(255,91,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
});

export function createCorridor({ envMap, ledTexture, doors }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xededed);
  scene.fog = new THREE.Fog(0xededed, 12, 34);
  scene.environment = envMap;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1.5));
  const top = new THREE.DirectionalLight(0xffffff, 0.7);
  top.position.set(1, 6, 3);
  scene.add(top);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.95 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfb, roughness: 0.9 });
  const black = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.4 });
  const glow = new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xc9c9c9 });

  const box = (w, h, d, mat, x, y, z, parent = scene, edges = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat));
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
  const wall = (g, length, holes) => {
    let from = -length / 2;
    for (const hx of [...holes].sort((a, b) => a - b)) {
      const a = hx - DOOR_W / 2;
      if (a > from) box(a - from, H, T, wallMat, (from + a) / 2, H / 2, -T / 2, g);
      box(DOOR_W, H - DOOR_H, T, wallMat, hx, DOOR_H + (H - DOOR_H) / 2, -T / 2, g);
      from = hx + DOOR_W / 2;
    }
    box(length / 2 - from, H, T, wallMat, (from + length / 2) / 2, H / 2, -T / 2, g);
    box(length, 0.08, 0.02, black, 0, 0.04, 0.01, g); // skirting: one black line at the floor
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
  wall(end, W, [END_DOOR_X]);
  wall(back, W, []);

  // Floor: black gloss, with faint seams that pull the eye down the corridor.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.22, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = zMid;
  scene.add(floor);
  const seam = new THREE.MeshBasicMaterial({ color: 0x262626 });
  for (const x of [-W / 6, W / 6]) box(0.008, 0.002, L, seam, x, 0.001, zMid);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, zMid);
  scene.add(ceiling);
  box(0.14, 0.02, L - 1, white, 0, H - 0.01, zMid); // one long light strip down the middle

  // Portal frames between the doors: a slow rhythm of white ribs, each with an orange line on the floor.
  const ribs = [0.6, -5.2, -9.6, -14, -18.4];
  for (const z of ribs) {
    for (const s of [-1, 1]) box(0.18, H, 0.1, frameMat, s * (W / 2 - 0.05), H / 2, z, scene, true);
    box(W, 0.16, 0.18, frameMat, 0, H - 0.08, z, scene, true);
    box(W - 0.2, 0.002, 0.012, glow, 0, 0.002, z);
  }

  // The porthole at the far end: his face, seen from the inside of the lens.
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 96), black);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.42, 96), new THREE.MeshBasicMaterial({ map: ledTexture, toneMapped: false }));
  rim.position.set(0.95, 1.65, 0.005);
  glass.position.set(0.95, 1.65, 0.003);
  end.add(rim, glass);

  const spill = spillTexture();
  const doorItems = doors.map((d, k) => {
    const isEnd = k >= SIDE_Z.length;
    const s = isEnd ? 0 : sides[k];
    const z = isEnd ? ZEND : SIDE_Z[k];
    const g = isEnd ? frame(END_DOOR_X, ZEND, 0) : frame(s * (W / 2), z, -s * Math.PI / 2);

    // A thin black architrave around the opening.
    box(DOOR_W + 0.12, 0.05, 0.03, black, 0, DOOR_H + 0.025, 0.015, g);
    for (const sx of [-1, 1]) box(0.05, DOOR_H, 0.03, black, sx * (DOOR_W / 2 + 0.025), DOOR_H / 2, 0.015, g);

    // Behind the door: warm light.
    const light = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W * 3, DOOR_H * 1.5), glow);
    light.position.set(0, DOOR_H / 2, -T - 1);
    g.add(light);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, T), glow);
    under.rotation.x = -Math.PI / 2;
    under.position.set(0, 0.003, -T / 2);
    g.add(under);

    // The leaf sits at the back of the reveal, hinged on its left edge; opening swings it away from you.
    const hinge = new THREE.Group();
    hinge.position.set(-DOOR_W / 2 + 0.01, 0, -T + 0.03);
    g.add(hinge);
    const panel = box(DOOR_W - 0.02, DOOR_H - 0.01, 0.045, black, DOOR_W / 2 - 0.01, DOOR_H / 2, 0, hinge);
    const inset = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(DOOR_W - 0.3, DOOR_H - 0.5)), new THREE.LineBasicMaterial({ color: 0x2e2e2e }));
    inset.position.set(DOOR_W / 2 - 0.01, DOOR_H / 2 - 0.05, 0.024);
    hinge.add(inset);
    const handle = box(0.022, 0.55, 0.022, glow, DOOR_W - 0.14, 1.05, 0.06, hinge);
    for (const hy of [0.83, 1.27]) box(0.012, 0.012, 0.04, black, DOOR_W - 0.14, hy, 0.035, hinge);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: numberTexture(d.no), transparent: true, toneMapped: false }));
    num.position.set(0.22, DOOR_H - 0.25, 0.024);
    hinge.add(num);
    handle.userData.base = 1.05;

    const leak = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W * 1.1, 1.3), new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, toneMapped: false }));
    leak.rotation.x = -Math.PI / 2;
    leak.position.set(0, 0.004, 0.65);
    g.add(leak);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: labelTexture(d.no, d.name, d.zh), transparent: true }));
    label.position.set(0, DOOR_H + 0.46, 0.01);
    g.add(label);

    // Where you stop while walking past (looking at it at an angle),
    // and the path in when you click it: square in front, then through.
    const station = isEnd ? { x: 0, z: ZEND + 3.4, yaw: 0.08 } : { x: -s * 0.55, z: z + 2.7, yaw: -s * 0.62 };
    const stand = isEnd ? { x: END_DOOR_X, z: ZEND + 1.3, yaw: 0 } : { x: s * (W / 2 - 1.25), z, yaw: -s * Math.PI / 2 };
    const through = isEnd ? { x: END_DOOR_X, z: ZEND - 0.8 } : { x: s * (W / 2 + 0.8), z };
    return { k, hinge, panel, light, leak, open: 0, target: 0, station, stand, through, ...d };
  });

  // The first stop is just inside, looking down the whole corridor.
  const stations = [{ x: 0, z: 1.2, yaw: 0 }, ...doorItems.map((d) => d.station)];

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hitTargets = doorItems.flatMap((d) => [d.panel, d.light]);
  const hitDoor = (x, y) => {
    ndc.set(x, -y);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hitTargets)[0];
    return hit ? doorItems.find((d) => d.panel === hit.object || d.light === hit.object) : null;
  };
  let hovered = null;

  function resize(aspect) {
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 80 : 62; // portrait screens need a wider lens to see a door
    camera.updateProjectionMatrix();
  }

  // pose: { x, z, yaw } — yaw turns left for positive values. opens: extra opening per door index.
  function update({ pose, opens = {}, pointer, dt, nudge = true, pickable = true }) {
    camera.position.set(pose.x + pointer.sx * 0.1, EYE - pointer.sy * 0.05, pose.z);
    camera.rotation.set(-0.03 - pointer.sy * 0.06, pose.yaw - pointer.sx * 0.15, 0);
    camera.updateMatrixWorld();
    hovered = pickable ? hitDoor(pointer.x, pointer.y) : null;

    const ease = 1 - Math.exp(-8 * dt);
    for (const d of doorItems) {
      d.target = Math.max(nudge && d === hovered ? 0.2 : 0, opens[d.k] || 0);
      d.open += (d.target - d.open) * ease;
      d.hinge.rotation.y = d.open * 1.5;
      d.leak.material.opacity = 0.7 + d.open * 1.2;
    }
  }

  return { scene, camera, resize, update, pick: hitDoor, doors: doorItems, stations, get hovered() { return hovered; } };
}
