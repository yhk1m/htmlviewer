// © 2026 김용현
// 철원 용암대지와 한탄강 협곡 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료(tools/bake-dem.py로 구운 512칸 정사각형, 데시미터, 세로 0이 북쪽)이고,
// 한탄강과 대교천 물길 선, 이름표 자리는 OpenStreetMap에서 옮겼다(cheorwon-osm.js).
// '평평한 용암대지'와 '협곡 절벽'은 지질도가 아니라 땅의 높이와 기울기로 어림한 것이다. 논 색도 평평하고 낮은 땅에 규칙으로 칠한 예시다.
// 계산은 + - * / 와 Math.sqrt, floor, ceil, round, max, min, abs만 쓴다(같은 자료는 늘 같은 결과).
import { PLACES, RIVER, DAEGYO } from './cheorwon-osm.js';

export const N = 512;
export const SIZE = 11000;
export const SITE = { lat: 38.179, lon: 127.258, km: 11 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 평평한 땅 어림: 다듬은 높이로 잰 기울기가 slope보다 완만하고, top(m)보다 낮고, 한탄강에서 river칸보다 먼 칸.
// 0.05는 약 3도다. 한탄강 서쪽에서 이런 칸이 minCells칸(약 0.2제곱킬로미터) 넘게 이어진 덩어리만 용암대지로 친다(협곡 동쪽의 평평한 땅은 넣지 않는다).
export const FLAT_RULE = { slope: 0.05, top: 260, river: 5, minCells: 400 };
// 협곡 절벽 어림: 한탄강에서 near칸 안이고 기울기가 from보다 가파르면 바위가 드러나기 시작하고 to에서 다 드러난 것으로 친다.
// 약 30m 자료라 실제 절벽(거의 수직)보다 훨씬 완만하게 나오므로 낮게 잡았다. 0.12는 약 7도, 0.3은 약 17도다. 둘레 용암대지 면보다 높은 언덕 비탈은 넣지 않는다.
export const CLIFF_RULE = { from: 0.12, to: 0.3, near: 12 };
export { PLACES, RIVER, DAEGYO };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const idx = (i, j) => j * N + i;
export const inside = (i, j) => i >= 0 && j >= 0 && i < N && j < N;

export function readDem(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  return h;
}

export function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}

export function blur(a, r, passes) {
  let out = Float32Array.from(a);
  for (let q = 0; q < passes; q++) {
    const from = out.slice();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let s = 0, c = 0;
      for (let y = Math.max(0, j - r); y <= Math.min(N - 1, j + r); y++) for (let x = Math.max(0, i - r); x <= Math.min(N - 1, i + r); x++) { s += from[y * N + x]; c++; }
      out[j * N + i] = s / c;
    }
  }
  return out;
}

// 땅의 기울기(높이 차 / 거리). 이웃 두 칸 사이로 잰다.
export function slopeOf(sh, cell) {
  const s = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dx = (sh[ir] - sh[il]) / ((ir - il) * cell || 1), dy = (sh[jr] - sh[jl]) / (((jr - jl) / N) * cell || 1);
    s[k] = Math.sqrt(dx * dx + dy * dy);
  }
  return s;
}

// 꺾은 선을 step칸 간격의 점으로 나눈다.
export function densify(line, step = 0.5) {
  const out = [];
  for (let n = 0; n < line.length - 1; n++) {
    const [x0, y0] = line[n], [x1, y1] = line[n + 1], dx = x1 - x0, dy = y1 - y0, s = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / step));
    for (let q = 0; q < s; q++) out.push([x0 + (dx * q) / s, y0 + (dy * q) / s]);
  }
  out.push(line[line.length - 1].slice());
  return out;
}

// 지도 자료의 물길 선은 고도 자료의 골짜기 바닥과 한두 칸 어긋난다. 점마다 r칸 안에서 가장 낮은 칸으로 옮긴 뒤 앞뒤 점과 고르게 편다.
export function snapToFloor(h, line, r = 2) {
  const pts = densify(line).filter(([x, y]) => x >= 0 && y >= 0 && x <= N - 1 && y <= N - 1);
  const snapped = pts.map(([x, y]) => {
    let best = [x, y], bz = Infinity;
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
      if (a * a + b * b > r * r) continue;
      const i = Math.round(x) + a, j = Math.round(y) + b;
      if (!inside(i, j)) continue;
      if (h[idx(i, j)] < bz) { bz = h[idx(i, j)]; best = [i, j]; }
    }
    return best;
  });
  const out = [];
  for (let n = 0; n < snapped.length; n++) {
    let sx = 0, sy = 0, c = 0;
    for (let q = Math.max(0, n - 3); q <= Math.min(snapped.length - 1, n + 3); q++) { sx += snapped[q][0]; sy += snapped[q][1]; c++; }
    out.push({ x: sx / c, y: sy / c });
  }
  return out;
}

