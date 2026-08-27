/**
 * The taps, heard — the authored static emitter of
 * docs/mission-asset-recovery.md §6, against a live match.
 *
 * `missions.test.ts` reads the emitter table's conventions; this file listens
 * to one. The claims worth a simulated run:
 *
 * - **Audible and locatable.** A hull with ears resolves the taps through the
 *   ordinary Echo pass — a real contact, at a real tier, with no new wire
 *   machinery carrying it.
 * - **Patterned.** Struck iron on the interval: passes during the on-window
 *   hold a contact, passes between strikes hold nothing, because a SIG-0
 *   emitter is undetectable like anything else at SIG 0.
 * - **Not a unit.** At classification tier the contact names *nothing* — no
 *   kind, no structure, no species, no ordnance, no faction. The water says
 *   only that something in it is striking iron, and that is the §13 row this
 *   mechanism exists to fill.
 * - **The §6 coupling.** When the lift rigs, the taps stop — and stay
 *   stopped through every following period.
 *
 * One run, memoised, many claims — the arrangement every mission suite here
 * uses, for the same reason: the drive is the expensive part.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  ResolutionTier,
  SIM,
  UnitKind,
  type Contact,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import type { MissionDefinition } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const SEED = 13;
const PLAYER = 0;

/** The worked pattern: two loud seconds at the top of every ten. */
const PERIOD_TICKS = 10 * SIM.TICK_HZ;
const ON_TICKS = 2 * SIM.TICK_HZ;
const TAP_SIG = 60;

/** The rig: five held seconds, at the lift figure. */
const CUT_TICKS = 5 * SIM.TICK_HZ;

/**
 * All inside Sorrowgate's Gate region (x 2000–3250, y 2250–3250, floor
 * 1,500 m): the listener 250 m from the taps — comfortably inside
 * classification range for a SIG-60 source against HYD 70 — and the carrier
 * two hundred metres south of the rig point it is later driven onto.
 */
const TAPS_AT = { x: 2550, y: 2650 };
const SCOUT_AT = { x: 2550, y: 2400 };
const CARRIER_AT = { x: 2350, y: 2900 };
const RIG = { x: 2300, y: 2650, widthM: 150, heightM: 150 };
const AT_RIG = { x: 2360, y: 2700 };
const ARRIVED_M = 60;
const REISSUE_TICKS = 60;

/**
 * Synthetic, for `missionLifts.test.ts`'s reason: no catalogue mission
 * authors an emitter yet, and this file is the mechanism's proof. The taps
 * sit on a scripted party — the chamber is a party in the spec's own §5
 * table — and the player brings one set of ears and one carrier.
 */
const TAPS_MISSION: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-taps-mission',
  doc: 'docs/mission-asset-recovery.md §6 — the test authoring',
  playerSlot: PLAYER,
  courtSlot: 1,
  fauna: false,
  sigBudget: 70,
  arrayTag: 'no-array',
  silenceCeilingSig: 100,
  debtCapS: 60,
  escortRadiusM: 400,
  regions: [{ id: 'rig', ...RIG, note: 'Where the rigging survey runs' }],
  lifts: [
    {
      id: 'chamber',
      tag: 'carrier',
      region: 'rig',
      cutTicks: CUT_TICKS,
      cutSig: 68,
      note: 'The rig whose completion silences the taps',
    },
  ],
  markers: [],
  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: 'One set of ears, one carrier',
      units: [
        {
          tag: 'ears',
          kind: UnitKind.LightScout,
          x: SCOUT_AT.x,
          y: SCOUT_AT.y,
          depthM: 1450,
          role: 'escort',
          pressureRating: 2,
          note: 'The listener, parked inside classification range',
        },
        {
          tag: 'carrier',
          kind: UnitKind.Harvester,
          x: CARRIER_AT.x,
          y: CARRIER_AT.y,
          depthM: 1470,
          role: 'escort',
          note: 'The rigging barge, opening south of the rig',
        },
      ],
    },
    {
      slot: 2,
      faction: Faction.Directorate,
      note: 'The chamber — a sound, not a navy',
      units: [],
      emitters: [
        {
          tag: 'taps',
          x: TAPS_AT.x,
          y: TAPS_AT.y,
          depthM: 1470,
          sig: TAP_SIG,
          periodTicks: PERIOD_TICKS,
          onTicks: ON_TICKS,
          hp: 40,
          silencedByLift: 'chamber',
          note: 'Struck iron, in a worked pattern, on the interval',
        },
      ],
    },
  ],
  locks: [],
  objectives: [],
  beats: [],
};

