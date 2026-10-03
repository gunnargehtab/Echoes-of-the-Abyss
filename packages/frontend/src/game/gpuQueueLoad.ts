/**
 * Gate 6's queued GPU reading (docs/graphics-standards.md gate 6, "Abyss
 * Render Stack increment"): a fixed load drawn before the frame's timer
 * opens, so the frame's commands are queued behind it by the time the GPU
 * reaches them.
 *
 * A timer query reads the time between the GPU reaching its begin and its
 * end, and that includes the GPU waiting for commands. On the named GPU,
 * unpaced, the browser's GPU process hands the conn view's frame over more
 * slowly than the GPU runs it, so one bracket read the canvas pass at
 * 0.5–0.6 ms where its work was 0.26–0.38 ms, and the lamp halo's twelve
 * passes at about 1 ms where their work was 0.25 ms (#1001). Queued, the
 * same passes read the same within 0.01 ms from camera to camera, as a pass
 * whose cost is its pixel count should.
 *
 * The load is one full-screen triangle into a 256 × 256 target, a fragment
 * loop of `iterations` steps: about 3 ms at 10,000 on the named GPU. It
 * proves nothing unless it outlasts the handover, so a capture reads its time
 * (`gpuQueue.avgMs`) and checks it against the unqueued frame. It is drawn
 * before `renderer.info` is reset and before the frame's timer begins, so it
 * is neither a call, a triangle, a pass nor GPU time of the frame.
 *
 * Development builds only, and only while a capture asks for it.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  NoBlending,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer,
} from 'three';

const SIZE = 256;

const VERTEX = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// The bound is a uniform, so the shader compiler can neither unroll the loop
// nor shorten it, and a new length needs no recompile; the result is written
// so nothing is dead code.
const FRAGMENT = /* glsl */ `
uniform int uIterations;
void main() {
  vec2 p = gl_FragCoord.xy * 0.001;
  float a = 0.0;
  for (int i = 0; i < 1000000; i++) {
    if (i >= uIterations) break;
    a = sin(a + p.x) * cos(a - p.y) + 0.5;
  }
  gl_FragColor = vec4(a, 0.0, 0.0, 1.0);
}
`;

export class GpuQueueLoad {
  private target: WebGLRenderTarget | null = null;
  private readonly material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uIterations: { value: 0 } },
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly scene = new Scene();
  private iterations = 0;

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
    );
    const mesh = new Mesh(geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.scene.matrixWorldAutoUpdate = false;
  }

  /** Its fragment loop's length; 0 when no load is drawn. */
  get steps(): number {
    return this.target === null ? 0 : this.iterations;
  }

  /** Set the load, or take it away with 0. */
  set(iterations: number): void {
    const steps = Math.max(0, Math.floor(iterations));
    if (steps === 0) {
      this.target?.dispose();
      this.target = null;
      this.iterations = 0;
      return;
    }
    this.target ??= new WebGLRenderTarget(SIZE, SIZE, { depthBuffer: false });
    this.material.uniforms.uIterations!.value = steps;
    this.iterations = steps;
  }

  /** Draw the load, if one is set; the canvas is bound again after. */
  draw(renderer: WebGLRenderer, camera: Camera): void {
    if (this.target === null) return;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    try {
      renderer.setRenderTarget(this.target);
      renderer.render(this.scene, camera);
    } finally {
      renderer.setRenderTarget(null);
      renderer.autoClear = autoClear;
    }
  }

  dispose(): void {
    this.set(0);
    (this.scene.children[0] as Mesh).geometry.dispose();
    this.material.dispose();
  }
}
