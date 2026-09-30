/**
 * Regrowth and respawn (#554) — docs/bestiary.md §6, docs/systems-flora.md §3
 * and §4. Wave 2 of #547.
 *
 * The wave that turns the account from a stock into an income, and the one
 * that answers #535's first fault: a map used to hold one seeding of fauna for
 * four navies for a whole match, and `spawnsAllowed` — the gate whose entire
 * purpose is to decide which regions admit fauna — was read only at seed time.
 *
 * What is pinned here is the sentence both halves share: **the band that stops
 * breeding animals is the band that stops growing the crop that feeds them.**
 * So the same ladder is asserted twice, once on kelp and once on creatures.
 * The ceiling matters most of all: a Drift that refilled past what the map was
 * seeded to hold would be a spring rather than an income, and the population
 * cap it would breach is what protects the Echo pass's 2 ms budget.
 *
 * Health is lowered the way the simulation lowers it — `recordKill`, as
 * `drift.test.ts` does — rather than by writing the grid. A band reached the
 * way a match reaches it cannot drift away from the rule that puts it there.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import { Biome, DRIFT, DRIFT_ROSTER, FaunaSpecies, FLORA, SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { countFauna, countFaunaOf } from '../src/sim/systems/fauna.ts';
import { setKelpCrop, type Hazard } from '../src/sim/systems/hazards.ts';
import { Fauna, Health } from '../src/sim/components.ts';
import { spawnFauna } from '../src/sim/world.ts';
import { terrainFor, VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;
const BED_X = 4000;
const BED_Y = 4000;
const BED_RADIUS_M = 1500;

/** One bed on its own plateau, for the regrowth half. */
function bedMap(): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: 'test-regrowth',
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

/**
 * A bed in the middle of every health region, so the crop rule can be asserted
 * on the map as a whole rather than on where one placement happened to land.
 * Small radii: this map is about what the beds *feed*, not what they grip.
 */
function beddedMap(): MapDefinition {
  const step = MAP_M / DRIFT.HEALTH_REGIONS;
  const hazards: MapDefinition['hazards'] = [];
  for (let cy = 0; cy < DRIFT.HEALTH_REGIONS; cy++) {
    for (let cx = 0; cx < DRIFT.HEALTH_REGIONS; cx++) {
      hazards.push({
        x: (cx + 0.5) * step,
        y: (cy + 0.5) * step,
        radiusM: 200,
        kind: 'kelp-entanglement',
      });
    }
  }
  return { ...VENTFRONT_DIVIDE, id: 'test-bedded', hazards };
}

