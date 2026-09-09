/**
 * The commander saves for what the rung was bought *for* (#518).
 *
 * `#491` taught this commander to save for the Slipway and nothing taught it to
 * save for the hulls the Slipway builds, which is the whole of #518. The
 * measurement that found it is in the balance report — hulls built beside hulls
 * lost, structures commissioned beside neither — and what it said was not what
 * the issue assumed: the rung *is* reached, in one duel in four and in nine
 * Directorate matches of ten, and no hull behind it is ever built anyway. The
 * bank simply never holds the price at the moment the branch looks, because the
 * composition cycle spends every purse it is handed on the next Corvette.
 *
 * So a hull behind the rung is saved for, on the transport's duty cycle rather
 * than the Sower's unconditional hold. What is asserted here is that cycle's
 * two halves, because either one alone is a different and worse commander:
 *
 *   - it **holds** — an observation that cannot pay for the rung's hull buys
 *     nothing at all, and the bank the yards would have emptied climbs;
 *   - it **lets go** — the hold is a window, not a strike, so the army still
 *     grows while the saving happens. An unconditional hold trades the Bulwark
 *     for the fight the Bulwark was for, and a duel is decided in exactly the
 *     minutes the yard finishes in.
 *
 * And the guards both halves sit behind. A gap a window cannot close is not
 * worth opening: below half the price the commander keeps buying its line, or
 * the hold becomes a standing tax on a hull it was never going to reach.
 *
 * That floor is read against **every** account since #520, and used to be read
 * against nodules alone. The old rule struck any bid short of crystal or
 * Biomass out of the arbitration entirely, on the argument that those two
 * arrived because a hauler went and got them rather than because anyone
 * waited — true of the accounts as they then were, and true of neither since
 * the crystal shift (#528) and the flora economy (#547) made both of them
 * incomes. What it cost was the one hull priced in all three: the Dredge bid at
 * 4,584 observations across three matches and won the hold at none of them,
 * so nothing held its nodules either and the bank peaked at 360 against a 450
 * price. Three tests hold the parts of that: the floor still refuses an account
 * at zero, it now waits in whichever account is short, and a hold in a narrow
 * account is not spent by a cheaper hull while it waits.
 *
 * And one rule above nearest-first, for the same issue: the navy's heavy wins
 * the arbitration once it is nearly affordable in all three accounts, because
 * the 600-nodule yard in front of it is the navy already saying which hull it
 * wants — the ordnance and siege hulls beside it are cheaper and opportunistic,
 * and a queue ordered purely by price never empties in front of them.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  PRODUCIBLE,
  ResolutionTier,
  ResourceKind,
  StructureKind,
  UnitKind,
  priceOf,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';

const SEED = 0x51;

/**
 * Sim ticks between two observations this commander actually acts on.
 *
 * The Echo Layer runs at 5 Hz and a Veteran thinks every third pass, so a
 * snapshot handed to `observe` has to advance by an Echo tick each time or the
 * commander is being asked the same question over and over at one instant.
 */
const ECHO_TICKS = 12;

function briefing(faction: Faction): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, faction);
  match.addPlayer(1, faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch);
  return briefingFor(match, 0, faction, AiDifficulty.Veteran);
}

/** The navy's heavy — its composition's Slipway hull, as the commander finds it. */
function heavyOf(faction: Faction): UnitKind {
  const rung = PRODUCIBLE[StructureKind.Slipway]!;
  const heavy = DOCTRINE[faction].composition.find((kind) => rung.includes(kind));
  assert.ok(heavy !== undefined, `${Faction[faction]} has a hull behind the rung`);
  return heavy;
}

function structure(
  id: number,
  kind: StructureKind,
  at: { x: number; y: number }
): EchoSnapshot['structures'][number] {
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: 2500,
    maxHp: 2500,
    sig: 30,
    buildProgress: 1,
    queue: [],
    queueProgress: 0,
  };
}

