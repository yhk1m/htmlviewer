// © 2026 김용현
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Sky } from './vendor/Sky.js';
import { simulate, simulateGurye, SITE, N, SIZE, CELL, WATER_LEVEL, rng32, sampleH } from './sim.js';

const GURYE = SITE === 'gurye';
import { createSchematic } from './schematic.js';

// 폰에서는 화면 배치와 부담을 줄인다.
const isPhone = () => innerWidth <= 820;
const PHONE = isPhone();
const portraitZoom = () => { const a = innerWidth / innerHeight; return a < 1 ? Math.min(2.2, 0.95 / a) : 1; };

// 높이 과장: 낮은 땅(선상지가 있는 높이)은 vk배로 키우고, 산은 덜 키워 형태를 지킨다.
let vk = 3;
const H0 = 220;
const ex = h => (h <= H0 ? h * vk : H0 * vk + (h - H0) * (1 + (vk - 1) * 0.25));
let currentView = 'oblique';

const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };
const nextFrame = () => new Promise(r => setTimeout(r, 30));

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, PHONE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9fb8d2, (GURYE ? 0.00012 : 0.00016) * (PHONE ? 0.5 : 1));
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 8, 90000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 150;
controls.maxDistance = 20000;

const VIEWS = GURYE ? {
  oblique: { p: [-2500, 430, 3000], t: [-250, 70, 60] },
  above: { p: [-1700, 3400, 2900], t: [-150, 0, -200] },
  close: { p: [-1000, 190, 700], t: [240, 110, -700] },
  apex: { p: [-1300, 420, -1600], t: [-300, 60, 500] },
} : {
  oblique: { p: [-340, 330, 2820], t: [-60, 40, -520] },
  above: { p: [-700, 2500, 2300], t: [-220, 0, 200] },
  close: { p: [-120, 150, 480], t: [-280, 60, -480] },
  apex: { p: [430, 240, 240], t: [-280, 70, -620] },
};
function setView(name) {
  const v = VIEWS[name];
  currentView = name;
  const z = portraitZoom(), ty = ex(v.t[1]);
  camera.position.set(v.t[0] + (v.p[0] - v.t[0]) * z, ty + (v.p[1] * (1 + (vk - 1) * 0.7) - ty) * z, v.t[2] + (v.p[2] - v.t[2]) * z);
  controls.target.set(v.t[0], ty, v.t[2]);
  controls.update();
  invalidate();
}

// 하늘과 빛
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 27), THREE.MathUtils.degToRad(-128));
const sky = new Sky();
sky.scale.setScalar(80000);
Object.assign(sky.material.uniforms.turbidity, { value: 5.5 });
Object.assign(sky.material.uniforms.rayleigh, { value: 1.6 });
Object.assign(sky.material.uniforms.mieCoefficient, { value: 0.006 });
Object.assign(sky.material.uniforms.mieDirectionalG, { value: 0.8 });
sky.material.uniforms.sunPosition.value.copy(sun);
scene.add(sky);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene(); const c = sky.clone(); s.add(c);
  scene.environment = pm.fromScene(s, 0, 1, 100000).texture;
  scene.environmentIntensity = 0.38;
}
const light = new THREE.DirectionalLight(0xfff0dc, 3.3);
light.position.copy(sun).multiplyScalar(6000);
light.castShadow = true;
light.shadow.mapSize.setScalar(PHONE ? 2048 : 4096);
{
  const e = SIZE * 0.72;
  Object.assign(light.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 100, far: 16000 });
}
light.shadow.bias = -0.0006;
light.shadow.normalBias = 3;
scene.add(light);

// 재질 사진 (ambientCG, CC0)
const loader = new THREE.TextureLoader();
const loadTex = (name, srgb = true) => new Promise(res => loader.load(`./textures/${name}.jpg`, t => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  res(t);
}));

