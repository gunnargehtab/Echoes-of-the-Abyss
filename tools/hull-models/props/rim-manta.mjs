/**
 * The rim manta — 18 m of footprint, the one body of the free-water crater
 * that the High graphics quality alone stands (#1867, part of #1637): a
 * manta gliding over the rim, read from below. The owner named its target
 * in session on 21 November 2026, a photograph of a manta's belly against
 * the light (docs/screenshots/issue-1867/target-manta.jpg), and took three
 * calls with it: the photograph is committed, this is a new model beside
 * `env-rim-ray` and not a change to it, and it keeps the ray's 18 m. Public
 * decoration under the seventh clause of Block 4's public-microfauna
 * variant of ENV STYLE, not an animal of the bestiary: no SIG, no entity,
 * no collision, nothing lit.
 *
 * "Crater rim approach, suspended, High alone | env-rim-manta | 18 m |
 * 2.04 m | ≤ 4,000 | none" (docs/asset-prompts-3d.md, Block 4). Two
 * materials, `fish_belly` on the underside's skin and `fish_flank` on
 * everything else, the flank at 0.199 of the belly's linear luminance;
 * 2,689 triangles; 2.04 m tall at its 18 m by intake's measure (`sizeM`),
 * which takes `--footprint-m 18 --max-tris 4000` for this row and no
 * `--world-light`: the file carries no emissive. The footprint is the
 * wingspan, across z; the whole is 16.00 m long from the lobes' ends to
 * the tail's, so the span is what `settle` holds and what the runtime
 * scales by. The 4,000 is over the registry's 800 fence as the kelp
 * stand's 9,000 is: one body near the eye at High, whose facets carry its
 * curvature (the author's call on #1867, waiting on the owner).
 *
 * Authored as a formula rather than ported: there is no export, as the
 * six microfauna before it have none (#1711, #1777, #1837). One seeded
 * stream (seabed.mjs `seeded`, seed 1867) is drawn in the order the parts
 * are built: by the body first, which `wingBody` draws for every corner
 * and multiplies by a jitter of 0, and then by the blotches, six figures
 * and nine rim corners of two each a try. So the file is the same on
 * every machine and `npm run check:models` holds the script to it. The
 * whole is built at its own size, centred on its plan, lowered to the
 * ground and held at the footprint before the bake (seabed.mjs `settle`),
 * ×1.0000, the tip points being drawn at the half-span. The tables below
 * are nominal, the mouth at x +4.0 and the centre body's chord line on
 * y 0; the file stands 2.10 m forward of that and 0.64 m up, and this
 * header gives the file's figures, which the script prints.
 *
 * What it is made of, and why this shape. It is the ray's grammar
 * (seabed.mjs, "The microfauna") at four times the facets: the body is
 * one `shaft` across the span (`wingBody`), forty-seven twenty-cornered
 * chord sections, each station's section its own blend of a blunt head's
 * and a thin wing's, and no corner jittered. The runtime gives this skin
 * one normal a vertex, where a pushed corner would become a lump, so the
 * facets are the curve and nothing else; the file stays flat-shaded and
 * non-indexed as the kit writes. The closed skin goes out as two meshes,
 * its bottom facets and its top ones (seabed.mjs `cleave`), since the
 * belly is the view: pale, with everything on it dark. Those marks are
 * geometry in the back's material laid on the belly's own facets
 * (seabed.mjs `drape`): thrown onto the skin, cut along every facet edge
 * they cross, and drawn 4 cm back off it, so each piece lies in its
 * facet's plane and none sinks under a convex edge. Nothing of a hunter
 * and nothing classified: no tooth, no jaw (the mouth is a dark slot on
 * the skin), no spine or barb on the tail, no armour, no lure, no eye
 * that glows, no photophore seat, and at 18 m under a third of the
 * smallest Sounder.
 *
 * - `back`, in `fish_flank`, and `belly`, in `fish_belly`: one closed
 *   skin (the script asserts it, seabed.mjs `closedOutward`) parted along
 *   its leading and trailing edges, 940 triangles each. Twenty-four
 *   stations a half-span, at z 0, ±0.4, 0.8, 1.2, 1.6, 2.0, 2.35, 2.7,
 *   3.05, 3.4, 3.8, 4.25, 4.7, 5.2, 5.7, 6.2, 6.7, 7.2, 7.65, 8.05, 8.4,
 *   8.65, 8.83 and 8.94, fanned to a tip point at ±9.0. A section is the
 *   leading edge, nine corners over the top at 0.03 to 0.92 of the chord,
 *   the trailing edge, and nine back along the bottom at 0.92 to 0.045.
 *   The head's section is blunt at the front, its hump 0.90 m over the
 *   chord line 0.40 of the way back and its belly 0.60 m under it and
 *   flat from 0.18 to 0.40 of the chord; the wing's is a thin lens, 0.55
 *   of it over the chord line; a station is the head's inside ±1.4, the
 *   wing's beyond ±3.4 and a blend between. The plan: the chord is 7.90 m
 *   at the centreline (leading edge x 6.10, trailing −1.80), 2.28 spans
 *   to a chord; the leading edge is straight across the head to within
 *   3 cm as far as ±1.2 and swept back from there, bowed at most 0.49 m
 *   forward of the straight line from the head's corner to the tip; the
 *   chord is 5.38 m at ±3.4, 2.77 at ±5.7, 0.88 at ±8.05, 0.36 at ±8.83
 *   and 0.20 at the last ring, a drawn-out tip rounded off through five
 *   stations in its last 0.95 m; the trailing edge runs forward from the
 *   tail's root to x 0.98 at ±7.65 and back to 0.70 at the last ring, so
 *   it is convex toward the body and concave toward each tip, and the
 *   tip points stand at x 0.75. The thickness is 1.50 m at the centreline
 *   (y 0.04 to 1.54), 1.12 at ±2.0, 0.57 at ±3.4, 0.30 at ±5.7, 0.13 at
 *   ±8.05 and 4.5 cm at the last ring, and every trailing edge is a
 *   knife. The pose is a level glide in a shallow upstroke: the chord
 *   line is level from the centreline to ±2.3, 0.12 m up at ±4, 0.46 at
 *   ±6, 0.98 at ±8, 1.36 at the last ring and 1.40 at the tip points,
 *   0.39 m of it in the last tenth of the half-span where the tenth
 *   before climbs 0.26. The tip points are the top of the file, y 2.04.
 * - `lobe_p` / `lobe_s`, in `fish_flank`: the cephalic lobes, held
 *   forward either side of the mouth. Each a shaft of seven
 *   eight-cornered rings from a root inside the head (x 5.25, every root
 *   corner inside the closed body, asserted) to a ring 0.22 m across
 *   fanned shut 3 cm on, at x 8.00, the forward end of the 16.00 m: 2.75 m
 *   long, 1.90 m of it ahead of the mouth's line and 2.06 ahead of the
 *   leading edge at its own root. A paddle, wider than deep: 0.52 by
 *   0.37 m at the root, 0.74 by 0.20 at its widest, x 7.05. It leaves the
 *   head at z ∓1.60 and ends at ∓1.23, toed in 0.37 m, and droops 0.18 m.
 *   110 each.
 * - `tail`, in `fish_flank`: a whip from inside the body (x −0.80, root
 *   ring inside it, asserted), six six-cornered rings fanned to a point
 *   at x −8.00, the aft end of the 16.00 m: 7.20 m long, 0.12 m in radius
 *   at the root and 0.02 at the last ring, drooping 0.21 m. 6.20 m of it
 *   shows past the trailing edge, 0.78 of the chord. A plain taper: no
 *   spine and no barb. 70 triangles.
 * - `pelvic_p` / `pelvic_s`, in `fish_flank`: two small fins flat either
 *   side of the tail's root, blades 5 cm thick on a rounded outline of
 *   seven corners, 1.01 m long and 0.46 across, from inside the body
 *   (x −1.25, both faces of the root edge inside it, asserted) to x
 *   −2.26, 0.46 m aft of the trailing edge at the centreline, z ∓0.14 to
 *   ∓0.60. 24 each.
 * - `dorsal`, in `fish_flank`: one low fin on the back over the tail's
 *   root, a blade 5 cm thick in the centre plane, five corners, x −0.40
 *   to −1.50, its top at y 1.16, which is 0.27 to 0.35 m over the back
 *   under it; both ends of its root inside the body (asserted). 16.
 * - `eye_p` / `eye_s`, in `fish_flank`: six-sided lenses on the side of
 *   the head just outboard of each lobe's root, in the band between the
 *   stations at ±2.0 and ±2.35, on the facet under the leading edge. That
 *   facet is the belly's, so the lens reads dark on pale from ahead and
 *   below; on the facet over the edge it would be the back's colour on
 *   the back. Radius 0.15 m, centres at x 5.47, y 0.55, z ±2.17, each on
 *   the middle of the diagonal its facet is cut on, so the two mirror
 *   exactly (asserted). 6 each. Dark: no eye that glows.
 * - `mouth`, in `fish_flank`: a slot across the front of the head between
 *   the lobes, a six-cornered band 2.40 m wide and 0.28 m tall with its
 *   ends cut back, thrown square onto the facets under the leading edge
 *   (x 5.82 to 6.05, y 0.36 to 0.56, z ±1.20). A dark band on the skin
 *   and no opening: no jaw, no tooth. 26 triangles.
 * - `gill_p1`..`_p5` / `gill_s1`..`_s5`, in `fish_flank`: five gill slits
 *   a side in two rows that close toward the tail. Each a band of four
 *   quads thrown up onto the belly, bowed 7 cm forward, its outer end
 *   swept 12° aft, widest in the middle and 0.45 of that at its ends.
 *   Nose to tail they are 1.30, 1.24, 1.17, 1.09 and 1.00 m long and 14,
 *   13.5, 13, 12 and 11 cm wide; their inner ends stand at x 4.85, 4.41,
 *   3.97, 3.53 and 3.09 and z ±0.62, 0.56, 0.49, 0.42 and 0.36, their
 *   outer ends at z ±1.89, 1.77, 1.63, 1.49 and 1.34: the rows are 1.24 m
 *   apart at the first pair and 0.72 at the fifth. Each port slit is its
 *   starboard one's mirror, corner for corner (asserted). 20, 20, 26, 18
 *   and 22 triangles, 212 in all.
 * - `blotch_01`..`_17`, in `fish_flank`: seventeen dark patches of 0.25
 *   to 0.70 m, each the hull of nine rim corners drawn from the stream
 *   and held to its size across, seven to nine corners: three between the
 *   rows of slits, nine behind them on the belly, three under the
 *   starboard wing's root and two under the port's. Scattered, and not
 *   mirrored, as the target's are not: no patch is another's mirror
 *   (asserted), and each is redrawn until it stands 10 cm clear of every
 *   slit and clear of every patch before it. The script prints each one's
 *   place and size. 205 triangles.
 *
 * Every mark lands whole on the belly (`drape`'s area against its
 * outline's, asserted) and is drawn 4 cm back along its throw, which
 * leaves it no less than 3.86 cm off the skin itself by the file's
 * triangles (seabed.mjs `skinGap`; the script holds it over 2.4). So the lowest point of the file is a mark, `blotch_01`, on
 * y = 0, and the belly's own lowest point is at y 0.04. The body axis the
 * runtime hangs it by, the mid-plane of the centre section between its
 * belly (y 0.04) and the top of the hump (y 1.54), stands 0.79 m over the
 * origin (the script prints it).
 *
 * Port is −z. Everything the runtime's stroke should leave alone is on
 * the level centre body: the lobes reach z ±1.95, the gills ±1.89, the
 * eyes ±2.31, the pelvic fins ±0.60. Three blotches to starboard and two
 * to port lie beyond that, out to z 3.22 and −3.44, and ride the wing. The sweep lists the
 * back against the belly, the lobes, tail and pelvic fins against both,
 * the dorsal fin against the back and the tail, and the eyes against the
 * belly; the marks meet nothing, 4 cm off the skin, as a photophore seat
 * does. tools/hull-renders/inspect.mjs turns this file a quarter turn,
 * since its span is longer than its length: on its sheet the nose is on
 * −Z and bearing 270 looks at it from ahead. The root is `env_rim_manta`,
 * an identity, the plan's box centred on the origin. The runtime hangs
 * the manta at its listed depth, and nothing here says where in the
 * column it belongs.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 18;
const MAX_TRIS = 4000;
const SEED = 1867;
const S = FOOTPRINT / 2;

const flank = seabed.ground.fishFlank();
const pale = seabed.ground.fishBelly();

const manta = new THREE.Group();
manta.name = 'env_rim_manta';

const draw = seabed.seeded(SEED);
const SIDES = [
  ['p', -1],
  ['s', 1],
];

// --- the body ------------------------------------------------------------------
// The plan, the thickness and the pose, each a fair curve along the
// starboard half-span (seabed.mjs `faired`), z out from the centreline: the
// leading and trailing edges' x with the mouth at +4.0, the section's whole
// thickness, and the chord line's height.
const LEADING = seabed.faired([
  [0, 4.0],
  [1.2, 3.97],
  [2.0, 3.62],
  [3.0, 3.06],
  [4.0, 2.46],
  [5.0, 1.83],
  [6.0, 1.18],
  [7.0, 0.5],
  [8.0, -0.25],
  [8.5, -0.68],
  [8.8, -1.0],
  [8.94, -1.2],
]);
const TRAILING = seabed.faired([
  [0, -3.9],
  [1.0, -3.76],
  [2.0, -3.36],
  [3.0, -2.8],
  [4.0, -2.2],
  [5.0, -1.68],
  [6.0, -1.3],
  [6.8, -1.15],
  [7.6, -1.12],
  [8.2, -1.2],
  [8.6, -1.32],
  [8.85, -1.4],
  [8.94, -1.4],
]);
const THICK = seabed.faired([
  [0, 1.5],
  [1.2, 1.42],
  [2.0, 1.12],
  [2.6, 0.84],
  [3.2, 0.62],
  [4.0, 0.46],
  [5.0, 0.36],
  [6.0, 0.28],
  [7.0, 0.2],
  [8.0, 0.13],
  [8.6, 0.08],
  [8.94, 0.045],
]);
const RISE = seabed.faired([
  [0, 0],
  [2.3, 0],
  [3.0, 0.03],
  [4.0, 0.12],
  [5.0, 0.27],
  [6.0, 0.46],
  [7.0, 0.7],
  [8.0, 0.98],
  [8.5, 1.15],
  [8.94, 1.36],
]);
const TIP = { x: -1.35, y: 1.4 };
// Twenty-four stations a half-span, closer where the plan turns: across the
// head, and round the tip.
const AT = [
  0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.35, 2.7, 3.05, 3.4, 3.8, 4.25, 4.7, 5.2, 5.7, 6.2, 6.7, 7.2, 7.65,
  8.05, 8.4, 8.65, 8.83, 8.94,
];
// A section, twenty corners: the leading edge, nine over the top, the
// trailing edge, nine back along the bottom. Two of them, and every station
// a blend: the head's, blunt at the front for the mouth, its hump over a
// belly that is flat from 0.18 to 0.40 of the chord, and the wing's, a thin
// lens.
const OVER = [0.03, 0.08, 0.16, 0.27, 0.4, 0.54, 0.68, 0.81, 0.92];
const BACK = [0.92, 0.81, 0.68, 0.54, 0.4, 0.27, 0.18, 0.1, 0.045];
const SECTION_S = [0, ...OVER, 1, ...BACK];
const HEAD = {
  f: [
    0,
    ...[0.5, 0.72, 0.9, 0.99, 1.0, 0.9, 0.68, 0.42, 0.18],
    0,
    ...[0.22, 0.52, 0.8, 0.96, 1.0, 1.0, 1.0, 0.84, 0.5],
  ],
  top: 0.6,
};
const WING = {
  f: [
    0,
    ...[0.42, 0.66, 0.88, 1.0, 0.97, 0.84, 0.62, 0.38, 0.16],
    0,
    ...[0.16, 0.38, 0.62, 0.84, 0.97, 1.0, 0.9, 0.7, 0.48],
  ],
  top: 0.55,
};
const HEAD_ENDS = 1.4;
const WING_BEGINS = 3.4;
const STATIONS = AT.map((z) => {
  const u = Math.min(1, Math.max(0, (z - HEAD_ENDS) / (WING_BEGINS - HEAD_ENDS)));
  const w = u * u * (3 - 2 * u);
  return {
    z,
    le: LEADING(z),
    te: TRAILING(z),
    t: THICK(z),
    y: RISE(z),
    top: HEAD.top + (WING.top - HEAD.top) * w,
    profile: { s: SECTION_S, f: HEAD.f.map((f, j) => f + (WING.f[j] - f) * w) },
  };
});
const body = seabed.wingBody(draw, {
  halfSpan: S,
  stations: STATIONS,
  tip: TIP,
  profile: { s: SECTION_S, f: HEAD.f },
  jitter: 0,
});
const [bellyGeo, backGeo] = seabed.cleave(body.geo, body.under);
add(manta, 'back', backGeo, flank);
add(manta, 'belly', bellyGeo, pale);

// --- the cephalic lobes ----------------------------------------------------------
// Two paddles forward of the head either side of the mouth, each a shaft of
// seven eight-cornered rings from a root inside the head to a small last
// ring fanned shut: x, y, how far out from the centreline, and the half
// width and half depth. Widest past the middle, toed in at the end.
const LOBE_RINGS = [
  [3.15, 0.02, 1.6, 0.28, 0.2],
  [3.75, 0.0, 1.63, 0.3, 0.17],
  [4.35, -0.03, 1.62, 0.36, 0.14],
  [4.95, -0.07, 1.54, 0.4, 0.11],
  [5.45, -0.11, 1.42, 0.36, 0.09],
  [5.75, -0.14, 1.31, 0.25, 0.07],
  [5.87, -0.155, 1.25, 0.12, 0.045],
];
const LOBE_END = [5.9, -0.16, 1.23];
const lobeRing = ([x, y, z, rz, ry], side) =>
  Array.from({ length: 8 }, (_, k) => {
    const phi = Math.PI / 2 - (2 * Math.PI * (k + 0.5)) / 8;
    return [x, y + ry * Math.sin(phi), side * (z + rz * Math.cos(phi))];
  });
const lobes = {};
for (const [tag, side] of SIDES) {
  const rings = LOBE_RINGS.map((r) => lobeRing(r, side));
  const end = [LOBE_END[0], LOBE_END[1], side * LOBE_END[2]];
  lobes[tag] = { rings, geo: seabed.shaft(rings, { end }) };
  add(manta, `lobe_${tag}`, lobes[tag].geo, flank);
}

// --- the tail --------------------------------------------------------------------
// A whip from inside the body ahead of the trailing edge, six six-cornered
// rings fanned to a point: x, y and radius. No spine on it and no barb.
const TAIL_RINGS = [
  [-2.9, 0.02, 0.12],
  [-3.9, 0.02, 0.11],
  [-5.4, 0.0, 0.088],
  [-7.0, -0.04, 0.064],
  [-8.6, -0.1, 0.04],
  [-9.7, -0.16, 0.02],
];
const TAIL_END = [-10.1, -0.19, 0];
const tailRings = TAIL_RINGS.map(([x, y, r]) =>
  Array.from({ length: 6 }, (_, k) => {
    const phi = Math.PI / 2 - (2 * Math.PI * k) / 6;
    return [x, y + r * Math.sin(phi), r * Math.cos(phi)];
  })
);
const tail = seabed.shaft(tailRings, { end: TAIL_END });
add(manta, 'tail', tail, flank);

// --- the fins at the tail's root ----------------------------------------------------
// Two pelvic fins flat either side of the tail, rooted in the body ahead of
// the trailing edge and rounded off past it, and one low dorsal fin on the
// back over the tail's root.
const FIN_T = 0.05;
const PELVIC_Y = 0.01;
const PELVIC = [
  [-3.35, 0.14],
  [-3.35, 0.5],
  [-3.75, 0.6],
  [-4.1, 0.58],
  [-4.3, 0.46],
  [-4.36, 0.3],
  [-4.2, 0.16],
];
const pelvics = {};
for (const [tag, side] of SIDES) {
  const outline = PELVIC.map(([x, z]) => [x, PELVIC_Y, side * z]);
  pelvics[tag] = outline;
  add(manta, `pelvic_${tag}`, seabed.blade(outline, [0, 1, 0], FIN_T), flank);
}
const DORSAL = [
  [-2.5, 0.2],
  [-2.9, 0.52],
  [-3.3, 0.5],
  [-3.6, 0.3],
  [-3.5, 0.02],
];
const dorsal = DORSAL.map(([x, y]) => [x, y, 0]);
add(manta, 'dorsal', seabed.blade(dorsal, [0, 0, 1], FIN_T), flank);

// --- the eyes ----------------------------------------------------------------------
// On the side of the head just outboard of each lobe's root: the band
// between the stations at z 2.0 and 2.35, the facet under the leading edge,
// which is the belly's, so a dark lens reads on it; on the back's it would
// be dark on dark.
const EYE = 0.15;
const EYE_BAND = AT.indexOf(2.0);
const eyes = {};
for (const [tag, side] of SIDES) {
  eyes[tag] = seabed.lens(body.facetAt(EYE_BAND, SECTION_S.length - 1, side), EYE);
  add(manta, `eye_${tag}`, eyes[tag].geo, flank);
}

// --- the belly's marks -------------------------------------------------------------
// Everything dark on the pale skin is laid on the belly's own facets, a few
// centimetres proud (seabed.mjs `drape`): thrown straight up from under it.
const PROUD = 0.04;
const UP = { origin: [0, 0, 0], along: [1, 0, 0], toward: [0, 1, 0] };
// `drape`'s frame under a throw straight up: a along +x, b along +y × +x = −z.
const plan = (x, z) => [x, -z];
const marks = [];
const lay = (name, frame, outlines) => {
  const made = seabed.drape(bellyGeo, { ...frame, outlines, proud: PROUD });
  if (Math.abs(made.area - made.whole) > 1e-6 * Math.max(1, made.whole))
    throw new Error(
      `env_rim_manta: ${name} landed ${made.area.toFixed(6)} m² of its ${made.whole.toFixed(6)}`
    );
  marks.push({ name, ...made });
  add(manta, name, made.geo, flank);
  return made;
};

// The mouth: a slot across the front of the head between the lobes, on the
// facets under the leading edge, thrown square onto them.
{
  const lip = body.facetAt(0, SECTION_S.length - 1, 1);
  const n = new THREE.Vector3(lip.normal.x, lip.normal.y, 0).normalize();
  const [le, chin] = [STATIONS[0].le, body.rings[AT.length - 1][SECTION_S.length - 1]];
  lay(
    'mouth',
    {
      origin: [(le + chin[0]) / 2, (STATIONS[0].y + chin[1]) / 2, 0],
      along: [0, 0, 1],
      toward: [-n.x, -n.y, 0],
    },
    [
      [
        [-1.2, -0.01],
        [-1.05, -0.15],
        [1.05, -0.15],
        [1.2, -0.01],
        [1.05, 0.13],
        [-1.05, 0.13],
      ],
    ]
  );
}

// The gill slits: five a side in two rows that close toward the tail, each a
// thin band bowed forward, its outer end swept aft, widest in the middle —
// the inner end's x and z, the length, and the width at the middle.
const GILLS = [
  [2.75, 0.62, 1.3, 0.14],
  [2.31, 0.56, 1.24, 0.135],
  [1.87, 0.49, 1.17, 0.13],
  [1.43, 0.42, 1.09, 0.12],
  [0.99, 0.36, 1.0, 0.11],
];
const GILL_SWEEP = (12 * Math.PI) / 180;
const GILL_BOW = 0.07;
const GILL_CUTS = 4;
const gillSpine = ([x, z, length], t) => {
  const bow = GILL_BOW * 4 * t * (1 - t);
  return [
    x - length * t * Math.sin(GILL_SWEEP) + bow * Math.cos(GILL_SWEEP),
    z + length * t * Math.cos(GILL_SWEEP) + bow * Math.sin(GILL_SWEEP),
  ];
};
const gillOutlines = (row, side) => {
  const half = (t) => (row[3] / 2) * (0.45 + 0.55 * Math.sin(Math.PI * t));
  const cut = (t) => {
    const [x, z] = gillSpine(row, t);
    return [plan(x + half(t), side * z), plan(x - half(t), side * z)];
  };
  return Array.from({ length: GILL_CUTS }, (_, i) => {
    const [a, b] = [cut(i / GILL_CUTS), cut((i + 1) / GILL_CUTS)];
    return [a[0], b[0], b[1], a[1]];
  });
};
const gills = {};
for (const [tag, side] of SIDES)
  gills[tag] = GILLS.map((row, i) => lay(`gill_${tag}${i + 1}`, UP, gillOutlines(row, side)));

// The blotches: dark irregular patches between the rows and behind them,
// scattered from the stream and not mirrored — the target's are not. Three
// grounds, each a count, a box of x and z, and a range of sizes; a patch is
// redrawn until it stands clear of every slit and every patch before it.
const GROUNDS = [
  { count: 3, x: [0.9, 2.5], z: [-0.22, 0.22], size: [0.25, 0.36] },
  { count: 9, x: [-2.6, 0.45], z: [-1.75, 1.75], size: [0.3, 0.7] },
  { count: 3, x: [-2.0, -0.6], z: [2.2, 3.6], size: [0.25, 0.5] },
  { count: 2, x: [-2.3, -1.0], z: [-3.4, -2.0], size: [0.25, 0.45] },
];
const CLEAR = 0.1;
const slitPoints = SIDES.flatMap(([, side]) =>
  GILLS.flatMap((row) =>
    Array.from({ length: 13 }, (_, i) => {
      const [x, z] = gillSpine(row, i / 12);
      return [x, side * z];
    })
  )
);
/** The convex hull of `[x, z]` points, in order round (Andrew's chain). */
const hull = (pts) => {
  const sorted = [...pts].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (run) => {
    const out = [];
    for (const p of run) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half(sorted.reverse())];
};
const blotches = [];
for (const ground of GROUNDS)
  for (let made = 0; made < ground.count;) {
    const size = draw.between(...ground.size);
    const at = [draw.between(...ground.x), draw.between(...ground.z)];
    const lean = draw.between(0, Math.PI);
    const squash = draw.between(0.55, 1);
    const turn = draw.between(0, 2 * Math.PI);
    const rim = Array.from({ length: 9 }, (_, k) => {
      const a = turn + ((k + draw.between(-0.3, 0.3)) * 2 * Math.PI) / 9;
      const r = draw.between(0.7, 1);
      const [p, q] = [r * Math.cos(a), r * squash * Math.sin(a)];
      return [p * Math.cos(lean) - q * Math.sin(lean), p * Math.sin(lean) + q * Math.cos(lean)];
    });
    const r = size / 2;
    const near = (p, q, gap) => Math.hypot(p[0] - q[0], p[1] - q[1]) < gap;
    if (slitPoints.some((p) => near(p, at, r + CLEAR))) continue;
    if (blotches.some((b) => near(b.at, at, 1.05 * (b.size / 2 + r)))) continue;
    // The rim's hull, held to `size` across its longest reach.
    const drawn = hull(rim);
    const reach = Math.max(
      ...drawn.flatMap((p) => drawn.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))
    );
    const outline = drawn.map(([x, z]) => [at[0] + (x * size) / reach, at[1] + (z * size) / reach]);
    const name = `blotch_${String(blotches.length + 1).padStart(2, '0')}`;
    lay(name, UP, [outline.map(([x, z]) => plan(x, z))]);
    blotches.push({ name, at, size, corners: outline.length });
    made++;
  }

