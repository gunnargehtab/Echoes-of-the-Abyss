/**
 * The spent roster — docs/campaign.md §7 row 3, "Every unit lost in this
 * mission is gone for the rest of the campaign", built for #380 and carried
 * by docs/mission-nineteen.md §13.
 *
 * Three things are held here, and the third is the mission:
 *
 * - **The bound at the door** (`validateSpent`). The record lives in the
 *   client's storage, so the room can never learn what a client *failed* to
 *   present; what it can do is refuse a shape the record never writes and
 *   keep only the names this mission could act on. That asymmetry is stated
 *   in `roster.ts` and tested rather than trusted here.
 * - **The derived definition** (`fieldDefinition`). A mission fielded short
 *   is a new object and the authored literal is untouched. The record moves
 *   hulls and never a rung (#612): no row is removed, no `terminal` or
 *   `keystone` flag changes, and the one count that is re-read is a `survive`
 *   count, which is a roll call of the party that sailed.
 * - **The acceptance, played.** A hull entered at the Rest is named at
 *   Nineteen's close, and *Conclave* seats five under that name; a hull lost
 *   on a tide that does not spend is named nowhere. Driven against the real
 *   `Match` rather than the runtime alone, because "the hull is not there" is
 *   a claim about the world and the seating order, not about a filter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MissionOutcome, SIM, type EchoSnapshot } from '@echoes/shared';
import { Health } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import {
  CHORD_APTITUDE,
  CHORD_CONCLAVE,
  CHORD_NINETEEN,
  CHORD_RIM_DEPOSITS,
  CHORD_SECOND_CHORD,
  MISSIONS,
  fieldDefinition,
  validateSpent,
  type MissionDefinition,
  type MissionUnit,
} from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** The hulls a mission seats for the player. */
function playerUnits(mission: MissionDefinition): readonly MissionUnit[] {
  return mission.parties.find((p) => p.slot === mission.playerSlot)!.units;
}

/** Every cadre id a mission's player party authors. */
function cadreOf(mission: MissionDefinition): string[] {
  return playerUnits(mission)
    .map((unit) => unit.cadre)
    .filter((cadre): cadre is string => cadre !== undefined);
}

interface Run {
  outcome: MissionOutcome;
  spent: readonly string[];
  /** The player's hull count on the first snapshot — what was actually seated. */
  seated: number;
  /** The seated hulls' positions, so an absence can be named. */
  positions: readonly { x: number; y: number }[];
  /** The close as the player reads it — epilogue, then the objective readings. */
  epilogue: string;
}

/**
 * Play a mission with no orders, killing one authored hull at the first
 * snapshot, until it closes.
 *
 * The hull is found by its authored seat rather than by snapshot index, for
 * `missionAptitude.test.ts`' reason: it is the one mapping that cannot go
 * quietly wrong if the spawn order ever changes. Killed by writing its hull
 * points, which is what every weapon in the game does last; `reap` removes it
 * before the Echo tick the mission runs on, so the runtime sees it gone on the
 * same pass. The cap is the header's own long end plus a margin, and a mission
 * that has not closed by then fails the test rather than the process.
 */
function play(
  mission: MissionDefinition,
  kill: string | null,
  spent: ReadonlySet<string> = new Set()
): Run {
  const match = new Match(missionMapById(mission.mapId)!, {
    mission,
    fauna: false,
    seed: 4,
    spent,
  });
  const target = kill === null ? null : playerUnits(mission).find((u) => u.tag === kill)!;
  let seated = -1;
  let positions: { x: number; y: number }[] = [];
  let killed = kill === null;
  const cap = (mission.lengthBandS[1] + 120) * SIM.TICK_HZ;
  for (let tick = 0; tick < cap && match.missionOver === null; tick++) {
    const own = match.update(STEP_MS)?.get(mission.playerSlot) as EchoSnapshot | undefined;
    if (own === undefined) continue;
    if (seated < 0) {
      seated = own.units.length;
      positions = own.units.map((u) => ({ x: u.x, y: u.y }));
    }
    if (!killed && target !== null) {
      const hull = own.units.find((u) => Math.hypot(u.x - target.x, u.y - target.y) < 1);
      if (hull !== undefined) {
        Health.hp[hull.id] = 0;
        killed = true;
      }
    }
  }
  const over = match.missionOver;
  assert.ok(over !== null, `${mission.id} never closed`);
  assert.ok(killed, `${mission.id}: "${kill}" was never found to kill`);
  return { outcome: over.outcome, spent: over.spent, seated, positions, epilogue: over.epilogue };
}

