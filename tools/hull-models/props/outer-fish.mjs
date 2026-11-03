/**
 * The outer fish — 4 m of footprint, the open-bowl swimmer
 * docs/free-water-slice.md §5 commissions for #1694's crater fixture
 * (#1711): "`env-outer-fish` | 4 m long | 8 / 600 | Open bowl, 700..1,000 m
 * depth; slow closed swimming paths". Public decoration under Block 4's
 * public-microfauna variant of ENV STYLE, not an animal of the bestiary:
 * no SIG, no entity, no collision, nothing lit.
 *
 * "Crater bowl, suspended | env-outer-fish | 4 m | 1.69 m | ≤ 600 | none"
 * (docs/asset-prompts-3d.md, Block 4). Two materials, `fish_flank` on the
 * body and `stone_dark` on the fins and eyes; 342 triangles; 1.69 m tall
 * at its 4 m by intake's measure (`sizeM`), which takes `--max-tris 600`
 * for this row and no `--world-light`: the file carries no emissive.
 *
 * Authored as a formula rather than ported: there is no export, as the
 * nodule bed and the kelp stand have none (#1555, #1712). Every number
 * below is drawn from one seeded stream (seabed.mjs `seeded`, seed 1711)
 * in the order the parts are built, so the file is the same on every
 * machine and `npm run check:models` holds the script to it. The whole is
 * built at its own size, centred on its plan, lowered to the ground and
 * held at the footprint before the bake (seabed.mjs `settle`), so the root
 * is an identity and seabed.mjs `stand` finds ×1.000; the fit is ×0.9991,
 * the tail lobes being drawn to end at the length.
 *
 * What it is made of, and why this shape. The three swimmers are one
 * grammar (seabed.mjs, "The microfauna"): a `shaft` body from a nose point
 * back through rings whose corners jitter, mirrored port to starboard, so
 * the skin is crisp facets rather than a lathe; `blade` fins rooted
 * through the skin; `lens` eyes, dark and unlit. They differ in proportion
 * and fin plan. This one is the heavy cruiser of the bowl, a grouper's
 * plan: a deep body, deepest a third of the way back, one long dorsal fin
 * running half the back — low along the front and rising to a rounded
 * lobe at the rear — rounded paddles for pectorals, a rounded anal fin and
 * a broad, shallow-forked tail. It swims at 700–1,000 m inside the
 * Draymaw's band, so the one thing it must not read as is a hunter: the
 * first build had a tall triangular dorsal, plank pectorals and a V of
 * two paddles for a tail, and read as a shark from the conn camera, which
 * the review refused; nothing here is swept to a point, and nothing of the
 * bestiary's classified three — no coil, no pack hunter's jaw, no colossus
 * (bestiary.md §4). Head on +x. The still swimming pose is the body's
 * bend: the axis sweeps to port (−z) from 40 % of the way back, the
 * peduncle 0.19 m off the nose's line and the tail lobes following its
 * tangent.
 *
 * - `body`, in `fish_flank`: a shaft of nine ten-cornered rings from a
 *   nose point at u = 0 (x = +2) back to a flat-capped peduncle at u =
 *   0.86, a corner at the top of every ring so the back is a ridge, half-
 *   heights 0.14 to 0.60 m — deepest at u 0.32–0.45 — and half-widths
 *   0.5–0.85 of them (compressed, rounder at the head), the axis cambered
 *   up 6 cm amidships and bent to port from u 0.40, the peduncle 0.19 m
 *   off the nose's line; every corner pushed in or out by up to 4 % of its
 *   radius and slipped along the axis by as much, each port corner the
 *   mirror of its starboard one. 178 triangles.
 * - `dorsal`, in `stone_dark`: one blade of eight corners rooted along the
 *   ridge from u 0.26 to 0.80, 8 cm under it, its plane yawed to that root
 *   chord so it follows the bend (seabed.mjs `median`; the script samples
 *   the chord at 21 points and every one is inside the body), its top
 *   0.18 m over the ridge at the front, 0.26 m at u 0.36, 0.30 m at 0.48,
 *   0.40 m at 0.60, 0.44 m at the rear lobe (u 0.70) and 0.20 m where the
 *   raked trailing edge leaves it at u 0.78. 28 triangles.
 * - `anal`, in `stone_dark`: a rounded blade of six corners under the keel
 *   from u 0.60 to 0.74, yawed to its root chord alike, 0.12–0.34 m out of
 *   the keel; its foot is the fish's lowest point. 20 triangles.
 * - `pectoral_p` / `pectoral_s`, in `stone_dark`: rounded paddles of six
 *   corners rooted in the flank at u 0.22 a little under the beam, laid
 *   aft along the flank 15° out and tipped down, 0.48 m long and 0.28 m
 *   broad. 20 each.
 * - `pelvic_p` / `pelvic_s`, in `stone_dark`: small rounded blades of five
 *   corners under the belly at u 0.30, 0.28 m long. 16 each.
 * - `tail_upper` / `tail_lower`, in `stone_dark`: the two broad lobes of
 *   the tail, blades of five corners each rooted in the peduncle 0.16 m
 *   forward of its cap and reaching 0.56 m aft of it, 0.52 m over or under
 *   the axis at the lobe's outer corner, in the plane of the bend's
 *   tangent, 1.6 cm apart at the root so neither touches the other. 16
 *   each; their aft corners are what makes the fish 4 m.
 * - `eye_p` / `eye_s`, in `stone_dark`: six-sided lenses on the beam facet
 *   of the head's second band (u 0.10–0.20), each on the middle of the
 *   diagonal its facet is cut on, so the two mirror exactly (the script
 *   asserts it); radius 8.0 cm — the 8 cm asked, which the second band's
 *   facets are wide enough for where the first band's cap halved it to a
 *   pinprick — apex a quarter of that proud and base ring a tenth under.
 *   6 each. Dark: no eye that glows.
 *
 * Port is −z. Every fin's blade is 3.2 cm thick and roots inside the body
 * — the sweep lists each fin against the body and nothing else, and the
 * eyes against the body — so nothing floats. The root is `env_outer_fish`,
 * an identity, the plan's box centred on the origin and the lowest point,
 * the anal fin's foot, on y = 0; the runtime hangs the fish
 * at its listed depth, and nothing here says where in the column it
 * belongs.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 4;
const MAX_TRIS = 600;
const SEED = 1711;
const L = FOOTPRINT;

const flank = seabed.ground.fishFlank();
const dark = seabed.ground.stoneDark();

const fish = new THREE.Group();
fish.name = 'env_outer_fish';

const draw = seabed.seeded(SEED);

// --- the body ------------------------------------------------------------------
// Stations as fractions of the length back from the nose, half-heights as
// fractions of it, half-widths as fractions of the half-height.
const STATIONS = [
  [0.04, 0.035, 0.85],
  [0.1, 0.08, 0.7],
  [0.2, 0.125, 0.55],
  [0.32, 0.15, 0.5],
  [0.45, 0.15, 0.5],
  [0.58, 0.13, 0.5],
  [0.7, 0.095, 0.5],
  [0.8, 0.055, 0.55],
  [0.86, 0.035, 0.65],
].map(([u, ry, k]) => ({ u, ry: ry * L, rz: ry * k * L }));
const PEDUNCLE = STATIONS[STATIONS.length - 1].u;
const camber = (u) => 0.015 * L * Math.sin(Math.PI * u);
const bend = (u) => -0.08 * L * Math.max(0, (u - 0.4) / 0.6) ** 2;
const body = seabed.fishBody(draw, {
  length: L,
  sides: 10,
  stations: STATIONS,
  camber,
  bend,
});
add(fish, 'body', body.geo, flank);

// --- the fins -----------------------------------------------------------------
const THICK = 0.008 * L;
const INSET = 0.02 * L;
/**
 * A fin along the back (sign 1) or belly (−1) from u0 to u1, rooted INSET
 * inside and yawed to its root chord (seabed.mjs `median`), its free edge
 * `tops`, `[u, h]` from the rear forward, each h metres out of the ridge
 * or keel there. The dorsal's chord runs through the bend: at u 0.80 the
 * axis is 0.14 m to port of the nose's line, and a plane at the front
 * root's z stood 5 cm outside the skin there until round 2.
 */
