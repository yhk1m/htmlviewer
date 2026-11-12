// © 2026 김용현
// 화강암 풍화 지형 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
// 높이는 과장하지 않는다(가로 1칸 = 1.25m를 1로 그리고, 높이도 같은 비율로 그린다).
// 옆면 넷에는 땅속 단면(절리, 풍화층, 핵석, 풍화 전선, 기반암)을 그림으로 붙인다.
import * as THREE from 'three';
import { N, CELL_M, DC, SPACING, DURATION, DOME_MIN } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
const C = CELL_M;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

// 높이(m)를 그림의 높이로
export const worldY = z => z / C;

// 단면 색
export const COL = {
  granite: '#cfc5bb', gneiss: '#8d877f', gneissBand: '#5e5953', gneissLight: '#b3aca2',
  grus: '#d9b47c', clay: '#b9824e', soil: '#4f4030', joint: '#2a2622', seam: '#9a6635', front: '#8a2f12',
  core: '#e4ddd2', coreEdge: '#5a4e42', sheet: '#3b332c',
};

// 둥근 화강암 바위: 조금 납작한 둥근 상자(초타원체)에 큰 울퉁불퉁함을 더한다. p가 작을수록 둥글다(2이면 공, 8이면 거의 상자).
function boulderGeometry(p, rough) {
  const g = new THREE.SphereGeometry(1, 28, 18), pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const r = Math.pow(Math.pow(Math.abs(v.x), p) + Math.pow(Math.abs(v.y), p) + Math.pow(Math.abs(v.z), p), -1 / p);
    const lump = 1 + rough * (0.5 * Math.sin(v.x * 3.1 + 0.7) * Math.sin(v.z * 2.7 + 1.9) + 0.35 * Math.sin(v.y * 4.3 + v.x * 2.2) + 0.15 * Math.sin(v.x * 9 + v.y * 7 + v.z * 8));
    // 아래쪽은 놓인 자리에 눌려 조금 평평하다.
    const yy = v.y < -0.35 ? -0.35 + (v.y + 0.35) * 0.6 : v.y;
    pos.setXYZ(i, v.x * r * lump, yy * r * lump, v.z * r * lump);
  }
  g.computeVertexNormals();
  return g;
}
function treeGeometry() {
  const g = new THREE.IcosahedronGeometry(0.5, 1), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const lump = 1 + 0.14 * Math.sin(v.x * 7 + 1) * Math.sin(v.y * 6 + 2) + 0.1 * Math.sin(v.z * 9 + v.x * 5);
    p.setXYZ(i, v.x * 0.5 * lump, v.y * 0.5 * lump + 0.55, v.z * 0.5 * lump);
  }
  g.computeVertexNormals();
  return g;
}

