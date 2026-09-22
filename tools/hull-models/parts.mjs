/**
 * What a committed GLB says about each part, in the terms a script would
 * write it — the reader a port transcribes from.
 *
 *   node tools/hull-models/parts.mjs <model.glb>              # every node
 *   node tools/hull-models/parts.mjs <model.glb> --contour <part>   # an extrusion's outline
 *   node tools/hull-models/parts.mjs <model.glb> --table <part>     # a buffer as a table
 *   node tools/hull-models/parts.mjs <model.glb> --table <part> --as cylinder:9,1
 *   node tools/hull-models/parts.mjs <model.glb> --table <part> --as torus:5,8
 *   node tools/hull-models/parts.mjs <model.glb> --table <part> --as dodecahedron
 *
 * `glb.mjs` reads a file as the bake sees it: world-space triangles, one
 * flat list. A port needs the other reading — the export's own frame: each
 * node's translation, rotation and scale as the file carries them, which
 * primitive its buffer is (a 12-facet drum, a 16 × 10 orb, a plate extruded
 * from an outline), and which nodes share one buffer, because that is what
 * a script *is*: primitives placed by nodes. The Light Scout ports (#588)
 * read all of that by hand out of the JSON and the accessors, line by line;
 * this prints it, so the five shared kinds behind them (#540 Phase 3) can
 * audit a script line against the file instead of re-deriving it.
 *
 * Every number is the file's own — nothing is yawed, scaled or centred here.
 * A port passes them through kit.mjs `drawn` and `metreTrue`, which is where
 * the one yaw and the one scale live. The rotation is printed as the XYZ
 * Euler three's `Object3D.rotation` would hold, which is what `drawn`
 * takes; an export written in another order (the turrets' YXZ frames, #639)
 * still round-trips through `eulerXYZ`.
 *
 * The primitive is a *guess* from the vertex and triangle counts and the
 * buffer's shape, named for the three.js constructor that produces exactly
 * those counts, with the parameters that reproduce the local bounds. It is
 * checked the only way it can be — by building the script and comparing
 * (`check.mjs` to the centimetre, `diff.mjs` to the triangle) — and a buffer
 * no constructor accounts for is printed as what it is: a table of points
 * the export pushed by hand, which is how the Commune scout's hull was found.
 *
 * `--table` prints such a buffer the way a script carries one, to five
 * decimals, so a transcription is re-derivable from its file (#869, the
 * Block 4 props). On its own it prints the distinct points in order of
 * first appearance and the triangles over them, which is what kit.mjs
 * `faceted` takes. With `--as <constructor>` — `cylinder:<facets>[,<rows>]`,
 * `box[:<w>,<h>,<d>]`, `sphere:<w>,<h>`, `torus:<radial>,<tubular>` or
 * `dodecahedron` — it prints one row per vertex of that three constructor
 * in its own index order, sections named (a drum's torso rows then each
 * cap's centres and ring; a box's six faces +x −x +y −y +z −z; an orb's
 * rows from the top pole; a torus's sections round the tube, each a ring
 * round the torus closed on its first corner, the last section the first
 * again; a dodecahedron's twenty corners in the order three's buffer first
 * reaches them, which is seabed.mjs `dodecahedronOf`'s order), a run of
 * identical rows folded to `...rep(n, row)`, which is what kit.mjs `tabled`
 * takes; it refuses a constructor whose index layout the buffer does not
 * follow (two references to one vertex at two positions), so a table
 * printed is a topology proved — and since a nine-facet drum with both
 * caps and a dodecahedron are both 108 vertices over 36 triangles, the
 * refusal is what tells the resonance pair's mounds from their boulders.
 * seabed.mjs `drumOf`'s compact form is read off the `cylinder` rows by
 * dropping each ring's closing copy and taking a cap's centre once. An
 * indexed buffer is printed in the file's own vertex order with its index
 * and its NORMAL rows beside the positions, because a smooth-shaded part's
 * normals are the file's and no gate compares them.
 */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

const MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function chunks(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== MAGIC) throw new Error(`${path}: not a glTF 2 binary`);
  let off = 12;
  let json = null;
  let bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === CHUNK_JSON) json = JSON.parse(body.toString('utf8'));
    else if (type === CHUNK_BIN) bin = body;
    off += 8 + len;
  }
  return { json, bin };
}

const f5 = (v) => {
  const r = Math.round(v * 1e5) / 1e5;
  return Object.is(r, -0) ? 0 : r;
};
const vec = (v) => `[${v.map(f5).join(', ')}]`;

/** Distinct values of one coordinate, to a tenth of a millimetre. */
function levels(pos, axis) {
  const s = new Set();
  for (let i = axis; i < pos.length; i += 3) s.add(Math.round(pos[i] * 1e4) / 1e4);
  return [...s].sort((a, b) => a - b);
}

/** Largest distance from `axis` among the vertices whose `axis` coordinate is `at`. */
function radiusAt(pos, axis, at) {
  const [a, b] = [0, 1, 2].filter((k) => k !== axis);
  let r = 0;
  for (let i = 0; i < pos.length; i += 3)
    if (Math.abs(pos[i + axis] - at) < 1e-4) r = Math.max(r, Math.hypot(pos[i + a], pos[i + b]));
  return r;
}

/**
 * Name the constructor whose counts these are. Vertex counts include the
 * seam duplicates every three.js primitive carries, which is why a 16 × 10
 * orb is 187 vertices and not 146.
 */
