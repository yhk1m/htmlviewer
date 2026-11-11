// © 2026 김용현
// 화산섬 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
// 높이는 VE배로 키워 그린다(가로 1칸 = 150m를 1로 그린다).
// 옆면 넷에는 땅속 단면을 그림으로 붙인다. 앞면은 분화구 한가운데를 지나, 용암 층, 용암원정구, 화도와 마그마, 용암 동굴, 주상절리가 보인다.
import * as THREE from 'three';
import { N, NY, CX, CY, CELL_M, BOTTOM_M, NF, TUBE_FLOW, COLUMN_FLOW, MAT, T_START, FLOW_GAP, FLOW_DUR, T_DOME, DOME_DUR } from './model.js';

const CX0 = (N - 1) / 2, CY0 = (NY - 1) / 2;
export const VE = 3; // 그림에서 높이를 키우는 배율. 계산 값은 그대로다.
export const worldY = zm => (zm * VE) / CELL_M;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function rectIndex(nx, ny) {
  const index = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let n = 0;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    index[n++] = a; index[n++] = c; index[n++] = b; index[n++] = b; index[n++] = c; index[n++] = d;
  }
  return index;
}

// 단면 색
export const COL = {
  bed: '#6b6257', sed: '#b9a57d', basaltA: '#3d3a39', basaltB: '#4b4846', crust: '#8a4c36', trachyte: '#a99a8c', trachyteLine: '#857669',
  fill: '#b5a07a', scoria: '#8a3a24', tuff: '#c8a86c', tuffLine: '#9c8048', sea: 'rgba(70,150,205,0.55)', lake: 'rgba(60,140,200,0.85)',
  magma: '#e8642a', magmaHot: '#ffb347', dike: '#5b3a30', tubeAir: '#141010', tubeEdge: '#c9a27e', column: '#56524f', joint: 'rgba(15,12,12,0.85)',
};

// 그 칸의 물 높이(바다 0m, 분화구 안은 호수 수면)
function waterAt(model, i, j) {
  const L = model.lake;
  if (L && j === CY && i >= L.x0 && i <= L.x1) return Math.max(0, L.level);
  return 0;
}
export { waterAt };

