/**
 * The chromatic split on the headless renderer — docs/art-direction.md,
 * "Atmosphere rides on top"; docs/graphics-standards.md gate 6, "Chromatic
 * split": one colour copy and one full-screen draw onto the canvas, +1 call
 * and +1 triangle, 4 bytes a drawing-buffer pixel, at most 1 px apart at the
 * corners and nothing inside the vignette's clear ellipse. Counted from the
 * stand-in's ledger, never timed.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PerspectiveCamera, RGBAFormat, RGBFormat, type WebGLRenderTarget } from 'three';
import {
  CHROMATIC_SPLIT,
  ChromaticSplit,
  SPLIT_BYTES_PER_PX,
  splitSeparationPx,
} from '../src/game/chromaticSplit.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

function renderer(width: number, height: number): HeadlessWebGLRenderer {
  const gl = new HeadlessWebGLRenderer();
  gl.setSize(width, height);
  gl.info.autoReset = false;
  return gl;
}

const camera = new PerspectiveCamera(40, 1440 / 900, 10, 60_000);

describe('chromatic split: where it splits', () => {
  it('splits nothing inside the clear ellipse, and 1 px at the corners', () => {
    const [w, h] = [1440, 900];
    assert.ok(CHROMATIC_SPLIT.SEPARATION_PX <= 1, "style-neon-noir's bound is 1 px");
    assert.equal(splitSeparationPx(w / 2, h / 2, w, h), 0, 'the centre');
    // Along the horizontal, the ellipse's edge is 0.55 × √2 of the half-width.
    const at = (share: number) => splitSeparationPx(w / 2 + share * (w / 2), h / 2, w, h);
    assert.equal(at(0.55 * Math.SQRT2 - 1e-9), 0, 'just inside the ellipse');
    assert.equal(splitSeparationPx(0, 0, w, h), CHROMATIC_SPLIT.SEPARATION_PX, 'a corner');
    assert.equal(splitSeparationPx(w, h, w, h), CHROMATIC_SPLIT.SEPARATION_PX, 'its opposite');
    // The middle of each edge is the same share of the way to the corners
    // (1 / √2), at any aspect: the doc's 0.35 px.
    for (const [x, y] of [
      [0, h / 2],
      [w / 2, 0],
    ] as const) {
      assert.equal(splitSeparationPx(x, y, w, h).toFixed(2), '0.35');
    }
    // Never past the bound, anywhere in the frame.
    let max = 0;
    for (let x = 0; x <= w; x += 16) {
      for (let y = 0; y <= h; y += 16) max = Math.max(max, splitSeparationPx(x, y, w, h));
    }
    assert.ok(max <= CHROMATIC_SPLIT.SEPARATION_PX);
  });
});

describe('chromatic split: where the vignette clears', () => {
  it("starts at the vignette's clear stop, on the same ellipse", () => {
    // art-direction.md: "Nothing splits inside the vignette's clear ellipse."
    // The stop lives in App.css and INNER in chromaticSplit.ts; this holds them
    // together, so a vignette moved alone fails here rather than in the doc.
    const css = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');
    const block = css.match(/\.perspective-host::after\s*\{([^}]*)\}/);
    assert.ok(block, 'App.css has the vignette layer');
    assert.match(block[1]!, /radial-gradient\(\s*ellipse at center,/, 'the frame-shaped ellipse');
    const stop = block[1]!.match(/transparent (\d+(?:\.\d+)?)%/);
    assert.ok(stop, 'the vignette has a clear stop');
    assert.equal(Number(stop[1]) / 100, CHROMATIC_SPLIT.INNER);
  });
});

describe('chromatic split: what gate 6 allocates', () => {
  it('holds 4 bytes a drawing-buffer pixel, at both ratios, and nothing off', () => {
    for (const [w, h, mib] of [
      [1440, 900, '4.94'],
      [2160, 1350, '11.12'],
    ] as const) {
      const split = new ChromaticSplit();
      assert.equal(split.enable(renderer(w, h).asRenderer()), true);
      assert.equal(split.state, 'on');
      assert.equal(split.bytes, w * h * SPLIT_BYTES_PER_PX);
      assert.equal((split.bytes / 2 ** 20).toFixed(2), mib, 'the figure gate 6 quotes');
      split.disable();
      assert.equal(split.bytes, 0, 'off holds nothing');
      assert.equal(split.state, 'off');
    }
  });

  it('adds one copy, one call and one triangle, drawn onto the canvas', () => {
    const gl = renderer(1440, 900);
    const split = new ChromaticSplit();
    split.enable(gl.asRenderer());
    const blits = gl.context.blits;
    gl.info.reset();
    assert.deepEqual(split.render(gl.asRenderer(), camera), ['split-copy', 'split']);
    assert.equal(gl.info.render.calls, 1);
    assert.equal(gl.info.render.triangles, 1, 'one full-screen triangle');
    assert.equal(gl.context.blits - blits, 1, 'one colour copy, a listed pass and not a call');
    assert.deepEqual(gl.frameTargets, [null], 'the draw writes onto the canvas');
    assert.equal(gl.autoClear, true, 'autoClear is restored');
    assert.equal(gl.getRenderTarget(), null);
  });

  it("copies into the canvas's own format", () => {
    for (const [alpha, format] of [
      [false, RGBFormat],
      [true, RGBAFormat],
    ] as const) {
      const gl = renderer(1440, 900);
      gl.context.alpha = alpha;
      const split = new ChromaticSplit();
      split.enable(gl.asRenderer());
      const copy = (split as unknown as { copy: WebGLRenderTarget }).copy;
      assert.equal(copy.texture.format, format, `alpha ${alpha}`);
    }
  });

  it('follows the drawing buffer when it resizes', () => {
    const gl = renderer(1440, 900);
    const split = new ChromaticSplit();
    split.enable(gl.asRenderer());
    gl.setSize(1280, 720);
    split.render(gl.asRenderer(), camera);
    assert.equal(split.bytes, 1280 * 720 * SPLIT_BYTES_PER_PX);
  });

  it('runs nothing off', () => {
    const gl = renderer(1440, 900);
    const split = new ChromaticSplit();
    gl.info.reset();
    assert.deepEqual(split.render(gl.asRenderer(), camera), []);
    assert.equal(gl.info.render.calls, 0);
    assert.equal(gl.context.blits, 0);
  });
});

describe('chromatic split: when the view cannot draw it', () => {
  const cases: [string, (gl: HeadlessWebGLRenderer) => void, string][] = [
    [
      'an incomplete target',
      (gl) => (gl.context.framebufferStatus = 0),
      'the copy target is incomplete',
    ],
    [
      'a failed colour copy',
      (gl) => (gl.context.blitError = gl.context.INVALID_OPERATION),
      'the colour copy failed',
    ],
  ];
  for (const [name, breakIt, reason] of cases) {
    it(`says why and holds nothing: ${name}`, () => {
      const gl = renderer(1440, 900);
      breakIt(gl);
      const split = new ChromaticSplit();
      assert.equal(split.enable(gl.asRenderer()), false);
      assert.equal(split.state, `unavailable: ${reason}`);
      assert.equal(split.bytes, 0);
      assert.deepEqual(split.render(gl.asRenderer(), camera), [], 'the frame draws without it');
      assert.equal(gl.getRenderTarget(), null);
    });
  }
});