// 칸마다 가장 가까운 선 위 점까지의 거리(칸)와 그 점 번호. reach칸 밖은 reach로 둔다.
export function distanceTo(points, reach = 30) {
  const d = new Float32Array(N * N).fill(reach), near = new Int32Array(N * N).fill(-1);
  points.forEach((p, n) => {
    for (let j = Math.max(0, Math.floor(p.y - reach)); j <= Math.min(N - 1, Math.ceil(p.y + reach)); j++)
      for (let i = Math.max(0, Math.floor(p.x - reach)); i <= Math.min(N - 1, Math.ceil(p.x + reach)); i++) {
        const e = Math.sqrt((i - p.x) * (i - p.x) + (j - p.y) * (j - p.y));
        const k = idx(i, j);
        if (e < d[k]) { d[k] = e; near[k] = n; }
      }
  });
  return { d, near };
}

// 물길 바닥 높이: 위에서 아래로 내려가며 앞보다 높아지지 않게 한다(물은 거슬러 오르지 않는다). 점마다 2칸 안 가장 낮은 칸을 읽는다.
export function floorAlong(h, path) {
  const z = [];
  let last = Infinity;
  for (const p of path) {
    let lo = Infinity;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
      const i = Math.round(p.x) + a, j = Math.round(p.y) + b;
      if (inside(i, j)) lo = Math.min(lo, h[idx(i, j)]);
    }
    last = Math.min(last, lo);
    z.push(last);
  }
  return z;
}

// 씨앗 칸에서 조건(ok)을 만족하는 이웃 칸(상하좌우)으로 번져 나간 칸들. mark에 value를 적고 칠한 칸 수를 돌려준다.
export function floodFrom(seeds, ok, mark = new Uint8Array(N * N), value = 1) {
  const queue = new Int32Array(N * N);
  let head = 0, tail = 0;
  for (const [i, j] of seeds) { const k = idx(i, j); if (ok(k) && !mark[k]) { mark[k] = value; queue[tail++] = k; } }
  while (head < tail) {
    const k = queue[head++], i = k % N, j = (k - i) / N;
    const next = [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, j > 0 ? k - N : -1, j < N - 1 ? k + N : -1];
    for (const m of next) if (m >= 0 && !mark[m] && ok(m)) { mark[m] = value; queue[tail++] = m; }
  }
  mark.count = tail;
  return mark;
}

// ok를 만족하는 칸 가운데 minCells칸 넘게 이어진 덩어리만 남긴다.
export function bigPatches(ok, minCells) {
  const label = new Int32Array(N * N), queue = new Int32Array(N * N), sizes = [0];
  for (let s = 0; s < N * N; s++) {
    if (label[s] || !ok(s)) continue;
    const id = sizes.length;
    let head = 0, tail = 0;
    label[s] = id; queue[tail++] = s;
    while (head < tail) {
      const k = queue[head++], i = k % N, j = (k - i) / N;
      const next = [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, j > 0 ? k - N : -1, j < N - 1 ? k + N : -1];
      for (const m of next) if (m >= 0 && !label[m] && ok(m)) { label[m] = id; queue[tail++] = m; }
    }
    sizes.push(tail);
  }
  const keep = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) if (label[k] && sizes[label[k]] > minCells) keep[k] = 1;
  return keep;
}

// 둘레 8칸 가운데 6칸 이상이 표시된 칸을 채워 자료의 잔물결로 생긴 작은 구멍을 메운다.
export function fillPinholes(mark, rounds = 2) {
  for (let q = 0; q < rounds; q++) {
    const from = mark.slice();
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const k = idx(i, j);
      if (from[k]) continue;
      let c = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if ((a || b) && from[k + b * N + a]) c++;
      if (c >= 6) mark[k] = 1;
    }
  }
  return mark;
}

