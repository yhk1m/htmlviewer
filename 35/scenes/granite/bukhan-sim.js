// © 2026 김용현
// 북한산 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료(tools/bake-dem.py로 구운 512칸 정사각형, 데시미터, 세로 0이 북쪽)이고,
// 봉우리, 절, 마을 이름과 맨바위 윤곽은 OpenStreetMap에서 옮겼다(bukhan-osm.js).
// 화면에 칠하는 맨바위(돌산의 드러난 화강암)는 지도 자료가 아니라 땅의 기울기로 어림한 것이다. OSM 맨바위 윤곽은 그 어림을 견주어 보는 데만 쓴다.
import { PEAKS, PLACES, ALL_PEAKS, BARE_ROCK } from './bukhan-osm.js';

export const N = 512;
export const SIZE = 7000;
export const SITE = { lat: 37.655, lon: 126.979, km: 7 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 맨바위 어림: 둘레 3칸 평균 높이로 잰 기울기(높이 차 / 거리)가 from보다 가파르면 바위가 드러나기 시작하고 to에서 완전히 바위로 본다.
// 0.65는 약 33도, 0.85는 약 40도다. 칸의 반 넘게 바위로 치는 곳(가운데 약 37도)의 넓이를 '맨바위 어림 넓이'로 센다.
export const ROCK_RULE = { from: 0.65, to: 0.85 };
// 마을 바닥: 이 높이(m)보다 낮고 기울기가 이보다 완만한 곳은 숲 대신 맨땅 색으로 칠한다(도시와 마을 자리의 예시).
export const TOWN_RULE = { top: 110, slope: 0.12 };
export { PEAKS, PLACES, ALL_PEAKS, BARE_ROCK };

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

// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다). 좁은 윤곽이 칸 가운데를 하나도 품지 않으면 꼭짓점이 놓인 칸을 칠한다.
export function fillPolygon(poly, mark, value = 1) {
  const p = poly[0][0] === poly.at(-1)[0] && poly[0][1] === poly.at(-1)[1] ? poly : [...poly, poly[0]];
  let any = false;
  for (let j = 0; j < N; j++) {
    const xs = [], y = j + 0.5;
    for (let n = 0; n < p.length - 1; n++) {
      const [x0, y0] = p[n], [x1, y1] = p[n + 1];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let i = Math.max(0, Math.ceil(xs[q] - 0.5)); i <= Math.min(N - 1, Math.floor(xs[q + 1] - 0.5)); i++) { mark[idx(i, j)] = value; any = true; }
  }
  if (!any) for (const [x, y] of p) { const i = Math.floor(x), j = Math.floor(y); if (inside(i, j)) mark[idx(i, j)] = value; }
  return mark;
}

// r칸 안의 가운데 값
export function medianHeight(h, x, y, r = 2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (inside(i, j)) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

// r칸 안에서 가장 높은 칸 [가로, 세로, 높이]
export function highestNear(h, x, y, r) {
  let best = [Math.round(x), Math.round(y), -Infinity];
  for (let j = Math.round(y) - r; j <= Math.round(y) + r; j++) for (let i = Math.round(x) - r; i <= Math.round(x) + r; i++) {
    if (!inside(i, j) || (i - x) * (i - x) + (j - y) * (j - y) > r * r) continue;
    if (h[idx(i, j)] > best[2]) best = [i, j, h[idx(i, j)]];
  }
  return best;
}

// 꺾은 선 way([가로, 세로] 칸들)를 따라 step칸마다 잰 높이와 맨바위 어림 값
export function pathProfile(sim, way, step = 0.5) {
  const out = [];
  let m = 0;
  for (let n = 0; n < way.length - 1; n++) {
    const [x0, y0] = way[n], [x1, y1] = way[n + 1], dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy), s = Math.max(1, Math.round(L / step));
    for (let q = n === 0 ? 0 : 1; q <= s; q++) {
      const x = x0 + (dx * q) / s, y = y0 + (dy * q) / s, k = idx(clamp(Math.round(x), 0, N - 1), clamp(Math.round(y), 0, N - 1));
      out.push({ m: m + (q / s) * L * CELL, x, y, z: sampleH(sim.h, x, y), rock: sim.rock[k] >= 0.5, osm: sim.osmRock[k] === 1 });
    }
    m += L * CELL;
  }
  return out;
}
// 단면 위에서 칸 [x, y]에 가장 가까운 점 번호
export function nearestOnPath(points, [x, y]) {
  let best = 0, bd = Infinity;
  points.forEach((p, n) => { const e = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (e < bd) { bd = e; best = n; } });
  return best;
}

// 맨바위 어림 값(0에서 1): 기울기만 본다.
export const rockFromSlope = s => smooth(ROCK_RULE.from, ROCK_RULE.to, s);

export function buildBukhan(dem) {
  const h = readDem(dem);
  const sh = blur(h, 1, 1), slope = slopeOf(sh, CELL);
  const rock = new Float32Array(N * N), osmRock = new Uint8Array(N * N);
  for (const p of BARE_ROCK) fillPolygon(p, osmRock);
  // OSM 윤곽에서 한 칸 안(어림과 지도 자료가 한 칸쯤 어긋나는 것은 같은 바위로 본다)
  const osmNear = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!osmRock[idx(i, j)]) continue;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (inside(i + a, j + b)) osmNear[idx(i + a, j + b)] = 1;
  }
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4), splatC = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  let rockCells = 0, rockHit = 0, rockNear = 0, osmCells = 0, osmFound = 0, townCells = 0;
  for (let k = 0; k < N * N; k++) {
    const r = rockFromSlope(slope[k]);
    rock[k] = r;
    // 마을 바닥: 낮고 평평한 곳은 맨땅 색(예시)
    const town = (1 - smooth(TOWN_RULE.top * 0.8, TOWN_RULE.top, sh[k])) * (1 - smooth(TOWN_RULE.slope * 0.5, TOWN_RULE.slope, slope[k]));
    const fo = clamp(1 - r - town);
    splatA[k * 4 + 1] = town * 255; splatA[k * 4 + 3] = fo * 255;
    // 셋째 판: 빨강은 맨바위 어림(밝은 화강암 색으로 덧칠), 파랑은 OSM 맨바위 윤곽 안, 초록은 그 테두리(파랑과 초록은 따로 켠다)
    splatC[k * 4] = r * 255; splatC[k * 4 + 2] = osmRock[k] * 255; splatC[k * 4 + 3] = 255;
    forest[k] = fo; mountain[k] = 1;
    if (town > 0.5) townCells++;
    if (osmRock[k]) { osmCells++; if (r >= 0.5) osmFound++; }
    if (r >= 0.5) { rockCells++; if (osmRock[k]) rockHit++; if (osmNear[k]) rockNear++; }
  }
  // OSM 윤곽 테두리: 윤곽 안 칸 가운데 이웃에 바깥 칸이 있는 칸
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const k = idx(i, j);
    if (osmRock[k] && (!osmRock[k - 1] || !osmRock[k + 1] || !osmRock[k - N] || !osmRock[k + N])) splatC[k * 4 + 1] = 255;
  }
  const km2 = c => +((c * CELL * CELL) / 1e6).toFixed(2);
  const top = name => Math.round(highestNear(h, PEAKS[name][0], PEAKS[name][1], 3)[2]);
  return {
    h, sh, slope, rock, osmRock, mountain,
    stage: { h, splatA, splatB, splatC, forest, water, total },
    stats: {
      rockKm2: km2(rockCells), osmKm2: km2(osmCells), townKm2: km2(townCells),
      // 어림한 맨바위 칸 가운데 OSM 윤곽 안에 든 몫, 한 칸 안까지 넓혀 본 몫, OSM 윤곽 가운데 어림이 잡아낸 몫(%)
      rockInOsm: Math.round((rockHit / rockCells) * 100), rockNearOsm: Math.round((rockNear / rockCells) * 100), osmFound: Math.round((osmFound / osmCells) * 100),
      baekundae: top('백운대'), insubong: top('인수봉'), mangyeongdae: top('만경대'), nojeokbong: top('노적봉'),
      low: Math.round(h.reduce((a, v) => Math.min(a, v), Infinity)), osmRings: BARE_ROCK.length,
    },
  };
}

