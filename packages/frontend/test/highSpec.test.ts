/**
 * The High graphics quality's accepted numbers (docs/art-direction.md, "Step
 * 1's numbers — SPEC"; #1801). The owner accepted step 1's look on 19 November
 * 2026, so its numbers are SPEC: the doc's two tables and `HIGH_GRAPHICS` say
 * the same thing, in both directions, and a number moved in one place alone
 * fails here.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { HIGH_GRAPHICS } from '@echoes/shared';

const doc = readFileSync(new URL('../../../docs/art-direction.md', import.meta.url), 'utf8');
const start = doc.indexOf("#### Step 1's numbers — SPEC");
const section = doc.slice(start, doc.indexOf("#### A model in the world's light", start));

/** A table's body rows as trimmed cells, found by its header's first cell. */
function rows(header: string): string[][] {
  const lines = section.split('\n');
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

/** The blocks of `HIGH_GRAPHICS` step 1 owns, and the ones other sections do. */
const STEP_1 = ['SAMPLES', 'EXPOSURE', 'LID', 'GROUND', 'WATER', 'AO', 'BLOOM', 'GRADE'] as const;
const FAMILIES = ['vent', 'flora', 'crystal', 'ore', 'civic'] as const;

describe("High's step 1, as SPEC", () => {
  it('has its section', () => {
    assert.ok(start >= 0, 'docs/art-direction.md lost "Step 1\'s numbers — SPEC"');
  });

  it('prints every value the constants hold', () => {
    for (const [, cell, value] of rows('What')) {
      const path = cell!.replace(/`/g, '');
      const held = constant(path);
      const printed = value!.split(',').map((part) => Number(part.trim()));
      assert.deepEqual(
        printed,
        Array.isArray(held) ? [...held] : [held],
        `${path}: the doc and the constant disagree`
      );
    }
  });

  it('leaves no number of step 1 out of the table', () => {
    const printed = new Set(rows('What').map(([, cell]) => cell!.replace(/`/g, '')));
    const leaves = (at: unknown, path: string): string[] =>
      typeof at === 'object' && at !== null && !Array.isArray(at)
        ? Object.entries(at).flatMap(([key, value]) => leaves(value, `${path}.${key}`))
        : [path];
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
