// © 2026 김용현
// 동강 실제 지형 화면. 땅 높이만 실제 자료이고 과거 단계는 만들지 않는다.
import * as THREE from 'three';
import { createStage } from '../../shared/stage3d.js';
import { loadTerrainUniforms, splatTex, patchTerrain } from '../../shared/terrain-material.js';
import { buildTrees, buildNearTrees } from '../../shared/vegetation.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap, drawProfile } from '../../shared/map-views.js';
import { createHeightScale } from '../../shared/height.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { buildDonggang, sampleH, N, SIZE, CELL, WATER_LEVEL } from './sim.js';
import { createSchematic } from './schematic.js';

const MAIN = 0; // 물길 목록에서 동강 본류의 번호

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
// 강과 골짜기(약 450m 아래)는 지정 배율로 키우고, 그 위의 산은 덜 키운다.
// 동강은 산이 높아 3배까지만 둔다. 4배 이상이면 능선이 바늘처럼 서서 형태가 무너진다.
const scale = createHeightScale(3, 450);
const ex = scale.apply;
let currentView = 'oblique';

const statusEl = document.getElementById('status');
const say = t => { statusEl.textContent = t; };

const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
  mount: document.getElementById('stage'),
  size: SIZE,
  fogDensity: 0.00007 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
// 고도 자료를 직접 보고 고른 자리(격자 칸). 강은 물길 계산 결과에서 가장 가까운 점으로 옮겨 놓는다.
const PLACES = {
  river: { name: '동강', grid: [240, 185], lift: 60 },
  meander: { name: '감입 곡류', grid: [205, 342], lift: 90 },
  core: { name: '굽이 안쪽 언덕', grid: [186, 270], lift: 55 },
  neck: { name: '좁아진 목', grid: [263, 196], lift: 60 },
};
const PROFILE = { from: [110, 270], to: [340, 270] };

