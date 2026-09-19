/**
 * Enough of the CSS box model to answer two questions these tests cannot
 * otherwise ask, both of them about whether something fits:
 *
 * - does an element's **border box** fit the box that holds it (`#752`);
 * - can a grid row be pushed wider than that box by what sits **inside** it
 *   (`#760`)?
 *
 * They are separate axes and they failed separately on the same row, which is
 * why the second one is here rather than assumed to follow from the first.
 *
 * The frontend suite renders through `react-test-renderer`, which builds an
 * object tree and lays nothing out, so an overflow is invisible to it — #752
 * clipped every objective progress counter for as long as the panel has
 * existed and no test could see it. jsdom would not help either: it has no
 * layout engine, so `offsetWidth` there is 0 for everything.
 *
 * So this reads the shipped stylesheet and does the arithmetic instead of
 * measuring.
 *
 * **The one rule this file has to keep is that it never guesses low.** A
 * reader that silently drops a rule, or silently ignores a property, reports a
 * box narrower than the browser's and turns a test that would have caught an
 * overflow into one that cannot — which is worse than having no test, because
 * it reads as cover. So every path that cannot resolve something throws,
 * naming what it could not read:
 *
 * - a selector shaped in a way it does not parse, if that rule sets a property
 *   that could change the box (`rulesTargeting`);
 * - a property in `BOX_PROPERTIES` that `resolveBox`'s switch does not handle,
 *   which is what stops that set and that switch drifting apart;
 * - a length in a unit it cannot turn into px (`lengthPx`);
 * - a rule sitting under a condition it cannot evaluate, which since #760 is
 *   **any** at-rule that is not a known self-contained one — `@media`,
 *   `@supports`, `@container`, `@layer`, `@scope` and anything nobody here has
 *   heard of alike (`boxRulesFor`);
 * - an `!important` anywhere in a value it reads, which is unmodelled and
 *   throws wherever it appears — `lengthPx` on the box side, `floorOf` on the
 *   track side.
 *
 * What it does **not** model and does **not** throw on — so these are the
 * assumptions rather than the refusals: inheritance, and specificity beyond
 * source order. The second is the one to know about, because
 * every rule it reads here is a bare class or a tag-and-class and those are
 * written in increasing specificity anyway (`.objectives-row` before
 * `p.objectives-row`); a stylesheet that put the tag rule first would be read
 * wrongly here and correctly by a browser.
 *
 * `calc()` and custom properties are refused in one direction and assumed in
 * the other, which is worth knowing precisely: a length the *box* arithmetic
 * needs throws (`lengthPx`), while a *track floor* takes a `calc()` as definite
 * under the assumption named on `TrackFloor`.
 *
 * Writing directions are assumed horizontal and left-to-right, which is what
 * the client ships; the logical properties below are mapped on that basis.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The stylesheet the client actually ships, read rather than restated. */
export const APP_CSS = readFileSync(
  fileURLToPath(new URL('../../src/App.css', import.meta.url)),
  'utf8'
);

/**
 * Every declaration that can change how wide an element's border box is.
 *
 * Closed on purpose, and asserted twice: `rulesTargeting` refuses a selector it
 * cannot read when the rule sets one of these, and `resolveBox` throws on one
 * it does not handle. A property that widens the box and is in neither place is
 * the silent underestimate this file exists to refuse.
 */
export const BOX_PROPERTIES = new Set([
  'box-sizing',
  'width',
  'min-width',
  'max-width',
  'inline-size',
  'min-inline-size',
  'max-inline-size',
  'padding',
  'padding-left',
  'padding-right',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'border',
  'border-width',
  'border-style',
  'border-left',
  'border-right',
  'border-left-width',
  'border-right-width',
  'border-inline',
  'border-inline-start',
  'border-inline-end',
  'border-inline-start-width',
  'border-inline-end-width',
]);

/**
 * Pseudo-classes that are **false while an element simply sits on screen**, so
 * a rule carrying one does not apply at rest and can be skipped.
 *
 * A closed list rather than "anything after a colon", which is the distinction
 * that matters: `:hover` genuinely does not apply, while `:not(.met)` and
 * `:first-child` do, and are *more* specific than the bare class they qualify.
 * Treating those as inapplicable is exactly how a later rule re-boxing the row
 * — the door #752 comes back through — would go unnoticed. Anything not on
 * this list is `unknown`, and `rulesTargeting` turns that into a failure.
 *
 * The form-state pseudos are deliberately **not** here, and that is the
 * correction worth naming: `:disabled`, `:enabled`, `:checked`,
 * `:indeterminate`, `:link` and `:placeholder-shown` describe what an element
 * *is*, not what is being done to it, so they hold at rest. Every marker row is
 * an enabled `<button>`, which makes `button.objectives-row:enabled` a live
 * selector rather than a hypothetical one — skipping it would drop its box
 * declarations in silence. They fall to `unknown` instead.
 *
 * This list only ever decides a compound whose tag and classes have *already*
 * matched, so the dozen `:disabled` rules in this sheet that belong to other
 * controls are settled by their base and never reach it.
 */
