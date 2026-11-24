/**
 * The names the selection card prints — docs/ui-ux.md §9, "The card names a
 * mission's hull" (#1886).
 *
 * A gloss that says *keep the First afloat* or *pass Tender Three by the
 * ovens* points at nothing unless the card can tell that hull from the others
 * of its class. These hold the own-force list to carrying the name: on the
 * hull the literal seats under it, never in a skirmish, and not past the
 * hull's death. That no other party's hull is named is held at the literal,
 * in `missions.test.ts`, since a scripted slot is sent no own-force list.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MAP_ID, SIM, UnitKind, type EchoSnapshot } from '@echoes/shared';
import { Health } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { mapById, missionMapById } from '../src/sim/maps/index.ts';
import {
  CADRE_CALLSIGNS,
  CHORD_RIM_DEPOSITS,
  SEEDING_TEND,
  callsignOf,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** The first own-force list the player is sent. */
function firstSnapshot(match: Match, slot: number): EchoSnapshot {
  for (let tick = 0; tick < SIM.TICK_HZ; tick++) {
    const own = match.update(STEP_MS)?.get(slot);
    if (own !== undefined) return own;
  }
  throw new Error('no snapshot inside a second');
}

function missionMatch(mission: MissionDefinition): Match {
  return new Match(missionMapById(mission.mapId)!, { mission, fauna: false, seed: 7 });
}

/** The name the snapshot gives the hull seated at a literal's position. */
function nameAt(own: EchoSnapshot, x: number, y: number): string | undefined {
  const unit = own.units.find((u) => Math.hypot(u.x - x, u.y - y) < 1);
  assert.ok(unit !== undefined, `no own hull at ${x}, ${y}`);
  return unit.callsign;
}

describe('the card names a mission hull — docs/ui-ux.md §9', () => {
  it('names each of Tend’s five hulls, and the gift’s Harvester as Tender Three', () => {
    const own = firstSnapshot(missionMatch(SEEDING_TEND), SEEDING_TEND.playerSlot);
    const player = SEEDING_TEND.parties.find((p) => p.slot === SEEDING_TEND.playerSlot)!;
    for (const unit of player.units) {
      assert.equal(nameAt(own, unit.x, unit.y), unit.callsign, `${unit.tag}'s name`);
    }
    // docs/mission-tend.md §3: the gift rides one Harvester of three, and the
    // gloss can say which only because the card does.
    const gift = SEEDING_TEND.lifts!.find((lift) => lift.id === 'gift')!;
    const carrier = player.units.find((u) => u.tag === gift.tag)!;
    assert.equal(carrier.kind, UnitKind.Harvester);
    assert.equal(nameAt(own, carrier.x, carrier.y), 'Tender Three');
  });

  it('names a hull by its cadre, so the First reads The First', () => {
    const own = firstSnapshot(missionMatch(CHORD_RIM_DEPOSITS), CHORD_RIM_DEPOSITS.playerSlot);
    const player = CHORD_RIM_DEPOSITS.parties.find(
      (p) => p.slot === CHORD_RIM_DEPOSITS.playerSlot
    )!;
    for (const unit of player.units) {
      assert.ok(unit.cadre !== undefined, `${unit.tag} has no cadre`);
      assert.equal(nameAt(own, unit.x, unit.y), CADRE_CALLSIGNS[unit.cadre], unit.tag);
    }
    const first = player.units.find((u) => u.cadre === 'first')!;
    assert.equal(callsignOf(first), 'The First');
  });

  it('names no hull in a skirmish', () => {
    const match = new Match(mapById(DEFAULT_MAP_ID)!, { seed: 7, fauna: false });
    match.addPlayer(0, SEEDING_TEND.parties[0]!.faction);
    const own = firstSnapshot(match, 0);
    assert.ok(own.units.length > 0, 'the skirmish seated no hulls');
    for (const unit of own.units) assert.equal(unit.callsign, undefined);
  });

  it('drops a name with its hull', () => {
    // Read through the tag's round trip, not an id kept from install, so an
    // id the world recycles cannot inherit a dead hull's name.
    const match = missionMatch(SEEDING_TEND);
    const own = firstSnapshot(match, SEEDING_TEND.playerSlot);
    const named = own.units.find((u) => u.callsign === 'Tender Three')!;
    Health.hp[named.id] = 0;
    let after: EchoSnapshot | undefined;
    for (let tick = 0; tick < SIM.TICK_HZ; tick++) {
      after = match.update(STEP_MS)?.get(SEEDING_TEND.playerSlot) ?? after;
    }
    assert.ok(after !== undefined);
    assert.ok(
      after.units.every((u) => u.callsign !== 'Tender Three'),
      'a dead hull’s name is still on the list'
    );
    assert.equal(after.units.filter((u) => u.callsign !== undefined).length, 4);
  });
});
