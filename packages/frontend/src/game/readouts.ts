/**
 * What the permanent strip's readouts mean — docs/ui-ux.md §2, §7, §13.
 *
 * The strip carries NODULES, CRYSTAL, BIOMASS, BERTHS, DRAW, the SIG meter and
 * its band, `TRACKED ×n`, the map name, the clock and the contact count. Every
 * one of them is correct, permanent and mute: a player who has not read
 * docs/economy.md has no way to learn what a berth is, or that the amber bar is
 * the thing that gets them found.
 *
 * The console already explains itself at the point of refusal, and the register
 * is §7's — a reason attached, never silently — as the production buttons show
 * it: `Dredge: no berth — 2 needed, 1 free · a Foundry grants 4`. That names the
 * account it fell short in, the quantity, and the thing that would fix it. The
 * strip's readouts are never refused, so nothing in that mechanism ever speaks
 * for them; these lines are the same register applied to a number that is
 * simply *there*.
 *
 * Each line says three things, in this order: **the quantity**, **what it is
 * measured against**, and **what moves it**. Clauses are ` · `-separated, the
 * way a refusal's are.
 *
 * **No figure here is written twice.** Every number is either handed in from
 * the report the HUD already draws or read from `@echoes/shared`; a SPEC number
 * cites its doc section where it is used (CLAUDE.md, "Constants live in exactly
 * one place"). That rule is what stops these sentences from becoming a second,
 * quietly wrong copy of the economy.
 */

import {
  BERTHS,
  SIG_BANDS,
  StructureKind,
  structureStatsFor,
  type DrawReport,
} from '@echoes/shared';

/** One readout on the strip. Ordered left to right, as the strip lays them out. */
export type ReadoutKey =
  | 'sig'
  | 'band'
  | 'nodules'
  | 'crystal'
  | 'biomass'
  | 'berths'
  | 'draw'
  | 'tracked'
  | 'map'
  | 'clock'
  | 'contacts';

/**
 * A readout, where it is on screen, and what it means.
 *
 * The box is in CSS pixels against the HUD canvas's own box, with §11's UI
 * scale already applied — the renderer lays the strip out in unscaled HUD units
 * and multiplies on the way out, so nothing downstream has to know the scale.
 */
export interface ReadoutBox {
  key: ReadoutKey;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Exactly what the strip itself says, character for character.
   *
   * Taken from the same `Text` the player is looking at rather than re-composed
   * here, so the spoken name and the drawn one cannot drift apart.
   */
  value: string;
  /** §7's register: the quantity, what it is measured against, what moves it. */
  detail: string;
}

/** docs/economy.md §2 — the bulk account, and the one every navy starts on. */
export function nodulesDetail(banked: number): string {
  return (
    `${Math.round(banked)} banked` +
    ' · the bulk account: hulls, plate and structures are bought out of it' +
    ' · harvesters cut it from seabed fields and carry it home, and a field runs out'
  );
}

/** docs/economy.md §2 — the tech gate, and the reason anybody goes deep. */
export function crystalDetail(banked: number): string {
  return (
    `${Math.round(banked)} banked` +
    ' · the tech gate: every upper tier and every fleet refit is priced in it' +
    ' · almost all of it is Abyssal, so the deep is where you go for it'
  );
}

/**
 * docs/economy.md §2, §8, §10 — grown rather than mined, and spent like any
 * other account.
 *
 * This line said "nothing is priced in it yet" on its first draft, which was a
 * transcription of a stale sentence in docs/ui-ux.md §13 rather than of the
 * game: seven hulls carry a `biomassCost`, and `Match.produce` refuses a hull
 * short in Biomass alone "exactly as one short in Nodules is". §10 has the
 * Directorate's swarm bought in it outright. The doc row was corrected in the
 * same change.
 */
export function biomassDetail(banked: number): string {
  return (
    `${Math.round(banked)} banked` +
    ' · grown rather than mined: kelp crop, and rendered kills as a windfall' +
    ' · it buys hulls the way nodules do, and the Directorate’s swarm is priced in it'
  );
}

/**
 * docs/economy.md §10 — the population cap, and an argument about sound.
 *
 * The grants are `BERTHS`, not literals: the Bastion's standing grant, the
 * Foundry's and the Slipway's addition, and the hard ceiling. §10's own point
 * is that the only way to raise the ceiling is a Foundry, which hums — so the
 * line names the Foundry rather than leaving the player to find it.
 */
export function berthsDetail(used: number, granted: number): string {
  const state =
    used >= granted
      ? `${used} of ${granted} in use — the next hull is refused`
      : `${used} of ${granted} in use`;
  return (
    state +
    ' · a hull takes its berths when the keel is laid, not when it launches' +
    ` · a Bastion grants ${BERTHS.BASTION}, each commissioned Foundry ${BERTHS.FOUNDRY}` +
    ` and the Slipway ${BERTHS.SLIPWAY}, to a ceiling of ${BERTHS.CEILING}`
  );
}

