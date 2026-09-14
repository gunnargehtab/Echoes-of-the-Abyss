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
 * every line in this panel that interpolates a count — `flight SIG ≤ {20}`
 * puts a number in the tree, and a text walker that dropped it would let the
 * assertions pass on a panel showing no number at all.
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

  it('names the SIG ceiling for the flight, not for everything the player owns', async () => {
    // The meter in the top bar is the peak across the whole force; the court's
    // order binds the flight alone (docs/mission-sorrowgate.md §4). Without the
    // word, a compliant flight reads as being in breach of its own freight.
    const { rendered } = await panel(missionView({ sigBudget: 20 }));
    try {
      assert.match(reads(rendered.byClass('objectives-ceiling')), /flight SIG ≤ 20/);
    } finally {
      await rendered.unmount();
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
    const { rendered } = await panel(missionView({ sigBudget: 9 }), { peak: 6, ceiling: 25 });
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
    const { rendered } = await panel(missionView({ debtS: 1.2 }), { peak: 26, ceiling: 25 });
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
    const { rendered } = await panel(missionView(), { peak: 6, ceiling: 20 });
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
          { ability: 'weapons', reason: 'disabled — silence order' },
          { ability: 'activeSonar', reason: 'disabled — silence order' },
        ],
      })
    );
    try {
      const names = rendered.allByClass('objectives-lock-name').map((n) => n.props.children);
      assert.deepEqual(names, ['weapons', 'active sonar'], 'named as the command bar names them');
      const reasons = rendered.allByClass('objectives-lock-reason').map((n) => n.props.children);
      assert.deepEqual(reasons, ['disabled — silence order', 'disabled — silence order']);
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
