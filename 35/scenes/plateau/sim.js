// © 2026 김용현
// 대관령 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 밭과 풀밭, 하천, 풍력 발전기, 지명의 자리는 OpenStreetMap 자료에서 옮겼다.
// 숲과 바위는 땅의 기울기에서 규칙으로 만든 예시다.
import { WIND, FIELDS, RIVERS, PLACES as OSM_PLACES, PEAKS, PASS, RANCH } from './daegwallyeong-osm.js';

export const N = 512;
export const SIZE = 14000;
export const SITE = { lat: 37.685, lon: 128.74, km: 14 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 단면: 서쪽 끝(횡계 고원 서쪽)에서 대관령 고갯마루 바로 남쪽을 지나 동쪽 급경사 아래 골짜기까지 동서로 곧게 자른다.
// 고도 자료에서 고원이 가장 길게 평평하고 동쪽 급경사가 가장 뚜렷한 줄을 골랐다.
export const PROFILE = { a: [8, 250], b: [476, 250] };
// 고위 평탄면으로 칠하고 넓이를 셀 높이 범위(m)와 기울기 한계. 동쪽 급경사가 시작되기 전(가로 410칸 서쪽)만 센다.
export const PLATEAU_LO = 700, PLATEAU_HI = 950, PLATEAU_SLOPE = 0.12, PLATEAU_EAST = 410;
export const TURBINES = WIND;
export { PASS };

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
// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다). 닫히지 않은 다각형은 처음 점으로 닫는다.
export function fillPolygon(poly, mark, value = 1) {
  const p = poly[0][0] === poly.at(-1)[0] && poly[0][1] === poly.at(-1)[1] ? poly : [...poly, poly[0]];
  for (let j = 0; j < N; j++) {
    const xs = [], y = j + 0.5;
    for (let n = 0; n < p.length - 1; n++) {
      const [x0, y0] = p[n], [x1, y1] = p[n + 1];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let i = Math.max(0, Math.ceil(xs[q] - 0.5)); i <= Math.min(N - 1, Math.floor(xs[q + 1] - 0.5)); i++) mark[idx(i, j)] = value;
  }
  return mark;
}
// 선을 따라 반지름 r칸 안을 표시한다. 창 밖으로 나간 부분은 건너뛴다.
function stampLine(line, mark, r) {
  for (let n = 0; n < line.length - 1; n++) {
    const [x0, y0] = line[n], [x1, y1] = line[n + 1];
    if (Math.max(x0, x1) < -r || Math.min(x0, x1) > N - 1 + r || Math.max(y0, y1) < -r || Math.min(y0, y1) > N - 1 + r) continue;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let q = 0; q <= steps; q++) {
      const x = x0 + ((x1 - x0) * q) / steps, y = y0 + ((y1 - y0) * q) / steps;
      for (let b = -Math.ceil(r); b <= Math.ceil(r); b++) for (let a = -Math.ceil(r); a <= Math.ceil(r); a++) {
        const i = Math.round(x) + a, j = Math.round(y) + b;
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        if (Math.hypot(i - x, j - y) <= r) mark[idx(i, j)] = 1;
      }
    }
  }
  return mark;
}
// 하천 선 가운데 창 안에 있는 점만 남긴다(선의 방향은 물 흐르는 방향 그대로).
export function insideLine(line) {
  return line.filter(([x, y]) => x >= 0 && y >= 0 && x <= N - 1 && y <= N - 1);
}
const RIVER_WIDTH = { 송천: 1.3, 남대천: 1.6, 도마천: 1.2, 느삼동천: 0.9 };

