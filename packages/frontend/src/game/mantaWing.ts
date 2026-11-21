/**
 * The manta at the High graphics quality (docs/art-direction.md, "A manta
 * shows its belly"; #1867): what its template has that a fish's has not.
 *
 * The owner's target is a manta seen from below
 * (docs/screenshots/issue-1867/target-manta.jpg): a smooth pale belly with
 * its gill slits and blotches, on wings that are plainly a living thing's.
 * `env-rim-manta` is a body in the world's light as every swimmer is
 * (lifeLight.ts), with two things more:
 *
 * - **Its skin is smooth.** The file is flat-shaded, as the kit writes every
 *   prop, and a body 18 m across passing 95 m from the eye shows each facet
 *   as a plate. `smoothSkin` gives every vertex one normal across the parts
 *   that meet at it, belly and back together, and leaves an edge sharper
 *   than `CREASE_DEG` alone, so the wing's thin trailing edge stays an edge.
 * - **Its wings stroke.** A wave runs out along each wing from the body to
 *   the tip, in the vertex program, about the file's still pose: the centre
 *   body, with the head, the gills and the tail's root, does not move.
 *   `mantaLift` is written twice, here and in the program, from the same
 *   constants. It runs on the shared match time and for nothing a match does
 *   (limit 4), and reduced motion holds the file's pose.
 *
 * Nothing here emits and nothing is a mark. Low never builds this template:
 * the manta is not stood there (docs/free-water-slice.md §5).
 *
 * TUNABLE until a frame of it is accepted: `HIGH_GRAPHICS.LIFE.MANTA` in
 * packages/shared/src/constants.ts.
 */
import type { BufferGeometry, MeshStandardMaterial } from 'three';
import { Float32BufferAttribute, Vector3 } from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';

const { STROKE, CREASE_DEG } = HIGH_GRAPHICS.LIFE.MANTA;

/** What a manta's program reads of the stroke; one object a template, driven by the layer. */
export interface MantaUniforms {
  /** Seconds on the match's clock. */
  uMantaTime: { value: number };
  /** 1 while the wings stroke; 0 under reduced motion. */
  uMantaMoves: { value: number };
  /** Half the span, metres: where a wing's tip stands from the centreline. */
  uMantaHalfSpan: { value: number };
}

export function mantaUniforms(halfSpanM: number): MantaUniforms {
  return {
    uMantaTime: { value: 0 },
    uMantaMoves: { value: 1 },
    uMantaHalfSpan: { value: halfSpanM },
  };
}

/** How far out along a wing a point `zM` from the centreline is, 0 at the body's edge to 1 at the tip. */
const along = (zM: number, halfSpanM: number): number =>
  Math.min(1, Math.max(0, (Math.abs(zM) - STROKE.ROOT_M) / (halfSpanM - STROKE.ROOT_M)));

/**
 * How far the stroke lifts a point `zM` from the centreline over the file's
 * pose, metres: a wave from the body out to the tip, the tip `LAG` radians
 * behind the root, growing as `POWER` of the way out.
 */
export function mantaLift(zM: number, halfSpanM: number, timeS: number, moves: boolean): number {
  if (!moves) return 0;
  const s = along(zM, halfSpanM);
  return (
    STROKE.LIFT_M *
    s ** STROKE.POWER *
    Math.sin((2 * Math.PI * timeS) / STROKE.PERIOD_S - STROKE.LAG * s)
  );
}

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** The anchors the patch needs of three's standard vertex program. */
export const MANTA_WING_ANCHORS = [
  '#include <common>',
  '#include <beginnormal_vertex>',
  '#include <begin_vertex>',
] as const;

// x: the lift at `z`, metres. y: its slope along z, for the normal.
const HEAD = `
uniform float uMantaTime;
uniform float uMantaMoves;
uniform float uMantaHalfSpan;
vec2 echoesMantaStroke( float z ) {
  float reach = max( 1e-3, uMantaHalfSpan - ${glsl(STROKE.ROOT_M)} );
  float s = clamp( ( abs( z ) - ${glsl(STROKE.ROOT_M)} ) / reach, 0.0, 1.0 );
  float at = 6.2831853 * uMantaTime / ${glsl(STROKE.PERIOD_S)} - ${glsl(STROKE.LAG)} * s;
  float grown = pow( s, ${glsl(STROKE.POWER)} );
  float lift = ${glsl(STROKE.LIFT_M)} * grown * sin( at );
  // d/ds of the same, then ds/dz: zero on the body and past the tip.
  float slope = s <= 0.0 || s >= 1.0 ? 0.0 : ${glsl(STROKE.LIFT_M)} * (
    ${glsl(STROKE.POWER)} * pow( s, ${glsl(STROKE.POWER - 1)} ) * sin( at ) - ${glsl(STROKE.LAG)} * grown * cos( at )
  ) * sign( z ) / reach;
  return uMantaMoves * vec2( lift, slope );
}`;

