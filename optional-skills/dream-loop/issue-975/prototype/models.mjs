import { THREE, V3, rand, rr, uwMat } from 'abyss-engine';
import { hullTextures, tileTextures } from 'abyss-tex';

export function add(parent, geo, mat, name, p, r) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  if (p) m.position.copy(p);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function orient(o, nose, up, bank = 0) {
  const z = nose.clone().normalize(),
    x = V3().crossVectors(up, z).normalize(),
    y = V3().crossVectors(z, x);
  o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  if (bank) o.rotateZ(bank);
}
const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

export function makeMats(renderer) {
  const HT = hullTextures(renderer, { seed: 11 }),
    TT = tileTextures(renderer, {});
  const rep = (set, rx, ry) => {
    const o = {};
    for (const k in set) {
      const t = set[k].clone();
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
      o[k] = t;
    }
    return o;
  };
  const hull = (rx, ry, key) => {
    const t = rep(HT, rx, ry);
    return uwMat(
      new THREE.MeshStandardMaterial({
        name: 'weldedSteel',
        map: t.map,
        normalMap: t.normalMap,
        normalScale: new THREE.Vector2(1.2, 1.2),
        roughnessMap: t.orm,
        metalnessMap: t.orm,
        aoMap: t.orm,
        metalness: 1,
        roughness: 1,
        envMapIntensity: 0.9,
      }),
      { key }
    );
  };
  const tiles = (rx, ry) => {
    const t = rep(TT, rx, ry);
    return uwMat(
      new THREE.MeshStandardMaterial({
        name: 'anechoicTiles',
        map: t.map,
        normalMap: t.normalMap,
        roughnessMap: t.orm,
        aoMap: t.orm,
        color: 0x0c0d0f,
        metalness: 1,
        roughness: 1,
        envMapIntensity: 0.2,
        flatShading: true,
      }),
      { key: 'tile', ping: 0, echo: 2.4 }
    );
  };
  const std = (name, color, metalness, roughness, extra = {}) =>
    uwMat(
      new THREE.MeshStandardMaterial({
        name,
        color,
        metalness,
        roughness,
        envMapIntensity: 0.8,
        ...extra,
      }),
      { key: name }
    );
  return {
    hull,
    tiles,
    dark: std('darkSteel', 0x3c3f42, 0.75, 0.42),
    darkDS: std('darkSteelDS', 0x2a2c2e, 0.7, 0.5, { side: THREE.DoubleSide }),
    paint: std('hazardOchre', 0xb0641f, 0.2, 0.62),
    white: std('paintWhite', 0xb8b4aa, 0.1, 0.55),
    rubber: std('sonarRubber', 0x161b1d, 0.05, 0.75),
    foam: std('syntacticFoam', 0xd69a14, 0.0, 0.55),
    black: std('frameBlack', 0x101112, 0.4, 0.5),
    glass: std('domeGlass', 0x0a0f12, 0.9, 0.08),
    hunterDark: uwMat(
      new THREE.MeshStandardMaterial({
        name: 'hunterSteel',
        color: 0x08090a,
        metalness: 1,
        roughness: 0.45,
        envMapIntensity: 0.2,
        flatShading: true,
      }),
      { key: 'hunterSteel', ping: 0, echo: 2.4 }
    ),
    lens: glow(46, 36, 23),
    lensDim: glow(9, 7, 4.6),
    win: glow(6.5, 3.9, 1.7),
    navR: glow(12, 0.6, 0.3),
    navG: glow(0.6, 9, 2.6),
    cyan: glow(0.5, 4, 5.2),
    eye: glow(16, 0.55, 0.2),
    eyeDim: glow(3, 0.13, 0.045),
    violet: glow(1.6, 0.7, 5.5),
    torpC: glow(20, 12, 5),
    torpD: glow(4, 9, 16),
  };
}

