Implement the change described below, end to end, on the branch you are already on.

**Work from this description alone.** Do not look the issue up on GitHub, and do not
read other branches, pull requests, or their diffs. The task is stated in full here.

---

## Per-room exception containment

`MatchRoom` defines no `onUncaughtException`, and Colyseus gates its entire wrapping
mechanism on that hook merely existing:

| what Colyseus wraps | where | gated on |
| --- | --- | --- |
| every `onMessage` handler | `Room.js:282` | `this.onUncaughtException !== void 0` |
| `setSimulationInterval` | `Room.js:168-169` | same |
| `clock.setTimeout` / `setInterval` | `Room.js:659-666` | same |
| `onCreate`, `onAuth`, `onJoin` | `Room.js:669-675` | same |

So every one of those is unwrapped today. What catches a throw instead is Colyseus's own
`registerGracefulShutdown`, which installs `process.on("uncaughtException")` and ends by
disposing every room and exiting. One throw anywhere in one room ends every concurrent
match on the box.

The surface the hook would cover: **32** registered client-message handlers, **1**
`setSimulationInterval` (the 60 Hz step), and **2** `clock.setTimeout` (the post-match
timers).

### What to implement

**Log and drop.** Implement `onUncaughtException(err, methodName)`. For `onMessage`, log
room id, tick, phase and the message name, and drop the message. For
`setSimulationInterval`, end that one room: a step that threw mid-mutation has a torn
world and a state hash that no longer means anything, so limping is worse than stopping.

Two calls are already settled, so do not re-open them:

- A contained exception **drops the message** rather than ejecting the sender. Dropping is
  consistent with every other server-side refusal in this room, and ejecting would kick a
  legitimate player over a client-side bug.
- The `setSimulationInterval` branch **ends the room without announcing anything**.
  Announcing would be a twelfth `SERVER_MSG` and a new way a match can end, which makes it
  a design change rather than a patch.

### Acceptance criteria — all six are binding

1. `MatchRoom` defines `onUncaughtException`, so Colyseus wraps all 32 handlers, the
   simulation interval and both clock timers.
2. A handler that throws ends that message, not the process, and not the room — asserted
   by a test that registers a throwing handler and shows the room still stepping
   afterwards.
3. A throw inside the simulation interval ends that room and no other, asserted with two
   rooms alive.
4. Neither budget's counted work moves: `Match.worstStepWork` and
   `Match.contactPathWalksLastPass` are unchanged. The hook adds no per-message work —
   Colyseus's wrapper is a try/catch, not an inspection.
5. Whatever the hook logs is enough to find the throw: room id, tick, phase, and the
   method name Colyseus passes.
6. `MatchRoom` has a test file. It is the server half of the wire contract and nothing
   imports it today.

---

Finish by running `npm run gates` and getting it to pass. Then commit and push the branch.

Do not open a pull request, do not assign or comment on any issue, and do not push to any
branch other than the one you are on. This branch is not for review.