// 단면 하나(블록 옆면이나 진행상황의 단면)를 그린다.
// line: { n, at(t) => [x, y] 칸, proj(x, y) => [t, d] (선 위 자리와 선에서 떨어진 거리, 칸), axis: 선이 x 방향이면 'x', y 방향이면 'y' }
// opt: { zTop, zBot } 그림 높이 범위(m), bg: 바탕색
export function drawCut(ctx, W, H, model, line, opt) {
  const { n } = line, B = model.blocks, sx = W / (n - 1), sy = H / (opt.zTop - opt.zBot), gneiss = model.options.rock === 'gneiss';
  const X = t => t * sx, Y = z => (opt.zTop - z) * sy;
  const gA = new Float32Array(n), hA = new Float32Array(n), fA = new Float32Array(n), uA = new Float32Array(n);
  for (let t = 0; t < n; t++) {
    const [x, y] = line.at(t);
    gA[t] = model.sampleOrig(x, y); hA[t] = model.sample(x, y); fA[t] = model.sampleFront(x, y); uA[t] = model.bodyAt(x, y);
  }
  const at = (arr, t) => arr[clamp(Math.round(t), 0, n - 1)];
  ctx.clearRect(0, 0, W, H);
  if (opt.bg) { ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, W, H); }
  const surf = () => { ctx.beginPath(); ctx.moveTo(0, H + 2); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(hA[t])); ctx.lineTo(W, H + 2); ctx.closePath(); };
  // 기반암
  ctx.save(); surf(); ctx.clip();
  ctx.fillStyle = gneiss ? COL.gneiss : COL.granite; ctx.fillRect(0, 0, W, H);
  if (gneiss) {
    // 편마암: 굽이진 줄무늬(광물이 늘어선 결)
    ctx.lineWidth = Math.max(2, H / 120);
    for (let q = -6; q < 40; q++) {
      ctx.beginPath();
      for (let t = 0; t <= n; t += 2) { const z = opt.zBot + q * 3.2 + t * 0.12 * C + 1.6 * Math.sin(t * 0.09 + q); ctx.lineTo(X(t), Y(z)); }
      ctx.strokeStyle = q % 3 ? 'rgba(94,89,83,0.55)' : 'rgba(205,198,188,0.6)'; ctx.stroke();
    }
  } else {
    // 화강암 알갱이 무늬: 검은 운모, 흰 석영, 분홍빛 장석
    for (let q = 0; q < 1400; q++) { const u = hash(q, 3), v = hash(q, 7), c = hash(q, 11); ctx.fillStyle = c < 0.45 ? 'rgba(60,52,48,0.45)' : c < 0.8 ? 'rgba(250,244,236,0.6)' : 'rgba(205,150,128,0.5)'; ctx.fillRect(u * W, v * H, 2 + c * 2, 2 + c * 2); }
  }
  // 절리: 기반암 속 가는 검은 줄. 큰 덩어리(돔이 될 곳) 속에는 없다.
  const jf = model.jointFrac(), J = model.joints, inBody = t => at(uA, t) < 1.05;
  const crossings = [];
  if (!gneiss && jf > 0) {
    const fam = line.axis === 'x' ? J.xs : J.ys;
    for (let t = 0; t < n - 1; t++) {
      const a = line.at(t)[line.axis === 'x' ? 0 : 1] * C, b = line.at(t + 1)[line.axis === 'x' ? 0 : 1] * C;
      for (const v of fam) if ((v - a) * (v - b) <= 0 && a !== b) crossings.push(t + (v - a) / (b - a));
    }
  }
  const jointPath = () => {
    ctx.beginPath();
    for (const t of crossings) { if (inBody(t)) continue; ctx.moveTo(X(t), Y(at(gA, t))); ctx.lineTo(X(t), H + 2); }
    for (let q = 1; q < J.zs.length; q++) {
      let on = false;
      for (let t = 0; t < n; t++) {
        if (uA[t] < 1.05) { on = false; continue; }
        const y = Y(gA[t] - J.zs[q]);
        if (on) ctx.lineTo(X(t), y); else ctx.moveTo(X(t), y);
        on = true;
      }
    }
  };
  if (!gneiss && jf > 0) {
    ctx.globalAlpha = jf; jointPath(); ctx.strokeStyle = COL.joint; ctx.lineWidth = Math.max(1.4, W / 700); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (gneiss && jf > 0) {
    // 편마암의 잘고 짧은 틈
    ctx.globalAlpha = jf * 0.7; ctx.strokeStyle = COL.joint; ctx.lineWidth = Math.max(1, W / 1000);
    ctx.beginPath();
    for (let q = 0; q < 160; q++) { const t = hash(q, 41) * n, z = opt.zBot + hash(q, 43) * (at(gA, t) - opt.zBot), l = 1.5 + hash(q, 47) * 2.5; ctx.moveTo(X(t), Y(z)); ctx.lineTo(X(t + (hash(q, 53) - 0.5) * 2), Y(z - l)); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  // 판상 절리: 드러난 돔 겉과 나란한 틈. 깊을수록 사이가 넓다.
  const sf = model.sheetFrac();
  if (!gneiss && sf > 0 && model.dome().height >= DOME_MIN) {
    ctx.save();
    ctx.globalAlpha = sf; ctx.strokeStyle = COL.sheet; ctx.lineWidth = Math.max(1.6, W / 560);
    for (const d of [0.9, 2.2, 4, 6.5, 9.5]) {
      ctx.beginPath();
      let on = false;
      for (let t = 0; t < n; t++) {
        const ok = uA[t] < 1 && hA[t] - fA[t] < 0.25 && model.stripFrac() > 0.5;
        if (!ok) { on = false; continue; }
        const y = Y(hA[t] - d * (0.7 + 0.3 * (1 - uA[t])));
        if (on) ctx.lineTo(X(t), y); else ctx.moveTo(X(t), y);
        on = true;
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // 풍화층: 지표와 풍화 전선 사이. 화강암은 그루스(굵은 모래), 편마암은 고운 흙이 많다.
  const regPath = () => { ctx.beginPath(); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(Math.min(hA[t], fA[t]))); for (let t = n - 1; t >= 0; t--) ctx.lineTo(X(t), Y(hA[t])); ctx.closePath(); };
  regPath(); ctx.fillStyle = gneiss ? COL.clay : COL.grus; ctx.fill();
  ctx.save(); regPath(); ctx.clip();
  for (let q = 0; q < 900; q++) { const u = hash(q, 21), v = hash(q, 23); ctx.fillStyle = hash(q, 29) < 0.5 ? 'rgba(120,80,40,0.35)' : 'rgba(252,236,200,0.5)'; ctx.fillRect(u * W, v * H, 2, 2); }
  // 풍화층 속 절리 자리: 풍화가 먼저 파고든 넓은 갈색 띠
  if (!gneiss && jf > 0) { jointPath(); ctx.strokeStyle = COL.seam; ctx.lineWidth = Math.max(3, W / 300); ctx.stroke(); }
  ctx.restore();
  // 풍화 전선
  if (model.weatherFrac() > 0.02) {
    ctx.save(); ctx.setLineDash([Math.max(8, W / 90), Math.max(5, W / 160)]);
    ctx.beginPath();
    let on = false;
    for (let t = 0; t < n; t++) { if (hA[t] - fA[t] < 0.15) { on = false; continue; } if (on) ctx.lineTo(X(t), Y(fA[t])); else ctx.moveTo(X(t), Y(fA[t])); on = true; }
    ctx.strokeStyle = COL.front; ctx.lineWidth = Math.max(2, W / 400); ctx.stroke(); ctx.restore();
  }
  // 겉흙(풍화층이 남은 곳만)
  const soilT = 0.7;
  ctx.beginPath();
  for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(hA[t]));
  for (let t = n - 1; t >= 0; t--) ctx.lineTo(X(t), Y(hA[t] - (hA[t] - fA[t] > soilT + 0.3 ? soilT : 0)));
  ctx.closePath(); ctx.fillStyle = COL.soil; ctx.fill();
  ctx.restore();
  // 핵석과 드러난 바위: 선이 덩어리를 지나는 것만. 둥근 정도만큼 모서리를 둥글게 그린다.
  const along = line.axis === 'x' ? B.hx : B.hy, across = line.axis === 'x' ? B.hy : B.hx;
  for (let b = 0; b < B.n; b++) {
    if (B.gone[b] || B.carried[b] || B.rho[b] <= 0.02) continue;
    const [t, d] = line.proj(B.x[b], B.y[b]), s = B.s[b];
    if (t < -3 || t > n + 2 || Math.abs(d) * C > across[b] * s) continue;
    const half = B.hz[b] * s, hw = (along[b] * s / C) * sx, hh = half * sy, cx = X(t), cy = Y(B.zb[b] + half), rho = B.rho[b];
    const rr = Math.min(hw, hh) * (0.15 + 0.85 * rho);
    ctx.beginPath(); ctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, rr);
    ctx.fillStyle = COL.core; ctx.fill();
    ctx.strokeStyle = COL.coreEdge; ctx.lineWidth = Math.max(1.4, W / 600); ctx.stroke();
  }
  ctx.beginPath(); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(hA[t])); ctx.strokeStyle = 'rgba(30,26,22,0.85)'; ctx.lineWidth = Math.max(1.5, W / 600); ctx.stroke();
  return { X, Y, gA, hA, fA, uA };
}

export function createBlock(model, { trees: treeFactor = 1 } = {}) {
  const group = new THREE.Group();
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const P = {
    lush: linear('#3d6a2c'), lush2: linear('#4e7a35'), forest: linear('#4c6a37'), forest2: linear('#5f7d42'), grass: linear('#7b9353'),
    tundra: linear('#867c60'), tundra2: linear('#958a6a'), grus: linear('#d2b583'), rock: linear('#cbc4ba'), rock2: linear('#b3aca2'), lichen: linear('#8f8b7d'),
    sheet: linear('#6b645b'), groove: linear('#4f4a43'), frost: linear('#e4ecef'),
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), speckle = new Float32Array(N * N), patch = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
    speckle[k] = 0.93 + hash(i, j) * 0.14;
    patch[k] = Math.sin(i * 0.21 + 1) * Math.sin(j * 0.17) * 0.5 + 0.5 + Math.sin(i * 0.53 + j * 0.37) * 0.15;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }));
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  group.add(terrain);

  // 옆면 넷. 앞면(아래쪽 끝)과 오른쪽 면이 비스듬히 보는 쪽이다.
  const F = N - 1;
  const faces = [
    { name: 'front', at: t => [t, F], proj: (x, y) => [x, F - y], axis: 'x' },
    { name: 'right', at: t => [F, F - t], proj: (x, y) => [F - y, F - x], axis: 'y' },
    { name: 'back', at: t => [F - t, 0], proj: (x, y) => [F - x, y], axis: 'x' },
    { name: 'left', at: t => [0, t], proj: (x, y) => [y, x], axis: 'y' },
  ];
  let zTop = 1, zBot = -1;
  for (const f of faces) {
    f.canvas = document.createElement('canvas');
    f.canvas.width = 1024; f.canvas.height = 512;
    f.ctx = f.canvas.getContext('2d');
    f.tex = new THREE.CanvasTexture(f.canvas);
    f.tex.colorSpace = THREE.SRGBColorSpace;
    f.tex.anisotropy = 4;
    const g = new THREE.BufferGeometry(), p = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), idx = [];
    for (let t = 0; t < N - 1; t++) { const a = t * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    f.geo = g;
    f.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: f.tex, side: THREE.DoubleSide }));
    f.mesh.frustumCulled = false;
    group.add(f.mesh);
  }
  let lastLayout = '';
  function syncFaces() {
    const key = JSON.stringify(model.options);
    if (key !== lastLayout) {
      let hi = -1e9;
      for (let k = 0; k < N * N; k++) hi = Math.max(hi, model.g[k]);
      zTop = hi + 2; zBot = model.bottom; lastLayout = key;
    }
    for (const f of faces) {
      const p = f.geo.attributes.position, uv = f.geo.attributes.uv;
      for (let t = 0; t < N; t++) {
        const [x, y] = f.at(t), k = y * N + x, top = model.h[k];
        p.setXYZ(t * 2, x - CENTER, worldY(top), y - CENTER); p.setXYZ(t * 2 + 1, x - CENTER, worldY(zBot), y - CENTER);
        uv.setXY(t * 2, t / (N - 1), (top - zBot) / (zTop - zBot)); uv.setXY(t * 2 + 1, t / (N - 1), 0);
      }
      p.needsUpdate = true; uv.needsUpdate = true;
      drawCut(f.ctx, f.canvas.width, f.canvas.height, model, { n: N, at: f.at, proj: f.proj, axis: f.axis }, { zTop, zBot });
      f.tex.needsUpdate = true;
    }
  }

  // 바위: 둥근 정도에 따라 세 가지 모양(각진 것, 반쯤 둥근 것, 둥근 것)
  const MAXB = 6000;
  const shapes = [boulderGeometry(7, 0.05), boulderGeometry(3.6, 0.07), boulderGeometry(2.6, 0.08)].map(geom => {
    const mesh = new THREE.InstancedMesh(geom, new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0 }), MAXB);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;
    mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    group.add(mesh);
    return mesh;
  });
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e3 = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), c3 = new THREE.Color(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  function syncBoulders() {
    const B = model.blocks, cnt = [0, 0, 0], today = model.todayFrac(), stain = 1 - model.todayFrac();
    for (let b = 0; b < B.n; b++) {
      if (!B.state[b] || B.gone[b]) continue;
      const rho = B.rho[b], q = rho < 0.45 ? 0 : rho < 0.8 ? 1 : 2, mesh = shapes[q];
      if (cnt[q] >= MAXB) continue;
      const s = B.s[b], half = B.hz[b] * s;
      p3.set(B.x[b] - CENTER, worldY(B.zb[b] + half), B.y[b] - CENTER);
      e3.set((B.v2[b] - 0.5) * 0.12, (B.v1[b] - 0.5) * 0.5, (B.v3[b] - 0.5) * 0.12);
      q4.setFromEuler(e3);
      s3.set((B.hx[b] * s) / C, half / C, (B.hy[b] * s) / C);
      m4.compose(p3, q4, s3);
      mesh.setMatrixAt(cnt[q], m4);
      // 갓 드러난 바위는 풍화된 겉이 누르스름하고, 오래 드러난 바위는 회백색에 지의류로 얼룩진다.
      const l = 0.6 + 0.12 * B.v1[b], warm = 0.07 * stain + 0.02, moss = B.v3[b] > 0.75 ? 0.07 * today : 0;
      c3.setRGB(l + warm - moss, l + warm * 0.55 - moss * 0.7, l - warm * 0.6 - moss);
      mesh.setColorAt(cnt[q], c3);
      cnt[q]++;
    }
    shapes.forEach((mesh, q) => { mesh.count = cnt[q]; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; });
  }

  // 나무: 풍화층(흙)이 남은 땅에만 선다. 덥고 습한 시기와 오늘날에 보인다.
  const TREE_SLOTS = [];
  for (let j = 2; j < N - 2; j += 3) for (let i = 2; i < N - 2; i += 3) {
    const r = hash(i, j);
    if (r > treeFactor * 0.55) continue;
    TREE_SLOTS.push([i + (hash(i, j + 1) - 0.5) * 2.4, j + (hash(i + 1, j) - 0.5) * 2.4, hash(i + 3, j + 5)]);
  }
  const trees = new THREE.InstancedMesh(treeGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.95 }), TREE_SLOTS.length);
  trees.castShadow = true; trees.frustumCulled = false; trees.count = 0;
  group.add(trees);
  function syncTrees() {
    const f = model.forestFrac(), lush = model.clock < 34;
    let n = 0;
    if (f > 0.02) {
      for (const [x, y, r] of TREE_SLOTS) {
        const i = Math.round(x), j = Math.round(y), k = j * N + i;
        if (model.bare[k] || model.cover[k] || model.wf[k] - model.e[k] < 0.8) continue;
        const grow = clamp((f - r * 0.5) / 0.5);
        if (grow <= 0.02) continue;
        const hgt = ((lush ? 8 : 6) + 4 * r) / C * grow, wid = ((lush ? 5.5 : 4.2) + 2 * r) / C * grow;
        m4.compose(p3.set(x - CENTER, worldY(model.sample(x, y)) - 0.3, y - CENTER), q4.identity(), s3.set(wid, hgt, wid));
        trees.setMatrixAt(n, m4);
        c3.setRGB(0.1 + r * 0.06, 0.2 + r * 0.08, 0.08 + r * 0.03);
        trees.setColorAt(n, c3);
        n++;
      }
    }
    trees.count = n;
    trees.instanceMatrix.needsUpdate = true;
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
  }

  // 나마(평평한 바위 윗면의 오목한 웅덩이)와 타포니(가파른 벽의 옆으로 파인 구멍), 박리된 판 조각
  // 둘 다 바위 겉에 붙인 얇은 판(데칼)에 윤곽이 울퉁불퉁한 오목한 자국을 그려 붙인다. 검은 원판처럼 보이지 않게 가장자리는 바위색으로 옅어진다.
  const decal = (tex) => new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const nama = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), decal(pitTexture('nama')), 40);
  nama.frustumCulled = false; nama.count = 0; group.add(nama);
  const tafoni = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), decal(pitTexture('tafoni')), 60);
  tafoni.frustumCulled = false; tafoni.count = 0; group.add(tafoni);
  const flakes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xbdb5aa, roughness: 0.9 }), 40);
  flakes.castShadow = true; flakes.frustumCulled = false; flakes.count = 0; group.add(flakes);
  let grooveCells = new Set(), microKey = '';
  function syncMicro() {
    const ms = model.microShown(), f = model.todayFrac();
    const key = `${model.version}`;
    if (key === microKey) return;
    microKey = key;
    let n = 0;
    for (const q of ms.nama) {
      const r = (1.3 + 0.8 * hash(q.x, q.y)) / C * clamp(f * 1.6);
      m4.compose(p3.set(q.x - CENTER + (hash(q.y, q.x) - 0.5) * 0.6, worldY(model.sample(q.x, q.y)) + 0.03, q.y - CENTER), q4.setFromAxisAngle(up.set(0, 1, 0), hash(q.x, q.y + 5) * 6.28), s3.set(r, 1, r * (0.8 + 0.3 * hash(q.x, 2))));
      nama.setMatrixAt(n++, m4);
    }
    nama.count = n; nama.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const q of ms.tafoni) {
      // 한 자리에 크고 작은 구멍 서너 개가 모여 있다.
      for (let c = 0; c < 4 && n < 60; c++) {
        const ox = (hash(q.x + c, q.y) - 0.5) * 2.2, oz = (hash(q.x, q.y + c) - 0.5) * 2.2, x = q.x + ox * Math.abs(q.ny), y = q.y + oz * Math.abs(q.nx);
        const z = model.sample(x, y) + (hash(c, q.x) - 0.5) * 2.5;
        const r = (0.6 + 0.7 * hash(c + 7, q.y)) / C * clamp(f * 1.6);
        dir.set(q.nx, 0, q.ny).normalize();
        q4.setFromUnitVectors(up.set(0, 0, 1), dir);
        m4.compose(p3.set(x - CENTER + q.nx * 0.35, worldY(z), y - CENTER + q.ny * 0.35), q4, s3.set(r * 1.3, r * 0.9, 1));
        tafoni.setMatrixAt(n++, m4);
      }
    }
    tafoni.count = n; tafoni.instanceMatrix.needsUpdate = true;
    grooveCells = new Set();
    for (const q of ms.groove) for (const p of q.pts) for (let d = -1; d <= 1; d++) { grooveCells.add(p.y * N + p.x + d); grooveCells.add((p.y + d) * N + p.x); }
    // 박리된 판 조각: 돔 기슭(드러난 바위의 가장자리)에 떨어져 있다.
    n = 0;
    const sf = model.sheetFrac(), R = model.bodyR();
    if (sf > 0.2 && R > 0 && model.bare[DC.y * N + DC.x]) {
      for (let a = 0; a < 14; a++) {
        const ang = (a / 14) * Math.PI * 2 + 0.2, ux = Math.cos(ang), uy = Math.sin(ang);
        let x = DC.x, y = DC.y;
        for (let r = 0.3 * R; r < 1.6 * R; r += 0.5) { x = Math.round(DC.x + ux * r); y = Math.round(DC.y + uy * r); if (x < 1 || y < 1 || x > N - 2 || y > N - 2 || !model.bare[y * N + x]) break; }
        if (hash(a, 3) > sf) continue;
        const s = (1.2 + 1.4 * hash(a, 5)) / C;
        q4.setFromEuler(e3.set((hash(a, 7) - 0.5) * 0.6, ang, (hash(a, 9) - 0.5) * 0.6));
        m4.compose(p3.set(x - CENTER, worldY(model.sample(x, y)) + 0.12, y - CENTER), q4, s3.set(s, 0.25 / C, s * 0.7));
        flakes.setMatrixAt(n++, m4);
      }
    }
    flakes.count = n; flakes.instanceMatrix.needsUpdate = true;
  }

  // 판상 절리 자국: 드러난 돔 겉과 나란한 판의 가장자리가 겉에 줄로 보인다. 같은 높이를 잇는 선(등고선)으로 그린다.
  const MAXSEG = 9000;
  const sheetGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXSEG * 6), 3));
  const sheetLines = new THREE.LineSegments(sheetGeo, new THREE.LineBasicMaterial({ color: 0x4a433b, transparent: true, opacity: 0.85 }));
  sheetLines.frustumCulled = false;
  group.add(sheetLines);
  function syncSheets() {
    const sf = model.sheetFrac(), sp = sheetGeo.attributes.position, { h, bodyU, bare } = model;
    let n = 0;
    if (sf > 0 && model.dome().height >= DOME_MIN) {
      let lo = 1e9, hi = -1e9;
      for (let k = 0; k < N * N; k++) if (bodyU[k] < 1.1 && bare[k]) { lo = Math.min(lo, h[k]); hi = Math.max(hi, h[k]); }
      const STEP = 2.4, L0 = Math.ceil(lo / STEP) * STEP, count = Math.floor((hi - L0) / STEP) + 1, shown = Math.ceil(count * sf);
      const pts = [];
      for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
        const k = j * N + i, ks = [k, k + 1, k + N + 1, k + N];
        if (!ks.every(q => bodyU[q] < 1.1 && bare[q])) continue;
        const v = ks.map(q => h[q]), xy = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const qlo = Math.min(...v), qhi = Math.max(...v);
        for (let L = Math.max(L0, Math.ceil(qlo / STEP) * STEP); L <= qhi; L += STEP) {
          if (Math.round((hi - L) / STEP) >= shown) continue; // 위쪽 판부터 차례로 보인다.
          pts.length = 0;
          for (let e = 0; e < 4; e++) {
            const a = v[e], b = v[(e + 1) % 4];
            if ((a - L) * (b - L) < 0) { const f = (L - a) / (b - a), p = xy[e], q = xy[(e + 1) % 4]; pts.push(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f); }
          }
          for (let s = 0; s + 3 < pts.length && n < MAXSEG; s += 4) {
            sp.setXYZ(n * 2, pts[s] - CENTER, worldY(L) + 0.08, pts[s + 1] - CENTER);
            sp.setXYZ(n * 2 + 1, pts[s + 2] - CENTER, worldY(L) + 0.08, pts[s + 3] - CENTER);
            n++;
          }
        }
      }
    }
    sheetGeo.setDrawRange(0, n * 2);
    sp.needsUpdate = true;
    sheetLines.material.opacity = 0.85 * Math.min(1, sf * 1.5);
  }

  // 단면 자리(돔 한가운데를 지나는 줄)
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 2.4, gapSize: 1.8 }));
  sectionLine.frustumCulled = false;
  group.add(sectionLine);
  function syncSectionLine() {
    const lp = lineGeo.attributes.position;
    for (let t = 0; t < N; t++) lp.setXYZ(t, t - CENTER, worldY(model.sample(t, DC.y)) + 0.6, DC.y - CENTER);
    lp.needsUpdate = true;
    sectionLine.computeLineDistances();
  }

  function paint(k) {
    const { h, g, wf, e } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = worldY(h[k]);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dx = (h[ir] - h[il]) / ((ir - il) * C), dz = (h[jr] - h[jl]) / (((jr - jl) / N) * C), len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const pt = patch[k], t = model.clock, cold = model.coldFrac(), today = smooth(58, 66, t), reg = wf[k] - e[k];
    let c;
    if (model.bare[k]) {
      // 드러난 기반암: 회백색 화강암. 오래 드러날수록 지의류로 얼룩진다. 돔 겉에는 판상 절리 자국과 그루브가 보인다.
      c = mix(P.rock, P.rock2, pt * 0.7);
      c = mix(c, P.lichen, today * smooth(0.55, 0.9, pt) * 0.5);
      if (model.bodyU[k] < 1.15) {
        if (grooveCells.has(k)) c = mix(c, P.groove, 0.8 * clamp(model.todayFrac() * 1.5));
      }
      if (cold > 0) c = mix(c, P.frost, model.coldFrac() * smooth(0.5, 0.9, pt) * 0.3);
    } else {
      // 풍화층이 덮은 땅: 덥고 습한 시기에는 짙은 숲, 추운 시기에는 맨땅(얇아진 곳은 그루스), 오늘날은 숲과 풀
      const lush = smooth(4, 10, t) * (1 - smooth(30, 34, t));
      c = mix(mix(P.forest, P.forest2, pt * 0.6), mix(P.lush, P.lush2, pt), lush);
      if (t >= 31) {
        let tu = mix(P.tundra, P.tundra2, pt);
        tu = mix(tu, P.grus, smooth(1.5, 0.2, reg) * 0.8 + smooth(2, 8, e[k]) * 0.25);
        tu = mix(tu, P.frost, cold * smooth(0.4, 0.85, pt) * 0.45);
        c = mix(c, tu, cold);
        if (today > 0) c = mix(c, mix(P.grass, P.forest2, pt * 0.6), today * (1 - cold));
      }
    }
    if (model.cover[k]) c = mix(c, P.rock2, 0.3);
    const sp = speckle[k];
    for (let q = 0; q < 3; q++) col[k * 3 + q] = c[q] * sp;
  }

  let lastVersion = -1;
  function syncTerrain(force) {
    if (!force && model.version === lastVersion) return false;
    lastVersion = model.version;
    syncMicro();
    for (let k = 0; k < N * N; k++) paint(k);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    syncBoulders();
    syncTrees();
    syncSheets();
    syncSectionLine();
    return true;
  }

  return { group, terrain, syncTerrain, syncFaces };
}
export { SPACING, DURATION };

