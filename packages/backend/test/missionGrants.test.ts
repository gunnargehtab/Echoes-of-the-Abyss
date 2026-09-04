/**
 * Water a mission makes habitable, and a hull a mission holds still.
 *
 * Two format rows that arrived together, because the fourteen documents
 * specifying the campaign's remaining missions were read against the format at
 * once and these are the two things that reading found the format could not do.
 *
 * - **`MissionRegion.pressureBonus`, and the `ground` beat that sows one.**
 *   The Commune's answer to depth is the one answer that is not a refit —
 *   "they don't survive the deep, they change it" (docs/systems-depth.md §3) —
 *   and docs/mission-deep-furrow.md §4 is the mission where a player makes a
 *   piece of the Abyssal habitable. Nothing in the format could rate a
 *   rectangle, which left docs/mission-second-seeding.md, the Commune's
 *   ending, the one mission of the fourteen with no honest literal at all.
 * - **`releaseTick`, honoured by tag.** `types.ts` states the field's contract
 *   with no role in it — "held by the runtime until this tick, whatever the
 *   player orders" — and the runtime kept it only for hulls that were also
 *   `tender`s, because the only mission that had authored one was Sorrowgate,
 *   where every held hull was. Eight shipped literals name no tender, so a
 *   `releaseTick` in any of them was recorded and never enforced.
 *
 * Both are played against a live match rather than read off a literal, because
 * both are claims about what happens at 60 Hz to a hull standing in a
 * particular place, which is what reading a table cannot establish.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  UnitKind,
  requiredPressureRating,
} from '@echoes/shared';
import { Health, Owner, Position, Pressure, Unit } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import type { MissionBeat, MissionDefinition, MissionRegion } from '../src/sim/missions/index.ts';
import { defineQuery } from 'bitecs';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = 0;
const SEED = 41;
const hulls = defineQuery([Unit, Owner, Position]);

/**
 * Sorrowgate's Gate region — known open water, floor 1,470 m.
 *
 * 1,470 m is Mid-Water, so `requiredPressureRating` asks PR 2 there and a PR-1
 * hull standing in it takes unhealable crush every tick. That is the whole
 * apparatus of this file: an under-rated hull in known-lethal water, and a
 * rectangle that either saves it or does not.
 */
const DEPTH_M = 1470;
const FURROW: MissionRegion = {
  id: 'furrow',
  x: 2300,
  y: 2300,
  widthM: 500,
  heightM: 500,
  note: 'The sown ground',
};
/** The same water, unsown, six hundred metres west — where a held hull is sent. */
const BARE: MissionRegion = {
  id: 'bare',
  x: 1600,
  y: 2300,
  widthM: 500,
  heightM: 500,
  note: 'The ground nobody sowed',
};
const STAND = { x: FURROW.x + 250, y: FURROW.y + 250 };
const AWAY = { x: BARE.x + 250, y: BARE.y + 250 };

/** Something audible, well before any close — docs/campaign.md §10's telegraph. */
const TELEGRAPH: MissionBeat = {
  atTick: SIM.TICK_HZ * 10,
  kind: 'creature',
  tag: 'passerby',
  species: FaunaSpecies.Sounder,
  spawnAt: { x: 1600, y: 3400, depthM: 2200 },
  driveTo: { x: 1700, y: 3500 },
  untilTick: SIM.TICK_HZ * 14,
  loud: true,
  note: 'Something audible, ahead of the close',
};

interface Sown {
  /** Authored on the region itself — ground sown before the mission opened. */
  authored?: number;
  /** Sown by a `ground` beat at this tick, with no repaint. */
  beatAt?: { tick: number; bonus: number };
  /** Stand a Sounding Spire over the hull as well, to test max against sum. */
  underSpire?: true;
  /** Hold the hull with `releaseTick` rather than letting it move. */
  releaseTick?: number;
}

/**
 * One PR-1 hull standing in lethal water, and whatever the case sows over it.
 *
 * The hull is a Light Scout, PR 1 on the roster and left there deliberately:
 * a `pressureRating` on the unit would refit it and leave the region nothing
 * to do. It stands inside `furrow` from the first tick, so every difference
 * between cases is the water and not the hull.
 */
