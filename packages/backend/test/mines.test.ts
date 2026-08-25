/**
 * Mines (#165) — docs/systems-combat.md §6.
 *
 * A mine is the detection formula pointed backwards: it does not emit and wait
 * to be found, it listens and waits for you to be loud. That inversion is the
 * third pole of the weapon triangle, and it produces the one property the whole
 * mechanic exists for — **silence walks through a minefield, and a committed
 * push does not**.
 *
 * The trigger bar is derived rather than chosen (see MINE_TRIGGER_LOUDNESS),
 * which means the two SPEC behaviours it was solved from are exactly what these
 * tests have to hold: never on silence, always on a cruising Corvette inside
 * 150 m. If either stops being true the derivation has quietly stopped meaning
 * anything, and a scout starts dying to something that should have ignored it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import {
  Biome,
  Faction,
  MINE_TRIGGER_LOUDNESS,
  perceivedLoudness,
  ORDNANCE,
  OrdnanceKind,
  ResolutionTier,
  SILENT_RUNNING,
  SIM,
  UnitKind,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Health, Ordnance } from '../src/sim/components.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function openWaterMatch(seed = 5): Match {
  const terrain = new Terrain(12000, 12000, 200);
  const match = new Match(undefined, { fauna: false, seed, terrain });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

function liveMines(match: Match): number[] {
  const out: number[] = [];
  for (let eid = 0; eid < Ordnance.kind.length; eid++) {
    if (!hasComponent(match.world, Ordnance, eid)) continue;
    if (Ordnance.kind[eid] !== OrdnanceKind.Mine) continue;
    if (Health.hp[eid]! <= 0) continue;
    out.push(eid);
  }
  return out;
}

/**
 * Lay one armed mine for slot 0 at a position, and remove the hull that laid it
 * so the thing under test is the field rather than its escort.
 */
function armedMineAt(match: Match, x: number, y: number): number {
  const layer = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x,
    y,
  });
  advance(match, 0.2);
  const mine = match.layMine(0, layer);
  assert.notEqual(mine, 0, 'the mine should be accepted');
  // Past the arming clock, and far enough for the layer to be irrelevant.
  match.orderMove(0, layer, 11000, 11000);
  advance(match, ORDNANCE.MINE.ARMING_S + 1);
  return mine;
}

