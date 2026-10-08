/**
 * Silence and a drive cut stop the work — docs/systems-echo.md §6 (#1237).
 *
 * Silent Running "cannot mine, build, or repair", and a hull with its engine
 * off stops the economy's work the same way: it cannot mine or sow, and a
 * Commune hull takes no bloom share. Before #1237 mining read no posture at
 * all, so a harvester cut at full rate while acoustics priced it at a silent
 * hull's SIG, and a drive cut stopped none of the three.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BLOOM_SHARE, Faction, HazardPhase, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Harvester, HarvestMode } from '../src/sim/components.ts';
import { setKelpCrop, type Hazard } from '../src/sim/systems/hazards.ts';
import { economyFor, spawnResourceNode, spawnUnit } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

type Posture = 'none' | 'silent' | 'engineOff';

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function setPosture(match: Match, eid: number, posture: Posture, on: boolean): void {
  if (posture === 'silent') match.setSilentRunning(0, eid, on);
  if (posture === 'engineOff') match.setEngineOff(0, eid, on);
}

/** A harvester already cutting a nodule field, then put in a posture for 2 s. */
function mining(posture: Posture): { match: Match; harvester: number; mined: number } {
  const match = new Match(undefined, {
    fauna: false,
    seed: 41,
    terrain: new Terrain(12000, 12000, 250, { floorM: 2600 }),
  });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Directorate);
  const node = spawnResourceNode(match.world, 6000, 6000);
  const harvester = spawnUnit(match.world, {
    kind: UnitKind.Harvester,
    slot: 0,
    faction: Faction.Bathyarch,
    x: 6000,
    y: 6040,
    depth: 600,
  });
  Harvester.nodeEid[harvester] = node;
  Harvester.mode[harvester] = HarvestMode.ToNode;
  advance(match, 0.5);
  assert.equal(
    Harvester.mode[harvester],
    HarvestMode.Mining,
    'the premise: the harvester is over the field and cutting'
  );
  setPosture(match, harvester, posture, true);
  const before = Harvester.cargo[harvester]!;
  advance(match, 2);
  return { match, harvester, mined: Harvester.cargo[harvester]! - before };
}

/** A Commune hull on a kelp bloom in a posture: the share it takes, and a sowing. */
function tending(posture: Posture): { share: number; sowed: boolean } {
  const match = new Match(undefined, {
    fauna: false,
    seed: 37,
    terrain: new Terrain(8000, 8000, 250),
  });
  const bed: Hazard = {
    id: match.world.hazards.length + 1,
    kind: 'kelp-entanglement',
    x: 7000,
    y: 7000,
    radiusM: BLOOM_SHARE.TEND_RADIUS_M,
    phase: HazardPhase.Active,
    crop: 1,
    elapsedS: 0,
    flowRad: 0,
    stabilisedS: 0,
    suppressedS: 0,
    burnedS: 0,
    sownRemaining: 0,
  };
  match.world.hazards.push(bed);
  match.world.blooms.push(bed);
  const tender = spawnUnit(match.world, {
    kind: UnitKind.LightScout,
    slot: 0,
    faction: Faction.Pelagia,
    x: 7000,
    y: 7000,
    depth: 200,
    weaponsCold: true,
  });
  setPosture(match, tender, posture, true);
  const before = economyFor(match.world, 0).biomass;
  advance(match, 10);
  const share = economyFor(match.world, 0).biomass - before;
  // Thinned, so a sowing has something to restore and is worth ordering.
  setKelpCrop(match.world, bed, 0.5);
  return { share, sowed: match.sow(0, tender) };
}

describe('silence and a drive cut stop the work — docs/systems-echo.md §6', () => {
  it('stops a harvester cutting, and lets it pick up where it left off', () => {
    assert.ok(mining('none').mined > 0, 'the premise: an unpostured harvester mines');
    for (const posture of ['silent', 'engineOff'] as const) {
      const { match, harvester, mined } = mining(posture);
      assert.equal(mined, 0, `a harvester mined ${mined} under ${posture}`);
      setPosture(match, harvester, posture, false);
      const before = Harvester.cargo[harvester]!;
      advance(match, 1);
      assert.ok(Harvester.cargo[harvester]! > before, `and mines again once ${posture} lifts`);
    }
  });

  it('stops a Commune hull taking its bloom share, and refuses it a sowing', () => {
    const free = tending('none');
    assert.ok(free.share > 0 && free.sowed, 'the premise: an unpostured tender is paid, and sows');
    for (const posture of ['silent', 'engineOff'] as const) {
      const { share, sowed } = tending(posture);
      assert.equal(share, 0, `a tender was paid ${share} Biomass under ${posture}`);
      assert.equal(sowed, false, `and a sowing was taken under ${posture}`);
    }
  });
});
