// © 2026 김용현
// 고위 평탄면과 저위 평탄면 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 블록은 위가 북쪽, 오른쪽(동쪽) 끝이 동해다. 처음 땅은 오랫동안 깎여 낮고 평평해진 땅으로, 낮은 구릉 사이로 긴 하천이 굽이쳐 서쪽으로 흐르고
// 동쪽 끝에서는 짧은 하천이 바다로 흐른다.
// 땅이 솟으면(경동성 요곡 운동은 동쪽이 크게, 서쪽이 조금) 하천의 바닥은 바다(기준면)보다 그만큼 높아진다. 하천은 다시 바닥을 파고들고(하각),
// 파인 곳과 아직 파이지 않은 곳 사이의 급경사 지점은 하류(하구)에서 상류로 거슬러 올라간다. 물이 많은 큰 하천일수록 빨리, 작은 하천일수록 느리게 오른다.
// 골짜기의 비탈은 하천 바닥에서 일정한 기울기로 올라가고, 하천에서 멀어 비탈이 닿지 않는 높은 곳은 옛 평탄한 땅 그대로 남는다(고위 평탄면).
// 두 번 솟는 조건에서는 솟기를 멈춘 동안 하천이 옆으로 골짜기를 넓게 깎아 낮고 평평한 땅을 만들고, 다시 솟은 뒤 하천이 그 안을 또 파면
// 평평한 땅이 골짜기 위에 계단처럼 남는다(저위 평탄면).
// 지형 계산에는 사칙연산과 제곱근, 내림, 올림, 반올림, 큰 값, 작은 값, 절댓값만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 256;
export const ROUND = 0.2; // 계산 한 번의 때(초)
export const H_M = 20; // 높이 한 단위가 나타내는 높이(m)
export const CELL_M = 100; // 칸 한 변이 나타내는 거리(m)
export const XD = 188; // 분수계(가장 크게 솟는 줄)
export const COAST = 236; // 해안선의 평균 자리
export const T_UP = 8; // 땅이 솟기 시작하는 때(초)
export const T_USE = 78; // 고위 평탄면을 쓰기 시작하는 때(초)
export const T_END = 88; // 끝나는 때(초)
const KZ = 5; // 급경사 지점이 한 칸을 다 파는 데 걸리는 때(초)
const T_F1 = 9, T_F2 = 47; // 하각이 하구에서 시작하는 때(첫째, 둘째)
const PLAN = {
  one: { up1: [T_UP, 24], a1: 1, a2: 0 },
  two: { up1: [T_UP, 20], a1: 0.6, a2: 0.4, pause: [26, 44], up2: [46, 56] },
};
const ACH = 140; // 서쪽에서 이만큼 넘는 칸에서 물이 모이면 하천으로 본다(동쪽은 ACH_CUT_E)
const ACH_CUT = 260, ACH_CUT_E = 30; // 이만큼 넘게 물이 모이는 하천만 바닥을 다시 판다(서쪽, 동쪽). 작은 물줄기는 큰 하천을 따라 내려간다.
const ACH_F = 400; // 옆으로 골짜기를 넓히는 하천(이만큼 넘게 물이 모이는 서쪽 하천)
export const HIGH_U = 8; // 이만큼(160m) 넘게 솟은 곳의 평평한 땅만 고위 평탄면으로 센다
export const HIGH_SHAPE = 0.4; // 가장 크게 솟는 곳의 이 비율 넘게 솟는 높은 쪽만 센다(서쪽 끝의 조금 솟은 평평한 땅은 빼고)
export const FLAT_SLOPE = 0.45; // 이보다 완만한 곳을 평평하다고 본다(칸마다 높이 단위)
export const LOW_STEP = 1.5; // 지금 하천보다 이만큼(30m) 넘게 높은 넓은 바닥만 저위 평탄면으로 센다
const SIG = 1.5; // 골짜기 비탈의 기울기(칸마다 높이 단위)

export const LIFT = {
  small: { name: '작음', amp: 26 },
  mid: { name: '보통', amp: 45 },
  big: { name: '큼', amp: 54 },
};
export const MODE = { tilt: { name: '동쪽이 더 솟음' }, even: { name: '고르게 솟음' } };
export const TIMES = { one: { name: '한 번' }, two: { name: '두 번' } };
export const PRESETS = {
  textbook: { lift: 'mid', mode: 'tilt', times: 'two' },
  once: { lift: 'mid', mode: 'tilt', times: 'one' },
  even: { lift: 'mid', mode: 'even', times: 'two' },
  big: { lift: 'big', mode: 'tilt', times: 'two' },
};
export const KIND = { land: 0, sea: 1, water: 2, high: 3, low: 4 };
export const KIND_NAME = ['land', 'sea', 'water', 'high', 'low'];

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
// 굽이: 사인 대신 다듬은 세모꼴(3차식). u의 한 주기마다 -1에서 1 사이를 오간다.
function wave(u) {
  const f = u - Math.floor(u), w = 2 * Math.abs(2 * f - 1) - 1;
  return w * (1.5 - 0.5 * w * w);
}
const NB = [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1], [-1, -1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [1, 1, 1.4142]];

// 땅이 솟는 모양(0에서 1). 동쪽이 더 솟으면 서쪽 끝 0.12에서 분수계 1까지 점점 커지고, 분수계에서 해안까지는 휘어 내려간다.
// 고르게 솟으면 분수계 서쪽은 어디나 같고(동쪽이 더 솟는 경우의 평균과 비슷하게), 해안 쪽만 같은 모양으로 휘어 내려간다.
export function liftShape(i, xc, mode) {
  if (i >= xc) return 0;
  const top = mode === 'even' ? 0.55 : 1;
  if (i > XD) { const q = clamp((i - XD) / (xc - XD)); return top * (1 - q * q * (3 - 2 * q)); }
  if (mode === 'even') return top;
  const s = clamp(i / XD);
  return 0.12 + 0.88 * s * Math.sqrt(s);
}

