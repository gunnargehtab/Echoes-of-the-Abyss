/**
 * #1016's measurement, as a run-game `--steps` module: the colour a fully
 * fogged far seabed fades to, against the water backdrop at the same depth.
 * The two should be one colour, because the fog fades a fragment into the
 * water it stands in and the backdrop paints that same water ramp
 * (packages/frontend/src/game/water.ts). Then #1023's: the edge the two leave
 * where they grade different depths.
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/fog.mjs
 *
 * A close, low camera looks west along Ventfront's north trench (x 0-8000 m,
 * z 0-1000 m, floor 2,900 m). At a 250 m dolly the reach floors at 900 m, so
 * the far trench is at least 99.9% fog, and north of it the rays leave the map
 * and show backdrop. The focus is pinned to 2,800 m, so the backdrop's anchor
 * is a number the probe reports rather than a seabed sample. Pixels are sorted
 * into the two classes by casting each one's ray against the trench floor, and
 * only backdrop rays graded 2,860-2,940 m are kept: that band and the floor
 * encode to one 8-bit colour.
 *
 * The edge is the same camera with the focus raised to 700 m, the plateaus'
 * floor, so the backdrop is anchored where a base's is while the far ground is
 * still the trench. The fog reads the fragment's depth and not the focus, so
 * the trench side should not move; the backdrop side is graded from 700 m by
 * the ray. Each column where the far trench meets the backdrop gives one pair.
 * The backdrop sample is the first pixel above the silhouette whose ray clears
 * the map's edge by the trench's 40 m of relief, and one row more for the
 * edge's antialiasing; the trench sample is three rows below the silhouette.
 * Only the stretch of edge where both the floor and the skirt are flat counts.
 *
 * The frame is read with readPixels inside the animation frame that drew it,
 * since the conn canvas keeps no drawing buffer; that also leaves out the HUD
 * canvas and its 1 px grain, which a screenshot carries. Medians, because
 * marine snow and stipple add sparse bright points to both classes. Writes
 * fog.json beside the review frames, then fails when any channel of the two
 * seam medians differs by more than one level, when the edge's trench side
 * moved with the focus, or when the edge is gone (docs/free-camera.md Phase 5
 * quotes it). Not a gate.
 *
 * At 2,900 m both colours are nearly black, so the measured frame shows the
 * fix least. A review frame comes first, before any assert can stop the run:
 * the same dolly and pitch looking west across the west plateau (floor 700 m)
 * to the map edge, where the far ground is fogged in brighter water.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The frontend's own numbers, restated because this runs in plain Node:
// DEPTH_VISUAL_M_PER_M (perspectiveTerrain.ts), BACKDROP_SPAN_M (water.ts),
// FOV_DEG (PerspectiveView.ts), SWAY.HEAVE (cameraSway.ts) and the trench's
// relief amplitude (seabed.ts, BIOME_RELIEF), which detailM adds as noise in
// ±1. The eye-depth assert below fails if the first moves.
const M_PER_M = 0.22;
const BACKDROP_SPAN_M = 2200;
const FOV_DEG = 40;
const SWAY_HEAVE = 0.003;
const TRENCH_RELIEF_M = 40;
const CAMERA = { x: 7600, z: 500, distance: 250, yawDeg: 90, pitchDeg: 10, focusDepthM: 2800 };
const PLATEAU = { x: 1600, z: 2000, distance: 250, yawDeg: 90, pitchDeg: 10, focusDepthM: 700 };
const EDGE = { ...CAMERA, focusDepthM: 700 };
const FLOOR_DEPTH_M = 2900;
const BAND_M = [2860, 2940];
// The trench's span, less the margin the seam keeps off its walls and edges.
// The edge pairs by rows instead: along the receding north edge a 60 m margin
// is tens of rows, and the mesh runs to the map's edge (perspectiveTerrain.ts).
// Its floor is smoothed between cell centres (authoredFloorAtM), so it is flat
// only to the last trench row's centre, z 875. The skirt the world ends at
// (PerspectiveView.buildTerrainDressing) follows that floor, since it hangs
// from the mesh's own edge vertices (#1041). The stretch still stops at z 750,
// where the skirt left the floor before that, so the edge reads what
// docs/free-camera.md quotes; to z 875 it reads 19 more pairs and an 880 m median.
const TRENCH = { x: [60, 7940], z: [60, 940] };
const TRENCH_FLAT = { x: [0, 8000], z: [0, 750] };
const EDGE_ROWS = 3;
const SKY_SEARCH_ROWS = 40;

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().active === true);
  // Which rasteriser drew it, as capture.mjs records it: the issue asks for
  // frames from a real GPU.
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  const look = async (c) => {
    await page.evaluate((c) => {
      window.__perspectiveCamera(c.x, c.z, c.distance, {
        yawDeg: c.yawDeg,
        pitchDeg: c.pitchDeg,
        focusDepthM: c.focusDepthM,
      });
    }, c);
    await page.waitForTimeout(1500);
  };
  await look(PLATEAU);
  await shot('plateau');

  const rad = Math.PI / 180;
  const tan = Math.tan((FOV_DEG / 2) * rad);
  const unit = (v) => {
    const l = Math.hypot(...v);
    return v.map((q) => q / l);
  };

  // Points the camera, checks the probe agrees with the model below, and
  // returns the camera as applyCamera builds it (PerspectiveView.ts).
  const aim = async (c) => {
    await look(c);
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    const pitch = c.pitchDeg * rad;
    const yaw = c.yawDeg * rad;
    const focus = [c.x, -c.focusDepthM * M_PER_M, c.z];
    const flat = Math.cos(pitch) * c.distance;
    const eye = [
      focus[0] + Math.sin(yaw) * flat,
      focus[1] + Math.sin(pitch) * c.distance,
      focus[2] + Math.cos(yaw) * flat,
    ];
    assert.equal(probe.focus.depthM, c.focusDepthM, 'the focus clamp moved the anchor');
    assert.equal(probe.waterDensity, 1, 'the water setting is not the default');
    assert.equal(probe.waterReachM, 900, 'the reach is not at its floor');
    // The terrain clamp raises the eye and nothing else, so its depth is the
    // tell. The sway (#1030) moves it too, after the clamp: along the camera's
    // up axis by at most SWAY_HEAVE of the frame's height at the focus, and
    // level along its right, so that bound is allowed on top of the probe's
    // rounding. It moves a point at the fog's full reach by under half a pixel,
    // which the samples' row margins absorb.
    const swayM = probe.sway === 'held' ? 0 : (SWAY_HEAVE * 2 * c.distance * tan) / M_PER_M;
    assert.ok(Math.abs(probe.eye.depthM + eye[1] / M_PER_M) <= 1 + swayM, 'the eye was clamped');
    const forward = unit(focus.map((f, k) => f - eye[k]));
    const right = unit([-forward[2], 0, forward[0]]);
    const up = [
      right[1] * forward[2] - right[2] * forward[1],
      right[2] * forward[0] - right[0] * forward[2],
      right[0] * forward[1] - right[1] * forward[0],
    ];
    return { c, probe, eye, forward, right, up };
  };

  const readFrame = async () => {
    const frame = await page.evaluate(
      () =>
        new Promise((resolve) =>
          // The view queued its own callback for this frame before this one, so
          // this runs after renderer.render and before the buffer is discarded.
          requestAnimationFrame(() => {
            const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
            const w = gl.drawingBufferWidth;
            const h = gl.drawingBufferHeight;
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            let s = '';
            for (let i = 0; i < px.length; i += 0x8000) {
              s += String.fromCharCode(...px.subarray(i, i + 0x8000));
            }
            resolve({ w, h, b64: btoa(s) });
          })
        )
    );
    const px = Buffer.from(frame.b64, 'base64');
    // readPixels rows run bottom-up.
    const at = (x, yTop) => {
      const i = ((frame.h - 1 - yTop) * frame.w + x) * 4;
      return [px[i], px[i + 1], px[i + 2]];
    };
    return { w: frame.w, h: frame.h, at };
  };

  const floorY = -FLOOR_DEPTH_M * M_PER_M;
  // One pixel's ray, cast against the trench floor's plane.
  const castAt = (cam, frame, x, y) => {
    const { eye, forward, right, up, probe } = cam;
    const aspect = frame.w / frame.h;
    const nx = ((x + 0.5) / frame.w) * 2 - 1;
    const ny = 1 - ((y + 0.5) / frame.h) * 2;
    const ray = unit(forward.map((f, k) => f + right[k] * nx * tan * aspect + up[k] * ny * tan));
    const backdropDepthM = cam.c.focusDepthM - ray[1] * BACKDROP_SPAN_M;
    if (ray[1] >= 0) return { ray, backdropDepthM, hit: null };
    const s = (floorY - eye[1]) / ray[1];
    const hitX = eye[0] + ray[0] * s;
    const hitZ = eye[2] + ray[2] * s;
    // View-space depth, as fog_vertex measures it, then water.ts's exp² curve.
    const viewZ = s * (ray[0] * forward[0] + ray[1] * forward[1] + ray[2] * forward[2]);
    const fog = 1 - Math.exp(-((viewZ / probe.waterReachM) ** 2));
    return { ray, backdropDepthM, hit: { x: hitX, z: hitZ, fog } };
  };
  const inSpan = (hit, span) =>
    hit.x > span.x[0] && hit.x < span.x[1] && hit.z > span.z[0] && hit.z < span.z[1];
  const fogged = (cast, span = TRENCH) =>
    cast.hit !== null && inSpan(cast.hit, span) && cast.hit.fog >= 0.999;
  // A ray that leaves the map by the trench's west or north edge, over its
  // flat stretch and at least `clearM` above the floor, so it meets nothing.
  const pastEdge = (cast, eye, clearM = 0) => {
    const { hit, ray } = cast;
    if (hit === null || (hit.x >= 0 && hit.z >= 0)) return false;
    const { x, z } = TRENCH_FLAT;
    const t = Math.min(
      ray[0] < 0 ? (x[0] - eye[0]) / ray[0] : Infinity,
      ray[2] < 0 ? (z[0] - eye[2]) / ray[2] : Infinity
    );
    const at = (k) => eye[k] + ray[k] * t;
    return (
      at(0) > x[0] - 1e-6 &&
      at(0) < x[1] &&
      at(2) > z[0] - 1e-6 &&
      at(2) < z[1] &&
      at(1) - floorY >= clearM * M_PER_M
    );
  };
  const median = (list) =>
    [0, 1, 2].map((k) => list.map((p) => p[k]).sort((a, b) => a - b)[list.length >> 1]);

  // The seam: both classes at the one depth.
  const seamCam = await aim(CAMERA);
  const seamFrame = await readFrame();
  const seamFogged = [];
  const seamBackdrop = [];
  for (let y = 0; y < seamFrame.h; y++) {
    for (let x = 0; x < seamFrame.w; x++) {
      const cast = castAt(seamCam, seamFrame, x, y);
      if (fogged(cast)) {
        seamFogged.push(seamFrame.at(x, y));
      } else if (
        cast.hit !== null &&
        (cast.hit.z < 0 || cast.hit.x < 0) &&
        cast.backdropDepthM >= BAND_M[0] &&
        cast.backdropDepthM <= BAND_M[1]
      ) {
        seamBackdrop.push(seamFrame.at(x, y));
      }
    }
  }
  // For a reviewer; its HUD grain lifts pixels, so the numbers come from above.
  const file = await shot('fog-seam');

  // The edge: one pair a column, across the silhouette.
  const edgeCam = await aim(EDGE);
  const edgeFrame = await readFrame();
  const pairs = [];
  const castEdge = (x, y) => castAt(edgeCam, edgeFrame, x, y);
  for (let x = 0; x < edgeFrame.w; x++) {
    // Down the column to the first fully fogged flat floor. Only a silhouette
    // the ray model puts between two adjacent rows makes a pair.
    let above = -1;
    for (let y = 0; y < edgeFrame.h; y++) {
      const cast = castEdge(x, y);
      if (pastEdge(cast, edgeCam.eye)) {
        above = y;
        continue;
      }
      if (!fogged(cast, TRENCH_FLAT)) continue;
      if (above === y - 1) {
        // Up to the first ray clear of the relief and one row more; down three.
        let skyY = above;
        while (
          skyY >= 0 &&
          above - skyY < SKY_SEARCH_ROWS &&
          !pastEdge(castEdge(x, skyY), edgeCam.eye, TRENCH_RELIEF_M)
        ) {
          skyY--;
        }
        skyY--;
        const groundY = y + EDGE_ROWS;
        const sky = skyY >= 0 && above - skyY <= SKY_SEARCH_ROWS ? castEdge(x, skyY) : null;
        const ground = groundY < edgeFrame.h ? castEdge(x, groundY) : null;
        if (
          sky !== null &&
          ground !== null &&
          pastEdge(sky, edgeCam.eye, TRENCH_RELIEF_M) &&
          fogged(ground, TRENCH_FLAT)
        ) {
          pairs.push({
            backdrop: edgeFrame.at(x, skyY),
            fogged: edgeFrame.at(x, groundY),
            backdropDepthM: sky.backdropDepthM,
          });
        }
      }
      break;
    }
  }
  await shot('edge');

  const result = {
    renderer,
    software,
    camera: CAMERA,
    probe: seamCam.probe,
    counts: { fogged: seamFogged.length, backdrop: seamBackdrop.length },
    fogged: median(seamFogged),
    backdrop: median(seamBackdrop),
  };
  result.delta = result.backdrop.map((b, k) => b - result.fogged[k]);
  const depths = pairs.map((p) => p.backdropDepthM).sort((a, b) => a - b);
  result.edge = {
    camera: EDGE,
    probe: edgeCam.probe,
    pairs: pairs.length,
    // The graded depth the backdrop drew beside the silhouette: its range and
    // median, in metres, against the trench's 2,900.
    backdropDepthM: depths.length
      ? [depths[0], depths[depths.length >> 1], depths[depths.length - 1]].map(Math.round)
      : [],
    fogged: pairs.length ? median(pairs.map((p) => p.fogged)) : [],
    backdrop: pairs.length ? median(pairs.map((p) => p.backdrop)) : [],
  };
  result.edge.step = result.edge.backdrop.map((b, k) => b - result.edge.fogged[k]);
  writeFileSync(join(dirname(file), 'fog.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(
    JSON.stringify({
      counts: result.counts,
      fogged: result.fogged,
      backdrop: result.backdrop,
      delta: result.delta,
      edge: {
        pairs: result.edge.pairs,
        backdropDepthM: result.edge.backdropDepthM,
        fogged: result.edge.fogged,
        backdrop: result.edge.backdrop,
        step: result.edge.step,
      },
    })
  );
  assert.ok(
    seamFogged.length > 1000 && seamBackdrop.length > 1000,
    'the frame lacks one of the classes'
  );
  assert.ok(
    result.delta.every((v) => Math.abs(v) <= 1),
    `fogged seabed ${result.fogged} against backdrop ${result.backdrop}`
  );
  assert.ok(pairs.length > 200, `only ${pairs.length} columns show the far trench's edge`);
  assert.ok(
    result.edge.fogged.every((v, k) => Math.abs(v - result.fogged[k]) <= 1),
    `the fogged trench read ${result.edge.fogged} with the focus at 700 m, ${result.fogged} at 2,800 m`
  );
  assert.ok(
    result.edge.step[1] > 1,
    `the edge free-camera.md quotes is gone: ${result.edge.backdrop} over ${result.edge.fogged}`
  );
};
