// © 2026 김용현
// 화산섬(제주도형) 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 블록은 얕은 바다(대륙붕) 위에 생기는 화산섬 한 조각이다(약 18.6km x 9.3km, 땅속 약 500m까지).
// 앞면(y가 가장 큰 쪽)이 섬 한가운데의 분화구를 지나도록 잘라, 화산 속 단면이 보인다.
// 1. 바다 밑에서 묽은 현무암질 용암이 여러 번 흘러나와 사방으로 넓게 퍼진다. 쌓일수록 바다 위로 솟아 경사가 완만한 순상화산이 된다.
//    용암 하나가 흐를 때 겉은 먼저 굳고 속의 뜨거운 용암이 빠져나가면 용암 동굴이 남는다(묽은 용암일 때).
//    두꺼운 용암이 천천히 식으며 줄어들면 기둥 모양 틈(주상절리)이 생긴다.
// 2. 정상부에 끈끈한 조면암질 용암이 솟아 굳어 경사가 급한 용암원정구(종상화산)가 된다.
// 3. 산허리와 바닷가에서 작은 분출이 일어나 측화산(기생화산, 오름)이 생긴다.
//    땅 위에서 터지면 분석구, 얕은 바다에서 마그마가 물과 만나 터지면 응회구나 응회환이 된다.
// 4. 마지막으로 정상에서 폭발이 일어나 분화구가 생기고, 빗물이 고여 화구호가 된다(백록담, 약 2만 5천 년 전).
//    꼭대기를 칼데라로 고르면(울릉도형): 큰 분출로 마그마가 빠져나가고, 꼭대기가 둥근 단층을 따라 꺼지며, 바닥이 메워져 화구원이 되고, 안에서 다시 분출해 중앙화구구가 솟는다.
// 5. 오늘날: 풀과 숲이 덮고, 단면에 용암 동굴과 주상절리가 남는다.
// 모든 값은 시각 t의 식으로 바로 계산한다(같은 조건, 같은 시각이면 언제나 같은 땅). 진행 막대로 되돌려도 같다.
// 계산에는 사칙연산과 제곱근, 내림, 올림, 반올림, 큰 값, 작은 값, 절댓값만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 124; // 가로(x) 칸 수
export const NY = 62; // 세로(y) 칸 수. y가 클수록 앞(잘린 면 쪽)이다.
export const CELL_M = 150; // 칸 한 변(m)
export const CX = 62; // 분화구(용암이 나오는 곳) x
export const CY = NY - 1; // 분화구 y: 앞면 위에 있어 앞면이 화산 한가운데를 자른다.
export const ROUND = 0.25; // 계산 한 번의 때(초)
export const SEA_D = 100; // 처음 바다 깊이(m, 대륙붕)
export const BOTTOM_M = -500; // 블록 바닥(m)
export const NF = 10; // 용암이 흐른 횟수(실제보다 훨씬 적게 줄여, 한 번에 두껍게 흐른다)
export const T_START = 3; // 바다 밑 분출 시작
export const FLOW_GAP = 2; // 용암이 흐르는 사이(초)
export const FLOW_DUR = 2.6; // 용암 하나가 다 흐르는 데 걸리는 때(초)
export const T_DOME = 24; // 용암원정구가 솟기 시작
export const DOME_DUR = 6;
export const T_CONES = 31; // 측화산이 터지기 시작(용암원정구 뒤, 꼭대기 분화구보다 먼저)
export const CONE_DUR = 2.5;
export const T_CRATER = 44; // 마지막 분출: 꼭대기 폭발(분화구) 또는 큰 분출(칼데라)
export const CRATER_DUR = 1.5;
export const T_LAKE = 46; // 분화구에 물이 고이기 시작
export const LAKE_DUR = 5;
// 칼데라 차례(책 그림처럼): 큰 분출로 마그마 방이 빔, 꼭대기가 둥근 단층을 따라 꺼짐, 바닥이 메워져 화구원, 안에서 다시 분출해 중앙화구구
export const T_COLLAPSE = 46; // 꼭대기가 꺼지기 시작
export const COLLAPSE_DUR = 2.5;
export const T_ATRIO = 48.5; // 바닥이 메워지기 시작
export const ATRIO_DUR = 3;
export const T_CENTRAL = 51.5; // 중앙화구구가 솟기 시작
export const CENTRAL_DUR = 3;
export const T_TODAY = 56; // 오늘날
export const T_END = 65;
export const TUBE_FLOW = 7; // 용암 동굴이 생기는 용암(앞면을 따라 동쪽으로 흐른다)
export const COLUMN_FLOW = 5; // 주상절리가 잘 보이는 두꺼운 용암(앞면을 따라 서쪽 바닷가로 흐른다)

export const VISC = {
  thin: { name: '묽음', H: 680, R: 50, cone: false },
  thick: { name: '끈적', H: 1150, R: 28, cone: true },
};
export const VENT = { land: { name: '땅 위' }, shore: { name: '얕은 바다' } };
export const TOP = { crater: { name: '화구' }, caldera: { name: '칼데라' } };
export const DEFAULTS = { visc: 'thin', vent: 'land', top: 'crater' };

// 용암이 흐른 방향(앞면 쪽 y+는 블록 밖이라 뒤쪽과 옆쪽으로 흐른다). TUBE_FLOW는 동쪽(x+), COLUMN_FLOW는 서쪽(x-)
const DIRS = [[0.3, -1], [-1, -0.5], [1, -0.4], [-0.35, -1], [0.75, -0.8], [-1, 0], [-0.7, -0.8], [1, 0], [0, -1], [-1, -0.2]];
const REACH = [0.86, 0.92, 0.95, 0.97, 1, 0.94, 1, 1, 0.98, 0.96];
// 용암 하나의 두께 비율: 처음 몇 번은 얇아 바다 밑에 머문다.
const THICK = [0.45, 0.6, 0.85, 1.05, 1.1, 1.15, 1.1, 1.15, 1.1, 1.05];
const THICK_SUM = THICK.reduce((a, b) => a + b, 0);

