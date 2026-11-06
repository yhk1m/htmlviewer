// © 2026 김용현
// 삼각주 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 강이 바다에 닿아 느려지면 하구 앞에 모래를, 그 앞 멀리에 진흙을 내려놓는다. 하구 앞 모래톱이 수면에 닿으면 물길이 양쪽으로 갈라진다.
// 조류와 파랑은 낮은 바닥과 갯가의 흙을 옮겨 간다. 공급이 제거보다 많아야 땅이 된다.
// 지형 계산에는 사칙연산과 내림, 제곱근만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 혼돈 계산이 갈라진다.

export const N = 256;
export const ROUND = 0.1; // 계산 간격(초)
export const T_END = 90;
export const DAM_AT = 58; // 하굿둑을 세우는 시각
export const COAST = 96; // 처음 바닷가의 줄(만 안쪽)
export const MID = N / 2;
export const WET = 0.04; // 평균 해수면 기준으로 이보다 높으면 땅이다.
const TIDE_PERIOD = 7.5; // 끝나는 시각에 평균 해수면에 오도록 맞췄다.
const VALLEY_SLOPE = 0.012;
const SHOAL = -0.1; // 물길 끝은 바닥이 이만큼 얕아진 곳까지만 나아간다.
const MIN_FLOW = 0.11; // 이보다 약한 물길은 더 갈라지지 않는다.
const MAX_TIPS = 14;

export const SUPPLY = {
  low: { name: "적음", sand: 3, mud: 11 },
  mid: { name: "보통", sand: 6.4, mud: 27 },
  high: { name: "많음", sand: 10, mud: 44 },
};
export const TIDE = {
  low: { name: '약함', range: 0.08, take: 0.0004 },
  mid: { name: '보통', range: 0.4, take: 0.0042 },
  high: { name: '강함', range: 0.95, take: 0.0125 },
};
export const PRESETS = {
  textbook: { supply: 'mid', tide: 'low', dam: 'no' },
  rich: { supply: 'high', tide: 'low', dam: 'no' },
  tidal: { supply: 'mid', tide: 'high', dam: 'no' },
  dam: { supply: 'mid', tide: 'low', dam: 'yes' },
};

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const PI = 3.141592653589793;
function psin(a) {
  let x = a - Math.floor(a / (2 * PI)) * 2 * PI, s = 1;
  if (x > PI) { x -= PI; s = -1; }
  const u = x * (PI - x);
  return s * (16 * u) / (5 * PI * PI - 4 * u);
}
const pcos = a => psin(a + PI / 2);
function makeRng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function makeNoise(seed, cx, cy) {
  const r = makeRng(seed * 7919 + 13), Mx = Math.ceil(N / cx) + 3, My = Math.ceil(N / cy) + 3, g = new Float64Array(Mx * My);
  for (let k = 0; k < g.length; k++) g[k] = r();
  const ease = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const u = x / cx, v = y / cy, i = Math.floor(u), j = Math.floor(v), a = ease(u - i), b = ease(v - j), o = j * Mx + i;
    return (g[o] * (1 - a) + g[o + 1] * a) * (1 - b) + (g[o + Mx] * (1 - a) + g[o + Mx + 1] * a) * b;
  };
}

