// © 2026 김용현
import * as THREE from 'three';
import { createStage } from '../../shared/stage3d.js';
import { loadTerrainUniforms, splatTex, patchTerrain } from '../../shared/terrain-material.js';
import { buildTrees, buildNearTrees, buildTown } from '../../shared/vegetation.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { SITES, N, sampleH } from './sim.js';
import { runSim } from './sim-client.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap, drawProfile } from '../../shared/map-views.js';

// 계산 지형은 화면에서 뺐다. 검사용으로만 ?site=synthetic 으로 열 수 있다.
const SITE = new URLSearchParams(location.search).get('site') === 'synthetic' ? 'synthetic' : 'gurye';
const SIZE = SITES[SITE].size, CELL = SIZE / (N - 1), WATER_LEVEL = SITES[SITE].waterLevel;
const GURYE = SITE === 'gurye';

import { createSchematic } from './schematic.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createRoadLayer } from '../../shared/roads.js';
import { createBuildingLayer, clearUnder } from '../../shared/buildings.js';

// 폰에서는 화면 배치와 부담을 줄인다.
const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();

// 높이 과장: 낮은 땅(선상지가 있는 높이)은 지정 배율로 키우고, 산은 덜 키워 형태를 지킨다.
import { createHeightScale } from '../../shared/height.js';
const scale = createHeightScale(3);
const ex = scale.apply;
let currentView = 'oblique';

const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };
const nextFrame = () => new Promise(r => setTimeout(r, 30));

const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
  mount: document.getElementById('stage'),
  size: SIZE,
  fogDensity: (SITE === 'gurye' ? 0.00012 : 0.00016) * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});
const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: SITE === 'gurye', treeFactor: Q.trees };

const VIEWS = GURYE ? {
  oblique: { p: [-2600, 520, 3000], t: [260, 70, 330] },
  above: { p: [-1300, 3400, 3200], t: [250, 0, 100] },
  close: { p: [-420, 190, 1000], t: [820, 100, -400] },
  apex: { p: [-420, 240, 600], t: [810, 120, -300] },
} : {
  oblique: { p: [100, 330, 2820], t: [-225, 40, -520] },
  above: { p: [-700, 2500, 2300], t: [-220, 0, 200] },
  close: { p: [-420, 130, 180], t: [-210, 110, -760] },
  apex: { p: [-340, 230, 560], t: [-200, 120, -860] },
};
function setView(name) {
  const v = VIEWS[name];
  currentView = name;
  const z = portraitZoom(), ty = ex(v.t[1]);
  camera.position.set(v.t[0] + (v.p[0] - v.t[0]) * z, ty + (v.p[1] * (1 + (scale.factor - 1) * 0.7) - ty) * z, v.t[2] + (v.p[2] - v.t[2]) * z);
  controls.target.set(v.t[0], ty, v.t[2]);
  controls.update();
  invalidate();
}


const worldPos = (x, z, h) => {
  const px = (x / SIZE + 0.5) * (N - 1), py = (z / SIZE + 0.5) * (N - 1);
  return new THREE.Vector3(x, ex(sampleH(h, px, py)), z);
};


