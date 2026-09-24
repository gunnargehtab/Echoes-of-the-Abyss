/**
 * Hull models, authored as three.js scenes — the shared kit.
 *
 * Every approved model in `docs/concept-art/models/` is `THREE.GLTFExporter`
 * output: a scene of named primitive parts, no sculpts and no textures. The
 * Bulwark is `hull_slab` + `armour_tier_1..3` + `flank_plate_p0..p3`; the Dredge
 * is `tergite_0..n` + `tergite_ridge_0..n` + `tergite_spine_0..n`. Those repeating
 * series are loops, so the roster can be *built* rather than exported — which is
 * what makes a hull editable, diffable and restylable instead of an opaque binary.
 *
 *   node tools/hull-models/hulls/<hull>.mjs   # writes docs/concept-art/models/<hull>-<navy>.glb
 *
 * The output goes through `hull-intake` like any other export
 * (docs/graphics-standards.md gate 2); this changes where a GLB comes from,
 * never whether it is checked.
 *
 * Three layers, and the split is the point:
 *
 *   kit.mjs        buildability — metres, bow on +X, Y up, Z the beam, and the
 *                  export itself. Knows nothing about any navy.
 *   factions/*.mjs the shape language — one module a navy, holding its palette
 *                  and its part vocabulary, read off the approved models' own
 *                  node names. Restyling a fleet is an edit here.
 *   hulls/*.mjs    one hull, composed from its navy's vocabulary. Holds only
 *                  what is unique to that hull.
 *
 * `structures/*.mjs` is one structure kind in one navy, the same way. The
 * environment props (#869) are the same split with the ground for a navy:
 * `seabed.mjs` is their shape language — the Block 4 materials and the
 * table builders, since a prop belongs to nobody — and `props/*.mjs` one
 * prop each, writing `env-<thing>.glb`.
 *
 * Conventions the intake harness and the runtime both rely on:
 *
 * - **Metres, and metre-true.** Build at the design `hullLengthM`; intake warns
 *   on a rescale, and a warning-free bake is the bar.
 * - **Bow on +X.** `bake.mjs` auto-rotates a Z-long export and says so; do not
 *   make it guess.
 * - **A lamp is a near-black base with an `emissive`.** Runtime keeps only the
 *   *luminance* and recolours to the faction glow (rosterModels.ts, gate 4), so
 *   hue here is a design aid — placement and relative strength are what ship.
 * - **Light has to face up.** The maps are top-down orthographic, so a louvre on
 *   a vertical face has no plan area and gate 3's glow metric cannot see it.
 *   Lit features go on upward surfaces, as strips, bars or patches. The
 *   export *measures* this rather than trusting it: `lightAudit` rasterises
 *   the scene from above at the maps' own density and names every lit part
 *   that shows less than a cell of plan area. Its first run found the
 *   Derrick's six deck floods sitting *inside* the hull slab (see `plan`
 *   below for why) — parts the approved bake had never seen.
 * - **A lamp rests on something.** The same audit measures each lit part's
 *   gap to the nearest other solid part and names one standing off
 *   everything by more than a fifth of a metre: a fixture in the water
 *   rather than on the hull, which the conn view draws exactly so (#894).
 *   `seat` is the placement that answers it — the nearest surface, the
 *   lamp stood on it — and a haze is not a surface (glb.mjs `occludes`).
 * - **A script and its GLB agree, or the build fails.** `check.mjs` rebuilds
 *   every hull under `HULL_MODELS_OUT` and diffs the parts against the
 *   committed file; a change to a faction module is not done until the hulls
 *   it moves are re-run and their GLBs committed with it.
 *
 * `FileReader` is shimmed because three r169's GLTFExporter reads its own binary
 * chunk back through one, and Node has `Blob` but not `FileReader`.
 */
globalThis.FileReader = class {
  readAsArrayBuffer(b) {
    b.arrayBuffer().then((r) => {
      this.result = r;
      this.onloadend?.();
    });
  }
  readAsDataURL(b) {
    b.arrayBuffer().then((r) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64');
      this.onloadend?.();
    });
  }
};

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import {
  sceneParts,
  topDown,
  boundsOf,
  closestPoint,
  topAt,
  gapBetween,
  occludes,
} from './glb.mjs';
export { THREE };

/**
 * A colour as the docs write it. `hex('#7A1B2E')` is `docs/art-direction.md`'s
 * abyssal red, converted by three from sRGB to the linear value the exporter
 * carries — which is also, to four decimals, what every approved binary in
 * `docs/concept-art/models/` carries, because they were all authored from the
 * same tokens. The first faction modules transcribed those linear values by
 * hand and rounded them, and one rounding zeroed two channels of the
 * Directorate's trench black (#630). A module cites the token; nothing here
 * types out a linear triple.
 */
export const hex = (token) => new THREE.Color(token).toArray();

/** Cladding: a plain PBR surface. Metalness and roughness are the navy's. */
export function clad(name, rgb, metalness, roughness) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...rgb),
    metalness,
    roughness,
  });
  m.name = name;
  return m;
}

/**
 * A lamp: near-black base, the light in `emissive`. See the header. The
 * roughness is the approved models' 0.4 unless a navy's fixture says
 * otherwise — the Order's structure lights are polished to 0.15 and 0.3.
 * `intensity` is the `KHR_materials_emissive_strength` an export carries
 * (the four Light Scouts' lamps burn at 1.6 to 3.5); the bake caps it at 1,
 * so it moves nothing on a map, and the conn view shows it.
 */
export function lamp(name, rgb, base = [0.01, 0.01, 0.0], roughness = 0.4, intensity = 1) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...base),
    metalness: 0,
    roughness,
    emissive: new THREE.Color(...rgb),
    emissiveIntensity: intensity,
  });
  m.name = name;
  return m;
}

export function add(root, name, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.position.set(...p);
  mesh.rotation.set(...r);
  mesh.scale.set(...s);
  root.add(mesh);
  return mesh;
}

export const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
// `thetaStart` turns the first facet: a four-sided cylinder is a diamond in
// section at 0 and a square at π/4, which is the Klaxon's nose and the
// Directorate's rostrum.
export const cyl = (rTop, rBottom, h, seg = 12, thetaStart = 0) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, false, thetaStart);
export const torus = (r, t, rs = 8, ts = 24) => new THREE.TorusGeometry(r, t, rs, ts);
export const octa = (r) => new THREE.OctahedronGeometry(r, 0);

/**
 * A thin plate from a plan outline — points are absolute metres in the
 * horizontal plane, `[x, z]`, and the plate is `thicknessM` in Y.
 *
 * Wings, fins, decks and fairings are all this. The Clarion's wings are 30 m
 * long and 0.9 m thick, which is the proportion to aim at: beam comes from
 * planar surfaces, not from a fat body.
 *
 * `bevelM` rounds the rim: the slab keeps `thicknessM` between its faces and
 * grows a chamfer `bevelM` proud of the outline all round, so the plate ends
 * up `thicknessM + 2·bevelM` tall. Square-edged is what an Order wing wants
 * and is the default; the Commune is soft-edged by doctrine, and a hard rim
 * on the Sower's bloom bed reads as sheet metal. The chamfer goes *outward*
 * — three's `bevelSize` contracts the caps rather than swelling the waist —
 * so the outline given is the plate's **top face** and its widest section
 * sits a bevel below.
 */
export function plate(points, thicknessM, bevelM = 0) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thicknessM,
    bevelEnabled: bevelM > 0,
    bevelThickness: bevelM,
    bevelSize: bevelM,
    bevelSegments: 1,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, thicknessM / 2, 0);
  return geo;
}

/**
 * A thin plate from a plan outline, **centred on y = 0 and with `z` as given**.
 *
 * `plate` above carries two quirks of the extrude-then-rotate it is built
 * from: its slab sits from half a thickness to one and a half above the
 * origin, and the outline's second coordinate lands on **-z**. Neither shows
 * on a symmetric outline placed by eye, which is how the Derrick and the
 * Responsory were built, so `plate` keeps that frame rather than move two
 * approved models. The Commune's leaves and the Directorate's scoops are
 * asymmetric in plan on purpose, and an outline that comes out mirrored is
 * the kind of error nothing downstream can see — so they build from this.
 *
 * `bevelM` is `plate`'s, and the centring survives it: the slab spans
 * ±(thicknessM/2 + bevelM) about y = 0.
 */
export function plan(points, thicknessM, bevelM = 0) {
  const geo = plate(
    points.map(([x, z]) => [x, -z]),
    thicknessM,
    bevelM
  );
  geo.translate(0, -thicknessM, 0);
  return geo;
}

/**
 * A faceted lofted body along X, from a profile of `[x, radius]` stations.
 *
 * The load-bearing shape for a hull that has to read as a *body* rather than a
 * slab. The Clarion's `blade_hull` is 75 m long and 8 m in **both** cross-section
 * axes, and every metre of its 34 m beam is wing — so the body is a spar and the
 * profile is what gives it a swelling and a fine point instead of steps. Lathed
 * rather than stacked from cylinders: a stacked spar shows a seam at every
 * station, which at sprite scale reads as a segmented worm.
 *
 * `facets` stays low on purpose — the style asks for "crisp facets", not a tube.
 *
 * `phase` is where the first seam sits, in radians round from the beam (three's
 * `phiStart`). At 0, the default, a vertex lies on +z; at `π / facets` a flat
 * does instead — which is how a four-facet section becomes a rectangle once it
 * is scaled, and a six-facet one carries a vertex on the crown. The Order's
 * blades and horn are cut that way (factions/hadron.mjs `spar`), and so is its
 * exchanger prism on the Vent Tap (a square with a flat face up, at π/4).
 *
 * Stations run toward +x. A lathe's faces are wound one way whatever its
 * profile does, so a profile listed toward −x faces in — the Antiphon's
 * after spine did until #871, drawn from under the deck down to the drive,
 * and nothing measured it: the bake culls a face wound in, and `check.mjs`
 * reads name, count and bounds, which a flipped face keeps. Drawing toward
 * −x is for a bore, which factions/hadron.mjs `bell` does on purpose so the
 * mouth's inside faces in.
 */
export function loft(profile, facets = 10, phase = 0) {
  const pts = profile.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.001), x));
  const geo = new THREE.LatheGeometry(pts, facets, phase);
  geo.rotateZ(-Math.PI / 2);
  return geo;
}

/**
 * A swept body: one `section` carried along X through `stations`, each
 * `[x, halfBeam, halfHeight, yCentre?]`, stitched into flat-shaded quads with
 * a fan closing each end. The section is a closed polygon of `[u, v]` in unit
 * half-beam and half-height, listed once around — `CHINE` below is the
 * hard-chined working section a Consortium hull wants, and a navy can bring
 * its own.
 *
 * `loft` gives a body that is round in section and has to be squashed into
 * anything else; this gives a body that is whatever section the navy draws,
 * with a real edge where the topsides meet the bottom. A hull with a chine
 * reads as built where a lathed one reads as blown, which is the Klaxon's
 * whole argument in one line.
 *
 * Winding is the caller's, and the albedo will not tell you it is wrong: the
 * sides face out only when the section's rotation agrees with the stations'
 * direction. `CHINE` as listed — deck, starboard, keel — wants the stations
 * bow first; listed stern first, every side faces in, which the bake culls,
 * and only a height pass shows the part reading under its own floor (#840).
 * The end caps follow the sides: a flat end faces the way its sides do,
 * whichever way that is. Until #871 they wound against them in both cases,
 * so the Tocsin's crystal spine shipped with its sides out and both caps
 * in — a fault no bake shows, since a cap on an x-long run is a vertical
 * face, and `check.mjs` cannot see, since a flipped face keeps its name,
 * count and bounds. Close both ends to a point, a zero station, and there
 * is no cap at all.
 */
export function sweep(stations, section) {
  const ring = (st) => {
    const [x, hb, hh, yc = 0] = st;
    return section.map(([u, v]) => [x, yc + v * hh, u * hb]);
  };
  const rings = stations.map(ring);
  const v = [];
  const push = (a, b, c) => v.push(...a, ...b, ...c);
  const isPoint = (st) => st[1] < 1e-6 && st[2] < 1e-6;
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    for (let j = 0; j < section.length; j++) {
      const k = (j + 1) % section.length;
      // A station drawn to a point (a bow or a stern) is a fan, not a quad
      // with two coincident corners — the exporter rejects the zero normals.
      if (isPoint(stations[i + 1])) push(A[j], B[j], A[k]);
      else if (isPoint(stations[i])) push(A[j], B[j], B[k]);
      else {
        push(A[j], B[j], B[k]);
        push(A[j], B[k], A[k]);
      }
    }
  }
  const cap = (R, st, flip) => {
    if (isPoint(st)) return;
    const c = [st[0], st[3] ?? 0, 0];
    for (let j = 0; j < R.length; j++) {
      const k = (j + 1) % R.length;
      if (flip) push(c, R[k], R[j]);
      else push(c, R[j], R[k]);
    }
  };
  // The first ring's fan turns with the sides' rotation and the last ring's
  // against it, which puts each end's face on the same side as the sides.
  cap(rings[0], stations[0], false);
  cap(rings[rings.length - 1], stations[stations.length - 1], true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A hard-chined working section: flat-ish deck, a knuckle at the waterline, a full bilge. */
export const CHINE = [
  [0, 1],
  [0.88, 0.92],
  [1, 0.2],
  [1, -0.2],
  [0.62, -0.85],
  [0, -1],
  [-0.62, -0.85],
  [-1, -0.2],
  [-1, 0.2],
  [-0.88, 0.92],
];

/**
 * A swept geometry given the UV set every lathe, box and orb carries. The
 * runtime merges one material's meshes into a draw, three's
 * `mergeGeometries` refuses a bucket whose members disagree on attributes —
 * hull-intake warns on exactly that — and `sweep` writes positions and
 * normals only. Nothing samples a texture, so the values are zero and the
 * attribute's presence is the point. Two navies had the same four lines
 * (#840), which is when a builder moves here (models-plan.md §3.7).
 */
export function uvAlike(geo) {
  const n = geo.attributes.position.count;
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(2 * n), 2));
  return geo;
}

