/**
 * What a mission is allowed to tell the player — the information audit (#190).
 *
 * The whole game is hidden information, so an objective counter is the one
 * place in this codebase where world state is deliberately turned into a number
 * and handed to a client. `CLAUDE.md` states the rule it has to obey: never
 * send the client anything it has not resolved. A mission panel that read "two
 * of the three delegations have withdrawn" would be a maphack written as
 * arithmetic, and it would arrive through the front door.
 *
 * This file is `ai.test.ts`'s `assertOnlyKnown` pointed at the other crossing
 * point. The AI suite's argument applies here word for word — a conventional
 * campaign scripting layer reads world state and nobody minds, and here that
 * would not be merely unfair, it would be a different game played in the same
 * room — so the central test does not check that the panel is *useful*. It
 * checks that every field of every `MissionView` is either authored data that
 * shipped with the mission, the tick it was resolved beside, or a number the
 * player's own snapshot could have produced unaided. There is nothing else in
 * the payload, and that is the assertion.
 *
 * Two of the tests read TypeScript source instead of running anything.
 * `packages/shared/test/units.test.ts` argues for when that is legitimate and
 * the same argument holds here: the property in question is *the absence of a
 * field*, and absences do not survive to runtime. `MissionPredicate` is erased
 * entirely by the compiler, and `predicates.ts`'s guarantee is the shape of a
 * parameter list. The written declaration is the only surviving evidence, which
 * makes source the only vantage point that can see it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SIM, UnitKind, type EchoSnapshot, type MissionView } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { MISSIONS, PROLOGUE_SORROWGATE, inRegion } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = PROLOGUE_SORROWGATE.playerSlot;
const CONCOURSE = { x: 2500, y: 350 };
const CLIMB_TO_M = 300;
const STATION = [
  { x: -260, y: 0 },
  { x: 260, y: 0 },
];

/** A view, and the snapshot the player was sent on the same tick. */
interface Sent {
  view: MissionView;
  own: EchoSnapshot;
}

/**
 * Thirteen minutes of the escorted run, and every view it produced.
 *
 * Escorted rather than passive, and long enough to pass 12:18, because a
 * counter that never moves proves nothing about a counter: the sharp case is a
 * view that reports one of two tenders on the Concourse, which is the only
 * moment in the mission where a number in the payload is derived from where a
 * hull actually is. Memoised — the drive is the expensive part.
 */
let sent: Sent[] | null = null;
function sentViews(): Sent[] {
  if (sent !== null) return sent;
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  const match = new Match(map, { mission: PROLOGUE_SORROWGATE, fauna: false, seed: 7 });
  const collected: Sent[] = [];
  let last: EchoSnapshot | null = null;

  for (let tick = 0; tick < SIM.TICK_HZ * 13 * 60; tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) last = own;
    if (last !== null && tick % 60 === 0) {
      const escorts = last.units.filter((u) => u.kind === UnitKind.LightScout);
      const tenders = last.units.filter((u) => u.kind === UnitKind.Harvester);
      for (const [index, tender] of tenders.entries()) {
        match.orderMove(PLAYER, tender.id, CONCOURSE.x, CONCOURSE.y);
        match.orderDepth(PLAYER, tender.id, CLIMB_TO_M);
        for (const [offset, station] of STATION.entries()) {
          const escort = escorts[index * STATION.length + offset];
          if (escort === undefined) continue;
          match.orderMove(PLAYER, escort.id, tender.x + station.x, tender.y + station.y);
          match.orderDepth(PLAYER, escort.id, CLIMB_TO_M);
        }
      }
    }
    const view = match.takeMissionView();
    if (view !== null && last !== null) collected.push({ view, own: last });
    if (match.missionOver !== null) break;
  }

  assert.ok(collected.length > 0, 'the run produced no views to audit');
  sent = collected;
  return collected;
}

/** Every string the mission literal authored, and is therefore allowed to say. */
function authoredStrings(): Set<string> {
  const strings = new Set<string>([PROLOGUE_SORROWGATE.id]);
  for (const objective of PROLOGUE_SORROWGATE.objectives) {
    strings.add(objective.id);
    strings.add(objective.text);
    if (objective.debtText !== undefined) strings.add(objective.debtText);
    if (objective.markerId !== undefined) strings.add(objective.markerId);
  }
  for (const marker of PROLOGUE_SORROWGATE.markers) {
    strings.add(marker.id);
    strings.add(marker.label);
  }
  for (const lock of PROLOGUE_SORROWGATE.locks) {
    strings.add(lock.ability);
    strings.add(lock.reason);
  }
  return strings;
}

/** Every string anywhere in a payload, however deeply nested. */
function stringsIn(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) for (const item of value) stringsIn(item, into);
  else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) stringsIn(item, into);
  }
  return into;
}