/* ---------- Bathyarch Consortium carrier ---------- */
export function buildCarrier(M, { L, R, pods, name, rings = 12 }) {
  const g = new THREE.Group();
  g.name = name;
  const prof = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    let r;
    if (t < 0.22) {
      const k = t / 0.22;
      r = R * (0.2 + 0.8 * Math.pow(Math.sin((k * Math.PI) / 2), 0.72));
    } else if (t < 0.82) r = R * (1 - 0.015 * Math.sin(((t - 0.22) / 0.6) * Math.PI));
    else {
      const k = (t - 0.82) / 0.18;
      r = R * Math.sqrt(Math.max(0, 1 - Math.pow(k, 2.2)));
    }
    prof.push(new THREE.Vector2(Math.max(r, 0.03), (t - 0.5) * L));
  }
  const hg = new THREE.LatheGeometry(prof, 128);
  hg.rotateX(Math.PI / 2);
  add(g, hg, M.hull(1, Math.round(L / 36), name), 'pressureHull');
  // external ring frames (box section)
  const ringP = [
    [R - 0.1, -0.35],
    [R + 0.5, -0.35],
    [R + 0.5, 0.35],
    [R - 0.1, 0.35],
    [R - 0.1, -0.35],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const rg = new THREE.LatheGeometry(ringP, 96);
  rg.rotateX(Math.PI / 2);
  for (let i = 0; i < rings; i++)
    add(g, rg, M.dark, 'ringFrame', V3(0, 0, L * (-0.27 + (0.56 * i) / (rings - 1))));
  for (const z of [0.3, -0.3])
    add(
      g,
      new THREE.CylinderGeometry(R + 0.14, R + 0.14, 0.03 * L, 128, 1, true),
      M.paint,
      'hazardBand',
      V3(0, 0, z * L),
      [Math.PI / 2, 0, 0]
    );
  add(
    g,
    new THREE.CylinderGeometry(R * 0.93, R * 0.93, 0.012 * L, 96, 1, true),
    M.cyan,
    'sonarEmitterBand',
    V3(0, 0, 0.415 * L),
    [Math.PI / 2, 0, 0]
  );
  const chin = add(
    g,
    new THREE.SphereGeometry(1, 48, 24),
    M.rubber,
    'bowSonarDome',
    V3(0, -0.7 * R, 0.36 * L)
  );
  chin.scale.set(0.42 * R, 0.34 * R, 0.1 * L);
  // torpedo tube doors
  for (const s of [-1, 1])
    for (const k of [0, 1]) {
      const a = s * (0.55 + k * 0.28);
      const d = add(
        g,
        new THREE.CylinderGeometry(0.75, 0.75, 0.3, 24),
        M.black,
        'tubeDoor',
        V3(Math.sin(a) * R * 0.66, -Math.cos(a) * R * 0.66, 0.445 * L)
      );
      d.rotation.x = Math.PI / 2 - 0.45;
    }
  // sail
  const sL = 0.19 * L,
    sW = 0.46 * R,
    sH = 0.95 * R,
    sailZ = 0.25 * L,
    sailY = 0.78 * R;
  const wf = (t) =>
    t < 0.26
      ? Math.sqrt(Math.max(0, 1 - Math.pow((0.26 - t) / 0.26, 2)))
      : 1 - Math.pow((t - 0.26) / 0.74, 1.6) * 0.82;
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  for (let i = 1; i <= 32; i++) {
    const t = i / 32;
    sh.lineTo((wf(t) * sW) / 2, t * sL);
  }
  for (let i = 32; i >= 1; i--) {
    const t = i / 32;
    sh.lineTo((-wf(t) * sW) / 2, t * sL);
  }
  sh.closePath();
  const sg = new THREE.ExtrudeGeometry(sh, {
    depth: sH,
    bevelEnabled: true,
    bevelSize: 0.4,
    bevelThickness: 0.4,
    bevelSegments: 3,
    curveSegments: 3,
  });
  sg.rotateX(-Math.PI / 2);
  add(g, sg, M.hull(0.05, 0.05, name + 's'), 'sail', V3(0, sailY, sailZ));
  const top = sailY + sH + 0.4;
  for (const s of [-1, 1])
    for (let i = 0; i < 9; i++) {
      const t = 0.08 + i * 0.045;
      add(
        g,
        new THREE.BoxGeometry(0.2, 0.75, 0.85),
        rand() < 0.85 ? M.win : M.black,
        'bridgeWindow',
        V3(s * ((wf(t) * sW) / 2 + 0.42), sailY + sH * 0.84, sailZ - t * sL)
      );
    }
  const plane = new THREE.BoxGeometry(sW + 1.3 * R, 0.4, 0.075 * L);
  add(g, plane, M.dark, 'fairwaterPlanes', V3(0, sailY + sH * 0.6, sailZ - 0.05 * L));
  add(
    g,
    new THREE.SphereGeometry(0.5, 12, 8),
    M.navR,
    'navPort',
    V3(-(sW / 2 + 0.65 * R), sailY + sH * 0.6, sailZ - 0.03 * L)
  );
  add(
    g,
    new THREE.SphereGeometry(0.5, 12, 8),
    M.navG,
    'navStbd',
    V3(sW / 2 + 0.65 * R, sailY + sH * 0.6, sailZ - 0.03 * L)
  );
  for (const [dx, dz, h, r] of [
    [0, -0.05, 5.5, 0.35],
    [0.9, -0.1, 4.2, 0.28],
    [-0.8, -0.13, 6.5, 0.2],
    [0.3, -0.16, 3.4, 0.5],
  ])
    add(
      g,
      new THREE.CylinderGeometry(r, r, h, 12),
      M.dark,
      'mast',
      V3(dx, top + h / 2, sailZ - (0.08 - dz) * sL)
    );
  add(
    g,
    new THREE.SphereGeometry(0.42, 10, 8),
    M.navR,
    'mastLight',
    V3(-0.8, top + 6.6, sailZ - 0.21 * sL)
  );
  add(
    g,
    new THREE.BoxGeometry(2.4, 0.8, 1.1),
    M.dark,
    'radarHead',
    V3(0.3, top + 3.6, sailZ - 0.24 * sL)
  );
  // deck works
  add(
    g,
    new THREE.BoxGeometry(0.4 * R, 0.28 * R, 0.46 * L),
    M.dark,
    'deckSpine',
    V3(0, 0.92 * R, -0.08 * L)
  );
  for (const s of [-1, 1])
    for (const k of [0.3, 0.42])
      add(
        g,
        new THREE.CylinderGeometry(0.06 * R, 0.06 * R, 0.52 * L, 14),
        M.dark,
        'deckPipe',
        V3(s * k * R, 0.95 * R - (k - 0.3) * R, -0.08 * L),
        [Math.PI / 2, 0, 0]
      );
  for (let i = 0; i < 6; i++)
    for (const s of [-1, 1])
      add(
        g,
        new THREE.BoxGeometry(0.16 * R, 0.1 * R, 0.028 * L),
        i % 3 ? M.dark : M.paint,
        'vlsHatch',
        V3(s * 0.1 * R, 1.08 * R, 0.05 * L - i * 0.035 * L)
      );
  const collar = add(
    g,
    new THREE.CylinderGeometry(0.28 * R, 0.3 * R, 0.14 * R, 48),
    M.dark,
    'dockingCollar',
    V3(0, 1.02 * R, -0.3 * L)
  );
  add(
    g,
    new THREE.CylinderGeometry(0.2 * R, 0.2 * R, 0.02 * R, 40),
    M.win,
    'hangarGlow',
    V3(0, 1.1 * R, -0.3 * L)
  );
  add(
    g,
    new THREE.TorusGeometry(0.29 * R, 0.25, 8, 64),
    M.paint,
    'collarRim',
    V3(0, 1.09 * R, -0.3 * L),
    [Math.PI / 2, 0, 0]
  );
  // keel spine + running lights
  add(
    g,
    new THREE.BoxGeometry(0.2 * R, 0.16 * R, 0.5 * L),
    M.dark,
    'keelSpine',
    V3(0, -1.0 * R, -0.05 * L)
  );
  for (let i = 0; i < 7; i++)
    add(
      g,
      new THREE.BoxGeometry(0.25, 0.25, 0.9),
      M.win,
      'keelLight',
      V3(0, -1.09 * R, -0.28 * L + i * 0.075 * L)
    );
  // portholes
  for (const s of [-1, 1])
    for (const a of [0.9, 1.25])
      for (let i = 0; i < 22; i++) {
        if (rand() < 0.4) continue;
        const z = -0.24 * L + i * 0.023 * L;
        add(
          g,
          new THREE.BoxGeometry(0.34, 0.5, 0.72),
          M.win,
          'porthole',
          V3(s * Math.sin(a) * (R + 0.08), Math.cos(a) * (R + 0.08), z)
        );
      }
  // stern
  const fs = new THREE.Shape();
  fs.moveTo(0, 0);
  fs.lineTo(1.35 * R, -0.035 * L);
  fs.lineTo(1.35 * R, -0.085 * L);
  fs.lineTo(0, -0.125 * L);
  fs.closePath();
  const fg = new THREE.ExtrudeGeometry(fs, {
    depth: 0.7,
    bevelEnabled: true,
    bevelSize: 0.15,
    bevelThickness: 0.15,
    bevelSegments: 1,
  });
  fg.rotateX(Math.PI / 2);
  fg.translate(0, 0.35, 0);
  for (let k = 0; k < 4; k++) {
    const m = add(g, fg, M.dark, 'tailFin', V3(0, 0, -0.335 * L));
    m.rotation.z = Math.PI / 4 + (k * Math.PI) / 2;
  }
  add(
    g,
    new THREE.CylinderGeometry(0.46 * R, 0.4 * R, 0.07 * L, 64, 1, true),
    M.darkDS,
    'propulsorDuct',
    V3(0, 0, -0.505 * L),
    [Math.PI / 2, 0, 0]
  );
  add(g, new THREE.TorusGeometry(0.46 * R, 0.22, 10, 64), M.paint, 'ductRim', V3(0, 0, -0.47 * L));
  for (let k = 0; k < 9; k++) {
    const b = add(
      g,
      new THREE.BoxGeometry(0.06 * R, 0.4 * R, 0.8),
      M.dark,
      'statorVane',
      V3(0, 0, -0.5 * L)
    );
    b.rotation.z = (k / 9) * Math.PI * 2;
    b.translateY(0.22 * R);
  }
  add(g, new THREE.ConeGeometry(0.2 * R, 0.1 * L, 32), M.dark, 'hub', V3(0, 0, -0.53 * L), [
    -Math.PI / 2,
    0,
    0,
  ]);
  add(g, new THREE.SphereGeometry(0.55, 12, 8), M.win, 'sternLight', V3(0, 0.2 * R, -0.585 * L));
  // side ballast pods
  const podR = 0.42 * R,
    podX = R + podR + 1.4,
    podL = 0.5 * L;
  if (pods) {
    const pp = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const r =
        t < 0.15
          ? podR * Math.pow(Math.sin(((t / 0.15) * Math.PI) / 2), 0.6)
          : t > 0.85
            ? podR * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.85) / 0.15, 2)))
            : podR;
      pp.push(new THREE.Vector2(Math.max(r, 0.03), (t - 0.5) * podL));
    }
    const pg = new THREE.LatheGeometry(pp, 64);
    pg.rotateX(Math.PI / 2);
    const pm = M.hull(1, 3, name + 'p');
    for (const s of [-1, 1]) {
      add(g, pg, pm, 'ballastPod', V3(s * podX, -0.3 * R, 0.04 * L));
      for (let j = 0; j < 3; j++)
        add(
          g,
          new THREE.BoxGeometry(podX - 0.9 * R - 0.5 * podR, 1.0, 3.8),
          M.dark,
          'podStrut',
          V3((s * (0.9 * R + podX - 0.5 * podR)) / 2, -0.26 * R, 0.04 * L + (j - 1) * 0.15 * L)
        );
      add(
        g,
        new THREE.CylinderGeometry(podR + 0.12, podR + 0.12, 2.4, 64, 1, true),
        M.paint,
        'podBand',
        V3(s * podX, -0.3 * R, 0.04 * L + podL * 0.3),
        [Math.PI / 2, 0, 0]
      );
      for (const z of [-0.12, 0.12]) {
        add(
          g,
          new THREE.CylinderGeometry(0.9, 1.1, 1.2, 20),
          M.dark,
          'ventValve',
          V3(s * podX, -0.3 * R + podR + 0.3, z * L)
        );
      }
      add(
        g,
        new THREE.CylinderGeometry(podR * 0.45, podR * 0.5, 1.6, 32, 1, true),
        M.darkDS,
        'podThruster',
        V3(s * podX, -0.3 * R, 0.04 * L - podL / 2 - 0.4),
        [Math.PI / 2, 0, 0]
      );
      add(
        g,
        new THREE.CircleGeometry(podR * 0.4, 24),
        M.violet,
        'thrusterGlow',
        V3(s * podX, -0.3 * R, 0.04 * L - podL / 2 - 0.3),
        [0, Math.PI, 0]
      );
    }
  }
  g.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshBasicMaterial) {
      o.castShadow = false;
    }
  });
  return { g, L, R, sailZ, sailY, sH, podX, podR, podL };
}

