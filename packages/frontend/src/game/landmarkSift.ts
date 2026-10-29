/**
 * Silt sifting from the arch, and the cloud its collapse raises — the arch
 * study's two `Points` (docs/sorrowgate-arch-study.md §8; docs/graphics-standards.md
 * gate 6's study line; docs/habitats-art-brief.md §5 "The arch study's
 * licence"; #1637). Built as the vent steam is (ventPlume.ts): buffers written
 * once per rebuild, the motion in the vertex shader, a clock uniform a frame.
 *
 * - **The sift.** Silt falls from the arch's fractures: the model's `sift_*`
 *   nodes, at most eight on the intact state and four on the ruined. At most
 *   256 motes, and each only sinks, at no more than twice the marine snow's
 *   rate, stepping on the 5 Hz grid as the field haze does. The silt colour
 *   (`silt-drift`), capped at a tenth of it: dust in the dark, never a light.
 *   Reduced motion holds every mote where it is.
 * - **The cloud.** Starts on the received ground change and never on a
 *   reload: at most 384 motes at the ruin's foot, at most 40 m out and 30 m
 *   up, in the silt colour, settled and gone by 14 s. Reduced motion raises
 *   no cloud; the view cuts to the ruin.
 *
 * Neither reads anything the match resolves: the sites are the model's, the
 * clock is the renderer's, and the cloud's trigger is a ground change every
 * client already holds.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';
import { SIM } from '@echoes/shared';
import { SNOW_SINK_WORLD_PER_S } from './water.ts';
import { installDisplayVeil, VEIL_SHADE_ATTRIBUTE } from './veilShading.ts';

/** SPEC (§8) — the caps. */
export const SIFT_MOTE_CAP = 256;
export const SIFT_SITE_CAP: Record<'intact' | 'ruined', number> = { intact: 8, ruined: 4 };
export const CLOUD_MOTE_CAP = 384;
export const CLOUD_OUT_M = 40;
export const CLOUD_UP_M = 30;
export const CLOUD_SECONDS = 14;
/** TUNABLE — the sift's share of the snow's rate, under §8's SPEC bound of twice it. */
export const SIFT_SINK_RATIO = 1.5;
/** SPEC — the silt colour (`silt-drift`, style-neon-noir.md "The props"), and the cap on it. */
export const SILT_DRIFT = 0x211e15;
export const SILT_LEVEL_CAP = 0.1;
/** TUNABLE — how far a mote falls before it is recycled at its site, metres. */
const SIFT_DROP_M: readonly [number, number] = [18, 45];
/** TUNABLE — a mote's size in world units before perspective: dust, under the snow's. */
const SIFT_SIZE = 5;
const CLOUD_SIZE = 9;
const BUCKET_MS = 1000 / SIM.ECHO_HZ;
/** TUNABLE — the clock under reduced motion: the sift held at this one time. */
const SIFT_HOLD_S = 2.3;

const SILT = new Color(SILT_DRIFT);

/** A site silt falls from, world units, and its cell for the veil. */
export interface SiftSite {
  x: number;
  y: number;
  z: number;
  xM: number;
  yM: number;
}

/** The sift's sink, world units a second. */
export const SIFT_SINK_WORLD_PER_S = SNOW_SINK_WORLD_PER_S * SIFT_SINK_RATIO;