const medians = [];
const median = (name, u0, u1, sign, tops) => {
  const made = seabed.median(body, { u0, u1, sign, inset: INSET, tops, thickness: THICK });
  medians.push({ name, root: made.root });
  return add(fish, name, made.geo, dark);
};
median('dorsal', 0.26, 0.8, 1, [
  [0.78, 0.05 * L],
  [0.7, 0.11 * L],
  [0.6, 0.1 * L],
  [0.48, 0.075 * L],
  [0.36, 0.065 * L],
  [0.26, 0.045 * L],
]);
median('anal', 0.6, 0.74, -1, [
  [0.73, 0.03 * L],
  [0.69, 0.08 * L],
  [0.64, 0.085 * L],
  [0.6, 0.03 * L],
]);

/** A paired fin rooted in the flank at u and phi, mirrored by `side` (+1 starboard, −1 port). */
const paired = (name, u, phi, along, span, outline) => {
  for (const [tag, side] of [
    ['p', -1],
    ['s', 1],
  ]) {
    const [ax, ay, az] = body.axis(u);
    const [px, py, pz] = body.point(u, side > 0 ? phi : Math.PI - phi);
    // Rooted INSET inside the skin, toward the axis.
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
  0.22,
  -0.3,
  [-0.95, -0.15, 0.25],
  [-0.3, -0.8, 0.6],
  [
    [0, 0],
    [0.05, 0],
    [0.12, 0.03],
    [0.12, 0.06],
    [0.06, 0.07],
    [0.01, 0.04],
  ]
);
paired(
  'pelvic',
  0.3,
  -Math.PI / 2 + 0.5,
  [-0.9, -0.3, 0.3],
  [0, -1, 0.4],
  [
    [0, 0],
    [0.05, 0],
    [0.07, 0.03],
    [0.04, 0.05],
    [0.01, 0.03],
  ]
);

// The tail: two broad lobes in the plane of the peduncle's tangent, rooted
// 1.6 cm either side of the axis so they do not meet.
{
  const cap = body.axis(PEDUNCLE);
  const on = body.axis(1);
  const tangent = [on[0] - cap[0], on[1] - cap[1], on[2] - cap[2]];
  for (const [name, sign] of [
    ['tail_upper', 1],
    ['tail_lower', -1],
  ])
    add(
      fish,
      name,
      seabed.fin({
        root: cap,
        along: tangent,
        span: [0, sign, 0],
        outline: [
          [-0.04, 0.002],
          [0.05, 0.002],
          [0.14, 0.09],
          [0.12, 0.13],
          [0.06, 0.12],
        ].map(([a, b]) => [a * L, b * L]),
        thickness: THICK,
      }),
      dark
    );
}

// --- the eyes ----------------------------------------------------------------------
const EYE = 0.02 * L;
// On the second band (u 0.10–0.20), whose facets are wide enough for the
// radius asked; on the first the cap halved it and it read as a pinprick.
const EYE_U = 0.13;
const EYE_PHI = 0;
const eyes = {};
for (const [tag, side] of [
  ['p', -1],
  ['s', 1],
]) {
  const facet = body.facetAt(EYE_U, side > 0 ? EYE_PHI : Math.PI - EYE_PHI);
  eyes[tag] = seabed.lens(facet, EYE);
  add(fish, `eye_${tag}`, eyes[tag].geo, dark);
}

// --- the symmetry, the fit, the checks, then out ------------------------------------
// The eyes mirror about the axis's vertical plane, in the nominal frame
// before the fit: same x and y, z mirrored about the bend there.
{
  const a = eyes.p.centre;
  const b = eyes.s.centre;
  const axis = eyes.s.facet.axisAt(eyes.s.facet.midU);
  const off = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs((a.z + b.z) / 2 - axis.z));
  if (off > 1e-6) throw new Error(`env_outer_fish: the eyes do not mirror (off ${off})`);
}
// Every median fin's root chord lies inside the closed body, sampled along
// its whole length (seabed.mjs `insideBody`), in the nominal frame.
for (const { name, root } of medians)
  for (let k = 0; k <= 20; k++)
    if (!seabed.insideBody(body.geo, root[0].clone().lerp(root[1], k / 20).toArray()))
      throw new Error(`env_outer_fish: ${name} root sample ${k} is outside the body`);
