/**
 * Ground that changes mid-match (#197) — docs/mission-sorrowgate.md §9.
 *
 * "The arch goes... The service lock is now the only way out." That sentence
 * had no mechanical backing: the lock was authored as the only *roofed* water
 * on the map, but nothing was walled, so after the transit the flight could
 * still run north over open water and never see the lock at all. This file is
 * what makes the sentence checkable.
 *
 * Three claims, and they fail in three different ways if the geometry drifts:
 *
 * - **The collapse lands where it was aimed.** The span is authored as one
 *   250 m cell row, and it has to stay one: a band that reached into the next
 *   row would take the top of the chamber with it and seal the court inside
 *   its own dome. `fillGround` claims a cell by its centre (#157), so a band
 *   laid on the row boundary is exactly that row — but cell arithmetic is not
 *   a thing to leave to a comment either way.
 * - **The lock survives the collapse that crosses it.** The span is painted
 *   whole and the lock is cut back through it, in beat order, the way the map
 *   literal paints later regions over earlier ones.
 * - **The run north goes through the lock.** The claim itself, tested by
 *   walking the ground rather than by driving twenty minutes of simulation:
 *   every route from the chamber to the Concourse passes through the lock's
 *   two columns, or there is no route at all.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  HAZARDS,
  MAX_MODIFIED_PROPAGATION_FACTOR,
  PROPAGATION_FACTOR,
  SIM,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { SOLID, Terrain } from '../src/sim/terrain.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import type { MissionDefinition } from '../src/sim/missions/index.ts';
import { hashWorld } from '../src/sim/stateHash.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const CELL_M = 250;
/** The depth the flight and its freight actually fly at (§11). */
const FLIGHT_DEPTH_M = 1450;

/** Tick of §9's transit. */
const TRANSIT_TICK = (10 * 60 + 40) * SIM.TICK_HZ;

const centreOf = (col: number, row: number) => ({
  x: col * CELL_M + CELL_M / 2,
  y: row * CELL_M + CELL_M / 2,
});

/**
 * Run the prologue to a tick and hand back the match.
 *
 * Shared by everything below that needs the world *after* the transit, because
 * ten minutes of 60 Hz is not a thing to pay for four times.
 */
let afterTransit: Match | null = null;
function transited(): Match {
  if (afterTransit !== null) return afterTransit;
  const match = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId), {
    seed: 5,
    mission: PROLOGUE_SORROWGATE,
    fauna: false,
  });
  for (let tick = 0; tick <= TRANSIT_TICK + 2; tick++) match.update(STEP_MS);
  afterTransit = match;
  return match;
}

/** The prologue's ground, as authored, with nothing having happened to it. */
function authoredGround(): Terrain {
  return terrainFor(missionMapById(PROLOGUE_SORROWGATE.mapId)!);
}

