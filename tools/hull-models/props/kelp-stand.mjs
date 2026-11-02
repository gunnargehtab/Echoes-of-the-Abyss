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
 * `kelp` and `biolight` to the digit; 1,188 triangles; 40.0 m tall at its
 * 120 m by intake's measure (`sizeM`), the row's 40 m exactly, which takes
 * `--world-light flora --max-tris 1200` for this row (hull-intake's default
 * cap is the registry's 800, which #1713 raises for stands alone).
 *
 * Authored as a formula rather than ported: there is no export, as the
 * nodule bed has none (#1555). Every number below is drawn from one seeded
 * stream (seabed.mjs `seeded`, seed 1712) in the order the parts are built,
 * so the file is the same on every machine and `npm run check:models` holds
 * the script to it. The whole is built at a nominal size, centred on its
 * plan and held at the footprint before the bake (seabed.mjs `bake`), so
 * the root is an identity and seabed.mjs `stand` finds ×1.000. The fit is
 * two numbers: ×1.1444 on the plan, solved so the stand is 120 m across
 * with its tips counted, and ×1.1271 on the height, so the tallest head
 * ring with its tip over it lands on the row's 40 m exactly — the plan fit
 * alone left the top anywhere from 38.7 to 41.1 m, since a stalk's redraw
 * reshuffles every draw after it. The ranges below are the nominal ones
 * the stream draws from; the file's are those times the fit, and the
 * figures quoted as the file's say so.
 *
 * What it is made of, and why this shape. The slice wants "dense kelp
 * without suggesting collision or cover": a stand a hull reads as forest
 * and never as a wall. So the stand is twelve clumps, each a holdfast with
 * six stalks rooted on it — a cluster's count, twelve times — set apart
 * across the plan with open water between them, the gaps being what say
 * "no cover", and the stalks are the cluster's vocabulary at the slice's
 * height: open-ended columns of rings, as thick at the foot as the
 * cluster's stipes, each leaning down-current and spread across it by
 * the way out from its clump, so the crowns fan over the lanes the feet
 * leave open and reach toward the next clump downstream, with blades
 * standing off the stalks and a lit tip on each clump's tallest.
 * Nothing closes over the plan: there is no canopy, no mass wider than a
 * holdfast at the ground, and the tallest thing is a stalk a hull passes
 * beside. The first build had twelve clumps of three to five thinner
 * stalks on three bands, and the reviewer read it as tufts of reed on open
 * floor, at 6 % of its plan against the cluster's 42 %; the bands and
 * blades paid for the stalks. The second had six to a clump, leaning
 * down-current alone, and read as twelve fuller tufts at 7.8 % of its
 * plan and 10.4 % of its box from the conn camera. The third fanned each
 * stalk out from its clump unfolded, and 21 of 72 leaned against the
 * current, each clump a starburst. This build folds the fan down-current
 * and leans further: 10.4 % of its plan and 12.8 % of its box from the
 * conn camera, where the cluster reads 21.4 % of its own box at 18 m
 * across, and no head stands up-current of its foot. #1713 tiles one
 * file forty times at 125 m; the registry's yaw per instance is what
 * hides the repeat.
 *
 * - Twelve `holdfast_NN`, in `kelp`: octahedra (seabed.mjs `octa`, 8
 *   triangles — the cluster's are icosahedra, and the twelve extra
 *   triangles each would cost went to stalks) under a scale triple 3.5–4.5
 *   by 0.8–1.3 by 2.8–3.6 m, yawed (the cluster's main holdfast is 4.86 by
 *   2.23 by 3.96), each sat with its lowest vertex on y = 0 as
 *   the cluster's are. The first two stand off the plan's ±x ends; the
 *   other ten are drawn inside an ellipse 92 by 72 m and redrawn while any
 *   would stand within 18 m of one already set, so no two clumps merge.
 *   96 triangles.
 * - Seventy-two `stalk_NN`, in `kelp`: a column of three three-cornered
 *   rings from the foot to the head (seabed.mjs `column` with its foot cap
 *   taken off, so a stalk is open at both ends as the cluster's stipes
 *   are), two bands, 12 triangles each, 864 in all. Six to a clump. A
 *   stalk's foot ring sits on y = 0 at 50–100 % of the way from its
 *   holdfast's centre to the holdfast's edge on the foot's own bearing, so
 *   every foot stands on its holdfast and the sweep lists each pair — the
 *   script casts a ray down over each foot's centre and refuses a stalk
 *   whose ray misses its holdfast (the second build's reach had the yaw's
 *   sign the other way and stood three feet past their diamond); it is
 *   0.75–1.05 m in radius at the foot (the cluster's stipes are 0.81–1.22
 *   in the file) and narrows to 0.25 m at the head; the middle and head rings
 *   wander up to 0.4 m in height and every corner 8 % in radius, and each
 *   stalk's corners start at their own bearing, so no two show the same
 *   facet. Heights: each clump's tallest stalk is drawn at 88–100 % of the
 *   stand's top and the rest at 60–92 % of it, so the stand steps rather
 *   than crops level. Every stalk leans by 25–40 % of its height at the
 *   head, down-current (+x, the cluster's lean) spread across it by the
 *   way out from its clump's centre with any up-current part folded
 *   down-current, so within ±45° of the current as the cluster's stipes
 *   are, ±0.2 rad drawn, bending as t^1.6 so the foot stands
 *   near-vertical and the head carries the lean. A stalk whose axis would come within the two
 *   radii and 0.2 m of another's anywhere above a quarter of its height is
 *   redrawn, foot and lean, so no stalk passes through another above the
 *   feet, which may touch where six fan out of one holdfast; and the
 *   script checks every band faces out of its stalk before it writes.
 * - Sixty `blade_NN`, in `kelp`: the cluster's five-point blade — a quad
 *   fanned from its first corner and a tip triangle off the far edge, 3
 *   triangles — on five stalks in every six, each rooted on the stalk as
 *   built: its two root corners, 0.2 m apart, stand inside the prism's
 *   section at the blade's height, found between the two rings that bound
 *   it, and the script refuses a blade whose root corners are not inside
 *   that triangle, so every blade pierces its own stalk's skin and the
 *   sweep lists the pair. A blade is 4–9 m long, 1–2 m wide, rising
 *   0.3–0.6 rad from level, at 45–85 % of the stalk's height, pointed away
 *   from the clump's centre within ±0.7 rad so it stands off its stalk
 *   into open water; a blade any edge or face of which would pass within
 *   0.2 m of another stalk's prism as built is redrawn, so no blade passes
 *   through a neighbour and the sweep lists each blade against its own
 *   stalk alone. 180 triangles.
 * - Twelve `biolight_NN`, in `biolight`: three's tetrahedron (seabed.mjs
 *   `tetra`), one at the head of each clump's tallest stalk, centred 0.15 m
 *   over the head ring so the tetra stands clear of the ring's corners
 *   from above and still overlaps the stalk's top band (the audit's gap is
 *   0). The tips are added after the fit, at the cluster's radius in its
 *   file, 0.4938 (its `TIP` of 0.6 under its root's ×0.823, #890), so a
 *   stand's tips and a cluster's are one size in the game; the fit is
 *   solved with the tips' reach counted in, so a tip at a leaning head on
 *   the plan's edge is inside the 120 m. Twelve points over seventy-two
 *   stalks — a sixth, against the cluster's half — "dim tips on kelp
 *   stalks, never a glowing canopy" (docs/style-neon-noir.md "World
 *   light"). 48 triangles. kit.mjs `lightAudit` runs on the baked stand
 *   and the script fails on a tip it reads under 0.25 m² of plan or
 *   floating; the figures it read are in the pull request.
 *
 * The sway (environmentModels.ts) is a vertex weight computed at load from
 * each vertex's height over the prop's, so it needs nothing from the file;
 * #1713 sets the stand's `swayM` in the registry row it adds. The runtime
 * owns value (`ENV_LUMINANCE_CEILING`), so the two materials are the
 * cluster's tokens and nothing is tuned here.
 *
 * The root is `env_kelp_stand`, an identity: every placement and the fit
 * are baked into the buffers as the nodule bed's are, the whole standing
 * on y = 0 at the holdfasts and the foot rings, and the plan centred on
 * the origin to the millimetre, since #1713's slots are 125 m apart and a
 * stand that sat 3 m off its origin would lean into its neighbour's cell.
 * Nothing in it is a table, so the stand can be re-drawn by editing `SEED`
 * or the ranges above.
 */
import { THREE, add, faceted, exportGlb, lightAudit } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 120;
const MAX_TRIS = 1200;
const SEED = 1712;
// A tip's radius in the file: the cluster's, 0.6 under its root's ×0.823.
const TIP = 0.6 * 0.823;
// The nominal head height of the stand's tallest stalk, before the fit to
// the footprint and the height's own fit to the row's 40 m.
const TOP = 36;

const kelp = seabed.ground.kelp();
const biolight = seabed.ground.biolight();

const stand = new THREE.Group();
stand.name = 'env_kelp_stand';

const draw = seabed.seeded(SEED);
const nn = (i) => String(i + 1).padStart(2, '0');

// --- the clumps ------------------------------------------------------------
const CLUMPS = 12;
const PER_CLUMP = 6;
// The ellipse the clumps are drawn in, nominal semi-axes, and the least
// distance between two clump centres.
const PLAN_A = 46;
const PLAN_B = 36;
const APART = 18;
// Down-current is +x, the cluster's lean. A stalk leans that way spread
// across the current by the way out from its clump's centre, never
// against it: the lean is `1 − AWAY` down-current plus `AWAY` of the
// outward bearing with its up-current component folded down-current, so
// the spread is within ±45° of the current at `AWAY` 0.5, the cluster's
// own spread, and the crowns fan over the lanes the feet leave open. The
// third build blended the outward bearing unfolded, and 21 stalks leaned
// against the current, each clump a starburst.
const CURRENT = 0;
const AWAY = 0.5;

const centres = [];
for (let i = 0; i < CLUMPS; i++) {
  if (i < 2) {
    // The two end clumps stand off the plan's ends.
    const sgn = i === 0 ? -1 : 1;
    centres.push([sgn * (PLAN_A - 4) + draw.between(-2, 2), draw.between(-8, 8)]);
    continue;
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
}

// --- the holdfasts -----------------------------------------------------------
const holdfasts = centres.map(([x, z], i) => {
  const s = [draw.between(3.5, 4.5), draw.between(0.8, 1.3), draw.between(2.8, 3.6)];
  const yaw = draw() * 2 * Math.PI;
  const geo = seabed.octa(s);
  geo.computeBoundingBox();
  const mesh = add(
    stand,
    `holdfast_${nn(i)}`,
    geo,
    kelp,
    [x, -geo.boundingBox.min.y, z],
    [0, yaw, 0]
  );
  // The diamond's reach from its centre on a bearing, in plan: an
  // octahedron's section at its waist is |x / a| + |z / c| = 1 in its own
  // frame, which `yaw` turns — a world bearing is `yaw` further round in
  // the local frame (three's `rotation.y` takes local to world by
  // subtracting it; the first build had the sign the other way and stood
  // three feet past their diamond).
  const reach = (bearing) => {
    const b = bearing + yaw;
    return 1 / (Math.abs(Math.cos(b)) / s[0] + Math.abs(Math.sin(b)) / s[2]);
  };
  return { x, z, reach, mesh };
});

// --- the stalks ----------------------------------------------------------------
const RING = 3;
const RINGS = 3;
// The spire's band rule ring to ring, with the foot cap (`RING − 2`
// triangles of `fan`) taken off: open at both ends.
const STALK_CUT = seabed
  .column(
    Array.from({ length: RINGS }, (_, b) => Array.from({ length: RING }, (_, i) => b * RING + i))
  )
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

/** Whether two stalks' axes come within their radii and `margin` anywhere above t = 0.25. */
function crosses(a, b, margin = 0.2) {
  for (let t = 0.25; t <= 1.0001; t += 0.05) {
    const ya = a.height * t;
    // The same height on b, which may be shorter.
    const tb = ya / b.height;
    if (tb > 1) return false;
    const [ax, , az] = a.axis(t);
    const [bx, , bz] = b.axis(tb);
    if (Math.hypot(ax - bx, az - bz) < a.radius(t) + b.radius(tb) + margin) return true;
  }
  return false;
}

const caster = new THREE.Raycaster();
const stalks = [];
let stalkIndex = 0;
holdfasts.forEach((hold, c) => {
  const tallest = Math.floor(draw() * PER_CLUMP);
  for (let k = 0; k < PER_CLUMP; k++) {
    const height = k === tallest ? TOP * draw.between(0.88, 1) : TOP * draw.between(0.6, 0.92);
    let spec;
    for (let tries = 0; ; tries++) {
      const bearing = (k * 2 * Math.PI) / PER_CLUMP + draw.between(-0.4, 0.4);
      const reach = hold.reach(bearing) * draw.between(0.5, 1);
      const foot = [hold.x + reach * Math.cos(bearing), hold.z + reach * Math.sin(bearing)];
      const across = bearing - CURRENT;
      const fan = [1 - AWAY + AWAY * Math.abs(Math.cos(across)), AWAY * Math.sin(across)];
      spec = {
        foot,
        height,
        leanDir: CURRENT + Math.atan2(fan[1], fan[0]) + draw.between(-0.2, 0.2),
        lean: height * draw.between(0.25, 0.4),
        r0: draw.between(0.75, 1.05),
        rh: 0.25,
        phase: draw() * 2 * Math.PI,
        tip: k === tallest,
        clump: c,
      };
      Object.assign(spec, stalkCurve(spec));
      if (!stalks.some((other) => crosses(spec, other) || crosses(other, spec))) break;
      if (tries > 200) throw new Error(`env_kelp_stand: stalk ${stalkIndex + 1} finds no lean`);
    }
    // The foot stands under its holdfast's skin: a ray down from over the
    // foot's centre hits the holdfast, so the stalk's wall passes through it.
    {
      hold.mesh.updateMatrixWorld(true);
      caster.set(new THREE.Vector3(spec.foot[0], 10, spec.foot[1]), new THREE.Vector3(0, -1, 0));
      if (caster.intersectObject(hold.mesh, false).length === 0)
        throw new Error(`env_kelp_stand: stalk ${stalkIndex + 1} stands off holdfast ${c + 1}`);
    }
    const points = [];
    const rings = [];
    for (let b = 0; b < RINGS; b++) {
      const t = b / (RINGS - 1);
      const [ax, ay, az] = spec.axis(t);
      const y = b === 0 ? ay : ay + draw.between(-0.4, 0.4);
      const r = spec.radius(t);
      const corners = [];
      // Corners run from +x toward −z, the sense `column` faces out.
      for (let i = 0; i < RING; i++) {
        const a = spec.phase - (2 * Math.PI * i) / RING;
        const push = 1 + draw.between(-0.08, 0.08);
        corners.push([ax + r * push * Math.cos(a), y, az + r * push * Math.sin(a)]);
      }
      points.push(...corners);
      rings.push({ centre: [ax, y, az], corners });
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
        const lo = rings[band].centre;
        const hi = rings[band + 1].centre;
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
    stalks.push({ ...spec, rings, head: rings[RINGS - 1].centre, index: stalkIndex });
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

/**
 * The stalk's section at height `y`, as built: the three corners of the
 * prism between the two rings that bound `y`, interpolated by height.
 */
function section(s, y) {
  let b = 0;
  while (b + 2 < s.rings.length && y > s.rings[b + 1].centre[1]) b++;
  const lo = s.rings[b];
  const hi = s.rings[b + 1];
  const f = (y - lo.centre[1]) / (hi.centre[1] - lo.centre[1]);
  const lerp = (p, q) => p.map((v, i) => v + (q[i] - v) * f);
  return {
    centre: lerp(lo.centre, hi.centre),
    corners: lo.corners.map((p, i) => lerp(p, hi.corners[i])),
  };
}

/** Whether plan point (x, z) is inside the triangle of plan corners. */
function inside([x, z], corners) {
  let sign = 0;
  for (let i = 0; i < 3; i++) {
    const [ax, , az] = corners[i];
    const [bx, , bz] = corners[(i + 1) % 3];
    const cross = (bx - ax) * (z - az) - (bz - az) * (x - ax);
    if (cross === 0) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/**
 * Whether a blade passes within `margin` of any stalk but its own: every
 * edge of its quad and tip triangle, and the two faces' centroids, sampled
 * along against each other stalk's prism as built (`section`, the rings'
 * wandered heights and pushed corners included), not its nominal curve.
 */
function clips(points, own, margin = 0.2) {
  const [r1, w1, w2, r2, tip] = points;
  const mid = (a, b, c) => a.map((v, i) => (v + b[i] + c[i]) / 3);
  const segments = [
    [r1, w1],
    [r2, w2],
    [w1, w2],
    [w1, tip],
    [w2, tip],
    [mid(r1, w1, w2), mid(w1, w2, tip)],
  ];
  for (const [a, b] of segments)
    for (let f = 0; f <= 1.0001; f += 0.1) {
      const x = a[0] + (b[0] - a[0]) * f;
      const y = a[1] + (b[1] - a[1]) * f;
      const z = a[2] + (b[2] - a[2]) * f;
      for (const o of stalks) {
        if (o === own) continue;
        if (y < 0 || y > o.head[1]) continue;
        const sec = section(o, y);
        const reach = Math.max(
          ...sec.corners.map(([cx, , cz]) => Math.hypot(cx - sec.centre[0], cz - sec.centre[2]))
        );
        if (Math.hypot(x - sec.centre[0], z - sec.centre[2]) < reach + margin) return true;
      }
    }
  return false;
}

let bladeIndex = 0;
for (const s of stalks) {
  if (s.index % PER_CLUMP === PER_CLUMP - 1) continue;
  const hold = holdfasts[s.clump];
  const away = Math.atan2(s.foot[1] - hold.z, s.foot[0] - hold.x);
  let points;
  let corners;
  for (let tries = 0; ; tries++) {
    const t = draw.between(0.45, 0.85);
    const beta = away + draw.between(-0.7, 0.7);
    const length = draw.between(4, 9);
    const width = draw.between(1, 2);
    const rise = draw.between(0.3, 0.6);
    const lead = draw.between(-0.3, 0.3);
    const y = s.height * t;
    const sec = section(s, y);
    corners = sec.corners;
    const out = [Math.cos(beta), 0, Math.sin(beta)];
    const side = [-Math.sin(beta), 0, Math.cos(beta)];
    // Rooted inside the prism's section, so the blade pierces the stalk's skin.
    const r = 0.3 * s.radius(t);
    const root = [sec.centre[0] + out[0] * r, y, sec.centre[2] + out[2] * r];
    const at = (along, up, across) => [
      root[0] + out[0] * along + side[0] * across,
      root[1] + up,
      root[2] + out[2] * along + side[2] * across,
    ];
    const reach = (f) => [f * length * Math.cos(rise), f * length * Math.sin(rise)];
    const [wa, wu] = reach(0.6);
    const [ta, tu] = reach(1);
    points = [
      at(0, 0, 0.1),
      at(wa, wu, width / 2),
      at(wa, wu, -width / 2),
      at(0, 0, -0.1),
      at(ta, tu, lead),
    ];
    // A blade that would pass through a neighbour is redrawn.
    if (!clips(points, s)) break;
    if (tries > 60)
      throw new Error(`env_kelp_stand: blade ${bladeIndex + 1} finds no clear bearing`);
  }
  for (const corner of [points[0], points[3]])
    if (!inside([corner[0], corner[2]], corners))
      throw new Error(`env_kelp_stand: blade ${bladeIndex + 1} roots off stalk ${s.index + 1}`);
  add(stand, `blade_${nn(bladeIndex)}`, faceted(points, BLADE_CUT), kelp);
  bladeIndex++;
}

// --- the budget, the fit and the bake ---------------------------------------------------
let tris = 0;
stand.traverse((o) => {
  if (o.isMesh) tris += o.geometry.attributes.position.count / 3;
});
const TIP_TRIS = 4;
const tipHeads = stalks.filter((s) => s.tip).map((s) => s.head);
tris += TIP_TRIS * tipHeads.length;
if (tris > MAX_TRIS) throw new Error(`env_kelp_stand: ${tris} triangles over ${MAX_TRIS}`);

// The fit, with the tips' reach counted in: a tip is added after the fit at
// its file radius, so the plan it would extend is solved for here, a fixed
// point that settles in a few turns since a tip is half a metre on a 120 m
// plan. Precise: the vertices through their transforms, which is what the
// bake leaves and what `stand` then measures; a yawed holdfast's box
// overhangs them.
stand.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(stand, true);
const tipGeo = seabed.tetra(TIP);
tipGeo.computeBoundingBox();
const tipReach = Math.max(tipGeo.boundingBox.max.x, tipGeo.boundingBox.max.z);
let fit = 1;
let plan;
for (let i = 0; i < 8; i++) {
  plan = box.clone();
  for (const [hx, hy, hz] of tipHeads) {
    const r = tipReach / fit;
    plan.expandByPoint(new THREE.Vector3(hx - r, hy, hz - r));
    plan.expandByPoint(new THREE.Vector3(hx + r, hy, hz + r));
  }
  const size = plan.getSize(new THREE.Vector3());
  fit = FOOTPRINT / Math.max(size.x, size.z);
}
// The height's fit: the tallest head ring, with its tip over it, lands on
// the row's 40 m exactly, so the figure is the script's and not the
// stream's — the plan fit alone left it anywhere from 38.7 to 41.1 m as a
// stalk's redraw reshuffled every draw after it.
const HEIGHT = 40;
const tipTop = 0.15 + tipGeo.boundingBox.max.y;
const rise = (HEIGHT - tipTop) / (box.max.y * fit);
const centre = plan.getCenter(new THREE.Vector3());
stand.position.set(-centre.x * fit, 0, -centre.z * fit);
stand.scale.set(fit, fit * rise, fit);
seabed.bake(stand);

// The lit tips, in the file's frame.
tipHeads.forEach(([hx, hy, hz], i) => {
  add(stand, `biolight_${nn(i)}`, seabed.tetra(TIP), biolight, [
    (hx - centre.x) * fit,
    hy * fit * rise + 0.15,
    (hz - centre.z) * fit,
  ]);
});

const audit = lightAudit(stand);
if (audit.hidden.length || audit.floating.length)
  throw new Error(
    `env_kelp_stand: tips hidden [${audit.hidden}] floating [${audit.floating}]: ${JSON.stringify(audit.lit)}`
  );

const { drawn, k } = seabed.stand(stand, FOOTPRINT, { drawn: FOOTPRINT });
const final = new THREE.Box3().setFromObject(stand);
const size = final.getSize(new THREE.Vector3());
const off = final.getCenter(new THREE.Vector3());
console.log(
  `env_kelp_stand: ${tris} triangles, fit ×${fit.toFixed(4)} (height ×${(fit * rise).toFixed(4)}), drawn ${drawn.toFixed(4)} across, ` +
    `held at ${FOOTPRINT} m (×${k.toFixed(5)}), ${size.x.toFixed(2)} by ${size.z.toFixed(2)} by ` +
    `${size.y.toFixed(2)} m tall, plan centre off (${off.x.toFixed(3)}, ${off.z.toFixed(3)}); ` +
    `tips ${audit.lit.map((l) => `${l.name} ${l.m2} m²`).join(', ')}`
);
await exportGlb(stand, 'env-kelp-stand.glb');
