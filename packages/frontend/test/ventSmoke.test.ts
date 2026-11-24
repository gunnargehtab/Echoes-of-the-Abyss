/**
 * A vent at work at the High graphics quality (docs/art-direction.md, "The
 * vents at work"; #1837). What that section promises: a chimney's breath is
 * matter drawn in the world pass, which shows by the vent's own light at its
 * mouth, the Lid's glow above and an own hull's searchlight where one
 * crosses; a column rises straight, opens evenly about its own axis and moves
 * smoothly, held still under reduced motion; and where it stands and how its
 * puffs fall are the map's chimneys' alone. What it looks like is the frames
 * in docs/screenshots/issue-1837.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Color,
  CustomBlending,
  OneFactor,
  PointsMaterial,
  ShaderLib,
  ZeroFactor,
  type BufferAttribute,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { PALETTES, setActivePalette } from '../src/game/palette.ts';
import type { PlumeSite } from '../src/game/ventPlume.ts';
import { patchVentSmoke, VENT_SMOKE_ANCHORS, VentSmoke } from '../src/game/ventSmoke.ts';

const SPEC = HIGH_GRAPHICS.VENT;
const site = (x: number, z: number, scale = 1): PlumeSite => ({
  x,
  y: -97,
  z,
  scale,
  xM: x,
  yM: z,
});

describe('a vent at work (#1837)', () => {
  it('is matter in the world pass: light adds, alpha is left, and the water takes it', () => {
    const smoke = new VentSmoke();
    const material = smoke.points.material as PointsMaterial;
    // The world pass's, and never the canvas's: the view reads this flag.
    assert.equal(smoke.points.userData.worldLayer, true);
    assert.equal(material.blending, CustomBlending);
    assert.deepEqual(
      [material.blendSrc, material.blendDst, material.blendSrcAlpha, material.blendDstAlpha],
      [OneFactor, OneFactor, ZeroFactor, OneFactor]
    );
    assert.equal(material.depthWrite, false);
    assert.equal(material.fog, true);
    assert.equal(material.sizeAttenuation, false, 'the patch is the whole of its size');
    assert.equal(smoke.points.visible, false, 'no chimney, no column');
    smoke.dispose();
  });

  it("finds every anchor it patches in three's own points program", () => {
    const shader = {
      vertexShader: ShaderLib.points.vertexShader,
      fragmentShader: ShaderLib.points.fragmentShader,
    };
    for (const anchor of VENT_SMOKE_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of VENT_SMOKE_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    patchVentSmoke(shader);
    const v = shader.vertexShader;
    // Straight up, and wider with height along the puff's own bearing.
    assert.match(v, /transformed\.y \+= smokeRise;/);
    assert.match(v, /transformed\.xz \+= vec2\( cos\( aSmoke\.z \), sin\( aSmoke\.z \) \)/);
    // The three lights: the vent's own from the mouth, a uniform the cloud
    // writes in its family's token; the Lid's glow; and each own beam, less
    // what stands in its way.
    assert.match(v, /uniform vec3 uSmokeEmber;/);
    assert.match(v, /vec3 smokeLit = uSmokeEmber \/ \( 1\.0 \+ smokeOver \* smokeOver \);/);
    assert.ok(v.includes(`smokeRise / ${SPEC.GLOW_REACH_M.toFixed(6)}`));
    assert.match(v, /smokeLit \+= echoesLitIrradiance\(/);
    assert.match(v, /smokeLit \+= smokeBeam \* echoesSearchShadeCoarse\( i, smokeAt \)/);
    // What it sends on, and the veil's drain.
    assert.ok(v.includes(`${SPEC.ALBEDO.toFixed(6)} * smoothstep`));
    assert.match(v, /\* aSmokeVeil \)/);
    // A width in metres through the projection.
    assert.ok(
      v.includes(`mix( ${SPEC.SIZE_M[0].toFixed(6)}, ${SPEC.SIZE_M[1].toFixed(6)}, smokeT )`)
    );
    assert.match(
      shader.fragmentShader,
      /diffuseColor\.rgb = vSmokeLight \* smokeFall \* smokeFall/
    );
  });

  it('stands a column on each site, each puff in the mouth and on its own bearing', () => {
    const smoke = new VentSmoke();
    const sites = [site(562, 2018), site(582, 2042, 1.5)];
    smoke.build(sites);
    assert.equal(smoke.plumes, 2);
    assert.equal(smoke.points.visible, true);
    const position = smoke.points.geometry.getAttribute('position') as BufferAttribute;
    const puff = smoke.points.geometry.getAttribute('aSmoke') as BufferAttribute;
    assert.equal(position.count, sites.length * SPEC.PUFFS);
    sites.forEach((at, c) => {
      const phases: number[] = [];
      for (let k = 0; k < SPEC.PUFFS; k++) {
        const i = c * SPEC.PUFFS + k;
        const dx = position.getX(i) - at.x;
        const dz = position.getZ(i) - at.z;
        // Formed in the mouth, at the mouth's height.
        assert.ok(Math.hypot(dx, dz) <= SPEC.MOUTH_M * at.scale + 1e-6);
        assert.equal(position.getY(i), at.y);
        // It widens along the bearing it formed on, so it leans nowhere: its
        // place in the mouth lies on that bearing, to a float's millimetre.
        const along = dx * Math.cos(puff.getZ(i)) + dz * Math.sin(puff.getZ(i));
        const across = dz * Math.cos(puff.getZ(i)) - dx * Math.sin(puff.getZ(i));
        assert.ok(Math.abs(across) < 1e-3 && along > -1e-3, `${along}, ${across}`);
        // Its climb is the column's, by its chimney's scale.
        const rise = puff.getY(i) / (SPEC.RISE_M * at.scale);
        assert.ok(rise >= 0.75 - 1e-6 && rise <= 1 + 1e-6);
        assert.ok(Math.abs(puff.getW(i) - at.scale) < 1e-6);
        phases.push(puff.getX(i));
      }
      // Phases spread over the whole life: a column is never one puff wide.
      phases.sort((a, b) => a - b);
      assert.ok(phases[0]! >= 0 && phases[phases.length - 1]! < 1);
      for (let k = 1; k < phases.length; k++) {
        assert.ok(phases[k]! - phases[k - 1]! < 2 / SPEC.PUFFS);
      }
    });
    // A hash of the placement and nothing else: a second build is the same.
    const again = new VentSmoke();
    again.build(sites);
    assert.deepEqual(
      [...(again.points.geometry.getAttribute('aSmoke').array as Float32Array)],
      [...(puff.array as Float32Array)]
    );
    smoke.clear();
    assert.equal(smoke.plumes, 0);
    assert.equal(smoke.points.visible, false);
    smoke.dispose();
    again.dispose();
  });

  it('moves smoothly, where the steam steps, and stands still under reduced motion', () => {
    const smoke = new VentSmoke();
    smoke.tick(12_340);
    const first = smoke.clockS;
    smoke.tick(12_390);
    // Fifty milliseconds on: inside one 200 ms sonar bucket, and it has moved.
    assert.ok(Math.abs(smoke.clockS - first - 0.05) < 1e-9);
    smoke.setReducedMotion(true);
    smoke.tick(12_340);
    const held = smoke.clockS;
    smoke.tick(99_000);
    assert.equal(smoke.clockS, held);
    smoke.dispose();
  });

  it('is lit from its mouth in the active palette’s ember, read each tick (#1854)', () => {
    // style-neon-noir.md "Rule 5 in the colour-vision palettes": the vent's
    // light on its own smoke is the family's token, and that is a palette's.
    const smoke = new VentSmoke();
    const lit = (token: number) => new Color(token).multiplyScalar(SPEC.GLOW);
    try {
      smoke.tick(0);
      assert.ok(smoke.emberLight.equals(lit(PALETTES.standard.worldLight.vent)));
      setActivePalette('protanopia');
      smoke.tick(16);
      assert.ok(smoke.emberLight.equals(lit(PALETTES.protanopia.worldLight.vent)));
      assert.ok(!smoke.emberLight.equals(lit(PALETTES.standard.worldLight.vent)));
    } finally {
      setActivePalette('standard');
    }
  });

  it('takes the veil a site at a time, as the steam does', () => {
    const smoke = new VentSmoke();
    smoke.build([site(100, 100), site(900, 900)], (xM, _yM, out) => {
      out.setScalar(xM < 500 ? 0.25 : 1);
    });
    const veil = smoke.points.geometry.getAttribute('aSmokeVeil') as BufferAttribute;
    assert.equal(veil.getX(0), 0.25);
    assert.equal(veil.getX(SPEC.PUFFS), 1);
    smoke.setShade(null);
    assert.equal(veil.getX(0), 1);
    smoke.dispose();
  });
});
