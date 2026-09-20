/**
 * The union-find is the part of connectivity.mjs that can be silently wrong in
 * the direction that matters: a bug that merges two groups reports one body and
 * says nothing, which is exactly the silence the tool exists to break. So the
 * cases here are synthetic boxes rather than committed models — a model would
 * only ever assert that today's models are what they are.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bodies, gapOf, SLACK } from '../connectivity.mjs';

/** A part is whatever `boundsOf` can read, so two opposite corners are a box. */
const part = (name, min, max) => ({ name, positions: Float32Array.from([...min, ...max]) });
const names = (found) => found.map((b) => b.names);

test('a box does not stand clear of one it overlaps', () => {
  const a = { min: [0, 0, 0], max: [2, 2, 2] };
  assert.equal(gapOf(a, { min: [1, 1, 1], max: [3, 3, 3] }), 0);
  assert.equal(gapOf(a, a), 0);
});

test('the gap is the axis that separates most, and it is symmetric', () => {
  const a = { min: [0, 0, 0], max: [1, 1, 1] };
  const b = { min: [4, 2, 0], max: [5, 3, 1] };
  // 3 m apart on x, 1 m on y, overlapping on z: the boxes are 3 m apart.
  assert.equal(gapOf(a, b), 3);
  assert.equal(gapOf(b, a), 3);
});

test('parts that touch are one body', () => {
  const found = bodies([part('a', [0, 0, 0], [1, 1, 1]), part('b', [1, 0, 0], [2, 1, 1])]);
  assert.deepEqual(names(found), [['a', 'b']]);
});

test('a body holds together through its middle, not by reaching across it', () => {
  // a and c are 8 m apart and never touch; both touch b, so all three are one
  // body. This is the rake-on-a-beam-on-a-boom case, and a sweep out from the
  // largest part rather than a union-find would report c adrift.
  const found = bodies([
    part('a', [0, 0, 0], [1, 1, 1]),
    part('c', [9, 0, 0], [10, 1, 1]),
    part('b', [1, 0, 0], [9, 1, 1]),
  ]);
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].names.sort(), ['a', 'b', 'c']);
});

test('a loose part is its own body, and carries the gap and the pair that make it', () => {
  const found = bodies([
    part('hull', [0, 0, 0], [10, 1, 1]),
    part('mast', [4, 1, 0], [5, 4, 1]),
    part('lamp', [4, 6, 0], [5, 7, 1]),
  ]);
  assert.deepEqual(names(found), [['hull', 'mast'], ['lamp']]);
  assert.equal(found[1].gap, 2);
  // The nearest thing outside, not the biggest: the lamp came off the mast.
  assert.deepEqual(found[1].between, ['lamp', 'mast']);
});

test('the body is the largest group and the rest are worst gap first', () => {
  const found = bodies([
    part('near', [0, 3, 0], [1, 4, 1]),
    part('far', [0, 20, 0], [1, 21, 1]),
    part('deck_a', [0, 0, 0], [1, 1, 1]),
    part('deck_b', [1, 0, 0], [2, 1, 1]),
  ]);
  assert.deepEqual(names(found), [['deck_a', 'deck_b'], ['far'], ['near']]);
  // `far` is 19 m off the deck but only 16 m off `near`, and the gap reported
  // is to the nearest part outside the body rather than to the body: what an
  // author needs is the shortest distance the part has to travel to land on
  // something, whatever that something turns out to be.
  assert.deepEqual([found[1].gap, found[2].gap], [16, 2]);
  assert.deepEqual(found[1].between, ['far', 'near']);
});

test('a centimetre is a rounding artifact and anything above it is a gap', () => {
  const apart = (d) =>
    bodies([part('a', [0, 0, 0], [1, 1, 1]), part('b', [1 + d, 0, 0], [2, 1, 1])]).length;
  assert.equal(apart(SLACK / 2), 1);
  assert.equal(apart(SLACK), 1); // the slack is inclusive
  assert.equal(apart(SLACK * 5), 2);
});
