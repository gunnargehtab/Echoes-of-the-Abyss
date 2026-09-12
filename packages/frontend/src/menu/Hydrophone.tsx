/**
 * The title screen's hydrophone panel — docs/ui-ux.md §14, "The listening room".
 *
 * The one canvas in the shell, and the one moving thing in it. Everything here
 * is decoration: the panel is `aria-hidden`, holds no focusable element, and
 * says nothing the readable list under the entries does not. §11 makes
 * accessibility a correctness requirement, and an instrument that read "000 090
 * 180 270 359" aloud would be spending a player's attention on nothing.
 *
 * What it may not do is imply water. Cyan tells you and tells you nothing here;
 * the one mark that is not noise is magenta, the ink that asks, and it is the
 * pointer's own position rather than a contact.
 */

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createWaterfall, ROW_MS, type Waterfall } from './waterfall.ts';

/** The bearing axis. Five marks is enough to say "this is a circle of water". */
const BEARINGS = ['000', '090', '180', '270', '359'];

export interface HydrophoneProps {
  /**
   * The bin the pointer or the focus is on.
   *
   * A ref rather than a prop value because hovering a menu entry must not
   * re-render a canvas that is already repainting five times a second. The
   * entries write to it; the painter reads it on the beat.
   */
  mark: RefObject<number | null>;
  /**
   * §11's setting. True holds one primed frame of history and stops advancing:
   * a display carrying no information has no parity to preserve, so the honest
   * reduction is to stop the motion rather than to replace it (§14).
   */
  reducedMotion: boolean;
  /** The painter. Defaults to the real one; a test hands in a recorder. */
  create?: (canvas: HTMLCanvasElement) => Waterfall | null;
}

/**
 * The gutter, labelled from what the canvas is actually holding.
 *
 * `span` comes back from `fit()` rather than being written here a second time,
 * because how much history is on screen is a function of the panel's height.
 * `0 s` is nudged clear of the rule above it, which it would otherwise sit
 * half on top of.
 */
function ticks(span: number): ReactNode {
  if (!(span > 1)) return null;
  const every = span > 45 ? 20 : span > 22 ? 10 : 5;
  const out: ReactNode[] = [];
  for (let second = 0; second <= span; second += every) {
    const at = second === 0 ? 1.8 : (second / span) * 100;
    if (at > 94) break;
    out.push(
      <i key={second} style={{ top: `${at.toFixed(2)}%` }}>
        {second === 0 ? '0 s' : `-${second} s`}
      </i>
    );
  }
  return out;
}

export function Hydrophone({ mark, reducedMotion, create = createWaterfall }: HydrophoneProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [span, setSpan] = useState(0);

  useEffect(() => {
    const element = canvas.current;
    if (element === null) return;
    const fall = create(element);
    if (fall === null) return;

    setSpan(fall.fit());

    // The panel is sized in vw and vh, so the history it holds changes with the
    // window rather than only at mount.
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => setSpan(fall.fit())) : null;
    observer?.observe(element);

    const beat = reducedMotion ? null : setInterval(() => fall.row(mark.current), ROW_MS);

    return () => {
      observer?.disconnect();
      if (beat !== null) clearInterval(beat);
    };
  }, [create, mark, reducedMotion]);

  return (
    <div className="title-fall" aria-hidden="true">
      <div className="title-fall-head">
        <span>
          Channel 01 <b>hydrophone</b>
        </span>
        <span>Noise floor</span>
      </div>
      <div className="title-fall-axis">
        {BEARINGS.map((bearing) => (
          <span key={bearing}>{bearing}</span>
        ))}
      </div>
      <div className="title-fall-body">
        <canvas ref={canvas} className="title-fall-canvas" />
        <div className="title-fall-time">{ticks(span)}</div>
      </div>
      <div className="title-fall-foot">
        <span>Gain +6 dB</span>
        <span>20 to 2k Hz</span>
      </div>
    </div>
  );
}
