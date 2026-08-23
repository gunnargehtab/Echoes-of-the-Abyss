/**
 * Echo Marks — the acoustic residue layer (#106).
 *
 * docs/systems-echo.md §7: "A skilled player doesn't scout to find the enemy
 * army — they scout to find *where the enemy has been*, and infer everything
 * else." That makes two properties worth pinning down above all others:
 *
 * - **The HYD >= 40 gate is a wall.** HYD is a soft stat everywhere else; here
 *   it decides whether the past exists for you at all, which is the whole
 *   reason the stat is worth buying. A force of Harvesters (HYD 30) must be
 *   blind to residue a single Light Scout (HYD 70) would read.
 * - **The gate is enforced server-side.** A mark that reaches a client whose
 *   units could not hear it is a maphack, exactly as a contact would be.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECHO_MARKS,
  EchoMarkKind,
  Faction,
  PERSISTENCE,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { EchoMarkLayer } from '../src/sim/echoMarks.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Health, Position } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number) {
  let last = null;
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) last = snapshots;
  }
  return last;
}

/** A match on flat open water, so PF never confounds what is being measured. */
function flatMatch(seed = 21) {
  return new Match(VENTFRONT_DIVIDE, { seed, terrain: new Terrain(8000, 8000, 250) });
}

describe('the residue layer', () => {
  it('merges nearby marks of one kind rather than accumulating them', () => {
    // Without this a thirty-second fight leaves hundreds of overlapping marks
    // and the layer is both a performance problem and an unreadable smear.
    const layer = new EchoMarkLayer();
    for (let i = 0; i < 40; i++) layer.add(EchoMarkKind.Battle, 4000, 4000, 0.05);
    assert.equal(layer.count, 1);
    assert.ok(layer.all[0]!.intensity > 0.9, 'repeated events should saturate one mark');
  });

  it('keeps marks of different kinds separate at the same place', () => {
    const layer = new EchoMarkLayer();
    layer.add(EchoMarkKind.Battle, 4000, 4000);
    layer.add(EchoMarkKind.DestroyedStructure, 4000, 4000);
    assert.equal(layer.count, 2);
  });

  it('pulls a reinforced mark toward the new event rather than teleporting it', () => {
    // A running battle should leave residue over the ground it covered, not
    // jump its mark to wherever the last shot landed.
    const layer = new EchoMarkLayer();
    layer.add(EchoMarkKind.Battle, 4000, 4000, 0.5);
    layer.add(EchoMarkKind.Battle, 4200, 4000, 0.5);
    const mark = layer.all[0]!;
    assert.ok(mark.x > 4000 && mark.x < 4200, `mark drifted to ${mark.x}`);
  });

  it('decays on the spec clock and then disappears', () => {
    const layer = new EchoMarkLayer();
    layer.add(EchoMarkKind.Battle, 4000, 4000);
    const start = layer.all[0]!.intensity;

    layer.tick(PERSISTENCE.BATTLE_SITE_S / 2);
    assert.ok(layer.all[0]!.intensity < start, 'a mark must fade');
    assert.equal(layer.count, 1);

    layer.tick(PERSISTENCE.BATTLE_SITE_S);
    assert.equal(layer.count, 0, 'and then be gone');
  });

  it('outlives a battle site when a structure dies', () => {
    assert.ok(
      PERSISTENCE.DESTROYED_STRUCTURE_S > PERSISTENCE.BATTLE_SITE_S,
      'the spec makes a lost building a longer memory than a fight'
    );
  });

  it('is silent to a listener below the HYD wall, at any range', () => {
    const terrain = new Terrain(8000, 8000, 250);
    const layer = new EchoMarkLayer();
    layer.add(EchoMarkKind.DestroyedStructure, 4000, 4000);

    const out: number[] = [];
    // Standing on top of it, with the loudest mark in the game, one point
    // below the gate.
    layer.readableBy(terrain, 4000, 4000, PERSISTENCE.ECHO_MARK_MIN_HYD - 1, 8000, out);
    assert.deepEqual(out, [], 'below 40 HYD the past does not exist');

    layer.readableBy(terrain, 4000, 4000, PERSISTENCE.ECHO_MARK_MIN_HYD, 8000, out);
    assert.equal(out.length, 1, 'and at exactly 40 it does');
  });

  it('is harder to read through masking terrain', () => {
    // Residue is priced by the same propagation model as a live emitter, so a
    // mark behind a kelp bed is as hard to find as a hull behind one.
    const open = new Terrain(6000, 4000, 250);
    const masked = new Terrain(6000, 4000, 250);
    masked.fillRect(0, 0, 6000, 4000, 1 /* ThermalVein, PF 0.45 */);

    const place = (terrain: Terrain) => {
      const layer = new EchoMarkLayer();
      layer.add(EchoMarkKind.DestroyedStructure, 500, 2000);
      const out: number[] = [];
      // A range where the open-water case is audible and the masked one is
      // the question.
      // 1,700 m: inside the open-water reach of a structure echo and outside
      // the same echo through a thermal vein.
      layer.readableBy(terrain, 2200, 2000, 70, 6000, out);
      return out.length;
    };

    assert.equal(place(open), 1, 'audible in open water');
    assert.equal(place(masked), 0, 'and masked by a thermal vein');
  });
});

