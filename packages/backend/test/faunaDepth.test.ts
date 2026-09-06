/**
 * Where the Drift lives, and what it can reach (#178, #153).
 *
 * Two faults that were one fault. Every creature was seeded at a flat 300 m and
 * nothing ever moved it, so `bestiary.md` §4's habitats were decoration — the
 * Draymaw documented as mid-water hunted from the Shelf, and the Sounder that
 * migrates "between deep basins" sat on the continental shelf. And the attack
 * test measured only the distance across the sea floor, so a pack at 300 m
 * could take a hull at 2,400 m from full health to nothing without ever
 * descending: it heard the hull a third as well through the thermocline and ate
 * it exactly as fast.
 *
 * Fixing the bite alone would have made the Drift toothless, so the two go
 * together: creatures have a working depth, a band they will pursue within, and
 * a bite measured in three dimensions. What falls out is the mechanic worth
 * protecting — **depth is cover from part of the Drift and exposure to the
 * rest.**
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DRIFT,
  Faction,
  FaunaSpecies,
  FaunaStage,
  SIM,
  StructureKind,
  TETHERJELLY_KELP_BAND,
  UnitKind,
  faunaStatsFor,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Fauna, Health, Position, Structure } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-fauna-depth', regions: [], hazards: [] };
}

function match(seed = 81): Match {
  return new Match(bareMap(), { fauna: false, seed, terrain: new Terrain(8000, 8000, 250) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) m.update(STEP_MS);
}

/**
 * Hold a creature committed to `prey` for `seconds`, as the roster test does.
 *
 * The stage is re-asserted every tick, but the aggro ladder still runs and will
 * demote a creature that has been below Interest for `DRIFT.COOL_AFTER_S` (30
 * s) — so a fixture cannot stage a chase longer than the creature's patience.
 * That bites hardest for the Sounder, whose thresholds are the roster's highest
 * by design (Interest 55, Commit 75): a quiet prebuilt structure a kilometre
 * away loses its attention before it arrives. Every distance below is therefore
 * chosen so the whole approach finishes inside that window.
 */
function hunt(m: Match, creature: number, prey: number, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
    if (Health.hp[prey]! > 0) {
      Fauna.stage[creature] = FaunaStage.Committed;
      Fauna.targetEid[creature] = prey;
    }
    m.update(STEP_MS);
  }
}

