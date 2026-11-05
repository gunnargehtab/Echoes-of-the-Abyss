import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FlightPanel } from '../src/game/FlightPanel.tsx';
import type { FlightReading } from '../src/game/flightCamera.ts';

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
 * docs/free-water-slice.md §9, Opening view: the camera panel keeps its three
 * verbs in their order and its conditions, and the decorative-life disclosure
 * is no longer its first line but the shell's own, in the corner.
 */
describe('free-water camera panel', () => {
  const render = (flight: FlightReading | null) => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        createElement(FlightPanel, {
          reading: flight,
          onFlight: noop,
          onNav: noop,
          onHome: noop,
          onStep: noop,
        })
      );
    });
    return tree;
  };

  it('keeps FLIGHT, NAV and HOME in that order, and carries no legend', () => {
    const tree = render(null);
    assert.deepEqual(textOf(tree), ['FLIGHT', 'NAV', 'HOME']);
    assert.equal(tree.root.findByType('section').props['aria-label'], 'Free-water camera');
  });

  it('shows the EYE readout and the clearance refusal only in flight', () => {
    const tree = render(reading({ flying: true, blocked: true }));
    const text = textOf(tree).join(' ');
    assert.match(text, /EYE\s+300\s+m/);
    assert.match(text, /NO CAMERA CLEARANCE/);
    assert.doesNotMatch(text, /DECORATIVE LIFE/);
  });

  it('shows the NAV status line and its motion buttons only in NAV', () => {
    const tree = render(reading({ navigating: true }));
    const text = textOf(tree).join(' ');
    assert.match(text, /FLEET SHORTCUTS SUSPENDED/);
    assert.ok(tree.root.findAllByType('button').length > 3, 'the motion buttons');
    assert.doesNotMatch(textOf(render(null)).join(' '), /FLEET SHORTCUTS SUSPENDED/);
  });
});
