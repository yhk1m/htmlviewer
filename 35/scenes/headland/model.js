// © 2026 김용현
// 곶과 만, 암석 해안 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 먼바다에서 들어오는 파랑의 진행 방향선을 수심에 따라 굽혀 계산한다. 얕을수록 파랑이 느려지므로 선은 곶으로 모이고 만에서는 퍼진다.
// 선이 닿은 만큼 파랑 에너지가 쌓여 해안을 깎는다. 깎인 자리는 파식대가 되고, 깎인 모래는 연안류를 따라 에너지가 약한 만으로 옮겨 쌓인다.
// 지형 계산에는 사칙연산과 내림, 제곱근만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 혼돈 계산이 갈라진다.

export const N = 256;
export const ROUND = 0.1;
export const T_END = 90;
export const SEA = 0; // 해수면
export const RAYS = 96;
export const RAY_STEPS = 300; // 얕은 파식대에서 느려져도 모든 선이 해안에 닿을 만큼 잡았다.
const RAY_DT = 0.85;
const HEAD_X = [70, 186], BAY_X = 128; // 곶과 만의 가운데 줄
const FULL_DEPTH = 6;
const PLATFORM = -0.1; // 파식대의 높이: 해수면 바로 아래

export const WAVE = {
  low: { name: '약함', power: 0.5 },
  mid: { name: '보통', power: 1 },
  high: { name: '강함', power: 1.7 },
};
export const ROCK = {
  soft: { name: '무름', strength: 0.65 },
  mid: { name: '보통', strength: 1 },
  hard: { name: '단단함', strength: 2.6 },
};
export const PRESETS = {
  textbook: { wave: 'mid', rock: 'mid' },
  strong: { wave: 'high', rock: 'mid' },
  hard: { wave: 'mid', rock: 'hard' },
  calm: { wave: 'low', rock: 'mid' },
};
export { HEAD_X, BAY_X };
// 오른쪽 곶 어깨에서 바다로 뻗은 좁은 곶. 절리(가운데 줄)를 따라 왼쪽 해식애 안쪽으로 해식 동굴이 파이고, 반대쪽 해식애까지 뚫리면 시 아치, 천장이 무너지면 바깥쪽이 시 스택이 된다.
// 곶 가운데에서 벗어난 자리라 곶의 후퇴와 파식대 계산에 끼어들지 않는다.
export const ARCH = { cx: 206, x0: 200, x1: 212, j0: 154, j1: 164, tip: 178, base: 150, top: 6.2, crown: 4 };
const fromArch = s => s.x > ARCH.x0 && s.x < ARCH.x1 && s.y > ARCH.j1; // 시 아치가 무너져 생긴 시 스택인가
export { fromArch };
// 곶의 큰 해식애에 난 절리. 해식애가 충분히 높아지면 절리를 따라 안쪽으로 굴이 파이고, 해식애가 물러나면 굴도 절리를 따라 함께 물러난다.
// 굴은 h를 바꾸지 않고 깊이만 기억한다. 그래서 해안선과 파랑 계산에는 끼어들지 않는다.
export const CLIFF_CAVE = { xs: [72, 178], half: 5, rate: 0.75, maxDepth: 10, minFace: 2.2, crown: 3.2, jointRows: 34 };
const CAVE_RATE = 0.38; // 해식 동굴이 1초에 파고드는 칸 수(보통 파랑, 보통 암석)
const ROOF_LIFE = 22; // 뚫린 뒤 천장이 버티는 시간(보통 파랑, 보통 암석)

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const PI = 3.141592653589793;
function psin(a) {
  let x = a - Math.floor(a / (2 * PI)) * 2 * PI, s = 1;
  if (x > PI) { x -= PI; s = -1; }
  const u = x * (PI - x);
  return s * (16 * u) / (5 * PI * PI - 4 * u);
}
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

// 처음 해안선: 곶 둘과 그 사이 만, 양쪽 바깥의 작은 만
export function coastRow(i) {
  const a = (i - HEAD_X[0]) / 34, b = (i - HEAD_X[1]) / 34;
  return 92 + 58 * (1 / (1 + a * a * a * a) + 1 / (1 + b * b * b * b));
}

// 곶과 만 사이의 연안류 방향: 가까운 곶에서 가까운 만 쪽(1은 오른쪽, -1은 왼쪽). 곶과 만의 한가운데는 0이다.
export function currentDir(x) {
  let near = HEAD_X[0];
  for (const h of HEAD_X) if (Math.abs(x - h) < Math.abs(x - near)) near = h;
  const d = x - near;
  if (Math.abs(d) < 14 || Math.abs(d) > 46) return 0;
  return d > 0 ? 1 : -1;
}

