/**
 * Baked ambient occlusion for a model script (#1002): every part laid out
 * on one atlas, a map of how much of the sky each texel sees, and the glTF
 * that carries both.
 *
 *   const ao = bakeOcclusion(root, { size: 512 });   // before the export
 *   const glb = embedOcclusion(exported, ao);          // after it
 *
 * Three things decided the shape of this, and kit.mjs `exportGlb` is where
 * they meet:
 *
 * - **The map is the conn view's, and only its.** three applies an `aoMap`
 *   to the indirect terms alone — the environment and the hemisphere — never
 *   to the key, the rim or the fill, and never to emissive, so gate 3's glow
 *   reads exactly as it did and a lamp in a crevice is as loud as the number
 *   says (docs/graphics-standards.md gate 3). The chart's maps never see it:
 *   intake's albedo pass copies a material's colour and base map into an
 *   unlit material and nothing else (hull-intake page.html), which is the
 *   non-target control docs/art-direction.md "Shared model lighting" names.
 * - **It must rebuild the same.** check.mjs runs every script into a
 *   scratch directory and compares the GLB it writes with the committed one,
 *   the map and the UVs included, so the bake has no random number in it:
 *   the ray set is a Fibonacci spiral, the per-texel turn an integer hash,
 *   and every sum runs in the same order on every machine. The comparison
 *   still allows a texel two levels of slack and a UV a quarter of a texel,
 *   which is more than the arithmetic needs and less than any change to the
 *   shape would show.
 * - **The silhouette is untouched.** Nothing here moves a vertex. A vertex
 *   shared by triangles that land in different charts is split, so an
 *   indexed sphere gains vertices and no triangle; check.mjs compares
 *   triangles, bounds and normals corner by corner, and reads no change.
 *
 * The layout is the kit's own, on `uv1` (glTF `TEXCOORD_1`), so UV0 stays
 * whatever each primitive carried (`uvAlike`'s zeros included) and the trim
 * sheets of #1005 keep that channel. Charts are grown over shared edges
 * while a face stays within `maxAngleDeg` of the chart's seed, projected on
 * the chart's mean normal, and shelf-packed with a `gutter` of texels round
 * each; a face can stretch by at most 1/cos(maxAngleDeg), 1.56 at 50°. The
 * occluders are every solid part (glb.mjs `occludes`: a haze blended under
 * half opacity shades nothing), in one BVH; each texel casts `rays`
 * cosine-weighted rays out of its hemisphere, and a ray that meets a face
 * inside `reach` darkens the texel by how near the face is. `reach` is a
 * quarter of the model's longest axis unless the script says otherwise: far
 * enough for a dome to shade the plinth under it, near enough that the
 * open side of a hull reads open. The texel's own surface is skipped by a
 * bias along its normal, and the gutters are filled from the texels beside
 * them so bilinear filtering never reads an empty texel at a seam.
 *
 * GLTFExporter writes the `uv1` attribute (its TEXCOORD_1) and cannot write
 * the image (kit.mjs, the header), so `embedOcclusion` opens the binary it
 * wrote, appends the PNG to the buffer as one more buffer view, and gives
 * every solid material an `occlusionTexture` on texCoord 1. GLTFLoader reads
 * that back as `aoMap` on channel 1 (three r152+), which `rosterModels.ts`
 * carries through its recolour and its merge. A Node-side reader uses
 * glb.mjs and png.mjs, never GLTFLoader, which needs a browser to decode an
 * image.
 */
import * as THREE from 'three';
import { occludes } from './glb.mjs';
import { encodeGray } from './png.mjs';

/** The `aoMap` channel: glTF TEXCOORD_1, three's `uv1`. */
export const TEXCOORD = 1;

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Whether a live material shades, by the rule glb.mjs reads a file with. */
function solid(material) {
  return occludes({
    alpha: material.transparent ? 'BLEND' : material.alphaTest > 0 ? 'MASK' : 'OPAQUE',
    opacity: material.opacity ?? 1,
  });
}

/**
 * Lay every mesh of `root` out on a `size` × `size` atlas, writing `uv1`,
 * and bake the occlusion into a grey map. Returns `{ size, pixels, png,
 * materials, charts, texels, coverage, rays, reach, ms }`: `materials` the
 * names of the solid materials the map is for, `coverage` the share of the
 * atlas the charts fill, `texels` the count baked.
 */