async function start() {
  say('재질 불러오는 중');
  await nextFrame();
  say('지형 계산 중');
  await nextFrame();
  const t0 = performance.now();
  const sim = await runSim(SITE, say);
  // 구례는 오늘날 단계에만 실제 건물을 얹고, 그 자리에는 나무를 심지 않는다.
  let buildingData = null, roadData = null;
  if (GURYE) {
    say('건물 자료 받는 중');
    buildingData = await (await fetch(new URL('./data/gurye-buildings.json', import.meta.url))).json();
    clearUnder(buildingData, N, sim.stages[2].forest);
    roadData = await (await fetch(new URL('./data/gurye-roads.json', import.meta.url))).json();
  }
  const simMs = Math.round(performance.now() - t0);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 3;
    pos[k] = (i / (N - 1) - 0.5) * SIZE; pos[k + 2] = (j / (N - 1) - 0.5) * SIZE;
  }
  const indices = gridIndex(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));

  const uniforms = await loadTerrainUniforms(renderer, SIZE);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  const river = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1a2f2e, roughness: 0.2, metalness: 0, envMapIntensity: 0.9 }));
  river.position.y = ex(WATER_LEVEL);
  river.receiveShadow = true;
  if (!GURYE) scene.add(river);

  const stageTex = sim.stages.map(s => ({ a: splatTex(s.splatA, N), b: splatTex(s.splatB, N) }));
  const schematic = createSchematic(document.getElementById('schem'), key => {
    for (const l of LABEL_SPOTS) labelLayer.element(l.key).classList.toggle('hi', l.key === key);
  });
  const treeCache = {}, townCache = {};
  const buildings = buildingData && createBuildingLayer(THREE, scene, buildingData, { toWorld: (i, j) => [(i / (N - 1) - 0.5) * SIZE, (j / (N - 1) - 0.5) * SIZE], groundAt: (i, j) => ex(sampleH(sim.stages[2].h, i, j)) });
  const roads = roadData && createRoadLayer(THREE, scene, roadData, { toWorld: (i, j) => [(i / (N - 1) - 0.5) * SIZE, (j / (N - 1) - 0.5) * SIZE], groundAt: (i, j) => ex(sampleH(sim.stages[2].h, i, j)), cellM: CELL });
  let treeMesh = null, nearMesh = null, townMesh = null, stageNow = -1;
  const nearCache = {};

  const setStage = n => {
    const s = sim.stages[n];
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(s.h[k]);
    fillNormals(N, CELL, k => pos[k * 3 + 1], nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    uniforms.tA.value = stageTex[n].a; uniforms.tB.value = stageTex[n].b;
    if (treeMesh) scene.remove(treeMesh);
    if (townMesh) { scene.remove(townMesh); townMesh = null; }
    const ck = `${n}:${scale.factor}`;
    treeMesh = treeCache[ck] ??= buildTrees(veg, s, sim.mountain);
    scene.add(treeMesh);
    if (nearMesh) scene.remove(nearMesh);
    nearMesh = nearCache[ck] ??= buildNearTrees(veg, s, sim.mountain);
    scene.add(nearMesh);
    if (buildings) {
      if (n === 2) { buildings.place(scale.factor); roads.place(scale.factor); }
      buildings.allow(n === 2);
      roads.allow(n === 2);
      document.getElementById('buildingsBtn').disabled = n !== 2;
      document.getElementById('roadsBtn').disabled = n !== 2;
    } else if (n === 2) { townMesh = townCache[ck] ??= buildTown(veg, s, sim.places); scene.add(townMesh); }
    stageNow = n;
    document.querySelectorAll('[data-stage]').forEach(b => b.classList.toggle('on', +b.dataset.stage === n));
    document.getElementById('note').textContent = (GURYE ? NOTES_GURYE : NOTES)[n];
    schematic.setStage(n);
    renderer.shadowMap.needsUpdate = true;
    drawMapView();
    placeLabels();
    invalidate();
  };

  const mapView = document.getElementById('mapView');
  let showing = '3d';
  const toGrid = p => ({ x: (p.x / SIZE + 0.5) * (N - 1), y: (p.z / SIZE + 0.5) * (N - 1) });
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    const s = sim.stages[stageNow];
    if (showing === 'map') drawContourMap(mapView, { h: s.h, N, sizeM: SIZE, water: s.water, north: SITE === 'gurye' });
    if (showing === 'profile') {
      const from = toGrid(sim.places.profile.from), to = toGrid(sim.places.profile.to);
      drawProfile(mapView, { h: s.h, N, from, to, lengthM: Math.hypot(to.x - from.x, to.y - from.y) * CELL, ve: scale.factor });
    }
  };
  document.querySelectorAll('[data-show]').forEach(b => b.onclick = () => {
    showing = b.dataset.show;
    document.querySelectorAll('[data-show]').forEach(o => o.classList.toggle('on', o === b));
    drawMapView();
    placeLabels();
  });

  function setHeight(k) {
    scale.set(k);
    river.position.y = ex(WATER_LEVEL);
    setStage(stageNow);
    setView(currentView);
    document.querySelectorAll('[data-height]').forEach(b => b.classList.toggle('on', +b.dataset.height === k));
    document.getElementById('heightBadge').textContent = k === 1 ? '실제 높이' : `높이 ${k}배`;
    document.getElementById('heightNote').textContent = k === 1
      ? '실제 높이 그대로입니다. 경사가 3에서 4%뿐이라 선상지가 거의 평평해 보입니다.'
      : `낮은 땅의 높이를 ${k}배로 과장했습니다. 산은 덜 과장했습니다. 끌어서 돌리고 휠로 확대합니다.`;
  }

  let labelsOn = true;
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  labelLayer.add('mouth', '곡구');
  labelLayer.add('apex', '선정', '곡구 바로 앞. 굵은 자갈이 많습니다.');
  labelLayer.add('mid', '선앙', '가운데 부분. 물이 땅속으로 스며들어 지하수면이 깊습니다.');
  labelLayer.add('toe', '선단', '끝부분. 스며든 물이 다시 솟아납니다.');
  // 부채꼴이 아직 작은 과거 단계에서는 선앙과 선단 이름표를 곡구 쪽으로 당긴다.
  const STAGE_REACH = [0.45, 0.75, 1];
  const shrunk = p => {
    const a = sim.places.apex, f = STAGE_REACH[stageNow < 0 ? 2 : stageNow];
    return { x: a.x + (p.x - a.x) * f, z: a.z + (p.z - a.z) * f };
  };
  const LABEL_SPOTS = [
    { key: 'mouth', get: () => sim.places.mouth, lift: 30 },
    { key: 'apex', get: () => sim.places.apex, lift: 25 },
    { key: 'mid', get: () => shrunk(sim.places.mid), lift: 20 },
    { key: 'toe', get: () => shrunk(sim.places.toe), lift: 18 },
  ];
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const s = sim.stages[stageNow < 0 ? 2 : stageNow];
    const list = [];
    for (const l of LABEL_SPOTS) {
      const p = l.get(), v = worldPos(p.x, p.z, s.h);
      v.y += l.lift;
      v.project(camera);
      if (v.z <= 1) list.push({ key: l.key, x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, priority: l.key === 'mouth' || l.key === 'apex' ? 3 : l.key === 'mid' ? 2 : 1, keep: true });
    }
    labelLayer.place(list);
  }
  // 모식도가 열리면 3D 화면의 중심을 남은 공간 가운데로 옮긴다.
  const schemEl = document.getElementById('schem');
  const fitView = () => {
    const phone = isPhone();
    const dock = schemEl.hidden || phone ? 0 : schemEl.offsetWidth;
    const sheet = schemEl.hidden || !phone ? 0 : schemEl.offsetHeight;
    const side = document.getElementById('panel');
    const left = phone || document.body.matches('.panel-closed, .merged') ? 0 : side.offsetWidth + 20;
    camera.setViewOffset(innerWidth, innerHeight, (dock - left) / 2, sheet / 2, innerWidth, innerHeight);
    document.body.classList.toggle('noschem', schemEl.hidden);
    drawMapView();
    placeLabels();
    invalidate();
  };
  const setSchematic = on => { schemEl.hidden = !on; document.getElementById('schemBtn').classList.toggle('on', on); fitView(); };
  document.getElementById('schemBtn').onclick = () => setSchematic(schemEl.hidden);
  addEventListener('resize', fitView);
  addEventListener('resize', drawMapView);
  const playBtn = document.getElementById('playStages');
  let playTimer = null;
  const stopPlay = () => { clearInterval(playTimer); playTimer = null; playBtn.classList.remove('on'); playBtn.textContent = '재생'; };
  playBtn.onclick = () => {
    if (playTimer) { stopPlay(); return; }
    let n = 0;
    setStage(n);
    playBtn.classList.add('on'); playBtn.textContent = '멈춤';
    playTimer = setInterval(() => { n++; setStage(n); if (n === 2) stopPlay(); }, 3000);
  };
  document.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { stopPlay(); setStage(+b.dataset.stage); });
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { setView(b.dataset.view); document.querySelectorAll('[data-view]').forEach(o => o.classList.toggle('on', o === b)); });
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  const buildingsBtn = document.getElementById('buildingsBtn');
  buildingsBtn.hidden = !buildings;
  buildingsBtn.onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };
  const roadsBtn = document.getElementById('roadsBtn');
  roadsBtn.hidden = !roads;
  roadsBtn.onclick = e => { e.currentTarget.classList.toggle('on', roads.toggle()); invalidate(); };
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('grainBtn').onclick = e => { uniforms.uGrainView.value = uniforms.uGrainView.value ? 0 : 1; e.currentTarget.classList.toggle('on', !!uniforms.uGrainView.value); document.getElementById('legend').hidden = !uniforms.uGrainView.value; invalidate(); };

  setView('oblique');
  stageNow = 2;
  setHeight(3);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;

  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = { buildings: () => (buildings ? buildings.info() : null), roads: () => (roads ? roads.info() : null), setSchematic, setHeight,  setZone(k) { document.querySelector(`#schem [data-zone="${k}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })); }, setStage, setView, sim: sim.stats, places: sim.places, simMs, setLabels(v) { labelsOn = v; placeLabels(); }, setGrain(v) { uniforms.uGrainView.value = v ? 1 : 0; document.getElementById('legend').hidden = !v; invalidate(); }, renderNow() { renderer.render(scene, camera); placeLabels(); }, info: () => renderer.info.render };
  window.__APP_READY = true;
}

const NOTES_GURYE = [
  '초기(추정): 지리산 골짜기에서 홍수 때 쏟아져 나온 자갈과 모래가 곡구 앞에 쌓이기 시작합니다. 우리나라 선상지는 대체로 산에서 부서진 돌이 많이 내려오던 빙기에 만들어진 것으로 봅니다.',
  '성장(추정): 물길이 옮겨 다니며 부채꼴이 넓어집니다. 초기와 성장은 계산으로 복원한 모습입니다.',
  '오늘날: 실제 고도 자료로 그린 구례 화엄사 선상지입니다. 지리산에서 나온 지류가 넓은 들로 나오는 곡구에 생겼습니다. 곡구에서 약 3km 내려가며 고도가 130m에서 40m로 낮아집니다. 표면의 잔 기복은 더한 것입니다. 건물은 브이월드 건물 자료의 바닥 윤곽을 지상 층수에 3m를 곱한 높이로 올린 덩어리이고, 높이는 과장하지 않습니다. 도로는 OpenStreetMap의 도로 선을 등급별 대표 폭으로 땅 위에 얹은 띠라 실제 폭과 다를 수 있습니다.',
];
const NOTES = [
  '초기: 곡구에서 나온 물이 자갈을 쏟아 놓기 시작합니다.',
  '성장: 쌓인 곳이 높아지면 물길이 낮은 쪽으로 옮겨 가며 부채꼴이 넓어집니다.',
  '오늘날: 평소 물길은 하나로 줄었습니다. 선앙은 물이 땅속으로 스며들어 예로부터 밭과 과수원으로 많이 썼고, 지하수를 얻기 쉬운 선정과 선단에 마을이 모였습니다.',
];

document.getElementById('title').textContent = GURYE ? '구례 화엄사 선상지' : '계산으로 만든 선상지';
document.querySelector(`[data-site="${SITE}"]`)?.classList.add('on');
document.getElementById('foot').innerHTML = (GURYE
  ? ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '논밭, 나무, 물길은 위치가 실제와 다른 예시입니다.', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '표면 재질: ambientCG (CC0)']
  : ['표면 재질: ambientCG (CC0)']).map(t => `<span>${t}</span>`).join(' ');
document.querySelectorAll('[data-site]').forEach(b => b.onclick = () => { location.href = b.dataset.site === 'model' ? './model.html' : './terrain.html'; });

start().catch(e => { say('오류: ' + e.message); console.error(e); });
