/**
 * The shoal fry — 0.5 m of footprint, one fish of the schools
 * docs/free-water-slice.md §5 commissions for #1694's crater fixture
 * (#1711): "`env-shoal-fry` | 0.5 m long | 4 shoals of 24 / 180 | Garden,
 * 250..300 m depth; fixed looping schools, never proximity scatter". One
 * fish in the file; the runtime instances twenty-four to a shoal. Public
 * decoration under Block 4's public-microfauna variant of ENV STYLE, not an
 * animal of the bestiary and not a Lampfry: no SIG, no entity, no
 * collision, nothing lit, and no scatter tell.
 *
 * "Crater garden, suspended | env-shoal-fry | 0.5 m | 0.15 m | ≤ 180 |
 * none" (docs/asset-prompts-3d.md, Block 4). Two materials, `fish_flank`
 * on the body and `stone_dark` on the fins and eyes; 150 triangles;
 * 0.15 m tall (0.1483) at its 0.5 m by intake's measure (`sizeM`), which takes
 * `--max-tris 180` for this row and no `--world-light`: the file carries
 * no emissive.
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
 * and fin plan. This one is the smallest and the simplest — a sprat's
 * plan: a slender, flat-sided body a quarter as deep as it is long, one
 * dorsal fin amidships, a forked tail and nothing else but pectorals and
 * a small anal fin, six corners a ring where the outer fish has ten,
 * because twenty-four of them swim together and the school is the shape,
 * not the fish. Head on +x. The still swimming pose is the body's bend:
 * the axis sweeps to port (−z) from a third of the way back, the tail's
 * fork 3 cm off the nose's line.
 *
 * - `body`, in `fish_flank`: a shaft of seven six-cornered rings from a
 *   nose point at u = 0 (x = +0.25) to a flat-capped peduncle at u = 0.80,
 *   a corner at the top of every ring so the back is a ridge, half-heights
 *   2 to 5 cm and half-widths 0.45–0.75 of them (a flat-sided fish), the
 *   axis cambered up 5 mm amidships; every corner pushed in or out by up
 *   to 4 % of its radius and slipped along the axis by as much, each port
 *   corner the mirror of its starboard one. 82 triangles.
 * - `dorsal`, in `stone_dark`: a triangle rooted along the ridge from u
 *   0.40 to 0.50, 7.5 mm under it and yawed to that root chord (seabed.mjs
 *   `median`; the script samples each median root at 21 points, all
 *   inside), 4.5 cm tall at its swept apex; `anal` the same under the keel
 *   from u 0.60 to 0.68, 2.5 cm tall. 8 each.
 * - `pectoral_p` / `pectoral_s`, in `stone_dark`: triangles rooted in the
 *   flank at u 0.20 a little under the beam, laid aft along the flank 15°
 *   out and tipped down, 5.5 cm long. 8 each.
 * - `tail_upper` / `tail_lower`, in `stone_dark`: the two lobes of the
 *   fork, each a blade of four corners rooted in the peduncle 1.5 cm
 *   forward of its cap and running 10 cm aft of it — its root chord
 *   3.25 cm along the axis, and across the lobe 1.5 cm at the root
 *   widening to 2.95 cm at its end, 5.5 cm over or under the axis —
 *   in the plane of the bend's tangent, 2 mm apart at the root so neither
 *   touches the other. 12 each; their tips are what makes the fish 0.5 m.
 * - `eye_p` / `eye_s`, in `stone_dark`: six-sided lenses on the beam facet
 *   of the head's first band (u 0.06–0.16), each on the middle of the
 *   diagonal its facet is cut on, so the two mirror exactly (the script
 *   asserts it); radius 8.9 mm, capped at 0.45 of the facet's shortest
 *   edge from the 1.4 cm asked — the first build's lens stood past the
 *   head like a horn — apex a quarter of that proud and base ring a tenth
 *   under. 6 each. Dark: no eye that glows.
 *
 * Port is −z. Every fin's blade is 5 mm thick and roots inside the body —
 * the sweep lists each fin against the body and nothing else, and the eyes
 * against the body — so nothing floats. The root is `env_shoal_fry`, an
 * identity, the plan's box centred on the origin and the lowest point, the
 * lower tail lobe's end, on y = 0; the runtime hangs each fish at its
 * school's depth, and nothing here says where in the column it belongs.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 0.5;
const MAX_TRIS = 180;
const SEED = 1711;
const L = FOOTPRINT;

const flank = seabed.ground.fishFlank();
const dark = seabed.ground.stoneDark();

const fish = new THREE.Group();
fish.name = 'env_shoal_fry';

const draw = seabed.seeded(SEED);

// --- the body ------------------------------------------------------------------
const STATIONS = [
  [0.06, 0.04, 0.75],
  [0.16, 0.08, 0.5],
  [0.3, 0.1, 0.45],
  [0.45, 0.095, 0.45],
  [0.6, 0.07, 0.45],
  [0.72, 0.04, 0.5],
  [0.8, 0.022, 0.6],
].map(([u, ry, k]) => ({ u, ry: ry * L, rz: ry * k * L }));
const PEDUNCLE = STATIONS[STATIONS.length - 1].u;
const camber = (u) => 0.01 * L * Math.sin(Math.PI * u);
const bend = (u) => -0.07 * L * Math.max(0, (u - 0.35) / 0.65) ** 2;
const body = seabed.fishBody(draw, {
  length: L,
  sides: 6,
  stations: STATIONS,
  camber,
  bend,
});
add(fish, 'body', body.geo, flank);

// --- the fins -----------------------------------------------------------------
const THICK = 0.01 * L;
const INSET = 0.015 * L;
// A fin along the back (sign 1) or belly (−1), yawed to its root chord
// (seabed.mjs `median`): the anal's rear root dropped under a keel that
// shallows between u 0.60 and 0.68 until round 2.
const medians = [];
const median = (name, u0, u1, sign, tops) => {
  const made = seabed.median(body, { u0, u1, sign, inset: INSET, tops, thickness: THICK });
  medians.push({ name, root: made.root });
  return add(fish, name, made.geo, dark);
};
median('dorsal', 0.4, 0.5, 1, [[0.49, 0.09 * L]]);
median('anal', 0.6, 0.68, -1, [[0.685, 0.05 * L]]);

for (const [tag, side] of [
  ['p', -1],
  ['s', 1],
]) {
  const u = 0.2;
  const phi = -0.3;
  const [ax, ay, az] = body.axis(u);
  const [px, py, pz] = body.point(u, side > 0 ? phi : Math.PI - phi);
  const k = 1 - INSET / Math.hypot(py - ay, pz - az);
  add(
    fish,
    `pectoral_${tag}`,
    seabed.fin({
      root: [px, ay + (py - ay) * k, az + (pz - az) * k],
      along: [-0.98, -0.1, side * 0.17],
      span: [-0.2, -0.9, side * 0.35],
      outline: [
        [0, 0],
        [0.04, 0],
        [0.11, 0.04],
      ].map(([a, b]) => [a * L, b * L]),
      thickness: THICK,
    }),
    dark
  );
}

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
          [-0.03, 0.002],
          [0.035, 0.002],
          [0.2, 0.075],
          [0.14, 0.11],
        ].map(([a, b]) => [a * L, b * L]),
        thickness: THICK,
      }),
      dark
    );
}

// --- the eyes ----------------------------------------------------------------------
const EYE = 0.028 * L;
const EYE_U = 0.11;
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
{
  const a = eyes.p.centre;
  const b = eyes.s.centre;
  const axis = eyes.s.facet.axisAt(eyes.s.facet.midU);
  const off = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs((a.z + b.z) / 2 - axis.z));
  if (off > 1e-6) throw new Error(`env_shoal_fry: the eyes do not mirror (off ${off})`);
}
for (const { name, root } of medians)
  for (let k = 0; k <= 20; k++)
    if (!seabed.insideBody(body.geo, root[0].clone().lerp(root[1], k / 20).toArray()))
      throw new Error(`env_shoal_fry: ${name} root sample ${k} is outside the body`);
const fit = seabed.settle(fish, FOOTPRINT);
const { drawn, k } = seabed.stand(fish, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(fish);
const size = new THREE.Box3().setFromObject(fish).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_shoal_fry: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('stone_dark'))
  throw new Error(`env_shoal_fry: materials [${[...t.materials]}], not fish_flank and stone_dark`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_shoal_fry: lowest vertex at ${t.lowest}, not on the ground`);
if (t.reach.x > FOOTPRINT / 2 + 1e-3 || t.reach.z > FOOTPRINT / 2 + 1e-3)
  throw new Error(`env_shoal_fry: reaches ${t.reach.x} by ${t.reach.z} from the origin, past ${FOOTPRINT / 2}`);
fish.traverse((o) => {
  if (o.isMesh && o.material.emissive.getHex() !== 0)
    throw new Error(`env_shoal_fry: ${o.name} carries an emissive`);
});
console.log(
  `env_shoal_fry: ${t.tris} triangles, fit ×${fit.toFixed(4)}, drawn ${drawn.toFixed(4)} long, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.x.toFixed(3)} by ${size.z.toFixed(3)} by ${size.y.toFixed(4)} m tall, materials ${[...t.materials].join(' + ')}, on the ground: ${t.onFloor.join(', ')}; ` +
    `eyes r ${(eyes.s.radius * fit).toFixed(4)} m at u ${((L / 2 - eyes.s.centre.x) / L).toFixed(3)}`
);
await exportGlb(fish, 'env-shoal-fry.glb');
