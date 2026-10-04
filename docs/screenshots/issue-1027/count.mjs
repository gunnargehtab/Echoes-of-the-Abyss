/**
 * #1027's counted half: what a berth costs the conn view, per navy, off the
 * committed GLBs. `mergeByMaterial` (rosterModels.ts) draws one mesh per
 * material, so a hull's calls are its distinct materials; its triangles are
 * its index (or position) count over three.
 *
 *   npm run build:shared && node docs/screenshots/issue-1027/count.mjs
 *
 * Prints, for each navy, the three hulls it can build with the most calls per
 * berth and the three with the most triangles per berth, and its structures.
 * A count, not a measurement: README.md has the frames.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const shared = await import(pathToFileURL(join(root, 'packages/shared/dist/index.js')).href);
const { Faction, UnitKind, UNIT_STATS, PRODUCIBLE, StructureKind, unitAvailableTo } = shared;

const source = readFileSync(join(root, 'packages/frontend/src/game/rosterModels.ts'), 'utf8');
const unitSlug = Object.fromEntries(
  [...source.matchAll(/\[UnitKind\.(\w+)\]: '([a-z-]+)'/g)].map((m) => [m[1], m[2]])
);
const structureSlug = Object.fromEntries(
  [...source.matchAll(/\[StructureKind\.(\w+)\]: '([a-z-]+)'/g)].map((m) => [m[1], m[2]])
);

/** Distinct materials and triangles of one committed model, or null. */
function model(slug) {
  const file = join(root, 'docs/concept-art/models', `${slug}.glb`);
  if (!existsSync(file)) return null;
  const glb = readFileSync(file);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const materials = new Set();
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      materials.add(primitive.material ?? 'default');
      const accessor = json.accessors[primitive.indices ?? primitive.attributes.POSITION];
      triangles += accessor.count / 3;
    }
  }
  return { calls: materials.size, triangles };
}

const buildable = new Set(Object.values(PRODUCIBLE).flat());
const named = (enumObject) => Object.entries(enumObject).filter(([, v]) => typeof v === 'number');

for (const [navy, faction] of named(Faction)) {
  const suffix = navy.toLowerCase();
  const hulls = [];
  for (const [name, kind] of named(UnitKind)) {
    if (!buildable.has(kind) || !unitAvailableTo(kind, faction)) continue;
    const counted = model(`${unitSlug[name]}-${suffix}`);
    if (counted === null) continue;
    const berths = UNIT_STATS[kind].berths;
    hulls.push({ name, berths, ...counted });
  }
  const top = (key) =>
    [...hulls]
      .sort((a, b) => b[key] / b.berths - a[key] / a.berths)
      .slice(0, 3)
      .map((h) => `${h.name} ${h[key]}/${h.berths}`)
      .join(', ');
  const structures = named(StructureKind)
    .map(([name]) => [name, model(`${structureSlug[name]}-${suffix}`)])
    .filter(([, counted]) => counted !== null)
    .map(([name, c]) => `${name} ${c.calls}/${c.triangles}`)
    .join(', ');
  console.log(`${navy}`);
  console.log(`  calls per berth:     ${top('calls')}`);
  console.log(`  triangles per berth: ${top('triangles')}`);
  console.log(`  structures (calls/triangles): ${structures}`);
}
