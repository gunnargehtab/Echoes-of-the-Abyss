---
name: run-game
description: Launch Echoes of the Abyss and drive it in a headless browser to see the game actually running — dev servers, a real match, and screenshots of the rendered Echo Layer. Use this whenever you need to run, start, launch, open, or play the game, take a screenshot of it, reproduce a gameplay bug, or confirm that a renderer, HUD, netcode, or simulation change works in the real client rather than only in tests. Prefer this over improvising a Vite/Playwright setup by hand.
---

# Running Echoes of the Abyss

The game has no login and no room browser. A bare URL lands on the **title
screen** (the shell — docs/ui-ux.md §14); `?map=<id>` skips it and boots
straight into a match, which is the fast path this harness leans on.
`drive.mjs` handles both: when the title screen shows it clicks through Solo
game → Descend itself. Either way the client then joins a Colyseus room and
lands in a **lobby**: pick a navy, ready up, and the match starts. So "running
it" is: bring up both servers, point a headless Chromium at the dev server,
ready up, and look at what rendered.

Looking at the screenshot is the point. This is a game about hidden
information, and a black frame, an empty HUD, or a stuck "Listening…" overlay
are all things a passing exit code will happily hide from you.

## 1. Start both servers

```bash
.claude/skills/run-game/scripts/dev.sh start
```

This clears any leftover servers, starts the tree in its own session, and
returns only once **both** :5173 (Vite) and :3000 (Colyseus) answer — normally
about five seconds. The root `npm run dev` it invokes rebuilds `@echoes/shared`
first, which matters because the other two packages import its `dist/`;
skipping that produces confusing type and resolution errors.

Use the script rather than a bare `npm run dev &`. Two reasons, both of which
bite in practice: the servers must be stoppable as a unit (see step 3), and a
plain `curl` readiness check cannot tell *your* backend from a **stale one left
over from a previous run** — the probe goes green while your own backend is
still crash-looping on `EADDRINUSE`. `dev.sh start` clears the ports first, so
a green result can only mean the server it just started.

**If `start` ever seems to hang after printing that both ports are up, the game
is running** — trust the message, not the prompt. That symptom means something
in the tree inherited the script's stdout, so the calling shell is waiting on a
pipe that never closes. `dev.sh` forks the tree into its own session precisely
to avoid this, but if you hit it, carry on and verify independently with
`dev.sh status`; `stop` will still clean up.

**On a shared machine, check before you start.** `dev.sh start` clears :3000
and :5173 as its first act, so starting while a colleague or another agent has
a session running will kill their servers mid-run. `dev.sh status` tells you
whether anything already holds the ports, and `/tmp/echoes-dev.log` shows
whether a match is live. If someone else is on the box, just drive their
already-running server — step 2 does not care who started it.

Server output goes to `/tmp/echoes-dev.log`, with both sides interleaved under
`[frontend]` and `[backend]` prefixes.

**On Windows, run the servers yourself.** Git for Windows' Bash has no `lsof` or
`setsid`, and its `ps` takes no `-o`, so `dev.sh` cannot see who holds :3000 or
:5173. Check both from PowerShell first:
`Get-NetTCPConnection -LocalPort 3000,5173 -State Listen -ErrorAction SilentlyContinue`
prints nothing when they are free. Then run `npm run dev` from the repository root,
and end its whole tree when you finish (`taskkill /T /F /PID <pid>`).

## 2. Drive it

```bash
node .claude/skills/run-game/scripts/drive.mjs --out /tmp/run-game
```

The default run is the smoke test worth having: connect, **ready up**, select a
unit, fire active sonar, and screenshot each step. It exits non-zero if the
client never joins a match or if anything hit the browser console, and prints
the path of each screenshot as `shot: <path>` — read those paths from the
output rather than assuming the ones written here, since `--out` moves them.

The ready-up step is not optional and not cosmetic: **the simulation does not
step until every connected commander has readied**. A `--steps` module runs
*after* `drive.mjs` has readied this client, so it always starts in a live
match — but if you drive the page yourself, a script that skips the lobby
drives an ocean that is not moving.

**Then actually open the screenshots.** The world is the perspective **conn
view** (docs/three-layer-ocean.md Phase 5): a three.js scene on one canvas with
the transparent Pixi HUD composited over it. What a healthy first frame looks
like:

- A top bar with `NODULES`, a `SIG` bar, and a contact count.
- A textured seabed with relief, receding into fog, seen from a 55° tilt — not
  a flat map. The base opens centred: a hub structure with outbuildings and a
  handful of hulls, each hanging over a ground shadow on a thin plumb line.