function noiseTexture() {
  // 반복되는 큰 무늬를 가리는 얼룩 텍스처
  const S = 512, data = new Uint8Array(S * S * 4), rand = rng32(99);
  const layer = (cells, ch) => {
    const g = new Float32Array(cells * cells).map(() => rand());
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let s = 0, a = 0.5, c = cells, o = 0;
      for (let oc = 0; oc < 4; oc++) {
        const fx = (x / S) * c, fy = (y / S) * c, ix = Math.floor(fx), iy = Math.floor(fy);
        const u = fx - ix, v = fy - iy, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
        const m = cells, off = oc * 37;
        const val = (p, q) => g[((p + off) % m + m) % m + (((q + off) % m + m) % m) * m];
        const nx = (ix + 1) % c, ny = (iy + 1) % c;
        s += a * ((val(ix, iy) * (1 - su) + val(nx, iy) * su) * (1 - sv) + (val(ix, ny) * (1 - su) + val(nx, ny) * su) * sv);
        o += a; a *= 0.5; c *= 2;
      }
      data[(y * S + x) * 4 + ch] = 255 * (s / o);
    }
  };
  layer(8, 0); layer(16, 1); layer(32, 2); layer(64, 3);
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

const splatTex = data => {
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
};

const TERRAIN_GLSL_HEAD = /* glsl */`
uniform sampler2D tA, tB, tNoise, tRock, tRockN, tGravel, tGravelN, tGrass, tMixed, tSoil, tSoilN;
uniform float uSize, uGrainView;
varying vec3 vWP; varying vec3 vWN;
float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec3 triRock(vec3 wp, vec3 n, float s){
  vec3 w=pow(abs(n),vec3(4.)); w/=w.x+w.y+w.z;
  return texture2D(tRock,wp.zy/s).rgb*w.x+texture2D(tRock,wp.xz/s).rgb*w.y+texture2D(tRock,wp.xy/s).rgb*w.z;
}
// 논밭 조각: 큰 구획 안에 길쭉한 필지를 나눈다.
void fieldColor(vec2 p, float dry, float nz, out vec3 col, out float rough){
  float a=0.32; mat2 R=mat2(cos(a),-sin(a),sin(a),cos(a)); p=R*p;
  vec2 blk=floor(p/vec2(210.,160.)); vec2 inB=fract(p/vec2(210.,160.));
  float road=step(inB.x,.014)+step(inB.y,.018);
  float hb=hash21(blk);
  float n=hb>.5?8.:6.;
  vec2 cellP=inB*vec2(hb>.5?n:2.,hb>.5?2.:n);
  vec2 cid=floor(cellP); vec2 cf=fract(cellP);
  float h=hash21(blk*7.3+cid*3.1);
  float bund=smoothstep(.0,.035,cf.x)*smoothstep(.0,.035,cf.y)*smoothstep(0.,.035,1.-cf.x)*smoothstep(0.,.035,1.-cf.y);
  vec3 rice=mix(vec3(.13,.215,.07),vec3(.2,.285,.09),h);
  vec3 dark=vec3(.065,.115,.05);
  vec3 bare=mix(vec3(.21,.17,.115),vec3(.28,.235,.16),h);
  vec3 orchard=mix(vec3(.07,.12,.05),vec3(.12,.17,.07),h);
  vec3 plastic=vec3(.5,.52,.52);
  vec3 c=rice;
  if(h>.82) c=bare; else if(h>.68) c=dark;
  if(dry>.5){
    // 선앙: 물이 부족해 밭과 과수원이 많다.
    vec2 tp=fract(p/14.); float dots=smoothstep(.42,.2,length(tp-.5));
    c=h>.55?mix(orchard,orchard*.55,dots):(h>.25?mix(bare,vec3(.2,.27,.1),.45):rice*.9);
  } else if(h>.985){ c=plastic; }
  c*=.82+.36*nz;
  c=mix(vec3(.2,.18,.11),c,bund);
  c=mix(c,vec3(.3,.29,.26),clamp(road,0.,1.)*.42);
  col=c; rough=(c==plastic)?.35:.92;
}
`;

