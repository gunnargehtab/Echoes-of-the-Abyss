/**
 * Rank in the water — docs/systems-progression.md §3 (#1785).
 *
 * The shared half — thresholds and factors — is
 * `packages/shared/test/rank.test.ts`. What is held here is what §3 says the
 * simulation does with them, and each test is a way rank would otherwise be a
 * number in a table:
 *
 *   - experience is **gun damage dealt plus half of every hit survived**, in the
 *     hull a blow removed, against the hull's **listed** maximum (§3's rulings);
 *   - a torpedo or a mine earns its launcher **nothing**, and shooting one down
 *     earns its gun nothing either;
 *   - a rank's hull **arrives as current hull** and **multiplies** the Plate's,
 *     and a repair keeps it;
 *   - a rank multiplies the **gun** and touches **no SIG** and no torpedo;
 *   - the owner is told the rank, and an enemy only at **Track**, with the
 *     plate still out of the hull it reads.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  FaunaSpecies,
  ORDNANCE,
  OrdnanceKind,
  RANK,
  RefitKind,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  rankedHull,
  refitHullFactor,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Acoustic, Health, Position, SilentRunning, Veterancy } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnOrdnance, spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { orderTarget } from '../src/sim/systems/chase.ts';
import { grantRefit } from '../src/sim/systems/refit.ts';
import { creditTaken } from '../src/sim/systems/rank.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const corvette = statsFor(UnitKind.Corvette);

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** Open water, no creatures, both seats taken. */
function openWater(seed = 7): Match {
  const match = new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(12000, 12000, 200),
  });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

/**
 * A slot-0 Corvette with a slot-1 Corvette 300 m off its bow, running silent so
 * it holds its own fire: one gun in the fight, so every point of experience
 * has one author.
 */
function duel(match: Match): { shooter: number; target: number } {
  const shooter = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x: 6000,
    y: 6000,
  });
  const target = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 1,
    faction: Faction.Pelagia,
    x: 6300,
    y: 6000,
  });
  SilentRunning.active[target] = 1;
  return { shooter, target };
}

/** Rank a Corvette by credit alone, as if it had lived through the hits. */
function rankTo(match: Match, eid: number, rank: number): void {
  const needed = RANK.THRESHOLDS[rank]! * corvette.maxHp - Veterancy.experience[eid]!;
  // Taken is credited at half, so twice the gap.
  creditTaken(match.world, eid, needed / RANK.TAKEN_SHARE);
  assert.equal(Veterancy.rank[eid], rank, 'the premise: the hull ranked');
}

/** Step, keeping the last set of snapshots an Echo pass produced. */
function snapshotsAfter(match: Match, seconds: number): Map<number, EchoSnapshot> {
  let latest: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) latest = match.update(STEP_MS) ?? latest;
  assert.ok(latest !== null, 'the premise: an Echo pass ran');
  return latest;
}

