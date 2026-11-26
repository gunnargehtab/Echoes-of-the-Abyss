import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FlightPanel } from '../src/game/FlightPanel.tsx';
import type { FlightReading } from '../src/game/flightCamera.ts';
import { panelType } from '../src/game/uiScale.ts';
import { APP_CSS, parseCss } from './support/cssBox.ts';

/** Every string the rendered tree contains, in document order. */
function textOf(tree: ReactTestRenderer): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node !== null && typeof node === 'object' && 'children' in node)
      walk((node as { children: unknown }).children);
  };
  walk(tree.toJSON());
  return out;
}

const reading = (over: Partial<FlightReading>): FlightReading => ({
  flying: false,
  navigating: false,
  depthM: 300,
  bearingDeg: 326,
  upX: 0,
  upY: -1,
  inverted: false,
  blocked: false,
  ...over,
});

const noop = () => {};

/**
 * docs/free-water-slice.md §9, Opening view: the camera panel keeps its verbs
 * in their order and its conditions, and the decorative-life disclosure is no
 * longer its first line but the shell's own, in the corner. FLIGHT left the
 * panel with #1775, when NAV became the one way into flight
 * (docs/free-camera.md §4, "The study's camera feel", decision 4).
 */
describe('free-water camera panel', () => {
  const render = (flight: FlightReading | null) => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        createElement(FlightPanel, {
          reading: flight,
          onNav: noop,
          onHome: noop,
          onStep: noop,
        })
      );
    });
    return tree;
  };

  it('keeps NAV and HOME in that order, with no FLIGHT, and carries no legend', () => {
    const tree = render(null);
    assert.deepEqual(textOf(tree), ['NAV', 'HOME']);
    assert.equal(tree.root.findByType('section').props['aria-label'], 'Free-water camera');
  });

  it('shows the EYE readout and the clearance refusal only in flight', () => {
    const tree = render(reading({ flying: true, blocked: true }));
    const text = textOf(tree).join(' ');
    assert.match(text, /EYE\s+300\s+m/);
    assert.match(text, /NO CAMERA CLEARANCE/);
    assert.doesNotMatch(text, /DECORATIVE LIFE/);
    for (const idle of [render(null), render(reading({ blocked: true }))]) {
      const outside = textOf(idle).join(' ');
      assert.doesNotMatch(outside, /EYE/);
      assert.doesNotMatch(outside, /NO CAMERA CLEARANCE/);
    }
  });

  it('shows the NAV status line and its motion buttons only in NAV', () => {
    const tree = render(reading({ navigating: true }));
    const text = textOf(tree).join(' ');
    assert.match(text, /FLEET SHORTCUTS SUSPENDED/);
    assert.ok(tree.root.findAllByType('button').length > 2, 'the motion buttons');
    assert.doesNotMatch(textOf(render(null)).join(' '), /FLEET SHORTCUTS SUSPENDED/);
  });
});

/**
 * The value a `font-size` resolves to under GameCanvas's variables, in parent
 * ems, as a browser computes it: a bare number is no length, so a declaration
 * that comes to one is invalid at computed-value time and the element keeps
 * its parent's size (#1934). Handles the `calc()` products App.css writes.
 */
function fontSizeEm(value: string, uiScale: number): number {
  const vars: Record<string, number> = {
    '--ui-scale': uiScale,
    '--panel-type': panelType(uiScale),
  };
  const resolved = value.replace(/var\((--[\w-]+)(?:,\s*[^)]*)?\)/g, (_, name: string) =>
    String(vars[name])
  );
  const body = /^calc\((.*)\)$/.exec(resolved)?.[1] ?? resolved;
  let em = 0;
  let product = 1;
  for (const factor of body.split('*').map((part) => part.trim())) {
    const unit = /^([\d.]+)em$/.exec(factor);
    if (unit !== null) em++;
    product *= Number(unit === null ? factor : unit[1]);
  }
  assert.ok(Number.isFinite(product), `\`${value}\` resolves to a number`);
  return em === 1 ? product : 1;
}

/**
 * docs/ui-ux.md §11: the camera panel's type takes the orders panel's square
 * root of the UI scale, since its rows must all be on screen at once.
 */
describe('free-water camera panel type', () => {
  const sizes = parseCss(APP_CSS)
    .filter((rule) => rule.condition === null && rule.selector === '.flight-panel')
    .flatMap((rule) => rule.declarations.filter(([property]) => property === 'font-size'));

  it('sets its own type, once', () => {
    assert.equal(sizes.length, 1, '.flight-panel declares one font-size');
  });

  it("hands that type to NAV's motion buttons, which a user agent sets apart", () => {
    const own = parseCss(APP_CSS)
      .filter((rule) => rule.condition === null && rule.selector === '.flight-panel button')
      .flatMap((rule) => rule.declarations)
      .filter(([property]) => property === 'font-size' || property === 'font');
    assert.equal(own.length, 1, '.flight-panel button declares one font-size');
    // In the panel's ems, so it moves with the panel, and the user agent's
    // 13.33 px of 16 at 100%, so the accepted 100% frame does not move.
    assert.ok(Math.abs(fontSizeEm(own[0]![1], 1) * 16 - 40 / 3) < 0.01, own[0]![1]);
  });

  for (const uiScale of [0.75, 1, 1.5, 2]) {
    it(`draws type at the orders panel's size at ${uiScale * 100}%`, () => {
      const want = uiScale * panelType(uiScale);
      const got = fontSizeEm(sizes[0]![1], uiScale);
      assert.ok(Math.abs(got - want) < 1e-9, `${got} em, want ${want} em`);
    });
  }
});