const median = v => { const s = Array.from(v).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const pathLength = p => { let s = 0; for (let n = 1; n < p.length; n++) { const dx = p[n].x - p[n - 1].x, dy = p[n].y - p[n - 1].y; s += Math.sqrt(dx * dx + dy * dy); } return s * CELL; };

// 가려 둔 칸(mask)끼리만 평균하는 흐리기. 평평한 들의 잔물결만 펴고 협곡 벽과 산은 건드리지 않는다.
export function maskedBlur(a, mask, r, passes) {
  let out = Float32Array.from(a);
  for (let q = 0; q < passes; q++) {
    const from = out.slice();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = idx(i, j);
      if (!mask[k]) continue;
      let s = 0, c = 0;
      for (let y = Math.max(0, j - r); y <= Math.min(N - 1, j + r); y++) for (let x = Math.max(0, i - r); x <= Math.min(N - 1, i + r); x++) if (mask[y * N + x]) { s += from[y * N + x]; c++; }
      out[k] = s / c;
    }
  }
  return out;
}

// 강 점마다 둘레(8에서 20칸 사이) 용암대지 칸 높이의 가운데 값. 용암대지 칸이 20개보다 적으면 NaN이다.
export function rimAlong(h, plateau, river, every = 4) {
  const out = [];
  for (let n = 0; n < river.length; n += every) {
    const p = river[n], v = [];
    for (let j = Math.max(0, Math.round(p.y) - 20); j <= Math.min(N - 1, Math.round(p.y) + 20); j++)
      for (let i = Math.max(0, Math.round(p.x) - 20); i <= Math.min(N - 1, Math.round(p.x) + 20); i++) {
        const k = idx(i, j), e = (i - p.x) * (i - p.x) + (j - p.y) * (j - p.y);
        if (plateau[k] && e >= 64 && e <= 400) v.push(h[k]);
      }
    out.push(v.length >= 20 ? median(v) : NaN);
  }
  return out;
}