// 단면 하나(블록 옆면이나 진행상황의 단면)를 그린다. 그림 좌표: 가로는 t(칸), 세로는 그림 높이(worldY).
// face: { n, at(t) => [i, j] 칸, front: 화도와 마그마, 용암 동굴, 주상절리를 그릴지 }
// opt: { yTop, yBot, bg }
export function drawCut(ctx, W, H, model, face, opt) {
  const { n } = face, sx = W / (n - 1), sy = H / (opt.yTop - opt.yBot);
  const X = t => t * sx, Y = wy => (opt.yTop - wy) * sy, YM = zm => Y(worldY(zm));
  const top = new Float32Array(n), zs = new Float32Array(n), zd = new Float32Array(n), zc = new Float32Array(n), zk = new Float32Array(n), mats = new Uint8Array(n), layers = [];
  const cald = model.options.top === 'caldera' && model.craterGrow > 0, CR = model.calderaR ? model.calderaR() : 0;
  for (let t = 0; t < n; t++) {
    const [i, j] = face.at(t), k = j * N + i;
    top[t] = model.z[k]; zs[t] = model.zs[k]; zd[t] = model.zd[k]; zc[t] = model.zc[k]; zk[t] = model.zk[k]; mats[t] = model.mat[k];
    let ly = model.layersAt(i, j);
    // 칼데라: 둥근 단층 안쪽은 덩어리째 내려앉으므로, 그 안의 용암 층과 용암원정구도 같은 만큼 아래로 옮겨 그린다.
    if (cald) {
      const dx = i - CX, dy = j - CY, u = Math.sqrt(dx * dx + dy * dy) / CR;
      const sh = u < 0.8 ? Math.max(0, zd[t] - zk[t]) : 0;
      if (sh > 0) { ly = ly.map(v => v - sh); zs[t] -= sh; zd[t] -= sh; }
    }
    layers.push(ly);
  }
  ctx.clearRect(0, 0, W, H);
  if (opt.bg) { ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, W, H); }
  // 바닷물: 해수면 아래 전부를 먼저 칠하고, 그 위에 땅을 덮는다.
  ctx.fillStyle = COL.sea; ctx.fillRect(0, YM(0), W, H);
  // 분화구 호수
  if (face.front && model.lake) {
    const L = model.lake;
    ctx.fillStyle = COL.lake; ctx.fillRect(X(L.x0 - 0.5), YM(L.level), X(L.x1 + 0.5) - X(L.x0 - 0.5), H);
  }
  const line = (arr, back) => { for (let t = 0; t < n; t++) ctx.lineTo(X(t), YM(arr(t))); if (back) for (let t = n - 1; t >= 0; t--) ctx.lineTo(X(t), YM(back(t))); };
  const band = (lo, hi, fill) => { ctx.beginPath(); ctx.moveTo(0, YM(lo(0))); line(hi, lo); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, H + 2);
  for (let t = 0; t < n; t++) ctx.lineTo(X(t), YM(top[t]));
  ctx.lineTo(W, H + 2); ctx.closePath(); ctx.clip();
  // 바다 밑 오래된 바위와 퇴적층(대륙붕)
  ctx.fillStyle = COL.bed; ctx.fillRect(0, 0, W, H);
  band(t => layers[t][0] - 70, t => layers[t][0], COL.sed);
  ctx.fillStyle = 'rgba(90,72,48,0.35)';
  for (let a = 0; a < 220; a++) { const t = hash(a, 5) * (n - 1), zz = layers[Math.round(t)][0] - hash(a, 6) * 66; ctx.fillRect(X(t), YM(zz), 2, 2); }
  // 현무암 용암 층: 흐른 차례대로 쌓인다. 층 사이의 붉은 줄은 용암 겉의 거친 조각(클링커)이다.
  const t0 = model.clock;
  for (let f = 0; f < NF; f++) {
    const ts = T_START + f * FLOW_GAP, hot = t0 > ts && t0 < ts + FLOW_DUR + 1.2;
    band(t => layers[t][f], t => layers[t][f + 1], hot ? (t0 < ts + FLOW_DUR ? COL.magma : '#a8452a') : f % 2 ? COL.basaltB : COL.basaltA);
    ctx.beginPath(); for (let t = 0; t < n; t++) { const d = layers[t][f + 1] - layers[t][f]; if (d > 3) ctx.lineTo(X(t), YM(layers[t][f + 1])); else ctx.moveTo(X(t), YM(layers[t][f + 1])); }
    ctx.strokeStyle = hot ? COL.magmaHot : COL.crust; ctx.lineWidth = 1.6; ctx.stroke();
  }
  // 주상절리: 두꺼운 용암 한 층이 식으며 줄어 생긴 기둥 틈
  if (face.front && model.column) {
    const c = model.column;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(X(c.x0), YM(layers[c.x0][COLUMN_FLOW]));
    for (let t = c.x0; t <= c.x1; t++) ctx.lineTo(X(t), YM(layers[t][COLUMN_FLOW + 1]));
    for (let t = c.x1; t >= c.x0; t--) ctx.lineTo(X(t), YM(layers[t][COLUMN_FLOW]));
    ctx.closePath(); ctx.fillStyle = COL.column; ctx.fill(); ctx.clip();
    ctx.strokeStyle = COL.joint; ctx.lineWidth = Math.max(1, sx * 0.12);
    const step = Math.max(3, sx * 0.55);
    for (let px = X(c.x0) + step / 2; px < X(c.x1); px += step) { ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px + (hash(px, 1) - 0.5) * 2, H); ctx.stroke(); }
    ctx.restore();
  }
  // 용암원정구(조면암): 끈끈한 용암이 솟아 굳은 덩어리. 휘어진 줄은 용암이 밀려 올라온 흐름 자국이다.
  const domeHot = t0 > T_DOME && t0 < T_DOME + DOME_DUR + 1;
  band(t => zs[t], t => Math.max(zs[t], zd[t]), domeHot ? '#d8693a' : COL.trachyte);
  if (face.front) {
    ctx.strokeStyle = domeHot ? COL.magmaHot : COL.trachyteLine; ctx.lineWidth = 1.2;
    for (let q = 1; q <= 4; q++) {
      ctx.beginPath();
      for (let t = 0; t < n; t++) { const h = zd[t] - zs[t]; if (h > 15) ctx.lineTo(X(t), YM(zs[t] + h * q / 5)); else ctx.moveTo(X(t), YM(zs[t])); }
      ctx.stroke();
    }
  }
  // 화구원: 칼데라 바닥을 메운 흙과 돌, 화산재
  if (cald) {
    band(t => zk[t], t => Math.max(zk[t], zc[t]), COL.fill);
    ctx.fillStyle = 'rgba(90,72,48,0.45)';
    for (let t = 0; t < n; t++) if (zc[t] > zk[t] + 8) for (let q = 0; q < 3; q++) ctx.fillRect(X(t + hash(t, q) - 0.5), YM(zk[t] + (zc[t] - zk[t]) * hash(q, t)), 2.5, 2.5);
  }
  // 작은 화산(분석구, 응회구, 응회환, 중앙화구구)
  ctx.beginPath(); ctx.moveTo(0, YM(zc[0]));
  line(t => zc[t], t => Math.max(zc[t], top[t]));
  ctx.closePath();
  ctx.save(); ctx.clip();
  for (let t = 0; t < n; t++) {
    if (top[t] <= zc[t] + 1) continue;
    ctx.fillStyle = mats[t] === MAT.TUFF ? COL.tuff : COL.scoria;
    ctx.fillRect(X(t - 0.5), YM(top[t]) - 1, sx + 1, YM(zc[t]) - YM(top[t]) + 2);
  }
  ctx.restore();
  // 화도와 마그마가 모인 곳(앞면)
  if (face.front) {
    const left = CX - CR;
    // 마그마가 모인 곳: 칼데라 쪽은 큰 분출로 마그마가 빠져 작아진다.
    const fillF = model.chamberFill ?? 1;
    const mx = X(CX), my = YM(-470), rx = sx * 15 * (0.55 + 0.45 * fillF), ry = Math.max(8, (YM(-470) - YM(-400)) * fillF);
    ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, 0, 0, 7); ctx.fillStyle = COL.magma; ctx.fill();
    ctx.beginPath(); ctx.ellipse(mx, my, rx * 0.6, ry * 0.5, 0, 0, 7); ctx.fillStyle = COL.magmaHot; ctx.fill();
    // 화도: 분출 중이면 뜨거운 마그마, 멈추면 굳은 암맥
    const hot = model.erupting && model.vents.some(v => Math.abs(v.x - CX) < 1);
    const vz = top[CX], hw = Math.max(3, sx * 0.7);
    ctx.beginPath(); ctx.moveTo(mx - hw, my - ry * 0.8); ctx.lineTo(mx - hw * 0.8, YM(vz)); ctx.lineTo(mx + hw * 0.8, YM(vz)); ctx.lineTo(mx + hw, my - ry * 0.8); ctx.closePath();
    ctx.fillStyle = hot ? COL.magma : COL.dike; ctx.fill();
    // 칼데라: 둘레의 둥근 단층을 따라 꼭대기가 내려앉는다.
    if (cald) {
      ctx.setLineDash([10, 6]); ctx.strokeStyle = 'rgba(30,20,15,0.85)'; ctx.lineWidth = 2.4;
      for (const xx of [left, 2 * CX - left]) { ctx.beginPath(); ctx.moveTo(X(xx), YM(top[Math.round(xx)] + 20)); ctx.lineTo(X(xx + (xx < CX ? 3 : -3)), my - ry); ctx.stroke(); }
      ctx.setLineDash([]);
    }
  }
  // 용암 동굴(앞면): 굳은 겉 아래로 용암이 흐르다가 빠져나가면 빈 굴이 남는다. 잘 보이게 높이를 키워 그린다.
  if (face.front && model.tube) {
    const tb = model.tube, pts = [];
    for (let t = tb.x0; t <= tb.x1; t++) {
      const a = layers[t][TUBE_FLOW], b = layers[t][TUBE_FLOW + 1], e = (t - tb.x0) / Math.max(1, tb.x1 - tb.x0), taper = Math.sqrt(Math.max(0, 1 - Math.abs(2 * e - 1) ** 6));
      const mid = a + (b - a) * 0.45, h = Math.max(18, Math.min(34, (b - a) * 0.3)) * taper;
      pts.push([t, mid + h * 0.55, mid - h * 0.45]);
    }
    if (pts.length > 1) {
      ctx.beginPath();
      for (const [t, up] of pts) ctx.lineTo(X(t), YM(up));
      for (let q = pts.length - 1; q >= 0; q--) ctx.lineTo(X(pts[q][0]), YM(pts[q][2]));
      ctx.closePath();
      ctx.fillStyle = tb.molten ? COL.magma : COL.tubeAir; ctx.fill();
      ctx.strokeStyle = tb.molten ? COL.magmaHot : COL.tubeEdge; ctx.lineWidth = 1.6; ctx.stroke();
      // 물이 빠진 동굴 바닥에 남은 용암 자국(선반)
      if (!tb.molten) {
        ctx.beginPath(); for (const [t, , lo] of pts) ctx.lineTo(X(t), YM(lo) - 2);
        ctx.strokeStyle = 'rgba(200,120,80,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
  }
  ctx.restore();
  // 지표선
  ctx.beginPath(); for (let t = 0; t < n; t++) ctx.lineTo(X(t), YM(top[t]));
  ctx.strokeStyle = 'rgba(25,22,20,0.9)'; ctx.lineWidth = 2.2; ctx.stroke();
  // 해수면
  ctx.strokeStyle = 'rgba(40,110,170,0.9)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let t = 0; t < n; t++) { if (top[t] < 0) ctx.lineTo(X(t), YM(0)); else ctx.moveTo(X(t), YM(0)); }
  ctx.stroke();
  return { X, Y, YM, top, layers };
}

export function createBlock(model) {
  const group = new THREE.Group();
  const P = {
    fresh: lin('#2c2a29'), basaltOld: lin('#4a4743'), grass: lin('#8ba35c'), field: lin('#a3a565'), forest: lin('#4c7337'), forest2: lin('#3d6230'), alpine: lin('#8c9a6d'),
    trachyte: lin('#958b84'), scoria: lin('#7e2f1d'), scoriaOld: lin('#7f9248'), tuff: lin('#c9a96b'), tuffOld: lin('#a8a463'),
    fill: lin('#b39d74'), sand: lin('#cdb98f'), seabed: lin('#8f8a74'), seabedDeep: lin('#6e6c62'), shore: lin('#3b3735'),
  };
  const pos = new Float32Array(N * NY * 3), nor = new Float32Array(N * NY * 3), col = new Float32Array(N * NY * 3), glow = new Float32Array(N * NY * 3);
  const speckle = new Float32Array(N * NY), patch = new Float32Array(N * NY), grain = new Float32Array(N * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3] = i - CX0; pos[k * 3 + 2] = j - CY0;
    speckle[k] = 0.92 + hash(i, j) * 0.16;
    grain[k] = hash(i + 7, j + 3);
    patch[k] = Math.sin(i * 0.31 + 1) * Math.sin(j * 0.27) * 0.5 + 0.5;
  }
  const index = new THREE.BufferAttribute(rectIndex(N, NY), 1);
  const posAttr = new THREE.BufferAttribute(pos, 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(index);
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  group.add(terrain);
  // 뜨거운 용암의 불빛: 같은 땅 모양 위에 더해 칠한다.
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', posAttr);
  glowGeo.setAttribute('color', new THREE.BufferAttribute(glow, 3));
  glowGeo.setIndex(index);
  const glowMesh = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  glowMesh.frustumCulled = false; glowMesh.renderOrder = 2;
  group.add(glowMesh);

  // 바다: 해수면(0m)의 반투명한 판. 얕은 곳은 옥빛, 깊은 곳은 푸르다.
  const sPos = new Float32Array(N * NY * 3), sCol = new Float32Array(N * NY * 4), sNor = new Float32Array(N * NY * 3);
  for (let k = 0; k < N * NY; k++) { sPos[k * 3] = pos[k * 3]; sPos[k * 3 + 1] = 0.02; sPos[k * 3 + 2] = pos[k * 3 + 2]; sNor[k * 3 + 1] = 1; }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('normal', new THREE.BufferAttribute(sNor, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 4));
  sGeo.setIndex(index);
  const sea = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.25, metalness: 0.05, depthWrite: false }));
  sea.frustumCulled = false; sea.renderOrder = 1;
  group.add(sea);
  const SHALLOW = lin('#6fd0d6'), MID = lin('#2f8fc9'), DEEPW = lin('#1d5f9a');

  // 분화구나 칼데라의 호수: 앞면에서 잘린 반원
  const lakeGeo = new THREE.CircleGeometry(1, 48, 0, Math.PI);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, new THREE.MeshStandardMaterial({ color: 0x3f8fc4, roughness: 0.2, transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
  lake.visible = false;
  group.add(lake);

  // 옆면 넷. 앞면(y = NY - 1)이 분화구 한가운데를 지나는 면이다.
  const FY = NY - 1, FX = N - 1;
  const faces = [
    { name: 'front', n: N, at: t => [t, FY], front: true, w: 1024 },
    { name: 'right', n: NY, at: t => [FX, FY - t], w: 512 },
    { name: 'back', n: N, at: t => [FX - t, 0], w: 1024 },
    { name: 'left', n: NY, at: t => [0, t], w: 512 },
  ];
  const yTop = worldY(1600), yBot = worldY(BOTTOM_M);
  for (const f of faces) {
    f.canvas = document.createElement('canvas');
    f.canvas.width = f.w; f.canvas.height = 512;
    f.ctx = f.canvas.getContext('2d');
    f.tex = new THREE.CanvasTexture(f.canvas);
    f.tex.colorSpace = THREE.SRGBColorSpace;
    f.tex.anisotropy = 4;
    const g = new THREE.BufferGeometry(), p = new Float32Array(f.n * 2 * 3), uv = new Float32Array(f.n * 2 * 2), idx = [];
    for (let t = 0; t < f.n - 1; t++) { const a = t * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    f.geo = g;
    f.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: f.tex, side: THREE.DoubleSide, transparent: true }));
    f.mesh.frustumCulled = false;
    group.add(f.mesh);
  }
  function syncFaces() {
    for (const f of faces) {
      const p = f.geo.attributes.position, uv = f.geo.attributes.uv;
      for (let t = 0; t < f.n; t++) {
        const [x, y] = f.at(t), k = y * N + x, tp = worldY(Math.max(model.z[k], waterAt(model, x, y)));
        p.setXYZ(t * 2, x - CX0, tp, y - CY0); p.setXYZ(t * 2 + 1, x - CX0, yBot, y - CY0);
        const u = t / (f.n - 1);
        uv.setXY(t * 2, u, (tp - yBot) / (yTop - yBot)); uv.setXY(t * 2 + 1, u, 0);
      }
      p.needsUpdate = true; uv.needsUpdate = true;
      drawCut(f.ctx, f.canvas.width, f.canvas.height, model, { n: f.n, at: f.at, front: !!f.front }, { yTop, yBot });
      f.tex.needsUpdate = true;
    }
  }

  // 분출물: 용암 분수(주황 알갱이)와 수증기나 화산재 기둥(흰색, 회색 덩이)
  const LAVA_MAX = 70, PLUME_MAX = 46;
  const lavaBits = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.32, 0), new THREE.MeshBasicMaterial({ color: 0xff8a2a, toneMapped: false }), LAVA_MAX);
  lavaBits.frustumCulled = false; lavaBits.count = 0;
  group.add(lavaBits);
  const plume = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), PLUME_MAX);
  plume.frustumCulled = false; plume.count = 0; plume.renderOrder = 3;
  plume.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PLUME_MAX * 3), 3);
  group.add(plume);
  const light = new THREE.PointLight(0xff7a30, 0, 40, 1.8);
  group.add(light);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), cc = new THREE.Color();
  let anim = 0;
  function syncFx(dt) {
    anim += dt;
    const vents = model.finished ? [] : model.vents || [];
    let nl = 0, np = 0, lightOn = 0;
    vents.forEach((v, vi) => {
      const bx = v.x - CX0, bz = v.y - CY0, by = worldY(Math.max(v.z, v.kind === 'steam' ? 0 : v.z));
      if (v.kind === 'lava') {
        if (!lightOn) { light.position.set(bx, by + 3, bz - 1); light.intensity = 70 * v.s; lightOn = 1; }
        const cnt = Math.round(30 * v.s);
        for (let a = 0; a < cnt && nl < LAVA_MAX; a++) {
          const ph = (anim * 0.9 + hash(a, vi + 1)) % 1, ang = hash(a, 7) * 6.283, sp = 0.6 + hash(a, 9) * 1.6, up = 5 + hash(a, 11) * 6 * v.s;
          pv.set(bx + Math.cos(ang) * sp * ph * 2, by + up * 4 * ph * (1 - ph) + 0.3, bz - Math.abs(Math.sin(ang)) * sp * ph * 2);
          m4.compose(pv, q, sv.setScalar(0.6 + 0.6 * (1 - ph)));
          lavaBits.setMatrixAt(nl++, m4);
        }
      } else {
        const ash = v.kind === 'ash', cnt = Math.round((ash ? 40 : 18) * v.s);
        for (let a = 0; a < cnt && np < PLUME_MAX; a++) {
          const ph = (anim * (ash ? 0.35 : 0.45) + hash(a, vi + 3)) % 1, r = (ash ? 1.5 : 0.8) + ph * (ash ? 9 : 4);
          pv.set(bx + (hash(a, 4) - 0.5) * r * 1.6, by + 1 + ph * (ash ? 26 : 12), bz - Math.abs(hash(a, 5) - 0.5) * r * 1.6);
          m4.compose(pv, q, sv.setScalar(r * (ash ? 0.7 : 0.6)));
          plume.setMatrixAt(np, m4);
          cc.set(ash ? 0x6d6862 : 0xf4f6f8).multiplyScalar(ash ? 0.8 + 0.4 * ph : 1);
          plume.setColorAt(np++, cc);
        }
      }
    });
    if (!lightOn) light.intensity = 0;
    lavaBits.count = nl; plume.count = np;
    lavaBits.instanceMatrix.needsUpdate = true; plume.instanceMatrix.needsUpdate = true;
    if (plume.instanceColor) plume.instanceColor.needsUpdate = true;
  }

  function paint(k, t, todayF) {
    const { z, mat, age, heat } = model, i = k % N, j = (k / N) | 0, h = z[k];
    pos[k * 3 + 1] = worldY(h);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < NY - 1 ? k + N : k;
    const dx = (worldY(z[ir]) - worldY(z[il])) * 0.5, dz = (worldY(z[jr]) - worldY(z[jl])) * 0.5, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const steep = smooth(0.9, 2.2, Math.hypot(dx, dz));
    let c;
    if (h < 0) {
      c = mat[k] === MAT.SEAFLOOR ? mix(P.sand, P.seabedDeep, smooth(20, 110, -h)) : mix(P.shore, P.seabed, smooth(10, 120, -h) * 0.6);
    } else {
      const old = mat[k] === MAT.SEAFLOOR ? 1 : clamp((t - age[k]) / 12) * 0.85 + 0.15 * todayF;
      // 오래된 땅의 풀과 숲: 낮은 곳은 풀밭과 밭, 산허리는 숲, 높은 곳은 키 작은 풀과 나무
      let veg = mix(P.grass, P.field, patch[k] > 0.62 ? 0.7 : 0);
      veg = mix(veg, mix(P.forest, P.forest2, grain[k]), smooth(250, 500, h) * (1 - smooth(950, 1150, h)));
      veg = mix(veg, P.alpine, smooth(950, 1150, h));
      if (h < 12) veg = mix(veg, P.shore, 0.75);
      if (mat[k] === MAT.TRACHYTE) c = mix(P.trachyte, mix(veg, P.trachyte, 0.45), old);
      else if (mat[k] === MAT.SCORIA) c = mix(P.scoria, P.scoriaOld, old * 0.9);
      else if (mat[k] === MAT.TUFF) c = mix(P.tuff, P.tuffOld, old * 0.45);
      else if (mat[k] === MAT.FILL) c = mix(P.fill, mix(P.field, P.grass, patch[k]), old * 0.9);
      else c = mix(mix(P.fresh, P.basaltOld, old * 0.5), veg, old);
      c = mix(c, P.basaltOld, steep * 0.45);
    }
    const sp = speckle[k];
    for (let q2 = 0; q2 < 3; q2++) col[k * 3 + q2] = c[q2] * sp;
    // 낮은 값은 화면에서 실제보다 밝아 보이므로 제곱해 어두운 곳은 거의 빛나지 않게 한다.
    const g = heat[k] * heat[k];
    glow[k * 3] = 1.0 * g; glow[k * 3 + 1] = 0.36 * g; glow[k * 3 + 2] = 0.08 * g;
    // 바다 색
    const d = -h;
    if (d <= 0) { sCol[k * 4 + 3] = 0; return; }
    const a = smooth(0, 40, d), b = smooth(40, 140, d);
    for (let q2 = 0; q2 < 3; q2++) { let v = SHALLOW[q2] + (MID[q2] - SHALLOW[q2]) * a; v += (DEEPW[q2] - v) * b; sCol[k * 4 + q2] = v; }
    sCol[k * 4 + 3] = 0.3 + 0.25 * a + 0.2 * b;
  }

  let lastVersion = -1;
  function syncTerrain(force) {
    if (!force && model.version === lastVersion) return false;
    lastVersion = model.version;
    const t = model.clock, todayF = model.todayFrac();
    for (let k = 0; k < N * NY; k++) paint(k, t, todayF);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    glowGeo.attributes.color.needsUpdate = true;
    sGeo.attributes.color.needsUpdate = true;
    const L = model.lake;
    lake.visible = !!L;
    if (L) { lake.position.set(CX - CX0, worldY(L.level), CY - CY0 + 0.001); lake.scale.set(L.R, 1, L.R); }
    syncFaces();
    return true;
  }

  return { group, terrain, syncTerrain, syncFx, faces };
}
