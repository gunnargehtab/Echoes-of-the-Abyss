/**
 * One contact, as a sound — docs/audio-direction.md §3.
 *
 *   source → biome filter → (delay tap) → panner → gain → contact bus
 *
 * The rule this file exists to protect is §3's "Panning is information":
 *
 *   "Stereo position is the player's ear reporting a bearing, and at Tier 1
 *    the server has not given them one."
 *
 * So a Tier-1 voice is mono, centred and level-locked, and it is the only
 * sound in the game with that treatment — which is what makes it instantly
 * identifiable as *something is out there and I do not know where*. Panning it
 * would not be a cosmetic liberty; it would be the mix inventing a bearing the
 * player never earned, which is the same class of error as a maphack.
 *
 * The same logic governs pitch: Tier 1 must not "change pitch with range",
 * because range is also something the server did not send at that tier.
 */

import {
  ResolutionTier,
  type Biome,
  type Faction,
  type FaunaSpecies,
  type OrdnanceKind,
} from '@echoes/shared';
import { voicingFor } from './biome.ts';
import { identityFor, timbreFor, type ContactTimbre, type Mechanism } from './timbre.ts';

/** Refresh snap, seconds. §3: "the return of a sound that was dying is itself a warning." */
const REFRESH_SNAP_S = 0.08;

/** §3: a fading contact's loop period lengthens by up to this much. */
const DECAY_PERIOD_STRETCH = 0.4;

/** Beyond this the level floor is reached; distances are in metres. */
const FALLOFF_REFERENCE_M = 900;

/**
 * The oscillator's level, by what the tier is allowed to say, and how far a
 * drive-signature pulse lifts it.
 *
 * Named because `strike` has to anchor to the level rather than read one back
 * — see the comment there for what reading it back cost.
 */
/**
 * The unclassified thump's partials — §11's speaker profile (#663).
 *
 * §3 gives Tier 1 and Tier 2 "a low pressure-thump, 40-90 Hz", and a bare sine
 * down there is a sound a phone speaker cannot make. It answers 55 Hz with
 * excursion instead of output, and the excursion returns as intermodulation
 * over the bands that do carry information. Measured, seven tracked Tier-1
 * contacts put 98% of their energy below 60 Hz (tools/audio-meter) — seven
 * voices' worth of the primary information channel arriving at the reporting
 * device as a hum and nothing else.
 *
 * §11 names the fix in as many words: the speaker profile "preserves the
 * 40-160 Hz contact band by adding harmonics rather than relying on
 * fundamentals no laptop can reproduce". So the fundamental stays exactly
 * where §3 put it and the series carries it — 55 Hz is still *sent*, and a
 * system that can reproduce it still gets the weight; a phone gets 110 and 165
 * and the ear supplies the rest.
 *
 * **The same series for every unclassified contact**, which is the point: §3
 * forbids these tiers from carrying class information in their timbre, and a
 * fixed harmonic series says no more about what a contact is than a sine did.
 */
export const THUMP_PARTIALS = [0.35, 0.5, 0.25] as const;

/** Built per context and cached; a wave is immutable and every voice wants it. */
const THUMP_WAVE_BY_CONTEXT = new WeakMap<AudioContext, PeriodicWave>();

function thumpWave(context: AudioContext): PeriodicWave | null {
  const cached = THUMP_WAVE_BY_CONTEXT.get(context);
  if (cached !== undefined) return cached;
  try {
    const real = new Float32Array(THUMP_PARTIALS.length + 1);
    const imag = new Float32Array(THUMP_PARTIALS.length + 1);
    for (let n = 0; n < THUMP_PARTIALS.length; n++) imag[n + 1] = THUMP_PARTIALS[n]!;
    const wave = context.createPeriodicWave(real, imag, { disableNormalization: true });
    THUMP_WAVE_BY_CONTEXT.set(context, wave);
    return wave;
  } catch {
    // No createPeriodicWave: the voice keeps its sine, which is the old
    // behaviour rather than silence.
    return null;
  }
}

const DRIVE_LEVEL = {
  /** Tier 3+: the faction's drive signature (§8). */
  CLASSIFIED: 0.5,
  /** Tier 1-2: a low pressure-thump that identifies nothing (§3). */
  THUMP: 0.35,
  /** How far a pulse lifts the voice above its own level. */
  BUMP: 1.6,
} as const;