/**
 * Stations for a run of overlapping segments between `stern` and `bow`:
 * `count` of them, each overlapping the one ahead by `overlap` of its
 * half-length, with girth from `profile(t)` (0 at the stern, 1 at the bow)
 * and a section of `[height, beam]` as fractions of each segment's
 * half-length. The default profile swells just aft of amidships and draws in
 * to both ends. Returns `[[x, sx, sy, sz], ...]`, stern first.
 *
 * The Directorate's tergites are the series that named this; the Klaxon's
 * armour tiers and the Order's panel seams are the same loop with a
 * different segment in it, which is why it lives here and not in one navy.
 */
export function segmentSeries(opts) {
  const {
    stern,
    bow,
    count,
    section = [0.6, 1.0],
    overlap = 0.3,
    profile = (t) => 0.72 + 0.28 * Math.sin(Math.PI * (0.15 + 0.75 * t)),
  } = opts;
  const raw = Array.from({ length: count }, (_, i) => profile(count > 1 ? i / (count - 1) : 0.5));
  let span = raw[0] + raw[count - 1];
  for (let i = 1; i < count; i++) span += (raw[i - 1] + raw[i]) * (1 - overlap);
  const k = (bow - stern) / span;
  const out = [];
  let x = stern + raw[0] * k;
  raw.forEach((g, i) => {
    if (i > 0) x += (raw[i - 1] + g) * k * (1 - overlap);
    const sx = g * k;
    out.push([
      +x.toFixed(2),
      +sx.toFixed(2),
      +(sx * section[0]).toFixed(2),
      +(sx * section[1]).toFixed(2),
    ]);
  });
  return out;
}

/**
 * A cable run between two points: a thin tube that sags `sag` metres at
 * its middle. Rigging, drum falls, the Commune's tendrils — anything that
 * hangs rather than stands. Straight when `sag` is 0.
 */
export function cable(root, name, a, b, mat, { r = 0.15, sag = 0, steps = 8, facets = 5 } = {}) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  // A quadratic curve reaches half its control offset, so drop the control
  // point twice the sag to land the belly where it was asked for.
  mid.y -= 2 * sag;
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, steps, r, facets, false), mat);
  mesh.name = name;
  root.add(mesh);
  return mesh;
}

/**
 * A louvre bank that reads from above: `count` slats running along X, each
 * `length` by `slat` wide, stepped across Z at `pitch` and tilted `tilt`
 * radians about their own axis, so every slat presents `slat·cos(tilt)` of
 * plan width to a top-down map. The Derrick's louvres were boxes on a
 * vertical wall and contributed nothing to gate 3; this is the same feature
 * laid on a deck, where it counts.
 */
export function louvres(root, name, mat, opts) {
  const { x, y, z = 0, length, count, pitch, slat = pitch * 0.8, tilt = 0.5, t = 0.15 } = opts;
  for (let i = 0; i < count; i++)
    add(root, `${name}_${i}`, box(length, t, slat), mat, [x, y, z + (i - (count - 1) / 2) * pitch], [
      tilt,
      0,
      0,
    ]);
}

/** A strut between two points, oriented by quaternion — no Euler-order guesswork. */
export function strut(root, name, a, b, mat, t = 0.8) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const mesh = new THREE.Mesh(box(d.length(), t, t), mat);
  mesh.name = name;
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
  root.add(mesh);
  return mesh;
}

/**
 * Mirror a builder across the keel: called once a side, with the side's tag
 * and its sign. **`p` is port, and port is -z; `s` is starboard, +z.** The
 * kit's frame has the bow on +X and Y up, so +z is the right-hand side of a
 * hull facing forward — the word means what it says at sea, and it means
 * the same thing here (#642). It is the side the sprite and the conn view
 * put on a ship's right when it heads right across the screen, the side
 * `outlines.mjs` cuts first, and the side every prompt block means by
 * "starboard".
 *
 * It was the other way round until #642: this helper handed `p` the +z
 * side, and the eleven hulls built through it before then — Bulwark,
 * Cantus, Clarion, Derrick, Dredge, Precentor, Reciter, Responsory, Sower,
 * Spinner, Tender — carried the mirrored names into their approved files,
 * while the four Light Scouts, and the twenty shared-kind exports behind
 * them, name their sides the nautical way (port at the export's +x, which
 * `drawn` lands on -z). Two conventions in the same four modules meant the
 * next author would "fix" a scout to match the helper or the helper to match
 * a scout, and either is a change to what a model is, since `check.mjs`
 * compares names. So the helper turned round and the eleven were re-run as
 * a relabel: starboard is drawn first, because +z is the side the first
 * call always drew, which leaves every buffer of every one of the eleven
 * byte-identical to its approved binary and changes only the node names.
 * Where a script chose a side by its tag — the Tender's patches, the
 * Precentor's ranks, the Dredge's claw and boom — the tag was swapped so the
 * part stayed where the approved model has it. The four Choristers, X-long
 * exports of the same early pass, carry the same mirrored names and were
 * relabelled the same way in their ports, as were the Commune Harvester's
 * two feed tendrils, the one pair on a Z-long export named the other way.
 * What the relabel showed about two of those models against their prompt
 * blocks — the Dredge's claw and the Precentor's longer rank, both written
 * to the old reading — #650 settled by amending the blocks. `hadron.pair`
 * is the turrets' own `r`/`l`, the export's, and not this.
 */
export function bothSides(fn) {
  fn('s', 1);
  fn('p', -1);
}

/**
 * The mirrored pair as the Z-long shared-kind exports draw one (#649): `p`
 * first, at the export's +x — which `drawn` below lands on the kit's -z,
 * port, so the name and the side agree — and `s` its mirror. Every pair on
 * the sixteen Z-long exports of the five shared kinds writes its `_p` before
 * its `_s`, singly or a whole assembly at a time, and `check.mjs` compares
 * in the file's order, so a port of one cannot use `bothSides`, which draws
 * starboard first for the eleven relabelled hulls' sake. `sgn` is the sign
 * of the export's x; `flank` turns it into a placement.
 */
export function flanks(fn) {
  fn('p', 1);
  fn('s', -1);
}

/**
 * A pair's placement on `sgn`'s flank from its `_p` numbers: `drawn` of the
 * export's translation with x on that side, and the y and z angles with it,
 * which is the mirror of an XYZ Euler across the export's x (`hadron.sided`
 * says the same of the turrets' `r`/`l`). Every pair on the Order's four
 * Z-long shared kinds decomposes exactly so.
 */
export const flank = (sgn, [x, y, z], [a = 0, b = 0, c = 0] = [], s) =>
  drawn([sgn * x, y, z], [a, sgn * b, sgn * c], s);

export function bounds(root) {
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root);
  const f = (v) => v.map((x) => +x.toFixed(1));
  return { x: f([bb.min.x, bb.max.x]), y: f([bb.min.y, bb.max.y]), z: f([bb.min.z, bb.max.z]) };
}

/**
 * The light-faces-up rule, measured. Rasterises the scene from above at
 * `ppm` cells a metre (the shipped maps' density, MAP_PPM in
 * tools/hull-maps/build.mjs) and reports, for every part whose material is
 * emissive, how much of it is actually on top — plan area no other part
 * covers. A part below `minM2` is one gate 3 cannot see: a lamp on a
 * vertical face, a glow inside a horn, a port under a deck.
 *
 * The second measure is whether the lamp rests on anything. A lamp is a
 * fixture on a hull, and one standing off every other part is a light in
 * the water: #890's reviews found eighteen of the Dredge's twenty-one
 * plate-edge photophores 0.45 to 1.67 m above their plates and the
 * Commune Cruiser's bow light 2.34 m ahead of its nose, in approved models
 * no gate had measured (#894). For every lit part, `gap` is how far its
 * surface stands from every other solid part's (glb.mjs `gapBetween`) —
 * nothing for a bud sunk in a skin, a box laid on a plate or a throat
 * sealed in a crystal, and the whole gap for one that floats. Over
 * `minGapM`, a fifth of a metre, it is `floating`. `seat` is the builder's
 * answer.
 *
 * A lit part that does not occlude — the Spire's sheath, the Veil's haze —
 * is a glow and not a lamp: it owns no cell from above and rests on
 * nothing by nature, so it is left out of both lists rather than named by
 * both. The bake blends it at its own opacity, which is all the chart ever
 * sees of it.
 *
 * Returns `{ lit: [{ name, m2, gap }], totalM2, hidden: [names],
 * floating: [names] }`; the export prints it and warns on `hidden` and
 * `floating`, because a warning-free bake is the bar and these are the
 * warnings intake cannot give (it sees only the maps).
 */
export function lightAudit(root, { ppm = 4, minM2 = 0.25, minGapM = 0.2 } = {}) {
  const { parts } = sceneParts(root);
  const isLit = (o) => o.isMesh && o.material?.emissive && o.material.emissive.getHex() !== 0;
  const litIndex = new Set();
  let i = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (isLit(o) && occludes(parts[i].finish)) litIndex.add(i);
    i++;
  });
  if (litIndex.size === 0) return { lit: [], totalM2: 0, hidden: [], floating: [] };
  const td = topDown(parts, ppm);
  const cells = new Map();
  for (const o of td.owner) if (litIndex.has(o)) cells.set(o, (cells.get(o) ?? 0) + 1);
  const lit = [...litIndex].map((k) => ({
    name: parts[k].name,
    m2: +((cells.get(k) ?? 0) * td.cellArea).toFixed(2),
    gap: +gapBetween(parts[k], parts).toFixed(2),
  }));
  return {
    lit,
    totalM2: +lit.reduce((s, l) => s + l.m2, 0).toFixed(1),
    hidden: lit.filter((l) => l.m2 < minM2).map((l) => l.name),
    floating: lit.filter((l) => l.gap > minGapM).map((l) => l.name),
  };
}

/**
 * Where a part rests: the placement that seats it on the nearest solid
 * surface among the parts named in `on` — a lamp on the plate under its
 * station, a bud on the skin beside it — rather than where a file left it
 * hanging (#894). From `centre`, the seed, the nearest point of those parts
 * is found and the part's centre is stood `stand` off it along the
 * surface's outward normal, less `sink`: a bud of radius r seats with
 * `stand: r` and sinks half of it; a box `h` tall lies on a plate with
 * `stand: h / 2` and its bottom face on the plate. The part's +y is turned
 * onto the normal, so a box lies on a sloped facet tilted with it, which is
 * what the Dredge's ridge lamps did by hand (#890); a bud is round and the
 * turn is nothing.
 *
 * Two ways of finding the surface, for two kinds of fixture:
 *
 * - **Nearest** (the default) seats a bud where the skin is closest to it,
 *   so one rule seats a flank light on the beam's edge and a crest light on
 *   a crest, and pulls a lamp the file buried inside a plate out onto it.
 *   The seed decides which face wins where two are near — a seed over a
 *   peduncle's crown seats on the crown, one behind its cap on the cap — so
 *   a script seeds where the lamp belongs and lets the surface settle the
 *   last half-metre.
 * - **`drop: true`** keeps the seed's station and takes the surface
 *   straight under it (glb.mjs `topAt`), which is what a lamp laid on a
 *   plate wants: from a station a metre over a shoulder the nearest facet
 *   is downhill of it, and a rank of plate-edge lamps would slide outboard
 *   by as much. A station over none of the named parts is an error.
 *
 * The named parts must already be in `root`; a seed that reaches none of
 * them is an error, not a lamp left where it was.
 *
 * Everything is in `root`'s own frame — the seed, `stand`, `sink` and the
 * placement returned — so a script hands over the numbers it would have
 * handed `add`, on a root the Dredge scales before it builds and a
 * Z-long port scales after, alike. `yaw` turns the part about its own
 * axis before it is laid on the surface, for a slab whose long side runs
 * with a house that is not square to the frame. Returns `{ at, rot,
 * normal, gap }` — `rot` an XYZ Euler for `add`, `normal` and `gap` in
 * metres, the surface's direction and how far the seed stood from it, for
 * the record.
 */