describe('earning a rank', () => {
  it('credits the gun the hull it removed, and its target half of a hit survived', () => {
    const match = openWater();
    const { shooter, target } = duel(match);
    orderTarget(shooter, target, Position.x[target]!, Position.y[target]!, true);
    advance(match, 0.1);

    const lost = corvette.maxHp - Health.hp[target]!;
    assert.equal(lost, corvette.attackDamage, 'the premise: one shell landed');
    assert.equal(Veterancy.experience[shooter], lost, 'dealt: the hull the shell removed');
    assert.equal(Veterancy.experience[target], lost * RANK.TAKEN_SHARE, 'taken: half of it');
  });

  it('counts only the hull a last shot removed, and nothing to the hull it sank', () => {
    const match = openWater();
    const { shooter, target } = duel(match);
    Health.hp[target] = 5;
    orderTarget(shooter, target, Position.x[target]!, Position.y[target]!, true);
    advance(match, 0.1);

    assert.ok(Health.hp[target]! <= 0, 'the premise: the shell sank it');
    assert.equal(Veterancy.experience[shooter], 5, 'a wreck with 5 left gives 5');
    assert.equal(Veterancy.experience[target], 0, 'a hull the hit sank survived nothing');
  });

  it('ranks against the listed hull, and the rank’s hull arrives as current hull', () => {
    const match = openWater();
    const { shooter, target } = duel(match);
    // A plated navy, so `Health.max` is not the listed figure: the threshold
    // must still be 420, not 483 (§3, ruling 3).
    grantRefit(match.world, 0, RefitKind.Plate);
    const plated = Health.max[shooter]!;
    assert.ok(plated > corvette.maxHp, 'the premise: the Plate moved the maximum');
    Veterancy.experience[shooter] = corvette.maxHp - 1;
    Health.hp[shooter] = 200;

    orderTarget(shooter, target, Position.x[target]!, Position.y[target]!, true);
    advance(match, 0.1);

    assert.equal(Veterancy.rank[shooter], 1, 'one shell past 420 is rank 1, plate or none');
    const ranked = Health.max[shooter]!;
    assert.equal(
      ranked,
      Math.fround(rankedHull(corvette.maxHp, 1) * refitHullFactor([RefitKind.Plate])),
      'a rank and the Plate multiply (ruling 4)'
    );
    assert.equal(
      Health.hp[shooter],
      Math.fround(200 + (ranked - plated)),
      'the rank’s hull, as current hull too: the one heal earned under fire'
    );
  });

  it('climbs to the ceiling at three and six times the listed hull, and no further', () => {
    const match = openWater();
    const { shooter } = duel(match);
    for (const [experience, rank] of [
      [corvette.maxHp * 2.99, 1],
      [corvette.maxHp * 3, 2],
      [corvette.maxHp * 6, 3],
      [corvette.maxHp * 60, 3],
    ] as const) {
      creditTaken(
        match.world,
        shooter,
        (experience - Veterancy.experience[shooter]!) / RANK.TAKEN_SHARE
      );
      assert.equal(Veterancy.rank[shooter], rank, `${experience} experience`);
    }
    assert.equal(Health.max[shooter], rankedHull(corvette.maxHp, 3), '+30% at the ceiling');
  });

  it('credits a creature and a structure in full, and a torpedo shot down not at all', () => {
    const match = openWater();
    const { shooter, target } = duel(match);
    // The target stood off: nothing in the shooter's range but what each case puts there.
    Position.x[target] = 11000;

    const draymaw = spawnFauna(match.world, {
      species: FaunaSpecies.Draymaw,
      x: 6300,
      y: 6000,
    });
    orderTarget(shooter, draymaw, Position.x[draymaw]!, Position.y[draymaw]!, true);
    advance(match, 0.1);
    const fromCreature = Veterancy.experience[shooter]!;
    assert.ok(fromCreature > 0, 'a creature shot counts (§3: "counts in full")');
    Position.x[draymaw] = 100;
    Position.y[draymaw] = 100;
    advance(match, corvette.attackCooldownS);

    const yard = spawnStructure(match.world, {
      kind: StructureKind.Foundry,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6300,
      y: 6000,
      prebuilt: true,
    });
    const before = Health.hp[yard]!;
    orderTarget(shooter, yard, Position.x[yard]!, Position.y[yard]!, true);
    advance(match, corvette.attackCooldownS);
    assert.ok(Health.hp[yard]! < before, 'the premise: the yard was shelled');
    assert.equal(
      Veterancy.experience[shooter]! - fromCreature,
      before - Health.hp[yard]!,
      'a structure counts, in the hull it lost'
    );
    Position.x[yard] = 200;

    const torpedo = spawnOrdnance(match.world, {
      kind: OrdnanceKind.Torpedo,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6150,
      y: 6000,
      depth: Position.depth[shooter]!,
      heading: Math.PI,
      pressureRating: 3,
    });
    const banked = Veterancy.experience[shooter]!;
    const hp = Health.hp[torpedo]!;
    advance(match, corvette.attackCooldownS);
    assert.ok(Health.hp[torpedo]! < hp, 'the premise: point defence engaged the torpedo');
    assert.equal(Veterancy.experience[shooter], banked, 'point defence earns nothing');
  });
});