export function bakeOcclusion(
  root,
  { size = 512, rays = 64, reach = null, gutter = 2, maxAngleDeg = 50, bias = null } = {}
) {
  const started = Date.now();
  root.updateMatrixWorld(true);

  // A geometry two meshes share would want two layouts, so the second mesh
  // gets its own copy: a vertex count the exporter now writes twice, and no
  // triangle moved.
  const seen = new Set();
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (seen.has(o.geometry)) o.geometry = o.geometry.clone();
    seen.add(o.geometry);
    meshes.push(o);
  });
  if (meshes.length === 0) throw new Error('bakeOcclusion: no meshes');

  const box = new THREE.Box3().setFromObject(root);
  const longest = Math.max(...box.getSize(new THREE.Vector3()).toArray());
  const reachM = reach ?? longest / 4;
  const biasM = bias ?? Math.max(longest * 1e-4, 1e-3);

  const built = meshes.map((mesh) => worldTriangles(mesh));
  const charts = built.flatMap((b) =>
    chartsOf(b, Math.cos((maxAngleDeg * Math.PI) / 180)).flatMap((c) => compact(b, c))
  );
  const { density } = pack(charts, size, gutter);
  for (const b of built) writeUv1(b, size);

  const bvh = buildBvh(built.filter((b) => solid(b.mesh.material)).map((b) => b.pos));
  const { pixels, covered, texels } = rasteriseAndBake(charts, size, {
    bvh,
    rays,
    reach: reachM,
    bias: biasM,
  });
  dilate(pixels, covered, size, gutter + 1);

  const materials = new Set();
  for (const b of built) if (solid(b.mesh.material)) materials.add(b.mesh.material.name);
  return {
    size,
    pixels,
    png: encodeGray(size, size, pixels),
    materials,
    charts: charts.length,
    texels,
    coverage: texels / (size * size),
    rays,
    reach: reachM,
    density,
    ms: Date.now() - started,
  };
}

/**
 * One mesh's triangles in world space: `pos` nine floats a triangle, `nrm`
 * the geometry's own vertex normals at those corners (world, unit) or the
 * face normal where a geometry has none, `face` the winding normal turned
 * back on a mirrored mesh, `corner` each corner's vertex index.
 */
function worldTriangles(mesh) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const n = g.attributes.normal ?? null;
  const idx = g.index;
  const count = idx ? idx.count : p.count;
  const m = mesh.matrixWorld;
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  const mirrored = m.determinant() < 0;
  const pos = new Float64Array(count * 3);
  const nrm = new Float64Array(count * 3);
  const face = new Float64Array(count);
  const corner = new Uint32Array(count);
  const v = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  for (let k = 0; k < count; k++) {
    const i = idx ? idx.getX(k) : k;
    corner[k] = i;
    v.fromBufferAttribute(p, i).applyMatrix4(m);
    pos[k * 3] = v.x;
    pos[k * 3 + 1] = v.y;
    pos[k * 3 + 2] = v.z;
    if (n) {
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      nrm[k * 3] = v.x;
      nrm[k * 3 + 1] = v.y;
      nrm[k * 3 + 2] = v.z;
    }
  }
  for (let t = 0; t < count; t += 3) {
    const o = t * 3;
    e1.set(pos[o + 3] - pos[o], pos[o + 4] - pos[o + 1], pos[o + 5] - pos[o + 2]);
    e2.set(pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]);
    v.crossVectors(e1, e2);
    const len = v.length();
    if (len > 0) v.divideScalar(len);
    if (mirrored) v.negate();
    face[t] = v.x;
    face[t + 1] = v.y;
    face[t + 2] = v.z;
    if (!n)
      for (let c = 0; c < 3; c++) {
        nrm[(t + c) * 3] = v.x;
        nrm[(t + c) * 3 + 1] = v.y;
        nrm[(t + c) * 3 + 2] = v.z;
      }
  }
  return {
    mesh,
    tris: count / 3,
    pos,
    nrm,
    face,
    corner,
    chartOf: new Int32Array(count / 3).fill(-1),
    uv1: new Float32Array(count * 2),
    charts: [],
  };
}

/**
 * Grow charts over a mesh's shared edges: a triangle joins the chart of a
 * neighbour while its face normal is within the angle of the chart's seed.
 * Edges are matched by position, since an extruded plate repeats a vertex
 * for every face that uses it. Returns the mesh's charts, written into `b`.
 */
function chartsOf(b, cosMax) {
  const { pos, face, tris } = b;
  const key = (t, c) => {
    const i = (t * 3 + c) * 3;
    return `${pos[i].toFixed(5)},${pos[i + 1].toFixed(5)},${pos[i + 2].toFixed(5)}`;
  };
  const edgeKey = (a, c) => (a < c ? `${a}|${c}` : `${c}|${a}`);
  const edges = new Map();
  const keys = new Array(tris);
  for (let t = 0; t < tris; t++) {
    const k = [key(t, 0), key(t, 1), key(t, 2)];
    keys[t] = k;
    for (let e = 0; e < 3; e++) {
      const edge = edgeKey(k[e], k[(e + 1) % 3]);
      const list = edges.get(edge);
      if (list) list.push(t);
      else edges.set(edge, [t]);
    }
  }
  for (let seed = 0; seed < tris; seed++) {
    if (b.chartOf[seed] !== -1) continue;
    const id = b.charts.length;
    const sx = face[seed * 3];
    const sy = face[seed * 3 + 1];
    const sz = face[seed * 3 + 2];
    const members = [seed];
    b.chartOf[seed] = id;
    for (let q = 0; q < members.length; q++) {
      const k = keys[members[q]];
      for (let e = 0; e < 3; e++) {
        for (const u of edges.get(edgeKey(k[e], k[(e + 1) % 3]))) {
          if (b.chartOf[u] !== -1) continue;
          if (face[u * 3] * sx + face[u * 3 + 1] * sy + face[u * 3 + 2] * sz < cosMax) continue;
          b.chartOf[u] = id;
          members.push(u);
        }
      }
    }
    b.charts.push(chartBasis(b, id, members));
  }
  return b.charts;
}

