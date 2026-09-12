/**
 * The self bus, as sound — docs/audio-direction.md §4 and §5.
 *
 * Two things live here because they share a bus and a reason: everything the
 * player's own force does to the mix. A continuous bed that tracks SIG, and
 * the discrete events — transmit, return, exposure, broken silence — that the
 * server reports rather than the client infers.
 *
 * The events are one-shots built on demand and left to expire. That is the
 * right shape for them: §5 says the lock-alike cues "must feel like slamming a
 * door", and a door is not a loop. The bed is the opposite — one graph, built
 * once, whose parameters move.
 */

import { ensureNoiseBuffer } from './contactVoice.ts';
import {
  BREAK_SILENCE_S,
  SILENT_MIX,
  SOUR_BITE_S,
  SOUR_MIX,
  type SelfMix,
  type SourMix,
} from './selfNoise.ts';

/** SPEC — §5. The outgoing sweep is 1.5 s and the returns arrive over 3 s. */
export const PING_TRANSMIT_S = 1.5;
export const PING_RETURN_WINDOW_S = 3;

/** SPEC — §5. "A hard, close, panned strike, followed by a two-second tail." */
export const EXPOSURE_TAIL_S = 2;

/**
 * The bed's low tone: its resting level, and what a machinery pulse peaks at.
 *
 * Named because the pulse has to multiply the *resting* level. It used to
 * multiply whatever the parameter happened to read, which is the resting level
 * only if the previous pulse has fully decayed — so each pulse compounded on
 * the tail of the last and the bed crept upward the longer a player stayed in
 * a machinery band. It converges rather than runs away, but the level it
 * converges to is not the one §4's table describes, and it is loudest exactly
 * where the bed is already loudest.
 */
const TONE = { REST: 0.4, PULSE: 1.7 } as const;

/** SPEC — §4's "low harmonic". The plant's fundamental, Hz. */
export const TONE_HZ = 44;

/**
 * The plant tone's partials — §11's speaker profile, applied to the bed.
 *
 * The bed used to be a bare 44 Hz sine, and #663 is what that sounds like on a
 * phone. 44 Hz is below anything a phone speaker radiates: the driver answers
 * it with excursion instead of sound, and the excursion comes back as
 * intermodulation across the bands that *do* carry information. Measured, the
 * bed was 97% sub-60 Hz at the drive-hum band (tools/audio-meter) — so almost
 * the whole of the loudest continuous layer in the mix was energy the reporting
 * device could only turn into distortion.
 *
 * §11 already names the answer for the contact band and it is the same answer
 * here: "adding harmonics rather than relying on fundamentals no laptop can
 * reproduce". The fundamental stays at 44 Hz and stays *present* — the pitch of
 * the plant is a spec'd fact — but the level moves up the series, where a small
 * speaker is efficient and where the self bus's low cut (engine.ts
 * SELF_LOW_CUT_HZ) leaves it alone. The ear reconstructs 44 Hz from 88 and 132
 * without being sent it, which is how a phone reproduces bass at all.
 *
 * Index n is harmonic n+1. Amplitudes, not decibels, and summing to a peak of
 * 1.3 — the tone gain above scales them, and `disableNormalization` keeps them
 * meaning what they say rather than whatever peak the browser would rescale to.
 */
export const TONE_PARTIALS = [0.3, 0.55, 0.3, 0.15] as const;

/**
 * The plant tone's waveform, as a `PeriodicWave`.
 *
 * Built per context and cached: a wave is immutable and every bed in a context
 * wants the same one. Sine phase — the imaginary coefficients — because the
 * real ones would put the partials in cosine phase and stack their peaks at
 * t=0, which costs headroom for nothing audible.
 */
const TONE_WAVE_BY_CONTEXT = new WeakMap<AudioContext, PeriodicWave>();

function toneWave(context: AudioContext): PeriodicWave | null {
  const cached = TONE_WAVE_BY_CONTEXT.get(context);
  if (cached !== undefined) return cached;
  try {
    const real = new Float32Array(TONE_PARTIALS.length + 1);
    const imag = new Float32Array(TONE_PARTIALS.length + 1);
    for (let n = 0; n < TONE_PARTIALS.length; n++) imag[n + 1] = TONE_PARTIALS[n]!;
    const wave = context.createPeriodicWave(real, imag, { disableNormalization: true });
    TONE_WAVE_BY_CONTEXT.set(context, wave);
    return wave;
  } catch {
    // No createPeriodicWave: the oscillator keeps its sine, which is the old
    // behaviour rather than silence. Worse on a phone, and still a plant.
    return null;
  }
}

