// © 2026 김용현
// 갯벌 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 들쭉날쭉한 해안의 만(위쪽 육지, 아래쪽 바다)에 밀물과 썰물이 드나든다. 밀물 때 들어온 바닷물과 하천이 실어 온 고운 흙은
// 물살이 느리고 물이 오래 머무는 곳(만 안쪽, 높은 곳, 갯골에서 먼 곳)에 가라앉아 펄이 되고, 물살이 빠른 바깥과 갯골에는 모래가 남는다.
// 흙이 쌓일수록 땅이 높아져 물에 잠기는 때가 짧아지므로 밀물 때 해수면에 가까워질수록 천천히 쌓인다.
// 썰물 때 갯벌 위의 물은 낮은 쪽으로 모여 빠지고, 물이 많이 모이는 길(흐름 누적이 큰 곳)이 파여 나뭇가지 모양의 갯골이 된다.
// 방조제를 쌓으면 안쪽에는 바닷물이 들어오지 않아 물이 빠지고 갯벌이 말라 간척지가 된다.
// 지형 계산에는 사칙연산과 내림, 제곱근만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.
// 밀물과 썰물의 오르내림도 사인 함수 대신 다듬은 세모꼴(3차식)로 만든다.

export const N = 256;
export const ROUND = 0.1;
export const T_FORM = 60; // 갯벌이 자라는 때(초)
export const DRY = 20; // 방조제를 쌓은 뒤 안쪽이 마르는 때(초)
export const PERIOD = 4; // 밀물과 썰물이 한 번 오가는 때(초)
export const HEAD_J = 46; // 만의 가장 안쪽 줄
export const MOUTH_J = 178; // 만 입구 줄(바깥 해안선)
export const DIKE_J = 148; // 방조제를 쌓는 줄
export const RIVER_X = 112; // 하천이 만으로 드는 곳
export const AXIS_X = 124; // 만의 가운데 줄
export const BAY_HALF = 92; // 만 입구의 반폭
const SLOPE = 0.06; // 처음 바닥이 바다 쪽으로 깊어지는 정도(칸마다 m)
const DEP_K = 0.007; // 흙이 쌓이는 빠르기. 서해안 조건에서 끝날 때 만 안쪽이 밀물 때 해수면 가까이 오르도록 정했다.
const BED_MUD = 0.12; // 처음 바닥 겉흙의 펄 비율(모래가 많은 바닥)
const MIX_T = 0.35; // 겉흙이 섞이는 두께(m)
export const ACC_T = 60; // 갯골이 파이기 시작하는 흐름 누적
const CUT_MAX = 0.32; // 갯골 깊이의 한계(조차의 반에 대한 비율)
export const CREEK_MIN = 0.12; // 이보다 깊게 파인 칸을 갯골로 본다(m)
const DITCH_ACC = 12; // 방조제 뒤 배수로로 남는 갯골(흐름 누적이 ACC_T의 몇 배 이상)
const REED_R = 34; // 하구에서 이 거리 안의 염생 식물은 민물을 좋아하는 갈대
const RIVER_Q = 300; // 하천에서 갯벌로 드는 물(흐름 누적에 더한다)
const ROUTE_NOISE = 0.12; // 물길을 고를 때 더하는 작은 울퉁불퉁함(m)

export const TIDE = {
  small: { name: '작음', range: 0.3, place: '동해안' },
  mid: { name: '보통', range: 3, place: '남해안 서부' },
  big: { name: '큼', range: 7, place: '서해안' },
};
export const SUPPLY = {
  low: { name: '적음', rate: 0.45 },
  mid: { name: '보통', rate: 1 },
  high: { name: '많음', rate: 1.7 },
};
export const DIKE = { no: { name: '없음' }, yes: { name: '쌓음' } };
export const PRESETS = {
  west: { tide: 'big', supply: 'mid', dike: 'no' },
  south: { tide: 'mid', supply: 'mid', dike: 'no' },
  east: { tide: 'small', supply: 'mid', dike: 'no' },
  reclaim: { tide: 'big', supply: 'mid', dike: 'yes' },
};
// 썰물 때 드러나는 갯벌로 세는 종류
export const FLAT_KINDS = ['sandflat', 'mixflat', 'mudflat', 'creek'];

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
function makeRng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function makeNoise(seed, cell) {
  const r = makeRng(seed * 7919 + 13), M = Math.ceil(N / cell) + 3, g = new Float64Array(M * M);
  for (let k = 0; k < g.length; k++) g[k] = r();
  const ease = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const u = x / cell, v = y / cell, i = Math.floor(u), j = Math.floor(v), a = ease(u - i), b = ease(v - j), o = j * M + i;
    return (g[o] * (1 - a) + g[o + 1] * a) * (1 - b) + (g[o + M] * (1 - a) + g[o + M + 1] * a) * b;
  };
}

// 밀물과 썰물의 꼴. u는 한 주기 안의 때(0에서 1). 0에서 가장 높고(만조), 0.5에서 가장 낮다(간조).
// 세모꼴 w를 3차식으로 다듬어 꼭대기와 바닥에서 천천히 바뀌게 했다.
export function tideShape(u) {
  const w = 2 * Math.abs(2 * u - 1) - 1;
  return w * (1.5 - 0.5 * w * w);
}
const tidePhase = t => { const f = t / PERIOD + 0.75; return f - Math.floor(f); };
// 때 t(초)의 해수면. 평균 해수면이 0이고 조차의 반만큼 오르내린다. 0초에는 중간 높이에서 오르기 시작한다.
export function tideAt(t, range) { return (range / 2) * tideShape(tidePhase(t)) + 0; }
export const tideRising = t => tidePhase(t) > 0.5;

