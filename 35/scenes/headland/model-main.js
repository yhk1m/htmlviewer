// © 2026 김용현
// 곶과 만 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import { createProgressBar } from '../../shared/progress.js';
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap } from '../../shared/map-views.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, sectionProfile, noteText, archNote, caveViewNote, compareBrief, ratioNote, N, T_END, SEA, ARCH, HEAD_X, BAY_X } from './model.js';
import { createBlock, VE } from './block.js';
import { createSchematic } from './schematic.js';
import { figPalette, isDark, bg3d } from '../../shared/theme.js';

const QUALITY_NAME = currentQuality(isPhone()), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const model = createModel();
const CENTER = N / 2;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(bg3d());
addEventListener('themechange', () => { scene.background.set(bg3d()); frameSync(true); });
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2200;

const VIEWS = {
  oblique: { p: [-70, 470, 500], t: [0, 0, 10] },
  above: { p: [0, 720, 55], t: [0, 0, 0] },
  low: { p: [-70, 230, 610], t: [0, 2, 8] },
  compare: { p: [0, 560, 780], t: [0, 4, 16] },
  // 좁은 곶을 옆에서 낮게 본다. 뚫린 구멍으로 건너편 바다가 보인다.
  arch: { p: [ARCH.cx - CENTER - 92, 13, (ARCH.j0 + ARCH.j1) / 2 - CENTER + 44], t: [ARCH.cx - CENTER, 4, (ARCH.j0 + ARCH.j1) / 2 - CENTER] },
};
let currentView = 'oblique';
// 곶의 해식동을 바다에서 낮게 본다. 해식애가 물러나므로 누를 때 자리를 정한다.
const caveView = () => { const c = model.cliffCaves[0], t = [c.x - CENTER, 3, model.front[c.x] - CENTER]; return { p: [t[0] - 26, 20, t[2] + 72], t }; };
function setView(name) {
  currentView = name;
  const z = portraitZoom(), { p, t } = name === 'cave' ? caveView() : VIEWS[name];
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  dirty = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.2));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.7);
sun.position.set(-190, 230, 150);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -210, right: 210, top: 210, bottom: -210, near: 10, far: 800 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.8;
scene.add(sun);

const blockA = createBlock(model);
scene.add(blockA.group);
const COMPARE_GAP = (N + 14) / 2;
const modelB = createModel();
const blockB = createBlock(modelB);
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

const mapView = document.getElementById('mapView');
let showing = '3d';
// 지도는 위에서 본 땅이다. 천장이 덮인 칸은 물이 아니라 바위 윗면으로 그린다.
const surfaceH = () => { const out = model.h.slice(); for (let k = 0; k < N * N; k++) if (model.caved[k]) out[k] = model.start[k]; return out; };
const waterMask = () => { const out = new Float32Array(N * N); for (let k = 0; k < N * N; k++) if (model.h[k] < SEA && !model.caved[k]) out[k] = 1; return out; };
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing === 'map') drawContourMap(mapView, { h: surfaceH(), N, sizeM: null, water: waterMask(), north: false, interval: 2 });
};
const setShowing = name => {
  showing = name;
  document.querySelectorAll('[data-show]').forEach(o => o.classList.toggle('on', o.dataset.show === name));
  document.body.classList.toggle('show-map', name !== '3d');
  drawMap();
};
document.querySelectorAll('[data-show]').forEach(b => b.onclick = () => setShowing(b.dataset.show));

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('head', '곶', '파랑이 모임', 'hot');
labels.add('bay', '만', '파랑이 퍼짐', 'water');
labels.add('cliff', '해식애', '깎이는 절벽', 'hot');
labels.add('platform', '파식대', '절벽이 물러난 자리', 'key');
labels.add('beach', '모래 해안', '만에 쌓인 모래', 'sand');
labels.add('stack', '시스택', '단단한 바위', 'key');
labels.add('sea', '파랑이 오는 쪽', '', 'water');
labels.add('cape', '좁은 곶', '검은 줄이 약한 절리', 'key');
labels.add('stackArch', '시스택', '천장이 무너져 남은 바위', 'key');
labels.add('cliffCave', '해식동', '해식애 안쪽으로 파인 굴', 'hot');
labels.add('cave', '해식동', '반대쪽으로 파고드는 중', 'hot');
labels.add('arch', '시아치', '곶이 뚫려 생긴 구름다리', 'key');
labels.add('shallow', '곶 앞 바다', '얕음', 'water');
labels.add('deep', '만 앞 바다', '깊음', 'water');
labels.add('left', '무른 암석', '', 'cmp');
labels.add('right', '단단한 암석', '', 'cmp');
const makePin = t => { const el = document.createElement('div'); el.className = 'pin'; el.textContent = t; el.hidden = true; document.getElementById('labels').appendChild(el); return el; };
const pinA = makePin('A'), pinB = makePin('B');

