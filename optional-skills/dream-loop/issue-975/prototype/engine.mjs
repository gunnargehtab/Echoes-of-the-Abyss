import * as THREE from 'three';
export { THREE };
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = rng(90127);
export const rr = (a, b) => a + (b - a) * rand();
export const gauss = () => {
  let u = 0;
  while (!u) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * rand());
};
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function halton(i, b) {
  let f = 1,
    r = 0;
  while (i > 0) {
    f /= b;
    r += f * (i % b);
    i = Math.floor(i / b);
  }
  return r;
}
export const N2 = (() => {
  const r = rng(77),
    perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const P = new Uint8Array(512);
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const gx = new Float32Array(256),
    gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const a = r() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  return (x, y) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      xf = x - xi,
      yf = y - yi,
      X = xi & 255,
      Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10),
      v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const h00 = P[P[X] + Y],
      h10 = P[P[X + 1] + Y],
      h01 = P[P[X] + Y + 1],
      h11 = P[P[X + 1] + Y + 1];
    const d00 = gx[h00] * xf + gy[h00] * yf,
      d10 = gx[h10] * (xf - 1) + gy[h10] * yf,
      d01 = gx[h01] * xf + gy[h01] * (yf - 1),
      d11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
    const a = d00 + u * (d10 - d00),
      b = d01 + u * (d11 - d01);
    return (a + v * (b - a)) * 1.4;
  };
})();
export function fbm(x, y, o = 4) {
  let s = 0,
    a = 1,
    n = 0;
  for (let i = 0; i < o; i++) {
    s += a * N2(x, y);
    n += a;
    x = x * 2.03 + 13.7;
    y = y * 2.03 + 7.3;
    a *= 0.5;
  }
  return s / n;
}

/* ---------- shared medium + light uniforms ---------- */
export const NS = 12,
  NSH = 6,
  NP = 10,
  NPL = 4;