/** A chart's plane, and every corner's (s, t) on it. */
function chartBasis(b, id, members) {
  const { pos, face } = b;
  const n = new THREE.Vector3();
  const a = new THREE.Vector3();
  const c = new THREE.Vector3();
  const f = new THREE.Vector3();
  for (const t of members) {
    // Area-weighted: the cross product's length is twice the area.
    const o = t * 9;
    a.set(pos[o + 3] - pos[o], pos[o + 4] - pos[o + 1], pos[o + 5] - pos[o + 2]);
    c.set(pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]);
    a.cross(c);
    f.set(face[t * 3], face[t * 3 + 1], face[t * 3 + 2]);
    if (a.dot(f) < 0) a.negate();
    n.add(a);
  }
  if (n.lengthSq() === 0)
    n.set(face[members[0] * 3], face[members[0] * 3 + 1], face[members[0] * 3 + 2]);
  if (n.lengthSq() === 0) n.set(0, 1, 0);
  n.normalize();
  // The world axis least along the normal seeds the basis, so a chart on a
  // deck and one on a wall both come out upright.
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  const axis =
    ax <= ay && ax <= az
      ? new THREE.Vector3(1, 0, 0)
      : ay <= az
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
  const u = new THREE.Vector3().crossVectors(n, axis).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  const st = new Float64Array(members.length * 6);
  let minS = Infinity;
  let minT = Infinity;
  let maxS = -Infinity;
  let maxT = -Infinity;
  for (let m = 0; m < members.length; m++) {
    const t = members[m];
    for (let k = 0; k < 3; k++) {
      const i = t * 9 + k * 3;
      const s = pos[i] * u.x + pos[i + 1] * u.y + pos[i + 2] * u.z;
      const tt = pos[i] * v.x + pos[i + 1] * v.y + pos[i + 2] * v.z;
      st[m * 6 + k * 2] = s;
      st[m * 6 + k * 2 + 1] = tt;
      if (s < minS) minS = s;
      if (s > maxS) maxS = s;
      if (tt < minT) minT = tt;
      if (tt > maxT) maxT = tt;
    }
  }
  return {
    b,
    id,
    members,
    st,
    minS,
    minT,
    wM: maxS - minS,
    hM: maxT - minT,
    x0: 0,
    y0: 0,
    w: 1,
    h: 1,
  };
}

/** The share of a chart's box its triangles cover, in its own plane. */
function fill(c) {
  let area = 0;
  for (let m = 0; m < c.members.length; m++) {
    const o = m * 6;
    area += Math.abs(
      (c.st[o + 2] - c.st[o]) * (c.st[o + 5] - c.st[o + 1]) -
        (c.st[o + 4] - c.st[o]) * (c.st[o + 3] - c.st[o + 1])
    );
  }
  return area / 2 / Math.max(c.wM * c.hM, 1e-12);
}

/**
 * A chart that fills under `MIN_FILL` of its own box — a band's top face is
 * an annulus, a rib's a quarter of one — is cut at the middle of its longer
 * axis, each half a chart on the same plane, until every piece fills its
 * box or is down to two triangles. An atlas packs boxes, so an annulus
 * packed whole would carry its empty middle; four quarters carry less.
 */
const MIN_FILL = 0.45;
function compact(b, c) {
  if (c.members.length <= 2 || fill(c) >= MIN_FILL) return [c];
  const alongS = c.wM >= c.hM;
  const cut = alongS ? c.minS + c.wM / 2 : c.minT + c.hM / 2;
  const lo = [];
  const hi = [];
  for (let m = 0; m < c.members.length; m++) {
    const o = m * 6 + (alongS ? 0 : 1);
    const centre = (c.st[o] + c.st[o + 2] + c.st[o + 4]) / 3;
    (centre < cut ? lo : hi).push(m);
  }
  if (lo.length === 0 || hi.length === 0) return [c];
  const piece = (ms) => {
    const members = ms.map((m) => c.members[m]);
    const st = new Float64Array(ms.length * 6);
    let minS = Infinity;
    let minT = Infinity;
    let maxS = -Infinity;
    let maxT = -Infinity;
    ms.forEach((m, i) => {
      for (let k = 0; k < 6; k++) st[i * 6 + k] = c.st[m * 6 + k];
      for (let k = 0; k < 3; k++) {
        const sv = st[i * 6 + k * 2];
        const tv = st[i * 6 + k * 2 + 1];
        if (sv < minS) minS = sv;
        if (sv > maxS) maxS = sv;
        if (tv < minT) minT = tv;
        if (tv > maxT) maxT = tv;
      }
    });
    const id = b.charts.length;
    const out = { ...c, id, members, st, minS, minT, wM: maxS - minS, hM: maxT - minT };
    b.charts.push(out);
    for (const t of members) b.chartOf[t] = id;
    return out;
  };
  return [...compact(b, piece(lo)), ...compact(b, piece(hi))];
}

