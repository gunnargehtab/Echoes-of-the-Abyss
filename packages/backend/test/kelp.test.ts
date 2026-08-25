/**
 * Kelp entanglement fields (#152) — docs/hazards.md §4.
 *
 * The first **permanent** hazard: no cycle, no telegraph, always gripping
 * unless something is actively holding it back. That alone breaks assumptions
 * the other three kinds share, so most of what is pinned here is about a
 * hazard that never waits.
 *
 * The mechanic itself is a trade, not a tax. Kelp is already the masking biome
 * at PF 0.55 — the field's whole contribution is that *moving* through it costs
 * speed and, because work is noise, costs quiet as well. A hull that stops is
 * silent and hidden. That is what makes the quiet route the slow route, and it
 * is the property to protect.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, HAZARDS, HazardPhase, SIM, UnitKind, statsFor } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Position } from '../src/sim/components.ts';
import { hazardStates, suppressKelpAt } from '../src/sim/systems/hazards.ts';
import { KELP_LABYRINTH, VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;

function kelpMap(radiusM = 1500): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: 'test-kelp',
    regions: [],
    hazards: [{ x: 4000, y: 4000, radiusM, kind: 'kelp-entanglement' }],
  };
}

function match(map: MapDefinition = kelpMap(), seed = 51): Match {
  return new Match(map, { fauna: false, seed, terrain: new Terrain(MAP_M, MAP_M, 250) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) m.update(STEP_MS);
}

/** How far a hull of `kind` gets in `seconds`, driving east from the centre. */
function reach(faction: Faction, kind: UnitKind, seconds: number, m = match()): number {
  const eid = spawnUnit(m.world, { kind, slot: 0, faction, x: 3400, y: 4000 });
  m.orderMove(0, eid, 3400 + 4000, 4000, false);
  advance(m, seconds);
  return Position.x[eid]! - 3400;
}

describe('a kelp field never waits', () => {
  it('is gripping from the first tick, with no telegraph', () => {
    // Every other hazard begins Dormant and warns before it acts. Kelp has no
    // cycle to wait in: it is there when the match starts, the way ground is.
    const m = match();
    assert.equal(m.world.hazards[0]!.phase, HazardPhase.Active);
    advance(m, 5);
    assert.equal(m.world.hazards[0]!.phase, HazardPhase.Active, 'and it stays gripping');
  });

  it('never advances into another phase on its own', () => {
    const m = match();
    // Longer than the longest cycle any other hazard has.
    advance(m, 130);
    assert.equal(m.world.hazards[0]!.phase, HazardPhase.Active);
  });

  it('reports its suppression rather than a phase clock it does not have', () => {
    // phaseDuration is Infinity for a kind with no cycle, and Infinity reaches
    // a client as null. What a player can use is the countdown to the canopy
    // closing again.
    const m = match();
    advance(m, 1);
    const gripping = hazardStates(m.world).find((h) => h.kind === 'kelp-entanglement');
    assert.ok(gripping !== undefined);
    assert.equal(gripping.remainingS, 0);
    assert.ok(Number.isFinite(gripping.progress));

    suppressKelpAt(m.world, 4000, 4000);
    advance(m, 1);
    const cleared = hazardStates(m.world).find((h) => h.kind === 'kelp-entanglement')!;
    assert.ok(cleared.remainingS > 0, 'a suppressed field counts down to closing');
    assert.ok(Number.isFinite(cleared.remainingS));
  });
});

