// © 2026 김용현
// 창녕 우포늪 실제 지형 화면의 재료. 고도 자료 말고 낙동강은 땅 높이에서 찾고, 토평천은 OpenStreetMap 물줄기를 격자로 옮겨 낮은 골에 맞춘 경유점이며, 표면 재질은 규칙으로 만든 예시다.
export const N = 512;
export const SIZE = 12000;
export const SITE = { lat: 35.535, lon: 128.395, km: 12 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 격자 자리. 모두 고도 자료를 재서 정했고, 검사가 높이와 위치를 다시 확인한다.
export const OUTLET = [365, 511]; // 창 가장자리에서 가장 낮은 곳. 낙동강이 남쪽으로 나간다.
export const NAKDONG_IN = [106, 0]; // 낙동강이 북쪽에서 들어오는 곳
export const UPO = [340, 170]; // 우포늪 한가운데(북위 35.553도, 동경 128.417도를 격자로 옮긴 곳)
export const MOUTH = [165, 336]; // 토평천 하구. OpenStreetMap의 북위 35.5180도, 동경 128.3716도를 격자로 옮긴 곳
export const LEVEE_SPOT = [197, 335]; // 토평천 하구부 가항리 쪽, 낙동강을 따라 이어진 높은 띠의 꼭대기. 뒤로 낮은 들판이 있다.
export const SWAMP_SPOT = [281, 206]; // 토평천 골짜기 안쪽, 우포늪 앞의 낮은 들판
// 토평천 경유점(격자). 상류에서 하류 순서다. 물길 참고: OpenStreetMap contributors (ODbL), way 387384630, 387384254를 격자로 옮겼다.
// 점이 드문 늪 부근과, 30m 고도에서 산자락이나 작은 언덕 위에 놓이는 점(동쪽 끝, 늪 출구, 격자 196,281 부근, 189,311 부근)은 가까운 낮은 골로 옮겼고 칸 단위 잔 굽이는 줄였다.
const STREAM_WAY = [
  [511, 191], [503, 191], [494, 188], [486, 188], [479, 187], [473, 185], [466, 180], [460, 176], [451, 172], [442, 169], [438, 167], [436, 164], [434, 160],
  [430, 158], [425, 158], [420, 159], [417, 161], [414, 164], [412, 168], [408, 170], [404, 171], [399, 169], [392, 165], [388, 163], [381, 159], [374, 153], [369, 148],
  [362, 147], [353, 149], [346, 157], [340, 169], [328, 178], [316, 184], [307, 193], [297, 200], [288, 206], [282, 212], [279, 218], [277, 223], [279, 229], [283, 235], [286, 241],
  [288, 247], [289, 252], [285, 256], [280, 256], [277, 261], [272, 267], [265, 273], [262, 277], [259, 283], [256, 288], [250, 291], [240, 288], [229, 284], [221, 282],
  [213, 283], [205, 284], [198, 285], [197, 290], [194, 294], [191, 298], [191, 304], [193, 310], [195, 316], [197, 322], [194, 326], [188, 328], [182, 330], [176, 332],
];
// 단면을 재는 길(격자). 낙동강 물가(시작은 계산으로 붙인다)에서 제방 꼭대기를 넘어 토평천 옆 들판을 지나 우포늪의 서쪽 팔로 들어간다.
const FIELD_WAY = [
  LEVEE_SPOT, [199, 328], [201, 320], [204, 308], [206, 298], [213, 292], [226, 291], [240, 293], [252, 283], [259, 270], [266, 263], [276, 258], [283, 250], [281, 240], [275, 230], [276, 218],
  SWAMP_SPOT, [288, 205], [296, 204], [301, 199], [306, 194], [313, 186], [325, 178], UPO,
];
const WATER_HEIGHT = 7; // 다듬은 고도가 이보다 낮고 넓게 이어지면 물로 칠한다.
const WATER_CELLS = 400; // 물로 칠할 최소 넓이(칸). 논의 작은 웅덩이 자국을 뺀다.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;

export function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}

// 잔 기복을 고른다. 약 30m 자료의 점 같은 오차가 물길을 흔들지 않게 한다.
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

