// © 2026 김용현
// 화강암 풍화 지형 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 블록은 오래된 완만한 산지의 한 부분이다. 땅속 화강암에는 가로세로 절리가 있고, 왼쪽 뒤에는 절리가 성긴 큰 덩어리(돔이 될 곳)가 있다.
// 1. 절리: 화강암이 가로세로 틈(수직 절리)과 지표와 나란한 틈(수평 절리)으로 나뉜다.
// 2. 땅속 풍화(덥고 습한 시기): 빗물이 절리를 따라 스며 풍화 전선이 내려간다. 풍화 전선 위는 그루스와 새프롤라이트가 되고,
//    절리로 나뉜 덩어리는 꼭짓점과 모서리부터 깎여 둥근 핵석이 된다. 풍화 전선은 절리가 촘촘한 곳에서 깊고, 덜 갈라진 곳과 큰 덩어리에서 얕다.
// 3. 풍화층이 벗겨짐(추운 시기): 솔리플럭션 같은 사면 운반으로 땅 겉이 고르게 깎여 낮아진다. 풍화 전선이 얕던 곳부터 기반암이 드러나,
//    그 위에 핵석이 내려앉아 쌓인 것이 토르, 큰 덩어리가 통째로 드러난 것이 돔(보른하르트)이다.
// 4. 오늘날: 위를 덮던 수 km 두께의 바위가 깎여 나갈 때 이미 생겨 있던 판상 절리가 돔 겉에서 벌어져 얇은 판이 벗겨지고(박리),
//    평평한 꼭대기에 나마, 가파른 벽에 타포니와 그루브가 생긴다.
// 편마암은 이 모형에서 큰 덩어리로 갈라지지 않고 고르게 풍화되므로 풍화 전선이 고르고 핵석이 없다. 풍화 깊이는 같은 조건 화강암의 평균보다 깊지 않다.
// 흙산이 되는 까닭은 더 깊은 풍화가 아니라, 고른 풍화 전선과 핵석, 바위 언덕이 없다는 점이다(책 133쪽 흙산 설명).
// 책 71쪽은 편마암을 화강암보다 강한 경암으로 적고, 79쪽과 134쪽은 편마암이 높고 가파른 산지를 잘 이룬다고 적어 133쪽과 맞지 않는다.
// 계산에는 사칙연산과 제곱근, 내림, 올림, 반올림, 큰 값, 작은 값, 절댓값만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 128;
export const CELL_M = 1.25; // 칸 한 변이 나타내는 거리(m). 블록 한 변은 약 160m다.
export const ROUND = 0.2; // 계산 한 번의 때(초)
export const T_JOINT = [0.5, 3]; // 절리가 보이기 시작하는 때
export const T_WEATHER = [4, 30]; // 땅속 풍화(덥고 습한 시기)
export const T_COLD = 32; // 추운 시기 시작(풍화층이 벗겨지기 시작)
export const T_EXPOSE = 44; // 토르와 돔이 드러나는 단계(문구가 바뀌는 때)
export const COLD_END = 56; // 풍화층이 다 벗겨지는 때
export const T_TODAY = 58; // 오늘날
export const TODAY_END = 70;
export const T_END = 72;

export const DC = { x: 44, y: 56 }; // 절리가 성긴 큰 덩어리의 가운데(칸)
export const SITE_R = 10; // 덜 갈라진 곳(토르 자리) 하나의 반지름 비슷한 값(m)
// 토르 자리: 둘레보다 절리가 덜 이어진 곳. [x, y(칸), 단단한 정도(0에서 1)]
export const SITES = [[96, 56, 1], [112, 92, 0.9], [80, 110, 0.85], [24, 106, 0.8], [106, 22, 0.75], [62, 12, 0.95], [10, 16, 0.7]];

export const SPACING = {
  dense: { name: '촘촘함', sp: 2.5, depth: 40, bodyR: 18, bodyD: 0.42, siteD: 0.33 },
  wide: { name: '성김', sp: 6, depth: 32, bodyR: 34, bodyD: 0.05, siteD: 0.5 },
};
export const DURATION = {
  short: { name: '짧음', w: 0.4 },
  long: { name: '김', w: 1 },
};
export const ROCK = {
  granite: { name: '화강암', strip: 0.7 },
  gneiss: { name: '편마암', strip: 0.7 },
};
// 편마암의 풍화 깊이: 같은 절리 간격과 기간의 화강암 평균 깊이에 이 비율을 곱하고, 곳에 따라 조금만 다르게 한다(고른 풍화 전선).
export const GNEISS_DEPTH = 0.93;
export const DEFAULTS = { spacing: 'wide', duration: 'long', rock: 'granite' };

export const DOME_MIN = 12; // 이만큼(m) 넘게 주변보다 높으면 돔이라고 말한다
export const KNOB_MIN = 3; // 이만큼 넘으면 낮은 바위 언덕이라고 말한다
export const ROCK_MIN = 1; // 드러난 바위가 이만큼(%) 안 되면 거의 없다고 말한다
export const ROCK_STONE = 8; // 드러난 바위가 이만큼(%) 넘으면 돌산처럼 바위가 드러난 땅이라고 말한다
export const ROUND_MIN = 0.6; // 토르 바위의 둥근 정도 평균이 이보다 크면 둥글다고 말한다
export const TAFONI_SLOPE = 1.2; // 타포니는 거의 수직인 벽에 생긴다(85쪽). 기울기 1.2는 약 50도다.
export const BARE_MAX = 0.2; // 남은 풍화층이 이보다 얇으면 기반암이 드러났다고 본다(m)

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
// 그루브를 찾는 열두 방향(30도마다). 삼각 함수 대신 값을 적어 둔다.
const C30 = 0.8660254;
const DIRS = [[1, 0], [C30, 0.5], [0.5, C30], [0, 1], [-0.5, C30], [-C30, 0.5], [-1, 0], [-C30, -0.5], [-0.5, -C30], [0, -1], [0.5, -C30], [C30, -0.5]];

