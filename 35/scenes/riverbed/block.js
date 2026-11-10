// © 2026 김용현
// 여울, 소, 모래톱 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
// 높이는 VE배로 키워 그린다. 물 알갱이는 물길을 따라 흐르며 빠르기에 따라 색이 바뀐다.
import * as THREE from 'three';
import { N, NY, L, NR, T_START } from './model.js';
// 가로 N칸, 세로 NY칸 격자의 삼각형 목록
function rectIndex(nx, ny) {
  const index = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let n = 0;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    index[n++] = a; index[n++] = c; index[n++] = b; index[n++] = b; index[n++] = c; index[n++] = d;
  }
  return index;
}

const CENTER = N / 2, CY = NY / 2;
export const VE = 2; // 그림에서 높이를 키우는 배율. 계산 값은 그대로다.
export const BOTTOM_M = -10; // 블록 바닥 높이(m)
export const worldY = zm => zm * VE;
const DOTS = 260;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

// 물 알갱이 색: 느림(파랑)에서 중간(흰색)을 거쳐 빠름(빨강)으로
export const SPEED_COLORS = { slow: '#2f6bff', mid: '#f4e48a', fast: '#ff4a1c' };
const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const SLOW = lin(SPEED_COLORS.slow), MID = lin(SPEED_COLORS.mid), FAST = lin(SPEED_COLORS.fast);
export function speedColor(f, out) {
  const t = clamp(f);
  const a = t < 0.5 ? SLOW : MID, b = t < 0.5 ? MID : FAST, u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  out.setRGB(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
  return out;
}

export function createBlock(model) {
  const group = new THREE.Group();
  const P = {
    grass: lin('#7d9a55'), grass2: lin('#93a964'), shore: lin('#6f8a4c'), bank: lin('#7a5b3e'), silt: lin('#8a7c66'), sand: lin('#e3cb8c'), sand2: lin('#d8bb78'),
    gravel: lin('#a9a296'), gravel2: lin('#827a6e'), deep: lin('#5a5043'),
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const pos = new Float32Array(N * NY * 3), nor = new Float32Array(N * NY * 3), col = new Float32Array(N * NY * 3), speckle = new Float32Array(N * NY), patch = new Float32Array(N * NY), grain = new Float32Array(N * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CY;
    speckle[k] = 0.93 + hash(i, j) * 0.14;
    grain[k] = hash(i + 7, j + 3);
    patch[k] = Math.sin(i * 0.13 + 1) * Math.sin(j * 0.11) * 0.5 + 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(rectIndex(N, NY), 1));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }));
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  group.add(terrain);

  // 블록 옆면
  const skirtPts = [];
  for (let i = 0; i < N; i++) skirtPts.push([i, 0]);
  for (let j = 1; j < NY; j++) skirtPts.push([N - 1, j]);
  for (let i = N - 2; i >= 0; i--) skirtPts.push([i, NY - 1]);
  for (let j = NY - 2; j >= 1; j--) skirtPts.push([0, j]);
  const skirtPos = new Float32Array(skirtPts.length * 6), skirtCol = new Float32Array(skirtPts.length * 6), skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPos, 3));
  skirtGeo.setAttribute('color', new THREE.BufferAttribute(skirtCol, 3));
  {
    const idx = [], n = skirtPts.length;
    for (let s = 0; s < n; s++) { const a = s * 2, b = a + 1, c = ((s + 1) % n) * 2, d = c + 1; idx.push(a, c, b, b, c, d); }
    skirtGeo.setIndex(idx);
  }
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  skirt.frustumCulled = false;
  group.add(skirt);

  // 물: 블록과 같은 격자. 물길 밖 칸은 땅속으로 내려 감춘다. 물이 없는 모래톱 위 칸은 물 높이에 두어 땅에 가려진다.
  const wpos = new Float32Array(N * NY * 3), wcol = new Float32Array(N * NY * 3);
  for (let k = 0; k < N * NY; k++) { wpos[k * 3] = (k % N) - CENTER; wpos[k * 3 + 2] = ((k / N) | 0) - CY; }
  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3));
  wgeo.setAttribute('color', new THREE.BufferAttribute(wcol, 3));
  wgeo.setIndex(new THREE.BufferAttribute(rectIndex(N, NY), 1));
  wgeo.computeVertexNormals();
  const water = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.8, roughness: 0.25, metalness: 0.05 }));
  water.frustumCulled = false;
  group.add(water);
  // 블록 왼쪽(상류)과 오른쪽(하류) 끝의 물 단면
  const endPos = new Float32Array(2 * NY * 6), endGeo = new THREE.BufferGeometry();
  endGeo.setAttribute('position', new THREE.BufferAttribute(endPos, 3));
  {
    const idx = [];
    for (let e = 0; e < 2; e++) for (let j = 0; j < NY - 1; j++) { const a = (e * NY + j) * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    endGeo.setIndex(idx);
  }
  const ends = new THREE.Mesh(endGeo, new THREE.MeshBasicMaterial({ color: 0x3a6f8c, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  ends.frustumCulled = false;
  group.add(ends);

  // 물 알갱이
  const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), DOTS);
  dots.frustumCulled = false;
  dots.setColorAt(0, new THREE.Color(1, 1, 1));
  group.add(dots);
  const dotS = new Float32Array(DOTS), dotN = new Float32Array(DOTS);
  {
    let s = 11;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let d = 0; d < DOTS; d++) { dotS[d] = r(); dotN[d] = (r() * 2 - 1) * 0.92; }
  }
  let dotsPlaced = false;

  // 물길을 따라 자른 단면 자리(물길 가운데 줄)
  const SEC_MAX = 260;
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(SEC_MAX * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 2.4, gapSize: 1.8 }));
  sectionLine.frustumCulled = false;
  group.add(sectionLine);

  function paint(k, prog) {
    const { z, z0, nK, rifW, sideK } = model, i = k % N, j = (k / N) | 0, an = Math.abs(nK[k]);
    pos[k * 3 + 1] = worldY(z[k]);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < NY - 1 ? k + N : k;
    const dx = (worldY(z[ir]) - worldY(z[il])) * 0.5, dz = (worldY(z[jr]) - worldY(z[jl])) * 0.5, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const pt = patch[k];
    let c = mix(P.grass, P.grass2, pt);
    if (an < 1.35) c = mix(c, P.shore, 1 - smooth(1.05, 1.35, an));
    if (an <= 1.24) {
      let b = mix(P.silt, P.bank, smooth(0.72, 1.12, an));
      const dep = clamp((z[k] - z0[k]) / 0.35), sc = dep * (sideK[k] < 0 ? 1 : 0.7);
      b = mix(b, mix(P.sand, P.sand2, grain[k]), sc);
      const gw = rifW[k] * prog * (1 - sc);
      b = mix(b, grain[k] < 0.45 ? P.gravel2 : P.gravel, gw * 0.85);
      b = mix(b, P.deep, clamp((z0[k] - z[k]) / 1.6) * 0.8);
      c = an > 1.16 ? mix(b, c, (an - 1.16) / 0.08) : b;
    }
    const sp = speckle[k];
    for (let q = 0; q < 3; q++) col[k * 3 + q] = c[q] * sp;
  }

  // 물 높이와 색. time은 물결 무늬를 움직이는 데 쓴다.
  function syncWater(time) {
    const { z, nK, qK, rifW } = model, st = model.current(), sec = model.sec, prog = model.progressFrac();
    const muddy = model.options.flow === 'flood' ? 0.4 : model.options.flow === 'high' ? 0.2 : 0;
    const shallow = lin('#8fc1c6'), deepC = lin('#2b5b77'), mud = lin('#b39a6a');
    for (let k = 0; k < N * NY; k++) {
      const an = Math.abs(nK[k]), i = k % N, j = (k / N) | 0;
      if (an > 1.3) { wpos[k * 3 + 1] = worldY(z[k] - 1.5); continue; }
      const q = qK[k], ws = st.ws[q], d = ws - z[k];
      let c = mix(shallow, deepC, smooth(0, 2.2, d));
      c = mix(c, mud, muddy);
      let y = worldY(ws) + 0.02;
      // 얕고 빠른 여울에는 물결이 인다.
      const rip = rifW[k] * prog * smooth(0.25, 0.7, st.U[q]) * (1 - smooth(0.6, 1.3, d));
      if (rip > 0.02 && d > 0) {
        const ph = (i * 0.45 + j * 0.13 + hash(i, j) * 0.5 - time * 1.6) % 1, w = (ph < 0 ? ph + 1 : ph) < 0.22 ? 1 : 0;
        c = mix(c, [1, 1, 1], rip * w * 0.5);
        y += rip * w * 0.12;
      }
      wpos[k * 3 + 1] = y;
      wcol[k * 3] = c[0]; wcol[k * 3 + 1] = c[1]; wcol[k * 3 + 2] = c[2];
    }
    wgeo.attributes.position.needsUpdate = true;
    wgeo.attributes.color.needsUpdate = true;
    // 끝면의 물 단면
    for (let e = 0; e < 2; e++) {
      const i = e ? N - 1 : 0;
      for (let j = 0; j < NY; j++) {
        const k = j * N + i, o = (e * NY + j) * 6, an = Math.abs(nK[k]), ws = st.ws[qK[k]], top = an <= 1.3 && ws > z[k] ? ws : z[k];
        endPos.set([i - CENTER, worldY(top), j - CY, i - CENTER, worldY(z[k]), j - CY], o);
      }
    }
    endGeo.attributes.position.needsUpdate = true;
    // 물길 가운데 줄
    const lp = lineGeo.attributes.position;
    let n = 0;
    for (let q = sec.qa; q <= sec.qb && n < SEC_MAX; q++, n++) lp.setXYZ(n, sec.cx[q] - CENTER, worldY(st.ws[q]) + 0.35, sec.cy[q] - CY);
    lineGeo.setDrawRange(0, n);
    lp.needsUpdate = true;
    sectionLine.computeLineDistances();
  }

  const m4 = new THREE.Matrix4(), scl = new THREE.Matrix4(), c3 = new THREE.Color();
  // dt: 지난 화면 이후의 시간(초). 멈춰 있으면 0이다. 알갱이는 그 자리의 물 빠르기만큼 흐른다.
  function syncFlow(dt) {
    const sec = model.sec, st = model.current(), { qa, qb } = sec, span = qb - qa;
    // 색의 기준: 이 유량에서 단면 평균 빠르기가 가장 느린 곳(파랑)과 가장 빠른 곳(빨강). 그 유량 안에서 빠르고 느린 곳을 견준다.
    let uHi = 0.05, uLo = 1e9;
    for (let q = qa; q <= qb; q++) { uHi = Math.max(uHi, st.U[q] * 1.05); uLo = Math.min(uLo, st.U[q] * 0.9); }
    const uRef = Math.max(0.05, uHi - uLo);
    if (!dotsPlaced) { for (let d = 0; d < DOTS; d++) dotS[d] = qa + dotS[d] * span; dotsPlaced = true; }
    for (let d = 0; d < DOTS; d++) {
      let s = dotS[d];
      if (s < qa || s >= qb - 0.01) s = qa + ((s - qa) % span + span) % span;
      const q = Math.min(qb - 1, Math.floor(s)), t = s - q;
      const l = Math.round(((dotN[d] + NR) / (2 * NR)) * (L - 1)), u = st.uL[q * L + l], depth = st.ws[q] - sec.bed[q * L + l];
      const f = clamp((u - uLo) / uRef);
      s += dt * (2 + 14 * u / uHi);
      dotS[d] = s;
      const cx = sec.cx[q] + (sec.cx[q + 1] - sec.cx[q]) * t, cy = sec.cy[q] + (sec.cy[q + 1] - sec.cy[q]) * t, tx = sec.tx[q], ty = sec.ty[q];
      const hw = sec.hw[q] + (sec.hw[q + 1] - sec.hw[q]) * t, ws = st.ws[q] + (st.ws[q + 1] - st.ws[q]) * t;
      const gx = cx - ty * dotN[d] * hw, gy = cy + tx * dotN[d] * hw, wet = depth > 0.08 && gx > 0.5 && gx < N - 1.5;
      const len = wet ? 0.9 + 1.6 * clamp(f) : 0;
      scl.makeScale(len, wet ? 0.25 : 0, wet ? 0.55 : 0);
      m4.makeRotationY(-Math.atan2(ty, tx)).multiply(scl);
      m4.setPosition(gx - CENTER, worldY(ws) + 0.2, gy - CY);
      dots.setMatrixAt(d, m4);
      dots.setColorAt(d, speedColor(f, c3));
    }
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    return uRef;
  }

  let lastVersion = -1;
  function syncTerrain(force) {
    if (!force && model.version === lastVersion) return false;
    lastVersion = model.version;
    const prog = smooth(T_START, 30, model.clock);
    for (let k = 0; k < N * NY; k++) paint(k, prog);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    const bot = worldY(BOTTOM_M), sc = lin('#5b4a39'), sc2 = lin('#7a6650');
    skirtPts.forEach(([i, j], s) => {
      const k = j * N + i, x = i - CENTER, zz = j - CY;
      skirtPos.set([x, worldY(model.z[k]), zz, x, bot, zz], s * 6);
      skirtCol.set([...sc2, ...sc], s * 6);
    });
    skirtGeo.attributes.position.needsUpdate = true;
    skirtGeo.attributes.color.needsUpdate = true;
    syncWater(0);
    return true;
  }

  return { group, terrain, syncTerrain, syncWater, syncFlow, worldOf: (x, y, z) => worldY(z) };
}
