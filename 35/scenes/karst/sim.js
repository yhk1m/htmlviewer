// © 2026 김용현
// 정선 돌리네 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 밭과 풀밭 윤곽, 연못, 산봉우리, 마을과 약수터 자리는 OpenStreetMap 자료에서 옮겼다.
// 돌리네 자리는 지도 자료가 아니라 고도 자료에서 계산으로 찾은 닫힌 웅덩이다. 가장자리부터 물을 채우는 계산(우선순위 채우기)으로 웅덩이를 메운 뒤,
// 메운 높이와 원래 높이의 차이가 있는 칸을 이어 웅덩이 하나로 보고, 깊이 3m 이상, 15칸 이상, 평균 해발 650m 이상인 것만 남긴다(jeongseon-osm.js의 DOLINES와 같은 기준).
import { DOLINES, FARMS, PONDS, PLACES as OSM_PLACES, BALGUDEOK, PEAKS } from './jeongseon-osm.js';

export const N = 512;
export const SIZE = 5000;
export const SITE = { lat: 37.272, lon: 128.768, km: 5 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
export const DOLINE_RULE = { depth: 3, cells: 15, mean: 650 };
export { DOLINES, FARMS, PONDS, BALGUDEOK, PEAKS };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;
const inside = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}
function blur(a, r, passes) {
  let out = a.slice();
  for (let q = 0; q < passes; q++) {
    const from = out.slice();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let s = 0, c = 0;
      for (let y = Math.max(0, j - r); y <= Math.min(N - 1, j + r); y++) for (let x = Math.max(0, i - r); x <= Math.min(N - 1, i + r); x++) { s += from[y * N + x]; c++; }
      out[j * N + i] = s / c;
    }
  }
  return out;
}
// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다).
export function fillPolygon(poly, mark, value = 1) {
  const p = poly[0][0] === poly.at(-1)[0] && poly[0][1] === poly.at(-1)[1] ? poly : [...poly, poly[0]];
  for (let j = 0; j < N; j++) {
    const xs = [], y = j + 0.5;
    for (let n = 0; n < p.length - 1; n++) {
      const [x0, y0] = p[n], [x1, y1] = p[n + 1];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let i = Math.max(0, Math.ceil(xs[q] - 0.5)); i <= Math.min(N - 1, Math.floor(xs[q + 1] - 0.5)); i++) mark[idx(i, j)] = value;
  }
  return mark;
}
// r칸 안의 가운데 값
export function medianHeight(h, x, y, r = 2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (inside(i, j)) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

// 가장자리부터 물을 채운다: 창 가장자리 칸에서 시작해 가장 낮은 칸부터 네 이웃으로 넓혀 가며,
// 이웃이 지금 칸보다 낮으면 지금 칸 높이까지 메운다. 닫힌 웅덩이는 넘치는 높이(테두리)까지 차오른다.
export function fillDepressions(h) {
  const f = Float32Array.from(h), seen = new Uint8Array(N * N);
  const hk = new Int32Array(N * N), hv = new Float32Array(N * N);
  let size = 0;
  const push = (k, v) => {
    let i = size++;
    while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= v) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; }
    hk[i] = k; hv[i] = v;
  };
  const pop = () => {
    const k = hk[0], lk = hk[--size], lv = hv[size];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= size) break;
      if (c + 1 < size && hv[c + 1] < hv[c]) c++;
      if (hv[c] >= lv) break;
      hk[i] = hk[c]; hv[i] = hv[c]; i = c;
    }
    hk[i] = lk; hv[i] = lv;
    return k;
  };
  for (let n = 0; n < N; n++) for (const k of [n, (N - 1) * N + n, n * N, n * N + N - 1]) if (!seen[k]) { seen[k] = 1; push(k, f[k]); }
  while (size) {
    const k = pop(), i = k % N, j = (k / N) | 0;
    for (const [a, b] of N4) {
      const x = i + a, y = j + b;
      if (!inside(x, y)) continue;
      const q = idx(x, y);
      if (seen[q]) continue;
      seen[q] = 1;
      if (f[q] < f[k]) f[q] = f[k];
      push(q, f[q]);
    }
  }
  return f;
}