function guess(v, t, indexed, pos, extent) {
  const out = [];
  if (indexed && v === 24 && t === 12) out.push(`box(${vec(extent)})`);
  // A cylinder: torso (r+1)(h+1) vertices and 2rh triangles; each cap 2r+1
  // vertices and r triangles. A cone has one cap, an open tube none — and a
  // cone drawn to a true point drops the r degenerate triangles at its apex
  // (three skips them when a radius is 0), so `cyl(0, r, h, n)` is 2n
  // triangles on 4n + 3 vertices, which is every spike on the Directorate's
  // Submersible and Chorister.
  for (let r = 3; r <= 64; r++)
    for (let h = 1; h <= 8; h++)
      for (const caps of [2, 1, 0]) {
        const pointed = caps === 1 && v === (r + 1) * (h + 1) + 2 * r + 1 && t === 2 * r * h;
        if (
          !pointed &&
          (v !== (r + 1) * (h + 1) + caps * (2 * r + 1) || t !== 2 * r * h + caps * r)
        )
          continue;
        const axis = [1, 2, 0].find((k) => levels(pos, k).length === h + 1);
        if (axis === undefined) continue;
        const lv = levels(pos, axis);
        const top = radiusAt(pos, axis, lv[lv.length - 1]);
        const bottom = radiusAt(pos, axis, lv[0]);
        const kind =
          caps === 2 ? 'cylinder' : pointed ? 'cone to a point' : caps === 1 ? 'cone' : 'open cylinder';
        const along = ['x', 'y', 'z'][axis];
        // three's first torso vertex sits at thetaStart: x = r·sin θ, z = r·cos θ.
        const [a, b] = axis === 1 ? [0, 2] : axis === 2 ? [0, 1] : [2, 1];
        const theta = Math.atan2(pos[a], pos[b]);
        out.push(
          `${kind}(rTop ${f5(top)}, rBottom ${f5(bottom)}, h ${f5(lv[lv.length - 1] - lv[0])}, ` +
            `${r} facets${h > 1 ? ` × ${h}` : ''}, θ₀ ${f5(theta)}) along ${along}`
        );
      }
  // A sphere: (w+1)(h+1) vertices, 2w(h−1) triangles (single triangles at
  // the poles). The counts cannot tell a sphere from one the export pushed
  // out of round point by point (the Commune scout's hull), so the radii are
  // read too: an orb has one, a table has a spread, and the spread is named.
  for (let w = 3; w <= 64; w++)
    for (let h = 2; h <= 64; h++)
      if (indexed && v === (w + 1) * (h + 1) && t === 2 * w * (h - 1)) {
        const c = [0, 1, 2].map((k) => (extent[k] === 0 ? 0 : 0));
        let lo = Infinity;
        let hi = 0;
        for (let i = 0; i < pos.length; i += 3) {
          const r = Math.hypot(pos[i] - c[0], pos[i + 1] - c[1], pos[i + 2] - c[2]);
          lo = Math.min(lo, r);
          hi = Math.max(hi, r);
        }
        const round = hi - lo < 1e-3 * hi;
        out.push(
          `sphere(r ${vec(extent.map((e) => e / 2))}, ${w} × ${h})` +
            (round ? '' : ` — displaced, radii ${f5(lo)}..${f5(hi)}: a table, not a constructor`)
        );
      }
  // The lathe family — a lathe of n points round s facets, a torus of rs × ts,
  // a tube of tubular × radial, a plane of w × h — all (n)(s+1) vertices and
  // 2(n−1)s triangles; which one is a matter of where the vertices are.
  for (let s = 3; s <= 64; s++) {
    if (v % (s + 1) !== 0) continue;
    const n = v / (s + 1);
    if (n < 2 || t !== 2 * (n - 1) * s) continue;
    const flat = extent.findIndex((e) => e < 1e-4);
    if (flat >= 0) out.push(`plane(${n - 1} × ${s} segments, flat on ${['x', 'y', 'z'][flat]})`);
    else out.push(`lathe(${n} points × ${s}) | torus(${n - 1} × ${s}) | tube(${s} × ${n - 1})`);
  }
  // A capsule as r184 lays it out (kit.mjs `capsule`).
  for (let rad = 3; rad <= 32; rad++)
    for (let cap = 1; cap <= 8; cap++)
      for (let hs = 1; hs <= 8; hs++)
        if (v === (rad + 1) * (2 * cap + hs + 1) && t === 2 * rad * (2 * cap + hs))
          out.push(`capsule(${rad} radial, ${cap} cap, ${hs} height)`);
  if (!indexed) {
    if (t === 8) out.push('octahedron');
    else if (t === 20) out.push('icosahedron');
    else if (t === 36) out.push('dodecahedron');
    else out.push(`non-indexed, ${t} triangles — an extrusion, a sweep or a table`);
  }
  if (!out.length) out.push(`no constructor gives ${v} vertices and ${t} triangles — a table?`);
  return out;
}

/**
 * An extrusion's outline, walked off its side walls: the wall triangles
 * follow the contour in order, so the distinct points at the bottom face,
 * in order of first appearance, are the shape's own sampled points.
 */
