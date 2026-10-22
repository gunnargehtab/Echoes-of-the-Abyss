/**
 * The sediment haze over a resource field (#1555, the owner's "effects").
 *
 * A field is loose ground: the ore lies in silt, and silt does not lie still.
 * Each field carries a low cloud of fine motes that lift a few metres and
 * settle again where they rose, so the ground a harvester will dredge reads
 * as unsettled before anyone dredges it. Matter the game never reads, bound
 * by the rules the vent steam and the harvester's plume already keep:
 *
 * - **In place, never sideways.** A mote rises and sinks on its own line.
 *   Lateral motion states a current, and a current is a mechanic
 *   (docs/map-visuals.md §8).
 * - **On the 5 Hz grid.** The shader's clock steps on the 200 ms sonar bucket
 *   (docs/style-neon-noir.md "World light", rule 3), as the steam climbs.
 * - **Deterministic and stateless.** Where a mote rises and when are a hash
 *   of its field's published values and the clock; nothing in the match
 *   moves it, and a field hazes the same full and mined out, so the haze
 *   says nothing the chart's rim does not.
 * - **Silt, not light.** A dim sediment fleck in the silt plume's own colour,
 *   additive so a spent mote adds nothing, and never a faction's or a
 *   family's hue: it is ground in the water, rung 3 on the ladder.
 *
 * One `Points` for every field on the map, written once per ground rebuild;
 * the lift, the fade and the swim are in the vertex shader, so a frame costs
 * two uniform writes (gate 6). The veil's shade rewrites the colour attribute
 * on its own cadence, as it re-colours the props.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from 'three';
import { SIM, type ResourceNodeInfo } from '@echoes/shared';
import { fieldRadiusM } from './environment.ts';
import { SILT_COLOR } from './siltPlume.ts';
import { installDisplayVeil, VEIL_SHADE_ATTRIBUTE } from './veilShading.ts';

/**
 * TUNABLE — a field's haze: motes over one field, how long a mote takes to
 * rise and settle, how high it lifts at most, and the share of the field's
 * radius it rises within. Low and slow: a haze, not a plume.
 */
export const FIELD_HAZE_MOTES = 32;
export const FIELD_HAZE_LIFE_S = 6;
export const FIELD_HAZE_RISE_M = 10;
export const FIELD_HAZE_SPREAD = 0.85;
/**
 * TUNABLE — a mote's peak level against the silt colour, and its size in
 * world units. Far dimmer and smaller than a vent puff (0.3 of the ember on
 * 26 units): sediment catching a lamp, not steam over a fire. The first cut,
 * 0.22 on 9 units, drew bright pearls over the field that read as a stipple
 * (map-visuals §8's public life); a haze is felt before it is counted.
 */
export const FIELD_HAZE_LEVEL = 0.07;
/**
 * SPEC — docs/style-neon-noir.md "World light", "Suspended matter is not
 * light": a haze mote's peak luminance stays under the dimmest family's,
 * `ore-trace` at 0.08. The test holds `FIELD_HAZE_LEVEL` to it.
 */
export const HAZE_LUMINANCE_CAP = 0.08;
const FIELD_HAZE_SIZE = 4;
/** The sonar bucket the clock steps on: SIM.ECHO_HZ's 200 ms. */
const BUCKET_MS = 1000 / SIM.ECHO_HZ;
/**
 * TUNABLE — the clock under reduced motion. The shader holds this one time,
 * so each field keeps its motes at their own heights: the same haze, no
 * movement (docs/ui-ux.md §11), by the same code path.
 */
const HAZE_HOLD_S = 2.3;

/** One field, in the layer's own space: where its haze rises from. */
export interface HazeSite {
  id: number;
  xM: number;
  yM: number;
  radiusM: number;
  /** The drawn ground at a point of the field, so a mote starts on the silt. */
  groundY: (xM: number, yM: number) => number;
}

/**
 * One site per field that stands on the map. A field off the grid hazes
 * nothing, as it stands nothing (environment.ts `scatterFields`).
 */
export function hazeSites(
  fields: readonly ResourceNodeInfo[],
  terrain: { cols: number; rows: number; cellM: number },
  groundY: (xM: number, yM: number) => number
): HazeSite[] {
  const sites: HazeSite[] = [];
  for (const field of fields) {
    const col = Math.floor(field.x / terrain.cellM);
    const row = Math.floor(field.y / terrain.cellM);
    if (col < 0 || col >= terrain.cols || row < 0 || row >= terrain.rows) continue;
    sites.push({ id: field.id, xM: field.x, yM: field.y, radiusM: fieldRadiusM(field), groundY });
  }
  return sites;
}

export class FieldHaze {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly uniforms = {
    uHazeTime: { value: 0 },
    uHazeReach: { value: 4000 },
  };
  private sites: readonly HazeSite[] = [];
  private reducedMotion = false;

