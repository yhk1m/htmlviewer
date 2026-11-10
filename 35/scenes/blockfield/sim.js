// © 2026 김용현
// 비슬산 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 돌무더기 비탈(scree)과 맨바위, 산봉우리, 절과 휴양림 자리는 OpenStreetMap 자료에서 옮겼다.
// 암괴류 띠는 OSM 돌무더기 윤곽 그대로에, 그 사이를 고도 자료의 골짜기 바닥(물이 흘러내리는 길)을 따라 근사해 이은 띠를 더한 것이다.
// 숲은 땅의 기울기에서 규칙으로 만든 예시다.
import { SCREE, BARE_ROCK, ROCKS, PEAKS, PLACES as OSM_PLACES } from './biseul-osm.js';

export const N = 512;
export const SIZE = 6000;
export const SITE = { lat: 35.698, lon: 128.522, km: 6 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
export { SCREE, BARE_ROCK, ROCKS, PEAKS };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;
const centroid = p => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];

// 대견사 아래 돌무더기 무리(해발 약 900~980m)와 휴양림 위 작은 돌무더기 두 곳(약 600m)을 윤곽의 가운데 자리로 가른다.
export const UPPER = SCREE.filter(p => { const [x, y] = centroid(p); return x > 285 && x < 340 && y > 270 && y < 320; });
export const LOWER = SCREE.filter(p => { const [x, y] = centroid(p); return x > 205 && x < 235 && y > 310 && y < 340; });

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
// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다). 닫히지 않은 다각형은 처음 점으로 닫는다.
// 좁은 윤곽이 칸 가운데를 하나도 품지 않으면 윤곽이 지나는 칸을 칠해 빠지지 않게 한다.
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
  for (const [x, y] of p) { const i = Math.floor(x), j = Math.floor(y); if (i >= 0 && j >= 0 && i < N && j < N) mark[idx(i, j)] = value; }
  return mark;
}

// 움푹한 칸을 둘레 높이까지 채운다(가장 낮은 가장자리부터 차례로 넓혀 가는 방법). 물이 고이지 않고 늘 아래로 흐르게 하려는 것이다.
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
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const x = i + a, y = j + b;
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const q = idx(x, y);
      if (seen[q]) continue;
      seen[q] = 1;
      if (f[q] <= f[k] + 1e-3) f[q] = f[k] + 1e-3;
      push(q, f[q]);
    }
  }
  return f;
}
// 여덟 이웃 가운데 가장 가파르게 낮아지는 칸으로 한 칸씩 내려간다. stop(i, j)가 참이 되면 멈춘다.
export function flowPath(f, [x, y], stop, max = 2000) {
  let i = Math.round(x), j = Math.round(y);
  const out = [[i, j]];
  for (let n = 0; n < max && !stop(i, j); n++) {
    const k = idx(i, j);
    let bi = -1, bj = -1, bs = 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      if (!a && !b) continue;
      const u = i + a, v = j + b;
      if (u < 0 || v < 0 || u >= N || v >= N) continue;
      const s = (f[k] - f[idx(u, v)]) / Math.hypot(a, b);
      if (s > bs) { bs = s; bi = u; bj = v; }
    }
    if (bi < 0) break;
    i = bi; j = bj;
    out.push([i, j]);
  }
  return out;
}
export const pathLength = line => line.reduce((s, p, n) => (n ? s + Math.hypot(p[0] - line[n - 1][0], p[1] - line[n - 1][1]) * CELL : 0), 0);

// 선을 따라 점마다 반지름 r[n]칸 안을 표시한다.
function stampPath(line, mark, r) {
  for (let n = 0; n < line.length; n++) {
    const [x0, y0] = line[n], [x1, y1] = line[Math.min(n + 1, line.length - 1)], rr = typeof r === 'function' ? r(n) : r;
    for (let q = 0; q <= 3; q++) {
      const x = x0 + ((x1 - x0) * q) / 3, y = y0 + ((y1 - y0) * q) / 3;
      for (let b = -Math.ceil(rr); b <= Math.ceil(rr); b++) for (let a = -Math.ceil(rr); a <= Math.ceil(rr); a++) {
        const i = Math.round(x) + a, j = Math.round(y) + b;
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        if (Math.hypot(i - x, j - y) <= rr) mark[idx(i, j)] = 1;
      }
    }
  }
  return mark;
}

