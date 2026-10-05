/**
 * A navy's trim sheet on a model's laid-out materials, for the two pages that
 * photograph a model (#1112): inspect.html's lit table and scene.html's
 * portrait. Both import it by URL from their driver, and `three` through
 * their importmap, so it runs on the page's own three.
 *
 * A model script tags each material it laid out with its sheet's name
 * (`userData.trim`, which GLTFLoader reads back from the file's `extras`),
 * and no file carries the image: it is the navy's, drawn once by
 * tools/hull-models/sheets.mjs into packages/frontend/src/assets/trim/. This
 * attaches it the way packages/frontend/src/game/trimSheets.ts does at load —
 * as `map`, sRGB, repeating, v 0 on the sheet's first row — so a picture
 * carries the plates the conn view draws rather than the bare file. Without
 * it a reviewer judges a navy's sheet from everywhere but the two places
 * built for looking (docs/art-direction.md "UV layout and trim sheets").
 *
 * A model with no tag is not touched, so it renders as it did before the
 * sheets. A tag the driver has no image for leaves its material bare, as
 * trimSheet's null does in the game, and is reported rather than thrown:
 * a picture is not a gate.
 */
import { RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';

/**
 * Attach a sheet to every tagged material under `root`, `urlOf(name)` saying
 * where the driver serves it. One texture a name per call, shared by every
 * material that names it, as the game shares one a navy. `anisotropy` is the
 * game's `TRIM_SHEET.ANISOTROPY` (#1107), which the driver hands in since
 * this page has no @echoes/shared of its own.
 */
export async function attachTrimSheets(root, urlOf, { anisotropy = 1 } = {}) {
  // Parts share materials, so each is counted and attached once.
  const tagged = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (typeof m?.userData?.trim === 'string') tagged.add(m);
    }
  });
  const sheets = new Map();
  const missing = [];
  for (const name of new Set([...tagged].map((m) => m.userData.trim))) {
    const texture = await new TextureLoader().loadAsync(urlOf(name)).catch(() => null);
    if (texture === null) {
      missing.push(name);
      continue;
    }
    texture.name = `trim-${name}`;
    texture.colorSpace = SRGBColorSpace;
    // `u` runs past one wrap along a long part; `v` stays inside its band.
    texture.wrapS = texture.wrapT = RepeatWrapping;
    // The layout puts v 0 on the sheet's first row, as glTF reads a texture;
    // three's loader flips by default, which would hand every face the wrong
    // band. Read at upload, which is the first render, after this returns.
    texture.flipY = false;
    // Filtered as the conn view filters it, so an edge-on deck keeps its
    // plates here too; three clamps it to what the GPU offers at upload.
    texture.anisotropy = anisotropy;
    sheets.set(name, texture);
  }
  let materials = 0;
  for (const m of tagged) {
    const sheet = sheets.get(m.userData.trim);
    if (sheet === undefined) continue;
    m.map = sheet;
    materials++;
  }
  return { sheets: [...sheets.keys()], materials, missing };
}