/**
 * Pack the charts into the atlas at the greatest texel density that fits,
 * each with `gutter` texels round it. Tallest first onto a skyline, each
 * at the lowest place it fits and the leftmost of those; the density steps
 * down by four percent until everything lands.
 */
function pack(charts, size, gutter) {
  const area = charts.reduce((s, c) => s + Math.max(c.wM, 1e-6) * Math.max(c.hM, 1e-6), 0);
  let density = Math.sqrt((size * size * 0.8) / area);
  const order = charts.slice();
  for (let attempt = 0; attempt < 400; attempt++) {
    for (const c of order) {
      c.w = Math.max(1, Math.ceil(c.wM * density));
      c.h = Math.max(1, Math.ceil(c.hM * density));
    }
    order.sort((p, q) => q.h - p.h || q.w - p.w || p.b.tris - q.b.tris || p.id - q.id);
    if (skyline(order, size, gutter)) return { density };
    density *= 0.96;
  }
  throw new Error(`bakeOcclusion: ${charts.length} charts do not fit a ${size}² atlas`);
}

/**
 * Place every chart on a skyline, in the order given: the lowest spot it
 * fits across the width, the leftmost of those. True when all land.
 */
function skyline(order, size, gutter) {
  // Segments [x, y, width] left to right, covering the atlas's width.
  let line = [[0, 0, size]];
  for (const c of order) {
    const cw = c.w + 2 * gutter;
    const ch = c.h + 2 * gutter;
    if (cw > size) return false;
    let bestY = Infinity;
    let bestX = -1;
    for (let i = 0; i < line.length; i++) {
      const x = line[i][0];
      if (x + cw > size) break;
      // The height this rect would sit at from segment i: the tallest
      // segment under its width.
      let y = 0;
      let span = 0;
      for (let j = i; j < line.length && span < cw; j++) {
        if (line[j][1] > y) y = line[j][1];
        span += line[j][2];
      }
      if (y + ch <= size && y < bestY) {
        bestY = y;
        bestX = x;
      }
    }
    if (bestX < 0) return false;
    c.x0 = bestX + gutter;
    c.y0 = bestY + gutter;
    // Raise the skyline under the rect.
    const next = [];
    let placed = false;
    for (const [x, y, w] of line) {
      const end = x + w;
      if (end <= bestX || x >= bestX + cw) {
        next.push([x, y, w]);
        continue;
      }
      if (x < bestX) next.push([x, y, bestX - x]);
      if (!placed) {
        next.push([bestX, bestY + ch, cw]);
        placed = true;
      }
      if (end > bestX + cw) next.push([bestX + cw, y, end - bestX - cw]);
    }
    // Merge neighbours at one height, so the line stays short.
    line = [];
    for (const seg of next) {
      const last = line[line.length - 1];
      if (last && last[1] === seg[1] && last[0] + last[2] === seg[0]) last[2] += seg[2];
      else line.push(seg);
    }
  }
  return true;
}

/** A corner's texel coordinates in its chart: the chart's metres spread over its texels. */
function texelOf(c, m, k) {
  const s = c.st[m * 6 + k * 2];
  const t = c.st[m * 6 + k * 2 + 1];
  return [
    c.x0 + (c.wM > 0 ? ((s - c.minS) / c.wM) * c.w : 0.5),
    c.y0 + (c.hM > 0 ? ((t - c.minT) / c.hM) * c.h : 0.5),
  ];
}

/**
 * Write each corner's `uv1` and, on an indexed geometry, split the vertices
 * that straddle charts so one index can hold one UV. Nothing moves: a split
 * copies a vertex's position, normal and UV0 as they were.
 */
