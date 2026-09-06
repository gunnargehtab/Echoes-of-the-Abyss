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
import {
  MovementHoldReason,
  ObjectiveStatus,
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

async function panel(view: MissionView): Promise<{ rendered: Rendered; calls: Calls }> {
  const calls: Calls = { focused: [], rung: 0 };
  const rendered = await render(
    createElement(MissionPanel, {
      view,
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
