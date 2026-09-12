Make the change described below, end to end, on the branch you are already on.

**Work from this description alone.** Do not read other branches, pull requests, or their
diffs, and do not look for an existing implementation of this anywhere.

---

## The lobby view is rebuilt five times a second to discover nothing changed

`packages/frontend/src/net/GameClient.ts` subscribes to the room's whole schema and pushes
a lobby view upward whenever anything in it moves:

```ts
room.onStateChange(() => this.pushLobby());
```

The schema carries `tick`, which advances five times a second for the whole match. So
`pushLobby` runs at 5 Hz forever. It defends itself by rebuilding the entire view, running
`JSON.stringify` over it, and comparing the result against `lastLobbyKey` to decide whether
anything a lobby cares about actually moved:

```ts
const key = JSON.stringify(view);
if (key === this.lastLobbyKey) return;
```

That is a workaround for subscribing too broadly, and the field comment says so. The roster
is at most four players, so the waste is small, but the shape is wrong: the client is
serialising a data structure two hundred times a minute to answer a question the state sync
already knows the answer to.

### What to change

Subscribe to **what the lobby actually depends on** rather than to the whole schema, so the
view is pushed when the roster or the fields it reads genuinely change, and not otherwise.
The lobby view depends on `phase`, `mapId`, `winnerSlot`, and the `players` collection,
including changes to a player already in it.

With that in place:

- `lastLobbyKey` and the `JSON.stringify` comparison go. Do not keep them as a second line
  of defence; if the subscription is right they are dead weight, and leaving them in hides
  whether it is right.
- The loose `as { phase?: ...; players?: Map<...> }` cast in `pushLobby` should no longer be
  necessary. Use the room's typed state.
- Unsubscribe whatever you subscribe when the client leaves or reconnects. A listener that
  outlives its room is a leak, and this client reconnects.

### Constraints

- `packages/frontend/test/gameClient.test.ts` must still pass. It drives a stand-in room
  from `packages/frontend/test/support/colyseusStub.ts`, which today models only the coarse
  whole-state callback. Extend the stub as far as the new subscription needs, and add
  coverage for the behaviour you are introducing: that a change the lobby cares about pushes
  a view, and that a tick on its own does not.
- Use the Colyseus client API as it exists in the version this repository has installed.
  Check it rather than recalling it.
- Nothing about the wire protocol changes, and nothing on the server changes.

---

Finish by running `npm run gates` and getting it to pass. Then commit and push the branch.

Do not open a pull request, do not assign or comment on any issue, and do not push to any
branch other than the one you are on. This branch is not for review.