/**
 * How far past the caller's own clock a mechanism's events are placed, seconds.
 *
 * `update` is called once per Echo tick — 5 Hz, 0.2 s — because that is when a
 * contact's *state* arrives (§12: "contacts arrive on the tick; anything
 * smoother implies knowledge the server did not send"). Emitting an event only
 * at the instant the caller happens to ask quantises every mechanism onto that
 * grid, and §8.1's fastest family does not survive it. The Directorate's 9 Hz
 * has a period of 0.092-0.131 s, every value of it shorter than one tick, so
 * every click landed on the next tick and the swarm rendered as one click per
 * snapshot. On a caller ticking at an exact 5 Hz that is a perfect 0.2000 s
 * metronome — the beat §8 reserves to the Consortium, at the same interval as
 * the ordnance screw at the short end of its own wander, which §8.1 forbids by
 * name and in that direction. A live client's snapshots arrive on the network
 * rather than on a timer, so there it was one click per snapshot at whatever
 * interval the snapshots came in at — not a metronome, and not a mechanism
 * either: a rate the wire chose rather than one §8 did.
 *
 * So a family's events are placed on the audio clock ahead of the caller
 * instead, which is what #731 asks for in as many words — "clicks inside a
 * tick would need their own scheduling, not the tick's amplitude bump". What
 * that buys past the clicks is that **what a mechanism sounds like stops
 * depending on how often it is asked**: given the same contact state, the same
 * events at the same instants whether the caller runs at 5 Hz or at 60, which
 * is what makes §8.1's separation a property of the mix rather than of its
 * driver. "Given the same state" is not a hedge — §3's decay stretches the
 * period, and freshness is delivered by the tick, so a caller that sampled it
 * more often would be reading a curve nobody sent.
 *
 * None of it abandons §12's tick alignment. What arrives on the tick is what
 * the server sent — tier, bearing, range, freshness — and an event train adds
 * nothing to it: its rate and its strength are the family's own row and the
 * clock. The one term of the train that *is* server state is §3's decay
 * stretch, which comes off `inputs.freshness` and therefore changes on the
 * tick and nowhere else, so the train still tells the player nothing the tick
 * had not already told them. §12's own preamble asks for "sample-accurate
 * scheduling" on this bus, which is the thing being used here.
 *
 * Longer than one tick so the train never runs dry between updates, and no
 * longer than it has to be, because everything inside the horizon is committed
 * — a contact that drops below Tier 3 must not go on sounding its family, so
 * see the cancellation in `update`.
 */
const EVENT_HORIZON_S = 0.3;

/**
 * How many layers a swarm's one event is made of — §8's "layered voices".
 *
 * The Directorate is "many small things agreeing ... clicks that phase into
 * unison as cohorts converge — you hear them *organise*", so a swarm event is
 * not one click but a cluster of three, and what converges is *when they land*.
 * The family's own rate is still the rate of the cluster, which is what keeps
 * `rateHz` meaning what its docblock says and keeps §8.1's period band a
 * description of what the mix renders.
 */
export const SWARM_LAYERS = 3;

/**
 * How often a swarm's layers come back into step, Hz.
 *
 * Slow on purpose. §8 asks the player to *hear* them organise, which is a
 * thing that happens over seconds — a cluster that tightened and scattered
 * inside one period would be a timbre, not an event anyone could follow. At
 * 0.19 Hz the cycle is 5.3 seconds — spread, closing, together, opening again
 * — which is about the rate a held note is heard to phase against another.
 */
const SWARM_ORGANISE_HZ = 0.19;

/**
 * How hard one layer of a fully scattered cluster lands, 0-1.
 *
 * Three sources arriving together are louder than three spread out, and an
 * `AudioParam` timeline cannot say so on its own: two `setValueAtTime` writes
 * at the same instant do not sum, the later one simply wins. So the summing
 * the graph cannot do is modelled here — a cluster's clicks are quieter while
 * it is spread and reach the full drive-signature bump when it closes — and
 * the level is a consequence of the spread rather than a second oscillator
 * with its own opinion. Not zero, because a layer out of step is still a layer
 * that clicked: §8's swarm thins, it does not go silent.
 */
const SWARM_SCATTER_FLOOR = 0.45;

