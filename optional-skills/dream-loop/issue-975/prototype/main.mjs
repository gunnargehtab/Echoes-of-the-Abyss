import {
  THREE,
  V3,
  rand,
  rr,
  gauss,
  smooth,
  fbm,
  G,
  uwMat,
  makeEnv,
  makeJitter,
  createPipeline,
  addSpot,
  addPoint,
  glowMat,
  streakMat,
  shellMat,
  pingRingMat,
  pointCloud,
} from 'abyss-engine';
import {
  makeMats,
  buildCarrier,
  buildROV,
  buildHunter,
  buildTorpedo,
  addLampHead,
  add,
  orient,
} from 'abyss-models';
import {
  buildJelly,
  buildCtenophore,
  buildSiphonophore,
  fishSchool,
  baitBall,
  fishStream,
  benthicKit,
  instanced,
  buildChimney,
  taperTube,
  jellyMat,
} from 'abyss-life';
import { mountViewer } from './viewer.mjs';
import { batchStatic } from './geometry.mjs';
const t0 = performance.now();
const qs = new URLSearchParams(location.search);
const SCALE = Number(qs.get('scale') ?? 1);
const FRAMES = Number(qs.get('frames') ?? 64);
if (!Number.isFinite(SCALE) || SCALE < 0.5 || SCALE > 2)
  throw new Error('scale must be between 0.5 and 2');
if (!Number.isInteger(FRAMES) || FRAMES < 1 || FRAMES > 256)
  throw new Error('frames must be an integer between 1 and 256');
const W = Math.round(1920 * SCALE),
  H = Math.round(1080 * SCALE);
const canvas = document.getElementById('art');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;

/* ---------- camera + screen-space placement ---------- */
const FOV = 34;
const camera = new THREE.PerspectiveCamera(FOV, W / H, 1, 6000);
camera.rotation.order = 'YXZ';
camera.rotation.set((-14 * Math.PI) / 180, 0, (0.6 * Math.PI) / 180);
camera.updateMatrixWorld(true);
const FWD = camera.getWorldDirection(V3()),
  UP = V3(0, 1, 0);
const placeAt = (sx, sy, dist) => {
  const d = V3(sx * 2 - 1, 1 - sy * 2, 0.5)
    .unproject(camera)
    .sub(camera.position)
    .normalize();
  return camera.position.clone().addScaledVector(d, dist / d.dot(FWD));
};
const onScreen = (p, m = 0.08) => {
  const v = p.clone().project(camera);
  return v.z < 1 && Math.abs(v.x) < 1 + m && Math.abs(v.y) < 1 + m;
};
const PX = H / 2 / Math.tan((FOV * Math.PI) / 360);
const scene = new THREE.Scene(),
  fx = new THREE.Scene();
scene.environment = makeEnv(renderer);
scene.add(new THREE.HemisphereLight(0x2c4c58, 0x000000, 0.35));
const M = makeMats(renderer),
  K = benthicKit(renderer);
const pipe = createPipeline(renderer, W, H, { steps: 16 });

/* ---------- subs first (the wall is fitted around them) ---------- */
const flag = buildCarrier(M, {
  L: 150,
  R: 11,
  pods: true,
  name: 'BathyarchDreadnought',
  rings: 13,
});
const fPos = placeAt(0.6, 0.25, 250),
  nose = placeAt(0.3, 0.4, 225).sub(fPos).normalize();
flag.g.position.copy(fPos);
orient(flag.g, nose, UP, 0.08);
scene.add(flag.g);
flag.g.updateMatrixWorld(true);
const escA = buildCarrier(M, { L: 100, R: 7.5, pods: false, name: 'BathyarchEscort', rings: 8 });
escA.g.position.copy(placeAt(0.9, 0.1, 520));
orient(escA.g, nose.clone().add(V3(0.2, -0.1, 0)), UP, 0.05);
scene.add(escA.g);
escA.g.updateMatrixWorld(true);
const escB = buildCarrier(M, { L: 92, R: 7, pods: false, name: 'BathyarchEscort', rings: 8 });
escB.g.position.copy(placeAt(0.4, 0.07, 660));
orient(escB.g, nose, UP, -0.06);
scene.add(escB.g);
escB.g.updateMatrixWorld(true);
const W2 = (s, v) => s.g.localToWorld(v.clone());

/* ---------- trench wall (left) ---------- */
const FH = V3(FWD.x, 0, FWD.z).normalize(),
  T = FH.clone().applyAxisAngle(UP, (9 * Math.PI) / 180),
  Nw = V3(-T.z, 0, T.x);