const fit = seabed.settle(fish, FOOTPRINT);
const { drawn, k } = seabed.stand(fish, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(fish);
const size = new THREE.Box3().setFromObject(fish).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_outer_fish: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('stone_dark'))
  throw new Error(`env_outer_fish: materials [${[...t.materials]}], not fish_flank and stone_dark`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_outer_fish: lowest vertex at ${t.lowest}, not on the ground`);
if (t.reach.x > FOOTPRINT / 2 + 1e-3 || t.reach.z > FOOTPRINT / 2 + 1e-3)
  throw new Error(`env_outer_fish: reaches ${t.reach.x} by ${t.reach.z} from the origin, past ${FOOTPRINT / 2}`);
fish.traverse((o) => {
  if (o.isMesh && o.material.emissive.getHex() !== 0)
    throw new Error(`env_outer_fish: ${o.name} carries an emissive`);
});
console.log(
  `env_outer_fish: ${t.tris} triangles, fit ×${fit.toFixed(4)}, drawn ${drawn.toFixed(4)} long, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.x.toFixed(2)} by ${size.z.toFixed(2)} by ${size.y.toFixed(4)} m tall, materials ${[...t.materials].join(' + ')}, on the ground: ${t.onFloor.join(', ')}; ` +
    `eyes r ${(eyes.s.radius * fit).toFixed(4)} m at u ${((L / 2 - eyes.s.centre.x) / L).toFixed(3)}`
);
await exportGlb(fish, 'env-outer-fish.glb');