// 우선순위 채우기: 가장 낮은 출구에서 시작해 낮은 칸부터 넓혀 가며 칸마다 물이 내려갈 곳을 정한다.
// 웅덩이가 있어도 갇히지 않는다. 물은 모두 한 출구로 가므로 낙동강이 창 안에서 끊기지 않는다.
export function flowField(dem, outlet) {
  const size = dem.length, heap = new Float64Array(size + 1);
  let n = 0;
  const push = v => {
    let c = n++;
    while (c > 0) { const p = (c - 1) >> 1; if (heap[p] <= v) break; heap[c] = heap[p]; c = p; }
    heap[c] = v;
  };
  const pop = () => {
    const top = heap[0], v = heap[--n];
    for (let c = 0; ;) {
      let m = c * 2 + 1;
      if (m >= n) { heap[c] = v; break; }
      if (m + 1 < n && heap[m + 1] < heap[m]) m++;
      if (heap[m] >= v) { heap[c] = v; break; }
      heap[c] = heap[m]; c = m;
    }
    return top;
  };
  // 키 하나에 높이(0.01m 단위)와 칸 번호를 함께 담아 값이 같을 때의 순서까지 정해 둔다.
  const key = (level, k) => Math.round(level * 100) * size + k;
  const down = new Int32Array(size).fill(-1), area = new Int32Array(size).fill(1), seen = new Uint8Array(size), order = new Int32Array(size);
  const start = idx(outlet[0], outlet[1]);
  seen[start] = 1; push(key(dem[start], start));
  let done = 0;
  while (n > 0) {
    const v = pop(), k = v % size, level = (v - k) / size / 100, j = (k / N) | 0, i = k - j * N;
    order[done++] = k;
    for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) {
      const a = i + p, b = j + q;
      if ((!p && !q) || a < 0 || b < 0 || a >= N || b >= N) continue;
      const o = idx(a, b);
      if (seen[o]) continue;
      seen[o] = 1; down[o] = k;
      push(key(Math.max(level, dem[o]), o));
    }
  }
  for (let t = done - 1; t >= 0; t--) if (down[order[t]] >= 0) area[down[order[t]]] += area[order[t]];
  return { down, area };
}

// 칸에서 물 방향을 따라 내려가는 물길. stop 칸을 만나면 멈춘다. 칸 계단을 이동 평균으로 고른다.
function follow(down, from, stop) {
  const out = [];
  for (let k = idx(from[0], from[1]); k >= 0; k = down[k]) {
    out.push({ x: k % N, y: (k / N) | 0 });
    if (stop && stop.has(k)) break;
  }
  for (let pass = 0; pass < 3; pass++) {
    const xs = out.map(p => p.x), ys = out.map(p => p.y);
    for (let t = 2; t < out.length - 2; t++) {
      out[t].x = (xs[t - 2] + xs[t - 1] + xs[t] + xs[t + 1] + xs[t + 2]) / 5;
      out[t].y = (ys[t - 2] + ys[t - 1] + ys[t] + ys[t + 1] + ys[t + 2]) / 5;
    }
  }
  return out;
}

// 경유점을 모두 지나는 매끈한 선(Catmull-Rom). 점 간격은 1칸 안팎이다.
function spline(way) {
  const out = [];
  for (let n = 0; n < way.length - 1; n++) {
    const a = way[Math.max(0, n - 1)], b = way[n], c = way[n + 1], d = way[Math.min(way.length - 1, n + 2)];
    const steps = Math.max(1, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1])));
    for (let q = 0; q < steps; q++) {
      const t = q / steps, t2 = t * t, t3 = t2 * t;
      const at = v => 0.5 * (2 * b[v] + (c[v] - a[v]) * t + (2 * a[v] - 5 * b[v] + 4 * c[v] - d[v]) * t2 + (3 * b[v] - a[v] - 3 * c[v] + d[v]) * t3);
      out.push({ x: at(0), y: at(1) });
    }
  }
  const e = way[way.length - 1];
  out.push({ x: e[0], y: e[1] });
  return out;
}

