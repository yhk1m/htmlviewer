// © 2026 김용현
// 자유 곡류 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 강을 중심선 점들로 두고, 굽이 바깥쪽으로 옮긴다. 옮긴 결과로 땅이 깎이고(바깥쪽) 쌓인다(안쪽). 목이 닿으면 끊어 우각호를 만든다.
// 지형 계산에는 사칙연산과 제곱근, 내림만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 혼돈 계산이 갈라진다.

export const N = 320;
export const DT = 1 / 30;
export const T_END = 95;
export const WORKS_AT = 62; // 직강 공사를 시작하는 시각
const DIG_SECONDS = 4;
const DS = 2.5; // 중심선 점 간격(칸)
const MID = N / 2;
const FREE = 0.75; // 평소 수면에서 둑 위까지
const PLAIN = 3; // 들판 높이의 기준
const VALLEY = [46, N - 46]; // 들판의 남북 경계(이 밖은 낮은 산)
const HOLD_SECONDS = 2.5; // 목이 끊긴 뒤 잠시 멈춰 보여 준다.
const FILL_SECONDS = 30; // 우각호가 메워지는 시간
const MARSH_FROM = 0.6; // 메워진 정도가 이보다 크면 습지
const STAMP_EVERY = 3;
const NECK_EVERY = 4;
const RESAMPLE_EVERY = 6;
const MAX_NODES = 2400;
const WOBBLE_PERIOD = 26;
const FILL_SHARE = 0.84; // 다 메워져도 옛 물길 자리는 이만큼 덜 차서 조금 낮게 남는다.

// 굽이 계산 값. 위쪽(상류)에서 이어받은 굽은 정도의 영향이 하류로 갈수록 줄어든다.
// 값을 곡류 파장이 강폭의 약 10배가 되게 맞췄다. 파장 = 8.26 × 영향 거리.
const LOCAL = -1, UPSTREAM = 2.5, REACH_IN_HALFWIDTHS = 2.42;
const SATURATE = 0.16;

export const FLOW = {
  low: { name: '작음', W: 3, depth: 0.95, vmax: 1.6 },
  mid: { name: '보통', W: 4, depth: 1.25, vmax: 2.15 },
  high: { name: '많음', W: 5.5, depth: 1.65, vmax: 2.9 },
};
export const SLOPE = {
  gentle: { name: '완만', drop: 0.7, lateral: 1 },
  mid: { name: '보통', drop: 1.4, lateral: 0.68 },
  steep: { name: '급함', drop: 2.6, lateral: 0.34 },
};
export const PRESETS = {
  textbook: { flow: 'mid', slope: 'gentle', works: 'no' },
  big: { flow: 'high', slope: 'gentle', works: 'no' },
  steep: { flow: 'mid', slope: 'steep', works: 'no' },
  works: { flow: 'mid', slope: 'gentle', works: 'yes' },
};

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const PI = 3.141592653589793;
// 수학 함수를 쓰지 않는 사인 근사(값이 어디서나 같다).
function psin(a) {
  let x = a - Math.floor(a / (2 * PI)) * 2 * PI, s = 1;
  if (x > PI) { x -= PI; s = -1; }
  const u = x * (PI - x);
  return s * (16 * u) / (5 * PI * PI - 4 * u);
}
function makeRng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// 잔 값 격자를 부드럽게 이은 지면 저항. 굽이가 불규칙해진다.
function makeNoise(seed, cell) {
  const r = makeRng(seed * 7919 + 13), M = Math.ceil(N / cell) + 3, g = new Float64Array(M * M);
  for (let k = 0; k < g.length; k++) g[k] = r();
  const ease = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const u = clamp(x + cell, 0, (M - 2) * cell) / cell, v = clamp(y + cell, 0, (M - 2) * cell) / cell;
    const i = Math.floor(u), j = Math.floor(v), a = ease(u - i), b = ease(v - j);
    return (g[j * M + i] * (1 - a) + g[j * M + i + 1] * a) * (1 - b) + (g[(j + 1) * M + i] * (1 - a) + g[(j + 1) * M + i + 1] * a) * b;
  };
}

