/**
 * The keyed permutation a slot's handles are drawn from (#616, #1292, #1959).
 *
 * Moved here from `@echoes/shared` with the permutation itself, which now runs
 * AES under a 128-bit key and so lives where `node:crypto` does.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HandleCipher,
  handleKeyForSeed,
  isHandleKey,
  randomHandleKey,
} from '../src/sim/handleKey.ts';

const KEY = '00112233445566778899aabbccddeeff';

describe('HandleCipher — the opaque per-observer handle', () => {
  /**
   * Enough indices to cover a long match's worth of contacts for one slot,
   * ordnance included, and cheap enough to run every time.
   */
  const SAMPLE = 50_000;
  const cipher = new HandleCipher(KEY);

  it('is a permutation, so one counter can issue every handle without a collision check', () => {
    const seen = new Set<number>();
    for (let index = 1; index <= SAMPLE; index++) seen.add(cipher.contact(0, index));
    assert.equal(seen.size, SAMPLE, 'distinct handles for distinct indices');
  });

  it('never issues 0, which a caller is entitled to read as "no handle"', () => {
    for (let index = 0; index <= 2000; index++) {
      assert.notEqual(cipher.contact(0, index), 0);
      assert.notEqual(cipher.mark(0, index), 0);
    }
  });

  it('stays inside the handle range the old permutation published', () => {
    for (let index = 0; index <= 2000; index++) {
      const handle = cipher.contact(3, index);
      assert.ok(Number.isInteger(handle) && handle >= 1 && handle <= 2 ** 30, `${handle}`);
    }
  });

  it('does not preserve the order the counter issued them in', () => {
    // The property the whole construction exists for. A raw counter scores 1.0
    // here, and a raw counter is what published the phantoms of a scattered
    // ping ahead of that pass's true returns (docs/systems-echo.md §3).
    let ascending = 0;
    for (let index = 1; index <= SAMPLE; index++) {
      if (cipher.contact(0, index) > cipher.contact(0, index - 1)) ascending++;
    }
    const fraction = ascending / SAMPLE;
    assert.ok(fraction > 0.45 && fraction < 0.55, `a coin flip, was ${fraction.toFixed(4)}`);
  });

  it('gives two observers, and a mark and a contact, different handles for one index', () => {
    // Each slot resolves its own contacts, so nth-issued is not a fact two
    // clients may compare; and a slot's marks must not decode its contacts.
    for (let index = 1; index <= 500; index++) {
      assert.notEqual(cipher.contact(0, index), cipher.contact(1, index));
      assert.notEqual(cipher.contact(0, index), cipher.mark(0, index));
    }
  });

  it('is deterministic in the key, so a replay issues the identical handles', () => {
    const again = new HandleCipher(KEY);
    const other = new HandleCipher(randomHandleKey());
    let same = 0;
    for (let index = 1; index <= 500; index++) {
      assert.equal(cipher.contact(2, index), again.contact(2, index));
      if (cipher.contact(2, index) === other.contact(2, index)) same++;
    }
    assert.ok(same < 5, `another key agrees by chance alone, ${same} of 500`);
  });
});

describe('handle keys', () => {
  it('are 128 bits of lower-case hex, drawn fresh each time', () => {
    const a = randomHandleKey();
    assert.ok(isHandleKey(a));
    assert.notEqual(a, randomHandleKey());
  });

  it('follow a named seed, and only that seed', () => {
    assert.ok(isHandleKey(handleKeyForSeed(11)));
    assert.equal(handleKeyForSeed(11), handleKeyForSeed(11));
    assert.notEqual(handleKeyForSeed(11), handleKeyForSeed(12));
  });

  it('refuse anything else', () => {
    for (const bad of ['', 'abc', KEY.toUpperCase(), `${KEY}00`, 'g'.repeat(32), 7]) {
      assert.ok(!isHandleKey(bad), String(bad));
    }
    assert.throws(() => new HandleCipher('abc'), /handle key/);
  });
});
