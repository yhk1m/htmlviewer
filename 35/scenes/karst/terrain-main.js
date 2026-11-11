// © 2026 김용현
// 정선 돌리네 실제 지형 화면. 땅 높이만 실제 자료이고, 밭과 풀밭 윤곽, 산봉우리, 마을과 약수터 자리는 지도 자료에서 옮겼다.
// 돌리네 자리는 고도 자료에서 계산으로 찾은 닫힌 웅덩이이고, 발구덕 마을 이름표 자리는 짐작이다.
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
import { buildJeongseon, sampleH, dolineProfile, profileMarks, profileNumbers, placesOf, DOLINES, N, SIZE, CELL, WATER_LEVEL } from './sim.js';

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
  fogDensity: 0.00006 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});
// 산이 높아(높이 2배면 약 2,200m) 해 쪽 모서리가 그림자 상자 밖으로 나가지 않게 빛을 조금 더 멀리 둔다.
scene.traverse(o => {
  if (!o.isDirectionalLight) return;
  o.position.setLength(9000);
  o.shadow.camera.far = 22000;
  o.shadow.camera.updateProjectionMatrix();
});
controls.maxDistance = 12000;
controls.minDistance = 40;

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });

// 셋째 판을 읽어 돌리네 안을 옅은 주황빛으로, 웅덩이 가장자리를 노란 줄로 덧칠한다. uDoline이 0이면 끈다.
const DOLINE_GLSL = /* glsl */`
vec4 sc=texture2D(tC,suv);
{
  float inD=smoothstep(.2,.6,sc.r)*uDoline;
  base=mix(base,base*.45+vec3(.30,.17,.07),inD*.7);
  float rimL=smoothstep(.25,.6,sc.g)*uDoline;
  base=mix(base,vec3(1.,.84,.32),rimL*.9);
}
`;