describe('the arch, going', () => {
  it('is open water before the transit and rock after it', () => {
    // A cell in the span, east of the lock and north of the chamber. This is
    // the water the flight was admitted over at 00:00.
    const arch = centreOf(10, 8);

    const before = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId), {
      seed: 5,
      mission: PROLOGUE_SORROWGATE,
      fauna: false,
    });
    for (let tick = 0; tick < TRANSIT_TICK - SIM.TICK_HZ; tick++) before.update(STEP_MS);
    assert.ok(
      before.world.terrain.admits(arch.x, arch.y, FLIGHT_DEPTH_M),
      'the arch was already closed a second before the transit'
    );

    assert.ok(
      !transited().world.terrain.admits(arch.x, arch.y, FLIGHT_DEPTH_M),
      'the arch is still open after the transit'
    );
  });

  it('does not take the top of the chamber with it', () => {
    // The failure the span's height is sized to prevent. The chamber starts at
    // 2,250 m — cell row 9 — and any band that claimed row 9 as well as row 8
    // would seal the court inside its own dome.
    const terrain = transited().world.terrain;
    for (let col = 8; col <= 12; col++) {
      const cell = centreOf(col, 9);
      assert.ok(
        terrain.admits(cell.x, cell.y, FLIGHT_DEPTH_M),
        `the chamber's northern row is rock at column ${col}`
      );
    }
  });

  it('leaves the lock cut through it', () => {
    // Painted over and then cut back, in beat order. The lock is roofed, so
    // "open" here means open *at flight depth* and closed above it — which is
    // the whole reason it is a route nobody can be watched taking.
    const terrain = transited().world.terrain;
    for (const col of [7, 8]) {
      const cell = centreOf(col, 8);
      assert.ok(
        terrain.admits(cell.x, cell.y, FLIGHT_DEPTH_M),
        `the lock is rock at column ${col}`
      );
      assert.ok(
        !terrain.admits(cell.x, cell.y, 900),
        `the lock lost its roof at column ${col} — it is open water, not a lock`
      );
    }
  });

  it('makes the lock the only way north', () => {
    // The claim §9 makes, walked rather than argued. Flood-fill from the
    // chamber at flight depth with the lock's two columns removed: if the
    // Concourse is still reachable, the collapse did not close anything.
    const terrain = transited().world.terrain;
    const cols = Math.ceil(5000 / CELL_M);
    const rows = Math.ceil(4000 / CELL_M);

    const reach = (blockLock: boolean): Set<number> => {
      const seen = new Set<number>();
      // A cell in the court's chamber, where the flight and its freight are.
      const start = 10 * cols + 10;
      const queue = [start];
      seen.add(start);
      while (queue.length > 0) {
        const at = queue.pop()!;
        const col = at % cols;
        const row = (at - col) / cols;
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = col + dc;
          const nr = row + dr;
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
          // The lock is columns 7 and 8 of rows 7-9; blocking it is how the
          // test asks "is there another way?".
          if (blockLock && (nc === 7 || nc === 8) && nr >= 7 && nr <= 9) continue;
          const next = nr * cols + nc;
          if (seen.has(next)) continue;
          const cell = centreOf(nc, nr);
          if (!terrain.admits(cell.x, cell.y, FLIGHT_DEPTH_M)) continue;
          seen.add(next);
          queue.push(next);
        }
      }
      return seen;
    };

    // Somewhere north of the span that a hull at flight depth can actually be:
    // the Descent's floor is 900 m, so the route out is the districts beside
    // it, and the climb is a separate act (§9's 16:00-19:00).
    const north = 6 * cols + 6;

    assert.ok(reach(false).has(north), 'the lock does not lead north at all');
    assert.ok(
      !reach(true).has(north),
      'there is a way north from the chamber that does not use the service lock'
    );
  });
});

describe('ground the match wrote', () => {
  it('is what a joining client is sent, not what the map authored', () => {
    // A reconnection at 15:00 has to land on a map with the arch already down.
    // `serialize` reads the live arrays, so this is really a check that nothing
    // caches the constructed grid on the way to the wire.
    const authored = authoredGround().serialize();
    const played = transited().world.terrain.serialize();
    const differing = played.floor.filter((value, index) => value !== authored.floor[index]).length;
    assert.ok(differing > 0, 'the served grid still matches the authored one');
    assert.equal(played.cols, authored.cols);
    assert.equal(played.rows, authored.rows);
  });

  it('reports only the cells that actually moved', () => {
    // The span is painted across the lock and the lock is cut straight back
    // through it, so those two columns are written twice and end where they
    // started. A delta that reported every write rather than every change
    // would tell the client to seal the lock and then unseal it — which is
    // one frame of the only route out being drawn as rock.
    const terrain = transited().world.terrain;
    const changes = terrain.changesSince(0);
    assert.ok(changes.length > 0, 'nothing was recorded');
    assert.equal(changes.length, terrain.revision, 'revision and the log disagree');

    const cols = Math.ceil(5000 / CELL_M);
    const lockCells = new Set<number>();
    for (const col of [7, 8]) for (const row of [7, 8, 9]) lockCells.add(row * cols + col);
    // Row 8's lock cells are sealed and then re-cut, so they appear twice —
    // but rows 7 and 9 are never sealed, so re-cutting them changes nothing
    // and they must not appear at all.
    for (const row of [7, 9]) {
      for (const col of [7, 8]) {
        const index = row * cols + col;
        assert.ok(
          !changes.some((change) => change.index === index),
          `the lock's untouched cell at row ${row}, column ${col} was reported as changed`
        );
      }
    }
  });

  it('is only the mid-match writes, never the constructed map', () => {
    // `createSimWorld` marks the baseline, so "changed" means "changed during
    // play". Without it the first delta would be the whole map, sent to a
    // client that already has it.
    const fresh = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId), {
      seed: 5,
      mission: PROLOGUE_SORROWGATE,
      fauna: false,
    });
    assert.equal(fresh.world.terrain.revision, 0, 'the map counted as a change');
  });
});