const NOT_AT_REST = new Set([
  'hover',
  'active',
  'focus',
  'focus-visible',
  'focus-within',
  'target',
  'visited',
  'autofill',
]);

export interface CssRule {
  selector: string;
  declarations: Array<[string, string]>;
  /** The at-rule prelude this rule sits under, or null at top level. */
  condition: string | null;
}

/**
 * At-rules whose block is not a list of style rules, so skipping it drops
 * nothing that could style an element. Named rather than inferred: everything
 * else is treated as a condition, which is the failing-loud direction.
 */
const SELF_CONTAINED_AT_RULES =
  /^@(keyframes|-\w+-keyframes|font-face|font-feature-values|font-palette-values|counter-style|property|page|view-transition)\b/;

/**
 * Every rule in a stylesheet, flattened, with the condition it sits under.
 *
 * Comments go first — a CSS comment can contain braces and this repository's
 * are long prose — and then it is a brace walk rather than a regex, because
 * `@media` nests and a regex that pretends otherwise reads a media block's
 * closing brace as a selector.
 */
export function parseCss(css: string): CssRule[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  let i = 0;
  let condition: string | null = null;

  const matchingBrace = (open: number): number => {
    let depth = 1;
    let j = open + 1;
    while (j < clean.length && depth > 0) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}') depth--;
      j++;
    }
    return j;
  };

  while (i < clean.length) {
    while (i < clean.length && /\s/.test(clean[i])) i++;
    if (i >= clean.length) break;
    // The close of the conditional group we are inside.
    if (clean[i] === '}') {
      condition = null;
      i++;
      continue;
    }
    const open = clean.indexOf('{', i);
    if (open === -1) break;
    const prelude = clean.slice(i, open).trim();

    if (prelude.startsWith('@')) {
      // A *statement* at-rule — `@import`, `@charset`, `@namespace` — ends at
      // a semicolon and has no block, so the `{` found above belongs to
      // whatever rule comes next. Skipping to that semicolon is what stops the
      // brace walk swallowing a real rule, or taking a whole selector into a
      // condition.
      const semicolon = clean.indexOf(';', i);
      if (semicolon !== -1 && semicolon < open) {
        i = semicolon + 1;
        continue;
      }
      // An at-rule whose block holds ordinary rules that *do* apply, under a
      // condition or a precedence this reader cannot evaluate. Recording the
      // prelude as the condition is what lets `boxRulesFor` refuse it; the
      // list is open on purpose, because the failure it prevents is a
      // stylesheet growing an at-rule nobody here has heard of and having its
      // declarations silently vanish. Before #760 anything that was not
      // `@media` or `@supports` was skipped whole, so a `@container` or an
      // `@layer` re-boxing the row reported the outer answer and no throw —
      // a `definite` this file had not earned, in the one direction it says
      // it will never fail.
      if (!SELF_CONTAINED_AT_RULES.test(prelude)) {
        condition = prelude;
        i = open + 1;
        continue;
      }
      // `@keyframes`, `@font-face` and friends: nested blocks whose contents
      // are not rules that style anything, so there is nothing to drop.
      i = matchingBrace(open);
      continue;
    }

    const end = matchingBrace(open);
    rules.push({
      selector: prelude,
      declarations: declarationsOf(clean.slice(open + 1, end - 1)),
      condition,
    });
    i = end;
  }
  return rules;
}

/** A list rather than a map: a property may be set twice, and the last wins. */
function declarationsOf(body: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    out.push([part.slice(0, colon).trim(), part.slice(colon + 1).trim()]);
  }
  return out;
}

/** One element in a tree, as much of it as a selector can ask about. */
export interface Node {
  /** The host tag React rendered — `p` and `button` box differently. */
  tag: string;
  classes: string[];
}

export interface Element extends Node {
  /**
   * The element's ancestors, **outermost first**.
   *
   * Supplying them is what lets a descendant selector be *resolved* rather than
   * refused: `.objectives-body .objectives-row` styles the row, and a reader
   * with no ancestry has to throw on it. Leave it out and any rule whose
   * subject matches but whose ancestry is unverifiable becomes `unknown`.
   */
  ancestors?: Node[];
}

