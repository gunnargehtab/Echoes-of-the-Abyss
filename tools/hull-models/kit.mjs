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
import { sceneParts, topDown, boundsOf } from './glb.mjs';
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
  cap(rings[0], stations[0], true);
  cap(rings[rings.length - 1], stations[stations.length - 1], false);
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
 * blocks is on #642. `hadron.pair` is the turrets' own `r`/`l`, the
 * export's, and not this.
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
 * Returns `{ lit: [{ name, m2 }], totalM2, hidden: [names] }`; the export
 * prints it and warns on `hidden`, because a warning-free bake is the bar
 * and this is the warning intake cannot give (it sees only the maps).
 */
export function lightAudit(root, { ppm = 4, minM2 = 0.25 } = {}) {
  const { parts } = sceneParts(root);
  const isLit = (o) => o.isMesh && o.material?.emissive && o.material.emissive.getHex() !== 0;
  const litIndex = new Set();
  let i = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (isLit(o)) litIndex.add(i);
    i++;
  });
  if (litIndex.size === 0) return { lit: [], totalM2: 0, hidden: [] };
  const td = topDown(parts, ppm);
  const cells = new Map();
  for (const o of td.owner) if (litIndex.has(o)) cells.set(o, (cells.get(o) ?? 0) + 1);
  const lit = [...litIndex].map((k) => ({
    name: parts[k].name,
    m2: +((cells.get(k) ?? 0) * td.cellArea).toFixed(2),
  }));
  return {
    lit,
    totalM2: +lit.reduce((s, l) => s + l.m2, 0).toFixed(1),
    hidden: lit.filter((l) => l.m2 < minM2).map((l) => l.name),
  };
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
 * Slipway inherits the decision whole, the Foundry and the Refinery by name
 * rather than by number, and the Bastion not at all — the yards' section
 * below says why, file by file (#652).
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
 * are each one of these, and the Sounding Spire's fins and the Bastion's
 * docking collars will be.
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
 * The yards' faction-neutral skeletons — the Slipway's slip, gantries and
 * head gate, the Foundry's bay and cranes, the Refinery's conveyor gantry,
 * hopper, pipes, masts and stacks (#652, Phase 3's last box).
 *
 * #608 put the Vent Tap's skeleton here because two thirds of every approved
 * tap is identical to the centimetre across the four files. Read the same
 * way, the sixteen four-variant yard files give three answers, and the
 * builders below follow the files rather than the rule:
 *
 * - **The Slipway is the Vent Tap's case.** All four are r169 exports of one
 *   template — slab, slip floor, line lights, keel blocks, the hull on the
 *   blocks, its deck, the launch sill, three gantries and the head gate,
 *   forty-five names in the same order — the trolleys and cables identical
 *   to the digit and the rest the same skeleton at the navy's numbers: the
 *   Commune's beams are wider, its and the Directorate's legs lean, the
 *   Order's legs are pyramids. So the skeleton is built here and the leg,
 *   the ornament on it, the hull on the blocks and the head pylons come from
 *   the navy, the way `ventDrawArm` takes its exchanger; the two halls are
 *   the navy's module's whole.
 * - **The Foundry's and the Refinery's are shared by name, not by number.**
 *   The Directorate's and the Commune's r184 files are one template at the
 *   same numbers — bay, forge line, lips and guides, two cranes; conveyor
 *   gantry, hopper, pipes, masts, stacks — and the Order's is the same
 *   template at its own numbers (its crane is 0.94 of theirs), under its own
 *   `_r`/`_l` names, with its pipes, masts and stacks written by kind rather
 *   than by station. So every number is a parameter whose default is the
 *   Directorate's, every name is a parameter, and a family builder takes its
 *   stations as a table with `interleaved` saying which order the file wrote
 *   them in. The Consortium's Foundry and Refinery are from the earlier
 *   authoring pass, share nothing, and port from `factions/bathyarch.mjs`
 *   alone, as its turret did (#639).
 * - **The Bastion shares nothing** — no node name in common across the four
 *   files — and has no builder here. Each navy's module holds its own.
 *
 * The Slipway files name their sides the way the eleven `bothSides` hulls
 * did before #642, `_p` at +z. Port is -z, so the builders here write the
 * +z part `_s` and the -z part `_p`, first and second as the files have
 * them, through `bothSides` — a relabel that keeps every buffer in the
 * file's order and turns only the names round, which is the one form of
 * side change a port is allowed. The Foundry's Directorate and Commune
 * files are the same the other way about on a Z-long export (their
 * `_starboard` parts sit at the export's +x, the kit's -z), so their lips
 * are named by the script, port first; the Order's `_r`/`_l` are the
 * export's own and stay.
 * ------------------------------------------------------------------------ */

/**
 * The slip slab's plan: a 340 × 176 m rectangle with 5 × 18 m cut off each
 * corner, which with the 2 m bevel reads 344 × 180 at the waist. The point
 * order is the one that reproduces the approved files' triangles in their
 * order through `plate` (earcut starts where the outline does).
 */
export const SLIP_SLAB = [
  [-165, -88],
  [165, -88],
  [170, -70],
  [170, 70],
  [165, 88],
  [-165, 88],
  [-170, 70],
  [-170, -70],
];

/**
 * The slip: the bevelled slab sunk to `slab.y`, the slip floor over it, the
 * two line lights and the seven crosses of a line at rest, the five keel
 * blocks, the hull on the blocks — the navy's, added by `hull(root)` between
 * the last block and the deck, where the files have it — the working deck
 * over it, and the launch sill at the mouth. "The slip cut through its whole
 * length and open at both ends … a keel on blocks two thirds down the slip …
 * the line lights along the slip floor … and the launch sill"
 * (docs/asset-prompts-3d.md, STRUCTURE — Slipway). The mouth is -x and the
 * head gate +x.
 *
 * `slab` clads the slab and, unless `block` is given, the keel blocks;
 * `floor` the slip floor; `deck` the deck; `line` is the lit ink of the
 * lights, the crosses and the sill. Every number is the four approved
 * files' and is the default; the Consortium's deck is wider and higher and
 * passes its own.
 */
export function slipBed(root, { slab, floor, line, deck, block = slab }, opts = {}) {
  const {
    slab: slabOpts = {},
    floor: floorOpts = {},
    lines = {},
    crosses = {},
    blocks = {},
    hull = null,
    deck: deckOpts = {},
    sill = {},
  } = opts;
  const { outline = SLIP_SLAB, thickness = 5, bevel = 2, y: slabY = -8 } = slabOpts;
  // `plate` stands its slab half a thickness up; the files carry the waist
  // from y = 0 to the thickness and the caps a bevel beyond it.
  const slabGeo = plate(outline, thickness, bevel);
  slabGeo.translate(0, -thickness / 2, 0);
  add(root, 'foundation_slab', slabGeo, slab, [0, slabY, 0]);
  const { size: floorSize = [340, 1.5, 46], y: floorY = -0.5 } = floorOpts;
  add(root, 'slip_floor', box(...floorSize), floor, [0, floorY, 0]);
  const { size: lineSize = [310, 0.4, 2.2], y: lineY = 0.5, z: lineZ = 19 } = lines;
  bothSides((tag, sgn) =>
    add(root, `line_light_${tag}`, box(...lineSize), line, [0, lineY, sgn * lineZ])
  );
  const { size: crossSize = [1.6, 0.4, 36], y: crossY = 0.5, from = -140, pitch = 46, count = 7 } =
    crosses;
  for (let i = 0; i < count; i++)
    add(root, `line_cross_${i}`, box(...crossSize), line, [from + pitch * i, crossY, 0]);
  const {
    size: blockSize = [6, 4, 14],
    y: blockY = 2,
    from: blockFrom = -70,
    pitch: blockPitch = 22,
    count: blockCount = 5,
  } = blocks;
  for (let i = 0; i < blockCount; i++)
    add(root, `keel_block_${i}`, box(...blockSize), block, [blockFrom + blockPitch * i, blockY, 0]);
  hull?.(root);
  const { size: deckSize = [60, 1, 8], at: deckAt = [-60, 12, 0] } = deckOpts;
  add(root, 'hull_in_progress_deck', box(...deckSize), deck, deckAt);
  const { size: sillSize = [4, 0.6, 42], at: sillAt = [-160, 0.6, 0] } = sill;
  add(root, 'launch_sill', box(...sillSize), line, sillAt);
}

/**
 * One of the slip's three gantries, at station `x`: a `gantry_<index>`
 * frame holding a leg each side with the navy's ornament on it — the
 * Consortium's brace, the Directorate's claw, the Order's finial, the
 * Commune's knuckle, added by `ornament(gantry, tag, sgn)` straight after
 * its leg — the beam across, the trolley and its cable at `trolley.z`
 * along the beam, and the working light over the span. "Walked down the
 * line under three gantries … the gantry working lights."
 *
 * `legs.geo` is a factory for the navy's leg — a box, a frustum, a pyramid —
 * called once a side so each leg keeps its own buffer as the files do;
 * `legs.lean` is the roll the +z leg carries, and the -z leg carries its
 * negative. `leg`, `beam`, `trolley`, `cable` and `light` are the navy's
 * inks for those parts.
 */
export function slipGantry(root, index, { leg, beam, trolley, cable, light }, opts) {
  const {
    x,
    legs,
    ornament = null,
    beam: beamOpts = {},
    trolley: trolleyOpts,
    cable: cableOpts = {},
    worklight = {},
  } = opts;
  const g = group(root, `gantry_${index}`);
  const { geo, y: legY = 22, z: legZ = 32, lean = 0 } = legs;
  bothSides((tag, sgn) => {
    add(g, `gantry_leg_${tag}`, geo(), leg, [x, legY, sgn * legZ], [sgn * lean, 0, 0]);
    ornament?.(g, tag, sgn);
  });
  const { size: beamSize = [5, 4, 70], y: beamY = 44 } = beamOpts;
  add(g, 'gantry_beam', box(...beamSize), beam, [x, beamY, 0]);
  const { z: tz, y: ty = 40, size: trolleySize = [8, 5, 8] } = trolleyOpts;
  add(g, 'gantry_trolley', box(...trolleySize), trolley, [x, ty, tz]);
  const { y: cy = 26, r: cr = 0.4, h: ch = 24, facets: cf = 4 } = cableOpts;
  add(g, 'gantry_cable', cyl(cr, cr, ch, cf), cable, [x, cy, tz]);
  const { dx = 3.5, y: wy = 46.2, size: wSize = [3, 0.8, 62] } = worklight;
  add(g, 'gantry_worklight', box(...wSize), light, [x + dx, wy, 0]);
  return g;
}

/**
 * The head gate at the top of the slip: a pylon each side in the navy's
 * geometry (`pylons.geo`, a factory as `slipGantry` takes one; `pylons.lean`
 * as its legs') and the lintel across them. "A hull is laid at the head
 * gate."
 */
export function headGate(root, { pylon, lintel }, opts) {
  const { x = 158, pylons, lintel: lintelOpts = {} } = opts;
  const { geo, y, z = 34, lean = 0, scale = [1, 1, 1] } = pylons;
  bothSides((tag, sgn) =>
    add(root, `head_pylon_${tag}`, geo(), pylon, [x, y, sgn * z], [sgn * lean, 0, 0], scale)
  );
  const { size = [10, 6, 80], y: ly = 52 } = lintelOpts;
  add(root, 'head_lintel', box(...size), lintel, [x, ly, 0]);
}

/**
 * The two halls that flank the slip, "each grown in the navy's own
 * architecture": a `hall_s` frame at +z and a `hall_p` frame at -z, in that
 * order, each filled by `fn(hall, tag, sgn)` — the navy's module's, which
 * places every part at `sgn` times its z. The approved files draw the -z
 * hall as the +z one mirrored, part for part with its own buffer.
 */
export function slipHalls(root, fn) {
  bothSides((tag, sgn) => fn(group(root, `hall_${tag}`), tag, sgn));
}

/**
 * The Foundry's bay, on a Z-long r184 export through `drawn`: the bay floor
 * and the forge line lit along it, the hull on the line — the navy's, added
 * by `hull(root)` between the line and the lips, where the files have it —
 * and a lip each side with its rank of guide lights. "Unit production hall
 * with a recessed launch bay … interior forge light spilling from the bay."
 *
 * `lips` is a table, first lip first: `{ name, x, guides: { name(j), at } }`,
 * the lip's export x and which guides of the rank it carries — the
 * Directorate's port lip is missing its third. Names are the script's
 * because the files disagree on them (`_starboard`/`_port` in two, `_r`/`_l`
 * in the Order's) and because two of the three sit the other way about
 * from #642. Every number is the Directorate's unless given.
 */
export function foundryBay(root, { floor, forge, lip, guide }, opts) {
  const {
    floor: floorOpts = {},
    forge: forgeOpts = {},
    hull = null,
    lips,
    lip: lipOpts = {},
    guide: guideOpts = {},
  } = opts;
  const { size: floorSize = [3.4, 0.4, 12], at: floorAt = [0, 0.35, 0] } = floorOpts;
  part(root, 'bay_floor', box(...floorSize), floor, drawn(floorAt));
  const { size: forgeSize = [1.1, 0.18, 10.6], at: forgeAt = [0.15, 0.58, 0.4] } = forgeOpts;
  part(root, 'forge_line', box(...forgeSize), forge, drawn(forgeAt));
  hull?.(root);
  const { size: lipSize = [0.5, 1.5, 12.2], y: lipY = 0.9 } = lipOpts;
  const { r = 0.1, facets = [5, 4], y: guideY = 1.72, from = -5, pitch = 2.5 } = guideOpts;
  for (const l of lips) {
    part(root, l.name, box(...lipSize), lip, drawn([l.x, lipY, 0]));
    for (const j of l.guides.at)
      part(
        root,
        l.guides.name(j),
        new THREE.SphereGeometry(r, ...facets),
        guide,
        drawn([l.x, guideY, from + pitch * j])
      );
  }
}

/**
 * One of the Foundry's two gantry cranes, a `gantry_crane_<index>` frame at
 * export z: two legs, the beam, a finial on each end of it (or none — the
 * Commune's carry none), the trolley with its cable and load hung at
 * `trolley.x` along the beam, and the warning light on the crest. Through
 * `drawn`, as `foundryBay`. `load` is a box unless `load.geo` gives the
 * navy's own — the Order hangs a crystal.
 */
export function foundryCrane(root, index, { leg, beam, finial, trolley, cable, load, warn }, opts) {
  const {
    z,
    legs: legOpts = {},
    beam: beamOpts = {},
    finials = null,
    trolley: trolleyOpts,
    cable: cableOpts,
    load: loadOpts,
    warnlight: warnOpts = {},
  } = opts;
  const g = group(root, `gantry_crane_${index}`, drawn([0, 0, z]));
  const { x: lx = 2.6, y: ly = 2.8, size: legSize = [0.35, 5.6, 0.35] } = legOpts;
  part(g, `gantry_leg_${index}_0`, box(...legSize), leg, drawn([lx, ly, 0]));
  part(g, `gantry_leg_${index}_1`, box(...legSize), leg, drawn([-lx, ly, 0]));
  const { y: by = 5.75, size: beamSize = [6, 0.45, 0.6] } = beamOpts;
  part(g, `gantry_beam_${index}`, box(...beamSize), beam, drawn([0, by, 0]));
  if (finials) {
    const { x: fx = 3, y: fy = 6.4, r: fr = 0.12, h: fh = 0.9 } = finials;
    part(g, `gantry_finial_${index}_0`, cyl(0, fr, fh, 4), finial, drawn([fx, fy, 0]));
    part(g, `gantry_finial_${index}_1`, cyl(0, fr, fh, 4), finial, drawn([-fx, fy, 0]));
  }
  const { x: tx, y: ty = 5.3, size: trolleySize = [0.8, 0.5, 0.7] } = trolleyOpts;
  part(g, `gantry_trolley_${index}`, box(...trolleySize), trolley, drawn([tx, ty, 0]));
  const { y: cy, h: ch, r: cr = 0.05, facets: cf = 5 } = cableOpts;
  part(g, `gantry_cable_${index}`, cyl(cr, cr, ch, cf), cable, drawn([tx, cy, 0]));
  const { y: loy, size: loadSize = [0.55, 0.4, 0.5], geo: loadGeo = null, scale } = loadOpts;
  part(
    g,
    `gantry_load_${index}`,
    loadGeo ? loadGeo() : box(...loadSize),
    load,
    drawn([tx, loy, 0], [0, 0, 0], scale)
  );
  const { y: wy = 6.08, r: wr = 0.09, facets: wf = [5, 4] } = warnOpts;
  part(g, `gantry_warnlight_${index}`, new THREE.SphereGeometry(wr, ...wf), warn, drawn([0, wy, 0]));
  return g;
}

/**
 * A nodule as the Refineries carry their ore: a dodecahedron, whose
 * vertices stand 0.934 of the constructor's radius out along an axis — so
 * a nodule whose buffer reads ±0.30185 was built at 0.32312. `r` is the
 * constructor's.
 */
export const dodeca = (r) => new THREE.DodecahedronGeometry(r, 0);

/**
 * The Refinery's conveyor gantry, on an X-long r184 export in its own
 * frame: a `conveyor_gantry` frame at `at` and `rot` holding the bed, the
 * belt on it, the nodules riding it, then the rails — each side a rail and
 * the gantry lights along it, in the order the file writes them — and the
 * legs down to the ground. "A rank of upright silos with conveyor and
 * crusher machinery … floodlit working surfaces, visible machinery light."
 *
 * `nodules` is a table of `{ name, mat, r, at, rot }`, each its own ink and
 * radius; `sides` a table of `{ rail: { name, z }, lights: [{ name, x, z }] }`
 * — the Directorate writes a rail and its four lights, then the other rail
 * and its four; the Order writes both rails and then four lights down the
 * middle, which is a first side with no lights; `legs` a table of
 * `{ name, x, y, h }`. Every number is the Directorate's unless given.
 */
export function conveyorGantry(root, { bed, belt, rail, light, leg }, opts) {
  const {
    name = 'conveyor_gantry',
    at,
    rot = [0, 0, 0],
    bed: bedOpts = {},
    belt: beltOpts = {},
    nodules,
    sides,
    rail: railOpts = {},
    light: lightOpts = {},
    legs,
    leg: legOpts = {},
  } = opts;
  const g = group(root, name, { at, rot });
  const { name: bedName = 'conveyor_bed', size: bedSize = [9.5, 0.35, 1.7] } = bedOpts;
  add(g, bedName, box(...bedSize), bed);
  const { name: beltName = 'conveyor_belt', size: beltSize = [9.12, 0.12, 1.15], y: beltY = 0.24 } =
    beltOpts;
  add(g, beltName, box(...beltSize), belt, [0, beltY, 0]);
  for (const n of nodules) add(g, n.name, dodeca(n.r), n.mat, n.at, n.rot);
  const { y: railY = 0.55, size: railSize = [9.5, 0.16, 0.16] } = railOpts;
  const { y: lightY = 0.72, r: lightR = 0.09, facets: lightFacets = [5, 4] } = lightOpts;
  for (const side of sides) {
    add(g, side.rail.name, box(...railSize), rail, [0, railY, side.rail.z]);
    for (const l of side.lights)
      add(g, l.name, new THREE.SphereGeometry(lightR, ...lightFacets), light, [l.x, lightY, l.z]);
  }
  const { r: legR = [0.14, 0.18], facets: legFacets = 6 } = legOpts;
  for (const l of legs) add(g, l.name, cyl(legR[0], legR[1], l.h, legFacets), leg, [l.x, l.y, 0]);
  return g;
}

/**
 * The Refinery's intake: the hopper, a frustum open upward, and the lit
 * mouth in it. `names` are `[hopper, mouth]`; `at` is the hopper's centre
 * and `mouth.y` the mouth's height. The Directorate's numbers unless given.
 */
export function intakeHopper(root, { hopper, mouth }, opts = {}) {
  const {
    names = ['intake_hopper', 'intake_mouth'],
    at = [13.4, 0.65, 6.9],
    hopper: h = {},
    mouth: m = {},
  } = opts;
  const { r = [1.5, 0.9], h: hh = 1.3, facets = 8 } = h;
  const { r: mr = 1.1, h: mh = 0.18, y: my = 1.35, facets: mf = 8 } = m;
  add(root, names[0], cyl(r[0], r[1], hh, facets), hopper, at);
  add(root, names[1], cyl(mr, mr, mh, mf), mouth, [at[0], my, at[2]]);
}

/**
 * The Refinery's transfer pipes and the flange on each: `pipes` a table of
 * `{ name, at, rot, r, h }` and `flanges` of `{ name, at, rot, R, tube }`,
 * a flange a five-by-ten torus. The Directorate writes each pipe with its
 * flange (`interleaved`); the Order writes its two pipes and then its two
 * flanges.
 */
export function transferPipes(root, { pipe, flange }, opts) {
  const { pipes, flanges, interleaved = true, facets = 7, flangeFacets = [5, 10] } = opts;
  const pipeOf = (p) => add(root, p.name, cyl(p.r, p.r, p.h, facets), pipe, p.at, p.rot);
  const flangeOf = (f) =>
    add(root, f.name, torus(f.R, f.tube, flangeFacets[0], flangeFacets[1]), flange, f.at, f.rot);
  if (interleaved) pipes.forEach((p, i) => (pipeOf(p), flangeOf(flanges[i])));
  else {
    pipes.forEach(pipeOf);
    flanges.forEach(flangeOf);
  }
}

/**
 * The Refinery's flood masts: `masts` a table of `{ name, at, r, h }` (a
 * six-facet frustum standing on `at`), `heads` of `{ name, at, rot, size }`
 * and `lamps` the same, the lamp the lit face of the head. The Directorate
 * writes each mast with its head and lamp (`interleaved`); the Order writes
 * its masts, then its heads, then its lamps.
 */
export function floodMasts(root, { mast, head, lamp }, opts) {
  const { masts, heads, lamps, interleaved = true, facets = 6 } = opts;
  const mastOf = (m) => add(root, m.name, cyl(m.r[0], m.r[1], m.h, facets), mast, m.at);
  const headOf = (h) => add(root, h.name, box(...h.size), head, h.at, h.rot);
  const lampOf = (l) => add(root, l.name, box(...l.size), lamp, l.at, l.rot);
  if (interleaved) masts.forEach((m, i) => (mastOf(m), headOf(heads[i]), lampOf(lamps[i])));
  else {
    masts.forEach(mastOf);
    heads.forEach(headOf);
    lamps.forEach(lampOf);
  }
}

/**
 * The Refinery's exhaust stacks: `stacks` a table of `{ name, at, rot, r, h }`
 * (a seven-facet frustum) and `tips` of `{ name, at, r, h }`, the lit ring
 * on top. The Directorate writes each stack with its tip (`interleaved`);
 * the Order writes both stacks and then both tips.
 */
export function exhaustStacks(root, { stack, tip }, opts) {
  const { stacks, tips, interleaved = true, facets = 7 } = opts;
  const stackOf = (s) => add(root, s.name, cyl(s.r[0], s.r[1], s.h, facets), stack, s.at, s.rot);
  const tipOf = (t) => add(root, t.name, cyl(t.r[0], t.r[1], t.h, facets), tip, t.at, t.rot);
  if (interleaved) stacks.forEach((s, i) => (stackOf(s), tipOf(tips[i])));
  else {
    stacks.forEach(stackOf);
    tips.forEach(tipOf);
  }
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