// 나마와 타포니 자국 무늬(그림에만 쓴다). 윤곽은 몇 겹의 물결로 울퉁불퉁하게, 안쪽은 가운데로 갈수록 어둡다.
// 나마는 얕은 접시라 바닥에 빗물이 조금 고인 빛을, 타포니는 옆으로 깊이 파인 굴이라 안쪽 그늘을 그린다.
function pitTexture(kind) {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), tf = kind === 'tafoni';
  const k1 = tf ? 4.3 : 1.7, k2 = tf ? 2.1 : 0.9;
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const x = (px + 0.5) / S - 0.5, y = (py + 0.5) / S - 0.5, a = Math.atan2(y, x), r = Math.hypot(x, y) * 2;
    const edge = 0.78 + 0.1 * Math.sin(3 * a + k1) + 0.06 * Math.sin(5 * a + k2) + 0.04 * Math.sin(9 * a + 1.3);
    const u = r / edge; // 0 가운데, 1 가장자리
    if (u >= 1.12) continue;
    const k = (py * S + px) * 4;
    const grain = 0.92 + 0.16 * hash(px, py);
    let c, al;
    if (tf) {
      // 가운데 깊은 그늘, 가장자리는 바위색으로 옅어진다. 위쪽 가장자리가 조금 더 어둡다(처마 그늘).
      const d = Math.max(0, 1 - u), shade = 0.12 + 0.55 * (1 - d * d) - (y < 0 ? 0 : 0.06 * d);
      c = [182 * shade, 172 * shade, 160 * shade]; al = Math.min(1, Math.max(0, (1.1 - u) / 0.25));
    } else {
      // 얕은 접시: 가장자리 고리는 조금 어둡고 거칠며, 바닥에는 빗물이 고여 하늘빛이 비친다.
      const wet = u < 0.55 ? 1 : Math.max(0, (0.7 - u) / 0.15), rim = Math.max(0, 1 - Math.abs(u - 0.85) / 0.2);
      c = [130 - 40 * rim, 126 - 40 * rim, 118 - 38 * rim];
      c = c.map((v, i) => v * (1 - 0.7 * wet) + [96, 112, 124][i] * 0.7 * wet);
      al = Math.min(1, Math.max(0, (1.1 - u) / 0.2)) * (0.55 + 0.4 * Math.max(wet, rim));
    }
    img.data[k] = Math.min(255, c[0] * grain); img.data[k + 1] = Math.min(255, c[1] * grain); img.data[k + 2] = Math.min(255, c[2] * grain);
    img.data[k + 3] = Math.round(255 * al);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
