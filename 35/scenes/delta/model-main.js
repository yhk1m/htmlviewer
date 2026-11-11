// © 2026 김용현
// 삼각주 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
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
import { createModel, sectionProfile, sectionMarks, noteText, compareBrief, balance, rateVerdict, N, T_END } from './model.js';
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
  oblique: { p: [-70, 480, 500], t: [0, 0, 6] },
  above: { p: [0, 720, 55], t: [0, 0, 0] },
  low: { p: [-70, 230, 610], t: [0, 2, 8] },
  compare: { p: [0, 560, 780], t: [0, 4, 16] },
};
function setView(name) {
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
const waterMask = () => { const out = new Float32Array(N * N); for (let k = 0; k < N * N; k++) if (model.h[k] < model.levelAt((k / N) | 0)) out[k] = 1; return out; };
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing === 'map') drawContourMap(mapView, { h: model.h, N, sizeM: null, water: waterMask(), north: false, interval: 2 });
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
labels.add('river', '강', '', 'water');
labels.add('up', '상류', '', 'water');
labels.add('sea', '바다', '', 'water');
labels.add('bar', '모래톱', '하구 앞에 쌓임', 'sand');
labels.add('plume', '흙탕물', '진흙이 퍼짐', 'hot');
labels.add('branch', '분류', '갈라진 물길', 'water');
labels.add('island', '하중도', '', 'key');
labels.add('plain', '삼각주 평원', '', 'key');
labels.add('dam', '하굿둑', '', 'hot');
labels.add('flat', '갯벌', '조류가 옮긴 고운 흙', 'key');
labels.add('left', '하굿둑 없음', '', 'cmp');
labels.add('right', '하굿둑 있음', '', 'cmp');
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
    const s = toScreen(CENTER, -9, N + 10, blockA), q = toScreen(CENTER, -9, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  const surfaceAt = q => Math.max(model.sample(q.x, q.y), model.levelAt(Math.round(q.y)));
  const put = (key, q, up, priority, keep = true) => { if (!q) return; const s = toScreen(q.x, surfaceAt(q) + up, q.y); if (s) list.push({ key, ...s, priority, keep }); };
  put('dam', p.dam, 1.5, 12);
  put('flat', p.flat, 0.3, 8);
  put('island', p.island, 0.5, 11);
  put('plain', p.plain, 0.5, 10);
  put('bar', p.bar, 0.3, 9);
  put('plume', p.plume, 0.3, 7, false);
  put('branch', p.branch, 0.3, 8, false);
  put('river', p.river, 0.6, 6);
  put('up', p.up, 0.6, 3);
  put('sea', p.sea, 0.3, 3);
  labels.place(list);
  const pin = (el, x, y) => { const s = toScreen(x, Math.max(model.sample(x, y), model.levelAt(Math.round(y))) + 0.4, y); if (s) { el.hidden = false; el.style.transform = `translate(${s.x - 13}px,${s.y - 13}px)`; } };
  const sec = sectionProfile(model, 2);
  pin(pinA, sec.xs[0], sec.ys[0]); pin(pinB, sec.xs[1], sec.ys[1]);
}