describe('the state hash', () => {
  it('notices ground that changed', () => {
    // Without this a replay could reproduce every hull perfectly while the
    // arch fell on a different tick, and agree at every checkpoint.
    const terrain = Terrain.demo();
    const world = new Match(undefined, { seed: 3, terrain, fauna: false }).world;
    const before = hashWorld(world);
    world.terrain.fillGround(1000, 1000, 500, 500, SOLID);
    assert.notEqual(hashWorld(world), before, 'the hash ignored a collapsed span');
  });

  it('agrees between two identical runs', () => {
    // The other half: the hash must be a function of what happened, not of
    // which process it happened in.
    const run = () => {
      const terrain = Terrain.demo();
      const world = new Match(undefined, { seed: 3, terrain, fauna: false }).world;
      world.terrain.fillGround(1000, 1000, 500, 500, SOLID);
      return hashWorld(world);
    };
    assert.equal(run(), run());
  });
});

describe('ground that closes over a hull', () => {
  it('does not hold one that is already inside it', () => {
    // Terrain became writable, so a hull can find itself in rock without ever
    // having moved into any. Every branch of `resolveStep` tests the
    // destination, so before this a hull in a sealed cell had no admitting
    // neighbour to step to and was entombed for the rest of the match.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    const out = { x: 0, y: 0 };

    // Seal the cell a hull is standing in, and nothing around it.
    terrain.fillGround(1000, 1000, 200, 200, SOLID);
    assert.ok(!terrain.admits(1100, 1100, 1450), 'the cell was not sealed');
    assert.ok(terrain.admits(1100, 1400, 1450), 'the neighbouring cell is not open');

    // A *small* step, which is the only kind movement takes: a hull crossing a
    // 250 m cell at cruise does it a couple of metres a tick, so the first
    // dozen steps out of a sealed cell all end inside it. Testing one long
    // jump straight to open water would pass on the old code too, because the
    // destination admits and the very first branch takes it.
    let x = 1100;
    let y = 1100;
    for (let step = 0; step < 200; step++) {
      terrain.resolveStep(x, y, x, y + 2, 1450, out);
      assert.ok(out.y > y, `a hull sealed into the ground stopped moving at ${out.y}`);
      x = out.x;
      y = out.y;
      if (terrain.admits(x, y, 1450)) break;
    }
    assert.ok(terrain.admits(x, y, 1450), 'the hull never reached water it is admitted to');

    // …and nothing outside may walk in. The sealed cell is x 1,000-1,250, so
    // this step starts in the open column beside it and aims across the border.
    terrain.resolveStep(1300, 1100, 1240, 1100, 1450, out);
    assert.equal(out.x, 1300, 'a hull in open water stepped into ground that admits nothing');
    assert.equal(out.y, 1100);
  });
});

