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
 * measuring. It is a deliberately small box model — `box-sizing`, `width`, and
 * the horizontal padding and border, on one element, in its resting state —
 * and it throws on anything it cannot resolve rather than guessing. A value it
 * does not understand becomes a test failure naming the value, which is the
 * right outcome: the alternative is a guard that quietly stops guarding.
 *
 * What it is **not** is a CSS engine. No specificity tie-breaking beyond source
 * order, no inheritance, no `calc()`, no custom properties, no cascade layers.
 * Two of those are worth naming because they would change an answer rather
 * than merely refuse one:
 *
 * - **Specificity is approximated by source order.** Every rule this reads in
 *   this repository is a bare class or a tag-and-class on one element, and
 *   those are written in increasing specificity anyway (`.objectives-row`
 *   before `p.objectives-row`). A stylesheet that put the tag rule first would
 *   be read wrongly here and correctly by the browser.
 * - **A conditional rule is excluded, not evaluated.** `boxRulesFor` drops
 *   anything under `@media`, because "which viewport" is the caller's question;
 *   `rulesTargeting` hands back the conditional rules so a caller can ask it.
 *
 * Shorthands are expanded **in source order** rather than collected per
 * property, because `border: 0` after `border-left-width: 2px` means zero and a
 * reader that kept the two side by side would have to guess which won.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The stylesheet the client actually ships, read rather than restated. */
export const APP_CSS = readFileSync(
  fileURLToPath(new URL('../../src/App.css', import.meta.url)),
  'utf8'
);

/** The declarations that can change how wide an element's border box is. */
const BOX_PROPERTIES = new Set([
  'box-sizing',
  'width',
  'padding',
  'padding-left',
  'padding-right',
  'border',
  'border-width',
  'border-left',
  'border-right',
  'border-left-width',
  'border-right-width',
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
 * Comments go first — a `/*` comment can contain braces and this repository's
 * CSS comments are long prose — and then it is a brace walk rather than a
 * regex, because `@media` nests and a regex that pretends otherwise reads a
 * media block's closing brace as a selector.
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

export interface Element {
  /** The host tag React rendered — `p` and `button` box differently. */
  tag: string;
  classes: string[];
}

/**
 * Does this selector target `element` itself, in its resting state?
 *
 * Three answers rather than two, because "no" and "this reader cannot tell"
 * are different facts and collapsing them is how a guard goes quiet. A
 * selector naming a state (`:hover`) or a descendant (`.row .cell`) targets
 * something other than this element at rest and is `no`; a selector shaped in
 * a way this reader does not parse is `unknown`, and the caller fails on it.
 */
function targets(selector: string, element: Element): 'yes' | 'no' | 'unknown' {
  const trimmed = selector.trim();
  // A combinator means the subject is a descendant or a sibling, not this
  // element as named. Those rules style something inside the row.
  if (/[\s>+~]/.test(trimmed)) return 'no';
  // A pseudo-element, or a state this element is not in while simply sitting
  // on screen.
  if (trimmed.includes(':')) return 'no';

  const match = /^([a-z][a-z0-9]*)?((?:\.[A-Za-z0-9_-]+)*)$/.exec(trimmed);
  if (match === null) return 'unknown';
  const [, tag, classPart] = match;
  if (tag === undefined && classPart === '') return 'unknown';
  if (tag !== undefined && tag !== element.tag) return 'no';
  const wanted = classPart === '' ? [] : classPart.slice(1).split('.');
  return wanted.every((c) => element.classes.includes(c)) ? 'yes' : 'no';
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

/** The same list, narrowed to the rules that apply at every viewport. */
export function boxRulesFor(rules: CssRule[], element: Element): CssRule[] {
  return rulesTargeting(rules, element).filter((rule) => rule.condition === null);
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
    paddingLeft: '0',
    paddingRight: '0',
    borderLeftWidth: '0',
    borderRightWidth: '0',
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
        case 'width':
          box.width = value;
          break;
        case 'padding': {
          const { left, right } = horizontalSlots(value);
          box.paddingLeft = left;
          box.paddingRight = right;
          break;
        }
        case 'padding-left':
          box.paddingLeft = value;
          break;
        case 'padding-right':
          box.paddingRight = value;
          break;
        case 'border': {
          const width = borderShorthandWidth(value);
          box.borderLeftWidth = width;
          box.borderRightWidth = width;
          break;
        }
        case 'border-width': {
          const { left, right } = horizontalSlots(value);
          box.borderLeftWidth = left;
          box.borderRightWidth = right;
          break;
        }
        case 'border-left':
          box.borderLeftWidth = borderShorthandWidth(value);
          break;
        case 'border-right':
          box.borderRightWidth = borderShorthandWidth(value);
          break;
        case 'border-left-width':
          box.borderLeftWidth = value;
          break;
        case 'border-right-width':
          box.borderRightWidth = value;
          break;
        default:
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
  const percent = /^([\d.]+)%$/.exec(box.width.trim());
  const width =
    percent !== null
      ? (Number(percent[1]) / 100) * containerContentWidth
      : lengthPx(box.width, rootFontPx, 'width');

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
