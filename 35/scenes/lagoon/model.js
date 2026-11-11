// © 2026 김용현
// 사빈, 사주, 석호 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 빙기에 하천이 판 골짜기가 후빙기 해수면 상승으로 바다에 잠겨 만이 된다. 해수면이 거의 멈춘 뒤, 비스듬히 들어오는 파랑이 만든 연안류가 모래를 해안을 따라 옮긴다.
// 모래는 만 입구의 한쪽 끝에서 사취로 이어 쌓인다. 사취 끝을 한 칸 늘리려면 그 자리의 물을 바닥부터 메워야 하므로 깊은 곳일수록 모래가 많이 든다.
// 사취가 건너편에 닿으면 사주가 되고 안쪽 물은 석호가 된다. 그 뒤 석호로 드는 하천이 토사를 쌓아 석호를 메운다. 사빈의 마른 모래는 바닷바람에 날려 해안사구가 된다.
// 지형 계산에는 사칙연산과 내림, 제곱근만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 256;
export const ROUND = 0.1;
export const T_END = 110;
export const SEA_LOW = -6.5; // 빙기의 해수면
export const RISE = [6, 32]; // 해수면이 오르는 때(초)
export const COAST = 150; // 오늘날 해안선 줄(만 밖)
export const MOUTH = { x0: 95, x1: 161 }; // 만 입구의 왼쪽 끝과 오른쪽 끝
export const RIVER_X = 128; // 골짜기의 가운데 줄
export const BAR = { half: 3, crest: 0.7, beach: 0.25 }; // 사주의 반폭과 높이
export const DUNE_TOP = 2.1;
const FILL_SIDE = 0.06; // 하천 줄기에서 옆으로 갈수록 늦게 메워지는 정도
export const RAYS = 80;
export const RAY_STEPS = 260;
const RAY_DT = 0.9;
const FULL_DEPTH = 7;
const SAND_K = 195; // 연안류가 1초에 실어 오는 모래(보통). 교과서 조건에서 해수면이 멈추고 약 30초 뒤 입구가 막히도록 정했다.
const RIVER_K = 30; // 하천이 1초에 실어 오는 토사(보통)
const WAVE_DIR = [-0.5, -0.866]; // 먼바다 파랑의 진행 방향(오른쪽 아래에서 왼쪽 위로)

