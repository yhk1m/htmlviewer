// © 2026 김용현
// 화산 실제 지형 세 화면이 함께 쓰는 3D 화면 틀. 각 화면의 *-main.js가 자료 파일, 시점, 이름표, 모식도, 단면, 설명 글을 넘긴다.
// 카르스트 실제 지형 화면(scenes/karst/terrain-main.js)과 같은 구성이고, 바다는 해안 단구 화면처럼 0m 바로 위에 파란 면을 깐다.
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
import { figPalette } from '../../shared/theme.js';
import { N, sampleH } from './site-sim.js';

// 셋째 판(tC)으로 표시할 곳을 덧칠한다. 빨강은 안쪽 칠, 초록은 테두리 줄, 파랑은 둘째 색을 고른다. uMark가 0이면 끈다.
const MARK_GLSL = /* glsl */`
vec4 sc=texture2D(tC,suv);
{
  float inM=smoothstep(.2,.6,sc.r)*uMark;
  vec3 tint=mix(vec3(.30,.17,.07),vec3(.30,.27,.06),sc.b);
  base=mix(base,base*.45+tint,inM*.6);
  float rimL=smoothstep(.25,.6,sc.g)*uMark;
  base=mix(base,mix(vec3(1.,.62,.22),vec3(1.,.9,.4),sc.b),rimL*.9);
}
`;

// 눈금 간격: 범위에 맞춰 1, 2, 5의 10배수
const niceStep = (range, count) => {
  const raw = range / count, p = 10 ** Math.floor(Math.log10(raw)), r = raw / p;
  return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * p;
};

// 꺾은 선 단면. points: [{ m, z, water }], marks: [{ at, text }]. 바다 구간은 파란 띠로 칠한다.
export function drawSiteProfile(canvas, { points, marks, from, to, note }) {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d'), W = r.width, H = r.height;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const P = figPalette();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const pad = W < 520 ? 46 : 64, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points.at(-1).m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  const zs = points.map(p => p.z), lo = Math.min(...zs), hi = Math.max(...zs);
  const step = niceStep(hi - lo + 1, 6), min = Math.floor(lo / step) * step, max = Math.ceil((hi + step * 0.6) / step) * step;
  let lines = wrapText(ctx, note, W - pad - side);
  const foot = (lines.length + 1) * noteGap + 34;
  const xScale = usableW / lengthM, yScale = (H - foot - 70) / (max - min), ve = yScale / xScale;
  lines = [...lines, ve < 1.5 ? '가로와 세로를 거의 같은 비율로 그렸습니다.' : `세로를 약 ${Math.round(ve)}배 과장해 그렸습니다.`];
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = P.grid; ctx.fillStyle = P.sub; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max + 1e-6; z += step) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); ctx.fillText(`${Math.round(z).toLocaleString('ko-KR')}m`, pad - 4, y(z) + 4); }
  ctx.textAlign = 'center';
  const kmStep = niceStep(lengthM / 1000, 6);
  for (let km = 0; km <= lengthM / 1000 + 1e-6; km += kmStep) ctx.fillText(`${+km.toFixed(2)}km`, x(km * 1000), H - foot + 15);
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = '#6f5f45'; ctx.fill();
  // 바다
  ctx.strokeStyle = '#4aa8ee'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  points.forEach((p, t) => { const q = points[t + 1]; if (q && p.water && q.water) { ctx.beginPath(); ctx.moveTo(x(p.m), y(0)); ctx.lineTo(x(q.m), y(0)); ctx.stroke(); } });
  ctx.lineCap = 'butt';
  ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6;
  ctx.beginPath(); points.forEach((p, n) => (n ? ctx.lineTo(x(p.m), y(p.z)) : ctx.moveTo(x(p.m), y(p.z)))); ctx.stroke();
  ctx.font = `700 ${W < 520 ? 12 : 15}px "Malgun Gothic",sans-serif`;
  const used = [];
  for (const k of marks) {
    const p = points[k.at], w = ctx.measureText(k.text).width, tx = Math.min(W - 4 - w / 2, Math.max(pad + w / 2, x(p.m)));
    let ty = Math.max(40, y(p.z) - 30);
    while (used.some(u => Math.abs(u.x - tx) < (u.w + w) / 2 + 6 && Math.abs(u.y - ty) < 18)) ty -= 18;
    used.push({ x: tx, y: ty, w });
    ctx.strokeStyle = P.hi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(p.m), ty + 5); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = P.bg; ctx.strokeText(k.text, tx, ty);
    ctx.fillStyle = P.hi; ctx.fillText(k.text, tx, ty);
  }
  ctx.fillStyle = P.ink; ctx.font = '700 16px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 22);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 22);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  lines.forEach((t, n) => ctx.fillText(t, pad > 46 ? pad : 8, H - foot + 36 + n * noteGap));
}

