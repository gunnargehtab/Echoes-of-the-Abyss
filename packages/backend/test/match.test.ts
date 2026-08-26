/**
 * Integration tests for the simulation loop and the Echo Layer.
 *
 * These exercise the parts that unit-testing the math cannot reach: the ECS
 * wiring, the spatial-hash broadphase, and — most importantly — the guarantee
 * that a player is never sent information they did not earn.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEPTH,
  ECONOMY,
  Faction,
  HARVEST_THROTTLE,
  HarvestThrottle,
  ResolutionTier,
  ResourceKind,
  SIM,
  SILENT_RUNNING,
  STRUCTURE_AURAS,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import {
  Position,
  Acoustic,
  DepthOrder,
  Harvester,
  HarvestMode,
  Health,
  Pressure,
  SilentRunning,
} from '../src/sim/components.ts';
import type { EchoSnapshot } from '@echoes/shared';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** Advance the match and return the most recent snapshot map produced. */
function advance(match: Match, seconds: number): Map<number, EchoSnapshot> | null {
  let latest: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const result = match.update(STEP_MS);
    if (result !== null) latest = result;
  }
  return latest;
}

function twoPlayerMatch(): Match {
  const match = new Match(undefined, { fauna: false });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

describe('simulation loop', () => {
  it('advances tick at the fixed rate regardless of update granularity', () => {
    const match = twoPlayerMatch();
    advance(match, 1);
    // One second of wall-clock should be ~TICK_HZ fixed steps.
    assert.ok(
      Math.abs(match.tick - SIM.TICK_HZ) <= 2,
      `expected ~${SIM.TICK_HZ} ticks, got ${match.tick}`
    );
  });

  it('produces a snapshot for every joined player', () => {
    const match = twoPlayerMatch();
    const snapshots = advance(match, 1);
    assert.ok(snapshots !== null);
    assert.ok(snapshots.has(0));
    assert.ok(snapshots.has(1));
  });

  it('gives each player their own units in full detail', () => {
    const match = twoPlayerMatch();
    const snapshots = advance(match, 1)!;
    const own = snapshots.get(0)!.units;
    assert.ok(own.length > 0);
    for (const unit of own) {
      assert.ok(unit.hp > 0);
      assert.ok(unit.sig >= 0 && unit.sig <= 100);
      assert.equal(typeof unit.silentRunning, 'boolean');
    }
  });
});

describe('Echo Layer', () => {
  it('hears nothing across the map at spawn', () => {
    const match = twoPlayerMatch();
    const snapshots = advance(match, 1)!;
    // Starting forces are placed in opposite corners, far out of earshot.
    assert.equal(snapshots.get(0)!.contacts.length, 0);
    assert.equal(snapshots.get(1)!.contacts.length, 0);
  });

  it('resolves a contact once a loud unit closes the distance', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    // Park one of player 1's units right next to player 0's force.
    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
    Position.x[theirs.id] = Position.x[mine.id]! + 300;
    Position.y[theirs.id] = Position.y[mine.id]!;

    const snapshots = advance(match, 0.5)!;
    const contacts = snapshots.get(0)!.contacts;
    assert.ok(contacts.length > 0, 'player 0 should hear the intruder');
    assert.ok(contacts[0]!.tier > ResolutionTier.Silent);
  });

  it('withholds classification below Tier 3 and identity below Tier 4', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
    // Far enough to register, close enough to matter.
    Position.x[theirs.id] = Position.x[mine.id]! + 1500;
    Position.y[theirs.id] = Position.y[mine.id]!;

    const contacts = advance(match, 0.5)!.get(0)!.contacts;
    for (const contact of contacts) {
      if (contact.tier < ResolutionTier.Classification) {
        assert.equal(contact.kind, undefined, 'leaked unit type below Tier 3');
        assert.equal(contact.faction, undefined, 'leaked faction below Tier 3');
        assert.equal(contact.depth, undefined, 'leaked depth below Tier 3');
      }
      if (contact.tier < ResolutionTier.Track) {
        assert.equal(contact.hp, undefined, 'leaked health below Tier 4');
        assert.equal(contact.heading, undefined, 'leaked heading below Tier 4');
      }
    }
  });

  it('goes quiet when a unit runs silent', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    // A Corvette (idle SIG 28): loud enough to be tracked at this range, and
    // quiet enough to vanish under Silent Running. The Light Scout would be
    // inaudible here even when loud, proving nothing.
    const theirs = advance(match, 0.2)!
      .get(1)!
      .units.find((u) => u.kind === UnitKind.Corvette)!;
    Position.x[theirs.id] = Position.x[mine.id]! + 1200;
    Position.y[theirs.id] = Position.y[mine.id]!;

    const loudTier = advance(match, 0.5)!.get(0)!.contacts[0]?.tier ?? ResolutionTier.Silent;

    match.setSilentRunning(1, theirs.id, true);
    const quiet = advance(match, 0.5)!.get(0)!.contacts;
    const quietTier = quiet[0]?.tier ?? ResolutionTier.Silent;

    assert.ok(SilentRunning.active[theirs.id] === 1);
    assert.ok(Acoustic.sig[theirs.id]! <= 8, 'silent running should collapse SIG');
    assert.ok(quietTier < loudTier, 'going silent must reduce resolution');
  });

  it('an active ping reveals everything nearby and the pinger to everyone', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
    // Inside the 900 m reveal radius, and running silent so passive
    // detection alone would find nothing.
    Position.x[theirs.id] = Position.x[mine.id]! + 700;
    Position.y[theirs.id] = Position.y[mine.id]!;
    match.setSilentRunning(1, theirs.id, true);

    const beforePing = advance(match, 0.5)!.get(0)!.contacts;
    const beforeTier = beforePing[0]?.tier ?? ResolutionTier.Silent;

    match.activeSonar(0, mine.id);
    const afterSnapshots = advance(match, 0.4)!;

    const revealed = afterSnapshots.get(0)!.contacts.find((c) => c.tier === ResolutionTier.Track);
    assert.ok(revealed !== undefined, 'ping should hard-reveal the silent unit');
    assert.ok(revealed.tier > beforeTier);
    assert.equal(typeof revealed.kind, 'number', 'Tier 4 must include identity');

    // ...and the cost: the pinger is now screaming.
    const heardBack = afterSnapshots.get(1)!.contacts;
    assert.ok(heardBack.length > 0, 'pinging must expose the pinger');
  });

  it('stays inside its work budget for a small match in contact', () => {
    // Counted work, not wall clock.
    //
    // This assertion used to read `worstEchoPassMs < SIM.ECHO_BUDGET_MS`, and
    // it measured almost nothing it claimed to. Two things were wrong with it.
    //
    // The scenario did no detection: two navies at opposite spawns are pruned
    // before any pair reaches a path walk, so the pass being timed was an idle
    // one and the figure was dominated by first-pass JIT warmup. Measured on
    // one idle machine, the same match cost 0.849 ms cold and 0.184 ms warm —
    // and the "worst" pass was always the first.
    //
    // And a maximum of a wall-clock sample is the noisiest statistic available
    // on a shared runner. The scenario below, run three times in one process,
    // measured 2.035 ms, 1.204 ms and 0.247 ms for identical work — an eight-
    // fold spread straddling the budget. It failed once in CI on exactly that.
    //
    // `contactPathWalksLastPass` counts the path integrals the pass actually
    // performed, which is the expensive half of it and the thing a widening
    // would move. It reported 107 on every one of those three runs. The residue
    // read is guarded the same way (echoMarks.test.ts) and for the same reason:
    // a counter is identical on every machine, so it fails only when the work
    // really changed.
    const match = twoPlayerMatch();
    // Two fleets inside each other's earshot — the state where the Echo pass
    // costs anything at all, and so the only state worth budgeting.
    for (let i = 0; i < 12; i++) {
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 5000 + (i % 4) * 120,
        y: 5000 + Math.floor(i / 4) * 120,
      });
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: 1,
        faction: Faction.Pelagia,
        x: 5600 + (i % 4) * 120,
        y: 5000 + Math.floor(i / 4) * 120,
      });
    }

    let worstWalks = 0;
    for (let i = 0; i < SIM.TICK_HZ * 3; i++) {
      if (match.update(STEP_MS) === null) continue;
      worstWalks = Math.max(worstWalks, match.contactPathWalksLastPass);
    }

    // Headroom over the observed 107 for ordinary tuning, and nowhere near
    // enough to hide the pruning skip of #90 going away — without it every
    // candidate pair walks, which for these fleets is several hundred.
    const WALK_BUDGET = 160;
    assert.ok(
      worstWalks <= WALK_BUDGET,
      `Echo pass did ${worstWalks} path integrals, budget ${WALK_BUDGET}`
    );
    // The clock is still worth seeing, and still not worth failing on.
    console.log(
      `echo pass, small match in contact: ${worstWalks} path integrals worst pass, ` +
        `${match.worstEchoPassMs.toFixed(3)} ms (budget ${SIM.ECHO_BUDGET_MS} ms)`
    );
  });
});