function hull(
  id: number,
  kind: UnitKind,
  at: { x: number; y: number }
): EchoSnapshot['units'][number] {
  const stats = statsFor(kind);
  return {
    id,
    kind,
    engineOff: false,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigIdle,
    silentRunning: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...(kind === UnitKind.Harvester ? { cargo: 0, throttle: HarvestThrottle.Standard } : {}),
  };
}

/**
 * A navy with nothing else left to want.
 *
 * Every other want of `commandProduction` bids into the same purse as the
 * rung's, and any one of them still wanting something would answer this test's
 * question for it. So the economy is staffed to the doctrine's target, the
 * navy's own scout, ordnance hull and siege hull are all in the water, and the
 * line is short of the army target by enough that the composition cycle would
 * happily buy the next Corvette if it were allowed to.
 *
 * The siege hull joined this list with #518. It has been a want since wave 4
 * (#508), but under the queue that arbitration replaced it sat *behind* the
 * heavy and was never reached — so a fixture that left it out happened to
 * measure the right thing for the wrong reason, and stopped the moment every
 * want was read on every observation.
 */
function force(brief: AiBriefing): EchoSnapshot['units'] {
  const doctrine = DOCTRINE[brief.faction];
  const home = brief.spawns[brief.slot]!;
  const at = (i: number): { x: number; y: number } => ({ x: home.x + i * 60, y: home.y });
  const roster: UnitKind[] = [
    ...Array.from<UnitKind>({ length: doctrine.harvesterTarget }).fill(UnitKind.Harvester),
    OWN_SCOUT[brief.faction],
    OWN_ORDNANCE[brief.faction],
    OWN_SIEGE[brief.faction],
    // Two, against an army target of `attackAtArmySize * patience + 2`: short
    // enough that the composition cycle is still buying, which is the thing
    // the hold has to be seen to interrupt.
    UnitKind.Corvette,
    UnitKind.Corvette,
  ];
  return roster.map((kind, i) => hull(i + 1, kind, at(i)));
}

/**
 * The scout, the ordnance hull and the siege hull each navy buys by a want of
 * its own.
 *
 * Restated from the roster rather than imported from the commander's private
 * tables, so this test asserts the roster's shape rather than that a table
 * equals itself: each navy's own scout is the one it alone can build at the
 * Foundry, and its ordnance hull the one it alone can build with a magazine.
 */
const OWN_SCOUT: Record<Faction, UnitKind> = {
  [Faction.Bathyarch]: UnitKind.Beacon,
  [Faction.Pelagia]: UnitKind.Glider,
  [Faction.Directorate]: UnitKind.Acolyte,
  [Faction.Hadron]: UnitKind.Herald,
};
const OWN_ORDNANCE: Record<Faction, UnitKind> = {
  [Faction.Bathyarch]: UnitKind.Broadside,
  [Faction.Pelagia]: UnitKind.Weaver,
  [Faction.Directorate]: UnitKind.Thurible,
  [Faction.Hadron]: UnitKind.Lance,
};
const OWN_SIEGE: Record<Faction, UnitKind> = {
  [Faction.Bathyarch]: UnitKind.Furnace,
  [Faction.Pelagia]: UnitKind.Blight,
  [Faction.Directorate]: UnitKind.Lure,
  [Faction.Hadron]: UnitKind.Tocsin,
};

function snapshot(
  brief: AiBriefing,
  tick: number,
  overrides: Partial<EchoSnapshot> = {}
): EchoSnapshot {
  const home = brief.spawns[brief.slot]!;
  return {
    tick,
    ordnance: [],
    units: force(brief),
    structures: [
      structure(20, StructureKind.Bastion, home),
      structure(21, StructureKind.Foundry, { x: home.x + 200, y: home.y }),
      structure(22, StructureKind.Refinery, { x: home.x - 200, y: home.y }),
    ],
    contacts: [],
    peakSig: 30,
    berths: { used: 0, granted: 40 },
    refits: [],
    nodules: 0,
    crystal: 0,
    biomass: 0,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 12, demand: 4, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
    ...overrides,
  };
}

