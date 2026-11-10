// © 2026 김용현
// 대관령 실제 지형 화면. 땅 높이만 실제 자료이고, 밭과 풀밭, 하천, 풍력 발전기, 지명의 자리는 지도 자료에서 옮겼다.
// 숲과 바위는 규칙으로 만든 예시이고, 풍력 발전기는 한 가지 크기의 모형이다.
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
import { buildDaegwallyeong, sampleH, plateauProfile, profileMarks, profileNumbers, placesOf, N, SIZE, CELL, WATER_LEVEL, TURBINES } from './sim.js';
import { createSchematic, LOW } from './schematic.js';

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
  fogDensity: 0.000022 * (PHONE ? 0.5 : 1),
  pixelRatio: Q.pixelRatio,
  shadowSize: Q.shadow,
});
// 창이 14km로 넓고 땅이 높아, 해 쪽 모서리가 그림자 상자 밖으로 나가지 않게 빛을 더 멀리 둔다.
scene.traverse(o => {
  if (!o.isDirectionalLight) return;
  o.position.setLength(16000);
  o.shadow.camera.far = 34000;
  o.shadow.camera.updateProjectionMatrix();
});
controls.maxDistance = 26000;

const world = (i, j) => ({ x: (i / (N - 1) - 0.5) * SIZE, z: (j / (N - 1) - 0.5) * SIZE });
// 동북동쪽(강릉 쪽) 낮은 골짜기 위에서 급경사 너머 서쪽의 고원을 바라본다. 고원의 윗면이 평평한 하늘선으로 보인다.
const VIEWS = {
  oblique: { p: [13000, 5500, -8000], t: [-1000, 650, 500] },
  above: { p: [0, 21000, 1200], t: [0, 0, 0] },
  // 동쪽 골짜기 위에서 급경사와 그 위의 평평한 고원 가장자리를 올려다본다.
  scarp: { p: [11500, 3600, 1500], t: [3000, 600, -1000] },
  // 횡계리 시가지와 둘레의 밭, 송천이 흐르는 평평한 고원을 남동쪽 위에서 본다.
  field: { p: [-300, 2600, 3600], t: [-3400, 780, -300] },
  // 횡계리 북쪽 능선의 목장 풀밭과 풍력 발전기. 발전기는 고원보다 약 200m 높은 능선에 선다.
  wind: { p: [-600, 3000, 600], t: [-3600, 850, -4300] },
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

// 고랭지 밭(빨강)과 목초지(초록)를 셋째 판으로 읽어 공용 땅 재질 위에 덧칠한다.
// 밭은 이랑 줄무늬가 있는 흙과 배추 초록이 필지마다 섞이고, 목초지는 밝은 풀색이다.
const FIELD_GLSL = /* glsl */`
vec4 sc=texture2D(tC,suv+jit*.4);
{
  float a=.55; mat2 R=mat2(cos(a),-sin(a),sin(a),cos(a)); vec2 q=R*vWP.xz;
  vec2 blk=floor(q/vec2(150.,95.)); float hb=hash21(blk);
  float row=smoothstep(.25,.5,abs(fract(q.y/(hb>.5?2.4:2.9))-.5)*2.);
  vec3 soilF=mix(vec3(.30,.22,.15),vec3(.38,.29,.19),hb)*(.85+.25*mid);
  vec3 cabbage=mix(vec3(.25,.42,.17),vec3(.36,.52,.24),hash21(blk*3.7));
  float grown=step(.38,hb)*(hb>.8?.55:1.);
  vec3 fieldC=mix(soilF*(.78+.3*row),mix(soilF*.9,cabbage,row),grown);
  vec2 inB=fract(q/vec2(150.,95.)); float edge=step(inB.x,.02)+step(inB.y,.03);
  fieldC=mix(fieldC,vec3(.42,.40,.34),clamp(edge,0.,1.)*.6);
  vec3 pastureC=mix(vec3(.36,.47,.20),vec3(.46,.55,.27),smoothstep(.3,.7,mid))*(.84+.26*fin);
  pastureC=mix(pastureC,pastureC*vec3(1.1,1.05,.82),smoothstep(.45,.75,mac)*.5);
  base=mix(base,fieldC,smoothstep(.2,.7,sc.r));
  base=mix(base,pastureC,smoothstep(.2,.7,sc.g));
  terrainRough=mix(terrainRough,.95,smoothstep(.2,.7,sc.r+sc.g));
}
`;

// 풍력 발전기 모형: 흰 기둥과 머리, 날개 세 장. 기둥 약 80m, 날개 약 40m로 모든 자리에 같은 크기다.
const TOWER_H = 80, BLADE_L = 40;
function mergeParts(parts) {
  const geos = parts.map(([g, m]) => { const n = g.index ? g.toNonIndexed() : g; n.applyMatrix4(m); return n; });
  const count = geos.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
function createTurbines(points) {
  const M = (x, y, z, rx = 0) => new THREE.Matrix4().makeRotationX(rx).setPosition(x, y, z);
  const body = mergeParts([
    [new THREE.CylinderGeometry(1.3, 2.4, TOWER_H, 10), M(0, TOWER_H / 2, 0)],
    [new THREE.BoxGeometry(11, 3.8, 3.8), M(-1.5, TOWER_H + 1, 0)],
  ]);
  // 날개는 머리 앞(서쪽, -x)에서 x축을 중심으로 돈다.
  const blade = new THREE.BoxGeometry(0.6, BLADE_L, 2.2).translate(0, BLADE_L / 2 + 1.5, 0);
  const rotor = mergeParts([
    [new THREE.SphereGeometry(2, 10, 8), M(0, 0, 0)],
    ...[0, 1, 2].map(n => [blade.clone(), M(0, 0, 0, (n * Math.PI * 2) / 3)]),
  ]);
  const mat = new THREE.MeshStandardMaterial({ color: 0xf1f2ef, roughness: 0.55, metalness: 0.05 });
  const bodies = new THREE.InstancedMesh(body, mat, points.length), rotors = new THREE.InstancedMesh(rotor, mat, points.length);
  bodies.castShadow = rotors.castShadow = true;
  const group = new THREE.Group();
  group.add(bodies, rotors);
  const m = new THREE.Matrix4(), r = new THREE.Matrix4();
  // 땅 높이 배율이 바뀌면 다시 세운다. 발전기 높이는 과장하지 않는다.
  group.userData.place = groundAt => {
    points.forEach(([i, j], n) => {
      const w = world(i, j), y = groundAt(i, j) - 1, yaw = ((n * 37) % 11 - 5) * 0.03;
      m.makeRotationY(yaw).setPosition(w.x, y, w.z);
      bodies.setMatrixAt(n, m);
      r.makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationX((n * 1.3) % (Math.PI * 2 / 3)));
      r.setPosition(w.x - 7.5 * Math.cos(yaw), y + TOWER_H + 1, w.z + 7.5 * Math.sin(yaw));
      rotors.setMatrixAt(n, r);
    });
    bodies.instanceMatrix.needsUpdate = rotors.instanceMatrix.needsUpdate = true;
    bodies.computeBoundingSphere(); rotors.computeBoundingSphere();
  };
  return group;
}

// 굽은 길을 따라 잰 높이의 단면. 공용 단면 그림은 눈금이 5m 간격이라, 높이 차이가 큰 이 장면은 100m 간격으로 따로 그린다.
function drawProfile(canvas, { points, marks, from, to, note }) {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d'), W = r.width, H = r.height;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  const pad = W < 520 ? 42 : 64, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points.at(-1).m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  const min = 0, max = Math.ceil(Math.max(...points.map(p => p.z)) / 100) * 100 + 100;
  let lines = wrapText(ctx, note, W - pad - side);
  const foot = (lines.length + 1) * noteGap + 34;
  const xScale = usableW / lengthM, yScale = (H - foot - 86) / (max - min);
  lines = [...lines, `세로를 약 ${Math.round(yScale / xScale)}배 과장해 그렸습니다.`];
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.fillStyle = '#c9c7bb'; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max; z += 100) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); ctx.fillText(`${z}m`, pad - 4, y(z) + 4); }
  ctx.textAlign = 'center';
  for (let km = 0; km <= lengthM / 1000; km += 2) ctx.fillText(`${km}km`, x(km * 1000), H - foot + 15);
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.closePath();
  ctx.fillStyle = '#8c7a5c'; ctx.fill();
  ctx.font = `700 ${W < 520 ? 13 : 15}px "Malgun Gothic",sans-serif`;
  const used = [];
  for (const k of marks) {
    const p = points[k.at], w = ctx.measureText(k.text).width, tx = Math.min(W - 4 - w / 2, Math.max(pad + w / 2, x(p.m)));
    let ty = y(p.z) - 32;
    while (used.some(u => Math.abs(u.x - tx) < (u.w + w) / 2 + 6 && Math.abs(u.y - ty) < 18)) ty -= 18;
    used.push({ x: tx, y: ty, w });
    ctx.strokeStyle = k.color; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(p.m), ty + 5); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#1c211e'; ctx.strokeText(k.text, tx, ty);
    ctx.fillStyle = k.color; ctx.fillText(k.text, tx, ty);
  }
  ctx.fillStyle = '#f3f1ea'; ctx.font = '700 16px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 26);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 26);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  lines.forEach((t, n) => ctx.fillText(t, pad > 42 ? pad : 8, H - foot + 36 + n * noteGap));
}

