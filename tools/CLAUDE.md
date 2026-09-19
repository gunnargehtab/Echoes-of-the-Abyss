# tools/CLAUDE.md

What each harness and gate under `tools/` is, and why it is shaped the way it is. It loads
for a session working here; the root `CLAUDE.md` keeps one line per directory and the
`npm run gates` sequence that runs the blocking ones.

Not all of it is a gate: a portrait and a level are judgements a number informs rather
than settles, and `hull-renders` and `audio-meter` say so in their own lines.

```text
tools/hull-models  Model GLBs authored as three.js scenes: kit.mjs
                   (buildability), factions/*.mjs (one navy's shape language),
                   hulls/*.mjs (one hull), structures/*.mjs (one structure kind
                   in one navy). Not an npm workspace; run a script directly and
                   it writes into docs/concept-art/models/, which then goes
                   through hull-intake like any other export. check.mjs rebuilds
                   every script in both directories in a scratch directory and
                   fails on any drift from the committed GLB; CI runs it in the
                   build job. diff.mjs answers the one thing check.mjs cannot —
                   what a port changed about a shape — by reading the pre-port
                   binary out of git history, since after a port the committed
                   file is the script's own output and the check is comparing it
                   against itself. parts.mjs reads a file the way a script is
                   written — each node's transform, which primitive its buffer
                   is, which nodes share one — and is what a port transcribes
                   from. Port is -z: the bow is on +X and Y is up, so +z is
                   starboard (kit.mjs `bothSides`, #642).
tools/hull-maps    The committed outputs of the approved models: build.mjs bakes
                   the sprite maps (Chromium), outlines.mjs writes each modelled
                   kind's plan outline into packages/frontend/src/game/
                   hullOutlines.generated.ts (no browser). models.mjs is the one
                   table both read.
tools/hull-renders The same models photographed rather than measured:
                   render.mjs drives Chromium/three.js to write one beauty
                   frame per hull into docs/concept-art/renders/, in the
                   water its navy lives in, under the neon-noir rig.
                   shots.mjs is the table of which hull in whose biome. Not
                   an npm workspace and not a gate — a portrait is a
                   presentation artifact, and a model is still approved by
                   hull-intake and check.mjs, which measure.
tools/audio-meter  What the mix measures, rather than what it was meant to.
                   meter.mjs bundles the production audio classes, renders one
                   layer at a time through Chromium's OfflineAudioContext, and
                   reads the samples back with Node: loudness.mjs is ITU-R
                   BS.1770-4 integrated LUFS and true peak, spectrum.mjs the
                   band split that says where a layer's energy sits. Not an npm
                   workspace and not a gate — it needs a browser, and a level is
                   a judgement a number informs rather than settles. Readings
                   are taken at the bus, before MASTER_GAIN, because a figure at
                   the output says the mix is hot and a figure at the bus says
                   which layer made it hot (#663).
tools/invariants   check.mjs reads docs/invariants.md's table and asserts that
                   every holder it names still resolves — the file is there and
                   the quoted test name is still in it, matched against the file
                   with its comments stripped, because the long explanation above
                   a test is exactly the text that survives a rename and would
                   keep the gate green on a holder that is gone. Liveness, not
                   correctness; see "Invariants live in exactly one place too" in
                   the root CLAUDE.md. Runs in npm run gates and in CI's build job.
tools/claude-docs  markdownlint, a relative-link check, and a path check over
                   the prose this repository wrote about itself: the markdown
                   under .claude/, which was outside every glob in CI until
                   #748 and had already drifted, and since #795 the root
                   CLAUDE.md, CONTRIBUTING.md and
                   .github/copilot-instructions.md, which were outside all three
                   doc gates. The root three are listed by a pathspec that also
                   catches a nested CLAUDE.md, so the three files #791 split out
                   arrived gated too. check.mjs also decides the scope, and
                   decides it closed: a skill in neither of its two lists fails,
                   a listed skill that is gone fails, and a
                   tracked document that is neither linted nor vendored fails —
                   so nothing new is ungated by being unnoticed. The vendored
                   skills stay out as upstream copies, and check.mjs's list of
                   them is asserted against VENDORED-SKILLS.md's own table, so
                   the two cannot drift. lib/paths.mjs is the path check: a
                   backticked span under packages/, tools/, docs/, .claude/ or
                   .github/ must resolve against git or be one of two declared
                   build outputs, a glob must match something, and an exemption
                   nothing names any more fails —
                   which is what a link checker cannot see, since prose names a
                   file far more often than it links one. Configs are
                   .claude/.markdownlint.json, which extends the root one and
                   turns MD018 off because those files open paragraphs with
                   issue numbers — the root three neither need that nor get it —
                   and .claude/.markdown-link-check.json, which checks relative
                   links only, because a link between two of these files is
                   the one that goes stale unread. Runs in npm run gates
                   and in CI's docs job; its own suite is npm run
                   test:claude-docs.
tools/prose-budget How long a GitHub body is, in the words a person reads —
                   markdown scaffolding, template prompts, fenced evidence and
                   the attribution footer are not reading and do not count.
                   lib/count.mjs is the counter and holds the budgets;
                   check.mjs is the CLI the PR body workflow runs, advisory
                   there and --strict locally. Tested under npm test.
tools/roadmap      docs/ROADMAP.md rendered against live GitHub issue state, for
                   GitHub Pages. build.mjs parses the doc rather than keeping a
                   second copy of it, so the doc owns the phases and the
                   reasoning and GitHub owns whether each issue is open: adding a
                   row to a phase table is how you add an item to the site.
                   Dependency-free on purpose, so the page cannot fail to build
                   on something in node_modules, and without a token it still
                   builds with every state reading "unknown". npm run test:roadmap
                   is its suite. Published by .github/workflows/pages.yml, not by
                   ci.yml — see the root CLAUDE.md's CI section.
tools/balance      Headless matches, telemetry, and a verdict against every
                   guard-rail the design bible names. run.mjs is a launcher only:
                   the harness is packages/backend/src/balance/, because it
                   imports Match and AiSeat and those are backend TypeScript with
                   real .ts import extensions. baselines/ holds the committed
                   readings, each stamped with the command that produced it. Read
                   the freeze in the root CLAUDE.md before running it: the harness
                   is not frozen, tuning a number against it is.
tools/echo-sim     Standalone CommonJS harness for deterministic Echo scenarios.
                   Not an npm workspace; run it directly:
                   node tools/echo-sim/sim.js [tools/echo-sim/scenarios/<name>.json]
                   Tests can also require('./lib') for detect/runScenario.
tools/lib          spawn.mjs, the one way a gate is spawned, carrying the Windows
                   reasoning: npm and npx are .cmd batch files there, and since
                   the CVE-2024-27980 fix spawning one without a shell returns
                   status: null with error set rather than throwing, which made
                   every gate FAIL in 0.0s printing nothing. Extracted when
                   claude-docs became gates.mjs's second caller.
tools/*.mjs        The three scripts that sit at the top of the tree.
                   gates.mjs is every blocking gate in one pass — see the root
                   CLAUDE.md's Commands section. preflight-deps.mjs is the presence
                   check that dev, build and test run first, so a stale node_modules
                   fails at the front door instead of ten seconds into Vite (#301).
                   android-check.mjs is the on-device smoke check for the Termux
                   deployment (SETUP-ANDROID.md): build, tests, and a real server
                   boot probed on both ports. All three are plain Node with no
                   dependencies — the last two because they have to run before
                   anyone has a working install.
```

Related: `CLAUDE.md` (the root file — the one-line index, the gate list, CI's four jobs) ·
`CONTRIBUTING.md` (which gates block a merge) ·
`.github/workflows/ci.yml` (the jobs each gate runs in)