/**
 * A reciprocating cycle, in strikes, and how hard the second of them lands.
 *
 * §8 gives the Consortium "machinery under load; steel, reciprocating", and a
 * reciprocating machine has a stroke and a return — two events in one cycle,
 * the second of them the mass coming back with no load behind it. Until now
 * the mix built one strike and called the repetition the mechanism, which is
 * the same event shape the breathing, swell and screw families have at a
 * different rate: the EQ-curve distinction §8 opens by ruling out. (Not the
 * swarm, whose cluster #742 had already built, and not the drone, which never
 * strikes at all.)
 *
 * **The two strikes are exactly evenly spaced, and that is a choice with
 * reasons rather than the only placement §8.1 admits.** Two uneven ones
 * survive a full check against every other family's band, and both were
 * worked: a 0.3675/0.4658 s lope, and a 0.1567-0.1615 s knock followed by the
 * 0.672-0.677 s balance of the cycle, threaded through the gap between the
 * swarm and the screw. Even spacing was taken over both, for reasons that are
 * not that the others are forbidden:
 *
 * - §8 makes this "the only faction with a *beat*", and this repository
 *   already reads that as an unwavering interval between strikes:
 *   `contactTimbre.test.ts` holds the Consortium's period spread under 1e-6,
 *   and did so before this mechanism existed. An uneven split fails that test,
 *   so taking one means re-deciding what §8's beat is measured over. That is a
 *   design call and not an unattended run's to make.
 * - The knock window is three per cent wide. It exists only because the
 *   screw's shortest interval is 1.48x the swarm's longest, against the 1.44
 *   two consecutive 1.2x clearances need — and both of those are TUNABLE
 *   jitters, so a later tuning of either closes it silently.
 * - The lope is 1.27:1, which is a limp rather than machinery under load.
 *
 * What even spacing buys is that no instant in this train moves at all. The
 * cycle is carried by *what the strikes are*, so §8.1's separation over
 * rendered intervals is untouched by construction rather than re-argued.
 *
 * What tells the two strikes apart is the shape first and the level a distant
 * second, and the arithmetic is worth stating because it is slighter than it
 * looks. The return's decay is an eighth of the stroke's — 22 ms against
 * 180 ms — and its hold a fifth. Its *peak* is 1.80 dB under the stroke's, and
 * what it actually steps is less again, because it does not fire into silence:
 * measured off the rendered timeline at the engine's own 5 Hz, the level
 * before the return is 0.5571 and the return steps **1.34 dB** over it, where
 * the stroke steps 4.01 dB. So the shape is doing almost all of the work.
 *
 * Those two figures are the caller's as well as the family's — `update` writes
 * a level ramp on this same param every tick, and an `AudioParam` event
 * supersedes the strike's own decay from the instant it starts, so the level
 * *between* strikes is aligned to whoever is asking (1.30 dB and 3.79 dB at
 * 60 Hz). The strikes themselves are not: their instants and their peaks are
 * the family's alone, which is what §8.1 is separated on. An earlier draft of
 * this paragraph read the decay in isolation and said 0.533 and 1.72 dB; that
 * is the strike's envelope alone and not what the graph renders.
 *
 * **Whether any of it reads as a knock on a phone speaker is not settled
 * here**: #731's acceptance criterion is a listening test on the reporting
 * device, and nothing in this file stands in for it.
 *
 * `RETURN_LIFT` is **the one number here with no doc-side argument** — a half,
 * because a return is the unloaded half of the cycle, and §8 does not say by
 * how much. It stays clear of the unclassified thump's own peak, because a
 * Tier-3 family that dipped under it on alternate strikes would be handing the
 * tier back every other event.
 */
export const RECIPROCATING = { STROKES: 2, RETURN_LIFT: 0.5 } as const;

/**
 * The two shapes an event is heard as, in seconds: a breath and a tick.
 *
 * Every mechanism used to ease back over 0.18 s. On a family whose events are
 * 0.111 s apart that is a tail longer than the gap — each bump was still 81%
 * of the way up when the next arrived, so the swarm was never a train of
 * clicks at all, but a continuous 140 Hz tone with a tremolo on it. §8 asks
 * the Directorate for "chitin ticks", and a tick is a transient: at the
 * densest the cluster gets, a third of the family's period, a tick is down to
 * 19% of itself when the next click lands and the breath is still at 81%.
 * That ratio is the whole difference between a click train and a texture, and
 * it is what `contactTimbre.test.ts` holds rather than the constant.
 *
 * The breath is the other three striking families', plus the Consortium's own
 * stroke, and is unchanged. §8's drive signature there is "the same thing
 * breathing", and a breath that was over in 22 ms would be a tick by another
 * name.
 *
 * The one family that uses both is the Consortium, and it uses them to say
 * which half of its cycle a strike is: the loaded stroke rings and the return
 * knocks (`RECIPROCATING`). That is not a third shape, and it is the reason
 * the pair is exported as a table rather than as one shape per mechanism.
 */
