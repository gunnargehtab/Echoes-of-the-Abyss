/**
 * The floating panels' rects, for the one chart mark that has to keep out from
 * under them: a mission marker's name (docs/ui-ux.md §10.5, #1662).
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
  push: (rects: PanelRect[]) => void
): PanelWatch {
  // The headless test runner has no MutationObserver, and lays nothing out.
  if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') {
    return { measure: () => {}, stop: () => {} };
  }
  const measure = (): void => {
    const origin = canvasHost.getBoundingClientRect();
    const rects: PanelRect[] = [];
    for (const panel of layer.querySelectorAll(FLOATING_PANELS)) {
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
    push(rects);
  };
  const sizes = new ResizeObserver(measure);
  const watchAll = (): void => {
    sizes.disconnect();
    sizes.observe(canvasHost);
    for (const panel of layer.querySelectorAll(FLOATING_PANELS)) sizes.observe(panel);
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
