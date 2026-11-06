// © 2026 김용현
// 범람원 형성 모형의 계산. 화면과 분리되어 있어 node에서도 실행할 수 있다.
// 산지 사이의 평평한 골짜기 바닥에서 시작한다. 강의 굽이는 수식으로 정해 두고 움직이지 않는다.
// 홍수 때 하도의 수위가 둑보다 높아지면 물이 격자 위로 퍼져 나간다. 물의 흐름은 칸 사이 수면 차이로 계산하고, 물이 가진 흐름(관성)도 이어받는다.
// 물에 섞인 모래와 진흙은 물과 함께 옮겨 가고, 입자마다 정한 빠르기로 가라앉아 그 칸의 땅을 실제로 높인다.
// 모래는 빨리 가라앉아 하도 옆에 자연 제방을 쌓고, 진흙은 멀리 가서 배후 습지에 얇게 쌓인다.
// 둑이 높아지면 같은 수위로는 넘지 못하므로, 작은 홍수는 나중에 하도 안에서 지나간다. 하도 바닥과 평소 수위는 둑이 오른 만큼의 일부만 따라 오른다.
// 넘친 물은 대부분 스며들고 빠져 평지가 드러나고, 둘레보다 낮은 곳에만 고여 천천히 줄어든다. 오른쪽 끝(하류)에서는 평지 물이 빠져나간다.
// 경사를 따라 길을 찾는 계산이 없고 칸마다 튀는 물결을 지우는 항(SPREAD)이 있어 값이 조금 달라도 갈라지지 않는다.
// 안정 조건: PUSH * DEEP * DT * DT 가 0.25 아래여야 한다. 넘으면 물결이 칸마다 튀어 수면이 망가진다(직접 겪은 일).
// 모든 계산은 고정 시간 격자(초당 STEP_RATE번)로 하므로 tick 크기와 무관하게 같은 지형이 나온다.
import { rng32 } from '../../shared/rng.js';

export const N = 256;
export const CHANNEL = 7; // 하도 너비의 절반(칸)
export const SECTION_SAMPLES = 280;
const DEPTH = 2.8; // 처음 둑에서 하도 바닥까지의 깊이
const LOW_STAGE = -0.8; // 평소 수위(처음 둑 높이 기준). 물은 하도 안에 있다.
const STEP_RATE = 45; // 초당 계산 횟수
const DT = 1 / STEP_RATE;
const CALM_SECONDS = 2; // 첫 홍수 전 평소 모습을 보여 주는 시간
const END_SECONDS = 6; // 마지막 홍수 뒤 물이 빠지는 것을 보여 주는 시간
const FLOODS_SECONDS = 60; // 홍수를 모두 합한 시간. 빈도가 달라도 전체 길이는 같다.
const RISE = 1.4, CREST = 1.5, FALL = 1.4; // 홍수 한 번의 수위 오름, 머무름, 내림 시간
const WAVE_SPEED = 300; // 홍수 파도가 강을 따라 내려가는 빠르기(칸/초). 상류부터 먼저 넘친다.
const PUSH = 360, DEEP = 1.4, SPREAD = 6; // 수면 차이가 물을 미는 힘. 물결이 퍼지는 빠르기를 정한다.
const DRAG = 1, DRAG_SHALLOW = 0.8; // 물이 느려지는 정도. 얕을수록 빨리 느려진다.
const WET = 0.03; // 이보다 얕으면 마른 땅으로 친다
const DRAIN_SECONDS = 1.8, POND_SECONDS = 6, POND_DEPTH = 0.5; // 물이 빠지는 빠르기(시간 압축). 얕은 물은 조금 느리게 빠진다.
// 낮은 곳에 고인 물: 칸이 둘레 땅(HOLD_R칸 평균)보다 낮은 만큼은 빠지지 않고 고여 아주 천천히 줄어든다. 그래서 평지는 드러나고 낮은 곳에만 물이 남는다.
const HOLD_R = 10, HOLD_FROM = 0.05, HOLD_MAX = 0.5, HOLD_GAIN = 4, SOAK_SECONDS = 150;
const SEEP = 0.17; // 평지 물이 땅으로 스며드는 양(초당 수심). 얕은 물막이 오래 남지 않게 한다.
const EDGE_SECONDS = 0.5; // 블록 오른쪽 끝(하류)에서 평지 물이 빠져나가는 빠르기. 끝이 벽이 되지 않게 한다.
const BED_RISE = 0.45; // 둑이 오른 만큼의 이 비율로 하도 바닥과 평소 수위도 오른다.
const CLEAR_FLOWING = 4, CLEAR_QUIET = 1; // 평지 물의 흙탕이 옅어지는 시간. 강에서 물이 넘어오는 동안은 천천히, 그친 뒤에는 빨리 옅어진다.
export const FLOWING = 40; // 하도에서 넘어오는 물의 양이 이보다 크면 넘치는 중이다.
const LEVEE_NAMED = 1.5; // 제방이 이만큼 높아져야 자연 제방, 배후 습지라고 부른다.
const FAST = 40; // 이 빠르기(칸/초)면 가라앉는 빠르기가 절반이 된다
export const SETTLE = { sand: 4, mud: 0.05 }; // 교육용으로 정한 가라앉는 빠르기
const SUPPLY = { sand: 0.12, mud: 0.07 }; // 하도 물에 섞인 양(수심 1당)
const PARTICLES = 640; // 물과 함께 움직이는 표시용 알갱이 수. 지형 계산에는 쓰지 않는다.
const REST_SECONDS = 3; // 알갱이가 멈춘 뒤 보이는 시간

