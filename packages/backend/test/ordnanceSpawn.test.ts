/**
 * What a spawn owes a recycled entity id (#617).
 *
 * bitecs never clears a component store when an entity is removed —
 * `removeEntity` zeroes the entity masks and nothing else — and its `removed`
 * queue is module-global, so ids and the bytes still sitting under them cross
 * matches inside one server process. `addEntity` starts handing those ids back
 * once `removed.length > Math.round(globalSize * removedReuseThreshold)`, which
 * is 1,000 removals with the defaults this repository uses (`createSimWorld`
 * calls `createWorld()` with no size). That is reachable inside one long match
 * and near-certain in the second and later matches on a live server.
 *
 * `spawnOrdnance` therefore has to write *every* field of the `Ordnance`
 * component, every time, and its comment has said so since `armingS` and
 * `detonatingS` were missed when mines were added. `locked` was the third to be
 * missed, and it failed one step further out than a comment can catch: an
 * ordinary tube's torpedo born on a reaped Lance shot's id came into the world
 * already committed, so it ignored the noisemaker its living target dropped in
 * front of it — the decoy silently deleted while the target still lives, which
 * is the entire point of the countermeasure (docs/systems-combat.md §5).
 *
 * So the invariant is held here as a property of the component rather than as a
 * list of fields somebody has to remember to extend: the first test enumerates
 * `Ordnance`'s fields and fails on the *next* one to be missed, not on this one.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addEntity, createWorld, removeEntity } from 'bitecs';
import { Faction, ORDNANCE, OrdnanceKind, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { createSimWorld, spawnOrdnance, spawnUnit } from '../src/sim/world.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Heading, Ordnance } from '../src/sim/components.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

const ORDNANCE_FIELDS = Object.keys(Ordnance) as (keyof typeof Ordnance)[];

/**
 * Write a sentinel under every id of every `Ordnance` store.
 *
 * A cheaper and stricter model of id recycling than reaching the threshold: it
 * poisons whatever id the next spawn happens to be handed, so the test does not
 * have to predict one. The genuine article is exercised below, where the
 * behaviour rather than the field coverage is what is being asked about.
 */
function poisonOrdnanceStores(value: number): void {
  for (const field of ORDNANCE_FIELDS) Ordnance[field].fill(value);
}

