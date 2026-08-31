/**
 * The mission catalogue — the private half of `@echoes/shared`'s headers.
 *
 * One mission, and it is the Prologue. Shaped exactly like `sim/maps/index.ts`
 * because it holds the same kind of thing for the same reason: a public header
 * the shell may read before a room exists, and an authored definition — the
 * parties, their positions, the predicates, the beat times — that no client is
 * ever sent.
 *
 * Resolved by id and by nothing else. A mission's map is reached through its
 * mission, never through `mapById`.
 */

import { ATTENDING_ATTENDANCE } from './attendance.ts';
import { CHORD_APTITUDE } from './aptitude.ts';
import { LEDGER_ASSET_RECOVERY } from './assetRecovery.ts';
import { LEDGER_BAFFLE } from './baffle.ts';
import { LEDGER_EXPOSURE } from './exposure.ts';
import { LEDGER_ITEM_NINE } from './itemNine.ts';
import { LEDGER_PROSPECT } from './prospect.ts';
import { LEDGER_SHIFT_CHANGE } from './shiftChange.ts';
import { LEDGER_TOLERANCE } from './tolerance.ts';
import { PROLOGUE_SORROWGATE } from './sorrowgate.ts';
import { SEEDING_TEND } from './tend.ts';
import type { MissionDefinition } from './types.ts';

export * from './types.ts';
export * from './predicates.ts';
export * from './conditional.ts';
export * from './sounding.ts';
export * from './view.ts';
export * from './runtime.ts';
export {
  ATTENDING_ATTENDANCE,
  CHORD_APTITUDE,
  LEDGER_ASSET_RECOVERY,
  LEDGER_BAFFLE,
  LEDGER_EXPOSURE,
  LEDGER_ITEM_NINE,
  LEDGER_PROSPECT,
  LEDGER_SHIFT_CHANGE,
  LEDGER_TOLERANCE,
  PROLOGUE_SORROWGATE,
  SEEDING_TEND,
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
  ATTENDING_ATTENDANCE,
  CHORD_APTITUDE,
];

export function missionById(id: string): MissionDefinition | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}