function patchTerrain(mat, uniforms) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TERRAIN_GLSL_HEAD)
      .replace('#include <map_fragment>', /* glsl */`
vec2 suv=vWP.xz/uSize+.5;
vec3 wn=normalize(vWN);
float mac=texture2D(tNoise,vWP.xz/2100.).r;
float mid=texture2D(tNoise,vWP.xz/330.).g;
float fin=texture2D(tNoise,vWP.xz/70.).b;
float tiny=texture2D(tNoise,vWP.xz/17.).a;
// 경계를 번지게 해서 재질 칸이 드러나지 않게 한다.
vec2 jit=(vec2(mid,fin)-.5)*.0052;
vec4 sa=texture2D(tA,suv+jit); vec4 sb=texture2D(tB,suv+jit*.5);

vec3 rockC=triRock(vWP,wn,70.)*.55+triRock(vWP,wn,19.)*.45;
rockC=mix(rockC,rockC*vec3(1.25,1.12,.95),mid);
rockC*=1.15+.5*(fin-.5);
vec2 gj=(vec2(mac,mid)-.5)*.35;
vec3 gravelC=texture2D(tGravel,vWP.xz/53.+gj).rgb*.45+texture2D(tGravel,vWP.xz/7.+gj*3.).rgb*.55;
gravelC=mix(gravelC,vec3(.40,.36,.30),.45)*(.62+.42*mid+.34*fin);
vec3 soilC=mix(texture2D(tSoil,vWP.xz/48.).rgb,texture2D(tMixed,vWP.xz/90.).rgb,.28)*(.74+.5*mid);
vec3 grassC=mix(texture2D(tGrass,vWP.xz/44.).rgb,texture2D(tMixed,vWP.xz/120.).rgb,smoothstep(.42,.62,mid)*.65);
grassC=mix(grassC,grassC*vec3(1.18,1.0,.62),mac)*(.72+.45*fin);
grassC*=mix(vec3(1.),texture2D(tGrass,vWP.xz/4.3).rgb*2.6,.5);
// 멀리서 본 숲: 나무 덩어리 그늘과 색 차이
float canopy=smoothstep(.33,.68,tiny)*.65+smoothstep(.3,.7,fin)*.35;
vec3 forestC=mix(vec3(.018,.052,.024),vec3(.058,.125,.043),canopy);
forestC=mix(forestC,forestC*vec3(1.35,1.15,.8),smoothstep(.45,.7,mac));
forestC=mix(forestC,vec3(.09,.15,.05),smoothstep(.56,.72,mid)*.5);

float wGr=sa.r, wSo=sa.g, wGs=sa.b, wFo=sa.a, wFa=sb.r;
float sum=wGr+wSo+wGs+wFo+wFa;
float wRo=clamp(1.-sum,0.,1.);
if(sum>1.){ wGr/=sum;wSo/=sum;wGs/=sum;wFo/=sum;wFa/=sum; }
vec3 fC; float fR; fieldColor(vWP.xz,sb.a,mid,fC,fR);
fC*=.86+.28*tiny; fC*=mix(vec3(1.),texture2D(tGrass,vWP.xz/34.).rgb*2.6,.3);
fC*=mix(vec3(1.),texture2D(tGrass,vWP.xz/4.3).rgb*2.6,.55);
vec3 base=rockC*wRo+gravelC*wGr+soilC*wSo+grassC*wGs+forestC*wFo+fC*wFa;
float terrainRough=.96*wRo+.93*wGr+.97*wSo+.92*wGs+.95*wFo+fR*wFa;

// 물길: 얕은 물은 바닥이 비치고 가운데로 갈수록 어둡다.
float wtr=smoothstep(.35,.8,sb.g);
vec3 wetBed=gravelC*.42;
vec3 waterC=mix(wetBed,vec3(.045,.085,.08),smoothstep(.55,.95,sb.g));
base=mix(base,waterC,wtr);
terrainRough=mix(terrainRough,.42,wtr);

if(uGrainView>.5){
  vec3 g1=vec3(.93,.84,.72),g2=vec3(.85,.42,.14),g3=vec3(.35,.09,.05);
  float g=sb.b; vec3 gc=g<.5?mix(g1,g2,g*2.):mix(g2,g3,g*2.-1.);
  base=mix(base,gc,smoothstep(.02,.1,g)*.92);
}
diffuseColor.rgb=base;
`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor=terrainRough;')
      .replace('#include <normal_fragment_maps>', /* glsl */`
#include <normal_fragment_maps>
{
  vec3 nR=texture2D(tRockN,vWP.xz/41.).xyz*2.-1.;
  vec3 nG=texture2D(tGravelN,vWP.xz/7.+gj*3.).xyz*2.-1.;
  vec3 nS=texture2D(tSoilN,vWP.xz/55.).xyz*2.-1.;
  float e=3.;
  float n0=texture2D(tNoise,vWP.xz/17.).a;
  vec2 nC=vec2(texture2D(tNoise,(vWP.xz+vec2(e,0.))/17.).a-n0,texture2D(tNoise,(vWP.xz+vec2(0.,e))/17.).a-n0);
  vec2 d=nR.xy*(wRo*1.1)+nG.xy*(wGr*.4)+nS.xy*(wSo*.35)-nC*(wFo*9.)-nC*(wGs*2.);
  vec2 nF=vec2(texture2D(tNoise,(vWP.xz+vec2(8.,0.))/70.).b-fin,texture2D(tNoise,(vWP.xz+vec2(0.,8.))/70.).b-fin);
  d-=nF*2.4;
  d*=1.-wtr;
  normal=normalize(normal+(viewMatrix*vec4(d.x,0.,-d.y,0.)).xyz);
}
`);
    mat.userData.shader = sh;
  };
}

