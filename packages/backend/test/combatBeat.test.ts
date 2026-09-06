/**
 * The beat (#463) — docs/systems-combat.md §9.5.
 *
 * §9 fixes what a fight takes in seconds. §9.5 asks the question those seconds
 * hide: detection resolves at 5 Hz and a contact below Tier 4 is never
 * smoothed, so the enemy half of a fight is a run of discrete snapshots, and a
 * fight is only as deep as the number of them the loser can act in. This file
 * is the measurement that section's table is built on — the fights are played
 * out at 60 Hz through the real combat loop and the real Echo pass, and what is
 * counted is snapshots, not arithmetic.
 *
 * `ttkBands.test.ts` holds the seconds as arithmetic, deliberately; this holds
 * that the arithmetic survives contact with separation, auto-acquire and the
 * snapshot cadence, and that the table §9.5 prints is what a player would
 * actually get. Both are needed: a band can be right on paper and a snapshot
 * short in the water.
 *
 * A hull's own damage is a self-event carried in the next snapshot
 * (docs/ui-ux.md §5), so "first hit" here is the first snapshot in which the
 * losing side could have known it was losing. That is the number the argument
 * in #463 is about.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  ORDNANCE,
  OrdnanceKind,
  SIM,
  SelfEventKind,
  UnitKind,
  statsFor,
  unitRadiusM,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Health } from '../src/sim/components.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function openWaterMatch(seed = 463): Match {
  const terrain = new Terrain(12000, 12000, 200);
  const match = new Match(undefined, { fauna: false, seed, terrain });
  // Neither navy carries a damage doctrine: the Klaxon would put the
  // Consortium's guns above the band, and the beat is a claim about the
  // roster's guns rather than about one navy's.
  match.addPlayer(0, Faction.Pelagia);
  match.addPlayer(1, Faction.Directorate);
  return match;
}

interface Beat {
  /** Snapshot index at which the loser first saw its own hull bleed. */
  firstHit: number;
  /** Snapshot index at which the hull was gone. */
  kill: number;
  /** Snapshots the loser had between the two: the number the beat is. */
  snapshots: number;
}

/**
 * Seconds for a weapon doing `damage` every `cooldownS` to remove `hp`, as
 * ttkBands.test.ts counts it; the expectation the measurement is held to.
 */
function ttkS(hp: number, damage: number, cooldownS: number): number {
  return (Math.ceil(hp / damage) - 1) * cooldownS;
}

/**
 * Walk a match snapshot by snapshot until slot 1's hull `eid` is gone, and
 * count the snapshots between the first one that carried damage to it and the
 * one that carried its loss.
 */
function measure(match: Match, eid: number, maxHp: number, budgetS: number): Beat {
  let snapshot = 0;
  let firstHit = -1;
  for (let tick = 0; tick < budgetS * SIM.TICK_HZ; tick++) {
    const views = match.update(STEP_MS);
    if (views === null) continue;
    snapshot++;
    const view = views.get(1);
    assert.ok(view !== undefined, 'slot 1 should be resolved every Echo pass');
    const own = view.units.find((u) => u.id === eid);
    if (own === undefined || own.hp <= 0) {
      assert.ok(firstHit >= 0, 'a hull cannot be lost before it was hit');
      return { firstHit, kill: snapshot, snapshots: snapshot - firstHit };
    }
    if (firstHit < 0) {
      const told = view.selfEvents.some(
        (e) => e.kind === SelfEventKind.Damaged && e.unitId === eid
      );
      if (told || own.hp < maxHp) firstHit = snapshot;
    }
  }
  assert.fail(`the fight did not resolve inside ${budgetS} s`);
}

/** A gun fight at `separationM`, slot 0's hull against slot 1's. */
function gunBeat(attacker: UnitKind, defender: UnitKind, separationM: number, cold = false): Beat {
  const match = openWaterMatch();
  spawnUnit(match.world, {
    kind: attacker,
    slot: 0,
    faction: Faction.Pelagia,
    x: 6000,
    y: 6000,
  });
  const prey = spawnUnit(match.world, {
    kind: defender,
    slot: 1,
    faction: Faction.Directorate,
    x: 6000 + separationM,
    y: 6000,
    weaponsCold: cold,
  });
  return measure(match, prey, statsFor(defender).maxHp, 90);
}

/** Snapshots at 5 Hz per second of fight, for the assertions below. */
const PER_S = SIM.ECHO_HZ;

/**
 * The measured beat may sit a snapshot or two either side of the arithmetic:
 * the first shot lands on the first tick the gun sees a target, the killing
 * shot lands wherever the cooldown puts it, and each is reported at the next
 * Echo pass rather than on its own tick.
 */
const SLACK = 3;

