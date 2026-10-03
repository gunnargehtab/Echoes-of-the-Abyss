/**
 * The lamp halo's pass on the headless renderer — docs/graphics-standards.md
 * gate 6, "Lamp halo": +8 calls at any force size, 2 × sites + 7 triangles,
 * 17.25 bytes per drawing-buffer pixel plus the 64 KiB instance buffer, one
 * depth copy, and nothing at all when no site is drawn or the view cannot
 * draw it. Counted from the stand-in's ledger, never timed.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Color, PerspectiveCamera } from 'three';
import { INSTANCE_BYTES, LampHaloPass, type HaloSplat } from '../src/game/lampHaloPass.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

function renderer(width: number, height: number): HeadlessWebGLRenderer {
  const gl = new HeadlessWebGLRenderer();
  gl.setSize(width, height);
  gl.info.autoReset = false;
  return gl;
}

function splats(count: number): HaloSplat[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i,
    y: 0,
    z: -100,
    cov: [1, 0, 0, 1, 0, 1] as [number, number, number, number, number, number],
    ink: new Color(1, 0.5, 0.04),
    energy: 3,
    halfDiagonal: 3,
    nearOffset: 1,
  }));
}

/** The SPEC's 17.25 B/px: source 8, depth 4, and two half-float targets at each level. */
function expectedBytes(width: number, height: number): number {
  const levels = [2, 4, 8].reduce(
    (sum, d) => sum + 2 * Math.ceil(width / d) * Math.ceil(height / d) * 8,
    0
  );
  return width * height * 12 + levels + INSTANCE_BYTES;
}

const camera = new PerspectiveCamera(40, 1440 / 900, 10, 60_000);

describe('lamp halo pass: what gate 6 allocates', () => {
  it('holds 17.25 bytes a drawing-buffer pixel and the instance buffer, at both ratios', () => {
    for (const [w, h] of [
      [1440, 900],
      [2160, 1350],
    ] as const) {
      const pass = new LampHaloPass();
      assert.equal(pass.enable(renderer(w, h).asRenderer()), true);
      assert.equal(pass.state, 'idle');
      assert.equal(pass.bytes, expectedBytes(w, h));
      // Within a level's rounding of the SPEC's figure: an odd level rounds its
      // rows up (900 / 8 is 112.5, 1350 / 4 is 337.5), under 0.1 % of the whole.
      const spec = 17.25 * w * h;
      assert.ok(Math.abs(pass.bytes - INSTANCE_BYTES - spec) < spec * 1e-3, `${w}×${h}`);
      pass.disable();
      assert.equal(pass.bytes, 0, 'off holds nothing');
      assert.equal(pass.state, 'off');
    }
  });

  it('adds 8 calls and 2 × sites + 7 triangles, whatever the force size', () => {
    for (const count of [1, 108, 1024]) {
      const gl = renderer(1440, 900);
      const pass = new LampHaloPass();
      pass.enable(gl.asRenderer());
      const blits = gl.context.blits;
      gl.info.reset();
      const passes = pass.render(gl.asRenderer(), camera, splats(count), 0, 0.0001, 1, 2);
      assert.deepEqual(passes, ['depth-copy', 'halo-source', 'halo-spread', 'halo-composite']);
      assert.equal(gl.info.render.calls, 8, `${count} sites`);
      assert.equal(gl.info.render.triangles, 2 * count + 7);
      assert.equal(gl.context.blits - blits, 1, 'one depth copy, a listed pass and not a call');
      assert.equal(gl.frameTargets.at(-1), null, 'the composite draws onto the canvas');
      assert.equal(pass.sites, count);
      assert.equal(pass.state, 'drawn');
    }
  });

  it('runs no pass in a frame with no site to draw', () => {
    const gl = renderer(1440, 900);
    const pass = new LampHaloPass();
    pass.enable(gl.asRenderer());
    gl.info.reset();
    const blits = gl.context.blits;
    assert.deepEqual(pass.render(gl.asRenderer(), camera, [], 0, 0, 1, 2), []);
    assert.equal(gl.info.render.calls, 0);
    assert.equal(gl.context.blits, blits);
    assert.equal(pass.state, 'idle');
  });

  it('restores autoClear and the clear colour it borrowed', () => {
    const gl = renderer(1440, 900);
    gl.setClearColor(0x040a12, 1);
    const pass = new LampHaloPass();
    pass.enable(gl.asRenderer());
    pass.render(gl.asRenderer(), camera, splats(3), 0, 0, 1, 2);
    assert.equal(gl.autoClear, true);
    assert.equal(gl.getClearColor(new Color()).getHex(), 0x040a12);
    assert.equal(gl.getClearAlpha(), 1);
    assert.equal(gl.getRenderTarget(), null);
  });
});

describe('lamp halo pass: when the view cannot draw it', () => {
  const cases: [string, (gl: HeadlessWebGLRenderer) => void, string][] = [
    [
      'no float colour target',
      (gl) => gl.extensionNames.delete('EXT_color_buffer_float'),
      'no EXT_color_buffer_float',
    ],
    ['no canvas stencil', (gl) => (gl.context.stencilBits = 0), 'no canvas stencil'],
    [
      'an incomplete target',
      (gl) => (gl.context.framebufferStatus = 0),
      'the half-float target is incomplete',
    ],
    [
      'a failed depth copy',
      (gl) => (gl.context.blitError = gl.context.INVALID_OPERATION),
      'the depth copy failed',
    ],
    [
      'a wrong readback',
      (gl) => (gl.context.readback = [0, 0, 0, 1]),
      'the half-float readback was wrong',
    ],
  ];
  for (const [what, breakIt, reason] of cases) {
    it(`says why on ${what}, and holds nothing`, () => {
      const gl = renderer(1440, 900);
      breakIt(gl);
      const pass = new LampHaloPass();
      assert.equal(pass.enable(gl.asRenderer()), false);
      assert.equal(pass.state, `unavailable: ${reason}`);
      assert.equal(pass.bytes, 0);
      assert.equal(pass.on, false);
      assert.deepEqual(pass.render(gl.asRenderer(), camera, splats(3), 0, 0, 1, 2), []);
    });
  }
});

describe('lamp halo pass: what the split timer reads (gpuTimer.ts)', () => {
  it('names each pass as it starts, so each split query holds that pass alone', () => {
    const gl = renderer(1440, 900);
    const pass = new LampHaloPass();
    pass.enable(gl.asRenderer());
    gl.info.reset();
    const blits = gl.context.blits;
    const marks: { pass: string; calls: number; blits: number }[] = [];
    pass.marker = (name) =>
      marks.push({ pass: name, calls: gl.info.render.calls, blits: gl.context.blits - blits });
    const passes = pass.render(gl.asRenderer(), camera, splats(108), 0, 0.0001, 1, 2);
    assert.deepEqual(
      marks.map((m) => m.pass),
      passes,
      'one mark a listed pass, in order'
    );
    // What lands before each mark is the previous part's: the blit inside the
    // depth copy's, the splat draw inside the source's, six draws inside the
    // spread's, and the composite after the last mark.
    assert.deepEqual(
      marks.map(({ calls, blits }) => [calls, blits]),
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [7, 1],
      ]
    );
    assert.equal(gl.info.render.calls, 8);
  });
});
