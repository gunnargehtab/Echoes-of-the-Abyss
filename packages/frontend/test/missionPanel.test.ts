/**
 * The objectives panel (#494) — docs/ui-ux.md §10.5.
 *
 * §10.5 is a list of promises about what a mission may say to the player and
 * how, and every one of them is a rule rather than a look: the panel announces
 * changes in place rather than re-reading its backlog, it renders a mission's
 * own words verbatim, it sends the camera only where the mission named a
 * place, and it may only ever show the player's own force. Nothing was
 * checking any of it.
 *
 * These are assertions about those promises, never about the markup. What the
 * rows look like is a screenshot's business (docs/graphics-standards.md); that
 * an order with nowhere to fly to is still readable is this file's.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import type { ReactTestInstance } from 'react-test-renderer';
import {
  MovementHoldReason,
  ObjectiveStatus,
  type BoundSig,
  type CommanderAbilityView,
  type MissionView,
  type ObjectiveView,
} from '@echoes/shared';
import './support/headless.ts';
import { render, type Rendered } from './support/screen.ts';
import {
  APP_CSS,
  borderBoxWidth,
  boxRulesFor,
  columnFloors,
  columnOf,
  parseCss,
  resolveBox,
  rulesTargeting,
  uaBoxSizing,
} from './support/cssBox.ts';
import { MissionPanel } from '../src/game/MissionPanel.tsx';

/** The Concourse, in the words mission-sorrowgate.md §12 uses for it. */
const CONCOURSE = { id: 'concourse', label: 'Upper Concourse', x: 4200, y: -1800, radiusM: 300 };

function objective(over: Partial<ObjectiveView> = {}): ObjectiveView {
  return {
    id: 'get-them-out',
    text: 'Both tenders reach the Upper Concourse.',
    status: ObjectiveStatus.Pending,
    ...over,
  };
}

function missionView(over: Partial<MissionView> = {}): MissionView {
  return {
    missionId: 'sorrowgate',
    tick: 1200,
    objectives: [objective()],
    markers: [CONCOURSE],
    locks: [],
    held: [],
    sigBudget: 20,
    debtS: 0,
    ...over,
  };
}

interface Calls {
  focused: Array<[number, number]>;
  rung: number;
}

async function panel(
  view: MissionView,
  boundSig?: BoundSig
): Promise<{ rendered: Rendered; calls: Calls }> {
  const calls: Calls = { focused: [], rung: 0 };
  const rendered = await render(
    createElement(MissionPanel, {
      view,
      ...(boundSig === undefined ? {} : { boundSig }),
      onFocus: (x, y) => calls.focused.push([x, y]),
      onCommanderAbility: () => calls.rung++,
    })
  );
  return { rendered, calls };
}

/**
 * Every string *and number* a node renders, joined.
 *
 * `Rendered.text()` collects strings, which is right for prose and wrong for
 * every line in this panel that interpolates a count — an objective's `3 of
 * 5` puts numbers in the tree, and a text walker that dropped them would let
 * the assertions pass on a panel showing no number at all.
 */
function reads(instance: { props: { children?: unknown } }): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string' || typeof node === 'number') out.push(String(node));
    else if (Array.isArray(node)) node.forEach(walk);
  };
  walk(instance.props.children);
  return out.join('');
}

/**
 * Every string a subtree *renders*, descending through its elements.
 *
 * `reads` above stops at a node's own children, which is what the chip
 * assertions want and is exactly wrong for "is this text inside the live
 * region?" — a walker that does not descend answers "no" for every node with
 * an element between it and the words, which is a guard that cannot fail.
 */
function deepText(instance: ReactTestInstance): string {
  const out: string[] = [];
  const walk = (node: ReactTestInstance | string): void => {
    if (typeof node === 'string' || typeof node === 'number') out.push(String(node));
    else node.children.forEach(walk);
  };
  instance.children.forEach(walk);
  return out.join('');
}

