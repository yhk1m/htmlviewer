import * as THREE from 'three';
import { rng32 } from './rng.js';

const TEXTURE_BASE = new URL('./textures/', import.meta.url);

export function splatTex(data, N) {
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

export async function loadTerrainUniforms(renderer, size) {
  const loader = new THREE.TextureLoader();
  const load = (name, srgb = true) => new Promise(res => loader.load(new URL(`${name}.jpg`, TEXTURE_BASE).href, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    res(t);
  }));
  const [tRock, tRockN, tGravel, tGravelN, tGrass, tMixed, tSoil, tSoilN] = await Promise.all([
    load('Rock030_color'), load('Rock030_normal', false), load('Gravel022_color'), load('Gravel022_normal', false),
    load('Grass004_color'), load('Ground037_color'), load('Ground054_color'), load('Ground054_normal', false),
  ]);
  return {
    tA: { value: null }, tB: { value: null }, tNoise: { value: noiseTexture() },
    tRock: { value: tRock }, tRockN: { value: tRockN }, tGravel: { value: tGravel }, tGravelN: { value: tGravelN },
    tGrass: { value: tGrass }, tMixed: { value: tMixed }, tSoil: { value: tSoil }, tSoilN: { value: tSoilN },
    uSize: { value: size }, uGrainView: { value: 0 }, uSand: { value: 0 },
  };
}

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

const TERRAIN_GLSL_HEAD = /* glsl */`
uniform sampler2D tA, tB, tNoise, tRock, tRockN, tGravel, tGravelN, tGrass, tMixed, tSoil, tSoilN;
uniform float uSize, uGrainView, uSand;
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
  c=mix(c,vec3(.5,.5,.5),clamp(road,0.,1.)*.62); // 논밭 사이 길도 도로처럼 연회색
  col=c; rough=(c==plastic)?.35:.92;
}
`;

export function patchTerrain(mat, uniforms) {
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
// 모래 해안: uSand를 켠 장면만 B 채널의 파랑(입자 보기와 같은 자리)을 모래 양으로 읽는다. 다른 장면은 꺼져 있어 그대로다.
if(uSand>.5){
  vec3 sandC=mix(vec3(.80,.72,.55),vec3(.88,.81,.64),fin)*(.86+.22*mid);
  sandC*=mix(vec3(1.),gravelC*2.2,.12);
  base=mix(base,sandC,smoothstep(.1,.6,sb.b));
  terrainRough=mix(terrainRough,.9,sb.b);
}

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
