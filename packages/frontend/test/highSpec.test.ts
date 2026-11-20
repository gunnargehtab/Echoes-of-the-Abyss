/**
 * The High graphics quality's accepted numbers (docs/art-direction.md, "Step
 * 1's numbers — SPEC"; #1801). The owner accepted step 1's look on 19 November
 * 2026, so its numbers are SPEC: the doc's two tables and `HIGH_GRAPHICS` say
 * the same thing, in both directions, and a number moved in one place alone
 * fails here.
 *
 * The same day the owner accepted an own model in the world's light (#1814),
 * a navy's surface (#1811) and an own hull's searchlight (#1836). Each of
 * those is one block, printed as a table by the section that owns it, and
 * held here the same way.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { HIGH_GRAPHICS } from '@echoes/shared';

const doc = readFileSync(new URL('../../../docs/art-direction.md', import.meta.url), 'utf8');

/** The doc's headings this file reads between, in the order the doc has them. */
const HEADINGS = {
  STEP_1: "#### Step 1's numbers — SPEC",
  HULL_LIGHT: "#### A model in the world's light",
  HULL_SURFACE: "#### A navy's surface",
  SEARCHLIGHT: "#### An own hull's searchlight",
  MARK: '#### A mark on the lit world',
} as const;

/** A section's text, from its heading to the next one this file names. */
function sectionOf(heading: string, next: string): string {
  const from = doc.indexOf(heading);
  assert.ok(from >= 0, `docs/art-direction.md lost "${heading}"`);
  const to = doc.indexOf(next, from);
  assert.ok(to > from, `docs/art-direction.md lost "${next}" after "${heading}"`);
  return doc.slice(from, to);
}

const start = doc.indexOf(HEADINGS.STEP_1);
const section = doc.slice(start, doc.indexOf(HEADINGS.HULL_LIGHT, start));

/** A table's body rows as trimmed cells, found by its header's first cell. */
function rows(header: string, within: string = section): string[][] {
  const lines = within.split('\n');
  const at = lines.findIndex((line) => line.startsWith(`| ${header} |`));
  assert.ok(at >= 0, `the SPEC section has no table headed "${header}"`);
  const body: string[][] = [];
  for (const line of lines.slice(at + 2)) {
    if (!line.startsWith('|')) break;
    body.push(
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    );
  }
  return body;
}

/** `LID.IRRADIANCE` read off the constant, as the doc's cell names it. */
function constant(path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((at, key) => (at as Record<string, unknown>)[key], HIGH_GRAPHICS);
}

/** Every number under one node of `HIGH_GRAPHICS`, as the dotted path a cell names. */
function leaves(at: unknown, path: string): string[] {
  return typeof at === 'object' && at !== null && !Array.isArray(at)
    ? Object.entries(at).flatMap(([key, value]) => leaves(value, `${path}.${key}`))
    : [path];
}

/** A `What | Constant | Value` table's rows, each held to the constant it names. */
function assertPrinted(table: string[][]): void {
  for (const [, cell, value] of table) {
    const path = cell!.replace(/`/g, '');
    const held = constant(path);
    const printed = value!.split(',').map((part) => Number(part.trim()));
    assert.deepEqual(
      printed,
      Array.isArray(held) ? [...held] : [held],
      `${path}: the doc and the constant disagree`
    );
  }
}

/** The blocks of `HIGH_GRAPHICS` step 1 owns, and the ones other sections do. */
const STEP_1 = ['SAMPLES', 'EXPOSURE', 'LID', 'GROUND', 'WATER', 'AO', 'BLOOM', 'GRADE'] as const;
const FAMILIES = ['vent', 'flora', 'crystal', 'ore', 'civic'] as const;

/**
 * The steps accepted after step 1 (#1814, #1811, #1836): a block each, printed
 * by the section that owns it, which ends where the next of the doc's begins.
 */
const LATER_STEPS = [
  { block: 'HULL_LIGHT', heading: HEADINGS.HULL_LIGHT, next: HEADINGS.HULL_SURFACE },
  { block: 'HULL_SURFACE', heading: HEADINGS.HULL_SURFACE, next: HEADINGS.SEARCHLIGHT },
  { block: 'SEARCHLIGHT', heading: HEADINGS.SEARCHLIGHT, next: HEADINGS.MARK },
] as const;

describe("High's step 1, as SPEC", () => {
  it('has its section', () => {
    assert.ok(start >= 0, 'docs/art-direction.md lost "Step 1\'s numbers — SPEC"');
  });

  it('prints every value the constants hold', () => {
    assertPrinted(rows('What'));
  });

  it('leaves no number of step 1 out of the table', () => {
    const printed = new Set(rows('What').map(([, cell]) => cell!.replace(/`/g, '')));
    const owed = [
      ...STEP_1.flatMap((block) => leaves(HIGH_GRAPHICS[block], block)),
      ...Object.keys(HIGH_GRAPHICS.WORLD_LIGHT)
        .filter((key) => !(FAMILIES as readonly string[]).includes(key))
        .map((key) => `WORLD_LIGHT.${key}`),
    ];
    assert.deepEqual([...printed].sort(), [...owed].sort());
  });

  it("prints the world's sources, a family a row", () => {
    const table = rows('Family');
    assert.deepEqual(
      table.map(([family]) => family!.replace(/`/g, '')),
      [...FAMILIES]
    );
    for (const [cell, power, radius, height] of table) {
      const family = cell!.replace(/`/g, '') as (typeof FAMILIES)[number];
      const spec = HIGH_GRAPHICS.WORLD_LIGHT[family];
      assert.deepEqual(
        [Number(power), Number(radius), Number(height)],
        [spec.POWER, spec.RADIUS_M, spec.HEIGHT_M],
        `${family}: the doc and the constant disagree`
      );
    }
  });
});

for (const { block, heading, next } of LATER_STEPS) {
  describe(`High's ${block}, as SPEC`, () => {
    it('prints every value the constant holds', () => {
      assertPrinted(rows('What', sectionOf(heading, next)));
    });

    it('prints the whole block and no other', () => {
      const printed = rows('What', sectionOf(heading, next)).map(([, cell]) =>
        cell!.replace(/`/g, '')
      );
      assert.deepEqual([...printed].sort(), leaves(HIGH_GRAPHICS[block], block).sort());
    });
  });
}