async function start() {
  say('고도 자료 받는 중');
  const dem = new Uint16Array(await (await fetch(new URL('./data/daegwallyeong-dem.bin', import.meta.url))).arrayBuffer());
  say('지형 만드는 중');
  const sim = buildDaegwallyeong(dem);
  say('건물 자료 받는 중');
  const buildingData = await (await fetch(new URL('./data/daegwallyeong-buildings.json', import.meta.url))).json();
  // 건물 자리에는 나무를 심지 않는다.
  clearUnder(buildingData, N, sim.stage.forest, sim.mountain);
  const roadData = await (await fetch(new URL('./data/daegwallyeong-roads.json', import.meta.url))).json();
  const stage = sim.stage, PLACES = placesOf(sim), line = plateauProfile(sim), nums = profileNumbers(line);

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
    sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D tA', 'uniform sampler2D tC;\nuniform sampler2D tA').replace('// 물길: 얕은 물은', FIELD_GLSL + '// 물길: 얕은 물은')
      // 좁은 물길이 하늘빛을 받아 하얗게 번쩍이지 않게 거칠기를 조금 올린다.
      .replace('diffuseColor.rgb=base;', 'terrainRough=mix(terrainRough,.75,wtr);\ndiffuseColor.rgb=base;');
  };
  const terrain = new THREE.Mesh(geo, mat);
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);
  const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [terrain], invalidate, scene });
  window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

  const groundAt = (i, j) => ex(sampleH(sim.h, i, j));
  const toWorld = (i, j) => { const w = world(i, j); return [w.x, w.z]; };
  // 건물과 도로, 풍력 발전기: 땅 높이 배율이 바뀌면 다시 얹는다. 높이는 과장하지 않는다.
  const roads = createRoadLayer(THREE, scene, roadData, { toWorld, groundAt, cellM: CELL });
  const buildings = createBuildingLayer(THREE, scene, buildingData, { toWorld, groundAt });
  const turbines = createTurbines(TURBINES);
  scene.add(turbines);
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
    turbines.userData.place(groundAt);
    renderer.shadowMap.needsUpdate = true;
  };

  // 지도 위에 그리는 것: 밭과 풀밭 색, 풍력 발전기 자리, 단면을 잰 A-B 선, 곳 이름
  const useLayer = document.createElement('canvas');
  useLayer.width = useLayer.height = N;
  {
    const c = useLayer.getContext('2d'), img = c.createImageData(N, N);
    for (let k = 0; k < N * N; k++) {
      const col = sim.field[k] ? [196, 120, 60, 210] : sim.pasture[k] ? [120, 190, 80, 190] : null;
      if (col) img.data.set(col, k * 4);
    }
    c.putImageData(img, 0, 0);
  }
  const MAP_KEYS = ['high', 'pass', 'scarp', 'songcheon', 'namdae', 'hoenggye', 'chahang', 'suha', 'eoheul', 'wangsan', 'neunggyeong', 'gorupogi', 'gonsin', 'jewang'];
  const mapOverlay = (ctx, { ox, oy, sc }) => {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(useLayer, ox, oy, N * sc, N * sc);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    for (const [i, j] of TURBINES) { ctx.beginPath(); ctx.arc(ox + i * sc, oy + j * sc, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    line.forEach((p, n) => (n ? ctx.lineTo(ox + p.x * sc, oy + p.y * sc) : ctx.moveTo(ox + p.x * sc, oy + p.y * sc)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#b3261e';
    const A = line[0], B = line.at(-1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText('A', ox + A.x * sc - 4, oy + A.y * sc - 8); ctx.fillText('A', ox + A.x * sc - 4, oy + A.y * sc - 8);
    ctx.strokeText('B', ox + B.x * sc + 4, oy + B.y * sc + 22); ctx.fillText('B', ox + B.x * sc + 4, oy + B.y * sc + 22);
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    for (const key of MAP_KEYS) {
      const l = PLACES[key], x = ox + l.grid[0] * sc, y = oy + l.grid[1] * sc, text = l.peak ? `${l.name} ${l.sub}` : l.name, w = ctx.measureText(text).width;
      const dot = l.village || l.peak || key === 'pass';
      let tx = dot ? x + 7 : x - w / 2;
      if (tx + w > ox + N * sc - 4) tx = x - w - 7; // 오른쪽 끝을 넘으면 점 왼쪽에 쓴다.
      if (dot) { ctx.fillStyle = l.peak ? '#7a2e12' : '#20302a'; ctx.beginPath(); if (l.peak) { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); ctx.closePath(); } else ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(text, tx, y + 5);
      ctx.fillStyle = '#20302a'; ctx.fillText(text, tx, y + 5);
    }
    ctx.restore();
  };

  const round10 = v => Math.round(v / 10) * 10;
  const PROFILE_NOTE = `횡계 고원 서쪽 끝에서 대관령 고갯마루 바로 남쪽을 지나 동쪽 골짜기까지 동서로 곧게 자른 높이입니다(약 ${nums.lengthKm.toFixed(1)}km). 높이는 둘레 몇 칸의 가운데 값입니다. 서쪽 약 10km는 대체로 ${round10(nums.westLo)}~${round10(nums.westHi)}m로 높고 완만하지만, 동쪽은 1km 사이에 약 ${round10(nums.drop1km)}m가 낮아지는 급경사를 지나 약 ${round10(nums.end)}m의 골짜기까지 내려갑니다.`;
  const mapView = document.getElementById('mapView');
  const mapNote = document.getElementById('mapNote');
  let showing = '3d';
  const drawMapView = () => {
    mapView.hidden = showing === '3d';
    document.body.classList.toggle('show-map', showing !== '3d');
    mapNote.textContent = showing === 'profile' ? '' : '붉은 점선: 단면을 잰 길(A 서쪽에서 B 동쪽까지). 주황: 고랭지 밭, 연두: 목장 풀밭, 흰 점: 풍력 발전기, 세모: 산봉우리';
    mapNote.style.display = showing === 'profile' ? 'none' : '';
    if (showing === 'map') drawContourMap(mapView, { h: sim.h, N, sizeM: SIZE, water: stage.water, north: true, overlay: mapOverlay, interval: 20 });
    if (showing === 'low') drawHeightTint(mapView, { h: sim.sh, N, sizeM: SIZE, lo: 100, hi: 1200, north: true, overlay: mapOverlay, water: stage.water });
    if (showing === 'profile') drawProfile(mapView, { points: line, marks: profileMarks(line), from: 'A 서쪽 (횡계 고원)', to: 'B 동쪽 (강릉 쪽 골짜기)', note: PROFILE_NOTE });
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
  // 중요도 4 이상만 늘 보이고, 나머지는 겹치면 숨긴다.
  // 급경사 가까이 보기에서는 먼 고원 위 이름표가 하늘선에 몰려 몇 개를 뺀다.
  const HIDE = { scarp: ['field', 'wind', 'hoenggye', 'yongsan', 'chahang'], field: ['gorupogi', 'gonsin', 'neunggyeong'] };
  const KEY = { high: 5, scarp: 5, pass: 4, songcheon: 3, field: 3, wind: 3, ranch: 3, namdae: 3, hoenggye: 2 };
  function placeLabels() {
    if (!labelsOn || showing !== '3d') { labelLayer.place([]); return; }
    const list = [];
    // 모식도 칸(넓은 화면은 오른쪽)과 휴대폰의 아래쪽 출처 칸 뒤로 들어간 이름표는 비쳐 보이지 않게 뺀다.
    const phone = isPhone(), right = innerWidth - (schemEl.hidden || phone ? 0 : schemEl.offsetWidth) + 30, bottom = phone ? document.getElementById('corner').getBoundingClientRect().top : innerHeight;
    for (const [key, l] of Object.entries(PLACES)) {
      if (HIDE[currentView]?.includes(key)) continue;
      const w = world(l.grid[0], l.grid[1]);
      v3.set(w.x, ex(sampleH(sim.h, l.grid[0], l.grid[1])) + (key === 'wind' ? 95 : 25), w.z).project(camera);
      if (v3.z <= 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 && (v3.x * 0.5 + 0.5) * innerWidth < right && (-v3.y * 0.5 + 0.5) * innerHeight < bottom) list.push({ key, x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, priority: KEY[key] ?? 1, keep: (KEY[key] ?? 1) >= 4 });
    }
    labelLayer.place(list);
  }

  // 모식도의 구역을 누르면 3D의 같은 이름표를 밝힌다. 저위 평탄면과 골짜기는 이 화면에 따로 표시하지 않아 밝힐 이름표가 없다.
  const ZONE_LABEL = { high: ['high'], gentle: ['high', 'songcheon'], scarp: ['scarp'], eastRiver: ['namdae'], westRiver: ['songcheon'], use: ['field', 'ranch', 'wind'] };
  const HI_KEYS = [...new Set(Object.values(ZONE_LABEL).flat())];
  const schematic = createSchematic(schemEl, { steps: true, stage: LOW, onZone: zone => { const on = ZONE_LABEL[zone] ?? []; for (const key of HI_KEYS) labelLayer.element(key).classList.toggle('hi', on.includes(key)); invalidate(); } });
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
  document.getElementById('windBtn').onclick = e => { turbines.visible = !turbines.visible; e.currentTarget.classList.toggle('on', turbines.visible); renderer.shadowMap.needsUpdate = true; invalidate(); };

  setView('oblique');
  setHeight(2);
  setupPanel(document.getElementById('panelToggle'), fitView, PHONE);
  setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
  document.getElementById('load').hidden = true;
  startLoop(() => { placeLabels(); meter(); });

  window.__LAB = {
    setView, setHeight, setSchematic, stats: sim.stats, profile: nums,
    buildings: buildings.info, roads: () => roads.info(), turbines: () => ({ count: TURBINES.length, visible: turbines.visible }),
    labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
    setLabels(v) { labelsOn = v; placeLabels(); },
    renderNow() { renderer.render(scene, camera); placeLabels(); },
    schematic,
  };
  window.__APP_READY = true;
}

document.getElementById('note').textContent = '강원 평창 대관령면 횡계리 일대와 대관령 고개, 그 동쪽의 강릉 쪽 비탈입니다. 해발 약 750~850m의 높은 곳에 넓고 완만한 땅이 펼쳐지는데, 이것이 고위 평탄면입니다(고기 삭박면이라고도 부릅니다). 오랫동안 깎여 평탄해진 땅이 경동성 요곡 운동으로 동쪽이 크게 솟으면서 높은 곳에 남은 것으로 설명합니다. 높고 여름에도 서늘해 고랭지 배추를 기르는 밭과 목장이 많고, 바람이 센 능선에는 풍력 발전기가 섭니다. 대관령을 넘어 조금 더 가면 동쪽은 강릉 쪽으로 급하게 낮아집니다.';
document.getElementById('foot').innerHTML = ['고도 자료: Terrain Tiles on AWS (Mapzen). SRTM, GMTED2010 data courtesy of the U.S. Geological Survey. ETOPO1: U.S. NOAA.', '밭과 풀밭, 풍력 발전기, 하천, 도로, 지명 위치: OpenStreetMap contributors (ODbL).', '건물: 브이월드(국토교통부) 건물 자료.', '숲과 바위는 규칙으로 만든 예시입니다.', '표면 재질: ambientCG (CC0)'].map(t => `<span>${t}</span>`).join(' ');

start().catch(e => { say('오류: ' + e.message); console.error(e); });