const keep = [
  W2(flag, V3(0, 0, 75)),
  W2(flag, V3(-flag.podX, 0, 40)),
  W2(flag, V3(flag.podX, 0, 40)),
  W2(escB, V3(0, 0, 46)),
  W2(escB, V3(0, 0, -46)),
];
const WALLC = Math.min(
  placeAt(0.1, 0.42, 190).dot(Nw),
  Math.min(...keep.map((p) => p.dot(Nw))) - 70
);
function wallH(u, v) {
  let h = 0;
  const r1 = 1 - Math.abs(fbm(u * 0.008, v * 0.001, 3));
  h += 34 * r1 * r1;
  h +=
    9 * fbm(u * 0.035 + 4.1, v * 0.0035, 4) +
    3 * fbm(u * 0.12, v * 0.018, 3) +
    1.2 * fbm(u * 0.4, v * 0.12, 2);
  const vv = v + 30 * fbm(u * 0.005 + 2.2, v * 0.002, 2),
    k = vv / 55,
    fr = k - Math.floor(k);
  h += Math.pow(fr, 4) * Math.max(0, fbm(u * 0.012, Math.floor(k) * 0.73, 2) + 0.15) * 14;
  return h + 50 * fbm(u * 0.0018 + 9.0, v * 0.0014, 2) - 18;
}
const wallSpots = [];
{
  const Wd = 2400,
    Ht = 1500,
    SX = 520,
    SY = 300,
    U0 = 850,
    yC = -300;
  const geo = new THREE.PlaneGeometry(Wd, Ht, SX, SY),
    P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) P.setZ(i, wallH(P.getX(i) + U0, P.getY(i) + yC));
  geo.computeVertexNormals();
  const Nn = geo.attributes.normal,
    C = new Float32Array(P.count * 3);
  const base = Nw.clone().multiplyScalar(WALLC).addScaledVector(T, U0).addScaledVector(UP, yC);
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i) + U0,
      v = P.getY(i) + yC,
      ny = Nn.getY(i);
    const n1 = fbm(u * 0.03 + 1.7, v * 0.012, 3),
      st = smooth(0.1, 0.45, fbm(u * 0.03 + 7.7, v * 0.002, 3)),
      sed = smooth(0.3, 0.75, ny);
    const det = 9 * fbm(u * 0.035 + 4.1, v * 0.0035, 4),
      ao = 0.45 + 0.75 * smooth(-4.5, 4.5, det);
    let r = 0.03,
      g = 0.028,
      b = 0.026;
    const kk = 0.65 + 0.9 * (n1 + 0.5);
    r *= kk;
    g *= kk;
    b *= kk;
    r += (0.08 - r) * st * 0.5;
    g += (0.036 - g) * st * 0.5;
    b += (0.016 - b) * st * 0.5;
    r += (0.1 - r) * sed * 0.75;
    g += (0.095 - g) * sed * 0.75;
    b += (0.082 - b) * sed * 0.75;
    C[i * 3] = r * ao;
    C[i * 3 + 1] = g * ao;
    C[i * 3 + 2] = b * ao;
    if (ny > 0.62 && rand() < 0.5) {
      const wp = base
        .clone()
        .addScaledVector(T, P.getX(i))
        .addScaledVector(UP, P.getY(i))
        .addScaledVector(Nw, P.getZ(i));
      const d = wp.length();
      if (d < 520 && onScreen(wp, 0))
        wallSpots.push({
          p: wp,
          n: V3(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).applyMatrix4(
            new THREE.Matrix4().makeBasis(T, UP, Nw)
          ),
          d,
        });
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const m = new THREE.Mesh(
    geo,
    uwMat(
      new THREE.MeshStandardMaterial({
        name: 'basalt',
        vertexColors: true,
        roughness: 0.93,
        metalness: 0,
      }),
      { bump: 2.2, bumpScale: 0.22, key: 'wall' }
    )
  );
  m.name = 'TrenchWall';
  m.receiveShadow = m.castShadow = true;
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(T, UP, Nw));
  m.position.copy(base);
  scene.add(m);
}
const onWall = (sx, sy) => {
  const d = V3(sx * 2 - 1, 1 - sy * 2, 0.5)
    .unproject(camera)
    .sub(camera.position)
    .normalize();
  return d.multiplyScalar(WALLC / d.dot(Nw));
};

/* ---------- vent spur: a shelf jutting from the wall, lower-left foreground ---------- */
const LY = placeAt(0.24, 0.9, 68).y;
const CH = [
  [0.13, 0.8, 72, 16, 2.0, 5, 9],
  [0.27, 0.84, 88, 11, 1.6, 3.5, 7],
  [0.06, 0.66, 118, 22, 2.4, 6, 11],
  [0.34, 0.9, 62, 7, 1.2, 2.5, 6],
].map(([sx, sy, d, h, r, mound, mr]) => {
  const p = placeAt(sx, sy, d);
  return { lx: p.dot(Nw) - WALLC, lz: p.dot(T), h, r, mound, mr };
});
const edgeAt = (lz) =>
  Math.max(
    70 - 0.12 * (lz - 60) + 12 * fbm(lz * 0.012, 3.3, 3),
    ...CH.map((c) => c.lx + 24 - Math.abs(lz - c.lz) * 0.35)
  ) +
  5 * fbm(lz * 0.06, 1.7, 2);
