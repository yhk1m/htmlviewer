// © 2026 김용현
// 사빈, 사주, 석호 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap } from '../../shared/map-views.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, sectionProfile, noteText, budgetNote, compareBrief, N, T_END, SEA_LOW, RISE } from './model.js';
import { createBlock, VE } from './block.js';
import { createSchematic, NO_RISE } from './schematic.js';

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
scene.background = new THREE.Color(0x20262a);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2200;

// 바다 쪽에서 만의 입구와 사주를 바라본다.
const VIEWS = {
  oblique: { p: [60, 430, 560], t: [0, 0, 6] },
  above: { p: [0, 720, 55], t: [0, 0, 0] },
  low: { p: [70, 150, 380], t: [0, 2, 0] },
  compare: { p: [0, 560, 780], t: [0, 4, 16] },
};
let currentView = 'oblique';
function setView(name) {
  currentView = name;
  const z = portraitZoom(), { p, t } = VIEWS[name];
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
const waterMask = () => { const out = new Float32Array(N * N); for (let k = 0; k < N * N; k++) if (model.h[k] < model.sea) out[k] = 1; return out; };
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing === 'map') drawContourMap(mapView, { h: model.h, N, sizeM: null, water: waterMask(), north: false, interval: 1 });
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
labels.add('valley', '하천 골짜기', '빙기에 하천이 판 골짜기', 'key');
labels.add('river', '하천', '토사를 실어 옴', 'water');
labels.add('bay', '만', '바다에 잠긴 골짜기', 'water');
labels.add('spit', '사취', '만 입구 한쪽에서 뻗은 모래 띠', 'hot');
labels.add('bar', '사주', '만 입구를 막은 모래 띠', 'hot');
labels.add('lagoon', '석호', '바다와 거의 떨어진 호수', 'water');
labels.add('beach', '사빈', '모래 해안', 'sand');
labels.add('dune', '해안사구', '바람이 쌓은 모래 언덕', 'key');
labels.add('fill', '메워진 땅', '하천 토사가 쌓임', 'key');
labels.add('coast', '바닷가', '육지 쪽으로 옮겨 감', 'water');
labels.add('sea', '파랑이 오는 쪽', '', 'water');
labels.add('left', '모래 공급 많음', '', 'cmp');
labels.add('right', '모래 공급 적음', '', 'cmp');
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
    const s = toScreen(CENTER, -13, N + 10, blockA), q = toScreen(CENTER, -13, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  const surfaceAt = q => Math.max(model.sample(q.x, q.y), model.sea);
  const put = (key, q, up, priority, keep = true) => { if (!q) return; const s = toScreen(q.x, surfaceAt(q) + up, q.y); if (s) list.push({ key, ...s, priority, keep }); };
  put('valley', p.valley, 0.5, 10);
  put('river', p.river, 0.4, 7);
  put('bay', p.bay, 0.3, 10);
  put('spit', p.spit, 0.5, 12);
  put('bar', p.bar, 0.5, 12);
  put('lagoon', p.lagoon, 0.3, 11);
  put('beach', p.beach, 0.3, 9);
  put('dune', p.dune, 0.4, 9);
  put('fill', p.fill, 0.3, 8);
  put('coast', p.coast, 0.3, 8);
  put('sea', p.sea, 0.3, 3);
  labels.place(list);
  const S = sectionProfile(model, 2).S;
  const pin = (el, x, y) => { const s = toScreen(x, Math.max(model.sample(x, y), model.sea) + 0.4, y); if (s) { el.hidden = false; el.style.transform = `translate(${s.x - 13}px,${s.y - 13}px)`; } };
  pin(pinA, S.ax, S.ay); pin(pinB, S.bx, S.by);
}