function contour(pos) {
  const zs = levels(pos, 2);
  const z0 = zs[0];
  const seen = new Set();
  const pts = [];
  for (let i = 0; i < pos.length; i += 3) {
    if (Math.abs(pos[i + 2] - z0) > 1e-4) continue;
    const key = `${f5(pos[i])},${f5(pos[i + 1])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pts.push([pos[i], pos[i + 1]]);
  }
  return pts;
}

/**
 * A three constructor named on the command line, with the sections its
 * index layout falls into — the order `--table --as` prints and kit.mjs
 * `tabled` reads. `order` is the constructor's index: one entry per
 * non-indexed buffer vertex naming the constructor vertex it is a copy of,
 * and `count` how many of those there are.
 */
function constructorOf(spec) {
  const [kind, args = ''] = spec.split(':');
  const n = args ? args.split(',').map(Number) : [];
  const indexed = (geo, sections) => ({
    order: Array.from(geo.index.array),
    count: geo.attributes.position.count,
    sections,
  });
  if (kind === 'cylinder' && n.length >= 1) {
    const [r, h = 1] = n;
    const sections = [];
    for (let y = 0; y <= h; y++) sections.push([`torso row ${y}`, r + 1]);
    sections.push(['top cap centres', r], ['top cap ring', r + 1]);
    sections.push(['bottom cap centres', r], ['bottom cap ring', r + 1]);
    return indexed(new THREE.CylinderGeometry(1, 1, 1, r, h), sections);
  }
  if (kind === 'box') {
    const [w = 1, h = 1, d = 1] = n;
    const sections = [
      ['+x face', (h + 1) * (d + 1)],
      ['-x face', (h + 1) * (d + 1)],
      ['+y face', (w + 1) * (d + 1)],
      ['-y face', (w + 1) * (d + 1)],
      ['+z face', (w + 1) * (h + 1)],
      ['-z face', (w + 1) * (h + 1)],
    ];
    return indexed(new THREE.BoxGeometry(1, 1, 1, w, h, d), sections);
  }
  if (kind === 'sphere' && n.length === 2) {
    const [w, h] = n;
    const sections = [];
    for (let iy = 0; iy <= h; iy++)
      sections.push([
        iy === 0 ? 'top pole row' : iy === h ? 'bottom pole row' : `ring ${iy}`,
        w + 1,
      ]);
    return indexed(new THREE.SphereGeometry(1, w, h), sections);
  }
  // A torus: (radial + 1) sections round the tube, three's first section
  // first, each (tubular + 1) corners round the torus from θ = 0 with the
  // 2π copy last; the last section is the first again. seabed.mjs `torusOf`
  // takes the sections without either closing copy.
  if (kind === 'torus' && n.length === 2) {
    const [radial, tubular] = n;
    const sections = [];
    for (let j = 0; j <= radial; j++)
      sections.push([
        j === radial
          ? `tube section ${j} — section 0 again, closing the tube`
          : `tube section ${j}`,
        tubular + 1,
      ]);
    return indexed(new THREE.TorusGeometry(1, 0.3, radial, tubular), sections);
  }
  // A dodecahedron: non-indexed as PolyhedronGeometry writes it at detail
  // 0, 108 vertices that are twenty corners three faces each. Its "index"
  // is the map from each buffer vertex to the corner it copies, numbered in
  // order of first appearance — seabed.mjs `dodecahedronOf`'s order, read
  // off the constructor here the same way.
  if (kind === 'dodecahedron') {
    const pos = new THREE.DodecahedronGeometry(1, 0).attributes.position;
    const seen = new Map();
    const order = [];
    for (let i = 0; i < pos.count; i++) {
      const key = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(5)).join();
      if (!seen.has(key)) seen.set(key, seen.size);
      order.push(seen.get(key));
    }
    return {
      order,
      count: seen.size,
      sections: [['corners, in order of first appearance', seen.size]],
      nonIndexed: true,
    };
  }
  throw new Error(
    `--as ${spec}: want cylinder:<facets>[,<rows>], box[:<w>,<h>,<d>], sphere:<w>,<h>, ` +
      'torus:<radial>,<tubular> or dodecahedron'
  );
}

/**
 * A buffer as a script's table. `pos` and `nor` are the accessors' floats,
 * `idx` the file's index or null. Without a constructor: distinct points in
 * order of first appearance and the triangles over them (an indexed file
 * keeps its own vertex order and index, and prints its normals). With one:
 * one row per constructor vertex, mapped back through its index from the
 * file's non-indexed buffer, every reference checked to agree.
 */
function table(name, pos, idx, nor, spec) {
  const row = (p) => `[${p.map(f5).join(', ')}]`;
  if (!spec) {
    if (idx) {
      console.log(`// ${name}: indexed, ${pos.length / 3} vertices in the file's order`);
      console.log('// positions');
      for (let i = 0; i < pos.length; i += 3)
        console.log(`${row([pos[i], pos[i + 1], pos[i + 2]])}, // ${i / 3}`);
      if (nor) {
        console.log('// normals — the file\'s own, and a smooth part\'s are not the triangles\'');
        for (let i = 0; i < nor.length; i += 3)
          console.log(`${row([nor[i], nor[i + 1], nor[i + 2]])}, // ${i / 3}`);
      }
      console.log('// triangles');
      const tris = [];
      for (let t = 0; t < idx.length; t += 3)
        tris.push(`[${idx[t]}, ${idx[t + 1]}, ${idx[t + 2]}]`);
      console.log(tris.join(', '));
      return;
    }
    const uniq = new Map();
    const ids = [];
    for (let i = 0; i < pos.length; i += 3) {
      const key = [pos[i], pos[i + 1], pos[i + 2]].map(f5).join(',');
      if (!uniq.has(key)) uniq.set(key, uniq.size);
      ids.push(uniq.get(key));
    }
    console.log(
      `// ${name}: ${uniq.size} points, ${ids.length / 3} triangles — kit.mjs \`faceted\``
    );
    console.log('// points, in order of first appearance');
    [...uniq.keys()].forEach((k, i) => console.log(`${row(k.split(',').map(Number))}, // ${i}`));
    console.log('// triangles');
    const tris = [];
    for (let t = 0; t < ids.length; t += 3) tris.push(`[${ids[t]}, ${ids[t + 1]}, ${ids[t + 2]}]`);
    console.log(tris.join(', '));
    return;
  }
  const { order, count, sections, nonIndexed } = constructorOf(spec);
  const rows = new Array(count).fill(null);
  let disagree = 0;
  if (idx) {
    if (nonIndexed || idx.length !== order.length || order.some((v, k) => v !== idx[k]))
      throw new Error(`${name}: the file's index is not ${spec}'s`);
    for (let i = 0; i < count; i++) rows[i] = [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
  } else {
    if (order.length !== pos.length / 3)
      throw new Error(
        `${name}: ${spec} references ${order.length} vertices, the buffer has ${pos.length / 3}`
      );
    order.forEach((i, k) => {
      const v = [pos[3 * k], pos[3 * k + 1], pos[3 * k + 2]];
      if (!rows[i]) rows[i] = v;
      else if (rows[i].some((c, d) => c !== v[d])) disagree++;
    });
    if (disagree)
      throw new Error(
        `${name}: not ${spec} — ${disagree} references to one vertex land at two positions`
      );
  }
  const orphans = rows.filter((r) => !r).length;
  console.log(
    `// ${name}: ${spec}, ${count} rows in three's index order — kit.mjs \`tabled\`` +
      (orphans ? ` (${orphans} unreferenced, written as their row)` : '')
  );
  let at = 0;
  for (const [label, n] of sections) {
    const part = rows.slice(at, at + n);
    const seen = part.filter(Boolean);
    const alike = seen.every((r) => r.every((c, d) => c === seen[0][d]));
    console.log(`  // ${label}`);
    if (alike && n > 1) console.log(`  ...rep(${n}, ${row(seen[0])}),`);
    else for (const r of part) console.log(`  ${row(r ?? seen[0])},${r ? '' : ' // unreferenced'}`);
    at += n;
  }
}

