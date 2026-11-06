// © 2026 김용현
// 동강 실제 지형 화면의 재료. 실제 자료는 땅 높이뿐이고, 물길과 표면 재질은 땅 높이에서 규칙으로 만든 예시다.
export const N = 512;
export const SIZE = 8000;
export const SITE = { lat: 37.2625, lon: 128.581, km: 8 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 물길을 찾을 양 끝점(격자 칸). 창 경계에서 고도가 가장 낮은 곳을 재서 정했다.
export const RIVER_ENDS = [
  [[418, 0], [0, 151]], // 동강 본류: 북동쪽에서 들어와 굽이를 돌고 서쪽으로 나간다.
  [[0, 310], [0, 465]], // 서쪽 가장자리로 다시 들어온 같은 강의 아랫부분
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}

// 두 끝점을 잇는 가장 값싼 길. 높은 땅일수록 비싸므로 골짜기 바닥을 따른다.
// 경사를 따라 내려가는 방식과 달리 웅덩이에 갇히지 않는다.
export function lowestPath(h, from, to) {
  const cost = new Float64Array(N * N).fill(Infinity), prev = new Int32Array(N * N).fill(-1);
  const start = from[1] * N + from[0], goal = to[1] * N + to[0];
  const heap = [[0, start]];
  const push = item => {
    heap.push(item);
    for (let c = heap.length - 1; c > 0;) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
  };
  const pop = () => {
    const top = heap[0], end = heap.pop();
    if (heap.length) {
      heap[0] = end;
      for (let c = 0; ;) { let m = c; const l = c * 2 + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; }
    }
    return top;
  };
  cost[start] = 0;
  while (heap.length) {
    const [c, k] = pop();
    if (k === goal) break;
    if (c > cost[k]) continue;
    const i = k % N, j = (k / N) | 0;
    for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) {
      if (!p && !q) continue;
      const a = i + p, b = j + q;
      if (a < 0 || b < 0 || a >= N || b >= N) continue;
      const o = b * N + a, nc = c + Math.hypot(p, q) * Math.exp((h[o] - 200) / 10);
      if (nc < cost[o]) { cost[o] = nc; prev[o] = k; push([nc, o]); }
    }
  }
  const out = [];
  for (let k = goal; k >= 0; k = prev[k]) out.push({ x: k % N, y: (k / N) | 0 });
  out.reverse();
  // 칸 계단을 고른다.
  for (let pass = 0; pass < 3; pass++) {
    const xs = out.map(p => p.x), ys = out.map(p => p.y);
    for (let t = 2; t < out.length - 2; t++) {
      out[t].x = (xs[t - 2] + xs[t - 1] + xs[t] + xs[t + 1] + xs[t + 2]) / 5;
      out[t].y = (ys[t - 2] + ys[t - 1] + ys[t] + ys[t + 1] + ys[t + 2]) / 5;
    }
  }
  return out;
}

// 칸마다 가장 가까운 물길 점과 거리를 두 번 훑어 구한다.
function nearestRiver(paths) {
  const near = new Int32Array(N * N).fill(-1), dist = new Float32Array(N * N).fill(1e9);
  const all = paths.flat();
  all.forEach((p, s) => {
    const k = Math.round(p.y) * N + Math.round(p.x);
    near[k] = s; dist[k] = 0;
  });
  const tryFrom = (k, o) => {
    if (near[o] < 0) return;
    const p = all[near[o]], d = Math.hypot((k % N) - p.x, ((k / N) | 0) - p.y);
    if (d < dist[k]) { dist[k] = d; near[k] = near[o]; }
  };
  for (let round = 0; round < 2; round++) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      if (i > 0) tryFrom(k, k - 1);
      if (j > 0) { tryFrom(k, k - N); if (i > 0) tryFrom(k, k - N - 1); if (i < N - 1) tryFrom(k, k - N + 1); }
    }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
      const k = j * N + i;
      if (i < N - 1) tryFrom(k, k + 1);
      if (j < N - 1) { tryFrom(k, k + N); if (i < N - 1) tryFrom(k, k + N + 1); if (i > 0) tryFrom(k, k + N - 1); }
    }
  }
  return { near, dist, all };
}

export function buildDonggang(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const paths = RIVER_ENDS.map(([a, b]) => lowestPath(h, a, b));
  const { near, dist, all } = nearestRiver(paths);
  const riverH = all.map(p => sampleH(h, p.x, p.y));
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(h[ir] - h[il], h[jr] - h[jl]) / (2 * CELL);
    const rel = h[k] - riverH[near[k]], d = dist[k];
    const wet = 1 - smooth(1.6, 3.4, d);
    const flat = (1 - smooth(0.1, 0.2, slope));
    const low = 1 - smooth(14, 40, rel);
    const farm = flat * low * (1 - wet);
    const gravel = (1 - smooth(3, 7, d)) * (1 - smooth(6, 16, rel)) * (1 - wet);
    const rocky = smooth(0.8, 1.25, slope);
    const grass = (1 - flat) * low * (1 - smooth(0.25, 0.5, slope)) * 0.7;
    const fo = clamp(1 - rocky - farm - gravel - grass - wet);
    splatA[k * 4] = gravel * 255; splatA[k * 4 + 1] = 0; splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255;
    forest[k] = fo; water[k] = wet;
    mountain[k] = 1 - flat * low;
  }
  const riverLen = paths.map(p => { let s = 0; for (let t = 1; t < p.length; t++) s += Math.hypot(p[t].x - p[t - 1].x, p[t].y - p[t - 1].y); return s * CELL; });
  return {
    h, paths, mountain,
    stage: { h, splatA, splatB, forest, water, total },
    stats: { riverLenM: riverLen.map(Math.round), start: Math.round(sampleH(h, paths[0][0].x, paths[0][0].y)), end: Math.round(sampleH(h, paths[0].at(-1).x, paths[0].at(-1).y)) },
  };
}
