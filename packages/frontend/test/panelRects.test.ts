/**
 * The floating panels' rects, as the shell hands them to the chart for a
 * mission marker's name to keep out from under (docs/ui-ux.md §10.5, #1662).
 *
 * The runner lays nothing out and has no `MutationObserver`, so the boxes and
 * both observers are modelled here: a box is whatever the test says it is,
 * and an observer fires when the test says the browser would have.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { FLOATING_PANELS, HINT_ROW_PANELS, watchPanels } from '../src/game/panelRects.ts';
import type { PanelRect } from '../src/game/EchoRenderer.ts';

type Rect = { left: number; top: number; width: number; height: number };

/** An element whose box the test lays out. */
class Boxed {
  constructor(public rect: Rect) {}
  getBoundingClientRect(): Rect {
    return this.rect;
  }
}

/**
 * The layer the panels float in, answering the two queries `watchPanels`
 * makes: the floating panels, and the panels on the hint line's row.
 */
class Layer {
  panels: Boxed[] = [];
  hintRow: Boxed[] = [];
  querySelectorAll(selector: string): Boxed[] {
    if (selector === FLOATING_PANELS) return this.panels;
    assert.equal(selector, HINT_ROW_PANELS);
    return this.hintRow;
  }
}

/** An observer that records what it watches and fires when told to. */
class Observer {
  static readonly live = new Set<Observer>();
  readonly watched = new Set<unknown>();
  constructor(private readonly callback: () => void) {}
  observe(target: unknown): void {
    this.watched.add(target);
    Observer.live.add(this);
  }
  disconnect(): void {
    this.watched.clear();
    Observer.live.delete(this);
  }
  fire(): void {
    this.callback();
  }
}
class ResizeStub extends Observer {}
class MutationStub extends Observer {}

const g = globalThis as unknown as Record<string, unknown>;
let saved: { resize: unknown; mutation: unknown };
beforeEach(() => {
  saved = { resize: g.ResizeObserver, mutation: g.MutationObserver };
  g.ResizeObserver = ResizeStub;
  g.MutationObserver = MutationStub;
});
afterEach(() => {
  g.ResizeObserver = saved.resize;
  g.MutationObserver = saved.mutation;
  Observer.live.clear();
});

/** A watch over a canvas at (10, 20), with every set it pushed, on each path. */
function watching(panels: Boxed[], hintRow: Boxed[] = []) {
  const layer = new Layer();
  layer.panels = panels;
  layer.hintRow = hintRow;
  const host = new Boxed({ left: 10, top: 20, width: 1280, height: 720 });
  const pushed: PanelRect[][] = [];
  const pushedHintRow: PanelRect[][] = [];
  const watch = watchPanels(
    layer as unknown as HTMLElement,
    host as unknown as HTMLElement,
    (rects) => pushed.push(rects),
    (rects) => pushedHintRow.push(rects)
  );
  const observer = <T extends Observer>(kind: new (cb: () => void) => T): T =>
    [...Observer.live].find((o) => o instanceof kind) as T;
  return {
    layer,
    host,
    pushed,
    pushedHintRow,
    watch,
    resize: observer(ResizeStub),
    mounts: observer(MutationStub),
  };
}

describe('the floating panels, measured for the chart (#1662)', () => {
  it("hands over each panel's box in the canvas's pixels, and skips a hidden one", () => {
    const orders = new Boxed({ left: 77, top: 80, width: 340, height: 300 });
    // The contact log under 900 px wide: `display: none`, so a zero box.
    const hidden = new Boxed({ left: 0, top: 0, width: 0, height: 0 });
    const { pushed } = watching([orders, hidden]);
    assert.deepEqual(pushed.at(-1), [{ x: 67, y: 60, width: 340, height: 300 }]);
  });

  it('measures again when a panel mounts, when one resizes, and when asked', () => {
    const orders = new Boxed({ left: 77, top: 80, width: 340, height: 300 });
    const { layer, host, pushed, watch, resize, mounts } = watching([orders]);
    assert.ok(resize.watched.has(host) && resize.watched.has(orders), 'the host and the panel');

    const log = new Boxed({ left: 940, top: 80, width: 340, height: 216 });
    layer.panels = [orders, log];
    mounts.fire();
    assert.equal(pushed.at(-1)!.length, 2, 'a mounted panel is measured');
    assert.ok(resize.watched.has(log), 'and watched from then on');

    orders.rect = { ...orders.rect, height: 120 };
    resize.fire();
    assert.equal(pushed.at(-1)![0]!.height, 120, 'a fold is measured');

    // A UI-scale change: a CSS transform moves the box and no observer fires.
    log.rect = { left: 855, top: 95, width: 425, height: 270 };
    watch.measure();
    assert.deepEqual(pushed.at(-1)![1], { x: 845, y: 75, width: 425, height: 270 });
  });

  it("hands the hint row's panel over on its own path, and watches it too", () => {
    // The free-water legend (docs/free-water-slice.md §9): the hint line yields
    // to it, and a marker's name has no business with it, so it never joins
    // the floating panels' set.
    const orders = new Boxed({ left: 77, top: 80, width: 340, height: 300 });
    const legend = new Boxed({ left: 1142, top: 691, width: 296, height: 18 });
    const { pushed, pushedHintRow, resize } = watching([orders], [legend]);
    assert.deepEqual(pushed.at(-1), [{ x: 67, y: 60, width: 340, height: 300 }]);
    assert.deepEqual(pushedHintRow.at(-1), [{ x: 1132, y: 671, width: 296, height: 18 }]);
    assert.ok(resize.watched.has(legend), 'watched like any panel');
  });

  it('stops watching when stopped', () => {
    const { watch } = watching([new Boxed({ left: 77, top: 80, width: 340, height: 300 })]);
    assert.equal(Observer.live.size, 2);
    watch.stop();
    assert.equal(Observer.live.size, 0);
  });

  it('does nothing where the runner has no MutationObserver', () => {
    g.MutationObserver = undefined;
    const { pushed, watch } = watching([new Boxed({ left: 77, top: 80, width: 340, height: 300 })]);
    watch.measure();
    watch.stop();
    assert.deepEqual(pushed, []);
  });
});
