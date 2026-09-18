Implement the change described below, end to end, on the branch you are already on.

**Work from this description alone.** Do not look the issue up on GitHub, and do not
read other branches, pull requests, or their diffs. The task is stated in full here.

---

## The top HUD strip's readouts should explain themselves

`EchoRenderer` draws the top strip as PixiJS text (`NODULES`, `BERTHS`, `DRAW`, `SIG`, band,
clock, contact count) and the numbers are correct but unexplained to first-time players.

Add explanations for each strip readout that are reachable by pointer and keyboard, and by
a touch route that does not mention unavailable keys. Keep the strip as canvas-drawn HUD,
with the explanation surface accessible through the existing shell route.

### Acceptance criteria

1. The strip's readouts expose explanations with pointer + keyboard access.
2. Touch receives the same information through a touch-native route.
3. The implementation has frontend tests asserting explanation content.
4. `npm run gates` passes.

---
