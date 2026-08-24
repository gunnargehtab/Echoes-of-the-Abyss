/**
 * Ordnance and the fog of war — the two invariants ordnance must not break.
 *
 * Both of these were bugs, found by mapping the subsystem rather than by
 * playing it, and both are the kind that never announce themselves:
 *
 *   1. **Ordnance must not listen for its owner.** `spawnOrdnance` sets
 *      `Acoustic.hyd = 0` and calls it deaf, but the Echo Layer's per-HYD table
 *      is built with `Math.max(h, 1)` — so HYD 0 was resolving as HYD 1, which
 *      is *poor* ears rather than *no* ears. A torpedo was scouting for the
 *      player who fired it, and a minefield was a passive sonar picket. Neither
 *      is authorised by docs/systems-combat.md, and §6 is explicit that a mine
 *      waits to hear you — it does not report.
 *
 *   2. **Recycled entity ids must not carry state forward.** bitECS hands ids
 *      back out after `removeEntity`, and `spawnOrdnance` initialised every
 *      `Ordnance` field except the two the mine work added. A torpedo born on a
 *      detonated mine's id inherited `detonatingS > 0` and spent its whole life
 *      as an echo of somebody else's explosion.
 *
 *   3. **The own-ordnance payload must not smuggle a target.** Added after a
 *      review found a third leak that the first two tests structurally could not
 *      see: they count `view.contacts`, and the leak was in `view.ordnance`. A
 *      `locked` flag published "this seeker has a firm solution on a real hull"
 *      — a detection the player had not made, handed over as a boolean. The
 *      guard below is a *shape* assertion rather than a value one, because the
 *      failure mode is somebody adding a helpful field, not somebody computing
 *      an existing one wrongly.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent, removeEntity } from 'bitecs';
import { Faction, ORDNANCE, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Ordnance, Owner, Position, Structure, Unit } from '../src/sim/components.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** Two players, blank water, and an empty board — see firingSolutions.test.ts. */
function emptyMatch(seed = 41): Match {
  const terrain = new Terrain(16000, 16000, 200);
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

/** Contacts slot 0 holds after running for a while. */
function contactCount(match: Match, seconds: number): number {
  let count = 0;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const snapshots = match.update(STEP_MS);
    const view = snapshots?.get(0);
    if (view === undefined) continue;
    count = Math.max(count, view.contacts.length);
  }
  return count;
}