/* lamp head: housing + cooling fins + lens; returns world lens position */
export function addLampHead(M, parent, lp, wdir, size = 1) {
  parent.updateMatrixWorld(true);
  const ld = wdir.clone().normalize().transformDirection(parent.matrixWorld.clone().invert());
  const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), ld);
  const h = add(
    parent,
    new THREE.CylinderGeometry(1.05 * size, 1.3 * size, 2.0 * size, 20),
    M.dark,
    'lampHousing',
    lp
  );
  h.quaternion.copy(q);
  for (let i = 0; i < 4; i++) {
    const f = add(
      parent,
      new THREE.CylinderGeometry(1.45 * size, 1.45 * size, 0.12 * size, 20),
      M.dark,
      'lampFin',
      lp.clone().addScaledVector(ld, (-0.8 + i * 0.35) * size)
    );
    f.quaternion.copy(q);
  }
  const l = add(
    parent,
    new THREE.CircleGeometry(0.92 * size, 24),
    M.lens,
    'lampLens',
    lp.clone().addScaledVector(ld, 1.02 * size)
  );
  l.quaternion.setFromUnitVectors(V3(0, 0, 1), ld);
  l.castShadow = false;
  parent.updateMatrixWorld(true);
  return l.getWorldPosition(V3()).addScaledVector(wdir.clone().normalize(), 0.3);
}

