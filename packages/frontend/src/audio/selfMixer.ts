/**
 * Your own force, reduced to what the mix needs — docs/audio-direction.md §4, §5.
 *
 * The counterpart to `contactMixer`: that one turns what you know about others
 * into sound, this one turns what is true of *you* into sound. Same shape and
 * same reason — the decisions are pure, so they are testable, and the Web
 * Audio calls are injected.
 *
 * Every discrete cue here comes from a server-sent `SelfEvent`. None is
 * inferred. §5 makes exposure "the loudest event in the game", and the cost of
 * firing that on a guess is a player who learns to distrust the loudest thing
 * they hear — which would undo the mix as an information channel far more
 * thoroughly than having no cue at all.
 */

import { PERSISTENCE, SIM, SelfEventKind, type SelfEvent } from '@echoes/shared';
import { PING_RETURN_WINDOW_S } from './selfVoice.ts';
import { SOUR_BITE_S, selfMixFor, sourMixFor, type SelfMix, type SourMix } from './selfNoise.ts';
import { duckFor, type BusRung } from './precedence.ts';

/**
 * How long one engagement lasts, in simulation ticks — the same window the
 * renderer applies to its log rows (docs/ui-ux.md §5).
 */
const UNDER_FIRE_REARM_TICKS = PERSISTENCE.UNDER_FIRE_REARM_S * SIM.TICK_HZ;

/** One echo coming back from the player's own ping. */
export interface PingReturn {
  /** Range from the pinging hull, metres — this is what orders the returns. */
  rangeM: number;
  /** Stereo position, already resolved by the renderer. */
  pan: number;
}

export interface SelfAudioFrame {
  tick: number;
  /**
   * Loudest SIG across the player's own **units**.
   *
   * Units and not structures, which is a departure from the HUD's `peakSig`
   * and a deliberate one: §4's bed is the noise around the player's ears, and
   * their ears are their fleet. Folding in a base six kilometres away would
   * pin the bed at "full plant" for the whole match and make the entire scale
   * — including Silent Running's inversion — inaudible.
   */
  fleetSig: number;
  /**
   * True when the player's whole mobile force is running silent.
   *
   * All of it, not some: §4's inversion is the sales pitch for the mechanic,
   * and it should fire when the player has actually made the commitment, not
   * when one scout of twelve happens to be quiet.
   */
  silentRunning: boolean;
  /**
   * Worst sour exposure in the fleet, in seconds accrued — §4, "The Lid".
   *
   * Worst and not a sum, for the same reason `fleetSig` is a peak: the
   * question the texture answers is "is my force in the sour", and twelve
   * stacked textures would be mud. Straight off the server's `OwnUnit.sourS`,
   * so the sound and the card count the same grace down.
   */
  sourS: number;
  /** Server-sent events about the player's own force, this tick. */
  events: SelfEvent[];
  /** Echoes from the player's own ping, if one is resolving. */
  returns: PingReturn[];
}

/** The Web Audio side, injected so the decisions above can be tested alone. */
export interface SelfSink {
  bed(mix: SelfMix, now: number): void;
  /** Attenuate the world bus to this linear gain. */
  world(gain: number, now: number): void;
  transmit(at: number): void;
  ret(at: number, pan: number): void;
  exposure(at: number, pan: number): void;
  breakSilence(at: number): void;
  /** A blow on your own plating — docs/ui-ux.md §5, once per engagement. */
  underFire(at: number): void;
  /** A chore in the interface's voice, on the ui bus — the idle notice. */
  notice(at: number): void;
  /** The Lid's continuous texture — §4, "The Lid". State, never news. */
  sour(mix: SourMix, now: number): void;
  /** The bite: sour grace running out. The Lid's one transient. */
  sourBite(at: number): void;
}

export class SelfMixer {
  /** Events already played, so a resend cannot double-fire a one-shot. */
  private readonly played = new Set<string>();
  private lastTick = -1;
  /**
   * The server tick each hull was last hit on, for the engagement window
   * (docs/ui-ux.md §5).
   *
   * Ticks rather than either local clock, and that is the whole point: the
   * renderer measures the same window for its log rows, and the two must
   * agree about what one engagement is. `AudioContext.currentTime` stops
   * while a tab is hidden and `performance.now` does not, so a mixer keyed to
   * the audio clock would fall behind the log by exactly the time the player
   * spent looking elsewhere. The tick is the one clock both halves are handed.
   */
  private readonly underFireTick = new Map<number, number>();
  /** The tick the Lid last bit on, so a simultaneous crossing sounds once. */
  private sourBiteTick = -1;

  constructor(private readonly sink: SelfSink) {}

  /**
   * What is currently sounding loudest, for the precedence chain.
   *
   * Exposed so the engine can duck the rungs below it without this module
   * having to know what a GainNode is.
   */
  private loudest: BusRung | null = null;
  private loudestUntil = 0;
  /**
   * Every event kind this mixer has actually played, and how many times.
   *
   * A cue is transient by design, so "is it working" is not a question a
   * snapshot of current state can answer — by the time anything looks, the
   * door has finished slamming. This is the durable record, and it is what
   * the headless harness reads.
   */
  private readonly fired = new Map<SelfEventKind, number>();

