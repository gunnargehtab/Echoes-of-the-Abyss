/**
 * The kelp stand — 120 m of footprint, the dense stand of forty-metre
 * stalks docs/free-water-slice.md §5 commissions for the northern garden of
 * #1694's crater fixture (#1712): "commission `env-kelp-stand`, a denser
 * stand of 40 m stalks within a 120 m footprint", beside the retained
 * `env-kelp-cluster`, which this file leaves untouched.
 *
 * "Kelp Forest | env-kelp-stand | 120 m | 40 m | ≤ 6,000 | `flora-biolight`,
 * tip points" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE:
 * "Natural or ruined form — stone, coral, kelp ... nothing manufactured ...
 * low-poly with crisp facets, at most two materials", the one licensed
 * light being `flora-biolight` at the tips. Two materials, the cluster's
 * `kelp` and `biolight` to the digit; 5,952 triangles; 40.0 m tall at its
 * 120 m by intake's measure (`sizeM`), the row's 40 m exactly, which takes
 * `--world-light flora --max-tris 6000` for this row (hull-intake's default
 * cap is the registry's 800, which #1713 raises for stands alone). The
 * budget is the owner's: the row was commissioned at 1,200, and on 2
 * November the owner raised it to 6,000 for this fixture, a development
 * slice for map design patterns that may spend what a shipped map may not
 * (docs/free-water-slice.md §7 carries the study's own frame cap).
 *
 * Authored as a formula rather than ported: there is no export, as the
 * nodule bed has none (#1555). Every number below is drawn from one seeded
 * stream (seabed.mjs `seeded`, seed 1712) in the order the parts are built,
 * so the file is the same on every machine and `npm run check:models` holds
 * the script to it. The whole is built at a nominal size, centred on its
 * plan and held at the footprint before the bake (seabed.mjs `bake`), so
 * the root is an identity and seabed.mjs `stand` finds ×1.000. The fit is
 * two numbers: ×1.0674 on the plan, solved so the stand is 120 m across
 * with its tips counted, and ×1.0985 on the height, so whichever
 * reaches higher — the tallest lit head with its tip over it, or a frond's
 * end rising past its stalk — lands on the row's 40 m exactly; the plan
 * fit alone left the top anywhere from 38.7 to 41.1 m, since a stalk's
 * redraw reshuffles every draw after it. The ranges below are the nominal
 * ones the stream draws from; the file's are those times the fit, and the
 * figures quoted as the file's say so.
 *
 * What it is made of, and why this shape. The slice wants "dense kelp
 * without suggesting collision or cover", and the owner's references for
 * "dense" (#1712, the session of 2 November) are photographs of a kelp
 * forest: thin columns close enough to fill the view, long wide fronds
 * curling off them the whole way up, and open floor beneath that a diver
 * swims across. So the stand is twelve clumps, each a holdfast with seven
 * stalks rooted on it, 14 m or more apart across the plan, and most of
 * the budget is fronds: ribbons five or six to a stalk along its whole
 * height, 456 in all, each a strip of four quads on a path that rises,
 * droops and twists — which is what reads as kelp rather than the reeds
 * and bamboo the earlier builds read as — while the stalks are thin
 * columns whose rings wander as they climb, leaning down-current and
 * spread across it. Nothing closes over the plan: there is no canopy, no
 * mass wider than a holdfast at the ground, and the tallest thing is a
 * stalk a hull passes beside. For the record of what the reviewer and the
 * owner sent back: twelve clumps of three to five stalks on three bands
 * read as tufts of reed at 6 % of the plan; six to a clump on two bands,
 * one leaf each, as twelve fuller tufts at 7.8 %; fanning those out from
 * each clump unfolded leaned 21 stalks against the current; folding the
 * fan down-current reached 12.8 % of the box from the conn camera, and the
 * reviewer passed every gate with the density left as the owner's
 * judgement; the owner's references paid the stalks' bands for leaves,
 * 18.2 % at 1,200 triangles; the owner then raised the budget, and 84
 * five-cornered stalks under 780 short leaves read 29 % of the box — and
 * as bamboo, the owner said: the leaf should be long, wide and curled, the
 * stem thinner and more organic. This build is that. It reads 21.8 % of its
 * box from the conn camera and 20.4 % of its plan (the cluster reads
 * 21.4 % of its own box at 18 m across). #1713 tiles one file forty times
 * at 125 m; the registry's yaw per instance is what hides the repeat.
 *
 * - Twelve `holdfast_NN`, in `kelp`: icosahedra (seabed.mjs `ico`, 20
 *   triangles, the cluster's holdfast solid) under a scale triple 4.2–5.2
 *   by 0.8–1.3 by 3.4–4.2 m, yawed (the cluster's main holdfast is 4.86 by
 *   2.23 by 3.96), each sat with its lowest vertex on y = 0 as the
 *   cluster's are. The first two stand off the plan's ±x ends; the other
 *   ten are drawn inside an ellipse 92 by 72 m and redrawn while any would
 *   stand within 14 m of one already set, so no two clumps merge. 240
 *   triangles.
 * - Eighty-four `stalk_NN`, in `kelp`: a column of five three-cornered
 *   rings from the foot to the head (seabed.mjs `column` with its foot cap
 *   taken off, so a stalk is open at both ends as the cluster's stipes
 *   are), four bands, 24 triangles each, 2,016 in all. Seven to a clump. A
 *   stalk's foot ring sits on y = 0 at 45–100 % of the way from its
 *   holdfast's centre to the holdfast's edge on the foot's own bearing —
 *   the script casts a ray down over each foot's centre and redraws a
 *   stalk whose ray misses its holdfast's skin, so every foot stands on
 *   its holdfast and the sweep lists each pair; it is 0.35–0.5 m in radius
 *   at the foot (the cluster's stipes are 0.81–1.22 in the file; these are
 *   the references' thin stems) and narrows to 0.15 m at the head; each
 *   ring above the foot wanders up to 0.5 m sideways on from the ring
 *   below, a walk the whole stalk takes, so a stem kinks as it climbs
 *   rather than tapering straight; rings wander up to 0.4 m in height and
 *   every corner 8 % in radius, and each stalk's corners start at their
 *   own bearing, so no two show the same facet. Heights: each clump's
 *   tallest stalk is drawn at 88–100 % of the stand's top and the rest at
 *   60–92 % of it, so the stand steps rather than crops level. Every stalk
 *   leans by 15–25 % of its height at the head, down-current (+x, the
 *   cluster's lean) spread across it by the way out from its clump's
 *   centre with any up-current part folded down-current, ±0.2 rad drawn,
 *   bending as t^1.6 so the foot stands near-vertical and the head carries
 *   the lean, and no head stands up-current of its foot. A stalk whose
 *   axis, wander included, would come within the two radii and 0.15 m of
 *   another's anywhere above three tenths of its height is redrawn, foot,
 *   lean and wander, so no stalk passes through another above the feet,
 *   which may touch where seven fan out of one holdfast; and the script
 *   checks every band faces out of its stalk before it writes.
 * - 456 `frond_NNN`, in `kelp`: a ribbon of five stations, two corners
 *   each, four quads cut as eight triangles, 3,648 in all — five to a stalk
 *   and six on the first three of each clump, so the count is the
 *   script's. A frond's path leaves its stalk on a bearing of its own, set
 *   round the stalk by its share of the turn from the way out of the clump
 *   (±0.5 rad), rising at first and drooping as it goes (its height along
 *   the path is L(a·u − b·u²) for a 0.3–0.7 and b 0.5–1.2 at u from 0 to
 *   1), swept sideways by up to a quarter of its length, and twisted about
 *   its own path by half to one and a half turns, which is the curl; it is
 *   6–14 m long and 0.8–1.6 m wide at its widest, tapering from a 0.1 m
 *   root — the two root corners stand inside the prism's section at the
 *   frond's height, found between the two rings that bound it, and the
 *   script refuses a frond whose root corners are not inside that triangle,
 *   so every frond pierces its own stalk's skin and the sweep lists the
 *   pair — through 0.7 and the full width to 0.85 and a blunt 0.45 at the
 *   end, at 15–97 % of the stalk's height. A frond is redrawn, its swing
 *   widening by 0.05 rad a redraw and its length shortening after fifty,
 *   if any point of its faces on a 0.2 m grid comes within 0.15 m of
 *   another stalk's prism as built or of a frond already set, so no frond
 *   passes through a neighbour or another frond and the sweep lists each
 *   frond against its own stalk alone; a frond that would droop under the
 *   floor is redrawn the same way, so the stand's lowest point is its feet.
 * - Twelve `biolight_NN`, in `biolight`: three's tetrahedron (seabed.mjs
 *   `tetra`), one at the head of each clump's tallest stalk, centred 0.15 m
 *   over the head ring so the tetra stands clear of the ring's corners
 *   from above and still overlaps the stalk's top band (the audit's gap is
 *   0). The tips are added after the fit, at the cluster's radius in its
 *   file, 0.4938 (its `TIP` of 0.6 under its root's ×0.823, #890), so a
 *   stand's tips and a cluster's are one size in the game; the fit is
 *   solved with the tips' reach counted in, so a tip at a leaning head on
 *   the plan's edge is inside the 120 m. Twelve points over eighty-four
 *   stalks — a seventh, against the cluster's half — "dim tips on kelp
 *   stalks, never a glowing canopy" (docs/style-neon-noir.md "World
 *   light"). 48 triangles. kit.mjs `lightAudit` runs on the baked stand
 *   and the script fails on a tip it reads under 0.25 m² of plan or
 *   floating; it reads them at 0.25–0.56 m² (6 at 0.25 m², 5 at 0.38 m², 1 at 0.56 m²), none hidden and none floating.
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
const MAX_TRIS = 6000;
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
const nn = (i, w = 2) => String(i + 1).padStart(w, '0');

// --- the clumps ------------------------------------------------------------
const CLUMPS = 12;
const PER_CLUMP = 7;
// The ellipse the clumps are drawn in, nominal semi-axes, and the least
// distance between two clump centres.
const PLAN_A = 46;
const PLAN_B = 36;
const APART = 14;
// Down-current is +x, the cluster's lean. A stalk leans that way spread
// across the current by the way out from its clump's centre, never
// against it: the lean is `1 − AWAY` down-current plus `AWAY` of the
// outward bearing with its up-current component folded down-current, so
// the spread is within ±45° of the current at `AWAY` 0.5 before the ±0.2
// rad drawn on top, and the crowns fan over the lanes the feet leave
// open. An earlier build blended the outward bearing unfolded, and 21
// stalks leaned against the current, each clump a starburst.
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
  const s = [draw.between(4.2, 5.2), draw.between(0.8, 1.3), draw.between(3.4, 4.2)];
  const yaw = draw() * 2 * Math.PI;
  const geo = seabed.ico(s);
  geo.computeBoundingBox();
  const mesh = add(
    stand,
    `holdfast_${nn(i)}`,
    geo,
    kelp,
    [x, -geo.boundingBox.min.y, z],
    [0, yaw, 0]
  );
  // The holdfast's reach from its centre on a bearing, in plan: an
  // icosahedron's outline from above is near an ellipse of its two plan
  // scales, taken at 0.85 of them so a foot drawn at the full reach is
  // still under the skin, in its own frame, which `yaw` turns — a world
  // bearing is `yaw` further round in the local frame (three's
  // `rotation.y` takes local to world by subtracting it; an early build
  // had the sign the other way and stood three feet past their holdfast).
  // The ray cast over each foot below is what proves the foot stands on
  // the holdfast; this only aims it.
  const reach = (bearing) => {
    const b = bearing + yaw;
    return 0.85 / Math.hypot(Math.cos(b) / s[0], Math.sin(b) / s[2]);
  };
  return { x, z, reach, mesh };
});

// --- the stalks ----------------------------------------------------------------
const RING = 3;
const RINGS = 5;
// The spire's band rule ring to ring, with the foot cap (`RING − 2`
// triangles of `fan`) taken off: open at both ends.
const STALK_CUT = seabed
  .column(
    Array.from({ length: RINGS }, (_, b) => Array.from({ length: RING }, (_, i) => b * RING + i))
  )
  .slice(RING - 2);

/**
 * A stalk's axis and radius at t ∈ [0, 1] of its height, from its own
 * numbers: the lean, bending as t^1.6, plus the rings' sideways wander
 * taken straight between the rings it is drawn at.
 */
