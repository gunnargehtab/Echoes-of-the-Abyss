/**
 * HULL_OUTLINE is what a Tier-4 TRACK renders under the Asymmetric Fidelity
 * Law (docs/art-direction.md), so every kind must have one and it must be a
 * real plan shape — for the modelled kinds, the one drawn from the model by
 * tools/hull-maps/outlines.mjs, which `npm run check:models` holds to the
 * GLBs. What is asserted here is the contract the renderer and the sprite
 * baker rely on, not any particular shape: unit space with the bow at +0.5,
 * a polygon with area, and the generated set spanning the whole length so a
 * track is as long as the hull it stands for.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UnitKind } from '@echoes/shared';
import { HULL_OUTLINE } from '../src/game/silhouettes.ts';
import { GENERATED_HULL_OUTLINE } from '../src/game/hullOutlines.generated.ts';

const KINDS = Object.values(UnitKind).filter((v): v is UnitKind => typeof v === 'number');

/** Shoelace area, signed; zero means a degenerate polygon. */
function area(points: number[][]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % points.length]!;
    a += x0! * y1! - x1! * y0!;
  }
  return a / 2;
}

describe('hull outlines', () => {
  it('gives every kind a plan shape with the bow at +0.5', () => {
    for (const kind of KINDS) {
      const outline = HULL_OUTLINE[kind];
      assert.ok(outline.length >= 3, `${UnitKind[kind]} has ${outline.length} points`);
      assert.equal(Math.max(...outline.map(([x]) => x!)), 0.5, `${UnitKind[kind]} bow`);
      assert.ok(Math.abs(area(outline)) > 0.01, `${UnitKind[kind]} has no area`);
      for (const [x, y] of outline)
        assert.ok(Math.abs(x!) <= 0.5 && Math.abs(y!) <= 0.5, `${UnitKind[kind]} leaves unit space`);
    }
  });

  it('draws a modelled kind the whole length of its model', () => {
    for (const [k, outline] of Object.entries(GENERATED_HULL_OUTLINE)) {
      const kind = Number(k) as UnitKind;
      assert.equal(Math.min(...outline.map(([x]) => x!)), -0.5, `${UnitKind[kind]} stern`);
      assert.ok(area(outline) > 0, `${UnitKind[kind]} winds the wrong way`);
    }
  });
});