export function seat(root, on, centre, { stand = 0, sink = 0, drop = false, yaw = 0 } = {}) {
  const names = Array.isArray(on) ? on : [on];
  const { parts } = sceneParts(root);
  const surfaces = parts.filter((p) => names.includes(p.name));
  if (surfaces.length !== names.length) {
    const missing = names.filter((n) => !surfaces.some((p) => p.name === n));
    throw new Error(`seat: ${missing} not in ${root.name}`);
  }
  // The root's frame, once: a uniform scale is the one thing a model root
  // carries here, and `stand` is in its units as the part's height is.
  const scale = root.getWorldScale(new THREE.Vector3()).x;
  const seed = root.localToWorld(new THREE.Vector3(...centre));
  const hit = drop ? topAt(surfaces, seed.x, seed.z) : closestPoint(surfaces, seed.toArray());
  if (!hit)
    throw new Error(`seat: nothing solid among ${names}${drop ? ' under the station' : ''}`);
  const n = new THREE.Vector3(...hit.normal);
  const off = (stand - sink) * scale;
  const at = root.worldToLocal(new THREE.Vector3(...hit.point).addScaledVector(n, off));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  q.premultiply(root.getWorldQuaternion(new THREE.Quaternion()).invert());
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  const rot = new THREE.Euler().setFromQuaternion(q).toArray().slice(0, 3);
  const gap = drop ? Math.abs(seed.y - hit.point[1]) : hit.distance;
  return { at: at.toArray(), rot, normal: n.toArray(), gap };
}

/* --------------------------------------------------------------------------
 * Radial placement, and the Vent Tap's faction-neutral skeleton.
 *
 * A settlement is one architecture grown four ways, and #553 put each navy's
 * growth in its own module. The Vent Tap is the opposite case: a piece of the
 * seabed four navies bolt the same clamp onto. Two thirds of every approved
 * Vent Tap — the wellhead, the four draw arms and the eight floods, 62 parts —
 * is identical to the centimetre across the four files, and only the
 * exchanger on the end of each arm is the navy's (#608). So the skeleton is
 * built here, once, taking the navy's materials the way `plate` and `louvres`
 * take theirs, and a structure script contributes its exchanger alone. The
 * Slipway shares a skeleton the same way. The Foundry and the Refinery do
 * not (#652): what their four files share is a vocabulary by *name* — the
 * same parts in the same order, at each navy's own numbers, one navy's
 * crane its own in every dimension and its trolley at a different station
 * — so their builders, at the foot of this file, take every number as a
 * parameter with one file's as the default, and the names with them. The
 * Bastion shares nothing across its four files as a set — pairwise, the
 * Directorate's and the Commune's carry fifteen part names in common and
 * the Knights' and the Commune's a `pressure_dome`, at no common number —
 * and lives in each navy's module.
 *
 * The numbers are the approved files' own and are the defaults, because all
 * four carry them unchanged: repeating them in four scripts is the
 * identical-by-hand drift the epic exists to stop. A tap that wants a taller
 * chimney passes its own.
 *
 * Every part is placed as the approved files place it — a loft stood on end
 * by a quarter turn on its node, a unit orb scaled and yawed rather than a
 * pre-scaled geometry — because the bake and the runtime measure a model with
 * three's `Box3.setFromObject`, which takes each part's *local* box through
 * its transform (see `fitFootprint`): two builds with the same vertices and
 * different transforms bake at different scales.
 * ------------------------------------------------------------------------ */

/** A point `r` metres out along bearing `a` (radians, anticlockwise from +X in plan), `y` up. */
export const polar = (a, r, y = 0) => [r * Math.cos(a), y, r * Math.sin(a)];

/**
 * A builder repeated round a centre: `count` times, at `phase` plus `i` turns
 * of `2π / count`, each call given its bearing and its index. The rotational
 * counterpart of `bothSides`, as `segmentSeries` is the linear one: a Vent
 * Tap's four draw arms, its five basalt lobes and its eight wellhead floods
 * are each one of these. The Bastions' docking collars and the Sounding
 * Spire's legs turned out to sit on no regular bearing in their approved
 * files (#652) and are placed one by one.
 */
export function radialSeries({ count, phase = 0 }, fn) {
  for (let i = 0; i < count; i++) fn(phase + (i * 2 * Math.PI) / count, i);
}

/**
 * Hold a structure at its footprint diameter by the measure the bake and the
 * runtime take (hull-intake's page.html, rosterModels.ts): three's
 * `Box3.setFromObject`, which takes each part's local bounding box through
 * its transform — wider than the vertices for a part that is yawed or leaned
 * — on the longer horizontal axis, which is the one the bake scales after
 * yawing a Z-long file onto X. Scales the root so that measure is `lengthM`,
 * and returns what it measured. This is what makes intake report ×1.000
 * instead of guessing, and what keeps a scripted file's frame exactly where
 * its approved export's was: a file that is metre-true by its vertices and
 * not by this measure bakes a few percent under size.
 */
export function fitFootprint(root, lengthM) {
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  root.scale.setScalar(lengthM / Math.max(size.x, size.z));
  return size;
}

/**
 * The wellhead: the basalt chimney with five lobes round its foot, the ember
 * mouth in it, the apron of scorched ground, the wellhead clamp and the draw
 * manifold over the mouth — "a basalt chimney at the centre with a wellhead
 * clamp and a draw manifold over its mouth" (docs/asset-prompts-3d.md,
 * STRUCTURE — Vent Tap). `rock` clads the chimney, its lobes, the apron and
 * the clamp; `steel` the manifold; `mouth` is the lit ember under it.
 *
 * The chimney and both rings are lofts stood on end — lathed along X as every
 * kit body is, then turned upright on the node — which is how the approved
 * files carry them. The rings have a crown station so they read as a clamp
 * and a manifold rather than two washers.
 */
export function ventWellhead(root, { rock, mouth, steel }, opts = {}) {
  const {
    chimney = {
      profile: [
        [-6, 0.2],
        [-4, 30],
        [8, 24],
        [18, 16],
        [24, 12],
      ],
      facets: 10,
    },
    lobes = { count: 5, phase: 0.6, r: 34, y: 1, size: [14, 6, 10] },
    ember = { r: 11.5, y: 24.4, t: 1.2 },
    apron = { r: 64, rTop: 60, y: -3.5, t: 3 },
    clamp = { y: 26, r: 16, crown: 19, halfWidth: 3 },
    manifold = { y: 31, r: 14.5, crown: 19.5, halfWidth: 1.2 },
  } = opts;
  const upright = [0, 0, Math.PI / 2];
  add(root, 'vent_chimney', loft(chimney.profile, chimney.facets), rock, [0, 0, 0], upright);
  radialSeries(lobes, (a, i) =>
    add(
      root,
      `basalt_lobe_${i}`,
      new THREE.SphereGeometry(1, 8, 6),
      rock,
      polar(a, lobes.r, lobes.y),
      [0, -a, 0],
      lobes.size
    )
  );
  add(root, 'vent_mouth', cyl(ember.r, ember.r, ember.t, 12), mouth, [0, ember.y, 0]);
  add(root, 'apron', cyl(apron.rTop, apron.r, apron.t, 16), rock, [0, apron.y, 0]);
  const ring = ({ r, crown, halfWidth }) =>
    loft(
      [
        [-halfWidth, r],
        [0, crown],
        [halfWidth, r],
      ],
      16
    );
  add(root, 'clamp_ring', ring(clamp), rock, [0, clamp.y, 0], upright);
  add(root, 'manifold_ring', ring(manifold), steel, [0, manifold.y, 0], upright);
}

/**
 * One draw arm on `bearing`: the pipe from the manifold out to the riser, the
 * valve block and stem where it leaves the clamp, three lamps along the run,
 * the riser the exchanger hangs off, and the floodlit working platform on
 * two legs under the pipe — "four radial draw pipes running out to heat
 * exchangers on the corners ... floodlit working platforms around the
 * wellhead, lamps along every pipe run". Distances are metres out along the
 * bearing. Call it once an arm and put the navy's exchanger on the same
 * bearing straight after it: the approved files order each arm's parts so.
 *
 * `rock` clads the valve, `steel` the pipe, the riser and the legs, `deck`
 * the platform; `lamp` and `flood` are the lit parts.
 */
export function ventDrawArm(root, { rock, steel, deck, lamp, flood }, opts) {
  const {
    bearing: a,
    pipe = { from: 18, to: 62, r: 2.6, y: 20 },
    valve = { at: 30, block: 6, stem: { r: 0.8, h: 6, y: 25 } },
    lamps = { from: 24, pitch: 12, count: 3, size: [2, 0.6, 2], y: 22.9 },
    riser = { at: 64, r: 2.4, h: 20, y: 10 },
    platform = { at: 40, size: [14, 1.2, 10], y: 8, flood: { size: [12, 0.4, 8], y: 8.9 } },
    legs = { spread: 6, r: [0.9, 1.1], h: 10, y: 2.5 },
  } = opts;
  const yaw = [0, -a, 0];
  // A cylinder is born on Y; laid along the bearing this way it keeps a
  // vertex on top, which is where the approved pipe's is.
  add(
    root,
    'draw_pipe',
    cyl(pipe.r, pipe.r, pipe.to - pipe.from, 8),
    steel,
    polar(a, (pipe.from + pipe.to) / 2, pipe.y),
    [0, -a, -Math.PI / 2]
  );
  add(root, 'valve_block', box(valve.block, valve.block, valve.block), rock, polar(a, valve.at, pipe.y), yaw);
  add(root, 'valve_stem', cyl(valve.stem.r, valve.stem.r, valve.stem.h, 6), rock, polar(a, valve.at, valve.stem.y));
  for (let i = 0; i < lamps.count; i++)
    add(root, `pipe_lamp_${i}`, box(...lamps.size), lamp, polar(a, lamps.from + lamps.pitch * i, lamps.y), yaw);
  add(root, 'riser', cyl(riser.r, riser.r, riser.h, 8), steel, polar(a, riser.at, riser.y));
  add(root, 'platform', box(...platform.size), deck, polar(a, platform.at, platform.y), yaw);
  add(root, 'platform_flood', box(...platform.flood.size), flood, polar(a, platform.at, platform.flood.y), yaw);
  for (const [tag, sgn] of [
    ['a', -1],
    ['b', 1],
  ])
    add(
      root,
      `platform_leg_${tag}`,
      cyl(legs.r[0], legs.r[1], legs.h, 6),
      steel,
      polar(a, platform.at + sgn * legs.spread, legs.y)
    );
}

/**
 * The floods round the wellhead: `count` lamps on the manifold at radius `r`,
 * each turned to face out along its bearing — the ring of light the bake sees
 * first on a structure that is never quiet.
 */
export function wellheadFloods(root, flood, opts = {}) {
  const { count = 8, r = 22, y = 31.8, size = [5, 0.5, 3.2] } = opts;
  radialSeries({ count }, (a, i) =>
    add(root, `wellhead_flood_${i}`, box(...size), flood, polar(a, r, y), [0, -a, 0])
  );
}

/* --------------------------------------------------------------------------
 * The Slipway's faction-neutral skeleton (#652, off #540 Phase 3).
 *
 * The Vent Tap's case again, at the yard's scale. The four approved
 * Slipways are one template drawn four ways: the foundation slab, the slip
 * floor with its two line lights and seven crosses, five keel blocks, the
 * launch sill, three gantry frames and the head gate — 45 names common to
 * all four files, the trolleys, cables and worklights identical to the
 * digit, the rest the same skeleton at each navy's numbers — and then two
 * halls that are entirely the navy's. So the skeleton is built here, once,
 * taking the navy's materials the way `ventDrawArm` takes its own, and
 * taking the three parts of it that carry a navy's *shape* — the hull on
 * the blocks, a gantry's leg and the ornament on it, the head gate's pylon
 * — as builders the navy's module hands over (`sidedPost` is the shape a
 * post builder takes). A structure script contributes its halls and those
 * builders and nothing else.
 *
 * The numbers are the approved files' own and are the defaults, because
 * all four carry them unchanged; what differs between the files — the
 * Commune's wider beam, the Klaxon's deeper deck — is a parameter.
 *
 * PORT IS −Z HERE TOO (#642, `bothSides` above). The four approved exports
 * name their sides the other way — every `_p` in them sits at +z, the
 * kit's starboard — so the skeleton writes the +z part of each pair first,
 * as the files do, and names it `_s`; its −z twin follows as `_p`. No
 * buffer moves and nothing is mirrored: only the names turn, which is the
 * relabel the four Choristers and the eleven `bothSides` hulls had before
 * them (hulls/chorister-bathyarch.mjs). The trolleys are not a pair and
 * keep their file z.
 * ------------------------------------------------------------------------ */

