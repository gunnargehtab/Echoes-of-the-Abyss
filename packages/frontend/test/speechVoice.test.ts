/**
 * The speech channel, as data — docs/audio-direction.md §13 (#381).
 *
 * The hail itself needs an AudioContext and is heard rather than asserted.
 * What can be pinned without one is everything the section states as a
 * number or a rule: how long a line is read for, what the whisper does to
 * that, and that the five registers are five *materials* rather than five
 * volumes of one — docs/culture.md §6's register test, applied to the table
 * the player is built from.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { MissionVoice } from '@echoes/shared';
import {
  HAILS,
  HAIL_S,
  READING,
  WHISPER,
  hailFor,
  readingSeconds,
} from '../src/audio/speechVoice.ts';

const VOICES: readonly MissionVoice[] = ['concern', 'plateaus', 'cohorts', 'order', 'court'];

describe('how long a line is read for', () => {
  it('runs at the stated rate between the stated floor and ceiling', () => {
    assert.equal(readingSeconds('x'.repeat(45)), 45 / READING.CHARS_PER_S);
    assert.equal(readingSeconds('x'.repeat(75)), 5);
    // A one-word line still opens the channel long enough to be heard as one.
    assert.equal(readingSeconds('No.'), READING.MIN_S);
    assert.equal(readingSeconds(''), READING.MIN_S);
    // A paragraph does not hold the rung for the length of a paragraph.
    assert.equal(readingSeconds('x'.repeat(10_000)), READING.MAX_S);
  });

  it('counts the spaces, because a reader does not skip them', () => {
    assert.equal(readingSeconds('a '.repeat(30)), 60 / READING.CHARS_PER_S);
  });

  it('halves under the whisper rule, after the clamp', () => {
    for (const text of ['No.', 'x'.repeat(60), 'x'.repeat(10_000)]) {
      assert.equal(readingSeconds(text, true), readingSeconds(text) * WHISPER.BED_SCALE);
    }
    // Halving after clamping keeps a whispered word shorter than a whispered
    // paragraph, which the other order would pin to one floor.
    assert.ok(readingSeconds('No.', true) < readingSeconds('x'.repeat(60), true));
    assert.equal(WHISPER.GAIN, 0.5, '§13: −6 dB');
  });
});

describe('the five hails', () => {
  it('are five, one per register, and the table is what hailFor reads', () => {
    assert.deepEqual(Object.keys(HAILS).sort(), [...VOICES].sort());
    for (const voice of VOICES) assert.equal(hailFor(voice), HAILS[voice]);
  });

  it('are five materials, not five volumes of one', () => {
    // §6's test made mechanical: a channel whose speakers share a mechanism
    // has one narrator with five names. Each register owns its mechanism and
    // its fundamental, and the court's is the dry one — the room with no
    // water in it.
    const materials = new Set(VOICES.map((voice) => HAILS[voice].material));
    assert.equal(materials.size, VOICES.length, 'every register has its own mechanism');
    const fundamentals = new Set(VOICES.map((voice) => HAILS[voice].hz));
    assert.equal(fundamentals.size, VOICES.length, 'every register has its own fundamental');
    assert.equal(HAILS.court.material, 'dry');
  });

  it('give the concern a beat and the plateaus none', () => {
    // §8's two poles, carried into speech: the concern is the only voice with
    // a metronome in it and the plateaus never repeat.
    assert.equal(HAILS.concern.jitter, 0);
    assert.ok(HAILS.plateaus.jitter > 0.8);
    assert.equal(HAILS.concern.material, 'reciprocating');
    assert.equal(HAILS.plateaus.material, 'breathing');
  });

  it('each lose their own top octave under the whisper, not a fixed one', () => {
    // The whisper low-passes at half the register's ceiling. Ceilings differ
    // by more than an octave across the table, so a single fixed cut would
    // gut the court and leave the concern untouched.
    const ceilings = VOICES.map((voice) => HAILS[voice].ceilingHz);
    assert.ok(Math.max(...ceilings) / Math.min(...ceilings) > 2);
    for (const voice of VOICES) assert.ok(HAILS[voice].ceilingHz / 2 > HAILS[voice].bedHz / 2);
  });

  it('open every line with the same length of signature', () => {
    // The hail's job is to say *which* voice, not *how much*; a longer hail
    // for one register would read as that register being more important.
    assert.equal(HAIL_S, 0.6);
  });
});
