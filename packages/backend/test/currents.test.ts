/**
 * Cold shock currents (#151) — docs/hazards.md §8.
 *
 * The first sustained, directional force in the game. An eruption shoves you
 * away from a point for four seconds; a current carries you one way for forty,
 * which is what makes it something a player routes around rather than flees.
 *
 * Three properties carry the mechanic, and all three are easy to lose while the
 * code still looks right:
 *
 * - **It has a direction, and the direction is the decision.** A current that
 *   pushed radially, or that pushed everyone the same regardless of heading,
 *   would be a movement tax. Riding must be cheap and fighting must be dear.
 * - **Fighting it is loud and drifting is silent.** §8's sound argument, and
 *   the reason this is a mechanic at all rather than terrain with extra steps.
 * - **It telegraphs.** CLAUDE.md fixes the target emotion as dread rather than
 *   confusion, and a current you meet without warning is one you can only
 *   discover by having already lost your line to it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  FaunaSpecies,
  HAZARDS,
  HazardPhase,
  SIM,
  UNIT_STATS,
  UnitKind,
  type UnitStats,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Position } from '../src/sim/components.ts';
import { KELP_LABYRINTH, VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;

/** Due east, so "with the flow" is +X and "against it" is -X. */
const EAST = 0;

function currentMap(flowDeg = EAST, x = 4000, y = 4000, radiusM = 1200): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: 'test-cold-shock',
    regions: [],
    hazards: [{ x, y, radiusM, kind: 'cold-shock', flowDeg }],
  };
}

/**
 * A match whose one current is already running.
 *
 * Hulls are spawned *after* the phase is reached, so nothing under test spent
 * the dormant and warning phases drifting around and confusing the measurement.
 */
function running(map: MapDefinition = currentMap(), seed = 41): Match {
  const match = new Match(map, { fauna: false, seed, terrain: new Terrain(MAP_M, MAP_M, 250) });
  for (let i = 0; i < 400 * SIM.TICK_HZ; i++) {
    match.update(STEP_MS);
    if (match.world.hazards[0]!.phase === HazardPhase.Active) return match;
  }
  throw new Error('the current never became active');
}

function advance(match: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) match.update(STEP_MS);
}

function hull(match: Match, opts: { faction?: Faction; kind?: UnitKind; x: number; y: number }) {
  return spawnUnit(match.world, {
    kind: opts.kind ?? UnitKind.Corvette,
    slot: 0,
    faction: opts.faction ?? Faction.Bathyarch,
    x: opts.x,
    y: opts.y,
  });
}

describe('a current carries what is in it', () => {
  it('drifts an idle hull along its authored bearing', () => {
    const match = running();
    const eid = hull(match, { x: 4000, y: 4000 });
    const y0 = Position.y[eid]!;

    advance(match, 5);

    const moved = Position.x[eid]! - 4000;
    // 10 m/s for 5 s, less whatever the phase taper and separation take.
    assert.ok(moved > 30, `an idle hull in a current should be carried east, moved ${moved}`);
    assert.ok(
      Math.abs(Position.y[eid]! - y0) < 5,
      `and only east: y drifted ${Position.y[eid]! - y0}`
    );
  });

  it('carries it the other way when the map says the other way', () => {
    // The bearing is map data, not a constant. If this passes with the site
    // reversed and the first test passes without, the direction is really being
    // read rather than assumed.
    const match = running(currentMap(180));
    const eid = hull(match, { x: 4000, y: 4000 });
    advance(match, 5);
    assert.ok(
      Position.x[eid]! < 4000 - 30,
      `west-flowing current carried it to ${Position.x[eid]}`
    );
  });

  it('leaves a hull outside the radius alone', () => {
    const match = running();
    const eid = hull(match, { x: 6000, y: 4000 });
    advance(match, 5);
    assert.equal(Position.x[eid], 6000, 'a hull outside the current must not be moved by it');
  });

  it('does not push a hull off the map', () => {
    // resolveStep clamps, so a current against a wall crowds hulls rather than
    // exporting them. Knockback learned this the hard way in #149.
    const match = running(currentMap(EAST, MAP_M - 400, 4000, 1200));
    const eid = hull(match, { x: MAP_M - 100, y: 4000 });
    advance(match, 20);
    assert.ok(Position.x[eid]! <= MAP_M, `hull left the map at x=${Position.x[eid]}`);
  });
});

describe('the direction is the decision', () => {
  /** How far a hull gets in `seconds`, ordered straight along `dx`. */
  function reach(faction: Faction, dx: 1 | -1, seconds: number, kind = UnitKind.Corvette): number {
    const match = running();
    const eid = hull(match, { faction, kind, x: 4000, y: 4000 });
    match.orderMove(0, eid, 4000 + dx * 3000, 4000, false);
    advance(match, seconds);
    return (Position.x[eid]! - 4000) * dx;
  }

  it('carries a hull further with the flow than against it', () => {
    const riding = reach(Faction.Bathyarch, 1, 6);
    const fighting = reach(Faction.Bathyarch, -1, 6);
    assert.ok(
      riding > fighting * 1.2,
      `riding should beat fighting by more than the noise floor: ${riding} vs ${fighting}`
    );
  });

  it('slows everyone in it, and Pelagia dramatically', () => {
    const consortium = reach(Faction.Bathyarch, 1, 6);
    const commune = reach(Faction.Pelagia, 1, 6);
    assert.ok(
      commune < consortium,
      `"Pelagia slows dramatically" — got ${commune} against ${consortium}`
    );
  });

  it('does not touch the Hadron Knights at all', () => {
    // "Hadron unaffected (mag-propulsion)" — doc §8. The one hazard a faction
    // simply ignores, so riding and fighting must cost them the same.
    const riding = reach(Faction.Hadron, 1, 6);
    const fighting = reach(Faction.Hadron, -1, 6);
    assert.ok(
      Math.abs(riding - fighting) < riding * 0.02,
      `mag-propulsion should not care which way the water goes: ${riding} vs ${fighting}`
    );
  });
});

