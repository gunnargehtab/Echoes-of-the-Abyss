/**
 * The conn view's GPU time — docs/graphics-standards.md gate 6, "Abyss Render
 * Stack increment": every render-stack change reports the frame's GPU time on
 * the named GPU, every pass summed, before and after.
 *
 * The probe's other milliseconds cannot stand in for it. `connMs` is CPU time
 * (entity sync plus the GL submit, which returns long before the GPU is done)
 * and `frameMs` an interval the display paces, so on a desktop GPU a change
 * that doubles the shading cost moves neither until a frame misses vsync.
 *
 * A timer query (`EXT_disjoint_timer_query_webgl2`) brackets the frame's
 * passes: `begin` before the first, `end` after the last, so a pass added
 * later is inside the bracket without anyone remembering to time it. Today
 * the frame is one `renderer.render`. Results arrive frames later, so queries
 * queue and are collected oldest first. A disjoint event — a clock change, a
 * context switch — makes every result in flight meaningless, and those are
 * dropped and counted rather than averaged.
 *
 * Development builds only: a shipped frame pays nothing for an instrument
 * nobody reads, and only a capture against the dev server reads this one.
 */
import { FrameCost } from './frameCost.ts';

/**
 * A software rasteriser's time is the rasteriser's, not the scene's (gate 6),
 * so the timer refuses one outright rather than report a number that would be
 * quoted. The tools match the same renderer strings
 * (tools/render-stack/capture.mjs).
 */
export const SOFTWARE_RASTERISER = /swiftshader|llvmpipe|software|basic render/i;

/**
 * Queries in flight at once. Results come back in two to four frames on the
 * named GPU, so eight leaves room for a slow frame; a frame that finds all
 * eight still waiting goes untimed, which `gpuFrames` falling behind
 * `stationFrames` makes visible.
 */
const IN_FLIGHT = 8;

/** Why the timer is or is not reading — the probe reports it beside the numbers. */
export type GpuTimerState = 'timing' | 'software' | 'unavailable' | 'off';

/** The constants the extension adds; the WebGL2 typings do not declare it. */
interface TimerQueryExtension {
  readonly TIME_ELAPSED_EXT: GLenum;
  readonly GPU_DISJOINT_EXT: GLenum;
}

/** The slice of a WebGL2 context the timer touches. */
export type TimerContext = Pick<
  WebGL2RenderingContext,
  | 'getExtension'
  | 'getParameter'
  | 'createQuery'
  | 'deleteQuery'
  | 'beginQuery'
  | 'endQuery'
  | 'getQueryParameter'
  | 'RENDERER'
  | 'QUERY_RESULT_AVAILABLE'
  | 'QUERY_RESULT'
>;

/** The renderer string, unmasked where the browser allows it. */
export function rendererName(
  gl: Pick<WebGL2RenderingContext, 'getExtension' | 'getParameter' | 'RENDERER'>
): string {
  const debug = gl.getExtension('WEBGL_debug_renderer_info') as {
    UNMASKED_RENDERER_WEBGL: GLenum;
  } | null;
  return String(gl.getParameter(debug === null ? gl.RENDERER : debug.UNMASKED_RENDERER_WEBGL));
}

export class GpuTimer {
  readonly state: GpuTimerState;
  /** This station's frame GPU times, in milliseconds. */
  readonly cost = new FrameCost();
  /** Results this station lost to a disjoint event. */
  dropped = 0;
  private readonly gl: TimerContext | null;
  private readonly ext: TimerQueryExtension | null = null;
  private readonly idle: WebGLQuery[] = [];
  private readonly pending: { query: WebGLQuery; station: number }[] = [];
  private open: WebGLQuery | null = null;
  /** Bumped at each station boundary, so a late result lands in its own. */
  private station = 0;

  constructor(gl: TimerContext | null, enabled: boolean) {
    this.gl = gl;
    if (!enabled) {
      this.state = 'off';
    } else if (gl === null) {
      this.state = 'unavailable';
    } else if (SOFTWARE_RASTERISER.test(rendererName(gl))) {
      this.state = 'software';
    } else {
      this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExtension | null;
      this.state = this.ext === null ? 'unavailable' : 'timing';
    }
  }

  /** Before the frame's first pass. */
  begin(): void {
    const { gl, ext } = this;
    if (gl === null || ext === null || this.open !== null) return;
    this.collect(gl, ext);
    const query = this.idle.pop() ?? (this.pending.length < IN_FLIGHT ? gl.createQuery() : null);
    if (query === null) return;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    this.open = query;
  }

  /** After the frame's last pass. */
  end(): void {
    const { gl, ext, open } = this;
    if (gl === null || ext === null || open === null) return;
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    this.pending.push({ query: open, station: this.station });
    this.open = null;
  }

  /** A station boundary: the series starts over, and results in flight go
   * to the station that took them, which is no longer listening. */
  reset(): void {
    this.station++;
    this.cost.reset();
    this.dropped = 0;
  }

  dispose(): void {
    const { gl } = this;
    if (gl === null) return;
    this.end();
    for (const query of this.idle) gl.deleteQuery(query);
    for (const { query } of this.pending) gl.deleteQuery(query);
    this.idle.length = 0;
    this.pending.length = 0;
  }

  private collect(gl: TimerContext, ext: TimerQueryExtension): void {
    if (gl.getParameter(ext.GPU_DISJOINT_EXT) === true) {
      for (const { query, station } of this.pending) {
        if (station === this.station) this.dropped++;
        this.idle.push(query);
      }
      this.pending.length = 0;
      return;
    }
    while (this.pending.length > 0) {
      const { query, station } = this.pending[0]!;
      if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE) !== true) return;
      const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
      this.pending.shift();
      this.idle.push(query);
      if (station === this.station) this.cost.add(ns / 1e6);
    }
  }
}