// --- the symmetry, the roots, the fit, the checks, then out -------------------------
{
  const a = eyes.p.centre;
  const b = eyes.s.centre;
  const off = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z + b.z));
  if (off > 1e-6) throw new Error(`env_rim_manta: the eyes do not mirror (off ${off})`);
}
// Each port slit is its starboard one's mirror: the same area, and every
// corner of the one within a hundredth of a millimetre of a corner of the
// other turned over.
const corners = (geo) => {
  const p = geo.attributes.position;
  return Array.from({ length: p.count }, (_, i) => [p.getX(i), p.getY(i), p.getZ(i)]);
};
GILLS.forEach((_, i) => {
  const [port, star] = [gills.p[i], gills.s[i]];
  if (Math.abs(port.area - star.area) > 1e-9)
    throw new Error(`env_rim_manta: gill ${i + 1} differs in area port to starboard`);
  const [a, b] = [corners(port.geo), corners(star.geo)];
  for (const [from, to] of [
    [a, b],
    [b, a],
  ])
    for (const [x, y, z] of from)
      if (!to.some((q) => Math.hypot(q[0] - x, q[1] - y, q[2] + z) < 1e-5))
        throw new Error(`env_rim_manta: gill ${i + 1} does not mirror at (${x}, ${y}, ${z})`);
});
// No blotch is another's mirror: the scatter is one side's and the other's, not one turned over.
for (const b of blotches)
  for (const c of blotches)
    if (Math.hypot(b.at[0] - c.at[0], b.at[1] + c.at[1]) < 0.05 && Math.abs(b.at[1]) > 0.05)
      throw new Error(`env_rim_manta: ${b.name} mirrors ${c.name}`);