export function createModel(seed = 11, tuning = {}) {
  const FRICTION = tuning.friction ?? 0.06;
  const size = N * N;
  const h = new Float32Array(size), start = new Float32Array(size), strength = new Float32Array(size), damage = new Float32Array(size), sand = new Float32Array(size), cutAt = new Float32Array(size), energy = new Float32Array(size), bath = new Float32Array(size), tmp = new Float32Array(size);
  const isStackRock = new Uint8Array(size), stackMark = new Uint8Array(size), fin = new Uint8Array(size), caved = new Uint8Array(size), dirtyFlag = new Uint8Array(size), dirtyList = new Int32Array(size);
  const rayX = new Float32Array(RAYS * RAY_STEPS), rayY = new Float32Array(RAYS * RAY_STEPS), rayLen = new Uint16Array(RAYS);
  const shoreE = new Float32Array(N); // 줄별(가로 위치별) 파랑 에너지
  const front = new Int32Array(N); // 가로 위치별 처음 만나는 물 칸의 줄(해안선)

  const TRAILS = 40, TRAIL_PTS = 12;
  const trailX = new Float32Array(TRAILS * TRAIL_PTS), trailY = new Float32Array(TRAILS * TRAIL_PTS), trailAge = new Float32Array(TRAILS), trailLen = new Uint8Array(TRAILS);

  const m = {
    h, start, strength, damage, sand, cutAt, energy, bath, isStackRock, stackMark, fin, caved, shoreE, front, rayX, rayY, rayLen, RAYS, RAY_STEPS, seed, dirtyList, dirtyCount: 0, allDirty: true,
    TRAILS, TRAIL_PTS, trailX, trailY, trailAge, trailLen, options: { ...PRESETS.textbook }, clock: 0, finished: false, wavePhase: 0, eroded: 0, deposited: 0, stacks: [], firstFront: new Int32Array(N),
  };
  let acc = 0, roundNo = 0, rng, sandPool = 0, power = 1, rockK = 1, trailNext = 0;
  const touch = k => { if (!dirtyFlag[k]) { dirtyFlag[k] = 1; dirtyList[m.dirtyCount++] = k; } };
  m.consumeDirty = () => { for (let i = 0; i < m.dirtyCount; i++) dirtyFlag[dirtyList[i]] = 0; const c = m.dirtyCount; m.dirtyCount = 0; return c; };

  function buildBase() {
    const hn = makeNoise(seed + 5, 22), fine = makeNoise(seed + 9, 6), wig = makeNoise(seed + 2, 16), rock = makeNoise(seed + 21, 11);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, c = coastRow(i) + (wig(i, j) - 0.5) * 7, off = j - c;
      strength[k] = 0.75 + 0.5 * rock(i, j);
      let v;
      if (off > 0) {
        // 바다: 해안에서 멀어질수록 깊어진다. 그래서 등심선이 해안선을 닮고 곶 앞이 얕다.
        v = -(0.12 + 0.075 * off) ; if (v < -FULL_DEPTH) v = -FULL_DEPTH;
        v += (fine(i, j) - 0.5) * 0.05;
      } else {
        // 땅: 바닷가에서 바로 언덕으로 오른다. 곶은 높은 산줄기이고 만의 안쪽은 낮다.
        const rise = clamp(-off / 16), ridge = 1 / (1 + ((i - HEAD_X[0]) / 30) * ((i - HEAD_X[0]) / 30)) + 1 / (1 + ((i - HEAD_X[1]) / 30) * ((i - HEAD_X[1]) / 30));
        v = 0.25 + rise * (3 + 9 * ridge + hn(i, j) * 6) + clamp(-off / 60) * 5 + (fine(i, j) - 0.5) * 0.2;
      }
      start[k] = v; h[k] = v;
    }
    // 곶 끝의 단단한 암석 덩이. 주변이 물러나도 남아 시 스택이 된다.
    const r2 = makeRng(seed * 13 + 5);
    for (const hx of HEAD_X) for (let q = 0; q < 3; q++) {
      let cx = hx + (r2() - 0.5) * 10 + (q - 1) * 13;
      // 해식 동굴의 입구를 가리지 않도록 절리에서 떼어 놓는다.
      // 옮긴 덩이는 해식애가 더디게 물러나는 자리라, 바다 쪽에 두어야 나중에 시 스택으로 떨어져 나온다.
      let seaward = 0;
      for (const x of CLIFF_CAVE.xs) if (Math.abs(cx - x) < CLIFF_CAVE.half + 3) { cx = x + (cx < x ? -1 : 1) * (CLIFF_CAVE.half + 3); seaward = 1; }
      const shift = r2() * 8, cy = coastRow(Math.round(cx)) - (seaward ? 2 + shift * 0.4 : 5 + shift), R = 2.8 + r2() * 1.2;
      if (Math.abs(cx - ARCH.cx) < 16) continue; // 좁은 곶과 겹치지 않게 한다.
      for (let j = Math.floor(cy - R); j <= cy + R; j++) for (let i = Math.floor(cx - R); i <= cx + R; i++) {
        const dx = i - cx, dy = j - cy;
        if (dx * dx + dy * dy <= R * R) { const k = j * N + i; isStackRock[k] = 1; }
      }
    }
    // 좁은 곶: 뿌리는 육지 속으로 이어지고, 바다 쪽은 폭이 일정한 바위 띠다.
    const half = (ARCH.x1 - ARCH.x0) / 2, wob = makeNoise(seed + 33, 9);
    for (let j = ARCH.base - 50; j <= ARCH.tip; j++) {
      const widen = j < ARCH.base ? Math.min(9, (ARCH.base - j) * 0.35) : 0;
      const inBand = j >= ARCH.j0 - 1 && j <= ARCH.j1 + 1;
      for (let i = ARCH.x0 - 12; i <= ARCH.x1 + 12; i++) {
        const k = j * N + i, tipCut = j > ARCH.tip - 4 ? (j - (ARCH.tip - 4)) * 0.9 : 0;
        const w = half + widen - tipCut + (inBand ? 0 : (wob(i, j) - 0.5) * 2);
        if (Math.abs(i - ARCH.cx) > w) continue;
        fin[k] = 1;
        if (j > ARCH.base - 8) isStackRock[k] = 1;
        const v = ARCH.top - 0.04 * (j - ARCH.j0) + (fine(i, j) - 0.5) * 0.15;
        if (h[k] < v) { h[k] = v; start[k] = v; }
      }
    }
  }

  // 수심 지도: 작은 모양에 파랑이 흔들리지 않도록 고르게 편다. 파랑은 이 수심을 느낀다.
  function buildBath() {
    for (let k = 0; k < size; k++) { const d = SEA - h[k]; bath[k] = d < 0 ? 0 : d > FULL_DEPTH ? FULL_DEPTH : d; }
    const R = 5, W = 2 * R + 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < N; j++) { let s = 0; for (let i = -R; i <= R; i++) s += bath[j * N + clamp(i, 0, N - 1)]; for (let i = 0; i < N; i++) { tmp[j * N + i] = s / W; s += bath[j * N + clamp(i + R + 1, 0, N - 1)] - bath[j * N + clamp(i - R, 0, N - 1)]; } }
      for (let i = 0; i < N; i++) { let s = 0; for (let j = -R; j <= R; j++) s += tmp[clamp(j, 0, N - 1) * N + i]; for (let j = 0; j < N; j++) { bath[j * N + i] = s / W; s += tmp[clamp(j + R + 1, 0, N - 1) * N + i] - tmp[clamp(j - R, 0, N - 1) * N + i]; } }
    }
  }
  const depthAt = (x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (bath[k] * (1 - a) + bath[k + 1] * a) * (1 - b) + (bath[k + N] * (1 - a) + bath[k + N + 1] * a) * b;
  };
  // 파랑의 빠르기: 얕은 물에서는 수심의 제곱근에 비례한다.
  const speed = d => Math.sqrt(d < 0.05 ? 0.05 : d);

  // 진행 방향선을 먼바다에서 해안까지 따라간다. 칸 시간 간격이 같으므로 같은 번호의 점을 이으면 파봉선이 된다.
  function traceRays() {
    energy.fill(0); shoreE.fill(0);
    const gap = (N - 1) / (RAYS - 1);
    for (let r = 0; r < RAYS; r++) {
      let x = r * gap, y = N - 2, ux = 0, uy = -1, e = 1, n = 0;
      const base = r * RAY_STEPS;
      for (let s = 0; s < RAY_STEPS; s++) {
        rayX[base + s] = x; rayY[base + s] = y; n = s + 1;
        if (s + 1 >= RAY_STEPS) break;
        const d = depthAt(x, y), c = speed(d);
        // 진행 방향의 왼쪽과 오른쪽 수심을 비교해 느린 쪽으로 굽는다.
        const nx = -uy, ny = ux, cl = speed(depthAt(x + nx * 2.5, y + ny * 2.5)), cr = speed(depthAt(x - nx * 2.5, y - ny * 2.5)), bend = ((cl - cr) / 5) * c * RAY_DT * 0.5;
        ux -= nx * bend; uy -= ny * bend;
        const l = Math.sqrt(ux * ux + uy * uy); ux /= l; uy /= l;
        x += ux * c * RAY_DT; y += uy * c * RAY_DT;
        if (x < 1 || x > N - 2 || y < 1) break;
        // 얕은 파식대를 건너면 바닥 마찰로 에너지를 잃는다.
        const i = Math.round(x), j = Math.round(y), k = j * N + i;
        if (d < 0.9) e *= 1 - FRICTION * (0.9 - d) * c * RAY_DT;
        if (h[k] >= SEA) {
          // 해안에 닿았다. 둘레 칸에 에너지를 나눠 준다.
          rayX[base + n] = x; rayY[base + n] = y; n++;
          for (let b = -9; b <= 9; b++) for (let a = -9; a <= 9; a++) {
            const o = (j + b) * N + i + a;
            if (j + b < 0 || j + b >= N || i + a < 0 || i + a >= N) continue;
            const w = 1 - (a * a + b * b) / 90;
            if (w > 0) energy[o] += e * w * 0.032;
          }
          shoreE[i] += e;
          break;
        }
      }
      rayLen[r] = n;
    }
  }

  function updateFront() {
    for (let i = 0; i < N; i++) {
      let j = 0;
      while (j < N - 1 && h[j * N + i] >= SEA) j++;
      front[i] = j;
    }
  }

  function erode() {
    let gained = 0;
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const k = j * N + i;
      if (h[k] < SEA || energy[k] <= 0) continue;
      // 물에 닿은 땅만 깎인다.
      if (h[k - 1] >= SEA && h[k + 1] >= SEA && h[k - N] >= SEA && h[k + N] >= SEA) continue;
      if (sand[k] > 0.02) { // 모래 해안은 파랑이 조금 흔들 뿐이다.
        continue;
      }
      if (fin[k] && !m.arch.collapsed) continue; // 좁은 곶은 약한 띠부터 파인다(growCave).
      const rock = strength[k] * rockK * (isStackRock[k] ? 14 : 1);
      // 곶이 만의 해안선 가까이 물러나면 더는 튀어나오지 않아 깎임이 크게 줄어든다. 해안은 곧아질 뿐 곶과 만이 뒤바뀌지 않는다.
      const reach = clamp((j - (m.firstFront[BAY_X] + 8)) / 22, 0.04, 1);
      damage[k] += (energy[k] * power * 0.125 * reach) / rock;
      if (damage[k] >= 1) {
        // 해식애 아래가 파여 무너진다. 그 자리는 파식대가 되고 부서진 돌은 모래가 되어 물에 실린다.
        const lost = Math.min(h[k] - PLATFORM, 1.2);
        gained += lost * 0.5;
        m.eroded += 1;
        h[k] = PLATFORM - 0.03 * clamp(energy[k]); cutAt[k] = Math.max(0.001, m.clock); damage[k] = 0;
        touch(k);
        // 블록 가장자리 줄도 같이 낮춰 벽이 남지 않게 한다.
        if (i === 1) { h[k - 1] = h[k]; cutAt[k - 1] = cutAt[k]; touch(k - 1); }
        if (i === N - 2) { h[k + 1] = h[k]; cutAt[k + 1] = cutAt[k]; touch(k + 1); }
      }
    }
    sandPool += gained;
    // 파식대는 파랑에 조금씩 닳아 바다 쪽으로 완만히 기운다.
    if (roundNo % 10 === 0) for (let k = 0; k < size; k++) if (cutAt[k] > 0 && h[k] < SEA && sand[k] < 0.02 && h[k] > -0.28) { h[k] -= 0.0035 * power; touch(k); }
  }

  // 연안류: 파랑이 약한 칸으로 모래를 옮겨 쌓는다. 곶에서 깎인 모래가 만으로 간다.
  function feedBeach() {
    if (sandPool < 0.02) return;
    let mean = 0, c = 0;
    for (let i = 4; i < N - 4; i++) { mean += localE(i); c++; }
    mean /= c;
    const take = Math.min(sandPool, 2.4 + sandPool * 0.05);
    let total = 0;
    const list = [];
    for (let i = 16; i < N - 16; i += 1) {
      if (i > ARCH.x0 - 6 && i < ARCH.x1 + 6) continue; // 좁은 곶 옆은 파랑이 세서 모래가 쌓이지 않는다.
      const e = localE(i);
      if (e >= mean * 0.8) continue;
      const w = (mean * 0.8 - e) / (mean * 0.8 + 1e-6);
      list.push(i, w); total += w;
    }
    if (total <= 0) return;
    let used = 0;
    for (let q = 0; q < list.length; q += 2) {
      const i = list[q], w = list[q + 1], amount = (take * w) / total, j = front[i];
      used += placeSand(i, j, amount);
    }
    sandPool -= used;
    m.deposited += used;
    if (used > 0.3 && roundNo % 2 === 0) emitTrail();
    // 모래 해안은 파랑이 옆으로 고르게 편다.
    if (roundNo % 10 === 0) for (let j = 1; j < N - 1; j++) for (let i = 2; i < N - 2; i++) { const k = j * N + i; if (sand[k] > 0.02 && sand[k - 1] > 0.02 && sand[k + 1] > 0.02) { const a = (h[k - 1] + h[k + 1]) / 2 - h[k]; h[k] += a * 0.3; touch(k); } }
  }
  const localE = i => { let s = 0; for (let a = -9; a <= 9; a++) s += shoreE[clamp(i + a, 0, N - 1)]; return s / 19; };
  function placeSand(i, j, amount) {
    // 물가 칸을 채우고, 차면 바다 쪽으로 넓힌다.
    let used = 0, left = amount;
    for (let b = 0; b < 6 && left > 0; b++) {
      const jj = j + b;
      if (jj >= N - 1) break;
      {
        const k = jj * N + i;
        const top = 0.14 - b * 0.09;
        if (h[k] >= top) continue;
        const add = Math.min(left, (top - h[k]) * 0.35 + 0.01);
        h[k] += add; sand[k] += add; left -= add; used += add;
        touch(k);
      }
    }
    return used;
  }

  function emitTrail() {
    // 깎이는 곶에서 쌓이는 만으로 가는 모래 알갱이. 그리기 전용이다.
    const a = HEAD_X[rng() < 0.5 ? 0 : 1], dir = rng() < 0.5 || a === HEAD_X[1] ? -1 : 1, fromX = a + dir * (6 + rng() * 8), toX = a + dir * (30 + rng() * 22);
    const slot = trailNext; trailNext = (trailNext + 1) % TRAILS;
    const at = slot * TRAIL_PTS;
    for (let q = 0; q < TRAIL_PTS; q++) {
      const f = q / (TRAIL_PTS - 1), gx = fromX + (toX - fromX) * f, c = front[clamp(Math.round(gx), 0, N - 1)];
      trailX[at + q] = gx; trailY[at + q] = c + 2.5;
    }
    trailLen[slot] = TRAIL_PTS; trailAge[slot] = 0;
  }

  // 절리를 따라 왼쪽 해식애에서 안쪽으로 파고든다. 굴 위에는 천장이 남으므로 높이 격자 대신 caved 표시로 기억한다.
  function carve(i) {
    for (let j = ARCH.j0; j <= ARCH.j1; j++) { const k = j * N + i; h[k] = PLATFORM - 0.03; cutAt[k] = Math.max(0.001, m.clock); caved[k] = 1; touch(k); }
    sandPool += 0.6;
  }
  function growCave() {
    const a = m.arch;
    if (a.collapsed) return;
    const width = ARCH.x1 - ARCH.x0 + 1, step = (ROUND * power) / rockK;
    if (!a.through) {
      // 옆면에 닿는 파랑 에너지에 따라 빠르기가 조금 달라진다.
      const row = ((ARCH.j0 + ARCH.j1) / 2) | 0, side = i => clamp(energy[row * N + i] / 0.04, 0.7, 1.3);
      a.dL += step * CAVE_RATE * side(ARCH.x0 - 2);
      while (a.dL >= 1 && a.caveL < width) { a.dL -= 1; carve(ARCH.x0 + a.caveL); a.caveL++; }
      if (!a.event && a.caveL) a.event = { name: 'cave', at: m.clock };
      if (a.caveL >= width) {
        a.through = true; a.event = { name: 'arch', at: m.clock };
        // 뚫리면 굴 바닥에 빛이 들어 색이 바뀐다.
        for (let k = 0; k < size; k++) if (caved[k]) touch(k);
      }
      return;
    }
    a.wear += step / ROOF_LIFE;
    if (a.wear >= 1) {
      // 천장이 무너진다. 바깥쪽 바위는 육지와 떨어져 시 스택이 된다.
      a.collapsed = true; a.justFell = true; a.event = { name: 'stack', at: m.clock };
      caved.fill(0);
      sandPool += 8;
    }
  }
  // 곶의 해식애에 파이는 해식 동굴
  function growCliffCaves() {
    const step = (ROUND * power) / rockK;
    for (const c of m.cliffCaves) {
      let row = N, sum = 0, cnt = 0;
      for (let i = c.x - CLIFF_CAVE.half; i <= c.x + CLIFF_CAVE.half; i++) { if (front[i] < row) row = front[i]; sum += h[(front[i] - 1) * N + i]; cnt++; }
      c.face = sum / cnt;
      if (c.row > row && c.depth > 0) c.depth = Math.max(0, c.depth - (c.row - row)); // 해식애가 물러난 만큼 굴의 앞쪽이 사라진다.
      c.row = row;
      if (c.face < CLIFF_CAVE.minFace) continue;
      const e = clamp(energy[(row - 1) * N + c.x] / 0.04, 0.7, 1.3);
      c.depth = Math.min(CLIFF_CAVE.maxDepth, c.depth + step * CLIFF_CAVE.rate * e);
      if (m.cliffCaveAt < 0 && c.depth >= 1) m.cliffCaveAt = m.clock;
    }
  }
  // 입구의 크기: 굴이 깊어질수록 커지되 해식애보다 높아지지 않는다.
  m.caveMouth = c => { const grow = 0.4 + 0.6 * Math.min(1, c.depth / CLIFF_CAVE.maxDepth); return { half: CLIFF_CAVE.half * grow, height: Math.min(c.face * 0.7, CLIFF_CAVE.crown * grow) }; };
  m.archStage = () => { const a = m.arch; return a.collapsed ? 'stack' : a.through ? 'arch' : a.caveL ? 'cave' : 'cape'; };

  // 시 스택: 육지와 떨어진 바위. 해안선에 이어지지 않은 땅 덩이를 찾는다. 시 아치의 천장은 아직 육지와 이어 준다.
  function findStacks() {
    stackMark.fill(0);
    const seen = new Uint8Array(size), list = [], solid = o => h[o] >= SEA || caved[o];
    for (let i = 0; i < N; i++) { const k = i; if (h[k] >= SEA) { seen[k] = 1; list.push(k); } }
    for (let t = 0; t < list.length; t++) {
      const c = list[t];
      for (const o of [c - 1, c + 1, c - N, c + N]) if (o >= 0 && o < size && !seen[o] && solid(o)) { seen[o] = 1; list.push(o); }
    }
    m.stacks = [];
    for (let k = 0; k < size; k++) {
      if (seen[k] || h[k] < SEA) continue;
      const st = [k]; seen[k] = 1;
      let sx = 0, sy = 0, rocky = 0, top = -9;
      for (let t = 0; t < st.length; t++) {
        const c = st[t];
        sx += c % N; sy += (c / N) | 0; if (sand[c] < 0.02) rocky++; if (h[c] > top) top = h[c];
        for (const o of [c - 1, c + 1, c - N, c + N]) if (o >= 0 && o < size && !seen[o] && h[o] >= SEA) { seen[o] = 1; st.push(o); }
      }
      if (rocky >= 3 && top > 0.4) { for (const c of st) stackMark[c] = 1; m.stacks.push({ x: sx / st.length, y: sy / st.length, cells: st.length, top }); }
    }
  }

  function round() {
    m.clock += ROUND; roundNo++;
    if (roundNo % 8 === 1) { buildBath(); traceRays(); updateFront(); }
    erode();
    growCave();
    growCliffCaves();
    if (roundNo % 2 === 0) { updateFront(); feedBeach(); }
    if (roundNo % 10 === 0 || m.arch.justFell) { m.arch.justFell = false; findStacks(); const others = m.stacks.filter(s => !fromArch(s)).length; if (others > m.stackPeak) m.stackPeak = others; }
    for (let t = 0; t < TRAILS; t++) trailAge[t] += ROUND;
    if (m.clock >= T_END - 1e-9) { m.finished = true; trailLen.fill(0); buildBath(); traceRays(); updateFront(); findStacks(); }
  }

  // 곶과 만의 파랑 에너지 비교(같은 폭으로 잰다)
  m.energyAt = xs => { let s = 0, c = 0; for (const cx of xs) for (let i = cx - 14; i <= cx + 14; i++) { s += shoreE[clamp(i, 0, N - 1)]; c++; } return s / c; };
  // 좁은 곶도 곶의 일부다. 곶으로 모인 선 중 좁은 곶에 먼저 닿은 몫을 곶의 에너지에 더한다.
  m.headEnergy = () => { let extra = 0; for (let i = HEAD_X[1] + 15; i <= ARCH.x1 + 4; i++) extra += shoreE[i]; return m.energyAt(HEAD_X) + extra / (29 * HEAD_X.length); };
  m.bayEnergy = () => m.energyAt([BAY_X]);
  // 해안선의 들쭉날쭉한 정도: 곶과 만 앞 해안선 줄의 차이
  m.coastRelief = () => { const row = xs => { let s = 0, c = 0; for (const cx of xs) for (let i = cx - 6; i <= cx + 6; i++) { s += front[i]; c++; } return s / c; }; return row(HEAD_X) - row([BAY_X]); };
  m.retreat = () => { let s = 0, c = 0; for (const cx of HEAD_X) for (let i = cx - 6; i <= cx + 6; i++) { s += m.firstFront[i] - front[i]; c++; } return s / c; };
  m.platformWidth = () => { let top = 0; for (const cx of HEAD_X) for (let i = cx - 10; i <= cx + 10; i++) { let w = 0; for (let j = 0; j < N; j++) { const k = j * N + i; if (cutAt[k] > 0 && h[k] < SEA && sand[k] < 0.02 && h[k] > -1) w++; } if (w > top) top = w; } return top; };
  // 같은 줄(처음 곶 끝에서 바다로 22칸)의 곶 앞과 만 앞 수심. 곶 앞이 얕은 것이 굴절의 원인이다.
  m.depthRow = () => m.firstFront[HEAD_X[0]] + 22;
  m.depths = () => {
    const row = m.depthRow(), at = cx => { let s = 0, c = 0; for (let i = cx - 4; i <= cx + 4; i++) { s += Math.max(0, SEA - h[row * N + i]); c++; } return s / c; };
    return { head: at(HEAD_X[0]), bay: at(BAY_X) };
  };
  m.cellKind = k => {
    if (caved[k]) return 'arch';
    if (stackMark[k]) return 'stack';
    if (h[k] >= SEA) return sand[k] > 0.02 ? 'beach' : 'land';
    if (sand[k] > 0.02) return 'shoal';
    if (cutAt[k] > 0 && h[k] > -1) return 'platform';
    return 'sea';
  };
  m.sample = (gx, gy) => {
    const u = clamp(gx, 0, N - 1.001), v = clamp(gy, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + N] * (1 - a) + h[k + N + 1] * a) * b;
  };
  // 이름표 자리. 그 지형이 실제로 있는 칸만 고른다.
  m.spots = () => {
    const out = { sea: { x: 128, y: N - 26 } };
    const kindAt = (x, y) => m.cellKind(Math.round(y) * N + Math.round(x));
    const hx = HEAD_X[0], fr = front[hx];
    out.head = { x: hx, y: Math.max(8, fr - 22) };
    out.bay = { x: BAY_X, y: Math.min(N - 8, front[BAY_X] + 16) };
    // 해식애: 곶 앞 물가의 가파른 칸. 파식대: 그 앞의 깎인 칸.
    if (m.firstFront[hx] - fr >= 3) for (let d = 1; d <= 4; d++) { const k = (fr - d) * N + hx; if (m.cellKind(k) === 'land' && h[k] > 1) { out.cliff = { x: hx, y: fr - d }; break; } }
    if (m.platformWidth() >= 5) for (let i = HEAD_X[1] - 10; i <= HEAD_X[1] + 10 && !out.platform; i += 2) for (let j = front[i]; j < front[i] + 26; j++) if (kindAt(i, j) === 'platform') { out.platform = { x: i, y: j }; break; }
    for (let w = 0; w <= 34 && !out.beach; w++) for (const i of [BAY_X + w, BAY_X - w]) { const j = front[i] - 1; if (j > 0 && kindAt(i, j) === 'beach') { out.beach = { x: i, y: j }; break; } }
    if (m.stacks.length) {
      // 시 아치가 무너져 생긴 시 스택이 있으면 그것을 가리킨다.
      const own = m.stacks.find(fromArch), s = own ?? m.stacks[0];
      out[own ? 'stackArch' : 'stack'] = { x: s.x, y: s.y };
    }
    const own = m.cliffCaves.find(c => c.depth >= 1);
    if (own) out.cliffCave = { x: own.x, y: front[own.x] - 0.5, height: m.caveMouth(own).height };
    const midJ = (ARCH.j0 + ARCH.j1) / 2, stage = m.archStage();
    if (stage === 'cape') out.cape = { x: ARCH.cx, y: midJ };
    if (stage === 'cave') out.cave = { x: ARCH.x0 - 0.5, y: midJ }; // 굴 입구가 있는 해식애 면
    if (stage === 'arch') out.arch = { x: ARCH.cx, y: midJ };
    return out;
  };
  m.setOption = (name, val) => { m.options[name] = val; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  m.reset = () => {
    power = WAVE[m.options.wave].power; rockK = ROCK[m.options.rock].strength;
    rng = makeRng(seed + 1);
    acc = 0; roundNo = 0; sandPool = 0; trailNext = 0; m.clock = 0; m.finished = false; m.eroded = 0; m.deposited = 0; m.stacks = []; m.stackPeak = 0; m.wavePhase = 0; m.cliffCaveAt = -1;
    damage.fill(0); sand.fill(0); cutAt.fill(0); energy.fill(0); isStackRock.fill(0); stackMark.fill(0); trailLen.fill(0); fin.fill(0); caved.fill(0);
    m.arch = { caveL: 0, dL: 0, wear: 0, through: false, collapsed: false, justFell: false, event: null };
    buildBase(); buildBath(); traceRays(); updateFront();
    m.firstFront.set(front);
    m.cliffCaves = CLIFF_CAVE.xs.map(x => ({ x, depth: 0, face: 0, row: front[x] }));
    m.firstHead = m.headEnergy(); m.firstBay = m.bayEnergy(); m.firstRelief = m.coastRelief();
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

// 단면: 앞 곶의 가운데를 육지에서 바다로 자른다. 곶의 해식 동굴도 이 줄에 걸린다. 위치는 고정이다.
export const sectionLine = () => ({ ax: HEAD_X[0], ay: 30, bx: HEAD_X[0], by: 215 });
export function sectionProfile(m, samples = 240) {
  const S = sectionLine(), out = { start: new Float32Array(samples), top: new Float32Array(samples), kinds: new Array(samples), S };
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), j = Math.round(S.ay + (S.by - S.ay) * f), k = j * N + S.ax;
    out.start[t] = m.start[k]; out.top[t] = m.h[k]; out.kinds[t] = m.cellKind(k);
  }
  // 단면이 지나는 해식 동굴. 굴 윗부분은 입구에서 안쪽으로 갈수록 낮아진다.
  const c = m.cliffCaves.find(q => q.depth >= 1 && Math.abs(q.x - S.ax) <= CLIFF_CAVE.half);
  if (c) { const q = m.caveMouth(c), u = (S.ax - c.x) / q.half, w = 1 - u * u; if (w > 0) out.cave = { depth: c.depth, height: q.height * Math.sqrt(w), cellsPerSample: (S.by - S.ay) / (samples - 1) }; }
  return out;
}