// 칸마다 가장 가까운 물길 거리를 두 번 훑어 구한다.
function distanceTo(paths) {
  const dist = new Float32Array(N * N).fill(1e9), near = new Int32Array(N * N).fill(-1), all = paths.flat();
  all.forEach((p, s) => { const k = idx(Math.round(p.x), Math.round(p.y)); near[k] = s; dist[k] = 0; });
  const tryFrom = (k, o) => {
    if (near[o] < 0) return;
    const p = all[near[o]], d = Math.hypot((k % N) - p.x, ((k / N) | 0) - p.y);
    if (d < dist[k]) { dist[k] = d; near[k] = near[o]; }
  };
  for (let round = 0; round < 2; round++) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = idx(i, j);
      if (i > 0) tryFrom(k, k - 1);
      if (j > 0) { tryFrom(k, k - N); if (i > 0) tryFrom(k, k - N - 1); if (i < N - 1) tryFrom(k, k - N + 1); }
    }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
      const k = idx(i, j);
      if (i < N - 1) tryFrom(k, k + 1);
      if (j < N - 1) { tryFrom(k, k + N); if (i < N - 1) tryFrom(k, k + N + 1); if (i > 0) tryFrom(k, k + N - 1); }
    }
  }
  return dist;
}

// 다듬은 고도가 낮고 넓게 이어진 곳을 물로 친다.
function waterBodies(sh) {
  const mark = new Uint8Array(N * N), seen = new Uint8Array(N * N);
  for (let s = 0; s < N * N; s++) {
    if (seen[s] || sh[s] >= WATER_HEIGHT) continue;
    const list = [s];
    seen[s] = 1;
    for (let t = 0; t < list.length; t++) {
      const c = list[t], i = c % N, j = (c / N) | 0;
      for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const o = idx(a, b);
        if (!seen[o] && sh[o] < WATER_HEIGHT) { seen[o] = 1; list.push(o); }
      }
    }
    if (list.length >= WATER_CELLS) for (const c of list) mark[c] = 1;
  }
  return mark;
}

export function buildUpo(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const sh = blur(h, 2, 2);
  // 낙동강은 다듬은 고도에서 찾는다. 토평천은 저장한 경유점을 매끈하게 이어 낙동강 위의 하구에서 끝낸다.
  const { down, area } = flowField(sh, OUTLET);
  const river = follow(down, [NAKDONG_IN[0], 2], null);
  const mouth = river.reduce((b, p) => (Math.hypot(p.x - MOUTH[0], p.y - MOUTH[1]) < Math.hypot(b.x - MOUTH[0], b.y - MOUTH[1]) ? p : b));
  const stream = spline([...STREAM_WAY, [mouth.x, mouth.y]]);
  const paths = [river, stream];
  const body = waterBodies(sh);
  const dMain = distanceTo([river]), dStream = distanceTo([stream]);
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  let lakeCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const wet = Math.max(body[k] ? 1 : 0, 1 - smooth(1.2, 2.6, dStream[k]), 1 - smooth(4, 7, dMain[k]));
    const flat = 1 - smooth(0.05, 0.12, slope);
    const low = 1 - smooth(20, 34, sh[k]);
    // 낙동강 가까이의 조금 높은 땅은 물이 잘 빠지는 밭으로, 나머지 낮은 땅은 논으로 칠한다(규칙으로 만든 예시).
    const dry = sh[k] > 11.5 && dMain[k] < 70 ? 1 : 0;
    const farm = flat * low * (1 - wet);
    const gravel = (1 - smooth(5, 9, dMain[k])) * (1 - wet) * 0.8;
    const rocky = smooth(0.7, 1.1, slope);
    const grass = (1 - flat) * low * (1 - smooth(0.2, 0.4, slope)) * 0.8;
    const fo = clamp(1 - rocky - farm - gravel - grass - wet);
    splatA[k * 4] = gravel * 255; splatA[k * 4 + 1] = 0; splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255; splatB[k * 4 + 3] = dry * 255;
    forest[k] = fo; water[k] = wet;
    mountain[k] = 1 - flat * low;
    if (body[k] && Math.hypot(i - UPO[0], j - UPO[1]) < 60) lakeCells++;
  }
  const lengthM = p => { let s = 0; for (let t = 1; t < p.length; t++) s += Math.hypot(p[t].x - p[t - 1].x, p[t].y - p[t - 1].y); return Math.round(s * CELL); };
  return {
    h, sh, paths, area, mountain, body,
    stage: { h, splatA, splatB, forest, water, total },
    stats: { riverM: lengthM(river), streamM: lengthM(stream), lakeHa: Math.round((lakeCells * CELL * CELL) / 10000) },
  };
}