describe('command validation', () => {
  it('ignores orders for units the caller does not own', () => {
    const match = twoPlayerMatch();
    advance(match, 1);
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;

    const beforeX = Position.x[theirs.id]!;
    // Player 0 tries to drive player 1's unit.
    match.orderMove(0, theirs.id, beforeX + 3000, Position.y[theirs.id]!);
    advance(match, 1);

    assert.equal(Position.x[theirs.id], beforeX, 'unit moved on a foreign order');
  });

  it('ignores silent running toggles from a non-owner', () => {
    const match = twoPlayerMatch();
    advance(match, 1);
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;

    match.setSilentRunning(0, theirs.id, true);
    assert.equal(SilentRunning.active[theirs.id], 0);
  });
});

describe('economy', () => {
  it('starts each player with a base, an escort, and the stockpile', () => {
    const match = twoPlayerMatch();
    const snapshot = advance(match, 0.5)!.get(0)!;
    assert.equal(snapshot.nodules, ECONOMY.STARTING_NODULES);
    const kinds = snapshot.structures.map((s) => s.kind).sort();
    assert.deepEqual(kinds, [StructureKind.Bastion, StructureKind.Foundry]);
    assert.ok(snapshot.units.some((u) => u.kind === UnitKind.Harvester));
  });

  it('runs the harvest loop: mine loudly, haul home, bank the cargo', () => {
    const match = twoPlayerMatch();
    // The starting harvester self-assigns the home field. Give it time for at
    // least one full trip: ~700 m out at 40 m/s, 5 s mining, ~700 m back.
    const snapshots = advance(match, 60)!;
    const snapshot = snapshots.get(0)!;
    assert.ok(
      snapshot.nodules > ECONOMY.STARTING_NODULES,
      `expected deposits above the starting ${ECONOMY.STARTING_NODULES}, got ${snapshot.nodules}`
    );
  });

  it('mining loudness follows the throttle', () => {
    const match = twoPlayerMatch();
    advance(match, 0.2);
    const harvester = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.kind === UnitKind.Harvester)!;

    // Park the harvester in mining state and compare throttle SIGs directly.
    Harvester.mode[harvester.id] = HarvestMode.Mining;
    match.setThrottle(0, harvester.id, HarvestThrottle.Overburden);
    advance(match, 0.2);
    const loud = Acoustic.sig[harvester.id]!;
    Harvester.mode[harvester.id] = HarvestMode.Mining;
    match.setThrottle(0, harvester.id, HarvestThrottle.Trickle);
    advance(match, 0.2);
    const quiet = Acoustic.sig[harvester.id]!;
    assert.ok(loud > quiet, `Overburden (${loud}) must be louder than Trickle (${quiet})`);
  });

  /**
   * The throttle has to be a decision, and a decision needs a trade.
   *
   * It did not have one. The multiplier used to scale the fill *rate*, which
   * only decides how long a harvester stands on the node — five seconds
   * against Overburden's three and a half, out of a forty-five second round
   * trip dominated by travel. Measured over six minutes, Overburden and
   * Standard banked the identical number of nodules while Overburden emitted
   * 23 more SIG: not a marginal trap but strict domination, a 40% premium that
   * bought nothing at all.
   *
   * So this test is the property that was missing rather than three numbers:
   * walk the throttles in order of loudness and require income to rise with
   * noise every step. Any future retuning that reintroduces a setting which
   * earns no more while emitting more fails here.
   *
   * Three real matches, three simulated minutes each, which is what it costs
   * to measure a round-trip economy end to end. The sim is deterministic with
   * fauna off and no AI seats, so the numbers are exact rather than sampled.
   */
  it('pays for noise: a louder throttle earns strictly more', () => {
    const MINUTES = 3;

    function income(throttle: HarvestThrottle): { earned: number; meanSig: number } {
      const match = twoPlayerMatch();
      // Long enough for the first snapshot to name the starting harvester.
      const first = advance(match, 1)!;
      const harvester = first.get(0)!.units.find((u) => u.kind === UnitKind.Harvester)!;
      match.setThrottle(0, harvester.id, throttle);

      let sigTotal = 0;
      let samples = 0;
      let latest = first;
      const steps = Math.ceil((MINUTES * 60 * 1000) / STEP_MS);
      for (let i = 0; i < steps; i++) {
        const snapshots = match.update(STEP_MS);
        if (snapshots !== null) latest = snapshots;
        sigTotal += Acoustic.sig[harvester.id]!;
        samples++;
      }
      return {
        earned: latest.get(0)!.nodules - ECONOMY.STARTING_NODULES,
        meanSig: sigTotal / samples,
      };
    }

    // Ordered by what the throttle costs, quietest first (docs/economy.md §3).
    const ladder = [HarvestThrottle.Trickle, HarvestThrottle.Standard, HarvestThrottle.Overburden];
    const measured = ladder.map((throttle) => ({ throttle, ...income(throttle) }));

    for (let i = 1; i < measured.length; i++) {
      const quieter = measured[i - 1]!;
      const louder = measured[i]!;
      const name = (m: (typeof measured)[number]): string =>
        `${HarvestThrottle[m.throttle]} (${m.earned.toFixed(0)} nodules, mean SIG ${m.meanSig.toFixed(1)})`;

      assert.ok(
        HARVEST_THROTTLE[louder.throttle].sig > HARVEST_THROTTLE[quieter.throttle].sig,
        `the ladder must run quiet to loud: ${name(quieter)} then ${name(louder)}`
      );
      // Materially more, not a rounding win: a premium smaller than the
      // measurement's own granularity — one delivery — is not a decision
      // surface either.
      assert.ok(
        louder.earned > quieter.earned * 1.1,
        `${name(louder)} costs more noise than ${name(quieter)} and must earn materially more`
      );
    }
  });
});

