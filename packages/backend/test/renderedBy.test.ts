/**
 * The fauna windfall, credited to the killer (#560) — docs/systems-flora.md §5,
 * docs/bestiary.md §5. Wave 4 of #547, and the last of the three faults #535
 * filed against this account.
 *
 * §5 makes one structural claim about Biomass: *fauna are drawn to your noise,
 * and the Directorate is paid for what your noise attracts.* Until this wave
 * the payout went to the **nearest** player entity, which is very nearly the
 * opposite rule — the loud navy standing near a corpse it had nothing to do
 * with banked three times the creature value the Directorate did.
 *
 * So what is pinned here is who gets paid, and the two ways nobody does: a
 * death the map caused, and a death nobody caused at all. Both pay nothing
 * rather than paying whoever happened to be closest, which is the same answer
 * §5 already gave for an eruption.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DRIFT, Faction, FaunaSpecies, SIM, UnitKind, faunaStatsFor } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { Fauna, Health } from '../src/sim/components.ts';
import { creditWound } from '../src/sim/systems/fauna.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const X = 4000;
const Y = 4000;

/** No seeded Drift: every creature in these tests is one the test placed. */
function match(): Match {
  const m = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 51 });
  m.addPlayer(0, Faction.Directorate);
  m.addPlayer(1, Faction.Bathyarch);
  return m;
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) m.update(STEP_MS);
}

function biomass(m: Match, slot: number): number {
  return m.world.economies.get(slot)?.biomass ?? 0;
}

/** A grazer, well away from either start so nothing else takes an interest. */
function creature(m: Match, species = FaunaSpecies.Ashgrazer, x = X, y = Y): number {
  return spawnFauna(m.world, { species, x, y, depth: 300 });
}

function hull(
  m: Match,
  slot: number,
  faction: Faction,
  x: number,
  y: number,
  kind = UnitKind.Corvette
): number {
  return spawnUnit(m.world, { kind, slot, faction, x, y, depth: 300 });
}

describe('a rendered creature is paid to whoever killed it', () => {
  it('pays the navy that shot it, not the navy standing over it', () => {
    // The measurement #535 filed, as a test: an idle hull parked on top of a
    // creature another navy is shooting used to bank the whole windfall.
    const m = match();
    const prey = creature(m);
    // A Harvester, because a Corvette parked here is not a bystander: it
    // acquires the creature itself and the test measures nothing. Unarmed is
    // what "standing over it" actually means.
    hull(m, 1, Faction.Bathyarch, X + 60, Y, UnitKind.Harvester);
    // Inside the Corvette's 550 m gun, and four hundred metres further out
    // than the hull that is about to be paid nothing.
    const shooter = hull(m, 0, Faction.Directorate, X + 460, Y);
    assert.ok(shooter > 0);

    advance(m, 60);
    assert.ok(Health.hp[prey] === undefined || Health.hp[prey]! <= 0, 'the creature must die');
    assert.ok(biomass(m, 0) > 0, `the shooter is paid: ${biomass(m, 0)}`);
    assert.equal(biomass(m, 1), 0, 'and the bystander is paid nothing at all');
  });

  it('pays the Directorate their full rate and everyone else the contract', () => {
    // The rate follows the killer's own navy, which is the point: it used to
    // follow whichever navy happened to be nearest the body.
    const worth = faunaStatsFor(FaunaSpecies.Ashgrazer).biomass;
    const directorate = match();
    const prey = creature(directorate);
    creditWound(directorate.world, prey, 0);
    Health.hp[prey] = 0;
    advance(directorate, 1);
    const full = biomass(directorate, 0);

    const consortium = match();
    const other = creature(consortium);
    creditWound(consortium.world, other, 1);
    Health.hp[other] = 0;
    advance(consortium, 1);
    const contract = biomass(consortium, 1);

    assert.ok(full > contract, `${full} against ${contract}`);
    assert.ok(
      Math.abs(contract / full - DRIFT.RENDERING_CONTRACT_RATE) < 1e-6,
      'the contract rate is the doc figure, not a new one'
    );
    // Still scaled by the region's health, which is the snowball guard-rail.
    assert.ok(full <= worth, 'and a rendering never pays more than the creature is worth');
  });

  it('gives a shared kill to whoever landed the last blow', () => {
    // The one rule that needs no arbitration and no ledger. A creature two
    // navies shot is a creature one of them finished.
    const m = match();
    const prey = creature(m);
    creditWound(m.world, prey, 0);
    creditWound(m.world, prey, 1);
    Health.hp[prey] = 0;
    advance(m, 1);
    assert.equal(biomass(m, 0), 0, 'the first shooter gets nothing');
    assert.ok(biomass(m, 1) > 0, 'the last one renders it');
  });

  it('remembers the killer after the hull that fired is gone', () => {
    // A slot outlives its hulls, and the Biomass is owed to the player rather
    // than to the gun — which is why the record is a slot and not an entity.
    const m = match();
    const prey = creature(m);
    const shooter = hull(m, 0, Faction.Directorate, X + 700, Y);
    creditWound(m.world, prey, 0);
    Health.hp[shooter] = 0;
    advance(m, 1);
    Health.hp[prey] = 0;
    advance(m, 1);
    assert.ok(biomass(m, 0) > 0, 'the kill is still theirs');
  });
});

