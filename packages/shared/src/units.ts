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
import { FACTION_COMBAT, FACTION_PRESSURE_BASELINE, HULL_EFFECTS } from './constants.js';

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
   * Berths the hull's crew occupies on the base (docs/economy.md §10) — the
   * population cap, in tonnage rather than in hulls. SPEC, transcribed from
   * docs/units.md. Counted from the moment the hull is queued.
   */
  berths: number;
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
  /**
   * SIG while the hull's effect runs, for the three hulls whose work is
   * neither moving nor shooting (docs/units.md, the rung's roster): the
   * Tender welding, the Sower seeded, the Cantus singing. Applied by
   * acoustics as a floor over the idle/cruise chain, the way descent is —
   * working never makes an already-louder hull quieter — and the hulls that
   * carry it are the hulls `spawnUnit` gives a `HullEffect` clock.
   */
  sigWorking?: number;
  /**
   * Grown mines aboard, for a hull that carries more than the roster's one —
   * the Spinner (docs/units.md). A magazine the way torpedoes are one: the
   * player's cap still binds, this is what the hull can lay before it has to
   * go home and regrow.
   */
  mineMagazine?: number;
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
    berths: 1,
    // Every gun cycle in the roster is ×1.5 what it was (#463): §9's bands
    // were lengthened by stretching the cooldown and leaving damage-per-shot
    // alone, so every "n cycles" claim in docs/units.md still holds and only
    // the seconds moved. The Scout's own gun is unbanded and simply scaled
    // with the rest, so it did not become relatively deadlier by accident.
    attackDamage: 18,
    attackRangeM: 400,
    attackCooldownS: 1.5,
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
    berths: 2,
    // The centre of §9: a duel of 12-15 s, a Light Scout in ≤ 6 s, and ≥ 37 s
    // on a Cruiser alone — the last of which holds under the Klaxon only at
    // 50 damage or less, which is why the figure is 50 and not 55
    // (ttkBands.test.ts). 1.8 s is 1.2 × 1.5, the #463 stretch.
    attackDamage: 50,
    attackRangeM: 550,
    attackCooldownS: 1.8,
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
    berths: 3,
    // §9: kills a Corvette in ~8 s — three shots, two cycles of 3.75 s.
    attackDamage: 150,
    attackRangeM: 900,
    attackCooldownS: 3.75,
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
    berths: 2,
    attackDamage: 80,
    attackRangeM: 650,
    attackCooldownS: 2.7,
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
    berths: 1,
    // Roster arithmetic rather than a §9 band, and ttkBands.test.ts holds it:
    // a Corvette kills one inside the Scout's ≤ 6 s, a Chorister duel lasts
    // as long as a Corvette duel, one alone needs thirty seconds against a
    // Corvette. "Expendable" is a sum.
    attackDamage: 20,
    attackRangeM: 450,
    attackCooldownS: 1.5,
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
    berths: 2,
    faction: Faction.Hadron,
    /**
     * A bow lance: more alpha and a third more reach than a Corvette, on a
     * slower cycle, so sustained damage lands just under it (26.7 against
     * 27.8). Solved inside docs/systems-combat.md §9's bands exactly as the
     * rest of the roster is, and `ttkBands.test.ts` holds all four: it kills
     * a Light Scout in 4.5 s, duels another Clarion in 13.5 s, and needs
     * 42.75 s to bring down a Cruiser alone.
     */
    attackDamage: 60,
    attackRangeM: 700,
    attackCooldownS: 2.25,
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
    berths: 1,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
  },

  // --- The rung's roster: two hulls a navy (docs/units.md, #461) -----------
  //
  // Every figure below is SPEC, transcribed from the hull's stat block in
  // docs/units.md, "The rung, and two hulls a navy". Hull lengths are the one
  // number the doc does not author and are TUNABLE, sized against the seven
  // hulls above so each reads at a glance beside them.

  [UnitKind.Tender]: {
    kind: UnitKind.Tender,
    name: 'Tender',
    /**
     * SPEC — docs/units.md, Tender: "48 / 55 / — (no weapon). +12 while
     * working". A floating workshop is pumps, welding and hull plate, and a
     * force that is healing is a force that is heard.
     */
    sigIdle: 48,
    sigCruise: 55,
    sigFiringBurst: 0,
    // The doc's "+12" on the idle figure: a Tender welds alongside a hull
    // that has stopped for it, so this is what a working Tender is heard at.
    sigWorking: 48 + 12,
    hyd: 40,
    pressureRating: 2,
    maxHp: 900,
    speed: 45,
    hullLengthM: 85,
    cost: 320,
    buildTimeS: 50,
    berths: 2,
    /**
     * The repair rate is the Klaxon's other half — a navy built to survive
     * being heard needs the thing that makes surviving cumulative — and a
     * Commune Tender would be the quietest repair in the game bolted onto the
     * navy that never stands still to use it (docs/units.md).
     */
    faction: Faction.Bathyarch,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
  },
  [UnitKind.Bulwark]: {
    kind: UnitKind.Bulwark,
    name: 'Bulwark',
    /**
     * SPEC — docs/units.md, Bulwark: "70 / 75 / +30 — the loudest hull in the
     * game, and the Klaxon is never off it": +12% damage while SIG > 60 is a
     * Bulwark's resting state, not a choice.
     */
    sigIdle: 70,
    sigCruise: 75,
    sigFiringBurst: 30,
    hyd: 35,
    pressureRating: 2,
    /**
     * §9: "survives one torpedo, dies to two" is the Cruiser's band; a Bulwark
     * survives three. "Armour that makes surviving the torpedo the plan"
     * (docs/systems-combat.md §11) is this hull's stat line.
     */
    maxHp: 2400,
    // The slowest hull in the roster.
    speed: 30,
    // Longer than the Cruiser it out-weighs: the roster's longest hull, and
    // the one `MAX_UNIT_RADIUS_M` is now sized by.
    hullLengthM: 150,
    cost: 700,
    buildTimeS: 120,
    // A Cruiser and a third, in tonnage, which is what makes a Bulwark line
    // the Consortium's whole grant.
    berths: 4,
    /**
     * "Few, heavy, tough" is the navy, and a hull that is loud by construction
     * in a navy that is punished for being loud would be a Corvette with a
     * worse price (docs/units.md).
     */
    faction: Faction.Bathyarch,
    /**
     * "220 damage at 800 m, 6.0 s cycle (36.7/s)". Outranges a Sentinel
     * Turret's 700 m, which is the point. `ttkBands.test.ts` holds the doc's
     * bands: a Corvette in two cycles, a Bastion alone in ~135 s, and it dies
     * to Corvette guns in ≥ 82 s — an anchor that does not fall to chip
     * damage, §9's rule for the Cruiser applied twice over.
     */
    attackDamage: 220,
    attackRangeM: 800,
    attackCooldownS: 6,
    // The torpedo-eater carries tubes of its own, as the Cruiser does.
    carriesTorpedoes: true,
  },
  [UnitKind.Spinner]: {
    kind: UnitKind.Spinner,
    name: 'Spinner',
    /**
     * SPEC — docs/units.md, Spinner: "8 / 14 / — no weapon; a Spinner is
     * quieter running than a Light Scout idling". Laying is silent too: the
     * mine is grown aboard and dropped, not built in the water.
     */
    sigIdle: 8,
    sigCruise: 14,
    sigFiringBurst: 0,
    hyd: 55,
    pressureRating: 1,
    maxHp: 260,
    speed: 80,
    hullLengthM: 55,
    cost: 150,
    buildTimeS: 25,
    berths: 1,
    /**
     * The Commune's mine cap (18 against 12) is the doctrine and this hull is
     * the way to reach it; the Consortium with Spinners would be the loud navy
     * laying the quiet navy's wall (docs/units.md).
     */
    faction: Faction.Pelagia,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
    mineMagazine: HULL_EFFECTS.SPINNER.MAGAZINE,
  },
  [UnitKind.Sower]: {
    kind: UnitKind.Sower,
    name: 'Sower',
    /**
     * SPEC — docs/units.md, Sower: "20 / 26 / — (no weapon). 45 while
     * seeding" — the bloom is a chemical roar, and a Commune force that has
     * made the deep habitable has told the map where.
     */
    sigIdle: 20,
    sigCruise: 26,
    sigFiringBurst: 0,
    sigWorking: 45,
    hyd: 60,
    // The only Commune hull above PR-1, grown for the water it plants.
    pressureRating: 2,
    maxHp: 500,
    speed: 55,
    hullLengthM: 90,
    /**
     * Crystal-locked like the Submersible, for the same reason: it is the
     * hull built to live where the crystal is (docs/economy.md §8).
     */
    cost: 380,
    crystalCost: 80,
    buildTimeS: 70,
    berths: 2,
    /**
     * The entry is a bloom, and the Directorate would use it to be somewhere
     * it was already born to be (docs/units.md).
     */
    faction: Faction.Pelagia,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
  },
  [UnitKind.Precentor]: {
    kind: UnitKind.Precentor,
    name: 'Precentor',
    // SPEC — docs/units.md, Precentor: "12 / 18 / — (no weapon)".
    sigIdle: 12,
    sigCruise: 18,
    sigFiringBurst: 0,
    // The cap, mobile: the best ears in the game, on a hull that is only
    // ears. Its dome is HULL_EFFECTS.PRECENTOR, applied by the auras system.
    hyd: 95,
    /**
     * PR-2 on the hull, the Directorate's baseline lifting it to 3 — the
     * Chorister's rule, and for the Chorister's reason.
     */
    pressureRating: 2,
    maxHp: 220,
    speed: 50,
    hullLengthM: 60,
    // Grown: the cohort programme's account beside the Nodules.
    cost: 200,
    biomassCost: 30,
    buildTimeS: 30,
    berths: 1,
    /**
     * A 95-HYD hull is the Listening made a ship; the Consortium with
     * Precentors would hear what its doctrine says it does not need to
     * (docs/units.md).
     */
    faction: Faction.Directorate,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
  },
  [UnitKind.Dredge]: {
    kind: UnitKind.Dredge,
    name: 'Dredge',
    /**
     * SPEC — docs/units.md, Dredge: "40 / 52 / +25 — loud for a Directorate
     * hull, on purpose: a Dredge at the field is the tell that the field is
     * held".
     */
    sigIdle: 40,
    sigCruise: 52,
    sigFiringBurst: 25,
    hyd: 70,
    // The only PR-4 entry in the roster. Nothing below the Abyssal floor
    // crushes it.
    pressureRating: 4,
    maxHp: 1400,
    speed: 35,
    hullLengthM: 120,
    // Three accounts: the first hull priced in all of them.
    cost: 450,
    biomassCost: 60,
    crystalCost: 40,
    buildTimeS: 80,
    berths: 3,
    /**
     * A PR-4 hull sold to any navy with a rendering contract would sell the
     * bottom of the map, and docs/economy.md §7 makes the deep a thing
     * somebody pays for (docs/units.md).
     */
    faction: Faction.Directorate,
    /**
     * "120 damage at 650 m, 3.0 s cycle (40/s)". `ttkBands.test.ts` holds the
     * doc's bands: a Corvette in ~12 s and a Cruiser in ~30 s; it dies to
     * Corvette guns in ~50 s.
     */
    attackDamage: 120,
    attackRangeM: 650,
    attackCooldownS: 3,
    carriesTorpedoes: true,
  },
  [UnitKind.Cantus]: {
    kind: UnitKind.Cantus,
    name: 'Cantus',
    /**
     * SPEC — docs/units.md, Cantus: "10 / 10 / — moving; 80 while singing —
     * the Spire's figure, for the Spire's reason: rented depth is never
     * quiet". The 80 is emitted in every quarter — a resonance node is
     * omnidirectional by construction, so a singing Cantus is the one Knight
     * hull `hasBow` refuses the directional term to (docs/systems-echo.md §8,
     * the ping's exemption). Its listed idle is therefore a plain figure and
     * not a cone one, unlike the Clarion's and the Reciter's.
     */
    sigIdle: 10,
    sigCruise: 10,
    sigFiringBurst: 0,
    sigWorking: 80,
    hyd: 50,
    pressureRating: 2,
    maxHp: 600,
    speed: 55,
    hullLengthM: 80,
    /**
     * A Spire's grant at a third of the price and none of the crystal, so two
     * Clarions and a Cantus can raid the field in the opening — the Order's
     * early tempo tool (docs/units.md; docs/economy.md §9).
     */
    cost: 400,
    buildTimeS: 60,
    berths: 2,
    /**
     * The entry is the Spire's term on a hull, and the Spire's term is one
     * navy's crystal (docs/units.md).
     */
    faction: Faction.Hadron,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
  },
  [UnitKind.Reciter]: {
    kind: UnitKind.Reciter,
    name: 'Reciter',
    /**
     * SPEC — docs/units.md, Reciter: "90 / 90 / +10 — cone figures, like the
     * Clarion's: 90 ahead, 31.5 on the beam, 9 astern, 40.5 over the compass".
     * `units.test.ts` holds the compass average against
     * `DIRECTIONAL_COMPASS_AVERAGE` rather than against 40.5, as it does the
     * Clarion's: louder than a Corvette and quieter than a Cruiser on average,
     * and the loudest thing on the map from the front.
     */
    sigIdle: 90,
    sigCruise: 90,
    // The Clarion's reason: the Order fights with energy, and the discharge
    // figure is the navy's (`firingSigFor`), read from it rather than beside
    // it.
    sigFiringBurst: FACTION_COMBAT.ENERGY.FIRING_SIG,
    hyd: 50,
    pressureRating: 2,
    // A glass cannon: the whole hull is the lance.
    maxHp: 300,
    speed: 70,
    hullLengthM: 100,
    cost: 260,
    buildTimeS: 45,
    berths: 2,
    /**
     * The Clarion's reason exactly: a cone figure is unreadable without the
     * term, and another navy's Reciter would emit 90 in every direction
     * (docs/units.md).
     */
    faction: Faction.Hadron,
    /**
     * "140 damage at 1,000 m, 4.5 s cycle (31.1/s) — outranges the Cruiser's
     * 900." `ttkBands.test.ts` holds the doc's bands: a Corvette in ~14 s, a
     * Light Scout in two cycles, and it dies to a Corvette in ~11 s if the
     * Corvette gets there. The trade is the whole hull.
     */
    attackDamage: 140,
    attackRangeM: 1000,
    attackCooldownS: 4.5,
    // No tubes. The hull is the lance and nothing else: a 300 HP hull that
    // also carried two Corvette-killing torpedoes would be an ambush kit on
    // the navy whose doctrine is the fight it arranged, and §5's magazine
    // stays with the hulls built to close.
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
 * hull. The seven generic hulls are nobody's; the rung's eight are each one
 * navy's — see `UnitStats.faction`.
 */
export function unitAvailableTo(kind: UnitKind, faction: Faction): boolean {
  const locked = UNIT_STATS[kind].faction;
  return locked === undefined || locked === faction;
}

/**
 * The escort each navy opens with, beside its Harvester. TUNABLE — the docs
 * fix that the opening kit is self-sufficient (docs/economy.md §8), not what
 * sails in it.
 *
 * Keyed per navy so that a navy's own scout and line hull can take the
 * commons' place in its opening the day they exist, without
 * `Match.spawnStartingBase` learning anything new (docs/roster-plan.md §4,
 * wave 0). Identical across the four today, and deliberately: wave 0's gate
 * is a baseline that has not moved, and the Knights' Clarion swap is wave 5's
 * change to make, when the other navies have a line hull to swap in too.
 * Every entry must pass `unitAvailableTo` for its own navy; the shared tests
 * hold that, so a kit can never open with a hull its yard would refuse.
 */
export const OPENING_ESCORT: Record<Faction, readonly UnitKind[]> = {
  [Faction.Bathyarch]: [UnitKind.LightScout, UnitKind.Corvette, UnitKind.Corvette],
  [Faction.Pelagia]: [UnitKind.LightScout, UnitKind.Corvette, UnitKind.Corvette],
  [Faction.Directorate]: [UnitKind.LightScout, UnitKind.Corvette, UnitKind.Corvette],
  [Faction.Hadron]: [UnitKind.LightScout, UnitKind.Corvette, UnitKind.Corvette],
};

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