// 해안선 줄(노이즈 전). 가운데가 육지 쪽으로 깊이 들어간 만이고, 양쪽에 작은 후미가 있다.
export function coastRow(i) {
  const u = (i - AXIS_X) / BAY_HALF;
  let y = MOUTH_J;
  if (u > -1 && u < 1) y -= (MOUTH_J - HEAD_J) * (1 - u * u);
  const cove = (c, w, d) => { const v = (i - c) / w; return v > -1 && v < 1 ? d * (1 - v * v) * (1 - v * v) : 0; };
  return y - cove(196, 13, 26) - cove(50, 11, 18);
}

function chamfer(src, out) {
  const D2 = Math.sqrt(2);
  for (let k = 0; k < N * N; k++) out[k] = src[k] ? 0 : 1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    let v = out[k];
    if (i > 0) v = Math.min(v, out[k - 1] + 1);
    if (j > 0) { v = Math.min(v, out[k - N] + 1); if (i > 0) v = Math.min(v, out[k - N - 1] + D2); if (i < N - 1) v = Math.min(v, out[k - N + 1] + D2); }
    out[k] = v;
  }
  for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
    const k = j * N + i;
    let v = out[k];
    if (i < N - 1) v = Math.min(v, out[k + 1] + 1);
    if (j < N - 1) { v = Math.min(v, out[k + N] + 1); if (i < N - 1) v = Math.min(v, out[k + N + 1] + D2); if (i > 0) v = Math.min(v, out[k + N - 1] + D2); }
    out[k] = v;
  }
}

const NB = [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1], [-1, -1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [1, 1, 1.4142]];