describe('mines', () => {
  it('derives a trigger that silence can never reach', () => {
    // Behaviour (1) of the derivation, asserted directly against the model
    // rather than through a match: `perceivedLoudness` clamps distance at the
    // reference distance, so the loudest a Silent Running hull can EVER read —
    // at any range, sitting on top of the mine — is its own SIG. If the bar
    // ever drops to or below that, silence stops being a way through a
    // minefield and the third pole of the weapon triangle collapses.
    assert.ok(
      MINE_TRIGGER_LOUDNESS > SILENT_RUNNING.SIG_MAX,
      `the trigger (${MINE_TRIGGER_LOUDNESS.toFixed(2)}) must sit above the loudest ` +
        `a silent hull can read (${SILENT_RUNNING.SIG_MAX})`
    );
  });

  it('calibrates against a hull the roster still has', () => {
    // The trigger is solved from "a cruising Corvette at 150 m". That figure is
    // written in the tuning rather than imported, so the roster can drift away
    // from it without anything complaining — except this.
    assert.equal(
      ORDNANCE.MINE.TRIGGER_REFERENCE_SIG,
      statsFor(UnitKind.Corvette).sigCruise,
      'the mine trigger is calibrated against a Corvette at cruise; the roster moved'
    );
  });

  it('lets a silent scout walk straight over it', () => {
    const match = openWaterMatch();
    const mine = armedMineAt(match, 6000, 6000);

    const scout = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5400,
      y: 6000,
    });
    match.setSilentRunning(1, scout, true);
    advance(match, 0.5);
    assert.ok(Acoustic.sig[scout]! <= SILENT_RUNNING.SIG_MAX, 'the scout is actually silent');

    // Straight across the mine and out the other side.
    match.orderMove(1, scout, 6600, 6000);
    advance(match, 20);

    assert.ok(Health.hp[scout]! > 0, 'a silent scout must survive crossing a minefield');
    assert.ok(liveMines(match).includes(mine), 'and the mine should still be waiting');
  });

  it('will not reach past 150 m for a hull loud enough to be heard further', () => {
    // The ceiling, and the half of §6 an earlier draft of the doc got wrong. It
    // claimed the loudness bar worked in both directions, so a Cruiser would
    // trip mines further out than the Corvette the bar was calibrated on. It
    // does not: the radius check is a hard gate that runs *before* the loudness
    // test, so 150 m is a property of the field rather than of whatever is
    // driving into it.
    //
    // A Cruiser is the right probe because it is unambiguously loud enough —
    // SIG 65 reads 34.0 at 150 m against a bar of 14.6, so if the gate were a
    // soft one it would have detonated this mine from well outside.
    const match = openWaterMatch();
    const mine = armedMineAt(match, 6000, 6000);

    const cruiser = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      // Just outside the ceiling, and far inside where its noise would carry.
      x: 6000 + ORDNANCE.MINE.TRIGGER_RADIUS_M + 25,
      y: 6000,
    });
    advance(match, 3);

    assert.ok(
      perceivedLoudness(Acoustic.sig[cruiser]!, 1, ORDNANCE.MINE.TRIGGER_RADIUS_M + 25) >
        MINE_TRIGGER_LOUDNESS,
      'the probe must be loud enough that only the radius gate can be saving it'
    );
    assert.ok(
      liveMines(match).includes(mine),
      'a mine must not reach past its radius, however loud the target is'
    );
    assert.equal(Health.hp[cruiser], statsFor(UnitKind.Cruiser).maxHp, 'and it takes no damage');

    // ...and the same hull one step inside the ceiling does set it off, so the
    // test is about the boundary rather than about a mine that never works.
    match.orderMove(1, cruiser, 6000 + ORDNANCE.MINE.TRIGGER_RADIUS_M - 40, 6000);
    advance(match, 12);
    assert.ok(!liveMines(match).includes(mine), 'inside the ceiling it triggers normally');
  });

  it('cannot hear a Light Scout at all, even at cruise', () => {
    // A consequence of the derivation rather than a rule anybody wrote, and
    // worth pinning because it is load-bearing and surprising.
    //
    // The bar is solved from a Corvette (SIG 28) at 150 m, which puts it at
    // 14.7. A Light Scout cruises at 12, and `perceivedLoudness` clamps at the
    // reference distance — so a scout reads 12 sitting directly on top of a
    // mine and never clears the bar at any range. Its effective trigger radius
    // is zero.
    //
    // That is the right behaviour and the reason the trigger is a *loudness*
    // bar rather than a proximity fuse: a minefield is a wall against a
    // committed push, and a scout is the tool you send ahead of one precisely
    // because it is too quiet to matter. It does not clear the field — the
    // army behind it still dies — it just survives finding it.
    assert.ok(
      statsFor(UnitKind.LightScout).sigCruise < MINE_TRIGGER_LOUDNESS,
      'a scout at cruise sits below the derived trigger, so mines are deaf to it'
    );

    const match = openWaterMatch();
    const mine = armedMineAt(match, 6000, 6000);
    const scout = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5400,
      y: 6000,
    });
    match.orderMove(1, scout, 6600, 6000);
    advance(match, 20);

    assert.ok(Health.hp[scout]! > 0, 'and it crosses without running silent at all');
    assert.ok(liveMines(match).includes(mine), 'the mine is still armed behind it');
  });

  it('kills a scout caught in a blast something louder set off', () => {
    // §9's band — "Mine (single) vs Light Scout: killed" — is about the blast,
    // not the trigger, and the two have nothing to do with each other: a scout
    // cannot set a mine off at any range (see above), and still dies to one.
    // That is what makes a minefield punish *formations* rather than
    // individuals — the hull that trips it takes its neighbours with it.
    //
    // "Caught in the blast" means close, because damage falls off linearly to
    // zero at the 200 m rim: a 180 HP scout needs a 0.6 share of 300, so it
    // dies inside about 80 m and merely loses paint at 150.
    const match = openWaterMatch();
    armedMineAt(match, 6000, 6000);

    const corvette = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5400,
      y: 6000,
    });
    // Stationed inside the blast and outside the trigger, rather than racing
    // the Corvette across the field.
    //
    // The first version had both hulls driving past, and it was measuring a
    // coincidence: a Light Scout is much the faster of the two, so whether it
    // was still inside the 200 m blast when the Corvette tripped the mine came
    // down to which tick the mine happened to sense on. Sense phase is
    // arbitrary — the interval is 0.2 s and nothing aligns it to an intruder's
    // arrival — so the margin moved the moment mines were staggered, and the
    // test failed without the claim it was written for having changed at all.
    //
    // 60 m off the mine: inside the lethal part of the blast, and a scout
    // cannot trip a mine at any range regardless, so a detonation here can only
    // have been the Corvette's doing.
    const escort = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6000,
      y: 6060,
    });
    match.orderMove(1, corvette, 6600, 6000);
    advance(match, 25);

    assert.ok(Health.hp[escort]! <= 0, 'the scout should die in the blast it did not trigger');
  });

  it('is a warning to a Corvette and a wall only in numbers', () => {
    // §9's band: a Corvette survives one mine, wounded. That is what makes a
    // *field* the weapon rather than a single mine, and it is the difference
    // between area denial and a trap.
    const match = openWaterMatch();
    armedMineAt(match, 6000, 6000);

    const corvette = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5400,
      y: 6000,
    });
    match.orderMove(1, corvette, 6600, 6000);
    advance(match, 25);

    assert.ok(Health.hp[corvette]! > 0, 'a Corvette should survive one mine');
    assert.ok(
      Health.hp[corvette]! < statsFor(UnitKind.Corvette).maxHp,
      '...but not untouched — it should be wounded'
    );
  });

  it('is loud to lay and silent once laid', () => {
    // §6: "The field is silent; *making* it is not." Both halves matter — the
    // first is what makes a minefield work, the second is the counter-play.
    const match = openWaterMatch();
    const layer = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    advance(match, 0.2);

    const mine = match.layMine(0, layer);
    advance(match, 1);
    assert.ok(
      Acoustic.sig[layer]! >= ORDNANCE.MINE.SIG_LAYING,
      `laying should broadcast at construction grade (was ${Acoustic.sig[layer]})`
    );
    assert.equal(Acoustic.sig[mine], ORDNANCE.MINE.SIG_ARMED, 'the mine itself is near-silent');

    advance(match, ORDNANCE.MINE.ARMING_S);
    assert.ok(
      Acoustic.sig[layer]! < ORDNANCE.MINE.SIG_LAYING,
      'and the hull goes quiet again once the mine is armed'
    );
  });

  it('is revealed by active sonar, at the ping’s usual price', () => {
    // §6 makes minesweeping the third job of the big red button. It needs no
    // code of its own: a mine carries Position, Acoustic, Owner and Health, so
    // the ping's hard-radius reveal already resolves it to Tier 4 like anything
    // else. This test exists to keep that true — a "skip ordnance" optimisation
    // in the Echo pass would silently delete the counter to minefields.
    const match = openWaterMatch();
    armedMineAt(match, 6000, 6000);

    const sweeper = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      // Inside the ping's 900 m reveal, outside the mine's 150 m trigger.
      x: 6500,
      y: 6000,
    });
    advance(match, 0.5);
    match.activeSonar(1, sweeper);

    let revealed: ResolutionTier | undefined;
    for (let i = 0; i < 30; i++) {
      const snapshots = match.update(STEP_MS);
      const view = snapshots?.get(1);
      if (view === undefined) continue;
      for (const contact of view.contacts) {
        if (contact.ordnance === OrdnanceKind.Mine) revealed = contact.tier;
      }
    }

    assert.equal(revealed, ResolutionTier.Track, 'a ping should light the minefield up');
  });

  it('goes deaf in a Thermal Vein, because the trigger is the same formula', () => {
    // §6: "Biome PF applies — it is the same formula. A mine in a Thermal Vein
    // is half deaf." Where minefields work is a property of the map, exactly
    // like everything else in this game.
    const vent = new Terrain(12000, 12000, 200);
    vent.fillRect(5000, 5000, 2000, 2000, Biome.ThermalVein);
    const match = new Match(undefined, { fauna: false, seed: 5, terrain: vent });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    armedMineAt(match, 6000, 6000);

    const scout = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5400,
      y: 6000,
    });
    match.orderMove(1, scout, 6600, 6000);
    advance(match, 20);

    // A Light Scout cruises at SIG 12; through PF 0.45 that is well under the
    // bar, so the vent hides it from a mine it would have set off in the open.
    assert.ok(Health.hp[scout]! > 0, 'a quiet hull crossing a vent-masked minefield should live');
  });

  it('caps how many a player may hold', () => {
    const match = openWaterMatch();
    const layer = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    advance(match, 0.2);

    let laid = 0;
    for (let i = 0; i < ORDNANCE.MINE.CAP_PER_PLAYER + 4; i++) {
      if (match.layMine(0, layer) !== 0) laid++;
      // Each lay occupies the hull for its arming time.
      advance(match, ORDNANCE.MINE.ARMING_S + 0.2);
    }

    assert.equal(laid, ORDNANCE.MINE.CAP_PER_PLAYER, 'the cap should bind');
    assert.ok(
      liveMines(match).length <= ORDNANCE.MINE.CAP_PER_PLAYER,
      'and never more than the cap should be in the water'
    );
  });

  it('cannot be shot out of the water, even by an ordered attack', () => {
    // §5 gives a torpedo 40 HP and everything else none, and that stat is what
    // keeps a minefield a wall you route around rather than one you delete.
    // The auto-acquire path always refused ordnance; an *ordered* attack did
    // not — and a player who pings a field holds a Tier-4 handle on every mine
    // in it, which is precisely when this would have been abused.
    const match = openWaterMatch();
    const mine = armedMineAt(match, 6000, 6000);

    const gunboat = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      // Inside the Cruiser's 900 m reach, outside the mine's 150 m trigger.
      x: 6700,
      y: 6000,
    });
    advance(match, 0.5);
    match.activeSonar(1, gunboat);

    // Whatever handles the ping just minted, try every one of them.
    let ordered = 0;
    for (let i = 0; i < 40; i++) {
      const snapshots = match.update(STEP_MS);
      const view = snapshots?.get(1);
      if (view === undefined) continue;
      for (const contact of view.contacts) {
        if (contact.ordnance !== OrdnanceKind.Mine) continue;
        match.orderAttackContact(1, gunboat, contact.id);
        ordered++;
      }
    }
    assert.ok(ordered > 0, 'the ping should have lit the mine up for the attacker to try');

    advance(match, 20);
    assert.ok(liveMines(match).includes(mine), 'and the mine should still be sitting there');
  });

  it('never triggers on its own side', () => {
    const match = openWaterMatch();
    armedMineAt(match, 6000, 6000);

    const friendly = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5400,
      y: 6000,
    });
    match.orderMove(0, friendly, 6600, 6000);
    advance(match, 30);

    assert.equal(
      Health.hp[friendly],
      statsFor(UnitKind.Cruiser).maxHp,
      'a mine must ignore the fleet that laid it'
    );
  });
});
