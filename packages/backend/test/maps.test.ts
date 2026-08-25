/**
 * The authored maps, against the doc that specifies them (#107).
 *
 * PF is the game's main lever — `CLAUDE.md`: "changing a biome's PF changes
 * which factions thrive there" — so a map *is* its PF landscape, and a map
 * whose middle quietly stopped being a masked one would change the game
 * without changing a single number in `constants.ts`.
 *
 * These tests are therefore written against the claims docs/maps.md makes
 * about each archetype, not against the rectangles that happen to implement
 * them. The three maps were chosen to span the PF range, so the sharpest test
 * is the one that checks they actually differ.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Biome,
  CONSTRUCTION,
  CRYSTAL,
  DEPTH,
  Faction,
  MAP_HEADERS,
  PROPAGATION_FACTOR,
  ResourceKind,
  SIM,
  UnitKind,
  mapHeaderById,
} from '@echoes/shared';
import {
  ABYSSAL_RIFT_CORRIDOR,
  DEFAULT_MAP_ID,
  KELP_LABYRINTH,
  MAPS,
  VENTFRONT_DIVIDE,
  mapById,
  terrainFor,
} from '../src/sim/maps/index.ts';
import { Match } from '../src/sim/match.ts';
import type { MapDefinition } from '../src/sim/maps/index.ts';

/** Step a match until it produces an Echo snapshot. */
function advanceToSnapshot(match: Match) {
  for (let i = 0; i < SIM.TICK_HZ; i++) {
    const snapshots = match.update(1000 / SIM.TICK_HZ);
    if (snapshots !== null) return snapshots;
  }
  throw new Error('no snapshot within a second');
}

/** Mean PF over a rectangle, sampled on a grid. */
function meanPf(map: MapDefinition, x: number, y: number, w: number, h: number): number {
  const terrain = terrainFor(map);
  let total = 0;
  let n = 0;
  for (let sy = y; sy < y + h; sy += map.cellM) {
    for (let sx = x; sx < x + w; sx += map.cellM) {
      total += terrain.propagationAt(sx, sy);
      n++;
    }
  }
  return total / n;
}

/** Share of the whole map painted with a given biome. */
function share(map: MapDefinition, biome: Biome): number {
  const terrain = terrainFor(map);
  let hits = 0;
  let n = 0;
  for (let y = 0; y < map.heightM; y += map.cellM) {
    for (let x = 0; x < map.widthM; x += map.cellM) {
      if (terrain.biomeAt(x, y) === biome) hits++;
      n++;
    }
  }
  return hits / n;
}

