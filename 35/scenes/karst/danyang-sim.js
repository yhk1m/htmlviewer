// © 2026 김용현
// 단양 석회 동굴과 도담삼봉 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 남한강 물 넓이와 물길, 동굴 입구, 도담삼봉과 석문, 마을과 산 자리는 OpenStreetMap 자료에서 옮겼다.
// 고도 자료는 오늘날의 땅 높이뿐이라 동굴 속 길과 크기, 물속 깊이를 알 수 없다. 동굴은 입구 자리만 표시한다.
// OSM 물 넓이 윤곽은 남한강의 일부만 덮으므로, 그 밖의 강은 물길 줄 둘레의 낮은 칸을 물로 본다.
import { CAVES, SPOTS, ROCKS, WATER, NAMHAN, QUARRY, PLACES as OSM_PLACES, PEAKS } from './danyang-osm.js';

export const N = 512;
export const SIZE = 8000;
export const SITE = { lat: 36.98, lon: 128.38, km: 8 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
export { CAVES, SPOTS, ROCKS, PEAKS, QUARRY };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;
const inside = (i, j) => i >= 0 && j >= 0 && i < N && j < N;

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
// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다). 창 밖으로 나간 꼭짓점이 있어도 창 안 칸만 칠한다.
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
// r칸 안의 가운데 값. 약 30m 자료의 점 오차에 흔들리지 않게 땅 높이를 잰다.
export function medianHeight(h, x, y, r = 2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (inside(i, j)) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}
// 줄을 한 칸 간격 점으로 다시 찍는다. m은 줄을 따라 잰 거리(m)다.
export function resample(line, step = 1) {
  const out = [];
  let m = 0;
  for (let n = 0; n < line.length - 1; n++) {
    const [x0, y0] = line[n], [x1, y1] = line[n + 1], L = Math.hypot(x1 - x0, y1 - y0), s = Math.max(1, Math.round(L / step));
    for (let q = 0; q < s; q++) out.push({ x: x0 + ((x1 - x0) * q) / s, y: y0 + ((y1 - y0) * q) / s, m: m + (q / s) * L * CELL });
    m += L * CELL;
  }
  out.push({ x: line.at(-1)[0], y: line.at(-1)[1], m });
  return out;
}
export function nearestOn(pts, [x, y]) {
  let best = 0, bd = Infinity;
  for (let n = 0; n < pts.length; n++) { const d = (pts[n].x - x) ** 2 + (pts[n].y - y) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
// 다각형의 넓이 가운데와 넓이(칸 제곱)
export function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let n = 0; n < poly.length - 1; n++) {
    const [x0, y0] = poly[n], [x1, y1] = poly[n + 1], c = x0 * y1 - x1 * y0;
    a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  a /= 2;
  return { x: cx / (6 * a), y: cy / (6 * a), area: Math.abs(a) };
}

// 물길 줄 둘레에서 이 칸 안의 낮은 칸만 물로 본다(약 110m).
const BAND = 7;

export function buildDanyang(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const sh = blur(h, 2, 2);

  // 물 면 높이: 물길 줄 점마다 둘레 6칸 안 높이의 아래쪽 20% 값을 재고, 앞뒤 약 1km를 고르게 한다.
  // 이 구간은 충주호 상류라 물 면이 거의 평평하다(고도 자료에서 약 131m에서 136m).
  const line = resample(NAMHAN).filter(p => p.x > -12 && p.y > -12 && p.x < N + 12 && p.y < N + 12);
  const raw = line.map(p => {
    const v = [];
    for (let b = -6; b <= 6; b++) for (let a = -6; a <= 6; a++) {
      const i = Math.round(p.x) + a, j = Math.round(p.y) + b;
      if (inside(i, j)) v.push(h[idx(i, j)]);
    }
    v.sort((x, y) => x - y);
    return v.length ? v[Math.floor(v.length * 0.2)] : NaN;
  });
  let last = raw.find(v => !Number.isNaN(v));
  for (let n = 0; n < raw.length; n++) { if (Number.isNaN(raw[n])) raw[n] = last; else last = raw[n]; }
  const W = Math.round(1000 / CELL);
  line.forEach((p, n) => {
    let s = 0, c = 0;
    for (let q = Math.max(0, n - W); q <= Math.min(raw.length - 1, n + W); q++) { s += raw[q]; c++; }
    p.level = clamp(s / c, 128, 138);
  });

  // 물 칸: OSM 물 넓이 윤곽, 그리고 물길 줄에서 BAND칸 안이면서 물 면보다 3m 넘게 높지 않은 칸. 줄에서 2.5칸(약 40m) 안은 늘 물이다.
  // 물길에서 멀고 높은 곳의 작은 못은 따로 그 못 안 높이로 물 면을 정한다.
  const river = new Uint8Array(N * N), surface = new Float32Array(N * N).fill(NaN);
  const ponds = [];
  for (const poly of WATER) {
    const one = fillPolygon(poly, new Uint8Array(N * N)), v = [];
    let near = Infinity, sum = 0, cnt = 0;
    for (let k = 0; k < N * N; k++) if (one[k]) {
      v.push(h[k]);
      const n = nearestOn(line, [k % N, (k / N) | 0]);
      near = Math.min(near, Math.hypot(line[n].x - k % N, line[n].y - ((k / N) | 0)));
      sum += line[n].level; cnt++;
    }
    if (!v.length) continue;
    v.sort((a, b) => a - b);
    const own = v[Math.floor(v.length * 0.2)];
    const pond = near > 12 && own > sum / cnt + 4;
    if (pond) ponds.push({ level: own, cells: v.length });
    for (let k = 0; k < N * N; k++) if (one[k]) { river[k] = 1; if (pond) surface[k] = own; }
  }
  for (const p of line) {
    for (let b = -BAND; b <= BAND; b++) for (let a = -BAND; a <= BAND; a++) {
      const i = Math.round(p.x) + a, j = Math.round(p.y) + b;
      if (!inside(i, j)) continue;
      const d = Math.hypot(i - p.x, j - p.y), k = idx(i, j);
      if (d <= 2.5 || (d <= BAND && h[k] <= p.level + 3)) river[k] = 1;
    }
  }
  // 도담삼봉은 강 가운데 서 있으므로 바위 둘레 5칸(약 80m) 안은 물로 본다(약 30m 자료에서는 바위 둘레 강물이 높게 뭉개진다).
  for (const r of dodamRocks()) for (let b = -5; b <= 5; b++) for (let a = -5; a <= 5; a++) {
    const i = Math.round(r.grid[0]) + a, j = Math.round(r.grid[1]) + b;
    if (inside(i, j) && Math.hypot(a, b) <= 5) river[idx(i, j)] = 1;
  }
  // 물 칸마다 가장 가까운 물길 줄 점의 물 면 높이(못은 제 높이).
  for (let k = 0; k < N * N; k++) if (river[k] && Number.isNaN(surface[k])) surface[k] = line[nearestOn(line, [k % N, (k / N) | 0])].level;

  // 다른 칸은 가장 가까운 물 칸의 물 면 높이와 거리(칸)를 넓혀 가며 찾는다(네 이웃 넓이 우선 찾기).
  const dist = new Int32Array(N * N).fill(-1), riverLv = new Float32Array(N * N), queue = new Int32Array(N * N);
  let head = 0, tail = 0;
  for (let k = 0; k < N * N; k++) if (river[k]) { dist[k] = 0; riverLv[k] = surface[k]; queue[tail++] = k; }
  while (head < tail) {
    const k = queue[head++], i = k % N, j = (k / N) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + a, y = j + b;
      if (!inside(x, y)) continue;
      const q = idx(x, y);
      if (dist[q] >= 0) continue;
      dist[q] = dist[k] + 1; riverLv[q] = riverLv[k]; queue[tail++] = q;
    }
  }

  // 화면에 그리는 땅 높이: 물 칸은 물 면 아래 1.5m로 고르게 낮추고(실제 깊이가 아님), 물 면보다 낮게 나온 강가 땅은 물 면 위 0.5m까지 올린다.
  const show = Float32Array.from(h);
  for (let k = 0; k < N * N; k++) {
    if (river[k]) show[k] = Math.min(h[k], surface[k] - 1.5);
    else if (dist[k] < 30) show[k] = Math.max(show[k], riverLv[k] + 0.5);
  }

  // 석회석 광산(OSM landuse=quarry): 창 북쪽 끝에서 바깥(매포읍)으로 이어진다. 창 안에 든 부분은 나무 없는 맨땅으로 칠한다.
  const quarry = fillPolygon(QUARRY[0], new Uint8Array(N * N));
  for (let k = 0; k < N * N; k++) if (river[k]) quarry[k] = 0;

  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  let waterCells = 0, farmCells = 0, rockCells = 0, quarryCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const wet = river[k] ? 1 : 0, pit = quarry[k] ? 1 : 0;
    const rel = h[k] - riverLv[k];
    // 강가 낮고 평평한 땅과 산 위 완만한 땅은 논밭, 물가 바로 옆 띠는 풀밭, 아주 가파른 비탈은 맨바위, 나머지는 숲으로 칠한 예시다.
    const flat = 1 - smooth(0.07, 0.15, slope), low = 1 - smooth(25, 60, rel);
    const bank = (1 - smooth(2, 4, dist[k])) * (1 - wet);
    const farm = flat * Math.max(low, 0.55 * (1 - smooth(0.04, 0.08, slope))) * (1 - wet) * (1 - bank) * (1 - pit);
    const grass = clamp(bank + (1 - flat) * low * 0.4 * (1 - wet)) * (1 - pit);
    // 광산 칸은 재질 무게를 비워 맨바위 색으로 칠한다.
    const rocky = pit ? 1 : smooth(0.85, 1.25, slope) * (1 - wet);
    const fo = clamp(1 - rocky - farm - grass - wet);
    splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255;
    forest[k] = fo; water[k] = wet;
    mountain[k] = 1 - flat * low;
    if (wet) waterCells++;
    if (farm > 0.5) farmCells++;
    if (rocky > 0.5) rockCells++;
    if (pit) quarryCells++;
  }

  const inWin = line.filter(p => p.x >= 0 && p.y >= 0 && p.x < N && p.y < N);
  const levels = inWin.map(p => p.level);
  return {
    h, sh, show, river, quarry, surface, riverLv, dist, line, mountain, ponds,
    stage: { h: show, splatA, splatB, forest, water, total },
    stats: {
      waterCells, farmCells, rockCells, quarryCells,
      waterHa: Math.round(waterCells * CELL * CELL / 1e4),
      levelMin: +Math.min(...levels).toFixed(1), levelMax: +Math.max(...levels).toFixed(1),
      riverKm: +((inWin.at(-1).m - inWin[0].m) / 1000).toFixed(1),
    },
  };
}