export function createModel(seed = 11) {
  const size = N * N;
  const h = new Float32Array(size), start = new Float32Array(size), plat = new Float32Array(size), cut = new Float32Array(size), mud = new Float32Array(size), thick = new Float32Array(size);
  const cutDike = new Float32Array(size), tmpA = new Float32Array(size), target = new Float32Array(size), energy = new Float32Array(size), acc = new Float32Array(size), route = new Float32Array(size), noise = new Float32Array(size), near = new Float32Array(size), dist = new Float32Array(size), dist2 = new Float32Array(size);
  const land = new Uint8Array(size), river = new Uint8Array(size), dike = new Uint8Array(size), inside = new Uint8Array(size), field = new Uint8Array(size), ditch = new Uint8Array(size), seen = new Uint8Array(size), inList = new Uint8Array(size);
  const recv = new Int32Array(size), list = new Int32Array(size), queue = new Int32Array(size);
  const sAxis = new Float32Array(N);
  for (let j = 0; j < N; j++) sAxis[j] = clamp((j - HEAD_J) / (MOUTH_J - HEAD_J));

  const m = {
    h, start, plat, cut, mud, thick, energy, acc, recv, land, river, dike, inside, field, ditch, seed,
    options: { ...PRESETS.west }, clock: 0, tideTime: 0, sea: 0, innerLevel: 0, finished: false, version: 0, dikeAt: -1,
  };
  let roundNo = 0, carry = 0, formed = false, amp = 3.5, range = 7, rate = 1, rf = 1, seaCells = null, insideCells = null, level0 = 0, spotCache = {};
  const mdTable = new Float32Array(81);

  // 바닥 높이 z가 한 주기 동안 평균으로 얼마나 깊이 잠기는가(m). 오래, 깊이 잠길수록 흙이 많이 가라앉는다.
  function buildMeanDepth() {
    for (let q = 0; q <= 80; q++) {
      const z = -amp + (2 * amp * q) / 80;
      let s = 0;
      for (let t = 0; t < 200; t++) { const d = amp * tideShape(t / 200) - z; if (d > 0) s += d; }
      mdTable[q] = s / 200;
    }
  }
  const meanDepth = z => {
    if (z >= amp) return 0;
    const f = clamp((z + amp) / (2 * amp)) * 80, q = Math.min(79, Math.floor(f)), a = f - q;
    return mdTable[q] * (1 - a) + mdTable[q + 1] * a;
  };

  // 처음 땅: 위쪽 육지의 언덕과 하천 골짜기, 가운데가 깊이 들어온 만, 바다 쪽으로 완만히 깊어지는 바닥
  function buildBase() {
    const wig = makeNoise(seed + 2, 9), hill = makeNoise(seed + 5, 30), hill2 = makeNoise(seed + 9, 11), fine = makeNoise(seed + 13, 4), rv = makeNoise(seed + 17, 24);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      land[k] = j < 3 || (j < N - 4 && j < coastRow(i) + (wig(i, j) - 0.5) * 10) ? 1 : 0;
    }
    // 바다와 이어지지 않은 물과 섬은 없앤다.
    const fillFrom = (want, row) => {
      seen.fill(0);
      let n = 0;
      for (let i = 0; i < N; i++) { const k = row * N + i; if (land[k] === want) { seen[k] = 1; queue[n++] = k; } }
      for (let t = 0; t < n; t++) {
        const c = queue[t], i = c % N;
        for (const o of [i > 0 ? c - 1 : -1, i < N - 1 ? c + 1 : -1, c - N, c + N]) if (o >= 0 && o < size && !seen[o] && land[o] === want) { seen[o] = 1; queue[n++] = o; }
      }
      for (let k = 0; k < size; k++) if (land[k] === want && !seen[k]) land[k] = want ? 0 : 1;
    };
    fillFrom(1, 0);
    fillFrom(0, N - 1);
    // 하천: 위쪽 끝에서 만 안쪽 끝까지
    const rx = j => RIVER_X + (rv(7, j) - 0.5) * 12;
    m.mouth = null;
    for (let j = 0; j < N && !m.mouth; j++) { const x = Math.round(rx(j)); if (!land[j * N + x]) m.mouth = { x, y: j, k: j * N + x }; }
    for (let k = 0; k < size; k++) seen[k] = land[k] ? 0 : 1;
    chamfer(seen, dist); // 육지 칸에서 바다까지의 거리
    chamfer(land, dist2); // 바다 칸에서 육지까지의 거리
    river.fill(0);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      let v;
      if (land[k]) {
        const dS = dist[k];
        v = 3.9 + 0.3 * Math.min(dS, 8) + clamp(dS / 45) * (2 + 10 * hill(i, j)) + (hill2(i, j) - 0.5) * 1.2 * clamp(dS / 6);
        // 하천 골짜기: 하구 쪽으로 낮아지는 넓은 바닥
        if (j < m.mouth.y + 6) {
          const d = Math.abs(i - rx(j)), vf = 3.9 + 0.03 * Math.max(0, m.mouth.y - j);
          if (d < 18 && v > vf) v = vf + (v - vf) * smooth(2, 18, d);
          if (d <= 1.3 && j < m.mouth.y) { river[k] = 1; v = vf - 0.25; }
        }
      } else {
        v = -0.3 - SLOPE * dist2[k] * (0.55 + 0.45 * sAxis[j]) - 0.2 * Math.max(0, j - MOUTH_J) + (fine(i, j) - 0.5) * 0.04;
        if (v < -13) v = -13;
      }
      start[k] = v;
    }
    // 물길을 고를 때 더하는 작은 울퉁불퉁함: 몇 칸 크기의 완만한 굴곡에 아주 작은 잔무늬를 더한다. 이 굴곡 때문에 물길이 모이고 갈라진다.
    const r = makeRng(seed * 31 + 7), bump = makeNoise(seed + 23, 9), bump2 = makeNoise(seed + 29, 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) noise[j * N + i] = (bump(i, j) - 0.5) * ROUTE_NOISE * 8 + (bump2(i, j) - 0.5) * ROUTE_NOISE * 3 + (r() - 0.5) * ROUTE_NOISE * 0.3;
    let n = 0;
    for (let k = 0; k < size; k++) if (!land[k]) n++;
    seaCells = new Int32Array(n); n = 0;
    for (let k = 0; k < size; k++) if (!land[k]) seaCells[n++] = k;
  }

  const diked = () => m.dikeAt >= 0;
  const isInside = k => diked() && inside[k] === 1;
  m.levelAt = k => (isInside(k) ? m.innerLevel : m.sea);

  // 물살의 세기(0 고요함, 1 빠름): 만 입구와 바깥 바다 쪽, 뭍에서 먼 곳, 깊은 곳에서 빠르다. near는 갯골 가까운 정도다.
  function updateEnergy() {
    near.fill(0);
    for (const k of seaCells) if (cut[k] > CREEK_MIN) near[k] = 1;
    for (const [val, from] of [[0.6, 1], [0.3, 0.6]]) {
      for (const k of seaCells) {
        if (near[k] !== from) continue;
        const i = k % N;
        for (const o of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, k - N, k + N]) if (o >= 0 && o < size && !land[o] && near[o] < val) near[o] = val;
      }
    }
    for (const k of seaCells) energy[k] = clamp(0.36 * sAxis[(k / N) | 0] + 0.4 * clamp(dist2[k] / 50) + 0.24 * clamp((1 - plat[k]) / 7));
  }

  // 썰물 때 갯벌 위의 물이 빠지는 길. 바다(썰물 때도 잠긴 곳)에 닿은 칸부터 낮은 칸 차례로 넓혀 가며 물길 나무를 만든다(우선순위 채우기).
  // 그래서 웅덩이에 갇히는 물 없이 모든 물이 바다로 빠진다. 높은 칸부터 거꾸로 물을 넘겨 모이는 양(흐름 누적)을 센다.
  const heapK = new Int32Array(size), heapV = new Float32Array(size), popOrder = new Int32Array(size);
  let heapN = 0;
  const less = (a, b) => heapV[a] < heapV[b] || (heapV[a] === heapV[b] && heapK[a] < heapK[b]);
  const swap = (a, b) => { const k = heapK[a], v = heapV[a]; heapK[a] = heapK[b]; heapV[a] = heapV[b]; heapK[b] = k; heapV[b] = v; };
  function push(k, v) {
    let c = heapN++; heapK[c] = k; heapV[c] = v;
    while (c > 0) { const p = (c - 1) >> 1; if (!less(c, p)) break; swap(c, p); c = p; }
  }
  function pop() {
    const k = heapK[0]; heapN--;
    if (heapN > 0) {
      heapK[0] = heapK[heapN]; heapV[0] = heapV[heapN];
      let c = 0;
      for (;;) { const l = 2 * c + 1, r = l + 1; let b = c; if (l < heapN && less(l, b)) b = l; if (r < heapN && less(r, b)) b = r; if (b === c) break; swap(c, b); c = b; }
    }
    return k;
  }
  function routeFlow() {
    const HT = amp, LT = -amp;
    let n = 0;
    inList.fill(0);
    for (const k of seaCells) {
      recv[k] = -1; acc[k] = 0;
      // 갯벌 위(갯골이 파인 곳 포함)의 칸만 넣는다. 썰물 때도 잠긴 바다는 물이 빠져나가는 곳이다.
      if (dike[k] || isInside(k) || plat[k] < LT - 0.4 || h[k] >= HT) continue;
      list[n++] = k; inList[k] = 1;
      route[k] = h[k];
      // 밀물 때 그 칸 위에 있던 물의 양에 비례한다.
      acc[k] = 0.2 + clamp((HT - h[k]) / range, 0, 1);
    }
    // 물길은 칸마다의 작은 굴곡이 아니라 고르게 다듬은 면을 따라 고른다. 몇 칸 크기의 굴곡(noise)이 물길을 구불구불하게 한다.
    for (let t = 0; t < n; t++) {
      const k = list[t], i = k % N;
      let s = route[k], c = 1;
      for (const o of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, k - N, k + N, i > 1 ? k - 2 : -1, i < N - 2 ? k + 2 : -1, k - 2 * N, k + 2 * N]) if (o >= 0 && o < size && inList[o]) { s += h[o]; c++; }
      tmpA[k] = s / c + noise[k] * (amp / 3.5);
    }
    for (let t = 0; t < n; t++) route[list[t]] = tmpA[list[t]];
    if (m.mouth && inList[m.mouth.k]) acc[m.mouth.k] += RIVER_Q;
    heapN = 0; seen.fill(0);
    for (let t = 0; t < n; t++) {
      const k = list[t], i = k % N, j = (k / N) | 0;
      let best = -1, bv = 1e9;
      for (const [di, dj] of NB) {
        const x = i + di, y = j + dj;
        if (x < 0 || x >= N || y < 0 || y >= N) continue;
        const o = y * N + x;
        if (land[o] || dike[o] || inList[o] || isInside(o)) continue;
        if (h[o] < bv) { bv = h[o]; best = o; }
      }
      if (best >= 0) { recv[k] = best; seen[k] = 1; push(k, route[k]); }
    }
    let popped = 0;
    while (heapN > 0) {
      const c = pop(), i = c % N, j = (c / N) | 0;
      popOrder[popped++] = c;
      const cv = route[c];
      for (const [di, dj] of NB) {
        const x = i + di, y = j + dj;
        if (x < 0 || x >= N || y < 0 || y >= N) continue;
        const o = y * N + x;
        if (!inList[o] || seen[o]) continue;
        seen[o] = 1; recv[o] = c;
        if (route[o] < cv + 1e-4) route[o] = cv + 1e-4;
        push(o, route[o]);
      }
    }
    for (let t = popped - 1; t >= 0; t--) { const k = popOrder[t], r = recv[k]; if (r >= 0 && inList[r]) acc[r] += acc[k]; }
    return n;
  }

  // 갯골: 물이 많이 모이는 길을 판다. 물이 많을수록 넓어지고(바다 쪽), 적을수록 좁다(육지 쪽 가지).
  // 가운데가 가장 깊고 둑 쪽으로 2~3칸에 걸쳐 완만하게 얕아지게 판다. 한 번 판 갯골은 메워지지 않는다(방조제 뒤는 따로).
  function carveCreeks() {
    target.fill(0);
    for (const k of seaCells) {
      if (!inList[k] || acc[k] < ACC_T) continue;
      const q = acc[k] / ACC_T, t = Math.min(CUT_MAX * amp, 0.06 * amp * Math.sqrt(q)), r = Math.min(3, 0.6 + 0.3 * Math.sqrt(q)), R = Math.ceil(r) + 1;
      const i = k % N, j = (k / N) | 0;
      for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
        const x = i + di, y = j + dj;
        if (x < 0 || x >= N || y < 0 || y >= N) continue;
        const o = y * N + x;
        if (land[o] || dike[o] || isInside(o)) continue;
        const f = 1 - (di * di + dj * dj) / ((r + 1) * (r + 1));
        if (f > 0 && t * f * f > target[o]) target[o] = t * f * f;
      }
    }
    // 칸 모양의 계단이 남지 않게 판 모양을 한 번 고르게 다듬는다.
    for (const k of seaCells) {
      const i = k % N;
      let sum = target[k] * 2, c = 2;
      for (const o of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, k - N, k + N]) if (o >= 0 && o < size && !land[o]) { sum += target[o]; c++; }
      tmpA[k] = sum / c;
    }
    for (const k of seaCells) if (cut[k] < tmpA[k]) { cut[k] += (tmpA[k] - cut[k]) * 0.12; h[k] = plat[k] - cut[k]; }
  }

  // 흙은 물결과 물살에 고르게 펴진다. 칸마다의 작은 턱이 쌓이지 않도록 이웃 칸과 높이를 조금씩 고른다(갯벌은 아주 완만하다).
  function smoothSurface(times) {
    for (let n = 0; n < times; n++) {
      for (const k of seaCells) {
        if (dike[k] || isInside(k)) { tmpA[k] = plat[k]; continue; }
        const i = k % N;
        let s = 0, c = 0;
        for (const o of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, k - N, k + N]) if (o >= 0 && o < size && !land[o] && !dike[o]) { s += plat[o]; c++; }
        tmpA[k] = c ? plat[k] + 0.35 * (s / c - plat[k]) : plat[k];
      }
      for (const k of seaCells) plat[k] = tmpA[k];
      for (const k of seaCells) {
        if (dike[k] || isInside(k)) { tmpA[k] = mud[k]; continue; }
        const i = k % N;
        let s = 0, c = 0;
        for (const o of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, k - N, k + N]) if (o >= 0 && o < size && !land[o] && !dike[o]) { s += mud[o]; c++; }
        tmpA[k] = c ? mud[k] + 0.25 * (s / c - mud[k]) : mud[k];
      }
      for (const k of seaCells) { mud[k] = tmpA[k]; h[k] = plat[k] - cut[k]; }
    }
  }

  // 흙 쌓기: 오래, 깊이 잠기고 물살이 느린 곳일수록 많이 쌓인다. 물살이 느린 곳에는 펄, 빠른 곳에는 모래가 쌓인다.
  function deposit() {
    const HT = amp, LT = -amp;
    for (const k of seaCells) {
      if (dike[k] || isInside(k)) continue;
      const z = plat[k];
      if (z >= HT - 0.01) continue;
      // 썰물 때도 잠긴 곳은 조차의 반만큼 잠긴 것으로 치되, 깊은 곳은 물살이 빨라 덜 쌓인다.
      const W = z >= LT ? meanDepth(z) : amp * (1 - 0.85 * smooth(0, 4, LT - z));
      const e = energy[k];
      let d = DEP_K * rate * rf * W * (1 - 0.92 * smooth(0.25, 0.85, e));
      // 염생 식물이 자라는 높은 곳은 풀이 흙을 붙잡아 조금 더 쌓인다.
      if (z > amp - m.marshBand()) d *= 1.6;
      // 뭍 가까이는 물살이 가장 느려 더 많이 쌓인다.
      d *= 1 + 1.2 * (1 - clamp(dist2[k] / 14));
      if (d <= 0) continue;
      // 갯골 가까이는 물살이 빨라 고운 흙이 덜 남는다. 쌓이는 양은 둘레 갯벌과 같게 두고(갯골의 깊이는 따로 판다) 겉흙만 거칠게 한다.
      const fm = 1 - smooth(0.3, 0.68, clamp(e + 0.3 * near[k]));
      plat[k] = z + d;
      mud[k] = (mud[k] * MIX_T + fm * d) / (MIX_T + d);
      thick[k] += d;
      h[k] = plat[k] - cut[k];
    }
  }

  function buildDike() {
    m.dikeAt = m.clock;
    const top = amp + 1.5;
    for (let j = DIKE_J - 1; j <= DIKE_J + 1; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      if (land[k]) continue;
      dike[k] = 1; plat[k] = h[k] = top; cut[k] = 0;
    }
    // 방조제 안쪽: 만 안쪽 끝에서 방조제를 넘지 않고 닿는 물과 갯벌
    seen.fill(0);
    let n = 0;
    const s0 = m.mouth.k;
    seen[s0] = 1; queue[n++] = s0;
    for (let t = 0; t < n; t++) {
      const c = queue[t], i = c % N;
      for (const o of [i > 0 ? c - 1 : -1, i < N - 1 ? c + 1 : -1, c - N, c + N]) if (o >= 0 && o < size && !seen[o] && !land[o] && !dike[o]) { seen[o] = 1; queue[n++] = o; }
    }
    insideCells = new Int32Array(n);
    cutDike.set(cut);
    for (let t = 0; t < n; t++) { inside[queue[t]] = 1; insideCells[t] = queue[t]; }
    level0 = m.sea;
    m.version++;
  }

  // 방조제 뒤: 바닷물이 끊겨 물이 빠지고, 높은 곳부터 말라 간척지(논)가 된다. 작은 갯골은 메워지고 큰 갯골은 배수로가 된다.
  function dryInside() {
    const p = clamp((m.clock - m.dikeAt) / DRY);
    for (const k of insideCells) {
      if (plat[k] < m.innerLevel) continue;
      if (cutDike[k] > 0) {
        if (acc[k] >= DITCH_ACC * ACC_T) ditch[k] = 1;
        else { cut[k] = cutDike[k] * (1 - smooth(0, 0.6, p)); h[k] = plat[k] - cut[k]; }
      }
      if (!field[k] && p >= 0.12 + 0.7 * clamp((amp - plat[k]) / range)) field[k] = 1;
    }
  }

  const innerTarget = () => -amp - 0.25;
  function updateLevels() {
    m.sea = tideAt(m.tideTime, range);
    if (diked()) m.innerLevel = level0 + (innerTarget() - level0) * smooth(0, 3, m.clock - m.dikeAt);
    else m.innerLevel = m.sea;
  }

  m.endTime = () => (diked() ? m.dikeAt + DRY : m.options.dike === 'yes' ? T_FORM + DRY : T_FORM);

  function round() {
    m.clock += ROUND; roundNo++;
    updateLevels();
    const forming = m.clock <= T_FORM + 1e-9;
    if (forming) deposit();
    if (forming && roundNo % 5 === 0) smoothSurface(1);
    if (forming && roundNo % 10 === 1) { routeFlow(); carveCreeks(); updateEnergy(); }
    if (forming && roundNo % 10 === 6) spotCache = computeSpots();
    // 갯벌이 다 자란 때: 마지막 물길을 정한다. 방조제를 언제 쌓든 이 물길로 배수로를 정한다.
    if (!formed && m.clock >= T_FORM - 1e-9) { formed = true; routeFlow(); updateEnergy(); }
    if (!diked() && m.options.dike === 'yes' && m.clock >= T_FORM - 1e-9) buildDike();
    if (diked()) { dryInside(); if (roundNo % 10 === 0) spotCache = computeSpots(); }
    if (roundNo % 5 === 0) m.version++;
    if (m.clock >= m.endTime() - 1e-9) finish();
  }
  function finish() {
    m.finished = true;
    spotCache = computeSpots();
    m.version++;
  }

  // 칸의 종류. 갯벌의 종류는 그때의 물 높이와 상관없이 땅의 높이와 겉흙으로 정한다.
  m.cellKind = k => {
    if (dike[k]) return 'dike';
    if (land[k]) return river[k] ? 'river' : 'land';
    const HT = amp, LT = -amp;
    if (isInside(k)) {
      if (plat[k] < m.innerLevel) return 'lake';
      if (ditch[k]) return 'ditch';
      return field[k] ? 'field' : 'dryflat';
    }
    if (plat[k] < LT) return 'sea';
    if (cut[k] > CREEK_MIN) return 'creek';
    if (m.isMarsh(k)) return 'marsh';
    return mud[k] < 0.4 ? 'sandflat' : mud[k] < 0.68 ? 'mixflat' : 'mudflat';
  };
  // 염생 식물: 밀물 때 해수면 가까이까지 쌓인 펄 위에만 자란다.
  m.marshBand = () => Math.max(0.05, 0.17 * range);
  m.isMarsh = k => !land[k] && !dike[k] && !isInside(k) && plat[k] >= amp - m.marshBand() && plat[k] < amp + 0.5 && thick[k] > 0.3 && mud[k] >= 0.5 && energy[k] < 0.3 && cut[k] <= CREEK_MIN;
  m.isReed = k => { if (!m.mouth) return false; const dx = (k % N) - m.mouth.x, dy = ((k / N) | 0) - m.mouth.y; return dx * dx + dy * dy < REED_R * REED_R; };
  m.sample = (gx, gy) => {
    const u = clamp(gx, 0, N - 1.001), v = clamp(gy, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + N] * (1 - a) + h[k + N + 1] * a) * b;
  };
  m.amp = () => amp;
  m.range = () => range;
  m.rising = () => tideRising(m.tideTime);

  // 이름표 자리. 그 지형이 실제로 있는 칸만 고른다. 넓은 곳의 안쪽(둘레 두 칸이 모두 같은 종류)에서 무게 중심에 가까운 칸을 고른다.
  function computeSpots() {
    const kinds = new Array(size);
    for (let k = 0; k < size; k++) kinds[k] = m.cellKind(k);
    // 방조제를 쌓은 뒤에는 바깥 갯벌의 이름표가 방조제에서 떨어진 바깥쪽을 가리키게 한다.
    const far = k => !diked() || ((k / N) | 0) > DIKE_J + 8;
    const pick = (want, only = () => true) => {
      let sx = 0, sy = 0, c = 0;
      for (let k = 0; k < size; k++) if (want.includes(kinds[k]) && only(k)) { sx += k % N; sy += (k / N) | 0; c++; }
      if (c < 12) return null;
      const cx = sx / c, cy = sy / c;
      let best = -1, bd = 1e9, any = -1, ad = 1e9;
      for (let k = 0; k < size; k++) {
        if (!want.includes(kinds[k]) || !only(k)) continue;
        const i = k % N, j = (k / N) | 0, d = (i - cx) * (i - cx) + (j - cy) * (j - cy);
        if (d < ad) { ad = d; any = k; }
        if (d >= bd || i < 2 || j < 2 || i > N - 3 || j > N - 3) continue;
        let ok = true;
        for (let dj = -2; dj <= 2 && ok; dj += 2) for (let di = -2; di <= 2 && ok; di += 2) if (!want.includes(kinds[k + dj * N + di])) ok = false;
        if (ok) { bd = d; best = k; }
      }
      const k = best >= 0 ? best : any;
      return { x: k % N, y: (k / N) | 0 };
    };
    const out = {};
    for (const kd of ['sandflat', 'mixflat', 'mudflat', 'marsh']) { const q = pick([kd], far); if (q) out[kd] = q; }
    for (const kd of ['field', 'lake']) { const q = pick([kd]); if (q) out[kd] = q; }
    // 갯골: 갯벌 한가운데쯤의 갯골 칸(하천 줄기는 빼고)
    {
      let best = -1, bd = 1e9, sx = 0, sy = 0, c = 0;
      for (let k = 0; k < size; k++) if (kinds[k] === 'creek' && acc[k] < RIVER_Q && far(k)) { sx += k % N; sy += (k / N) | 0; c++; }
      if (c > 20) {
        const cx = sx / c, cy = sy / c;
        for (let k = 0; k < size; k++) if (kinds[k] === 'creek' && acc[k] < RIVER_Q && acc[k] > 3 * ACC_T && far(k)) { const d = ((k % N) - cx) ** 2 + (((k / N) | 0) - cy) ** 2; if (d < bd) { bd = d; best = k; } }
        if (best >= 0) out.creek = { x: best % N, y: (best / N) | 0 };
      }
    }
    if (m.mouth) {
      const y = Math.max(8, m.mouth.y - 18);
      for (let i = m.mouth.x - 6; i <= m.mouth.x + 6 && !out.river; i++) if (kinds[y * N + i] === 'river') out.river = { x: i, y };
    }
    if (diked()) {
      for (let d = 0; d < 60 && !out.dike; d++) for (const x of [AXIS_X + d, AXIS_X - d]) if (!out.dike && dike[DIKE_J * N + x]) out.dike = { x, y: DIKE_J };
      if (out.field) out.reclaimed = out.field;
    }
    out.sea = { x: AXIS_X + 70, y: N - 14 };
    return out;
  }
  m.spots = () => {
    const out = { ...spotCache };
    const w = m.waterline();
    if (w) out.waterline = w;
    return out;
  };
  // 지금 물가: 갯벌 위에서 물에 잠긴 칸과 드러난 칸이 만나는 곳. 밀물이면 물이 들어오는 중, 썰물이면 빠지는 중이다.
  const WET = [...FLAT_KINDS, 'marsh'];
  m.waterline = () => {
    if (range < 1) return null;
    for (const x of [AXIS_X + 44, AXIS_X - 44, AXIS_X + 64, AXIS_X - 64, AXIS_X + 24, AXIS_X - 24]) {
      for (let j = HEAD_J; j < N - 2; j++) {
        const k = j * N + x, q = k + N;
        if (h[k] >= m.levelAt(k) && h[q] < m.levelAt(q) && WET.includes(m.cellKind(k)) && WET.includes(m.cellKind(q)) && !isInside(k)) return { x, y: j, rising: m.rising() };
      }
    }
    return null;
  };

  m.setOption = (name, val) => { m.options[name] = val; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  // 방조제 쌓기: 갯벌이 다 자란 뒤(정해진 때)에 쌓는다. 이미 다 자랐으면 바로 쌓는다.
  m.requestDike = () => {
    m.options.dike = 'yes';
    if (!diked() && m.clock >= T_FORM - 1e-9) { m.finished = false; buildDike(); updateLevels(); }
  };
  m.setTideTime = t => { m.tideTime = t; updateLevels(); };
  m.reset = () => {
    range = TIDE[m.options.tide].range; amp = range / 2; rate = SUPPLY[m.options.supply].rate; rf = (range / 7) * (range / 7);
    buildMeanDepth();
    roundNo = 0; carry = 0; formed = false; m.clock = 0; m.tideTime = 0; m.finished = false; m.dikeAt = -1; insideCells = null; level0 = 0;
    cut.fill(0); thick.fill(0); dike.fill(0); inside.fill(0); field.fill(0); ditch.fill(0); acc.fill(0); recv.fill(-1);
    buildBase();
    for (let k = 0; k < size; k++) { plat[k] = start[k]; h[k] = start[k]; mud[k] = BED_MUD; }
    updateLevels(); routeFlow(); updateEnergy();
    spotCache = computeSpots();
    m.version++;
  };
  // seconds만큼 시간을 보낸다. 다 자란 뒤에도 밀물과 썰물은 계속 오간다.
  m.tick = seconds => {
    m.tideTime += seconds;
    if (!m.finished) { carry += seconds; while (carry >= ROUND - 1e-9 && !m.finished) { carry -= ROUND; round(); } }
    updateLevels();
  };
  m.phase = () => {
    if (diked()) return m.finished ? 'reclaimed' : 'dike';
    if (m.finished) return 'formed';
    return m.clock < 12 ? 'early' : 'growing';
  };
  m.reset();
  return m;
}