/* ---------- work-class ROV ---------- */
export function buildROV(M) {
  const g = new THREE.Group();
  g.name = 'ConsortiumROV';
  add(g, new THREE.BoxGeometry(3.4, 1.1, 4.6), M.foam, 'buoyancyBlock', V3(0, 1.25, 0));
  for (const x of [-1.6, 1.6])
    for (const y of [-0.9, 0.6])
      add(g, new THREE.BoxGeometry(0.16, 0.16, 4.6), M.black, 'frameRail', V3(x, y, 0));
  for (const z of [-2.2, 0, 2.2])
    for (const x of [-1.6, 1.6])
      add(g, new THREE.BoxGeometry(0.16, 1.6, 0.16), M.black, 'framePost', V3(x, -0.15, z));
  for (const [x, z, a] of [
    [-1.9, 1.6, 0.6],
    [1.9, 1.6, -0.6],
    [-1.9, -1.6, -0.6],
    [1.9, -1.6, 0.6],
  ]) {
    const t = add(
      g,
      new THREE.CylinderGeometry(0.42, 0.42, 0.9, 20, 1, true),
      M.darkDS,
      'thruster',
      V3(x, 0, z)
    );
    t.rotation.set(Math.PI / 2, 0, a);
  }
  add(
    g,
    new THREE.CylinderGeometry(0.4, 0.4, 0.7, 20, 1, true),
    M.darkDS,
    'vThruster',
    V3(0, 1.1, 0)
  );
  add(g, new THREE.SphereGeometry(0.42, 20, 12), M.glass, 'cameraDome', V3(0, -0.3, 2.4));
  add(g, new THREE.BoxGeometry(2.8, 0.7, 3.2), M.dark, 'skid', V3(0, -0.85, 0));
  const arm = new THREE.Group();
  arm.position.set(0.9, -0.6, 2.3);
  g.add(arm);
  add(
    arm,
    new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10),
    M.white,
    'armUpper',
    V3(0, -0.3, 0.6),
    [1.0, 0, 0]
  );
  add(
    arm,
    new THREE.CylinderGeometry(0.11, 0.11, 1.3, 10),
    M.white,
    'armLower',
    V3(0, -0.9, 1.5),
    [0.3, 0, 0]
  );
  add(arm, new THREE.BoxGeometry(0.3, 0.2, 0.5), M.dark, 'gripper', V3(0, -1.5, 1.7));
  return g;
}