describe('and the two deaths that pay nobody', () => {
  it('pays nothing for a creature the map killed, even one somebody had shot', () => {
    // The half of §5 that already existed, and it must keep composing with the
    // half that did not: a creature a player wounded and the map finished is a
    // creature nobody rendered.
    //
    // Killed by the water rather than by writing the flag, because
    // `environmentalDeaths` is a per-tick set cleared at the top of every
    // step: a test that adds to it from outside a tick is testing its own
    // sequencing. A Tetherjelly in Failing water withers (docs/bestiary.md
    // §6) and reports itself, which is a real one of these deaths.
    const m = match();
    const prey = creature(m, FaunaSpecies.Tetherjelly);
    creditWound(m.world, prey, 0);
    while (m.world.drift.at(X, Y) >= DRIFT.HEALTH_FAILING) m.world.drift.recordKill(X, Y);
    advance(m, 90);
    assert.ok(Health.hp[prey] === undefined || Health.hp[prey]! <= 0, 'the field must wither out');
    assert.equal(biomass(m, 0), 0, 'and nobody rendered it');
  });

  it('pays nothing for a creature nobody touched', () => {
    const m = match();
    const prey = creature(m);
    Health.hp[prey] = 0;
    advance(m, 1);
    assert.equal(biomass(m, 0), 0);
    assert.equal(biomass(m, 1), 0);
  });

  it('charges a region less for a creature nobody rendered', () => {
    // §6: "a fauna death nobody rendered costs a quarter of what a rendered
    // one does". Before the killer was recorded, "rendered" was merely "not a
    // hazard kill", so a creature another creature ate cost the region the
    // full harvesting rate. One fact now answers both the payout and the
    // charge, so they cannot disagree.
    const harvested = match();
    const shot = creature(harvested);
    creditWound(harvested.world, shot, 0);
    const beforeHarvest = harvested.world.drift.at(X, Y);
    Health.hp[shot] = 0;
    advance(harvested, 1);
    const forHarvest = beforeHarvest - harvested.world.drift.at(X, Y);

    const unrendered = match();
    const eaten = creature(unrendered);
    const beforeEaten = unrendered.world.drift.at(X, Y);
    Health.hp[eaten] = 0;
    advance(unrendered, 1);
    const forEaten = beforeEaten - unrendered.world.drift.at(X, Y);

    // Absolute rather than a ratio: quiet water heals about 0.02 health in the
    // tick this takes, which is nothing against a kill and everything against
    // a ratio of two small numbers.
    const quarter = DRIFT.HEALTH_PER_KILL * DRIFT.HEALTH_PER_ENVIRONMENTAL_KILL_FACTOR;
    assert.ok(forEaten > 0, 'the region still loses the animal');
    assert.ok(
      Math.abs(forHarvest - DRIFT.HEALTH_PER_KILL) < 0.05,
      `a harvest costs the full rate: ${forHarvest}`
    );
    assert.ok(
      Math.abs(forEaten - quarter) < 0.05,
      `and a creature nobody rendered costs a quarter: ${forEaten}`
    );
  });

  it('still charges the region for a creature it lost either way', () => {
    // §6: the region really did lose the animal, so `recordKill` runs whoever
    // was or was not paid for it. The guard-rail against over-harvesting is
    // not an argument about attribution.
    const m = match();
    const before = m.world.drift.at(X, Y);
    const prey = creature(m);
    m.world.environmentalDeaths.add(prey);
    Health.hp[prey] = 0;
    advance(m, 1);
    assert.ok(m.world.drift.at(X, Y) < before, 'the water is poorer for it');
  });

  it('never carries an attribution into a creature born on a recycled id', () => {
    // bitecs recycles entity ids, so the sentinel matters: a creature born
    // into a dead raider's id must not arrive already owing its Biomass to
    // whoever shot that hull.
    const m = match();
    const prey = creature(m);
    assert.equal(Fauna.renderedBySlot[prey], -1);
  });
});
