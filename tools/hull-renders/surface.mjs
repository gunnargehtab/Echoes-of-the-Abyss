/**
 * A navy's surface on a model's cladding, as the High graphics quality puts
 * it there, for inspect.html's lit table (#1811): the conn view's own shader
 * patch and the scales the draw wrote, imported from packages/frontend rather
 * than written a second time.
 *
 * inspect.mjs bundles this with esbuild when a run asks for `--surface` and
 * serves it as /surface.js, as render.mjs serves frame.mjs. three stays
 * external, so the page's importmap hands this bundle and the page one three.
 * @echoes/shared resolves to its build output, so `npm run build:shared` runs
 * before such a run, as before any workspace script.
 *
 * The conn view merges a model's parts by material, which bakes each part's
 * transform into its vertices, and the patch reads a fragment's place from
 * those: the model's own frame, in metres. A file's parts are still under
 * their nodes here, so `wearNavySurface` bakes them the same way first, with
 * the client's own `bakeTransform`, which keeps a mirrored part's faces
 * towards the eye (#1812). Each part keeps its name for a `--view` to frame.
 *
 * Two things follow the client since #1844. A surface whose pattern drew a
 * second image for a face that looks abeam has it loaded beside the first,
 * and a material whose surface names a blade has each part say whether it is
 * one, by the client's own `bladeFrames`, once it is baked.
 */
import {
  BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  TextureLoader,
} from 'three';
import { bakeTransform } from '../../packages/frontend/src/game/bakeTransform.ts';
import {
  NAVY_BLADE_ATTRIBUTE,
  bladeFrames,
  installNavySurface,
} from '../../packages/frontend/src/game/navySurface.ts';
import { NAVY_SURFACE_SCALES } from '../../packages/frontend/src/game/navySurfaces.generated.ts';

/**
 * Bake every part of `root` into the root's frame and put `navy`'s surface
 * on each cladding material it has one drawn for, `urlOf(name)` saying where
 * the driver serves the image. `root` is at its final yaw and has not been
 * scaled, so a unit of its frame is a metre, as an approved file's is.
 */
export async function wearNavySurface(root, navy, urlOf, { anisotropy = 1 } = {}) {
  const scales = NAVY_SURFACE_SCALES[navy];
  if (scales === undefined) throw new Error(`no navy named ${navy} has a surface drawn`);
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  const flat = [];
  for (const mesh of meshes) {
    mesh.geometry = bakeTransform(mesh.geometry.clone(), mesh.matrixWorld);
    flat.push(mesh);
  }
  for (const mesh of flat) {
    mesh.removeFromParent();
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
  }
  root.clear();
  root.rotation.set(0, 0, 0);
  root.add(...flat);
  root.updateMatrixWorld(true);

  const materials = new Set(
    flat.flatMap((m) => (Array.isArray(m.material) ? m.material : [m.material]))
  );
  const load = async (name) => {
    const texture = await new TextureLoader().loadAsync(urlOf(name)).catch(() => null);
    if (texture === null) return null;
    texture.name = `navy-surface-${name}`;
    texture.colorSpace = NoColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.anisotropy = anisotropy;
    texture.flipY = false;
    return texture;
  };
  const worn = [];
  const missing = [];
  const blades = [];
  for (const material of materials) {
    const scale = scales[material.name];
    // A material that brings a normal map of its own keeps it, as in the game.
    if (scale === undefined || !material.isMeshStandardMaterial || material.normalMap) continue;
    const name = `${navy}-${material.name}`;
    const texture = await load(name);
    const abeam = scale.abeamMean === undefined ? null : await load(`${name}-abeam`);
    if (texture === null || (abeam === null && scale.abeamMean !== undefined)) {
      missing.push(texture === null ? name : `${name}-abeam`);
      continue;
    }
    if (!installNavySurface(material, { name, texture, abeam, scale }, 1)) continue;
    worn.push(material.name);
    if (scale.blade === undefined) continue;
    for (const mesh of flat) {
      if (mesh.material !== material) continue;
      const frames = bladeFrames(mesh.geometry, scale.blade);
      mesh.geometry.setAttribute(NAVY_BLADE_ATTRIBUTE, new BufferAttribute(frames, 4));
      // The turn that changes nothing ends in a 1 and starts with three 0s.
      if (frames[3] !== 1) blades.push(mesh.name);
    }
  }
  return { worn, missing, blades };
}