export function createModel(seed = 7) {
  const size = N * N;
  const h = new Float32Array(size), surf = new Float32Array(size), start = new Float32Array(size), reg = new Float32Array(size), hill = new Float32Array(size);
  const shape = new Float32Array(size), sig = new Float32Array(size), bed = new Float32Array(size), floorLv = new Float32Array(size), val = new Float32Array(size), cutB = new Float32Array(size);
  const base = new Float32Array(size), baseC = new Float32Array(size), tau = new Float32Array(size), flowD = new Float32Array(size), acc = new Float32Array(size), chDepth = new Float32Array(size);
  const land = new Uint8Array(size), east = new Uint8Array(size), chan = new Uint8Array(size), water = new Uint8Array(size), kinds = new Uint8Array(size), useK = new Uint8Array(size), seen = new Uint8Array(size);
  const recv = new Int32Array(size), order = new Int32Array(size), near = new Int32Array(size), xcRow = new Float32Array(N);
  const nearD = new Float32Array(size), widthF = new Float32Array(size), rw = new Float32Array(size);
  let landCells = null, chanCells = null, stem = [], kindsVersion = -1, spotCache = {}, jS = N / 2, useNoise = null;

  const m = {
    h, surf, start, shape, acc, recv, land, chan, east, seed,
    options: { ...PRESETS.textbook }, clock: 0, finished: false, version: 0, turbines: [], useFrac: 0,
  };
  let roundNo = 0, carry = 0;
  const plan = () => PLAN[m.options.times];
  const amp = () => LIFT[m.options.lift].amp;

  // 처음 땅: 서쪽으로 아주 완만하게 낮아지는 낮은 땅, 낮은 구릉, 하천이 흐르는 얕은 골짜기. 동쪽 끝은 짧게 낮아져 바다에 닿는다.
  const wig = makeNoise(seed + 2, 11), hillN = makeNoise(seed + 5, 34), hill2 = makeNoise(seed + 9, 13), fine = makeNoise(seed + 13, 5), sigN = makeNoise(seed + 21, 17);
  const ph = makeRng(seed * 3 + 1)();
  // 큰 하천 두 줄기의 중심선. A는 분수계 가까이에서 시작해 서쪽 끝(남서)으로 나가고, B는 남동쪽에서 와서 A에 합류한다.
  const A0 = 170, A1 = 50, B0i = 84, B1 = 214;
  const jA = i => A0 + (A1 - A0) * (i / (XD - 6)) + 10 * wave(i / 48 + ph);
  const jB = i => jA(B0i) + (B1 - jA(B0i)) * ((i - B0i) / (XD - 6 - B0i)) + 8 * wave(i / 40 + ph + 0.3) * smooth(B0i, B0i + 25, i);
  const zc = i => 0.5 + 2.7 * (i / XD); // 하천 바닥 높이(처음)
  function buildBase() {
    for (let j = 0; j < N; j++) xcRow[j] = COAST + (wig(3, j) - 0.5) * 12;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, xc = xcRow[j];
      land[k] = i < xc ? 1 : 0;
      let r, hl = 0;
      if (!land[k]) {
        r = -0.6 - 0.9 * (i - xc) + (fine(i, j) - 0.5) * 0.2;
        if (r < -14) r = -14;
      } else {
        if (i <= XD) r = 0.6 + 3.2 * (i / XD);
        else { const q = clamp((i - XD) / (xc - XD)), o = 1 - q; r = 0.25 + 3.55 * o * Math.sqrt(o); }
        // 낮은 구릉: 해안 가까이와 블록 가장자리에서는 낮아진다.
        hl = ((hillN(i, j) - 0.5) * 2.6 + (hill2(i, j) - 0.5) * 0.9 + (fine(i, j) - 0.5) * 0.25) * clamp((xc - i) / 10);
        // 동해 쪽: 분수계에서 바다로 곧장 내려가는 짧은 하천의 얕은 골짜기(약 22칸마다)
        if (i > XD - 6) {
          const u = (j - 8 + (wig(i, 40) - 0.5) * 14 + (hillN(i * 0.5, j * 1.3) - 0.5) * 26) / 22, d = Math.abs(u - Math.round(u)) * 22;
          hl -= (0.6 + 0.6 * hill2(40, j)) * (1 - smooth(1, 9, d)) * smooth(XD - 6, XD + 8, i);
        }
        // 북쪽과 남쪽 끝은 조금 높여 물이 블록 가장자리를 따라 흐르지 않게 한다.
        hl += 1.6 * (1 - smooth(0, 10, Math.min(j, N - 1 - j))) * clamp((xc - i) / 10);
        // 하천 골짜기: 중심선에서 멀어질수록 둘레 땅 높이로 돌아온다. 분수계 가까이에서는 골짜기가 얕아진다.
        for (const [cj, i0] of [[jA(i), 0], [i >= B0i ? jB(i) : -999, B0i]]) {
          if (i < i0 || i > XD - 4) continue;
          const d = Math.abs(j - cj), fade = 1 - smooth(XD - 30, XD - 4, i), vf = zc(i);
          if (d < 20) { const tgt = vf + (r + hl - vf) * smooth(1.5, 20, d); const v = r + hl + (tgt - r - hl) * fade; hl = v - r; }
        }
      }
      reg[k] = r; hill[k] = hl; start[k] = r + hl;
      sig[k] = SIG * (0.8 + 0.4 * sigN(i, j));
    }
    let n = 0;
    for (let k = 0; k < size; k++) if (land[k]) n++;
    landCells = new Int32Array(n); n = 0;
    for (let k = 0; k < size; k++) if (land[k]) landCells[n++] = k;
  }

  // 물길: 바다와 서쪽 끝 하구에서부터 낮은 칸 차례로 넓혀 가며(우선순위 채우기) 물이 흘러갈 칸을 정하고, 높은 칸부터 물을 넘겨 모이는 양을 센다.
  const heapK = new Int32Array(size), heapV = new Float32Array(size);
  let heapN = 0;
  const less = (a, b) => heapV[a] < heapV[b] || (heapV[a] === heapV[b] && heapK[a] < heapK[b]);
  const swap = (a, b) => { const k = heapK[a], v = heapV[a]; heapK[a] = heapK[b]; heapV[a] = heapV[b]; heapK[b] = k; heapV[b] = v; };
  function push(k, v) { let c = heapN++; heapK[c] = k; heapV[c] = v; while (c > 0) { const p = (c - 1) >> 1; if (!less(c, p)) break; swap(c, p); c = p; } }
  function pop() {
    const k = heapK[0]; heapN--;
    if (heapN > 0) {
      heapK[0] = heapK[heapN]; heapV[0] = heapV[heapN];
      let c = 0;
      for (;;) { const l = 2 * c + 1, r = l + 1; let b = c; if (l < heapN && less(l, b)) b = l; if (r < heapN && less(r, b)) b = r; if (b === c) break; swap(c, b); c = b; }
    }
    return k;
  }
  function buildNetwork() {
    seen.fill(0); recv.fill(-1); heapN = 0;
    const rr = makeRng(seed * 5 + 3);
    const route = val;
    const outJ = Math.round(jA(0));
    m.outlet = outJ * N;
    for (let k = 0; k < size; k++) {
      if (land[k]) continue;
      const i = k % N, j = (k / N) | 0;
      // 해안에 닿은 바다 칸만 넣는다.
      let coast = false;
      for (const [di, dj] of NB) { const x = i + di, y = j + dj; if (x >= 0 && x < N && y >= 0 && y < N && land[y * N + x]) coast = true; }
      seen[k] = 1;
      if (coast) { route[k] = 0; push(k, 0); east[k] = 1; }
    }
    // 서쪽 끝은 블록 밖으로 이어지는 하천의 하구다.
    for (let j = 3; j < N - 3; j++) { const k = j * N; seen[k] = 1; route[k] = start[k]; east[k] = 0; push(k, start[k]); }
    let n = 0;
    while (heapN > 0) {
      const c = pop(), i = c % N, j = (c / N) | 0;
      if (land[c]) order[n++] = c;
      for (const [di, dj] of NB) {
        const x = i + di, y = j + dj;
        if (x < 0 || x >= N || y < 0 || y >= N) continue;
        const o = y * N + x;
        if (seen[o] || !land[o]) continue;
        seen[o] = 1; recv[o] = c; east[o] = east[c];
        route[o] = Math.max(start[o], route[c] + 1e-4 + rr() * 0.03); // 평평한 곳에서 물길이 곧게 뻗지 않게 아주 작은 울퉁불퉁함을 더한다.
        push(o, route[o]);
      }
    }
    // 서쪽 끝 하구 칸은 블록 밖으로 흘러 나간다.
    for (let j = 3; j < N - 3; j++) recv[j * N] = -1;
    acc.fill(0);
    for (let t = 0; t < n; t++) acc[order[t]] = 1;
    for (let t = n - 1; t >= 0; t--) { const k = order[t], r = recv[k]; if (r >= 0 && land[r]) acc[r] += acc[k]; }
    m.orderN = n;
    // 하구에서 물길을 따라 잰 거리, 하천이 다시 파일 때 닿을 바닥 높이(하구에 맞춘 완만한 곡선), 급경사 지점이 닿는 때
    for (let t = 0; t < n; t++) {
      const k = order[t], r = recv[k];
      const len = r >= 0 ? ((r % N) !== (k % N) && ((r / N) | 0) !== ((k / N) | 0) ? 1.4142 : 1) : 1;
      flowD[k] = (r >= 0 && land[r] ? flowD[r] : 0) + len;
      // 급경사 지점이 오르는 빠르기는 모이는 물이 많을수록 빠르다(물의 양의 0.75제곱에 비례). 그래서 물이 적은 상류에서는 느려진다.
      tau[k] = (r >= 0 && land[r] ? tau[r] : 0) + len / (Math.sqrt(acc[k]) * Math.sqrt(Math.sqrt(acc[k])));
      const d = flowD[k];
      // 다시 파인 하천 바닥은 하구에서 상류로 갈수록 완만하게 높아진다. 솟은 높이의 일부(baseC)만큼 더 높아 골짜기 깊이가 솟은 높이를 넘지 않는다.
      base[k] = east[k] ? 5 * d / (d + 22) : 0.4 + 2.5 * d / (d + 120);
      baseC[k] = east[k] ? 0.3 : 0.45;
      chDepth[k] = 0.15 + 0.06 * Math.sqrt(Math.sqrt(acc[k]));
    }
    // 본류: 하구에서 물이 가장 많이 모이는 쪽으로 거슬러 오른다.
    const bestUp = new Int32Array(size).fill(-1);
    for (let t = 0; t < n; t++) { const k = order[t], r = recv[k]; if (r >= 0 && land[r] && (bestUp[r] < 0 || acc[k] > acc[bestUp[r]])) bestUp[r] = k; }
    stem = [];
    let c = outJ * N;
    for (let j = 3; j < N - 3; j++) if (acc[j * N] > acc[c]) c = j * N;
    m.outlet = c;
    while (c >= 0 && acc[c] >= ACH) { stem.push(c); c = bestUp[c]; }
    // 빠르기 맞추기: 서쪽 하천은 본류의 62% 지점에 17초에, 동쪽 하천은 가장 긴 하천의 끝에 26초에 급경사 지점이 닿게 한다.
    const sW = 17 / tau[stem[Math.floor(stem.length * 0.62)]];
    let eMax = 0;
    for (let t = 0; t < n; t++) { const k = order[t]; if (east[k] && acc[k] >= ACH_CUT_E && tau[k] > eMax) eMax = tau[k]; }
    const sE = eMax > 0 ? 26 / eMax : 1;
    for (let t = 0; t < n; t++) { const k = order[t]; tau[k] *= east[k] ? sE : sW; }
    // 동해 쪽 비탈은 짧고 급한 하천이 좁고 가파른 골짜기를 판다.
    for (const k of landCells) if (east[k]) sig[k] *= 1.45;
    // 하천 칸과 물이 흐르는 너비
    chan.fill(0);
    let c2 = 0;
    for (const k of landCells) if (acc[k] >= (east[k] ? ACH_CUT_E : ACH)) { chan[k] = acc[k] >= (east[k] ? ACH_CUT_E : ACH_CUT) ? 2 : 1; c2++; }
    chanCells = new Int32Array(c2); c2 = 0;
    for (const k of landCells) if (chan[k]) chanCells[c2++] = k;
    for (const k of chanCells) { rw[k] = Math.min(1.7, 0.15 * Math.sqrt(Math.sqrt(acc[k]))); widthF[k] = !east[k] && acc[k] >= ACH_F ? Math.min(30, 3 * Math.sqrt(Math.sqrt(acc[k]))) : 0; }
    // 가장 가까운 하천 칸(두 번 훑어 넓힌다)
    near.fill(-1); nearD.fill(1e9);
    // 바닥을 다시 파는 하천만 센다. 작은 물줄기는 제 칸에만 물이 흐른다.
    for (const k of chanCells) if (chan[k] === 2) { near[k] = k; nearD[k] = 0; }
    const relax = k => {
      const i = k % N, j = (k / N) | 0;
      for (const [di, dj] of NB) {
        const x = i + di, y = j + dj;
        if (x < 0 || x >= N || y < 0 || y >= N) continue;
        const c3 = near[y * N + x];
        if (c3 < 0) continue;
        const dx = (c3 % N) - i, dy = ((c3 / N) | 0) - j, d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearD[k]) { nearD[k] = d; near[k] = c3; }
      }
    };
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < size; k++) if (land[k]) relax(k);
      for (let k = size - 1; k >= 0; k--) if (land[k]) relax(k);
    }
    // 단면: 본류가 블록 가운데쯤(동서 110번째 줄)을 지나는 줄
    jS = Math.max(40, Math.min(N - 40, Math.round(jA(110))));
  }

  const P = (iv, t) => (iv ? smooth(iv[0], iv[1], t) : 0);
  // 지금까지 솟은 비율(첫째와 둘째 융기를 합한 것과 둘째만)
  const liftNow = t => { const p = plan(); return p.a1 * P(p.up1, t) + p.a2 * P(p.up2, t); };
  const lift2Now = t => { const p = plan(); return p.a2 * P(p.up2, t); };
  // 첫째 하각이 낮추는 바닥(둘째 융기 때 g2만큼 함께 솟는다)과 둘째 하각이 낮추는 바닥
  const target1 = (k, g2) => base[k] + baseC[k] * shape[k] * amp() * plan().a1 + shape[k] * g2;
  const target2 = k => base[k] + baseC[k] * shape[k] * amp() * (plan().a1 + plan().a2);
  const phi = (k, t0, t) => smooth(0, KZ, t - t0 - tau[k]);

  // 지금 때의 땅을 다시 계산한다. 솟은 원래 땅(surf)에서, 하천 바닥과 넓게 깎인 바닥을 출발점으로 일정한 기울기의 비탈을 이어 낮은 쪽을 택한다.
  function evaluate() {
    // 오늘날의 이용 단계에서는 땅 모양이 더 바뀌지 않는다.
    const t = Math.min(m.clock, T_USE), g = liftNow(t) * amp(), g2 = lift2Now(t) * amp(), p = plan();
    const erode = 1 - 0.25 * smooth(0, T_UP, t); // 솟기 전 오랜 침식으로 구릉이 조금 더 낮아진다.
    for (let k = 0; k < size; k++) {
      if (!land[k]) { surf[k] = h[k] = start[k]; val[k] = 0; continue; }
      const s = reg[k] + hill[k] * erode + shape[k] * g;
      surf[k] = s; val[k] = s; floorLv[k] = 1e9;
    }
    // 하천 바닥: 첫째 하각은 하구에서 거슬러 오르며 바닥을 하구에 맞춘 높이(base)까지 낮춘다. 그 바닥은 둘째 융기 때 함께 솟고, 둘째 하각이 다시 낮춘다.
    for (const k of chanCells) {
      let b = surf[k] - chDepth[k];
      if (chan[k] !== 2) { bed[k] = b; continue; }
      b += (Math.min(b, target1(k, g2)) - b) * phi(k, T_F1, t);
      if (p.a2 > 0) b += (Math.min(b, target2(k)) - b) * phi(k, T_F2, t);
      bed[k] = b;
    }
    // 솟기를 멈춘 동안 넓게 깎인 바닥: 첫째 하각이 이미 지나간 서쪽 큰 하천 둘레
    const wf = p.pause ? smooth(p.pause[0], p.pause[1], t) : 0;
    const tw = p.pause ? Math.min(t, p.pause[1]) : 0;
    for (const k of landCells) {
      if (chan[k] === 1) { water[k] = 1; if (bed[k] < val[k]) val[k] = bed[k]; }
      else water[k] = 0;
      const n = near[k];
      if (n < 0) continue;
      const d = nearD[k];
      if (d <= rw[n]) { water[k] = 1; if (bed[n] < val[k]) val[k] = bed[n]; continue; }
      if (water[k]) continue;
      if (wf > 0 && widthF[n] > 0 && d < widthF[n] * wf && phi(n, T_F1, tw) > 0.98) {
        const F = target1(n, g2);
        floorLv[k] = F;
        if (F < val[k]) val[k] = F;
      }
    }
    // 비탈: 이웃 칸보다 기울기만큼만 높을 수 있다(앞뒤로 두 번 훑는다). 바다 칸은 해수면 높이로 친다.
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      if (!land[k]) continue;
      const s = sig[k], s2 = s * 1.4142;
      let v = val[k];
      if (i > 0 && val[k - 1] + s < v) v = val[k - 1] + s;
      if (j > 0) {
        if (val[k - N] + s < v) v = val[k - N] + s;
        if (i > 0 && val[k - N - 1] + s2 < v) v = val[k - N - 1] + s2;
        if (i < N - 1 && val[k - N + 1] + s2 < v) v = val[k - N + 1] + s2;
      }
      val[k] = v;
    }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
      const k = j * N + i;
      if (!land[k]) continue;
      const s = sig[k], s2 = s * 1.4142;
      let v = val[k];
      if (i < N - 1 && val[k + 1] + s < v) v = val[k + 1] + s;
      if (j < N - 1) {
        if (val[k + N] + s < v) v = val[k + N] + s;
        if (i < N - 1 && val[k + N + 1] + s2 < v) v = val[k + N + 1] + s2;
        if (i > 0 && val[k + N - 1] + s2 < v) v = val[k + N - 1] + s2;
      }
      val[k] = v;
    }
    // 깎인 깊이를 두 번 고르게 다듬어 비탈의 꺾임을 둥글게 한다. 물이 흐르는 칸은 그대로 둔다.
    for (const k of landCells) cutB[k] = surf[k] - val[k];
    for (let pass = 0; pass < 2; pass++) {
      for (const k of landCells) {
        if (water[k]) { val[k] = cutB[k]; continue; }
        const i = k % N;
        let s = cutB[k] * 4, c = 4;
        if (i > 0 && land[k - 1]) { s += cutB[k - 1]; c++; }
        if (i < N - 1 && land[k + 1]) { s += cutB[k + 1]; c++; }
        if (k >= N && land[k - N]) { s += cutB[k - N]; c++; }
        if (k < size - N && land[k + N]) { s += cutB[k + N]; c++; }
        val[k] = Math.max(0, s / c);
      }
      for (const k of landCells) cutB[k] = val[k];
    }
    for (const k of landCells) h[k] = surf[k] - cutB[k];
    updateUse();
  }
  function updateUse() {
    m.useFrac = smooth(T_USE, T_USE + 6, m.clock);
    if (m.useFrac > 0 && !m.turbines.length) placeUse();
  }

  // 칸의 종류: 바다, 하천, 고위 평탄면(솟은 옛 평탄한 땅이 깎이지 않고 평평하게 남은 곳), 저위 평탄면(넓게 깎인 바닥이 지금 하천보다 높이 남은 곳), 그 밖의 땅
  const slopeAt = k => {
    const i = k % N, j = (k / N) | 0;
    const a = h[i > 0 ? k - 1 : k], b = h[i < N - 1 ? k + 1 : k], c = h[j > 0 ? k - N : k], d = h[j < N - 1 ? k + N : k];
    const dx = (b - a) / 2, dy = (d - c) / 2;
    return Math.sqrt(dx * dx + dy * dy);
  };
  m.slopeAt = slopeAt;
  function classify() {
    if (kindsVersion === m.version) return;
    kindsVersion = m.version;
    const g = liftNow(m.clock) * amp();
    for (let k = 0; k < size; k++) {
      if (!land[k]) { kinds[k] = KIND.sea; continue; }
      if (water[k]) { kinds[k] = KIND.water; continue; }
      const flat = slopeAt(k) < FLAT_SLOPE;
      if (flat && h[k] >= surf[k] - 0.25 && shape[k] >= HIGH_SHAPE && shape[k] * g >= HIGH_U) { kinds[k] = KIND.high; continue; }
      const n = near[k];
      if (flat && floorLv[k] < 1e8 && h[k] >= floorLv[k] - 0.3 && floorLv[k] - bed[n] >= LOW_STEP) { kinds[k] = KIND.low; continue; }
      kinds[k] = KIND.land;
    }
  }
  m.kinds = () => { classify(); return kinds; };
  m.cellKind = k => { classify(); return KIND_NAME[kinds[k]]; };
  m.bedOf = k => bed[k];
  m.floorOf = k => floorLv[k];
  m.nearest = k => near[k];
  m.isWater = k => water[k] === 1;
  m.lifted = k => shape[k] * liftNow(m.clock) * amp();
  m.coastAt = j => xcRow[j];
  m.useKind = k => useK[k];
  m.sectionRow = () => jS;
  m.stem = () => stem;

  // 오늘날 이용: 고위 평탄면의 조각마다 고랭지 밭, 목장, 숲을 나누고, 높은 곳에 풍력 발전기를 띄엄띄엄 세운다.
  function placeUse() {
    classify();
    useNoise = useNoise ?? makeNoise(seed + 41, 15);
    useK.fill(0);
    for (const k of landCells) {
      if (kinds[k] !== KIND.high) continue;
      const v = useNoise(k % N, (k / N) | 0);
      useK[k] = v < 0.42 ? 1 : v > 0.62 ? 2 : 0;
    }
    // 풍력 발전기: 실제 대관령처럼 고위 평탄면 둘레의 바람이 센 능선에 세운다. 고위 평탄면에서 5칸 안에 있는 고위 평탄면 밖의 칸 가운데
    // 거의 깎이지 않은 능선 꼭대기(원래 땅보다 1 단위 안쪽으로만 낮고, 둘레보다 낮지 않은 곳)를 높은 곳부터, 서로 14칸 넘게 떨어지게 고른다.
    const cand = [];
    for (const k of landCells) {
      const i = k % N, j = (k / N) | 0;
      if (kinds[k] !== KIND.land || i < 8 || j < 8 || i > N - 9 || j > N - 9 || h[k] < surf[k] - 1 || shape[k] < HIGH_SHAPE) continue;
      let ridge = true;
      for (const o of [k - 2, k + 2, k - 2 * N, k + 2 * N]) if (h[o] > h[k] + 0.6) ridge = false;
      if (!ridge) continue;
      let nearHigh = false;
      for (let dj = -5; dj <= 5 && !nearHigh; dj++) for (let di = -5; di <= 5 && !nearHigh; di++) if (kinds[k + dj * N + di] === KIND.high) nearHigh = true;
      if (nearHigh) cand.push(k);
    }
    const r = makeRng(seed * 13 + 5), key = new Map();
    for (const k of cand) key.set(k, h[k] + r() * 3);
    cand.sort((a, b) => key.get(b) - key.get(a) || a - b);
    const out = [];
    for (const k of cand) {
      const i = k % N, j = (k / N) | 0;
      if (out.some(q => (q.x - i) * (q.x - i) + (q.y - j) * (q.y - j) < 14 * 14)) continue;
      out.push({ x: i, y: j });
      if (out.length >= 14) break;
    }
    m.turbines = out;
  }

  // 급경사 지점: 본류에서 지금 파고 있는 곳(하구에서 잰 거리, 칸). 파인 깊이가 거의 없거나 다 지나갔으면 -1이다.
  m.knick = () => {
    const t = m.clock, p = plan();
    if (t >= T_USE) return null;
    const t0 = p.a2 > 0 && t >= T_F2 ? T_F2 : T_F1;
    if (t < t0 || liftNow(t) < 0.05) return null;
    for (const k of stem) {
      const f = phi(k, t0, t);
      if (f < 0.5) {
        const drop = surf[k] - chDepth[k] - (t0 === T_F2 ? target2(k) : target1(k, lift2Now(t) * amp()));
        if (drop < 2) return null;
        return { k, x: k % N, y: (k / N) | 0, dist: flowD[k] };
      }
    }
    return null;
  };
  m.knickDist = () => { const q = m.knick(); return q ? q.dist : -1; };

  // 이름표 자리. 그 지형이 실제로 있는 칸만 고른다. 넓은 곳은 둘레에서 가장 먼 안쪽 칸을 고른다.
  // 블록 가장자리 12칸 안쪽만 고른다(이름표가 블록 밖으로 떠 보이지 않게).
  function interior(want0) {
    const want = k => { const i = k % N, j = (k / N) | 0; return i >= 12 && j >= 12 && i < N - 12 && j < N - 12 && want0(k); };
    classify();
    const dist = new Float32Array(size);
    let any = false;
    for (let k = 0; k < size; k++) { dist[k] = want(k) ? 1e6 : 0; if (dist[k]) any = true; }
    if (!any) return null;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; if (!dist[k]) continue; let v = dist[k]; if (i > 0) v = Math.min(v, dist[k - 1] + 1); if (j > 0) v = Math.min(v, dist[k - N] + 1); if (i === 0 || j === 0) v = Math.min(v, 1); dist[k] = v; }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) { const k = j * N + i; if (!dist[k]) continue; let v = dist[k]; if (i < N - 1) v = Math.min(v, dist[k + 1] + 1); if (j < N - 1) v = Math.min(v, dist[k + N] + 1); if (i === N - 1 || j === N - 1) v = Math.min(v, 1); dist[k] = v; }
    let best = -1;
    for (let k = 0; k < size; k++) if (dist[k] > 0 && (best < 0 || dist[k] > dist[best])) best = k;
    return best < 0 || dist[best] < 2 ? null : { x: best % N, y: (best / N) | 0, r: dist[best] };
  }
  function computeSpots() {
    classify();
    const out = {}, g = liftNow(m.clock) * amp();
    const hi = interior(k => kinds[k] === KIND.high);
    if (hi) out.high = hi;
    const lo = interior(k => kinds[k] === KIND.low);
    if (lo) out.low = lo;
    // 깊은 골짜기: 서쪽 하천 가운데 원래 땅보다 가장 깊이 파인 곳
    let dv = -1, dd = 0;
    for (const k of chanCells) if (!east[k] && surf[k] - h[k] > dd) { dd = surf[k] - h[k]; dv = k; }
    if (dv >= 0 && dd * H_M >= 100) out.valley = { x: dv % N, y: (dv / N) | 0 };
    // 동쪽 급경사와 서쪽 완만한 비탈: 땅이 서쪽으로 기울었을 때만
    if (m.options.mode === 'tilt' && g >= HIGH_U) {
      const j = N / 2 + 6;
      let bk = -1, bs = 0;
      for (let i = XD + 6; i < xcRow[j] - 6; i++) { const k = j * N + i; if (!water[k] && slopeAt(k) > bs) { bs = slopeAt(k); bk = k; } }
      if (bk >= 0) out.scarp = { x: bk % N, y: j };
      for (let dj = 0; dj < 60 && !out.gentle; dj += 4) for (const jj of [N / 2 - 20 + dj, N / 2 - 20 - dj]) {
        const k = jj * N + 62;
        if (!out.gentle && kinds[k] !== KIND.water && surf[k] - h[k] < 1) out.gentle = { x: 62, y: jj };
      }
    }
    const kn = m.knick();
    if (kn) out.knick = { x: kn.x, y: kn.y };
    // 서쪽으로 흐르는 하천(본류 가운데쯤), 동해로 흐르는 짧은 하천(가장 큰 동쪽 하천의 가운데)
    if (stem.length) { const k = stem[Math.floor(stem.length * 0.45)]; out.westRiver = { x: k % N, y: (k / N) | 0 }; }
    let ek = -1;
    for (const k of chanCells) if (east[k] && (ek < 0 || acc[k] > acc[ek])) ek = k;
    if (ek >= 0) { let c = ek; for (let s = 0; s < 8; s++) { let up = -1; for (const k of chanCells) if (recv[k] === c && (up < 0 || acc[k] > acc[up])) up = k; if (up < 0) break; c = up; } out.eastRiver = { x: c % N, y: (c / N) | 0 }; }
    out.sea = { x: N - 7, y: N / 2 - 30 };
    if (m.useFrac > 0.3) {
      const f = interior(k => kinds[k] === KIND.high && useK[k] === 1 && k >= 70 * N);
      if (f) out.field = f;
      const p = interior(k => kinds[k] === KIND.high && useK[k] === 2 && k >= 70 * N);
      if (p) out.pasture = p;
      if (m.turbines.length) out.turbine = m.turbines[0];
    }
    return out;
  }
  m.spots = () => spotCache;

  m.sample = (gx, gy) => {
    const u = clamp(gx, 0, N - 1.001), v = clamp(gy, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + N] * (1 - a) + h[k + N + 1] * a) * b;
  };
  m.liftFrac = () => liftNow(m.clock);
  m.endTime = () => T_END;

  function round() {
    m.clock = Math.round((m.clock + ROUND) * 1000) / 1000; roundNo++;
    // 오늘날의 이용 단계에서는 땅 모양을 다시 계산하지 않는다.
    if (m.clock <= T_USE + 1e-9) evaluate(); else updateUse();
    m.version++;
    if (roundNo % 5 === 0) spotCache = computeSpots();
    if (m.clock >= T_END - 1e-9) { m.finished = true; spotCache = computeSpots(); }
  }

  m.phase = () => {
    const t = m.clock, p = plan();
    if (m.finished) return 'done';
    if (t >= T_USE) return 'use';
    if (t < T_UP) return 'flat';
    if (t < p.up1[1]) return 'uplift';
    if (p.pause) {
      if (t < p.pause[0]) return 'cut';
      if (t < p.up2[0]) return 'pause';
      if (t < p.up2[1]) return 'uplift2';
      return 'cut2';
    }
    return 'cut';
  };

  m.setOption = (name, v) => { m.options[name] = v; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  let built = false;
  m.reset = () => {
    if (!built) { buildBase(); buildNetwork(); built = true; }
    for (let k = 0; k < size; k++) shape[k] = liftShape(k % N, xcRow[(k / N) | 0], m.options.mode);
    roundNo = 0; carry = 0; m.clock = 0; m.finished = false; m.turbines = []; m.useFrac = 0; useK.fill(0);
    evaluate();
    m.version++;
    spotCache = computeSpots();
  };
  m.tick = seconds => {
    if (m.finished) return;
    carry += seconds;
    while (carry >= ROUND - 1e-9 && !m.finished) { carry -= ROUND; round(); }
  };
  m.reset();
  return m;
}

