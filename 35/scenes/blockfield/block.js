// © 2026 김용현
// 암괴원과 암괴류 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
// 높이: 땅 모양(처음 지표)만 VE배로 키우고, 지표에서 잰 깊이와 바위 크기는 그대로 그린다. 그래야 바위가 길쭉해지거나 떠 보이지 않는다.
import * as THREE from 'three';
import { N, CELL_M, inStreamZone, sectionLine as sectionPts, valleyX } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const VE = 1.5;
const C = CELL_M;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

// 높이(m)를 그림의 높이로. g는 그 자리의 처음 지표 높이(m)다.
export const worldY = (z, g) => (z + (VE - 1) * g) / C;

// 둥근 화강암 바위: 조금 납작한 공에 울퉁불퉁함을 더한다.
function boulderGeometry(detail) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const lump = 1 + 0.12 * Math.sin(v.x * 4.1 + 1.3) * Math.sin(v.z * 3.7 + 0.4) + 0.08 * Math.sin(v.y * 5.3 + v.x * 2.9) + 0.04 * Math.sin(v.x * 9 + v.y * 7 + v.z * 8);
    // 아래쪽은 조금 더 평평하다(놓인 자리에 눌린 모양).
    const yy = v.y < 0 ? v.y * 0.82 : v.y;
    p.setXYZ(i, v.x * lump, yy * lump, v.z * lump);
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

const COL = {
  bedrock: '#b3a79b', bedrock2: '#9d9186', sap: '#d09a52', sap2: '#d8ad6c', soil: '#5b4a33', joint: '#2a2622', seam: '#8a5a2f',
  core: '#efe9df', coreEdge: '#3f3830', loose: '#cfc6b8', looseEdge: '#4a433b', sky: 'rgba(0,0,0,0)',
};