/**
 * The acoustic half of the same beat (#259) — docs/environments.md, *Coral
 * Ruins*.
 *
 * #197 made the geometry writable; this is the water. The distinction that
 * makes these tests worth having is that PF has two writers now — a biome
 * write and the hazard pass — and the failure mode is not "the number is
 * wrong" but "the two writers disagree about a cell and nobody notices until a
 * storm passes over it".
 */
describe('the water a beat rewrites', () => {
  it('changes propagation at the tick it happens, with no storm to wait for', () => {
    // The bug this forbids: `applyPropagationModifiers` recomputes `pf` from
    // `biomes`, so a biome write *would* eventually be picked up — but it runs
    // only on a storm phase boundary. On a map with no weather that is never,
    // and the ruins would sound like open water for the rest of the match.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    assert.equal(terrain.propagationAt(1100, 1100), PROPAGATION_FACTOR[Biome.OpenWater]);

    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.CoralRuins });

    assert.equal(terrain.biomeAt(1100, 1100), Biome.CoralRuins);
    // `Math.fround`, not a tolerance: `pf` is a Float32Array, so what comes back
    // is the single-precision round of the constant rather than the constant.
    // The exact equality is still worth having — it says the cell holds the
    // biome's own factor and not something composed with it.
    assert.equal(
      terrain.propagationAt(1100, 1100),
      Math.fround(PROPAGATION_FACTOR[Biome.CoralRuins])
    );
  });

  it('is integrated by the walk detection actually uses', () => {
    // `propagationAt` and `pathPropagation` read the same array, and the
    // comment on `propagationAt` records what it cost the last time they
    // diverged: a Resonance Storm invisible to every caller of one while fully
    // visible to the other. A biome write must not reopen that.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    const before = terrain.pathPropagation(1050, 1100, 1450, 1100);
    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.CoralRuins });
    const after = terrain.pathPropagation(1050, 1100, 1450, 1100);

    assert.ok(after < before, `the walk did not quieten: ${before} then ${after}`);
    // The whole segment lies inside the painted rectangle, so the integral is
    // the biome's own factor rather than something between the two.
    assert.ok(
      Math.abs(after - PROPAGATION_FACTOR[Biome.CoralRuins]) < 1e-6,
      `the walk read ${after}, not the ruins' ${PROPAGATION_FACTOR[Biome.CoralRuins]}`
    );
  });

  it('composes with a storm already standing over it, rather than cancelling it', () => {
    // The sharp one. PF is recomputed from the biome and never inverted, so a
    // write that set the cell to its new biome's bare baseline would erase a
    // live storm's multiplier — and the storm would only come back at its next
    // phase boundary, seconds later, with detection wrong in between.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    const storm = [{ x: 1100, y: 1100, radiusM: 400, scale: HAZARDS.STORM.PF_MULTIPLIER }];
    terrain.applyPropagationModifiers(storm);
    assert.ok(
      Math.abs(
        terrain.propagationAt(1100, 1100) -
          PROPAGATION_FACTOR[Biome.OpenWater] * HAZARDS.STORM.PF_MULTIPLIER
      ) < 1e-6,
      'the storm was not applied'
    );

    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.AbyssalTrench });

    const expected = PROPAGATION_FACTOR[Biome.AbyssalTrench] * HAZARDS.STORM.PF_MULTIPLIER;
    assert.ok(
      Math.abs(terrain.propagationAt(1100, 1100) - expected) < 1e-6,
      `the storm was cancelled: ${terrain.propagationAt(1100, 1100)}, expected ${expected}`
    );

    // …and the next hazard rebuild must land on the same number, or the two
    // writers have simply disagreed later instead of sooner.
    terrain.applyPropagationModifiers(storm);
    assert.ok(Math.abs(terrain.propagationAt(1100, 1100) - expected) < 1e-6);
  });

  it('never writes a cell louder than the broadphase will search', () => {
    // The Echo pass sizes its broadphase from the grid's live peak (#372). A
    // cell above it is audible past the radius the pass is willing to look,
    // which reads as detection failing rather than as loud water. So the
    // invariant is two halves, asserted where a mid-match biome write meets a
    // modifier: the write leaves no cell above the peak the grid reports, and
    // the peak itself never exceeds the loudest anything is specified to make a
    // cell — the corridor's 2.0, which a storm ×4 over a trench reaches.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    terrain.applyPropagationModifiers([{ x: 1100, y: 1100, radiusM: 400, scale: 4 }]);
    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.AbyssalTrench });
    // Against the float32 round of the ceiling, because that is the widest
    // value the array can actually hold at the ceiling — the clamp itself runs
    // in double precision, and storing rounds it up by a few ulps.
    const written = terrain.propagationAt(1100, 1100);
    assert.ok(written <= terrain.peakPf, `a cell was written at ${written}, above the peak`);
    assert.ok(
      terrain.peakPf <= Math.fround(MAX_MODIFIED_PROPAGATION_FACTOR),
      `the peak is ${terrain.peakPf}`
    );
  });

  it('leaves the ground alone when the beat only names water, and the reverse', () => {
    // Biome and ground stay independent — the argument `fillGround`'s comment
    // makes about kelp on a plateau. A beat that turns the water must not
    // quietly flatten the seabed under it.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    terrain.fillGround(1000, 1000, 500, 500, { floorM: 900 });
    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.KelpForest });

    assert.equal(terrain.floorAt(1100, 1100), 900, 'the biome write moved the floor');
    assert.equal(terrain.biomeAt(1100, 1100), Biome.KelpForest);

    terrain.fillGround(1000, 1000, 500, 500, { floorM: 800 });
    assert.equal(terrain.biomeAt(1100, 1100), Biome.KelpForest, 'the ground write moved the biome');
  });

  it('reports a cell whose biome moved and nothing else', () => {
    // The dedupe in `fillGround` compares the fields it wrote. Before the biome
    // joined them, a biome-only write moved neither floor nor ceiling and would
    // have been dropped as "nothing changed" — the client would keep drawing
    // and hearing the old water forever.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    terrain.markBaseline();
    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.CoralRuins });
    const changes = terrain.changesSince(0);
    assert.ok(changes.length > 0, 'a biome-only write was reported as no change');
    assert.ok(changes.every((change) => change.biome === Biome.CoralRuins));

    // And repainting the same biome costs the wire nothing.
    const revision = terrain.revision;
    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.CoralRuins });
    assert.equal(terrain.revision, revision, 'an idempotent repaint was sent');
  });

  it('lands a replaying client on the grid a joining client is served', () => {
    // The two paths into a client's biome array: `serialize` on join, and
    // `changesSince` for a client holding an older cursor. A field carried by
    // one and not the other is a map that differs by when you connected.
    const terrain = new Terrain(4000, 4000, 250, { floorM: 1600 });
    terrain.fillRect(0, 0, 4000, 4000, Biome.OpenWater);
    terrain.markBaseline();
    const joinedEarly = terrain.serialize().biomes.slice();

    terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.CoralRuins, floorM: 900 });
    terrain.fillGround(1200, 1200, 300, 300, { biome: Biome.ThermalVein });

    // The late joiner is served the live arrays.
    const joinedLate = terrain.serialize().biomes;
    // The early joiner replays the log from its cursor, exactly as
    // `EchoRenderer.applyGround` does.
    for (const change of terrain.changesSince(0)) joinedEarly[change.index] = change.biome;

    assert.deepEqual(joinedEarly, joinedLate, 'the two clients hold different water');
  });
});

