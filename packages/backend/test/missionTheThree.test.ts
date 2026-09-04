/**
 * The Second Chord 5, read and run — docs/mission-the-three.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions; this
 * file holds The Three to the things only its own document claims, and to the
 * three that a reader of the table cannot check by reading it:
 *
 * - **The house is entered by diving under rock four times** (§4, §11). Four
 *   ceilings — 2,600, 2,700, 2,750, 2,800 — and the terrain, not the mission,
 *   is what refuses a hull that did not dive. The foot's floor is 2,700 rather
 *   than the party's own 2,300 for exactly that reason: two cells connect only
 *   at a depth both admit, and a 2,300 m floor under a 2,600 m roof connects to
 *   nothing at all. Asserted against `Terrain.admits`, which is the only thing
 *   that actually knows.
 * - **Every figure in §3, §4, §6 and §7 is quoted from the shipped model.** The
 *   dive heard from 3,596 m, the house audible from 2,618, the silent Voice at
 *   7.583 clearing a ceiling of 8 by four tenths of a point, three cells that
 *   resolve to a place and never to a thing. Re-derived here, so the document's
 *   arithmetic and the roster cannot drift apart in silence.
 * - **The tide runs its length** (§9, §13). The room is met at about four and a
 *   half minutes and the hush a minute before it, and both are terminal — so a
 *   run is what proves `runsItsLength`, and a run is what this file does.
 *
 * And two things the mission is scored on that only a run can show: that a
 * tender which has lost its ears stops where it stands, and that nothing in
 * this water crushes, shoots or breaks anybody in twelve minutes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DEPTH,
  Faction,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  PROPAGATION_FACTOR,
  SILENT_RUNNING,
  SIM,
  StructureKind,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  detectionRatio,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { THE_FIRST, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { CHORD_THE_THREE } from '../src/sim/missions/index.ts';
import { inRegion } from '../src/sim/missions/predicates.ts';
import { Match } from '../src/sim/match.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const PLAYER = CHORD_THE_THREE.playerSlot;

const MAP = missionMapById(CHORD_THE_THREE.mapId)!;
const TERRAIN = terrainFor(MAP);

const CRUISER = statsFor(UnitKind.Cruiser);
const CORVETTE = statsFor(UnitKind.Corvette);
const SPIRE = structureStatsFor(StructureKind.SoundingSpire);
const FIELDS = PROPAGATION_FACTOR[Biome.ResonanceField];
const RUINS = PROPAGATION_FACTOR[Biome.CoralRuins];
const TRENCH = PROPAGATION_FACTOR[Biome.AbyssalTrench];

/** §11 — the places this mission argues about, as points rather than rects. */
const THE_CHORD = { x: 2000, y: 2250 };
const THE_ROOM = { x: 2750, y: 2250 };
/** §4, §6 — the hall's east end, where an escort covers the whole room. */
const HALL_MOUTH = { x: 2500, y: 2250 };
/** §7 — the hall's south half, where a hull holds the axis. */
const HALL_SOUTH = { x: 2000, y: 2450 };
const THE_AXIS = { x: 2000, y: 2650 };
/** §11 — the far end of the roofed approach, and the party's first waypoint in. */
const IN_THE_APPROACH = { x: 2000, y: 1800 };
/** Open water at the party's own 2,300 m, well east along the foot. */
const ALONG_THE_FOOT = { x: 3500, y: 500 };

const byTag = (tag: string) =>
  CHORD_THE_THREE.parties.flatMap((party) => party.units).find((unit) => unit.tag === tag)!;
const objective = (id: string) => CHORD_THE_THREE.objectives.find((o) => o.id === id)!;
const region = (id: string) => CHORD_THE_THREE.regions.find((r) => r.id === id)!;
const emitter = (tag: string) =>
  CHORD_THE_THREE.parties.flatMap((party) => party.emitters ?? []).find((e) => e.tag === tag)!;

/** The range at which SIG through water of a given PF reaches HYD at a tier. */
function rangeAt(sig: number, pf: number, hyd: number, multiple: number): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, pf, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

/** `acoustics.ts`' own arithmetic, re-derived rather than imported (it is private). */
const silentSig = (idle: number): number =>
  SILENT_RUNNING.SIG_MIN +
  (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * Math.min(1, idle / 60);

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  resolvedAtTick: number;
  lines: { tick: number; speaker: string; text: string }[];
  objectives: { id: string; status: ObjectiveStatus }[];
  counters: Map<string, { done: number; of: number }>;
  last: EchoSnapshot;
}

/** Four hulls, by the seat §11 gives each of them, resolved on the first pass. */
interface Escort {
  tender: number;
  voice: number;
  first: number;
  second: number;
}

function crewOf(own: EchoSnapshot): Escort {
  const at = (x: number, y: number): number => {
    let best = own.units[0]!;
    for (const unit of own.units) {
      if (Math.hypot(unit.x - x, unit.y - y) < Math.hypot(best.x - x, best.y - y)) best = unit;
    }
    return best.id;
  };
  return {
    tender: at(byTag('the-choirmaster').x, byTag('the-choirmaster').y),
    voice: at(byTag('the-voice').x, byTag('the-voice').y),
    first: at(byTag('ear-first').x, byTag('ear-first').y),
    second: at(byTag('ear-second').x, byTag('ear-second').y),
  };
}

/**
 * Play the tide, letting `drive` give orders on the Echo ticks it wants — the
 * cadence the player's own snapshot arrives at, so the test plays a game
 * somebody could play. The first pass is not tick zero, which is why every
 * order below is hung on a tick the mission's own clock names.
 */