// 오른쪽 창: 돌리네 단면과 평면을 그린 예시 그림. 숫자는 이 화면의 고도 자료에서 잰 값이다.
function drawSchematic(el, sim) {
  // 바탕과 글자 색은 라이트, 다크 모드를 따른다. 석회암 회색과 흙빛은 두 모드에서 같다.
  const P = figPalette(), rain = isDark() ? '#9fd3ff' : '#2a7fc0';
  // 지름은 미리 찾아 둔 목록(칸 수를 조금 더 엄격하게 센 값)으로 써서 설명 글의 범위와 맞춘다.
  const big = sim.big, diam = DOLINES.slice(0, 5).map(d => Math.round(d.diamM / 10) * 10), dep = big.map(d => Math.round(d.depth));
  const lo = Math.min(...diam), hi = Math.max(...diam), dlo = Math.min(...dep), dhi = Math.max(...dep);
  // 단면: 석회암 땅에 파인 그릇 모양 웅덩이, 바닥의 흙과 밭, 빗물이 틈으로 스미는 화살표
  const ground = 'M0 90 L150 90 C190 90 205 150 250 160 C295 168 320 160 345 150 C380 120 400 90 440 90 L600 90';
  const bricks = [];
  for (let y = 100; y < 250; y += 22) for (let x = ((y / 22) % 2) * 30; x < 600; x += 60) bricks.push(`<rect x="${x}" y="${y}" width="60" height="22" fill="none" stroke="#6d7470" stroke-width="1"/>`);
  const svg1 = `<svg viewBox="0 0 600 260" role="img" aria-label="돌리네 단면 예시">
  <rect x="0" y="0" width="600" height="260" fill="${P.bg}" stroke="${P.frame}"/>
  <defs><clipPath id="rockClip"><path d="${ground} L600 260 L0 260 Z"/></clipPath></defs>
  <path d="${ground} L600 260 L0 260 Z" fill="#8a8f88"/>
  <g clip-path="url(#rockClip)">${bricks.join('')}</g>
  <path d="M215 140 C240 158 270 166 300 164 C325 162 345 150 360 136 C330 152 300 156 275 154 C250 152 230 146 215 140 Z" fill="#9b4a2c"/>
  <path d="${ground}" fill="none" stroke="${P.ink}" stroke-width="2.5"/>
  <g stroke="#4e5450" stroke-width="2"><path d="M265 165 L262 205 L270 250"/><path d="M300 166 L304 215 L298 250"/><path d="M330 158 L336 200"/></g>
  <g stroke="${rain}" stroke-width="2" fill="${rain}">
    <path d="M200 30 L218 70"/><path d="M215 72 L218 70 L221 72" fill="none"/>
    <path d="M300 30 L300 72"/><path d="M296 68 L300 74 L304 68" fill="none"/>
    <path d="M400 30 L382 70"/><path d="M379 72 L382 70 L385 72" fill="none"/>
    <path d="M262 176 L263 200" stroke-dasharray="4 3"/><path d="M302 178 L303 205" stroke-dasharray="4 3"/>
  </g>
  <g font-size="15" fill="${P.ink}">
    <text x="240" y="22">빗물</text>
    <text x="20" y="80">석회암 땅</text>
    <text x="430" y="78" fill="${P.hi}">돌리네(우묵한 웅덩이)</text>
    <path d="M425 74 L370 112" stroke="${P.hi}" stroke-width="1.4"/>
    <text x="365" y="200" fill="#3b1206" font-weight="700">바닥에 쌓인 붉은 흙과 밭</text>
    <path d="M362 196 L320 160" stroke="#3b1206" stroke-width="1.4"/>
    <text x="20" y="240" fill="#0b2a44" font-weight="700">틈(절리)으로 스민 물이 석회암을 녹임</text>
  </g>
</svg>`;
  // 평면: 둥근 웅덩이 여럿, 두 개가 이어진 모습, 등고선 고리
  const ring = (cx, cy, r, n) => Array.from({ length: n }, (_, q) => `<ellipse cx="${cx}" cy="${cy}" rx="${r * (1 - q * 0.28)}" ry="${r * 0.82 * (1 - q * 0.28)}" fill="${q ? 'none' : '#5c4a33'}" stroke="#f3c98b" stroke-width="${q ? 1 : 2}"/>`).join('');
  const svg2 = `<svg viewBox="0 0 600 220" role="img" aria-label="돌리네 평면 예시">
  <rect x="0" y="0" width="600" height="220" fill="#2f4535"/>
  ${ring(110, 110, 62, 3)}${ring(250, 80, 44, 2)}${ring(235, 165, 34, 2)}
  <path d="M380 110 C380 60 450 55 470 85 C490 55 560 60 560 110 C560 160 490 165 470 135 C450 165 380 160 380 110 Z" fill="#5c4a33" stroke="#f3c98b" stroke-width="2"/>
  <ellipse cx="425" cy="110" rx="26" ry="22" fill="none" stroke="#f3c98b"/><ellipse cx="515" cy="110" rx="26" ry="22" fill="none" stroke="#f3c98b"/>
  <g font-size="15" fill="#f3f1ea">
    <text x="70" y="200">돌리네</text>
    <text x="400" y="200">이어지면 우발레</text>
    <text x="300" y="30" fill="#c9c7bb" font-size="13">위에서 본 모습(등고선 고리)</text>
  </g>
</svg>`;
  el.innerHTML = `<h2>돌리네 모식도</h2>
<figure>${svg1}</figure>
<p class="schem-cap">예시 그림입니다. 웅덩이 깊이와 땅속 틈은 크게 과장했습니다.</p>
<figure>${svg2}</figure>
<p class="schem-cap">예시 그림입니다. 이웃한 돌리네가 넓어져 이어지면 더 큰 우묵한 땅(우발레)이 됩니다.</p>
<p class="schem-note">석회암은 이산화 탄소가 녹은 빗물에 조금씩 녹습니다(용식). 빗물이 땅의 틈으로 모여 스며드는 자리가 먼저 녹아 내려앉으면서 둥글고 우묵한 웅덩이, 돌리네가 생깁니다. 웅덩이 바닥에는 석회암이 녹고 남은 붉은 흙이 쌓여 밭으로 쓰기도 합니다. 물이 잘 빠져 논농사보다 밭농사를 합니다.</p>
<p class="schem-note">이 화면의 큰 돌리네 다섯 개는 고도 자료로 재면 같은 넓이 원의 지름이 약 ${lo}m에서 ${hi}m, 깊이가 약 ${dlo}m에서 ${dhi}m입니다.</p>`;
}