/* ---------- Abyssal Directorate hunter: lofted faceted manta ---------- */
function hunterGeo(L, half) {
  const NU = 22,
    NV = 14,
    pos = [],
    uvs = [],
    idx = [];
  const zN = (s) => L * 0.5 - Math.pow(s / half, 0.9) * L * 0.72,
    zT = (s) =>
      -L * 0.5 + L * 0.2 * (1 - Math.abs(s / half - 0.45) / 0.55) * (s / half < 1 ? 1 : 0);
  const T = (s) => 5.8 * Math.pow(1 - s / half, 1.6) + 0.35;
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 2 - 1,
        s = Math.abs(u) * half;
      for (let j = 0; j <= NV; j++) {
        const c = j / NV,
          z = zN(s) + (zT(s) - zN(s)) * c;
        const th =
          T(s) *
          Math.pow(Math.max(0, 1 - Math.pow(2 * c - 1, 2)), 0.65) *
          Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u), 6)));
        const ridge = side > 0 ? 0.62 : -0.38;
        pos.push(u * half, th * ridge, z);
        uvs.push((u * half) / 22, z / 22);
      }
    }
    for (let i = 0; i < NU; i++)
      for (let j = 0; j < NV; j++) {
        const a = base + i * (NV + 1) + j,
          b = a + NV + 1;
        if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  const ng = geo.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}
