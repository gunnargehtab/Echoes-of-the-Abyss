import { THREE, V3, G, UW, rand, rr, gauss, smooth, uwMat, pointCloud } from 'abyss-engine';
import { fanTexture } from 'abyss-tex';
import { mergeUV } from './geometry.mjs';
export { mergeUV } from './geometry.mjs';

const FX = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
};
const VS = `varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;

/* translucent gelatinous tissue: fresnel, internal canals, marginal photophores, lit by lamps */
export function jellyMat({
  body = [0.5, 0.12, 0.1],
  glow = [0.2, 0.6, 1.6],
  mode = 0,
  glowI = 1,
  lit = 1,
} = {}) {
  return new THREE.ShaderMaterial({
    ...FX,
    uniforms: Object.assign({}, G, {
      uBody: { value: V3(...body) },
      uGlow: { value: V3(...glow) },
      uMode: { value: mode },
      uGI: { value: glowI },
      uLit: { value: lit },
    }),
    vertexShader: VS,
    fragmentShader: `${UW} uniform vec3 uBody; uniform vec3 uGlow; uniform float uMode; uniform float uGI; uniform float uLit; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main(){ vec3 V=normalize(cameraPosition-vW); float ndv=abs(dot(normalize(vN),V)); float fr=pow(1.0-ndv,2.2);
        vec3 L=(lampsAt(vW)*0.07+uPingCol*pingBand(vW)*0.2)*uLit+vec3(0.0015,0.003,0.004);
        vec3 c;
        if(uMode<0.5){ // bell
          float can=pow(abs(cos(vUv.x*3.14159*16.0)),60.0)*smoothstep(0.15,0.75,vUv.y);
          float gon=smoothstep(0.1,0.0,abs(fract(vUv.x*4.0)-0.5)-0.18)*smoothstep(0.2,0.35,vUv.y)*smoothstep(0.55,0.4,vUv.y);
          float spots=exp(-pow((vUv.y-0.86)/0.018,2.0))*pow(0.5+0.5*cos(vUv.x*6.2832*24.0),6.0);
          float n=fbm2(vUv*vec2(30.0,12.0));
          c=uBody*L*(0.12+fr*1.3+can*1.0+gon*1.4)*(0.7+0.6*n)+uGlow*uGI*(spots*1.1+fr*0.3+can*0.08);
        } else if(uMode<1.5){ // tentacle / oral arm
          float a=pow(1.0-vUv.x,1.3); float beads=pow(0.5+0.5*cos(vUv.x*220.0),10.0);
          c=(uBody*L*(0.3+fr*1.3)+uGlow*uGI*beads*0.5)*a;
        } else if(uMode<2.5){ // ctenophore comb row: diffractive rainbow
          float ph=vUv.x*3.0+ndv*2.2+vUv.y*0.5; vec3 rb=0.5+0.5*cos(6.2832*(ph+vec3(0.0,0.33,0.67)));
          float comb=pow(0.5+0.5*sin(vUv.x*90.0),3.0);
          c=rb*comb*(L*0.9+0.02)+uGlow*uGI*comb*0.15;
        } else { // glassy bract / swimming bell
          float n=fbm2(vUv*vec2(9.0,6.0));
          c=uBody*L*(0.35+fr*0.9)*(0.7+0.6*n)+uGlow*uGI*(0.25*fr+0.06);
        }
        gl_FragColor=vec4(c*uwAbs(distance(cameraPosition,vW)),1.0); }`,
  });
}

export function taperTube(curve, segs, radial, rFn) {
  const fr = curve.computeFrenetFrames(segs, false),
    pos = [],
    nrm = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs,
      P = curve.getPointAt(t),
      N = fr.normals[i],
      B = fr.binormals[i],
      r = rFn(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2,
        d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      pos.push(P.x + d.x * r, P.y + d.y * r, P.z + d.z * r);
      nrm.push(d.x, d.y, d.z);
      uv.push(t, j / radial);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j,
        b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/* medusa: 'atolla' (crimson, blue crown), 'veil' (pale, long tentacles), 'helmet' (tall crimson cone) */
export function buildJelly(type, r) {
  const g = new THREE.Group();
  g.name = 'jelly_' + type;
  const P = {
    atolla: {
      h: 0.45,
      body: [0.9, 0.12, 0.08],
      glow: [0.15, 0.55, 1.8],
      ten: 20,
      tl: 1.6,
      long: 1,
    },
    veil: { h: 0.62, body: [0.55, 0.5, 0.75], glow: [1.2, 0.3, 1.4], ten: 14, tl: 5, long: 0 },
    helmet: { h: 1.25, body: [0.75, 0.08, 0.1], glow: [0.2, 0.5, 1.6], ten: 12, tl: 2.2, long: 0 },
  }[type];
  const prof = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40,
      a = (t * Math.PI) / 2;
    prof.push(
      new THREE.Vector2(
        Math.max(0.001, Math.sin(a) * r * (1 + 0.08 * Math.sin(t * 9))),
        Math.cos(a) * r * P.h * (type === 'helmet' ? 1 + 0.35 * (1 - t) : 1)
      )
    );
  }
  const bell = new THREE.LatheGeometry(prof, 64);
  {
    const p = bell.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        y = p.getY(i),
        a = Math.atan2(z, x),
        m = 1 + 0.05 * Math.pow(Math.max(0, 1 - y / (r * P.h)), 3) * Math.cos(a * 16);
      p.setX(i, x * m);
      p.setZ(i, z * m);
    }
    bell.computeVertexNormals();
  }
  g.add(new THREE.Mesh(bell, jellyMat({ body: P.body, glow: P.glow, mode: 0, glowI: 1 })));
  const inner = bell.clone();
  inner.scale(0.82, 0.7, 0.82);
  g.add(
    new THREE.Mesh(
      inner,
      jellyMat({ body: P.body.map((v) => v * 0.6), glow: P.glow, mode: 0, glowI: 0.3 })
    )
  );
  const tm = jellyMat({
    body: P.body.map((v) => v * 0.8 + 0.1),
    glow: P.glow,
    mode: 1,
    glowI: 0.8,
  });
  const drift = V3(rr(-1, 1), 0, rr(-1, 1)).normalize();
  for (let i = 0; i < P.ten; i++) {
    const a = (i / P.ten) * Math.PI * 2 + rr(-0.05, 0.05),
      len = r * P.tl * rr(0.7, 1.3) * (P.long && i === 0 ? 5 : 1),
      pts = [],
      ph = rr(0, 6);
    for (let k = 0; k <= 10; k++) {
      const t = k / 10,
        sw = Math.sin(t * 4.5 + ph) * r * 0.45 * t;
      pts.push(
        V3(
          Math.cos(a) * r * (1.0 - 0.2 * t) + drift.x * t * t * len * 0.35 + Math.cos(a + 1.5) * sw,
          -t * len,
          Math.sin(a) * r * (1.0 - 0.2 * t) + drift.z * t * t * len * 0.35 + Math.sin(a + 1.5) * sw
        )
      );
    }
    g.add(
      new THREE.Mesh(
        taperTube(new THREE.CatmullRomCurve3(pts), 60, 4, (t) => r * 0.012 * (1 - t * 0.7)),
        tm
      )
    );
  }
  if (type === 'veil')
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2,
        pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        pts.push(
          V3(
            Math.cos(a) * r * 0.15 * (1 + t) + Math.sin(t * 6 + i) * r * 0.2,
            -t * r * 3,
            Math.sin(a) * r * 0.15 * (1 + t)
          )
        );
      }
      g.add(
        new THREE.Mesh(
          taperTube(
            new THREE.CatmullRomCurve3(pts),
            40,
            6,
            (t) => r * 0.07 * (1 - t * 0.6) * (1 + 0.3 * Math.sin(t * 40))
          ),
          jellyMat({ body: [0.7, 0.45, 0.8], glow: [1.2, 0.3, 1.4], mode: 1, glowI: 0.4 })
        )
      );
    }
  return g;
}

export function buildCtenophore(r) {
  const g = new THREE.Group();
  g.name = 'ctenophore';
  const b = new THREE.SphereGeometry(r, 24, 16);
  b.scale(1, 1.45, 1);
  g.add(
    new THREE.Mesh(
      b,
      jellyMat({ body: [0.35, 0.45, 0.55], glow: [0.1, 0.8, 0.9], mode: 0, glowI: 0.15 })
    )
  );
  const cm = jellyMat({ glow: [0.1, 0.9, 1.2], mode: 2, glowI: 1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2,
      pts = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12,
        ph = (0.12 + 0.76 * t) * Math.PI;
      pts.push(
        V3(
          Math.cos(a) * Math.sin(ph) * r * 1.03,
          Math.cos(ph) * r * 1.45 * 1.03,
          Math.sin(a) * Math.sin(ph) * r * 1.03
        )
      );
    }
    g.add(
      new THREE.Mesh(
        taperTube(new THREE.CatmullRomCurve3(pts), 48, 3, () => r * 0.05),
        cm
      )
    );
  }
  return g;
}

/* giant siphonophore: gas float, glassy swimming bells, a coiling stem of cormidia
   (leaf bracts + orange feeding polyps) and a curtain of fishing tentacles with red nematocyst beads */
const bake = (geo, p, q, s) => geo.clone().applyMatrix4(new THREE.Matrix4().compose(p, q, s));
export function buildSiphonophore({
  head,
  axis = V3(0, -1, 0),
  len = 22,
  coilR = 2.6,
  turns = 3.2,
  pxScale,
  current = V3(0.3, 0, 0.1),
}) {
  const g = new THREE.Group();
  g.name = 'giantSiphonophore';
  const q = new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), axis.clone().normalize()),
    pts = [];
  for (let i = 0; i <= 260; i++) {
    const t = i / 260,
      a = t * turns * Math.PI * 2 + 0.6,
      r = coilR * smooth(0.12, 0.38, t) * (0.85 + 0.15 * Math.sin(t * 9));
    pts.push(
      V3(Math.cos(a) * r + Math.sin(t * 4) * 0.5, -t * len, Math.sin(a) * r)
        .applyQuaternion(q)
        .add(head)
    );
  }
  const stem = new THREE.CatmullRomCurve3(pts);
  g.add(
    new THREE.Mesh(
      taperTube(stem, 700, 5, (t) => 0.03 * (1 - 0.45 * t)),
      jellyMat({ body: [0.9, 0.75, 0.6], glow: [0.3, 0.9, 1.2], mode: 1, glowI: 0.2 })
    )
  );
  const float = new THREE.SphereGeometry(0.3, 20, 14);
  float.scale(1, 1.6, 1);
  g.add(
    new THREE.Mesh(
      bake(float, head.clone().addScaledVector(axis, -0.35), q, V3(1, 1, 1)),
      jellyMat({ body: [1, 0.45, 0.2], glow: [1, 0.4, 0.12], mode: 0, glowI: 1.4 })
    )
  );
  const side = (t) => {
    const tg = stem.getTangentAt(t);
    return V3()
      .crossVectors(tg, Math.abs(tg.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0))
      .normalize();
  };
  const bp = [];
  for (let i = 0; i <= 20; i++) {
    const a = ((i / 20) * Math.PI) / 2;
    bp.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * 0.42), Math.cos(a) * 0.55));
  }
  const bellG = new THREE.LatheGeometry(bp, 24),
    bells = [];
  for (let k = 0; k < 14; k++) {
    const t = 0.006 + k * 0.0085,
      p = stem.getPointAt(t),
      tg = stem.getTangentAt(t),
      s = side(t).applyAxisAngle(tg, k * 2.4),
      up = tg.clone().negate().lerp(s, 0.45).normalize();
    bells.push(
      bake(
        bellG,
        p.clone().addScaledVector(s, 0.42),
        new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), up),
        V3(0.8, 1.1, 0.8).multiplyScalar(rr(0.7, 0.9))
      )
    );
  }
  g.add(
    new THREE.Mesh(
      mergeUV(bells),
      jellyMat({ body: [0.5, 0.62, 0.8], glow: [0.25, 0.85, 1.4], mode: 3, glowI: 0.2 })
    )
  );
  const leaf = new THREE.SphereGeometry(1, 16, 10),
    drop = new THREE.SphereGeometry(1, 12, 8),
    bracts = [],
    polyps = [],
    tents = [];
  const knobs = [],
    ksz = [],
    ktint = [],
    down = V3(0, -1, 0),
    cur = current.clone();
  for (let t = 0.14; t < 0.995; t += 0.021) {
    const p = stem.getPointAt(t),
      tg = stem.getTangentAt(t),
      s = side(t).applyAxisAngle(tg, t * 40);
    const bq = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(V3(), s, tg)
    );
    bracts.push(
      bake(
        leaf,
        p.clone().addScaledVector(s, 0.22),
        bq,
        V3(0.3, 0.12, 0.46).multiplyScalar(rr(0.8, 1.2) * (1.1 - 0.35 * t))
      )
    );
    const pb = p.clone().add(V3(0, -0.28, 0));
    polyps.push(
      bake(drop, pb, new THREE.Quaternion(), V3(0.08, 0.22, 0.08).multiplyScalar(rr(0.8, 1.2)))
    );
    const L = rr(3.5, 7.5) * (0.7 + 0.5 * Math.sin(t * 11) ** 2),
      tp = [];
    for (let j = 0; j <= 9; j++) {
      const u = j / 9;
      tp.push(
        pb
          .clone()
          .add(V3(0, -0.2, 0))
          .addScaledVector(down, u * L)
          .addScaledVector(cur, u * u * L * 0.35)
          .add(V3(Math.sin(u * 6 + t * 30) * 0.12, 0, Math.cos(u * 5 + t * 20) * 0.12))
      );
    }
    const tc = new THREE.CatmullRomCurve3(tp);
    tents.push(taperTube(tc, 28, 3, (u) => 0.014 * (1 - 0.6 * u)));
    for (let m = 0; m < 11; m++) {
      const u = 0.12 + m * 0.08 + rr(-0.02, 0.02),
        b = tc.getPointAt(Math.min(u, 0.99)),
        ang = rr(0, 6.28),
        l = rr(0.3, 0.75);
      const e = b.clone().add(V3(Math.cos(ang) * l * 0.55, -l * 0.8, Math.sin(ang) * l * 0.55)),
        mid = b
          .clone()
          .lerp(e, 0.5)
          .add(V3(0, 0.08, 0));
      tents.push(taperTube(new THREE.CatmullRomCurve3([b, mid, e]), 6, 3, () => 0.006));
      knobs.push(e.x, e.y, e.z);
      ksz.push(rr(0.09, 0.15));
      const kt = rr(0.6, 1.2);
      ktint.push(0.9 * kt, 0.16 * kt, 0.05 * kt);
    }
  }
  g.add(
    new THREE.Mesh(
      mergeUV(bracts),
      jellyMat({ body: [0.55, 0.7, 0.8], glow: [0.2, 0.8, 1.2], mode: 3, glowI: 0.3 })
    )
  );
  g.add(
    new THREE.Mesh(
      mergeUV(polyps),
      jellyMat({ body: [1, 0.4, 0.12], glow: [1, 0.38, 0.1], mode: 3, glowI: 3 })
    )
  );
  g.add(
    new THREE.Mesh(
      mergeUV(tents),
      jellyMat({ body: [0.9, 0.6, 0.5], glow: [0.3, 0.8, 1.0], mode: 1, glowI: 0.15 })
    )
  );
  for (let i = 0; i < 420; i++) {
    const t = rand(),
      wave = Math.pow(0.5 + 0.5 * Math.sin(t * 38 - 1.2), 8),
      p = stem.getPointAt(t).add(V3(gauss(), gauss(), gauss()).multiplyScalar(0.12));
    knobs.push(p.x, p.y, p.z);
    ksz.push(rr(0.06, 0.16));
    ktint.push(0.02 * wave, 0.7 * wave, 0.9 * wave);
  }
  g.add(
    pointCloud(
      new Float32Array(knobs),
      new Float32Array(ksz),
      new Float32Array(ktint),
      0,
      pxScale,
      'siphonophoreLights'
    )
  );
  return g;
}
export function buildSiphonophoreOld(curve, pxScale) {
  const g = new THREE.Group();
  g.name = 'siphonophore';
  g.add(
    new THREE.Mesh(
      taperTube(curve, 400, 4, (t) => 0.05 * (1 - t * 0.6)),
      jellyMat({ body: [0.8, 0.6, 0.5], glow: [0.5, 0.9, 1.4], mode: 1, glowI: 0.12 })
    )
  );
  const n = 220,
    P = new Float32Array(n * 3),
    S = new Float32Array(n),
    T = new Float32Array(n * 3),
    fm = jellyMat({ body: [0.7, 0.5, 0.45], glow: [0.3, 0.7, 1.2], mode: 1, glowI: 0.6 });
  for (let i = 0; i < n; i++) {
    const t = i / n,
      p = curve.getPointAt(t),
      warm = i % 3 === 0;
    P.set([p.x, p.y, p.z], i * 3);
    S[i] = (i < 8 ? 0.9 : 0.35) * rr(0.8, 1.2);
    T.set(warm ? [0.5, 0.12, 0.04] : [0.04, 0.22, 0.5], i * 3);
    if (i % 2 === 0 && i > 8) {
      const len = rr(1.5, 5),
        pts = [
          p,
          p.clone().add(V3(rr(-0.4, 0.4), -len * 0.5, rr(-0.4, 0.4))),
          p.clone().add(V3(rr(-0.8, 0.8), -len, rr(-0.8, 0.8))),
        ];
      g.add(
        new THREE.Mesh(
          taperTube(new THREE.CatmullRomCurve3(pts), 12, 3, (tt) => 0.025 * (1 - tt)),
          fm
        )
      );
    }
  }
  g.add(pointCloud(P, S, T, 0, pxScale, 'siphonophoreLights'));
  return g;
}

/* ---------- schooling fish (opaque, cast volumetric shadows) ---------- */
function fishGeo() {
  const prof = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    prof.push(
      new THREE.Vector2(
        Math.max(0.004, 0.11 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9)),
        (t - 0.5) * 0.9
      )
    );
  }
  const body = new THREE.LatheGeometry(prof, 10);
  body.rotateX(-Math.PI / 2);
  body.scale(0.45, 1, 1);
  const tail = new THREE.BufferGeometry();
  tail.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 0, -0.4, 0, 0.16, -0.62, 0, -0.16, -0.62, 0, 0.05, 0.05, 0, 0.14, -0.12, 0, 0.02, -0.2],
      3
    )
  );
  tail.computeVertexNormals();
  return mergeGeos([body.toNonIndexed(), tail]);
}
export function mergeGeos(list) {
  const gs = list.map((g) => (g.index ? g.toNonIndexed() : g));
  gs.forEach((g) => {
    if (!g.attributes.normal) g.computeVertexNormals();
  });
  let n = 0;
  for (const g of gs) n += g.attributes.position.count;
  const P = new Float32Array(n * 3),
    Nn = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    P.set(g.attributes.position.array, o * 3);
    Nn.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  return m;
}
export function fishSchool(list, size = 1) {
  const mat = uwMat(
    new THREE.MeshStandardMaterial({
      name: 'silverScales',
      color: 0xb9c3cb,
      metalness: 0.9,
      roughness: 0.28,
      envMapIntensity: 1.3,
      side: THREE.DoubleSide,
    }),
    { key: 'fish' }
  );
  const im = new THREE.InstancedMesh(fishGeo(), mat, list.length);
  im.name = 'fishSchool';
  im.castShadow = true;
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    c = new THREE.Color();
  list.forEach(({ p, d }, i) => {
    q.setFromUnitVectors(V3(0, 0, 1), d.clone().normalize());
    const s = size * rr(0.75, 1.3);
    m.compose(p, q, V3(s, s, s));
    im.setMatrixAt(i, m);
    c.setRGB(rr(0.85, 1.1), rr(0.9, 1.1), rr(0.95, 1.15));
    im.setColorAt(i, c);
  });
  return im;
}
export function baitBall(center, R, n, axis = V3(0, 1, 0)) {
  const out = [],
    q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), axis.clone().normalize());
  for (let i = 0; i < n; i++) {
    const th = rand() * Math.PI * 2,
      rm = R * (0.55 + 0.35 * gauss() * 0.5),
      ph = rand() * Math.PI * 2,
      rn = Math.abs(gauss()) * R * 0.28;
    const lp = V3(
      Math.cos(th) * (rm + rn * Math.cos(ph)),
      rn * Math.sin(ph) * 1.4,
      Math.sin(th) * (rm + rn * Math.cos(ph))
    );
    const ld = V3(-Math.sin(th), gauss() * 0.12, Math.cos(th)).add(
      V3(gauss(), gauss(), gauss()).multiplyScalar(0.12)
    );
    out.push({ p: lp.applyQuaternion(q).add(center), d: ld.applyQuaternion(q) });
  }
  return out;
}
export function fishStream(curve, n, spread) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = rand(),
      p = curve.getPointAt(t),
      d = curve.getTangentAt(t),
      s = spread * (0.35 + Math.sin(t * Math.PI));
    out.push({
      p: p.add(V3(gauss(), gauss() * 0.6, gauss()).multiplyScalar(s)),
      d: d.add(V3(gauss(), gauss(), gauss()).multiplyScalar(0.1)),
    });
  }
  return out;
}

/* ---------- benthic life (instanced, tinted) ---------- */
export function instanced(geo, mat, items, name, cast = true) {
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  im.name = name;
  im.castShadow = cast;
  im.receiveShadow = true;
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    c = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromUnitVectors(V3(0, 1, 0), it.n.clone().normalize());
    if (it.rot) q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), it.rot));
    m.compose(it.p, q, it.s.isVector3 ? it.s : V3(it.s, it.s, it.s));
    im.setMatrixAt(i, m);
    c.setRGB(...it.c);
    im.setColorAt(i, c);
  });
  return im;
}
export function benthicKit(renderer) {
  const fanG = new THREE.PlaneGeometry(1, 1, 8, 8);
  fanG.translate(0, 0.5, 0);
  {
    const p = fanG.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, 0.12 * Math.cos(p.getX(i) * 2.4) + 0.05 * p.getY(i));
    fanG.computeVertexNormals();
  }
  const fanMat = uwMat(
    new THREE.MeshStandardMaterial({
      name: 'gorgonian',
      map: fanTexture(renderer),
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.75,
      metalness: 0,
    }),
    { key: 'fan' }
  );
  const vp = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    vp.push(new THREE.Vector2(0.18 + 0.32 * Math.pow(t, 1.3) + 0.03 * Math.sin(t * 12), t));
  }
  for (let i = 18; i >= 0; i--) {
    const t = i / 18;
    vp.push(new THREE.Vector2(0.14 + 0.28 * Math.pow(t, 1.3), Math.max(0.1, t - 0.02)));
  }
  const spongeG = new THREE.LatheGeometry(vp, 20);
  const spongeMat = uwMat(
    new THREE.MeshStandardMaterial({ name: 'sponge', roughness: 0.92, metalness: 0 }),
    { key: 'sponge', bump: 0.6, bumpScale: 9 }
  );
  const col = new THREE.CylinderGeometry(0.22, 0.3, 0.6, 12);
  col.translate(0, 0.3, 0);
  const parts = [col];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2,
      t = new THREE.ConeGeometry(0.035, 0.55, 5);
    t.translate(0, 0.27, 0);
    t.rotateZ(-0.9 - (i % 2) * 0.35);
    t.rotateY(a);
    t.translate(Math.cos(a) * 0.15, 0.6, -Math.sin(a) * 0.15);
    parts.push(t);
  }
  const anemG = mergeGeos(parts);
  const anemMat = uwMat(
    new THREE.MeshStandardMaterial({
      name: 'anemone',
      roughness: 0.6,
      metalness: 0,
      emissive: 0x220611,
    }),
    { key: 'anem' }
  );
  const tubeG = new THREE.CylinderGeometry(0.045, 0.06, 1, 8, 1, true);
  tubeG.translate(0, 0.5, 0);
  const plumeG = new THREE.ConeGeometry(0.085, 0.26, 10);
  plumeG.rotateX(Math.PI);
  plumeG.translate(0, 1.08, 0);
  const tubeMat = uwMat(
    new THREE.MeshStandardMaterial({ name: 'chitinTube', color: 0xd8d2c0, roughness: 0.6 }),
    { key: 'tube' }
  );
  const plumeMat = uwMat(
    new THREE.MeshStandardMaterial({
      name: 'hemoglobinPlume',
      color: 0xe0140e,
      roughness: 0.45,
      emissive: 0x140100,
    }),
    { key: 'plume' }
  );
  return { fanG, fanMat, spongeG, spongeMat, anemG, anemMat, tubeG, plumeG, tubeMat, plumeMat };
}

/* ---------- hydrothermal chimney ---------- */
export function buildChimney(h, r, seed) {
  const prof = [],
    n = 60;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let rad =
      r *
      (1.3 - 0.75 * Math.pow(t, 0.8)) *
      (1 +
        0.16 * Math.sin(t * 13 + seed) +
        0.09 * Math.sin(t * 37 + seed * 2) +
        0.05 * Math.sin(t * 91 + seed));
    const f = (t * 3.3 + seed * 0.37) % 1;
    if (f < 0.05 && t > 0.15 && t < 0.8) rad *= 1.28 - f * 3;
    prof.push(new THREE.Vector2(Math.max(0.2, rad), t * h));
  }
  prof.push(new THREE.Vector2(r * 0.3, h));
  prof.push(new THREE.Vector2(r * 0.22, h - 1.2));
  const geo = new THREE.LatheGeometry(prof, 40),
    P = geo.attributes.position,
    C = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i),
      y = P.getY(i),
      z = P.getZ(i),
      a = Math.atan2(z, x),
      t = y / h;
    const d =
      1 +
      0.22 * Math.sin(a * 3 + y * 0.5 + seed) +
      0.12 * Math.sin(a * 7 - y * 1.3) +
      0.06 * Math.sin(a * 13 + y * 3.1);
    P.setX(i, x * d + Math.sin(y * 0.21 + seed) * r * 0.25 * t);
    P.setZ(i, z * d);
    const hot = Math.pow(t, 4) * 0.5,
      sulf = Math.max(0, Math.sin(a * 3 + y * 0.4 + seed)) * 0.5 * (1 - t);
    C.set(
      [
        0.035 + hot * 0.12 + sulf * 0.18,
        0.03 + hot * 0.07 + sulf * 0.11,
        0.028 + hot * 0.02 + sulf * 0.02,
      ],
      i * 3
    );
    if (t > 0.94) C.set([0.12, 0.1, 0.085], i * 3);
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const m = new THREE.Mesh(
    geo,
    uwMat(
      new THREE.MeshStandardMaterial({
        name: 'sulfideChimney',
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.1,
      }),
      { key: 'chim', bump: 1.6, bumpScale: 1.3 }
    )
  );
  m.name = 'blackSmoker';
  m.castShadow = m.receiveShadow = true;
  const hotC = new THREE.Mesh(
    new THREE.CircleGeometry(r * 0.32, 20),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.42, 0.08) })
  );
  hotC.rotation.x = -Math.PI / 2;
  hotC.position.y = h - 0.5;
  hotC.position.x = Math.sin(h * 0.21 + seed) * r * 0.25;
  m.add(hotC);
  return m;
}