export const SAND = {
  low: { name: '적음', rate: 0.25 },
  mid: { name: '보통', rate: 1 },
  high: { name: '많음', rate: 1.6 },
};
export const RIVER = {
  low: { name: '적음', rate: 0.4 },
  mid: { name: '보통', rate: 1 },
  high: { name: '많음', rate: 2.4 },
};
export const RISE_OPT = {
  yes: { name: '있음' },
  no: { name: '없음' },
};
export const PRESETS = {
  east: { sand: 'mid', river: 'mid', rise: 'yes' },
  lowSand: { sand: 'low', river: 'mid', rise: 'yes' },
  muddy: { sand: 'mid', river: 'high', rise: 'yes' },
  noRise: { sand: 'mid', river: 'mid', rise: 'no' },
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

// 골짜기의 반폭: 바다 쪽으로 넓어진다. 만 입구에서 MOUTH의 폭과 맞는다.
export function valleyHalf(j) { return 10 + 19 * smooth(30, COAST, j); }
// 골짜기 바닥: 육지에서는 완만하고, 오늘날 해안선 밖 대륙붕에서는 빙기의 하천이 더 깊게 팠다.
export function valleyFloor(j, rise = true) {
  if (!rise) return Math.max(0.12, 1.6 - 0.012 * j) - (j > COAST ? 0.05 * (j - COAST) : 0);
  return j <= COAST ? 2.2 - 0.0275 * j : 2.2 - 0.0275 * COAST - 0.07 * (j - COAST);
}
// 사주가 놓이는 줄: 두 곶 끝을 잇고 바다 쪽으로 조금 볼록하다.
export function barRow(x) { const u = (x - (MOUTH.x0 + MOUTH.x1) / 2) / ((MOUTH.x1 - MOUTH.x0) / 2); return COAST + 3 + 2.5 * (1 - u * u); }
// 해수면 높이(초). 오르는 동안은 처음에 빠르고 끝에 느려진다.
export function seaAt(t, rise = true) {
  if (!rise) return 0;
  const f = clamp((t - RISE[0]) / (RISE[1] - RISE[0])), g = 1 - (1 - f) * (1 - f) * (1 - f);
  return SEA_LOW * (1 - g) + 0; // -0이 되지 않게 0을 더한다.
}

export function createModel(seed = 11) {
  const size = N * N;
  const h = new Float32Array(size), start = new Float32Array(size), sand = new Float32Array(size), dune = new Float32Array(size), fill = new Float32Array(size), bath = new Float32Array(size), tmp = new Float32Array(size);
  const kind = new Uint8Array(size), isBar = new Uint8Array(size), lagoon = new Uint8Array(size), river = new Uint8Array(size), seen = new Uint8Array(size), dirtyFlag = new Uint8Array(size), dirtyList = new Int32Array(size), order = new Int32Array(size);
  const rayX = new Float32Array(RAYS * RAY_STEPS), rayY = new Float32Array(RAYS * RAY_STEPS), rayLen = new Uint16Array(RAYS);
  const front = new Int32Array(N);
  const TRAILS = 36, TRAIL_PTS = 14;
  const trailX = new Float32Array(TRAILS * TRAIL_PTS), trailY = new Float32Array(TRAILS * TRAIL_PTS), trailAge = new Float32Array(TRAILS), trailLen = new Uint8Array(TRAILS);

  const m = {
    h, start, sand, dune, fill, isBar, lagoon, river, front, rayX, rayY, rayLen, RAYS, RAY_STEPS, seed, dirtyList, dirtyCount: 0, allDirty: true,
    TRAILS, TRAIL_PTS, trailX, trailY, trailAge, trailLen, options: { ...PRESETS.east }, clock: 0, sea: SEA_LOW, finished: false,
  };
  let acc = 0, roundNo = 0, rng, sandRate = 1, riverRate = 1, trailNext = 0, store = 0, orderLen = 0;
  const touch = k => { if (!dirtyFlag[k]) { dirtyFlag[k] = 1; dirtyList[m.dirtyCount++] = k; } };
  m.consumeDirty = () => { for (let i = 0; i < m.dirtyCount; i++) dirtyFlag[dirtyList[i]] = 0; const c = m.dirtyCount; m.dirtyCount = 0; return c; };
  const rising = () => m.options.rise === 'yes';

  // 처음 땅: 해안 단구처럼 바다 쪽으로 기운 바닥, 양쪽 언덕, 가운데의 하천 골짜기
  function buildBase() {
    const hill = makeNoise(seed + 5, 26), fine = makeNoise(seed + 9, 6), wig = makeNoise(seed + 2, 18);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, coast = COAST + (wig(i, j) - 0.5) * 6, off = j - coast;
      // 땅과 바닥의 바탕: 해안선에서 바다 쪽으로 완만히 깊어지는 대륙붕, 육지 쪽으로 오르는 언덕
      let v = off > 0 ? -0.15 - 0.06 * off : 0.3 + clamp(-off / 14) * (2.2 + hill(i, j) * 4.5) + clamp(-off / 70) * 4;
      // 하천 골짜기: 빙기의 낮은 해수면까지 파 내려간 골짜기. 해수면 상승이 없으면 오늘날 해수면에 맞춰 채워져 있다.
      const half = valleyHalf(j) + (wig(i + 40, j) - 0.5) * 3, d = Math.abs(i - RIVER_X - (wig(j, 7) - 0.5) * 4) / half;
      if (d < 1.15) {
        // 바닥은 넓고 평평하며, 골짜기 가장자리에서 둘레 땅 높이로 가파르게 오른다.
        const floor = valleyFloor(j, rising()), inner = floor + 0.5 * (d < 1 ? d * d : 1);
        const wall = d < 1 ? inner : inner + (v - inner) * smooth(1, 1.15, d);
        if (wall < v) v = wall;
      }
      v += (fine(i, j) - 0.5) * 0.12;
      start[k] = v; h[k] = v;
    }
  }

  function buildBath() {
    for (let k = 0; k < size; k++) { const d = m.sea - h[k]; bath[k] = d < 0 ? 0 : d > FULL_DEPTH ? FULL_DEPTH : d; }
    const R = 4, W = 2 * R + 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < N; j++) { let s = 0; for (let i = -R; i <= R; i++) s += bath[j * N + clamp(i, 0, N - 1)]; for (let i = 0; i < N; i++) { tmp[j * N + i] = s / W; s += bath[j * N + clamp(i + R + 1, 0, N - 1)] - bath[j * N + clamp(i - R, 0, N - 1)]; } }
      for (let i = 0; i < N; i++) { let s = 0; for (let j = -R; j <= R; j++) s += tmp[clamp(j, 0, N - 1) * N + i]; for (let j = 0; j < N; j++) { bath[j * N + i] = s / W; s += tmp[clamp(j + R + 1, 0, N - 1) * N + i] - tmp[clamp(j - R, 0, N - 1) * N + i]; } }
    }
  }
  const depthAt = (x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (bath[k] * (1 - a) + bath[k + 1] * a) * (1 - b) + (bath[k + N] * (1 - a) + bath[k + N + 1] * a) * b;
  };
  const speed = d => Math.sqrt(d < 0.05 ? 0.05 : d);

  // 비스듬히 들어오는 파랑의 진행 방향선. 얕아지면 해안선 쪽으로 굽는다. 해안에 닿을 때의 방향으로 연안류의 세기와 방향을 정한다.
  function traceRays() {
    let drift = 0, cnt = 0;
    // 모든 선은 블록 오른쪽 아래 바깥의 한 파봉선 위에서 같은 때 출발한다. 그래서 같은 번호의 점을 이으면 파봉선이 된다.
    const cx = -WAVE_DIR[1], cy = WAVE_DIR[0], S0 = -225, S1 = 132, gap = (S1 - S0) / (RAYS - 1);
    for (let r = 0; r < RAYS; r++) {
      let x = N - 1 + (S0 + r * gap) * cx, y = N - 1 + (S0 + r * gap) * cy, ux = WAVE_DIR[0], uy = WAVE_DIR[1], n = 0;
      const base = r * RAY_STEPS;
      for (let s = 0; s < RAY_STEPS; s++) {
        rayX[base + s] = x; rayY[base + s] = y; n = s + 1;
        if (s + 1 >= RAY_STEPS) break;
        const d = depthAt(x, y), c = speed(d);
        const nx = -uy, ny = ux, cl = speed(depthAt(x + nx * 2.5, y + ny * 2.5)), cr = speed(depthAt(x - nx * 2.5, y - ny * 2.5)), bend = ((cl - cr) / 5) * c * RAY_DT * 0.5;
        ux -= nx * bend; uy -= ny * bend;
        const l = Math.sqrt(ux * ux + uy * uy); ux /= l; uy /= l;
        x += ux * c * RAY_DT; y += uy * c * RAY_DT;
        // 블록 밖(오른쪽과 아래)에서는 들어올 때까지 따라가고, 왼쪽이나 위로 나가면 멈춘다.
        if (x < 1 || y < 1) break;
        if (x > N - 2 || y > N - 2) continue;
        const k = Math.round(y) * N + Math.round(x);
        if (h[k] >= m.sea) {
          rayX[base + n] = x; rayY[base + n] = y; n++;
          // 만 밖 오른쪽의 곧은 해안에 닿은 선만 모은다. 해안선이 가로이므로 2 ux uy가 연안류의 세기에 비례하고, 양수면 왼쪽으로 흐른다.
          if (x > MOUTH.x1 + 8 && x < N - 12) { drift += 2 * ux * uy; cnt++; }
          break;
        }
      }
      rayLen[r] = n;
    }
    m.drift = cnt ? drift / cnt : 0;
  }

  function updateFront() {
    for (let i = 0; i < N; i++) {
      let j = 0;
      while (j < N - 1 && (h[j * N + i] >= m.sea || lagoon[j * N + i] || inBay(i, j))) j++;
      front[i] = j;
    }
  }
  // 만 안의 물(입구 줄보다 육지 쪽, 골짜기 안)
  const inBay = (i, j) => i > MOUTH.x0 && i < MOUTH.x1 && j < barRow(i) && h[j * N + i] < m.sea;

  // 하천: 골짜기의 가장 낮은 줄을 따라 물가까지 흐른다.
  function updateRiver() {
    river.fill(0); m.riverMouth = null; m.headCell = -1;
    let x = RIVER_X;
    for (let j = 0; j < N - 1; j++) {
      let best = x, bv = 1e9;
      for (let i = x - 3; i <= x + 3; i++) { const v = start[j * N + i] + Math.abs(i - x) * 0.02; if (v < bv) { bv = v; best = i; } }
      x = best;
      const k = j * N + x;
      if (m.headCell < 0 && start[k] < m.sea) m.headCell = k;
      if (h[k] < m.sea) { m.riverMouth = { x, y: j }; break; }
      for (let a = -1; a <= 1; a++) river[k + a] = 1;
    }
  }

  // 사취: 만 입구 오른쪽 끝에서 왼쪽으로 한 칸씩 자란다. 칸마다 그 줄의 단면을 정한 높이까지 메운다.
  const barTop = b => { const t = Math.abs(b) / BAR.half; return BAR.crest - (BAR.crest - BAR.beach) * t * t; };
  function columnNeed(x) {
    const r = barRow(x);
    let need = 0;
    for (let b = -BAR.half; b <= BAR.half; b++) {
      const j = Math.round(r + b), k = j * N + x, top = m.sea + barTop(b);
      if (h[k] < top) need += top - h[k];
    }
    // 바다 쪽 비탈: 사주 앞도 물속에서 떠받쳐야 한다.
    for (let b = BAR.half + 1; b <= BAR.half + 5; b++) {
      const j = Math.round(r + b), k = j * N + x, top = m.sea + BAR.beach - 0.35 * (b - BAR.half);
      if (h[k] < top) need += top - h[k];
    }
    return need;
  }
  function buildColumn(x) {
    const r = barRow(x);
    for (let b = -BAR.half; b <= BAR.half + 5; b++) {
      const j = Math.round(r + b), k = j * N + x;
      const top = b <= BAR.half ? m.sea + barTop(b) : m.sea + BAR.beach - 0.35 * (b - BAR.half);
      if (h[k] < top) { sand[k] += top - h[k]; h[k] = top; touch(k); }
      if (b <= BAR.half) isBar[k] = 1;
    }
  }

  // 사주의 두 끝: 입구 양쪽에서 사주가 놓일 줄이 모두 땅인 첫 칸. 사취는 오른쪽 끝에서 출발해 왼쪽 끝에 닿으면 입구를 막는다.
  // 사주 줄 바로 뒤(육지 쪽)에 만의 물이 있으면 아직 입구다.
  const wet = x => { const r = Math.round(COAST + 3); for (let j = r - 12; j <= r - 4; j++) if (h[j * N + x] < m.sea) return true; return false; };
  function setEnds() {
    let a = RIVER_X; while (a < N - 2 && wet(a)) a++;
    let b = RIVER_X; while (b > 1 && wet(b)) b--;
    // 사취의 뿌리는 곶에 붙어 있다. 뿌리 칸은 처음부터 만들어 둔다.
    for (let x = a; x <= a + 2; x++) buildColumn(x);
    m.spit.tip = a; m.spit.end = b - 2; m.spit.width = a - 1 - m.spit.end;
  }

  // 연안류가 실어 오는 모래. 일부는 오른쪽 해안의 사빈을 넓히고, 나머지는 사취 끝으로 간다.
  function feedSand() {
    const q = sandRate * clamp(m.drift / 0.6, 0.3, 1.5) * SAND_K * ROUND;
    m.supplied += q;
    const spit = m.spit;
    if (!m.hasBay) { beachGrow(q * 0.18, 6, N - 6); if (roundNo % 3 === 0) emitTrail(); return; }
    if (!spit.closed) {
      store += q * 0.82; // 나머지는 사빈을 넓히거나 사취를 지나 블록 밖으로 옮겨 간다.
      beachGrow(q * 0.1, MOUTH.x1 + 6, N - 6);
      // 칸을 다 메울 만큼 모이면 한 칸 자란다.
      while (!spit.closed) {
        const x = spit.tip - 1, need = columnNeed(x);
        if (store < need) { spit.needNext = need; break; }
        store -= need; m.used += need;
        buildColumn(x); spit.tip = x;
        if (spit.tip - 1 <= spit.end) {
          // 정말 막혔는지 물길로 확인한다. 아직 바다와 이어져 있으면 한 칸 더 자라야 한다.
          closeLagoon();
          if (m.lagoonStart > m.bayArea * 0.3 || spit.end < 4) { spit.closed = true; spit.closedAt = m.clock; }
          else { lagoon.fill(0); m.lagoonStart = 0; spit.end--; }
        }
      }
    } else {
      // 막힌 뒤의 모래는 사주 바깥의 사빈을 넓히고 만 밖 해안으로도 이어진다.
      // 나머지는 해안을 따라 블록 밖으로 옮겨 간다.
      beachGrow(q * 0.08, MOUTH.x0 + 2, MOUTH.x1 - 2);
      beachGrow(q * 0.14, 6, N - 6);
    }
    if (roundNo % 3 === 0) emitTrail();
  }
  // 해안선 앞에 모래를 붙인다. 파랑이 고르게 펴서 사빈이 된다.
  function beachGrow(amount, x0, x1) {
    const per = amount / (x1 - x0 + 1);
    for (let i = x0; i <= x1; i++) {
      let left = per;
      const j = front[i];
      // 경사가 완만해 물가에서 바다 쪽으로 여러 칸이 물 위로 드러난다.
      for (let b = 0; b < 12 && left > 0; b++) {
        const jj = j + b; if (jj >= N - 1) break;
        const k = jj * N + i, top = m.sea + 0.4 - b * 0.07;
        if (h[k] >= top) continue;
        const add = Math.min(left, (top - h[k]) * 0.3 + 0.004);
        h[k] += add; sand[k] += add; left -= add; touch(k);
      }
    }
  }
  function emitTrail() {
    // 오른쪽 해안에서 사취 끝(막힌 뒤에는 사주 앞)으로 가는 모래 알갱이. 그리기 전용이다.
    const to = m.spit.closed ? MOUTH.x0 + 10 + rng() * 40 : m.spit.tip + 2, from = Math.min(N - 8, to + 50 + rng() * 40);
    const slot = trailNext, at = slot * TRAIL_PTS;
    trailNext = (trailNext + 1) % TRAILS;
    for (let q = 0; q < TRAIL_PTS; q++) {
      const f = q / (TRAIL_PTS - 1), gx = from + (to - from) * f, i = clamp(Math.round(gx), 0, N - 1);
      trailX[at + q] = gx; trailY[at + q] = (i > MOUTH.x0 && i < MOUTH.x1 ? barRow(i) + BAR.half + 2.5 : front[i] + 2.5);
    }
    trailLen[slot] = TRAIL_PTS; trailAge[slot] = 0;
  }

  // 사주 안쪽의 물을 석호로 표시한다. 바다와 이어지지 않은 물이다.
  function closeLagoon() {
    seen.fill(0);
    const list = [];
    for (let i = 0; i < N; i++) { const k = (N - 1) * N + i; if (h[k] < m.sea) { seen[k] = 1; list.push(k); } }
    for (let t = 0; t < list.length; t++) {
      const c = list[t];
      for (const o of [c - 1, c + 1, c - N, c + N]) if (o >= 0 && o < size && !seen[o] && h[o] < m.sea) { seen[o] = 1; list.push(o); }
    }
    let area = 0;
    for (let k = 0; k < size; k++) if (h[k] < m.sea && !seen[k]) { lagoon[k] = 1; area++; touch(k); }
    m.lagoonStart = area;
  }

  // 하천 토사: 하구에서 가까운 물부터 메운다. 물이 고인 만이나 석호에서는 흐름이 느려져 토사가 쌓인다.
  // 흙은 물길을 따라 실려 가므로 하천 줄기 앞쪽이 먼저 메워지고 양옆 물가는 늦게 메워진다. 그래서 메워진 땅이 하천을 따라 혀처럼 뻗는다.
  // 차례 = 안쪽 끝에서 내려온 거리 + 하천 줄기에서 옆으로 떨어진 거리의 제곱에 비례하는 값.
  function rebuildOrder() {
    orderLen = 0;
    const k0 = m.headCell;
    if (k0 < 0) return;
    seen.fill(0);
    order[orderLen++] = k0; seen[k0] = 1;
    for (let t = 0; t < orderLen; t++) {
      const c = order[t], i = c % N;
      for (const o of [c + N, c - 1, c + 1, c - N]) {
        if (o < 0 || o >= size || seen[o]) continue;
        const oi = o % N, oj = (o / N) | 0;
        if (Math.abs(oi - i) > 1 || start[o] >= m.sea) continue;
        // 만이나 석호 안에서만 쌓는다. 사주 너머 바다로 나간 흙은 바다에 흩어진다.
        if (oi <= MOUTH.x0 || oi >= MOUTH.x1 || oj >= barRow(oi) - BAR.half) continue;
        seen[o] = 1; order[orderLen++] = o;
      }
    }
    const i0 = k0 % N, j0 = (k0 / N) | 0;
    const score = k => { const dx = (k % N) - i0; return ((k / N) | 0) - j0 + FILL_SIDE * dx * dx; };
    const sorted = Array.from(order.subarray(0, orderLen)).sort((a, b) => score(a) - score(b) || a - b);
    order.set(sorted);
  }
  function feedRiver() {
    let left = riverRate * RIVER_K * ROUND;
    m.riverIn += left;
    for (let t = 0; t < orderLen && left > 0; t++) {
      const k = order[t], top = m.sea + 0.06;
      if (h[k] >= top) continue;
      const add = Math.min(left, (top - h[k]) * 0.5 + 0.01);
      h[k] += add; fill[k] += add; left -= add; touch(k);
      if (h[k] >= m.sea && lagoon[k]) lagoon[k] = 0;
    }
  }

  // 해안사구: 사빈의 마른 모래가 바닷바람에 날려 사빈 뒤에 쌓인다. 사빈이 넓을수록 잘 자란다.
  function growDunes() {
    for (let i = 4; i < N - 4; i++) {
      const fr = front[i];
      // 사빈 폭: 물가에서 육지 쪽으로 모래 칸이 이어진 길이
      let w = 0;
      while (w < 16 && fr - 1 - w > 0 && sand[(fr - 1 - w) * N + i] > 0.05) w++;
      if (w < 3) continue;
      const rate = 0.0045 * (w - 2) * sandRate;
      // 물가에서 5칸까지는 파도가 닿는 사빈으로 남기고, 그 뒤에 사구가 쌓인다.
      for (let b = 6; b <= 14; b++) {
        const j = fr - b, k = j * N + i;
        if (j < 1 || h[k] < m.sea) continue;
        // 석호 바로 옆까지는 쌓지 않는다.
        if (lagoon[k - N] || lagoon[k - 2 * N]) continue;
        const top = m.sea + DUNE_TOP * (1 - Math.abs(b - 10) / 5);
        if (h[k] >= top) continue;
        h[k] += rate; dune[k] += rate; touch(k);
      }
    }
  }

  function round() {
    m.clock += ROUND; roundNo++;
    const prev = m.sea;
    m.sea = seaAt(m.clock, rising());
    if (m.sea !== prev && roundNo % 5 === 0) { m.allDirty = true; updateRiver(); updateFront(); }
    if (roundNo % 10 === 1) { buildBath(); traceRays(); updateFront(); updateRiver(); rebuildOrder(); }
    const stable = m.clock >= RISE[1] || !rising();
    // 해수면이 멈췄을 때 만이 있는지 본다. 만이 없으면 사취가 자랄 곳이 없다.
    if (stable && m.hasBay === null) { let a = 0; for (let j = 40; j < COAST; j++) for (let i = MOUTH.x0; i <= MOUTH.x1; i++) if (inBay(i, j)) a++; m.hasBay = a > 300; m.bayArea = a; if (m.hasBay) setEnds(); }
    if (stable) feedSand();
    // 만이 없으면 토사가 쌓일 고인 물이 없어 바다로 흩어진다.
    if (roundNo % 2 === 0 && rising()) feedRiver();
    if (stable && roundNo % 2 === 0) growDunes();
    for (let t = 0; t < TRAILS; t++) trailAge[t] += ROUND;
    if (m.clock >= T_END - 1e-9) { m.finished = true; trailLen.fill(0); buildBath(); traceRays(); updateFront(); updateRiver(); }
  }

  // 석호의 넓이(칸 수)
  m.lagoonArea = () => { let a = 0; for (let k = 0; k < size; k++) if (lagoon[k] && h[k] < m.sea) a++; return a; };
  // 만 입구 가운데의 수심
  m.mouthDepth = () => m.sea - start[Math.round(barRow(RIVER_X)) * N + RIVER_X];
  // 남은 입구 폭(칸)
  m.gap = () => (m.spit.closed ? 0 : m.spit.tip - 1 - m.spit.end);
  // 열린 입구가 처음 입구 폭의 몇 %인가
  m.gapPercent = () => Math.round((m.gap() / Math.max(1, m.spit.width ?? 1)) * 100);
  // 입구를 다 막는 데 앞으로 드는 모래(남은 칸의 필요량 합)
  m.needLeft = () => { if (m.spit.closed) return 0; let s = 0; for (let x = m.spit.tip - 1; x > m.spit.end; x--) s += columnNeed(x); return Math.max(0, s - store); };
  // 해수면이 멈춘 뒤 끝날 때까지 들어올 모래(사취로 가는 몫)
  m.supplyLeft = () => { const t = Math.max(0, T_END - Math.max(m.clock, rising() ? RISE[1] : 0)); return sandRate * clamp(m.drift / 0.6, 0.3, 1.5) * SAND_K * t * 0.82; };
  m.phase = () => {
    if (!rising()) return m.spit.closed ? 'lagoon' : 'spit';
    if (m.clock < RISE[0]) return 'glacial';
    if (m.clock < RISE[1]) return 'rise';
    if (!m.spit.closed) return 'spit';
    return m.clock - m.spit.closedAt < 12 ? 'lagoon' : 'filling';
  };
  m.cellKind = k => {
    if (lagoon[k] && h[k] < m.sea) return 'lagoon';
    if (h[k] < m.sea) return inBay(k % N, (k / N) | 0) ? 'bay' : 'sea';
    if (river[k]) return 'river';
    if (dune[k] > 0.12) return 'dune';
    if (isBar[k]) return 'bar';
    if (sand[k] > 0.03) return 'beach';
    if (fill[k] > 0.05) return 'fill';
    return 'land';
  };
  m.sample = (gx, gy) => {
    const u = clamp(gx, 0, N - 1.001), v = clamp(gy, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + N] * (1 - a) + h[k + N + 1] * a) * b;
  };
  // 이름표 자리. 그 지형이 실제로 있는 칸만 고른다.
  m.spots = () => {
    const out = {};
    const kindAt = (x, y) => m.cellKind(Math.round(y) * N + Math.round(x));
    const ph = m.phase();
    if (ph === 'glacial') out.valley = { x: RIVER_X, y: 118 };
    else out.sea = { x: 200, y: N - 22 }; // 빙기에는 그 자리가 땅이다.
    if (m.riverMouth) out.river = { x: m.riverMouth.x, y: Math.max(10, m.riverMouth.y - 22) };
    // 만: 입구 안쪽 물
    // 만: 입구 안쪽 물. 가운데 줄이 메워졌으면 입구 폭 전체에서 찾는다.
    for (let j = 140; j > 60 && !out.bay; j -= 4) for (let d = 0; d <= 26 && !out.bay; d += 2) for (const x of [RIVER_X - d, RIVER_X + d]) if (!out.bay && kindAt(x, j) === 'bay') out.bay = { x, y: j };
    // 석호: 가장 넓게 남은 물의 가운데쯤
    // 석호: 사주 바로 안쪽의 넓은 물에서 가까운 칸을 고른다(가장자리의 좁은 물 띠가 아니라).
    if (m.spit.closed) { let best = -1, bd = 1e9; const tx = RIVER_X, ty = barRow(RIVER_X) - BAR.half - 12; for (let k = 0; k < size; k++) if (lagoon[k] && h[k] < m.sea - 0.2) { const d = Math.abs((k % N) - tx) + Math.abs(((k / N) | 0) - ty); if (d < bd) { bd = d; best = k; } } if (best < 0) for (let k = 0; k < size; k++) if (lagoon[k] && h[k] < m.sea) { best = k; break; } if (best >= 0) out.lagoon = { x: best % N, y: (best / N) | 0 }; }
    const mid = Math.round((m.spit.tip + MOUTH.x1) / 2);
    if (m.spit.tip < MOUTH.x1 - 6) out[m.spit.closed ? 'bar' : 'spit'] = { x: m.spit.closed ? RIVER_X - 14 : mid, y: barRow(m.spit.closed ? RIVER_X - 14 : mid) };
    // 사빈: 오른쪽 해안의 넓은 모래
    for (let i = 214; i < 240 && !out.beach; i += 2) { const j = front[i] - 1; if (j > 0 && kindAt(i, j) === 'beach') out.beach = { x: i, y: j }; }
    // 해안사구: 사구가 가장 높은 칸
    let best = -1, bv = 0.25;
    for (let k = 0; k < size; k++) if (dune[k] > bv) { bv = dune[k]; best = k; }
    // 해안사구와 메워진 땅은 사주가 생긴 뒤(해수면 상승이 없으면 사빈이 생긴 뒤)에 이름을 붙인다.
    const late = m.spit.closed || !m.hasBay && m.clock > 40;
    if (best >= 0 && late) out.dune = { x: best % N, y: (best / N) | 0 };
    // 메워진 땅: 토사가 수면 위로 올라온 칸
    if (m.filledArea() > 30 && (ph === 'filling' || m.finished)) { let sx = 0, sy = 0, c = 0; for (let k = 0; k < size; k++) if (fill[k] > 0.05 && h[k] >= m.sea && !river[k]) { sx += k % N; sy += (k / N) | 0; c++; } if (c) { const x = Math.round(sx / c), y = Math.round(sy / c); out.fill = { x: kindAt(x, y) === 'fill' ? x : x + 4, y }; } }
    if (ph === 'rise') out.coast = { x: 210, y: front[210] - 1 };
    return out;
  };
  m.filledArea = () => { let a = 0; for (let k = 0; k < size; k++) if (fill[k] > 0.05 && h[k] >= m.sea) a++; return a; };
  m.setOption = (name, val) => { m.options[name] = val; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  m.reset = () => {
    sandRate = SAND[m.options.sand].rate; riverRate = RIVER[m.options.river].rate;
    rng = makeRng(seed + 1);
    acc = 0; roundNo = 0; trailNext = 0; store = 0; m.clock = 0; m.finished = false; m.sea = seaAt(0, rising());
    m.hasBay = null; m.bayArea = 0; m.supplied = 0; m.used = 0; m.riverIn = 0; m.lagoonStart = 0; m.riverMouth = null;
    sand.fill(0); dune.fill(0); fill.fill(0); isBar.fill(0); lagoon.fill(0); trailLen.fill(0);
    m.spit = { tip: MOUTH.x1, end: MOUTH.x0, closed: false, closedAt: -1, needNext: 0 };
    buildBase(); buildBath(); traceRays(); updateFront(); updateRiver(); rebuildOrder();
    m.firstDrift = m.drift;
    dirtyFlag.fill(0); m.dirtyCount = 0; m.allDirty = true;
  };
  m.tick = seconds => {
    if (m.finished) return;
    acc += seconds;
    while (acc >= ROUND - 1e-9 && !m.finished) { round(); acc -= ROUND; }
  };
  m.reset();
  return m;
}