describe('spawnOrdnance against a recycled id (#617)', () => {
  it('writes every field of the Ordnance component, so nothing is inherited', () => {
    // Two sentinels rather than one, because "the field still reads the
    // sentinel" is only evidence of an unwritten field if the correct value
    // could not have been the sentinel. A field that is genuinely written
    // reads the same correct value under both fills; one that is not reads
    // whatever it was poisoned with, both times.
    const SENTINELS = [199, 87];
    const readings = SENTINELS.map((sentinel) => {
      poisonOrdnanceStores(sentinel);
      const world = createSimWorld(new Terrain(12000, 12000, 200), 1 / SIM.TICK_HZ, 3);
      const eid = spawnOrdnance(world, {
        kind: OrdnanceKind.Torpedo,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 1000,
        y: 2000,
        depth: 300,
        heading: 1,
        aimX: 4000,
        aimY: 5000,
        seekerHyd: ORDNANCE.TORPEDO.SEEKER_HYD,
        pressureRating: 120,
        targetDepthM: 310,
      });
      const values: Record<string, number> = {};
      for (const field of ORDNANCE_FIELDS) values[field] = Ordnance[field][eid]!;
      return { sentinel, values };
    });
    // Back to what a fresh process looks like, so a later test in this file
    // reads zeroes rather than one of the sentinels above.
    poisonOrdnanceStores(0);

    const missed = ORDNANCE_FIELDS.filter((field) =>
      readings.every((reading) => reading.values[field] === reading.sentinel)
    );
    assert.deepEqual(
      missed,
      [],
      `spawnOrdnance left ${missed.join(', ')} to whatever last held this id. ` +
        `Every Ordnance field must be written in the spawn — see the "every field, ` +
        `every time" note in world.ts, and #617 for what the third omission cost.`
    );
  });

  it('hands a plain tube a reaped Lance shot’s id without its commitment', () => {
    // The reproduction, with the real queue rather than a poisoned store.
    //
    // This test must be the first in the file to remove an entity, and it is:
    // the Lance shot below is the only removal before the drain, so it is at
    // the front of bitecs' `removed` queue and the next spawn is handed it.
    const terrain = new Terrain(12000, 12000, 200);
    const match = new Match(undefined, { fauna: false, seed: 3, terrain });
    match.addPlayer(0, Faction.Hadron);
    match.addPlayer(1, Faction.Pelagia);

    const lance = spawnUnit(match.world, {
      kind: UnitKind.Lance,
      slot: 0,
      faction: Faction.Hadron,
      x: 3000,
      y: 3000,
    });
    Heading.rad[lance] = 0;
    // Spawned before the drain: a hull spawned afterwards would itself be handed
    // the recycled id, and the torpedo would get a fresh one.
    const corvette = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 3000,
      y: 6000,
    });

    const committed = launchTorpedo(match.world, lance, 9000, 3000);
    assert.ok(committed > 0, 'the Lance should fire down its own cone');
    assert.equal(Ordnance.locked[committed], 1, 'and its shot is committed');

    // Exactly what match.ts's reap() does to a spent piece of ordnance.
    removeEntity(match.world, committed);
    assert.equal(
      Ordnance.locked[committed],
      1,
      'bitecs leaves the bytes behind — this is the hazard, not a bug in the test'
    );

    // Cross bitecs' reuse threshold: 1,000 removals with the defaults. Added
    // first and removed afterwards, so every id in the batch comes from the
    // cursor and lands *behind* the Lance shot in the queue rather than
    // consuming it on the way past.
    const scratch = createWorld();
    const batch: number[] = [];
    for (let i = 0; i < 1500; i++) batch.push(addEntity(scratch));
    for (const eid of batch) removeEntity(scratch, eid);

    const plain = launchTorpedo(match.world, corvette, 9000, 6000);
    assert.equal(
      plain,
      committed,
      'the plain tube should have been handed the reaped Lance shot’s id'
    );
    assert.equal(
      Ordnance.locked[plain],
      0,
      'an ordinary tube commits to nothing, whatever last held the id it was given'
    );
  });

  it('re-acquires onto a decoy dropped by its living target, on that same id', () => {
    // The behaviour the field costs, stated where a reader can see the price:
    // `ordnance.ts` gates re-acquisition on `locked !== 1 || targetEid === 0`,
    // and §5 is explicit that a seeker takes "the loudest emitter *now*". A
    // torpedo that inherited the commitment skips the re-acquire while its
    // target is alive, so the decoy is not beaten — it is never consulted.
    const terrain = new Terrain(12000, 12000, 200);
    const match = new Match(undefined, { fauna: false, seed: 3, terrain });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);

    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5500,
      y: 6000,
    });

    // Every id this spawn could be handed is poisoned with a committed shot's
    // `locked`, which is the general form of the case above.
    Ordnance.locked.fill(1);
    advance(match, 0.2);
    const torpedo = launchTorpedo(match.world, launcher, 5500, 6000);
    assert.equal(Ordnance.locked[torpedo], 0, 'the spawn should have cleared the inherited 1');

    advance(match, 1);
    assert.equal(Ordnance.targetEid[torpedo], prey, 'the seeker should start on the hull');

    const decoy = match.deployNoisemaker(1, prey);
    assert.notEqual(decoy, 0, 'the suite should be ready');
    advance(match, ORDNANCE.TORPEDO.SEEKER_INTERVAL_S * 3);

    assert.equal(
      Ordnance.targetEid[torpedo],
      decoy,
      'and should turn onto the decoy its living target dropped'
    );
  });
});
