/**
 * Environmental hazards (#105).
 *
 * `docs/hazards.md` specifies eight; two are implemented, chosen to exercise
 * opposite ends of the framework — one that damages hulls and one that
 * attacks information.
 *
 * The property worth pinning down above all others is the **warning phase**.
 * `CLAUDE.md` fixes the target emotion as "dread, not confusion", and an
 * unannounced instant kill teaches a player that the map is arbitrary rather
 * than that it is dangerous. A hazard that damages before it warns is a bug,
 * not a difficulty setting.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import {
  Biome,
  Faction,
  HAZARDS,
  HazardPhase,
  MAX_PROPAGATION_FACTOR,
  PROPAGATION_FACTOR,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  ResourceKind,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Health, Position, Unit } from '../src/sim/components.ts';
import {
  ABYSSAL_RIFT_CORRIDOR,
  KELP_LABYRINTH,
  VENTFRONT_DIVIDE,
  type MapDefinition,
} from '../src/sim/maps/index.ts';
import { dormantSecondsFor, isPermanent, isSimulated } from '../src/sim/systems/hazards.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** Side of the square test map, so wall-relative fixtures can name an edge. */
const MAP_M = 8000;

/** A one-hazard map on flat water, so nothing else is under test. */
function hazardMap(kind: 'geothermal-eruption' | 'resonance-storm', radiusM = 700): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: `test-${kind}`,
    regions: [],
    hazards: [{ x: 4000, y: 4000, radiusM, kind }],
  };
}

function matchWith(map: MapDefinition, seed = 31) {
  const match = new Match(map, { fauna: false, seed, terrain: new Terrain(MAP_M, MAP_M, 250) });
  match.addPlayer(0, Faction.Bathyarch);
  return match;
}

/** Run until the hazard reaches `phase`, returning ticks taken. */
function runUntilPhase(match: Match, phase: HazardPhase, limitS = 200): number {
  for (let i = 0; i < limitS * SIM.TICK_HZ; i++) {
    match.update(STEP_MS);
    if (match.world.hazards[0]!.phase === phase) return i;
  }
  throw new Error(`hazard never reached phase ${phase}`);
}

describe('the hazard lifecycle', () => {
  it('cycles dormant -> warning -> active -> decay -> dormant', () => {
    const match = matchWith(hazardMap('geothermal-eruption'));
    const seen: HazardPhase[] = [];
    let last = match.world.hazards[0]!.phase;
    seen.push(last);

    for (let i = 0; i < 200 * SIM.TICK_HZ && seen.length < 5; i++) {
      match.update(STEP_MS);
      const phase = match.world.hazards[0]!.phase;
      if (phase !== last) {
        seen.push(phase);
        last = phase;
      }
    }

    assert.deepEqual(seen, [
      HazardPhase.Dormant,
      HazardPhase.Warning,
      HazardPhase.Active,
      HazardPhase.Decay,
      HazardPhase.Dormant,
    ]);
  });

  it('never damages anything before it has warned', () => {
    // The rule the whole framework exists to protect. A unit parked on the
    // vent takes nothing at all until the warning has run its course.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const full = Health.hp[victim]!;

    let sawWarning = false;
    for (let i = 0; i < 200 * SIM.TICK_HZ; i++) {
      match.update(STEP_MS);
      const phase = match.world.hazards[0]!.phase;
      if (phase === HazardPhase.Warning) sawWarning = true;
      if (phase === HazardPhase.Active) break;
      assert.equal(Health.hp[victim], full, `damaged during phase ${phase}`);
    }
    assert.ok(sawWarning, 'a hazard must pass through a warning phase');
  });

  it('warns for long enough to walk out of', () => {
    // Sized against the slowest hull in the roster: if a Harvester cannot
    // clear the radius from the centre in the warning window, the warning is
    // decoration.
    const slowest = statsFor(UnitKind.Harvester).speed;
    const map = hazardMap('geothermal-eruption');
    const reach = slowest * HAZARDS.ERUPTION.WARNING_S;
    assert.ok(
      reach >= map.hazards[0]!.radiusM,
      `a Harvester covers ${reach} m in the warning; the plume is ${map.hazards[0]!.radiusM} m`
    );
  });

  it('publishes its phase to every player, because a telegraph must be public', () => {
    const match = matchWith(hazardMap('geothermal-eruption'));
    match.addPlayer(1, Faction.Pelagia);
    let snapshots = null;
    for (let i = 0; i < SIM.TICK_HZ && snapshots === null; i++) snapshots = match.update(STEP_MS);

    for (const snapshot of snapshots!.values()) {
      assert.equal(snapshot.hazards.length, 1);
      assert.equal(snapshot.hazards[0]!.kind, 'geothermal-eruption');
      assert.ok(snapshot.hazards[0]!.remainingS > 0, 'a countdown the HUD can show');
    }
  });
});

