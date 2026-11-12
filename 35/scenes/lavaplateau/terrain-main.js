// © 2026 김용현
// 철원 용암대지와 한탄강 협곡 실제 지형 화면. 땅 높이만 실제 자료이고, 한탄강과 대교천 물길, 명소와 읍 이름 자리는 지도 자료(OpenStreetMap)에서 옮겼다.
// 어두운 협곡 절벽과 주황 용암대지 범위는 땅의 높이와 기울기로 어림한 것이고, 논과 숲 색은 규칙으로 칠한 예시다.
// 화면 틀은 북한산 실제 지형 화면(scenes/granite/terrain-main.js)과 같은 구성이다.
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
import { createBuildingLayer, clearUnder, footprintMask } from '../../shared/buildings.js';
import { createRoadLayer } from '../../shared/roads.js';
import { figPalette, isDark } from '../../shared/theme.js';
import { buildCheorwon, columnSpot, canyonProfile, canyonNumbers, canyonMarks, valleyProfile, valleyNumbers, valleyMarks, placesOf, sampleH, N, SIZE, CELL, WATER_LEVEL } from './cheorwon-sim.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
// 들판과 협곡(300m 아래)은 고른 배율로 키우고, 그보다 높은 산은 덜 키워 모양을 지킨다.
const scale = createHeightScale(2, 300);
const ex = scale.apply;
let currentView = 'oblique';
const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };

// 셋째 판(tC): 빨강은 기울기로 어림한 협곡 절벽(어두운 현무암 빛으로 덧칠, uCliff), 초록은 용암대지 어림(주황, uPlat).
// 넷째 판(tD): 빨강과 초록은 강을 따라 잰 거리를 240m 주기의 각도(cos, sin)로 담은 것, 파랑은 절벽 아래 돌무더기 어림이다.
// 절벽에는 주상절리를 보여 주는 그림 무늬를 얹는다. 기둥은 협곡 벽을 따라 가로로 늘어서고(강을 따라 잰 거리), 세로로 곧게 선다.
// 기둥 폭은 약 6m로 실제보다 훨씬 굵게 그렸고, 약 11m마다 가로 띠(위아래 용암 흐름의 경계)를 넣어 흐름마다 기둥이 어긋나게 했다.
// 실제 절리를 잰 것이 아니라 그림이다. 멀어서 기둥이 화소보다 가늘어지면 무늬를 끈다.
const CLIFF_GLSL = /* glsl */`
vec4 sc=texture2D(tC,suv+jit*.25);
vec4 sd=texture2D(tD,suv);
float colTilt=0.; vec3 colT=vec3(1.,0.,0.);
{
  float g=smoothstep(.2,.7,sc.r)*uCliff*(1.-smoothstep(.3,.7,sb.g));
  // 실제 높이(m): 300m 아래는 높이 배율만큼 키웠으므로 나눠 되돌린다.
  float ry=vWP.y/uK;
  float ang=atan(sd.g*2.-1.,sd.r*2.-1.);
  float along=(ang/6.2831853+.5)*240.;
  float fy=(ry+(mid-.5)*3.)/11.;
  float layer=floor(fy), lf=fract(fy);
  float uu=along/6.+hash21(vec2(layer,7.))*13.+(fin-.5)*.45;
  float id=floor(uu), f=fract(uu);
  float hid=hash21(vec2(id,layer+3.));
  // 다각형 기둥의 두 면이 만나는 모서리 자리(기둥마다 조금씩 다름)
  float split=.5+(hid-.5)*.5;
  float face=f<split?1.:-1.;
  float aa=fwidth(uu), ab=fwidth(fy);
  float vis=1.-smoothstep(.3,.75,aa);
  float joint=1.-smoothstep(0.,.05+aa*1.2,min(f,1.-f));
  float ridge=1.-smoothstep(0.,.04+aa,abs(f-split));
  vec3 basalt=mix(rockC*vec3(.42,.41,.40),vec3(.12,.115,.11),.6)*(.9+.2*fin);
  vec3 cols=basalt*mix(.8,1.25,hid)*(face>0.?1.3:.6);
  cols=mix(cols,cols*1.5,ridge*.6);
  cols=mix(cols,vec3(.02,.019,.018),joint*.92);
  float band=(1.-smoothstep(0.,.08+ab,min(lf,1.-lf)))*(1.-smoothstep(.3,.7,ab));
  cols=mix(cols,vec3(.27,.17,.11)*(.8+.4*tiny),band*.85);
  basalt=mix(basalt,cols,vis);
  base=mix(base,basalt,g);
  terrainRough=mix(terrainRough,.88,g);
  colTilt=face*.5*vis*g*(1.-band);
  colT=normalize(vec3(-wn.z,0.,wn.x)+vec3(1e-4,0.,0.));
  // 절벽 아래 돌무더기(애추): 크고 작은 돌덩이
  float t=smoothstep(.15,.6,sd.b)*uCliff;
  float blk=hash21(floor(vWP.xz/2.6+vec2(tiny,fin)*.7));
  vec3 rub=mix(vec3(.10,.095,.09),vec3(.26,.245,.23),blk)*(.85+.25*fin);
  base=mix(base,rub,t*.8*(1.-smoothstep(.3,.7,sb.g)));
  terrainRough=mix(terrainRough,.95,t);
  float p=smoothstep(.3,.7,sc.g)*uPlat;
  base=mix(base,base*.5+vec3(.46,.20,.03),p*.55);
}
`;