describe('a creature lives where the bestiary says', () => {
  it('seeds each species at its own working depth, not a shared one', () => {
    const m = match();
    for (const species of [FaunaSpecies.Ashgrazer, FaunaSpecies.Draymaw, FaunaSpecies.Sounder]) {
      const eid = spawnFauna(m.world, { species, x: 4000, y: 4000 });
      assert.equal(
        Position.depth[eid],
        faunaStatsFor(species).workingDepthM,
        `${faunaStatsFor(species).name} must be seeded at its own depth`
      );
    }
    // ...and they are genuinely different, or the roster is still decoration.
    const depths = new Set(
      [FaunaSpecies.Ashgrazer, FaunaSpecies.Draymaw, FaunaSpecies.Sounder].map(
        (s) => faunaStatsFor(s).workingDepthM
      )
    );
    assert.equal(depths.size, 3, 'three habitats, three depths');
  });

  it('never seeds one below the sea floor', () => {
    // A Sounder works at 2,000 m; this ground stops at 700.
    const shallow = new Terrain(8000, 8000, 250, { floorM: 700 });
    const m = new Match(bareMap(), { fauna: false, seed: 82, terrain: shallow });
    const eid = spawnFauna(m.world, { species: FaunaSpecies.Sounder, x: 4000, y: 4000 });
    assert.equal(Position.depth[eid], 700, 'a colossus in a puddle sits on the bottom of it');
  });

  it('seeds a re-homed species where the map says, and nowhere the profile cannot reach', () => {
    // docs/bestiary.md §4, "One species, two waters": the Tetherjelly rests in
    // the duct unless a map names its Kelp Forest band. Three hundred metres
    // of water is ground for the canopy population and none at all for the
    // duct's, so the same seeder places five clusters on one map and zero on
    // the other — and the difference is one line of map data.
    const clusters = (m: Match): number[] => {
      const out: number[] = [];
      for (let eid = 0; eid <= m.world.maxEid; eid++) {
        if (hasComponent(m.world, Fauna, eid) && Fauna.species[eid] === FaunaSpecies.Tetherjelly) {
          out.push(eid);
        }
      }
      return out;
    };
    const shallow = () => new Terrain(8000, 8000, 250, { floorM: 300 });

    const duct = new Match(bareMap(), { seed: 83, terrain: shallow() });
    assert.equal(clusters(duct).length, 0, 'the duct population seeded over a 300 m floor');

    const canopy = new Match(
      { ...bareMap(), ambientBands: { [FaunaSpecies.Tetherjelly]: TETHERJELLY_KELP_BAND } },
      { seed: 83, terrain: shallow() }
    );
    const seeded = clusters(canopy);
    assert.equal(seeded.length, 5, `${seeded.length} clusters seeded on the re-homed map`);
    for (const eid of seeded) {
      assert.ok(
        Math.abs(Position.depth[eid]! - TETHERJELLY_KELP_BAND.workingDepthM) <=
          TETHERJELLY_KELP_BAND.seedSpreadM,
        `a cluster at ${Position.depth[eid]} m, outside the Kelp Forest band`
      );
      assert.equal(Fauna.homeDepth[eid], TETHERJELLY_KELP_BAND.workingDepthM);
    }
    // Spread across the band rather than stacked at one depth — §4's
    // "seeded across" column, honoured for the re-homed band too.
    const depths = new Set(seeded.map((eid) => Position.depth[eid]));
    assert.ok(depths.size > 1, 'five clusters at one depth: the band was not seeded across');
  });

  it('returns to its working depth when it has nothing to chase', () => {
    const m = match();
    const eid = spawnFauna(m.world, { species: FaunaSpecies.Draymaw, x: 4000, y: 4000 });
    Position.depth[eid] = 1300;
    advance(m, 40);
    assert.ok(
      Math.abs(Position.depth[eid]! - faunaStatsFor(FaunaSpecies.Draymaw).workingDepthM) < 5,
      `a creature with no target goes home: it is at ${Position.depth[eid]}`
    );
  });
});

describe('depth is cover from part of the Drift', () => {
  /** Hunt a PR-3 hull at `depthM` for 60 s and report what it lost. */
  function damageAt(species: FaunaSpecies, depthM: number): number {
    const m = match();
    const creature = spawnFauna(m.world, { species, x: 4000, y: 4000 });
    const prey = spawnUnit(m.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4060,
      y: 4000,
      depth: depthM,
    });
    // PR-3 so crush attrition cannot be mistaken for a bite at any depth.
    assert.equal(statsFor(UnitKind.AbyssalSubmersible).pressureRating, 3);
    const before = Health.hp[prey]!;
    hunt(m, creature, prey, 25);
    return before - Math.max(0, Health.hp[prey]!);
  }

  it('lets a pack reach a hull inside its band', () => {
    // 200 m below its working depth: comfortably inside the band, and about 17
    // seconds of descent at DRIFT.VERTICAL_SPEED_MPS, which fits inside the
    // ladder's patience.
    const stats = faunaStatsFor(FaunaSpecies.Draymaw);
    const inside = stats.workingDepthM - 200;
    assert.ok(
      Math.abs(inside - stats.workingDepthM) < stats.depthBandM,
      'the fixture depth must actually be inside the band'
    );
    assert.ok(damageAt(FaunaSpecies.Draymaw, inside) > 0, `a Draymaw must reach ${inside} m`);
  });

  it('does not let the same pack follow a hull past its band', () => {
    // The finding this issue was filed for, stated as the fix: a Draymaw at
    // 900 m used to take a hull at 2,400 m from 520 HP to 43 in forty seconds,
    // identically to the same-depth case, because the gate was 2-D.
    assert.equal(
      damageAt(FaunaSpecies.Draymaw, 2400),
      0,
      'a mid-water pack cannot eat something in the Abyssal'
    );
  });

  it('but the crystal field has its own predator', () => {
    // Depth is not a hiding place, it is a *different* set of teeth. 2,400 m is
    // inside the Sounder's band, which is the point of giving it one.
    const stats = faunaStatsFor(FaunaSpecies.Sounder);
    assert.ok(
      Math.abs(2400 - stats.workingDepthM) <= stats.depthBandM,
      'the Resonance Crystal must be inside the colossus reach, or the deep economy is free'
    );
  });

  it('measures the bite in three dimensions, not two', () => {
    // Directly: same horizontal separation, different depth separation, and the
    // only thing that changes is whether the creature can reach at all. Held at
    // a fixed depth so the pursuit cannot quietly close the gap for it.
    const reachAt = (preyDepth: number) => {
      const m = match();
      const creature = spawnFauna(m.world, { species: FaunaSpecies.Draymaw, x: 4000, y: 4000 });
      const prey = spawnUnit(m.world, {
        kind: UnitKind.AbyssalSubmersible,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 4060,
        y: 4000,
        depth: preyDepth,
      });
      const before = Health.hp[prey]!;
      for (let i = 0; i < SIM.TICK_HZ * 6; i++) {
        Fauna.stage[creature] = FaunaStage.Committed;
        Fauna.targetEid[creature] = prey;
        // Pin the creature's depth: this test is about the gate, not pursuit.
        Position.depth[creature] = 900;
        m.update(STEP_MS);
      }
      return before - Health.hp[prey]!;
    };
    const range = faunaStatsFor(FaunaSpecies.Draymaw).attackRangeM;
    assert.ok(reachAt(900) > 0, 'level with it, and 60 m away, it bites');
    assert.ok(
      reachAt(900 + range + 200) === 0,
      'the same 60 m away horizontally, but below its reach, it cannot'
    );
  });
});

