// © 2026 김용현
// 울릉도 나리 분지 실제 지형 화면. 땅 높이만 실제 자료이고, 봉우리와 마을 이름은 지도 자료에서 옮겼다.
// 분지 바닥(화구원) 칠은 고도 자료에서 계산한 어림이다.
import { figPalette, isDark } from '../../shared/theme.js';
import { bootSitePage } from './site-page.js';
import { buildUlleung, calderaProfile, profileNumbers, profileMarks, placesOf, SIZE, CELL, N } from './ulleung-sim.js';

// 오른쪽 창: 칼데라가 생기는 차례 세 장면과 이 화면에서 잰 숫자
function drawSchematic(el, sim) {
  const P = figPalette(), sea = isDark() ? '#3d7fb8' : '#4f93cc', rock = '#6d6258', fill = '#b59b6e', magma = '#d2541e', cone = '#7a3424';
  const panel = (ox, body, title) => `<g transform="translate(${ox} 0)"><rect x="4" y="30" width="188" height="150" fill="${P.bg}" stroke="${P.frame}"/><rect x="4" y="150" width="188" height="30" fill="${sea}" opacity=".85"/>${body}<text x="98" y="22" text-anchor="middle" font-size="14" font-weight="700" fill="${P.ink}">${title}</text></g>`;
  const p1 = `<path d="M8 160 L80 70 L116 70 L188 160 Z" fill="${rock}"/><ellipse cx="98" cy="150" rx="34" ry="12" fill="${magma}"/><path d="M95 70 L95 140 L101 140 L101 70 Z" fill="${magma}"/>`;
  const p2 = `<path d="M8 160 L66 92 L74 92 L74 118 L122 118 L122 92 L130 92 L188 160 Z" fill="${rock}"/><ellipse cx="98" cy="156" rx="26" ry="6" fill="${magma}" opacity=".6"/><g stroke="${P.ink}" stroke-width="1.4"><path d="M84 100 L84 114"/><path d="M80 110 L84 116 L88 110" fill="none"/><path d="M112 100 L112 114"/><path d="M108 110 L112 116 L116 110" fill="none"/></g>`;
  const p3 = `<path d="M8 160 L66 92 L74 92 L76 124 L98 124 L98 116 L122 116 L124 92 L130 92 L188 160 Z" fill="${rock}"/><path d="M76 124 L98 124 L98 120 L76 120 Z" fill="${fill}"/><path d="M98 116 L122 116 L122 112 L98 112 Z" fill="${fill}"/><path d="M90 120 L98 104 L106 116 Z" fill="${cone}"/>`;
  const svg1 = `<svg viewBox="0 0 600 236" role="img" aria-label="칼데라가 생기는 차례 예시">${panel(0, p1, '1. 마그마 방 위 화산')}${panel(202, p2, '2. 큰 분출 뒤 꼭대기가 꺼짐')}${panel(404, p3, '3. 화구원과 중앙화구구')}
  <g font-size="13" fill="${P.ink}"><text x="420" y="206">외륜산</text><path d="M440 196 L470 100" stroke="${P.ink}" stroke-width="1"/><text x="478" y="226">화구원</text><path d="M500 214 L490 124" stroke="${P.ink}" stroke-width="1"/><text x="530" y="206">중앙화구구</text><path d="M548 194 L500 112" stroke="${P.ink}" stroke-width="1"/></g>
</svg>`;
  el.innerHTML = `<h2>칼데라 모식도</h2>
<figure>${svg1}</figure>
<p class="schem-cap">예시 그림입니다. 높이를 크게 과장했고, 세 장면 사이의 시간은 압축했습니다. 울릉도에서는 화구원이 높이가 다른 두 계단(알봉 분지와 나리 분지)으로 나뉩니다.</p>
<p class="schem-note">화산 아래 마그마 방에서 한꺼번에 많은 마그마가 뿜어져 나오면, 비어 버린 마그마 방 위의 화산체가 내려앉아 지름이 수 km에 이르는 큰 솥 모양 분지, 칼데라가 생깁니다. 칼데라는 분출할 때 생긴 작은 구멍인 화구보다 훨씬 큽니다. 칼데라 벽에서 무너져 내린 물질이 바닥을 메우면 평평한 화구원이 되고, 그 안에서 다시 분출하면 작은 중앙화구구가 솟습니다. 칼데라를 둘러싸고 안쪽이 급한 산지를 외륜산이라고 합니다. 칼데라에 물이 고이면 백두산 천지 같은 칼데라호가 됩니다.</p>
<p class="schem-note">이 화면의 고도 자료로 재면 계산으로 칠한 바닥의 가운데 높이는 나리 분지 약 ${Math.round(sim.stats.nariMedian / 10) * 10}m, 알봉 분지 약 ${Math.round(sim.stats.albongMedian / 10) * 10}m로 약 ${Math.round((sim.stats.albongMedian - sim.stats.nariMedian) / 10) * 10}m 차이 나는 계단입니다. 칠한 넓이는 나리 분지 약 ${sim.stats.nariKm2.toFixed(1)}제곱킬로미터, 알봉 분지 약 ${sim.stats.albongKm2.toFixed(1)}제곱킬로미터인데, 바닥 경계는 어림이라 넓이는 대략의 값입니다.</p>`;
}