describe('a mission view says only what the player could have worked out', () => {
  it('carries no string the mission did not author', () => {
    // The acceptance criterion of the whole feature, as an assertion, and the
    // reason the wire type has no free-text field a runtime could compose into:
    // every word in the panel was written in the literal, in register, before
    // the match started. A templated sentence is where "two hostiles remaining"
    // would arrive from, and it cannot be authored ahead of time — so a string
    // that is not in the literal is either a leak or the beginning of one.
    const allowed = authoredStrings();
    for (const { view } of sentViews()) {
      for (const text of stringsIn(view)) {
        assert.ok(allowed.has(text), `the view said "${text}", which nobody authored`);
      }
    }
  });

  it("derives every counter from the observer's own snapshot alone", () => {
    // `progressOf` is given one resolved `EchoSnapshot` — the player's, on this
    // very tick — and cannot be given a second, so every number it returns is
    // one the client could have computed for itself. This is that claim checked
    // from the outside: recount the region from the same snapshot and the
    // reported figure has to be inside what the player can see there.
    //
    // Bounded rather than equal, deliberately. The predicate counts hulls in a
    // *role*, the snapshot does not carry roles, and a test that reconstructed
    // the role map would be re-implementing the thing it is auditing. The
    // property that matters is the one bound: the counter can never exceed what
    // the player's own force puts inside the region, so it can never be
    // counting anybody else's.
    for (const { view, own } of sentViews()) {
      assert.equal(view.tick, own.tick, 'the view was resolved beside a different snapshot');
      for (const objective of view.objectives) {
        if (objective.progress === undefined) continue;
        const authored = PROLOGUE_SORROWGATE.objectives.find((o) => o.id === objective.id);
        assert.ok(authored !== undefined, `${objective.id} is not an authored objective`);
        assert.equal(authored.predicate.kind, 'extract', 'only hull counts carry a counter');
        if (authored.predicate.kind !== 'extract') continue;
        assert.equal(objective.progress.of, authored.predicate.count, 'the target is authored');

        const region = PROLOGUE_SORROWGATE.regions.find(
          (candidate) => candidate.id === (authored.predicate as { region: string }).region
        )!;
        const ownInside = own.units.filter((unit) => inRegion(region, unit.x, unit.y)).length;
        assert.ok(
          objective.progress.done >= 0 && objective.progress.done <= ownInside,
          `${objective.id} counted ${objective.progress.done} in the Concourse while the ` +
            `player's own snapshot puts ${ownInside} hulls there`
        );
      }
    }
  });

  it('ships the markers, locks and budget exactly as authored', () => {
    // The rest of the payload is a copy of the literal and nothing else. Copied
    // rather than aliased in `view.ts` — the definition's arrays are readonly
    // authored data and the wire types are not — so this is also the assertion
    // that the copy is faithful, and that nothing derived from the world was
    // folded into a marker's position on the way past.
    for (const { view } of sentViews()) {
      assert.equal(view.missionId, PROLOGUE_SORROWGATE.id);
      assert.equal(view.sigBudget, PROLOGUE_SORROWGATE.sigBudget);
      assert.deepEqual(
        view.markers,
        PROLOGUE_SORROWGATE.markers.map((marker) => ({ ...marker }))
      );
      assert.deepEqual(
        view.locks,
        PROLOGUE_SORROWGATE.locks.map((lock) => ({ ...lock }))
      );
      assert.ok(
        view.debtS >= 0 && view.debtS <= PROLOGUE_SORROWGATE.debtCapS,
        `debt ${view.debtS}s is outside the authored ledger`
      );
    }
  });

  it("has no field that could hold another slot's state", () => {
    // Structural, in the register of `ai.test.ts`'s tuning-knob test and for
    // the same reason: the promise is that a mission panel never reports on
    // anybody but the observer, and the way to keep a promise like that is for
    // there to be nowhere to put the violation. A future `contacts`, `parties`
    // or `threats` field on this payload would name one, and this is what names
    // it back.
    const view = new Set([
      'missionId',
      'tick',
      'objectives',
      'markers',
      'locks',
      'sigBudget',
      'debtS',
    ]);
    const objective = new Set(['id', 'text', 'status', 'progress', 'markerId']);
    const marker = new Set(['id', 'label', 'x', 'y', 'radiusM']);
    const lock = new Set(['ability', 'reason']);

    for (const { view: sentView } of sentViews()) {
      for (const key of Object.keys(sentView)) {
        assert.ok(view.has(key), `unexpected field "${key}" on a MissionView`);
      }
      for (const shown of sentView.objectives) {
        for (const key of Object.keys(shown)) {
          assert.ok(objective.has(key), `unexpected field "${key}" on an ObjectiveView`);
        }
        if (shown.progress !== undefined) {
          assert.deepEqual(Object.keys(shown.progress).sort(), ['done', 'of']);
        }
      }
      for (const shown of sentView.markers) {
        for (const key of Object.keys(shown)) {
          assert.ok(marker.has(key), `unexpected field "${key}" on a MissionMarker`);
        }
      }
      for (const shown of sentView.locks) {
        for (const key of Object.keys(shown)) {
          assert.ok(lock.has(key), `unexpected field "${key}" on an AbilityLock`);
        }
      }
    }
  });
});

