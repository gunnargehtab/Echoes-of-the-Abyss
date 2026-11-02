/**
 * The kelp stand — 120 m of footprint, the dense stand of forty-metre
 * stalks docs/free-water-slice.md §5 commissions for the northern garden of
 * #1694's crater fixture (#1712): "commission `env-kelp-stand`, a denser
 * stand of 40 m stalks within a 120 m footprint", beside the retained
 * `env-kelp-cluster`, which this file leaves untouched.
 *
 * "Kelp Forest | env-kelp-stand | 120 m | 40 m | ≤ 1,200 | `flora-biolight`,
 * tip points" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE:
 * "Natural or ruined form — stone, coral, kelp ... nothing manufactured ...
 * low-poly with crisp facets, at most two materials", the one licensed
 * light being `flora-biolight` at the tips. Two materials, the cluster's
 * `kelp` and `biolight` to the digit; 1,152 triangles; 39.9 m tall at its
 * 120 m by intake's measure (`sizeM`), the row's 40 m, which takes `--world-light flora
 * --max-tris 1200` for this row (hull-intake's default cap is the
 * registry's 800, which #1713 raises for stands alone).
 *
 * Authored as a formula rather than ported: there is no export, as the
 * nodule bed has none (#1555). Every number below is drawn from one seeded
 * stream (seabed.mjs `seeded`, seed 1712) in the order the parts are built,
 * so the file is the same on every machine and `npm run check:models` holds
 * the script to it. The whole is built at a nominal size and held at the
 * footprint before the bake (seabed.mjs `bake`), so the root is an identity
 * and seabed.mjs `stand` finds ×1.000; the figures below are the file's,
 * after that fit.
 *
 * What it is made of, and why this shape. The slice wants "dense kelp
 * without suggesting collision or cover": a stand a hull reads as forest
 * and never as a wall. So the stand is twelve clumps, each a holdfast with
 * three to five stalks rooted beside it, set apart across the plan with
 * open water between them — the gaps are what say "no cover" — and the
 * stalks are the cluster's vocabulary at the slice's height: open-ended
 * columns of rings, leaning down-current, with blades standing off them and
 * a lit tip on each clump's tallest. Nothing closes over the plan: there is
 * no canopy, no mass wider than a holdfast at the ground, and the tallest
 * thing is a stalk a hull passes beside.
 *
 * - Twelve `holdfast_NN`, in `kelp`: octahedra (seabed.mjs `octa`, 8
 *   triangles — the cluster's are icosahedra, and the twelve extra triangles
 *   each would cost went to stalks) under a scale triple 2.2–3.4 by 0.8–1.3
 *   by 1.8–2.8 m nominal,
 *   yawed, each sat with its lowest vertex on y = 0 as the cluster's are.
 *   The first two stand off the plan's ±x ends and carry the footprint; the
 *   other ten are drawn inside an ellipse 100 by 80 m nominal and redrawn
 *   while any would stand within 18 m of one already set, so no two clumps
 *   merge. 96 triangles.
 * - Forty-eight `stalk_NN`, in `kelp`: a column of four three-cornered rings
 *   from the foot to the head (seabed.mjs `column` with its foot cap taken
 *   off, so a stalk is open at both ends as the cluster's stipes are),
 *   three bands, 18 triangles each, 864 in all. Each clump's stalk count is
 *   fixed (5, 4, 4, 3, 5, 4, 3, 4, 4, 4, 4, 4) so the budget is the script's and
 *   not the stream's. A stalk's foot ring sits on y = 0 within 0.8–3 m of
 *   its holdfast's centre, 0.55–0.8 m in radius, and narrows to 0.2 m at
 *   the head; every ring but the foot wanders up to 0.4 m in height and
 *   every corner 8 % in radius, and each stalk's corners start at their
 *   own bearing, so no two show the same facet. Heights: each clump's
 *   tallest stalk is drawn at 88–100 % of the stand's top and the rest at
 *   60–92 % of it, so the stand steps rather than crops level. Every stalk
 *   leans down-current (+x, the cluster's lean) by 12–24 % of its height at
 *   the head, within ±0.5 rad of that bearing, bending as t^1.6 so the foot
 *   stands near-vertical and the head carries the lean. The script checks
 *   every band faces out of its stalk before it writes.
 * - Forty-eight `blade_NN`, in `kelp`: the cluster's five-point blade — a
 *   quad fanned from its first corner and a tip triangle off the far edge, 3
 *   triangles — one on every stalk, each rooted
 *   on the stalk's surface at 40–80 % of its height, 3–7 m long, 1–1.8 m
 *   wide, rising 0.3–0.6 rad from level at a bearing of its own. 144
 *   triangles.
 * - Twelve `biolight_NN`, in `biolight`: three's tetrahedron (seabed.mjs
 *   `tetra`) at the cluster's `TIP` of 0.6 (#890), one at the head of each
 *   clump's tallest stalk, centred 0.15 m over the head ring so the tetra
 *   stands clear of the ring's corners from above and still overlaps the
 *   stalk's top band (the audit's gap is 0). Twelve points over forty-eight
 *   stalks — a quarter, against the cluster's half — "dim tips on kelp stalks,
 *   never a glowing canopy" (docs/style-neon-noir.md "World light"). 48
 *   triangles. kit.mjs `lightAudit` runs on the baked stand and the script
 *   fails on a tip it reads under 0.25 m² of plan or floating; the figures
 *   it read are in the pull request.
 *
 * The sway (environmentModels.ts) is a vertex weight computed at load from
 * each vertex's height over the prop's, so it needs nothing from the file;
 * #1713 sets the stand's `swayM` in the registry row it adds. The runtime
 * owns value (`ENV_LUMINANCE_CEILING`), so the two materials are the
 * cluster's tokens and nothing is tuned here.
 *
 * The root is `env_kelp_stand`, an identity: every placement and the fit
 * are baked into the buffers as the nodule bed's are, the whole standing
 * on y = 0 at the holdfasts and the foot rings. Nothing in it is a table,
 * so the stand can be re-drawn by editing `SEED` or the ranges above.
 */
