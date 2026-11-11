// © 2026 김용현
// 제주 한라산과 오름 실제 지형 화면의 재료. 땅 높이만 실제 고도 자료이고, 봉우리와 마을 이름, 물 윤곽은 OpenStreetMap에서 옮겼다.
// 오름 표시(주황 고리)는 OSM에 이름이 적힌 봉우리 점 둘레에 그린 고리일 뿐, 고도 자료에서 오름의 모양을 찾은 것이 아니다.
// 닫힌 웅덩이(분화구)는 가장자리부터 물을 채우는 계산으로 찾는다.
import { N, readDem, seaMask, blur, slopeOf, paintSurface, fillDepressions, findBasins, basinNear, fillPolygon, pathProfile, nearestOnPath, medianHeight, highestNear, idx, inside } from './site-sim.js';
import { PEAKS, PLACES, SPOTS, WATER, ALL_PEAKS } from './hallasan-osm.js';

export const SIZE = 38000;
export const SITE = { lat: 33.39, lon: 126.66, km: 38 };
export const CELL = SIZE / (N - 1);
export const CRATER_RULE = { depth: 10, cells: 2 };
export { N, PEAKS, PLACES, SPOTS, WATER, ALL_PEAKS };

// 오름 고리를 그릴 봉우리: 한라산 꼭대기 둘레의 이름 점(정상, 동능 정상, 바위 봉우리)은 뺀다.
const NOT_OREUM = /^(한라산|한라산동능정상|삼각봉|왕관릉)$/;
export const oreumPeaks = () => ALL_PEAKS.filter(([name]) => !NOT_OREUM.test(name));
export const oreumNamed = () => oreumPeaks().filter(([name]) => name.includes('오름'));

export function buildHallasan(dem) {
  const h = readDem(dem);
  const { sea, lowLand } = seaMask(h);
  const sh = blur(h, 1, 2), slope = slopeOf(sh, CELL);
  const filled = fillDepressions(h);
  const craters = findBasins(h, filled, CRATER_RULE, CELL);
  const named = {
    baengnok: basinNear(craters.list, PEAKS.한라산[0], PEAKS.한라산[1], 6),
    sangumburi: basinNear(craters.list, PEAKS.산굼부리[0], PEAKS.산굼부리[1], 7),
    darangswi: basinNear(craters.list, PEAKS.다랑쉬오름[0], PEAKS.다랑쉬오름[1], 5),
  };
  // 물: OSM 물 윤곽(백록담, 사라오름 화구호). 작아서 한두 칸뿐이다.
  const pond = new Uint8Array(N * N);
  for (const p of Object.values(WATER)) fillPolygon(p, pond);
  // 표면: 낮고 완만한 땅은 밭, 1,400m 위는 풀밭(예시), 가파른 곳은 바위, 나머지는 숲
  const stage = paintSurface({ h, sh, sea, slope }, { farmTop: 380, rockSlope: [0.75, 1.1], grassTop: 1500 });
  for (let k = 0; k < N * N; k++) if (pond[k]) { stage.splatB[k * 4 + 1] = 230; stage.water[k] = 1; }
  // 셋째 판: 초록은 오름 꼭대기 둘레의 고리 줄(반지름 약 200m)
  const splatC = new Uint8Array(N * N * 4);
  for (const [, x, y] of oreumPeaks()) {
    for (let j = Math.floor(y - 4); j <= Math.ceil(y + 4); j++) for (let i = Math.floor(x - 4); i <= Math.ceil(x + 4); i++) {
      if (!inside(i, j) || sea[idx(i, j)]) continue;
      const d = Math.hypot(i - x, j - y), k = idx(i, j);
      if (d >= 2.4 && d < 3.1) splatC[k * 4 + 1] = 255;
    }
  }
  for (let k = 0; k < N * N; k++) splatC[k * 4 + 3] = 255;
  stage.splatC = splatC;
  let seaCells = 0;
  for (const v of sea) seaCells += v;
  return {
    h, sh, sea, slope, filled, craters, named, pond, mountain: stage.mountain, stage,
    stats: {
      seaCells, lowLand, summit: Math.round(highestNear(h, PEAKS.한라산[0], PEAKS.한라산[1], 3)[2]),
      oreumPeaks: oreumPeaks().length, oreumNamed: oreumNamed().length, craters: craters.list.length,
      baengnokDepth: named.baengnok ? +named.baengnok.depth.toFixed(1) : null,
      sangumburiDepth: named.sangumburi ? +named.sangumburi.depth.toFixed(1) : null,
      darangswiDepth: named.darangswi ? +named.darangswi.depth.toFixed(1) : null,
    },
  };
}

// 단면: 한라산 꼭대기(A)에서 동북동쪽 다랑쉬오름을 지나 그 너머(B)까지 곧게 자른 높이.
export function shieldProfile(sim) {
  const a = PEAKS.한라산.slice(0, 2), d = PEAKS.다랑쉬오름.slice(0, 2);
  const L = Math.hypot(d[0] - a[0], d[1] - a[1]), ux = (d[0] - a[0]) / L, uy = (d[1] - a[1]) / L, ext = 30;
  return pathProfile(sim.h, sim.sea, [a, [d[0] + ux * ext, d[1] + uy * ext]], CELL, 0.5);
}

