// © 2026 김용현
// 해안 단구 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 해수면은 간빙기와 빙기를 되풀이하며 오르내리고 땅은 그동안 계속 솟는다. 파랑은 해수면 높이에서 절벽을 깎아 파식대를 만든다.
// 땅 높이는 r(처음 암석 기준)에 솟은 높이 uplift를 더한 값이다. 그래서 깎인 칸만 다시 그리면 되고, 블록은 통째로 올리면 된다.
// 지형 계산에는 사칙연산과 내림, 제곱근만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 혼돈 계산이 갈라진다.

export const N = 256;
export const ROUND = 0.1;
export const UNIT_M = 10; // 계산 높이 1은 약 10m다.
// 한 번의 빙기와 간빙기를 약 10만 년으로 잡고 화면 27초로 줄였다.
export const HIGH = 13, FALL = 7, LOW = 3, RISE = 4, PERIOD = HIGH + FALL + LOW + RISE;
export const YEARS_PER_PERIOD = 10; // 만 년
export const SEA_LOW = -12; // 빙기 해수면. 약 120m 낮다.
export const BOTTOM = -26;
const RUN = 0.35; // 평소 파랑이 해수면보다 조금 높이까지 올라와 절벽 아래를 친다.
export const REACH = 0.85; // 큰 파랑이 닿는 높이(약 9m, 교육용으로 정한 값). 이보다 높이 솟고 폭이 남은 옛 파식대를 해안 단구로 친다.
const MIN_WIDTH = 2.5;
const COAST_J = 110, SLOPE = 0.12, SHELF = 85;
const STREAMS = [64, 196]; // 땅을 흘러내리는 작은 물길의 가로 위치
export const SECTION_X = 128;

