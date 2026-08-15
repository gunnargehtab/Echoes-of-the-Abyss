# World Map — Echoes of the Abyss

Purpose
-------
This document defines the canonical world map for Echoes of the Abyss: macro regions, depth bands, biomes (with propagation factors), and named landmarks. It seeds level design, narrative placement, and gameplay-experiments (where Resonance Crystals, Hazards, and faction territories go).

Overview
--------
Maps are vertical-first: every horizontal region is layered into three primary depth bands (Shelf, Mid-Water, Abyssal). World geography guides resource distribution and strategic choke points while the Echo Layer (acoustic fog) and Propagation Factors (PF) determine information flow.

Scale & Grid
-----------
- Suggested base grid: hex tiles, 200 m edge length (adjustable).
- Map size: 60×40 hexes (playable sample), optional campaign world: 240×160 hexes.
- Depth resolution: continuous but binned for design into Shelf (0–400 m), Mid-Water (400–1,800 m), Abyssal (1,800+ m).

Depth Bands (design intent)
---------------------------
- Shelf (0–400 m): low-value, exposed, PF modifiers tend to favor concealment for the Commune.
- Mid-Water (400–1,800 m): contested; balanced resource distribution and mixed PF.
- Abyssal (1,800+ m): highest value (Resonance sites), highest pressure risk; Directorate advantage.

Biome catalog (example entries)
-------------------------------
- Thermal Veins — PF 0.45: vents mask SIG, muffles some emissions; Consortium quieter here.
- Kelp Forest — PF 0.55: stealth biome; obstructions reduce bearing accuracy.
- Trenches — PF 1.60 axial: sound travels far; high detection ranges, no secrets.
- Resonance Fields — PF 0.70 scattered: bearings mislead; false pings common.
- Coral Ruins — PF 0.80 occluded: tactical cover with occlusion pockets.

Key Locations & Landmarks
-------------------------
- The Mouth — major funnel between surface basins; strategic choke and lore anchor.
- Pelagion Rift — tectonic scar, resource-rich mid-water upwellings.
- Resonance Crystal Fields — Abyssal vaults giving match objectives.
- Thermal Vent Clusters — localized gameplay modifiers (PF shifts, hazards).
- Trench Axis — long-range listening corridor; changes the Echo Layer calculus.

Map Layout Guidelines
---------------------
- Place at least one high-value Abyssal objective per quadrant to encourage deep commitment.
- Interleave vents and trenches to create risk/reward corridors.
- Use PF variation to create asymmetric faction advantages per biome.

Visual & Asset Notes
--------------------
- Follow art-direction (docs/art-direction.md) for palette and silhouette language.
- Provide an SVG sketch and a layered PNG (terrain / depth overlay / PF heatmap / POIs).

Prototyping formats
-------------------
- Design doc (this file) — canonical
- SVG sketch — hand-labeled map for art and level design
- JSON tilemap — tiles with biome, PF, depth band for prototyping (example schema below)

Example tile schema (prototype)
{
  "x": 0, "y": 0, "depth_band": "mid-water", "biome": "kelp_forest", "PF": 0.55, "poi": null
}

Related
-------
- systems-echo.md — acoustic fog rules
- systems-depth.md — depth and pressure mechanics
- environments.md — biome design details

Next steps
----------
1. Create an SVG sketch of the world map (labels + depth contours).
2. Produce a prototype JSON tilemap for a 60×40 test arena.
3. Add placeholder PNG layers in docs/concept-art/ for visual review.

Document history
----------------
- 2026-08-15 — initial seed by design.
