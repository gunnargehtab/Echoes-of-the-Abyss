/**
 * An own hull's searchlight at the High graphics quality (docs/art-direction.md,
 * "An own hull's searchlight"; #1836): what throws one, how bright, and what
 * shadows it. The frames are docs/screenshots/issue-1836/; these hold what a
 * frame cannot, which is limit 5: a silent hull throws nothing. Limit 2, that
 * only an own hull throws or shadows, is held by what the view hands
 * `searchlightsOf`: its own units, typed `OwnUnit`, and never a track.
 *
 * The second describe is a beam from each lamp a class carries (#1845; "A
 * beam from each lamp"): the count a class, which docs/asset-prompts-3d.md
 * writes first, where each lamp hangs and looks, and how a frame's six are
 * shared.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Color, DataUtils } from 'three';
import { DEPTH, Faction, HIGH_GRAPHICS, SILENT_RUNNING, statsFor, UnitKind } from '@echoes/shared';
import { HALO_SIG_FLOOR, HALO_SIG_FULL, haloGain } from '../src/game/glow.ts';
import { HULL_LIGHT_ANCHORS, patchHullLight } from '../src/game/hullLight.ts';
import { LIT_GROUND_GLSL } from '../src/game/litGround.ts';
import { FACTION_PALETTE } from '../src/game/palette.ts';
import { depthToWorldY } from '../src/game/perspectiveTerrain.ts';
import {
  beamIrradiance,
  groundHeightTexture,
  groundShade,
  hullLamps,
  hullShade,
  NO_GROUND,
  SEARCHLIGHT_GLSL,
  SEARCHLIGHT_UNIFORMS,
  searchlightCount,
  searchlightGain,
  searchlightsOf,
  setSearchlights,
  type Searchlight,
  type SearchlightHull,
} from '../src/game/searchlights.ts';

const SPEC = HIGH_GRAPHICS.SEARCHLIGHT;
const LAMPS = HIGH_GRAPHICS.LAMPS;
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
  // One lamp, the bow's: the accepted step, which every test above the
  // second describe holds as it was.
  lamps: 1,
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
    // A cast edge's control (#1842) hands over heights far below any beam:
    // the beam is drawn, and the walk finds nothing to cut it with.
    setSearchlights(lights, occluders, NO_GROUND, 500, 500);
    assert.equal(searchlightCount(), 1, 'the control keeps the beam');
    assert.equal(SEARCHLIGHT_UNIFORMS.tSearchGround.value, NO_GROUND);
    const below = DataUtils.fromHalfFloat((NO_GROUND.image.data as Uint16Array)[0]!);
    assert.ok(below < depthToWorldY(DEPTH.MAX_M) - SPEC.REACH_M, `no ground reads ${below} m`);
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

describe('a beam from each lamp a class carries (#1845)', () => {
  const kinds = Object.values(UnitKind).filter(
    (kind): kind is UnitKind => typeof kind === 'number'
  );
  const beamsOf = (hulls: SearchlightHull[], focus = { x: 1000, z: 1000 }): Searchlight[] =>
    searchlightsOf(hulls, GLOW, focus, FLOOR).lights;
  const named = (lights: Searchlight[]): string[] => lights.map((l) => `${l.hull}:${l.lamp}`);

  it('counts a class by its glow band, as the prompt kit writes every class', () => {
    // docs/asset-prompts-3d.md, "Searchlights a hull class throws": the owner
    // asked for the count there first, so the table is read and the code is
    // held to it, a class a cell.
    const doc = readFileSync(new URL('../../../docs/asset-prompts-3d.md', import.meta.url), 'utf8');
    const from = doc.indexOf('### Searchlights a hull class throws');
    assert.ok(from >= 0, 'docs/asset-prompts-3d.md lost "Searchlights a hull class throws"');
    const table = doc
      .slice(from, doc.indexOf('\n## ', from))
      .split('\n')
      .filter((line) => line.startsWith('| ') && !line.startsWith('| ---'))
      .slice(1)
      .map((line) =>
        line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
      );
    assert.equal(table.length, LAMPS.BANDS.length + 1, 'a row a band, and the craft');
    const written = new Map<string, number>();
    for (const [, lamps, , classes] of table) {
      for (const name of classes!.split(', ')) {
        assert.equal(written.has(name), false, `${name} is written twice`);
        written.set(name, Number(lamps));
      }
    }
    assert.equal(written.size, kinds.length, 'every class, once');
    for (const kind of kinds) {
      const { name } = statsFor(kind);
      assert.equal(hullLamps(kind), written.get(name), `${name}: the doc and the code disagree`);
    }
    // The bands the rows are headed by are the constant's, and the last row is the craft.
    const tops = table.slice(0, -1).map(([band]) => band!);
    assert.match(tops[0]!, new RegExp(`^0\u2013${LAMPS.BANDS[0][0]},`));
    assert.match(tops[1]!, new RegExp(`^${LAMPS.BANDS[0][0] + 1}\u2013${LAMPS.BANDS[1][0]},`));
    assert.match(tops[2]!, new RegExp(`^${LAMPS.BANDS[1][0] + 1} and over,`));
    const craft = kinds.filter((kind) => statsFor(kind).launchedFrom !== undefined);
    assert.deepEqual(
      table.at(-1)![3]!.split(', ').sort(),
      craft.map((kind) => statsFor(kind).name).sort()
    );
    assert.equal(Number(table.at(-1)![1]), LAMPS.CRAFT);
  });

  it('carries more lamps the louder a class is built, and never by a hull\u2019s live state', () => {
    assert.equal(hullLamps(UnitKind.LightScout), 1);
    assert.equal(hullLamps(UnitKind.Corvette), 2);
    assert.equal(hullLamps(UnitKind.Harvester), 2);
    assert.equal(hullLamps(UnitKind.Cruiser), 4);
    assert.equal(hullLamps(UnitKind.Bulwark), 4);
    // A craft is a cell of its carrier, whatever its SIG: the Spark idles at 40.
    assert.ok(statsFor(UnitKind.Spark).sigIdle > LAMPS.BANDS[1][0]);
    assert.equal(hullLamps(UnitKind.Spark), LAMPS.CRAFT);
    const byIdle = [...kinds]
      .filter((kind) => statsFor(kind).launchedFrom === undefined)
      .sort((a, b) => statsFor(a).sigIdle - statsFor(b).sigIdle);
    for (let i = 1; i < byIdle.length; i++) {
      assert.ok(hullLamps(byIdle[i]!) >= hullLamps(byIdle[i - 1]!));
    }
  });

  it('leaves the bow beam as it was accepted, whatever else the class carries', () => {
    const [alone] = beamsOf([hull()]);
    for (const lamps of [2, 4]) {
      const lights = beamsOf([hull({ lamps })]);
      assert.equal(lights.length, lamps);
      assert.deepEqual(lights[0], alone, `a class with ${lamps} lamps moves its bow beam`);
      assert.equal(lights[0]!.lamp, 'bow');
    }
  });

  it('stands the mast lamp on the hull\u2019s back, looking ahead and up, over level ground', () => {
    const [, mast] = beamsOf([hull({ lamps: 2, heading: Math.PI / 2 })]);
    assert.equal(mast!.lamp, 'mast');
    // Forward of amidships and over the keel line, clear of the hull's top.
    assert.ok(Math.abs(mast!.x - 1000) < 1e-9);
    assert.ok(Math.abs(mast!.z - (1000 + 80 * LAMPS.MAST.AHEAD)) < 1e-9);
    assert.ok(mast!.z < 1000 + 40, 'inside the hull\u2019s length');
    assert.ok(Math.abs(mast!.y - (-66 + 12 * LAMPS.MAST.UP)) < 1e-9);
    assert.ok(mast!.y > -66 + 12 / 2);
    // Along the heading, over the level: it meets no level ground at any reach.
    assert.ok(Math.abs(Math.hypot(mast!.dx, mast!.dy, mast!.dz) - 1) < 1e-9);
    assert.ok(mast!.dz > 0 && Math.abs(mast!.dx) < 1e-9);
    assert.ok(Math.abs(Math.asin(mast!.dy) - (LAMPS.MAST.RISE_DEG * Math.PI) / 180) < 1e-9);
    // And its cone's lower edge stays over the hull's own bow, which is under the lamp.
    assert.ok(LAMPS.MAST.RISE_DEG < SPEC.OUTER_DEG, 'the cone dips under the level');
    const bowTop = { ahead: 80 * (0.5 - LAMPS.MAST.AHEAD), under: 12 * (LAMPS.MAST.UP - 0.5) };
    const toBow = (Math.atan2(bowTop.under, bowTop.ahead) * 180) / Math.PI;
    assert.ok(toBow > SPEC.OUTER_DEG - LAMPS.MAST.RISE_DEG, `the bow is ${toBow} degrees under`);
  });

  it('throws a flood to port and to starboard, at the ground beside the hull', () => {
    const lights = beamsOf([hull({ lamps: 4 })]);
    assert.deepEqual(named(lights), ['1:bow', '1:mast', '1:port', '1:starboard']);
    const [, , port, starboard] = lights;
    // Heading +x: starboard is +z, the heading turned a quarter toward it.
    const out = 12 / 2 + LAMPS.FLOOD.OUT_M;
    assert.ok(Math.abs(starboard!.z - (1000 + out)) < 1e-9);
    assert.ok(Math.abs(port!.z - (1000 - out)) < 1e-9);
    for (const flood of [port!, starboard!]) {
      assert.ok(Math.abs(flood.x - 1000) < 1e-9, 'amidships');
      assert.ok(flood.y < -66, 'under the keel line');
      assert.ok(Math.abs(flood.dx) < 1e-9, 'square to the heading');
      // At the ground a throw abeam.
      const fall = flood.y - FLOOR();
      assert.ok(Math.abs(-flood.dy / Math.abs(flood.dz) - fall / LAMPS.FLOOD.THROW_M) < 1e-9);
    }
    assert.ok(starboard!.dz > 0 && port!.dz < 0, 'each looks away from the hull');
    // The pair is one beam mirrored in the keel line.
    assert.ok(Math.abs(port!.dz + starboard!.dz) < 1e-9);
    assert.ok(Math.abs(port!.dy - starboard!.dy) < 1e-9);
    // A hull skimming the floor rakes it, and one high over it does not look straight down.
    const [shallowest, steepest] = LAMPS.FLOOD.DEPRESSION_DEG.map((deg) => (deg * Math.PI) / 180);
    const floodOf = (y: number) => beamsOf([hull({ lamps: 4, y })])[3]!;
    assert.ok(Math.abs(Math.asin(-floodOf(-128).dy) - shallowest!) < 1e-9);
    assert.ok(Math.abs(Math.asin(-floodOf(400).dy) - steepest!) < 1e-9);
  });

  it('burns every lamp at the lamp halo\u2019s gain, and none on Silent Running', () => {
    // Limit 5 for four lamps as for one: the count is the class's, and the
    // live SIG alone says how bright.
    for (let sig = SILENT_RUNNING.SIG_MIN; sig <= SILENT_RUNNING.SIG_MAX; sig++) {
      assert.equal(beamsOf([hull({ lamps: 4, sig })]).length, 0, `SIG ${sig}`);
    }
    const glow = new Color(GLOW);
    for (const sig of [18, 28, HALO_SIG_FULL, 70]) {
      const [bow, mast, port, starboard] = beamsOf([hull({ lamps: 4, sig })]);
      assert.ok(Math.abs(bow!.g - glow.g * SPEC.POWER * haloGain(Math.min(sig, 45))) < 1e-9);
      assert.ok(Math.abs(mast!.g - bow!.g * LAMPS.MAST.SHARE) < 1e-9);
      assert.ok(Math.abs(port!.g - bow!.g * LAMPS.FLOOD.SHARE) < 1e-9);
      assert.deepEqual([port!.r, port!.g, port!.b], [starboard!.r, starboard!.g, starboard!.b]);
    }
    assert.ok(LAMPS.MAST.SHARE <= 1 && LAMPS.FLOOD.SHARE <= 1, 'no lamp outshines the bow\u2019s');
    assert.equal(SPEC.GAIN_SIG_CAP, 45);
  });

  it('shares a frame\u2019s six in rounds: bow beams, then masts, then flood pairs whole', () => {
    const fleet = (...lamps: number[]): SearchlightHull[] =>
      lamps.map((count, i) => hull({ id: 10 + i, x: 1000 + 100 * i, lamps: count }));
    // Six loud hulls draw what one beam a hull drew, whatever they carry.
    const loud = fleet(4, 4, 2, 4, 2, 4, 4);
    const one = loud.map((h) => ({ ...h, lamps: 1 }));
    assert.deepEqual(beamsOf(loud), beamsOf(one));
    assert.equal(beamsOf(loud).length, SPEC.MAX);
    // A small fleet shows the count: every bow beam first, nearest first.
    assert.deepEqual(named(beamsOf(fleet(2, 2, 2))), [
      '10:bow',
      '11:bow',
      '12:bow',
      '10:mast',
      '11:mast',
      '12:mast',
    ]);
    assert.deepEqual(named(beamsOf(fleet(4, 2))), [
      '10:bow',
      '11:bow',
      '10:mast',
      '11:mast',
      '10:port',
      '10:starboard',
    ]);
    // The cap's edge: the nearer of two equal hulls takes the last pair.
    assert.deepEqual(named(beamsOf(fleet(4, 4))).slice(4), ['10:port', '10:starboard']);
    // One slot left is no half pair.
    assert.deepEqual(named(beamsOf(fleet(4, 1, 4))), [
      '10:bow',
      '11:bow',
      '12:bow',
      '10:mast',
      '12:mast',
    ]);
    // A silent hull between two loud ones takes no round's slot.
    const quiet = fleet(4, 4, 2).map((h, i) => (i === 1 ? { ...h, sig: 5 } : h));
    assert.deepEqual(named(beamsOf(quiet)), [
      '10:bow',
      '12:bow',
      '10:mast',
      '12:mast',
      '10:port',
      '10:starboard',
    ]);
    // And the order handed in decides nothing.
    assert.deepEqual(beamsOf([...fleet(4, 2, 4)].reverse()), beamsOf(fleet(4, 2, 4)));
  });

  it('prints every number of the lamps in the section that owns them', () => {
    // TUNABLE and in development, so no SPEC test holds it (highSpec.test.ts);
    // a doc table that drifts from its constant is still a false sentence.
    const doc = readFileSync(new URL('../../../docs/art-direction.md', import.meta.url), 'utf8');
    const from = doc.indexOf('#### A beam from each lamp');
    assert.ok(from >= 0, 'docs/art-direction.md lost "A beam from each lamp"');
    const printed = new Map(
      doc
        .slice(from, doc.indexOf('\n#### ', from + 1))
        .split('\n')
        .filter((line) => line.startsWith('| ') && line.includes('`LAMPS.'))
        .map((line) => {
          const [, constant, value] = line.split('|').slice(1, -1);
          return [constant!.trim().replace(/`/g, ''), value!.trim()] as const;
        })
    );
    const leaves = (value: unknown, path: string): [string, string][] =>
      typeof value === 'number' || Array.isArray(value)
        ? [[path, [value].flat(2).join(', ')]]
        : Object.entries(value as object).flatMap(([key, v]) => leaves(v, `${path}.${key}`));
    assert.deepEqual([...printed].sort(), leaves(LAMPS, 'LAMPS').sort());
  });

  it('never hangs a lamp in the ground, and passes its own hull over for every lamp', () => {
    // A hull drawn several times its size at a far dolly, skimming the floor.
    const large = hull({ id: 7, lamps: 4, y: -128, lengthM: 280, beamM: 42 });
    const { lights, occluders } = searchlightsOf([large], GLOW, { x: 1000, z: 1000 }, FLOOR);
    assert.equal(lights.length, 4);
    for (const light of lights) {
      assert.ok(light.y >= FLOOR() + SPEC.LAMP_CLEAR_M, `the ${light.lamp} lamp is in the ground`);
    }
    const ground = groundHeightTexture({ cols: 2, rows: 2, cellM: 250 } as never, FLOOR);
    setSearchlights(lights, occluders, ground, 500, 500);
    assert.equal(searchlightCount(), 4);
    for (let i = 0; i < 4; i++) {
      assert.equal(SEARCHLIGHT_UNIFORMS.uSearchAim.value[i]!.w, 0, `beam ${i} knows its hull`);
    }
    setSearchlights([], [], null);
    ground.dispose();
  });
});