// 도담삼봉 세 바위: OSM 바위 윤곽마다 가운데 자리와 반지름(m). 가장 큰 바위가 가운데 장군봉이다.
// 바위 높이는 고도 자료에 잡히지 않아(바위가 칸 몇 개 크기) 화면에는 크기에 맞춘 예시 높이로 세운다.
export function dodamRocks() {
  const rocks = ROCKS.map(p => { const c = centroid(p); return { grid: [c.x, c.y], radiusM: Math.sqrt(c.area / Math.PI) * CELL }; });
  const big = rocks.reduce((a, r) => (r.radiusM > a.radiusM ? r : a), rocks[0]);
  return rocks.map(r => ({ ...r, main: r === big, heightM: r === big ? 10 : 6 }));
}

// 단면: 양방산 꼭대기(A)에서 고수동굴 입구를 지나는 곧은 줄로 북쪽으로 가, 남한강을 건넌 뒤 건너편 강가 약 150m(B)까지.
// 높이는 물 칸이면 물 면 높이, 아니면 3D 화면에 그린 높이(물가만 다듬은 고도 자료)의 둘레 3칸 곱하기 3칸 가운데 값이다.
export function crossProfile(sim, step = 0.5) {
  const [ax, ay] = PEAKS['양방산'], [cx, cy] = CAVES['고수동굴'];
  const L = Math.hypot(cx - ax, cy - ay), dx = (cx - ax) / L, dy = (cy - ay) / L;
  const out = [];
  let wasWater = false, endAt = Infinity, crossed = false;
  for (let t = 0; t <= 600; t += step) {
    const x = ax + dx * t, y = ay + dy * t, i = Math.round(x), j = Math.round(y);
    if (!inside(i, j) || t > endAt) break;
    const k = idx(i, j), isWater = sim.river[k] === 1;
    // 양방산 쪽 비탈 아래에서 처음 만나는 물(동굴 앞을 지나 북쪽 남한강)을 건너면 끝을 정한다.
    if (isWater) crossed = true;
    if (!isWater && wasWater && crossed && endAt === Infinity) endAt = t + 150 / CELL;
    wasWater = isWater;
    out.push({ m: t * CELL, t, x, y, z: isWater ? sim.surface[k] : medianHeight(sim.show, x, y, 1), kind: isWater ? 'water' : 'land' });
  }
  return out;
}
// 단면의 수치: 양방산 높이, 고수동굴 입구 높이, 그 사이 가장 높은 곳, 남한강 물 면과 폭, 길이
export function profileNumbers(points) {
  const [ax, ay] = PEAKS['양방산'], [cx, cy] = CAVES['고수동굴'];
  const caveT = Math.hypot(cx - ax, cy - ay);
  const caveAt = points.reduce((b, p, n) => (Math.abs(p.t - caveT) < Math.abs(points[b].t - caveT) ? n : b), 0);
  const runs = [];
  for (let n = 0; n < points.length; n++) {
    if (points[n].kind !== 'water') continue;
    if (!runs.length || runs.at(-1).end !== n - 1) runs.push({ start: n, end: n }); else runs.at(-1).end = n;
  }
  const w = runs[0];
  const between = points.slice(caveAt, w ? w.start : points.length);
  const ridge = between.reduce((a, p) => (p.z > a.z ? p : a), between[0]);
  return {
    peak: points[0].z, cave: points[caveAt].z, caveAt, ridge: ridge.z, ridgeAt: points.indexOf(ridge),
    water: w ? points[w.start].z : NaN, waterWidth: w ? Math.round(points[w.end].m - points[w.start].m) : 0,
    caveAbove: w ? points[caveAt].z - points[w.start].z : NaN,
    runs, lengthKm: points.at(-1).m / 1000, end: points.at(-1).z,
  };
}
export function profileMarks(points) {
  const n = profileNumbers(points), w = n.runs[0];
  const marks = [
    { at: 0, text: `양방산 약 ${Math.round(n.peak / 10) * 10}m`, color: '#f3e3b0' },
    { at: n.caveAt, text: `고수동굴 입구 약 ${Math.round(n.cave / 10) * 10}m`, color: '#ffb36b' },
  ];
  if (w) marks.push({ at: Math.round((w.start + w.end) / 2), text: '남한강', color: '#9fd3ff' });
  marks.push({ at: points.length - 1, text: '건너편 강가', color: '#e8e6dd' });
  return marks.sort((a, b) => a.at - b.at);
}

