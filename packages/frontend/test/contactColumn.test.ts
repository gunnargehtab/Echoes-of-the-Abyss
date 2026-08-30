/**
 * The honest column glyph (issue #283, docs/three-layer-ocean.md §9).
 *
 * What these tests hold is the *claim* the mark makes, not how it looks: the
 * pixels are reviewed by screenshot per the graphics-standards checklist, but
 * whether the geometry implies a depth nobody earned is arithmetic, and
 * arithmetic can be pinned. So: the span is the water a hull could stand in,
 * the uncertainty is uniform along it, the widest ribbon is exactly the tier's
 * own radius, the composite stays under the tier's own alpha, and a partly
 * clipped column refuses to draw rather than inventing an end.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LID } from '@echoes/shared';
import {
  COLUMN_CORE_INK,
  COLUMN_END_TAPER,
  COLUMN_MIN_SPAN_M,
  COLUMN_RIBBONS,
  COLUMN_SAMPLES,
  columnDepthsM,
  columnLayout,
  columnRibbon,
  distanceToColumn,
  type ColumnPoint,
} from '../src/game/contactColumn.ts';

/** A straight, evenly spaced column on screen — the flat-camera limit case. */
function fakeColumn(
  count = COLUMN_SAMPLES,
  x = 500,
  topY = 100,
  bottomY = 300,
  pxPerM = 0.4
): ColumnPoint[] {
  const out: ColumnPoint[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x,
      y: topY + ((bottomY - topY) * i) / (count - 1),
      pxPerM,
      visible: true,
    });
  }
  return out;
}

describe('columnDepthsM', () => {
  it('spans the Lid to the seabed — the water a hull could hold in', () => {
    const depths = columnDepthsM(2400);
    assert.ok(depths !== null);
    assert.equal(depths.length, COLUMN_SAMPLES);
    assert.equal(depths[0], LID.DEPTH_M);
    assert.equal(depths[depths.length - 1], 2400);
  });

  it('samples evenly, so no depth in the column is favoured over another', () => {
    const depths = columnDepthsM(2400)!;
    const step = depths[1]! - depths[0]!;
    for (let i = 1; i < depths.length; i++) {
      assert.ok(Math.abs(depths[i]! - depths[i - 1]! - step) < 1e-9);
    }
  });

  it('never claims a depth the old 600 m reference did: no fixed height survives', () => {
    // The point of the change: two different seabeds put the mark in two
    // different places, because the water is what is being reported.
    const shallow = columnDepthsM(900)!;
    const deep = columnDepthsM(2600)!;
    assert.notEqual(shallow[shallow.length - 1], deep[deep.length - 1]);
    const mid = (d: number[]) => d[(d.length - 1) >> 1]!;
    assert.notEqual(mid(shallow), mid(deep));
  });

  it('hangs off the floor where the water is shallower than the Lid', () => {
    const depths = columnDepthsM(100)!;
    assert.ok(depths[0]! < LID.DEPTH_M);
    assert.equal(depths[depths.length - 1], 100);
    assert.ok(depths[depths.length - 1]! - depths[0]! <= COLUMN_MIN_SPAN_M);
  });

  it('refuses a degenerate column rather than drawing a point', () => {
    assert.equal(columnDepthsM(0), null);
    assert.equal(columnDepthsM(0.5), null);
  });
});

describe('columnLayout', () => {
  it('anchors on a real projected sample, not an average of two', () => {
    const points = fakeColumn();
    const layout = columnLayout(points)!;
    const mid = points[(points.length - 1) >> 1]!;
    assert.equal(layout.anchor.x, mid.x);
    assert.equal(layout.anchor.y, mid.y);
    assert.equal(layout.anchor.pxPerM, mid.pxPerM);
    assert.equal(layout.path[(points.length - 1) >> 1]!.oy, 0);
  });

  it('lays the path out in the anchor’s own metres', () => {
    const layout = columnLayout(fakeColumn(9, 500, 100, 300, 0.4))!;
    // 200 px of column at 0.4 px/m is 500 m of drawn column, centred.
    assert.ok(Math.abs(layout.path[0]!.oy - -250) < 1e-9);
    assert.ok(Math.abs(layout.path[8]!.oy - 250) < 1e-9);
  });

  it('keeps a far sample’s width in metres, not in the anchor’s pixels', () => {
    const points = fakeColumn();
    points[0] = { ...points[0]!, pxPerM: 0.2 };
    const layout = columnLayout(points)!;
    assert.ok(Math.abs(layout.path[0]!.scale - 0.5) < 1e-9);
  });

  it('refuses a column with a sample outside the frustum', () => {
    const points = fakeColumn();
    points[3] = { ...points[3]!, visible: false };
    assert.equal(columnLayout(points), null);
  });
});