  get firedCounts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [kind, count] of this.fired) out[SelfEventKind[kind]!] = count;
    return out;
  }

  get activeRung(): BusRung | null {
    return this.loudest;
  }

  update(frame: SelfAudioFrame, now: number): void {
    const mix = selfMixFor(frame.fleetSig, frame.silentRunning);
    this.sink.bed(mix, now);
    this.sink.sour(sourMixFor(frame.sourS), now);

    if (this.loudest !== null && now >= this.loudestUntil) this.loudest = null;

    for (const event of frame.events) {
      // Keyed by tick as well as unit: the same unit breaking silence twice in
      // one match is two events, but one event redelivered is not two.
      const key = `${frame.tick}:${event.kind}:${event.unitId}`;
      if (this.played.has(key)) continue;
      this.played.add(key);
      // Counted only when a cue actually sounded: a Damaged event folded into
      // a running engagement is delivered but not played, and the harness
      // reads this counter to ask "did it sound".
      if (this.voice(event, now, frame.tick)) {
        this.fired.set(event.kind, (this.fired.get(event.kind) ?? 0) + 1);
      }
    }

    // The world bus carries two independent claims on it: how deaf your own
    // noise has made you (§4), and the precedence chain (§2). They multiply —
    // a player at SIG 80 who is also being lit should hear the world at the
    // product of both, not at whichever rule ran last.
    //
    // Set *after* the events, not before. Setting it first cost the duck a
    // whole Echo tick: the strike would land 200 ms before the world gave way
    // to it, which is long enough to hear as two separate things rather than
    // one consequence.
    this.sink.world(mix.worldGain * duckFor('world', this.loudest), now);

    // Returns are scheduled, not fired: §5 wants them ordered by range across
    // a three-second window so the player "literally hears the sweep resolve
    // the map". Firing them together would be the same information with the
    // part that makes it information removed.
    if (frame.returns.length > 0) {
      const furthest = frame.returns.reduce((max, r) => (r.rangeM > max ? r.rangeM : max), 1);
      for (const echo of frame.returns) {
        this.sink.ret(now + (echo.rangeM / furthest) * PING_RETURN_WINDOW_S, echo.pan);
      }
    }

    // Bounded: a long match raises thousands of events, and the guard only has
    // to cover a redelivery of the tick in hand.
    if (frame.tick !== this.lastTick) {
      this.lastTick = frame.tick;
      if (this.played.size > 256) {
        for (const key of this.played) {
          if (!key.startsWith(`${frame.tick}:`)) this.played.delete(key);
        }
      }
    }
  }

  /** Voice one event. Returns whether a cue actually sounded. */
  private voice(event: SelfEvent, now: number, tick: number): boolean {
    switch (event.kind) {
      case SelfEventKind.Ping:
        this.sink.transmit(now);
        this.raise('self', now, 1.5);
        return true;
      case SelfEventKind.BreakSilence:
        this.sink.breakSilence(now);
        this.raise('self', now, 2);
        return true;
      case SelfEventKind.Exposed:
        // cos, for the same reason the contact voices use it: the bearing is
        // measured from world +x and stereo is the horizontal axis.
        this.sink.exposure(now, event.bearing === undefined ? 0 : Math.cos(event.bearing));
        this.raise('self-exposure', now, 2);
        return true;
      case SelfEventKind.Damaged: {
        const last = this.underFireTick.get(event.unitId);
        this.underFireTick.set(event.unitId, tick);
        if (last !== undefined && tick - last < UNDER_FIRE_REARM_TICKS) return false;
        this.sink.underFire(now);
        this.raise('self', now, 0.5);
        return true;
      }
      case SelfEventKind.HarvesterIdle:
        // No rung: a chore may not duck the water. The ui bus sits outside
        // the precedence chain, and this cue is one reason that stays true.
        this.sink.notice(now);
        return true;
      case SelfEventKind.SourBleed: {
        // One bite per Echo tick however many hulls crossed on it. Not a
        // collapse of separate news the way the under-fire window is: a group
        // ordered shallow crosses together, and six copies of one sound at one
        // instant is one piece of news at six times the amplitude — which
        // would spend the headroom §12 reserves for the exposure strike. The
        // log still carries a row per hull, because it can hold six rows on
        // one timestamp and the ear cannot hold six copies of one sound.
        if (this.sourBiteTick === tick) return false;
        this.sourBiteTick = tick;
        this.sink.sourBite(now);
        this.raise('self', now, SOUR_BITE_S);
        return true;
      }
    }
  }

  private raise(rung: BusRung, now: number, seconds: number): void {
    // Exposure outranks everything, so it is never displaced by a cue raised
    // after it — the door does not stop slamming because you pressed ping.
    if (this.loudest === 'self-exposure' && rung !== 'self-exposure') return;
    this.loudest = rung;
    this.loudestUntil = now + seconds;
  }

  reset(): void {
    this.played.clear();
    this.fired.clear();
    this.underFireTick.clear();
    this.sourBiteTick = -1;
    this.loudest = null;
    this.loudestUntil = 0;
  }
}