- The minimap bottom-left, and `BUILD` / `FOUNDRY` / `SLIPWAY` tabs over a
  build bar along the bottom — production is a page per yard (docs/ui-ux.md
  §9). (A `SQUAD` tab appears only once something is selected, so its absence
  on the first frame is correct, and a `BASTION` tab only while the Bastion's
  own page is open.)

The GLB models decode in the background: the first seconds show flat baked
sprites lying at depth, which then swap for dimensional hulls — wait ~5 s
before a screenshot that is meant to show models. Judge the frame on whether a
match rendered, not on a checklist of rings. Signature radius rings are sized
to each unit's current SIG, so a quiet unit legitimately has no visible ring,
and rings lie on the terrain now — an ellipse-ish ring hugging a slope is the
projection working, not a bug.

If this session cannot open an image (a local hook refused image reads on #974's
Windows machine), say so in the pull request and have the frames reviewed where
they can be opened, as #974 did from a Linux container. A frame nobody opened is
not a reviewed frame.

The clearest single indicator that input reached the server and came back is
the **SIG bar changing colour** — amber around 40 at rest, full red at 95 the
instant a ping fires, then decaying. If that happens, the whole loop works.

### Driving something else

`--entry tutorial` takes the title screen's **Tutorial → briefing → Descend** door
instead of Solo game. Pair it with a tutorial `--steps` module: Sorrowgate is an
unarmed listening/escort mission, so the default ping smoke is not its acceptance
test. A `?mission=` deep link skips the briefing and does not prove that door.

Pass `--steps` with an ES module that default-exports an async function. It
receives the connected `page` (a Playwright page, already in a live match) and
a `shot(name)` helper that numbers screenshots in call order:

```js
// /tmp/steps.mjs
export default async ({ page, shot }) => {
  await shot('start');
  await page.mouse.click(655, 484);        // select nearest owned entity
  await page.keyboard.press('Space');      // toggle silent running
  await page.waitForTimeout(1000);
  await shot('silent');
};
```

The controls, all handled by `EchoRenderer` on the **top (Pixi) canvas** — the
three.js world canvas below it never listens; pointer coordinates are resolved
into water through the shared conn camera:

| Input | Effect | Needs a selection? |
| --- | --- | --- |
| Left click | Select nearest owned unit or structure (shift adds) — **unless a build is armed, which swallows the click to place it** | no |
| Right click | Context order — move, or attack/harvest a contact under the cursor | yes |
| Middle drag | Pan | no |
| Wheel | Zoom (dolly) about the cursor | no |
| `R` / `F` / `T` | Arm a refinery / foundry / turret, then left click to place | no |
| `D` / `A` | Dive / rise one band station | yes |
| `S` | Toggle floor-following | yes |
| `P` | Active sonar ping | yes |
| `Space` | Toggle silent running | yes |
| `V` | Cycle harvest throttle | yes |
| Hold `Alt` | Preview what a ping would cost you | yes |
| `Escape` | Cancel a pending build — handled before every other key, so it is safe to press unconditionally | no |

Unit production has no keys — the digits are control groups — so producing a
unit means pressing its button on the yard's own tab — `FOUNDRY` or `SLIPWAY`,
or the `BASTION` page the Harvester sits on, which selecting the Bastion opens.
That is the one case where clicking the bar is unavoidable.

The "needs a selection" column is the thing that catches people: `EchoRenderer`
returns early on most keys when nothing is selected, so a bare `page.keyboard
.press('KeyP')` on a fresh connect silently does nothing. Click a unit first.
Build keys are the exception: `R`/`F`/`T` work with nothing selected. `1`–`9` are
control groups, not production. Selecting a yard opens its card, and its first
button sits at about (782, 768) on the 1440×900 viewport (`halo-frames.mjs`).

**There is nothing to select against, so commands go through the keyboard.**
The page is two stacked canvases and about 17 DOM elements;
`document.body.innerText` is empty, and the HUD you can see (the `BUILD` /
`FOUNDRY` / `SLIPWAY` / `SQUAD` tabs, `SILENT`, `PING`, the build buttons) is drawn by Pixi,
not rendered as DOM. So `page.click('text=PING')` matches nothing, and every
Playwright selector strategy is unavailable by construction.

Clicks are still how you *select* and *place* — there is no keyboard equivalent
for either — so the pattern is click to choose a target, then press a key to
act on it. What to avoid is clicking HUD **buttons**: they shift with the active
tab and with how many buttons the current selection produces, so a pixel that
hits `PING` in one frame hits `SILENT` in the next. Their shortcuts don't move.