describe('kelp is drag', () => {
  it('slows a hull inside it', () => {
    // Not Bathyarch: they burn the field they are standing in, so they are the
    // one faction that cannot be a control for drag. Every faction has an
    // opinion about kelp (doc §4), so there is no neutral one to reach for.
    const inside = reach(Faction.Hadron, UnitKind.Corvette, 5);
    const outside = reach(Faction.Hadron, UnitKind.Corvette, 5, match(kelpMap(1)));
    assert.ok(inside < outside * 0.85, `kelp should slow: ${inside} against ${outside} clear`);
  });

  it('drags a large hull harder than a small one', () => {
    // "Large units risk temporary immobilization" is not modelled; the floor is
    // what that clause is for. Compared as a *fraction* of each hull's own free
    // speed, since a Cruiser is slower than a Corvette in open water anyway.
    const share = (kind: UnitKind) =>
      reach(Faction.Directorate, kind, 5) / reach(Faction.Directorate, kind, 5, match(kelpMap(1)));
    const cruiser = share(UnitKind.Cruiser);
    const corvette = share(UnitKind.Corvette);
    assert.ok(
      statsFor(UnitKind.Cruiser).hullLengthM >= HAZARDS.KELP.LARGE_HULL_M,
      'the Cruiser must actually be large, or this tests nothing'
    );
    assert.ok(
      statsFor(UnitKind.Corvette).hullLengthM < HAZARDS.KELP.LARGE_HULL_M,
      'and the Corvette must not be'
    );
    assert.ok(cruiser < corvette, `large hulls fare worse: ${cruiser} against ${corvette}`);
  });

  it('never brings anything to a stop', () => {
    // The floor is a floor. A Cruiser in kelp is slow, not caught.
    const moved = reach(Faction.Hadron, UnitKind.Cruiser, 8);
    assert.ok(moved > 0, 'the worst case in the game still moves');
  });

  it('lets Pelagia through freely and catches the Knights worst', () => {
    // Measured over four seconds, safely inside the time thermal cutters need
    // to open a field, so the Consortium is being dragged here rather than
    // standing in a hole of their own making.
    assert.ok(
      4 < HAZARDS.KELP.BATHYARCH_BURN_S,
      'this window must stay shorter than the burn, or the Consortium reading is of open water'
    );
    const commune = reach(Faction.Pelagia, UnitKind.Corvette, 4);
    const knights = reach(Faction.Hadron, UnitKind.Corvette, 4);
    const consortium = reach(Faction.Bathyarch, UnitKind.Corvette, 4);
    const directorate = reach(Faction.Directorate, UnitKind.Corvette, 4);
    assert.ok(commune > directorate, '"Pelagia moves freely"');
    assert.ok(directorate > consortium, '"Abyssal bio-units tear through kelp"');
    assert.ok(knights < consortium, '"Hadron units get stuck more easily"');
  });

  it('leaves Pelagia at their open-water speed exactly', () => {
    const inside = reach(Faction.Pelagia, UnitKind.Corvette, 5);
    const clear = reach(Faction.Pelagia, UnitKind.Corvette, 5, match(kelpMap(1)));
    assert.ok(Math.abs(inside - clear) < 1, `freely means freely: ${inside} vs ${clear}`);
  });
});

describe('pushing through kelp is loud', () => {
  function sig(faction: Faction, kind: UnitKind, moving: boolean): number {
    const m = match();
    const eid = spawnUnit(m.world, { kind, slot: 0, faction, x: 4000, y: 4000 });
    if (moving) m.orderMove(0, eid, 7000, 4000, false);
    advance(m, 2);
    return Acoustic.sig[eid]!;
  }

  it('charges a hull for moving and nothing for sitting still', () => {
    // The trade the masking biome exists for. A field that made everything in
    // it loud would cancel the biome; one that made nothing loud would be mud.
    const still = sig(Faction.Hadron, UnitKind.Corvette, false);
    const pushing = sig(Faction.Hadron, UnitKind.Corvette, true);
    const clearWater = (() => {
      const m = match(kelpMap(1));
      const eid = spawnUnit(m.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Hadron,
        x: 4000,
        y: 4000,
      });
      m.orderMove(0, eid, 7000, 4000, false);
      advance(m, 2);
      return Acoustic.sig[eid]!;
    })();
    assert.ok(pushing > clearWater, `kelp must cost noise to cross: ${pushing} vs ${clearWater}`);
    assert.ok(still <= clearWater, `and nothing at all to sit in: ${still} vs ${clearWater}`);
  });

  it('charges Pelagia nothing, because nothing drags on them', () => {
    const m = match();
    const eid = spawnUnit(m.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Pelagia,
      x: 4000,
      y: 4000,
    });
    m.orderMove(0, eid, 7000, 4000, false);
    advance(m, 2);
    const inKelp = Acoustic.sig[eid]!;

    const clear = match(kelpMap(1));
    const other = spawnUnit(clear.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Pelagia,
      x: 4000,
      y: 4000,
    });
    clear.orderMove(0, other, 7000, 4000, false);
    advance(clear, 2);
    assert.equal(inKelp, Acoustic.sig[other], '"moves freely" is both halves — fast and quiet');
  });

  it('makes the loudest thing in the quietest biome a large hull in a hurry', () => {
    const cruiser = sig(Faction.Hadron, UnitKind.Cruiser, true);
    const scout = sig(Faction.Hadron, UnitKind.LightScout, true);
    assert.ok(cruiser > scout, `${cruiser} against ${scout}`);
  });
});

