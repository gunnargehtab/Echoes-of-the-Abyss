/**
 * The deep fish — 2 m of footprint, the deep-pocket swimmer
 * docs/free-water-slice.md §5 commissions for #1694's crater fixture
 * (#1711): "`env-deep-fish` | 2 m long | 8 / 400 | Deep pocket,
 * 1,900..2,100 m depth; sparse photophore points". Public decoration under
 * Block 4's public-microfauna variant of ENV STYLE, not an animal of the
 * bestiary: no SIG, no entity, no collision, and nothing lit in the file.
 *
 * "Crater deep pocket, suspended | env-deep-fish | 2 m | 0.84 m | ≤ 400 |
 * none" (docs/asset-prompts-3d.md, Block 4). Two materials, `fish_flank`
 * on the body and its photophore seats and `stone_dark` on the fins and
 * eyes; 304 triangles; 0.84 m tall (0.8426) at its 2 m by intake's measure
 * (`sizeM`), which takes `--max-tris 400` for this row and no
 * `--world-light`: the file carries no emissive, the row's Light is
 * `none`, and the photophores are the runtime's — at most six soft rung-5
 * dots on the public-life channel (docs/style-neon-noir.md "World light"),
 * which #1713 places by reading the six seats below off the file.
 *
 * Authored as a formula rather than ported: there is no export, as the
 * nodule bed and the kelp stand have none (#1555, #1712). Every number
 * below is drawn from one seeded stream (seabed.mjs `seeded`, seed 1711)
 * in the order the parts are built, so the file is the same on every
 * machine and `npm run check:models` holds the script to it. The whole is
 * built at its own size, centred on its plan, lowered to the ground and
 * held at the footprint before the bake (seabed.mjs `settle`), so the root
 * is an identity and seabed.mjs `stand` finds ×1.000.
 *
 * What it is made of, and why this shape. The three swimmers are one
 * grammar (seabed.mjs, "The microfauna"): a `shaft` body from a nose point
 * back through rings whose corners jitter, mirrored port to starboard, so
 * the skin is crisp facets rather than a lathe; `blade` fins rooted
 * through the skin; `lens` eyes, dark and unlit. They differ in proportion
 * and fin plan. This one is the fish of 2,000 m: a large blunt head with a
 * large eye, the body deepest just behind it and drawn out to a whip of a
 * tail with no caudal fin at all, a tall narrow first dorsal, and a long
 * low second dorsal and anal running the tail — a grenadier's plan, which
 * is what lives at that depth, and nothing of the bestiary's classified
 * three: no coil, no pack hunter's jaw, no colossus, no lure and no eye
 * that glows (bestiary.md §4, the variant). Head on +x. The still
 * swimming pose is the whip's sway: the axis bends to starboard (+z) from
 * 40 % of the way back, the tail's end 0.12 m off the nose's line.
 *
 * - `body`, in `fish_flank`: a shaft of ten eight-cornered rings from a
 *   nose point at u = 0 (x = +1) to a tail point at u = 1 (x = −1), the
 *   first ring 10 cm behind the nose so the snout is blunt, a corner at the
 *   top of every ring so the back is a ridge, half-heights 0.2 m at u 0.20
 *   falling to 1 cm at u 0.97 and half-widths 0.85 of them at the head to
 *   0.5 along the tail, the axis cambered up 2 cm amidships; every corner
 *   pushed in or out by up to 4 % of its radius and slipped along the axis
 *   by as much, each port corner the mirror of its starboard one. 160
 *   triangles.
 * - `dorsal_fore`, in `stone_dark`: a tall narrow triangle rooted along the
 *   ridge from u 0.21 to 0.27, 3 cm under it, its apex 0.38 m over the ridge
 *   at u 0.30 (0.40 m over the root itself) and 0.18 m aft of its leading
 *   corner. 8 triangles.
 * - `dorsal_aft_1..3` and `anal_1..3`, in `stone_dark`: the long low fins
 *   that run the tail, each in three blades so every blade's straight root
 *   stays inside a body that tapers under it — over u 0.33–0.535,
 *   0.545–0.75 and 0.76–0.93 on the back and u 0.40–0.59, 0.60–0.78 and
 *   0.79–0.93 under the keel, 2 cm apart at the root (1 % of the length)
 *   so no two meet, 7 cm tall at the front and 3.6 cm at the back, each
 *   blade's trailing edge raked 6 cm so the run reads as one fin stepping
 *   down rather than three panels; rooted 3 cm under the ridge and keel,
 *   or four tenths of the half-height where the whip is thinner than
 *   that, so the last dorsal and anal blades stand clear of each other
 *   inside it, and each blade's plane yawed to its own root chord so the
 *   blades on the whip follow its sway (seabed.mjs `median`; the script
 *   samples every median root at 21 points, all inside the body). 12
 *   each, 72 in all.
 * - `pectoral_p` / `pectoral_s`, in `stone_dark`: rooted in the flank at u
 *   0.16 on the beam, swept aft and a little down, 0.26 m long; `pelvic_p`
 *   / `pelvic_s` the thin pair under the throat at u 0.20, 0.2 m long,
 *   trailing down and aft. 12 each and 8 each.
 * - `eye_p` / `eye_s`, in `stone_dark`: six-sided lenses on the facet
 *   above the beam of the head's first band (u 0.05–0.12), each on the
 *   middle of the diagonal its facet is cut on, so the two mirror exactly
 *   (the script asserts it); radius 3.32 cm, capped at 0.45 of the facet's
 *   shortest edge from the 7 cm asked, apex a quarter of that proud and
 *   base ring a tenth under. 6 each.
 * - `photophore_01..06`, in `fish_flank`, the body's own material: six
 *   lozenges of 3 by 1.6 cm, two triangles each, each lying 2 cm proud of
 *   the lower-flank facet it sits on — the facet below the beam — and
 *   facing its way: the seats of the runtime's dots, dark in the file.
 *   Three a side in a row along the lower flank from behind the pectoral's
 *   root to over the anal fin's front, each on the point of its facet's
 *   cut diagonal at u 0.25, 0.36 and 0.48 (0.254, 0.360 and 0.480 in the
 *   file, the slip of the ring corners counted; x 0.493, 0.280 and 0.041): `_01` to `_03` on port (−z), nose to
 *   tail, `_04` to `_06` on starboard at the mirrored skin points (the
 *   skin points mirror to 1e-6; a lozenge's centre differs from its
 *   partner's by up to 2 mm in x, since a band in the bend is sheared and
 *   the two facets' normals are not mirror images). 12 triangles. The
 *   script asserts all six are there, in `fish_flank`, 2 cm off their
 *   facet by the triangles the file carries, with no emissive, and that
 *   each port seat's skin point mirrors its starboard one's.
 *
 * Port is −z. Every fin's blade is 1 cm thick and roots inside the body —
 * the sweep lists each fin against the body and nothing else, the eyes
 * against the body, and the seats against nothing, 2 cm off the skin — so
 * nothing floats but the seats, which mean to. The root is
 * `env_deep_fish`, an identity, the plan's box centred on the origin and
 * the lowest point, the pelvic fins' tips, on y = 0; the runtime hangs the
 * fish at its listed depth, and nothing here says where in the column it
 * belongs.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 2;
const MAX_TRIS = 400;
const SEED = 1711;
const L = FOOTPRINT;

const flank = seabed.ground.fishFlank();
const dark = seabed.ground.stoneDark();

const fish = new THREE.Group();
fish.name = 'env_deep_fish';

const draw = seabed.seeded(SEED);

// --- the body ------------------------------------------------------------------
const STATIONS = [
  [0.05, 0.05, 0.85],
  [0.12, 0.085, 0.75],
  [0.2, 0.1, 0.65],
  [0.3, 0.092, 0.6],
  [0.42, 0.072, 0.55],
  [0.55, 0.052, 0.5],
  [0.68, 0.034, 0.5],
  [0.8, 0.02, 0.5],
  [0.9, 0.011, 0.5],
  [0.97, 0.005, 0.5],
].map(([u, ry, k]) => ({ u, ry: ry * L, rz: ry * k * L }));
const camber = (u) => 0.01 * L * Math.sin(Math.PI * u);
const bend = (u) => 0.06 * L * Math.max(0, (u - 0.4) / 0.6) ** 1.5;
const body = seabed.fishBody(draw, {
  length: L,
  sides: 8,
  stations: STATIONS,
  tail: 'point',
  camber,
  bend,
});
add(fish, 'body', body.geo, flank);

// --- the fins -----------------------------------------------------------------
const THICK = 0.005 * L;
const INSET = 0.015 * L;
// A fin along the back (sign 1) or belly (−1) from u0 to u1, rooted INSET
// under the ridge or keel — or four tenths of the half-height where the
// whip is thinner than that, so the dorsal and anal roots never cross
// inside it — and yawed to its root chord (seabed.mjs `median`), so a
// blade on the whip follows the sway: until round 2 each stood in the
// plane of its front root and the rear of the last two hung 2–4 cm
// outside a whip 1.8 cm wide.
const medians = [];
const median = (name, u0, u1, sign, tops) => {
  const made = seabed.median(body, { u0, u1, sign, inset: INSET, tops, thickness: THICK });
  medians.push({ name, root: made.root });
  return add(fish, name, made.geo, dark);
};
median('dorsal_fore', 0.21, 0.27, 1, [[0.3, 0.19 * L]]);
// The long low fins, in three blades each: a straight root over a fifth of
// the length stays under a skin that tapers between its two ends; 1 % of
// the length between one blade's root and the next's, and each blade's
// trailing edge raked RAKE back from its root's end.
const RIBBON = [
  ['dorsal_aft', 1, [0.33, 0.535, 0.545, 0.75, 0.76, 0.93]],
  ['anal', -1, [0.4, 0.59, 0.6, 0.78, 0.79, 0.93]],
];
const RAKE = 0.03;
for (const [name, sign, at] of RIBBON)
  for (let i = 0; i < 3; i++) {
    const u0 = at[2 * i];
    const u1 = at[2 * i + 1];
    const h0 = (0.035 - 0.005 * i) * L;
    const h1 = (0.028 - 0.005 * i) * L;
    median(`${name}_${i + 1}`, u0, u1, sign, [
      [u1 - RAKE, h1],
      [u0 + 0.005, h0],
    ]);
  }

const paired = (name, u, phi, along, span, outline) => {
  for (const [tag, side] of [
    ['p', -1],
    ['s', 1],
  ]) {
    const [ax, ay, az] = body.axis(u);
    const [px, py, pz] = body.point(u, side > 0 ? phi : Math.PI - phi);
    const k = 1 - INSET / Math.hypot(py - ay, pz - az);
    add(
      fish,
      `${name}_${tag}`,
      seabed.fin({
        root: [px, ay + (py - ay) * k, az + (pz - az) * k],
        along: [along[0], along[1], side * along[2]],
        span: [span[0], span[1], side * span[2]],
        outline: outline.map(([a, b]) => [a * L, b * L]),
        thickness: THICK,
      }),
      dark
    );
  }
};
paired(
  'pectoral',
  0.16,
  -0.1,
  [-0.9, -0.15, 0.4],
  [-0.3, -0.6, 1],
  [
    [0, 0],
    [0.04, 0],
    [0.13, 0.04],
    [0.1, 0.06],
  ]
);
paired(
  'pelvic',
  0.2,
  -Math.PI / 2 + 0.6,
  [-0.7, -0.6, 0.35],
  [0.2, -0.5, 1],
  [
    [0, 0],
    [0.02, 0],
    [0.1, 0.03],
  ]
);

// --- the eyes ----------------------------------------------------------------------
const EYE = 0.035 * L;
const EYE_U = 0.085;
// The facet above the beam: the rings' corners stand at 45° steps from the
// top, so the beam is a corner and the facet over it runs 0–45°.
const EYE_PHI = Math.PI / 8;
const eyes = {};
for (const [tag, side] of [
  ['p', -1],
  ['s', 1],
]) {
  const facet = body.facetAt(EYE_U, side > 0 ? EYE_PHI : Math.PI - EYE_PHI);
  eyes[tag] = seabed.lens(facet, EYE);
  add(fish, `eye_${tag}`, eyes[tag].geo, dark);
}

// --- the photophore seats -----------------------------------------------------------
// Three a side on the lower flank, the facet below the beam (its middle
// 22.5° under the beam), port first, nose to tail, each on the point of
// its facet's cut diagonal at its u.
const PROUD = 0.02;
const SEATS_U = [0.25, 0.36, 0.48];
const SEAT_PHI = -Math.PI / 8;
const seats = [];
let n = 0;
for (const side of [-1, 1])
  for (const u of SEATS_U) {
    const facet = body.facetAt(u, side > 0 ? SEAT_PHI : Math.PI - SEAT_PHI);
    const { geo, on } = seabed.seat(facet, u, [0.03, 0.016], PROUD);
    const mesh = add(fish, `photophore_${String(++n).padStart(2, '0')}`, geo, flank);
    seats.push({ mesh, on, u, facet });
  }

// --- the symmetry, the fit, the checks, then out ------------------------------------
// Eyes and seats mirror about the axis's vertical plane, in the nominal
// frame before the fit: same x and y, z mirrored about the bend there.
const mirrored = (what, a, b, axis) => {
  const off = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs((a.z + b.z) / 2 - axis.z));
  if (off > 1e-6) throw new Error(`env_deep_fish: ${what} do not mirror (off ${off})`);
};
mirrored('the eyes', eyes.p.centre, eyes.s.centre, eyes.s.facet.axisAt(eyes.s.facet.midU));
for (let i = 0; i < 3; i++)
  mirrored(
    `seats ${i + 1} and ${i + 4}`,
    seats[i].on,
    seats[i + 3].on,
    seats[i + 3].facet.axisAt(seats[i + 3].u)
  );

// Every median fin's root chord lies inside the closed body, sampled along
// its whole length (seabed.mjs `insideBody`), in the nominal frame.
for (const { name, root } of medians)
  for (let k = 0; k <= 20; k++)
    if (!seabed.insideBody(body.geo, root[0].clone().lerp(root[1], k / 20).toArray()))
      throw new Error(`env_deep_fish: ${name} root sample ${k} is outside the body`);
const fit = seabed.settle(fish, FOOTPRINT);
const { drawn, k } = seabed.stand(fish, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(fish);
const size = new THREE.Box3().setFromObject(fish).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_deep_fish: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('stone_dark'))
  throw new Error(`env_deep_fish: materials [${[...t.materials]}], not fish_flank and stone_dark`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_deep_fish: lowest vertex at ${t.lowest}, not on the ground`);
if (t.reach.x > FOOTPRINT / 2 + 1e-3 || t.reach.z > FOOTPRINT / 2 + 1e-3)
  throw new Error(`env_deep_fish: reaches ${t.reach.x} by ${t.reach.z} from the origin, past ${FOOTPRINT / 2}`);
fish.traverse((o) => {
  if (o.isMesh && o.material.emissive.getHex() !== 0)
    throw new Error(`env_deep_fish: ${o.name} carries an emissive`);
});
// The six seats: present, in the body's material, two triangles each, and
// every one PROUD off the skin by the triangles the file carries (the
// whole was scaled by `fit` since, so the measure is scaled with it).
if (seats.length !== 6) throw new Error(`env_deep_fish: ${seats.length} photophore seats, not 6`);
const where = [];
seats.forEach(({ mesh }, i) => {
  const name = `photophore_${String(i + 1).padStart(2, '0')}`;
  if (mesh.name !== name || mesh.material.name !== 'fish_flank' || mesh.material.emissive.getHex())
    throw new Error(`env_deep_fish: ${mesh.name} is not a dark ${name} in fish_flank`);
  const p = mesh.geometry.attributes.position;
  if (p.count !== 6) throw new Error(`env_deep_fish: ${name} is ${p.count / 3} triangles, not 2`);
  const c = new THREE.Vector3();
  for (let v = 0; v < p.count; v++) c.add(new THREE.Vector3().fromBufferAttribute(p, v));
  c.divideScalar(p.count);
  const facet = seabed.nearestFacet(fish.getObjectByName('body').geometry, c.toArray());
  const off = c.clone().sub(facet.centroid).dot(facet.normal.clone().normalize());
  if (Math.abs(off - PROUD * fit) > 0.001)
    throw new Error(`env_deep_fish: ${name} stands ${off.toFixed(4)} m off its facet, not ${PROUD * fit}`);
  where.push(`${name} x ${c.x.toFixed(3)} y ${c.y.toFixed(3)} z ${c.z.toFixed(3)} (u ${((FOOTPRINT / 2 - c.x) / FOOTPRINT).toFixed(3)}, ${off.toFixed(4)} off)`);
});
console.log(
  `env_deep_fish: ${t.tris} triangles, fit ×${fit.toFixed(4)}, drawn ${drawn.toFixed(4)} long, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.x.toFixed(2)} by ${size.z.toFixed(2)} by ${size.y.toFixed(4)} m tall, materials ${[...t.materials].join(' + ')}, on the ground: ${t.onFloor.join(', ')}; ` +
    `eyes r ${(eyes.s.radius * fit).toFixed(4)} m at u ${((L / 2 - eyes.s.centre.x) / L).toFixed(3)}\n  ${where.join('\n  ')}`
);
await exportGlb(fish, 'env-deep-fish.glb');
