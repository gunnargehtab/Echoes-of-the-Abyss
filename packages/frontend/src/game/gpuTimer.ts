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
 * Split, a development switch, times each pass in a query of its own as well:
 * the frame is still the sum, and `parts` holds each pass's series. One
 * bracket cannot say which pass a cost lands in, and #1001's halo raised the
 * bracket by about four times what its own passes read on their own.
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
 * Frames in flight at once. Results come back in two to four frames on the
 * named GPU, so eight leaves room for a slow frame; a frame that finds all
 * eight still waiting goes untimed, which `gpuFrames` falling behind
 * `stationFrames` makes visible. Unsplit, a frame is one query.
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

/** A query ended and not yet read: whose, which pass, and whether it closed a frame. */
interface Pending {
  readonly query: WebGLQuery;
  readonly station: number;
  readonly part: string;
  readonly last: boolean;
}

export class GpuTimer {
  readonly state: GpuTimerState;
  /** This station's frame GPU times, in milliseconds. */
  readonly cost = new FrameCost();
  /** Each pass's GPU times while split, by the name its mark gave it. */
  readonly parts = new Map<string, FrameCost>();
  /** Frames this station lost to a disjoint event. */
  dropped = 0;
  private readonly gl: TimerContext | null;
  private readonly ext: TimerQueryExtension | null = null;
  private readonly idle: WebGLQuery[] = [];
  private readonly pending: Pending[] = [];
  private open: WebGLQuery | null = null;
  private openPart = '';
  /** Bumped at each station boundary, so a late result lands in its own. */
  private station = 0;
  private splitting = false;
  /** Frames whose last query is still pending: the in-flight bound. */
  private framesInFlight = 0;
  /** The frame being collected, its parts summed so far. */
  private frameSum = 0;
  /** Every timer on this context, this one included (see `collect`). */
  private readonly peers: GpuTimer[];
  /** A disjoint event a peer read and this timer has not yet acted on. */
  private disjointOwed = false;

  /**
   * `peers` is shared by every timer on one context: GPU_DISJOINT_EXT resets
   * when it is read, so whichever timer reads it first hands the event to the
   * rest, and none of them averages a result the event voided.
   */
  constructor(gl: TimerContext | null, enabled: boolean, peers: GpuTimer[] = []) {
    this.gl = gl;
    this.peers = peers;
    peers.push(this);
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

  get split(): boolean {
    return this.splitting;
  }

  /** The development switch: split or not, the series start over. A timer
   * that reads nothing splits nothing. */
  setSplit(on: boolean): void {
    this.splitting = on && this.state === 'timing';
    this.reset();
  }

  /** Before the frame's first pass, which `part` names while split. */
  begin(part = 'frame'): void {
    const { gl, ext } = this;
    if (gl === null || ext === null || this.open !== null) return;
    this.collect(gl, ext);
    if (this.framesInFlight >= IN_FLIGHT) return;
    this.start(gl, ext, part);
  }

  /** Between two passes: while split, the next pass's own query starts here.
   * Unsplit, or in a frame that went untimed, it does nothing. */
  mark(part: string): void {
    const { gl, ext } = this;
    if (!this.splitting || gl === null || ext === null || this.open === null) return;
    this.finish(gl, ext, false);
    this.start(gl, ext, part);
  }

  /** After the frame's last pass. */
  end(): void {
    const { gl, ext } = this;
    if (gl === null || ext === null || this.open === null) return;
    this.finish(gl, ext, true);
    this.framesInFlight++;
  }

  /** A station boundary: the series starts over, and results in flight go
   * to the station that took them, which is no longer listening. */
  reset(): void {
    this.station++;
    this.cost.reset();
    this.parts.clear();
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
    this.framesInFlight = 0;
    const at = this.peers.indexOf(this);
    if (at >= 0) this.peers.splice(at, 1);
  }

  private start(gl: TimerContext, ext: TimerQueryExtension, part: string): void {
    const query = this.idle.pop() ?? gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    this.open = query;
    this.openPart = part;
  }

  private finish(gl: TimerContext, ext: TimerQueryExtension, last: boolean): void {
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    this.pending.push({ query: this.open!, station: this.station, part: this.openPart, last });
    this.open = null;
  }

  private collect(gl: TimerContext, ext: TimerQueryExtension): void {
    if (gl.getParameter(ext.GPU_DISJOINT_EXT) === true) {
      for (const peer of this.peers) peer.disjointOwed = true;
    }
    if (this.disjointOwed) {
      this.disjointOwed = false;
      for (const { query, station, last } of this.pending) {
        if (last && station === this.station) this.dropped++;
        this.idle.push(query);
      }
      this.pending.length = 0;
      this.framesInFlight = 0;
      this.frameSum = 0;
      return;
    }
    while (this.pending.length > 0) {
      const { query, station, part, last } = this.pending[0]!;
      if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE) !== true) return;
      const ms = (gl.getQueryParameter(query, gl.QUERY_RESULT) as number) / 1e6;
      this.pending.shift();
      this.idle.push(query);
      const mine = station === this.station;
      if (mine) this.frameSum += ms;
      if (mine && this.splitting) {
        let series = this.parts.get(part);
        if (series === undefined) this.parts.set(part, (series = new FrameCost()));
        series.add(ms);
      }
      if (!last) continue;
      if (mine) this.cost.add(this.frameSum);
      this.frameSum = 0;
      this.framesInFlight--;
    }
  }
}
