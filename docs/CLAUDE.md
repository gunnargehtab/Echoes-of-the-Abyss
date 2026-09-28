# docs/CLAUDE.md

What binds writing in the design bible only. It loads for a session working here; the root
`CLAUDE.md` keeps what binds two or more directories, including the rule that these docs
are canonical and the code transcribes them. `docs/README.md` is the bible's index, and its
"Editing rules" are the full set.

- `docs/glossary.md` is authoritative. A term meaning two things is resolved there first,
  then fixed everywhere.
- **Never link a doc that does not exist.** The `docs/` link check is blocking, so planned
  work goes in `docs/README.md`'s "Planned / Not Yet Written" as plain text. The same
  check is why nothing here links a vendored skill under `.claude/skills/`.
- Cross-link rather than restate. Every doc ends with a "Related" section.
- Use concrete numbers: "45 SIG while idle with systems live", not "moderate SIG".
- Prose, not code: Prettier stays out of this directory, and markdownlint and the link
  check (`npm run gates` runs both) are what hold it.

Related: `CLAUDE.md` (the root file — the balance freeze, SPEC and TUNABLE constants) ·
`docs/README.md` (the index and its editing rules) · `CONTRIBUTING.md` (docs conventions)
