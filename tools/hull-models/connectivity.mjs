/**
 * Is a model one connected body, and where does it come apart?
 *
 *   node tools/hull-models/connectivity.mjs                     # every model
 *   node tools/hull-models/connectivity.mjs bio-reactor         # only the names given
 *   node tools/hull-models/connectivity.mjs --max-gap=0.25 bio-reactor
 *
 * A part left hanging in the water beside the thing it is bolted to is
 * invisible to every check this tree has. hull-intake reads bounds, triangles,
 * materials and glow, and a part that floats changes none of them; its light
 * audit rasterises from above, where a lamp hanging a metre under a boom is
 * simply behind the boom. check.mjs compares a script's rebuild against that
 * script's own committed output, so a gap authored on Tuesday is still there on
 * Wednesday and agrees with itself perfectly. The sprite bake photographs the
 * model from overhead, and a hole in the side does not face the camera. #788
 * shipped exactly that, past all of them: 27 of 77 parts adrift in 22 bodies,
 * on each of four navies — every intake arm broken in three, the boom standing
 * 1.17 m off the rake it feeds and the rake beam 0.26 m above its own tines.
 *
 * What it measures: each part's axis-aligned bounds, parts joined when their
 * boxes come within a centimetre of each other, and the union-found groups
 * reported as bodies, each with the shortest gap to anything outside it. A
 * centimetre because that is check.mjs's own resolution — it compares bounds
 * rounded to the centimetre — so a gap below one is a gap nothing else in the
 * tree could see either.
 *
 * The bargain is the one check:invariants makes, and it runs the same way
 * round: a gap reported here is real, because two boxes that miss cannot hold
 * meshes that touch, but silence is not proof, because boxes overlap long
 * before their meshes do. This is a floor on how far apart a model stands,
 * never a ceiling.
 *
 * Which is also why it is not a gate and why there is no flag demanding one
 * body: the tree does not agree, and it is right not to. 50 of the 100
 * committed models carry a second body on purpose. The Derrick lowers eight
 * hydrophone drums on cables into open water. The Knights' Foundry drives
 * anchor blades into seabed the model does not contain, 29 m out. A Refinery's
 * conveyor stands clear of the crusher it feeds. `--max-gap` is the knob
 * instead: an author names the separation their own model is allowed and gets
 * an exit code on it.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, boundsOf } from './glb.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const MODELS = join(repo, 'docs/concept-art/models');

/** A centimetre — check.mjs's resolution, and below it nothing in the tree can see a gap. */
export const SLACK = 0.01;

/**
 * How far two axis-aligned boxes stand apart: zero when they overlap, else the
 * separation on the axis that separates them most, which is the shortest
 * distance between the boxes measured along an axis. Not the distance between
 * the parts — a box is the hull of a part and not the part.
 */
export function gapOf(a, b) {
  let worst = 0;
  for (let i = 0; i < 3; i++) {
    const d = Math.max(a.min[i] - b.max[i], b.min[i] - a.max[i]);
    if (d > worst) worst = d;
  }
  return worst;
}

/**
 * Parts grouped into bodies, largest first. Every body past the first carries
 * `gap`, the shortest distance to any part outside it, and `between`, the two
 * parts that make it — which is what an author needs, since the part nearest
 * the hole is rarely the part they moved.
 *
 * Grouping is transitive and has to be: a rake bolted to a beam bolted to a
 * boom is one body even though the rake is nowhere near the boom, so the run
 * is union-find over the touching pairs rather than a sweep out from the hull.
 */
