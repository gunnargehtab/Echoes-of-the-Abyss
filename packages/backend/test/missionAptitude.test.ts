/**
 * The Second Chord 1, running — docs/mission-aptitude.md, against a live match.
 *
 * `missions.test.ts` reads the literal and holds every mission to the format's
 * own rules; this file holds *this* mission to its document. Four claims are
 * worth the simulation, and they are the mission:
 *
 * - **§4's table is the model's, not the document's.** Every distance the
 *   briefing quotes — 1,414 on the bow, 734 on the beam, 335 astern, and the
 *   sounding's 2,726 / 1,414 / 646 — is re-derived here from `detectionRatio`
 *   rather than copied. If a tuning constant moves, this file says so before a
 *   player finds out that Vrey's two numbers are wrong.
 * - **A party that aims six voices takes six voices**, and the chord closes on
 *   its own terms rather than on the clock (§6, §8).
 * - **Silent Running loses the sounding** (§4). The button is present, unfenced
 *   and never struck, and this is the arithmetic arriving as a rule: a hull
 *   that runs silent to take a sounding quietly does not take it.
 * - **The gate breathes on a fixed metronome** (§9, §11): 400 m at the centre
 *   once every two minutes and 2,400 m once every two, with the openings on
 *   §9's own list and no variation anywhere in the sixteen minutes.
 *
 * Two drives, memoised. Nothing in either is chasing the player, which is the
 * mission.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DIRECTIONAL_SIGNATURE,
  MissionOutcome,
  PROPAGATION_FACTOR,
  Biome,
  ResolutionTier,
  SIM,
  detectionRatio,
  tierFromRatio,
  type EchoSnapshot,
  type MissionView,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { CHORD_APTITUDE, type MissionLine } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = CHORD_APTITUDE.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** §11 — crystal country everywhere, and the Seam. */
const PF_FIELDS = PROPAGATION_FACTOR[Biome.ResonanceField];
const PF_SEAM = PROPAGATION_FACTOR[Biome.AbyssalTrench];
/** §3, §5 — the survey's Cruiser, and the listener every distance is quoted against. */
const LISTENER_HYD = 65;

/**
 * The range at which a listener first reaches `tier` on an emitter of this
 * loudness, in this water — §4's table, computed rather than remembered.
 *
 * Bisected over the shipped `detectionRatio`, so it follows the model wherever
 * the model goes. A reference implementation of the *question* §4 asks, which
 * is the same argument `echo-parity.test.ts` makes about §8: the answer stays
 * meaningful when the tuning legitimately changes, because it changes with it.
 */
function rangeForTier(sig: number, pf: number, hyd: number, tier: ResolutionTier): number {
  let inside = 0;
  let outside = 20000;
  for (let i = 0; i < 60; i++) {
    const mid = (inside + outside) / 2;
    if (tierFromRatio(detectionRatio(sig, pf, mid, hyd)) >= tier) inside = mid;
    else outside = mid;
  }
  return inside;
}

/** Classification is the tier §5's tolerance is written against. */
const classifiedAt = (sig: number, pf = PF_FIELDS): number =>
  rangeForTier(sig, pf, LISTENER_HYD, ResolutionTier.Classification);

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  /** The objective readings, under the outcome's own line. */
  lines: string[];
  resolvedAtTick: number;
  /** Soundings completed, read off the objective panel's own counter. */
  sounded: number;
  survivors: number;
  /** Every line spoken during the run, in order — the say channel, drained. */
  spoken: MissionLine[];
}

/**
 * Drive the tuning party for as long as it takes, or until the tuning closes.
 *
 * Hulls are addressed by their authored start position rather than by index
 * into the snapshot: the party is six hulls that begin a few metres apart, and
 * matching them by where they were seated is the one mapping that cannot go
 * quietly wrong if the spawn order ever changes.
 */
