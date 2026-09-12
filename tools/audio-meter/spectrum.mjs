/**
 * Where a layer's energy actually sits — the second half of #663's question.
 *
 * Integrated loudness (loudness.mjs) answers "how loud", and it answers it the
 * way the ear does, which means it deliberately discounts the bottom octave.
 * That is correct for a loudness target and useless for the fault #663
 * describes: a sustained 44 Hz tone barely moves a K-weighted meter and is the
 * single most expensive thing you can hand a phone speaker, because the driver
 * answers it with excursion it cannot turn into sound. The energy is spent
 * either way; it comes back as intermodulation across the bands that do carry
 * information.
 *
 * So this file reports the split. Four bands, chosen for what a small speaker
 * does with them rather than for any musical reason:
 *
 * | Band | What it is on a phone |
 * | --- | --- |
 * | below 60 Hz | excursion and nothing else. No phone speaker radiates here |
 * | 60-200 Hz | the bottom of what a phone reproduces, weakly |
 * | 200-2,000 Hz | where a phone is actually efficient, and where the ear is |
 * | above 2,000 Hz | present, and where fatigue lives if a layer is hot |
 *
 * Welch's method with a Hann window, because a single transform over twenty
 * seconds of noise gives a spectrum made mostly of variance.
 */

/** In-place iterative radix-2 FFT. Lengths must be a power of two. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** The band edges, Hz. Open-ended at both ends. */
export const EDGES = [60, 200, 2000];

/** Human labels for the four bands the edges above cut. */
export const BAND_LABELS = ['<60', '60-200', '200-2k', '>2k'];

/**
 * Fraction of total power in each band, as a four-element array summing to 1.
 *
 * Averaged over every channel and every frame — a mix's band balance is a
 * property of the whole render, and a layer that only spends its bottom octave
 * during a one-second swell is not what this is looking for.
 */
export function bandShares(channels, rate, fftSize = 8192) {
  const bins = new Float64Array(fftSize / 2 + 1);
  const window = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  }
  const hop = fftSize / 2;
  let frames = 0;

  for (const channel of channels) {
    for (let start = 0; start + fftSize <= channel.length; start += hop) {
      const re = new Float64Array(fftSize);
      const im = new Float64Array(fftSize);
      for (let i = 0; i < fftSize; i++) re[i] = channel[start + i] * window[i];
      fft(re, im);
      for (let k = 0; k <= fftSize / 2; k++) bins[k] += re[k] * re[k] + im[k] * im[k];
      frames++;
    }
  }
  if (frames === 0) return EDGES.map(() => 0).concat([0]);

  const shares = new Array(EDGES.length + 1).fill(0);
  let total = 0;
  for (let k = 0; k <= fftSize / 2; k++) {
    const hz = (k * rate) / fftSize;
    let band = EDGES.length;
    for (let e = 0; e < EDGES.length; e++) {
      if (hz < EDGES[e]) {
        band = e;
        break;
      }
    }
    shares[band] += bins[k];
    total += bins[k];
  }
  if (total <= 0) return shares;
  return shares.map((power) => power / total);
}