import { THREE, add, faceted, exportGlb, lightAudit } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 120;
const MAX_TRIS = 1200;
const SEED = 1712;
// A tip's tetrahedron, at the cluster's radius (#890).
const TIP = 0.6;
// The nominal head height of the stand's tallest stalk, before the fit to
// the footprint; the fit lands it at the row's 40 m.
const TOP = 35.2;

const kelp = seabed.ground.kelp();
const biolight = seabed.ground.biolight();

const stand = new THREE.Group();
stand.name = 'env_kelp_stand';

const draw = seabed.seeded(SEED);
const nn = (i) => String(i + 1).padStart(2, '0');

// --- the clumps ------------------------------------------------------------
// Stalks per clump, fixed so the triangle count is the script's.
const CLUMP_STALKS = [5, 4, 4, 3, 5, 4, 3, 4, 4, 4, 4, 4];
// The ellipse the clumps are drawn in, nominal semi-axes, and the least
// distance between two clump centres.
const PLAN_A = 50;
const PLAN_B = 40;
const APART = 18;
// Down-current is +x, the cluster's lean.
const CURRENT = 0;

const centres = [];
CLUMP_STALKS.forEach((_, i) => {
  if (i < 2) {
    // The two end clumps carry the footprint.
    const sgn = i === 0 ? -1 : 1;
    centres.push([sgn * (PLAN_A - 4) + draw.between(-2, 2), draw.between(-8, 8)]);
    return;
  }
  for (let tries = 0; ; tries++) {
    const t = draw() * 2 * Math.PI;
    const r = Math.sqrt(draw());
    const c = [PLAN_A * r * Math.cos(t), PLAN_B * r * Math.sin(t)];
    if (centres.every(([x, z]) => Math.hypot(c[0] - x, c[1] - z) >= APART)) {
      centres.push(c);
      break;
    }
    if (tries > 200) throw new Error(`env_kelp_stand: clump ${i + 1} finds no room`);
  }
});

