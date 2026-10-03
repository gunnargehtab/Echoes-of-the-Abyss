/**
 * Gate 6's GPU-time instrument (#1001): the frame's GPU time, every pass
 * summed, from a timer query (`packages/frontend/src/game/gpuTimer.ts`).
 *
 * Driven against `HeadlessGL`, which models the query rather than swallowing
 * it: a result arrives a chosen number of frames after its frame, and costs a
 * chosen number of nanoseconds. So every assertion here is counted — which
 * frames have a reading, and exactly what it reads — and none is a stopwatch.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GpuTimer, SOFTWARE_RASTERISER } from '../src/game/gpuTimer.ts';
import { HeadlessGL, StubCanvas } from './support/headless.ts';

/** The queries the class keeps in flight, restated so a change to it fails. */
const IN_FLIGHT = 8;

function context(timer: HeadlessGL['timer'], rendererName?: string): HeadlessGL {
  const gl = new HeadlessGL(new StubCanvas());
  gl.timer = timer;
  if (rendererName !== undefined) gl.rendererName = rendererName;
  return gl;
}

function start(gl: HeadlessGL, enabled = true): GpuTimer {
  return new GpuTimer(gl as unknown as WebGL2RenderingContext, enabled);
}

/** One frame: the bracket around its passes, as `renderFrame` draws it. */
function frames(timer: GpuTimer, count: number): void {
  for (let i = 0; i < count; i++) {
    timer.begin();
    timer.end();
  }
}

describe('gpu timer: when it reads', () => {
  it('reads nothing in a production build, and touches no GL', () => {
    const gl = context({ ns: 1e6, latency: 0 });
    const timer = start(gl, false);
    frames(timer, 4);
    assert.equal(timer.state, 'off');
    assert.equal(gl.live, 0, 'not one query was made');
    assert.equal(timer.cost.count, 0);
  });

  it('reports a browser without the extension as unavailable', () => {
    const timer = start(context(null));
    frames(timer, 4);
    assert.equal(timer.state, 'unavailable');
    assert.equal(timer.cost.count, 0);
  });

  it('refuses a software rasteriser even where the extension is exposed', () => {
    // SwiftShader exposes the extension and answers it (a 50-clear probe read
    // 700 ns): a number for the rasteriser, which gate 6 says is no reading.
    for (const name of [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
      'Microsoft Basic Render Driver',
    ]) {
      const gl = context({ ns: 700, latency: 0 }, name);
      const timer = start(gl);
      frames(timer, 4);
      assert.equal(timer.state, 'software', name);
      assert.equal(gl.live, 0, `${name}: no query was made`);
    }
    assert.ok(
      !SOFTWARE_RASTERISER.test(
        'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 (0x00001B81) Direct3D11 vs_5_0 ps_5_0, D3D11)'
      ),
      'the named GPU is not mistaken for one'
    );
  });
});

describe('gpu timer: what it reads', () => {
  it('records each frame once its result lands, in milliseconds', () => {
    const gl = context({ ns: 2_500_000, latency: 3 });
    const timer = start(gl);
    assert.equal(timer.state, 'timing');
    frames(timer, 3);
    assert.equal(timer.cost.count, 0, 'three frames in, nothing has landed');
    frames(timer, 7);
    // Frame n's result is read at the begin of frame n + 1 + latency: ten
    // frames read the first six.
    assert.equal(timer.cost.count, 6);
    assert.equal(timer.cost.avg, 2.5);
    assert.equal(timer.cost.worst, 2.5);
    assert.ok(gl.live <= IN_FLIGHT, `at most ${IN_FLIGHT} queries live, saw ${gl.live}`);
  });

  it('goes untimed rather than unbounded when results are slow', () => {
    const gl = context({ ns: 1e6, latency: 20 });
    const timer = start(gl);
    frames(timer, 30);
    assert.equal(gl.live, IN_FLIGHT, 'the pool stops growing at its size');
    // Thirty frames, eight in flight at a time: the frames that found the pool
    // full are the ones `gpuFrames` falling behind `stationFrames` shows.
    assert.ok(timer.cost.count < 30, `some frames went untimed, saw ${timer.cost.count}`);
  });

  it('drops what was in flight across a disjoint event, and counts it', () => {
    const gl = context({ ns: 1e6, latency: 2 });
    const timer = start(gl);
    frames(timer, 5);
    const before = timer.cost.count;
    gl.disjoint = true;
    frames(timer, 1);
    // A frame's result lands latency + 1 frames on, so three are in flight.
    assert.equal(timer.dropped, 3, 'the three results still in flight are void');
    assert.equal(timer.cost.count, before, 'and none of them was averaged');
    frames(timer, 6);
    assert.ok(timer.cost.count > before, 'readings resume after the event');
  });

  it('keeps a late result in the station that took it', () => {
    const gl = context({ ns: 4_000_000, latency: 2 });
    const timer = start(gl);
    frames(timer, 6);
    timer.reset();
    frames(timer, 2);
    // Results from before the boundary land after it, and belong to the
    // station that closed; the two frames after it have not landed yet.
    assert.equal(timer.cost.count, 0, 'the new station holds none of the old one');
    frames(timer, 2);
    // Its first frame (the seventh) lands at the begin of the tenth.
    assert.equal(timer.cost.count, 1, 'and its own first frame lands on time');
    assert.equal(timer.cost.avg, 4);
  });

  it('gives every query back on dispose', () => {
    const gl = context({ ns: 1e6, latency: 4 });
    const timer = start(gl);
    frames(timer, 10);
    timer.begin();
    timer.dispose();
    assert.equal(gl.live, 0);
  });
});

