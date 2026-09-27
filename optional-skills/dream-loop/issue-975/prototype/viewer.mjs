import { THREE, makeJitter } from 'abyss-engine';

export function mountViewer({
  renderer,
  scene,
  fx,
  camera,
  pipe,
  torps,
  motion,
  W,
  H,
  frames,
  builtMs,
  batch,
}) {
  const canvas = renderer.domElement;
  const origin = camera.position.clone();
  const rotation = camera.rotation.clone();
  const pivot = origin.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 140);
  const progress = document.getElementById('prog');
  const controls = document.getElementById('controls');
  const status = document.getElementById('status');
  const saveButton = document.getElementById('save');
  const capture = new URLSearchParams(location.search).get('capture') === '1';
  controls.hidden = capture;
  let yaw = 0,
    pitch = 0,
    distance = 1,
    sample = 0,
    pending = 0,
    measuring = false;
  let lastWork = null;
  let started = performance.now(),
    resolveMs = 0;
  renderer.info.autoReset = false;
  let jitter;

  const inventory = {};
  for (const root of [scene, fx]) {
    root.traverse((object) => {
      for (const name of object.userData.sourceNames ?? [object.name]) {
        if (name) inventory[name] = (inventory[name] ?? 0) + 1;
      }
    });
  }

  function pose() {
    camera.rotation.copy(rotation);
    camera.rotation.y += yaw;
    camera.rotation.x += pitch;
    if (yaw === 0 && pitch === 0 && distance === 1) camera.position.copy(origin);
    else
      camera.position
        .copy(pivot)
        .addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -140 * distance);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    jitter = makeJitter(camera, { focus: 140 * distance, aperture: 0.2 });
  }

  function renderSample(index, present = true) {
    renderer.info.reset();
    jitter(index, W, H);
    for (let i = 0; i < torps.length; i++) {
      const torpedo = torps[i];
      torpedo.g.position
        .copy(torpedo.p)
        .addScaledVector(torpedo.d, -torpedo.blur * motion[index % motion.length][i]);
    }
    pipe.frame(scene, fx, camera, index);
    if (present) pipe.present();
    lastWork = { ...renderer.info.render };
  }

  function tick() {
    pending = 0;
    renderSample(sample);
    sample++;
    progress.style.width = `${(sample / frames) * 100}%`;
    progress.setAttribute('aria-valuenow', String(Math.round((sample / frames) * 100)));
    if (sample < frames) pending = requestAnimationFrame(tick);
    else {
      progress.hidden = true;
      window.__rendered = true;
      resolveMs = performance.now() - started;
      status.textContent = 'A frozen instant. Drift through it; R returns to the authored frame.';
      saveButton.disabled = false;
      console.log(`Key art resolved: ${frames} real samples`);
    }
  }

  function invalidate() {
    cancelAnimationFrame(pending);
    pose();
    started = performance.now();
    sample = 0;
    window.__rendered = false;
    saveButton.disabled = true;
    status.textContent = 'Resolving light through the water...';
    progress.hidden = false;
    pending = requestAnimationFrame(tick);
  }

  function reset() {
    if (measuring) throw new Error('Cannot change the camera during a render measurement');
    yaw = pitch = 0;
    distance = 1;
    invalidate();
  }

  async function save() {
    if (!window.__rendered) {
      status.textContent = 'Wait for the frame to finish resolving before saving.';
      return;
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The browser could not export the rendered frame');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'echoes-key-art-975.png';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const probe = () => ({
    samples: sample,
    targetSamples: frames,
    ready: window.__rendered === true,
    builtMs,
    resolveMs,
    camera: { yaw, pitch, distance },
    work: lastWork,
    memory: { ...renderer.info.memory },
    inventory,
    batch,
  });

  async function measure(durationMs = 10_000) {
    if (measuring || !window.__rendered)
      throw new Error('Wait for the locked frame before measuring');
    if (!Number.isFinite(durationMs) || durationMs < 1000 || durationMs > 60_000) {
      throw new Error('Measurement duration must be 1000-60000 ms');
    }
    measuring = true;
    saveButton.disabled = true;
    let count = 0;
    const intervals = [];
    const gl = renderer.getContext();
    try {
      // Drain earlier work and warm the exact full-render path, including all post passes.
      for (let i = 0; i < 4; i++) renderSample(i);
      gl.finish();
      const begin = performance.now();
      let previous = begin;
      await new Promise((resolve, reject) => {
        function frame() {
          try {
            renderSample(count);
            count++;
            gl.finish();
            const now = performance.now();
            intervals.push(now - previous);
            previous = now;
            if (now - begin < durationMs) requestAnimationFrame(frame);
            else resolve();
          } catch (error) {
            reject(error);
          }
        }
        requestAnimationFrame(frame);
      });
      const elapsedMs = performance.now() - begin;
      intervals.sort((a, b) => a - b);
      return {
        kind: 'full scene + volume + effects + accumulation + bloom + grade; GPU-fenced',
        frames: count,
        elapsedMs,
        fps: (count * 1000) / elapsedMs,
        medianFrameMs: intervals[Math.floor(intervals.length / 2)],
        p95FrameMs: intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95))],
        work: lastWork,
      };
    } finally {
      measuring = false;
      invalidate();
    }
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    if (measuring || event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, yaw, pitch };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || measuring) return;
    yaw = Math.max(-0.14, Math.min(0.14, drag.yaw - (event.clientX - drag.x) * 0.0004));
    pitch = Math.max(-0.08, Math.min(0.08, drag.pitch - (event.clientY - drag.y) * 0.0004));
    invalidate();
  });
  const release = () => {
    drag = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (measuring) return;
      distance = Math.max(0.85, Math.min(1.15, distance + event.deltaY * 0.0002));
      invalidate();
    },
    { passive: false }
  );
  canvas.addEventListener('dblclick', reset);
  document.getElementById('reset').addEventListener('click', reset);
  document.getElementById('save').addEventListener('click', () => void save());
  window.addEventListener('keydown', (event) => {
    if (measuring || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.key.toLowerCase() === 'r') reset();
    else if (event.key.toLowerCase() === 's') void save();
    else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      if (event.key === 'ArrowLeft') yaw = Math.max(-0.14, yaw - 0.012);
      if (event.key === 'ArrowRight') yaw = Math.min(0.14, yaw + 0.012);
      if (event.key === 'ArrowUp') pitch = Math.min(0.08, pitch + 0.008);
      if (event.key === 'ArrowDown') pitch = Math.max(-0.08, pitch - 0.008);
      invalidate();
    }
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(pending);
    throw new Error('The GPU context was lost. Reload the preview to restore it.');
  });
  window.__keyArt = { probe, reset, measure };
  invalidate();
}