type Verdict = 'yes' | 'no' | 'unknown';

/** The tag-and-class part of a compound, with any pseudo-classes stripped off. */
function matchesBase(base: string, node: Node): Verdict {
  if (base === '*') return 'yes';
  // A compound that is nothing but a pseudo (`:root`) names no tag and no
  // class, so there is nothing here to match it on.
  if (base === '') return 'unknown';
  const match = /^([a-z][a-z0-9]*)?((?:\.[A-Za-z0-9_-]+)*)$/.exec(base);
  if (match === null) return 'unknown';
  const [, tag, classPart] = match;
  if (tag !== undefined && tag !== node.tag) return 'no';
  const wanted = classPart === '' ? [] : classPart.slice(1).split('.');
  return wanted.every((c) => node.classes.includes(c)) ? 'yes' : 'no';
}

/**
 * Does one compound selector — `p.objectives-row`, `*`, `.a.b:hover` — match a
 * node at rest?
 *
 * **The base is matched first, and that order is load-bearing.** A compound
 * whose tag and classes do not match is settled whatever its pseudo says, which
 * is what lets the reader be strict about pseudo-classes without throwing on
 * the dozen `:disabled` rules in this sheet that belong to other controls.
 * Only once the base matches does the pseudo decide, and then anything not
 * demonstrably false at rest is `unknown` rather than skipped.
 */
function matchesCompound(compound: string, node: Node): Verdict {
  const trimmed = compound.trim();
  // A pseudo-element is a box of its own, never this element's.
  if (trimmed.includes('::')) return 'no';

  const colon = trimmed.indexOf(':');
  const base = colon === -1 ? trimmed : trimmed.slice(0, colon);
  const verdict = matchesBase(base, node);
  if (verdict !== 'yes' || colon === -1) return verdict;

  const pseudos = [...trimmed.slice(colon).matchAll(/:([a-zA-Z-]+)/g)].map((m) => m[1]);
  return pseudos.every((p) => NOT_AT_REST.has(p)) ? 'no' : 'unknown';
}

interface Step {
  /** How this compound relates to the one before it. Null on the leftmost. */
  combinator: ' ' | '>' | '+' | '~' | null;
  compound: string;
}

/** `.a > .b .c` into its compounds and the combinators between them. */
function steps(selector: string): Step[] {
  const tokens = selector
    .trim()
    .replace(/\s*([>+~])\s*/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean);
  const out: Step[] = [];
  let pending: '>' | '+' | '~' | null = null;
  for (const token of tokens) {
    if (token === '>' || token === '+' || token === '~') {
      pending = token;
      continue;
    }
    out.push({ combinator: out.length === 0 ? null : (pending ?? ' '), compound: token });
    pending = null;
  }
  return out;
}

/**
 * Does this selector target `element` itself, in its resting state?
 *
 * Three answers rather than two, because "no" and "this reader cannot tell"
 * are different facts and collapsing them is how a guard goes quiet.
 *
 * The **subject of a selector is its rightmost compound**, which is the thing a
 * first draft of this file got wrong: it refused every selector containing a
 * combinator on the reasoning that such rules style something *inside* the
 * element, when `.objectives-body .objectives-row` styles the row itself.
 */
function targets(selector: string, element: Element): Verdict {
  const chain = steps(selector);
  if (chain.length === 0) return 'unknown';

  const subject = matchesCompound(chain[chain.length - 1].compound, element);
  if (subject !== 'yes') return subject;
  if (chain.length === 1) return 'yes';
  if (element.ancestors === undefined) return 'unknown';

  // Nearest ancestor first, which is the order the chain is walked in.
  const up = [...element.ancestors].reverse();
  let from = 0;
  for (let i = chain.length - 1; i >= 1; i--) {
    const { combinator } = chain[i];
    const wanted = chain[i - 1].compound;
    // Siblings are not in scope here — `ancestors` says nothing about them.
    if (combinator === '+' || combinator === '~') return 'unknown';

    if (combinator === '>') {
      const parent = up[from];
      if (parent === undefined) return 'no';
      const verdict = matchesCompound(wanted, parent);
      if (verdict !== 'yes') return verdict === 'unknown' ? 'unknown' : 'no';
      from += 1;
      continue;
    }

    // Descendant. First match wins rather than backtracking, which is enough
    // for a stylesheet whose ancestor compounds are all distinct classes.
    let found = -1;
    for (let j = from; j < up.length; j++) {
      const verdict = matchesCompound(wanted, up[j]);
      if (verdict === 'unknown') return 'unknown';
      if (verdict === 'yes') {
        found = j;
        break;
      }
    }
    if (found === -1) return 'no';
    from = found + 1;
  }
  return 'yes';
}