const VIEWS = {
  // 남동쪽 높은 하늘에서 북서쪽을 본다. 앞에 한탄강 협곡과 동쪽 언덕, 그 너머에 평평한 용암대지, 왼쪽 뒤에 금학산이 보인다.
  oblique: { from: [520, 470], lift: 3300, to: [300, 220] },
  above: { from: [256, 262], lift: 15500, to: [256, 250] },
  // 드르니 북동쪽 하늘에서 북북서쪽으로 협곡을 따라 순담계곡과 고석정 쪽을 본다. 왼쪽 앞에 서쪽 벽(주상절리 무늬)이 비스듬히 보인다.
  canyon: { from: [404, 394], lift: 430, to: [380, 302] },
  // 협곡 서쪽 벽(현무암 절벽)을 마주 본다. 실제 자리는 아래 start()에서 주상절리 이름표 자리로 다시 정한다.
  cliff: { from: [390, 341], lift: 70, to: [372, 338] },
};
const PRIORITY = { columns: 4, hantan: 5, goseok: 5, jiktang: 4, sundam: 4, plain: 4, dongsong: 3, galmal: 3, daegyo: 2, deureuni: 2, geumhak: 2 };
const HIDE = {
  oblique: [],
  above: ['columns'],
  canyon: ['dongsong', 'geumhak', 'plain', 'galmal', 'jiktang'],
  cliff: ['dongsong', 'geumhak', 'galmal', 'jiktang', 'daegyo'],
};
const MAP_KEYS = ['hantan', 'jiktang', 'goseok', 'sundam', 'deureuni', 'daegyo', 'dongsong', 'galmal', 'geumhak'];
const MAP_KEYS_SMALL = ['hantan', 'jiktang', 'goseok', 'sundam', 'dongsong', 'galmal'];

// 눈금 간격: 범위에 맞춰 1, 2, 5의 10배수
const niceStep = (range, count) => {
  const raw = range / count, p = 10 ** Math.floor(Math.log10(raw)), r = raw / p;
  return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * p;
};

// 꺾은 선 단면. 용암대지 어림 구간은 땅 위에 주황 띠로, 절벽 어림 구간은 검은 띠로, 물은 파란 띠로 표시한다.
function drawSection(canvas, { points, marks, from, to, note, short }) {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d'), W = r.width, H = r.height;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const pad = W < 520 ? 46 : 64, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points.at(-1).m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  // 휴대폰처럼 좁으면 짧은 설명을 써서 그림 자리를 남긴다.
  let lines = wrapText(ctx, W < 520 && short ? short : note, W - pad - side);
  const legend = '주황 띠: 용암대지 어림, 검은 띠: 절벽 어림, 파랑: 강물';
  const foot = (lines.length + 2) * noteGap + 40;
  // 눈금 수는 그림 높이에 맞춘다(줄 사이 약 30px 이상).
  const zs = points.map(p => p.z), lo = Math.min(...zs), hi = Math.max(...zs), ticks = Math.max(2, Math.min(6, Math.floor((H - foot - 70) / 30)));
  const step = niceStep(hi - lo + 1, ticks), min = Math.floor((lo - step * 0.3) / step) * step, max = Math.ceil((hi + step * 0.8) / step) * step;
  const xScale = usableW / lengthM, yScale = (H - foot - 70) / (max - min), ve = yScale / xScale;
  lines = [...lines, legend, ve < 1.5 ? '가로와 세로를 거의 같은 비율로 그렸습니다.' : `세로를 약 ${Math.round(ve)}배 과장해 그렸습니다.`];
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = P.grid; ctx.fillStyle = P.sub; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max + 1e-6; z += step) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); ctx.fillText(`${Math.round(z).toLocaleString('ko-KR')}m`, pad - 4, y(z) + 4); }
  ctx.textAlign = 'center';
  const kmStep = niceStep(lengthM / 1000, 6);
  for (let km = 0; km <= lengthM / 1000 + 1e-6; km += kmStep) ctx.fillText(`${+km.toFixed(2)}km`, x(km * 1000), H - foot + 15);
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = DK ? '#6f5f45' : '#8c7a5c'; ctx.fill();
  const band = (key, color, width, lift) => {
    ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineWidth = width;
    for (let n = 1; n < points.length; n++) {
      const a = points[n - 1], b = points[n];
      if (!a[key] || !b[key]) continue;
      ctx.beginPath(); ctx.moveTo(x(a.m), y(a.z) - lift); ctx.lineTo(x(b.m), y(b.z) - lift); ctx.stroke();
    }
  };
  band('plateau', '#e0782a', 5, 2);
  band('cliff', DK ? '#0d0d0d' : '#2c2a28', 6, 0);
  band('water', '#2f7fd0', 6, 0);
  ctx.lineCap = 'butt';
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
  ctx.fillStyle = P.ink; ctx.font = `700 ${W < 520 ? 13 : 16}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 22);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 22);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`; ctx.fillStyle = P.ink;
  lines.forEach((t, n) => ctx.fillText(t, pad > 46 ? pad : 8, H - foot + 40 + n * noteGap));
}