describe('the map catalogue', () => {
  it('has a default that resolves', () => {
    assert.ok(mapById(DEFAULT_MAP_ID) !== undefined);
    assert.equal(mapById('no-such-map'), undefined);
  });

  it('gives every map a unique id and at least two spawns', () => {
    const ids = new Set(MAPS.map((m) => m.id));
    assert.equal(ids.size, MAPS.length);
    for (const map of MAPS) {
      assert.ok(map.spawns.length >= 2, `${map.id} needs at least two spawns`);
    }
  });

  it('keeps the shared headers honest — seats is the spawn list, one header per map', () => {
    // The shell lists maps from `MAP_HEADERS` before any room exists, so the
    // header is a *claim* about the authored map. `seats` is the one field
    // with independent ground truth — a map's spawn list is its player count
    // — and this is the assertion that keeps a header edit from quietly
    // promising a seat the map cannot spawn.
    assert.equal(MAP_HEADERS.length, MAPS.length);
    for (const map of MAPS) {
      const header = mapHeaderById(map.id);
      assert.ok(header !== undefined, `${map.id} missing from MAP_HEADERS`);
      assert.equal(header.seats, map.spawns.length, `${map.id}: header seats vs spawns`);
    }
  });

  it('keeps every authored point inside its own map', () => {
    // A spawn or field off the edge would clamp silently into the border cell
    // rather than fail, which is the kind of thing nobody notices until a
    // harvester walks into a wall.
    for (const map of MAPS) {
      const inside = (x: number, y: number, what: string) => {
        assert.ok(x >= 0 && x <= map.widthM, `${map.id}: ${what} x=${x} outside`);
        assert.ok(y >= 0 && y <= map.heightM, `${map.id}: ${what} y=${y} outside`);
      };
      for (const spawn of map.spawns) inside(spawn.x, spawn.y, 'spawn');
      for (const node of map.resources) inside(node.x, node.y, 'resource');
      for (const site of map.hazards) inside(site.x, site.y, 'hazard');
      for (const region of map.regions) {
        assert.ok(region.widthM > 0 && region.heightM > 0, `${map.id}: empty region`);
      }
    }
  });

  it('never starts a player in an Abyssal Trench', () => {
    // The Kelp Labyrinth's first draft put its corner pressure pockets exactly
    // on its corner spawns, starting two players in the deepest and loudest
    // biome on the map. Cheap to write down, and it stays true for every map
    // added later.
    for (const map of MAPS) {
      const terrain = terrainFor(map);
      for (const [slot, spawn] of map.spawns.entries()) {
        assert.notEqual(
          terrain.biomeAt(spawn.x, spawn.y),
          Biome.AbyssalTrench,
          `${map.id}: slot ${slot} starts in a trench`
        );
      }
    }
  });

  it('keeps spawns far enough apart to start out of earshot', () => {
    // Two bases within hearing of each other is not an opening, it is a fight
    // — and the Echo Layer would resolve both sides at tick zero.
    for (const map of MAPS) {
      for (let a = 0; a < map.spawns.length; a++) {
        for (let b = a + 1; b < map.spawns.length; b++) {
          const first = map.spawns[a]!;
          const second = map.spawns[b]!;
          const d = Math.hypot(first.x - second.x, first.y - second.y);
          assert.ok(d > 3000, `${map.id}: spawns ${a} and ${b} are only ${d.toFixed(0)} m apart`);
        }
      }
    }
  });

  it('gives every map a crystal field, since the tech tier depends on one', () => {
    for (const map of MAPS) {
      const crystal = map.resources.filter((r) => r.kind === ResourceKind.ResonanceCrystal);
      assert.equal(crystal.length, 1, `${map.id} should have exactly one crystal field`);
    }
  });

  it('gives every map at least one field per spawn', () => {
    for (const map of MAPS) {
      const nodules = map.resources.filter((r) => r.kind === ResourceKind.Nodule);
      assert.ok(
        nodules.length >= map.spawns.length,
        `${map.id}: ${nodules.length} fields for ${map.spawns.length} spawns`
      );
    }
  });
});

describe('Ventfront Divide', () => {
  it('masks its middle and carries sound on its flanks', () => {
    // "Center: Thermal Veins" (PF 0.45) with "North/South: Abyssal Trenches"
    // (PF 1.6). The map's whole proposition is that the contested ground is
    // the quiet ground and the fast routes are the loud ones.
    const middle = meanPf(VENTFRONT_DIVIDE, 3000, 3400, 2000, 1200);
    const north = meanPf(VENTFRONT_DIVIDE, 3000, 0, 2000, 800);

    assert.ok(middle < PROPAGATION_FACTOR[Biome.OpenWater], `middle PF ${middle} should mask`);
    assert.ok(north > PROPAGATION_FACTOR[Biome.OpenWater], `flank PF ${north} should carry`);
    assert.ok(north > middle * 2, 'the flanks must be dramatically louder than the middle');
  });

  it('puts its contested fields inside the masked band', () => {
    const terrain = terrainFor(VENTFRONT_DIVIDE);
    const contested = VENTFRONT_DIVIDE.resources.filter(
      (r) => r.kind === ResourceKind.Nodule && (r.amount ?? 0) > 5000
    );
    assert.ok(contested.length >= 2);
    for (const node of contested) {
      assert.equal(
        terrain.biomeAt(node.x, node.y),
        Biome.ThermalVein,
        'the expansion bait belongs in the vents'
      );
    }
  });
});