export const ENVELOPE = {
  BREATH: { holdS: 0.02, decayS: 0.18 },
  TICK: { holdS: 0.004, decayS: 0.022 },
} as const;

/**
 * The period between one event of a mechanism and the next, at an instant.
 *
 * A function of the event's *own* time rather than of the caller's, which is
 * what lets `scheduleEvents` walk a train forward past the horizon without the
 * shape of it depending on who asked or when.
 */
function periodAt(timbre: ContactTimbre | null, at: number): number | null {
  // `timbre` is null exactly when `update` found no family to sound — below
  // Tier 3, or at Tier 3 with no identity — and both want the wandering thump
  // rather than any mechanism's period. §3: "irregular period 1.2-2.5 s",
  // deterministic in shape but not periodic.
  if (timbre === null) return 1.85 + Math.sin(at * 1.3) * 0.65;
  if (timbre.rateHz <= 0) return null;
  return (1 / timbre.rateHz) * (1 + (Math.sin(at * 3.7) * timbre.jitter) / 2);
}

/**
 * How far apart a swarm cluster's layers land at one instant, seconds.
 *
 * Zero when they are in unison and a third of the family's period when they
 * are fully scattered, which is exactly even spacing — so a scattered cluster
 * is a steady train at three times the family rate, and a closed one is a
 * single harder click at the family rate. That is the whole of "you hear them
 * organise", and it is in *when the clicks land* rather than in a level.
 *
 * A pure function of absolute time, like `periodAt`, so nothing about the
 * cluster depends on when the caller happened to ask.
 */
function swarmSpread(period: number, at: number): number {
  const closed = (1 + Math.cos(2 * Math.PI * SWARM_ORGANISE_HZ * at)) / 2;
  return ((1 - closed) * period) / SWARM_LAYERS;
}

/**
 * Authority a tier has over stereo position, 0-1.
 *
 * The numbers, not the prose, are what stop the mix from lying. Tier 1 is 0
 * because the server sent no position at all; Tier 2 is deliberately short of
 * full because its position is already blurred by
 * `BEARING_BLUR_FRACTION` server-side, and a hard pan onto a blurred bearing
 * would present a guess as a fix.
 */
const PAN_AUTHORITY: Record<ResolutionTier, number> = {
  [ResolutionTier.Silent]: 0,
  [ResolutionTier.Contact]: 0,
  [ResolutionTier.Bearing]: 0.55,
  [ResolutionTier.Classification]: 1,
  [ResolutionTier.Track]: 1,
};

/**
 * Stereo position for a tier and an azimuth.
 *
 * Pure and exported because this is the single rule the whole section exists
 * to protect (§3, "Panning is information"), and a rule that matters that much
 * should be assertable without an AudioContext.
 *
 * cos, not sin: the azimuth is measured from world +x, and stereo is the
 * *horizontal* axis of the rendered scene. sin would pan a contact due east to
 * dead centre — the mix reporting a bearing the player can see is wrong.
 */
export function panFor(tier: ResolutionTier, bearing: number | undefined): number {
  const authority = PAN_AUTHORITY[tier] ?? 0;
  if (authority === 0 || bearing === undefined) return 0;
  return Math.max(-1, Math.min(1, Math.cos(bearing))) * authority;
}

export interface VoiceInputs {
  tier: ResolutionTier;
  /**
   * Azimuth from the listener in radians, atan2(dy, dx), or undefined when
   * unearned. Undefined is not "unknown, assume zero" — it is the server
   * having sent no position, and the voice treats it as such.
   */
  bearing?: number;
  /** Range in metres, or undefined when unearned. */
  rangeM?: number;
  /**
   * What the server said this contact *is*, at Tier 3+ only — exactly one of
   * the three, and none of them below that tier.
   *
   * Three fields rather than one identity because this is the wire's own
   * shape, and `identityFor` is the single place it is turned into one
   * (timbre.ts). Reshaping it here would put the mapping in two places.
   */
  faction?: Faction;
  fauna?: FaunaSpecies;
  ordnance?: OrdnanceKind;
  biome: Biome;
  /** 0-1, where 1 is a fresh detection and 0 a fully decayed ghost. */
  freshness: number;
}