describe('the sound argument', () => {
  /** SIG of a hull ordered straight along `dx` once the pass has settled. */
  function sigWhileMoving(dx: 1 | -1, faction = Faction.Bathyarch): number {
    const match = running();
    const eid = hull(match, { faction, x: 4000, y: 4000 });
    match.orderMove(0, eid, 4000 + dx * 3000, 4000, false);
    advance(match, 2);
    return Acoustic.sig[eid]!;
  }

  it('charges a hull for fighting the flow and nothing for riding it', () => {
    const riding = sigWhileMoving(1);
    const fighting = sigWhileMoving(-1);
    assert.ok(
      fighting > riding,
      `driving into a current must cost noise: ${fighting} against ${riding} riding`
    );
    // Head-on is the whole penalty, give or take the taper.
    assert.ok(
      fighting - riding > HAZARDS.COLD_SHOCK.FIGHTING_SIG * 0.8,
      `head-on should cost most of FIGHTING_SIG, got ${fighting - riding}`
    );
  });

  it('says nothing about a hull that is simply drifting', () => {
    // §8: "a hull under no orders is *carried*, and being carried is not work."
    // The mechanic depends on this — a current that made everything in it loud
    // would be a detection field, not a decision.
    const match = running();
    const drifting = hull(match, { x: 4000, y: 4000 });
    const outside = hull(match, { x: 6500, y: 4000 });
    advance(match, 2);
    assert.equal(
      Acoustic.sig[drifting],
      Acoustic.sig[outside],
      'drifting in a current must cost exactly what standing outside one costs'
    );
  });

  it('charges the Knights nothing for fighting it', () => {
    const riding = sigWhileMoving(1, Faction.Hadron);
    const fighting = sigWhileMoving(-1, Faction.Hadron);
    assert.equal(fighting, riding, 'mag-propulsion is not working against the water');
  });
});

describe('it telegraphs before it acts', () => {
  it('passes through a warning phase on the way to acting', () => {
    const match = new Match(currentMap(), {
      fauna: false,
      seed: 7,
      terrain: new Terrain(MAP_M, MAP_M, 250),
    });
    let sawWarning = false;
    for (let i = 0; i < 400 * SIM.TICK_HZ; i++) {
      match.update(STEP_MS);
      const phase = match.world.hazards[0]!.phase;
      if (phase === HazardPhase.Warning) sawWarning = true;
      if (phase === HazardPhase.Active) break;
    }
    assert.ok(sawWarning, 'a current must warn before it flows');
  });

  it('warns for long enough that the slowest hull can clear the largest one', () => {
    // The same rule the eruption's warning is sized by. A current does no
    // damage, so this is not about survival — it is about a player who acts on
    // the telegraph being able to keep the line they drew.
    const slowest = Math.min(...Object.values(UNIT_STATS).map((s: UnitStats) => s.speed));
    const largest = Math.max(
      ...KELP_LABYRINTH.hazards.filter((h) => h.kind === 'cold-shock').map((h) => h.radiusM)
    );
    const reach = slowest * HAZARDS.COLD_SHOCK.WARNING_S;
    assert.ok(
      reach > largest,
      `a ${slowest} m/s hull covers ${reach} m in the warning; the largest current is ${largest} m`
    );
  });
});

describe('the Drift in cold water', () => {
  it('freezes a creature that would otherwise be moving', () => {
    // "Abyssal creatures freeze briefly" — doc §8.
    //
    // Both creatures are displaced from the ground they were seeded on, so both
    // want to walk home through the ordinary Ambient path in `act()`. The only
    // difference between them is the water.
    //
    // Two earlier versions of this test used a loud unit as bait and passed for
    // the wrong reason: an idle Harvester is SIG 18, a Draymaw reads that as
    // 17.3 at 400 m against an Interest threshold of 22, so *neither* creature
    // ever left Ambient and "the frozen one did not move" meant nothing. A
    // control that does not move proves nothing about one that cannot.
    const match = running(currentMap(EAST, 4000, 4000, 1200));
    const frozen = spawnFauna(match.world, { species: FaunaSpecies.Draymaw, x: 4000, y: 4000 });
    const free = spawnFauna(match.world, { species: FaunaSpecies.Draymaw, x: 7000, y: 4000 });
    // Same displacement, one inside the current and one well clear of it.
    Position.x[frozen] = 4500;
    Position.x[free] = 7500;

    advance(match, 10);

    assert.ok(
      Position.x[free]! < 7500 - 50,
      `the control creature must walk home, or this proves nothing: it is at ${Position.x[free]}`
    );
    assert.equal(Position.x[frozen], 4500, 'a creature in an active current must not move at all');
  });
});

describe('the map authors the flow', () => {
  it('gives every cold shock site a bearing', () => {
    // A site without one does not flow, which is a map bug rather than a valid
    // still current. Cheaper to refuse here than to wonder why a hazard that
    // is drawn does nothing.
    for (const map of [KELP_LABYRINTH]) {
      for (const site of map.hazards) {
        if (site.kind !== 'cold-shock') continue;
        assert.equal(
          typeof site.flowDeg,
          'number',
          `${map.id} has a cold-shock site at ${site.x},${site.y} with no flowDeg`
        );
      }
    }
  });
});
