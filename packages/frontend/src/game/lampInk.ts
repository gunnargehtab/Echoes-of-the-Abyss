/**
 * A lamp's ink: the emissive half of gate 4, as the runtime applies it
 * (rosterModels.ts `recolor`). The export's emissive hue gives way to the
 * navy's glow ink and its resting strength is kept exactly, the correction
 * going into `emissiveIntensity`; then gate 3's lamp core holds a rest past
 * white at white along the ink (`lampCoreRest`). Its own module, clear of the
 * model loader's asset globs, so the hull portrait rig (tools/hull-renders)
 * bundles this step rather than a copy of it.
 */
import type { Color, MeshStandardMaterial } from 'three';
import { lampCoreRest } from './glow.ts';

const luminance = (color: Color) => 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;

/**
 * Ink one lamp material in place, keeping the export's own strength on
 * `userData.exportIntensity` for the lamp reading. A material that emits
 * nothing, or an ink with no light in it, is left as it is.
 */
export function inkLamp(material: MeshStandardMaterial, glow: Color): void {
  const emissiveLum = luminance(material.emissive);
  const glowLum = luminance(glow);
  if (emissiveLum <= 0 || glowLum <= 0) return;
  material.emissive.copy(glow);
  material.emissiveIntensity *= emissiveLum / glowLum;
  material.userData.exportIntensity = material.emissiveIntensity;
  const { r, g, b } = material.emissive;
  material.emissiveIntensity = lampCoreRest(Math.max(r, g, b), material.emissiveIntensity);
}
