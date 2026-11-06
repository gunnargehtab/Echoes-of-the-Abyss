/**
 * The rim ray — 18 m of footprint, the one large decorative body of the
 * free-water study (#1777): a broad ray gliding over the crater's outside
 * rim, for §9's opening frame, where no body of the slice's canonical sizes
 * reads (a 4 m fish draws 5 px ahead of the hulls at 900 m). Public
 * decoration under the fifth clause of Block 4's public-microfauna variant
 * of ENV STYLE, not an animal of the bestiary: no SIG, no entity, no
 * collision, nothing lit.
 *
 * "Crater rim approach, suspended | env-rim-ray | 18 m | 4.05 m | ≤ 800 |
 * none" (docs/asset-prompts-3d.md, Block 4). Two materials, `fish_flank`
 * on the body and `stone_dark` on the lobes, tail and eyes; 586 triangles;
 * 4.05 m tall (4.0482) at its 18 m by intake's measure (`sizeM`), which
 * takes `--footprint-m 18 --max-tris 800` for this row and no
 * `--world-light`: the file carries no emissive. The footprint is the
 * wingspan, across z; the whole is 13.60 m long from the lobes' ends to
 * the tail's, so the span is what `settle` holds.
 *
 * Authored as a formula rather than ported: there is no export, as the
 * four microfauna have none (#1711). Every number below is drawn from one
 * seeded stream (seabed.mjs `seeded`, seed 1777) in the order the parts
 * are built, so the file is the same on every machine and `npm run
 * check:models` holds the script to it. The whole is built at its own
 * size, centred on its plan, lowered to the ground and held at the
 * footprint before the bake (seabed.mjs `settle`), so the root is an
 * identity and seabed.mjs `stand` finds ×1.000; the fit is ×1.0000, the
 * tip points being drawn at the half-span.
 *
 * What it is made of, and why this shape. It is the microfauna's grammar
 * (seabed.mjs, "The microfauna") laid across the span: the body is one
 * `shaft` from the port wingtip through the centreline to the starboard
 * one, its rings chord sections rather than girths (seabed.mjs
 * `wingBody`), every corner jittered from the stream and the port half
 * the starboard's mirror; the lobes and the tail are the same shaft
 * along x; the eyes are `lens`es, dark and unlit. A manta's plan and
 * nothing of a hunter's, since it glides in the opening frame at fleet
 * scale and the camera reads it at 26–30 px: a broad blunt head, two
 * short paddles forward of it, wings swept back to rounded tips and a
 * short whip of a tail — no jaw, no fin swept to a point, no coil, no
 * armour, no lure, no eye that glows, and at 18 m under a third of the
 * smallest Sounder, so nothing of the colossus (bestiary.md §4). Nose on
 * +x. The still pose is the wings mid-stroke: the chord line climbs from
 * the centreline's 0 to 3.15 m at the last ring and 3.45 m at the tip
 * points, and the body under it is a shallow hump 1.51 m thick on a
 * 8.7 m chord, thickest 0.42 of the way back; from §9's opening pitch of
 * 21° the raised tips and the hump are the vertical silhouette.
 *
 * - `body`, in `fish_flank`: a shaft of nineteen twelve-cornered rings,
 *   one per station across the span at z 0, ±1.1, ±2.2, ±2.9, ±3.8, ±4.9,
 *   ±6.0, ±7.1, ±8.1 and ±8.7, fanned to a tip point at ±9.0. Each ring
 *   is a lens section in the x–y plane — the leading edge, five corners
 *   over the top at 0.08, 0.22, 0.42, 0.65 and 0.85 of the chord, the
 *   trailing edge and five back under — the top taking 0.6 of the
 *   thickness and the bottom 0.4, so the hump rises over a flatter belly.
 *   The chord runs 8.7 m at the centreline (leading edge x +5.0, trailing
 *   −3.7, nominal) to 1.1 m at the last ring, the leading edge nearly
 *   straight across the head to ±2.2 and sweeping back from there, the
 *   trailing edge concave with its forward-most point at ±6.0; the
 *   thickness 1.5 m at the centreline, 1.2 at the head's edge (±2.2),
 *   0.65 where the head drops to the wing (±2.9) and 0.16 at the last
 *   ring; the chord line 0.08 m up at ±2.2, 0.72 at ±4.9, 1.85 at ±7.1
 *   and 3.15 at ±8.7. Every corner pushed up or down by up to 4 % of its
 *   height off the chord and slipped along the chord and the span by as
 *   much of the thickness, the centre ring not at all along the span,
 *   each port ring the mirror of its starboard one, triangles included
 *   (`shaft` `split`). 456 triangles. Its belly at the centreline is the
 *   lowest point, on y = 0.
 * - `lobe_p` / `lobe_s`, in `stone_dark`: the cephalic lobes, two short
 *   paddles forward of the head at z ∓1.38 either side of the mouth's
 *   line, each a shaft of four six-cornered rings from a root inside the
 *   head (x +4.2 nominal, every root corner inside the closed body, which
 *   the script asserts) to a flat-capped end, 2.0 m long, 0.72 m across
 *   and 0.52 m deep at the root narrowing to 0.48 by 0.18 at the end,
 *   angled a little down and out; their ends are the forward end of the
 *   13.60 m. Wider than deep, so they read as paddles and not horns. 44
 *   each.
 * - `tail`, in `stone_dark`: a whip from inside the body's trailing edge
 *   at the centreline (x −2.4 nominal, root inside the body, asserted),
 *   four four-cornered rings fanned to a point 5.0 m aft of the root, a
 *   radius of 0.24 m there falling to 0.06 at the last ring and drooping
 *   0.34 m; its end is the aft end of the 13.60 m. 3.1 m of it shows
 *   past the trailing edge, a third of the body's chord. 30 triangles.
 * - `eye_p` / `eye_s`, in `stone_dark`: six-sided lenses on the head's
 *   shoulder, the band between the stations at ±2.2 and ±2.9 where the
 *   head drops to the wing, on the top facet over the leading edge
 *   (corners 1–2, 0.08–0.22 of the chord), each on the middle of the
 *   diagonal its facet is cut on, so the two mirror exactly (the script
 *   asserts it); radius 0.20 m, apex a quarter of that proud and base ring
 *   a tenth under; centres at x 4.05, y 1.08, z ±2.55 in the file. 6
 *   each. Dark: no eye that glows.
 *
 * Port is −z. The lobes and the tail root inside the body — the sweep
 * lists each against the body and nothing else, and the eyes against the
 * body — so nothing floats. The root is `env_rim_ray`, an identity, the
 * plan's box centred on the origin and the lowest point, the belly at the
 * centreline, on y = 0; the body axis the runtime hangs it by, the
 * mid-plane of the centre section between its belly (y 0) and the top of
 * the hump (y 1.512), stands 0.756 m over the origin (the script prints
 * it). The runtime hangs the ray at its listed depth, and nothing here
 * says where in the column it belongs.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 18;
const MAX_TRIS = 800;
const SEED = 1777;
const S = FOOTPRINT / 2;

const flank = seabed.ground.fishFlank();
const dark = seabed.ground.stoneDark();

const ray = new THREE.Group();
ray.name = 'env_rim_ray';

const draw = seabed.seeded(SEED);

// --- the body ------------------------------------------------------------------
// Stations across the starboard half-span, z out from the centreline: the
// leading and trailing edges' x, the section's thickness and the chord
// line's height, the wing curving up to the raised tip.
const STATIONS = [
  [0.0, 5.0, -3.7, 1.5, 0.0],
  [1.1, 4.95, -3.5, 1.45, 0.02],
  [2.2, 4.7, -2.9, 1.2, 0.08],
  [2.9, 4.3, -2.3, 0.65, 0.18],
  [3.8, 3.6, -1.5, 0.48, 0.38],
  [4.9, 2.6, -0.9, 0.38, 0.72],
  [6.0, 1.5, -0.8, 0.3, 1.2],
  [7.1, 0.5, -1.0, 0.24, 1.85],
  [8.1, -0.1, -1.6, 0.2, 2.6],
  [8.7, -0.65, -1.75, 0.16, 3.15],
].map(([z, le, te, t, y]) => ({ z, le, te, t, y }));
const TIP = { x: -1.2, y: 3.45 };
// A lens section, twelve corners: the leading edge, five over the top,
// the trailing edge, five back along the bottom.
const PROFILE = {
  s: [0, 0.08, 0.22, 0.42, 0.65, 0.85, 1, 0.85, 0.65, 0.42, 0.22, 0.08],
  f: [0, 0.55, 0.9, 1, 0.8, 0.42, 0, 0.42, 0.8, 1, 0.9, 0.55],
};
const body = seabed.wingBody(draw, { halfSpan: S, stations: STATIONS, tip: TIP, profile: PROFILE });
add(ray, 'body', body.geo, flank);

// --- the cephalic lobes ----------------------------------------------------------
// Two short paddles forward of the head either side of the mouth's line,
// each a shaft of four six-cornered rings from a root inside the head to a
// flat-capped end, angled a little down and out.
const LOBE_Z = 1.35;
const LOBE_RINGS = [
  [4.2, 0.05, 0, 0.26, 0.36],
  [4.9, -0.02, 0.04, 0.2, 0.34],
  [5.6, -0.14, 0.1, 0.14, 0.3],
  [6.2, -0.28, 0.16, 0.09, 0.24],
];
const lobeRings = LOBE_RINGS.map(([x, y, dz, ry, rz]) =>
  Array.from({ length: 6 }, (_, k) => {
    const phi = Math.PI / 2 - (2 * Math.PI * k) / 6;
    const push = 1 + draw.between(-0.04, 0.04);
    return [
      x + draw.between(-0.04, 0.04) * ry,
      y + ry * push * Math.sin(phi),
      dz + rz * push * Math.cos(phi),
    ];
  })
);
for (const [tag, side] of [
  ['p', -1],
  ['s', 1],
])
  add(
    ray,
    `lobe_${tag}`,
    seabed.shaft(lobeRings.map((r) => r.map(([x, y, z]) => [x, y, side * (LOBE_Z + z)]))),
    dark
  );

// --- the tail --------------------------------------------------------------------
// A short whip from inside the body's trailing edge, four four-cornered
// rings fanned to a point, drooping a little.
const TAIL_RINGS = [
  [-2.4, 0.0, 0.24],
  [-4.0, -0.04, 0.17],
  [-5.4, -0.12, 0.11],
  [-6.6, -0.24, 0.06],
];
const TAIL_END = [-7.4, -0.34, 0];
const tailRings = TAIL_RINGS.map(([x, y, r]) =>
  Array.from({ length: 4 }, (_, k) => {
    const phi = Math.PI / 2 - (2 * Math.PI * k) / 4;
    const push = 1 + draw.between(-0.04, 0.04);
    return [
      x + draw.between(-0.04, 0.04) * r,
      y + r * push * Math.sin(phi),
      r * push * Math.cos(phi),
    ];
  })
);
add(ray, 'tail', seabed.shaft(tailRings, { end: TAIL_END }), dark);

// --- the eyes ----------------------------------------------------------------------
// On the head's shoulder, the band between stations 2 and 3 (z 2.2–2.9),
// the facet over the leading edge (corners 1–2, s 0.08–0.22).
const EYE = 0.2;
const eyes = {};
for (const [tag, side] of [
  ['p', -1],
  ['s', 1],
]) {
  const facet = body.facetAt(2, 1, side);
  eyes[tag] = seabed.lens(facet, EYE);
  add(ray, `eye_${tag}`, eyes[tag].geo, dark);
}

// --- the symmetry, the fit, the checks, then out ------------------------------------
{
  const a = eyes.p.centre;
  const b = eyes.s.centre;
  const off = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z + b.z));
  if (off > 1e-6) throw new Error(`env_rim_ray: the eyes do not mirror (off ${off})`);
}
// Every lobe's root ring and the tail's root ring lie inside the closed body.
for (const [name, ring] of [
  ['lobe_p', lobeRings[0].map(([x, y, z]) => [x, y, -(LOBE_Z + z)])],
  ['lobe_s', lobeRings[0].map(([x, y, z]) => [x, y, LOBE_Z + z])],
  ['tail', tailRings[0]],
])
  ring.forEach((p, k) => {
    if (!seabed.insideBody(body.geo, p))
      throw new Error(`env_rim_ray: ${name} root corner ${k} is outside the body`);
  });
const centreRing = body.rings[STATIONS.length - 1];
const fit = seabed.settle(ray, FOOTPRINT);
const { drawn, k } = seabed.stand(ray, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(ray);
const size = new THREE.Box3().setFromObject(ray).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_rim_ray: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('stone_dark'))
  throw new Error(`env_rim_ray: materials [${[...t.materials]}], not fish_flank and stone_dark`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_rim_ray: lowest vertex at ${t.lowest}, not on the ground`);
if (t.reach.x > FOOTPRINT / 2 + 1e-3 || t.reach.z > FOOTPRINT / 2 + 1e-3)
  throw new Error(
    `env_rim_ray: reaches ${t.reach.x} by ${t.reach.z} from the origin, past ${FOOTPRINT / 2}`
  );
ray.traverse((o) => {
  if (o.isMesh && o.material.emissive.getHex() !== 0)
    throw new Error(`env_rim_ray: ${o.name} carries an emissive`);
});
// The body axis the runtime hangs the ray by: the mid-plane of the centre
// section at its thickest, read off the baked body.
const bodyPos = ray.getObjectByName('body').geometry.attributes.position;
let top = -Infinity;
let bottom = Infinity;
for (let i = 0; i < bodyPos.count; i++)
  if (Math.abs(bodyPos.getZ(i)) < 1e-6) {
    top = Math.max(top, bodyPos.getY(i));
    bottom = Math.min(bottom, bodyPos.getY(i));
  }
const axisM = (top + bottom) / 2;
console.log(
  `env_rim_ray: ${t.tris} triangles, fit ×${fit.toFixed(4)}, drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.x.toFixed(2)} by ${size.z.toFixed(2)} by ${size.y.toFixed(4)} m tall, materials ${[...t.materials].join(' + ')}, on the ground: ${t.onFloor.join(', ')}; ` +
    `eyes r ${(eyes.s.radius * fit).toFixed(4)} m; body axis ${axisM.toFixed(4)} m over the origin (centre section ${bottom.toFixed(3)}–${top.toFixed(3)})`
);
await exportGlb(ray, 'env-rim-ray.glb');