// cfg: { files: { dem, buildings, roads }, build(dem), size, cell, height: { init, top }, light, fog, maxDistance,
//   views, places(sim), priority, hide, mark: { on }, profile(sim) => { points, marks, from, to, note },
//   map: { lo, hi, interval, keys, legend, overlay(ctx, o, sim, state) }, schematic(el, sim), stats(sim) }
export async function startSitePage(cfg) {
  const PHONE = isPhone();
  const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
  const meter = createFpsMeter();
  const SIZE = cfg.size, CELL = cfg.cell, WATER_LEVEL = -100;
  const scale = createHeightScale(cfg.height.init, cfg.height.top ?? 5000);
  const ex = scale.apply;
  let currentView = cfg.defaultView ?? 'oblique';
  const statusEl = document.getElementById('status');
  const say = t => { statusEl.textContent = t; };

  const { renderer, scene, camera, controls, invalidate, startLoop } = createStage({
    mount: document.getElementById('stage'), size: SIZE, fogDensity: cfg.fog * (PHONE ? 0.5 : 1), pixelRatio: Q.pixelRatio, shadowSize: Q.shadow,
  });
  // 창이 넓어 해 쪽 모서리가 그림자 상자 밖으로 나가지 않게 빛을 멀리 둔다.
  scene.traverse(o => {
    if (!o.isDirectionalLight) return;
    o.position.setLength(cfg.light);
    o.shadow.camera.far = cfg.light * 2.5;
    o.shadow.camera.updateProjectionMatrix();
  });
  camera.far = Math.max(camera.far, SIZE * 4);
  camera.updateProjectionMatrix();
  controls.maxDistance = cfg.maxDistance;
  controls.minDistance = 40;
  const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });

  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(cfg.files.dem)).arrayBuffer());
  say('지형 만드는 중');
  const sim = cfg.build(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(cfg.files.buildings)).json();
  clearUnder(buildingData, N, sim.stage.forest);
  const roadData = await (await fetch(cfg.files.roads)).json();
  const stage = sim.stage, PLACES = cfg.places(sim), prof = cfg.profile(sim);

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
  uniforms.uSand.value = cfg.sand ? 1 : 0;
  const tC = { value: splatTex(stage.splatC ?? new Uint8Array(N * N * 4), N) }, uMark = { value: cfg.mark ? 1 : 0 };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  const shared = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    shared(sh, r);
    sh.uniforms.tC = tC; sh.uniforms.uMark = uMark;
    sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D tA', 'uniform sampler2D tC;\nuniform float uMark;\nuniform sampler2D tA').replace('// 물길: 얕은 물은', MARK_GLSL + '// 물길: 얕은 물은');
  };
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);
  // 바다: 0m 칸 바로 위에 파란 면을 깐다. 땅은 0.8m 위부터라 가려지지 않는다.
  const seaPlane = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ color: 0x2f78b4 }));
  seaPlane.rotation.x = -Math.PI / 2;
  scene.add(seaPlane);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  const landAt = k => (sim.sea[k] ? sim.h[k] : Math.max(sim.h[k], 0.8));
  const groundAt = (i, j) => ex(Math.max(sampleH(sim.h, i, j), 0.8));
  const toWorld = (i, j) => { const w = world(i, j); return [w.x, w.z]; };
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld, groundAt, cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld, groundAt });
  const veg = { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense: false, treeFactor: Q.trees };
  const treeCache = {}, nearCache = {};
  let treeMesh = null, nearMesh = null;
  const applyHeight = () => {
    for (let k = 0; k < N * N; k++) pos[k * 3 + 1] = ex(landAt(k));
    seaPlane.position.y = ex(0.5);
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

  // 시점. from과 to는 격자 칸 [가로, 세로]이고, 카메라 높이는 바라보는 자리 땅 위 lift(m)다.
  function setView(name) {
    const v = cfg.views[name];
    currentView = name;
    const z = portraitZoom() * (PHONE ? 1.35 : 1);
    const a = world(...v.from), b = world(...v.to), by = groundAt(...v.to), ay = by + v.lift;
    camera.position.set(b.x + (a.x - b.x) * z, by + (ay - by) * z, b.z + (a.z - b.z) * z);
    controls.target.set(b.x, by, b.z);
    controls.update();
    invalidate();
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
  }

  let markOn = !!cfg.mark;
  const state = () => ({ markOn });
  // 지도 위에 단면 선(A에서 B), 이름, 화면마다 덧그리는 것
  const mapOverlay = (ctx, o) => {
    const { ox, oy, sc } = o;
    ctx.save();
    cfg.map.overlay?.(ctx, o, sim, state());
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    prof.points.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = prof.points[0], B = prof.points.at(-1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc - 18, oy + A.y * sc + 6); ctx.fillText('A', ox + A.x * sc - 18, oy + A.y * sc + 6);
    ctx.strokeText('B', ox + B.x * sc + 6, oy + B.y * sc - 6); ctx.fillText('B', ox + B.x * sc + 6, oy + B.y * sc - 6);
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    for (const key of cfg.map.keys) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc;
      const text = l.kind === 'guess' ? `${l.name}(어림)` : l.name, w = ctx.measureText(text).width;
      let tx = x + 7;
      if (tx + w > ox + (N - 1) * sc - 4) tx = x - w - 7;
      ctx.fillStyle = l.kind === 'peak' ? '#7a2e12' : '#20302a';
      ctx.beginPath();
      if (l.kind === 'peak') { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); ctx.fill(); }
      else if (l.kind === 'guess') { ctx.strokeStyle = '#20302a'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(text, tx, y + 5);
      ctx.fillStyle = l.kind === 'mark' ? '#8a3a0c' : '#20302a'; ctx.fillText(text, tx, y + 5);
    }
    ctx.restore();
  };

  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : cfg.map.legend;
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: cfg.map.interval });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: cfg.map.lo, hi: cfg.map.hi, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawSiteProfile(mapView, prof);
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
  cfg.schematic(schemEl, sim);
  addEventListener('themechange', () => cfg.schematic(schemEl, sim));
  const labelLayer = createLabelLayer(document.getElementById('labels'));
  const CLS = { mark: 'dol', guess: 'guess', village: 'small', peak: 'small' };
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name, l.sub, (cfg.priority[key] ?? 1) >= 5 && l.kind !== 'guess' ? '' : CLS[l.kind] ?? '');
  const v3 = new THREE.Vector3();
  const halfW = l => Math.max(l.name.length * 11, (l.sub ?? '').length * 6.5) / 2;
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    const phone = isPhone(), right = innerWidth - (schemEl.hidden || phone ? 0 : schemEl.offsetWidth + 90) - 20, bottom = phone ? document.getElementById('corner').getBoundingClientRect().top : innerHeight;
    const left = phone || document.body.matches('.panel-closed, .merged') ? 0 : document.getElementById('panel').getBoundingClientRect().right + 4;
    for (const [key, l] of Object.entries(PLACES)) {
      if (cfg.hide[currentView]?.includes(key)) continue;
      if (l.kind === 'mark' && l.needsMark && !markOn) continue;
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, groundAt(l.grid[0], l.grid[1]) + (l.kind === 'mark' ? 6 : 14), w.z).project(camera);
      const sx = (v3.x * 0.5 + 0.5) * innerWidth, sy = (-v3.y * 0.5 + 0.5) * innerHeight;
      const pr = cfg.priority[key] ?? 1;
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
  const setMark = on => {
    markOn = on;
    uMark.value = on ? 1 : 0;
    document.getElementById('markBtn')?.classList.toggle('on', on);
    drawMapView();
    placeLabels();
    invalidate();
  };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  const markBtn = document.getElementById('markBtn');
  if (markBtn) markBtn.onclick = () => setMark(!markOn);
  document.getElementById('roadsBtn').onclick = e => { e.currentTarget.classList.toggle('on', roads.toggle()); invalidate(); };
  document.getElementById('buildingsBtn').onclick = e => { e.currentTarget.classList.toggle('on', buildings.toggle()); renderer.shadowMap.needsUpdate = true; invalidate(); };

  setView(currentView);
  setHeight(cfg.height.init);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  fitView();
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = {
    setView, setHeight, setSchematic, setMark, stats: sim.stats, profile: cfg.profileStats?.(prof, sim) ?? null,
    buildings: buildings.info, roads: () => roads.info(),
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
  };
  window.__APP_READY = true;
  return { sim, PLACES };
}

// 화면 시작: 설명 글과 출처를 넣고, 오류가 나면 불러오기 칸에 적는다.
export function bootSitePage(cfg, { note, foot }) {
  document.getElementById('note').textContent = note;
  document.getElementById('foot').innerHTML = foot.map(t => `<span>${t}</span>`).join(' ');
  startSitePage(cfg).catch(e => { document.getElementById('status').textContent = '오류: ' + e.message; console.error(e); });
}