describe('geothermal vent eruptions', () => {
  it('damages a hull in the plume and throws it outward', () => {
    const match = matchWith(hazardMap('geothermal-eruption'));
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4200,
      y: 4000,
    });
    const full = Health.hp[victim]!;
    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < SIM.TICK_HZ; i++) match.update(STEP_MS);

    assert.ok(Health.hp[victim]! < full, 'the plume should hurt');
    assert.ok(Position.x[victim]! > 4200, 'and push outward from the vent');
  });

  it('batters a hull against the map edge rather than through it', () => {
    // Knockback is the one force that moves a hull along an axis nobody chose,
    // and a vent near a boundary aims that axis at the wall. Unclamped, the
    // plume threw anything caught between vent and edge clean out of the world:
    // still simulated, still audible, still costing supply, and out of reach of
    // every order its owner could give. Being pinned against the wall is a fair
    // outcome; being outside it is not a position the game has rules for.
    //
    // The same authored 700 m plume as everywhere else in this file, moved hard
    // against the western wall — the warning window is sized against that radius
    // and is not up for renegotiation here.
    const map = hazardMap('geothermal-eruption');
    map.hazards = [{ ...map.hazards[0]!, x: 300, y: 4000 }];

    const match = matchWith(map);
    const { widthM, heightM } = match.world.terrain;
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 150, // between the vent and the wall, with nowhere outward to go
      y: 4000,
    });
    const full = Health.hp[victim]!;
    const from = Position.x[victim]!;

    runUntilPhase(match, HazardPhase.Active);
    let ticks = 0;
    while (match.world.hazards[0]!.phase === HazardPhase.Active) {
      match.update(STEP_MS);
      ticks++;
      const x = Position.x[victim]!;
      const y = Position.y[victim]!;
      assert.ok(x >= 0 && x <= widthM, `thrown to x=${x} after ${ticks} ticks of plume`);
      assert.ok(y >= 0 && y <= heightM, `thrown to y=${y} after ${ticks} ticks of plume`);
    }

    // ...and it was genuinely caught, so the bounds above cannot be satisfied by
    // a hull the eruption simply never reached.
    assert.ok(Health.hp[victim]! < full, 'the hull has to actually be in the plume');
    assert.ok(Position.x[victim]! < from, `and pushed wallward from ${from}`);
  });

  // The western case above states the rule but exercises a quarter of it. Vent
  // and hull share a y there, so dy is exactly 0, the y write adds nothing every
  // tick, and `y >= 0 && y <= heightM` cannot fail however y is clamped; the
  // push is westward, so `x <= widthM` cannot fail either. Only `x >= 0` is
  // load-bearing, and a bounds authority written as `Math.max(0, x)` and nothing
  // else would pass it unchanged.
  //
  // A map has four walls and a vent can sit against any of them, so the same
  // battering runs at each remaining edge: the two vertical walls move an axis
  // the western case never moves at all, and the two far walls test the arm a
  // floor-only clamp would not have.
  //
  // One `it` per wall rather than a loop inside one, so that a clamp broken on a
  // single edge is reported as that edge failing instead of hiding behind
  // whichever case happens to run first.
  //
  // Geometry mirrors the western case exactly — plume 300 m off the wall, hull
  // 150 m inside it — so every one is the same authored 700 m eruption on the
  // same warning window, only rotated. No hazard number moves.
  const walls = [
    { wall: 'northern', vent: { x: 4000, y: 300 }, hull: { x: 4000, y: 150 }, axis: 'y', edge: 0 },
    {
      wall: 'eastern',
      vent: { x: MAP_M - 300, y: 4000 },
      hull: { x: MAP_M - 150, y: 4000 },
      axis: 'x',
      edge: MAP_M,
    },
    {
      wall: 'southern',
      vent: { x: 4000, y: MAP_M - 300 },
      hull: { x: 4000, y: MAP_M - 150 },
      axis: 'y',
      edge: MAP_M,
    },
  ] as const;

  for (const { wall, vent, hull, axis, edge } of walls) {
    it(`batters a hull against the ${wall} edge rather than through it`, () => {
      const map = hazardMap('geothermal-eruption');
      map.hazards = [{ ...map.hazards[0]!, ...vent }];

      const match = matchWith(map);
      const { widthM, heightM } = match.world.terrain;
      assert.equal(widthM, MAP_M, 'the wall fixtures are written against this map size');
      assert.equal(heightM, MAP_M, 'the wall fixtures are written against this map size');

      const victim = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        ...hull,
      });
      const full = Health.hp[victim]!;

      runUntilPhase(match, HazardPhase.Active);
      let ticks = 0;
      while (match.world.hazards[0]!.phase === HazardPhase.Active) {
        match.update(STEP_MS);
        ticks++;
        const x = Position.x[victim]!;
        const y = Position.y[victim]!;
        assert.ok(x >= 0 && x <= widthM, `thrown to x=${x} after ${ticks} ticks of plume`);
        assert.ok(y >= 0 && y <= heightM, `thrown to y=${y} after ${ticks} ticks of plume`);
      }

      // The plume outlasts the 150 m of water between hull and wall, so a hull
      // that merely sat still would satisfy the bounds above for the wrong
      // reason. It has to arrive at the wall — and then stop on it, because
      // pinned against the boundary is a position the game has rules for.
      assert.ok(Health.hp[victim]! < full, 'the hull has to actually be in the plume');
      const pinned = axis === 'x' ? Position.x[victim]! : Position.y[victim]!;
      assert.equal(pinned, edge, 'a battered hull ends up against the wall, on it');
    });
  }

  it('makes a caught hull loud, through the ordinary SIG path', () => {
    // The reason an eruption is an acoustic event and not just damage: being
    // hurt and being found are the same moment.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const idle = statsFor(UnitKind.Corvette).sigIdle;

    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < 10; i++) match.update(STEP_MS);
    assert.ok(
      Acoustic.sig[victim]! > idle * 2,
      `caught SIG ${Acoustic.sig[victim]} should dwarf idle ${idle}`
    );
  });

  it('damages structures too, at a reduced rate', () => {
    // doc §1: "Buildings take reduced damage (but still vulnerable)". This is
    // a regression test: the first implementation queried the separation
    // system's unit grid, which holds *units only* — so structures were never
    // found, and STRUCTURE_DAMAGE_MULTIPLIER was documented, tested against
    // nothing, and could never fire.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const building = spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    const full = Health.hp[building]!;
    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < SIM.TICK_HZ; i++) match.update(STEP_MS);

    const lost = full - Health.hp[building]!;
    assert.ok(lost > 0, 'a building in a plume is still vulnerable');
    // ...and less than a hull in the same place would lose.
    const hullLoss = HAZARDS.ERUPTION.DAMAGE_PER_S;
    assert.ok(lost < hullLoss, `structure lost ${lost}, a hull would lose about ${hullLoss}`);
  });

  it('hurts organic hulls more, per doc §1', () => {
    const damageTo = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'), 700);
      match.addPlayer(1, faction);
      const victim = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4000,
        y: 4000,
      });
      const full = Health.hp[victim]!;
      runUntilPhase(match, HazardPhase.Active);
      for (let i = 0; i < 30; i++) match.update(STEP_MS);
      return full - Health.hp[victim]!;
    };

    assert.ok(
      damageTo(Faction.Pelagia) > damageTo(Faction.Directorate),
      'Pelagia suffers extra damage from eruptions'
    );
  });

  it('barely moves the Directorate, per doc §1', () => {
    const pushOn = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'));
      match.addPlayer(1, faction);
      const victim = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4200,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Active);
      for (let i = 0; i < 30; i++) match.update(STEP_MS);
      return Position.x[victim]! - 4200;
    };

    assert.ok(
      pushOn(Faction.Directorate) < pushOn(Faction.Hadron),
      'Directorate hulls resist knockback'
    );
  });

  it('gives Hadron a longer warning, per doc §1', () => {
    // "Can predict eruptions via resonance sensors." Prediction that tells you
    // only what you would have found out anyway is not prediction; more time
    // to act is.
    const warningFor = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'));
      match.addPlayer(1, faction);
      spawnUnit(match.world, {
        kind: UnitKind.LightScout,
        slot: 1,
        faction,
        x: 4300,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Warning);
      let ticks = 0;
      while (match.world.hazards[0]!.phase === HazardPhase.Warning) {
        match.update(STEP_MS);
        ticks++;
      }
      return ticks;
    };

    assert.ok(
      warningFor(Faction.Hadron) > warningFor(Faction.Pelagia),
      'a Hadron listener sees it coming sooner'
    );
  });

  it('lets a Bathyarch presence stabilise the vent, per doc §1', () => {
    const dormantFor = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'));
      match.addPlayer(1, faction);
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4000,
        y: 4000,
      });
      return runUntilPhase(match, HazardPhase.Warning);
    };

    assert.ok(
      dormantFor(Faction.Bathyarch) > dormantFor(Faction.Hadron),
      'a Consortium hull on the vent holds it back'
    );
  });

  it('stabilising is a delay, not a cancellation', () => {
    // A stabilised vent still erupts. Holding one is a commitment, not a
    // solved problem.
    const match = matchWith(hazardMap('geothermal-eruption'));
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    assert.ok(runUntilPhase(match, HazardPhase.Active, 300) > 0);
  });
});