function grantMission(sown: Sown): MissionDefinition {
  const furrow: MissionRegion =
    sown.authored === undefined ? FURROW : { ...FURROW, pressureBonus: sown.authored };
  const beats: MissionBeat[] = [TELEGRAPH];
  if (sown.beatAt !== undefined) {
    beats.push({
      atTick: sown.beatAt.tick,
      kind: 'ground',
      region: 'furrow',
      pressureBonus: sown.beatAt.bonus,
      note: 'The furrow is sown. The water is not repainted and the floor does not move',
    });
  }
  beats.push({ atTick: SIM.TICK_HZ * 90, kind: 'resolve', note: 'The tide ends' });
  beats.sort((a, b) => a.atTick - b.atTick);

  return {
    ...PROLOGUE_SORROWGATE,
    id: 'test-grant-mission',
    doc: 'docs/mission-deep-furrow.md §4 — the test authoring',
    playerSlot: PLAYER,
    courtSlot: 1,
    fauna: false,
    // The hull stands in the furrow from tick zero, so the terminal objective
    // is Met on the first pass — and without this the mission would close
    // there and no later beat would ever fire. It is the same trap the format
    // survey found waiting for three of the fourteen missions being written
    // against this format, and the reason `runsItsLength` exists.
    runsItsLength: true,
    sigBudget: 65,
    arrayTag: undefined,
    silenceCeilingSig: 100,
    debtCapS: 0,
    escortRadiusM: 0,
    regions: [furrow, BARE],
    lifts: [],
    markers: [],
    parties: [
      {
        slot: PLAYER,
        faction: Faction.Pelagia,
        note: 'One under-rated hull in water that crushes it unless the mission says otherwise',
        units: [
          {
            tag: 'sower',
            kind: UnitKind.LightScout,
            x: STAND.x,
            y: STAND.y,
            depthM: DEPTH_M,
            role: 'tender',
            ...(sown.releaseTick === undefined ? {} : { releaseTick: sown.releaseTick }),
            note: 'Stands in the furrow. PR 1, unrefitted: the rectangle is its only cover',
          },
        ],
        structures:
          sown.underSpire === true
            ? [
                {
                  tag: 'spire',
                  kind: StructureKind.SoundingSpire,
                  x: STAND.x,
                  y: STAND.y,
                  depthM: DEPTH_M,
                  note: 'Standing over the same hull, granting the same one band',
                },
              ]
            : undefined,
      },
    ],
    locks: [],
    objectives: [
      {
        id: 'stood',
        text: 'The furrow is stood in.',
        initial: ObjectiveStatus.Pending,
        terminal: true,
        predicate: { kind: 'extract', role: 'tender', region: 'furrow', count: 1 },
      },
    ],
    beats,
    epilogue: {
      [MissionOutcome.Complete]: 'The furrow held.',
      [MissionOutcome.Partial]: 'Some of it held.',
      [MissionOutcome.Lost]: 'It did not hold.',
    },
  };
}

/** The player's own hull, by the tag it was seated under. */
function sower(match: Match): number {
  return (
    hulls(match.world).find(
      (eid) => Owner.slot[eid] === PLAYER && Unit.kind[eid] === UnitKind.LightScout
    ) ?? 0
  );
}

/** Drive the mission for `seconds`, then read the hull's rating and its ledger. */
function play(sown: Sown, seconds: number) {
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  const match = new Match(map, { mission: grantMission(sown), fauna: false, seed: SEED });
  for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) {
    match.update(STEP_MS);
    match.takeMissionView();
  }
  // Two ECS reads, and they are the point: `Pressure.bonus` is what a grant
  // writes and `Pressure.unhealable` is what it prevents — the crush ledger
  // lives on `Pressure` rather than on `Health` precisely because no repair
  // undoes it. Both are the player's own hull on the player's own slot.
  const eid = sower(match);
  return {
    alive: eid !== 0 && (Health.hp[eid] ?? 0) > 0,
    bonus: eid === 0 ? -1 : (Pressure.bonus[eid] ?? 0),
    rating: eid === 0 ? -1 : (Pressure.rating[eid] ?? 0),
    crushed: eid === 0 ? -1 : (Pressure.unhealable[eid] ?? 0),
  };
}

