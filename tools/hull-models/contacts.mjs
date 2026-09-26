/**
 * Which parts of a model meet which: every pair that touches or passes
 * through the other, and every part that dips under the seabed.
 *
 *   node tools/hull-models/contacts.mjs refinery-directorate
 *   node tools/hull-models/contacts.mjs refinery-directorate --part maw_tooth --with conveyor_
 *
 * A model is mostly parts that are meant to meet — a lamp seated on a
 * plate, a silo on its tergite — so this does not judge a contact. It
 * lists them, and a reader says which are mounts and which are clips.
 * #947's review rounds found four clips no gate asks about, each with a
 * pair sweep written for the occasion: three teeth standing up through a
 * belt, a neck ridge over that belt, and — after the fix moved the belt —
 * a gallery leg buried in the ridge. A fix moves its neighbours, so the
 * sweep runs again after every one; this is the sweep, kept.
 *
 * `--part <re>` limits the report to pairs with a matching part on one side,
 * and `--with <re>` those parts' partners; both match the node's name. The
 * test is glb.mjs `gapBetween`, the light audit's resting measure, run only
 * where two parts' boxes overlap, so a full sweep over a model's hundred and
 * fifty parts is seconds rather than minutes. A structure should stand on
 * the seabed at y 0 with nothing under it — the runtime centres a model on
 * its box (rosterModels.ts `normalise`) — so the lowest point is printed
 * too, with every part that reaches below it by more than `--sink` metres
 * (0.05 by default, a claw's point).
 *
 * Advisory, not a gate: a contact is a question for the reviewer, not a
 * verdict. `hull-reviewer` runs it on every changed model.
 */
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, gapBetween, boundsOf, occludes } from './glb.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MODELS = resolve(here, '../../docs/concept-art/models');

/**
 * Every pair of `parts` that meets, `[a, b]` by name, where `a` matches
 * `part` and `b` matches `withPart` (both regular expressions, or null for
 * any). A pair is listed once. A part that does not occlude — a haze, a
 * sheath — meets nothing, as the light audit reads it.
 */
export function contactsOf(parts, { part = null, withPart = null } = {}) {
  const solid = parts.filter((p) => occludes(p.finish));
  const boxes = new Map(solid.map((p) => [p, boundsOf(p)]));
  const overlap = (a, b) => {
    const [p, q] = [boxes.get(a), boxes.get(b)];
    return p.min.every((c, i) => c <= q.max[i]) && q.min.every((c, i) => c <= p.max[i]);
  };
  const left = part ? solid.filter((p) => part.test(p.name)) : solid;
  const right = withPart ? solid.filter((p) => withPart.test(p.name)) : solid;
  const seen = new Set();
  const out = [];
  for (const a of left)
    for (const b of right) {
      if (a === b || !overlap(a, b)) continue;
      const key = [a.name, b.name].sort().join('\u0000');
      if (seen.has(key)) continue;
      seen.add(key);
      if (gapBetween(a, [b]) === 0) out.push([a.name, b.name]);
    }
  return out;
}

/** Parts whose lowest vertex is more than `sink` under `datum`, with that depth. */
export function underOf(parts, { datum = 0, sink = 0.05 } = {}) {
  return parts
    .map((p) => ({ name: p.name, y: boundsOf(p).min[1] }))
    .filter((p) => p.y < datum - sink)
    .sort((a, b) => a.y - b.y);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const target = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  if (!target) {
    console.error('usage: contacts.mjs <slug|file.glb> [--part <re>] [--with <re>] [--sink <m>]');
    process.exit(1);
  }
  const file = target.endsWith('.glb') ? resolve(target) : join(MODELS, `${target}.glb`);
  if (!existsSync(file)) {
    console.error(`no model at ${file}`);
    process.exit(1);
  }
  const re = (s) => (s ? new RegExp(s) : null);
  const { parts } = readGlb(file);
  const pairs = contactsOf(parts, { part: re(flag('--part')), withPart: re(flag('--with')) });
  const low = Math.min(...parts.map((p) => boundsOf(p).min[1]));
  const under = underOf(parts, { sink: Number(flag('--sink') ?? 0.05) });
  console.log(`${basename(file)}: ${parts.length} parts, ${pairs.length} pair(s) meet`);
  for (const [a, b] of pairs) console.log(`  ${a}  ·  ${b}`);
  console.log(`lowest point y ${low.toFixed(3)} m`);
  for (const u of under) console.log(`  under the seabed: ${u.name} to y ${u.y.toFixed(3)}`);
}