export function createModel(seed = 11) {
  const size = N * N;
  const h = new Float32Array(size), base = new Float32Array(size), hill = new Float32Array(size), turb = new Float32Array(size), sand = new Float32Array(size), mud = new Float32Array(size);
  const over = new Float32Array(size), landAt = new Float32Array(size), stripe = new Float32Array(size), chan = new Float32Array(size), river = new Uint8Array(size);
  const dirtyFlag = new Uint8Array(size), dirtyList = new Int32Array(size), near = new Float32Array(size), near2 = new Float32Array(size);

  const TRAILS = 46, TRAIL_PTS = 40;
  const trailX = new Float32Array(TRAILS * TRAIL_PTS), trailY = new Float32Array(TRAILS * TRAIL_PTS), trailLen = new Uint16Array(TRAILS), trailKind = new Uint8Array(TRAILS), trailAge = new Float32Array(TRAILS);

  const m = {
    h, base, hill, turb, sand, mud, over, landAt, chan, river, seed, dirtyList, dirtyCount: 0, allDirty: true,
    options: { ...PRESETS.textbook }, clock: 0, finished: false, damUp: false, damBuiltAt: 0, seaNow: 0, tips: [], channels: [], splits: 0, plugged: 0, lastSplit: null,
    TRAILS, TRAIL_PTS, trailX, trailY, trailLen, trailKind, trailAge, areaHistory: [], peakArea: 0, damRow: COAST - 2, suppliedTotal: 0, removedTotal: 0, splitLog: [],
  };
  let lastSupplied = 0, lastRemoved = 0, rng, acc = 0, roundNo = 0, trailNext = 0, islandAt = -1, islandSpot = null;
  const touch = k => { if (!dirtyFlag[k]) { dirtyFlag[k] = 1; dirtyList[m.dirtyCount++] = k; } };
  m.consumeDirty = () => { for (let i = 0; i < m.dirtyCount; i++) dirtyFlag[dirtyList[i]] = 0; const c = m.dirtyCount; m.dirtyCount = 0; return c; };

  // 물길 위쪽(강)의 수면은 위로 갈수록 조금 높다. 바다 쪽은 평균 해수면이다.
  const APEX = COAST - 8;
  const levelAt = j => (j < APEX ? (APEX - j) * VALLEY_SLOPE : 0);
  m.levelAt = levelAt;
  // 처음 바닷가: 가운데가 안쪽으로 들어간 만이고 양옆은 곶이다.
  const coastAt = i => {
    const t = clamp((i - MID < 0 ? MID - i : i - MID) / 118);
    return COAST + 44 * t * t * (3 - 2 * t);
  };
  m.coastAt = coastAt;
  // 위쪽 강의 작은 굽이
  const riverX = j => MID + 6 * psin(j * 0.055 + 1) * clamp(1 - j / (COAST + 4));
  m.riverX = riverX;

  function buildBase() {
    const hn = makeNoise(seed + 5, 26, 26), fine = makeNoise(seed + 9, 9, 9), wig = makeNoise(seed + 2, 34, 34), st = makeNoise(seed + 21, 8, 60);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, c = coastAt(i) + (wig(i, j) - 0.5) * 12, sea = j - c;
      stripe[k] = 0.2 + 1.6 * st(i, j);
      let v;
      if (sea > 0) {
        // 얕은 바다에서 먼바다로 깊어진다.
        v = -0.3 - 0.013 * sea - (sea > 90 ? (sea - 90) * 0.03 : 0) + (fine(i, j) - 0.5) * 0.04;
      } else {
        // 골짜기 바닥에서 양옆 산으로 오른다.
        const off = i - MID < 0 ? MID - i : i - MID, halfValley = 40 + 0.5 * j + (wig(j, i) - 0.5) * 16, up = clamp((off - halfValley) / 30), shore = clamp(-sea / 8);
        hill[k] = smooth(0, 0.5, up) * shore;
        v = levelAt(j) + 0.16 + 0.32 * shore + up * up * (3 - 2 * up) * shore * (7 + hn(i, j) * 9) + (fine(i, j) - 0.5) * 0.04;
      }
      base[k] = v; h[k] = v;
    }
    // 강: 골짜기 가운데의 정해진 물길
    for (let j = 0; j <= APEX + 2; j++) {
      const cx = riverX(j);
      for (let i = Math.floor(cx - 7); i <= cx + 7; i++) {
        const k = j * N + i, d = i - cx < 0 ? cx - i : i - cx;
        if (d <= 4.6) { const u = d / 4.6; h[k] = levelAt(j) - 0.75 * (1 - u * u * u * u) + 0.02; base[k] = h[k]; river[k] = 1; chan[k] = 1; }
      }
    }
  }

  // 물길 칸을 판다. 칸마다 지나는 물의 비율을 적어 둔다.
  const widthOf = f => 2 + 2.8 * Math.sqrt(f);
  const depthOf = f => 0.4 + 0.5 * Math.sqrt(f);
  function carve(px, py, f) {
    const W = widthOf(f), D = depthOf(f), r = Math.ceil(W);
    const i0 = Math.round(px), j0 = Math.round(py);
    for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const k = j * N + i;
      if (hill[k] > 0.2 || river[k]) continue;
      const dx = i - px, dy = j - py, d2 = dx * dx + dy * dy;
      if (d2 > W * W) continue;
      const u2 = d2 / (W * W), goal = levelAt(j) - D * (1 - u2 * u2);
      if (h[k] > goal) { const cut = h[k] - goal, fromSand = Math.min(sand[k], cut); h[k] = goal; sand[k] -= fromSand; mud[k] = Math.max(0, mud[k] - (cut - fromSand)); over[k] = Math.min(over[k], mud[k]); touch(k); }
      if (f > chan[k]) chan[k] = f;
      landAt[k] = 0;
    }
  }

  // 혹 모양으로 흙을 내려놓는다. 물길 칸에는 쌓이지 않는다. 축 방향이 흐름 방향이다.
  function lay(cx, cy, ux, uy, ra, rb, volume, cap, layer, also) {
    const R = Math.ceil(ra > rb ? ra : rb), i0 = Math.round(cx), j0 = Math.round(cy), per = volume / (1.05 * ra * rb);
    let placed = 0;
    for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) {
      if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) continue;
      const k = j * N + i;
      if (chan[k] > 0 || hill[k] > 0.15) continue;
      const dx = i - cx, dy = j - cy, a = (dx * ux + dy * uy) / ra, b = (-dx * uy + dy * ux) / rb, r2 = a * a + b * b;
      if (r2 >= 1 || h[k] >= cap) continue;
      const w = (1 - r2) * (1 - r2), add = Math.min(per * w, cap - h[k]);
      h[k] += add; layer[k] += add; placed += add;
      if (also) also[k] += add;
      if (h[k] > WET && !landAt[k]) landAt[k] = Math.max(0.001, m.clock);
      touch(k);
    }
    m.suppliedTotal += placed;
    return placed;
  }

  const newTip = (x, y, ux, uy, flow, path, born) => ({ x, y, ux, uy, flow, path, born, since: 0, alive: true, own: path.length });
  function startTips() {
    const cx = riverX(APEX), path = [];
    for (let j = 0; j <= APEX; j += 3) path.push([riverX(j), j]);
    const tip = newTip(cx, APEX, 0, 1, 1, path, 0);
    m.tips = [tip]; m.channels = [{ pts: path, flow: 1, tip }];
  }

  const barReach = f => 7 + 9 * Math.sqrt(f);

  function steer(t) {
    // 얕은 쪽을 피해 깊은 쪽으로 조금씩 휜다. 흐름은 바다 쪽을 벗어나지 않는다.
    const look = 9 + 5 * Math.sqrt(t.flow), side = 7;
    const nx = -t.uy, ny = t.ux;
    const at = (ax, ay) => { const i = Math.round(ax), j = Math.round(ay); return i < 0 || j < 0 || i >= N || j >= N ? 9 : h[j * N + i]; };
    const left = at(t.x + t.ux * look + nx * side, t.y + t.uy * look + ny * side), right = at(t.x + t.ux * look - nx * side, t.y + t.uy * look - ny * side);
    const push = (right - left) * 0.03 + (rng() - 0.5) * 0.05;
    let ux = t.ux + nx * clamp(push, -0.07, 0.07), uy = t.uy + ny * clamp(push, -0.07, 0.07);
    if (uy < 0.2) uy = 0.2;
    const l = Math.sqrt(ux * ux + uy * uy);
    t.ux = ux / l; t.uy = uy / l;
  }

  function split(t) {
    const a = 0.42 + rng() * 0.3, b = 0.42 + rng() * 0.3, share = 0.42 + rng() * 0.16;
    const rot = (ang) => { const c = pcos(ang), s = psin(ang); return [t.ux * c - t.uy * s, t.ux * s + t.uy * c]; };
    const [ax, ay] = rot(a), [bx, by] = rot(-b);
    m.splits++;
    m.lastSplit = { x: t.x + t.ux * barReach(t.flow) * 0.7, y: t.y + t.uy * barReach(t.flow) * 0.7, clock: m.clock };
    m.splitPoints.push({ x: m.lastSplit.x, y: m.lastSplit.y });
    m.splitLog.push({ clock: m.clock, crest: maxNear(t.x + t.ux * barReach(t.flow) * 0.7, t.y + t.uy * barReach(t.flow) * 0.7, 2) });
    t.alive = false;
    for (const [ux, uy, f] of [[ax, ay, t.flow * share], [bx, by, t.flow * (1 - share)]]) {
      const c = newTip(t.x, t.y, ux, uy, f, [...t.path, [t.x, t.y]], m.clock);
      m.tips.push(c);
      m.channels.push({ pts: c.path, flow: f, tip: c });
    }
  }
  const maxNear = (x, y, r) => {
    let top = -99;
    const i0 = Math.round(x), j0 = Math.round(y);
    for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) if (i >= 0 && j >= 0 && i < N && j < N && !chan[j * N + i] && h[j * N + i] > top) top = h[j * N + i];
    return top;
  };

  function plug(t) {
    t.alive = false; m.plugged++;
    const live = m.tips.filter(o => o.alive);
    if (!live.length) return;
    const add = t.flow / live.length;
    for (const o of live) o.flow += add;
  }

  function growTip(t) {
    const cut = m.damUp ? 0.05 : 1, sup = SUPPLY[m.options.supply], f = t.flow, reach = barReach(f);
    const ra = 8 + 11 * Math.sqrt(f), rb = 8 + 12 * Math.sqrt(f);
    // 하구에서 느려진 물이 모래를 먼저 내려놓는다. 진흙은 더 멀리, 더 넓게 퍼져 내려앉는다.
    const bx = t.x + t.ux * reach, by = t.y + t.uy * reach;
    lay(bx, by, t.ux, t.uy, ra, rb, sup.sand * f * cut, WET + 0.1, sand);
    const fx = t.x + t.ux * reach * 2.5, fy = t.y + t.uy * reach * 2.5, mudA = 30 + 22 * Math.sqrt(f), mudB = 26 + 20 * Math.sqrt(f);
    lay(fx, fy, t.ux, t.uy, mudA, mudB, sup.mud * 0.35 * f * cut, -0.1, mud);
    // 흙탕물이 퍼지는 모습
    if (!m.damUp) {
      const R = Math.ceil(mudA), i0 = Math.round(fx), j0 = Math.round(fy);
      for (let j = j0 - R; j <= j0 + R; j += 2) for (let i = i0 - R; i <= i0 + R; i += 2) {
        if (i < 0 || j < 0 || i >= N - 1 || j >= N - 1) continue;
        const dx = i - fx, dy = j - fy, r2 = (dx * dx + dy * dy) / (mudA * mudA);
        if (r2 >= 1) continue;
        const k = j * N + i, v = (1 - r2) * Math.sqrt(f) * 0.9;
        if (turb[k] < v) { turb[k] = v; turb[k + 1] = v; turb[k + N] = v; turb[k + N + 1] = v; }
      }
    }
    // 물이 둑을 넘칠 때 물길 옆에 고운 흙이 쌓여 물길 사이의 낮은 곳이 차오른다.
    if (t.path.length > 3) {
      const q = t.path.length - 1 - Math.floor(rng() * Math.min(t.path.length - 1, 22)), P = t.path[q], side = rng() < 0.5 ? -1 : 1, off = widthOf(f) + 4 + rng() * 34;
      lay(P[0] - t.uy * side * off, P[1] + t.ux * side * off, t.ux, t.uy, 22, 16, sup.mud * 0.85 * f * cut, WET + 0.05, mud, over);
    }
    // 물길은 바닥이 얕아진 곳까지만 나아간다.
    let moved = 0;
    while (moved < 2) {
      const look = Math.max(widthOf(f) + 2, reach * 0.8), ax = t.x + t.ux * look, ay = t.y + t.uy * look, ai = Math.round(ax), aj = Math.round(ay);
      if (ai < 3 || aj < 0 || ai >= N - 3 || aj >= N - 3) { t.alive = false; return; }
      const k = aj * N + ai;
      if (hill[k] > 0.2) { plug(t); return; }
      if (h[k] > SHOAL) break;
      return;
    }
    const step = 0.16 + 0.2 * Math.sqrt(f);
    steer(t);
    t.x += t.ux * step; t.y += t.uy * step; t.since += step;
    carve(t.x, t.y, f);
    const last = t.path[t.path.length - 1], dx = t.x - last[0], dy = t.y - last[1];
    if (dx * dx + dy * dy > 9) t.path.push([t.x, t.y]);
    // 앞이 다른 물길이나 땅으로 막히면 이 물길은 끝난다.
    const hit = (() => {
      const px = t.x + t.ux * (widthOf(f) + 2), py = t.y + t.uy * (widthOf(f) + 2), i = Math.round(px), j = Math.round(py);
      if (i < 0 || j < 0 || i >= N || j >= N) return false;
      return chan[j * N + i] > 0 && t.since > 8;
    })();
    if (hit) { plug(t); return; }
    // 하구 앞 모래톱이 수면에 닿으면 물이 양쪽으로 갈라진다.
    const lenNeed = 7 + 12 * Math.sqrt(f), crest = maxNear(t.x + t.ux * reach * 0.7, t.y + t.uy * reach * 0.7, 2);
    if (t.since >= lenNeed && crest >= WET && f >= MIN_FLOW * 2 && m.tips.filter(o => o.alive).length < MAX_TIPS) split(t);
  }

  function removeBySea() {
    const tide = TIDE[m.options.tide];
    for (let k = 0; k < size; k++) turb[k] *= 0.985;
    // 조류와 파랑은 밀물과 썰물이 오르내리는 높이의 낮은 바닥과 갯가의 흙을 가져간다. 조류가 드나드는 방향의 줄무늬를 따라 더 깎인다.
    const take = tide.take, top = tide.range + 0.12, low = -0.5 - tide.range * 1.1;
    let moved = 0;
    for (let j = COAST - 14; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, v = h[k], laid = sand[k] + mud[k];
      if (laid <= 0.0005 || v > top || v < low || i < 1 || i >= N - 1 || j >= N - 1 || chan[k] > 0) continue;
      // 옆 바닷가의 갯벌은 조류가 흙을 놓고 가는 곳이다.
      if (tide.range > 0.2 && (i - MID) * (i - MID) > 58 * 58 && sand[k] < 0.01 && j < coastAt(i) + 28) continue;
      // 물 위 땅은 물에 닿은 가장자리만 깎인다.
      if (v > WET && h[k - 1] > WET && h[k + 1] > WET && h[k - N] > WET && h[k + N] > WET) continue;
      const a = Math.min(take * stripe[k] * (mud[k] > sand[k] ? 1.5 : 1), laid);
      h[k] = v - a; m.removedTotal += a; moved += a;
      const share = sand[k] / laid;
      sand[k] -= a * share; mud[k] -= a * (1 - share);
      if (h[k] <= WET) landAt[k] = 0;
      over[k] = Math.min(over[k], mud[k]);
      touch(k);
    }
    if (tide.range > 0.2) {
      // 조류가 옮긴 흙의 일부는 옆 바닷가에 고운 흙으로 쌓여 썰물 때 드러나는 갯벌이 된다. 평균 해수면 위로는 쌓지 않는다.
      if (moved > 0) {
        const left = roundNo % 2 === 0, fx = MID + (left ? -1 : 1) * (72 + rng2() * 44), fy = coastAt(fx) + 4 + rng2() * 9, kept = m.suppliedTotal;
        lay(fx, fy, 1, 0, 34, 10, moved * 0.3, WET - 0.01, mud);
        m.suppliedTotal = kept;
      }
      // 조류가 드나들면서 하구가 바다 쪽으로 나팔처럼 넓어진다.
      const open = tide.range * (m.clock / T_END) * 1.05, from = APEX - 22;
      for (let j = from; j < COAST + 10; j++) {
        const half = (j - from) * open, cx = riverX(j);
        for (let i = Math.floor(cx - half); i <= cx + half; i++) {
          if (i < 1 || i >= N - 1) continue;
          const k = j * N + i;
          if (hill[k] > 0.2 || river[k] || chan[k] > 0 || h[k] < -0.3) continue;
          h[k] -= 0.012 * tide.range; if (h[k] <= WET) landAt[k] = 0; touch(k);
        }
      }
    }
  }

  // 물 위로 올라온 땅: 물길 가까이는 큰물이 넘칠 때 흙이 더 쌓여 높고(자연 제방과 비슷), 섬 가운데는 낮다.
  function raiseLand() {
    for (let k = 0; k < size; k++) near[k] = chan[k] > 0 && !river[k] ? 1 : 0;
    for (let pass = 0; pass < 4; pass++) {
      near2.set(near);
      for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
        const k = j * N + i;
        const a = near2[k - 1], b = near2[k + 1], c = near2[k - N], d = near2[k + N];
        let top = near2[k];
        if (a * 0.78 > top) top = a * 0.78;
        if (b * 0.78 > top) top = b * 0.78;
        if (c * 0.78 > top) top = c * 0.78;
        if (d * 0.78 > top) top = d * 0.78;
        near[k] = top;
      }
    }
    if (m.damUp) return;
    for (let k = 0; k < size; k++) {
      if (!landAt[k] || hill[k] > 0.1 || chan[k] > 0) continue;
      const goal = 0.16 + 0.34 * near[k];
      if (h[k] < goal) { const add = Math.min(goal - h[k], 0.006 + 0.012 * near[k]); h[k] += add; mud[k] += add; over[k] += add; m.suppliedTotal += add; touch(k); }
    }
  }

  function emitTrail() {
    const live = m.tips.filter(t => t.alive);
    if (!live.length) return;
    let pick = rng2() * live.reduce((s, t) => s + t.flow, 0), t = live[0];
    for (const o of live) { pick -= o.flow; if (pick <= 0) { t = o; break; } }
    const slot = trailNext; trailNext = (trailNext + 1) % TRAILS;
    const kind = rng2() < 0.5 ? 1 : 2, reach = barReach(t.flow) * (kind === 1 ? 1 : 2.4) * (0.7 + rng2() * 0.7), sideways = (rng2() - 0.5) * (kind === 1 ? 14 : 44);
    const tail = t.path.slice(-Math.min(t.path.length, TRAIL_PTS - 8));
    let n = 0;
    const at = slot * TRAIL_PTS;
    for (const p of tail) { trailX[at + n] = p[0]; trailY[at + n] = p[1]; n++; }
    trailX[at + n] = t.x; trailY[at + n] = t.y; n++;
    for (let q = 1; q <= 6; q++) {
      const f = q / 6;
      trailX[at + n] = t.x + t.ux * reach * f - t.uy * sideways * f * f;
      trailY[at + n] = t.y + t.uy * reach * f + t.ux * sideways * f * f;
      n++;
    }
    trailLen[slot] = n; trailKind[slot] = kind; trailAge[slot] = 0;
  }
  let rng2;

  function round() {
    m.clock += ROUND; roundNo++;
    m.seaNow = TIDE[m.options.tide].range * psin((2 * PI * m.clock) / TIDE_PERIOD);
    if (m.options.dam === 'yes' && !m.damUp && m.clock >= DAM_AT) { m.damUp = true; m.damBuiltAt = m.clock; }
    for (const t of [...m.tips]) if (t.alive) growTip(t);
    removeBySea();
    if (roundNo % 8 === 0) raiseLand();
    if (!m.damUp) { emitTrail(); if (roundNo % 2) emitTrail(); }
    for (let t = 0; t < TRAILS; t++) trailAge[t] += ROUND;
    // 최근 몇 초의 퇴적 속도와 침식 속도(초당 쌓이거나 옮겨 간 양)
    const dep = (m.suppliedTotal - lastSupplied) / ROUND, ero = (m.removedTotal - lastRemoved) / ROUND;
    lastSupplied = m.suppliedTotal; lastRemoved = m.removedTotal;
    const keep = roundNo < 10 ? 0.5 : 0.96;
    m.depositRate = m.depositRate * keep + dep * (1 - keep);
    m.erosionRate = m.erosionRate * keep + ero * (1 - keep);
    if (roundNo % 10 === 0) { const a = m.newLand(); m.areaHistory.push({ t: m.clock, a }); m.peakArea = Math.max(m.peakArea, a); }
    if (m.clock >= T_END - 1e-9) { m.finished = true; trailLen.fill(0); }
  }

  // 새로 생긴 땅의 넓이(칸). 평균 해수면 위로 올라온 곳만 센다.
  m.newLand = () => { let c = 0; for (let k = 0; k < size; k++) if (h[k] > WET && base[k] <= WET) c++; return c; };
  // 바다 쪽으로 가장 멀리 나간 줄. 띄엄띄엄 있는 칸은 세지 않는다.
  m.frontRow = () => {
    for (let j = N - 2; j > COAST; j--) {
      let c = 0;
      for (let i = 8; i < N - 8; i++) if (h[j * N + i] > WET && base[j * N + i] <= WET) c++;
      if (c >= 6) return j;
    }
    return COAST;
  };
  m.liveTips = () => m.tips.filter(t => t.alive).length;
  m.cellKind = k => {
    const j = (k / N) | 0, level = levelAt(j);
    if (h[k] < level - 0.001) {
      if (chan[k] > 0) return 'channel';
      return sand[k] + mud[k] > 0.03 && h[k] > level - 0.45 ? 'shoal' : 'water';
    }
    if (hill[k] > 0.3) return 'hill';
    return landAt[k] ? 'delta' : 'land';
  };
  m.sample = (gx, gy) => {
    const u = clamp(gx, 0, N - 1.001), v = clamp(gy, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + N] * (1 - a) + h[k + N + 1] * a) * b;
  };
  // 물길 칸을 벽으로 삼아 이어진 땅을 훑는다. 처음부터 있던 땅에 닿으면 섬이 아니다.
  m.isIsland = (gx, gy) => {
    const start = Math.round(gy) * N + Math.round(gx), seen = new Set([start]), list = [start];
    for (let t = 0; t < list.length; t++) {
      if (t > 7000) return false;
      const c = list[t];
      if (base[c] > WET) return false;
      for (const o of [c - 1, c + 1, c - N, c + N]) {
        if (o < 0 || o >= size || seen.has(o) || chan[o] > 0 || h[o] <= WET) continue;
        seen.add(o); list.push(o);
      }
    }
    return true;
  };
  // 조석의 지금 방향
  m.tideRising = () => pcos((2 * PI * m.clock) / TIDE_PERIOD) > 0;
  // 이름표 자리. 그 지형이 실제로 있는 칸만 고른다.
  m.spots = () => {
    const out = { up: { x: riverX(14), y: 14 }, river: { x: riverX(APEX - 20), y: APEX - 20 }, sea: { x: 40, y: N - 30 } };
    const kindAt = (x, y) => m.cellKind(Math.round(y) * N + Math.round(x));
    const live = m.tips.filter(t => t.alive);
    if (m.damUp) out.dam = { x: riverX(m.damRow), y: m.damRow };
    // 모래톱: 가장 강한 물길 앞
    const main = live.reduce((a, t) => (!a || t.flow > a.flow ? t : a), null);
    if (main && !m.damUp) {
      const r = barReach(main.flow), bx = main.x + main.ux * r, by = main.y + main.uy * r, k = kindAt(bx, by);
      const bk = Math.round(by) * N + Math.round(bx);
      if ((k === 'shoal' || k === 'delta') && sand[bk] > mud[bk]) out.bar = { x: bx, y: by };
      const fx = main.x + main.ux * r * 2.5, fy = main.y + main.uy * r * 2.5;
      if (fx > 4 && fy > 4 && fx < N - 4 && fy < N - 4 && turb[Math.round(fy) * N + Math.round(fx)] > 0.12) out.plume = { x: fx, y: fy };
    }
    // 하중도: 갈라진 자리에 남은 땅
    if (m.lastSplit) {
      // 물길 칸을 벽으로 삼아 처음 땅과 이어지지 않는 칸만 하중도로 부른다. 넓은 범위를 훑으므로 1초에 한 번만 다시 찾는다.
      if (islandAt !== Math.floor(m.clock)) {
        islandAt = Math.floor(m.clock); islandSpot = null;
        for (const sp of m.splitPoints) {
          for (let d = 0; d < 40 && !islandSpot; d++) {
            const gx = sp.x + (d % 9 - 4) * 1.5, gy = sp.y + Math.floor(d / 9) * 2;
            if (gx < 2 || gy < 2 || gx >= N - 2 || gy >= N - 2 || kindAt(gx, gy) !== 'delta') continue;
            if (m.isIsland(gx, gy)) islandSpot = { x: gx, y: gy };
          }
          if (islandSpot) break;
        }
      }
      if (islandSpot && kindAt(islandSpot.x, islandSpot.y) === 'delta') out.island = islandSpot;
    }
    // 분류 하천: 갈라진 뒤 첫 물길의 가운데
    const branch = live.find(t => t.born > 0 && t.path.length - t.own >= 3);
    if (branch) { const P = branch.path[branch.own + Math.floor((branch.path.length - branch.own) / 2)]; if (kindAt(P[0], P[1]) === 'channel') out.branch = { x: P[0], y: P[1] }; }
    // 삼각주 평원: 새 땅이 넓게 있는 줄의 가운데
    let wide = 0, at = null;
    for (let j = COAST - 4; j < N - 4; j += 3) { let c = 0, sx = 0; for (let i = 4; i < N - 4; i++) if (kindAt(i, j) === 'delta') { c++; sx += i; } if (c > wide) { wide = c; at = { x: sx / c, y: j }; } }
    if (wide > 40) { let best = null, bd = Infinity; for (let i = 4; i < N - 4; i++) { if (kindAt(i, at.y) !== 'delta') continue; const d = (i - at.x) * (i - at.x); if (d < bd) { bd = d; best = { x: i, y: at.y }; } } out.plain = best; }
    // 갯벌: 조류가 옮겨 온 고운 흙이 실제로 쌓인 칸
    if (m.options.tide !== 'low') {
      let most = 0.04, spot = null;
      for (let i = 12; i < N - 12; i += 4) { const c = Math.round(coastAt(i)); for (let j = c + 2; j < c + 26; j += 3) { const k = j * N + i; if (mud[k] > most && h[k] < WET && ((i - MID) * (i - MID) > 58 * 58)) { most = mud[k]; spot = { x: i, y: j }; } } }
      if (spot) out.flat = spot;
    }
    return out;
  };
  m.setOption = (name, val) => { m.options[name] = val; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  m.reset = () => {
    rng = makeRng(seed + 1); rng2 = makeRng(seed + 77);
    for (let s = 0; s < 8; s++) rng();
    lastSupplied = 0; lastRemoved = 0; m.depositRate = 0; m.erosionRate = 0;
    acc = 0; roundNo = 0; trailNext = 0; islandAt = -1; islandSpot = null; m.clock = 0; m.finished = false; m.damUp = false; m.damBuiltAt = 0; m.seaNow = 0; m.areaHistory = []; m.peakArea = 0; m.suppliedTotal = 0; m.removedTotal = 0; m.splits = 0; m.plugged = 0; m.lastSplit = null; m.splitLog = []; m.splitPoints = [];
    turb.fill(0); sand.fill(0); mud.fill(0); over.fill(0); landAt.fill(0); hill.fill(0); chan.fill(0); river.fill(0); trailLen.fill(0); trailAge.fill(0);
    buildBase();
    startTips();
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

// 강에서 먼바다로 자른 단면(가운데 줄). 계산이 쌓은 흙을 그대로 읽는다.
export function sectionProfile(m, samples = 240) {
  const from = COAST - 56, to = N - 8;
  const out = { over: new Float32Array(samples), base: new Float32Array(samples), top: new Float32Array(samples), sand: new Float32Array(samples), mud: new Float32Array(samples), level: new Float32Array(samples), chan: new Uint8Array(samples), xs: new Float32Array(samples), ys: new Float32Array(samples), from, to };
  for (let t = 0; t < samples; t++) {
    const j = Math.round(from + ((to - from) * t) / (samples - 1));
    // 가운데 줄에서 가장 가까운, 물길이 아닌 칸을 잰다. 가운데로 흐르는 물길에 단면이 묻히지 않게 한다.
    let x = MID;
    for (let d = 0; d <= 34; d++) {
      if (!m.chan[j * N + MID + d]) { x = MID + d; break; }
      if (!m.chan[j * N + MID - d]) { x = MID - d; break; }
    }
    const k = j * N + x;
    out.xs[t] = x; out.ys[t] = j;
    out.base[t] = m.base[k]; out.top[t] = m.h[k]; out.sand[t] = m.sand[k]; out.mud[t] = m.mud[k]; out.over[t] = m.over[k]; out.level[t] = m.levelAt(j); out.chan[t] = m.chan[k] > 0 ? 1 : 0;
  }
  return out;
}

// 단면에 붙일 이름의 구간(표본 번호). 평원이 어느 정도 생긴 뒤에만 세 이름을 붙인다.
export function sectionMarks(p) {
  const n = p.top.length;
  let shore = -1, end = -1;
  for (let t = 0; t < n; t++) if (p.base[t] <= WET && p.top[t] > WET) { if (shore < 0) shore = t; end = t; }
  if (end - shore < 12) return {};
  const out = { plain: [shore, end] };
  let slope = -1;
  for (let t = end; t < n; t++) if (p.sand[t] > 0.04) slope = t;
  if (slope > end + 2) out.slope = [end, slope];
  const from = slope > end ? slope : end;
  let far = -1;
  for (let t = from; t < n; t++) if (p.mud[t] > 0.02) far = t;
  if (far > from + 8) out.prodelta = [from, far];
  return out;
}

// 퇴적 속도와 침식 속도를 비교한 말. 비슷하면 비슷하다고 적는다.
export function rateVerdict(m) {
  const d = m.depositRate, e = m.erosionRate;
  if (d < 0.5 && e < 0.5) return '아직 흙이 거의 쌓이지 않았습니다.';
  if (d > e * 1.3) return '퇴적 속도가 침식 속도보다 빨라 흙이 남습니다. 그래서 삼각주가 자랍니다.';
  if (e > d * 1.3) return '침식 속도가 퇴적 속도보다 빨라 땅이 줄어듭니다.';
  return '퇴적 속도와 침식 속도가 비슷해 쌓인 만큼 옮겨 갑니다. 그래서 삼각주가 자라지 못합니다.';
}

export function balance(m) {
  return m.suppliedTotal > 1 ? m.removedTotal / m.suppliedTotal : 0;
}
// 그때 일어나는 일을 적는다. 모두 계산 상태에서 고르므로 화면과 어긋나지 않는다.
export function noteText(m) {
  const taken = balance(m), area = m.newLand(), tide = m.options.tide, peak = m.peakArea;
  if (m.damUp) {
    if (peak < 400) return m.finished
      ? '이 조건에서는 하굿둑을 세우기 전부터 땅이 거의 없었습니다. 공급이 적거나 조류가 강한 까닭입니다. 하굿둑은 바닷물이 강으로 거슬러 오르는 것을 막아 농업 용수와 공업 용수를 얻게 합니다.'
      : '하굿둑을 세웠습니다. 다만 이 조건에서는 이미 땅이 거의 없습니다. 공급이 적거나 조류가 강한 까닭입니다.';
    if (m.finished) return `하굿둑이 강의 흙을 대부분 막아 퇴적 속도가 침식 속도보다 느려졌습니다. 이 모형에서는 물에 닿은 가장자리가 깎여 새 땅이 가장 넓을 때보다 ${Math.round((1 - area / peak) * 100)}% 줄었습니다. 대신 바닷물이 강으로 거슬러 오르는 것을 막아 농업 용수와 공업 용수를 얻습니다.`;
    return '하굿둑을 세웠습니다. 강이 실어 오던 흙이 둑에 막혀 하구로 거의 오지 않습니다. 파랑과 조류는 그대로여서 침식 속도가 퇴적 속도보다 빨라지고, 물에 닿은 가장자리부터 조금씩 깎입니다.';
  }
  if (m.finished) {
    if (area < 400) return tide === 'high'
      ? `쌓인 흙의 ${Math.round(taken * 100)}%를 조류가 옮겨 가 땅이 거의 생기지 않았습니다. 옮겨진 고운 흙은 일부가 옆 바닷가의 갯벌이 됩니다. 조차가 큰 황해로 흐르는 한강, 금강, 영산강의 하구에 큰 삼각주 대신 넓게 열린 하구가 나타나는 까닭입니다.`
      : `쌓인 흙의 ${Math.round(taken * 100)}%를 바다가 옮겨 가 땅이 거의 생기지 않았습니다. 퇴적 속도가 침식 속도보다 빨라야 삼각주가 자랍니다.`;
    if (taken > 0.5) return `쌓인 흙의 ${Math.round(taken * 100)}%를 조류와 파랑이 옮겨 갔습니다. 퇴적 속도가 침식 속도보다 충분히 빠르지 않으면 삼각주는 크게 자라지 못합니다.`;
    return `퇴적 속도가 침식 속도보다 훨씬 빨라 삼각주가 바다 쪽으로 자랐습니다. 쌓인 흙 가운데 파랑과 조류가 옮겨 간 것은 ${Math.round(taken * 100)}%입니다.${m.options.supply === 'low' ? '' : ' 조차가 작은 남해로 흐르는 낙동강 하구에 삼각주가 발달한 까닭입니다.'}`;
  }
  if (m.lastSplit && m.clock - m.lastSplit.clock < 4) return '하구 앞 모래톱이 수면에 닿아 물길을 막았습니다. 물은 모래톱 양쪽으로 갈라져 흐릅니다(분류). 물 위로 드러난 모래톱은 하중도가 됩니다.';
  if (m.clock < 7) return '강물이 바다에 닿으면 갑자기 느려져 실어 온 흙을 더 옮기지 못합니다. 무거운 모래는 하구 바로 앞에, 고운 진흙은 멀리까지 퍼져 내려앉습니다. 이렇게 쌓이는 빠르기가 파랑과 조류가 깎는 빠르기보다 빠르면 삼각주가 됩니다.';
  if (m.splits === 0) return tide === 'high' ? '모래톱이 쌓이지만 강한 조류가 드나들며 흙을 옮겨 가 수면까지 올라오지 못합니다. 그래서 물길이 갈라지지 않습니다.' : '하구 앞 모래톱이 점점 높아집니다. 물길은 얕아진 곳까지만 바다 쪽으로 나아갑니다.';
  if (taken > 0.6) return '조류가 밀물과 썰물 때마다 낮은 바닥의 흙을 옮겨 갑니다. 일부는 옆 바닷가에 갯벌로 쌓이고 나머지는 앞바다로 갑니다. 그래서 하구의 땅이 잘 늘지 않습니다.';
  if (m.lastSplit && m.clock - m.lastSplit.clock < 12) return '갈라진 물길 앞에 다시 모래톱이 쌓여 또 갈라집니다. 갈라질수록 물길 하나의 물이 줄어듭니다.';
  return '물길마다 바다 쪽으로 나아가며 앞에 흙을 내려놓습니다. 물이 둑을 넘칠 때 고운 흙이 물길 사이를 채워 낮고 평평한 삼각주 평원이 넓어집니다. 퇴적 속도가 침식 속도보다 빠른 동안 평원은 계속 바다 쪽으로 자랍니다.';
}

export function compareBrief(a, b) {
  const t = m => `새 땅이 블록의 ${((m.newLand() / (N * N)) * 100).toFixed(1)}%, 쌓인 흙 중 바다가 옮겨 간 비율 ${Math.round(balance(m) * 100)}%`;
  return { a: t(a), b: t(b) };
}