describe('Ventfront Divide — the crystal field sits inside both vents', () => {
  it('records the overlap, which is what makes the eruption figure load-bearing', () => {
    // Map *data*, asserted deliberately rather than as trivia, because the
    // gameplay consequence was hidden for a while and should not be again.
    //
    // The Resonance Crystal field is at (4000, 4000). Both geothermal
    // eruptions — (4000, 3500) and (4000, 4500), radius 700 — reach it, from
    // 500 m away each, where the linear falloff leaves 0.286 of centre damage.
    // Their staggers land about a second apart in an 84 s cycle, so they fire
    // effectively together and the field takes a *double* pass.
    //
    // This is the geometry that makes ERUPTION.DAMAGE_PER_S load-bearing rather
    // than cosmetic, which is why it is asserted rather than left as trivia. At
    // the old figure of 90 a combined pass was 334 against a 300 HP Harvester,
    // so a hull put here by `Match.orderHarvest` — the ordinary standing order,
    // which does not withdraw for a warning — died at t+41 s having banked
    // nothing, and the resource gating the tech tree could not be worked at all
    // (#179). The figure is now solved from the lethality rule instead, and the
    // same pass is 175; measured, a harvester banks at t+159 s and comes home.
    //
    // None of that was visible until hazard kills became real deaths: the
    // harvester was being killed and carrying on hauling at zero HP, so the
    // round trip appeared to work and was being completed by a corpse. The two
    // round-trip tests in match.test.ts run on a hazard-free map, which is the
    // right way to test an economy mechanic in isolation — but it means nothing
    // there will ever notice this. Hence here.
    //
    // If either the field or a vent moves, this test fails, and whoever moved
    // it should check `hazards.test.ts`'s "leaves the Ventfront crystal field
    // workable" alongside it — that one asserts the consequence this one only
    // records the cause of.
    const map = VENTFRONT_DIVIDE;
    const field = map.resources.find((r) => r.kind === ResourceKind.ResonanceCrystal)!;
    assert.ok(field !== undefined, 'the map should seed a crystal field');

    const reaching = map.hazards.filter(
      (h) =>
        h.kind === 'geothermal-eruption' && Math.hypot(h.x - field.x, h.y - field.y) <= h.radiusM
    );
    assert.equal(
      reaching.length,
      2,
      'both vents currently cover the crystal field — see the note above if this changed'
    );
  });
});

describe('Abyssal Rift Corridor', () => {
  it('is long and narrow rather than square', () => {
    // "central trench corridor (long, narrow, deep)" — a square map cannot
    // express that, which is why map dimensions are authored per map.
    assert.ok(
      ABYSSAL_RIFT_CORRIDOR.widthM > ABYSSAL_RIFT_CORRIDOR.heightM * 1.5,
      'the corridor needs a long axis'
    );
  });

  it('carries sound the entire length of the rift', () => {
    const terrain = terrainFor(ABYSSAL_RIFT_CORRIDOR);
    const y = ABYSSAL_RIFT_CORRIDOR.heightM / 2;
    // Sampled end to end rather than at the middle: "no secrets" is a claim
    // about the whole corridor, and a trench with a gap in it is a different
    // map from the one the doc describes.
    // Sampled across the rift itself rather than the base aprons at either
    // end — "no secrets" is a claim about the corridor, and a trench with a
    // gap in it is a different map from the one the doc describes.
    const alongAxis = terrain.pathPropagation(2000, y, ABYSSAL_RIFT_CORRIDOR.widthM - 2000, y);
    assert.ok(alongAxis > 1.2, `PF along the rift was ${alongAxis}, expected a highway`);
  });

  it('is louder down its axis than the Ventfront middle is', () => {
    // The reason both maps exist: the same army is a different army on each.
    const rift = meanPf(ABYSSAL_RIFT_CORRIDOR, 2000, 2400, 4000, 1200);
    const vents = meanPf(VENTFRONT_DIVIDE, 3000, 3400, 2000, 1200);
    assert.ok(rift > vents * 2.5, `rift ${rift} vs vents ${vents}`);
  });

  it('has only two spawns, and they face down the long axis', () => {
    assert.equal(ABYSSAL_RIFT_CORRIDOR.spawns.length, 2);
    const [west, east] = ABYSSAL_RIFT_CORRIDOR.spawns;
    assert.ok(west!.x < east!.x);
    assert.equal(west!.y, east!.y, 'a 1v1 corridor should be symmetric across its long axis');
  });
});

