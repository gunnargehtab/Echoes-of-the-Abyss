# Opt-in Dream Loop

`dream-loop/` is the [upstream dream-loop skill](https://github.com/achimala/dream-loop/tree/9bddb901f7d071cfefdd21e264267c757177a9df)
at commit `9bddb901f7d071cfefdd21e264267c757177a9df` (MIT; see
[`LICENSE`](dream-loop/LICENSE)). The upstream README and demo GIF are not
needed to run the skill and are not copied. The only local changes to its
instructions repair the two `fal.md` links in each `assets-3d.md` file; those
lines are marked `LOCAL` in place. The workflows and scripts are otherwise
unchanged.

This directory is **not** a Copilot skill discovery directory. Nothing here is
loaded at startup unless you explicitly register it. The normal
[`dev-loop`](../.claude/skills/dev-loop/SKILL.md) remains the workflow for changes
to Echoes; use this skill for an isolated visual prototype, not to replace the
design bible, approved models, graphics gates or the three-round limit on a
repository change.

## Activate for a prototype

From the repository root, register the parent directory containing the skill:

```powershell
copilot skill add .\optional-skills
```

In an open Copilot CLI session, run `/skills reload` and
`/skills info dream-loop`. Start with a prompt such as:

> Use the /dream-loop skill's Pro workflow for an isolated visual prototype.
> Use the approved target image at `.dream-loop/target.png`. Do not replace
> approved Echoes assets or change the shipped game as part of this prototype.

You may instead explicitly choose the Plus workflow. Upstream accepts a
user-supplied target or generates one if an image-generation tool is available;
approve a generated target before treating it as a design for this repository.
If no image generator is connected, provide the image rather than assuming
Copilot can create it. The upstream 3D-asset workflow may call Fal, a paid
external service that receives source images: authorize that separately before
using it. Keep API keys out of the repository. Scratch images and job records
go in the ignored `.dream-loop/` directory.

## Deactivate

Registration persists in your personal Copilot settings and would make the
skill available on future startups. When finished, run from the repository
root:

```powershell
copilot skill remove .\optional-skills
```

Run `/skills reload` in any open session. The vendored files remain here for a
later opt-in run; the normal skills never need to load this one.

To update it, review a newer upstream commit and copy its `SKILL.md`,
`references/`, `scripts/` and `LICENSE` together, reapply the four `LOCAL` link
fixes if still needed, then update the pinned commit above. Do not use
`copilot skill add` on the single `SKILL.md`: that copies only one file and
loses its workflow references and scripts.
