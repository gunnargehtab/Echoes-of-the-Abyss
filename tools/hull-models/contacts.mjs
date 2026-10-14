/**
 * Which parts of a model meet which: every pair that touches, passes
 * through the other or stands within `--near` of it, and every part that
 * dips under the seabed.
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
 * and `--with <re>` those parts' partners; both match the node's name, and a
 * name the model repeats is printed with its part index. The
 * test is glb.mjs `gapBetween`, the light audit's resting measure, run only
 * where two parts' boxes overlap, so a full sweep over a model's hundred and
 * fifty parts is seconds rather than minutes. It runs both ways round, and
 * asks the inside test only of a closed partner: an open shell's parity is
 * undefined, and a dome under the Cantor's curved plate read as meeting it
 * from 0.44 m off (#1373). Both tests allow `--near`
 * metres (0.001 by default): kit.mjs `seat` lands a part a float32 rounding
 * off its plate, 4.8e-7 m on the light scout's spine, and an exact test read
 * every such mount as meeting nothing (#1370). `--near 0` asks for a true
 * touch. A model is authored standing
 * on y 0, and the conn view stands a structure's y 0 at its working depth
 * (rosterModels.ts `standingY`, #955), so a part under y 0 is in the seabed
 * wherever the floor meets that depth. An anchor, a root or a slab means to
 * be; 23 of the 32 committed structures sink one. Anything else is buried.
 * So the lowest point is printed too, with every part that reaches below
 * y 0 by more than `--sink` metres (0.05 by default, a claw's point).
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
 * Every pair of `parts` that meets, `[a, b]` by label, where `a` matches
 * `part` and `b` matches `withPart` (both regular expressions, or null for
 * any). A pair of parts is listed once. Two parts meet when they stand within
 * `near` metres of each other, so a part seated flush is listed as well as
 * one passing through. A part that does not occlude — a haze, a sheath —
 * meets nothing, as the light audit reads it.
 *
 * A label is the part's name, and a name the model repeats carries the
 * part's index in `parts` too, `gantry_leg_s #27`: pairs were once keyed by
 * name, so of each pair of names only the first pair of instances whose
 * boxes overlapped was tested, and the Hadron Slipway's hall never met the
 * gantry leg it stands on (#1374).
 */
export function contactsOf(parts, { part = null, withPart = null, near = 0.001 } = {}) {
  const solid = parts.filter((p) => occludes(p.finish));
  const boxes = new Map(solid.map((p) => [p, boundsOf(p)]));
  const overlap = (a, b) => {
    const [p, q] = [boxes.get(a), boxes.get(b)];
    return (
      p.min.every((c, i) => c <= q.max[i] + near) && q.min.every((c, i) => c <= p.max[i] + near)
    );
  };
  const left = part ? solid.filter((p) => part.test(p.name)) : solid;
  const right = withPart ? solid.filter((p) => withPart.test(p.name)) : solid;
  const index = new Map(parts.map((p, i) => [p, i]));
  const count = new Map();
  for (const p of parts) count.set(p.name, (count.get(p.name) ?? 0) + 1);
  const label = (p) => (count.get(p.name) > 1 ? `${p.name} #${index.get(p)}` : p.name);
  const seen = new Set();
  const out = [];
  for (const a of left)
    for (const b of right) {
      if (a === b || !overlap(a, b)) continue;
      const [i, j] = [index.get(a), index.get(b)];
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Both ways round: `gapBetween` asks only whether `a`'s vertices are
      // inside `b`, so a part sunk whole in its partner met it one way only,
      // and which way depended on which side `--part` named (#1373).
      if (
        gapBetween(a, [b], { closedOnly: true }) <= near ||
        gapBetween(b, [a], { closedOnly: true }) <= near
      )
        out.push([label(a), label(b)]);
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
  // A --near that is no number would compare false with every gap and print
  // a clean sweep, the silent zero #1370 was about, so it is refused.
  const near = Number(flag('--near') ?? 0.001);
  if (!target || !(near >= 0)) {
    console.error(
      'usage: contacts.mjs <slug|file.glb> [--part <re>] [--with <re>] [--near <m>] [--sink <m>]'
    );
    process.exit(1);
  }
  const file = target.endsWith('.glb') ? resolve(target) : join(MODELS, `${target}.glb`);
  if (!existsSync(file)) {
    console.error(`no model at ${file}`);
    process.exit(1);
  }
  const re = (s) => (s ? new RegExp(s) : null);
  const { parts } = readGlb(file);
  const pairs = contactsOf(parts, {
    part: re(flag('--part')),
    withPart: re(flag('--with')),
    near,
  });
  const low = Math.min(...parts.map((p) => boundsOf(p).min[1]));
  const under = underOf(parts, { sink: Number(flag('--sink') ?? 0.05) });
  console.log(`${basename(file)}: ${parts.length} parts, ${pairs.length} pair(s) meet`);
  for (const [a, b] of pairs) console.log(`  ${a}  ·  ${b}`);
  console.log(`lowest point y ${low.toFixed(3)} m`);
  for (const u of under) console.log(`  under the seabed: ${u.name} to y ${u.y.toFixed(3)}`);
}