const v3 = new THREE.Vector3();
const toScreen = (x, y, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, y * VE, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  pinA.hidden = pinB.hidden = true;
  if (showing !== '3d' || !labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CENTER, -11, N + 10, blockA), q = toScreen(CENTER, -11, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  const surfaceAt = q => Math.max(model.sample(q.x, q.y), SEA);
  const put = (key, q, up, priority, keep = true) => { if (!q) return; const s = toScreen(q.x, surfaceAt(q) + up, q.y); if (s) list.push({ key, ...s, priority, keep }); };
  put('head', p.head, 1, 10);
  put('bay', p.bay, 0.4, 10);
  put('cliff', p.cliff, 0.5, 9);
  put('platform', p.platform, 0.3, 9);
  put('beach', p.beach, 0.3, 8);
  put('stack', p.stack, 0.6, 11);
  put('stackArch', p.stackArch, 0.6, 11);
  put('sea', p.sea, 0.3, 3);
  // 천장이 있는 자리는 바닥이 아니라 바위 윗면에 이름표를 붙인다.
  for (const key of ['cape', 'arch']) if (p[key]) { const s = toScreen(p[key].x, ARCH.top + 0.6, p[key].y); if (s) list.push({ key, ...s, priority: 11, keep: true }); }
  // 해식동은 해식애 면의 입구를 가리킨다.
  if (p.cliffCave) { const s = toScreen(p.cliffCave.x, SEA + p.cliffCave.height * 0.6, p.cliffCave.y); if (s) list.push({ key: 'cliffCave', ...s, priority: 12, keep: true }); }
  if (p.cave) { const s = toScreen(p.cave.x, SEA + 1.2, p.cave.y); if (s) list.push({ key: 'cave', ...s, priority: 11, keep: true }); }
  const row = model.depthRow();
  put('shallow', { x: HEAD_X[0], y: row }, 0.3, 7);
  put('deep', { x: BAY_X, y: row }, 0.3, 7);
  labels.place(list);
  const S = sectionProfile(model, 2).S;
  const pin = (el, x, y) => { const s = toScreen(x, Math.max(model.sample(x, y), SEA) + 0.4, y); if (s) { el.hidden = false; el.style.transform = `translate(${s.x - 13}px,${s.y - 13}px)`; } };
  pin(pinA, S.ax, S.ay); pin(pinB, S.bx, S.by);
}

// 실시간 단면: 계산이 쌓은 흙을 그대로 읽어 그린다. 두 블록을 비교할 때도 축척이 같다.
const pStart0 = p => p.kinds.filter(k => k === 'platform').length > 4;
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 280;
  const p = sectionProfile(m, samples), base = H - 46, lo = -5, hi = Math.max(...p.start) + 3;
  const yOf = v => base - ((v - lo) / (hi - lo)) * (base - 14), x = t => (t / (samples - 1)) * W, cw = W / samples + 1;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  const seaY = yOf(SEA);
  ctx.fillStyle = '#3a7fb5';
  for (let t = 0; t < samples; t++) if (p.top[t] < SEA) { const y = yOf(p.top[t]); ctx.fillRect(x(t), seaY, cw, y - seaY); }
  for (let t = 0; t < samples; t++) {
    const y = yOf(p.top[t]), k = p.kinds[t];
    ctx.fillStyle = '#6f665a';
    ctx.fillRect(x(t), y, cw, H - y);
    // 윗면의 색만 칠한다. 파식대는 깎인 바위 면이고 그 아래는 같은 암석이다.
    if (k === 'platform' || k === 'beach' || k === 'shoal') { ctx.fillStyle = k === 'platform' ? '#c7bda6' : '#e6cf90'; ctx.fillRect(x(t), y, cw, 8); }
  }
  // 처음 땅: 깎이기 전의 윤곽을 점선으로 남긴다.
  ctx.strokeStyle = (DK ? '#efe9d8' : '#333'); ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
  ctx.beginPath();
  for (let t = 0; t < samples; t++) { const y = yOf(p.start[t]); if (t) ctx.lineTo(x(t), y); else ctx.moveTo(x(t), y); }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = (DK ? '#d8efff' : '#1d5f9e'); ctx.lineWidth = 2;
  let firstSea = 0;
  for (let t = 0; t < samples; t++) if (p.top[t] < SEA) { firstSea = t; break; }
  ctx.beginPath(); ctx.moveTo(x(firstSea), seaY); ctx.lineTo(W, seaY); ctx.stroke();
  const say = (text, cx, cy, color, size = 28) => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width;
    cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = P.bg; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  // 실제로 생긴 지형에만 이름을 붙인다.
  if (pStart0(p)) say('해식애', x(firstSea) - 70, Math.max(46, yOf(p.top[Math.max(0, firstSea - 8)]) - 16), P.hi);
  let pStart = -1, pEnd = -1;
  for (let t = 0; t < samples; t++) if (p.kinds[t] === 'platform') { if (pStart < 0) pStart = t; pEnd = t; }
  if (pEnd - pStart > 4) say('파식대', (x(pStart) + x(pEnd)) / 2 + 20, seaY - 22, P.ink);
  say('파랑', W - 130, seaY - 22, (DK ? '#ffffff' : '#1d5f9e'), 26);
  // 해식동: 해식애 안쪽으로 파인 굴을 잘라 본 모습. 안쪽으로 갈수록 천장이 낮아진다.
  if (p.cave) {
    const back = firstSea - p.cave.depth / p.cave.cellsPerSample;
    ctx.fillStyle = '#0e1112';
    ctx.beginPath(); ctx.moveTo(x(firstSea), seaY); ctx.lineTo(x(firstSea), yOf(p.cave.height)); ctx.quadraticCurveTo(x((firstSea + back) / 2), yOf(p.cave.height * 0.95), x(back), seaY); ctx.closePath(); ctx.fill();
    say('해식동', x(back) - 90, yOf(p.cave.height) - 6, P.hi);
  }
  ctx.font = '700 26px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.hi; ctx.textAlign = 'center';
  ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 38, W - 2, 37); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 38, W - 2, 1); }
  ctx.textAlign = 'left'; ctx.font = '700 24px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText('점선: 처음 땅', 14, H - 12);
  ctx.textAlign = 'right'; ctx.font = '24px "Malgun Gothic",sans-serif';
  ctx.fillText('세로 과장', W - 14, H - 12);
  ctx.textAlign = 'left';
}