function play(drive: (match: Match, tick: number, byTag: Map<string, number>) => void): Run {
  const map = missionMapById(CHORD_APTITUDE.mapId)!;
  const match = new Match(map, { mission: CHORD_APTITUDE, fauna: false, seed: 11 });
  const party = CHORD_APTITUDE.parties.find((p) => p.slot === PLAYER)!;
  const byTag = new Map<string, number>();
  let survivors = 0;
  // The resolution carries statuses and no counters (`viewObjectives`), so the
  // count comes off the panel the player was actually looking at. Drained
  // every tick and kept, because the view is an edge rather than a state.
  let lastView: MissionView | null = null;
  const spoken: MissionLine[] = [];

  for (let tick = 0; tick <= T(16, 30); tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER) as EchoSnapshot | undefined;
    if (own !== undefined) {
      survivors = own.units.length;
      if (byTag.size === 0) {
        for (const unit of party.units) {
          const seated = own.units.find(
            (u) => Math.hypot(u.x - unit.x, u.y - unit.y) < 1 && !byTag.has(unit.tag)
          );
          if (seated !== undefined) byTag.set(unit.tag, seated.id);
        }
      }
    }
    if (byTag.size === party.units.length) drive(match, tick, byTag);
    lastView = match.takeMissionView() ?? lastView;
    spoken.push(...match.takeMissionLines());
    if (match.missionOver !== null) break;
  }

  const over = match.missionOver;
  assert.ok(over !== null, 'the tuning never closed');
  const chord = lastView?.objectives.find((o) => o.id === 'the-chord');
  const [reading, ...rest] = over.epilogue.split('\n');
  return {
    outcome: over.outcome,
    epilogue: reading ?? '',
    lines: rest.filter((line) => line.trim().length > 0),
    resolvedAtTick: match.world.tick,
    sounded: chord?.progress?.done ?? 0,
    survivors,
    spoken,
  };
}

/** Send every hull to the voice the literal assigns it, once, on the first tick. */
function aimEverybody(match: Match, byTag: Map<string, number>): void {
  for (const sounding of CHORD_APTITUDE.soundings ?? []) {
    const eid = byTag.get(sounding.tag);
    if (eid !== undefined) match.orderMove(PLAYER, eid, sounding.x, sounding.y);
  }
}

let tunedRun: Run | null = null;
function tuned(): Run {
  let ordered = false;
  tunedRun ??= play((match, _tick, byTag) => {
    if (ordered) return;
    ordered = true;
    aimEverybody(match, byTag);
  });
  return tunedRun;
}

let silentRun: Run | null = null;
function silentThroughout(): Run {
  // The same drive, with the button the genre teaches. §4 prices it out in
  // arithmetic; the runtime prices it out as a rule, and this is that rule.
  let ordered = false;
  silentRun ??= play((match, _tick, byTag) => {
    if (ordered) return;
    ordered = true;
    aimEverybody(match, byTag);
    for (const eid of byTag.values()) match.setSilentRunning(PLAYER, eid, true);
  });
  return silentRun;
}

