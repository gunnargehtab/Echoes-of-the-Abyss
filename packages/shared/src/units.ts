/**
 * Prototype unit roster, transcribed from docs/units.md.
 *
 * SIG is a triple (idle / cruise / firing burst) because a unit's loudness is a
 * function of what it is doing, not what it is — that is the whole premise of
 * the Echo Layer.
 *
 * The `hyd` figures are SPEC — authored per unit in docs/units.md (issue #35),
 * alongside the design note there settling that HYD is a flat hull property
 * (Silent Running changes SIG, never hearing) and that the Directorate's
 * listening doctrine is carried by these numbers rather than a special case.
 */

import { Faction, UnitKind } from './types.js';
import { FACTION_COMBAT, FACTION_PRESSURE_BASELINE } from './constants.js';

export interface UnitStats {
  kind: UnitKind;
  name: string;
  /** Acoustic signature when powered but stationary. */
  sigIdle: number;
  /** Acoustic signature at cruise speed. */
  sigCruise: number;
  /** Additive burst while firing. */
  sigFiringBurst: number;
  /** Hydrophone rating — passive listening sensitivity. PROTOTYPE VALUE. */
  hyd: number;
  /** Pressure rating; below this depth the unit takes crush attrition. */
  pressureRating: number;
  maxHp: number;
  /** Metres per second. */
  speed: number;
  /**
   * Hull length in metres.
   *
   * Lives here rather than in the renderer because both sides need to agree:
   * the client draws the silhouette at this length, and the simulation keeps
   * hulls from occupying the same water using half of it as a radius. A hull
   * that looked one size and collided at another would be a bug nobody could
   * see.
   */
  hullLengthM: number;
  cost: number;
  /**
   * Resonance Crystal cost, when the hull is crystal-locked. The Abyssal
   * Submersible is: it is the hull built to live where the crystal is, so it
   * is the one the crystal pays for (docs/economy.md §2, §7).
   */
  crystalCost?: number;
  /**
   * Biomass cost, when the hull is a cohort's — grown rather than built.
   *
   * The Directorate's account (docs/economy.md §2, §6): its cohorts are
   * "cheapest per unit, scaling with the map's health", which is a sentence
   * about a hull priced in the one resource whose yield rises and falls with
   * Drift Health. The third column of a price beside `cost` and
   * `crystalCost`, refused and debited on the same path as the other two and
   * never traded for them — see economy.ts, and docs/economy.md §8.
   *
   * The Chorister is the one hull that carries it (issue #352). The Abyssal
   * Submersible is the crystal-locked deep hull and stays priced as one.
   */
  biomassCost?: number;
  buildTimeS: number;
  /**
   * The one navy allowed to build this hull, when the hull is one navy's.
   *
   * Absent on every generic hull, which is the roster's default and stays it:
   * the Light Scout and the Abyssal Submersible carry a faction in their
   * *names* and no lock in their stats, and the Chorister is the Directorate's
   * by its price rather than by a rule (docs/units.md, design notes).
   *
   * The Clarion is the exception and the first one. Its listed SIG is a *cone*
   * figure and only means anything under the directional term, and that term
   * is gated on the owner being Hadron (docs/systems-echo.md §8's first
   * exclusion — "one navy's doctrine, not physics", `directional.ts`). Another
   * navy's Clarion would emit its cone figure in every direction: the loudest
   * hull in the game with nothing bought for it. That is not a balance
   * concern, it is a stat line that cannot be read, so the lock is the same
   * instrument the four signature structures use and is enforced the same way
   * — server-side in `Match.produce`, mirrored by the command bar.
   */
  faction?: Faction;
  /**
   * Weapon stats.
   *
   * TUNABLE, but **within the time-to-kill bands of docs/systems-combat.md §9**,
   * which are SPEC. The bands fix what a fight feels like — a Corvette falls to
   * another in eight to ten seconds, an anchor does not fall to chip damage —
   * and these numbers are solved from them rather than chosen. There is a test
   * that holds every band, including under the Consortium's Klaxon bonus, which
   * is the constraint that decided the Corvette's figure: at any more than 51,
   * a loud Consortium Corvette kills a Cruiser inside the 25 s floor §9 sets.
   *
   * A damage of 0 means unarmed.
   */
  attackDamage: number;
  attackRangeM: number;
  attackCooldownS: number;
  /**
   * Does this hull carry torpedo tubes? docs/systems-combat.md §5.
   *
   * A stat rather than a list in the ordnance system, because "which hulls can
   * launch" is a roster fact the design bible owns — and because a list kept
   * beside the weapon would be the second place the roster is written down.
   *
   * The Light Scout does not: docs/units.md gives it a sensor suite for a hull
   * and says it "finds things, it does not fight them", and a scout that could
   * one-shot a Corvette from a Tier-2 bearing would be doing both.
   */
  carriesTorpedoes: boolean;
}

