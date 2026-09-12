/**
 * Timbre families — docs/audio-direction.md §8 and §8.1.
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
 *
 * Six families, not four: §8.1 adds the creature and the ordnance, because a
 * contact can belong to no navy and the mix still has to say what it *is*. The
 * question this module answers is therefore "what is this" and never "whose is
 * this", which is why nothing here takes a bare `Faction`.
 */

import { Faction, type FaunaSpecies, type OrdnanceKind } from '@echoes/shared';

export type Mechanism = 'reciprocating' | 'breathing' | 'swarm' | 'drone' | 'swell' | 'screw';

export interface ContactTimbre {
  mechanism: Mechanism;
  /** Fundamental of the signature, Hz. */
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

export const FACTION_TIMBRE: Record<Faction, ContactTimbre> = {
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
 * Organic mass, moving — §8.1. TUNABLE; the doc pins the mechanism, not the
 * numbers.
 *
 * One family for the whole bestiary. A Sounder and a Rasp swarm are the same
 * voice here on purpose: §8.1 refuses eleven signatures in the octave §11
 * flags as the one small speakers do not reproduce, and which creature it is
 * is the screen's to say.
 *
 * Separated from the Commune by **scale**, not by arrhythmia. Both wander; at
 * 0.16 Hz the shortest swell this can produce is longer than the longest
 * breath the Commune can, which is the property `contactTimbre.test.ts`
 * asserts over the whole table rather than over this pair.
 *
 * 84 Hz because the bottom of the band is the navies' own octaves: 26, 34, 35,
 * 49, 52, 68, 70 and 72 Hz are all spoken for within 10 Hz, and the first
 * clear air above them is 80-88. A creature cannot be lower than a navy here
 * without being that navy detuned, so it is the *rate* that carries the mass.
 */
export const CREATURE_TIMBRE: ContactTimbre = {
  mechanism: 'swell',
  baseHz: 84,
  rateHz: 0.16,
  jitter: 0.6,
  wave: 'sine',
};

/**
 * A small screw, running — §8.1. TUNABLE, as above.
 *
 * Four events a second, a register above every drive signature. Deliberately
 * *not* faster than the Directorate's 9 Hz, which is where "a small fast
 * running screw" first points: the contact mix is driven by the 5 Hz Echo
 * snapshot (engine.ts, `onEchoTick`), so any rate past 5 fires on every tick
 * and is rendered as the Directorate already is. Faster than the swarm is not
 * a mechanism the player can hear; clear of it, in the slower direction, is.
 *
 * `jitter` is what keeps this off the Consortium's row. A screw is nearly
 * periodic and an exactly periodic one is a beat, which §8 reserves — so it
 * wanders by 45%, enough to land on two different multiples of the Echo tick.
 */
export const ORDNANCE_TIMBRE: ContactTimbre = {
  mechanism: 'screw',
  baseHz: 232,
  rateHz: 4,
  jitter: 0.45,
  wave: 'square',
};

/**
 * What the mix is allowed to know a contact *is*.
 *
 * A closed union rather than three optional fields, so `timbreFor` below can
 * be exhaustive over it. The Echo Layer resolves exactly one of these at Tier
 * 3 (echoLayer.ts: a unit or structure carries a faction, a creature carries a
 * species, a piece of ordnance carries a kind) and none of them below it.
 */
export type ContactIdentity =
  | { readonly sort: 'navy'; readonly faction: Faction }
  | { readonly sort: 'creature'; readonly species: FaunaSpecies }
  | { readonly sort: 'ordnance'; readonly kind: OrdnanceKind };

/** The wire fields an identity is read off, exactly as the contact carries them. */
export interface IdentityFields {
  faction?: Faction;
  fauna?: FaunaSpecies;
  ordnance?: OrdnanceKind;
}

/**
 * The one place the wire's three optional fields become an identity.
 *
 * The order is the Echo Layer's own: a unit or a structure is the only thing
 * that carries a faction, and a creature and a piece of ordnance are each
 * mutually exclusive with it there. Reading them in a fixed order rather than
 * rejecting the combination keeps this total — an impossible contact gets a
 * defined voice instead of a thrown exception inside the audio tick.
 */
export function identityFor(fields: IdentityFields): ContactIdentity | undefined {
  if (fields.faction !== undefined) return { sort: 'navy', faction: fields.faction };
  if (fields.fauna !== undefined) return { sort: 'creature', species: fields.fauna };
  if (fields.ordnance !== undefined) return { sort: 'ordnance', kind: fields.ordnance };
  return undefined;
}

/**
 * The timbre an identity is heard as, or `null` when there is no identity.
 *
 * **No defaulting branch** — acceptance criterion 6 of #618, and the reason
 * this takes a discriminated identity rather than a nullable faction. `null`
 * is not a default: it invents nothing, and the voice answers it with the
 * unidentifying thump of the tiers below (contactVoice.ts). What is banned is
 * the branch this function used to have, which answered "no faction" with the
 * Consortium's own object — so every classified creature, torpedo and mine
 * sounded like a Consortium hull, the mix asserting a fact the server never
 * sent (§2's second law inverted).
 *
 * The `never` below is what makes the ban hold over time: a seventh family
 * added to `ContactIdentity` is a compile error here rather than a silent
 * navy. That is the wire rule (CLAUDE.md, "The wire") applied one layer
 * inward.
 */
export function timbreFor(identity: ContactIdentity | undefined): ContactTimbre | null {
  if (identity === undefined) return null;
  switch (identity.sort) {
    case 'navy':
      return FACTION_TIMBRE[identity.faction];
    case 'creature':
      return CREATURE_TIMBRE;
    case 'ordnance':
      return ORDNANCE_TIMBRE;
    default: {
      const unhandled: never = identity;
      return unhandled;
    }
  }
}

/** Every timbre the mix can produce, navy and non-navy alike. */
export const ALL_TIMBRES: readonly ContactTimbre[] = [
  ...Object.values(FACTION_TIMBRE),
  CREATURE_TIMBRE,
  ORDNANCE_TIMBRE,
];
