/**
 * The top strip's explanations — docs/ui-ux.md §2, §7, §11, #724.
 *
 * DOM rather than Pixi, for the reason §10 and §11 already gave for the contact
 * log and the objectives panel: canvas text is neither selectable nor reachable
 * by a screen reader, so an explanation drawn on the glass could be read by a
 * pointer and by nothing else. The strip itself cannot move off the canvas —
 * it is the HUD — so this is the other half of that arrangement: the renderer
 * reports where each readout ended up (`onReadouts`), and one transparent
 * control is laid over each, carrying the line.
 *
 * Three routes, one surface:
 *
 * - **Pointer** — hovering the number shows its line. The control sits exactly
 *   on the glyphs the renderer drew, so it is the number that is hovered rather
 *   than a legend beside it.
 * - **Keyboard** — the controls are buttons in strip order, so Tab walks the
 *   strip left to right and `:focus-visible` shows the same line. The focus ring
 *   is drawn rather than suppressed: it is the only thing on the glass that says
 *   where the keyboard is.
 * - **Touch** — a tap pins the line open and a second tap closes it, which is
 *   the route a touchscreen actually has. Nothing here names a key, because
 *   §7's promise is about what the player in front of the screen can do, and
 *   #722 §4 is the open bug filed for the case where one line forgot that.
 *
 * The line is always in the accessible tree via `aria-describedby`, open or
 * shut — it is clipped when shut, not `display: none`, which would take it out
 * of the tree along with the pixels. A screen reader therefore hears the
 * explanation on focus without anything having to be opened at all.
 *
 * `pointer-events` is `none` on the layer and `auto` on the controls alone, so
 * the only pixels this takes away from the canvas are the readouts themselves.
 * Over those, two gestures are genuinely lost and are not worth the machinery
 * to forward: a right-click *move order*, which is issued from the canvas's
 * `pointerdown` rather than from the context menu, and the *start* of a
 * marquee, which would need the whole pointer sequence and a capture to follow
 * it. Both are over opaque chrome at the top of the screen with no world
 * visible through it. The browser context menu and the wheel are handed back
 * below, because those two are a broken frame rather than a lost affordance.
 */

import { useEffect, useState, type RefObject } from 'react';
import type { ReadoutBox, ReadoutKey } from './readouts.ts';

/**
 * The readouts that sit at the right-hand end of the strip, whose line is
 * anchored to their right edge instead of their left.
 *
 * A bubble anchored left on the contact count would start near the screen edge
 * and have nowhere to go; §2's strip puts these three there by construction —
 * the map name, the clock and the count — so the list is a fact about the
 * layout rather than a measurement of one.
 */
const RIGHT_ANCHORED: ReadonlySet<ReadoutKey> = new Set<ReadoutKey>(['map', 'clock', 'contacts']);

