/**
 * How loud the mix actually is — ITU-R BS.1770-4, in Node.
 *
 * docs/audio-direction.md §12 states a loudness target of "-18 LUFS
 * integrated, -1 dBTP" and, until this file, nothing in the repository could
 * read either number back. #661 gave the graph a true-peak ceiling, which is a
 * different promise: a ceiling says the mix never *exceeds* full scale and
 * says nothing at all about where it *sits*. A mix can hold -1 dBTP perfectly
 * and still be six decibels hotter than the target for its entire length,
 * which is heard as fatigue rather than as distortion — and fatigue is what
 * #663 reports.
 *
 * So: the standard meter, not an approximation of one. Integrated loudness is
 * a gated mean, and the gates are the whole reason the figure means anything —
 * an ungated average is dragged down by every silence in the material and
 * reports a bed as quiet because the match had a lull in it.
 *
 * Pure and sample-rate-pinned at 48 kHz. The K-weighting coefficients below
 * are the standard's own, tabulated for 48 kHz, and resampling a mix to meet
 * them would put an interpolator inside the measurement. The renderer is asked
 * for 48 kHz instead (tools/audio-meter/meter.mjs).
 */

/** The rate the K-weighting coefficients below are specified at. */
export const RATE = 48000;

/**
 * Stage 1 of the K-weighting: the high-shelf that stands in for the head.
 *
 * BS.1770-4 Table 1. +4 dB above roughly 1 kHz, which is why a mix whose
 * energy sits in the presence band measures louder than one of the same peak
 * level sitting in the bass — the meter hears the way the ear does, and that
 * is precisely the property #663 needs from it.
 */
const SHELF = {
  b: [1.53512485958697, -2.69169618940638, 1.19839281085285],
  a: [1, -1.69065929318241, 0.73248077421585],
};

/**
 * Stage 2: the RLB high-pass, BS.1770-4 Table 2.
 *
 * -3 dB near 40 Hz and falling fast below it. This is the standard admitting
 * what #663's second hypothesis says out loud: energy down there is not heard
 * as level. It is still *spent* — by the amplifier, and by a phone speaker's
 * excursion — which is why `bandPowers` below reports it separately instead of
 * letting the loudness figure be the only answer.
 */
const RLB = {
  b: [1.0, -2.0, 1.0],
  a: [1, -1.99004745483398, 0.99007225036621],
};

/** One direct-form-I biquad pass over a channel, out of place. */
function biquad(samples, { b, a }) {
  const out = new Float64Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = b[0] * x0 + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** K-weight one channel: shelf, then RLB. */
export function kWeight(samples) {
  return biquad(biquad(samples, SHELF), RLB);
}

/**
 * Integrated loudness, LUFS, of a set of channels.
 *
 * 400 ms blocks at 75% overlap, then the standard's two gates: drop anything
 * below -70 LUFS absolute, take the mean of what is left, and drop anything
 * more than 10 LU below *that*. The relative gate is the one that matters
 * here — it is what stops a twenty-second render of a bed from being averaged
 * against its own fade-in.
 *
 * Returns `-Infinity` for material that is silent or shorter than one block,
 * which the caller prints as a dash rather than a number.
 */
export function integratedLufs(channels) {
  const weighted = channels.map(kWeight);
  const length = weighted[0]?.length ?? 0;
  const blockLen = Math.round(0.4 * RATE);
  const step = Math.round(0.1 * RATE);
  if (length < blockLen) return -Infinity;

  // Mean square per channel per block — kept, not reduced, because both gates
  // are decided on the summed block loudness and then applied to these.
  const blocks = [];
  for (let start = 0; start + blockLen <= length; start += step) {
    let summed = 0;
    for (const channel of weighted) {
      let power = 0;
      for (let i = start; i < start + blockLen; i++) power += channel[i] * channel[i];
      summed += power / blockLen;
    }
    blocks.push(summed);
  }
  if (blocks.length === 0) return -Infinity;

  const loudness = (power) => (power <= 0 ? -Infinity : -0.691 + 10 * Math.log10(power));
  const above = (threshold) => blocks.filter((power) => loudness(power) > threshold);

  const absolute = above(-70);
  if (absolute.length === 0) return -Infinity;
  const mean = (list) => list.reduce((sum, power) => sum + power, 0) / list.length;
  const relative = above(loudness(mean(absolute)) - 10);
  if (relative.length === 0) return -Infinity;
  return loudness(mean(relative));
}

/**
 * Peak sample level, dBFS — what a naive meter reports.
 *
 * Kept beside the true-peak figure below because the gap between the two is
 * itself information: a signal whose inter-sample peaks run well above its
 * samples is one whose energy is high relative to the sample rate, and a
 * converter will clip it where a sample meter swears it is clean.
 */
export function samplePeakDb(channels) {
  const peak = samplePeakLinear(channels);
  return peak <= 0 ? -Infinity : 20 * Math.log10(peak);
}

/** The largest sample magnitude across every channel, linear. */
function samplePeakLinear(channels) {
  let peak = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      const magnitude = Math.abs(channel[i]);
      if (magnitude > peak) peak = magnitude;
    }
  }
  return peak;
}

/**
 * True peak, dBTP — the peak of the reconstructed waveform, not of the samples.
 *
 * BS.1770-4 Annex 2 asks for at least 4x oversampling before the peak is read.
 * This is a 4-phase windowed-sinc interpolator rather than the standard's
 * tabulated 48-tap filter: the difference between them is hundredths of a
 * decibel on material like this, and a hand-typed coefficient table is a
 * transcription error waiting to be believed.
 */
export function truePeakDb(channels) {
  const PHASES = 4;
  const HALF = 12;
  // One polyphase set, built once: phase p reconstructs the point p/4 of a
  // sample after each input sample. Blackman-windowed, so the stopband is deep
  // enough that the interpolator does not invent the peak it reports.
  const filters = [];
  for (let phase = 0; phase < PHASES; phase++) {
    const offset = phase / PHASES;
    const taps = new Float64Array(2 * HALF);
    let sum = 0;
    for (let k = 0; k < 2 * HALF; k++) {
      const t = k - HALF + 1 - offset;
      const sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
      const w = k / (2 * HALF - 1);
      const window = 0.42 - 0.5 * Math.cos(2 * Math.PI * w) + 0.08 * Math.cos(4 * Math.PI * w);
      taps[k] = sinc * window;
      sum += taps[k];
    }
    for (let k = 0; k < taps.length; k++) taps[k] /= sum;
    filters.push(taps);
  }

  // Sample peak first, so the interpolator only has to run where an
  // inter-sample peak could possibly beat it. A reconstructed peak exceeds the
  // samples around it by at most ~3 dB, and that bound is only approached by a
  // signal sitting at Nyquist; -6 dB is twice the margin and turns an O(n)
  // convolution over twenty seconds of stereo into one over a handful of
  // neighbourhoods. Without it a full run of the meter is minutes of
  // arithmetic to refine a number by hundredths.
  let peak = samplePeakLinear(channels);
  if (peak <= 0) return -Infinity;
  const gate = peak * 0.5;

  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      if (Math.abs(channel[i]) < gate) continue;
      for (const taps of filters) {
        let acc = 0;
        for (let k = 0; k < taps.length; k++) {
          const index = i + k - HALF + 1;
          if (index >= 0 && index < channel.length) acc += taps[k] * channel[index];
        }
        const interpolated = Math.abs(acc);
        if (interpolated > peak) peak = interpolated;
      }
    }
  }
  return 20 * Math.log10(peak);
}