function writeUv1(b, size) {
  const { mesh, uv1, corner } = b;
  for (const c of b.charts) {
    for (let m = 0; m < c.members.length; m++) {
      const t = c.members[m];
      for (let k = 0; k < 3; k++) {
        const [px, py] = texelOf(c, m, k);
        uv1[(t * 3 + k) * 2] = px / size;
        uv1[(t * 3 + k) * 2 + 1] = py / size;
      }
    }
  }
  const g = mesh.geometry;
  if (!g.index) {
    g.setAttribute('uv1', new THREE.Float32BufferAttribute(uv1, 2));
    return;
  }
  const count = corner.length;
  const vertices = g.attributes.position.count;
  const remap = new Map();
  const newIndex = [];
  const sources = [];
  for (let k = 0; k < count; k++) {
    const key = b.chartOf[Math.floor(k / 3)] * vertices + corner[k];
    let v = remap.get(key);
    if (v === undefined) {
      v = sources.length;
      remap.set(key, v);
      sources.push(k);
    }
    newIndex.push(v);
  }
  for (const [name, attr] of Object.entries(g.attributes)) {
    const out = new Float32Array(sources.length * attr.itemSize);
    for (let v = 0; v < sources.length; v++) {
      const i = corner[sources[v]];
      for (let j = 0; j < attr.itemSize; j++)
        out[v * attr.itemSize + j] = attr.array[i * attr.itemSize + j];
    }
    g.setAttribute(name, new THREE.Float32BufferAttribute(out, attr.itemSize, attr.normalized));
  }
  const uv = new Float32Array(sources.length * 2);
  for (let v = 0; v < sources.length; v++) {
    uv[v * 2] = uv1[sources[v] * 2];
    uv[v * 2 + 1] = uv1[sources[v] * 2 + 1];
  }
  g.setAttribute('uv1', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(newIndex);
}

/* --------------------------------------------------------------------------
 * The bake: a BVH over the solid triangles, and a cosine-weighted hemisphere
 * cast from every texel a chart covers.
 * ------------------------------------------------------------------------ */

const LEAF = 4;

/** A BVH over triangle soups, each a `Float64Array` of nine floats a triangle. */
function buildBvh(soups) {
  let total = 0;
  for (const s of soups) total += s.length;
  const tri = new Float64Array(total);
  let o = 0;
  for (const s of soups) {
    tri.set(s, o);
    o += s.length;
  }
  const n = total / 9;
  const centroid = new Float64Array(n * 3);
  for (let t = 0; t < n; t++)
    for (let d = 0; d < 3; d++)
      centroid[t * 3 + d] = (tri[t * 9 + d] + tri[t * 9 + 3 + d] + tri[t * 9 + 6 + d]) / 3;
  const order = Uint32Array.from({ length: n }, (_, i) => i);
  // Nodes flat: six bounds a node, four ints — left, right, start, count —
  // and the axis an inner node split on.
  const bounds = [];
  const links = [];
  const axes = [];
  const build = (start, end) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = start; i < end; i++) {
      const t = order[i];
      for (let k = 0; k < 9; k += 3)
        for (let d = 0; d < 3; d++) {
          const v = tri[t * 9 + k + d];
          if (v < min[d]) min[d] = v;
          if (v > max[d]) max[d] = v;
        }
    }
    const id = links.length / 4;
    bounds.push(...min, ...max);
    links.push(-1, -1, start, end - start);
    axes.push(0);
    if (end - start > LEAF) {
      let axis = 0;
      let best = -1;
      for (let d = 0; d < 3; d++) {
        const ext = max[d] - min[d];
        if (ext > best) {
          best = ext;
          axis = d;
        }
      }
      // The sort is total — centroid, then index — so the tree is the same
      // tree on every run, which the round trip relies on.
      const slice = Array.from(order.subarray(start, end)).sort(
        (p, q) => centroid[p * 3 + axis] - centroid[q * 3 + axis] || p - q
      );
      order.set(slice, start);
      const mid = (start + end) >> 1;
      axes[id] = axis;
      links[id * 4 + 3] = 0;
      links[id * 4] = build(start, mid);
      links[id * 4 + 1] = build(mid, end);
    }
    return id;
  };
  if (n > 0) build(0, n);
  // Triangles in traversal order, each as a corner and two edges, so a leaf
  // reads nine floats in a row and derives nothing.
  const packed = new Float64Array(n * 9);
  for (let i = 0; i < n; i++) {
    const u = order[i] * 9;
    for (let d = 0; d < 3; d++) {
      packed[i * 9 + d] = tri[u + d];
      packed[i * 9 + 3 + d] = tri[u + 3 + d] - tri[u + d];
      packed[i * 9 + 6 + d] = tri[u + 6 + d] - tri[u + d];
    }
  }
  return {
    packed,
    bounds: Float64Array.from(bounds),
    links: Int32Array.from(links),
    axes: Int8Array.from(axes),
    n,
    stack: new Int32Array(Math.max(2, links.length / 2)),
  };
}

