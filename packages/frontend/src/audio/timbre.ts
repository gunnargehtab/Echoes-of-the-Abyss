/**
 * Faction timbre families — docs/audio-direction.md §8.
 *
 * "A player must identify a faction at Tier 3 by ear alone, with no visual.
 * Each family owns a distinct mechanism of sound production, not just a
 * distinct EQ curve."
 *
 * That distinction is why these are synthesis recipes rather than filter
 * presets. Four EQ curves on one sample would be four versions of the same
 * thing; four *mechanisms* are four things. The Consortium has a beat, the
 * Commune never repeats, the Directorate is many small events converging, the
 * Knights are a single sustained tone. A player learns those the way they
 * learn a bird call.
 */

import { Faction } from '@echoes/shared';

export type Mechanism = 'reciprocating' | 'breathing' | 'swarm' | 'drone' | 'none';

export interface FactionTimbre {
  mechanism: Mechanism;
  /** Fundamental of the drive signature, Hz. */
  baseHz: number;
  /** Events per second, where the mechanism has events. */
  rateHz: number;
  /**
   * How much the period wanders, 0-1.
   *
   * The load-bearing number: the Consortium is at 0 because it is "the only
   * faction with a *beat*", and the Commune is near 1 because it has "no
   * periodicity — pulses that never quite repeat". Those two are the poles the
   * other families are heard against.
   */
  jitter: number;
  /** Waveform of the fundamental. */
  wave: OscillatorType;
}

export const FACTION_TIMBRE: Record<Faction, FactionTimbre> = {
  // Machinery under load: steel, reciprocating, rhythmic. Audible from absurd
  // range and completely unbothered about it.
  [Faction.Bathyarch]: {
    mechanism: 'reciprocating',
    baseHz: 68,
    rateHz: 2.4,
    jitter: 0,
    wave: 'square',
  },
  // Breathing: muscle and fluid, arrhythmic, nearly gone under 20 SIG.
  [Faction.Pelagia]: {
    mechanism: 'breathing',
    baseHz: 52,
    rateHz: 0.5,
    jitter: 0.85,
    wave: 'sine',
  },
  // Many small things agreeing — clicks that phase into unison.
  [Faction.Directorate]: {
    mechanism: 'swarm',
    baseHz: 140,
    rateHz: 9,
    jitter: 0.35,
    wave: 'triangle',
  },
  // Pure tone: crystal, sustained, harmonic.
  [Faction.Hadron]: { mechanism: 'drone', baseHz: 196, rateHz: 0, jitter: 0, wave: 'sawtooth' },
};

/**
 * The voice of a contact that belongs to no navy — TUNABLE, no doc pins these.
 *
 * The Echo Layer sends no faction for a creature or a piece of ordnance on
 * purpose (echoLayer.ts, "a creature belongs to nobody"), and this is what
 * the mix is allowed to say about that: nothing. Option 1 of #618 — a non-navy
 * contact is defined by the *absence* of a drive signature rather than by a
 * fifth mechanism of its own, which is the design call the issue reserves.
 *
 * Three properties carry that, and each is load-bearing:
 *
 * - `mechanism: 'none'` and `rateHz: 0` mean no events, and `scheduleThump`
 *   emits no pulse for an eventless mechanism. Zeroing the rate alone is not
 *   enough and was the trap: it used to buy a 1.5000 s zero-jitter metronome,
 *   which is precisely the beat §8 reserves to the Consortium.
 * - `baseHz` sits at least 10 Hz clear of all four fundamentals (52, 68, 140,
 *   196) and of every octave of them in the band, so it is not heard as any
 *   navy detuned; and it is well above the 55/72 Hz Tier 1-2 thump, so a
 *   classified creature does not read as an *un*classified anything either.
 * - `jitter: 1` is belt and braces. It does nothing while there are no events;
 *   it is there so that giving this timbre events later cannot silently
 *   produce a beat.
 */
export const UNCLASSIFIED_TIMBRE: FactionTimbre = {
  mechanism: 'none',
  baseHz: 118,
  rateHz: 0,
  jitter: 1,
  wave: 'sine',
};

export function timbreFor(faction: Faction | undefined): FactionTimbre {
  // A contact with no faction is a creature, a torpedo or a mine, and it is
  // heard at Tier 3 and above like any other classified return — this is not a
  // pre-classification case. It used to fall back to the Consortium's recipe,
  // which made every classified creature sound like a Consortium hull; the
  // comment that defended it was about Tier 2, where the timbre is discarded.
  return faction === undefined ? UNCLASSIFIED_TIMBRE : FACTION_TIMBRE[faction];
}
