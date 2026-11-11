// © 2026 김용현
// 카르스트 지형 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 블록은 석회암 땅 한 조각이다(약 240m x 180m, 땅속 약 50m까지). 앞면(y가 가장 큰 쪽)을 잘라 땅속이 보인다.
// 1. 이산화 탄소가 녹아 약한 산성을 띠는 빗물이 바위 틈(절리)을 따라 스며 석회암(탄산 칼슘)을 녹인다(용식).
// 2. 절리가 만나는 곳은 물이 모여 더 많이 녹아, 땅이 깔때기나 접시 모양으로 우묵해진다(돌리네).
// 3. 돌리네가 커져 이웃 돌리네와 이어지면 우발레가 된다.
// 4. 땅속으로 스민 물은 지하수면 근처에서 옆으로 흐르며 석회암을 녹여 석회 동굴을 만든다.
// 5. 지하수면이 낮아지면 동굴에 물이 빠지고, 천장에서 떨어지는 물에서 탄산 칼슘이 다시 굳어 종유석, 석순, 석주가 자란다.
//    지하수면이 두 번 낮아지면 두 번째 지하수면 근처에도 동굴이 생겨 물 빠진 동굴이 두 층이 된다.
// 6. 오늘날: 녹고 남은 붉은 흙(테라로사)이 덮고, 빗물이 땅속으로 빠져 땅 위 하천이 짧으며, 흙이 두꺼운 돌리네 바닥에 밭을 일군다.
// 비교용 화강암 땅은 빗물에 녹아 없어지는 일이 거의 없어 돌리네와 동굴이 생기지 않고, 빗물이 땅 위로 모여 흘러 골짜기를 깎는다.
// 모든 값은 시각 t의 식으로 바로 계산한다(같은 조건, 같은 시각이면 언제나 같은 땅). 진행 막대로 되돌려도 같다.
// 계산에는 사칙연산과 제곱근, 내림, 올림, 반올림, 큰 값, 작은 값, 절댓값만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 120; // 가로(x) 칸 수
export const NY = 90; // 세로(y) 칸 수. y가 클수록 앞(잘린 면 쪽)이다.
export const CELL_M = 2; // 칸 한 변(m)
export const ROUND = 0.25; // 계산 한 번의 때(초)
export const T_START = 4; // 빗물이 스며 녹이기 시작
export const T_DOLINE = 14; // 돌리네가 뚜렷해짐
export const T_UVALA = 24; // 돌리네가 이어지기 시작
export const T_CAVE = 32; // 석회 동굴 이야기
export const T_DROP1 = 38; // 첫째 지하수면 낮아짐
export const T_DROP2 = 46; // 둘째 지하수면 낮아짐(두 번일 때)
export const T_TODAY = 52; // 오늘날
export const T_END = 60;
export const T_CAVE0 = 6; // 첫째 동굴이 녹기 시작
export const DROP_TIME = 1.5; // 지하수면이 내려가는 데 걸리는 때(초)
export const WT = [-14, -26, -38]; // 지하수면 높이(m). 땅 위 평균 높이가 0이다.
export const BOTTOM_M = -50; // 블록 바닥(m)
export const DOLINE_MIN_M = 1; // 돌리네로 셀 깊이(m)
export const SINK_M = 1.2; // 하천이 스며드는 돌리네 깊이(m)
const GROW_END = T_TODAY; // 돌리네가 다 자라는 때
const CAVE_DUR = 30; // 동굴이 다 자라는 데 걸리는 때(초)
const DROP_T = [T_DROP1, T_DROP2];

export const RAIN = {
  few: { name: '적음', thr: 0.84, r: 0.88, cave: 0.7, drip: 0.75 },
  mid: { name: '보통', thr: 0.74, r: 1, cave: 0.85, drip: 1 },
  many: { name: '많음', thr: 0.63, r: 1.1, cave: 1, drip: 1.25 },
};
export const JOINT = {
  dense: { name: '촘촘', sp: 11 },
  wide: { name: '넓음', sp: 19 },
};
export const DROPS = { one: { name: '한 번', n: 1 }, two: { name: '두 번', n: 2 } };
export const ROCK = { lime: { name: '석회암 땅' }, granite: { name: '화강암 땅' } };
export const DEFAULTS = { rain: 'mid', joint: 'dense', drops: 'one', rock: 'lime' };
const RK = 0.66; // 가장 큰 돌리네 반지름이 절리 간격의 몇 배인지
const MERGE = 0.9; // 두 돌리네 반지름 합에 이 값을 곱한 것보다 가까우면 이어진 것으로 본다

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
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
// 사인 대신 다듬은 세모꼴. u의 한 주기마다 1에서 -1 사이를 오간다.
export function wave(u) {
  const f = u - Math.floor(u), w = 2 * Math.abs(2 * f - 1) - 1;
  return w * (1.5 - 0.5 * w * w);
}
// 가운데가 1이고 가장자리(d = w)에서 0이 되는 사발 모양
export const bowl = (d, w) => { if (d >= w) return 0; const q = (d * d) / (w * w); return (1 - q) * (1 - q); };

