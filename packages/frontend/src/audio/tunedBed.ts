/**
 * Tuned water — docs/audio-direction.md §9, "Tuned water".
 *
 * Every other bed in this directory is a *colour*: the biome voicings filter
 * contacts, the mark bed is band-limited residue, the self bed is plant noise.
 * The Resonance Fields are the first water in the bible with a **pitch** in
 * them — "crystal formations resonate under any pressure change, so the whole
 * region sounds faintly and never quite settles"
 * (docs/mission-aptitude.md §7) — and a pitch is a different problem for the
 * mix rather than a bigger version of an old one. A colour cannot be out of
 * tune. This one can, and the whole of the Standing Wave's warning
 * (docs/mission-standing-wave.md §8) is built on it being able to be.
 *
 * Four voices, and the last two are the ones that carry information:
 *
 * - the **root** and its **fifth**, which is the canyon, and is what the
 *   Order named the ground for;
 * - the **third**, which arrives where the formation rises around the
 *   listener — a chapter-house is cut into the crystal that stands proudest of
 *   its slope, so the Third's own water is the one that sounds like a chord;
 * - the **corridor**, a second fifth placed over the canyon's own, panned
 *   between the two nodes holding it, which is a Standing Wave heard as the
 *   thing the ground was already ringing at, made louder and given a bearing
 *   the Fields never had;
 * - and that corridor's **flat**, when a node holding it is being shot.
 *
 * The flat is on the corridor's fifth alone and never on the canyon's. That is
 * not a mixing convenience, it is what is physically happening: the ground goes
 * on ringing true and the player's instrument stops agreeing with it, so what
 * the player hears is the *beat* between the two — around 9 Hz at the moment
 * the node crosses 40%, widening as it falls. §8 promises that "a player is
 * never told that their kill-line is failing by seeing a health bar; they are
 * told by hearing it go flat", and a beating pair of sustained tones is the
 * most unmissable way that sentence can be true.
 *
 * Everything here is pure except `TunedBed`, for the reason `selfNoise.ts`
 * gives: the decisions are the doc, so they are assertable without an
 * AudioContext.
 */

import { STANDING_WAVE } from '@echoes/shared';

/**
 * SPEC — docs/audio-direction.md §9, "Tuned water".
 *
 * The pitches are *just*, not tempered, and the reason is
 * docs/mission-aptitude.md §1: a chapter-house is "a physical instrument tuned
 * over generations", and nothing tuned by ear over generations lands on equal
 * temperament. So the fifth is exactly 3:2 and the third exactly 5:4, which
 * also gives "goes flat" a number to be measured against.
 */