export function StripReadouts({
  boxes,
  host,
}: {
  boxes: ReadoutBox[];
  /**
   * The element holding the Pixi canvas, from the composition root.
   *
   * A prop rather than a `querySelector` for a sibling's canvas, which is the
   * seam this shell already uses everywhere it has to reach an imperative
   * thing — `harness`, `listRooms`, the renderer factory. `GameCanvas` is
   * where that element is created, so it is what hands it over.
   */
  host: RefObject<HTMLElement | null>;
}): React.JSX.Element | null {
  const [pinned, setPinned] = useState<ReadoutKey | null>(null);
  /**
   * Whether the keyboard is what put a line on screen.
   *
   * `:focus-visible` is the engine's judgement about how the focus arrived, and
   * it is the CSS that shows the line — but it cannot be asked at press time,
   * because the press changes the answer. Captured on focus instead, where the
   * question is still about the gesture that got here.
   */
  const [shownByFocus, setShownByFocus] = useState(false);

  // A pinned line outlives the readout it belongs to — crystal appears and
  // disappears with the field, and the clock is dropped when the strip runs out
  // of room — so a key that is no longer on the strip is unpinned rather than
  // left addressing nothing.
  useEffect(() => {
    if (pinned !== null && !boxes.some((box) => box.key === pinned)) setPinned(null);
  }, [boxes, pinned]);

  // A control that is dropped takes the focus with it, and React fires no blur
  // for a node it has unmounted — so the flag would otherwise stay true with
  // nothing focused, and Escape would swallow a press that closed nothing.
  useEffect(() => {
    if (shownByFocus && boxes.length === 0) setShownByFocus(false);
  }, [boxes, shownByFocus]);

  if (boxes.length === 0) return null;

  return (
    <div
      className="readouts"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        // Escape steps back one level, as §9.5 has it — a shown line first,
        // the esc menu after. Two things this has to get right and the first
        // draft got neither.
        //
        // It must actually change something. The line is shown by
        // `:focus-visible` as well as by the pin, so clearing `pinned` alone
        // left a keyboard player pressing Escape, seeing the line stay, and
        // not getting the menu either. Blurring the control is what closes the
        // focus route, and it is also the step back: focus lands on the
        // document, so a second Escape reaches the menu.
        //
        // And it must only swallow the press when it closed something. React
        // delegates to the root container, so `stopPropagation` here halts the
        // native event before the window `keydown` that opens the menu —
        // unconditionally stopping it would take the menu away from anyone
        // whose focus happened to be on the strip.
        // What is on screen, decided **before** the press rather than during
        // it. Two earlier versions of this condition were constant-true in a
        // browser and only the engine could show it:
        //
        // - `typeof target.blur === 'function'` — true of every element a
        //   browser can hand this handler, since the only focusable things
        //   under `.readouts` are these buttons.
        // - asking the engine `target.matches(':focus-visible')` here — also
        //   true, and for a subtler reason: Selectors-4 makes a focused element
        //   match as soon as the user interacts by keyboard, and *this press is
        //   that interaction*. Measured in Chromium: false before the press,
        //   true inside the handler for the same element.
        //
        // So the flag is read in `onFocus`, which runs before any keypress on
        // the control — Tab gives true, a click gives false — and kept. The
        // live case both versions left open: pin a line by clicking, click
        // again to unpin, press Escape. Nothing is on screen, and the press was
        // swallowed anyway, taking the esc menu (§9.5) with it.
        if (pinned === null && !shownByFocus) return;
        const target = event.target as { blur?: () => void };
        event.stopPropagation();
        setPinned(null);
        setShownByFocus(false);
        target.blur?.();
      }}
      // The canvas below owns every gesture over the water, and these controls
      // are not its descendants, so what lands on one never reaches it. Two of
      // those are worth handing back rather than losing.
      //
      // The context menu is the outright bug: `EchoRenderer` binds
      // `contextmenu` on the canvas for the sole purpose of calling
      // `preventDefault` — App.css says why, "right-click is a move order, not
      // a browser menu" — and without this a right-click on a readout opens
      // the browser's menu over a live match.
      onContextMenu={(event) => event.preventDefault()}
      // The wheel is forwarded rather than merely swallowed: zoom is a
      // continuous gesture and losing it over a rectangle in the corner reads
      // as the game stuttering. The canvas handler takes `clientX/Y` and
      // `deltaY` and captures nothing, so a synthetic event is enough.
      onWheel={(event) => {
        const canvas = host.current?.querySelector('canvas');
        canvas?.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: event.deltaY,
            clientX: event.clientX,
            clientY: event.clientY,
            cancelable: true,
          })
        );
      }}
    >
      {boxes.map((box) => (
        <div
          key={box.key}
          className="readout-slot"
          style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
        >
          <button
            type="button"
            className="readout"
            // The strip's own text is the name: a screen reader hears the
            // number the way the screen shows it, then the line explaining it.
            aria-label={box.value}
            aria-describedby={`readout-${box.key}`}
            aria-expanded={pinned === box.key}
            onClick={() => setPinned((open) => (open === box.key ? null : box.key))}
            onFocus={(event) =>
              setShownByFocus(
                (event.target as unknown as { matches?: (q: string) => boolean }).matches?.(
                  ':focus-visible'
                ) === true
              )
            }
            onBlur={() => setShownByFocus(false)}
          />
          <span
            id={`readout-${box.key}`}
            className={RIGHT_ANCHORED.has(box.key) ? 'readout-detail to-left' : 'readout-detail'}
          >
            {box.detail}
          </span>
        </div>
      ))}
    </div>
  );
}