// 지도: 분지 바닥 칠
let floorLayer = null;
const floorOverlay = (ctx, { ox, oy, sc }, sim, { markOn }) => {
  if (!markOn) return;
  if (!floorLayer) {
    floorLayer = document.createElement('canvas');
    floorLayer.width = floorLayer.height = N;
    const c = floorLayer.getContext('2d'), img = c.createImageData(N, N);
    for (let k = 0; k < N * N; k++) {
      const col = sim.edge[k] ? [150, 70, 15, 255] : sim.floor[k] === 1 ? [232, 140, 60, 170] : sim.floor[k] === 2 ? [236, 206, 80, 170] : null;
      if (col) img.data.set(col, k * 4);
    }
    c.putImageData(img, 0, 0);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(floorLayer, ox, oy, N * sc, N * sc);
};

const profile = sim => {
  const points = calderaProfile(sim), n = profileNumbers(points, sim);
  return {
    points, marks: profileMarks(points, sim), from: 'A 북쪽 바다', to: 'B 남쪽 바다',
    note: `북쪽 바다(A)에서 나리 분지, 알봉 분지, 성인봉을 지나 남쪽 바다(B)까지 꺾은 선으로 잰 높이입니다(약 ${n.lengthKm.toFixed(1)}km). 칼데라 바닥은 북쪽의 나리 분지(이 선 위 약 ${Math.round(n.nariZ / 10) * 10}m)와 남쪽의 알봉 분지(약 ${Math.round(n.albongZ / 10) * 10}m)로 나뉘어 계단 모양이고, 그 남쪽으로 성인봉 쪽 외륜산이 높이 솟아 있습니다. 바닥 높이는 고도 자료에서 계산으로 칠한 바닥 칸만 골라 잰 가운데 값입니다.`,
  };
};

bootSitePage({
  files: { dem: new URL('./data/ulleung-dem.bin', import.meta.url), buildings: new URL('./data/ulleung-buildings.json', import.meta.url), roads: new URL('./data/ulleung-roads.json', import.meta.url) },
  build: buildUlleung, size: SIZE, cell: CELL, height: { init: 1 }, light: 14000, fog: 0.00003, maxDistance: 26000, mark: true,
  views: {
    // 남쪽 바다 위 높은 하늘에서 성인봉 너머 북쪽 칼데라를 내려다본다.
    oblique: { from: [300, 560], lift: 6000, to: [255, 190] },
    above: { from: [256, 262], lift: 15000, to: [256, 250] },
    // 성인봉 남쪽 하늘에서 북쪽의 알봉 분지와 나리 분지를 본다.
    nari: { from: [266, 300], lift: 1300, to: [255, 175] },
    // 북쪽 바다 위에서 남쪽의 나리 분지와 외륜산을 본다.
    north: { from: [270, -40], lift: 2400, to: [255, 190] },
  },
  places: placesOf,
  priority: { nari: 5, albongBasin: 5, albong: 4, seongin: 4, rimN: 3, narivil: 1, dodong: 2, jeodong: 2, cheonbu: 2, mireuk: 2, hyeongje: 1, narib: 2, songgot: 2 },
  hide: {
    oblique: ['narivil', 'hyeongje', 'taeha', 'hyeonpo', 'namyang'],
    above: ['narivil', 'hyeongje', 'mireuk', 'narib'],
    nari: ['dodong', 'jeodong', 'taeha', 'hyeonpo', 'namyang', 'cheonbu', 'seongin'],
    north: ['dodong', 'jeodong', 'namyang', 'taeha', 'narivil'],
  },
  profile, profileStats: (p, sim) => { const n = profileNumbers(p.points, sim); return { lengthKm: +n.lengthKm.toFixed(1), nariZ: Math.round(n.nariZ), albongZ: Math.round(n.albongZ), rimZ: Math.round(n.rimZ), marks: p.marks.map(m => m.text) }; },
  map: {
    lo: 0, hi: 1000, interval: 20,
    keys: ['seongin', 'albong', 'mireuk', 'narib', 'songgot', 'narivil', 'cheonbu', 'dodong', 'jeodong', 'taeha', 'hyeonpo', 'namyang'],
    legend: '주황 칠: 나리 분지 바닥, 노란 칠: 알봉 분지 바닥(고도 자료에서 계산한 어림). 붉은 점선: 단면을 잰 길(A에서 B까지). 세모: 산봉우리, 점: 마을과 항구',
    overlay: floorOverlay,
  },
  schematic: drawSchematic,
}, {
  note: '울릉도는 동해의 수심 약 2,000m 바닥부터 꼭대기 성인봉(984m)까지 높이가 약 3,000m에 이르는 큰 화산체입니다. 바닷속 부분은 경사가 비교적 완만해 순상화산과 비슷하고, 물 위로 드러난 부분은 조면암, 응회암, 집괴암 등으로 이루어져 경사가 급한 용암원정구 형태입니다. 신생대 제3기 중반 동해 바닥의 화산 활동으로 만들어지기 시작해 약 270만 년 전 물 위로 드러났고, 약 180만 년 전부터 여러 번의 분출로 지금의 화산체가 생겼습니다. 약 1만 년 전 꼭대기 일대가 꺼져 칼데라가 생겼고, 꺼진 바닥이 무너져 내린 물질로 메워져 평평한 화구원이 되었습니다. 칼데라 바닥은 북쪽의 나리 분지(약 350m)와 남쪽의 알봉 분지(약 450m)로 나뉘어 계단 모양이며, 두 분지 사이 북서쪽에는 칼데라 안에서 다시 분출해 생긴 작은 화산체인 알봉(중앙화구구, 약 6,300년 전)이 솟아 있습니다. 성인봉(984m)에서 북쪽으로 이어진 능선은 칼데라를 둘러싼 외륜산입니다. 큰 화산체 안에 또 다른 화산체가 있어 나리 분지 일대는 복합 화산입니다.',
  foot: ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '봉우리, 마을, 항구 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '지형 해석: 『이미지로 이해하는 지형학』 2판 12장.', '분지 바닥 칠은 고도 자료에서 계산한 어림이고, 밭과 숲은 규칙으로 칠한 예시입니다.', '표면 재질: ambientCG (CC0)'],
});