export const TUNED = {
  /**
   * The root, Hz. Above §6's 800 Hz mark ceiling and far above the 40–160 Hz
   * band §10 reserves for contacts permanently — the crystal is the one
   * ambience in the game with a pitch, and it may not be in the band the
   * things it is water *for* speak in. 880 is also where the port's cold
   * partials start (§10, "The port"), which is deliberate: it is the register
   * this game has already decided crystal sounds in.
   */
  ROOT_HZ: 880,
  /** A just perfect fifth. The interval the Fifth is named for. */
  FIFTH_RATIO: 3 / 2,
  /** A just major third — the chapter-house's chord, over the canyon's dyad. */
  THIRD_RATIO: 5 / 4,
  /**
   * Ceiling on the bed, linear, on the world bus.
   *
   * Exactly 6 dB under `MARK_CEILING`, which §6 already put 6 dB under the
   * live contact bus. So the water sits 12 dB under the contacts it carries
   * and 6 dB under the memory of them, which is the right order: the ocean is
   * the least urgent true thing in the mix, and it is still true.
   */
  CEILING: 0.17,
  /** The fifth, as a fraction of the root. A fifth is colour on a root. */
  FIFTH_LEVEL: 0.7,
  /** The third, likewise, and quieter again — it is the rarest of the three. */
  THIRD_LEVEL: 0.55,
  /**
   * Ceiling on the corridor voice, linear — level with the mark bed, 6 dB over
   * the water it is written into and still 6 dB under contacts.
   *
   * The corridor is the player's own instrument and §8 makes it a warning, so
   * it may not be as quiet as the ground. It may not be louder than a contact
   * either: a kill-line failing is worth knowing and a hull arriving is worth
   * more.
   */
  CORRIDOR_CEILING: 0.34,
  /**
   * Range at which the corridor voice reaches zero, metres. TUNABLE.
   *
   * Long, because the corridor carries at
   * `STANDING_WAVE.CORRIDOR_PF` — docs/mission-standing-wave.md §1 calls it a
   * megaphone pointed at the bottom of the Rift, and a megaphone you can only
   * hear from inside is not one. Four kilometres covers most of a mission map
   * and still leaves the far corner of one quiet.
   */
  CORRIDOR_RANGE_M: 4000,
  /**
   * Cents the corridor's fifth is dragged flat at the instant a paired node
   * crosses `STANDING_WAVE.DETUNE_HP_FRACTION`. SPEC — §9.
   *
   * Twelve, because the crossing has to be *audible as a crossing* rather than
   * as the start of a slow slide from nothing. Twelve cents against the bed's
   * true fifth beats at about 9 Hz — a warble nobody mistakes for the water,
   * arriving on the tick the node drops under 40%.
   */
  DETUNE_FLOOR_CENTS: 12,
  /**
   * Cents flat at zero hull. SPEC — §9. A quarter-tone.
   *
   * A quarter-tone is the widest error that is still unambiguously *this
   * interval, wrong*. Anything narrower reads as beating and nothing more;
   * anything wider reads as a different interval — the party having retuned
   * rather than the party being shot — and §8's sentence needs the player to
   * hear a fifth failing, not a tritone arriving.
   */
  DETUNE_MAX_CENTS: 50,
  /**
   * Metres of rise at which the chapter-house's third is fully in. TUNABLE,
   * but both maps that have crystal country author the same number: the
   * Third's Approach stands 250 m over the Fields around it
   * (`outer-formations`), and the North Gallery stands 250 m over the defile
   * (`the-fifth`). The chord is therefore the Third's country on both maps
   * without either map being asked to say so.
   */
  CHORD_FULL_RISE_M: 250,
  /**
   * Radius the bed samples the ground over, metres. TUNABLE.
   *
   * "How much crystal is around me" is a question about the water within
   * earshot, not about the cell under the cursor — one cell would make the bed
   * flicker as the camera crossed a boundary, which is the one thing an
   * ambient bed must never do.
   */
  EAR_RADIUS_M: 1000,
  /**
   * Seconds to reach a new bed level. Long, for §6's reason restated: the bed
   * is the ocean, and an ocean with an onset is a contact.
   */
  RAMP_S: 2.5,
  /**
   * Seconds to reach a new corridor level. Shorter — a corridor closing is an
   * event, and the player caused it — but still far too slow to read as a
   * transient.
   */
  CORRIDOR_RAMP_S: 0.8,
  /**
   * Seconds the flat takes to arrive. It is a slide, not a step: §8 wants the
   * line heard *failing*, and a step would report a threshold instead.
   */
  DETUNE_RAMP_S: 1.5,
  /**
   * §9's "slow phase drift", as a shallow vibrato on the fifth: cents of sway
   * and its rate in Hz. This is aptitude §7's "never quite settles", and it is
   * deliberately narrower than `DETUNE_FLOOR_CENTS` so the water's own unrest
   * can never be mistaken for a line going flat.
   */
  DRIFT_CENTS: 4,
  DRIFT_HZ: 0.07,
} as const;

/** A standing corridor the client can resolve, reduced to what the bed needs. */
export interface CorridorReading {
  /** Stereo position of the line's midpoint, already resolved by the renderer. */
  pan: number;
  /** Range from the ear to that midpoint, metres. */
  rangeM: number;
  /**
   * Worst hull fraction across the two nodes holding it, 0-1.
   *
   * Worst and not a mean, for the reason `SelfAudioFrame.sourS` is a peak: the
   * question the sound answers is "is this line failing", and one node at 30%
   * fails it whatever the other one reads.
   */
  hpFraction: number;
}

/** One node the client can see well enough to hear a corridor by. */
export interface TunedNode {
  x: number;
  y: number;
  /** Hull remaining, 0-1. */
  hpFraction: number;
}

