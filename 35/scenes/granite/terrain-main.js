// © 2026 김용현
// 북한산 실제 지형 화면. 땅 높이만 실제 자료이고, 봉우리와 절, 마을 이름, 맨바위 윤곽은 지도 자료(OpenStreetMap)에서 옮겼다.
// 밝은 회색 맨바위는 땅의 기울기로 어림한 것이고, 나마 이름표 자리는 예시다. 숲과 마을 바닥 색은 규칙으로 칠한 예시다.
// 화면 틀은 화산 실제 지형 화면(scenes/volcano/site-page.js)과 같은 구성이고, 바다 대신 맨바위 덧칠과 지도 자료 윤곽을 켜고 끈다.
import * as THREE from 'three';
import { createStage } from '../../shared/stage3d.js';
import { loadTerrainUniforms, splatTex, patchTerrain } from '../../shared/terrain-material.js';
import { buildTrees, buildNearTrees } from '../../shared/vegetation.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap, drawHeightTint, wrapText } from '../../shared/map-views.js';
import { createHeightScale } from '../../shared/height.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createBuildingLayer, clearUnder } from '../../shared/buildings.js';
import { createRoadLayer } from '../../shared/roads.js';
import { figPalette, isDark } from '../../shared/theme.js';
import { buildBukhan, peakProfile, profileNumbers, profileMarks, placesOf, sampleH, N, SIZE, CELL, WATER_LEVEL, PEAKS, BARE_ROCK, ALL_PEAKS } from './bukhan-sim.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
// 산지라 모든 높이를 같은 배율로 키운다.
const scale = createHeightScale(2, 5000);
const ex = scale.apply;
let currentView = 'oblique';
const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };

// 셋째 판(tC): 빨강은 기울기로 어림한 맨바위(밝은 화강암 빛으로 덧칠, uRock), 파랑과 초록은 OSM 맨바위 윤곽의 안과 테두리(주황, uOsm).
const ROCK_GLSL = /* glsl */`
vec4 sc=texture2D(tC,suv+jit*.25);
{
  float g=smoothstep(.2,.7,sc.r)*uRock;
  float speck=smoothstep(.35,.75,tiny)*.5+smoothstep(.3,.8,fin)*.5;
  // 밝은 회색에 조금 누르스름한 화강암, 비에 젖어 흘러내린 자국 같은 어두운 얼룩
  vec3 granite=mix(vec3(.40,.38,.34),vec3(.62,.59,.53),speck);
  granite=mix(granite,rockC*vec3(1.3,1.25,1.12),.45);
  granite*=mix(1.,.66,smoothstep(.6,.82,mid*.7+tiny*.3));
  base=mix(base,granite,g);
  terrainRough=mix(terrainRough,.9,g);
  float inO=smoothstep(.3,.7,sc.b)*uOsm, rimO=smoothstep(.3,.7,sc.g)*uOsm;
  base=mix(base,base*.55+vec3(.42,.16,.02),inO*.55);
  base=mix(base,vec3(.95,.42,.08),rimO*.9);
}
`;

const VIEWS = {
  // 동남동쪽 높은 하늘에서 서북서쪽의 인수봉, 백운대, 만경대를 본다. 앞에 우이동과 도선사, 뒤에 서쪽 골짜기가 보인다.
  oblique: { from: [420, 330], lift: 3200, to: [252, 238] },
  above: { from: [256, 262], lift: 9800, to: [256, 250] },
  // 하루재 동쪽 하늘에서 인수봉의 둥근 동쪽 벽과 그 뒤 백운대를 가까이 본다.
  peaks: { from: [325, 200], lift: 650, to: [258, 216] },
  // 남쪽 하늘에서 노적봉과 그 뒤 만경대, 백운대, 인수봉으로 이어지는 바위 능선을 본다.
  ridge: { from: [236, 352], lift: 1150, to: [252, 236] },
};
const PRIORITY = { insu: 5, baekun: 5, mangyeong: 4, nojeok: 4, nama: 4, doseon: 3, ui: 3, yeong: 2, wonhyo: 2, uisang: 2, munsu: 2, bohyeon: 2, sumeun: 2, center: 2, suyu: 1, jingwan: 1 };
const HIDE = {
  oblique: ['sumeun', 'jingwan', 'uisang'],
  above: ['sumeun', 'nama'],
  peaks: ['suyu', 'jingwan', 'center', 'uisang', 'munsu', 'bohyeon', 'wonhyo', 'ui'],
  ridge: ['suyu', 'jingwan', 'center', 'uisang', 'munsu', 'bohyeon', 'ui', 'doseon', 'sumeun'],
};
const MAP_KEYS = ['baekun', 'insu', 'mangyeong', 'nojeok', 'yeong', 'wonhyo', 'uisang', 'munsu', 'bohyeon', 'doseon', 'ui', 'suyu', 'center'];
const MAP_KEYS_SMALL = ['baekun', 'insu', 'nojeok', 'uisang', 'munsu', 'ui', 'suyu'];

