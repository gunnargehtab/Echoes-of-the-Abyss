/**
 * The speaker profile — docs/audio-direction.md §11 (#663).
 *
 * §11 has listed this among the accessibility requirements since the document
 * was written and it has never existed: "a compressed, small-speaker mix that
 * preserves the 40-160 Hz contact band by adding harmonics rather than relying
 * on fundamentals no laptop can reproduce."
 *
 * Every report of this mix being physically uncomfortable has come from a
 * phone, and the measurement (tools/audio-meter) says why. The reported
 * picture measures -21.9 LUFS integrated — four decibels *under* §12's target,
 * so it is not too loud by any meter — and **78% of its energy sits below
 * 200 Hz**. A phone speaker is very inefficient in that band and distorts when
 * driven there, so level arriving below 200 Hz comes back as harshness instead
 * of as sound. That is a mix a meter calls correct and a listener calls
 * painful, and both are right.
 *
 * It is nobody's layer. §4's plant bed, §3's pressure-thump and §8's four
 * drive signatures all live between 40 and 200 Hz because that is what a
 * submarine sounds like. The band is the sound design, so the answer cannot be
 * to move the sound design — it is to deliver it differently on a device that
 * cannot play that band, which is exactly what §11 asked for.
 *
 * ## How it works
 *
 * Two paths in parallel, summed.
 *
 * ```text
 *          ┌─► high-pass 180 ──────────────────────────────────────────┐
 *   input ─┤                                                           ├─► out
 *          └─► low-pass 200 ─► shaper ─► high-pass 260 ─► lift ────────┘
 * ```
 *
 * The **direct path** does not carry the low band at all. That is the whole
 * design and the first draft of this file got it wrong: it used a -10 dB
 * shelf, on the reasoning that a cut was heavy-handed, and the result was that
 * both paths carried the band — the reconstruction *and* the fundamentals it
 * was reconstructing, ten decibels down. Ten decibels down is not gone, and a
 * sustained tone is the most noticeable thing in any mix, so the hum this file
 * exists to remove survived its own fix. The player reported it in the same
 * word they had used before, which is what a partial fix sounds like.
 *
 * Replacement, then, not attenuation: below 180 Hz the direct path is filtered
 * away and the harmonic path is what the band becomes. This is the topology
 * every small-speaker bass processor uses, and the reason it is a *profile*
 * with a switch is exactly so it can be this aggressive — a player on speakers
 * that reach the bottom octave turns it off and loses nothing.
 *
 * The **harmonic path** is the half §11 actually specifies. It isolates the
 * information band, generates its harmonic series with a static non-linearity,
 * and keeps only what lands above 260 Hz — where a small speaker is efficient.
 * The fundamental is never sent; the ear puts it back. This is the same
 * missing-fundamental reconstruction that lets a telephone carry a 100 Hz
 * voice through a channel that starts at 300 Hz, and it is why a contact at
 * 55 Hz stays a contact at 55 Hz rather than becoming a contact at 330.
 *
 * ## Why the compression is a curve and not a compressor
 *
 * §11 asks for a *compressed* mix, and the obvious tool is the one engine.ts
 * already refused for the output ceiling: Chromium's `DynamicsCompressorNode`
 * applies an internal makeup gain of 3-7 dB depending on threshold, which
 * silently moves the integrated level §12 pins and does it by an amount no
 * other engine need match. That argument has not changed.
 *
 * So the dynamic range comes down by the same means the ceiling holds: a
 * static soft knee, lower than the ceiling's, that leaves quiet material
 * untouched and progressively narrows the top of the range. It is arithmetic
 * rather than a behaviour, so it renders identically everywhere, adds no
 * latency and has nothing to pump. What it is not is a real compressor — it
 * has no time constants, so it cannot make a quiet passage louder, only stop a
 * loud one running away. That is the trade, stated rather than hidden.
 */

/**
 * The profile's fixed numbers. TUNABLE — §11 specifies the *behaviour* and the
 * band to preserve, and pins none of these.
 */
