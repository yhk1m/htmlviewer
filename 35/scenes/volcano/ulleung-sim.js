// © 2026 김용현
// 울릉도 나리 분지 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 봉우리와 마을 이름은 OpenStreetMap에서 옮겼다.
// 분지 바닥(화구원) 칠은 고도 자료에서 계산한 것이다. 나리 분지 가운데와 알봉 분지 가운데에서 시작해, 높이 480m 아래이고
// 기울기가 0.2(약 11도)보다 완만한 칸을 이어 칠한 뒤, 410m 아래는 나리 분지, 그 위는 알봉 분지로 나눈다. 경계는 어림이다.
import { N, readDem, seaMask, blur, slopeOf, paintSurface, edgeOf, pathProfile, nearestOnPath, medianHeight, highestNear, idx, inside } from './site-sim.js';
import { PEAKS, PLACES, SPOTS } from './ulleung-osm.js';

export const SIZE = 12000;
export const SITE = { lat: 37.5, lon: 130.865, km: 12 };
export const CELL = SIZE / (N - 1);
export const FLOOR_RULE = { top: 480, slope: 0.2, split: 410 };
export const SEEDS = { nari: [275, 151], albong: [229, 201] };
export { N, PEAKS, PLACES, SPOTS, medianHeight };

export function floorMask(h, slope, rule = FLOOR_RULE) {
  const floor = new Uint8Array(N * N), list = [];
  for (const [x, y] of Object.values(SEEDS)) { const k = idx(x, y); if (!floor[k]) { floor[k] = 1; list.push(k); } }
  for (let t = 0; t < list.length; t++) {
    const c = list[t], i = c % N, j = (c / N) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + a, y = j + b;
      if (!inside(x, y)) continue;
      const o = idx(x, y);
      if (!floor[o] && h[o] < rule.top && slope[o] < rule.slope) { floor[o] = 1; list.push(o); }
    }
  }
  // 1: 나리 분지, 2: 알봉 분지
  for (const k of list) floor[k] = h[k] < rule.split ? 1 : 2;
  return floor;
}

export function buildUlleung(dem) {
  const h = readDem(dem);
  const { sea, lowLand } = seaMask(h);
  const sh = blur(h, 1, 2), slope = slopeOf(sh, CELL);
  const floor = floorMask(h, slope);
  const edge = edgeOf(floor);
  // 표면: 분지 바닥과 낮고 완만한 땅은 밭, 가파른 곳은 바위, 나머지는 숲
  const stage = paintSurface({ h, sh, sea, slope }, {
    farmTop: 160, rockSlope: [0.95, 1.35],
    extra: (k, { farm }) => (floor[k] ? { farm: Math.max(farm, 0.75) } : null),
  });
  const splatC = new Uint8Array(N * N * 4);
  const stats = { nari: [], albong: [] };
  for (let k = 0; k < N * N; k++) {
    if (floor[k]) { splatC[k * 4] = 200; splatC[k * 4 + 2] = floor[k] === 2 ? 255 : 0; (floor[k] === 1 ? stats.nari : stats.albong).push(h[k]); }
    if (edge[k]) splatC[k * 4 + 1] = 255;
    splatC[k * 4 + 3] = 255;
  }
  stage.splatC = splatC;
  const med = a => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };
  let seaCells = 0;
  for (const v of sea) seaCells += v;
  return {
    h, sh, sea, slope, floor, edge, mountain: stage.mountain, stage,
    stats: {
      seaCells, lowLand,
      seongin: Math.round(highestNear(h, PEAKS.성인봉[0], PEAKS.성인봉[1], 4)[2]),
      nariCells: stats.nari.length, albongCells: stats.albong.length,
      nariKm2: +(stats.nari.length * CELL * CELL / 1e6).toFixed(2), albongKm2: +(stats.albong.length * CELL * CELL / 1e6).toFixed(2),
      nariMedian: Math.round(med(stats.nari)), albongMedian: Math.round(med(stats.albong)),
    },
  };
}

// 단면: 북쪽 바다(A)에서 외륜산 북쪽 테두리, 나리 분지, 알봉 분지를 지나 성인봉, 남쪽 바다(B)까지 꺾은 선
export const PROFILE_WAY = [[278, 40], SEEDS.nari, SEEDS.albong, PEAKS.성인봉.slice(0, 2), [300, 400]];
export function calderaProfile(sim) {
  return pathProfile(sim.h, sim.sea, PROFILE_WAY, CELL, 0.5);
}
export function profileNumbers(points, sim) {
  const nari = nearestOnPath(points, SEEDS.nari), alb = nearestOnPath(points, SEEDS.albong), top = nearestOnPath(points, PEAKS.성인봉);
  // 분지 북쪽 테두리: A와 나리 분지 사이에서 가장 높은 곳
  let rim = 0;
  for (let n = 0; n < nari; n++) if (points[n].z > points[rim].z) rim = n;
  // 단면이 지나는 바닥 칸의 가운데 높이
  const on = v => points.filter(p => sim.floor[idx(Math.round(p.x), Math.round(p.y))] === v).map(p => p.z).sort((a, b) => a - b);
  const nz = on(1), az = on(2);
  return {
    lengthKm: points.at(-1).m / 1000, rim, nari, alb, top,
    rimZ: points[rim].z, nariZ: nz[nz.length >> 1], albongZ: az[az.length >> 1], topZ: points[top].z,
    nariCross: nz.length, albongCross: az.length,
  };
}
export function profileMarks(points, sim) {
  const n = profileNumbers(points, sim);
  return [
    { at: n.rim, text: '분지 북쪽 테두리' },
    { at: n.nari, text: `나리 분지 약 ${Math.round(n.nariZ / 10) * 10}m` },
    { at: n.alb, text: `알봉 분지 약 ${Math.round(n.albongZ / 10) * 10}m` },
    { at: n.top, text: '성인봉' },
  ];
}

export function placesOf() {
  const P = (name, sub, key, kind = 'peak') => ({ name, sub, grid: (PEAKS[key] ?? PLACES[key] ?? SPOTS[key]).slice(0, 2), kind });
  return {
    seongin: P('성인봉', '외륜산의 가장 높은 곳', '성인봉'),
    nari: { name: '나리 분지', sub: '화구원(칼데라 바닥)', grid: SEEDS.nari, kind: 'mark' },
    albongBasin: { name: '알봉 분지', sub: '화구원, 나리 분지보다 한 계단 높음', grid: SEEDS.albong, kind: 'mark' },
    albong: P('알봉', '중앙화구구', '알봉'),
    rimN: { name: '외륜산 능선', sub: '성인봉에서 북쪽으로 이어짐', grid: PEAKS.말잔등.slice(0, 2), kind: 'peak' },
    mireuk: P('미륵산', '', '미륵산'),
    hyeongje: P('형제봉', '', '형제봉'),
    narib: P('나리봉', '', '나리봉'),
    songgot: P('송곳산', '', '송곳산'),
    narivil: P('나리', '마을', '나리', 'village'),
    cheonbu: P('천부리', '', '천부리', 'village'),
    dodong: P('도동리', '', '도동리', 'village'),
    jeodong: P('저동리', '', '저동리', 'village'),
    taeha: P('태하리', '', '태하리', 'village'),
    hyeonpo: P('현포리', '', '현포리', 'village'),
    namyang: P('남양리', '', '남양리', 'village'),
  };
}
