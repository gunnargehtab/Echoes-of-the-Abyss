/**
 * The gate-6 measurement instrument (#286).
 *
 * Gate 6's review drive reads avg and worst frame cost at each of five
 * stations on one page load. Before this class the probe could not express
 * that read: the worst case was raised and never lowered, so station five
 * reported station one's loading hitch, and the average ran on a fixed window
 * with no station boundary, so a station shorter than the window silently
 * blended the one before it.
 *
 * These are counted assertions in the strict sense the smoke test's header
 * argues for — sample counts and arithmetic over supplied numbers, no
 * stopwatch anywhere. `FrameCost` never reads a clock; it is handed
 * durations, which is what makes the window semantics testable at all.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FrameCost, ms } from '../src/game/frameCost.ts';

/** The window the class documents, restated here so a change to it fails. */
const WINDOW = 240;

describe('frame cost: the station', () => {
  it('averages the window and counts the station, and says which is which', () => {
    const cost = new FrameCost();
    for (let i = 0; i < WINDOW + 60; i++) cost.add(i < WINDOW ? 100 : 10);

    assert.equal(cost.count, WINDOW + 60, 'every frame since the boundary is counted');
    assert.equal(cost.frames, WINDOW, 'the average covers a windowful and no more');
    // The last 240 samples are the final 60 tens and the 180 hundreds before
    // them: the ring dropped the oldest sixty, exactly as many as it took.
    assert.equal(ms(cost.avg), ms((180 * 100 + 60 * 10) / WINDOW), 'and averages those samples');
  });

  it('reports a worst case that belongs to this station and not the last one', () => {
    const cost = new FrameCost();
    cost.add(900); // The loading hitch, at station one.
    for (let i = 0; i < 10; i++) cost.add(12);
    assert.equal(cost.worst, 900, 'while the station that paid it is still running');

    cost.reset();
    assert.equal(cost.worst, 0, 'a new station inherits no worst case');
    assert.equal(cost.avg, 0, 'nor an average');
    assert.equal(cost.count, 0, 'nor a frame count');
    assert.equal(cost.frames, 0, 'nor a window');

    for (let i = 0; i < 10; i++) cost.add(12);
    assert.equal(cost.worst, 12, 'the second station reports its own worst frame');
    assert.equal(cost.avg, 12, 'and its own average');
  });

  it('keeps the average exact after the ring has wrapped many times', () => {
    // The sum is carried rather than recomputed, so a wrap subtracts the
    // sample it overwrites. Drift here would be invisible in a short test and
    // wrong by the time a station had run for a minute.
    const cost = new FrameCost();
    for (let i = 0; i < WINDOW * 7; i++) cost.add(16);
    assert.equal(ms(cost.avg), 16, 'a constant frame time averages to itself, however long');
    assert.equal(cost.frames, WINDOW, 'and the window never grows past itself');
  });
});