/** Half a hull's length: the radius the simulation keeps clear around it. */
export function unitRadiusM(kind: UnitKind): number {
  return UNIT_STATS[kind].hullLengthM / 2;
}

export const UNIT_STATS: Record<UnitKind, UnitStats> = {
  [UnitKind.LightScout]: {
    kind: UnitKind.LightScout,
    name: 'Light Scout',
    sigIdle: 6,
    sigCruise: 12,
    sigFiringBurst: 15,
    hyd: 70,
    pressureRating: 1,
    maxHp: 180,
    speed: 120,
    hullLengthM: 60,
    cost: 50,
    buildTimeS: 12,
    attackDamage: 18,
    attackRangeM: 400,
    attackCooldownS: 1,
    carriesTorpedoes: false,
  },
  [UnitKind.Corvette]: {
    kind: UnitKind.Corvette,
    name: 'Corvette',
    sigIdle: 28,
    sigCruise: 28,
    sigFiringBurst: 25,
    hyd: 50,
    pressureRating: 2,
    maxHp: 420,
    speed: 85,
    hullLengthM: 80,
    cost: 120,
    buildTimeS: 30,
    attackDamage: 50,
    attackRangeM: 550,
    attackCooldownS: 1.2,
    carriesTorpedoes: true,
  },
  [UnitKind.Cruiser]: {
    kind: UnitKind.Cruiser,
    name: 'Cruiser',
    sigIdle: 55,
    sigCruise: 65,
    sigFiringBurst: 30,
    // "Heavy sensors" per docs/units.md — the roster's best listener.
    hyd: 65,
    pressureRating: 2,
    maxHp: 1200,
    speed: 45,
    hullLengthM: 130,
    cost: 420,
    buildTimeS: 90,
    attackDamage: 150,
    attackRangeM: 900,
    attackCooldownS: 2.5,
    carriesTorpedoes: true,
  },
  [UnitKind.AbyssalSubmersible]: {
    kind: UnitKind.AbyssalSubmersible,
    name: 'Abyssal Submersible',
    sigIdle: 22,
    sigCruise: 28,
    sigFiringBurst: 20,
    // Directorate are "The Listeners" — best HYD by a wide margin.
    hyd: 85,
    pressureRating: 3,
    maxHp: 520,
    speed: 60,
    hullLengthM: 95,
    cost: 260,
    crystalCost: 80,
    buildTimeS: 45,
    attackDamage: 80,
    attackRangeM: 650,
    attackCooldownS: 1.8,
    carriesTorpedoes: true,
  },
  [UnitKind.Chorister]: {
    kind: UnitKind.Chorister,
    name: 'Chorister',
    // The floor of the 16-35 band every Directorate hull sits in
    // (docs/habitats-art-brief.md): grown chitin has no engine to speak of.
    // Quiet alone and loud in company — four idling in one Drift cell sum
    // past the ledger's HEALTH_SIG_THRESHOLD (60), so a cohort massed on the
    // ground that pays for it wears that ground. That is docs/economy.md §9's
    // guard-rail written into the hull rather than bolted on beside it.
    sigIdle: 16,
    sigCruise: 24,
    sigFiringBurst: 15,
    // A cohort is a listener first: above the Scout, below the Submersible,
    // and the Cantor's +25 takes it to the 95 cap.
    hyd: 75,
    /**
     * SPEC — docs/units.md: PR-2 on the hull, and the Directorate's PR-3
     * baseline lifts it to 3 for nothing (`effectivePressureRating`).
     *
     * Not 3 on the hull, deliberately. A PR-3 hull at 30 Nodules would sell
     * the Abyssal band to any navy with a rendering contract, and
     * docs/economy.md §7 makes going deep a decision somebody pays for. The
     * baseline is what "born to it" buys the Directorate and nobody else.
     */
    pressureRating: 2,
    maxHp: 200,
    // The slowest combat hull in the roster: "very many, cheap, slow".
    speed: 40,
    // The shortest hull in the roster, and 45 m under DRIFT.TRANSIT_MIN_HULL_M:
    // a Sounder grinds Submersibles and ignores these.
    hullLengthM: 50,
    // The cheapest hull in the game in Nodules — docs/economy.md §6's
    // "cheapest per unit" — and the only one priced in Biomass. Twenty is one
    // Draymaw's rendering at full rate, a third of one through a contract;
    // the faction-blind price and the faction-specific rate are the whole of
    // how the hull is the Directorate's without a lock (docs/units.md,
    // design notes).
    cost: 30,
    biomassCost: 20,
    buildTimeS: 10,
    // Roster arithmetic rather than a §9 band, and ttkBands.test.ts holds it:
    // a Corvette kills one inside the Scout's ≤ 4 s, a Chorister duel lasts
    // as long as a Corvette duel, one alone needs twenty seconds against a
    // Corvette. "Expendable" is a sum.
    attackDamage: 20,
    attackRangeM: 450,
    attackCooldownS: 1,
    carriesTorpedoes: false,
  },
  [UnitKind.Clarion]: {
    kind: UnitKind.Clarion,
    name: 'Clarion',
    /**
     * SPEC — docs/systems-echo.md §8's balance clause, solved rather than
     * chosen. The listed figure is the hull's loudness *in the cone*; over the
     * compass the term takes it to `62 × 0.45 = 27.9`, which is the Corvette's
     * 28. "A Knight hull is an ordinary hull with its loudness moved, not a
     * quiet one" — so the Clarion is the Corvette with its noise aimed, and
     * `units.test.ts` holds the arithmetic against
     * `DIRECTIONAL_COMPASS_AVERAGE` rather than against the number 62.
     *
     * Flat idle-to-cruise for the Corvette's reason: the plant, not the
     * screw, is most of what a hull this size radiates.
     */
    sigIdle: 62,
    sigCruise: 62,
    /**
     * Not 2.2× anything. The Order fights with energy, and §11's class
     * replaces a hull's burst outright rather than scaling it
     * (`firingSigFor`), so the number a Clarion actually discharges at is the
     * faction's and is read from it here rather than transcribed beside it.
     * The 2.2× is about what the *hull* radiates; the weapon is the navy's.
     */
    sigFiringBurst: FACTION_COMBAT.ENERGY.FIRING_SIG,
    /**
     * The Corvette's ears exactly, and deliberately. §8: the term "changes
     * what a Knight emits and never what a Knight hears" — so the whole of
     * what this hull buys is on the emitting side, and the trade is entirely
     * positional.
     */
    hyd: 50,
    /**
     * PR-2, which is the Hadron baseline, so the hull grants nothing.
     * The Order rents depth from the Sounding Spire's +1 (docs/factions.md,
     * "projects access"); a deep Knight hull would buy for 180 nodules what
     * the doctrine charges 750 for.
     */
    pressureRating: 2,
    maxHp: 420,
    // Longer and slower than the Corvette it is scaled against: a finer hull
    // built around a bow array, which is also why it reaches further.
    speed: 75,
    hullLengthM: 90,
    /**
     * Two Clarions cost what three Corvettes cost, which is the choice a
     * Knight commander makes at the yard: numbers, or facing. No crystal —
     * the Order's Resonance goes into the Spire (docs/economy.md §2), and the
     * Abyssal Submersible remains the roster's crystal-locked hull.
     */
    cost: 180,
    buildTimeS: 40,
    faction: Faction.Hadron,
    /**
     * A bow lance: more alpha and a third more reach than a Corvette, on a
     * slower cycle, so sustained damage lands just under it (40 against 41.7).
     * Solved inside docs/systems-combat.md §9's bands exactly as the rest of
     * the roster is, and `ttkBands.test.ts` holds all four: it kills a Light
     * Scout in 3 s, duels another Clarion in 9 s, and needs 28.5 s to bring
     * down a Cruiser alone.
     */
    attackDamage: 60,
    attackRangeM: 700,
    attackCooldownS: 1.5,
    carriesTorpedoes: true,
  },
  [UnitKind.Harvester]: {
    kind: UnitKind.Harvester,
    name: 'Harvester',
    sigIdle: 18,
    // Mining is loud: economy is a noise source by design.
    sigCruise: 40,
    sigFiringBurst: 0,
    hyd: 30,
    /**
     * SPEC — docs/units.md gives the Harvester "PR: 1-2 (variant)", and this
     * has to be the 2.
     *
     * Nodule fields sit at 600 m, which is Mid-Water, which requires PR-2. At
     * PR-1 the standard worker took 4 HP/s of unhealable crush the entire time
     * it stood on the standard working ground, and died after seventy-five
     * seconds of doing its job — so every economy in every match collapsed at
     * about the two-minute mark, on both sides, without anything having
     * happened. docs/economy.md §7 calls Mid-Water "standard refits, standard
     * risk"; a band that eats the hull that works it is neither.
     *
     * PR-2 still leaves the crystal gate exactly where §7 wants it: the
     * Abyssal band is 1,800 m down and needs PR-3, so a Harvester cannot
     * follow the crystal, and going deep stays a decision somebody makes.
     */
    pressureRating: 2,
    maxHp: 300,
    speed: 40,
    hullLengthM: 75,
    cost: 80,
    buildTimeS: 20,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
  },
};

