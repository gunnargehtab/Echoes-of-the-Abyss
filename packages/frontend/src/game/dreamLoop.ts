/**
 * Opt-in material study for #967, not the shipped art direction.
 * The approved meshes, palette lamps, live SIG and public terrain stay authoritative.
 */
import { Color, type Material, MeshStandardMaterial } from 'three';
import { UI } from './palette.ts';

export function dreamLoopEnabled(dev: boolean, search: string): boolean {
  return dev && new URLSearchParams(search).get('dream-loop') === '1';
}

export const DREAM_LOOP =
  import.meta.env?.DEV === true &&
  dreamLoopEnabled(true, typeof window === 'undefined' ? '' : window.location.search);

/** The prototype keeps a little of the column at home, none at survey distance. */
export function dreamSnowNear(aboveM: number): number {
  const t = Math.min(1, Math.max(0, (aboveM - 800) / 9200));
  return 0.7 * (1 - t * t * (3 - 2 * t));
}

/** Preserve lamp chromaticity instead of clipping two channels into flat yellow.
 * Installed after the per-entity clone; three.js does not clone shader hooks. */
export function installDreamLamp(material: MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float dreamPeak = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
      outgoingLight /= 1.0 + dreamPeak;
      #include <opaque_fragment>`
    );
  };
  material.customProgramCacheKey = () => 'dream-lamp-1';
  material.needsUpdate = true;
}

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
float dreamDune(vec2 p) {
  return 18.0 * dreamNoise(p / 75.0) + 4.0 * dreamNoise(p / 23.0);
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
        float ripple = sin(p.y * 0.7 + drift * 15.0 + dreamNoise(p / 13.0) * 5.0);
        float grain = dreamNoise(p * 1.7);
        float footprint = max(length(dFdx(p)), length(dFdy(p)));
        float fine = 1.0 - smoothstep(0.5, 3.0, footprint);
        ripple *= 1.0 - smoothstep(0.5, 2.0, fwidth(p.y * 0.7));
        float h = dreamDune(p);
        vec3 duneNormal = normalize(vec3(h - dreamDune(p + vec2(1.0, 0.0)), 1.0,
                                         h - dreamDune(p + vec2(0.0, 1.0))));
        float rake = max(dot(duneNormal, normalize(vec3(-0.6, 0.45, -0.5))), 0.0);
        float detail = 0.86 + 0.14 * rake + 0.07 * ripple +
                       0.10 * (grain - 0.5) * fine + 0.08 * (scours - 0.5);
        diffuseColor.rgb *= clamp(detail, 0.12, 1.0);`
      );
  };
  material.customProgramCacheKey = () => `${key}:dream-ground-2`;
  material.needsUpdate = true;
}

/** Object-space platework moves with a hull, not through it. No new geometry or textures. */
export function installDreamSteel(material: MeshStandardMaterial): void {
  if (material.emissive.getHex() !== 0) return;
  const value = material.color.r * 0.2126 + material.color.g * 0.7152 + material.color.b * 0.0722;
  const steel = new Color(UI.textDim);
  const luminance = steel.r * 0.2126 + steel.g * 0.7152 + steel.b * 0.0722;
  material.color.copy(steel).multiplyScalar(value / luminance);
  material.metalness = 0.42;
  material.roughness = 0.87;
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
        vec2 cell = plate / vec2(22.0, 16.0);
        vec2 edge = min(fract(cell), 1.0 - fract(cell));
        vec2 aa = max(fwidth(cell), vec2(0.001));
        float seam = 1.0 - min(smoothstep(0.004, 0.004 + aa.x, edge.x),
                               smoothstep(0.006, 0.006 + aa.y, edge.y));
        float panel = dreamHash(floor(cell));
        float grime = dreamNoise(plate / 5.0);
        float weather = dreamNoise(plate / 17.0);
        vec2 bolt = (edge - vec2(0.035, 0.048)) * vec2(22.0, 16.0);
        float rivet = 1.0 - smoothstep(0.11, 0.11 + max(fwidth(plate.x), fwidth(plate.y)), length(bolt));
        float dreamHeight = 0.08 * grime - 0.12 * seam + 0.09 * rivet;
        diffuseColor.rgb *= (0.62 + 0.06 * panel + 0.20 * weather + 0.12 * grime) *
                            (1.0 - 0.45 * seam) + 0.12 * rivet;`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
        vec3 rx = cross(sy, normal), ry = cross(normal, sx);
        float determinant = dot(sx, rx);
        vec3 surfaceGradient = sign(determinant) *
            (dFdx(dreamHeight) * rx + dFdy(dreamHeight) * ry);
        normal = normalize(abs(determinant) * normal - surfaceGradient);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (grime - 0.5) * 0.2, 0.5, 1.0);`
      )
      .replace(
        '#include <opaque_fragment>',
        `vec3 rimDirection = normalize(mat3(viewMatrix) * vec3(0.0, 0.65, -1.0));
        float grazing = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 5.0);
        float facing = max(dot(normal, rimDirection), 0.0);
        outgoingLight += uDreamRim * grazing * facing * (0.36 + 0.24 * weather);
        #include <opaque_fragment>`
      );
  };
  material.customProgramCacheKey = () => 'dream-steel-2';
  material.needsUpdate = true;
}
