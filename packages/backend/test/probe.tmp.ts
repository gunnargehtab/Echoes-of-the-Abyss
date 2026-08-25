import { MissionOutcome, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function build(): Match {
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  return new Match(map, { mission: PROLOGUE_SORROWGATE, fauna: false, seed: 7 });
}

const match = build();
let views = 0;
let maxDebt = 0;
let firstSnapshot: any = null;
let lastSnapshot: any = null;
const tenderTrack: Array<[number, number, number, number, number]> = [];

for (let tick = 0; tick < SIM.TICK_HZ * 21 * 60; tick++) {
  const snaps = match.update(STEP_MS);
  const own = snaps?.get(0);
  if (own !== undefined) {
    if (firstSnapshot === null) firstSnapshot = own;
    lastSnapshot = own;
  }
  const view = match.takeMissionView();
  if (view !== null) {
    views++;
    if (view.debtS > maxDebt) maxDebt = view.debtS;
    console.log(
      'view',
      views,
      'tick',
      view.tick,
      'debt',
      view.debtS,
      'objectives',
      view.objectives.map((o) => `${o.id}:${o.status}:${JSON.stringify(o.progress ?? null)}`).join(' | ')
    );
  }
  if (own !== undefined && tick % (SIM.TICK_HZ * 60) === 0) {
    const tenders = own.units.filter((u: any) => u.kind === UnitKind.Harvester);
    console.log(
      't=',
      (tick / SIM.TICK_HZ).toFixed(0),
      'tenders',
      tenders.map((t: any) => `${t.x.toFixed(0)},${t.y.toFixed(0)}@${t.depth.toFixed(0)}`).join(' '),
      'peakSig',
      own.peakSig
    );
  }
  if (match.missionOver !== null) {
    console.log('RESOLVED at tick', match.tick, MissionOutcome[match.missionOver.outcome]);
    console.log('epilogue:', match.missionOver.epilogue.slice(0, 60));
    console.log('objectives:', JSON.stringify(match.missionOver.objectives));
    break;
  }
}

console.log('views total', views, 'maxDebt', maxDebt);
console.log('result', match.result);
console.log('worstMissionMsCost', match.worstMissionMsCost);
console.log('first snapshot units', firstSnapshot.units.length, 'structures', firstSnapshot.structures.length);
console.log('last snapshot units', lastSnapshot.units.length);
