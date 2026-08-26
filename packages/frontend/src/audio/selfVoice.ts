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
import { BREAK_SILENCE_S, SILENT_MIX, type SelfMix } from './selfNoise.ts';

/** SPEC — §5. The outgoing sweep is 1.5 s and the returns arrive over 3 s. */
export const PING_TRANSMIT_S = 1.5;
export const PING_RETURN_WINDOW_S = 3;

/** SPEC — §5. "A hard, close, panned strike, followed by a two-second tail." */
export const EXPOSURE_TAIL_S = 2;

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
    this.tone.type = 'sine';
    this.tone.frequency.value = 44;
    this.toneGain = context.createGain();
    this.toneGain.gain.value = 0.4;

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
      const peak = this.toneGain.gain.value;
      this.toneGain.gain.cancelScheduledValues(now);
      this.toneGain.gain.setValueAtTime(peak * 1.7, now);
      this.toneGain.gain.setTargetAtTime(0.4, now + 0.02, 0.12);
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