function play(
  drive: ((own: EchoSnapshot, match: Match, crew: Escort) => void) | undefined,
  untilTick: number
) {
  const match = new Match(MAP, { mission: CHORD_THE_THREE, fauna: false, seed: 3 });
  const lines: Run['lines'] = [];
  const counters = new Map<string, { done: number; of: number }>();
  let last: EchoSnapshot | undefined;
  let crew: Escort | undefined;
  for (let tick = 0; tick <= untilTick; tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      crew ??= crewOf(own);
      drive?.(own, match, crew);
    }
    const view = match.takeMissionView();
    for (const row of view?.objectives ?? []) {
      if (row.progress !== undefined) counters.set(row.id, row.progress);
    }
    for (const line of match.takeMissionLines()) lines.push(line);
    if (match.missionOver !== null) break;
  }
  assert.ok(last !== undefined, 'the escort never resolved');
  return { match, lines, counters, last };
}

/** Play it to the close, and read what the Choirmaster reads. */
function runOut(
  drive?: (own: EchoSnapshot, match: Match, crew: Escort) => void,
  untilTick = T(12, 30)
): Run {
  const played = play(drive, untilTick);
  const over = played.match.missionOver;
  assert.ok(over !== null, 'the tide never ended');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    resolvedAtTick: played.match.world.tick,
    lines: played.lines,
    objectives: over.objectives,
    counters: played.counters,
    last: played.last,
  };
}