// 돌리네 세 개를 지나는 꺾은 선의 단면. 웅덩이마다 넘치는 높이(테두리)를 점선으로 긋고 그 아래를 옅게 칠한다.
function drawProfile(canvas, { points, nums, marks, from, to, note }) {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d'), W = r.width, H = r.height;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const P = figPalette();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const pad = W < 520 ? 42 : 64, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points.at(-1).m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  const min = Math.floor(Math.min(...points.map(p => p.z)) / 20) * 20 - 20, max = Math.ceil(Math.max(...points.map(p => p.z)) / 20) * 20 + 40;
  let lines = wrapText(ctx, note, W - pad - side);
  const foot = (lines.length + 1) * noteGap + 34;
  const xScale = usableW / lengthM, yScale = (H - foot - 70) / (max - min);
  const ve = yScale / xScale;
  lines = [...lines, ve < 1.5 ? '가로와 세로를 거의 같은 비율로 그렸습니다.' : `세로를 약 ${Math.round(ve)}배 과장해 그렸습니다.`];
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = P.grid; ctx.fillStyle = P.sub; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max; z += 20) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); ctx.fillText(`${z}m`, pad - 4, y(z) + 4); }
  ctx.textAlign = 'center';
  for (let km = 0; km <= lengthM / 1000 + 1e-6; km += 0.2) ctx.fillText(`${+km.toFixed(1)}km`, x(km * 1000), H - foot + 15);
  // 땅
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = '#6f5f45'; ctx.fill();
  // 웅덩이: 땅 위에서 테두리 높이까지를 옅은 주황으로 칠하고, 테두리 높이를 점선으로 긋는다.
  for (const c of nums.crossed) {
    const x0 = x(points[c.start].m), x1 = x(points[c.end].m);
    ctx.beginPath(); ctx.moveTo(x0, y(c.rim));
    for (let n = c.start; n <= c.end; n++) ctx.lineTo(x(points[n].m), y(Math.min(points[n].z, c.rim)));
    ctx.lineTo(x1, y(c.rim)); ctx.closePath();
    ctx.fillStyle = 'rgba(243,201,139,.28)'; ctx.fill();
    ctx.strokeStyle = P.hi; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x0 - 6, y(c.rim)); ctx.lineTo(x1 + 6, y(c.rim)); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6;
  ctx.beginPath(); points.forEach((p, n) => (n ? ctx.lineTo(x(p.m), y(p.z)) : ctx.moveTo(x(p.m), y(p.z)))); ctx.stroke();
  ctx.font = `700 ${W < 520 ? 12 : 15}px "Malgun Gothic",sans-serif`;
  const used = [];
  for (const k of marks) {
    const p = points[k.at], w = ctx.measureText(k.text).width, tx = Math.min(W - 4 - w / 2, Math.max(pad + w / 2, x(p.m)));
    let ty = y(p.z) - 44;
    while (used.some(u => Math.abs(u.x - tx) < (u.w + w) / 2 + 6 && Math.abs(u.y - ty) < 18)) ty -= 18;
    used.push({ x: tx, y: ty, w });
    ctx.strokeStyle = P.hi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(p.m), ty + 5); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = P.bg; ctx.strokeText(k.text, tx, ty);
    ctx.fillStyle = P.hi; ctx.fillText(k.text, tx, ty);
  }
  ctx.fillStyle = P.ink; ctx.font = '700 16px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 26);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 26);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  lines.forEach((t, n) => ctx.fillText(t, pad > 42 ? pad : 8, H - foot + 36 + n * noteGap));
}

