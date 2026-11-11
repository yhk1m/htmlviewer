// © 2026 김용현
// 비슬산 실제 지형 화면. 땅 높이만 실제 자료이고, 돌무더기 비탈과 맨바위, 산봉우리, 절과 휴양림 자리는 지도 자료에서 옮겼다.
// 암괴류 띠는 OSM 돌무더기 윤곽에 그 사이 골짜기를 따라 근사한 띠를 더한 예시이고, 바위 덩어리와 숲은 규칙으로 늘어놓은 예시다.
import * as THREE from 'three';
import { createStage } from '../../shared/stage3d.js';
import { loadTerrainUniforms, splatTex, patchTerrain } from '../../shared/terrain-material.js';
import { buildTrees, buildNearTrees } from '../../shared/vegetation.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap, drawHeightTint, wrapText, markInk } from '../../shared/map-views.js';
import { createHeightScale } from '../../shared/height.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createBuildingLayer, clearUnder } from '../../shared/buildings.js';
import { createRoadLayer } from '../../shared/roads.js';
import { rng32 } from '../../shared/rng.js';
import { buildBiseul, sampleH, blockProfile, profileMarks, profileNumbers, placesOf, N, SIZE, CELL, WATER_LEVEL } from './sim.js';
import { createSchematic, BLOCKS } from './schematic.js';
import { figPalette, isDark } from '../../shared/theme.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
// 산지라 낮은 땅만 키우지 않고 모든 높이를 같은 배율로 키운다.
const scale = createHeightScale(2, 5000);
const ex = scale.apply;
let currentView = 'oblique';

const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };

const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
  mount: document.getElementById('stage'),
  size: SIZE,
  fogDensity: 0.00005 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});