describe('what a launcher and a layer earn', () => {
  it('a mine’s blast is a hit survived for its victim, and nothing for its layer', () => {
    const match = openWater();
    const layer = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    advance(match, 0.2);
    assert.notEqual(match.layMine(0, layer), 0, 'the premise: the mine was laid');
    match.orderMove(0, layer, 11000, 11000);
    advance(match, ORDNANCE.MINE.ARMING_S + 1);

    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5400,
      y: 6000,
    });
    match.orderMove(1, victim, 6600, 6000);
    advance(match, 25);

    const lost = corvette.maxHp - Health.hp[victim]!;
    assert.ok(Health.hp[victim]! > 0 && lost > 0, 'the premise: §9 — survives one, wounded');
    assert.ok(
      Math.abs(Veterancy.experience[victim]! - lost * RANK.TAKEN_SHARE) < 1e-3,
      `half the blast: ${Veterancy.experience[victim]} of ${lost}`
    );
    assert.equal(Veterancy.experience[layer], 0, 'the layer was never there');
  });

  it('crush earns nothing: the water is not a fight', () => {
    const match = openWater();
    const { shooter } = duel(match);
    // A Corvette rated for the Shelf, held deep in the Abyssal.
    Position.depth[shooter] = 2600;
    advance(match, 3);
    assert.ok(Health.hp[shooter]! < corvette.maxHp, 'the premise: crush attrition bit');
    assert.equal(Veterancy.experience[shooter], 0);
  });
});

describe('what a rank does', () => {
  it('multiplies the gun by its own figure, and never the torpedo', () => {
    const match = openWater();
    const { shooter, target } = duel(match);
    rankTo(match, shooter, 2);
    orderTarget(shooter, target, Position.x[target]!, Position.y[target]!, true);
    advance(match, 0.1);
    assert.equal(
      Health.hp[target],
      Math.fround(corvette.maxHp - corvette.attackDamage * RANK.GUN_FACTOR[2]),
      'rank 2: +10% gun damage'
    );

    // A torpedo from a rank-3 hull hits as hard as anyone's (§3).
    const second = openWater();
    const pair = duel(second);
    rankTo(second, pair.shooter, 3);
    Position.x[pair.target] = 7200;
    const torpedo = launchTorpedo(
      second.world,
      pair.shooter,
      Position.x[pair.target]!,
      Position.y[pair.target]!
    );
    assert.notEqual(torpedo, 0, 'the premise: the torpedo left the tube');
    advance(second, 10);
    assert.equal(
      corvette.maxHp - Health.hp[pair.target]!,
      ORDNANCE.TORPEDO.DAMAGE,
      'one hit is one hit'
    );
  });

  it('touches no SIG, stopped or under way', () => {
    const quiet = openWater();
    const veteran = openWater();
    const a = duel(quiet).shooter;
    const b = duel(veteran).shooter;
    rankTo(veteran, b, 3);
    advance(quiet, 0.5);
    advance(veteran, 0.5);
    assert.equal(Acoustic.sig[b], Acoustic.sig[a], 'stopped');
    quiet.orderMove(0, a, 9000, 6000);
    veteran.orderMove(0, b, 9000, 6000);
    advance(quiet, 3);
    advance(veteran, 3);
    assert.equal(Acoustic.sig[b], Acoustic.sig[a], 'under way');
  });

  it('survives a repair: a Tender welds a veteran back to its rank’s hull', () => {
    const match = openWater();
    const { shooter } = duel(match);
    rankTo(match, shooter, 3);
    Health.hp[shooter] = 300;
    spawnUnit(match.world, {
      kind: UnitKind.Tender,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6050,
      y: 6000,
    });
    advance(match, 120);
    assert.equal(Veterancy.rank[shooter], 3, 'a repair keeps the rank');
    assert.equal(Health.hp[shooter], rankedHull(corvette.maxHp, 3), 'and fills its hull');
  });

  it('dies with the hull: its replacement starts at rank 0, at the listed hull', () => {
    // A recycled id's rank is spawnRecycled.test.ts's: it poisons every field of
    // every component a spawn adds, `Veterancy` included.
    const match = openWater();
    const { shooter } = duel(match);
    rankTo(match, shooter, 3);
    Health.hp[shooter] = 0;
    advance(match, 0.1);
    const next = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    assert.equal(Veterancy.rank[next], 0);
    assert.equal(Veterancy.experience[next], 0);
    assert.equal(Health.max[next], corvette.maxHp);
  });
});