describe('ordnance and the fog of war', () => {
  it('does not scout for the player who launched it', () => {
    // Isolating this claim is fiddly, and both of the obvious ways to set it up
    // are wrong:
    //
    //   - put the target far away and the torpedo runs dry before it is close
    //     enough to overhear anything, so the test passes against the bug;
    //   - make the target an armed hull and it shoots the torpedo down, and
    //     *that* gunfire is legitimately audible to the launcher — a real
    //     contact the torpedo did not leak, which the test would blame on it.
    //
    // So: an unarmed Harvester at SIG 18, 2.5 km out. That is beyond the
    // launcher's own envelope for it (~2.0 km) and inside a 3.2 km run, and a
    // Harvester never fires back.
    const withTorpedo = (fire: boolean): number => {
      const match = emptyMatch();
      const launcher = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 2000,
        y: 8000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Harvester,
        slot: 1,
        faction: Faction.Pelagia,
        x: 4500,
        y: 8000,
      });
      advance(match, 0.2);
      if (fire) launchTorpedo(match.world, launcher, 4500, 8000);
      return contactCount(match, 22);
    };

    assert.equal(
      withTorpedo(false),
      0,
      'the control must hear nothing, or the test proves nothing'
    );
    assert.equal(
      withTorpedo(true),
      0,
      'a torpedo in the water must not add a contact to its owner’s picture'
    );
  });

  it('does not turn a minefield into a sonar picket', () => {
    // Same argument, and the worse case: mines are cheap, numerous and
    // permanent, so a mine that could hear would be the best sensor in the game
    // per nodule spent. The hull that laid the field is removed outright rather
    // than sent away — an earlier draft ordered it to the far corner, and it
    // was still close enough to hear the probe, which made the whole comparison
    // vacuous.
    const withMines = (lay: boolean): number => {
      const match = emptyMatch(43);
      const layer = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 7000,
        y: 8000,
      });
      advance(match, 0.2);
      if (lay) {
        match.layMine(0, layer);
        advance(match, ORDNANCE.MINE.ARMING_S + 0.5);
      }
      removeEntity(match.world, layer);

      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 1,
        faction: Faction.Pelagia,
        // Inside the deaf-ear window a HYD-0 listener would have had on a
        // Cruiser (~350 m), and outside the mine's 150 m trigger.
        x: 7300,
        y: 8000,
      });
      return contactCount(match, 6);
    };

    assert.equal(withMines(false), 0, 'the control must hear nothing');
    assert.equal(
      withMines(true),
      0,
      'a minefield must never report — §6 has a mine wait to hear you, not tell anyone'
    );
  });

  it('gives fresh ordnance a clean slate on a recycled entity id', () => {
    // bitECS recycles ids. Every field of the Ordnance component has to be
    // written at spawn, or a new torpedo inherits whatever the last occupant of
    // that id left behind — here, a mine's detonation ring, which would make
    // the torpedo emit at the mine's SIG and expire without ever running.
    const match = emptyMatch(47);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 8000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 9000,
      y: 8000,
    });
    advance(match, 0.2);

    // Detonate a mine and let it be reaped, freeing its id.
    match.layMine(0, hull);
    advance(match, ORDNANCE.MINE.ARMING_S + 0.5);
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6000,
      y: 8000,
    });
    advance(match, ORDNANCE.MINE.DETONATION_ECHO_S + 2);

    // Now launch. Whatever id this lands on, it must behave like a torpedo.
    const torpedo = launchTorpedo(match.world, hull, 9000, 8000);
    assert.notEqual(torpedo, 0);
    assert.equal(Ordnance.detonatingS[torpedo], 0, 'a fresh torpedo is not mid-detonation');
    assert.equal(Ordnance.armingS[torpedo], 0, 'and it is not still arming');

    const startX = Position.x[torpedo]!;
    advance(match, 1);
    assert.ok(
      hasComponent(match.world, Ordnance, torpedo) === false ||
        Math.abs(Position.x[torpedo]! - startX) > ORDNANCE.TORPEDO.SPEED_MPS * 0.5,
      'and it actually runs, rather than sitting still ringing'
    );
  });

  it('tells its owner nothing about what its seeker has found', () => {
    // A torpedo that has *acquired* is the interesting case: if anything in the
    // payload varies with what the seeker heard, this is where it shows up.
    const match = emptyMatch(53);
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 8000,
    });
    // Loud, close, and straight ahead — a seeker cannot miss it.
    spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 7200,
      y: 8000,
    });
    advance(match, 0.2);

    const torpedo = launchTorpedo(match.world, launcher, 7200, 8000);
    let payload: Record<string, unknown> | undefined;
    let sawLock = false;
    for (let i = 0; i < 60 * 12; i++) {
      const snapshots = match.update(STEP_MS);
      if (!hasComponent(match.world, Ordnance, torpedo)) break;
      if (Ordnance.targetEid[torpedo]! === 0) continue;
      sawLock = true;
      const mine = snapshots?.get(0)?.ordnance?.find((o) => o.id === torpedo);
      if (mine !== undefined) {
        payload = mine as unknown as Record<string, unknown>;
        break;
      }
    }
    assert.ok(sawLock, 'the seeker should have acquired, or this proves nothing');
    assert.ok(payload !== undefined, 'and the owner should be shown their own torpedo');

    // Exactly the fields docs/systems-combat.md §5 says a commander may have:
    // where their weapon is, which way it points, how loud it is, how long it
    // has left. Every one describes the torpedo itself. Nothing describes what
    // it can hear. A new key here is a fog-of-war decision, so it should have to
    // be made deliberately rather than land in a snapshot unnoticed.
    assert.deepEqual(
      Object.keys(payload!).sort(),
      ['depth', 'heading', 'id', 'kind', 'remainingS', 'sig', 'x', 'y'],
      'the own-ordnance payload grew a field — is it about the weapon, or about its target?'
    );

    // And the other side of the same wall: the launcher's torpedo is never in
    // the defender's own-ordnance list. They have to hear it. Snapshots arrive
    // on the 5 Hz Echo tick rather than every step, so this waits for one.
    let defenderChecked = false;
    for (let i = 0; i < 60 && !defenderChecked; i++) {
      const view = match.update(STEP_MS)?.get(1);
      if (view === undefined) continue;
      assert.equal(
        view.ordnance?.some((o) => o.id === torpedo) ?? false,
        false,
        'own-ordnance means own'
      );
      defenderChecked = true;
    }
    assert.ok(defenderChecked, 'the defender should have been sent a snapshot to check');
  });
});
