/**
 * The arch study's per-material mask — docs/sorrowgate-arch-study.md §11,
 * "Acceptance at the opening" (#1683). Development-only, read by the §9
 * capture (docs/screenshots/issue-1674/capture.mjs) and by nothing else.
 *
 * §11 reads a material's pixels outside the pools: `structure_rib` against
 * `stone_dark` at C, and every arch window against the escorts' laminate at
 * H. Which pixel a material drew is not in the frame, so the mask is a second
 * render of the same frame from the same camera into a render target of its
 * own, every opaque mesh drawn once with a flat code in place of its material
 * and read back: red the material's code, green 255 where a landmark
 * fragment lies inside a lit lamp's pool. Everything else opaque draws code 0
 * and keeps its depth, so an escort in front of the span hides it in the mask
 * as it does in the frame. Transparent materials, points, lines and sprites —
 * the water, the veil's motes, the sift, the chart — are hidden for it: they
 * lie over a pixel, and the pixel still belongs to the surface under them.
 *
 * It changes nothing in the scene. Each mesh's material is swapped and
 * restored inside the call, the render target is the mask's, and the
 * renderer's target, clear colour, background and frame counts are put back,
 * so the next frame draws and counts as if the mask had never been read. Two
 * things it draws differently, both under a pixel at H: the hung fittings at
 * rest rather than mid-sway (1.5 m at most, H's 0.57 px a metre), and no
 * debris in flight, which the stations never read.
 */