// 오른쪽 창: 골짜기를 가로지른 예시 단면 네 칸과, 용암이 어디서 왔는지, 지류 폭포, 이 화면의 자료에서 잰 숫자.
// 칸마다 형성 모형의 단계로 가는 연결을 둔다. 형성 모형은 #stage-1(열하 분출), #stage-2(골짜기가 메워짐), #stage-3(협곡), #stage-4(오늘날)를 받고, 옛 골짜기는 처음 화면이다.
function drawSchematic(el, sim, nums) {
  const P = figPalette(), dk = isDark();
  const bed = dk ? '#9a8f80' : '#a89c8a', bedLine = dk ? '#7d7366' : '#8a7f70', gravel = '#c9a35e', basalt = dk ? '#4a4846' : '#3d3b39', basaltLine = dk ? '#6a6763' : '#5c5955';
  const field = dk ? '#6f8f3a' : '#7f9f45', water = '#3f8fc4', tree = dk ? '#3f7a3c' : '#2f6a2e', ink = P.ink, white = '#fbfaf6', sky = P.bg;
  // 칸마다 따로 그린 그림. 넓은 화면에서는 두 칸씩, 좁은 화면에서는 한 칸씩 늘어놓는다(terrain.html의 .cw-fig).
  const panel = (title, body) => `<svg viewBox="0 0 290 196" role="img" aria-label="${title}">${body.includes('cwArrow') ? `<defs><marker id="cwArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${ink}"/></marker></defs>` : ''}<rect x="0.5" y="0.5" width="289" height="195" fill="${sky}" stroke="${P.frame}"/>${body}<text x="8" y="17" font-size="13" font-weight="700" fill="${ink}">${title}</text></svg>`;
  const trees = pts => pts.map(([x, y]) => `<path d="M${x - 5} ${y} L${x} ${y - 13} L${x + 5} ${y} Z" fill="${tree}"/>`).join('');
  // 옛 골짜기: 양쪽 산지(기반암) 사이 넓은 골짜기 바닥에 옛 강의 자갈층
  const ground = 'M0 40 C30 44 52 70 70 112 C84 140 96 150 112 152 L178 152 C196 150 210 138 222 112 C238 76 262 50 290 46 L290 196 L0 196 Z';
  const gravelBand = '<path d="M100 152 L190 152 L186 160 L104 160 Z" fill="' + gravel + '"/>';
  const p0 = `<path d="${ground}" fill="${bed}"/>${gravelBand}
  <path d="M138 151 C142 147 150 147 154 151 Z" fill="${water}"/>
  ${trees([[30, 52], [52, 74], [236, 70], [262, 52]])}
  <text x="12" y="120" font-size="12" fill="#2b2620">기반암 산지</text><text x="206" y="176" font-size="12" fill="#2b2620">기반암</text>
  <text x="145" y="138" font-size="12" fill="${ink}" text-anchor="middle">옛 강</text>
  <text x="145" y="178" font-size="11" fill="#2b2620" text-anchor="middle">옛 강의 자갈층</text>`;
  // 용암이 골짜기를 메움: 여러 장의 현무암 층이 낮은 곳부터 쌓여 윗면이 평평해진다.
  const fill = 'M58 92 L232 92 C226 104 222 112 218 120 C210 138 196 150 178 152 L112 152 C96 150 84 140 72 116 C66 106 62 98 58 92 Z';
  const layers = [104, 116, 128, 140].map(y => `<line x1="40" y1="${y}" x2="250" y2="${y}" stroke="${basaltLine}" stroke-width="1"/>`).join('');
  const p1 = `<path d="${ground}" fill="${bed}"/>${gravelBand}
  <clipPath id="cwFill1"><path d="${fill}"/></clipPath><path d="${fill}" fill="${basalt}"/><g clip-path="url(#cwFill1)">${layers}</g>
  ${trees([[30, 52], [262, 52]])}
  <text x="145" y="84" font-size="12" fill="${ink}" text-anchor="middle">평평한 윗면</text>
  <text x="145" y="124" font-size="12" fill="${white}" text-anchor="middle">현무암 층 여러 장</text>
  <text x="145" y="178" font-size="11" fill="#2b2620" text-anchor="middle">용암 아래 묻힌 자갈층</text>`;
  // 강이 용암과 기반암의 경계를 따라 파고든다.
  const cut = 'M196 92 L218 92 L216 104 L214 150 L198 150 L196 104 Z';
  const p2 = `<path d="${ground}" fill="${bed}"/>${gravelBand}
  <clipPath id="cwFill2"><path d="${fill}"/></clipPath><path d="${fill}" fill="${basalt}"/><g clip-path="url(#cwFill2)">${layers}</g>
  <path d="${cut}" fill="${sky}"/>
  <path d="M199 150 C203 146 211 146 215 150 Z" fill="${water}"/>
  <path d="M246 70 C232 74 222 82 214 96" fill="none" stroke="${ink}" stroke-width="1.3" marker-end="url(#cwArrow)"/>
  <text x="226" y="62" font-size="12" fill="${ink}">경계를 따라</text>
  <text x="120" y="84" font-size="12" fill="${ink}" text-anchor="middle">강이 아래로 깎음</text>`;
  // 오늘날: 평평한 윗면은 논, 협곡 벽에 기둥 모양 절리, 바닥 가까이 옛 자갈층
  const joints = [200, 204, 208, 212].map(x => `<line x1="${x - 4}" y1="94" x2="${x - 4}" y2="146" stroke="${basaltLine}" stroke-width="1"/>`).join('');
  const p3 = `<path d="${ground}" fill="${bed}"/>${gravelBand}
  <clipPath id="cwFill3"><path d="${fill}"/></clipPath><path d="${fill}" fill="${basalt}"/><g clip-path="url(#cwFill3)">${layers}</g>
  <path d="${cut}" fill="${sky}"/>
  <g clip-path="url(#cwFill3)">${joints}</g>
  <path d="M199 150 C203 146 211 146 215 150 Z" fill="${water}"/>
  <path d="M62 90 L194 90" stroke="${field}" stroke-width="4"/>
  ${trees([[30, 52], [52, 74], [236, 70], [262, 52]])}
  <text x="120" y="84" font-size="12" fill="${ink}" text-anchor="middle">논(철원 평야)</text>
  <text x="250" y="112" font-size="12" fill="${ink}">협곡</text><path d="M248 108 L218 112" stroke="${ink}" stroke-width="1"/>
  <text x="128" y="136" font-size="11" fill="${white}" text-anchor="middle">주상절리 절벽</text><path d="M160 132 L194 124" stroke="${white}" stroke-width="1"/>`;
  const svg = `<div class="cw-fig" role="group" aria-label="용암이 골짜기를 메우고 강이 협곡을 판 과정 예시 단면">${panel('1. 옛 골짜기', p0)}${panel('2. 용암이 골짜기를 메움', p1)}${panel('3. 강이 협곡을 팜', p2)}${panel('4. 오늘날', p3)}</div>`;
  const s = sim.stats;
  el.innerHTML = `<h2>철원 용암대지는 어떻게 생겼나</h2>
<figure>${svg}</figure>
<p class="schem-cap">예시 그림입니다. 골짜기를 가로질러 자른 모습이며, 크기와 깊이를 크게 과장했고 수십만 년을 네 칸으로 압축했습니다. 실제 철원의 땅속을 잰 그림이 아닙니다.</p>
<ol class="stage-list">
<li><b>1. 옛 골짜기.</b>용암이 오기 전, 이곳은 양쪽 산지 사이의 넓은 골짜기였습니다. 서울에서 원산까지 길게 이어지는 추가령 구조곡이라는 골짜기의 한 부분이고, 바닥에는 옛 강이 날라 온 자갈과 모래가 쌓여 있었습니다.<br><a href="./model.html">형성 모형에서 보기: 옛 골짜기(처음)</a></li>
<li><b>2. 용암이 골짜기를 메움.</b>북쪽 평강 쪽에서 골짜기 방향으로 길게 갈라진 틈을 따라 아주 묽은 현무암질 용암이 흘러나왔습니다(열하 분출). 묽은 용암은 골짜기를 따라 멀리 흘러 낮은 곳부터 채웠고, 이런 분출이 10번 안팎 되풀이된 것으로 보며, 그래서 현무암 층이 여러 장 겹쳤습니다. 그래서 윗면이 넓고 평평한 용암대지가 되었습니다. 지류의 입구가 용암에 막혀 지류 쪽에 호수가 생기기도 했습니다.<br><a href="./model.html#stage-1">형성 모형에서 보기: 열하 분출</a> <a href="./model.html#stage-2">골짜기가 메워짐</a></li>
<li><b>3. 강이 협곡을 팜.</b>처음에 한탄강은 평평한 용암대지 위를 넓게 흘렀습니다. 그 뒤 아래쪽 강과의 높이 차를 줄이려고 아래로 깎아 내려갔는데, 깎기 쉬운 곳인 용암과 옛 땅(기반암이나 옛 강의 퇴적층)의 경계를 따라 파고들었습니다. 그래서 좁고 깊은 협곡이 용암대지의 가장자리를 따라 생겼습니다.<br><a href="./model.html#stage-3">형성 모형에서 보기: 협곡</a></li>
<li><b>4. 오늘날.</b>평평한 윗면은 넓은 논(철원 평야)이고, 협곡 벽에는 용암이 식으며 갈라진 기둥 모양의 절리(주상절리)가 드러난 현무암 절벽이 섭니다. 하류 연천 쪽 협곡에서는 현무암 아래에 옛 강의 자갈층(백의리층)이 오늘날의 강과 비슷한 높이에서 보입니다.<br><a href="./model.html#stage-4">형성 모형에서 보기: 오늘날</a></li>
</ol>
<h3>용암은 어디서 왔나</h3>
<p class="schem-note">용암은 이 화면보다 북쪽, 휴전선 너머 강원도 평강 일대에서 나왔습니다. 남북으로 이어진 틈을 따라 흘러나온 열하 분출이 주였고, 분출이 끝날 무렵에는 한 곳에서 터지는 분출로 바뀌어 작은 화산체가 생겼습니다. 평강의 오리산은 그때 생긴 분석구(스코리아 콘)입니다. 용암은 골짜기를 따라 남쪽으로 흘러 철원과 연천을 지나 파주까지 닿았고, 북쪽 안변 쪽으로도 흘렀습니다. 분출은 지금부터 약 57만 년 전에서 10만 년 전 사이에 활발했던 것으로 보며, 마지막 분출은 약 2만에서 4만 년 전이었을 것으로 추정합니다.</p>
<h3>지류의 폭포</h3>
<p class="schem-note">물이 많은 본류는 협곡을 빠르게 파 내려갔지만, 물이 적은 지류는 그만큼 깎지 못해 용암대지 높이에 남았습니다. 그래서 지류가 본류 협곡으로 들어가는 곳에서는 절벽 아래로 떨어지는 폭포가 되고, 폭포는 바위를 조금씩 깎으며 상류 쪽으로 물러납니다. 연천의 재인폭포가 대표적인 예로, 본류에서 약 350m 상류까지 물러나 있습니다. 재인폭포와 오리산은 이 화면 밖에 있습니다. 화면 안의 직탕폭포는 지류가 아니라 한탄강 본류에 있는 넓고 낮은 폭포입니다.</p>
<h3>이 화면의 자료에서 잰 것</h3>
<p class="schem-note">한탄강 서쪽에서 땅 모양으로 어림한 평평한 용암대지는 약 ${s.plateauKm2}제곱킬로미터이고, 높이는 대부분 약 ${s.plateauLow}m에서 ${s.plateauHigh}m 사이입니다. 강을 따라 잰 협곡 깊이(강 둘레 용암대지 면과 강바닥의 높이 차)는 대부분 약 ${s.depthLow}m에서 ${s.depthHigh}m입니다. 협곡 단면(A에서 B)에서는 용암대지 면이 약 ${nums.top}m, 강바닥이 약 ${nums.floorZ}m로 약 ${nums.depth}m 깊고, 동쪽 언덕은 약 ${nums.eastTopZ}m까지 솟습니다. 화면 안의 한탄강은 약 ${s.riverKm}km를 흐르며 약 ${s.riverTop}m에서 ${s.riverEnd}m로 낮아집니다.</p>
<p class="schem-note">고석정과 순담계곡 둘레에는 현무암 아래의 옛 땅 바위(화강암)가 협곡 바닥에 드러난 곳도 있다고 알려져 있습니다. 강이 용암과 옛 땅의 경계를 따라 파고들었다는 설명과 잘 맞습니다.</p>`;
}

