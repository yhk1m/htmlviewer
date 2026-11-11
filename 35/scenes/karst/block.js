// © 2026 김용현
// 카르스트 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
// 높이는 VE배로 키워 그린다(가로 1칸 = 2m를 1로, 높이 1m를 1로 그려 높이가 2배다).
// 옆면 넷에는 땅속 단면(층리, 절리, 지하수면, 석회 동굴, 종유석과 석순)을 그림으로 붙인다. 앞면이 석회 동굴을 길게 자른 면이다.
import * as THREE from 'three';
import { N, NY, CELL_M, BOTTOM_M, WT } from './model.js';

const CENTER = N / 2, CY = NY / 2;
export const VE = 2; // 그림에서 높이를 키우는 배율. 계산 값은 그대로다.
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

export const COL = {
  lime: '#b9b4a6', lime2: '#a8a294', granite: '#c2ad9f', granite2: '#9f8c80', joint: '#4c443b', soil: '#7a5a3c', terra: '#a8472c',
  water: 'rgba(64,132,205,0.30)', wt: '#7cc0ff', air: '#1c1916', caveWater: '#3f80bd', speleo: '#efe4c8', speleoEdge: '#8d8068', caveEdge: '#3a322a',
};

// 단면 하나(블록 옆면이나 진행상황의 단면)를 그린다. 그림 좌표: 가로는 t(칸), 세로는 그림 높이(worldY).
// face: { n, at(t) => [x, y] 칸, cross: 절리가 이 면과 만나는 t 목록, caves: 동굴을 그릴지(앞면) }
// opt: { yTop, yBot, bg }
export function drawCut(ctx, W, H, model, face, opt) {
  const { n } = face, sx = W / (n - 1), sy = H / (opt.yTop - opt.yBot);
  const X = t => t * sx, Y = wy => (opt.yTop - wy) * sy, YM = zm => Y(worldY(zm));
  const lime = model.options.rock === 'lime', soilF = model.soilFrac();
  const top = new Float32Array(n), dep = new Float32Array(n);
  for (let t = 0; t < n; t++) {
    const [x, y] = face.at(t), k = y * N + x;
    top[t] = model.z[k]; dep[t] = model.dol[k];
  }
  ctx.clearRect(0, 0, W, H);
  if (opt.bg) { ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, W, H); }
  ctx.save();
  // 땅속만 칠하도록 지표 아래를 잘라 둔다.
  ctx.beginPath(); ctx.moveTo(0, H + 2);
  for (let t = 0; t < n; t++) ctx.lineTo(X(t), YM(top[t]));
  ctx.lineTo(W, H + 2); ctx.closePath(); ctx.clip();
  // 바위: 석회암은 층리(얇은 층), 화강암은 알갱이 무늬
  ctx.fillStyle = lime ? COL.lime : COL.granite; ctx.fillRect(0, 0, W, H);
  if (lime) {
    for (let zb = 4, a = 0; zb > BOTTOM_M - 4; zb -= 3, a++) {
      ctx.fillStyle = a % 2 ? 'rgba(80,72,60,0.10)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, YM(zb), W, YM(zb - 3) - YM(zb) + 1);
      ctx.fillStyle = 'rgba(60,52,44,0.35)'; ctx.fillRect(0, YM(zb), W, 1.2);
    }
  } else {
    for (let a = 0; a < 900; a++) {
      const px = hash(a, 3) * W, py = hash(a, 7) * H, r = 1 + hash(a, 9) * 1.6;
      ctx.fillStyle = a % 3 ? 'rgba(70,58,50,0.35)' : 'rgba(250,240,235,0.45)';
      ctx.fillRect(px, py, r, r);
    }
  }
  // 지하수로 찬 곳(지하수면 아래)
  ctx.fillStyle = COL.water; ctx.fillRect(0, YM(model.wt), W, H);
  // 절리: 위쪽일수록 빗물에 녹아 넓어진다(석회암). 화강암은 가는 틈 그대로다.
  for (const c of face.cross) {
    const cx = X(c), widen = lime ? 1.5 + 9 * soilF * (0.4 + 0.6 * clamp(dep[Math.round(clamp(c, 0, n - 1))] / 3)) : 0;
    const base = 1.6, zTop = top[Math.round(clamp(c, 0, n - 1))] + 1, zMid = -22;
    ctx.fillStyle = COL.joint;
    ctx.beginPath();
    ctx.moveTo(cx - base - widen, YM(zTop)); ctx.lineTo(cx + base + widen, YM(zTop));
    ctx.lineTo(cx + base, YM(zMid)); ctx.lineTo(cx + base * 0.7, H); ctx.lineTo(cx - base * 0.7, H); ctx.lineTo(cx - base, YM(zMid));
    ctx.closePath(); ctx.fill();
  }
  // 흙: 석회암 땅은 녹고 남은 붉은 흙(테라로사)이 쌓이고, 돌리네 바닥일수록 두껍다.
  ctx.beginPath();
  for (let t = 0; t < n; t++) ctx.lineTo(X(t), YM(top[t]) - 1);
  for (let t = n - 1; t >= 0; t--) {
    const th = lime ? 0.5 + 1.2 * soilF + dep[t] * 0.35 * soilF : 1;
    ctx.lineTo(X(t), YM(top[t] - th));
  }
  ctx.closePath();
  const sc = lin(COL.soil), tc = lin(COL.terra), s3 = lime ? mix(sc, tc, soilF) : lin('#8b6b48');
  ctx.fillStyle = `rgb(${Math.round(s3[0] * 255)},${Math.round(s3[1] * 255)},${Math.round(s3[2] * 255)})`; ctx.fill();
  // 석회 동굴(앞면): 지하수에 잠긴 부분은 파랑, 물이 빠진 곳은 어두운 빈 공간
  if (face.caves && model.caves) {
    model.caves.forEach((c, i) => {
      if (!c || c.half < 0.5) return;
      const pts = [];
      for (let t = 0; t < n; t += 0.5) { const s = model.caveShape(c, t); if (s) pts.push([t, s.top, s.bot]); }
      if (pts.length < 2) return;
      const outline = () => {
        ctx.beginPath();
        for (const [t, tp] of pts) ctx.lineTo(X(t), YM(tp));
        for (let a = pts.length - 1; a >= 0; a--) ctx.lineTo(X(pts[a][0]), YM(pts[a][2]));
        ctx.closePath();
      };
      outline(); ctx.fillStyle = COL.air; ctx.fill();
      // 물: 동굴 안에서 지금 지하수면보다 낮은 곳
      ctx.save(); outline(); ctx.clip();
      ctx.fillStyle = COL.caveWater; ctx.fillRect(0, YM(model.wt), W, H);
      ctx.restore();
      outline(); ctx.strokeStyle = COL.caveEdge; ctx.lineWidth = 2.5; ctx.stroke();
      // 종유석, 석순, 석주
      const ws = 1.6 / CELL_M; // 그림에서 굵기를 조금 키운다
      for (const d of model.drips[i] || []) {
        const x = X(d.x);
        ctx.fillStyle = COL.speleo; ctx.strokeStyle = COL.speleoEdge; ctx.lineWidth = 1.2;
        if (d.col) {
          const w1 = (0.5 + 0.12 * (d.top - d.bot)) * ws * sx, w0 = w1 * 0.45;
          ctx.beginPath();
          ctx.moveTo(x - w1, YM(d.top) - 1); ctx.lineTo(x + w1, YM(d.top) - 1);
          ctx.lineTo(x + w0, YM(d.bot + d.b)); ctx.lineTo(x + w1 * 1.2, YM(d.bot) + 1);
          ctx.lineTo(x - w1 * 1.2, YM(d.bot) + 1); ctx.lineTo(x - w0, YM(d.bot + d.b));
          ctx.closePath(); ctx.fill(); ctx.stroke();
          continue;
        }
        if (d.a > 0.05) {
          const w = (0.3 + 0.18 * d.a) * ws * sx;
          ctx.beginPath(); ctx.moveTo(x - w, YM(d.top) - 1); ctx.lineTo(x + w, YM(d.top) - 1); ctx.lineTo(x, YM(d.top - d.a)); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        if (d.b > 0.05) {
          const w = (0.45 + 0.3 * d.b) * ws * sx;
          ctx.beginPath(); ctx.moveTo(x - w, YM(d.bot) + 1); ctx.lineTo(x + w, YM(d.bot) + 1); ctx.lineTo(x + w * 0.35, YM(d.bot + d.b)); ctx.lineTo(x - w * 0.35, YM(d.bot + d.b)); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    });
  }
  // 지하수면
  ctx.setLineDash([12, 8]); ctx.strokeStyle = COL.wt; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, YM(model.wt)); ctx.lineTo(W, YM(model.wt)); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  // 지표선
  ctx.beginPath(); for (let t = 0; t < n; t++) ctx.lineTo(X(t), YM(top[t]));
  ctx.strokeStyle = 'rgba(30,26,22,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
  return { X, Y, YM, top };
}

export function createBlock(model) {
  const group = new THREE.Group();
  const P = {
    grass: lin('#748f4c'), grass2: lin('#8aa15c'), forest: lin('#4f6e38'), rock: lin('#b9b4a6'), soil: lin('#8a6446'), terra: lin('#a5492d'),
    crop: lin('#7fa447'), crop2: lin('#5f8a36'), granite: lin('#a69a7c'), gsoil: lin('#9a8060'),
  };
  const pos = new Float32Array(N * NY * 3), nor = new Float32Array(N * NY * 3), col = new Float32Array(N * NY * 3);
  const speckle = new Float32Array(N * NY), patch = new Float32Array(N * NY), grain = new Float32Array(N * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CY;
    speckle[k] = 0.92 + hash(i, j) * 0.16;
    grain[k] = hash(i + 7, j + 3);
    patch[k] = Math.sin(i * 0.17 + 1) * Math.sin(j * 0.13) * 0.5 + 0.5;
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

  // 옆면 넷. 앞면(y = NY - 1)과 오른쪽 면이 비스듬히 보는 쪽이다.
  const FY = NY - 1, FX = N - 1;
  const faces = [
    { name: 'front', n: N, at: t => [t, FY], cross: () => model.plan.jx, caves: true, w: 1024 },
    { name: 'right', n: NY, at: t => [FX, FY - t], cross: () => model.plan.jy.map(y => FY - y), w: 768 },
    { name: 'back', n: N, at: t => [FX - t, 0], cross: () => model.plan.jx.map(x => FX - x), w: 1024 },
    { name: 'left', n: NY, at: t => [0, t], cross: () => model.plan.jy, w: 768 },
  ];
  const yTop = worldY(6), yBot = worldY(BOTTOM_M);
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
    f.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: f.tex, side: THREE.DoubleSide }));
    f.mesh.frustumCulled = false;
    group.add(f.mesh);
  }
  function syncFaces() {
    for (const f of faces) {
      const p = f.geo.attributes.position, uv = f.geo.attributes.uv;
      for (let t = 0; t < f.n; t++) {
        const [x, y] = f.at(t), k = y * N + x, tp = worldY(model.z[k]);
        p.setXYZ(t * 2, x - CENTER, tp, y - CY); p.setXYZ(t * 2 + 1, x - CENTER, yBot, y - CY);
        const u = t / (f.n - 1);
        uv.setXY(t * 2, u, (tp - yBot) / (yTop - yBot)); uv.setXY(t * 2 + 1, u, 0);
      }
      p.needsUpdate = true; uv.needsUpdate = true;
      drawCut(f.ctx, f.canvas.width, f.canvas.height, model, { n: f.n, at: f.at, cross: f.cross(), caves: f.caves }, { yTop, yBot });
      f.tex.needsUpdate = true;
    }
  }

  // 땅 위 하천: 상류 끝에서 스며드는 곳까지 띠로 그린다.
  const RIB = 260;
  const ribPos = new Float32Array(RIB * 2 * 3), ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3));
  {
    const idx = [];
    for (let s = 0; s < RIB - 1; s++) { const a = s * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    ribGeo.setIndex(idx);
  }
  const ribbon = new THREE.Mesh(ribGeo, new THREE.MeshStandardMaterial({ color: 0x4f8fc0, roughness: 0.25, metalness: 0.05, side: THREE.DoubleSide }));
  ribbon.frustumCulled = false;
  group.add(ribbon);
  function syncStream() {
    const path = model.plan.path, end = model.sink ? model.sink.p : path.length - 1, z = model.z;
    let n = 0;
    for (let p = 0; p <= end && n < RIB; p++) {
      const [x, y] = path[p], q = Math.min(path.length - 1, p + 1), r = Math.max(0, p - 1);
      let tx = path[q][0] - path[r][0], ty = path[q][1] - path[r][1];
      const l = Math.sqrt(tx * tx + ty * ty) || 1; tx /= l; ty /= l;
      const i = Math.floor(x), j = Math.floor(y);
      let h = -1e9;
      for (let dj = 0; dj <= 1; dj++) for (let di = 0; di <= 1; di++) h = Math.max(h, z[clamp(j + dj, 0, NY - 1) * N + clamp(i + di, 0, N - 1)]);
      // 스며드는 곳에서는 물이 돌리네 바닥으로 내려간다.
      if (model.sink && p > end - 6) h = z[Math.round(y) * N + Math.round(x)] + 0.1;
      const hw = 0.85, wy = worldY(h) + 0.25;
      ribPos.set([x - ty * hw - CENTER, wy, y + tx * hw - CY, x + ty * hw - CENTER, wy, y - tx * hw - CY], n * 6);
      n++;
    }
    ribGeo.setDrawRange(0, Math.max(0, (n - 1) * 6));
    ribGeo.attributes.position.needsUpdate = true;
    ribGeo.computeVertexNormals();
  }

  // 빗방울: 비가 많을수록 많다. 오늘날 단계에는 그리지 않는다.
  const DROPS_MAX = 420;
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), new THREE.MeshBasicMaterial({ color: 0xcfe2ff, transparent: true, opacity: 0.55 }), DROPS_MAX);
  rain.frustumCulled = false; rain.count = 0;
  group.add(rain);
  const dropX = new Float32Array(DROPS_MAX), dropY = new Float32Array(DROPS_MAX), dropZ = new Float32Array(DROPS_MAX);
  for (let d = 0; d < DROPS_MAX; d++) { dropX[d] = 1 + hash(d, 1) * (N - 3); dropZ[d] = 1 + hash(d, 2) * (NY - 3); dropY[d] = hash(d, 3) * 40; }
  const m4 = new THREE.Matrix4();
  function syncRain(dt) {
    const on = model.rainOn();
    const want = on ? { few: 140, mid: 260, many: 420 }[model.options.rain] : 0;
    for (let d = 0; d < want; d++) {
      const i = Math.round(dropX[d]), j = Math.round(dropZ[d]), ground = worldY(model.z[j * N + i]);
      dropY[d] -= dt * 45;
      if (dropY[d] < ground) dropY[d] += 40 + hash(d, Math.round(dropY[d])) * 6;
      m4.makeTranslation(dropX[d] - CENTER, Math.max(ground + 1.1, dropY[d]), dropZ[d] - CY);
      rain.setMatrixAt(d, m4);
    }
    rain.count = want;
    rain.instanceMatrix.needsUpdate = true;
  }

  function paint(k, soilF, todayF, fieldMask) {
    const { z, dol, cut } = model, i = k % N, j = (k / N) | 0, lime = model.options.rock === 'lime';
    pos[k * 3 + 1] = worldY(z[k]);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < NY - 1 ? k + N : k;
    const dx = (worldY(z[ir]) - worldY(z[il])) * 0.5, dz = (worldY(z[jr]) - worldY(z[jl])) * 0.5, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    let c = mix(P.grass, P.grass2, patch[k]);
    c = mix(c, P.forest, smooth(0.62, 0.9, patch[k]) * 0.7);
    if (lime) {
      // 드러난 석회암 바위(희끗한 점)
      if (grain[k] > 0.93) c = mix(c, P.rock, 0.55);
      // 돌리네 안쪽은 흙이 모여 붉은 흙빛이 짙다.
      const d = clamp(dol[k] / 2.5);
      c = mix(c, mix(P.soil, P.terra, soilF), d * (0.35 + 0.45 * soilF));
      c = mix(c, P.terra, todayF * 0.18);
      if (fieldMask[k] > 0) {
        const stripe = Math.floor((i + j * 0.35) / 1.5) % 2 ? P.crop : mix(P.terra, P.crop2, 0.25);
        c = mix(c, stripe, todayF * fieldMask[k]);
      }
    } else {
      c = mix(c, P.granite, grain[k] > 0.9 ? 0.5 : 0);
      c = mix(c, P.gsoil, clamp(cut[k] / 2) * 0.6);
    }
    const sp = speckle[k];
    for (let q = 0; q < 3; q++) col[k * 3 + q] = c[q] * sp;
  }

  const fieldMask = new Float32Array(N * NY);
  let lastVersion = -1;
  function syncTerrain(force) {
    if (!force && model.version === lastVersion) return false;
    lastVersion = model.version;
    const soilF = model.soilFrac(), todayF = model.todayFrac();
    fieldMask.fill(0);
    if (todayF > 0 && model.options.rock === 'lime') {
      const fields = model.fieldsNow ? model.fieldsNow() : [];
      for (const d of fields) {
        const rr = Math.ceil(d.R);
        for (let j = Math.max(0, d.y - rr); j <= Math.min(NY - 1, d.y + rr); j++) for (let i = Math.max(0, d.x - rr); i <= Math.min(N - 1, d.x + rr); i++) {
          const e = Math.sqrt((i - d.x) * (i - d.x) + (j - d.y) * (j - d.y)) / (d.R * 0.72);
          if (e < 1) fieldMask[j * N + i] = Math.max(fieldMask[j * N + i], smooth(1, 0.75, e));
        }
      }
    }
    for (let k = 0; k < N * NY; k++) paint(k, soilF, todayF, fieldMask);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    syncFaces();
    syncStream();
    return true;
  }

  return { group, terrain, syncTerrain, syncRain, faces };
}
export { WT };