// r칸 안의 가운데 값. 약 30m 자료의 점 오차에 흔들리지 않게 땅 높이를 잰다.
export function medianHeight(h, x, y, r = 2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (i >= 0 && j >= 0 && i < N && j < N) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

export function buildBiseul(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const sh = blur(h, 2, 2);
  const filled = fillDepressions(h);

  // OSM 돌무더기와 맨바위 윤곽 그대로
  const scree = new Uint8Array(N * N), bare = new Uint8Array(N * N), upper = new Uint8Array(N * N), lower = new Uint8Array(N * N);
  for (const p of SCREE) fillPolygon(p, scree);
  for (const p of BARE_ROCK) fillPolygon(p, bare);
  for (const p of UPPER) fillPolygon(p, upper);
  for (const p of LOWER) fillPolygon(p, lower);

  // 줄기: 대견사에서 가장 가까운 윗무리 돌무더기 칸에서 물이 흘러내리는 길을 따라, 아랫무리 돌무더기의 서쪽 끝을 지날 때까지 내려간다.
  const [dx, dy] = OSM_PLACES['대견사'];
  let start = null, bd = Infinity;
  for (let k = 0; k < N * N; k++) if (upper[k]) { const d = Math.hypot((k % N) - dx, ((k / N) | 0) - dy); if (d < bd) { bd = d; start = [k % N, (k / N) | 0]; } }
  const lowerWest = Math.min(...LOWER.flat().map(p => p[0]));
  const trunk = flowPath(filled, start, i => i <= Math.floor(lowerWest));
  // 띠 폭: 둘레 8칸 안에 OSM 돌무더기가 많은 곳(윗무리)은 넓게(지름 약 7칸, 80m), 적은 곳도 지름 약 4~5칸(50m)으로 그린다.
  const near = trunk.map(([i, j]) => { let c = 0; for (let b = -8; b <= 8; b++) for (let a = -8; a <= 8; a++) { const u = i + a, v = j + b; if (u >= 0 && v >= 0 && u < N && v < N && scree[idx(u, v)]) c++; } return c; });
  const width = near.map(c => 2.1 + 1.1 * clamp(c / 50));
  const band = new Uint8Array(N * N);
  stampPath(trunk, band, n => width[n]);
  // 갈래: 윗무리 돌무더기마다 가장 높은 칸에서 흘러내려 줄기와 만날 때까지 좁게(지름 약 3칸) 잇는다.
  const branches = [];
  for (const p of UPPER) {
    const one = fillPolygon(p, new Uint8Array(N * N));
    let top = null, th = -Infinity;
    for (let k = 0; k < N * N; k++) if (one[k] && h[k] > th) { th = h[k]; top = [k % N, (k / N) | 0]; }
    const line = flowPath(filled, top, (i, j) => band[idx(i, j)] === 1, 40);
    if (band[idx(...line.at(-1))]) { branches.push(line); stampPath(line, band, 1.2); }
  }
  const block = new Uint8Array(N * N);
  let screeCells = 0, bandCells = 0, blockCells = 0, screeCovered = 0;
  for (let k = 0; k < N * N; k++) {
    if (scree[k]) screeCells++;
    if (band[k]) bandCells++;
    block[k] = scree[k] || band[k] ? 1 : 0;
    if (block[k]) blockCells++;
    if (scree[k] && block[k]) screeCovered++;
  }

  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4), splatC = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  const slope = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const s = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    slope[k] = s;
    // 바위 띠와 맨바위에는 나무를 심지 않는다. 그 밖에는 아주 가파른 비탈만 바위가 드러난 것으로 칠한다.
    const rock = block[k] || bare[k] ? 1 : 0;
    const rocky = Math.max(rock, smooth(0.8, 1.2, s));
    const fo = clamp(1 - rocky);
    splatA[k * 4 + 3] = fo * 255;
    // 셋째 판 빨강: 암괴류 바위 띠(회색 바위빛을 덧칠한다)
    splatC[k * 4] = block[k] * 255; splatC[k * 4 + 3] = 255;
    forest[k] = fo;
    mountain[k] = 1;
  }
  return {
    h, sh, filled, slope, scree, bare, upper, lower, band, block, trunk, branches, width, start, mountain,
    stage: { h, splatA, splatB, splatC, forest, water, total },
    stats: {
      screeCells, bandCells, blockCells, screeCovered,
      trunkM: Math.round(pathLength(trunk)),
      trunkTop: Math.round(medianHeight(h, ...trunk[0], 1)),
      trunkBottom: Math.round(medianHeight(h, ...trunk.at(-1), 1)),
      trunkStart: trunk[0], trunkEnd: trunk.at(-1),
      widthM: [Math.round(Math.min(...width) * 2 * CELL), Math.round(Math.max(...width) * 2 * CELL)],
      blockHa: +(blockCells * CELL * CELL / 1e4).toFixed(1),
      branches: branches.length,
    },
  };
}

// 골짜기 바닥인지: 길 방향에 수직으로 양쪽 d칸 떨어진 땅이 모두 더 높으면 골짜기 안이다.
export function inValley(h, line, n, d = 8) {
  const a = line[Math.max(0, n - 2)], b = line[Math.min(line.length - 1, n + 2)], [i, j] = line[n];
  const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1, px = -ty / L, py = tx / L;
  const z = sampleH(h, i, j);
  return sampleH(h, i + px * d, j + py * d) > z + 3 && sampleH(h, i - px * d, j - py * d) > z + 3;
}