const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
function syncInfo() {
  statsEl.innerHTML = `곶이 물러난 거리 <b>평균 ${Math.round(model.retreat())}칸</b>, 파식대 폭 <b>${model.platformWidth()}칸</b>, 시스택 <b>${model.stacks.length}개</b>`;
  const he = model.headEnergy(), be = model.bayEnergy(), top = Math.max(he, be, 0.01);
  document.getElementById('depBar').style.width = `${(he / top) * 100}%`;
  document.getElementById('eroBar').style.width = `${(be / top) * 100}%`;
  document.getElementById('rateNote').textContent = ratioNote(model);
  const dp = model.depths(), dtop = Math.max(dp.head, dp.bay, 0.01);
  document.getElementById('shallowBar').style.width = `${(dp.head / dtop) * 100}%`;
  document.getElementById('deepBar').style.width = `${(dp.bay / dtop) * 100}%`;
  document.getElementById('depthNote').textContent = `먼바다에서 같은 거리(흰 점선)에서 재면 곶 앞 수심은 만 앞의 약 ${Math.round((dp.head / Math.max(dp.bay, 0.01)) * 100)}%입니다. 바닥의 깊이가 해안선을 닮아 곶 앞으로 얕은 바다가 튀어나왔기 때문에, 파랑은 곶 앞에서 먼저 느려져 굴절합니다.`;
  const stage = model.archStage();
  document.querySelectorAll('[data-arch]').forEach(el => el.classList.toggle('on', el.dataset.arch === stage));
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록은 ${br.a}. 오른쪽 블록은 ${br.b}. 같은 파랑이라도 암석이 단단할수록 해안이 천천히 변합니다.`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  // 시아치 보기에서는 눈앞의 단계를 설명한다.
  const closeStage = currentView === 'arch' && !model.finished && (stage === 'cave' || stage === 'arch' || stage === 'stack');
  noteEl.textContent = currentView === 'cave' && !model.finished ? caveViewNote(model) : closeStage ? archNote(stage) : noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / T_END) * 100)}%`;
  // 곧아진 해안 단계는 오랜 시간 뒤의 그림이라 자동으로 넘어가지 않는다.
  schematic.setStage(model.platformWidth() >= 8 ? 2 : model.clock > 6 ? 1 : 0);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { head: ['head'], bay: ['bay'], cliff: ['cliff'], platform: ['platform'], beach: ['beach'], stack: ['stack', 'stackArch'], wave: ['sea'], arch: ['cliffCave', 'cave', 'arch'] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight, stage: 0 });