export function createModel(seed = 7) {
  const size = N * N;
  const g = new Float32Array(size), D = new Float32Array(size), wf = new Float32Array(size), e = new Float32Array(size), h = new Float32Array(size);
  const Emax = new Float32Array(size), bodyU = new Float32Array(size), slope0 = new Float32Array(size), hf = new Float32Array(size);
  const bare = new Uint8Array(size), cover = new Uint8Array(size), torCover = new Uint8Array(size), bareF = new Uint8Array(size);
  const m = { g, D, wf, e, h, bodyU, bare, cover, torCover, slope0, seed, options: { ...DEFAULTS }, clock: 0, finished: false, version: 0 };
  let roundNo = 0, carry = 0, spotCache = {}, builtKey = '';
  const opt = () => ({ S: SPACING[m.options.spacing], W: DURATION[m.options.duration].w, gneiss: m.options.rock === 'gneiss', R: ROCK[m.options.rock] });
  const n1 = makeNoise(seed + 3, 10), nQ = makeNoise(seed + 11, 14);
  const ring = [], core = [];
  let kCenter = DC.y * N + DC.x, meanFinal = 0, bodyRc = 0;

  // 처음 땅: 뒤쪽이 조금 높은 완만한 산지. 큰 덩어리 둘레가 가장 높다.
  function buildGround() {
    const { S, W, gneiss, R } = opt();
    // 화강암 풍화 깊이를 먼저 구한다. 편마암은 이 평균을 써서 고르게 풍화된다.
    const bodyRg = S.bodyR / CELL_M;
    bodyRc = gneiss ? 0 : bodyRg;
    let sum = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, dx = i - 50, dy = j - 58, d2 = (dx * dx + dy * dy) / (64 * 64);
      g[k] = 4 + 14 / (1 + d2) + 5 * (1 - j / (N - 1)) + (n1(i, j) - 0.5) * 2;
      // 풍화 전선이 내려가는 깊이의 비율. 1보다 작을수록 덜 갈라져 얕게 풍화된다.
      let q = 0.84 + 0.3 * (nQ(i, j) - 0.5);
      for (const [sx, sy, s] of SITES) {
        const r2 = (((i - sx) * (i - sx) + (j - sy) * (j - sy)) * CELL_M * CELL_M) / (SITE_R * SITE_R);
        q -= (s * S.siteD) / (1 + r2 * r2); // 가운데가 넓고 평평한 언덕 모양
      }
      const bx = i - DC.x, by = j - DC.y, u = Math.sqrt(bx * bx + by * by) / bodyRg;
      bodyU[k] = gneiss ? 9 : u;
      // 큰 덩어리: 가운데는 거의 풍화되지 않고, 가장자리로 갈수록 빠르게 깊어진다(큰 핵석처럼 둥근 풍화 전선).
      if (u < 1) { const u4 = u * u * u * u; q = S.bodyD + (q - S.bodyD) * u4; }
      D[k] = S.depth * q;
      sum += D[k];
    }
    if (gneiss) {
      // 편마암: 화강암 평균 깊이보다 조금 얕게, 어디서나 거의 같은 깊이로 풍화된다.
      const mean = sum / size;
      sum = 0;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; D[k] = mean * (GNEISS_DEPTH + 0.14 * (nQ(i, j) - 0.5)); sum += D[k]; }
    }
    meanFinal = (sum / size) * W;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const i0 = Math.max(0, i - 3), i1 = Math.min(N - 1, i + 3), j0 = Math.max(0, j - 3), j1 = Math.min(N - 1, j + 3);
      const sx = (g[j * N + i1] - g[j * N + i0]) / ((i1 - i0) * CELL_M), sy = (g[j1 * N + i] - g[j0 * N + i]) / ((j1 - j0) * CELL_M);
      slope0[k] = Math.sqrt(sx * sx + sy * sy);
      // 벗겨지는 두께: 풍화층 평균 두께의 일정 비율. 비탈이 급한 곳은 조금 더 깎인다.
      Emax[k] = R.strip * meanFinal * (0.9 + 0.2 * clamp(slope0[k] / 0.25));
      const d = Math.min(D[k] * W, Emax[k]);
      hf[k] = g[k] - d;
      bareF[k] = D[k] * W - Emax[k] <= BARE_MAX ? 1 : 0;
    }
    let lo = 1e9, deep = 0;
    for (let k = 0; k < size; k++) { lo = Math.min(lo, g[k]); deep = Math.max(deep, D[k] * W); }
    m.bottom = Math.floor(lo - deep - 6); // 블록 바닥 높이(m)
    ring.length = 0; core.length = 0;
    kCenter = DC.y * N + DC.x;
    if (!gneiss) for (let k = 0; k < size; k++) { const u = bodyU[k]; if (u < 0.5) core.push(k); else if (u >= 1.4 && u <= 1.7) ring.push(k); }
    buildMicro();
  }

  // 바위 겉의 작은 지형 자리. 다 벗겨진 뒤의 땅 모양(hf)에서 고른다.
  const micro = { nama: [], tafoni: [], groove: [] };
  m.micro = micro;
  const slopeOf = (arr, i, j) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(N - 1, j + 1);
    const sx = (arr[j * N + i1] - arr[j * N + i0]) / ((i1 - i0) * CELL_M), sy = (arr[j1 * N + i] - arr[j0 * N + i]) / ((j1 - j0) * CELL_M);
    return Math.sqrt(sx * sx + sy * sy);
  };
  function buildMicro() {
    micro.nama = []; micro.tafoni = []; micro.groove = [];
    if (opt().gneiss || !bareF[kCenter]) return;
    for (let j = 2; j < N - 2; j++) for (let i = 2; i < N - 2; i++) {
      const k = j * N + i, u = bodyU[k];
      if (!bareF[k]) continue;
      const s = slopeOf(hf, i, j);
      if (i % 5 === 2 && j % 5 === 2 && u < 0.85 && s < 0.12) micro.nama.push({ x: i, y: j, z: hf[k] });
      if (i % 4 === 1 && j % 4 === 1 && u > 0.35 && u < 1.1 && s > TAFONI_SLOPE) micro.tafoni.push({ x: i, y: j, z: hf[k], nx: 0, ny: 0 });
    }
    for (const t of micro.tafoni) {
      // 벽이 바라보는 쪽(밖으로 낮아지는 쪽)
      const dx = (hf[t.y * N + t.x + 1] - hf[t.y * N + t.x - 1]), dy = (hf[(t.y + 1) * N + t.x] - hf[(t.y - 1) * N + t.x]), l = Math.sqrt(dx * dx + dy * dy) || 1;
      t.nx = -dx / l; t.ny = -dy / l;
    }
    if (micro.tafoni.length > 10) { const keep = []; const st = micro.tafoni.length / 10; for (let q = 0; q < 10; q++) keep.push(micro.tafoni[Math.floor(q * st)]); micro.tafoni = keep; }
    for (const [ux, uy] of DIRS) {
      const pts = [];
      for (let r = 0.3 * bodyRc; r <= 1.2 * bodyRc; r += 0.5) {
        const x = Math.round(DC.x + ux * r), y = Math.round(DC.y + uy * r);
        if (x < 1 || y < 1 || x > N - 2 || y > N - 2) break;
        const k = y * N + x;
        if (bareF[k] && slopeOf(hf, x, y) > 0.85) { const p = pts[pts.length - 1]; if (!p || p.x !== x || p.y !== y) pts.push({ x, y, z: hf[k] }); }
      }
      if (pts.length >= 4) micro.groove.push({ pts });
    }
    const tau = list => list.forEach((q, n) => { q.tau = (n + 1) / (list.length + 1); });
    tau(micro.nama); tau(micro.tafoni); tau(micro.groove);
  }

  // 절리와 바위 덩어리. 수직 절리는 x와 y 방향 줄(m), 수평 절리는 처음 지표에서 잰 깊이(m)다. 덩어리 하나가 핵석 하나가 된다.
  const B = { n: 0 };
  m.blocks = B;
  m.joints = { xs: [], ys: [], zs: [] };
  let cols = [];
  function buildBlocks() {
    const { S, W, gneiss } = opt(), sp = S.sp, r = makeRng(seed * 31 + 7), L = (N - 1) * CELL_M;
    const lines = () => { const out = []; for (let a = 0; a * sp <= L + sp; a++) out.push(a * sp + (a ? (r() - 0.5) * 0.3 * sp : 0) - sp * 0.4); return out; };
    const xs = lines(), ys = lines(), zs = [0];
    let deep = 0;
    for (let k = 0; k < size; k++) deep = Math.max(deep, D[k] * W);
    for (let q = 1; zs[q - 1] <= deep + 2 * sp; q++) zs.push(zs[q - 1] + sp * Math.min(1.4, 0.8 + 0.05 * q) * (0.9 + 0.2 * r()));
    m.joints = { xs, ys, zs };
    const list = [];
    cols = [];
    if (!gneiss) {
      for (let b = 0; b + 1 < ys.length; b++) for (let a = 0; a + 1 < xs.length; a++) {
        const cx = (xs[a] + xs[a + 1]) / 2 / CELL_M, cy = (ys[b] + ys[b + 1]) / 2 / CELL_M;
        if (cx < 0.8 || cy < 0.8 || cx > N - 1.8 || cy > N - 1.8) continue;
        const kc = Math.round(cy) * N + Math.round(cx);
        if (bodyU[kc] < 1.1) continue; // 큰 덩어리 속에는 절리가 거의 없다.
        const dc = D[kc] * W, start = list.length;
        const hx = ((xs[a + 1] - xs[a]) / 2) * 0.92, hy = ((ys[b + 1] - ys[b]) / 2) * 0.92;
        for (let q = 0; q + 1 < zs.length && zs[q] < dc + sp; q++) {
          const hz = ((zs[q + 1] - zs[q]) / 2) * 0.92;
          list.push([cx, cy, (zs[q] + zs[q + 1]) / 2, hx * (0.94 + 0.06 * r()), hy * (0.94 + 0.06 * r()), hz, r(), r(), r(), kc, cols.length]);
        }
        if (list.length > start) cols.push([start, list.length, kc]);
      }
    }
    const n = list.length;
    Object.assign(B, {
      n, x: new Float32Array(n), y: new Float32Array(n), zc: new Float32Array(n), hx: new Float32Array(n), hy: new Float32Array(n), hz: new Float32Array(n), a: new Float32Array(n),
      v1: new Float32Array(n), v2: new Float32Array(n), v3: new Float32Array(n), k: new Int32Array(n), col: new Int32Array(n),
      rho: new Float32Array(n), s: new Float32Array(n), zb: new Float32Array(n), gone: new Uint8Array(n), state: new Uint8Array(n), onRock: new Uint8Array(n), attached: new Uint8Array(n), carried: new Uint8Array(n),
    });
    list.forEach((q, b) => {
      B.x[b] = q[0]; B.y[b] = q[1]; B.zc[b] = q[2]; B.hx[b] = q[3]; B.hy[b] = q[4]; B.hz[b] = q[5]; B.a[b] = Math.min(q[3], q[4], q[5]);
      B.v1[b] = q[6]; B.v2[b] = q[7]; B.v3[b] = q[8]; B.k[b] = q[9]; B.col[b] = q[10];
    });
    m.rot = 1.6 * sp;
  }

  const bil = (arr, x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (arr[k] * (1 - a) + arr[k + 1] * a) * (1 - b) + (arr[k + N] * (1 - a) + arr[k + N + 1] * a) * b;
  };
  m.sample = (x, y) => bil(h, x, y);
  m.sampleOrig = (x, y) => bil(g, x, y);
  m.sampleFront = (x, y) => bil(g, x, y) - bil(wf, x, y);
  m.bodyAt = (x, y) => bil(bodyU, x, y);

  const weatherP = t => Math.min(DURATION[m.options.duration].w, smooth(T_WEATHER[0], T_WEATHER[1], t));
  const stripP = t => smooth(T_COLD, COLD_END, t);
  m.jointFrac = () => smooth(T_JOINT[0], T_JOINT[1], m.clock);
  m.weatherFrac = () => weatherP(m.clock);
  m.weatherStopped = () => m.clock > T_WEATHER[0] && m.clock < T_COLD && weatherP(m.clock) >= DURATION[m.options.duration].w - 1e-9;
  m.stripFrac = () => stripP(m.clock);
  m.coldFrac = () => smooth(T_COLD - 1, T_COLD + 3, m.clock) * (1 - smooth(T_TODAY - 2, T_TODAY + 2, m.clock));
  m.todayFrac = () => smooth(T_TODAY, TODAY_END - 2, m.clock);
  m.sheetFrac = () => smooth(T_TODAY - 1, T_TODAY + 6, m.clock);
  m.forestFrac = () => {
    const t = m.clock;
    return (1 - smooth(T_COLD, T_COLD + 5, t)) * smooth(T_WEATHER[0], T_WEATHER[0] + 5, t) + smooth(T_TODAY, T_TODAY + 8, t);
  };
  m.endTime = () => T_END;

  // 땅 높이와 바위 상태를 지금 때에 맞춘다.
  let tors = [];
  m.tors = () => tors;
  function update() {
    const t = m.clock, P = weatherP(t), sp = stripP(t);
    for (let k = 0; k < size; k++) {
      wf[k] = D[k] * P;
      e[k] = Emax[k] * sp;
      h[k] = g[k] - Math.min(wf[k], e[k]);
      bare[k] = e[k] >= 0.3 && wf[k] - e[k] <= BARE_MAX ? 1 : 0;
    }
    const rot = m.rot;
    cover.fill(0); torCover.fill(0);
    for (const [s0, s1, kc] of cols) {
      const wfc = wf[kc], hc = h[kc], gc = g[kc], front = gc - wfc, onRock = hc <= front + 0.3 ? 1 : 0;
      let base = front;
      // 깊은 덩어리부터 위로 올라가며 놓는다. 아래 덩어리가 먼저 자리를 잡아야 위 덩어리가 그 위에 얹힌다.
      for (let b = s1 - 1; b >= s0; b--) {
        const zc = B.zc[b], hz = B.hz[b], a = B.a[b], d = wfc - zc;
        const rho = clamp((d + hz) / (3.2 * a));
        B.rho[b] = rho;
        // 풍화 전선보다 아주 높이 올라간 덩어리는 다 썩어 그루스가 된다.
        const gone = d > hz + rot * (0.5 + B.v1[b]);
        B.gone[b] = gone ? 1 : 0;
        B.state[b] = 0; B.onRock[b] = onRock; B.carried[b] = 0;
        if (gone || rho <= 0) { B.s[b] = 1; B.zb[b] = gc - zc - hz; continue; }
        const s = 1 - 0.12 * rho - 0.25 * clamp((d - hz) / rot);
        B.s[b] = s;
        const half = hz * s, zb0 = gc - zc - half;
        // 아랫부분이 아직 풍화 전선 아래(기반암)에 있으면 제자리에 붙어 있다. 위로 다 올라온 핵석은 받치던 그루스가 빠지면 내려앉는다.
        const attached = d < hz;
        B.attached[b] = attached ? 1 : 0;
        const zb = attached ? zb0 : Math.max(base, Math.min(zb0, hc));
        B.zb[b] = zb;
        // 기반암이 드러나지 않은 곳에서 절반 넘게 흙 밖으로 나온 핵석은 흘러내리는 풍화층에 실려 비탈 아래로 옮겨 간다(블록 밖으로 나간다고 본다).
        if (!attached && !onRock && hc < zb0 + half) { B.carried[b] = 1; continue; }
        base = Math.max(base, zb + 2 * half * 0.9);
        const top = zb + 2 * half;
        if (top > hc + 0.3) {
          B.state[b] = zb + half > hc ? 2 : 1;
          const i = Math.round(B.x[b]), j = Math.round(B.y[b]), rc = Math.max(0.6, Math.min(B.hx[b], B.hy[b]) * s / CELL_M);
          for (let y = Math.max(0, Math.floor(j - rc)); y <= Math.min(N - 1, Math.ceil(j + rc)); y++) for (let x = Math.max(0, Math.floor(i - rc)); x <= Math.min(N - 1, Math.ceil(i + rc)); x++) {
            if ((x - B.x[b]) * (x - B.x[b]) + (y - B.y[b]) * (y - B.y[b]) <= rc * rc) { cover[y * N + x] = 1; if (onRock) torCover[y * N + x] = 1; }
          }
        }
      }
    }
    tors = findTors();
  }

  // 토르: 기반암이 드러난 자리(onRock) 위로 머리를 내민 바위들이 붙어 있는 무리. 바위가 둘 넘게 모인 무리만 센다.
  function findTors() {
    const idx = [];
    for (let b = 0; b < B.n; b++) if (B.state[b] && B.onRock[b] && !B.gone[b]) idx.push(b);
    const parent = idx.map((_, q) => q);
    const find = q => { while (parent[q] !== q) { parent[q] = parent[parent[q]]; q = parent[q]; } return q; };
    const lim = (1.7 * SPACING[m.options.spacing].sp) / CELL_M;
    for (let p = 0; p < idx.length; p++) for (let q = p + 1; q < idx.length; q++) {
      const a = idx[p], b = idx[q], dx = B.x[a] - B.x[b], dy = B.y[a] - B.y[b];
      if (dx * dx + dy * dy <= lim * lim) { const ra = find(p), rb = find(q); if (ra !== rb) parent[rb] = ra; }
    }
    const groups = new Map();
    idx.forEach((b, q) => { const r = find(q); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(b); });
    const out = [];
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      let x = 0, y = 0, top = -1e9, rho = 0;
      for (const b of list) { x += B.x[b]; y += B.y[b]; rho += B.rho[b]; top = Math.max(top, B.zb[b] + 2 * B.hz[b] * B.s[b]); }
      out.push({ x: x / list.length, y: y / list.length, top, n: list.length, round: rho / list.length, list });
    }
    out.sort((p, q) => q.n - p.n || p.x - q.x);
    return out;
  }

  // 돔: 큰 덩어리 가운데가 드러났을 때, 가운데 꼭대기와 둘레 땅(덩어리 반지름의 1.4배에서 1.7배)의 높이 차이
  m.dome = () => {
    if (opt().gneiss || !bare[kCenter]) return { exposed: false, height: 0 };
    let top = -1e9, s = 0;
    for (const k of core) top = Math.max(top, h[k]);
    for (const k of ring) s += h[k];
    return { exposed: true, height: Math.round(top - s / ring.length) };
  };
  m.bodyR = () => bodyRc;

  m.phase = () => {
    const t = m.clock;
    if (m.finished) return 'done';
    if (t < T_WEATHER[0]) return 'joint';
    if (t < T_COLD) return 'weather';
    if (t < T_EXPOSE) return 'cold';
    if (t < T_TODAY) return 'expose';
    return 'today';
  };

  // 바위 겉의 작은 지형 가운데 지금 보이는 것(오늘날에 차례로 생긴다)
  m.microShown = () => {
    const f = m.todayFrac(), ok = q => f > 0 && f >= q.tau * 0.95;
    return { nama: micro.nama.filter(ok), tafoni: micro.tafoni.filter(ok), groove: micro.groove.filter(ok) };
  };

  // 이름표 자리. 그 지형이 실제로 있는 곳만 고른다. x, y는 칸, z는 높이(m)다. 옆면 이름표는 앞면(y = N - 1) 위에 놓는다.
  function computeSpots() {
    const out = {}, F = N - 1, ph = m.phase(), gn = opt().gneiss;
    const face = x => { const k = F * N + x; return { g: g[k], h: h[k], wf: wf[k], e: e[k] }; };
    const early = ph === 'joint' || ph === 'weather' || ph === 'cold';
    if (early && m.jointFrac() > 0.3) { const x = 30, f = face(x); out.joint = { x, y: F, z: Math.max(m.bottom + 4, f.g - f.wf - 3) }; }
    if (ph !== 'done' && ph !== 'today') { const x = 112, f = face(x); out.bedrock = { x, y: F, z: Math.max(m.bottom + 3, f.g - f.wf - 9) }; }
    if (m.weatherFrac() > 0.15 && ph !== 'today' && ph !== 'done') {
      const xf = 66, f = face(xf);
      if (f.wf - f.e > 2) out.front = { x: xf, y: F, z: f.g - f.wf };
      const xs = 46, s = face(xs), thick = s.wf - s.e;
      if (thick > 2.5) out.saprolite = { x: xs, y: F, z: s.h - thick * (gn ? 0.5 : 0.3) };
      let best = -1;
      for (let b = 0; b < B.n; b++) {
        if (B.gone[b] || B.carried[b] || B.state[b] || B.rho[b] < 0.45 || B.y[b] < F - 3 || B.x[b] < 70 || B.x[b] > 116) continue;
        if (best < 0 || B.rho[b] > B.rho[best]) best = b;
      }
      if (best >= 0) out.corestone = { x: B.x[best], y: F, z: B.zb[best] + B.hz[best] * B.s[best] };
    }
    if (ph === 'cold' || ph === 'expose') {
      // 솔리플럭션: 아직 풍화층이 남은 곳 가운데 비탈이 가장 급한 곳
      let best = -1;
      for (let j = 20; j < N - 20; j += 3) for (let i = 70; i < N - 12; i += 3) { const k = j * N + i; if (wf[k] - e[k] > 2 && (best < 0 || slope0[k] > slope0[best])) best = k; }
      if (best >= 0) out.soliflux = { x: best % N, y: (best / N) | 0, z: h[best] };
    }
    if (ph === 'expose' || ph === 'today' || ph === 'done') {
      if (tors.length) out.tor = { x: tors[0].x, y: tors[0].y, z: tors[0].top };
      const dm = m.dome();
      if (dm.exposed && dm.height >= KNOB_MIN) {
        out.dome = { x: DC.x, y: DC.y, z: h[kCenter] };
        out.domeKind = dm.height >= DOME_MIN ? 'dome' : 'knob';
      }
    }
    if (ph === 'today' || ph === 'done') {
      const dm = m.dome();
      if (dm.exposed && dm.height >= DOME_MIN && m.sheetFrac() > 0.3) {
        // 판상 절리: 돔 오른쪽 비탈
        const x = Math.round(DC.x + 0.7 * bodyRc), y = DC.y + 3;
        if (bare[y * N + x]) out.sheet = { x, y, z: h[y * N + x] };
      }
      const ms = m.microShown();
      if (ms.nama.length) { const q = ms.nama[Math.floor(ms.nama.length / 2)]; out.nama = { x: q.x, y: q.y, z: q.z }; }
      if (ms.tafoni.length) { const q = ms.tafoni.reduce((p, c) => (c.y > p.y ? c : p)); out.tafoni = { x: q.x, y: q.y, z: q.z }; }
      if (ms.groove.length) { const q = ms.groove.reduce((p, c) => (c.pts[0].x > p.pts[0].x ? c : p)).pts; const p = q[Math.floor(q.length / 2)]; out.groove = { x: p.x, y: p.y, z: p.z }; }
      if (gn) { const k = 58 * N + 56; out.soilMountain = { x: 56, y: 58, z: h[k] }; }
      // 숲: 풍화층이 남은 앞쪽 왼편
      let best = -1, bd = 1e9;
      for (let j = 70; j < N - 8; j += 2) for (let i = 8; i < 60; i += 2) {
        const k = j * N + i;
        if (bare[k] || cover[k] || wf[k] - e[k] < 1.5) continue;
        const d = (i - 30) * (i - 30) + (j - 96) * (j - 96);
        if (d < bd) { bd = d; best = k; }
      }
      if (best >= 0 && !gn) out.forest = { x: best % N, y: (best / N) | 0, z: h[best] };
    }
    return out;
  }
  m.spots = () => spotCache;

  function round() {
    m.clock = Math.round((m.clock + ROUND) * 1000) / 1000; roundNo++;
    update();
    m.version++;
    if (roundNo % 5 === 0) spotCache = computeSpots();
    if (m.clock >= T_END - 1e-9) { m.finished = true; spotCache = computeSpots(); }
  }

  m.setOption = (name, v) => { m.options[name] = v; };
  m.reset = () => {
    const key = `${m.options.spacing}:${m.options.duration}:${m.options.rock}`;
    if (key !== builtKey) { buildGround(); buildBlocks(); builtKey = key; }
    roundNo = 0; carry = 0; m.clock = 0; m.finished = false;
    update();
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

// 단면: 큰 덩어리(돔) 한가운데를 지나 왼쪽(A)에서 오른쪽(B)으로 자른다.
export function sectionLine(samples = N) {
  const pts = [];
  for (let t = 0; t < samples; t++) pts.push([((N - 1) * t) / (samples - 1), DC.y]);
  return pts;
}

const round1 = v => Math.round(v * 10) / 10;
// 막대와 판정 문구를 한 번에 만든다. 화면의 숫자와 문구가 같은 집계에서 나온다.
export function graniteReport(m) {
  const ph = m.phase(), gneiss = m.options.rock === 'gneiss', B = m.blocks, n = N * N;
  let sap = 0, rock = 0;
  // 드러난 바위 넓이: 드러난 기반암과 그 위에 놓인 바위(토르). 풍화층 위로 머리만 내민 핵석은 세지 않는다.
  for (let k = 0; k < n; k++) { sap += Math.max(0, m.wf[k] - m.e[k]); if (m.bare[k] || m.torCover[k]) rock++; }
  let core = 0;
  for (let b = 0; b < B.n; b++) if (!B.gone[b] && !B.carried[b] && !B.state[b] && B.rho[b] > 0.05) core++;
  const tors = m.tors(), dm = m.dome(), ms = m.microShown();
  const sapM = round1(sap / n), rockPct = Math.round((rock / n) * 100), rockM2 = Math.round((rock * CELL_M * CELL_M) / 10) * 10;
  let torRound = 0, torBoulders = 0;
  for (const t of tors) { torRound += t.round * t.n; torBoulders += t.n; }
  torRound = torBoulders ? Math.round((torRound / torBoulders) * 100) / 100 : 0;
  const domeM = dm.exposed ? Math.max(0, dm.height) : 0;
  const domeKind = domeM >= DOME_MIN ? 'dome' : domeM >= KNOB_MIN ? 'knob' : 'none';
  const nama = ms.nama.length, tafoni = ms.tafoni.length, groove = ms.groove.length;
  const stripped = ph === 'cold' || ph === 'expose' || ph === 'today' || ph === 'done';
  const late = ph === 'today' || ph === 'done';
  const kind = ph === 'expose' || late ? (rockPct >= ROCK_STONE ? 'stone' : rockPct < ROCK_MIN ? 'soil' : 'mixed') : null;
  const parts = [];
  if (!stripped) {
    if (sapM < 0.1) parts.push('아직 풍화가 시작되지 않아 바위가 단단합니다.');
    else if (gneiss) parts.push(`풍화층이 평균 약 ${sapM}m 두께로 생겼습니다. 편마암은 큰 덩어리로 남지 않고 고르게 풍화되어 핵석이 없습니다.`);
    else parts.push(`풍화층이 평균 약 ${sapM}m 두께로 생겼고, 그 속에 둥글어지는 핵석이 ${core}개입니다.`);
    parts.push('바위는 모두 땅속에 있어 드러난 바위가 없습니다.');
  } else {
    if (rockPct < ROCK_MIN) parts.push('드러난 바위가 거의 없습니다.');
    else parts.push(`드러난 바위는 블록 윗면의 약 ${rockPct}%(약 ${rockM2}m²)입니다.`);
    parts.push(`남은 풍화층은 평균 약 ${sapM}m입니다.`);
    if (!gneiss) {
      const verb = late ? '드러났습니다' : '드러나고 있습니다';
      const shortW = m.options.duration === 'short' ? '땅속 풍화 기간이 짧아 ' : '';
      if (tors.length) parts.push(`기반암 위에 핵석이 쌓인 토르가 ${tors.length}개 ${verb}. ` + (torRound >= ROUND_MIN ? '토르의 바위는 둥급니다.' : `${shortW}땅속에서 구상 풍화가 덜 되어(81쪽의 캐슬코피처럼) 토르의 바위 모서리가 각져 있습니다.`));
      else if (rockPct >= ROCK_MIN) parts.push('토르는 아직 없습니다.');
      if (domeKind === 'dome') parts.push(`절리가 성긴 큰 덩어리가 통째로 드러나 주변보다 약 ${domeM}m 높은 돔(보른하르트)이 ${late ? '되었습니다' : '되어 갑니다'}.`);
      else if (domeKind === 'knob') parts.push(`절리가 성긴 덩어리가 주변보다 약 ${domeM}m 높은 낮은 바위 언덕으로 ${verb}.`);
    }
    if (kind) {
      const done = late ? '되었습니다' : '되어 갑니다';
      if (kind === 'stone') parts.push(`돌산처럼 바위가 드러난 땅이 ${done}.`);
      else if (kind === 'soil') parts.push(`겉이 흙으로 덮인 흙산이 ${done}.`);
      else parts.push('바위가 군데군데 드러나 있습니다.');
    }
    if (late && nama + tafoni + groove > 0) {
      const items = [];
      if (nama) items.push(`평평한 꼭대기에 나마 ${nama}개`);
      if (tafoni) items.push(`가파른 벽에 타포니 ${tafoni}개`);
      if (groove) items.push(`${tafoni ? '' : '가파른 벽에 '}그루브 ${groove}줄`);
      parts.push(`바위 겉에는 ${items.join(', ')}${groove ? '이' : '가'} 있습니다.`);
    }
  }
  return { sapM, rockPct, rockM2, core, tors: tors.length, torBoulders, torRound, domeM, domeKind, nama, tafoni, groove, kind, text: parts.join(' ') };
}

export function noteText(m) {
  const ph = m.phase(), r = graniteReport(m), gneiss = m.options.rock === 'gneiss', sp = SPACING[m.options.spacing].sp;
  if (ph === 'done' || ph === 'today') {
    let t = r.text;
    if (gneiss) {
      t += ' 편마암은 이 모형에서 큰 덩어리로 갈라지지 않고 고르게 풍화되어, 풍화 전선이 고르고 핵석과 바위 언덕이 남지 않습니다. 화강암보다 깊이 풍화된 것은 아니지만, 풍화층이 고르게 벗겨져 바위가 드러나지 않고 흙이 겉을 덮어 숲이 자랍니다. 책 133쪽은 편마암과 편암 같은 변성암 지역에 흙산이 잘 발달한다고 설명합니다. 다만 책 71쪽은 편마암을 화강암보다 강한 경암으로 적고, 79쪽과 134쪽은 편마암이 높고 가파른 산지를 잘 이룬다고 적습니다.';
    } else {
      if (r.domeKind === 'dome') t += ' 돔 겉에는 겉면과 나란한 판상 절리가 있습니다. 이 틈은 화강암을 수 km 두께로 덮고 있던 바위가 오랜 세월 깎여 나가며 누르던 힘이 풀려 땅속에서 생긴 것으로, 돔이 드러난 뒤 벌어져 얇은 판이 양파 껍질처럼 벗겨집니다(박리). 판상 절리와 박리를 나누는 기준은 정해져 있지 않습니다.';
      if (r.nama + r.tafoni > 0) t += ' 나마와 타포니가 생기는 까닭은 고인 물, 소금 결정, 얼었다 녹기 등 여러 가지로 설명합니다.';
      if (m.options.spacing === 'dense') t += ' 절리가 촘촘한 화강암은 깊이까지 썩어 풍화와 침식에 약하므로, 큰 돌산 대신 낮은 땅이나 침식 분지(춘천 분지 등)가 되기도 합니다.';
      if (m.options.duration === 'short') t += ' 땅속 풍화 기간이 짧아 풍화 전선이 얕았으므로, 드러난 바위의 높낮이가 작습니다.';
      t += ' 덥고 습한 시기의 땅속 풍화 뒤에 추운 시기의 사면 운반으로 토르가 드러났다는 차례는 책에서도 짐작(추정)입니다. 추운 곳에서 땅 위로 드러난 바위가 얼었다 녹으며 각지게 쪼개져 생긴 각진 토르(주빙하형)도 있지만(83쪽), 이 모형의 토르는 땅속에서 생긴 핵석이 드러난 것이고 우리나라 토르는 둥근 것이 더 많다고 봅니다.';
    }
    return t;
  }
  if (ph === 'joint') return gneiss
    ? '편마암은 높은 열과 압력을 받아 광물이 줄무늬처럼 늘어선 변성암입니다. 블록 옆면에 굽이진 줄무늬로 보입니다. 이 모형에서는 편마암이 큰 덩어리로 갈라지지 않고 잘게 고르게 풍화되게 했습니다.'
    : `화강암은 땅속 깊은 곳에서 마그마가 식어 굳은 바위입니다. 바위에는 세로 틈과 땅 표면과 나란한 틈이 있는데, 이 틈을 절리라고 하며 블록 옆면에 검은 줄로 보입니다. 이 모형의 절리 간격은 약 ${sp}m입니다. 왼쪽 뒤의 큰 덩어리는 절리가 거의 없습니다.`;
  if (ph === 'weather') {
    let t = gneiss
      ? '덥고 습한 시기에 빗물이 바위 틈으로 스며 바위를 썩게 합니다(땅속 깊은 풍화). 편마암은 고르게 풍화되어 풍화 전선이 거의 고르게 내려갑니다. 화강암보다 깊이 풍화되지는 않습니다. 이 모형에서는 편마암 풍화층에 고운 흙이 많다고 보았습니다.'
      : '덥고 습한 시기에 빗물이 절리를 따라 깊이 스며 바위를 썩게 합니다(심층 풍화). 썩은 바위는 광물 알갱이가 낱낱이 떨어져 굵은 모래 같은 그루스가 되고, 그대로 남은 썩은 층을 새프롤라이트라고 합니다. 절리로 나뉜 덩어리는 세 면에서 물이 닿는 꼭짓점과 두 면에서 닿는 모서리부터 깎여 둥근 핵석이 됩니다(구상 풍화). 풍화가 닿은 가장 깊은 곳이 풍화 전선이며, 절리가 촘촘한 곳에서 깊고 덜 갈라진 곳과 큰 덩어리에서 얕습니다.';
    if (m.weatherStopped()) t += ' 땅속 풍화 기간이 짧아 풍화 전선이 더 내려가지 않습니다.';
    return t;
  }
  if (ph === 'cold') return '추운 시기가 왔습니다. 땅이 얼었다 녹기를 되풀이하며 물을 머금은 풍화층이 비탈 아래로 천천히 흘러내리고(솔리플럭션), 녹은 물이 고운 알갱이를 씻어 냅니다. 땅 겉이 고르게 깎여 낮아지고, 흙 밖으로 빠져나온 핵석 가운데 일부는 풍화층과 함께 비탈 아래로 옮겨 갑니다.';
  return gneiss
    ? '풍화층이 벗겨져도 풍화 전선이 고르게 깊어서 기반암이 드러나지 않습니다. 땅 겉은 남은 풍화층으로 덮여 있습니다.'
    : '풍화층이 벗겨지면서 풍화 전선이 얕던 곳의 기반암이 먼저 드러납니다. 받치던 그루스가 빠진 핵석은 그 자리에 내려앉아 기반암 위에 쌓인 토르가 되고, 절리가 성긴 큰 덩어리는 통째로 드러나 둥근 돔이 됩니다.';
}

// 화강암과 편마암 비교: 왼쪽은 화강암, 오른쪽은 편마암. 다른 조건은 같다.
// 돌산이라는 말은 화강암 판정이 'stone'일 때만 쓴다. 편마암이 흙산이 되는 까닭은 깊은 풍화가 아니라 고른 풍화 전선이다.
export const COMPARE_RULE = '이 모형에서는 책 133쪽 흙산 설명을 따라, 편마암이 화강암보다 깊이 풍화되지는 않지만 풍화 전선이 고르고 핵석과 바위 언덕이 없어 풍화층이 벗겨져도 바위가 드러나지 않게 했습니다.';
export const BOOK_CONFLICT = '책 71쪽은 편마암을 화강암보다 강한 경암으로 적고, 79쪽과 134쪽은 편마암이 높고 가파른 산지를 잘 이룬다고 적어 133쪽 설명과 맞지 않습니다.';
export function compareBrief(a, b) {
  const t = m => {
    const r = graniteReport(m);
    const rock = r.rockPct < ROCK_MIN ? '거의 없음' : `블록 윗면의 약 ${r.rockPct}%`;
    const dome = r.domeM ? `돔 높이 약 ${r.domeM}m` : '돔 없음';
    return `드러난 바위 ${rock}, 토르 ${r.tors}개, ${dome}, 남은 풍화층 평균 약 ${r.sapM}m`;
  };
  const ra = graniteReport(a), rb = graniteReport(b);
  const parts = [COMPARE_RULE];
  if (ra.kind) {
    const late = a.phase() === 'today' || a.phase() === 'done', done = late ? '되었습니다' : '되어 갑니다';
    const left = ra.kind === 'stone' ? `화강암은 풍화 전선이 얕던 단단한 부분이 바위로 드러나 돌산처럼 보이는 땅이 ${done}` : ra.kind === 'mixed' ? '화강암은 바위가 군데군데 드러났을 뿐 대부분 풍화층이 덮고 있습니다' : '화강암도 바위가 거의 드러나지 않았습니다';
    const right = rb.kind === 'soil' ? `편마암은 흙이 겉을 덮은 흙산이 ${done}` : '편마암도 바위가 조금 드러났습니다';
    parts.push(`${left}. ${right}.`);
  }
  parts.push(BOOK_CONFLICT);
  return { a: t(a), b: t(b), extra: parts.join(' ') };
}
