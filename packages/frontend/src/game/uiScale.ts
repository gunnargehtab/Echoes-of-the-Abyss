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
 * it was. The orders panel loses that argument outright: at 200% on a 900 px
 * screen it has about 182 panel units of room for 444 units of rows, which is
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
 * The chrome above and below the water, in HUD units: the strip's 60, and the
 * console's 208, the hint line's 20 and its 4 of breath below. `.objectives`'
 * max-height in App.css is the screen less these same 292.
 */
const CHROME_UNITS = 292;

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
