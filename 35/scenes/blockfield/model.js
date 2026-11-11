// © 2026 김용현
// 암괴원과 암괴류 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 블록은 화강암 산비탈이다. 위쪽(뒤, 북쪽)이 산꼭대기이고 아래쪽(앞)으로 낮아진다. 가운데보다 조금 오른쪽에 오목한 골짜기가 비탈을 따라 내려가고,
// 왼쪽은 경사가 절반쯤인 완만한 비탈이다.
// 1. 절리: 땅속 화강암에 가로세로 틈(수직 절리)과 지표와 나란한 틈(판상 절리)이 생긴다. 틈 사이가 바위 덩어리 하나다.
// 2. 땅속 풍화: 풍화가 닿는 깊이(풍화 전선)가 내려가며 그 위는 마사토가 되고, 덩어리는 모서리부터 깎여 둥근 핵석이 된다.
// 3. 빙기(주빙하 환경): 얼었다 녹기를 되풀이하며 흙이 흘러내리고(동상 포행, 솔리플럭션) 씻겨 나가 땅이 낮아진다. 핵석의 윗부분이 드러나고, 가운데까지 드러나면 흙에서 빠져나와 땅 위에 놓인다.
// 4. 드러난 바위는 바위와 흙이 이룬 겉면의 가장 가파른 쪽으로, 기울기가 어느 값(S0)보다 클 때만 천천히 내려간다. 바위가 쌓인 곳은 겉면이 높아져 옆으로 퍼진다.
//    급한 비탈의 바위는 오목한 골짜기로 모여 길게 이어지고(암괴류), 완만한 곳의 바위는 거의 그대로 넓게 깔린다(암괴원).
// 5. 기후가 따뜻해지면 바위는 멈추고, 바위 사이의 흙이 빠지고 둘레에 숲이 자란다.
// 계산에는 사칙연산과 제곱근, 내림, 올림, 반올림, 큰 값, 작은 값, 절댓값만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 128;
export const CELL_M = 0.8; // 칸 한 변이 나타내는 거리(m). 블록 한 변은 약 100m다.
export const ROUND = 0.2; // 계산 한 번의 때(초)
export const WD = 8.5; // 풍화가 닿는 평균 깊이(m)
export const T_JOINT = [1, 10]; // 절리가 생기는 때
export const T_WEATHER = [12, 38]; // 땅속 풍화
export const T_COLD = 40; // 빙기 시작
export const T_GATHER = 54; // 바위가 모이는 단계(문구가 바뀌는 때)
export const T_WARM = 72; // 따뜻해짐
export const T_TODAY = 78; // 오늘날
export const T_END = 90;
export const S0 = 0.2; // 이보다 완만한 겉면에서는 바위가 내려가지 않는다(높이/거리)
const S0_PILE = 0.09; // 다른 바위 위에 얹힌 바위가 내려가기 시작하는 기울기
const KM = 65; // 바위가 내려가는 빠르기(겉면 기울기가 S0를 넘는 만큼의 제곱에 비례, m/초). 급한 비탈일수록 훨씬 빨리 움직인다.
const STEP_MAX = 0.6; // 계산 한 번에 움직이는 가장 긴 거리(칸)
const COLD_END = 60;
const HW = 4, HS = 26; // 골짜기 바닥의 반너비와 양쪽 비탈 너비(칸) // 흙이 다 씻겨 나가는 때
export const STREAM_MOST = 55, STREAM_SOME = 36; // 골짜기에 모인 바위 비율이 STREAM_MOST를 넘으면 골짜기를 따라 길게 모였다고, STREAM_SOME을 넘으면 골짜기에 모였다고 말한다
export const GENTLE = 0.2; // 처음 땅의 기울기가 이보다 완만한 곳(골짜기 밖)에 놓인 바위를 암괴원으로 센다
export const FIELD_MIN = 15; // 완만한 곳의 바위가 이만큼(%) 넘어야 암괴원이라고 말한다
export const MIN_SHARE = 30; // 이만큼 넘게 드러나야 골짜기와 완만한 곳의 비율을 말한다
export const STREAM_HALF = 12; // 골짜기 가운데 줄에서 이 칸 안쪽을 골짜기 바닥으로 본다
export const STREAM_TOP = 0.2; // 골짜기는 블록 위쪽 이 비율 아래부터 센다

