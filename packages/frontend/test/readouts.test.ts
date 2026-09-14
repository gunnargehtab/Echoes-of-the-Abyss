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
import { BERTHS, SIG_BANDS, StructureKind, structureStatsFor } from '@echoes/shared';
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
      // `Dredge: no berth — 2 needed, 1 free · a Foundry grants 8`.
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
    assert.match(
      line,
      new RegExp(`Slipway ${BERTHS.SLIPWAY}`),
      'and the Slipway, which §10 grants and the first draft of this line forgot'
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

  it('says TRACKED counts the player’s own entities, not the hostiles holding them', () => {
    const line = trackedDetail(2);
    // Two misreadings to stop, not one. The count is *yours*, not theirs — and
    // it is entities rather than any list of kinds.
    assert.match(line, /2 of your own/, 'the readout a player is most likely to read backwards');
    // And no enumeration: every list this line tried was narrower than the set.
    // Hulls miss a tracked Bastion; hulls and structures miss a mission's own
    // emitters, which are seated on the player's slot and carry exactly what
    // the exposure walk counts.
    // The whole line, not its first clause. Scoping this to the quantity left
    // the third clause — "quieter hulls, or distance, is what lowers it" —
    // naming the set the first clause had just stopped naming, and telling a
    // player whose count includes a structure the wrong lever.
    assert.doesNotMatch(line, /\bhulls\b|\bstructures\b/, 'the set is never enumerated');
    assert.match(line, /never by whom or from where/, '§11: the report is a tier and a count');
  });

  it('says the contact count is what your own ears hold, never the map count', () => {
    assert.match(contactsDetail(3), /never the map count/);
    assert.match(contactsDetail(1), /1 contact you/, 'and agrees with the strip on the plural');
    assert.match(contactsDetail(2), /2 contacts you/);
  });

  it('says biomass buys hulls, because it does', () => {
    // This line read "nothing is priced in it yet" on its first draft, copied
    // from a stale sentence in §13. Seven hulls carry a `biomassCost` and
    // `Match.produce` refuses a hull short in Biomass alone exactly as it
    // refuses one short in Nodules, so a Directorate player was being told the
    // opposite of the truth about the account their roster runs on.
    const line = biomassDetail(48);
    assert.match(line, /buys hulls/);
    assert.doesNotMatch(line, /nothing is priced/);
  });

  it('says the Bastion makes draw and asks for nothing, which is a new base', () => {
    // The covered branch is what a player reads at T+0, before any tap exists:
    // the capacity is the Bastion's own, and "every structure asks for its
    // share" was false at both ends — a Vent Tap and a turret ask for nothing.
    const line = drawDetail({ capacity: 6, demand: 0, satisfaction: 1 });
    assert.match(
      line,
      new RegExp(`Bastion makes ${structureStatsFor(StructureKind.Bastion).drawCapacity}`),
      'the figure is structures.ts, not a second copy'
    );
    assert.match(line, /asks for nothing/);
    assert.match(line, /Refinery, the Foundry and the Slipway are what spend it/);
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

/**
 * The element the shell hands over, and the canvas inside it.
 *
 * `StripReadouts` forwards a wheel to that canvas rather than reaching for a
 * sibling's by selector, so a test can watch what it dispatched.
 */
function stubHost(): {
  host: { current: HTMLElement | null };
  dispatched: Array<{ type: string; deltaY: number }>;
} {
  const dispatched: Array<{ type: string; deltaY: number }> = [];
  const canvas = {
    dispatchEvent: (event: WheelEvent) => {
      dispatched.push({ type: event.type, deltaY: event.deltaY });
      return true;
    },
  };
  const host = { current: { querySelector: () => canvas } as unknown as HTMLElement };
  return { host, dispatched };
}

const mount = (boxes: ReadoutBox[], host = stubHost().host) =>
  render(createElement(StripReadouts, { boxes, host }));

describe('the strip explains itself: the surface', () => {
  it('speaks the strip’s own text as the control’s name', async () => {
    const view = await mount([box()]);
    // Not a label of our own invention: the accessible name is the string the
    // renderer drew, so what is heard and what is seen cannot drift apart.
    assert.deepEqual(view.buttonNames(), ['BERTHS 3/6']);
    await view.unmount();
  });

  it('keeps the line in the accessible tree while it is off screen', async () => {
    const view = await mount([box()]);
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
    const view = await mount([box()]);
    const expanded = () =>
      (view.button('BERTHS 3/6').props as { 'aria-expanded'?: boolean })['aria-expanded'];
    assert.equal(expanded(), false, 'shut to begin with');
    await click(view, 'BERTHS 3/6');
    assert.equal(expanded(), true, 'a tap pins it open — no hover, and no key named');
    await click(view, 'BERTHS 3/6');
    assert.equal(expanded(), false, 'and the next tap closes it');
    await view.unmount();
  });

  it('closes the line on Escape, and only swallows the press when it closed one', async () => {
    const view = await mount([box()]);
    const expanded = () =>
      (view.button('BERTHS 3/6').props as { 'aria-expanded'?: boolean })['aria-expanded'];
    const layer = view.byClass('readouts');

    // A target the DOM can actually produce: an element, which always has
    // `blur`, and which either matches `:focus-visible` or does not. Asking
    // whether it *has* `blur` was the first version of this guard and was
    // constant-true, so Escape was swallowed whatever was on screen.
    const press = (focusVisible: boolean) => {
      let blurred = false;
      let stopped = false;
      const event = {
        key: 'Escape',
        target: {
          blur: () => {
            blurred = true;
          },
          matches: (query: string) => query === ':focus-visible' && focusVisible,
        },
        stopPropagation: () => {
          stopped = true;
        },
      };
      return {
        fire: () => (layer.props as { onKeyDown: (e: unknown) => void }).onKeyDown(event),
        was: () => ({ blurred, stopped }),
      };
    };

    // 1 — pinned by a tap, and the pointer is nowhere near it. Escape closes it
    // and spends the press, whether or not the keyboard is what showed it.
    await click(view, 'BERTHS 3/6');
    assert.equal(expanded(), true, 'a tap pins it open');
    const pinned = press(false);
    await view.act(() => pinned.fire());
    assert.equal(expanded(), false, 'the pin is released');
    assert.ok(pinned.was().stopped, 'and the press is spent on the line');

    // 2 — nothing pinned, but the keyboard put the line on screen. Same.
    const focused = press(true);
    await view.act(() => focused.fire());
    assert.ok(focused.was().blurred, 'blurring is what closes the focus route');
    assert.ok(focused.was().stopped, 'and that press is spent too');

    // 3 — nothing pinned and nothing focus-visible, which is exactly where the
    // old guard was wrong: click a readout to pin, click again to unpin, and
    // focus is still on a button Chrome does not call `:focus-visible`. Nothing
    // is on screen to close, so the press belongs to the esc menu (§9.5).
    const quiet = press(false);
    await view.act(() => quiet.fire());
    assert.ok(!quiet.was().stopped, 'with nothing shown, Escape reaches the menu');
    assert.ok(!quiet.was().blurred, 'and the focus is left where the player put it');

    await view.unmount();
  });

  it('hands the canvas back the two gestures it would otherwise lose', async () => {
    const { host, dispatched } = stubHost();
    const view = await mount([box()], host);
    const layer = view.byClass('readouts').props as {
      onContextMenu: (e: unknown) => void;
      onWheel: (e: unknown) => void;
    };

    // The context menu is the outright bug: EchoRenderer binds `contextmenu`
    // on the canvas for the sole purpose of preventing it — App.css says why,
    // "right-click is a move order, not a browser menu" — and these controls
    // are not the canvas's descendants, so without this a right-click on a
    // readout opens the browser's menu over a live match.
    let prevented = false;
    await view.act(() => {
      layer.onContextMenu({
        preventDefault: () => {
          prevented = true;
        },
      });
    });
    assert.ok(prevented, 'the browser context menu is refused');

    // And the wheel is forwarded rather than swallowed, at the host the shell
    // handed over rather than at a sibling found by selector.
    await view.act(() => {
      layer.onWheel({ deltaY: -240, clientX: 40, clientY: 20 });
    });
    assert.deepEqual(
      dispatched,
      [{ type: 'wheel', deltaY: -240 }],
      'the zoom reaches the canvas, carrying the delta that was scrolled'
    );

    await view.unmount();
  });

  it('walks the strip left to right, so Tab does', async () => {
    const boxes = [
      box({ key: 'sig', value: 'SIG 042 / 100', detail: sigDetail(42, 5, 1) }),
      box({ key: 'nodules', value: 'NODULES 340', detail: nodulesDetail(340) }),
      box(),
    ];
    const view = await mount(boxes);
    // The controls are in the order the renderer reported them, which is the
    // order §2 lays the strip out in. Tab order is DOM order, so this is the
    // whole of the keyboard traversal: no roving index, nothing to keep in sync.
    assert.deepEqual(view.buttonNames(), ['SIG 042 / 100', 'NODULES 340', 'BERTHS 3/6']);
    await view.unmount();
  });

  it('drops a readout the strip dropped, rather than explaining a number that is gone', async () => {
    const { host } = stubHost();
    const view = await mount(
      [box(), box({ key: 'clock', value: 'T+04:12', detail: clockDetail() })],
      host
    );
    assert.equal(view.buttonNames().length, 2);
    // The clock is the second thing §2 drops when the strip runs out of room.
    await view.update(createElement(StripReadouts, { boxes: [box()], host }));
    assert.deepEqual(view.buttonNames(), ['BERTHS 3/6']);
    await view.unmount();
  });
});