  constructor() {
    this.material = new PointsMaterial({
      size: FIELD_HAZE_SIZE,
      sizeAttenuation: true,
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      // Out of the fog chunk, as the steam is: mixing an additive fragment
      // toward the water colour brightens a far field. The swim is priced in
      // the shader instead, on water.ts's `waterTransmittance` curve.
      fog: false,
    });
    const uniforms = this.uniforms;
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uHazeTime = uniforms.uHazeTime;
      shader.uniforms.uHazeReach = uniforms.uHazeReach;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute vec2 aHaze;
uniform float uHazeTime;
uniform float uHazeReach;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
// aHaze.x is the mote's phase along its life, aHaze.y the height it lifts.
// Up and back down the same line: sin(pi t) is zero at both ends, so a mote
// settles where it rose and fades in and out on the arc.
float hazeT = fract( uHazeTime / ${FIELD_HAZE_LIFE_S.toFixed(1)} + aHaze.x );
float hazeArc = sin( 3.14159265 * hazeT );
transformed.y += hazeArc * aHaze.y;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
vec4 hazeWorld = modelMatrix * vec4( transformed, 1.0 );
float hazeSwim = length( hazeWorld.xz - cameraPosition.xz ) / max( 1.0, uHazeReach );
vColor.rgb *= hazeArc * exp( -hazeSwim * hazeSwim );`
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
// A mote is a soft disc, not the square a mapless point rasterises as.
float hazeR = length( gl_PointCoord - 0.5 ) * 2.0;
if ( hazeR > 1.0 ) discard;
diffuseColor.a *= 1.0 - hazeR * hazeR;`
      );
    };
    this.material.customProgramCacheKey = () => 'field-haze';
    installDisplayVeil(this.material);
    this.points = new Points(new BufferGeometry(), this.material);
    this.points.name = 'field_haze';
    // One cloud spans the map: per-object culling would hide it whole.
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.points.visible = false;
  }

  /**
   * Raise one haze over every site, replacing the last build. Written once
   * per ground rebuild; nothing here runs per frame.
   */
  build(sites: readonly HazeSite[], shade: ShadeFn | null = null): void {
    this.sites = sites;
    const n = sites.length * FIELD_HAZE_MOTES;
    const positions = new Float32Array(n * 3);
    const haze = new Float32Array(n * 2);
    sites.forEach((site, c) => {
      for (let k = 0; k < FIELD_HAZE_MOTES; k++) {
        const i = c * FIELD_HAZE_MOTES + k;
        // A fixed spot on the field, uniform over its disc: the mote's line.
        const r = site.radiusM * FIELD_HAZE_SPREAD * Math.sqrt(moteHash(site, k, 1));
        const a = 2 * Math.PI * moteHash(site, k, 2);
        const xM = site.xM + r * Math.cos(a);
        const yM = site.yM + r * Math.sin(a);
        positions[i * 3] = xM;
        positions[i * 3 + 1] = site.groundY(xM, yM);
        positions[i * 3 + 2] = yM;
        // Evenly spread phases, jittered, so a field is never all up at once.
        haze[i * 2] = (k + moteHash(site, k, 3)) / FIELD_HAZE_MOTES;
        haze[i * 2 + 1] = FIELD_HAZE_RISE_M * (0.4 + 0.6 * moteHash(site, k, 4));
      }
    });
    // A fresh geometry rather than new attributes on the old one: the
    // renderer frees a buffer only when its geometry is disposed, so a swapped
    // attribute would strand the last build's on the GPU.
    this.points.geometry.dispose();
    const geometry = new BufferGeometry();
    this.points.geometry = geometry;
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aHaze', new Float32BufferAttribute(haze, 2));
    const color = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      color[i * 3] = SILT_COLOR.r * FIELD_HAZE_LEVEL;
      color[i * 3 + 1] = SILT_COLOR.g * FIELD_HAZE_LEVEL;
      color[i * 3 + 2] = SILT_COLOR.b * FIELD_HAZE_LEVEL;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
    geometry.setAttribute(
      VEIL_SHADE_ATTRIBUTE,
      new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3)
    );
    this.setShade(shade);
    this.points.visible = n > 0;
  }

  /**
   * Take the acoustic veil's shade (docs/ui-ux.md §4.5): a field nobody is
   * listening to goes as cold as the ground it lies on, haze and all. The
   * shade's mean in all three channels, in display terms (veilShading.ts),
   * on the veil's cadence, never per frame.
   */
  setShade(shade: ShadeFn | null): void {
    const veils = this.points.geometry.getAttribute(VEIL_SHADE_ATTRIBUTE) as
      Float32BufferAttribute | undefined;
    if (veils === undefined) return;
    this.sites.forEach((site, c) => {
      let veil = 1;
      if (shade !== null) {
        shade(site.xM, site.yM, TMP_SHADE);
        veil = (TMP_SHADE.r + TMP_SHADE.g + TMP_SHADE.b) / 3;
      }
      for (let k = 0; k < FIELD_HAZE_MOTES; k++) {
        veils.setXYZ(c * FIELD_HAZE_MOTES + k, veil, veil, veil);
      }
    });
    veils.needsUpdate = true;
  }

  /** Per frame: the clock, stepped to the sonar bucket, and the water's reach. */
  tick(nowMs: number, reachM?: number): void {
    this.uniforms.uHazeTime.value = this.reducedMotion
      ? HAZE_HOLD_S
      : (Math.floor(nowMs / BUCKET_MS) * BUCKET_MS) / 1000;
    if (reachM !== undefined) this.uniforms.uHazeReach.value = reachM;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Fields hazing, for the probe and the tests. */
  get fields(): number {
    return this.sites.length;
  }

  /** The shader's clock as last written, for the tests. */
  get clockS(): number {
    return this.uniforms.uHazeTime.value;
  }

  /** Raise nothing. */
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

/** A stable 0–1 from a field, a mote and a salt. */
function moteHash(site: HazeSite, k: number, salt: number): number {
  // The field's radius and position, never its id: an entity number is the
  // match's, not the map's (environment.ts `scatterFields`).
  let h = Math.imul(Math.round(site.radiusM) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(Math.round(site.xM) + 0x632be5ab, 0xc2b2ae35);
  h ^= Math.imul(Math.round(site.yM) ^ 0x1b873593, 0x7feb352d);
  h ^= Math.imul(k + 1, 0x27d4eb2d) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}