// 단면: 북한산성 탐방지원센터(A, 서쪽 골짜기 어귀)에서 백운대와 인수봉 꼭대기를 지나 하루재를 넘어 우이동(B, 동쪽 시내)까지 꺾은 선으로 잰 높이
export const PROFILE_WAY = () => [PLACES['북한산성 탐방지원센터'], PEAKS.백운대.slice(0, 2), PEAKS.인수봉.slice(0, 2), PLACES.하루재, PLACES.우이동];
export const peakProfile = sim => pathProfile(sim, PROFILE_WAY());

const deg = r => Math.round((Math.atan(r) * 180) / Math.PI);
// 단면 숫자: 백운대와 인수봉 자리의 높이, 인수봉 동쪽(하루재 쪽) 비탈에서 100m 사이 가장 급한 기울기, 어림 맨바위 구간 길이
export function profileNumbers(points) {
  const b = nearestOnPath(points, PEAKS.백운대), i = nearestOnPath(points, PEAKS.인수봉), r = nearestOnPath(points, PLACES.하루재);
  const dm = points[1].m - points[0].m, span = Math.max(2, Math.round(100 / dm));
  let steepEast = 0, steepAll = 0;
  for (let n = 0; n + span < points.length; n++) {
    const s = Math.abs(points[n + span].z - points[n].z) / (points[n + span].m - points[n].m);
    steepAll = Math.max(steepAll, s);
    if (n >= i && n + span <= r) steepEast = Math.max(steepEast, s);
  }
  let rockM = 0;
  for (let n = 1; n < points.length; n++) if (points[n].rock && points[n - 1].rock) rockM += points[n].m - points[n - 1].m;
  return {
    lengthKm: points.at(-1).m / 1000, baekun: b, insu: i, haru: r,
    baekunZ: Math.round(points[b].z), insuZ: Math.round(points[i].z), start: Math.round(points[0].z), end: Math.round(points.at(-1).z),
    steepEastDeg: deg(steepEast), steepDeg: deg(steepAll), rockKm: rockM / 1000,
  };
}
export function profileMarks(points) {
  const n = profileNumbers(points);
  return [
    { at: n.baekun, text: '백운대' },
    { at: n.insu, text: '인수봉' },
    { at: n.haru, text: '하루재' },
  ];
}