// 단면: 육지(A)에서 만 안쪽을 지나 바다(B)로 자른다. 하천 줄기에서 조금 비켜 갯벌의 띠가 차례로 걸린다.
export const sectionLine = () => ({ ax: AXIS_X + 22, ay: 40, bx: AXIS_X + 22, by: 236 });
export function sectionProfile(m, samples = 240) {
  const S = sectionLine(), out = { start: new Float32Array(samples), top: new Float32Array(samples), level: new Float32Array(samples), mud: new Float32Array(samples), kinds: new Array(samples), S };
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), j = Math.round(S.ay + (S.by - S.ay) * f), k = j * N + S.ax;
    out.start[t] = m.start[k]; out.top[t] = m.h[k]; out.level[t] = m.levelAt(k); out.mud[t] = m.mud[k]; out.kinds[t] = m.cellKind(k);
  }
  return out;
}

// 막대와 판정 문구를 한 번에 만든다. 화면의 숫자와 문구가 같은 집계에서 나온다.
export function flatReport(m) {
  const range = m.range(), size = N * N;
  let sand = 0, mix = 0, mudC = 0, creek = 0, marsh = 0, reclaimed = 0, lake = 0, thick = 0;
  for (let k = 0; k < size; k++) {
    const kd = m.cellKind(k);
    if (kd === 'sandflat') sand++;
    else if (kd === 'mixflat') mix++;
    else if (kd === 'mudflat') mudC++;
    else if (kd === 'creek') creek++;
    else if (kd === 'marsh') marsh++;
    else if (kd === 'lake') lake++;
    else if (kd === 'field' || kd === 'ditch' || kd === 'dryflat') reclaimed++;
    // 쌓인 흙의 두께 = 지금 갯벌 면 - 처음 바닥
    if (kd === 'sandflat' || kd === 'mixflat' || kd === 'mudflat' || kd === 'creek' || kd === 'marsh') thick += m.plat[k] - m.start[k];
  }
  // 염생 식물은 썰물 때 드러나는 갯벌의 가장 높은 곳, 펄 위에 자란다. 그래서 드러나는 넓이와 펄의 몫에 함께 센다.
  const flats = sand + mix + mudC + creek + marsh, kinds = sand + mix + mudC + marsh;
  const flatPct = Math.round((flats / size) * 100);
  const mudPct = kinds ? Math.round(((mudC + marsh) / kinds) * 100) : 0, sandPct = kinds ? Math.round((sand / kinds) * 100) : 0, mixPct = kinds ? 100 - mudPct - sandPct : 0;
  const reclaimedPct = Math.round((reclaimed / size) * 100);
  const thickM = flats ? Math.round((thick / flats) * 10) / 10 : 0;
  const rText = `약 ${range}m`;
  let text;
  if (flats < size * 0.01) text = `조차가 ${rText}로 작아 썰물 때 드러나는 갯벌이 거의 없습니다(블록 넓이의 1% 미만). 밀물과 썰물로 드나드는 바닷물이 적어 고운 흙이 잘 들어오지 않고, 물 밖으로 드러나는 땅도 좁습니다.`;
  else text = `조차가 ${rText}로 ${range >= 5 ? '커서' : range >= 1 ? '보통이라' : '작아'} 썰물 때 블록 넓이의 약 ${flatPct}%가 갯벌로 드러납니다. 갯벌 가운데 펄 갯벌(염생 식물이 자라는 곳 포함)이 약 ${mudPct}%, 혼합 갯벌이 약 ${mixPct}%, 모래 갯벌이 약 ${sandPct}%입니다.`;
  if (reclaimed > 0) text += ` 방조제 안쪽의 갯벌은 블록 넓이의 약 ${reclaimedPct}%만큼 간척지가 되었습니다.`;
  return { range, flats, flatPct, sand, mix, mud: mudC, creek, marsh, lake, mudPct, mixPct, sandPct, reclaimed, reclaimedPct, thickM, text };
}