// 단면: 골짜기 가운데에서 조금 비켜 육지(A)에서 바다(B)로 자른다. 메워진 땅, 석호, 사주, 사빈, 바다가 차례로 걸린다.
export const sectionLine = () => ({ ax: RIVER_X + 9, ay: 40, bx: RIVER_X + 9, by: 200 });
export function sectionProfile(m, samples = 240) {
  const S = sectionLine(), out = { start: new Float32Array(samples), top: new Float32Array(samples), kinds: new Array(samples), S };
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), j = Math.round(S.ay + (S.by - S.ay) * f), k = j * N + S.ax;
    out.start[t] = m.start[k]; out.top[t] = m.h[k]; out.kinds[t] = m.cellKind(k);
  }
  return out;
}

// 막대 비교의 문구. 사취로 들어올 모래와 입구를 다 막는 데 드는 모래를 비교한다.
export function budgetNote(m) {
  if (m.options.rise === 'yes' && m.clock < RISE[1]) return '해수면이 오르는 동안에는 해안선이 계속 육지 쪽으로 옮겨 가서 모래가 한곳에 오래 쌓이기 어렵습니다. 이 모형은 해수면이 거의 멈춘 뒤에 사취가 자라게 했습니다.';
  if (m.spit.closed) return `사주가 만 입구를 막았습니다. 이제 들어오는 모래는 사주 바깥의 사빈을 넓히고 해안을 따라 더 옮겨 갑니다.`;
  const need = m.needLeft(), come = m.supplyLeft();
  if (come >= need) return `앞으로 들어올 모래가 입구를 다 막는 데 드는 모래보다 많아, 사취가 건너편까지 닿을 수 있습니다.`;
  return `앞으로 들어올 모래가 입구를 다 막는 데 드는 모래보다 적어, 끝날 때까지 입구가 열려 있습니다. 입구 가운데는 빙기에 하천이 깊게 판 골짜기라서 모래가 많이 듭니다.`;
}