/**
 * A builder for one side's post — a gantry leg, the ornament on it, a head
 * pylon: `<name>_<tag>`, a fresh `geo()` in `mat`, `y` up and `spread` out
 * on the side, leaned `lean` radians about X on the +z side and its mirror
 * on the −z one, `scale` on the node. The navy's module says what its post
 * is — a riveted column, a pyramid, a leaning claw, a grown stalk — and
 * returns one of these; the skeleton calls it with the side's tag and sign
 * and the frame's x. `geo` is a factory because every part of every
 * approved Slipway has a buffer of its own, and a geometry two meshes share
 * exports as one.
 */
export const sidedPost =
  ({ name, geo, mat, y, spread, lean = 0, scale = [1, 1, 1] }) =>
  (parent, { tag, sgn, x }) =>
    add(parent, `${name}_${tag}`, geo(), mat, [x, y, sgn * spread], [sgn * lean, 0, 0], scale);

/**
 * The bed: the foundation slab, the slip floor down the middle of it, the
 * line lights along both edges of the floor and the crosses across it, the
 * keel blocks, the navy's hull on them, and the launch sill at the mouth —
 * "the slip cut through its whole length and open at both ends, so a hull
 * is laid at the head gate, walked down the line under three gantries, and
 * launched out of the mouth ... a keel on blocks two thirds down the slip.
 * Dim at rest: the line lights along the slip floor, the gantry working
 * lights and the launch sill" (docs/asset-prompts-3d.md, STRUCTURE —
 * Slipway). The mouth is −x, the head gate +x.
 *
 * `slab` clads the foundation, `floor` the slip, `keel` the blocks; `line`
 * is the lit strip the two line lights, the crosses and the sill share.
 * `hull` is the navy's: called once, between the last keel block and the
 * sill, where all four files put the hull in progress and its deck — a box
 * in iron on the Klaxon's yard, a spar on the Order's, a squashed orb on
 * the Directorate's and the Commune's.
 *
 * The slab is a bevelled plan on eight corners — the rectangle with its
 * corners cut — 5 thick with a 2 chamfer, and carried as the approved
 * files carry it: the extrusion un-centred, its lower chamfer at −2 and
 * its top cap at +7 about a node that sits at −8, so the slab's top lies
 * a metre under the floor. The outline walks from the −x, +z corner as
 * the approved contour does, which is what lands its lids on the same
 * diagonals.
 *
 * The seven crosses are the rungs of the line, 46 m apart from −148: the
 * approved files ran them from −140, which put `line_cross_5` at x 90
 * under the middle of gantry 2's beam and trolley and `line_cross_3` at
 * −2 under gantry 1's, so the top-down bake never saw the one and saw a
 * sliver of the other (#890, after #645 carried the warning). The crosses
 * are the resting clause's "line lights along the slip floor", so they
 * stay lit and the rank slides 8 aft as one (drawn units: 7.9 m at three
 * yards' ×0.988 root scale, 7.5 m at the Directorate's ×0.938) — a rung
 * moved alone would break the pitch — to −148, −102, −56, −10, 36, 82 and
 * 128, each clear of
 * the beams at −90, 0 and 90 and of the trolleys 8 m wide on them
 * (docs/models-plan.md §3.2 rule 5). The keel blocks and the hull on them
 * still cover the middle of three rungs, as they did before.
 */
export function slipwayBed(root, { slab, floor, line, keel }, opts = {}) {
  const {
    foundation = {
      outline: [
        [-165, 88],
        [-170, 70],
        [-170, -70],
        [-165, -88],
        [165, -88],
        [170, -70],
        [170, 70],
        [165, 88],
      ],
      t: 5,
      bevel: 2,
      y: -8,
    },
    slip = { size: [340, 1.5, 46], y: -0.5 },
    lines = { size: [310, 0.4, 2.2], y: 0.5, z: 19 },
    crosses = { count: 7, from: -148, pitch: 46, size: [1.6, 0.4, 36], y: 0.5 },
    blocks = { count: 5, from: -70, pitch: 22, size: [6, 4, 14], y: 2 },
    hull,
    sill = { size: [4, 0.6, 42], at: [-160, 0.6, 0] },
  } = opts;
  const bed = plan(foundation.outline, foundation.t, foundation.bevel);
  bed.translate(0, foundation.t / 2, 0);
  add(root, 'foundation_slab', bed, slab, [0, foundation.y, 0]);
  add(root, 'slip_floor', box(...slip.size), floor, [0, slip.y, 0]);
  bothSides((tag, sgn) =>
    add(root, `line_light_${tag}`, box(...lines.size), line, [0, lines.y, sgn * lines.z])
  );
  for (let i = 0; i < crosses.count; i++)
    add(root, `line_cross_${i}`, box(...crosses.size), line, [
      crosses.from + crosses.pitch * i,
      crosses.y,
      0,
    ]);
  for (let i = 0; i < blocks.count; i++)
    add(root, `keel_block_${i}`, box(...blocks.size), keel, [
      blocks.from + blocks.pitch * i,
      blocks.y,
      0,
    ]);
  hull(root);
  add(root, 'launch_sill', box(...sill.size), line, sill.at);
}

/**
 * One gantry frame over the slip, `gantry_<index>`: the navy's leg and the
 * ornament on it a side (+z first, as the files write them), the beam
 * across, the trolley under it with its cable hanging to the hull, and the
 * worklight along the beam a metre beyond its +x face — "walked down the
 * line under three gantries ... the gantry working lights". The frame is a
 * group at the origin holding parts at their absolute x, which is how the
 * approved files carry all three (kit `group`).
 *
 * The three frames stand at x −90, 0 and 90 and the trolley sits 6 to
 * starboard on the outer two and 8 to port on the middle one, in all four
 * files, so `index` alone places a frame; `beam.size[0]` is where the
 * Commune's 7 m beam differs from the others' 5 m, and it moves the
 * worklight with it.
 */
export function slipwayGantry(root, { beam, trolley, cable, worklight }, opts) {
  const {
    index,
    x = [-90, 0, 90][index],
    leg,
    ornament,
    beam: beamBar = { size: [5, 4, 70], y: 44 },
    trolley: crab = { size: [8, 5, 8], y: 40, z: [6, -8, 6][index] },
    cable: fall = { r: 0.4, h: 24, y: 26 },
    worklight: light = { size: [3, 0.8, 62], y: 46.2, clear: 1 },
  } = opts;
  const g = group(root, `gantry_${index}`);
  bothSides((tag, sgn) => {
    leg(g, { tag, sgn, x });
    ornament(g, { tag, sgn, x });
  });
  add(g, 'gantry_beam', box(...beamBar.size), beam, [x, beamBar.y, 0]);
  add(g, 'gantry_trolley', box(...crab.size), trolley, [x, crab.y, crab.z]);
  add(g, 'gantry_cable', cyl(fall.r, fall.r, fall.h, 4), cable, [x, fall.y, crab.z]);
  add(g, 'gantry_worklight', box(...light.size), worklight, [
    x + beamBar.size[0] / 2 + light.clear,
    light.y,
    0,
  ]);
  return g;
}

/**
 * The head gate at the +x end of the slip, where "a hull is laid": the
 * navy's pylon a side (+z first, as the files write them) and the lintel
 * across the two in `lintel`. The lintel is the one box of the gate all
 * four files share to the digit; the pylon is the navy's post.
 */
export function slipwayHeadGate(root, lintel, opts) {
  const { x = 158, pylon, beam = { size: [10, 6, 80], y: 52 } } = opts;
  bothSides((tag, sgn) => pylon(root, { tag, sgn, x }));
  add(root, 'head_lintel', box(...beam.size), lintel, [x, beam.y, 0]);
}

/**
 * Where a hull script writes: docs/concept-art/models/ by default, or the
 * directory in `HULL_MODELS_OUT`, which is how check.mjs rebuilds every hull
 * without touching the committed files.
 */
export function outputPath(filename) {
  const dir = process.env.HULL_MODELS_OUT;
  if (dir) {
    mkdirSync(dir, { recursive: true });
    return join(dir, filename);
  }
  return fileURLToPath(new URL(`../../docs/concept-art/models/${filename}`, import.meta.url));
}

/** Write the GLB into docs/concept-art/models/ and report what it contains. */
export async function exportGlb(root, filename) {
  const out = outputPath(filename);
  const glb = await new GLTFExporter().parseAsync(root, { binary: true });
  writeFileSync(out, Buffer.from(glb));
  let tris = 0;
  let parts = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    parts++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  const b = bounds(root);
  const light = lightAudit(root);
  console.log(
    `${filename}: ${Buffer.from(glb).length} bytes, ${parts} parts, ${Math.round(tris)} tris\n` +
      `  bounds x ${b.x.join('..')}  y ${b.y.join('..')}  z ${b.z.join('..')}\n` +
      `  light: ${light.lit.length} lit parts, ${light.totalM2} m² facing up`
  );
  for (const name of light.hidden)
    console.warn(
      `  WARNING: ${name} shows under 0.25 m² from above — the maps are top-down, and gate 3 cannot see it`
    );
  for (const name of light.floating) {
    const { gap } = light.lit.find((l) => l.name === name);
    console.warn(`  WARNING: ${name} rests on nothing — ${gap} m from the nearest other part`);
  }
}

/* --------------------------------------------------------------------------
 * Z-long exports — the shared kinds' ports (#588, off #540 Phase 3).
 *
 * The four Light Scouts, and the Corvettes, Cruisers, Submersibles,
 * Harvesters and Choristers behind them, were hand-exported along Z rather
 * than X, at arbitrary scales (a 60 m hull drawn 5.3 to 28.2 units long),
 * off-centre, with every part's transform on its node and its primitive in
 * the node's own frame. Nothing downstream ever minded: the bake and the
 * runtime both yaw a Z-long file onto +X (x' = z, z' = -x: +π/2 about Y),
 * rescale it to the design length and centre it on its bounding box before
 * reading it (hull-intake's page.html, rosterModels.ts). A port does those
 * three things once, in the script, so that the file it writes is metre-true
 * and bow-on-X like every other script's — and so that `lightAudit` measures
 * its lamps in square metres rather than in the square of a unit nobody
 * chose (#588: every lamp on all four scouts sat under the audit's floor).
 *
 * The rule a port follows is `drawn`: every number stays the export's own —
 * the primitive as its buffer holds it, the node's translation, XYZ Euler
 * and scale as the file carries them — and one function turns the lot onto
 * +X. A part written that way audits line by line against the file, which
 * is what a port is for; the shape decisions are the export's, not the
 * script's.
 * ------------------------------------------------------------------------ */

/** The one yaw: the export's +Z, its bow, onto the kit's +X. */
const YAW_Z_TO_X = Math.PI / 2;
const yawedOnce = new WeakSet();

/**
 * A primitive as a Z-long export built it, turned onto +X — in place, so
 * its facets land exactly where the export's did, and once, however many
 * parts share the geometry (the Klaxon scout's twelve rivets are one box).
 * A cylinder's first vertex, a torus's seam and a tube's Frenet frames all
 * depend on which way the primitive was born; rebuilt X-long they move,
 * and a bounds check would never know.
 */
export function yawed(geo) {
  if (!yawedOnce.has(geo)) {
    geo.rotateY(YAW_Z_TO_X);
    yawedOnce.add(geo);
  }
  return geo;
}

/**
 * A node transform as a Z-long export carries it, in the kit's frame. The
 * export's (x, y, z) lands on (z, y, -x), and so do its three scale axes;
 * its XYZ Euler (a, b, c) becomes the ZYX Euler (c, b, -a): roll and yaw
 * survive the turn, pitch changes sign, and the order follows the axes
 * round. So a part the export drew at its +x — every `_p` on all four
 * scouts — lands on the kit's -z, because that is where the file has it and
 * a port reproduces the file, not the name; and -z is port (`bothSides`
 * above, #642), so on a shared-kind export the name and the side agree.
 */
export function drawn(t = [0, 0, 0], e = [0, 0, 0], s = [1, 1, 1]) {
  return {
    at: [t[2], t[1], -t[0]],
    rot: [e[2], e[1], -e[0], 'ZYX'],
    scale: [s[2], s[1], s[0]],
  };
}

/**
 * A part as the export built and placed it: `geo` in the export's own
 * frame, the placement from `drawn`. The builders the shared kinds compose
 * from all end here.
 */