const [path, ...rest] = process.argv.slice(2);
if (!path) {
  console.error(
    'usage: node tools/hull-models/parts.mjs <model.glb> ' +
      '[--contour <part> | --table <part> [--as <constructor>]]'
  );
  process.exit(2);
}
const flag = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : null;
};
const want = flag('--contour');
const tabled = flag('--table');
const { json, bin } = chunks(path);
const accessor = (i) => {
  const a = json.accessors[i];
  const bv = json.bufferViews[a.bufferView];
  const start = bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const Ctor = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[
    a.componentType
  ];
  return { data: new Ctor(bin.buffer, start, a.count * n), count: a.count, min: a.min, max: a.max };
};

if (want || tabled) {
  const name = want ?? tabled;
  try {
    const node = json.nodes.find((n) => n.name === name && n.mesh !== undefined);
    if (!node) throw new Error(`${name}: no mesh node of that name`);
    const prim = json.meshes[node.mesh].primitives[0];
    const pos = accessor(prim.attributes.POSITION).data;
    if (want) for (const p of contour(pos)) console.log(vec(p));
    else
      table(
        name,
        pos,
        prim.indices !== undefined ? accessor(prim.indices).data : null,
        prim.attributes.NORMAL !== undefined ? accessor(prim.attributes.NORMAL).data : null,
        flag('--as')
      );
  } catch (err) {
    // A port's author runs this; a stack trace says nothing they can act on.
    console.error(`parts.mjs: ${err.message}`);
    process.exit(2);
  }
  process.exit(0);
}

