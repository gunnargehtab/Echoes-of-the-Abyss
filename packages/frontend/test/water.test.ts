/**
 * The water as a medium (docs/art-direction.md, "Reading the Water"): texture,
 * not information. The sibling of seabed.test.ts and held to the same bargain
 * — a thing this big in the frame earns its place by changing nothing the
 * simulation reads, looking the same on every client, and staying quieter than
 * what it decorates.
 *
 * What a screenshot has to judge is how it looks, and the review frames for
 * that are in `docs/screenshots/issue-836/`, with the fog's corrected colour
 * in `docs/screenshots/issue-1016/`. What node:test can hold is the
 * ramp those frames are a picture of, the reach that scales it, and the one
 * promise that makes the setting safe: turning the water down can only reveal.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEPTH, LID, THERMOCLINE } from '@echoes/shared';
import { ShaderMaterial, Vector3 } from 'three';
import {
  fogDensityFor,
  HIGH_WORLD_FOG_SIGN,
  installWaterFog,
  MarineSnow,
  SNOW_FAR,
  STUDY_REACH_KNEE_M,
  STUDY_REACH_MIN_M,
  STUDY_REACH_NEAR_DOLLIES,
  STUDY_SNOW_NEAR,
  STUDY_SNOW_NEAR_COUNT,
  WATER_RAMP_GLSL,
  WATER_REACH_DOLLIES,
  WATER_REACH_MIN_M,
  waterColorAt,
  waterLuminanceAt,
  waterReachM,
  waterTransmittance,
} from '../src/game/water.ts';
import { ACTIVE_PALETTE } from '../src/game/palette.ts';

describe('marine snow profile isolation', () => {
  it('keeps the original size and fade separate from the opt-in study', () => {
    const original = new MarineSnow(32, false);
    const study = new MarineSnow(32, true);
    try {
      const eye = new Vector3(0, 0, 0);
      for (const snow of [original, study]) snow.update(0, eye, 0, 0, 4000, 1, 1000, 1);
      const originalMaterial = original.points.material;
      const studyMaterial = study.points.material;
      assert.ok(originalMaterial instanceof ShaderMaterial);
      assert.ok(studyMaterial instanceof ShaderMaterial);
      assert.equal(originalMaterial.uniforms.uPixelScale.value, 2600);
      assert.equal(studyMaterial.uniforms.uPixelScale.value, 4500);
      assert.equal(originalMaterial.uniforms.uSizePx.value.y, 2.6);
      assert.equal(studyMaterial.uniforms.uSizePx.value.y, 4);
      assert.equal(originalMaterial.uniforms.uStrength.value, 1);
      assert.equal(studyMaterial.uniforms.uStrength.value, 0.7);
      eye.y = 1_000_000;
      for (const snow of [original, study]) snow.update(1, eye, 0, 0, 4000, 1, 1000, 1);
      assert.equal(originalMaterial.uniforms.uStrength.value, 0);
      assert.equal(studyMaterial.uniforms.uStrength.value, 0);
    } finally {
      original.dispose();
      study.dispose();
    }
  });
});

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

  it("gives the High world pass the fog's other half, behind a sign Low never sets", async () => {
    // highFrame.ts: in the world pass a fragment only loses light to the
    // water, and an opaque one writes what survived into alpha, so the
    // composite adds the water's light by what each pixel lost, per sample.
    // The sign is a negative red on `fogColor`, which the ramp left unused
    // and the view holds at the deepest water: Low takes the mix it always
    // took.
    const { ShaderChunk } = await import('three');
    installWaterFog();
    const fog = ShaderChunk.fog_fragment;
    const sign = fog.indexOf('if ( fogColor.r < 0.0 ) {');
    const otherwise = fog.indexOf('} else {');
    assert.ok(sign >= 0 && otherwise > sign);
    const high = fog.slice(sign, otherwise);
    assert.ok(high.includes('gl_FragColor.rgb *= 1.0 - fogFactor;'));
    assert.ok(high.includes('#ifdef OPAQUE'), 'a blended fragment leaves alpha to its blend');
    assert.ok(high.includes('gl_FragColor.a = 1.0 - fogFactor;'));
    assert.ok(!high.includes('echoesWaterColor'), 'it adds none of the water’s colour');
    const low = fog.slice(otherwise);
    assert.ok(
      low.includes('gl_FragColor.rgb = mix( gl_FragColor.rgb, waterAtFragment, fogFactor );')
    );
    assert.ok(HIGH_WORLD_FOG_SIGN < 0);
    const deepest = waterColorAt(DEPTH.MAX_M);
    assert.ok(deepest.r >= 0, 'the colour Low holds there is no sign');
  });

  it('mixes toward the water in the space the fragment is already in', async () => {
    // Every three shader that fogs encodes to the output space first, so the
    // water is encoded before the mix, as three encodes its own fog colour.
    // Mixed in raw, the far seabed faded toward black, darker than the
    // backdrop at the same depth (#1016). If a three upgrade moves the fog
    // ahead of the encode, the patch would encode twice, and this fails.
    const { ShaderChunk, ShaderLib } = await import('three');
    installWaterFog();
    assert.ok(ShaderChunk.fog_fragment.includes('linearToOutputTexel'));
    let fogged = 0;
    for (const [name, shader] of Object.entries(ShaderLib)) {
      const fog = shader.fragmentShader.indexOf('#include <fog_fragment>');
      if (fog < 0) continue;
      fogged++;
      const encode = shader.fragmentShader.indexOf('#include <colorspace_fragment>');
      assert.ok(encode >= 0 && encode < fog, `${name} fogs before it encodes`);
    }
    assert.ok(fogged > 0, 'no three shader fogs, so the order above was never checked');
  });
});

describe("the free-water study's water (docs/free-water-slice.md §9, water medium)", () => {
  it('shortens the reach where the frame is a scene and keeps it where it is a chart', () => {
    // §9's low row wants water visibly between the eye and the floor; its
    // survey row wants the ink unchanged. One curve serves both: shorter
    // than the shipped reach at a short dolly, the shipped reach itself past
    // the knee.
    const [, knee] = STUDY_REACH_KNEE_M;
    assert.ok(waterReachM(1600, true) < waterReachM(1600), 'the low pose sees less far');
    const [from] = STUDY_REACH_KNEE_M;
    assert.equal(waterReachM(from, true), from * STUDY_REACH_NEAR_DOLLIES, 'flat to the knee');
    assert.equal(waterReachM(knee, true), waterReachM(knee), 'the survey reads as it did');
    assert.equal(waterReachM(10_000, true), waterReachM(10_000));
    assert.equal(waterReachM(250, true), STUDY_REACH_MIN_M, 'the garden close has its own floor');
    assert.ok(STUDY_REACH_MIN_M < WATER_REACH_MIN_M, 'and it is nearer than the shipped one');
    let previous = 0;
    for (let dollyM = 250; dollyM <= 12_000; dollyM += 50) {
      const reach = waterReachM(dollyM, true);
      assert.ok(reach >= previous, `the reach falls between ${dollyM - 50} and ${dollyM}`);
      assert.ok(reach <= waterReachM(dollyM) + 1e-9, 'the study never sees further than shipped');
      previous = reach;
    }
  });

  it('keeps the subject of a scene readable through the medium', () => {
    // Gate 7 (docs/graphics-standards.md): readability outranks richness. The
    // thing the camera is pointed at, one dolly out, stays mostly itself; the
    // far field is where the water goes.
    const dollyM = 1600;
    const density = fogDensityFor(dollyM, 1, true);
    assert.equal(density, 1 / waterReachM(dollyM, true));
    const fogAt = (distanceM: number): number => 1 - Math.exp(-((density * distanceM) ** 2));
    assert.ok(fogAt(dollyM) < 0.4, 'the focus is never more than two fifths water');
    assert.ok(fogAt(dollyM * 2) > 0.7, 'two dollies out is water');
    assert.equal(fogDensityFor(dollyM, 0, true), 0, 'the setting still turns the term off');
  });

  it('is off on every shipped map', () => {
    // The flag is the study look (`PerspectiveView.waterStudy`), and the
    // default argument is what every caller outside it gets.
    assert.equal(waterReachM(1600), 1600 * WATER_REACH_DOLLIES);
    assert.equal(fogDensityFor(1600, 1), 1 / waterReachM(1600));
  });

  it('draws a second, nearer cloud that outlasts the far one as the eye climbs', () => {
    const far = new MarineSnow(32, false, SNOW_FAR);
    const near = new MarineSnow(32, false, STUDY_SNOW_NEAR);
    try {
      const eye = new Vector3(0, 0, 0);
      const reachM = 2400;
      for (const snow of [far, near]) snow.update(0, eye, 0, 0, reachM, 1, 1000, 1);
      const farUniforms = (far.points.material as ShaderMaterial).uniforms;
      const nearUniforms = (near.points.material as ShaderMaterial).uniforms;
      // Nearer: a slab a quarter of the reach across rather than six tenths.
      assert.equal(nearUniforms.uSpreadM!.value, reachM * STUDY_SNOW_NEAR.spreadReaches);
      assert.ok(nearUniforms.uSpreadM!.value < farUniforms.uSpreadM!.value);
      // Denser: more motes in less water.
      assert.ok(STUDY_SNOW_NEAR_COUNT > 7000);
      // A soft disc rather than a grain, and dimmer for it.
      assert.equal(nearUniforms.uSizePx!.value.x, STUDY_SNOW_NEAR.minPx);
      assert.equal(nearUniforms.uSizePx!.value.y, STUDY_SNOW_NEAR.maxPx);
      assert.ok(STUDY_SNOW_NEAR.gain < SNOW_FAR.gain);
      assert.equal(nearUniforms.uGain!.value, STUDY_SNOW_NEAR.gain);
      assert.equal(farUniforms.uGain!.value, SNOW_FAR.gain);
      assert.equal(far.motes, 32);
      assert.equal(near.motes, 32);
      // From the air the view hands in a floor on the slab, so the cloud
      // fills the frustum where the sight line meets the water instead of
      // sitting in it as a patch; the floor only ever widens it.
      near.update(0, eye, 0, 0, reachM, 1, 1000, 1, 1200);
      assert.equal(nearUniforms.uSpreadM!.value, 1200);
      near.update(0, eye, 0, 0, reachM, 1, 1000, 1, 100);
      assert.equal(nearUniforms.uSpreadM!.value, reachM * STUDY_SNOW_NEAR.spreadReaches);

      // §9's low pose, 1,600 m out at 12°: the eye is about 680 m above the
      // surface (its probe reading), and both clouds are whole.
      eye.y = 680 * 0.22;
      for (const snow of [far, near]) snow.update(1, eye, 0, 0, reachM, 1, 1000, 1);
      assert.equal(farUniforms.uStrength!.value, 1);
      assert.equal(nearUniforms.uStrength!.value, 1);

      // A 15° orbit 2,600 m out, about 3,000 m up: the shipped cloud is
      // fading and the study's is still most of itself.
      eye.y = 3000 * 0.22;
      for (const snow of [far, near]) snow.update(2, eye, 0, 0, reachM, 1, 1000, 1);
      assert.ok(farUniforms.uStrength!.value < 0.7);
      assert.ok(nearUniforms.uStrength!.value > 0.8);
      assert.ok(nearUniforms.uStrength!.value > farUniforms.uStrength!.value);

      // The 55° home orbit, 2,600 m out, about 9,100 m up: neither draws, so
      // no mote lands as dust over the lit ground of the overview.
      eye.y = 9100 * 0.22;
      for (const snow of [far, near]) snow.update(3, eye, 0, 0, reachM, 1, 1000, 1);
      assert.equal(far.motes, 0);
      assert.equal(near.motes, 0);
      assert.equal(nearUniforms.uStrength!.value, 0);
    } finally {
      far.dispose();
      near.dispose();
    }
  });
});