describe('resonance storms', () => {
  it('degrades resolution inside its area without touching detection code', () => {
    // The storm reaches the Echo Layer as a write to the per-cell PF array,
    // which is the array pathPropagation already reads. If this ever needs a
    // branch in the detection maths, the design has gone wrong.
    const match = matchWith(hazardMap('resonance-storm', 2500));
    match.addPlayer(1, Faction.Pelagia);
    const mine = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3400,
      y: 4000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4600,
      y: 4000,
    });
    assert.ok(mine > 0);

    const bestTier = () => {
      for (let i = 0; i < SIM.TICK_HZ; i++) {
        const snapshots = match.update(STEP_MS);
        if (snapshots === null) continue;
        return snapshots
          .get(0)!
          .contacts.reduce((top, c) => (c.tier > top ? c.tier : top), ResolutionTier.Silent);
      }
      throw new Error('no snapshot');
    };

    const calm = bestTier();
    runUntilPhase(match, HazardPhase.Active);
    const stormy = bestTier();

    assert.ok(calm > ResolutionTier.Silent, 'the pair should resolve in calm water');
    assert.ok(stormy < calm, `resolution ${calm} -> ${stormy} should degrade in a storm`);
  });

  it('restores propagation exactly when it passes', () => {
    // Recomputed from the biome rather than inverted, so a long match cannot
    // drift and two overlapping storms cannot leave a scar.
    const terrain = new Terrain(2000, 2000, 250);
    terrain.fillRect(0, 0, 2000, 2000, Biome.KelpForest);
    const before = terrain.propagationAt(1000, 1000);

    terrain.applyPropagationModifiers([{ x: 1000, y: 1000, radiusM: 800, scale: 0.35 }]);
    assert.ok(terrain.propagationAt(1000, 1000) < before, 'the storm should mask');

    terrain.applyPropagationModifiers([]);
    assert.equal(terrain.propagationAt(1000, 1000), before, 'and leave nothing behind');
  });

  it('composes overlapping modifiers without drifting', () => {
    const terrain = new Terrain(2000, 2000, 250);
    const baseline = PROPAGATION_FACTOR[Biome.OpenWater];
    for (let round = 0; round < 50; round++) {
      terrain.applyPropagationModifiers([
        { x: 1000, y: 1000, radiusM: 900, scale: 0.5 },
        { x: 1100, y: 1000, radiusM: 900, scale: 0.5 },
      ]);
      terrain.applyPropagationModifiers([]);
    }
    assert.equal(terrain.propagationAt(1000, 1000), baseline, 'fifty cycles, no drift');
  });

  it('never pushes PF past the ceiling the broadphase is sized from', () => {
    // A hazard that raised PF beyond MAX_PROPAGATION_FACTOR would make units
    // audible past the radius the Echo pass is willing to search, which reads
    // as detection silently failing rather than as weather.
    const terrain = new Terrain(2000, 2000, 250);
    terrain.fillRect(0, 0, 2000, 2000, Biome.AbyssalTrench);
    terrain.applyPropagationModifiers([{ x: 1000, y: 1000, radiusM: 900, scale: 10 }]);
    // Compared with a tolerance, because the PF grid is a Float32Array: the
    // double 1.6 stored and read back is 1.60000002..., which is fractionally
    // *above* the ceiling it was clamped to. Real, harmless, and not the thing
    // this test is about.
    assert.ok(terrain.propagationAt(1000, 1000) <= MAX_PROPAGATION_FACTOR + 1e-6);
  });

  it('buffs Hadron ears and destabilises Pelagia hulls, per doc §5', () => {
    // One faction per match, deliberately. The first version put a Hadron
    // corvette and a Pelagia one 100 m apart inside the same storm — they
    // promptly shot each other, and the assertion was then reading component
    // data belonging to a freed entity. bitecs leaves that data in place, so
    // the read succeeded and lied.
    const inStorm = (faction: Faction) => {
      const match = matchWith(hazardMap('resonance-storm', 2500));
      match.addPlayer(1, faction);
      const unit = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4000,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Active);
      for (let i = 0; i < 5; i++) match.update(STEP_MS);
      return { hyd: Acoustic.hyd[unit]!, sig: Acoustic.sig[unit]! };
    };

    const baseHyd = statsFor(UnitKind.Corvette).hyd;
    const baseSig = statsFor(UnitKind.Corvette).sigIdle;

    assert.ok(inStorm(Faction.Hadron).hyd > baseHyd, 'Hadron gain in a storm');
    assert.ok(inStorm(Faction.Pelagia).sig > baseSig, 'Pelagia become unstable and loud');
    assert.equal(inStorm(Faction.Directorate).hyd, baseHyd, 'and the Directorate is untouched');
  });

  it('slows Consortium machinery in a storm, per doc §5', () => {
    const distanceCovered = (faction: Faction) => {
      const match = matchWith(hazardMap('resonance-storm', 3000));
      match.addPlayer(1, faction);
      const unit = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 3200,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Active);
      const from = Position.x[unit]!;
      match.orderMove(1, unit, 4800, 4000);
      for (let i = 0; i < SIM.TICK_HZ * 2; i++) match.update(STEP_MS);
      return Position.x[unit]! - from;
    };

    assert.ok(
      distanceCovered(Faction.Bathyarch) < distanceCovered(Faction.Hadron),
      'Consortium machinery malfunctions in a storm'
    );
  });

  it('reports the Echo pass cost with a storm running', () => {
    const match = matchWith(hazardMap('resonance-storm', 3000), 44);
    for (let slot = 1; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
    for (let i = 0; i < 40; i++) {
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: i % 4,
        faction: (i % 4) as Faction,
        x: 2500 + ((i * 197) % 3000),
        y: 2500 + ((i * 331) % 3000),
      });
    }
    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < SIM.TICK_HZ * 3; i++) match.update(STEP_MS);

    console.log(
      `echo pass with a storm active: ${match.worstEchoPassMs.toFixed(3)} ms worst case, ` +
        `budget ${SIM.ECHO_BUDGET_MS} ms`
    );
    assert.ok(match.world.hazards[0]!.phase !== undefined);
  });
});