// Every mark stands off the belly it lies on, and none under it: a piece
// is drawn back along its throw, so it stands the stand-off times its
// facet's cosine to the throw off the skin.
let least = Infinity;
for (const { name, geo } of marks)
  for (const p of corners(geo)) {
    const gap = seabed.skinGap(bellyGeo, p);
    if (!gap.outside || gap.gap < 0.6 * PROUD || gap.gap > PROUD + 1e-6)
      throw new Error(`env_rim_manta: ${name} stands ${gap.gap.toFixed(4)} m off the belly`);
    least = Math.min(least, gap.gap);
  }
// Every root lies inside the closed body: each lobe's root ring, the tail's,
// and the body end of each fin, both faces.
const faces = (points, normal) =>
  points.flatMap((p) => [-1, 1].map((s) => p.map((v, i) => v + (s * normal[i] * FIN_T) / 2)));
for (const [name, ring] of [
  ['lobe_p', lobes.p.rings[0]],
  ['lobe_s', lobes.s.rings[0]],
  ['tail', tailRings[0]],
  ['pelvic_p', faces(pelvics.p.slice(0, 2), [0, 1, 0])],
  ['pelvic_s', faces(pelvics.s.slice(0, 2), [0, 1, 0])],
  ['dorsal', faces([dorsal[0], dorsal[4]], [0, 0, 1])],
])
  ring.forEach((p, k) => {
    if (!seabed.insideBody(body.geo, p))
      throw new Error(`env_rim_manta: ${name} root corner ${k} is outside the body`);
  });