// 단면: 대견사에서 줄기 꼭대기로 곧게 내려와, 줄기(암괴류)를 따라 내려간 뒤, 같은 골짜기를 따라 휴양림 쪽으로 약 500m 더 내려간다.
// 높이는 그 자리 둘레 3칸 × 3칸의 가운데 값이다.
export function blockProfile(sim, step = 0.5) {
  const [dx, dy] = OSM_PLACES['대견사'];
  const tail = flowPath(sim.filled, sim.trunk.at(-1), () => false, Math.round(500 / CELL)).slice(1);
  const pts = [[dx, dy], ...sim.trunk, ...tail];
  const out = [];
  let m = 0;
  for (let n = 0; n < pts.length - 1; n++) {
    const [x0, y0] = pts[n], [x1, y1] = pts[n + 1], L = Math.hypot(x1 - x0, y1 - y0), s = Math.max(1, Math.round(L / step));
    for (let q = 0; q < s; q++) {
      const x = x0 + ((x1 - x0) * q) / s, y = y0 + ((y1 - y0) * q) / s;
      out.push({ m: m + (q / s) * L * CELL, x, y, z: medianHeight(sim.h, x, y, 1), rock: sim.block[idx(Math.round(x), Math.round(y))] === 1, trunk: n >= 1 && n < sim.trunk.length });
    }
    m += L * CELL;
  }
  const [x, y] = pts.at(-1);
  out.push({ m, x, y, z: medianHeight(sim.h, x, y, 1), rock: sim.block[idx(Math.round(x), Math.round(y))] === 1, trunk: false });
  return out;
}
const deg = (dz, dm) => Math.round((Math.atan2(dz, dm) * 180) / Math.PI);
// 단면의 수치: 바위 구간의 위아래 끝 높이와 길이, 위쪽 반과 아래쪽 반의 평균 경사(도), 100m 사이 가장 급한 경사(도)
export function profileNumbers(points) {
  const rock = points.filter(p => p.trunk), top = rock[0], bot = rock.at(-1), mid = rock[rock.length >> 1];
  let steep = 0;
  for (let a = 0; a < rock.length; a++) for (let b = a + 1; b < rock.length; b++) if (rock[b].m - rock[a].m >= 100) { steep = Math.max(steep, deg(rock[a].z - rock[b].z, rock[b].m - rock[a].m)); break; }
  return {
    top: top.z, bottom: bot.z, startM: top.m, endM: bot.m, rockKm: (bot.m - top.m) / 1000,
    upperDeg: deg(top.z - mid.z, mid.m - top.m), lowerDeg: deg(mid.z - bot.z, bot.m - mid.m), allDeg: deg(top.z - bot.z, bot.m - top.m), steepDeg: steep,
    lengthKm: points.at(-1).m / 1000, end: points.at(-1).z, temple: points[0].z,
  };
}
// 단면 위 표시: 바위 띠의 위 끝과 아래 끝, 위쪽과 아래쪽 경사, 휴양림 쪽(끝). 대견사(처음)는 단면 제목의 A로 적는다.
export function profileMarks(points) {
  const n = profileNumbers(points);
  const first = points.findIndex(p => p.trunk), last = points.length - 1 - [...points].reverse().findIndex(p => p.trunk);
  const q1 = Math.round(first + (last - first) * 0.25), q3 = Math.round(first + (last - first) * 0.75);
  return [
    { at: first, text: `암괴류 위 끝 약 ${Math.round(n.top / 10) * 10}m`, color: '#d9dcdf' },
    { at: q1, text: `경사 약 ${n.upperDeg}도`, color: '#ffe9b0' },
    { at: q3, text: `경사 약 ${n.lowerDeg}도`, color: '#ffe9b0' },
    { at: last, text: `아래 끝 약 ${Math.round(n.bottom / 10) * 10}m`, color: '#d9dcdf' },
    { at: points.length - 1, text: '휴양림 쪽', color: '#b9e0f5' },
  ];
}

// 이름표 자리. 암괴류 이름표는 줄기 위쪽 3분의 1 자리(띠가 가장 넓은 윗무리 아래)에 붙인다.
export function placesOf(sim) {
  const peak = (name, sub) => ({ name, sub: `${PEAKS[name][2].toLocaleString('en-US')}m${sub ? `, ${sub}` : ''}`, grid: PEAKS[name].slice(0, 2), peak: true });
  return {
    stream: { name: '암괴류', sub: '바위가 골짜기를 따라 길게 이어진 곳', grid: sim.trunk[Math.round(sim.trunk.length * 0.35)] },
    temple: { name: '대견사', sub: '', grid: OSM_PLACES['대견사'], village: true },
    forest: { name: '비슬산 자연휴양림', sub: '', grid: OSM_PLACES['비슬산자연휴양림'], village: true },
    saw: { name: '톱바위', sub: '', grid: ROCKS['톱바위'][0], village: true },
    cheonwang: peak('천왕봉', '비슬산 정상'),
    johwa: peak('조화봉'),
    daegyeon: peak('대견봉'),
  };
}
