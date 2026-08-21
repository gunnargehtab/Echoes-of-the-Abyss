---
name: run-game
description: Launch Echoes of the Abyss and drive it in a headless browser to see the game actually running — dev servers, a real match, and screenshots of the rendered Echo Layer. Use this whenever you need to run, start, launch, open, or play the game, take a screenshot of it, reproduce a gameplay bug, or confirm that a renderer, HUD, netcode, or simulation change works in the real client rather than only in tests. Prefer this over improvising a Vite/Playwright setup by hand.
---

# Running Echoes of the Abyss

The game has no menu and no login. The client auto-joins a Colyseus room, gets
assigned a slot and faction, and drops you straight into a live match — so
"running it" is just: bring up both servers, point a headless Chromium at the
dev server, and look at what rendered.

Looking at the screenshot is the point. This is a game about hidden
information, and a black frame, an empty HUD, or a stuck "Listening…" overlay
are all things a passing exit code will happily hide from you.

## 1. Start both servers

```bash
.claude/skills/run-game/scripts/dev.sh start
```

This clears any leftover servers, starts the tree in its own session, and
returns only once **both** :5173 (Vite) and :3000 (Colyseus) answer. It also
rebuilds `@echoes/shared` on the way, which matters because the other two
packages import its `dist/` — skipping that produces confusing type and
resolution errors.

Use the script rather than a bare `npm run dev &`. Two reasons, both of which
bite in practice: the servers must be stoppable as a unit (see step 3), and a
plain `curl` readiness check cannot tell *your* backend from a **stale one left
over from a previous run** — the probe goes green while your own backend is
still crash-looping on `EADDRINUSE`. `dev.sh start` clears the ports first, so
a green result can only mean the server it just started.

`dev.sh status` reports what holds each port. Server output goes to
`/tmp/echoes-dev.log`, with both sides interleaved under `[frontend]` and
`[backend]` prefixes.

## 2. Drive it

```bash
node .claude/skills/run-game/scripts/drive.mjs --out /tmp/run-game
```

The default run is the smoke test worth having: connect, select a unit, fire
active sonar, and screenshot each step. It exits non-zero if the client never
joins a match or if anything hit the browser console, and prints the path of
each screenshot as `shot: <path>` — read those paths from the output rather
than assuming the ones written here, since `--out` moves them.

**Then actually open the screenshots.** What a healthy first frame looks like:

- A top bar with `NODULES`, a `SIG` bar, and a contact count.
- An amber hub with outbuildings and a handful of unit glyphs.
- The minimap bottom-left, a BUILD bar along the bottom.

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

| Input | Effect |
| --- | --- |
| Left click | Select nearest owned unit or structure (shift adds) |
| Right click | Context order — move, or attack/harvest a contact under the cursor |
| Middle drag / wheel | Pan / zoom |
| `P` | Active sonar ping |
| `Space` | Toggle silent running |
| `V` | Cycle throttle |
| `R` / `F` / `T` | Arm a build (then left click to place) |
| Hold `Shift` | Preview what a ping would cost you |
| `Escape` | Cancel a pending build |

Keys other than build hotkeys need a selection first, which is why the examples
click before they press.

**Prefer keys to clicks — there is nothing to select against.** The page is one
canvas and about 17 DOM elements; `document.body.innerText` is empty, and the
HUD you can see (the `BUILD` / `UNITS` / `SQUAD` tabs, `SILENT`, `PING`, the
build buttons) is drawn by Pixi, not rendered as DOM. So `page.click('text=PING')`
matches nothing, and every Playwright selector strategy is unavailable by
construction. Keyboard shortcuts do the same work and are the only stable
handle.

When you genuinely need a click, remember the coordinates are load-bearing:
`(655, 484)` assumes `drive.mjs`'s **1440×900** viewport, in which the playfield
spans roughly x 390–1355 with the HUD drawn over the dark bands either side.
Change the viewport and those coordinates click empty water. Unit selection is
forgiving — it picks the *nearest* owned entity rather than hit-testing a
sprite, so landing anywhere near the friendly cluster works. HUD button
positions are not forgiving: they shift with the active tab and with how many
buttons the current selection produces, so drive those through their shortcuts
instead of guessing pixels.

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

**Readiness is the overlay, not the port.** The client shows a `.game-overlay`
reading "Listening…" until the room assigns it a slot. Vite answering on :5173
only means Vite is up; the canvas existing only means Pixi mounted. The overlay
becoming detached is the one signal that means a match is live, and it's what
`drive.mjs` waits for. If the backend is unreachable the overlay stays and
reads "No signal", which the script reports rather than timing out opaquely.

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
