/**
 * An own hull's searchlight at the High graphics quality (docs/art-direction.md,
 * "An own hull's searchlight"; #1836): what throws one, how bright, and what
 * shadows it. The frames are docs/screenshots/issue-1836/; these hold what a
 * frame cannot, which is the limits: a silent hull throws nothing (limit 5),
 * and only an own hull throws or shadows (limit 2).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Color } from 'three';
import { Faction, HIGH_GRAPHICS, SILENT_RUNNING } from '@echoes/shared';
import { HALO_SIG_FLOOR, HALO_SIG_FULL, haloGain } from '../src/game/glow.ts';
import { HULL_LIGHT_ANCHORS, patchHullLight } from '../src/game/hullLight.ts';
import { LIT_GROUND_GLSL } from '../src/game/litGround.ts';
import { FACTION_PALETTE } from '../src/game/palette.ts';
import {
  beamIrradiance,
  groundHeightTexture,
  groundShade,
  hullShade,
  SEARCHLIGHT_GLSL,
  SEARCHLIGHT_UNIFORMS,
  searchlightCount,
  searchlightGain,
  searchlightsOf,
  setSearchlights,
  type SearchlightHull,
} from '../src/game/searchlights.ts';

const SPEC = HIGH_GRAPHICS.SEARCHLIGHT;
const GLOW = FACTION_PALETTE[Faction.Pelagia].glow;

/** A level floor at 600 m, as the crater's rim is drawn: 66 m under a hull at 300 m. */
const FLOOR = (): number => -132;

const hull = (over: Partial<SearchlightHull> = {}): SearchlightHull => ({
  id: 1,
  x: 1000,
  y: -66,
  z: 1000,
  heading: 0,
  lengthM: 80,
  beamM: 12,
  sig: HALO_SIG_FULL,
  ...over,
});