// 눈금 간격: 범위에 맞춰 1, 2, 5의 10배수
const niceStep = (range, count) => {
  const raw = range / count, p = 10 ** Math.floor(Math.log10(raw)), r = raw / p;
  return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * p;
};

// 꺾은 선 단면. 기울기로 어림한 맨바위 구간은 땅 위에 밝은 회색 띠로, OSM 맨바위 윤곽을 지나는 곳은 바닥에 주황 눈금으로 표시한다.
function drawPeakProfile(canvas, { points, marks, from, to, note }) {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d'), W = r.width, H = r.height;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const P = figPalette();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const pad = W < 520 ? 46 : 64, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points.at(-1).m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  const zs = points.map(p => p.z), lo = Math.min(...zs), hi = Math.max(...zs);
  const step = niceStep(hi - lo + 1, 6), min = Math.floor(lo / step) * step, max = Math.ceil((hi + step * 0.8) / step) * step;
  let lines = wrapText(ctx, note, W - pad - side);
  const foot = (lines.length + 1) * noteGap + 40;
  const xScale = usableW / lengthM, yScale = (H - foot - 70) / (max - min), ve = yScale / xScale;
  lines = [...lines, ve < 1.5 ? '가로와 세로를 거의 같은 비율로 그렸습니다.' : `세로를 약 ${Math.round(ve)}배 과장해 그렸습니다.`];
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = P.grid; ctx.fillStyle = P.sub; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max + 1e-6; z += step) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); ctx.fillText(`${Math.round(z).toLocaleString('ko-KR')}m`, pad - 4, y(z) + 4); }
  ctx.textAlign = 'center';
  const kmStep = niceStep(lengthM / 1000, 6);
  for (let km = 0; km <= lengthM / 1000 + 1e-6; km += kmStep) ctx.fillText(`${+km.toFixed(2)}km`, x(km * 1000), H - foot + 15);
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = '#6f5f45'; ctx.fill();
  // 기울기로 어림한 맨바위 구간
  ctx.lineCap = 'round'; ctx.strokeStyle = '#d6d0c4'; ctx.lineWidth = 6;
  for (let n = 1; n < points.length; n++) {
    const a = points[n - 1], b = points[n];
    if (!a.rock || !b.rock) continue;
    ctx.beginPath(); ctx.moveTo(x(a.m), y(a.z) - 2); ctx.lineTo(x(b.m), y(b.z) - 2); ctx.stroke();
  }
  // OSM 맨바위 윤곽을 지나는 곳: 바닥 줄에 주황 눈금
  ctx.lineCap = 'butt'; ctx.strokeStyle = '#e0782a'; ctx.lineWidth = 4;
  for (let n = 1; n < points.length; n++) {
    if (!points[n].osm || !points[n - 1].osm) continue;
    ctx.beginPath(); ctx.moveTo(x(points[n - 1].m), y(min) - 3); ctx.lineTo(x(points[n].m), y(min) - 3); ctx.stroke();
  }
  ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6;
  ctx.beginPath(); points.forEach((p, n) => (n ? ctx.lineTo(x(p.m), y(p.z)) : ctx.moveTo(x(p.m), y(p.z)))); ctx.stroke();
  ctx.font = `700 ${W < 520 ? 12 : 15}px "Malgun Gothic",sans-serif`;
  const used = [];
  for (const k of marks) {
    const p = points[k.at], w = ctx.measureText(k.text).width;
    let tx = Math.min(W - 4 - w / 2, Math.max(pad + w / 2, x(p.m))), ty = Math.max(48, y(p.z) - 30);
    const hit = () => used.find(u => Math.abs(u.x - tx) < (u.w + w) / 2 + 6 && Math.abs(u.y - ty) < 18);
    // 겹치면 위로 올리되, 위쪽 제목 줄(A, B)까지 닿으면 대신 옆으로 비킨다.
    for (let u = hit(); u; u = hit()) {
      if (ty - 18 >= 48) ty -= 18;
      else tx = Math.min(W - 4 - w / 2, u.x + (u.w + w) / 2 + 8);
      if (tx >= W - 4 - w / 2 && hit()) break;
    }
    used.push({ x: tx, y: ty, w });
    ctx.strokeStyle = P.hi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(p.m), ty + 5); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = P.bg; ctx.strokeText(k.text, tx, ty);
    ctx.fillStyle = P.hi; ctx.fillText(k.text, tx, ty);
  }
  ctx.fillStyle = P.ink; ctx.font = '700 16px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 22);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 22);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  lines.forEach((t, n) => ctx.fillText(t, pad > 46 ? pad : 8, H - foot + 40 + n * noteGap));
}

