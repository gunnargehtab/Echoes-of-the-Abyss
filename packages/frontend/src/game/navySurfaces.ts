/**
 * The navies' surfaces, one image a navy material, and which material of
 * which navy wears which (#1811; docs/art-direction.md, "What is built at
 * High").
 *
 * tools/hull-models/surfaces.mjs draws each into src/assets/surface/ as
 * `<navy>-<material>.png` and writes its scale beside it
 * (navySurfaces.generated.ts). A material is found by its navy and its own
 * name, which every model of the navy carries from its script
 * (tools/hull-models/factions/), so no model is tagged or re-exported to
 * wear one, and a navy with no surface drawn wears none.
 *
 * Page-lifetime cache, shared by every template and palette, never per
 * entity, as a trim sheet is (trimSheets.ts): a texture is a GPU object, and
 * two of one surface would be two uploads. Nothing is fetched until a
 * template asks, so a page that never draws High never loads one.
 *
 * Without a DOM, the frontend tests, the texture is made and cached but its
 * image never loads; what those tests hold is ownership, not pixels.
 */
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  Texture,
  TextureLoader,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import type { NavySurface } from './navySurface.ts';
import { NAVY_SURFACE_SCALES } from './navySurfaces.generated.ts';

/** Every surface the build carries, by its file name without the extension. */
const SURFACE_URLS = import.meta.glob<string>('../assets/surface/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

const SURFACE_BY_NAME = new Map<string, string>(
  Object.entries(SURFACE_URLS).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1).replace(/\.png$/, ''),
    url,
  ])
);

const surfaces = new Map<string, NavySurface>();

/** Whether any material of a navy has a surface drawn. `navy` is its models' suffix. */
export function hasNavySurface(navy: string): boolean {
  return NAVY_SURFACE_SCALES[navy] !== undefined;
}

/** The surface a navy's material wears by its name, or null when none is drawn. */
export function navySurface(navy: string, material: string): NavySurface | null {
  const scale = NAVY_SURFACE_SCALES[navy]?.[material];
  if (scale === undefined) return null;
  const name = `${navy}-${material}`;
  const cached = surfaces.get(name);
  if (cached !== undefined) return cached;
  const url = SURFACE_BY_NAME.get(name);
  if (url === undefined) return null;
  // The loader needs an <img>; where there is none the texture stays empty.
  const texture = typeof document === 'undefined' ? new Texture() : new TextureLoader().load(url);
  texture.name = `navy-surface-${name}`;
  // Slopes and a height: data, never decoded as colour.
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = HIGH_GRAPHICS.HULL_SURFACE.ANISOTROPY;
  // The draw puts v 0 on the image's first row, and its green channel is the
  // slope along that v; three's loader flips by default, which would turn
  // every rise across the tile into a fall.
  texture.flipY = false;
  const surface = { name, texture, scale };
  surfaces.set(name, surface);
  return surface;
}

/** Which surfaces the build carries, for a test that asks. */
export const NAVY_SURFACE_NAMES: readonly string[] = [...SURFACE_BY_NAME.keys()];