const arr = (n, f) => Array.from({ length: n }, f);
export const G = {
  uSigS: { value: V3(0.001, 0.0013, 0.0015) },
  uSigT: { value: V3(0.0036, 0.0021, 0.0017) },
  uSpP: { value: arr(NS, () => V3()) },
  uSpD: { value: arr(NS, () => V3(0, -1, 0)) },
  uSpC: { value: arr(NS, () => V3()) },
  uSpK: { value: arr(NS, () => new THREE.Vector2(0.9, 0.95)) },
  uPtP: { value: arr(NP, () => V3()) },
  uPtC: { value: arr(NP, () => new THREE.Vector4(0, 0, 0, 1)) },
  uPingC: { value: V3() },
  uPingR: { value: new THREE.Vector4(1e5, 1e5, 1e5, 1e5) },
  uPingW: { value: new THREE.Vector4(1, 1, 1, 1) },
  uPingI: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPingCol: { value: V3(0.2, 1.2, 1.5) },
  uPingN: { value: V3(0, 1, 0) },
};
export const UW = `
uniform vec3 uSigS; uniform vec3 uSigT;
uniform vec3 uSpP[${NS}]; uniform vec3 uSpD[${NS}]; uniform vec3 uSpC[${NS}]; uniform vec2 uSpK[${NS}];
uniform vec3 uPtP[${NP}]; uniform vec4 uPtC[${NP}];
uniform vec3 uPingC; uniform vec3 uPingN; uniform vec4 uPingR; uniform vec4 uPingW; uniform vec4 uPingI; uniform vec3 uPingCol;
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float h31(vec3 p){p=fract(p*vec3(443.897,441.423,437.195));p+=dot(p,p.yzx+19.19);return fract((p.x+p.y)*p.z);}
float vn2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm2(vec2 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*vn2(p);p=p*2.03+vec2(17.1,9.7);a*=0.5;}return s;}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*vn3(p);p=p*2.02+vec3(3.1,1.7,5.3);a*=0.5;}return s;}
vec3 uwAbs(float d){return exp(-uSigT*d);}
vec3 lampsAt(vec3 p){vec3 L=vec3(0.0);
 for(int i=0;i<${NS};i++){vec3 v=p-uSpP[i];float d=length(v)+1e-3;float k=smoothstep(uSpK[i].x,uSpK[i].y,dot(v/d,uSpD[i]));L+=uSpC[i]*k*uwAbs(d)/(d*d+4.0);}
 for(int i=0;i<${NP};i++){vec3 v=p-uPtP[i];float d2=dot(v,v);L+=uPtC[i].rgb*uwAbs(sqrt(d2))/(d2+uPtC[i].w*uPtC[i].w);}
 return L;}
float pingBand(vec3 p){vec3 v=p-uPingC;float h=dot(v,uPingN);float r=length(v-uPingN*h);float x=(r-uPingR.x)/uPingW.x;float s=h/uPingW.z;
  float tr=r<uPingR.x?exp((r-uPingR.x)/uPingW.y):0.0;return (exp(-x*x)*uPingI.x+tr*uPingI.y)*exp(-s*s);}
float pingReach(vec3 p){vec3 v=p-uPingC;float h=dot(v,uPingN);float r=length(v-uPingN*h);float x=(r-uPingR.x)/uPingW.x;float s=h/(uPingW.z*1.8);
  float sw=r<uPingR.x?0.3*exp((r-uPingR.x)/60.0):0.0;return (exp(-x*x)+sw)*exp(-s*s)*step(1e-4,uPingI.x);}
`;
const BUMP = `
float rockH(vec3 p){return fbm3(p*0.35)+fbm3(p*1.7)*0.28+vn3(p*6.5)*0.07;}
vec3 uwBump(vec3 p,vec3 n,float h){vec3 dpdx=dFdx(p),dpdy=dFdy(p);float dhdx=dFdx(h),dhdy=dFdy(h);vec3 r1=cross(dpdy,n),r2=cross(n,dpdx);float det=dot(dpdx,r1);vec3 g=sign(det)*(dhdx*r1+dhdy*r2);return normalize(abs(det)*n-g);}
`;
const LPB = THREE.ShaderChunk.lights_pars_begin.replace(
  /(?<!float )getDistanceAttenuation\(\s*(\w+)/g,
  'uwAbs( $1 ) * getDistanceAttenuation( $1'
);

/* underwater surface patch: light-path absorption, sonar band, optional rock micro-bump */
export function uwMat(mat, { ping = 1, bump = 0, bumpScale = 1, echo = 0, key = '' } = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, G);
    sh.uniforms.uPingAmt = { value: ping };
    sh.uniforms.uBump = { value: bump };
    sh.uniforms.uBumpS = { value: bumpScale };
    sh.uniforms.uEcho = { value: echo };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vUwW;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
      { vec4 w4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        w4 = instanceMatrix * w4;
      #endif
      vUwW = (modelMatrix * w4).xyz; }`
      );
    let fs = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vUwW; uniform float uPingAmt; uniform float uBump; uniform float uBumpS; uniform float uEcho;\n' +
          UW +
          BUMP
      )
      .replace('#include <lights_pars_begin>', LPB);
    if (bump)
      fs = fs.replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\n normal = uwBump(-vViewPosition, normal, rockH(vUwW*uBumpS)*uBump);'
      );
    let emi = '';
    if (ping)
      emi += `{ vec3 nW = inverseTransformDirection(normal, viewMatrix); float fc = 0.35 + 0.65*max(dot(nW, normalize(uPingC - vUwW)), 0.0);
        totalEmissiveRadiance += uPingCol * pingBand(vUwW) * uPingAmt * fc; }`;
    // sonar return: cyan rim only on the parts the ring has swept, brightest at the front
    if (echo)
      emi += `{ float ndv = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0); float fr = pow(1.0 - ndv, 3.0);
        totalEmissiveRadiance += uPingCol * uEcho * pingReach(vUwW) * (fr + 0.02); }`;
    if (emi)
      fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + emi);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'uw' + (ping ? 1 : 0) + (bump ? 1 : 0) + (echo ? 1 : 0) + key;
  return mat;
}
export const glowColor = (r, g, b) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

/* dim underwater environment for metal reflections */
export function makeEnv(renderer) {
  const s = new THREE.Scene();
  s.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(100, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vD; void main(){ float y=vD.y; vec3 c=mix(vec3(0.0),vec3(0.018,0.045,0.055),smoothstep(-0.25,0.95,y)); gl_FragColor=vec4(c,1.0); }`,
      })
    )
  );
  for (const [x, y, z, r, c] of [
    [40, 30, -60, 4, [6, 4.2, 2.6]],
    [-70, 10, 30, 3, [5, 3.6, 2.2]],
    [20, -20, 80, 5, [0.4, 2.2, 2.6]],
    [-30, 60, -20, 7, [0.25, 0.6, 0.7]],
    [80, -5, 10, 2.5, [5, 3.4, 2]],
  ]) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...c) })
    );
    b.position.set(x, y, z);
    s.add(b);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
}