/**
 * docs/economy.md §2 — the one resource that is never banked.
 *
 * Drawn on the strip as a rate (`DRAW 12/18`) for exactly the reason this line
 * has to restate: a number that could be mistaken for a balance would teach the
 * player the wrong thing about it. `satisfaction` is the report's own field and
 * is quoted as the percentage the HUD already inks the bar by.
 */
export function drawDetail(report: DrawReport): string {
  const rate =
    `${Math.round(report.capacity)} made against ${Math.round(report.demand)} asked for` +
    ' · a rate, never banked — surplus is simply lost';
  if (report.satisfaction >= 1) {
    // Not "every structure asks for its share", which was this line's first
    // draft and is false at both ends: the Bastion makes its own and demands
    // nothing on purpose — `structures.ts`, "a player whose power fails should
    // be slowed, never bricked" — and a Vent Tap and a turret ask for nothing
    // either. The figure is the Bastion's own `drawCapacity`, not a copy.
    const bastion = structureStatsFor(StructureKind.Bastion).drawCapacity ?? 0;
    return (
      rate +
      ` · a Bastion makes ${bastion} and asks for nothing; Vent Taps add the rest` +
      ' · the Refinery, the Foundry and the Slipway are what spend it'
    );
  }
  return (
    rate +
    ` · short: everything that needs power runs at ${Math.round(report.satisfaction * 100)}%` +
    ' · build a tap, or lose a consumer'
  );
}

/**
 * docs/ui-ux.md §3 — the permanent element.
 *
 * Three things the bar cannot say for itself: that it is a *peak* and not an
 * average, where the stops are, and that the second line counts hulls over a
 * threshold five below the red one. The stops are `SIG_BANDS`, which is where
 * §3's table is transcribed, so a stop that moved in the doc moves here too.
 */
export function sigDetail(peak: number, units: number, loud: number): string {
  return (
    `peak ${Math.round(peak)} of 100 across your own hulls, not the average` +
    ' — the loudest hull is the one that gets you found' +
    ` · green below ${SIG_BANDS.AMBER}, amber from ${SIG_BANDS.AMBER}, red from ${SIG_BANDS.RED}` +
    ` · ${loud} of ${units} over ${SIG_BANDS.LOUD}, the count that predicts trouble`
  );
}

/**
 * docs/ui-ux.md §11's parity table — "self-noise bed rising with your SIG", and
 * the `– masking` readout beside it.
 *
 * `worldGain` is `selfMixFor`'s own field and is not recomputed: below 1 the
 * world is being pushed down under your own plant, above 1 it has opened up.
 */
export function bandDetail(label: string, worldGain: number): string {
  const lead =
    `the bed your own plant is making, in words: ${label}` +
    ' · it rises with your own peak SIG, and the mix carries the same fact as sound';
  if (worldGain < 1) {
    return lead + ' · masking: you are drowning out the water you are listening to';
  }
  if (worldGain > 1) {
    return lead + ' · open: running silent, and the water comes back up';
  }
  return lead + ' · throttle down, or run silent, and it falls with you';
}

/**
 * docs/ui-ux.md §11's parity table — "being tracked, continuously".
 *
 * The count is the easiest thing on the strip to read backwards, and the line
 * exists mostly to stop that: `TRACKED ×3` is three things **of yours** held at
 * Bearing or better, not three hostiles. The report says how well you are seen
 * and nothing else, so the line may not imply a listener it does not name.
 *
 * "Things" rather than "hulls" because `ExposureReport.trackedCount` is
 * documented as entities and the exposure walk excludes only ordnance: a
 * tracked Bastion or Foundry is in the count, and a line that said hulls would
 * be the same misreading one step further on.
 */
export function trackedDetail(count: number): string {
  return (
    `${count} of your own hulls and structures are resolved by somebody at bearing or better` +
    ' · how well you are seen, never by whom or from where — that is all the report carries' +
    ' · quieter hulls, or distance, is what lowers it'
  );
}

/** docs/ui-ux.md §10 — what you hold, at whatever fidelity you hold it. */
export function contactsDetail(count: number): string {
  return (
    `${count} contact${count === 1 ? '' : 's'} you currently hold` +
    ' · what your own ears have resolved, at whatever tier they hold it — never the map count' +
    ' · it falls as contacts go stale, and the log keeps what this number forgets'
  );
}

/** docs/ui-ux.md §13, #208 — the log's T+ axis, made live. */
export function clockDetail(): string {
  return (
    'time since the match began' +
    ' · the same T+ stamp the contact log puts on every row, from the server tick both read' +
    ' · it is the match clock, not your own — it does not stop when you do'
  );
}

/** The ground you are standing on: context, not a live number. */
export function mapDetail(name: string): string {
  return (
    `the water this match is being fought in: ${name}` +
    ' · context rather than a number, which is why it is the first thing dropped' +
    ' when the strip runs out of room' +
    ' · a map is several biomes, and a biome is how sound moves through it'
  );
}