// The body, the lobes and the tail are closed skins facing out.
seabed.closedOutward(body.geo, 'body');
seabed.closedOutward(lobes.p.geo, 'lobe_p');
seabed.closedOutward(lobes.s.geo, 'lobe_s');
seabed.closedOutward(tail, 'tail');

const fit = seabed.settle(manta, FOOTPRINT);
const { drawn, k } = seabed.stand(manta, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(manta);
const box = new THREE.Box3().setFromObject(manta);
const size = box.getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_rim_manta: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('fish_belly'))
  throw new Error(`env_rim_manta: materials [${[...t.materials]}], not fish_flank and fish_belly`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_rim_manta: lowest vertex at ${t.lowest}, not on the ground`);
// What stands on y = 0 is a mark on the flat of the belly, which is the
// lowest skin and stands the marks' stand-off over it.
if (!t.onFloor.length || t.onFloor.some((name) => !marks.some((m) => m.name === name)))
  throw new Error(`env_rim_manta: on the ground [${t.onFloor}], not the belly's marks alone`);
const bellyBox = new THREE.Box3().setFromObject(manta.getObjectByName('belly'));
if (Math.abs(bellyBox.min.y - PROUD * fit) > 1e-6)
  throw new Error(`env_rim_manta: the belly's lowest point is at ${bellyBox.min.y}, not ${PROUD}`);
if (Math.abs(size.z - FOOTPRINT) > 1e-3 || size.x > 16.5)
  throw new Error(
    `env_rim_manta: ${size.x.toFixed(3)} long by ${size.z.toFixed(3)} across; the span is the footprint`
  );
manta.traverse((o) => {
  if (!o.isMesh) return;
  if (o.material.emissive.getHex() !== 0)
    throw new Error(`env_rim_manta: ${o.name} carries an emissive`);
  if ((o.name === 'belly') !== (o.material.name === 'fish_belly'))
    throw new Error(`env_rim_manta: ${o.name} wears ${o.material.name}`);
});
// The body axis the runtime hangs the manta by: the mid-plane of the centre
// section at its thickest, read off the baked back and belly.
let top = -Infinity;
let bottom = Infinity;
for (const name of ['back', 'belly']) {
  const pos = manta.getObjectByName(name).geometry.attributes.position;
  for (let i = 0; i < pos.count; i++)
    if (Math.abs(pos.getZ(i)) < 1e-6) {
      top = Math.max(top, pos.getY(i));
      bottom = Math.min(bottom, pos.getY(i));
    }
}
const axisM = (top + bottom) / 2;
const eyeAt = new THREE.Box3()
  .setFromObject(manta.getObjectByName('eye_s'))
  .getCenter(new THREE.Vector3());
const partTris = (name) => manta.getObjectByName(name).geometry.attributes.position.count / 3;
const sum = (names) => names.reduce((s, n) => s + partTris(n), 0);
const lum = (m) => 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b;
console.log(
  `env_rim_manta: ${t.tris} triangles, fit ×${fit.toFixed(4)}, drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.x.toFixed(2)} by ${size.z.toFixed(2)} by ${size.y.toFixed(4)} m tall (x ${box.min.x.toFixed(3)}..${box.max.x.toFixed(3)}), ` +
    `materials ${[...t.materials].join(' + ')}, flank at ${(lum(flank) / lum(pale)).toFixed(4)} of the belly, on the ground: ${t.onFloor.join(', ')}; ` +
    `eyes r ${(eyes.s.radius * fit).toFixed(4)} m at ${eyeAt
      .toArray()
      .map((v) => v.toFixed(3))
      .join(
        ', '
      )}; body axis ${axisM.toFixed(4)} m over the origin (centre section ${bottom.toFixed(3)}–${top.toFixed(3)})\n` +
    `  back ${partTris('back')}, belly ${partTris('belly')}, lobes ${partTris('lobe_p')} each, tail ${partTris('tail')}, ` +
    `pelvics ${partTris('pelvic_p')} each, dorsal ${partTris('dorsal')}, eyes ${partTris('eye_p')} each, mouth ${partTris('mouth')}, ` +
    `gills ${sum(marks.filter((m) => m.name.startsWith('gill')).map((m) => m.name))} (a side ${GILLS.map((_, i) => partTris(`gill_s${i + 1}`)).join(', ')}), ` +
    `blotches ${sum(blotches.map((b) => b.name))}\n` +
    `  marks ${(PROUD * fit).toFixed(3)} m proud along their throw, no less than ${(least * fit).toFixed(4)} m off the belly\n` +
    blotches
      .map((b) => {
        const c = new THREE.Box3()
          .setFromObject(manta.getObjectByName(b.name))
          .getCenter(new THREE.Vector3());
        return `  ${b.name}: x ${c.x.toFixed(2)}, z ${c.z.toFixed(2)}, ${(b.size * fit).toFixed(2)} m across, ${b.corners} corners, ${partTris(b.name)} triangles`;
      })
      .join('\n')
);
await exportGlb(manta, 'env-rim-manta.glb');
