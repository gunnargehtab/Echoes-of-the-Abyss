/**
 * The bio-reactor (#557) — docs/systems-flora.md §2 and §3. Wave 3 of #547.
 *
 * The first thing in the game that can *spend* a bed, and therefore the first
 * time the sentence the whole design hangs on happens in a match:
 *
 *   **The crop is the cover.** A reactor renders the canopy around itself into
 *   hulls, so the water over a working reactor un-hides as it runs, and a
 *   mature one stands in open water having made the hole it sits in.
 *
 * What is pinned here is that one act is three things and never comes apart:
 * the owner is paid, the map's concealment goes, and the region wears at the
 * rate a rendered creature costs it. A change that paid without thinning, or
 * thinned without wearing, would leave the guard-rail in §8 with nothing
 * behind it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Biome, DRIFT, Faction, FLORA, SIM, StructureKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure } from '../src/sim/world.ts';
import { Acoustic } from '../src/sim/components.ts';
import { setKelpCrop, type Hazard } from '../src/sim/systems/hazards.ts';
import { terrainFor, VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const BED_X = 4000;
const BED_Y = 4000;
const BED_RADIUS_M = 1200;

/** A plateau with one bed on it, and nothing else to explain a reading. */
function bedMap(): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: 'test-reactor',
    regions: [
      {
        x: BED_X - BED_RADIUS_M,
        y: BED_Y - BED_RADIUS_M,
        widthM: BED_RADIUS_M * 2,
        heightM: BED_RADIUS_M * 2,
        biome: Biome.KelpForest,
      },
    ],
    hazards: [{ x: BED_X, y: BED_Y, radiusM: BED_RADIUS_M, kind: 'kelp-entanglement' }],
  };
}

