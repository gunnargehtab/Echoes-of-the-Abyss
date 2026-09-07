/**
 * Rendering a screen, for the component tests (#494).
 *
 * `react-test-renderer` renders to a plain object tree and runs effects for
 * real, which is all these screens need: they are React and CSS, and the only
 * DOM any of them reaches for is a host element or a `.focus()` call. No
 * jsdom — and see the note at the foot of this file for why that is a
 * decision rather than a gap left open.
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
 * "focus was placed here", which is what the component controls.
 *
 * `name` is what makes that assertion say *which*. It is the accessible name
 * of the element the node stands for, and it is on the node rather than
 * looked up afterwards because by the time a test reads `focused()` the tree
 * has usually moved on. Where focus *actually* is, and whether Tab can walk
 * under an `inert` layer, remain DOM facts this renderer does not model —
 * jsdom does not model them either (#515), so they live in the browser drive
 * at `.claude/skills/run-game/scripts/escFocus.mjs` or nowhere.
 */
export class FocusableNode extends StubElement {
  /**
   * The accessible name of the element this node stands for, or its class
   * list when it has no name — a scroll host is not a control.
   */
  readonly name: string;

  /**
   * Scroll geometry, for the two in-match feeds that follow their own tail.
   *
   * `StubElement` has none: nothing in the renderer scrolls. The contact log
   * and the mission log both do, and both stop doing it the moment the player
   * scrolls up to read something (docs/ui-ux.md §10) — a rule that is only
   * observable if the host they write through remembers what they wrote.
   */
  scrollTop = 0;
  scrollHeight = 0;

  constructor(tagName = 'div', name = '') {
    super(tagName);
    this.name = name;
  }

  override focus(): void {
    super.focus();
    focusOrder.push(this);
  }
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
  /**
   * Host nodes created for refs, indexed by every class their element
   * carries. First one wins, so this reaches a host that is unique by class;
   * a control among siblings is told apart by `focused()` naming it instead.
   */
  hosts: Map<string, FocusableNode>;
  /** Which node was focused last, or null. `name` says which one that is. */
  focused(): FocusableNode | null;
  /** Every focus that was placed, in the order it happened. */
  focuses(): FocusableNode[];
  /** Re-render with new props, then settle. */
  update(element: ReactElement): Promise<void>;
  act(body: () => void | Promise<void>): Promise<void>;
  unmount(): Promise<void>;
}

function classesOf(instance: { props: unknown }): string[] {
  const className = (instance.props as { className?: unknown }).className;
  return typeof className === 'string' ? className.split(/\s+/).filter(Boolean) : [];
}

/** Every string under a node's children — a button's label is often nested. */
function textUnder(children: unknown): string {
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
  walk(children);
  return out.join(' ');
}

/**
 * What assistive technology would call this element: its `aria-label` when it
 * has one, and its visible text otherwise.
 *
 * Deliberately in that order. A control whose visible text is a value rather
 * than a name (a key binding reads "W") is reached by the name assistive
 * technology reads, which is also the name docs/ui-ux.md §11 cares about.
 */
function accessibleName(props: unknown): string {
  const aria = (props as { 'aria-label'?: unknown })['aria-label'];
  return typeof aria === 'string' ? aria : textUnder((props as { children?: unknown }).children);
}

/** Mount a screen and hand back the questions worth asking of it. */
export async function render(element: ReactElement): Promise<Rendered> {
  focusOrder = [];
  const hosts = new Map<string, FocusableNode>();

  /**
   * One node per ref'd element, and the key is what decides "one".
   *
   * `createNodeMock` is called afresh every time React attaches a ref, so a
   * node has to be found again rather than made again, or a ref that moves —
   * the campaign board's roving one — would hand back a different element on
   * every keypress and no assertion could follow it.
   *
   * A **control** is keyed by its accessible name, because that is its
   * identity: the two `menu-entry` buttons §9.5's focus rule has to tell
   * apart are siblings sharing every class they have, and keying by class
   * collapsed them into one node — the actual reason the rule was unassertable
   * (#515). Anything else keeps class-only keying: the feeds' scroll host is
   * unique by its class and its text changes every time a line lands, so its
   * text is not an identity.
   */
  const byKey = new Map<string, FocusableNode>();

  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(element, {
      createNodeMock: (node) => {
        const classes = classesOf(node);
        const className = classes.join(' ') || 'anonymous';
        const named = node.type === 'button' || node.type === 'a';
        const name = named ? accessibleName(node.props) : className;
        const key = `${String(node.type)}\u0000${named ? name : className}`;
        const existing = byKey.get(key);
        if (existing !== undefined) return existing;
        const host = new FocusableNode(String(node.type), name);
        host.clientWidth = 1280;
        host.clientHeight = 720;
        byKey.set(key, host);
        // Indexed by every class it carries, first one wins: `hosts` is how a
        // test reaches a host it never focuses, and those are unique by class.
        for (const single of classes.length > 0 ? classes : ['anonymous']) {
          if (!hosts.has(single)) hosts.set(single, host);
        }
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
      const found = tree.root
        .findAll((node) => node.type === 'button')
        .filter((node) => accessibleName(node.props).includes(label));
      if (found.length !== 1) {
        throw new Error(`expected exactly one button matching "${label}", found ${found.length}`);
      }
      return found[0]!;
    },
    hosts,
    focused: () => focusOrder.at(-1) ?? null,
    focuses: () => [...focusOrder],
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

/**
 * Why there is no jsdom under any of this — the note the head promises (#515).
 *
 * §9.5 makes two promises about the esc menu that read like they want a DOM:
 * focus is moved into the dialog, and everything under its glass is made
 * `inert` so focus cannot wander back out. jsdom answers neither.
 *
 * - **`inert` has no semantics in jsdom.** Handlers still fire on an inert
 *   subtree and focus can still be set on it
 *   (testing-library/react-testing-library#1239, closed *as not planned* — a
 *   jsdom limitation rather than a library one).
 * - **jsdom performs no sequential focus navigation**, so a `Tab` keypress
 *   moves nothing. `@testing-library/user-event`'s `tab()` walks a list it
 *   computes itself, filtered on `tabindex < 0`, `disabled`, radio grouping
 *   and visibility — **`inert` is not among them**. A `tab()` test would go
 *   green while Tab walked straight under the glass onto a live command bar,
 *   which is worse than no test.
 *
 * What is left is "focus was placed here", and that needs no jsdom at all
 * once `createNodeMock` stops merging sibling controls into one node — which
 * is what the keying above is for. Whether Tab can *walk* out of the dialog
 * is a fact about a real engine, and it is asserted in one:
 * `.claude/skills/run-game/scripts/escFocus.mjs`, against the Chromium the
 * run-game skill already drives. It is deliberately not part of `npm test` —
 * Playwright is a global install rather than a devDependency and the harness
 * needs both dev servers, and .github/workflows/ci.yml's header records this
 * account running out of Actions minutes.
 *
 * Worth reopening only if a screen arrives that needs real layout or real
 * event dispatch. None does today.
 */