export function buildDaegwallyeong(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const sh = blur(h, 2, 2);
  // 밭(farmland)은 고랭지 밭, 풀밭(meadow)과 축사 마당(farmyard)은 목초지로 칠한다.
  const field = new Uint8Array(N * N), pasture = new Uint8Array(N * N);
  for (const { k, p } of FIELDS) fillPolygon(p, k === 'farmland' ? field : pasture);
  // 대관령 양떼목장(대관령 고개 바로 북서쪽)의 풀밭
  const ranch = new Uint8Array(N * N);
  for (const p of RANCH) fillPolygon(p, ranch);
  for (let k = 0; k < N * N; k++) if (ranch[k]) pasture[k] = 1;
  for (let k = 0; k < N * N; k++) if (field[k]) pasture[k] = 0;
  const river = new Uint8Array(N * N), riverName = {};
  for (const [name, lines] of Object.entries(RIVERS)) {
    const one = new Uint8Array(N * N);
    for (const line of lines) stampLine(line, one, RIVER_WIDTH[name] ?? 1);
    let cells = 0;
    for (let k = 0; k < N * N; k++) if (one[k]) { river[k] = 1; cells++; }
    riverName[name] = { mark: one, cells };
  }
  for (let k = 0; k < N * N; k++) if (river[k]) { field[k] = 0; pasture[k] = 0; }

  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4), splatC = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  const slope = new Float32Array(N * N), plateau = new Uint8Array(N * N);
  let plateauCells = 0, fieldCells = 0, pastureCells = 0, riverCells = 0, fieldOnPlateau = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const s = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    slope[k] = s;
    if (i < PLATEAU_EAST && sh[k] >= PLATEAU_LO && sh[k] <= PLATEAU_HI && s < PLATEAU_SLOPE) { plateau[k] = 1; plateauCells++; }
    const wet = river[k], fi = field[k], pa = pasture[k];
    if (fi) { fieldCells++; if (plateau[k]) fieldOnPlateau++; }
    if (pa) pastureCells++;
    if (wet) riverCells++;
    const rocky = smooth(0.7, 1.1, s) * (1 - fi) * (1 - pa);
    const fo = clamp(1 - rocky - fi - pa - wet);
    // 첫째 판: 파랑 풀, 초록 흙(밭 바탕), 알파 숲. 둘째 판: 초록 물. 셋째 판: 빨강 고랭지 밭, 초록 목초지.
    splatA[k * 4 + 1] = fi * 255; splatA[k * 4 + 2] = pa * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4 + 1] = wet * 255;
    splatC[k * 4] = fi * 255; splatC[k * 4 + 1] = pa * 255; splatC[k * 4 + 3] = 255;
    forest[k] = fo; water[k] = wet;
    mountain[k] = clamp(1 - fi - pa - wet);
  }
  // 그리는 높이는 고도 자료 그대로다. 하천은 깎지 않고 물 색만 칠한다.
  return {
    h, sh, slope, field, pasture, ranch, river, riverName, plateau, mountain,
    stage: { h, splatA, splatB, splatC, forest, water, total },
    stats: {
      plateauCells, fieldCells, pastureCells, riverCells, fieldOnPlateau,
      plateauKm2: +(plateauCells * CELL * CELL / 1e6).toFixed(1),
      fieldKm2: +(fieldCells * CELL * CELL / 1e6).toFixed(1),
      turbines: WIND.length,
    },
  };
}