// 단면: 서쪽(A)에서 동해(B)까지 동서로 자른다.
export const sectionLine = m => ({ ax: 1, ay: m.sectionRow(), bx: N - 2, by: m.sectionRow() });
export function sectionProfile(m, samples = 256) {
  const S = sectionLine(m), out = { top: new Float32Array(samples), surf: new Float32Array(samples), start: new Float32Array(samples), kinds: new Array(samples), S };
  const kinds = m.kinds();
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), i = Math.round(S.ax + (S.bx - S.ax) * f), k = S.ay * N + i;
    out.top[t] = m.h[k]; out.surf[t] = m.surf[k]; out.start[t] = m.start[k]; out.kinds[t] = KIND_NAME[kinds[k]];
  }
  return out;
}

const round10 = v => Math.round(v / 10) * 10;
// 막대와 판정 문구를 한 번에 만든다. 화면의 숫자와 문구가 같은 집계에서 나온다.
export function plateauReport(m) {
  const kinds = m.kinds();
  let landN = 0, high = 0, low = 0, deep = 0, eastS = 0, eastN = 0, westS = 0, westN = 0, upMax = 0;
  for (let k = 0; k < N * N; k++) {
    if (!m.land[k]) continue;
    landN++;
    const kd = kinds[k], i = k % N;
    if (kd === KIND.high) high++;
    else if (kd === KIND.low) low++;
    if (m.chan[k] && m.surf[k] - m.h[k] > deep) deep = m.surf[k] - m.h[k];
    if (i >= XD - 20 && i <= XD) { eastS += m.surf[k]; eastN++; }
    if (i >= 2 && i <= 22) { westS += m.surf[k]; westN++; }
    const u = m.lifted(k);
    if (u > upMax) upMax = u;
  }
  const highPct = Math.round((high / landN) * 100), lowPct = Math.round((low / landN) * 100);
  const deepM = round10(deep * H_M), tiltM = round10((eastS / eastN - westS / westN) * H_M), upM = round10(upMax * H_M);
  let hs = 0;
  for (let k = 0; k < N * N; k++) if (kinds[k] === KIND.high) hs += m.h[k];
  const highM = high ? round10((hs / high) * H_M) : 0; // 고위 평탄면의 평균 높이(해발)
  // 첫째 융기 중에 동쪽이 더 솟는 조건이면 기우는 중이라고 적는다.
  const rising = m.phase() === 'uplift' && m.options.mode === 'tilt';
  const parts = [];
  if (upM < 20) parts.push('아직 솟기 전이라 땅이 낮고 평평합니다.');
  else if (rising) parts.push(tiltM >= 200 ? `분수계 가까이가 서쪽 끝보다 약 ${tiltM}m 더 높아졌습니다. 동쪽이 더 솟는 중이라 땅이 서쪽으로 기울어 갑니다.` : `아직 기울기가 작습니다(분수계 가까이와 서쪽 끝의 높이 차이 약 ${tiltM}m). 동쪽이 더 솟는 중입니다.`);
  else if (upM < HIGH_U * H_M) parts.push(`아직 크게 솟지 않아(가장 많이 솟은 곳이 약 ${upM}m) 땅이 낮고 평평합니다.`);
  else if (tiltM >= 200) parts.push(`분수계 가까이가 서쪽 끝보다 약 ${tiltM}m 더 높아져 땅이 서쪽으로 기울었습니다.`);
  else parts.push(`분수계 가까이와 서쪽 끝의 높이 차이가 약 ${tiltM}m로 작아 땅이 한쪽으로 크게 기울지 않았습니다.`);
  if (upM >= HIGH_U * H_M) {
    if (highPct >= 1) parts.push(`옛 평탄한 땅이 높은 곳에 그대로 남은 고위 평탄면이 육지의 약 ${highPct}%입니다.`);
    else parts.push('높은 곳에 평평하게 남은 고위 평탄면이 거의 없습니다.');
  }
  if (lowPct >= 1) parts.push(`골짜기 위에 계단처럼 남은 저위 평탄면이 약 ${lowPct}%입니다. 저위 평탄면은 하안 단구보다 넓게 펼쳐진 침식면입니다.`);
  else if (low > 0) parts.push('저위 평탄면은 거의 없습니다.');
  if (deepM >= 40) parts.push(`가장 깊은 골짜기는 원래 땅보다 약 ${deepM}m 깊게 파였습니다.`);
  else parts.push('하천이 아직 깊이 파고들지 않았습니다.');
  return { landN, high, low, highPct, lowPct, deepM, tiltM, upM, highM, text: parts.join(' ') };
}

