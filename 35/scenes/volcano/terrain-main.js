// © 2026 김용현
// 제주 한라산과 오름 실제 지형 화면. 땅 높이만 실제 자료이고, 봉우리와 마을 이름, 백록담 물 윤곽은 지도 자료에서 옮겼다.
// 오름 고리는 이름 있는 봉우리 점 둘레의 표시이고, 정상부 용암원정구 이름표 자리는 어림이다.
import { figPalette, isDark } from '../../shared/theme.js';
import { bootSitePage } from './site-page.js';
import { buildHallasan, shieldProfile, profileNumbers, profileMarks, placesOf, oreumPeaks, SIZE, CELL } from './hallasan-sim.js';

// 오른쪽 창: 제주도형 화산섬의 단면 예시 그림과 이 화면의 고도 자료에서 잰 숫자
function drawSchematic(el, sim) {
  const P = figPalette(), sea = isDark() ? '#3d7fb8' : '#4f93cc', lava = '#5b5048', dome = '#9a7b62', cinder = '#7a3424';
  const n = profileNumbers(shieldProfile(sim));
  const svg1 = `<svg viewBox="0 0 600 270" role="img" aria-label="제주도형 화산섬 단면 예시">
  <rect x="0" y="0" width="600" height="270" fill="${P.bg}" stroke="${P.frame}"/>
  <rect x="0" y="200" width="600" height="70" fill="${sea}" opacity=".85"/>
  <path d="M0 214 C80 206 140 178 200 150 C240 132 262 118 278 104 L322 104 C338 118 360 132 400 150 C460 178 520 206 600 214 L600 270 L0 270 Z" fill="${lava}"/>
  <g stroke="#8d8178" stroke-width="1.2" fill="none">
    <path d="M30 222 C120 210 200 176 300 132 C400 176 480 210 570 222"/><path d="M60 236 C140 224 220 196 300 160 C380 196 460 224 540 236"/><path d="M90 250 C170 240 240 216 300 190 C360 216 430 240 510 250"/>
  </g>
  <path d="M272 106 C276 80 286 64 300 62 C314 64 324 80 328 106 Z" fill="${dome}"/>
  <path d="M291 66 C295 72 305 72 309 66 Z" fill="${sea}"/>
  <path d="M150 178 L168 150 L174 150 L192 178 Z" fill="${cinder}"/><path d="M166 151 L171 158 L176 151 Z" fill="${P.bg}"/>
  <path d="M430 178 L446 154 L452 154 L468 178 Z" fill="${cinder}"/><path d="M444 155 L449 161 L454 155 Z" fill="${P.bg}"/>
  <g font-size="15" fill="${P.ink}">
    <text x="330" y="40" fill="${P.hi}" font-weight="700">백록담(화구호)</text><path d="M328 44 L306 64" stroke="${P.hi}" stroke-width="1.4"/>
    <text x="350" y="92">용암원정구(끈적한 용암)</text><path d="M348 88 L322 92" stroke="${P.ink}" stroke-width="1.2"/>
    <text x="30" y="128">오름(분석구)</text><path d="M80 134 L160 160" stroke="${P.ink}" stroke-width="1.2"/>
    <text x="410" y="138">오름</text><path d="M425 142 L446 158" stroke="${P.ink}" stroke-width="1.2"/>
    <text x="190" y="235" fill="#f3f1ea">묽은 현무암 용암이 여러 번 흘러 쌓인 순상화산</text>
    <text x="14" y="262" fill="#f3f1ea">바다</text>
  </g>
</svg>`;
  // 오름 모양 셋: 깔때기 화구가 있는 것, 한쪽이 터진 말굽형, 화구가 없는 것
  const svg2 = `<svg viewBox="0 0 600 150" role="img" aria-label="오름 모양 예시">
  <rect x="0" y="0" width="600" height="150" fill="${P.bg}" stroke="${P.frame}"/>
  <path d="M30 110 L85 48 L105 60 L125 48 L180 110 Z" fill="${cinder}"/>
  <path d="M230 110 L285 48 L300 70 L305 110 Z" fill="${cinder}"/><path d="M325 110 L340 80 L380 110 Z" fill="${cinder}" opacity=".75"/>
  <path d="M420 110 L500 52 L580 110 Z" fill="${cinder}"/>
  <g font-size="14" fill="${P.ink}" text-anchor="middle">
    <text x="105" y="134">깔때기 모양 화구</text><text x="305" y="134">한쪽이 터진 말굽형</text><text x="500" y="134">화구가 없는 것</text>
  </g>
</svg>`;
  el.innerHTML = `<h2>제주도형 화산섬 모식도</h2>
<figure>${svg1}</figure>
<p class="schem-cap">예시 그림입니다. 높이를 크게 과장했고, 오름과 한라산의 크기 비율도 실제와 다릅니다.</p>
<figure>${svg2}</figure>
<p class="schem-cap">예시 그림입니다. 분석구는 정상에 깔때기 모양 화구가 있는 것이 보통이지만, 용암이 한쪽으로 흘러나와 사면이 무너진 말굽형이나 화구가 없는 것도 있습니다.</p>
<p class="schem-note">묽은 현무암 용암은 멀리 퍼져 흐르므로 여러 번 쌓이면 방패를 엎어 놓은 듯 완만한 순상화산이 됩니다. 반대로 끈끈한 용암은 멀리 가지 못하고 화구 위에 솟아 종 모양의 용암원정구가 됩니다. 오름은 큰 화산의 산허리나 들판에서 따로 터진 작은 화산(측화산, 기생화산)이며, 땅 위에서 터지면 구멍 많은 화산 쇄설물(송이)이 쌓여 사면이 급한 분석구가 됩니다.</p>
<p class="schem-note">이 화면의 단면에서 재면 한라산 꼭대기에서 다랑쉬오름 기슭까지 약 ${n.shieldRunKm.toFixed(0)}km 동안 약 ${Math.round(n.shieldDrop / 10) * 10}m 낮아져 평균 기울기가 약 ${n.shieldDeg.toFixed(1)}도입니다. 다랑쉬오름 기슭은 약 300m 구간에서 가장 급한 곳이 약 ${Math.round(n.oreumDeg)}도로, 몸체보다 훨씬 가파릅니다. 칸이 약 74m라 실제 오름 사면은 이보다 더 급합니다.</p>`;
}

