/**
 * Sorrowgate's flight, left alone — docs/mission-sorrowgate.md §3 (#1262).
 *
 * "Nothing in this mission is trying to destroy the flight." Escorts One to
 * Three were seated in the arch-span row, which the 10:40 `ground` beat makes
 * solid to the surface; the seabed lifts a hull inside rock at the ascent rate
 * (docs/systems-depth.md §2), so the three rose from 1,450 m into the Lid and
 * died by 14:15, and a player who followed the station gloss — "stay where you
 * are until the arch falls" — lost three of four hulls to nothing. Seated under
 * the arch's south face, the flight sits out the transit where it was put.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { Health, Owner, Position, Unit } from '../src/sim/components.ts';
import { defineQuery } from 'bitecs';

const STEP_MS = 1000 / SIM.TICK_HZ;

describe('Sorrowgate, with nobody at the helm', () => {
  it('keeps the whole flight, at its depth, to the adjournment', () => {
    const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
    const match = new Match(map, { mission: PROLOGUE_SORROWGATE, fauna: false, seed: 77 });
    const party = PROLOGUE_SORROWGATE.parties.find(
      (p) => p.slot === PROLOGUE_SORROWGATE.playerSlot
    )!;
    const escorts = party.units.filter((unit) => unit.role === 'escort');
    assert.equal(escorts.length, 4, 'the premise: the flight is four hulls');

    // Seated hulls in seat order are the escorts, matched by where they sit.
    const hulls = defineQuery([Unit, Owner, Position, Health])(match.world);
    const flight = escorts.map((seat) => {
      const eid = hulls.find(
        (e) =>
          Owner.slot[e] === PROLOGUE_SORROWGATE.playerSlot &&
          Math.hypot(Position.x[e]! - seat.x, Position.y[e]! - seat.y) < 1
      );
      assert.ok(eid !== undefined, `${seat.tag} is seated where the literal puts it`);
      return { tag: seat.tag, eid, depthM: seat.depthM, full: Health.hp[eid]! };
    });

    const shallowest = new Map(flight.map((hull) => [hull.eid, Infinity]));
    for (let tick = 0; tick < 20 * 60 * SIM.TICK_HZ && match.missionOver === null; tick++) {
      match.update(STEP_MS);
      match.takeMissionView();
      for (const hull of flight) {
        shallowest.set(hull.eid, Math.min(shallowest.get(hull.eid)!, Position.depth[hull.eid]!));
      }
    }

    for (const hull of flight) {
      assert.equal(Health.hp[hull.eid], hull.full, `${hull.tag} was hurt with nobody at the helm`);
      const rose = hull.depthM - shallowest.get(hull.eid)!;
      assert.ok(rose < 1, `the ground lifted ${hull.tag} ${rose.toFixed(0)} m off its seat`);
    }
  });
});