export function buildHunter(M) {
  const g = new THREE.Group();
  g.name = 'DirectorateHunter';
  const L = 60,
    half = 30;
  add(g, hunterGeo(L, half), M.tiles(1, 1), 'hunterHull');
  const hump = add(
    g,
    new THREE.SphereGeometry(1, 10, 6),
    M.hunterDark,
    'sensorHump',
    V3(0, 2.4, 12)
  );
  hump.scale.set(3.2, 1.6, 9);
  for (const s of [-1, 1]) {
    const e = add(
      g,
      new THREE.BoxGeometry(0.35, 0.28, 4.2),
      M.eye,
      'sensorEye',
      V3(s * 3.3, 1.55, 20.5)
    );
    e.rotation.y = s * 0.5;
    e.castShadow = false;
    for (let i = 1; i <= 3; i++) {
      const sx = s * (6 + i * 6),
        z = L * 0.5 - Math.pow(Math.abs(sx) / half, 0.9) * L * 0.72;
      add(
        g,
        new THREE.SphereGeometry(0.22, 6, 4),
        M.eyeDim,
        'edgeLight',
        V3(sx, 0.2, z + 0.2)
      ).castShadow = false;
    }
    const fin = new THREE.Shape();
    fin.moveTo(0, 0);
    fin.lineTo(-13, 0);
    fin.lineTo(-17, 7);
    fin.closePath();
    const fgeo = new THREE.ExtrudeGeometry(fin, { depth: 0.45, bevelEnabled: false });
    fgeo.rotateY(-Math.PI / 2);
    const f = add(g, fgeo, M.hunterDark, 'tailBlade', V3(s * 3.5, 1.4, -6));
    f.rotation.z = s * -0.6;
    add(
      g,
      new THREE.CylinderGeometry(0.9, 1.1, 2.2, 16, 1, true),
      M.hunterDark,
      'pumpjet',
      V3(s * 2.2, 0.3, -28.5),
      [Math.PI / 2, 0, 0]
    );
    add(g, new THREE.CircleGeometry(0.8, 16), M.eyeDim, 'pumpjetGlow', V3(s * 2.2, 0.3, -29.5), [
      0,
      Math.PI,
      0,
    ]).castShadow = false;
  }
  add(g, new THREE.BoxGeometry(5, 0.1, 0.4), M.eyeDim, 'bayGlow', V3(0, -1.9, 4)).castShadow =
    false;
  return g;
}

/* ---------- torpedo ---------- */
export function buildTorpedo(M, consortium = true) {
  const g = new THREE.Group();
  g.name = consortium ? 'ConsortiumTorpedo' : 'DirectorateTorpedo';
  const p = [];
  const L = 8.5,
    R = 0.62;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    let r =
      t < 0.2
        ? R * Math.sqrt(t / 0.2) * (0.25 + 0.75 * Math.sqrt(t / 0.2))
        : t > 0.82
          ? R * (1 - ((t - 0.82) / 0.18) * 0.55)
          : R;
    p.push(new THREE.Vector2(Math.max(0.02, r), (0.5 - t) * L));
  }
  const bg = new THREE.LatheGeometry(p, 24);
  bg.rotateX(Math.PI / 2);
  add(g, bg, consortium ? M.white : M.hunterDark, 'torpedoBody');
  add(
    g,
    new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.4, 24, 1, true),
    consortium ? M.paint : M.eyeDim,
    'band',
    V3(0, 0, 1.2),
    [Math.PI / 2, 0, 0]
  );
  for (let k = 0; k < 4; k++) {
    const f = add(g, new THREE.BoxGeometry(0.06, 0.9, 0.9), M.dark, 'fin', V3(0, 0, -L * 0.42));
    f.rotation.z = (k * Math.PI) / 2 + Math.PI / 4;
    f.translateY(0.55);
  }
  add(g, new THREE.TorusGeometry(0.42, 0.07, 6, 20), M.dark, 'shroud', V3(0, 0, -L * 0.5));
  add(
    g,
    new THREE.CircleGeometry(0.22, 16),
    consortium ? M.torpC : M.torpD,
    'seeker',
    V3(0, 0, L * 0.5 + 0.02)
  ).castShadow = false;
  return { g, L };
}
