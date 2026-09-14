/**
 * The plain line beside the court's own — docs/ui-ux.md §10.5, #720, #725.
 *
 * §10.5 permits a mission to author a gloss beside an objective's reading and
 * forbids it replacing one. The panel's half of that is held in
 * `packages/frontend/test/missionPanel.test.ts`, which is where "beside, not
 * instead" and "inside the row" live. This file holds the server's half, and
 * the two claims here are the ones a reading of the literal cannot settle:
 *
 * - **A gloss that reaches the client is one the mission authored.** Not
 *   assembled, not interpolated, not templated. That is §10.5's verbatim rule
 *   applied to the second half of a row, and it closes the half of the
 *   anti-reveal rule the *running match* could break: the set of strings this
 *   field can hold is fixed before a match exists, so no resolved contact has
 *   a path in. It says nothing about what an author put in those strings —
 *   that half is prose and is checked against prose by the sweep in
 *   `missions.test.ts` — which bans the proper nouns of somebody else's force
 *   except a navy the player's own party also flies, and cannot bound prose at
 *   all beyond that, as its own comment says. A docblock
 *   claiming this file holds both is how a gloss naming another party's
 *   Corvettes passed every gate in the tree.
 * - **The gloss follows the reading it belongs to.** §12 authors two readings
 *   of the silence order and marks the second *while in debt*; a row whose
 *   sentence said one thing and whose gloss explained the other would be worse
 *   than no gloss, because it is the half the player is reading for the facts.
 *
 * The debt is provoked rather than waited for: `acoustics.ts` gives a Light
 * Scout two states, `sigCruise` 12 and `sigIdle` 6, so *no* amount of moving
 * reaches a ceiling of 20 and a mission played normally never owes a second —
 * which is exactly what `missionRuntime.test.ts` asserts two files over.
 * `DEPTH.DESCENT_SIG`'s 72 is the one thing that crosses it, so the drive dives
 * the flight, which is the same lever the array-withdrawal test pulls.
 *
 * **The run is fourteen minutes and that is the point of it.** Tender One's
 * reading appears at 11:20 and Tender Two's at 13:40 (`revealAtTick`), so a
 * shorter drive never puts their glosses on the wire at all — the first version
 * of this file ran twenty-five seconds and exercised three of the five, which
 * means an interpolated tender gloss would have passed it while the mutation
 * that "caught" interpolation happened to land on a covered one. The coverage
 * assertion below is what stops that recurring: the set of glosses seen has to
 * equal the set the literal authors, so shortening the drive fails the test
 * rather than quietly narrowing it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SIM, UnitKind, type EchoSnapshot, type MissionView } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE, type MissionObjective } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
/**
 * Fourteen minutes, which is the first tick at which every authored gloss has
 * had a chance to reach the wire: Tender Two's reading is revealed at 13:40 and
 * the court does not adjourn until 20:00.
 */
const RUN_TICKS = SIM.TICK_HZ * 14 * 60;
const SEED = 7;
const PLAYER = PROLOGUE_SORROWGATE.playerSlot;

/**
 * Every mission view the room would have sent over a run that runs up a debt
 * and stays in the water long enough for both tenders to be handed over.
 */
function viewsThroughABreach(): MissionView[] {
  const match = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId)!, {
    mission: PROLOGUE_SORROWGATE,
    fauna: false,
    seed: SEED,
  });
  const views: MissionView[] = [];
  // The last snapshot the player was sent, carried forward. Snapshots land on
  // the Echo tick (`SIM.ECHO_HZ`) and the loop below runs at 60, so `update`
  // returns nothing on eleven ticks in twelve — a scenario that read `own`
  // only on the tick it wanted to give an order on would silently give none,
  // and the breach it is driving would never happen.
  let own: EchoSnapshot | null = null;
  for (let tick = 0; tick < RUN_TICKS; tick++) {
    const next = match.update(STEP_MS)?.get(PLAYER);
    if (next !== undefined) own = next;
    // Ten seconds in, dive the flight: SIG 72 against a ceiling of 20.
    if (tick === SIM.TICK_HZ * 10 && own !== null) {
      for (const unit of own.units) {
        if (unit.kind === UnitKind.LightScout) match.orderDepth(PLAYER, unit.id, 1700);
      }
    }
    const view = match.takeMissionView();
    if (view !== null) views.push(view);
  }
  assert.ok(views.length > 0, 'the mission sent no view at all');
  return views;
}