/** Hulls a commander queues over `seconds` of standing still with this purse. */
function hullsBoughtOver(
  brief: AiBriefing,
  seconds: number,
  overrides: Partial<EchoSnapshot>
): UnitKind[] {
  const commander = new AiCommander(brief);
  const bought: UnitKind[] = [];
  const observations = Math.round((seconds * 5) / 1); // the Echo Layer runs at 5 Hz
  for (let i = 0; i < observations; i++) {
    for (const command of commander.observe(snapshot(brief, 6000 + i * ECHO_TICKS, overrides))) {
      if (command.kind === 'produce') bought.push(command.unit);
    }
  }
  return bought;
}

/**
 * The same, with a bank that climbs the way an economy fills one.
 *
 * `hullsBoughtOver` hands the commander the same purse at every observation,
 * which answers "does it hold?" and cannot answer "what does it hold *for*?" —
 * a hold that never closes buys nothing whichever want won it. So this variant
 * adds a fixed income and lets the holds close, and what a run returns is the
 * order the navy actually reached its wants in.
 *
 * Purchases are not debited, because the fixture's units and queues do not
 * change either: this measures which hull the commander reaches for first, not
 * how many of them an economy could pay for.
 */
function hullsBoughtWhileEarning(
  brief: AiBriefing,
  seconds: number,
  overrides: Partial<EchoSnapshot> & { nodules: number },
  nodulesPerObservation: number
): UnitKind[] {
  const commander = new AiCommander(brief);
  const bought: UnitKind[] = [];
  const observations = seconds * 5;
  for (let i = 0; i < observations; i++) {
    const earned = { ...overrides, nodules: overrides.nodules + i * nodulesPerObservation };
    for (const command of commander.observe(snapshot(brief, 6000 + i * ECHO_TICKS, earned))) {
      if (command.kind === 'produce') bought.push(command.unit);
    }
  }
  return bought;
}

