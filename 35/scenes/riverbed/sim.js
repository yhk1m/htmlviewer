// © 2026 김용현
// 회룡포 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 내성천 물 넓이와 모래톱, 다리, 전망대, 마을, 산봉우리 자리는 OpenStreetMap 자료에서 옮겼다.
// 고도 자료는 땅 높이뿐이라 물속 깊이를 알 수 없다. 소와 여울 자리는 물길이 굽은 모양으로 짐작한 예시다.
// 물 면 높이는 물 넓이 안의 고도 자료를 물길을 따라 고르게 다듬어, 아래쪽으로 갈수록 높아지지 않게 정한 값이다.
import { RIVER, WATER, SAND, BRIDGES, PLACES as OSM_PLACES, VILLAGE, PEAKS, POOL_GUESS, RIFFLE_GUESS } from './hoeryongpo-osm.js';

export const N = 512;
export const SIZE = 4000;
export const SITE = { lat: 36.58, lon: 128.32, km: 4 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
export { RIVER, SAND, BRIDGES, PEAKS, POOL_GUESS, RIFFLE_GUESS };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;
const inside = (i, j) => i >= 0 && j >= 0 && i < N && j < N;

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
// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다). 창 밖으로 나간 꼭짓점이 있어도 창 안 칸만 칠한다.
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
// r칸 안의 가운데 값. 약 30m 자료의 점 오차에 흔들리지 않게 땅 높이를 잰다.
export function medianHeight(h, x, y, r = 2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (inside(i, j)) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

// 물길 가운데 줄을 한 칸 간격 점으로 다시 찍는다. m은 흐르는 방향으로 잰 거리(m)다.
export function resample(line, step = 1) {
  const out = [];
  let m = 0;
  for (let n = 0; n < line.length - 1; n++) {
    const [x0, y0] = line[n], [x1, y1] = line[n + 1], L = Math.hypot(x1 - x0, y1 - y0), s = Math.max(1, Math.round(L / step));
    for (let q = 0; q < s; q++) out.push({ x: x0 + ((x1 - x0) * q) / s, y: y0 + ((y1 - y0) * q) / s, m: m + (q / s) * L * CELL });
    m += L * CELL;
  }
  out.push({ x: line.at(-1)[0], y: line.at(-1)[1], m });
  return out;
}

// 물길의 굽은 정도: 앞뒤 d칸 떨어진 두 점과 이루는 꺾인 각(도). 양수는 왼쪽(흐르는 방향 기준)으로, 음수는 오른쪽으로 돈다.
// 화면 격자는 세로가 남쪽으로 늘어나므로, 지도에서 왼쪽으로 도는 것은 격자 계산에서 외적의 부호가 반대다.
export function turnAt(pts, n, d = 12) {
  const a = pts[Math.max(0, n - d)], b = pts[n], c = pts[Math.min(pts.length - 1, n + d)];
  const ux = b.x - a.x, uy = b.y - a.y, vx = c.x - b.x, vy = c.y - b.y;
  const cross = ux * vy - uy * vx, dot = ux * vx + uy * vy;
  return (-Math.atan2(cross, dot) * 180) / Math.PI;
}
// 점에서 가장 가까운 가운데 줄 점의 번호
export function nearestOn(pts, [x, y]) {
  let best = 0, bd = Infinity;
  for (let n = 0; n < pts.length; n++) { const d = (pts[n].x - x) ** 2 + (pts[n].y - y) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
// 점이 물길의 어느 쪽에 있는지: 흐르는 방향을 보고 왼쪽이면 1, 오른쪽이면 -1(지도 기준)
export function sideOf(pts, [x, y]) {
  const n = nearestOn(pts, [x, y]), a = pts[Math.max(0, n - 2)], b = pts[Math.min(pts.length - 1, n + 2)];
  const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
  return cross < 0 ? 1 : -1;
}

export function buildHoeryongpo(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const sh = blur(h, 2, 2);

  // OSM 물 넓이와 모래톱 윤곽 그대로. 모래톱과 겹치는 칸은 모래톱으로 본다.
  const river = fillPolygon(WATER, new Uint8Array(N * N));
  const sand = new Uint8Array(N * N);
  for (const p of SAND) fillPolygon(p, sand);
  for (let k = 0; k < N * N; k++) if (sand[k]) river[k] = 0;

  // 물 면 높이: 가운데 줄 점마다 둘레 6칸 안 물 칸 높이의 아래쪽 30% 값을 재고(물 위 자료는 들쭉날쭉해 높게 튀는 값이 많다), 앞뒤 약 300m를 고르게 한 뒤 아래쪽으로 갈수록 높아지지 않게 한다.
  const line = resample(RIVER);
  const raw = line.map(p => {
    const v = [];
    for (let b = -6; b <= 6; b++) for (let a = -6; a <= 6; a++) {
      const i = Math.round(p.x) + a, j = Math.round(p.y) + b;
      if (inside(i, j) && river[idx(i, j)]) v.push(h[idx(i, j)]);
    }
    v.sort((x, y) => x - y);
    return v.length ? v[Math.floor(v.length * 0.3)] : NaN;
  });
  let last = raw.find(v => !Number.isNaN(v));
  for (let n = 0; n < raw.length; n++) { if (Number.isNaN(raw[n])) raw[n] = last; else last = raw[n]; }
  const W = Math.round(300 / CELL);
  const level = raw.map((_, n) => { let s = 0, c = 0; for (let q = Math.max(0, n - W); q <= Math.min(raw.length - 1, n + W); q++) { s += raw[q]; c++; } return s / c; });
  for (let n = 1; n < level.length; n++) level[n] = Math.min(level[n], level[n - 1]);
  line.forEach((p, n) => { p.level = level[n]; });

  // 물 칸과 모래톱 칸마다 가장 가까운 가운데 줄 점의 물 면 높이를 준다.
  const surface = new Float32Array(N * N).fill(NaN);
  const near = line.filter(p => p.x > -10 && p.y > -10 && p.x < N + 10 && p.y < N + 10);
  for (let k = 0; k < N * N; k++) if (river[k] || sand[k]) surface[k] = near[nearestOn(near, [k % N, (k / N) | 0])].level;
  // 다른 칸은 가장 가까운 물 칸의 물 면 높이와 거리(칸)를 넓혀 가며 찾는다(네 이웃 넓이 우선 찾기).
  const dist = new Int32Array(N * N).fill(-1), riverLv = new Float32Array(N * N), queue = new Int32Array(N * N);
  let head = 0, tail = 0;
  for (let k = 0; k < N * N; k++) if (river[k]) { dist[k] = 0; riverLv[k] = surface[k]; queue[tail++] = k; }
  while (head < tail) {
    const k = queue[head++], i = k % N, j = (k / N) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + a, y = j + b;
      if (!inside(x, y)) continue;
      const q = idx(x, y);
      if (dist[q] >= 0) continue;
      dist[q] = dist[k] + 1; riverLv[q] = riverLv[k]; queue[tail++] = q;
    }
  }

  // 화면에 그리는 땅 높이: 물 칸은 물 면 아래 1.5m로 고르게 낮춰 물 면이 깨끗하게 보이게 하고(실제 깊이가 아님),
  // 모래톱은 물 면보다 0.8m에서 2.5m까지 높게 둔다. 약 30m 자료는 물가에서 들쭉날쭉해, 강가 땅이 물 면보다 낮게 나오거나 모래톱 바로 옆 한 칸만 솟기도 한다.
  // 그래서 물 면보다 낮게 나온 강가 땅은 물 면 위 0.5m까지 올리고, 모래톱에서 6칸(약 47m) 안의 땅은 모래톱에서 멀어질수록 칸마다 2m씩만 높아지게 다듬는다. 그 밖은 고도 자료 그대로다.
  const show = Float32Array.from(h);
  const sandDist = new Int32Array(N * N).fill(-1);
  head = 0; tail = 0;
  for (let k = 0; k < N * N; k++) if (sand[k]) { sandDist[k] = 0; queue[tail++] = k; }
  while (head < tail) {
    const k = queue[head++], i = k % N, j = (k / N) | 0;
    if (sandDist[k] >= 6) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + a, y = j + b;
      if (!inside(x, y)) continue;
      const q = idx(x, y);
      if (sandDist[q] >= 0 || river[q]) continue;
      sandDist[q] = sandDist[k] + 1; queue[tail++] = q;
    }
  }
  for (let k = 0; k < N * N; k++) {
    if (river[k]) show[k] = Math.min(h[k], surface[k] - 1.5);
    else if (sand[k]) show[k] = clamp(h[k], surface[k] + 0.8, surface[k] + 2.5);
    else {
      if (dist[k] < 40) show[k] = Math.max(show[k], riverLv[k] + 0.5);
      if (sandDist[k] > 0) show[k] = Math.min(show[k], riverLv[k] + 2.5 + 2 * sandDist[k]);
    }
  }

  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  let waterCells = 0, sandCells = 0, farmCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const wet = river[k] ? 1 : 0, sd = sand[k] ? 1 : 0;
    const rel = h[k] - riverLv[k];
    // 강가 낮고 평평한 땅은 논밭, 물가 바로 옆 띠는 풀밭, 가파른 비탈은 맨바위, 나머지는 숲으로 칠한 예시다.
    const flat = 1 - smooth(0.08, 0.16, slope), low = 1 - smooth(10, 22, rel);
    const bank = (1 - smooth(2, 4, dist[k])) * (1 - wet) * (1 - sd);
    const farm = flat * low * (1 - wet) * (1 - sd) * (1 - bank);
    const grass = clamp(bank + (1 - flat) * low * 0.6 * (1 - wet) * (1 - sd));
    const rocky = smooth(0.9, 1.3, slope);
    const fo = clamp(1 - rocky - farm - grass - wet - sd);
    splatA[k * 4] = 0; splatA[k * 4 + 1] = 0; splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    // 모래톱은 B 채널 파랑(모래 양)으로 칠한다. 땅 재질 무게가 비어 있으면 바위로 칠해지므로 자갈 무게를 조금 준다.
    if (sd) splatA[k * 4] = 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255; splatB[k * 4 + 2] = sd * 255;
    forest[k] = fo; water[k] = wet;
    mountain[k] = 1 - flat * low;
    if (wet) waterCells++;
    if (sd) sandCells++;
    if (farm > 0.5) farmCells++;
  }

  // 물길을 따라 잰 굽은 정도
  const turn = line.map((_, n) => turnAt(line, n));
  return {
    h, sh, show, river, sand, surface, riverLv, dist, line, turn, mountain,
    stage: { h: show, splatA, splatB, forest, water, total },
    stats: {
      waterCells, sandCells, farmCells,
      waterHa: Math.round(waterCells * CELL * CELL / 1e4),
      sandHa: +(sandCells * CELL * CELL / 1e4).toFixed(1),
      levelTop: +level[0].toFixed(1), levelEnd: +level.at(-1).toFixed(1),
      riverKm: +(line.at(-1).m / 1000).toFixed(1),
    },
  };
}

// 소와 여울의 예시 자리. 소는 굽이 바깥쪽 물가로 약 40m(5칸) 옮기고, 여울은 굽이 사이 물길 가운데에 둔다.
// 바깥쪽은 물길이 도는 쪽(굽은 정도의 부호)의 반대편이다. 옮긴 자리가 물 밖이면 물 안에 들 때까지 덜 옮긴다.
export function guessSpots(sim) {
  const pts = sim.line;
  const pool = POOL_GUESS.map(g => {
    const n = nearestOn(pts, g), a = pts[Math.max(0, n - 3)], b = pts[Math.min(pts.length - 1, n + 3)];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, tx = (b.x - a.x) / L, ty = (b.y - a.y) / L;
    // 굽이가 가장 센 곳의 부호로 도는 쪽을 정한다.
    let peak = 0;
    for (let q = Math.max(0, n - 40); q <= Math.min(pts.length - 1, n + 40); q++) if (Math.abs(sim.turn[q]) > Math.abs(peak)) peak = sim.turn[q];
    // 지도 기준 왼쪽 법선은 격자에서 (ty, -tx)다. 왼쪽으로 돌면 바깥은 오른쪽이다.
    const s = peak > 0 ? -1 : 1, nx = ty * s, ny = -tx * s;
    for (let d = 5; d >= 0; d--) {
      const x = pts[n].x + nx * d, y = pts[n].y + ny * d;
      if (sim.river[idx(Math.round(x), Math.round(y))]) return { grid: [x, y], turn: peak, outer: s > 0 ? 'right' : 'left' };
    }
    return { grid: [pts[n].x, pts[n].y], turn: peak, outer: s > 0 ? 'right' : 'left' };
  });
  const riffle = RIFFLE_GUESS.map(g => { const n = nearestOn(pts, g); return { grid: [pts[n].x, pts[n].y], turn: sim.turn[n] }; });
  return { pool, riffle };
}

// 단면: 회룡대 전망대에서 마을 가운데 쪽으로 곧게 그어, 물길을 두 번 건넌 뒤 건너편 강가 너머 약 150m까지 간다.
// 높이는 물 칸이면 물 면 높이, 아니면 3D 화면에 그린 높이(물가만 다듬은 고도 자료)의 둘레 3칸 곱하기 3칸 가운데 값이다.
export function crossProfile(sim, step = 0.5) {
  const [ax, ay] = OSM_PLACES['회룡대'], [vx, vy] = VILLAGE;
  const L = Math.hypot(vx - ax, vy - ay), dx = (vx - ax) / L, dy = (vy - ay) / L;
  const out = [];
  let crossings = 0, wasWater = false, endAt = Infinity;
  for (let t = 0; t <= 400; t += step) {
    const x = ax + dx * t, y = ay + dy * t, k = idx(Math.round(x), Math.round(y));
    if (!inside(Math.round(x), Math.round(y)) || t > endAt) break;
    const isWater = sim.river[k] === 1, isSand = sim.sand[k] === 1;
    if (isWater && !wasWater) crossings++;
    if (!isWater && wasWater && crossings >= 2 && endAt === Infinity) endAt = t + 150 / CELL;
    wasWater = isWater;
    out.push({ m: t * CELL, x, y, z: isWater ? sim.surface[k] : medianHeight(sim.show, x, y, 1), kind: isWater ? 'water' : isSand ? 'sand' : 'land', crossing: crossings });
  }
  return out;
}
// 단면의 수치: 회룡대 높이, 첫째 물 면, 마을의 가장 높은 곳, 둘째 물 면, 건너는 물길 폭(m)
export function profileNumbers(points) {
  const runs = [];
  for (let n = 0; n < points.length; n++) {
    if (points[n].kind !== 'water') continue;
    if (!runs.length || runs.at(-1).end !== n - 1) runs.push({ start: n, end: n }); else runs.at(-1).end = n;
  }
  const [w1, w2] = runs;
  const village = points.slice(w1.end + 1, w2.start).filter(p => p.kind === 'land');
  const top = village.reduce((a, p) => (p.z > a.z ? p : a), village[0]);
  const zs = village.map(p => p.z).sort((a, b) => a - b);
  return {
    villageMid: zs[zs.length >> 1],
    view: points[0].z, water1: points[w1.start].z, water2: points[w2.start].z,
    width1: Math.round(points[w1.end].m - points[w1.start].m), width2: Math.round(points[w2.end].m - points[w2.start].m),
    villageTop: top.z, villageAbove: top.z - points[w2.start].z,
    sand: points.some(p => p.kind === 'sand'), runs, lengthKm: points.at(-1).m / 1000, end: points.at(-1).z,
  };
}
export function profileMarks(points) {
  const n = profileNumbers(points), [w1, w2] = n.runs;
  const villageMid = Math.round((w1.end + w2.start) / 2);
  const sandAt = points.findIndex(p => p.kind === 'sand');
  const marks = [
    { at: 0, text: `회룡대 전망대 약 ${Math.round(n.view / 10) * 10}m`, color: '#f3e3b0' },
    { at: Math.round((w1.start + w1.end) / 2), text: '내성천', color: '#9fd3ff' },
  ];
  if (sandAt >= 0 && sandAt < villageMid) marks.push({ at: sandAt, text: '모래톱', color: '#f1dfaa' });
  marks.push({ at: villageMid, text: '회룡포 마을', color: '#e8e6dd' });
  marks.push({ at: Math.round((w2.start + w2.end) / 2), text: '내성천', color: '#9fd3ff' });
  marks.push({ at: points.length - 1, text: '건너편 강가', color: '#e8e6dd' });
  return marks.sort((a, b) => a.at - b.at);
}

// 다리의 가운데 자리
export function middle(line) {
  const pts = resample(line, 0.25);
  return [pts[pts.length >> 1].x, pts[pts.length >> 1].y];
}

// 이름표 자리. 모래톱 이름표는 마을 쪽 모래톱 안에서 가운데 줄에서 가장 먼 칸에 붙인다.
export function placesOf(sim) {
  let sandGrid = null, far = -1;
  const one = fillPolygon(SAND[0], new Uint8Array(N * N));
  for (let k = 0; k < N * N; k++) if (one[k] && sim.sand[k]) {
    const i = k % N, j = (k / N) | 0, n = nearestOn(sim.line, [i, j]), d = Math.hypot(sim.line[n].x - i, sim.line[n].y - j);
    if (d > far) { far = d; sandGrid = [i, j]; }
  }
  // 내성천 이름표: 마을 남쪽을 지나는 물길 위
  const riverAt = sim.line[nearestOn(sim.line, [300, 352])];
  const out = {
    village: { name: '회룡포 마을', sub: '물길이 감싸 도는 마을', grid: VILLAGE },
    view: { name: '회룡대 전망대', sub: '', grid: OSM_PLACES['회룡대'], village: true },
    biryong: { name: '비룡산', sub: '회룡대가 있는 산', grid: PEAKS['비룡산'].slice(0, 2), peak: true },
    river: { name: '내성천', sub: '', grid: [riverAt.x, riverAt.y], water: true },
    sand: { name: '모래톱', sub: '굽이 안쪽', grid: sandGrid },
    bridge1: { name: '제1뿅뿅다리', sub: '', grid: middle(BRIDGES['제1뿅뿅다리']), village: true },
    bridge2: { name: '제2뿅뿅다리', sub: '', grid: middle(BRIDGES['제2뿅뿅다리']), village: true },
    daeeun: { name: '대은리', sub: '', grid: OSM_PLACES['대은리'], village: true },
    hyangseok: { name: '향석리', sub: '', grid: OSM_PLACES['향석리'], village: true },
  };
  const spots = guessSpots(sim);
  spots.pool.forEach((g, n) => { out[`pool${n}`] = { name: '소(짐작한 예시)', sub: '굽이 바깥', grid: g.grid, guess: 'pool' }; });
  spots.riffle.forEach((g, n) => { out[`riffle${n}`] = { name: '여울(짐작한 예시)', sub: '굽이 사이', grid: g.grid, guess: 'riffle' }; });
  return out;
}
