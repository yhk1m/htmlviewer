// © 2026 김용현
// 회룡포 실제 지형 화면. 땅 높이만 실제 자료이고, 내성천 물 넓이와 모래톱, 뿅뿅다리, 전망대, 마을과 산 이름 자리는 지도 자료에서 옮겼다.
// 고도 자료는 땅 높이뿐이라 물속 깊이를 모른다. 소와 여울 자리는 물길이 굽은 모양으로 짐작한 예시이고, 점선 고리로 실제 자료와 구분한다.
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
import { buildHoeryongpo, sampleH, crossProfile, profileMarks, profileNumbers, placesOf, guessSpots, BRIDGES, N, SIZE, CELL, WATER_LEVEL } from './sim.js';
import { figPalette, isDark } from '../../shared/theme.js';

const PHONE = isPhone();
const QUALITY_NAME = currentQuality(PHONE), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
// 낮은 산지라 모든 높이를 같은 배율로 키운다.
const scale = createHeightScale(2, 5000);
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
controls.maxDistance = 10000;
controls.minDistance = 40;

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });

// 짐작한 예시 자리의 점선 고리: 조각 14개로 끊어 그린다. 물 면 위에 납작하게 눕힌다.
function dashedRing(radius, width, color) {
  const group = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
  const parts = 14, arc = (Math.PI * 2) / parts;
  for (let n = 0; n < parts; n++) {
    const g = new THREE.RingGeometry(radius - width / 2, radius + width / 2, 8, 1, n * arc, arc * 0.55);
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    group.add(m);
  }
  return group;
}

