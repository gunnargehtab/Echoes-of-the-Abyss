/**
 * The in-match score — docs/audio-direction.md §10, "The score" (#1599).
 *
 * §10's rules are the port's rules plus one input: "the score follows the
 * player's own SIG, which means the music swells when they are *exposed*, not
 * when they are winning". So this is the port's grammar — a pedal under 40 Hz,
 * cold partials above 800 Hz, onsets on the 200 ms grid, composed rather than
 * random — with §4's bands driving it. The bands and not the SIG number, so the
 * score, the self bed and the HUD label change on the same comparisons and the
 * music never moves without the plant moving under it.
 *
 * The swell is layers, not a fader. Every phrase is composed in four layers,
 * one per band, each with its own gain node; a band opens every layer at or
 * below it, and the tick does nothing but aim those gains. That is what keeps a
 * band change inside the Echo tick's budget — no node is built on the tick —
 * and what lets a rise be heard within a second rather than at the next phrase:
 * the notes of the higher layers are already sounding, muted.
 *
 * Like the menu bed, the composition is pure and the Web Audio half only
 * renders it, so the band law and §9's demand to "leave the fifth alone" are
 * asserted by score.test.ts against data rather than promised in a comment.
 */

import { GRID_MS, MUSIC_BAND, PHRASE_MS, duePhrases, lcg } from './menuBed.ts';
import { SELF_BANDS, SILENT_MIX, bandFor } from './selfNoise.ts';

/** One layer per §4 band, in the bands' order. */
export const SCORE_LAYERS = SELF_BANDS.length;

/**
 * The partials, in Hz: a pentatonic on C and D with its A taken out.
 *
 * §9 gives the Fields a tuned bed at 880, 1,100 and 1,320 Hz and says the score
 * "must leave the fifth alone". Every partial here sits at least
 * TUNED_CLEARANCE_CENTS from those three and their octaves, on every map: a
 * score that changed key where crystal begins would be a terrain readout. The
 * A is the note that would have been 1,760 Hz — the root's own octave, which
 * would have fused with the crystal rather than grinding against it, and a
 * score the ear cannot tell from the water is the same fault from the other
 * side. Still no semitone, which is the menu set's reason for a pentatonic.
 */
export const SCORE_PARTIALS_HZ = [1046.5, 1174.7, 1396.9, 1568, 2093, 2349.3] as const;

/** §10, "The score": how far every partial stays from the tuned bed, in cents. */
export const TUNED_CLEARANCE_CENTS = 60;

/**
 * The pedal — under the 40 Hz ceiling, a fraction apart so it beats, as the
 * port's does. A little lower than the port's, so the water's floor is not the
 * menu's floor carried in.
 *
 * Quiet, and deliberately so: #663 found the mix spending itself below 60 Hz on
 * the devices that cannot reproduce it, and the self bus is low-cut at 60 Hz for
 * that reason. The music bus is not, because §10 gives music this register, so
 * the restraint has to be in the level.
 */
export const SCORE_PEDAL_HZ = [31.0, 31.3] as const;

/**
 * SPEC — docs/audio-direction.md §10, "The score": linear gain of the open
 * layers, by band, at −6, −4, −2 and 0 dB. The score swells by density, height
 * and level together, and level is the smallest of the three.
 */
export const LAYER_LEVEL = [0.501, 0.631, 0.794, 1] as const;

/** Linear gain of the pedal, by band. It rises with the layers, by less. */
export const PEDAL_LEVEL = [0.7, 0.8, 0.9, 1] as const;

/**
 * Per-layer composition: how often it speaks on the grid, how long a partial
 * lasts, and how much of the set it may reach. Higher layers speak more often,
 * reach higher and hold shorter, so full plant is agitated rather than merely
 * louder.
 */
const LAYER_SHAPE = [
  { chance: 0.04, minMs: 3000, spanMs: 3000, reach: 3 },
  { chance: 0.03, minMs: 2400, spanMs: 2400, reach: 4 },
  { chance: 0.04, minMs: 1800, spanMs: 1800, reach: 5 },
  { chance: 0.05, minMs: 1200, spanMs: 1800, reach: 6 },
] as const;

/**
 * Ramps, as setTargetAtTime time constants: a swell arrives in about a second
 * and leaves over about three. Going silent uses §4's own crossfade, so the
 * score closes exactly as fast as the world opens.
 */
const RISE_S = 0.35;
const FALL_S = 1.0;
const SILENT_S = SILENT_MIX.RAMP_S / 3;

