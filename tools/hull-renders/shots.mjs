/**
 * The shot table: which hull is photographed, and in whose water.
 *
 * Data only, like tools/hull-maps/models.mjs, and for the same reason — the
 * driver reads it to know what to render and the scene page reads the
 * dressing to know what to build around the subject. A render is a *portrait
 * in the game world*, not a turntable, so a shot is a hull plus the biome
 * that hull's navy actually lives in.
 *
 * Nothing here is a gate. These images are presentation artifacts for the
 * design bible; the shipped sprite inputs are still tools/hull-maps/build.mjs
 * and the approving gate is still hull-intake. Keep the two apart: a pretty
 * render has never been evidence that a model passes.
 */

/**
 * One navy's water. `accent` is the faction's neon signal and `treatment` its
 * noir behaviour, both from docs/style-neon-noir.md "Faction accents on a
 * neon-noir ground"; `biome` names the environment the props are drawn from
 * (docs/environments.md), and `props` are the registry slugs that stand in it
 * (packages/frontend/src/game/environment.ts ENVIRONMENT_PROPS), each with the
 * footprint metres the registry canonicalises it to.
 *
 * `worldLight` is the licensed ground glow of that biome
 * (docs/style-neon-noir.md "World light") — ember at a vent mouth, flora in
 * the kelp, crystal in the resonance field. The trench is deliberately unlit:
 * the Directorate's water has no world light in it at all, which is why the
 * only colour in a Directorate frame is the ship's own.
 */
export const NAVIES = {
  bathyarch: {
    name: 'Bathyarch Consortium',
    accent: '#F2B233',
    // "Sodium work-lamps ... industrial light that labours."
    water: '#0A0F14',
    biome: 'Thermal Vein',
    worldLight: '#FF7A2E',
    worldLightPower: 1.0,
    props: [
      { slug: 'env-vent-chimney', footprintM: 12, lit: true },
      { slug: 'env-vent-basalt', footprintM: 15 },
      { slug: 'env-rock-crag-a', footprintM: 30 },
    ],
  },
  pelagia: {
    name: 'Pelagia Commune',
    accent: '#8FE36B',
    // "Soft pulse, no hard edges" — so the water carries the glow too.
    water: '#06120F',
    biome: 'Kelp Forest',
    worldLight: '#63E08A',
    worldLightPower: 0.75,
    props: [
      { slug: 'env-kelp-cluster', footprintM: 18, lit: true },
      { slug: 'env-coral-tower', footprintM: 15 },
      { slug: 'env-coral-growth', footprintM: 12 },
    ],
  },
  directorate: {
    name: 'Abyssal Directorate',
    accent: '#C2465E',
    // "Rows of small points, never area glow" — and no world light at all.
    water: '#04070C',
    biome: 'Abyssal Trench',
    worldLight: null,
    worldLightPower: 0,
    props: [
      { slug: 'env-trench-spire', footprintM: 20 },
      { slug: 'env-trench-slab', footprintM: 25 },
      { slug: 'env-rock-crag-b', footprintM: 30 },
    ],
  },
  hadron: {
    name: 'Hadron Knights',
    accent: '#C9A6FF',
    // "Razor-thin constant lines, mirror speculars" — the one navy whose
    // light never flickers, in the one biome that answers it.
    water: '#07070F',
    biome: 'Resonance Field',
    worldLight: '#8B5CF6',
    worldLightPower: 0.9,
    props: [
      { slug: 'env-resonance-crystal', footprintM: 12, lit: true },
      { slug: 'env-resonance-pylon', footprintM: 10 },
      { slug: 'env-rock-crag-a', footprintM: 30 },
    ],
  },
};

/**
 * The five kinds every navy fields, script-built in #649 — the newest hulls
 * in the roster. `lengthM` is the design length the model is metre-true at
 * (HULL_LENGTH_M in packages/frontend/src/game/silhouettes.ts, echoed by
 * tools/hull-maps/models.mjs) and `sig` the idle/cruise signature from
 * docs/units.md.
 *
 * SIG is here because the style law says glow encodes loudness
 * (docs/style-neon-noir.md §3): the scene drives each hull's emissive from it,
 * so a Cruiser at 55 burns visibly hotter than a Chorister at 16 in the same
 * frame. That is the same law tools/hull-maps/build.mjs applies to the sprite
 * maps, applied to a picture; it is a presentation choice and moves no
 * constant.
 */
export const KINDS = [
  { slug: 'light-scout', lengthM: 60, sig: 6 },
  { slug: 'chorister', lengthM: 50, sig: 16 },
  { slug: 'harvester', lengthM: 75, sig: 18 },
  { slug: 'corvette', lengthM: 80, sig: 28 },
  { slug: 'abyssal-submersible', lengthM: 95, sig: 22 },
  { slug: 'cruiser', lengthM: 130, sig: 55 },
];

/** The kinds #649 built — the ones a bare run photographs. */
export const NEW_KINDS = ['chorister', 'harvester', 'corvette', 'abyssal-submersible', 'cruiser'];

/** Every hull portrait: one kind in one navy's water. */
export function shots({ kinds = NEW_KINDS, navies = Object.keys(NAVIES) } = {}) {
  const out = [];
  for (const navy of navies) {
    for (const kind of KINDS) {
      if (!kinds.includes(kind.slug)) continue;
      out.push({
        id: `${kind.slug}-${navy}`,
        model: `${kind.slug}-${navy}.glb`,
        navy,
        ...kind,
      });
    }
  }
  return out;
}