// opts.built: 건물이 덮는 칸(1). 그 칸은 논 대신 맨땅 색으로 칠한다.
// 돌려주는 h는 화면과 단면에 쓰는 높이다. 고도 자료(raw)에는 나무와 건물 높이와 오차가 몇 m씩 섞여 평평한 들이 울퉁불퉁하므로,
// 평평한 들(용암대지 어림과 논 자리)에서만 둘레 평평한 칸끼리 평균해 편다. 협곡 벽, 강바닥, 산은 원자료 그대로다.
export function buildCheorwon(dem, opts = {}) {
  const raw = readDem(dem);
  const sh = blur(raw, 2, 2), slope = slopeOf(sh, CELL);
  const river = snapToFloor(raw, RIVER), daegyo = snapToFloor(raw, DAEGYO);
  const riverZ = floorAlong(raw, river);
  // 강을 따라 잰 거리(m). 절벽의 기둥 무늬를 협곡 벽을 따라 가로로 늘어세우는 데 쓴다.
  const riverM = [0];
  for (let n = 1; n < river.length; n++) { const dx = river[n].x - river[n - 1].x, dy = river[n].y - river[n - 1].y; riverM.push(riverM[n - 1] + Math.sqrt(dx * dx + dy * dy) * CELL); }
  const { d: dRiver, near } = distanceTo(river);
  const { d: dDaegyo } = distanceTo(daegyo, 6);
  // 한탄강 서쪽: 서쪽 끝 가운데 칸에서 강물 띠를 건너지 않고 닿는 칸. 강은 창의 북쪽 끝에서 남쪽 끝까지 이어져 창을 둘로 나눈다.
  // 물길 선은 창 끝에서 한두 칸 안쪽에서 끝나므로, 끝점에서 창 끝까지도 막는다.
  const r0 = river[0], r1 = river[river.length - 1];
  const wall = k => { const i = k % N, j = (k - i) / N; return dRiver[k] <= 1.5 || (j <= r0.y + 1 && Math.abs(i - r0.x) <= 2) || (j >= r1.y - 1 && Math.abs(i - r1.x) <= 2); };
  const west = floodFrom([[0, N >> 1]], k => !wall(k));
  // 용암대지 어림: 한탄강 서쪽의 평평하고 낮은 땅 가운데 큰 덩어리
  const plateau = fillPinholes(bigPatches(k => west[k] && slope[k] < FLAT_RULE.slope && sh[k] < FLAT_RULE.top && dRiver[k] > FLAT_RULE.river, FLAT_RULE.minCells));
  // 평평한 땅의 몫(0에서 1)과 잔물결을 펼 칸
  const flatW = new Float32Array(N * N), even = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) {
    flatW[k] = (1 - smooth(FLAT_RULE.slope * 0.8, FLAT_RULE.slope * 1.6, slope[k])) * (1 - smooth(FLAT_RULE.top - 30, FLAT_RULE.top, sh[k]));
    even[k] = dRiver[k] > FLAT_RULE.river && dDaegyo[k] > 2 && (plateau[k] || flatW[k] > 0.5) ? 1 : 0;
  }
  const h = maskedBlur(raw, even, 2, 2);
  const fine = slopeOf(blur(h, 1, 1), CELL);
  const rim = rimAlong(h, plateau, river);
  const built = opts.built;
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4), splatC = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  const cliff = new Float32Array(N * N);
  let plateauCells = 0, cliffCells = 0, waterCells = 0, farmCells = 0;
  for (let k = 0; k < N * N; k++) {
    const n = near[k], floor = n >= 0 ? riverZ[n] : -Infinity, top = n >= 0 ? rim[n >> 2] : NaN;
    // 물: 한탄강 선에서 0.9칸 안, 또는 1.4칸(약 30m) 안이면서 바닥 높이에서 12m 안인 칸. 대교천은 좁아 0.8칸 안만 칠한다.
    // 높이 조건은 칸마다 끊기지 않게 8에서 14m 사이에서 서서히 줄인다(물과 벽의 경계가 계단처럼 보이지 않게).
    const wet = Math.max(dRiver[k] < 0.9 ? 1 : dRiver[k] < 1.4 ? (1 - smooth(0.9, 1.4, dRiver[k])) * (1 - smooth(floor + 8, floor + 14, h[k])) : 0, 1 - smooth(0.4, 0.8, dDaegyo[k]));
    // 협곡 절벽: 강에서 near칸 안의 가파른 곳으로, 물보다 높고 둘레 용암대지 면보다 낮은 칸(용암대지가 없는 곳은 강바닥에서 40m까지).
    const lid = top === top ? top + 2 : floor + 40;
    // 강바닥 쪽과 용암대지 면 쪽 끝은 몇 m에 걸쳐 서서히 줄인다.
    const c = dRiver[k] < CLIFF_RULE.near ? smooth(CLIFF_RULE.from, CLIFF_RULE.to, fine[k]) * (1 - smooth(CLIFF_RULE.near - 3, CLIFF_RULE.near, dRiver[k])) * smooth(floor + 1, floor + 4, h[k]) * (1 - smooth(lid - 2, lid + 2, h[k])) : 0;
    // 강바닥 자갈과 바위: 물가 둘레
    const bar = dRiver[k] < 2.6 && h[k] < floor + 8 ? (1 - smooth(1.6, 2.6, dRiver[k])) * (1 - wet) : 0;
    // 논: 평평하고 낮은 땅(예시). 용암대지 어림 칸은 모두 논으로 친다. 건물 칸은 맨땅
    const flat = Math.max(flatW[k], plateau[k]);
    const town = built && built[k] ? 1 : 0;
    const farm = clamp(flat * (1 - c) * (1 - wet) * (1 - bar) * (1 - town) * (dRiver[k] > 3 ? 1 : 0));
    const soil = town * (1 - wet);
    const grass = clamp((1 - smooth(0.12, 0.3, slope[k])) * (1 - flat) * (1 - smooth(230, 300, sh[k])) * 0.7 * (1 - c));
    const fo = clamp(1 - farm - soil - grass - c - wet - bar);
    splatA[k * 4] = bar * 255; splatA[k * 4 + 1] = soil * 255; splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255;
    // 셋째 판: 빨강은 협곡 절벽(어두운 현무암 색으로 덧칠), 초록은 용암대지 어림(켜면 주황으로 덧칠)
    splatC[k * 4] = c * 255; splatC[k * 4 + 1] = plateau[k] * 255; splatC[k * 4 + 3] = 255;
    cliff[k] = c; forest[k] = fo; water[k] = wet;
    mountain[k] = 1 - flat;
    if (plateau[k]) plateauCells++;
    if (c >= 0.5) cliffCells++;
    if (wet >= 0.5) waterCells++;
    if (farm >= 0.5) farmCells++;
  }
  // 절벽 아래 돌무더기(애추) 어림: 절벽 칸에서 2칸 안이고 강바닥에서 10m 안의 낮은 칸(물 칸 빼고). 위로 갈수록 옅어진다.
  const talus = new Float32Array(N * N), along = new Float32Array(N * N).fill(-1);
  let talusCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j), n = near[k];
    if (n >= 0) along[k] = riverM[n];
    if (n < 0 || cliff[k] >= 0.5 || water[k] >= 0.5 || dRiver[k] >= CLIFF_RULE.near || h[k] > riverZ[n] + 10) continue;
    let foot = false;
    for (let b = -2; b <= 2 && !foot; b++) for (let a = -2; a <= 2; a++) if (inside(i + a, j + b) && cliff[idx(i + a, j + b)] >= 0.5) { foot = true; break; }
    if (!foot) continue;
    const t = (1 - smooth(riverZ[n] + 4, riverZ[n] + 10, h[k])) * 0.9;
    talus[k] = t;
    if (t >= 0.5) talusCells++;
    // 돌무더기 자리는 숲과 논을 덜고 자갈 색을 더한다.
    forest[k] *= 1 - t;
    splatA[k * 4] = Math.max(splatA[k * 4], Math.round(t * 255));
    splatA[k * 4 + 3] = Math.round(forest[k] * 255);
    splatB[k * 4] = Math.round(splatB[k * 4] * (1 - t));
  }
  // 강 거리는 가장 가까운 강 점이 바뀌는 곳(굽이 안쪽)에서 부채꼴로 튀므로, 강 둘레 칸끼리 고르게 편다.
  {
    const has = new Uint8Array(N * N);
    for (let k = 0; k < N * N; k++) has[k] = along[k] >= 0 ? 1 : 0;
    along.set(maskedBlur(along, has, 3, 3));
  }
  // 협곡 깊이: 둘레 용암대지 면과 강바닥의 높이 차(강 점 8개마다)
  const depth = [];
  for (let n = 0; n < river.length; n += 8) if (rim[n >> 2] === rim[n >> 2]) depth.push(rim[n >> 2] - riverZ[n]);
  // 편 높이와 원자료의 차(평평한 들에서)
  let moved = 0, movedMax = 0, evenCells = 0;
  for (let k = 0; k < N * N; k++) if (even[k]) { const e = Math.abs(h[k] - raw[k]); moved += e; movedMax = Math.max(movedMax, e); evenCells++; }
  const plateauH = [];
  for (let k = 0; k < N * N; k++) if (plateau[k]) plateauH.push(h[k]);
  const km2 = c => +((c * CELL * CELL) / 1e6).toFixed(1);
  const sortedDepth = depth.slice().sort((a, b) => a - b);
  return {
    h, raw, sh, slope, plateau, west, even, cliff, talus, along, river, riverZ, riverM, daegyo, dRiver, mountain,
    stage: { h, splatA, splatB, splatC, forest, water, total },
    stats: {
      plateauKm2: km2(plateauCells), cliffKm2: +((cliffCells * CELL * CELL) / 1e6).toFixed(2), farmKm2: km2(farmCells), waterCells,
      plateauMedian: Math.round(median(plateauH)),
      // 용암대지 높이 범위: 아래 10%, 위 10% 자리
      plateauLow: Math.round(plateauH.sort((a, b) => a - b)[Math.floor(plateauH.length * 0.1)] ?? 0), plateauHigh: Math.round(plateauH[Math.floor(plateauH.length * 0.9)] ?? 0),
      riverKm: +(pathLength(river) / 1000).toFixed(1), riverTop: Math.round(riverZ[0]), riverEnd: Math.round(riverZ[riverZ.length - 1]),
      depthMedian: Math.round(median(depth)), depthLow: Math.round(sortedDepth[Math.floor(sortedDepth.length * 0.1)] ?? 0), depthHigh: Math.round(sortedDepth[Math.floor(sortedDepth.length * 0.9)] ?? 0),
      talusKm2: +((talusCells * CELL * CELL) / 1e6).toFixed(2),
      evenMean: Math.round((moved / evenCells) * 10) / 10, evenMax: Math.round(movedMax),
      low: Math.round(h.reduce((a, v) => Math.min(a, v), Infinity)), high: Math.round(h.reduce((a, v) => Math.max(a, v), -Infinity)),
    },
  };
}