function ledgeH(lx, lz) {
  let h =
    LY -
    lx * 0.05 +
    3.2 * fbm(lx * 0.03, lz * 0.03, 4) +
    1.1 * fbm(lx * 0.13, lz * 0.13, 3) +
    14 * Math.pow(Math.max(0, fbm(lx * 0.012 + 5, lz * 0.012, 2)), 2);
  for (const c of CH) {
    const d2 = (lx - c.lx) ** 2 + (lz - c.lz) ** 2;
    h += c.mound * Math.exp(-d2 / (c.mr * c.mr));
  }
  const out = lx - edgeAt(lz);
  if (out > 0)
    h -=
      330 * smooth(0, 42, out) +
      (18 * fbm(lx * 0.04, lz * 0.05, 4) + 6 * fbm(lx * 0.15, lz * 0.2, 3)) * smooth(0, 12, out);
  return h;
}
const L2W = (lx, lz, h) =>
  Nw.clone()
    .multiplyScalar(WALLC + lx)
    .addScaledVector(T, lz)
    .addScaledVector(UP, h);
const ventD = (lx, lz) => Math.min(...CH.map((c) => Math.hypot(lx - c.lx, lz - c.lz)));
{
  const LX0 = Math.min(...CH.map((c) => c.lx)) - 70,
    LZ0 = Math.min(...CH.map((c) => c.lz)) - 60;
  const geo = new THREE.PlaneGeometry(230, 400, 320, 540),
    P = geo.attributes.position,
    C = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const lx = P.getX(i) + 115 + LX0,
      lz = P.getY(i) + 200 + LZ0,
      h = ledgeH(lx, lz),
      w = L2W(lx, lz, h);
    P.setXYZ(i, w.x, w.y, w.z);
    const vd = ventD(lx, lz),
      mat = Math.exp(-vd / 9) * smooth(0.0, 0.5, fbm(lx * 0.08, lz * 0.08, 3) + 0.25),
      ox = smooth(0.15, 0.5, fbm(lx * 0.05 + 3, lz * 0.05, 3)) * Math.exp(-vd / 26);
    const n = fbm(lx * 0.06 + 9, lz * 0.06, 3),
      ao = 0.6 + 0.5 * smooth(-0.3, 0.3, fbm(lx * 0.13, lz * 0.13, 3));
    let r = 0.07 + n * 0.03,
      g = 0.066 + n * 0.028,
      b = 0.058 + n * 0.024;
    r += (0.3 - r) * ox;
    g += (0.11 - g) * ox;
    b += (0.035 - b) * ox;
    r += (0.62 - r) * mat;
    g += (0.56 - g) * mat;
    b += (0.36 - b) * mat;
    if (lx > edgeAt(lz)) {
      const k = smooth(0, 20, lx - edgeAt(lz));
      r *= 1 - 0.7 * k;
      g *= 1 - 0.7 * k;
      b *= 1 - 0.7 * k;
    }
    C.set([r * ao, g * ao, b * ao], i * 3);
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const m = new THREE.Mesh(
    geo,
    uwMat(
      new THREE.MeshStandardMaterial({
        name: 'ventShelf',
        vertexColors: true,
        roughness: 0.9,
        metalness: 0,
      }),
      { bump: 1.4, bumpScale: 0.5, key: 'ledge' }
    )
  );
  m.name = 'VentShelf';
  m.receiveShadow = m.castShadow = true;
  scene.add(m);
}
const ventTops = [];
CH.forEach((c, i) => {
  const b = L2W(c.lx, c.lz, ledgeH(c.lx, c.lz) - 1.2),
    ch = buildChimney(c.h, c.r, i * 3.1 + 1);
  ch.position.copy(b);
  ch.rotation.y = rr(0, 6);
  scene.add(ch);
  const top = b.clone().add(V3(0, c.h - 0.4, 0));
  ventTops.push(top);
  addPoint(scene, {
    pos: top.clone().add(V3(0, 1, 0)),
    color: [1, 0.42, 0.12],
    I: 14 * c.r,
    soft: 2,
    vol: 0.15,
  });
  pipe.vol.uniforms.uPl.value[i].set(top.x, top.y - 0.5, top.z, 260);
  pipe.vol.uniforms.uPlK.value[i].set(c.r * 0.55, 0.11, 1.5, 0.9);
});
pipe.vol.uniforms.uDrift.value.copy(T).multiplyScalar(-0.35).addScaledVector(Nw, 0.2);