describe('the objectives panel: how it announces itself', () => {
  it('is a status region and not a log, because its rows change in place', async () => {
    const { rendered } = await panel(missionView());
    try {
      const body = rendered.byClass('objectives-body');
      assert.equal(
        body.props.role,
        'status',
        '§10.5: a log role would re-announce the whole panel every time a counter moved'
      );
      assert.equal(body.props['aria-live'], 'polite');
      // The contact log next door is the one that appends. If these two ever
      // agree, one of them is announcing the wrong thing.
      assert.notEqual(body.props.role, 'log');
    } finally {
      await rendered.unmount();
    }
  });

  it('states a mission’s SIG budget as a budget, never as a rule', async () => {
    // #623 criterion 10, and the twenty-four missions that lend no array are
    // its population. `sigBudget` is design metadata — docs/campaign.md §10
    // keeps it in a mission's design notes, nothing fails for crossing it, and
    // missions are playtested against players who exceed it. The chip carried
    // a `≤` until now, which states a threshold the game does not enforce.
    //
    // Intake's 50 rather than the prologue's 20, for two reasons. Intake is
    // one of the missions this form is *about* — its own §3 says the figure
    // "is a description, not a ceiling" — where Sorrowgate's budget and
    // its order are the same number and the distinction does not show. And 50
    // is two digits, so it exercises the padding this form inherits.
    const { rendered } = await panel(missionView({ sigBudget: 50 }));
    try {
      const chip = reads(rendered.byClass('objectives-ceiling'));
      assert.match(chip, /^SIG budget 050$/);
      assert.equal(/≤|<=/.test(chip), false, 'a design note is not stated as a threshold');
    } finally {
      await rendered.unmount();
    }
  });

  it('names the bound set where the mission worded it, and not otherwise', async () => {
    // #623 criterion 9. The word tells the player *which* hulls the figure is
    // over, and without it a compliant flight reads as being in breach of its
    // own freight — the meter in the top bar is the peak across the whole
    // force while the court's order binds the flight alone
    // (docs/mission-sorrowgate.md §4).
    //
    // The unworded half is the half worth holding. Four of the five orders
    // shipping today have no authored word, and the tempting fallback is the
    // `silenceRole` the ledger indexes by — an internal id, which renders as
    // `called SIG 022 / 025` and names nothing a player can act on. So the
    // fallback is *no name*: the same two numbers, claiming nothing about
    // whose they are. The server settles which of the two arrives; this holds
    // that the panel draws each as §10.5 writes it.
    const worded = await panel(missionView(), { peak: 6, ceiling: 20, setName: 'flight' });
    const unworded = await panel(missionView(), { peak: 22, ceiling: 25 });
    try {
      assert.match(reads(worded.rendered.byClass('objectives-ceiling')), /^flight SIG 006 \/ 020$/);
      assert.match(reads(unworded.rendered.byClass('objectives-ceiling')), /^SIG 022 \/ 025$/);
    } finally {
      await worded.rendered.unmount();
      await unworded.rendered.unmount();
    }
  });

  it('carries the order’s own reading beside the ceiling it is enforced against', async () => {
    // #623 criterion 8. The ceiling alone left the player nothing to check the
    // one numeric rule of the mission against, and the instrument nearest to
    // hand — the SIG meter — is a fleet instrument measuring a set the order
    // does not bind.
    //
    // The budget and the ceiling are deliberately different numbers here,
    // because in three of the five ledger missions they are: Attendance's
    // budget of 8 is "a description rather than a ceiling" in its own §4 while
    // its order is 25. A reading drawn against the budget would read as a
    // breach of a rule nobody is enforcing, so when an order is in force the
    // budget is not what is shown.
    const { rendered } = await panel(missionView({ sigBudget: 9 }), {
      peak: 6,
      ceiling: 25,
      setName: 'flight',
    });
    try {
      const chip = reads(rendered.byClass('objectives-ceiling'));
      assert.match(chip, /flight SIG 006 \/ 025/);
      assert.equal(/9/.test(chip), false, 'the budget is not the rule and is not shown as one');
    } finally {
      await rendered.unmount();
    }
  });

  it('says nothing false at the one moment the rule is broken', async () => {
    // The chip is a *value against its limit*, in §3's `SIG 042 / 100` form,
    // and never a relation. A relation is a claim, and in breach the claim is
    // false — `flight SIG 26 ≤ 25` asserts something untrue at exactly the
    // moment the player most needs to read it, which CLAUDE.md calls confusion
    // rather than dread. This is the case the compliant readings above cannot
    // see, and the reason the form is what it is.
    const { rendered } = await panel(missionView({ debtS: 1.2 }), {
      peak: 26,
      ceiling: 25,
      setName: 'flight',
    });
    try {
      const chip = reads(rendered.byClass('objectives-ceiling'));
      assert.match(chip, /flight SIG 026 \/ 025/);
      assert.equal(/≤|<=/.test(chip), false, 'a breach is not written as an inequality');
    } finally {
      await rendered.unmount();
    }
  });

  it('never lets the reading shuffle the header under itself', async () => {
    // §3 spends a whole spec row on zero-padding "so the digit count never
    // shifts", and it earns it here: the Dome's watch reads 22 on its first
    // pass and 5 for the rest of the mission, inside a `space-between` header.
    // Unpadded, the row would move every time a digit came or went.
    const wide = await panel(missionView(), { peak: 22, ceiling: 30 });
    const narrow = await panel(missionView(), { peak: 5, ceiling: 30 });
    try {
      assert.equal(
        reads(wide.rendered.byClass('objectives-ceiling')).length,
        reads(narrow.rendered.byClass('objectives-ceiling')).length,
        'a one-digit reading is the same width as a two-digit one'
      );
    } finally {
      await wide.rendered.unmount();
      await narrow.rendered.unmount();
    }
  });

  it('keeps that reading out of the region that reads itself aloud', async () => {
    // It moves on the Echo tick. §10.5's body is `role="status"` with
    // `aria-live="polite"` so a row changing in place is announced; a number
    // changing five times a second inside it would talk over every objective
    // the panel exists to read out. The header is not live, and that is where
    // this belongs.
    const { rendered } = await panel(missionView(), { peak: 6, ceiling: 20, setName: 'flight' });
    try {
      assert.match(reads(rendered.byClass('objectives-ceiling')), /flight SIG 006 \/ 020/);
      assert.equal(
        /flight SIG/.test(deepText(rendered.byClass('objectives-body'))),
        false,
        'the live region does not carry the reading'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('says so when a mission is asking nothing of the player yet', async () => {
    const { rendered } = await panel(missionView({ objectives: [] }));
    try {
      assert.ok(rendered.shows('no orders'), 'an empty panel still says what it is');
    } finally {
      await rendered.unmount();
    }
  });
});

describe('the objectives panel: whose words these are', () => {
  it('renders a mission’s own sentence verbatim, never templated', async () => {
    // §10.5: "The court says *the flight stays under twenty*; a shared string
    // would say 'maintain SIG below 20', which is a sentence no faction in
    // this setting speaks."
    const authored = 'The flight stays under twenty. The court is listening.';
    const { rendered } = await panel(
      missionView({ objectives: [objective({ id: 'quiet', text: authored })] })
    );
    try {
      assert.ok(
        rendered.text().includes(authored),
        'the authored line is one string in the tree, whole and unedited'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('prints the plain gloss beside the authored line and never instead of it', async () => {
    // §10.5's gloss rule, and the decision on #720: the court still says what
    // the court says, and a plainly-worded line sits beside it. Both halves are
    // authored strings and this file templates neither — the assertion is that
    // each survives into the tree *whole*, which is what "verbatim" means and
    // what a reworded or assembled line would fail.
    const reading = 'The flight stays under twenty.';
    const plain = 'Hold every escort under SIG 20 — the reading in this panel’s header.';
    const { rendered } = await panel(
      missionView({
        objectives: [objective({ id: 'silence', text: reading, gloss: plain })],
        markers: [],
      })
    );
    try {
      const strings = rendered.text();
      assert.ok(strings.includes(reading), 'the court’s line is one string, whole and unedited');
      assert.ok(strings.includes(plain), 'the gloss is one string, whole and unedited');
      // Beside, never instead. A gloss that replaced the reading would still
      // pass a test that only looked for the gloss.
      assert.equal(
        reads(rendered.byClass('objectives-text')),
        reading,
        'the reading’s own span carries the reading and nothing else'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('keeps the authored line first, and the gloss after it and inside the same row', async () => {
    // Two promises at once, and they are the two §10.5 makes about where a
    // gloss may go.
    //
    // *Secondary in the reading order*: the authored sentence comes first, so a
    // player who wants the fiction reads it and can stop. Asserted on the row's
    // rendered text rather than on the markup — §11's concern is the order the
    // words are announced in, which is the order they are in the tree.
    //
    // *Inside the row*: the status region changes in place (the first test in
    // this file), and a gloss that were its own row would make the panel grow
    // and shrink under a live region every time a mission revealed an
    // objective. Inside the row it is also part of a button row's accessible
    // name for free, which is the other half of what §11 asks.
    const reading = 'Tender One is loaded. Tender One does not move without ears.';
    const plain = 'Tender One only moves while one of your escorts is within 400 m of it.';
    const { rendered } = await panel(
      missionView({
        objectives: [objective({ id: 'tender-one', text: reading, gloss: plain })],
        markers: [],
      })
    );
    try {
      const row = deepText(rendered.byClass('objectives-row'));
      assert.ok(
        row.indexOf(reading) < row.indexOf(plain),
        'the court speaks first and the gloss explains it second'
      );
      assert.equal(
        rendered.allByClass('objectives-row').length,
        1,
        'one rule is one row, whether or not it carries a second sentence'
      );
      assert.ok(
        deepText(rendered.byClass('objectives-row')).includes(plain),
        'and the gloss is inside that row rather than beside it'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('puts the gloss inside the accessible name of a row that is a button', async () => {
    // §10.5 says the gloss "is part of that row's accessible name rather than
    // a second unannounced thing on screen", and this is the only form where a
    // row *has* an accessible name — a `p` has none, and the two rows that
    // actually carry a gloss and a marker in the shipped prologue are both
    // buttons. Asserting this on the `p` branch alone, which is what the tests
    // above do, tests the claim on the one shape it cannot be made about.
    //
    // A button's accessible name is its rendered contents, so the assertion is
    // that the gloss is in them — and that being in them has not cost the row
    // the gesture, since the gloss's own sentence is a claim about exactly
    // that affordance.
    const reading = 'Tender One is loaded. Tender One does not move without ears.';
    const plain =
      'Tender One only moves while an escort is within 400 m. This row sends the camera to the Concourse.';
    const { rendered, calls } = await panel(
      missionView({
        objectives: [
          objective({ id: 'tender-one', text: reading, gloss: plain, markerId: CONCOURSE.id }),
        ],
      })
    );
    try {
      const row = rendered.byClass('objectives-row');
      assert.equal(row.type, 'button', 'a row with somewhere to go is a button');
      const name = deepText(row);
      assert.ok(name.includes(reading), 'the reading is in the button’s accessible name');
      assert.ok(name.includes(plain), 'and so is the gloss, rather than sitting outside it');
      await rendered.act(() => {
        (row.props as { onClick?: () => void }).onClick?.();
      });
      assert.deepEqual(
        calls.focused,
        [[CONCOURSE.x, CONCOURSE.y]],
        'and the gesture the gloss describes still works'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('draws no gloss at all for the twenty-eight missions that author none', async () => {
    // Absent is the ordinary case. A panel that rendered an empty span would
    // put a second grid cell under every reading in the game for nothing, and
    // would announce an empty string to a screen reader.
    const { rendered } = await panel(missionView({ objectives: [objective()], markers: [] }));
    try {
      assert.equal(rendered.allByClass('objectives-gloss').length, 0);
    } finally {
      await rendered.unmount();
    }
  });

  it('shows the counters the server sent and does no arithmetic of its own', async () => {
    // The INVARIANT on `ObjectiveView.progress`: `done` and `of` come off the
    // observer's own resolved snapshot. The panel's job is to print them.
    const { rendered } = await panel(
      missionView({
        objectives: [objective({ progress: { done: 1, of: 2 } })],
      })
    );
    try {
      assert.match(reads(rendered.byClass('objectives-progress')), /1 of 2/);
    } finally {
      await rendered.unmount();
    }
  });

  it('carries status as a word, not only as a colour', async () => {
    // §11: the scale has to survive a colour-vision difference and a screen
    // reader both, so the class is never the only carrier.
    const statuses = [ObjectiveStatus.Pending, ObjectiveStatus.Met, ObjectiveStatus.Failed];
    const { rendered } = await panel(
      missionView({
        objectives: statuses.map((status, i) => objective({ id: `o${i}`, status })),
        markers: [],
      })
    );
    try {
      const words = rendered.allByClass('objectives-status').map((s) => s.props.children);
      assert.deepEqual(words, ['open', 'met', 'failed']);
    } finally {
      await rendered.unmount();
    }
  });
});

describe('the objectives panel: where a row may send the camera', () => {
  it('recentres on the marker the mission named, not on anything detected', async () => {
    const { rendered, calls } = await panel(
      missionView({ objectives: [objective({ markerId: CONCOURSE.id })] })
    );
    try {
      const row = rendered.byClass('objectives-row');
      assert.equal(row.type, 'button');
      await rendered.act(() => {
        (row.props as { onClick?: () => void }).onClick?.();
      });
      assert.deepEqual(
        calls.focused,
        [[CONCOURSE.x, CONCOURSE.y]],
        'an authored place — never an entity, never a contact'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('leaves an order with nowhere to go as text rather than as a dead button', async () => {
    // The source comment's reason, and it is an accessibility one: a disabled
    // button is out of the tab order and skipped by some screen readers in
    // browse mode, which would put the order *itself* out of reach. The rule
    // the mission is stating does not stop being content because there is
    // nowhere to fly to.
    const { rendered } = await panel(missionView({ objectives: [objective()], markers: [] }));
    try {
      const row = rendered.byClass('objectives-row');
      assert.equal(row.type, 'p', 'still readable');
      assert.equal(
        rendered.root.findAll((node) => node.type === 'button').length,
        0,
        'and not a disabled button standing in for it'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('ignores a markerId the mission never placed rather than sending the camera nowhere', async () => {
    const { rendered } = await panel(
      missionView({ objectives: [objective({ markerId: 'a-place-that-is-not-on-the-chart' })] })
    );
    try {
      assert.equal(rendered.byClass('objectives-row').type, 'p');
    } finally {
      await rendered.unmount();
    }
  });
});

describe('the objectives panel: the affordances a mission withholds', () => {
  it('names a locked action and attaches its reason, before the player reaches for it', async () => {
    // §10.5 and §7: the lock is continuous state, not a reply to a click,
    // "because a refusal delivered afterwards teaches nothing".
    const { rendered } = await panel(
      missionView({
        locks: [
          { ability: 'weapons', reason: 'the hardpoints are on the table' },
          { ability: 'activeSonar', reason: 'disabled — silence order' },
        ],
      })
    );
    try {
      const names = rendered.allByClass('objectives-lock-name').map((n) => n.props.children);
      assert.deepEqual(names, ['weapons', 'active sonar'], 'named as the command bar names them');
      const reasons = rendered.allByClass('objectives-lock-reason').map((n) => n.props.children);
      assert.deepEqual(reasons, ['the hardpoints are on the table', 'disabled — silence order']);
    } finally {
      await rendered.unmount();
    }
  });

  it('states a shared reason once and names every action it covers', async () => {
    // docs/ui-ux.md §10.5, and §2's no-scroll rule is why: Sorrowgate strikes
    // four buttons under two reasons, and a row apiece pushed the rows beneath
    // them off a panel that has to fit. A player reading `weapons cold` for the
    // fourth time learns nothing the first did not tell them.
    const { rendered } = await panel(
      missionView({
        locks: [
          { ability: 'weapons', reason: 'weapons cold' },
          { ability: 'torpedoes', reason: 'weapons cold' },
          { ability: 'noisemakers', reason: 'disabled — silence order' },
          { ability: 'mines', reason: 'weapons cold' },
        ],
      })
    );
    try {
      const names = rendered.allByClass('objectives-lock-name').map((n) => n.props.children);
      assert.deepEqual(
        names,
        ['weapons · torpedoes · mines', 'noisemakers'],
        'one row per reason, in the order the mission first states each'
      );
      const reasons = rendered.allByClass('objectives-lock-reason').map((n) => n.props.children);
      assert.deepEqual(reasons, ['weapons cold', 'disabled — silence order']);
    } finally {
      await rendered.unmount();
    }
  });

  it('draws no lock list at all when a mission withholds nothing', async () => {
    const { rendered } = await panel(missionView({ locks: [] }));
    try {
      assert.equal(rendered.allByClass('objectives-locks').length, 0);
    } finally {
      await rendered.unmount();
    }
  });

  it('does not leak a held hull’s reason into the panel — that line is the inspector’s', async () => {
    // §10.5 puts `held — no ears in range` on the inspector line and in the
    // hint bar. The panel carries the mission's orders; a second place saying
    // it would be a second thing to keep in agreement.
    const { rendered } = await panel(
      missionView({ held: [{ unitId: 7, reason: MovementHoldReason.Unescorted }] })
    );
    try {
      assert.equal(/held/.test(rendered.text().join(' ')), false);
    } finally {
      await rendered.unmount();
    }
  });
});

describe('the objectives panel: the commander’s one act', () => {
  const ability = (over: Partial<CommanderAbilityView> = {}): CommanderAbilityView => ({
    id: 'sounding',
    label: 'Call the sounding',
    description: 'Every hull in the flight answers at once. Once, and there is no second.',
    available: true,
    spent: false,
    remainingS: 0,
    ...over,
  });

  it('is not rendered at all in a mission that grants none', async () => {
    // The source's rule: "an affordance that could never work is not an
    // affordance with a reason, it is furniture."
    const { rendered } = await panel(missionView());
    try {
      assert.equal(rendered.allByClass('objectives-act').length, 0);
    } finally {
      await rendered.unmount();
    }
  });

  it('rings once when it is available', async () => {
    const { rendered, calls } = await panel(missionView({ ability: ability() }));
    try {
      const button = rendered.byClass('objectives-act-button');
      assert.notEqual((button.props as { disabled?: boolean }).disabled, true);
      await rendered.act(() => {
        (button.props as { onClick?: () => void }).onClick?.();
      });
      assert.equal(calls.rung, 1);
    } finally {
      await rendered.unmount();
    }
  });

  it('dims rather than removes a spent act, and says why it is dead', async () => {
    // §7 again: greyed out *with a reason attached*. What the plateau has
    // already done is part of what the panel is for.
    const { rendered, calls } = await panel(
      missionView({
        ability: ability({ available: false, spent: true, reason: 'rung — there is no second' }),
      })
    );
    try {
      const button = rendered.byClass('objectives-act-button');
      assert.equal((button.props as { disabled?: boolean }).disabled, true);
      assert.match(String(button.props.className), /spent/);
      assert.equal(
        rendered.byClass('objectives-act-reason').props.children,
        'rung — there is no second',
        'the reason replaces the description while the button is dead'
      );
      // Not that clicking it does nothing: this renderer has no event system,
      // so calling `onClick` by hand walks straight past `disabled` the way no
      // browser would. `disabled` being set is the component's whole share of
      // that promise, and it is what is asserted above.
      assert.equal(calls.rung, 0, 'nothing rang from rendering it');
    } finally {
      await rendered.unmount();
    }
  });

  it('reads the description while the act is still to be taken', async () => {
    const live = ability();
    const { rendered } = await panel(missionView({ ability: live }));
    try {
      assert.equal(rendered.byClass('objectives-act-reason').props.children, live.description);
    } finally {
      await rendered.unmount();
    }
  });

  it('counts the act down only while it is running', async () => {
    const quiet = await panel(missionView({ ability: ability({ remainingS: 0 }) }));
    try {
      assert.equal(quiet.rendered.allByClass('objectives-act-running').length, 0);
    } finally {
      await quiet.rendered.unmount();
    }

    const running = await panel(missionView({ ability: ability({ remainingS: 12 }) }));
    try {
      assert.match(
        reads(running.rendered.byClass('objectives-act-running')),
        /ringing · 12s/,
        'whole seconds, as the panel reads it'
      );
    } finally {
      await running.rendered.unmount();
    }
  });
});

describe('the objectives panel: silence owed', () => {
  it('shows the debt only while it is owed, rounded up to the second the player must pay', async () => {
    // docs/mission-sorrowgate.md §4. A permanent zero would be a number
    // nobody reads, so the row is absent rather than showing one.
    const clear = await panel(missionView({ debtS: 0 }));
    try {
      assert.equal(clear.rendered.allByClass('objectives-debt').length, 0);
    } finally {
      await clear.rendered.unmount();
    }

    const owed = await panel(missionView({ debtS: 3.2 }));
    try {
      assert.match(
        reads(owed.rendered.byClass('objectives-debt')),
        /silence owed · 4s/,
        'ceiling, not rounding — a debt of 3.2s is not paid off by 3 seconds of quiet'
      );
    } finally {
      await owed.rendered.unmount();
    }
  });
});

describe('the objectives panel: a row fits the panel that holds it', () => {
  /**
   * `.objectives-body` measured 340 CSS px in a live client on `main` at
   * `4d87c0a`, holding rows of 356 — 16 px of overflow, which put all three
   * `.objectives-progress` right edges outside the panel and cut every
   * `n of m` the mission was counting with (#752).
   *
   * It is the width to lead with because it is the one that was measured, not
   * because it is any kind of bound — the panel is `min(340px, 32vw /
   * --ui-scale)` unconditionally and `46vw` under `@media (max-width: 900px)`,
   * so it is *wider* than 340 at a 900 px viewport and narrower on a small
   * one. The fault does not depend on the number either way: under
   * `content-box` a row overflows its body by the sum of its padding whatever
   * that body measures, and under `border-box` it fits for the same reason.
   * The last test here holds that independence rather than leaving it as an
   * argument.
   */
  const BODY_WIDTH = 340;

  /**
   * Where a row sits, so a descendant rule can be resolved rather than refused.
   *
   * `MissionPanel` renders `section.objectives > div.objectives-body > row`;
   * `GameCanvas` mounts that inside `div.game-under` — the wrapper one `inert`
   * silences for the esc menu (§9.5) — inside `div.game-root`, which carries
   * `--ui-scale`. `.game-under` is easy to leave out and matters: `App.css`
   * already styles a `p` by its wrapper elsewhere, so a chain missing a link
   * would answer such a rule wrongly rather than loudly.
   */
  const ANCESTORS = [
    { tag: 'div', classes: ['game-root'] },
    { tag: 'div', classes: ['game-under'] },
    { tag: 'section', classes: ['objectives'] },
    { tag: 'div', classes: ['objectives-body'] },
  ];

  /** Every row shape a mission can put in the panel, in one view. */
  const shapes = (): MissionView =>
    missionView({
      objectives: [
        // What #752 was measured on: no marker, so a `p`, with a counter in
        // the third column for the overflow to cut.
        objective({ id: 'markerless', progress: { done: 4, of: 3 } }),
        // A marker makes the row a `button`, which the UA boxes the other way.
        objective({ id: 'marker', markerId: CONCOURSE.id, progress: { done: 1, of: 2 } }),
        // A gloss is a second line *inside* the row, so it changes the row's
        // height and must not change its width (§10.5).
        objective({
          id: 'glossed',
          gloss: 'Both tenders, out through the lock.',
          progress: { done: 0, of: 3 },
        }),
        objective({ id: 'met', status: ObjectiveStatus.Met }),
        objective({ id: 'failed', status: ObjectiveStatus.Failed }),
      ],
    });

  /** The tag and classes of every row the panel rendered, in document order. */
  async function rowElements(): Promise<Array<{ tag: string; classes: string[] }>> {
    const { rendered } = await panel(shapes());
    try {
      return rendered.allByClass('objectives-row').map((row) => ({
        tag: String(row.type),
        classes: String((row.props as { className: string }).className).split(/\s+/),
        ancestors: ANCESTORS,
      }));
    } finally {
      await rendered.unmount();
    }
  }

  it('boxes every row shape inside the body, so no progress counter is cut', async () => {
    const rows = await rowElements();
    assert.equal(rows.length, 5, 'all five shapes rendered');

    for (const element of rows) {
      const width = borderBoxWidth({ css: APP_CSS, element, containerContentWidth: BODY_WIDTH });
      assert.ok(
        width <= BODY_WIDTH,
        `a ${element.tag}.${element.classes.join('.')} row is ${width}px in a ${BODY_WIDTH}px body`
      );
    }
  });

  it('boxes the two host tags identically, which is what hid the fault', async () => {
    // The markerless row is a `p` and the marker row is a `button`, and the UA
    // stylesheet gives only the second `border-box`. That is the whole reason
    // #752 survived: the shapes sat side by side in the same panel under the
    // same author CSS, and one of them fitted. They agree now, and a test that
    // only ever rendered a marker row would still have seen nothing.
    const rows = await rowElements();
    const tags = new Set(rows.map((row) => row.tag));
    assert.deepEqual([...tags].sort(), ['button', 'p'], 'both shapes are under test');
    assert.equal(uaBoxSizing('p'), 'content-box');
    assert.equal(uaBoxSizing('button'), 'border-box');

    const widths = new Set(
      rows.map((element) =>
        borderBoxWidth({ css: APP_CSS, element, containerContentWidth: BODY_WIDTH })
      )
    );
    assert.equal(widths.size, 1, `every row shape is one width, got ${[...widths].join(', ')}`);
  });

  it('keeps the counter inside the row, so a row that fits is a counter that fits', async () => {
    // The arithmetic above is about the row. What §10.5 promises is about the
    // number in it — "an objective may say *get both tenders out*" — so this
    // is the step that connects them: the counter is a child of the row and
    // has no width of its own, which is why the row's box is the thing to fix.
    const { rendered } = await panel(shapes());
    try {
      const counters = rendered.allByClass('objectives-progress');
      assert.equal(counters.length, 3, 'three of the five shapes count something');
      for (const counter of counters) {
        assert.equal(
          resolveBox(parseCss(APP_CSS), {
            tag: 'span',
            classes: ['objectives-progress'],
            ancestors: [...ANCESTORS, { tag: 'p', classes: ['objectives-row', 'pending'] }],
          }).width,
          undefined,
          'the counter is sized by its content, so only the row can clip it'
        );
        assert.match(reads(counter), /^\d+ of \d+$/);
      }
    } finally {
      await rendered.unmount();
    }
  });

  it('does not depend on the UI scale, at either end of §11’s 75–200%', async () => {
    // §11's scale is applied as `transform: scale()` on `.objectives` as a
    // whole, so the row and the body it sits in are scaled by one factor and
    // the overflow — a difference between two lengths in the same space —
    // scales with them. Two things have to hold for that to be true, and both
    // are read off the stylesheet rather than asserted about it.
    const rules = parseCss(APP_CSS);
    const row = { tag: 'p', classes: ['objectives-row', 'pending'], ancestors: ANCESTORS };

    // One: nothing in the row's own box depends on the scale variable.
    for (const rule of boxRulesFor(rules, row)) {
      for (const [property, value] of rule.declarations) {
        assert.doesNotMatch(
          value,
          /--ui-scale/,
          `${rule.selector} { ${property}: ${value} } would make the row scale twice`
        );
      }
    }

    // Two: no conditional rule puts the row back on `content-box` at some
    // viewport. The panel does narrow under `@media (max-width: 900px)`, and a
    // row that stopped counting its padding there would overflow again.
    const conditional = rulesTargeting(rules, row).filter((rule) => rule.condition !== null);
    for (const rule of conditional) {
      for (const [property, value] of rule.declarations) {
        if (property !== 'box-sizing') continue;
        assert.equal(
          value,
          'border-box',
          `${rule.condition} { ${rule.selector} } re-boxes the row`
        );
      }
    }

    // And the arithmetic itself, at the width that media query brings and at
    // an absurdly narrow one. 46vw of a 900px viewport is 414, and that is the
    // body's content width rather than 414 less the panel's 1px borders:
    // `.objectives` sets no `box-sizing` either, so it is content-box and its
    // border sits outside the width it declares. The live client agrees — the
    // unconditional `min(340px, …)` reads back as a body of 340, not 338.
    for (const containerContentWidth of [BODY_WIDTH, 414, 120]) {
      assert.ok(
        borderBoxWidth({ css: APP_CSS, element: row, containerContentWidth }) <=
          containerContentWidth,
        `a row overflows a ${containerContentWidth}px body`
      );
    }
  });
  it('gives a mission’s own words a track that cannot widen the row', async () => {
    // #752 fitted the row's border box into the body. The grid inside the row
    // is a separate axis and was untouched by it: a `1fr` track's automatic
    // minimum is min-content, so one long unbreakable token in a mission's own
    // sentence sets a floor the track cannot shrink under and the row grows
    // back out of the box it was just fitted into (#760).
    //
    // Which track to ask about is read off the stylesheet rather than assumed.
    // §10.5 puts the authored sentence and its gloss in one column, and an
    // edit that moved either would move this check with it instead of leaving
    // it guarding a column with nothing in it.
    const rules = parseCss(APP_CSS);
    const rows = await rowElements();
    assert.equal(rows.length, 5, 'all five shapes rendered');

    for (const row of rows) {
      const floors = columnFloors(rules, row);
      for (const authored of ['objectives-text', 'objectives-gloss']) {
        const column = columnOf(rules, {
          tag: 'span',
          classes: [authored],
          ancestors: [...ANCESTORS, { tag: row.tag, classes: row.classes }],
        });
        assert.notEqual(column, undefined, `.${authored} is placed in a column of its own`);
        const floor = floors[(column as number) - 1];
        assert.equal(
          floor.kind,
          'definite',
          `a ${row.tag} row puts .${authored} in a track floored by ${JSON.stringify(floor)}`
        );
      }
    }
  });

  it('lets every child of a row shrink to its track, which the track alone does not', async () => {
    // The track's floor and the item's are two floors, and a grid item's
    // automatic minimum is min-content as well — so `minmax(0, 1fr)` on its
    // own still leaves the span inside it refusing to shrink. Both halves or
    // neither, which is the pair `.contact-log-row` has carried since its own
    // columns overran each other.
    //
    // Read off the rendered tree rather than from a list of class names here,
    // because the failure is about whatever the panel actually puts in a row:
    // a child added later with no `min-width` is exactly the regression, and a
    // hand-written list would not see it.
    const rules = parseCss(APP_CSS);
    const { rendered } = await panel(shapes());
    try {
      const rows = rendered.allByClass('objectives-row');
      assert.equal(rows.length, 5, 'all five shapes rendered');

      let checked = 0;
      for (const row of rows) {
        const parent = {
          tag: String(row.type),
          classes: String((row.props as { className: string }).className).split(/\s+/),
        };
        const children = row.children.filter(
          (child): child is ReactTestInstance => typeof child !== 'string'
        );
        assert.ok(children.length >= 2, 'a row is at least a status word and a sentence');

        for (const child of children) {
          const element = {
            tag: String(child.type),
            classes: String((child.props as { className?: string }).className ?? '')
              .split(/\s+/)
              .filter(Boolean),
            ancestors: [...ANCESTORS, parent],
          };
          assert.equal(
            resolveBox(rules, element).minWidth,
            '0',
            `a ${element.tag}.${element.classes.join('.')} in a ${parent.tag} row can push its track`
          );
          checked += 1;
        }
      }
      // Two spans in every row, a gloss in one of the five and a counter in
      // three: the arithmetic is here so that a shape quietly dropping out of
      // `shapes()` fails rather than shrinking what this walks.
      assert.equal(checked, 14, 'every child of every shape was asked');
    } finally {
      await rendered.unmount();
    }
  });
});
