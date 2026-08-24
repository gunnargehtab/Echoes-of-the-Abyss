/**
 * Depth charges (#167) — docs/systems-combat.md §8.
 *
 * The weapon that argues about depth rather than sound. Everything else in the
 * combat design happens on a plane; this is the shallow factions' answer to the
 * PR-3 sanctuary, and the reason the Abyssal band feels different to fight in
 * rather than merely different to visit.
 *
 * The load-bearing claim is the **three-dimensional blast**. A depth charge
 * whose blast were measured on the map — the way a mine's is — would reach a
 * hull 1,500 m below it without ever having to descend, and §8 would apply to
 * nothing at all. That is the assertion this file exists for; the rest is the
 * behaviour around it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent, removeEntity } from 'bitecs';
import { DEPTH, Faction, ORDNANCE, OrdnanceKind, SIM, UnitKind, statsFor } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import {
  Acoustic,
  Health,
  Ordnance,
  Owner,
  Position,
  Structure,
  Unit,
} from '../src/sim/components.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function emptyMatch(seed = 61): Match {
  const terrain = new Terrain(12000, 12000, 200);
  const match = new Match(undefined, { fauna: false, seed, terrain });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Owner, eid)) continue;
    if (!hasComponent(match.world, Unit, eid) && !hasComponent(match.world, Structure, eid)) {
      continue;
    }
    removeEntity(match.world, eid);
  }
  return match;
}

function liveCharges(match: Match): number[] {
  const out: number[] = [];
  for (let eid = 0; eid < Ordnance.kind.length; eid++) {
    if (!hasComponent(match.world, Ordnance, eid)) continue;
    if (Ordnance.kind[eid] !== OrdnanceKind.DepthCharge) continue;
    if (Health.hp[eid]! <= 0) continue;
    out.push(eid);
  }
  return out;
}

/** A PR-3 hull that can sit in the Abyssal band and drop into it. */
function deepBomber(match: Match, x: number, y: number, depth: number): number {
  return spawnUnit(match.world, {
    kind: UnitKind.AbyssalSubmersible,
    slot: 0,
    faction: Faction.Directorate,
    x,
    y,
    depth,
  });
}