const srgb = (rgb) => '#' + new THREE.Color(...rgb).getHexString().toUpperCase();
console.log(`${path}: ${json.asset?.generator ?? 'unknown generator'}`);
json.materials.forEach((m, i) => {
  const pbr = m.pbrMetallicRoughness ?? {};
  const base = pbr.baseColorFactor?.slice(0, 3) ?? [1, 1, 1];
  const em = m.emissiveFactor;
  const strength = m.extensions?.KHR_materials_emissive_strength?.emissiveStrength;
  console.log(
    `material ${i}  ${m.name}  base ${srgb(base)} ${vec(base)}  metalness ${pbr.metallicFactor ?? 1}` +
      `  roughness ${pbr.roughnessFactor ?? 1}` +
      (em && em.some((c) => c > 0)
        ? `  emissive ${srgb(em)} ${vec(em)}${strength ? ` × ${strength}` : ''}`
        : '') +
      (m.doubleSided ? '  double-sided' : '')
  );
});

const parent = new Map();
json.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => parent.set(c, i)));
const firstUse = new Map();
json.nodes.forEach((n, i) => {
  // r184 writes most nodes as a matrix rather than as TRS; decomposed here so
  // both read the same, and named, because a matrix is a hint the node was
  // scaled or reflected (three writes TRS when it can).
  let t = n.translation ?? [0, 0, 0];
  let q = n.rotation ?? [0, 0, 0, 1];
  let s = n.scale ?? [1, 1, 1];
  if (n.matrix) {
    const T = new THREE.Vector3();
    const Q = new THREE.Quaternion();
    const S = new THREE.Vector3();
    new THREE.Matrix4().fromArray(n.matrix).decompose(T, Q, S);
    t = T.toArray();
    q = Q.toArray();
    s = S.toArray();
  }
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...q), 'XYZ');
  const p = parent.get(i);
  let line = `${String(i).padStart(3)}  ${n.name}${p !== undefined ? `  in ${json.nodes[p].name}` : ''}`;
  if (n.matrix) line += '  (matrix)';
  line += `\n     t ${vec(t)}  e ${vec([e.x, e.y, e.z])}  s ${vec(s)}`;
  if (n.mesh !== undefined) {
    const mesh = json.meshes[n.mesh];
    for (const prim of mesh.primitives) {
      const pos = accessor(prim.attributes.POSITION);
      const idx = prim.indices !== undefined ? accessor(prim.indices) : null;
      const tris = (idx ? idx.count : pos.count) / 3;
      const mat = prim.material !== undefined ? json.materials[prim.material].name : '-';
      const extent = [0, 1, 2].map((k) => pos.max[k] - pos.min[k]);
      const centre = [0, 1, 2].map((k) => (pos.max[k] + pos.min[k]) / 2);
      const key = prim.attributes.POSITION;
      const shared = firstUse.get(key);
      if (!shared) firstUse.set(key, n.name);
      line +=
        `\n     ${mat}  ${pos.count} v  ${tris} t${idx ? '' : '  non-indexed'}` +
        `  local ${vec(pos.min)}..${vec(pos.max)}` +
        (centre.some((c) => Math.abs(c) > 1e-4) ? `  centre ${vec(centre)}` : '');
      if (shared) line += `\n     buffer of ${shared}`;
      else
        for (const g of guess(pos.count, tris, !!idx, pos.data, extent)) line += `\n     ≈ ${g}`;
    }
  }
  console.log(line);
});
