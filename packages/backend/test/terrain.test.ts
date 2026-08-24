/**
 * Path-integrated propagation (issue #37): the water *between* emitter and
 * listener prices the sound, not the emitter's cell alone.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DEPTH,
  Faction,
  PROPAGATION_FACTOR,
  ResolutionTier,
  UnitKind,
} from '@echoes/shared';
import { Terrain } from '../src/sim/terrain.ts';
import { EchoLayer } from '../src/sim/systems/echoLayer.ts';
import { createSimWorld, spawnUnit } from '../src/sim/world.ts';

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe('Terrain.pathPropagation', () => {
  it('reduces to the point sample in uniform water', () => {
    const t = new Terrain(4000, 4000, 250);
    assert.ok(close(t.pathPropagation(100, 100, 3900, 3900), PROPAGATION_FACTOR[Biome.OpenWater]));
    assert.ok(close(t.pathPropagation(100, 100, 100, 100), t.propagationAt(100, 100)));
  });

  it('weights each biome by the length of path crossing it', () => {
    const t = new Terrain(4000, 1000, 250);
    // Kelp painted to x=2000; fillRect's inclusive end cell makes the actual
    // covered span [0, 2250) — the expectation prices the cells, not the ask.
    t.fillRect(0, 0, 2000, 1000, Biome.KelpForest);
    const kelpM = 2250;
    const expected =
      (PROPAGATION_FACTOR[Biome.KelpForest] * kelpM +
        PROPAGATION_FACTOR[Biome.OpenWater] * (4000 - kelpM)) /
      4000;
    const mean = t.pathPropagation(0, 500, 4000, 500);
    assert.ok(Math.abs(mean - expected) < 0.02, `expected ~${expected}, got ${mean}`);
  });

  it('a trench carries sound down its axis far more than across it', () => {
    const t = new Terrain(8000, 8000, 250);
    // North-south trench, like the demo map's acoustic highway (grid rounds
    // the painted 500 m up to 750 m of cells).
    t.fillRect(3800, 0, 500, 8000, Biome.AbyssalTrench);
    const along = t.pathPropagation(4050, 500, 4050, 7500); // down the axis
    const across = t.pathPropagation(2500, 4000, 5600, 4000); // straight over it
    assert.ok(
      close(along, PROPAGATION_FACTOR[Biome.AbyssalTrench], 1e-6),
      'axis path is all trench'
    );
    assert.ok(
      across < 1.2,
      `a crossing picks up only the trench's width (got ${across.toFixed(3)})`
    );
    assert.ok(along > across + 0.4, 'the axis must out-carry the crossing decisively');
  });
});

describe('Terrain bounds', () => {
  /**
   * Direct cover for `clampXM`/`clampYM`, the single authority every system
   * that displaces a hull now writes through — separation, eruption knockback
   * and `Match.orderMove`.
   *
   * These are API tests, not regression tests: the methods are new, so there is
   * no older behaviour for them to fail against. They exist because the clamps
   * are otherwise only ever observed as a side effect three systems downstream,
   * where a wrong answer arrives as a strange unit position rather than as a
   * failing bound.
   *
   * Deliberately not square. With widthM === heightM a `clampYM` that consulted
   * widthM would be indistinguishable from a correct one.
   */
  const t = new Terrain(4000, 3000, 250);

  it('leaves a position already inside the map alone', () => {
    assert.equal(t.clampXM(1234.5), 1234.5);
    assert.equal(t.clampYM(1234.5), 1234.5);
  });

  it('counts both edges as part of the map', () => {
    // Inclusive, because being pinned against the wall has to be a legal place
    // to be — that is the whole outcome the knockback clamp is aiming for — and
    // because the biome grid already floors widthM into its last cell rather
    // than off the end.
    assert.equal(t.clampXM(0), 0);
    assert.equal(t.clampYM(0), 0);
    assert.equal(t.clampXM(t.widthM), t.widthM);
    assert.equal(t.clampYM(t.heightM), t.heightM);
  });

  it('pulls anything past an edge back onto it', () => {
    assert.equal(t.clampXM(-0.5), 0);
    assert.equal(t.clampYM(-0.5), 0);
    assert.equal(t.clampXM(t.widthM + 0.5), t.widthM);
    assert.equal(t.clampYM(t.heightM + 0.5), t.heightM);
    // However hard it was thrown. Knockback scales with plume falloff, so the
    // overshoot is not bounded by anything the clamp gets to assume.
    assert.equal(t.clampXM(-1e6), 0);
    assert.equal(t.clampYM(1e6), t.heightM);
  });

  it('clamps each axis against its own dimension', () => {
    assert.equal(t.clampXM(3500), 3500, 'inside the width');
    assert.equal(t.clampYM(3500), t.heightM, 'and past the height');
  });
});

