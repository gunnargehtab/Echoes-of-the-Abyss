/**
 * Where the commander stands its signature structure (#1296).
 *
 * The site was one fixed spot, the rally point, with no fallback. On
 * kelp-labyrinth seat 3's rally point (900, 5900) lies under a roof, so
 * `Match.build` refused the structure there for every navy, and the commander
 * asked again on every observation it could pay. What is pinned here is the
 * request against the server's own answer: each site the commander asks for
 * is one `Match.build` accepts, on the seat where the rally point is not.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  CONSTRUCTION,
  FACTION_STRUCTURE,
  Faction,
  HarvestThrottle,
  RefitKind,
  ResolutionTier,
  StructureKind,
  UnitKind,
  priceOf,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import { KELP_LABYRINTH } from '../src/sim/maps/index.ts';
import { economyFor } from '../src/sim/world.ts';

const SEAT = 3;
/**
 * Looks per test: enough for several decisions at any cadence, since a
 * commander decides only on every `cadenceTicks`-th observation.
 */
const OBSERVATIONS = 24;
const FACTIONS = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];

/** Four seats on kelp-labyrinth, seat 3 playing `faction`. */
function seated(faction: Faction): Match {
  const match = new Match(KELP_LABYRINTH, { fauna: false, seed: 1296 });
  for (let slot = 0; slot < 4; slot++) {
    match.addPlayer(slot, slot === SEAT ? faction : FACTIONS[(slot + 1) % 4]!);
  }
  return match;
}

/** Where the commander's rally point is: 1,200 m from home toward seat 0. */
function rallyPoint(): { x: number; y: number } {
  const home = KELP_LABYRINTH.spawns[SEAT]!;
  const toward = KELP_LABYRINTH.spawns[0]!;
  const length = Math.hypot(toward.x - home.x, toward.y - home.y);
  return {
    x: home.x + ((toward.x - home.x) / length) * 1200,
    y: home.y + ((toward.y - home.y) / length) * 1200,
  };
}

function structure(
  id: number,
  kind: StructureKind,
  at: { x: number; y: number }
): EchoSnapshot['structures'][number] {
  const stats = structureStatsFor(kind);
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: CONSTRUCTION.WORKING_DEPTH_M,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    sig: stats.sigIdle,
    buildProgress: 1,
    queue: [],
    queueProgress: 0,
  };
}

/**
 * Seat 3 with its opening base, a Slipway and a staffed economy, holding
 * exactly the signature structure's price: the state that asks for it.
 */
function snapshot(faction: Faction, tick: number): EchoSnapshot {
  const spawn = KELP_LABYRINTH.spawns[SEAT]!;
  const home = { x: spawn.x, y: spawn.y };
  const price = priceOf(structureStatsFor(FACTION_STRUCTURE[faction]!));
  const harvesters = DOCTRINE[faction].harvesterTarget;
  const stats = statsFor(UnitKind.Harvester);
  return {
    tick,
    ordnance: [],
    units: Array.from({ length: harvesters }, (_, i) => ({
      id: i + 1,
      kind: UnitKind.Harvester,
      engineOff: false,
      x: home.x + i * 40,
      y: home.y,
      depth: 300,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      heading: 0,
      sig: stats.sigIdle,
      silentRunning: false,
      pressureRating: stats.pressureRating,
      pressureBonus: 0,
      unhealableDamage: 0,
      cargo: 0,
      throttle: HarvestThrottle.Standard,
    })),
    structures: [
      structure(20, StructureKind.Bastion, home),
      structure(21, StructureKind.Foundry, {
        x: home.x + spawn.foundryOffsetX,
        y: home.y + spawn.foundryOffsetY,
      }),
      structure(22, StructureKind.Slipway, { x: home.x + 500, y: home.y }),
      structure(23, StructureKind.Refinery, { x: home.x + 500, y: home.y - 500 }),
    ],
    contacts: [],
    peakSig: 30,
    berths: { used: harvesters, granted: 40 },
    // The Pressure Refit bought, so the rung's other purchase is not asked for first.
    refits: [RefitKind.Pressure],
    nodules: price.nodules,
    crystal: price.crystal,
    biomass: price.biomass,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 6, demand: 0, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
  };
}

