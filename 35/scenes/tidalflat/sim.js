// © 2026 김용현
// 순천만 실제 지형 화면의 재료. 땅 높이만 실제 자료이고, 해안선과 갯벌 일부, 갈대밭, 하천의 자리는 OpenStreetMap 자료에서 옮겼다.
// 고도 자료에는 물속 바닥이 없어 갯벌 면은 밀물 때 해수면 바로 아래에 정한 높이로 그린다. 작은 갯골과 논밭, 숲은 규칙으로 만든 예시다.
import { TIDALFLATS, REEDBED, RIVER_AREA, ISACHEON, HAERYONG, COAST, PLACES as OSM_PLACES } from './suncheon-osm.js';

export const N = 512;
export const SIZE = 9000;
export const SITE = { lat: 34.862, lon: 127.505, km: 9 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 그리기용 수면 높이(m). 실제 조위가 아니라 갯벌이 잠기고 드러나는 모습을 보이기 위해 정한 값이다.
export const HIGH_WATER = 0.6;
export const LOW_WATER = -1.4;
export const LAND_MIN = 0.9; // 육지는 밀물 때 수면보다 높게 그린다(둑과 논이 물에 잠겨 보이지 않게).
export const REED_LEVEL = 0.7; // 갈대밭은 밀물 때 수면보다 조금 높게 그린다.
// 만 어귀: 서쪽 곶과 동쪽 곶을 잇는 선. 이 선 안쪽의 얕은 바다를 썰물 때 드러나는 갯벌로 칠한다(해안선 자료에서 고른 예시).
export const BAY_LINE = [[150, 396], [356, 368]];
// 단면: 북쪽 들판에서 갯벌과 갯골을 지나 만 어귀 바다까지.
export const PROFILE = { a: [190, 150], b: [320, 440] };
export const SEA_SPOT = [262, 412];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(k, v) {
    const K = this.k, V = this.v; let n = K.length; K.push(k); V.push(v);
    while (n) { const p = (n - 1) >> 1; if (V[p] <= v) break; K[n] = K[p]; V[n] = V[p]; n = p; }
    K[n] = k; V[n] = v;
  }
  pop() {
    const K = this.k, V = this.v, top = [K[0], V[0]], k = K.pop(), v = V.pop(), L = K.length;
    if (L) {
      let n = 0;
      for (;;) { let c = 2 * n + 1; if (c >= L) break; if (c + 1 < L && V[c + 1] < V[c]) c++; if (V[c] >= v) break; K[n] = K[c]; V[n] = V[c]; n = c; }
      K[n] = k; V[n] = v;
    }
    return top;
  }
}
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;

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
// 경유점을 모두 지나는 매끈한 선(Catmull-Rom)
function spline(way) {
  const out = [];
  for (let n = 0; n < way.length - 1; n++) {
    const a = way[Math.max(0, n - 1)], b = way[n], c = way[n + 1], d = way[Math.min(way.length - 1, n + 2)];
    const steps = Math.max(1, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 2));
    for (let q = 0; q < steps; q++) {
      const t = q / steps, t2 = t * t, t3 = t2 * t;
      const at = v => 0.5 * (2 * b[v] + (c[v] - a[v]) * t + (2 * a[v] - 5 * b[v] + 4 * c[v] - d[v]) * t2 + (3 * b[v] - a[v] - 3 * c[v] + d[v]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(way[way.length - 1]);
  return out;
}
// 같은 칸은 늘 같은 값을 주는 매끈한 잡음(-1~1)
function hash(i, j, s) { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return (a * (1 - su) * (1 - sv) + b * su * (1 - sv) + c * (1 - su) * sv + d * su * sv) * 2 - 1;
}
const fbm = (x, y) => noise(x / 40, y / 40, 1) * 0.45 + noise(x / 16, y / 16, 2) * 0.35 + noise(x / 7, y / 7, 3) * 0.2;
// 만 어귀 선에서 북쪽(안쪽)으로 몇 칸인지. 음수면 어귀 바깥이다.
export function bayDepth(i, j) {
  const [[x0, y0], [x1, y1]] = BAY_LINE, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  return ((i - x0) * dy - (j - y0) * dx) / L;
}
// 바다 쪽 칸: 해안선(진행 방향 오른쪽이 바다)을 창 남쪽 바깥으로 돌려 닫아 안쪽을 칠한다.
function seaSide() {
  const last = COAST.at(-1), poly = [...COAST, [last[0], N + 300], [-80, N + 300], [-80, COAST[0][1]], COAST[0]];
  return fillPolygon(poly, new Uint8Array(N * N));
}
// 바다 칸에서 가장 가까운 육지까지의 거리(칸). 8방향으로 번져 잰다.
function distanceToLand(sea) {
  const d = new Float32Array(N * N).fill(1e9);
  for (let k = 0; k < N * N; k++) if (!sea[k]) d[k] = 0;
  const D = Math.SQRT2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    if (i > 0) d[k] = Math.min(d[k], d[k - 1] + 1);
    if (j > 0) { d[k] = Math.min(d[k], d[k - N] + 1); if (i > 0) d[k] = Math.min(d[k], d[k - N - 1] + D); if (i < N - 1) d[k] = Math.min(d[k], d[k - N + 1] + D); }
  }
  for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
    const k = idx(i, j);
    if (i < N - 1) d[k] = Math.min(d[k], d[k + 1] + 1);
    if (j < N - 1) { d[k] = Math.min(d[k], d[k + N] + 1); if (i < N - 1) d[k] = Math.min(d[k], d[k + N + 1] + D); if (i > 0) d[k] = Math.min(d[k], d[k + N - 1] + D); }
  }
  return d;
}
// 선에서 반지름 r칸 안을 표시한다.
function stamp(path, mark, r, keep = () => true, value = 1) {
  for (const [x, y] of path) for (let b = -Math.ceil(r); b <= Math.ceil(r); b++) for (let a = -Math.ceil(r); a <= Math.ceil(r); a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (i < 0 || j < 0 || i >= N || j >= N) continue;
    const k = idx(i, j);
    if (Math.hypot(i - x, j - y) <= r && keep(k)) mark[k] = Math.max(mark[k], value);
  }
  return mark;
}

export function buildSuncheon(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const reed = fillPolygon(REEDBED, new Uint8Array(N * N));
  const osmFlat = new Uint8Array(N * N);
  for (const p of TIDALFLATS) fillPolygon(p, osmFlat);
  const riverArea = fillPolygon(RIVER_AREA, new Uint8Array(N * N));
  const side = seaSide(), sea = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) if ((side[k] || osmFlat[k]) && !reed[k]) sea[k] = 1;
  const dLand = distanceToLand(sea);
  // 하천: 이사천과 해룡천 선. 이사천은 만 안으로 이어지는 큰 물길(갯골)이 된다. 바다로 갈수록 넓어진다.
  const river = new Uint8Array(N * N), channel = new Uint8Array(N * N), bank = new Float32Array(N * N);
  stamp(spline(HAERYONG), river, 1.3, k => !sea[k]);
  // 자료의 이사천 선은 만 가운데쯤에서 끝난다. 그 뒤 썰물 때 물가까지 이어지는 부분은 예시로 그린다.
  const MAIN = [...ISACHEON, [238.5, 300], [235, 322], [238, 345], [244, 372]];
  for (const [x, y] of spline(MAIN)) {
    const k0 = idx(clamp(Math.round(x), 0, N - 1), clamp(Math.round(y), 0, N - 1));
    if (!sea[k0]) { stamp([[x, y]], river, 1.4, k => !sea[k]); continue; }
    // 물길 가운데는 깊고 가장자리로 갈수록 얕아진다(둑 비탈).
    const r = 1.1 + 1.5 * smooth(120, 300, y), R = r + 2.5;
    for (let b = -Math.ceil(R); b <= Math.ceil(R); b++) for (let a = -Math.ceil(R); a <= Math.ceil(R); a++) {
      const i = Math.round(x) + a, j = Math.round(y) + b;
      if (i < 0 || j < 0 || i >= N || j >= N || !sea[idx(i, j)]) continue;
      const v = smooth(R, r - 0.6, Math.hypot(i - x, j - y));
      if (v > bank[idx(i, j)]) bank[idx(i, j)] = v;
    }
  }
  for (let k = 0; k < N * N; k++) if (bank[k] > 0.8) channel[k] = 1;
  for (let k = 0; k < N * N; k++) if (riverArea[k] && !sea[k]) river[k] = 1;

  // 갯벌 면의 높이: 육지에서 멀수록, 만 어귀에 가까울수록 낮아진다. 실제 측량값이 아니라 정한 꼴이다.
  const z = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    if (!sea[k]) continue;
    // 어귀 선의 양 끝(곶) 바깥은 만 밖으로 친다.
    // 어귀 쪽 끝이 곧은 선으로 보이지 않게 매끈한 잡음으로 흔든다.
    const s = bayDepth(i, j) - 3 * Math.max(0, BAY_LINE[0][0] - i, i - BAY_LINE[1][0]) + 16 * noise(i / 34, j / 34, 5) + 6 * noise(i / 11, j / 11, 6);
    z[k] = 0.35 - 1.0 * smooth(0, 70, dLand[k]) - 2.4 * (1 - smooth(-12, 50, s)) + 0.2 * fbm(i, j);
    if (osmFlat[k]) z[k] = Math.max(z[k], 0.1 + 0.1 * fbm(i, j));
  }
  // 작은 갯골: 갯벌 면을 따라 물이 모이는 길(흐름 누적). 모양은 예시다.
  const exposed = k => sea[k] && !channel[k] && z[k] > LOW_WATER;
  // 물길 고르기: 물에 잠긴 곳(갯골과 썰물 때 바다)에서 시작해 낮은 칸부터 거슬러 오르며 칸마다 물을 보낼 곳을 정한다(웅덩이는 메운 셈).
  // 칸마다 작은 흔들림을 더해 곧은 줄이 생기지 않게 한다.
  const rz = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) { const i = k % N, j = (k / N) | 0; rz[k] = z[k] + 0.25 * fbm(i, j) + 0.05 * hash(i, j, 9); }
  const heap = new MinHeap(), seen = new Uint8Array(N * N), recv = new Int32Array(N * N).fill(-1), order = [];
  for (let k = 0; k < N * N; k++) if (sea[k] && !exposed(k)) {
    seen[k] = 1;
    const i = k % N, j = (k / N) | 0;
    if ((i > 0 && exposed(k - 1)) || (i < N - 1 && exposed(k + 1)) || (j > 0 && exposed(k - N)) || (j < N - 1 && exposed(k + N))) heap.push(k, channel[k] ? LOW_WATER - 1 : rz[k]);
  }
  while (heap.size) {
    const [c, fz] = heap.pop();
    if (exposed(c)) order.push(c);
    const i = c % N, j = (c / N) | 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const ii = i + a, jj = j + b;
      if ((!a && !b) || ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
      const o = idx(ii, jj);
      if (seen[o] || !exposed(o)) continue;
      seen[o] = 1; recv[o] = c;
      heap.push(o, Math.max(rz[o], fz + 1e-4));
    }
  }
  const acc = new Float32Array(N * N);
  for (let t = order.length - 1; t >= 0; t--) { const k = order[t]; acc[k] += 1; if (recv[k] >= 0 && exposed(recv[k])) acc[recv[k]] += acc[k]; }
  const creek = new Float32Array(N * N);
  for (const k of order) {
    const a = acc[k];
    if (a < 80) continue;
    const c = smooth(80, 1200, a);
    creek[k] = Math.max(creek[k], 0.45 + 0.55 * c);
    if (a > 260) { const i = k % N, j = (k / N) | 0; for (const o of [idx(Math.min(N - 1, i + 1), j), idx(i, Math.min(N - 1, j + 1))]) if (exposed(o)) creek[o] = Math.max(creek[o], 0.4 + 0.4 * c); }
  }
  for (let k = 0; k < N * N; k++) {
    if (!sea[k]) continue;
    if (bank[k] > 0) z[k] = z[k] * (1 - bank[k]) + (LOW_WATER - 0.7) * bank[k];
    if (channel[k]) continue;
    if (creek[k] > 0) z[k] -= 0.25 + 0.9 * (creek[k] - 0.4); // 큰 갯골은 썰물 때도 물이 남는다.
  }
  const flat = new Uint8Array(N * N);
  let flatCells = 0, osmFlatCells = 0, reedCells = 0, creekCells = 0;
  for (let k = 0; k < N * N; k++) {
    if (sea[k] && !channel[k] && z[k] > LOW_WATER) { flat[k] = 1; flatCells++; if (osmFlat[k]) osmFlatCells++; if (creek[k] > 0) creekCells++; }
    if (reed[k]) reedCells++;
  }

  // 그리는 높이: 바다와 갯벌은 정한 높이, 갈대밭은 밀물 수면 바로 위, 육지는 자료 높이(밀물 수면보다 높게).
  const sh = blur(h, 2, 2);
  for (let k = 0; k < N * N; k++) {
    if (sea[k]) h[k] = flat[k] || channel[k] ? z[k] : Math.min(z[k], -3);
    else if (reed[k]) h[k] = REED_LEVEL;
    else h[k] = Math.max(h[k], LAND_MIN);
  }
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4), splatC = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N), lowLand = new Uint8Array(N * N);
  let lowCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const wet = (sea[k] && !flat[k]) || river[k] ? 1 : 0, mud = flat[k], rd = reed[k];
    // 바다 가까운 낮고 평평한 땅은 논밭으로 칠한다.
    const flatLand = 1 - smooth(0.04, 0.1, slope), low = 1 - smooth(5, 12, sh[k]);
    const farm = sea[k] || rd ? 0 : flatLand * low * (1 - wet);
    if (farm > 0.5 && sh[k] < 4) { lowLand[k] = 1; lowCells++; }
    const rocky = smooth(0.6, 1.0, slope);
    const fo = sea[k] || rd ? 0 : clamp(1 - rocky - farm - wet);
    splatA[k * 4 + 3] = fo * 255;
    splatA[k * 4 + 1] = mud || rd ? 255 : 0; // 갯벌과 갈대밭의 바탕은 흙
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255;
    // 셋째 판: 빨강 갯벌, 초록 갈대, 파랑 갯골의 젖은 정도
    splatC[k * 4] = mud * 255; splatC[k * 4 + 1] = rd * 255; splatC[k * 4 + 2] = mud ? creek[k] * 255 : 0; splatC[k * 4 + 3] = 255;
    forest[k] = fo; water[k] = wet || mud ? 1 : 0;
    mountain[k] = clamp(1 - farm - wet - mud - rd);
  }
  const mapWater = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) mapWater[k] = (sea[k] && !flat[k]) || river[k] ? 1 : 0;
  return {
    h, sh, sea, flat, osmFlat, reed, river, channel, creek, lowLand, mountain, mapWater,
    stage: { h, splatA, splatB, splatC, forest, water, total },
    stats: { flatCells, osmFlatCells, reedCells, creekCells, lowCells, flatKm2: +(flatCells * CELL * CELL / 1e6).toFixed(1) },
  };
}