// 단면: 땅은 갈색, 물 면은 파란 줄. 물 아래는 깊이를 모르므로 칠하지 않고 물음표 무늬로 둔다.
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
  for (let km = 0; km <= lengthM / 1000 + 1e-6; km += 0.5) ctx.fillText(`${km}km`, x(km * 1000), H - foot + 15);
  // 땅
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = '#6f5f45'; ctx.fill();
  // 물 구간: 물 면 아래를 어두운 무늬로 덮어 깊이를 모른다는 것을 보인다.
  const runs = [];
  points.forEach((p, n) => { if (p.kind !== 'water') return; if (!runs.length || runs.at(-1)[1] !== n - 1) runs.push([n, n]); else runs.at(-1)[1] = n; });
  for (const [a, b] of runs) {
    const x0 = x(points[a].m), x1 = x(points[b].m), top = y(points[a].z), bot = y(min);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
    ctx.fillStyle = (DK ? '#2a3a44' : '#e3e9ee'); ctx.fillRect(x0, top, x1 - x0, bot - top);
    ctx.strokeStyle = (DK ? 'rgba(159,211,255,.35)' : 'rgba(29,95,158,.3)'); ctx.lineWidth = 1;
    for (let s = x0 - (bot - top); s < x1; s += 8) { ctx.beginPath(); ctx.moveTo(s, bot); ctx.lineTo(s + (bot - top), top); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = (DK ? '#cfe8ff' : '#1d5f9e'); ctx.font = `${W < 520 ? 11 : 13}px "Malgun Gothic",sans-serif`;
    if (x1 - x0 > 40) ctx.fillText('?', (x0 + x1) / 2, top + (bot - top) / 2 + 5);
    ctx.strokeStyle = '#4aa8ee'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.stroke();
  }
  // 모래톱
  ctx.lineCap = 'round'; ctx.strokeStyle = '#e4d29c'; ctx.lineWidth = 6;
  for (let n = 1; n < points.length; n++) {
    const a = points[n - 1], b = points[n];
    if (a.kind !== 'sand' || b.kind !== 'sand') continue;
    ctx.beginPath(); ctx.moveTo(x(a.m), y(a.z) - 2); ctx.lineTo(x(b.m), y(b.z) - 2); ctx.stroke();
  }
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
  const dem = new Uint16Array(await (await fetch(new URL('./data/hoeryongpo-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildHoeryongpo(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/hoeryongpo-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest);
  const roadData = await (await fetch(new URL('./data/hoeryongpo-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim), spots = guessSpots(sim), line = crossProfile(sim), nums = profileNumbers(line);

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
  // B 채널 파랑을 모래 양으로 읽어 모래톱을 옅은 모래빛으로 칠한다.
  uniforms.uSand.value = 1;
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  patchTerrain(mat, uniforms);
  // 모래톱을 흰빛이 덜 도는 누런 모래빛으로 조금 어둡게 한다.
  const shared = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    shared(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('if(uGrainView>.5){', 'base=mix(base,base*vec3(.86,.79,.62),smoothstep(.1,.6,sb.b));if(uGrainView>.5){');
  };
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);

  // 내성천 물 면: OSM 물 넓이 칸만 덮는다. 높이는 물길을 따라 정한 물 면 높이다.
  const waterGeo = new THREE.BufferGeometry(), waterIdx = [], waterPos = new Float32Array(N * N * 3);
  for (let k = 0; k < N * N; k++) { waterPos[k * 3] = pos[k * 3]; waterPos[k * 3 + 2] = pos[k * 3 + 2]; }
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, e = c + 1;
    if (sim.river[a] || sim.river[b] || sim.river[c] || sim.river[e]) waterIdx.push(a, c, b, b, c, e);
  }
  waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
  waterGeo.setIndex(waterIdx);
  waterGeo.computeVertexNormals();
  const waterMesh = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x3f7f8c, roughness: 0.28, metalness: 0.05, transparent: true, opacity: 0.93 }));
  waterMesh.receiveShadow = true;
  waterMesh.frustumCulled = false;
  scene.add(waterMesh);

  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain, waterMesh], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  // 물 칸 위는 물 면 높이, 그 밖은 고도 자료 그대로. 건물, 도로, 다리, 이름표가 이 높이에 얹힌다.
  const top = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) top[k] = sim.river[k] ? sim.surface[k] : sim.sand[k] ? sim.show[k] : sim.h[k];
  const groundAt = (i, j) => ex(sampleH(top, i, j));
  const surfaceAt = (i, j) => ex(sampleH(sim.riverLv, i, j));
  const toWorld = (i, j) => { const w = world(i, j); return [w.x, w.z]; };
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld, groundAt, cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld, groundAt });

  // 뿅뿅다리: 구멍 뚫린 철판을 이은 낮은 다리. 물 면 위 약 1m에 폭 4m 띠로 그린다(실제보다 조금 넓게).
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xb8643a, roughness: 0.6, metalness: 0.3 });
  const bridges = new THREE.Group();
  scene.add(bridges);
  const placeBridges = () => {
    bridges.clear();
    for (const pts of Object.values(BRIDGES)) for (let n = 0; n + 1 < pts.length; n++) {
      const [x0, y0] = pts[n], [x1, y1] = pts[n + 1], a = world(x0, y0), b = world(x1, y1);
      const len = Math.hypot(b.x - a.x, b.z - a.z), mid = [(x0 + x1) / 2, (y0 + y1) / 2], w = world(...mid);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len + 2, 0.8, 4), bridgeMat);
      m.position.set(w.x, surfaceAt(...mid) + 1.2, w.z);
      m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      m.castShadow = true;
      bridges.add(m);
    }
  };

  // 소(파란 점선)와 여울(주황 점선) 예시 자리 고리
  const guesses = new THREE.Group();
  scene.add(guesses);
  const rings = [
    ...spots.pool.map(s => ({ s, ring: dashedRing(34, 5, 0x9fd3ff) })),
    ...spots.riffle.map(s => ({ s, ring: dashedRing(26, 5, 0xf0a46a) })),
  ];
  for (const { ring } of rings) guesses.add(ring);
  const placeGuesses = () => {
    for (const { s, ring } of rings) {
      const w = world(...s.grid);
      ring.position.set(w.x, surfaceAt(...s.grid) + 0.8, w.z);
    }
  };

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
    placeBridges();
    placeGuesses();
    renderer.shadowMap.needsUpdate = true;
  };

  // 시점. p와 t는 [가로, 높이, 세로](m). from과 to는 격자 칸 [가로, 세로]이고, 높이는 그 자리 땅 위 lift(m)다.
  const VIEWS = {
    // 남쪽 높은 하늘에서 북쪽을 본다. 마을을 감아 도는 고리와 동쪽 둘째 굽이, 북쪽을 지나 서쪽으로 나가는 물길이 한눈에 보인다.
    oblique: { p: [-300, 2700, 3300], t: [0, 65, 150] },
    above: { p: [0, 6000, 350], t: [0, 0, 0] },
    // 회룡대 전망대 바로 위에서 동남동쪽 마을을 내려다본다. 사진으로 널리 알려진 그 방향이다.
    lookout: { from: [186, 276], lift: 70, to: [292, 322] },
    // 마을 쪽 모래톱(굽이 안쪽)을 남서쪽 물 위에서 가까이 본다.
    sand: { from: [222, 352], lift: 110, to: [262, 300] },
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

  // 지도 위에 그리는 것: 모래톱(모래색), 소와 여울 예시 자리(점선 고리), 다리, 단면을 잰 A-B 선, 곳 이름
  const useLayer = document.createElement('canvas');
  useLayer.width = useLayer.height = N;
  {
    const c = useLayer.getContext('2d'), img = c.createImageData(N, N);
    for (let k = 0; k < N * N; k++) if (sim.sand[k]) img.data.set([226, 196, 120, 235], k * 4);
    c.putImageData(img, 0, 0);
  }
  const MAP_KEYS = ['village', 'view', 'biryong', 'river', 'sand', 'daeeun', 'hyangseok'];
  let guessOn = true;
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(useLayer, ox, oy, N * sc, N * sc);
    ctx.strokeStyle = '#7a3518'; ctx.lineWidth = 3;
    for (const pts of Object.values(BRIDGES)) { ctx.beginPath(); pts.forEach(([i, j], n) => (n ? ctx.lineTo(ox + i * sc, oy + j * sc) : ctx.moveTo(ox + i * sc, oy + j * sc))); ctx.stroke(); }
    if (guessOn) {
      ctx.lineWidth = 2.2; ctx.setLineDash([4, 3]);
      for (const { s } of rings.slice(0, spots.pool.length)) { ctx.strokeStyle = '#0b4f8a'; ctx.beginPath(); ctx.arc(ox + s.grid[0] * sc, oy + s.grid[1] * sc, 34 / CELL * sc, 0, Math.PI * 2); ctx.stroke(); }
      for (const { s } of rings.slice(spots.pool.length)) { ctx.strokeStyle = '#b8601e'; ctx.beginPath(); ctx.arc(ox + s.grid[0] * sc, oy + s.grid[1] * sc, 26 / CELL * sc, 0, Math.PI * 2); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.font = '700 12px "Malgun Gothic",sans-serif';
      for (const [n, { s }] of rings.entries()) {
        const pool = n < spots.pool.length, text = pool ? '소?' : '여울?', tx = ox + s.grid[0] * sc + 10, ty = oy + s.grid[1] * sc - 8;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(text, tx, ty);
        ctx.fillStyle = pool ? '#0b4f8a' : '#9a4a12'; ctx.fillText(text, tx, ty);
      }
    }
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    line.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = line[0], B = line.at(-1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    // A는 회룡대 점 오른쪽 아래(이름 밑)에 써서 비룡산 세모와 헷갈리지 않게 한다.
    ctx.strokeText('A', ox + A.x * sc + 8, oy + A.y * sc + 22); ctx.fillText('A', ox + A.x * sc + 8, oy + A.y * sc + 22);
    ctx.strokeText('B', ox + B.x * sc + 6, oy + B.y * sc + 20); ctx.fillText('B', ox + B.x * sc + 6, oy + B.y * sc + 20);
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    for (const key of MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, text = l.name, w = ctx.measureText(text).width;
      const dot = l.village || l.peak;
      let tx = dot ? x + 7 : key === 'sand' ? x + 20 : x - w / 2;
      // 모래톱 이름은 회룡대 이름과 겹치지 않게 오른쪽 위에 쓰고, 모래톱 자리까지 짧은 줄을 긋는다.
      if (key === 'sand') { ctx.strokeStyle = '#20302a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y - 11); ctx.stroke(); }
      // 모래톱 이름은 마을 쪽으로 밀려 내려가지 않게 모래톱 띠 바로 위에 쓴다.
      const ty = key === 'sand' ? y - 7 : y + 5;
      // 회룡대와 비룡산은 서로 가까워 글자를 점 왼쪽에 쓴다.
      if (tx + w > ox + N * sc - 4 || key === 'biryong') tx = x - w - 7;
      if (dot) { ctx.fillStyle = l.peak ? '#7a2e12' : '#20302a'; ctx.beginPath(); if (l.peak) { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); } else ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(text, tx, ty);
      ctx.fillStyle = key === 'river' ? '#0b4f8a' : '#20302a'; ctx.fillText(text, tx, ty);
    }
    ctx.restore();
  };

  const round10 = v => Math.round(v / 10) * 10;
  const PROFILE_NOTE = `회룡대 전망대(A)에서 마을 가운데 쪽으로 곧게 그어 내성천을 두 번 건너 건너편 강가(B)까지 잰 높이입니다(약 ${nums.lengthKm.toFixed(1)}km). 높이는 고도 자료에서 잰 값이며, 물가는 3D 화면처럼 물 면 높이에 맞춰 다듬었습니다. 전망대는 약 ${round10(nums.view)}m, 물 면은 약 ${Math.round(nums.water1)}m이고, 마을 땅은 대부분 약 ${Math.round(nums.villageMid)}m로 물 면과 높이 차이가 크지 않은 낮고 평평한 땅입니다. 원자료가 약 30m 간격이라 몇 m의 높이 차이는 정확하지 않습니다. 파란 줄은 물 면이고, 그 아래 빗금은 물속 깊이를 자료로 알 수 없는 구간입니다. 모래빛 줄은 굽이 안쪽 모래톱입니다.`;
  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : '모래색: OSM 모래톱 윤곽. 갈색 줄: 뿅뿅다리. 점선 고리: 굽은 모양으로 짐작한 소(파랑)와 여울(주황) 예시 자리. 붉은 점선: 단면을 잰 길(A 회룡대에서 B 건너편 강가까지). 세모: 산봉우리';
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 10 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 55, hi: 260, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawProfile(mapView, { points: line, marks: profileMarks(line), from: 'A 회룡대 전망대', to: 'B 건너편 강가', note: PROFILE_NOTE });
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
  for (const [key, l] of Object.entries(PLACES)) labelLayer.add(key, l.name, l.sub, l.guess ? `guess ${l.guess}` : l.village || l.peak ? 'small' : '');
  const v3 = new THREE.Vector3();
  // 중요도 4 이상은 늘 보이고, 나머지는 겹치면 숨긴다. 가까이 보기에서 화면 끝에 몰리거나 너무 먼 이름표는 뺀다.
  const HIDE = {
    oblique: [],
    above: [],
    lookout: ['view', 'biryong', 'hyangseok', 'pool2', 'riffle1', 'riffle2', 'daeeun'],
    sand: ['view', 'biryong', 'hyangseok', 'daeeun', 'pool1', 'pool2', 'riffle1', 'riffle2'],
  };
  const KEY = { village: 5, sand: 4, river: 4, view: 4, pool0: 3, riffle0: 3, biryong: 3, bridge1: 2, bridge2: 2, pool1: 2, riffle1: 2, daeeun: 2, hyangseok: 2, pool2: 1, riffle2: 1 };
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    const bottom = isPhone() ? document.getElementById('corner').getBoundingClientRect().top : innerHeight;
    for (const [key, l] of Object.entries(PLACES)) {
      if (HIDE[currentView]?.includes(key)) continue;
      if (l.guess && !guessOn) continue;
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, groundAt(l.grid[0], l.grid[1]) + (l.guess || l.water ? 4 : 12), w.z).project(camera);
      if (v3.z <= 1 && Math.abs(v3.x) < 1.02 && Math.abs(v3.y) < 1.02 && (-v3.y * 0.5 + 0.5) * innerHeight < bottom) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: KEY[key] ?? 1, keep: (KEY[key] ?? 1) >= 4 });
    }
    labelLayer.place(list);
  }

  const fitView = () => {
    const phone = isPhone();
    const left = phone || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20;
    camera.setViewOffset(innerWidth, innerHeight, -left / 2, 0, innerWidth, innerHeight);
    drawMapView();
    placeLabels();
    invalidate();
  };
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
  const setGuesses = on => {
    guessOn = on;
    guesses.visible = on;
    document.getElementById('guessBtn').classList.toggle('on', on);
    document.getElementById('guessNote').style.display = on ? '' : 'none';
    drawMapView();
    placeLabels();
    invalidate();
  };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-height]').forEach(b => b.onclick = () => setHeight(+b.dataset.height));
  document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); placeLabels(); };
  document.getElementById('guessBtn').onclick = () => setGuesses(!guessOn);
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
    setView, setHeight, setGuesses, stats: sim.stats, profile: { ...nums, runs: undefined },
    buildings: buildings.info, roads: () => roads.info(), guesses: () => ({ pools: spots.pool.length, riffles: spots.riffle.length, visible: guesses.visible }),
    bridges: () => bridges.children.length,
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '경북 예천군 회룡포입니다. 내성천이 마을을 약 350도 감아 돌아 흐르는 물돌이 지형으로 소개되며, 2005년 명승으로 지정되었습니다. 산지 사이를 깊게 파고 굽이쳐 흐르는 감입 곡류의 예로도 자주 소개됩니다. 이런 굽은 하천에서는 대개 굽이 바깥쪽(공격 사면)에 물이 깊은 소가, 굽이와 굽이 사이에 물이 얕고 빠른 여울이 생기고, 굽이 안쪽(퇴적 사면)에는 물이 느려 모래가 쌓여 모래톱이 됩니다. 내성천은 바닥이 고운 모래로 덮인 모래 하천으로 알려져 있습니다. 마을로 건너가는 뿅뿅다리는 구멍 뚫린 철판을 이어 만든 다리입니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '내성천 물 넓이, 모래톱, 뿅뿅다리, 전망대, 마을과 산 이름 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '도로: OpenStreetMap contributors (ODbL).', '소와 여울 자리는 굽은 모양으로 짐작한 예시이고, 숲과 논밭은 규칙으로 만든 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