// 메운 칸(메운 높이 > 원래 높이)을 여덟 이웃으로 이어 웅덩이마다 잰다. 기준에 드는 것만 남기고 큰 것부터 번호를 붙인다.
// mask: 남긴 웅덩이 칸에 번호 + 1, 나머지 0. depth: 그 칸의 깊이(메운 높이 - 원래 높이, m).
export function findDolines(h, filled, rule = DOLINE_RULE) {
  const label = new Int32Array(N * N).fill(-1), all = [], cellsOf = [];
  for (let k = 0; k < N * N; k++) {
    if (label[k] >= 0 || filled[k] - h[k] <= 0) continue;
    const id = all.length, stack = [k], cells = [];
    label[k] = id;
    let sx = 0, sy = 0, depth = 0, sum = 0, deepest = k;
    while (stack.length) {
      const q = stack.pop(), i = q % N, j = (q / N) | 0;
      cells.push(q); sx += i; sy += j; sum += h[q];
      if (filled[q] - h[q] > depth) { depth = filled[q] - h[q]; deepest = q; }
      for (const [a, b] of N8) {
        const x = i + a, y = j + b;
        if (!inside(x, y)) continue;
        const r = idx(x, y);
        if (label[r] >= 0 || filled[r] - h[r] <= 0) continue;
        label[r] = id; stack.push(r);
      }
    }
    const c = cells.length;
    all.push({ x: sx / c, y: sy / c, depth, rim: filled[k], cells: c, mean: sum / c, deepest: [deepest % N, (deepest / N) | 0] });
    cellsOf.push(cells);
  }
  const keep = all.map((d, n) => ({ ...d, n })).filter(d => d.depth >= rule.depth && d.cells >= rule.cells && d.mean >= rule.mean).sort((a, b) => b.cells - a.cells);
  const mask = new Int16Array(N * N), depth = new Float32Array(N * N);
  const list = keep.map((d, id) => {
    for (const q of cellsOf[d.n]) { mask[q] = id + 1; depth[q] = filled[q] - h[q]; }
    const areaM2 = d.cells * CELL * CELL;
    return {
      id, x: d.x, y: d.y, depth: d.depth, rim: d.rim, cells: d.cells, mean: d.mean, deepest: d.deepest,
      areaM2, diamM: 2 * Math.sqrt(areaM2 / Math.PI), bottom: d.rim - d.depth,
    };
  });
  return { list, mask, depth, allCount: all.length };
}

// DOLINES(미리 찾아 둔 목록)의 한 웅덩이와 가운데가 가장 가까운 계산 결과
export function matchDoline(list, d) {
  let best = null, bd = Infinity;
  for (const o of list) { const e = Math.hypot(o.x - d.x, o.y - d.y); if (e < bd) { bd = e; best = o; } }
  return { doline: best, dist: bd };
}
// 웅덩이 칸 가운데 가운데 점에 가장 가까운 칸(초승달처럼 휜 웅덩이에서도 이름표가 웅덩이 안에 붙게)
function insideSpot(sim, d) {
  let best = d.deepest, bd = Infinity;
  for (let j = Math.max(0, Math.floor(d.y) - 30); j <= Math.min(N - 1, Math.ceil(d.y) + 30); j++) for (let i = Math.max(0, Math.floor(d.x) - 30); i <= Math.min(N - 1, Math.ceil(d.x) + 30); i++) {
    if (sim.mask[idx(i, j)] !== d.id + 1) continue;
    const e = (i - d.x) ** 2 + (j - d.y) ** 2;
    if (e < bd) { bd = e; best = [i, j]; }
  }
  return best;
}