function stalkCurve({ foot, height, leanDir, lean, r0, rh, wander }) {
  const walk = (t) => {
    const u = t * (RINGS - 1);
    const b = Math.min(RINGS - 2, Math.floor(u));
    const f = u - b;
    return [
      wander[b][0] + (wander[b + 1][0] - wander[b][0]) * f,
      wander[b][1] + (wander[b + 1][1] - wander[b][1]) * f,
    ];
  };
  return {
    axis: (t) => {
      const [wx, wz] = walk(t);
      return [
        foot[0] + Math.cos(leanDir) * lean * t ** 1.6 + wx,
        height * t,
        foot[1] + Math.sin(leanDir) * lean * t ** 1.6 + wz,
      ];
    },
    radius: (t) => r0 + (rh - r0) * t,
  };
}

/** Whether two stalks' axes come within their radii and `margin` anywhere above t = 0.3. */
function crosses(a, b, margin = 0.15) {
  for (let t = 0.3; t <= 1.0001; t += 0.05) {
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
      const reach = hold.reach(bearing) * draw.between(0.45, 1);
      const foot = [hold.x + reach * Math.cos(bearing), hold.z + reach * Math.sin(bearing)];
      const across = bearing - CURRENT;
      const fan = [1 - AWAY + AWAY * Math.abs(Math.cos(across)), AWAY * Math.sin(across)];
      // The walk: each ring above the foot steps up to 0.5 m sideways on
      // from the ring below.
      const wander = [[0, 0]];
      for (let b = 1; b < RINGS; b++)
        wander.push([
          wander[b - 1][0] + draw.between(-0.5, 0.5),
          wander[b - 1][1] + draw.between(-0.5, 0.5),
        ]);
      spec = {
        foot,
        height,
        leanDir: CURRENT + Math.atan2(fan[1], fan[0]) + draw.between(-0.2, 0.2),
        lean: height * draw.between(0.15, 0.25),
        r0: draw.between(0.35, 0.5),
        rh: 0.15,
        wander,
        phase: draw() * 2 * Math.PI,
        tip: k === tallest,
        clump: c,
      };
      Object.assign(spec, stalkCurve(spec));
      // A foot whose ray misses the holdfast's skin is redrawn with the rest.
      hold.mesh.updateMatrixWorld(true);
      caster.set(new THREE.Vector3(foot[0], 10, foot[1]), new THREE.Vector3(0, -1, 0));
      const onHoldfast = caster.intersectObject(hold.mesh, false).length > 0;
      if (onHoldfast && !stalks.some((other) => crosses(spec, other) || crosses(other, spec)))
        break;
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

// --- the fronds ------------------------------------------------------------------
// A ribbon: five stations along its path, two corners each, the quads
// between them cut on one diagonal. Two-sided `kelp`, so the winding is
// the cut's and not a face's.
const STATIONS = 5;
const FROND_CUT = [];
for (let i = 0; i + 1 < STATIONS; i++) {
  const a = 2 * i;
  FROND_CUT.push([a, a + 1, a + 3], [a, a + 3, a + 2]);
}
// Each station's width as a share of the frond's widest, the root fixed.
const WIDTHS = [null, 0.7, 1, 0.85, 0.45];
const ROOT_WIDTH = 0.1;

/**
 * The stalk's section at height `y`, as built: the corners of the prism
 * between the two rings that bound `y`, interpolated by height.
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

/** Whether plan point (x, z) is inside the convex polygon of plan corners. */
function inside([x, z], corners) {
  let sign = 0;
  for (let i = 0; i < corners.length; i++) {
    const [ax, , az] = corners[i];
    const [bx, , bz] = corners[(i + 1) % corners.length];
    const cross = (bx - ax) * (z - az) - (bz - az) * (x - ax);
    if (cross === 0) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

const span = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/**
 * Points over a frond's triangles on a 0.2 m grid, corners and edges
 * included, so a check against them cannot miss a stalk or a frond
 * passing through a face between two samples — an earlier build sampled
 * the edges every tenth of their length and the sweep caught a stalk
 * through a quad and a frond through a frond.
 */
function samples(points) {
  const out = [];
  for (const [a, b, c] of FROND_CUT) {
    const A = points[a];
    const B = points[b];
    const C = points[c];
    const edge = Math.max(span(A, B), span(B, C), span(C, A));
    const n = Math.max(2, Math.ceil(edge / 0.2));
    for (let i = 0; i <= n; i++)
      for (let j = 0; i + j <= n; j++)
        out.push([
          A[0] + ((B[0] - A[0]) * i + (C[0] - A[0]) * j) / n,
          A[1] + ((B[1] - A[1]) * i + (C[1] - A[1]) * j) / n,
          A[2] + ((B[2] - A[2]) * i + (C[2] - A[2]) * j) / n,
        ]);
  }
  return out;
}

/**
 * Whether a frond comes within `margin` of any stalk but its own: every
 * sample of its faces against each other stalk's prism as built
 * (`section`, the rings' wander and pushed corners included), over the
 * stalks whose foot is within 25 m of the frond's root.
 */
function clips(points, own, margin = 0.15) {
  const root = points[0];
  const near = stalks.filter(
    (o) => o !== own && Math.hypot(o.foot[0] - root[0], o.foot[1] - root[2]) < 25
  );
  if (near.length === 0) return false;
  for (const [x, y, z] of samples(points))
    for (const o of near) {
      if (y < 0 || y > o.head[1]) continue;
      const sec = section(o, y);
      const reach = Math.max(
        ...sec.corners.map(([cx, , cz]) => Math.hypot(cx - sec.centre[0], cz - sec.centre[2]))
      );
      if (Math.hypot(x - sec.centre[0], z - sec.centre[2]) < reach + margin) return true;
    }
  return false;
}

/**
 * Whether a frond comes within `margin` of a frond already set: the same
 * samples, each against every triangle of every earlier frond whose box is
 * near, so a stand's fronds stand off one another and the sweep lists no
 * frond against a frond.
 */
const setFronds = [];
function crowds(points, margin = 0.15) {
  const box = new THREE.Box3();
  for (const q of points) box.expandByPoint(new THREE.Vector3(...q));
  box.expandByScalar(margin);
  const near = setFronds.filter((o) => o.box.intersectsBox(box));
  if (near.length === 0) return false;
  const at = new THREE.Vector3();
  const closest = new THREE.Vector3();
  for (const q of samples(points)) {
    at.set(q[0], q[1], q[2]);
    for (const o of near)
      for (const tri of o.tris) {
        tri.closestPointToPoint(at, closest);
        if (closest.distanceTo(at) < margin) return true;
      }
  }
  return false;
}

/**
 * A frond's ten corners from its root and its numbers: at each of five
 * stations along the path, the centre and the ribbon's cross vector — the
 * side vector turned about the path's tangent by the twist so far — at
 * that station's half-width.
 */
function ribbon({ root, beta, length, width, rise, droop, sweep, twist }) {
  const out = new THREE.Vector3(Math.cos(beta), 0, Math.sin(beta));
  const side = new THREE.Vector3(-Math.sin(beta), 0, Math.cos(beta));
  const up = new THREE.Vector3(0, 1, 0);
  const at = (u) =>
    new THREE.Vector3(...root)
      .addScaledVector(out, length * u)
      .addScaledVector(up, length * (rise * u - droop * u * u))
      .addScaledVector(side, sweep * length * Math.sin(Math.PI * u));
  const points = [];
  for (let i = 0; i < STATIONS; i++) {
    const u = i / (STATIONS - 1);
    const c = at(u);
    const tangent = at(Math.min(1, u + 0.01))
      .sub(at(Math.max(0, u - 0.01)))
      .normalize();
    const across = side.clone().applyAxisAngle(tangent, twist * u);
    const half = (i === 0 ? ROOT_WIDTH : width * WIDTHS[i]) / 2;
    points.push(
      c.clone().addScaledVector(across, -half).toArray(),
      c.clone().addScaledVector(across, half).toArray()
    );
  }
  return points;
}

let frondIndex = 0;
for (const s of stalks) {
  const hold = holdfasts[s.clump];
  const away = Math.atan2(s.foot[1] - hold.z, s.foot[0] - hold.x);
  // Five fronds to a stalk and six on each clump's first three: 456 in
  // all, the budget's.
  const count = s.index % PER_CLUMP < 3 ? 6 : 5;
  for (let b = 0; b < count; b++) {
    let points;
    let corners;
    for (let tries = 0; ; tries++) {
      const t = draw.between(0.15, 0.97);
      // Round the stalk by its share of the turn from the way out of the
      // clump; a frond boxed in by its neighbours swings wider each redraw.
      const swing = 0.5 + tries * 0.05;
      const beta = away + (b * 2 * Math.PI) / count + draw.between(-swing, swing);
      // A frond still boxed in after fifty redraws shortens, to 0.4 at most.
      const length = draw.between(6, 14) * Math.max(0.4, 1 - Math.max(0, tries - 50) * 0.02);
      const spec = {
        beta,
        length,
        width: draw.between(0.8, 1.6),
        rise: draw.between(0.3, 0.7),
        droop: draw.between(0.5, 1.2),
        sweep: draw.between(0.05, 0.25) * (draw() < 0.5 ? -1 : 1),
        twist: draw.between(0.5, 1.5) * Math.PI * (draw() < 0.5 ? -1 : 1),
      };
      const y = s.height * t;
      const sec = section(s, y);
      corners = sec.corners;
      // Rooted inside the prism's section, so the frond pierces the stalk's skin.
      const r = 0.2 * s.radius(t);
      spec.root = [sec.centre[0] + Math.cos(beta) * r, y, sec.centre[2] + Math.sin(beta) * r];
      points = ribbon(spec);
      // A frond that would droop under the floor, pass through a
      // neighbour, or through another frond, is redrawn.
      const underground = points.some((q) => q[1] < 0.1);
      if (!underground && !clips(points, s) && !crowds(points)) break;
      if (tries > 400)
        throw new Error(`env_kelp_stand: frond ${frondIndex + 1} finds no clear bearing`);
    }
    for (const corner of [points[0], points[1]])
      if (!inside([corner[0], corner[2]], corners))
        throw new Error(`env_kelp_stand: frond ${frondIndex + 1} roots off stalk ${s.index + 1}`);
    add(stand, `frond_${nn(frondIndex, 3)}`, faceted(points, FROND_CUT), kelp);
    {
      const v = points.map((q) => new THREE.Vector3(...q));
      const box = new THREE.Box3().setFromPoints(v);
      setFronds.push({
        box,
        tris: FROND_CUT.map(([a, b, c]) => new THREE.Triangle(v[a], v[b], v[c])),
      });
    }
    frondIndex++;
  }
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
// The height's fit: whichever reaches higher — the tallest lit head with
// its tip over it, or a frond's end rising past its stalk's head — lands
// on the row's 40 m exactly, so the figure is the script's and not the
// stream's; the plan fit alone left it anywhere from 38.7 to 41.1 m as a
// stalk's redraw reshuffled every draw after it.
const HEIGHT = 40;
const tipTop = 0.15 + tipGeo.boundingBox.max.y;
const headTop = Math.max(...tipHeads.map(([, hy]) => hy));
const rise = Math.min((HEIGHT - tipTop) / (headTop * fit), HEIGHT / (box.max.y * fit));
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