/**
 * A live contact voice.
 *
 * Built once per contact and updated in place. Rebuilding it on every tier
 * change would re-trigger the sound, and a contact that got *clearer* must not
 * announce itself as though it were newly heard.
 */
export class ContactVoice {
  private readonly context: AudioContext;
  private readonly out: GainNode;
  private readonly panner: StereoPannerNode;
  private readonly filter: BiquadFilterNode;
  private readonly delay: DelayNode;
  private readonly delayFeedback: GainNode;
  private readonly delayMix: GainNode;

  private readonly osc: OscillatorNode;
  private readonly oscGain: GainNode;
  private readonly noise: AudioBufferSourceNode | null;
  private readonly noiseGain: GainNode;

  private tier: ResolutionTier = ResolutionTier.Silent;
  /** The level the oscillator is being held at, which a pulse bumps around. */
  private oscBase: number = DRIVE_LEVEL.THUMP;
  private lockToneFired = false;
  /** Absolute time of the next event this voice owes its mechanism. */
  private nextEventAt = 0;
  /**
   * The family the events already on the clock belong to, or null for the
   * thump.
   *
   * Events are committed up to `EVENT_HORIZON_S` ahead, so which family they
   * belong to has to be remembered rather than re-derived: a contact demoted
   * below Tier 3, or reclassified as something else, must not go on sounding
   * the family it had. §3 forbids Tier 2 from carrying class information in
   * its timbre, and a scheduling horizon is not an exemption from it.
   */
  private voicedMechanism: Mechanism | null = null;
  /**
   * Which strike of a reciprocating cycle the next event is — 0 is the loaded
   * stroke (`RECIPROCATING`).
   *
   * Counted along the train rather than read off the clock, unlike
   * `swarmSpread`. Both are driver-independent, which is the property that
   * matters: the train is a function of its own start and of nothing the
   * caller did, so a 5 Hz and a 60 Hz caller walk the same strikes in the same
   * order and get the same phase. What the counter buys over absolute time is
   * that two Consortium contacts are *not* on the same crank — a function of
   * absolute time alone would put every machine in the water in step, which is
   * the open question #742 left on the swarm and not a thing to spread.
   */
  private strokePhase = 0;
  private stopped = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;

    this.out = context.createGain();
    this.out.gain.value = 0;
    this.panner = context.createStereoPanner();
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';

    this.delay = context.createDelay(1);
    this.delayFeedback = context.createGain();
    this.delayFeedback.gain.value = 0;
    this.delayMix = context.createGain();
    this.delayMix.gain.value = 0;

    this.osc = context.createOscillator();
    this.oscGain = context.createGain();
    this.oscGain.gain.value = 0;
    this.noiseGain = context.createGain();
    this.noiseGain.gain.value = 0;
    this.noise = createNoise(context);

    // source → filter → panner → out → bus, with a parallel delay tap.
    this.osc.connect(this.oscGain).connect(this.filter);
    this.noise?.connect(this.noiseGain).connect(this.filter);
    this.filter.connect(this.panner);
    this.filter.connect(this.delay);
    this.delay.connect(this.delayFeedback).connect(this.delay);
    this.delay.connect(this.delayMix).connect(this.panner);
    this.panner.connect(this.out).connect(destination);