export const OPTIONS = {
  size: { low: 2.6, mid: 3.8, high: 5.6 }, // 보통 홍수의 수위(처음 둑 높이 기준)
  freq: { low: 5, mid: 8, high: 12 }, // 홍수 횟수
  dam: { no: { stage: 1, supply: 1, hold: 0, crest: 1 }, yes: { stage: 0.6, supply: 0.6, hold: 0.7, crest: 0.5 } }, // 댐이 줄이는 수위와 토사와 높은 물이 머무는 시간의 비율. hold보다 작은 홍수는 댐이 모두 가둔다.
};

export const PRESETS = {
  textbook: { name: '교과서 범람원', options: { size: 'mid', freq: 'mid', dam: 'no' } },
  big: { name: '큰 홍수', options: { size: 'high', freq: 'mid', dam: 'no' } },
  dam: { name: '댐이 있는 강', options: { size: 'mid', freq: 'mid', dam: 'yes' } },
};

// 홍수마다의 크기 비율. 작은 홍수(0.62)가 섞여 있어 둑이 높아지면 넘지 못하는 모습이 보인다.
const PATTERN = [1, 0.62, 1, 1.12, 0.62, 1, 1.12, 0.62, 1, 1.12, 0.62, 1];
export const SMALL = 0.62;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const idx = (i, j) => j * N + i;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// 처음 둑 높이: 왼쪽(상류)이 조금 높고 오른쪽(하류)이 낮다.
const zAtX = x => 1 - (x / N) * 2;

function valueNoise(seed) {
  const r = rng32(seed), S = 128;
  const g = new Float32Array(S * S).map(() => r());
  const at = (x, y) => g[((y % S) + S) % S * S + ((x % S) + S) % S];
  const n = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    return (at(i, j) * (1 - a) + at(i + 1, j) * a) * (1 - b) + (at(i, j + 1) * (1 - a) + at(i + 1, j + 1) * a) * b;
  };
  return (x, y, oct = 3) => { let s = 0, w = 0.5, f = 1, t = 0; for (let o = 0; o < oct; o++) { s += w * n(x * f, y * f); t += w; w *= 0.5; f *= 2; } return s / t; };
}

// 강 중심선: 왼쪽에서 오른쪽으로 완만하게 굽이친다. 칸 하나 간격으로 찍는다. 곡류 변화는 다음 장면의 몫이라 움직이지 않는다.
function buildPath(seed) {
  const r = rng32(seed * 131 + 7);
  const A = 24 + r() * 4, lam = 205 + r() * 25, phi = r() * Math.PI * 2, A2 = 3 + r() * 2, lam2 = 90 + r() * 20, phi2 = r() * Math.PI * 2;
  const yAt = x => 128 + A * Math.sin((2 * Math.PI * x) / lam + phi) + A2 * Math.sin((2 * Math.PI * x) / lam2 + phi2);
  const pts = [];
  let x = -16;
  while (x < N + 16) {
    const y = yAt(x), dy = yAt(x + 0.01) - y, th = Math.atan2(dy, 0.01);
    pts.push({ x, y, th });
    x += Math.cos(th);
  }
  return pts;
}

// 칸마다 가장 가까운 중심선 점, 거리, 어느 쪽 강둑인지 잰다. 씨앗마다 한 번만 계산한다.
function buildGeometry(seed) {
  const path = buildPath(seed), M = path.length;
  const near = new Int16Array(N * N), dist = new Float32Array(N * N), side = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let best = Infinity, bs = 0;
    for (let s = 0; s < M; s++) {
      const dx = path[s].x - i, dy = path[s].y - j, q = dx * dx + dy * dy;
      if (q < best) { best = q; bs = s; }
    }
    const k = idx(i, j), p = path[bs];
    near[k] = bs; dist[k] = Math.sqrt(best);
    side[k] = Math.cos(p.th) * (j - p.y) - Math.sin(p.th) * (i - p.x) > 0 ? 1 : 0;
  }
  return { path, M, near, dist, side };
}

// 빈 골짜기 바닥: 강 양옆이 평평하고, 산자락에서 조금씩 오르다가 산지가 된다.
function buildBase(seed, geo) {
  const noise = valueNoise(seed + 40), { dist } = geo;
  const base = new Float32Array(N * N), hill = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j), axis = Math.abs(j - 127.5);
    const foot = 100 - noise(i * 0.022 + 9, j > 128 ? 3 : 7, 2) * 18; // 산자락까지의 거리. 왼쪽과 오른쪽이 들쭉날쭉하다.
    const up = axis - foot;
    const apron = axis > 66 ? (axis - 66) * 0.05 : 0; // 산자락 쪽으로 완만히 높아진다. 큰 홍수일수록 더 멀리 닿는다.
    const micro = (noise(i * 0.045, j * 0.045, 3) - 0.5) * 1.1 * smooth(CHANNEL + 3, CHANNEL + 26, dist[k]); // 낮은 기복. 물이 빠진 뒤 여기에 고인다.
    const mt = up > 0 ? 8 * smooth(0, 30, up) * (0.7 + 0.6 * noise(i * 0.03 + 50, j * 0.03, 3)) + up * 0.06 : 0;
    base[k] = zAtX(i) + apron + micro + mt;
    hill[k] = smooth(0, 5, up);
  }
  return { base, hill };
}

const cache = new Map();
function shared(seed) {
  if (!cache.has(seed)) {
    const geo = buildGeometry(seed);
    cache.set(seed, { geo, ...buildBase(seed, geo) });
  }
  return cache.get(seed);
}

