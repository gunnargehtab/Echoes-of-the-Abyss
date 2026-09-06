/**
 * Rendering a screen, for the component tests (#494).
 *
 * `react-test-renderer` renders to a plain object tree and runs effects for
 * real, which is all these screens need: they are React and CSS, and the only
 * DOM any of them reaches for is a host element or a `.focus()` call. No
 * jsdom — see the note on its limits at the foot of this file.
 *
 * Everything here is about asking a rendered tree a question. The rule the
 * tests follow, and the reason these helpers are shaped the way they are: a
 * test should assert what a doc section promises, never what the JSX happens
 * to say. A test that mirrors markup is a change detector, and this repository
 * already keeps screenshots for how things look.
 */

import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { ReactElement } from 'react';
import { StubElement } from './headless.ts';

/**
 * A host element that records the focus it is given.
 *
 * `createNodeMock` is the only route to a DOM node in this renderer, so this
 * is how the esc menu's focus rules are observable at all — the assertion is
 * "focus was placed here", which is what the component controls. Where focus
 * *actually* is, and whether Tab can walk under an `inert` layer, are DOM
 * facts this renderer does not model; those stay for a jsdom pass if the
 * §9.5 rules are ever worth that spend.
 */
export class FocusableNode extends StubElement {
  focusCount = 0;

  focus(): void {
    this.focusCount++;
    focusOrder.push(this);
  }

  blur(): void {}
}

/** Every node that was focused, in the order it happened. */
let focusOrder: FocusableNode[] = [];

export interface Rendered {
  tree: ReactTestRenderer;
  root: ReactTestInstance;
  /** Every string in the tree, in document order. */
  text(): string[];
  /** True when some rendered string contains `needle`. */
  shows(needle: string): boolean;
  /** The one element with this `className`, or a clear failure. */
  byClass(className: string): ReactTestInstance;
  /** Every element carrying this `className` among its classes. */
  allByClass(className: string): ReactTestInstance[];
  /**
   * The button a player would call `label` — matched on its accessible name,
   * which is its `aria-label` when it has one and its visible text otherwise.
   *
   * Deliberately in that order. A control whose visible text is a value rather
   * than a name (a key binding reads "W") is reached by the name assistive
   * technology reads, which is also the name §11 cares about.
   */
  button(label: string): ReactTestInstance;
  /** Host nodes created for refs, by the class name of the element. */
  hosts: Map<string, FocusableNode>;
  /** Which node was focused last, or null. */
  focused(): FocusableNode | null;
  /** Re-render with new props, then settle. */
  update(element: ReactElement): Promise<void>;
  act(body: () => void | Promise<void>): Promise<void>;
  unmount(): Promise<void>;
}

function classesOf(instance: ReactTestInstance): string[] {
  const className = (instance.props as { className?: unknown }).className;
  return typeof className === 'string' ? className.split(/\s+/).filter(Boolean) : [];
}

/** Mount a screen and hand back the questions worth asking of it. */
export async function render(element: ReactElement): Promise<Rendered> {
  focusOrder = [];
  const hosts = new Map<string, FocusableNode>();

  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(element, {
      createNodeMock: (node) => {
        const className = String((node.props as { className?: string }).className ?? 'anonymous');
        const existing = hosts.get(className);
        if (existing !== undefined) return existing;
        const host = new FocusableNode('div');
        host.clientWidth = 1280;
        host.clientHeight = 720;
        hosts.set(className, host);
        return host;
      },
    });
  });

  const text = (): string[] => {
    const out: string[] = [];
    const walk = (node: unknown): void => {
      if (typeof node === 'string') {
        out.push(node);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const el = node as { children?: unknown } | null;
      if (el !== null && el.children != null) walk(el.children);
    };
    walk(tree.toJSON());
    return out;
  };

  /** Every string under one instance — a button's label is often nested. */
  const textUnder = (instance: ReactTestInstance): string => {
    const out: string[] = [];
    const walk = (node: unknown): void => {
      if (typeof node === 'string') {
        out.push(node);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const el = node as { props?: { children?: unknown } } | null;
      if (el?.props?.children != null) walk(el.props.children);
    };
    walk(instance.props.children);
    return out.join(' ');
  };

  const allByClass = (className: string): ReactTestInstance[] =>
    tree.root.findAll(
      (node) => typeof node.type === 'string' && classesOf(node).includes(className)
    );

  const rendered: Rendered = {
    tree,
    root: tree.root,
    text,
    shows: (needle) => text().some((line) => line.includes(needle)),
    allByClass,
    byClass: (className) => {
      const found = allByClass(className);
      if (found.length !== 1) {
        throw new Error(`expected exactly one .${className}, found ${found.length}`);
      }
      return found[0]!;
    },
    button: (label) => {
      const accessibleName = (node: ReactTestInstance): string => {
        const aria = (node.props as { 'aria-label'?: unknown })['aria-label'];
        return typeof aria === 'string' ? aria : textUnder(node);
      };
      const found = tree.root
        .findAll((node) => node.type === 'button')
        .filter((node) => accessibleName(node).includes(label));
      if (found.length !== 1) {
        throw new Error(`expected exactly one button matching "${label}", found ${found.length}`);
      }
      return found[0]!;
    },
    hosts,
    focused: () => focusOrder.at(-1) ?? null,
    update: async (next) => {
      await act(async () => {
        tree.update(next);
      });
    },
    act: async (body) => {
      await act(async () => {
        await body();
      });
    },
    unmount: async () => {
      await act(async () => {
        tree.unmount();
      });
    },
  };
  return rendered;
}

/** Press a button by its visible label, and let the state settle. */
export async function click(view: Rendered, label: string): Promise<void> {
  const target = view.button(label);
  await view.act(() => {
    (target.props as { onClick?: (event: unknown) => void }).onClick?.({
      preventDefault() {},
      stopPropagation() {},
    });
  });
}