export function noteText(m) {
  const opt = m.options, ph = m.phase();
  if (m.finished) {
    if (opt.rise === 'no') return '해수면 상승이 없어 골짜기가 바다에 잠기지 않았으므로 만이 생기지 않았습니다. 연안류의 모래는 곧은 해안을 따라 사빈과 해안사구를 만들었지만, 막을 만이 없어 석호는 생기지 않았습니다. 석호가 생기려면 먼저 해수면 상승으로 만이 생겨야 합니다.';
    if (!m.spit.closed) return `모래 공급이 적어 사취가 만 입구를 다 막지 못했습니다. 입구 폭의 약 ${m.gapPercent()}%가 열려 있어 바닷물이 드나드는 만으로 남았습니다. 석호가 생기려면 입구를 다 막을 만큼 모래가 들어와야 합니다.`;
    const r = Math.round((m.lagoonArea() / Math.max(1, m.lagoonStart)) * 100);
    let text = `사주가 만 입구를 막아 석호가 생겼습니다. 하천 토사는 만일 때부터 쌓였고, 석호의 넓이는 막혔을 때의 ${r}%로 줄었습니다.`;
    if (opt.river === 'high') text += ' 하천 토사가 많아 석호가 빨리 메워졌습니다.';
    if (opt.river === 'low') text += ' 하천 토사가 적어 석호가 오래 남습니다.';
    text += ' 사주 바깥에는 사빈이, 사빈 뒤에는 바람이 쌓은 해안사구가 있습니다.';
    return text;
  }
  if (ph === 'glacial') return '빙기에는 해수면이 지금보다 훨씬 낮아 바닷가가 멀리 있었습니다. 하천은 낮은 바닷가까지 흘러가며 골짜기를 깊게 팠습니다.';
  if (ph === 'rise') return '빙기가 끝나고 빙하가 녹아 해수면이 올랐습니다(후빙기 해수면 상승). 바닷물이 하천 골짜기 안으로 들어와 골짜기가 바다에 잠긴 만이 됩니다. 이렇게 바다에 잠긴 골짜기를 익곡이라고 합니다.';
  if (ph === 'spit') {
    if (opt.rise === 'no') return '골짜기가 바다에 잠기지 않아 만이 없습니다. 비스듬히 들어오는 파랑이 해안을 따라 흐르는 연안류를 만들고, 연안류가 옮긴 모래가 곧은 해안에 사빈을 만듭니다.';
    return '해수면이 거의 멈추자, 비스듬히 들어오는 파랑이 만든 연안류가 모래를 해안을 따라 옮깁니다. 모래는 연안류가 오는 쪽의 만 입구 끝에서 시작해 연안류 방향으로 입구를 가로질러 이어 쌓여 좁고 긴 사취가 됩니다.';
  }
  if (ph === 'lagoon') return '사취가 자라 만 입구를 가로막았습니다. 이렇게 만의 입구를 막은 모래 띠가 사주(만구 사주)이고, 바다와 떨어진 안쪽 호수가 석호입니다. 평소에는 사주로 막혀 있지만 폭풍 때 큰 파도가 사주를 넘거나 큰비로 석호의 물이 불어나 사주가 터지면(갯터짐) 바닷물이 드나드는 물길(입수구)이 생깁니다. 그래서 석호의 물은 바닷물과 민물이 섞인 기수입니다.';
  return '석호로 흘러드는 하천이 토사를 쌓아 석호가 점점 얕아지고 좁아집니다. 사빈의 마른 모래는 바닷바람에 날려 사빈 뒤에 해안사구를 만듭니다.';
}

export function compareBrief(a, b) {
  const t = m => (m.spit.closed ? '사주가 입구를 막아 석호가 생겼습니다' : `입구 폭의 약 ${m.gapPercent()}%가 열린 채 만으로 남았습니다`);
  return { a: t(a), b: t(b) };
}