// 한 번의 빙기와 간빙기 동안 땅이 솟는 높이. 약 0.3m/천 년, 약 0.08m/천 년으로 책의 동해안, 남해안과 황해안 추정 범위 안이다.
export const UPLIFT = {
  none: { name: '없음', perPeriod: 0, text: '0' },
  slow: { name: '느림', perPeriod: 0.8, text: '약 0.08m/천 년' },
  fast: { name: '빠름', perPeriod: 3, text: '약 0.3m/천 년' },
};
export const CYCLES = { 2: { name: '2번' }, 3: { name: '3번' }, 4: { name: '4번' } };
export const PRESETS = {
  east: { uplift: 'fast', cycles: 4 },
  south: { uplift: 'slow', cycles: 4 },
  none: { uplift: 'none', cycles: 4 },
  short: { uplift: 'fast', cycles: 2 },
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

// 시각표: 간빙기, 해수면 하강, 빙기, 해수면 상승을 되풀이하고 마지막 간빙기(오늘날)에서 끝난다.
export const endTime = cycles => (cycles - 1) * PERIOD + HIGH;
// 간빙기에는 땅이 솟는 만큼 해수면도 조금씩 올라 끝날 때 오늘날 높이에 닿는다. 그래서 파랑이 암석의 같은 높이를 계속 깎아 파식대가 평평하다.
export function phaseAt(t, rate = 0) {
  const cycle = Math.floor(t / PERIOD), u = t - cycle * PERIOD, top = 0 - rate * HIGH;
  if (u < HIGH) return { name: 'high', cycle, sea: top * (1 - u / HIGH), u: u / HIGH };
  if (u < HIGH + FALL) return { name: 'fall', cycle, sea: SEA_LOW * smooth(0, 1, (u - HIGH) / FALL), u: (u - HIGH) / FALL };
  if (u < HIGH + FALL + LOW) return { name: 'low', cycle, sea: SEA_LOW, u: (u - HIGH - FALL) / LOW };
  return { name: 'rise', cycle, sea: SEA_LOW + (top - SEA_LOW) * smooth(0, 1, (u - HIGH - FALL - LOW) / RISE), u: (u - HIGH - FALL - LOW) / RISE };
}

export function createModel(seed = 11) {
  const size = N * N;
  const r = new Float32Array(size), start = new Float32Array(size), strength = new Float32Array(size), damage = new Float32Array(size), stand = new Int8Array(size), stream = new Uint8Array(size), streamD = new Float32Array(size);
  const dirtyFlag = new Uint8Array(size), dirtyList = new Int32Array(size);
  const front = new Int32Array(N), shore = new Int32Array(N), attn = new Float32Array(N), coast = new Float32Array(N), streamX = new Float32Array(STREAMS.length * N);

  const m = {
    r, start, stand, stream, streamD, damage, front, shore, seed, dirtyList, dirtyCount: 0, allDirty: true, options: { ...PRESETS.east }, clock: 0, finished: false, uplift: 0, sea: 0, phase: phaseAt(0), stands: [], tEnd: endTime(4), rate: 0, cut: 0,
  };
  let acc = 0, roundNo = 0, level = 0, levelNo = 0, attacking = true, lastKey = '';
  const touch = k => { if (!dirtyFlag[k]) { dirtyFlag[k] = 1; dirtyList[m.dirtyCount++] = k; } };
  m.consumeDirty = () => { for (let i = 0; i < m.dirtyCount; i++) dirtyFlag[dirtyList[i]] = 0; const c = m.dirtyCount; m.dirtyCount = 0; return c; };

  function buildBase() {
    const hn = makeNoise(seed + 5, 26), fine = makeNoise(seed + 9, 7), wig = makeNoise(seed + 2, 46), rock = makeNoise(seed + 21, 17), mead = makeNoise(seed + 31, 34);
    for (let i = 0; i < N; i++) coast[i] = COAST_J + (wig(i, 8) - 0.5) * 20;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, off = j - coast[i];
      strength[k] = 0.8 + 0.4 * rock(i, j);
      // 바닷가의 비탈이 그대로 얕은 바다 밑으로 이어지다가 깊은 바다에서 가팔라진다.
      let v = -SLOPE * off;
      if (off > SHELF) v = -SLOPE * SHELF - 0.4 * (off - SHELF);
      if (v < BOTTOM + 2) v = BOTTOM + 2;
      // 안쪽 땅은 올라갈수록 산이 된다.
      v += smooth(18, 60, -off) * (hn(i, j) * 7) + smooth(40, 110, -off) * 5;
      v += (fine(i, j) - 0.5) * (off < 0 ? 0.22 : 0.06);
      start[k] = v; r[k] = v;
    }
    stream.fill(0); streamD.fill(99);
    STREAMS.forEach((x, n) => {
      for (let j = 0; j < N; j++) {
        const c = x + (mead(x, j) - 0.5) * 22;
        streamX[n * N + j] = c;
        for (let i = Math.max(1, Math.floor(c - 7)); i <= Math.min(N - 2, c + 7); i++) {
          const k = j * N + i, d = Math.abs(i - c);
          if (d < streamD[k]) streamD[k] = d;
          if (d <= 7) stream[k] = n + 1;
        }
      }
    });
  }

  // 파랑이 치는 칸을 바다 쪽에서 찾는다. 수면 아래로 얕게 이어진 파식대를 건널수록 파랑은 약해진다.
  function scan() {
    const lim = level + RUN;
    for (let i = 0; i < N; i++) {
      let j = N - 2;
      while (j > 1 && r[j * N + i] < lim) j--;
      front[i] = j;
      let w = 0, q = j + 1;
      while (q < N - 1 && r[q * N + i] < lim && r[q * N + i] > level - 1.5) { w++; q++; }
      attn[i] = 1 / (1 + w / 30);
    }
  }
  function updateShore() {
    const s = m.sea - m.uplift;
    for (let i = 0; i < N; i++) { let j = N - 1; while (j > 0 && r[j * N + i] < s) j--; shore[i] = j; }
  }

  function attack() {
    const rate = m.phase.name === 'high' ? 0.29 : 0.14;
    for (let i = 1; i < N - 1; i++) {
      const j = front[i];
      if (j <= 1) continue;
      const k = j * N + i;
      damage[k] += (rate * attn[i]) / strength[k];
      if (damage[k] < 1) continue;
      damage[k] = 0;
      // 절벽 아래가 파여 무너진다. 그 자리는 바다 쪽으로 아주 조금 기운 평평한 바위 면이 된다.
      const lv = level + 0.003 * clamp(COAST_J + 60 - j, 0, 200) * 0.2;
      cutCell(k, lv); m.cut++;
      for (let b = 1; b <= 3; b++) { const o = k + b * N; if (o < size && r[o] > lv) cutCell(o, lv); }
      let q = j - 1;
      while (q > 1 && r[q * N + i] < level + RUN) { if (r[q * N + i] > lv) cutCell(q * N + i, lv); q--; }
      front[i] = q;
    }
  }
  function cutCell(k, lv) {
    r[k] = lv; stand[k] = levelNo; touch(k);
    const i = k % N;
    if (i === 1) { r[k - 1] = lv; stand[k - 1] = levelNo; touch(k - 1); }
    if (i === N - 2) { r[k + 1] = lv; stand[k + 1] = levelNo; touch(k + 1); }
  }

  // 비가 절벽과 비탈을 조금씩 무너뜨린다. 그래서 오래된 단구애일수록 완만하고 낮은 계단은 희미해진다.
  function relax() {
    const dry = 1.2 - m.uplift;
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const k = j * N + i;
      for (const o of [k + 1, k + N]) {
        const a = r[k], b = r[o], hi = a > b ? a : b;
        if (hi < dry) continue;
        let d = (a - b) * 0.012;
        const gap = a - b;
        if (gap > 0.62) d += (gap - 0.62) * 0.22; else if (gap < -0.62) d += (gap + 0.62) * 0.22;
        if (d > -0.0006 && d < 0.0006) continue;
        r[k] -= d; r[o] += d;
        if (d > 0.004 || d < -0.004) { touch(k); touch(o); }
      }
    }
  }

  // 작은 물길이 솟은 땅을 파 내려간다. 물길 바닥은 바다로 갈수록 낮아진다.
  function incise() {
    const base = level;
    STREAMS.forEach((x, n) => {
      for (let j = 2; j < N - 2; j++) {
        const c = streamX[n * N + j], ci = Math.round(c);
        const edge = front[ci < 0 ? 0 : ci >= N ? N - 1 : ci];
        if (j > edge) break;
        const bed = base + RUN + 0.2 + 0.035 * (edge - j);
        for (let i = Math.max(1, ci - 7); i <= Math.min(N - 2, ci + 7); i++) {
          const k = j * N + i, d = Math.abs(i - c), want = bed + d * d * 0.09;
          if (r[k] > want) { const take = r[k] - want; r[k] -= take < 0.12 ? take : 0.12; touch(k); }
        }
      }
    });
  }

  function enterPhase(p) {
    if (p.name === 'high') {
      // 파랑이 이번 간빙기에 깎는 높이. 암석 기준으로 해수면 바로 아래이며 간빙기 내내 같다.
      levelNo = p.cycle + 1;
      level = -m.rate * (p.cycle * PERIOD + HIGH) - 0.1;
      m.stands.push({ no: levelNo, level, end: p.cycle * PERIOD + HIGH });
      attacking = true; scan();
    } else if (p.name === 'low') {
      // 빙기의 바닷가는 낮은 곳에 작게 깎이고 다음 간빙기에 다시 바다 밑으로 잠긴다.
      levelNo = -1;
      level = SEA_LOW - m.rate * (p.cycle * PERIOD + HIGH + FALL + LOW) - 0.1;
      attacking = true; scan();
    } else attacking = false;
    m.allDirty = true;
  }

  function setClock() {
    m.phase = phaseAt(m.clock, m.rate);
    m.sea = m.phase.sea;
    m.uplift = m.rate * m.clock;
    const key = m.phase.name + m.phase.cycle;
    if (key !== lastKey) { lastKey = key; enterPhase(m.phase); }
  }

  function round() {
    m.clock += ROUND; roundNo++;
    if (m.clock >= m.tEnd - 1e-9) m.clock = m.tEnd - 1e-6;
    setClock();
    if (attacking) {
      if (roundNo % 5 === 0) scan();
      attack();
    }
    if (roundNo % 5 === 0) { incise(); }
    if (roundNo % 10 === 0) relax();
    updateShore();
    if (m.clock >= m.tEnd - 1e-5) { m.clock = m.tEnd; m.finished = true; m.allDirty = true; }
  }

  // 간빙기마다 깎인 바위 면 가운데 지금 남아 있는 것. 물길 언저리는 빼고 잰다.
  const STEP = 4;
  function widthOf(st) {
    let s = 0, c = 0;
    for (let i = 8; i < N - 8; i += STEP) {
      if (stream[(COAST_J) * N + i]) continue;
      let w = 0;
      for (let j = 2; j < N - 2; j++) { const k = j * N + i; if (stand[k] === st.no && Math.abs(r[k] - st.level) < 0.55) w++; }
      s += w; c++;
    }
    return s / Math.max(1, c);
  }
  // 나이와 높이를 모두 그 간빙기가 끝난 때로 잰다. 그래서 높이를 나이로 나누면 융기 속도가 나온다.
  const ageOf = st => ((m.tEnd - st.end) / PERIOD) * YEARS_PER_PERIOD;
  // 지금 깎이는 것을 뺀, 이미 끝난 간빙기의 파식대
  const finishedStands = () => (m.phase.name === 'high' ? m.stands.slice(0, -1) : m.stands);
  // 해안 단구: 큰 파랑이 닿지 못할 만큼 솟았고 폭이 남아 있는 옛 파식대
  m.terraces = () => {
    const out = [];
    for (const st of finishedStands()) {
      const elev = st.level + m.uplift, width = widthOf(st);
      if (elev > REACH && width >= MIN_WIDTH) out.push({ no: st.no, level: st.level, elev, width, age: ageOf(st) });
    }
    return out;
  };
  m.elevM = v => Math.round(v * UNIT_M);
  m.currentWidth = () => (levelNo > 0 && m.stands.length ? widthOf(m.stands[m.stands.length - 1]) : 0);
  // 판정에 쓰는 옛 파식대: 큰 파랑이 닿는 높이를 넘은 것 가운데 가장 낮은 것. 아직 없으면 가장 최근 것이다.
  m.oldStand = () => {
    const s = finishedStands();
    for (let n = s.length - 1; n >= 0; n--) if (s[n].level + m.uplift > REACH) return s[n];
    return s.length ? s[s.length - 1] : null;
  };
  m.oldPlatform = () => { const st = m.oldStand(); return st ? st.level + m.uplift : null; };
  m.waveReach = () => REACH;
  m.cellKind = k => {
    const elev = r[k] + m.uplift;
    if (stand[k] > 0) {
      const st = m.stands[stand[k] - 1];
      if (st && Math.abs(r[k] - st.level) < 0.55) {
        if (st.level + m.uplift > REACH) return 'terrace';
        return 'platform';
      }
    }
    if (start[k] + m.uplift < 0.2 && stand[k] === 0 && elev < 0.2) return 'bed';
    if (stand[k] === -1) return 'bed';
    return elev > 0 ? 'land' : 'bed';
  };
  m.sample = (gx, gy) => {
    const u = clamp(gx, 0, N - 1.001), v = clamp(gy, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (r[k] * (1 - a) + r[k + 1] * a) * (1 - b) + (r[k + N] * (1 - a) + r[k + N + 1] * a) * b;
  };
  // 이름표 자리. 그 지형이 실제로 있는 칸만 고른다.
  m.spots = () => {
    const out = { sea: { x: 128, y: Math.min(N - 8, shore[128] + 24) } };
    const list = m.terraces();
    out.terraceIndex = 0;
    // 단구마다 다른 가로 자리에 이름표를 붙여 지시선이 겹치지 않게 한다.
    const find = (no, lv, at = SECTION_X) => { for (const dx of [0, 8, -8, 16, -16, 24, -24]) { const i = at + dx; let a = -1, b = -1; for (let j = 2; j < N - 2; j++) { const k = j * N + i; if (stand[k] === no && Math.abs(r[k] - lv) < 0.55) { if (a < 0) a = j; b = j; } } if (b - a >= 2) return { x: i, y: (a + b) / 2, a, b }; } return null; };
    out.terraces = list.map(t => { const p = find(t.no, t.level, [SECTION_X + 34, SECTION_X, SECTION_X - 34][out.terraceIndex++ % 3]); return p && { ...p, no: t.no, elev: t.elev, age: t.age }; }).filter(Boolean);
    if (m.phase.name === 'high' && m.stands.length) {
      const st = m.stands[m.stands.length - 1], p = find(st.no, st.level, SECTION_X + 16);
      if (p && p.b - p.a >= 4) { out.platform = { x: p.x, y: (p.a + p.b) / 2 }; if (p.a > 6) out.cliff = { x: p.x, y: p.a - 2 }; }
    }
    if (out.terraces.length) { const t = out.terraces[0]; if (t.a > 5) out.scarp = { x: t.x, y: t.a - 2 }; }
    if (m.phase.name === 'low' || m.phase.name === 'fall' || m.phase.name === 'rise') out.lowShore = { x: 128, y: Math.max(2, shore[128]) };
    return out;
  };
  m.setOption = (name, val) => { m.options[name] = val; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  m.reset = () => {
    m.rate = UPLIFT[m.options.uplift].perPeriod / PERIOD;
    m.tEnd = endTime(+m.options.cycles);
    acc = 0; roundNo = 0; m.clock = 0; m.finished = false; m.cut = 0; m.stands = []; lastKey = ''; levelNo = 0; m.uplift = 0; m.sea = 0;
    damage.fill(0); stand.fill(0);
    buildBase();
    setClock(); updateShore();
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

// 단면: 블록 가운데를 육지에서 바다로 자른다. 물길은 지나지 않는다.
export const sectionLine = () => ({ ax: SECTION_X, ay: 62, bx: SECTION_X, by: 236 });
export function sectionProfile(m, samples = 280) {
  const S = sectionLine(), out = { start: new Float32Array(samples), top: new Float32Array(samples), kinds: new Array(samples), stand: new Int8Array(samples), S };
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), j = Math.round(S.ay + (S.by - S.ay) * f), k = j * N + S.ax;
    out.start[t] = m.start[k] + m.uplift; out.top[t] = m.r[k] + m.uplift; out.kinds[t] = m.cellKind(k); out.stand[t] = m.stand[k];
  }
  return out;
}

// 형성 조건의 핵심 비교. 옛 파식대가 간빙기 바다가 닿는 높이보다 높아야 단구로 남는다.
export function rateVerdict(m) {
  const st = m.oldStand();
  if (m.rate === 0) return '땅이 솟지 않아 돌아온 바다가 같은 높이에서 옛 파식대를 다시 깎습니다. 계단이 생기지 않습니다.';
  if (!st) return '아직 옛 파식대가 없습니다. 지금 파랑이 첫 파식대를 깎습니다.';
  const elev = st.level + m.uplift;
  if (elev <= m.waveReach()) return '옛 파식대가 아직 큰 파랑이 닿는 높이 안에 있어 해안 단구로 치지 않습니다.';
  if (!m.terraces().some(t => t.no === st.no)) return '옛 파식대가 솟았지만 새 파식대에 깎여 폭이 거의 남지 않았습니다.';
  const gap = Math.max(1, m.elevM(elev - m.waveReach()));
  return `옛 파식대가 큰 파랑이 닿는 높이보다 약 ${gap}m 높습니다. 솟았기 때문에 깎이지 않고 해안 단구로 남습니다.`;
}

// 그때 일어나는 일을 적는다. 모두 계산 상태에서 고르므로 화면과 어긋나지 않는다.
export function noteText(m) {
  const list = m.terraces(), p = m.phase, none = m.rate === 0;
  if (m.finished) {
    if (!list.length) return none ? '해안 단구가 생기지 않았습니다. 땅이 솟지 않으면 해수면이 내려갔다 돌아와도 같은 높이를 다시 깎아 파식대만 넓어집니다. 오늘날은 해수면이 높은 간빙기이므로, 옛 바닷가가 오늘날 바다보다 높이 남으려면 지반 융기가 꼭 필요합니다.' : '아직 뚜렷한 단구가 남지 않았습니다.';
    const top = list[0];
    let t = `해안 단구 ${list.length}단이 생겼습니다. 가장 높은 단구는 약 ${m.elevM(top.elev)}m이고 약 ${Math.round(top.age)}만 년 전 간빙기의 파식대입니다. 높은 곳의 단구일수록 오래되었습니다.`;
    if (m.options.uplift === 'slow') t += ' 땅이 느리게 솟아 계단이 낮고 좁으며, 간빙기를 4번 겪어도 단구가 적게 남습니다.';
    return t;
  }
  if (p.name === 'high' && p.cycle === 0) return '간빙기입니다. 해수면이 높을 때 파랑이 바닷가 절벽 아래를 깎습니다. 절벽(해식애)이 물러난 자리에 평평한 바위 면(파식대)이 넓어집니다. 땅은 그동안에도 천천히 솟습니다.';
  if (p.name === 'high') {
    if (none) return '해수면이 돌아왔습니다. 땅이 솟지 않았으므로 옛 파식대와 같은 높이입니다. 파랑이 옛 파식대를 건너 절벽을 더 깎을 뿐 계단은 생기지 않습니다.';
    return '해수면이 돌아왔지만 땅이 솟은 만큼 옛 파식대는 파랑이 닿지 못하는 높이에 있습니다. 이것이 해안 단구입니다. 파랑은 그 아래에서 새 파식대를 깎습니다.';
  }
  if (p.name === 'fall') return '빙기가 옵니다. 바닷물이 육지의 빙하로 묶여 해수면이 낮아집니다. 파식대가 물 밖으로 드러나고 바닷가는 먼바다 쪽으로 멀어집니다.';
  if (p.name === 'low') return '이 모형에서 빙기의 해수면은 오늘날보다 약 120m 낮습니다. 마지막 빙기의 가장 추운 때에는 약 130m 낮았다고 알려져 있습니다. 이때 생긴 바닷가 지형은 다음 간빙기에 바다 밑으로 잠깁니다. 지금 보이는 단구가 간빙기의 지형인 까닭입니다.';
  return none ? '빙기가 끝나 빙하가 녹고 해수면이 다시 오릅니다. 땅이 솟지 않았으므로 바다는 옛 파식대까지 그대로 돌아옵니다.' : '빙기가 끝나 빙하가 녹고 해수면이 다시 오릅니다. 그동안 땅이 솟았으므로 바다는 옛 파식대까지 올라오지 못합니다.';
}

export function compareBrief(a, b) {
  const t = m => { const l = m.terraces(); return l.length ? `단구가 ${l.length}단이고 가장 높은 단구는 약 ${m.elevM(l[0].elev)}m입니다` : '단구가 없습니다'; };
  return { a: t(a), b: t(b) };
}