describe('Resonance Crystal', () => {
  /**
   * How far a forward refinery sits from the field it serves. Clear of the
   * footprint plus the hull, so a harvester can still reach the node, and
   * inside the docking range so it can still unload — the same window
   * Match.build's placement rules leave for a real player.
   */
  const FORWARD_REFINERY_OFFSET_M = 220;

  /** The crystal field this map seeds, dead centre and Abyssal. */
  function crystalField(match: Match) {
    return match.resourceNodes.find((n) => n.kind === ResourceKind.ResonanceCrystal)!;
  }

  /**
   * The default map with its hazards taken out, for the two round-trip tests.
   *
   * They already neutralise the other confounders by hand — `fauna: false`, and
   * a PR-3 hull "so the cycle is not confounded by crush" — and the eruption
   * belongs on that list: it sits over the crystal field, and a harvester
   * parked there for a full cut is inside the plume when it fires.
   *
   * It was silently neutralised before rather than deliberately. `hazardsSystem`
   * never reported its kills, so a harvester the eruption killed carried on
   * hauling at zero HP and banked its load anyway; the round trip was being
   * completed by a corpse. Once hazard kills became real deaths these tests
   * failed, which is the bug surfacing rather than a regression. Stated here so
   * the isolation is a decision instead of an accident.
   */
  function calmMap(): MapDefinition {
    return { ...VENTFRONT_DIVIDE, hazards: [] };
  }

  it('places crystal in the Abyssal band, where it cannot be worked casually', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    const field = crystalField(match);
    assert.ok(field !== undefined, 'the map seeds a crystal field');
    assert.ok(field.depth >= 1800, 'and puts it in the Abyssal band');
    assert.ok(
      match.resourceNodes.some((n) => n.kind === ResourceKind.Nodule && n.depth < 1800),
      'while nodule fields stay in the working middle'
    );
  });

  it('runs a full crystal cycle: descend, cut, climb, bank', () => {
    const match = new Match(calmMap(), { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    advance(match, 0.5);
    const field = crystalField(match);

    // A forward refinery beside the field — docs/economy.md §4's "refine
    // forward and accept a loud installation on contested ground". It makes
    // the haul essentially vertical, which is the leg this test is about.
    //
    // Beside, not on top: hulls are kept out of structure footprints, so a
    // refinery centred on the field would shove its own harvesters out of
    // mining range. Match.build already refuses that placement for real
    // players; this offset respects the same rule.
    spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Directorate,
      x: field.x + FORWARD_REFINERY_OFFSET_M,
      y: field.y,
      prebuilt: true,
    });

    // A PR-3 hull survives the field, so the cycle is not confounded by crush.
    const hauler = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Directorate,
      x: field.x,
      y: field.y,
      depth: 600,
    });
    Pressure.rating[hauler] = 3;
    match.orderHarvest(0, hauler, field.id);

    // Watch the whole trip rather than sampling it at guessed instants: the
    // hold fills in seconds, so "on station" is a moment, not a phase.
    let sawDescentNoise = false;
    let sawOnStationCutting = false;
    let loudestWhileCutting = 0;
    let deepest = 0;
    let banked = 0;
    for (let i = 0; i < 400; i++) {
      const snapshot = advance(match, 1);
      const depth = Position.depth[hauler]!;
      deepest = Math.max(deepest, depth);
      if (DepthOrder.descending[hauler] === 1 && Acoustic.sig[hauler]! >= DEPTH.DESCENT_SIG) {
        sawDescentNoise = true;
      }
      if (Harvester.mode[hauler] === HarvestMode.Mining) {
        loudestWhileCutting = Math.max(loudestWhileCutting, Acoustic.sig[hauler]!);
        if (Math.abs(depth - field.depth) <= 100) sawOnStationCutting = true;
      }
      banked = Math.max(banked, snapshot?.get(0)?.crystal ?? banked);
      if (banked > 0) break;
    }

    assert.ok(sawDescentNoise, 'the descent to the field announces itself');
    assert.ok(deepest >= field.depth - 100, 'the hauler actually reached the Abyssal field');
    assert.ok(sawOnStationCutting, 'and only cut once it was down there');
    assert.ok(
      loudestWhileCutting > HARVEST_THROTTLE[HarvestThrottle.Standard].sig,
      'crystal costs more noise to cut than nodules do at the same throttle'
    );
    assert.ok(banked > 0, 'the hold made it home and became stockpile');
  });

  it('makes the climb home the slow half of the round trip', () => {
    const match = new Match(calmMap(), { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    advance(match, 0.5);
    const field = crystalField(match);
    spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Directorate,
      x: field.x + FORWARD_REFINERY_OFFSET_M,
      y: field.y,
      prebuilt: true,
    });
    const hauler = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Directorate,
      x: field.x,
      y: field.y,
      depth: 600,
    });
    Pressure.rating[hauler] = 3;
    match.orderHarvest(0, hauler, field.id);

    let downSeconds = 0;
    let upSeconds = 0;
    let reachedField = false;
    for (let i = 0; i < 400; i++) {
      advance(match, 1);
      if (DepthOrder.active[hauler] === 1) {
        if (DepthOrder.descending[hauler] === 1) downSeconds++;
        else upSeconds++;
      }
      if (Position.depth[hauler]! >= field.depth - 100) reachedField = true;
      // Home again — but only once it has actually been down there, or the
      // loop would exit on the first tick, at the surface with an empty hold.
      if (reachedField && Math.abs(Position.depth[hauler]! - 600) < 60) break;
    }

    assert.ok(downSeconds > 0 && upSeconds > 0, 'the trip had both legs');
    assert.ok(
      upSeconds > downSeconds * 2,
      `ascent must dominate the round trip (down ${downSeconds}s, up ${upSeconds}s)`
    );
  });

  it('gates the upper tech tier behind crystal, server-side', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Hadron);
    match.addPlayer(1, Faction.Pelagia);
    advance(match, 0.5);
    const bastion = advance(match, 0.4)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;

    // Plenty of nodules, no crystal: the signature structure is refused.
    match.world.economies.get(0)!.nodules = 5000;
    const x = bastion.x + 500;
    const y = bastion.y + 500;
    assert.equal(
      match.build(0, StructureKind.SoundingSpire, x, y),
      false,
      'nodules alone do not buy the upper tech tier'
    );

    match.world.economies.get(0)!.crystal = 500;
    assert.equal(match.build(0, StructureKind.SoundingSpire, x, y), true, 'crystal does');
    assert.ok(match.world.economies.get(0)!.crystal < 500, 'and is spent on it');
  });

  it('refuses a crystal-locked hull until the crystal is in hand', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    advance(match, 0.5);
    const foundry = advance(match, 0.4)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Foundry)!;

    match.world.economies.get(0)!.nodules = 5000;
    match.world.economies.get(0)!.crystal = 0;
    assert.equal(
      match.produce(0, foundry.id, UnitKind.AbyssalSubmersible),
      false,
      'the deep hull is crystal-locked'
    );
    assert.equal(
      match.produce(0, foundry.id, UnitKind.Corvette),
      true,
      'the ordinary roster is not'
    );

    match.world.economies.get(0)!.crystal = 200;
    assert.equal(
      match.produce(0, foundry.id, UnitKind.AbyssalSubmersible),
      true,
      'with crystal aboard it builds'
    );
  });
});

