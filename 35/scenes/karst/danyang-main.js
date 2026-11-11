// © 2026 김용현
// 단양 석회 동굴과 도담삼봉 실제 지형 화면. 땅 높이만 실제 자료이고, 남한강 물 넓이와 물길, 동굴 입구, 도담삼봉 바위와 석문, 마을과 산 이름 자리는 지도 자료에서 옮겼다.
// 고도 자료는 오늘날의 땅 높이뿐이라 동굴 속 길과 크기를 모른다. 동굴은 입구 자리만 주황 점선 고리로 찍고, 땅속 모습은 오른쪽 모식도의 예시 그림으로만 보인다.
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
import { buildDanyang, sampleH, crossProfile, profileMarks, profileNumbers, placesOf, dodamRocks, quarryCenter, CAVES, ROCKS, QUARRY, N, SIZE, CELL, WATER_LEVEL } from './danyang-sim.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
// 산지라 모든 높이를 같은 배율로 키운다.
const scale = createHeightScale(2, 5000);
const ex = scale.apply;
let currentView = 'oblique';

const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };

const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
  mount: document.getElementById('stage'),
  size: SIZE,
  fogDensity: 0.00004 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});
controls.maxDistance = 17000;
controls.minDistance = 40;

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
const CAVE_KEYS = { 고수동굴: 'gosu', 천동동굴: 'cheondong', 노동동굴: 'nodong' };

// 동굴 입구 자리의 점선 고리: 조각 14개로 끊어 그린다. 땅 위에 납작하게 눕힌다.
function dashedRing(radius, width, color) {
  const group = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
  const parts = 14, arc = (Math.PI * 2) / parts;
  for (let n = 0; n < parts; n++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(radius - width / 2, radius + width / 2, 8, 1, n * arc, arc * 0.55), mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    group.add(m);
  }
  return group;
}

