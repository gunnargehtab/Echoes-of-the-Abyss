/**
 * The in-match score's composition and its input rule (#1599).
 *
 * docs/audio-direction.md §10, "The score", makes four promises a listener
 * could only check with the right speakers and a lot of patience: nothing in
 * the contact band, nothing within 60 cents of the Fields' tuned bed, a swell
 * that follows §4's bands, and only the pedal under Silent Running. The piece
 * is data, so each is asserted against the data. The engine half — that the
 * score waits for the first own-force frame and builds nothing on the tick —
 * is audioEngine.test.ts's.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GRID_MS, MUSIC_BAND, PHRASE_MS } from '../src/audio/menuBed.ts';
import {
  LAYER_LEVEL,
  PEDAL_LEVEL,
  SCORE_LAYERS,
  SCORE_PARTIALS_HZ,
  SCORE_PEDAL_HZ,
  TUNED_CLEARANCE_CENTS,
  scoreMixFor,
  scorePhrase,
} from '../src/audio/score.ts';
import { BED_HZ } from '../src/audio/tunedBed.ts';
import { SELF_BANDS, selfMixFor } from '../src/audio/selfNoise.ts';

const PHRASES = Array.from({ length: 32 }, (_, i) => scorePhrase(i));
const ALL = PHRASES.flat();

/** Distance in cents between two frequencies, unsigned. */
function cents(a: number, b: number): number {
  return Math.abs(1200 * Math.log2(a / b));
}

describe('the score: where it may sound', () => {
  it('never puts a note in the contact band', () => {
    for (const hz of SCORE_PEDAL_HZ) {
      assert.ok(hz < MUSIC_BAND.subMaxHz, `pedal ${hz} Hz is not under the sub ceiling`);
    }
    for (const partial of ALL) {
      assert.ok(partial.hz > MUSIC_BAND.airMinHz, `${partial.hz} Hz is inside the contact band`);
    }
  });

  it('leaves the tuned bed alone, and its octaves with it', () => {
    // §9: the score "must leave the fifth alone". Imported from the bed rather
    // than copied, so a bed retuned moves this test with it.
    for (const hz of SCORE_PARTIALS_HZ) {
      for (const [voice, bed] of Object.entries(BED_HZ)) {
        for (let octave = -1; octave <= 3; octave++) {
          const target = bed * 2 ** octave;
          assert.ok(
            cents(hz, target) >= TUNED_CLEARANCE_CENTS,
            `${hz} Hz is ${cents(hz, target).toFixed(0)} cents from the ${voice} at ${target} Hz`
          );
        }
      }
    }
  });

  it('has no semitone in its set, so no two partials can grind', () => {
    for (const a of SCORE_PARTIALS_HZ) {
      for (const b of SCORE_PARTIALS_HZ) {
        if (a === b) continue;
        assert.ok(cents(a, b) > 150, `${a} and ${b} Hz are a semitone apart`);
      }
    }
  });

  it('draws only from the authored set, and lands on the 5 Hz grid', () => {
    const allowed = new Set<number>(SCORE_PARTIALS_HZ);
    for (const partial of ALL) {
      assert.ok(allowed.has(partial.hz), `${partial.hz} Hz is not in the set`);
      assert.equal(partial.atMs % GRID_MS, 0, `${partial.atMs} ms is off the grid`);
      assert.ok(partial.atMs >= 0 && partial.atMs < PHRASE_MS);
      assert.ok(partial.gain > 0 && partial.gain <= 0.05, `${partial.gain} is too loud for a bed`);
    }
  });

  it('is the same piece every launch, and a different phrase every loop', () => {
    assert.deepEqual(scorePhrase(0), scorePhrase(0));
    const signature = (phrase: ReturnType<typeof scorePhrase>) =>
      phrase.map((p) => `${p.atMs}:${p.hz}:${p.layer}`).join('|');
    assert.equal(new Set(PHRASES.map(signature)).size, PHRASES.length, 'two phrases repeat');
  });
});

describe('the score: four layers, one per band', () => {
  it('writes every layer into every phrase', () => {
    for (const [index, phrase] of PHRASES.entries()) {
      for (let layer = 0; layer < SCORE_LAYERS; layer++) {
        assert.ok(
          phrase.some((p) => p.layer === layer),
          `phrase ${index} has nothing in layer ${layer}`
        );
      }
    }
  });

  it('reaches higher and holds shorter as the layers climb', () => {
    // §10's table: the lowest layer is the three lowest partials, long; full
    // plant adds the top of the set, shortest.
    const lowest = new Set(ALL.filter((p) => p.layer === 0).map((p) => p.hz));
    assert.deepEqual(
      [...lowest].sort((a, b) => a - b),
      SCORE_PARTIALS_HZ.slice(0, 3)
    );
    assert.ok(
      ALL.some((p) => p.layer === SCORE_LAYERS - 1 && p.hz === SCORE_PARTIALS_HZ.at(-1)),
      'the top layer never reaches the top of the set'
    );
    const mean = (layer: number) => {
      const own = ALL.filter((p) => p.layer === layer);
      return own.reduce((sum, p) => sum + p.durationMs, 0) / own.length;
    };
    for (let layer = 1; layer < SCORE_LAYERS; layer++) {
      assert.ok(mean(layer) < mean(layer - 1), `layer ${layer} holds as long as the one below`);
    }
    for (const p of ALL.filter((q) => q.layer === 0)) {
      assert.ok(p.durationMs >= 3000 && p.durationMs < 6000, `${p.durationMs} ms in layer 0`);
    }
  });
});

describe('the score: what it follows', () => {
  it('is in the same band as the self bed at every SIG', () => {
    for (let sig = 0; sig <= 100; sig++) {
      const band = scoreMixFor(sig, false).band;
      assert.equal(
        SELF_BANDS[band]!.label,
        selfMixFor(sig, false).label,
        `SIG ${sig}: the score and the bed disagree`
      );
    }
  });

  it('swells by density, height and level as the band climbs', () => {
    let previousSounding = 0;
    let previousLevel = 0;
    for (let band = 0; band < SELF_BANDS.length; band++) {
      const mix = scoreMixFor(SELF_BANDS[band]!.maxSig, false);
      const open = mix.layers.filter((g) => g > 0).length;
      assert.equal(open, band + 1, `band ${band} opens ${open} layers`);
      const sounding = ALL.filter((p) => mix.layers[p.layer]! > 0).length;
      assert.ok(sounding > previousSounding, `band ${band} is no denser than the one below`);
      const level = Math.max(...mix.layers);
      assert.ok(level > previousLevel, `band ${band} is no louder than the one below`);
      assert.equal(level, LAYER_LEVEL[band]);
      assert.equal(mix.pedal, PEDAL_LEVEL[band]);
      previousSounding = sounding;
      previousLevel = level;
    }
    // §10: −6 dB at the bottom, 0 at the top.
    assert.ok(Math.abs(20 * Math.log10(LAYER_LEVEL[0]) + 6) < 0.05);
    assert.equal(LAYER_LEVEL.at(-1), 1);
  });

  it('keeps only the pedal under Silent Running, at its lowest', () => {
    // At full plant too: running silent is a commitment of the whole fleet,
    // and the score answers the commitment, not the number underneath it.
    for (const sig of [5, 50, 95]) {
      const mix = scoreMixFor(sig, true);
      assert.equal(mix.band, -1);
      assert.ok(
        mix.layers.every((g) => g === 0),
        `SIG ${sig}: a layer stayed open`
      );
      assert.equal(mix.pedal, PEDAL_LEVEL[0]);
    }
  });
});