// 지도: 오름 고리를 켜면 이름 있는 봉우리 점마다 작은 주황 동그라미를 그린다.
const peakDots = (ctx, { ox, oy, sc }, sim, { markOn }) => {
  if (!markOn) return;
  ctx.strokeStyle = '#c4560f'; ctx.lineWidth = 1.4;
  for (const [, x, y] of oreumPeaks()) { ctx.beginPath(); ctx.arc(ox + x * sc, oy + y * sc, 3.2, 0, Math.PI * 2); ctx.stroke(); }
};

const profile = sim => {
  const points = shieldProfile(sim), n = profileNumbers(points);
  return {
    points, marks: profileMarks(points), from: 'A 한라산 정상', to: 'B 동북동쪽',
    note: `한라산 꼭대기(A)에서 동북동쪽으로 다랑쉬오름을 지나 그 너머(B)까지 곧게 자른 높이입니다(약 ${n.lengthKm.toFixed(0)}km). 몸체는 꼭대기에서 바다 쪽으로 평균 약 ${n.shieldDeg.toFixed(1)}도로 완만하게 낮아지고, 그 위에 오름이 작은 혹처럼 솟아 있습니다. 다랑쉬오름은 기슭에서 약 ${Math.round(n.oreumRise / 10) * 10}m 솟아 있습니다. 칸이 약 74m라 오름의 가파른 사면과 분화구는 실제보다 무디게 나옵니다.`,
  };
};