// 다듬은 고도에서 r칸 안의 가운데 값. 점 오차에 흔들리지 않게 땅 높이를 잰다.
export function floorHeight(sh, x, y, r = 6) {
  const v = [];
  for (let q = -r; q <= r; q++) for (let p = -r; p <= r; p++) {
    const a = Math.round(x) + p, b = Math.round(y) + q;
    if (a >= 0 && b >= 0 && a < N && b < N) v.push(sh[b * N + a]);
  }
  v.sort((a, b) => a - b);
  return v[v.length >> 1];
}

// r칸 안에서 낮은 쪽 분위수(기본 하위 20%). 옆의 산비탈을 집지 않고 들판 높이를 읽는다.
export function lowHeight(sh, x, y, r = 3, q = 0.2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (i >= 0 && j >= 0 && i < N && j < N) v.push(sh[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[Math.floor(v.length * q)];
}

// 낙동강 물가에서 제방을 넘어 토평천 옆 들판을 따라 우포늪까지 걸으며 잰 높이. 물길 바닥이 아니라 옆 들판의 높이다. 칸 하나가 CELL 미터다.
export function fieldProfile(sim, samples = 240) {
  const river = sim.paths[0];
  const bank = river.reduce((b, p) => (Math.hypot(p.x - LEVEE_SPOT[0], p.y - LEVEE_SPOT[1]) < Math.hypot(b.x - LEVEE_SPOT[0], b.y - LEVEE_SPOT[1]) ? p : b));
  const line = spline([[bank.x, bank.y], ...FIELD_WAY]);
  const cum = [0];
  for (let t = 1; t < line.length; t++) cum.push(cum[t - 1] + Math.hypot(line[t].x - line[t - 1].x, line[t].y - line[t - 1].y));
  const len = cum[cum.length - 1], out = [];
  for (let n = 0, t = 0; n < samples; n++) {
    const want = (len * n) / (samples - 1);
    while (t < line.length - 2 && cum[t + 1] < want) t++;
    const u = clamp((want - cum[t]) / Math.max(1e-6, cum[t + 1] - cum[t])), x = line[t].x + (line[t + 1].x - line[t].x) * u, y = line[t].y + (line[t + 1].y - line[t].y) * u;
    out.push({ m: want * CELL, x, y, z: lowHeight(sim.sh, x, y), water: sim.body[idx(Math.round(x), Math.round(y))] === 1 });
  }
  return out;
}

// 단면에 적을 이름. 자리는 지도의 이름표 자리에서 가장 가까운 점이다.
export function profileMarks(points) {
  const nearest = g => points.reduce((b, p, t) => (Math.hypot(p.x - g[0], p.y - g[1]) < Math.hypot(points[b].x - g[0], points[b].y - g[1]) ? t : b), 0);
  return [
    { at: 0, text: '낙동강', color: '#8fd6ff' },
    { at: nearest(LEVEE_SPOT), text: '자연 제방 쪽 높은 땅', color: '#ffd36b' },
    { at: nearest(SWAMP_SPOT), text: '배후 습지 쪽 낮은 땅', color: '#f3f1ea' },
    { at: points.length - 1, text: '우포늪', color: '#8fd6ff' },
  ];
}

// 이름표 자리(격자 칸). 낙동강과 토평천은 물길 위에 놓는다. 토평천은 늪과 하구 사이 넓은 들판을 흐르는 곳이다.
export function placesOf(sim) {
  const [river, stream] = sim.paths;
  const on = (path, f) => { const p = path[Math.floor(path.length * f)]; return [p.x, p.y]; };
  const closest = (path, g) => { const p = path.reduce((b, o) => (Math.hypot(o.x - g[0], o.y - g[1]) < Math.hypot(b.x - g[0], b.y - g[1]) ? o : b)); return [p.x, p.y]; };
  return {
    river: { name: '낙동강', grid: on(river, 0.28) },
    stream: { name: '토평천', grid: closest(stream, [240, 288]) },
    lake: { name: '우포늪', sub: '배후 습지에 물이 고인 곳', grid: UPO },
    levee: { name: '자연 제방', sub: '강 가까이의 높은 땅', grid: LEVEE_SPOT },
    swamp: { name: '배후 습지', sub: '낮은 들판, 논', grid: SWAMP_SPOT },
  };
}
