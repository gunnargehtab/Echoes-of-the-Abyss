/**
 * The keystone — docs/mission-asset-recovery.md §8, against a live match.
 *
 * §8's Results hang on one asset: "The number stays" is the Board's reading
 * whenever the chamber does not come out, machinery notwithstanding. The
 * runtime's count would otherwise read machinery-home-chamber-lost as a
 * partial, and the epilogue would state a recovery that did not happen — so
 * the claim worth a simulated run is the asymmetry itself:
 *
 * - keystone unmet, everything else met → **Lost**, whatever else came home;
 * - keystone met, the rest unmet → **Partial**, exactly as before.
 *
 * Synthetic missions, for `missionLifts.test.ts`'s reason: the flag is the
 * mechanism's proof and Asset Recovery is its first user, and a test against
 * the authored literal would need the full eighteen-minute drive to reach the
 * one branch it exists to prevent.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  UnitKind,
  type MissionView,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import type { MissionDefinition, MissionObjective } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = 0;

/** Inside Sorrowgate's Gate region — known open water at 1,470 m. */
const HERE = { id: 'here', x: 2400, y: 2400, widthM: 250, heightM: 250, note: 'Where it stands' };
const NOWHERE = { id: 'nowhere', x: 3000, y: 3000, widthM: 250, heightM: 250, note: 'Where not' };

/**
 * One hull, two terminal objectives, and a resolve at ninety seconds: `met` is
 * standing where the hull already is, `unmet` is a region it never visits.
 * Which of the two carries the keystone is the whole experiment.
 */
function keystoneMission(keystoneOn: 'met' | 'unmet'): MissionDefinition {
  const met: MissionObjective = {
    id: 'met',
    text: 'The hull stands where it stands.',
    initial: ObjectiveStatus.Pending,
    terminal: true,
    ...(keystoneOn === 'met' ? { keystone: true as const } : {}),
    predicate: { kind: 'extract', role: 'escort', region: 'here', count: 1 },
  };
  const unmet: MissionObjective = {
    id: 'unmet',
    text: 'The hull is somewhere it never goes.',
    initial: ObjectiveStatus.Pending,
    terminal: true,
    ...(keystoneOn === 'unmet' ? { keystone: true as const } : {}),
    predicate: { kind: 'extract', role: 'escort', region: 'nowhere', count: 1 },
  };
  return {
    ...PROLOGUE_SORROWGATE,
    id: 'test-keystone-mission',
    doc: 'docs/mission-asset-recovery.md §8 — the test authoring',
    playerSlot: PLAYER,
    courtSlot: 1,
    fauna: false,
    sigBudget: 65,
    arrayTag: undefined,
    silenceCeilingSig: 100,
    debtCapS: 0,
    escortRadiusM: 0,
    regions: [HERE, NOWHERE],
    lifts: [],
    markers: [],
    parties: [
      {
        slot: PLAYER,
        faction: Faction.Bathyarch,
        note: 'One hull, standing in the met region from the first tick',
        units: [
          {
            tag: 'hull',
            kind: UnitKind.LightScout,
            x: HERE.x + 100,
            y: HERE.y + 100,
            depthM: 1470,
            role: 'escort',
            pressureRating: 2,
            note: '',
          },
        ],
      },
    ],
    locks: [],
    objectives: [met, unmet],
    beats: [
      // The §10 telegraph, and the close.
      {
        atTick: SIM.TICK_HZ * 20,
        kind: 'creature',
        tag: 'passerby',
        species: FaunaSpecies.Sounder,
        spawnAt: { x: 1600, y: 3400, depthM: 2200 },
        driveTo: { x: 1700, y: 3500 },
        untilTick: SIM.TICK_HZ * 25,
        loud: true,
        note: 'Something audible, ahead of the close',
      },
      { atTick: SIM.TICK_HZ * 90, kind: 'resolve', note: 'The count is read' },
    ],
    epilogue: {
      [MissionOutcome.Complete]: 'Everything came home.',
      [MissionOutcome.Partial]: 'The keystone came home; the remainder is written down.',
      [MissionOutcome.Lost]: 'The keystone did not come out. The registry keeps the number.',
    },
  };
}

function play(keystoneOn: 'met' | 'unmet'): { outcome: MissionOutcome; epilogue: string } {
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  const match = new Match(map, { mission: keystoneMission(keystoneOn), fauna: false, seed: 17 });
  for (let tick = 0; tick < SIM.TICK_HZ * 95; tick++) {
    match.update(STEP_MS);
    // Drain views so the runtime's edge buffer never backs anything up.
    match.takeMissionView() as MissionView | null;
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the mission never resolved');
  return { outcome: over.outcome, epilogue: over.epilogue };
}

describe('the keystone objective — docs/mission-asset-recovery.md §8', () => {
  it('reads Lost when the keystone is unmet, whatever else came home', () => {
    const { outcome, epilogue } = play('unmet');
    assert.equal(
      outcome,
      MissionOutcome.Lost,
      'machinery home without the chamber read as a partial'
    );
    assert.match(epilogue, /keeps the number/);
  });

  it('still reads Partial over a met keystone with the remainder lost', () => {
    const { outcome, epilogue } = play('met');
    assert.equal(outcome, MissionOutcome.Partial);
    assert.match(epilogue, /written down/);
  });
});