export function createModel(seed = 42) {
  const size = N * N;
  const h = new Float32Array(size), ground = new Float32Array(size), plain = new Float32Array(size), hill = new Float32Array(size);
  const lakeDepth = new Float32Array(size), barAt = new Float32Array(size), levee = new Float32Array(size), bankAt = new Float32Array(size);
  const inCh = new Uint8Array(size), wasCh = new Uint8Array(size), gen = new Int32Array(size), nearest = new Int32Array(size), lakeOf = new Int16Array(size), dug = new Uint8Array(size);
  const best = new Float32Array(size), touched = new Int32Array(size), dirtyFlag = new Uint8Array(size), dirtyList = new Int32Array(size), skew = new Float32Array(size), side = new Float32Array(size);
  const x = new Float64Array(MAX_NODES), y = new Float64Array(MAX_NODES), cv = new Float64Array(MAX_NODES), tmp = new Float64Array(MAX_NODES), r0 = new Float64Array(MAX_NODES), r1 = new Float64Array(MAX_NODES), arc = new Float64Array(MAX_NODES);
  const tx = new Float64Array(MAX_NODES), ty = new Float64Array(MAX_NODES);

  const PARTICLES = 70, PATH = 26;
  const pState = new Uint8Array(PARTICLES), pLife = new Float32Array(PARTICLES), px = new Float32Array(PARTICLES), py = new Float32Array(PARTICLES);
  const pPath = new Float32Array(PARTICLES * PATH * 2), pLen = new Uint8Array(PARTICLES), pEndInner = new Int8Array(PARTICLES);

  const m = {
    PARTICLES, pState, px, py, h, ground, plain, hill, inCh, lakeOf, lakeDepth, barAt, levee, bankAt, skew, side, dug, seed,
    x, y, cv, arc, n: 0, lakes: [], options: { ...PRESETS.textbook },
    clock: 0, finished: false, cutoffs: 0, lastCut: null, hold: 0, neck: null, bend: null,
    works: { state: 'none', digX: 0, at: 0 }, flowPhase: 0, erodedTotal: 0, depositedTotal: 0,
    dirtyList, dirtyCount: 0, allDirty: true, peak: 0,
    lengthHistory: [],
  };
  let acc = 0, stepNo = 0, generation = 0, noise, W, depth, lateral, vmax, reach, g, drop, grainCooldown = 0, lakeTimer = 0, lastBend = null;

  const touch = k => { if (!dirtyFlag[k]) { dirtyFlag[k] = 1; dirtyList[m.dirtyCount++] = k; } };
  m.consumeDirty = () => { for (let i = 0; i < m.dirtyCount; i++) dirtyFlag[dirtyList[i]] = 0; const c = m.dirtyCount; m.dirtyCount = 0; return c; };

  const baseAt = gx => PLAIN + drop * (0.5 - gx / N);

  function buildGround() {
    const hillNoise = makeNoise(seed + 5, 22), fine = makeNoise(seed + 9, 7), edge = makeNoise(seed + 3, 40);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      // 들판 가장자리는 낮은 산이다. 경계를 조금 구불구불하게 해 자연스럽게 한다.
      const wiggle = (edge(i, j) - 0.5) * 22;
      const d = Math.max(VALLEY[0] + wiggle - j, j - VALLEY[1] - wiggle);
      const t = clamp(d / 34);
      hill[k] = smooth(0, 0.5, t);
      const rise = t * t * (3 - 2 * t) * (9 + hillNoise(i, j) * 7);
      plain[k] = baseAt(i) + rise + (fine(i, j) - 0.5) * 0.07;
      ground[k] = plain[k];
      h[k] = plain[k];
    }
  }

  function buildRiver() {
    // 들판에 거의 곧게, 아주 조금 굽은 강에서 시작한다. 파장은 강폭의 약 10배, 잔물결을 조금 더한다.
    const r = makeRng(seed * 31 + 7), lambda = 20 * W, ph1 = r() * 2 * PI, ph2 = r() * 2 * PI, ph3 = r() * 2 * PI;
    const a1 = W * 1.25;
    m.n = 0;
    for (let px0 = -45; px0 <= N + 45; px0 += DS) {
      const fade = smooth(0, 42, Math.min(px0 + 20, N + 20 - px0));
      const fadeIn = smooth(12, 60, px0), off = fadeIn * a1 * psin((2 * PI * px0) / lambda + ph1) + fadeIn * a1 * 0.3 * psin((2 * PI * px0) / (lambda * 0.62) + ph2) + fadeIn * a1 * 0.22 * psin((2 * PI * px0) / (lambda * 1.55) + ph3);
      x[m.n] = px0; y[m.n] = MID + off * fade; m.n++;
    }
  }

  function computeShape() {
    const n = m.n;
    tx[0] = x[1] - x[0]; ty[0] = y[1] - y[0];
    for (let i = 1; i < n - 1; i++) {
      const ax = x[i] - x[i - 1], ay = y[i] - y[i - 1], bx = x[i + 1] - x[i], by = y[i + 1] - y[i], cx = ax + bx, cy = ay + by;
      const la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by), lc = Math.sqrt(cx * cx + cy * cy);
      cv[i] = (lc > 1e-6 && la > 1e-6 && lb > 1e-6) ? (2 * (ax * by - ay * bx)) / (la * lb * lc) : 0;
      tx[i] = lc > 1e-6 ? cx / lc : 1; ty[i] = lc > 1e-6 ? cy / lc : 0;
    }
    tx[n - 1] = tx[n - 2]; ty[n - 1] = ty[n - 2]; cv[0] = cv[n - 1] = 0;
    for (let pass = 0; pass < 4; pass++) {
      tmp.set(cv.subarray(0, n));
      for (let i = 1; i < n - 1; i++) cv[i] = (tmp[i - 1] + 2 * tmp[i] + tmp[i + 1]) / 4;
    }
    arc[0] = 0;
    for (let i = 1; i < n; i++) { const dx = x[i] - x[i - 1], dy = y[i] - y[i - 1]; arc[i] = arc[i - 1] + Math.sqrt(dx * dx + dy * dy); }
  }

  // 옆으로 옮겨 가는 빠르기의 제한. 블록 가장자리와 산에서는 옮겨 가지 못한다.
  function freedom(px0, py0, ny) {
    const ends = clamp(Math.min(px0, N - px0) / 34);
    const room = ny < 0 ? py0 - VALLEY[0] : VALLEY[1] - py0;
    return ends * clamp((room - 6) / 22);
  }

  function migrate(dt) {
    const n = m.n;
    computeShape();
    for (let i = 0; i < n; i++) { const c = cv[i] * W, a = c < 0 ? -c : c; r0[i] = c / (SATURATE + a); }
    let s = 0;
    for (let i = 0; i < n; i++) { r1[i] = LOCAL * r0[i] + UPSTREAM * s; s = s * g + r0[i] * (1 - g); }
    for (let i = 1; i < n - 1; i++) {
      // 왼쪽 법선이 (-ty, tx)이고 곡률이 양수면 왼쪽으로 돈다. 바깥은 오른쪽이다.
      const v = r1[i] * vmax * lateral * (0.7 + 0.6 * noise(x[i], y[i]));
      const nx = ty[i], ny = -tx[i]; // 바깥쪽 방향(곡률 양수일 때)
      const dirY = v >= 0 ? ny : -ny, f = freedom(x[i], y[i], dirY);
      x[i] += nx * v * f * dt; y[i] += ny * v * f * dt;
    }
    // 상류 끝에서 물길이 천천히 좌우로 흔들린다. 굽이가 하류로 옮겨 가도 새 굽이가 계속 생기게 한다.
    const wobble = W * 1.7 * psin((2 * PI * m.clock) / WOBBLE_PERIOD);
    for (let i = 0; i < n && x[i] < 12; i++) y[i] = MID + wobble * clamp((x[i] + 30) / 42);
  }

  function resample() {
    const n = m.n;
    computeShape();
    const total = arc[n - 1], want = Math.max(2, Math.round(total / DS)), step = total / want;
    const nx = new Float64Array(want + 1), ny = new Float64Array(want + 1);
    let seg = 0;
    for (let q = 0; q <= want; q++) {
      const s = q === want ? total : q * step;
      while (seg < n - 2 && arc[seg + 1] < s) seg++;
      const span = arc[seg + 1] - arc[seg], t = span > 1e-9 ? (s - arc[seg]) / span : 0;
      nx[q] = x[seg] + (x[seg + 1] - x[seg]) * t; ny[q] = y[seg] + (y[seg + 1] - y[seg]) * t;
    }
    m.n = Math.min(MAX_NODES, want + 1);
    x.set(nx.subarray(0, m.n)); y.set(ny.subarray(0, m.n));
  }

  // 목 찾기: 물길을 따라서는 멀지만 땅에서는 가까운 두 점.
  function findNeck() {
    const n = m.n, skip = Math.ceil((W * 2 * 4.5) / DS);
    let bestD = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < n - skip; i += 2) {
      if (x[i] < 8 || x[i] > N - 8) continue;
      for (let j = i + skip; j < n; j += 2) {
        const dx = x[j] - x[i], dy = y[j] - y[i], d = dx * dx + dy * dy;
        if (d < bestD && (arc[j] - arc[i]) * (arc[j] - arc[i]) >= 9 * d) { bestD = d; bi = i; bj = j; }
      }
    }
    if (bi < 0) { m.neck = null; return; }
    const d = Math.sqrt(bestD), cut = W * 2 * 1.18;
    m.neck = { d, gap: d - W * 2, cut, i: bi, j: bj, x: (x[bi] + x[bj]) / 2, y: (y[bi] + y[bj]) / 2 };
    if (d <= cut && m.hold <= 0 && m.works.state === 'none') cutNeck(bi, bj);
  }

  function cutNeck(i, j) {
    const nodes = [];
    for (let q = i; q <= j; q++) nodes.push([x[q], y[q]]);
    const neckAt = { x: (x[i] + x[j]) / 2, y: (y[i] + y[j]) / 2, clock: m.clock };
    const before = arc[m.n - 1];
    m.peak = Math.max(m.peak, inBlockLength() / N);
    // 끊어 낸 굽이를 지우고 두 점을 잇는다.
    const n = m.n, removed = j - i - 1;
    x.copyWithin(i + 1, j, n); y.copyWithin(i + 1, j, n);
    m.n = n - removed;
    resample();
    // 이어진 자리의 뾰족한 꺾임을 조금 편다.
    let c = 0, cd = Infinity;
    for (let q = 0; q < m.n; q++) { const dx = x[q] - neckAt.x, dy = y[q] - neckAt.y, d = dx * dx + dy * dy; if (d < cd) { cd = d; c = q; } }
    const reachNodes = Math.round((W * 3) / DS);
    for (let pass = 0; pass < 14; pass++) {
      const a = Math.max(1, c - reachNodes), b = Math.min(m.n - 2, c + reachNodes);
      for (let q = a; q <= b; q++) { tmp[q] = (x[q - 1] + x[q + 1]) / 2; r0[q] = (y[q - 1] + y[q + 1]) / 2; }
      for (let q = a; q <= b; q++) { x[q] += (tmp[q] - x[q]) * 0.5; y[q] += (r0[q] - y[q]) * 0.5; }
    }
    computeShape();
    addLake(nodes, m.clock);
    m.cutoffs++;
    m.hold = HOLD_SECONDS;
    m.lastCut = { ...neckAt, length: before - arc[m.n - 1] };
    m.neck = null;
    lastBend = null;
    stamp(); // 끊긴 굽이의 칸을 바로 물길에서 뺀다.
  }

  function addLake(nodes, born) {
    const id = m.lakes.length + 1;
    if (id >= 32000) return;
    // 넓이 계산은 끝이 막힌 초승달 모양: 양쪽 끝 쪽으로 갈수록 좁아진다.
    const count = nodes.length;
    let minPlain = Infinity;
    const lake = { id, nodes, born, fill: 0, cells: [], alive: new Uint8Array(count).fill(1), width: W, level: 0 };
    const stampR = W + 1;
    const distBest = new Map();
    for (let q = 0; q < count; q++) {
      const t = q / (count - 1), taper = smooth(0, 0.14, Math.min(t, 1 - t));
      const [px0, py0] = nodes[q];
      const i0 = Math.round(px0), j0 = Math.round(py0);
      if (i0 >= 0 && i0 < N && j0 >= 0 && j0 < N) minPlain = Math.min(minPlain, plain[j0 * N + i0]);
      const rr = Math.ceil(stampR);
      for (let j = j0 - rr; j <= j0 + rr; j++) for (let i = i0 - rr; i <= i0 + rr; i++) {
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        const k = j * N + i, dx = i - px0, dy = j - py0, d = Math.sqrt(dx * dx + dy * dy);
        if (d > W) continue;
        const u = d / W, want = (FREE + depth * 0.8) * (1 - u * u) * taper;
        const old = distBest.get(k);
        if (old === undefined || want > old) distBest.set(k, want);
      }
    }
    if (minPlain === Infinity) minPlain = PLAIN;
    lake.level = minPlain - FREE * 0.82;
    for (const [k, want] of distBest) {
      if (want < 0.02) { continue; }
      lakeDepth[k] = want; lakeOf[k] = id; lake.cells.push(k);
    }
    m.lakes.push(lake);
    return lake;
  }

  function stamp() {
    generation++;
    const n = m.n, R = W + 1.2, rr = Math.ceil(R), R2 = R * R;
    let t = 0;
    computeShape();
    for (let q = 0; q < n; q++) {
      const px0 = x[q], py0 = y[q];
      if (px0 < -rr || px0 > N + rr || py0 < -rr || py0 > N + rr) continue;
      const i0 = Math.round(px0), j0 = Math.round(py0);
      for (let j = j0 - rr; j <= j0 + rr; j++) {
        if (j < 0 || j >= N) continue;
        for (let i = i0 - rr; i <= i0 + rr; i++) {
          if (i < 0 || i >= N) continue;
          const k = j * N + i, dx = i - px0, dy = j - py0, d2 = dx * dx + dy * dy;
          if (d2 > R2) continue;
          if (gen[k] !== generation) { gen[k] = generation; best[k] = d2; nearest[k] = q; touched[t++] = k; }
          else if (d2 < best[k]) { best[k] = d2; nearest[k] = q; }
        }
      }
    }
    wasCh.set(inCh); inCh.fill(0);
    const W2 = W * W;
    for (let a = 0; a < t; a++) {
      const k = touched[a];
      if (best[k] <= W2) inCh[k] = 1;
    }
    for (let a = 0; a < t; a++) {
      const k = touched[a];
      const i = k % N, j = (k / N) | 0, q = nearest[k];
      if (!inCh[k]) { if (wasCh[k]) leave(k); continue; }
      const nx = -ty[q], ny = tx[q], lat = ((i - x[q]) * nx + (j - y[q]) * ny) / W; // 왼쪽이 양수
      const c = cv[q], sk = clamp((c < 0 ? -c : c) * W * 3.2), outer = c > 0 ? -lat : lat; // outer는 바깥쪽이 +1
      skew[k] = sk; side[k] = outer;
      const v = outer < -1 ? -1 : outer > 1 ? 1 : outer, sym = 1 - v * v, tilt = ((1 + v) * (1 + v) * (1 + v) * (1 - v)) / 1.6875;
      const shape = sym * (1 - sk) + tilt * sk;
      const d = (FREE + depth) * shape;
      if (!wasCh[k]) {
        // 물길이 새로 닿은 칸: 강둑이 깎인다. 옛 우각호 칸이면 우각호에서 빠진다.
        m.erodedTotal++;
        bankAt[k] = m.clock;
        if (lakeOf[k]) { lakeDepth[k] = 0; lakeOf[k] = 0; }
        ground[k] = plain[k];
        barAt[k] = 0;
        maybeGrain(i, j, q);
      }
      const nh = ground[k] - d;
      if (nh !== h[k]) { h[k] = nh; touch(k); }
    }
    // 앞 stamp에서 물길이었는데 이번 후보 칸에도 들지 못한 칸
    for (let k = 0; k < size; k++) if (wasCh[k] && !inCh[k] && gen[k] !== generation) leave(k);
  }

  // 물길이 떠난 칸. 우각호나 공사로 떠난 칸은 호수 쪽이 맡고, 나머지는 안쪽에 쌓인 모래다.
  function leave(k) {
    const iNew = lakeOf[k];
    if (iNew) { const lk = m.lakes[iNew - 1]; h[k] = ground[k] - lakeDepth[k] * (1 - lk.fill * FILL_SHARE); touch(k); return; }
    m.depositedTotal++;
    barAt[k] = Math.max(0.001, m.clock);
    // 그 무렵의 강둑 자리에 모래 능선이, 그 사이에 낮은 땅이 남는다(곡류 흔적).
    const phase = m.clock / 2.2, frac = phase - Math.floor(phase), tri = frac < 0.5 ? frac * 2 : 2 - frac * 2;
    ground[k] = plain[k] - 0.2 + tri * 0.26;
    h[k] = ground[k];
    touch(k);
  }

  function maybeGrain(i, j, q) {
    if (grainCooldown > 0) return;
    let slot = -1;
    for (let p = 0; p < PARTICLES; p++) if (pState[p] === 0) { slot = p; break; }
    if (slot < 0) return;
    const c0 = cv[q];
    if (c0 > -1e-4 && c0 < 1e-4) return;
    // 다음 굽이 안쪽까지 물길을 따라 내려간다. 다음 굽이는 곡률 부호가 반대다.
    let best2 = -1, bestC = 0;
    const limit = Math.min(m.n - 2, q + Math.round((W * 2 * 9) / DS));
    for (let z = q + 2; z < limit; z++) {
      if ((cv[z] > 0) === (c0 > 0)) { if (best2 >= 0) break; continue; }
      const a = cv[z] < 0 ? -cv[z] : cv[z];
      if (a > bestC) { bestC = a; best2 = z; }
    }
    if (best2 < 0 || bestC * W < 0.08) return;
    grainCooldown = 0.12;
    const count = Math.min(PATH, Math.max(4, best2 - q + 1));
    pLen[slot] = count;
    for (let u = 0; u < count; u++) {
      const f = u / (count - 1), z = q + Math.round((best2 - q) * f), nx = -ty[z], ny = tx[z];
      // 처음에는 깎인 둑(바깥)에서, 끝에서는 다음 굽이 안쪽 둑으로 옮겨 간다.
      const startSide = c0 > 0 ? -1 : 1, endSide = cv[best2] > 0 ? 1 : -1;
      const off = (startSide * (1 - f) + endSide * f) * W * 0.8;
      pPath[(slot * PATH + u) * 2] = x[z] + nx * off;
      pPath[(slot * PATH + u) * 2 + 1] = y[z] + ny * off;
    }
    pState[slot] = 1; pLife[slot] = 0; px[slot] = pPath[slot * PATH * 2]; py[slot] = pPath[slot * PATH * 2 + 1];
  }

  function moveGrains(dt) {
    const FLY = 2.6, REST = 1.4;
    for (let p = 0; p < PARTICLES; p++) {
      if (pState[p] === 0) continue;
      pLife[p] += dt;
      if (pState[p] === 1) {
        const f = clamp(pLife[p] / FLY) * (pLen[p] - 1), a = Math.floor(f), b = Math.min(pLen[p] - 1, a + 1), t = f - a;
        const ax = pPath[(p * PATH + a) * 2], ay = pPath[(p * PATH + a) * 2 + 1], bx = pPath[(p * PATH + b) * 2], by = pPath[(p * PATH + b) * 2 + 1];
        px[p] = ax + (bx - ax) * t; py[p] = ay + (by - ay) * t;
        if (pLife[p] >= FLY) { pState[p] = 2; pLife[p] = 0; }
      } else if (pLife[p] >= REST) pState[p] = 0;
    }
  }

  function updateLakes(dt) {
    lakeTimer += dt;
    if (lakeTimer < 0.5) return;
    const add = lakeTimer / FILL_SECONDS;
    lakeTimer = 0;
    for (const lake of m.lakes) {
      if (lake.fill >= 1) continue;
      lake.fill = Math.min(1, lake.fill + add);
      for (let a = 0; a < lake.cells.length; a++) {
        const k = lake.cells[a];
        if (lakeOf[k] !== lake.id || inCh[k]) continue;
        const nh = ground[k] - lakeDepth[k] * (1 - lake.fill * FILL_SHARE);
        if (nh !== h[k]) { h[k] = nh; touch(k); }
      }
    }
    // 물길이 지나간 호수 점은 지운다.
    for (const lake of m.lakes) for (let q = 0; q < lake.nodes.length; q++) {
      if (!lake.alive[q]) continue;
      const i = Math.round(lake.nodes[q][0]), j = Math.round(lake.nodes[q][1]);
      if (i >= 0 && j >= 0 && i < N && j < N && inCh[j * N + i]) lake.alive[q] = 0;
    }
  }

  function updateBend() {
    const n = m.n;
    if (m.works.state === 'dig') return;
    if (m.works.state === 'done') {
      const reachS = W * 2.6, cx = N / 2;
      m.bend = { i: Math.floor(m.n / 2), x: cx, y: MID, c: 0, strength: 0, inX: 0, inY: 1, straight: true, stage: m.stageAt(Math.floor(m.n / 2)), ax: cx, ay: MID - reachS, bx: cx, by: MID + reachS, outerBank: { x: cx, y: MID - W - 3 }, innerBank: { x: cx, y: MID + W + 3 } };
      return;
    }
    // 지금 가장 크게 굽은 곳. 앞서 고른 굽이가 살아 있으면 그대로 따라간다.
    let at = -1, top = 0, keep = -1, keepTop = 0;
    for (let i = 3; i < n - 3; i++) {
      if (x[i] < 50 || x[i] > N - 50 || y[i] < VALLEY[0] + 12 || y[i] > VALLEY[1] - 12) continue;
      const a = cv[i] < 0 ? -cv[i] : cv[i];
      if (a < (cv[i - 1] < 0 ? -cv[i - 1] : cv[i - 1]) || a < (cv[i + 1] < 0 ? -cv[i + 1] : cv[i + 1])) continue;
      if (a > top) { top = a; at = i; }
      if (lastBend) {
        const dx = x[i] - lastBend.x, dy = y[i] - lastBend.y;
        if (dx * dx + dy * dy < 15 * 15 && a > keepTop && (cv[i] > 0) === lastBend.sign) { keepTop = a; keep = i; }
      }
    }
    const use = keep >= 0 && keepTop * W > 0.1 ? keep : at;
    if (use < 0) { m.bend = null; return; }
    // 깎임은 굽이 꼭대기보다 조금 하류 쪽에서 가장 세다. 단면은 그 자리를 자른다.
    const c = cv[use], s = c > 0 ? 1 : -1;
    let q = use + Math.round((W * 2.5) / DS);
    if (q >= n - 1 || (cv[q] > 0) !== (c > 0)) q = use;
    const nx = -ty[q], ny = tx[q]; // 왼쪽 법선. 곡률 양수면 왼쪽이 안쪽이다.
    const inX = nx * s, inY = ny * s, reachOut = W * 2.6, reachIn = W * 2.6;
    m.bend = { i: q, x: x[q], y: y[q], c, strength: (c < 0 ? -c : c) * W, inX, inY, stage: m.stageAt(q),
      ax: x[q] - inX * reachOut, ay: y[q] - inY * reachOut, bx: x[q] + inX * reachIn, by: y[q] + inY * reachIn,
      outerBank: sideSpot(use, 4.5, s, -1), innerBank: sideSpot(use, 0.5, s, 1) };
    lastBend = { x: x[use], y: y[use], sign: c > 0 };
  }

  // 굽이의 강둑 위 이름표 자리. 둘 다 깎임이 센 하류 쪽에 둔다. side가 -1이면 바깥 강둑, 1이면 안쪽 강둑이다.
  function sideSpot(at, widths, s, sideSign) {
    let q = at + Math.round((W * widths) / DS);
    if (q < 1 || q >= m.n - 1 || (cv[q] > 0) !== (s > 0)) q = at;
    // 물길이나 호수 칸이 아닌 첫 땅을 찾는다. 이웃 물길이 붙어 있어 땅이 없으면 이름을 붙이지 않는다.
    for (let d = W + 1.5; d < W + 7; d += 1) {
      const off = sideSign * s * d, gx = x[q] - ty[q] * off, gy = y[q] + tx[q] * off, k = Math.round(gy) * N + Math.round(gx);
      if (k < 0 || k >= size) return null;
      if (!inCh[k] && !lakeOf[k]) return { x: gx, y: gy };
    }
    return null;
  }

  // 직강 공사: 상류에서 하류로 곧은 물길을 파고 양쪽에 둑을 쌓는다. 다 파면 물이 새 물길로 돌아서고 옛 굽이는 끊긴다.
  function runWorks(dt) {
    const w = m.works;
    if (w.state === 'none') {
      if (m.options.works === 'yes' && m.clock >= WORKS_AT) { w.state = 'dig'; w.digX = 0; w.at = m.clock; }
      return;
    }
    if (w.state !== 'dig') return;
    const prev = w.digX;
    w.digX = Math.min(N, w.digX + (N / DIG_SECONDS) * dt);
    for (let i = Math.floor(prev); i < Math.floor(w.digX + 1) && i < N; i++) digColumn(i);
    if (w.digX >= N) finishWorks();
  }
  const dugAt = gy => { const d = gy - MID; return d < 0 ? -d : d; };
  function digColumn(i) {
    for (let j = 0; j < N; j++) {
      const d = dugAt(j), k = j * N + i;
      if (d > W + 5) continue;
      lakeOf[k] = 0; lakeDepth[k] = 0; barAt[k] = 0; side[k] = 0; skew[k] = 0;
      if (d <= W) {
        dug[k] = 1;
        const u = d / W, bed = (FREE + depth) * (1 - u * u * u * u);
        ground[k] = plain[k]; h[k] = ground[k] - bed; touch(k);
      } else {
        const t = (d - W) / 5, lift = t < 0.3 ? t / 0.3 : (1 - t) / 0.7;
        levee[k] = lift;
        ground[k] = plain[k] + lift * 0.9; h[k] = inCh[k] ? h[k] : ground[k]; touch(k);
      }
    }
  }
  function finishWorks() {
    const n = m.n;
    computeShape();
    // 옛 물길을 곧은 물길 앞뒤로 나누어 호수로 남긴다.
    let run = [];
    const flush = () => { if (run.length * DS > W * 2 * 2.5) addLake(run, m.clock); run = []; };
    for (let q = 0; q < n; q++) {
      const inside = x[q] > -2 && x[q] < N + 2, far = dugAt(y[q]) > W + 7;
      if (inside && far) run.push([x[q], y[q]]); else flush();
    }
    flush();
    // 곧은 물길로 바꾼다.
    m.n = 0;
    for (let px0 = -45; px0 <= N + 45; px0 += DS) { x[m.n] = px0; y[m.n] = MID; m.n++; }
    m.works.state = 'done';
    m.works.done = m.clock;
    wasCh.fill(0);
    // 호수에 들지 못한 옛 물길 칸은 메운다.
    for (let k = 0; k < size; k++) {
      if (inCh[k] && !lakeOf[k] && !dug[k]) { ground[k] = plain[k] - 0.12; h[k] = ground[k]; touch(k); barAt[k] = Math.max(0.001, m.clock); }
      else if (inCh[k] && lakeOf[k]) { h[k] = ground[k] - lakeDepth[k]; touch(k); }
    }
    inCh.fill(0);
    computeShape();
    stampStraight();
    // 옛 물길이 지나던 자리에도 곧은 물길과 둑은 그대로 만든다.
    for (let i = 0; i < N; i++) digColumn(i);
    updateBend();
  }
  function stampStraight() {
    for (let j = 0; j < N; j++) { const d = dugAt(j); if (d <= W) for (let i = 0; i < N; i++) inCh[j * N + i] = 1; }
  }

  function step() {
    const dt = DT;
    m.clock += dt; stepNo++;
    if (grainCooldown > 0) grainCooldown -= dt;
    if (m.hold > 0) m.hold -= dt;
    m.flowPhase = (m.flowPhase + dt * 0.09 * m.flowSpeed()) % 1;
    const wstate = m.works.state;
    if (wstate === 'none' && m.hold <= 0) migrate(dt);
    runWorks(dt);
    if (m.works.state === 'none' || m.works.state === 'dig') {
      if (stepNo % RESAMPLE_EVERY === 0) resample();
      if (stepNo % NECK_EVERY === 0) { computeShape(); findNeck(); }
      if (stepNo % STAMP_EVERY === 0) stamp();
    } else computeShape();
    if (stepNo % 12 === 0) updateBend();
    updateLakes(dt);
    moveGrains(dt);
    if (stepNo % 60 === 0) { const L = inBlockLength(); m.lengthHistory.push({ t: m.clock, L }); if (m.works.state === 'none') m.peak = Math.max(m.peak, L / N); }
    if (m.clock >= T_END) m.finished = true;
  }

  function inBlockLength() {
    let L = 0;
    for (let i = 1; i < m.n; i++) if (x[i] >= 0 && x[i - 1] >= 0 && x[i] <= N && x[i - 1] <= N) { const dx = x[i] - x[i - 1], dy = y[i] - y[i - 1]; L += Math.sqrt(dx * dx + dy * dy); }
    return L;
  }

  m.inBlockLength = inBlockLength;
  m.sinuosity = () => inBlockLength() / N;
  // 물 빠르기: 물길의 경사(높이 차 / 물길 길이)의 제곱근에 비례한다고 본다. 완만한 들판의 곧은 강을 1로 둔다.
  m.flowSpeed = () => Math.sqrt((drop / Math.max(1, inBlockLength())) / (SLOPE.gentle.drop / N));
  m.channelSlope = () => drop / Math.max(1, inBlockLength());
  m.W = () => W;
  m.drop = () => drop;
  m.stageAt = i => { const L = arc[m.n - 1] || 1; return baseAt(x[0]) - FREE + (baseAt(x[m.n - 1]) - baseAt(x[0])) * (arc[i] / L); };
  m.tangent = i => [tx[i], ty[i]];
  m.lakeWidthAt = (lake, q) => {
    const c = lake.nodes.length, t = q / (c - 1), taper = smooth(0, 0.14, Math.min(t, 1 - t));
    return lake.width * 0.86 * taper * Math.sqrt(Math.max(0, 1 - lake.fill)) ;
  };

  m.sample = (gx, gy) => {
    const u = clamp(gx, 0, N - 1.001), v = clamp(gy, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + N] * (1 - a) + h[k + N + 1] * a) * b;
  };
  m.waterMask = () => {
    const out = new Float32Array(size);
    for (let k = 0; k < size; k++) if (inCh[k]) out[k] = 1;
    for (const lake of m.lakes) if (lake.fill < MARSH_FROM) for (let a = 0; a < lake.cells.length; a++) { const k = lake.cells[a]; if (lakeOf[k] === lake.id && lakeDepth[k] > FREE * 0.8) out[k] = 1; }
    return out;
  };
  // 등고선용 높이. 곡류 흔적의 작은 오르내림은 등고선 간격보다 훨씬 작아 지도에서는 평평하게 둔다.
  m.mapHeight = () => {
    const out = new Float32Array(h);
    for (let k = 0; k < size; k++) if (barAt[k] > 0 && !inCh[k] && !lakeOf[k]) out[k] = plain[k];
    return out;
  };
  m.setOption = (name, val) => { m.options[name] = val; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };

  m.reset = () => {
    const f = FLOW[m.options.flow], s = SLOPE[m.options.slope];
    W = f.W; depth = f.depth; vmax = f.vmax; lateral = s.lateral; drop = s.drop;
    reach = REACH_IN_HALFWIDTHS * W; g = 1 - DS / reach;
    noise = makeNoise(seed, 34);
    acc = 0; stepNo = 0; m.clock = 0; m.finished = false; m.cutoffs = 0; m.lastCut = null; m.hold = 0; m.neck = null; m.bend = null; lastBend = null;
    m.peak = 0; m.works = { state: 'none', digX: 0, at: 0 }; m.lakes = []; m.flowPhase = 0; m.erodedTotal = 0; m.depositedTotal = 0; m.lengthHistory = [];
    grainCooldown = 0; lakeTimer = 0; generation = 0;
    lakeDepth.fill(0); barAt.fill(0); levee.fill(0); bankAt.fill(0); inCh.fill(0); wasCh.fill(0); gen.fill(0); lakeOf.fill(0); dug.fill(0); skew.fill(0); side.fill(0); pState.fill(0);
    dirtyFlag.fill(0); m.dirtyCount = 0; m.allDirty = true;
    buildGround();
    buildRiver();
    computeShape();
    stamp();
    wasCh.set(inCh);
    updateBend();
    m.consumeDirty();
    m.allDirty = true;
  };

  m.tick = seconds => {
    if (m.finished) return;
    acc += seconds;
    while (acc >= DT && !m.finished) { step(); acc -= DT; }
  };

  // 이름표 자리. 그 지형이 실제로 있는 칸만 고른다.
  m.spots = () => {
    const out = { up: { x: 16, y: MID }, down: { x: N - 16, y: MID }, plain: { x: N / 2, y: VALLEY[0] + 14 } };
    const n = m.n;
    for (let i = 0; i < n; i++) if (x[i] > N * 0.3) { out.river = { x: x[i], y: y[i] }; break; }
    const b = m.bend;
    if (b && !b.straight && b.strength > 0.14) {
      // 굽이 값은 잠깐씩 옛 값이므로 지금도 땅인 칸일 때만 이름을 붙인다.
      const land = q => { if (!q) return null; const k = Math.round(q.y) * N + Math.round(q.x); return k >= 0 && k < size && !inCh[k] && !lakeOf[k] ? q : null; };
      out.outer = land(b.outerBank); out.inner = land(b.innerBank); out.a = { x: b.ax, y: b.ay }; out.b = { x: b.bx, y: b.by };
      for (let d = W * 2.5; d < W * 10; d += 1) {
        const gx = Math.round(b.x + b.inX * d), gy = Math.round(b.y + b.inY * d);
        if (gx < 0 || gy < 0 || gx >= N || gy >= N) break;
        const k = gy * N + gx;
        if (inCh[k]) break;
        if (barAt[k] > 0 && !lakeOf[k]) { out.scroll = { x: gx, y: gy }; break; }
      }
    }
    if (b && b.straight) { out.a = { x: b.ax, y: b.ay }; out.b = { x: b.bx, y: b.by }; out.straight = { x: N * 0.68, y: MID }; out.levee = { x: N * 0.32, y: MID - W - 2 }; }
    if (m.works.state === 'none' && m.neck && m.neck.gap < W * 2.2 && m.hold <= 0) out.neck = { x: m.neck.x, y: m.neck.y };
    if (m.lastCut && m.clock - m.lastCut.clock < 6 && !m.finished) {
      // 끊긴 자리의 물길은 옮겨 가므로 가장 가까운 물길 점에 붙인다.
      let bd = Infinity, q = 0;
      for (let i = 0; i < n; i++) { const dx = x[i] - m.lastCut.x, dy = y[i] - m.lastCut.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; q = i; } }
      out.cut = { x: x[q], y: y[q] };
    }
    for (let l = m.lakes.length - 1; l >= 0; l--) {
      const lake = m.lakes[l], kind = lake.fill < MARSH_FROM ? 'lake' : lake.fill < 1 ? 'marsh' : 'old';
      if (out[kind]) continue;
      // 호수 가운데에서 가까운 살아 있는 점.
      const c = lake.nodes.length;
      for (let d = 0; d < c / 2; d++) for (const q of [Math.floor(c / 2) + d, Math.floor(c / 2) - d]) {
        if (out[kind] || q < 0 || q >= c || !lake.alive[q]) continue;
        const [gx, gy] = lake.nodes[q];
        if (gx >= 6 && gy >= 6 && gx < N - 6 && gy < N - 6 && lakeOf[Math.round(gy) * N + Math.round(gx)] === lake.id) out[kind] = { x: gx, y: gy };
      }
    }
    return out;
  };

  // 칸의 쓰임을 알려 준다(검사와 이름표에 쓴다).
  m.cellKind = k => {
    if (inCh[k]) return 'channel';
    if (lakeOf[k]) { const lk = m.lakes[lakeOf[k] - 1]; return lk.fill < MARSH_FROM ? 'lake' : lk.fill < 1 ? 'marsh' : 'old'; }
    if (barAt[k] > 0) return 'bar';
    if (levee[k] > 0) return 'levee';
    return hill[k] > 0.3 ? 'hill' : 'plain';
  };

  m.reset();
  return m;
}