let breached: MissionView[] | null = null;
const breachRun = (): MissionView[] => (breached ??= viewsThroughABreach());

describe('the gloss beside a mission’s own reading', () => {
  it('sends only strings the mission authored, chosen and never assembled', () => {
    // The anti-reveal property, in the form that is a property of the shape
    // rather than of the author's care: every gloss on the wire is byte-equal
    // to one of the literal's own constants. There is no interpolation on this
    // path, so there is no seam through which a resolved contact — or any
    // runtime figure at all — could reach the player's objectives panel.
    //
    // Asserted per objective rather than against one flat set, so a gloss
    // arriving on the wrong row is caught too: "authored somewhere in this
    // mission" is a weaker claim than "authored on this rule". That weaker
    // claim is already held — `missionSafety.test.ts` sweeps every string in
    // every view against the whole literal, and it is what noticed this field
    // existed at all. This is the same property one notch tighter, and the
    // notch is where a gloss explaining the ceiling could sit under a reading
    // about a tender without either test minding.
    const authored = new Map<string, Set<string>>();
    for (const objective of PROLOGUE_SORROWGATE.objectives) {
      const strings = new Set<string>();
      if (objective.gloss !== undefined) strings.add(objective.gloss);
      if (objective.debtGloss !== undefined) strings.add(objective.debtGloss);
      authored.set(objective.id, strings);
    }
    const seen = new Set<string>();
    for (const view of breachRun()) {
      for (const objective of view.objectives) {
        if (objective.gloss === undefined) continue;
        seen.add(objective.gloss);
        assert.ok(
          authored.get(objective.id)?.has(objective.gloss),
          `"${objective.id}" was sent a gloss its literal does not author: ${objective.gloss}`
        );
      }
    }
    // Coverage asserted rather than assumed, and this is the half that makes
    // the loop above mean anything: a gloss the run never reaches is a gloss
    // nothing checks, and the two tender readings are revealed eleven and
    // thirteen minutes in. Stated as set equality so it fails in both
    // directions — a drive shortened below a reveal, and a gloss authored and
    // then never shown.
    const all = new Set([...authored.values()].flatMap((strings) => [...strings]));
    assert.deepEqual(
      [...seen].sort(),
      [...all].sort(),
      'the run did not put every authored gloss on the wire'
    );
  });

  it('swaps to the debt gloss exactly when the court’s reading swaps, and back', () => {
    // §12 authors *The flight stays under twenty* and, while in debt, *The
    // flight owes the court a silence* — two readings of one rule. The gloss
    // is the plain half of the same row, so the two have to describe the same
    // state at every tick: a row reading "you owe a silence" over a line
    // explaining what the ceiling is would send the player to check a number
    // that is no longer the thing to do anything about.
    //
    // Stated as an equivalence rather than as two separate claims, because
    // only the equivalence rules out the failure in both directions — a gloss
    // latched on and never released reads the same as one that never latched
    // if you only look at the debt.
    const silence: MissionObjective | undefined = PROLOGUE_SORROWGATE.objectives.find(
      (objective) => objective.debtGloss !== undefined
    );
    assert.ok(silence !== undefined, '§12 authors a debt reading and a gloss for it');
    // Read out of the narrowed object here rather than inside the loop below.
    // `assert.ok` narrows through an assertion signature, and that narrowing
    // does not survive into a closure — a `find` predicate that reached for
    // `silence.id` made the type of `row` depend on a narrowing that depends on
    // `row`, which TypeScript reports as TS7022 rather than as anything that
    // looks like a test problem.
    const { id: ruleId, debtText, debtGloss } = silence;
    let owing = 0;
    let clear = 0;
    for (const view of breachRun()) {
      const row = view.objectives.find((objective) => objective.id === ruleId);
      if (row === undefined) continue;
      const readsDebt = row.text === debtText;
      const glossesDebt = row.gloss === debtGloss;
      assert.equal(
        readsDebt,
        glossesDebt,
        `tick ${view.tick}: the row reads "${row.text}" and explains "${row.gloss}"`
      );
      if (readsDebt) owing++;
      else clear++;
    }
    assert.ok(clear > 0, 'the flight was never compliant, so the base reading is untested');
    assert.ok(owing > 0, 'the flight never ran up a debt, so the swap is untested');
  });
});