describe('something can clear it', () => {
  it('stops gripping after a blast inside it, and grips again later', () => {
    const m = match();
    const before = reach(Faction.Hadron, UnitKind.Corvette, 3, m);
    assert.ok(before > 0);

    const cleared = match();
    suppressKelpAt(cleared.world, 4000, 4000);
    const during = reach(Faction.Hadron, UnitKind.Corvette, 3, cleared);
    assert.ok(during > before * 1.15, `a cleared field should not drag: ${during} vs ${before}`);

    // ...and it closes again.
    const closing = match();
    suppressKelpAt(closing.world, 4000, 4000);
    advance(closing, HAZARDS.KELP.BLAST_CLEAR_S + 2);
    assert.equal(
      closing.world.hazards[0]!.phase,
      HazardPhase.Active,
      'the canopy must close again, or a single mine disables the map'
    );
  });

  it('ignores a blast outside it', () => {
    const m = match();
    suppressKelpAt(m.world, 7000, 7000);
    advance(m, 1);
    assert.equal(m.world.hazards[0]!.phase, HazardPhase.Active);
  });

  it('is held open by a Bathyarch hull standing in it, and closes when it leaves', () => {
    // "Bathyarch can burn kelp with thermal cutters" — doc §4. The same bargain
    // as vent stabilisation: it holds while you stay.
    const m = match();
    const cutter = spawnUnit(m.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    // Cutting is not instant — the canopy takes BATHYARCH_BURN_S of continuous
    // presence to come apart. Before that, the Consortium is just a hull in
    // kelp like anyone else.
    advance(m, HAZARDS.KELP.BATHYARCH_BURN_S - 2);
    assert.equal(
      m.world.hazards[0]!.phase,
      HazardPhase.Active,
      'a hull that has only just arrived has not cut anything yet'
    );
    advance(m, 4);
    assert.equal(m.world.hazards[0]!.phase, HazardPhase.Dormant, 'cutters hold the canopy open');

    // Walk it well clear and the field closes behind it.
    Position.x[cutter] = 7500;
    advance(m, HAZARDS.KELP.BATHYARCH_BURN_S + 2);
    assert.equal(m.world.hazards[0]!.phase, HazardPhase.Active, 'and it closes once they leave');
  });

  it('makes cutting loud, so clearing the maze core announces itself', () => {
    // The sound argument for the Consortium's interaction, and what stops
    // burning being a free counter to the map: thermal cutters are industrial
    // machinery running in the one biome built for hiding. Paid standing still,
    // unlike drag, because cutting is work you are doing on purpose.
    const m = match();
    const cutter = spawnUnit(m.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const other = spawnUnit(m.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 4100,
      y: 4000,
    });
    advance(m, 2);
    assert.ok(
      Acoustic.sig[cutter]! > Acoustic.sig[other]!,
      `a hull burning kelp must be louder than one merely sitting in it: ` +
        `${Acoustic.sig[cutter]} against ${Acoustic.sig[other]}`
    );
  });

  it('does not hold open for anybody else', () => {
    const m = match();
    spawnUnit(m.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
    });
    advance(m, 3);
    assert.equal(m.world.hazards[0]!.phase, HazardPhase.Active, 'only thermal cutters burn kelp');
  });
});

describe('the authored map', () => {
  it('still carries the kelp fields the doc puts in the maze core', () => {
    const fields = KELP_LABYRINTH.hazards.filter((h) => h.kind === 'kelp-entanglement');
    assert.ok(fields.length >= 2, 'the Kelp Labyrinth must have kelp in it');
  });
});