bootSitePage({
  files: { dem: new URL('./data/hallasan-dem.bin', import.meta.url), buildings: new URL('./data/hallasan-buildings.json', import.meta.url), roads: new URL('./data/hallasan-roads.json', import.meta.url) },
  build: buildHallasan, size: SIZE, cell: CELL, height: { init: 2 }, light: 40000, fog: 0.000012, maxDistance: 70000, mark: true,
  views: {
    // 다랑쉬오름 너머 동북동쪽 하늘에서 서남서쪽 한라산 쪽을 본다. 앞에 동쪽 오름 무리, 뒤에 한라산이 보인다.
    oblique: { from: [700, 10], lift: 7000, to: [250, 235] },
    above: { from: [256, 262], lift: 52000, to: [256, 250] },
    // 한라산 꼭대기 남동쪽 하늘에서 정상부를 내려다본다.
    summit: { from: [150, 360], lift: 3600, to: [94, 296] },
    // 오름 무리 남쪽 하늘에서 북쪽의 다랑쉬오름 둘레를 본다.
    oreum: { from: [470, 240], lift: 2600, to: [462, 140] },
  },
  places: placesOf,
  priority: { halla: 5, darang: 5, baengnok: 4, sangum: 4, dome: 3, akkeun: 4, mulyeong: 3, sara: 2, yongnun: 2, baekyak: 2, nopeun: 2, jeju: 2, seogwipo: 2, manjang: 2 },
  hide: {
    oblique: ['dome', 'akkeun', 'yongnun', 'nopeun', 'ttarabi', 'mulchat', 'eoseung', 'baekyak', 'jocheon', 'namwon', 'seongeup'],
    above: ['dome', 'akkeun', 'yongnun', 'nopeun', 'mulchat', 'eoseung', 'sara', 'jocheon', 'namwon', 'seongeup'],
    summit: ['jeju', 'seogwipo', 'jocheon', 'gujwa', 'pyoseon', 'namwon', 'seongeup', 'manjang', 'darang', 'akkeun', 'yongnun', 'baekyak', 'nopeun', 'ttarabi', 'sangum', 'mulyeong', 'mulchat'],
    oreum: ['halla', 'dome', 'baengnok', 'sara', 'eoseung', 'jeju', 'seogwipo', 'namwon', 'mulchat'],
  },
  profile, profileStats: (p) => { const n = profileNumbers(p.points); return { lengthKm: +n.lengthKm.toFixed(1), shieldDeg: +n.shieldDeg.toFixed(1), oreumDeg: +n.oreumDeg.toFixed(1), marks: p.marks.map(m => m.text) }; },
  map: {
    lo: 0, hi: 1950, interval: 50,
    keys: ['halla', 'sara', 'darang', 'sangum', 'mulyeong', 'baekyak', 'jeju', 'seogwipo', 'gujwa', 'pyoseon', 'manjang'],
    legend: '주황 동그라미: OpenStreetMap에 이름이 적힌 봉우리 점(대부분 오름). 붉은 점선: 단면을 잰 길(A에서 B까지). 세모: 산봉우리, 점: 마을과 동굴 입구',
    overlay: peakDots,
  },
  schematic: drawSchematic,
}, {
  note: '제주도는 얕은 바다(대륙붕) 위에 솟은 화산섬입니다. 책에서는 한라산 정상부를 뺀 섬 대부분을, 묽은 현무암 용암이 여러 번 넓게 흘러 쌓인 완만한 순상화산으로 봅니다. 정상부는 끈끈한 조면암질 용암이 솟아 굳은 용암원정구(약 16만 년 전)이고, 꼭대기의 백록담은 칼데라가 아니라 분화구에 물이 고인 화구호입니다(분화구는 약 2만 5천 년 전). 산허리와 동쪽 들판에 솟은 작은 언덕들이 오름으로, 큰 화산 기슭에 따로 생긴 측화산(기생화산)입니다. 제주에는 오름이 360개에서 400개쯤 있고 그 상당수가 땅 위에서 터져 화산 쇄설물이 쌓인 분석구입니다. 다랑쉬오름은 깔때기 모양 화구가 있는 높은 분석구이고, 바로 옆 아끈다랑쉬는 화구가 평평하고 낮습니다. 산굼부리는 흔히 마르로 소개되지만 책은 땅속 빈 곳 위가 꺼진 함몰 화구로 봅니다. 동쪽 오름 무리는 이 화면에서 한라산 꼭대기로부터 약 30km 떨어져 있습니다.',
  foot: ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '봉우리, 마을, 백록담 물 윤곽, 만장굴 입구 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '지형 해석: 『이미지로 이해하는 지형학』 2판 12장.', '오름 고리는 이름 점 둘레의 표시이고, 용암원정구 이름표 자리는 어림이며, 밭과 숲은 규칙으로 칠한 예시입니다.', '표면 재질: ambientCG (CC0)'],
});