/** Ceiling on the whole score, linear, before the user's Music trim. */
const SCORE_CEILING = 0.5;
/**
 * Each pedal sine, before the band's PEDAL_LEVEL. Measured, not chosen by ear:
 * at 0.12 the pedal was 91-96% of the score's energy in every band
 * (tools/audio-meter), which is #663's fault in a new layer, and through the
 * speaker profile it came back as a comb of harmonics above 260 Hz — inside
 * the register §10 keeps music out of. At 0.03 it is felt on a system that
 * reaches 31 Hz and nearly nothing on one that does not.
 */
const PEDAL_GAIN = 0.03;

export interface ScorePartial {
  /** Milliseconds from the start of the phrase. Always on the grid. */
  atMs: number;
  durationMs: number;
  hz: number;
  /** Peak linear gain of this partial, before its layer and the ceiling. */
  gain: number;
  /** The band (0-3) whose opening makes this partial audible. */
  layer: number;
}

/**
 * Compose one phrase, every layer of it.
 *
 * Seeded apart from the menu's phrases, so the water is not the port with
 * more notes in it.
 */
export function scorePhrase(index: number): ScorePartial[] {
  const random = lcg(index * 6007 + 92821);
  const steps = Math.floor(PHRASE_MS / GRID_MS);
  const top = SCORE_PARTIALS_HZ.length - 1;
  const partials: ScorePartial[] = [];

  for (let step = 0; step < steps; step++) {
    for (let layer = 0; layer < SCORE_LAYERS; layer++) {
      const shape = LAYER_SHAPE[layer]!;
      // Two draws on every step and layer, whether or not it speaks, so one
      // layer's density can be retuned without reshuffling the others' notes.
      const speaks = random() < shape.chance;
      const pick = random();
      if (!speaks) continue;
      const hz = SCORE_PARTIALS_HZ[Math.floor(pick * shape.reach)]!;
      const height = (hz - SCORE_PARTIALS_HZ[0]) / (SCORE_PARTIALS_HZ[top] - SCORE_PARTIALS_HZ[0]);
      partials.push({
        atMs: step * GRID_MS,
        durationMs: shape.minMs + Math.floor(random() * shape.spanMs),
        hz,
        // The menu's tilt: the top of the set quieter, because the ear favours it.
        gain: 0.05 - 0.025 * height,
        layer,
      });
    }
  }

  return partials;
}

/** What the score should be doing, given what the server says the fleet is. */
export interface ScoreMix {
  /** Gain of each layer, linear. A closed layer is 0. */
  layers: number[];
  /** Gain of the pedal, linear, before PEDAL_GAIN. */
  pedal: number;
  /** §4's band, 0-3, or -1 under Silent Running. */
  band: number;
}

/**
 * The whole of §10's input rule, as one pure function — the same two facts
 * `selfMixFor` reads, so the bed and the score can never disagree about which
 * band the fleet is in.
 */
export function scoreMixFor(fleetSig: number, silentRunning: boolean): ScoreMix {
  if (silentRunning) {
    return { layers: new Array<number>(SCORE_LAYERS).fill(0), pedal: PEDAL_LEVEL[0], band: -1 };
  }
  const band = SELF_BANDS.indexOf(bandFor(fleetSig));
  const level = LAYER_LEVEL[band]!;
  return {
    layers: Array.from({ length: SCORE_LAYERS }, (_, layer) => (layer <= band ? level : 0)),
    pedal: PEDAL_LEVEL[band]!,
    band,
  };
}

/** How often the scheduler checks, as the menu bed's does, and for its reason. */
const QUEUE_TICK_MS = 2_000;

/**
 * The score, as nodes.
 *
 * Built at the unlock gesture with every gain at zero and nothing started.
 * `update` starts it on the first own-force frame and aims the gains from then
 * on; phrases are queued from the score's own timer, never from the Echo tick.
 */
export class Score {
  private readonly context: AudioContext;
  private readonly out: GainNode;
  private readonly pedal: GainNode;
  private readonly pedals: OscillatorNode[] = [];
  private readonly layers: GainNode[] = [];
  /** Partials still sounding, so a stop can end them (menuBed.ts says why). */
  private readonly scheduled = new Set<OscillatorNode>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextPhrase = 0;
  private nextPhraseAt = 0;
  private band: number | null = null;
  /** The gain each layer was last aimed at, so a ramp knows if it is a rise. */
  private readonly aimed = new Array<number>(SCORE_LAYERS).fill(0);
  private aimedPedal = 0;
  private stopped = false;
  private readonly selfTimed: boolean;