// --- the holdfasts -----------------------------------------------------------
centres.forEach(([x, z], i) => {
  const s = [draw.between(2.2, 3.4), draw.between(0.8, 1.3), draw.between(1.8, 2.8)];
  const yaw = draw() * 2 * Math.PI;
  const geo = seabed.octa(s);
  geo.computeBoundingBox();
  add(stand, `holdfast_${nn(i)}`, geo, kelp, [x, -geo.boundingBox.min.y, z], [0, yaw, 0]);
});

// --- the stalks ----------------------------------------------------------------
const RING = 3;
const RINGS = 4;
// The spire's band rule ring to ring, with the foot cap (`RING − 2`
// triangles of `fan`) taken off: open at both ends.
const STALK_CUT = seabed
  .column(Array.from({ length: RINGS }, (_, b) => Array.from({ length: RING }, (_, i) => b * RING + i)))
  .slice(RING - 2);

/** A stalk's axis and radius at t ∈ [0, 1] of its height, from its own numbers. */
function stalkCurve({ foot, height, leanDir, lean, r0, rh }) {
  return {
    axis: (t) => [
      foot[0] + Math.cos(leanDir) * lean * t ** 1.6,
      height * t,
      foot[1] + Math.sin(leanDir) * lean * t ** 1.6,
    ],
    radius: (t) => r0 + (rh - r0) * t,
  };
}

const stalks = [];
let stalkIndex = 0;
CLUMP_STALKS.forEach((count, c) => {
  const [cx, cz] = centres[c];
  const tallest = Math.floor(draw() * count);
  for (let k = 0; k < count; k++) {
    const bearing = (k * 2 * Math.PI) / count + draw.between(-0.4, 0.4);
    const reach = draw.between(0.8, 3);
    const foot = [cx + reach * Math.cos(bearing), cz + reach * Math.sin(bearing)];
    const height = k === tallest ? TOP * draw.between(0.88, 1) : TOP * draw.between(0.6, 0.92);
    const spec = {
      foot,
      height,
      leanDir: CURRENT + draw.between(-0.5, 0.5),
      lean: height * draw.between(0.12, 0.24),
      r0: draw.between(0.55, 0.8),
      rh: 0.2,
      phase: draw() * 2 * Math.PI,
      tip: k === tallest,
    };
    const { axis, radius } = stalkCurve(spec);
    const points = [];
    const ringCentres = [];
    for (let b = 0; b < RINGS; b++) {
      const t = b / (RINGS - 1);
      const [ax, ay, az] = axis(t);
      const y = b === 0 ? ay : ay + draw.between(-0.4, 0.4);
      ringCentres.push([ax, y, az]);
      const r = radius(t);
      // Corners run from +x toward −z, the sense `column` faces out.
      for (let i = 0; i < RING; i++) {
        const a = spec.phase - (2 * Math.PI * i) / RING;
        const push = 1 + draw.between(-0.08, 0.08);
        points.push([ax + r * push * Math.cos(a), y, az + r * push * Math.sin(a)]);
      }
    }
    const geo = faceted(points, STALK_CUT);
    // Every band faces out of its stalk: its normal points away from the
    // band's own axis.
    {
      const p = geo.attributes.position;
      const nrm = geo.attributes.normal;
      for (let tri = 0; tri < p.count / 3; tri++) {
        const centroid = new THREE.Vector3();
        for (let v = 0; v < 3; v++)
          centroid.add(new THREE.Vector3().fromBufferAttribute(p, 3 * tri + v));
        centroid.divideScalar(3);
        const band = Math.floor(tri / (2 * RING));
        const lo = ringCentres[band];
        const hi = ringCentres[band + 1];
        const mid = new THREE.Vector3(
          (lo[0] + hi[0]) / 2,
          (lo[1] + hi[1]) / 2,
          (lo[2] + hi[2]) / 2
        );
        const n = new THREE.Vector3().fromBufferAttribute(nrm, 3 * tri);
        if (n.dot(centroid.sub(mid)) <= 0)
          throw new Error(`env_kelp_stand: stalk ${stalkIndex + 1} band facet ${tri} faces in`);
      }
    }
    add(stand, `stalk_${nn(stalkIndex)}`, geo, kelp);
    stalks.push({ ...spec, axis, radius, head: ringCentres[RINGS - 1], index: stalkIndex });
    stalkIndex++;
  }
});