describe('what the court says gives nothing away', () => {
  it('states no position and counts nothing the player does not own', () => {
    // Every text a mission can show — objective readings, both of them, marker
    // labels and lock reasons — is checked against the two things that would
    // leak through prose rather than through a number: somebody else's
    // coordinates, and a count of somebody else's hulls.
    //
    // The digit rule is the general form and it costs the register nothing,
    // because the court spells its numbers out: "The flight stays under
    // twenty", not "under 20". A numeral in this panel is a coordinate, a
    // count, or a threshold, and none of the three is the court's to state. A
    // future mission that genuinely wants one has to argue for it here.
    for (const mission of MISSIONS) {
      const texts = [
        ...mission.objectives.flatMap((objective) => [objective.text, objective.debtText ?? '']),
        ...mission.markers.map((marker) => marker.label),
        ...mission.locks.map((lock) => lock.reason),
      ];
      const scripted = mission.parties
        .filter((party) => party.slot !== mission.playerSlot)
        .flatMap((party) => party.units);

      for (const text of texts) {
        assert.doesNotMatch(
          text,
          /\d/,
          `"${text}" states a numeral, and the register spells them out — see the note above`
        );
        for (const unit of scripted) {
          assert.ok(
            !text.includes(String(unit.x)) && !text.includes(String(unit.y)),
            `"${text}" names where ${unit.tag} is`
          );
        }
        assert.ok(
          !text.includes(String(scripted.length)),
          `"${text}" counts the hulls the player does not own`
        );
      }
    }
  });
});

describe("the leak audit is a property of the types, not of anybody's discipline", () => {
  /**
   * The `MissionPredicate` declaration, read out of the TypeScript source.
   *
   * `packages/shared/test/units.test.ts` explains when reading source from a
   * test earns its keep, and this is the same case in a stronger form: a union
   * of object types is erased entirely by the compiler, so by the time any test
   * can run there is nothing left of it to inspect. No fixture can force the
   * property apart either — a predicate with a `slot` field would still compile,
   * still evaluate and still return a plausible number. The written declaration
   * is the only surviving evidence that the leak is impossible rather than
   * merely absent.
   */
  function predicateUnion(): string {
    const source = readFileSync(new URL('../src/sim/missions/types.ts', import.meta.url), 'utf8');
    const declaration = /export type MissionPredicate =([\s\S]*?);\n/.exec(source);
    assert.ok(
      declaration,
      'no `export type MissionPredicate = …;` in src/sim/missions/types.ts — if it moved or ' +
        'was renamed, move this test with it rather than deleting it'
    );
    return declaration[1]!;
  }

  it('gives a predicate no way to name a party', () => {
    // types.ts states the claim and this enforces it: "There is no `party`,
    // `slot` or `group` field anywhere in this union, and there is no second
    // snapshot in scope where one is evaluated. 'Three of five hostiles
    // remaining' is therefore not merely discouraged — it is not expressible."
    //
    // The day somebody needs a mission to count somebody else's hulls, the
    // honest fix is to change what the mission asks the player to do. This test
    // is what makes that a conversation instead of a one-line field.
    const union = predicateUnion();
    assert.match(union, /kind:/, 'the union no longer looks like a discriminated union');
    for (const field of ['slot', 'party', 'group', 'faction', 'tag']) {
      assert.doesNotMatch(
        union,
        new RegExp(`\\b${field}\\s*[?]?\\s*:`),
        `MissionPredicate now has a "${field}" field, which can address a force the player ` +
          'does not own — see the comment above the union in types.ts'
      );
    }
  });

  it('keeps the world out of the two files that produce the payload', () => {
    // `predicates.ts` and `view.ts` say their guarantee is a parameter list —
    // "nothing here can report on anything the observer does not own, because
    // nothing here is given anything the observer does not own". A parameter
    // list only holds while there is no other way in, and an import is the
    // other way in: one `import { Position } from '../components.ts'` and the
    // shortest file in the codebase can read every hull on the map without
    // changing a single signature.
    for (const file of ['predicates.ts', 'view.ts']) {
      const source = readFileSync(new URL(`../src/sim/missions/${file}`, import.meta.url), 'utf8');
      const imports = [...source.matchAll(/^import[\s\S]*?from '([^']+)';/gm)].map(
        (match) => match[1]!
      );
      for (const specifier of imports) {
        assert.ok(
          !/bitecs|world\.ts|components\.ts|match\.ts|echoLayer\.ts/.test(specifier),
          `${file} imports "${specifier}", which is a route to the world it is not given`
        );
      }
    }
  });
});