describe('the state hash, on water', () => {
  it('notices a biome change that moved no ground', () => {
    // The ground fields alone cannot see this: a replay in which the ruins came
    // down on a different tick would agree at every checkpoint while the two
    // runs heard different maps.
    const terrain = Terrain.demo();
    const world = new Match(undefined, { seed: 3, terrain, fauna: false }).world;
    const before = hashWorld(world);
    world.terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.CoralRuins });
    assert.notEqual(hashWorld(world), before, 'the hash ignored water that changed');
  });

  it('agrees between two identical runs', () => {
    const run = () => {
      const terrain = Terrain.demo();
      const world = new Match(undefined, { seed: 3, terrain, fauna: false }).world;
      world.terrain.fillGround(1000, 1000, 500, 500, { biome: Biome.CoralRuins });
      return hashWorld(world);
    };
    assert.equal(run(), run());
  });
});

/**
 * Synthetic, for `missionEmitters.test.ts`'s reason: no catalogue mission
 * authors a biome change yet — the fiction of what brings a gallery down
 * belongs to whichever mission spec calls for it — and this is the mechanism's
 * proof.
 *
 * The region is laid inside Sorrowgate's Thermal Vein — cells x 250–1,250,
 * y 1,500–2,250, all six columns of which the map paints Vein — and the beat
 * turns it to ruins. Vein and ruins were chosen because they are far apart
 * acoustically: PF 0.45 becomes 0.80, so water that masked now carries, and a
 * write that silently did nothing could not pass as rounding.
 */
