// © 2026 김용현
// 강릉 경포호 실제 지형 화면의 재료. 땅 높이만 실제 자료이고, 호수와 하천, 모래 해안의 자리는 OpenStreetMap 자료에서 옮겼다. 표면 재질은 규칙으로 만든 예시다.
import { LAKE, LAKE_ISLE, BEACHES, STREAM, COAST } from './gyeongpo-osm.js';

export const N = 512;
export const SIZE = 6000;
export const SITE = { lat: 37.796, lon: 128.905, km: 6 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
export const LAKE_LEVEL = 0.6; // 호수 면을 그리는 높이(m). 석호의 수면은 해수면과 거의 같다.
const SEA_HEIGHT = 0.8;
// 격자 자리. 지명 좌표는 OpenStreetMap에서 옮겼다(초당동 37.7928N 128.9125E, 강문동 37.7916N 128.9190E, 저동 37.8045N 128.8881E).
export const CHODANG = [312, 285];
export const GANGMUN = [360, 297];
export const JEO = [129, 175];
export const SEA_SPOT = [440, 120];
// 단면: 서쪽 낮은 땅에서 호수와 사주, 해수욕장을 지나 바다까지. 해안선에 거의 수직이다.
export const PROFILE = { a: [167, 313], b: [370, 134] };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;

export function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}
function blur(a, r, passes) {
  let out = a.slice();
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
// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다).
export function fillPolygon(poly, mark, value = 1) {
  for (let j = 0; j < N; j++) {
    const xs = [], y = j + 0.5;
    for (let n = 0; n < poly.length - 1; n++) {
      const [x0, y0] = poly[n], [x1, y1] = poly[n + 1];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let i = Math.max(0, Math.ceil(xs[q] - 0.5)); i <= Math.min(N - 1, Math.floor(xs[q + 1] - 0.5)); i++) mark[idx(i, j)] = value;
  }
  return mark;
}
// 경유점을 모두 지나는 매끈한 선(Catmull-Rom)
function spline(way) {
  const out = [];
  for (let n = 0; n < way.length - 1; n++) {
    const a = way[Math.max(0, n - 1)], b = way[n], c = way[n + 1], d = way[Math.min(way.length - 1, n + 2)];
    const steps = Math.max(1, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 2));
    for (let q = 0; q < steps; q++) {
      const t = q / steps, t2 = t * t, t3 = t2 * t;
      const at = v => 0.5 * (2 * b[v] + (c[v] - a[v]) * t + (2 * a[v] - 5 * b[v] + 4 * c[v] - d[v]) * t2 + (3 * b[v] - a[v] - 3 * c[v] + d[v]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(way[way.length - 1]);
  return out;
}
// 바다: 해안선 바깥(북동쪽)에서 이어진 낮은 칸. 호수는 바다로 치지 않는다.
function seaMask(sh, lake) {
  const side = new Uint8Array(N * N);
  // 해안선 바깥 쪽을 표시한다. 해안선은 북서에서 남동으로 달리고 바다는 그 오른쪽 위다.
  const poly = [...COAST.slice().reverse(), [N + 60, -60]];
  poly.push(poly[0]);
  fillPolygon(poly, side);
  const sea = new Uint8Array(N * N), list = [];
  for (let k = 0; k < N * N; k++) if (side[k] && !lake[k]) { sea[k] = 1; list.push(k); }
  // 해안선 자료와 고도 자료가 조금 어긋난 물가는 낮은 칸을 따라 넓힌다.
  for (let t = 0; t < list.length; t++) {
    const c = list[t], i = c % N, j = (c / N) | 0;
    for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      if (a < 0 || b < 0 || a >= N || b >= N) continue;
      const o = idx(a, b);
      if (!sea[o] && !lake[o] && sh[o] < SEA_HEIGHT && Math.abs(t) < 4e5) { sea[o] = 2; list.push(o); }
    }
  }
  for (let k = 0; k < N * N; k++) if (sea[k] === 2 && !side[k]) { let near = false; const i = k % N, j = (k / N) | 0; for (let b = -3; b <= 3 && !near; b++) for (let a = -3; a <= 3; a++) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < N && jj < N && side[idx(ii, jj)]) { near = true; break; } } if (!near) sea[k] = 0; }
  for (let k = 0; k < N * N; k++) if (sea[k]) sea[k] = 1;
  return sea;
}

export function buildGyeongpo(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const lake = fillPolygon(LAKE, new Uint8Array(N * N));
  fillPolygon(LAKE_ISLE, lake, 0);
  const sand = new Uint8Array(N * N);
  for (const b of BEACHES) fillPolygon(b, sand);
  const sh = blur(h, 2, 2);
  const sea = seaMask(sh, lake);
  // 하천: 선에서 1.4칸 안
  const river = new Uint8Array(N * N), path = spline(STREAM);
  for (const [x, y] of path) for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (i < 0 || j < 0 || i >= N || j >= N) continue;
    if (Math.hypot(i - x, j - y) <= 1.4 && !lake[idx(i, j)]) river[idx(i, j)] = 1;
  }
  for (let k = 0; k < N * N; k++) {
    if (sea[k]) h[k] = 0; // 바다는 모두 0m로 그린다.
    else if (lake[k]) h[k] = 0.2; // 호수 바닥은 자료에 없어 수면 바로 아래로 둔다.
  }
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N), lowLand = new Uint8Array(N * N);
  let lakeCells = 0, sandCells = 0, lowCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const wet = sea[k] || lake[k] || river[k] ? 1 : 0, sd = sand[k] && !wet ? 1 : 0;
    // 호수 둘레의 낮고 평평한 땅은 논밭으로 칠한다.
    const flat = 1 - smooth(0.04, 0.1, slope), low = 1 - smooth(4, 9, sh[k]);
    const farm = flat * low * (1 - wet) * (1 - sd);
    if (farm > 0.5 && sh[k] < 4) { lowLand[k] = 1; lowCells++; }
    const rocky = smooth(0.6, 1.0, slope);
    const fo = clamp(1 - rocky - farm - wet - sd);
    splatA[k * 4] = 0; splatA[k * 4 + 1] = 0; splatA[k * 4 + 2] = 0; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255; splatB[k * 4 + 2] = sd * 255; splatB[k * 4 + 3] = 0;
    forest[k] = fo; water[k] = wet;
    mountain[k] = clamp(1 - farm - wet - sd);
    if (lake[k]) lakeCells++;
    if (sd) sandCells++;
  }
  return { h, sh, sea, lake, sand, river, lowLand, mountain, stage: { h, splatA, splatB, forest, water, total }, stats: { lakeCells, sandCells, lowCells } };
}