// 렌더링은 화면이 바뀔 때만 한다.
let dirty = true;
function invalidate() { dirty = true; }
controls.addEventListener('change', invalidate);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); invalidate();
});

const worldPos = (x, z, h) => {
  const px = (x / SIZE + 0.5) * (N - 1), py = (z / SIZE + 0.5) * (N - 1);
  return new THREE.Vector3(x, ex(sampleH(h, px, py)), z);
};

function roundTreeGeometry() {
  const g = new THREE.IcosahedronGeometry(0.5, 2);
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const u = v.clone().normalize();
    const lump = 1 + 0.16 * Math.sin(u.x * 7 + 1) * Math.sin(u.y * 6 + 2) + 0.12 * Math.sin(u.z * 9 + u.x * 5) + 0.05 * Math.sin(u.y * 19 + u.z * 17);
    n.setXYZ(i, u.x, u.y, u.z);
    p.setXYZ(i, u.x * 0.5 * lump * 2, u.y * 0.5 * lump + 0.45, u.z * 0.5 * lump * 2);
  }
  return g;
}

function buildNearTrees(stage, mountainMask) {
  const rand = rng32(555), MAX = 3200;
  const mesh = new THREE.InstancedMesh(roundTreeGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.95 }), MAX);
  mesh.castShadow = true;
  const m = new THREE.Matrix4(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; tries < MAX * 40 && n < MAX; tries++) {
    const i = 2 + Math.floor(rand() * (N - 4)), j = 2 + Math.floor(rand() * (N - 4));
    const k = j * N + i;
    if (mountainMask[k] > 0.3) continue;
    const f = stage.forest[k];
    if (rand() > f * f) continue;
    if (stage.h[k] <= WATER_LEVEL + 1) continue;
    const px = i + rand() - 0.5, py = j + rand() - 0.5;
    const hgt = 11 + rand() * 9, rad = 5 + rand() * 4;
    m.makeRotationY(rand() * 6.28);
    m.scale(new THREE.Vector3(rad, hgt, rad));
    m.setPosition((px / (N - 1) - 0.5) * SIZE, ex(sampleH(stage.h, px, py)) - 1, (py / (N - 1) - 0.5) * SIZE);
    mesh.setMatrixAt(n, m);
    const t = rand();
    c.setRGB(0.04 + t * 0.05, 0.08 + t * 0.06, 0.035 + t * 0.02);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  return mesh;
}