/* ---------- benthic life on the shelf + wall ledges ---------- */
{
  const fans = [],
    sponges = [],
    anems = [],
    worms = [],
    plumes = [];
  const FANC = [
      [0.95, 0.32, 0.08],
      [0.85, 0.12, 0.1],
      [0.95, 0.55, 0.12],
      [0.9, 0.3, 0.45],
      [0.95, 0.8, 0.35],
    ],
    SPC = [
      [0.85, 0.7, 0.25],
      [0.8, 0.78, 0.62],
      [0.9, 0.45, 0.12],
      [0.75, 0.72, 0.7],
    ],
    ANC = [
      [0.95, 0.5, 0.6],
      [0.95, 0.9, 0.85],
      [0.95, 0.45, 0.2],
    ];
  const nrm = (lx, lz) => {
    const e = 0.6,
      a = L2W(lx + e, lz, ledgeH(lx + e, lz)),
      b = L2W(lx - e, lz, ledgeH(lx - e, lz)),
      c = L2W(lx, lz + e, ledgeH(lx, lz + e)),
      d = L2W(lx, lz - e, ledgeH(lx, lz - e));
    return V3().crossVectors(a.sub(b), c.sub(d)).normalize().multiplyScalar(-1);
  };
  for (let tries = 0; tries < 26000; tries++) {
    const lz = rr(Math.min(...CH.map((c) => c.lz)) - 50, 330),
      lx = rr(Math.min(...CH.map((c) => c.lx)) - 60, edgeAt(lz) - 2),
      vd = ventD(lx, lz);
    if (vd < 2.6) continue;
    const n = nrm(lx, lz);
    if (n.y < 0) n.negate();
    if (n.y < 0.7) continue;
    const p = L2W(lx, lz, ledgeH(lx, lz) - 0.15);
    if (!onScreen(p, 0.02)) continue;
    const up = n.clone().lerp(UP, 0.6).normalize();
    if (vd < 11 && worms.length < 1600) {
      for (let k = 0; k < 3; k++) {
        const q = p.clone().add(V3(gauss() * 0.5, -0.1, gauss() * 0.5)),
          s = V3(1, rr(0.8, 2.2), 1).multiplyScalar(rr(0.8, 1.3)),
          tilt = up.clone().add(V3(gauss() * 0.15, 0, gauss() * 0.15));
        worms.push({ p: q, n: tilt, s, c: [0.9, 0.87, 0.8] });
        plumes.push({ p: q, n: tilt, s, c: [1, rr(0.05, 0.2), 0.08] });
      }
      continue;
    }
    if (vd < 16) continue;
    const r = rand();
    if (r < 0.2 && fans.length < 420)
      fans.push({
        p,
        n: up.clone().add(V3(gauss() * 0.1, 0, gauss() * 0.1)),
        s: rr(0.8, 2.6),
        rot: rr(0, 6.28),
        c: FANC[(rand() * FANC.length) | 0],
      });
    else if (r < 0.42 && sponges.length < 380)
      sponges.push({
        p,
        n: up,
        s: V3(1, rr(0.8, 2.4), 1).multiplyScalar(rr(0.5, 1.4)),
        c: SPC[(rand() * SPC.length) | 0],
      });
    else if (r < 0.7 && anems.length < 700)
      anems.push({
        p,
        n: up,
        s: rr(0.3, 0.8),
        rot: rr(0, 6.28),
        c: ANC[(rand() * ANC.length) | 0],
      });
  }
  for (const w of wallSpots) {
    if (rand() > 0.35) continue;
    const up = w.n.clone().lerp(UP, 0.7).normalize(),
      sc = w.d / 90;
    if (rand() < 0.55)
      fans.push({
        p: w.p,
        n: up,
        s: rr(1.5, 3.5) * Math.max(1, sc * 0.7),
        rot: rr(0, 6.28),
        c: FANC[(rand() * FANC.length) | 0],
      });
    else
      sponges.push({
        p: w.p,
        n: up,
        s: V3(1, rr(1, 2.5), 1).multiplyScalar(rr(0.9, 1.8) * Math.max(1, sc * 0.7)),
        c: SPC[(rand() * SPC.length) | 0],
      });
  }
  const fm = instanced(K.fanG, K.fanMat, fans, 'seaFans', false);
  fm.userData.noVol = true;
  scene.add(fm);
  scene.add(instanced(K.spongeG, K.spongeMat, sponges, 'sponges'));
  scene.add(instanced(K.anemG, K.anemMat, anems, 'anemones'));
  scene.add(instanced(K.tubeG, K.tubeMat, worms, 'tubeWorms'));
  scene.add(instanced(K.plumeG, K.plumeMat, plumes, 'tubeWormPlumes'));
}

/* ---------- ROV over the vents + tether ---------- */
const rov = buildROV(M);
const rovP = placeAt(0.34, 0.5, 92);
rov.position.copy(rovP);
orient(rov, ventTops[0].clone().sub(rovP).setY(0).normalize(), UP, 0.12);
rov.rotateX(0.25);
scene.add(rov);
rov.updateMatrixWorld(true);
{
  const a = rov.localToWorld(V3(0, 1.8, -1.5)),
    b = W2(flag, V3(0, 1.1 * flag.R, -0.3 * flag.L)),
    mid = a
      .clone()
      .lerp(b, 0.45)
      .add(V3(0, -32, 0)),
    mid2 = a
      .clone()
      .lerp(b, 0.8)
      .add(V3(0, -12, 0));
  const t = new THREE.Mesh(
    taperTube(new THREE.CatmullRomCurve3([a, mid, mid2, b]), 300, 6, () => 0.22),
    M.paint
  );
  t.name = 'tether';
  t.castShadow = true;
  scene.add(t);
}

