/**
 * The speech bus, as sound — docs/audio-direction.md §13.
 *
 * A line is not played; it is **hailed**. No recorded voice ships, and the
 * words stay the log's (§11: captions are the log). What the mix does is say
 * *somebody is speaking on this channel, and it is one of these five*: a short
 * synthesised signature in the speaker's register's material, then a murmur
 * bed for as long as the line takes to read, band-limited so it reads as
 * cadence and never as words.
 *
 * Five materials, because docs/culture.md §3 has five voices and §6's test is
 * "which faction could not have said it" — a channel whose speakers sound
 * like one narrator has failed before any line plays (#381). The four faction
 * hails are §8's timbre families: the concern is machinery under load, the
 * plateaus breathe, the cohorts are many small things agreeing, the Order is
 * a pure sustained tone. The court is the fifth, and it is the one with no
 * water in it — a dry, dead-room tap — because the court speaks from a place
 * that is not the Rift.
 *
 * Everything here is a pure function of the audio context, in the style of
 * `selfVoice.ts`: one-shots built on demand and left to expire. Nothing feeds
 * back — the simulation never learns a line was heard.
 */

import type { MissionVoice } from '@echoes/shared';
import { ensureNoiseBuffer } from './contactVoice.ts';

/**
 * How long a line is read for — §13: fifteen characters a second, never under
 * a second and a half, never over eight. The bed runs for this long, so the
 * channel audibly stays open while the eye is on the log and closes when the
 * line would have been read.
 */
export const READING = { CHARS_PER_S: 15, MIN_S: 1.5, MAX_S: 8 } as const;

/** The hail — the signature before the bed — is this long, every voice. */
export const HAIL_S = 0.6;

/**
 * Under a silence order or Silent Running the channel is kept open at a
 * whisper: −6 dB, the top octave gone, the bed half as long (§13). Never
 * muted — the log is the caption and the ear is owed the cue that a line
 * landed. A voice that kept talking at full level while the player was
 * ordered quiet would be the mix contradicting the court.
 */
export const WHISPER = { GAIN: 0.5, BED_SCALE: 0.5 } as const;

/**
 * Seconds a line occupies after its hail. `whisper` halves it.
 *
 * Whitespace counts: the rate is a reading rate, and a reader does not skip
 * the spaces. Clamped before halving, so a whispered one-word line is still
 * shorter than a whispered paragraph rather than both pinned to the floor.
 */
export function readingSeconds(text: string, whisper = false): number {
  const clamped = Math.min(
    READING.MAX_S,
    Math.max(READING.MIN_S, text.length / READING.CHARS_PER_S)
  );
  return whisper ? clamped * WHISPER.BED_SCALE : clamped;
}

/** The mechanisms, §8's four and the court's fifth. */
export type HailMaterial = 'reciprocating' | 'breathing' | 'swarm' | 'drone' | 'dry';

export interface Hail {
  material: HailMaterial;
  /** Fundamental of the signature, Hz. */
  hz: number;
  /** Centre of the murmur bed's band, Hz. */
  bedHz: number;
  /** Bandwidth of the bed, as a biquad Q — higher is narrower and drier. */
  bedQ: number;
  /**
   * Top of the voice's band, Hz. The whisper rule takes the octave above
   * half of this away, so each voice loses *its own* top rather than a fixed
   * frequency that would gut the court and leave the concern untouched.
   */
  ceilingHz: number;
  /** Syllable rate of the bed's cadence, per second. */
  syllableHz: number;
  /** How much the cadence wanders, 0–1. The plateaus never repeat. */
  jitter: number;
}

/**
 * The five, as data — so the register test can be run over the table
 * without an AudioContext, and so the one player below cannot quietly give
 * two voices the same signature.
 */
export const HAILS: Readonly<Record<MissionVoice, Hail>> = {
  // Machinery under load: a square fundamental struck in a fixed beat. The
  // concern is the only voice with a metronome in it.
  concern: {
    material: 'reciprocating',
    hz: 68,
    bedHz: 300,
    bedQ: 1.2,
    ceilingHz: 1600,
    syllableHz: 4,
    jitter: 0,
  },
  // Breathing: one slow swell that rises and falls and does not repeat.
  plateaus: {
    material: 'breathing',
    hz: 52,
    bedHz: 220,
    bedQ: 0.9,
    ceilingHz: 1200,
    syllableHz: 2.6,
    jitter: 0.85,
  },
  // Many small things agreeing: ticks that start scattered and land together.
  cohorts: {
    material: 'swarm',
    hz: 140,
    bedHz: 900,
    bedQ: 2,
    ceilingHz: 3200,
    syllableHz: 5,
    jitter: 0.35,
  },
  // Pure tone: one sustained note, clean attack, long release.
  order: {
    material: 'drone',
    hz: 196,
    bedHz: 600,
    bedQ: 6,
    ceilingHz: 2400,
    syllableHz: 3,
    jitter: 0,
  },
  // A dead room: a single dry tap of high-passed noise with no tail and no
  // tone. Every other voice here is heard through water; the court is not.
  court: {
    material: 'dry',
    hz: 1200,
    bedHz: 1200,
    bedQ: 9,
    ceilingHz: 4000,
    syllableHz: 3.4,
    jitter: 0.1,
  },
};

export function hailFor(voice: MissionVoice): Hail {
  return HAILS[voice];
}

export interface HailOptions {
  /** The whisper rule — a silence order or Silent Running is in force. */
  whisper: boolean;
  /** Seconds the murmur bed runs after the hail, from `readingSeconds`. */
  readingS: number;
}

