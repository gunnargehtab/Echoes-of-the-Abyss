/**
 * Enough of the CSS box model to answer one question these tests cannot
 * otherwise ask: does an element's **border box** fit the box that holds it?
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
 * - a length in a unit it cannot turn into px (`lengthPx`).
 *
 * What it does **not** model, and does not need to: inheritance, `calc()`,
 * custom properties, cascade layers, `!important`, and specificity beyond
 * source order. That last one is an approximation rather than a refusal, so it
 * is the one to know about — every rule it reads here is a bare class or a
 * tag-and-class, and those are written in increasing specificity anyway
 * (`.objectives-row` before `p.objectives-row`). A stylesheet that put the tag
 * rule first would be read wrongly here and correctly by a browser.
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
  /** The `@media`/`@supports` prelude this rule sits under, or null at top level. */
  condition: string | null;
}

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

    if (/^@(media|supports)\b/.test(prelude)) {
      condition = prelude;
      i = open + 1;
      continue;
    }
    if (prelude.startsWith('@')) {
      // `@keyframes`, `@font-face` — nested blocks this reader has no use for.
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
export function rulesTargeting(rules: CssRule[], element: Element): CssRule[] {
  const out: CssRule[] = [];
  for (const rule of rules) {
    for (const selector of rule.selector.split(',')) {
      const verdict = targets(selector, element);
      if (verdict === 'unknown') {
        if (!rule.declarations.some(([property]) => BOX_PROPERTIES.has(property))) continue;
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
export function boxRulesFor(rules: CssRule[], element: Element): CssRule[] {
  const targeted = rulesTargeting(rules, element);
  for (const rule of targeted) {
    if (rule.condition === null) continue;
    if (!rule.declarations.some(([property]) => BOX_PROPERTIES.has(property))) continue;
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