export function noteText(m) {
  const ph = m.phase(), tilt = m.options.mode === 'tilt', two = m.options.times === 'two';
  const r = plateauReport(m);
  if (ph === 'done' || ph === 'use') {
    let t = r.text;
    t += two && r.lowPct >= 1 ? ' 고위 평탄면은 고기 삭박면, 저위 평탄면은 신기 삭박면이라고도 부릅니다.' : ' 고위 평탄면은 고기 삭박면이라고도 부릅니다.';
    if (!two) t += ' 땅이 한 번만 솟아 골짜기 위에 계단처럼 남은 낮은 평탄면(저위 평탄면)은 생기지 않았습니다.';
    if (r.highPct >= 1) {
      t += r.highM >= 600 ? ` 고위 평탄면은 평균 해발 약 ${r.highM}m로 높아 여름에도 서늘합니다.` : ` 고위 평탄면은 평균 해발 약 ${r.highM}m입니다.`;
      t += ' 실제 대관령처럼 해발 700m가 넘는 고위 평탄면에서는 서늘한 여름 날씨를 이용해 고랭지 밭에서 배추 같은 채소를 기르고, 풀밭에 목장을 만듭니다.';
      if (m.turbines.length) t += ' 고위 평탄면 둘레의 바람이 센 능선에는 풍력 발전기를 세웁니다.';
    }
    return t;
  }
  if (ph === 'flat') return '오랫동안 비와 하천에 깎여 낮고 평평해진 땅입니다. 낮은 구릉 사이로 긴 하천이 굽이쳐 서쪽으로 흐르고, 동쪽 끝에서는 짧은 하천이 바다(동해)로 흐릅니다.';
  if (ph === 'uplift') return tilt
    ? '땅이 솟기 시작했습니다. 동쪽은 크게, 서쪽은 조금 솟아 땅이 서쪽으로 기웁니다(경동성 요곡 운동). 동해 쪽은 가파른 비탈이 되고 서쪽은 길고 완만한 비탈이 됩니다. 하천 바닥이 바다보다 높아지자 하구 쪽에서부터 하천이 바닥을 다시 파기 시작합니다.'
    : '땅 전체가 고르게 솟습니다. 동쪽과 서쪽이 비슷한 높이로 올라 땅이 한쪽으로 기울지 않습니다. 하천 바닥이 바다보다 높아지자 하구 쪽에서부터 하천이 바닥을 다시 파기 시작합니다.';
  const cutText = '하천이 바닥을 깊게 파고듭니다(하각). 하류부터 깎이기 시작하고, 깎인 곳과 아직 깎이지 않은 곳 사이의 급경사 지점(천이점)이 상류 쪽으로 거슬러 올라갑니다. 하천에서 멀리 떨어진 높은 곳은 아직 깎이지 않아 옛 평탄한 땅이 그대로 남습니다.';
  const eastText = tilt ? ' 동해로 흐르는 짧은 하천은 경사가 급해 동쪽 비탈을 빠르게 깎아 들어갑니다.' : '';
  if (ph === 'cut') return cutText + eastText;
  if (ph === 'pause') return '땅이 솟기를 멈추었습니다. 하천은 더 깊이 파지 못하고 옆으로 골짜기를 넓게 깎아, 하천 둘레의 낮은 곳이 넓고 평평해집니다.';
  if (ph === 'uplift2') return '땅이 다시 솟습니다. 넓게 깎여 평평해진 낮은 바닥도 함께 높이 올라갑니다. 하구 쪽에서부터 하천이 다시 바닥을 파기 시작합니다.';
  return '하천이 다시 파고들어 넓은 바닥 안에 새 골짜기를 만듭니다. 깎이지 않은 넓은 바닥은 골짜기 위에 계단처럼 남아 저위 평탄면이 됩니다. 하천 자갈이 덮인 좁은 하안 단구와 달리 넓게 펼쳐진 침식면입니다. 더 높은 곳에는 처음의 평탄한 땅이 고위 평탄면으로 남아 있습니다.';
}