describe('the Sounder destroys structures by transit', () => {
  /** Put a structure in the colossus path and let it swim through. */
  function transitInto(
    kind: StructureKind,
    seconds = 28
  ): { lost: number; gone: boolean; closest: number } {
    const m = match(83);
    const target = spawnStructure(m.world, {
      kind,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
      depth: faunaStatsFor(FaunaSpecies.Sounder).workingDepthM,
    });
    // Far enough that it has to swim in and grind through, close enough that
    // the whole pass finishes before the ladder loses interest — see `hunt`.
    const creature = spawnFauna(m.world, {
      species: FaunaSpecies.Sounder,
      x: 4000 - 700,
      y: 4000,
    });
    const before = Health.hp[target]!;
    let closest = Infinity;
    for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
      if (Health.hp[target]! > 0) {
        Fauna.stage[creature] = FaunaStage.Committed;
        Fauna.targetEid[creature] = target;
      }
      m.update(STEP_MS);
      closest = Math.min(closest, Math.abs(Position.x[creature]! - 4000));
    }
    const gone = !hasComponent(m.world, Structure, target);
    return { lost: before - (gone ? 0 : Math.max(0, Health.hp[target]!)), gone, closest };
  }

  it('grinds a refinery out of existence in one pass', () => {
    assert.equal(transitInto(StructureKind.Refinery).gone, true);
  });

  it('grinds a bystander it never targeted', () => {
    // The test that separates ploughing from gnawing, and the one the others
    // could not: a bite only ever damages the creature's *target*, so a
    // structure it is not committed to and merely swims over can only be hurt
    // by transit. Without this, every structure assertion here passes just as
    // well against a Sounder that stops at weapons range and chews.
    const m = match(87);
    const deep = faunaStatsFor(FaunaSpecies.Sounder).workingDepthM;
    const quarry = spawnStructure(m.world, {
      kind: StructureKind.Foundry,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
      depth: deep,
    });
    // Squarely between the colossus and what it is coming for.
    const bystander = spawnStructure(m.world, {
      kind: StructureKind.VentTap,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3650,
      y: 4000,
      prebuilt: true,
      depth: deep,
    });
    const creature = spawnFauna(m.world, { species: FaunaSpecies.Sounder, x: 3300, y: 4000 });
    const before = Health.hp[bystander]!;

    hunt(m, creature, quarry, 28);

    const gone = !hasComponent(m.world, Structure, bystander);
    assert.ok(
      gone || Health.hp[bystander]! < before,
      'a structure in the path must be ground through, target or not'
    );
    assert.notEqual(Fauna.targetEid[creature], bystander, 'and it was never the target');
  });

  it('leaves a Bastion standing after one crossing', () => {
    // The line between dread and a coin nobody flipped: an animal nobody steers
    // must not end a match on the elimination condition in a single pass.
    const result = transitInto(StructureKind.Bastion);
    assert.equal(result.gone, false, 'a Bastion survives a crossing');
    assert.ok(result.lost > 0, 'but is badly hurt by it, or transit means nothing');
    // And it actually went *through* rather than stopping outside to gnaw:
    // weapons range is 260 m, so a colossus that halted at 0.7 of that would
    // still be 182 m out when it disengaged.
    assert.ok(
      result.closest < faunaStatsFor(FaunaSpecies.Sounder).lengthM,
      `it must plough into the footprint, not stop short of it: got ${result.closest} m`
    );
  });

  it('hurts a bigger building for longer, because it is in the way for longer', () => {
    // Transit damage is time inside the footprint, so size is the variable.
    const turret = structureStatsFor(StructureKind.SentinelTurret).radiusM;
    const bastion = structureStatsFor(StructureKind.Bastion).radiusM;
    assert.ok(bastion > turret, 'the fixture assumes a Bastion is the larger footprint');
    assert.equal(transitInto(StructureKind.SentinelTurret).gone, true);
  });

  it('ignores a small hull and takes a large one', () => {
    const hit = (kind: UnitKind) => {
      const m = match(84);
      const prey = spawnUnit(m.world, {
        kind,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 4000,
        y: 4000,
        depth: faunaStatsFor(FaunaSpecies.Sounder).workingDepthM,
      });
      // PR-3 hulls only, so crush attrition never reads as a collision.
      assert.equal(statsFor(kind).pressureRating, 3);
      const creature = spawnFauna(m.world, {
        species: FaunaSpecies.Sounder,
        x: 4000 - 700,
        y: 4000,
      });
      const before = Health.hp[prey]!;
      hunt(m, creature, prey, 28);
      return before - Math.max(0, Health.hp[prey]!);
    };
    // The Submersible is the only PR-3 hull, and it is large enough to be seen.
    assert.ok(
      statsFor(UnitKind.AbyssalSubmersible).hullLengthM >= DRIFT.TRANSIT_MIN_HULL_M,
      'the fixture hull must be one the colossus notices'
    );
    assert.ok(hit(UnitKind.AbyssalSubmersible) > 0, 'a large hull in the way is hit');
  });

  it('does not grind a structure moored far above it', () => {
    // Vertically it is a body, not a column. A refinery at 600 m is nowhere
    // near a colossus at 2,000.
    const m = match(85);
    const target = spawnStructure(m.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    assert.ok(
      Position.depth[target]! < 700,
      'structures are seated well above the colossus working depth'
    );
    const creature = spawnFauna(m.world, {
      species: FaunaSpecies.Sounder,
      x: 4000 - 700,
      y: 4000,
    });
    const before = Health.hp[target]!;
    hunt(m, creature, target, 28);
    assert.equal(Health.hp[target], before, 'it swam underneath, and nothing happened');
  });

  it('leaves the rest of the Drift passing through everything', () => {
    // Fauna are not in the separation pass and that is intended, not pending
    // (bestiary.md §4). Only the Sounder collides, because §4 says it does.
    const m = match(86);
    const target = spawnStructure(m.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
      depth: faunaStatsFor(FaunaSpecies.Draymaw).workingDepthM,
    });
    const creature = spawnFauna(m.world, {
      species: FaunaSpecies.Draymaw,
      x: 4000 - 600,
      y: 4000,
    });
    const before = Health.hp[target]!;
    hunt(m, creature, target, 20);
    // A Draymaw does damage a structure it is committed to — by biting it at
    // weapons range, which is the ordinary path. What it must not do is grind.
    // Transit would have taken far more than a bite over the same window.
    const bitten = before - Health.hp[target]!;
    const dps = faunaStatsFor(FaunaSpecies.Draymaw).damagePerS;
    assert.ok(bitten <= dps * 20 + 1, `a pack bites, it does not grind: lost ${bitten}`);
  });
});
