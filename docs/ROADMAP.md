Project Roadmap — Echoes of the Abyss

Overview

This roadmap scopes the first sprint of work to establish core design docs, infra, and a minimal frontend prototype. Items are ordered for implementation priority, owners and estimated effort are suggested for planning.

Milestones

1) Project setup & planning (1 week)
   - Create project roadmap (owner: @owner) — Issue #8
   - Define owners, priorities, and missing docs map

2) Canonical definitions (1 week)
   - Write glossary.md (SIG, PF, PR, resolution tiers) — Issue #6

3) Design foundation (1-2 weeks)
   - Draft units.md (unit roster & stats) — Issue #7
   - Ensure unit stats reference glossary terms and echo/depth systems

4) Engineering scaffold (1 week)
   - Scaffold frontend starter (TypeScript + PixiJS, Vite) — Issue #9

5) Prototype & validation (1-2 weeks)
   - Prototype echo layer simulation (node) — Issue #10
   - Use prototype to validate detection tiers and SIG math

6) Quality & developer UX (continuous)
   - Add CI and linting (ESLint/Prettier, docs checks) — Issue #11
   - Update README with developer quickstart — Issue #12

Notes

- Dependencies: draft-units depends on write-glossary; echo-sim depends on scaffold-frontend.
- Reassess estimates after the first week and create issues for any sub-tasks.

Related: Epic — https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/13
