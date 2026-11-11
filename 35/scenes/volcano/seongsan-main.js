// © 2026 김용현
// 성산 일출봉과 우도 실제 지형 화면. 땅 높이만 실제 자료이고, 봉우리와 마을 이름, 우도저수지 윤곽은 지도 자료에서 옮겼다.
// 분화구 테두리와 바닥 높이는 고도 자료의 단면에서 잰 값이다.
import { figPalette, isDark } from '../../shared/theme.js';
import { bootSitePage } from './site-page.js';
import { buildSeongsan, ilchulProfile, craterNumbers, profileMarks, placesOf, SIZE, CELL } from './seongsan-sim.js';

// 오른쪽 창: 분석구와 응회구를 견준 단면 예시 그림
function drawSchematic(el, sim) {
  const P = figPalette(), sea = isDark() ? '#3d7fb8' : '#4f93cc', cinder = '#7a3424', tuff = '#b08d5a', magma = '#d2541e';
  const c = craterNumbers(ilchulProfile(sim));
  // 응회구 안의 층: 바깥 사면과 나란한 가는 줄
  const layers = [0, 1, 2, 3].map(q => { const d = 10 + q * 12; return `<path d="M${330 + d} 190 C${362 + d * 0.6} 160 ${384 + d * 0.3} ${100 + d} ${398 + d * 0.2} ${76 + d * 0.9}" fill="none" stroke="#7d6640" stroke-width="1"/><path d="M${590 - d} 190 C${558 - d * 0.6} 160 ${536 - d * 0.3} ${100 + d} ${522 - d * 0.2} ${76 + d * 0.9}" fill="none" stroke="#7d6640" stroke-width="1"/>`; }).join('');
  const svg1 = `<svg viewBox="0 0 600 240" role="img" aria-label="분석구와 응회구 단면 예시">
  <rect x="0" y="0" width="600" height="240" fill="${P.bg}" stroke="${P.frame}"/>
  <rect x="300" y="182" width="300" height="58" fill="${sea}" opacity=".85"/>
  <rect x="0" y="190" width="300" height="50" fill="#6f5f45"/>
  <path d="M40 190 L130 60 L150 76 L170 60 L260 190 Z" fill="${cinder}"/>
  <path d="M146 240 L146 190 L154 190 L154 240 Z" fill="${magma}"/>
  <path d="M310 190 C350 150 378 84 398 70 C410 68 422 112 438 120 L482 120 C498 112 510 68 522 70 C542 84 570 150 610 190 Z" fill="${tuff}"/>
  ${layers}
  <path d="M456 240 L456 182 L464 182 L464 240 Z" fill="${magma}"/>
  <g stroke="#e8f2ff" stroke-width="1.6" fill="none"><path d="M440 172 C446 160 452 160 458 150"/><path d="M482 172 C476 160 470 160 464 150"/></g>
  <g font-size="15" fill="${P.ink}">
    <text x="20" y="28" font-weight="700">분석구</text><text x="20" y="46" font-size="13" fill="${P.sub}">땅 위에서 터짐, 높고 화구가 작음</text>
    <text x="330" y="28" font-weight="700">응회구</text><text x="330" y="46" font-size="13" fill="${P.sub}">마그마가 바닷물과 만나 터짐, 화구가 넓음</text>
    <text x="420" y="110" fill="${P.hi}" font-weight="700">넓은 분화구</text>
    <text x="490" y="224" fill="#f3f1ea">얕은 바다</text>
  </g>
</svg>`;
  el.innerHTML = `<h2>응회구 모식도</h2>
<figure>${svg1}</figure>
<p class="schem-cap">예시 그림입니다. 높이를 크게 과장했고, 응회구 안의 가는 줄은 쌓인 화산재 층을 나타낸 것입니다.</p>
<p class="schem-note">마그마가 얕은 바다의 물이나 물을 많이 머금은 땅과 만나면, 물이 갑자기 끓어 수증기 폭발이 일어납니다. 마그마가 잘게 부서진 화산재가 화구 둘레에 층층이 쌓이면, 높이에 비해 화구가 넓은 응회구가 됩니다. 폭발이 더 세면 화산재가 더 멀리 퍼져 응회구보다 낮고 밑이 넓은 응회환이 됩니다. 그래서 응회구와 응회환은 물을 얻기 쉬운 바닷가에 많습니다.</p>
<p class="schem-note">이 화면의 고도 자료로 일출봉을 동서로 자르면 서쪽 테두리 약 ${Math.round(c.rimL)}m, 동쪽 테두리 약 ${Math.round(c.rimR)}m, 그 사이 분화구 바닥이 약 ${Math.round(c.floor)}m이고, 두 테두리 사이가 약 ${Math.round(c.widthM / 10) * 10}m입니다. 원자료 간격(약 30m)이 테두리를 뭉개 실제보다 얕게 나온 값입니다.</p>`;
}

