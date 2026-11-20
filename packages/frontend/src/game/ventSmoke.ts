/**
 * A vent at work at the High graphics quality (docs/art-direction.md, "The
 * vents at work"; #1837).
 *
 * At Low a chimney breathes steam as world light: puffs in the vent's own
 * colour, stepped on the 5 Hz grid, on the canvas (ventPlume.ts). At High the
 * world layer is lit, so what a chimney breathes is drawn as what it is:
 * matter in the water, which shows by the light that falls on it. A column
 * stands amber over its mouth, where the vent's own light is; goes to the
 * faint cold of the Lid's glow as it climbs; and takes the navy's glow where
 * an own hull's searchlight crosses it, shadowed by the ground and by a hull
 * as anything in a beam is (searchlights.ts).
 *
 * Drawn over the free-water crater's vent stand alone (environmentLayer.ts
 * `breathe`): every other map keeps Low's steam at High until a Thermal Vein
 * has a frame of this, since look work starts from a frame.
 *
 * One `Points` for every chimney it is handed, in the world pass (highFrame.ts):
 * scene-referred, so the water takes it with distance, the bloom spreads what
 * is bright enough and the grade and the curve reach it. Its buffers are
 * written once a rebuild; a frame costs one uniform write. The light on a
 * puff is summed at its centre, in the vertex shader, so a column in a beam
 * costs its puffs and not its pixels.
 *
 * The limits hold as they hold for the steam. A column stands where the map
 * stands a chimney, and a puff's line, phase and spread are a hash of that
 * placement: nothing a match does moves one (limit 4). It rises straight and
 * widens evenly about its own axis, since a column that leaned would state a
 * current (docs/map-visuals.md §8). Its own light is the vent family's token
 * (limit 3), and the only beams it shows are the player's own (limit 2).
 * It moves smoothly: the 5 Hz grid is the instruments' cadence, which High
 * releases for the world (docs/art-direction.md, "What the world layer may do
 * at High"). Reduced motion holds the clock, so each column stands still.
 *
 * TUNABLE until a frame of this step is accepted: `HIGH_GRAPHICS.VENT` in
 * packages/shared/src/constants.ts.
 */

import {
  BufferGeometry,
  Color,
  CustomBlending,
  Float32BufferAttribute,
  OneFactor,
  Points,
  PointsMaterial,
  ZeroFactor,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { LIT_IRRADIANCE_GLSL } from './litGround.ts';
import { VENT_EMBER } from './palette.ts';
import { SEARCHLIGHT_GLSL, SEARCHLIGHT_UNIFORMS } from './searchlights.ts';
import type { PlumeSite } from './ventPlume.ts';

const SPEC = HIGH_GRAPHICS.VENT;

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

const radiance = (hex: number, level: number): string => {
  const c = new Color(hex).multiplyScalar(level);
  return `vec3( ${glsl(c.r)}, ${glsl(c.g)}, ${glsl(c.b)} )`;
};

/**
 * The clock under reduced motion: the shader holds this one time, so each
 * column stands still with its puffs at their own heights (docs/ui-ux.md §11).
 */
const SMOKE_HOLD_S = 5.3;

/** The anchors the patch needs of three's points program, vertex then fragment. */
export const VENT_SMOKE_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>', 'gl_PointSize = size;'],
  fragment: ['#include <common>', '#include <color_fragment>'],
} as const;

