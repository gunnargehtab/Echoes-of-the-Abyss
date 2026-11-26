Implement the change described below, end to end, on the branch you are already on.

**Work from this description alone.** Do not look the issue up on GitHub, and do not
read other branches, pull requests, or their diffs. The task is stated in full here.

---

## preflight passes a dependency that resolves outside its declared range

### What happened?

`npm run preflight` passed while the client served three r169. `packages/frontend/package.json` asks `three ^0.187.0`, installed as `packages/frontend/node_modules/three`. That directory was missing here. The root's `three` 0.169.0, pinned for the tools, satisfied the presence walk in `tools/preflight-deps.mjs`, and Vite resolved it too. Every run from that checkout drew r169 until `npm ci`.

### Expected behavior

Preflight fails when a declared dependency resolves to a version outside its declared range. Its header calls in-range drift npm's business, and this drift was out of range.

### Steps to reproduce

1. `mv packages/frontend/node_modules/three /tmp/three-r187`
2. `npm run preflight`: it passes.
3. `npm run dev`: Vite serves `REVISION = "169"`.

### Acceptance criteria

1. `npm run preflight` fails on the steps above, and passes once the copy is put back.
2. A test holds it, and a gate runs that test.
3. `npm run gates` passes.