describe('validateSpent — the bound the room puts on a client’s record', () => {
  it('refuses a set that is not an array', () => {
    // The record writes an array and nothing else; anything else on the wire
    // is a client the room should not be guessing for.
    assert.equal(validateSpent(undefined, CHORD_CONCLAVE), null);
    assert.equal(validateSpent(null, CHORD_CONCLAVE), null);
    assert.equal(validateSpent('third', CHORD_CONCLAVE), null);
    assert.equal(validateSpent({ third: true }, CHORD_CONCLAVE), null);
  });

  it('refuses the whole set on one entry that is not a string', () => {
    // Whole, not entry-by-entry: a set with a number in it was not written by
    // `progression/store.ts`, so nothing else in it is trusted either.
    assert.equal(validateSpent(['voice', 7], CHORD_CONCLAVE), null);
    assert.equal(validateSpent([null], CHORD_CONCLAVE), null);
    assert.equal(validateSpent([['voice']], CHORD_CONCLAVE), null);
  });

  it('accepts the empty array as nothing spent', () => {
    assert.deepEqual([...validateSpent([], CHORD_CONCLAVE)!], []);
  });

  it('keeps every id this mission fields and drops nothing that is valid', () => {
    const all = cadreOf(CHORD_CONCLAVE);
    assert.equal(all.length, 6, 'Conclave seats the six');
    assert.deepEqual([...validateSpent(all, CHORD_CONCLAVE)!].sort(), [...all].sort());
  });

  it('drops an id no player-party hull of this mission authors, rather than refusing', () => {
    // Not a tamper, and the normal case: the client presents the campaign's
    // whole set to every mission of the campaign, and The Three fields three
    // of Nineteen's six. A name a mission cannot act on is a name it has no
    // reason to keep — and a name nobody authors filters nothing either way.
    const kept = validateSpent(['third', 'voice', 'nobody'], CHORD_SECOND_CHORD)!;
    assert.deepEqual([...kept], ['voice']);
  });

  it('gives a mission that fields none of the presented ids an empty set', () => {
    // Aptitude names no cadre at all — mission 1 has nothing to have spent —
    // and a Knights player reaching it with a full set is still seated whole.
    assert.deepEqual([...validateSpent(cadreOf(CHORD_NINETEEN), CHORD_APTITUDE)!], []);
  });

  it('never invents an id, whatever it is handed', () => {
    for (const mission of MISSIONS) {
      const fielded = new Set(cadreOf(mission));
      const kept = validateSpent(['voice', 'first', 'x', ''], mission);
      assert.ok(kept !== null, `${mission.id}: a well-formed array was refused`);
      for (const id of kept) assert.ok(fielded.has(id), `${mission.id}: kept "${id}"`);
    }
  });
});