// 꺾은 선 way([가로, 세로] 칸들)를 따라 step칸마다 잰 높이와 물, 절벽, 용암대지 어림 값
export function pathProfile(sim, way, step = 0.5) {
  const out = [];
  let m = 0;
  for (let n = 0; n < way.length - 1; n++) {
    const [x0, y0] = way[n], [x1, y1] = way[n + 1], dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy), s = Math.max(1, Math.round(L / step));
    for (let q = n === 0 ? 0 : 1; q <= s; q++) {
      const x = x0 + (dx * q) / s, y = y0 + (dy * q) / s, k = idx(clamp(Math.round(x), 0, N - 1), clamp(Math.round(y), 0, N - 1));
      out.push({ m: m + (q / s) * L * CELL, x, y, z: sampleH(sim.h, x, y), water: sim.stage.water[k] >= 0.5, cliff: sim.cliff[k] >= 0.5, plateau: sim.plateau[k] === 1 });
    }
    m += L * CELL;
  }
  return out;
}

// 협곡 단면: 순담계곡과 드르니 사이(한탄강 주상절리길 구간)에서 협곡을 서쪽에서 동쪽으로 가로지른다.
// A는 서쪽 용암대지 위 들판, B는 동쪽 기반암 언덕 너머다.
export const CANYON_WAY = [[318, 300], [440, 300]];
// 골짜기 단면: 서쪽 금학산 꼭대기에서 남동쪽 산기슭으로 내려와 용암대지를 지나 협곡과 동쪽 언덕을 건너 동쪽 끝까지
export const VALLEY_WAY = () => [PLACES.금학산.slice(0, 2), [110, 300], [505, 300]];
export const canyonProfile = sim => pathProfile(sim, CANYON_WAY);
export const valleyProfile = sim => pathProfile(sim, VALLEY_WAY());

