/**
 * The lamp halo's pass on the headless renderer — docs/graphics-standards.md
 * gate 6, "Lamp halo": +8 calls at any force size, 2 × sites + 7 triangles,
 * 17.25 bytes per drawing-buffer pixel plus the 64 KiB instance buffer, one
 * depth copy, and nothing at all when no site is drawn or the view cannot
 * draw it. Counted from the stand-in's ledger, never timed.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Color,
  EqualStencilFunc,
  PerspectiveCamera,
  type Camera,
  type Mesh,
  type Scene,
  type ShaderMaterial,
  type Texture,
  type WebGLRenderTarget,
} from 'three';
import { chainShift } from '../src/game/lampHalo.ts';
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

describe('lamp halo pass: what each chain draw reads and writes', () => {
  type Draw = {
    target: WebGLRenderTarget | null;
    source: Texture | null;
    step: [number, number] | null;
    levels: Texture[] | null;
  };

  /** Every render the pass makes, with the uniforms it drew with. */
  function recorded(gl: HeadlessWebGLRenderer): Draw[] {
    const draws: Draw[] = [];
    const real = gl.render.bind(gl);
    gl.render = (scene: Scene, eye: Camera) => {
      const uniforms = ((scene.children[0] as Mesh).material as ShaderMaterial).uniforms;
      draws.push({
        target: gl.getRenderTarget(),
        source: (uniforms.uSource?.value as Texture | undefined) ?? null,
        step: uniforms.uStep ? [uniforms.uStep.value.x, uniforms.uStep.value.y] : null,
        levels: uniforms.uLevel1
          ? [uniforms.uLevel1.value, uniforms.uLevel2!.value, uniforms.uLevel3!.value]
          : null,
      });
      real(scene, eye);
    };
    return draws;
  }

  it('blurs each level across from the level above, then down itself, and composites the three', () => {
    for (const [w, h] of [
      [1440, 900],
      [2160, 1350],
    ] as const) {
      const gl = renderer(w, h);
      const pass = new LampHaloPass();
      pass.enable(gl.asRenderer());
      const draws = recorded(gl);
      pass.render(gl.asRenderer(), camera, splats(4), 0, 0, 1, 2);
      assert.equal(draws.length, 8);
      let above = draws[0]!.target!.texture;
      for (const [k, d] of [2, 4, 8].entries()) {
        const across = draws[1 + 2 * k]!;
        const down = draws[2 + 2 * k]!;
        const lw = Math.ceil(w / d);
        const lh = Math.ceil(h / d);
        // Across: the level above, stepped one of this level's texels, into
        // the level's spare target; that step is what lands each tap on a
        // block of the level above, so the downsample needs no draw.
        assert.equal(across.source, above, `1/${d}: across reads the level above`);
        assert.deepEqual([across.target!.width, across.target!.height], [lw, lh]);
        assert.deepEqual(across.step, [1 / lw, 0]);
        // Down: the spare target, into the level itself.
        assert.equal(down.source, across.target!.texture, `1/${d}: down reads across`);
        assert.notEqual(down.target, across.target);
        assert.deepEqual([down.target!.width, down.target!.height], [lw, lh]);
        assert.deepEqual(down.step, [0, 1 / lh]);
        above = down.target!.texture;
      }
      const composite = draws[7]!;
      assert.equal(composite.target, null, 'the composite draws onto the canvas');
      assert.deepEqual(
        composite.levels,
        [2, 4, 6].map((i) => draws[i]!.target!.texture),
        `${w}×${h}: the composite reads the three levels this frame drew`
      );
    }
  });

  it("shifts the chain an octave a draw at a portrait's scale, and not at the game's", () => {
    const [w, h] = [1920, 1080];
    const gl = renderer(w, h);
    const pass = new LampHaloPass();
    pass.enable(gl.asRenderer());
    const draws = recorded(gl);
    // A 100 m hull's portrait draws the halo about 13.6 times as wide.
    const { octaves } = chainShift(13.6);
    assert.ok(octaves >= 3);
    pass.render(gl.asRenderer(), camera, splats(4), 0, 0, 13.6, 2);
    assert.equal(draws.length, 8 + octaves, 'a 2 × 2 downsample an octave, before the six');
    let above = draws[0]!.target!.texture;
    for (let i = 1; i <= octaves; i++) {
      const down = draws[i]!;
      assert.equal(down.source, above, `octave ${i} reads the one above`);
      assert.deepEqual(
        [down.target!.width, down.target!.height],
        [Math.ceil(w / 2 ** i), Math.ceil(h / 2 ** i)]
      );
      above = down.target!.texture;
    }
    const first = draws[octaves + 1]!;
    assert.equal(first.source, above, 'the first level reads the last octave');
    assert.equal(first.target!.width, Math.ceil(w / 2 ** (octaves + 1)));
    assert.equal(draws.at(-1)!.target, null, 'and the composite still draws onto the canvas');
    draws.length = 0;
    pass.render(gl.asRenderer(), camera, splats(4), 0, 0, 1, 2);
    assert.equal(draws.length, 8, "back at the game's scale, the chain is the SPEC's six draws");
  });

  it('reads the new levels after the drawing buffer changes size', () => {
    const gl = renderer(1440, 900);
    const pass = new LampHaloPass();
    pass.enable(gl.asRenderer());
    const draws = recorded(gl);
    pass.render(gl.asRenderer(), camera, splats(4), 0, 0, 1, 2);
    const before = draws[7]!.levels!;
    gl.setSize(2160, 1350);
    draws.length = 0;
    pass.render(gl.asRenderer(), camera, splats(4), 0, 0, 1.5, 2);
    const after = draws[7]!.levels!;
    assert.deepEqual(
      after,
      [2, 4, 6].map((i) => draws[i]!.target!.texture),
      'bound to the levels the resized frame drew'
    );
    after.forEach((t, i) => assert.notEqual(t, before[i], 'never a disposed level'));
  });
});

describe('lamp halo pass: the lamp mask a frame reading draws (development only)', () => {
  it('clears the canvas to black and draws white only where a lamp marked the stencil', () => {
    const gl = renderer(1440, 900);
    gl.setClearColor(0x040a12, 1);
    const pass = new LampHaloPass();
    pass.enable(gl.asRenderer());
    let drawn: ShaderMaterial | null = null;
    const real = gl.render.bind(gl);
    gl.render = (scene: Scene, eye: Camera) => {
      drawn = (scene.children[0] as Mesh).material as ShaderMaterial;
      real(scene, eye);
    };
    gl.info.reset();
    pass.drawLampMask(gl.asRenderer(), camera);
    assert.equal(gl.info.render.calls, 1, 'one full-screen draw');
    assert.equal(gl.frameTargets.at(-1), null, 'onto the canvas, whose stencil holds the marks');
    const mask = drawn as ShaderMaterial | null;
    assert.ok(mask);
    // Tested against the marks and never writing them, so it shows them.
    assert.equal(mask.stencilWrite, true);
    assert.equal(mask.stencilWriteMask, 0);
    assert.equal(mask.stencilFunc, EqualStencilFunc);
    assert.equal(mask.stencilRef, 1);
    assert.equal(mask.depthTest, false);
    assert.equal(gl.autoClear, true, 'autoClear restored');
    assert.equal(gl.getClearColor(new Color()).getHex(), 0x040a12, 'clear colour restored');
  });
});