/**
 * Hail one line: the signature, then the bed. Returns the seconds the
 * channel is occupied from `at`, so the engine can hold the speech rung for
 * exactly that long.
 */
export function playHail(
  context: AudioContext,
  destination: AudioNode,
  voice: MissionVoice,
  at: number,
  opts: HailOptions
): number {
  const hail = HAILS[voice];

  // The channel: a trim for the whisper, then a low-pass that is wide open at
  // full power and takes the top octave under the whisper rule. Built per
  // line rather than per bus so two lines a tick apart under different orders
  // — one at full power, one whispered — are each what they were when spoken.
  const channel = context.createGain();
  channel.gain.value = opts.whisper ? WHISPER.GAIN : 1;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = opts.whisper ? hail.ceilingHz / 2 : hail.ceilingHz;
  lowpass.connect(channel).connect(destination);

  signature(context, lowpass, hail, at);
  murmur(context, lowpass, hail, at + HAIL_S, opts.readingS);
  return HAIL_S + opts.readingS;
}

/** The signature — what says *which* of the five is on the channel. */
function signature(context: AudioContext, out: AudioNode, hail: Hail, at: number): void {
  switch (hail.material) {
    case 'reciprocating': {
      // Three strikes on a fixed period. The beat is the identity, so it is
      // not jittered and not shaped: a square, gated hard.
      const period = HAIL_S / 3;
      for (let i = 0; i < 3; i++) {
        const t = at + i * period;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(hail.hz, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + period * 0.7);
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + period);
      }
      return;
    }
    case 'breathing': {
      // One swell, in and out, with the pitch drifting up and back — a breath
      // is not a note. Sine, so there is nothing rhythmic to hold on to.
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hail.hz, at);
      osc.frequency.linearRampToValueAtTime(hail.hz * 1.35, at + HAIL_S * 0.55);
      osc.frequency.linearRampToValueAtTime(hail.hz * 1.1, at + HAIL_S);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.4, at + HAIL_S * 0.45);
      gain.gain.linearRampToValueAtTime(0, at + HAIL_S);
      osc.connect(gain).connect(out);
      osc.start(at);
      osc.stop(at + HAIL_S + 0.02);
      return;
    }
    case 'swarm': {
      // Six ticks. The first are scattered around the beat; each lands closer
      // to it than the last, and the final two land together — §8's "clicks
      // that phase into unison". Deterministic offsets: the convergence is
      // the point, and a random scatter would sometimes fail to converge.
      const ticks = 6;
      const spread = [0.09, -0.06, 0.04, -0.02, 0, 0] as const;
      for (let i = 0; i < ticks; i++) {
        const t = at + (i / ticks) * HAIL_S + spread[i]!;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(hail.hz * (i % 2 === 0 ? 1 : 1.5), t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.06);
      }
      return;
    }
    case 'drone': {
      // One note, held. A sawtooth through a narrow band-pass so it is nearly
      // pure but not a test tone — crystal, not a sine generator.
      const osc = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hail.hz, at);
      filter.type = 'bandpass';
      filter.Q.value = 8;
      filter.frequency.setValueAtTime(hail.hz * 2, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.36, at + 0.03);
      gain.gain.setValueAtTime(0.36, at + HAIL_S * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + HAIL_S);
      osc.connect(filter).connect(gain).connect(out);
      osc.start(at);
      osc.stop(at + HAIL_S + 0.02);
      return;
    }
    case 'dry': {
      // A tap, once. High-passed noise, 25 ms, no resonance and no tail: the
      // sound of a room that has no water in it to carry anything.
      const noise = createNoiseSource(context);
      if (noise === null) return;
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(hail.hz, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.5, at + 0.002);
      gain.gain.linearRampToValueAtTime(0, at + 0.025);
      noise.connect(filter).connect(gain).connect(out);
      noise.start(at);
      noise.stop(at + 0.04);
      return;
    }
  }
}

/**
 * The murmur bed — the channel staying open while the line is read.
 *
 * Band-passed noise gated at a syllable rate. It must carry cadence and not
 * words, so it is never voiced: no formants, no pitch, only the band and the
 * gate. The gate is a scheduled envelope rather than an LFO node, because a
 * voice that never quite repeats needs each syllable placed by hand, and the
 * cost of forty scheduled ramps is far under the tick's budget.
 */
function murmur(
  context: AudioContext,
  out: AudioNode,
  hail: Hail,
  at: number,
  seconds: number
): void {
  const noise = createNoiseSource(context);
  if (noise === null) return;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = hail.bedHz;
  filter.Q.value = hail.bedQ;
  const gate = context.createGain();
  gate.gain.setValueAtTime(0, at);

  const level = 0.16;
  // Deterministic cadence: the same line hails the same way twice. Math.random
  // is allowed on this side of the wall (§12) but buys nothing here, and a
  // stable bed is easier to hear as *the same voice* across a mission.
  let phase = 0.37;
  let t = at;
  const end = at + seconds;
  while (t < end) {
    phase = (phase * 9.7 + 0.31) % 1;
    const wander = (phase - 0.5) * 2 * hail.jitter;
    const syllable = (1 / hail.syllableHz) * (1 + wander * 0.6);
    const on = Math.min(end, t + syllable * 0.55);
    gate.gain.linearRampToValueAtTime(level * (0.7 + 0.3 * phase), t + 0.02);
    gate.gain.linearRampToValueAtTime(level * 0.15, on);
    t += syllable;
  }
  // The channel closes: no tail, the way a link drops rather than fades.
  gate.gain.linearRampToValueAtTime(0, end + 0.04);

  noise.connect(filter).connect(gate).connect(out);
  noise.start(at);
  noise.stop(end + 0.1);
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