// 협곡 단면의 숫자. 용암대지 면 높이는 강보다 서쪽 구간 가운데 용암대지 어림 칸의 가운데 값이다.
export function canyonNumbers(points) {
  let floor = 0;
  points.forEach((p, n) => { if (p.z < points[floor].z) floor = n; });
  const westPlateau = points.slice(0, floor).filter(p => p.plateau).map(p => p.z);
  const top = median(westPlateau.length ? westPlateau : points.slice(0, floor).map(p => p.z));
  let west = floor, east = floor;
  // 협곡 너비는 용암대지 면에서 10m 내려간 높이에서 잰다(자료의 잔물결로 테두리가 흔들리지 않게).
  while (west > 0 && points[west].z < top - 10) west--;
  while (east < points.length - 1 && points[east].z < top - 10) east++;
  // 서쪽 벽에서 두 칸(약 43m) 사이 가장 급한 기울기
  const dm = points[1].m - points[0].m, span = Math.max(2, Math.round(2 * CELL / dm));
  let steep = 0;
  for (let n = west; n + span <= floor; n++) steep = Math.max(steep, Math.abs(points[n + span].z - points[n].z) / (points[n + span].m - points[n].m));
  let eastTop = floor;
  for (let n = floor; n < points.length; n++) if (points[n].z > points[eastTop].z) eastTop = n;
  return {
    lengthKm: points[points.length - 1].m / 1000, floor, west, east, eastTop,
    top: Math.round(top), floorZ: Math.round(points[floor].z), depth: Math.round(top - points[floor].z),
    widthM: Math.round(points[east].m - points[west].m), steepWest: Math.round(steep * 100) / 100, eastTopZ: Math.round(points[eastTop].z),
  };
}
export function canyonMarks(points) {
  const n = canyonNumbers(points), mid = Math.round(n.west / 2);
  return [
    { at: mid, text: '용암대지 면' },
    { at: Math.round((n.west + n.floor) / 2), text: '현무암 절벽' },
    { at: n.floor, text: '한탄강' },
    { at: n.eastTop, text: '기반암 언덕' },
  ];
}