export function bodies(parts, slack = SLACK) {
  const box = parts.map((p) => ({ name: p.name, ...boundsOf(p) }));
  const up = box.map((_, i) => i);
  const find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
  for (let i = 0; i < box.length; i++)
    for (let j = i + 1; j < box.length; j++)
      if (gapOf(box[i], box[j]) <= slack) up[find(i)] = find(j);

  const groups = new Map();
  box.forEach((_, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });

  const out = [...groups.values()]
    .sort((a, b) => b.length - a.length)
    .map((members) => ({ members, names: members.map((i) => box[i].name) }));
  for (const body of out.slice(1)) {
    const mine = new Set(body.members);
    body.gap = Infinity;
    for (const i of body.members)
      for (let j = 0; j < box.length; j++) {
        if (mine.has(j)) continue;
        const d = gapOf(box[i], box[j]);
        if (d < body.gap) {
          body.gap = d;
          body.between = [box[i].name, box[j].name];
        }
      }
  }
  // Worst first: an author reading a truncated report wants the metre-wide
  // hole, not the fifth rivet standing a centimetre proud.
  return [out[0], ...out.slice(1).sort((a, b) => b.gap - a.gap)].filter(Boolean);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const flags = argv.filter((a) => a.startsWith('--'));
  const only = argv.filter((a) => !a.startsWith('--'));
  const usage =
    'usage: node tools/hull-models/connectivity.mjs [--max-gap=<metres>] [name ...]';

  const bad = flags.find((f) => !f.startsWith('--max-gap='));
  if (bad) {
    console.error(`unknown flag ${bad}\n${usage}`);
    process.exit(2);
  }
  const given = flags.find((f) => f.startsWith('--max-gap='));
  const maxGap = given ? Number(given.slice('--max-gap='.length)) : null;
  if (maxGap !== null && !(Number.isFinite(maxGap) && maxGap >= 0)) {
    console.error(`--max-gap wants a distance in metres, not ${JSON.stringify(given)}\n${usage}`);
    process.exit(2);
  }

  const files = readdirSync(MODELS)
    .filter((f) => f.endsWith('.glb'))
    .filter((f) => only.length === 0 || only.some((word) => f.includes(word)))
    .sort();
  if (only.length && files.length === 0) {
    console.error(`no model under docs/concept-art/models matches ${only.join(', ')}`);
    process.exit(2);
  }

  // Enough of a body's parts to recognise it by, and no more: the Directorate's
  // Refinery splits off thirty at once and the names are not the point.
  const SHOWN = 4;
  const SHOWN_BODIES = 6;
  const listing = (names) =>
    names.length <= SHOWN
      ? names.join(', ')
      : `${names.slice(0, SHOWN).join(', ')} +${names.length - SHOWN} more`;

  let over = 0;
  let split = 0;
  let worst = { gap: 0, model: null };
  for (const file of files) {
    const model = file.replace(/\.glb$/, '');
    const parts = readGlb(join(MODELS, file)).parts;
    const found = bodies(parts);
    const loose = found.slice(1);
    if (loose.length) split++;
    for (const body of loose) if (body.gap > worst.gap) worst = { gap: body.gap, model };
    const failing = maxGap === null ? [] : loose.filter((b) => b.gap > maxGap);
    over += failing.length;
    console.log(
      `${failing.length ? '✗' : loose.length ? '·' : '✓'} ${model.padEnd(32)}` +
        `${String(parts.length).padStart(4)} parts, ` +
        (loose.length ? `${found.length} bodies` : 'one body')
    );
    for (const body of loose.slice(0, SHOWN_BODIES))
      console.log(
        `      ${body.gap.toFixed(2).padStart(6)} m clear: ` +
          `${body.between[0]} → ${body.between[1]}  (${body.members.length}: ${listing(body.names)})`
      );
    if (loose.length > SHOWN_BODIES)
      console.log(`      … and ${loose.length - SHOWN_BODIES} more, all closer in`);
  }

  console.log(
    `\n${files.length} model${files.length === 1 ? '' : 's'}, ${split} with a second body` +
      (worst.model ? `, widest gap ${worst.gap.toFixed(2)} m (${worst.model})` : '')
  );
  if (over) {
    console.error(`✗ ${over} stand${over === 1 ? 's' : ''} more than ${maxGap} m clear`);
    process.exit(1);
  }
}
