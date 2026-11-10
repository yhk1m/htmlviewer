// © 2026 김용현
// 여울, 소, 모래톱 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 블록은 강가 들판 사이로 흐르는 하천 한 구간이다. 물은 왼쪽(x가 작은 쪽, 상류)에서 오른쪽(하류)으로 흐른다.
// 1. 처음에는 굽이진 물길의 바닥이 고르다. 굽이에서는 물이 굽이 바깥쪽으로 쏠린다.
// 2. 굽이 바깥은 물이 부딪혀 바닥이 깊게 파이고(소), 굽이 안쪽은 물이 느려 모래가 쌓인다(모래톱).
//    굽이와 굽이 사이 물길이 건너가는 곳은 바닥이 조금 높아지고 자갈이 깔린다(여울).
//    바닥은 물의 쏠림이 정한 모양(목표 바닥)으로 해마다 조금씩 다가간다. 쏠림은 물길이 굽은 정도에서 나온다.
//    곧은 물길에도 물이 양쪽으로 번갈아 조금씩 쏠려 약한 여울과 소, 옆 모래톱이 생긴다.
// 3. 물 높이는 하류에서 상류로 거슬러 올라가며 정한다. 평소에는 여울 마루가 물을 막아 소에 물이 고이고(느림),
//    홍수 때는 물이 깊어져 그 효과가 줄고, 소 자리 물길이 여울 자리보다 좁아 소의 물이 더 빨라진다.
//    단면의 물 빠르기는 (흐르는 물의 양) / (물에 잠긴 단면 넓이)다.
// 계산에는 사칙연산과 제곱근, 내림, 올림, 반올림, 큰 값, 작은 값, 절댓값만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 160; // 물 흐르는 방향(x)의 칸 수
export const NY = 76; // 가로 방향(y)의 칸 수. 블록은 약 160m x 76m다.
export const CELL_M = 1; // 칸 한 변(m)
export const W = 10; // 물길 너비(칸)
export const HB = 3; // 처음 강바닥에서 둑 위(들판)까지 높이(m)
export const ROUND = 0.2; // 계산 한 번의 때(초)
export const T_START = 3; // 바닥이 바뀌기 시작
export const T_SCOUR = 18; // 굽이 바깥이 깎이는 단계까지
export const T_BAR = 34; // 굽이 안쪽에 모래가 쌓이는 단계까지
export const T_END = 60;
export const L = 25; // 단면 하나의 가로 점 수
export const NR = 1.25; // 단면이 물길 반너비의 몇 배까지 가는지
export const REL = 0.3; // 소와 여울로 셀 바닥 높낮이 차이(m)
export const SLOPE_X = 0.004; // 들판과 강바닥이 하류로 낮아지는 기울기
const LAG = 6; // 가장 깊은 곳이 굽이 꼭짓점보다 하류로 밀린 거리(칸)
const KN = 28; // 굽은 정도를 물의 쏠림(0에서 1쯤)으로 바꾸는 값
const STRAIGHT_AMP = 0.32; // 곧은 물길에서 물이 번갈아 쏠리는 세기
const STRAIGHT_LEN = 120; // 곧은 물길에서 쏠림이 한 번 오가는 길이(칸)