// 지금 고른 굽이를 바깥(A)에서 안쪽(B)으로 자른 단면.
export function sectionProfile(m, samples = 240) {
  const b = m.bend;
  const out = { top: new Float32Array(samples), water: 0, bend: b };
  if (!b) return out;
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1);
    out.top[t] = m.sample(b.ax + (b.bx - b.ax) * f, b.ay + (b.by - b.ay) * f);
  }
  out.water = b.stage;
  out.kinds = new Array(samples);
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), k = Math.round(b.ay + (b.by - b.ay) * f) * N + Math.round(b.ax + (b.bx - b.ax) * f);
    out.kinds[t] = k >= 0 && k < N * N ? m.cellKind(k) : 'plain';
  }
  return out;
}

// 그때 일어나는 일을 적는다. 모두 계산 상태에서 고르므로 화면과 어긋나지 않는다.
export function noteText(m) {
  const flow = FLOW[m.options.flow], lastLake = m.lakes[m.lakes.length - 1];
  const size = m.options.flow === 'high' ? ' 유량이 많은 큰 강은 강폭이 넓어 굽이 하나도 큽니다.' : m.options.flow === 'low' ? ' 유량이 작은 강은 강폭이 좁아 굽이 하나도 작습니다.' : '';
  if (m.works.state === 'dig') return '직강 공사를 하고 있습니다. 농경지와 시가지를 넓히려고 상류에서 하류까지 곧은 물길을 파고 양쪽에 둑을 쌓습니다.';
  if (m.works.state === 'done') {
    if (m.finished) return '직강 공사가 끝났습니다. 물길이 짧아져 경사가 급해지고 물이 빨라졌습니다. 농경지와 시가지는 넓어지지만 하류의 홍수 위험이 커지고 강의 생태계가 망가질 수 있습니다.';
    return '물이 곧은 물길로 돌아섰습니다. 길이가 짧아진 만큼 경사가 급해져 물이 빨라집니다. 끊긴 옛 굽이는 구하도가 되고, 물이 고인 곳은 우각호로 남습니다.';
  }
  if (m.finished) {
    if (m.cutoffs === 0) return m.options.slope === 'steep' ? '경사가 급한 들판에서는 아래로 깎는 힘이 커지고 옆으로 깎는 비중(측방 침식)이 줄어든다고 가정했습니다. 그래서 굽이가 덜 자라고 목이 끊기지 않았습니다.' : `이 시간 안에는 목이 끊기지 않았습니다.${size}`;
    const old = m.lakes.some(l => l.fill >= 1);
    return `굽이가 자라고 목이 끊기기를 ${m.cutoffs}번 되풀이했습니다. 끊긴 옛 물길이 구하도이고, 거기에 물이 고이면 우각호입니다.${old ? ' 우각호가 메워져도 구하도의 흔적은 남습니다.' : ''}${size}`;
  }
  if (m.hold > 0 && m.lastCut) return '목이 끊겼습니다. 물은 짧은 새 물길로 곧장 흐르고, 옛 굽이는 물길에서 떨어져 나갑니다.';
  if (lastLake && m.clock - lastLake.born < 8) return '끊긴 옛 굽이는 이제 물이 흐르지 않는 구하도입니다. 양쪽 끝이 모래로 막히고 고인 물이 소뿔이나 초승달 모양으로 남으면 우각호라고 합니다.';
  const MARSH_NOTE = '우각호는 평소에는 강과 떨어져 있지만, 큰물이 넘칠 때 들어온 고운 흙과 물풀이 쌓여 습지가 됩니다. 이 모형은 홍수를 따로 계산하지 않고 시간이 지나면 메웁니다.';
  if (m.lakes.some(l => l.fill >= MARSH_FROM && m.clock - l.born < FILL_SECONDS * MARSH_FROM + 8)) return MARSH_NOTE;
  if (m.neck && m.neck.gap < m.W() * 2.2) return '이웃한 두 굽이의 바깥쪽 강둑이 서로를 향해 깎이면서 그 사이 땅(곡류의 목)이 좁아지고 있습니다.';
  if (m.lakes.some(l => l.fill >= MARSH_FROM)) return MARSH_NOTE;
  if (m.clock < 7) return `거의 곧은 강에서 시작합니다. 조금만 휘어도 물은 원심력 때문에 바깥쪽으로 쏠려 빨라지고 안쪽에서는 느려집니다. 지금 유량은 ${flow.name}입니다.${size}`;
  if (m.sinuosity() < 1.6) return '굽이 바깥쪽은 수면의 물이 몰려 바닥으로 내려가므로 물이 빠르고 깊어 강둑이 옆으로 깎입니다(측방 침식, 공격 사면). 바닥을 따라 안쪽으로 돌아온 물은 느려 깎인 모래를 내려놓습니다(활주 사면, 퇴적 사면). 그래서 물길이 조금씩 옆으로 옮겨 갑니다.';
  return '굽이가 옆으로 커지면서(측방 확대) 하류 쪽으로도 옮겨 갑니다(곡류의 이동). 물길이 지나간 안쪽 자리에는 그때마다의 물길 가장자리가 낮은 모래 능선으로, 그 사이가 낮은 땅으로 남습니다(곡류 흔적).';
}

export function compareBrief(a, b) {
  const t = m => `곡률도 ${m.sinuosity().toFixed(2)}(물길이 곧은 거리의 ${m.sinuosity().toFixed(2)}배), 우각호 ${m.lakes.filter(l => l.fill < MARSH_FROM).length}개`;
  return { a: t(a), b: t(b) };
}