// 오른쪽 창: 북한산 같은 화강암 돌산이 드러나는 과정의 예시 단면 네 칸과 이 화면의 자료에서 잰 숫자.
// 1에서 3칸은 형성 모형의 세 단계와 같은 차례이고, 각 단계로 가는 연결을 둔다.
function drawSchematic(el, sim) {
  const P = figPalette(), dk = isDark();
  const cover = '#8a7760', granite = dk ? '#c4b6a6' : '#cdbfae', fresh = dk ? '#b3a594' : '#bfb09e', regolith = '#c99f5e', soil = '#7d5b3a', tree = dk ? '#3f7a3c' : '#2f6a2e', sky = P.bg;
  const jointC = '#6d6256', ink = P.ink, white = '#fbfaf6';
  const panel = (ox, oy, title, body) => `<g transform="translate(${ox} ${oy})"><rect x="0" y="0" width="290" height="196" fill="${sky}" stroke="${P.frame}"/>${body}<text x="8" y="17" font-size="13" font-weight="700" fill="${ink}">${title}</text></g>`;
  const trees = (pts) => pts.map(([x, y]) => `<path d="M${x - 5} ${y} L${x} ${y - 13} L${x + 5} ${y} Z" fill="${tree}"/>`).join('');
  // 0: 땅속에서 굳은 화강암 위를 다른 암석이 덮고 있다.
  const p0 = `<path d="M0 46 C60 40 120 50 180 42 C230 36 260 44 290 40 L290 196 L0 196 Z" fill="${cover}"/>
  <g stroke="#a08d74" stroke-width="1" fill="none"><path d="M0 70 C80 64 200 74 290 66"/><path d="M0 92 C90 86 200 96 290 88"/></g>
  <path d="M18 196 C30 150 80 112 145 110 C210 112 258 150 272 196 Z" fill="${granite}"/>
  <text x="10" y="62" font-size="12" fill="${white}">덮고 있던 암석</text>
  <text x="145" y="160" font-size="12" fill="${'#2b2620'}" text-anchor="middle">땅속에서 마그마가 식어</text><text x="145" y="176" font-size="12" fill="${'#2b2620'}" text-anchor="middle">굳은 화강암</text>`;
  // 1: 덮개가 깎여 얕아진 화강암에 절리를 따라 물이 스며 땅속에서 썩는다. 절리가 성긴 가운데 덩어리는 덜 썩는다.
  const front1 = 'M0 128 C20 132 40 120 60 126 C80 132 95 118 108 98 C122 78 168 78 182 98 C196 118 212 130 232 124 C252 118 270 130 290 126';
  const p1 = `<path d="M0 58 C80 54 200 60 290 56 L290 196 L0 196 Z" fill="${regolith}"/>
  <path d="${front1} L290 196 L0 196 Z" fill="${fresh}"/>
  <g stroke="${jointC}" stroke-width="1.2">${[24, 48, 72, 214, 240, 266].map(x => `<line x1="${x}" y1="70" x2="${x}" y2="196"/>`).join('')}<line x1="0" y1="152" x2="100" y2="152"/><line x1="190" y1="152" x2="290" y2="152"/><line x1="145" y1="150" x2="145" y2="196"/></g>
  <g fill="${fresh}" stroke="${jointC}" stroke-width=".8">${[[36, 108], [60, 112], [228, 110], [252, 106]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="7"/>`).join('')}</g>
  <path d="${front1}" fill="none" stroke="#7a2e12" stroke-width="1.6" stroke-dasharray="5 3"/>
  <text x="8" y="44" font-size="12" fill="${ink}">물이 절리를 따라 스며듦</text>
  <text x="145" y="72" font-size="12" fill="#2b2620" text-anchor="middle">풍화층(썩은 바위와 모래)</text>
  <text x="145" y="122" font-size="12" fill="#2b2620" text-anchor="middle">절리가 성긴</text><text x="145" y="137" font-size="12" fill="#2b2620" text-anchor="middle">큰 덩어리</text>
  <text x="8" y="190" font-size="11" fill="#7a2e12">점선: 풍화 전선</text>`;
  // 2: 풍화층이 비탈을 따라 벗겨져 흘러내리고, 덜 썩은 큰 덩어리가 돔으로, 둥근 핵석이 토르로 드러난다.
  const surf2 = 'M0 140 C30 142 60 136 92 120 C108 108 112 64 145 60 C178 64 182 108 198 120 C230 136 260 142 290 140';
  const p2 = `<path d="${surf2} L290 196 L0 196 Z" fill="${fresh}"/>
  <path d="M222 135 C240 127 266 125 290 127 L290 140 C262 142 240 140 222 135 Z" fill="${regolith}"/>
  <g fill="${granite}" stroke="${jointC}" stroke-width=".8"><ellipse cx="40" cy="132" rx="10" ry="8"/><ellipse cx="54" cy="128" rx="8" ry="7"/><ellipse cx="246" cy="134" rx="10" ry="8"/></g>
  <path d="M232 92 C246 104 262 116 278 124" fill="none" stroke="${ink}" stroke-width="1.3" marker-end="url(#gArrow)"/>
  <text x="145" y="52" font-size="12" fill="${ink}" text-anchor="middle">돔(통째로 드러난 덩어리)</text>
  <text x="24" y="112" font-size="12" fill="${ink}">토르</text>
  <text x="196" y="84" font-size="12" fill="${ink}">풍화층이 벗겨져</text><text x="196" y="99" font-size="12" fill="${ink}">흘러내림</text>`;
  // 3: 오늘날. 땅속에서 이미 생긴 판상 절리가 드러난 돔 겉에서 벌어져 껍질처럼 떨어지고, 평평한 윗면에 나마가 파인다. 둘레 완만한 비탈은 흙이 덮여 숲이 된다.
  const p3 = `<path d="${surf2} L290 196 L0 196 Z" fill="${fresh}"/>
  <path d="M0 140 C30 142 60 136 92 120 L96 128 C66 144 30 150 0 150 Z" fill="${soil}"/>
  <path d="M198 120 C230 136 260 142 290 140 L290 150 C258 150 226 144 194 128 Z" fill="${soil}"/>
  <g fill="none" stroke="${jointC}" stroke-width="1.1"><path d="M100 120 C114 80 124 70 145 68 C166 70 176 80 190 120"/><path d="M108 124 C120 92 130 80 145 79 C160 80 170 92 182 124"/></g>
  <path d="M138 61 C141 66 149 66 152 61 Z" fill="#3d6f9e"/>
  ${trees([[18, 146], [38, 144], [60, 138], [80, 128], [212, 130], [234, 138], [256, 142], [276, 142]])}
  <text x="160" y="50" font-size="12" fill="${ink}">나마</text><path d="M158 46 L150 60" stroke="${ink}" stroke-width="1"/>
  <text x="196" y="84" font-size="12" fill="${ink}">판상 절리</text><path d="M194 82 L178 92" stroke="${ink}" stroke-width="1"/>
  <text x="8" y="104" font-size="12" fill="${ink}">흙이 덮인</text><text x="8" y="119" font-size="12" fill="${ink}">비탈(숲)</text>
  <text x="145" y="150" font-size="12" fill="#2b2620" text-anchor="middle">맨바위</text>`;
  const svg = `<svg viewBox="0 0 600 410" role="img" aria-label="화강암 돌산이 드러나는 과정 예시 단면">
  <defs><marker id="gArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${ink}"/></marker></defs>
  ${panel(6, 4, '처음: 땅속의 화강암', p0)}
  ${panel(304, 4, '1. 땅속 풍화', p1)}
  ${panel(6, 208, '2. 풍화층이 벗겨짐', p2)}
  ${panel(304, 208, '3. 오늘날', p3)}