// 골짜기 단면의 숫자: 금학산 쪽 가장 높은 곳, 강바닥, 강 서쪽 용암대지 구간 길이와 높이
export function valleyNumbers(points) {
  let floor = 0, west = 0;
  points.forEach((p, n) => { if (p.water && (floor === 0 || p.z < points[floor].z)) floor = n; });
  if (!floor) points.forEach((p, n) => { if (n > points.length / 2 && p.z < points[floor || n].z) floor = n; });
  let plateauM = 0;
  const zs = [];
  for (let n = 1; n < points.length; n++) if (points[n].plateau && points[n - 1].plateau) { plateauM += points[n].m - points[n - 1].m; zs.push(points[n].z); }
  let firstPlateau = points.findIndex(p => p.plateau), eastTop = floor;
  for (let n = floor; n < points.length; n++) if (points[n].z > points[eastTop].z) eastTop = n;
  if (firstPlateau < 0) firstPlateau = Math.round(floor / 2);
  return {
    lengthKm: points[points.length - 1].m / 1000, start: Math.round(points[west].z), floor, floorZ: Math.round(points[floor].z),
    plateauKm: plateauM / 1000, plateauZ: Math.round(median(zs)), firstPlateau, eastTop, eastTopZ: Math.round(points[eastTop].z),
  };
}
export function valleyMarks(points) {
  const n = valleyNumbers(points);
  return [
    { at: 0, text: '금학산' },
    { at: Math.round((n.firstPlateau + n.floor) / 2), text: '용암대지(철원 평야)' },
    { at: n.floor, text: '한탄강 협곡' },
    { at: n.eastTop, text: '기반암 언덕' },
  ];
}

// 강 위에서 칸 [x, y]에 가장 가까운 점
export function nearestOn(path, [x, y]) {
  let best = path[0], bd = Infinity;
  for (const p of path) { const e = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (e < bd) { bd = e; best = p; } }
  return [Math.round(best.x * 10) / 10, Math.round(best.y * 10) / 10];
}

// 이름표 자리. kind: river(물길), spot(명소), town(읍내), peak(산), guess(넓은 들의 이름, 자리는 어림)
// 주상절리 이름표 자리(어림): 순담계곡과 드르니 사이 강이 곧게 흐르는 구간의 한탄강 서쪽 벽에서 절벽 어림 값이 가장 큰 칸.
// 실제 주상절리를 잰 자리가 아니라, 현무암 절벽이 있을 만한 곳에 붙인 예시 자리다.
export const COLUMN_NEAR = [371, 328];
export function columnSpot(sim, [cx, cy] = COLUMN_NEAR, r = 10) {
  let best = [cx, cy], bv = -1;
  for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
    if (!inside(i, j)) continue;
    const k = idx(i, j);
    if (!sim.west[k] || sim.cliff[k] < 0.5) continue;
    // 같은 값이면 강에서 먼 쪽(벽 위쪽)을 고른다.
    const v = sim.cliff[k] * 100 + sim.dRiver[k];
    if (v > bv) { bv = v; best = [i, j]; }
  }
  return best;
}

export function placesOf(sim) {
  const at = (name, sub, kind) => ({ name, sub, grid: PLACES[name].slice(0, 2), kind });
  return {
    hantan: { name: '한탄강', sub: '용암대지를 파고든 협곡', grid: nearestOn(sim.river, [335, 165]), kind: 'river' },
    jiktang: at('직탕폭포', '한탄강 본류의 넓고 낮은 폭포', 'spot'),
    goseok: at('고석정', '협곡 안의 큰 바위와 정자', 'spot'),
    sundam: at('순담계곡', '협곡 안 바위 골짜기', 'spot'),
    deureuni: at('드르니', '주상절리길 남쪽 입구', 'spot'),
    daegyo: { name: '대교천', sub: '지류가 판 좁은 협곡', grid: nearestOn(sim.daegyo, [330, 240]), kind: 'river' },
    dongsong: at('동송읍', '용암대지 가장자리의 읍내', 'town'),
    galmal: at('갈말읍', '철원군청이 있는 읍내', 'town'),
    geumhak: at('금학산', '947m, 서쪽 산지', 'peak'),
    columns: { name: '주상절리', sub: '기둥 모양 틈(자리는 어림)', grid: columnSpot(sim), kind: 'guess' },
    plain: { name: '철원 평야', sub: '용암대지 위의 논(넓은 들의 이름, 자리는 어림)', grid: [185, 200], kind: 'guess' },
  };
}