export const SPEAKER_PROFILE = {
  /**
   * Where the direct path stops carrying the mix, Hz.
   *
   * Above the whole of the contact band §11 names (40-160) on purpose: this is
   * what stops that band reaching the driver as excursion, and the harmonic
   * path below is what carries it instead. 12 dB per octave, so a 44 Hz plant
   * tone arrives about 26 dB down rather than the 10 dB a shelf left it at —
   * the difference between a hum that is quieter and a hum that is gone.
   */
  CUT_HZ: 210,

  /**
   * How many biquads each crossover filter is built from.
   *
   * Two, so each side is 24 dB per octave rather than 12. A single biquad was
   * not enough and the measurement said so plainly: with one pole-pair a side,
   * the share of the mix between 60 and 200 Hz barely moved when the direct
   * path went from a -10 dB shelf to a full cut, because both filters were
   * still leaking most of an octave either side of their corner. A crossover
   * that gentle does not replace a band, it smears it — and the smear is
   * exactly the sustained low-mid energy a phone speaker turns into a hum.
   */
  POLES: 2,

  /** The band the harmonic path reads, Hz. Everything the mix hides below. */
  READ_HZ: 200,

  /**
   * Where the generated harmonics are allowed to start, Hz.
   *
   * Above the driver's own knee, and high enough that the fundamental itself
   * and the shaper's DC offset are both gone. A 44 Hz plant tone arrives as
   * its 6th harmonic and up, spaced 44 Hz apart, which the ear resolves as a
   * 44 Hz residue pitch — the plant keeps its pitch without being sent it.
   */
  HARMONIC_HZ: 320,

  /**
   * How hard the shaper is driven, and how much of its output is even.
   *
   * Even harmonics (2nd, 4th) read as weight and odd ones (3rd, 5th) as edge,
   * and a series with both is what the ear reconstructs a fundamental from —
   * either alone is a thinner cue.
   *
   * The drive is where §11's "compressed" is actually paid, and it is the
   * number this file is tuned on — against §4's scale rather than against a
   * single reading. A `tanh` saturates, so the harder it is driven the less
   * its output depends on its input. Too little and the profile *expands* the
   * scale, because quiet material generates almost no harmonic and the
   * harmonic path is now the only thing carrying the low band; too much and it
   * flattens it. §4's climb from SIG 10 to SIG 80 spans 14.3 dB unprofiled,
   * measured on the bed alone (tools/audio-meter `bed:` and `bed-profile:`):
   *
   * | drive | §4's span, profiled | left between 60 and 200 Hz |
   * | --- | --- | --- |
   * | 8 | 18.0 dB — expanded | 8% |
   * | 12 | 14.6 dB — unchanged | 6% |
   * | 20 | 9.8 dB — compressed by a third | 4% |
   * | 30 | 6.4 dB — half the scale gone | 4% |
   *
   * 20 is the setting: §11 asks for a compressed mix and this is the row that
   * compresses without spending "being loud makes you deaf" to do it. It also
   * keeps the idle bed audible, which 8 does not — at that drive SIG 10 lands
   * at -51.5 LUFS, and §1's third law is that a player hears their own noise.
   */
  DRIVE: 20,
  EVEN: 0.45,

  /** How much of the harmonic path is mixed back in, linear. */
  LIFT: 0.55,

  /**
   * The static knee the profile compresses against, linear.
   *
   * Below the ceiling's 0.6 (engine.ts CEILING.KNEE), so the profile narrows
   * the range before the ceiling has anything to catch. Asymptotic to the same
   * -1 dBTP, so the profile can never be the reason the output clips.
   */
  KNEE: 0.35,
  PEAK: 0.891,

  /**
   * Output trim, linear. Applied after the knee, so the knee still has
   * something to work on.
   *
   * The harmonic path *adds* energy, and a profile that made the mix louder
   * would answer #663 with the fault it was reported for. Untrimmed, the
   * profile reads about a decibel *hotter* than the mix it replaces, because a
   * K-weighted meter finally counts energy that had been sitting in a band it
   * discounts.
   *
   * Set so the reported scene lands at -28.6 LUFS, which is not arithmetic:
   * it is the level the player who filed #663 called fine. They then said the
   * hum was still there, so this round changes the spectrum and holds the
   * level exactly where it was — one variable at a time, because a report of
   * "better" that could be either change is a report that settles nothing.
   *
   * Erring quiet remains the recoverable direction. Too soft has a master
   * volume and §11's +12 dB contact boost; too loud has this issue filed three
   * times.
   */
  TRIM: 0.106,

  /** Samples in each curve. Odd, so the midpoint is exactly zero. */
  POINTS: 4097,

  /** Input range the curves cover, as a multiple of full scale. */
  RANGE: 2,
} as const;