describe('facing, as docs/mission-aptitude.md §4 states it in numbers', () => {
  it('is worth a factor of four in distance, and the two numbers the briefing quotes', () => {
    // §4's first table, against the survey's best ears in PF 0.70 water. The
    // 28 / 9.8 / 2.8 are one corvette at cruise seen from three places — the
    // quartered circle's ×1.00, ×0.35 and ×0.10 applied to the same hull.
    const cruise = 28;
    const bow = classifiedAt(cruise * DIRECTIONAL_SIGNATURE.CONE);
    const beam = classifiedAt(cruise * DIRECTIONAL_SIGNATURE.FLANK);
    const wake = classifiedAt(cruise * DIRECTIONAL_SIGNATURE.WAKE);

    assert.equal(Math.round(bow), 1414, '§4: 1,414 m bow-on');
    assert.equal(Math.round(beam), 734, '§4: 734 m beam-on');
    assert.equal(Math.round(wake), 335, '§4: 335 m stern-on');
    // "The player has one lever and it is worth 1,079 metres."
    assert.equal(Math.round(bow - wake), 1079, '§4: the lever');
    // Vrey's two numbers, rounded the way a Chapter-Master rounds them (§12).
    assert.ok(Math.abs(bow - 1400) < 25, '§12: fourteen hundred metres on the bow');
    assert.ok(Math.abs(beam - 750) < 25, '§12: seven-fifty on the beam');
  });

  it("lands a sounding's three sectors on numbers the player already knows", () => {
    // §4: 80 × 0.35 = 28.0, which is a corvette at cruise; 80 × 0.10 = 8.0,
    // which is a hull running silent. The mission teaches one rule and then
    // reuses its own arithmetic rather than introducing a second.
    const sig = CHORD_APTITUDE.soundings![0]!.sig;
    assert.equal(sig, 80, "§4: the Sounding Spire's active figure, borrowed by hand");
    assert.equal(sig * DIRECTIONAL_SIGNATURE.FLANK, 28);
    assert.equal(sig * DIRECTIONAL_SIGNATURE.WAKE, 8);

    assert.equal(Math.round(classifiedAt(sig * DIRECTIONAL_SIGNATURE.CONE)), 2726, '§4: the cone');
    assert.equal(
      Math.round(classifiedAt(sig * DIRECTIONAL_SIGNATURE.FLANK)),
      1414,
      '§4: the flank'
    );
    assert.equal(Math.round(classifiedAt(sig * DIRECTIONAL_SIGNATURE.WAKE)), 646, '§4: the wake');
  });

  it('makes a cruising Knight pointed away quieter than a silent one pointed at you', () => {
    // §4's closing argument, and the reason the Order does not run silent: the
    // Silent Running band tops out at 8, which is bow-on at 646 m, and a hull
    // at cruise showing its wake is 335. Three hundred and eleven metres, with
    // its weapons live and at full speed.
    const silentBowOn = classifiedAt(8 * DIRECTIONAL_SIGNATURE.CONE);
    const cruisingSternOn = classifiedAt(28 * DIRECTIONAL_SIGNATURE.WAKE);
    assert.ok(cruisingSternOn < silentBowOn, '§4: the button would be the better trade');
    assert.equal(Math.round(silentBowOn - cruisingSternOn), 311, '§4: by three hundred and eleven');
  });

  it('gives the party its working capital: it hears the survey long before the survey hears it', () => {
    // §7 — the barge cores at 55 from the middle of the map, and the party's
    // Cruiser holds it at contact from 3,824 m and at classification from
    // 2,157. That margin against §4's 1,414 bow-on is the whole of what the
    // mission is spent out of.
    const coring = CHORD_APTITUDE.parties
      .flatMap((party) => party.emitters ?? [])
      .find((emitter) => emitter.tag === 'the-coring');
    assert.ok(coring !== undefined, 'the coring is not authored');
    assert.equal(coring.sig, 55, '§5: SIG 55 sustained');
    assert.equal(
      Math.round(rangeForTier(coring.sig, PF_FIELDS, LISTENER_HYD, ResolutionTier.Contact)),
      3824,
      '§7: contact from 3,824 m'
    );
    assert.equal(Math.round(classifiedAt(coring.sig)), 2157, '§7: classification from 2,157 m');
    assert.ok(
      classifiedAt(coring.sig) - classifiedAt(28 * DIRECTIONAL_SIGNATURE.CONE) > 700,
      '§7: 743 m bow-on, and the mission has no working capital without it'
    );
  });

  it('makes the ground a term at the Seam, exactly as Treble is written', () => {
    // §6, Treble: "Aiming it south puts the cone into PF 1.60 water, where a
    // sounding's wake alone still classifies at 1,084 m."
    const wakeInTheSeam = classifiedAt(80 * DIRECTIONAL_SIGNATURE.WAKE, PF_SEAM);
    assert.equal(Math.round(wakeInTheSeam), 1084, '§6: the ground is a term too');
    assert.ok(wakeInTheSeam > classifiedAt(80 * DIRECTIONAL_SIGNATURE.WAKE));
  });
});