const RUINS_REGION = { x: 250, y: 1500, widthM: 1000, heightM: 750 };
/** Inside the region, on a cell centre the beat is certain to claim. */
const IN_THE_RUINS = { x: 625, y: 1875 };
const COLLAPSE_TICK = 3 * SIM.TICK_HZ;

const RUINS_MISSION: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-ruins-mission',
  doc: 'docs/environments.md, Coral Ruins — the test authoring',
  fauna: false,
  regions: [{ id: 'dome', ...RUINS_REGION, note: 'The gallery, and the water under it' }],
  lifts: [],
  markers: [],
  parties: [],
  locks: [],
  objectives: [],
  beats: [
    {
      atTick: COLLAPSE_TICK,
      kind: 'ground',
      region: 'dome',
      biome: Biome.CoralRuins,
      note: 'The gallery over the vents comes down, and the water stops masking',
    },
  ],
};

describe('a mission beat that changes the water', () => {
  it('changes propagation at the authored tick, and not before', () => {
    // The beat is what a mission actually has to reach for, so the plumbing is
    // only proven end to end here: types.ts through runtime.ts into the grid.
    // "Not before" is half the claim — a change that landed at match start
    // would be a map edit wearing a beat's clothes, and the mission's own
    // timing would stop meaning anything.
    const match = new Match(missionMapById(RUINS_MISSION.mapId), {
      seed: 11,
      mission: RUINS_MISSION,
      fauna: false,
    });
    const terrain = match.world.terrain;
    const before = terrain.propagationAt(IN_THE_RUINS.x, IN_THE_RUINS.y);
    assert.notEqual(
      terrain.biomeAt(IN_THE_RUINS.x, IN_THE_RUINS.y),
      Biome.CoralRuins,
      'the map already authored the ruins, so this proves nothing'
    );

    // Asserted *before* each step, because the beat fires on the update that
    // lands on its tick rather than on the one after it.
    while (match.tick < COLLAPSE_TICK) {
      assert.equal(
        terrain.propagationAt(IN_THE_RUINS.x, IN_THE_RUINS.y),
        before,
        `the water changed at tick ${match.tick}, before the beat`
      );
      match.update(STEP_MS);
    }
    assert.equal(match.tick, COLLAPSE_TICK);

    assert.equal(terrain.biomeAt(IN_THE_RUINS.x, IN_THE_RUINS.y), Biome.CoralRuins);
    assert.equal(
      terrain.propagationAt(IN_THE_RUINS.x, IN_THE_RUINS.y),
      Math.fround(PROPAGATION_FACTOR[Biome.CoralRuins])
    );
    // And it is on the wire, under the revision the room broadcasts.
    const changes = terrain.changesSince(0);
    assert.ok(
      changes.some((change) => change.biome === Biome.CoralRuins),
      'the beat wrote the grid but told no client'
    );
  });
});