describe('a mission can make a rectangle of water habitable', () => {
  it('crushes an under-rated hull in ground nobody sowed, which is the control', () => {
    // Establishes that the water is genuinely lethal, so every assertion below
    // is about the grant rather than about the depth being harmless anyway.
    assert.equal(requiredPressureRating(DEPTH_M), 2, 'Mid-Water asks PR 2');
    const bare = play({}, 20);
    assert.equal(bare.rating, 1, 'the hull is PR 1, unrefitted');
    assert.equal(bare.bonus, 0, 'and nothing grants it anything');
    assert.ok(bare.crushed > 0, `an unrated hull at ${DEPTH_M} m takes crush; it took none`);
  });

  it('rates a hull standing in an authored furrow, and it takes no crush', () => {
    const sown = play({ authored: 1 }, 20);
    assert.equal(sown.bonus, 1, 'the region grants one band');
    assert.equal(
      sown.rating + sown.bonus,
      requiredPressureRating(DEPTH_M),
      'and one band is exactly what this water asks for'
    );
    assert.equal(sown.crushed, 0, 'so the hull takes no crush at all');
  });

  it('sows a furrow at a tick, with a beat that repaints nothing', () => {
    // The `ground` beat's third field, and the reason every field on it is
    // optional: docs/mission-second-seeding.md needs a lip that gains the
    // grant without its biome or its floor moving.
    const AT = 15;
    const beatAt = { tick: SIM.TICK_HZ * AT, bonus: 1 };
    const late = play({ beatAt }, AT + 15);
    assert.equal(late.bonus, 1, 'the beat turned the grant on');
    assert.ok(
      late.crushed > 0,
      'and the hull still carries what it took before the furrow was sown — the ledger does not heal'
    );
    assert.ok(late.alive, 'but it is alive, because the crush stopped when the water changed');

    // The grant is what stopped it: fifteen more seconds add nothing.
    const later = play({ beatAt }, AT + 30);
    assert.equal(
      later.crushed,
      late.crushed,
      'the ledger stops on the tick the furrow is sown, and stays where it stopped'
    );
  });

  it('takes the grant away again when a beat sows zero', () => {
    // Zero is a real value rather than an absence: a furrow that fails is a
    // furrow whose water goes back to being what it was.
    const AT = 15;
    const undone = play({ authored: 1, beatAt: { tick: SIM.TICK_HZ * AT, bonus: 0 } }, AT + 15);
    assert.equal(undone.bonus, 0, 'the grant is gone');
    assert.ok(undone.crushed > 0, 'and the water is lethal again');
  });

  it('resolves a furrow under a Spire as a max and never a sum', () => {
    // The one real hazard in this row. Both grants are one band; summing them
    // would rent the hull two, and silently un-crush water the design means to
    // be lethal three hundred metres further down.
    assert.equal(STRUCTURE_AURAS.SOUNDING_SPIRE.PR_BONUS, 1, 'the Spire grants one band');
    const both = play({ authored: 1, underSpire: true }, 20);
    assert.equal(
      both.bonus,
      1,
      'a hull in a sown furrow under a node has rented one band, not two'
    );
  });

  it('leaves every other mission alone, since a region without the field grants nothing', () => {
    // The whole regression surface of this row: every shipped literal authors
    // regions, and none of them authors this field.
    const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
    const match = new Match(map, { mission: PROLOGUE_SORROWGATE, fauna: false, seed: SEED });
    for (let tick = 0; tick < SIM.TICK_HZ * 5; tick++) match.update(STEP_MS);
    for (const eid of hulls(match.world)) {
      if (Owner.slot[eid] !== PROLOGUE_SORROWGATE.playerSlot) continue;
      assert.equal(
        Pressure.bonus[eid] ?? 0,
        0,
        'a mission that authors no grant grants nothing to anybody'
      );
    }
  });
});

describe('a mission holds a hull it said it would hold', () => {
  it('refuses to move a held hull whatever the player orders, tender or not', () => {
    // `releaseTick` with no escort rule anywhere near it: `escortRadiusM` is 0
    // and the mission authors no escort at all, which is the shape eight
    // shipped literals have and the shape the runtime used to ignore.
    const HELD_UNTIL_S = 30;
    const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
    const mission = grantMission({ authored: 1, releaseTick: SIM.TICK_HZ * HELD_UNTIL_S });
    const match = new Match(map, { mission, fauna: false, seed: SEED });

    // Order it away every second, as a player leaning on the key would.
    const orderAway = (): void => {
      const eid = sower(match);
      if (eid !== 0) match.orderMove(PLAYER, eid, AWAY.x, AWAY.y);
    };
    for (let tick = 0; tick < SIM.TICK_HZ * (HELD_UNTIL_S - 5); tick++) {
      if (tick % SIM.TICK_HZ === 0) orderAway();
      match.update(STEP_MS);
      match.takeMissionView();
    }
    const heldEid = sower(match);
    const heldAt = Math.hypot(Position.x[heldEid]! - STAND.x, Position.y[heldEid]! - STAND.y);
    assert.ok(
      heldAt < 60,
      `the hull was held and moved anyway, ${Math.round(heldAt)} m from where it was seated`
    );

    // And it goes once the tick it was promised arrives.
    for (let tick = 0; tick < SIM.TICK_HZ * 25; tick++) {
      if (tick % SIM.TICK_HZ === 0) orderAway();
      match.update(STEP_MS);
      match.takeMissionView();
    }
    const freeEid = sower(match);
    const freeAt = Math.hypot(Position.x[freeEid]! - STAND.x, Position.y[freeEid]! - STAND.y);
    assert.ok(
      freeAt > 150,
      `and it moved once its release tick passed; it got ${Math.round(freeAt)} m`
    );
  });
});