/* ---------- floodlights (first six cast volumetric shadows) ---------- */
const R = flag.R,
  L = flag.L,
  vol = [];
const lamp = (sub, lp, target, o) => {
  const dir = target.clone().sub(sub.localToWorld ? sub.localToWorld(lp.clone()) : W2(sub, lp));
  const p = addLampHead(M, sub, lp, dir, o.size || 1);
  const s = addSpot(scene, { pos: p, dir, ...o });
  if (o.shadowVol) vol.push(s);
  addGlowAt(p, 3.5 * (o.size || 1), [1, 0.8, 0.55], 5);
  return s;
};
function addGlowAt(p, size, col, I) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), glowMat(col, I));
  m.position.copy(p).addScaledVector(camera.position.clone().sub(p).normalize(), size * 0.3);
  m.quaternion.copy(camera.quaternion);
  fx.add(m);
  return m;
}
const ventMid = ventTops[0]
  .clone()
  .lerp(ventTops[2], 0.5)
  .add(V3(0, -14, 0));
lamp(flag.g, V3(-0.42 * R, -0.72 * R, 0.405 * L), ventMid, {
  angle: 0.12,
  I: 1.5e5,
  shadow: true,
  shadowVol: 1,
  size: 1.3,
});
lamp(flag.g, V3(0.42 * R, -0.72 * R, 0.405 * L), placeAt(0.7, 0.82, 520), {
  angle: 0.1,
  I: 1.5e5,
  shadow: true,
  shadowVol: 1,
  size: 1.3,
});
lamp(flag.g, V3(0, -1.0 * R, -0.12 * L), placeAt(0.57, 0.98, 430), {
  angle: 0.17,
  I: 8e4,
  shadowVol: 1,
  size: 1.2,
});
lamp(flag.g, V3(-0.97 * R, 0.1 * R, 0.26 * L), onWall(0.13, 0.3), {
  angle: 0.075,
  I: 2.2e5,
  shadow: true,
  shadowVol: 1,
  size: 1.1,
});
lamp(rov, V3(-1.0, -0.7, 2.4), ventTops[0].clone().add(V3(0, 5, 0)), {
  angle: 0.24,
  penumbra: 0.7,
  I: 3500,
  shadow: true,
  shadowVol: 1,
  size: 0.35,
});
lamp(rov, V3(1.0, -0.7, 2.4), ventTops[1].clone().add(V3(0, -6, 0)), {
  angle: 0.24,
  penumbra: 0.7,
  I: 3000,
  shadowVol: 1,
  size: 0.35,
});
lamp(escA.g, V3(0, -0.72 * escA.R, 0.405 * escA.L), placeAt(0.8, 0.7, 700), {
  angle: 0.09,
  I: 1.6e5,
  size: 1,
});
lamp(escB.g, V3(0, -0.72 * escB.R, 0.405 * escB.L), placeAt(0.42, 0.55, 520), {
  angle: 0.09,
  I: 1.6e5,
  size: 1,
});
for (const s of [-1, 1])
  lamp(
    flag.g,
    V3(s * flag.podX, -0.3 * R, 0.04 * L + flag.podL / 2 + 0.5),
    W2(flag, V3(s * flag.podX * 1.3, -60, 300)),
    { angle: 0.14, I: 5e4, size: 0.9 }
  );
lamp(flag.g, V3(0, flag.sailY + flag.sH * 0.45, flag.sailZ + 0.8), W2(flag, V3(0, -20, 300)), {
  angle: 0.12,
  I: 3e4,
  size: 0.9,
});
const spill = new THREE.PointLight(0xffc890, 2500, 0, 2);
spill.position.copy(W2(flag, V3(1.6 * R, 2.6 * R, 0.2 * L)));
scene.add(spill);
addPoint(scene, {
  pos: placeAt(0.78, 1.25, 1150),
  color: [0.25, 0.8, 0.75],
  I: 1.0e5,
  soft: 60,
  vol: 0.3,
});

/* ---------- sonar ping ---------- */
const pingC = W2(flag, V3(0, -0.75 * R, 0.37 * L));
// one wide ring, tilted down so its front sweeps into the pack; surfaces only catch it inside that sheet
const PING = { R: 110, wf: 1.5, lt: 20, slab: 20 },
  pingN = V3(0.05, Math.cos(0.8), -Math.sin(0.8)).normalize();