// 이름표 자리. kind: peak(산봉우리), village(절, 마을, 탐방지원센터), guess(어림 자리)
export function placesOf() {
  const peak = (name, sub) => ({ name, sub: `${Math.round(PEAKS[name][2]).toLocaleString('en-US')}m${sub ? `, ${sub}` : ''}`, grid: PEAKS[name].slice(0, 2), kind: 'peak' });
  const at = (name, label = name, sub = '') => ({ name: label, sub, grid: PLACES[name], kind: 'village' });
  const [nx, ny] = PEAKS.노적봉;
  return {
    baekun: peak('백운대', '북한산 꼭대기'),
    insu: { ...peak('인수봉'), sub: `${Math.round(PEAKS.인수봉[2])}m, 흔히 화강암 돔의 예로 드는 맨바위 봉우리` },
    mangyeong: peak('만경대'),
    nojeok: peak('노적봉'),
    yeong: peak('영봉'),
    wonhyo: peak('원효봉'),
    uisang: peak('의상봉'),
    munsu: peak('문수봉'),
    bohyeon: peak('보현봉'),
    // 나마는 지름이 이 화면의 칸보다 훨씬 작아 보이지 않는다. 노적봉의 둥근 꼭대기 곁 평평한 바위 윗면에 붙인 예시 자리다.
    nama: { name: '나마', sub: '평평한 바위 윗면의 오목한 웅덩이(자리는 예시)', grid: [nx + 3, ny + 2], kind: 'guess' },
    doseon: at('도선사'),
    ui: at('우이동'),
    suyu: at('수유동'),
    center: at('북한산성 탐방지원센터', '북한산성 탐방지원센터'),
    sumeun: at('숨은벽', '숨은벽', '바위 능선'),
    jingwan: at('진관사'),
  };
}