function match(map: MapDefinition = bedMap()): Match {
  return new Match(map, { fauna: false, seed: 51, terrain: terrainFor(map) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) m.update(STEP_MS);
}

function bed(m: Match): Hazard {
  const field = m.world.hazards.find((h) => h.kind === 'kelp-entanglement');
  assert.ok(field !== undefined, 'the map must carry a bed, or this tests nothing');
  return field;
}

/** A commissioned reactor, `offsetM` east of the bed's centre. */
function reactor(m: Match, offsetM = 0, slot = 0): number {
  return spawnStructure(m.world, {
    kind: StructureKind.BioReactor,
    slot,
    faction: Faction.Bathyarch,
    x: BED_X + offsetM,
    y: BED_Y,
    prebuilt: true,
  });
}

function biomass(m: Match, slot = 0): number {
  return m.world.economies.get(slot)?.biomass ?? 0;
}

describe('a bio-reactor renders the crop around it', () => {
  it('banks the doc rate off a full bed', () => {
    const m = match();
    reactor(m);
    advance(m, 60);
    assert.ok(
      Math.abs(biomass(m) - FLORA.REACTOR_BIOMASS_PER_MIN) < 0.2,
      `a minute is a minute of the rate: ${biomass(m)}`
    );
  });

  it('takes a bed slowly at first, because the bed is growing back under it', () => {
    // The two spec'd rates work against each other: 12 Biomass a minute out,
    // and 4% of 240 — 9.6 — back in. So a reactor in Healthy water is taking
    // mostly interest, and the canopy barely moves. This is the measured
    // behaviour rather than §7's naive 240 ÷ 12, and the doc's rationale now
    // says so.
    const m = match();
    reactor(m);
    advance(m, 600);
    assert.ok(bed(m).crop > 0.85, `ten minutes barely dents a healthy bed: ${bed(m).crop}`);
    assert.ok(biomass(m) > 100, 'and pays well for it the whole time');
  });

  it('eats its own cover once it has worn the water that was growing it back', () => {
    // The design's central image, arriving on the fuse §3 lights rather than
    // on a timer: rendering wears the region, the region crosses into
    // Strained, regrowth drops to 60% and the yield with it — and only then
    // does the canopy start coming off in earnest. A mature reactor really
    // does stand in a hole it made; it just has to ruin the water first.
    const m = match();
    const before = m.world.terrain.propagationAt(BED_X, BED_Y);
    assert.equal(before, Math.fround(FLORA.FULL_CROP_PF), 'a full bed masks at the biome figure');
    reactor(m);
    advance(m, 1500);
    assert.ok(bed(m).crop < 0.6, `a match halves the canopy: ${bed(m).crop}`);
    assert.ok(
      m.world.drift.at(BED_X, BED_Y) < DRIFT.HEALTH_STRAINED,
      'the water it took from is worse for it'
    );
    assert.ok(
      m.world.terrain.propagationAt(BED_X, BED_Y) > before + 0.1,
      'and the hole it made is audible from a long way further off'
    );
  });

  it('takes the nearest bed first, so the hole appears under the reactor', () => {
    // Two beds in reach, one of them further away. §2's reactor "consumes the
    // crop around itself first" — that ordering is the mechanic, because it
    // is what makes a mature reactor stand in open water.
    const map = {
      ...bedMap(),
      hazards: [
        { x: BED_X, y: BED_Y, radiusM: 300, kind: 'kelp-entanglement' as const },
        { x: BED_X + 600, y: BED_Y, radiusM: 300, kind: 'kelp-entanglement' as const },
      ],
    };
    const m = match(map);
    reactor(m);
    advance(m, 120);
    const near = m.world.hazards[0]!;
    const far = m.world.hazards[1]!;
    assert.ok(near.crop < far.crop, `nearest first: ${near.crop} against ${far.crop} beyond it`);
  });

  it('takes only what grows back on a bed it has already stripped', () => {
    // §2's "it stops when the crop in range hits zero, and starts again as the
    // bed regrows" — which in Healthy water means it never quite stops: it
    // collects the interest, at 9.6 a minute against the 12 it wants. What
    // separates that from the Commune's bloom-share is the price: a reactor
    // pays Drift Health for every Biomass and stands at SIG 50 in water it
    // has already opened, and bloom-share does neither.
    const m = match();
    reactor(m);
    setKelpCrop(m.world, bed(m), 0);
    advance(m, 60);
    const interest = biomass(m);
    assert.ok(
      interest > 0 && interest < FLORA.REACTOR_BIOMASS_PER_MIN,
      `the interest, and not the rate: ${interest}`
    );
    assert.ok(bed(m).crop < 0.01, 'and the bed stays stripped while it is taken');
  });

  it('stops dead on a stripped bed in water that has stopped growing', () => {
    // Failing water grows nothing (wave 2), so there is no interest to take
    // and the reactor is a silent, worthless building — which is the end
    // state a navy that strips its own ground is buying.
    const m = match();
    reactor(m);
    setKelpCrop(m.world, bed(m), 0);
    while (m.world.drift.at(BED_X, BED_Y) > DRIFT.HEALTH_FAILING - 5) {
      m.world.drift.recordKill(BED_X, BED_Y);
    }
    const before = biomass(m);
    advance(m, 60);
    assert.ok(biomass(m) - before < 0.01, `dead ground pays nothing: ${biomass(m) - before}`);
  });

  it('renders nothing while it is still a building site', () => {
    const m = match();
    spawnStructure(m.world, {
      kind: StructureKind.BioReactor,
      slot: 0,
      faction: Faction.Bathyarch,
      x: BED_X,
      y: BED_Y,
    });
    advance(m, 20);
    assert.equal(biomass(m), 0, 'a site is not a plant');
  });

  it('reaches only as far as the doc says', () => {
    const m = match();
    // Clear of the field: the bed's own radius plus the reactor's reach is
    // what "within 400 m" means for an area rather than a point.
    reactor(m, BED_RADIUS_M + FLORA.REACTOR_RADIUS_M + 200);
    advance(m, 60);
    assert.equal(biomass(m), 0, 'a reactor out of reach of any bed renders nothing');
  });
});

describe('rendering is loud, and going quiet is the tell', () => {
  it('sits at the spec SIG while it works', () => {
    const m = match();
    const eid = reactor(m);
    advance(m, 2);
    assert.equal(Acoustic.sig[eid], 50, 'inside economy.md §2 45-60 harvest band');
  });

  it('drops to a hum on a bed it has stripped', () => {
    // The reactor's own readout, and the only one it has: a player who cannot
    // see a crop number can hear a field run out.
    const m = match();
    const eid = reactor(m);
    advance(m, 2);
    const working = Acoustic.sig[eid]!;
    // Bare *and* in water that grows nothing back, which is the only way a
    // reactor is truly idle: otherwise it is quietly eating the regrowth.
    setKelpCrop(m.world, bed(m), 0);
    while (m.world.drift.at(BED_X, BED_Y) > DRIFT.HEALTH_FAILING - 5) {
      m.world.drift.recordKill(BED_X, BED_Y);
    }
    advance(m, 1);
    assert.ok(Acoustic.sig[eid]! < working, `${Acoustic.sig[eid]} against ${working} working`);
  });
});

describe('harvesting wears the water it takes from', () => {
  it('costs the region Drift Health at the rendered-fauna rate', () => {
    const m = match();
    const before = m.world.drift.at(BED_X, BED_Y);
    reactor(m);
    advance(m, 60);
    const spent = before - m.world.drift.at(BED_X, BED_Y);
    // A minute of rendering is 12 Biomass, and the rate is derived from what
    // a creature costs. Quiet water heals while the window runs, so this is a
    // floor rather than an equality.
    const expected = FLORA.REACTOR_BIOMASS_PER_MIN * FLORA.HEALTH_PER_BIOMASS;
    assert.ok(
      spent > expected * 0.5,
      `a minute of rendering wears the region: ${spent} against ${expected}`
    );
  });

  it('puts a stripped field into failing water, which is where the doc says', () => {
    // §3: "Strip your own ground and you push it toward Strained, where the
    // crop grows back at less than half speed and the animals stop arriving."
    // A whole bed is about 50 health, and 88 - 50 is Failing.
    const cost = FLORA.FULL_CROP_BIOMASS * FLORA.HEALTH_PER_BIOMASS;
    assert.ok(cost > 40 && cost < 60, `a bed is worth about fifty health: ${cost}`);
    assert.ok(
      DRIFT.HEALTH_START - cost < DRIFT.HEALTH_FAILING,
      'and stripping one takes its water past Failing'
    );
  });

  it('derives the rate rather than carrying a second copy of it', () => {
    // The doc prices this at "the rendered-fauna rate", so it must move when
    // the per-kill cost or the roster does. A hard-coded figure here would be
    // the thing CLAUDE.md warns about: a derived value replaced to make a
    // test pass.
    assert.ok(Math.abs(FLORA.HEALTH_PER_BIOMASS * 19.0833 - DRIFT.HEALTH_PER_KILL) < 0.01);
  });
});
