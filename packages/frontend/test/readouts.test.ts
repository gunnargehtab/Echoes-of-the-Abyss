/**
 * The top strip's explanations (#724) — docs/ui-ux.md §2, §7, §11.
 *
 * §2's permanent strip is correct, permanent and mute: `BERTHS 3/6` is a fact
 * about the player's navy that a player who has not read docs/economy.md §10
 * cannot act on. #720's report is that most of the text on screen is gibberish
 * to a player, and this strip is the permanent half of it.
 *
 * What is asserted here is what each line *claims about the number*, never how
 * it is marked up — the rule at the head of the frontend screen tests, and the
 * reason a screenshot is the other half of this change rather than a substitute
 * for it. So: that the berths line names the Foundry's grant and reads it from
 * `BERTHS` rather than a literal, that the draw line refuses to call a rate a
 * balance, that the tracked line says whose hulls are counted — and, on the
 * surface itself, that the explanation is in the accessible tree whether it is
 * on screen or not.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { BERTHS, SIG_BANDS } from '@echoes/shared';
import './support/headless.ts';
import { render, click } from './support/screen.ts';
import {
  bandDetail,
  berthsDetail,
  biomassDetail,
  clockDetail,
  contactsDetail,
  crystalDetail,
  drawDetail,
  mapDetail,
  nodulesDetail,
  sigDetail,
  trackedDetail,
  type ReadoutBox,
} from '../src/game/readouts.ts';
import { StripReadouts } from '../src/game/StripReadouts.tsx';

/** Every line the strip can show, so a new one cannot be added unexplained. */
const EVERY_LINE = [
  nodulesDetail(340),
  crystalDetail(12),
  biomassDetail(48),
  berthsDetail(3, 6),
  drawDetail({ capacity: 12, demand: 18, satisfaction: 12 / 18 }),
  sigDetail(42, 5, 1),
  bandDetail('drive hum', 1),
  trackedDetail(2),
  contactsDetail(3),
  clockDetail(),
  mapDetail('SORROWGATE'),
];

describe('the strip explains itself: what each line claims', () => {
  it('says the quantity, what it is measured against, and what moves it', () => {
    for (const line of EVERY_LINE) {
      // §7's register is clause-separated, the way a refusal's is:
      // `Dredge: no berth — 2 needed, 1 free · a Foundry grants 4`.
      assert.ok(
        line.split(' · ').length >= 3,
        `a line with fewer than three clauses is not §7's register: ${line}`
      );
    }
  });

  it('names no key, on any line — a touchscreen has none to press', () => {
    // #722 §4 is the open bug for the other half of this: a held harvester line
    // that named `V throttle` on a device with no keyboard. A line that is
    // reachable by tap may not tell the player to press something.
    for (const line of EVERY_LINE) {
      assert.doesNotMatch(line, /\bpress\b|\bkey\b|\bhold [A-Z]\b/i, `names a key: ${line}`);
    }
  });

  it('reads the berth grants from BERTHS rather than writing them twice', () => {
    const line = berthsDetail(3, 6);
    assert.match(line, /3 of 6 in use/, 'the quantity is the report the strip drew');
    assert.match(
      line,
      new RegExp(`Bastion grants ${BERTHS.BASTION}`),
      'the Bastion grant is economy.md §10 through the constant'
    );
    assert.match(
      line,
      new RegExp(`Foundry ${BERTHS.FOUNDRY}`),
      'and the Foundry grant, which is the only way to raise the ceiling'
    );
    assert.match(line, new RegExp(`ceiling of ${BERTHS.CEILING}`), 'and the hard ceiling');
    assert.match(
      line,
      /keel is laid, not when it launches/,
      'and §10’s rule that a queued hull already costs its berths'
    );
  });

  it('says at the ceiling that the next hull is refused, and not before', () => {
    assert.match(berthsDetail(6, 6), /the next hull is refused/);
    assert.doesNotMatch(berthsDetail(5, 6), /refused/);
  });

  it('refuses to let the draw rate read as a balance', () => {
    const covered = drawDetail({ capacity: 20, demand: 12, satisfaction: 1 });
    assert.match(covered, /20 made against 12 asked for/, 'capacity over demand, both named');
    assert.match(covered, /never banked/, 'economy.md §2: the one resource never stockpiled');
    assert.match(covered, /surplus is simply lost/, 'which is what "never banked" costs');
  });

  it('quotes the draw deficit as the satisfaction the bar is already inked by', () => {
    const short = drawDetail({ capacity: 9, demand: 18, satisfaction: 0.5 });
    assert.match(short, /runs at 50%/, 'the report’s own field, not a second arithmetic');
    assert.match(
      short,
      /build a tap, or lose a consumer/,
      'a deficit is a setback, never a spiral'
    );
  });

  it('says SIG is a peak over the player’s own hulls, with §3’s stops', () => {
    const line = sigDetail(42, 5, 1);
    assert.match(line, /not the average/, '§3: the loudest hull is the one that gets you found');
    assert.match(line, new RegExp(`amber from ${SIG_BANDS.AMBER}`), '§3’s stops, via SIG_BANDS');
    assert.match(line, new RegExp(`red from ${SIG_BANDS.RED}`));
    assert.match(
      line,
      new RegExp(`1 of 5 over ${SIG_BANDS.LOUD}`),
      '§3’s second line: loud is over 60, five below the red stop'
    );
  });

  it('says TRACKED counts the player’s own hulls, not the hostiles holding them', () => {
    const line = trackedDetail(2);
    assert.match(
      line,
      /2 of your own hulls/,
      'the readout a player is most likely to read backwards'
    );
    assert.match(line, /never by whom or from where/, '§11: the report is a tier and a count');
  });

  it('says the contact count is what your own ears hold, never the map count', () => {
    assert.match(contactsDetail(3), /never the map count/);
    assert.match(contactsDetail(1), /1 contact you/, 'and agrees with the strip on the plural');
    assert.match(contactsDetail(2), /2 contacts you/);
  });

  it('tells the player biomass buys nothing yet, which the number cannot', () => {
    assert.match(biomassDetail(48), /nothing is priced in it yet/);
  });

  it('reads the band label the mix already chose, and names the masking', () => {
    assert.match(bandDetail('full plant', 0.6), /full plant/, 'the label is selfMix’s, not a copy');
    assert.match(bandDetail('full plant', 0.6), /drowning out the water/, '§11’s `– masking`');
    assert.match(bandDetail('silent running', 1.4), /the water comes back up/, 'and its inverse');
  });
});

