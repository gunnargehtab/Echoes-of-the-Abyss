/**
 * One name, one value, across a navy — the rule docs/asset-prompts-3d.md
 * Block 2b calls "the one that bites", measured over the committed files.
 *
 *   node tools/hull-models/finishes.mjs              # every navy
 *   node tools/hull-models/finishes.mjs bathyarch    # one
 *   node tools/hull-models/finishes.mjs --hexes      # every distinct colour, and who carries it
 *
 * The recolour discards a model's hue and keeps the ratio between its
 * materials (gate 4), so two parts called `weld_steel` at two values are two
 * different greys on two hulls a player sees side by side. Each faction module
 * once held a table of inks per approved export a port copied, which is how a
 * navy came to carry one name at two or three values (#888).
 *
 * A navy is the model's slug suffix. The environment props belong to no navy
 * and are not read: #884 gave their two-valued names a token each.
 *
 * **Emissive strength is not part of the value.** It is how loud the lamp is
 * at rest — each model's own, approved at intake against its SIG band and
 * carried straight into the conn view (rosterModels.ts `recolor`) — so a navy's
 * `biolight_crimson` at 2.4 on one hull and 6 on another is one fixture at two
 * loudnesses, not two fixtures. Everything else a finish carries is compared,
 * in `finishFields`' printed precision.
 *
 * `--hexes` is the other count Block 2b states — how many distinct colours
 * the navies' models carry between them — and says how it is counted: every
 * base colour and every emissive on a model named for a navy, as sRGB hex,
 * the props aside, with the names that carry each. A count with no method
 * drifts (#891: the doc said 51 and 35 at a commit where this said 62).
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, finishFields } from './glb.mjs';

export const NAVIES = ['bathyarch', 'pelagia', 'directorate', 'hadron'];

const here = dirname(fileURLToPath(import.meta.url));
const models = resolve(here, '../../docs/concept-art/models');

/** A finish as the rule compares it: every field but the strength. */
function valueOf(finish) {
  const value = finishFields(finish);
  delete value.strength;
  return Object.entries(value)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
}

/**
 * Every name that carries more than one value in `navy`'s committed files:
 * `[{ name, values: [{ value, slugs }] }]`, most-used value first.
 */
export function splitsIn(navy, dir = models) {
  const byName = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(`-${navy}.glb`))) {
    const slug = file.replace(/\.glb$/, '');
    for (const p of readGlb(join(dir, file)).parts) {
      if (!p.material || !p.finish) continue;
      const values = byName.get(p.material) ?? new Map();
      byName.set(p.material, values);
      const value = valueOf(p.finish);
      const slugs = values.get(value) ?? new Set();
      values.set(value, slugs);
      slugs.add(slug);
    }
  }
  return [...byName]
    .filter(([, values]) => values.size > 1)
    .map(([name, values]) => ({
      name,
      values: [...values]
        .map(([value, slugs]) => ({ value, slugs: [...slugs].sort() }))
        .sort((a, b) => b.slugs.length - a.slugs.length),
    }));
}

/**
 * Every distinct colour in `navy`'s committed files, base and emissive, with
 * the names that carry it: `Map<hex, { base: Set<name>, emissive: Set<name> }>`.
 * A black emissive is no light and is not counted.
 */
export function hexesIn(navy, dir = models) {
  const byHex = new Map();
  const note = (hex, role, name) => {
    const entry = byHex.get(hex) ?? { base: new Set(), emissive: new Set() };
    byHex.set(hex, entry);
    entry[role].add(name);
  };
  for (const file of readdirSync(dir).filter((f) => f.endsWith(`-${navy}.glb`))) {
    for (const p of readGlb(join(dir, file)).parts) {
      if (!p.material || !p.finish) continue;
      const fields = finishFields(p.finish);
      note(fields.colour, 'base', p.material);
      if (fields.emissive !== '#000000') note(fields.emissive, 'emissive', p.material);
    }
  }
  return byHex;
}

function printHexes(navies) {
  const all = new Map();
  for (const navy of navies) {
    const hexes = hexesIn(navy);
    const bases = [...hexes.values()].filter((e) => e.base.size).length;
    const lights = [...hexes.values()].filter((e) => e.emissive.size).length;
    console.log(`${navy}: ${hexes.size} distinct (${bases} base, ${lights} emissive)`);
    for (const [hex, e] of [...hexes].sort()) {
      const who = (set) => [...set].sort().join(' ');
      const roles = [e.base.size && `base ${who(e.base)}`, e.emissive.size && `emissive ${who(e.emissive)}`];
      console.log(`  ${hex}  ${roles.filter(Boolean).join(' · ')}`);
      const total = all.get(hex) ?? { base: false, emissive: false };
      all.set(hex, { base: total.base || e.base.size > 0, emissive: total.emissive || e.emissive.size > 0 });
    }
  }
  const bases = [...all.values()].filter((e) => e.base).length;
  const lights = [...all.values()].filter((e) => e.emissive).length;
  console.log(`all: ${all.size} distinct (${bases} base, ${lights} emissive)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const hexes = process.argv.includes('--hexes');
  const asked = process.argv.slice(2).filter((a) => a !== '--hexes');
  const unknown = asked.filter((n) => !NAVIES.includes(n));
  if (unknown.length) {
    console.error(`not a navy: ${unknown.join(', ')} (one of ${NAVIES.join(', ')})`);
    process.exit(2);
  }
  if (hexes) {
    printHexes(asked.length ? asked : NAVIES);
    process.exit(0);
  }
  let total = 0;
  for (const navy of asked.length ? asked : NAVIES) {
    const splits = splitsIn(navy);
    total += splits.length;
    console.log(`${navy}: ${splits.length ? `${splits.length} names split` : 'one value a name'}`);
    for (const { name, values } of splits) {
      console.log(`  ${name}`);
      for (const { value, slugs } of values) console.log(`    ${value}\n      ${slugs.join(', ')}`);
    }
  }
  process.exit(total ? 1 : 0);
}