// 실시간 단면: 계산이 쌓은 흙을 그대로 읽어 그린다. 두 블록을 비교할 때도 축척이 같다.
const KIND_COLOR = { bar: '#e6cf90', beach: '#e6cf90', dune: '#efdca6', fill: '#8f9a5c', river: '#3d8fc9' };
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 280;
  const p = sectionProfile(m, samples), base = H - 46, lo = SEA_LOW - 1.5, hi = Math.max(...p.start) + 1.5;
  const yOf = v => base - ((v - lo) / (hi - lo)) * (base - 14), x = t => (t / (samples - 1)) * W, cw = W / samples + 1;
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  const seaY = yOf(m.sea);
  for (let t = 0; t < samples; t++) if (p.top[t] < m.sea) { ctx.fillStyle = p.kinds[t] === 'lagoon' ? '#4fa59a' : '#3a7fb5'; const y = yOf(p.top[t]); ctx.fillRect(x(t), seaY, cw, y - seaY); }
  for (let t = 0; t < samples; t++) {
    const y = yOf(p.top[t]), ys = yOf(p.start[t]);
    ctx.fillStyle = '#6f665a';
    ctx.fillRect(x(t), Math.max(y, ys), cw, H - Math.max(y, ys));
    // 처음 땅 위에 쌓인 것: 모래는 모래색, 하천 토사는 풀빛 갈색으로 칠한다.
    if (y < ys - 0.5) { ctx.fillStyle = KIND_COLOR[p.kinds[t]] ?? (m.fill[Math.round(p.S.ay + (p.S.by - p.S.ay) * (t / (samples - 1))) * N + p.S.ax] > 0.05 ? '#7d6f55' : '#e6cf90'); ctx.fillRect(x(t), y, cw, ys - y); }
  }
  // 오늘날 해수면(점선)과 지금의 해수면(실선)
  ctx.strokeStyle = '#d8efff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, seaY); ctx.lineTo(W, seaY); ctx.stroke();
  if (m.sea < -0.05) { ctx.setLineDash([8, 6]); const y0 = yOf(0); ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke(); ctx.setLineDash([]); }
  const say = (text, cx, cy, color, size = 26) => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width;
    cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = '#1c211e'; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  // 실제로 생긴 지형에만 이름을 붙인다.
  const span = kinds => { let a = -1, b = -1; for (let t = 0; t < samples; t++) if (kinds.includes(p.kinds[t])) { if (a < 0) a = t; b = t; } return a < 0 ? null : [a, b]; };
  // 만과 사취, 사주는 만이 있을 때만 이름을 붙인다. 해안사구는 사주가 아닌 곳에도 생기므로 사주 칸으로만 찾는다.
  const lag = span(['lagoon']), bay = m.hasBay === false ? null : span(['bay']), bar = span(['bar']), fl = span(['fill']);
  if (lag) say('석호', x((lag[0] + lag[1]) / 2), seaY - 16, '#bff0e6');
  else if (bay) say('만', x((bay[0] + bay[1]) / 2), seaY - 16, '#d8efff');
  if (bar && m.hasBay && (lag || bay)) say(m.spit.closed ? '사주' : '사취', x((bar[0] + bar[1]) / 2), yOf(Math.max(...p.top.slice(bar[0], bar[1] + 1))) - 14, '#ffd36b');
  if (fl && fl[1] - fl[0] > 4) say('메워진 땅', x((fl[0] + fl[1]) / 2), yOf(p.top[fl[0]]) - 18, '#e8e3c8', 24);
  say('바다', W - 90, seaY + 34, '#ffffff', 24);
  if (m.sea < -0.05) say('오늘날 해수면', 170, yOf(0) - 10, '#d8efff', 22);
  ctx.font = '700 26px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#ffd36b'; ctx.textAlign = 'center';
  ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  ctx.textAlign = 'left'; ctx.font = '700 22px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#efe9d8';
  ctx.fillText('회색: 처음 땅, 모래색: 쌓인 모래, 풀빛과 갈색: 하천 토사', 14, H - 12);
  ctx.textAlign = 'right'; ctx.font = '22px "Malgun Gothic",sans-serif';
  ctx.fillText('세로 과장', W - 14, H - 12);
  ctx.textAlign = 'left';
}