describe('Kelp Labyrinth', () => {
  it('is mostly kelp and coral rather than open water', () => {
    // "A dense maze of kelp forests" with a coral outer ring. If open water
    // dominates, the maze is not a maze.
    const kelp = share(KELP_LABYRINTH, Biome.KelpForest);
    const coral = share(KELP_LABYRINTH, Biome.CoralRuins);
    assert.ok(kelp > 0.12, `kelp covers ${(kelp * 100).toFixed(0)}%, expected a dense maze`);
    assert.ok(coral > 0.2, `coral ring covers ${(coral * 100).toFixed(0)}%`);
  });

  it('is quieter across its middle than the other two maps', () => {
    const kelpMid = meanPf(KELP_LABYRINTH, 2000, 2000, 4000, 4000);
    const ventMid = meanPf(VENTFRONT_DIVIDE, 2000, 2000, 4000, 4000);
    const riftMid = meanPf(ABYSSAL_RIFT_CORRIDOR, 2000, 1500, 4000, 3000);
    assert.ok(kelpMid < riftMid, 'the labyrinth must be quieter than the rift');
    assert.ok(kelpMid < 1, `labyrinth mid PF ${kelpMid} should be below open water`);
    assert.ok(ventMid < riftMid);
  });

  it('spans the PF range across the three maps', () => {
    // The point of shipping three: one masked, one loud, one broken. If two
    // of them land on the same PF landscape, the third is doing no work.
    const values = [
      meanPf(KELP_LABYRINTH, 2000, 2000, 4000, 4000),
      meanPf(VENTFRONT_DIVIDE, 3000, 3400, 2000, 1200),
      meanPf(ABYSSAL_RIFT_CORRIDOR, 2000, 2400, 4000, 1200),
    ].sort((a, b) => a - b);
    assert.ok(values[2]! / values[0]! > 2, `PF range ${values[0]}..${values[2]} is too narrow`);
  });
});

describe('a match on an authored map', () => {
  it('spawns each player at an authored spawn, not at a computed corner', () => {
    for (const map of MAPS) {
      const match = new Match(map, { fauna: false, seed: 3 });
      const factions = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];
      for (let slot = 0; slot < map.spawns.length; slot++) {
        match.addPlayer(slot, factions[slot]!);
      }

      // Again from the snapshot, for the same process-global-id reason.
      const snapshots = advanceToSnapshot(match);
      for (let slot = 0; slot < map.spawns.length; slot++) {
        const spawn = map.spawns[slot]!;
        const found = snapshots
          .get(slot)!
          .structures.some((s) => Math.hypot(s.x - spawn.x, s.y - spawn.y) < 1);
        assert.ok(found, `${map.id}: slot ${slot} has no structure on its spawn`);
      }
    }
  });

  it('runs without a unit leaving the map', () => {
    // The corridor map is the one that would catch a leftover assumption
    // about square maps: its height is 6 km against a width of 10 km.
    //
    // Read from the snapshots rather than by scanning the component arrays.
    // bitecs entity ids are process-global, so a scan of `Position` sees every
    // entity every *other* test in this process created, on their own maps —
    // the same trap that broke the state hash and replays before it.
    const match = new Match(ABYSSAL_RIFT_CORRIDOR, { fauna: false, seed: 9 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);

    let checked = 0;
    for (let i = 0; i < SIM.TICK_HZ * 10; i++) {
      const snapshots = match.update(1000 / SIM.TICK_HZ);
      if (snapshots === null) continue;
      for (const snapshot of snapshots.values()) {
        for (const thing of [...snapshot.units, ...snapshot.structures]) {
          checked++;
          assert.ok(
            thing.x >= 0 && thing.x <= ABYSSAL_RIFT_CORRIDOR.widthM,
            `${thing.id} at x=${thing.x} left the map`
          );
          assert.ok(
            thing.y >= 0 && thing.y <= ABYSSAL_RIFT_CORRIDOR.heightM,
            `${thing.id} at y=${thing.y} left the map`
          );
        }
      }
    }
    assert.ok(checked > 0, 'nothing was actually checked');
  });

  it('gives a harvester a field to work on every map', () => {
    for (const map of MAPS) {
      const match = new Match(map, { fauna: false, seed: 4 });
      match.addPlayer(0, Faction.Bathyarch);
      for (let i = 0; i < SIM.TICK_HZ * 3; i++) match.update(1000 / SIM.TICK_HZ);
      const snapshot = match.update(1000 / SIM.TICK_HZ);
      if (snapshot === null) continue;
      const harvester = snapshot.get(0)!.units.find((u) => u.kind === UnitKind.Harvester);
      assert.ok(harvester !== undefined, `${map.id}: no harvester`);
    }
  });
});

