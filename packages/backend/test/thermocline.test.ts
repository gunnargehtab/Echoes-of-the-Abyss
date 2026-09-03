/**
 * The thermocline — docs/systems-echo.md §3, docs/systems-depth.md §1.
 *
 * The layer at 1,200 m is the one row of §3's propagation table that is not a
 * biome. It has no cells: it multiplies a *pair*, by which side of the
 * boundary each end of the path sits on. Sound crossing it is cut to 0.3;
 * sound running along it, with both ends inside the 100 m duct either side, is
 * carried at 1.2.
 *
 * Two things about it are easy to get wrong and invisible when you do, so they
 * are what this file is mostly about:
 *
 * - **The broadphase has to know.** The pass sizes its candidate search from a
 *   ceiling over propagation. A duct pair reaches 1.2x further than that
 *   ceiling allows for, so a search that forgot the layer would prune a clean
 *   annulus of long-range contacts — the faint ones this game is built on —
 *   while every in-range test it *did* run stayed correct.
 * - **It must not manufacture contacts.** The walk that prices terrain may
 *   abort early and return an optimistic upper bound. Scaling that up by a
 *   factor above 1 would invent contacts; scaling the loudness instead, before
 *   the walk is given its bar, cannot.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Biome,
  EchoMarkKind,
  Faction,
  MAX_PROPAGATION_FACTOR,
  PERSISTENCE,
  SIM,
  THERMOCLINE,
  THERMOCLINE_DUCT_BOTTOM_M,
  THERMOCLINE_DUCT_TOP_M,
  UnitKind,
  detectionRatio,
  maxAudibleRangeM,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { EchoMarkLayer } from '../src/sim/echoMarks.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Acoustic } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';

/** Named off the constant, so moving the layer moves the tests with it. */
const ABOVE = THERMOCLINE_DUCT_TOP_M - 600;
const BELOW = THERMOCLINE_DUCT_BOTTOM_M + 600;
const IN_DUCT = THERMOCLINE.DEPTH_M;

/**
 * One emitter, one listener, nothing else in the water.
 *
 * Deliberately built without `addPlayer`: a starting force would put a dozen
 * other emitters on the map and make "did slot 1 hear this hull" a question
 * about the whole roster rather than about one pair.
 */
function pair(options: {
  emitterDepthM: number;
  listenerDepthM: number;
  distanceM: number;
  biome?: Biome;
}): { heard: boolean; sig: number; hyd: number; walks: number } {
  const terrain = new Terrain(8000, 8000, 250);
  if (options.biome !== undefined) terrain.fillRect(0, 0, 8000, 8000, options.biome);
  const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 31, terrain });

  const emitter = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x: 600,
    y: 4000,
    depth: options.emitterDepthM,
  });
  const listener = spawnUnit(match.world, {
    kind: UnitKind.LightScout,
    slot: 1,
    faction: Faction.Pelagia,
    x: 600 + options.distanceM,
    y: 4000,
    depth: options.listenerDepthM,
  });

  const result = match.echo.run(match.world, [0, 1]);
  const heard = (result.contactsBySlot.get(1) ?? []).some(
    (contact) => match.echo.entityForHandle(1, contact.id) === emitter
  );
  return {
    heard,
    sig: Acoustic.sig[emitter]!,
    hyd: Acoustic.hyd[listener]!,
    walks: match.contactPathWalksLastPass,
  };
}

