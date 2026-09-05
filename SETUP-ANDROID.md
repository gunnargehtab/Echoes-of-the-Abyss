# Running on Android

The whole game runs on the phone — Colyseus server and all. There is no host
machine, no Wi-Fi pairing, and no network access required once installed: the
client connects to a server running in the same device's userspace.

This works because the browser client already speaks touch (tap to select, tap
the map to order, drag to pan, pinch to zoom) and puts everything else on the
bottom command bar, so nothing needs a keyboard.

## Install

**1. Termux, from F-Droid** — <https://f-droid.org/packages/com.termux/>

Not the Play Store build. That one has been unmaintained since 2020 (Android's
API-level policy broke its package installer) and will fail at `pkg install`.
The [GitHub releases](https://github.com/termux/termux-app/releases) are also
current if you prefer them.

**2. Node and git, inside Termux:**

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
node -v          # must be 22 or newer
```

Node 22+ is a hard requirement — the backend uses `node --import tsx` and the
stable `node:test` runner ([CLAUDE.md](CLAUDE.md)). If `nodejs-lts` is behind,
`pkg install nodejs` tracks current instead.

**3. Clone and install:**

```bash
git clone https://github.com/gunnargehtab/Echoes-of-the-Abyss.git
cd Echoes-of-the-Abyss
npm ci
```

Expect a few minutes. Nothing here compiles native code: esbuild and rollup
both publish prebuilt `android-arm64` binaries, and the only native optional
dependencies (`fsevents`, `msgpackr-extract`) are skipped or fall back to pure
JS.

## Verify the install

Before playing, prove the deployment works with one command:

```bash
node tools/android-check.mjs
```

It checks the Node version, that `npm ci` completed, builds `@echoes/shared`,
runs the full test suite, then boots the real server tree, probes both ports,
and shuts it down cleanly. Every check prints `ok` or `FAIL` with the fix,
and the whole thing exits non-zero if the phone cannot run the game — so it
also works as a pass/fail gate after a `git pull`.

`--quick` skips the test suite if you only want the boot check. Expect the
full run to take a few minutes on a phone; the server boot alone is allowed
up to three minutes because the first boot rebuilds `@echoes/shared`. If a
check fails, the symptom table below has the common causes.

## Play

```bash
termux-wake-lock   # optional; keeps Android from suspending the server
npm run dev
```

Then open **<http://localhost:5173>** in Chrome on the same phone.

`npm run dev` builds `@echoes/shared`, then runs the backend on `:3000` and the
Vite client on `:5173` together. Leave Termux running in the background while
you play — swiping it away kills the match. `termux-wake-lock` (from
`pkg install termux-api`) stops Android from suspending it when the screen
locks; `termux-wake-unlock` releases it afterwards.

To play against a second commander, open a second browser tab on the same
address. The win condition — destroy the enemy Bastion — needs two players; with
one tab you have the map to yourself for testing the economy and base building.

## Touch controls

| Gesture | Action |
| --- | --- |
| Tap a unit or structure | Select it |
| Tap the map with a selection | Context order — nodule field harvests, heard contact attacks, open water moves |
| Drag | Pan |
| Pinch | Zoom |
| Tap the sonar scope | Jump the camera there; drag to scrub |
| **BUILD** tab | Refinery / Foundry / Sentinel Turret — then tap a site to place |
| **UNITS** tab | Queue any hull; the order routes to a Foundry automatically |
| **SQUAD** tab | Silent Running, active sonar ping, harvest throttle |
| **✕** | Clear the selection (tapping open water is a move order, not a deselect) |

Buttons dim when you cannot afford them.

## If something goes wrong

| Symptom | Cause |
| --- | --- |
| `pkg install` fails outright | Play Store Termux. Uninstall it, use the F-Droid build. |
| `Unsupported engine` / odd syntax errors | Node older than 22. Check `node -v`. |
| `EADDRINUSE` | A previous run is still alive: `pkg install lsof && lsof -ti:3000 -sTCP:LISTEN \| xargs kill` |
| Server dies while you play | Android suspended Termux. Use `termux-wake-lock`, and keep the notification alive. |
| `npm ci` killed mid-install | Out of memory. Close other apps and retry; npm resumes from cache. |

## Alternative: from a computer on the same Wi-Fi

If you would rather not build on the phone, run it on a computer and open it
over the LAN:

```bash
npm -w packages/frontend run dev -- --host       # prints a Network: URL
CORS_ORIGIN=http://192.168.1.20:5173 npm -w packages/backend run dev
```

Open the `Network:` URL on the phone. The client needs no configuration — the
backend binds all interfaces, and the client derives its WebSocket endpoint from
whatever host served the page — but the server does need one thing: with
`CORS_ORIGIN` unset it accepts loopback origins only, and a page served over the
LAN is not loopback. Give it the exact `Network:` URL Vite printed, scheme, host
and port. The server logs the origins it applied as it starts, and a mismatch
shows up in the browser console as a CORS error naming the origin it refused.

Running on the phone itself needs none of this: the page is served from
`localhost`, which is the default. See [SETUP.md](SETUP.md) for the full
variable.

## Related

- [SETUP.md](SETUP.md) — full development setup and architecture notes
- [README.md](README.md) — what the game is
- [docs/art-direction.md](docs/art-direction.md) — the HUD layout these controls drive