describe('fieldDefinition — the mission as it is fielded once the record has spoken', () => {
  it('returns the same object when nothing is spent', () => {
    // Identity, not equality: every caller that compares a definition to a
    // catalogue entry keeps meaning what it meant.
    assert.equal(fieldDefinition(CHORD_CONCLAVE, new Set()), CHORD_CONCLAVE);
    // And when the set names nobody this mission seats — the Three fields
    // three of the six, and a spent Fifth changes nothing there.
    assert.equal(fieldDefinition(CHORD_CONCLAVE, new Set(['nobody'])), CHORD_CONCLAVE);
  });

  it('seats one fewer under the spent name and touches no scripted party', () => {
    const fielded = fieldDefinition(CHORD_CONCLAVE, new Set(['voice']));
    assert.notEqual(fielded, CHORD_CONCLAVE);
    const party = playerUnits(fielded);
    assert.equal(party.length, playerUnits(CHORD_CONCLAVE).length - 1);
    assert.ok(
      party.every((u) => u.tag !== 'the-voice'),
      'the Voice is not seated'
    );
    assert.ok(party.every((u) => u.cadre !== 'voice'));
    // The scripted parties are the very same objects, not copies: a spent set
    // names the player's own hulls and the opposition is not theirs to lose.
    for (const party of CHORD_CONCLAVE.parties) {
      if (party.slot === CHORD_CONCLAVE.playerSlot) continue;
      assert.ok(fielded.parties.includes(party), `slot ${party.slot} was rebuilt`);
    }
    // Everything the literal authored that is not a party, a predicate or a
    // conditional beat rides through by reference too.
    assert.equal(fielded.beats, CHORD_CONCLAVE.beats);
    assert.equal(fielded.soundings, CHORD_CONCLAVE.soundings);
    assert.equal(fielded.markers, CHORD_CONCLAVE.markers);
  });

  it('clamps a survive count to what was fielded, and leaves the other roles alone', () => {
    // Rim Deposits: three cutters, `survive cutter count 3`. With the First
    // entered at the Rest, `cutter-a` is not seated and the row asks for the
    // two that came — a count of three over two hulls would read Lost at
    // tick zero on a raid that has lost nobody yet.
    const fielded = fieldDefinition(CHORD_RIM_DEPOSITS, new Set(['first']));
    const cutters = fielded.objectives.find((o) => o.id === 'the-cutters')!;
    assert.deepEqual(cutters.predicate, { kind: 'survive', role: 'cutter', count: 2 });
    // The escort row is untouched — its three all came — and is the authored
    // object rather than a copy.
    const escort = fielded.objectives.find((o) => o.id === 'the-escort')!;
    assert.equal(
      escort,
      CHORD_RIM_DEPOSITS.objectives.find((o) => o.id === 'the-escort')
    );
    // The keystone asks two loaded cutters home and always will: an `extract`
    // count is a fact about the water, not a roll call of the party, and the
    // Chord is two carriers because the rim's crystal takes two (#612). It is
    // the authored object rather than a copy, at any spend.
    for (const spent of [['first'], ['first', 'second'], ['first', 'second', 'third']]) {
      const short = fieldDefinition(CHORD_RIM_DEPOSITS, new Set(spent));
      const keystone = short.objectives.find((o) => o.keystone === true)!;
      assert.equal(
        keystone,
        CHORD_RIM_DEPOSITS.objectives.find((o) => o.keystone === true),
        `[${spent.join(',')}] rewrote the keystone`
      );
      assert.deepEqual(keystone.predicate, {
        kind: 'extract',
        role: 'cutter',
        region: 'staging',
        count: 2,
        loaded: true,
      });
    }
  });

  it('leaves a conditional beat’s extract count where the author put it', () => {
    // Rim's "both loads home" announcement fires on two loaded cutters at the
    // Staging. Two of the three cutters spent leaves one — and the beat still
    // asks two, because two loads home is the thing being announced and one
    // load home is not it. The announcement simply never fires, which is the
    // truth about a raid that brought one cutter (#612).
    const fielded = fieldDefinition(CHORD_RIM_DEPOSITS, new Set(['first', 'second']));
    const both = fielded.conditionalBeats!.filter(
      (b) => b.when.kind === 'extract' && b.when.role === 'cutter'
    );
    assert.ok(both.length >= 2, 'the two announcements over the cutters are still there');
    const authored = CHORD_RIM_DEPOSITS.conditionalBeats!.filter(
      (b) => b.when.kind === 'extract' && b.when.role === 'cutter'
    );
    // Identity, not equality: an extract predicate is never rewritten, so the
    // derived definition hands back the authored objects themselves.
    assert.deepEqual(both, authored);
    for (const beat of both) assert.ok(authored.includes(beat), `${beat.kind} was rebuilt`);
  });

  it('keeps an objective whose role has nobody left, at its authored count', () => {
    // The Second Chord's escort is the Voice and the raid's two escort hulls,
    // all three of them named. Spend all three and `the-escort` — "three of
    // the escort answer" — stays on the ladder and reads unmet, because the
    // Order counting three and getting none is the truth and is the sentence
    // its author already wrote. Removing it took a *terminal* rung off the
    // ladder the close is graded against; clamping it to zero would have read
    // met-with-nothing (#612).
    const fielded = fieldDefinition(CHORD_SECOND_CHORD, new Set(['voice', 'fourth', 'fifth']));
    assert.equal(playerUnits(fielded).length, playerUnits(CHORD_SECOND_CHORD).length - 3);
    const escort = fielded.objectives.find((o) => o.id === 'the-escort');
    assert.ok(escort !== undefined, 'a row over an empty role is kept');
    assert.equal(escort.terminal, true, 'and it is still a rung');
    assert.deepEqual(escort.predicate, { kind: 'survive', role: 'escort', count: 3 });
    assert.equal(
      escort,
      CHORD_SECOND_CHORD.objectives.find((o) => o.id === 'the-escort'),
      'and it is the authored object, not a copy'
    );
    // Rows over roles that still have hulls are kept: the tender's, and the
    // carriers', neither of which is named at all.
    assert.ok(
      fielded.objectives.some(
        (o) => o.predicate.kind === 'survive' && o.predicate.role === 'carrier'
      ),
      'the carriers’ row stays'
    );
    assert.ok(
      fielded.objectives.some(
        (o) => o.predicate.kind === 'survive' && o.predicate.role === 'tender'
      ),
      'the tender’s row stays'
    );
  });

  it('moves hulls and never a rung, for every mission and every spent set', () => {
    // The class rather than the four cases (#612). Driven off `MISSIONS`, so a
    // fifth mission that authors cadres is covered the day it lands rather
    // than the day somebody remembers to add it here.
    //
    // What a derived definition is allowed to differ in is exactly one thing:
    // a `survive` count re-read against the party that sailed. Everything
    // else — which rows exist, which are terminal, which are keystones, and
    // every `extract` count — is the document's, and this walks the whole
    // cross-product to say so.
    const spendable = MISSIONS.filter((m) => cadreOf(m).length > 0);
    assert.ok(spendable.length > 0, 'some mission authors cadres');

    for (const mission of spendable) {
      const cadres = [...new Set(cadreOf(mission))];
      assert.ok(cadres.length <= 8, `${mission.id}: ${cadres.length} cadres is too many to walk`);

      for (let mask = 0; mask < 1 << cadres.length; mask++) {
        const spent = new Set(cadres.filter((_, i) => (mask >> i) & 1));
        const where = `${mission.id} [${[...spent].join(',') || 'nothing spent'}]`;
        const fielded = fieldDefinition(mission, spent);

        // The seated party, by role, is what a `survive` count may be re-read
        // against — and the only thing the record is allowed to have moved.
        const seats = new Map<string, number>();
        for (const unit of playerUnits(fielded)) {
          if (unit.role !== undefined) seats.set(unit.role, (seats.get(unit.role) ?? 0) + 1);
        }

        assert.deepEqual(
          fielded.objectives.map((o) => o.id),
          mission.objectives.map((o) => o.id),
          `${where}: the ladder's rows moved`
        );

        let terminal = 0;
        for (const [i, objective] of fielded.objectives.entries()) {
          const authored = mission.objectives[i]!;
          assert.equal(objective.terminal, authored.terminal, `${where}: ${objective.id} terminal`);
          assert.equal(objective.keystone, authored.keystone, `${where}: ${objective.id} keystone`);
          if (objective.terminal === true) terminal++;

          const now = objective.predicate as { kind: string; role?: string; count?: number };
          const was = authored.predicate as { kind: string; role?: string; count?: number };
          if (now.count !== undefined) {
            assert.ok(now.count >= 1, `${where}: ${objective.id} counts nobody`);
          }
          if (now.kind !== 'survive') {
            assert.equal(
              objective.predicate,
              authored.predicate,
              `${where}: ${objective.id} is a ${now.kind} and was rewritten`
            );
            continue;
          }
          const seated = seats.get(now.role!) ?? 0;
          const expected = seated === 0 ? was.count : Math.min(was.count!, seated);
          assert.equal(now.count, expected, `${where}: ${objective.id} count`);
        }

        assert.ok(terminal > 0, `${where}: the terminal ladder is empty`);
      }
    }
  });

  it('never mutates the authored literal', () => {
    // Deep-compared before and after, because a filter that spliced the
    // literal's own arrays would pass every test above and poison the next
    // match in the same process.
    for (const mission of [CHORD_CONCLAVE, CHORD_RIM_DEPOSITS, CHORD_SECOND_CHORD]) {
      const before = JSON.stringify(mission);
      fieldDefinition(mission, new Set(cadreOf(mission)));
      assert.equal(JSON.stringify(mission), before, `${mission.id} was mutated`);
    }
  });
});