export function noteText(m) {
  const ph = m.phase();
  const small = m.range() < 1;
  const diked = m.dikeAt >= 0 && m.clock >= m.dikeAt;
  const creekDone = ' 밀물과 썰물이 드나드는 길, 특히 썰물 때 빠지는 물이 모이는 길이 파여 나뭇가지 모양의 갯골이 되었습니다.';
  const loss = ' 간척으로 농경지나 산업 단지를 얻지만, 안쪽의 갯벌과 그 기능(생물이 사는 곳, 오염 물질을 걸러 냄, 홍수 때 물을 받아 줌, 태풍과 해일 피해를 줄임)은 사라집니다.';
  if (diked) {
    if (m.finished) {
      const r = flatReport(m);
      const outside = r.flats < N * N * 0.01 ? ' 방조제 바깥에도 드러나는 갯벌이 거의 없습니다.' : ' 방조제 바깥의 갯벌은 그대로 남아 밀물과 썰물이 드나듭니다.';
      const lake = r.lake > 0 ? ' 방조제 안쪽의 낮은 곳에는 바닷물과 끊긴 물이 고여 호수로 남았습니다.' : '';
      if (r.reclaimed === 0) return `방조제가 바닷물을 막았지만, 조차가 작아 안쪽에 드러난 갯벌이 거의 없어 간척지가 생기지 않았습니다. 안쪽은 바닷물과 끊긴 물로 남았습니다.${outside}`;
      return `방조제가 바닷물을 막아 안쪽 갯벌이 마른 땅이 되었고, 논으로 쓰는 간척지가 되었습니다. ${r.text}${lake}${outside}${loss}`;
    }
    return '방조제를 쌓아 바닷물을 막았습니다. 안쪽에는 밀물이 들어오지 않아 물이 빠지고 갯벌이 마르기 시작합니다. 작은 갯골은 메워지고 큰 갯골은 물을 빼는 배수로가 됩니다. 염생 식물이 자라던 곳도 마른 땅으로 바뀝니다.';
  }
  if (m.finished) {
    const r = flatReport(m);
    if (small) return `${r.text} 그래서 조차가 작은 동해안에는 갯벌이 거의 없습니다. 갯벌이 생기려면 조차가 크고, 바닥의 경사가 완만하며, 하천이 고운 흙을 실어 오고, 파랑이 약한 곳이어야 합니다.`;
    let t = `${r.text} 물살이 느린 만 안쪽에는 펄이, 물살이 빠른 바깥쪽에는 모래가 쌓였습니다.${creekDone}`;
    if (r.marsh > 0) t += ' 가장 높은 곳에는 갈대, 칠면초 같은 염생 식물이 자랍니다.';
    else if (m.range() < 5) t += ' 조차가 보통이라 갯벌이 염생 식물이 자랄 만큼 높아지지 않았습니다.';
    if (m.options.supply === 'low') t += ` 토사가 적어 흙이 얇게(평균 약 ${r.thickM}m) 쌓였습니다.`;
    if (m.options.supply === 'high') t += ` 토사가 많아 흙이 두껍게(평균 약 ${r.thickM}m) 쌓였고, 갯벌이 높아져 염생 식물이 자라는 곳이 넓어졌습니다.`;
    t += ' 갯벌은 많은 생물이 사는 곳이고, 오염 물질을 걸러 내며, 홍수 때 물을 받아 주고 태풍과 해일 피해를 줄여 줍니다.';
    return t;
  }
  if (small) return '조차가 작아 밀물과 썰물 때의 바닷물 높이가 거의 같습니다. 드나드는 바닷물이 적어 고운 흙이 잘 들어오지 않고, 썰물 때 물 밖으로 드러나는 땅도 거의 없습니다.';
  if (ph === 'early') return '밀물 때 바닷물이 만 안으로 들어오며 바다와 하천에서 온 고운 흙을 싣고 옵니다. 물살이 느려지는 만 안쪽에서 흙이 가라앉아 쌓이기 시작합니다. 썰물 때는 물이 빠져 바닥이 드러납니다.';
  return '고운 흙(펄)은 물살이 느리고 물이 오래 머무는 만 안쪽과 높은 곳에 쌓이고, 물살이 빠른 바깥쪽에는 모래가 남습니다. 밀물과 썰물이 드나드는 길, 특히 썰물 때 빠지는 물이 모이는 길이 파여 나뭇가지 모양의 갯골이 됩니다. 흙이 쌓일수록 갯벌이 밀물 때 해수면 가까이 높아집니다.';
}

export function compareBrief(a, b) {
  const t = m => { const r = flatReport(m); return r.flats < N * N * 0.01 ? `조차가 약 ${r.range}m라 썰물 때 드러나는 갯벌이 거의 없습니다` : `조차가 약 ${r.range}m라 썰물 때 블록 넓이의 약 ${r.flatPct}%가 갯벌로 드러납니다`; };
  return { a: t(a), b: t(b) };
}
