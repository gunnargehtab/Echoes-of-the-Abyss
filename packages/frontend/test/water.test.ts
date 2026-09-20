/**
 * The water as a medium (docs/art-direction.md, "Reading the Water"): texture,
 * not information. The sibling of seabed.test.ts and held to the same bargain
 * — a thing this big in the frame earns its place by changing nothing the
 * simulation reads, looking the same on every client, and staying quieter than
 * what it decorates.
 *
 * What a screenshot has to judge is how it looks, and the review frames for
 * that are in `docs/screenshots/issue-836/`. What node:test can hold is the
 * ramp those frames are a picture of, the reach that scales it, and the one
 * promise that makes the setting safe: turning the water down can only reveal.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEPTH, LID, THERMOCLINE } from '@echoes/shared';
import {
  fogDensityFor,
  installWaterFog,
  WATER_RAMP_GLSL,
  WATER_REACH_DOLLIES,
  WATER_REACH_MIN_M,
  waterColorAt,
  waterLuminanceAt,
  waterReachM,
  waterTransmittance,
} from '../src/game/water.ts';
import { ACTIVE_PALETTE } from '../src/game/palette.ts';

describe('the water ramp', () => {
  it('darkens all the way down, and never brightens on the way', () => {
    // "Depth is luminance" is the whole claim the ramp makes, and a ramp that
    // brightened anywhere — even across one stop, even slightly — would be a
    // depth a player could misread as shallower than it is.
    let previous = Infinity;
    for (let depthM = 0; depthM <= DEPTH.MAX_M; depthM += 25) {
      const luminance = waterLuminanceAt(depthM);
      assert.ok(
        luminance <= previous + 1e-9,
        `water brightens between ${depthM - 25} m and ${depthM} m`
      );
      previous = luminance;
    }
  });

  it('ends on the colour the game already had', () => {
    // The deep stop is `UI.background` exactly, which is what lets this land
    // without restating the abyss: the whole change is the water above it.
    const background = ACTIVE_PALETTE.ui.background;
    const srgbToLinear = (channel: number): number =>
      channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    const deepest = waterColorAt(DEPTH.MAX_M);
    for (const [shift, got] of [
      [16, deepest.r],
      [8, deepest.g],
      [0, deepest.b],
    ] as const) {
      const want = srgbToLinear((((background >> shift) & 0xff) as number) / 255);
      assert.ok(Math.abs(got - want) < 1e-9, 'the ramp bottoms out on UI.background');
    }
  });

  it('claims no hue of its own, at any depth', () => {
    // Hue belongs to the biome, and the biome is what the Echo Layer prices
    // sound by. Water that drifted toward a biome's hue would be a propagation
    // factor a player could read off the medium, so the ramp stays one blue
    // and moves only in brightness.
    for (let depthM = 0; depthM <= DEPTH.MAX_M; depthM += 50) {
      const { r, g, b } = waterColorAt(depthM);
      assert.ok(b >= g && g >= r, `water is not blue-dominant at ${depthM} m`);
    }
  });

  it('clamps outside the column rather than extrapolating', () => {
    // The camera's world height is not a depth (the column is drawn at 0.22),
    // so the ramp is asked about depths above the surface and below the floor
    // in ordinary play and must answer with water either way.
    assert.deepEqual(waterColorAt(-5000), waterColorAt(0));
    assert.deepEqual(waterColorAt(DEPTH.MAX_M * 3), waterColorAt(DEPTH.MAX_M));
  });

  it('puts its knee on the column, not on an artist’s round number', () => {
    // The Lid and the thermocline are the two depths the simulation already
    // treats as boundaries, and the ramp's stops are read from those constants
    // rather than copied — so the water's shape follows the column's physics.
    for (const depthM of [LID.DEPTH_M, THERMOCLINE.DEPTH_M, DEPTH.MAX_M]) {
      assert.ok(
        WATER_RAMP_GLSL.includes(depthM.toFixed(6)),
        `the generated GLSL has no stop at ${depthM} m`
      );
    }
  });

  it('generates GLSL from the same table the TypeScript ramp reads', () => {
    // One source of truth is the point of generating the shader rather than
    // writing it: the fog, the backdrop and the marine snow all evaluate this
    // string, and a second copy of the table would drift from this one.
    for (const depthM of [0, LID.DEPTH_M, THERMOCLINE.DEPTH_M, DEPTH.MAX_M]) {
      const { r, g, b } = waterColorAt(depthM);
      for (const channel of [r, g, b]) {
        assert.ok(
          WATER_RAMP_GLSL.includes(channel.toFixed(6)),
          `the GLSL is missing a channel of the ${depthM} m stop`
        );
      }
    }
    // GLSL has no implicit int-to-float, so a stop written as `0` rather than
    // `0.0` is a shader that does not compile — and a shader that does not
    // compile is a black frame no headless test would otherwise catch.
    assert.equal(/[^.\d]\d+\s*[,)]/.test(WATER_RAMP_GLSL), false);
  });
});

describe('how far the water reaches', () => {
  it('follows the dolly, with a floor', () => {
    // The colour is absolute and the reach is relative — gate 7's price for a
    // strategic dolly that puts the eye twenty kilometres out.
    assert.equal(waterReachM(4000), 4000 * WATER_REACH_DOLLIES);
    assert.equal(waterReachM(10), WATER_REACH_MIN_M);
    assert.ok(waterReachM(8000) > waterReachM(4000), 'a longer dolly sees further');
  });

  it('keeps the subject of the frame crisp and dissolves the far field', () => {
    // The shape that makes this safe: exp² falloff is nearly nothing near the
    // camera and steep beyond it, so a fleet at the focus is never hazed while
    // the far half of the map still goes.
    const dollyM = 4000;
    const density = fogDensityFor(dollyM, 1);
    const fogAt = (distanceM: number): number => 1 - Math.exp(-((density * distanceM) ** 2));
    assert.ok(fogAt(dollyM) < 0.12, 'what the camera is pointed at stays readable');
    assert.ok(fogAt(dollyM * 3) > 0.45, 'three dollies out is dissolving');
    assert.ok(fogAt(dollyM * 5) > 0.9, 'the far field is water');
  });

  it('turns the distance term off entirely at zero, and never inverts', () => {
    assert.equal(fogDensityFor(4000, 0), 0);
    assert.ok(fogDensityFor(4000, 0.5) < fogDensityFor(4000, 1), 'less water hides less');
    assert.equal(fogDensityFor(4000, 5), fogDensityFor(4000, 1), 'the setting is clamped');
  });

  it('extinguishes an emitter without ever brightening it', () => {
    // The embers opt out of the fog chunk and multiply by this instead: mixing
    // an additive fragment toward the water colour makes a distant vent
    // brighter the murkier the water gets, which is the wrong way round.
    assert.equal(waterTransmittance(0, 4000), 1);
    assert.ok(waterTransmittance(4000, 4000) < 0.4);
    assert.ok(waterTransmittance(12_000, 4000) < 0.01);
    let previous = Infinity;
    for (let distanceM = 0; distanceM <= 20_000; distanceM += 500) {
      const survived = waterTransmittance(distanceM, 4000);
      assert.ok(survived <= previous && survived <= 1, 'transmittance only ever falls');
      previous = survived;
    }
  });
});

describe('the fog patch', () => {
  it('teaches every fogged material the ramp, once', async () => {
    // Patched globally rather than per material because the fog has to reach
    // terrain, roster models, instanced props, ordnance, cues and chart lines,
    // and a per-material list goes stale the first time something is added.
    const { ShaderChunk } = await import('three');
    installWaterFog();
    const once = ShaderChunk.fog_fragment;
    installWaterFog();
    assert.equal(ShaderChunk.fog_fragment, once, 'installing twice patches once');

    assert.ok(ShaderChunk.fog_fragment.includes('echoesWaterColor'));
    assert.ok(ShaderChunk.fog_pars_fragment.includes('echoesWaterDepthM'));
    // The world height the colour is read at, carried as a varying and derived
    // from `mvPosition` rather than from `transformed` — half this scene is
    // instanced, and the instance matrix is not applied to `transformed`.
    assert.ok(ShaderChunk.fog_vertex.includes('vWaterWorldY'));
    assert.ok(ShaderChunk.fog_pars_vertex.includes('varying float vWaterWorldY'));
    assert.equal(
      ShaderChunk.fog_vertex.includes('transformed'),
      false,
      'the world height is taken from the view-space position, not the pre-instance one'
    );
  });
});