function buildTrees(stage, mountainMask) {
  const rand = rng32(777);
  const MAX = Math.round((GURYE ? 90000 : 56000) * (PHONE ? 0.35 : 1));
  const geo = new THREE.IcosahedronGeometry(0.5, 0).scale(2, 1, 2).translate(0, 0.45, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.castShadow = true;
  const m = new THREE.Matrix4(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; tries < MAX * 7 && n < MAX; tries++) {
    const i = 2 + Math.floor(rand() * (N - 4)), j = 2 + Math.floor(rand() * (N - 4));
    if (mountainMask[j * N + i] <= 0.3) continue;
    const f = stage.forest[j * N + i];
    if (rand() > f * f) continue;
    const y = stage.h[j * N + i];
    if (y <= WATER_LEVEL + 1) continue;
    const px = i + rand() - 0.5, py = j + rand() - 0.5;
    const x = (px / (N - 1) - 0.5) * SIZE, z = (py / (N - 1) - 0.5) * SIZE;
    const hgt = 13 + rand() * 11, rad = (6 + rand() * 5) * (GURYE ? 1.3 : 1);
    m.makeScale(rad, hgt, rad);
    m.setPosition(x, ex(sampleH(stage.h, px, py)) - 2, z);
    mesh.setMatrixAt(n, m);
    const t = rand();
    c.setRGB(0.035 + t * 0.05, 0.075 + t * 0.06, 0.032 + t * 0.018);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  return mesh;
}

function buildTown(stage, places) {
  // 선정과 선단에 마을이 들어선다.
  const rand = rng32(31);
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
  const MAX = 640;
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.castShadow = true;
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), c = new THREE.Color();
  const centers = [
    { ...places.apex, r: 130, w: 0.18, dz: 70 },
    ...places.streamToe.filter((_, i) => i % 18 === 0).map(p => ({ ...p, r: 120, w: 0.5, dz: 0 })),
    { x: places.toe.x + 620, z: places.toe.z + 60, r: 150, w: 0.3, dz: 0 },
    { x: places.toe.x - 700, z: places.toe.z + 90, r: 170, w: 0.3, dz: 0 },
  ];
  const roofs = [[.17,.17,.17],[.13,.15,.18],[.25,.24,.22],[.17,.11,.09],[.3,.29,.27]];
  let n = 0, tries = 0;
  while (n < MAX && tries++ < MAX * 6) {
    const k = centers[Math.floor(rand() * centers.length)];
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * k.r;
    const x = k.x + Math.cos(a) * d, z = k.z + k.dz + Math.sin(a) * d;
    const i = Math.round((x / SIZE + 0.5) * (N - 1)), j = Math.round((z / SIZE + 0.5) * (N - 1));
    if (i < 3 || j < 3 || i > N - 4 || j > N - 4) continue;
    const y = stage.h[j * N + i];
    if (stage.water[j * N + i] > 0.05 || y <= WATER_LEVEL + 1) continue;
    const slope = Math.hypot(stage.h[j * N + i + 1] - stage.h[j * N + i - 1], stage.h[(j + 1) * N + i] - stage.h[(j - 1) * N + i]) / (2 * CELL);
    if (slope > 0.14) continue;
    q.setFromAxisAngle(up, 0.32 + (rand() < 0.2 ? Math.PI / 2 : 0) + (rand() - 0.5) * 0.15);
    const big = rand() < 0.1;
    m.compose(new THREE.Vector3(x, ex(y) - 0.5, z), q, new THREE.Vector3(big ? 24 : 8 + rand() * 8, big ? 7 : 4 + rand() * 4, big ? 12 : 7 + rand() * 6));
    mesh.setMatrixAt(n, m);
    const r = roofs[Math.floor(rand() * roofs.length)]; c.setRGB(r[0], r[1], r[2]);
    mesh.setColorAt(n, c);
    n++;
  }
  // 평지의 비닐하우스: 밝고 길쭉한 건물
  const hr = rng32(53);
  for (let tries = 0; tries < 9000 && n < MAX; tries++) {
    const i = 3 + Math.floor(hr() * (N - 6)), j = 3 + Math.floor(hr() * (N - 6)), k = j * N + i;
    if (stage.splatB[k * 4] < 190 || stage.water[k] > 0.05 || hr() > 0.05) continue;
    q.setFromAxisAngle(up, 0.32 + (hr() < 0.3 ? Math.PI / 2 : 0));
    const x = (i / (N - 1) - 0.5) * SIZE, z = (j / (N - 1) - 0.5) * SIZE;
    m.compose(new THREE.Vector3(x, ex(stage.h[k]) - 0.3, z), q, new THREE.Vector3(55 + hr() * 45, 4, 12 + hr() * 8));
    mesh.setMatrixAt(n, m);
    c.setRGB(0.62, 0.65, 0.66);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  return mesh;
}

async function start() {
  say('재질 불러오는 중');
  await nextFrame();
  const [tRock, tRockN, tGravel, tGravelN, tGrass, tMixed, tSoil, tSoilN] = await Promise.all([
    loadTex('Rock030_color'), loadTex('Rock030_normal', false), loadTex('Gravel022_color'), loadTex('Gravel022_normal', false),
    loadTex('Grass004_color'), loadTex('Ground037_color'), loadTex('Ground054_color'), loadTex('Ground054_normal', false),
  ]);
  say('지형 계산 중');
  await nextFrame();
  const t0 = performance.now();
  const sim = GURYE
    ? simulateGurye(new Uint16Array(await (await fetch('./data/gurye-dem.bin')).arrayBuffer()), say)
    : simulate(say);
  const simMs = Math.round(performance.now() - t0);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 3;
    pos[k] = (i / (N - 1) - 0.5) * SIZE; pos[k + 2] = (j / (N - 1) - 0.5) * SIZE;
  }
  const indices = new Uint32Array((N - 1) * (N - 1) * 6);
  let ip = 0;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
    indices[ip++] = a; indices[ip++] = c; indices[ip++] = b;
    indices[ip++] = b; indices[ip++] = c; indices[ip++] = d;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));

  const uniforms = {
    tA: { value: null }, tB: { value: null }, tNoise: { value: noiseTexture() },
    tRock: { value: tRock }, tRockN: { value: tRockN }, tGravel: { value: tGravel }, tGravelN: { value: tGravelN },
    tGrass: { value: tGrass }, tMixed: { value: tMixed }, tSoil: { value: tSoil }, tSoilN: { value: tSoilN },
    uSize: { value: SIZE }, uGrainView: { value: 0 },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);

  const river = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1a2f2e, roughness: 0.2, metalness: 0, envMapIntensity: 0.9 }));
  river.position.y = ex(WATER_LEVEL);
  river.receiveShadow = true;
  if (!GURYE) scene.add(river);

  const stageTex = sim.stages.map(s => ({ a: splatTex(s.splatA), b: splatTex(s.splatB) }));
  const schematic = createSchematic(document.getElementById('schem'), key => {
    labels.forEach(l => l.el.classList.toggle('hi', l.key === key));
  });
  const treeCache = {}, townCache = {};
  let treeMesh = null, nearMesh = null, townMesh = null, stageNow = -1;
  const nearCache = {};

  const setStage = n => {
    const s = sim.stages[n];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3 + 1] = ex(s.h[k]);
      const il = Math.max(i - 1, 0), ir = Math.min(i + 1, N - 1), jl = Math.max(j - 1, 0), jr = Math.min(j + 1, N - 1);
      const nx = (ex(s.h[j * N + il]) - ex(s.h[j * N + ir])) / ((ir - il) * CELL), nz = (ex(s.h[jl * N + i]) - ex(s.h[jr * N + i])) / ((jr - jl) * CELL);
      const l = Math.hypot(nx, 1, nz);
      nor[k * 3] = nx / l; nor[k * 3 + 1] = 1 / l; nor[k * 3 + 2] = nz / l;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    uniforms.tA.value = stageTex[n].a; uniforms.tB.value = stageTex[n].b;
    if (treeMesh) scene.remove(treeMesh);
    if (townMesh) { scene.remove(townMesh); townMesh = null; }
    const ck = `${n}:${vk}`;
    treeMesh = treeCache[ck] ??= buildTrees(s, sim.mountain);
    scene.add(treeMesh);
    if (nearMesh) scene.remove(nearMesh);
    nearMesh = nearCache[ck] ??= buildNearTrees(s, sim.mountain);
    scene.add(nearMesh);
    if (n === 2) { townMesh = townCache[ck] ??= buildTown(s, sim.places); scene.add(townMesh); }
    stageNow = n;
    document.querySelectorAll('[data-stage]').forEach(b => b.classList.toggle('on', +b.dataset.stage === n));
    document.getElementById('note').textContent = (GURYE ? NOTES_GURYE : NOTES)[n];
    schematic.setStage(n);
    renderer.shadowMap.needsUpdate = true;
    placeLabels();
    invalidate();
  };

  function setHeight(k) {
    vk = k;
    river.position.y = ex(WATER_LEVEL);
    setStage(stageNow);
    setView(currentView);
    document.querySelectorAll('[data-height]').forEach(b => b.classList.toggle('on', +b.dataset.height === k));
    document.getElementById('heightNote').textContent = k === 1
      ? '실제 높이 그대로입니다. 경사가 3~4%뿐이라 선상지가 거의 평평해 보입니다.'
      : `낮은 땅의 높이를 ${k}배로 과장했습니다. 산은 덜 과장했습니다. 끌어서 돌리고 휠로 확대합니다.`;
  }

  const labels = [
    { key: 'apex', el: mkLabel('선정', '곡구 바로 앞. 굵은 자갈이 많습니다.'), get: () => sim.places.apex, lift: 25 },
    { key: 'mid', el: mkLabel('선앙', '가운데 부분. 물이 땅속으로 스며듭니다.'), get: () => sim.places.mid, lift: 20 },
    { key: 'toe', el: mkLabel('선단', '끝부분. 스며든 물이 다시 솟아납니다.'), get: () => sim.places.toe, lift: 18 },
  ];
  function placeLabels() {
    const s = sim.stages[stageNow < 0 ? 2 : stageNow];
    for (const l of labels) {
      const p = l.get();
      const v = worldPos(p.x, p.z, s.h); v.y += l.lift;
      v.project(camera);
      const hide = v.z > 1 || !labelsOn;
      l.el.style.display = hide ? 'none' : 'block';
      l.el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
    }
  }

  let labelsOn = true;
  // 모식도가 열리면 3D 화면의 중심을 남은 공간 가운데로 옮긴다.
  const schemEl = document.getElementById('schem');
  const fitView = () => {
    const phone = isPhone();
    const dock = schemEl.hidden || phone ? 0 : schemEl.offsetWidth;
    const sheet = schemEl.hidden || !phone ? 0 : schemEl.offsetHeight;
    const side = document.getElementById('panel');
    const left = phone || document.body.classList.contains('panel-closed') ? 0 : side.offsetWidth + 20;
    camera.setViewOffset(innerWidth, innerHeight, (dock - left) / 2, sheet / 2, innerWidth, innerHeight);
    document.body.classList.toggle('noschem', schemEl.hidden);
    placeLabels();
    invalidate();
  };
  const setSchematic = on => { schemEl.hidden = !on; document.getElementById('schemBtn').classList.toggle('on', on); fitView(); };
  document.getElementById('schemBtn').onclick = () => setSchematic(schemEl.hidden);
  addEventListener('resize', fitView);
  document.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => setStage(+b.dataset.stage));
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { setView(b.dataset.view); document.querySelectorAll('[data-view]').forEach(o => o.classList.toggle('on', o === b)); });
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('grainBtn').onclick = e => { uniforms.uGrainView.value = uniforms.uGrainView.value ? 0 : 1; e.currentTarget.classList.toggle('on', !!uniforms.uGrainView.value); document.getElementById('legend').hidden = !uniforms.uGrainView.value; invalidate(); };

  const panelToggle = document.getElementById('panelToggle');
  const setPanelClosed = on => { document.body.classList.toggle('panel-closed', on); panelToggle.textContent = on ? '조작 열기' : '접기'; fitView(); };
  panelToggle.onclick = () => setPanelClosed(!document.body.classList.contains('panel-closed'));

  setView('oblique');
  stageNow = 2;
  setHeight(3);
  setPanelClosed(PHONE);
  document.getElementById('load').hidden = true;

  let frames = 0;
  (function loop() {
    requestAnimationFrame(loop);
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
    placeLabels();
    frames++;
  })();

  window.__LAB = { setSchematic, setHeight,  setZone(k) { document.querySelector(`#schem [data-zone="${k}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })); }, setStage, setView, sim: sim.stats, simMs, get frames() { return frames; }, setLabels(v) { labelsOn = v; placeLabels(); }, setGrain(v) { uniforms.uGrainView.value = v ? 1 : 0; document.getElementById('legend').hidden = !v; invalidate(); }, renderNow() { renderer.render(scene, camera); placeLabels(); }, info: () => renderer.info.render };
}

const NOTES_GURYE = [
  '초기(추정): 지리산 골짜기에서 나온 물이 곡구 앞에 자갈을 쌓기 시작합니다.',
  '성장(추정): 물길이 옮겨 다니며 부채꼴이 넓어집니다. 초기와 성장은 계산으로 복원한 모습입니다.',
  '오늘날: 실제 고도 자료로 그린 구례 화엄사 선상지입니다. 곡구에서 약 3km 내려가며 고도가 160m에서 40m로 낮아집니다.',
];
const NOTES = [
  '초기: 곡구에서 나온 물이 자갈을 쏟아 놓기 시작합니다.',
  '성장: 쌓인 곳이 높아지면 물길이 낮은 쪽으로 옮겨 가며 부채꼴이 넓어집니다.',
  '오늘날: 물길은 하나로 줄고, 선앙에서는 물이 땅속으로 스며들어 밭과 과수원이 많습니다.',
];

function mkLabel(name, tip) {
  const d = document.createElement('div');
  d.className = 'label';
  d.innerHTML = `<b>${name}</b><span>${tip}</span>`;
  document.getElementById('labels').appendChild(d);
  return d;
}

document.getElementById('title').textContent = GURYE ? '구례 화엄사 선상지' : '계산으로 만든 선상지';
document.querySelector(`[data-site="${SITE}"]`).classList.add('on');
document.getElementById('foot').textContent = GURYE
  ? '고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA. 논밭, 나무, 물길, 마을은 위치가 실제와 다른 예시입니다. 표면 재질: ambientCG (CC0)'
  : '표면 재질: ambientCG (CC0)';
document.querySelectorAll('[data-site]').forEach(b => b.onclick = () => { location.href = b.dataset.site === 'model' ? './model.html' : b.dataset.site === 'gurye' ? './?site=gurye' : './'; });

start().catch(e => { say('오류: ' + e.message); console.error(e); });