// 사주의 높이: 호수와 바다 사이 땅의 가장 높은 곳. 단면 위에서 잰다.
export function lakeProfile(sim, samples = 260) {
  const out = [], [ax, ay] = PROFILE.a, [bx, by] = PROFILE.b, len = Math.hypot(bx - ax, by - ay);
  for (let n = 0; n < samples; n++) {
    const f = n / (samples - 1), x = ax + (bx - ax) * f, y = ay + (by - ay) * f, k = idx(Math.round(x), Math.round(y));
    const kind = sim.sea[k] ? 'sea' : sim.lake[k] ? 'lake' : sim.sand[k] ? 'sand' : 'land';
    out.push({ m: f * len * CELL, x, y, z: sim.sea[k] || sim.lake[k] ? 0 : sampleH(sim.sh, x, y), water: !!(sim.sea[k] || sim.lake[k]), kind });
  }
  return out;
}
export function profileMarks(points) {
  const first = kind => points.findIndex(p => p.kind === kind), last = kind => { for (let t = points.length - 1; t >= 0; t--) if (points[t].kind === kind) return t; return -1; };
  const l0 = first('lake'), l1 = last('lake'), s0 = first('sea'); // 호수 서쪽 끝은 언덕이라 낮은 땅 이름을 붙이지 않는다.
  let top = l1;
  for (let t = l1; t < s0; t++) if (points[t].z > points[top].z) top = t;
  const marks = [
    { at: Math.round((l0 + l1) / 2), text: '경포호(석호)', color: '#8fe0d2' },
    { at: top, text: '사주', color: '#ffb38a' },
    { at: points.length - 1, text: '동해', color: '#8fd6ff' },
  ];
  // 해변은 바다에 닿는 바깥 발치에 표시한다. 자료의 모래 칸 중 바다 바로 앞이다.
  let sd = -1;
  for (let t = s0 - 1; t > l1; t--) if (points[t].kind === 'sand') { sd = t; break; }
  if (sd > l1) marks.splice(2, 0, { at: sd, text: '경포해변(사빈)', color: '#ffe9b0' });
  return marks;
}
// 사주의 가장 높은 곳의 높이(m)와 호수와 바다 사이 폭(m)
export function barStats(points) {
  let l1 = -1, s0 = -1;
  points.forEach((p, t) => { if (p.kind === 'lake') l1 = t; if (s0 < 0 && p.kind === 'sea') s0 = t; });
  let top = 0;
  for (let t = l1; t < s0; t++) top = Math.max(top, points[t].z);
  return { top, width: points[s0].m - points[l1].m };
}

// 이름표 자리. 호수와 사주, 해변은 자료에서 그 지형이 실제로 있는 칸을 찾아 고른다.
export function placesOf(sim) {
  const centroid = test => { let x = 0, y = 0, c = 0; for (let k = 0; k < N * N; k++) if (test(k)) { x += k % N; y += (k / N) | 0; c++; } return c ? [Math.round(x / c), Math.round(y / c)] : null; };
  const nearest = (test, [cx, cy]) => { let best = null, bd = 1e9; for (let k = 0; k < N * N; k++) if (test(k)) { const d = Math.hypot((k % N) - cx, ((k / N) | 0) - cy); if (d < bd) { bd = d; best = [k % N, (k / N) | 0]; } } return best; };
  const line = lakeProfile(sim), marks = profileMarks(line), barAt = line[marks.find(m => m.text === '사주').at];
  const lake = nearest(k => sim.lake[k], centroid(k => sim.lake[k]));
  const onLand = k => !sim.sea[k] && !sim.lake[k];
  return {
    lake: { name: '경포호', sub: '사주로 바다와 거의 떨어진 석호', grid: lake },
    bar: { name: '사주', sub: '호수와 바다 사이의 모래 띠', grid: [Math.round(barAt.x), Math.round(barAt.y)] },
    beach: { name: '경포해변', sub: '사빈', grid: nearest(k => sim.sand[k] && onLand(k), [Math.round(barAt.x) + 10, Math.round(barAt.y) - 30]) },
    gangmun: { name: '강문해변', sub: '사빈', grid: nearest(k => sim.sand[k] && onLand(k), [352, 246]) },
    stream: { name: '경포천', sub: '호수 남쪽을 흐르는 하천', grid: nearest(k => sim.river[k], [200, 345]) },
    low: { name: '낮은 평지', sub: '호수와 높이가 거의 같은 땅', grid: nearest(k => sim.lowLand[k] && sim.sh[k] < 3, [168, 322]) },
    chodang: { name: '초당동', grid: CHODANG },
    gangmunDong: { name: '강문동', grid: GANGMUN },
    jeo: { name: '저동', grid: JEO },
    sea: { name: '동해', grid: SEA_SPOT },
  };
}
