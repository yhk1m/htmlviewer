// © 2026 김용현
// 김해 낙동강 하구 실제 지형 화면. 땅 높이만 실제 자료이고 과거 단계는 만들지 않는다.
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
import { createBuildingLayer, clearUnder } from '../../shared/buildings.js';
import { buildGimhae, sampleH, plainProfile, profileMarks, placesOf, N, SIZE, CELL, WATER_LEVEL } from './sim.js';
import { createSchematic } from './schematic.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
// 낮은 평원(약 30m 아래)은 지정 배율로 키우고, 그 위의 산은 덜 키운다.
const scale = createHeightScale(5, 30);
const ex = scale.apply;
let currentView = 'oblique';

const PROFILE_NOTE = '김해 평야 가운데의 평강천을 따라 내려와 명지를 지나 바다까지 걸으며, 둘레 칸의 가운데 값으로 잰 높이입니다. 산지를 흐르는 강과 달리 긴 거리에 높이 차이가 몇 m뿐입니다. 원자료 간격이 약 30m이고 논밭 정리와 둑, 시가지가 섞여 있어 명지 쪽처럼 불쑥 높은 곳은 지형이 아닐 수 있습니다. 물속 바닥은 자료에 없어 바다는 0m로 그립니다.';

const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };

const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
  mount: document.getElementById('stage'),
  size: SIZE,
  fogDensity: 0.00002 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