async function start() {
  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/jeongseon-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildJeongseon(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/jeongseon-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest);
  const roadData = await (await fetch(new URL('./data/jeongseon-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim), line = dolineProfile(sim), nums = profileNumbers(line);

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
  const tC = { value: splatTex(stage.splatC, N) }, uDoline = { value: 1 };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const shared = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    shared(sh, r);
    sh.uniforms.tC = tC; sh.uniforms.uDoline = uDoline;
    sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D tA', 'uniform sampler2D tC;\nuniform float uDoline;\nuniform sampler2D tA').replace('// 물길: 얕은 물은', DOLINE_GLSL + '// 물길: 얕은 물은');
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

  // 시점. p와 t는 [가로, 높이, 세로](m)이고, 바라보는 점의 높이는 높이 배율에 맞춰 옮긴다.
  // from과 to는 격자 칸 [가로, 세로]이고, 카메라 높이는 그 자리 땅 위 lift(m)다.
  const VIEWS = {
    // 남남서쪽 높은 하늘에서 북북동쪽을 본다. 왼쪽에 민둥산, 가운데에 발구덕 돌리네 무리가 보인다.
    oblique: { p: [250, 3000, 3700], t: [1100, 800, 400] },
    // 민둥산과 돌리네 무리를 가운데 두고 바로 위에서 본다.
    above: { p: [1080, 4300, 620], t: [1080, 800, 400] },
    // 돌리네 무리 남쪽 골짜기 높은 하늘에서 북쪽으로 가까이 내려다본다.
    doline: { from: [412, 458], lift: 820, to: [404, 312] },
    // 민둥산 꼭대기 서쪽 높은 하늘에서 억새 풀밭 너머 동쪽 아래 발구덕 돌리네 무리를 내려다본다.
    summit: { from: [292, 258], lift: 480, to: [392, 314] },
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

  // 지도 위에 그리는 것: 돌리네(주황 칠과 테두리), 밭(누런 빛), 억새 풀밭(옅은 연두), 단면을 잰 A-B 선, 곳 이름
  let dolineOn = true;
  const useLayer = document.createElement('canvas');
  useLayer.width = useLayer.height = N;
  {
    const c = useLayer.getContext('2d'), img = c.createImageData(N, N);
    for (let k = 0; k < N * N; k++) {
      const col = sim.edge[k] ? [176, 82, 20, 255] : sim.mask[k] ? [232, 150, 70, 170] : sim.field[k] ? [214, 196, 120, 120] : sim.meadow[k] ? [190, 214, 150, 120] : null;
      if (col) img.data.set(col, k * 4);
    }
    c.putImageData(img, 0, 0);
  }
  // 지도에서는 돌리네 무리가 작아 웅덩이마다 이름을 쓰지 않고 주황 칠과 아래 설명으로 알린다.
  const MAP_KEYS = ['mindung', 'gasan', 'jieok', 'balgudeok', 'yaksu', 'yupyeong', 'mureung'];
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (dolineOn) ctx.drawImage(useLayer, ox, oy, N * sc, N * sc);
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    line.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = line[0], B = line.at(-1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc - 18, oy + A.y * sc + 6); ctx.fillText('A', ox + A.x * sc - 18, oy + A.y * sc + 6);
    ctx.strokeText('B', ox + B.x * sc + 6, oy + B.y * sc - 6); ctx.fillText('B', ox + B.x * sc + 6, oy + B.y * sc - 6);
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    for (const key of MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc;
      const text = l.doline ? l.name : l.guess ? `${l.name}(짐작)` : l.name, w = ctx.measureText(text).width;
      const dot = l.village || l.peak || l.guess;
      let tx = dot ? x + 7 : x - w / 2, ty = l.doline ? y - 10 : y + 5;
      // 지도 오른쪽 끝을 넘는 글자, 돌리네 무리 서쪽의 약수터, 돌리네 사이의 발구덕 마을은 점 왼쪽에 쓴다(발구덕은 위로 조금 올려 약수터와 겹치지 않게).
      if (tx + w > ox + N * sc - 4 || key === 'yaksu') tx = x - w - 7;
      // 발구덕 마을은 민둥산 이름과 등고선 숫자를 피해 거북이약수터 이름 아래에 쓰고, 짐작한 자리까지 짧은 줄을 긋는다.
      if (key === 'balgudeok') { tx = x - w + 10; ty = y + 54; ctx.strokeStyle = '#20302a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 2, y + 4); ctx.lineTo(tx + 4, ty - 12); ctx.stroke(); }
      if (dot) {
        ctx.fillStyle = l.peak ? '#7a2e12' : '#20302a';
        ctx.beginPath();
        if (l.peak) { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); ctx.fill(); }
        else if (l.guess) { ctx.strokeStyle = '#20302a'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      if (l.doline && !dolineOn) continue;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(text, tx, ty);
      ctx.fillStyle = l.doline ? '#8a3a0c' : '#20302a'; ctx.fillText(text, tx, ty);
    }
    ctx.restore();
  };

  const round10 = v => Math.round(v / 10) * 10;
  const [c1, c2, c3] = nums.crossed;
  const PROFILE_NOTE = `발구덕 돌리네 무리 가운데 큰 웅덩이 세 개의 가운데를 꺾은 선으로 이어(A 서쪽에서 B 동쪽까지, 약 ${nums.lengthKm.toFixed(1)}km) 고도 자료에서 잰 높이입니다. 점선은 웅덩이에 물을 채운다면 넘치기 시작하는 높이(테두리)이고, 주황빛은 그 아래 우묵한 부분입니다. 서쪽부터 웅덩이는 이 선 위에서 폭 약 ${round10(c1.widthM)}m, 깊이 약 ${Math.round(c1.depth)}m, 폭 약 ${round10(c2.widthM)}m, 깊이 약 ${Math.round(c2.depth)}m, 폭 약 ${round10(c3.widthM)}m, 깊이 약 ${Math.round(c3.depth)}m의 그릇 모양입니다. 테두리 높이는 서쪽 웅덩이가 약 ${round10(c1.rim)}m, 나머지 둘은 약 ${round10(c2.rim)}m입니다. 원자료가 약 30m 간격이라 몇 m의 깊이 차이는 정확하지 않습니다.`;
  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : '주황 칠과 진한 테두리: 고도 자료에서 계산으로 찾은 닫힌 웅덩이(돌리네). 누런 빛: OSM 밭 윤곽, 연두빛: 민둥산 꼭대기 풀밭 윤곽. 붉은 점선: 단면을 잰 길(A에서 B까지). 세모: 산봉우리, 점선 동그라미: 짐작한 자리';
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 20 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 400, hi: 1120, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawProfile(mapView, { points: line, nums, marks: profileMarks(line), from: 'A 서쪽', to: 'B 동쪽', note: PROFILE_NOTE });
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
  // 라이트, 다크 모드가 바뀌면 모식도를 다시 그린다(단면은 함께 오는 resize로 다시 그린다).
  addEventListener('themechange', () => drawSchematic(schemEl, sim));
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name, l.sub, l.doline ? 'dol' : l.guess ? 'guess' : l.village || l.peak ? 'small' : '');
  const v3 = new THREE.Vector3();
  // 중요도 4 이상은 늘 보이고, 나머지는 겹치면 숨긴다. 가까이 보기에서 화면 끝에 몰리는 이름표는 뺀다.
  const HIDE = {
    oblique: ['doline3', 'doline4'],
    above: ['doline3', 'doline4', 'gasan'],
    // 돌리네 가까이: 뒤쪽 깊이 14m 돌리네 이름표는 발구덕 마을의 점선 줄과 겹쳐 뺀다.
    doline: ['jieok', 'yupyeong', 'mureung', 'gasan', 'doline2'],
    summit: ['jieok', 'yupyeong', 'mureung', 'mindung'],
  };
  const KEY = { mindung: 5, doline0: 5, balgudeok: 4, doline1: 4, yaksu: 3, doline2: 3, doline3: 2, doline4: 2, gasan: 2, jieok: 2, yupyeong: 1, mureung: 1 };
  // 이름표 반 폭 어림(글자 수로): 왼쪽 조작 창에 걸치는지 볼 때 쓴다.
  const halfW = l => Math.max(l.name.length * 11, (l.sub ?? '').length * 6.5) / 2;
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    // 모식도 칸(넓은 화면은 오른쪽)과 휴대폰의 아래쪽 출처 칸 뒤로 들어가는 이름표는 뺀다.
    // 왼쪽 조작 창 뒤에 걸치는 이름표도 뺀다.
    const phone = isPhone(), right = innerWidth - (schemEl.hidden || phone ? 0 : schemEl.offsetWidth + 90) - 20, bottom = phone ? document.getElementById('corner').getBoundingClientRect().top : innerHeight;
    const left = phone || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').getBoundingClientRect().right + 4;
    for (const [key, l] of Object.entries(PLACES)) {
      if (HIDE[currentView]?.includes(key)) continue;
      if (l.doline && !dolineOn) continue;
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, groundAt(l.grid[0], l.grid[1]) + (l.doline ? 6 : 14), w.z).project(camera);
      const sx = (v3.x * 0.5 + 0.5) * innerWidth, sy = (-v3.y * 0.5 + 0.5) * innerHeight;
      if (v3.z <= 1 && Math.abs(v3.x) < 1.02 && Math.abs(v3.y) < 1.02 && sx < right && sx - halfW(l) > left && sy < bottom) list.push({ key, x: sx, y: sy, priority: KEY[key] ?? 1, keep: (KEY[key] ?? 1) >= 4 });
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
  const setDolines = on => {
    dolineOn = on;
    uDoline.value = on ? 1 : 0;
    document.getElementById('dolineBtn').classList.toggle('on', on);
    drawMapView();
    placeLabels();
    invalidate();
  };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('dolineBtn').onclick = () => setDolines(!dolineOn);
  document.getElementById('roadsBtn').onclick = e => { e.currentTarget.classList.toggle('on', roads.toggle()); invalidate(); };
  document.getElementById('buildingsBtn').onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };

  setView('oblique');
  setHeight(2);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  fitView();
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = {
    setView, setHeight, setSchematic, setDolines, stats: sim.stats, profile: { crossed: nums.crossed.map(c => ({ widthM: c.widthM, depth: +c.depth.toFixed(1), rim: +c.rim.toFixed(1) })), lengthKm: +nums.lengthKm.toFixed(2) },
    buildings: buildings.info, roads: () => roads.info(),
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '강원 정선군 남면 민둥산(해발 약 1,119m)과 그 동쪽 기슭 발구덕 마을입니다. 민둥산은 꼭대기 둘레에 나무가 거의 없고 억새가 넓게 자라 가을 억새로 이름난 산입니다. 이 둘레는 석회암 지대라, 빗물이 석회암을 녹여 생긴 둥글고 우묵한 웅덩이인 돌리네가 많습니다. 발구덕 마을에는 큰 돌리네 여러 개가 모여 있고, 그 안의 평평한 바닥을 밭으로 씁니다(돌리네 밭). 발구덕이라는 이름은 큰 구덩이가 여덟 개 있다는 뜻으로 풀이됩니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '밭과 풀밭 윤곽, 산봉우리, 마을과 약수터 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '돌리네 자리는 고도 자료에서 계산으로 찾은 것이고, 발구덕 마을 이름표 자리는 짐작이며, 숲과 웅덩이 안 밭은 규칙으로 칠한 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