    this.osc.start();
    this.noise?.start();
  }

  /** Apply the current state of a contact. Cheap enough to call every tick. */
  update(inputs: VoiceInputs, now: number): void {
    if (this.stopped) return;

    const voicing = voicingFor(inputs.biome);
    const isContactTier = inputs.tier === ResolutionTier.Contact;
    // The family this contact is heard as, or null when it has none to be
    // heard as. Identity and classification are the same event (§8.1), so both
    // halves gate it: below Tier 3 the mix must not carry a family at all, and
    // at Tier 3 a contact the server named as none of the six has no family to
    // carry. Either way the voice keeps the unidentifying thump of the tiers
    // below — a mix with no identity has nothing to say about identity, and
    // saying something anyway was the bug.
    const timbre =
      inputs.tier >= ResolutionTier.Classification ? timbreFor(identityFor(inputs)) : null;

    // A family's events are already on the clock up to `EVENT_HORIZON_S` out,
    // so a change of family has to take back the ones that have not happened
    // yet — otherwise a contact demoted to Tier 2 goes on clicking like a
    // Directorate hull after the server stopped saying it was one, which is
    // the leak §3 closes at the tier and not at the horizon. The window is the
    // horizon less one tick, since the update that demotes it arrives a tick
    // after the one that committed them: 0.1 s at 5 Hz, and every click the
    // swarm can fit in it. Taken before the writes below rather than after, so
    // it cancels the old schedule and never this tick's own.
    const mechanism = timbre?.mechanism ?? null;
    if (mechanism !== this.voicedMechanism) {
      this.oscGain.gain.cancelScheduledValues(now);
      this.voicedMechanism = mechanism;
      this.nextEventAt = now;
      // The cycle restarts with the train it is counted along, so a contact
      // that becomes a Consortium hull opens on the loaded stroke rather than
      // wherever the last family left the counter.
      this.strokePhase = 0;
    }

    // --- Spatialisation: the rule at the top of this file -------------------
    this.panner.pan.setTargetAtTime(panFor(inputs.tier, inputs.bearing), now, 0.12);

    // --- Level -------------------------------------------------------------
    // Tier 1 is level-locked: distance attenuation would leak range.
    const distanceLevel =
      isContactTier || inputs.rangeM === undefined
        ? 0.55
        : 0.25 + 0.6 / (1 + inputs.rangeM / FALLOFF_REFERENCE_M);

    const target = distanceLevel * voicing.gain * inputs.freshness;
    // A refreshed contact snaps back; a decaying one eases down. §3 makes the
    // snap a warning in its own right, so it must be audibly abrupt.
    const ramp = inputs.freshness > 0.99 ? REFRESH_SNAP_S : 0.25;
    this.out.gain.setTargetAtTime(target, now, ramp);

    // --- Timbre ------------------------------------------------------------
    const veil = inputs.tier >= ResolutionTier.Classification ? 1 : 0.45;
    this.filter.frequency.setTargetAtTime(voicing.cutoffHz * veil, now, 0.2);
    this.filter.Q.setTargetAtTime(voicing.q, now, 0.2);

    this.delay.delayTime.setTargetAtTime(voicing.delayS, now, 0.3);
    this.delayFeedback.gain.setTargetAtTime(voicing.delayFeedback, now, 0.3);
    this.delayMix.gain.setTargetAtTime(voicing.delayS > 0 ? 0.35 : 0, now, 0.3);

    if (timbre !== null) {
      // Tier 3+ carries the timbre family of whatever the contact is (§8,
      // §8.1). Below that it must not: §3 forbids Tier 2 from "carrying class
      // information in its timbre".
      this.osc.type = timbre.wave;
      this.osc.frequency.setTargetAtTime(timbre.baseHz, now, 0.25);
      this.oscBase = DRIVE_LEVEL.CLASSIFIED;
      this.oscGain.gain.setTargetAtTime(this.oscBase, now, 0.25);
      this.noiseGain.gain.setTargetAtTime(voicing.noiseFloor * 0.4, now, 0.3);
    } else {
      // Tier 1-2: a low pressure-thump, 40-90 Hz, and nothing that identifies.
      // Voiced through its harmonic series rather than as a bare fundamental,
      // so the band survives a speaker that cannot reproduce 55 Hz — see
      // THUMP_PARTIALS. Assigning `type` is what puts a classified voice back
      // on a basic waveform, so the two branches are each other's undo.
      const wave = thumpWave(this.context);
      if (wave === null) this.osc.type = 'sine';
      else this.osc.setPeriodicWave(wave);
      this.osc.frequency.setTargetAtTime(isContactTier ? 55 : 72, now, 0.25);
      this.oscBase = DRIVE_LEVEL.THUMP;
      this.oscGain.gain.setTargetAtTime(this.oscBase, now, 0.25);
      // Tier 2's "filtered wash"; Tier 1 stays a bare thump.
      const wash = inputs.tier === ResolutionTier.Bearing ? 0.18 : 0;
      this.noiseGain.gain.setTargetAtTime(wash + voicing.noiseFloor * 0.3, now, 0.3);
    }

    // --- Lock tone ---------------------------------------------------------
    // §3: one short tone on acquisition, and it "must never sustain". Fired
    // once per voice, so a contact that flickers at the Tier-4 boundary does
    // not machine-gun the player.
    if (inputs.tier >= ResolutionTier.Track && !this.lockToneFired) {
      this.lockToneFired = true;
      this.fireLockTone(now);
    }

    this.tier = inputs.tier;
    this.scheduleEvents(inputs, timbre, now);
  }

  /**
   * Place every event this voice owes between the caller's clock and the
   * horizon.
   *
   * The loop walks the *event train* rather than the caller's ticks, which is
   * the whole of `EVENT_HORIZON_S`'s argument: an event's time is a function
   * of the event before it and of nothing whatever the caller did. A decaying
   * contact's period lengthens as it goes, so a fading return audibly *slows*
   * rather than merely thinning (§3).
   */
  private scheduleEvents(inputs: VoiceInputs, timbre: ContactTimbre | null, now: number): void {
    // A voice that has never scheduled, or one whose clock jumped forward —
    // §12 suspends the context on tab blur and holds state, so `now` can
    // return minutes later — starts its train where the caller is rather than
    // replaying the whole gap into the graph in one go.
    if (this.nextEventAt < now) this.nextEventAt = now;

    const stretch = 1 + (1 - inputs.freshness) * DECAY_PERIOD_STRETCH;
    const horizon = now + EVENT_HORIZON_S;

    while (this.nextEventAt < horizon) {
      const at = this.nextEventAt;
      const period = periodAt(timbre, at);
      if (period === null) {
        // An eventless mechanism has no pulse at all, so emit nothing and
        // carry the train forward — the bump is a *re-trigger*, and "keep it
        // sounding without re-triggering" is what this branch always meant to
        // say. Emitting one here gave the Knights' drone, and every
        // no-faction contact with it, a 1.5000 s period with zero variation,
        // which is the beat §8 reserves to the Consortium. The oscillator is
        // already running at its own level; an eventless voice stays audible
        // with no amplitude event at all.
        this.nextEventAt = at + 1.5 * stretch;
        continue;
      }
      this.emit(timbre, at, period);
      this.nextEventAt = at + period * stretch;
    }
  }

  /**
   * One event of a mechanism.
   *
   * Three of the six families have one body and it hits once. The swarm is
   * "many small things", so its event is a cluster of `SWARM_LAYERS` clicks
   * whose spacing breathes: fully spread they are evenly spaced and the train
   * runs at three times the family rate, and closed they land together as one
   * harder click at the family rate. Which is §8's "clicks that phase into
   * unison as cohorts converge", carried in *when they land* — a level alone
   * would be a tremolo, and a tremolo on a continuous tone is what #731
   * reports hearing.
   *
   * The Consortium is the other compound family, and it is compound in the
   * other direction: its strikes land where they always did and alternate
   * between the loaded stroke and the return (`RECIPROCATING`). Nothing about
   * *when* changes — even spacing is the choice `RECIPROCATING` argues, not
   * the only one §8.1 admits — so the cycle is in what each strike is.
   */
  private emit(timbre: ContactTimbre | null, at: number, period: number): void {
    if (timbre !== null && timbre.mechanism === 'reciprocating') {
      const stroke = this.strokePhase;
      this.strokePhase = (stroke + 1) % RECIPROCATING.STROKES;
      // The stroke rings at the full drive-signature bump; the return lifts a
      // share of it and is over in a knock. Both stay above the unclassified
      // thump's own peak, which is what keeps every strike a Tier-3 event.
      const lift = stroke === 0 ? 1 : RECIPROCATING.RETURN_LIFT;
      const shape = stroke === 0 ? ENVELOPE.BREATH : ENVELOPE.TICK;
      this.strike(at, this.oscBase * (1 + (DRIVE_LEVEL.BUMP - 1) * lift), shape);
      return;
    }
    if (timbre !== null && timbre.mechanism === 'swarm') {
      const spread = swarmSpread(period, at);
      // 0 while the cluster is fully scattered, 1 as it closes — the same
      // number the spacing is made of, so the level cannot drift out of step
      // with what the player is actually hearing converge.
      const closed = 1 - (spread * SWARM_LAYERS) / period;
      const strength = SWARM_SCATTER_FLOOR + (1 - SWARM_SCATTER_FLOOR) * closed;
      const peak = this.oscBase * (1 + (DRIVE_LEVEL.BUMP - 1) * strength);
      for (let layer = 0; layer < SWARM_LAYERS; layer++) {
        this.strike(at + layer * spread, peak, ENVELOPE.TICK);
      }
      return;
    }
    this.strike(at, this.oscBase * DRIVE_LEVEL.BUMP, ENVELOPE.BREATH);
  }

  /**
   * A short amplitude event on the oscillator rather than a new source: it
   * reads as the same thing breathing, which is what a drive signature is, and
   * it keeps §12's budget a question of what a tick *builds* — a mechanism
   * with twenty-seven clicks a second could not afford a node each.
   *
   * Both ends of it are anchored to the voice's *own* level, never to whatever
   * the parameter happens to read. Reading it back was two bugs at once,
   * because a `cancelScheduledValues` in the same breath cancels the ramp
   * `update` scheduled at that instant, so the read never saw the level the
   * voice was being set to — only the level it was leaving. A contact already
   * at Tier 3+ on its first frame therefore read 0, bumped to 0, settled at 0,
   * and its drive signature never sounded at all; and a contact promoted while
   * sounding read its previous bump's tail and settled back onto that, so
   * every pulse started higher than the last: a ratchet with no ceiling,
   * measured at 260x the voice's own level after eight seconds of being
   * tracked, and worst on the swarm, whose events are the closest together.
   */
  private strike(at: number, peak: number, shape: (typeof ENVELOPE)[keyof typeof ENVELOPE]): void {
    this.oscGain.gain.setValueAtTime(peak, at);
    this.oscGain.gain.setTargetAtTime(this.oscBase, at + shape.holdS, shape.decayS);
  }

  private fireLockTone(now: number): void {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain).connect(this.panner);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  get currentTier(): ResolutionTier {
    return this.tier;
  }

  /** Fade out and release the nodes. */
  stop(now: number): void {
    if (this.stopped) return;
    this.stopped = true;
    // The mechanism's committed events go with it. A voice is scheduled up to
    // `EVENT_HORIZON_S` ahead, so a contact that stops — expired, or stolen
    // for a higher tier (§12's stealing policy) — otherwise leaves a horizon
    // of its family's clicks standing on the graph, audible *under* the fade
    // below rather than silenced by it. Measured at three swarm clicks, the
    // last 96 ms past the stop, before this line existed.
    this.oscGain.gain.cancelScheduledValues(now);
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, 0.12);
    const end = now + 0.6;
    try {
      this.osc.stop(end);
      this.noise?.stop(end);
    } catch {
      // Already stopped; nothing to do.
    }
  }
}