describe('the six voices, as docs/mission-aptitude.md §6 tables them', () => {
  const soundings = CHORD_APTITUDE.soundings ?? [];
  /** §11 — the survey, stationary all mission, and what every voice is measured to. */
  const survey = { x: 1600, y: 2000 };

  it('authors six, each at 400 m, twenty seconds and SIG 80', () => {
    assert.equal(soundings.length, 6, '§6: a chord of seven is the house and six voices');
    for (const sounding of soundings) {
      assert.equal(sounding.radiusM, 400, `${sounding.id}: §4's radius`);
      assert.equal(sounding.holdTicks, 20 * SIM.TICK_HZ, `${sounding.id}: §4's twenty seconds`);
      assert.equal(sounding.sig, 80, `${sounding.id}: §4's SIG 80`);
    }
  });

  it('stands each voice where §6 puts it, and that far from the survey', () => {
    // The table's third column, which is the only number in it a reader cannot
    // check by eye — and the one every route decision is made against.
    const expected: Record<string, number> = {
      descant: 2750,
      tenor: 2130,
      treble: 2280,
      alto: 1480,
      bass: 1140,
      'the-drone': 1120,
    };
    for (const sounding of soundings) {
      const toSurvey = Math.hypot(sounding.x - survey.x, sounding.y - survey.y);
      const stated = expected[sounding.id];
      assert.ok(stated !== undefined, `${sounding.id}: not a voice §6 names`);
      assert.ok(
        Math.abs(toSurvey - stated) <= 10,
        `${sounding.id}: ${toSurvey.toFixed(0)} m from the survey, against §6's ${stated}`
      );
    }
  });

  it('gives each voice a hull, and asks the Cruiser only for the one it is nearest', () => {
    // §6's arithmetic of six: five working hulls and six voices, so the Voice
    // sounds too — and it moves at 45 m/s against a corvette's 85, so using it
    // costs more than it saves except where it already is.
    const party = CHORD_APTITUDE.parties.find((p) => p.slot === PLAYER)!;
    const carriers = soundings.map((sounding) => sounding.tag);
    assert.equal(new Set(carriers).size, 6, '§6: one hull cannot hold two tones at once');
    const cruiser = party.units.find((unit) => unit.tag === 'the-voice')!;
    const descant = soundings.find((sounding) => sounding.id === 'descant')!;
    assert.equal(descant.tag, 'the-voice', '§6: whichever voice it is already nearest');
    const others = soundings.filter((sounding) => sounding.id !== 'descant');
    for (const sounding of others) {
      assert.ok(
        Math.hypot(sounding.x - cruiser.x, sounding.y - cruiser.y) >
          Math.hypot(descant.x - cruiser.x, descant.y - cruiser.y),
        `${sounding.id} is nearer the Voice than Descant is`
      );
    }
  });
});