let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20);
const sheet = () => (isPhone() ? document.getElementById('side').offsetHeight : 0);
function fit() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  camera.setViewOffset(innerWidth, innerHeight, (dock() - panelW()) / 2, sheet() / 2, innerWidth, innerHeight);
  drawMap();
  dirty = true;
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fit(); });
const playBtn = document.getElementById('playBtn');
const setPlaying = on => { playing = on; playBtn.textContent = on ? '멈춤' : '재생'; playBtn.classList.toggle('on', on); };
playBtn.onclick = () => setPlaying(!playing);
const restart = () => { settle = 0; frameSync(true); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
// 진행 막대: 누르거나 끌면 그 시점까지 처음부터 다시 계산해 옮긴다.
const progress = createProgressBar(document.getElementById('progHost'), {
  clock: () => model.clock, total: () => T_END, finished: () => model.finished,
  reset: () => { model.reset(); if (compare) modelB.reset(); },
  step: dt => { model.tick(dt); if (compare) modelB.tick(dt); },
  pause: () => { const w = playing; setPlaying(false); return w; },
  resume: w => { settle = 0; frameSync(true); setPlaying(w); },
});
document.getElementById('fastBtn').onclick = e => { speed = speed === 1 ? 3 : 1; e.currentTarget.classList.toggle('on', speed === 3); e.currentTarget.textContent = speed === 3 ? '3배 빠르게' : '빠르게'; };
document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); dirty = true; };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(compare && b.dataset.view === 'oblique' ? 'compare' : b.dataset.view));
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  model.reset();
  document.querySelectorAll(`[data-opt^="${name}:"]`).forEach(o => o.classList.toggle('on', o === b));
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.remove('on'));
  restart();
});
const markOptions = () => document.querySelectorAll('[data-opt]').forEach(o => {
  const [name, val] = o.dataset.opt.split(':');
  o.classList.toggle('on', model.options[name] === val);
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  model.applyPreset(b.dataset.preset);
  markOptions();
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.toggle('on', o === b));
  restart();
});