// 단면 자리: 가운데 근처에서 강이 가장 곧게 옆으로 지나는 곳. A는 위쪽 산자락, B는 아래쪽 산자락이다.
function sectionSpot(path) {
  let best = -1, bv = Infinity;
  path.forEach((p, s) => { if (p.x > 92 && p.x < 164 && Math.abs(p.th) < bv) { bv = Math.abs(p.th); best = s; } });
  const x = Math.round(path[best].x);
  return { s: best, ax: x, ay: 12, bx: x, by: N - 13, riverAt: (path[best].y - 12) / (N - 25) };
}

// 홍수 시간표. 빈도가 달라도 전체 시간은 같다.
function buildSchedule(seed, opts) {
  const r = rng32(seed * 77 + 5), n = OPTIONS.freq[opts.freq], cycle = FLOODS_SECONDS / n, dam = OPTIONS.dam[opts.dam], out = [];
  for (let f = 0; f < n; f++) {
    const mult = PATTERN[f % PATTERN.length] * (0.985 + r() * 0.03);
    const held = mult < dam.hold; // 댐이 가둔 작은 홍수는 하도를 넘지 못하는 수위로 지나간다.
    out.push({ at: CALM_SECONDS + f * cycle, mult, held, peak: held ? LOW_STAGE + 0.5 : OPTIONS.size[opts.size] * mult * dam.stage, supply: mult * dam.supply, crest: CREST * dam.crest });
  }
  return out;
}