G.uPingC.value.copy(pingC);
G.uPingN.value.copy(pingN);
G.uPingR.value.set(PING.R, 0, 0, 0);
G.uPingW.value.set(PING.wf * 2.4, 30, PING.slab, 1);
G.uPingI.value.set(1.0, 0.35, 0, 0);
{
  const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), pingN);
  for (const [off, I, wf, body] of [
    [0, 1.4, PING.wf, 1],
    [-6, 0.15, PING.wf * 4, 0],
    [6, 0.15, PING.wf * 4, 0],
  ]) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(PING.R * 0.4, PING.R + wf * 12, 720, 1),
      pingRingMat([0.2, 1.15, 1.45], I, { R: PING.R, wf, lt: PING.lt, seed: off, body })
    );
    m.quaternion.copy(q);
    m.position.copy(pingC).addScaledVector(pingN, off);
    m.name = 'sonarRing';
    m.frustumCulled = false;
    fx.add(m);
  }
}
addPoint(scene, { pos: pingC, color: [0.3, 1, 1.2], I: 1500, soft: 3, vol: 0.25 });
addGlowAt(pingC, 10, [0.3, 1, 1.2], 2);

/* ---------- Directorate pack rising from the black ---------- */
const HUNT = [
  [0.62, 0.66, 300, 1.2],
  [0.73, 0.73, 340, 1.1],
  [0.86, 0.63, 365, 1.15],
  [0.55, 0.79, 385, 1],
  [0.94, 0.78, 420, 1.1],
  [0.66, 0.86, 460, 1],
  [0.8, 0.84, 505, 1.05],
  [0.5, 0.91, 545, 1],
  [0.97, 0.9, 565, 1.1],
  [0.72, 0.94, 625, 1],
  [0.6, 0.97, 700, 1.1],
  [0.87, 0.97, 760, 1],
  [0.45, 0.84, 650, 1],
  [0.79, 0.77, 720, 1.05],
  [0.91, 0.69, 800, 1],
  [0.68, 0.76, 880, 1.1],
  [0.56, 0.71, 830, 1],
  [0.99, 0.62, 650, 1.05],
  [0.38, 0.95, 760, 1],
];
const hproto = buildHunter(M),
  hunters = [];
for (const [sx, sy, d, s] of HUNT) {
  const h = hproto.clone();
  const p = placeAt(sx, sy, d);
  h.scale.setScalar(s);
  h.position.copy(p);
  const aim = fPos
    .clone()
    .sub(p)
    .normalize()
    .add(V3(rr(-0.15, 0.15), rr(-0.05, 0.08), rr(-0.15, 0.15)))
    .normalize();
  orient(
    h,
    aim,
    UP.clone().lerp(camera.position.clone().sub(p).normalize(), 0.25).normalize(),
    rr(-0.3, 0.3)
  );
  scene.add(h);
  h.updateMatrixWorld(true);
  hunters.push(h);
}
hunters[2].rotateZ(0.9);
hunters[2].rotateX(-0.4);
hunters[2].updateMatrixWorld(true);

/* ---------- torpedoes, bubble trails, bioluminescent wakes ---------- */
const torps = [];
function torpedo(p0, p1, { bend = V3(), c = true, bubbles = 2200 }) {
  const curve = new THREE.CatmullRomCurve3(
      [p0, p0.clone().lerp(p1, 0.5).add(bend), p1],
      false,
      'centripetal'
    ),
    tan = curve.getTangentAt(1);
  const t = buildTorpedo(M, c);
  t.g.quaternion.setFromUnitVectors(V3(0, 0, 1), tan);
  t.g.position.copy(p1);
  scene.add(t.g);
  torps.push({ g: t.g, p: p1.clone(), d: tan, blur: 3.5 });
  const col = c ? [1, 0.62, 0.3] : [0.45, 0.8, 1];
  addGlowAt(
    c ? p1.clone().addScaledVector(tan, -4.6) : p1.clone().addScaledVector(tan, 4.3),
    c ? 7 : 5,
    col,
    c ? 7 : 5
  );
  const sub = (a, b) => {
    const sp = [];
    for (let i = 0; i <= 30; i++) sp.push(curve.getPointAt(a + ((b - a) * i) / 30));
    return new THREE.CatmullRomCurve3(sp);
  };
  fx.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(sub(0.82, 0.99), 80, c ? 0.45 : 0.3, 6),
      streakMat(c ? [1, 0.7, 0.42] : [0.55, 0.85, 1], c ? 2.6 : 2)
    )
  );
  fx.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(sub(0.3, 0.985), 140, c ? 2.4 : 1.5, 8),
      streakMat(c ? [0.5, 0.42, 0.34] : [0.3, 0.5, 0.65], 0.07)
    )
  );
  const n = bubbles,
    P = new Float32Array(n * 3),
    S = new Float32Array(n),
    Tt = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.pow(rand(), 0.75) * 0.985,
      age = 1 - u,
      p = curve.getPointAt(u),
      spread = 0.5 + age * 9;
    const off = V3(gauss(), gauss(), gauss()).multiplyScalar(spread * 0.5);
    off.y += age * 12 * rand();
    P.set([p.x + off.x, p.y + off.y, p.z + off.z], i * 3);
    S[i] = (0.14 + rand() * 0.34) * (0.6 + age * 1.4);
    const hot = Math.exp(-age * 9) * (c ? 1 : 0.5);
    Tt.set([col[0] * hot + 0.015, col[1] * hot + 0.022, col[2] * hot + 0.028], i * 3);
  }
  fx.add(pointCloud(P, S, Tt, 1, PX, 'bubbleTrail'));
  const nb = 900,
    P2 = new Float32Array(nb * 3),
    S2 = new Float32Array(nb),
    T2 = new Float32Array(nb * 3);
  for (let i = 0; i < nb; i++) {
    const u = rand() * 0.97,
      p = curve.getPointAt(u),
      off = V3(gauss(), gauss(), gauss()).multiplyScalar(1.5 + (1 - u) * 11),
      f = Math.pow(rand(), 3);
    P2.set([p.x + off.x, p.y + off.y, p.z + off.z], i * 3);
    S2[i] = rr(0.05, 0.12);
    T2.set(
      [0.02 * f, 0.5 * f + 0.04, 0.7 * f + 0.06].map((v) => v * (0.4 + (1 - u))),
      i * 3
    );
  }
  fx.add(pointCloud(P2, S2, T2, 0, PX, 'bioluminescentWake'));
  return curve;
}
const tube = (s) => W2(flag, V3(s * 0.3 * R, -0.62 * R, 0.445 * L));
const boom = hunters[2].position.clone().add(V3(6, 4, 0));
torpedo(tube(-1), boom.clone().add(V3(-4, 3, 2)), { bend: V3(10, -20, 6) });
torpedo(tube(1), placeAt(0.67, 0.58, 318), { bend: V3(8, 6, 0) });
torpedo(W2(escA, V3(0, -0.6 * escA.R, 0.44 * escA.L)), placeAt(0.8, 0.46, 380), {
  bend: V3(6, 10, 0),
});
torpedo(hunters[0].localToWorld(V3(0, 0, 26)), placeAt(0.61, 0.47, 275), {
  bend: V3(-8, -4, 0),
  c: false,
  bubbles: 1300,
});
torpedo(hunters[3].localToWorld(V3(0, 0, 26)), placeAt(0.5, 0.57, 300), {
  bend: V3(-6, -8, 4),
  c: false,
  bubbles: 1300,
});

