/**
 * The far-zoom readability scale (docs/art-direction.md "Far-zoom readability
 * scale — SPEC").
 *
 * What these tests hold is not gameplay — the factor is render-only by rule —
 * it is the promises that make it safe to draw the fleet off true scale: it is
 * exactly 1 at close zoom, it never shrinks anything, it is bounded, it is
 * monotone in the dolly, and its floor stays under the aim floor so selection
 * never has to know it exists. The three.js scene that consumes it needs a GL
 * context and is reviewed by screenshot, per the graphics-standards checklist.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UNIT_STATS } from '@echoes/shared';
import {
  groundPxPerM,
  hullReadabilityScale,
  HULL_FLOOR_PX,
  MAX_HULL_SCALE,
  REFERENCE_HULL_M,
} from '../src/game/readability.ts';

/** The shipped rig: a 40° vertical FOV over a 900 px-tall viewport. */
const FOV_DEG = 40;
const VIEW_H = 900;

const scaleAt = (distanceM: number): number =>
  hullReadabilityScale(groundPxPerM(VIEW_H, FOV_DEG, distanceM));

/** What the reference hull actually measures on screen at this dolly. */
const drawnPxAt = (distanceM: number): number =>
  REFERENCE_HULL_M * groundPxPerM(VIEW_H, FOV_DEG, distanceM) * scaleAt(distanceM);

describe('far-zoom readability scale', () => {
  it('measures against the roster’s shortest hull, derived not copied', () => {
    const shortest = Math.min(...Object.values(UNIT_STATS).map((s) => s.hullLengthM));
    assert.equal(REFERENCE_HULL_M, shortest);
  });

  it('is exactly 1 at close zoom, so true metre scale stays a fact', () => {
    // Not "close to 1": the Phase-2 canonicalisation guarantees hulls,
    // structures and terrain agree metre for metre, and an approximately-1
    // factor would quietly make that approximately true.
    assert.equal(scaleAt(250), 1);
    assert.equal(scaleAt(1000), 1);
    assert.equal(scaleAt(2000), 1);
  });

  it('never draws a hull smaller than true scale', () => {
    for (let d = 100; d <= 20_000; d += 100) {
      assert.ok(scaleAt(d) >= 1, `shrank at ${d} m`);
    }
  });

  it('engages once the reference hull falls under its pixel floor', () => {
    // The kink is where the unexaggerated hull stops clearing the floor.
    const engaged = 3000;
    assert.ok(REFERENCE_HULL_M * groundPxPerM(VIEW_H, FOV_DEG, engaged) < HULL_FLOOR_PX);
    assert.ok(scaleAt(engaged) > 1);
    assert.ok(scaleAt(4000) > scaleAt(engaged));
  });

  it('holds the reference hull at its floor while the cap is not reached', () => {
    for (const d of [3000, 4000, 6000, 8000, 11_000]) {
      if (scaleAt(d) >= MAX_HULL_SCALE) continue;
      assert.ok(Math.abs(drawnPxAt(d) - HULL_FLOOR_PX) < 1e-6, `floor missed at ${d} m`);
    }
  });

  it('is monotone in the dolly and capped', () => {
    let previous = 0;
    for (let d = 100; d <= 30_000; d += 100) {
      const scale = hullReadabilityScale(groundPxPerM(VIEW_H, FOV_DEG, d));
      assert.ok(scale >= previous - 1e-9, `not monotone at ${d} m`);
      assert.ok(scale <= MAX_HULL_SCALE, `past the cap at ${d} m`);
      previous = scale;
    }
    // Past the cap the fleet does shrink again — that is the trade the cap
    // buys, not a bug: exaggeration stops before hulls become a row of
    // overlapping icons.
    assert.equal(scaleAt(30_000), MAX_HULL_SCALE);
  });

  it('never outgrows the aim reach, so selection never reads it', () => {
    // EchoRenderer selects within `max(SELECT_RADIUS_M · pxPerM, AIM_FLOOR_PX)`
    // — true metres and a pixel floor, both deliberately ignorant of this
    // scale. A hull drawn wider than it can be clicked would force aim to read
    // the factor, so the numbers are chosen together; this is the assertion
    // that keeps them chosen together.
    const SELECT_RADIUS_M = 140;
    const AIM_FLOOR_PX = 18;
    // Where the scale is active the hull is pinned at its floor, so the whole
    // question reduces to half that floor against the pixel floor.
    assert.ok(HULL_FLOOR_PX / 2 < AIM_FLOOR_PX);
    for (let d = 100; d <= 30_000; d += 100) {
      const pxPerM = groundPxPerM(VIEW_H, FOV_DEG, d);
      const reachPx = Math.max(SELECT_RADIUS_M * pxPerM, AIM_FLOOR_PX);
      assert.ok(drawnPxAt(d) / 2 < reachPx, `drawn hull outgrew aim at ${d} m`);
    }
  });

  it('scales the factor with the viewport, because a pixel floor is pixels', () => {
    // A taller viewport shows more metres per pixel of hull, so the same dolly
    // needs less exaggeration — the floor is a statement about the screen.
    const tall = hullReadabilityScale(groundPxPerM(1800, FOV_DEG, 6000));
    const short = hullReadabilityScale(groundPxPerM(900, FOV_DEG, 6000));
    assert.ok(tall < short);
  });

  it('degenerates to the cap rather than infinity at zero scale', () => {
    assert.equal(hullReadabilityScale(0), MAX_HULL_SCALE);
  });
});