export function createModel(seed = 11) {
  const { geo, base, hill } = shared(seed);
  const { path, M, near, dist, side } = geo;
  const options = { size: 'mid', freq: 'mid', dam: 'no' };
  const section = sectionSpot(path);
  const zS = Float32Array.from(path, p => zAtX(p.x));
  const isCh = new Uint8Array(N * N), bankCells = [];
  for (let k = 0; k < N * N; k++) {
    if (dist[k] < CHANNEL) isCh[k] = 1;
    else if (dist[k] < CHANNEL + 1.5) bankCells.push(k);
  }
  const chCells = [];
  for (let k = 0; k < N * N; k++) if (isCh[k]) chCells.push(k);

  const h = new Float32Array(N * N), w = new Float32Array(N * N), ms = new Float32Array(N * N), mm = new Float32Array(N * N);
  const sand = new Float32Array(N * N), mud = new Float32Array(N * N), wet = new Uint8Array(N * N);
  const dw = new Float32Array(N * N), dms = new Float32Array(N * N), dmm = new Float32Array(N * N);
  const fx = new Float32Array(N * N), fy = new Float32Array(N * N), qx = new Float32Array(N * N), qy = new Float32Array(N * N), out = new Float32Array(N * N);
  const vx = new Float32Array(N * N), vy = new Float32Array(N * N), wStart = new Float32Array(N * N);
  const tb = new Float32Array(N * N), dtb = new Float32Array(N * N), hold = new Float32Array(N * N), sum = new Float64Array((N + 1) * (N + 1)), raised = new Float32Array(M);
  const mask = new Float32Array(N * N), stage = new Float32Array(M), bank = new Float32Array(M * 2), rawBank = new Float32Array(M * 2), rawCount = new Uint16Array(M * 2);
  const px = new Float32Array(PARTICLES), py = new Float32Array(PARTICLES), pState = new Uint8Array(PARTICLES), pAge = new Float32Array(PARTICLES);
  const pKind = Uint8Array.from({ length: PARTICLES }, (_, n) => n % 2); // 0 모래, 1 진흙
  const SETTLE_RATE = [SETTLE.sand, SETTLE.mud], NN = N * N;

  let rand, schedule, totalSteps, stepNo, layers, floodNo;
  const m = {
    N, h, w, ms, mm, sand, mud, wet, vx, vy, mask, stage, zS, near, dist, side, path, base, hill, isCh, section, options,
    px, py, pState, pKind, PARTICLES,
    clock: 0, finished: false, phase: 'calm', floodNo: -1, schedule: null, history: [], layers: null,
    overflowNow: 0, muddy: 0, flowPhase: 0, stats: null,
    // 칸의 물이 얼마나 흙탕인지(0 맑음, 1 흙탕). 새로 넘어온 물만 흙탕이고 시간이 지나면 옅어진다.
    turbidAt(k) { return w[k] > 0 ? smooth(0.05, 0.4, tb[k] / w[k]) : 0; },
    get totalSeconds() { return CALM_SECONDS + FLOODS_SECONDS + END_SECONDS; },
    reset() { init(); },
    setOption(name, val) { options[name] = String(val); },
    applyPreset(name) { Object.assign(options, PRESETS[name].options); init(); },
    tick(dt) {
      if (m.finished) return;
      m.clock += dt;
      const target = Math.min(totalSteps, Math.floor(m.clock * STEP_RATE + 1e-6));
      while (stepNo < target) step();
      if (stepNo >= totalSteps) { m.finished = true; m.phase = 'done'; m.clock = totalSteps / STEP_RATE; pState.fill(0); }
    },
    sample(x, y) {
      x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
      const i = x | 0, j = y | 0, u = x - i, v = y - j, k = idx(i, j);
      return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
    },
    spots() { return spots(); },
    // 단면의 t번째 점이 하도 안인지
    isChannelAtSection(t, samples) { const f = t / (samples - 1), S = section; return isCh[idx(Math.round(S.ax + (S.bx - S.ax) * f), Math.round(S.ay + (S.by - S.ay) * f))] === 1; },
    waterMask() { for (let k = 0; k < N * N; k++) mask[k] = isCh[k] ? (w[k] > 0 ? 1 : 0) : w[k] > 0.2 ? 1 : 0; return mask; },
    leveeOf(s0 = section.s) { return leveeAt(s0); },
  };

  function init() {
    rand = rng32(seed * 997 + 3);
    h.set(base); w.fill(0); ms.fill(0); mm.fill(0); tb.fill(0); dtb.fill(0); raised.fill(0); sand.fill(0); mud.fill(0); wet.fill(0); dw.fill(0); dms.fill(0); dmm.fill(0); vx.fill(0); vy.fill(0); fx.fill(0); fy.fill(0); wStart.fill(0); pState.fill(0); pAge.fill(0);
    for (let s = 0; s < M; s++) { bank[s * 2] = bank[s * 2 + 1] = zS[s]; stage[s] = zS[s] + LOW_STAGE; }
    for (const k of chCells) h[k] = channelBed(k);
    schedule = buildSchedule(seed, options);
    m.schedule = schedule;
    m.clock = 0; m.finished = false; m.phase = 'calm'; m.floodNo = -1; m.overflowNow = 0; m.muddy = 0; m.flowPhase = 0;
    m.history = schedule.map(f => ({ ...f, area: 0, volume: 0 }));
    layers = []; m.layers = layers;
    m.stats = { sandStops: 0, sandDist: 0, mudStops: 0, mudDist: 0, wetStops: 0, allStops: 0 };
    stepNo = 0; floodNo = -1;
    totalSteps = Math.round((CALM_SECONDS + FLOODS_SECONDS + END_SECONDS) * STEP_RATE);
    updateHold();
    waterChannel();
  }

  // 하도 칸의 높이: 양쪽 둑 높이에 맞춰 U자 모양을 이룬다. 둑이 오르면 바닥도 일부만큼 오른다.
  function channelBed(k) {
    const s = near[k], d = dist[k] / CHANNEL, bed = zS[s] - DEPTH + raised[s];
    const wall = d < 0.55 ? 0 : (d - 0.55) / 0.45; // 바닥은 평평하고 가장자리에서 둑까지 오른다.
    return bed + (bank[s * 2 + side[k]] - bed) * wall * Math.sqrt(wall);
  }

  // 지금 수위(처음 둑 높이 기준). 홍수 파도는 상류에서 하류로 내려간다. low는 그 자리의 평소 수위이고, 홍수 때 최고 수위는 시간표 그대로다.
  function rho(t, f, low) {
    const u = t - f.at;
    if (u <= 0) return low;
    const peak = f.held ? low + 0.5 : Math.max(f.peak, low + 0.5);
    if (u < RISE) return low + (peak - low) * smooth(0, 1, u / RISE);
    if (u < RISE + f.crest) return peak;
    if (u < RISE + f.crest + FALL) return peak + (low - peak) * smooth(0, 1, (u - RISE - f.crest) / FALL);
    return low;
  }

  const activeFlood = t => {
    let n = -1;
    for (let f = 0; f < schedule.length; f++) if (t >= schedule[f].at) n = f;
    return n;
  };

  function waterChannel() {
    const t = stepNo * DT, n = activeFlood(t), f = n >= 0 ? schedule[n] : null;
    for (let s = 0; s < M; s++) {
      const delay = (path[s].x + 16) / WAVE_SPEED;
      const low = LOW_STAGE + raised[s];
      stage[s] = zS[s] + (f ? rho(t - delay, f, low) : low);
    }
    const flooding = f && t - f.at < RISE + f.crest + FALL;
    const cs = flooding ? SUPPLY.sand * f.supply : 0, cm = flooding ? SUPPLY.mud * f.supply : 0;
    for (const k of chCells) {
      const d = Math.max(0, stage[near[k]] - h[k]);
      w[k] = d; ms[k] = d * cs; mm[k] = d * cm; tb[k] = flooding && !f.held ? d : 0;
    }
  }

  // 한 방향(stride 1은 가로, N은 세로)의 칸 사이 흐름을 새로 정한다. 수면 차이가 밀고 바닥 마찰이 줄인다.
  function pushWater(F, Q, stride) {
    const last = stride === 1 ? NN : NN - N;
    for (let k = 0; k < last; k++) {
      if (stride === 1 && k % N === N - 1) { Q[k] = 0; continue; }
      const o = k + stride, wk = w[k], wo = w[o];
      if (wk <= 0 && wo <= 0) { F[k] = 0; Q[k] = 0; continue; }
      const hk = h[k], ho = h[o], sk = hk + wk, so = ho + wo, avg = (wk + wo) / 2, diff = sk - so;
      const v = F[k] / (1 + DT * (DRAG + DRAG_SHALLOW / (avg + 0.1))) + PUSH * (avg < DEEP ? avg : DEEP) * diff * DT;
      // SPREAD는 칸마다 튀는 물결을 지운다. 물이 없는 칸에서는 나가지 못하고, 수면보다 높은 맨땅으로는 오르지 못한다.
      let q = v + SPREAD * diff;
      if (q > 0) { if (wk <= 0 || sk <= ho) { q = 0; F[k] = 0; } else { out[k] += q; F[k] = v; } }
      else if (q < 0) { if (wo <= 0 || so <= hk) { q = 0; F[k] = 0; } else { out[o] -= q; F[k] = v; } }
      else F[k] = 0;
      Q[k] = q;
    }
  }

  // 정해진 흐름대로 물과 입자를 옮긴다. 물과 함께 입자도 옮겨 간다. 하도에서 넘어온 물의 양을 돌려준다.
  function carry(Q, V, stride) {
    const last = stride === 1 ? NN : NN - N;
    let over = 0;
    for (let k = 0; k < last; k++) {
      const f = Q[k];
      if (f === 0) continue;
      const o = k + stride, up = f > 0 ? k : o, dn = f > 0 ? o : k, wu = w[up];
      if (wu <= 0) continue;
      const vol = (f > 0 ? f : -f) * out[up] * DT, frac = vol / wu;
      dw[up] -= vol; dw[dn] += vol;
      const a1 = ms[up] * frac, a2 = mm[up] * frac, a3 = tb[up] * frac;
      dms[up] -= a1; dms[dn] += a1; dmm[up] -= a2; dmm[dn] += a2; dtb[up] -= a3; dtb[dn] += a3;
      if (isCh[up] !== isCh[dn]) over += isCh[up] ? vol : -vol;
      const speed = frac * STEP_RATE * (f > 0 ? 0.5 : -0.5);
      V[k] += speed; V[o] += speed;
    }
    return over;
  }

  function step() {
    const t = stepNo * DT, n = activeFlood(t);
    if (n !== floodNo) { closeFlood(); floodNo = n; m.floodNo = n; wStart.set(w); }
    const f = n >= 0 ? schedule[n] : null, u = f ? t - f.at : 0;
    waterChannel();
    const crestEnd = f ? RISE + f.crest : 0, floodEnd = crestEnd + FALL;
    m.phase = !f ? 'calm' : u < RISE ? 'rise' : u < crestEnd ? 'crest' : u < floodEnd ? 'fall' : n === schedule.length - 1 ? 'last' : 'quiet';

    // 1. 칸 사이 물과 입자의 이동. 수면이 높은 칸에서 낮은 칸으로 물이 밀려간다. 바닥이 얕을수록 빨리 느려진다.
    dw.fill(0); dms.fill(0); dmm.fill(0); dtb.fill(0); vx.fill(0); vy.fill(0); out.fill(0);
    pushWater(fx, qx, 1);
    pushWater(fy, qy, N);
    for (let k = 0; k < NN; k++) {
      const v = out[k];
      if (v <= 0) continue;
      const lim = w[k] / (v * DT);
      out[k] = lim < 1 ? lim : 1; // 가진 물보다 많이 내보내지 않는다.
    }
    const over = carry(qx, vx, 1) + carry(qy, vy, N);
    m.overflowNow = over * STEP_RATE;
    const lowHere = LOW_STAGE + raised[section.s];
    m.muddy = f && u < floodEnd ? smooth(lowHere + 0.6, lowHere + 1.2, rho(t, f, lowHere)) : 0;
    m.flowPhase += DT * (0.03 + m.muddy * 0.05);
    if (f && u < floodEnd && over > 0) m.history[n].volume += over;

    // 2. 옮긴 값을 더하고, 입자를 가라앉혀 땅을 높인다. 물이 있는 칸에서만 쌓인다.
    const drainFast = 1 - DT / DRAIN_SECONDS, drainSlow = 1 - DT / POND_SECONDS, soak = 1 - DT / SOAK_SECONDS, edgeOut = 1 - DT / EDGE_SECONDS, seep = SEEP * DT;
    const clear = 1 - DT / (over * STEP_RATE > FLOWING ? CLEAR_FLOWING : CLEAR_QUIET);
    const sandRate = SETTLE.sand * DT, mudRate = SETTLE.mud * DT;
    for (let k = 0; k < N * N; k++) {
      if (isCh[k]) continue;
      if (w[k] <= 0 && dw[k] <= 0) continue;
      const inflow = w[k] + dw[k];
      let d = inflow;
      let s = ms[k] + dms[k], q = mm[k] + dmm[k], c = tb[k] + dtb[k];
      if (s < 0) s = 0;
      if (q < 0) q = 0;
      if (c < 0) c = 0;
      // 낮은 곳에 고이는 만큼(hold)은 남고, 그 위의 물만 빠진다.
      const keep = hold[k];
      if (d > keep) { const above = d - keep; d = keep + Math.max(0, above * (d > POND_DEPTH ? drainFast : drainSlow) - seep); } else d *= soak;
      // 물이 막 들어온 칸은 물이 있는 칸으로 남긴다. 그래야 물이 닿지 않은 칸에 쌓이는 일이 없다.
      if (dw[k] > 0 && d < WET) d = Math.min(inflow, WET);
      if (inflow > 0) c *= d / inflow;
      c *= clear;
      // 블록 오른쪽 끝: 물과 입자가 하류로 빠져나간다.
      if (k % N >= N - 2) { d *= edgeOut; s *= edgeOut; q *= edgeOut; c *= edgeOut; }
      if (d < WET && dw[k] <= 0) {
        // 물이 말랐다. 남은 입자는 모두 이 자리에 내려앉는다. 물이 들어온 적 없는 칸은 여기에 오지 않는다.
        sand[k] += s; mud[k] += q; h[k] += s + q;
        w[k] = 0; ms[k] = 0; mm[k] = 0; tb[k] = 0;
        continue;
      }
      wet[k] = 1;
      const deep = d < 0.4 ? 0.4 : d;
      // 빠른 물에서는 입자가 잘 멈추지 않는다. 하도를 벗어나 느려져야 가라앉는다.
      const sp2 = (vx[k] * vx[k] + vy[k] * vy[k]) / (FAST * FAST), calm = 1 / (1 + sp2);
      const xs = (sandRate * calm) / deep, xq = (mudRate * calm) / deep;
      const ds = (s * xs) / (1 + xs), dq = (q * xq) / (1 + xq);
      sand[k] += ds; mud[k] += dq; h[k] += ds + dq;
      w[k] = d; ms[k] = s - ds; mm[k] = q - dq; tb[k] = c;
    }

    // 3. 둑 높이를 하도 모양에 알려 준다(벽은 둑과 이어지고, 바닥과 평소 수위는 둑이 오른 만큼의 일부가 오른다).
    if (stepNo % 12 === 0) updateBanks();
    if (stepNo % STEP_RATE === 0) updateHold();

    // 4. 물과 함께 움직이는 표시용 알갱이. 멈추는 확률은 격자의 가라앉는 빠르기와 같은 식이다. 지형 계산에는 쓰지 않는다.
    moveParticles(n >= 0 && u < floodEnd, n >= 0 && u < crestEnd);

    // 5. 이번 홍수에 새로 잠긴 넓이
    if (f && stepNo % 6 === 0 && u < floodEnd + 0.5) {
      let area = 0;
      for (let k = 0; k < N * N; k++) if (!isCh[k] && w[k] - wStart[k] > 0.05) area++;
      // 하도에서 넘어온 물이 있을 때만 범람으로 친다. 앞선 홍수의 고인 물이 옮겨 간 것은 세지 않는다.
      if (m.history[n].volume > 20 && area > m.history[n].area) m.history[n].area = area;
    }
    stepNo++;
    if (stepNo >= totalSteps) closeFlood();
  }

  function updateBanks() {
    rawBank.fill(0); rawCount.fill(0);
    for (const k of bankCells) { const c = near[k] * 2 + side[k]; rawBank[c] += h[k]; rawCount[c]++; }
    for (let c = 0; c < 2; c++) for (let s = 0; s < M; s++) {
      let sum = 0, cnt = 0;
      for (let q = -5; q <= 5; q++) { const o = s + q; if (o < 0 || o >= M) continue; const e = o * 2 + c; if (rawCount[e]) { sum += rawBank[e] / rawCount[e]; cnt++; } }
      bank[s * 2 + c] = cnt ? sum / cnt : zS[s];
    }
    for (let s = 0; s < M; s++) {
      const r = BED_RISE * (Math.min(bank[s * 2], bank[s * 2 + 1]) - zS[s]);
      if (r > raised[s]) raised[s] = r;
    }
    for (const k of chCells) h[k] = channelBed(k);
  }

  // 칸마다 물이 고일 수 있는 깊이: 둘레 땅의 평균보다 낮은 만큼이다. 넓은 평균은 합 표로 구한다.
  function updateHold() {
    const W = N + 1;
    for (let j = 0; j < N; j++) {
      let row = 0;
      for (let i = 0; i < N; i++) { row += h[idx(i, j)]; sum[(j + 1) * W + i + 1] = sum[j * W + i + 1] + row; }
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = idx(i, j);
      if (isCh[k] || hill[k] > 0) { hold[k] = 0; continue; }
      const x0 = Math.max(0, i - HOLD_R), x1 = Math.min(N, i + HOLD_R + 1), y0 = Math.max(0, j - HOLD_R), y1 = Math.min(N, j + HOLD_R + 1);
      const mean = (sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0]) / ((x1 - x0) * (y1 - y0));
      const v = (mean - h[k] - HOLD_FROM) * HOLD_GAIN;
      hold[k] = v < 0 ? 0 : v > HOLD_MAX ? HOLD_MAX : v;
    }
  }

  function moveParticles(flooding, spawning) {
    if (spawning) {
      for (let t = 0; t < 10; t++) {
        const k = bankCells[Math.floor(rand() * bankCells.length)];
        // 물이 하도에서 그 칸으로 넘어오는 중일 때만 생긴다.
        if (w[k] < 0.08) { rand(); continue; }
        if (stage[near[k]] <= h[k]) { rand(); continue; }
        const free = Math.floor(rand() * PARTICLES);
        if (pState[free] === 1) continue;
        pState[free] = 1; pAge[free] = 0; px[free] = k % N; py[free] = (k / N) | 0;
      }
    }
    for (let p = 0; p < PARTICLES; p++) {
      if (pState[p] === 0) continue;
      if (pState[p] === 2) { pAge[p] += DT; if (pAge[p] > REST_SECONDS) pState[p] = 0; continue; }
      const i = clamp(Math.round(px[p]), 0, N - 1), j = clamp(Math.round(py[p]), 0, N - 1), k = idx(i, j);
      if (isCh[k] && pAge[p] > 0.2) { pState[p] = 0; continue; } // 하도로 돌아갔다.
      pAge[p] += DT;
      const calm = 1 / (1 + (vx[k] * vx[k] + vy[k] * vy[k]) / (FAST * FAST));
      const xp = (SETTLE_RATE[pKind[p]] * DT * calm) / Math.max(0.4, w[k]);
      // 홍수가 끝나고 물이 멈추면 떠 있던 알갱이는 곧 가라앉은 것으로 그린다(화면에 점이 남아 지형을 가리지 않게 한다).
      const still = !flooding && vx[k] * vx[k] + vy[k] * vy[k] < 0.25;
      const stop = w[k] < WET * 2 || rand() < (still ? 0.03 : xp / (1 + xp));
      if (stop) {
        pState[p] = 2; pAge[p] = 0;
        const st = m.stats;
        st.allStops++;
        if (wet[k]) st.wetStops++;
        if (pKind[p] === 0) { st.sandStops++; st.sandDist += dist[k]; } else { st.mudStops++; st.mudDist += dist[k]; }
        continue;
      }
      px[p] = clamp(px[p] + vx[k] * DT + (rand() - 0.5) * 0.14, 0, N - 1);
      py[p] = clamp(py[p] + vy[k] * DT + (rand() - 0.5) * 0.14, 0, N - 1);
    }
  }

  // 홍수 한 번이 끝날 때마다 단면의 층을 기록한다. 그림은 이 값을 그대로 쓴다.
  function closeFlood() {
    if (floodNo < 0) return;
    const rec = { n: floodNo, sand: new Float32Array(SECTION_SAMPLES), mud: new Float32Array(SECTION_SAMPLES) };
    for (let t = 0; t < SECTION_SAMPLES; t++) {
      const f = t / (SECTION_SAMPLES - 1), x = section.ax + (section.bx - section.ax) * f, y = section.ay + (section.by - section.ay) * f;
      rec.sand[t] = bilinear(sand, x, y); rec.mud[t] = bilinear(mud, x, y);
    }
    layers.push(rec);
  }
  function bilinear(a, x, y) {
    x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = idx(i, j);
    return a[k] * (1 - u) * (1 - v) + a[k + 1] * u * (1 - v) + a[k + N] * (1 - u) * v + a[k + N + 1] * u * v;
  }
  m.bilinear = bilinear;

  // 자리 s에서 강을 가로로 걸어 제방 꼭대기와 배후 습지의 높이를 잰다.
  function leveeAt(s0) {
    const p = path[s0], nx = -Math.sin(p.th), ny = Math.cos(p.th), out = [];
    for (const dir of [1, -1]) {
      let top = -Infinity, topD = 0, low = Infinity, lowD = 0;
      for (let d = CHANNEL + 1; d < 64; d += 1) {
        const x = p.x + nx * dir * d, y = p.y + ny * dir * d;
        if (x < 1 || y < 1 || x > N - 2 || y > N - 2) break;
        const v = m.sample(x, y) - zS[s0];
        if (d < 26 && v > top) { top = v; topD = d; }
        if (d > 26 && v < low) { low = v; lowD = d; }
      }
      out.push({ top, topD, low, lowD });
    }
    return out;
  }

  // 이름표 자리. 앞쪽(카메라 쪽, j가 큰 쪽) 강둑에서 고른다. 강은 언제나 오른쪽으로 흐르므로 법선의 + 방향이 앞쪽이다.
  function spots() {
    let s0 = 0;
    path.forEach((p, s) => { if (Math.abs(p.x - 140) < Math.abs(path[s0].x - 140)) s0 = s; });
    const at = (s, d) => { const p = path[s]; return { x: clamp(p.x - Math.sin(p.th) * d, 1, N - 2), y: clamp(p.y + Math.cos(p.th) * d, 1, N - 2) }; };
    const L = leveeAt(s0)[0];
    // 배후 습지 이름표: 앞쪽 강둑을 걸어 진흙이 모래보다 훨씬 많은 첫 칸부터 30칸 안에서 가장 낮은 곳. 거기가 실제로 진흙이 쌓인 낮은 땅이다.
    let swampD = L.lowD, from = 0;
    for (let d = CHANNEL + 2; d < 92; d++) {
      const q = at(s0, d), k = idx(Math.round(q.x), Math.round(q.y));
      if (hill[k] > 0) break;
      if (!from && mud[k] > 3 * sand[k] && mud[k] > 0.05) { from = d; swampD = d; }
      if (from && d < from + 30 && m.sample(q.x, q.y) < m.sample(at(s0, swampD).x, at(s0, swampD).y)) swampD = d;
    }
    // 넘친 물 이름표: 앞쪽 강둑에서 지금 실제로 물이 있는 가장 먼 칸을 찾는다.
    const s1 = Math.min(M - 1, s0 + 40);
    let flood = null;
    const wetAt = q => w[idx(Math.round(q.x), Math.round(q.y))] > 0.25;
    for (let d = 70; d > CHANNEL + 4 && !flood; d -= 2) if (wetAt(at(s1, d))) flood = wetAt(at(s1, d * 0.7)) ? at(s1, d * 0.7) : at(s1, d);
    let down = path[M - 1];
    for (let s = M - 1; s >= 0; s--) if (path[s].x <= N - 3) { down = path[s]; break; }
    return {
      river: path[Math.max(0, s0 - 62)],
      levee: at(s0, L.topD),
      swamp: at(s0, swampD),
      leveeRise: L.top - L.low,
      plain: at(s0, 34),
      flood,
      up: path.find(a => a.x >= 2),
      down,
    };
  }

  init();
  return m;
}