describe('columnRibbon', () => {
  const layout = columnLayout(fakeColumn())!;

  it('closes a polygon down one side and back up the other', () => {
    const poly = columnRibbon(layout.path, 46);
    assert.equal(poly.length, COLUMN_SAMPLES * 2 * 2);
    // Same height at both ends of the pair: the ribbon is a band, not a wedge.
    assert.equal(poly[1], poly[poly.length - 1]);
  });

  it('holds one width between its ends — the water there is one claim', () => {
    const poly = columnRibbon(layout.path, 46);
    for (let i = 1; i < COLUMN_SAMPLES - 1; i++) {
      assert.equal(poly[i * 2], -46);
    }
  });

  it('tapers only at the Lid and the seabed', () => {
    const poly = columnRibbon(layout.path, 46);
    assert.ok(Math.abs(poly[0]! - -46 * COLUMN_END_TAPER) < 1e-9);
    assert.ok(Math.abs(poly[(COLUMN_SAMPLES - 1) * 2]! - -46 * COLUMN_END_TAPER) < 1e-9);
  });

  it('is exactly the tier’s own radius at its widest, never narrower', () => {
    // Narrowing would sharpen the plan position past the tier that earned it.
    assert.equal(COLUMN_RIBBONS[0]!.width, 1);
    for (const ribbon of COLUMN_RIBBONS) assert.ok(ribbon.width <= 1);
  });

  it('falls off across the plan rather than stepping', () => {
    // Consecutive ribbon widths must never jump far enough to read as a band
    // edge; cosine spacing crowds them at the rim, which is where the eye
    // would otherwise find one.
    for (let i = 1; i < COLUMN_RIBBONS.length; i++) {
      const step = COLUMN_RIBBONS[i - 1]!.width - COLUMN_RIBBONS[i]!.width;
      assert.ok(step > 0 && step < 0.25, `ribbon step ${step}`);
    }
  });
});

describe('the column stays quieter than an earned track', () => {
  const composite = (alpha: number) =>
    1 - COLUMN_RIBBONS.reduce((acc, r) => acc * (1 - alpha * r.ink), 1);

  it('lands just under the core ink it advertises, at every tier in play', () => {
    for (const alpha of [0.18, 0.32]) {
      assert.ok(composite(alpha) < COLUMN_CORE_INK * alpha);
      assert.ok(composite(alpha) > COLUMN_CORE_INK * alpha * 0.8);
    }
  });

  it('never exceeds the tier alpha it replaces', () => {
    for (const alpha of [0.18, 0.32]) assert.ok(composite(alpha) < alpha);
  });

  it('stays well under a Tier-4 track', () => {
    assert.ok(composite(0.32) < 0.9 * 0.5);
  });
});

describe('distanceToColumn', () => {
  const points = fakeColumn(9, 500, 100, 300, 0.4);

  it('is zero anywhere down the drawn column, not just at one height', () => {
    for (const y of [100, 175, 200, 260, 300]) {
      assert.ok(distanceToColumn(500, y, points) < 1e-9);
    }
  });

  it('measures to the nearest point on the column beyond its ends', () => {
    assert.ok(Math.abs(distanceToColumn(500, 60, points) - 40) < 1e-9);
    assert.ok(Math.abs(distanceToColumn(520, 200, points) - 20) < 1e-9);
  });

  it('is unreachable when there is no column', () => {
    assert.equal(distanceToColumn(0, 0, []), Infinity);
  });
});