/** The points program as lit matter. Exported for the test that holds the anchors. */
export function patchVentSmoke(shader: { vertexShader: string; fragmentShader: string }): void {
  const [vCommon, vBegin, vSize] = VENT_SMOKE_ANCHORS.vertex;
  const [fCommon, fColor] = VENT_SMOKE_ANCHORS.fragment;
  shader.vertexShader = shader.vertexShader
    .replace(
      vCommon,
      [
        vCommon,
        // xyz: the puff's phase along its life, the height it climbs, and
        // the bearing it widens along. w: its chimney's scale.
        'attribute vec4 aSmoke;',
        'attribute float aSmokeVeil;',
        'uniform float uSmokeTime;',
        'varying vec3 vSmokeLight;',
        'float smokeT;',
        'float smokeRise;',
        LIT_IRRADIANCE_GLSL,
        SEARCHLIGHT_GLSL,
      ].join('\n')
    )
    .replace(
      vBegin,
      [
        vBegin,
        `smokeT = fract( uSmokeTime / ${glsl(SPEC.LIFE_S)} + aSmoke.x );`,
        // Fast out of the mouth and slowing, as a plume that cools does.
        'smokeRise = aSmoke.y * ( 1.0 - ( 1.0 - smokeT ) * ( 1.0 - smokeT ) );',
        'transformed.y += smokeRise;',
        // Wider with height, each puff along its own bearing from the axis:
        // the column opens evenly and leans nowhere.
        `transformed.xz += vec2( cos( aSmoke.z ), sin( aSmoke.z ) ) * ( smokeT * ${glsl(SPEC.SPREAD_M)} * aSmoke.w );`,
      ].join('\n')
    )
    .replace(
      vSize,
      [
        // A width in the world's metres as pixels at this depth: `scale` is
        // half the view's height, `size` the pixel ratio (the material's own
        // size is 1), and the projection's second diagonal the cotangent of
        // half the field of view (lifeGlow.ts has the same line).
        `float smokeM = mix( ${glsl(SPEC.SIZE_M[0])}, ${glsl(SPEC.SIZE_M[1])}, smokeT ) * aSmoke.w;`,
        'gl_PointSize = smokeM * projectionMatrix[ 1 ][ 1 ] * scale * size / max( 1e-3, - mvPosition.z );',
        'vec3 smokeAt = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;',
        // The vent's own light, from the mouth under the puff; the Lid's
        // glow, as a face that looks half up takes it; and each own beam
        // that crosses the puff's centre, less what stands in its way.
        `float smokeOver = smokeRise / ${glsl(SPEC.GLOW_REACH_M)};`,
        `vec3 smokeLit = ${radiance(VENT_EMBER, SPEC.GLOW)} / ( 1.0 + smokeOver * smokeOver );`,
        'smokeLit += echoesLitIrradiance( vec3( 0.0, 0.5, 0.0 ), smokeAt.y );',
        'for ( int i = 0; i < ECHOES_SEARCHLIGHTS; i ++ ) {',
        '  if ( i >= uSearchCount ) break;',
        '  vec3 smokeToLamp;',
        '  vec3 smokeBeam = echoesSearchBeam( i, smokeAt, smokeToLamp );',
        '  if ( smokeBeam.r + smokeBeam.g + smokeBeam.b <= 0.0 ) continue;',
        '  smokeLit += smokeBeam * echoesSearchShadeCoarse( i, smokeAt );',
        '}',
        // Thin at the mouth, where a puff forms, and thinning again as it
        // climbs and spreads; then the veil's drain, as the steam takes it.
        'float smokeLeft = 1.0 - smokeT;',
        `vSmokeLight = smokeLit * ( ${glsl(SPEC.ALBEDO)} * smoothstep( 0.0, 0.06, smokeT ) * smokeLeft * sqrt( smokeLeft ) * aSmokeVeil );`,
      ].join('\n')
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(fCommon, `${fCommon}\nvarying vec3 vSmokeLight;`)
    .replace(
      fColor,
      [
        fColor,
        // A puff is a soft disc, not the square a mapless point rasterises as.
        'float smokeR = length( gl_PointCoord - 0.5 ) * 2.0;',
        'if ( smokeR > 1.0 ) discard;',
        'float smokeFall = 1.0 - smokeR * smokeR;',
        'diffuseColor.rgb = vSmokeLight * smokeFall * smokeFall;',
      ].join('\n')
    );
}

type ShadeFn = (xM: number, yM: number, out: Color) => void;
const TMP_SHADE = new Color();

export class VentSmoke {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly uniforms = { uSmokeTime: { value: 0 } };
  private sites: readonly PlumeSite[] = [];
  private reducedMotion = false;

  constructor() {
    this.material = new PointsMaterial({
      color: 0xffffff,
      // The patch sizes a puff in metres (`patchVentSmoke`): 1 leaves the
      // `size` uniform the pixel ratio alone, and three attenuates nothing.
      size: 1,
      sizeAttenuation: false,
      toneMapped: false,
      // Scattered light adds to light, and leaves alpha alone: in the world
      // pass alpha is what the water left of the surface behind (water.ts).
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
      depthWrite: false,
      // In the fog chunk, for its High half: the water takes the light a puff
      // sends with distance (water.ts `installWaterFog`).
      fog: true,
    });
    const uniforms = this.uniforms;
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, SEARCHLIGHT_UNIFORMS);
      patchVentSmoke(shader);
    };
    this.material.customProgramCacheKey = () => 'vent-smoke-1';
    this.points = new Points(new BufferGeometry(), this.material);
    this.points.name = 'vent_smoke';
    // The world pass's, and never the canvas's (PerspectiveView `enterWorldLayer`).
    this.points.userData.worldLayer = true;
    // One cloud spans the map: per-object culling would hide it whole.
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /**
   * Stand one column on every site, replacing the last build: the sites the
   * steam stands on at Low (ventPlume.ts `plumeSites`). Written once per
   * terrain rebuild; nothing here runs per frame.
   */
  build(sites: readonly PlumeSite[], shade: ShadeFn | null = null): void {
    this.sites = sites;
    const n = sites.length * SPEC.PUFFS;
    const positions = new Float32Array(n * 3);
    const smoke = new Float32Array(n * 4);
    sites.forEach((site, c) => {
      for (let k = 0; k < SPEC.PUFFS; k++) {
        const i = c * SPEC.PUFFS + k;
        // A fixed spot in the mouth, uniform over its disc: where the puff forms.
        const r = SPEC.MOUTH_M * site.scale * Math.sqrt(smokeHash(site, k, 1));
        const a = 2 * Math.PI * smokeHash(site, k, 2);
        positions[i * 3] = site.x + r * Math.cos(a);
        positions[i * 3 + 1] = site.y;
        positions[i * 3 + 2] = site.z + r * Math.sin(a);
        // Evenly spread phases, jittered, so a column is never one puff wide;
        // and it widens along the bearing it formed on, so no two puffs cross.
        smoke[i * 4] = (k + smokeHash(site, k, 3)) / SPEC.PUFFS;
        smoke[i * 4 + 1] = SPEC.RISE_M * site.scale * (0.75 + 0.25 * smokeHash(site, k, 4));
        smoke[i * 4 + 2] = a;
        smoke[i * 4 + 3] = site.scale;
      }
    });
    // A fresh geometry rather than new attributes on the old one: the
    // renderer frees a buffer only when its geometry is disposed.
    this.points.geometry.dispose();
    const geometry = new BufferGeometry();
    this.points.geometry = geometry;
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSmoke', new Float32BufferAttribute(smoke, 4));
    geometry.setAttribute('aSmokeVeil', new Float32BufferAttribute(new Float32Array(n).fill(1), 1));
    this.setShade(shade);
    this.points.visible = n > 0;
  }

  /**
   * Take the acoustic veil's shade (docs/ui-ux.md §4.5), as the steam does: a
   * vent nobody is listening to goes as cold as the ground it stands on. On
   * the veil's cadence, never per frame.
   */
  setShade(shade: ShadeFn | null): void {
    const veils = this.points.geometry.getAttribute('aSmokeVeil') as
      Float32BufferAttribute | undefined;
    if (veils === undefined) return;
    this.sites.forEach((site, c) => {
      let veil = 1;
      if (shade !== null) {
        shade(site.xM, site.yM, TMP_SHADE);
        veil = (TMP_SHADE.r + TMP_SHADE.g + TMP_SHADE.b) / 3;
      }
      for (let k = 0; k < SPEC.PUFFS; k++) veils.setX(c * SPEC.PUFFS + k, veil);
    });
    veils.needsUpdate = true;
  }

  /** Per frame: the clock, smooth, or held under reduced motion. One uniform write. */
  tick(nowMs: number): void {
    this.uniforms.uSmokeTime.value = this.reducedMotion ? SMOKE_HOLD_S : nowMs / 1000;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Columns standing, for the probe and the tests. */
  get plumes(): number {
    return this.sites.length;
  }

  /** The shader's clock as last written, for the tests. */
  get clockS(): number {
    return this.uniforms.uSmokeTime.value;
  }

  /** Stand nothing. */
  clear(): void {
    this.build([]);
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

/** A stable 0–1 from a chimney's placement, a puff and a salt. */
function smokeHash(site: PlumeSite, k: number, salt: number): number {
  let h = Math.imul(Math.round(site.xM * 8) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(Math.round(site.yM * 8) + 0x632be5ab, 0xc2b2ae35);
  h ^= Math.imul(k + 1, 0x27d4eb2d) ^ (salt * 0x1b873593);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}