Coordinates are load-bearing, but the camera helps. The view opens centred on
the player's own base, so on `drive.mjs`'s default **1440×900** viewport (`VIEW_W` and
`VIEW_H` move it, which is how a layout is checked against 1080p) the friendly
cluster sits near screen centre (~720, 450). Three things make aiming less
fragile than it sounds: selection picks the *nearest* owned entity on screen
within a reach that never drops below 18 px, the minimap is a fixed
bottom-left rectangle you can click or drag to jump the view, and
`window.__perspectiveCamera(x, z, distance?, aim?)` points the camera at a world
position directly — pair it with `window.__perspectiveProbe().ownCentre` to
frame the fleet before a screenshot.

`aim` is `{ yawDeg?, pitchDeg?, focusDepthM? }`, and it is how a review reaches
the rest of the camera (docs/free-camera.md). Pitch is clamped to 10°–88°, yaw
wraps, and `focusDepthM: null` puts the focus back on the seabed. Since gates 6
and 7 are judged across the pitch band rather than at one frame, a visual PR
wants more than one angle: the 55° home frame, and a low one (10°–20°) with the
focus lifted into the column, where far more of the map is in shot. The probe
reports `pitchDeg`, `yawDeg`, `focus` and `eye` back, so a screenshot can be
captioned with the frame it was taken in.

Identifying *which* glyph is which is the genuine gap — the silhouettes are
faction shapes, not labels. Select one and read the inspector panel that
appears bottom-right; it names the unit (`Light Scout`, `Harvester`) along with
hull, SIG, and throttle. Expect to select-and-check rather than to know from
the pixels.

One mechanical catch: `page.mouse.wheel` only zooms if the pointer is already
over the canvas, because the listener is on the canvas rather than the window.
Call `page.mouse.move(x, y)` into the playfield first.

### The gate-6 review drive

```bash
STATION_SECONDS=8 node .claude/skills/run-game/scripts/drive.mjs --out /tmp/stations \
  --steps .claude/skills/run-game/scripts/stations.mjs
```

A ready-made `--steps` module that walks the five stations gate 6 specifies — base
opening, marquee selection, ping preview, survey zoom, and a fight with own
ordnance in the water — screenshotting each and printing a markdown table of
`__perspectiveProbe()` readings.

It prices the frame as three numbers, not one: the shipped interval, the conn
view's half, and the overlay's half. `window.__perspectiveStation(label)` is the
boundary between stations — it zeroes all three series and returns the reading
of the station it closed — so a worst case never leaks from one station into the
next. Hold each station for at least 240 frames or the average is a tail rather
than the station; `STATION_SECONDS` is that knob, and the table prints the frame
counts so a short station is visible rather than assumed.

**Frame times from this container are worthless and should never be recorded.**
The only rasteriser here is SwiftShader, and a drive of the five stations shows
why: the composited frame runs ~170 ms while both CPU halves inside it total
under 3 ms. The draw-call and triangle columns are real; the millisecond columns
are the software rasteriser. Real numbers need a real GPU, and gate 6 still owes a
Termux row (docs/graphics-standards.md gate 6); render-stack work is accepted on the
named desktop GPU without one ("Abyss Render Stack increment"). Even there the conn
and overlay columns are CPU time, conn being entity sync plus the GL submit. The gpu
column is the conn view's GPU time, every pass summed, from a timer query: a dev build
reads it on a GPU and refuses it on a software rasteriser, and the probe's `gpuTimer`
says which. Zero new draws is not zero shading cost, and that column is what shows it.
Gate 6 reads it at device pixel ratio 1 and 1.5; `VIEW_DPR=1.5` sets the second, and the
probe's `pixelRatio` and `drawingBuffer` say what was shaded. Read it **unpaced**:
`UNPACED=1` turns vsync off, because a GPU paced at 60 fps idles at a low clock and the
timer then measures the clock (docs/screenshots/issue-1001/README.md). Read it
**queued** too: unqueued, the timer also counts the GPU waiting for the browser to hand
over the frame's commands, which read a multi-pass frame at several times its work.
`__perspectiveGpuQueue(steps)` draws a fixed load before the frame's timer opens, and
`tools/render-stack/capture.mjs` and `halo-cost.mjs` take both readings and fail a load
that ran out first. An unpaced run's frame columns are no budget, so a frame-time drive
stays paced.