// 석회석 광산(OSM). 윤곽의 가운데는 창 밖 북쪽이고, 창 북쪽 끝에 일부가 걸친다. inside는 창 안에 든 칸들의 가운데 자리다.
export function quarryCenter(sim) {
  const q = QUARRY[0], c = centroid(q[0][0] === q.at(-1)[0] && q[0][1] === q.at(-1)[1] ? q : [...q, q[0]]);
  let sx = 0, sy = 0, n = 0;
  if (sim) for (let k = 0; k < N * N; k++) if (sim.quarry[k]) { sx += k % N; sy += (k / N) | 0; n++; }
  return { grid: [c.x, c.y], northKm: (-c.y * CELL) / 1000, inside: n ? [sx / n, sy / n] : null, insideHa: Math.round(n * CELL * CELL / 1e4) };
}

// 이름표 자리
export function placesOf(sim) {
  const riverAt = sim.line[nearestOn(sim.line, [120, 153])];
  const rocks = dodamRocks(), main = rocks.find(r => r.main);
  return {
    gosu: { name: '고수동굴', sub: '입구 자리', grid: CAVES['고수동굴'].slice(0, 2), cave: true },
    cheondong: { name: '천동동굴', sub: '입구 자리', grid: CAVES['천동동굴'].slice(0, 2), cave: true },
    nodong: { name: '노동동굴', sub: '입구 자리', grid: CAVES['노동동굴'].slice(0, 2), cave: true },
    dodam: { name: '도담삼봉', sub: '강 가운데 석회암 봉우리', grid: main.grid },
    seokmun: { name: '석문', sub: '동굴 천장이 남은 것으로 보는 돌문', grid: SPOTS['석문'] },
    quarry: { name: '석회석 광산', sub: '창 북쪽 끝에서 바깥으로 이어짐', grid: quarryCenter(sim).inside, village: true },
    river: { name: '남한강', sub: '', grid: [riverAt.x, riverAt.y], water: true },
    town: { name: '단양읍', sub: '', grid: OSM_PLACES['단양읍'], village: true },
    station: { name: '단양역', sub: '', grid: OSM_PLACES['단양역'], village: true },
    yangbang: { name: '양방산', sub: '', grid: PEAKS['양방산'].slice(0, 2), peak: true },
    bongudeung: { name: '봉우등', sub: '', grid: PEAKS['봉우등'].slice(0, 2), peak: true },
    silgeum: { name: '실금산', sub: '', grid: PEAKS['실금산'].slice(0, 2), peak: true },
    muje: { name: '무제봉', sub: '', grid: PEAKS['무제봉'].slice(0, 2), peak: true },
    daeseong: { name: '대성산', sub: '', grid: PEAKS['대성산'].slice(0, 2), peak: true },
  };
}
