import * as THREE from 'three';

// Inside the lens: a hexagonal room. Five walls have a door, one per part of the site;
// the sixth has a round porthole showing his LED face — the lens you came in through.
// White walls, a black gloss floor, black doors with orange light leaking underneath.
const APOTHEM = 4; // centre of the room to the middle of each wall
const SIDE = (2 * APOTHEM) / Math.sqrt(3);
const HEIGHT = 3.6;
const DOOR_W = 1.15, DOOR_H = 2.35;
const EYE = 1.6;
const ORANGE = 0xff5b14;

// Wall k faces the centre from angle k·60°, starting straight ahead (−z) and turning right.
export const wallAngle = (k) => (k * Math.PI) / 3;

function labelTexture(no, name, zh) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function spillTexture() {
  // Light leaking under a door, fading into the room.
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,91,20,.85)');
  g.addColorStop(0.25, 'rgba(255,91,20,.3)');
  g.addColorStop(1, 'rgba(255,91,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

export function createRoom({ envMap, ledTexture, doors }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f2);
  scene.environment = envMap;
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 40);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4));
  const top = new THREE.DirectionalLight(0xffffff, 0.8);
  top.position.set(1, 5, 2);
  scene.add(top);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.95 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.45 });

  // Floor and ceiling share the hexagon.
  const hex = new THREE.Shape();
  const R = SIDE + 0.1;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    hex[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R, Math.sin(a) * R);
  }
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(hex), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.18, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.rotation.z = Math.PI / 6;
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.ShapeGeometry(hex), wallMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.rotation.z = Math.PI / 6;
  ceiling.position.y = HEIGHT;
  scene.add(ceiling);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.16, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = HEIGHT - 0.02;
  scene.add(ring);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  const spill = spillTexture();
  const doorItems = [];
  for (let k = 0; k < 6; k++) {
    const wall = new THREE.Group();
    const th = wallAngle(k);
    wall.position.set(Math.sin(th) * APOTHEM, 0, -Math.cos(th) * APOTHEM);
    wall.rotation.y = -th; // local +z faces the centre of the room
    scene.add(wall);
    const W = SIDE + 0.2, T = 0.16;
    box(W, 0.07, T + 0.02, black, 0, 0.035, 0.01, wall); // skirting: a graphic black line at the floor

    const d = doors[k];
    if (!d) {
      // The porthole: his face, seen from the inside of the lens.
      box(W, HEIGHT, T, wallMat, 0, HEIGHT / 2, 0, wall);
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 96), black);
      rim.position.set(0, 1.75, T / 2 + 0.005);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.62, 96), new THREE.MeshBasicMaterial({ map: ledTexture, toneMapped: false }));
      glass.position.set(0, 1.75, T / 2 + 0.003);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: labelTexture('00', 'Lens', '你从这里进来'), transparent: true }));
      label.position.set(0, 0.62, T / 2 + 0.01);
      wall.add(rim, glass, label);
      continue;
    }

    // Wall around the door opening.
    const side = (W - DOOR_W) / 2;
    box(side, HEIGHT, T, wallMat, -(DOOR_W + side) / 2, HEIGHT / 2, 0, wall);
    box(side, HEIGHT, T, wallMat, (DOOR_W + side) / 2, HEIGHT / 2, 0, wall);
    box(DOOR_W, HEIGHT - DOOR_H, T, wallMat, 0, DOOR_H + (HEIGHT - DOOR_H) / 2, 0, wall);
    // Thin black frame.
    box(DOOR_W + 0.08, 0.04, T + 0.02, black, 0, DOOR_H + 0.02, 0, wall);
    box(0.04, DOOR_H, T + 0.02, black, -DOOR_W / 2 - 0.02, DOOR_H / 2, 0, wall);
    box(0.04, DOOR_H, T + 0.02, black, DOOR_W / 2 + 0.02, DOOR_H / 2, 0, wall);

    // What's behind: warm light.
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W * 2.4, DOOR_H * 1.4), new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false }));
    glow.position.set(0, DOOR_H / 2, -0.9);
    wall.add(glow);

    // The door, hinged on its left edge; opening swings it away from the room.
    const hinge = new THREE.Group();
    hinge.position.set(-DOOR_W / 2, 0, -0.02);
    wall.add(hinge);
    const panel = box(DOOR_W, DOOR_H, 0.05, black, DOOR_W / 2, DOOR_H / 2, 0, hinge);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false }));
    knob.position.set(DOOR_W - 0.12, 1.05, 0.05);
    hinge.add(knob);

    const leak = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W * 1.1, 1.3), new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, toneMapped: false }));
    leak.rotation.x = -Math.PI / 2;
    leak.position.set(0, 0.004, 0.65);
    wall.add(leak);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: labelTexture(d.no, d.name, d.zh), transparent: true }));
    label.position.set(0, DOOR_H + 0.55, T / 2 + 0.01);
    wall.add(label);

    doorItems.push({ k, hinge, panel, glow, leak, open: 0, target: 0, ...d });
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hitTargets = doorItems.flatMap((d) => [d.panel, d.glow]);
  let hovered = null;

  function resize(aspect) {
    camera.aspect = aspect;
    // Portrait screens get a wider lens so a whole door still fits.
    camera.fov = aspect < 1 ? 72 : 55;
    camera.updateProjectionMatrix();
  }

  // yaw: radians turned to the right from the first door. walk: 0..1 toward wall `walkTo`.
  // opens: extra opening per wall index (on top of the hover nudge).
  function update({ yaw, walkTo = 0, walk = 0, opens = {}, pointer, dt, nudge = true }) {
    const th = wallAngle(walkTo);
    const reach = walk * (APOTHEM + 0.6);
    camera.position.set(Math.sin(th) * reach + pointer.sx * 0.12, EYE - pointer.sy * 0.06, -Math.cos(th) * reach);
    camera.rotation.set(-0.04 - pointer.sy * 0.08, -yaw - pointer.sx * 0.18, 0);

    ndc.set(pointer.x, -pointer.y);
    raycaster.setFromCamera(ndc, camera);
    const hit = walk < 0.05 ? raycaster.intersectObjects(hitTargets)[0] : null;
    hovered = hit ? doorItems.find((d) => d.panel === hit.object || d.glow === hit.object) : null;

    const ease = 1 - Math.exp(-8 * dt);
    for (const d of doorItems) {
      d.target = Math.max(nudge && d === hovered ? 0.22 : 0, opens[d.k] || 0);
      d.open += (d.target - d.open) * ease;
      d.hinge.rotation.y = d.open * 1.6;
      d.leak.material.opacity = 0.75 + d.open * 1.2;
    }
  }

  // The door under a screen point (−1..1 coordinates), for taps that never hovered.
  function pick(x, y) {
    ndc.set(x, -y);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hitTargets)[0];
    return hit ? doorItems.find((d) => d.panel === hit.object || d.glow === hit.object) : null;
  }

  return { scene, camera, resize, update, pick, doors: doorItems, get hovered() { return hovered; } };
}