const profile = sim => {
  const points = ilchulProfile(sim), c = craterNumbers(points);
  return {
    points, marks: profileMarks(points, '일출봉'), from: 'A 서쪽', to: 'B 동쪽 바다',
    note: `성산 일출봉 분화구 가운데를 서쪽(A)에서 동쪽 바다(B)까지 곧게 자른 높이입니다(약 ${c.lengthKm.toFixed(1)}km). 바다에서 가파르게 솟은 테두리 안쪽에 넓고 오목한 분화구가 있습니다. 두 테두리 사이는 약 ${Math.round(c.widthM / 10) * 10}m입니다. 원자료 간격이 약 30m라 테두리 높이와 분화구 깊이는 실제보다 작게 나옵니다. 파란 줄은 바다입니다.`,
  };
};

bootSitePage({
  files: { dem: new URL('./data/seongsan-dem.bin', import.meta.url), buildings: new URL('./data/seongsan-buildings.json', import.meta.url), roads: new URL('./data/seongsan-roads.json', import.meta.url) },
  build: buildSeongsan, size: SIZE, cell: CELL, height: { init: 2 }, light: 12000, fog: 0.00003, maxDistance: 20000, mark: false, sand: true,
  views: {
    // 남서쪽 하늘에서 북동쪽을 본다. 앞에 일출봉, 뒤에 우도가 보인다.
    oblique: { from: [130, 640], lift: 5200, to: [330, 300] },
    above: { from: [256, 262], lift: 13000, to: [256, 250] },
    // 일출봉 남쪽 바다 위에서 분화구 쪽을 본다.
    ilchul: { from: [310, 520], lift: 1100, to: [290, 405] },
    // 우도 남동쪽 바다 위에서 쇠머리오름을 본다.
    udo: { from: [470, 300], lift: 900, to: [388, 205] },
  },
  places: placesOf,
  priority: { ilchul: 5, soemeori: 5, ilchulCrater: 4, udo: 3, port: 2, siksan: 2, jimi: 2, seongsan: 2, ojo: 1 },
  hide: {
    oblique: ['lighthouse', 'geommeolle', 'udoPond', 'goseong', 'siheung'],
    above: ['lighthouse', 'geommeolle', 'udoPond', 'ilchulCrater'],
    ilchul: ['jongdal', 'siheung', 'jimi', 'dusan', 'udoPond', 'lighthouse', 'geommeolle', 'udo'],
    udo: ['jongdal', 'siheung', 'jimi', 'dusan', 'goseong', 'ojo', 'siksan', 'seongsan', 'port'],
  },
  profile, profileStats: p => { const c = craterNumbers(p.points); return { lengthKm: +c.lengthKm.toFixed(2), floor: Math.round(c.floor), rimL: Math.round(c.rimL), rimR: Math.round(c.rimR), widthM: Math.round(c.widthM), marks: p.marks.map(m => m.text) }; },
  map: {
    lo: 0, hi: 160, interval: 10,
    keys: ['ilchul', 'soemeori', 'siksan', 'jimi', 'dusan', 'seongsan', 'ojo', 'goseong', 'jongdal', 'udo', 'port'],
    legend: '붉은 점선: 단면을 잰 길(A에서 B까지). 세모: 산봉우리, 점: 마을과 항구',
  },
  schematic: drawSchematic,
}, {
  note: '제주도 동쪽 끝의 성산 일출봉과 그 북동쪽 섬 우도입니다. 책에서는 일출봉과 우도의 쇠머리오름을 응회구로 봅니다. 응회구는 얕은 바다나 바닷가에서 마그마가 물과 만나 수증기 폭발이 일어나고, 잘게 부서진 화산재가 화구 둘레에 쌓여 생긴 작은 화산입니다. 땅 위에서 터져 높고 화구가 작은 분석구와 달리 높이에 비해 화구가 넓은 것이 특징이고, 응회환보다는 높고 사면이 급합니다. 일출봉은 바다에서 솟은 가파른 테두리가 넓은 분화구를 둘러싸고 있으며, 우도 남동쪽 끝의 쇠머리오름도 응회구입니다. 두 곳 모두 바닷가에 있어 마그마가 물을 만나기 쉬웠습니다.',
  foot: ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '봉우리, 마을, 항구, 우도저수지 윤곽: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '지형 해석: 『이미지로 이해하는 지형학』 2판 12장.', '바닷가 모래빛, 밭과 숲은 규칙으로 칠한 예시입니다.', '표면 재질: ambientCG (CC0)'],
});