On a desktop with a GPU, drive **headed**. Headless Chromium may draw through SwiftShader
anyway, and `--channel msedge` (or `chrome`) uses an installed browser where no Playwright
browsers exist, which is how the first desktop row was taken on Windows:

```bash
STATION_SECONDS=8 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --out /tmp/stations --steps .claude/skills/run-game/scripts/stations.mjs
```

Where Playwright cannot reach — Chrome on a phone under Termux — paste
`scripts/stations-console.js` whole into the page's console instead, reached from a PC
through `edge://inspect/#devices` with USB debugging on. It walks the same five stations
through the mouse path (touch has no marquee, so a touch drive would ring one hull and
under-price `marquee`), prints the table, and copies the result as JSON to the inspecting
PC's clipboard. `window.__stationSeconds` shortens its fifteen-second dwell.

The table's `renderer:` line names the rasteriser, and a software one is flagged. **Run
nothing else while it drives.** A build rewrites `@echoes/shared/dist`, the backend's
`tsx watch` restarts, and the `fight` station ends on "No signal" with numbers that still
look like numbers.

### The render-stack camera pairs

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --out /tmp/render-after --steps tools/render-stack/capture.mjs
```

#974's paired set: home, close, low and survey cameras on the own force, each held for at
least 240 frames of both painters and asserted against gate 6's call, triangle and
environment budgets. `readings.json` lands beside the frames: the renderer string, whether
it is a software one, the viewport, and each camera's whole probe, `look`, `toneMapping`
and `environmentBytes` included, so a frame says which lighting path drew it. Use a map's
real id: an unknown `?map=` boots the default map without a word. The tutorial is
`?mission=prologue-sorrowgate`, and a before set is the same script against servers at the
base commit. Its header says what each millisecond field measures. It holds the fleet at
rest; gate 3's quiet-and-loud comparison is `tools/render-stack/lamps.mjs`, run the same
way against the dev server, which stages each state with the player's own keys.

A development study is a URL flag, so its on/off pair is one server with two URLs:
`&seabed-detail=1` adds the silt detail and seated stones (#1083), and `&dream-loop=1` the
whole #967 study, that ground included. Both are dead in a production build. A shader on a
material the frame already draws costs no call or triangle, so its pair is read unpaced
(`UNPACED=1`), where `avgGpuMs` and the `queued` reading are gate 6's.

### The esc menu's focus trap

```bash
node .claude/skills/run-game/scripts/drive.mjs --out /tmp/esc-focus \
  --url "http://localhost:5173/?mission=prologue-sorrowgate" \
  --steps .claude/skills/run-game/scripts/escFocus.mjs
```

A `--steps` module that holds `docs/ui-ux.md` §9.5's keyboard contract: focus is
moved into the dialog, every entry is reachable by Tab, arming lands on **Stay**
rather than on the leave, and nothing under the menu's glass can be reached in
either direction. Run it when the esc menu changes.

It lives here rather than in `npm test` because the two ends of that sentence
are unreachable in jsdom — it implements neither `inert`'s semantics nor
sequential focus navigation, and `@testing-library/user-event`'s `tab()` walks a
focusable list that does not filter on `inert`, so it would go green while Tab
walked onto a live control (#515). Where the menu *places* focus needs no
browser and is asserted in `packages/frontend/test/escMenu.test.ts`.

**The `?mission=` in that URL is load-bearing.** Nearly all of the HUD is Pixi
rather than DOM, and the contact log's rows are `disabled` until a contact has a
position, so a duel against nobody has *nothing* focusable under the glass and
the walk would pass without testing anything. The script counts the live
controls first and refuses to run on zero. A prologue drive finds nine.

One expected result that looks like a leak and is not: the walk passes through
`<body>` once per cycle. §9.5 promises focus cannot reach a **live control**,
and `inert` delivers that — with nothing else focusable left in the document the
browser hands focus to the document itself before wrapping back to the first
entry.

### The strip's explanations

```bash
node .claude/skills/run-game/scripts/drive.mjs --out /tmp/readouts \
  --steps .claude/skills/run-game/scripts/readoutGuards.mjs