/** One split frame: its first pass begins it, and each later pass marks. */
function splitFrame(timer: GpuTimer, parts: readonly string[]): void {
  timer.begin(parts[0]);
  for (const part of parts.slice(1)) timer.mark(part);
  timer.end();
}

const HALO_FRAME = ['canvas', 'depth-copy', 'halo-spread'] as const;

describe('gpu timer: split', () => {
  it('times each pass in a query of its own, and the frame is still their sum', () => {
    // Latency 0: every query has landed by the next frame's begin.
    const gl = context({ ns: 1_000_000, latency: 0 });
    const timer = start(gl);
    timer.setSplit(true);
    for (let i = 0; i < 4; i++) splitFrame(timer, HALO_FRAME);
    assert.equal(timer.cost.count, 3, 'three frames have landed');
    assert.equal(timer.cost.avg, 3, 'a frame is its three passes summed');
    assert.deepEqual([...timer.parts.keys()], [...HALO_FRAME]);
    for (const [part, cost] of timer.parts) {
      assert.equal(cost.count, 3, `${part}: one reading a frame`);
      assert.equal(cost.avg, 1, `${part}: its own query's time`);
    }
  });

  it('unsplit, a mark does nothing: one query a frame, and no parts', () => {
    const gl = context({ ns: 1_000_000, latency: 0 });
    const timer = start(gl);
    for (let i = 0; i < 4; i++) splitFrame(timer, HALO_FRAME);
    assert.equal(timer.cost.avg, 1, 'the frame is the one bracket');
    assert.equal(timer.parts.size, 0);
    assert.equal(gl.live, 1, 'one query, reused every frame');
  });

  it('bounds frames in flight, not queries', () => {
    const gl = context({ ns: 1e6, latency: 60 });
    const timer = start(gl);
    timer.setSplit(true);
    for (let i = 0; i < 30; i++) splitFrame(timer, HALO_FRAME);
    assert.equal(gl.live, IN_FLIGHT * HALO_FRAME.length, 'eight frames of three queries');
  });

  it('voids every frame in flight across a disjoint event, a part-read one too', () => {
    // Latency 7 queries, read at each begin: by the fifth frame's, the first
    // frame has landed and the second is two passes read. The sixth frame's
    // begin meets the event, with the second to fifth frames in flight.
    const gl = context({ ns: 1_000_000, latency: 7 });
    const timer = start(gl);
    timer.setSplit(true);
    for (let i = 0; i < 5; i++) splitFrame(timer, HALO_FRAME);
    gl.disjoint = true;
    splitFrame(timer, HALO_FRAME);
    assert.equal(timer.dropped, 4, 'the second to fifth frames are void, once each');
    assert.equal(timer.cost.count, 1);
    for (let i = 0; i < 6; i++) splitFrame(timer, HALO_FRAME);
    assert.ok(timer.cost.count > 1, 'readings resume after the event');
    assert.equal(timer.cost.worst, 3, 'no part of a void frame is summed into a later one');
  });

  it('splits nothing where it reads nothing', () => {
    for (const timer of [start(context(null)), start(context({ ns: 1e6, latency: 0 }), false)]) {
      timer.setSplit(true);
      assert.equal(timer.split, false, timer.state);
    }
  });

  it('starts the series over when the split is switched', () => {
    const gl = context({ ns: 1_000_000, latency: 0 });
    const timer = start(gl);
    for (let i = 0; i < 4; i++) splitFrame(timer, HALO_FRAME);
    timer.setSplit(true);
    assert.equal(timer.cost.count, 0, 'an unsplit frame is not averaged with split ones');
    splitFrame(timer, HALO_FRAME);
    splitFrame(timer, HALO_FRAME);
    assert.equal(timer.cost.count, 1);
    assert.equal(timer.cost.avg, 3);
    timer.setSplit(false);
    assert.equal(timer.parts.size, 0);
  });
});