/**
 * The continuous own-noise bed.
 *
 * Filtered noise plus a low tone, with an amplitude pulse once the machinery
 * band is reached. It is deliberately *not* a per-unit sound: §4 keys the bed
 * to peak SIG across the whole force, because the question it answers is "how
 * loud am I", not "how loud is this hull".
 */
export class SelfBed {
  private readonly out: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly noise: AudioBufferSourceNode | null;
  private readonly noiseGain: GainNode;
  private readonly tone: OscillatorNode;
  private readonly toneGain: GainNode;
  private nextPulseAt = 0;
  private stopped = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.out = context.createGain();
    this.out.gain.value = 0;
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 220;

    this.noiseGain = context.createGain();
    this.noiseGain.gain.value = 0.6;
    this.noise = createNoiseSource(context);

    this.tone = context.createOscillator();
    this.tone.frequency.value = TONE_HZ;
    const wave = toneWave(context);
    if (wave === null) this.tone.type = 'sine';
    else this.tone.setPeriodicWave(wave);
    this.toneGain = context.createGain();
    this.toneGain.gain.value = TONE.REST;

    this.noise?.connect(this.noiseGain).connect(this.filter);
    this.tone.connect(this.toneGain).connect(this.filter);
    this.filter.connect(this.out).connect(destination);

    this.tone.start();
    this.noise?.start();
  }

  /** Apply a mix. Cheap enough for every Echo tick. */
  update(mix: SelfMix, now: number): void {
    if (this.stopped) return;
    // Silent Running's 600 ms is the doc's number and the whole point of the
    // cue: fast enough to feel like a decision, slow enough to hear the world
    // open up behind it.
    this.out.gain.setTargetAtTime(mix.selfGain, now, SILENT_MIX.RAMP_S / 3);
    this.filter.frequency.setTargetAtTime(mix.cutoffHz, now, SILENT_MIX.RAMP_S / 3);

    if (mix.rateHz > 0 && now >= this.nextPulseAt) {
      this.nextPulseAt = now + 1 / mix.rateHz;
      this.toneGain.gain.cancelScheduledValues(now);
      this.toneGain.gain.setValueAtTime(TONE.REST * TONE.PULSE, now);
      this.toneGain.gain.setTargetAtTime(TONE.REST, now + 0.02, 0.12);
    }
  }

  stop(now: number): void {
    if (this.stopped) return;
    this.stopped = true;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, 0.15);
    try {
      this.tone.stop(now + 0.5);
      this.noise?.stop(now + 0.5);
    } catch {
      // Already stopped.
    }
  }
}

/**
 * The Lid, as a continuous texture — docs/audio-direction.md §4, "The Lid".
 *
 * A second bed on the self bus rather than a change to the first, because the
 * two are independent facts: a silent hull can be souring and a screaming one
 * can be in clean water. Folding sour into `SelfBed` would have made one of
 * those inaudible whenever the other was loud.
 *
 * Band-passed noise, high and thin, so it sits clear of the plant bed's low
 * band — which is also the band the doc reserves for a crush cue that does not
 * exist yet. Nothing here descends into it.
 */
export class SourBed {
  private readonly out: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly noise: AudioBufferSourceNode | null;
  private readonly pulse: GainNode;
  private nextPulseAt = 0;
  private stopped = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.out = context.createGain();
    this.out.gain.value = 0;

    this.filter = context.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.Q.value = 2.4;
    this.filter.frequency.value = SOUR_MIX.CENTRE_HZ;

    this.pulse = context.createGain();
    this.pulse.gain.value = 1;