```

A `--steps` module holding the half of [ui-ux.md](../../../docs/ui-ux.md) §2's readout
explanations (#724) that a runner cannot reach. Most of that contract is held in
`packages/frontend/test` — the lines themselves, the publish gate, the rule that a control
never covers a number which is not its own — and belongs there, because it needs no engine.

Five things do need one. The controls are refused when a readout runs off the **canvas**,
and the bound is the canvas rather than the strip's own 52 px because the SIG instrument
sits a couple of pixels below the strip's bevel: headless that box measures 51 px and fits,
in Chromium about 53 and it does not, the fonts not being the same ones. So a strip-height
bound drops §3's one permanent element *in the browser and nowhere else* — reintroduce it
and the whole suite stays green while this drive fails on its second line. `:focus-visible`
is likewise an engine's judgement about how the focus arrived rather than a flag a test can
set, and Tab order is sequential focus navigation, which jsdom does not implement — the
same bargain the esc menu's walk records above. So is the pointer route, which is the one
criterion 1 names first: the line is shown by `.readout-slot:hover`, a cascade reaching
through a layer that carries `pointer-events: none`, and a renderer that has no pointer and
builds no cascade can say nothing about it. And so is whether a line opens *above* what it
opens over — nothing in this HUD carries a `z-index`, so that is paint order, which is DOM
order, and only a hit test in an engine can ask about it. Three of the eleven readouts once
opened underneath the contact log and every headless check called them shown.

It walks §11's range — 75%, 100% and 200% — resetting the scale through `localStorage` and
resuming the same match from the title, so the strip carries the same figures at each. Run
it when the strip's layout or the explanation surface changes. Like `escFocus.mjs` it is
deliberately not part of `npm test`, and it fails loudly.

One thing it cannot see: a control laid over a number the strip drew but *refused* a
control. It reads the DOM, and the glyphs underneath are Pixi — that property is held
headlessly against the `Text` objects themselves.

## 3. Stop the servers

```bash
.claude/skills/run-game/scripts/dev.sh stop
```

Do not just kill whatever holds the port. `npm run dev` is a tree — npm
wrapper, `concurrently`, then `tsx watch` and vite supervisors — and killing
only the socket holder leaves supervisors alive that re-bind as soon as
anything touches `packages/shared/dist`. That is how you end up with several
generations of orphaned servers fighting over :3000. `dev.sh stop` signals the
whole process group, verifies both ports are actually free, and says so if
something survived. It deliberately never signals its own process group, so it
is safe even against a server someone started with a bare `npm run dev &`.

## Gotchas that will cost you time

**Readiness is two signals, not the port.** The client shows a `.game-overlay`
reading "Listening…" until the room answers; that overlay detaching means the
*server* was reached, and lands you in the lobby. The match is live only once
`.lobby` detaches, after a ready. Vite answering on :5173 only means Vite is
up; the canvas existing only means Pixi mounted. If the backend is unreachable
the overlay stays and reads "No signal", which the script reports rather than
timing out opaquely.

**The lobby is the one screen made of real DOM.** Everything else you can see
is drawn by Pixi, so selectors match nothing — but `.lobby-ready`,
`.lobby-faction`, `.lobby-roster-row` and `.result-rematch` are ordinary
buttons, and Playwright can read and click them normally. If you need a
specific navy, click its `.lobby-faction` card before readying; a card another
commander already holds is disabled, because uniqueness is enforced on the
server.

**A dropped connection is not the end of the run.** The client keeps its seat
for 90 s and re-takes it automatically, and it parks its reconnection token in
`sessionStorage`, so `page.reload()` resumes the same match rather than
starting a new one. That is worth knowing when a step reloads to clear state
and the state does not clear.

**Playwright is a global install, and it's CommonJS.** `import { chromium }
from 'playwright'` fails twice over: ESM ignores `NODE_PATH`, so the global
package doesn't resolve, and even by absolute path there's no named export.
`drive.mjs` resolves it through `createRequire` against `npm root -g`, which
handles both. The browsers themselves are already installed at
`PLAYWRIGHT_BROWSERS_PATH` — never run `playwright install`.

**Rebuild shared after touching it.** `dev.sh start` does this for you, but if
you restart only one workspace directly after editing `packages/shared`, run
`npm run build:shared` yourself first.

**A quiet match is normal.** With no opponent in the room the HUD reads
`0 contacts` and the map outside your own units stays dark. That is the game
working — the client is only ever sent what the server resolved for it. Don't
read it as a rendering failure.

**Screenshot timing.** The Echo Layer resolves at 5 Hz, so a screenshot taken
immediately after an action can land before the server has answered. The
default steps wait several hundred ms after each input for this reason; if a
contact or ping ring you expect is missing, wait longer before blaming the code.

Related: `CLAUDE.md` (build order, per-package import rules) ·
`docs/systems-echo.md` (what SIG and the ping radii mean) ·
`packages/frontend/src/game/EchoRenderer.ts` (input handling)
