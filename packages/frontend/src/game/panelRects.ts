/**
 * The floating panels' rects, for the one chart mark that has to keep out from
 * under them: a mission marker's name (docs/ui-ux.md §10.5, #1662); and, on
 * its own path, the free-water legend's rect on the hint row, for the hint to
 * yield to (`HINT_ROW_PANELS`).
 *
 * The panels are DOM glass over the canvas (§2), opaque, and the renderer
 * knows nothing of the DOM. A name the rule put beside where a wide ring comes
 * in landed under the orders panel or the contact log at the home dolly, so
 * the shell measures them and hands the rects across. One `ResizeObserver`
 * watches each panel, for a fold or a row arriving, and the canvas's host, for
 * the window; a `MutationObserver` on their layer catches a panel mounting or
 * leaving. A UI-scale change it cannot see: three of the panels scale by a CSS
 * transform, which moves no layout box, so the shell calls `measure` after
 * each one. The rects are in the canvas's own pixels, the chart's overlay's.
 */
import type { PanelRect } from './EchoRenderer.ts';

/** The panels that float over the water: orders or objectives, the contact log, the mission log. */
export const FLOATING_PANELS = '.objectives, .contact-log, .mission-log';

/**
 * The free-water study's decorative-life legend, which stands on the hint
 * line's row and which the hint yields to (`EchoRenderer`, the hint line). Its
 * own path, not a floating panel: the mission log's foot stands 8 units into
 * that row too, and a hint that yielded to every panel would be cut on every
 * mission map, which is docs/ui-ux.md §2's call and not the study's.
 */
export const HINT_ROW_PANELS = '.decorative-life';

/** A running watch: measure again now, or stop. */
export interface PanelWatch {
  measure(): void;
  stop(): void;
}

/**
 * Measure the floating panels in `layer` against `canvasHost` now and on every
 * change the observers see, handing each set to `push`.
 */
export function watchPanels(
  layer: HTMLElement,
  canvasHost: HTMLElement,
  push: (rects: PanelRect[]) => void,
  pushHintRow: (rects: PanelRect[]) => void = () => {}
): PanelWatch {
  // The headless test runner has no MutationObserver, and lays nothing out.
  if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') {
    return { measure: () => {}, stop: () => {} };
  }
  const measure = (): void => {
    const origin = canvasHost.getBoundingClientRect();
    const rectsOf = (selector: string): PanelRect[] => {
      const rects: PanelRect[] = [];
      for (const panel of layer.querySelectorAll(selector)) {
        const r = panel.getBoundingClientRect();
        // The contact log is `display: none` under 900 px wide, and covers nothing.
        if (r.width === 0 || r.height === 0) continue;
        rects.push({
          x: r.left - origin.left,
          y: r.top - origin.top,
          width: r.width,
          height: r.height,
        });
      }
      return rects;
    };
    push(rectsOf(FLOATING_PANELS));
    pushHintRow(rectsOf(HINT_ROW_PANELS));
  };
  const sizes = new ResizeObserver(measure);
  const watchAll = (): void => {
    sizes.disconnect();
    sizes.observe(canvasHost);
    for (const selector of [FLOATING_PANELS, HINT_ROW_PANELS]) {
      for (const panel of layer.querySelectorAll(selector)) sizes.observe(panel);
    }
    measure();
  };
  const mounts = new MutationObserver(watchAll);
  mounts.observe(layer, { childList: true });
  watchAll();
  return {
    measure,
    stop: () => {
      mounts.disconnect();
      sizes.disconnect();
    },
  };
}