/**
 * One second of noise per context, shared by every voice.
 *
 * Shared because filling it is the single most expensive thing this file does:
 * 44,100 samples, plus 176 KB held for as long as the voice lives — 4.2 MB
 * across a full 24-voice bus. An AudioBuffer may feed any number of source
 * nodes, so the cost is paid once and the voices are free.
 *
 * Worth being precise about what this did *not* fix: the first tick after
 * unlock costs a few milliseconds whether or not any voice exists, so the
 * sharing is a memory and allocation win rather than the cure for that spike.
 *
 * A WeakMap rather than a module-level singleton: a buffer belongs to the
 * context that made it, and holding one after the context closes would pin a
 * dead device handle for the life of the page.
 *
 * The engine primes it at unlock, so even the first voice of a match does not
 * pay for it on a tick.
 */
const NOISE_BY_CONTEXT = new WeakMap<AudioContext, AudioBuffer>();

/**
 * A looping noise source.
 *
 * One second, looped: long enough that the loop point is inaudible under the
 * filtering everything here applies. Uses Math.random deliberately — this is
 * presentation, and the simulation's determinism rules stop at the audio
 * boundary (§12).
 */
export function ensureNoiseBuffer(context: AudioContext): AudioBuffer | null {
  const cached = NOISE_BY_CONTEXT.get(context);
  if (cached !== undefined) return cached;
  try {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    NOISE_BY_CONTEXT.set(context, buffer);
    return buffer;
  } catch {
    return null;
  }
}

function createNoise(context: AudioContext): AudioBufferSourceNode | null {
  const buffer = ensureNoiseBuffer(context);
  if (buffer === null) return null;
  try {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  } catch {
    return null;
  }
}