// r칸 안의 가운데 값. 약 30m 자료의 점 오차에 흔들리지 않게 땅 높이를 잰다.
export function medianHeight(h, x, y, r = 2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (i >= 0 && j >= 0 && i < N && j < N) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

// 동서 단면. 높이는 그 자리 둘레 5칸 × 5칸의 가운데 값이다.
export function plateauProfile(sim, samples = 300) {
  const out = [], [ax, ay] = PROFILE.a, [bx, by] = PROFILE.b, len = Math.hypot(bx - ax, by - ay);
  for (let n = 0; n < samples; n++) {
    const f = n / (samples - 1), x = ax + (bx - ax) * f, y = ay + (by - ay) * f, k = idx(Math.round(x), Math.round(y));
    out.push({ m: f * len * CELL, x, y, z: medianHeight(sim.h, x, y, 2), water: false, river: sim.river[k] === 1, plateau: sim.plateau[k] === 1 });
  }
  return out;
}
// 단면 위 표시: 고위 평탄면(서쪽 평평한 구간 가운데), 송천(물길을 지나는 곳), 대관령 부근, 동쪽 급경사(가장 가파른 곳), 동쪽 골짜기(끝).
export function profileMarks(points) {
  const nearest = x => points.reduce((b, p, t) => (Math.abs(p.x - x) < Math.abs(points[b].x - x) ? t : b), 0);
  const marks = [{ at: nearest(110), text: '고위 평탄면', color: '#ffe9b0' }];
  const songcheon = points.findIndex(p => p.river);
  if (songcheon >= 0) marks.push({ at: songcheon, text: '송천', color: '#8fd6ff' });
  marks.push({ at: nearest(PASS[0]), text: '대관령 부근', color: '#e8f2c4' });
  // 가장 가파른 곳: 1km(약 37칸) 사이 높이 차이가 가장 큰 곳의 가운데
  const span = Math.max(2, Math.round(1000 / (points[1].m - points[0].m)));
  let best = 0, at = 0;
  for (let t = 0; t + span < points.length; t++) { const d = points[t].z - points[t + span].z; if (d > best) { best = d; at = t + (span >> 1); } }
  marks.push({ at, text: '동쪽 급경사', color: '#ffb38a' });
  marks.push({ at: points.length - 1, text: '동쪽 골짜기', color: '#b9e0f5' });
  return marks;
}
// 단면의 수치: 서쪽 평평한 구간의 높이 범위, 1km 사이 가장 큰 높이 차이
export function profileNumbers(points) {
  const span = Math.max(2, Math.round(1000 / (points[1].m - points[0].m)));
  let drop = 0;
  for (let t = 0; t + span < points.length; t++) drop = Math.max(drop, points[t].z - points[t + span].z);
  const west = points.filter(p => p.x < PLATEAU_EAST - 20).map(p => p.z).sort((a, b) => a - b);
  const q = f => west[Math.min(west.length - 1, Math.floor(west.length * f))];
  return { westLo: q(0.1), westHi: q(0.9), drop1km: drop, end: points.at(-1).z, lengthKm: points.at(-1).m / 1000 };
}

// 이름표 자리. 지형 이름표는 그 지형이 실제로 있는 칸을 찾아 고른다.
export function placesOf(sim) {
  const nearest = (test, [cx, cy]) => { let best = null, bd = 1e9; for (let k = 0; k < N * N; k++) if (test(k)) { const d = Math.hypot((k % N) - cx, ((k / N) | 0) - cy); if (d < bd) { bd = d; best = [k % N, (k / N) | 0]; } } return best; };
  const village = (name, sub) => ({ name, sub, grid: OSM_PLACES[name], village: true });
  const peak = name => ({ name, sub: `${Math.round(PEAKS[name][2]).toLocaleString('en-US')}m`, grid: PEAKS[name].slice(0, 2), peak: true });
  // 고갯마루 높이는 알려진 값(해발 832m)을 쓴다. 고도 자료는 나무와 길 둘레가 섞여 이보다 조금 높게 나온다.
  // 풍력 발전기 이름표는 횡계리 북쪽 능선에 줄지어 선 발전기 가운데 하나에 붙인다.
  const windAt = WIND.reduce((b, p) => (Math.hypot(p[0] - 155, p[1] - 105) < Math.hypot(b[0] - 155, b[1] - 105) ? p : b));
  return {
    high: { name: '고위 평탄면', sub: '높고 넓게 펼쳐진 완만한 땅', grid: nearest(k => sim.plateau[k] && !sim.field[k] && !sim.river[k], [100, 225]) },
    pass: { name: '대관령', sub: '옛 고갯마루, 해발 약 830m', grid: PASS },
    scarp: { name: '동쪽 급경사', sub: '동해 쪽으로 급하게 낮아짐', grid: nearest(k => sim.slope[k] > 0.35, [430, 205]) },
    songcheon: { name: '송천', sub: '남쪽으로 흘러 남한강으로 이어짐', grid: nearest(k => sim.riverName.송천.mark[k], [150, 400]) },
    namdae: { name: '남대천', sub: '동쪽으로 흘러 강릉 시내를 지나 동해로', grid: nearest(k => sim.riverName.남대천.mark[k], [508, 188]) },
    field: { name: '고랭지 밭', sub: '여름에도 서늘해 배추를 기름', grid: nearest(k => sim.field[k], [70, 140]) },
    // 양떼목장 이름표는 고개 이름표와 겹치지 않게 목장 풀밭의 북쪽 부분에 붙인다.
    ranch: { name: '대관령 양떼목장', sub: '풀밭에서 양을 기름', grid: nearest(k => sim.ranch[k], [297, 228]) },
    wind: { name: '풍력 발전기', sub: '바람이 센 높은 능선', grid: windAt },
    // 지도 자료의 횡계리 점은 마을 구역의 가운데라 실제 시가지보다 약 3km 북쪽이다. 건물이 모인 시가지(대관령면 점)에 붙인다.
    hoenggye: { name: '횡계리', sub: '대관령면 소재지', grid: OSM_PLACES['대관령면'], village: true },
    chahang: village('차항리'),
    suha: village('수하리'),
    yongsan: village('용산리'),
    eoheul: village('어흘리'),
    wangsan: village('왕산리'),
    neunggyeong: peak('능경봉'),
    gorupogi: peak('고루포기산'),
    gonsin: peak('곤신봉'),
    jewang: peak('제왕산'),
  };
}