// 측화산 자리: 방향과, 해안선까지 거리의 몇 배인지. 모두 칼데라가 생길 자리(0.45배 안)보다 바깥이다. 얕은 바다를 고르면 sea가 참인 둘이 바닷가 얕은 바다로 옮겨 간다.
export const CONE_SITES = [
  { dir: [-0.8, -0.6], frac: 0.62, start: T_CONES, horseshoe: false, sea: false },
  { dir: [0.6, -0.8], frac: 0.64, start: T_CONES + 2, horseshoe: true, sea: false },
  { dir: [0.95, -0.3], frac: 0.7, start: T_CONES + 4, horseshoe: false, sea: false },
  { dir: [-0.15, -1], frac: 0.74, start: T_CONES + 6, horseshoe: false, sea: 'tuffcone' },
  { dir: [-1, -0.25], frac: 0.78, start: T_CONES + 8, horseshoe: false, sea: 'tuffring' },
  { dir: [0.3, -1], frac: 0.62, start: T_CONES + 10, horseshoe: false, sea: false },
];
// 작은 화산 모양(높이 h m, 밑지름의 반 rb 칸, 화구 반지름 rc 칸, 화구 깊이 cd m)
export const CONE_SHAPE = {
  scoria: { h: 140, rb: 3.4, rc: 1.1, cd: 55 },
  tuffcone: { h: 200, rb: 4.6, rc: 2.1, cd: 115 },
  tuffring: { h: 75, rb: 7, rc: 3.7, cd: 55 },
  central: { h: 150, rb: 3.2, rc: 0.9, cd: 40 },
};
export const CONE_NAME = { scoria: '분석구', tuffcone: '응회구', tuffring: '응회환', central: '중앙화구구' };
export const DOME = { R: 9, H: 320 }; // 용암원정구 반지름(칸), 높이(m)
export const CRATER = { R: 3, D: 100 }; // 분화구 반지름(칸), 깊이(m)
// 화구원: 칼데라 바닥에서 메워진 두께(m). 뒤쪽(북쪽)은 낮고 앞쪽(남쪽)은 높아 계단 모양이다(울릉도 나리 분지와 알봉 분지처럼).
export const ATRIO = { low: 50, high: 120 };
export const SHORE_DEPTH = 20; // 얕은 바다 측화산이 터지는 곳의 물 깊이(m)
// 물질: 0 바다 밑 퇴적물, 1 현무암, 2 조면암, 3 스코리아(송이), 4 응회암, 5 화구원을 메운 흙과 돌
export const MAT = { SEAFLOOR: 0, BASALT: 1, TRACHYTE: 2, SCORIA: 3, TUFF: 4, FILL: 5 };

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = x => x * (2 - x);
function makeRng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function makeNoise(seed, cell) {
  const r = makeRng(seed * 7919 + 13), M = Math.ceil(Math.max(N, NY) / cell) + 3, g = new Float64Array(M * M);
  for (let k = 0; k < g.length; k++) g[k] = r();
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const u = x / cell, v = y / cell, i = Math.floor(u), j = Math.floor(v), a = sm(u - i), b = sm(v - j), o = j * M + i;
    return (g[o] * (1 - a) + g[o + 1] * a) * (1 - b) + (g[o + M] * (1 - a) + g[o + M + 1] * a) * b;
  };
}
const norm = ([x, y]) => { const l = Math.sqrt(x * x + y * y); return [x / l, y / l]; };