// 산이 높아(높이 2배면 약 2,100m) 해 쪽 모서리가 그림자 상자 밖으로 나가지 않게 빛을 조금 더 멀리 둔다.
scene.traverse(o => {
  if (!o.isDirectionalLight) return;
  o.position.setLength(9000);
  o.shadow.camera.far = 22000;
  o.shadow.camera.updateProjectionMatrix();
});
controls.maxDistance = 14000;
controls.minDistance = 60;

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
// 시점. 바라보는 점의 높이는 높이 배율에 맞춰 옮기고, 카메라는 그 점보다 (p - t)만큼 위에 둔다.
const VIEWS = {
  // 남서쪽 높은 하늘에서 북동쪽의 대견사 능선을 바라본다. 암괴류가 능선 아래에서 서쪽 휴양림 쪽으로 내려온다.
  oblique: { p: [-1500, 3700, 3900], t: [100, 800, 300] },
  above: { p: [0, 9500, 600], t: [0, 0, 0] },
  // 골짜기 아래쪽(서남서)에서 암괴류를 따라 대견사 쪽으로 가까이 올려다본다.
  stream: { p: [-260, 783, 840], t: [282, 723, 710] },
  // 대견사 위에서 암괴류가 골짜기를 따라 휴양림 쪽으로 내려가는 모습을 내려다본다.
  top: { p: [1300, 2300, 0], t: [-100, 650, 820] },
};
function setView(name) {
  const v = VIEWS[name];
  currentView = name;
  const z = portraitZoom() * (PHONE ? 1.35 : 1), ty = ex(v.t[1]), py = ty + (v.p[1] - v.t[1]);
  camera.position.set(v.t[0] + (v.p[0] - v.t[0]) * z, ty + (py - ty) * z, v.t[2] + (v.p[2] - v.t[2]) * z);
  controls.target.set(v.t[0], ty, v.t[2]);
  controls.update();
  invalidate();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

// 셋째 판 빨강(암괴류 바위 띠)을 읽어, 바위 덩어리 아래 땅을 밝은 회색 화강암 빛으로 덧칠한다.
// 멀리서 바위 덩어리가 작게 보일 때도 띠가 드러나도록 작은 얼룩을 섞는다.
const BLOCK_GLSL = /* glsl */`
vec4 sc=texture2D(tC,suv+jit*.25);
{
  float g=smoothstep(.15,.6,sc.r);
  float speck=smoothstep(.35,.75,tiny)*.55+smoothstep(.3,.8,fin)*.45;
  // 누르스름한 회색 화강암에 검은 이끼 얼룩
  vec3 granite=mix(vec3(.30,.28,.23),vec3(.52,.48,.40),speck);
  granite=mix(granite,rockC*vec3(1.,.95,.84),.3);
  granite*=mix(1.,.55,smoothstep(.58,.78,mid*.6+tiny*.4));
  base=mix(base,granite,g);
  terrainRough=mix(terrainRough,.98,g);
}
`;

// 화강암 바위 덩어리: 모서리부터 썩어 깎인 둥근 덩어리. 실제 크기(지름 약 1~4m)에 BOULDER_ENLARGE배를 곱해 그린다.
const BOULDER_ENLARGE = 1;
function boulderGeometry() {
  const g = new THREE.IcosahedronGeometry(0.5, 1), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const u = v.clone().normalize();
    const lump = 1 + 0.12 * Math.sin(u.x * 5 + 1.3) * Math.sin(u.z * 4 + 0.4) + 0.07 * Math.sin(u.y * 7 + u.x * 3);
    p.setXYZ(i, u.x * 0.5 * lump, u.y * 0.36 * lump, u.z * 0.5 * lump * 0.86);
  }
  g.computeVertexNormals();
  return g;
}
function createBoulders(sim, factor) {
  const cells = [];
  for (let k = 0; k < N * N; k++) if (sim.block[k]) cells.push(k);
  const PER = Math.max(4, Math.round(16 * factor)), MAX = cells.length * PER;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.98, metalness: 0, envMapIntensity: 0.45 });
  const mesh = new THREE.InstancedMesh(boulderGeometry(), mat, MAX);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  mesh.userData.place = groundAt => {
    const rand = rng32(4321);
    let n = 0;
    for (const k of cells) for (let t = 0; t < PER; t++) {
      const px = (k % N) + rand() - 0.5, py = ((k / N) | 0) + rand() - 0.5;
      // 지름 약 1~4m. 작은 바위가 많고 큰 바위는 드물다.
      const d = (1 + 3 * rand() * rand()) * BOULDER_ENLARGE, w = world(px, py);
      e.set((rand() - 0.5) * 0.5, rand() * 6.28, (rand() - 0.5) * 0.5);
      q.setFromEuler(e);
      s.set(d * (0.85 + rand() * 0.3), d, d * (0.85 + rand() * 0.3));
      p.set(w.x, groundAt(px, py) + d * 0.12, w.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(n, m);
      // 누르스름한 회색 화강암. 넷에 하나쯤은 검은 이끼가 덮여 어둡다.
      const tone = 0.42 + rand() * 0.18, lichen = rand() < 0.25 ? 0.6 : 1;
      c.setRGB(tone * lichen, tone * 0.95 * lichen, tone * 0.82 * lichen);
      mesh.setColorAt(n, c);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  return mesh;
}

// 굽은 길을 따라 잰 높이의 단면. 높이 차이가 커서 100m 간격 눈금으로 따로 그리고, 바위 띠 구간을 회색으로 표시한다.
function drawProfile(canvas, { points, marks, from, to, note }) {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d'), W = r.width, H = r.height;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  const pad = W < 520 ? 42 : 64, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points.at(-1).m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  const min = Math.floor(Math.min(...points.map(p => p.z)) / 100) * 100 - 100, max = Math.ceil(Math.max(...points.map(p => p.z)) / 100) * 100 + 200;
  let lines = wrapText(ctx, note, W - pad - side);
  const foot = (lines.length + 1) * noteGap + 34;
  const xScale = usableW / lengthM, yScale = (H - foot - 70) / (max - min);
  const ve = yScale / xScale;
  lines = [...lines, ve < 1.5 ? '가로와 세로를 거의 같은 비율로 그렸습니다.' : `세로를 약 ${Math.round(ve)}배 과장해 그렸습니다.`];
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = P.grid; ctx.fillStyle = P.sub; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max; z += 100) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); ctx.fillText(`${z}m`, pad - 4, y(z) + 4); }
  ctx.textAlign = 'center';
  for (let km = 0; km <= lengthM / 1000 + 1e-6; km += 0.5) ctx.fillText(`${km}km`, x(km * 1000), H - foot + 15);
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = '#6f5f45'; ctx.fill();
  // 바위 띠 구간: 땅 위에 회색 띠와 작은 바위 점
  ctx.lineCap = 'round';
  for (let n = 1; n < points.length; n++) {
    const a = points[n - 1], b = points[n];
    if (!a.rock || !b.rock) continue;
    ctx.strokeStyle = '#c9cbcc'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x(a.m), y(a.z) - 2); ctx.lineTo(x(b.m), y(b.z) - 2); ctx.stroke();
  }
  ctx.fillStyle = '#8d9093';
  for (let n = 0; n < points.length; n += 3) if (points[n].rock) { ctx.beginPath(); ctx.arc(x(points[n].m) + ((n * 7) % 5) - 2, y(points[n].z) - 3 - ((n * 3) % 3), 1.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.font = `700 ${W < 520 ? 12 : 15}px "Malgun Gothic",sans-serif`;
  const used = [];
  for (const k of marks) {
    const p = points[k.at], w = ctx.measureText(k.text).width, tx = Math.min(W - 4 - w / 2, Math.max(pad + w / 2, x(p.m)));
    let ty = y(p.z) - 30;
    while (used.some(u => Math.abs(u.x - tx) < (u.w + w) / 2 + 6 && Math.abs(u.y - ty) < 18)) ty -= 18;
    used.push({ x: tx, y: ty, w });
    ctx.strokeStyle = markInk(k.color); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(p.m), ty + 5); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = P.bg; ctx.strokeText(k.text, tx, ty);
    ctx.fillStyle = markInk(k.color); ctx.fillText(k.text, tx, ty);
  }
  ctx.fillStyle = P.ink; ctx.font = '700 16px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 26);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 26);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  lines.forEach((t, n) => ctx.fillText(t, pad > 42 ? pad : 8, H - foot + 36 + n * noteGap));
}

