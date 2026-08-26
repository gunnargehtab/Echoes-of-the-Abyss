/**
 * The public face of the mission catalogue.
 *
 * The full mission definitions — parties, positions, predicates, beats — are
 * authoring data and live server-side (`packages/backend/src/sim/missions/`),
 * for the reason `maps.ts` gives about spawn positions: a client holding an
 * objective's threshold or a party's starting position before a match would
 * hold information it has not earned. A mission's secrets are the same kind of
 * secret as an enemy's position.
 *
 * The header is what a title screen and a briefing need before any room exists,
 * and `missions.test.ts` holds it to an allow-list, so a future public field is
 * a decision somebody argued for rather than one that drifted in.
 */

export type CampaignId = 'prologue' | 'consortium' | 'commune' | 'directorate' | 'knights';

export interface MissionHeader {
  /**
   * Namespaced by campaign. Two missions in the campaign are both called
   * "Conclave" (docs/campaign.md), so the display name is not unique and this
   * is — which is also why ids are not a global 1..29 numbering.
   */
  id: string;
  campaign: CampaignId;
  /** Slot within its own campaign, 1-based. */
  ordinal: number;
  name: string;
  /** One line for the entry that offers it. Never the win condition. */
  premise: string;
  /** Already public: the room sends the map on join either way. */
  mapId: string;
  /** docs/campaign.md §10 — 12–25 minutes, in seconds. */
  lengthBandS: readonly [number, number];
  /**
   * The briefing, in paragraphs, read before the socket opens.
   *
   * `null` means withheld — the room sends it on join instead. That is a
   * per-mission decision rather than a property of briefings: three missions in
   * the campaign are winnable only as evacuations (docs/campaign.md §2), and
   * for those the briefing can itself be the leak. Sorrowgate's names no hidden
   * fact, so it ships public and the player may read it before committing.
   */
  briefing: readonly string[] | null;
}

export const PROLOGUE_SORROWGATE_HEADER: MissionHeader = {
  id: 'prologue-sorrowgate',
  campaign: 'prologue',
  ordinal: 1,
  name: 'Prologue — Sorrowgate',
  premise: "Arbiter Halloran's court, a collapsed transit dome, and an order not to make a sound.",
  mapId: 'sorrowgate',
  lengthBandS: [1080, 1260],
  briefing: [
    'Four hulls have been admitted. Their hardpoints were struck in this chamber in front of all four parties and the tools are on the table where they were struck. Nobody has to take anybody’s word for anything today. That is the whole of what this court is.',
    'Fourteen people are in the record. Nine were taken off a face that two parties have called theirs. Five went into plateau water and did not come out of it. The count is closed. It was closed two tides ago and it does not reopen because somebody has since thought of a better argument.',
    'The flight holds at the arch and the flight stays under twenty. The court’s array is on, and while your hulls are quiet you hear what the court hears. Be loud and you are shoving, and the court will not hear past you — it will hear you, and you will hear nothing else until it is paid back.',
    'There is deep water under this gate, and something in it that the city put there before the count started and has never had a reason to disturb. Nobody in this chamber transmits today. If anybody does, the court will strike their hulls as well, and it will not matter, because it will already be too late to matter.',
    'The parties are admitted. The record is open.',
  ],
};

export const MISSION_HEADERS: readonly MissionHeader[] = [PROLOGUE_SORROWGATE_HEADER];

export function missionHeaderById(id: string): MissionHeader | undefined {
  return MISSION_HEADERS.find((header) => header.id === id);
}

// --- Wire types -------------------------------------------------------------

export enum ObjectiveStatus {
  Pending = 0,
  Met = 1,
  Failed = 2,
}

export enum MissionOutcome {
  /** Everything the mission called terminal was met. */
  Complete = 0,
  /** Some of it. Not a failure — a result, and the mission says so out loud. */
  Partial = 1,
  /** None of it. */
  Lost = 2,
}

export type MissionAbility =
  | 'weapons'
  | 'torpedoes'
  | 'mines'
  | 'depthCharges'
  | 'noisemakers'
  | 'activeSonar'
  /**
   * Building and producing, which most missions have no economy for. Not a
   * weapon, and here for the same reason the six above are: an affordance that
   * cannot work has to say so. Without it the build keys still arm a placement
   * ghost that follows the cursor to a click the server drops on cost — a
   * silent refusal, which docs/ui-ux.md §7 forbids by name.
   */
  | 'construction';

/**
 * docs/ui-ux.md — a disabled action greys out *with a reason attached*, never
 * silently. The lock is continuous state rather than a response to a refused
 * order, so the affordance is dead before the player reaches for it.
 */
export interface AbilityLock {
  ability: MissionAbility;
  /** Shown verbatim, in register: `disabled — silence order`. */
  reason: string;
}

/** Where the player is being sent. Authored and public; never an entity. */
export interface MissionMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  radiusM: number;
}

export interface ObjectiveView {
  id: string;
  /** Authored, in-register, shown verbatim. Never templated (docs/campaign.md §10). */
  text: string;
  status: ObjectiveStatus;
  /**
   * INVARIANT: `done` and `of` are computed exclusively from the observer's own
   * resolved snapshot. A counter over anything else is a maphack in a numeral —
   * "three of five hostiles remaining" is enemy state written as arithmetic —
   * and no mission predicate can address an entity the player does not own.
   */
  progress?: { done: number; of: number };
  /** The marker this objective sends you to, if any. */
  markerId?: string;
}

export interface MissionView {
  missionId: string;
  /** The simulation tick this view was resolved beside. No wall-clock anywhere. */
  tick: number;
  objectives: ObjectiveView[];
  markers: MissionMarker[];
  locks: AbilityLock[];
  /** docs/campaign.md §10 metadata, shown as a ceiling. Never a live threshold. */
  sigBudget: number;
  /** Seconds of silence-debt owed. 0 while compliant (docs/mission-sorrowgate.md §4). */
  debtS: number;
}

export interface MissionResultPayload {
  missionId: string;
  outcome: MissionOutcome;
  /** The court's reading. Authored, in-register. Not a score and not a rank. */
  epilogue: string;
  /** The objectives as the player was told them, frozen at the close. */
  objectives: ObjectiveView[];
}
