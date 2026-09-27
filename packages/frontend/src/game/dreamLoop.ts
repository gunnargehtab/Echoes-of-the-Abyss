/**
 * Opt-in material study for #967, not the shipped art direction.
 * The approved meshes, palette lamps, live SIG and public terrain stay authoritative.
 */
import { Color, type Material, MeshStandardMaterial } from 'three';
import { UI } from './palette.ts';

export function dreamLoopEnabled(dev: boolean, search: string): boolean {
  return dev && new URLSearchParams(search).get('dream-loop') === '1';
}

export const DREAM_LOOP = dreamLoopEnabled(
  import.meta.env?.DEV === true,
  typeof window === 'undefined' ? '' : window.location.search
);

const NOISE = `
float dreamHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float dreamNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(dreamHash(i), dreamHash(i + vec2(1.0, 0.0)), f.x),
             mix(dreamHash(i + vec2(0.0, 1.0)), dreamHash(i + 1.0), f.x), f.y);
}
`;

/** Chain rather than replace the survey's shader hook; the ink still reads authored depth. */
export function installDreamGround(material: Material): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDreamGround;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvDreamGround = (modelMatrix * vec4(transformed, 1.0)).xz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vDreamGround;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 p = vDreamGround;
        float drift = dreamNoise(p / 85.0);
        float scours = dreamNoise(p / 23.0 + drift * 2.0);
        float ripple = sin(p.y * 0.65 + drift * 9.0 + dreamNoise(p / 31.0) * 3.0);
        float grain = dreamNoise(p * 1.7);
        float detail = 0.46 + 0.28 * drift + 0.16 * scours + 0.07 * ripple + 0.03 * grain;
        diffuseColor.rgb *= clamp(detail, 0.25, 1.0);`
      );
  };
  material.customProgramCacheKey = () => `${key}:dream-ground-1`;
  material.needsUpdate = true;
}

/** Object-space platework moves with a hull, not through it. No new geometry or textures. */
export function installDreamSteel(material: MeshStandardMaterial): void {
  if (material.emissive.getHex() !== 0) return;
  const value = material.color.r * 0.2126 + material.color.g * 0.7152 + material.color.b * 0.0722;
  const steel = new Color(UI.textDim);
  const luminance = steel.r * 0.2126 + steel.g * 0.7152 + steel.b * 0.0722;
  material.color.copy(steel).multiplyScalar(value / luminance);
  material.metalness = 0.35;
  material.roughness = 0.86;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDreamRim = { value: new Color(UI.accent) };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vDreamLocal;\nvarying vec3 vDreamNormal;'
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vDreamLocal = position * length(modelMatrix[0].xyz);
        vDreamNormal = normal;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vDreamLocal;
        varying vec3 vDreamNormal;
        uniform vec3 uDreamRim;
        ${NOISE}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 axis = abs(normalize(vDreamNormal));
        vec2 plate = axis.y > max(axis.x, axis.z) ? vDreamLocal.xz :
                     (axis.x > axis.z ? vDreamLocal.zy : vDreamLocal.xy);
        vec2 cell = plate / vec2(12.0, 7.0);
        cell.x += mod(floor(cell.y), 2.0) * 0.5;
        vec2 edge = min(fract(cell), 1.0 - fract(cell));
        vec2 aa = max(fwidth(cell), vec2(0.001));
        float seam = 1.0 - min(smoothstep(0.015, 0.015 + aa.x, edge.x),
                               smoothstep(0.025, 0.025 + aa.y, edge.y));
        float panel = dreamHash(floor(cell));
        float grime = dreamNoise(plate / 3.0);
        diffuseColor.rgb *= (0.65 + 0.3 * panel + 0.05 * grime) * (1.0 - 0.7 * seam);`
      )
      .replace(
        '#include <opaque_fragment>',
        `vec3 rimDirection = normalize(mat3(viewMatrix) * vec3(0.0, 0.65, -1.0));
        float grazing = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 3.0);
        float facing = max(dot(normal, rimDirection), 0.0);
        outgoingLight += uDreamRim * grazing * facing * 0.16;
        #include <opaque_fragment>`
      );
  };
  material.customProgramCacheKey = () => 'dream-steel-1';
  material.needsUpdate = true;
}
