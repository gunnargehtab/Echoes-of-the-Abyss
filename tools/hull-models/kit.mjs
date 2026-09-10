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
import { sceneParts, topDown } from './glb.mjs';
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
 */
export function lamp(name, rgb, base = [0.01, 0.01, 0.0], roughness = 0.4) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...base),
    metalness: 0,
    roughness,
    emissive: new THREE.Color(...rgb),
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
export const cyl = (rTop, rBottom, h, seg = 12) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg);
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
 * blades and horn are cut that way (factions/hadron.mjs `spar`).
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

/** Mirror a builder across the keel: called once with +1 and once with -1. */
export function bothSides(fn) {
  fn('p', 1);
  fn('s', -1);
}

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