  /**
   * `selfTimed: false` leaves the queueing to the caller's `pump`. Only the
   * audio meter wants that: an offline render lays its whole run down before a
   * sample is produced, so a timer reading the render's clock would race it.
   */
  constructor(context: AudioContext, destination: AudioNode, { selfTimed = true } = {}) {
    this.context = context;
    this.selfTimed = selfTimed;

    this.out = context.createGain();
    this.out.gain.value = SCORE_CEILING;
    this.out.connect(destination);

    // The air register shares one highpass, as the menu's does: belt and braces
    // against an envelope clicking energy down into the contact band.
    const floor = context.createBiquadFilter();
    floor.type = 'highpass';
    floor.frequency.value = MUSIC_BAND.airMinHz;
    floor.connect(this.out);
    for (let layer = 0; layer < SCORE_LAYERS; layer++) {
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(floor);
      this.layers.push(gain);
    }

    // Straight to the output: the highpass above would remove it entirely.
    this.pedal = context.createGain();
    this.pedal.gain.value = 0;
    this.pedal.connect(this.out);
    for (const hz of SCORE_PEDAL_HZ) {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz;
      const gain = context.createGain();
      gain.gain.value = PEDAL_GAIN;
      osc.connect(gain).connect(this.pedal);
      this.pedals.push(osc);
    }
  }

  /** §4's band the score is playing, -1 running silent, null before it began. */
  get playingBand(): number | null {
    return this.band;
  }

  /** Partials queued and not yet ended — the harness's "is it composing". */
  get scheduledPartials(): number {
    return this.scheduled.size;
  }

  /** Aim the score at `mix`. Writes parameters only; the first call also starts it. */
  update(mix: ScoreMix, now: number): void {
    if (this.stopped) return;
    if (this.band === null) this.begin(now);
    this.band = mix.band;
    const silent = mix.band < 0;
    for (let layer = 0; layer < SCORE_LAYERS; layer++) {
      const target = mix.layers[layer] ?? 0;
      this.aim(this.layers[layer]!.gain, target, this.aimed[layer]!, silent, now);
      this.aimed[layer] = target;
    }
    this.aim(this.pedal.gain, mix.pedal, this.aimedPedal, silent, now);
    this.aimedPedal = mix.pedal;
  }

  /**
   * Write a ramp only when the target moved. The frame arrives at 5 Hz whether
   * or not the band changed, and re-aiming an unchanged target restarts its
   * ramp from wherever it has got to — on the fall's constant, since an equal
   * target is not a rise — so a swell meant to arrive in a second took three.
   * Direction is read against the last target, not the parameter's value,
   * which is wherever the previous ramp has got to and says nothing about it.
   */
  private aim(param: AudioParam, target: number, last: number, silent: boolean, now: number): void {
    if (target === last) return;
    param.setTargetAtTime(target, now, silent ? SILENT_S : target > last ? RISE_S : FALL_S);
  }

  private begin(now: number): void {
    for (const osc of this.pedals) osc.start(now);
    this.nextPhraseAt = now;
    if (!this.selfTimed) return;
    // The first phrase is queued from the timer, not here: `update` runs on the
    // Echo tick, and a phrase is a few dozen nodes.
    this.timer = setInterval(() => this.pump(), QUEUE_TICK_MS);
    // Node's runner would otherwise wait on it; a browser timer has no unref.
    (this.timer as unknown as { unref?: () => void }).unref?.();
    setTimeout(() => this.pump(), 0);
  }

  /** Queue every phrase whose start is inside the look-ahead window. */
  pump(now = this.context.currentTime): void {
    if (this.stopped || this.band === null) return;
    const { starts, nextAt } = duePhrases(this.nextPhraseAt, now);
    for (const at of starts) this.schedule(scorePhrase(this.nextPhrase++), at);
    this.nextPhraseAt = nextAt;
  }

  private schedule(partials: ScorePartial[], phraseAt: number): void {
    for (const partial of partials) {
      const at = phraseAt + partial.atMs / 1000;
      const seconds = partial.durationMs / 1000;
      let osc: OscillatorNode;
      let gain: GainNode;
      try {
        osc = this.context.createOscillator();
        gain = this.context.createGain();
      } catch {
        // The context closed under us mid-schedule. Nothing to recover.
        return;
      }
      osc.type = 'sine';
      osc.frequency.value = partial.hz;
      // The menu bed's envelope: slow in, slower out, no sustain.
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(partial.gain, at + seconds * 0.35);
      gain.gain.linearRampToValueAtTime(0, at + seconds);
      osc.connect(gain).connect(this.layers[partial.layer]!);
      osc.start(at);
      osc.stop(at + seconds + 0.05);
      osc.addEventListener('ended', () => {
        this.scheduled.delete(osc);
        try {
          gain.disconnect();
          osc.disconnect();
        } catch {
          // Already gone with the context.
        }
      });
      this.scheduled.add(osc);
    }
  }

  /** End everything. The engine closes the context straight after, so no fade. */
  stop(now: number): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    try {
      if (this.band !== null) for (const osc of this.pedals) osc.stop(now);
      for (const osc of this.scheduled) osc.stop(now);
    } catch {
      // A context already closing refuses these.
    }
    this.scheduled.clear();
  }
}
