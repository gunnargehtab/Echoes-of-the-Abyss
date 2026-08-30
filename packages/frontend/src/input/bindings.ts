/**
 * The input map, as data — docs/ui-ux.md §9 and §11 (#191).
 *
 * §11 commits to **full rebinding, including a one-handed layout, and no
 * timing-critical chords**, and rebinding is not a screen problem: every
 * binding used to be an `e.code` literal inside `EchoRenderer`'s key handler,
 * so there was nothing for a screen to edit. This module is that nothing made
 * into a table.
 *
 * **A binding is one code, never a chord.** That is §11's "no timing-critical
 * chords" taken literally rather than as advice: a chord is a thing you can be
 * too slow for, and this game already asks the player to make decisions under
 * a clock they cannot see. The modifiers are not bindings at all — `Shift`,
 * `Ctrl` and `Alt` change what a *click* means (§9), which is why they are
 * reserved below rather than bindable.
 */

import { StructureKind } from '@echoes/shared';

/**
 * Everything a player may move.
 *
 * Deliberately not "everything the renderer handles": control groups and the
 * cancel key are fixed, for reasons `RESERVED_CODES` and `FIXED_CONTROLS`
 * record. An action is here only if moving it is safe.
 */
export type BindableAction =
  | 'silentRunning'
  | 'ping'
  | 'pingPreview'
  | 'dive'
  | 'rise'
  | 'followFloor'
  | 'throttle'
  | 'noisemaker'
  | 'mine'
  | 'depthCharge'
  | 'buildRefinery'
  | 'buildFoundry'
  | 'buildTurret'
  | 'buildVentTap'
  | 'buildSignature';

export interface ActionSpec {
  action: BindableAction;
  /** Shown in the rebinder, in the register the command bar uses. */
  label: string;
  /** What it does, for the row's second line. */
  hint: string;
  /**
   * True when the binding is *held* rather than pressed. The rebinder says so,
   * because a hold that has been moved onto a key the player also taps is a
   * different kind of mistake from an ordinary collision.
   */
  hold?: boolean;
  /** Grouping in the rebinder, so the list reads like §9's table. */
  group: 'fleet' | 'depth' | 'ordnance' | 'build';
}

/**
 * The order the rebinder lists them in, which is §9's table order rather than
 * alphabetical: a player looking for a binding is looking for it where the
 * document put it.
 */
export const ACTIONS: readonly ActionSpec[] = [
  {
    action: 'silentRunning',
    label: 'Silent running',
    hint: 'Toggle for the selection',
    group: 'fleet',
  },
  {
    action: 'ping',
    label: 'Active sonar',
    hint: 'Ping from the first selected hull',
    group: 'fleet',
  },
  {
    action: 'pingPreview',
    label: 'Ping cost preview',
    hint: 'Hold to see what a ping would cost you',
    hold: true,
    group: 'fleet',
  },
  { action: 'throttle', label: 'Harvest throttle', hint: 'Cycle the dredge rate', group: 'fleet' },
  { action: 'dive', label: 'Dive', hint: 'Down one depth band', group: 'depth' },
  { action: 'rise', label: 'Rise', hint: 'Up one depth band', group: 'depth' },
  {
    action: 'followFloor',
    label: 'Follow floor',
    hint: 'Hug the seabed at station keeping',
    group: 'depth',
  },
  { action: 'noisemaker', label: 'Noisemaker', hint: 'Deploy a decoy', group: 'ordnance' },
  { action: 'mine', label: 'Mine', hint: 'Lay at the hull position', group: 'ordnance' },
  {
    action: 'depthCharge',
    label: 'Depth charge',
    hint: 'Drop into the band below',
    group: 'ordnance',
  },
  { action: 'buildRefinery', label: 'Refinery', hint: 'Arm for placement', group: 'build' },
  { action: 'buildFoundry', label: 'Foundry', hint: 'Arm for placement', group: 'build' },
  { action: 'buildTurret', label: 'Sentinel turret', hint: 'Arm for placement', group: 'build' },
  { action: 'buildVentTap', label: 'Vent tap', hint: 'Arm for placement', group: 'build' },
  {
    action: 'buildSignature',
    label: 'Faction structure',
    hint: "Arm your navy's own, when it has one",
    group: 'build',
  },
];