// 단면 하나(블록 옆면이나 진행상황의 단면)를 그린다.
// line: { n, at(t) => [x, y] 칸, proj(x, y) => [t, d] (선 위 자리와 선에서 떨어진 거리, 칸), cross: 수직 절리가 선과 만나는 t 목록 }
// opt: { yTop, yBot } 그림 높이 범위, clear: 땅 위를 비울지
export function drawCut(ctx, W, H, model, line, opt) {
  const { n } = line, B = model.boulders, sx = W / (n - 1), sy = H / (opt.yTop - opt.yBot);
  const X = t => t * sx, Y = wy => (opt.yTop - wy) * sy;
  const gA = new Float32Array(n), hA = new Float32Array(n), fA = new Float32Array(n);
  for (let t = 0; t < n; t++) {
    const [x, y] = line.at(t), k = Math.round(y) * N + Math.round(x);
    gA[t] = model.sampleOrig(x, y); hA[t] = model.sampleGround(x, y); fA[t] = gA[t] - model.wf[k];
  }
  const yAt = (t, z) => { const i = clamp(Math.round(t), 0, n - 1); return Y(worldY(z, gA[i])); };
  ctx.clearRect(0, 0, W, H);
  if (opt.bg) { ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, W, H); }
  const surfPath = () => { ctx.beginPath(); ctx.moveTo(0, H + 2); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(worldY(hA[t], gA[t]))); ctx.lineTo(W, H + 2); ctx.closePath(); };
  // 기반암
  surfPath(); ctx.fillStyle = COL.bedrock; ctx.fill();
  ctx.save(); surfPath(); ctx.clip();
  // 화강암 알갱이 무늬
  for (let q = 0; q < 900; q++) { const u = hash(q, 3), v = hash(q, 7), c = hash(q, 11); ctx.fillStyle = c < 0.5 ? 'rgba(70,60,55,0.35)' : c < 0.8 ? 'rgba(240,226,214,0.45)' : 'rgba(190,140,120,0.4)'; ctx.fillRect(u * W, v * H, 2 + c * 2, 2 + c * 2); }
  // 풍화층(마사토): 지표와 풍화 전선 사이
  const sapPath = () => { ctx.beginPath(); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(worldY(Math.min(hA[t], fA[t] + 0) , gA[t]))); for (let t = n - 1; t >= 0; t--) ctx.lineTo(X(t), Y(worldY(hA[t], gA[t]))); ctx.closePath(); };
  sapPath(); ctx.fillStyle = COL.sap; ctx.fill();
  ctx.save(); sapPath(); ctx.clip();
  for (let q = 0; q < 700; q++) { const u = hash(q, 21), v = hash(q, 23); ctx.fillStyle = hash(q, 29) < 0.5 ? 'rgba(120,80,40,0.35)' : 'rgba(250,225,170,0.4)'; ctx.fillRect(u * W, v * H, 2, 2); }
  ctx.restore();
  // 절리: 기반암에서는 가는 검은 줄, 풍화층에서는 풍화가 먼저 파고든 넓은 갈색 띠
  const jf = model.jointFrac();
  if (jf > 0) {
    const zs = model.joints.zs;
    const drawJoints = () => {
      ctx.beginPath();
      for (const t of line.cross) { if (t < 0 || t > n - 1) continue; const i = Math.round(t); ctx.moveTo(X(t), yAt(t, gA[i])); ctx.lineTo(X(t), H + 2); }
      for (let q = 1; q < zs.length; q++) { ctx.moveTo(0, yAt(0, gA[0] - zs[q])); for (let t = 1; t < n; t++) ctx.lineTo(X(t), yAt(t, gA[t] - zs[q])); }
    };
    ctx.globalAlpha = jf;
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, H + 2); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(worldY(Math.min(hA[t], fA[t]), gA[t]))); ctx.lineTo(W, H + 2); ctx.closePath(); ctx.clip();
    drawJoints(); ctx.strokeStyle = COL.joint; ctx.lineWidth = Math.max(1.4, W / 700); ctx.stroke();
    ctx.restore();
    ctx.save(); sapPath(); ctx.clip();
    drawJoints(); ctx.strokeStyle = COL.seam; ctx.lineWidth = Math.max(4, W / 240); ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // 핵석: 선 가까이(덩어리 반 칸 안)에 묻힌 덩어리. 둥근 정도만큼 모서리를 둥글게 그린다.
  const sp = model.joints.xs.length > 1 ? model.joints.xs[2] - model.joints.xs[1] : 3;
  for (let b = 0; b < B.n; b++) {
    if (B.state[b] === 2 || B.rho[b] <= 0.02) continue;
    const [t, d] = line.proj(B.x0[b], B.y0[b]);
    if (Math.abs(d) > (sp * 0.5) / C || t < -2 || t > n + 1) continue;
    const z = model.sampleOrig(B.x0[b], B.y0[b]) - B.zc[b], rho = B.rho[b];
    const hw = (B.a[b] * (1 - 0.12 * rho) / C) * sx, hh = (B.a[b] * (1 - 0.12 * rho) / C) * sy, cx = X(t), cy = Y(worldY(z, gA[clamp(Math.round(t), 0, n - 1)]));
    const rr = rho * Math.min(hw, hh);
    ctx.beginPath(); ctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, rr);
    ctx.fillStyle = COL.core; ctx.fill();
    ctx.strokeStyle = COL.coreEdge; ctx.lineWidth = Math.max(1.5, W / 520); ctx.stroke();
  }
  ctx.restore();
  // 겉흙(빙기 전에만 두껍다)
  const soilT = 0.7 * (1 - model.coldFrac() * 0.8);
  ctx.beginPath();
  for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(worldY(hA[t], gA[t])));
  for (let t = n - 1; t >= 0; t--) ctx.lineTo(X(t), Y(worldY(hA[t] - soilT, gA[t])));
  ctx.closePath(); ctx.fillStyle = COL.soil; ctx.fill();
  // 땅 위에 놓인 바위(단면에 걸친 것)
  if (opt.loose) {
    for (let b = 0; b < B.n; b++) {
      if (B.state[b] !== 2) continue;
      const [t, d] = line.proj(B.x[b], B.y[b]), r = B.r[b];
      if (Math.abs(d) > r / C + 0.4 || t < -2 || t > n + 1) continue;
      const gx = model.sampleOrig(B.x[b], B.y[b]);
      ctx.beginPath(); ctx.ellipse(X(t), Y(worldY(B.z[b], gx)), (r / C) * sx, (r * 0.78 / C) * sy, 0, 0, Math.PI * 2);
      ctx.fillStyle = COL.loose; ctx.fill(); ctx.strokeStyle = COL.looseEdge; ctx.lineWidth = Math.max(1, W / 900); ctx.stroke();
    }
  }
  ctx.beginPath(); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(worldY(hA[t], gA[t]))); ctx.strokeStyle = 'rgba(30,26,22,0.8)'; ctx.lineWidth = Math.max(1.5, W / 600); ctx.stroke();
  return { X, Y, yAt, gA, hA, fA };
}