export const FLOW = {
  normal: { name: '평소', say: '평소에는', h: 0.3, sf: 0.0005, u: 0.45, deep: 0.75, rate: 0.7 },
  high: { name: '많음', say: '물이 많을 때는', h: 0.9, sf: 0.0012, u: 0.9, deep: 0.9, rate: 0.9 },
  flood: { name: '홍수', say: '홍수 때는', h: 2.4, sf: 0.003, u: 1.6, deep: 1.05, rate: 1.2 },
};
export const CURVE = {
  straight: { name: '곧음', A: 0, lam: 110 },
  mid: { name: '보통', A: 9, lam: 110 },
  strong: { name: '심함', A: 15, lam: 100 },
};
export const SAND = {
  few: { name: '적음', bar: 0.65, pool: 1.12, riffle: 0.9 },
  many: { name: '많음', bar: 1.2, pool: 0.9, riffle: 1.1 },
};
export const PRESETS = {
  textbook: { flow: 'normal', curve: 'mid', sand: 'many' },
  straight: { flow: 'normal', curve: 'straight', sand: 'many' },
  strong: { flow: 'normal', curve: 'strong', sand: 'many' },
  flood: { flow: 'flood', curve: 'mid', sand: 'many' },
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
// 굽이: 사인 대신 다듬은 세모꼴(3차식). u의 한 주기마다 1에서 -1 사이를 오간다.
export function wave(u) {
  const f = u - Math.floor(u), w = 2 * Math.abs(2 * f - 1) - 1;
  return w * (1.5 - 0.5 * w * w);
}

export function createModel(seed = 7) {
  const size = N * NY;
  const z = new Float32Array(size), z0 = new Float32Array(size), tgt = new Float32Array(size);
  const nK = new Float32Array(size), sK = new Float32Array(size), qK = new Int32Array(size), rifW = new Float32Array(size), sideK = new Int8Array(size);
  const m = { z, z0, nK, sK, qK, rifW, sideK, seed, options: { ...PRESETS.textbook }, clock: 0, finished: false, version: 0 };
  const n1 = makeNoise(seed + 3, 9), n2 = makeNoise(seed + 5, 3);
  let planKey = '', targetKey = '', roundNo = 0, carry = 0, spotCache = {}, chan = [];
  const sec = { S: 0 };
  m.sec = sec;
  const Q = {};

  // 물길 가운데 줄을 1칸 간격으로 나눈 단면 자리. 블록 밖까지 조금 이어 그린다.
  function buildPlan() {
    const { A, lam } = CURVE[m.options.curve];
    const ph = 0.25 - 12 / lam;
    const yc = x => NY / 2 + A * wave(x / lam + ph);
    const X0 = -10, X1 = N + 9, H = 0.02, steps = Math.round((X1 - X0) / H);
    const cx = [X0], cy = [yc(X0)];
    let px = X0, py = yc(X0), arc = 0, next = 1;
    for (let s = 1; s <= steps; s++) {
      const x = X0 + s * H, y = yc(x), d = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
      while (arc + d >= next) { const t = (next - arc) / d; cx.push(px + (x - px) * t); cy.push(py + (y - py) * t); next++; }
      arc += d; px = x; py = y;
    }
    const S = cx.length;
    Object.assign(sec, {
      S, cx: Float64Array.from(cx), cy: Float64Array.from(cy), tx: new Float64Array(S), ty: new Float64Array(S), kap: new Float64Array(S), f: new Float64Array(S), hw: new Float64Array(S),
      inBlock: new Uint8Array(S), tz: new Float64Array(S), bed: new Float64Array(S * L), bed0: new Float64Array(S), top: new Float64Array(S),
    });
    for (let q = 0; q < S; q++) {
      const a = Math.max(0, q - 1), b = Math.min(S - 1, q + 1);
      const dx = (sec.cx[b] - sec.cx[a]) / (b - a), dy = (sec.cy[b] - sec.cy[a]) / (b - a), l = Math.sqrt(dx * dx + dy * dy);
      sec.tx[q] = dx / l; sec.ty[q] = dy / l;
      if (q > 0 && q < S - 1) {
        const xx = sec.cx[q + 1] - 2 * sec.cx[q] + sec.cx[q - 1], yy = sec.cy[q + 1] - 2 * sec.cy[q] + sec.cy[q - 1], p = dx * dx + dy * dy;
        sec.kap[q] = (dx * yy - dy * xx) / (p * Math.sqrt(p));
      }
      sec.inBlock[q] = sec.cx[q] >= 0.5 && sec.cx[q] <= N - 1.5 ? 1 : 0;
      sec.top[q] = -SLOPE_X * sec.cx[q];
      sec.bed0[q] = sec.top[q] - HB;
    }
    sec.kap[0] = sec.kap[1]; sec.kap[S - 1] = sec.kap[S - 2];
    // 물의 쏠림: 양수면 왼쪽(n이 양수인 쪽)이 굽이 바깥이다. 곧은 물길은 번갈아 약하게 쏠린다.
    const sm = new Float64Array(S);
    for (let q = 0; q < S; q++) { let s = 0, c = 0; for (let p = Math.max(0, q - 2); p <= Math.min(S - 1, q + 2); p++) { s += sec.kap[p]; c++; } sm[q] = s / c; }
    for (let q = 0; q < S; q++) {
      sec.f[q] = A > 0 ? -KN * sm[Math.max(0, q - LAG)] : STRAIGHT_AMP * wave(q / STRAIGHT_LEN + 0.25 - 22 / STRAIGHT_LEN);
      // 소 자리(굽이)는 좁고 깊으며, 여울 자리(굽이 사이)는 넓고 얕다.
      sec.hw[q] = (W / 2) * (1.25 - 0.5 * Math.min(1, Math.abs(sec.f[q])));
    }
    sec.qa = 0; while (!sec.inBlock[sec.qa]) sec.qa++;
    sec.qb = S - 1; while (!sec.inBlock[sec.qb]) sec.qb--;
    // 칸마다 가장 가까운 단면과 물길 가운데에서 떨어진 정도(반너비의 몇 배, 왼쪽이 양수)
    let qa = 0;
    for (let i = 0; i < N; i++) {
      while (qa < S - 1 && sec.cx[qa] < i - 12) qa++;
      for (let j = 0; j < NY; j++) {
        const k = j * N + i;
        let best = -1, bd = 1e9;
        for (let q = qa; q < S && sec.cx[q] <= i + 12; q++) { const ex = i - sec.cx[q], ey = j - sec.cy[q], d = ex * ex + ey * ey; if (d < bd) { bd = d; best = q; } }
        if (best < 0) { qK[k] = 0; nK[k] = 99; sK[k] = 0; continue; }
        const ex = i - sec.cx[best], ey = j - sec.cy[best];
        qK[k] = best;
        sK[k] = best + ex * sec.tx[best] + ey * sec.ty[best];
        nK[k] = (-ex * sec.ty[best] + ey * sec.tx[best]) / sec.hw[best];
      }
    }
    // 처음 땅: 들판, 둑, 고른 강바닥
    for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, an = Math.abs(nK[k]);
      if (an <= 1.2) z0[k] = sec.bed0[qK[k]] + HB * smooth(0.6, 1.2, an) + (n2(i, j) - 0.5) * 0.04;
      else z0[k] = -SLOPE_X * i + (n1(i, j) - 0.5) * 0.3 * smooth(1.2, 1.75, an);
    }
    // 흐르는 물의 양: 처음 고른 바닥에서 유량마다 정한 빠르기가 나오게 한다.
    z.set(z0); computeSections();
    for (const key of Object.keys(FLOW)) {
      Q[key] = 0;
      const st = stageCalc(key, true);
      let a = 0, c = 0;
      for (let q = sec.qa; q <= sec.qb; q++) { a += st.A[q]; c++; }
      Q[key] = FLOW[key].u * (a / c);
    }
  }

  const fAt = s => { const u = clamp(s, 0, sec.S - 1.001), q = Math.floor(u), t = u - q; return sec.f[q] * (1 - t) + sec.f[q + 1] * t; };

  // 목표 바닥: 물의 쏠림이 정한 바닥 모양. 지금 바닥은 이 모양으로 조금씩 다가간다.
  function buildTargets() {
    const F = FLOW[m.options.flow], Sd = SAND[m.options.sand];
    const Sc = 1.7 * F.deep * Sd.pool, Bc = 1.7 * Sd.bar * (0.8 + 0.2 * F.deep), Rc = 0.45 * Sd.riffle;
    chan = [];
    rifW.fill(0); sideK.fill(0);
    for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, an = Math.abs(nK[k]);
      if (an > 1.25) { tgt[k] = z0[k]; continue; }
      const fs = fAt(sK[k]), a = Math.min(1.3, Math.abs(fs)), side = fs >= 0 ? 1 : -1, mm = nK[k] * side, q = qK[k];
      const e = (mm - 0.45) / 0.8;
      const pool = Sc * a * Math.max(0, 1 - e * e); // 굽이 바깥 쪽이 깊게 파인다.
      const riff = Rc * (1 - smooth(0.15, 0.6, a)); // 굽이 사이는 바닥이 고르게 높아진다.
      const bar = Bc * (0.3 * smooth(0.1, 0.32, a) + 0.7 * smooth(0.35, 0.95, a)) * smooth(-0.15, 0.7, -mm); // 굽이 안쪽에 모래가 쌓인다.
      let t = sec.bed0[q] - pool + riff + bar + (n2(i + 40, j) - 0.5) * 0.06;
      const keep = smooth(mm > 0 ? 0.92 : 0.8, 1.2, an);
      t += (z0[k] - t) * keep;
      if (mm < -0.2 && t < z0[k]) t = z0[k];
      tgt[k] = t;
      chan.push(k);
      rifW[k] = (1 - smooth(0.15, 0.6, a)) * (1 - keep);
      sideK[k] = mm < 0 ? -1 : 1;
    }
  }

  const sampleZ = (x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, NY - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (z[k] * (1 - a) + z[k + 1] * a) * (1 - b) + (z[k + N] * (1 - a) + z[k + N + 1] * a) * b;
  };
  m.sample = sampleZ;
  m.nAt = l => -NR + (2 * NR * l) / (L - 1);

  // 단면마다 가로로 바닥 높이를 잰다. tz는 가장 깊은 곳(물길 가운데 반너비 안).
  function computeSections() {
    const { S, cx, cy, tx, ty, hw, bed, tz } = sec;
    for (let q = 0; q < S; q++) {
      let lo = 1e9;
      for (let l = 0; l < L; l++) {
        const n = m.nAt(l), b = sampleZ(cx[q] - ty[q] * n * hw[q], cy[q] + tx[q] * n * hw[q]);
        bed[q * L + l] = b;
        if (n >= -1 && n <= 1 && b < lo) lo = b;
      }
      tz[q] = lo;
    }
  }

  // 유량 하나의 물 높이와 빠르기. 하류 끝에서 상류로 거슬러 오르며 물 높이를 정한다.
  // 물 높이는 그 자리 가장 깊은 바닥보다 h만큼 높거나, 바로 아래 단면 물 높이에 기울기를 더한 값 가운데 큰 쪽이다(둑 위는 넘지 않는다).
  const stageCache = {};
  function stageCalc(key, fresh = false) {
    const c = stageCache[key];
    if (!fresh && c && c.version === m.version && c.plan === planKey) return c;
    const F = FLOW[key], { S, tz, top, hw, bed } = sec;
    const st = c && c.ws.length === S ? c : { ws: new Float64Array(S), A: new Float64Array(S), U: new Float64Array(S), uL: new Float64Array(S * L) };
    // 하류 끝 너머에 여울이 하나 더 있다고 보고 물 높이를 정한다.
    st.ws[S - 1] = Math.max(tz[S - 1], sec.bed0[S - 1] + 0.5) + F.h;
    for (let q = S - 2; q >= 0; q--) st.ws[q] = Math.max(tz[q] + F.h, st.ws[q + 1] + F.sf);
    for (let q = 0; q < S; q++) {
      if (st.ws[q] > top[q] - 0.08) st.ws[q] = Math.max(top[q] - 0.08, tz[q] + 0.05);
      const dl = ((2 * NR * hw[q]) / (L - 1)) * CELL_M;
      let a = 0, sd = 0, sdd = 0;
      for (let l = 0; l < L; l++) {
        const d = Math.max(0, st.ws[q] - bed[q * L + l]);
        if (Math.abs(m.nAt(l)) > 1.2) continue;
        a += d * dl; sd += d; sdd += d * Math.sqrt(d);
      }
      st.A[q] = a;
      const U = a > 0.01 ? Math.min(4, Q[key] / a) : 0;
      st.U[q] = U;
      // 단면 안에서는 깊은 곳이 빠르다. 단면 평균 빠르기는 그대로 둔다.
      for (let l = 0; l < L; l++) {
        const d = Math.max(0, st.ws[q] - bed[q * L + l]);
        st.uL[q * L + l] = sdd > 0 && Math.abs(m.nAt(l)) <= 1.2 ? (U * Math.sqrt(d) * sd) / sdd : 0;
      }
    }
    st.version = m.version; st.plan = planKey;
    stageCache[key] = st;
    return st;
  }
  m.stage = key => stageCalc(key);
  m.current = () => stageCalc(m.options.flow);

  // 계산 한 번: 물길 안 칸의 바닥이 목표 바닥으로 다가간다. 깎이는 쪽이 쌓이는 쪽보다 조금 빠르다.
  function round() {
    m.clock = Math.round((m.clock + ROUND) * 1000) / 1000; roundNo++;
    if (m.clock > T_START) {
      const r = 0.016 * FLOW[m.options.flow].rate;
      for (const k of chan) { const d = tgt[k] - z[k]; z[k] += d * (d < 0 ? r * 1.25 : r * 0.8); }
    }
    computeSections();
    m.version++;
    if (roundNo % 5 === 0) spotCache = computeSpots();
    if (m.clock >= T_END - 1e-9) { m.finished = true; spotCache = computeSpots(); }
  }

  m.phase = () => {
    const t = m.clock;
    if (m.finished) return 'done';
    if (t < T_START) return 'start';
    if (t < T_SCOUR) return 'scour';
    if (t < T_BAR) return 'bar';
    return 'pattern';
  };
  m.progressFrac = () => smooth(T_START, 40, m.clock);

  // 이름표 자리. 그 지형이 실제로 있는 곳만 고른다. x, y는 칸, z는 높이(m)다.
  function computeSpots() {
    const out = {}, r = bedReport(m), st = m.current();
    const at = (q, l) => { const n = m.nAt(l); return { x: sec.cx[q] - sec.ty[q] * n * sec.hw[q], y: sec.cy[q] + sec.tx[q] * n * sec.hw[q] }; };
    if (r.deepQ >= 0) {
      const q = r.deepQ;
      let bl = 0, lo = 1e9;
      for (let l = 0; l < L; l++) { const n = m.nAt(l); if (n >= -1 && n <= 1 && sec.bed[q * L + l] < lo) { lo = sec.bed[q * L + l]; bl = l; } }
      out.pool = { ...at(q, bl), z: st.ws[q], q };
    }
    if (r.riffleQ.length) {
      let q = r.riffleQ[0];
      for (const p of r.riffleQ) if (Math.abs(sec.cx[p] - N / 2) < Math.abs(sec.cx[q] - N / 2)) q = p;
      out.riffle = { ...at(q, (L - 1) / 2), z: st.ws[q], q };
    }
    if (r.barM2 > 0) {
      // 소 이름표와 겹치지 않게, 소가 둘 넘으면 가장 깊은 소가 아닌 다른 소의 굽이 안쪽 모래톱에 단다.
      const others = r.poolQ.filter(q => q !== r.deepQ);
      let ref = out.pool ? out.pool.q : sec.S / 2;
      for (const q of others) if (ref === r.deepQ || Math.abs(sec.cx[q] - N / 2) < Math.abs(sec.cx[ref] - N / 2)) ref = q;
      const ws = m.stage('normal').ws;
      let best = -1, bs = -1e9;
      for (const k of chan) {
        if (!isBar(k, ws)) continue;
        const sc = z[k] - z0[k] - 0.03 * Math.abs(sK[k] - ref);
        if (sc > bs) { bs = sc; best = k; }
      }
      if (best >= 0) out.bar = { x: best % N, y: (best / N) | 0, z: z[best] };
    }
    return out;
  }
  const isBar = (k, ws) => Math.abs(nK[k]) <= 1 && z[k] - z0[k] >= 0.2 && z[k] > ws[qK[k]] + 0.02;
  m.isBar = isBar;
  m.chan = () => chan;
  m.spots = () => spotCache;
  m.endTime = () => T_END;
  m.setOption = (name, v) => { m.options[name] = v; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  m.reset = () => {
    if (m.options.curve !== planKey) { planKey = m.options.curve; buildPlan(); }
    const key = `${m.options.curve}:${m.options.flow}:${m.options.sand}`;
    if (key !== targetKey) { buildTargets(); targetKey = key; }
    z.set(z0);
    roundNo = 0; carry = 0; m.clock = 0; m.finished = false;
    computeSections();
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

// 물길 바닥에서 가장 깊은 곳을 이은 줄(하천 바닥 가장 깊은 곳)을 따라 소와 여울을 찾는다.
// 소: 앞뒤 15칸 안에서 가장 낮고, 앞뒤 30칸 안의 가장 높은 곳보다 REL 넘게 낮은 곳. 여울은 그 반대다.
export function features(m) {
  const { tz, cx, qa, qb } = m.sec, r = new Float64Array(m.sec.S);
  for (let q = qa; q <= qb; q++) {
    let s = 0, c = 0;
    for (let p = Math.max(qa, q - 2); p <= Math.min(qb, q + 2); p++) { s += tz[p] + SLOPE_X * cx[p]; c++; }
    r[q] = s / c;
  }
  const pools = [], riffles = [];
  for (let q = qa + 5; q <= qb - 5; q++) {
    let isMin = true, isMax = true, hi = -1e9, lo = 1e9;
    for (let p = Math.max(qa, q - 15); p <= Math.min(qb, q + 15); p++) {
      if (p === q) continue;
      if (p < q ? r[p] <= r[q] : r[p] < r[q]) isMin = false;
      if (p < q ? r[p] >= r[q] : r[p] > r[q]) isMax = false;
    }
    for (let p = Math.max(qa, q - 30); p <= Math.min(qb, q + 30); p++) { hi = Math.max(hi, r[p]); lo = Math.min(lo, r[p]); }
    if (isMin && hi - r[q] >= REL) pools.push(q);
    if (isMax && r[q] - lo >= REL) riffles.push(q);
  }
  return { pools, riffles, rel: r };
}

const round1 = v => Math.round(v * 10) / 10, round2 = v => Math.round(v * 100) / 100;
const mean = (arr, f) => { let s = 0; for (const q of arr) s += f[q]; return arr.length ? s / arr.length : 0; };
// 막대와 판정 문구를 한 번에 만든다. 화면의 숫자와 문구가 같은 집계에서 나온다.
export function bedReport(m) {
  const { pools, riffles } = features(m), sec = m.sec, ph = m.phase();
  const nS = m.stage('normal'), fS = m.stage('flood'), cS = m.current(), F = FLOW[m.options.flow];
  let deepQ = -1, deep = 0;
  for (const q of pools) { const d = nS.ws[q] - sec.tz[q]; if (d > deep) { deep = d; deepQ = q; } }
  const poolDepthM = round1(deep);
  let gap = 0;
  for (let a = 1; a < pools.length; a++) gap += pools[a] - pools[a - 1];
  const spacingW = pools.length >= 2 ? round1((gap / (pools.length - 1)) * CELL_M / (W * CELL_M)) : 0;
  let bar = 0;
  for (const k of m.chan()) if (m.isBar(k, nS.ws)) bar++;
  const barM2 = Math.round((bar * CELL_M * CELL_M) / 10) * 10;
  let uMax = 0, uMin = 1e9;
  for (let q = sec.qa + 2; q <= sec.qb - 2; q++) { uMax = Math.max(uMax, cS.U[q]); uMin = Math.min(uMin, cS.U[q]); }
  const diff = round2(uMax - uMin);
  const both = pools.length > 0 && riffles.length > 0;
  const up = round2(mean(pools, cS.U)), ur = round2(mean(riffles, cS.U));
  const nUp = round2(mean(pools, nS.U)), nUr = round2(mean(riffles, nS.U)), fUp = round2(mean(pools, fS.U)), fUr = round2(mean(riffles, fS.U));
  const done = ph === 'done';
  const parts = [];
  if (!both) {
    if (ph === 'start') parts.push('물이 흐르기 시작했습니다. 강바닥은 아직 고릅니다.');
    else parts.push('강바닥이 조금씩 바뀌고 있지만 아직 소와 여울이 뚜렷하지 않습니다.');
  } else {
    parts.push(`소 ${pools.length}곳과 여울 ${riffles.length}곳이 번갈아 ${done ? '생겼습니다' : '생기고 있습니다'}.`);
    if (pools.length >= 2) parts.push(`소와 소 사이는 물길 너비의 약 ${spacingW}배입니다.`);
    parts.push(`가장 깊은 소는 평소 물 깊이가 약 ${poolDepthM}m입니다.`);
  }
  if (barM2 > 0) parts.push(`평소 물 위로 드러난 모래톱은 약 ${barM2}m²입니다.`);
  else if (ph !== 'start') parts.push('아직 평소 물 위로 드러난 모래톱은 없습니다.');
  if (both) {
    if (ur > up) parts.push(`${F.say} 여울(약 ${ur}m/s)이 소(약 ${up}m/s)보다 빠릅니다.`);
    else if (up > ur) parts.push(`${F.say} 소(약 ${up}m/s)가 여울(약 ${ur}m/s)보다 빠릅니다.`);
    else parts.push(`${F.say} 여울과 소의 빠르기가 비슷합니다(약 ${ur}m/s).`);
    if (m.options.flow !== 'normal' && nUr > nUp && up >= ur) parts.push(`평소에는 여울이 더 빨랐는데(여울 약 ${nUr}m/s, 소 약 ${nUp}m/s), 물이 많아지자 빠르기가 뒤바뀌었습니다.`);
  }
  parts.push(`가장 빠른 곳과 느린 곳은 약 ${diff}m/s 차이가 납니다.`);
  return { pools: pools.length, riffles: riffles.length, poolQ: pools, riffleQ: riffles, deepQ, poolDepthM, spacingW, barM2, up, ur, nUp, nUr, fUp, fUr, uMax: round2(uMax), uMin: round2(uMin), diff, text: parts.join(' ') };
}

export function noteText(m) {
  const ph = m.phase(), r = bedReport(m), straight = m.options.curve === 'straight';
  const reversal = ' 평소에는 얕은 여울이 빠르고 깊은 소가 느립니다. 그래서 평소에는 여울에서 고운 모래와 진흙이 씻겨 나가 느린 소에 가라앉습니다. 홍수 때는 물이 깊어지면서 소의 물이 여울보다 빨라져 소 바닥을 깎고, 깎여 나온 자갈은 상대적으로 느려진 여울에 쌓인다는 설명이 있습니다(빠르기가 뒤바뀐다는 설명). 이 모형도 소 자리 물길을 조금 좁게 만들어 이 효과를 보입니다. 다만 이 설명에는 다른 해석도 있어서, 빠르기가 실제로 뒤바뀌지 않아도 물이 소 입구로 몰려 빨라지는 효과로 설명하기도 합니다.';
  if (ph === 'done' || ph === 'pattern') {
    // 판정 문구(r.text)는 막대 아래에 따로 보이므로 여기서는 되풀이하지 않는다.
    let t = straight ? '곧은 하천입니다.' : '굽은 하천입니다.';
    if (straight) t += ' 곧은 하천에서도 물이 양쪽으로 번갈아 쏠려 약한 여울과 소, 물길 옆에 붙은 모래톱이 생깁니다. 다만 굽은 하천보다 높낮이 차이가 작습니다.';
    else t += ' 굽이 바깥(공격 사면)은 깊은 소, 굽이 안쪽(퇴적 사면)은 굽이 안쪽에 붙은 모래톱(물 가운데 섬처럼 생긴 하중도와는 다름), 굽이와 굽이 사이는 얕은 여울입니다.';
    return t + reversal;
  }
  if (ph === 'start') return straight
    ? '곧은 물길입니다. 처음에는 강바닥이 고릅니다. 곧은 물길에서도 물은 양쪽 둑으로 조금씩 번갈아 쏠립니다. 물 알갱이 색은 빠르기를 나타냅니다(빨강 빠름, 파랑 느림).'
    : '굽이진 물길입니다. 처음에는 강바닥이 고릅니다. 굽이에서는 물이 굽이 바깥쪽으로 쏠려 빠르고, 굽이 안쪽은 느립니다. 물 알갱이 색은 빠르기를 나타냅니다(빨강 빠름, 파랑 느림).';
  if (ph === 'scour') return '굽이 바깥은 물이 몰려 부딪히는 곳이라, 특히 물이 많을 때 바닥이 깊게 파입니다. 이렇게 깊게 파인 곳이 소입니다. 물이 적은 평소에는 소에 물이 깊고 느리게 고여 있습니다.';
  return '굽이 안쪽은 물이 느려 모래가 쌓이고, 쌓인 모래가 물 위로 드러나 모래톱이 됩니다. 굽이와 굽이 사이 물길이 반대쪽으로 건너가는 곳은 바닥이 얕고 자갈이 깔려 여울이 됩니다. 여울은 물이 빠르고 물결이 입니다.';
}

export function compareBrief(a, b) {
  const ra = bedReport(a), rb = bedReport(b);
  const t = r => `소 ${r.pools}곳, 여울 ${r.riffles}곳이 생겼고, 가장 깊은 소는 평소 물 깊이 약 ${r.poolDepthM}m, 드러난 모래톱은 약 ${r.barM2}m²입니다`;
  let extra = '';
  if (rb.poolDepthM > ra.poolDepthM) extra = '굽은 하천은 굽이 바깥이 깊게 파여 소가 더 깊습니다.';
  if (rb.barM2 > ra.barM2) extra += ' 굽이 안쪽에 쌓인 모래톱도 더 넓습니다.';
  if (ra.pools > 0 && ra.riffles > 0) extra += ' 곧은 하천에도 약한 여울과 소가 번갈아 생깁니다.';
  return { a: t(ra), b: t(rb), extra: extra.trim() };
}