describe("an own hull's searchlight", () => {
  it("takes the lamp halo's gain, so a beam is no louder than the lamps", () => {
    // Limit 5, and gate 3 at High: a lamp's light spreads "only as far as its
    // SIG says, as the halo does".
    for (const sig of [0, 6, HALO_SIG_FLOOR, 18, 28, HALO_SIG_FULL, SPEC.GAIN_SIG_CAP]) {
      assert.equal(searchlightGain(sig), haloGain(sig), `SIG ${sig}`);
    }
    assert.equal(searchlightGain(HALO_SIG_FLOOR), 0);
    assert.equal(searchlightGain(HALO_SIG_FULL), 1);
    // And it stops climbing where the halo does not: a pool is ground a mark
    // stands on.
    assert.equal(searchlightGain(80), searchlightGain(SPEC.GAIN_SIG_CAP));
    assert.equal(searchlightGain(95), searchlightGain(SPEC.GAIN_SIG_CAP));
    assert.ok(searchlightGain(SPEC.GAIN_SIG_CAP) > 1);
  });

  it('is dark on Silent Running, by construction', () => {
    // "A hull on Silent Running does not floodlight the seabed." The server
    // holds a silent hull inside this band, all of it under the halo's floor.
    assert.ok(SILENT_RUNNING.SIG_MAX < HALO_SIG_FLOOR);
    for (let sig = SILENT_RUNNING.SIG_MIN; sig <= SILENT_RUNNING.SIG_MAX; sig++) {
      assert.equal(searchlightGain(sig), 0);
      const { lights } = searchlightsOf([hull({ sig })], GLOW, { x: 1000, z: 1000 }, FLOOR);
      assert.equal(lights.length, 0, `a hull at SIG ${sig} throws a beam`);
    }
  });

  it("throws one beam a loud hull, off its bow, in its navy's glow", () => {
    const { lights } = searchlightsOf(
      [hull({ heading: Math.PI / 2 })],
      GLOW,
      { x: 0, z: 0 },
      FLOOR
    );
    assert.equal(lights.length, 1);
    const [beam] = lights;
    // Heading a quarter turn from +x looks along +z: plan y is the world's z.
    assert.ok(Math.abs(beam!.x - 1000) < 1e-9);
    assert.ok(Math.abs(beam!.z - (1000 + 40 + SPEC.CLEAR_M)) < 1e-9);
    assert.ok(beam!.y < -66, 'the lamp hangs under the keel line');
    assert.ok(Math.abs(Math.hypot(beam!.dx, beam!.dy, beam!.dz) - 1) < 1e-9);
    assert.ok(beam!.dz > 0 && Math.abs(beam!.dx) < 1e-9);
    // It looks at the ground a throw ahead of the lamp.
    const fall = beam!.y - FLOOR();
    assert.ok(Math.abs(-beam!.dy / beam!.dz - fall / SPEC.THROW_M) < 1e-9);
    // Hue is the navy's (gate 4): the glow token, scaled and never mixed.
    const glow = new Color(GLOW);
    assert.ok(Math.abs(beam!.r - glow.r * SPEC.POWER) < 1e-9);
    assert.ok(Math.abs(beam!.g / beam!.r - glow.g / glow.r) < 1e-9);
    assert.ok(Math.abs(beam!.b / beam!.r - glow.b / glow.r) < 1e-9);
  });

  it('leads the hull with its pool at any height, and never hangs its lamp in the ground', () => {
    const [shallowest, steepest] = SPEC.DEPRESSION_DEG.map((deg) => (deg * Math.PI) / 180);
    const beamOf = (y: number, lengthM = 80, beamM = 12) =>
      searchlightsOf([hull({ y, lengthM, beamM })], GLOW, { x: 0, z: 0 }, FLOOR).lights[0]!;
    // A hull skimming the floor still rakes it, at the shallowest angle.
    const skimming = beamOf(-128);
    assert.ok(Math.abs(Math.asin(-skimming.dy) - shallowest!) < 1e-9);
    // One high over the floor does not look straight down.
    assert.ok(Math.abs(Math.asin(-beamOf(200).dy) - steepest!) < 1e-9);
    // A hull drawn several times its size at a far dolly: its keel line is
    // under the ground, and the lamp is not.
    const large = beamOf(-128, 280, 42);
    assert.equal(large.y, FLOOR() + SPEC.LAMP_CLEAR_M);
    assert.ok(skimming.y >= FLOOR() + SPEC.LAMP_CLEAR_M);
  });

  it('brightens with the hull, by the gain alone', () => {
    const at = (sig: number) =>
      searchlightsOf([hull({ sig })], GLOW, { x: 0, z: 0 }, FLOOR).lights[0]!.g;
    assert.ok(Math.abs(at(28) / at(HALO_SIG_FULL) - haloGain(28)) < 1e-9);
    assert.ok(at(SPEC.GAIN_SIG_CAP) > at(HALO_SIG_FULL));
  });

  it('keeps the beams nearest the focus, the same on every frame', () => {
    const fleet = Array.from({ length: SPEC.MAX + 3 }, (_, i) =>
      hull({ id: 10 + i, x: 1000 + 100 * i })
    );
    const shuffled = [...fleet].reverse();
    const first = searchlightsOf(fleet, GLOW, { x: 1000, z: 1000 }, FLOOR);
    const second = searchlightsOf(shuffled, GLOW, { x: 1000, z: 1000 }, FLOOR);
    assert.equal(first.lights.length, SPEC.MAX);
    assert.deepEqual(
      first.lights.map((l) => l.hull),
      fleet.slice(0, SPEC.MAX).map((h) => h.id)
    );
    assert.deepEqual(second.lights, first.lights, 'the order handed in decides nothing');
    // A silent hull in the way leaves its slot to the next loud one, and
    // still stands in a beam.
    const quiet = fleet.map((h, i) => (i === 0 ? { ...h, sig: 5 } : h));
    const third = searchlightsOf(quiet, GLOW, { x: 1000, z: 1000 }, FLOOR);
    assert.equal(third.lights[0]!.hull, 11);
    assert.equal(third.lights.length, SPEC.MAX);
    assert.equal(third.occluders[0]!.hull, 10);
    assert.equal(third.occluders.length, SPEC.OCCLUDERS);
  });

  it('is handed own hulls and nothing else', () => {
    // Limit 2: a contact throws no light and casts no shadow. The list is
    // built from what it is handed, and the view hands it `units`, which
    // holds no contact (PerspectiveView `aimSearchlights`).
    const { lights, occluders } = searchlightsOf([], GLOW, { x: 0, z: 0 }, FLOOR);
    assert.deepEqual(lights, []);
    assert.deepEqual(occluders, []);
  });

  it('writes one set of uniforms for the page, and none without a ground', () => {
    const { lights, occluders } = searchlightsOf(
      [hull({ id: 7 }), hull({ id: 9, x: 1400, sig: 5 })],
      GLOW,
      { x: 1000, z: 1000 },
      FLOOR
    );
    const ground = groundHeightTexture({ cols: 2, rows: 2, cellM: 250 } as never, () => -132);
    setSearchlights(lights, occluders, ground, 500, 500);
    assert.equal(searchlightCount(), 1);
    assert.equal(SEARCHLIGHT_UNIFORMS.tSearchGround.value, ground);
    assert.equal(SEARCHLIGHT_UNIFORMS.uSearchHullCount.value, 2);
    // The beam knows its own hull's slot, so its own hull never shadows it.
    assert.equal(SEARCHLIGHT_UNIFORMS.uSearchAim.value[0]!.w, 0);
    assert.equal(SEARCHLIGHT_UNIFORMS.uSearchHullA.value[1]!.w, 6);
    setSearchlights(lights, occluders, null);
    assert.equal(searchlightCount(), 0, 'no ground, no beam');
    assert.notEqual(SEARCHLIGHT_UNIFORMS.tSearchGround.value, ground);
    ground.dispose();
  });

  it('holds the ground’s heights at sixteen pixels a cell, north first', () => {
    const texture = groundHeightTexture(
      { cols: 2, rows: 1, cellM: 250 } as never,
      (x, z) => -(x + 10 * z)
    );
    assert.equal(texture.image.width, 32);
    assert.equal(texture.image.height, 16);
    assert.equal(texture.flipY, false);
    texture.dispose();
  });

  it('falls by the square of the distance, to nothing at its reach', () => {
    // `POWER` at `REF_M`, less what the core and the window take there.
    const atRef = beamIrradiance(SPEC.REF_M) / SPEC.POWER;
    assert.ok(atRef > 0.7 && atRef <= 1, `at REF_M a beam is ${atRef} of POWER`);
    assert.ok(beamIrradiance(2 * SPEC.REF_M) < beamIrradiance(SPEC.REF_M) / 3);
    assert.equal(beamIrradiance(SPEC.REACH_M), 0);
    assert.equal(beamIrradiance(SPEC.REACH_M + 100), 0);
    // The lamp itself is finite: the core softens the square law.
    assert.ok(Number.isFinite(beamIrradiance(0)));
    assert.ok(SEARCHLIGHT_GLSL.includes((SPEC.REF_M * SPEC.REF_M).toFixed(6)));
    assert.ok(SEARCHLIGHT_GLSL.includes((SPEC.CORE_M * SPEC.CORE_M).toFixed(6)));
    assert.ok(SEARCHLIGHT_GLSL.includes((SPEC.REACH_M * SPEC.REACH_M).toFixed(6)));
  });

  it('is shadowed by rock that stands in the beam, and not by level ground', () => {
    // "Rock is ground here, so rock shadows ground." A lamp 66 m over level
    // ground lights it out to the pool's far edge.
    const level = () => -132;
    const lamp = { x: 0, y: -66, z: 0 };
    for (const x of [60, 124, 250, 400]) {
      assert.equal(groundShade(level, { x, y: -132, z: 0 }, lamp), 1, `level ground at ${x} m`);
    }
    // A ridge 80 m high across the line, half way: the ground behind it is dark.
    const ridge = (x: number) => (x > 110 && x < 140 ? -52 : -132);
    assert.equal(groundShade(ridge, { x: 250, y: -132, z: 0 }, lamp), 0);
    // And the ground before it is lit.
    assert.equal(groundShade(ridge, { x: 60, y: -132, z: 0 }, lamp), 1);
    // The shadow's edge is soft: a point whose line just meets the crest.
    const grazing = groundShade(ridge, { x: 250, y: -39, z: 0 }, lamp);
    assert.ok(grazing > 0 && grazing < 1, `a grazing line reads ${grazing}`);
    // And a lamp skimming the floor still lights the water over it: the
    // ground beside the lamp is near the line and casts nothing.
    const skimming = { x: 0, y: -128, z: 0 };
    assert.equal(groundShade(level, { x: 200, y: -100, z: 0 }, skimming), 1);
    assert.ok(groundShade(level, { x: 60, y: -132, z: 0 }, skimming) > 0.9);
  });

  it('is shadowed by another own hull, and never by the hull that throws it', () => {
    const lamp = { x: 0, y: -66, z: 0 };
    const at = { x: 200, y: -132, z: 0 };
    const inBeam = { hull: 2, ax: 100, ay: -99, az: -30, bx: 100, by: -99, bz: 30, radiusM: 6 };
    assert.equal(hullShade([inBeam], 1, at, lamp), 0, 'a hull across the line shadows it');
    assert.equal(hullShade([inBeam], 2, at, lamp), 1, 'the beam’s own hull does not');
    const aside = { ...inBeam, az: 40, bz: 100 };
    assert.equal(hullShade([aside], 1, at, lamp), 1, 'a hull beside the line does not');
  });

  it('lights the ground and the cladding through one chunk', () => {
    assert.ok(LIT_GROUND_GLSL.includes(SEARCHLIGHT_GLSL));
    const shader = {
      vertexShader: HULL_LIGHT_ANCHORS.vertex.join('\n'),
      fragmentShader: HULL_LIGHT_ANCHORS.fragment.join('\n'),
    };
    patchHullLight(shader);
    assert.ok(shader.fragmentShader.includes(SEARCHLIGHT_GLSL));
    // A beam is a light from one quarter, so a face takes it through three's
    // own direct term, after the lights three sums itself.
    assert.ok(
      shader.fragmentShader.indexOf('RE_Direct( searchLight') >
        shader.fragmentShader.indexOf('#include <lights_fragment_begin>')
    );
    // The ground's shadow reaches a hull; a hull's own capsule never does.
    const direct = shader.fragmentShader.slice(shader.fragmentShader.indexOf('IncidentLight'));
    assert.ok(direct.includes('echoesSearchGround( vHullWorld'));
    assert.equal(direct.includes('echoesSearchHulls('), false);
  });
});