/**
 * Every rule that styles `element` itself, in source order — the ones inside a
 * `@media` block included, which is what a question about another viewport has
 * to read.
 *
 * Throws on a selector it cannot account for that sets a box property, so a
 * stylesheet growing a shape this reader does not model fails loudly here
 * rather than silently dropping a declaration that mattered.
 */
export function rulesTargeting(
  rules: CssRule[],
  element: Element,
  properties: Set<string> = BOX_PROPERTIES
): CssRule[] {
  const out: CssRule[] = [];
  for (const rule of rules) {
    for (const selector of rule.selector.split(',')) {
      const verdict = targets(selector, element);
      if (verdict === 'unknown') {
        if (!rule.declarations.some(([property]) => properties.has(property))) continue;
        throw new Error(
          `cssBox cannot read the selector \`${selector.trim()}\`, and it sets a box property`
        );
      }
      if (verdict === 'yes') {
        out.push(rule);
        break;
      }
    }
  }
  return out;
}

/**
 * The same list, narrowed to the rules that apply at every viewport.
 *
 * A conditional rule that sets a box property on this element is a **throw**
 * rather than a quiet omission. This reader does not evaluate `@media`
 * conditions, so it cannot say whether such a rule is in force — and dropping
 * it reports a box narrower than the browser's at the viewport where it is,
 * which is the silent underestimate the header refuses. Nothing in `App.css`
 * does this today: the one media query touching the panel restyles
 * `.objectives`, not the rows inside it.
 */
export function boxRulesFor(
  rules: CssRule[],
  element: Element,
  properties: Set<string> = BOX_PROPERTIES
): CssRule[] {
  const targeted = rulesTargeting(rules, element, properties);
  for (const rule of targeted) {
    if (rule.condition === null) continue;
    if (!rule.declarations.some(([property]) => properties.has(property))) continue;
    throw new Error(
      `cssBox does not evaluate \`${rule.condition}\`, and \`${rule.selector}\` sets a box property under it`
    );
  }
  return targeted.filter((rule) => rule.condition === null);
}

/**
 * The UA default for `box-sizing`, which is the whole of why #752 was
 * invisible: a `button` is `border-box` in every shipping browser's UA
 * stylesheet, so a marker row fitted while the markerless `p` beside it did
 * not. Two elements with identical author CSS, boxing differently.
 */
export function uaBoxSizing(tag: string): 'content-box' | 'border-box' {
  return tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea'
    ? 'border-box'
    : 'content-box';
}

export interface ResolvedBox {
  boxSizing: 'content-box' | 'border-box';
  /** As authored — `100%` or a length. Undefined when nothing sets it. */
  width: string | undefined;
  minWidth: string | undefined;
  maxWidth: string | undefined;
  paddingLeft: string;
  paddingRight: string;
  borderLeftWidth: string;
  borderRightWidth: string;
}

/** The left and right slots of a `padding`-style shorthand: 1, 2, 3 or 4 values. */
function horizontalSlots(value: string): { left: string; right: string } {
  const parts = value.trim().split(/\s+/);
  switch (parts.length) {
    case 1:
      return { left: parts[0], right: parts[0] };
    case 2:
    case 3:
      return { left: parts[1], right: parts[1] };
    case 4:
      return { left: parts[3], right: parts[1] };
    default:
      throw new Error(`cssBox cannot read the shorthand \`${value}\``);
  }
}

/**
 * The width out of a `border` shorthand.
 *
 * The three components may be written in any order, so this looks for the one
 * that is a length rather than taking the first token. `none` and `hidden`
 * force the width to zero whatever else the shorthand says, which is the rule
 * that makes `border: 0` and `border: none` mean the same thing here.
 */
function borderShorthandWidth(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.some((p) => p === 'none' || p === 'hidden')) return '0';
  const length = parts.find((p) => /^(0|[\d.]+(px|rem|em))$/.test(p));
  if (length !== undefined) return length;
  const named = parts.find((p) => p === 'thin' || p === 'medium' || p === 'thick');
  if (named !== undefined) return { thin: '1px', medium: '3px', thick: '5px' }[named];
  throw new Error(`cssBox cannot find a width in \`border: ${value}\``);
}

/**
 * The element's box, with every declaration applied in the order the
 * stylesheet writes it — which is what makes a shorthand and a longhand for the
 * same edge come out the way the browser resolves them.
 */