// --- the blades ------------------------------------------------------------------
// Five points: the two root corners on the stalk first and last of the
// quad, the two wide corners between, then the tip — the cluster's cut.
const BLADE_CUT = [
  [0, 1, 2],
  [0, 2, 3],
  [1, 4, 2],
];
let bladeIndex = 0;
for (const s of stalks) {
  {
    const t = draw.between(0.4, 0.8);
    const beta = draw() * 2 * Math.PI;
    const length = draw.between(3, 7);
    const width = draw.between(1, 1.8);
    const rise = draw.between(0.3, 0.6);
    const lead = draw.between(-0.3, 0.3);
    const [ax, ay, az] = s.axis(t);
    const out = [Math.cos(beta), 0, Math.sin(beta)];
    const side = [-Math.sin(beta), 0, Math.cos(beta)];
    // Rooted inside the stalk's surface, so the blade meets it.
    const r = 0.8 * s.radius(t);
    const root = [ax + out[0] * r, ay, az + out[2] * r];
    const at = (along, up, across) => [
      root[0] + out[0] * along + side[0] * across,
      root[1] + up,
      root[2] + out[2] * along + side[2] * across,
    ];
    const reach = (f) => [f * length * Math.cos(rise), f * length * Math.sin(rise)];
    const [wa, wu] = reach(0.6);
    const [ta, tu] = reach(1);
    const points = [
      at(0, 0, 0.15),
      at(wa, wu, width / 2),
      at(wa, wu, -width / 2),
      at(0, 0, -0.15),
      at(ta, tu, lead),
    ];
    add(stand, `blade_${nn(bladeIndex)}`, faceted(points, BLADE_CUT), kelp);
    bladeIndex++;
  }
}

// --- the lit tips ------------------------------------------------------------------
let tipIndex = 0;
for (const s of stalks) {
  if (!s.tip) continue;
  const [hx, hy, hz] = s.head;
  add(stand, `biolight_${nn(tipIndex)}`, seabed.tetra(TIP), biolight, [hx, hy + 0.15, hz]);
  tipIndex++;
}

// --- the budget, the fit and the bake ---------------------------------------------------
let tris = 0;
stand.traverse((o) => {
  if (o.isMesh) tris += o.geometry.attributes.position.count / 3;
});
if (tris > MAX_TRIS) throw new Error(`env_kelp_stand: ${tris} triangles over ${MAX_TRIS}`);

// Held at the footprint here, before the bake, so the root stays an identity
// and `stand` below finds nothing to do.
stand.updateMatrixWorld(true);
// Precise: the vertices through their transforms, which is what the bake
// leaves and what `stand` then measures; a yawed holdfast's box overhangs them.
const nominal = new THREE.Box3().setFromObject(stand, true).getSize(new THREE.Vector3());
const fit = FOOTPRINT / Math.max(nominal.x, nominal.z);
stand.scale.setScalar(fit);
seabed.bake(stand);

const audit = lightAudit(stand);
if (audit.hidden.length || audit.floating.length)
  throw new Error(
    `env_kelp_stand: tips hidden [${audit.hidden}] floating [${audit.floating}]: ${JSON.stringify(audit.lit)}`
  );

const { drawn, k } = seabed.stand(stand, FOOTPRINT, { drawn: FOOTPRINT });
const size = new THREE.Box3().setFromObject(stand).getSize(new THREE.Vector3());
console.log(
  `env_kelp_stand: ${tris} triangles, fit ×${fit.toFixed(4)} (nominal ${Math.max(nominal.x, nominal.z).toFixed(2)} across), ` +
    `drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.x.toFixed(2)} by ${size.z.toFixed(2)} by ${size.y.toFixed(2)} m tall; ` +
    `tips ${audit.lit.map((l) => `${l.name} ${l.m2} m²`).join(', ')}`
);
await exportGlb(stand, 'env-kelp-stand.glb');