/** The nearest hit along the ray inside `tMax`, or Infinity. */
function castRay(bvh, ox, oy, oz, dx, dy, dz, tMax) {
  if (bvh.n === 0) return Infinity;
  const { packed, bounds, links, axes, stack } = bvh;
  const ix = 1 / dx;
  const iy = 1 / dy;
  const iz = 1 / dz;
  // Which child lies nearer along the ray on each axis: the left holds the
  // smaller centroids, so it is first when the ray runs positive.
  const nearLeft = [dx >= 0, dy >= 0, dz >= 0];
  let best = tMax;
  let top = 0;
  stack[top++] = 0;
  while (top > 0) {
    const node = stack[--top];
    const b = node * 6;
    let t0 = (bounds[b] - ox) * ix;
    let t1 = (bounds[b + 3] - ox) * ix;
    let tmin = Math.min(t0, t1);
    let tmax = Math.max(t0, t1);
    t0 = (bounds[b + 1] - oy) * iy;
    t1 = (bounds[b + 4] - oy) * iy;
    tmin = Math.max(tmin, Math.min(t0, t1));
    tmax = Math.min(tmax, Math.max(t0, t1));
    t0 = (bounds[b + 2] - oz) * iz;
    t1 = (bounds[b + 5] - oz) * iz;
    tmin = Math.max(tmin, Math.min(t0, t1));
    tmax = Math.min(tmax, Math.max(t0, t1));
    if (tmax < Math.max(tmin, 0) || tmin > best) continue;
    const l = node * 4;
    if (links[l] >= 0) {
      // The nearer child is pushed last, so it is popped first and its hit
      // prunes the farther one.
      if (nearLeft[axes[node]]) {
        stack[top++] = links[l + 1];
        stack[top++] = links[l];
      } else {
        stack[top++] = links[l];
        stack[top++] = links[l + 1];
      }
      continue;
    }
    const start = links[l + 2];
    const end = start + links[l + 3];
    for (let i = start; i < end; i++) {
      const u = i * 9;
      // Möller–Trumbore, both faces, so a hull's inside shades its own
      // crevices as its outside does.
      const e1x = packed[u + 3];
      const e1y = packed[u + 4];
      const e1z = packed[u + 5];
      const e2x = packed[u + 6];
      const e2y = packed[u + 7];
      const e2z = packed[u + 8];
      const hx = dy * e2z - dz * e2y;
      const hy = dz * e2x - dx * e2z;
      const hz = dx * e2y - dy * e2x;
      const det = e1x * hx + e1y * hy + e1z * hz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det;
      const sx = ox - packed[u];
      const sy = oy - packed[u + 1];
      const sz = oz - packed[u + 2];
      const b1 = (sx * hx + sy * hy + sz * hz) * inv;
      if (b1 < 0 || b1 > 1) continue;
      const qx = sy * e1z - sz * e1y;
      const qy = sz * e1x - sx * e1z;
      const qz = sx * e1y - sy * e1x;
      const b2 = (dx * qx + dy * qy + dz * qz) * inv;
      if (b2 < 0 || b1 + b2 > 1) continue;
      const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (t > 1e-9 && t < best) best = t;
    }
  }
  return best < tMax ? best : Infinity;
}