describe('a hazard kill is a real death', () => {
  it('removes what it kills, rather than stranding it at zero HP forever', () => {
    // `step()` has always claimed a hull killed by an eruption "should die on
    // the tick the eruption killed it" — but `hazardsSystem` took no `destroyed`
    // array and reported nothing, so `reap()` never heard about it. The entity
    // stayed in the world at hp <= 0 with every component intact: still drawn,
    // still emitting, still a contact every listener on the map could resolve,
    // permanently. Nothing swept for it, because the convention here is that a
    // system which deals damage reports its kills.
    //
    // Combat ordnance made this reachable in a new way — a depth charge caught
    // in an eruption becomes an immortal SIG-30 emitter that never detonates
    // and never expires — but the bug was never specific to ordnance, and a
    // hull is the clearest way to state it.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const victim = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    // Sitting at the centre of the plume with almost nothing left, so the
    // eruption is unambiguously what kills it.
    Health.hp[victim] = 1;

    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < SIM.TICK_HZ * 5; i++) match.update(STEP_MS);

    assert.ok(Health.hp[victim]! <= 0, 'the eruption should have killed it');
    assert.equal(
      hasComponent(match.world, Unit, victim),
      false,
      'and it should be gone from the world, not stranded at zero HP'
    );
  });

  it('reaps a zero-HP hull even when nothing at all reported it', () => {
    // The backstop on its own, stated honestly. An earlier version of this was
    // called "does the same for a creature bite" — a name it could not earn,
    // because `matchWith` passes `fauna: false`, so `faunaSystem` early-returns
    // with no creatures in the world and the test drove HP to -1 by hand. It
    // never touched fauna. `faunaSystem`'s kill reporting is covered in
    // fauna.test.ts instead; what this covers is the invariant underneath both,
    // and it is deliberately indifferent to which system forgets next.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const prey = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1200,
      y: 1200,
    });
    Health.hp[prey] = 1;
    // Reproduce what a bite does — damage with no report — and require reap to
    // still find it. This is the invariant, independent of which system is at
    // fault next time.
    Health.hp[prey] = -1;
    for (let i = 0; i < SIM.TICK_HZ * 3; i++) match.update(STEP_MS);
    assert.equal(
      hasComponent(match.world, Unit, prey),
      false,
      'an entity at zero HP must not survive the tick it reached zero'
    );
  });
});

