// © 2026 김용현
// 정동진 해안 단구 실제 지형 화면. 땅 높이만 실제 자료이고 과거 단계는 만들지 않는다.
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
import { buildJeongdongjin, sampleH, terraceProfile, profileMarks, placesOf, medianHeight, N, SIZE, CELL, WATER_LEVEL, SHIP } from './sim.js';
import { createShip } from './ship.js';
import { createSchematic } from './schematic.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const scale = createHeightScale(2, 300);
const ex = scale.apply;
let currentView = 'oblique';

const PROFILE_NOTE = '심곡리 남쪽을 내륙에서 바다까지 동서로 곧게 자른 높이이며, 옆으로 몇 칸의 가운데 값입니다. 뒤쪽 비탈과 바닷가 절벽 사이에 평평한 땅이 있고, 약 85m에서 경사가 뚜렷이 바뀝니다. 원자료 간격이 약 30m라 절벽이 실제보다 완만하게 나오고, 바닷가의 낮은 띠는 자료의 뭉개짐일 수 있습니다. 물속 바닥은 자료에 없어 바다는 0m로 그립니다.';

const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };

const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
  mount: document.getElementById('stage'),
  size: SIZE,
  fogDensity: 0.00003 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
// 바다에서 육지를 바라본다. 단구가 계단처럼 보이는 방향이다.
const VIEWS = {
  oblique: { p: [8200, 3600, 3300], t: [800, 80, -420] },
  above: { p: [1000, 10800, 1500], t: [1000, 0, 100] },
  close: { p: [5200, 1300, 1000], t: [1250, 110, -250] },
  // 배 모양 건물을 바다 쪽에서 본다.
  ship: { p: [1800, 400, -1300], t: [1225, 65, -1715] },
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
  const dem = new Uint16Array(await (await fetch(new URL('./data/jeongdongjin-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildJeongdongjin(dem);
  const stage = sim.stage, PLACES = placesOf(), line = terraceProfile(sim);

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
  // 바다: 서쪽을 바라보면 해 쪽이라 물 재질이 희게 번쩍인다. 고도 0m인 칸 바로 위에 파란 면을 깐다. 땅은 0.8m 위부터라 가려지지 않는다.
  const seaPlane = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ color: 0x2f78b4 }));
  seaPlane.rotation.x = -Math.PI / 2;
  scene.add(seaPlane);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  const ship = createShip(SHIP), shipAt = world(SHIP.grid[0], SHIP.grid[1]);
  ship.position.set(shipAt.x, 0, shipAt.z);
  ship.rotation.y = SHIP.heading;
  scene.add(ship);

  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
  const applyHeight = () => {
    // 바다로 치지 않은 땅이 바다 면 아래로 내려가 호수처럼 보이지 않게 한다.
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(sim.sea[k] ? sim.h[k] : Math.max(sim.h[k], 0.8));
    seaPlane.position.y = ex(0.5);
    // 건물은 땅 위에 그대로 얹는다. 건물 높이는 과장하지 않는다.
    ship.position.y = ex(medianHeight(sim.h, SHIP.grid[0], SHIP.grid[1], 3)) + 2;
    fillNormals(N, CELL, k => pos[k * 3 + 1], nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    if (treeMesh) scene.remove(treeMesh);
    if (nearMesh) scene.remove(nearMesh);
    const key = scale.factor;
    treeMesh = treeCache[key] ??= buildTrees(veg, stage, sim.mountain);
    nearMesh = nearCache[key] ??= buildNearTrees(veg, stage, sim.mountain);
    scene.add(treeMesh, nearMesh);
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
    for (const key of ['terraceN', 'terraceS', 'valley', 'ship', 'station', 'simgok', 'geumjin', 'sea']) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, w = ctx.measureText(l.name).width;
      const dot = key === 'ship' || key === 'station' || key === 'simgok' || key === 'geumjin';
      const tx = dot ? x + 7 : x - w / 2;
      if (dot) { ctx.fillStyle = '#20302a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(l.name, tx, y + 5);
      ctx.fillStyle = '#20302a'; ctx.fillText(l.name, tx, y + 5);
    }
    ctx.restore();
  };

  const mapView = document.getElementById('mapView');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 10 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 0, hi: 120, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawPathProfile(mapView, { points: line, marks: profileMarks(line), from: 'A 내륙', to: 'B 동해', note: PROFILE_NOTE });
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
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    for (const [key, l] of Object.entries(PLACES)) {
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, ex(sampleH(sim.h, l.grid[0], l.grid[1])) + (key === 'ship' ? 60 : 20), w.z).project(camera);
      if (v3.z <= 1) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: key.startsWith('terrace') ? 3 : 2, keep: true });
    }
    labelLayer.place(list);
  }

  const schemEl = document.getElementById('schem');
  const ZONE_LABEL = { terrace: 'terraceN', scarp: 'back', cliff: 'cliff' };
  createSchematic(schemEl, { steps: true, stage: 3, onZone: zone => { for (const [z, key] of Object.entries(ZONE_LABEL)) labelLayer.element(key).classList.toggle('hi', z === zone); invalidate(); } });
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

  setView('oblique');
  setHeight(2);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = { setView, setHeight, setSchematic, stats: sim.stats, labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent), setLabels(v) { labelsOn = v; placeLabels(); }, renderNow() { renderer.render(scene, camera); placeLabels(); } };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '강릉 정동진 남쪽 심곡리 일대입니다. 바닷가 절벽 바로 위에 높이 약 60~85m의 평평한 땅이 펼쳐집니다. 오늘날 파랑이 닿지 못하는 높이의 옛 해안 지형, 곧 해안 단구입니다. 정동진 해안 단구는 천연기념물입니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '논밭과 숲은 땅 높이에서 규칙으로 만든 예시입니다.', '지명 위치와 건물 윤곽: OpenStreetMap contributors (ODbL).', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
