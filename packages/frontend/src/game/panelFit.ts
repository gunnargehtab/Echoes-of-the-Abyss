/**
 * The orders panel's type yields to its room — docs/ui-ux.md §2 and §11 (#1634).
 *
 * `panelType` already grows a panel's type by the square root of the UI scale
 * rather than by the scale, and that is not enough for the orders panel: the
 * room between the strip and the hint line shrinks as the console grows, and
 * Sorrowgate at 13:40 outgrew it at 150% on a 1440x900 screen and at 125% on
 * 1366x768. §2 lets the panel neither scroll nor pass the hint line, so what is
 * left to give is the size of its type. It steps down only as far as the type
 * the lowest setting draws, the smallest a player can ask for and so the
 * smallest the game already calls legible; below that the panel keeps
 * `overflow-y` as the backstop `.objectives-body` names.
 *
 * The cost §11 states: in a short window a raised setting can draw the orders
 * smaller than 100% does, because the console it raised took their room.
 *
 * `.objectives`' width rule divides by `--panel-type` too, so the override
 * widens the panel as its type shrinks, up to its 340-unit cap. That is wanted:
 * a wider line wraps less, which is height the fit does not have to take out of
 * the type.
 */

import { UI_SCALE_MIN } from '../settings/store.ts';
import { panelType } from './uiScale.ts';

/** The smallest type the panel will step down to, as a factor on screen: the lowest setting's. */
export const PANEL_TYPE_FLOOR = UI_SCALE_MIN * panelType(UI_SCALE_MIN);

/** Halvings in the search; past six the step is under a pixel of type. */
const STEPS = 6;

/**
 * The largest `--panel-type` in `[floor, base]` at which nothing overflows.
 *
 * `overflows` lays the panel out at a candidate and says whether it still
 * holds more than its room. Text wraps in steps, so overflow is not strictly
 * monotone in the type size; a search that lands on a size that fits is what
 * is asked for, not the largest of every size that does.
 */
export function fitPanelType(
  base: number,
  floor: number,
  overflows: (type: number) => boolean
): number {
  if (floor >= base || !overflows(base)) return base;
  if (overflows(floor)) return floor;
  let fits = floor;
  let over = base;
  for (let step = 0; step < STEPS; step++) {
    const mid = (fits + over) / 2;
    if (overflows(mid)) over = mid;
    else fits = mid;
  }
  return fits;
}

/**
 * Fit a mounted panel: set its own `--panel-type` to the largest that holds
 * every row, read against the scale and the base type `.game-root` gives it.
 *
 * The override lives on the panel's own element, so it shadows the root's
 * value for this panel and nothing else, and it is cleared first so a panel
 * that has room again grows back to the base.
 */
export function fitPanel(panel: HTMLElement, body: HTMLElement): void {
  panel.style.removeProperty('--panel-type');
  const inherited = getComputedStyle(panel);
  const base = Number(inherited.getPropertyValue('--panel-type')) || 1;
  const scale = Number(inherited.getPropertyValue('--ui-scale')) || 1;
  const overflows = (type: number) => {
    panel.style.setProperty('--panel-type', String(type));
    return body.scrollHeight > body.clientHeight;
  };
  const type = fitPanelType(base, Math.min(base, PANEL_TYPE_FLOOR / scale), overflows);
  if (type === base) panel.style.removeProperty('--panel-type');
  else panel.style.setProperty('--panel-type', String(type));
}