describe('the acceptance, played — docs/campaign.md §7 row 3', () => {
  it('names the hull entered at the Rest, and Conclave seats five under that name', () => {
    // Nineteen, with the Third killed at the first snapshot and no other
    // order given: eighteen minutes to the resolve beat, and the close names
    // exactly the one cadre id that was not answering.
    const nineteen = play(CHORD_NINETEEN, 'the-third');
    assert.equal(nineteen.seated, 6, '§3: six hulls at the Head');
    assert.deepEqual(nineteen.spent, ['third']);
    assert.equal(nineteen.outcome, MissionOutcome.Partial, '§8: five home is the middle rung');

    // Conclave, fielded through what Nineteen reported. The player party in
    // the *match* — not the literal — is one hull short, and the hull that is
    // missing is the one seated under the Third's name.
    const third = playerUnits(CHORD_CONCLAVE).find((u) => u.cadre === 'third')!;
    const whole = new Match(missionMapById(CHORD_CONCLAVE.mapId)!, {
      mission: CHORD_CONCLAVE,
      fauna: false,
      seed: 4,
      spent: new Set(nineteen.spent),
    });
    let own: EchoSnapshot | undefined;
    while (own === undefined) {
      own = whole.update(STEP_MS)?.get(CHORD_CONCLAVE.playerSlot) as EchoSnapshot | undefined;
    }
    assert.equal(own.units.length, playerUnits(CHORD_CONCLAVE).length - 1);
    assert.ok(
      own.units.every((u) => Math.hypot(u.x - third.x, u.y - third.y) >= 1),
      `nothing is seated at the Third's place (${third.x}, ${third.y})`
    );
    // And with nothing spent, the same water seats all six — the literal is
    // what it always was, and the record is the only thing that shortens it.
    const full = new Match(missionMapById(CHORD_CONCLAVE.mapId)!, {
      mission: CHORD_CONCLAVE,
      fauna: false,
      seed: 4,
    });
    let all: EchoSnapshot | undefined;
    while (all === undefined) {
      all = full.update(STEP_MS)?.get(CHORD_CONCLAVE.playerSlot) as EchoSnapshot | undefined;
    }
    assert.equal(all.units.length, playerUnits(CHORD_CONCLAVE).length);
  });

  it('names nobody from a tide that does not spend', () => {
    // Aptitude: a hull killed at the first snapshot, sixteen minutes to the
    // close, and the resolution's own list is empty — there is no cadre to
    // name, and the room would not attach the field to the payload anyway
    // (`MatchRoom.endMission`, keyed on `attrition`).
    const aptitude = play(CHORD_APTITUDE, playerUnits(CHORD_APTITUDE)[0]!.tag);
    assert.equal(aptitude.seated, 6);
    assert.deepEqual(aptitude.spent, []);
    assert.equal(CHORD_APTITUDE.attrition, undefined);
  });

  it('spends on Nineteen and on no other mission', () => {
    // The opt-in is the whole of docs/mission-standing-wave.md §10's argument
    // as data: a mission that authors `attrition` is a mission whose lesson
    // is the loss. Conclave, The Three, the rim tides all *field* the cadre
    // and none of them spends it — a hull lost there returns.
    const spending = MISSIONS.filter((m) => m.attrition === true).map((m) => m.id);
    assert.deepEqual(spending, [CHORD_NINETEEN.id]);
    for (const mission of MISSIONS) {
      if (mission.attrition !== true) continue;
      assert.ok(cadreOf(mission).length > 0, `${mission.id} spends and names nobody to spend`);
    }
  });

  it('does not certify a chord the Order sent nobody to stand', () => {
    // #612's first close. Conclave's six voice rows are `extract role: party`,
    // and removing them left only `the-rest` — an `endure` meaning *nothing is
    // struck*, which an empty map keeps for free — so the mission read every
    // terminal row met and closed **Complete** over a party of nobody, on the
    // epilogue "Six stood, nothing struck."
    const run = play(CHORD_CONCLAVE, null, new Set(cadreOf(CHORD_CONCLAVE)));
    assert.equal(run.seated, 0, 'the whole cadre is spent, so nobody sails');
    assert.notEqual(run.outcome, MissionOutcome.Complete, 'a chord nobody stood is not certified');
    // And the close is the one its author wrote for a chord that did not
    // happen, read voice by voice rather than passed over in silence.
    for (const voice of ['Descant', 'Tenor', 'Treble', 'Alto', 'Bass', 'The Drone']) {
      assert.ok(
        run.epilogue.includes(`${voice} was not stood.`),
        `the close does not say what became of ${voice}`
      );
    }
  });

  it('reads the rim out cut by cut when the cutters are gone', () => {
    // #612's second close. Every terminal row at the Rim is an `extract` over
    // `cutter`, so spending the three cutters emptied the whole ladder: the
    // verdict survived, because the Lost epilogue is authored per outcome, but
    // the six readings underneath it that say *which* cuts are still on the
    // rim went with the rows. The account is what the player is owed.
    const cutters = ['first', 'second', 'third'];
    const run = play(CHORD_RIM_DEPOSITS, null, new Set(cutters));
    assert.equal(run.seated, playerUnits(CHORD_RIM_DEPOSITS).length - cutters.length);
    assert.ok(
      run.epilogue.includes('Fewer than two cutters came off the rim loaded.'),
      'the keystone does not say why the Chord does not exist'
    );
    for (const cut of ['first cut of the fourth', 'cut of the sixth']) {
      assert.ok(run.epilogue.includes(cut), `the close does not account for the ${cut} face`);
    }
  });
});
