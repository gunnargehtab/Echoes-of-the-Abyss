# packages/frontend/CLAUDE.md

What is true only inside the client. It loads for a session working here; the root
`CLAUDE.md` keeps what binds two or more packages — the wire, the per-package import
extensions, where constants live, and the rule that this side draws only what the server
has already resolved.

The shape of the package: a React shell over a two-canvas renderer — the three.js conn
view (the world) under a transparent PixiJS HUD, on one shared camera
(`EchoRenderer.setConn`). A terminal, not a simulation.

## Tests run under a Vite shim

Two Vite idioms are build-time transforms, not runtime APIs: `import url from
'./thing.png'` and `import.meta.glob(...)`. Node has neither, so `packages/frontend`'s
test script passes loader hooks (`packages/frontend/test/support/viteAssets.mjs`) alongside
tsx. A hand-rolled `node --test` reaching `EchoRenderer` or `PerspectiveView` needs them,
or the import throws first.

Four rules hold over every test in `packages/frontend/test/`:

- **Boot the real class.** A test of a stub tests the stub.
- **Stub only what the runner genuinely lacks**, and model it rather than swallow it
  (`packages/frontend/test/support/`).
- **Assert counted work, never a stopwatch.** `AUDIO_BUDGET_MS` is wall clock; nodes
  built per tick is the assertion.
- **Assert what a doc section promises, never what the JSX says.** A test mirroring
  markup is a change detector; screenshots cover how it looks.

Why there is no jsdom is at the foot of `packages/frontend/test/support/screen.ts`.

Five production seams exist for these and have no other caller: an optional `Application`
on `EchoRenderer`, renderer factory on `PerspectiveView.mount`, `Client` on `GameClient`,
`harness` on `GameCanvas` — which *constructs* the other three, so a GPU-less boot
without it stops at `mount()` — and `listRooms` on `BrowseScreen`. All default to the
real thing; none is a feature.

Related: `CLAUDE.md` (the root file — the wire, import extensions, constants, CI) ·
`docs/graphics-standards.md` (the gates anything visual clears, screenshot included) ·
`.claude/skills/run-game/SKILL.md` (driving the real client headless)