/**
 * The strongest corridor a pool of nodes can be read as holding, or null.
 *
 * **This is an inference, and it is worth being precise about what kind.**
 * `paired` is not on the wire and neither is the PF grid's corridor write, so
 * the client never learns that two Spires are a pair. What it has is the
 * geometry and the pairing rule
 * (docs/mission-standing-wave.md §13): a node pairs with the nearest
 * completed, unpaired node of the same commander within
 * `STANDING_WAVE.PAIR_RANGE_M` at the moment it completes, and a node holding
 * an interval sings at `sigActive`.
 *
 * **Two cases can sound a corridor that is not there, and both are worth
 * naming rather than discovering.** A *prebuilt* node never pairs — the pass
 * offers a partner only to a node it saw as a site first — so an authored
 * lattice (docs/mission-rim-deposits.md §4) whose nodes are lit by the depth
 * grant rather than by an interval reads as a line to this. And a node still
 * paired to a dead partner, with a third standing nearby, reads as a line to
 * the wrong pair. Both are the same root cause: `sigActive` means "the depth
 * grant is load-bearing **or** an interval is held" (docs/units.md), and the
 * client cannot tell those two apart.
 *
 * That is a bed voicing a fifth where a lattice stands, which is the cheap
 * direction for this to be wrong in — nothing here is an alarm, nothing here
 * fires a one-shot, and the panel's *sour* reading, which is the accessible
 * half, is server-resolved and unaffected.
 *
 * It leaks nothing either way. Own structures are the player's own, and the
 * enemy pool is Tier-4 tracks, which already carry position and hull; the
 * inference is arithmetic over facts the player was handed, which is what an
 * instrument is.
 *
 * Nodes must be one commander's. Pairing is per-commander, and a pool that
 * mixed two would sound a corridor nobody built.
 *
 * The pick is the **flattest** line, ties broken by the nearest: the same rule
 * `SelfAudioFrame.sourS` uses, and for the same reason — the question the
 * sound answers is "is a line failing", and a healthy line is not an answer to
 * it.
 */
export function corridorFrom(
  nodes: readonly TunedNode[],
  ear: { x: number; y: number }
): CorridorReading | null {
  let best: CorridorReading | null = null;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      if (Math.hypot(a.x - b.x, a.y - b.y) > STANDING_WAVE.PAIR_RANGE_M) continue;
      const dx = (a.x + b.x) / 2 - ear.x;
      const dy = (a.y + b.y) / 2 - ear.y;
      const rangeM = Math.hypot(dx, dy);
      const reading: CorridorReading = {
        // dx over range is cos(azimuth) — `contactVoice.panFor`'s "cos, not
        // sin", written without the round trip through atan2. Full authority,
        // because a corridor's ends are an own structure or a Tier-4 track and
        // both are exact.
        pan: rangeM > 0 ? Math.max(-1, Math.min(1, dx / rangeM)) : 0,
        rangeM,
        hpFraction: Math.min(a.hpFraction, b.hpFraction),
      };
      if (
        best === null ||
        reading.hpFraction < best.hpFraction ||
        (reading.hpFraction === best.hpFraction && reading.rangeM < best.rangeM)
      ) {
        best = reading;
      }
    }
  }
  return best;
}

export interface TunedInputs {
  /** Share of the water within `EAR_RADIUS_M` that is crystal, 0-1. */
  crystal: number;
  /** Metres the ground at the ear stands above the deepest crystal on the map. */
  riseM: number;
  /** The corridor the bed is voicing, or null when none is resolvable. */
  corridor: CorridorReading | null;
}

/** What the four voices are doing. Linear gains, and cents for the flat. */
export interface TunedMix {
  root: number;
  fifth: number;
  third: number;
  corridor: number;
  corridorPan: number;
  /** Cents the corridor's fifth is flat. Zero when the line is whole. */
  flatCents: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * How flat a corridor's fifth is, given the worst hull fraction holding it.
 *
 * Zero above the threshold, and the doc's floor *at* it rather than zero: a
 * flat that started from nothing would make the crossing inaudible, and the
 * crossing is the whole warning.
 */
export function flatCentsFor(hpFraction: number): number {
  const threshold = STANDING_WAVE.DETUNE_HP_FRACTION;
  if (hpFraction >= threshold) return 0;
  const fallen = clamp01((threshold - clamp01(hpFraction)) / threshold);
  return TUNED.DETUNE_FLOOR_CENTS + (TUNED.DETUNE_MAX_CENTS - TUNED.DETUNE_FLOOR_CENTS) * fallen;
}

/** Cents as a frequency ratio — the arithmetic the doc's numbers imply. */
export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

/** The three pitches of the bed, Hz. Exported so the doc's table is assertable. */
export const BED_HZ = {
  root: TUNED.ROOT_HZ,
  fifth: TUNED.ROOT_HZ * TUNED.FIFTH_RATIO,
  third: TUNED.ROOT_HZ * TUNED.THIRD_RATIO,
} as const;

/**
 * The whole rule, as one pure function.
 *
 * The bed scales with how much crystal is within earshot and nothing else: it
 * is the water, and the water does not know where the player is looking. The
 * corridor does not scale with crystal at all, because a standing corridor is
 * an *absolute* PF write (docs/mission-standing-wave.md §13, "a corridor
 * un-scatters its cells") — water that has been tuned by hand, which is
 * exactly as loud wherever it was laid.
 */
export function tunedMixFor(inputs: TunedInputs): TunedMix {
  const crystal = clamp01(inputs.crystal);
  const bed = TUNED.CEILING * crystal;
  const chord = clamp01(inputs.riseM / TUNED.CHORD_FULL_RISE_M);

  const corridor = inputs.corridor;
  let corridorLevel = 0;
  let corridorPan = 0;
  let flatCents = 0;
  if (corridor !== null) {
    const reach = clamp01(1 - corridor.rangeM / TUNED.CORRIDOR_RANGE_M);
    corridorLevel = TUNED.CORRIDOR_CEILING * reach;
    corridorPan = Math.max(-1, Math.min(1, corridor.pan));
    flatCents = flatCentsFor(corridor.hpFraction);
  }

  return {
    root: bed,
    fifth: bed * TUNED.FIFTH_LEVEL,
    third: bed * TUNED.THIRD_LEVEL * chord,
    corridor: corridorLevel,
    corridorPan,
    flatCents,
  };
}

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

/**
 * The Web Audio side. Four sine oscillators and one LFO, held open for the
 * match and moved only by `update`.
 *
 * Sines rather than anything filtered because §8's Knight row is "pure tone —
 * crystal, sustained, harmonic", and this is that material as the ground
 * rather than as a hull. It is also the cheapest thing the graph can hold: the
 * bed costs four oscillators for the whole match against §12's 1 ms tick, and
 * building it at unlock rather than on first crystal keeps that cost out of
 * the tick entirely.
 */
export class TunedBed {
  private readonly root: Voice;
  private readonly fifth: Voice;
  private readonly third: Voice;
  private readonly corridor: Voice;
  private readonly corridorPanner: StereoPannerNode;
  private readonly drift: OscillatorNode | null;
  private readonly driftDepth: GainNode | null;
  private stopped = false;