export function resolveBox(rules: CssRule[], element: Element): ResolvedBox {
  const box: ResolvedBox = {
    boxSizing: uaBoxSizing(element.tag),
    width: undefined,
    minWidth: undefined,
    maxWidth: undefined,
    paddingLeft: '0',
    paddingRight: '0',
    borderLeftWidth: '0',
    borderRightWidth: '0',
  };

  const setPadding = (value: string): void => {
    const { left, right } = horizontalSlots(value);
    box.paddingLeft = left;
    box.paddingRight = right;
  };
  const setBorder = (width: string): void => {
    box.borderLeftWidth = width;
    box.borderRightWidth = width;
  };

  for (const rule of boxRulesFor(rules, element)) {
    for (const [property, value] of rule.declarations) {
      switch (property) {
        case 'box-sizing': {
          if (value !== 'content-box' && value !== 'border-box') {
            throw new Error(`cssBox cannot resolve \`box-sizing: ${value}\``);
          }
          box.boxSizing = value;
          break;
        }
        // `inline-size` is `width` in a horizontal writing mode.
        case 'width':
        case 'inline-size':
          box.width = value;
          break;
        case 'min-width':
        case 'min-inline-size':
          box.minWidth = value;
          break;
        case 'max-width':
        case 'max-inline-size':
          box.maxWidth = value;
          break;
        case 'padding':
        case 'padding-inline':
          setPadding(value);
          break;
        case 'padding-left':
        case 'padding-inline-start':
          box.paddingLeft = value;
          break;
        case 'padding-right':
        case 'padding-inline-end':
          box.paddingRight = value;
          break;
        case 'border':
        case 'border-inline':
          setBorder(borderShorthandWidth(value));
          break;
        case 'border-width': {
          const { left, right } = horizontalSlots(value);
          box.borderLeftWidth = left;
          box.borderRightWidth = right;
          break;
        }
        // A style of `none` zeroes the used width whatever the width says; any
        // other style leaves the width where it is.
        case 'border-style':
          if (/\b(none|hidden)\b/.test(value) && !/\b(solid|dashed|dotted|double)\b/.test(value)) {
            setBorder('0');
          }
          break;
        case 'border-left':
        case 'border-inline-start':
          box.borderLeftWidth = borderShorthandWidth(value);
          break;
        case 'border-right':
        case 'border-inline-end':
          box.borderRightWidth = borderShorthandWidth(value);
          break;
        case 'border-left-width':
        case 'border-inline-start-width':
          box.borderLeftWidth = value;
          break;
        case 'border-right-width':
        case 'border-inline-end-width':
          box.borderRightWidth = value;
          break;
        default:
          // The set and this switch are two halves of one list, and a property
          // in the first that never reaches the second is the silent
          // underestimate this file refuses.
          if (BOX_PROPERTIES.has(property)) {
            throw new Error(`cssBox does not model \`${property}\``);
          }
          break;
      }
    }
  }
  return box;
}

/** A length in px. `rem` resolves against `rootFontPx`; anything else throws. */
function lengthPx(value: string, rootFontPx: number, what: string): number {
  const trimmed = value.trim();
  if (trimmed === '0') return 0;
  const px = /^(-?[\d.]+)px$/.exec(trimmed);
  if (px !== null) return Number(px[1]);
  const rem = /^(-?[\d.]+)rem$/.exec(trimmed);
  if (rem !== null) return Number(rem[1]) * rootFontPx;
  throw new Error(`cssBox cannot resolve \`${what}: ${trimmed}\` to px`);
}

/** A length or a percentage of the containing block's content width. */
function resolveWidth(
  value: string,
  containerContentWidth: number,
  rootFontPx: number,
  what: string
): number {
  const percent = /^([\d.]+)%$/.exec(value.trim());
  return percent !== null
    ? (Number(percent[1]) / 100) * containerContentWidth
    : lengthPx(value, rootFontPx, what);
}

export interface BorderBoxQuery {
  css: string;
  element: Element;
  /** The content width of the box this element's `width: 100%` resolves against. */
  containerContentWidth: number;
  /** For `rem`. The client ships the browser default and sets no `html` size. */
  rootFontPx?: number;
}

/**
 * How wide this element's border box actually is, in px.
 *
 * This is the number that has to fit. `width` is the *content* box under
 * `content-box`, so padding and border are added to it, and an element whose
 * `width: 100%` already fills its container then overflows by exactly their
 * sum. Under `border-box` the same declaration means the border box, and the
 * content shrinks to make room instead.
 */