/**
 * The harmonic generator, as a pure function of level.
 *
 * **Asymmetric on purpose, and it has to be.** An odd transfer function —
 * `tanh` on its own — produces only odd harmonics, so a shaper kept symmetric
 * for tidiness would emit the 3rd and 5th and no 2nd at all. Even harmonics
 * require asymmetry; there is no third option. Squaring the driven signal
 * supplies them, at the cost of a DC term, and `HARMONIC_HZ`'s high-pass
 * downstream is what removes that term. That filter is therefore not a
 * refinement of this design but a load-bearing part of it: without it the
 * offset would push a rail into everything after it and spend the driver's
 * excursion on a constant.
 *
 * Exported so the series can be asserted arithmetically rather than inferred
 * from a node's settings — the whole claim of this file is about which
 * harmonics exist, and that is a property of this function.
 */
export function harmonicShape(level: number): number {
  const driven = Math.tanh(SPEAKER_PROFILE.DRIVE * level);
  return (1 - SPEAKER_PROFILE.EVEN) * driven + SPEAKER_PROFILE.EVEN * driven * driven;
}

/**
 * The profile's soft knee — identity below KNEE, asymptotic to PEAK above it.
 *
 * Same shape as the output ceiling's and deliberately so: one idea, at two
 * thresholds, doing dynamic-range reduction at the first and hearing safety at
 * the second.
 */
export function compressShape(level: number): number {
  const sign = level < 0 ? -1 : 1;
  const magnitude = Math.abs(level);
  if (magnitude <= SPEAKER_PROFILE.KNEE) return level;
  const span = SPEAKER_PROFILE.PEAK - SPEAKER_PROFILE.KNEE;
  return (
    sign * (SPEAKER_PROFILE.KNEE + span * Math.tanh((magnitude - SPEAKER_PROFILE.KNEE) / span))
  );
}

/** A curve sampled over [-RANGE, RANGE], as a WaveShaperNode wants it. */
function curveOf(shape: (level: number) => number): Float32Array<ArrayBuffer> {
  // Allocated over an explicit ArrayBuffer for the reason the ceiling's is:
  // the default Float32Array type admits a SharedArrayBuffer and
  // `WaveShaperNode.curve` does not.
  const curve = new Float32Array(new ArrayBuffer(SPEAKER_PROFILE.POINTS * 4));
  const last = SPEAKER_PROFILE.POINTS - 1;
  for (let i = 0; i <= last; i++) {
    curve[i] = shape(((i / last) * 2 - 1) * SPEAKER_PROFILE.RANGE);
  }
  return curve;
}

export function harmonicCurve(): Float32Array<ArrayBuffer> {
  return curveOf(harmonicShape);
}

export function compressCurve(): Float32Array<ArrayBuffer> {
  return curveOf(compressShape);
}

/**
 * `POLES` biquads of one type in series, at one corner.
 *
 * Butterworth Q on each section, which is not the textbook alignment for a
 * cascade — two 0.707 sections give -6 dB at the corner rather than -3 — and
 * is the right trade here: the corner is a crossover between two paths that
 * are summed, so a little dip where they meet costs less than the resonant
 * peak a higher Q would put in the band this whole file is trying to empty.
 */