describe('every map has water where it seats things', () => {
  // Structures, resource fields and spawns are placed at fixed depths and
  // cannot rise. Hulls can — terrain lifts them (docs/systems-depth.md §2) —
  // so a shallow floor is a cost to a fleet and a fatal authoring error to a
  // refinery. These invariants are the difference between the two.
  //
  // world.ts seats structures at 600 m and nodule fields at 600 m; crystal
  // fields sit at CRYSTAL.FIELD_DEPTH_M. None of them consult the seabed, so
  // nothing but this test stands between a map and a Bastion inside a plateau.
  const STRUCTURE_DEPTH_M = CONSTRUCTION.WORKING_DEPTH_M;
  const NODULE_DEPTH_M = CONSTRUCTION.WORKING_DEPTH_M;

  for (const map of MAPS) {
    describe(map.name, () => {
      it('seats every spawn and its Foundry over deep enough water', () => {
        const terrain = terrainFor(map);
        for (const spawn of map.spawns) {
          assert.ok(
            terrain.admits(spawn.x, spawn.y, STRUCTURE_DEPTH_M),
            `${map.name}: a Bastion at ${spawn.x},${spawn.y} does not fit — floor is ` +
              `${terrain.floorAt(spawn.x, spawn.y)}m, ceiling ${terrain.ceilingAt(spawn.x, spawn.y)}m`
          );
          const fx = spawn.x + spawn.foundryOffsetX;
          const fy = spawn.y + spawn.foundryOffsetY;
          assert.ok(
            terrain.admits(fx, fy, STRUCTURE_DEPTH_M),
            `${map.name}: the Foundry at ${fx},${fy} does not fit — floor is ${terrain.floorAt(fx, fy)}m`
          );
        }
      });

      it('seats every resource field over water deep enough to work it', () => {
        const terrain = terrainFor(map);
        for (const node of map.resources) {
          const depth =
            node.kind === ResourceKind.ResonanceCrystal ? CRYSTAL.FIELD_DEPTH_M : NODULE_DEPTH_M;
          assert.ok(
            terrain.admits(node.x, node.y, depth),
            `${map.name}: a ${node.kind} field at ${node.x},${node.y} works at ${depth}m, ` +
              `but the floor there is ${terrain.floorAt(node.x, node.y)}m`
          );
        }
      });

      it('authors no ground the ruleset cannot describe', () => {
        for (const region of map.regions) {
          if (region.floorM !== undefined) {
            assert.ok(
              region.floorM > 0 && region.floorM <= DEPTH.MAX_M,
              `${map.name}: a floor of ${region.floorM}m is outside the orderable range`
            );
          }
          // A ceiling deeper than its floor is solid ground. Legal, but no map
          // authors one yet, and doing it by accident would silently wall off a
          // region nobody meant to close.
          if (region.ceilingM !== undefined) {
            assert.ok(
              region.ceilingM < (region.floorM ?? map.floorM ?? DEPTH.MAX_M),
              `${map.name}: a ceiling of ${region.ceilingM}m is at or below its own floor, ` +
                `which is solid rock — say so in a note if it is deliberate`
            );
          }
        }
      });

      it('never makes a dive the only way across', () => {
        // The AI has no depth command at all: its vocabulary is attack, build,
        // harvest, move, ping, produce, silent and throttle. A roofed passage
        // is therefore a route only a human can take, so no map may depend on
        // one — the balance harness seats an AI in every slot and would report
        // matches that never make contact.
        const terrain = terrainFor(map);
        for (const spawn of map.spawns) {
          for (const other of map.spawns) {
            if (other === spawn) continue;
            const steps = 200;
            let blocked = 0;
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const x = spawn.x + (other.x - spawn.x) * t;
              const y = spawn.y + (other.y - spawn.y) * t;
              // A hull rises to fit, so the question is never "is this deep
              // enough" — it is "is there any water here at all".
              if (terrain.ceilingAt(x, y) > terrain.floorAt(x, y)) blocked++;
            }
            assert.equal(
              blocked,
              0,
              `${map.name}: the straight line from ${spawn.x},${spawn.y} to ` +
                `${other.x},${other.y} crosses ${blocked} samples of solid ground, and ` +
                `nothing in the simulation can path around it`
            );
          }
        }
      });
    });
  }
});