describe('the First, as docs/mission-the-three.md §11 seats it', () => {
  it('is a mission map, resolved by mission id and nothing else', () => {
    assert.equal(CHORD_THE_THREE.mapId, 'the-first');
    assert.equal(mapById('the-first'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('the-first'), THE_FIRST, '§11: resolved by mission id only');
    assert.equal(THE_FIRST.seats, 1, '§11: one seat, not balanced');
    assert.deepEqual(THE_FIRST.resources, [], '§11: the First is finished');
    assert.deepEqual(THE_FIRST.hazards, [], '§11: nothing on this map is a hazard');
  });

  it('enters the house by diving under rock four times, and by nothing else', () => {
    // §4's third movement, and the one thing on this map that is enforced by
    // ground rather than by courtesy. Every room is a ceiling and each is
    // deeper than the last, so a hull at the party's own 2,300 m is refused by
    // all four and a hull that dived is admitted by each in turn.
    const roofs: readonly [string, { x: number; y: number }, number][] = [
      ['the approach', { x: 2000, y: 1500 }, 2600],
      ['the chord', THE_CHORD, 2700],
      ['the hospice', { x: 1250, y: 2250 }, 2750],
      ['the sealed room', THE_ROOM, 2800],
    ];
    for (const [name, at, roof] of roofs) {
      assert.equal(TERRAIN.ceilingAt(at.x, at.y), roof, `${name}: roofed at ${roof}`);
      assert.ok(!TERRAIN.admits(at.x, at.y, byTag('the-choirmaster').depthM), `${name}: entered`);
      assert.ok(!TERRAIN.admits(at.x, at.y, roof - 1), `${name}: a metre above the roof is rock`);
      assert.ok(TERRAIN.admits(at.x, at.y, roof), `${name}: the roof itself is water`);
      assert.ok(TERRAIN.admits(at.x, at.y, 2900), `${name}: the floor of the house`);
    }
    // Each deeper than the last, which is why the sealed room is the last dive.
    assert.deepEqual(
      roofs.map(([, , roof]) => roof),
      [...roofs.map(([, , roof]) => roof)].sort((a, b) => a - b),
      '§11: four ceilings, each deeper than the last'
    );
  });

  it('floors the foot at 2,700 rather than 2,300, because the roof is the reason', () => {
    // §11 records this as the one number the ground forced, rather than leaving
    // it to be discovered here: a hull can only step between two cells at a
    // depth both admit, so a foot floored at the party's own 2,300 m under an
    // approach roofed at 2,600 would leave three hundred metres of rock between
    // the escort and the house and no way in at all.
    const seat = byTag('the-choirmaster');
    assert.equal(THE_FIRST.floorM, 2700, '§11: base floor 2,700');
    assert.equal(TERRAIN.floorAt(seat.x, seat.y), 2700);
    assert.ok(TERRAIN.admits(seat.x, seat.y, seat.depthM), 'the party is seated in water');
    // The dive: 2,300 to 2,650 while still over the foot, and then across.
    assert.ok(TERRAIN.admits(seat.x, seat.y, 2650), 'the foot holds the dive');
    assert.ok(TERRAIN.admits(2000, 1500, 2650), 'and the approach admits what arrives at 2,650');
    assert.ok(!TERRAIN.admits(2000, 1500, 2300), '§11: the party cannot cross at its own depth');
    // §7 — eight seconds of it, at DEPTH.DESCENT_SIG, heard by the house.
    assert.equal(Math.round((2650 - seat.depthM) / DEPTH.DESCENT_RATE_MPS), 8, '§7: eight seconds');
    assert.equal(DEPTH.DESCENT_SIG, 72, '§4: a dive is seventy-two');
  });

  it('seats every hull, instrument and sound in water that admits it, inside its own rating', () => {
    // `missions.test.ts` holds every mission to this; the figures are here
    // because §11 states them one by one and a reader will check.
    for (const party of CHORD_THE_THREE.parties) {
      for (const unit of party.units) {
        assert.ok(TERRAIN.admits(unit.x, unit.y, unit.depthM), `${unit.tag}: seated in rock`);
        const rating = unit.pressureRating ?? statsFor(unit.kind).pressureRating;
        assert.ok(
          rating >= requiredPressureRating(unit.depthM),
          `${unit.tag}: crushes where it is`
        );
      }
      for (const thing of [...(party.structures ?? []), ...(party.emitters ?? [])]) {
        assert.ok(TERRAIN.admits(thing.x, thing.y, thing.depthM), `${thing.tag}: seated in rock`);
      }
    }
    // §11 — the trench floor is a hundred metres below anywhere a hull can be
    // ordered, which is the correct relationship between this Order and that
    // water, and the axis stands fifty metres off it.
    assert.equal(TERRAIN.floorAt(THE_AXIS.x, THE_AXIS.y), 3100);
    assert.equal(TERRAIN.floorAt(THE_AXIS.x, THE_AXIS.y) - DEPTH.MAX_M, 100, '§11: below MAX_M');
    assert.equal(emitter('the-axis').depthM, 3050, '§7: fifty metres off the trench floor');
  });
});

describe('the escort, as docs/mission-the-three.md §3 fields it', () => {
  const player = CHORD_THE_THREE.parties.find((party) => party.slot === PLAYER)!;

  it('is four hulls, thirty-one souls, PR-3 by refit, and not one of them armed', () => {
    assert.equal(player.units.length, 4, '§2: four hulls at the foot, one of which is her');
    assert.equal(player.faction, Faction.Hadron);
    assert.equal(
      player.units.reduce((total, unit) => total + (unit.souls ?? 0), 0),
      31,
      '§3: thirty-one souls, carried by hand because nothing in the runtime reads the field'
    );
    for (const unit of player.units) {
      assert.equal(unit.pressureRating, 3, '§3: PR-3 by refit, on all four or the mission fails');
      assert.equal(unit.armed, undefined, '§2, §3: nothing aboard is armed');
      assert.equal(unit.depthM, 2300, '§11: the party crosses the foot at 2,300 m');
    }
    // The refit is a mission fact and never a roster fact.
    assert.equal(CRUISER.pressureRating, 2, '§3: the Hadron baseline is PR-2');
    assert.equal(CORVETTE.pressureRating, 2);
    assert.equal(requiredPressureRating(2300), 3, '§11: Abyssal from the first tick');
    assert.equal(requiredPressureRating(2900), 3, 'and Abyssal at the floor of the house');
  });

  it('gives one hull the tender role and three the escort, and no role to the house', () => {
    assert.equal(byTag('the-choirmaster').role, 'tender', "§8: the Choirmaster's hull");
    assert.equal(byTag('the-choirmaster').kind, UnitKind.Cruiser);
    for (const tag of ['the-voice', 'ear-first', 'ear-second']) {
      assert.equal(byTag(tag).role, 'escort', '§8: the Voice and the two Corvettes');
    }
    assert.equal(byTag('the-voice').kind, UnitKind.Cruiser);
    assert.equal(byTag('ear-first').kind, UnitKind.Corvette);
    assert.equal(byTag('ear-second').kind, UnitKind.Corvette);
    const house = CHORD_THE_THREE.parties.find((party) => party.slot !== PLAYER)!;
    assert.equal(house.units.length, 0, '§5: the First has no hulls');
    assert.equal(house.faction, Faction.Hadron, '§2: two Knight parties, formally enemies');
    assert.notEqual(house.slot, CHORD_THE_THREE.courtSlot, '§5: the court slot stays empty');
  });

  it('locks all seven abilities, each with the house’s own reason attached', () => {
    // §3, and docs/ui-ux.md §7: a disabled action greys out with a reason. §3
    // pairs this room with the prologue's — the same argument at opposite ends
    // of the campaign — and says the prologue is the only literal to have
    // locked all seven before it. That is a claim about the bible rather than
    // about this mission, and `firstArrival.ts` landed in the same batch and
    // locks all seven too, so nothing here asserts the exclusivity.
    assert.deepEqual(
      CHORD_THE_THREE.locks.map((lock) => lock.ability).sort(),
      [
        'activeSonar',
        'construction',
        'depthCharges',
        'mines',
        'noisemakers',
        'torpedoes',
        'weapons',
      ],
      '§3: all seven of MissionAbility’s names'
    );
    for (const lock of CHORD_THE_THREE.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability}: locked and unexplained`);
    }
    const reasonFor = (ability: string) =>
      CHORD_THE_THREE.locks.find((lock) => lock.ability === ability)!.reason;
    assert.match(reasonFor('activeSonar'), /a ping in the chord is a stroke/, '§3, verbatim');
    assert.equal(reasonFor('construction'), 'the First is finished', '§3, verbatim');
    assert.match(reasonFor('weapons'), /nothing in it is aimed but the Chord/, '§3, verbatim');
  });

  it('counts the Order’s crystal once, and spends none of it in the engine', () => {
    // §3, §13 — the ledger is prose. It is stated once, here, and
    // docs/mission-rim-deposits.md and docs/mission-second-chord.md both cite
    // this paragraph rather than restating it, so the figures are load-bearing
    // for two other literals: 600 held, 60 a certificate, four cut, 360 left,
    // and 360 is three Spires and not a fourth.
    const HELD = 600;
    const CERTIFICATE = 60;
    const hulls = CHORD_THE_THREE.parties.find((party) => party.slot === PLAYER)!.units.length;
    assert.equal(hulls * CERTIFICATE, 240, '§3: four certificates, this morning');
    assert.equal(HELD - hulls * CERTIFICATE, 360, '§3: three hundred and sixty left');
    assert.equal(SPIRE.crystalCost, 120, "§3: a Spire's crystal, the roster's figure");
    assert.equal(SPIRE.cost, 750, '§3: and its 750 nodules, which are the stipend’s');
    assert.equal(Math.floor(360 / SPIRE.crystalCost), 3, '§3: three Spires');
    assert.ok(360 < 4 * SPIRE.crystalCost, '§3: and not a fourth');
    assert.equal(CERTIFICATE * 2, SPIRE.crystalCost, '§3: a certificate is half a Spire');
    // And none of it is a mechanism (§13): nothing is bought, nothing is built.
    assert.equal(CHORD_THE_THREE.startingNodules, 0, '§13: startingNodules is 0');
    const briefing = CHORD_THE_THREE.briefing!.join(' ');
    assert.match(briefing, /two hundred and forty of the six hundred/, '§12: the ledger, once');
    assert.match(briefing, /three hundred and sixty is three Spires and not a fourth/, '§12');
  });
});

describe('the hush, as docs/mission-the-three.md §4 prices it', () => {
  it('sets its ceiling at the band’s own, which is the only thing that reaches it', () => {
    const hush = objective('the-hush');
    assert.deepEqual(hush.predicate, { kind: 'quiet', role: 'escort', ceilingSig: 8 });
    assert.equal(SILENT_RUNNING.SIG_MAX, 8, '§4, §13: eight is the button, not a discipline');
    assert.equal(CHORD_THE_THREE.sigBudget, 8, '§4: the budget is what the escort emits');
    // §4 — the quietest thing a Knight hull does otherwise, and the number the
    // document calls a shove.
    assert.equal(CORVETTE.sigIdle, 28, '§4: a Corvette that simply stops emits 28');
    assert.equal(CRUISER.sigIdle, 55, '§4: and the Voice idles at 55');
    assert.ok(CORVETTE.sigIdle > SILENT_RUNNING.SIG_MAX, 'so idling is not a way to keep it');
  });

  it('clears it by four tenths of a point, on the loudest hull the row measures', () => {
    // §13's row, and the one this mission is scored on: `silentRunningSig`
    // places a hull inside the 3-8 band by its own idle figure rather than at
    // the band's ceiling, so only a hull idling at 60 or more ever reads the 8.
    assert.equal(silentSig(CORVETTE.sigIdle).toFixed(1), '5.3', '§3, §4: a Corvette at 5.3');
    assert.equal(silentSig(CRUISER.sigIdle).toFixed(1), '7.6', '§3, §4: the Voice at 7.6');
    assert.ok(silentSig(CRUISER.sigIdle) <= SILENT_RUNNING.SIG_MAX, 'the hush is keepable');
    assert.equal(
      (SILENT_RUNNING.SIG_MAX - silentSig(CRUISER.sigIdle)).toFixed(1),
      '0.4',
      '§4: four tenths of a point of margin, and no other way to buy it'
    );
    // A Knight hull in the roster at 2.2x a comparable hull's SIG would idle
    // past 60 and breach a ceiling nobody had moved (§13). It does not exist.
    assert.ok(CRUISER.sigIdle < 60, '§13: only a hull idling at 60 or more reads the eight');
  });

  it('holds the whole sealed room from the hall’s mouth, at 559 m against 600', () => {
    // §4's second movement, and §6's argument: the geometry does what no
    // predicate can. There is no negative region test in this format — *the
    // escort did not enter the room* is inexpressible — so the mission arranges
    // the water instead, and the escort waits at the door because there is
    // nowhere else it needs to be.
    const room = region('sealed-room');
    assert.equal(CHORD_THE_THREE.escortRadiusM, 600, '§4, §13: the hold is 600 m here');
    assert.equal(room.widthM, 500, '§6: the room is 500 m wide');
    const corners = [
      [room.x, room.y],
      [room.x + room.widthM, room.y],
      [room.x, room.y + room.heightM],
      [room.x + room.widthM, room.y + room.heightM],
    ];
    const farthest = Math.max(
      ...corners.map(([x, y]) => Math.hypot(x! - HALL_MOUTH.x, y! - HALL_MOUTH.y))
    );
    assert.equal(Math.round(farthest), 559, '§4: the farthest corner is 559 m');
    assert.ok(farthest < CHORD_THE_THREE.escortRadiusM, '§4: every metre of it inside the hold');
    // The mouth is the shared edge of the hall and the room, and `inRegion` is
    // inclusive of it — which costs nothing here, because no predicate in this
    // mission counts escorts against the room. §6's courtesy is the player's.
    assert.ok(inRegion(room, HALL_MOUTH.x, HALL_MOUTH.y), 'the mouth is on the room’s own edge');
    assert.ok(inRegion(region('the-chord'), HALL_MOUTH.x, HALL_MOUTH.y), 'and on the hall’s');
    assert.ok(!inRegion(room, THE_CHORD.x, THE_CHORD.y), 'the middle of the hall is not the room');
    assert.ok(inRegion(room, THE_ROOM.x, THE_ROOM.y), 'and the marker is');
  });
});

describe('what is heard, as docs/mission-the-three.md §7 counts it', () => {
  const M = TIER_THRESHOLD_MULTIPLIER;

  it('hears the party arrive before anybody says so', () => {
    // §4's third movement: the house knows who has arrived before Fenn
    // acknowledges it at 03:00, which is the courtesy running the correct way
    // round. SIG 72 through the Fields' 0.70 water against the Chord's HYD 45.
    assert.equal(SPIRE.hyd, 45, '§5: the house’s ears');
    assert.equal(FIELDS, 0.7, '§11: the Fields carry at 0.70');
    assert.equal(rangeAt(DEPTH.DESCENT_SIG, FIELDS, SPIRE.hyd, M.CONTACT), 3596, '§4');
    assert.equal(rangeAt(DEPTH.DESCENT_SIG, FIELDS, SPIRE.hyd, M.BEARING), 2791, '§4');
    assert.equal(rangeAt(DEPTH.DESCENT_SIG, FIELDS, SPIRE.hyd, M.CLASSIFICATION), 2028, '§4');
    const seat = byTag('the-choirmaster');
    const toChord = Math.hypot(THE_CHORD.x - seat.x, THE_CHORD.y - seat.y);
    assert.equal(Math.round(toChord), 1950, 'the party dives about fifteen hundred metres out');
    assert.ok(toChord < 2028, '§4: classified, not merely heard');
    // §11's second way in, named so that it reads as deliberate: a dive at 72
    // on the axis is the loudest thing anybody could do on this map.
    assert.equal(TRENCH, 1.6, '§11: the Axis carries at 1.60');
    assert.equal(rangeAt(DEPTH.DESCENT_SIG, TRENCH, SPIRE.hyd, M.CONTACT), 6029, '§11');
  });

  it('makes the house audible from the moment the party crosses the foot', () => {
    // §7 — the First Chord at 30 SIG, continuously, and the only thing on this
    // map that would still be audible if nobody moved.
    assert.equal(SPIRE.sigIdle, 30, '§5: SIG 30 idle');
    assert.equal(SPIRE.maxHp, 1800, '§5: 1,800 HP, and nothing on this map can spend one');
    assert.equal(rangeAt(SPIRE.sigIdle, FIELDS, CRUISER.hyd, M.CONTACT), 2618, '§7');
    assert.equal(rangeAt(SPIRE.sigIdle, RUINS, CRUISER.hyd, M.CONTACT), 2846, '§7');
    assert.equal(rangeAt(SPIRE.sigIdle, FIELDS, CRUISER.hyd, M.BEARING), 2032, '§7');
    assert.equal(rangeAt(SPIRE.sigIdle, RUINS, CRUISER.hyd, M.BEARING), 2209, '§7');
    const seat = byTag('the-voice');
    assert.ok(
      Math.hypot(THE_CHORD.x - seat.x, THE_CHORD.y - seat.y) < 2618,
      '§7: audible from the seat, on the first tick, without anybody moving'
    );
  });

  it('never stops hearing the escort, and stops hearing a hull under way', () => {
    // §7 — a house at 2,900 m hears everything in its own hall. What it stops
    // hearing is a hull *under way*, which is the only thing this register
    // calls a shove and the only thing it enters.
    assert.equal(rangeAt(silentSig(CRUISER.sigIdle), RUINS, SPIRE.hyd, M.CONTACT), 958, '§7');
    assert.equal(
      rangeAt(silentSig(CRUISER.sigIdle), RUINS, SPIRE.hyd, M.CLASSIFICATION),
      540,
      '§7'
    );
    assert.equal(rangeAt(silentSig(CORVETTE.sigIdle), RUINS, SPIRE.hyd, M.CONTACT), 768, '§7');
    assert.equal(
      rangeAt(silentSig(CORVETTE.sigIdle), RUINS, SPIRE.hyd, M.CLASSIFICATION),
      433,
      '§7'
    );
  });

  it('gives the player three cells, a place and a depth, and nothing else ever', () => {
    // §5, §6 — the cells carry no `reading`, which is the format's own way of
    // saying a thing is heard and not read: not attendable, in no count, in no
    // epilogue. The mission is the campaign's fourth wall walked up to from the
    // Order's side, and the wall holds because the contact rules hold it.
    const cells = ['cell-one', 'cell-two', 'cell-three'].map(emitter);
    assert.equal(cells.length, 3, '§5: three cells');
    for (const cell of cells) {
      assert.equal(cell.sig, 4, '§5: SIG 4 apiece');
      assert.equal(cell.periodTicks, 6 * SIM.TICK_HZ, '§5: a six-second period');
      assert.equal(cell.onTicks, 2 * SIM.TICK_HZ, '§5: two seconds on');
      assert.equal(cell.fromTick, undefined, '§5: unbounded');
      assert.equal(cell.untilTick, undefined);
      assert.equal(cell.reading, undefined, '§5: no reading, so never attendable');
      assert.equal(cell.depthM, 2900, '§11: 2,750 <= 2,900 <= 2,900');
    }
    // §6 — a Voice in the hall's west end stands 350 m from the nearest of them.
    const nearest = Math.min(...cells.map((cell) => Math.hypot(cell.x - 1600, cell.y - 2250)));
    assert.equal(Math.round(nearest), 350, '§6: 350 m from the hall’s west end');
    assert.equal(rangeAt(4, RUINS, CRUISER.hyd, M.CONTACT), 808, '§6, §7');
    assert.equal(rangeAt(4, RUINS, CRUISER.hyd, M.CLASSIFICATION), 456, '§6, §7');
    assert.equal(rangeAt(4, RUINS, CORVETTE.hyd, M.CONTACT), 686, '§7');
    assert.equal(rangeAt(4, RUINS, CORVETTE.hyd, M.CLASSIFICATION), 387, '§7');
    assert.ok(nearest < 456, '§6: well inside a classification, which is a place and a depth');
  });

  it('sounds the Chord at 07:40 and the axis at 08:40, and connects nothing', () => {
    const ring = emitter('the-chord-ring');
    const axis = emitter('the-axis');
    const window = 20 * SIM.TICK_HZ;
    assert.equal(ring.fromTick, T(7, 40), '§9: the Chord sounds, unstruck');
    assert.equal(ring.untilTick, T(8), '§9: twenty seconds');
    assert.equal(ring.untilTick! - ring.fromTick!, window);
    assert.equal(ring.periodTicks, window, '§5: sustained — period = on = 20 s');
    assert.equal(ring.onTicks, window);
    assert.equal(ring.sig, 12, '§5: SIG 12');
    assert.deepEqual({ x: ring.x, y: ring.y, depthM: ring.depthM }, { ...THE_CHORD, depthM: 2900 });
    assert.equal(axis.fromTick, T(8, 40), '§9: sixty seconds after the Chord sounded');
    assert.equal(axis.untilTick, T(9));
    assert.equal(axis.sig, 3, '§4: the return’s own figures, from mission-attendance.md §6');
    assert.equal((axis.fromTick! - ring.fromTick!) / SIM.TICK_HZ, 60, '§4: a minute of precursor');
    // §7 — bearing to the Voice from 1,246 m in the chord's own water, which is
    // further than any part of the house, so every hull in the building has it.
    assert.equal(rangeAt(ring.sig, RUINS, CRUISER.hyd, M.BEARING), 1246, '§7');
    assert.ok(1246 > region('the-chord').widthM, '§7: further than any part of the house');
    // §7 — the axis crosses 250 m of Coral Ruins and 150 m of Abyssal Trench,
    // a mean PF of about 1.10, which puts bearing at 639 m.
    const toEdge = region('the-chord').y + region('the-chord').heightM;
    assert.equal(toEdge - THE_CHORD.y, 250, '§7: 250 m of Coral Ruins');
    assert.equal(THE_AXIS.y - toEdge, 150, '§7: and 150 m of Abyssal Trench');
    assert.equal(((250 * RUINS + 150 * TRENCH) / 400).toFixed(2), '1.10', '§7: a mean PF of 1.10');
    assert.equal(rangeAt(axis.sig, 1.1, CRUISER.hyd, M.BEARING), 639, '§7');
    assert.equal(Math.round(Math.hypot(THE_AXIS.x - HALL_MOUTH.x, THE_AXIS.y - HALL_MOUTH.y)), 640);
    assert.ok(Math.hypot(THE_AXIS.x - HALL_SOUTH.x, THE_AXIS.y - HALL_SOUTH.y) < 639, '§7');
    // §7 — a Corvette at the hall's south edge is 150 m out and holds it at Track.
    assert.ok(rangeAt(axis.sig, 1.1, CORVETTE.hyd, M.TRACK) > 150, '§7: held at Track');
  });
});

describe('the objective, as docs/mission-the-three.md §8 chooses it', () => {
  it('decides the count by the room and the hush, and reads the third out', () => {
    const terminal = CHORD_THE_THREE.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-room', 'the-hush'],
      '§8: two terminal rows, and neither is a keystone'
    );
    for (const row of terminal) {
      assert.notEqual(row.keystone, true, '§8: no keystone, so the ladder is the format’s own');
    }
    assert.deepEqual(objective('the-room').predicate, {
      kind: 'extract',
      role: 'tender',
      region: 'sealed-room',
      count: 1,
    });
    assert.deepEqual(objective('the-house-hears').predicate, { kind: 'attend', count: 2 });
    assert.notEqual(objective('the-house-hears').terminal, true, '§8: read out, never ranked');
    // §8 — two attendable emitters exist, so the count is the whole of what
    // there is to attend. The three cells are not among them.
    const attendable = CHORD_THE_THREE.parties
      .flatMap((party) => party.emitters ?? [])
      .filter((e) => e.reading !== undefined);
    assert.deepEqual(
      attendable.map((e) => e.tag),
      ['the-chord-ring', 'the-axis'],
      '§8: the Chord unstruck, then the axis — the order they are read out in'
    );
    for (const row of CHORD_THE_THREE.objectives) {
      assert.ok(row.reading !== undefined, `${row.id}: read out at the close`);
      assert.equal(row.revealAtTick, undefined, '§9: all three rows are revealed at 00:00');
      assert.equal(row.initial, ObjectiveStatus.Pending);
    }
  });

  it('latches nothing at tick zero, which is why it can afford to run its length', () => {
    // §8's own claim about the room — "the party is seated 2,089 m away at the
    // foot, so nothing latches at tick zero" — and the hush's, which opens
    // breached because a Cruiser idles at 55 against a ceiling of 8. Both are
    // terminal, so a mission that latched either at tick zero would have
    // `runsItsLength` doing work it should not have to do.
    const seat = byTag('the-choirmaster');
    const marker = CHORD_THE_THREE.markers[0]!;
    assert.equal(marker.id, 'the-room');
    assert.equal(Math.round(Math.hypot(marker.x - seat.x, marker.y - seat.y)), 2089, '§8');
    assert.ok(!inRegion(region('sealed-room'), seat.x, seat.y), '§8: nothing latches at tick zero');
    assert.ok(inRegion(region('the-foot'), seat.x, seat.y), '§8: the party is at the foot');
    for (const tag of ['the-voice', 'ear-first', 'ear-second']) {
      const unit = byTag(tag);
      assert.ok(
        statsFor(unit.kind).sigIdle > 8,
        `${tag}: opens above the ceiling, so the hush is not met before it is kept`
      );
    }
    assert.equal(CHORD_THE_THREE.runsItsLength, true, '§9, §13: twelve minutes is the mission');
  });

  it('reads §8’s three rows and the two emitter lines back in the register', () => {
    assert.match(objective('the-room').reading!.met, /^The season's case was read\./, '§8');
    assert.match(objective('the-room').reading!.unmet, /it has kept thirty-six years/, '§8');
    assert.match(objective('the-hush').reading!.met, /^The hush was kept\./, '§8');
    assert.match(objective('the-hush').reading!.unmet, /is a shove/, '§8');
    assert.match(objective('the-house-hears').reading!.unmet, /The Order keeps no gap\./, '§8');
    assert.match(emitter('the-chord-ring').reading!.entered, /Nothing else is\.$/, '§8');
    assert.match(emitter('the-chord-ring').reading!.gap, /on their word\.$/, '§8');
    assert.match(emitter('the-axis').reading!.entered, /not entered as anything/, '§8');
    assert.match(emitter('the-axis').reading!.gap, /so nothing is entered\.$/, '§8');
    assert.match(CHORD_THE_THREE.epilogue[MissionOutcome.Complete], /^The case is read/, '§8');
    assert.match(CHORD_THE_THREE.epilogue[MissionOutcome.Partial], /^One of the two/, '§8');
    assert.match(CHORD_THE_THREE.epilogue[MissionOutcome.Lost], /^Twelve minutes in the First/);
    assert.match(
      CHORD_THE_THREE.epilogue[MissionOutcome.Partial],
      /I notice I would like to\.$/,
      '§8: the middle rung is two different tides and the format gives it one sentence'
    );
  });
});

describe('the beats, as docs/mission-the-three.md §9 clocks them', () => {
  it('speaks seven times on the clock and once on a tally, in ascending order', () => {
    // §13: eight lines, seven on the clock and one on a tally — six said, the
    // close read, and Fenn's line when the Choirmaster reaches the room.
    const says = CHORD_THE_THREE.beats.filter((beat) => beat.kind === 'say');
    assert.deepEqual(
      says.map((beat) => beat.atTick / SIM.TICK_HZ),
      [120, 180, 360, 460, 540, 630],
      '§9: 02:00, 03:00, 06:00, 07:40, 09:00, 10:30'
    );
    assert.equal(CHORD_THE_THREE.conditionalBeats?.length, 1, '§9: one standing rule, in no order');
    const tally = CHORD_THE_THREE.conditionalBeats![0]!;
    assert.equal(tally.kind, 'say', '§12: fired by the tally, not the clock');
    assert.deepEqual(tally.when, objective('the-room').predicate, '§9: the room’s own predicate');
    assert.equal(tally.choiceGroup, undefined, 'one condition, one line');
    assert.equal(
      CHORD_THE_THREE.beats.filter((beat) => beat.atTick === 0).length,
      0,
      '§9: nothing is authored at 00:00 — the briefing is the header’s and is read before the socket'
    );
  });

  it('closes as a conclusion at twelve minutes exactly, with nothing loud behind it', () => {
    const resolve = CHORD_THE_THREE.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(12), '§9: the resolve lands at 720 s exactly');
    assert.equal(resolve.kind === 'resolve' ? resolve.conclusion : undefined, true, '§8');
    assert.deepEqual(CHORD_THE_THREE.lengthBandS, [720, 780], '§9: the header’s own band');
    assert.equal(MISSION.LENGTH_MIN_S, 720, '§9: the floor of campaign.md §10’s 12–25, legally');
    assert.equal(resolve.atTick / SIM.TICK_HZ, CHORD_THE_THREE.lengthBandS[0], '§9: a boundary');
    // §8, §9 — the sixty-second telegraph is not owed and is not smuggled in:
    // there is no loud beat because there is nothing to warn about.
    assert.equal(
      CHORD_THE_THREE.beats.filter((beat) => beat.kind === 'creature').length,
      0,
      '§9: no creature beat is authored'
    );
    assert.equal(CHORD_THE_THREE.fauna, false, '§11: below 2,700 m the column holds nothing');
    assert.equal(MISSION.FAILURE_TELEGRAPH_S, 60, 'the rule the conclusion is exempt from');
  });

  it('runs no silence ledger, no walk, no lift, no sounding and no sweep', () => {
    // §9, §13 — `arrayTag` is unset, so the ledger never runs and the hush is
    // an objective rather than a debt. Everything else the format offers is
    // deliberately absent: this mission is the cheapest literal in the bible.
    assert.equal(CHORD_THE_THREE.arrayTag, undefined, '§9: no silence order');
    assert.equal(CHORD_THE_THREE.silenceCeilingSig, 100);
    assert.equal(CHORD_THE_THREE.debtCapS, 0);
    assert.equal(CHORD_THE_THREE.walk, undefined);
    assert.equal(CHORD_THE_THREE.holds, undefined);
    assert.equal(CHORD_THE_THREE.lifts, undefined);
    assert.equal(CHORD_THE_THREE.soundings, undefined);
    assert.equal(CHORD_THE_THREE.sweep, undefined, '§13: the house’s hearing is not modelled');
    assert.equal(CHORD_THE_THREE.commanderAbility, undefined);
    // §3, §5 — the refit is per hull and the water is not manufactured: no
    // region grants pressure, and the one Spire on the map is somebody else's.
    for (const row of CHORD_THE_THREE.regions) {
      assert.equal(row.pressureBonus, undefined, '§3, §5: depth is bought by certificate');
    }
    assert.ok(
      CHORD_THE_THREE.beats.every((beat) => beat.kind !== 'ground'),
      'nothing sows a grant at a tick either'
    );
  });
});

describe('the tide, run out', () => {
  it('runs its twelve minutes when nobody moves, and enters the gaps', () => {
    // The mission that cannot be lost, lost: four hulls at the foot for twelve
    // minutes. §8's Neither reading, the three unmet rows beneath it, and both
    // emitters entered as gaps — the house sounded and nobody was there to
    // hear it.
    const run = runOut();
    assert.equal(run.resolvedAtTick, T(12), '§9: the tide ends at 12:00 and not before');
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: neither row met');
    for (const row of run.objectives) {
      assert.notEqual(row.status, ObjectiveStatus.Met, `${row.id}: nothing was done`);
    }
    assert.match(run.epilogue, /^Twelve minutes in the First/, '§8: the Neither reading');
    assert.match(run.epilogue, /The case was not read this season/, '§8: the room’s own reading');
    assert.match(run.epilogue, /The escort was heard in the chord/, '§8: the hush’s');
    assert.match(run.epilogue, /The Order keeps no gap\./, '§8: the attend line');
    assert.match(run.epilogue, /The wrights say it sounded/, '§8: the Chord’s gap');
    assert.match(run.epilogue, /so nothing is entered/, '§8: the axis’s gap');
    // §8's failure that is not here: nothing crushes, nothing shoots, nothing
    // breaks. Every hull is where it was seated, at full hull, twelve minutes on.
    assert.equal(run.last.units.length, 4, 'nothing can be lost in this water');
    for (const unit of run.last.units) {
      assert.equal(unit.hp, unit.maxHp, 'crush is 0 everywhere, and there is nothing to shoot');
    }
    // Six lines on the clock, and the tally's line never fires: she never went.
    assert.equal(run.lines.length, 6, '§13: seven on the clock, of which six are said');
    assert.ok(
      !run.lines.some((line) => line.text.includes('The Choirmaster is in the room')),
      '§9: the conditional beat is keyed on a thing that did not happen'
    );
  });

  it('stops a tender that has lost its ears, wherever it happens to be', () => {
    // §4's second movement, server-side: `escortRadiusM` is 600 m, measured
    // horizontally, and the tender's orders are cleared every pass no escort is
    // inside it. A hull that does not move without ears is the whole reason the
    // escort ends up at the mouth of the room without ever being told to stand
    // there.
    const seat = byTag('the-choirmaster');
    const samples: { tick: number; x: number; escorted: number }[] = [];
    play((own, match, crew) => {
      // West, out of hearing, and away from the errand: the ears leave.
      for (const id of [crew.voice, crew.first, crew.second]) {
        match.orderMove(PLAYER, id, 200, 200);
      }
      // Re-issued every pass, so the tender is never merely out of orders: it
      // is being told to go somewhere and is being held. East along the foot,
      // which is open water at the party's own depth — the hold is what stops
      // it, and not the roof.
      match.orderMove(PLAYER, crew.tender, ALONG_THE_FOOT.x, ALONG_THE_FOOT.y);
      const tender = own.units.find((unit) => unit.id === crew.tender)!;
      const nearest = Math.min(
        ...own.units
          .filter((unit) => unit.id !== crew.tender)
          .map((unit) => Math.hypot(unit.x - tender.x, unit.y - tender.y))
      );
      samples.push({ tick: own.tick, x: tender.x, escorted: nearest });
    }, T(3));
    const held = samples.filter((s) => s.escorted > CHORD_THE_THREE.escortRadiusM);
    assert.ok(held.length > 0, 'the escort never actually left');
    const first = held[0]!;
    const last = held[held.length - 1]!;
    assert.ok(
      Math.abs(last.x - first.x) < 1,
      `the tender travelled ${(last.x - first.x).toFixed(0)} m with nothing inside 600 m of it`
    );
    assert.ok(last.x < ALONG_THE_FOOT.x - 500, 'and it never reached where it was ordered');
    assert.ok(last.x > seat.x - 1, 'nor was it carried backwards');
    assert.ok(
      TERRAIN.admits(ALONG_THE_FOOT.x, ALONG_THE_FOOT.y, seat.depthM),
      'the errand was in open water at the party’s own depth, so the ground is not the answer'
    );
  });

  it('reads the case, keeps the hush, and still ends at twelve minutes', () => {
    // The tide §9 brackets: down at 02:10, into the chord by 03:30, the
    // Choirmaster in the room between 04:00 and 05:00, one Corvette in the
    // hall's south half where the axis is audible, and the other two at the
    // mouth of the room inside 600 m of her.
    //
    // Both terminal rows are met inside the first five minutes, which is
    // exactly what `runsItsLength` is here for: without it the court's rule
    // would close a twelve-minute mission at four and a half and take the
    // Chord, the axis and the reading with it (§9, §13).
    const run = runOut((own, match, crew) => {
      const all = [crew.tender, crew.voice, crew.first, crew.second];
      // §12: "You dive when I dive and nobody enters the chord above
      // twenty-seven." The dive is not decoration — the approach is roofed at
      // 2,600 and `Terrain.admits` refuses a hull at the party's own 2,300 m,
      // so a party that crossed the foot without diving would arrive at a wall.
      if (own.tick === T(2)) for (const id of all) match.orderDepth(PLAYER, id, 2900);
      if (own.tick === T(2, 20)) {
        for (const id of all) match.orderMove(PLAYER, id, IN_THE_APPROACH.x, IN_THE_APPROACH.y);
      }
      if (own.tick === T(3, 30)) {
        for (const id of all) match.orderMove(PLAYER, id, THE_CHORD.x, THE_CHORD.y);
      }
      if (own.tick === T(4, 30)) {
        match.orderMove(PLAYER, crew.tender, THE_ROOM.x, THE_ROOM.y);
        match.orderMove(PLAYER, crew.voice, HALL_MOUTH.x, HALL_MOUTH.y);
        match.orderMove(PLAYER, crew.first, HALL_MOUTH.x, HALL_MOUTH.y);
        match.orderMove(PLAYER, crew.second, HALL_SOUTH.x, HALL_SOUTH.y);
      }
      // The escort goes silent, and 28 and 55 become 5.3 and 7.6. The
      // Choirmaster does not, and is in breach of nothing.
      if (own.tick === T(5, 30)) {
        for (const id of [crew.voice, crew.first, crew.second]) {
          match.setSilentRunning(PLAYER, id, true);
        }
      }
    });
    assert.equal(run.outcome, MissionOutcome.Complete, '§8: Read, and kept');
    assert.equal(run.resolvedAtTick, T(12), '§9, §13: the tide runs its length');
    for (const row of run.objectives) {
      assert.equal(row.status, ObjectiveStatus.Met, `${row.id}: met at the close`);
    }
    assert.deepEqual(run.counters.get('the-house-hears'), { done: 2, of: 2 }, '§8: both entered');
    assert.match(run.epilogue, /^The case is read and the house was quiet for it\./, '§8');
    assert.match(run.epilogue, /The season's case was read/, '§8: the room’s met reading');
    assert.match(run.epilogue, /heard nothing else of the party/, '§8: the hush’s');
    assert.match(run.epilogue, /both are entered as times/, '§8: the attend line');
    assert.match(run.epilogue, /The Chord was heard, unstruck/, '§8: the Chord entered');
    assert.match(run.epilogue, /The axis was heard at the eighth minute/, '§8: the axis entered');
    // The Choirmaster's own hull sits at 55 beside a ceiling of 8 and breaches
    // nothing: `quiet` reads the peak over the named role and never
    // `own.peakSig` (§8, `predicates.ts`). That is not a loophole; it is the
    // objective — the house is entitled to hear the Choirmaster.
    const tender = run.last.units.find((unit) => !unit.silentRunning)!;
    assert.ok(tender.sig > SILENT_RUNNING.SIG_MAX, '§8: she is the one thing the house may hear');
    assert.equal(run.last.units.filter((unit) => unit.silentRunning).length, 3, '§4: three ears');
    for (const unit of run.last.units.filter((u) => u.silentRunning)) {
      assert.ok(unit.sig <= SILENT_RUNNING.SIG_MAX, '§4: the escort is under the eight');
    }
    // §12's eighth line, fired by the tally rather than by the clock, and once.
    const tally = run.lines.filter((line) =>
      line.text.startsWith('The Choirmaster is in the room')
    );
    assert.equal(tally.length, 1, '§9: once, on the first tick she is inside, and nothing else');
    assert.ok(
      tally[0]!.tick < T(6),
      '§9: inside the first six minutes for a party that went straight'
    );
    assert.equal(
      run.lines.length,
      7,
      '§13: seven lines heard — six on the clock and one on a tally'
    );
  });
});