describe('eruption lethality is solved, not picked', () => {
  const passDamageAtCentre = () =>
    HAZARDS.ERUPTION.DAMAGE_PER_S * (HAZARDS.ERUPTION.ACTIVE_S + HAZARDS.ERUPTION.DECAY_S * 0.5);

  it('kills the frailest hull in the roster at the centre of a plume, and no more than that', () => {
    // The rule DAMAGE_PER_S expresses: one full pass at the centre is lethal to
    // the most fragile hull, and is not a blanket delete. A pass is ACTIVE_S at
    // full rate plus DECAY_S at half.
    //
    // It used to be 90, which put a centre pass at 585 — lethal to nearly the
    // whole roster twice over, and the reason #179 existed: the Ventfront
    // crystal field sits inside two plumes at once, so the resource gating the
    // tech tree could not be worked at all.
    //
    // Two-sided on purpose. The lower bound stops the number drifting down
    // until eruptions are scenery; the upper bound stops it drifting back up
    // until every hull in a plume is simply removed, which is what made a
    // 20 s warning pointless for anything that could not outrun it.
    // Anchored on the Harvester, not on the literally frailest hull. The first
    // version of this took `Math.min` across the roster, which is the Light
    // Scout at 180 HP — a bound so loose it still passes at DAMAGE_PER_S 30,
    // where a Harvester strolls through a plume centre and eruptions are
    // scenery. Caught by mutating the constant: the test claimed to pin a
    // derivation it did not pin.
    //
    // The Harvester is the right hull for the same reason docs/hazards.md
    // already uses it to size the warning window ("the slowest hull in the
    // roster clearing the largest authored plume"): it is the one with business
    // sitting inside a plume, because that is where the resource fields are.
    const centre = passDamageAtCentre();
    const worker = statsFor(UnitKind.Harvester).maxHp;
    assert.ok(
      centre >= worker,
      `a full pass at the centre should kill a Harvester (${worker} HP), deals ${centre.toFixed(0)}`
    );
    assert.ok(
      centre < statsFor(UnitKind.Corvette).maxHp,
      `...and should not also delete a warship outright, deals ${centre.toFixed(0)} vs ` +
        `${statsFor(UnitKind.Corvette).maxHp} HP`
    );
  });

  it('leaves the Ventfront crystal field workable, which is what #179 was about', () => {
    // The map case, asserted as arithmetic rather than by running a harvester
    // for three minutes. The field is 500 m from both authored plumes (see
    // maps.test.ts), damage falls off linearly to the rim, and both vents fire
    // effectively together.
    const map = VENTFRONT_DIVIDE;
    const field = map.resources.find((r) => r.kind === ResourceKind.ResonanceCrystal)!;
    const combined = map.hazards
      .filter((h) => h.kind === 'geothermal-eruption')
      .map((h) => Math.hypot(h.x - field.x, h.y - field.y))
      .filter((d) => d <= 700)
      .reduce((sum, d) => sum + passDamageAtCentre() * (1 - d / 700), 0);

    const harvester = statsFor(UnitKind.Harvester).maxHp;
    assert.ok(
      combined < harvester,
      `a harvester on the crystal field must survive a combined pass: ${combined.toFixed(0)} ` +
        `damage vs ${harvester} HP`
    );
    // Pelagia's organic hulls take half again as much and are the binding case.
    assert.ok(
      combined * HAZARDS.ERUPTION.PELAGIA_DAMAGE_MULTIPLIER < harvester,
      `and so must a Commune harvester: ` +
        `${(combined * HAZARDS.ERUPTION.PELAGIA_DAMAGE_MULTIPLIER).toFixed(0)} vs ${harvester} HP`
    );
  });
});