    this.noise = createNoiseSource(context);
    this.noise?.connect(this.filter).connect(this.pulse).connect(this.out).connect(destination);
    this.noise?.start();
  }

  update(mix: SourMix, now: number): void {
    if (this.stopped) return;
    // Ramped, never set: §4 makes the souring texture *state*, and a level
    // that stepped on the 5 Hz Echo tick would have an onset — which is the
    // one thing the doc says this sound must not have.
    this.out.gain.setTargetAtTime(mix.gain, now, SOUR_MIX.RAMP_S / 3);

    if (mix.rateHz <= 0) {
      // Leaving the bleed leaves the pulse open rather than mid-dip, so the
      // texture fades out at full width instead of stuttering as it goes.
      this.pulse.gain.setTargetAtTime(1, now, 0.2);
      this.nextPulseAt = 0;
      return;
    }
    if (now >= this.nextPulseAt) {
      this.nextPulseAt = now + 1 / mix.rateHz;
      // A soft attack, deliberately: the bleed is being paid, not landing.
      // 40 ms in is far too slow to read as a transient and still slow enough
      // to feel like a pulse rather than a tremolo.
      this.pulse.gain.cancelScheduledValues(now);
      this.pulse.gain.setValueAtTime(this.pulse.gain.value, now);
      this.pulse.gain.linearRampToValueAtTime(1, now + 0.04);
      this.pulse.gain.setTargetAtTime(0.45, now + 0.04, 0.18);
    }
  }

  stop(now: number): void {
    if (this.stopped) return;
    this.stopped = true;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, 0.15);
    try {
      this.noise?.stop(now + 0.5);
    } catch {
      // Already stopped.
    }
  }
}

/**
 * The bite — the moment sour grace runs out (§4, "The Lid").
 *
 * The only transient the Lid gets, and it **descends**, because the answer to
 * it is to dive. The doc reserves the opposite gesture for a crush cue: if the
 * bottom of the column is ever voiced it must rise, and a player who cannot
 * resolve a cue into a direction has been spent rather than told.
 *
 * Thin and high where the under-fire knock is low and dull, and peaking below
 * the exposure strike's 0.9 — §12 keeps the loudest event in the game for
 * being lit, and losing grace on a clock you started is not that.
 */
export function playSourBite(context: AudioContext, destination: AudioNode, at: number): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(SOUR_MIX.CENTRE_HZ, at);
  osc.frequency.exponentialRampToValueAtTime(420, at + SOUR_BITE_S);

  // Band-passed with the bed, so the bite audibly comes out of the texture
  // that has been tightening for twenty seconds rather than arriving over it.
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.6;
  filter.frequency.setValueAtTime(SOUR_MIX.CENTRE_HZ, at);
  filter.frequency.exponentialRampToValueAtTime(500, at + SOUR_BITE_S);

  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.42, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + SOUR_BITE_S);

  osc.connect(filter).connect(gain).connect(destination);
  osc.start(at);
  osc.stop(at + SOUR_BITE_S + 0.05);
}

/**
 * Transmit — "a commitment sound: it must feel like slamming a door" (§5).
 *
 * A descending sweep rather than a rising one. Rising reads as a question;
 * this is an announcement, and the player has just told everything within
 * 2,400 m exactly where they are.
 */
export function playPingTransmit(context: AudioContext, destination: AudioNode, at: number): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1400, at);
  osc.frequency.exponentialRampToValueAtTime(180, at + PING_TRANSMIT_S);

  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(1400, at);
  filter.frequency.exponentialRampToValueAtTime(200, at + PING_TRANSMIT_S);

  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.5, at + 0.02);
  gain.gain.setValueAtTime(0.5, at + PING_TRANSMIT_S * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + PING_TRANSMIT_S);

  osc.connect(filter).connect(gain).connect(destination);
  osc.start(at);
  osc.stop(at + PING_TRANSMIT_S + 0.05);
}

/**
 * One return, scheduled by range.
 *
 * §5: "echoes arriving over the following 3 s, ordered by range so near
 * contacts return first. The player literally hears the sweep resolve the
 * map." The ordering is the information — a scatter of simultaneous blips
 * would carry none of it.
 */
export function playPingReturn(
  context: AudioContext,
  destination: AudioNode,
  at: number,
  pan: number
): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, at);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.22, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);

  osc.connect(gain).connect(panner).connect(destination);
  osc.start(at);
  osc.stop(at + 0.25);
}

/**
 * Exposure — the loudest event in the game (§5, §12).
 *
 * "A hard, close, panned strike, followed by a two-second tail. There is no
 * visual equivalent that arrives sooner. **If you have been lit, you know.**"
 *
 * Panned, because the server sent a bearing and this is the one cue entitled
 * to use it: the strike came *from* somewhere and the player felt it.
 */