/** A 32-bit integer hash, for the per-texel turn of the ray set. */
function hash(i) {
  let h = (i ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** How far a triangle's edge is widened, in texels, so edge texels are drawn from a face. */
const EXPAND = 0.75;

/**
 * Rasterise every chart's triangles into the atlas and cast the hemisphere
 * from each covered texel. A texel is covered when its centre is inside a
 * triangle widened by `EXPAND`; a texel inside a face proper keeps that
 * face against a neighbour's widening. `covered` marks what was drawn, for
 * the gutter fill.
 */
function rasteriseAndBake(charts, size, { bvh, rays, reach, bias }) {
  const pixels = new Uint8Array(size * size).fill(255);
  const covered = new Uint8Array(size * size);
  // The ray set: `rays` cosine-weighted directions about +z, a Fibonacci
  // spiral on the disc lifted to the hemisphere (Malley's method).
  const dir = new Float64Array(rays * 3);
  for (let i = 0; i < rays; i++) {
    const r = Math.sqrt((i + 0.5) / rays);
    const phi = i * GOLDEN;
    dir[i * 3] = r * Math.cos(phi);
    dir[i * 3 + 1] = r * Math.sin(phi);
    dir[i * 3 + 2] = Math.sqrt(Math.max(0, 1 - r * r));
  }
  let texels = 0;
  const x = [0, 0, 0];
  const y = [0, 0, 0];
  for (const c of charts) {
    const { b, members } = c;
    const P = b.pos;
    const N = b.nrm;
    for (let m = 0; m < members.length; m++) {
      const t = members[m];
      for (let k = 0; k < 3; k++) [x[k], y[k]] = texelOf(c, m, k);
      const area = (x[1] - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (y[1] - y[0]);
      const sign = area < 0 ? -1 : 1;
      const px0 = Math.max(0, Math.floor(Math.min(x[0], x[1], x[2]) - EXPAND));
      const px1 = Math.min(size - 1, Math.ceil(Math.max(x[0], x[1], x[2]) + EXPAND));
      const py0 = Math.max(0, Math.floor(Math.min(y[0], y[1], y[2]) - EXPAND));
      const py1 = Math.min(size - 1, Math.ceil(Math.max(y[0], y[1], y[2]) + EXPAND));
      // Each edge function below is a signed distance times its edge's
      // length, so the widening is measured in texels.
      const len0 = Math.hypot(x[2] - x[1], y[2] - y[1]);
      const len1 = Math.hypot(x[0] - x[2], y[0] - y[2]);
      const len2 = Math.hypot(x[1] - x[0], y[1] - y[0]);
      for (let py = py0; py <= py1; py++) {
        const cy = py + 0.5;
        for (let px = px0; px <= px1; px++) {
          const cx = px + 0.5;
          let w0 = sign * ((x[2] - x[1]) * (cy - y[1]) - (y[2] - y[1]) * (cx - x[1]));
          let w1 = sign * ((x[0] - x[2]) * (cy - y[2]) - (y[0] - y[2]) * (cx - x[2]));
          let w2 = sign * ((x[1] - x[0]) * (cy - y[0]) - (y[1] - y[0]) * (cx - x[0]));
          if (w0 < -EXPAND * len0 || w1 < -EXPAND * len1 || w2 < -EXPAND * len2) continue;
          const i = py * size + px;
          const inside = w0 >= 0 && w1 >= 0 && w2 >= 0;
          if (covered[i] === 2 || (covered[i] === 1 && !inside)) continue;
          if (covered[i] === 0) texels++;
          covered[i] = inside ? 2 : 1;
          w0 = Math.max(0, w0);
          w1 = Math.max(0, w1);
          w2 = Math.max(0, w2);
          let sum = w0 + w1 + w2;
          if (sum <= 0) {
            w0 = w1 = w2 = 1;
            sum = 3;
          }
          const l0 = w0 / sum;
          const l1 = w1 / sum;
          const l2 = w2 / sum;
          const o = t * 9;
          let nx = l0 * N[o] + l1 * N[o + 3] + l2 * N[o + 6];
          let ny = l0 * N[o + 1] + l1 * N[o + 4] + l2 * N[o + 7];
          let nz = l0 * N[o + 2] + l1 * N[o + 5] + l2 * N[o + 8];
          const nl = Math.hypot(nx, ny, nz);
          if (nl === 0) {
            nx = b.face[t * 3];
            ny = b.face[t * 3 + 1];
            nz = b.face[t * 3 + 2];
          } else {
            nx /= nl;
            ny /= nl;
            nz /= nl;
          }
          const ox = l0 * P[o] + l1 * P[o + 3] + l2 * P[o + 6] + nx * bias;
          const oy = l0 * P[o + 1] + l1 * P[o + 4] + l2 * P[o + 7] + ny * bias;
          const oz = l0 * P[o + 2] + l1 * P[o + 5] + l2 * P[o + 8] + nz * bias;
          pixels[i] = Math.round(
            255 * skyAt(bvh, dir, rays, ox, oy, oz, nx, ny, nz, reach, hash(i))
          );
        }
      }
    }
  }
  return { pixels, covered, texels };
}

/** The share of the hemisphere about (nx, ny, nz) that reaches the sky, 0..1. */
function skyAt(bvh, dir, rays, ox, oy, oz, nx, ny, nz, reach, h) {
  // A tangent frame (Duff et al. 2017), turned about the normal by the
  // texel's hash so neighbouring texels do not share one ray set's banding.
  const s = nz >= 0 ? 1 : -1;
  const a = -1 / (s + nz);
  const bb = nx * ny * a;
  const tx0 = 1 + s * nx * nx * a;
  const ty0 = s * bb;
  const tz0 = -s * nx;
  const ux0 = bb;
  const uy0 = s + ny * ny * a;
  const uz0 = -ny;
  const turn = ((h >>> 8) / 0x1000000) * 2 * Math.PI;
  const ct = Math.cos(turn);
  const st = Math.sin(turn);
  const tx = ct * tx0 + st * ux0;
  const ty = ct * ty0 + st * uy0;
  const tz = ct * tz0 + st * uz0;
  const ux = -st * tx0 + ct * ux0;
  const uy = -st * ty0 + ct * uy0;
  const uz = -st * tz0 + ct * uz0;
  let shade = 0;
  for (let i = 0; i < rays; i++) {
    const d0 = dir[i * 3];
    const d1 = dir[i * 3 + 1];
    const d2 = dir[i * 3 + 2];
    const dx = d0 * tx + d1 * ux + d2 * nx;
    const dy = d0 * ty + d1 * uy + d2 * ny;
    const dz = d0 * tz + d1 * uz + d2 * nz;
    const t = castRay(bvh, ox, oy, oz, dx, dy, dz, reach);
    if (t < reach) shade += 1 - t / reach;
  }
  return 1 - shade / rays;
}

/**
 * Fill the gutters: `passes` rings of undrawn texels each take the mean of
 * the drawn texels beside them, so a bilinear read across a chart's edge
 * finds the chart's own shade rather than the atlas's white.
 */
function dilate(pixels, covered, size, passes) {
  let mark = Uint8Array.from(covered, (v) => (v ? 1 : 0));
  for (let pass = 0; pass < passes; pass++) {
    const next = mark.slice();
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        if (mark[i]) continue;
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
            const j = yy * size + xx;
            if (mark[j]) {
              sum += pixels[j];
              n++;
            }
          }
        if (n) {
          pixels[i] = Math.round(sum / n);
          next[i] = 1;
        }
      }
    mark = next;
  }
}

/* --------------------------------------------------------------------------
 * The glTF: the image into the binary GLTFExporter wrote.
 * ------------------------------------------------------------------------ */

const MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const pad4 = (n) => (n + 3) & ~3;

/**
 * The GLB with the occlusion map in it: `glb` as GLTFExporter gave it (an
 * ArrayBuffer or Buffer), `ao` as `bakeOcclusion` returned it. The PNG goes
 * on the end of the binary chunk as one more buffer view, and every
 * material named in `ao.materials` gets `occlusionTexture` on
 * TEXCOORD_1 at strength 1. A material the bake did not name — a haze — is
 * left as it was. Returns a Buffer.
 */
export function embedOcclusion(glb, ao, { name = 'occlusion' } = {}) {
  const buf = Buffer.isBuffer(glb) ? glb : Buffer.from(glb);
  if (buf.readUInt32LE(0) !== MAGIC || buf.readUInt32LE(4) !== 2)
    throw new Error('embedOcclusion: not a glTF 2 binary');
  let off = 12;
  let json = null;
  let bin = Buffer.alloc(0);
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === CHUNK_JSON) json = JSON.parse(body.toString('utf8'));
    else if (type === CHUNK_BIN) bin = body;
    off += 8 + len;
  }
  if (!json) throw new Error('embedOcclusion: no JSON chunk');
  if (json.images?.length || json.textures?.length)
    throw new Error('embedOcclusion: the file already carries an image');

  const binLength = pad4(bin.length);
  const png = ao.png;
  const out = Buffer.alloc(binLength + pad4(png.length));
  bin.copy(out, 0);
  png.copy(out, binLength);
  json.buffers = json.buffers ?? [{}];
  json.buffers[0].byteLength = out.length;
  json.bufferViews = json.bufferViews ?? [];
  const view =
    json.bufferViews.push({ buffer: 0, byteOffset: binLength, byteLength: png.length }) - 1;
  json.images = [{ bufferView: view, mimeType: 'image/png', name }];
  // Linear, mipmapped, clamped: the atlas has no reason to repeat, and a
  // wrap across its edge would read one chart's gutter from another's.
  json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
  json.textures = [{ sampler: 0, source: 0, name }];
  let given = 0;
  for (const m of json.materials ?? []) {
    if (!ao.materials.has(m.name)) continue;
    m.occlusionTexture = { index: 0, texCoord: TEXCOORD };
    given++;
  }
  if (given === 0) throw new Error('embedOcclusion: no material named by the bake is in the file');

  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonLength = pad4(jsonBytes.length);
  const total = 12 + 8 + jsonLength + 8 + out.length;
  const result = Buffer.alloc(total, 0);
  result.writeUInt32LE(MAGIC, 0);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(total, 8);
  result.writeUInt32LE(jsonLength, 12);
  result.writeUInt32LE(CHUNK_JSON, 16);
  jsonBytes.copy(result, 20);
  result.fill(0x20, 20 + jsonBytes.length, 20 + jsonLength);
  const binAt = 20 + jsonLength;
  result.writeUInt32LE(out.length, binAt);
  result.writeUInt32LE(CHUNK_BIN, binAt + 4);
  out.copy(result, binAt + 8);
  return result;
}