export function createModel(seed = 7) {
  const size = N * NY;
  const z = new Float32Array(size), z0 = new Float32Array(size), dol = new Float32Array(size), cut = new Float32Array(size);
  const m = { z, z0, dol, cut, seed, options: { ...DEFAULTS }, clock: 0, finished: false, version: 0 };
  const n1 = makeNoise(seed + 3, 16), n2 = makeNoise(seed + 5, 5), n3 = makeNoise(seed + 9, 3);
  let planKey = '', roundNo = 0, carry = 0, spotCache = {};
  const plan = { jx: [], jy: [], sites: [], swallow: null, path: [], pathLen: [] };
  m.plan = plan;

  // 절리, 돌리네가 생길 자리, 하천 길. 절리 간격이 바뀔 때만 다시 만든다.
  function buildPlan() {
    const sp = JOINT[m.options.joint].sp, r = makeRng(seed * 31 + (m.options.joint === 'dense' ? 1 : 2));
    plan.jx = []; plan.jy = []; plan.sites = [];
    for (let x = 5 + Math.floor(r() * sp * 0.4); x <= N - 6; x += sp) plan.jx.push(clamp(x + Math.floor(r() * 3) - 1, 3, N - 4));
    // 앞쪽 첫 절리는 잘린 면 바로 뒤에 둔다. 그래서 앞면 단면에 돌리네가 잘려 보인다.
    for (let y = NY - 3; y >= 5; y -= sp) plan.jy.push(y === NY - 3 ? y : clamp(y + Math.floor(r() * 3) - 1, 3, NY - 4));
    for (const y of plan.jy) for (const x of plan.jx) plan.sites.push({ x, y, s: 0.35 + 0.65 * r() });
    // 하천이 스며드는 돌리네: 가운데쯤 절리가 만나는 곳 하나는 늘 크게 자란다.
    let best = null, bd = 1e9;
    for (const s of plan.sites) {
      if (s.y > NY - 10) continue;
      const d = (s.x - 0.5 * N) * (s.x - 0.5 * N) + (s.y - 0.42 * NY) * (s.y - 0.42 * NY);
      if (d < bd) { bd = d; best = s; }
    }
    best.s = 0.97;
    plan.swallow = best;
    // 하천이 스며드는 돌리네보다 상류 쪽 하천 길 위에는 돌리네를 두지 않는다(하천이 블록 가운데쯤에서 스며들게).
    for (const s of plan.sites) if (s !== best && s.x < best.x + sp * 0.5 && Math.abs(s.y - best.y) < sp * 0.8) s.s = Math.min(s.s, 0.5);
    // 하천 길: 왼쪽 끝에서 오른쪽 끝으로 흐르며, 스며드는 돌리네 한가운데를 지난다.
    const A = 6, lam = 90, ph = 0.1, yOff = best.y - A * wave(best.x / lam + ph);
    plan.ys = x => yOff + A * wave(x / lam + ph);
    plan.path = []; plan.pathLen = [];
    let len = 0;
    for (let x = 0; x <= N - 1 + 1e-9; x += 0.5) {
      const y = plan.ys(x);
      if (plan.path.length) { const [px, py] = plan.path[plan.path.length - 1]; len += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py)); }
      plan.path.push([x, y]); plan.pathLen.push(len);
    }
    plan.fullLen = len;
    // 처음 땅: 낮은 언덕이 조금 있는 고른 땅, 하천이 흐르는 얕은 골짜기
    for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, d = Math.abs(j - plan.ys(i));
      z0[k] = 3.2 * (n1(i, j) - 0.5) + 0.5 * (n2(i, j) - 0.5) - 1.1 * bowl(d, 5) + 0.008 * (N / 2 - i);
    }
  }

  // 돌리네 하나의 지금 반지름(칸)과 깊이(m). 센 자리일수록 일찍 생기고 크게 자란다.
  function dolineAt(site, t) {
    const R = RAIN[m.options.rain];
    if (m.options.rock !== 'lime' || site.s < R.thr) return null;
    const w = (site.s - R.thr) / (1 - R.thr), st = T_START + (1 - w) * 8;
    const g0 = clamp((t - st) / (GROW_END - st)), g = g0 * (2 - g0);
    if (g <= 0) return null;
    const rad = RK * JOINT[m.options.joint].sp * (0.35 + 0.65 * w) * R.r * g;
    return { x: site.x, y: site.y, R: rad, D: rad * CELL_M * 0.3, site };
  }

  // 지하수면 높이(m): 낮아질 때마다 DROP_TIME 동안 내려간다.
  const wtAt = t => {
    let w = WT[0];
    for (let d = 0; d < DROPS[m.options.drops].n; d++) w += (WT[d + 1] - WT[d]) * clamp((t - DROP_T[d]) / DROP_TIME);
    return w;
  };
  m.wtAt = wtAt;

  // 동굴 층 i: 지하수면이 그 높이에 머무는 동안 자란다. 지하수면이 내려가면 물이 빠지고 더는 커지지 않는다.
  const CAVE_X = [0.5, 0.56, 0.45], CAVE_K = [1, 0.8, 0.7];
  function caveState(i, t) {
    const n = DROPS[m.options.drops].n, R = RAIN[m.options.rain];
    if (m.options.rock !== 'lime' || i > n) return null;
    const start = i === 0 ? T_CAVE0 : DROP_T[i - 1], end = i < n ? DROP_T[i] : T_END;
    const u = clamp((Math.min(t, end) - start) / CAVE_DUR);
    if (u <= 0) return null;
    const Lmax = (N - 30) * R.cave * CAVE_K[i], Hmax = 6.8 * (0.8 + 0.2 * R.r) * CAVE_K[i];
    return {
      i, xm: N * CAVE_X[i], half: (Lmax * u) / 2, h: Hmax * Math.sqrt(u), zc: WT[i] - 2,
      start, end, drained: i < n && t >= end + DROP_TIME, willDrain: i < n,
    };
  }
  // 동굴 층 c의 x 자리 천장과 바닥 높이(m). 동굴 밖이면 null.
  function caveShape(c, x) {
    if (!c) return null;
    const e = Math.abs(x - c.xm) / c.half;
    if (e >= 1) return null;
    const taper = Math.sqrt(1 - e * e * e * e), hh = c.h * taper * (0.5 + 0.5 * n2(x * 0.8, 11 + c.i * 17));
    const wob = 0.8 * (n2(x, 30 + c.i * 9) - 0.5);
    return { top: c.zc + 0.58 * hh + wob, bot: c.zc - 0.42 * hh + wob * 0.5 };
  }
  m.caveShape = caveShape;

  // 동굴 속 물방울이 떨어지는 자리(절리 아래와 그 사이). 물이 빠질 동굴마다 정한다.
  function buildDrips() {
    plan.drips = [];
    for (let i = 0; i < 3; i++) {
      const c = caveState(i, T_END), list = [];
      plan.drips.push(list);
      if (!c || !c.willDrain) continue;
      const r = makeRng(seed * 97 + i * 13 + 5), xs = [];
      for (let a = 0; a < plan.jx.length; a++) {
        xs.push(plan.jx[a]);
        // 절리 사이에는 가끔 물방울 자리가 하나 더 있다.
        if (a + 1 < plan.jx.length && r() < 0.35) xs.push((plan.jx[a] + plan.jx[a + 1]) / 2 + Math.floor(r() * 3) - 1);
      }
      for (const x of xs) {
        if (Math.abs(x - c.xm) > c.half - 3) continue;
        list.push({ x, s1: 0.45 + 0.55 * r(), s2: r(), joint: plan.jx.includes(x) });
      }
    }
  }
  // 종유석(a, 천장에서 아래로)과 석순(b, 바닥에서 위로)의 길이(m). 둘이 만나면 석주.
  function dripState(i, d, t) {
    const c = caveState(i, t);
    if (!c || !c.drained) return null;
    const sh = caveShape(c, d.x);
    if (!sh) return null;
    const dry = t - (c.end + DROP_TIME), k = RAIN[m.options.rain].drip * dry * (d.joint ? 1 : 0.75);
    let a = 0.17 * k * d.s1, b = 0.14 * k * d.s2;
    const h = sh.top - sh.bot;
    const col = a + b >= h - 0.15;
    if (col) { const f = h / (a + b); a *= f; b *= f; }
    return { x: d.x, a, b, col, top: sh.top, bot: sh.bot };
  }

  // 지금 시각의 땅과 땅속을 계산한다.
  function compute() {
    const t = m.clock, lime = m.options.rock === 'lime';
    dol.fill(0); cut.fill(0);
    m.dolines = [];
    for (const s of plan.sites) {
      const d = dolineAt(s, t);
      if (!d) continue;
      m.dolines.push(d);
      const rr = Math.ceil(d.R) + 1;
      for (let j = Math.max(0, d.y - rr); j <= Math.min(NY - 1, d.y + rr); j++) for (let i = Math.max(0, d.x - rr); i <= Math.min(N - 1, d.x + rr); i++) {
        const k = j * N + i, dd = Math.sqrt((i - d.x) * (i - d.x) + (j - d.y) * (j - d.y)), v = d.D * bowl(dd, d.R);
        if (v > dol[k]) dol[k] = v;
      }
    }
    // 화강암 땅: 빗물이 땅 위로 모여 흘러 하천 골짜기가 깊어진다.
    if (!lime) {
      const g = clamp((t - T_START) / (GROW_END - T_START));
      for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) cut[j * N + i] = 2.6 * g * bowl(Math.abs(j - plan.ys(i)), 6);
    }
    for (let k = 0; k < size; k++) z[k] = z0[k] - dol[k] - cut[k];
    // 땅 위 하천: 상류(왼쪽 끝)에서 흐르다가 충분히 깊은 돌리네를 만나면 땅속으로 스며든다.
    m.sink = null; m.streamLen = plan.fullLen;
    if (lime) for (let p = 0; p < plan.path.length; p++) {
      const [x, y] = plan.path[p], k = Math.round(y) * N + Math.round(x);
      if (dol[k] >= SINK_M) { m.sink = { x, y, p }; m.streamLen = plan.pathLen[p]; break; }
    }
    m.wt = wtAt(t);
    m.caves = [0, 1, 2].map(i => caveState(i, t));
    m.drips = [0, 1, 2].map(i => (plan.drips[i] || []).map(d => dripState(i, d, t)).filter(Boolean));
  }

  m.phase = () => {
    const t = m.clock;
    if (m.finished) return 'done';
    if (t < T_START) return 'start';
    if (t < T_DOLINE) return 'solution';
    if (t < T_UVALA) return 'doline';
    if (t < T_CAVE) return 'uvala';
    if (t < T_DROP1) return 'cave';
    if (t < T_TODAY) return 'dry';
    return 'today';
  };
  // 오늘날 색(테라로사, 돌리네 밭)이 드러나는 정도
  m.todayFrac = () => clamp((m.clock - T_TODAY) / 4);
  // 녹고 남은 붉은 흙이 쌓인 정도
  m.soilFrac = () => (m.options.rock === 'lime' ? clamp((m.clock - T_START) / (T_END - T_START)) : 0);
  m.rainOn = () => !m.finished && m.clock < T_TODAY;

  function round() {
    m.clock = Math.round((m.clock + ROUND) * 1000) / 1000; roundNo++;
    if (m.clock >= T_END - 1e-9) m.finished = true;
    compute();
    m.version++;
    if (roundNo % 4 === 0 || m.finished) spotCache = computeSpots();
  }

  // 이름표 자리. 그 지형이 실제로 있는 곳만 고른다. x, y는 칸, z는 높이(m)다.
  function computeSpots() {
    const out = {}, r = karstReport(m), F = NY - 1;
    const zAt = (x, y) => z[clamp(Math.round(y), 0, NY - 1) * N + clamp(Math.round(x), 0, N - 1)];
    const lone = r.list.filter(d => !r.inUvala.has(d));
    // 크고, 블록 가운데쯤(화면에서 잘 보이는 곳)에 있는 돌리네를 고른다.
    let big = null, bs = -1e9;
    for (const d of lone) {
      if (d.y >= NY - 8) continue;
      const sc = d.R - 0.12 * Math.sqrt((d.x - N / 2) * (d.x - N / 2) + (d.y - NY * 0.6) * (d.y - NY * 0.6));
      if (sc > bs) { bs = sc; big = d; }
    }
    if (big) out.doline = { x: big.x, y: big.y, z: zAt(big.x, big.y) };
    if (r.groups.length) {
      let g = r.groups[0];
      for (const q of r.groups) if (q.length > g.length) g = q;
      let sx = 0, sy = 0;
      for (const d of g) { sx += d.x; sy += d.y; }
      sx /= g.length; sy /= g.length;
      // 가운데에서 가장 가까운 돌리네 바닥에 단다.
      let c = g[0];
      for (const d of g) if ((d.x - sx) * (d.x - sx) + (d.y - sy) * (d.y - sy) < (c.x - sx) * (c.x - sx) + (c.y - sy) * (c.y - sy)) c = d;
      out.uvala = { x: c.x, y: c.y, z: zAt(c.x, c.y) };
    }
    if (m.sink) out.sink = { x: m.sink.x, y: m.sink.y, z: zAt(m.sink.x, m.sink.y) };
    if (m.streamLen > 6) {
      let p = 0;
      while (p < plan.path.length - 1 && plan.pathLen[p] < Math.min(m.streamLen * 0.45, 40)) p++;
      const [x, y] = plan.path[p];
      out.stream = { x, y, z: zAt(x, y) };
    }
    out.wt = { x: N - 12, y: F, z: m.wt };
    for (const c of m.caves) {
      if (!c || c.half < 3) continue;
      const key = c.i === 0 ? 'cave' : c.drained ? 'cave2' : 'caveWet';
      if (out[key]) continue;
      const x = c.xm + c.half * (c.i === 0 ? -0.15 : 0.2), sh = caveShape(c, x);
      if (sh) out[key] = { x, y: F, z: (sh.top + sh.bot) / 2 };
    }
    // 종유석, 석순, 석주 이름표는 석회 동굴 이름표와 가로로 떨어진 자리부터 고른다(이름표 줄이 겹치지 않게).
    const cx0 = out.cave ? out.cave.x : -99, far = d => Math.abs(d.x - cx0) >= 12 ? 0 : 1;
    for (const list of m.drips) for (const d of [...list].sort((p, q) => far(p) - far(q))) {
      if (d.col && !out.column) out.column = { x: d.x, y: F, z: (d.top + d.bot) / 2 };
      else if (!d.col && d.a >= 0.3 && !out.stalactite) out.stalactite = { x: d.x, y: F, z: d.top - d.a * 0.5 };
      else if (!d.col && d.b >= 0.3 && !out.stalagmite && (!out.stalactite || Math.abs(out.stalactite.x - d.x) > 4)) out.stalagmite = { x: d.x, y: F, z: d.bot + d.b * 0.5 };
    }
    if (m.todayFrac() > 0 && m.options.rock === 'lime') {
      let f = null;
      for (const d of r.fields) if (!out.doline || d.x !== out.doline.x || d.y !== out.doline.y) { if (!f || d.R > f.R) f = d; }
      if (f) out.field = { x: f.x, y: f.y, z: zAt(f.x, f.y) };
      // 테라로사: 돌리네가 없는 앞쪽 왼편 땅
      const tx = Math.round(N * 0.18), ty = Math.round(NY * 0.7);
      out.terra = { x: tx, y: ty, z: zAt(tx, ty) };
    }
    return out;
  }
  m.spots = () => spotCache;
  m.fieldsNow = () => karstReport(m).fields;
  m.endTime = () => T_END;
  m.setOption = (name, v) => { m.options[name] = v; };
  m.reset = () => {
    if (m.options.joint !== planKey) { planKey = m.options.joint; buildPlan(); }
    buildDrips();
    roundNo = 0; carry = 0; m.clock = 0; m.finished = false;
    compute();
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

// 이어진 돌리네 무리(우발레) 찾기: 반지름 합에 MERGE를 곱한 것보다 가까운 돌리네끼리 묶는다.
function groupsOf(list) {
  const parent = list.map((_, a) => a);
  const find = a => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const p = list[a], q = list[b], d = Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
    if (d < MERGE * (p.R + q.R)) parent[find(a)] = find(b);
  }
  const map = new Map();
  list.forEach((d, a) => { const r = find(a); if (!map.has(r)) map.set(r, []); map.get(r).push(d); });
  return [...map.values()].filter(g => g.length >= 2);
}

