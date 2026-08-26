/**
 * The menu bed's composition (#194).
 *
 * The reason this file exists is the band law. docs/audio-direction.md §10
 * gives music two registers — under 40 Hz and over 800 Hz — and reserves
 * everything between for contacts, permanently. A partial that drifted into
 * the contact band would break nothing, throw nothing and fail no other test;
 * it would just quietly teach players that the band where returns live is
 * where music lives. So the piece is composed as data and the law is asserted
 * against that data.
 *
 * The Web Audio half is not tested here and deliberately so: there is no
 * AudioContext under the test runner, and a mock of one would only assert that
 * this file calls the functions this file calls.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  duePhrases,
  GRID_MS,
  MUSIC_BAND,
  menuPhrase,
  PARTIALS_HZ,
  PEDAL_HZ,
  PHRASE_MS,
} from '../src/audio/menuBed.ts';

/** Every phrase a player could plausibly sit through, and then some. */
const PHRASES = Array.from({ length: 32 }, (_, i) => menuPhrase(i));

describe('the menu bed', () => {
  it('never puts a note in the contact band', () => {
    // §10: "Music occupies above 800 Hz and below 40 Hz. The 40-160 Hz contact
    // band belongs to contacts, permanently." The pedal takes the lower
    // register, the partials the upper, and nothing may sit between them.
    for (const hz of PEDAL_HZ) {
      assert.ok(hz < MUSIC_BAND.subMaxHz, `pedal ${hz} Hz is not under the sub ceiling`);
    }
    for (const [index, phrase] of PHRASES.entries()) {
      for (const partial of phrase) {
        assert.ok(
          partial.hz > MUSIC_BAND.airMinHz,
          `phrase ${index}: ${partial.hz} Hz is inside the band contacts own`
        );
      }
    }
  });

  it('draws only from the authored set', () => {
    const allowed = new Set<number>(PARTIALS_HZ);
    for (const phrase of PHRASES) {
      for (const partial of phrase) {
        assert.ok(allowed.has(partial.hz), `${partial.hz} Hz is not in the authored set`);
      }
    }
  });

  it('lands every onset on the 5 Hz grid', () => {
    // The interface quantises to the Echo Layer's 200 ms so it feels like
    // sonar rather than video; the port sets that pulse before the water does.
    for (const phrase of PHRASES) {
      for (const partial of phrase) {
        assert.equal(partial.atMs % GRID_MS, 0, `${partial.atMs} ms is off the grid`);
        assert.ok(partial.atMs >= 0 && partial.atMs < PHRASE_MS, 'onset is inside its phrase');
      }
    }
  });

  it('is the same piece every launch, and a different phrase every loop', () => {
    // Both halves matter. A theme that changed each launch is not a theme; a
    // phrase that repeated exactly would turn its loop point into a hook.
    assert.deepEqual(menuPhrase(0), menuPhrase(0));
    assert.deepEqual(menuPhrase(11), menuPhrase(11));
    const signature = (index: number) =>
      menuPhrase(index)
        .map((p) => `${p.atMs}:${p.hz}`)
        .join('|');
    const seen = new Set(PHRASES.map((_, i) => signature(i)));
    assert.equal(seen.size, PHRASES.length, 'two phrases came out identical');
  });

  it('stays sparse and overlapping rather than becoming a melody', () => {
    for (const [index, phrase] of PHRASES.entries()) {
      // A phrase with nothing in it is a gap in the bed; one with a note every
      // grid step is a texture nobody wants under a menu.
      assert.ok(phrase.length >= 5, `phrase ${index} has only ${phrase.length} onsets`);
      assert.ok(phrase.length <= 40, `phrase ${index} has ${phrase.length} onsets`);

      // Notes must outlive the gaps between them — that is what makes the
      // piece a drift rather than a pulse.
      const meanDuration = phrase.reduce((sum, p) => sum + p.durationMs, 0) / phrase.length;
      const meanGap = PHRASE_MS / phrase.length;
      assert.ok(
        meanDuration > meanGap * 0.5,
        `phrase ${index}: notes average ${meanDuration.toFixed(0)} ms against a ${meanGap.toFixed(0)} ms gap`
      );
    }
  });

  it('keeps every partial quiet, and the high ones quieter', () => {
    // The bed's own ceiling is applied downstream; these are the levels
    // *within* it, and §12's headroom for the exposure cue is the reason none
    // of them may be large. The tilt is the only EQ the piece has.
    const gainAt = new Map<number, number>();
    for (const phrase of PHRASES) {
      for (const partial of phrase) {
        assert.ok(
          partial.gain > 0 && partial.gain <= 0.05,
          `${partial.gain} is outside the level a bed may take`
        );
        gainAt.set(partial.hz, partial.gain);
      }
    }
    const lowest = gainAt.get(PARTIALS_HZ[0]);
    const highest = gainAt.get(PARTIALS_HZ[PARTIALS_HZ.length - 1]);
    assert.ok(lowest !== undefined && highest !== undefined, 'both ends of the set are used');
    assert.ok(highest < lowest, 'the top of the set is not tilted down against the bottom');
  });
});

/**
 * The queue arithmetic, which is where the first version was wrong.
 *
 * The bed schedules a phrase ahead of time and tops the queue up on a timer.
 * The first version ticked once per phrase, at exactly the moment the next one
 * was due, with a look-ahead exactly as long as the gap it had to cover — so
 * whether the music continued came down to whether the audio clock had drifted
 * a few milliseconds ahead of `setInterval` or behind it. In a browser it lost:
 * the second phrase was never queued and the bed simply stopped. None of that
 * is visible to a type or an exception, so it is checked here.
 */
describe("the bed's scheduler", () => {
  const PHRASE_S = PHRASE_MS / 1000;

  it('never lets the queue run dry, whichever way the clocks drift', () => {
    // Walk two clocks forward independently: the timer fires every 2 s and the
    // audio clock runs 0.3% fast, which is far more drift than real hardware.
    let cursor = 0;
    let queued = 0;
    let lastStart = 0;
    for (let tick = 0; tick < 200; tick++) {
      const now = tick * 2 * 1.003;
      const { starts, nextAt } = duePhrases(cursor, now);
      for (const at of starts) {
        // Every phrase must begin no later than the previous one ended, or
        // there is a hole in the bed.
        assert.ok(
          queued === 0 || at <= lastStart + PHRASE_S + 1e-6,
          `gap of ${(at - lastStart - PHRASE_S).toFixed(3)} s before phrase ${queued}`
        );
        lastStart = at;
        queued++;
      }
      cursor = nextAt;
    }
    // 400 s of wall clock at 48 s a phrase.
    assert.ok(queued >= 8, `only ${queued} phrases over 400 s`);
  });

  it('queues nothing when the queue is already full', () => {
    const { starts, nextAt } = duePhrases(1000, 10);
    assert.deepEqual(starts, []);
    assert.equal(nextAt, 1000, 'a full queue leaves the cursor alone');
  });

  it('does not try to catch up on a tab that was suspended for an hour', () => {
    // The cursor is an hour in the past. Those phrases are over; scheduling
    // them would burn an oscillator each on sound nobody can hear.
    const { starts, nextAt } = duePhrases(0, 3600);
    assert.ok(starts.length <= 4, `${starts.length} phrases scheduled at once`);
    assert.ok(
      starts.every((at) => at >= 3600),
      'a phrase was scheduled into the past'
    );
    assert.ok(nextAt > 3600, 'the cursor did not move forward');
  });
});
