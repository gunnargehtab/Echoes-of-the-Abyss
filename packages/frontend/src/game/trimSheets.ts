/**
 * The navies' trim sheets, one image each, attached to a model's laid-out
 * materials at load (#1005; docs/art-direction.md "UV layout and trim
 * sheets — SPEC").
 *
 * A model script lays its parts' UV0 out in metres and tags each solid
 * unlit material with the sheet's name (`userData.trim`, which GLTFLoader
 * reads back from the file's `extras`); the image itself is the navy's,
 * drawn once by tools/hull-models/sheets.mjs into src/assets/trim/, so a
 * fleet of twenty-four models shares one 512² upload rather than carrying
 * twenty-four copies in their files. The sheet is grey: it multiplies the
 * ink the recolour puts in `color` (rosterModels.ts, gate 4), so hue stays
 * the palette's, and it never reaches `emissive` (gate 3). Page-lifetime
 * cache, shared by every template and palette, never per entity: a texture
 * is a GPU object, and two of one sheet would be two uploads.
 *
 * Without a DOM — the frontend tests — the texture is made and cached but
 * its image never loads; what those tests hold is ownership, not pixels.
 */
import { RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three';

/** Every sheet the build carries, by its file name without the extension. */
const SHEET_URLS = import.meta.glob<string>('../assets/trim/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

const SHEET_BY_NAME = new Map<string, string>(
  Object.entries(SHEET_URLS).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1).replace(/\.png$/, ''),
    url,
  ])
);

const sheets = new Map<string, Texture>();

/** The sheet a material is tagged for, or null when the build has none by that name. */
export function trimSheet(name: string): Texture | null {
  const cached = sheets.get(name);
  if (cached !== undefined) return cached;
  const url = SHEET_BY_NAME.get(name);
  if (url === undefined) return null;
  // The loader needs an <img>; where there is none the texture stays empty.
  const texture = typeof document === 'undefined' ? new Texture() : new TextureLoader().load(url);
  texture.name = `trim-${name}`;
  texture.colorSpace = SRGBColorSpace;
  // `u` runs past one wrap along a long part; `v` stays inside its band.
  texture.wrapS = texture.wrapT = RepeatWrapping;
  // The layout puts v 0 on the sheet's first row, as glTF reads a texture
  // and as GLTFLoader sets a file's own; three's loader flips by default,
  // which would hand every face the wrong band.
  texture.flipY = false;
  sheets.set(name, texture);
  return texture;
}

/** Which sheets the build carries, for a test that asks. */
export const TRIM_SHEET_NAMES: readonly string[] = [...SHEET_BY_NAME.keys()];