async function start() {
  const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
    mount: document.getElementById('stage'), size: SIZE, fogDensity: 0.00003 * (PHONE ? 0.5 : 1), pixelRatio: Q.pixelRatio, shadowSize: Q.shadow,
  });
  // 창이 11km라 해 쪽 모서리가 그림자 상자 밖으로 나가지 않게 빛을 멀리 둔다.
  scene.traverse(o => {
    if (!o.isDirectionalLight) return;
    o.position.setLength(14000);
    o.shadow.camera.far = 32000;
    o.shadow.camera.updateProjectionMatrix();
  });
  controls.maxDistance = 26000;
  controls.minDistance = 40;
  const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });

  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/cheorwon-dem.bin', import.meta.url))).arrayBuffer());
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/cheorwon-buildings.json', import.meta.url))).json();
  say('지형 만드는 중');
  const sim = buildCheorwon(dem, { built: footprintMask(buildingData, N) });
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest);
  const roadData = await (await fetch(new URL('./data/cheorwon-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim);
  // 절벽 앞 시점: 주상절리 이름표 자리(서쪽 벽)를 강 위 하늘(동쪽 벽 가까이)에서 마주 본다. 더 뒤로 빼면 동쪽 언덕이 벽 아래를 가린다.
  const wallAt = columnSpot(sim);
  VIEWS.cliff = { from: [wallAt[0] + 13, wallAt[1] + 3], lift: 100, to: [wallAt[0] + 2, wallAt[1]] };
  const cPoints = canyonProfile(sim), cNums = canyonNumbers(cPoints);
  const vPoints = valleyProfile(sim), vNums = valleyNumbers(vPoints);
  const deg = r => Math.round((Math.atan(r) * 180) / Math.PI);
  const sections = {
    canyon: {
      points: cPoints, marks: canyonMarks(cPoints), from: 'A 서쪽 용암대지', to: 'B 동쪽 언덕',
      short: `순담계곡과 드르니 사이에서 협곡을 가로지른 높이입니다(약 ${cNums.lengthKm.toFixed(1)}km). 높이 약 ${cNums.top}m의 평평한 용암대지 끝에서 땅이 꺼져 약 ${cNums.depth}m 아래 강바닥에 닿습니다. 약 30m 자료라 실제 절벽(거의 수직)보다 완만하고 넓게 나옵니다.`,
      note: `순담계곡과 드르니 사이(한탄강 주상절리길 구간)에서 협곡을 서쪽에서 동쪽으로 가로질러 잰 높이입니다(약 ${cNums.lengthKm.toFixed(1)}km). 서쪽은 높이 약 ${cNums.top}m의 평평한 용암대지이고, 그 끝에서 땅이 갑자기 꺼져 약 ${cNums.depth}m 아래 강바닥(약 ${cNums.floorZ}m)에 닿습니다. 강 동쪽은 기반암 언덕으로 약 ${cNums.eastTopZ}m까지 솟습니다. 평평한 윗면, 가파른 벽, 좁고 깊은 바닥이 용암대지 협곡의 모습입니다. 실제 절벽은 거의 수직이지만, 약 30m 자료라 서쪽 벽의 가장 급한 곳도 약 ${deg(cNums.steepWest)}도로 완만하고 용암대지 면에서 10m 내려간 높이에서 잰 협곡 너비(약 ${cNums.widthM}m)도 실제보다 넓게 나옵니다.`,
    },
    valley: {
      points: vPoints, marks: valleyMarks(vPoints), from: 'C 금학산', to: 'D 동쪽',
      short: `금학산 꼭대기에서 용암대지와 한탄강 협곡을 건너 동쪽 끝까지 잰 높이입니다(약 ${vNums.lengthKm.toFixed(1)}km). 산지 사이 바닥을 용암이 메운 평평한 땅과 그 가장자리의 좁고 깊은 협곡이 보입니다.`,
      note: `서쪽 금학산 꼭대기에서 남동쪽 산기슭으로 내려와, 용암대지를 지나 한탄강 협곡과 동쪽 언덕을 건너 창의 동쪽 끝까지 꺾은 선으로 잰 높이입니다(약 ${vNums.lengthKm.toFixed(1)}km). 산지 사이 골짜기 바닥을 용암이 메워 평평해진 땅(이 선에서 약 ${vNums.plateauKm.toFixed(1)}km, 높이 약 ${vNums.plateauZ}m)과, 그 가장자리를 따라 좁고 깊게 파인 협곡(강바닥 약 ${vNums.floorZ}m)이 함께 보입니다.`,
    },
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
  const tC = { value: splatTex(stage.splatC, N) }, uCliff = { value: 1 }, uPlat = { value: 0 }, uK = { value: 2 };
  // 넷째 판: 강을 따라 잰 거리를 240m 주기 각도의 cos, sin으로(칸 사이를 매끈하게 이어 붙이려고), 파랑은 돌무더기
  const dData = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) {
    const a = sim.along[k] >= 0 ? (sim.along[k] / 240) * Math.PI * 2 : 0, on = sim.along[k] >= 0 ? 1 : 0;
    dData[k * 4] = Math.round(127.5 + 127.5 * Math.cos(a) * on); dData[k * 4 + 1] = Math.round(127.5 + 127.5 * Math.sin(a) * on);
    dData[k * 4 + 2] = Math.round(sim.talus[k] * 255); dData[k * 4 + 3] = 255;
  }
  const tD = { value: splatTex(dData, N) };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const shared = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    shared(sh, r);
    sh.uniforms.tC = tC; sh.uniforms.tD = tD; sh.uniforms.uCliff = uCliff; sh.uniforms.uPlat = uPlat; sh.uniforms.uK = uK;
    // 기둥의 두 면이 빛을 다르게 받도록 법선을 벽을 따라 조금 기울인다.
    const NORMAL_END = 'normal=normalize(normal+(viewMatrix*vec4(d.x,0.,-d.y,0.)).xyz);';
    sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D tA', 'uniform sampler2D tC, tD;\nuniform float uCliff, uPlat, uK;\nuniform sampler2D tA').replace('// 물길: 얕은 물은', CLIFF_GLSL + '// 물길: 얕은 물은')
      .replace(NORMAL_END, NORMAL_END + '\n  normal=normalize(normal+(viewMatrix*vec4(colT*colTilt,0.)).xyz);')
      // 이 화면의 강물은 거칠게 해 해 반사가 하얗게 번지지 않게 한다.
      .replace('terrainRough=mix(terrainRough,.42,wtr);', 'terrainRough=mix(terrainRough,.78,wtr);');
    if (!sh.fragmentShader.includes('terrainRough,.78,wtr')) console.error('물 거칠기 자리를 찾지 못함');
    if (!sh.fragmentShader.includes('colT*colTilt')) console.error('주상절리 법선 자리를 찾지 못함');
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
    treeMesh.visible = nearMesh.visible = currentView !== 'cliff';
    buildings.place(scale.factor);
    roads.place(scale.factor);
    renderer.shadowMap.needsUpdate = true;
  };

  // 시점. from과 to는 격자 칸 [가로, 세로]이고, 카메라 높이는 바라보는 자리 땅 위 lift(m)다.
  function setView(name) {
    const v = VIEWS[name];
    currentView = name;
    // 절벽 앞 시점은 동쪽 언덕 바로 앞이라, 세로 화면에서 카메라를 너무 많이 빼면 언덕 뒤로 숨는다. 2배까지만 뺀다.
    const z = name === 'cliff' ? Math.min(2, portraitZoom() * (PHONE ? 1.35 : 1)) : portraitZoom() * (PHONE ? 1.35 : 1);
    const a = world(...v.from), b = world(...v.to), by = groundAt(...v.to), ay = by + v.lift * (name === 'cliff' || name === 'canyon' ? scale.factor / 2 + 0.5 : 1);
    camera.position.set(b.x + (a.x - b.x) * z, by + (ay - by) * z, b.z + (a.z - b.z) * z);
    controls.target.set(b.x, by, b.z);
    controls.update();
    invalidate();
    document.querySelectorAll('[data-view]').forEach(o => o.classList.toggle('on', o.dataset.view === name));
    // 절벽 앞에서는 가까운 나무가 벽을 가리고 각진 덩어리로 보이므로 나무를 숨긴다(땅의 숲 색은 남는다).
    if (treeMesh) { treeMesh.visible = nearMesh.visible = name !== 'cliff'; renderer.shadowMap.needsUpdate = true; }
  }

  let cliffOn = true, platOn = false;
  // 지도 위에: 용암대지 어림(주황 칸), 절벽 어림(검은 칸), 단면 선(A에서 B, C에서 D), 곳 이름
  const layer = (test, rgba) => {
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let k = 0; k < N * N; k++) if (test(k)) img.data.set(rgba, k * 4);
    g.putImageData(img, 0, 0);
    return c;
  };
  const platLayer = layer(k => sim.plateau[k], [224, 120, 42, 110]);
  const cliffLayer = layer(k => sim.cliff[k] >= 0.5, [30, 28, 26, 230]);
  const drawLine = (ctx, pts, color, dash, A, B, { ox, oy, sc }, below = false) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = color;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    // 협곡 단면의 A, B는 선 아래에 써서 위쪽의 순담계곡 이름과 겹치지 않게 한다.
    const a = pts[0], b = pts.at(-1), dy = below ? 22 : -10;
    ctx.strokeText(A, ox + a.x * sc - 6, oy + a.y * sc + dy); ctx.fillText(A, ox + a.x * sc - 6, oy + a.y * sc + dy);
    ctx.strokeText(B, ox + b.x * sc - 14, oy + b.y * sc + dy); ctx.fillText(B, ox + b.x * sc - 14, oy + b.y * sc + dy);
  };
  const mapOverlay = (ctx, box) => {
    const { ox, oy, sc } = box;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (platOn) ctx.drawImage(platLayer, ox, oy, N * sc, N * sc);
    if (cliffOn) ctx.drawImage(cliffLayer, ox, oy, N * sc, N * sc);
    drawLine(ctx, vPoints, '#6a3fa0', [4, 4], 'C', 'D', box);
    drawLine(ctx, cPoints, '#b3261e', [7, 5], 'A', 'B', box, true);
    // 휴대폰처럼 지도가 작으면 이름을 줄여 글자가 겹치지 않게 한다.
    const small = N * sc < 460;
    ctx.font = `700 ${small ? 11 : 13}px "Malgun Gothic",sans-serif`;
    for (const key of small ? MAP_KEYS_SMALL : MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, w = ctx.measureText(l.name).width;
      let tx = x + 7, ty = y + 5;
      // 이름은 점 오른쪽에 쓰고, 오른쪽 끝에 닿으면 왼쪽에 쓴다. 한탄강은 물길과 겹치지 않게 왼쪽에 쓴다.
      if (tx + w > ox + (N - 1) * sc - 4) tx = x - w - 7;
      if (key === 'hantan') tx = x - w - 8;
      ctx.fillStyle = l.kind === 'peak' ? '#7a2e12' : '#20302a';
      ctx.beginPath();
      if (l.kind === 'peak') { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); } else ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      // 검은 절벽 칸 위에서도 읽히게 이름 뒤에 흰 바탕을 깐다.
      const fs = small ? 11 : 13;
      ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fillRect(tx - 2, ty - fs, w + 4, fs + 4);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(l.name, tx, ty);
      ctx.fillStyle = l.kind === 'river' ? '#1d5f9e' : '#20302a'; ctx.fillText(l.name, tx, ty);
    }
    ctx.restore();
  };

  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const legend = () => [platOn ? '주황 칸: 땅 모양으로 어림한 용암대지' : '', cliffOn ? '검은 칸: 기울기로 어림한 협곡 절벽' : '', '붉은 점선: 협곡 단면(A에서 B)', '보라 점선: 골짜기 단면(C에서 D)', '세모: 산, 점: 명소와 읍'].filter(Boolean).join('. ');
  const drawMapView = () => {
    const prof = showing === 'canyon' || showing === 'valley';
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = prof ? '' : legend();
    mapNote.style.display = prof ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 20 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 100, hi: 260, north: true, overlay: mapOverlay, water: stage.water });
    if (prof) drawSection(mapView, sections[showing]);
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
  drawSchematic(schemEl, sim, cNums);
  addEventListener('themechange', () => drawSchematic(schemEl, sim, cNums));
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  const CLS = { guess: 'guess', town: 'small', peak: 'small', spot: '', river: '' };
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
    uK.value = k;
    applyHeight();
    setView(currentView);
    document.querySelectorAll('[data-height]').forEach(b => b.classList.toggle('on', +b.dataset.height === k));
    document.getElementById('heightBadge').textContent = k === 1 ? '실제 높이' : `높이 ${k}배`;
    document.getElementById('heightNote').textContent = k === 1
      ? '실제 높이 그대로입니다. 끌어서 돌리고 휠로 확대합니다.'
      : `높이를 ${k}배로 과장했습니다(300m보다 높은 산은 덜 키움). 끌어서 돌리고 휠로 확대합니다.`;
    drawMapView();
    placeLabels();
  }
  const guessNote = document.getElementById('guessNote');
  // 왼쪽 아래 범례는 켜 둔 것만 보인다.
  const showLegend = () => { guessNote.hidden = !cliffOn && !platOn; document.getElementById('gCliff').hidden = !cliffOn; document.getElementById('gPlat').hidden = !platOn; };
  const setCliff = on => { cliffOn = on; uCliff.value = on ? 1 : 0; document.getElementById('cliffBtn').classList.toggle('on', on); showLegend(); drawMapView(); placeLabels(); invalidate(); };
  const setPlateau = on => { platOn = on; uPlat.value = on ? 1 : 0; document.getElementById('plateauBtn').classList.toggle('on', on); showLegend(); drawMapView(); placeLabels(); invalidate(); };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('cliffBtn').onclick = () => setCliff(!cliffOn);
  document.getElementById('plateauBtn').onclick = () => setPlateau(!platOn);
  document.getElementById('roadsBtn').onclick = e => { e.currentTarget.classList.toggle('on', roads.toggle()); invalidate(); };
  document.getElementById('buildingsBtn').onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };

  setView(currentView);
  setHeight(2);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  showLegend();
  fitView();
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = {
    setView, setHeight, setSchematic, setCliff, setPlateau, stats: sim.stats,
    profile: { ...cNums, lengthKm: +cNums.lengthKm.toFixed(2), marks: sections.canyon.marks.map(m => m.text) },
    valley: { ...vNums, lengthKm: +vNums.lengthKm.toFixed(2), plateauKm: +vNums.plateauKm.toFixed(2), marks: sections.valley.marks.map(m => m.text) },
    buildings: buildings.info, roads: () => roads.info(),
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '강원도 철원 동송읍과 갈말읍 사이, 한탄강 협곡 일대(가로세로 약 11km)입니다. 서쪽의 넓고 평평한 들(철원 평야)은 옛 골짜기를 용암이 메워 생긴 용암대지입니다. 북쪽 평강 쪽에서 길게 갈라진 틈으로 흘러나온 아주 묽은 현무암질 용암이 골짜기를 따라 흘러와 낮은 곳부터 채웠고, 이런 분출이 여러 번 되풀이되어 윗면이 평평해졌습니다. 그 뒤 한탄강이 용암과 옛 땅의 경계를 따라 아래로 깎아 내려가 좁고 깊은 협곡을 팠습니다. 협곡 벽은 현무암 절벽입니다. 협곡 동쪽에도 용암대지가 이어지는 곳이 있지만, 이 창의 동쪽은 대부분 용암에 덮이지 않은 기반암 언덕과 산지입니다. 평평한 용암대지 위는 오늘날 대부분 논입니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '한탄강과 대교천 물길, 명소, 읍, 산 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '출처: 『이미지로 이해하는 지형학』 2판.', '절벽과 용암대지 범위는 땅 모양으로 어림한 것이고, 논과 숲 색은 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
