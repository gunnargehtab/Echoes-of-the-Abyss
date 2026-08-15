Playtest Checklist — Unit Tests & Balancing

Purpose
- Provide a short checklist for unit playtests and a standard CSV/JSON capture schema for reproducible balancing sessions.

Checklist
1. Scenario name and seed: record map, biome, PF, and random seed.
2. Participants: faction, unit list, counts, and commander abilities used.
3. Objectives: win conditions (kill all, capture node, survive time T).
4. Runs: perform N ≥ 10 runs per scenario; keep seed or vary systematically.
5. Instrumentation: enable event logging (see schema below).
6. Observations: note emergent behaviours, outliers, and fixes attempted.
7. Post-run analysis: aggregate detection events, losses, resource delta, and echo mark usage.

CSV capture schema (recommended columns)
- timestamp, run_id, scenario, seed, actor_id, actor_faction, actor_type, event_type, SIG, PF, HYD, distance, tier, position_x, position_y, position_z, hp, resource_delta, note

JSON schema (example event)
{
  "timestamp": "2026-08-15T03:00:00Z",
  "run_id": "run-001",
  "scenario": "Scout-Ambush",
  "seed": 42,
  "actor": {
    "id": "unit-17",
    "faction": "Pelagia",
    "type": "Light Scout"
  },
  "event_type": "detection",
  "SIG": 12,
  "PF": 0.55,
  "HYD": 30,
  "distance": 380,
  "tier": 2,
  "position": {"x": 123.4, "y": -45.1, "z": 12.0},
  "hp": 40,
  "resource_delta": 0,
  "note": "first passive bearing"
}

Notes
- Use ISO-8601 timestamps and consistent run_id naming (e.g., test-scenario-YYYYMMDD-001).
- Keep CSV for quick spreadsheet analysis; use JSON for nested events or complex metadata.
- Record audio mix levels if evaluating player perception (optional).

Related
- docs/units.md — playtest plan examples
- docs/glossary.md — authoritative terms (SIG, PF, HYD, PR)
