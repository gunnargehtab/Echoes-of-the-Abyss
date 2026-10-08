Implement the change described below, end to end, on the branch you are already on.

**Work from this description alone.** Do not look the issue up on GitHub, and do not
read other branches, pull requests, or their diffs. The task is stated in full here.

---

## The sonar scope's sweep line reaches out of the minimap

The turning sonar sweep on the scope (the minimap in the PixiJS HUD) draws past the
scope's edge and over the console. Keep it inside the scope, and give the sweep a nicer
look while you are there.

### Acceptance criteria

1. Nothing the sweep draws leaves the scope's square, from any position inside it.
2. Frontend tests hold the geometry that keeps it inside.
3. `npm run gates` passes.