// 그때 일어나는 일을 적는다. 모두 계산 상태에서 고르므로 화면과 어긋나지 않는다.
export function ratioNote(m) {
  const r = m.headEnergy() / Math.max(0.01, m.bayEnergy());
  return r > 1.3 ? `곶에 닿는 파랑 에너지가 만의 ${r.toFixed(1)}배입니다. 그래서 곶은 깎이고 만에는 쌓입니다.` : '곶과 만의 파랑 에너지가 비슷해졌습니다. 해안이 단순해질수록 차이가 줄어듭니다.';
}
export const CLIFF_CAVE_NOTE = '파랑이 모인 곶의 해식애에서는 절리나 단층처럼 약한 줄(검은 줄)을 따라 침식이 집중됩니다. 해식애 안쪽으로 크고 깊게 파인 이 굴이 해식 동굴입니다.';
export function caveViewNote(m) {
  if (m.cliffCaves.some(c => c.depth >= 1)) return CLIFF_CAVE_NOTE;
  return '아직 해식애가 낮아 굴이 파이지 않았습니다. 곶이 깎여 해식애가 높아지면 검은 줄을 따라 해식 동굴이 파입니다.';
}
export function archNote(name) {
  if (name === 'cave') return '좁게 튀어나온 곶의 해식애에도 절리를 따라 해식 동굴이 파입니다. 양쪽이 바다라 굴이 계속 커지면 반대쪽 해식애까지 뚫릴 수 있습니다.';
  if (name === 'arch') return '해식 동굴이 계속 커져 반대쪽 해식애까지 뚫렸습니다. 곶이 구름다리 모양이 된 이 지형이 시 아치입니다. 시 아치 보기를 누르면 뚫린 구멍이 잘 보입니다.';
  return '파랑을 계속 받아 시 아치 천장의 틈이 커졌고, 결국 천장이 무너졌습니다. 육지와 떨어져 바다에 남은 바깥쪽 바위가 시 스택입니다.';
}
export function noteText(m) {
  const opt = m.options;
  if (m.finished) {
    let text = `곶은 평균 ${Math.round(m.retreat())}칸 물러났고 만에는 모래가 쌓여, 곶과 만의 해안선 차이가 ${Math.round(m.firstRelief)}칸에서 ${Math.round(m.coastRelief())}칸으로 줄었습니다.`;
    if (opt.wave === 'low') text += ' 이 모형에서는 파랑이 약해 천천히 물러납니다.';
    if (opt.wave === 'high') text += ' 파랑이 강해 더 빨리 물러납니다.';
    if (opt.rock === 'hard') text += ' 단단한 암석은 잘 깎이지 않아 곶이 더 오래 남습니다.';
    if (opt.rock === 'soft') text += ' 무른 암석은 빨리 깎여 해안선이 더 빨리 단순해집니다.';
    if (m.cliffCaves.some(c => c.depth >= 1)) text += ' 곶의 해식애에는 절리를 따라 해식 동굴이 파였습니다.';
    const stage = m.archStage(), others = m.stacks.filter(s => !fromArch(s)).length;
    if (others) text += ` 잘 깎이지 않는 바위 ${others}개가 시 스택으로 남았습니다.`;
    else if (m.stackPeak) text += ' 한때 남았던 시 스택도 파랑에 깎여 사라졌습니다.';
    else if (stage !== 'stack') text += ' 아직 바위가 육지에서 떨어져 나올 만큼 깎이지는 않았습니다.';
    if (stage === 'stack') text += ' 좁은 곶에서는 시 아치의 천장이 무너져 바깥쪽 바위 1개가 시 스택으로 남았습니다.';
    if (stage === 'arch') text += ' 좁은 곶에는 시 아치가 아직 서 있습니다.';
    if (stage === 'cave') text += ' 좁은 곶의 해식 동굴은 아직 반대쪽까지 뚫리지 않았습니다.';
    return text;
  }
  if (m.clock < 6) return '파랑은 얕은 곳에서 느려집니다. 곶 앞이 먼저 얕아지므로 파봉선이 휘어 해안선을 닮고, 진행 방향선은 곶으로 모이고 만에서는 퍼집니다. 이것이 파랑의 굴절입니다.';
  if (m.cliffCaveAt >= 0 && m.clock - m.cliffCaveAt < 9) return CLIFF_CAVE_NOTE;
  const ev = m.arch.event;
  if (ev && m.clock - ev.at < 9) return archNote(ev.name);
  if (m.stacks.length) return '잘 깎이지 않는 바위는 주변 암석이 먼저 깎이면 육지와 떨어져 남습니다. 이것이 시 스택입니다. 절벽은 그 뒤로 계속 물러나고, 시 스택도 오랜 시간이 지나면 깎여 사라집니다.';
  if (m.platformWidth() >= 8 && m.clock > 25) return '해식애가 물러난 자리에 평평한 파식대가 넓어집니다. 파랑이 얕은 파식대를 건너며 바닥에 힘을 빼앗기므로 해식애가 물러나는 빠르기는 점점 느려집니다.';
  if (m.deposited > 30 && m.clock > 14) return '곶 앞은 파랑이 모여 수면이 조금 높고 만 앞은 낮아, 물이 곶에서 만 쪽으로 흐릅니다. 이 연안류가 곶에서 깎인 모래를 만으로 옮겨 모래 해안을 만듭니다.';
  return '곶에는 파랑 에너지가 모여 해수면 높이의 절벽 아래가 파이고 위쪽이 무너집니다. 이렇게 생긴 바닷가 절벽이 해식애입니다.';
}

export function compareBrief(a, b) {
  const t = m => `곶이 평균 ${Math.round(m.retreat())}칸 물러남, 파식대 폭 ${m.platformWidth()}칸`;
  return { a: t(a), b: t(b) };
}
