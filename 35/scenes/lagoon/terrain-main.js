// © 2026 김용현
// 강릉 경포호 실제 지형 화면. 땅 높이만 실제 자료이고, 호수와 하천, 모래 해안의 자리는 지도 자료에서 옮겼다. 과거 단계는 만들지 않는다.
import * as THREE from 'three';
import { createStage } from '../../shared/stage3d.js';
import { loadTerrainUniforms, splatTex, patchTerrain } from '../../shared/terrain-material.js';
import { buildTrees, buildNearTrees } from '../../shared/vegetation.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap, drawHeightTint, drawPathProfile } from '../../shared/map-views.js';
import { createHeightScale } from '../../shared/height.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { buildGyeongpo, sampleH, lakeProfile, profileMarks, barStats, placesOf, N, SIZE, CELL, WATER_LEVEL, LAKE_LEVEL } from './sim.js';
import { createSchematic } from './schematic.js';
import { createBuildingLayer, clearUnder } from '../../shared/buildings.js';
import { createRoadLayer } from '../../shared/roads.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const scale = createHeightScale(3, 300);
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

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
// 바다 위에서 사주 너머의 호수를 바라본다.
const VIEWS = {
  oblique: { p: [3200, 1900, -3000], t: [-100, 5, -100] },
  above: { p: [0, 7600, 400], t: [0, 0, -100] },
  close: { p: [1450, 1250, -1500], t: [380, 5, -520] },
};
function setView(name) {
  const v = VIEWS[name];
  currentView = name;
  const z = portraitZoom() * (PHONE ? 1.35 : 1), ty = ex(v.t[1]);
  camera.position.set(v.t[0] + (v.p[0] - v.t[0]) * z, ty + (v.p[1] - ty) * z, v.t[2] + (v.p[2] - v.t[2]) * z);
  controls.target.set(v.t[0], ty, v.t[2]);
  controls.update();
  invalidate();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

async function start() {
  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/gyeongpo-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildGyeongpo(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/gyeongpo-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest, sim.mountain);
  const roadData = await (await fetch(new URL('./data/gyeongpo-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim), line = lakeProfile(sim), bar = barStats(line);

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
  uniforms.uSand.value = 1;
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);
  const seaPlane = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ color: 0x2f78b4 }));
  seaPlane.rotation.x = -Math.PI / 2;
  scene.add(seaPlane);
  // 호수 면: 호수 칸만 덮는 면. 석호의 물은 바닷물과 민물이 섞여 바다와 색을 다르게 칠한다.
  const lakeGeo = new THREE.BufferGeometry(), lakeIdx = [];
  const lakePos = new Float32Array(N * N * 3);
  for (let k = 0; k < N * N; k++) { lakePos[k * 3] = pos[k * 3]; lakePos[k * 3 + 2] = pos[k * 3 + 2]; }
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
    if (sim.lake[a] || sim.lake[b] || sim.lake[c] || sim.lake[d]) lakeIdx.push(a, c, b, b, c, d);
  }
  lakeGeo.setAttribute('position', new THREE.BufferAttribute(lakePos, 3));
  lakeGeo.setIndex(lakeIdx);
  const lakeMesh = new THREE.Mesh(lakeGeo, new THREE.MeshBasicMaterial({ color: 0x2f8f86 }));
  scene.add(lakeMesh);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  // 건물: 땅 높이 배율이 바뀌면 다시 얹는다. 건물 높이는 과장하지 않는다.
  // 도로: 땅 높이 배율이 바뀌면 다시 얹는다.
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld: (i, j) => { const w = world(i, j); return [w.x, w.z]; }, groundAt: (i, j) => ex(Math.max(sampleH(sim.h, i, j), 0.9)), cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld: (i, j) => { const w = world(i, j); return [w.x, w.z]; }, groundAt: (i, j) => ex(Math.max(sampleH(sim.h, i, j), 0.9)) });
  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
  const applyHeight = () => {
    // 바다와 호수가 아닌 땅이 물 면 아래로 내려가 물처럼 보이지 않게 한다.
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(sim.sea[k] || sim.lake[k] ? sim.h[k] : Math.max(sim.h[k], 0.9));
    seaPlane.position.y = ex(0.5);
    for (let k = 0; k < N * N; k++) lakePos[k * 3 + 1] = ex(LAKE_LEVEL);
    lakeGeo.attributes.position.needsUpdate = true;
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

  // 지도 위에 그리는 것: 단면을 잰 A-B 선, 곳 이름
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    line.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = line[0], B = line[line.length - 1];
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc - 20, oy + A.y * sc + 6); ctx.fillText('A', ox + A.x * sc - 20, oy + A.y * sc + 6);
    ctx.strokeText('B', ox + B.x * sc + 8, oy + B.y * sc + 6); ctx.fillText('B', ox + B.x * sc + 8, oy + B.y * sc + 6);
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    for (const key of ['lake', 'bar', 'beach', 'gangmun', 'stream', 'chodang', 'gangmunDong', 'jeo', 'sea']) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, w = ctx.measureText(l.name).width;
      const dot = key === 'chodang' || key === 'gangmunDong' || key === 'jeo';
      const tx = dot ? x + 7 : x - w / 2;
      if (dot) { ctx.fillStyle = '#20302a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(l.name, tx, y + 5);
      ctx.fillStyle = '#20302a'; ctx.fillText(l.name, tx, y + 5);
    }
    ctx.restore();
  };

  const PROFILE_NOTE = `호수 서쪽에서 경포호와 사주, 경포해변을 지나 동해까지 곧게 자른 높이입니다. 호수와 바다 사이의 사주는 폭이 약 ${Math.round(bar.width / 10) * 10}m입니다. 자료상 가장 높은 곳은 약 ${Math.round(bar.top)}m인데, 건물과 소나무숲의 높이가 섞여 있을 수 있습니다. 원자료 간격이 약 30m라 사주와 해변이 실제보다 뭉개집니다. 호수 바닥과 바다 바닥은 자료에 없어 물은 0m로 그립니다.`;
  const mapView = document.getElementById('mapView');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 5 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 0, hi: 20, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawPathProfile(mapView, { points: line, marks: profileMarks(line), from: 'A 호수 서쪽', to: 'B 동해', note: PROFILE_NOTE });
  };
  document.querySelectorAll('[data-show]').forEach(b => b.onclick = () => {
    showing = b.dataset.show;
    document.querySelectorAll('[data-show]').forEach(o => o.classList.toggle('on', o === b));
    drawMapView();
    placeLabels();
    invalidate();
  });

  let labelsOn = true;
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name, l.sub);
  const v3 = new THREE.Vector3();
  const KEY = { lake: 4, bar: 4, beach: 3, stream: 3, low: 2, gangmun: 2 };
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    for (const [key, l] of Object.entries(PLACES)) {
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, ex(Math.max(sampleH(sim.h, l.grid[0], l.grid[1]), LAKE_LEVEL)) + 15, w.z).project(camera);
      if (v3.z <= 1) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: KEY[key] ?? 1, keep: true });
    }
    labelLayer.place(list);
  }

  const schemEl = document.getElementById('schem');
  const ZONE_LABEL = { lagoon: 'lake', bar: 'bar', beach: 'beach', river: 'stream' };
  createSchematic(schemEl, { steps: true, stage: 4, onZone: zone => { for (const [z, key] of Object.entries(ZONE_LABEL)) labelLayer.element(key).classList.toggle('hi', z === zone); invalidate(); } });
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
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('roadsBtn').onclick = e => { e.currentTarget.classList.toggle('on', roads.toggle()); invalidate(); };
  document.getElementById('buildingsBtn').onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };

  setView('oblique');
  setHeight(3);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = { setView, setHeight, setSchematic, stats: sim.stats, bar, buildings: buildings.info, roads: () => roads.info(), labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent), setLabels(v) { labelsOn = v; placeLabels(); }, renderNow() { renderer.render(scene, camera); placeLabels(); } };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '강릉 경포호 일대입니다. 바다와 호수 사이를 좁고 긴 모래 띠인 사주가 막고 있고, 사주의 바다 쪽에는 경포해변(사빈)이 펼쳐집니다. 사주가 만의 입구를 거의 막아 생긴 이런 호수가 석호이며, 동해안에 많습니다. 경포호는 강문해변 쪽 좁은 물길로 바다와 이어져 있고, 호수 남쪽으로는 경포천이 흐릅니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '호수, 하천, 해변, 해안선, 도로, 지명 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '논밭과 숲은 땅 높이에서 규칙으로 만든 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