interface Run {
  /** Echo passes in the listening phase that held a contact / held none. */
  passesWithContact: number;
  passesWithout: number;
  /** The best-resolved contact the listening phase produced. */
  best: Contact | null;
  /** The most units any snapshot ever reported as the player's own force. */
  peakOwnUnits: number;
  /** Echo passes across two full periods after the rig, and how many heard anything. */
  passesAfterRig: number;
  passesAfterRigWithContact: number;
}

let memo: Run | null = null;

function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  const match = new Match(map, { mission: TAPS_MISSION, fauna: false, seed: SEED });

  let last: EchoSnapshot | null = null;
  let carrier = 0;
  let passesWithContact = 0;
  let passesWithout = 0;
  let best: Contact | null = null;
  let peakOwnUnits = 0;

  const step = (observe: boolean): void => {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own === undefined) return;
    last = own;
    if (own.units.length > peakOwnUnits) peakOwnUnits = own.units.length;
    if (carrier === 0) carrier = own.units.find((u) => u.kind === UnitKind.Harvester)?.id ?? 0;
    if (!observe) return;
    // The only foreign thing in the water is the taps, so any contact is them.
    if (own.contacts.length > 0) {
      passesWithContact++;
      for (const contact of own.contacts) {
        if (best === null || contact.tier > best.tier) best = contact;
      }
    } else {
      passesWithout++;
    }
  };

  // Phase 1 — listen through a little over two periods: at least two strike
  // windows and the long silences between them.
  for (let tick = 0; tick < PERIOD_TICKS * 2 + ON_TICKS; tick++) step(true);

  // Phase 2 — drive the carrier onto the rig and hold until the cut lands,
  // with slack for the trip; the runtime silences the taps the pass the lift
  // rigs.
  for (let tick = 0; tick < SIM.TICK_HZ * 60; tick++) {
    if (tick % REISSUE_TICKS === 0 && carrier !== 0) {
      match.orderMove(PLAYER, carrier, AT_RIG.x, AT_RIG.y);
    }
    step(false);
    const u = (last as EchoSnapshot | null)?.units.find((unit) => unit.id === carrier);
    if (u !== undefined && Math.hypot(u.x - AT_RIG.x, u.y - AT_RIG.y) <= ARRIVED_M) break;
  }
  for (let tick = 0; tick < CUT_TICKS + SIM.TICK_HZ * 2; tick++) step(false);

  // Phase 3 — two full periods of what used to be strike windows.
  let passesAfterRig = 0;
  let passesAfterRigWithContact = 0;
  for (let tick = 0; tick < PERIOD_TICKS * 2; tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own === undefined) continue;
    passesAfterRig++;
    if (own.contacts.length > 0) passesAfterRigWithContact++;
  }

  memo = {
    passesWithContact,
    passesWithout,
    best,
    peakOwnUnits,
    passesAfterRig,
    passesAfterRigWithContact,
  };
  return memo;
}

describe('the taps, on the interval', () => {
  it('is audible and locatable through the ordinary Echo pass', () => {
    assert.ok(run().passesWithContact > 0, 'two strike windows produced no contact at all');
    const best = run().best;
    assert.ok(best !== null, 'no contact was ever resolved');
    assert.ok(best.tier >= ResolutionTier.Contact);
  });

  it('falls silent between strikes, because SIG 0 is inaudible', () => {
    // Eight of every ten seconds are between strikes; if every pass held a
    // contact the pattern is not a pattern.
    assert.ok(run().passesWithout > 0, 'the taps never stopped reading — the pattern is not real');
  });

  it('classifies as nothing: no kind, no faction — not a unit', () => {
    const best = run().best;
    assert.ok(best !== null);
    // 250 m against HYD-70 ears is well inside classification range for a
    // SIG-60 source, so the claim is exercised rather than vacuously true.
    assert.ok(
      best.tier >= ResolutionTier.Classification,
      `the listener only reached tier ${best.tier}, so the classification claim went untested`
    );
    assert.equal(best.kind, undefined, 'the taps classified as a unit');
    assert.equal(best.structure, undefined, 'the taps classified as a structure');
    assert.equal(best.fauna, undefined, 'the taps classified as a creature');
    assert.equal(best.ordnance, undefined, 'the taps classified as ordnance');
    assert.equal(best.faction, undefined, 'the taps belong to nobody, and were sent a faction');
    assert.ok(best.depth !== undefined, 'classification discloses depth, like any contact');
  });

  it('never appears in the player’s own force', () => {
    assert.equal(run().peakOwnUnits, 2, 'the emitter leaked into own.units');
  });
});

describe('the taps, silenced — docs/mission-asset-recovery.md §6', () => {
  it('stops when the lift rigs, and stays stopped', () => {
    assert.ok(run().passesAfterRig > 0);
    assert.equal(
      run().passesAfterRigWithContact,
      0,
      'the taps were still heard after the rig — the §6 coupling did not hold'
    );
  });
});
