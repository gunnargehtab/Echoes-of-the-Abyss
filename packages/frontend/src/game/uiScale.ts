/**
 * §11's UI scale, as the HUD draws it — docs/ui-ux.md §2 and §11.
 *
 * The setting is what the player asked for (`settings/store.ts`). This file
 * says what the screen draws from it: how big a floating panel's type is
 * against the panel it sits in, and how far a short window holds the scale.
 * GameCanvas, the orders panel's fit and the settings screen all read it here,
 * so the three cannot disagree about the factor.
 */

import { UI_SCALE_MIN } from '../settings/store.ts';

/**
 * How much smaller a floating panel's own type is set than the panel it sits
 * in.
 *
 * The panels scale by a transform, so at 200% each one covers four times the
 * area while the screen between the top strip and the console stays the size
 * it was. The orders panel lost that argument outright: at 200% on a 900 px
 * screen it had about 182 panel units of room for 444 units of rows, which is
 * not a layout to be tuned but arithmetic, and §2 does not let it scroll.
 *
 * So above 100% the type inside a panel grows by the square root of the scale
 * rather than by the scale. At 200% the reader still gets type about 1.4x the
 * size it was — magnification that is worth asking for — while the panel holds
 * roughly twice the rows it otherwise would. Below 100% it is 1: shrinking the
 * HUD is a request for more room and the panels already give it.
 */
export const panelType = (uiScale: number) => (uiScale <= 1 ? 1 : Math.sqrt(uiScale) / uiScale);

/**
 * The console, from docs/concept-art/hud-mockups/ — the direction chosen for
 * the in-match interface.
 *
 * It replaces an 80 px bar of one button row under a tab strip with a 208 px
 * console of fixed blocks, which is a real cost in ocean and is paid for by
 * what the blocks hold: nothing sits behind a tab, so production stops being
 * something a commander has to go and look for.
 *
 * 208 is a *pixel* height rather than a fraction, like the bar it replaces, so
 * a short window gives up proportionally more of itself — 19% of a 1080p frame
 * and 23% of a 900px one. That is inherent to a console whose rows have a
 * minimum size (§11's 44 px target floor is what sets it), and `uiScale` is the
 * knob for wanting it bigger rather than the window height.
 */
export const CONSOLE_HEIGHT = 208;

/** Top resource strip. */
export const TOP_BAR_HEIGHT = 52;

/** The hint line over the console — why a press did nothing (§2). */
export const HINT_LINE_HEIGHT = 20;

/**
 * Between the strip's foot and a floating panel's head. App.css restates the
 * strip and this as the `60px` in `.objectives`' and the contact log's `top`.
 */
const PANEL_GAP = 8;

/** Between a floating panel's foot and the hint line. */
const HINT_BREATH = 4;

/**
 * The chrome above and below the water, in HUD units: 292 today. GameCanvas
 * hands it to CSS as `--chrome-units`, which `.objectives`' max-height takes
 * off the screen, so the panel's cap and the held scale read one sum.
 */
export const CHROME_UNITS =
  TOP_BAR_HEIGHT + PANEL_GAP + CONSOLE_HEIGHT + HINT_LINE_HEIGHT + HINT_BREATH;

/** SPEC — docs/ui-ux.md §11: the most of the window's height chrome may take. */
const CHROME_SHARE_MAX = 0.5;

/**
 * The UI scale the HUD draws at: the player's setting, held where the window
 * is too short to carry it (#1634).
 *
 * The strip and the console grow with the scale while the window does not, so
 * at 200% on a 1366x768 screen they left 92 units of water between them, and
 * no legible type fits the orders panel in that. Held so the chrome takes at
 * most half the height, the scale reaches 200% only in a window 1,168 px tall.
 * The setting itself is kept, so a taller window draws what was asked for.
 * Never below the setting's own minimum, which the renderer clamps to anyway.
 *
 * One factor for everything the setting moves: the Pixi HUD, the pointer hits
 * divided back through it, and every DOM rule that reads `--ui-scale`. A panel
 * held at one scale over a console drawn at another would not line up.
 */
export const heldUiScale = (setting: number, windowHeight: number) =>
  Math.min(setting, Math.max(UI_SCALE_MIN, (windowHeight * CHROME_SHARE_MAX) / CHROME_UNITS));