/**
 * The same GLB without its occlusion map: the image, texture and sampler
 * gone and no material naming one, the geometry and its `uv1` as they were.
 * For a reader that parses a committed file in Node through GLTFLoader —
 * the frontend's roster tests — which decodes an image through
 * `ImageBitmap` or an `<img>` and has neither there, and measures nothing
 * the map changes: scale, seating, a lamp's rest. A file carrying no map
 * is returned as it came. Takes an ArrayBuffer or a Buffer and returns an
 * ArrayBuffer, which is what `parseAsync` takes.
 */
export function stripOcclusion(glb) {
  const buf = Buffer.isBuffer(glb) ? glb : Buffer.from(glb);
  if (buf.readUInt32LE(0) !== MAGIC || buf.readUInt32LE(4) !== 2)
    throw new Error('stripOcclusion: not a glTF 2 binary');
  let off = 12;
  let json = null;
  let bin = Buffer.alloc(0);
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === CHUNK_JSON) json = JSON.parse(body.toString('utf8'));
    else if (type === CHUNK_BIN) bin = body;
    off += 8 + len;
  }
  if (!json) throw new Error('stripOcclusion: no JSON chunk');
  if (!(json.materials ?? []).some((m) => m.occlusionTexture))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  for (const m of json.materials) delete m.occlusionTexture;
  delete json.images;
  delete json.textures;
  delete json.samplers;
  // The PNG's buffer view stays, unreferenced: the binary is left as it is,
  // and a view nothing names costs a loader nothing.
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonLength = pad4(jsonBytes.length);
  const binLength = pad4(bin.length);
  const total = 12 + 8 + jsonLength + 8 + binLength;
  const out = Buffer.alloc(total, 0);
  out.writeUInt32LE(MAGIC, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonLength, 12);
  out.writeUInt32LE(CHUNK_JSON, 16);
  jsonBytes.copy(out, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonLength);
  out.writeUInt32LE(binLength, 20 + jsonLength);
  out.writeUInt32LE(CHUNK_BIN, 24 + jsonLength);
  bin.copy(out, 28 + jsonLength);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}