export function buildJeongseon(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const sh = blur(h, 2, 2);
  const filled = fillDepressions(h);
  const found = findDolines(h, filled);
  const { mask, depth } = found;
  // 발구덕 돌리네 무리: DOLINES의 큰 다섯 개(가로 약 367~422칸, 세로 약 272~363칸)와 짝지은 계산 결과
  const big = DOLINES.slice(0, 5).map(d => matchDoline(found.list, d).doline);

  // 웅덩이 가장자리 칸: 웅덩이 칸 가운데 여덟 이웃에 웅덩이 밖 칸이 있는 칸
  const edge = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    if (!mask[k]) continue;
    for (const [a, b] of N8) { const x = i + a, y = j + b; if (!inside(x, y) || mask[idx(x, y)] !== mask[k]) { edge[k] = 1; break; } }
  }
  // 밭과 풀밭: OSM 윤곽. 민둥산 꼭대기를 품은 넓은 윤곽은 억새 풀밭으로, 나머지는 밭으로 칠한다.
  const field = new Uint8Array(N * N), meadow = new Uint8Array(N * N);
  const [px, py] = PEAKS['민둥산'];
  for (const p of FARMS) {
    const one = fillPolygon(p, new Uint8Array(N * N));
    const target = one[idx(Math.round(px), Math.round(py))] ? meadow : field;
    for (let k = 0; k < N * N; k++) if (one[k]) target[k] = 1;
  }
  const pond = new Uint8Array(N * N);
  for (const p of PONDS) fillPolygon(p, pond);

  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4), splatC = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  // 돌리네 칸에서 둘레 몇 칸까지 번지게 칠할 돌리네 빛(웅덩이 안이 밭이 되도록 쓴다)
  const near = blur(Float32Array.from(mask, v => (v ? 1 : 0)), 1, 1);
  let fieldCells = 0, dolineFieldCells = 0, meadowCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const flat = 1 - smooth(0.18, 0.32, slope);
    // 위성 사진에서 큰 웅덩이 안은 밭이다. 웅덩이 안의 덜 가파른 칸과 OSM 밭 윤곽 칸을 밭으로 칠한다.
    const farm = clamp(Math.max(field[k], smooth(0.35, 0.8, near[k])) * flat);
    const grass = meadow[k] ? 1 - farm : 0;
    const rocky = smooth(0.85, 1.25, slope) * (1 - farm);
    const fo = clamp(1 - rocky - farm - grass);
    splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = pond[k] * 255;
    // 셋째 판: 빨강은 돌리네 안(깊이 비율), 초록은 웅덩이 가장자리 줄
    const dl = mask[k] ? big.some(b => b && b.id + 1 === mask[k]) : false;
    splatC[k * 4] = mask[k] ? 120 + 135 * clamp(depth[k] / 10) : 0;
    splatC[k * 4 + 1] = edge[k] ? 255 : 0;
    splatC[k * 4 + 2] = dl ? 255 : 0;
    splatC[k * 4 + 3] = 255;
    forest[k] = fo; water[k] = pond[k];
    mountain[k] = 1;
    if (farm > 0.5) { fieldCells++; if (mask[k]) dolineFieldCells++; }
    if (grass > 0.5) meadowCells++;
  }

  const dolineCells = found.list.reduce((s, d) => s + d.cells, 0);
  return {
    h, sh, filled, mask, depth, edge, field, meadow, pond, dolines: found.list, big, mountain,
    stage: { h, splatA, splatB, splatC, forest, water, total },
    stats: {
      dolineCount: found.list.length, depressions: found.allCount, dolineCells, fieldCells, dolineFieldCells, meadowCells,
      big: big.map(d => ({ x: +d.x.toFixed(1), y: +d.y.toFixed(1), depth: +d.depth.toFixed(1), rim: +d.rim.toFixed(1), diamM: Math.round(d.diamM), cells: d.cells })),
    },
  };
}