const NOTES = {
  calm: '평소에는 물이 하도 안에서만 흐릅니다. 양쪽은 아직 아무것도 쌓이지 않은 평평한 골짜기 바닥입니다.',
  rise: '홍수가 시작되어 하도의 물이 불어납니다. 황토색 물에는 모래와 진흙이 섞여 있습니다.',
  over: '물이 하도를 넘쳐 양쪽 평지로 퍼져 나갑니다. 넘친 물은 넓게 퍼지며 느려져 무거운 모래부터 하도 가까이에 내려앉습니다. 고운 진흙은 물에 실려 멀리까지 갑니다.',
  blocked: '이번 홍수는 둑을 넘지 못하고 하도 안에서 지나갑니다. 자연 제방이 높아져 작은 홍수는 넘치지 못합니다. 물이 닿지 않은 곳에는 아무것도 쌓이지 않습니다.',
  held: '댐이 물을 가두어 이번 홍수는 수위가 낮습니다. 둑을 넘지 못하고 하도 안에서 지나갑니다. 물이 닿지 않은 곳에는 아무것도 쌓이지 않습니다.',
  quietFirst: '넘친 물이 빠지는 중입니다. 대부분 빠지면 강에서 떨어진 낮은 곳에만 남습니다. 물이 닿은 곳은 쌓인 만큼 땅이 높아졌고, 하도 바닥도 조금씩 쌓여 올라갑니다.',
  quiet: '넘친 물이 빠지는 중입니다. 대부분 빠지면 제방 뒤 낮은 배후 습지에만 남습니다. 물이 닿은 곳은 쌓인 만큼 땅이 높아졌고, 하도 바닥도 조금씩 쌓여 올라갑니다.',
  quietNone: '이번 홍수는 넘치지 않아 새로 쌓인 것이 없습니다. 앞선 홍수 때 낮은 곳에 고인 물만 천천히 줄어듭니다.',
};
// 넘쳤다고 치는 물의 양. 둑 위를 살짝 적신 정도는 넘친 것으로 치지 않는다.
const OVERFLOWED = 300;
const POND_NAMED = 300; // 이만큼 넘는 칸에 물이 고여 있어야 고여 있다고 쓴다.