describe('construction and production', () => {
  it('builds a structure for its cost, loudly, then quiets to its idle SIG', () => {
    const match = twoPlayerMatch();
    const before = advance(match, 0.5)!.get(0)!;
    const bastion = before.structures.find((s) => s.kind === StructureKind.Bastion)!;

    const placed = match.build(0, StructureKind.Refinery, bastion.x, bastion.y + 700);
    assert.ok(placed, 'placement beside the Bastion should be legal');

    const during = advance(match, 1)!.get(0)!;
    const stats = structureStatsFor(StructureKind.Refinery);
    assert.equal(during.nodules, before.nodules - stats.cost);
    const site = during.structures.find((s) => s.kind === StructureKind.Refinery)!;
    assert.ok(site.buildProgress < 1);
    assert.ok(
      site.sig > stats.sigIdle,
      'a construction site must be louder than the finished hull'
    );

    advance(match, stats.buildTimeS);
    const done = advance(match, 0.5)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Refinery)!;
    assert.equal(done.buildProgress, 1);
    assert.equal(done.hp, done.maxHp);
    assert.equal(done.sig, stats.sigIdle);
  });

  it('rejects builds that are unfunded, unanchored, or overlapping', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;

    // Far from every own structure: no anchor.
    assert.equal(match.build(0, StructureKind.Refinery, 4000, 4000), false);
    // Directly on the Bastion: overlapping.
    assert.equal(match.build(0, StructureKind.Refinery, bastion.x, bastion.y), false);
    // The Bastion itself is never for sale.
    assert.equal(match.build(0, StructureKind.Bastion, bastion.x, bastion.y + 700), false);
  });

  it('produces a queued unit after its build time, for its cost', () => {
    const match = twoPlayerMatch();
    const before = advance(match, 0.5)!.get(0)!;
    const foundry = before.structures.find((s) => s.kind === StructureKind.Foundry)!;
    const unitCountBefore = before.units.length;

    assert.ok(match.produce(0, foundry.id, UnitKind.LightScout));
    const queued = advance(match, 0.5)!.get(0)!;
    assert.equal(queued.nodules, before.nodules - statsFor(UnitKind.LightScout).cost);
    assert.equal(queued.structures.find((s) => s.id === foundry.id)!.queue.length, 1);

    advance(match, statsFor(UnitKind.LightScout).buildTimeS + 1);
    const after = advance(match, 0.5)!.get(0)!;
    assert.equal(after.units.length, unitCountBefore + 1);
    assert.equal(after.structures.find((s) => s.id === foundry.id)!.queue.length, 0);
  });

  it('refuses production of combat hulls at the Bastion', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;
    assert.equal(match.produce(0, bastion.id, UnitKind.Cruiser), false);
    assert.ok(match.produce(0, bastion.id, UnitKind.Harvester));
  });
});