/* ---------- lens: sub-pixel AA + thin-lens DOF via accumulated jitter ---------- */
export function makeJitter(camera, { focus, aperture }) {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const P0 = camera.projectionMatrix.clone(),
    pos0 = camera.position.clone();
  const right = V3(1, 0, 0).applyQuaternion(camera.quaternion),
    up = V3(0, 1, 0).applyQuaternion(camera.quaternion);
  return (k, W, H) => {
    const jx = halton(k + 1, 2) - 0.5,
      jy = halton(k + 1, 3) - 0.5;
    const r = Math.sqrt(halton(k + 1, 5)) * aperture,
      a = halton(k + 1, 7) * Math.PI * 2,
      ox = r * Math.cos(a),
      oy = r * Math.sin(a);
    camera.position.copy(pos0).addScaledVector(right, ox).addScaledVector(up, oy);
    camera.updateMatrixWorld(true);
    const P = P0.clone();
    P.elements[8] += (-P.elements[0] * ox) / focus + (2 * jx) / W;
    P.elements[9] += (-P.elements[5] * oy) / focus + (2 * jy) / H;
    camera.projectionMatrix.copy(P);
    camera.projectionMatrixInverse.copy(P).invert();
  };
}

/* ---------- additive FX materials (rendered after the volume pass) ---------- */
const FX = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const VSW = `varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
export function glowMat(col, I) {
  return new THREE.ShaderMaterial({
    ...FX,
    uniforms: Object.assign({}, G, { uCol: { value: V3(...col) }, uI: { value: I } }),
    vertexShader: VSW,
    fragmentShader: `${UW} uniform vec3 uCol; uniform float uI; varying vec2 vUv; varying vec3 vW;
      void main(){ float r=length(vUv-0.5)*2.0; float a=(exp(-r*r*6.0)*0.45+exp(-r*r*60.0))*(1.0-smoothstep(0.75,1.0,r));
        gl_FragColor=vec4(uCol*uI*a*uwAbs(distance(cameraPosition,vW)),1.0); }`,
  });
}
export function streakMat(col, I) {
  return new THREE.ShaderMaterial({
    ...FX,
    uniforms: Object.assign({}, G, { uCol: { value: V3(...col) }, uI: { value: I } }),
    vertexShader: VSW,
    fragmentShader: `${UW} uniform vec3 uCol; uniform float uI; varying vec2 vUv; varying vec3 vW;
      void main(){ float a=pow(vUv.x,3.0)*(1.0-smoothstep(0.985,1.0,vUv.x)); gl_FragColor=vec4(uCol*uI*a*uwAbs(distance(cameraPosition,vW)),1.0); }`,
  });
}
export function shellMat(col, I, sharp, noiseAmt = 0.9, fill = 0.12) {
  return new THREE.ShaderMaterial({
    ...FX,
    side: THREE.DoubleSide,
    uniforms: Object.assign({}, G, {
      uCol: { value: V3(...col) },
      uI: { value: I },
      uSh: { value: sharp },
      uN: { value: noiseAmt },
      uFill: { value: fill },
    }),
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vP; void main(){ vP=normalize(position); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${UW} uniform vec3 uCol; uniform float uI; uniform float uSh; uniform float uN; uniform float uFill; varying vec3 vW; varying vec3 vN; varying vec3 vP;
      void main(){ vec3 V=normalize(cameraPosition-vW); float e=1.0-abs(dot(normalize(vN),V)); float ring=pow(e,uSh)+uFill*pow(e,uSh*0.25);
        float br=mix(1.0,0.35+1.3*fbm3(vP*4.5+3.0),uN); gl_FragColor=vec4(uCol*uI*ring*br*uwAbs(distance(cameraPosition,vW)),1.0); }`,
  });
}
export function pingRingMat(col, I, { R, wf, lt, seed = 0, body = 1 }) {
  return new THREE.ShaderMaterial({
    ...FX,
    side: THREE.DoubleSide,
    uniforms: Object.assign({}, G, {
      uCol: { value: V3(...col) },
      uI: { value: I },
      uR: { value: R },
      uWf: { value: wf },
      uLt: { value: lt },
      uSeed: { value: seed },
      uBody: { value: body },
    }),
    vertexShader: `varying vec3 vW; varying vec2 vL; void main(){ vL=position.xy; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${UW} uniform vec3 uCol; uniform float uI; uniform float uR; uniform float uWf; uniform float uLt; uniform float uSeed; uniform float uBody; varying vec3 vW; varying vec2 vL;
      void main(){ float r=length(vL); vec2 ca=vL/max(r,1e-3);
        float n1=fbm3(vec3(ca*2.4,uSeed*0.37+1.3)), n2=fbm3(vec3(ca*34.0,r*0.03+uSeed));
        float q=r+(n1-0.5)*uWf*5.0, x=(q-uR)/uWf;
        float front=exp(-x*x), halo=exp(-x*x*0.03)*0.08;
        float body=(q<uR?exp((q-uR)/uLt):0.0)*0.1*uBody*(0.4+1.2*n2);
        float b=(front+halo+body)*(0.5+n1)*smoothstep(uR*0.45,uR*0.7,r);
        gl_FragColor=vec4(uCol*uI*b*uwAbs(distance(cameraPosition,vW)),1.0); }`,
  });
}
export function pointsMat(shape, pxScale, lit = 1) {
  return new THREE.ShaderMaterial({
    ...FX,
    uniforms: Object.assign({}, G, {
      uPx: { value: pxScale },
      uAmb: { value: V3(0.0012, 0.0032, 0.0042) },
      uShape: { value: shape },
      uLit: { value: lit },
    }),
    vertexShader: `${UW} attribute float aSize; attribute vec3 aTint; uniform float uPx; uniform vec3 uAmb; uniform float uLit; varying vec3 vCol;
      void main(){ vec4 w=modelMatrix*vec4(position,1.0); vec4 mv=viewMatrix*w; gl_Position=projectionMatrix*mv; float dist=-mv.z;
        float ps=aSize*uPx/max(dist,0.5); gl_PointSize=max(ps,1.5);
        vec3 L=(uAmb+lampsAt(w.xyz)*0.3+uPingCol*pingBand(w.xyz)*0.4)*uLit+aTint;
        vCol=L*uwAbs(dist)*min(1.0,(ps*ps)/2.25); }`,
    fragmentShader: `uniform float uShape; varying vec3 vCol;
      void main(){ vec2 c=gl_PointCoord-0.5; float r=length(c)*2.0; if(r>1.0) discard; float a;
        if(uShape<0.5) a=pow(1.0-r,1.6);
        else { float ring=smoothstep(0.55,0.84,r)*(1.0-smoothstep(0.86,1.0,r)); float spec=1.0-smoothstep(0.0,0.3,length(c-vec2(-0.16,0.16))*2.0); a=ring*0.8+spec+0.1*(1.0-r); }
        gl_FragColor=vec4(vCol*a,1.0); }`,
  });
}
export function pointCloud(P, S, T, shape, pxScale, name, lit = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(S, 1));
  g.setAttribute('aTint', new THREE.BufferAttribute(T, 3));
  const p = new THREE.Points(g, pointsMat(shape, pxScale, lit));
  p.name = name;
  p.frustumCulled = false;
  return p;
}