// 단면: 발구덕 돌리네 무리 가운데 세 개(서쪽부터 DOLINES 넷째, 둘째, 첫째)의 가운데를 잇는 꺾은 선.
// 첫째 웅덩이 바깥 서쪽과 셋째 웅덩이 바깥 동쪽으로 약 200m씩 늘인다. 높이는 고도 자료 그대로(이웃 칸 사이를 고르게 이은 값)다.
export function dolineProfile(sim, step = 0.5) {
  const [d4, d2, d1] = [sim.big[3], sim.big[1], sim.big[0]];
  const ext = 200 / CELL;
  const unit = (a, b) => { const L = Math.hypot(a[0] - b[0], a[1] - b[1]); return [(a[0] - b[0]) / L, (a[1] - b[1]) / L]; };
  const c4 = insideSpot(sim, d4), c2 = insideSpot(sim, d2), c1 = insideSpot(sim, d1);
  const u0 = unit(c4, c2), u1 = unit(c1, c2);
  const way = [[c4[0] + u0[0] * ext, c4[1] + u0[1] * ext], c4, c2, c1, [c1[0] + u1[0] * ext, c1[1] + u1[1] * ext]];
  const out = [];
  let m = 0;
  for (let n = 0; n < way.length - 1; n++) {
    const [x0, y0] = way[n], [x1, y1] = way[n + 1], L = Math.hypot(x1 - x0, y1 - y0), s = Math.max(1, Math.round(L / step));
    for (let q = n === 0 ? 0 : 1; q <= s; q++) {
      const x = x0 + ((x1 - x0) * q) / s, y = y0 + ((y1 - y0) * q) / s, k = idx(Math.round(x), Math.round(y));
      const id = sim.mask[k] ? sim.mask[k] - 1 : -1;
      out.push({ m: m + (q / s) * L * CELL, x, y, z: sampleH(sim.h, x, y), doline: id, rim: id >= 0 ? sim.dolines[id].rim : null });
    }
    m += L * CELL;
  }
  return out;
}
// 단면이 지나는 웅덩이마다: 가장자리 사이 길이(m), 테두리(넘치는 높이), 단면 위 가장 낮은 곳과 그 깊이
export function profileNumbers(points) {
  const runs = [];
  for (let n = 0; n < points.length; n++) {
    const p = points[n];
    if (p.doline < 0) continue;
    const last = runs.at(-1);
    if (last && last.doline === p.doline && last.end >= n - 2) last.end = n;
    else runs.push({ doline: p.doline, start: n, end: n });
  }
  // 같은 웅덩이를 두 번 들락거리면 하나로 합친다.
  const merged = [];
  for (const r of runs) { const o = merged.find(q => q.doline === r.doline); if (o) o.end = Math.max(o.end, r.end); else merged.push({ ...r }); }
  const crossed = merged.filter(r => r.end - r.start >= 4).map(r => {
    const seg = points.slice(r.start, r.end + 1), lowP = seg.reduce((a, p) => (p.z < a.z ? p : a), seg[0]);
    return {
      doline: r.doline, start: r.start, end: r.end, low: points.indexOf(lowP),
      widthM: Math.round(points[r.end].m - points[r.start].m), rim: points[r.start].rim, bottom: lowP.z, depth: points[r.start].rim - lowP.z,
    };
  });
  const zs = points.map(p => p.z);
  return { crossed, lengthKm: points.at(-1).m / 1000, high: Math.max(...zs), low: Math.min(...zs) };
}
export function profileMarks(points) {
  const n = profileNumbers(points);
  const marks = n.crossed.map(c => ({ at: c.low, text: `돌리네 깊이 약 ${Math.round(c.depth)}m` }));
  return marks.sort((a, b) => a.at - b.at);
}

// 이름표 자리
export function placesOf(sim) {
  const out = {
    mindung: { name: '민둥산', sub: '억새 풀밭으로 덮인 꼭대기', grid: PEAKS['민둥산'].slice(0, 2), peak: true },
    gasan: { name: '가산', sub: '', grid: PEAKS['가산'].slice(0, 2), peak: true },
    jieok: { name: '지억산', sub: '', grid: PEAKS['지억산'].slice(0, 2), peak: true },
    balgudeok: { name: '발구덕 마을', sub: '짐작한 자리', grid: BALGUDEOK, guess: true },
    yaksu: { name: '거북이약수터', sub: '발구덕 마을 들머리', grid: OSM_PLACES['거북이약수터'], village: true },
    yupyeong: { name: '유평리', sub: '', grid: OSM_PLACES['유평리'], village: true },
    mureung: { name: '무릉리', sub: '', grid: OSM_PLACES['무릉리'], village: true },
  };
  // 큰 웅덩이 다섯: 가장 넓은 것(DOLINES 첫째)은 '돌리네 밭', 나머지는 '돌리네'
  sim.big.forEach((d, n) => {
    out[`doline${n}`] = { name: n === 0 ? '돌리네 밭' : '돌리네', sub: n === 0 ? `웅덩이 안 밭, 깊이 약 ${Math.round(d.depth)}m` : `깊이 약 ${Math.round(d.depth)}m`, grid: insideSpot(sim, d), doline: true };
  });
  return out;
}