describe('the commander saves for the hull the rung was bought for', () => {
  const consortium = Faction.Bathyarch;

  it('reaches a want the queue used to hide, and takes the nearest of them', () => {
    // The fix #518's fourth cause needed, in one observation.
    //
    // A Consortium with the rung standing, no ordnance hull and no siege hull,
    // and 380 nodules: exactly the Furnace's price and twenty short of the
    // Broadside's. Both wants are *reachable* — each has more than half its
    // price in the bank — so under the queue this replaced, the ordnance want
    // came first, held the purse for its Broadside, and returned. The siege
    // want three lines below it was never read, and nothing was bought, on this
    // observation or on any other for the next two minutes.
    //
    // Arbitrated, the nearer bid wins and the nearer bid is affordable, so the
    // hull is simply bought. That is the whole change: not a new hold, but
    // every want being asked before one of them is chosen.
    const brief = briefing(consortium);
    const home = brief.spawns[brief.slot]!;
    const at = (i: number): { x: number; y: number } => ({ x: home.x + i * 60, y: home.y });
    const ordnance = OWN_ORDNANCE[consortium];
    const siege = OWN_SIEGE[consortium];
    assert.ok(
      priceOf(statsFor(siege)).nodules < priceOf(statsFor(ordnance)).nodules,
      'the premise: the siege hull is the nearer of the two'
    );

    // The economy staffed and the line short, as `force` builds it — but
    // without the two hulls this test is about.
    const doctrine = DOCTRINE[consortium];
    const roster: UnitKind[] = [
      ...Array.from<UnitKind>({ length: doctrine.harvesterTarget }).fill(UnitKind.Harvester),
      OWN_SCOUT[consortium],
      UnitKind.Corvette,
      UnitKind.Corvette,
    ];
    const base = snapshot(brief, 6000);
    const wanted = new AiCommander(brief).observe(
      snapshot(brief, 6000, {
        units: roster.map((kind, i) => hull(i + 1, kind, at(i))),
        structures: [
          ...base.structures,
          structure(30, StructureKind.Slipway, { x: home.x - 400, y: home.y }),
        ],
        nodules: priceOf(statsFor(siege)).nodules,
      })
    );

    const produced = wanted.filter((c) => c.kind === 'produce');
    assert.deepEqual(
      produced.map((c) => (c as { unit: UnitKind }).unit),
      [siege],
      'the want behind the holder is reached, and it is what the purse buys'
    );
  });

  it('buys its heavy the moment the yard and the price are both there', () => {
    const brief = briefing(consortium);
    const heavy = heavyOf(consortium);
    const home = brief.spawns[brief.slot]!;
    const yard = structure(30, StructureKind.Slipway, { x: home.x - 400, y: home.y });

    const wanted = new AiCommander(brief).observe(
      snapshot(brief, 6000, {
        structures: [...snapshot(brief, 6000).structures, yard],
        nodules: priceOf(statsFor(heavy)).nodules,
      })
    );
    assert.ok(
      wanted.some((c) => c.kind === 'produce' && c.unit === heavy),
      `a Consortium with a Slipway and ${priceOf(statsFor(heavy)).nodules} nodules wants a Bulwark`
    );
  });

  it('holds the purse rather than letting the cycle spend it, and does not hold forever', () => {
    // The duty cycle, both halves, against the same commander at the same
    // purse and the same yard. Two thirds of a Bulwark is more than four
    // Corvettes, so a commander with no saving rule spends this bank as fast as
    // it is handed it — which is exactly what the six duels measured.
    //
    // The control is the *want* satisfied rather than the yard removed, which
    // is the difference between measuring this rule and measuring #491's. Take
    // the Slipway away and the commander saves 600 nodules for the yard
    // instead, buys nothing at all, and the two columns agree for opposite
    // reasons. So the control keeps the yard and puts the heavy on its line.
    const brief = briefing(consortium);
    const heavy = heavyOf(consortium);
    const home = brief.spawns[brief.slot]!;
    const yard = structure(30, StructureKind.Slipway, { x: home.x - 400, y: home.y });
    const base = snapshot(brief, 0);
    const purse = Math.floor(priceOf(statsFor(heavy)).nodules * 0.66);
    const minutes = 10;

    const withRung = hullsBoughtOver(brief, minutes * 60, {
      structures: [...base.structures, yard],
      nodules: purse,
    });
    const satisfied = hullsBoughtOver(brief, minutes * 60, {
      structures: [...base.structures, { ...yard, queue: [heavy] }],
      nodules: purse,
    });

    assert.ok(
      satisfied.length > 0,
      'the control spends: a navy with its heavy on the line has nothing to save for'
    );
    assert.ok(
      withRung.length < satisfied.length / 2,
      `holding buys back most of the bank: ${withRung.length} hulls against ${satisfied.length}`
    );
    assert.ok(
      withRung.length > 0,
      'and it is a window, not a strike — the army still grows while it saves'
    );
    assert.ok(
      !withRung.includes(heavy),
      'the purse never reaches the price here, so the hull is never actually bought'
    );
  });

  it('does not hold from a bank a window could not finish from', () => {
    // The gate that keeps the rule from being a standing tax. A Consortium
    // whose Bulwark is four Corvettes away and whose want never closes would
    // hold, buy one hull, and hold again for the rest of the match, paying for
    // a hull it was not going to reach with the line it needed instead.
    //
    // Same commander, same yard, same want: only the bank differs, and two
    // fifths of the price is not "nearly there" — the rule's floor is half.
    //
    // Two fifths rather than the one fifth this test used to hold, because a
    // fifth of a 700 nodule Bulwark is 140 and the Consortium's line hull is a
    // 170 nodule Caisson since #509. At a fifth the control bought *nothing*,
    // and a test that cannot afford the thing it is measuring the purchase of
    // measures poverty rather than policy. The bank has to sit under the
    // rule's floor and over the price of what the navy would otherwise buy;
    // this is the band between them.
    const brief = briefing(consortium);
    const heavy = heavyOf(consortium);
    const home = brief.spawns[brief.slot]!;
    const yard = structure(30, StructureKind.Slipway, { x: home.x - 400, y: home.y });
    const base = snapshot(brief, 0);
    const price = priceOf(statsFor(heavy)).nodules;

    const nearly = hullsBoughtOver(brief, 600, {
      structures: [...base.structures, yard],
      nodules: Math.floor(price * 0.66),
    });
    const nowhereNear = hullsBoughtOver(brief, 600, {
      structures: [...base.structures, yard],
      nodules: Math.floor(price * 0.4),
    });

    assert.ok(
      nowhereNear.length > nearly.length * 2,
      `a navy nowhere near the price keeps building: ${nowhereNear.length} hulls ` +
        `against ${nearly.length} for one that is nearly there`
    );
  });

  it('does not wait for an account waiting cannot fill', () => {
    // The Dredge is priced in crystal and Biomass as well as nodules, and an
    // account at *zero* is not a gap a window closes — it is
    // `commandConstruction`'s Spore Veil circle one deck down: 450 nodules held
    // against a price the wait will never deliver, for the rest of the match.
    //
    // Until #520 that was written as a blanket rule, and the blanket was the
    // bug: any shortfall in crystal or Biomass struck the bid out of the
    // arbitration entirely, so the one hull in the roster priced in all three
    // accounts could never be saved for in any of them. The floor is what
    // separates the two cases now, and this test holds the half of it that did
    // not change — the test below holds the half that did.
    const directorate = Faction.Directorate;
    const brief = briefing(directorate);
    const heavy = heavyOf(directorate);
    const price = priceOf(statsFor(heavy));
    assert.ok(price.biomass > 0, 'the Directorate’s heavy is priced in Biomass');

    const home = brief.spawns[brief.slot]!;
    const yard = structure(30, StructureKind.Slipway, { x: home.x - 400, y: home.y });
    const base = snapshot(brief, 0);
    const bought = hullsBoughtOver(brief, 120, {
      structures: [...base.structures, yard],
      nodules: price.nodules,
      crystal: price.crystal,
      biomass: 0,
    });

    assert.ok(
      bought.length > 0,
      'a navy short of Biomass keeps building rather than standing still for it'
    );
    assert.ok(!bought.includes(heavy), 'and it does not pretend it can afford the hull');
  });

  it('waits in whichever account the hull is short of, not only in nodules', () => {
    // The other half of the floor, and the whole of #520. A Directorate with
    // every nodule and every crystal the Dredge is priced at, and half its
    // Biomass, is a navy one account away from the hull its yard exists to
    // build — and it used to keep buying Corvettes, because the arbitration
    // could only ever wait for nodules.
    //
    // Measured on seeds 4000-4002 before this changed: the Dredge bid at 4,584
    // observations, two thirds of the match with a Slipway standing, and won
    // the hold at none of them. Its Biomass sat at a median of 16 against the
    // 60 it is priced at, because the cheaper Biomass hulls spent the account
    // the instant it could pay for one of them.
    const directorate = Faction.Directorate;
    const brief = briefing(directorate);
    const heavy = heavyOf(directorate);
    const price = priceOf(statsFor(heavy));
    const home = brief.spawns[brief.slot]!;
    const yard = structure(30, StructureKind.Slipway, { x: home.x - 400, y: home.y });
    const base = snapshot(brief, 0);
    const banked = {
      structures: [...base.structures, yard],
      nodules: price.nodules,
      crystal: price.crystal,
    };

    const halfway = hullsBoughtOver(brief, 60, {
      ...banked,
      biomass: Math.ceil(price.biomass * 0.5),
    });
    const empty = hullsBoughtOver(brief, 60, { ...banked, biomass: 0 });

    assert.ok(empty.length > 0, 'the control spends: an empty account is not worth waiting on');
    assert.ok(
      halfway.length < empty.length / 2,
      `half a Biomass price is a gap worth holding for: ${halfway.length} hulls bought ` +
        `against ${empty.length} for the same navy with none of it`
    );
  });

  /**
   * A Directorate one rung hull short of two of them, with a bank that climbs.
   *
   * The ordnance hull is left out so both wants are live, and it is the cheaper
   * of the two — 300 nodules against the heavy's 450 — so nearest-first reaches
   * it first and a fixture whose units never change would go on reaching it
   * first for the rest of the match. The bank starts between the heavy's floor
   * and the ordnance hull's price, so at the opening observation neither is
   * affordable and both bid.
   *
   * Half a nodule an observation is 150 a minute, under every navy's measured
   * income, so the bank climbs past both prices inside the run without
   * outrunning the window that is meant to close on it.
   *
   * Two Corvettes stand in for the ordnance hull rather than the roster simply
   * being one hull shorter: the ordnance *want* is gated on the escort, the
   * Directorate's siege hull carries no gun and so is not counted toward one,
   * and a fixture under that gate would answer both of these tests with "the
   * hull was never wanted" instead of with the rule under measurement.
   */
  function directorateShortOfBoth(satisfied: readonly UnitKind[] = []): {
    brief: AiBriefing;
    heavy: UnitKind;
    ordnance: UnitKind;
    bought: UnitKind[];
  } {
    const directorate = Faction.Directorate;
    const brief = briefing(directorate);
    const heavy = heavyOf(directorate);
    const ordnance = OWN_ORDNANCE[directorate];
    const price = priceOf(statsFor(heavy));
    const home = brief.spawns[brief.slot]!;
    const yard = structure(30, StructureKind.Slipway, { x: home.x - 400, y: home.y });
    const base = snapshot(brief, 0);
    const extra = satisfied.map((kind, i) => hull(90 + i, kind, { x: home.x, y: home.y + 120 }));

    const bought = hullsBoughtWhileEarning(
      brief,
      180,
      {
        structures: [...base.structures, yard],
        units: [
          ...base.units.filter((u) => u.kind !== ordnance),
          hull(88, UnitKind.Corvette, { x: home.x, y: home.y - 120 }),
          hull(89, UnitKind.Corvette, { x: home.x, y: home.y - 180 }),
          ...extra,
        ],
        nodules: Math.round(price.nodules * 0.6),
        crystal: price.crystal,
        biomass: price.biomass,
      },
      0.5
    );
    return { brief, heavy, ordnance, bought };
  }

  it('does not let a cheaper hull spend the account it is holding', () => {
    // `holdPurse` runs at the foot of the want list, so the hold it sets is not
    // read until the next observation — by which time the wants ahead of it
    // have bought on sight. In nodules that costs nothing, because a hold that
    // fails to close simply reopens. In Biomass it is the whole failure: the
    // Directorate's ordnance hull is priced at 40 of the account its heavy needs
    // 60 of, out of one bank, and it is wanted first.
    //
    // The control is the heavy already in the water rather than the yard taken
    // away: with nothing to hold for, the same navy at the same bank buys the
    // same ordnance hull the moment its nodules reach the price.
    const held = directorateShortOfBoth();
    const nothingToHold = directorateShortOfBoth([held.heavy]);
    const name = (kind: UnitKind | undefined): string =>
      kind === undefined ? 'nothing' : statsFor(kind).name;

    assert.equal(
      name(nothingToHold.bought[0]),
      name(nothingToHold.ordnance),
      'the control reaches it first: a navy with its heavy in the water holds nothing back, ' +
        'and the ordnance hull is the cheaper of the two'
    );
    assert.equal(
      name(held.bought[0]),
      name(held.heavy),
      'and a navy saving for its heavy does not let the cheaper hull spend the Biomass first'
    );
  });

  it('finishes what the yard was bought for, rather than the nearest thing to it', () => {
    // Nearest-first serves every want eventually only where the wants are of
    // equal standing, and the navy's heavy is not: the Slipway in front of it
    // cost 600 nodules and a met harvester target, and the ordnance hull beside
    // it is both cheaper and opportunistic. So the queue in front of the heavy
    // never empties — measured on seeds 4000-4002, the Dredge cleared the
    // floors five times in three matches and lost all five to a Lure 170
    // nodules cheaper, which then spent the bank it had been waiting on.
    const { heavy, bought } = directorateShortOfBoth();

    assert.ok(
      bought.includes(heavy),
      `the navy reaches the hull its yard was bought for: ${[...new Set(bought)]
        .map((kind) => statsFor(kind).name)
        .join(', ')}`
    );
  });

  it('has a rung hull for every navy, so no navy is left with nothing to save for', () => {
    // The invariant docs/roster-plan.md §3 states in words — "every navy has a
    // hull at each rung" — read from the side the commander reads it from. A
    // navy whose composition named no Slipway hull would silently opt out of
    // everything above, which is the failure #518 was opened about in the
    // first place.
    for (const faction of [
      Faction.Bathyarch,
      Faction.Pelagia,
      Faction.Directorate,
      Faction.Hadron,
    ]) {
      const heavy = heavyOf(faction);
      assert.ok(
        PRODUCIBLE[StructureKind.Slipway]!.includes(heavy),
        `${Faction[faction]}'s ${statsFor(heavy).name} is built behind the rung`
      );
    }
  });

  it('leaves the crystal field alone — this is a nodule rule', () => {
    // A guard on the test above rather than on the commander: the crystal run
    // is what fills the accounts the hold refuses to wait for, and a change
    // here that quietly stopped it would make the Biomass assertion pass for
    // the wrong reason.
    const brief = briefing(Faction.Directorate);
    assert.ok(
      brief.nodes.some((n) => n.kind === ResourceKind.ResonanceCrystal),
      'the default map still has a crystal field for `commandCrystal` to raid'
    );
  });
});