/* ---------- pipeline: opaque -> volume -> fx -> accumulate -> post ---------- */
export function createPipeline(renderer, W, H, { steps = 16 } = {}) {
  const fl = renderer.extensions.has('EXT_color_buffer_float')
    ? THREE.FloatType
    : THREE.HalfFloatType;
  const LIN = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rtO = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.HalfFloatType,
    ...LIN,
    depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType),
  });
  const rtC = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.HalfFloatType,
    ...LIN,
    depthBuffer: true,
  });
  const acc = [0, 1].map(
    () => new THREE.WebGLRenderTarget(W, H, { type: fl, ...LIN, depthBuffer: false })
  );
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    fsScene = new THREE.Scene(),
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  fsScene.add(quad);
  const VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
  const pm = (fs, u, o = {}) =>
    new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: fs,
      uniforms: u,
      depthTest: false,
      depthWrite: false,
      ...o,
    });
  const pass = (m, t) => {
    quad.material = m;
    renderer.setRenderTarget(t);
    renderer.render(fsScene, fsCam);
  };

  // volumetric in-scattering (shadowed spots, point emitters, vent smoke), camera-path extinction
  let shDecl = '',
    spots = '';
  for (let i = 0; i < NSH; i++) shDecl += `uniform sampler2D uSh${i};\n`;
  for (let i = 0; i < NS; i++) {
    const S = i < NSH ? `shd(uSh${i}, uShM[${i}], uSpP[${i}], p, d)` : '1.0';
    spots += `{ vec3 v=p-uSpP[${i}]; float d=length(v)+1e-3; vec3 l=v/d; float k=smoothstep(uSpK[${i}].x,uSpK[${i}].y,dot(l,uSpD[${i}])); if(k>0.001) Ls+=uSpC[${i}]*k*exp(-uSigT*d)/(d*d+2.0)*hg(dot(l,-rd))*${S}; }\n`;
  }
  const shU = {};
  for (let i = 0; i < NSH; i++) shU['uSh' + i] = { value: null };
  const vol = pm(
    `${UW}
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uCamW; uniform vec3 uCamPos;
    uniform float uSeed; uniform float uTMax; uniform float uVolS; uniform float uG; uniform vec3 uAmbA; uniform vec3 uAmbB; uniform vec2 uAmbY;
    uniform mat4 uShM[${NSH}]; ${shDecl}
    uniform vec4 uPl[${NPL}]; uniform vec4 uPlK[${NPL}]; uniform vec3 uDrift; uniform float uSmokeAbs; uniform vec3 uVentCol;
    varying vec2 vUv;
    float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
    float hg(float c){float g=uG,g2=g*g;return (1.0-g2)/(12.566*pow(max(1.0+g2-2.0*g*c,1e-4),1.5));}
    float shd(sampler2D s,mat4 m,vec3 lp,vec3 p,float d){vec4 c=m*vec4(p,1.0);if(c.w<=0.01)return 1.0;vec2 uv=c.xy/c.w*0.5+0.5;
      if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0)return 1.0;return d<texture2D(s,uv).r+0.8?1.0:0.0;}
    float plumes(vec3 p,out float glow){float ds=0.0;glow=0.0;
      for(int i=0;i<${NPL};i++){float H=uPl[i].w;if(H<=0.0)continue;vec3 b=uPl[i].xyz;float h=p.y-b.y;if(h<-2.0||h>H)continue;float hn=max(h,0.0);
        vec3 ax=b+vec3(0.0,hn,0.0)+uDrift*(hn*hn/H);vec2 dxz=(p-ax).xz;float r=uPlK[i].x+hn*uPlK[i].y;float q=dot(dxz,dxz)/(r*r);if(q>3.0)continue;
        float n=fbm3(vec3(p.x,p.y*0.8-hn*0.3,p.z)*0.16+float(i)*7.3);
        ds+=exp(-q*1.5)*smoothstep(0.30,0.70,n+0.3*(1.0-q/3.0))*(1.0-smoothstep(H*0.55,H,hn))*smoothstep(-2.0,0.5,h)*uPlK[i].z;
        glow+=exp(-hn*0.28)*exp(-q*2.2)*smoothstep(-2.0,0.0,h)*uPlK[i].w;}
      return ds;}
    void main(){
      float dz=texture2D(tDepth,vUv).r; bool bg=dz>=0.999999;
      vec4 vp=uProjInv*vec4(vUv*2.0-1.0,dz*2.0-1.0,1.0); vp.xyz/=vp.w; vec3 wp=(uCamW*vec4(vp.xyz,1.0)).xyz;
      vec3 rd=normalize(wp-uCamPos); float tMax=bg?uTMax:min(distance(wp,uCamPos),uTMax);
      float j=fract(ign(gl_FragCoord.xy)+uSeed); vec3 acc=vec3(0.0); float od=0.0;
      for(int i=0;i<${steps};i++){
        float s=(float(i)+j)/${steps}.0; float t=tMax*s*s; float w=2.0*tMax*s/${steps}.0; vec3 p=uCamPos+rd*t; vec3 Ls=vec3(0.0);
        ${spots}
        for(int k=0;k<${NP};k++){vec3 v=p-uPtP[k];float d2=dot(v,v)+1e-4;float d=sqrt(d2);Ls+=uPtC[k].rgb*exp(-uSigT*d)/(d2+uPtC[k].w*uPtC[k].w)*hg(dot(v/d,-rd));}
        float gl; float sm=plumes(p,gl);
        float dens=0.45+1.1*fbm3(p*vec3(0.018,0.03,0.018))+sm*7.0;
        vec3 amb=mix(uAmbB,uAmbA,smoothstep(uAmbY.x,uAmbY.y,p.y));
        acc+=exp(-uSigT*t-vec3(od))*(uSigS*dens*(uVolS*Ls+amb)+uVentCol*gl)*w;
        od+=sm*uSmokeAbs*w;
      }
      vec3 surf=bg?vec3(0.0):texture2D(tColor,vUv).rgb*exp(-uSigT*tMax-vec3(od));
      gl_FragColor=vec4(surf+acc,1.0); gl_FragDepth=dz;
    }`,
    Object.assign({}, G, shU, {
      tColor: { value: rtO.texture },
      tDepth: { value: rtO.depthTexture },
      uProjInv: { value: new THREE.Matrix4() },
      uCamW: { value: new THREE.Matrix4() },
      uCamPos: { value: V3() },
      uSeed: { value: 0 },
      uTMax: { value: 2600 },
      uVolS: { value: 9 },
      uG: { value: 0.4 },
      uAmbA: { value: V3(0.01, 0.03, 0.038) },
      uAmbB: { value: V3(0, 0, 0) },
      uAmbY: { value: new THREE.Vector2(-600, 300) },
      uShM: { value: arr(NSH, () => new THREE.Matrix4()) },
      uPl: { value: arr(NPL, () => new THREE.Vector4(0, 0, 0, 0)) },
      uPlK: { value: arr(NPL, () => new THREE.Vector4(1, 0.1, 1, 1)) },
      uDrift: { value: V3(0.3, 0, 0) },
      uSmokeAbs: { value: 0.22 },
      uVentCol: { value: V3(0.03, 0.008, 0.0012) },
    }),
    { depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth }
  );

  const accM = pm(
    // A reset must not round against the previous camera's accumulated HDR values.
    `uniform sampler2D tA; uniform sampler2D tB; uniform float uW; varying vec2 vUv;
    void main(){
      vec3 next=texture2D(tB,vUv).rgb;
      if(uW==1.0) gl_FragColor=vec4(next,1.0);
      else gl_FragColor=vec4(mix(texture2D(tA,vUv).rgb,next,uW),1.0);
    }`,
    { tA: { value: null }, tB: { value: null }, uW: { value: 1 } }
  );

  // bloom + grade
  const RTO = { type: THREE.HalfFloatType, depthBuffer: false, ...LIN };
  const lv = [];
  {
    let w = W >> 1,
      h = H >> 1;
    for (let i = 0; i < 7; i++) {
      lv.push({
        a: new THREE.WebGLRenderTarget(w, h, RTO),
        b: new THREE.WebGLRenderTarget(w, h, RTO),
        w,
        h,
      });
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }
  }
  const stA = new THREE.WebGLRenderTarget(lv[2].w, lv[2].h, RTO),
    stB = new THREE.WebGLRenderTarget(lv[2].w, lv[2].h, RTO);
  const TAP4 = `vec3 tap4(sampler2D t,vec2 uv,vec2 tx){return (texture2D(t,uv+tx*vec2(-1,-1)).rgb+texture2D(t,uv+tx*vec2(1,-1)).rgb+texture2D(t,uv+tx*vec2(-1,1)).rgb+texture2D(t,uv+tx*vec2(1,1)).rgb)*0.25;}`;
  const bright = pm(
    `uniform sampler2D tSrc; uniform vec2 uTx; uniform float uThr; varying vec2 vUv; ${TAP4}
    void main(){ vec3 c=min(tap4(tSrc,vUv,uTx),vec3(80.0)); float l=max(c.r,max(c.g,c.b)); float k=0.8; float s=clamp(l-uThr+k,0.0,2.0*k); s=s*s/(4.0*k+1e-5);
      gl_FragColor=vec4(c*(max(s,l-uThr)/max(l,1e-5)),1.0); }`,
    { tSrc: { value: null }, uTx: { value: new THREE.Vector2() }, uThr: { value: 0.9 } }
  );
  const down = pm(
    `uniform sampler2D tSrc; uniform vec2 uTx; varying vec2 vUv; ${TAP4} void main(){ gl_FragColor=vec4(tap4(tSrc,vUv,uTx),1.0); }`,
    { tSrc: { value: null }, uTx: { value: new THREE.Vector2() } }
  );
  const blurM = pm(
    `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec3 c=texture2D(tSrc,vUv).rgb*0.2270270270; c+=(texture2D(tSrc,vUv+uDir*1.3846153846).rgb+texture2D(tSrc,vUv-uDir*1.3846153846).rgb)*0.3162162162;
      c+=(texture2D(tSrc,vUv+uDir*3.2307692308).rgb+texture2D(tSrc,vUv-uDir*3.2307692308).rgb)*0.0702702703; gl_FragColor=vec4(c,1.0); }`,
    { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }
  );
  const comp = pm(
    `uniform sampler2D tScene,t0,t1,t2,t3,t4,t5,t6,tStreak; uniform float uBloom,uStreak,uExpo; uniform vec2 uRes; varying vec2 vUv;
    float hh(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c)); }
    void main(){ vec2 cc=vUv-0.5; float ca=0.0012*dot(cc,cc)*4.0;
      vec3 col=vec3(texture2D(tScene,vUv-cc*ca).r,texture2D(tScene,vUv).g,texture2D(tScene,vUv+cc*ca).b);
      vec3 bl=texture2D(t0,vUv).rgb*0.35+texture2D(t1,vUv).rgb*0.5+texture2D(t2,vUv).rgb*0.65+texture2D(t3,vUv).rgb*0.8+texture2D(t4,vUv).rgb*0.95+texture2D(t5,vUv).rgb*1.05+texture2D(t6,vUv).rgb*1.1;
      col+=bl*uBloom+texture2D(tStreak,vUv).rgb*uStreak*vec3(0.6,0.85,1.0);
      col*=uExpo; float vig=1.0-smoothstep(0.42,1.05,length(cc*vec2(1.0,1.25))); col*=mix(0.45,1.0,vig);
      col=col*mat3(1.02,-0.01,-0.01, -0.02,1.03,-0.01, -0.03,0.0,1.03);
      col=aces(col); col=pow(col,vec3(1.03)); col=toSRGB(col);
      float lum=dot(col,vec3(0.299,0.587,0.114)); col+=vec3(-0.004,0.006,0.009)*(1.0-lum)*(1.0-lum);
      col+=(hh(vUv*uRes+7.13)-0.5)*0.024+(hh(vUv*uRes*1.37+3.1)-0.5)/255.0;
      gl_FragColor=vec4(clamp(col,0.0,1.0),1.0); }`,
    {
      tScene: { value: null },
      t0: { value: null },
      t1: { value: null },
      t2: { value: null },
      t3: { value: null },
      t4: { value: null },
      t5: { value: null },
      t6: { value: null },
      tStreak: { value: null },
      uBloom: { value: 0.35 },
      uStreak: { value: 0.12 },
      uExpo: { value: 1.75 },
      uRes: { value: new THREE.Vector2(W, H) },
    }
  );
  const blur = (L, sp = 1) => {
    blurM.uniforms.tSrc.value = L.a.texture;
    blurM.uniforms.uDir.value.set(sp / L.w, 0);
    pass(blurM, L.b);
    blurM.uniforms.tSrc.value = L.b.texture;
    blurM.uniforms.uDir.value.set(0, sp / L.h);
    pass(blurM, L.a);
  };

  let cur = 0;
  return {
    vol,
    comp,
    rtO,
    frame(scene, fx, camera, k) {
      if (k === 0) cur = 0;
      renderer.autoClear = false;
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(rtO);
      renderer.clear();
      renderer.render(scene, camera);
      const u = vol.uniforms;
      u.uProjInv.value.copy(camera.projectionMatrixInverse);
      u.uCamW.value.copy(camera.matrixWorld);
      u.uCamPos.value.copy(camera.position);
      u.uSeed.value = (k * 0.61803398875) % 1;
      renderer.setRenderTarget(rtC);
      renderer.clear();
      pass(vol, rtC);
      renderer.setRenderTarget(rtC);
      renderer.render(fx, camera);
      accM.uniforms.tA.value = acc[cur].texture;
      accM.uniforms.tB.value = rtC.texture;
      accM.uniforms.uW.value = 1 / (k + 1);
      pass(accM, acc[1 - cur]);
      cur = 1 - cur;
    },
    present() {
      const src = acc[cur].texture;
      bright.uniforms.tSrc.value = src;
      bright.uniforms.uTx.value.set(1 / W, 1 / H);
      pass(bright, lv[0].a);
      blur(lv[0]);
      for (let i = 1; i < lv.length; i++) {
        down.uniforms.tSrc.value = lv[i - 1].a.texture;
        down.uniforms.uTx.value.set(1 / lv[i - 1].w, 1 / lv[i - 1].h);
        pass(down, lv[i].a);
        blur(lv[i]);
      }
      let s = lv[2].a,
        d = stA;
      for (const sp of [1, 3, 9, 22]) {
        blurM.uniforms.tSrc.value = s.texture;
        blurM.uniforms.uDir.value.set(sp / lv[2].w, 0);
        pass(blurM, d);
        s = d;
        d = d === stA ? stB : stA;
      }
      const c = comp.uniforms;
      c.tScene.value = src;
      for (let i = 0; i < 7; i++) c['t' + i].value = lv[i].a.texture;
      c.tStreak.value = s.texture;
      pass(comp, null);
    },
    /* distance maps from the key spotlights so beams are shadowed by hulls, fish, rock */
    bakeVolShadows(scene, list, size = 1024) {
      const dm = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: { uLP: { value: V3() } },
        vertexShader: `varying vec3 vW; void main(){ vec4 p=vec4(position,1.0);
          #ifdef USE_INSTANCING
            p=instanceMatrix*p;
          #endif
          vec4 w=modelMatrix*p; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `uniform vec3 uLP; varying vec3 vW; void main(){ gl_FragColor=vec4(distance(vW,uLP)); }`,
      });
      const hidden = [];
      scene.traverse((o) => {
        if (o.visible && (o.userData.noVol || o.isPoints || o.isLight)) {
          if (!o.isLight) {
            o.visible = false;
            hidden.push(o);
          }
        }
      });
      const prevOv = scene.overrideMaterial;
      scene.overrideMaterial = dm;
      list.slice(0, NSH).forEach((L, i) => {
        const rt = new THREE.WebGLRenderTarget(size, size, {
          type: fl,
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          depthBuffer: true,
        });
        const cam = new THREE.PerspectiveCamera(
          Math.min(170, (L.angle * 2.3 * 180) / Math.PI),
          1,
          0.5,
          L.range || 3000
        );
        cam.position.copy(L.pos);
        cam.lookAt(L.pos.clone().add(L.dir));
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        dm.uniforms.uLP.value.copy(L.pos);
        renderer.setRenderTarget(rt);
        renderer.setClearColor(0xffffff, 1);
        renderer.setClearAlpha(1);
        renderer.clear();
        const cc = new THREE.Color();
        renderer.getClearColor(cc);
        renderer.setClearColor(new THREE.Color(1e5, 1e5, 1e5), 1);
        renderer.clear();
        renderer.render(scene, cam);
        vol.uniforms['uSh' + i].value = rt.texture;
        vol.uniforms.uShM.value[i].multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      });
      for (let i = list.length; i < NSH; i++) {
        const rt = new THREE.WebGLRenderTarget(4, 4, { type: fl });
        renderer.setRenderTarget(rt);
        renderer.setClearColor(new THREE.Color(1e5, 1e5, 1e5), 1);
        renderer.clear();
        vol.uniforms['uSh' + i].value = rt.texture;
      }
      scene.overrideMaterial = prevOv;
      hidden.forEach((o) => (o.visible = true));
      renderer.setClearColor(0x000000, 1);
    },
  };
}

/* spotlight that drives surfaces (three.js) + the volume/FX uniforms */
let spotN = 0,
  ptN = 0;
export function addSpot(
  scene,
  {
    pos,
    dir,
    angle,
    penumbra = 0.6,
    color = [1, 0.8, 0.56],
    I = 50000,
    shadow = false,
    vol = 1,
    surf = 1,
    shadowSize = 2048,
  }
) {
  dir = dir.clone().normalize();
  let light = null;
  if (surf > 0) {
    light = new THREE.SpotLight(new THREE.Color(...color), I * surf, 0, angle * 1.25, penumbra, 2);
    light.position.copy(pos);
    light.target.position.copy(pos).addScaledVector(dir, 100);
    scene.add(light, light.target);
    if (shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(shadowSize, shadowSize);
      light.shadow.camera.near = 1;
      light.shadow.camera.far = 2500;
      light.shadow.bias = -0.0004;
      light.shadow.normalBias = 0.05;
      light.shadow.radius = 2.5;
    }
  }
  if (spotN < NS && vol > 0) {
    const i = spotN++;
    G.uSpP.value[i].copy(pos);
    G.uSpD.value[i].copy(dir);
    G.uSpC.value[i].set(...color).multiplyScalar(I * vol);
    G.uSpK.value[i].set(Math.cos(angle), Math.cos(angle * (1 - penumbra)));
  }
  return { light, pos: pos.clone(), dir, angle, range: 2500 };
}
export function addPoint(scene, { pos, color, I, soft = 2, surf = 1, vol = 1 }) {
  if (surf > 0) {
    const l = new THREE.PointLight(new THREE.Color(...color), I * surf, 0, 2);
    l.position.copy(pos);
    scene.add(l);
  }
  if (ptN < NP && vol > 0) {
    const i = ptN++;
    G.uPtP.value[i].copy(pos);
    G.uPtC.value[i].set(color[0] * I * vol, color[1] * I * vol, color[2] * I * vol, soft);
  }
}
