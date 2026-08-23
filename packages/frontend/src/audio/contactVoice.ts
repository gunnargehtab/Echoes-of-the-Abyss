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

import { ResolutionTier, type Biome, type Faction } from '@echoes/shared';
import { voicingFor } from './biome.ts';
import { timbreFor } from './timbre.ts';

/** Refresh snap, seconds. §3: "the return of a sound that was dying is itself a warning." */
const REFRESH_SNAP_S = 0.08;

/** §3: a fading contact's loop period lengthens by up to this much. */
const DECAY_PERIOD_STRETCH = 0.4;

/** Beyond this the level floor is reached; distances are in metres. */
const FALLOFF_REFERENCE_M = 900;

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
  faction?: Faction;
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
  private lockToneFired = false;
  private nextPulseAt = 0;
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
    const timbre = timbreFor(inputs.faction);
    const isContactTier = inputs.tier === ResolutionTier.Contact;

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

    if (inputs.tier >= ResolutionTier.Classification) {
      // Tier 3+ carries the faction's drive signature (§8). Below that it must
      // not: §3 forbids Tier 2 from "carrying class information in its timbre".
      this.osc.type = timbre.wave;
      this.osc.frequency.setTargetAtTime(timbre.baseHz, now, 0.25);
      this.oscGain.gain.setTargetAtTime(0.5, now, 0.25);
      this.noiseGain.gain.setTargetAtTime(voicing.noiseFloor * 0.4, now, 0.3);
    } else {
      // Tier 1-2: a low pressure-thump, 40-90 Hz, and nothing that identifies.
      this.osc.type = 'sine';
      this.osc.frequency.setTargetAtTime(isContactTier ? 55 : 72, now, 0.25);
      this.oscGain.gain.setTargetAtTime(0.35, now, 0.25);
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
    this.scheduleThump(inputs, timbre, now);
  }

  /**
   * The pulse that gives a contact its period.
   *
   * Tier 1's is irregular by design (§3: "irregular period 1.2-2.5 s"), and a
   * decaying contact's lengthens, so a fading return audibly *slows* rather
   * than merely thinning.
   */
  private scheduleThump(
    inputs: VoiceInputs,
    timbre: ReturnType<typeof timbreFor>,
    now: number
  ): void {
    if (now < this.nextPulseAt) return;

    const stretch = 1 + (1 - inputs.freshness) * DECAY_PERIOD_STRETCH;
    let period: number;
    if (inputs.tier >= ResolutionTier.Classification && timbre.rateHz > 0) {
      const wander = 1 + (Math.sin(now * 3.7) * timbre.jitter) / 2;
      period = (1 / timbre.rateHz) * wander;
    } else if (inputs.tier >= ResolutionTier.Classification) {
      // A drone has no events; keep it sounding without re-triggering.
      period = 1.5;
    } else {
      // 1.2-2.5 s, wandering. Deterministic in shape but not periodic.
      period = 1.85 + Math.sin(now * 1.3) * 0.65;
    }
    this.nextPulseAt = now + period * stretch;

    // A short amplitude bump on the oscillator rather than a new source: it
    // reads as the same thing breathing, which is what a drive signature is.
    const peak = this.oscGain.gain.value;
    this.oscGain.gain.cancelScheduledValues(now);
    this.oscGain.gain.setValueAtTime(peak * 1.6, now);
    this.oscGain.gain.setTargetAtTime(peak, now + 0.02, 0.18);
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