import {
  Color,
  InstancedMesh,
  Material,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  Object3D,
  RGBAFormat,
  UnsignedByteType,
  type Side,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { LAMP_COUNT, POOL_RADIUS_M, type LandmarkUniforms } from './landmarkLight.ts';

/** The codes the mask's red channel carries. Zero is any other opaque surface, or none. */
export const MASK_CODE = {
  stone_dark: 1,
  structure_rib: 2,
  silt_drift: 3,
  civic_lamp: 4,
  /** An own hull's laminate: any of its materials that is not a lamp. */
  laminate: 5,
  /** An own hull's lamp glass. */
  hullLamp: 6,
} as const;

/** One landmark part standing: its mesh, its material's name and its pools' uniforms. */
export interface MaskLandmarkPart {
  mesh: InstancedMesh;
  material: string;
  uniforms: LandmarkUniforms | null;
}

export interface MaskSources {
  landmarkParts: readonly MaskLandmarkPart[];
  /** The own hulls' group (rosterBatches.ts): what the laminate codes are read from. */
  hulls: Object3D;
}

/** The mask, as RGBA rows bottom-up, the order `readPixels` gives the frame's. */
export interface MaskPixels {
  width: number;
  height: number;
  pixels: Uint8Array;
}

/**
 * Draw the mask at the renderer's drawing-buffer size and read it back.
 * `target` is the caller's to keep between reads; it is resized here.
 */
export function readMaterialMask(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  sources: MaskSources,
  target: WebGLRenderTarget
): MaskPixels {
  const size = renderer.getDrawingBufferSize(new Vector2());
  const width = Math.max(1, Math.floor(size.x));
  const height = Math.max(1, Math.floor(size.y));
  target.setSize(width, height);

  const codes = new Map<Object3D, number>();
  const pools = new Map<Object3D, LandmarkUniforms | null>();
  for (const part of sources.landmarkParts) {
    codes.set(part.mesh, MASK_CODE[part.material as keyof typeof MASK_CODE] ?? 0);
    pools.set(part.mesh, part.uniforms);
  }
  sources.hulls.traverse((child) => {
    if (!(child instanceof Mesh) || Array.isArray(child.material)) return;
    codes.set(child, isLamp(child.material) ? MASK_CODE.hullLamp : MASK_CODE.laminate);
  });

  const swapped: { mesh: Mesh; material: Material | Material[] }[] = [];
  const hidden: Object3D[] = [];
  scene.traverseVisible((child) => {
    const drawable = child as Partial<Mesh> & Object3D;
    if (drawable.material === undefined) return;
    const materials = Array.isArray(drawable.material) ? drawable.material : [drawable.material];
    const solid = child instanceof Mesh && materials.every((m) => !m.transparent && m.visible);
    if (!solid) {
      hidden.push(child);
      return;
    }
    swapped.push({ mesh: child, material: child.material });
    // Each mask material faces as the one it stands in for, so a double-sided
    // surface still hides what lies behind its back faces.
    const side = materials[0]!.side;
    const code = codes.get(child) ?? 0;
    const uniforms = pools.get(child) ?? null;
    child.material = uniforms === null ? flat(code, side) : landmarkMask(code, side, uniforms);
  });
  for (const child of hidden) child.visible = false;

  const background = scene.background;
  const overrideMaterial = scene.overrideMaterial;
  const clear = renderer.getClearColor(new Color());
  const clearAlpha = renderer.getClearAlpha();
  const previous = renderer.getRenderTarget();
  const autoClear = renderer.autoClear;
  const { render } = renderer.info;
  const counts = { ...render };
  try {
    scene.background = null;
    scene.overrideMaterial = null;
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = true;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    return { width, height, pixels };
  } finally {
    renderer.setRenderTarget(previous);
    renderer.autoClear = autoClear;
    renderer.setClearColor(clear, clearAlpha);
    scene.background = background;
    scene.overrideMaterial = overrideMaterial;
    for (const { mesh, material } of swapped) mesh.material = material;
    for (const child of hidden) child.visible = true;
    Object.assign(render, counts);
  }
}

/** The render target the mask draws into: eight bits a channel, no colour space, no MSAA. */
export function maskTarget(): WebGLRenderTarget {
  const target = new WebGLRenderTarget(1, 1, { format: RGBAFormat, type: UnsignedByteType });
  target.texture.colorSpace = NoColorSpace;
  return target;
}

const flats = new Map<string, MeshBasicMaterial>();
/** One mask material a template's uniforms, code and side: a program binds its uniforms once. */
const landmarkMasks = new WeakMap<LandmarkUniforms, Map<string, MeshBasicMaterial>>();

/** A lamp, as rosterModels reads one: a material whose emission has a colour. */
function isLamp(material: Material): boolean {
  const emissive = (material as Material & { emissive?: Color }).emissive;
  return emissive !== undefined && emissive.getHex() !== 0;
}

/** A material that writes `code` in red and nothing else: no tone curve, no fog, no conversion. */
function flat(code: number, side: Side): MeshBasicMaterial {
  const key = `${code}:${side}`;
  const cached = flats.get(key);
  if (cached !== undefined) return cached;
  const material = new MeshBasicMaterial({ fog: false, toneMapped: false, side });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>\ngl_FragColor = vec4( ${(code / 255).toFixed(6)}, 0.0, 0.0, 1.0 );`
    );
  };
  material.customProgramCacheKey = () => `arch-mask-${code}`;
  flats.set(key, material);
  return material;
}

/**
 * A landmark material's code, with green where the fragment lies inside a
 * lit pool: the pools' own test (landmarkLight.ts `installLampPools`), a
 * lamp at a level above zero within `POOL_RADIUS_M` of the fragment, read in
 * model metres off the same uniforms.
 */
function landmarkMask(code: number, side: Side, uniforms: LandmarkUniforms): MeshBasicMaterial {
  let byCode = landmarkMasks.get(uniforms);
  if (byCode === undefined) {
    byCode = new Map();
    landmarkMasks.set(uniforms, byCode);
  }
  const key = `${code}:${side}`;
  const cached = byCode.get(key);
  if (cached !== undefined) return cached;
  const material = new MeshBasicMaterial({ fog: false, toneMapped: false, side });
  byCode.set(key, material);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPool = uniforms.uPool;
    shader.uniforms.uPoolCount = uniforms.uPoolCount;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMaskPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMaskPos = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec4 uPool[${LAMP_COUNT}];
uniform int uPoolCount;
varying vec3 vMaskPos;`
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
float inPool = 0.0;
for ( int i = 0; i < ${LAMP_COUNT}; i ++ ) {
	if ( i >= uPoolCount ) break;
	if ( uPool[ i ].w > 0.0 && length( uPool[ i ].xyz - vMaskPos ) < ${POOL_RADIUS_M.toFixed(1)} ) inPool = 1.0;
}
gl_FragColor = vec4( ${(code / 255).toFixed(6)}, inPool, 0.0, 1.0 );`
      );
  };
  material.customProgramCacheKey = () => `arch-mask-pool-${code}`;
  return material;
}
