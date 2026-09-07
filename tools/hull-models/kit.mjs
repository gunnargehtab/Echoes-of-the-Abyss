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
 *   Lit features go on upward surfaces, as strips, bars or patches.
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

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
export { THREE };

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

/** A lamp: near-black base, the light in `emissive`. See the header. */
export function lamp(name, rgb, base = [0.01, 0.01, 0.0]) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...base),
    metalness: 0,
    roughness: 0.4,
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
 */
export function plate(points, thicknessM) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thicknessM,
    bevelEnabled: false,
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
 */
export function plan(points, thicknessM) {
  const geo = plate(
    points.map(([x, z]) => [x, -z]),
    thicknessM
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
 */
export function loft(profile, facets = 10) {
  const pts = profile.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.001), x));
  const geo = new THREE.LatheGeometry(pts, facets);
  geo.rotateZ(-Math.PI / 2);
  return geo;
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

/** Write the GLB into docs/concept-art/models/ and report what it contains. */
export async function exportGlb(root, filename) {
  const out = fileURLToPath(new URL(`../../docs/concept-art/models/${filename}`, import.meta.url));
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
  console.log(
    `${filename}: ${Buffer.from(glb).length} bytes, ${parts} parts, ${Math.round(tris)} tris\n` +
      `  bounds x ${b.x.join('..')}  y ${b.y.join('..')}  z ${b.z.join('..')}`
  );
}
