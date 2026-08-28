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
import { LEDGER_ASSET_RECOVERY } from './assetRecovery.ts';
import { PROLOGUE_SORROWGATE } from './sorrowgate.ts';
import { SEEDING_TEND } from './tend.ts';
import type { MissionDefinition } from './types.ts';

export * from './types.ts';
export * from './predicates.ts';
export * from './view.ts';
export * from './runtime.ts';
export { ATTENDING_ATTENDANCE, LEDGER_ASSET_RECOVERY, PROLOGUE_SORROWGATE, SEEDING_TEND };

export const MISSIONS: readonly MissionDefinition[] = [
  PROLOGUE_SORROWGATE,
  LEDGER_ASSET_RECOVERY,
  SEEDING_TEND,
  ATTENDING_ATTENDANCE,
];

export function missionById(id: string): MissionDefinition | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}