/** The signature sites the commander asks for over `observations` looks. */
function asked(faction: Faction, observations: number): { x: number; y: number }[] {
  const match = seated(faction);
  const commander = new AiCommander(briefingFor(match, SEAT, faction, AiDifficulty.Veteran));
  const signature = FACTION_STRUCTURE[faction]!;
  const sites: { x: number; y: number }[] = [];
  for (let i = 0; i < observations; i++) {
    for (const command of commander.observe(snapshot(faction, 6000 + i * 600))) {
      if (command.kind === 'build' && command.structure === signature) {
        sites.push({ x: command.x, y: command.y });
      }
    }
  }
  return sites;
}

/** Would the server stand `faction`'s signature structure at `site`? */
function accepts(faction: Faction, site: { x: number; y: number }): boolean {
  const match = seated(faction);
  const kind = FACTION_STRUCTURE[faction]!;
  const price = priceOf(structureStatsFor(kind));
  Object.assign(economyFor(match.world, SEAT), {
    nodules: price.nodules,
    crystal: price.crystal,
    biomass: price.biomass,
  });
  return match.build(SEAT, kind, site.x, site.y);
}

describe('the signature structure on a rally point under a roof', () => {
  it('is refused at the rally point itself, for every navy', () => {
    // The premise, as the server states it. If the roof moves, this file is
    // about a different map.
    for (const faction of FACTIONS) {
      assert.equal(accepts(faction, rallyPoint()), false, `${faction} at the rally point`);
    }
  });

  it('is asked for only where the server stands it', () => {
    for (const faction of FACTIONS) {
      const sites = asked(faction, OBSERVATIONS);
      assert.ok(sites.length > 1, `${faction} asked ${sites.length} times`);
      // A refusal it cannot predict — a footprint, a nodule field — is
      // silent, so a repeated ask moves on rather than asking the same spot.
      const distinct = new Set(sites.map((site) => `${site.x},${site.y}`));
      assert.equal(distinct.size, sites.length, `${faction} asked one site twice`);
      for (const site of sites) {
        assert.ok(accepts(faction, site), `${faction} asked at ${site.x},${site.y}`);
      }
    }
  });

  it('stays near the rally point', () => {
    // Three of the four are arguments about the approach, so the walk is the
    // nearest ground that holds one, not anywhere in build radius.
    const rally = rallyPoint();
    for (const site of asked(Faction.Pelagia, OBSERVATIONS)) {
      assert.ok(Math.hypot(site.x - rally.x, site.y - rally.y) <= 600, 'within the rings');
    }
  });
});

describe('the signature structure on open ground', () => {
  it('is asked for at the rally point first, as before', () => {
    // Seat 0's rally point holds a building: the walk changes nothing there.
    const faction = Faction.Pelagia;
    const match = new Match(KELP_LABYRINTH, { fauna: false, seed: 1296 });
    for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, faction);
    const commander = new AiCommander(briefingFor(match, 0, faction, AiDifficulty.Veteran));
    const spawn = KELP_LABYRINTH.spawns[0]!;
    const base = snapshot(faction, 6000);
    const shift = {
      x: spawn.x - KELP_LABYRINTH.spawns[SEAT]!.x,
      y: spawn.y - KELP_LABYRINTH.spawns[SEAT]!.y,
    };
    const moved: EchoSnapshot = {
      ...base,
      units: base.units.map((u) => ({ ...u, x: u.x + shift.x, y: u.y + shift.y })),
      structures: base.structures.map((s) => ({ ...s, x: s.x + shift.x, y: s.y + shift.y })),
    };
    const signature = FACTION_STRUCTURE[faction]!;
    const first = commander
      .observe(moved)
      .find((c) => c.kind === 'build' && c.structure === signature);
    assert.ok(first !== undefined && first.kind === 'build', 'it asked');
    const toward = KELP_LABYRINTH.spawns[1]!;
    const length = Math.hypot(toward.x - spawn.x, toward.y - spawn.y);
    assert.ok(Math.abs(first.x - (spawn.x + ((toward.x - spawn.x) / length) * 1200)) < 1e-6);
    assert.ok(Math.abs(first.y - (spawn.y + ((toward.y - spawn.y) / length) * 1200)) < 1e-6);
  });
});
