/**
 * §11's speaker profile (#663) — docs/audio-direction.md §11.
 *
 * The profile's whole claim is about *which frequencies exist*, and that is a
 * property of two pure functions and one graph. So this file asks the claim
 * directly rather than reading node settings back and hoping: it puts a sine
 * through the harmonic shaper and transforms the result, which either contains
 * the series §11 asks for or does not.
 *
 * Levels are not asserted here. What the profile does to the integrated
 * loudness and to the band split is measured on rendered audio by
 * tools/audio-meter, which is the only honest place for it — a stubbed
 * `AudioContext` produces no samples, so a test claiming a mix got quieter
 * would be claiming it from arithmetic it did itself.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HeadlessAudioContext,
  installHeadlessAudio,
  uninstallHeadlessAudio,
  StubBiquadFilterNode,
  StubWaveShaperNode,
  type StubAudioNode,
  type StubGainNode,
} from './support/headlessAudio.ts';
import {
  SPEAKER_PROFILE,
  compressShape,
  createSpeakerProfile,
  harmonicShape,
  prefersSpeakerProfile,
} from '../src/audio/speakerProfile.ts';
import { AudioEngine } from '../src/audio/engine.ts';
import { DEFAULT_SETTINGS, type Settings } from '../src/settings/store.ts';

/**
 * Magnitude of harmonic `n` in one period-aligned buffer.
 *
 * A bare Goertzel-style correlation rather than an FFT: the frequencies of
 * interest are known exactly (they are multiples of the fundamental that was
 * put in), so there is nothing a transform would add but bins nobody reads.
 */
function harmonic(samples: Float64Array, cyclesPerBuffer: number): number {
  let re = 0;
  let im = 0;
  for (let i = 0; i < samples.length; i++) {
    const phase = (2 * Math.PI * cyclesPerBuffer * i) / samples.length;
    re += samples[i]! * Math.cos(phase);
    im += samples[i]! * Math.sin(phase);
  }
  return (2 * Math.hypot(re, im)) / samples.length;
}

/** One period-aligned sine, shaped by `shape`. */
function shaped(shape: (level: number) => number, amplitude: number): Float64Array {
  const N = 4096;
  const CYCLES = 8;
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    out[i] = shape(amplitude * Math.sin((2 * Math.PI * CYCLES * i) / N));
  }
  return out;
}

const FUNDAMENTAL_CYCLES = 8;

describe('the speaker profile: the harmonics §11 asks for', () => {
  it('turns one fundamental into a series with both even and odd members', () => {
    // §11: "adding harmonics rather than relying on fundamentals no laptop can
    // reproduce". A shaper that produced only odd harmonics (a bare tanh) or
    // only even ones (a bare rectifier) would be a thinner cue for the ear to
    // reconstruct a fundamental from, and reconstruction is the entire point.
    const out = shaped(harmonicShape, 0.3);
    const first = harmonic(out, FUNDAMENTAL_CYCLES);
    const second = harmonic(out, FUNDAMENTAL_CYCLES * 2);
    const third = harmonic(out, FUNDAMENTAL_CYCLES * 3);

    assert.ok(first > 0, 'the fundamental vanished from the shaper output');
    assert.ok(second > first * 0.05, `the 2nd harmonic is only ${(second / first).toFixed(3)}x`);
    assert.ok(third > first * 0.05, `the 3rd harmonic is only ${(third / first).toFixed(3)}x`);
  });

  it('generates more harmonic than fundamental as it is driven harder', () => {
    // The saturating half of the design: the harder the shaper is driven the
    // less its output depends on its input, which is where §11's "compressed"
    // is paid. Asserted as the direction rather than as a figure, because the
    // figure is DRIVE's to choose and is recorded in the meter's readings.
    const ratio = (amplitude: number): number => {
      const out = shaped(harmonicShape, amplitude);
      return harmonic(out, FUNDAMENTAL_CYCLES * 3) / harmonic(out, FUNDAMENTAL_CYCLES);
    };
    assert.ok(
      ratio(0.5) > ratio(0.05),
      'a louder input did not produce proportionally more harmonic'
    );
  });

  it('is asymmetric, which is the only way to have a 2nd harmonic at all', () => {
    // Worth pinning because symmetry looks like tidiness and is in fact the
    // bug: an odd transfer function emits only odd harmonics, so a shaper
    // "cleaned up" to be symmetric would silently drop every even member of
    // the series and halve the cue the ear reconstructs a fundamental from.
    assert.equal(harmonicShape(0), 0, 'silence came out as an offset');
    assert.ok(
      Math.abs(harmonicShape(0.4) + harmonicShape(-0.4)) > 1e-6,
      'the shaper is odd, so it can only produce odd harmonics'
    );

    // The price is a DC term, and the high-pass after the generator is what
    // pays it. Asserted together so the two cannot drift apart: a build that
    // removed the filter would leave the offset in the mix.
    const out = shaped(harmonicShape, 0.4);
    const mean = out.reduce((sum, value) => sum + value, 0) / out.length;
    assert.ok(Math.abs(mean) > 1e-6, 'no DC to remove — the shaper stopped making even harmonics');
    assert.ok(SPEAKER_PROFILE.HARMONIC_HZ > 0, 'nothing downstream removes the offset');
  });
});