export const GROUP_LABEL: Record<ActionSpec['group'], string> = {
  fleet: 'The fleet',
  depth: 'Depth',
  ordnance: 'Ordnance',
  build: 'Construction',
};

export type Bindings = Record<BindableAction, string>;

/** §9's table, exactly. Changing one of these changes the document first. */
export const DEFAULT_BINDINGS: Bindings = {
  silentRunning: 'Space',
  ping: 'KeyP',
  pingPreview: 'AltLeft',
  throttle: 'KeyV',
  dive: 'KeyD',
  rise: 'KeyA',
  followFloor: 'KeyS',
  noisemaker: 'KeyN',
  mine: 'KeyM',
  depthCharge: 'KeyC',
  buildRefinery: 'KeyR',
  buildFoundry: 'KeyF',
  buildTurret: 'KeyT',
  buildVentTap: 'KeyG',
  buildSignature: 'KeyB',
};

/**
 * §11's one-handed layout — every binding inside a left hand's reach.
 *
 * The default is not one-handed for four of them: `P`, `N`, `M` and `B` sit
 * under a right hand that is on the mouse, which for a player using one hand
 * means the binding may as well not exist. This moves those four and leaves
 * the nine that were already left-hand alone, because a layout that also
 * shuffles the keys a player already knows is a worse layout.
 *
 * Control groups are the one thing this cannot fix: the digits are not
 * rebindable (see `RESERVED_CODES`), and 6–9 are out of reach. §9 is honest
 * about that rather than pretending otherwise.
 */
export const ONE_HANDED_BINDINGS: Bindings = {
  ...DEFAULT_BINDINGS,
  ping: 'KeyQ',
  throttle: 'KeyE',
  noisemaker: 'KeyZ',
  mine: 'KeyX',
  buildSignature: 'KeyV',
  // V was the throttle; the throttle moved to E, so V is free for the
  // signature structure and B — a right-hand key — is not needed.
};

export type LayoutName = 'default' | 'oneHanded' | 'custom';

export const LAYOUTS: Record<Exclude<LayoutName, 'custom'>, Bindings> = {
  default: DEFAULT_BINDINGS,
  oneHanded: ONE_HANDED_BINDINGS,
};

/**
 * Codes a player may not bind, and why — the guard the issue asks for.
 *
 * §9 records two binding conflicts the document *already resolved*: order
 * queueing versus the ping preview (both were `Shift`), and control groups
 * versus unit production (both were the digits). A rebinder that let a player
 * put an action on `Shift` or on `Digit3` would silently reintroduce exactly
 * the class of collision the document spent two paragraphs settling — and
 * silently, because the loser is a *mouse* interaction that simply stops
 * behaving, with no key to press and notice.
 */
export const RESERVED_CODES: ReadonlyMap<string, string> = new Map([
  ['Escape', 'cancels a pending build or opens the menu, and is handled before every other key'],
  ['ShiftLeft', 'queues an order behind the current plan (§9)'],
  ['ShiftRight', 'queues an order behind the current plan (§9)'],
  ['ControlLeft', 'subtracts from a selection, and assigns a control group (§9)'],
  ['ControlRight', 'subtracts from a selection, and assigns a control group (§9)'],
  ['MetaLeft', 'subtracts from a selection, and assigns a control group (§9)'],
  ['MetaRight', 'subtracts from a selection, and assigns a control group (§9)'],
  ...Array.from({ length: 9 }, (_, i): [string, string] => [
    `Digit${i + 1}`,
    'recalls a control group, which has no other route (§9)',
  ]),
]);

/**
 * Controls the rebinder lists but will not move, so the screen can show the
 * whole of §9 rather than the editable half and leave the player wondering.
 */