async function start() {
  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/biseul-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildBiseul(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/biseul-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest);
  const roadData = await (await fetch(new URL('./data/biseul-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim), line = blockProfile(sim), nums = profileNumbers(line);

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
  const tC = { value: splatTex(stage.splatC, N) };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const shared = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    shared(sh, r);
    sh.uniforms.tC = tC;
    sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D tA', 'uniform sampler2D tC;\nuniform sampler2D tA').replace('// 물길: 얕은 물은', BLOCK_GLSL + '// 물길: 얕은 물은');
  };
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  const groundAt = (i, j) => ex(sampleH(sim.h, i, j));
  const toWorld = (i, j) => { const w = world(i, j); return [w.x, w.z]; };
  // 건물과 도로, 바위 덩어리: 땅 높이 배율이 바뀌면 다시 얹는다. 높이는 과장하지 않는다.
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld, groundAt, cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld, groundAt });
  const boulders = createBoulders(sim, Q.trees);
  scene.add(boulders);
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
    boulders.userData.place(groundAt);
    renderer.shadowMap.needsUpdate = true;
  };

  // 지도 위에 그리는 것: OSM 돌무더기(진한 회색)와 근사한 띠(옅은 회색), 단면을 잰 A-B 선, 곳 이름
  const useLayer = document.createElement('canvas');
  useLayer.width = useLayer.height = N;
  {
    const c = useLayer.getContext('2d'), img = c.createImageData(N, N);
    for (let k = 0; k < N * N; k++) {
      const col = sim.scree[k] ? [70, 72, 76, 235] : sim.band[k] ? [150, 152, 156, 215] : sim.bare[k] ? [110, 100, 92, 200] : null;
      if (col) img.data.set(col, k * 4);
    }
    c.putImageData(img, 0, 0);
  }
  const MAP_KEYS = ['stream', 'temple', 'forest', 'cheonwang', 'johwa', 'daegyeon'];
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(useLayer, ox, oy, N * sc, N * sc);
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    line.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = line[0], B = line.at(-1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc + 6, oy + A.y * sc - 8); ctx.fillText('A', ox + A.x * sc + 6, oy + A.y * sc - 8);
    ctx.strokeText('B', ox + B.x * sc - 6, oy + B.y * sc + 22); ctx.fillText('B', ox + B.x * sc - 6, oy + B.y * sc + 22);
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    for (const key of MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, text = l.peak ? `${l.name} ${l.sub.split(', ')[0]}` : l.name, w = ctx.measureText(text).width;
      const dot = l.village || l.peak;
      // 암괴류 글자는 띠를 가리지 않게 띠 아래쪽에 쓴다.
      let tx = dot ? x + 7 : x - w / 2;
      const ty = key === 'stream' ? y + 26 : y + 5;
      // 대견봉은 바로 동쪽의 대견사 글자와 겹치지 않게 점 왼쪽에 쓴다.
      if (tx + w > ox + N * sc - 4 || key === 'daegyeon') tx = x - w - 7;
      if (dot) { ctx.fillStyle = l.peak ? '#7a2e12' : '#20302a'; ctx.beginPath(); if (l.peak) { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); } else ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(text, tx, ty);
      ctx.fillStyle = '#20302a'; ctx.fillText(text, tx, ty);
    }
    ctx.restore();
  };

  const round10 = v => Math.round(v / 10) * 10;
  const PROFILE_NOTE = `대견사(A)에서 암괴류를 따라 골짜기 바닥으로 내려가 휴양림 쪽(B)까지 잰 높이입니다(약 ${nums.lengthKm.toFixed(1)}km). 높이는 둘레 몇 칸의 가운데 값입니다. 회색 띠는 이 화면에 그린 바위 지대(OSM 돌무더기와 그 사이를 근사한 띠)로, 약 ${round10(nums.top)}m에서 약 ${round10(nums.bottom)}m까지 약 ${nums.rockKm.toFixed(1)}km입니다. 위쪽 절반은 평균 약 ${nums.upperDeg}도, 아래쪽 절반은 약 ${nums.lowerDeg}도로, 아래로 갈수록 완만해집니다(백과사전에는 평균 경사 약 15도로 소개됩니다). 100m 사이 가장 급한 곳은 약 ${nums.steepDeg}도입니다.`;
  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : '진한 회색: OSM 돌무더기(scree) 윤곽, 옅은 회색: 그 사이 골짜기를 따라 근사해 그린 띠. 붉은 점선: 단면을 잰 길(A 대견사에서 B 휴양림 쪽까지). 세모: 산봉우리';
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 20 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 100, hi: 1100, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawProfile(mapView, { points: line, marks: profileMarks(line), from: 'A 대견사', to: 'B 휴양림 쪽 골짜기', note: PROFILE_NOTE });
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
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name, l.sub, l.village || l.peak ? 'small' : '');
  const v3 = new THREE.Vector3();
  // 중요도 4 이상만 늘 보이고, 나머지는 겹치면 숨긴다. 화면 위 끝에 걸리거나 가까이 보기에서 화면 끝에 몰리는 이름표를 뺀다.
  const HIDE = { oblique: ['cheonwang'], stream: ['cheonwang', 'saw', 'johwa'], top: ['saw', 'johwa', 'daegyeon'] };
  const KEY = { stream: 5, temple: 4, forest: 3, cheonwang: 3, daegyeon: 3, johwa: 2, saw: 1 };
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    // 모식도 칸(넓은 화면은 오른쪽)과 휴대폰의 아래쪽 출처 칸 뒤로 들어가거나 걸치는 이름표는 뺀다.
    const phone = isPhone(), right = innerWidth - (schemEl.hidden || phone ? 0 : schemEl.offsetWidth) - 50, bottom = phone ? document.getElementById('corner').getBoundingClientRect().top : innerHeight;
    for (const [key, l] of Object.entries(PLACES)) {
      if (HIDE[currentView]?.includes(key)) continue;
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, ex(sampleH(sim.h, l.grid[0], l.grid[1])) + (key === 'stream' ? 12 : 20), w.z).project(camera);
      if (v3.z <= 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 && (v3.x * 0.5 + 0.5) * innerWidth < right && (-v3.y * 0.5 + 0.5) * innerHeight < bottom) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: KEY[key] ?? 1, keep: (KEY[key] ?? 1) >= 4 });
    }
    labelLayer.place(list);
  }

  // 모식도의 구역을 누르면 3D의 같은 이름표를 밝힌다. 절리, 핵석, 풍화층, 기반암, 얼었다 녹기는 이 화면에 따로 표시하지 않아 밝힐 이름표가 없다.
  const ZONE_LABEL = { stream: ['stream'], field: ['stream'], forest: ['forest'] };
  const HI_KEYS = [...new Set(Object.values(ZONE_LABEL).flat())];
  const schematic = createSchematic(schemEl, { steps: true, stage: BLOCKS, onZone: zone => { const on = ZONE_LABEL[zone] ?? []; for (const key of HI_KEYS) labelLayer.element(key).classList.toggle('hi', on.includes(key)); invalidate(); } });
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
  document.getElementById('bouldersBtn').onclick = e => { boulders.visible = !boulders.visible; e.currentTarget.classList.toggle('on', boulders.visible); renderer.shadowMap.needsUpdate = true; invalidate(); };

  setView('oblique');
  setHeight(2);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = {
    setView, setHeight, setSchematic, stats: sim.stats, profile: nums,
    buildings: buildings.info, roads: () => roads.info(), boulders: () => ({ count: boulders.count, visible: boulders.visible }),
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
    schematic,
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '대구 달성군 비슬산의 대견사 아래 비탈입니다. 둥근 화강암 바위가 골짜기를 따라 강물처럼 길게 이어져 있는데, 이것이 암괴류입니다. 화강암에 생긴 틈(절리)을 따라 땅속에서 바위가 썩어 흙이 되고, 덜 썩은 덩어리는 모서리부터 썩어 깎여 둥근 핵석이 됩니다. 빙기의 추운 기후에서 땅이 얼었다 녹기를 되풀이하자 흙이 비탈 아래로 천천히 흘러내리고 고운 흙은 씻겨 나가, 바위가 드러나 골짜기를 따라 모였습니다. 지금 기후에서는 거의 움직이지 않는 옛 지형입니다. 2003년 천연기념물로 지정되었습니다. 길이 약 2km, 가장 넓은 곳 폭 약 80m로 알려져 있으나 자료마다 조금 다르고, 남은 부분은 1km 남짓이라는 글도 있습니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '돌무더기 비탈과 맨바위, 바위 이름, 산봉우리, 절과 휴양림, 도로 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '암괴류 띠의 일부와 바위 덩어리, 숲은 근사하거나 규칙으로 만든 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
