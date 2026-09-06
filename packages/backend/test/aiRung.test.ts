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
 * And the two guards both halves sit behind. Waiting only ever closes a
 * **nodule** gap: crystal and Biomass arrive because a hauler went and got
 * them, so a hull short of either is not short of savings — the Dredge is
 * priced in both, and a Directorate that stopped building to wait for Biomass
 * it earns at well under one a minute would be a navy standing still for the
 * rest of the match. And a gap a window cannot close is not worth opening:
 * below half the price the commander keeps buying its line, or the hold becomes
 * a standing tax on a hull it was never going to reach.
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
 * Every other branch of `commandProduction` sits in front of the rung's, and
 * any one of them still wanting something would answer this test's question for
 * it. So the economy is staffed to the doctrine's target, the navy's own scout
 * is in the water, its ordnance hull is bought, and the line is short of the
 * army target by enough that the composition cycle would happily buy the next
 * Corvette if it were allowed to.
 */
function force(brief: AiBriefing): EchoSnapshot['units'] {
  const doctrine = DOCTRINE[brief.faction];
  const home = brief.spawns[brief.slot]!;
  const at = (i: number): { x: number; y: number } => ({ x: home.x + i * 60, y: home.y });
  const roster: UnitKind[] = [
    ...Array.from<UnitKind>({ length: doctrine.harvesterTarget }).fill(UnitKind.Harvester),
    OWN_SCOUT[brief.faction],
    OWN_ORDNANCE[brief.faction],
    // Two, against an army target of `attackAtArmySize * patience + 2`: short
    // enough that the composition cycle is still buying, which is the thing
    // the hold has to be seen to interrupt.
    UnitKind.Corvette,
    UnitKind.Corvette,
  ];
  return roster.map((kind, i) => hull(i + 1, kind, at(i)));
}

/**
 * The scout and the ordnance hull each navy buys by a want of its own.
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

describe('the commander saves for the hull the rung was bought for', () => {
  const consortium = Faction.Bathyarch;

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
    // Same commander, same yard, same want: only the bank differs, and a fifth
    // of the price is not "nearly there".
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
      nodules: Math.floor(price * 0.2),
    });

    assert.ok(
      nowhereNear.length > nearly.length * 2,
      `a navy nowhere near the price keeps building: ${nowhereNear.length} hulls ` +
        `against ${nearly.length} for one that is nearly there`
    );
  });

  it('does not wait for an account waiting cannot fill', () => {
    // The Dredge is priced in crystal and Biomass as well as nodules, and both
    // arrive because a hauler went and got them rather than because a commander
    // sat still. A hold on those is `commandConstruction`'s Spore Veil circle
    // one deck down: 450 nodules held against a Biomass price the wait will
    // never deliver, for the rest of the match.
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