describe('the speaker profile: the knee', () => {
  it('passes quiet material through untouched', () => {
    for (const level of [0, 0.05, 0.2, SPEAKER_PROFILE.KNEE]) {
      assert.equal(compressShape(level), level, `${level} was altered below the knee`);
      assert.equal(compressShape(-level), -level, `${-level} was altered below the knee`);
    }
  });

  it('never lets the profile be the reason the output clips', () => {
    // The profile sits before the output ceiling, so it may narrow the range
    // and may not widen it past what the ceiling promises (§12, -1 dBTP).
    for (let level = SPEAKER_PROFILE.KNEE; level <= 4; level += 0.01) {
      assert.ok(
        compressShape(level) <= SPEAKER_PROFILE.PEAK,
        `${level.toFixed(2)} passed the peak`
      );
      assert.ok(compressShape(-level) >= -SPEAKER_PROFILE.PEAK, `${-level.toFixed(2)} passed it`);
    }
  });

  it('compresses — the same input span comes out narrower', () => {
    const inputSpan = 3 - SPEAKER_PROFILE.KNEE;
    const outputSpan = compressShape(3) - compressShape(SPEAKER_PROFILE.KNEE);
    assert.ok(outputSpan < inputSpan, 'the knee widened the range instead of narrowing it');
  });
});