describe('the gate, breathing — docs/mission-aptitude.md §9 and §11', () => {
  const legs = CHORD_APTITUDE.beats.filter(
    (beat) => beat.kind === 'move' && beat.tag.startsWith('picket-')
  );

  it('orders both hulls together, once a minute, for the whole tuning', () => {
    const ticks = [...new Set(legs.map((beat) => beat.atTick))].sort((a, b) => a - b);
    assert.deepEqual(
      ticks,
      Array.from({ length: 16 }, (_, i) => T(i + 1)),
      '§9: the cycle is two minutes and it does not vary'
    );
    for (const tick of ticks) {
      const together = legs.filter((beat) => beat.atTick === tick);
      assert.equal(together.length, 2, `${tick}: the gate is two hulls or it is not a gate`);
    }
  });

  it('walks the two legs in opposite phase, 400 m apart and then 2,400', () => {
    // §11: "Two legs in opposite phase put the picket hulls 400 m apart at the
    // centre once every two minutes and 2,400 m apart once every two minutes,
    // and the passage west is taken on the second."
    for (let minute = 1; minute <= 16; minute++) {
      const pair = legs.filter((beat) => beat.atTick === T(minute));
      const north = pair.find((beat) => beat.kind === 'move' && beat.tag === 'picket-north')!;
      const south = pair.find((beat) => beat.kind === 'move' && beat.tag === 'picket-south')!;
      assert.ok(north.kind === 'move' && south.kind === 'move');
      assert.equal(north.x, 2500, `${minute}: the legs are on one line`);
      assert.equal(south.x, 2500, `${minute}: the legs are on one line`);
      const apart = south.y - north.y;
      // Odd minutes close the gate, even minutes open it — which is what puts
      // §9's first closing at 01:00 and its first opening at 02:00.
      assert.equal(apart, minute % 2 === 1 ? 400 : 2400, `${minute}: the gate`);
    }
  });

  it("opens on §9's own list, and the last usable one is at 14:00", () => {
    const openings = [];
    for (let minute = 1; minute <= 16; minute++) {
      const north = legs.find(
        (beat) => beat.atTick === T(minute) && beat.kind === 'move' && beat.tag === 'picket-north'
      );
      if (north?.kind === 'move' && north.y === 800) openings.push(minute);
    }
    assert.deepEqual(openings, [2, 4, 6, 8, 10, 12, 14, 16], '§9: the opening and seven more');
  });

  it('is the only moving thing on the schedule', () => {
    // §11: "It is the *only* moving thing in the mission and it moves on a
    // metronome." Every other scheduled beat is somebody speaking; the escort
    // moves once and only off a condition the player caused (§5).
    const moves = CHORD_APTITUDE.beats.filter((beat) => beat.kind === 'move');
    assert.equal(moves.length, legs.length, 'something else on the clock is under way');
    const kinds = new Set(CHORD_APTITUDE.beats.map((beat) => beat.kind));
    assert.deepEqual([...kinds].sort(), ['move', 'resolve', 'say']);
  });
});

describe('the tolerance, as docs/mission-aptitude.md §5 spends it', () => {
  const conditions = CHORD_APTITUDE.conditionalBeats ?? [];
  const tolerances = conditions.filter((beat) => beat.when.kind === 'tolerance');

  it('is thirty seconds at Classification, cumulative, across the party', () => {
    const objective = CHORD_APTITUDE.objectives.find((o) => o.id === 'the-tolerance')!;
    assert.equal(objective.predicate.kind, 'tolerance');
    assert.ok(objective.predicate.kind === 'tolerance');
    assert.equal(objective.predicate.ticks, 30 * SIM.TICK_HZ, '§5: thirty seconds');
    assert.equal(objective.predicate.tier, ResolutionTier.Classification, '§5: Tier 3 is an entry');
    // §5 is emphatic: exhausting it is a partial outcome, not a failure, so it
    // closes nothing and the close stays on the clock where §9 puts it.
    assert.notEqual(objective.terminal, true, '§5: the tolerance is not a fail state');
  });

  it('warns at twenty, ten short of it, and the coring is what goes quiet', () => {
    const warnings = tolerances.filter(
      (beat) => beat.when.kind === 'tolerance' && beat.when.ticks === 20 * SIM.TICK_HZ
    );
    assert.equal(warnings.length, 1, '§5: one warning, and it is the barge');
    const recalls = tolerances.filter(
      (beat) => beat.when.kind === 'tolerance' && beat.when.ticks === 30 * SIM.TICK_HZ
    );
    assert.ok(recalls.length >= 2, '§5: a say, and the escort interposing');
    // §5's own telegraph, measured rather than remembered: ten seconds of a
    // 55-SIG source going silent, and then two hundred and forty of a column.
    assert.equal(
      (30 - 20) * SIM.TICK_HZ,
      10 * SIM.TICK_HZ,
      '§5: ten seconds between the warning and the recall'
    );
    assert.match(warnings[0]!.note, /twenty of thirty/i);
  });

  it('never closes the mission from a condition, whatever the party spends', () => {
    // types.ts, `MissionConditionalBeat`: the effect union is every beat kind
    // except `resolve`, because campaign.md §10's telegraph is measured between
    // two authored ticks and a condition has none. Asserted on the data as
    // well as in the type, because §5 is exactly the mission that would want to.
    for (const beat of conditions) {
      assert.notEqual(beat.kind, 'resolve');
    }
    const resolve = CHORD_APTITUDE.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(16), '§8: the close is on the clock');
    assert.ok(resolve.kind === 'resolve' && resolve.conclusion === true, '§8: a conclusion');
  });

  it("fires Kalliso's one line off the player's own first sounding", () => {
    // §12: "once, to nobody in particular — on the first sounding". A sentence
    // about the player's own act, and `sound` is the predicate that states it.
    const kalliso = conditions.find((beat) => beat.when.kind === 'sound');
    assert.ok(kalliso !== undefined, "§12: Kalliso's line is not authored");
    assert.ok(kalliso.when.kind === 'sound' && kalliso.when.count === 1);
    assert.ok(kalliso.kind === 'say' && /same tone/.test(kalliso.text));
  });
});