export const FIXED_CONTROLS: readonly { label: string; keys: string; why: string }[] = [
  { label: 'Control groups', keys: '1 – 9', why: 'Ctrl assigns; recall twice to centre' },
  {
    label: 'Cancel / menu',
    keys: 'Esc',
    why: 'Drops a pending build; with nothing to drop, opens the menu',
  },
  { label: 'Queue an order', keys: 'Shift + right click', why: 'Behind the unit’s current plan' },
  { label: 'Add to selection', keys: 'Shift + click', why: 'Ctrl subtracts' },
  { label: 'Select by class', keys: 'Alt + click', why: 'Or double-click' },
  { label: 'Pan', keys: 'Middle drag', why: 'Wheel zooms about the cursor' },
];

/** Structures the build actions arm, so the renderer needs no second table. */
export const BUILD_ACTION_KIND: Partial<Record<BindableAction, StructureKind>> = {
  buildRefinery: StructureKind.Refinery,
  buildFoundry: StructureKind.Foundry,
  buildTurret: StructureKind.SentinelTurret,
  buildVentTap: StructureKind.VentTap,
};

export interface Conflict {
  code: string;
  /** Two or more actions on one code, or one action on a reserved code. */
  actions: BindableAction[];
  /** Set when the code is reserved rather than doubly bound. */
  reservedFor?: string;
}

/**
 * Every collision in a binding table.
 *
 * Returned rather than thrown, and returned as a list rather than a boolean,
 * because the screen shows the player what clashes with what. A table with
 * conflicts is still *applied* — refusing to save would strand a player
 * mid-rebind — but the screen says so, and the renderer resolves a doubly
 * bound code in the order `ACTIONS` lists, which is at least deterministic.
 */
export function conflictsIn(bindings: Bindings): Conflict[] {
  const byCode = new Map<string, BindableAction[]>();
  for (const { action } of ACTIONS) {
    const code = bindings[action];
    const list = byCode.get(code);
    if (list === undefined) byCode.set(code, [action]);
    else list.push(action);
  }

  const conflicts: Conflict[] = [];
  for (const [code, actions] of byCode) {
    const reservedFor = RESERVED_CODES.get(code);
    if (reservedFor !== undefined) conflicts.push({ code, actions, reservedFor });
    else if (actions.length > 1) conflicts.push({ code, actions });
  }
  return conflicts;
}

/** Whether this code may be bound at all. The screen refuses the capture. */
export function isBindable(code: string): boolean {
  return !RESERVED_CODES.has(code) && code.length > 0;
}

/**
 * A KeyboardEvent code as a player would write it.
 *
 * `KeyP` is not a key anybody calls `KeyP`. Falls through to the raw code for
 * anything unrecognised rather than inventing a name, because a wrong label on
 * a binding is worse than an ugly one.
 */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  if (code.startsWith('Arrow')) return `${code.slice(5)} arrow`;
  const named: Record<string, string> = {
    Space: 'Space',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    Escape: 'Esc',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Tab: 'Tab',
    Enter: 'Enter',
  };
  return named[code] ?? code;
}

/**
 * Merge a stored partial table over a layout.
 *
 * Partial on purpose: a build that adds an action should give it its default
 * binding rather than leaving it unbound, and a stored table from an older
 * build knows nothing about it.
 */
export function resolveBindings(
  layout: LayoutName,
  overrides: Partial<Bindings> | undefined
): Bindings {
  const base = layout === 'custom' ? DEFAULT_BINDINGS : LAYOUTS[layout];
  if (overrides === undefined) return { ...base };
  const merged = { ...base };
  for (const { action } of ACTIONS) {
    const code = overrides[action];
    if (typeof code === 'string' && code.length > 0) merged[action] = code;
  }
  return merged;
}

/** The action a code fires, or null. Ties resolve in `ACTIONS` order. */
export function actionFor(bindings: Bindings, code: string): BindableAction | null {
  for (const { action } of ACTIONS) if (bindings[action] === code) return action;
  return null;
}