describe('the thermocline, in the contact pass', () => {
  it('silences across the layer a contact the same pair would resolve within it', () => {
    // The mechanic as a player meets it: the hull did not move, did not get
    // quieter, and stopped being a contact.
    const within = pair({ emitterDepthM: ABOVE, listenerDepthM: ABOVE, distanceM: 1 });
    const range = maxAudibleRangeM(within.sig, 1, within.hyd);
    const distanceM = range * 0.75;

    // The premise, checked rather than assumed: this distance is a comfortable
    // contact in open water and cannot survive the crossing factor.
    assert.ok(detectionRatio(within.sig, 1, distanceM, within.hyd) >= 1);
    assert.ok(detectionRatio(within.sig, THERMOCLINE.ACROSS, distanceM, within.hyd) < 1);

    assert.equal(
      pair({ emitterDepthM: ABOVE, listenerDepthM: ABOVE, distanceM }).heard,
      true,
      'audible with both hulls above the layer'
    );
    assert.equal(
      pair({ emitterDepthM: BELOW, listenerDepthM: BELOW, distanceM }).heard,
      true,
      'and with both below it'
    );
    assert.equal(
      pair({ emitterDepthM: ABOVE, listenerDepthM: BELOW, distanceM }).heard,
      false,
      'and silent across it — the same hull, the same water, the same range'
    );
  });

  it('hides you exactly as much as it hides them', () => {
    // Detection is resolved per ordered pair, so an asymmetry here would hand
    // whoever happened to be deeper a free scouting advantage.
    const probe = pair({ emitterDepthM: ABOVE, listenerDepthM: ABOVE, distanceM: 1 });
    const distanceM = maxAudibleRangeM(probe.sig, 1, probe.hyd) * 0.75;
    assert.equal(
      pair({ emitterDepthM: ABOVE, listenerDepthM: BELOW, distanceM }).heard,
      pair({ emitterDepthM: BELOW, listenerDepthM: ABOVE, distanceM }).heard
    );
  });

  it('carries a duct pair past the open-water horizon', () => {
    const probe = pair({ emitterDepthM: ABOVE, listenerDepthM: ABOVE, distanceM: 1 });
    const distanceM = maxAudibleRangeM(probe.sig, 1, probe.hyd) * 1.05;

    assert.equal(
      pair({ emitterDepthM: ABOVE, listenerDepthM: ABOVE, distanceM }).heard,
      false,
      'out of reach in open water'
    );
    assert.equal(
      pair({ emitterDepthM: IN_DUCT, listenerDepthM: IN_DUCT, distanceM }).heard,
      true,
      'and inside it along the duct'
    );
  });

  it('does not clip the outer annulus the duct adds to the broadphase', () => {
    // The regression this file exists for. The search radius is a product of
    // ceilings — biome PF, source masking, and now the layer. Drop the last
    // one and everything between 89% and 100% of a duct pair's true range is
    // pruned before the exact test ever sees it: no error, no assertion, just
    // long-range contacts that quietly stop existing.
    //
    // A trench is what makes this measurable: the layer's 1.2 has to push the
    // reach past MAX_PROPAGATION_FACTOR before a search sized at that ceiling
    // is too small.
    const probe = pair({ emitterDepthM: IN_DUCT, listenerDepthM: IN_DUCT, distanceM: 1 });
    const reach = maxAudibleRangeM(
      probe.sig,
      MAX_PROPAGATION_FACTOR * THERMOCLINE.ALONG,
      probe.hyd
    );
    const distanceM = reach * 0.95;
    assert.ok(
      distanceM > maxAudibleRangeM(probe.sig, MAX_PROPAGATION_FACTOR, probe.hyd),
      'the case must sit outside a broadphase that ignores the layer, or it proves nothing'
    );

    assert.equal(
      pair({
        emitterDepthM: IN_DUCT,
        listenerDepthM: IN_DUCT,
        distanceM,
        biome: Biome.AbyssalTrench,
      }).heard,
      true,
      'a duct pair inside its own reach must be found, not pruned'
    );
  });

  it('does not pay for the layer in path integrals it did not use to', () => {
    // The wider search is only free if it does not drag more candidates into
    // the exact test. Everything in the duct is the worst case; the budget is
    // the area the radius grew by (1.2^(1/exponent) squared, ~1.26), with
    // slack for the grid.
    const dense = (depthM: number) => {
      const match = new Match(VENTFRONT_DIVIDE, {
        fauna: false,
        seed: 31,
        terrain: new Terrain(8000, 8000, 250),
      });
      for (let i = 0; i < 80; i++) {
        spawnUnit(match.world, {
          kind: (i * 7) % 5,
          slot: i % 4,
          faction: (i % 4) as Faction,
          x: 400 + ((i * 487) % 7200),
          y: 400 + ((i * 911) % 7200),
          depth: depthM,
        });
      }
      match.echo.run(match.world, [0, 1, 2, 3]);
      return match.contactPathWalksLastPass;
    };

    const flat = dense(ABOVE);
    const ducted = dense(IN_DUCT);
    assert.ok(flat > 0, 'the scenario must actually walk paths');
    assert.ok(
      ducted <= flat * 1.6,
      `duct pass did ${ducted} path integrals against ${flat} above the layer`
    );
    console.log(`contact path integrals: ${flat} above the layer, ${ducted} inside the duct`);
  });
});

