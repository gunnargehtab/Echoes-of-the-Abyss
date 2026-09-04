/**
 * The mission catalogue — the private half of `@echoes/shared`'s headers.
 *
 * Shaped exactly like `sim/maps/index.ts`
 * because it holds the same kind of thing for the same reason: a public header
 * the shell may read before a room exists, and an authored definition — the
 * parties, their positions, the predicates, the beat times — that no client is
 * ever sent.
 *
 * Resolved by id and by nothing else. A mission's map is reached through its
 * mission, never through `mapById`.
 */

import { ATTENDING_ATTENDANCE } from './attendance.ts';
import { ATTENDING_INTAKE } from './intake.ts';
import { ATTENDING_SHALLOW } from './shallow.ts';
import { ATTENDING_TRENCH_AWAKENING } from './trenchAwakening.ts';
import { ATTENDING_CONCLAVE } from './conclaveAttending.ts';
import { ATTENDING_THE_DOME } from './theDome.ts';
import { ATTENDING_FIRST_ARRIVAL } from './firstArrival.ts';
import { CHORD_NINETEEN } from './nineteen.ts';
import { CHORD_CONCLAVE } from './conclaveChord.ts';
import { CHORD_THE_THREE } from './theThree.ts';
import { CHORD_RIM_DEPOSITS } from './rimDeposits.ts';
import { CHORD_APTITUDE } from './aptitude.ts';
import { SEEDING_DEEP_FURROW } from './deepFurrow.ts';
import { SEEDING_IN_WRITING } from './inWriting.ts';
import { SEEDING_RADICALS } from './radicals.ts';
import { SEEDING_SECOND_SEEDING } from './secondSeeding.ts';
import { LEDGER_ASSET_RECOVERY } from './assetRecovery.ts';
import { LEDGER_BAFFLE } from './baffle.ts';
import { LEDGER_EXPOSURE } from './exposure.ts';
import { LEDGER_ITEM_NINE } from './itemNine.ts';
import { LEDGER_PROSPECT } from './prospect.ts';
import { LEDGER_SHIFT_CHANGE } from './shiftChange.ts';
import { LEDGER_TOLERANCE } from './tolerance.ts';
import { PROLOGUE_SORROWGATE } from './sorrowgate.ts';
import { SEEDING_CONVOCATION } from './convocation.ts';
import { SEEDING_TEND } from './tend.ts';
import { SEEDING_THIN_WATER } from './thinWater.ts';
import type { MissionDefinition } from './types.ts';

export * from './types.ts';
export * from './predicates.ts';
export * from './conditional.ts';
export * from './sounding.ts';
export * from './walk.ts';
export * from './view.ts';
export * from './runtime.ts';
export {
  ATTENDING_ATTENDANCE,
  ATTENDING_CONCLAVE,
  ATTENDING_INTAKE,
  ATTENDING_SHALLOW,
  ATTENDING_THE_DOME,
  ATTENDING_TRENCH_AWAKENING,
  ATTENDING_FIRST_ARRIVAL,
  CHORD_NINETEEN,
  CHORD_CONCLAVE,
  CHORD_THE_THREE,
  CHORD_RIM_DEPOSITS,
  CHORD_APTITUDE,
  LEDGER_ASSET_RECOVERY,
  LEDGER_BAFFLE,
  LEDGER_EXPOSURE,
  LEDGER_ITEM_NINE,
  LEDGER_PROSPECT,
  LEDGER_SHIFT_CHANGE,
  LEDGER_TOLERANCE,
  PROLOGUE_SORROWGATE,
  SEEDING_CONVOCATION,
  SEEDING_DEEP_FURROW,
  SEEDING_IN_WRITING,
  SEEDING_RADICALS,
  SEEDING_SECOND_SEEDING,
  SEEDING_TEND,
  SEEDING_THIN_WATER,
};

export const MISSIONS: readonly MissionDefinition[] = [
  PROLOGUE_SORROWGATE,
  LEDGER_ASSET_RECOVERY,
  LEDGER_SHIFT_CHANGE,
  LEDGER_BAFFLE,
  LEDGER_EXPOSURE,
  LEDGER_TOLERANCE,
  LEDGER_PROSPECT,
  LEDGER_ITEM_NINE,
  SEEDING_TEND,
  SEEDING_THIN_WATER,
  SEEDING_DEEP_FURROW,
  SEEDING_IN_WRITING,
  SEEDING_RADICALS,
  SEEDING_SECOND_SEEDING,
  SEEDING_CONVOCATION,
  ATTENDING_ATTENDANCE,
  ATTENDING_INTAKE,
  ATTENDING_THE_DOME,
  ATTENDING_SHALLOW,
  ATTENDING_TRENCH_AWAKENING,
  ATTENDING_CONCLAVE,
  ATTENDING_FIRST_ARRIVAL,
  CHORD_NINETEEN,
  CHORD_CONCLAVE,
  CHORD_THE_THREE,
  CHORD_RIM_DEPOSITS,
  CHORD_APTITUDE,
];

export function missionById(id: string): MissionDefinition | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}