/**
 * The same saving machinery, one tier down — the composition itself (#531).
 *
 * #518 gave every *want* a bid and one arbitrator to pick between them, and
 * left the composition cycle exactly as it was: it buys whatever is affordable
 * at the instant it is asked, and its rotation falls through to the doctrine's
 * next entry rather than waiting. The fall-through is the deadlock guard the
 * cycle needs and cannot lose. On a doctrine that carries a cheap hull it was
 * also a leak — the fall-through spent the bank, so the bank never climbed, so
 * the dearer entry was never affordable at any instant, for the whole match.
 * Measured before the bid existed, over three matches on seeds 4000–4002: the
 * Knights' 420-nodule Cruiser was the cycle's first choice 986 times and was
 * bought **zero**; the Commune wanted its 105-nodule Reed 815 times, bought
 * zero, and spent the difference on 50-nodule Light Scouts.
 *
 * So the cycle's first choice bids like every other want, and what is asserted
 * here is the duty cycle's two halves again — it holds, and it lets go — plus
 * the guard that keeps a hold from becoming a standing tax: below half the
 * price a navy is not saving, it is idle, and it should buy the hull it can
 * actually pay for.
 *
 * The Commune is the navy this reads on, because its composition is the one
 * that carries both ends: a 105-nodule Reed it is meant to field and a
 * 50-nodule Light Scout underneath it. And its fixture is one harvester short
 * of the doctrine's target on purpose — `commandConstruction` holds the whole
 * purse against the 600-nodule Slipway the moment the economy is staffed, and
 * a test whose commander was saving for the yard would assert this one's
 * silence and learn nothing from it.
 */