describe('the stagger measures each hazard against its own clock (#181)', () => {
  // Every site gets a head start into its dormancy so a map's hazards do not
  // all fire together. The span that head start is drawn from used to be the
  // eruption's 55 s for every kind, which meant a 100 s storm could only ever
  // begin in the first 55 s of its wait — so all four storms on a map bunched
  // into the back half of their cycle, and no test noticed because the one map
  // with a stagger assertion carries only eruptions.
  const MAPS: MapDefinition[] = [VENTFRONT_DIVIDE, ABYSSAL_RIFT_CORRIDOR, KELP_LABYRINTH];

  it('never seeds a hazard past the end of the dormancy it is waiting in', () => {
    let cycling = 0;
    for (const map of MAPS) {
      const match = matchWith(map, 1);
      for (const hazard of match.world.hazards) {
        if (isPermanent(hazard.kind)) {
          assert.equal(hazard.elapsedS, 0, `${hazard.kind} has no dormancy to be staggered into`);
          continue;
        }
        cycling++;
        const dormancy = dormantSecondsFor(hazard.kind);
        assert.ok(dormancy > 0, `${hazard.kind} is simulated, so it has a wait`);
        assert.ok(
          hazard.elapsedS >= 0 && hazard.elapsedS < dormancy,
          `${hazard.kind} on ${map.id} seeded at ${hazard.elapsedS.toFixed(1)}s ` +
            `of a ${dormancy}s dormancy`
        );
      }
    }
    assert.ok(cycling >= 3, `the fixture must actually carry cycling hazards, saw ${cycling}`);
  });

  it('spreads the longer-waiting kinds across their whole cycle, not its back half', () => {
    // The regression this file could not see before. Storms wait 100 s; scaled
    // by the eruption's 55 s, no storm could be seeded past 55 s, so every one
    // of them had at least 45 s of wait left and none could fire early.
    const storms = matchWith(ABYSSAL_RIFT_CORRIDOR, 1).world.hazards.filter(
      (h) => h.kind === 'resonance-storm'
    );
    assert.ok(storms.length >= 2, `needs several storms to say anything, saw ${storms.length}`);

    const dormancy = dormantSecondsFor('resonance-storm');
    const eruption = dormantSecondsFor('geothermal-eruption');
    assert.ok(eruption < dormancy, 'the two kinds must actually differ for this to mean anything');
    assert.ok(
      storms.some((h) => h.elapsedS > eruption),
      `no storm was seeded past ${eruption}s, which is the old ceiling wearing a new name`
    );
  });

  it('gives every simulated kind a wait to be staggered into, or none at all', () => {
    // A fourth cycling kind that forgot its CYCLES row would seed at 0 and
    // fire on the same tick as its neighbours, which is the bug this whole
    // mechanism exists to prevent.
    for (const map of MAPS) {
      for (const site of map.hazards) {
        if (!isSimulated(site.kind)) continue;
        const dormancy = dormantSecondsFor(site.kind);
        assert.ok(
          isPermanent(site.kind) ? dormancy === 0 : dormancy > 0,
          `${site.kind} is simulated but has no dormancy to wait in`
        );
      }
    }
  });
});