function cascade(
  context: AudioContext,
  type: 'highpass' | 'lowpass',
  hz: number
): { input: BiquadFilterNode; output: BiquadFilterNode } {
  let first: BiquadFilterNode | null = null;
  let last: BiquadFilterNode | null = null;
  for (let i = 0; i < SPEAKER_PROFILE.POLES; i++) {
    const section = context.createBiquadFilter();
    section.type = type;
    section.frequency.value = hz;
    section.Q.value = Math.SQRT1_2;
    if (first === null) first = section;
    else last!.connect(section);
    last = section;
  }
  return { input: first!, output: last! };
}

/** What `createSpeakerProfile` hands back: where to feed it, and its switch. */
export interface SpeakerProfile {
  /** Connect the mix to this. */
  input: GainNode;
  /**
   * Turn the profile on or off, ramped.
   *
   * A cross-fade between two always-built paths rather than a rewiring,
   * because a player may flip this mid-match and a graph edge added or removed
   * under a running mix is a click at best.
   */
  set(on: boolean, now: number): void;
}

/** Seconds to cross-fade between the profile and the plain mix. */
const SWITCH_S = 0.12;

/**
 * Build the profile between `destination` and whatever feeds the returned
 * input.
 *
 * Both the profile chain and a plain bypass are built and both stay connected;
 * `set` moves the level between them.
 */
export function createSpeakerProfile(
  context: AudioContext,
  destination: AudioNode
): SpeakerProfile {
  const input = context.createGain();

  // --- the plain mix, for when the profile is off ---------------------------
  const bypass = context.createGain();
  bypass.gain.value = 1;
  input.connect(bypass).connect(destination);

  // --- the profile ----------------------------------------------------------
  const profile = context.createGain();
  profile.gain.value = 0;

  const summed = context.createGain();
  summed.gain.value = 1;

  // Direct: the mix, without the band the driver cannot play.
  const cut = cascade(context, 'highpass', SPEAKER_PROFILE.CUT_HZ);
  input.connect(cut.input);
  cut.output.connect(summed);

  // Harmonic: read the low band, generate its series, keep what a small
  // speaker can actually radiate.
  const read = cascade(context, 'lowpass', SPEAKER_PROFILE.READ_HZ);

  const generator = context.createWaveShaper();
  generator.curve = harmonicCurve();
  generator.oversample = '4x';

  const keep = cascade(context, 'highpass', SPEAKER_PROFILE.HARMONIC_HZ);

  const lift = context.createGain();
  lift.gain.value = SPEAKER_PROFILE.LIFT;

  input.connect(read.input);
  read.output.connect(generator).connect(keep.input);
  keep.output.connect(lift).connect(summed);

  // The static knee, then the trim — in that order, because a trim ahead of
  // the knee would move the whole profile below it and leave the compression
  // doing nothing at all. The knee works at the profile's natural level and
  // the trim decides what leaves.
  const compress = context.createWaveShaper();
  compress.curve = compressCurve();
  compress.oversample = '4x';

  const trim = context.createGain();
  trim.gain.value = SPEAKER_PROFILE.TRIM;

  summed.connect(compress).connect(trim).connect(profile).connect(destination);

  return {
    input,
    set(on: boolean, now: number): void {
      profile.gain.setTargetAtTime(on ? 1 : 0, now, SWITCH_S / 3);
      bypass.gain.setTargetAtTime(on ? 0 : 1, now, SWITCH_S / 3);
    },
  };
}

/**
 * Whether this device should start with the profile on.
 *
 * There is no Web API that says how big a speaker is, so this is a proxy and
 * says so: a coarse pointer on a small screen is a phone, and a phone is the
 * device every report of #663 has come from. It is the same shape as
 * `reducedMotion` reading `prefers-reduced-motion` — a default taken from what
 * the environment already says, honoured only until the player touches the
 * control.
 *
 * Guarded twice over, like that one: `matchMedia` does not exist under the
 * test runner, and some privacy modes throw on it rather than answering.
 */
export function prefersSpeakerProfile(): boolean {
  try {
    return globalThis.matchMedia?.('(pointer: coarse) and (max-width: 900px)').matches === true;
  } catch {
    return false;
  }
}