export function createBlock(model, { trees: treeFactor = 1 } = {}) {
  const group = new THREE.Group();
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const P = {
    forest: linear('#4c6a37'), forest2: linear('#5f7d42'), grass: linear('#7b9353'), tundra: linear('#7a7458'), tundra2: linear('#8a7f5f'),
    frost: linear('#e4ecef'), sap: linear('#c39a62'), gap: linear('#4b463f'), gap2: linear('#5c564c'), wet: linear('#6f7f6a'),
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), speckle = new Float32Array(N * N), patch = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
    speckle[k] = 0.92 + hash(i, j) * 0.16;
    patch[k] = Math.sin(i * 0.21 + 1) * Math.sin(j * 0.17) * 0.5 + 0.5 + Math.sin(i * 0.53 + j * 0.37) * 0.15;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  group.add(terrain);

  // 옆면 넷. 단면 그림(절리, 풍화층, 핵석, 기반암)을 결로 붙인다. 앞면(아래쪽 끝)과 오른쪽 면이 비스듬히 보는 쪽이다.
  const F = N - 1;
  const faces = [
    { name: 'front', at: t => [t, F], proj: (x, y) => [x, F - y], crossOf: J => J.xs },
    { name: 'right', at: t => [F, F - t], proj: (x, y) => [F - y, F - x], crossOf: J => J.ys.map(v => F - v / C).map(v => v * C) },
    { name: 'back', at: t => [F - t, 0], proj: (x, y) => [F - x, y], crossOf: J => J.xs.map(v => F - v / C).map(v => v * C) },
    { name: 'left', at: t => [0, t], proj: (x, y) => [y, x], crossOf: J => J.ys },
  ];
  let yTop = 1, yBot = -1;
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
  function layoutFaces() {
    let hi = -1e9;
    for (let k = 0; k < N * N; k++) hi = Math.max(hi, worldY(model.g[k], model.g[k]));
    yTop = hi + 2; yBot = worldY(model.bottom, 0) + 0;
    // 바닥은 평평하게: 가장 낮은 지표에서 블록 바닥 깊이만큼 아래
    let lo = 1e9;
    for (let k = 0; k < N * N; k++) lo = Math.min(lo, worldY(model.g[k], model.g[k]));
    let loM = 1e9;
    for (let k = 0; k < N * N; k++) loM = Math.min(loM, model.g[k]);
    yBot = lo - (loM - model.bottom) / C;
  }
  let lastLayout = '';
  function syncFaces() {
    const key = JSON.stringify(model.options);
    if (key !== lastLayout) { layoutFaces(); lastLayout = key; }
    for (const f of faces) {
      const p = f.geo.attributes.position, uv = f.geo.attributes.uv;
      for (let t = 0; t < N; t++) {
        const [x, y] = f.at(t), k = y * N + x, top = worldY(model.h[k], model.g[k]);
        p.setXYZ(t * 2, x - CENTER, top, y - CENTER); p.setXYZ(t * 2 + 1, x - CENTER, yBot, y - CENTER);
        const u = t / (N - 1);
        uv.setXY(t * 2, u, (top - yBot) / (yTop - yBot)); uv.setXY(t * 2 + 1, u, 0);
      }
      p.needsUpdate = true; uv.needsUpdate = true;
      const cross = f.crossOf(model.joints).map(v => v / C);
      drawCut(f.ctx, f.canvas.width, f.canvas.height, model, { n: N, at: f.at, proj: f.proj, cross }, { yTop, yBot, loose: true });
      f.tex.needsUpdate = true;
    }
  }

  // 바위
  const MAXB = 13000;
  const boulderMat = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0 });
  const boulders = new THREE.InstancedMesh(boulderGeometry(1), boulderMat, MAXB);
  boulders.castShadow = true; boulders.receiveShadow = true; boulders.frustumCulled = false; boulders.count = 0;
  boulders.setColorAt(0, new THREE.Color(1, 1, 1));
  group.add(boulders);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e3 = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), c3 = new THREE.Color();
  function syncBoulders() {
    const B = model.boulders;
    let n = 0;
    for (let b = 0; b < B.n && n < MAXB; b++) {
      const st = B.state[b];
      if (!st) continue;
      const x = st === 2 ? B.x[b] : B.x0[b], y = st === 2 ? B.y[b] : B.y0[b], r = B.r[b];
      const z = st === 2 ? B.z[b] : model.sampleOrig(x, y) - B.zc[b];
      const v1 = B.v1[b], v2 = B.v2[b], v3 = B.v3[b];
      p3.set(x - CENTER, worldY(z, model.sampleOrig(x, y)), y - CENTER);
      // 바위마다 조금씩 다른 크기, 납작함, 기울기
      e3.set((v2 - 0.5) * 0.5, v1 * 6.283, (v3 - 0.5) * 0.5);
      q4.setFromEuler(e3);
      const R = r / C;
      s3.set(R * (0.95 + 0.2 * v2), R * (0.68 + 0.16 * v3), R * (0.9 + 0.15 * v1));
      m4.compose(p3, q4, s3);
      boulders.setMatrixAt(n, m4);
      // 화강암 빛깔: 밝은 회백색에서 누르스름한 빛, 이끼 낀 어두운 회색까지
      const l = 0.44 + 0.2 * v1, warm = v2 * 0.05, moss = v3 > 0.8 ? 0.08 : 0;
      c3.setRGB(l + warm - moss, l + warm * 0.4 - moss * 0.6, l - warm * 0.5 - moss);
      boulders.setColorAt(n, c3);
      n++;
    }
    boulders.count = n;
    boulders.instanceMatrix.needsUpdate = true;
    if (boulders.instanceColor) boulders.instanceColor.needsUpdate = true;
  }

  // 나무: 바위가 없는 땅에만 선다. 빙기 전과 오늘날에만 보인다.
  const TREE_SLOTS = [];
  for (let j = 3; j < N - 3; j += 4) for (let i = 3; i < N - 3; i += 4) {
    const r = hash(i, j);
    if (r > treeFactor * 0.6) continue;
    TREE_SLOTS.push([i + (hash(i, j + 1) - 0.5) * 3.2, j + (hash(i + 1, j) - 0.5) * 3.2, hash(i + 3, j + 5)]);
  }
  const trees = new THREE.InstancedMesh(treeGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.95 }), TREE_SLOTS.length);
  trees.castShadow = true; trees.frustumCulled = false; trees.count = 0;
  group.add(trees);
  function syncTrees() {
    const f = model.forestFrac();
    let n = 0;
    if (f > 0.02) {
      for (const [x, y, r] of TREE_SLOTS) {
        const i = Math.round(x), j = Math.round(y);
        let blocked = false;
        for (let dj = -2; dj <= 2 && !blocked; dj++) for (let di = -2; di <= 2 && !blocked; di++) if (model.cover[(j + dj) * N + i + di]) blocked = true;
        if (blocked) continue;
        // 숲이 자라날 때는 숲 가장자리부터 하나씩 자란다.
        const grow = clamp((f - r * 0.5) / 0.5);
        if (grow <= 0.02) continue;
        const hgt = (3.6 + 2.4 * r) / C * grow, wid = (2.6 + 1.4 * r) / C * grow;
        m4.compose(p3.set(x - CENTER, worldY(model.sampleGround(x, y), model.sampleOrig(x, y)) - 0.3, y - CENTER), q4.identity(), s3.set(wid, hgt, wid));
        trees.setMatrixAt(n, m4);
        c3.setRGB(0.12 + r * 0.06, 0.22 + r * 0.07, 0.09 + r * 0.03);
        trees.setColorAt(n, c3);
        n++;
      }
    }
    trees.count = n;
    trees.instanceMatrix.needsUpdate = true;
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
  }

  // 단면 자리(골짜기 가운데 줄)
  const SEC = sectionPts(120);
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(SEC.length * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 2.4, gapSize: 1.8 }));
  sectionLine.frustumCulled = false;
  group.add(sectionLine);
  function syncSectionLine() {
    const lp = lineGeo.attributes.position;
    SEC.forEach(([x, y], t) => lp.setXYZ(t, x - CENTER, worldY(model.sample(x, y), model.sampleOrig(x, y)) + 0.5, y - CENTER));
    lp.needsUpdate = true;
    sectionLine.computeLineDistances();
  }

  function paint(k, frostNow) {
    const { h, g } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = worldY(h[k], g[k]);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const yx = worldY(h[ir], g[ir]) - worldY(h[il], g[il]), yz = worldY(h[jr], g[jr]) - worldY(h[jl], g[jl]);
    const dx = yx * 0.5, dz = yz * 0.5, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const pt = patch[k], cold = model.coldFrac(), today = smooth(T_WARM_COLOR, T_WARM_COLOR + 12, model.clock);
    // 숲 바닥 → 빙기의 툰드라 같은 맨땅(얼어 있는 곳은 흰 서리) → 오늘날의 풀과 숲
    let c = mix(P.forest, P.forest2, pt * 0.6);
    if (model.clock >= 38) {
      let t = mix(P.tundra, P.tundra2, pt);
      const stripped = model.e[k];
      t = mix(t, P.sap, smooth(1.5, 5, stripped) * 0.3);
      t = mix(t, P.frost, frostNow * smooth(0.35, 0.8, pt) * 0.55);
      c = mix(c, t, cold);
      if (today > 0) c = mix(c, mix(P.grass, P.forest2, pt * 0.5), today * (1 - cold));
    }
    // 바위 사이: 흙이 빠진 어두운 빈틈
    if (model.cover[k]) c = mix(c, mix(P.gap, P.gap2, pt), 0.55 + 0.35 * smooth(T_WARM_COLOR, T_WARM_COLOR + 6, model.clock));
    const sp = speckle[k];
    for (let q = 0; q < 3; q++) col[k * 3 + q] = c[q] * sp;
  }

  let lastVersion = -1;
  function syncTerrain(force) {
    if (!force && model.version === lastVersion) return false;
    lastVersion = model.version;
    // 얼었다 녹기: 빙기 동안 서리가 끼었다 녹기를 되풀이한다(많음이면 자주).
    const per = model.options.cycles === 'many' ? 1.6 : 4, ph = (model.clock / per) % 1;
    const frostNow = model.frost() > 0 ? 0.5 + 0.5 * Math.cos(ph * Math.PI * 2) : model.coldFrac() * 0.4;
    for (let k = 0; k < N * N; k++) paint(k, frostNow);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    syncBoulders();
    syncTrees();
    syncSectionLine();
    return true;
  }

  return { group, terrain, syncTerrain, syncFaces, worldOf: (x, y, z) => worldY(z, model.sampleOrig(x, y)) };
}
const T_WARM_COLOR = 72;
export { valleyX, inStreamZone };