export const SLOPE = {
  gentle: { name: '완만', H: 12 },
  mid: { name: '보통', H: 26 },
  steep: { name: '급함', H: 40 },
};
export const SPACING = {
  dense: { name: '촘촘', sp: 2.5 },
  mid: { name: '보통', sp: 3.5 },
  wide: { name: '넓음', sp: 5 },
};
export const CYCLES = {
  few: { name: '적음', strip: 2.7, move: 0.35 },
  many: { name: '많음', strip: 6.2, move: 1 },
};
export const PRESETS = {
  textbook: { slope: 'mid', spacing: 'mid', cycles: 'many' },
  gentle: { slope: 'gentle', spacing: 'mid', cycles: 'many' },
  steep: { slope: 'steep', spacing: 'mid', cycles: 'many' },
  mild: { slope: 'mid', spacing: 'mid', cycles: 'few' },
};

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

// 골짜기 가운데 줄(칸). 위에서 아래로 조금 왼쪽으로 비스듬히 내려가며 살짝 굽는다.
export const valleyX = j => { const u = j / (N - 1); return 74 - 8 * u + 2.5 * wave(u * 1.2 + 0.15); };
export const inStreamZone = (x, y) => y >= STREAM_TOP * (N - 1) && Math.abs(x - valleyX(y)) <= STREAM_HALF;