// 지금 보여 줄 글의 종류. 원인(댐, 제방, 넘친 양)을 시간표와 기록에서 읽어 고른다.
export function noteKey(m) {
  if (m.finished) return 'done';
  if (m.phase === 'calm') return 'calm';
  const f = m.history[m.floodNo], flowed = f.volume > OVERFLOWED;
  if (f.held) return m.phase === 'quiet' || m.phase === 'last' ? 'quietNone' : 'held';
  if (m.phase === 'rise') return m.overflowNow > FLOWING ? 'over' : 'rise';
  if (m.phase === 'crest' || m.phase === 'fall') return flowed || m.overflowNow > FLOWING ? 'over' : 'blocked';
  if (!flowed) return 'quietNone';
  const L = m.leveeOf()[0];
  return L.top - L.low < LEVEE_NAMED ? 'quietFirst' : 'quiet';
}

function doneText(m) {
  const o = m.options, parts = ['범람원이 완성되었습니다.'];
  if (o.dam === 'yes') parts.push('댐이 있으면 홍수와 토사가 줄어 제방이 덜 자랍니다. 이미 있던 제방이 낮아지는 것은 아닙니다.');
  else parts.push('하도 양옆에는 모래가 많은 자연 제방이 높고, 그 뒤쪽에는 진흙이 얇게 쌓인 낮은 배후 습지가 있습니다.');
  if (o.size === 'low') parts.push('작은 홍수만 지나가 제방이 낮습니다.');
  if (o.size === 'high') parts.push('큰 홍수가 지나가 제방이 더 높고 진흙이 더 멀리까지 갔습니다.');
  if (o.freq === 'low') parts.push('홍수가 드물어 쌓인 양이 적습니다.');
  if (o.freq === 'high') parts.push('홍수가 잦아 쌓인 양이 많습니다.');
  let ponds = 0;
  for (let k = 0; k < N * N; k++) if (m.hill[k] === 0 && !m.isCh[k] && m.w[k] > 0.1) ponds++;
  if (ponds > POND_NAMED) parts.push('낮은 곳에는 물이 고여 있습니다.');
  return parts.join(' ');
}

