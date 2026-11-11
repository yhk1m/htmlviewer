// © 2026 김용현
// 성산 일출봉과 우도 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 봉우리와 마을 이름, 저수지 윤곽은 OpenStreetMap에서 옮겼다.
// 분화구의 테두리와 바닥은 고도 자료의 단면에서 잰 값이다.
import { N, readDem, seaMask, blur, slopeOf, paintSurface, fillPolygon, pathProfile, medianHeight, highestNear, smooth } from './site-sim.js';
import { PEAKS, PLACES, SPOTS, WATER } from './seongsan-osm.js';

export const SIZE = 10000;
export const SITE = { lat: 33.485, lon: 126.935, km: 10 };
export const CELL = SIZE / (N - 1);
export { N, PEAKS, PLACES, SPOTS, WATER, medianHeight };

// 일출봉 분화구를 동서로 가로지르는 단면 선의 가운데 세로 칸과 양 끝(가로 칸). 분화구 가운데는 고도 자료에서 둘레가 높고 가운데가 낮은 자리다.
export const ILCHUL_LINE = { j: 400, from: 240, to: 340 };

export function buildSeongsan(dem) {
  const h = readDem(dem);
  const { sea, lowLand } = seaMask(h);
  const sh = blur(h, 1, 2), slope = slopeOf(sh, CELL);
  const pond = new Uint8Array(N * N);
  for (const p of Object.values(WATER)) fillPolygon(p, pond);
  // 바닷가 낮은 땅(높이 4m 아래, 바다에서 3칸 안)은 모래 빛으로 칠한다(예시).
  const nearSea = blur(Float32Array.from(sea), 3, 1);
  const stage = paintSurface({ h, sh, sea, slope }, {
    farmTop: 90, rockSlope: [0.6, 0.95],
    extra: (k, { farm }) => {
      const beach = nearSea[k] > 0.05 ? (1 - smooth(2, 4, h[k])) * (1 - smooth(0.1, 0.2, slope[k])) : 0;
      return beach > 0 ? { farm: farm * (1 - beach), grass: beach * 0.2 } : null;
    },
  });
  for (let k = 0; k < N * N; k++) {
    if (pond[k]) { stage.splatB[k * 4 + 1] = 230; stage.water[k] = 1; stage.forest[k] = 0; }
    if (!sea[k] && nearSea[k] > 0.05) stage.splatB[k * 4 + 2] = (1 - smooth(2, 4, h[k])) * (1 - smooth(0.1, 0.2, slope[k])) * 255;
  }
  let seaCells = 0;
  for (const v of sea) seaCells += v;
  return {
    h, sh, sea, slope, pond, mountain: stage.mountain, stage,
    stats: {
      seaCells, lowLand,
      ilchulTop: Math.round(highestNear(h, PEAKS.성산일출봉[0], PEAKS.성산일출봉[1], 20)[2]),
      udoTop: Math.round(highestNear(h, PEAKS.쇠머리오름[0], PEAKS.쇠머리오름[1], 20)[2]),
    },
  };
}

// 일출봉 동서 단면
export function ilchulProfile(sim) {
  const { j, from, to } = ILCHUL_LINE;
  return pathProfile(sim.h, sim.sea, [[from, j], [to, j]], CELL, 0.5);
}

// 분화구 숫자: 분화구 가운데(가로 칸 cx) 둘레 6칸 안의 가장 낮은 곳이 바닥이고, 그 양쪽 20칸 안의 가장 높은 곳이 테두리다.
export const CRATER_X = 292;
export function craterNumbers(points, cx = CRATER_X) {
  const pick = (lo, hi, better) => { let best = -1; points.forEach((p, n) => { if (p.x >= lo && p.x <= hi && !p.water && (best < 0 || better(p.z, points[best].z))) best = n; }); return best; };
  const low = pick(cx - 6, cx + 6, (a, b) => a < b);
  const left = pick(cx - 20, points[low].x, (a, b) => a > b), right = pick(points[low].x, cx + 20, (a, b) => a > b);
  const floor = points[low].z, rimL = points[left].z, rimR = points[right].z;
  return { low, left, right, floor, rimL, rimR, widthM: points[right].m - points[left].m, depth: Math.min(rimL, rimR) - floor, lengthKm: points.at(-1).m / 1000 };
}
export function profileMarks(points, name) {
  const c = craterNumbers(points);
  return [
    { at: c.left, text: `테두리 약 ${Math.round(c.rimL)}m` },
    { at: c.low, text: `${name} 분화구 바닥 약 ${Math.round(c.floor)}m` },
    { at: c.right, text: `테두리 약 ${Math.round(c.rimR)}m` },
  ];
}

export function placesOf() {
  const P = (name, sub, key, kind = 'peak') => ({ name, sub, grid: (PEAKS[key] ?? PLACES[key] ?? SPOTS[key]).slice(0, 2), kind });
  const ilchulCrater = [292, 406];
  return {
    ilchul: P('성산 일출봉', '응회구, 높이 약 182m(OSM)', '성산일출봉'),
    ilchulCrater: { name: '일출봉 분화구', sub: '넓고 오목한 화구', grid: ilchulCrater, kind: 'mark' },
    soemeori: P('쇠머리오름', '우도의 응회구', '쇠머리오름'),
    udoPond: { name: '우도저수지', sub: '', grid: [388, 195], kind: 'village' },
    udo: { name: '우도', sub: '', grid: PLACES.연평리.slice(0, 2), kind: 'village' },
    siksan: P('식산봉', '', '식산봉'),
    jimi: P('지미봉', '', '지미봉'),
    dusan: P('두산봉', '', '두산봉'),
    seongsan: P('성산리', '', '성산리', 'village'),
    ojo: P('오조리', '', '오조리', 'village'),
    goseong: P('고성리', '', '고성리', 'village'),
    siheung: P('시흥리', '', '시흥리', 'village'),
    jongdal: P('종달리', '', '종달리', 'village'),
    port: P('성산포항', '', '성산포항', 'village'),
    lighthouse: P('우도등대', '', '우도등대', 'village'),
    geommeolle: P('검멀레동굴', '바닷가 절벽의 굴', '검멀레동굴', 'village'),
  };
}

