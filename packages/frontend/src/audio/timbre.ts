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

export type Mechanism = 'reciprocating' | 'breathing' | 'swarm' | 'drone';

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

export function timbreFor(faction: Faction | undefined): FactionTimbre {
  // Unclassified contacts have no faction yet, and must not borrow one: at
  // Tier 2 and below the mix has no business hinting at whose navy it is.
  return faction === undefined ? FACTION_TIMBRE[Faction.Bathyarch] : FACTION_TIMBRE[faction];
}