/* ---------- detonation on the lead hunter ---------- */
addPoint(scene, { pos: boom, color: [1, 0.7, 0.4], I: 3e4, soft: 8, vol: 0.12 });
{
  const fb = new THREE.Mesh(
    new THREE.SphereGeometry(7, 64, 40),
    shellMat([1, 0.62, 0.28], 1.3, 1.4, 1)
  );
  fb.position.copy(boom);
  fx.add(fb);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(3.8, 48, 32),
    shellMat([1, 0.9, 0.7], 3.6, 0.6, 0.7)
  );
  core.position.copy(boom);
  fx.add(core);
  const sh = new THREE.Mesh(
    new THREE.SphereGeometry(22, 128, 80),
    shellMat([0.7, 0.95, 1], 0.9, 16, 0.6, 0)
  );
  sh.position.copy(boom);
  fx.add(sh);
  addGlowAt(boom, 34, [1, 0.72, 0.45], 1.5);
  addGlowAt(boom, 12, [1, 0.9, 0.75], 5);
  const n = 3500,
    P = new Float32Array(n * 3),
    S = new Float32Array(n),
    Tt = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const d = V3(gauss(), gauss(), gauss()).normalize(),
      r = 6 + Math.pow(rand(), 0.6) * 26,
      p = boom.clone().addScaledVector(d, r);
    p.y += rand() * 10;
    P.set([p.x, p.y, p.z], i * 3);
    S[i] = rr(0.15, 0.6);
    const k = Math.exp(-(r - 6) / 7);
    Tt.set([k * 1.2, k * 0.7, k * 0.35], i * 3);
  }
  fx.add(pointCloud(P, S, Tt, 1, PX, 'blastBubbles'));
  for (let i = 0; i < 40; i++) {
    const d = add(
      scene,
      new THREE.BoxGeometry(rr(0.3, 2), rr(0.1, 0.4), rr(0.3, 1.6)),
      M.hunterDark,
      'debris',
      boom.clone().addScaledVector(V3(gauss(), gauss(), gauss()).normalize(), rr(5, 22)),
      [rr(0, 6), rr(0, 6), rr(0, 6)]
    );
  }
}

/* ---------- gelatinous life ---------- */
for (const [type, sx, sy, d, r] of [
  ['atolla', 0.9, 0.3, 36, 1.4],
  ['veil', 0.17, 0.2, 120, 1.7],
  ['helmet', 0.52, 0.72, 58, 0.9],
  ['atolla', 0.28, 0.33, 88, 0.9],
  ['veil', 0.98, 0.52, 110, 1.4],
]) {
  const j = buildJelly(type, r);
  j.position.copy(placeAt(sx, sy, d));
  j.rotation.set(rr(-0.35, 0.35), rr(0, 6), rr(-0.35, 0.35));
  fx.add(j);
}
const cteno = buildCtenophore(0.22);
for (let i = 0; i < 46; i++) {
  const c = cteno.clone();
  c.position.copy(placeAt(rr(0.28, 1), rr(0.18, 0.9), rr(16, 95)));
  c.rotation.set(rr(-1, 1), rr(0, 6), rr(-1, 1));
  c.scale.setScalar(rr(0.6, 1.6));
  fx.add(c);
}
fx.add(
  buildSiphonophore({
    head: placeAt(0.745, 0.05, 62),
    axis: V3(0.1, -1, -0.06),
    len: 22,
    coilR: 2.6,
    turns: 3.3,
    pxScale: PX,
    current: T.clone()
      .multiplyScalar(-0.3)
      .add(V3(0.15, 0, 0)),
  })
);