describe('combat', () => {
  /** Park an armed unit of each player within weapon range of the other. */
  function stageBrawl(match: Match): { attacker: number; victim: number } {
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const attacker = snapshots.get(0)!.units.find((u) => u.kind === UnitKind.Corvette)!;
    const victim = snapshots.get(1)!.units.find((u) => u.kind === UnitKind.LightScout)!;
    Position.x[victim.id] = Position.x[attacker.id]! + 300;
    Position.y[victim.id] = Position.y[attacker.id]!;
    return { attacker: attacker.id, victim: victim.id };
  }

  it('auto-engages an enemy inside weapon range and raises the firing SIG', () => {
    const match = twoPlayerMatch();
    const { attacker, victim } = stageBrawl(match);
    const hpBefore = Health.hp[victim]!;

    advance(match, 1);
    assert.ok(Health.hp[victim]! < hpBefore, 'a corvette must return fire at 300 m');
    assert.ok(
      Acoustic.sig[attacker]! > statsFor(UnitKind.Corvette).sigIdle,
      'firing must spike SIG above idle'
    );
  });

  it('a silent unit holds its fire until ordered', () => {
    const match = twoPlayerMatch();
    const { victim } = stageBrawl(match);
    // Silence the whole escort — the victim sits inside several weapon ranges.
    for (const unit of advance(match, 0.2)!.get(0)!.units) {
      match.setSilentRunning(0, unit.id, true);
    }
    const hpBefore = Health.hp[victim]!;
    advance(match, 1);
    assert.equal(Health.hp[victim], hpBefore, 'silent running must suppress auto-fire');
  });

  it('destroying the Bastion eliminates the player and ends the match', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(1)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;

    Health.hp[bastion.id] = 1;
    // Any kill path works; crush it via the pressure system by pretending the
    // structure sank. Structures have no Pressure component, so use combat:
    // park an enemy cruiser next to it instead.
    const cruiser = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.kind === UnitKind.Corvette)!;
    Position.x[cruiser.id] = Position.x[bastion.id]! + 200;
    Position.y[cruiser.id] = Position.y[bastion.id]!;

    advance(match, 2);
    assert.ok(match.result !== null, 'the match must resolve');
    assert.equal(match.result!.winnerSlot, 0);
    const final = advance(match, 0.5)!;
    assert.equal(final.get(1)!.units.length, 0, 'the eliminated force must scuttle');
  });
});