// A lift that is a function of z shears the skin, and a sheared skin's
// normal leans against the slope by what it had of y.
const NORMAL = `
objectNormal.z -= echoesMantaStroke( position.z ).y * objectNormal.y;`;

const LIFT = `
transformed.y += echoesMantaStroke( position.z ).x;`;

/** The program with the stroke read into it. Exported for the test that holds the anchors. */
export function patchMantaWing(shader: { vertexShader: string }): void {
  const [common, normal, begin] = MANTA_WING_ANCHORS;
  shader.vertexShader = shader.vertexShader
    .replace(common, `${common}${HEAD}`)
    .replace(normal, `${normal}${NORMAL}`)
    .replace(begin, `${begin}${LIFT}`);
}

const MANTA_WING_KEY = ':manta-wing-1';

/**
 * Stroke one material of a manta's. Install it after `installLifeLight`: it
 * chains the hook already there and writes its lift straight after the
 * anchor, so the world's light reads the place the wing was lifted to.
 */
export function installMantaWing(material: MeshStandardMaterial, uniforms: MantaUniforms): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    patchMantaWing(shader);
  };
  material.customProgramCacheKey = () => `${key}${MANTA_WING_KEY}`;
  material.needsUpdate = true;
}

/** Whether `installMantaWing` patched this material, as the key says. */
export function strokesMantaWing(material: MeshStandardMaterial): boolean {
  return material.customProgramCacheKey().includes(MANTA_WING_KEY);
}

const A = new Vector3();
const B = new Vector3();
const C = new Vector3();

/**
 * One normal a vertex across `parts`, written into each part's `normal`:
 * every face that meets a corner within `CREASE_DEG` of the face the corner
 * belongs to lends its normal, weighted by its area. The parts are the
 * template's, flat and unindexed as `mergeByMaterial` leaves a kit file, and
 * a corner is the same corner where it stands within a tenth of a
 * millimetre, in whichever part: the belly and the back are two materials
 * and one skin.
 */
export function smoothSkin(parts: readonly BufferGeometry[]): void {
  const cosCrease = Math.cos((CREASE_DEG * Math.PI) / 180);
  // Every face at a corner, by the corner's place: nx, ny, nz scaled by area.
  const faces = new Map<string, number[]>();
  const key = (x: number, y: number, z: number) =>
    `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  const flat = parts.map((part) => (part.index === null ? part : part.toNonIndexed()));
  for (const part of flat) {
    const at = part.getAttribute('position');
    for (let i = 0; i + 2 < at.count; i += 3) {
      A.fromBufferAttribute(at, i);
      B.fromBufferAttribute(at, i + 1);
      C.fromBufferAttribute(at, i + 2);
      // Twice the face's area along its normal.
      const n = B.clone().sub(A).cross(C.clone().sub(A));
      for (const corner of [A, B, C]) {
        const k = key(corner.x, corner.y, corner.z);
        const list = faces.get(k);
        if (list === undefined) faces.set(k, [n.x, n.y, n.z]);
        else list.push(n.x, n.y, n.z);
      }
    }
  }
  flat.forEach((part, index) => {
    const at = part.getAttribute('position');
    const normals = new Float32Array(at.count * 3);
    for (let i = 0; i + 2 < at.count; i += 3) {
      A.fromBufferAttribute(at, i);
      B.fromBufferAttribute(at, i + 1);
      C.fromBufferAttribute(at, i + 2);
      const own = B.clone().sub(A).cross(C.clone().sub(A));
      const ownLength = own.length();
      [A, B, C].forEach((corner, c) => {
        const list = faces.get(key(corner.x, corner.y, corner.z))!;
        let x = 0;
        let y = 0;
        let z = 0;
        for (let f = 0; f < list.length; f += 3) {
          const length = Math.hypot(list[f]!, list[f + 1]!, list[f + 2]!);
          const cos =
            (list[f]! * own.x + list[f + 1]! * own.y + list[f + 2]! * own.z) /
            Math.max(1e-12, length * ownLength);
          if (cos < cosCrease) continue;
          x += list[f]!;
          y += list[f + 1]!;
          z += list[f + 2]!;
        }
        const length = Math.hypot(x, y, z) || 1;
        normals.set([x / length, y / length, z / length], (i + c) * 3);
      });
    }
    const target = parts[index]!;
    if (target.index !== null) {
      // An indexed part is drawn flat-expanded from here on.
      target.setIndex(null);
      for (const name of Object.keys(part.attributes)) {
        target.setAttribute(name, part.getAttribute(name));
      }
    }
    target.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  });
}
