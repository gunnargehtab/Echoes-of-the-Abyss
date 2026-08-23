---
name: run-game
description: Launch Echoes of the Abyss and drive it in a headless browser to see the game actually running — dev servers, a real match, and screenshots of the rendered Echo Layer. Use this whenever you need to run, start, launch, open, or play the game, take a screenshot of it, reproduce a gameplay bug, or confirm that a renderer, HUD, netcode, or simulation change works in the real client rather than only in tests. Prefer this over improvising a Vite/Playwright setup by hand.
---

# Running Echoes of the Abyss

The game has no login and no room browser. The client auto-joins a Colyseus
room and lands in a **lobby**: pick a navy, ready up, and the match starts. So
"running it" is: bring up both servers, point a headless Chromium at the dev
server, ready up, and look at what rendered.

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

**Then actually open the screenshots.** What a healthy first frame looks like:

- A top bar with `NODULES`, a `SIG` bar, and a contact count.
- An amber hub with outbuildings and a handful of unit glyphs.
- The minimap bottom-left, and `BUILD` / `UNITS` tabs over a build bar along
  the bottom. (A third `SQUAD` tab appears only once something is selected, so
  its absence on the first frame is correct.)

Judge it on whether a match rendered, not on a checklist of rings. Signature
radius rings are sized to each unit's current SIG, so a quiet unit legitimately
has no visible ring, and non-unit things like resource nodules are ringed too.

The clearest single indicator that input reached the server and came back is
the **SIG bar changing colour** — amber around 40 at rest, full red at 95 the
instant a ping fires, then decaying. If that happens, the whole loop works.

### Driving something else

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

The controls, all handled on the canvas by `EchoRenderer`:

| Input | Effect | Needs a selection? |
| --- | --- | --- |
| Left click | Select nearest owned unit or structure (shift adds) — **unless a build is armed, which swallows the click to place it** | no |
| Right click | Context order — move, or attack/harvest a contact under the cursor | yes |
| Middle drag | Pan | no |
| Wheel | Zoom about the cursor | no |
| `R` / `F` / `T` | Arm a refinery / foundry / turret, then left click to place | no |
| `1`–`5` | Produce scout / corvette / cruiser / submersible / harvester | yes |
| `P` | Active sonar ping | yes |
| `Space` | Toggle silent running | yes |
| `V` | Cycle harvest throttle | yes |
| Hold `Shift` | Preview what a ping would cost you | yes |
| `Escape` | Cancel a pending build — handled before every other key, so it is safe to press unconditionally | no |

The "needs a selection" column is the thing that catches people: `EchoRenderer`
returns early on most keys when nothing is selected, so a bare `page.keyboard
.press('KeyP')` on a fresh connect silently does nothing. Click a unit first.
Build and production keys are the exception in opposite directions — `R`/`F`/`T`
work with nothing selected, while `1`–`5` route through a structure that can
build the unit and so need one.

**There is nothing to select against, so commands go through the keyboard.**
The page is one canvas and about 17 DOM elements; `document.body.innerText` is
empty, and the HUD you can see (the `BUILD` / `UNITS` / `SQUAD` tabs, `SILENT`,
`PING`, the build buttons) is drawn by Pixi, not rendered as DOM. So
`page.click('text=PING')` matches nothing, and every Playwright selector
strategy is unavailable by construction.

Clicks are still how you *select* and *place* — there is no keyboard equivalent
for either — so the pattern is click to choose a target, then press a key to
act on it. What to avoid is clicking HUD **buttons**: they shift with the active
tab and with how many buttons the current selection produces, so a pixel that
hits `PING` in one frame hits `SILENT` in the next. Their shortcuts don't move.

Coordinates are load-bearing. `(655, 484)` assumes `drive.mjs`'s **1440×900**
viewport, in which the playfield spans roughly x 390–1355 with the HUD drawn
over the dark bands either side; change the viewport and those coordinates
click empty water. Two things make this less fragile than it sounds: unit
selection picks the *nearest* owned entity rather than hit-testing a sprite, so
landing anywhere near the friendly cluster works, and the minimap is a fixed
bottom-left rectangle you can click or drag to jump the view.

Identifying *which* glyph is which is the genuine gap — the silhouettes are
faction shapes, not labels. Select one and read the inspector panel that
appears bottom-right; it names the unit (`Light Scout`, `Harvester`) along with
hull, SIG, and throttle. Expect to select-and-check rather than to know from
the pixels.

One mechanical catch: `page.mouse.wheel` only zooms if the pointer is already
over the canvas, because the listener is on the canvas rather than the window.
Call `page.mouse.move(x, y)` into the playfield first.

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
