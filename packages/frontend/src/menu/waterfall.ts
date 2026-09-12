/**
 * The title screen's hydrophone fall — docs/ui-ux.md §14, "The listening room".
 *
 * A painter behind a factory rather than drawing inside the component, for the
 * reason the renderer smoke test argues at length: what is worth holding about
 * this thing is *counted work* — that a row advances on the Echo beat, and that
 * reduced motion stops it — and a canvas under `react-test-renderer` is a stub
 * with no 2D context to count against. `Hydrophone` takes this factory as an
 * optional prop, defaulting to the real thing, and a test hands in a recorder.
 * That is the same seam `BrowseScreen`'s `listRooms` is, for the same reason.
 *
 * The inks are rgb triples rather than tokens because a canvas cannot read a
 * CSS variable, which is why `App.css` writes the same two literals throughout.
 * They are `--neon-cyan` and `--neon-magenta` out of `index.css`, and no third
 * colour appears in here.
 */

/** `--neon-cyan`. The ink that tells you — and on this screen it tells you nothing. */
const CYAN = '53, 224, 255';

/** `--neon-magenta`. The ink that asks. One mark, and the mark is your pointer. */
const MAGENTA = '255, 61, 166';

/** Columns across the array: 54 bins of about 6.7° each covers 000 to 359. */
export const BINS = 54;

/** The Echo Layer's own beat (`SIM.ECHO_HZ`), which the port ticks at too. */
export const ROW_MS = 200;

/** A row's ink and the gap under it, in CSS px. Together they set the history. */
const ROW_PX = 2.4;
const GAP_PX = 1;

/**
 * The port's own machinery.
 *
 * A real hydrophone floor carries stationary lines — pumps, recirculators, the
 * building you are standing in — and a field of even hiss reads as television
 * snow rather than as water. These three wander slightly and never resolve into
 * anything, which is the point: §14 forbids this display from implying a
 * contact, and a ridge that stayed put would eventually look like one.
 */
const RIDGES = [
  { bin: 9.5, width: 1.15, gain: 0.4, drift: 0.6, phase: 0 },
  { bin: 26, width: 0.7, gain: 0.3, drift: 0.3, phase: 2.1 },
  { bin: 41.5, width: 1.7, gain: 0.22, drift: 0.9, phase: 4.2 },
] as const;

export interface Waterfall {
  /**
   * Size to the element and refill it with history.
   *
   * Returns how many seconds of history are now on screen, because that is a
   * function of the panel's height and it is what labels the gutter. Returning
   * it keeps the number in one place instead of two that can disagree.
   */
  fit(): number;
  /** Advance one row. `mark` is the bin the pointer is on, or null for none. */
  row(mark: number | null): void;
}

/**
 * The real painter, or null when there is no 2D context to paint into.
 *
 * Null rather than a throw: a machine with no canvas still has a menu, and the
 * fall is decoration (§14). The component simply renders a still panel.
 */
export function createWaterfall(canvas: HTMLCanvasElement): Waterfall | null {
  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (ctx === null) return null;

  let dpr = 1;
  let rowH = 1;
  let step = 1;

  const paintRow = (y: number, seconds: number, mark: number | null): void => {
    const binW = canvas.width / BINS;
    // One slow swell, so the floor is not the same floor for ever.
    const swell = 0.5 + 0.5 * Math.sin((seconds / 12) * Math.PI * 2);
    for (let bin = 0; bin < BINS; bin += 1) {
      let level = 0.05 + 0.1 * swell + Math.random() * 0.2;
      // A tilt across the array: an even wall of noise reads as a texture.
      level *= 0.72 + 0.28 * Math.sin((bin / BINS) * Math.PI + seconds * 0.35);
      for (const ridge of RIDGES) {
        const centre = ridge.bin + Math.sin(seconds * 0.17 + ridge.phase) * ridge.drift;
        const offset = (bin - centre) / ridge.width;
        if (offset > -3 && offset < 3) {
          level += ridge.gain * Math.exp(-offset * offset) * (0.7 + Math.random() * 0.6);
        }
      }
      ctx.fillStyle = `rgba(${CYAN}, ${Math.min(level, 1) * 0.7})`;
      ctx.fillRect(bin * binW + dpr, y, binW - 2 * dpr, rowH);
    }
    if (mark !== null) {
      const bin = Math.max(0, Math.min(BINS - 1, mark));
      ctx.fillStyle = `rgba(${MAGENTA}, 0.85)`;
      ctx.fillRect(bin * binW + dpr, y, binW - 2 * dpr, rowH);
    }
  };

  return {
    fit(): number {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      rowH = Math.max(2, Math.round(ROW_PX * dpr));
      step = rowH + Math.max(1, Math.round(GAP_PX * dpr));
      const now = performance.now() / 1000;
      for (let y = 0; y < height; y += step) {
        paintRow(y, now - (y / step) * (ROW_MS / 1000), null);
      }
      return (height / step) * (ROW_MS / 1000);
    },

    row(mark: number | null): void {
      if (canvas.width < 2) return;
      // Scrolling by drawing the canvas onto itself. `copy` replaces rather
      // than composites, so the row pushed past the bottom edge goes with it
      // and no clear of the whole surface is needed.
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(canvas, 0, step);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, step);
      paintRow(0, performance.now() / 1000, mark);
    },
  };
}