function makeMaterial(
  size: number,
  uniforms: Record<string, { value: unknown }>,
  patch: (shader: {
    uniforms: Record<string, unknown>;
    vertexShader: string;
    fragmentShader: string;
  }) => void,
  key: string
): PointsMaterial {
  const material = new PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    toneMapped: false,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  material.onBeforeCompile = (shader) => {
    for (const [name, uniform] of Object.entries(uniforms)) shader.uniforms[name] = uniform;
    patch(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
float moteR = length( gl_PointCoord - 0.5 ) * 2.0;
if ( moteR > 1.0 ) discard;
diffuseColor.a *= 1.0 - moteR * moteR;`
    );
  };
  material.customProgramCacheKey = () => key;
  installDisplayVeil(material);
  return material;
}

function freshGeometry(points: Points, n: number, positions: Float32Array): BufferGeometry {
  points.geometry.dispose();
  const geometry = new BufferGeometry();
  points.geometry = geometry;
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const color = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    color[i * 3] = SILT.r * SILT_LEVEL_CAP;
    color[i * 3 + 1] = SILT.g * SILT_LEVEL_CAP;
    color[i * 3 + 2] = SILT.b * SILT_LEVEL_CAP;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
  geometry.setAttribute(
    VEIL_SHADE_ATTRIBUTE,
    new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3)
  );
  return geometry;
}

export class LandmarkSift {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly uniforms = { uSiftTime: { value: 0 } };
  private sites: readonly SiftSite[] = [];
  private perSite = 0;
  private reducedMotion = false;

  constructor() {
    this.material = makeMaterial(
      SIFT_SIZE,
      this.uniforms,
      (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
attribute vec2 aSift;
uniform float uSiftTime;
varying float vSiftFade;`
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
// aSift.x is the mote's phase along its fall, aSift.y how far it falls: it
// only ever sinks, from its site to its drop, then starts again at the site.
float siftT = fract( uSiftTime * ${SIFT_SINK_WORLD_PER_S.toFixed(4)} / aSift.y + aSift.x );
transformed.y -= siftT * aSift.y;
vSiftFade = smoothstep( 0.0, 0.08, siftT ) * ( 1.0 - siftT );`
          )
          .replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvColor.rgb *= vSiftFade;'
          );
      },
      'arch-sift-1'
    );
    this.points = new Points(new BufferGeometry(), this.material);
    this.points.name = 'arch_sift';
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.points.visible = false;
  }

  /**
   * Stand the motes on their sites, replacing the last build: the cap's share
   * per site, each with its own phase and drop, as the model's sites are.
   */
  build(sites: readonly SiftSite[], shade: ShadeFn | null = null): void {
    this.sites = sites;
    this.perSite = sites.length === 0 ? 0 : Math.floor(SIFT_MOTE_CAP / sites.length);
    const n = sites.length * this.perSite;
    const positions = new Float32Array(n * 3);
    const sift = new Float32Array(n * 2);
    sites.forEach((site, c) => {
      for (let k = 0; k < this.perSite; k++) {
        const i = c * this.perSite + k;
        // Within a metre or two of the fracture, so the fall reads as from it.
        const r = 1.5 * Math.sqrt(siteHash(site, k, 1));
        const a = 2 * Math.PI * siteHash(site, k, 2);
        positions[i * 3] = site.x + r * Math.cos(a);
        positions[i * 3 + 1] = site.y;
        positions[i * 3 + 2] = site.z + r * Math.sin(a);
        sift[i * 2] = (k + siteHash(site, k, 3)) / this.perSite;
        const [lo, hi] = SIFT_DROP_M;
        sift[i * 2 + 1] = lo + (hi - lo) * siteHash(site, k, 4);
      }
    });
    const geometry = freshGeometry(this.points, n, positions);
    geometry.setAttribute('aSift', new Float32BufferAttribute(sift, 2));
    this.setShade(shade);
    this.points.visible = n > 0;
  }

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
      for (let k = 0; k < this.perSite; k++) veils.setXYZ(c * this.perSite + k, veil, veil, veil);
    });
    veils.needsUpdate = true;
  }

  /** Per frame: the clock on the sonar bucket; held under reduced motion. */
  tick(nowMs: number): void {
    this.uniforms.uSiftTime.value = this.reducedMotion
      ? SIFT_HOLD_S
      : (Math.floor(nowMs / BUCKET_MS) * BUCKET_MS) / 1000;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Motes standing, for the probe (gate 6). */
  get motes(): number {
    return this.sites.length * this.perSite;
  }

  get clockS(): number {
    return this.uniforms.uSiftTime.value;
  }

  clear(): void {
    this.build([]);
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * The collapse's cloud: motes at the ruin's foot, thrown out and up along
 * the face and settling back by `CLOUD_SECONDS`, on one clock from the
 * received change. Alive only then: `build` on the change, `clear` when the
 * layer's tick passes 14 s.
 */
export class CollapseCloud {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly uniforms = { uCloudT: { value: 1 } };
  private count = 0;
  private startedMs: number | null = null;

  constructor() {
    this.material = makeMaterial(
      CLOUD_SIZE,
      this.uniforms,
      (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
attribute vec4 aCloud;
uniform float uCloudT;
varying float vCloudFade;`
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
// aCloud: the mote's reach out (x), its rise (y), its bearing (z) and its
// own lag (w). It is thrown out and up in the first part of the sequence and
// settles to the floor by the end, fading as it settles.
float cloudU = clamp( ( uCloudT - aCloud.w ) / ( 1.0 - aCloud.w ), 0.0, 1.0 );
float cloudOut = aCloud.x * smoothstep( 0.0, 0.45, cloudU );
float cloudUp = aCloud.y * sin( 3.1415926 * cloudU );
transformed.x += cos( aCloud.z ) * cloudOut;
transformed.z += sin( aCloud.z ) * cloudOut;
transformed.y += cloudUp;
vCloudFade = ( 1.0 - cloudU ) * smoothstep( 0.0, 0.1, cloudU );`
          )
          .replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvColor.rgb *= vCloudFade;'
          );
      },
      'arch-cloud-1'
    );
    this.points = new Points(new BufferGeometry(), this.material);
    this.points.name = 'arch_collapse_cloud';
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.points.visible = false;
  }

  /**
   * Raise the cloud along the ruin's foot: `foot` is the line where the
   * wall's face meets the floor, world units, from west to east, and `south`
   * the way out from the face. Started on the first tick after.
   */
  build(foot: readonly [Vector3, Vector3], south: Vector3, motes = CLOUD_MOTE_CAP): void {
    const n = Math.min(CLOUD_MOTE_CAP, motes);
    const positions = new Float32Array(n * 3);
    const cloud = new Float32Array(n * 4);
    const [a, b] = foot;
    const bearing = Math.atan2(south.z, south.x);
    for (let i = 0; i < n; i++) {
      const u = cloudHash(i, 1);
      positions[i * 3] = a.x + (b.x - a.x) * u;
      // On the foot itself: the rise alone takes a mote up, so the cloud's
      // top is the rise's 30 m and nothing more (§8).
      positions[i * 3 + 1] = a.y + (b.y - a.y) * u;
      positions[i * 3 + 2] = a.z + (b.z - a.z) * u;
      // Out along the way from the face, within ±50° of it, never past 40 m.
      cloud[i * 4] = CLOUD_OUT_M * (0.3 + 0.7 * cloudHash(i, 3));
      cloud[i * 4 + 1] = CLOUD_UP_M * (0.2 + 0.8 * cloudHash(i, 4));
      cloud[i * 4 + 2] = bearing + (cloudHash(i, 5) - 0.5) * 1.75;
      cloud[i * 4 + 3] = 0.3 * cloudHash(i, 6);
    }
    const geometry = freshGeometry(this.points, n, positions);
    geometry.setAttribute('aCloud', new Float32BufferAttribute(cloud, 4));
    this.count = n;
    this.startedMs = null;
    this.uniforms.uCloudT.value = 0;
    this.points.visible = n > 0;
  }

  /** Per frame, on the bucket: progress from the first tick; true once settled and cleared. */
  tick(nowMs: number): boolean {
    if (this.count === 0) return false;
    const stepped = Math.floor(nowMs / BUCKET_MS) * BUCKET_MS;
    if (this.startedMs === null) this.startedMs = stepped;
    const t = (stepped - this.startedMs) / 1000 / CLOUD_SECONDS;
    if (t >= 1) {
      this.clear();
      return true;
    }
    this.uniforms.uCloudT.value = t;
    return false;
  }

  get motes(): number {
    return this.count;
  }

  get progress(): number {
    return this.uniforms.uCloudT.value;
  }

  clear(): void {
    freshGeometry(this.points, 0, new Float32Array(0)).setAttribute(
      'aCloud',
      new Float32BufferAttribute(new Float32Array(0), 4)
    );
    this.count = 0;
    this.startedMs = null;
    this.points.visible = false;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

type ShadeFn = (xM: number, yM: number, out: Color) => void;
const TMP_SHADE = new Color();

function siteHash(site: SiftSite, k: number, salt: number): number {
  let h = Math.imul(Math.round(site.x * 8) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(Math.round(site.z * 8) + 0x632be5ab, 0xc2b2ae35);
  h ^= Math.imul(Math.round(site.y * 8) + 0x1b873593, 0x2c1b3c6d);
  h ^= Math.imul(k + 1, 0x27d4eb2d) ^ Math.imul(salt + 1, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000;
}

function cloudHash(i: number, salt: number): number {
  let h = Math.imul((i + 1) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000;
}