describe('the commander saves for its own line, not only for the rung', () => {
  const commune = Faction.Pelagia;
  const line = UnitKind.Reed;
  const cheaper = UnitKind.LightScout;

  /**
   * A Commune with the economy one hauler short, so nothing above is saving,
   * and a two-hull line, so the cycle's index lands on the Reed.
   */
  function shortOfALine(brief: AiBriefing): EchoSnapshot['units'] {
    const home = brief.spawns[brief.slot]!;
    const at = (i: number): { x: number; y: number } => ({ x: home.x + i * 60, y: home.y });
    const roster: UnitKind[] = [
      ...Array.from<UnitKind>({ length: DOCTRINE[commune].harvesterTarget - 1 }).fill(
        UnitKind.Harvester
      ),
      OWN_SCOUT[commune],
      OWN_ORDNANCE[commune],
      OWN_SIEGE[commune],
      UnitKind.Corvette,
      UnitKind.Corvette,
    ];
    return roster.map((kind, i) => hull(i + 1, kind, at(i)));
  }

  it('is asked for the line hull, with the cheap one behind it', () => {
    // The premise the three tests below all rest on, asserted rather than
    // assumed: both hulls are on this doctrine's list, the fall-through is the
    // cheaper of the two, and the army in `shortOfALine` puts the cycle's index
    // on the Reed rather than on the Light Scout.
    const composition = DOCTRINE[commune].composition;
    assert.ok(composition.includes(line) && composition.includes(cheaper), 'both are on the list');
    assert.ok(
      priceOf(statsFor(cheaper)).nodules < priceOf(statsFor(line)).nodules,
      'the fall-through is the cheaper hull'
    );
    const armed = shortOfALine(briefing(commune)).filter(
      (u) => statsFor(u.kind).attackDamage > 0
    ).length;
    const start = armed % composition.length;
    const first = composition
      .map((_, k) => composition[(start + k) % composition.length]!)
      .find((kind) => statsFor(kind).attackDamage > 0);
    assert.equal(first, line, 'the cycle asks for the line hull first at this army size');
  });

  it('holds for the line hull rather than spending the bank on the cheap one', () => {
    const brief = briefing(commune);
    // Over half the Reed's price and under it: a gap a window can close, which
    // is the only kind this commander opens a hold for.
    const nodules = Math.ceil(priceOf(statsFor(line)).nodules * 0.6);

    const bought = hullsBoughtOver(brief, 60, { nodules, units: shortOfALine(brief) });
    assert.deepEqual(
      bought,
      [],
      `a Commune holding ${nodules} nodules should buy nothing while it saves for a ${statsFor(line).name}, not a run of ${statsFor(cheaper).name}s`
    );
  });

  it('buys the cheap hull instead when the gap is one no window will close', () => {
    const brief = briefing(commune);
    // Under half the Reed's price, and exactly the Light Scout's: the hold
    // would be a standing tax on a hull this navy is not close to, so the
    // fall-through is the right answer and the cycle takes it.
    const nodules = priceOf(statsFor(cheaper)).nodules;
    assert.ok(
      nodules < priceOf(statsFor(line)).nodules * 0.5,
      'the premise: the purse is below the fraction a hold opens at'
    );

    const bought = hullsBoughtOver(brief, 12, { nodules, units: shortOfALine(brief) });
    assert.ok(
      bought.length > 0 && bought.every((kind) => kind === cheaper),
      `a Commune this far from a ${statsFor(line).name} should keep buying ${statsFor(cheaper).name}s, got ${bought.map((k) => statsFor(k).name).join(', ') || 'nothing'}`
    );
  });

  it('lets go, so the army still grows while the saving happens', () => {
    const brief = briefing(commune);
    const nodules = Math.ceil(priceOf(statsFor(line)).nodules * 0.6);

    // A purse that never grows is the worst case for a duty cycle: the hold can
    // never close on its own, so if it were a strike rather than a window this
    // navy would stand still for the rest of the match. The window is
    // `RUNG.SAVE_S` — two minutes — and the far side of it is the fall-through.
    const bought = hullsBoughtOver(brief, 180, { nodules, units: shortOfALine(brief) });
    assert.ok(
      bought.length > 0 && bought.every((kind) => kind === cheaper),
      `the hold is a window: past it the ${statsFor(cheaper).name} is bought again, got ${bought.map((k) => statsFor(k).name).join(', ') || 'nothing'}`
    );
  });
});