const VIEWS = {
  oblique: { p: [-1800, 12600, 22000], t: [0, 30, 1900] },
  above: { p: [0, 23000, 4000], t: [0, 0, 280] },
  close: { p: [-1500, 2600, 9400], t: [200, 20, 3400] },
};
function setView(name) {
  const v = VIEWS[name];
  currentView = name;
  // 폰에서는 아래쪽 안내 칸이 화면을 가리므로 더 멀리서 봐야 하구까지 들어온다.
  const z = portraitZoom() * (PHONE ? 1.5 : 1), ty = ex(v.t[1]);
  camera.position.set(v.t[0] + (v.p[0] - v.t[0]) * z, ty + (v.p[1] - ty) * z, v.t[2] + (v.p[2] - v.t[2]) * z);
  controls.target.set(v.t[0], ty, v.t[2]);
  controls.update();
  invalidate();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

async function start() {
  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/gimhae-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildGimhae(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/gimhae-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest);
  const stage = sim.stage, PLACES = placesOf(sim), fieldLine = plainProfile(sim);

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
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  // 물 흐르는 방향: 낙동강과 서낙동강 위에 납작한 흰 세모를 일정한 간격으로 놓는다. 물길 번호가 커지는 쪽이 아래쪽이다.
  const ARROW_STEP = 60, arrowAt = [];
  for (const path of sim.paths.slice(0, 2)) for (let t = 20; t < path.length - 20; t += ARROW_STEP) arrowAt.push([path, t]);
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const flowArrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xf4fbff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false }), arrowAt.length);
  flowArrows.frustumCulled = false;
  scene.add(flowArrows);
  const am = new THREE.Matrix4(), as = new THREE.Matrix4().makeScale(170, 1, 95);
  const placeArrows = () => {
    arrowAt.forEach(([path, t], n) => {
      const p = path[t], q = path[t + 3], th = Math.atan2(q.y - p.y, q.x - p.x), w = world(p.x, p.y);
      am.makeRotationY(-th).multiply(as);
      am.setPosition(w.x, ex(sampleH(sim.h, p.x, p.y)) + 16, w.z);
      flowArrows.setMatrixAt(n, am);
    });
    flowArrows.instanceMatrix.needsUpdate = true;
  };

  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld: (i, j) => { const w = world(i, j); return [w.x, w.z]; }, groundAt: (i, j) => ex(sampleH(sim.h, i, j)) });
  const applyHeight = () => {
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(sim.h[k]);
    fillNormals(N, CELL, k => pos[k * 3 + 1], nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    placeArrows();
    if (treeMesh) scene.remove(treeMesh);
    if (nearMesh) scene.remove(nearMesh);
    const key = scale.factor;
    treeMesh = treeCache[key] ??= buildTrees(veg, stage, sim.mountain);
    nearMesh = nearCache[key] ??= buildNearTrees(veg, stage, sim.mountain);
    scene.add(treeMesh, nearMesh);
    buildings.place(scale.factor);
    renderer.shadowMap.needsUpdate = true;
  };

  // 지도 위에 그리는 것: 물 흐르는 방향 화살표, 평원 가운데를 따라 잰 A-B 선, 곳 이름
  const mapOverlay = (ctx, { ox, oy, sc, side }) => {
    ctx.save();
    ctx.strokeStyle = '#0b3a66'; ctx.fillStyle = '#0b3a66'; ctx.lineWidth = 1.6;
    for (const [path, t] of arrowAt) {
      const p = path[t], q = path[t + 3], th = Math.atan2(q.y - p.y, q.x - p.x), x = ox + p.x * sc, y = oy + p.y * sc, L = 9;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(th) * L, y - Math.sin(th) * L); ctx.lineTo(x + Math.cos(th) * L, y + Math.sin(th) * L); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + Math.cos(th) * (L + 5), y + Math.sin(th) * (L + 5));
      ctx.lineTo(x + Math.cos(th) * (L - 3) - Math.sin(th) * 5, y + Math.sin(th) * (L - 3) + Math.cos(th) * 5);
      ctx.lineTo(x + Math.cos(th) * (L - 3) + Math.sin(th) * 5, y + Math.sin(th) * (L - 3) - Math.cos(th) * 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    fieldLine.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = fieldLine[0], B = fieldLine[fieldLine.length - 1];
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc - 20, oy + A.y * sc + 6); ctx.fillText('A', ox + A.x * sc - 20, oy + A.y * sc + 6);
    ctx.strokeText('B', ox + B.x * sc + 28, oy + B.y * sc + 6); ctx.fillText('B', ox + B.x * sc + 28, oy + B.y * sc + 6);
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    for (const key of ['main', 'seo', 'plain', 'eulsuk', 'dam', 'myeongji', 'bars']) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, w = ctx.measureText(l.name).width;
      // 작은 곳은 점을 찍고 오른쪽에 쓴다.
      const dot = key === 'eulsuk' || key === 'dam' || key === 'myeongji';
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
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 0, hi: 8, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') {
      drawPathProfile(mapView, { points: fieldLine, marks: profileMarks(fieldLine), from: 'A 평원 위쪽', to: 'B 바다', note: PROFILE_NOTE });
    }
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
      v3.set(w.x, ex(sampleH(sim.h, l.grid[0], l.grid[1])) + 20, w.z).project(camera);
      if (v3.z <= 1) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: key === 'plain' || key === 'eulsuk' ? 3 : 2, keep: true });
    }
    labelLayer.place(list);
  }

  const schemEl = document.getElementById('schem');
  const ZONE_LABEL = { river: 'main', branch: 'seo', island: 'eulsuk', plain: 'plain' };
  createSchematic(schemEl, { steps: true, stage: 2, onZone: zone => { for (const [z, key] of Object.entries(ZONE_LABEL)) labelLayer.element(key).classList.toggle('hi', z === zone); invalidate(); } });
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
      : `들판의 높이를 ${k}배로 과장했습니다. 산은 덜 과장했습니다. 끌어서 돌리고 휠로 확대합니다.`;
    drawMapView();
    placeLabels();
  }
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('buildingsBtn').onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };

  setView('oblique');
  setHeight(5);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = { buildings: buildings.info, setView, setHeight, setSchematic, stats: sim.stats, arrowCount: arrowAt.length, labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent), setLabels(v) { labelsOn = v; placeLabels(); }, renderNow() { renderer.render(scene, camera); placeLabels(); } };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '김해 낙동강 하구입니다. 낙동강과 서낙동강 사이의 김해 평야는 높이가 대부분 약 1~4m로 낮고 평평합니다. 낙동강이 쌓는 퇴적 속도가 조차가 작은 남해의 침식 속도보다 빨라 생긴 땅입니다. 낮은 땅 지도와 단면에서 또렷합니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '물, 논밭, 숲은 땅 높이와 물길 선에서 규칙으로 만든 예시입니다.', '물길 참고: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료(작은 건물은 뺐습니다).', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