describe('the speaker profile: the graph', () => {
  it('offers both a plain path and a profiled one, and crossfades between them', () => {
    const context = new HeadlessAudioContext();
    const out = context.createGain();
    const profile = createSpeakerProfile(
      context as unknown as AudioContext,
      out as unknown as AudioNode
    );
    const input = profile.input as unknown as StubAudioNode;

    // Both paths are built and both stay connected: a toggle mid-match that
    // added or removed an edge under a running mix would be a click.
    assert.ok(input.outputs.length >= 3, 'the profile did not fan out into its paths');
    const shapers = context.nodes.filter((node) => node instanceof StubWaveShaperNode);
    assert.equal(shapers.length, 2, 'the harmonic generator and the knee are both shapers');

    // The harmonic path keeps only what a small speaker can radiate: a
    // low-pass to read the band, and a high-pass to drop the fundamental it
    // was read from.
    const filters = context.nodes.filter(
      (node): node is StubBiquadFilterNode => node instanceof StubBiquadFilterNode
    );
    const byType = (type: string) => filters.filter((node) => node.type === type);
    // Slope is asserted, not just corner. One biquad a side leaks most of an
    // octave either way, which is how the first build came to smear the low
    // band across the crossover instead of moving it — and the smear was the
    // hum. A cascade that lost a section would be that bug again, silently.
    assert.equal(byType('lowpass').length, SPEAKER_PROFILE.POLES, 'the read filter is too gentle');
    for (const node of byType('lowpass')) {
      assert.equal(node.frequency.value, SPEAKER_PROFILE.READ_HZ);
    }

    // Two high-passes and they are not interchangeable: one drops the
    // fundamental out of the *reconstruction*, and one takes the low band off
    // the *direct* path entirely. The first draft made the second a -10 dB
    // shelf, so both paths carried the band and the hum survived the fix — a
    // reconstruction summed with the thing it reconstructs is not a
    // reconstruction. Asserted as a pair so neither can quietly become a duck.
    const corners = byType('highpass').map((node) => node.frequency.value);
    for (const hz of [SPEAKER_PROFILE.CUT_HZ, SPEAKER_PROFILE.HARMONIC_HZ]) {
      assert.equal(
        corners.filter((value) => value === hz).length,
        SPEAKER_PROFILE.POLES,
        `the crossover at ${hz} Hz is not ${SPEAKER_PROFILE.POLES} sections deep`
      );
    }
    assert.equal(
      new Set(corners).size,
      2,
      'the direct path is not cut, or the reconstruction still carries its fundamental'
    );
    assert.equal(
      byType('lowshelf').length,
      0,
      'the low band is being attenuated rather than replaced'
    );

    // And the switch moves level rather than edges, in both directions.
    const gains = context.nodes.filter((node): node is StubGainNode => node.kind === 'GainNode');
    const before = gains.flatMap((node) => node.gain.writes).length;
    profile.set(true, 0);
    const on = gains.flatMap((node) => node.gain.writes);
    assert.ok(on.length > before, 'turning the profile on wrote nothing');
    assert.ok(
      on.some((write) => write.value === 1) && on.some((write) => write.value === 0),
      'the crossfade did not move one path up and the other down'
    );
  });

  it('puts the profile between master and the ceiling, never after it', () => {
    const context = installHeadlessAudio();
    const engine = new AudioEngine();
    try {
      engine.start();
      const graph = engine.graph;
      assert.ok(graph !== null);
      const ceiling = engine.outputCeiling as unknown as StubAudioNode;

      // §12's -1 dBTP is the last word on peak. A profile that ran after the
      // ceiling could push the output past it, which would answer #663 with
      // the fault #661 fixed.
      const direct = context.nodes.filter(
        (node) => node !== ceiling && node.outputs.includes(context.destination)
      );
      assert.deepEqual(direct, [], 'something reaches the device without passing the ceiling');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('remembers the setting made before the graph exists', () => {
    // The graph is lazy — browsers refuse an AudioContext without a gesture —
    // and settings load long before the first click. A profile that only took
    // effect when set after `start` would be off for exactly the players whose
    // device asked for it.
    const context = installHeadlessAudio();
    const engine = new AudioEngine();
    try {
      engine.setSpeakerProfile(true);
      assert.equal(engine.speakerProfileOn, true, 'the engine forgot the setting');
      engine.start();
      const gains = context.nodes.filter((node): node is StubGainNode => node.kind === 'GainNode');
      assert.ok(
        gains.some((node) => node.gain.writes.some((write) => write.value === 1)),
        'the graph was built with the profile off after it had been asked for'
      );
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });
});

describe('the speaker profile: the setting', () => {
  it('is a setting, defaulting off where nothing says otherwise', () => {
    // `matchMedia` does not exist under the test runner, so this is also the
    // guard: a profile that threw on a runtime without it would take the whole
    // settings load down with it.
    assert.equal(prefersSpeakerProfile(), false);
    assert.equal(DEFAULT_SETTINGS.speakerProfile, false);
    const settings: Settings = { ...DEFAULT_SETTINGS, speakerProfile: true };
    assert.equal(settings.speakerProfile, true);
  });
});