export function borderBoxWidth(query: BorderBoxQuery): number {
  const { element, containerContentWidth, rootFontPx = 16 } = query;
  const box = resolveBox(parseCss(query.css), element);

  if (box.width === undefined) {
    throw new Error(`cssBox needs an explicit width for \`${element.classes.join('.')}\``);
  }
  let width = resolveWidth(box.width, containerContentWidth, rootFontPx, 'width');
  // `min-width` and `max-width` are measured in whatever box `box-sizing`
  // names, so they clamp before padding and border are accounted for.
  if (box.maxWidth !== undefined && box.maxWidth.trim() !== 'none') {
    width = Math.min(
      width,
      resolveWidth(box.maxWidth, containerContentWidth, rootFontPx, 'max-width')
    );
  }
  if (box.minWidth !== undefined) {
    width = Math.max(
      width,
      resolveWidth(box.minWidth, containerContentWidth, rootFontPx, 'min-width')
    );
  }

  const extra =
    lengthPx(box.paddingLeft, rootFontPx, 'padding-left') +
    lengthPx(box.paddingRight, rootFontPx, 'padding-right') +
    lengthPx(box.borderLeftWidth, rootFontPx, 'border-left-width') +
    lengthPx(box.borderRightWidth, rootFontPx, 'border-right-width');

  // Under `border-box` the padding and border eat into the declared width
  // rather than adding to it — but they cannot make the box narrower than
  // themselves, which is the floor the browser clamps to.
  return box.boxSizing === 'border-box' ? Math.max(width, extra) : width + extra;
}

/**
 * Every declaration that decides what a grid row's **columns** refuse to
 * shrink below.
 *
 * A second closed set beside `BOX_PROPERTIES`, because the two questions this
 * file answers depend on different declarations and a reader that threw on
 * every selector it could not parse — whatever the rule happened to set —
 * would refuse most of this stylesheet. The item's half of the same floor —
 * `min-width` on the children — is not here and does not need to be: it is a
 * box property, so it comes through `BOX_PROPERTIES` and `resolveBox`, which
 * is where the tests read it.
 *
 * `grid-template` and `grid` are here without being modelled, deliberately.
 * Either can set the columns, so a stylesheet that grew one must fail loudly
 * in `columnFloors` rather than have it read an older longhand and report a
 * floor the browser does not have.
 */
export const TRACK_PROPERTIES = new Set([
  'display',
  'grid-template-columns',
  'grid-template',
  'grid',
]);

/**
 * What one column track refuses to shrink below.
 *
 * `definite` is a length, a percentage or a `calc()`: a number the browser can
 * reach without looking at the track's contents, so nothing a mission authors
 * into that column can change the row's width. `content` is min-content of
 * whatever sits there — the floor #760 is about, because authored prose has no
 * bound and one long unbreakable token sets it.
 *
 * A `calc()` is taken as `definite` on an assumption worth naming, because
 * this file models neither `calc()` nor custom properties: that every `var()`
 * inside it substitutes to something the expression can use. One that does not
 * makes the `calc()` invalid at computed-value time, which takes the whole
 * `grid-template-columns` declaration to its initial `none` — and then *every*
 * track is an implicit `auto` and the floor below is undone, while this still
 * answers `definite`. The shipped first track is
 * `calc(3.2rem * var(--panel-type, 1))` and `--panel-type` is a plain number
 * (`GameCanvas.tsx`), so the assumption holds today rather than always.
 *
 * A bare `<flex>` is `content`, and that is the case worth naming: `1fr` looks
 * like a share of the free space and is one, but its *automatic minimum* is
 * min-content, so a `1fr` track holding a long word is as unshrinkable as an
 * `auto` one. `minmax(0, 1fr)` is the same track with that minimum written
 * down.
 */
export type TrackFloor = { kind: 'definite'; value: string } | { kind: 'content'; from: string };

/** The track sizing keywords whose minimum is the contents of the track. */
const CONTENT_SIZED = new Set(['auto', 'min-content', 'max-content']);

/** Split on whitespace, or on commas, at paren depth zero only. */
function topLevel(value: string, on: 'space' | 'comma'): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    const breaks = on === 'space' ? /\s/.test(ch) : ch === ',';
    if (depth === 0 && breaks) {
      if (current.trim() !== '') out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() !== '') out.push(current.trim());
  return out;
}

/** A definite length, or a throw naming the track it came from. */
function definiteFloor(length: string, track: string): TrackFloor {
  if (length === '0') return { kind: 'definite', value: length };
  if (/^calc\(.*\)$/.test(length)) return { kind: 'definite', value: length };
  if (/^-?[\d.]+(px|rem|em|ch|ex|vw|vh|vmin|vmax|%)$/.test(length)) {
    return { kind: 'definite', value: length };
  }
  throw new Error(`cssBox cannot read the track \`${track}\``);
}