export function part(root, name, geo, mat, placement = {}) {
  const { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = placement;
  return add(root, name, yawed(geo), mat, at, rot, scale);
}

/**
 * A point light, as the r184 shared-kind exports carry them beside their
 * lamps (`KHR_lights_punctual`): two on the Commune's Corvette and
 * Harvester, three on its Cruiser, two named a side on both Submersibles.
 * No mesh, so nothing any gate reads — the bake renders every pass unlit,
 * and `readGlb`, `lightAudit` and `check.mjs` read meshes — but a loader
 * instantiates one and the conn view loads the file with it, so a port
 * writes the file's back at its own colour, intensity and range and chooses
 * none. r169's exporter writes a `PointLight` exactly as r184 wrote these;
 * `at` is in the kit's frame, as `drawn` gives it.
 */
export function pointLight(root, { name, color, intensity, range, at }) {
  const light = new THREE.PointLight(new THREE.Color(...color), intensity, range);
  if (name) light.name = name;
  light.position.set(...at);
  root.add(light);
  return light;
}

/**
 * Metre-true and centred, once the parts are in. The built length along X
 * is measured and checked against the `drawn` figure the script's header
 * states — a mistyped station would pass every other gate and fail this one
 * — then the root is scaled to `lengthM`, the length is centred on x = 0,
 * and `datum`, the height the export drew its hull axis at, is brought to
 * y = 0. Returns the scale, for the record.
 *
 * The length is measured as intake and the runtime measure it — three's
 * `Box3.setFromObject`, the axis-aligned boxes of the parts, which a
 * rotated plate's box overhangs (the Commune scout's raked tail flukes add
 * 1.4 % to its length that way) — and not off the vertices, which `bounds`
 * above also does not do. That measure is homogeneous and a yaw does not
 * change it, so the bake and the conn view normalise the approved export and
 * the port to the same size whatever scale the file carries; scaling to it
 * here is what makes their own rescale exactly 1, and leaves the maps and
 * the sprite where the approved export put them. `outlines.mjs` and
 * `diff.mjs` measure vertices and normalise, and see no difference either
 * way.
 */
export function metreTrue(root, lengthM, { drawn: expected, datum = 0, tolerance = 1e-3 } = {}) {
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root);
  const length = bb.max.x - bb.min.x;
  if (Math.abs(length - expected) > tolerance)
    throw new Error(
      `${root.name}: drawn ${length.toFixed(4)} units long; the header says ${expected}`
    );
  const k = lengthM / length;
  root.scale.setScalar(k);
  root.position.set((-k * (bb.max.x + bb.min.x)) / 2, -k * datum, 0);
  return k;
}

/* --------------------------------------------------------------------------
 * The Sentinel Turrets' restoration (#639, off #540) — three things the four
 * approved turret exports use that nothing above provides. The exports are
 * one Claude Design template drawn four ways, along Z at about a thirteenth
 * of a metre to the unit, with a `turret_head` frame trained off the mound
 * and a `barrel_group` frame pitched and yawed off the head, and every part
 * placed by its node inside whichever frame it belongs to.
 * ------------------------------------------------------------------------ */

/**
 * A named frame inside a model, placed as `part` places a mesh, for the
 * export's group nodes. `drawn` conjugates one node's transform by the one
 * yaw, and conjugation composes — Y·(A·B)·Y⁻¹ = (Y·A·Y⁻¹)·(Y·B·Y⁻¹) — so a
 * frame placed through `drawn` holding parts placed through `drawn`, with the
 * geometry turned once by `part`, lands every vertex where the export's
 * nested nodes put it. The exporter writes the frame back out as a node of
 * the same name, which is where the approved files have it.
 */
export function group(parent, name, placement = {}) {
  const { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = placement;
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...at);
  g.rotation.set(...rot);
  g.scale.set(...scale);
  parent.add(g);
  return g;
}

/**
 * An Euler the export wrote in another `order`, as the XYZ triple `drawn`
 * takes. The turrets' barrel frames are `(0.9, 0.35, 0)` in YXZ — a 0.35 yaw
 * and then 0.9 of pitch about the frame's own beam — and their cowls and
 * brows `(0, −π/2, −0.12)` in the same order; read as XYZ the same rotations
 * are three numbers nobody chose.
 */
export function eulerXYZ(e, order) {
  const r = new THREE.Euler(e[0], e[1], e[2], order).reorder('XYZ');
  return [r.x, r.y, r.z];
}

/**
 * A capsule as three r184 lays one out, which is what the four turrets' ammo
 * pods and the Commune's root grips are. r169's `CapsuleGeometry` is a lathe
 * of `Path.getPoints` and puts its rings elsewhere, so it cannot reproduce
 * the buffers; this does, ring for ring and cut for cut: `capSegments` rings
 * up each hemisphere from the bottom pole, `heightSegments` up the side,
 * `radialSegments` round, every quad cut `(i1, i2, i3), (i2, i4, i3)`, and
 * the pole rows kept as rows — so the two fans at the poles are degenerate
 * triangles rather than absent ones, and the count is 2·radial·(2·cap +
 * height), not less. Normals are the analytic ones, as r184 writes them.
 */