describe("§8's four readings, over a party that took the six", () => {
  it('sounds all six and closes on its own terms rather than on the clock', () => {
    // §6: nothing scripts which voice is taken when, and §8: "A party that
    // finishes early and turns for the house ends the mission early and is
    // read on what it has, which is a cadence and not a surrender."
    const run = tuned();
    assert.equal(run.sounded, 6, `only ${run.sounded} voices were entered`);
    assert.equal(run.survivors, 6, 'the party did not come home whole');
    assert.ok(run.resolvedAtTick < T(16), `the chord closed at ${run.resolvedAtTick} ticks`);
  });

  it('reads "In tune", which is the only compliment the Order gives', () => {
    const run = tuned();
    assert.equal(run.outcome, MissionOutcome.Complete);
    assert.match(run.epilogue, /^In tune\./);
    // §12: one more sentence in every ending but the last.
    assert.match(run.epilogue, /Enter it, and go and be dry\.$/);
  });

  it('assembles the lattice and the log beneath it', () => {
    // The close assembles rather than chooses (§13's standing ask): the
    // lattice's own line for the chord it certified, and the survey's for what
    // it entered or did not.
    //
    // And what it entered is a contact. This drive sends every hull straight
    // at its voice, which is going west *pointing* west — the one manoeuvre §4
    // spends its two numbers forbidding — and Tenor stands 733 m off the north
    // picket's outer leg, so a corvette bow-on to it is classified from the
    // approach and tracked through the sounding. Thirty seconds of that is
    // §5's tolerance spent, and the log says so. Until #323 this line read
    // "heard weather" for the same drive, because the survey's ears never
    // reached `EchoSnapshot.exposure` in a live match; the party was as loud
    // then as now, and nobody was resolving for the survey.
    const run = tuned();
    assert.equal(run.lines.length, 3, 'the close read fewer lines than it authors');
    assert.match(run.lines[0]!, /The chord is whole/, '§8 row 1, in the chord\u2019s own words');
    assert.match(run.lines[1]!, /certified against what was entered/, '§8: the lattice');
    assert.match(run.lines[2]!, /filed a contact/, '§5: a party pointed west is entered');
  });

  it('spends the tolerance in the water, not only on paper — §5 in a live match (#323)', () => {
    // The three beats §5 hangs on the tally, fired by the survey's own ears
    // resolving the party through the shipped Echo pass rather than by a
    // synthetic snapshot: Bramm stops the string at twenty, files at thirty,
    // and Vrey recalls the party on the same pass. Ten seconds apart, in
    // this order, once each.
    const run = tuned();
    const bramm = run.spoken.filter((line) => /Surveyor Ade Bramm/.test(line.speaker));
    const warning = bramm.find((line) => /Stop the string/.test(line.text));
    const filing = bramm.find((line) => /Amend the log/.test(line.text));
    const recall = run.spoken.find((line) => /They have entered us/.test(line.text));
    assert.ok(warning !== undefined, '§5: the survey never noticed twenty seconds of Knights');
    assert.ok(filing !== undefined, '§5: thirty seconds and no contact was filed');
    assert.ok(recall !== undefined, '§5: the Third never recalled an entered party');
    assert.equal(filing.tick - warning.tick, 10 * SIM.TICK_HZ, '§5: ten seconds apart');
    assert.equal(recall.tick, filing.tick, '§5: the recall rides the filing');
    assert.equal(bramm.filter((line) => /Stop the string/.test(line.text)).length, 1, 'once');
    // Spent early: this drive is inside the picket's ears from the approach,
    // so the tally is out before the second minute — and long before the
    // scheduled fault at 06:00 that a quieter party would have heard instead.
    assert.ok(filing.tick < T(2), `filed at tick ${filing.tick}, later than the approach`);
  });

  it('withholds the last sentence from the taboo, and prices nothing against it', () => {
    // §8's fourth row, read off the literal rather than by killing a hull: a
    // reading that priced a lost hull against a certified lattice would be the
    // Consortium's register, not this one. Vrey declines to enter it.
    const lost = CHORD_APTITUDE.epilogue[MissionOutcome.Lost];
    assert.match(lost, /Say the name to the house yourself/);
    assert.doesNotMatch(lost, /Enter it, and go and be dry/, '§12: every ending but the last');
    assert.doesNotMatch(lost, /certified/, '§8: nothing is priced against a hull');
    // The keystone is what routes a lost hull to that reading whatever else
    // came home (types.ts, `keystone`).
    const party = CHORD_APTITUDE.objectives.find((o) => o.id === 'the-party')!;
    assert.equal(party.keystone, true);
    assert.equal(party.predicate.kind, 'survive');
  });

  it('certifies against four voices and its Drone, and says so both ways', () => {
    // §8's second and third rows are one objective's two readings, because the
    // outcome ladder has three rungs and the Results table has four.
    const lattice = CHORD_APTITUDE.objectives.find((o) => o.id === 'the-lattice')!;
    assert.ok(lattice.predicate.kind === 'sound' && lattice.predicate.count === 4);
    assert.match(lattice.reading!.met, /certified against what was entered/);
    assert.match(lattice.reading!.unmet, /nothing to measure them from/);
    // §8's second row — "a rest where a voice was" — is the *chord's* unmet
    // line, because a rest is a fact about the six and not about the four.
    const chord = CHORD_APTITUDE.objectives.find((o) => o.id === 'the-chord')!;
    assert.match(chord.reading!.unmet, /A rest is written down/);
  });
});

describe('Silent Running, priced out rather than fenced off — §3, §4', () => {
  it('is present and never struck', () => {
    // §3: the button is not removed and is not diegetically struck. What the
    // mission locks is the ping — the one emission the Order owns that has no
    // bow — and the build pages, because a tuning is maintenance.
    const locked = CHORD_APTITUDE.locks.map((lock) => lock.ability);
    assert.ok(!locked.includes('weapons'), '§8: combat here is elective');
    assert.deepEqual(locked.sort(), ['activeSonar', 'construction']);
    assert.equal(CHORD_APTITUDE.arrayTag, undefined, '§3: no silence order and no array to lend');
  });

  it('loses the sounding it was used to take', () => {
    // The runtime's rule, and §4's arithmetic arriving as one: a hull running
    // silent is doing none of the Spire's work, so the same drive that takes
    // six voices takes none.
    const run = silentThroughout();
    assert.equal(run.sounded, 0, 'a silent party entered a voice');
    assert.equal(run.survivors, 6, 'nothing in this mission hunts');
    assert.equal(run.resolvedAtTick, T(16), '§8: nothing closed it early');
    assert.equal(run.outcome, MissionOutcome.Partial, '§8: not certified is still an outcome');
  });
});