/** One readout, positioned anywhere — geometry is not what these assert. */
function box(over: Partial<ReadoutBox> = {}): ReadoutBox {
  return {
    key: 'berths',
    x: 300,
    y: 10,
    width: 80,
    height: 14,
    value: 'BERTHS 3/6',
    detail: berthsDetail(3, 6),
    ...over,
  };
}

describe('the strip explains itself: the surface', () => {
  it('speaks the strip’s own text as the control’s name', async () => {
    const view = await render(createElement(StripReadouts, { boxes: [box()] }));
    // Not a label of our own invention: the accessible name is the string the
    // renderer drew, so what is heard and what is seen cannot drift apart.
    assert.deepEqual(view.buttonNames(), ['BERTHS 3/6']);
    await view.unmount();
  });

  it('keeps the line in the accessible tree while it is off screen', async () => {
    const view = await render(createElement(StripReadouts, { boxes: [box()] }));
    const button = view.button('BERTHS 3/6');
    const described = (button.props as { 'aria-describedby'?: string })['aria-describedby'];
    assert.equal(typeof described, 'string', 'the control points at its explanation');
    // The explanation is rendered whether or not it is visible: clipped, never
    // `display: none`, or `aria-describedby` would resolve to nothing and a
    // screen reader would hear the number with no line attached.
    assert.ok(
      view.shows('a Bastion grants'),
      'the line is present before anything has been hovered or opened'
    );
    await view.unmount();
  });

  it('opens on a tap and closes on the next one, which is the route touch has', async () => {
    const view = await render(createElement(StripReadouts, { boxes: [box()] }));
    const expanded = () =>
      (view.button('BERTHS 3/6').props as { 'aria-expanded'?: boolean })['aria-expanded'];
    assert.equal(expanded(), false, 'shut to begin with');
    await click(view, 'BERTHS 3/6');
    assert.equal(expanded(), true, 'a tap pins it open — no hover, and no key named');
    await click(view, 'BERTHS 3/6');
    assert.equal(expanded(), false, 'and the next tap closes it');
    await view.unmount();
  });

  it('walks the strip left to right, so Tab does', async () => {
    const boxes = [
      box({ key: 'sig', value: 'SIG 042 / 100', detail: sigDetail(42, 5, 1) }),
      box({ key: 'nodules', value: 'NODULES 340', detail: nodulesDetail(340) }),
      box(),
    ];
    const view = await render(createElement(StripReadouts, { boxes }));
    // The controls are in the order the renderer reported them, which is the
    // order §2 lays the strip out in. Tab order is DOM order, so this is the
    // whole of the keyboard traversal: no roving index, nothing to keep in sync.
    assert.deepEqual(view.buttonNames(), ['SIG 042 / 100', 'NODULES 340', 'BERTHS 3/6']);
    await view.unmount();
  });

  it('drops a readout the strip dropped, rather than explaining a number that is gone', async () => {
    const view = await render(
      createElement(StripReadouts, {
        boxes: [box(), box({ key: 'clock', value: 'T+04:12', detail: clockDetail() })],
      })
    );
    assert.equal(view.buttonNames().length, 2);
    // The clock is the second thing §2 drops when the strip runs out of room.
    await view.update(createElement(StripReadouts, { boxes: [box()] }));
    assert.deepEqual(view.buttonNames(), ['BERTHS 3/6']);
    await view.unmount();
  });
});