// 두 조건 비교: 왼쪽은 무른 암석, 오른쪽은 단단한 암석. 파랑은 같다. 끝내면 비교 전에 고른 조건으로 돌아간다.
let before = null;
function setCompare(on) {
  if (on === compare) return;
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 350 : 210;
  Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e });
  sun.shadow.camera.updateProjectionMatrix();
  document.body.classList.toggle('comparing', on);
  if (on) {
    before = { options: { ...model.options }, preset: document.querySelector('[data-preset].on')?.dataset.preset ?? null };
    panelBeforeCompare = document.body.classList.contains('panel-closed');
    setPanel(true);
  } else setPanel(panelBeforeCompare);
  document.getElementById('compareBtn').classList.toggle('on', on);
  document.getElementById('sectionB').hidden = !on;
  document.getElementById('compareCap').hidden = !on;
  if (on) { setShowing('3d'); Object.assign(model.options, { wave: 'mid', rock: 'soft' }); model.reset(); Object.assign(modelB.options, { wave: 'mid', rock: 'hard' }); modelB.reset(); }
  else {
    for (const [k, v] of Object.entries(before.options)) model.setOption(k, v);
    model.reset();
  }
  markOptions();
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.toggle('on', !on && o.dataset.preset === before?.preset));
  setView(on ? 'compare' : 'oblique');
  restart();
}
document.getElementById('compareBtn').onclick = () => setCompare(!compare);
document.getElementById('compareEnd').onclick = () => setCompare(false);

let frame = 0;
let wavePhase = 0;
function frameSync(all) {
  dirty = true;
  blockA.syncFlow();
  if (compare) blockB.syncFlow();
  blockA.syncWaves(wavePhase);
  if (compare) blockB.syncWaves(wavePhase);
  const fullTerrain = all || frame % 30 === 0;
  if (fullTerrain || frame % 2 === 0) { blockA.syncTerrain(fullTerrain); if (compare) blockB.syncTerrain(fullTerrain); }
  if (all || frame % 30 === 0) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 6 === 0) { drawSection(document.getElementById('section'), model); if (compare) drawSection(document.getElementById('sectionB'), modelB); syncInfo(); }
  if (all || frame % 30 === 0) drawMap();
  syncLabels();
}
// 계산이 끝나면 그리기를 멈춘다. 시점을 돌릴 때만 다시 그린다.
const SETTLE_SECONDS = 0.3;
const busy = m => !m.finished;
let last = performance.now(), settle = 0, wasComputing = true;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let computing = false;
  if (playing) {
    if (busy(model) || (compare && busy(modelB))) settle = 0; else settle += dt * speed;
    computing = settle < SETTLE_SECONDS;
  }
  // 파봉선은 끝난 뒤에도 천천히 움직이지 않는다. 재생 중에만 움직여 다 그린 뒤에는 멈춘다.
  if (computing) wavePhase = (wavePhase + dt * 0.35 * speed) % 1;
  if (computing) {
    model.tick(dt * speed);
    if (compare) modelB.tick(dt * speed);
    frame++;
    frameSync(false);
  } else if (wasComputing) frameSync(true);
  wasComputing = computing;
  progress.update();
  if (!dirty) return;
  dirty = false;
  if (!computing) syncLabels();
  renderer.render(scene, camera);
  meter();
}

// 두 번 누르면 그 자리가 회전 중심이 된다. 그리기를 멈춘 뒤에도 깨워서 움직인다. 숨긴 비교 블록은 대상에서 저절로 빠진다.
const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [blockA.terrain, blockB.terrain], invalidate: () => { dirty = true; }, scene });
window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

setView('oblique');
setPanel = setupPanel(document.getElementById('panelToggle'), fit, isPhone());
setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
frameSync(true);
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  progress, model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), retreat: +model.retreat().toFixed(1), plat: model.platformWidth(), stacks: model.stacks.length, head: +model.headEnergy().toFixed(2), bay: +model.bayEnergy().toFixed(2), finished: model.finished }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  arrowCount: () => blockA.arrowCount,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
