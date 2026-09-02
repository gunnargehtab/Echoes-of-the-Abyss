# env-props — the Block 4 environment props, generated

`build.mjs` writes every row of the environment prop table in
`docs/asset-prompts-3d.md` (Block 4 — ENVIRONMENT) as a GLB in
`docs/concept-art/models/`: fourteen files, `env-vent-chimney.glb` through
`env-open-boulder.glb`.

It exists because the prompt kit expects those models from a Claude Design
batch, and the runtime — the environment registry, the deterministic scatter,
the instanced layer, the kelp sway — was ready before any batch was. The
generator is the author of record until then. Its output takes the same road
an export would (`docs/graphics-standards.md`, "The environment branch"):

```bash
node tools/env-props/build.mjs                       # all rows, into docs/concept-art/models/
node tools/env-props/build.mjs env-kelp-cluster      # one row
node tools/env-props/build.mjs --out /tmp/props      # somewhere else

# Then the gate, per row, with the table's numbers:
node .claude/skills/hull-intake/scripts/bake.mjs docs/concept-art/models/env-kelp-cluster.glb \
  --category env --footprint-m 18 --max-tris 400 --world-light flora --out /tmp/hull-intake/kelp
```

What the generator guarantees, so the gate is a check and not a surprise:

- **Deterministic.** Geometry is seeded from the slug; a rerun is byte-identical,
  and a diff on the models directory means a change in this script.
- **Metre-true.** The larger footprint axis is held to the row's footprint, the
  base sits on Y=0, and heights land in the row's band — intake reports a
  ×1.000 scale and no rotation warning.
- **Inside the caps.** Flat-shaded, at most two materials (`stone`, and a
  `light-<family>` only where the row licenses one), well under every row's
  triangle budget.
- **Lit only by the world-light families.** Emissive is the licensed family's
  token from `docs/style-neon-noir.md`, dimmed below the vent ember; everything
  else carries no emissive at all.

Replacing a generated prop with a Claude Design model is a file swap: intake the
export with the same row numbers, commit it over the generated file, and set the
registry row's `triBudget` in `packages/frontend/src/game/environment.ts` to the
triangle count intake reports. Nothing else reads the author.