// 기울기를 도(°)로: 높이 차 / 거리의 아크탄젠트
const deg = r => (Math.atan(r) * 180) / Math.PI;

// 단면 숫자: 순상화산 몸체의 평균 기울기(정상에서 다랑쉬오름 기슭까지), 오름 기슭의 가장 급한 기울기(약 300m 구간)
export function profileNumbers(points) {
  const top = points.reduce((a, p, n) => (p.z > points[a].z ? n : a), 0);
  const dar = nearestOnPath(points, PEAKS.다랑쉬오름);
  // 다랑쉬오름 기슭: 꼭대기에서 A쪽으로 가며 가장 낮은 곳(오름과 몸체가 만나는 곳)
  let foot = dar;
  for (let n = dar; n > dar - 60 && n > 0; n--) if (points[n].z < points[foot].z) foot = n;
  const run = points[foot].m - points[top].m, drop = points[top].z - points[foot].z;
  const span = Math.max(2, Math.round(300 / (points[1].m - points[0].m)));
  let steep = 0;
  for (let n = foot; n + span < Math.min(points.length, dar + 40); n++) steep = Math.max(steep, Math.abs(points[n + span].z - points[n].z) / (points[n + span].m - points[n].m));
  return {
    lengthKm: points.at(-1).m / 1000, top, dar, foot,
    shieldDeg: deg(drop / run), shieldRunKm: run / 1000, shieldDrop: drop, oreumDeg: deg(steep),
    oreumRise: points[dar].z - points[foot].z,
  };
}

// 단면 이름표: 한라산 정상, 단면 선 1칸 안을 지나는 이름 있는 오름, 다랑쉬오름
export function profileMarks(points) {
  const n = profileNumbers(points), marks = [{ at: n.top, text: '한라산 정상' }];
  const near = [];
  for (const [name, x, y] of oreumPeaks()) {
    const at = nearestOnPath(points, [x, y]);
    if (Math.hypot(points[at].x - x, points[at].y - y) < 1.5 && /오름|봉|악/.test(name) && !/다랑쉬|월랑봉/.test(name) && at > n.top + 10) near.push({ at, text: name });
  }
  for (const m of near.slice(0, 3)) marks.push(m);
  marks.push({ at: n.dar, text: '다랑쉬오름' });
  return marks.sort((a, b) => a.at - b.at);
}

export { medianHeight };

// 이름표 자리
export function placesOf(sim) {
  const P = (name, sub, key, kind = 'peak') => ({ name, sub, grid: (PEAKS[key] ?? PLACES[key] ?? SPOTS[key]).slice(0, 2), kind });
  const out = {
    halla: P('한라산', `꼭대기 높이 약 1,947m(OSM)`, '한라산'),
    dome: { name: '정상부 용암원정구', sub: '끈끈한 용암이 솟아 굳은 종 모양', grid: [PEAKS.한라산[0] + 4, PEAKS.한라산[1] + 5], kind: 'guess' },
    baengnok: P('백록담', '화구호(칼데라가 아님)', '한라산', 'mark'),
    sara: P('사라오름', '꼭대기에 화구호', '사라오름'),
    eoseung: P('어승생악', '', '어승생악'),
    mulchat: P('물찻오름', '', '물찻오름'),
    mulyeong: P('물영아리', '꼭대기에 화구호', '물영아리'),
    sangum: P('산굼부리', '함몰 화구(책의 해석)', '산굼부리'),
    darang: P('다랑쉬오름', '분석구, 깔때기 모양 화구', '다랑쉬오름'),
    akkeun: P('아끈다랑쉬', '분석구, 낮고 평평한 화구', '아끈다랑쉬'),
    yongnun: P('용눈이오름', '', '용눈이오름'),
    baekyak: P('백약이오름', '', '백약이오름'),
    nopeun: P('높은오름', '', '높은오름'),
    ttarabi: P('따라비오름', '', '따라비오름'),
    jeju: P('제주시', '', '제주시', 'village'),
    seogwipo: P('서귀포시', '', '서귀포시', 'village'),
    jocheon: P('조천읍', '', '조천읍', 'village'),
    gujwa: P('구좌읍', '', '구좌읍', 'village'),
    pyoseon: P('표선면', '', '표선면', 'village'),
    namwon: P('남원읍', '', '남원읍', 'village'),
    seongeup: P('성읍민속마을', '', '성읍민속마을', 'village'),
    manjang: P('만장굴', '용암 동굴 입구', '만장굴', 'village'),
  };
  // 백록담 이름표는 OSM 물 윤곽 가운데에 붙인다.
  const w = WATER.백록담, c = w.reduce((s, p) => [s[0] + p[0] / w.length, s[1] + p[1] / w.length], [0, 0]);
  out.baengnok.grid = [+c[0].toFixed(1), +c[1].toFixed(1)];
  return out;
}
