/**
 * The controls screen (#494).
 *
 * docs/ui-ux.md §11 commits to "full rebinding, including a one-handed layout,
 * and no timing-critical chords", and calls accessibility a correctness
 * requirement rather than a feature tier. This screen is where that commitment
 * is kept, and until now nothing checked it.
 *
 * `bindings.ts` — which key belongs to which action, which codes are reserved,
 * how a conflict is detected — already has its own suite. What is untested is
 * the screen: whether pressing a key after clicking a row actually rebinds it,
 * whether a reserved key is refused with a reason instead of silently taken,
 * and whether Escape leaves the binding as it was.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { clearStorage, dispatchWindow, installStorage } from './support/headless.ts';
import { render, type Rendered } from './support/screen.ts';
import { ControlsScreen } from '../src/menu/ControlsScreen.tsx';
import {
  ACTIONS,
  DEFAULT_BINDINGS,
  LAYOUTS,
  RESERVED_CODES,
  conflictsIn,
  resolveBindings,
} from '../src/input/bindings.ts';
import { loadSettings } from '../src/settings/store.ts';

async function controls(): Promise<Rendered> {
  return render(createElement(ControlsScreen, { onBack: () => {} }));
}

/** The live bindings as the screen would resolve them from what is stored. */
function stored() {
  const settings = loadSettings();
  return resolveBindings(settings.bindingLayout, settings.bindings);
}

/** Click the row for one action, arming a capture. */
async function arm(view: Rendered, label: string): Promise<void> {
  const row = view.button(label);
  await view.act(() => {
    (row.props as { onClick?: () => void }).onClick?.();
  });
}

/** Press a physical key, the way the window-level capture listener sees it. */
async function press(view: Rendered, code: string): Promise<void> {
  await view.act(() => {
    dispatchWindow('keydown', { code });
  });
}

/** A label the screen renders for some rebindable action. */
const REBINDABLE = ACTIONS[0]!;

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  clearStorage();
});

describe('the controls screen: §11 full rebinding', () => {
  it('rebinds an action to the key that was pressed', async () => {
    const view = await controls();
    try {
      assert.equal(stored()[REBINDABLE.action], DEFAULT_BINDINGS[REBINDABLE.action]);

      await arm(view, REBINDABLE.label);
      await press(view, 'KeyJ');

      assert.equal(stored()[REBINDABLE.action], 'KeyJ', 'the new key took');
      assert.equal(loadSettings().bindingLayout, 'custom', 'and the layout is the player’s now');
    } finally {
      await view.unmount();
    }
  });

  it('does not listen until a row is armed', async () => {
    const view = await controls();
    try {
      await press(view, 'KeyJ');
      assert.deepEqual(stored(), DEFAULT_BINDINGS, 'a stray keypress rebinds nothing');
    } finally {
      await view.unmount();
    }
  });

  it('refuses a reserved key, says why, and leaves the binding alone', async () => {
    const view = await controls();
    try {
      const before = stored()[REBINDABLE.action];
      await arm(view, REBINDABLE.label);

      // Digit keys recall control groups, "which has no other route (§9)".
      await press(view, 'Digit1');

      assert.equal(stored()[REBINDABLE.action], before, 'the binding is untouched');
      const alert = view.allByClass('menu-refusal');
      assert.ok(alert.length > 0, 'and the screen says so rather than failing silently');
      assert.ok(
        view.shows(RESERVED_CODES.get('Digit1')!),
        'giving the reason the key is reserved, not just that it is'
      );
    } finally {
      await view.unmount();
    }
  });

  it('cancels a capture on Escape without changing anything', async () => {
    const view = await controls();
    try {
      await arm(view, REBINDABLE.label);
      await press(view, 'Escape');
      assert.deepEqual(stored(), DEFAULT_BINDINGS, 'Escape is a way out, not a binding');

      // And the capture really ended: the next key is a stray one again.
      await press(view, 'KeyJ');
      assert.deepEqual(stored(), DEFAULT_BINDINGS, 'the row disarmed');
    } finally {
      await view.unmount();
    }
  });

  it('offers the one-handed layout §11 requires, and can return to default', async () => {
    const view = await controls();
    try {
      await arm(view, 'One-handed');
      assert.deepEqual(stored(), LAYOUTS.oneHanded, 'the layout applied whole');
      assert.equal(loadSettings().bindingLayout, 'oneHanded');

      await arm(view, 'Standard');
      assert.deepEqual(stored(), LAYOUTS.default, 'and the way back is one click');
    } finally {
      await view.unmount();
    }
  });
});

describe('the controls screen: conflicts', () => {
  it('marks both sides of a clash, not just the key that moved', async () => {
    const view = await controls();
    try {
      // Take one action's key and give it to another: now two actions answer
      // to the same key, and the player has to be able to see both.
      const victim = ACTIONS.find((spec) => spec.action !== REBINDABLE.action)!;
      const collide = DEFAULT_BINDINGS[victim.action];
      await arm(view, REBINDABLE.label);
      await press(view, collide);

      const clash = conflictsIn(stored());
      assert.ok(clash.length > 0, 'the bindings really do clash now');

      const marked = view
        .allByClass('menu-binding-row')
        .filter((row) => String((row.props as { className: string }).className).includes('clash'));
      assert.equal(marked.length, 2, 'both rows are marked, not only the one just changed');
    } finally {
      await view.unmount();
    }
  });
});