/** One track's floor, from the sizing function the stylesheet wrote for it. */
function floorOf(track: string): TrackFloor {
  if (CONTENT_SIZED.has(track)) return { kind: 'content', from: track };
  // `<flex>`: a share of the free space, but min-content underneath it.
  if (/^[\d.]+fr$/.test(track)) return { kind: 'content', from: track };
  // `fit-content(x)` clamps the *maximum* at x; the minimum stays min-content.
  if (/^fit-content\(.*\)$/.test(track)) return { kind: 'content', from: track };

  const minmax = /^minmax\((.*)\)$/.exec(track);
  if (minmax === null) return definiteFloor(track, track);

  const parts = topLevel(minmax[1], 'comma');
  if (parts.length !== 2) throw new Error(`cssBox cannot read the track \`${track}\``);
  const min = parts[0];
  if (CONTENT_SIZED.has(min)) return { kind: 'content', from: track };
  // A `<flex>` is not a legal minimum, so a stylesheet with one here is
  // something this reader should not be quietly interpreting.
  if (/fr$/.test(min)) throw new Error(`cssBox cannot read the track \`${track}\``);
  return definiteFloor(min, track);
}

/**
 * Each column track of a grid element, in order, by what it refuses to shrink
 * below.
 *
 * This is the other half of the question `borderBoxWidth` answers. That one
 * says how wide the row's box is *declared*; this one says whether the row can
 * be pushed past it from the inside, which is a property of the tracks and of
 * nothing else in the box arithmetic. #752 was the first; #760 is the second,
 * on the same row.
 *
 * Throws, in this file's register, on everything it cannot settle: an element
 * that is not a grid, a `grid`/`grid-template` shorthand it does not model, a
 * `repeat()` it would have to expand, and any track sizing function outside
 * the list above.
 */
export function columnFloors(rules: CssRule[], element: Element): TrackFloor[] {
  let display: string | undefined;
  let columns: string | undefined;

  for (const rule of boxRulesFor(rules, element, TRACK_PROPERTIES)) {
    for (const [property, value] of rule.declarations) {
      switch (property) {
        case 'display':
          display = value;
          break;
        case 'grid-template-columns':
          columns = value;
          break;
        case 'grid-template':
        case 'grid':
          throw new Error(`cssBox does not model \`${property}: ${value}\``);
        default:
          break;
      }
    }
  }

  if (display !== 'grid' && display !== 'inline-grid') {
    throw new Error(
      `cssBox was asked for the tracks of \`${element.classes.join('.')}\`, whose display is \`${display ?? 'unset'}\``
    );
  }
  if (columns === undefined) {
    throw new Error(
      `cssBox found no \`grid-template-columns\` on \`${element.classes.join('.')}\``
    );
  }
  return topLevel(columns, 'space').map(floorOf);
}

/**
 * Which column a child is placed in, 1-based, or undefined when the stylesheet
 * places it nowhere and auto-flow decides.
 *
 * Only the single-integer form is read, because it is the only one the panel
 * uses and because every other form — a span, a line name, `auto`, the
 * `grid-area` shorthand — would have to be resolved against the flow to give
 * an answer. Those throw rather than return undefined: "nothing places this"
 * and "this is placed in a way I cannot read" are different facts, and a test
 * that treated the second as the first would stop checking a column without
 * saying so.
 */
export function columnOf(rules: CssRule[], element: Element): number | undefined {
  const properties = new Set(['grid-column', 'grid-column-start', 'grid-area']);
  let placement: string | undefined;

  for (const rule of boxRulesFor(rules, element, properties)) {
    for (const [property, value] of rule.declarations) {
      if (property === 'grid-area') {
        throw new Error(`cssBox does not model \`grid-area: ${value}\``);
      }
      if (properties.has(property)) placement = value;
    }
  }

  if (placement === undefined) return undefined;
  const single = /^(\d+)$/.exec(placement.trim());
  if (single === null) {
    throw new Error(`cssBox cannot read the placement \`grid-column: ${placement}\``);
  }
  return Number(single[1]);
}

/**
 * Every declaration that decides whether a word too long for its box may be
 * **broken**.
 *
 * A third closed set beside `BOX_PROPERTIES` and `TRACK_PROPERTIES`, and a
 * third question: those two ask how wide a box is, and this one asks where the
 * ink goes inside it. They are genuinely independent — #760 floored the track
 * and #773 floored the result card's, and in both the token's glyphs went on
 * printing across the cells beside them, because a box is not ink (#774).
 *
 * `white-space` and `text-wrap` are in here without being about word breaking
 * at all: either can switch line breaking off entirely, and then no
 * `overflow-wrap` in the world breaks anything. A reader that looked only at
 * `overflow-wrap` would call `white-space: nowrap; overflow-wrap: anywhere` a
 * pass, which is the false pass this file exists to refuse.
 */
