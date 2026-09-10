/**
 * Every enum a client chooses, driven off its own end — #609.
 *
 * Four client messages carry an enum the player picked: `build` a
 * `StructureKind`, `produce` a `UnitKind`, `refit` a `RefitKind` and `throttle`
 * a `HarvestThrottle`. The room checks each is a finite number and no more
 * (`MatchRoom.ts`), so the value that reaches `Match` is an arbitrary one, and
 * two of the four then indexed a plain `Record` and dereferenced the result.
 *
 * That is not a wrong answer, it is a `TypeError` out of a Colyseus handler the
 * room never asked to have wrapped, which the default process hook turns into
 * an exit after disposing every room on the box. One `build` message from any
 * seated client, and every concurrent match ends.
 *
 * So this file asserts the class rather than the two instances. It walks the
 * same battery of nonsense — outside the enum, fractional, negative, huge, NaN,
 * both infinities — through all four entry points, and asks two things of each:
 * that it returns rather than throws, and that it changed nothing. A fifth
 * message added with a hand-written `Number.isFinite` and no range check is
 * covered here the day its verb is added to the table below.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  HarvestThrottle,
  RefitKind,
  SIM,
  StructureKind,
  UnitKind,
  isStructureKind,
  refitOfferedTo,
  type EchoSnapshot,
} from '@echoes/shared';
import { Harvester, Owner } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/**
 * Values a client can put in a `kind` field that name nothing.
 *
 * `Number.isFinite` — the room's whole check — admits every one of these but
 * the last two, which is why the range check has to live where the table does.
 */
const NOT_A_KIND = [999, 11, -1, 2.5, 0.1, Number.MAX_SAFE_INTEGER, NaN, Infinity, -Infinity];

function advance(match: Match, seconds: number): Map<number, EchoSnapshot> | null {
  let latest: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const result = match.update(STEP_MS);
    if (result !== null) latest = result;
  }
  return latest;
}

/**
 * A seated match with a full purse, so nothing below is refused on price.
 *
 * The navy is the Order on purpose: its terms buy the refit at the Bastion
 * rather than at the Slipway, so `refit` is reachable on the opening kit with
 * no economy spent and no yard built — which is exactly how cheap the crash
 * was to reach.
 */
function seated(): { match: Match; bastion: number; x: number; y: number } {
  const match = new Match(undefined, { fauna: false });
  match.addPlayer(0, Faction.Hadron);
  match.addPlayer(1, Faction.Bathyarch);
  const snapshot = advance(match, 0.5)!.get(0)!;
  const bastion = snapshot.structures.find((s) => s.kind === StructureKind.Bastion)!;
  const economy = match.world.economies.get(0)!;
  economy.nodules = 5000;
  economy.crystal = 500;
  return { match, bastion: bastion.id, x: bastion.x, y: bastion.y };
}

/** Slot 0's first harvester, which the opening kit always includes. */
function harvesterOf(match: Match, slot: number): number {
  for (let eid = 0; eid <= match.world.maxEid; eid++) {
    if (Harvester.throttle[eid] === undefined) continue;
    if (Owner.slot[eid] !== slot) continue;
    return eid;
  }
  throw new Error('the opening kit seats a harvester');
}

/** Everything a refused order must leave exactly as it found it. */
function ledger(match: Match): string {
  const economy = match.world.economies.get(0)!;
  return JSON.stringify({
    nodules: economy.nodules,
    crystal: economy.crystal,
    biomass: economy.biomass,
    maxEid: match.world.maxEid,
    refits: [...(match.world.refits.get(0) ?? [])].sort(),
    lines: match.world.production.size,
  });
}

describe('an enum a client chose', () => {
  it('never crashes the process through build', () => {
    const { match, x, y } = seated();
    const before = ledger(match);

    // The site is one a Refinery really does take (the positive control below
    // commissions there), so every refusal here is about the kind and not
    // about the ground, the build radius or somebody else's footprint.
    for (const kind of NOT_A_KIND) {
      assert.equal(
        match.build(0, kind as StructureKind, x, y + 600),
        false,
        `build refuses ${kind} rather than throwing`
      );
    }

    assert.equal(ledger(match), before, 'a refused build commissions nothing and charges nothing');
  });

  it('never crashes the process through refit', () => {
    const { match, bastion } = seated();
    const before = ledger(match);

    for (const kind of NOT_A_KIND) {
      assert.equal(
        match.refit(0, bastion, kind as RefitKind),
        false,
        `refit refuses ${kind} rather than throwing`
      );
    }

    assert.equal(ledger(match), before, 'a refused refit grants nothing and takes no line');
  });

  it('never crashes the process through produce', () => {
    const { match, bastion } = seated();
    const before = ledger(match);

    for (const kind of NOT_A_KIND) {
      assert.equal(
        match.produce(0, bastion, kind as UnitKind),
        false,
        `produce refuses ${kind} rather than throwing`
      );
    }

    assert.equal(ledger(match), before, 'a refused order queues nothing and charges nothing');
  });

  it('never crashes the process through throttle', () => {
    const { match } = seated();
    const harvester = harvesterOf(match, 0);
    const before = Harvester.throttle[harvester];

    for (const kind of NOT_A_KIND) {
      match.setThrottle(0, harvester, kind as HarvestThrottle);
      assert.equal(
        Harvester.throttle[harvester],
        before,
        `throttle ignores ${kind} rather than storing it`
      );
    }
  });

  it('still accepts every kind that does name something', () => {
    // The guards refuse what is not in the table; this is the other half, and
    // it is what would catch a predicate that had quietly started refusing
    // everything. A Refinery is the cheapest thing worth commissioning and the
    // Order is offered the Pressure Refit at its Bastion.
    const { match, bastion, x, y } = seated();
    assert.equal(match.build(0, StructureKind.Refinery, x, y + 600), true, 'a real kind builds');
    assert.equal(
      match.refit(0, bastion, RefitKind.Pressure),
      true,
      'the Order buys its refit at the Bastion'
    );
    assert.equal(
      match.produce(0, bastion, UnitKind.Harvester),
      true,
      'a Bastion still rebuilds an economy'
    );
  });
});

describe('the two predicates the guards are written on', () => {
  it('admits exactly the structures the table has rows for', () => {
    // Derived from `STRUCTURE_STATS` rather than from the enum, so this is also
    // the assertion that an eleventh structure is admitted by existing.
    for (const kind of Object.values(StructureKind)) {
      if (typeof kind !== 'number') continue;
      assert.equal(isStructureKind(kind), true, `${StructureKind[kind]} is a structure kind`);
    }
    for (const kind of NOT_A_KIND) assert.equal(isStructureKind(kind), false, `${kind} is not`);
  });

  it('offers no navy a refit with no row', () => {
    // §2 designs five refits and one is transcribed, so four of the enum's
    // eventual members do not exist yet. Until they do they are offered to
    // nobody, which is what stops `refitPriceFor` reading a row that is not
    // there — the check `Match.refit` always looked like it was making.
    for (const faction of Object.values(Faction)) {
      if (typeof faction !== 'number') continue;
      for (const kind of NOT_A_KIND) {
        assert.equal(
          refitOfferedTo(kind as RefitKind, faction),
          false,
          `${Faction[faction]} is not offered ${kind}`
        );
      }
    }
  });
});