export function createModel(seed = 7) {
  const size = N * NY;
  const z = new Float32Array(size), z0 = new Float32Array(size), zs = new Float32Array(size), zd = new Float32Array(size), zc = new Float32Array(size), zk = new Float32Array(size);
  const mat = new Uint8Array(size), age = new Float32Array(size), heat = new Float32Array(size);
  const m = { z, z0, zs, zd, zc, zk, mat, age, heat, seed, options: { ...DEFAULTS }, clock: 0, finished: false, version: 0 };
  const n1 = makeNoise(seed + 3, 14), n2 = makeNoise(seed + 5, 4), n3 = makeNoise(seed + 11, 7);
  const dirs = DIRS.map(norm);
  const flowNoise = new Float32Array(NF * size);
  for (let f = 0; f < NF; f++) {
    const nf = makeNoise(seed + 20 + f, 4);
    for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) flowNoise[f * size + j * N + i] = 0.8 + 0.4 * nf(i, j);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) z0[j * N + i] = -SEA_D + 14 * (n1(i, j) - 0.5) + 4 * (n3(i, j) - 0.5);
  let planKey = '', roundNo = 0, carry = 0, spotCache = {};
  const plan = { cones: [], shoreR: 0, tube: null, column: null };
  m.plan = plan;

  const V = () => VISC[m.options.visc];
  const flowStart = f => T_START + f * FLOW_GAP;
  let lastU = 0, lastAdv = 0; // 마지막으로 계산한 칸이 용암 앞머리에서 얼마나 떨어졌는지(불빛용)
  m.flowStart = flowStart;
  // 용암 하나가 그 칸에 쌓인 두께(m). 앞쪽 끝(용암류 앞머리)이 시간이 지나며 바깥으로 나아간다.
  // 용암마다 칸별로 앞머리까지 거리 비율(u)과 다 쌓였을 때 두께(amp)를 미리 구해 둔다. 끈끈함이 바뀔 때만 다시 만든다.
  const lobeU = new Float32Array(NF * size), lobeAmp = new Float32Array(NF * size);
  let lobeKey = '';
  function buildLobes() {
    const v = V();
    for (let f = 0; f < NF; f++) {
      const [ux, uy] = dirs[f], th = (v.H * THICK[f]) / (THICK_SUM * 0.725);
      for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
        const k = f * size + j * N + i, dx = i - CX, dy = j - CY, r = Math.sqrt(dx * dx + dy * dy);
        const dot = r > 0 ? ((dx * ux + dy * uy) / r) * (r / (r + 3)) : 0, a = 0.5 + 0.5 * dot;
        const u = r / (v.R * REACH[f] * (0.62 + 0.38 * a));
        lobeU[k] = u;
        lobeAmp[k] = u >= 1 ? 0 : th * (0.45 + 0.55 * a) * (v.cone ? 1 - u : 1 - u * u) * flowNoise[k];
      }
    }
  }
  function lobe(f, i, j, t, full = false) {
    if (lobeKey !== m.options.visc) { lobeKey = m.options.visc; buildLobes(); }
    const ts = flowStart(f);
    if (!full && t <= ts) return 0;
    const k = f * size + j * N + i, amp = lobeAmp[k];
    if (amp <= 0) return 0;
    const adv = full ? 1 : ease(clamp((t - ts) / FLOW_DUR)), u = lobeU[k];
    const front = clamp((adv * 1.08 - u) / 0.08);
    if (front <= 0) return 0;
    lastU = u; lastAdv = adv;
    return amp * front;
  }
  m.lobe = lobe;
  // 그 칸의 용암 층 꼭대기 높이 목록: [바다 밑 바닥, 첫째 용암 위, 둘째 용암 위, ...]
  m.layersAt = (i, j, t = m.clock) => {
    const k = j * N + i, out = [z0[k]];
    let s = z0[k];
    for (let f = 0; f < NF; f++) { s += lobe(f, i, j, t); out.push(s); }
    return out;
  };

  // 순상화산 몸체가 다 쌓였을 때의 높이. 측화산 자리와 용암 동굴 자리를 정하는 데 쓴다.
  const fullShield = (i, j) => { let s = z0[j * N + i]; for (let f = 0; f < NF; f++) s += lobe(f, i, j, 0, true); return s; };
  const sampleFull = (x, y) => fullShield(clamp(Math.round(x), 0, N - 1), clamp(Math.round(y), 0, NY - 1));
  // 한 방향으로 나아가며 높이가 h보다 처음 낮아지는 거리(칸)
  function reachTo(ux, uy, h) {
    let d = 0;
    while (d < 80) {
      const x = CX + ux * d, y = CY + uy * d;
      if (x < 1 || x > N - 2 || y < 1 || y > NY - 1) break;
      if (sampleFull(x, y) < h) break;
      d += 0.5;
    }
    return d;
  }

  function buildPlan() {
    // 해안선까지 거리: 뒤쪽 세 방향의 평균
    plan.shoreR = (reachTo(-1, 0, 0) + reachTo(1, 0, 0) + reachTo(0, -1, 0)) / 3;
    plan.cones = CONE_SITES.map((s, n) => {
      const [ux, uy] = norm(s.dir);
      const sea = m.options.vent === 'shore' && s.sea;
      const d = sea ? reachTo(ux, uy, -SHORE_DEPTH) : s.frac * reachTo(ux, uy, 0);
      const kind = sea ? s.sea : 'scoria';
      return { n, x: CX + ux * d, y: CY + uy * d, ux, uy, kind, horseshoe: !sea && s.horseshoe, start: s.start, sea: !!sea };
    });
    // 용암 동굴: TUBE_FLOW가 앞면을 따라 동쪽으로 흐르며, 그 용암이 25m보다 두꺼운 곳까지 생긴다.
    plan.tube = null;
    if (!V().cone) {
      let x1 = CX + 4;
      const baseAt = x => { let b = z0[CY * N + x]; for (let f = 0; f < TUBE_FLOW; f++) b += lobe(f, x, CY, 0, true); return b; };
      while (x1 < N - 2 && lobe(TUBE_FLOW, x1 + 1, CY, 0, true) > 25 && baseAt(x1 + 1) > 15) x1++;
      plan.tube = { x0: CX + 4, x1 };
    }
    // 주상절리: 서쪽 바닷가에서 안쪽으로 가며, COLUMN_FLOW 용암이 바다 위에 15m 넘게 두껍게 남은 첫 곳
    const colBase = x => { let v = z0[CY * N + x]; for (let f = 0; f < COLUMN_FLOW; f++) v += lobe(f, x, CY, 0, true); return v; };
    let cx0 = Math.round(CX - reachTo(-1, 0, 0));
    while (cx0 < CX - 12 && !(colBase(cx0) > 5 && lobe(COLUMN_FLOW, cx0, CY, 0, true) > 15)) cx0++;
    plan.column = { x0: cx0, x1: cx0 + 7 };
  }

  // 꼭대기의 화구 또는 칼데라 모양. 깎을 깊이를 돌려준다(m).
  function calderaR() { return Math.min(12, 0.45 * plan.shoreR); }
  m.calderaR = calderaR;

  // 작은 화산 하나의 높이(m). g는 자란 정도(0에서 1).
  function coneAdd(c, i, j, g) {
    const S = CONE_SHAPE[c.kind], rb = S.rb * (0.55 + 0.45 * g), dx = i - c.x, dy = j - c.y, d = Math.sqrt(dx * dx + dy * dy), u = d / rb;
    if (u >= 1) return 0;
    const uc = S.rc / S.rb;
    let f;
    if (u >= uc) { const s = (1 - u) / (1 - uc); f = S.h * (0.6 * s + 0.4 * s * s * (3 - 2 * s)); }
    else { const q = u / uc; f = S.h - S.cd * (1 - q * q); }
    // 말굽형 분석구: 산 아래쪽으로 화구 한쪽이 터져 열린다.
    if (c.horseshoe && d > 0) {
      const out = (dx * c.ux + dy * c.uy) / d, b = clamp((out - 0.35) / 0.5) * clamp(1.15 - u);
      f *= 1 - 0.8 * b;
    }
    return f * g;
  }
  m.coneAdd = coneAdd;

  function coneState(c, t) {
    if (t <= c.start) return 0;
    return ease(clamp((t - c.start) / (c.dur || CONE_DUR)));
  }

  function compute() {
    const t = m.clock, v = V(), caldera = m.options.top === 'caldera';
    heat.fill(0);
    // 1. 순상화산 몸체(용암이 흐른 만큼)
    for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      let s = z0[k], lastT = -1, h = 0;
      for (let f = 0; f < NF; f++) {
        const l = lobe(f, i, j, t);
        if (l <= 0) continue;
        s += l;
        const ts = flowStart(f), te = ts + FLOW_DUR;
        if (l > 4) lastT = Math.min(t, te);
        // 흐르는 중이거나 막 멈춘 용암은 뜨겁다. 앞머리 쪽이 더 밝다.
        if (t < te + 1.2) {
          const cool = t <= te ? 1 : 1 - (t - te) / 1.2, near = clamp(1 - (lastAdv - lastU) / 0.14);
          h = Math.max(h, clamp(l / 25) * cool * (t <= te ? 0.7 * near * near : 0));
        }
      }
      zs[k] = s; mat[k] = lastT >= 0 ? MAT.BASALT : MAT.SEAFLOOR; age[k] = lastT; heat[k] = h;
    }
    // 2. 용암원정구
    const dg = ease(clamp((t - T_DOME) / DOME_DUR)), Rd = DOME.R * (0.6 + 0.4 * dg);
    m.domeGrow = dg;
    zd.set(zs);
    if (dg > 0) {
      for (let j = Math.max(0, CY - DOME.R - 1); j < NY; j++) for (let i = CX - DOME.R - 1; i <= CX + DOME.R + 1; i++) {
        const k = j * N + i, dx = i - CX, dy = j - CY, u = Math.sqrt(dx * dx + dy * dy) / Rd;
        if (u >= 1) continue;
        const u2 = u * u, add = DOME.H * dg * (1 - u2 * u2) * (0.92 + 0.16 * n2(i * 1.7, j * 1.7));
        zd[k] += add;
        if (add > 8) { mat[k] = MAT.TRACHYTE; age[k] = Math.min(t, T_DOME + DOME_DUR); }
        if (t < T_DOME + DOME_DUR + 1.5) heat[k] = Math.max(heat[k], 0.7 * clamp(add / 60) * (t <= T_DOME + DOME_DUR ? 1 : 1 - (t - T_DOME - DOME_DUR) / 1.5));
      }
    }
    // 3. 꼭대기: 분화구(화구) 또는 칼데라
    zc.set(zd);
    const cg = caldera ? ease(clamp((t - T_COLLAPSE) / COLLAPSE_DUR)) : ease(clamp((t - T_CRATER) / CRATER_DUR));
    m.craterGrow = cg;
    // 마그마 방에 남은 마그마: 칼데라 쪽은 큰 분출 동안 많이 빠져나간다.
    m.chamberFill = caldera ? 1 - 0.65 * clamp((t - T_CRATER) / (T_ATRIO - T_CRATER)) : 1;
    m.summitCone = null; m.atrio = null;
    if (cg > 0 && !caldera) {
      const rim = Math.min(zd[CY * N + CX - CRATER.R], zd[CY * N + CX + CRATER.R], zd[(CY - CRATER.R) * N + CX]), floor = rim - CRATER.D, rr = Math.ceil(CRATER.R) + 1;
      m.craterFloor = floor;
      for (let j = CY - rr; j < NY; j++) for (let i = CX - rr; i <= CX + rr; i++) {
        const k = j * N + i, dx = i - CX, dy = j - CY, u = Math.sqrt(dx * dx + dy * dy) / CRATER.R;
        if (u >= 1) continue;
        const target = floor + (zd[k] - floor) * u * u;
        if (target < zd[k]) zc[k] = zd[k] - (zd[k] - target) * cg;
        age[k] = Math.min(t, T_CRATER + CRATER_DUR);
      }
    }
    zk.set(zc);
    if (caldera && t > T_CRATER) {
      const R = calderaR(), rimZ = zd[CY * N + Math.round(CX + R)], floor = rimZ - 280 - 40 * (V().cone ? 1 : 0);
      m.craterFloor = floor; m.rimZ = rimZ;
      const rr = Math.ceil(R) + 1, af = ease(clamp((t - T_ATRIO) / ATRIO_DUR));
      for (let j = Math.max(0, CY - rr); j < NY; j++) for (let i = Math.max(0, CX - rr); i <= Math.min(N - 1, CX + rr); i++) {
        const k = j * N + i, dx = i - CX, dy = j - CY, u = Math.sqrt(dx * dx + dy * dy) / R;
        if (u >= 1) continue;
        if (cg > 0) {
          // 둥근 단층 안쪽(u < 0.8)은 덩어리째 평평하게 꺼지고, 가장자리는 급한 벽이 된다.
          const w = clamp((u - 0.8) / 0.2), sm = w * w * (3 - 2 * w);
          const fl = floor + 10 * (n3(i, j) - 0.5);
          const target = fl + (zs[k] - fl) * sm;
          zc[k] = zd[k] - (zd[k] - target) * cg;
          zk[k] = zc[k];
          if (u < 0.85) { mat[k] = MAT.BASALT; age[k] = Math.min(t, T_COLLAPSE + COLLAPSE_DUR); }
        }
        // 화구원: 무너진 흙과 돌, 화산재가 바닥을 메운다. 앞쪽(남쪽)이 더 높은 계단 모양이다.
        if (af > 0 && u < 0.95) {
          const hf = clamp((j - (CY - 0.5 * R)) / 3 + 0.5), top = floor + af * (ATRIO.low + (ATRIO.high - ATRIO.low) * hf);
          if (top > zc[k]) {
            zc[k] = top;
            if (top > zk[k] + 3) { mat[k] = MAT.FILL; age[k] = Math.min(t, T_ATRIO + ATRIO_DUR); }
          }
        }
      }
      if (af > 0) m.atrio = { af, low: floor + af * ATRIO.low, high: floor + af * ATRIO.high };
      // 칼데라 안에서 다시 분출해 작은 화산(중앙화구구)이 솟는다. 앞면이 이 작은 화산을 잘라 단면에서도 보인다.
      m.summitCone = { n: 9, kind: 'central', x: CX - 0.4 * R, y: CY - 1, ux: 0, uy: -1, horseshoe: false, start: T_CENTRAL, dur: CENTRAL_DUR, sea: false };
    }
    // 4. 측화산
    z.set(zc);
    const cones = [...plan.cones];
    if (m.summitCone) cones.push(m.summitCone);
    m.cones = [];
    for (const c of cones) {
      const g = coneState(c, t);
      if (g <= 0) continue;
      const S = CONE_SHAPE[c.kind], rr = Math.ceil(S.rb) + 1, te = c.start + (c.dur || CONE_DUR);
      const base = zc[clamp(Math.round(c.y), 0, NY - 1) * N + clamp(Math.round(c.x), 0, N - 1)];
      m.cones.push({ ...c, g, base, top: base + S.h * g, done: t >= te });
      for (let j = Math.max(0, Math.floor(c.y) - rr); j <= Math.min(NY - 1, Math.ceil(c.y) + rr); j++) for (let i = Math.max(0, Math.floor(c.x) - rr); i <= Math.min(N - 1, Math.ceil(c.x) + rr); i++) {
        const k = j * N + i, add = coneAdd(c, i, j, g);
        if (add <= 0) continue;
        // 작은 화산은 바닥 땅(base) 위에 쌓인다. 산허리 경사는 그대로 따라간다.
        const nz = zc[k] + add;
        if (nz > z[k]) z[k] = nz;
        if (add > 6) {
          mat[k] = c.kind === 'tuffcone' || c.kind === 'tuffring' ? MAT.TUFF : MAT.SCORIA;
          age[k] = Math.min(t, te);
          if (t < te + 1 && mat[k] === MAT.SCORIA) heat[k] = Math.max(heat[k], 0.8 * clamp(add / 50) * (t <= te ? 1 : 1 - (t - te)));
        }
      }
    }
    let mz = -1e9;
    for (let k = 0; k < size; k++) if (z[k] > mz) mz = z[k];
    m.maxZ = mz;
    // 5. 고인 물(화구호). 칼데라 쪽은 울릉도처럼 바닥이 메워진 화구원으로 두고 물을 채우지 않는다.
    const lf = caldera ? 0 : clamp((t - T_LAKE) / LAKE_DUR);
    m.lake = null;
    if (lf > 0) {
      const level = m.craterFloor + 35 * lf + 3;
      // 앞면 줄에서 물이 찬 너비를 잰다.
      const lim = caldera ? Math.ceil(calderaR()) : CRATER.R;
      let a = CX, b = CX;
      while (a > CX - lim && z[CY * N + a - 1] < level) a--;
      while (b < CX + lim && z[CY * N + b + 1] < level) b++;
      m.lake = { level, x0: a, x1: b, R: Math.max(CX - a, b - CX) + 0.6, caldera };
    }
    // 6. 용암 동굴과 주상절리
    m.tube = null;
    if (plan.tube) {
      const ts = flowStart(TUBE_FLOW), te = ts + FLOW_DUR;
      if (t > ts + 0.6) {
        const adv = ease(clamp((t - ts) / FLOW_DUR));
        let x1 = plan.tube.x0;
        while (x1 < plan.tube.x1 && (x1 + 1 - CX) / (V().R * REACH[TUBE_FLOW]) < adv) x1++;
        // 칼데라가 생기면 꺼진 곳 안쪽의 동굴은 함께 무너져 없어진다.
        const x0 = caldera && cg > 0 ? Math.max(plan.tube.x0, Math.ceil(CX + calderaR() + 1)) : plan.tube.x0;
        if (x1 > x0) m.tube = { x0, x1, molten: t < te + 0.8, drained: t >= te + 0.8 };
      }
    }
    const cs = flowStart(COLUMN_FLOW) + FLOW_DUR + 2;
    m.column = t >= cs ? { ...plan.column } : null;
    // 지금 분출 중인 곳(그림의 불빛과 분출물)
    const vents = [];
    for (let f = 0; f < NF; f++) {
      const ts = flowStart(f);
      if (t > ts && t < ts + FLOW_DUR) vents.push({ x: CX, y: CY, z: zs[CY * N + CX], kind: zs[CY * N + CX] < 0 ? 'steam' : 'lava', s: 0.7 });
    }
    if (dg > 0 && t < T_DOME + DOME_DUR) vents.push({ x: CX, y: CY, z: zd[CY * N + CX], kind: 'lava', s: 0.45 });
    if (!caldera && cg > 0 && t < T_CRATER + CRATER_DUR + 0.8) vents.push({ x: CX, y: CY, z: zc[CY * N + CX], kind: 'ash', s: 0.6 });
    if (caldera && t > T_CRATER && t < T_COLLAPSE + 1.2) vents.push({ x: CX, y: CY, z: zc[CY * N + CX], kind: 'ash', s: t < T_COLLAPSE ? 1 : 0.5 });
    for (const c of m.cones) if (!c.done) vents.push({ x: c.x, y: c.y, z: c.top, kind: c.kind === 'tuffcone' || c.kind === 'tuffring' ? 'steam' : 'lava', s: 0.6 });
    m.vents = vents.slice(0, 3);
    m.erupting = vents.length > 0;
  }

  m.phase = () => {
    const t = m.clock;
    if (m.finished) return 'done';
    if (t < T_START) return 'sea';
    if (t < T_DOME) return m.maxZ < 0 ? 'subsea' : 'shield';
    if (t < T_CONES) return 'dome';
    if (t < T_CRATER) return 'cones';
    if (t < T_TODAY) {
      if (m.options.top !== 'caldera') return 'crater';
      if (t < T_COLLAPSE) return 'bigEruption';
      if (t < T_ATRIO) return 'collapse';
      if (t < T_CENTRAL) return 'atrio';
      return 'central';
    }
    return 'today';
  };
  m.todayFrac = () => clamp((m.clock - T_TODAY) / 4);

  function round() {
    m.clock = Math.round((m.clock + ROUND) * 1000) / 1000; roundNo++;
    if (m.clock >= T_END - 1e-9) m.finished = true;
    compute();
    m.version++;
    if (roundNo % 2 === 0 || m.finished) spotCache = computeSpots();
  }

  // 이름표 자리. 그 지형이 실제로 있는 곳만 고른다. x, y는 칸, z는 높이(m)다.
  function computeSpots() {
    const out = {}, r = volcanoReport(m), F = NY - 1;
    const zAt = (x, y) => z[clamp(Math.round(y), 0, NY - 1) * N + clamp(Math.round(x), 0, N - 1)];
    const ph = m.phase();
    if (!r.island) out.sea = { x: CX - 0.45 * plan.shoreR, y: CY - 0.55 * plan.shoreR, z: 0 };
    if (r.island) {
      // 순상화산: 뒤쪽 왼편 산허리
      const x = CX - 0.5 * plan.shoreR * 0.7, y = CY - 0.5 * plan.shoreR * 0.7;
      out.shield = { x, y, z: zAt(x, y) };
    }
    const cald = m.options.top === 'caldera', R = calderaR();
    if (m.domeGrow > 0.3 && !(cald && m.craterGrow > 0.5)) out.dome = { x: CX + 2.5, y: CY - 3, z: zAt(CX + 2.5, CY - 3) };
    if (m.lake) out.craterLake = { x: CX + 0.6 * (m.lake.x1 - CX), y: CY - 0.5, z: m.lake.level };
    else if (!cald && m.craterGrow > 0.5) out.crater = { x: CX, y: CY - 1, z: zAt(CX, CY) };
    if (cald && ph === 'bigEruption') out.bigEruption = { x: CX, y: CY - 1, z: zAt(CX, CY) };
    if (cald && m.craterGrow > 0.5) {
      const q = m.atrio && m.atrio.af > 0.5 ? [CX + 0.62 * R, CY - 0.4 * R] : [CX + 0.25 * R, CY - 0.45 * R];
      out.caldera = { x: q[0], y: q[1], z: zAt(q[0], q[1]) };
      out.somma = { x: CX - 0.78 * R, y: CY - 0.78 * R, z: zAt(CX - 0.78 * R, CY - 0.78 * R) };
    }
    if (m.atrio && m.atrio.af > 0.5) {
      out.atrioLow = { x: CX + 0.2 * R, y: CY - 0.72 * R, z: zAt(CX + 0.2 * R, CY - 0.72 * R) };
      out.atrioHigh = { x: CX + 0.3 * R, y: CY - 0.12 * R, z: zAt(CX + 0.3 * R, CY - 0.12 * R) };
    }
    const seen = {};
    for (const c of m.cones) {
      if (c.g < 0.5) continue;
      const key = c.kind === 'scoria' ? (c.horseshoe ? 'horseshoe' : 'scoria') : c.kind;
      if (seen[key]) continue;
      seen[key] = 1;
      out[key] = { x: c.x, y: c.y, z: c.top };
    }
    if (m.tube && m.tube.x1 > m.tube.x0 + 4) {
      const x = (m.tube.x0 + m.tube.x1) / 2, ly = m.layersAt(Math.round(x), F);
      out.tube = { x, y: F, z: (ly[TUBE_FLOW] + ly[TUBE_FLOW + 1]) / 2 };
    }
    if (m.column) {
      const x = (m.column.x0 + m.column.x1) / 2, ly = m.layersAt(Math.round(x), F);
      out.column = { x, y: F, z: (ly[COLUMN_FLOW] + ly[COLUMN_FLOW + 1]) / 2 };
    }
    // 흐르는 용암의 앞머리
    for (let f = NF - 1; f >= 0; f--) {
      const ts = flowStart(f);
      if (m.clock > ts + 0.4 && m.clock < ts + FLOW_DUR) {
        const adv = ease(clamp((m.clock - ts) / FLOW_DUR)), [ux, uy] = dirs[f], d = 0.85 * adv * V().R * REACH[f] * (0.62 + 0.38 * (0.5 + 0.5 * 0.9));
        const x = clamp(CX + ux * d, 2, N - 3), y = clamp(CY + uy * d, 2, NY - 1);
        out.flow = { x, y, z: Math.max(0, zAt(x, y)) };
        break;
      }
    }
    return out;
  }
  m.spots = () => spotCache;
  m.endTime = () => T_END;
  m.setOption = (name, v) => { m.options[name] = v; };
  m.reset = () => {
    const key = `${m.options.visc}:${m.options.vent}`;
    if (key !== planKey) { planKey = key; buildPlan(); }
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

// 섬의 모습을 잰다. 막대와 판정 문구가 같은 집계에서 나온다.
export function measure(m) {
  const z = m.z, row = CY * N;
  let summit = -1e9;
  for (let k = 0; k < N * NY; k++) if (z[k] > summit) summit = z[k];
  // 섬 지름(동서): 앞면 줄에서 바다 위로 나온 칸
  let land = 0;
  for (let i = 0; i < N; i++) if (z[row + i] > 0) land++;
  // 산허리 기울기: 용암이 쌓인 몸체(작은 화산과 꼭대기를 뺀)에서 해안선까지 거리의 45%와 90% 사이를 세 방향으로 잰 평균(1km를 가면 오르는 높이)
  const S = m.plan.shoreR, dirs = [[-1, 0], [1, 0], [0, -1]], zs = m.zs;
  let rise = 0;
  for (const [ux, uy] of dirs) {
    const a = 0.45 * S, b = 0.9 * S;
    const za = zs[Math.round(CY + uy * a) * N + Math.round(CX + ux * a)], zb = zs[Math.round(CY + uy * b) * N + Math.round(CX + ux * b)];
    rise += (za - zb) / (((b - a) * CELL_M) / 1000);
  }
  rise /= dirs.length;
  return { summit, landCells: land, rise };
}

export function volcanoReport(m) {
  const ph = m.phase(), done = ph === 'done', me = measure(m), thin = m.options.visc === 'thin', caldera = m.options.top === 'caldera';
  const summitM = Math.max(0, Math.round(me.summit / 10) * 10);
  const widthKm = Math.round((me.landCells * CELL_M) / 100) / 10;
  const slope = Math.max(0, Math.round(me.rise / 10) * 10);
  const cones = (m.cones || []).filter(c => c.g >= 0.5 && c.kind !== 'central');
  const scoria = cones.filter(c => c.kind === 'scoria').length, horseshoe = cones.filter(c => c.horseshoe).length;
  const tuffcone = cones.filter(c => c.kind === 'tuffcone').length, tuffring = cones.filter(c => c.kind === 'tuffring').length;
  const central = (m.cones || []).some(c => c.kind === 'central' && c.g >= 0.5);
  const island = me.summit > 0;
  const flowsDone = Math.min(NF, Math.max(0, Math.floor((m.clock - T_START) / FLOW_GAP) + (m.clock > T_START ? 1 : 0)));
  const domeUp = m.domeGrow >= 0.5 && !(caldera && m.craterGrow > 0.5);
  const parts = [];
  if (ph === 'sea') parts.push('아직 얕은 바다입니다. 바다 밑 땅속에 마그마가 모여 있습니다.');
  else if (!island) parts.push(`바다 밑에서 용암이 ${flowsDone}번 흘러 쌓였습니다. 아직 바다 위로 나오지 않았습니다.`);
  else {
    parts.push(`산 높이는 약 ${summitM}m, 섬 지름(동서)은 약 ${widthKm}km입니다.`);
    parts.push(`산허리는 1km를 가면 약 ${slope}m 높아집니다.`);
    if (m.clock >= T_DOME) parts.push(thin ? '묽은 현무암질 용암이 멀리 퍼져 경사가 완만한 순상화산이 되었습니다.' : '끈적한 용암이 멀리 가지 못해 좁고 경사가 급한 화산체가 되었습니다.');
  }
  if (domeUp) parts.push('꼭대기에 경사가 급한 용암원정구가 솟았습니다.');
  if (m.lake && !caldera) parts.push('분화구에 물이 고여 화구호가 되었습니다.');
  else if (m.craterGrow > 0.5 && !caldera) parts.push('꼭대기에 분화구가 생겼습니다.');
  // 꼭대기의 우묵한 곳: 화구 또는 칼데라 지름(km)과 칼데라 바닥 깊이(m)
  let topKm = 0, depthM = 0;
  if (!caldera && m.craterGrow > 0.5) topKm = Math.round((2 * CRATER.R * CELL_M) / 100) / 10;
  if (caldera && m.craterGrow > 0.5) {
    topKm = Math.round((2 * m.calderaR() * CELL_M) / 100) / 10;
    depthM = Math.round((m.rimZ - (m.atrio ? m.atrio.low : m.craterFloor)) / 10) * 10;
  }
  const atrio = !!(caldera && m.atrio && m.atrio.af >= 0.5);
  if (caldera && ph === 'bigEruption') parts.push('큰 분출로 땅속 마그마 방의 마그마가 한꺼번에 빠져나가고 있습니다.');
  if (topKm && caldera) {
    parts.push(`꼭대기가 지름 약 ${topKm}km로 크게 꺼져 칼데라가 되었습니다. 바닥은 둘레의 외륜산보다 약 ${depthM}m 낮습니다.`);
    if (atrio) parts.push('바닥이 메워져 높이가 다른 두 화구원이 계단 모양으로 생겼습니다.');
    if (central) parts.push('칼데라 안에서 다시 분출해 중앙화구구가 솟았습니다.');
  }
  const nCones = cones.length;
  if (nCones) {
    const kinds = [];
    if (scoria) kinds.push(`분석구 ${scoria}개${horseshoe ? `(말굽형 ${horseshoe}개)` : ''}`);
    if (tuffcone) kinds.push(`응회구 ${tuffcone}개`);
    if (tuffring) kinds.push(`응회환 ${tuffring}개`);
    parts.push(`측화산(오름) ${nCones}개: ${kinds.join(', ')}.`);
  }
  if (m.tube && m.tube.drained) parts.push('앞면 단면에 용암 동굴이 남았습니다.');
  else if (m.tube) parts.push('앞면 단면의 굳은 용암 속으로 뜨거운 용암이 흐르고 있습니다.');
  if (m.column) parts.push('두꺼운 용암이 식어 주상절리가 생겼습니다.');
  if (done && !thin) parts.push('끈적한 용암에서는 용암 동굴이 잘 생기지 않습니다.');
  return { summitM, widthKm, slope, island, cones: nCones, scoria, horseshoe, tuffcone, tuffring, central, dome: domeUp, tube: !!(m.tube && m.tube.drained), column: !!m.column, lake: !!m.lake, topKm, depthM, atrio, flowsDone, text: parts.join(' ') };
}

export function noteText(m) {
  const ph = m.phase(), thin = m.options.visc === 'thin', caldera = m.options.top === 'caldera', shore = m.options.vent === 'shore';
  if (ph === 'sea') return '얕은 바다(대륙붕) 밑 깊은 땅속에서 마그마가 만들어져 위로 올라와 모입니다. 제주도는 이렇게 얕은 바다 위에서 생긴 화산섬입니다. 책은 우리나라 화산이 판의 경계가 아닌 열점에서 생긴 것으로 해석합니다. 다른 해석도 있습니다.';
  if (ph === 'subsea') return (thin ? '바다 밑에서 묽은 현무암질 용암이 흘러나옵니다. 현무암질 용암은 규산(실리카)이 적어 온도가 높고 잘 흘러, 얇고 넓게 퍼집니다.' : '바다 밑에서 끈적한 용암이 흘러나옵니다. 규산(실리카)이 많은 용암일수록 온도가 낮고 끈적해 멀리 흐르지 못하고 분화구 가까이에 쌓입니다.')
    + ' 물속으로 흘러나온 용암은 급히 식어 굳으며, 베개 모양으로 굳기도 합니다(베개 용암). 여러 번 흘러 쌓이면 화산이 점점 높아집니다.';
  if (ph === 'shield') return thin
    ? '용암이 바다 위로 나와 섬이 되었습니다. 묽은 현무암질 용암이 여러 번 사방으로 넓게 흘러 겹겹이 쌓이면, 너비가 높이보다 훨씬 크고 경사가 완만한 방패 모양 화산이 됩니다. 이것이 순상화산입니다. 흐르는 용암은 겉이 먼저 식어 굳고, 속의 뜨거운 용암은 계속 흘러 빠져나가 빈 굴(용암 동굴)이 남기도 합니다.'
    : '용암이 바다 위로 나와 섬이 되었습니다. 끈적한 용암은 멀리 퍼지지 못해 분화구 둘레에 높게 쌓이므로, 묽은 용암보다 좁고 경사가 급한 화산체가 됩니다. 이런 몸체는 방패처럼 완만한 순상화산이라고 하기 어렵습니다.';
  if (ph === 'dome') return '꼭대기에서 규산이 많은 조면암질 용암이 나옵니다. 아주 끈적해 흐르지 못하고 분화구 위에 천천히 부풀어 올라 굳으므로, 경사가 급한 종 모양 화산이 됩니다. 이것이 용암원정구(종상화산)입니다. 한라산 정상부가 이렇게 생겼고(약 16만 년 전), 제주 산방산도 용암원정구입니다. 그 뒤 산허리와 바닷가에서 작은 분출이 이어집니다.';
  if (ph === 'crater') return '마지막으로 꼭대기에서 폭발이 일어나 깔때기 모양의 분화구(화구)가 생겼습니다. 비가 오면 분화구에 물이 고여 화구호가 됩니다. 한라산 백록담은 약 2만 5천 년 전에 생긴 분화구에 물이 고인 화구호이며, 칼데라가 아닙니다.';
  if (ph === 'bigEruption') return '마지막으로 꼭대기에서 아주 큰 분출이 일어납니다. 화산재가 높이 솟고, 뜨거운 화산재와 돌 조각이 비탈을 빠르게 흘러내립니다(화쇄류). 이때 땅속 마그마 방의 마그마가 한꺼번에 많이 빠져나갑니다. 앞면 단면에서 마그마 방이 작아지는 것을 보세요. 이 꼭대기 모양은 울릉도를 본뜬 것입니다.';
  if (ph === 'collapse') return '마그마가 빠져나가 받쳐 줄 것이 없어지자, 꼭대기가 둥근 단층을 따라 덩어리째 꺼져 내립니다. 이렇게 생긴 솥 모양의 큰 분지가 칼데라입니다. 화구는 폭발로 꼭대기에 뚫린 구멍이고, 칼데라는 땅이 꺼져 생긴 것이라 화구보다 훨씬 크며 지름이 수 km에 이르기도 합니다. 꺼지지 않고 둘레에 남은 산을 외륜산이라고 하며, 울릉도 성인봉에서 북쪽으로 뻗은 능선이 외륜산입니다. 울릉도 칼데라는 약 1만 년 전에 생겼다고 봅니다.';
  if (ph === 'atrio') return '칼데라 벽에서 무너져 내린 흙과 돌, 그 뒤에 쌓인 화산재가 바닥을 메워 평평한 땅이 생깁니다. 이것이 화구원입니다. 울릉도 칼데라 바닥은 북쪽의 나리 분지(약 350m)와 남쪽의 알봉 분지(약 450m)로 나뉘어 높이가 다른 계단 모양입니다. 이 모형에서도 앞쪽(남쪽) 바닥이 뒤쪽보다 높습니다.';
  if (ph === 'central') return '칼데라 안에서 다시 작은 분출이 일어나 작은 화산이 솟습니다. 이것이 중앙화구구입니다. 울릉도 알봉이 중앙화구구로, 약 6,300년 전에 생겼으며 두 화구원 사이에 있습니다. 칼데라와 그 안의 중앙화구구가 함께 있어 나리 분지 일대를 복합 화산이라고 합니다. 백두산 천지처럼 칼데라에 물이 고이면 칼데라호가 됩니다.';
  if (ph === 'cones') return '큰 화산의 산허리나 바닷가에서 작은 분출이 일어나 작은 화산이 생깁니다. 이것을 측화산(기생화산)이라고 하며, 제주에서는 오름이라고 부릅니다. 땅 위에서 터지면 구멍이 많은 붉고 검은 돌 조각(스코리아, 제주말 송이)이 화구 둘레에 쌓여 경사가 급한 분석구가 됩니다. 용암이 한쪽으로 흘러나가 화구 한쪽이 터진 말굽형 분석구도 많습니다.'
    + (shore ? ' 얕은 바다에서 마그마가 바닷물과 만나면 물이 순식간에 수증기가 되며 크게 터집니다. 고운 화산재가 쌓여 굳은 응회암으로 화구가 큰 응회구(성산 일출봉)나, 더 낮고 넓게 퍼진 응회환(송악산, 수월봉)이 생깁니다.' : ' 측화산이 터진 자리를 얕은 바다로 바꾸면 물과 만나 터진 응회구와 응회환을 볼 수 있습니다.');
  const tail = thin ? ' 앞면 단면에 보이는 용암 동굴은 흐르던 용암의 겉이 먼저 굳고 속이 빠져나가 생긴 굴입니다(제주 만장굴, 김녕굴). 석회 동굴과 달리 대체로 길고 모양이 단순합니다.' : ' 끈적한 용암은 겉과 속이 함께 천천히 멈춰 용암 동굴이 잘 생기지 않습니다.';
  return '오늘날의 화산섬입니다. 오래된 용암 위는 흙과 풀, 숲이 덮었습니다. 두꺼운 용암이 식으며 부피가 줄면 갈라진 틈이 바위를 다각형 기둥 모양으로 나누는데, 이것이 주상절리입니다(서귀포 대포 해안). 기둥은 식는 면에 수직으로 생겨 대개 위아래로 길지만, 경주 양남처럼 누운 것도 있습니다. 현무암 땅은 틈이 많아 빗물이 땅속으로 잘 스며들어, 제주의 하천은 비가 올 때만 물이 흐르는 건천이 많고, 바닷가에서 지하수가 솟는 용천을 중심으로 마을이 생겼습니다.'
    + tail + (caldera ? ' 꼭대기가 크게 꺼진 칼데라는 울릉도와 백두산에서 볼 수 있습니다. 울릉도 나리 분지는 칼데라 바닥의 화구원이고, 백두산 천지는 칼데라에 물이 고인 칼데라호입니다. 한라산 꼭대기에는 칼데라가 없습니다.' : ' 제주도에는 오름이 360개가 넘습니다. 실제 제주도는 백만 년이 넘는 긴 시간에 걸쳐 여러 번의 분출로 생겼고, 그동안 해수면도 오르내렸습니다. 제주도가 생긴 차례에는 다른 해석도 있습니다.');
}

export function compareBrief(a, b) {
  const ra = volcanoReport(a), rb = volcanoReport(b);
  const ta = `산 높이 약 ${ra.summitM}m이고, 꼭대기 분화구는 지름 약 ${Math.round((2 * CRATER.R * CELL_M) / 10) * 10}m입니다${ra.lake ? '. 물이 고여 화구호가 되었습니다' : ''}`;
  const tb = `산 높이 약 ${rb.summitM}m이고, 꼭대기가 꺼진 칼데라는 지름 약 ${Math.round((2 * b.calderaR() * CELL_M) / 100) / 10}km입니다${rb.atrio ? '. 바닥이 메워져 화구원이 되었습니다' : ''}${rb.central ? '. 안에 중앙화구구가 솟았습니다' : ''}`;
  const extra = '화구는 폭발로 꼭대기에 생긴 구멍이고, 칼데라는 마그마가 빠져나가 꼭대기가 통째로 꺼져 생긴 훨씬 큰 분지입니다.';
  return { a: ta, b: tb, extra };
}