const VIEWS = {
  oblique: { p: [-1100, 2500, 5400], t: [-150, 300, 250] },
  above: { p: [-100, 4700, 1500], t: [0, 0, 100] },
  close: { p: [-1500, 1150, 3000], t: [-800, 260, 500] },
};
function setView(name) {
  const v = VIEWS[name];
  currentView = name;
  const z = portraitZoom(), ty = ex(v.t[1]);
  camera.position.set(v.t[0] + (v.p[0] - v.t[0]) * z, ty + (v.p[1] * (1 + (scale.factor - 1) * 0.5) - ty) * z, v.t[2] + (v.p[2] - v.t[2]) * z);
  controls.target.set(v.t[0], ty, v.t[2]);
  controls.update();
  invalidate();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

async function start() {
  say('재질 불러오는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/donggang-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildDonggang(dem);
  const stage = sim.stage;

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 3;
    pos[k] = (i / (N - 1) - 0.5) * SIZE; pos[k + 2] = (j / (N - 1) - 0.5) * SIZE;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
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

  // 물 흐르는 방향: 본류 위에 납작한 흰 세모를 일정한 간격으로 놓는다(정지 그림). 물길 번호가 커지는 쪽이 아래쪽이다.
  const main = sim.paths[MAIN], ARROW_STEP = 55;
  const arrowIdx = [];
  for (let t = 40; t < main.length - 40; t += ARROW_STEP) arrowIdx.push(t);
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const flowArrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xf4fbff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false }), arrowIdx.length);
  flowArrows.frustumCulled = false;
  scene.add(flowArrows);
  const am = new THREE.Matrix4(), as = new THREE.Matrix4().makeScale(100, 1, 55);
  const placeArrows = () => {
    arrowIdx.forEach((t, n) => {
      const p = main[t], q = main[t + 3], th = Math.atan2(q.y - p.y, q.x - p.x), w = world(p.x, p.y);
      am.makeRotationY(-th).multiply(as);
      am.setPosition(w.x, ex(sampleH(sim.h, p.x, p.y)) + 14, w.z);
      flowArrows.setMatrixAt(n, am);
    });
    flowArrows.instanceMatrix.needsUpdate = true;
  };

  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
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
    renderer.shadowMap.needsUpdate = true;
  };

  // 지형도 위에 그리는 것: 물 흐르는 방향 화살표와 단면을 자른 A-B 점선
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    ctx.strokeStyle = '#0b3a66'; ctx.fillStyle = '#0b3a66'; ctx.lineWidth = 1.6;
    for (let t = 40; t < main.length - 40; t += ARROW_STEP) {
      const p = main[t], q = main[t + 3], th = Math.atan2(q.y - p.y, q.x - p.x), x = ox + p.x * sc, y = oy + p.y * sc, L = 11;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(th) * L, y - Math.sin(th) * L); ctx.lineTo(x + Math.cos(th) * L, y + Math.sin(th) * L); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + Math.cos(th) * (L + 5), y + Math.sin(th) * (L + 5));
      ctx.lineTo(x + Math.cos(th) * (L - 3) - Math.sin(th) * 6, y + Math.sin(th) * (L - 3) + Math.cos(th) * 6);
      ctx.lineTo(x + Math.cos(th) * (L - 3) + Math.sin(th) * 6, y + Math.sin(th) * (L - 3) - Math.cos(th) * 6);
      ctx.closePath(); ctx.fill();
    }
    const [ax, ay] = PROFILE.from, [bx, by] = PROFILE.to;
    ctx.strokeStyle = '#b3261e'; ctx.fillStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(ox + ax * sc, oy + ay * sc); ctx.lineTo(ox + bx * sc, oy + by * sc); ctx.stroke();
    ctx.setLineDash([]); ctx.font = '700 17px "Malgun Gothic",sans-serif';
    ctx.fillText('A', ox + ax * sc - 16, oy + ay * sc + 6); ctx.fillText('B', ox + bx * sc + 6, oy + by * sc + 6);
    ctx.font = '13px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#0b3a66';
    ctx.fillText('남색 화살표: 물 흐르는 방향', ox + 10, oy + 36);
    ctx.restore();
  };

  const mapView = document.getElementById('mapView');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay });
    if (showing === 'profile') {
      const [ax, ay] = PROFILE.from, [bx, by] = PROFILE.to;
      drawProfile(mapView, { h: sim.h, N, from: { x: ax, y: ay }, to: { x: bx, y: by }, lengthM: Math.hypot(bx - ax, by - ay) * CELL, ve: scale.factor, note: '지형도의 A-B선을 따라 자른 단면입니다.' });
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
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name);
  const v3 = new THREE.Vector3();
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    for (const [key, l] of Object.entries(PLACES)) {
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, ex(sampleH(sim.h, l.grid[0], l.grid[1])) + l.lift, w.z).project(camera);
      if (v3.z <= 1) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: key === 'meander' ? 3 : 2, keep: true });
    }
    labelLayer.place(list);
  }

  const schemEl = document.getElementById('schem');
  // 모식도에서 감입 곡류를 누르면 3D의 감입 곡류 이름표가 강조된다. 이 화면에는 다른 구역의 이름표가 없다.
  createSchematic(schemEl, { steps: true, stage: 3, onZone: zone => { labelLayer.element('meander').classList.toggle('hi', zone === 'meander'); invalidate(); } });
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
      : `강과 골짜기의 높이를 ${k}배로 과장했습니다. 산은 덜 과장했습니다. 끌어서 돌리고 휠로 확대합니다.`;
    drawMapView();
    placeLabels();
  }
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };

  setView('oblique');
  setHeight(3);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = { setView, setHeight, setSchematic, stats: sim.stats, arrowCount: arrowIdx.length, labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent), setLabels(v) { labelsOn = v; placeLabels(); }, renderNow() { renderer.render(scene, camera); placeLabels(); } };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '정선, 평창, 영월이 만나는 곳의 동강입니다. 강이 깊은 골짜기 속에서 크게 굽이칩니다. 위에서 보거나 등고선 지형도로 보면 굽이가 또렷합니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '물길, 논밭, 숲, 암벽은 땅 높이에서 규칙으로 만든 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
