/**
 * Steam rising from the vent chimneys (#1514, from #1467's "vent smoke").
 *
 * docs/environments.md §1 gives Thermal Veins "steam plumes and micro-eruption
 * particles", and the chimney prop stood there with none. Each standing
 * chimney now breathes a column of puffs from its mouth, fading as they climb.
 *
 * World light, not matter the game reads: lit by the vent family
 * (docs/style-neon-noir.md "World light") and bound by its five rules.
 *
 * - **Points, never area glow.** Small soft puffs, each dimmer than an ember at
 *   its brightest (rule 2: the ember is the ceiling).
 * - **On the 5 Hz grid.** The shader's clock is stepped to the 200 ms sonar
 *   bucket (rule 3), so a puff climbs in steps, as the embers flicker in them.
 * - **Deterministic, stateless.** Where a puff stands and when it rises are a
 *   hash of its chimney's placement and the clock; nothing in the match moves
 *   it (rule 4). The chimneys are the map's, so the plume leaks nothing.
 * - **Straight up.** Each puff keeps its own vertical line from mouth to fade:
 *   lateral motion states a current, and a current is a mechanic
 *   (docs/map-visuals.md §8).
 *
 * One `Points` for every chimney on the map, its buffers written once per
 * rebuild. The climb, the fade and the swim are in the vertex shader, so a
 * frame costs two uniform writes and no buffer is touched (gate 6). The veil's
 * shade, which moves with the fleet rather than the frame, rewrites the colour
 * attribute when it changes, as it re-colours the props themselves.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from 'three';
import { SIM } from '@echoes/shared';
import { propSpec, type PropPlacement } from './environment.ts';
import { VENT_EMBER } from './palette.ts';

/**
 * TUNABLE — a plume's shape, before the chimney's own scale: puffs alive at
 * once, how long one takes from mouth to gone, how high it climbs, and the
 * radius about the mouth it rises from. Steam climbs well clear of the stack
 * so the column reads at the survey dolly, but stays a column, not a cloud.
 */
export const VENT_PLUME_PUFFS = 14;
export const VENT_PLUME_LIFE_S = 7;
export const VENT_PLUME_RISE_M = 120;
export const VENT_PLUME_MOUTH_M = 3;
/**
 * TUNABLE — a puff's peak level against the vent-ember colour, and its size in
 * the embers' own world units. The ember peaks at 0.55 on a 55-unit sprite
 * (PerspectiveView's 5 Hz flicker), so a puff is dimmer and smaller: rule 2.
 */
export const VENT_PLUME_LEVEL = 0.3;
const VENT_PLUME_SIZE = 26;
/** The sonar bucket the clock steps on: SIM.ECHO_HZ's 200 ms, as the embers. */
const BUCKET_MS = 1000 / SIM.ECHO_HZ;
/**
 * TUNABLE — the clock under reduced motion. The shader holds this one time, so
 * each column stands still with its puffs at their own heights: the same
 * plume, no movement (docs/ui-ux.md §11), drawn by the same code path.
 */
const PLUME_HOLD_S = 3.1;

const EMBER = new Color(VENT_EMBER);

/** One chimney's mouth, in the layer's own space: where its steam leaves. */
export interface PlumeSite {
  x: number;
  /** Height of the mouth: the ground under the chimney plus its height. */
  y: number;
  z: number;
  /** The chimney's own scale: a taller stack breathes a taller column. */
  scale: number;
  /** Its placement's cell, the veil's lookup key. */
  xM: number;
  yM: number;
}

/**
 * One site for every placement whose prop breathes steam (`PropSpec.plume`),
 * and none for anything else on the vent floor. `mouthY` is where the stack
 * that placement stands tops out, or null when it stands nothing — a model
 * still loading, or one that failed — so a column never hangs over bare silt.
 */
export function plumeSites(
  placements: readonly PropPlacement[],
  mouthY: (placement: PropPlacement) => number | null
): PlumeSite[] {
  const sites: PlumeSite[] = [];
  for (const placement of placements) {
    if (propSpec(placement.slug)?.plume !== true) continue;
    const y = mouthY(placement);
    if (y === null) continue;
    sites.push({
      x: placement.xM,
      y,
      z: placement.yM,
      scale: placement.scale,
      xM: placement.xM,
      yM: placement.yM,
    });
  }
  return sites;
}

export class VentPlume {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly uniforms = {
    uPlumeTime: { value: 0 },
    uPlumeReach: { value: 4000 },
  };
  private sites: readonly PlumeSite[] = [];
  private reducedMotion = false;

