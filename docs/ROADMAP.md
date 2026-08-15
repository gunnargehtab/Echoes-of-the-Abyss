Project Roadmap — Echoes of the Abyss

Overview

This roadmap scopes the first sprint of work to establish core design docs, infra, and a minimal frontend prototype. Items are ordered for implementation priority, owners and estimated effort are suggested for planning.

Milestones

1) Project setup & planning (3–7 days)
   - Define owners & roles (Project Lead, Tech Lead, Design Lead) — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/14>
     Acceptance: Owners assigned in ROADMAP.md or GitHub team; responsibilities documented.
   - Set up project board (GitHub Projects / Kanban) — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/15>
     Acceptance: Board exists with columns Backlog / To do / In progress / Review / Done and current issues added.
   - Create CONTRIBUTING.md and contributor quickstart — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/16>
     Acceptance: CONTRIBUTING.md added with PR, branching, and review guidelines; links to DEVELOPER_QUICKSTART.md.
   - Add GitHub labels & issue/PR templates — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/17>
     Acceptance: Label set published and templates present in .github/.
   - Define branching & commit guidelines (main, feature/*) — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/18>
     Acceptance: Guidelines in CONTRIBUTING.md.
   - Schedule kickoff meeting & set up communication channel (Slack/Discord) — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/19>
     Acceptance: Calendar event scheduled and meeting notes posted to docs/.
   - Timeline: aim to complete within 3–7 days.
   - Deliverables: CONTRIBUTING.md, project board link, label list, meeting notes.

2) Canonical definitions (3–7 days)
   - Review & finalize glossary (audit examples, remove inconsistencies) — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/20>
     Acceptance: glossary.md reviewed, examples added, and inconsistent terms resolved across docs.
   - Add glossary cross-links & references across docs — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/21>
     Acceptance: all core docs link to glossary.md and use canonical terms.

3) Design foundation (1–2 weeks)
   - Expand units.md with detailed stats, cost, and playtest plan — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/22>
     Acceptance: units.md contains stat tables, SIG/PR interactions, and example loadouts.
   - Create unit playtest checklist & data capture format — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/23>
     Acceptance: checklist and JSON/CSV schema added to docs/playtests/.

4) Engineering scaffold (1 week)
   - Add example scene & input handling to client — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/24>
     Acceptance: client/src/examples shows entity rendering and basic input; developer can run it locally.
   - Integrate client build into CI — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/25>
     Acceptance: CI runs client build and fails on build errors.

5) Prototype & validation (1–2 weeks)
   - Add echo-sim scenarios & datasets for deterministic tests — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/26>
     Acceptance: scenarios in tools/echo-sim/scenarios/ with expected outputs for tests.
   - Document echo-sim usage & convert to module for testing/integration — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/27>
     Acceptance: tools/echo-sim/README.md + exported functions for test harness.

6) Quality & developer UX (continuous)
   - Add ESLint & Prettier and enable checks in CI — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/28>
     Acceptance: ESLint/Prettier configs present and CI enforces style on push/PR.
   - Add markdownlint and docs checks to CI — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/29>
     Acceptance: markdownlint runs in CI and reports issues.
   - Refine README & developer quickstart — Issue: <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/30>
     Acceptance: README and DEVELOPER_QUICKSTART.md polished with troubleshooting and platform notes.

Notes

- Dependencies: draft-units depends on write-glossary; echo-sim depends on scaffold-frontend.
- Reassess estimates after the first week and create issues for any sub-tasks.

Related: Epic — <https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/13>