describe('who is told', () => {
  it('tells the owner its rank, and its hull is already in the maximum', () => {
    const match = openWater();
    const { shooter, target } = duel(match);
    rankTo(match, shooter, 2);
    const own = snapshotsAfter(match, 0.4).get(0)!.units;
    const vet = own.find((u) => u.id === shooter)!;
    assert.equal(vet.rank, 2);
    assert.equal(vet.maxHp, rankedHull(corvette.maxHp, 2));
    // Absent at rank 0, as on a contact: the field is a rank, not a zero.
    const theirs = snapshotsAfter(match, 0.2).get(1)!.units;
    assert.equal(
      theirs.find((u) => u.id === target)?.rank,
      undefined,
      'a rank-0 hull carries no rank'
    );
  });

  it('tells an enemy at Track and at no lower tier', () => {
    // Heard passively at whatever tier the range gives, and then pinged.
    const below = new Set<number>();
    let tracked = 0;
    for (const range of [2200, 1600, 1200, 800]) {
      const match = openWater();
      const { shooter, target } = duel(match);
      rankTo(match, shooter, 1);
      // Out of the picture: 300 m off the veteran, the duel's target is an ear
      // on the listener's side, and its slot would hold the veteran at Track
      // through it at any range.
      Position.x[target] = 11500;
      Position.y[target] = 11500;
      const listener = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Pelagia,
        x: 6000 - range,
        y: 6000,
      });
      // Half a second of steps first, so the hulls are in the pass's world.
      advance(match, 0.5);
      const passive = match.echo.run(match.world, [0, 1]).contactsBySlot.get(1) ?? [];
      for (const contact of passive) {
        if (match.echo.entityForHandle(1, contact.id) !== shooter) continue;
        if (contact.tier < ResolutionTier.Track) {
          assert.equal(contact.rank, undefined, `${range} m, Tier ${contact.tier}: not told`);
          below.add(contact.tier);
        }
      }
      match.activeSonar(1, listener);
      const pinged = match.echo.run(match.world, [0, 1]).contactsBySlot.get(1) ?? [];
      const lit = pinged.find((c) => match.echo.entityForHandle(1, c.id) === shooter);
      if (lit?.tier !== ResolutionTier.Track) continue;
      assert.equal(lit.rank, 1, `${range} m: told at Track`);
      assert.equal(lit.maxHp, rankedHull(corvette.maxHp, 1), 'its hull, in the health');
      tracked++;
    }
    // The premise, or the loop above proved nothing: a veteran heard at every
    // tier below Track, and lit at Track by the ping.
    assert.deepEqual(
      [...below].sort(),
      [ResolutionTier.Contact, ResolutionTier.Bearing, ResolutionTier.Classification],
      'heard at Tiers 1 to 3'
    );
    assert.ok(tracked > 0, 'lit at Track');
  });

  it('reads a plated veteran at its rank’s hull, exactly as an unplated one', () => {
    // §3: the rank is told and the plate is not. An unplated veteran's stored
    // maximum and a plated one's readout must be one number, or the last bit
    // sorts the navy that bought the plate (docs/systems-echo.md §4, #1294).
    const read = (plate: 'none' | 'before' | 'after', rank: number, wound: number) => {
      const match = openWater();
      const { shooter } = duel(match);
      if (plate === 'before') grantRefit(match.world, 0, RefitKind.Plate);
      rankTo(match, shooter, rank);
      if (plate === 'after') grantRefit(match.world, 0, RefitKind.Plate);
      Health.hp[shooter] = Health.max[shooter]! * wound;
      const pinger = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Pelagia,
        x: 5400,
        y: 6000,
      });
      match.activeSonar(1, pinger);
      const contacts = match.echo.run(match.world, [0, 1]).contactsBySlot.get(1) ?? [];
      const lit = contacts.find((c) => match.echo.entityForHandle(1, c.id) === shooter)!;
      assert.equal(lit.tier, ResolutionTier.Track, 'the premise: lit at Track');
      return lit;
    };
    for (const rank of [1, 2, 3]) {
      const bare = read('none', rank, 1);
      assert.equal(bare.maxHp, rankedHull(corvette.maxHp, rank));
      for (const plate of ['before', 'after'] as const) {
        const plated = read(plate, rank, 1);
        assert.equal(plated.maxHp, bare.maxHp, `rank ${rank}, plated ${plate}: the maximum`);
        assert.equal(plated.hp, bare.hp, `rank ${rank}, plated ${plate}: whole`);
        assert.equal(plated.rank, rank);
      }
      // Hurt, each reads its share of its own hull: the same share, at f32.
      const hurtBare = read('none', rank, 0.5);
      const hurtPlated = read('after', rank, 0.5);
      assert.equal(hurtPlated.hp, hurtBare.hp, `rank ${rank}: half a hull reads as half`);
    }
  });
});