  constructor(context: AudioContext, destination: AudioNode) {
    const voice = (hz: number, out: AudioNode): Voice => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz;
      const gain = context.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(out);
      osc.start();
      return { osc, gain };
    };

    this.root = voice(BED_HZ.root, destination);
    this.fifth = voice(BED_HZ.fifth, destination);
    this.third = voice(BED_HZ.third, destination);

    // The corridor is the one voice with a bearing in it, so it is the one
    // voice with a panner. The bed itself never pans: §9 calls the Fields
    // "diffuse, unlocatable", and a bed that panned would be claiming a
    // direction the water is defined by not having.
    const panner = context.createStereoPanner();
    panner.connect(destination);
    this.corridorPanner = panner;
    this.corridor = voice(BED_HZ.fifth, panner);

    // §9's slow phase drift, on the fifth alone. Wrapped because a context
    // that refuses an extra oscillator should cost the shimmer and not the
    // bed.
    let drift: OscillatorNode | null = null;
    let depth: GainNode | null = null;
    try {
      drift = context.createOscillator();
      drift.type = 'sine';
      drift.frequency.value = TUNED.DRIFT_HZ;
      depth = context.createGain();
      depth.gain.value = TUNED.DRIFT_CENTS;
      drift.connect(depth).connect(this.fifth.osc.detune);
      drift.start();
    } catch {
      drift = null;
      depth = null;
    }
    this.drift = drift;
    this.driftDepth = depth;
  }

  update(mix: TunedMix, now: number): void {
    if (this.stopped) return;
    const bedRamp = TUNED.RAMP_S / 3;
    this.root.gain.gain.setTargetAtTime(mix.root, now, bedRamp);
    this.fifth.gain.gain.setTargetAtTime(mix.fifth, now, bedRamp);
    this.third.gain.gain.setTargetAtTime(mix.third, now, bedRamp);
    this.corridor.gain.gain.setTargetAtTime(mix.corridor, now, TUNED.CORRIDOR_RAMP_S / 3);
    this.corridorPanner.pan.setTargetAtTime(mix.corridorPan, now, 0.12);
    // Negative: the interval goes *flat*. Web Audio's detune is already in
    // cents, which is the unit the doc states the figure in, so nothing here
    // converts anything.
    this.corridor.osc.detune.setTargetAtTime(-mix.flatCents, now, TUNED.DETUNE_RAMP_S / 3);
  }

  stop(now: number): void {
    if (this.stopped) return;
    this.stopped = true;
    for (const v of [this.root, this.fifth, this.third, this.corridor]) {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setTargetAtTime(0, now, 0.4);
      try {
        v.osc.stop(now + 1.5);
      } catch {
        // Already stopped.
      }
    }
    try {
      this.drift?.stop(now + 1.5);
    } catch {
      // Already stopped.
    }
    this.driftDepth?.disconnect();
  }
}