export function createModel(seed = 7) {
  const size = N * N;
  const g = new Float32Array(size), h = new Float32Array(size), top = new Float32Array(size), wfMax = new Float32Array(size), eMax = new Float32Array(size);
  const wf = new Float32Array(size), eNow = new Float32Array(size), slope0 = new Float32Array(size), cover = new Uint8Array(size);
  const m = { g, h, top, wf, e: eNow, cover, seed, options: { ...PRESETS.textbook }, clock: 0, finished: false, version: 0 };
  let roundNo = 0, carry = 0, spotCache = {}, builtKey = '';
  const opt = () => ({ H: SLOPE[m.options.slope].H, sp: SPACING[m.options.spacing].sp, cy: CYCLES[m.options.cycles] });

  const n1 = makeNoise(seed + 3, 9), n2 = makeNoise(seed + 7, 4), nW = makeNoise(seed + 11, 14), nS = makeNoise(seed + 17, 11);
  // 비탈 모양: 꼭대기는 둥글게 완만하고, 가운데는 곧고, 아래 끝(산기슭)은 다시 완만해진다. 앞(아래)에서부터 기울기를 더해 높이를 만든다.
  const prof = new Float64Array(N);
  {
    let acc = 0;
    prof[N - 1] = 0;
    for (let j = N - 2; j >= 0; j--) { const u = (j + 0.5) / (N - 1); acc += 0.35 + 0.95 * smooth(0, 0.3, u) - 1.1 * smooth(0.72, 1, u); prof[j] = acc; }
    for (let j = 0; j < N; j++) prof[j] /= acc;
  }
  m.profile = prof;
  const valleyDepth = (H, j) => { const u = j / (N - 1); return (1 + 0.2 * H) * smooth(0.04, 0.4, u); };
  m.valleyDepth = j => valleyDepth(opt().H, j);

  function buildGround() {
    const { H, cy } = opt();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, p = prof[j];
      const main = H * p + 0.16 * H * smooth(valleyX(j) + 4, N - 1, i); // 오른쪽 비탈은 오른쪽 끝으로 조금 높아져 골짜기 쪽으로 기운다.
      const spur = H * (1 - 0.35 * (1 - p)) + 0.03 * H * (1 - smooth(0, 30, i)); // 왼쪽 완만한 비탈: 같은 꼭대기에서 절반 기울기로 내려간다.
      const w = 1 - smooth(26, 48, i);
      const dx = Math.abs(i - valleyX(j));
      const cut = valleyDepth(H, j) * (1 - smooth(HW, HW + HS, dx));
      g[k] = main + (spur - main) * w - cut + (n1(i, j) - 0.5) * 1.0 + (n2(i, j) - 0.5) * 0.4;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      // 땅의 기울기는 앞뒤 4칸(약 3m) 떨어진 높이로 잰다. 작은 울퉁불퉁함은 빼고 비탈 전체의 기울기를 본다.
      const i0 = Math.max(0, i - 4), i1 = Math.min(N - 1, i + 4), j0 = Math.max(0, j - 4), j1 = Math.min(N - 1, j + 4);
      const sx = (g[j * N + i1] - g[j * N + i0]) / ((i1 - i0) * CELL_M), sy = (g[j1 * N + i] - g[j0 * N + i]) / ((j1 - j0) * CELL_M);
      slope0[k] = Math.sqrt(sx * sx + sy * sy);
      const valley = 1 - smooth(HW, HW + HS, Math.abs(i - valleyX(j)));
      // 풍화는 물이 모이는 골짜기에서 더 깊다.
      wfMax[k] = WD * (0.82 + 0.22 * valley + 0.18 * (nW(i, j) - 0.5));
      // 빙기에 씻겨 나가는 흙의 두께: 비탈이 급할수록 많지만, 완만한 곳도 녹은 물이 고운 흙을 씻어 낸다.
      eMax[k] = Math.min(wfMax[k] - 0.8, cy.strip * (0.75 + 0.25 * clamp(slope0[k] / 0.3)) * (0.9 + 0.2 * nS(i, j)));
    }
    let lo = 1e9;
    for (let k = 0; k < size; k++) lo = Math.min(lo, g[k]);
    m.bottom = Math.floor(lo - WD * 1.1 - 3); // 블록 바닥 높이(m)
  }

  // 절리와 바위 덩어리. 수직 절리는 x와 y 방향 줄, 판상 절리는 지표에서 잰 깊이다. 덩어리 하나가 핵석 하나가 된다.
  const B = { n: 0 };
  m.boulders = B;
  m.joints = { xs: [], ys: [], zs: [] };
  function buildBlocks() {
    const { sp } = opt(), r = makeRng(seed * 31 + 7), L = (N - 1) * CELL_M;
    const lines = () => { const out = []; for (let a = 0; a * sp <= L + sp; a++) out.push(a * sp + (a ? (r() - 0.5) * 0.3 * sp : 0) - sp * 0.3); return out; };
    const xs = lines(), ys = lines(), zs = [0];
    for (let q = 1; q * sp <= WD * 1.25 + sp; q++) zs.push(q * sp * (0.92 + 0.16 * r()));
    m.joints = { xs, ys, zs };
    const layers = Math.max(1, Math.floor(WD / sp));
    const list = [];
    for (let b = 0; b + 1 < ys.length; b++) for (let a = 0; a + 1 < xs.length; a++) {
      const cx = (xs[a] + xs[a + 1]) / 2 / CELL_M, cy = (ys[b] + ys[b + 1]) / 2 / CELL_M;
      if (cx < 1.2 || cy < 1.2 || cx > N - 2.2 || cy > N - 2.2) continue;
      const half = Math.min(xs[a + 1] - xs[a], ys[b + 1] - ys[b]) / 2;
      for (let q = 0; q < layers; q++) {
        const half2 = Math.min(half, (zs[q + 1] - zs[q]) / 2);
        // 지표 가까운 덩어리는 풍화가 오래 이어져 다 썩어 없어지기도 한다(맨 위 층의 절반, 둘째 층의 4분의 1).
        list.push([cx, cy, (zs[q] + zs[q + 1]) / 2, half2 * (0.86 + 0.1 * r()), r(), r(), r(), r() < (q === 0 ? 0.5 : q === 1 ? 0.25 : 0) ? 1 : 0]);
      }
    }
    const n = list.length;
    Object.assign(B, {
      n, x0: new Float32Array(n), y0: new Float32Array(n), zc: new Float32Array(n), a: new Float32Array(n),
      x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), r: new Float32Array(n), rho: new Float32Array(n),
      state: new Uint8Array(n), gone: new Uint8Array(n), moved: new Float32Array(n), v1: new Float32Array(n), v2: new Float32Array(n), v3: new Float32Array(n), k0: new Int32Array(n),
    });
    list.forEach((q, b) => {
      B.x0[b] = q[0]; B.y0[b] = q[1]; B.zc[b] = q[2]; B.a[b] = q[3]; B.v1[b] = q[4]; B.v2[b] = q[5]; B.v3[b] = q[6]; B.gone[b] = q[7];
      B.k0[b] = Math.round(q[1]) * N + Math.round(q[0]);
    });
  }

  const sampleTop = (x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (top[k] * (1 - a) + top[k + 1] * a) * (1 - b) + (top[k + N] * (1 - a) + top[k + N + 1] * a) * b;
  };
  const sampleG = (x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (g[k] * (1 - a) + g[k + 1] * a) * (1 - b) + (g[k + N] * (1 - a) + g[k + N + 1] * a) * b;
  };
  const sampleH = (x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + N] * (1 - a) + h[k + N + 1] * a) * b;
  };
  m.slope0 = slope0;
  m.sample = sampleTop;
  m.sampleGround = sampleH;
  m.sampleOrig = sampleG;

  const weatherP = t => smooth(T_WEATHER[0], T_WEATHER[1], t);
  const coldP = t => smooth(T_COLD, COLD_END, t);
  // 얼었다 녹는 움직임의 세기(0에서 1). 빙기에만 있다.
  const frost = t => opt().cy.move * smooth(T_COLD, T_COLD + 4, t) * (1 - smooth(T_WARM - 2, T_WARM + 2, t));
  m.jointFrac = () => smooth(T_JOINT[0], T_JOINT[1], m.clock);
  m.weatherFrac = () => weatherP(m.clock);
  m.frost = () => frost(m.clock);
  m.coldFrac = () => smooth(T_COLD, T_COLD + 3, m.clock) * (1 - smooth(T_WARM, T_WARM + 4, m.clock));
  m.forestFrac = () => {
    const t = m.clock;
    return (1 - smooth(T_COLD, T_COLD + 6, t)) * smooth(T_WEATHER[0], T_WEATHER[0] + 6, t) + smooth(T_TODAY, T_TODAY + 8, t);
  };

  // 땅 높이와 핵석 상태를 지금 때에 맞춘다.
  function update() {
    const t = m.clock, wp = weatherP(t), cp = coldP(t);
    for (let k = 0; k < size; k++) {
      wf[k] = wfMax[k] * wp;
      eNow[k] = eMax[k] * cp;
      h[k] = g[k] - eNow[k];
    }
    for (let b = 0; b < B.n; b++) {
      const k = B.k0[b], a = B.a[b], zc = B.zc[b];
      // 풍화 전선이 덩어리 윗면에 닿으면 둥글어지기 시작해, 아랫면 아래로 충분히 내려가면 다 둥글어진다.
      const rho = clamp((wf[k] - (zc - a)) / (2.6 * a));
      B.rho[b] = rho;
      B.r[b] = B.gone[b] ? a * (1 - rho) : a * (1 - 0.2 * rho);
      if (rho <= 0 || B.gone[b]) continue;
      const e = eNow[k];
      if (B.state[b] === 0 && e > zc - B.r[b] * 0.3) B.state[b] = 1;
      if (B.state[b] === 1 && e > zc) { B.state[b] = 2; B.x[b] = B.x0[b]; B.y[b] = B.y0[b]; }
    }
    if (t >= T_COLD) { move(); settle(); }
    else { top.set(h); cover.fill(0); }
  }

  // 드러난 바위를 겉면의 가장 가파른 쪽으로 옮긴다.
  function move() {
    const f = frost(m.clock);
    if (f <= 0) return;
    for (let b = 0; b < B.n; b++) {
      if (B.state[b] !== 2) continue;
      const x = B.x[b], y = B.y[b];
      // 제 몸이 만든 볼록한 곳 밖에서 기울기를 잰다.
      const o = Math.max(1, B.r[b] / CELL_M + 0.6);
      const gx = (sampleTop(x + o, y) - sampleTop(x - o, y)) / (2 * o), gy = (sampleTop(x, y + o) - sampleTop(x, y - o)) / (2 * o);
      const gl = Math.sqrt(gx * gx + gy * gy), s = gl / CELL_M;
      // 다른 바위 위에 얹힌 바위는 흙 위의 바위보다 쉽게 굴러 내려가, 쌓인 바위 더미가 골짜기를 따라 길고 얇게 퍼진다.
      const s0 = B.z[b] - 0.7 * B.r[b] > sampleH(x, y) + 0.3 ? S0_PILE : S0;
      if (s <= s0) continue;
      const step = Math.min(STEP_MAX, (KM * f * (s - s0) * (s - s0) * ROUND) / CELL_M);
      const nx = clamp(x - (gx / gl) * step, 1, N - 2), ny = clamp(y - (gy / gl) * step, 1, N - 2);
      const dx = nx - x, dy = ny - y;
      B.moved[b] += Math.sqrt(dx * dx + dy * dy) * CELL_M;
      B.x[b] = nx; B.y[b] = ny;
    }
  }

  // 바위를 겉면 위에 차례로 놓는다. 먼저 놓인 바위 위에 걸치면 그만큼 높이 놓인다.
  function settle() {
    top.set(h); cover.fill(0);
    const place = (b, loose) => {
      const r = B.r[b], rc = Math.max(0.7, r / CELL_M), x = loose ? B.x[b] : B.x0[b], y = loose ? B.y[b] : B.y0[b];
      const i0 = Math.max(0, Math.floor(x - rc)), i1 = Math.min(N - 1, Math.ceil(x + rc)), j0 = Math.max(0, Math.floor(y - rc)), j1 = Math.min(N - 1, Math.ceil(y + rc));
      let z;
      if (loose) {
        let base = sampleH(x, y);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const d = Math.sqrt((i - x) * (i - x) + (j - y) * (j - y));
          if (d <= rc * 0.75 && top[j * N + i] > base) base = top[j * N + i];
        }
        z = base + 0.6 * r;
      } else z = sampleG(B.x0[b], B.y0[b]) - B.zc[b];
      B.z[b] = z;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = Math.sqrt((i - x) * (i - x) + (j - y) * (j - y));
        if (d > rc) continue;
        const q = d / rc, k = j * N + i, tz = z + r * 0.8 * Math.sqrt(1 - q * q);
        if (tz > top[k]) top[k] = tz;
        if (tz > h[k] + 0.2) cover[k] = 1;
      }
    };
    for (let b = 0; b < B.n; b++) if (B.state[b] === 1) place(b, false);
    for (let b = 0; b < B.n; b++) if (B.state[b] === 2) place(b, true);
  }

  m.phase = () => {
    const t = m.clock;
    if (m.finished) return 'done';
    if (t < T_WEATHER[0]) return 'joint';
    if (t < T_COLD) return 'weather';
    if (t < T_GATHER) return 'cold';
    if (t < T_WARM) return 'gather';
    if (t < T_TODAY) return 'warm';
    return 'today';
  };

  // 이름표 자리. 그 지형이 실제로 있는 곳만 고른다. x, y는 칸, z는 높이(m)다. 옆면 이름표는 앞면(y = N - 1) 위에 놓는다.
  function computeSpots() {
    const out = {}, t = m.clock, F = N - 1, ph = m.phase();
    const at = (x, y) => g[Math.round(y) * N + Math.round(x)];
    const face = x => { const k = F * N + x; return { g: g[k], h: h[k], wf: wf[k] }; };
    // 절리: 아직 풍화되지 않은 기반암 속(앞면 왼쪽)
    const early = ph === 'joint' || ph === 'weather' || ph === 'cold';
    if (early && m.jointFrac() > 0.3) { const x = 58, f = face(x); out.joint = { x, y: F, z: f.g - Math.max(f.wf, 0) - 2.2 }; }
    // 기반암: 앞면 오른쪽 아래
    if (early) { const x = 108, f = face(x); out.bedrock = { x, y: F, z: Math.max(m.bottom + 2.5, f.g - f.wf - 4.5) }; }
    if (early && weatherP(t) > 0.25) {
      // 풍화층: 앞면에서 풍화 전선과 지표의 가운데
      const x = 44, f = face(x);
      if (f.wf - (f.g - f.h) > 1.5) out.saprolite = { x, y: F, z: f.h - (f.wf - (f.g - f.h)) / 2 };
      // 핵석: 앞면 가까이에 묻힌 둥근 덩어리 가운데 가장 많이 둥글어진 것(오른쪽 비탈 쪽)
      let best = -1;
      for (let b = 0; b < B.n; b++) {
        if (B.state[b] !== 0 || B.rho[b] < 0.3 || B.y0[b] < F - 4 || B.x0[b] < 60 || B.x0[b] > 112) continue;
        if (best < 0 || B.rho[b] - Math.abs(B.x0[b] - 92) * 0.004 > B.rho[best] - Math.abs(B.x0[best] - 92) * 0.004) best = b;
      }
      if (best >= 0) { const z = at(B.x0[best], F) - B.zc[best]; if (z < face(Math.round(B.x0[best])).h - 0.5) out.corestone = { x: B.x0[best], y: F, z }; }
    }
    if (ph === 'cold' || ph === 'gather') { const x = 100, y = 50; out.freeze = { x, y, z: sampleTop(x, y) }; }
    const r = blockReport(m);
    if (r.exposed >= MIN_SHARE && (ph === 'gather' || ph === 'warm' || ph === 'today' || ph === 'done')) {
      // 암괴류: 골짜기 바닥에 놓인 바위들의 가운데쯤(아래쪽으로 갈수록 두꺼운 곳)
      if (r.streamPct >= STREAM_SOME) {
        const ys = [];
        for (let b = 0; b < B.n; b++) if (B.state[b] === 2 && inStreamZone(B.x[b], B.y[b]) && B.y[b] < N - 8) ys.push(B.y[b]);
        ys.sort((p, q) => p - q);
        if (ys.length) { const y = Math.round(ys[Math.floor(ys.length * 0.6)]), x = Math.round(valleyX(y)); out.stream = { x, y, z: sampleTop(x, y) }; }
      }
      if (r.fieldPct >= FIELD_MIN) {
        // 암괴원: 골짜기 밖의 완만한 곳 가운데 바위가 넓게 깔린 곳(둘레 13칸 네모 안의 완만하고 바위가 덮인 칸이 가장 많은 곳)
        let best = -1, bc = 0;
        const flat = k => slope0[k] <= GENTLE && !inStreamZone(k % N, (k / N) | 0) && cover[k];
        for (let j = 18; j < N - 18; j += 2) for (let i = 18; i < N - 18; i += 2) {
          const k = j * N + i;
          if (!flat(k) || Math.abs(i - valleyX(j)) < STREAM_HALF + 6) continue;
          let c = 0;
          for (let dj = -6; dj <= 6; dj += 2) for (let di = -6; di <= 6; di += 2) c += flat(k + dj * N + di) ? 1 : 0;
          if (c > bc) { bc = c; best = k; }
        }
        if (best >= 0 && bc >= 8) out.field = { x: best % N, y: (best / N) | 0, z: sampleTop(best % N, (best / N) | 0) };
      }
    }
    if (ph === 'today' || ph === 'done') {
      // 숲: 바위가 없는 왼쪽 앞쪽의 땅
      let best = -1, bd = 1e9;
      for (let j = 10; j < N - 10; j += 2) for (let i = 10; i < N - 10; i += 2) {
        const k = j * N + i;
        let clear = true;
        for (let dj = -3; dj <= 3 && clear; dj++) for (let di = -3; di <= 3 && clear; di++) if (cover[k + dj * N + di]) clear = false;
        if (!clear) continue;
        const d = (i - 16) * (i - 16) + (j - 100) * (j - 100);
        if (d < bd) { bd = d; best = k; }
      }
      if (best >= 0) out.forest = { x: best % N, y: (best / N) | 0, z: h[best] };
    }
    return out;
  }
  m.spots = () => spotCache;
  m.endTime = () => T_END;

  function round() {
    m.clock = Math.round((m.clock + ROUND) * 1000) / 1000; roundNo++;
    update();
    m.version++;
    if (roundNo % 5 === 0) spotCache = computeSpots();
    if (m.clock >= T_END - 1e-9) { m.finished = true; spotCache = computeSpots(); }
  }

  m.setOption = (name, v) => { m.options[name] = v; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  m.reset = () => {
    const key = `${m.options.slope}:${m.options.spacing}:${m.options.cycles}`;
    if (key !== builtKey) { buildGround(); buildBlocks(); builtKey = key; }
    B.state.fill(0); B.moved.fill(0);
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

// 단면: 골짜기 가운데 줄을 따라 산꼭대기(A)에서 산기슭(B)까지 자른다.
export function sectionLine(samples = 128) {
  const pts = [];
  for (let t = 0; t < samples; t++) { const y = 1 + ((N - 3) * t) / (samples - 1); pts.push([valleyX(y), y]); }
  return pts;
}

const round1 = v => Math.round(v * 10) / 10;
// 막대와 판정 문구를 한 번에 만든다. 화면의 숫자와 문구가 같은 집계에서 나온다.
export function blockReport(m) {
  const B = m.boulders, ph = m.phase();
  let field = 0, exposed = 0, loose = 0, dSum = 0, mvSum = 0, stream = 0, core = 0, area = 0, wfS = 0;
  for (let b = 0; b < B.n; b++) {
    if (B.rho[b] > 0.05 && B.r[b] > 0.1 * B.a[b]) core++;
    if (B.state[b] === 0) continue;
    exposed++; dSum += 2 * B.r[b];
    const x = B.state[b] === 2 ? B.x[b] : B.x0[b], y = B.state[b] === 2 ? B.y[b] : B.y0[b];
    if (inStreamZone(x, y)) stream++;
    else if (m.slope0[Math.round(y) * N + Math.round(x)] <= GENTLE) field++;
    if (B.state[b] === 2) { loose++; mvSum += B.moved[b]; }
  }
  for (let k = 0; k < N * N; k++) { if (m.cover[k]) area++; wfS += m.wf[k] - m.e[k]; }
  const sizeM = exposed ? round1(dSum / exposed) : 0, movedM = loose ? Math.round(mvSum / loose) : 0;
  const streamPct = exposed ? Math.round((stream / exposed) * 100) : 0, fieldPct = exposed ? Math.round((field / exposed) * 100) : 0, restPct = exposed ? 100 - streamPct - fieldPct : 0;
  const areaM2 = Math.round((area * CELL_M * CELL_M) / 100) * 100, sapM = round1(wfS / (N * N));
  const ongoing = ph === 'cold' || ph === 'gather';
  const parts = [];
  if (ph === 'joint' || ph === 'weather') {
    if (sapM >= 0.1) parts.push(`풍화층(마사토)이 평균 약 ${sapM}m 두께로 생겼고, 둥글어지기 시작한 핵석이 ${core}개입니다.`);
    else parts.push('아직 풍화가 시작되지 않아 바위가 단단합니다.');
    parts.push('바위는 모두 땅속에 묻혀 있어 드러난 바위가 없습니다.');
  } else if (exposed === 0) parts.push('아직 흙이 덜 씻겨 나가 드러난 바위가 없습니다.');
  else {
    parts.push(`드러난 바위는 ${exposed}개이고, 평균 크기는 약 ${sizeM}m입니다.`);
    if (loose === 0) parts.push('아직 흙에서 완전히 빠져나온 바위는 없습니다.');
    else if (movedM < 1) parts.push(ongoing ? '드러난 바위는 아직 거의 움직이지 않았습니다.' : '드러난 바위는 거의 움직이지 않았습니다.');
    else parts.push(`바위가 비탈 아래로 평균 약 ${movedM}m 내려왔습니다.`);
    if (exposed >= MIN_SHARE && ph !== 'cold') {
      const done = ongoing ? '되어 갑니다' : '되었습니다';
      const fieldOk = fieldPct >= FIELD_MIN;
      if (streamPct >= STREAM_MOST) parts.push(`바위의 약 ${streamPct}%가 골짜기를 따라 길게 모여 암괴류가 ${done}.` + (fieldOk ? ` 약 ${fieldPct}%는 완만한 곳에 넓게 깔려 암괴원이 ${done}.` : ''));
      else if (streamPct >= STREAM_SOME && fieldOk) parts.push(`바위의 약 ${streamPct}%는 골짜기에 모여 암괴류가 되고, 약 ${fieldPct}%는 완만한 곳에 넓게 깔려 암괴원이 ${done}.`);
      else if (streamPct >= STREAM_SOME) parts.push(`바위의 약 ${streamPct}%는 골짜기에 모여 암괴류가 ${done}.`);
      else if (fieldOk) parts.push(`바위의 약 ${fieldPct}%가 완만한 곳에 넓게 깔려 암괴원이 ${done}.`);
      else parts.push('바위가 비탈 여기저기에 흩어져 있습니다.');
      if (restPct >= 1 && (streamPct >= STREAM_SOME || fieldOk)) parts.push(`나머지 약 ${restPct}%는 비탈에 흩어져 있습니다.`);
    }
    if (areaM2 > 0) parts.push(`바위로 덮인 땅은 약 ${areaM2}m²입니다.`);
  }
  const halfPct = exposed ? Math.round(((exposed - loose) / exposed) * 100) : 0;
  return { exposed, loose, halfPct, core, sizeM, movedM, streamPct, fieldPct, restPct, areaM2, sapM, text: parts.join(' ') };
}

export function noteText(m) {
  const ph = m.phase(), r = blockReport(m);
  const sp = SPACING[m.options.spacing].sp, few = m.options.cycles === 'few';
  if (ph === 'done' || ph === 'today') {
    let t = r.text;
    t += ' 바위 사이의 고운 흙은 빗물에 씻겨 빠져(우세) 빈틈이 생겼고 둘레에는 숲이 다시 자랐습니다. 지금 기후에서는 바위가 거의 움직이지 않습니다. 암괴류와 암괴원은 땅이 얼었다 녹기를 되풀이하던 추운 옛 기후(주빙하 환경)에서 만들어진 지형입니다.';
    if (few && r.exposed) t += r.halfPct >= 10 ? ` 얼었다 녹는 횟수가 적어 흙이 덜 씻겨 나갔습니다. 드러난 바위 가운데 약 ${r.halfPct}%는 아직 흙에 반쯤 묻혀 있습니다.` : ` 얼었다 녹는 횟수가 적어 흙이 덜 씻겨 나갔고, 그만큼 드러난 바위가 적습니다(풍화층이 평균 약 ${r.sapM}m 남음).`;
    t += ' 실제 예로 대구 비슬산에는 골짜기를 따라 길게 이어진 암괴류가 있어 천연기념물로 지정되어 있습니다.';
    return t;
  }
  if (ph === 'joint') return `화강암은 땅속 깊은 곳에서 마그마가 식어 굳은 바위입니다. 식으면서 줄어들고, 위를 덮던 땅이 깎여 누르던 힘이 줄면서 바위에 세로 틈과 땅 표면과 나란한 틈이 생깁니다. 이 틈을 절리라고 하며, 블록 옆면에 검은 줄로 보입니다. 이 모형의 절리 간격은 약 ${sp}m입니다.`;
  if (ph === 'weather') return '오랜 세월 동안 절리를 따라 깊이 스며든 물이 바위를 조금씩 썩게 합니다(심층 풍화). 우리나라에서는 신생대 제3기와 제4기 간빙기처럼 따뜻하고 습했던 시기에 주로 일어났다고 봅니다. 틈 가까운 바위는 광물 알갱이가 낱낱이 떨어져 굵은 모래 같은 흙(마사토)이 되고, 틈에 둘러싸인 덩어리는 세 면의 물이 닿는 모서리부터 깎여 둥근 핵석이 됩니다(구상 풍화). 풍화가 닿은 가장 깊은 곳을 풍화 전선이라고 합니다. 땅 위에서는 보이지 않고 땅속에서 일어나는 일입니다.';
  if (ph === 'cold') return `빙기가 와 기후가 추워져, 산지 비탈은 땅이 얼었다 녹기를 되풀이하는 주빙하 환경과 비슷해졌습니다. 흙 속의 물이 얼었다 녹기를 되풀이하면서(얼었다 녹는 횟수 ${CYCLES[m.options.cycles].name}) 흙이 부풀었다 가라앉으며 조금씩 내려가고(동상 포행), 녹아 물을 머금은 흙은 비탈 아래로 천천히 흘러내립니다(솔리플럭션). 녹은 물과 빗물은 고운 흙을 씻어 냅니다. 흙이 얇아지자 핵석이 땅 위로 드러나기 시작합니다.`;
  if (ph === 'gather') return '드러난 바위들이 얼었다 녹는 흙과 함께 비탈 아래로 아주 천천히 움직입니다. 땅 위로 드러난 바위는 틈에 든 물이 얼며 벌어지는 힘(동결 파쇄)으로 더 쪼개지기도 합니다. 고운 흙이 씻겨 나가고 바위만 남아, 비탈이 급한 곳의 바위는 오목한 골짜기로 모여 길게 이어지고(암괴류), 완만한 곳의 바위는 덜 움직이고 넓게 깔립니다(암괴원).';
  return '빙기가 끝나 기후가 따뜻해졌습니다. 얼었다 녹기가 거의 없어져 바위는 더 이상 움직이지 않습니다. 바위 사이에 남은 흙은 빗물에 씻겨 빠지고 빈틈이 생깁니다.';
}

export function compareBrief(a, b) {
  const t = m => {
    const r = blockReport(m);
    return `드러난 바위 ${r.exposed}개 가운데 약 ${r.streamPct}%가 골짜기에 모였고 약 ${r.fieldPct}%가 완만한 곳에 깔렸으며, 바위가 평균 약 ${r.movedM}m 내려왔으며, 바위로 덮인 땅이 약 ${r.areaM2}m²입니다`;
  };
  const ra = blockReport(a), rb = blockReport(b);
  let extra = '';
  if (rb.streamPct > ra.streamPct && rb.movedM > ra.movedM) extra = '급한 비탈에서는 바위가 더 멀리 내려와 골짜기에 길게 모이고(암괴류), 완만한 비탈에서는 바위가 제자리 가까이에 넓게 남습니다(암괴원).';
  if (rb.areaM2 < ra.areaM2) extra += ' 바위가 골짜기로 모인 급한 비탈은 바위로 덮인 땅이 더 좁습니다.';
  return { a: t(a), b: t(b), extra: extra.trim() };
}
