/**
 * The interior veil's shader patch (veilShading.ts, #1536): the shade is a
 * display-space figure, so it multiplies the encoded colour, under the survey
 * ink and before the fog.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MeshBasicMaterial, ShaderLib } from 'three';
import {
  DISPLAY_VEIL_FRAGMENT,
  installDisplayVeil,
  readsDisplayVeil,
  VEIL_SHADE_ATTRIBUTE,
} from '../src/game/veilShading.ts';

function compiled(material: MeshBasicMaterial): { vertexShader: string; fragmentShader: string } {
  const shader = {
    uniforms: {} as Record<string, unknown>,
    vertexShader: ShaderLib.basic.vertexShader,
    fragmentShader: ShaderLib.basic.fragmentShader,
  };
  material.onBeforeCompile(shader as never, undefined as never);
  return shader;
}

describe('the interior veil, in display space (#1536)', () => {
  it('drains the ground in display terms, under the ink and before the fog', () => {
    const material = new MeshBasicMaterial();
    // Stand-ins for the survey ink, installed first, and the ground's surface
    // or detail, installed after: each lands right after <color_fragment>.
    const hook = (tag: string) => {
      const before = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        before.call(material, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>\n// ${tag}`
        );
      };
    };
    hook('ink');
    installDisplayVeil(material);
    hook('surface');
    const { vertexShader, fragmentShader } = compiled(material);
    assert.ok(vertexShader.includes(`attribute vec3 ${VEIL_SHADE_ATTRIBUTE};`));
    assert.ok(vertexShader.includes(`vVeilShade = ${VEIL_SHADE_ATTRIBUTE};`));
    const drain = fragmentShader.indexOf(DISPLAY_VEIL_FRAGMENT);
    assert.ok(drain > fragmentShader.indexOf('// surface'), 'after the finished ground');
    assert.ok(drain < fragmentShader.indexOf('// ink'), 'under the ink');
    assert.ok(drain < fragmentShader.indexOf('#include <fog_fragment>'), 'before the fog');
    // Encoded, multiplied, decoded: never a linear multiply by a display figure.
    assert.match(
      DISPLAY_VEIL_FRAGMENT,
      /pow\( diffuseColor\.rgb, vec3\( 1\.0 \/ 2\.4 \) \)[^;]*\* vVeilShade;/
    );
    assert.match(DISPLAY_VEIL_FRAGMENT, /vec3\( 2\.4 \)/);
    material.dispose();
  });

  it('chains onto an earlier patch and keys its own program', () => {
    const material = new MeshBasicMaterial();
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\n// earlier'
      );
    };
    material.customProgramCacheKey = () => 'earlier';
    installDisplayVeil(material);
    assert.ok(compiled(material).fragmentShader.includes('// earlier'));
    assert.ok(material.customProgramCacheKey().startsWith('earlier'));
    assert.ok(readsDisplayVeil(material));
    assert.ok(!readsDisplayVeil(new MeshBasicMaterial()));
    material.dispose();
  });
});