// 막대와 판정 문구를 한 번에 만든다. 화면의 숫자와 문구가 같은 집계에서 나온다.
export function karstReport(m) {
  const ph = m.phase(), lime = m.options.rock === 'lime', done = ph === 'done';
  const list = (m.dolines || []).filter(d => d.D >= DOLINE_MIN_M);
  const groups = groupsOf(list), inUvala = new Set();
  for (const g of groups) for (const d of g) inUvala.add(d);
  let maxR = 0;
  for (const d of list) maxR = Math.max(maxR, d.R);
  const maxDiaM = Math.round(2 * maxR * CELL_M);
  let caveLen = 0, dryLevels = 0, wetLevels = 0;
  for (const c of m.caves) {
    if (!c) continue;
    caveLen += 2 * c.half;
    if (c.half >= 1) { if (c.drained) dryLevels++; else wetLevels++; }
  }
  const caveM = Math.round(caveLen * CELL_M);
  let stalactites = 0, stalagmites = 0, columns = 0;
  for (const l of m.drips) for (const d of l) {
    if (d.col) columns++;
    else { if (d.a >= 0.3) stalactites++; if (d.b >= 0.3) stalagmites++; }
  }
  const streamM = Math.round(m.streamLen * CELL_M), fullM = Math.round(m.plan.fullLen * CELL_M), sunk = !!m.sink;
  const today = lime && (ph === 'today' || done);
  const fields = today ? [...list].sort((p, q) => q.R - p.R).filter(d => d.R * 2 * CELL_M >= maxDiaM * 0.6).slice(0, 5) : [];
  const parts = [];
  if (!lime) {
    parts.push('화강암 땅에는 돌리네와 석회 동굴이 생기지 않았습니다.');
    parts.push(`빗물이 땅 위로 모여 하천이 블록 끝까지 약 ${streamM}m 흐릅니다.`);
  } else {
    if (ph === 'start') parts.push('빗물이 절리를 따라 스며들기 시작했습니다. 땅 모양은 아직 그대로입니다.');
    else if (list.length) parts.push(`돌리네 ${list.length}곳이 ${done ? '생겼습니다' : '생기고 있습니다'}. 가장 큰 돌리네는 지름 약 ${maxDiaM}m입니다.`);
    else parts.push('아직 돌리네라고 할 만큼 우묵한 땅은 없습니다.');
    if (groups.length) parts.push(`돌리네가 이어진 우발레가 ${groups.length}곳 있습니다.`);
    if (caveM > 0) {
      let c = `땅속 석회 동굴은 모두 약 ${caveM}m입니다.`;
      if (dryLevels) c += ` 물이 빠진 동굴이 ${dryLevels}층${wetLevels ? ', 지하수에 잠긴 동굴이 그 아래에 1층' : ''} 있습니다.`;
      else c += ' 아직 지하수에 잠겨 있습니다.';
      parts.push(c);
    }
    if (stalactites + stalagmites + columns > 0) parts.push(`동굴 속에 종유석 ${stalactites}개, 석순 ${stalagmites}개, 석주 ${columns}개가 자랐습니다.`);
    if (sunk) parts.push(`땅 위 하천은 약 ${streamM}m 흐르다가 돌리네로 스며듭니다.`);
    else parts.push(`땅 위 하천이 블록 끝까지 약 ${streamM}m 흐릅니다.`);
    if (today) parts.push(`땅은 붉은 흙(테라로사)으로 덮였고, 돌리네 ${fields.length}곳의 바닥에 밭이 있습니다.`);
  }
  return {
    dolines: list.length, list, groups, inUvala, uvalas: groups.length, maxDiaM, caveM, dryLevels, wetLevels,
    stalactites, stalagmites, columns, streamM, fullM, sunk, fields, today, text: parts.join(' '),
  };
}