describe('marks in a match', () => {
  it('leaves a mark where a structure died, readable by a good listener', () => {
    const match = flatMatch();
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    // A scout with HYD 70, parked near where the loss will happen.
    const scout = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4600,
      y: 4000,
    });
    // Killed by an actual weapon rather than by zeroing HP: deaths become
    // real in reap(), and reap only sees what a system reported.
    match.addPlayer(1, Faction.Pelagia);
    const doomed = spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    const killer = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4300,
      y: 4000,
    });
    Health.hp[doomed] = 5;

    // Observe the whole run: a kill takes as long as the weapon takes.
    let sawMark = false;
    for (let i = 0; i < SIM.TICK_HZ * 8 && !sawMark; i++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      sawMark = snapshots.get(0)!.marks.some((m) => m.kind === EchoMarkKind.DestroyedStructure);
    }
    assert.ok(sawMark, 'a lost structure leaves residue a good listener can read');
    assert.ok(Position.x[scout] === 4600 && killer > 0, 'the scout never moved');
  });

  it('tells a force of Harvesters nothing about the same event', () => {
    // Same scenario, same distance, HYD 30 instead of 70. The only difference
    // is the stat, and the stat is the whole mechanic.
    const match = flatMatch(22);
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const harvester = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4600,
      y: 4000,
    });
    // Residue right on top of it, of the loudest kind there is.
    match.world.marks.add(EchoMarkKind.DestroyedStructure, 4600, 4000);

    const out: number[] = [];
    match.world.marks.readableBy(match.world.terrain, 4600, 4000, 30, 8000, out);
    assert.deepEqual(out, [], 'HYD 30 is below the wall, at any range');
    assert.ok(harvester > 0);

    // ...and the same mark is readable by a scout standing in the same spot.
    match.world.marks.readableBy(match.world.terrain, 4600, 4000, 70, 8000, out);
    assert.equal(out.length, 1, 'the only difference is the stat');
  });

  it('never sends a mark to a player who cannot read it', () => {
    // The server-authority rule, stated as a property: whatever a slot is
    // told, some unit of theirs must clear the HYD wall.
    const match = flatMatch(23);
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const snapshots = advance(match, 2);

    for (const [slot, snapshot] of snapshots!) {
      if (snapshot.marks.length === 0) continue;
      const canRead = snapshot.units.some(
        (u) => u.kind === UnitKind.LightScout || u.kind === UnitKind.Corvette
      );
      assert.ok(canRead, `slot ${slot} was sent marks with nothing able to hear them`);
    }
  });

  it('lays down an industrial hum as cargo is delivered', () => {
    const match = flatMatch(24);
    match.addPlayer(0, Faction.Bathyarch);
    // Long enough for the opening harvester to complete a round trip.
    advance(match, 90);

    const hums = match.world.marks.all.filter((m) => m.kind === EchoMarkKind.IndustrialHum);
    assert.ok(hums.length > 0, 'a working economy should hum');
    assert.ok(hums[0]!.intensity > 0, 'and the hum should have intensity');
  });

  it('collapses the hum when the deliveries stop', () => {
    // docs/economy.md §5's counter-play: the hum is keyed to throughput, not
    // to the building, so it fades on its own once hauling stops.
    const layer = new EchoMarkLayer();
    for (let i = 0; i < 10; i++) layer.add(EchoMarkKind.IndustrialHum, 4000, 4000, 0.12);
    const busy = layer.all[0]!.intensity;

    layer.tick(ECHO_MARKS.HUM_DECAY_S * 0.75);
    const quiet = layer.count === 0 ? 0 : layer.all[0]!.intensity;
    assert.ok(quiet < busy * 0.5, `hum ${busy} -> ${quiet} should collapse without hauling`);
  });

  it('makes a working refinery readable from outside weapon range', () => {
    // The acceptance the mechanic exists for: docs/economy.md §5 wants a
    // scout to find "not the enemy army but the enemy budget", and that is
    // only worth anything if it can be done without walking into the guns.
    // The longest weapon reach in the roster is 900 m; this reads at 1,400.
    const terrain = new Terrain(8000, 8000, 250);
    const layer = new EchoMarkLayer();
    for (let i = 0; i < 8; i++) {
      layer.add(EchoMarkKind.IndustrialHum, 4000, 4000, ECHO_MARKS.HUM_PER_DELIVERY);
    }

    const out: number[] = [];
    layer.readableBy(terrain, 5400, 4000, 70, 8000, out);
    assert.equal(out.length, 1, 'a scout at 1,400 m should hear the economy');
  });

  it('reads a busier economy from further away than a quiet one', () => {
    // "Hum intensity scales with throughput" (docs/economy.md §5), which only
    // means something if intensity changes what a scout can find.
    const terrain = new Terrain(8000, 8000, 250);
    const reach = (deliveries: number) => {
      const layer = new EchoMarkLayer();
      for (let i = 0; i < deliveries; i++) {
        layer.add(EchoMarkKind.IndustrialHum, 4000, 4000, ECHO_MARKS.HUM_PER_DELIVERY);
      }
      let far = 0;
      for (let d = 200; d < 4000; d += 100) {
        const out: number[] = [];
        layer.readableBy(terrain, 4000 + d, 4000, 70, 8000, out);
        if (out.length > 0) far = d;
      }
      return far;
    };

    assert.ok(reach(9) > reach(1), 'a busy economy carries further than a trickle');
  });

  it('fades a held mark between sweeps rather than freezing it', () => {
    // The residue layer is swept over five Echo ticks, so a slot keeps a
    // reading between refreshes. It must keep *fading*: a mark frozen at the
    // intensity it had when the sweep last touched it would tell the player
    // the past is more recent than it is.
    const match = flatMatch(26);
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    match.world.marks.add(EchoMarkKind.Battle, 4000, 4000);

    const first = advance(match, 1)!
      .get(0)!
      .marks.find((m) => m.kind === EchoMarkKind.Battle);
    assert.ok(first !== undefined, 'the scout should hear the battle site it is standing on');
    const before = first.intensity;

    const later = advance(match, 20)!
      .get(0)!
      .marks.find((m) => m.id === first.id);
    assert.ok(later !== undefined, 'and still hear it twenty seconds later');
    assert.ok(later.intensity < before, `intensity ${before} -> ${later.intensity} should fade`);
  });

  it('keeps the residue read inside its share of the Echo budget', () => {
    // The read happens inside the 2 ms Echo pass, which is already the
    // tightest thing in the simulation (#90). Saturate the layer and measure.
    //
    // Asserted on **path integrals**, not on wall-clock. A worst-case timing
    // in a shared test process is a property of the machine — the first
    // version of this test read 0.24, 0.29 and 1.02 ms on three consecutive
    // runs of identical code, because one GC pause is enough to poison a
    // single worst-case sample. Path walks are a property of the algorithm,
    // which is the thing worth holding still.
    //
    // The bar comes from the arithmetic: a path integral measures ~0.20 us on
    // this machine, and the residue read is allotted a quarter of the 2 ms
    // pass, so 0.5 ms / 0.20 us is ~2,500 walks. The wall-clock figure is
    // still logged, because it is what a reviewer actually wants to know.
    const match = flatMatch(25);
    for (let slot = 0; slot < 4; slot++) {
      match.addPlayer(slot, slot as Faction);
    }
    for (let i = 0; i < ECHO_MARKS.MAX_MARKS; i++) {
      match.world.marks.add(
        i % 3 === 0 ? EchoMarkKind.Battle : EchoMarkKind.DestroyedStructure,
        400 + ((i * 613) % 7200),
        400 + ((i * 331) % 7200)
      );
    }

    let worstWalks = 0;
    for (let i = 0; i < SIM.TICK_HZ * 3; i++) {
      if (match.update(STEP_MS) === null) continue;
      worstWalks = Math.max(worstWalks, match.markPathWalksLastPass);
    }

    const WALK_BUDGET = 2500;
    assert.ok(
      worstWalks <= WALK_BUDGET,
      `residue read did ${worstWalks} path integrals, budget ${WALK_BUDGET}`
    );
    console.log(
      `residue read: ${worstWalks} path integrals worst pass, ` +
        `${match.worstMarkCostMs.toFixed(3)} ms wall-clock, at ${ECHO_MARKS.MAX_MARKS} marks / 4 slots`
    );
  });

  it('caps the number of live marks', () => {
    const layer = new EchoMarkLayer();
    for (let i = 0; i < ECHO_MARKS.MAX_MARKS * 2; i++) {
      layer.add(EchoMarkKind.Battle, i * (ECHO_MARKS.MERGE_RADIUS_M + 50), 0);
    }
    assert.ok(layer.count <= ECHO_MARKS.MAX_MARKS, `${layer.count} marks exceeds the cap`);
  });
});