// 실시간 단면: 계산이 쌓은 흙을 그대로 읽어 그린다. 두 블록을 비교할 때도 축척이 같다.
const SEC = { px: 62, floor: -3.4, top: 1.1 };
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 280;
  const p = sectionProfile(m, samples), base = H - 44;
  const yOf = v => base - (v - SEC.floor) * ((base - 56) / (SEC.top - SEC.floor)), x = t => (t / (samples - 1)) * W, cw = W / samples + 1;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  const seaNow = m.seaNow;
  for (let t = 0; t < samples; t++) {
    const top = yOf(p.top[t]), b = Math.min(p.base[t], p.top[t]);
    // 물
    const lvl = p.level[t] + (p.level[t] > 0 ? 0 : seaNow);
    if (p.top[t] < lvl) { ctx.fillStyle = p.chan[t] ? '#3f93d6' : '#3a7fb5'; ctx.fillRect(x(t), yOf(lvl), cw, top - yOf(lvl)); }
    // 처음 땅
    ctx.fillStyle = '#55524c'; ctx.fillRect(x(t), yOf(b), cw, H - yOf(b));
    // 쌓인 흙: 맨 아래에 앞서 쌓인 진흙(기저층), 그 위에 모래(전면층), 맨 위에 물이 넘쳐 쌓인 고운 흙(표면층)이다.
    const laid = p.sand[t] + p.mud[t];
    if (laid > 0.003 && !p.chan[t]) {
      const under = Math.max(0, p.mud[t] - p.over[t]), y1 = yOf(Math.min(p.top[t], b + under)), y2 = yOf(Math.min(p.top[t], b + under + p.sand[t]));
      ctx.fillStyle = '#6d5a48'; ctx.fillRect(x(t), y1, cw, yOf(b) - y1);
      ctx.fillStyle = '#e6cf90'; ctx.fillRect(x(t), y2, cw, y1 - y2);
      ctx.fillStyle = '#b7bd6f'; ctx.fillRect(x(t), top, cw, y2 - top);
    }
  }
  // 수면 선
  ctx.strokeStyle = (DK ? '#d8efff' : '#1d5f9e'); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, yOf(seaNow)); ctx.lineTo(W, yOf(seaNow)); ctx.stroke();
  const say = (text, cx, cy, color, size = 28) => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width;
    cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = P.bg; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  // 평원과 사면과 전삼각주가 실제로 생긴 구간에만 이름을 붙인다.
  const marks = sectionMarks(p);
  if (marks.plain) say('삼각주 평원', (x(marks.plain[0]) + x(marks.plain[1])) / 2, 46, (DK ? '#e8f2c4' : '#4f6b1c'));
  if (marks.slope) say('삼각주 사면', (x(marks.slope[0]) + x(marks.slope[1])) / 2 + 30, 84, P.hi);
  if (marks.prodelta) say('전삼각주', (x(marks.prodelta[0]) + x(marks.prodelta[1])) / 2 + 40, 122, (DK ? '#ffdca6' : '#8a5a1c'));
  ctx.font = '700 26px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.hi; ctx.textAlign = 'center';
  ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 42, W - 2, 41); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 42, W - 2, 1); }
  ctx.textAlign = 'left'; ctx.font = '700 25px "Malgun Gothic",sans-serif';
  const leg = [['#55524c', '처음 땅'], ['#b7bd6f', '표면층'], ['#e6cf90', '모래'], ['#6d5a48', '진흙']];
  let lx = 14;
  for (const [c, t] of leg) { ctx.fillStyle = c; ctx.fillRect(lx, H - 30, 18, 15); ctx.fillStyle = P.ink; ctx.fillText(t, lx + 22, H - 12); lx += 34 + ctx.measureText(t).width; }
  ctx.textAlign = 'right'; ctx.font = '24px "Malgun Gothic",sans-serif';
  ctx.fillText('세로 과장. 물길을 피해 잰 단면', W - 14, H - 12);
  ctx.textAlign = 'left';
}

const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
function syncInfo() {
  statsEl.innerHTML = `새 땅 <b>블록의 ${((model.newLand() / (N * N)) * 100).toFixed(1)}%</b>, 물길 <b>${model.liveTips()}갈래</b>, 쌓인 흙 중 바다가 옮겨 간 비율 <b>${Math.round(balance(model) * 100)}%</b>`;
  // 퇴적 속도와 침식 속도 막대. 두 막대의 축척은 같다.
  const top = Math.max(model.depositRate, model.erosionRate, 1);
  document.getElementById('depBar').style.width = `${(model.depositRate / top) * 100}%`;
  document.getElementById('eroBar').style.width = `${(model.erosionRate / top) * 100}%`;
  document.getElementById('rateNote').textContent = rateVerdict(model);
  const tideBadge = document.getElementById('tideBadge');
  tideBadge.textContent = model.options.tide === 'low' || model.finished ? '' : (model.tideRising() ? '지금은 밀물' : '지금은 썰물');
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록은 ${br.a}. 오른쪽 블록은 ${br.b}.${modelB.damUp ? ' 하굿둑이 흙을 막으면 퇴적 속도가 침식 속도보다 느려져 삼각주가 더 자라지 못하고 물에 닿은 가장자리부터 깎입니다.' : ' 하굿둑을 세우기 전까지는 두 블록이 똑같이 자랍니다.'}`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / T_END) * 100)}%`;
  document.getElementById('worksBadge').textContent = model.options.dam === 'yes' ? (model.damUp ? '하굿둑: 세움' : '하굿둑: 예정') : '하굿둑: 없음';
  // 지나간 단계로 되돌아가지 않게 가장 넓었을 때를 본다. 제거가 많으면 평원 단계로 가지 않는다.
  schematic.setStage(model.options.tide === 'high' ? 3 : model.peakArea > 1600 && balance(model) < 0.5 ? 2 : model.splits > 0 ? 1 : 0);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { river: ['river'], bar: ['bar'], branch: ['branch'], island: ['island'], plain: ['plain'], prodelta: ['plume'] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight, stage: 0 });
let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.matches('.panel-closed, .merged') ? 0 : document.getElementById('panel').offsetWidth + 20);
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

// 두 조건 비교: 왼쪽은 하굿둑 없음, 오른쪽은 있음. 둑을 세우기 전까지는 똑같이 자란다. 끝내면 비교 전에 고른 조건으로 돌아간다.
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
  if (on) { setShowing('3d'); model.applyPreset('textbook'); modelB.applyPreset('dam'); }
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
function frameSync(all) {
  dirty = true;
  blockA.syncFlow();
  if (compare) blockB.syncFlow();
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
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), land: model.newLand(), tips: model.liveTips(), splits: model.splits, finished: model.finished }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  arrowCount: () => blockA.arrowCount,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