function match(map: MapDefinition = bedMap(), fauna = false, seed = 51): Match {
  return new Match(map, { fauna, seed, terrain: terrainFor(map) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) m.update(STEP_MS);
}

function bed(m: Match): Hazard {
  const field = m.world.hazards.find((h) => h.kind === 'kelp-entanglement');
  assert.ok(field !== undefined, 'the map must carry a bed, or this tests nothing');
  return field;
}

/** Wear one region down to a band, the way a commander does: by harvesting. */
function wearTo(m: Match, x: number, y: number, health: number): void {
  let guard = 0;
  while (m.world.drift.at(x, y) > health) {
    m.world.drift.recordKill(x, y);
    assert.ok(guard++ < 100, 'a region must be reachable by killing things in it');
  }
}

/**
 * Whether a point is in the Ventfront Divide's middle two rows of regions,
 * which hold every cell of its vent line (y 3,000 to 5,000 m).
 */
function inVeinRows(m: Match, x: number, y: number): boolean {
  const row = Math.floor(m.world.drift.regionIndex(x, y) / DRIFT.HEALTH_REGIONS);
  return row === 1 || row === 2;
}

/** Wear every region on the map down to a band. */
function wearMapTo(m: Match, health: number): void {
  const step = MAP_M / DRIFT.HEALTH_REGIONS;
  for (let cy = 0; cy < DRIFT.HEALTH_REGIONS; cy++) {
    for (let cx = 0; cx < DRIFT.HEALTH_REGIONS; cx++) {
      wearTo(m, (cx + 0.5) * step, (cy + 0.5) * step, health);
    }
  }
}

/**
 * Every creature this match owns.
 *
 * `hasComponent` rather than reading `Fauna.species[eid]` directly: bitecs
 * component arrays are process-global and are not cleared between worlds, so a
 * raw read finds creatures belonging to every other match in the file — which
 * is how the first draft of this test culled somebody else's Sounder and
 * concluded the Drift had bred a new one.
 */
function creaturesOf(m: Match): number[] {
  const out: number[] = [];
  for (let eid = 0; eid <= m.world.maxEid; eid++) {
    if (!hasComponent(m.world, Fauna, eid)) continue;
    if (!hasComponent(m.world, Health, eid)) continue;
    if (Health.hp[eid]! <= 0) continue;
    out.push(eid);
  }
  return out;
}

/**
 * A match opening on ground an earlier mission left in Collapsing water —
 * docs/campaign.md §2 rule 5, and §6's bottom-but-one row (#655).
 *
 * Twelve rather than a number nearer the boundary so quiet water's recovery
 * (1.2 health a minute) cannot climb out of the band while a test runs, and
 * `VENTFRONT_DIVIDE`'s eruptions are taken out so nothing but the band decides
 * what lives: a region thirteen points above Dead is close enough to the floor
 * that an environmental kill or two would be the whole result. No beds either,
 * so `cropDensityAt` is 1 and the rate under test is §6's own rather than §4's
 * crop scaling on top of it.
 */
function collapsedMatch(): Match {
  const map: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-collapsed', hazards: [] };
  const carried = new Array<number>(DRIFT.HEALTH_REGIONS ** 2).fill(DRIFT.HEALTH_COLLAPSING - 13);
  return new Match(map, { fauna: true, seed: 51, terrain: terrainFor(map), driftCarry: carried });
}

/** Kill one live creature of a species, and say nothing else about it. */
function cull(m: Match, species: FaunaSpecies): void {
  for (const eid of creaturesOf(m)) {
    if (Fauna.species[eid] !== species) continue;
    Health.hp[eid] = 0;
    return;
  }
  assert.fail(`no live creature of species ${species} to cull`);
}

describe('the crop grows back on the Drift Health bands', () => {
  it('grows a stripped bed at the doc rate in healthy water', () => {
    const m = match();
    setKelpCrop(m.world, bed(m), 0);
    advance(m, 60);
    assert.ok(
      Math.abs(bed(m).crop - FLORA.REGROWTH_PER_MIN) < 1e-6,
      `one minute is one minute of the rate: ${bed(m).crop}`
    );
    // The number's whole argument, and the guard-rail against a map shaved
    // bare by minute ten: real, and slower than the match it happens in.
    assert.ok(1 / FLORA.REGROWTH_PER_MIN > 20, 'a bare field must not return inside a raid');
  });

  it('grows at the Strained row own −40%', () => {
    const m = match();
    setKelpCrop(m.world, bed(m), 0);
    wearTo(m, BED_X, BED_Y, DRIFT.HEALTH_STRAINED - 1);
    advance(m, 60);
    assert.ok(
      Math.abs(bed(m).crop - FLORA.REGROWTH_PER_MIN * DRIFT.SPAWN_RATE_STRAINED) < 1e-6,
      `Strained water grows the crop at 60% of the rate: ${bed(m).crop}`
    );
  });

  it('stops growing where spawns stop', () => {
    // §6's Failing row is "no new spawns", and the same row stops the kelp: a
    // region worked past Strained neither breeds animals nor grows the crop
    // that feeds them.
    // Clear of the boundary, because quiet water heals while the test runs:
    // a region parked one point under Failing climbs back over it in under a
    // minute, and would start growing again half way through the window.
    for (const health of [DRIFT.HEALTH_FAILING - 5, DRIFT.HEALTH_COLLAPSING - 5, 0]) {
      const m = match();
      setKelpCrop(m.world, bed(m), 0.5);
      wearTo(m, BED_X, BED_Y, health);
      advance(m, 120);
      assert.equal(bed(m).crop, 0.5, `nothing grows at ${health} health`);
    }
  });

  it('never grows past a full canopy', () => {
    const m = match();
    setKelpCrop(m.world, bed(m), 0.99);
    advance(m, 120);
    assert.equal(bed(m).crop, 1);
  });

  it('rebuilds the PF grid as the canopy crosses steps, not as it grows', () => {
    // Counted work: regrowth is on the 60 Hz path and a whole-map recompute is
    // not. What holds it down is wave 1's quantisation, and this is the test
    // that would notice if regrowth stopped going through it.
    const m = match();
    const terrain = m.world.terrain;
    let rebuilds = 0;
    const real = terrain.applyPropagationModifiers.bind(terrain);
    terrain.applyPropagationModifiers = (mods) => {
      rebuilds++;
      real(mods);
    };
    setKelpCrop(m.world, bed(m), 0);
    rebuilds = 0;
    advance(m, 120);
    assert.ok(bed(m).crop > 0.05, 'the bed really did grow');
    assert.ok(rebuilds <= 2, `two minutes of growth is two steps at most: ${rebuilds} rebuilds`);
  });
});

describe('the Drift puts back what it loses', () => {
  it('replaces a creature the match killed', () => {
    const m = match(VENTFRONT_DIVIDE, true);
    const before = countFaunaOf(m.world, FaunaSpecies.Draymaw);
    assert.ok(before > 0, 'the map must seed the species this test culls');
    cull(m, FaunaSpecies.Draymaw);
    advance(m, 1);
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Draymaw), before - 1, 'it really died');

    advance(m, DRIFT.RESPAWN_INTERVAL_S + 1);
    assert.equal(
      countFaunaOf(m.world, FaunaSpecies.Draymaw),
      before,
      'and the Drift bred another inside one interval'
    );
  });

  it('never breeds past what the map was seeded to hold', () => {
    // The ceiling that makes this an income rather than a spring, and the one
    // that protects the Echo pass: every creature is an entity in its 2 ms.
    const m = match(VENTFRONT_DIVIDE, true);
    const seeded = countFauna(m.world);
    assert.ok(seeded > 0);
    advance(m, DRIFT.RESPAWN_INTERVAL_S * 6);
    // A ceiling rather than an equality: this map's own eruptions kill
    // creatures while the window runs, and what is under test is that nothing
    // is ever bred *past* the complement — not that nothing ever dies.
    assert.ok(
      countFauna(m.world) <= seeded,
      `a full map breeds nothing: ${countFauna(m.world)} against ${seeded} seeded`
    );
    assert.ok(seeded <= DRIFT.MAX_POPULATION);
  });

  it('breeds nothing in failing water', () => {
    const m = match(VENTFRONT_DIVIDE, true);
    const before = countFauna(m.world);
    cull(m, FaunaSpecies.Draymaw);
    // Clear of the boundary: quiet water heals at 1.2 health a minute, and a
    // region parked at 49 is back above Failing before the window is out.
    wearMapTo(m, DRIFT.HEALTH_FAILING - 10);
    advance(m, DRIFT.RESPAWN_INTERVAL_S * 3);
    assert.ok(
      countFauna(m.world) <= before - 1,
      `"no new spawns" is the whole row: ${countFauna(m.world)} against ${before - 1}`
    );
  });

  it('breeds the scavenger back in collapsing water', () => {
    // §6's Collapsing row, "Scavengers only", read as the spawn rule it is
    // (#655) rather than as a description of what happened to survive.
    //
    // The ground is a **carried** grid: a campaign second visit, where the
    // carry is the ground the match opens on (docs/campaign.md §2 rule 5) and
    // the complement is counted from what was actually seated on it. The next
    // case reaches the same row by wearing a living map down.
    const m = collapsedMatch();
    const before = countFaunaOf(m.world, FaunaSpecies.Rasp);
    assert.ok(before > 0, 'collapsed ground seats the scavenger and this test needs one');
    cull(m, FaunaSpecies.Rasp);
    advance(m, 1);
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Rasp), before - 1, 'it really died');

    advance(m, DRIFT.RESPAWN_INTERVAL_S * 8);
    assert.equal(
      countFaunaOf(m.world, FaunaSpecies.Rasp),
      before,
      'carrion is what is left when a region dies, and something arrives to eat it'
    );
  });

  it('breeds the scavenger on a map worn past Failing everywhere', () => {
    // #990. Wearing a living map down takes it through Failing, where §6 kills
    // the Lampfry, and no region will breed a shoal again. Six dead shoals
    // outrank one dead Rasp, and until `repopulate` passed over a species no
    // region admits it waited on them for the rest of the match, so this row
    // was reachable only from a carried grid. No eruptions, as above.
    const map: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-worn', hazards: [] };
    const m = match(map, true);
    const rasp = countFaunaOf(m.world, FaunaSpecies.Rasp);
    assert.ok(rasp > 0, 'the map must seed the scavenger this test culls');
    assert.ok(
      countFaunaOf(m.world, FaunaSpecies.Lampfry) > 1,
      'and more shoals than scavengers, or no deficit outranks the Rasp'
    );
    wearMapTo(m, DRIFT.HEALTH_COLLAPSING - 13);
    cull(m, FaunaSpecies.Rasp);
    advance(m, 1);
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Rasp), rasp - 1, 'it really died');
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Lampfry), 0, 'and Failing took the shoals');

    advance(m, DRIFT.RESPAWN_INTERVAL_S * 8);
    assert.equal(
      countFaunaOf(m.world, FaunaSpecies.Rasp),
      rasp,
      'collapsing water breeds carrion-eaters however it got there'
    );
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Lampfry), 0, 'and nothing else');
  });

  it('breeds nothing but the scavenger there', () => {
    // The half that separates this reading from the monotone one it replaced:
    // the exemption is a class, not a discount on the whole roster. A predator
    // put into collapsed water by hand is not replaced when it dies, and the
    // population never climbs past the scavengers the ground itself seated.
    const m = collapsedMatch();
    const scavengers = countFaunaOf(m.world, FaunaSpecies.Rasp);
    spawnFauna(m.world, { species: FaunaSpecies.Draymaw, x: 4000, y: 4000 });
    advance(m, 1);
    cull(m, FaunaSpecies.Draymaw);
    advance(m, DRIFT.RESPAWN_INTERVAL_S * 8);

    assert.equal(countFaunaOf(m.world, FaunaSpecies.Draymaw), 0, 'a predator stays dead');
    assert.equal(
      countFauna(m.world),
      scavengers,
      `and dead water holds only what it admits: ${countFauna(m.world)} against ${scavengers}`
    );
  });

  it('keeps megafauna out of strained water', () => {
    // §6's Strained row has two clauses, and this is the second: the water is
    // thinner for everything and closed to the colossus outright.
    //
    // The colossus is placed rather than waited for. Whether the seeder seats
    // one is a lottery on this map and always was: a Sounder needs 2,000 m of
    // water off the vein and outside every spawn's 2,600 m exclusion, which on
    // the Ventfront is a corridor about 600 m wide down the map's centre —
    // under 5% of the draw box, so twelve attempts miss it about a third of
    // the time. Asserting a seeded Sounder made this case fail on any change
    // that moved a single cell of that corridor, while testing nothing about
    // the band rule it is named for.
    const m = match(VENTFRONT_DIVIDE, true);
    assert.equal(
      DRIFT_ROSTER.filter((entry) => entry.species === FaunaSpecies.Sounder)[0]?.count,
      1,
      'there is only ever one colossus'
    );
    if (countFaunaOf(m.world, FaunaSpecies.Sounder) === 0) {
      spawnFauna(m.world, { species: FaunaSpecies.Sounder, x: 4000, y: 2000, depth: 2000 });
    }
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Sounder), 1, 'one colossus in the water');
    cull(m, FaunaSpecies.Sounder);
    wearMapTo(m, DRIFT.HEALTH_STRAINED - 5);
    advance(m, DRIFT.RESPAWN_INTERVAL_S * 4);
    assert.equal(
      countFaunaOf(m.world, FaunaSpecies.Sounder),
      0,
      'a map worked into Strained loses its colossus for the match'
    );
  });

  it('restocks the roster behind a colossus that strained water will not take back', () => {
    // #990, the megafauna clause. On water Strained everywhere a dead colossus
    // is a deficit no region will fill, and it sits ahead of the Rasp in the
    // roster, so the queue used to wait on it: §6's "spawn rate −40%" became
    // −100% for every species behind it. No eruptions, so nothing else dies.
    const map: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-strained', hazards: [] };
    const m = match(map, true);
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Sounder), 1, 'the map must seat its colossus');
    const rasp = countFaunaOf(m.world, FaunaSpecies.Rasp);
    cull(m, FaunaSpecies.Sounder);
    cull(m, FaunaSpecies.Rasp);
    // Clear of the boundary: quiet water heals, and a region back at 75 opens
    // to the colossus again.
    wearMapTo(m, DRIFT.HEALTH_STRAINED - 10);
    advance(m, DRIFT.RESPAWN_INTERVAL_S * 4);
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Sounder), 0, 'the colossus stays gone');
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Rasp), rasp, 'and the swarm behind it returns');
  });

  it('restocks the roster behind a grazer whose open water holds none of its ground', () => {
    // #993. The band is per region and ground is per point: every vent cell
    // on this map is in the middle eight regions, so wearing those to Failing
    // leaves the band open only where an Ashgrazer cannot stand. Its deficit
    // used to hold the queue, and the eight Healthy regions bred nothing.
    // No eruptions, as above.
    const map: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-veinless', hazards: [] };
    const m = match(map, true);
    for (let y = 400; y <= MAP_M - 400; y += 50) {
      for (let x = 400; x <= MAP_M - 400; x += 50) {
        if (m.world.terrain.biomeAt(x, y) !== Biome.ThermalVein) continue;
        assert.ok(inVeinRows(m, x, y), `vent ground at ${x}, ${y} is outside the worn rows`);
      }
    }
    const step = MAP_M / DRIFT.HEALTH_REGIONS;
    for (let cx = 0; cx < DRIFT.HEALTH_REGIONS; cx++) {
      // Clear of the boundary: quiet water heals 1.2 a minute, and this case
      // runs seven intervals.
      wearTo(m, (cx + 0.5) * step, 1.5 * step, DRIFT.HEALTH_FAILING - 15);
      wearTo(m, (cx + 0.5) * step, 2.5 * step, DRIFT.HEALTH_FAILING - 15);
    }
    // Eight, so the grazer's deficit tops the roster from the first interval:
    // Failing kills this water's shoals and withers its clusters too.
    for (let i = 0; i < 8; i++) cull(m, FaunaSpecies.Ashgrazer);
    // One interval for that die-off to finish before anything is counted.
    advance(m, DRIFT.RESPAWN_INTERVAL_S);
    const grazers = countFaunaOf(m.world, FaunaSpecies.Ashgrazer);
    const others = countFauna(m.world) - grazers;

    advance(m, DRIFT.RESPAWN_INTERVAL_S * 6);
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Ashgrazer), grazers, 'no vent is open');
    const after = countFauna(m.world) - countFaunaOf(m.world, FaunaSpecies.Ashgrazer);
    assert.ok(after > others, `and the rest of the roster restocks: ${after} against ${others}`);
  });

  it('breeds nothing at all in a match with no Drift', () => {
    // Every test and every mission that opens `fauna: false` must pay nothing
    // for this: no complement, so no accumulator and no walk.
    const m = match(VENTFRONT_DIVIDE, false);
    advance(m, DRIFT.RESPAWN_INTERVAL_S * 2);
    assert.equal(countFauna(m.world), 0);
  });
});