  constructor() {
    this.material = new PointsMaterial({
      size: VENT_PLUME_SIZE,
      sizeAttenuation: true,
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      // Out of the fog chunk, as the embers are: mixing an additive fragment
      // toward the water colour brightens a far vent. The swim is priced in
      // the shader instead, on water.ts's `waterTransmittance` curve.
      fog: false,
    });
    const uniforms = this.uniforms;
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uPlumeTime = uniforms.uPlumeTime;
      shader.uniforms.uPlumeReach = uniforms.uPlumeReach;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute vec2 aPlume;
uniform float uPlumeTime;
uniform float uPlumeReach;
varying float vPlumeFade;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
// aPlume.x is the puff's phase along its life, aPlume.y the height it climbs.
float plumeT = fract( uPlumeTime / ${VENT_PLUME_LIFE_S.toFixed(1)} + aPlume.x );
transformed.y += plumeT * aPlume.y;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
// Swells in at the mouth, thins as it climbs; then the water between the eye
// and the puff, as waterTransmittance prices the embers.
vec4 plumeWorld = modelMatrix * vec4( transformed, 1.0 );
float plumeSwim = length( plumeWorld.xz - cameraPosition.xz ) / max( 1.0, uPlumeReach );
float plumeLeft = 1.0 - plumeT;
vColor.rgb *= smoothstep( 0.0, 0.12, plumeT ) * plumeLeft * plumeLeft * exp( -plumeSwim * plumeSwim );`
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
// A puff is a soft disc, not the square a mapless point rasterises as.
float plumeR = length( gl_PointCoord - 0.5 ) * 2.0;
if ( plumeR > 1.0 ) discard;
diffuseColor.a *= 1.0 - plumeR * plumeR;`
      );
    };
    this.material.customProgramCacheKey = () => 'vent-plume';
    this.points = new Points(new BufferGeometry(), this.material);
    this.points.name = 'vent_plumes';
    // One cloud spans the map: per-object culling would hide it whole.
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.points.visible = false;
  }

  /**
   * Stand one column on every site, replacing the last build. Written once
   * per terrain rebuild; nothing here runs per frame.
   */
  build(sites: readonly PlumeSite[], shade: ShadeFn | null = null): void {
    this.sites = sites;
    const n = sites.length * VENT_PLUME_PUFFS;
    const positions = new Float32Array(n * 3);
    const plume = new Float32Array(n * 2);
    sites.forEach((site, c) => {
      for (let k = 0; k < VENT_PLUME_PUFFS; k++) {
        const i = c * VENT_PLUME_PUFFS + k;
        // A fixed spot in the mouth, uniform over its disc: the puff's line.
        const r = VENT_PLUME_MOUTH_M * site.scale * Math.sqrt(puffHash(site, k, 1));
        const a = 2 * Math.PI * puffHash(site, k, 2);
        positions[i * 3] = site.x + r * Math.cos(a);
        positions[i * 3 + 1] = site.y;
        positions[i * 3 + 2] = site.z + r * Math.sin(a);
        // Evenly spread phases, jittered, so a column is never one puff wide.
        plume[i * 2] = (k + puffHash(site, k, 3)) / VENT_PLUME_PUFFS;
        plume[i * 2 + 1] = VENT_PLUME_RISE_M * site.scale * (0.7 + 0.3 * puffHash(site, k, 4));
      }
    });
    // A fresh geometry rather than new attributes on the old one: the
    // renderer frees a buffer only when its geometry is disposed, so a swapped
    // attribute would strand the last build's on the GPU.
    this.points.geometry.dispose();
    const geometry = new BufferGeometry();
    this.points.geometry = geometry;
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aPlume', new Float32BufferAttribute(plume, 2));
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3), 3));
    this.setShade(shade);
    this.points.visible = n > 0;
  }

  /**
   * Take the acoustic veil's shade (docs/ui-ux.md §4.5): a vent nobody is
   * listening to goes as cold as the ground it stands on, plume and all.
   * On the veil's cadence, never per frame.
   */
  setShade(shade: ShadeFn | null): void {
    const colors = this.points.geometry.getAttribute('color') as Float32BufferAttribute | undefined;
    if (colors === undefined) return;
    this.sites.forEach((site, c) => {
      let veil = 1;
      if (shade !== null) {
        shade(site.xM, site.yM, TMP_SHADE);
        veil = (TMP_SHADE.r + TMP_SHADE.g + TMP_SHADE.b) / 3;
      }
      const level = VENT_PLUME_LEVEL * veil;
      for (let k = 0; k < VENT_PLUME_PUFFS; k++) {
        colors.setXYZ(c * VENT_PLUME_PUFFS + k, EMBER.r * level, EMBER.g * level, EMBER.b * level);
      }
    });
    colors.needsUpdate = true;
  }

  /**
   * Per frame: the clock, stepped to the sonar bucket, and how far the water
   * reaches. Two uniform writes, and nothing else.
   */
  tick(nowMs: number, reachM?: number): void {
    this.uniforms.uPlumeTime.value = this.reducedMotion
      ? PLUME_HOLD_S
      : (Math.floor(nowMs / BUCKET_MS) * BUCKET_MS) / 1000;
    if (reachM !== undefined) this.uniforms.uPlumeReach.value = reachM;
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
    return this.uniforms.uPlumeTime.value;
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

type ShadeFn = (xM: number, yM: number, out: Color) => void;
const TMP_SHADE = new Color();

/** A stable 0–1 from a chimney's placement, a puff and a salt. */
function puffHash(site: PlumeSite, k: number, salt: number): number {
  let h = Math.imul(Math.round(site.xM * 8) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(Math.round(site.yM * 8) + 0x632be5ab, 0xc2b2ae35);
  h ^= Math.imul(k + 1, 0x27d4eb2d) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}