// 단면: 땅은 자료 높이, 드러난 갯벌은 정한 높이, 물에 잠긴 곳은 그때의 수면 높이로 그린다(물속 바닥은 자료에 없다).
export function flatProfile(sim, level = LOW_WATER, samples = 280) {
  const out = [], [ax, ay] = PROFILE.a, [bx, by] = PROFILE.b, len = Math.hypot(bx - ax, by - ay);
  for (let n = 0; n < samples; n++) {
    const f = n / (samples - 1), x = ax + (bx - ax) * f, y = ay + (by - ay) * f, k = idx(Math.round(x), Math.round(y));
    const ground = sampleH(sim.h, x, y);
    let kind = sim.channel[k] ? 'channel' : sim.flat[k] ? 'flat' : sim.sea[k] ? 'sea' : sim.reed[k] ? 'reed' : 'land';
    const under = (sim.sea[k] || sim.flat[k]) && ground < level;
    out.push({ m: f * len * CELL, x, y, z: under ? level : kind === 'land' ? sampleH(sim.sh, x, y) : ground, water: under, kind });
  }
  return out;
}
export function profileMarks(points, level = LOW_WATER) {
  const marks = [];
  const flats = points.map((p, t) => (p.kind === 'flat' && !p.water ? t : -1)).filter(t => t >= 0);
  if (flats.length) marks.push({ at: flats[Math.floor(flats.length / 2)], text: '드러난 갯벌', color: '#e3c79a' });
  const ch = points.findIndex(p => p.kind === 'channel');
  if (ch >= 0) marks.push({ at: ch, text: '큰 갯골', color: '#8fd6ff' });
  const shore = points.findIndex(p => p.kind !== 'land');
  if (shore > 0) marks.push({ at: shore - 1, text: '해안선(둑)', color: '#ffb38a' });
  const wet = points.findIndex(p => p.water);
  marks.push({ at: points.length - 1, text: level > 0 ? '밀물 때 수면' : '썰물 때 수면', color: '#8fd6ff' });
  if (level > 0 && wet >= 0 && wet !== points.length - 1) marks.push({ at: Math.round((wet + points.length - 1) / 2), text: '물에 잠긴 갯벌', color: '#b9e0f5' });
  return marks;
}
// 단면 위 갯벌 폭(m): 해안선에서 썰물 때 물가까지
export function flatWidth(points) {
  let first = -1, last = -1;
  points.forEach((p, t) => { if (p.kind === 'flat' && !p.water) { if (first < 0) first = t; last = t; } });
  return first < 0 ? 0 : points[last].m - points[first].m;
}