describe('§9.5 the beat: snapshots between first hit and kill', () => {
  const scout = statsFor(UnitKind.LightScout);
  const corvette = statsFor(UnitKind.Corvette);
  const cruiser = statsFor(UnitKind.Cruiser);
  const rows: string[] = [];

  function hold(name: string, beat: Beat, expectedS: number): void {
    const expected = expectedS * PER_S;
    rows.push(`${name}: ${beat.snapshots} snapshots (${(beat.snapshots / PER_S).toFixed(1)} s)`);
    assert.ok(
      Math.abs(beat.snapshots - expected) <= SLACK,
      `${name}: expected about ${expected} snapshots (${expectedS} s), measured ${beat.snapshots}`
    );
  }

  it('a Corvette on a Light Scout: about 27', () => {
    const beat = gunBeat(UnitKind.Corvette, UnitKind.LightScout, 300);
    hold(
      'Corvette kills Light Scout',
      beat,
      ttkS(scout.maxHp, corvette.attackDamage, corvette.attackCooldownS)
    );
  });

  it('a Corvette duel: about 72', () => {
    // Both awake and both shooting. The hull that fires first wins, and the
    // loser watches every snapshot of it with a gun that is also firing.
    const beat = gunBeat(UnitKind.Corvette, UnitKind.Corvette, 300);
    hold(
      'Corvette vs Corvette',
      beat,
      ttkS(corvette.maxHp, corvette.attackDamage, corvette.attackCooldownS)
    );
  });

  it('a Cruiser on a Corvette: about 37', () => {
    const beat = gunBeat(UnitKind.Cruiser, UnitKind.Corvette, 300);
    hold(
      'Cruiser kills Corvette',
      beat,
      ttkS(corvette.maxHp, cruiser.attackDamage, cruiser.attackCooldownS)
    );
  });

  it('a Corvette on a Cruiser, guns alone: about 207', () => {
    // The Cruiser's guns are cold, or the measurement would be of the other
    // band: an awake Cruiser kills the Corvette in the row above.
    const beat = gunBeat(UnitKind.Corvette, UnitKind.Cruiser, 300, true);
    hold(
      'Corvette kills Cruiser',
      beat,
      ttkS(cruiser.maxHp, corvette.attackDamage, corvette.attackCooldownS)
    );
  });

  it('prints the table §9.5 is built on', () => {
    // After the rows above; node runs a describe's tests in order.
    for (const row of rows) console.log(`  §9.5  ${row}`);
    assert.equal(rows.length, 4);
  });
});

describe('§9.5 the beat: a torpedo, from first hearing to impact', () => {
  /**
   * Launch at a Corvette from `astern` metres and count the snapshots between
   * the torpedo first appearing in the target's contacts and the hit. The
   * launcher runs silent so the only loud thing in the water is the weapon.
   */
  function torpedoBeat(astern: number, running: boolean): { heard: number; hit: number } {
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Pelagia,
      x: 6000 - astern,
      y: 6000,
    });
    // Weapons cold on the prey: an armed Corvette shoots a torpedo down inside
    // the terminal 250 m (§5), which is point defence working and not the
    // number this measures. A cold hull still has ears, and still runs.
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Directorate,
      x: 6000,
      y: 6000,
      weaponsCold: true,
    });
    match.setSilentRunning(0, launcher, true);
    advance(match, 0.4);
    if (running) match.orderMove(1, prey, 11000, 6000);
    const torpedo = launchTorpedo(match.world, launcher, 6000, 6000);
    assert.notEqual(torpedo, 0);

    const maxHp = statsFor(UnitKind.Corvette).maxHp;
    let snapshot = 0;
    let heard = -1;
    for (let tick = 0; tick < 25 * SIM.TICK_HZ; tick++) {
      const views = match.update(STEP_MS);
      if (views === null) continue;
      snapshot++;
      const view = views.get(1)!;
      if (heard < 0 && view.contacts.some((c) => c.ordnance === OrdnanceKind.Torpedo)) {
        heard = snapshot;
      }
      const own = view.units.find((u) => u.id === prey);
      if (own !== undefined && own.hp < maxHp) return { heard, hit: snapshot };
    }
    assert.fail(`no hit inside the run: torpedo hp ${Health.hp[torpedo]}`);
  }

  function advance(match: Match, seconds: number): void {
    const steps = Math.ceil((seconds * 1000) / STEP_MS);
    for (let i = 0; i < steps; i++) match.update(STEP_MS);
  }

  /** The fuse fires a hull radius and a margin early: the run is that much shorter. */
  const fuseM = unitRadiusM(UnitKind.Corvette) + ORDNANCE.TORPEDO.FUSE_MARGIN_M;

  it('is heard from its first snapshot, and a standing hull a kilometre off has ~27', () => {
    const { heard, hit } = torpedoBeat(1000, false);
    assert.ok(heard >= 1 && heard <= 2, `heard at snapshot ${heard}: §1's rule 2, in snapshots`);
    const run = (1000 - fuseM) / ORDNANCE.TORPEDO.SPEED_MPS;
    const beat = hit - heard;
    console.log(
      `  §9.5  Torpedo, 1 km, hull standing: ${beat} snapshots (${(beat / PER_S).toFixed(1)} s)`
    );
    assert.ok(Math.abs(beat - run * PER_S) <= SLACK, `expected about ${run * PER_S}, got ${beat}`);
  });

  it('a running hull 800 m off has ~44, and the table’s 27–60 holds', () => {
    // 800 m at a 75 m/s closing speed once the hull is up to speed: the chase,
    // not the run. A hull starts from rest, so the chase is shorter than the
    // closing arithmetic alone says; what is held is that running buys
    // snapshots, and that the count sits inside the window §9.5 prints.
    const standing = torpedoBeat(800, false);
    const running = torpedoBeat(800, true);
    const beat = running.hit - running.heard;
    const stood = standing.hit - standing.heard;
    console.log(
      `  §9.5  Torpedo, 800 m, hull running: ${beat} snapshots (${(beat / PER_S).toFixed(1)} s)`
    );
    const closing = ORDNANCE.TORPEDO.SPEED_MPS - statsFor(UnitKind.Corvette).speed;
    const chase = ((800 - fuseM) / closing) * PER_S;
    assert.ok(beat > stood + 10, `running should buy snapshots: ${beat} against ${stood} standing`);
    assert.ok(beat <= chase, `and cannot buy more than the closing speed allows (${chase})`);
    assert.ok(beat >= 27 && beat <= 60, 'inside the window §9.5 prints');
  });
});
