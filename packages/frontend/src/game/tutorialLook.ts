/**
 * Sorrowgate's first visual-reboot slice — docs/visual-reboot.md.
 * One bounded data texture, retained geometry, unchanged palette and lamp energy.
 */
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  type Material,
} from 'three';
import { Biome, Faction, PROLOGUE_SORROWGATE_HEADER, SORROWGATE_LOOK } from '@echoes/shared';
import { propHash } from './environment.ts';

export type WorldLook = 'standard' | 'sorrowgate';

export function lookForMission(missionId?: string): WorldLook {
  return missionId === PROLOGUE_SORROWGATE_HEADER.id ? 'sorrowgate' : 'standard';
}

function periodicNoise(u: number, v: number, period: number, salt: number): number {
  const x = u * period;
  const y = v * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (dx: number, dy: number) => propHash([(ix + dx) % period, (iy + dy) % period, salt]);
  const a = at(0, 0) * (1 - sx) + at(1, 0) * sx;
  const b = at(0, 1) * (1 - sx) + at(1, 1) * sx;
  return a * (1 - sy) + b * sy;
}

/** R=mottle, G=micro-height, B=roughness. Periodic noise makes every mip tileable. */
export function surfacePixels(): Uint8Array<ArrayBuffer> {
  const size = SORROWGATE_LOOK.TEXTURE_SIZE;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const coarse = periodicNoise(u, v, 4, 979);
      const fine = periodicNoise(u, v, 16, 198);
      const grain = periodicNoise(u, v, 32, 347);
      const i = (y * size + x) * 4;
      pixels[i] = Math.round(255 * (0.7 * coarse + 0.3 * fine));
      pixels[i + 1] = Math.round(255 * (0.65 * fine + 0.35 * grain));
      pixels[i + 2] = Math.round(255 * (0.4 * coarse + 0.6 * grain));
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

let surface: DataTexture | null = null;

/** Page-lifetime immutable cache, shared by all look/palette templates; never per entity. */
export function surfaceTexture(): DataTexture {
  if (surface !== null) return surface;
  const size = SORROWGATE_LOOK.TEXTURE_SIZE;
  surface = new DataTexture(surfacePixels(), size, size);
  surface.name = 'sorrowgate-surface-data';
  surface.wrapS = surface.wrapT = RepeatWrapping;
  surface.magFilter = LinearFilter;
  surface.minFilter = LinearMipmapLinearFilter;
  surface.generateMipmaps = true;
  surface.anisotropy = SORROWGATE_LOOK.ANISOTROPY;
  surface.needsUpdate = true;
  return surface;
}

const f = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

const SAMPLE = `
uniform sampler2D uSurfaceData;
vec3 surfaceSample(vec3 p, vec3 n, float tileM) {
  vec3 axis = pow(abs(normalize(n)), vec3(4.0));
  axis /= max(dot(axis, vec3(1.0)), 0.0001);
  return texture2D(uSurfaceData, p.yz / tileM).rgb * axis.x
       + texture2D(uSurfaceData, p.xz / tileM).rgb * axis.y
       + texture2D(uSurfaceData, p.xy / tileM).rgb * axis.z;
}
`;

function installSurface(
  material: MeshStandardMaterial,
  family: 'laminate' | 'stone',
  metresPerUnit: number
): void {
  if (material.emissive.getHex() !== 0) return;
  const laminate = family === 'laminate';
  const tile = laminate ? SORROWGATE_LOOK.HULL_TILE_M : SORROWGATE_LOOK.STONE_TILE_M;
  const floor = laminate ? SORROWGATE_LOOK.HULL_DIFFUSE_FLOOR : SORROWGATE_LOOK.STONE_DIFFUSE_FLOOR;
  const height = laminate ? SORROWGATE_LOOK.HULL_HEIGHT_M : SORROWGATE_LOOK.STONE_HEIGHT_M;
  const fade = laminate ? SORROWGATE_LOOK.HULL_FADE_M_PER_PX : SORROWGATE_LOOK.GROUND_FADE_M_PER_PX;
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.uSurfaceData = { value: surfaceTexture() };
    shader.uniforms.uSurfaceMetres = { value: metresPerUnit };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uSurfaceMetres;
        varying vec3 vSurfacePosition;
        varying vec3 vSurfaceNormal;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vSurfacePosition = position * uSurfaceMetres;
        vSurfaceNormal = normal;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSurfacePosition;
        varying vec3 vSurfaceNormal;
        ${SAMPLE}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 surfaceData = surfaceSample(vSurfacePosition, vSurfaceNormal, ${f(tile)});
        float surfaceMpp = max(length(dFdx(vSurfacePosition)), length(dFdy(vSurfacePosition)));
        float surfaceFade = 1.0 - smoothstep(${f(fade[0])}, ${f(fade[1])}, surfaceMpp);
        float surfaceSeam = 0.0;
        ${
          laminate
            ? `float lamina = vSurfacePosition.x / ${f(SORROWGATE_LOOK.LAMINATE_M)}
                   + 0.16 * sin(vSurfacePosition.z / ${f(SORROWGATE_LOOK.LAMINATE_M)})
                   + 0.18 * surfaceData.r;
               float seamDistance = abs(fract(lamina + 0.5) - 0.5);
               surfaceSeam = 1.0 - smoothstep(0.018, 0.018 + max(fwidth(lamina), 0.001), seamDistance);`
            : ''
        }
        float surfaceShade = clamp(0.78 + 0.28 * surfaceData.r - 0.1 * surfaceSeam, ${f(floor)}, 1.0);
        diffuseColor.rgb *= mix(1.0, surfaceShade, surfaceFade);
        float surfaceHeight = ${f(height)} * (surfaceData.g - 0.5 - surfaceSeam);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + surfaceFade *
          (surfaceData.b - 0.5 + surfaceSeam) * ${f(SORROWGATE_LOOK.ROUGHNESS_VARIATION)}, 0.04, 1.0);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec3 surfaceDx = dFdx(-vViewPosition), surfaceDy = dFdy(-vViewPosition);
        vec3 surfaceRx = cross(surfaceDy, normal), surfaceRy = cross(normal, surfaceDx);
        float surfaceDet = dot(surfaceDx, surfaceRx);
        vec3 surfaceGradient = dFdx(surfaceHeight) * surfaceRx + dFdy(surfaceHeight) * surfaceRy;
        if (abs(surfaceDet) > 0.00000001) {
          normal = normalize(abs(surfaceDet) * normal -
                   sign(surfaceDet) * surfaceGradient * surfaceFade);
        }`
      );
  };
  material.customProgramCacheKey = () => `${key}:sorrowgate-${family}-1`;
  material.needsUpdate = true;
}

export function installHullSurface(
  material: Material,
  faction: Faction,
  metresPerUnit: number
): void {
  if (faction === Faction.Pelagia && material instanceof MeshStandardMaterial) {
    installSurface(material, 'laminate', metresPerUnit);
  }
}

export function installPropSurface(material: Material): void {
  if (material instanceof MeshStandardMaterial) installSurface(material, 'stone', 1);
}

/** Install after survey ink, but shade before its colour-fragment insertion. */
export function installGroundSurface(material: Material): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  const fade = SORROWGATE_LOOK.GROUND_FADE_M_PER_PX;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.uSurfaceData = { value: surfaceTexture() };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uSurfaceData;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 surfaceUV = vSurveyXZ / ${f(SORROWGATE_LOOK.STONE_TILE_M)};
        vec3 surfaceData = texture2D(uSurfaceData, surfaceUV).rgb;
        float surfaceMpp = max(length(dFdx(vSurveyXZ)), length(dFdy(vSurveyXZ)));
        float surfaceFade = 1.0 - smoothstep(${f(fade[0])}, ${f(fade[1])}, surfaceMpp);
        vec2 paving = vSurveyXZ / ${f(SORROWGATE_LOOK.PAVING_M)};
        vec2 edge = min(fract(paving), 1.0 - fract(paving));
        vec2 aa = max(fwidth(paving), vec2(0.001));
        float joint = 1.0 - min(smoothstep(0.014, 0.014 + aa.x, edge.x),
                                smoothstep(0.014, 0.014 + aa.y, edge.y));
        ivec2 surfaceCell = clamp(ivec2(floor(vSurveyXZ / uSurveyGrid.z)), ivec2(0),
                                 ivec2(uSurveyGrid.xy) - 1);
        float surfaceBiome = floor(surveyCell(surfaceCell) * 255.0 + 0.5);
        float civic = 1.0 - step(0.5, abs(surfaceBiome - ${f(Biome.CoralRuins)}));
        float surfaceShade = clamp(0.72 + 0.28 * surfaceData.r + 0.08 * surfaceData.b -
                                   0.1 * joint * civic, ${f(SORROWGATE_LOOK.STONE_DIFFUSE_FLOOR)}, 1.0);
        diffuseColor.rgb *= mix(1.0, surfaceShade, surfaceFade);`
      );
  };
  material.customProgramCacheKey = () => `${key}:sorrowgate-ground-1`;
  material.needsUpdate = true;
}