describe('structures in the Echo Layer', () => {
  it('classifies a heard structure by its structure kind, not a unit kind', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    // Park a high-HYD listener right on top of the enemy Bastion.
    const listener = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.kind === UnitKind.LightScout)!;
    const bastion = advance(match, 0.2)!
      .get(1)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;
    Position.x[listener.id] = bastion.x + 300;
    Position.y[listener.id] = bastion.y;

    const contacts = advance(match, 0.5)!.get(0)!.contacts;
    const heard = contacts.find((c) => c.structure !== undefined);
    assert.ok(heard !== undefined, 'a Bastion at 300 m must classify');
    assert.equal(heard.structure, StructureKind.Bastion);
    assert.equal(heard.kind, undefined, 'a structure contact must not claim a unit kind');
  });
});

describe('depth', () => {
  it("inflicts unhealable crush attrition below a unit's pressure rating", () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const units = advance(match, 0.2)!.get(0)!.units;
    // A Harvester is PR-1; the Abyssal band needs PR-3.
    const shallow = units.find((u) => u.kind === UnitKind.Harvester)!;
    const hpBefore = shallow.hp;

    Position.depth[shallow.id] = 3000;
    advance(match, 2);

    const after = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.id === shallow.id);
    assert.ok(after !== undefined, 'unit should still be alive after 2s');
    assert.ok(after.hp < hpBefore, 'overreaching depth must cost hull');
  });

  it('descends toward an ordered depth, and reports the order back', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    advance(match, 0.5);
    // A PR-3 submersible can be sent deep without the crush confusing the read.
    const sub = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Directorate,
      x: 4000,
      y: 4000,
      depth: 600,
    });

    assert.equal(match.orderDepth(0, sub, 2000), true, 'a rated dive is accepted');
    advance(match, 1);

    const depth = Position.depth[sub]!;
    assert.ok(depth > 600, 'the hull should have started down');
    assert.ok(depth < 2000, 'and should not teleport to the ordered depth');

    const unit = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.id === sub)!;
    assert.equal(unit.depthOrder, 2000, 'the player is told where their own hull is headed');

    // Long enough to cover the remaining 1,400 m at the descent rate.
    advance(match, 2000 / DEPTH.DESCENT_RATE_MPS + 1);
    assert.equal(Position.depth[sub], 2000, 'an arrived order settles exactly on target');
    assert.equal(DepthOrder.active[sub], 0, 'and clears itself');
    const arrived = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.id === sub)!;
    assert.equal(arrived.depthOrder, undefined, 'a completed order stops being reported');
  });

  it('is fast and deafening down, slow and silent up', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    advance(match, 0.5);
    const sub = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Directorate,
      x: 4000,
      y: 4000,
      depth: 600,
    });

    const idleSig = Acoustic.sig[sub]!;
    match.orderDepth(0, sub, 2000);
    advance(match, 1);

    const descentSig = Acoustic.sig[sub]!;
    const descended = Position.depth[sub]! - 600;
    assert.ok(descentSig >= DEPTH.DESCENT_SIG, 'a descent is deafening');
    assert.ok(descentSig > idleSig, 'and louder than the same hull holding station');

    // Now send it back up from where it got to, over the same wall-clock.
    const apex = Position.depth[sub]!;
    match.orderDepth(0, sub, 600);
    advance(match, 1);

    const ascended = apex - Position.depth[sub]!;
    assert.ok(ascended < descended, 'ascent is slower than descent');
    assert.ok(
      Acoustic.sig[sub]! <= idleSig,
      'and adds nothing to the hull: rising is the quiet direction'
    );
  });

  it('cannot be done quietly — a dive breaks silent running and stays loud', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    advance(match, 0.5);
    const sub = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Directorate,
      x: 4000,
      y: 4000,
      depth: 600,
    });

    match.setSilentRunning(0, sub, true);
    match.orderDepth(0, sub, 2000);
    assert.equal(SilentRunning.active[sub], 0, 'ordering a dive breaks silence');

    // Re-asserting silence mid-dive must not buy quiet either.
    match.setSilentRunning(0, sub, true);
    advance(match, 0.5);
    assert.ok(
      Acoustic.sig[sub]! >= DEPTH.DESCENT_SIG,
      'a hull running silent while descending is still descending'
    );

    // Ascending, by contrast, is compatible with running silent.
    match.orderDepth(0, sub, 600);
    match.setSilentRunning(0, sub, true);
    advance(match, 0.5);
    assert.equal(SilentRunning.active[sub], 1, 'ascent does not break silence');
    assert.ok(
      Acoustic.sig[sub]! <= SILENT_RUNNING.SIG_MAX,
      'and a silent ascent stays inside the silent-running band'
    );
  });

  it('accepts a dive below the hull rating, and the pressure system bills for it', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);
    const corvette = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      depth: 600,
    });

    // PR-2 covers Mid-Water. The Abyssal band needs PR-3, and the order still
    // goes through: renting depth you cannot survive is the mechanic.
    assert.equal(match.orderDepth(0, corvette, 2400), true, 'an unrated dive is still an order');
    advance(match, 2400 / DEPTH.DESCENT_RATE_MPS + 1);
    assert.ok(Position.depth[corvette]! > 1800, 'the hull reached the Abyssal band');

    const hpAtDepth = Health.hp[corvette]!;
    advance(match, 2);
    assert.ok(Health.hp[corvette]! < hpAtDepth, 'and is now paying crush attrition for it');
  });

  it('rents survivable depth from a Sounding Spire, and loses it on leaving', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Hadron);
    advance(match, 0.5);
    const corvette = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
      depth: 600,
    });
    spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });

    // PR-2 + 1 rented = PR-3: the Abyssal band becomes survivable ground.
    match.orderDepth(0, corvette, 2400);
    advance(match, 2400 / DEPTH.DESCENT_RATE_MPS + 1);
    assert.ok(Position.depth[corvette]! > 1800, 'the hull descended into the Abyssal band');

    const hpInAura = Health.hp[corvette]!;
    advance(match, 2);
    assert.equal(Health.hp[corvette], hpInAura, 'inside the spire the depth is rented, not paid');

    // Step outside the 600 m aura at the same depth: the bill resumes.
    Position.x[corvette] = Position.x[corvette]! + STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M + 400;
    advance(match, 2);
    assert.ok(Health.hp[corvette]! < hpInAura, 'outside it, the same depth costs hull');
  });

  it('refuses a depth outside the map rather than clamping it', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    advance(match, 0.5);
    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
    const before = Position.depth[mine.id]!;

    assert.equal(match.orderDepth(0, mine.id, DEPTH.MAX_M + 1), false, 'below the map floor');
    assert.equal(match.orderDepth(0, mine.id, DEPTH.MIN_M - 1), false, 'above the surface');
    assert.equal(match.orderDepth(0, mine.id, Number.NaN), false, 'not a number');
    assert.equal(match.orderDepth(0, theirs.id, 1000), false, "another commander's hull");

    advance(match, 1);
    assert.equal(Position.depth[mine.id], before, 'a refused order moves nothing');
  });

  it('reports rented rating and crush damage so the HUD can tell them apart', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Hadron);
    advance(match, 0.5);
    const corvette = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
      depth: 2400,
    });

    let unit = advance(match, 0.4)!
      .get(0)!
      .units.find((u) => u.id === corvette)!;
    assert.equal(unit.pressureBonus, 0, 'an unaided hull rents nothing');

    // PR-2 in the Abyssal band: crush accrues, and is reported separately from
    // the hull total so the bar can draw it as unrecoverable.
    advance(match, 2);
    unit = advance(match, 0.4)!
      .get(0)!
      .units.find((u) => u.id === corvette)!;
    assert.ok(unit.unhealableDamage > 0, 'the deep took something');
    assert.ok(
      Math.abs(unit.unhealableDamage - (unit.maxHp - unit.hp)) < 1,
      'with no other damage source, every point lost is crush'
    );

    // A spire overhead rents the missing band; the bonus shows as rented.
    spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    advance(match, 0.4);
    unit = advance(match, 0.4)!
      .get(0)!
      .units.find((u) => u.id === corvette)!;
    assert.equal(unit.pressureBonus, 1, 'the spire lends exactly one band');

    // And the crush already taken does not heal when the rating arrives.
    const scarred = unit.unhealableDamage;
    advance(match, 2);
    unit = advance(match, 0.4)!
      .get(0)!
      .units.find((u) => u.id === corvette)!;
    assert.equal(
      unit.unhealableDamage,
      scarred,
      'rented depth stops the bleeding, it does not undo it'
    );
  });

  it('never reports a contact depth the listener has not earned', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    const listener = advance(match, 0.2)!.get(0)!.units[0]!;

    // A descending hull is loud (>= 72), so parking one near the listener
    // resolves it high; walking it away drops the tier back down.
    const loud = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: listener.x + 300,
      y: listener.y,
      depth: 600,
    });
    match.orderDepth(1, loud, 2000);

    let sawClassified = 0;
    let sawBelow = 0;
    for (let i = 0; i < 12; i++) {
      const contacts = advance(match, 0.4)!.get(0)!.contacts;
      for (const contact of contacts) {
        if (contact.tier >= ResolutionTier.Classification) {
          sawClassified++;
          assert.ok(contact.depth !== undefined, 'Tier 3+ has earned a depth read');
        } else {
          sawBelow++;
          assert.equal(contact.depth, undefined, 'below Tier 3, depth is not sent at all');
        }
      }
      Position.x[loud] = Position.x[loud]! + 900;
    }
    // Without both halves this test could pass by never resolving anything.
    assert.ok(sawClassified > 0, 'the walk should have produced a classified contact');
    assert.ok(sawBelow > 0, 'and a lower-tier one as it withdrew');
  });
});