describe('Terrain water column', () => {
  // The design these pin is docs/systems-depth.md §1: a hull at depth D fits
  // where ceiling <= D <= floor. Nothing enforces it in the simulation yet —
  // this slice is the data and the accessors — so these are API tests, not
  // regressions.

  it('is a flat map at the ruleset floor until something says otherwise', () => {
    const t = new Terrain(4000, 4000, 250);
    // The behaviour every existing map had before floors were authorable, and
    // the reason adding the arrays changes no test that came before them.
    assert.equal(t.floorAt(2000, 2000), DEPTH.MAX_M);
    assert.equal(t.ceilingAt(2000, 2000), 0);
    assert.ok(t.admits(2000, 2000, 0));
    assert.ok(t.admits(2000, 2000, DEPTH.MAX_M));
    assert.ok(!t.admits(2000, 2000, DEPTH.MAX_M + 1));
  });

  it('takes a base seabed from the map', () => {
    const t = new Terrain(4000, 4000, 250, { floorM: 1200 });
    assert.equal(t.floorAt(10, 10), 1200);
    assert.ok(t.admits(10, 10, 1200));
    assert.ok(!t.admits(10, 10, 1201), 'a hull cannot be deeper than the ground');
  });

  it('refuses a hull too deep for a plateau, and admits the same hull shallower', () => {
    const t = new Terrain(4000, 4000, 250, { floorM: 2800 });
    t.fillGround(1000, 1000, 1000, 1000, { floorM: 380 });

    // The plateau is ground to a deep hull and open water to a shallow one,
    // which is the whole reason "blocked" is derived rather than authored.
    assert.ok(!t.admits(1500, 1500, 600));
    assert.ok(t.admits(1500, 1500, 300));
    // Off the plateau the same hull is fine at the same depth.
    assert.ok(t.admits(3000, 3000, 600));
  });

  it('admits nothing where the ceiling is deeper than the floor', () => {
    const t = new Terrain(4000, 4000, 250, { floorM: 2800 });
    // Solid rock, spelled as an empty interval rather than a flag.
    t.fillGround(1000, 1000, 500, 500, { floorM: 300, ceilingM: 900 });
    for (const depth of [0, 300, 600, 900, 2800]) {
      assert.ok(!t.admits(1200, 1200, depth), `solid ground admitted a hull at ${depth}m`);
    }
  });

  it('makes a roofed passage reachable only from below its roof', () => {
    const t = new Terrain(4000, 4000, 250, { floorM: 2800 });
    t.fillGround(1000, 1000, 1000, 1000, { floorM: 380 });
    // A tunnel bored through the plateau: painted after it, narrower than it.
    // This is the case a single seabed depth cannot express — it would draw
    // this as an open ditch and lose the roof entirely.
    t.fillGround(1400, 1000, 260, 1000, { ceilingM: 420, floorM: 900 });

    assert.ok(!t.admits(1500, 1500, 300), 'the roof is ground to a shallow hull');
    assert.ok(t.admits(1500, 1500, 600), 'and open water to one that dove under it');
    // Its neighbours are still plateau, so the passage really is a passage.
    assert.ok(t.admits(1200, 1500, 300));
    assert.ok(!t.admits(1200, 1500, 600));
  });

  it('paints ground in call order, later over earlier', () => {
    const t = new Terrain(4000, 4000, 250, { floorM: 2800 });
    t.fillGround(0, 0, 4000, 4000, { floorM: 1000 });
    t.fillGround(1000, 1000, 500, 500, { floorM: 2400 });
    assert.equal(t.floorAt(1200, 1200), 2400, 'the later region wins where they overlap');
    assert.equal(t.floorAt(3000, 3000), 1000);
  });

  it('leaves the column alone for a region that only paints biome', () => {
    const t = new Terrain(4000, 4000, 250, { floorM: 2800 });
    t.fillGround(1000, 1000, 500, 500, { floorM: 400 });
    // Biome and ground are independent: kelp is kelp on a plateau or in a
    // trench, so painting one must not silently restate the other.
    t.fillRect(1000, 1000, 500, 500, Biome.KelpForest);
    assert.equal(t.floorAt(1200, 1200), 400);
    assert.equal(t.biomeAt(1200, 1200), Biome.KelpForest);
  });

  it('ships the column to the client alongside the biomes', () => {
    const t = new Terrain(1000, 1000, 250, { floorM: 900 });
    t.fillGround(0, 0, 250, 250, { ceilingM: 100, floorM: 600 });
    const wire = t.serialize();
    // Terrain is public information — it is the map — so the column travels
    // with it rather than being resolved per player.
    assert.equal(wire.floor.length, wire.cols * wire.rows);
    assert.equal(wire.ceiling.length, wire.cols * wire.rows);
    assert.equal(wire.floor[0], 600);
    assert.equal(wire.ceiling[0], 100);
    assert.equal(wire.floor[wire.cols * wire.rows - 1], 900);
    assert.equal(wire.ceiling[wire.cols * wire.rows - 1], 0);
  });
});

describe('Echo Layer path integration', () => {
  /** Two hostile corvettes 1,500 m apart on a chosen terrain. */
  function resolveAcross(terrain: Terrain): ResolutionTier {
    // The seed is passed because `createSimWorld` asks for one. This call used
    // to hand a three-argument signature two arguments and lean on `Rng`'s
    // `seed >>> 0` turning the missing one into 0; tests are not type-checked,
    // so nothing objected. Nothing on this path draws from the RNG and both
    // calls below were already getting the same generator, so this fixes no
    // divergence — it just stops the fixture depending on a coercion.
    const world = createSimWorld(terrain, 1 / 60, 7);
    spawnUnit(world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 500,
      y: 500,
    });
    spawnUnit(world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 2000,
      y: 500,
    });
    const echo = new EchoLayer();
    const contacts = echo.run(world, [0, 1]).contactsBySlot.get(1) ?? [];
    return contacts[0]?.tier ?? ResolutionTier.Silent;
  }

  it('a kelp bank between emitter and listener is cover you can hide behind', () => {
    const open = new Terrain(2500, 1000, 250);

    const banked = new Terrain(2500, 1000, 250);
    // A kelp bank across the middle of the path — neither unit stands in it.
    banked.fillRect(875, 0, 750, 1000, Biome.KelpForest);

    const heardOpen = resolveAcross(open);
    const heardBanked = resolveAcross(banked);
    assert.ok(heardOpen > ResolutionTier.Silent, 'baseline: audible across open water');
    assert.ok(
      heardBanked < heardOpen,
      `the bank must cost resolution (open ${heardOpen}, banked ${heardBanked})`
    );
  });
});
