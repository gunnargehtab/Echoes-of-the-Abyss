/**
 * The settings screen (#494).
 *
 * docs/ui-ux.md §11 opens by saying accessibility here is "a correctness
 * requirement, not a feature tier", and this screen is where four of its
 * commitments are actually implemented: UI scale 75–200%, three colour-vision
 * palettes beyond the standard one, the visual-first preset, and reduced
 * motion. A commitment with nothing holding it is a promise, so what this file
 * checks is that each control exists, spans the range §11 states, and reaches
 * the store — not what any of them looks like.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { clearStorage, installStorage } from './support/headless.ts';
import { render, type Rendered } from './support/screen.ts';
import { SettingsScreen } from '../src/menu/SettingsScreen.tsx';
import { loadSettings, UI_SCALE_MAX, UI_SCALE_MIN } from '../src/settings/store.ts';
import { PALETTE_LABEL, PALETTE_NAMES } from '../src/game/palette.ts';
import { CONTACT_BOOST_MAX_DB } from '../src/audio/engine.ts';

async function settings(): Promise<Rendered> {
  return render(createElement(SettingsScreen, { onBack: () => {}, onControls: () => {} }));
}

/** Drive a range input the way a slider drag does. */
async function slide(view: Rendered, node: { props: Record<string, unknown> }, value: number) {
  await view.act(() => {
    (node.props.onChange as (e: unknown) => void)({ target: { value: String(value) } });
  });
}

/** Every `<input type="range">` on the screen, with its label. */
function sliders(view: Rendered) {
  return view.root
    .findAll((node) => node.type === 'input' && node.props.type === 'range')
    .map((node) => ({ node, min: Number(node.props.min), max: Number(node.props.max) }));
}

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  clearStorage();
});

describe('the settings screen: §11 commitments', () => {
  it('offers UI scale across exactly the range §11 states', async () => {
    const view = await settings();
    try {
      const scale = sliders(view).find(
        (s) => s.min === UI_SCALE_MIN * 100 && s.max === UI_SCALE_MAX * 100
      );
      assert.ok(scale !== undefined, '§11: "UI scale 75%–200%"');

      await slide(view, scale.node, 200);
      assert.equal(loadSettings().uiScale, UI_SCALE_MAX, 'the top of the range reaches the store');
      await slide(view, scale.node, 75);
      assert.equal(loadSettings().uiScale, UI_SCALE_MIN, 'and the bottom');
    } finally {
      await view.unmount();
    }
  });

  it('ships every colour-vision palette, not just the standard one', async () => {
    // §11: "Three additional palettes ship regardless: deuteranopia,
    // protanopia, tritanopia." Four in total with the art direction's own.
    const view = await settings();
    try {
      assert.ok(PALETTE_NAMES.length >= 4, 'the standard palette and the three §11 requires');

      // Found by the label a player reads, not by a class name: the promise is
      // that each palette is offered *by name*, and that is the thing to hold.
      for (const name of PALETTE_NAMES) {
        const option = view.button(PALETTE_LABEL[name]);
        await view.act(() => {
          (option.props as { onClick?: () => void }).onClick?.();
        });
        assert.equal(loadSettings().palette, name, `${PALETTE_LABEL[name]} reaches the store`);
      }
    } finally {
      await view.unmount();
    }
  });

  it('carries the two presets §11 names, and they persist', async () => {
    const view = await settings();
    try {
      const toggles = view.root.findAll(
        (node) => node.type === 'input' && node.props.type === 'checkbox'
      );
      assert.ok(toggles.length >= 3, 'reduced motion, visual-first and mono are all toggles');

      for (const toggle of toggles) {
        await view.act(() => {
          (toggle.props.onChange as (e: unknown) => void)({ target: { checked: true } });
        });
      }
      const saved = loadSettings();
      assert.equal(saved.reducedMotion, true, '§11: a reduced-motion mode');
      assert.equal(saved.visualFirst, true, '§11: the visual-first preset');
      assert.equal(
        saved.mono,
        true,
        '§11: spatialisation is a rendering choice, never information'
      );
    } finally {
      await view.unmount();
    }
  });

  it('lets contacts be boosted and atmosphere only turned down', async () => {
    // audio-direction.md §11, enforced in the engine and offered here: the
    // contact bus is the one a user trim may take above unity.
    const view = await settings();
    try {
      const boost = sliders(view).find((s) => s.max === CONTACT_BOOST_MAX_DB);
      assert.ok(boost !== undefined, `a contact boost that reaches +${CONTACT_BOOST_MAX_DB} dB`);
      await slide(view, boost.node, CONTACT_BOOST_MAX_DB);
      assert.equal(loadSettings().contactBoostDb, CONTACT_BOOST_MAX_DB);

      const volumes = sliders(view).filter((s) => s.max === 100);
      assert.ok(volumes.length > 0, 'and the atmosphere buses stop at unity');
    } finally {
      await view.unmount();
    }
  });
});

describe('the settings screen: reading what is stored', () => {
  it('opens showing what was saved, not the defaults', async () => {
    const first = await settings();
    const scale = sliders(first).find((s) => s.max === UI_SCALE_MAX * 100)!;
    await slide(first, scale.node, 150);
    await first.unmount();

    const second = await settings();
    try {
      const reopened = sliders(second).find((s) => s.max === UI_SCALE_MAX * 100)!;
      assert.equal(
        Number(reopened.node.props.value),
        150,
        'the slider came back where it was left'
      );
    } finally {
      await second.unmount();
    }
  });
});