describe('depth charges', () => {
  it('falls at the standard descent rate and detonates at the depth it was set to', () => {
    // §8 reuses DEPTH's rates rather than authoring its own, so a charge sent
    // down arrives three times faster than one sent up. That asymmetry belongs
    // to systems-depth.md and this test is what keeps the weapon borrowing it
    // rather than quietly forking it.
    const match = emptyMatch();
    const bomber = deepBomber(match, 6000, 6000, 600);
    advance(match, 0.2);

    const charge = match.orderDepthCharge(0, bomber, 1500);
    assert.notEqual(charge, 0, 'the drop should be accepted');
    assert.equal(Position.depth[charge], 600, 'released at the hull, not at the target depth');

    const fallS = (1500 - 600) / DEPTH.DESCENT_RATE_MPS;
    advance(match, fallS * 0.5);
    assert.ok(
      Position.depth[charge]! > 900 && Position.depth[charge]! < 1200,
      `halfway down it should be around 1,050 m, was ${Position.depth[charge]}`
    );

    advance(match, fallS);
    assert.equal(liveCharges(match).length, 0, 'and it should have gone off by now');
  });

  it('reaches a hull one band below and spares one at the surface — the §8 assertion', () => {
    // Two hulls the *same horizontal distance* from where the charge lands,
    // differing only in depth. A blast measured on the map cannot tell them
    // apart; a volumetric one hits exactly the hull the charge was set for.
    // This is the difference between §8 existing and §8 being decoration.
    //
    // The geometry is spread rather than stacked, and the bomber is removed
    // once it has dropped, because the simulation kept interfering with the
    // experiment otherwise: three hulls at one coordinate are shoved apart by
    // separation (the charge landed 188 m from a target it was dropped onto),
    // and a bomber left in the water shoots the shallow hull with its gun.
    const match = emptyMatch();
    const bomber = deepBomber(match, 6000, 6000, 600);

    const below = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 1,
      faction: Faction.Directorate,
      x: 5900,
      y: 6000,
      depth: 2000,
    });
    const shallow = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 1,
      faction: Faction.Directorate,
      x: 6100,
      y: 6000,
      depth: 600,
    });
    advance(match, 0.2);

    // Both are 100 m from the drop point — inside the 180 m blast on the map,
    // and 200 m from each other, which is clear of any separation push.
    assert.ok(Math.abs(Math.hypot(Position.x[below]! - 6000, Position.y[below]! - 6000) - 100) < 5);
    assert.ok(
      Math.abs(Math.hypot(Position.x[shallow]! - 6000, Position.y[shallow]! - 6000) - 100) < 5
    );

    assert.notEqual(match.orderDepthCharge(0, bomber, 2000), 0);
    removeEntity(match.world, bomber);
    // Measured from the drop, not from spawn: the bomber gets a gun cycle off
    // at the shallow hull before it leaves, and that is the gun's business
    // rather than the blast's.
    const belowBefore = Health.hp[below]!;
    const shallowBefore = Health.hp[shallow]!;
    advance(match, (2000 - 600) / DEPTH.DESCENT_RATE_MPS + 2);

    assert.ok(Health.hp[below]! < belowBefore, 'the hull at the set depth should be hit');
    assert.equal(
      Health.hp[shallow],
      shallowBefore,
      'and the hull 1,400 m above it, the same distance away on the map, must not be'
    );
  });

  it('is audible falling, and louder still when it goes off', () => {
    // §1's rule holds for the vertical weapon too: the defender hears it coming
    // down and has the fall time to move. A silent depth charge would be the
    // one unanswerable weapon in the design.
    const match = emptyMatch();
    const bomber = deepBomber(match, 6000, 6000, 600);
    advance(match, 0.2);

    const charge = match.orderDepthCharge(0, bomber, 1400);
    advance(match, 1);
    assert.equal(
      Acoustic.sig[charge],
      ORDNANCE.DEPTH_CHARGE.SIG_FALLING,
      'it should be emitting the whole way down'
    );

    // Catch it mid-ring: the detonation is loud, and stays loud long enough for
    // a 5 Hz detection pass to resolve it at all.
    const fallS = (1400 - 600) / DEPTH.DESCENT_RATE_MPS;
    advance(match, fallS + 0.1);
    assert.equal(
      Acoustic.sig[charge],
      ORDNANCE.DEPTH_CHARGE.SIG_DETONATION,
      'the bang should outlive the bomb'
    );
  });

  it('implodes rather than reaching past its launcher’s rating', () => {
    // The envelope, from the other side: a PR-2 hull cannot bomb the Abyssal
    // band by proxy any more than its torpedoes can chase into it.
    const match = emptyMatch();
    const shallow = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
      depth: 600,
    });
    const deep = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 1,
      faction: Faction.Directorate,
      x: 6000,
      y: 6000,
      depth: 2400,
    });
    advance(match, 0.2);

    assert.notEqual(match.orderDepthCharge(0, shallow, 2400), 0, 'the order is accepted');
    advance(match, (2400 - 600) / DEPTH.DESCENT_RATE_MPS + 2);

    assert.equal(
      Health.hp[deep],
      statsFor(UnitKind.AbyssalSubmersible).maxHp,
      'a PR-2 charge must not reach a hull in the Abyssal band'
    );
    assert.equal(liveCharges(match).length, 0, 'it imploded on the way down');
  });

  it('refuses a depth the map does not have', () => {
    const match = emptyMatch();
    const bomber = deepBomber(match, 6000, 6000, 600);
    advance(match, 0.2);

    assert.equal(match.orderDepthCharge(0, bomber, DEPTH.MAX_M + 1), 0, 'below the floor');
    assert.equal(match.orderDepthCharge(0, bomber, -1), 0, 'above the surface');
    assert.equal(match.orderDepthCharge(0, bomber, Number.NaN), 0, 'not a depth at all');
  });

  it('shares its rack cooldown with the decoy suite, so a hull picks one', () => {
    // Both are rack-launched countermeasures on the same hull, and the shared
    // cooldown is what stops a single hull answering every threat at once.
    const match = emptyMatch();
    const bomber = deepBomber(match, 6000, 6000, 600);
    advance(match, 0.2);

    assert.notEqual(match.orderDepthCharge(0, bomber, 1200), 0);
    assert.equal(match.deployNoisemaker(0, bomber), 0, 'the rack is busy');
    advance(match, ORDNANCE.DEPTH_CHARGE.COOLDOWN_S + 0.5);
    assert.notEqual(match.deployNoisemaker(0, bomber), 0, 'and free again afterwards');
  });
});