export function playExposure(
  context: AudioContext,
  destination: AudioNode,
  at: number,
  pan: number
): void {
  const panner = context.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  panner.connect(destination);

  // The strike: a short, hard, broadband hit.
  const noise = createNoiseSource(context);
  if (noise !== null) {
    const strikeFilter = context.createBiquadFilter();
    strikeFilter.type = 'bandpass';
    strikeFilter.Q.value = 1.2;
    strikeFilter.frequency.setValueAtTime(2200, at);
    strikeFilter.frequency.exponentialRampToValueAtTime(400, at + 0.35);

    const strikeGain = context.createGain();
    strikeGain.gain.setValueAtTime(0, at);
    strikeGain.gain.linearRampToValueAtTime(0.9, at + 0.006);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);

    noise.connect(strikeFilter).connect(strikeGain).connect(panner);
    noise.start(at);
    noise.stop(at + 0.45);
  }

  // The tail: two seconds of ringing, so the moment does not simply end. This
  // is what makes exposure feel like a consequence rather than a notification.
  const tail = context.createOscillator();
  const tailGain = context.createGain();
  tail.type = 'triangle';
  tail.frequency.setValueAtTime(310, at);
  tail.frequency.exponentialRampToValueAtTime(120, at + EXPOSURE_TAIL_S);
  tailGain.gain.setValueAtTime(0, at);
  tailGain.gain.linearRampToValueAtTime(0.35, at + 0.03);
  tailGain.gain.exponentialRampToValueAtTime(0.0001, at + EXPOSURE_TAIL_S);
  tail.connect(tailGain).connect(panner);
  tail.start(at);
  tail.stop(at + EXPOSURE_TAIL_S + 0.05);
}

/**
 * Breaking silence to fire.
 *
 * A hard transient and not a volume change, because that is what it is: the
 * +40 SIG spike announces an ambush to the whole map, and the mix should make
 * the player wince rather than merely notice a meter move.
 */
export function playBreakSilence(context: AudioContext, destination: AudioNode, at: number): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(240, at);
  osc.frequency.exponentialRampToValueAtTime(70, at + BREAK_SILENCE_S);

  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.6, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + BREAK_SILENCE_S);

  osc.connect(gain).connect(destination);
  osc.start(at);
  osc.stop(at + BREAK_SILENCE_S + 0.05);
}

/**
 * A blow landing on your own plating — the audible half of docs/ui-ux.md §5's
 * under-fire alert, once per engagement (the mixer holds the window).
 *
 * Dull and close where the exposure strike is bright and directional: this is
 * the hull carrying the hit to you, not the water carrying a ping. Unpanned
 * for the same reason the break-silence transient is — it is *your* hull, and
 * the scope pulse says which one. Deliberately below the exposure strike's
 * 0.9 peak: §12 reserves the loudest event in the game for being lit.
 */
export function playUnderFire(context: AudioContext, destination: AudioNode, at: number): void {
  // The knock: a low, hard thud.
  const knock = context.createOscillator();
  const knockGain = context.createGain();
  knock.type = 'sine';
  knock.frequency.setValueAtTime(190, at);
  knock.frequency.exponentialRampToValueAtTime(55, at + 0.16);
  knockGain.gain.setValueAtTime(0, at);
  knockGain.gain.linearRampToValueAtTime(0.55, at + 0.005);
  knockGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
  knock.connect(knockGain).connect(destination);
  knock.start(at);
  knock.stop(at + 0.32);

  // The rattle: a short burst of low-passed noise — plating, not water.
  const noise = createNoiseSource(context);
  if (noise !== null) {
    const rattleFilter = context.createBiquadFilter();
    rattleFilter.type = 'lowpass';
    rattleFilter.frequency.setValueAtTime(900, at);
    rattleFilter.frequency.exponentialRampToValueAtTime(200, at + 0.2);
    const rattleGain = context.createGain();
    rattleGain.gain.setValueAtTime(0, at);
    rattleGain.gain.linearRampToValueAtTime(0.3, at + 0.008);
    rattleGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    noise.connect(rattleFilter).connect(rattleGain).connect(destination);
    noise.start(at);
    noise.stop(at + 0.28);
  }
}

/**
 * A notice in the interface's own voice — the idle-harvester chore
 * (docs/ui-ux.md §5). Two soft descending taps, short and quiet: a chore is
 * spoken once and never dramatised, and it is the first sound the ui bus has
 * ever carried, so it sets that bus's register — confirmations, never events.
 */
export function playNotice(context: AudioContext, destination: AudioNode, at: number): void {
  for (const [offset, freq] of [
    [0, 620],
    [0.11, 430],
  ] as const) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at + offset);
    gain.gain.setValueAtTime(0, at + offset);
    gain.gain.linearRampToValueAtTime(0.16, at + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.09);
    osc.connect(gain).connect(destination);
    osc.start(at + offset);
    osc.stop(at + offset + 0.12);
  }
}

function createNoiseSource(context: AudioContext): AudioBufferSourceNode | null {
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
