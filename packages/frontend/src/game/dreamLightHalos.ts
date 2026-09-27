/**
 * Tight, depth-tested halos from approved own-force lamp geometry. No bloom
 * pass, new emitters, or contact data: all sites and energy come from the model.
 */
import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Points,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
} from 'three';

const HALO_CAP = 256;
const sitesByGeometry = new WeakMap<BufferGeometry, readonly Sphere[]>();

/** Merged lamp meshes still have disconnected bulbs. Weld position seams,
 * then find their connected components rather than lighting the bucket's centre. */
export function lampSites(geometry: BufferGeometry): readonly Sphere[] {
  const cached = sitesByGeometry.get(geometry);
  if (cached !== undefined) return cached;
  const position = geometry.getAttribute('position');
  const vertices: number[] = [];
  const parents: number[] = [];
  const welded = new Map<string, number>();
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`;
    let id = welded.get(key);
    if (id === undefined) {
      id = parents.length;
      parents.push(id);
      welded.set(key, id);
    }
    vertices.push(id);
  }
  const root = (id: number): number => {
    while (parents[id] !== id) {
      parents[id] = parents[parents[id]!]!;
      id = parents[id]!;
    }
    return id;
  };
  const index = geometry.index;
  const count = index?.count ?? position.count;
  for (let i = 0; i < count; i += 3) {
    const a = root(vertices[index?.getX(i) ?? i]!);
    const b = root(vertices[index?.getX(i + 1) ?? i + 1]!);
    const c = root(vertices[index?.getX(i + 2) ?? i + 2]!);
    parents[b] = a;
    parents[c] = a;
  }
  const boxes = new Map<number, Box3>();
  const point = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const id = root(vertices[i]!);
    let box = boxes.get(id);
    if (box === undefined) {
      box = new Box3();
      boxes.set(id, box);
    }
    box.expandByPoint(point.fromBufferAttribute(position, i));
  }
  const sites = [...boxes.values()].map((box) => box.getBoundingSphere(new Sphere()));
  sitesByGeometry.set(geometry, sites);
  return sites;
}

interface LampBinding {
  mesh: Mesh;
  material: MeshStandardMaterial;
  sites: readonly Sphere[];
}

export class DreamLightHalos {
  readonly group = new Group();
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  private readonly lights = Array.from({ length: 8 }, () => ({
    light: new PointLight(0xffffff, 0, 100, 2),
    priority: 0,
  }));
  private readonly bestPosition = new Vector3();
  private readonly bestColor = new Color();
  private readonly bindings = new WeakMap<Object3D, LampBinding[]>();
  private readonly position = new BufferAttribute(new Float32Array(HALO_CAP * 3), 3);
  private readonly color = new BufferAttribute(new Float32Array(HALO_CAP * 3), 3);
  private readonly radius = new BufferAttribute(new Float32Array(HALO_CAP), 1);
  private readonly strength = new BufferAttribute(new Float32Array(HALO_CAP), 1);
  private readonly point = new Vector3();
  private readonly uniforms = {
    uProjection: { value: new Vector2(1000, 1) },
    uReach: { value: 4800 },
    uDensity: { value: 1 },
  };
  private count = 0;

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.position.setUsage(DynamicDrawUsage));
    geometry.setAttribute('lampColor', this.color.setUsage(DynamicDrawUsage));
    geometry.setAttribute('lampRadius', this.radius.setUsage(DynamicDrawUsage));
    geometry.setAttribute('lampStrength', this.strength.setUsage(DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        attribute vec3 lampColor;
        attribute float lampRadius;
        attribute float lampStrength;
        uniform vec2 uProjection;
        uniform float uReach;
        uniform float uDensity;
        varying vec3 vLamp;
        varying float vStrength;
        void main() {
          vec3 toEye = cameraPosition - position;
          float distanceM = max(length(toEye), 1.0);
          // The bulb's facing surface, not its occluded centre.
          vec3 surface = position + toEye / distanceM * lampRadius * 1.05;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(surface, 1.0);
          gl_PointSize = clamp(uProjection.x * lampRadius * 7.0 / distanceM,
                               5.0 * uProjection.y, 24.0 * uProjection.y);
          float fog = distanceM * uDensity / max(uReach, 1.0);
          vLamp = lampColor;
          vStrength = lampStrength * exp(-fog * fog);
        }
      `,
      fragmentShader: `
        varying vec3 vLamp;
        varying float vStrength;
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          float halo = exp(-r * r * 22.0) * (1.0 - smoothstep(0.35, 0.5, r));
          gl_FragColor = vec4(vLamp, halo * vStrength * 0.42);
          #include <colorspace_fragment>
        }
      `,
    });
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 3;
    this.group.add(this.points, ...this.lights.map(({ light }) => light));
  }

  update(
    units: Group,
    structures: Group,
    camera: PerspectiveCamera,
    reachM: number,
    density: number,
    projectionScale: number,
    pixelRatio: number,
    readabilityScale: number
  ): void {
    this.count = 0;
    for (const slot of this.lights) {
      slot.priority = 0;
      slot.light.intensity = 0;
    }
    this.append(units, readabilityScale, camera);
    this.append(structures, readabilityScale, camera);
    this.uniforms.uReach.value = reachM;
    this.uniforms.uDensity.value = density;
    this.uniforms.uProjection.value.set(projectionScale, pixelRatio);
    this.points.geometry.setDrawRange(0, this.count);
    this.points.visible = this.count > 0;
    this.position.needsUpdate = true;
    this.color.needsUpdate = true;
    this.radius.needsUpdate = true;
    this.strength.needsUpdate = true;
    // ShaderMaterial receives the same camera that renders the own force.
    this.points.layers.mask = camera.layers.mask;
  }

  private append(group: Group, readabilityScale: number, camera: PerspectiveCamera): void {
    group.updateWorldMatrix(true, true);
    for (const child of group.children) {
      if (!child.visible) continue;
      let bestPower = 0;
      let bestRadius = 0;
      let bindings = this.bindings.get(child);
      if (bindings === undefined) {
        bindings = [];
        child.traverse((part) => {
          if (
            part instanceof Mesh &&
            part.material instanceof MeshStandardMaterial &&
            part.material.emissive.getHex() !== 0
          ) {
            bindings!.push({
              mesh: part,
              material: part.material,
              sites: lampSites(part.geometry),
            });
          }
        });
        this.bindings.set(child, bindings);
      }
      for (const { mesh, material, sites } of bindings) {
        if (!mesh.visible || material.emissiveIntensity <= 0) continue;
        const scale = mesh.matrixWorld.getMaxScaleOnAxis();
        const ink = material.emissive;
        const energy = Math.max(ink.r, ink.g, ink.b) * material.emissiveIntensity;
        for (const site of sites) {
          const radius = site.radius * scale;
          this.point.copy(site.center).applyMatrix4(mesh.matrixWorld);
          const power = (energy / (1 + energy)) * radius * radius;
          if (power > bestPower) {
            bestPower = power;
            bestRadius = radius;
            this.bestPosition.copy(this.point);
            this.bestColor.copy(ink);
          }
          // Floodlit decks and long strips are not point lamps.
          if (this.count >= HALO_CAP || radius / readabilityScale > 12 || radius <= 0) continue;
          const i = this.count++;
          this.position.setXYZ(i, this.point.x, this.point.y, this.point.z);
          this.color.setXYZ(i, ink.r, ink.g, ink.b);
          this.radius.setX(i, radius);
          const area = (radius / readabilityScale) ** 2;
          this.strength.setX(i, 1 - Math.exp((-energy * area) / 16));
        }
      }
      // One real source per model, at its brightest approved emitter. Keeping
      // eight allocated lights avoids shader recompilation when a lamp dims.
      if (bestPower > 0) {
        const priority =
          bestPower / Math.max(1, this.bestPosition.distanceToSquared(camera.position));
        let slot = this.lights[0]!;
        for (const candidate of this.lights) {
          if (candidate.priority < slot.priority) slot = candidate;
        }
        if (priority > slot.priority) {
          slot.priority = priority;
          slot.light.position.copy(this.bestPosition);
          slot.light.color.copy(this.bestColor);
          slot.light.intensity = bestPower * 2;
          slot.light.distance = Math.min(500, Math.max(40, bestRadius * 8));
        }
      }
    }
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