</svg>`;
  const s = sim.stats;
  el.innerHTML = `<h2>북한산은 어떻게 돌산이 되었나</h2>
<figure>${svg}</figure>
<p class="schem-cap">예시 그림입니다. 크기와 깊이를 크게 과장했고 오랜 시간을 네 칸으로 압축했습니다. 실제 북한산의 땅속 모양을 잰 것이 아닙니다.</p>
<ol class="stage-list">
<li><b>처음.</b>북한산의 바위는 땅속 깊은 곳에서 마그마가 천천히 식어 굳은 화강암입니다. 그때는 그 위를 다른 암석이 두껍게 덮고 있었습니다.</li>
<li><b>1. 땅속 풍화.</b>위를 덮던 암석이 오랜 세월 깎여 나가면서 화강암이 땅 가까이 올라옵니다. 따뜻하고 습한 시기에 빗물이 절리(바위의 틈)를 따라 스며 땅속에서 바위를 썩힙니다. 절리가 촘촘한 곳은 깊이 썩고, 절리가 성긴 큰 덩어리는 덜 썩습니다.<br><a href="./model.html#stage-1">형성 모형에서 보기: 덥고 습한 시기, 땅속 깊은 풍화</a></li>
<li><b>2. 풍화층이 벗겨짐.</b>추운 시기에 얼었다 녹기를 되풀이하며 썩은 층(풍화층)이 비탈 아래로 흘러내리면, 덜 썩은 큰 덩어리가 통째로 드러나 둥근 돔이 되고, 작은 둥근 덩어리는 토르가 됩니다. 인수봉 같은 둥근 바위 봉우리가 이렇게 생겼다는 것은 책의 일반 설명을 북한산에 맞춰 본 짐작입니다.<br><a href="./model.html#stage-2">형성 모형에서 보기: 토르와 돔이 드러남</a></li>
<li><b>3. 오늘날.</b>화강암을 수 km 두께로 덮고 있던 바위가 오랜 세월 깎여 나가며 땅속에서 생긴 판상 절리(겉면과 나란한 틈)가, 바위가 드러난 뒤 벌어져 바위 겉이 얇은 판으로 떨어져 나갑니다(박리). 평평한 윗면에는 나마가 파이고, 겉의 광물 알갱이가 낱알로 떨어지기도 합니다(입상 붕괴). 둘레의 완만한 비탈에는 풍화층과 흙이 남아 숲이 자랍니다.<br><a href="./model.html#stage-3">형성 모형에서 보기: 오늘날, 바위 겉의 작은 지형</a></li>
</ol>
<p class="schem-cap">땅속 풍화가 따뜻한 시기에, 벗겨짐이 추운 빙기에 일어났다는 시기 설명은 책도 추정이라고 적는 짐작입니다. 판상 절리와 박리를 나누는 기준도 아직 정해지지 않았습니다.</p>
<h3>돌산과 흙산</h3>
<p class="schem-note">겉에 바위가 많이 드러난 산을 돌산(석산), 겉이 주로 흙으로 덮인 산을 흙산(토산)이라 합니다. 책의 일반 설명에 따르면 화강암은 절리가 적고 석영과 정장석이 많으면 단단해 돌산이 되고, 절리가 많고 사장석과 흑운모가 많으면 쉽게 썩어 오히려 낮은 분지가 되기도 합니다. 북한산처럼 바위가 드러난 화강암 산은 대개 절리가 적은 화강암으로 설명합니다. 편마암이나 편암 같은 변성암 지역에는 흙산이 많습니다.</p>
<h3>이 화면의 자료에서 잰 것</h3>
<p class="schem-note">기울기로 어림한 맨바위는 약 ${s.rockKm2.toFixed(1)}제곱킬로미터이고, OpenStreetMap 맨바위 윤곽은 약 ${s.osmKm2.toFixed(1)}제곱킬로미터입니다. 어림한 맨바위 칸 가운데 약 ${s.rockNearOsm}%가 지도 자료의 윤곽 안이나 그 바로 옆(한 칸 안)에 있고, 지도 자료 윤곽 가운데 어림이 잡아낸 것은 약 ${s.osmFound}%뿐입니다. 북한산의 맨바위에는 가파른 벽뿐 아니라 완만하게 드러난 넓은 바위 비탈도 많아, 기울기만으로는 다 찾지 못합니다.</p>
<p class="schem-note">고도 자료에서 백운대 꼭대기는 약 ${s.baekundae}m, 인수봉은 약 ${s.insubong}m로, 알려진 높이(약 836m, 약 811m)보다 낮게 나옵니다. 자료 간격(약 30m)이 바위 봉우리보다 성겨 꼭대기가 깎이기 때문입니다.</p>`;
}

async function start() {
  const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
    mount: document.getElementById('stage'), size: SIZE, fogDensity: 0.00005 * (PHONE ? 0.5 : 1), pixelRatio: Q.pixelRatio, shadowSize: Q.shadow,
  });
  // 높이 2배면 산이 약 1,700m가 되므로 해 쪽 모서리가 그림자 상자 밖으로 나가지 않게 빛을 조금 멀리 둔다.
  scene.traverse(o => {
    if (!o.isDirectionalLight) return;
    o.position.setLength(10000);
    o.shadow.camera.far = 25000;
    o.shadow.camera.updateProjectionMatrix();
  });
  controls.maxDistance = 16000;
  controls.minDistance = 40;
  const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });

  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/bukhan-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildBukhan(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/bukhan-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest);
  const roadData = await (await fetch(new URL('./data/bukhan-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim);
  const points = peakProfile(sim), nums = profileNumbers(points);
  const prof = {
    points, marks: profileMarks(points), from: 'A 북한산성 탐방지원센터', to: 'B 우이동',
    note: `서쪽 골짜기 어귀의 북한산성 탐방지원센터(A)에서 백운대와 인수봉 꼭대기를 지나 하루재를 넘어 동쪽 우이동(B)까지 꺾은 선으로 잰 높이입니다(약 ${nums.lengthKm.toFixed(1)}km). 밝은 회색 띠는 기울기로 어림한 맨바위 구간(약 ${nums.rockKm.toFixed(1)}km), 바닥의 주황 눈금은 지도 자료의 맨바위 윤곽을 지나는 곳입니다. 인수봉에서 하루재 쪽으로 100m 사이 가장 급한 곳은 약 ${nums.steepEastDeg}도입니다. 실제 인수봉 동쪽 벽은 거의 수직에 가깝지만, 약 30m 자료라 훨씬 완만하게 나옵니다.`,
  };

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 3;
    pos[k] = (i / (N - 1) - 0.5) * SIZE; pos[k + 2] = (j / (N - 1) - 0.5) * SIZE;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
  say('재질 불러오는 중');
  const uniforms = await loadTerrainUniforms(renderer, SIZE);
  uniforms.tA.value = splatTex(stage.splatA, N);
  uniforms.tB.value = splatTex(stage.splatB, N);
  const tC = { value: splatTex(stage.splatC, N) }, uRock = { value: 1 }, uOsm = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const shared = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    shared(sh, r);
    sh.uniforms.tC = tC; sh.uniforms.uRock = uRock; sh.uniforms.uOsm = uOsm;
    sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D tA', 'uniform sampler2D tC;\nuniform float uRock, uOsm;\nuniform sampler2D tA').replace('// 물길: 얕은 물은', ROCK_GLSL + '// 물길: 얕은 물은');
  };
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  const groundAt = (i, j) => ex(sampleH(sim.h, i, j));
  const toWorld = (i, j) => { const w = world(i, j); return [w.x, w.z]; };
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld, groundAt, cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld, groundAt });
  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
  const applyHeight = () => {
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(sim.h[k]);
    fillNormals(N, CELL, k => pos[k * 3 + 1], nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    if (treeMesh) scene.remove(treeMesh);
    if (nearMesh) scene.remove(nearMesh);
    const key = scale.factor;
    treeMesh = treeCache[key] ??= buildTrees(veg, stage, sim.mountain);
    nearMesh = nearCache[key] ??= buildNearTrees(veg, stage, sim.mountain);
    scene.add(treeMesh, nearMesh);
    buildings.place(scale.factor);
    roads.place(scale.factor);
    renderer.shadowMap.needsUpdate = true;
  };

  // 시점. from과 to는 격자 칸 [가로, 세로]이고, 카메라 높이는 바라보는 자리 땅 위 lift(m)다.
  function setView(name) {
    const v = VIEWS[name];
    currentView = name;
    const z = portraitZoom() * (PHONE ? 1.35 : 1);
    const a = world(...v.from), b = world(...v.to), by = groundAt(...v.to), ay = by + v.lift;
    camera.position.set(b.x + (a.x - b.x) * z, by + (ay - by) * z, b.z + (a.z - b.z) * z);
    controls.target.set(b.x, by, b.z);
    controls.update();
    invalidate();
    document.querySelectorAll('[data-view]').forEach(o => o.classList.toggle('on', o.dataset.view === name));
  }

  let rockOn = true, osmOn = false;
  // 지도 위에: 기울기로 어림한 맨바위(회색 칸), 지도 자료 맨바위 윤곽(주황 선), 단면 선(A에서 B), 봉우리와 곳 이름
  const rockLayer = document.createElement('canvas');
  rockLayer.width = rockLayer.height = N;
  {
    const c = rockLayer.getContext('2d'), img = c.createImageData(N, N);
    for (let k = 0; k < N * N; k++) if (sim.rock[k] >= 0.5) img.data.set([120, 116, 108, 200], k * 4);
    c.putImageData(img, 0, 0);
  }
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    if (rockOn) { ctx.imageSmoothingEnabled = false; ctx.drawImage(rockLayer, ox, oy, N * sc, N * sc); }
    if (osmOn) {
      ctx.strokeStyle = '#d0601a'; ctx.lineWidth = 1.2;
      for (const p of BARE_ROCK) { ctx.beginPath(); p.forEach(([x, y], n) => (n ? ctx.lineTo(ox + x * sc, oy + y * sc) : ctx.moveTo(ox + x * sc, oy + y * sc))); ctx.closePath(); ctx.stroke(); }
    }
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    points.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = points[0], B = points.at(-1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc - 6, oy + A.y * sc - 10); ctx.fillText('A', ox + A.x * sc - 6, oy + A.y * sc - 10);
    ctx.strokeText('B', ox + B.x * sc - 4, oy + B.y * sc + 24); ctx.fillText('B', ox + B.x * sc - 4, oy + B.y * sc + 24);
    // 이름 없는 봉우리 점은 작은 세모만
    ctx.fillStyle = 'rgba(122,46,18,.55)';
    for (const [, x, y] of ALL_PEAKS) { const px = ox + x * sc, py = oy + y * sc; ctx.beginPath(); ctx.moveTo(px, py - 3); ctx.lineTo(px + 3, py + 2); ctx.lineTo(px - 3, py + 2); ctx.closePath(); ctx.fill(); }
    // 휴대폰처럼 지도가 작으면 이름을 줄여 글자가 겹치지 않게 한다.
    const small = N * sc < 460;
    ctx.font = `700 ${small ? 11 : 13}px "Malgun Gothic",sans-serif`;
    for (const key of small ? MAP_KEYS_SMALL : MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, w = ctx.measureText(l.name).width;
      // 백운대는 점 위에, 노적봉은 점 왼쪽에 써서 둘레의 원효봉, 인수봉, 만경대 글자와 겹치지 않게 한다.
      let tx = key === 'nojeok' ? x - w - 7 : x + 7, ty = y + 5;
      if (key === 'baekun') { tx = x - w / 2; ty = y - 9; }
      if (tx + w > ox + (N - 1) * sc - 4) tx = x - w - 7;
      ctx.fillStyle = l.kind === 'peak' ? '#7a2e12' : '#20302a';
      ctx.beginPath();
      if (l.kind === 'peak') { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); } else ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(l.name, tx, ty);
      ctx.fillStyle = '#20302a'; ctx.fillText(l.name, tx, ty);
    }
    ctx.restore();
  };

  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const legend = () => [rockOn ? '회색 칸: 기울기로 어림한 맨바위' : '', osmOn ? '주황 선: OpenStreetMap 맨바위 윤곽' : '', '붉은 점선: 단면을 잰 길(A에서 B까지)', '세모: 산봉우리, 점: 절과 마을'].filter(Boolean).join('. ');
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : legend();
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 20 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 40, hi: 820, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawPeakProfile(mapView, prof);
  };
  document.querySelectorAll('[data-show]').forEach(b => b.onclick = () => {
    showing = b.dataset.show;
    document.querySelectorAll('[data-show]').forEach(o => o.classList.toggle('on', o === b));
    drawMapView();
    placeLabels();
    invalidate();
  });

  let labelsOn = true;
  const schemEl = document.getElementById('schem');
  drawSchematic(schemEl, sim);
  addEventListener('themechange', () => drawSchematic(schemEl, sim));
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  const CLS = { guess: 'guess', village: 'small', peak: 'small' };
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name, l.sub, (PRIORITY[key] ?? 1) >= 5 ? '' : CLS[l.kind] ?? '');
  const v3 = new THREE.Vector3();
  const halfW = l => Math.max(l.name.length * 11, (l.sub ?? '').length * 6.5) / 2;
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    const phone = isPhone(), right = innerWidth - (schemEl.hidden || phone ? 0 : schemEl.offsetWidth + 90) - 20, bottom = phone ? document.getElementById('corner').getBoundingClientRect().top : innerHeight;
    const left = phone || document.body.matches('.panel-closed, .merged') ? 0 : document.getElementById('panel').getBoundingClientRect().right + 4;
    for (const [key, l] of Object.entries(PLACES)) {
      if (HIDE[currentView]?.includes(key)) continue;
      if (key === 'nama' && !rockOn) continue;
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, groundAt(l.grid[0], l.grid[1]) + 14, w.z).project(camera);
      const sx = (v3.x * 0.5 + 0.5) * innerWidth, sy = (-v3.y * 0.5 + 0.5) * innerHeight;
      const pr = PRIORITY[key] ?? 1;
      if (v3.z <= 1 && Math.abs(v3.x) < 1.02 && Math.abs(v3.y) < 1.02 && sx < right && sx - halfW(l) > left && sy < bottom) list.push({ key, x: sx, y: sy, priority: pr, keep: pr >= 4 });
    }
    labelLayer.place(list);
  }

  const fitView = () => {
    const phone = isPhone();
    const dockW = schemEl.hidden || phone ? 0 : schemEl.offsetWidth;
    const sheet = schemEl.hidden || !phone ? 0 : schemEl.offsetHeight;
    const left = phone || document.body.matches('.panel-closed, .merged') ? 0 : document.getElementById('panel').offsetWidth + 20;
    camera.setViewOffset(innerWidth, innerHeight, (dockW - left) / 2, sheet / 2, innerWidth, innerHeight);
    document.body.classList.toggle('noschem', schemEl.hidden);
    drawMapView();
    placeLabels();
    invalidate();
  };
  const setSchematic = on => { schemEl.hidden = !on; document.getElementById('schemBtn').classList.toggle('on', on); fitView(); };
  document.getElementById('schemBtn').onclick = () => setSchematic(schemEl.hidden);
  addEventListener('resize', fitView);

  function setHeight(k) {
    scale.set(k);
    applyHeight();
    setView(currentView);
    document.querySelectorAll('[data-height]').forEach(b => b.classList.toggle('on', +b.dataset.height === k));
    document.getElementById('heightBadge').textContent = k === 1 ? '실제 높이' : `높이 ${k}배`;
    document.getElementById('heightNote').textContent = k === 1
      ? '실제 높이 그대로입니다. 끌어서 돌리고 휠로 확대합니다.'
      : `높이를 ${k}배로 과장했습니다. 끌어서 돌리고 휠로 확대합니다.`;
    drawMapView();
    placeLabels();
  }
  const guessNote = document.getElementById('guessNote');
  // 왼쪽 아래 범례는 켜 둔 것만 보인다.
  const showLegend = () => { guessNote.hidden = !rockOn && !osmOn; document.getElementById('gRock').hidden = !rockOn; document.getElementById('gOsm').hidden = !osmOn; };
  const setRock = on => { rockOn = on; uRock.value = on ? 1 : 0; document.getElementById('rockBtn').classList.toggle('on', on); showLegend(); drawMapView(); placeLabels(); invalidate(); };
  const setOsm = on => { osmOn = on; uOsm.value = on ? 1 : 0; document.getElementById('osmBtn').classList.toggle('on', on); showLegend(); drawMapView(); placeLabels(); invalidate(); };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('rockBtn').onclick = () => setRock(!rockOn);
  document.getElementById('osmBtn').onclick = () => setOsm(!osmOn);
  document.getElementById('roadsBtn').onclick = e => { e.currentTarget.classList.toggle('on', roads.toggle()); invalidate(); };
  document.getElementById('buildingsBtn').onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };

  setView(currentView);
  setHeight(2);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  fitView();
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = {
    setView, setHeight, setSchematic, setRock, setOsm, stats: sim.stats,
    profile: { lengthKm: +nums.lengthKm.toFixed(2), baekunZ: nums.baekunZ, insuZ: nums.insuZ, steepEastDeg: nums.steepEastDeg, rockKm: +nums.rockKm.toFixed(2), marks: prof.marks.map(m => m.text) },
    buildings: buildings.info, roads: () => roads.info(),
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '서울 북쪽 북한산의 백운대(약 836m)와 인수봉 일대입니다. 북한산은 땅속 깊은 곳에서 마그마가 식어 굳은 화강암으로 된 산입니다. 화강암을 덮고 있던 암석이 오랜 세월 깎여 나가자 화강암이 땅 위로 드러났습니다. 책의 일반 설명으로는 절리(바위의 틈)가 적은 큰 덩어리가 둥근 바위 봉우리로 남습니다. 인수봉은 거의 통째로 드러난 둥근 맨바위 봉우리로, 흔히 화강암 돔의 예로 소개됩니다(책에는 사례로 나오지 않음). 백운대와 만경대, 노적봉도 바위가 드러난 봉우리입니다. 이처럼 겉에 바위가 많이 드러난 산을 돌산이라 하고, 겉이 주로 흙으로 덮인 산을 흙산이라 합니다. 책은 북한산 바위 겉에서 광물 알갱이가 낱알로 떨어져 나오는 입상 붕괴와, 평평한 바위 윗면에 파인 웅덩이인 나마를 사진으로 보여 줍니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '봉우리, 절, 마을, 맨바위 윤곽 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '지형 해석: 『이미지로 이해하는 지형학』 2판 3장, 4장.', '맨바위 색은 기울기로 어림한 것이고, 나마 이름표 자리와 숲, 마을 바닥 색은 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