export const noteText = m => (m.finished ? doneText(m) : NOTES[noteKey(m)]);

// 두 조건을 나란히 볼 때의 짧은 말. 값을 숫자로 쓰지 않고 높다, 낮다만 말한다.
const stateText = m => {
  if (m.floodNo < 0) return '아직 홍수 전입니다';
  return m.overflowNow > FLOWING ? '물이 넘치는 중입니다' : '물이 하도 안에 있습니다';
};
export function compareBrief(a, b) {
  if (!a.finished || !b.finished) return { a: stateText(a), b: stateText(b) };
  const gap = m => { const L = m.leveeOf()[0]; return L.top - L.low; }, ga = gap(a), gb = gap(b);
  const say = (x, y) => (x === y ? '완성되었고 제방 높이가 같습니다' : `완성되었고 제방이 ${x > y ? '더 높습니다' : '더 낮습니다'}`);
  return { a: say(ga, gb), b: say(gb, ga) };
}

// 단면 자료: 칸의 층을 그대로 읽는다. layers는 홍수마다 그때까지 쌓인 모래와 진흙 두께다.
export function sectionProfile(m, samples = SECTION_SAMPLES) {
  const S = m.section, base = new Float32Array(samples), top = new Float32Array(samples), water = new Float32Array(samples), sand = new Float32Array(samples), mud = new Float32Array(samples), turbid = new Float32Array(samples);
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), x = S.ax + (S.bx - S.ax) * f, y = S.ay + (S.by - S.ay) * f;
    base[t] = m.bilinear(m.base, x, y);
    top[t] = m.bilinear(m.h, x, y);
    water[t] = m.bilinear(m.w, x, y);
    sand[t] = m.bilinear(m.sand, x, y);
    mud[t] = m.bilinear(m.mud, x, y);
    turbid[t] = m.turbidAt(Math.round(y) * N + Math.round(x));
  }
  return { base, top, water, sand, mud, turbid, layers: m.layers };
}