export const WRAP_PROPERTIES = new Set([
  'overflow-wrap',
  'word-wrap',
  'word-break',
  'white-space',
  'white-space-collapse',
  'text-wrap',
  'text-wrap-mode',
]);

/**
 * Whether an element may break a word it cannot otherwise fit.
 *
 * `permits` names the declaration that buys the break, so a failure says which
 * rule to look at. `refuses` names why — either nothing asked for a break, or
 * something switched line breaking off over the top of it.
 */
export type WordBreaking = { kind: 'permits'; by: string } | { kind: 'refuses'; because: string };

/**
 * Values of a wrap property this reader understands. Anything else throws
 * rather than being read as "no break", for `BOX_PROPERTIES`' reason one
 * question along: a value silently treated as inert reports `refuses` where
 * the browser breaks, which turns a holder into a change detector, and a value
 * silently treated as inert on the *other* side reports `permits` where the
 * browser does not, which is cover.
 */
const WRAP_VALUES: Record<string, Record<string, 'breaks' | 'inert' | 'no-wrapping'>> = {
  'overflow-wrap': { normal: 'inert', 'break-word': 'breaks', anywhere: 'breaks' },
  // The pre-standard alias, which every engine still maps onto `overflow-wrap`.
  'word-wrap': { normal: 'inert', 'break-word': 'breaks', anywhere: 'breaks' },
  // `break-word` here is the deprecated spelling and behaves as
  // `overflow-wrap: anywhere` with `word-break: normal`, so it breaks too.
  'word-break': {
    normal: 'inert',
    'keep-all': 'inert',
    'auto-phrase': 'inert',
    'break-all': 'breaks',
    'break-word': 'breaks',
  },
  'white-space': {
    normal: 'inert',
    'pre-wrap': 'inert',
    'pre-line': 'inert',
    'break-spaces': 'inert',
    nowrap: 'no-wrapping',
    pre: 'no-wrapping',
  },
  'white-space-collapse': { collapse: 'inert', preserve: 'inert', 'preserve-breaks': 'inert' },
  'text-wrap': {
    wrap: 'inert',
    balance: 'inert',
    pretty: 'inert',
    stable: 'inert',
    nowrap: 'no-wrapping',
  },
  'text-wrap-mode': { wrap: 'inert', nowrap: 'no-wrapping' },
};

/**
 * What the shipped stylesheet lets this element do with a word that will not
 * fit its box.
 *
 * Hyphenation is deliberately not read. `hyphens` needs a dictionary or a soft
 * hyphen in the text, so it cannot break the run of identical characters an
 * authored token can be, and counting it would be the optimistic direction.
 */
export function wordBreaking(rules: CssRule[], element: Element): WordBreaking {
  let breaksBy: string | undefined;
  let suppressedBy: string | undefined;

  for (const rule of boxRulesFor(rules, element, WRAP_PROPERTIES)) {
    for (const [property, value] of rule.declarations) {
      if (!WRAP_PROPERTIES.has(property)) continue;
      if (/!important/i.test(value)) {
        throw new Error(`cssBox does not model \`!important\` (\`${property}: ${value}\`)`);
      }
      const known = WRAP_VALUES[property];
      if (known === undefined) {
        // The set and this table are two halves of one list, exactly as
        // `BOX_PROPERTIES` and `resolveBox`'s switch are.
        throw new Error(`cssBox does not model \`${property}\``);
      }
      const effect = known[value.trim().toLowerCase()];
      if (effect === undefined) {
        throw new Error(`cssBox cannot read \`${property}: ${value}\``);
      }
      // Last wins, per property, and a later rule genuinely undoes an earlier
      // one — `overflow-wrap: normal` after `break-word` is a refusal.
      if (property === 'white-space' || property.startsWith('text-wrap')) {
        suppressedBy =
          effect === 'no-wrapping' ? `${rule.selector} { ${property}: ${value} }` : undefined;
      } else {
        breaksBy = effect === 'breaks' ? `${rule.selector} { ${property}: ${value} }` : undefined;
      }
    }
  }

  if (suppressedBy !== undefined) {
    return { kind: 'refuses', because: `line breaking is off — ${suppressedBy}` };
  }
  return breaksBy === undefined
    ? { kind: 'refuses', because: 'nothing sets `overflow-wrap` or `word-break`' }
    : { kind: 'permits', by: breaksBy };
}