const PHASE_NAME = { glacial: '빙기', rise: '해수면 상승', spit: '사취가 자람', lagoon: '사주와 석호', filling: '석호가 메워짐' };
const STAGE_OF = { glacial: 0, rise: 1, spit: 2, lagoon: 3, filling: 4 };
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
function syncInfo() {
  const ph = model.phase();
  const seaTxt = model.sea < -0.05 ? `오늘날보다 약 ${Math.round((model.sea / SEA_LOW) * 120)}m 낮음` : "오늘날 높이";
  let stats = `해수면 <b>${seaTxt}</b>`;
  if (model.hasBay && !model.spit.closed && model.clock >= RISE[1]) stats += `, 열린 입구 <b>처음 폭의 약 ${model.gapPercent()}%</b>`;
  if (model.spit.closed) stats += `, 석호 넓이 <b>막혔을 때의 ${Math.round((model.lagoonArea() / Math.max(1, model.lagoonStart)) * 100)}%</b>`;
  statsEl.innerHTML = stats;
  const need = model.needLeft(), come = model.supplyLeft(), top = Math.max(need, come, 1);
  // 빙기에는 감추고, 해수면이 오르는 동안에는 막대 없이 문구만 보인다.
  const showRates = model.options.rise === 'yes' && ph !== 'glacial';
  document.getElementById('rates').hidden = !showRates;
  document.querySelectorAll('#rates .rate').forEach(el => { el.hidden = ph === 'rise'; });
  document.getElementById('depBar').style.width = `${(model.spit.closed ? 1 : come / top) * 100}%`;
  document.getElementById('eroBar').style.width = `${(model.spit.closed ? 0 : need / top) * 100}%`;
  document.getElementById('comeVal').textContent = model.spit.closed ? '입구가 막힘' : '끝날 때까지 연안류가 실어 올 양';
  document.getElementById('needVal').textContent = model.spit.closed ? '남은 입구 없음' : '남은 입구의 물을 바닥부터 메울 양';
  document.getElementById('rateNote').textContent = budgetNote(model);
  const badge = document.getElementById('phaseBadge');
  badge.textContent = model.finished ? '완성' : model.options.rise === 'no' ? '사빈이 자람' : PHASE_NAME[ph];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록은 ${br.a}. 오른쪽 블록은 ${br.b}. 만 입구를 다 막으려면 깊은 입구를 메울 만큼 모래가 들어와야 합니다.`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / T_END) * 100)}%`;
  schematic.setStage(model.options.rise === 'no' ? NO_RISE : STAGE_OF[ph]);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { valley: ['valley'], bay: ['bay'], spit: ['spit'], bar: ['bar'], lagoon: ['lagoon'], beach: ['beach'], dune: ['dune'], river: ['river', 'fill'], current: [], wave: ['sea'] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight, stage: 0 });
let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20);
const sheetH = () => (isPhone() ? document.getElementById('side').offsetHeight : 0);
function fit() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  camera.setViewOffset(innerWidth, innerHeight, (dock() - panelW()) / 2, sheetH() / 2, innerWidth, innerHeight);
  drawMap();
  dirty = true;
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fit(); });
const playBtn = document.getElementById('playBtn');
const setPlaying = on => { playing = on; playBtn.textContent = on ? '멈춤' : '재생'; playBtn.classList.toggle('on', on); };
playBtn.onclick = () => setPlaying(!playing);
const restart = () => { settle = 0; frameSync(true); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
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

// 두 조건 비교: 왼쪽은 모래 공급 많음, 오른쪽은 적음. 나머지는 같다. 끝내면 비교 전에 고른 조건으로 돌아간다.
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
  if (on) { setShowing('3d'); Object.assign(model.options, { sand: 'high', river: 'mid', rise: 'yes' }); model.reset(); Object.assign(modelB.options, { sand: 'low', river: 'mid', rise: 'yes' }); modelB.reset(); }
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
  if (computing) wavePhase = (wavePhase + dt * 0.35 * speed) % 1;
  if (computing) {
    model.tick(dt * speed);
    if (compare) modelB.tick(dt * speed);
    frame++;
    frameSync(false);
  } else if (wasComputing) frameSync(true);
  wasComputing = computing;
  if (!dirty) return;
  dirty = false;
  if (!computing) syncLabels();
  renderer.render(scene, camera);
  meter();
}

const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [blockA.terrain, blockB.terrain], invalidate: () => { dirty = true; }, scene });
window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

setView('oblique');
setPanel = setupPanel(document.getElementById('panelToggle'), fit, isPhone());
setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
frameSync(true);
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), sea: +model.sea.toFixed(2), phase: model.phase(), tip: model.spit.tip, closed: model.spit.closed, lagoon: model.lagoonArea(), finished: model.finished }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