// 이름표 자리. 갯벌, 갈대밭, 물길은 자료에서 그 지형이 실제로 있는 칸을 찾아 고른다.
export function placesOf(sim) {
  const nearest = (test, [cx, cy]) => { let best = null, bd = 1e9; for (let k = 0; k < N * N; k++) if (test(k)) { const d = Math.hypot((k % N) - cx, ((k / N) | 0) - cy); if (d < bd) { bd = d; best = [k % N, (k / N) | 0]; } } return best; };
  const village = name => ({ name, grid: OSM_PLACES[name], village: true });
  return {
    flat: { name: '순천만 갯벌', sub: '썰물 때 드러나는 땅', grid: nearest(k => sim.flat[k] && !sim.creek[k], [262, 262]) },
    reed: { name: '갈대밭', sub: '강물과 바닷물이 만나는 하구의 높은 갯벌', grid: nearest(k => sim.reed[k], [304, 124]) },
    channel: { name: '큰 갯골', sub: '하천 물과 썰물 때 빠지는 물이 흐르는 물길', grid: nearest(k => sim.channel[k], [252, 222]) },
    creek: { name: '갯골', sub: '썰물 때 물이 빠지는 길', grid: nearest(k => sim.flat[k] && sim.creek[k] > 0.6, [300, 300]) },
    isacheon: { name: '이사천', sub: '동천과 합쳐져 순천만으로 흘러듦', grid: nearest(k => sim.river[k], [322, 40]) },
    haeryong: { name: '해룡천', grid: nearest(k => sim.river[k], [380, 45]) },
    bay: { name: '순천만', grid: SEA_SPOT, sea: true },
    daedae: village('대대동'),
    haechang: village('해창리'),
    nongju: village('농주리'),
    sangnae: village('상내리'),
    haksan: village('학산리'),
    usan: village('우산리'),
  };
}