export function statsFor(kind: UnitKind): UnitStats {
  return UNIT_STATS[kind];
}

/**
 * May this navy build this hull?
 *
 * One rule with two readers, for `PRODUCIBLE`'s reason: the server validates
 * production against it and the command bar renders the yard's roster from
 * it, and two copies would eventually disagree about which navy owns which
 * hull. Almost every hull is nobody's — see `UnitStats.faction`.
 */
export function unitAvailableTo(kind: UnitKind, faction: Faction): boolean {
  const locked = UNIT_STATS[kind].faction;
  return locked === undefined || locked === faction;
}

/**
 * The largest radius in the roster, for sizing separation queries.
 *
 * Derived from the roster rather than written down: separation queries a
 * broadphase for neighbours within `ownRadius + this`, so a hull longer than
 * the hardcoded figure would simply not be found by the hulls it was
 * overlapping — a collision bug that reads as an unrelated formation glitch.
 */
export const MAX_UNIT_RADIUS_M =
  Math.max(...Object.values(UNIT_STATS).map((stats) => stats.hullLengthM)) / 2;

/**
 * The Pressure Rating a hull of this kind actually carries for this faction.
 *
 * The hull's own rating or its navy's baseline, whichever is greater
 * (docs/systems-depth.md §3). Every reader of a unit's rating should come
 * through here rather than `statsFor(kind).pressureRating`, which is the
 * roster number and not what the hull in the water has.
 *
 * Aura grants — the Sounding Spire's +1 — are *on top* of this and live in
 * `Pressure.bonus`, because a rented rating has to be able to evaporate and a
 * baseline never does.
 */
export function effectivePressureRating(kind: UnitKind, faction: Faction): number {
  return Math.max(UNIT_STATS[kind].pressureRating, FACTION_PRESSURE_BASELINE[faction]);
}
