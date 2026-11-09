// © 2026 김용현
// 순천만 실제 지형 화면. 땅 높이만 실제 자료이고, 해안선과 갯벌 일부, 갈대밭, 하천의 자리는 지도 자료에서 옮겼다.
// 갯벌의 범위 대부분과 작은 갯골, 밀물과 썰물 때 수면 높이는 보이기 위해 정한 예시다.
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
import { buildSuncheon, sampleH, flatProfile, profileMarks, placesOf, N, SIZE, CELL, WATER_LEVEL, HIGH_WATER, LOW_WATER, LAND_MIN } from './sim.js';
import { createSchematic, FLOOD, EBB } from './schematic.js';
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
  fogDensity: 0.00004 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
// 만 어귀(남쪽) 바다 위에서 만 안쪽의 갯벌과 갈대밭 쪽을 바라본다.
const VIEWS = {
  oblique: { p: [900, 3300, 5200], t: [200, 0, -700] },
  above: { p: [0, 10500, 600], t: [0, 0, -200] },
  close: { p: [-200, 1100, 600], t: [600, 0, -1500] },
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

// 갯벌(빨강), 갈대밭(초록), 갯골의 젖은 정도(파랑)를 셋째 판으로 읽어 공용 땅 재질 위에 덧칠한다.
const MUD_GLSL = /* glsl */`
vec4 sc=texture2D(tC,suv+jit*.5);
vec3 mudC=mix(vec3(.15,.125,.10),vec3(.22,.185,.145),smoothstep(.3,.7,mid))*(.88+.24*fin);
mudC=mix(mudC,mudC*vec3(1.08,1.02,.92),smoothstep(.4,.7,mac));
mudC=mix(mudC,vec3(.075,.08,.08),smoothstep(.3,.9,sc.b)*.85);
vec3 reedC=mix(vec3(.30,.34,.10),vec3(.46,.48,.16),fin)*(.82+.3*tiny);
reedC=mix(reedC,vec3(.52,.47,.18),smoothstep(.5,.75,mid)*.45);
base=mix(base,mudC,smoothstep(.2,.7,sc.r));
base=mix(base,reedC,smoothstep(.2,.7,sc.g));
terrainRough=mix(terrainRough,.42-.2*sc.b,smoothstep(.2,.7,sc.r));
`;

async function start() {
  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/suncheon-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildSuncheon(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/suncheon-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest, sim.mountain);
  const roadData = await (await fetch(new URL('./data/suncheon-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim);

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
    sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D tA', 'uniform sampler2D tC;\nuniform sampler2D tA').replace('diffuseColor.rgb=base;', MUD_GLSL + 'diffuseColor.rgb=base;');
  };
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);
  // 바닷물 면: 밀물과 썰물에 따라 높이만 바뀐다. 육지는 밀물 때 수면보다 높게 그려 물에 잠기지 않는다.
  const seaPlane = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ color: 0x2f78b4, transparent: true, opacity: 0.9 }));
  seaPlane.rotation.x = -Math.PI / 2;
  scene.add(seaPlane);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  // 건물: 땅 높이 배율이 바뀌면 다시 얹는다. 건물 높이는 과장하지 않는다.
  // 도로: 땅 높이 배율이 바뀌면 다시 얹는다.
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld: (i, j) => { const w = world(i, j); return [w.x, w.z]; }, groundAt: (i, j) => ex(Math.max(sampleH(sim.h, i, j), LAND_MIN)), cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld: (i, j) => { const w = world(i, j); return [w.x, w.z]; }, groundAt: (i, j) => ex(Math.max(sampleH(sim.h, i, j), LAND_MIN)) });
  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
  let level = LOW_WATER, playing = false;
  const placeWater = () => { seaPlane.position.y = ex(level); };
  const applyHeight = () => {
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(sim.h[k]);
    placeWater();
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

  // 지도 위에 그리는 것: 갯벌과 갈대밭 색, 단면을 잰 A-B 선, 곳 이름
  const flatLayer = document.createElement('canvas');
  flatLayer.width = flatLayer.height = N;
  {
    const c = flatLayer.getContext('2d'), img = c.createImageData(N, N);
    for (let k = 0; k < N * N; k++) {
      const col = sim.reed[k] ? [150, 128, 70, 230] : sim.flat[k] ? (sim.creek[k] > 0.6 ? [96, 84, 70, 220] : [150, 128, 104, 200]) : null;
      if (col) img.data.set(col, k * 4);
    }
    c.putImageData(img, 0, 0);
  }
  const MAP_KEYS = ['flat', 'reed', 'channel', 'creek', 'isacheon', 'haeryong', 'bay', 'daedae', 'haechang', 'nongju', 'sangnae', 'haksan', 'usan'];
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    const line = flatProfile(sim, level);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(flatLayer, ox, oy, N * sc, N * sc);
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
    for (const key of MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, w = ctx.measureText(l.name).width;
      const tx = l.village ? x + 7 : x - w / 2;
      if (l.village) { ctx.fillStyle = '#20302a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(l.name, tx, y + 5);
      ctx.fillStyle = '#20302a'; ctx.fillText(l.name, tx, y + 5);
    }
    ctx.restore();
  };

  const profileNote = () => `북쪽 들판에서 해안선과 갯벌, 갯골을 지나 만 어귀 바다까지 곧게 자른 높이입니다. 지금은 ${level > 0 ? '밀물 때라 갯벌이 물에 잠겨 있습니다' : '썰물 때라 갯벌이 드러나 있습니다'}. 물속 바닥은 자료에 없어 물에 잠긴 곳은 그때의 수면 높이로 그렸고, 갯벌 면과 수면 높이는 보이기 위해 정한 값입니다. 원자료 간격이 약 30m라 좁은 둑과 물길은 뭉개집니다.`;
  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : '붉은 점선: 단면을 잰 길(북쪽 들판에서 만 어귀까지). 갈색: 썰물 때 드러나는 갯벌(예시), 누런색: 갈대밭';
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h.map(v => Math.max(v, 0)), N, sizeM: SIZE, water: sim.mapWater, north: true, overlay: mapOverlay, interval: 10 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 0, hi: 20, north: true, overlay: mapOverlay, water: sim.mapWater });
    if (showing === 'profile') { const line = flatProfile(sim, level); drawPathProfile(mapView, { points: line, marks: profileMarks(line, level), from: 'A 북쪽 들판', to: 'B 만 어귀', note: profileNote() }); }
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
  const KEY = { flat: 5, reed: 4, channel: 4, creek: 3, bay: 3, isacheon: 3, haeryong: 2 };
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    for (const [key, l] of Object.entries(PLACES)) {
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, ex(Math.max(sampleH(sim.h, l.grid[0], l.grid[1]), level)) + 15, w.z).project(camera);
      if (v3.z <= 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: KEY[key] ?? 1, keep: (KEY[key] ?? 1) >= 3 });
    }
    labelLayer.place(list);
  }

  const schemEl = document.getElementById('schem');
  // 모식도의 구역을 누르면 3D의 같은 이름표를 밝힌다. 모래, 섞임, 펄 갯벌은 실제 화면에서 나누지 않아 갯벌 전체를 밝힌다.
  const ZONE_LABEL = { sandflat: 'flat', mixedflat: 'flat', mudflat: 'flat', intertidal: 'flat', marsh: 'reed', creek: 'creek', river: 'isacheon', sea: 'bay' };
  const schematic = createSchematic(schemEl, { steps: true, stage: EBB, onZone: zone => { const on = ZONE_LABEL[zone]; for (const key of new Set(Object.values(ZONE_LABEL))) labelLayer.element(key).classList.toggle('hi', key === on); invalidate(); } });
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

  // 밀물과 썰물: 'high', 'low' 또는 수면 높이(m). 천천히 보기는 한 번 오르내리는 데 약 16초다.
  const tideBadge = () => level >= HIGH_WATER - 0.05 ? '만조 때' : level <= LOW_WATER + 0.05 ? '간조 때' : level > (HIGH_WATER + LOW_WATER) / 2 ? '물이 차오르는 중' : '물이 빠지는 중';
  function setLevel(v) {
    level = Math.min(HIGH_WATER, Math.max(LOW_WATER, v));
    placeWater();
    document.getElementById('tideBadge').textContent = playing ? tideBadge() : level > 0 ? '만조 때' : '간조 때';
    document.querySelectorAll('[data-tide]').forEach(b => b.classList.toggle('on', playing ? b.dataset.tide === 'play' : b.dataset.tide === (level > 0 ? 'high' : 'low')));
    if (showing !== '3d' && !playing) drawMapView();
    placeLabels();
    invalidate();
  }
  let playStart = 0;
  function setTide(t) {
    playing = t === 'play';
    if (playing) { playStart = performance.now(); return setLevel(level); }
    setLevel(t === 'high' ? HIGH_WATER : t === 'low' ? LOW_WATER : +t);
    schematic.setStage(level > 0 ? FLOOD : EBB);
  }
  const tick = () => {
    if (!playing) return;
    // 썰물에서 시작해 밀물까지 올랐다가 다시 내려온다.
    const ph = ((performance.now() - playStart) / 16000) % 1;
    setLevel(LOW_WATER + (HIGH_WATER - LOW_WATER) * (1 - Math.cos(ph * Math.PI * 2)) / 2);
    const st = level > (HIGH_WATER + LOW_WATER) / 2 ? FLOOD : EBB;
    if (schematic.stage !== st) schematic.setStage(st);
  };
  document.querySelectorAll('[data-tide]').forEach(b => b.onclick = () => setTide(b.dataset.tide));

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
  setTide('low');
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });
  (function loop() { requestAnimationFrame(loop); tick(); })();

  window.__LAB = {
    setView, setHeight, setSchematic, setTide, stats: sim.stats, get level() { return level; },
    buildings: buildings.info, roads: () => roads.info(),
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '전남 순천 순천만 일대입니다. 동천과 이사천이 합쳐져 흘러드는 만 안쪽에 넓은 갯벌이 펼쳐지고, 하구 가까운 곳에는 갈대밭이 있습니다. 남해안 서쪽은 동해안보다 밀물과 썰물의 높이 차이(조차)가 훨씬 커서, 썰물 때는 바닷물이 빠지며 갯벌이 드러나고 밀물 때는 다시 잠깁니다. 갯벌 위에 나뭇가지처럼 갈라진 물길은 썰물 때 빠지는 물이 모여 흐르는 갯골입니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '갯벌, 갈대밭, 하천, 해안선, 도로, 지명 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '갯벌의 범위 대부분과 작은 갯골, 논밭과 숲은 규칙으로 만든 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