describe('faction structure auras', () => {
  it('a Baffle Barge bubble masks allied emitters only', () => {
    const match = twoPlayerMatch(); // slot 0 is Bathyarch, the barge's navy
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const mine = snapshots.get(0)!.units[0]!;
    const theirs = snapshots.get(1)!.units[0]!;
    // Park the enemy inside the bubble too: allied masking must not leak.
    Position.x[theirs.id] = Position.x[mine.id]! + 100;
    Position.y[theirs.id] = Position.y[mine.id]!;

    spawnStructure(match.world, {
      kind: StructureKind.BaffleBarge,
      slot: 0,
      faction: Faction.Bathyarch,
      x: Position.x[mine.id]!,
      y: Position.y[mine.id]!,
      prebuilt: true,
    });
    advance(match, 0.2);

    // pfFactor is an f32 lane; compare within float32 quantisation.
    const { PF_FACTOR } = STRUCTURE_AURAS.BAFFLE_BARGE;
    assert.ok(
      Math.abs(Acoustic.pfFactor[mine.id]! - PF_FACTOR) < 1e-6,
      'ally inside should be masked'
    );
    assert.equal(Acoustic.pfFactor[theirs.id], 1, 'enemy inside must not be masked');
  });

  it('a Cantor dome lends allied ears the bonus, capped', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Directorate);
    match.addPlayer(1, Faction.Pelagia);
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const corvette = snapshots.get(0)!.units.find((u) => u.kind === UnitKind.Corvette)!;

    spawnStructure(match.world, {
      kind: StructureKind.Cantor,
      slot: 0,
      faction: Faction.Directorate,
      x: Position.x[corvette.id]! + 500,
      y: Position.y[corvette.id]!,
      prebuilt: true,
    });
    advance(match, 0.2);

    const { HYD_BONUS, HYD_CAP, RADIUS_M } = STRUCTURE_AURAS.CANTOR;
    const base = statsFor(UnitKind.Corvette).hyd;
    assert.equal(
      Acoustic.hyd[corvette.id],
      Math.min(HYD_CAP, base + HYD_BONUS),
      'corvette under the dome should listen sharper'
    );

    // Walk it out of the dome: HYD falls back to the hull rating.
    Position.x[corvette.id] = Position.x[corvette.id]! + RADIUS_M + 600;
    advance(match, 0.2);
    assert.equal(Acoustic.hyd[corvette.id], base, 'outside the dome the bonus is gone');
  });

  it('a Sounding Spire rents depth, and sings while doing it', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Hadron);
    match.addPlayer(1, Faction.Pelagia);
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const scout = snapshots.get(0)!.units.find((u) => u.kind === UnitKind.LightScout)!;

    // Deep enough that the Knights' own baseline runs out. Their PR-2 covers
    // Mid-Water on its own (docs/systems-depth.md §3), so 600 m stopped being
    // a demonstration of anything the moment the baselines landed — and §3
    // says what the Spire is actually for: letting "a comparatively fragile
    // faction contest deep ground". That is the Abyssal, and this is it.
    Position.depth[scout.id] = 2000;
    const spire = spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 0,
      faction: Faction.Hadron,
      x: Position.x[scout.id]! + 300,
      y: Position.y[scout.id]!,
      prebuilt: true,
    });
    advance(match, 0.2);

    const hpBefore = Health.hp[scout.id]!;
    advance(match, 2);
    assert.equal(Health.hp[scout.id], hpBefore, 'rented depth must stop crush attrition');
    assert.equal(
      Acoustic.sig[spire],
      structureStatsFor(StructureKind.SoundingSpire).sigActive,
      'a projecting spire sings at its active SIG'
    );

    // Out of the aura the deficit is real again — and the spire goes quiet.
    Position.x[scout.id] = Position.x[scout.id]! + 2000;
    advance(match, 2);
    assert.ok(Health.hp[scout.id]! < hpBefore, 'outside the aura the depth bill comes due');
    assert.equal(
      Acoustic.sig[spire],
      structureStatsFor(StructureKind.SoundingSpire).sigIdle,
      'an idle spire hums at its idle SIG'
    );
  });

  it('another navy cannot commission a signature structure', () => {
    const match = twoPlayerMatch(); // slot 0 is Bathyarch
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;
    // Clear of both the Bastion (r 220) and the starting Foundry 450 m east.
    const x = bastion.x + 500;
    const y = bastion.y + 500;
    assert.equal(match.build(0, StructureKind.Cantor, x, y), false, 'Cantor is Directorate-only');
    // Signature structures are the crystal-locked tech tier, so fund it first;
    // this test is about whose navy may build what, not about affordability.
    match.world.economies.get(0)!.crystal = 500;
    assert.equal(
      match.build(0, StructureKind.BaffleBarge, x, y),
      true,
      'the Consortium may commission its own barge on the same spot'
    );
  });
});