// 단면: 땅은 갈색, 물 면은 파란 줄. 물 아래와 땅속은 자료가 없으므로 물 아래는 빗금, 동굴 입구는 주황 점과 물음표로 둔다.
function drawProfile(canvas, { points, marks, from, to, note, caveAt }) {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d'), W = r.width, H = r.height;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  // 바탕과 글자 색은 라이트, 다크 모드를 따른다. 이름 색도 밝은 바탕에서 읽히게 바꾼다.
  const P = figPalette(), dark = isDark();
  const tone = c => (dark ? c : ({ '#f3e3b0': P.ink, '#ffb36b': '#c4570f', '#9fd3ff': '#0b6fb8', '#e8e6dd': P.ink })[c] ?? c);
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const pad = W < 520 ? 42 : 64, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points.at(-1).m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  const min = Math.floor(Math.min(...points.map(p => p.z)) / 100) * 100 - 50, max = Math.ceil(Math.max(...points.map(p => p.z)) / 100) * 100 + 100;
  let lines = wrapText(ctx, note, W - pad - side);
  const foot = (lines.length + 1) * noteGap + 34;
  const xScale = usableW / lengthM, yScale = (H - foot - 70) / (max - min);
  const ve = yScale / xScale;
  lines = [...lines, ve < 1.5 ? '가로와 세로를 거의 같은 비율로 그렸습니다.' : `세로를 약 ${Math.round(ve)}배 과장해 그렸습니다.`];
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = P.grid; ctx.fillStyle = P.sub; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max; z += 50) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); if (z % 100 === 0) ctx.fillText(`${z}m`, pad - 4, y(z) + 4); }
  ctx.textAlign = 'center';
  for (let km = 0; km <= lengthM / 1000 + 1e-6; km += 0.5) ctx.fillText(`${km}km`, x(km * 1000), H - foot + 15);
  // 땅
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = '#6f6a58'; ctx.fill();
  // 물 구간: 물 면 아래를 어두운 빗금으로 덮어 깊이를 모른다는 것을 보인다.
  const runs = [];
  points.forEach((p, n) => { if (p.kind !== 'water') return; if (!runs.length || runs.at(-1)[1] !== n - 1) runs.push([n, n]); else runs.at(-1)[1] = n; });
  for (const [a, b] of runs) {
    const x0 = x(points[a].m), x1 = x(points[b].m), top = y(points[a].z), bot = y(min);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
    ctx.fillStyle = '#2a3a44'; ctx.fillRect(x0, top, x1 - x0, bot - top);
    ctx.strokeStyle = 'rgba(159,211,255,.35)'; ctx.lineWidth = 1;
    for (let s = x0 - (bot - top); s < x1; s += 8) { ctx.beginPath(); ctx.moveTo(s, bot); ctx.lineTo(s + (bot - top), top); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#4aa8ee'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.stroke();
  }
  // 동굴 입구: 주황 점. 땅속은 자료가 없어 물음표만 둔다.
  if (caveAt != null) {
    const p = points[caveAt], cx = x(p.m), cy = y(p.z);
    ctx.fillStyle = tone('#ffb36b'); ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = tone('#ffb36b'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 46); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `700 ${W < 520 ? 12 : 14}px "Malgun Gothic",sans-serif`; ctx.fillStyle = tone('#ffb36b');
    ctx.lineWidth = 3.5; ctx.strokeStyle = P.bg; ctx.strokeText('땅속 길은 모름 ?', cx, cy + 62);
    ctx.fillText('땅속 길은 모름 ?', cx, cy + 62);
  }
  ctx.font = `700 ${W < 520 ? 12 : 15}px "Malgun Gothic",sans-serif`;
  const used = [];
  for (const k of marks) {
    const p = points[k.at], w = ctx.measureText(k.text).width, tx = Math.min(W - 4 - w / 2, Math.max(pad + w / 2, x(p.m)));
    let ty = y(p.z) - 30;
    while (used.some(u => Math.abs(u.x - tx) < (u.w + w) / 2 + 6 && Math.abs(u.y - ty) < 18)) ty -= 18;
    used.push({ x: tx, y: ty, w });
    const kc = tone(k.color);
    ctx.strokeStyle = kc; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(p.m), ty + 5); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = P.bg; ctx.strokeText(k.text, tx, ty);
    ctx.fillStyle = kc; ctx.fillText(k.text, tx, ty);
  }
  ctx.fillStyle = P.ink; ctx.font = '700 16px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 26);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 26);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  lines.forEach((t, n) => ctx.fillText(t, pad > 42 ? pad : 8, H - foot + 36 + n * noteGap));
}

