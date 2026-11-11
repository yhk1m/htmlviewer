// © 2026 김용현
// 화산섬 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
// 높이는 VE배로 키워 그린다(가로 1칸 = 150m를 1로 그린다).
// 옆면 넷에는 땅속 단면을 그림으로 붙인다. 앞면은 분화구 한가운데를 지나, 용암 층, 용암원정구, 화도와 마그마, 용암 동굴, 주상절리가 보인다.
import * as THREE from 'three';
import { N, NY, CX, CY, CELL_M, BOTTOM_M, CHAMBER, NF, TUBE_FLOW, COLUMN_FLOW, MAT, T_START, FLOW_GAP, FLOW_DUR, T_DOME, DOME_DUR } from './model.js';

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
  // 용암원정구(조면암): 끈끈한 용암이 화구에서 솟아 굳은 덩어리. 화구 위에서 겹겹이 부풀어 오른 껍질 자국(안쪽일수록 나중에 밀려 올라온 용암)을 그린다.
  const domeHot = t0 > T_DOME && t0 < T_DOME + DOME_DUR + 1;
  band(t => zs[t], t => Math.max(zs[t], zd[t]), domeHot ? '#d8693a' : COL.trachyte);
  if (face.front) {
    const dh = t => (t < 0 || t > n - 1 ? 0 : zd[Math.round(t)] - zs[Math.round(t)]);
    ctx.strokeStyle = domeHot ? COL.magmaHot : COL.trachyteLine; ctx.lineWidth = 1.2;
    for (let q = 1; q <= 4; q++) {
      const f = q / 5;
      ctx.beginPath();
      let on = false;
      for (let t = 0; t < n; t++) {
        const h = f * dh(CX + (t - CX) / f);
        if (h > 12 && dh(t) > 15) { const y = YM(zs[t] + h); if (on) ctx.lineTo(X(t), y); else ctx.moveTo(X(t), y); on = true; } else on = false;
      }
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
    // 마그마 방(책 522쪽 그림처럼): 큰 분출로 마그마가 빠져나가면 방 위쪽이 빈 공간(공동)이 된다.
    // 꼭대기가 꺼지기 시작하면 둥근 단층 안쪽 덩어리가 그 빈 공간으로 내려앉아 공간이 메워진다.
    const fillF = model.chamberFill ?? 1, close = model.voidClose ?? 0;
    const mx = X(CX), my = YM(CHAMBER.z), rx = sx * CHAMBER.R, ry = YM(CHAMBER.z - CHAMBER.h) - my;
    const mTop = my + ry - 2 * ry * fillF; // 마그마 윗면(그림 y)
    const roofY = dx => { const e = 1 - (dx * dx) / (rx * rx); return my - ry * Math.sqrt(Math.max(0, e)); };
    const roofNow = dx => { const r0 = roofY(dx); return r0 + (Math.max(r0, mTop) - r0) * close; }; // 내려앉은 지붕
    ctx.save();
    ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, 0, 0, 7); ctx.clip();
    ctx.fillStyle = COL.magma; ctx.fillRect(mx - rx, mTop, 2 * rx, 2 * ry + 4);
    ctx.beginPath(); ctx.ellipse(mx, Math.max(my, mTop + ry * 0.5), rx * 0.6, ry * 0.35 * Math.max(0.4, fillF), 0, 0, 7); ctx.fillStyle = COL.magmaHot; ctx.fill();
    if (fillF < 0.999) {
      // 빈 공간: 지붕과 마그마 윗면 사이
      ctx.beginPath();
      for (let px = -rx; px <= rx; px += 2) ctx.lineTo(mx + px, roofNow(px));
      ctx.lineTo(mx + rx, mTop); ctx.lineTo(mx - rx, mTop); ctx.closePath();
      ctx.fillStyle = COL.tubeAir; ctx.fill();
      // 내려앉는 덩어리: 지붕 위 바위가 아래로 옮겨진다.
      if (close > 0) {
        ctx.beginPath();
        for (let px = -rx; px <= rx; px += 2) ctx.lineTo(mx + px, roofY(px));
        for (let px = rx; px >= -rx; px -= 2) ctx.lineTo(mx + px, roofNow(px));
        ctx.closePath(); ctx.fillStyle = COL.bed; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(mx - rx, mTop); ctx.lineTo(mx + rx, mTop); ctx.strokeStyle = COL.magmaHot; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, 0, 0, 7); ctx.strokeStyle = 'rgba(40,20,12,0.7)'; ctx.lineWidth = 1.4; ctx.stroke();
    // 화도: 분출 중이면 뜨거운 마그마, 멈추면 굳은 암맥
    const hot = model.erupting && model.vents.some(v => Math.abs(v.x - CX) < 1);
    const vz = top[CX], hw = Math.max(3, sx * 0.7), vb = roofNow(0) + 2;
    ctx.beginPath(); ctx.moveTo(mx - hw, vb); ctx.lineTo(mx - hw * 0.8, YM(vz)); ctx.lineTo(mx + hw * 0.8, YM(vz)); ctx.lineTo(mx + hw, vb); ctx.closePath();
    ctx.fillStyle = hot ? COL.magma : COL.dike; ctx.fill();
    // 칼데라: 둘레의 둥근 단층을 따라 꼭대기가 마그마 방 쪽으로 내려앉는다.
    if (cald) {
      ctx.setLineDash([10, 6]); ctx.strokeStyle = 'rgba(30,20,15,0.85)'; ctx.lineWidth = 2.4;
      for (const xx of [left, 2 * CX - left]) { const xb = xx + (xx < CX ? 2 : -2); ctx.beginPath(); ctx.moveTo(X(xx), YM(top[Math.round(xx)] + 20)); ctx.lineTo(X(xb), roofNow(X(xb) - mx)); ctx.stroke(); }
      ctx.setLineDash([]);
      // 꺼지는 동안: 아래로 향한 화살표
      if (close > 0 && close < 1) {
        ctx.strokeStyle = 'rgba(25,18,14,0.9)'; ctx.fillStyle = 'rgba(25,18,14,0.9)'; ctx.lineWidth = 2.6;
        for (const ox of [-0.5, 0, 0.5]) {
          const ax = X(CX + ox * CR), ay0 = YM(-80), ay1 = YM(-80) + 40;
          ctx.beginPath(); ctx.moveTo(ax, ay0); ctx.lineTo(ax, ay1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ax - 7, ay1 - 8); ctx.lineTo(ax, ay1 + 4); ctx.lineTo(ax + 7, ay1 - 8); ctx.closePath(); ctx.fill();
        }
      }
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

  // 분출물. 실제 모습에 가깝게 그린다.
  // 연기, 수증기, 화산재는 늘 카메라를 향하는 판(빌보드)에 뭉게뭉게한 무늬를 그려 겹쳐 쌓는다. 위에서 빛을 받아 윗면이 밝다.
  // 화산재 기둥은 위로 갈수록 느려지며 넓게 퍼져 우산 모양이 되고, 큰 분출 때는 화쇄류가 산허리를 따라 낮게 흘러내린다.
  // 용암 분수는 날아가는 방향으로 늘어난 불똥으로 그리고, 식으면서 노란색, 주황색, 검붉은색으로 바뀐다.
  const SMOKE_MAX = 400, LAVA_MAX = 120, GLOW_MAX = 6;
  const smokeTex = makeSmokeAtlas();
  const billboardMat = (glow) => new THREE.ShaderMaterial({
    uniforms: { map: { value: smokeTex } },
    vertexShader: `
      attribute vec3 iPos; attribute vec3 iColor; attribute vec4 iMisc;
      varying vec2 vUv; varying vec3 vC; varying float vA; varying float vY;
      void main() {
        vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
        float c = cos(iMisc.w), s = sin(iMisc.w);
        vec2 p = position.xy;
        mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y) * iMisc.x;
        gl_Position = projectionMatrix * mv;
        vec2 cell = vec2(mod(iMisc.z, 2.0), floor(iMisc.z / 2.0));
        vUv = (uv + cell) * 0.5; vC = iColor; vA = iMisc.y; vY = position.y + 0.5;
      }`,
    fragmentShader: glow ? `
      varying vec2 vUv; varying vec3 vC; varying float vA; varying float vY;
      void main() {
        vec2 d = fract(vUv * 2.0) - 0.5; float r = length(d) * 2.0;
        float a = vA * pow(max(0.0, 1.0 - r), 2.2);
        if (a < 0.003) discard;
        gl_FragColor = vec4(vC * a, a);
      }` : `
      uniform sampler2D map;
      varying vec2 vUv; varying vec3 vC; varying float vA; varying float vY;
      void main() {
        vec4 t = texture2D(map, vUv);
        float a = t.a * vA;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vC * t.r * mix(0.68, 1.12, vY), a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  function makeBillboards(max, glow) {
    const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iColor', new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iMisc', new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    const mesh = new THREE.Mesh(g, billboardMat(glow));
    mesh.frustumCulled = false; mesh.renderOrder = glow ? 4 : 3;
    // 판을 먼 것부터 그려야 겹친 모습이 자연스러우므로, 그리기 직전에 카메라에서 먼 차례로 늘어놓는다.
    const parts = [], mv = new THREE.Matrix4();
    mesh.onBeforeRender = (r, s, camera) => {
      const n = Math.min(parts.length, max);
      if (!glow && n > 1) {
        mv.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
        const e = mv.elements;
        for (const p of parts) p.d = e[2] * p.x + e[6] * p.y + e[10] * p.z;
        parts.sort((a, b) => a.d - b.d);
      }
      const P = g.attributes.iPos.array, C = g.attributes.iColor.array, M = g.attributes.iMisc.array;
      for (let i = 0; i < n; i++) {
        const p = parts[i];
        P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
        C[i * 3] = p.r; C[i * 3 + 1] = p.g; C[i * 3 + 2] = p.b;
        M[i * 4] = p.size; M[i * 4 + 1] = p.a; M[i * 4 + 2] = p.cell; M[i * 4 + 3] = p.rot;
      }
      g.instanceCount = n;
      g.attributes.iPos.needsUpdate = true; g.attributes.iColor.needsUpdate = true; g.attributes.iMisc.needsUpdate = true;
    };
    group.add(mesh);
    return { mesh, parts, push(x, y, z, size, a, color, cell, rot) { if (parts.length < max) parts.push({ x, y, z, size, a, r: color.r, g: color.g, b: color.b, cell, rot, d: 0 }); } };
  }
  const smoke = makeBillboards(SMOKE_MAX, false), glows = makeBillboards(GLOW_MAX, true);
  const lavaBits = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.12, 1, 7, 1).translate(0, -0.35, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), LAVA_MAX);
  lavaBits.frustumCulled = false; lavaBits.count = 0;
  lavaBits.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LAVA_MAX * 3), 3);
  group.add(lavaBits);
  const light = new THREE.PointLight(0xff7a30, 0, 40, 1.8);
  group.add(light);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), vv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), cc = new THREE.Color();
  const HOT = [new THREE.Color(0xfff4b0), new THREE.Color(0xffb030), new THREE.Color(0xf05a12), new THREE.Color(0x9a240a), new THREE.Color(0x2e1d16)];
  const heatColor = (u, out) => { const f = Math.min(0.999, Math.max(0, u)) * (HOT.length - 1), i = Math.floor(f); return out.copy(HOT[i]).lerp(HOT[i + 1], f - i); };
  const ASH_LOW = new THREE.Color(0x3f3934), ASH_HIGH = new THREE.Color(0x9b958d), FLOW_C = new THREE.Color(0xa69a8c), STEAM = new THREE.Color(0xf4f4f1), STEAM_LOW = new THREE.Color(0xc9c6c0), GAS = new THREE.Color(0xd8d5cf);
  const groundAt = (x, y) => { const i = Math.max(0, Math.min(N - 1, Math.round(x))), j = Math.max(0, Math.min(NY - 1, Math.round(y))); return worldY(Math.max(0, model.z[j * N + i])); };
  let anim = 0;
  function syncFx(dt) {
    anim += dt;
    const vents = model.finished ? [] : model.vents || [];
    let nl = 0, lightOn = 0;
    smoke.parts.length = 0; glows.parts.length = 0;
    vents.forEach((v, vi) => {
      const bx = v.x - CX0, bz = v.y - CY0, by = worldY(Math.max(v.z, v.kind === 'steam' ? 0 : v.z));
      if (v.kind === 'lava') {
        if (!lightOn) { light.position.set(bx, by + 3, bz - 1); light.intensity = (60 + 25 * Math.sin(anim * 13)) * v.s; lightOn = 1; }
        // 화구의 빛
        glows.push(bx, by + 0.8, bz - 0.3, 10 * v.s, 0.55 + 0.15 * Math.sin(anim * 9 + vi), cc.set(0xff7a2a), 0, 0);
        // 용암 분수: 불똥이 포물선을 그리며 날아가 식는다.
        const cnt = Math.round(85 * v.s);
        for (let a = 0; a < cnt && nl < LAVA_MAX; a++) {
          const ph = (anim * (0.7 + 0.5 * hash(a, 13)) + hash(a, vi + 1)) % 1, ang = hash(a, 7) * 6.283;
          const sp = 0.4 + hash(a, 9) * 1.8, up = (3 + hash(a, 11) * 7) * v.s * 1.4;
          const hx = Math.cos(ang) * sp * 2, hz = -Math.abs(Math.sin(ang)) * sp * 2;
          pv.set(bx + hx * ph, by + up * 4 * ph * (1 - ph) + 0.2, bz + hz * ph);
          vv.set(hx, up * 4 * (1 - 2 * ph), hz);
          const speed = vv.length();
          q.setFromUnitVectors(UP, vv.multiplyScalar(1 / Math.max(1e-4, speed)));
          // 뜨거울 때는 빠르게 날며 꼬리를 끌고(앞이 굵고 뒤가 가늘다), 식은 덩이(화산탄)는 짧고 뭉툭하다.
          const cool = Math.min(1, Math.max(0, (ph - 0.45) / 0.5)), w = (0.16 + 0.16 * hash(a, 15)) * (1 - 0.6 * cool);
          m4.compose(pv, q, sv.set(w, (0.2 + speed * 0.09) * (1 - 0.8 * cool) + w, w));
          lavaBits.setMatrixAt(nl, m4);
          lavaBits.setColorAt(nl++, heatColor(ph * 0.75 + 0.1 * hash(a, 17), cc));
        }
        // 용암에서 나오는 화산 가스: 옅은 흰 연기
        const gas = Math.round(14 * v.s);
        for (let a = 0; a < gas; a++) {
          const ph = (anim * 0.22 + hash(a, vi + 21)) % 1;
          smoke.push(bx + (hash(a, 22) - 0.5) * 2 + ph * 2.5, by + 1.5 + ph * 11, bz - 0.5 - hash(a, 23) * 2,
            2.5 + ph * 6, 0.22 * fadeInOut(ph), cc.copy(GAS), a & 3, hash(a, 24) * 6.28 + anim * 0.05);
        }
      } else if (v.kind === 'ash') {
        const big = v.s >= 0.9, H = (big ? 34 : 20) * Math.max(0.6, v.s), cnt = Math.round((big ? 200 : 110) * v.s);
        glows.push(bx, by + 0.6, bz - 0.3, 5 * v.s, 0.4, cc.set(0xff6a20), 0, 0);
        for (let a = 0; a < cnt; a++) {
          const ph = (anim * (0.16 + 0.08 * hash(a, 31)) + hash(a, vi + 3)) % 1;
          // 오르는 속도는 위로 갈수록 느려진다.
          const rise = 1 - Math.pow(1 - ph, 1.8), y = by + 0.8 + rise * H;
          const ang = hash(a, 32) * 6.283, ca = Math.cos(ang), sa = -Math.abs(Math.sin(ang));
          // 기둥은 위로 갈수록 굵어지고, 꼭대기에서는 옆으로 크게 퍼져 우산 모양이 된다.
          const umb = Math.max(0, (rise - 0.72) / 0.28), rad = (0.6 + rise * 3.2) * hash(a, 33) + umb * umb * (big ? 16 : 9) * (0.5 + 0.5 * hash(a, 34));
          const size = (3 + rise * 7 + umb * 5) * (0.75 + 0.5 * hash(a, 35));
          cc.copy(ASH_LOW).lerp(ASH_HIGH, Math.min(1, rise * 1.1) * (0.7 + 0.3 * hash(a, 36)));
          smoke.push(bx + ca * rad + Math.sin(anim * 0.7 + a) * 0.3, y - umb * 2.5, bz + sa * rad, size, 0.6 * fadeInOut(ph), cc, a & 3, hash(a, 37) * 6.28 + anim * (hash(a, 38) - 0.5) * 0.4);
        }
        // 큰 분출: 화쇄류가 산허리를 따라 낮게 흘러내린다.
        if (big) {
          // 흐름은 몇 갈래로 나뉘어 골짜기를 따라 내려가므로, 갈래마다 덩이를 촘촘히 이어 놓는다.
          const LOBES = [1.08, 1.3, 1.5, 1.7, 1.92];
          for (let a = 0; a < 120; a++) {
            const ph = (anim * (0.18 + 0.06 * hash(a, 41)) + hash(a, 42)) % 1, lobe = LOBES[a % LOBES.length];
            const ang = Math.PI * lobe + (hash(a, 43) - 0.5) * 0.3 * (0.4 + ph), d = 2 + ph * (18 + 6 * hash(a, 44));
            const x = v.x + Math.cos(ang) * d, y = v.y + Math.sin(ang) * d;
            const size = (3 + ph * 6) * (0.8 + 0.4 * hash(a, 45));
            smoke.push(x - CX0, groundAt(x, y) + size * 0.3, y - CY0, size, 0.6 * fadeInOut(ph), cc.copy(FLOW_C).multiplyScalar(0.85 + 0.25 * hash(a, 46)), a & 3, hash(a, 47) * 6.28);
          }
        }
      } else {
        // 얕은 물에서 터질 때: 젖은 화산재가 검은 깃털처럼 비스듬히 뿜어져 나온다(수증기 폭발).
        const JET = new THREE.Color(0x2f2b28);
        for (let a = 0; a < Math.round(60 * v.s); a++) {
          // 뿜어 나가는 줄기 몇 개를 따라 덩이를 촘촘히 잇는다.
          const jet = a % 5, ph = (anim * (0.6 + 0.2 * hash(a, 61)) + hash(a, vi + 62)) % 1, tilt = (hash(jet, vi + 63) - 0.5) * 1.4, ang = hash(jet, vi + 64) * 6.283;
          const hgt = (3 + 3 * hash(jet, 65)) * Math.sqrt(ph) * (1.2 - 0.5 * ph), out = ph * (1 + 4 * Math.abs(tilt));
          smoke.push(bx + Math.cos(ang) * out, by + 0.4 + hgt, bz - Math.abs(Math.sin(ang)) * out, (0.9 + ph * 2.2) * (0.8 + 0.4 * hash(a, 66)), 0.7 * fadeInOut(ph), cc.copy(JET).lerp(STEAM_LOW, ph * 0.5), a & 3, tilt);
        }
        // 수증기: 마그마가 바닷물을 만나 하얗게 솟는다.
        const cnt = Math.round(70 * v.s);
        for (let a = 0; a < cnt; a++) {
          const ph = (anim * (0.24 + 0.1 * hash(a, 51)) + hash(a, vi + 52)) % 1, rise = 1 - Math.pow(1 - ph, 1.5);
          const ang = hash(a, 53) * 6.283, rad = (0.5 + rise * 3.5) * hash(a, 54);
          cc.copy(STEAM_LOW).lerp(STEAM, Math.min(1, rise * 1.6));
          smoke.push(bx + Math.cos(ang) * rad + rise * 2, by + 0.6 + rise * 16, bz - Math.abs(Math.sin(ang)) * rad, (1.2 + rise * 5.5) * (0.75 + 0.5 * hash(a, 55)), 0.8 * fadeInOut(ph), cc, a & 3, hash(a, 56) * 6.28);
        }
      }
    });
    if (!lightOn) light.intensity = 0;
    lavaBits.count = nl;
    lavaBits.instanceMatrix.needsUpdate = true;
    if (lavaBits.instanceColor) lavaBits.instanceColor.needsUpdate = true;
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

// 분출물 판의 나타남과 사라짐: 처음에 빨리 짙어지고 끝에서 천천히 옅어진다.
function fadeInOut(ph) { return Math.min(1, ph / 0.08) * Math.min(1, (1 - ph) / 0.3); }

// 연기 무늬 넷(2x2). 둥근 덩이 여럿을 겹쳐 꽃양배추처럼 울퉁불퉁한 윤곽을 만들고, 잡음으로 속을 고르지 않게 한다.
// r 칸은 밝기(윗면이 밝고 덩이 아래가 어둡다), a 칸은 짙기다. 그림에만 쓰는 무늬라 계산 값과 상관없다.
function makeSmokeAtlas() {
  // 캔버스를 거치면 반투명한 곳의 색이 어두워지므로(미리 곱한 알파) 바로 자료 무늬로 만든다.
  const S = 128, W = S * 2, data = new Uint8Array(W * W * 4);
  const vnoise = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const h = (a, b) => hash(a + s * 17, b - s * 31);
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - w) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * w;
  };
  for (let cell = 0; cell < 4; cell++) {
    const blobs = [];
    for (let b = 0; b < 22; b++) {
      const ang = hash(b, cell * 7 + 1) * 6.283, d = Math.sqrt(hash(b, cell * 7 + 2)) * 0.27;
      blobs.push([0.5 + Math.cos(ang) * d, 0.5 + Math.sin(ang) * d * 0.85, 0.07 + hash(b, cell * 7 + 3) * 0.11]);
    }
    const dens = (x, y) => { let s = 0; for (const [bx, by, br] of blobs) { const dx = x - bx, dy = y - by; s += Math.exp(-(dx * dx + dy * dy) / (br * br)); } return s; };
    const ox = (cell % 2) * S, oy = Math.floor(cell / 2) * S;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = (px + 0.5) / S, y = (py + 0.5) / S;
      const n = 0.5 * vnoise(x * 7, y * 7, cell) + 0.3 * vnoise(x * 15, y * 15, cell + 4) + 0.2 * vnoise(x * 31, y * 31, cell + 8);
      const d = dens(x, y) * (0.45 + 0.9 * n);
      // 무늬 칸 끝에서 잘리지 않게만 둘레를 흐리게 한다. 윤곽은 덩이와 잡음이 정한다.
      const edge = Math.min(1, Math.max(0, (0.5 - Math.hypot(x - 0.5, y - 0.5)) / 0.12));
      const a = Math.min(1, Math.max(0, (d - 0.25) / 1.1)) ** 1.3 * edge;
      // 빛은 위에서 온다(화면 위쪽이 y 큰 쪽): 조금 위쪽이 덜 짙으면 윗면이라 밝다.
      const lit = Math.min(1, Math.max(0, 0.8 + (dens(x, y - 0.04) - dens(x, y + 0.04)) * 0.18 + (n - 0.5) * 0.25));
      const k = ((oy + py) * W + ox + px) * 4;
      data[k] = data[k + 1] = data[k + 2] = Math.round(lit * 255);
      data[k + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, W, W, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