describe('Spore Veil', () => {
  it('quiets and deafens everything inside — friend and foe alike', () => {
    const match = new Match(undefined, { fauna: false });
    match.addPlayer(0, Faction.Pelagia);
    match.addPlayer(1, Faction.Bathyarch);
    advance(match, 0.5);

    // Harvesters, in open water: no weapons, no orders — nothing fires or
    // moves, so derived SIG is exactly the idle figure and the only thing
    // acting on it is the cloud.
    const spot = { x: 4000, y: 4000 };
    const spawnIdleHarvester = (slot: number, faction: Faction, dx: number) =>
      spawnUnit(match.world, {
        kind: UnitKind.Harvester,
        slot,
        faction,
        x: spot.x + dx,
        y: spot.y,
      });
    const mine = spawnIdleHarvester(0, Faction.Pelagia, 0);
    const theirs = spawnIdleHarvester(1, Faction.Bathyarch, 120);
    const bystander = spawnIdleHarvester(1, Faction.Bathyarch, 2000);

    spawnStructure(match.world, {
      kind: StructureKind.SporeVeil,
      slot: 0,
      faction: Faction.Pelagia,
      x: spot.x,
      y: spot.y,
      prebuilt: true,
    });
    advance(match, 0.2);

    const { SIG_FACTOR, BLIND_HYD } = STRUCTURE_AURAS.SPORE_VEIL;
    const close = (a: number, b: number) => Math.abs(a - b) < 1e-3;
    const idle = statsFor(UnitKind.Harvester).sigIdle;

    assert.ok(close(Acoustic.sig[mine]!, idle * SIG_FACTOR), 'ally inside emits muffled');
    assert.ok(
      close(Acoustic.sig[theirs]!, idle * SIG_FACTOR),
      'enemy inside emits muffled too — the veil is symmetric'
    );
    assert.equal(Acoustic.hyd[mine], BLIND_HYD, 'ally inside is hydrophone-blind');
    assert.equal(Acoustic.hyd[theirs], BLIND_HYD, 'enemy inside is hydrophone-blind too');

    assert.ok(close(Acoustic.sig[bystander]!, idle), 'a unit outside the cloud emits normally');
    assert.equal(
      Acoustic.hyd[bystander],
      statsFor(UnitKind.Harvester).hyd,
      'a unit outside the cloud listens normally'
    );
  });
});