/* bioluminescent wakes: the silent pack betrays itself, stirring plankton as it climbs */
for (const h of hunters) {
  const back = V3(0, 0, -1).transformDirection(h.matrixWorld),
    d = h.position.distanceTo(camera.position),
    len = rr(70, 130),
    n = 460,
    boost = 0.6 + d / 600;
  const P = new Float32Array(n * 3),
    S = new Float32Array(n),
    Tt = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = h.localToWorld(V3(i % 2 ? 2.2 : -2.2, 0.3, -30)),
      u = Math.pow(rand(), 1.7),
      p = o
        .addScaledVector(back, u * len)
        .add(V3(gauss(), gauss(), gauss()).multiplyScalar(0.4 + u * 7));
    p.y -= u * u * 10;
    const big = rand() < 0.55,
      k = Math.exp(-u * 2.4) * (big ? 0.1 : 0.85) * (0.4 + rand()) * boost;
    P.set([p.x, p.y, p.z], i * 3);
    S[i] = big ? rr(0.8, 2) * (1 + u) : rr(0.1, 0.24);
    Tt.set([0.01 * k, 0.5 * k, 0.6 * k], i * 3);
  }
  fx.add(pointCloud(P, S, Tt, 0, PX, 'hunterWake', 0.08));
}

/* ---------- fish: bait ball in the port beam + a silver river over the shelf ---------- */
{
  const s0 = G.uSpP.value[0],
    d0 = G.uSpD.value[0],
    ctr = s0.clone().addScaledVector(d0, 88);
  scene.add(fishSchool(baitBall(ctr, 15, 2400, V3(0.3, 1, 0.2)), 1.1));
  scene.add(
    fishSchool(
      fishStream(
        new THREE.CatmullRomCurve3([
          placeAt(0.2, 0.62, 80),
          placeAt(0.4, 0.6, 108),
          placeAt(0.62, 0.67, 128),
          placeAt(0.92, 0.6, 140),
        ]),
        1500,
        3.5
      ),
      1
    )
  );
}

/* ---------- particulate: marine snow, bokeh, plankton, vent shimmer ---------- */
{
  const n = 16000,
    nb = 34,
    P = new Float32Array((n + nb) * 3),
    S = new Float32Array(n + nb),
    Tt = new Float32Array((n + nb) * 3);
  for (let i = 0; i < n + nb; i++) {
    const bok = i >= n,
      d = bok ? rr(5, 16) : 6 + Math.pow(rand(), 0.85) * 640,
      p = placeAt(rand() * 1.1 - 0.05, rand() * 1.1 - 0.05, d);
    P.set([p.x, p.y, p.z], i * 3);
    S[i] = bok ? rr(0.04, 0.09) : rr(0.035, 0.11);
    if (!bok && rand() < 0.06)
      Tt.set(
        [0.0, 0.08, 0.12].map((v) => v * rand()),
        i * 3
      );
  }
  fx.add(pointCloud(P, S, Tt, 0, PX, 'marineSnow'));
  const nv = 2400,
    P2 = new Float32Array(nv * 3),
    S2 = new Float32Array(nv),
    T2 = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    const v = ventTops[i % ventTops.length],
      h = Math.pow(rand(), 1.6) * 40,
      p = v.clone().add(V3(gauss() * (0.4 + h * 0.08), h, gauss() * (0.4 + h * 0.08)));
    P2.set([p.x, p.y, p.z], i * 3);
    S2[i] = rr(0.04, 0.12);
    const k = Math.exp(-h / 5);
    T2.set([0.5 * k, 0.16 * k, 0.03 * k], i * 3);
  }
  fx.add(pointCloud(P2, S2, T2, 1, PX, 'ventBubbles'));
}

/* ---------- render: bake beam shadows, then accumulate ---------- */
const batch = batchStatic(
  scene,
  torps.map((torpedo) => torpedo.g)
);
pipe.bakeVolShadows(scene, vol);
renderer.shadowMap.needsUpdate = true;
// Keep the authored shutter samples reproducible after a camera reset.
const motion = Array.from({ length: FRAMES }, () => torps.map(() => rand()));
mountViewer({
  renderer,
  scene,
  fx,
  camera,
  pipe,
  torps,
  motion,
  W,
  H,
  frames: FRAMES,
  builtMs: performance.now() - t0,
  batch,
});