export function compareBrief(a, b) {
  const t = m => {
    const r = plateauReport(m);
    const tilt = r.tiltM >= 200 ? `분수계 가까이가 서쪽 끝보다 약 ${r.tiltM}m 높아 서쪽으로 기울었고` : `동서 높이 차이가 약 ${r.tiltM}m로 작아 기울지 않았고`;
    return `${tilt}, 고위 평탄면이 약 ${r.highPct}%, 가장 깊은 골짜기가 약 ${r.deepM}m입니다`;
  };
  // 고르게 솟은 블록(b)은 덜 높이 솟는다. 숫자가 그렇게 나올 때만 그 까닭을 적는다.
  const ra = plateauReport(a), rb = plateauReport(b);
  let extra = '';
  if (rb.upM < ra.upM && rb.deepM < ra.deepM && rb.highPct > ra.highPct) extra += `고르게 솟은 블록은 덜 높이 솟아(약 ${rb.upM}m, 동쪽이 더 솟은 블록은 약 ${ra.upM}m) 하천이 덜 깊이 파고들었으므로 평평한 땅이 더 많이 남았습니다. `;
  if (ra.highPct >= 1 && rb.highPct >= 1) extra += '고위 평탄면은 두 경우 모두 생기지만, 동쪽이 높고 서쪽이 낮은 동고서저 지형은 동쪽이 더 솟을 때만 생깁니다.';
  else extra += '동쪽이 높고 서쪽이 낮은 동고서저 지형은 동쪽이 더 솟을 때만 생깁니다.';
  return { a: t(a), b: t(b), extra };
}