export function noteText(m) {
  const ph = m.phase();
  if (m.options.rock !== 'lime') return '화강암 땅입니다. 화강암은 석회암처럼 빗물에 녹아 없어지는 일이 거의 없어 돌리네와 석회 동굴이 생기지 않습니다. 그래서 빗물이 땅속으로 빠지지 않고 땅 위로 모여 흐르며 골짜기를 깎습니다.';
  const two = DROPS[m.options.drops].n === 2;
  if (ph === 'start') return '석회암은 탄산 칼슘으로 된 암석입니다. 공기와 흙 속의 이산화 탄소가 녹은 빗물은 약한 산성을 띠어 석회암을 조금씩 녹입니다. 빗물은 먼저 바위의 갈라진 틈(절리)을 따라 스며듭니다.';
  if (ph === 'solution') return '빗물이 절리를 따라 내려가며 석회암을 녹여 틈이 넓어집니다. 이렇게 물에 녹아 깎이는 것을 용식이라고 합니다(화학적 풍화). 절리가 만나는 곳은 물이 모여 더 많이 녹습니다.';
  if (ph === 'doline') return '절리가 만나는 곳의 땅이 녹아 낮아지며 깔때기나 접시 모양의 우묵한 땅이 생깁니다. 이것이 돌리네입니다. 빗물은 돌리네 바닥의 틈으로 땅속에 빠져나갑니다.';
  if (ph === 'uvala') return '돌리네가 커지면서 이웃한 돌리네와 이어져 더 크고 길쭉한 우묵한 땅이 됩니다. 이것을 우발레라고 합니다.';
  if (ph === 'cave') return '땅속으로 스민 물은 지하수면 근처에 모여 옆으로 흐르며 석회암을 녹입니다. 그래서 석회 동굴은 주로 지하수면 근처와 그 아래에서 커집니다. 지금 동굴은 지하수로 차 있습니다.';
  if (ph === 'dry') return '주변 하천이 골짜기를 깊게 깎거나 땅이 솟아오르면 지하수면이 낮아집니다. 물이 빠진 동굴에서는 천장의 물방울에 녹아 있던 탄산 칼슘이 다시 굳어, 천장에는 종유석, 바닥에는 석순이 자라고, 둘이 만나면 석주가 됩니다.'
    + (two ? ' 지하수면이 다시 낮아지면 새 지하수면 근처에 또 동굴이 생겨, 물 빠진 동굴이 두 층이 됩니다.' : ' 낮아진 지하수면 근처에서는 새 동굴이 녹아 생기기 시작합니다.');
  return '오늘날 석회암 땅입니다. 석회암이 녹고 남은 진흙 속 철 성분이 산화되어 붉게 된 흙이 테라로사입니다. 빗물이 돌리네와 절리로 빠져 땅 위 하천이 적고, 흙이 두껍게 모인 돌리네 바닥에는 밭을 일구기도 합니다(돌리네 밭). 물이 땅속으로 잘 빠져 논보다 밭으로 씁니다. 석회석은 시멘트 원료로 캐어 쓰여, 이런 지역에 시멘트 공장이 많습니다. 우리나라에서는 고생대 석회암(조선 누층군)이 넓은 강원 남부(정선, 영월, 삼척)와 충북 북동부(단양)에 카르스트 지형이 많습니다. 돌리네가 생기는 방식에는 땅이 녹아 낮아지는 것 말고도 동굴 천장이 무너져 생긴다는 설명 등 다른 해석도 있습니다.';
}

export function compareBrief(a, b) {
  const ra = karstReport(a), rb = karstReport(b);
  const ta = `돌리네 ${ra.dolines}곳, 석회 동굴 ${ra.caveM ? `약 ${ra.caveM}m` : '없음'}, 땅 위 하천 약 ${ra.streamM}m입니다`;
  const tb = `돌리네 ${rb.dolines}곳${rb.dolines ? `(가장 큰 지름 약 ${rb.maxDiaM}m)` : ''}, 석회 동굴 ${rb.caveM ? `약 ${rb.caveM}m` : '없음'}, 땅 위 하천 약 ${rb.streamM}m입니다`;
  let extra = '화강암은 석회암처럼 빗물에 녹아 없어지는 일이 거의 없어 돌리네와 석회 동굴이 생기지 않습니다.';
  if (rb.streamM < ra.streamM) extra += ' 석회암 땅은 빗물이 돌리네와 절리로 땅속에 빠져 땅 위 하천이 더 짧습니다.';
  return { a: ta, b: tb, extra };
}