describe('the thermocline, in the residue layer', () => {
  const terrain = new Terrain(8000, 8000, 250);

  /**
   * How far a structure echo at one depth carries to a listener at another.
   *
   * Measured through `readableBy` with a search radius wide enough to cover
   * the map, so what it reports is the *exact* test's answer and not the
   * broadphase's — which is what makes it a fair bar to hold the broadphase to
   * in the test below.
   */
  const reachIn = (ground: Terrain, markDepthM: number, listenerDepthM: number) => {
    let far = 0;
    for (let d = 200; d < 7000; d += 100) {
      const layer = new EchoMarkLayer();
      layer.add(EchoMarkKind.DestroyedStructure, 500, 4000, markDepthM);
      const out: number[] = [];
      layer.readableBy(ground, 500 + d, 4000, listenerDepthM, 70, 8000, out);
      if (out.length > 0) far = d;
    }
    return far;
  };
  const reach = (markDepthM: number, listenerDepthM: number) =>
    reachIn(terrain, markDepthM, listenerDepthM);

  it('keeps residue from one side of the layer inaudible on the other', () => {
    // A mark carries the depth of the event, so a battle in the Abyssal does
    // not advertise itself to the Shelf. Without this, residue would be the
    // one channel that leaked across the layer — and residue is exactly what
    // §7 says a scout goes looking for.
    //
    // At a range where the same residue is a comfortable read on its own side:
    // the layer is a factor, not a wall, so a hull parked on top of a wreck
    // hears it whatever depth it is at, and should.
    const distanceM = reach(BELOW, BELOW) * 0.75;
    assert.ok(distanceM > 0, 'residue must be readable at all');

    const read = (listenerDepthM: number) => {
      const layer = new EchoMarkLayer();
      layer.add(EchoMarkKind.DestroyedStructure, 1000, 4000, BELOW);
      const out: number[] = [];
      layer.readableBy(terrain, 1000 + distanceM, 4000, listenerDepthM, 70, 8000, out);
      return out.length;
    };

    assert.equal(read(BELOW), 1, 'well inside its reach, on its own side');
    assert.equal(read(ABOVE), 0, 'and the same range across the layer');
  });

  it('does not merge two events into one across the layer', () => {
    // Merging is by proximity, and depth is part of proximity now. A fight on
    // the Shelf and a fight in the trench below it are two events; one mark at
    // an averaged depth would be audible to neither side at full strength and
    // would report a battle where none happened.
    const layer = new EchoMarkLayer();
    layer.add(EchoMarkKind.Battle, 4000, 4000, ABOVE);
    layer.add(EchoMarkKind.Battle, 4000, 4000, BELOW);
    assert.equal(layer.count, 2, 'same place, opposite sides of the layer');

    layer.clear();
    layer.add(EchoMarkKind.Battle, 4000, 4000, BELOW);
    layer.add(EchoMarkKind.Battle, 4000, 4000, BELOW + 50);
    assert.equal(layer.count, 1, 'and the same side still merges');
  });

  it('reaches further along the duct than across open water', () => {
    const open = reach(ABOVE, ABOVE);
    const ducted = reach(IN_DUCT, IN_DUCT);
    const across = reach(BELOW, ABOVE);
    assert.ok(open > 0, 'residue must be readable at all');
    assert.ok(ducted > open, `duct ${ducted} m should carry further than open water ${open} m`);
    assert.ok(across < open, `crossing ${across} m should fall short of open water ${open} m`);
  });

  it('sizes its own broadphase to cover the duct', () => {
    // The mark sweep prunes on a radius computed from the mark alone, before
    // any listener is in hand — so that radius has to bound *every* listener
    // depth. The same annulus bug as the contact pass's, in the one place the
    // contact pass's test cannot see.
    //
    // In a trench, for the same reason that test needs one: the radius is
    // already sized at the loudest water on the map, so the layer's 1.2 only
    // outruns it where the water is that loud.
    const trench = new Terrain(8000, 8000, 250);
    trench.fillRect(0, 0, 8000, 8000, Biome.AbyssalTrench);

    for (const markDepthM of [ABOVE, IN_DUCT, BELOW]) {
      const layer = new EchoMarkLayer();
      layer.add(EchoMarkKind.DestroyedStructure, 500, 4000, markDepthM);
      const radius = layer.audibleRadiusM(layer.all[0]!, 70, trench.peakPf);
      for (const listenerDepthM of [ABOVE, IN_DUCT, BELOW]) {
        assert.ok(
          radius >= reachIn(trench, markDepthM, listenerDepthM),
          `a mark at ${markDepthM} m prunes a listener at ${listenerDepthM} m ` +
            `that its own exact test accepts (${radius.toFixed(0)} m broadphase)`
        );
      }
    }
  });

  it('still gates on HYD before anything else', () => {
    // The wall stays a wall: the layer makes residue harder to hear, never
    // easier, and never lets a deaf hull past the gate.
    const layer = new EchoMarkLayer();
    layer.add(EchoMarkKind.DestroyedStructure, 4000, 4000, IN_DUCT);
    const out: number[] = [];
    layer.readableBy(terrain, 4000, 4000, IN_DUCT, PERSISTENCE.ECHO_MARK_MIN_HYD - 1, 8000, out);
    assert.deepEqual(out, [], 'the duct is not a way around the HYD gate');
  });
});

describe('the thermocline, in a running match', () => {
  it('is crossed by ordering a dive, and changes what the other side hears', () => {
    // End to end, through the real order path: the same two hulls, one of them
    // told to go deep, and a contact that stops existing because of it.
    const terrain = new Terrain(8000, 8000, 250);
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 33, terrain });
    const diver = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 600,
      y: 4000,
      depth: ABOVE,
    });
    const watcher = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 600 + maxAudibleRangeM(Acoustic.sig[diver]!, 1, 70) * 0.75,
      y: 4000,
      depth: ABOVE,
    });

    const hears = () =>
      (match.echo.run(match.world, [0, 1]).contactsBySlot.get(1) ?? []).some(
        (contact) => match.echo.entityForHandle(1, contact.id) === diver
      );

    assert.equal(hears(), true, 'a contact before the dive');

    match.orderDepth(0, diver, BELOW);
    // Descent is 45 m/s and deafening; long enough to get well below the duct.
    for (let i = 0; i < SIM.TICK_HZ * 40; i++) match.update(1000 / SIM.TICK_HZ);

    assert.ok(Acoustic.sig[diver]! > 0, 'the hull is still emitting');
    assert.ok(watcher > 0);
    assert.equal(hears(), false, 'and gone once it is under the layer');
  });
});