// 오른쪽 모식도: 석회 동굴 단면 예시와 석문이 생기는 차례. 실제 단양 동굴을 잰 그림이 아니다.
function caveSvg() {
  const P = figPalette(), dark = isDark(), orange = dark ? '#ffcf9a' : '#b4500c', blue = dark ? '#9fd3ff' : '#0b6fb8', red = dark ? '#e7a07f' : '#8e3b1d';
  const drip = (x, top, len, w = 7) => `<path d="M${x - w} ${top}L${x + w} ${top}L${x} ${top + len}Z" fill="#e9dfc6"/>`;
  const mound = (x, bot, len, w = 9) => `<path d="M${x - w} ${bot}L${x + w} ${bot}L${x} ${bot - len}Z" fill="#e9dfc6"/>`;
  const label = (x, y, t, c = P.ink, a = 'middle') => `<text x="${x}" y="${y}" fill="${c}" font-size="14" font-weight="700" text-anchor="${a}" stroke="${P.bg}" stroke-width="3" paint-order="stroke">${t}</text>`;
  const lead = (x0, y0, x1, y1, c = P.ink) => `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${c}" stroke-width="1.3"/>`;
  let beds = '';
  for (let yy = 90; yy < 320; yy += 26) beds += `<line x1="0" y1="${yy}" x2="560" y2="${yy + 6}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>`;
  let joints = '';
  for (const [jx, y0, y1] of [[70, 70, 150], [190, 66, 128], [330, 64, 126], [470, 70, 160], [520, 150, 300]]) joints += `<line x1="${jx}" y1="${y0}" x2="${jx + 6}" y2="${y1}" stroke="rgba(0,0,0,.35)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 560 340" role="img" aria-label="석회 동굴 단면 예시">
  <rect x="0" y="0" width="560" height="340" fill="${P.bg}"/>
  <path d="M0 58 C80 50 120 62 170 66 C230 70 260 92 300 92 C340 92 360 64 420 62 C480 60 520 66 560 64 L560 340 L0 340Z" fill="#a9a48f"/>
  <path d="M0 58 C80 50 120 62 170 66 C230 70 260 92 300 92 C340 92 360 64 420 62 C480 60 520 66 560 64 L560 72 C520 74 480 68 420 70 C360 72 340 100 300 100 C260 100 230 78 170 74 C120 70 80 58 0 66Z" fill="#9b4a2c"/>
  ${beds}${joints}
  <path d="M20 150 C20 140 40 132 60 134 L60 160 L20 168Z" fill="#141a17"/>
  <path d="M60 134 C140 120 260 118 380 128 C450 134 500 150 510 182 C515 206 490 226 440 230 C330 238 200 236 120 228 C70 222 50 196 60 160Z" fill="#141a17"/>
  ${drip(150, 124, 30)}${drip(178, 122, 22, 5)}${drip(300, 120, 26)}${drip(420, 132, 34)}${drip(450, 138, 18, 5)}
  ${mound(140, 227, 22)}${mound(310, 233, 30, 11)}${mound(462, 229, 16, 7)}
  <path d="M232 121 L246 121 L244 172 L250 233 L226 233 L234 172Z" fill="#e9dfc6"/>
  <path d="M0 290 L560 290" stroke="#6fbaf0" stroke-width="2" stroke-dasharray="8 6"/>
  <path d="M90 300 C200 292 330 294 470 300 C480 312 460 322 420 324 C300 328 180 326 110 320 C90 316 84 308 90 300Z" fill="#2f5f82" opacity=".9"/>
  ${label(36, 120, '동굴 입구', orange, 'start')}${lead(40, 124, 40, 140, orange)}
  ${label(110, 104, '종유석')}${lead(130, 108, 148, 138)}
  ${label(270, 112, '석주')}${lead(258, 116, 244, 140)}
  ${label(300, 262, '석순')}${lead(310, 248, 310, 214)}
  ${label(548, 284, '지하수면', blue, 'end')}
  ${label(280, 318, '지금 물이 찬 아래쪽 통로', dark ? '#d6ecff' : P.ink)}
  ${label(548, 50, '테라로사', red, 'end')}${lead(520, 54, 512, 66, red)}
  ${label(548, 112, '절리', P.ink, 'end')}${lead(522, 108, 476, 100)}
  ${label(14, 30, '예시 그림입니다. 크기와 모양은 실제와 다르고, 높이를 과장했습니다.', P.sub, 'start')}
</svg>`;
}
function archSvg() {
  const P = figPalette();
  const panel = (ox, t, roof, collapsed) => {
    const water = `<rect x="${ox}" y="128" width="170" height="22" fill="#2f5f82"/>`;
    const rock = collapsed === 2
      ? `<path d="M${ox} 128 L${ox} 30 L${ox + 40} 26 L${ox + 40} 128Z M${ox + 120} 128 L${ox + 120} 34 L${ox + 170} 30 L${ox + 170} 128Z M${ox + 36} 40 C${ox + 70} 30 ${ox + 100} 32 ${ox + 124} 44 L${ox + 124} 66 C${ox + 100} 56 ${ox + 70} 56 ${ox + 36} 66Z" fill="#a9a48f"/>`
      : `<path d="M${ox} 128 L${ox} 30 C${ox + 60} 22 ${ox + 110} 22 ${ox + 170} 30 L${ox + 170} 128Z" fill="#a9a48f"/>`;
    const hole = collapsed === 0
      ? `<path d="M${ox + 40} 120 C${ox + 40} 70 ${ox + 130} 70 ${ox + 130} 120Z" fill="#141a17"/>`
      : collapsed === 1
        ? `<path d="M${ox + 40} 120 C${ox + 40} 70 ${ox + 130} 70 ${ox + 130} 120Z" fill="#141a17"/><path d="M${ox + 50} 30 L${ox + 60} 58 L${ox + 75} 40 L${ox + 90} 62 L${ox + 105} 38 L${ox + 115} 30Z" fill="#23302a"/><path d="M${ox + 60} 120 l10 -8 l12 8Z M${ox + 92} 120 l8 -6 l10 6Z" fill="#8d8874"/>`
        : '';
    return `${rock}${hole}${water}<text x="${ox + 85}" y="${roof}" fill="${P.ink}" font-size="13" font-weight="700" text-anchor="middle">${t}</text>`;
  };
  return `<svg viewBox="0 0 560 190" role="img" aria-label="석문이 생기는 차례 예시">
  <rect x="0" y="0" width="560" height="190" fill="${P.bg}"/>
  ${panel(10, '1 강가 석회암 속 동굴', 172, 0)}${panel(195, '2 천장 일부가 무너짐', 172, 1)}${panel(380, '3 남은 천장이 돌문으로', 172, 2)}
  <text x="12" y="16" fill="${P.sub}" font-size="12">예시 그림입니다. 석문이 이렇게 생겼다고 보는 설명을 단순하게 그렸습니다.</text>
</svg>`;
}
function buildSchematic(el) {
  el.innerHTML = `<h2>석회 동굴 단면 (예시)</h2>
  <figure>${caveSvg()}</figure>
  <p class="schem-note">이산화 탄소가 녹은 빗물과 지하수가 석회암의 틈(절리)을 따라 낮은 곳의 출구(하천) 쪽으로 흐르며 석회암을 녹여(용식) 동굴이 생깁니다. 동굴은 지하수면 근처에서 잘 넓어집니다. 하천이 바닥을 깎아 지하수면이 낮아지고 동굴에서 물이 빠지면, 천장에서 스며 나온 물방울이 동굴 공기 속으로 이산화 탄소를 내보내면서 녹아 있던 탄산 칼슘이 다시 굳습니다. 그래서 천장에는 종유석이, 바닥에는 석순이 자라고, 둘이 만나면 석주가 됩니다.</p>
  <p class="schem-cap">왼쪽 3D 화면의 주황 점선 고리는 이런 동굴의 입구 자리입니다. 땅속 길은 고도 자료로 알 수 없어 3D 화면에는 그리지 않았습니다.</p>
  <h2>석문이 생기는 차례 (예시)</h2>
  <figure>${archSvg()}</figure>
  <p class="schem-note">도담삼봉 가까운 강가의 석문은 석회 동굴이 무너지고 남은 천장 일부가 구름다리처럼 남은 것으로 여겨지는 돌문입니다. 이렇게 석회암 땅에 생긴 돌다리 모양 지형을 카르스트 자연교라고 합니다.</p>
  <p class="schem-cap">형성 과정은 추정이며, 그림의 크기와 모양은 실제와 다릅니다.</p>`;
}