export function capsule(radius, length, capSegments = 4, radialSegments = 8, heightSegments = 1) {
  const half = length / 2;
  const rows = capSegments * 2 + heightSegments;
  const perRow = radialSegments + 1;
  const capArc = (Math.PI / 2) * radius;
  const total = 2 * capArc + length;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let iy = 0; iy <= rows; iy++) {
    let y, rho, ny, nr, arc;
    if (iy <= capSegments) {
      const p = iy / capSegments;
      const a = p * (Math.PI / 2);
      y = -half - radius * Math.cos(a);
      rho = radius * Math.sin(a);
      ny = -Math.cos(a);
      nr = Math.sin(a);
      arc = p * capArc;
    } else if (iy <= capSegments + heightSegments) {
      const p = (iy - capSegments) / heightSegments;
      y = -half + p * length;
      rho = radius;
      ny = 0;
      nr = 1;
      arc = capArc + p * length;
    } else {
      const p = (iy - capSegments - heightSegments) / capSegments;
      const a = p * (Math.PI / 2);
      y = half + radius * Math.sin(a);
      rho = radius * Math.cos(a);
      ny = Math.sin(a);
      nr = Math.cos(a);
      arc = capArc + length + p * capArc;
    }
    const v = arc / total;
    const uOffset = iy === 0 ? 0.5 / radialSegments : iy === rows ? -0.5 / radialSegments : 0;
    for (let ix = 0; ix <= radialSegments; ix++) {
      const u = ix / radialSegments;
      const theta = u * Math.PI * 2;
      const s = Math.sin(theta);
      const c = Math.cos(theta);
      positions.push(-rho * c, y, rho * s);
      normals.push(-nr * c, ny, nr * s);
      uvs.push(u + uOffset, v);
    }
    if (iy > 0) {
      const prev = (iy - 1) * perRow;
      for (let ix = 0; ix < radialSegments; ix++) {
        const i1 = prev + ix;
        const i2 = prev + ix + 1;
        const i3 = iy * perRow + ix;
        const i4 = iy * perRow + ix + 1;
        indices.push(i1, i2, i3, i2, i4, i3);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geo;
}

/* --------------------------------------------------------------------------
 * The Foundry's and the Refinery's shared vocabulary (#652, off #540 Phase 3).
 *
 * The Vent Tap's skeleton above is identical to the centimetre across its
 * four files. The Foundry's and the Refinery's are not: across the
 * Directorate, the Knights and the Commune the Foundry's `bay_floor`,
 * `forge_line`, `hull_in_progress`, two bay lips with their guide lights and
 * two `gantry_crane_N` frames carry the same names in the same order and
 * differ in their numbers — the Order's crane is its own in every dimension
 * and not by one factor, the trolley sits at a different station on every
 * crane, the lips are `_starboard`/`_port` on two files and `_r`/`_l` on the
 * third, the Commune's cranes have no finials and the lip the Directorate's
 * file calls port (its −x lip; starboard once #642 turns the name) is short
 * one guide. The Refinery's `conveyor_gantry` (bed, belt, nodules,
 * rails, gantry lights, legs), crusher house, cowl and maw, exhaust stacks,
 * intake hopper and mouth, transfer pipes and flanges and flood masts are
 * the same story, with the Knights' file carrying two gantries named `_r`
 * and `_l` and its pairs written kind by kind (`exhaust_stack_r`,
 * `exhaust_stack_l`, `exhaust_tip_r` …) where the other two write each unit
 * whole. So each builder here takes every number as a parameter with the
 * Directorate file's as the default, every name as a parameter too, and the
 * file's order (`order`) and buffer sharing (`share`) where the files differ
 * in those. A navy's script passes what its file carries; what a file
 * carries that no parameter reaches is a finding, not a kit edit. The
 * Consortium's Foundry and Refinery are from the earlier authoring pass and
 * share none of this; they build from `factions/bathyarch.mjs` alone.
 *
 * Two things every builder takes that the Vent Tap's did not:
 *
 * - **A frame.** All three Foundries are Z-long exports and all three
 *   Refineries X-long (hull-intake's `rotatedZtoX` on the approved files),
 *   and a builder places the export's own numbers either way: `zLong`
 *   through `drawn` and `part`, one yaw and the geometry turned with it;
 *   `xLong` through `add`, no yaw. Every placement a builder takes — `at`,
 *   `rot`, `scale` — is in the export's own frame, as `anchoredRaft` in
 *   factions/bathyarch.mjs takes its raft's; the frame decides what is done
 *   with it. The Foundry builders default to `zLong`, the Refinery's to
 *   `xLong`, and `flangedPipes`, which both use, to `zLong`.
 * - **The lip's own material.** The materials are the navy's, as the Vent
 *   Tap's are; a Foundry's bay lips wear its floor's cladding on all three
 *   files, so `lip` defaults to `floor`.
 *
 * Three more things are here that #652's analysis had down as the
 * Directorate's own: the launch mouth and glow, the ballast tanks and the
 * graft pipes are the Directorate's and the Commune's at identical numbers,
 * and the tanks and pipes the Order's under other names (`ballast_tank_r`,
 * `standpipe_r`) at its own — a vocabulary shared by name, parameterised
 * the same way. The Order's gate is not the launch mouth under another
 * name: five parts of four primitives where this is a torus and a drum, so
 * it has no twin and lives in `factions/hadron.mjs` (`launchGate`). What
 * has no twin in any other file either — the Directorate's
 * mandibles, flank photophores, anchor claws, tergite flanks, outrigger pods
 * and stern carapace, and its Refinery's silos, maw teeth and intake teeth
 * (the Commune's `silo_cap_0..3` is a name twin over a grown dome, not a
 * cone) — lives in `factions/directorate.mjs`.
 * ------------------------------------------------------------------------ */

/**
 * A Z-long export's frame: the export's own `(t, e, s)` placed through
 * `drawn` and `part`, and a frame node through `group`. `place` takes a
 * placement already made by `drawn`, for the module builders that were
 * written against one (`photophoreDomes`).
 */
export const zLong = {
  part: (root, name, geo, mat, t, e, s) => part(root, name, geo, mat, drawn(t, e, s)),
  place: part,
  group: (parent, name, t, e, s) => group(parent, name, drawn(t, e, s)),
};

/**
 * An X-long export's frame: the export's own `(t, e, s)` placed as they
 * are, no yaw and the geometry as built — the Choristers' and the Vent
 * Taps' way, `add` with the file's own translation, rotation and scale.
 */
export const xLong = {
  part: (root, name, geo, mat, t = [0, 0, 0], e = [0, 0, 0], s = [1, 1, 1]) =>
    add(root, name, geo, mat, t, e, s),
  place: (root, name, geo, mat, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) =>
    add(root, name, geo, mat, at, rot, scale),
  group: (parent, name, t = [0, 0, 0], e = [0, 0, 0], s = [1, 1, 1]) =>
    group(parent, name, { at: t, rot: e, scale: s }),
};

/**
 * Parts of several kinds over several units, in the file's order: each
 * unit's parts together (`'each'` — `exhaust_stack_0`, `exhaust_tip_0`,
 * `exhaust_stack_1` …, the Directorate's and the Commune's way), or every
 * unit's part of one kind before the next kind's (`'kind'` —
 * `exhaust_stack_r`, `exhaust_stack_l`, `exhaust_tip_r` …, the Order's).
 * `check.mjs` compares in order, so this is part of what a model is.
 */
function inOrder(order, units, kinds) {
  if (order === 'kind') kinds.forEach((kind) => units.forEach((u, i) => kind(u, i)));
  else units.forEach((u, i) => kinds.forEach((kind) => kind(u, i)));
}

/**
 * One geometry a part, or one a kind: a builder drawing the same primitive
 * for several parts makes it afresh for each unless `share`, when every
 * part of that kind takes the first one's buffer — which is how the Order's
 * exports carry a pair (`exhaust_stack_l` on `exhaust_stack_r`'s buffer,
 * `parts.mjs` says "buffer of") and the Directorate's and the Commune's do
 * not. No gate reads the difference; a port reproduces it anyway.
 */
function sharer(share) {
  const cache = new Map();
  return (key, make) => {
    if (!share) return make();
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
}

/**
 * The Foundry's bay: "a recessed launch bay" (docs/asset-prompts-3d.md,
 * STRUCTURE — Foundry) — the floor, the forge line lit along it, the hull
 * in progress lying on it, a lip either side, and a rank of guide lights
 * either side of the forge line, inboard of the lips (on the lips' tops
 * until #890). In the files' order: floor, forge line, hull, then each
 * side's lip and its guides.
 *
 * `hull.geo` is the navy's — a capsule on the Directorate's and the
 * Commune's files (the default), an octahedron on the Order's — placed by
 * `hull.at`, `hull.rot` and `hull.scale`. A side is `{ lip, guides, sgn }`:
 * `bay_lip_${lip}` at `sgn · lip.x`, and `bay_guide_${guides}_${i}` for each
 * `i` of `guide.count` — or of `only`, for a rank with a hole in it: the
 * Directorate's file has no `bay_guide_1_2`. The default sides are the
 * export's +x first, as every file writes it, named as a port of a Z-long
 * export names it (#642): the export's +x lands on the kit's −z, which is
 * port, so the lip the Directorate's and the Commune's files call
 * `bay_lip_starboard` is written `bay_lip_port` and the guides keep their
 * `0`; the Order's file says `_r` and `_l` and a port carries those.
 *
 * The guides stand at `sgn · guide.x` — their own station, not the lip's,
 * since #890 — either side of the forge line, inboard of each lip, at
 * `guide.y` over the floor, from `guide.from` at `guide.pitch`. The
 * approved Directorate and Commune files set them on the lips' tops at
 * x ±1.75, z −5 to 5, where ten of the nineteen — five on each file — were
 * never seen from above: the flank plates and lobes lean in over both
 * lips (to x 0.72–1.24 on the +x side), the two crane beams cross the bay
 * at z −2.6 and 2.9, and the stern carapace and pod roof the bay's aft
 * 1.5. The guides are carried lit as every approved Foundry lights them —
 * the block's "Dim at rest" names no lamp, so it licenses neither them nor
 * the forge line, and naming the Foundry's resting lamps is follow-up
 * #893 (#890, review rulings, rulings 2 and 3) — and a lit fixture the
 * bake cannot see moves (docs/models-plan.md §3.2 rule 5): to x ±0.75, the
 * one column clear of the plates and the lobes' skirts on both files. The
 * hull in progress, whose plan reaches x 0.69, still covers 38 % of the
 * port rank's third guide on the Directorate's file and 37 % on the
 * Commune's (4.94 and 5.25 m² against 6.8 to 8.2 for their siblings). The
 * floor's own edges at ±1.7 are under the plates; at ±0.75 the
 * port rank overlaps the forge line's edge by 0.05 (0.9 m), the line
 * running 0.15 off centre, and the starboard rank clears it by 0.25. The
 * stations z −4.1, −1.6, 0.9, 3.4 and 5.9 are the same pitch slid 0.9
 * forward so none falls under a beam, under the Commune's second lobe's
 * skirt at z 2, or under its fourth's at 5. A file that sets `guide`
 * without `x` keeps its guides on its lips; the Order's passes `x` at the
 * same station.
 */
export function foundryBay(root, mats, opts = {}) {
  const {
    frame = zLong,
    floor = { size: [3.4, 0.4, 12], at: [0, 0.35, 0] },
    forge = { size: [1.1, 0.18, 10.6], at: [0.15, 0.58, 0.4] },
    hull = { geo: capsule(0.65, 2.2, 3, 7), at: [0.1, 1.15, 2.1], rot: [Math.PI / 2, 0, 0.06] },
    lip = { size: [0.5, 1.5, 12.2], x: 1.75, y: 0.9 },
    guide = { r: 0.1, facets: [5, 4], x: 0.75, y: 0.62, from: -4.1, pitch: 2.5, count: 5 },
    sides = [
      { lip: 'port', guides: '0', sgn: 1 },
      { lip: 'starboard', guides: '1', sgn: -1 },
    ],
  } = opts;
  const { floor: floorMat, forge: forgeMat, hull: hullMat, guide: guideMat } = mats;
  const lipMat = mats.lip ?? floorMat;
  frame.part(root, 'bay_floor', box(...floor.size), floorMat, floor.at);
  frame.part(root, 'forge_line', box(...forge.size), forgeMat, forge.at);
  frame.part(root, 'hull_in_progress', hull.geo, hullMat, hull.at, hull.rot, hull.scale);
  for (const side of sides) {
    const x = side.sgn * lip.x;
    frame.part(root, `bay_lip_${side.lip}`, box(...lip.size), lipMat, [x, lip.y, 0]);
    const gx = side.sgn * (guide.x ?? lip.x);
    const rank = side.only ?? Array.from({ length: guide.count }, (_, i) => i);
    for (const i of rank)
      frame.part(
        root,
        `bay_guide_${side.guides}_${i}`,
        new THREE.SphereGeometry(guide.r, ...guide.facets),
        guideMat,
        [gx, guide.y, guide.from + guide.pitch * i]
      );
  }
}

/**
 * One gantry crane over the bay — "gantry cranes" (the Foundry block) — as
 * a frame of its own, `gantry_crane_${n}`, standing at `at`: two legs, the
 * beam across them, a finial at each end of it, the trolley on the beam,
 * the cable down from it, the load on the cable and the warning light on
 * the beam's crown, in that order, the files' own.
 *
 * The cable is drawn by the rule all three files follow: from `cable.hang`
 * above the load's station to the trolley's — half the Directorate's box of
 * a load, and the Order keeps the same 0.2 under its crystal. `finials`
 * null is a crane without them (the Commune's). `load.geo` is the navy's,
 * as the bay's hull is — a box by default, the Order's an octahedron
 * squashed by `load.scale`. The trolley's `x` is each crane's own on every
 * file but the Order's, whose two sit on the centreline.
 */
export function gantryCrane(root, mats, opts) {
  const {
    n,
    at,
    frame = zLong,
    legs = { x: 2.6, y: 2.8, size: [0.35, 5.6, 0.35] },
    beam = { y: 5.75, size: [6, 0.45, 0.6] },
    finials = { x: 3, y: 6.4, r: 0.12, h: 0.9, facets: 4 },
    trolley = { x: 0, y: 5.3, size: [0.8, 0.5, 0.7] },
    cable = { r: 0.05, facets: 5, hang: 0.2 },
    load = { y: 2.5, size: [0.55, 0.4, 0.5] },
    warnlight = { y: 6.08, r: 0.09, facets: [5, 4] },
  } = opts;
  const crane = frame.group(root, `gantry_crane_${n}`, at);
  for (const [i, sgn] of [
    [0, 1],
    [1, -1],
  ])
    frame.part(crane, `gantry_leg_${n}_${i}`, box(...legs.size), mats.steel, [
      sgn * legs.x,
      legs.y,
      0,
    ]);
  frame.part(crane, `gantry_beam_${n}`, box(...beam.size), mats.steel, [0, beam.y, 0]);
  if (finials)
    for (const [i, sgn] of [
      [0, 1],
      [1, -1],
    ])
      frame.part(
        crane,
        `gantry_finial_${n}_${i}`,
        cyl(0, finials.r, finials.h, finials.facets),
        mats.finial,
        [sgn * finials.x, finials.y, 0]
      );
  const x = trolley.x ?? 0;
  frame.part(crane, `gantry_trolley_${n}`, box(...trolley.size), mats.trolley, [x, trolley.y, 0]);
  const top = load.y + cable.hang;
  frame.part(
    crane,
    `gantry_cable_${n}`,
    cyl(cable.r, cable.r, trolley.y - top, cable.facets),
    mats.cable,
    [x, (trolley.y + top) / 2, 0]
  );
  frame.part(
    crane,
    `gantry_load_${n}`,
    load.geo ?? box(...load.size),
    mats.load,
    [x, load.y, 0],
    [0, 0, 0],
    load.scale
  );
  frame.part(
    crane,
    `gantry_warnlight_${n}`,
    new THREE.SphereGeometry(warnlight.r, ...warnlight.facets),
    mats.warnlight,
    [0, warnlight.y, 0]
  );
  return crane;
}

/**
 * The launch mouth at the bay's open end: a torus for the mouth, squashed
 * by its node, and the glow drum lying in it, a thin drum clad at rest
 * (below) — "interior forge light spilling from the bay when producing"
 * (the Foundry block). The Directorate's and the Commune's files carry it
 * at one set of numbers, the defaults; the Order's gate is its own.
 *
 * The glow drum is the light "spilling from the bay when producing": the
 * block names it in that band and nowhere at rest, so `glow` is the
 * navy's rule-2 finish (asset-prompts-3d.md Block 2b: `biolight_unlit`,
 * `bio_vein_unlit`) and the drum is clad, not lit (docs/models-plan.md
 * §3.2 rule 2; #890). Neither navy records an unlit finish for the forge
 * family, so the drum wears another lamp family's — a #891 question, noted
 * in both files' headers. It lies under the mouth's ring, where the
 * approved files put it and where the top-down bake never saw it lit; a
 * clad part under a ring is nothing the audit reads. The forge line inside
 * the bay (`foundryBay`) is not read the same way: it is carried lit as
 * every approved Foundry lights it (#890, review rulings, rulings 2 and
 * 3: the block's "Dim at rest" names no lamp, and naming the Foundry's
 * resting lamps is follow-up #893). Both files that call this pass the
 * same role, so the one decision holds for both.
 */
export function launchMouth(root, { mouth: mouthMat, glow: glowMat }, opts = {}) {
  const {
    frame = zLong,
    mouth = { R: 1.7, tube: 0.3, facets: [5, 10], at: [0.1, 1.5, 6.7], scale: [1.15, 0.8, 1] },
    glow = { r: 1.35, h: 0.2, facets: 9, at: [0.1, 1.45, 6.62], rot: [Math.PI / 2, 0, 0] },
  } = opts;
  const ring = torus(mouth.R, mouth.tube, ...mouth.facets);
  frame.part(root, 'launch_mouth', ring, mouthMat, mouth.at, [0, 0, 0], mouth.scale);
  const drum = cyl(glow.r, glow.r, glow.h, glow.facets);
  frame.part(root, 'launch_glow', drum, glowMat, glow.at, glow.rot);
}

/**
 * Ballast tanks along a flank: capsules (r184's, kit `capsule`) laid on
 * their sides by their nodes, `ballast_tank_${n}` each. Two on every file:
 * `_0` and `_1` leaning 0.15 on the Directorate's and the Commune's, `_r`
 * and `_l` square on the Order's, on one buffer (`share`).
 */
export function ballastTanks(root, steel, opts = {}) {
  const {
    frame = zLong,
    r = 0.7,
    length = 1.8,
    facets = [3, 8],
    share = false,
    tanks = [
      { n: '0', at: [-6.3, 1, -2.4], rot: [Math.PI / 2, 0, 0.15] },
      { n: '1', at: [-6.7, 1, 0.4], rot: [Math.PI / 2, 0, 0.15] },
    ],
  } = opts;
  const geo = sharer(share);
  for (const t of tanks) {
    const tank = geo('tank', () => capsule(r, length, ...facets));
    frame.part(root, `ballast_tank_${t.n}`, tank, steel, t.at, t.rot);
  }
}

/**
 * Pipes with a flange each: a seven-sided pipe of `pipe.radii` [top,
 * bottom] leaned by its node, and a torus of `flange.R` and `flange.tube`
 * in `flange.facets` [radial, tubular] where it meets the hull, at its own
 * `at` (the Foundry's graft pipes) or the pipe's (the Refinery's transfer
 * pipes, whose flange sits on the pipe's station turned its own way).
 * Named `${stems.pipe}_${n}` and `${stems.flange}_${n}` — `graft_pipe_0`
 * and `graft_flange_0`, `transfer_pipe_0` and `transfer_flange_0`,
 * `standpipe_r` and `standpipe_flange_r` — in `order` (`inOrder` above:
 * pipe, flange, pipe, flange on two files; pipes then flanges on the
 * Order's) and on one buffer a kind when `share`. Defaults are the
 * Directorate Foundry's graft pipes; its Refinery passes `xLong` with its
 * own radii and stems.
 */
export function flangedPipes(root, { pipe: pipeMat, flange: flangeMat }, opts = {}) {
  const {
    frame = zLong,
    stems = { pipe: 'graft_pipe', flange: 'graft_flange' },
    pipe = { radii: [0.16, 0.2], facets: 7 },
    flange = { R: 0.22, tube: 0.06, facets: [5, 10] },
    order = 'each',
    share = false,
    pipes = [
      {
        n: '0',
        length: 2.6,
        at: [-5.4, 1.7, -1.2],
        rot: [0.1, 0, -0.5],
        flange: { at: [-5.7, 2.35, -1.2], rot: [Math.PI / 2 + 0.1, 0, -0.5] },
      },
      {
        n: '1',
        length: 2.1,
        at: [-5, 1.45, 1.6],
        rot: [0.1, 0, -0.65],
        flange: { at: [-5.3, 1.975, 1.6], rot: [Math.PI / 2 + 0.1, 0, -0.65] },
      },
    ],
  } = opts;
  const geo = sharer(share);
  inOrder(order, pipes, [
    (p) =>
      frame.part(
        root,
        `${stems.pipe}_${p.n}`,
        geo(`pipe_${p.length}`, () => cyl(pipe.radii[0], pipe.radii[1], p.length, pipe.facets)),
        pipeMat,
        p.at,
        p.rot
      ),
    (p) =>
      frame.part(
        root,
        `${stems.flange}_${p.n}`,
        geo('flange', () => torus(flange.R, flange.tube, ...flange.facets)),
        flangeMat,
        p.flange.at ?? p.at,
        p.flange.rot
      ),
  ]);
}

/**
 * The crusher: "crusher machinery" (docs/asset-prompts-3d.md, STRUCTURE —
 * Nodule Refinery) — the house, a box turned on its station; the cowl over
 * it; and the maw, the crusher's lit slab. The cowl is the navy's: on the
 * Directorate's file a shell of a sphere half a turn round and 0.55 of a
 * half-turn deep, squashed by its node (the default, `cowl.geo`); on the
 * Order's and the Commune's a half drum, the Commune's named
 * `crusher_roof` (`cowl.name`).
 *
 * THE MAW. The three approved exports stood the lit slab on the house's
 * face — edge-on to a top-down bake and on two of them under the cowl's
 * rim, 0 m² for the "visible machinery light" the block lights at rest —
 * and #890 answered on two files: a floodlit apron on the ground at the
 * face's foot on the Directorate's, a strip set into the cowl's ridge on
 * the Order's, while the Commune's kept the face slab, a 0.63 m² dot past
 * its roof. #894 found three fixtures under one name and made the crown
 * strip the drum cowls' one fixture: on the Order's and the Commune's the
 * slab lies level along the ridge, flush with the cowl's end over the
 * face, its underside a little under the ridge and its top a hair proud,
 * so the crown passes through it and the whole slab shows from above.
 * That is `maw.at` and `maw.rot`, each file's own; the default is the
 * Commune's, on its `crusher_roof`. The Directorate's keeps its apron:
 * on a Directorate model a lit slab on the outside of the cowl is the
 * plate wearing a mouth's name that docs/style-neon-noir.md refuses ("a
 * maw is not livery"), and the apron is the reading the Refinery block's
 * "floodlit working surfaces" licenses — so its maw stays its own fixture
 * until the owner decides whether it becomes an aperture (#907).
 *
 * The teeth are the navy's (directorate.mjs `mawTeeth`, hadron.mjs
 * `mawBlades`) and hang where the exports hung them.
 */
export function crusher(root, mats, opts = {}) {
  const {
    frame = xLong,
    house = { size: [4.6, 3.4, 3.6], at: [5.2, 1.7, -2.2], rot: [0, -0.25, 0] },
    cowl = {
      geo: new THREE.SphereGeometry(2.9, 9, 5, 0, Math.PI, 0, Math.PI * 0.55),
      at: [5.2, 3.1, -2.2],
      rot: [0, Math.PI / 2 - 0.25, 0],
      scale: [1.05, 0.75, 0.85],
    },
    // The Commune's: 1.5 of a unit along the house's own axis from its
    // centre, so the slab ends flush with the roof's forward end.
    maw = {
      size: [1.7, 0.3, 1.3],
      at: [5.2 + 1.5 * Math.cos(0.25), 5.13, -2.2 + 1.5 * Math.sin(0.25)],
      rot: [0, -0.25, 0],
    },
  } = opts;
  frame.part(root, 'crusher_house', box(...house.size), mats.house, house.at, house.rot);
  frame.part(root, cowl.name ?? 'crusher_cowl', cowl.geo, mats.cowl, cowl.at, cowl.rot, cowl.scale);
  frame.part(root, 'crusher_maw', box(...maw.size), mats.maw, maw.at, maw.rot);
}

/**
 * Exhaust stacks off the crusher: a seven-sided frustum each, leaned by its
 * node, with a lit tip drum on it — `exhaust_stack_${n}` and
 * `exhaust_tip_${n}`, in `order` and on one buffer a kind when `share`.
 * The tips sit 0.13 down-lean of their stacks on the Directorate's and the
 * Commune's files, which is the file's rounding of 1.6 · sin 0.08 and is
 * carried as the file has it.
 */
export function exhaustStacks(root, { steel, glow }, opts = {}) {
  const {
    frame = xLong,
    stack = { radii: [0.3, 0.38], h: 3.2, facets: 7 },
    tip = { radii: [0.34, 0.3], h: 0.25, facets: 7 },
    order = 'each',
    share = false,
    stacks = [
      { n: '0', at: [4.4, 4.6, -3.2], rot: [-0.08, 0, 0], tip: { at: [4.4, 6.2, -3.33] } },
      { n: '1', at: [5.9, 4.6, -3.5], rot: [-0.08, 0, 0], tip: { at: [5.9, 6.2, -3.63] } },
    ],
  } = opts;
  const geo = sharer(share);
  inOrder(order, stacks, [
    (s) =>
      frame.part(
        root,
        `exhaust_stack_${s.n}`,
        geo('stack', () => cyl(stack.radii[0], stack.radii[1], stack.h, stack.facets)),
        steel,
        s.at,
        s.rot
      ),
    (s) =>
      frame.part(
        root,
        `exhaust_tip_${s.n}`,
        geo('tip', () => cyl(tip.radii[0], tip.radii[1], tip.h, tip.facets)),
        glow,
        s.tip.at,
        s.tip.rot
      ),
  ]);
}

/**
 * The conveyor gantry: "conveyor ... machinery" — a frame of its own,
 * `conveyor_gantry`, turned to run from the intake hopper up to the crusher, holding
 * the bed, the belt on it, the nodules riding the belt (dodecahedra, each
 * its own radius and tumble, in the navy's skins — `nodules` is the file's
 * list), the rails along the bed's edges with the gantry lights on them,
 * and the legs under it. In the files' order: bed, belt, nodules, then each
 * rail followed by its row of lights if it carries one (`sides`: the
 * Directorate's and the Commune's `conveyor_rail_r` carries row `0` and
 * `_l` row `1`; the Order's two rails carry no lights and its one row, on
 * the centreline, follows the second), then the legs.
 *
 * The frame's rotation is a YXZ Euler on all three files — 0.72π of yaw and
 * 0.34 of roll on the Directorate's and the Commune's, ±0.3π and 0.3 on
 * the Order's — given here as the XYZ triple `eulerXYZ` makes of it. A leg
 * is `{ n, x, y, h }` with its `y` its own: the Directorate's two longer
 * legs stand 0.025 and 0.05 off centred on their height, and the file has
 * them so. `suffix` names the frame, the bed and the belt (`_r` on the
 * Order's `conveyor_gantry_r`, `conveyor_bed_r`, `conveyor_belt_r`); the
 * rails, lights and legs carry their own names and stems. Returns the
 * frame.
 */
export function conveyorGantry(root, mats, opts = {}) {
  const {
    frame = xLong,
    suffix = '',
    at = [10.2, 2.1, 4.6],
    rot = eulerXYZ([0, Math.PI * 0.72, 0.34], 'YXZ'),
    bed = { size: [9.5, 0.35, 1.7], at: [0, 0, 0] },
    belt = { size: [9.12, 0.12, 1.15], at: [0, 0.24, 0] },
    nodules = [],
    rails = {
      size: [9.5, 0.16, 0.16],
      y: 0.55,
      sides: [
        { name: 'conveyor_rail_r', z: 0.85, lights: { row: '0', z: 0.85 } },
        { name: 'conveyor_rail_l', z: -0.85, lights: { row: '1', z: -0.85 } },
      ],
    },
    lights = { r: 0.09, facets: [5, 4], y: 0.72, xs: [-3.25, -0.95, 1.35, 3.65] },
    legs = {
      radii: [0.14, 0.18],
      facets: 6,
      stem: 'gantry_leg',
      legs: [
        { n: '0', x: -3.15, y: -1.1, h: 2.2 },
        { n: '1', x: -0.05, y: -1.65, h: 3.35 },
        { n: '2', x: 3.05, y: -2.2, h: 4.5 },
      ],
    },
  } = opts;
  const gantry = frame.group(root, `conveyor_gantry${suffix}`, at, rot);
  frame.part(gantry, `conveyor_bed${suffix}`, box(...bed.size), mats.bed, bed.at);
  frame.part(gantry, `conveyor_belt${suffix}`, box(...belt.size), mats.belt, belt.at);
  for (const nod of nodules) {
    const lump = new THREE.DodecahedronGeometry(nod.r, 0);
    frame.part(gantry, nod.name, lump, nod.skin, nod.at, nod.rot);
  }
  for (const side of rails.sides) {
    frame.part(gantry, side.name, box(...rails.size), mats.rail, [0, rails.y, side.z]);
    if (side.lights)
      lights.xs.forEach((x, i) =>
        frame.part(
          gantry,
          `gantry_light_${side.lights.row}_${i}`,
          new THREE.SphereGeometry(lights.r, ...lights.facets),
          mats.light,
          [x, lights.y, side.lights.z]
        )
      );
  }
  for (const leg of legs.legs) {
    const post = cyl(legs.radii[0], legs.radii[1], leg.h, legs.facets);
    frame.part(gantry, `${legs.stem}_${leg.n}`, post, mats.leg, [leg.x, leg.y, 0]);
  }
  return gantry;
}

/**
 * The intake hopper at the conveyor's foot: an eight-sided frustum and the
 * lit mouth drum on it, `intake_hopper` and `intake_mouth` with `suffix`
 * (`''` on two files, `_r` and `_l` on the Order's, which has one a
 * gantry).
 */
export function intakeHopper(root, { hopper: hopperMat, mouth: mouthMat }, opts = {}) {
  const {
    frame = xLong,
    suffix = '',
    hopper = { radii: [1.5, 0.9], h: 1.3, facets: 8, at: [13.4, 0.65, 6.9] },
    mouth = { r: 1.1, h: 0.18, facets: 8, at: [13.4, 1.35, 6.9] },
  } = opts;
  const funnel = cyl(hopper.radii[0], hopper.radii[1], hopper.h, hopper.facets);
  frame.part(root, `intake_hopper${suffix}`, funnel, hopperMat, hopper.at);
  const lip = cyl(mouth.r, mouth.r, mouth.h, mouth.facets);
  frame.part(root, `intake_mouth${suffix}`, lip, mouthMat, mouth.at);
}

/**
 * Flood masts: "floodlit working surfaces" — a six-sided mast each, the
 * head box on top of it turned to aim, and the lamp slab on the head's
 * face turned with it: `flood_mast_${n}`, `flood_head_${n}`,
 * `flood_lamp_${n}`, in `order` and on one buffer a kind when `share`. The
 * heads' rotations are YXZ Eulers on every file (0.5 of pitch and the
 * mast's own yaw), given as the XYZ triple `eulerXYZ` makes of them; the
 * lamp is offset from the head in the export's frame, not the head's, and
 * the files have it so.
 */
export function floodMasts(root, { steel, lamp: lampMat }, opts = {}) {
  const {
    frame = xLong,
    mast = { radii: [0.1, 0.14], facets: 6 },
    head = { size: [0.9, 0.3, 0.45] },
    lamp = { size: [0.8, 0.12, 0.36] },
    order = 'each',
    share = false,
    masts = [
      {
        n: '0',
        at: [2.6, 3.2, 1.8],
        h: 6.4,
        head: { at: [2.6, 6.5, 1.8], rot: eulerXYZ([0.5, -0.5, 0], 'YXZ') },
        lamp: { at: [2.6, 6.42, 1.92] },
      },
      {
        n: '1',
        at: [7.6, 2.6, -4.4],
        h: 5.2,
        head: { at: [7.6, 5.3, -4.4], rot: eulerXYZ([0.5, 0.4, 0], 'YXZ') },
        lamp: { at: [7.6, 5.22, -4.28] },
      },
    ],
  } = opts;
  const geo = sharer(share);
  inOrder(order, masts, [
    (m) =>
      frame.part(
        root,
        `flood_mast_${m.n}`,
        geo(`mast_${m.h}`, () => cyl(mast.radii[0], mast.radii[1], m.h, mast.facets)),
        steel,
        m.at
      ),
    (m) =>
      frame.part(
        root,
        `flood_head_${m.n}`,
        geo('head', () => box(...head.size)),
        steel,
        m.head.at,
        m.head.rot
      ),
    (m) =>
      frame.part(
        root,
        `flood_lamp_${m.n}`,
        geo('lamp', () => box(...lamp.size)),
        lampMat,
        m.lamp.at,
        m.lamp.rot ?? m.head.rot
      ),
  ]);
}

/* --------------------------------------------------------------------------
 * The Bio-Reactor's faction-neutral skeleton (#788, off #540 Phase 4).
 *
 * The Vent Tap's case a third time (#608, #652), and the first where the
 * split was decided before four files existed rather than read off them.
 * What a reactor is, every navy alike, is a piece of ground: the holdfast
 * mat it is driven into, the footprint slab bolted over it, and three intake
 * arms reaching out into the canopy. None of that is a navy's argument —
 * the crop is where the crop is and a boom reaches it — so it is built here
 * once, taking the navy's materials the way `ventDrawArm` takes its own.
 *
 * What *is* a navy's argument is the vessel that stands on the slab and
 * renders what the arms bring in, and that lives in each navy's module: a
 * riveted tank, a grown bladder, a carapace mound, a crystal-framed dome
 * (docs/models-plan.md, "The Bio-Reactor"). A script contributes its vessel
 * and its outflow and nothing else.
 *
 * THREE ARMS, NOT FOUR, and the phase is load-bearing. Three is the read
 * the procedural silhouette already had — "a digester drum with intake
 * booms reaching out into the canopy", three of them
 * (packages/frontend/src/game/silhouettes.ts) — and it is what tells a
 * reactor from a tap at sprite size. Three arms on an odd phase also settle
 * which axis is longer: at `phase` 0 the plan is 1.5 r by 1.73 r and Z-long,
 * which intake would yaw a quarter turn (`rotatedZtoX`, a warning and a
 * turned map); at −π/2 the same three arms are 1.73 r by 1.5 r and X-long.
 * The default is −π/2 for that reason, and each script asserts x ≥ z after
 * `fitFootprint` so a moved arm fails in the script and not in the maps.
 * ------------------------------------------------------------------------ */

/**
 * The bed: the kelp holdfast mat, the octagonal footprint slab bolted over
 * it, the kerb round the slab's rim and the run lights along that kerb —
 * "a render vessel standing over the holdfast on a low footprint slab ...
 * Dim at rest: the slab's run lights" (docs/asset-prompts-3d.md, STRUCTURE
 * — Bio-Reactor).
 *
 * The run lights are the model's one ring of resting light and the only
 * emitter the reactor is guaranteed to show from above, because the vessel
 * stands inside them: the mat is `mat.r` across, the slab `pad.r`, and the
 * lights sit on the kerb at the slab's own rim where nothing a navy builds
 * on the slab can cover them (docs/models-plan.md §3.2 rule 5). Everything
 * the block lights only *rendering* — the feed throats, the vessel's ports,
 * the outflow — is clad in the navy's unlit finish instead (§3.2 rule 2).
 *
 * `holdfast` clads the mat, `slab` the pad, `kerb` the ring; `lamp` is the
 * run light.
 */
export function reactorBed(root, { holdfast, slab, kerb, lamp }, opts = {}) {
  const {
    // Wide enough that an arm's `foot` at 48 m straddles the mat's top face
    // rather than grazing its skirt: "anchor feet driven into the holdfast"
    // is a claim the geometry has to carry (#788 review, N6).
    mat = { r: 52, rTop: 47, y: -1.4, t: 3.6, facets: 16 },
    pad = { r: 34, rTop: 30.5, y: 2.2, t: 4.4 },
    rim = { r: 29.6, t: 1, radial: 5, facets: 16, y: 4.4 },
    // Phase 0, so a light sits on each sixth from +X: the three arms leave
    // the kerb clear (a boom starts at 30 m and the lights are at 29.6), but
    // the outflow trunk crosses it, and every navy runs that out on the same
    // bearing — the gap at −30°, which is halfway between two lights here.
    lights = { count: 6, phase: 0, r: 29.6, y: 5.6, size: [3.2, 0.5, 1.8] },
  } = opts;
  add(root, 'holdfast_mat', cyl(mat.rTop, mat.r, mat.t, mat.facets), holdfast, [0, mat.y, 0]);
  // Eight facets turned an eighth, so a flat faces the bow rather than a
  // corner: plate cut and welded, which is what a slab under a plant is
  // whoever built it (factions/bathyarch.mjs `anchoredRaft` makes the same
  // argument about an octagon).
  add(root, 'footprint_slab', cyl(pad.rTop, pad.r, pad.t, 8, Math.PI / 8), slab, [0, pad.y, 0]);
  add(
    root,
    'slab_kerb',
    torus(rim.r, rim.t, rim.radial, rim.facets),
    kerb,
    [0, rim.y, 0],
    [Math.PI / 2, 0, 0]
  );
  radialSeries(lights, (a, i) =>
    add(root, `slab_run_light_${i}`, box(...lights.size), lamp, polar(a, lights.r, lights.y), [
      0,
      -a,
      0,
    ])
  );
}

/**
 * One intake arm on `bearing`: the boom out from the slab, the trestle legs
 * and the anchor foot under it, the throat drum and its mouth at the head,
 * and the cutter rake across the end with its tines hanging into the canopy
 * — "three intake arms reaching out into the canopy on booms, each ending in
 * a cutter rake and a feed throat that carries the crop back in ... anchor
 * feet driven into the holdfast at the foot of every arm". Distances are
 * metres out along the bearing, as the kit's `ventDrawArm` takes them;
 * `across` is metres to the left of it, looking out.
 *
 * `boom` clads the boom, the legs and the rake beam, `collar` the throat
 * drum, `foot` the anchor plate and `rake` the tines; `throat` is the mouth,
 * and it is the navy's *unlit* finish rather than a lamp, because the block
 * lights the throats only while crop is coming in (docs/models-plan.md §3.2
 * rule 2).
 */
export function reactorIntakeArm(
  root,
  { boom: boomMat, collar, throat: throatMat, foot: footMat, rake: rakeMat },
  opts
) {
  const {
    bearing: a,
    // From 16 m, which is inside every navy's vessel at this height, so the
    // boom plugs into the thing it feeds rather than stopping short of it:
    // "a feed throat that carries the crop back in" is the block's claim,
    // and an arm standing on its own legs 12 m clear of the vessel does not
    // make it. It clears the kerb's run lights — the booms sit 30° off the
    // nearest light and present 3.5° of arc at the kerb's radius.
    boom = { from: 16, to: 74, size: [3, 3.6], y: 14 },
    legs = { at: 48, spread: 5.2, r: [1.1, 1.5], h: 12.4 },
    foot = { at: 48, size: [11, 4.2, 11], y: 1.4 },
    drum = { at: 68, r: [3.6, 4.2], h: 6.4, y: 15.2 },
    mouth = { at: 68, r: 2.9, t: 1, y: 18.6 },
    // The rake hangs off the boom's end and has to *reach* it: the beam
    // overlaps the boom by 0.9 m along the bearing and 0.6 m in height, and
    // each tine's head is 0.2 m up inside the beam. A top-down bake cannot
    // see a vertical gap and neither can `lightAudit` or `check.mjs`, so the
    // first draft's rake hung a metre clear of the arm on all four navies
    // and every gate passed it (#788 review, F1).
    rake = { at: 74.5, size: [2.8, 2.4, 15], y: 11.9 },
    // `r` is [top, bottom], so a hanging tine is thick where it is held and
    // fine where it cuts — the opposite of every standing part in this file
    // (`legs`, `drum`, a stack), which is the convention the first draft took
    // by mistake and which left five cones fat-end-down under the beam
    // (#788 review, F2).
    tines = { count: 5, across: 3.2, r: [0.95, 0.25], h: 7, y: 7.4, facets: 5 },
  } = opts;
  const yaw = [0, -a, 0];
  // A point `r` out along the bearing and `s` to the left of it: `polar`
  // walks the arm, this walks across it, and the rake's tines are the only
  // rank on the model that needs the second.
  const beside = (r, s, y) => [
    r * Math.cos(a) - s * Math.sin(a),
    y,
    r * Math.sin(a) + s * Math.cos(a),
  ];
  add(
    root,
    'intake_boom',
    box(boom.to - boom.from, boom.size[0], boom.size[1]),
    boomMat,
    polar(a, (boom.from + boom.to) / 2, boom.y),
    yaw
  );
  for (const [tag, sgn] of [
    ['a', 1],
    ['b', -1],
  ])
    add(
      root,
      `boom_leg_${tag}`,
      cyl(legs.r[0], legs.r[1], legs.h, 6),
      boomMat,
      beside(legs.at, sgn * legs.spread, legs.h / 2),
      yaw
    );
  add(root, 'anchor_foot', box(...foot.size), footMat, polar(a, foot.at, foot.y), yaw);
  add(
    root,
    'throat_drum',
    cyl(drum.r[0], drum.r[1], drum.h, 10),
    collar,
    polar(a, drum.at, drum.y)
  );
  add(
    root,
    'feed_throat',
    cyl(mouth.r, mouth.r, mouth.t, 10),
    throatMat,
    polar(a, mouth.at, mouth.y)
  );
  add(root, 'rake_beam', box(...rake.size), boomMat, polar(a, rake.at, rake.y), yaw);
  for (let i = 0; i < tines.count; i++)
    add(
      root,
      `rake_tine_${i}`,
      cyl(tines.r[0], tines.r[1], tines.h, tines.facets),
      rakeMat,
      beside(rake.at, (i - (tines.count - 1) / 2) * tines.across, tines.y),
      yaw
    );
}

/* --------------------------------------------------------------------------
 * Tables — the Block 4 props' ports (#869, off #540 Phase 5).
 *
 * The fourteen environment props are Claude Design exports of another kind
 * from the roster's: no part of a stone prop is a primitive as three built
 * it. A crag's peak is a six-facet drum whose every vertex the generator
 * pushed by hand — not by a formula the kit could carry but by a random it
 * did not keep — and pushed by *index*, so the seam vertex three doubles at
 * θ = 0 and 2π went two ways and the drum tore along it, and a cylinder's
 * cap centres, one a segment in three's layout, each took a y of their own.
 * A trench slab is a polyhedron the generator stitched itself, five prisms
 * and chunks in one buffer with their caps five metres off plane.
 * `parts.mjs` prints both as "non-indexed, N triangles — an extrusion, a
 * sweep or a table", and a table is what each is.
 *
 * Two builders, then, for the two kinds of table a port transcribes:
 * `tabled` for a buffer that is a constructor's *topology* under the
 * export's own vertices, and `faceted` for one that is nobody's. Both write
 * what the five stone files carry — the two crags, the boulder and the
 * trench pair, whose every buffer is non-indexed and flat-shaded, position
 * and normal and nothing else. No UVs on purpose: the runtime merges every
 * mesh under one material into one geometry and refuses a bucket whose
 * members disagree on attributes (environmentModels.ts, hull-intake's
 * bake), and the approved files carry none.
 *
 * THAT IS THE STONE FILES ONLY. The other nine are not all so: the coral
 * growth's `masonry_block`, `masonry_lip` and four `branch_*` and the coral
 * tower's `plate_1..5` are indexed, the branches and plates smooth-shaded
 * (a vertex normal 21–24° off its own face on a plate, 44° on a branch),
 * and the ruin block and the dome shard carry indexed boxes. `tabled` and
 * `faceted` always flatten, and neither `check.mjs` nor `diff.mjs` reads a
 * normal, so a port that fed a smooth part through either would pass every
 * gate and ship a faceted part. A port reproduces the file's index and its normals
 * as the file has them, and compares the NORMAL accessor itself, since no
 * tool here does. `parts.mjs --table <part>` prints an indexed part's
 * normals beside its positions for that reason.
 *
 * `factions/pelagia.mjs` `grownBody` is the precedent for a table under a
 * constructor and folds its seam; these do not, because these exports tore
 * theirs.
 * ------------------------------------------------------------------------ */

/**
 * The finish every buffer in the five stone files has: non-indexed, one
 * normal a triangle, no UVs. A part the generator left as three built it —
 * a crag's ledge is a plain box — still carries this, because the whole
 * scene went through it on the way out. Not for a part whose file is
 * indexed or smooth (the section header says which): this throws the
 * file's normals away and computes flat ones.
 */
export function flatShaded(geo) {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  flat.deleteAttribute('uv');
  flat.computeVertexNormals();
  return flat;
}

/**
 * A constructor's topology under the export's own vertices: `geo` is the
 * three primitive with the right segment counts — its radii and lengths are
 * overwritten — and `table` one `[x, y, z]` per *indexed* vertex in three's
 * own order, seam duplicates and cap centres included. That is the order
 * `node tools/hull-models/parts.mjs <model.glb> --table <part> --as
 * cylinder:9,1` prints, with the sections named and a topology that does
 * not fit refused, so a table here is re-derivable from the file it
 * transcribes. A row count that is not the constructor's is a
 * transcription slip and fails here rather than in the maps. The result is
 * the file's buffer: torn where the export tore, and `flatShaded`.
 */
export function tabled(geo, table) {
  const pos = geo.attributes.position;
  if (table.length !== pos.count)
    throw new Error(`tabled: ${table.length} rows for a constructor of ${pos.count} vertices`);
  table.forEach((p, i) => pos.setXYZ(i, p[0], p[1], p[2]));
  return flatShaded(geo);
}

/**
 * A buffer from a point table and triangle triples, in the file's own
 * triangle order and winding — the hand-stitched polyhedra of the trench
 * props, which no constructor accounts for. Flat-shaded and non-indexed, as
 * `tabled` writes and as the two trench files carry it; an index off the
 * table fails here. `parts.mjs --table <part>` prints a buffer's points in
 * order of first appearance and its triangles over them, which is the
 * table this takes; a script may renumber the points (the spire's rings)
 * so long as the triangle sequence it emits is the file's.
 */
export function faceted(points, triangles) {
  const v = [];
  triangles.forEach((t, i) => {
    for (const k of t) {
      if (!points[k])
        throw new Error(`faceted: triangle ${i} names point ${k} of ${points.length}`);
      v.push(...points[k]);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * `n` copies of one row — a cap's centre, which three repeats once a
 * segment and an export that left it alone leaves alike.
 */
export const rep = (n, row) => Array.from({ length: n }, () => row);