describe('the herd eats the crop', () => {
  /** Kill `howMany` creatures, leaving the colossus alone. */
  function thin(m: Match, howMany: number): void {
    let killed = 0;
    for (const eid of creaturesOf(m)) {
      if (killed >= howMany) break;
      if (Fauna.species[eid] === FaunaSpecies.Sounder) continue;
      Health.hp[eid] = 0;
      killed++;
    }
    assert.equal(killed, howMany, 'the map must hold enough creatures to thin');
  }

  it('feeds nothing on a map stripped to bare rock', () => {
    // docs/systems-flora.md §4. Every region on this map carries a bed, so
    // cutting all of them is cutting the map's whole larder — and a plateau
    // with no crop on it breeds nothing, whatever its health says.
    //
    // Held cut rather than cut once, because the beds grow back at 4% a
    // minute: this is a map under continuous harvest, which is what wave 3's
    // reactor is and what makes the rule worth having.
    const m = match(beddedMap(), true);
    const before = countFauna(m.world);
    thin(m, 6);
    for (let i = 0; i < DRIFT.RESPAWN_INTERVAL_S * 4; i++) {
      for (const field of m.world.hazards) setKelpCrop(m.world, field, 0);
      advance(m, 1);
    }
    assert.equal(countFauna(m.world), before - 6, 'bare rock feeds nothing');
  });

  it('and feeds a full canopy exactly as healthy water always did', () => {
    // The control, and the reason the test above is about the crop rather
    // than about the bedded map being strange.
    const m = match(beddedMap(), true);
    const before = countFauna(m.world);
    thin(m, 6);
    advance(m, DRIFT.RESPAWN_INTERVAL_S * 4);
    assert.ok(
      countFauna(m.world) > before - 6,
      'standing crop feeds a herd the Drift can put back'
    );
  });

  it('restocks the roster behind a grazer whose every vent is held bare', () => {
    // #993's second case. Every vent cell is in the middle eight regions, and
    // holding their beds bare starves the Ashgrazer while the outer eight keep
    // a full canopy. A bed held bare regrows a rounding error each tick, and
    // the grazer's deficit used to hold the queue on it, so the Draymaw behind
    // it never came back. No eruptions: the bedded map carries only its beds.
    const m = match(beddedMap(), true);
    const grazers = countFaunaOf(m.world, FaunaSpecies.Ashgrazer);
    const pack = countFaunaOf(m.world, FaunaSpecies.Draymaw);
    for (let i = 0; i < 3; i++) cull(m, FaunaSpecies.Ashgrazer);
    cull(m, FaunaSpecies.Draymaw);
    for (let i = 0; i < DRIFT.RESPAWN_INTERVAL_S * 8; i++) {
      for (const field of m.world.hazards) {
        if (inVeinRows(m, field.x, field.y)) setKelpCrop(m.world, field, 0);
      }
      advance(m, 1);
    }
    assert.equal(
      countFaunaOf(m.world, FaunaSpecies.Ashgrazer),
      grazers - 3,
      'bare vents feed none'
    );
    assert.equal(countFaunaOf(m.world, FaunaSpecies.Draymaw), pack, 'and the pack is restocked');
  });
});