async function start() {
  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/danyang-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildDanyang(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/danyang-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest);
  const roadData = await (await fetch(new URL('./data/danyang-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim), rocks = dodamRocks(), line = crossProfile(sim), nums = profileNumbers(line), quarry = quarryCenter(sim);

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
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);

  // 남한강 물 면: 물 칸만 덮는다.
  const waterGeo = new THREE.BufferGeometry(), waterIdx = [], waterPos = new Float32Array(N * N * 3);
  for (let k = 0; k < N * N; k++) { waterPos[k * 3] = pos[k * 3]; waterPos[k * 3 + 2] = pos[k * 3 + 2]; }
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, e = c + 1;
    if (sim.river[a] || sim.river[b] || sim.river[c] || sim.river[e]) waterIdx.push(a, c, b, b, c, e);
  }
  waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
  waterGeo.setIndex(waterIdx);
  waterGeo.computeVertexNormals();
  const waterMesh = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x3a7685, roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.93 }));
  waterMesh.receiveShadow = true;
  waterMesh.frustumCulled = false;
  scene.add(waterMesh);

  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain, waterMesh], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  // 물 칸 위는 물 면 높이, 그 밖은 고도 자료 그대로. 건물, 도로, 이름표가 이 높이에 얹힌다.
  const top = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) top[k] = sim.river[k] ? sim.surface[k] : sim.show[k];
  const groundAt = (i, j) => ex(sampleH(top, i, j));
  const surfaceAt = (i, j) => ex(sampleH(sim.riverLv, i, j));
  const toWorld = (i, j) => { const w = world(i, j); return [w.x, w.z]; };
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld, groundAt, cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld, groundAt });

  // 도담삼봉 세 바위: OSM 바위 윤곽 자리와 넓이에 맞춘 회색 석회암 봉우리. 높이는 예시다.
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9c9a90, roughness: 0.95, flatShading: true });
  const rockGroup = new THREE.Group();
  scene.add(rockGroup);
  const rockMeshes = rocks.map((r, n) => {
    // 꼭대기가 뭉툭한 낮은 바위로 세운다(뾰족한 탑 모양이 아니다).
    const g = new THREE.CylinderGeometry(r.radiusM * 0.5, r.radiusM, 1, 8, 2);
    g.translate(0, 0.5, 0);
    // 꼭짓점을 조금씩 흔들어 바위처럼 울퉁불퉁하게 한다(늘 같은 모양).
    const p = g.attributes.position;
    for (let q = 0; q < p.count; q++) { const s = Math.sin(q * 12.9898 + n * 78.233) * 0.5 + 0.5; p.setX(q, p.getX(q) * (0.82 + 0.3 * s)); p.setZ(q, p.getZ(q) * (0.82 + 0.3 * (1 - s))); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, rockMat);
    m.castShadow = m.receiveShadow = true;
    rockGroup.add(m);
    return { r, m };
  });
  const placeRocks = () => {
    for (const { r, m } of rockMeshes) {
      const w = world(...r.grid), base = surfaceAt(...r.grid) - 3;
      m.position.set(w.x, base, w.z);
      m.scale.set(1, ex(r.heightM) + 3, 1);
    }
  };

  // 동굴 입구: 땅 위 주황 점선 고리와 어두운 점. 고리 반지름 약 90m(화면에서 보이게 키운 표시)이고 입구 크기가 아니다.
  const caveMarks = new THREE.Group();
  scene.add(caveMarks);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x15110d, depthWrite: false, transparent: true, opacity: 0.9 });
  const marks = Object.entries(CAVES).map(([name, [i, j]]) => {
    const g = new THREE.Group();
    g.add(dashedRing(90, 12, 0xffb36b));
    const hole = new THREE.Mesh(new THREE.CircleGeometry(16, 20), holeMat);
    hole.rotation.x = -Math.PI / 2; hole.renderOrder = 3;
    g.add(hole);
    caveMarks.add(g);
    return { name, grid: [i, j], g };
  });
  const placeCaves = () => { for (const { grid, g } of marks) { const w = world(...grid); g.position.set(w.x, groundAt(...grid) + 2.5, w.z); } };

  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
  const applyHeight = () => {
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(sim.show[k]);
    for (let k = 0; k < N * N; k++) waterPos[k * 3 + 1] = ex(sim.riverLv[k]) + 0.3;
    fillNormals(N, CELL, k => pos[k * 3 + 1], nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    waterGeo.attributes.position.needsUpdate = true;
    if (treeMesh) scene.remove(treeMesh);
    if (nearMesh) scene.remove(nearMesh);
    const key = scale.factor;
    treeMesh = treeCache[key] ??= buildTrees(veg, stage, sim.mountain);
    nearMesh = nearCache[key] ??= buildNearTrees(veg, stage, sim.mountain);
    scene.add(treeMesh, nearMesh);
    buildings.place(scale.factor);
    roads.place(scale.factor);
    placeRocks();
    placeCaves();
    renderer.shadowMap.needsUpdate = true;
  };

  // 시점. p와 t는 [가로, 높이, 세로](m). from과 to는 격자 칸 [가로, 세로]이고, 높이는 그 자리 땅 위 lift(m)다.
  const VIEWS = {
    // 남쪽 높은 하늘에서 북쪽을 본다. 남한강 굽이와 단양읍, 도담삼봉 쪽, 동쪽 산의 동굴 입구가 한눈에 들어온다.
    oblique: { p: [-1300, 8200, 8800], t: [-1000, 250, 200] },
    above: { p: [0, 12000, 700], t: [0, 0, 0] },
    // 남동쪽 강 위에서 북서쪽으로 도담삼봉과 석문을 가까이 본다.
    dodam: { from: [108, 168], lift: 380, to: [50, 106] },
    // 남한강 건너 서남서쪽 하늘에서 고수동굴 입구와 그 뒷산을 본다.
    gosu: { from: [140, 300], lift: 650, to: [262, 190] },
  };
  function setView(name) {
    const v = VIEWS[name];
    currentView = name;
    const z = portraitZoom() * (PHONE ? 1.35 : 1);
    if (v.from) {
      const a = world(...v.from), b = world(...v.to), ay = groundAt(...v.from) + v.lift, by = groundAt(...v.to);
      camera.position.set(b.x + (a.x - b.x) * z, by + (ay - by) * z, b.z + (a.z - b.z) * z);
      controls.target.set(b.x, by, b.z);
    } else {
      const ty = ex(v.t[1]), py = ty + (v.p[1] - v.t[1]);
      camera.position.set(v.t[0] + (v.p[0] - v.t[0]) * z, ty + (py - ty) * z, v.t[2] + (v.p[2] - v.t[2]) * z);
      controls.target.set(v.t[0], ty, v.t[2]);
    }
    controls.update();
    invalidate();
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
  }

  // 지도 위에 그리는 것: 동굴 입구(주황 점선 고리), 도담삼봉 바위, 석문, 단면을 잰 A-B 선, 곳 이름, 창 북쪽 끝의 석회석 광산
  const MAP_KEYS = ['gosu', 'cheondong', 'nodong', 'dodam', 'seokmun', 'river', 'town', 'station', 'yangbang', 'bongudeung', 'silgeum', 'muje', 'daeseong', 'quarry'];
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    ctx.fillStyle = '#5d5a50';
    for (const poly of ROCKS) { ctx.beginPath(); poly.forEach(([i, j], n) => (n ? ctx.lineTo(ox + i * sc, oy + j * sc) : ctx.moveTo(ox + i * sc, oy + j * sc))); ctx.closePath(); ctx.fill(); }
    ctx.lineWidth = 2.4; ctx.setLineDash([4, 3]); ctx.strokeStyle = '#c4570f';
    for (const { grid } of marks) { ctx.beginPath(); ctx.arc(ox + grid[0] * sc, oy + grid[1] * sc, Math.max(7, 90 / CELL * sc), 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    line.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = line[0], B = line.at(-1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc + 8, oy + A.y * sc + 22); ctx.fillText('A', ox + A.x * sc + 8, oy + A.y * sc + 22);
    ctx.strokeText('B', ox + B.x * sc + 8, oy + B.y * sc - 4); ctx.fillText('B', ox + B.x * sc + 8, oy + B.y * sc - 4);
    // 석회석 광산(OSM 윤곽): 창 북쪽 끝에 걸친 부분만 갈색 빗금으로 칠한다. 윤곽은 창 바깥 북쪽(매포읍)으로 이어진다.
    {
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, oy, N * sc, N * sc); ctx.clip();
      ctx.beginPath(); QUARRY[0].forEach(([i, j], n) => (n ? ctx.lineTo(ox + i * sc, oy + j * sc) : ctx.moveTo(ox + i * sc, oy + j * sc))); ctx.closePath();
      ctx.fillStyle = 'rgba(122,74,34,.28)'; ctx.fill(); ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    for (const key of MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, text = l.name, w = ctx.measureText(text).width;
      const dot = (l.village || l.peak || l.cave || key === 'seokmun') && key !== 'quarry';
      let tx = dot ? x + 9 : key === 'dodam' ? x + 12 : x - w / 2;
      // 광산 이름은 지도 왼쪽 위 등고선 간격 글과 겹치지 않게 광산 칸 아래에 쓴다.
      const nearRight = dot && l.grid[0] > N * 0.8;
      // 오른쪽 끝 가까운 곳은 모식도 접기 탭에 가리지 않게 점 왼쪽 위에 쓴다.
      const ty = key === 'seokmun' ? y - 4 : key === 'quarry' ? y + 34 : nearRight ? y - 12 : y + 5;
      // 오른쪽 끝 가까운 곳(모식도 접기 탭 쪽)은 점 왼쪽에 쓴다.
      if (tx + w > ox + N * sc - 4 || nearRight) tx = x - w - 9;
      if (dot) {
        ctx.fillStyle = l.peak ? '#7a2e12' : l.cave ? '#c4570f' : '#20302a';
        ctx.beginPath();
        if (l.peak) { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); } else ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(text, tx, ty);
      ctx.fillStyle = key === 'river' ? '#0b4f8a' : l.cave ? '#9a3f08' : key === 'quarry' ? '#5b3a1e' : '#20302a'; ctx.fillText(text, tx, ty);
    }
    ctx.restore();
  };

  const round10 = v => Math.round(v / 10) * 10;
  const PROFILE_NOTE = `양방산 꼭대기(A)에서 고수동굴 입구를 지나는 곧은 줄로 북쪽으로 가 남한강을 건너 건너편 강가(B)까지 잰 높이입니다(약 ${nums.lengthKm.toFixed(1)}km). 높이는 고도 자료에서 잰 값입니다. 양방산은 약 ${round10(nums.peak)}m, 고수동굴 입구는 약 ${round10(nums.cave)}m이고, 입구 북쪽으로 약 ${round10(nums.ridge)}m의 산등성이를 넘으면 남한강 물 면(약 ${Math.round(nums.water)}m)이 나옵니다. 고수동굴 입구는 이 물 면보다 약 ${round10(nums.caveAbove)}m 높습니다. 땅속 동굴의 길과 깊이는 자료가 없어 그리지 않았고, 파란 줄 아래 빗금은 물속 깊이를 자료로 알 수 없는 구간입니다.`;
  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : '주황 점선 고리: 동굴 입구 자리(OSM). 회색 조각: 도담삼봉 바위 윤곽. 붉은 점선: 단면을 잰 길(A 양방산에서 B 남한강 건너편까지). 세모: 산봉우리. 위 끝 갈색 칸: 창 북쪽 끝에서 바깥으로 이어지는 석회석 광산(OSM)';
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 20 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 110, hi: 900, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawProfile(mapView, { points: line, marks: profileMarks(line), from: 'A 양방산', to: 'B 남한강 건너편', note: PROFILE_NOTE, caveAt: nums.caveAt });
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
  buildSchematic(schemEl);
  // 라이트, 다크 모드가 바뀌면 모식도 그림을 새 색으로 다시 그린다(단면 그림은 함께 오는 resize로 다시 그린다).
  addEventListener('themechange', () => buildSchematic(schemEl));
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name, l.sub, l.cave ? 'cave' : l.village || l.peak ? 'small' : '');
  const v3 = new THREE.Vector3();
  // 중요도 4 이상은 늘 보이고, 나머지는 겹치면 숨긴다. 가까이 보기에서 화면 끝에 몰리거나 너무 먼 이름표는 뺀다.
  const HIDE = {
    oblique: [],
    above: [],
    dodam: ['cheondong', 'nodong', 'gosu', 'bongudeung', 'silgeum', 'yangbang', 'station', 'daeseong', 'town'],
    gosu: ['nodong', 'station', 'muje', 'silgeum', 'dodam', 'seokmun', 'town'],
  };
  const KEY = { gosu: 5, dodam: 5, river: 4, cheondong: 4, nodong: 4, seokmun: 4, town: 3, quarry: 2, yangbang: 3, bongudeung: 2, silgeum: 2, muje: 1, daeseong: 1, station: 1 };
  const labelWidth = {};
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    // 모식도 칸(넓은 화면은 오른쪽)과 휴대폰의 아래쪽 출처 칸 뒤로 들어가는 이름표는 뺀다.
    const phone = isPhone(), right = innerWidth - (schemEl.hidden || phone ? 0 : schemEl.offsetWidth) - 40, bottom = phone ? document.getElementById('corner').getBoundingClientRect().top : innerHeight;
    // 넓은 화면에서는 왼쪽 조작 창과 왼쪽 아래 알림 칸 뒤로 들어가거나 걸치는 이름표도 뺀다. 이름표는 점 위로 약 60px, 좌우로 약 50px을 차지한다.
    const covers = [];
    if (!phone) {
      const panel = document.getElementById('panel');
      if (!document.body.classList.contains('panel-closed')) covers.push(panel.getBoundingClientRect());
      for (const el of document.getElementById('corner').children) if (el.offsetParent && el.textContent) covers.push(el.getBoundingClientRect());
    }
    // 숨겨진 이름표는 폭이 0으로 잡히므로, 보였을 때 잰 폭을 기억해 쓴다(숨김과 보임이 번갈아 깜박이지 않게).
    const covered = (key, sx, sy) => { const wNow = labelLayer.element(key).offsetWidth; if (wNow) labelWidth[key] = wNow; const half = Math.max(50, (labelWidth[key] ?? 0) / 2 + 6); return covers.some(r => sx + half > r.left && sx - half < r.right && sy + 4 > r.top && sy - 60 < r.bottom); };
    for (const [key, l] of Object.entries(PLACES)) {
      if (HIDE[currentView]?.includes(key)) continue;
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, groundAt(l.grid[0], l.grid[1]) + (l.water ? 4 : key === 'dodam' ? ex(10) + 6 : 14), w.z).project(camera);
      const sx = (v3.x * 0.5 + 0.5) * innerWidth, sy = (-v3.y * 0.5 + 0.5) * innerHeight;
      if (v3.z <= 1 && Math.abs(v3.x) < 1.02 && Math.abs(v3.y) < 1.02 && sx < right && sy < bottom && !covered(key, sx, sy)) list.push({ key, x: sx, y: sy, priority: KEY[key] ?? 1, keep: (KEY[key] ?? 1) >= 4 });
    }
    labelLayer.place(list);
  }

  const fitView = () => {
    const phone = isPhone();
    const dockW = schemEl.hidden || phone ? 0 : schemEl.offsetWidth;
    const sheet = schemEl.hidden || !phone ? 0 : schemEl.offsetHeight;
    const left = phone || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20;
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
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('roadsBtn').onclick = e => { e.currentTarget.classList.toggle('on', roads.toggle()); invalidate(); };
  document.getElementById('buildingsBtn').onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };
  document.getElementById('quarryNote').textContent = '창 북쪽 끝에서 바깥으로 이어지는 매포읍에는 석회석 광산과 시멘트 공장이 있습니다. 석회석은 시멘트의 주원료입니다.';

  setView('oblique');
  setHeight(2);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  fitView();
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = {
    setView, setHeight, setSchematic, stats: sim.stats, profile: { ...nums, runs: undefined },
    buildings: buildings.info, roads: () => roads.info(),
    caves: () => marks.map(m => m.name), rocks: () => rockGroup.children.length,
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
    keys: CAVE_KEYS,
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '충북 단양군 남한강 둘레입니다. 이곳에는 석회암이 많아, 빗물과 지하수가 석회암을 녹여(용식) 고수동굴, 천동동굴, 노동동굴 같은 석회 동굴이 생겼습니다. 고수동굴은 세로로 깊은 굴이 두드러진 동굴로, 동굴 안에 종유석, 석순, 석주와 림스톤(물웅덩이 가장자리에 둑처럼 쌓인 탄산 칼슘)이 있습니다. 고수동굴은 1976년, 노동동굴은 1979년 천연기념물로, 천동동굴은 1977년 충청북도 기념물로 지정되었습니다. 남한강 가운데 솟은 도담삼봉은 석회암 봉우리 세 개입니다. 가까운 강가의 석문은 석회 동굴이 무너지고 남은 천장 일부가 구름다리처럼 남은 것으로 여겨지는 돌문입니다. 두 곳 모두 2008년 명승으로 지정되었습니다. 단양은 2020년 국가지질공원으로 인증되었고, 2025년 4월 군 전체가 유네스코 세계지질공원으로 지정되었습니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '남한강 물 넓이와 물길, 동굴 입구, 도담삼봉 바위, 석문, 석회석 광산, 마을과 산 이름 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '도담삼봉 바위 높이, 숲과 논밭은 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
