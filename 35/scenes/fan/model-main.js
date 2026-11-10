// © 2026 김용현
// 선상지 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
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
import { createModel, N, MOUTH, GRAINS } from './model.js';
import { createBlock } from './block.js';

const QUALITY_NAME = currentQuality(isPhone()), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const model = createModel();
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const CENTER = MOUTH.i;

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
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2000;

const VIEWS = {
  oblique: { p: [-108, 292, 462], t: [0, 4, 34] },
  above: { p: [0, 700, 150], t: [0, 0, 10] },
  mouth: { p: [-175, 92, 150], t: [12, 16, -18] },
  compare: { p: [0, 560, 800], t: [0, 4, 30] },
};
function setView(name) {
  const { p, t } = VIEWS[name], z = portraitZoom();
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  dirty = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
sun.position.set(-230, 170, 60);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 800 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.8;
scene.add(sun);

const blockA = createBlock(model);
scene.add(blockA.group);
const COMPARE_GAP = 145;
const modelB = createModel();
const blockB = createBlock(modelB);
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

// 선상지 길이: 곡구 아래 중심선에서 눈에 띄게 쌓인 곳까지
function axisLength() {
  let last = 0;
  for (let j = MOUTH.j; j < N - 2; j++) {
    let s = 0;
    for (let p = -5; p <= 5; p++) s += model.thick[j * N + CENTER + p];
    if (s / 11 > 1.2) last = j - MOUTH.j;
  }
  return last;
}

// 보기 전환: 3D와 등고선 지형도
const mapView = document.getElementById('mapView');
let showing = '3d';
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing === 'map') drawContourMap(mapView, { h: model.h, N, sizeM: null, water: model.mask, north: false });
};
const setShowing = name => {
  showing = name;
  document.querySelectorAll('[data-show]').forEach(o => o.classList.toggle('on', o.dataset.show === name));
  drawMap();
};
document.querySelectorAll('[data-show]').forEach(b => b.onclick = () => setShowing(b.dataset.show));

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('mouth', '곡구');
labels.add('apex', '선정');
labels.add('mid', '선앙');
labels.add('toe', '선단');
labels.add('sink', '스며듦', '', 'water');
labels.add('spring', '다시 솟아남', '', 'water');
labels.add('left', '물이 적은 곳', '', 'cmp');
labels.add('right', '물이 많은 곳', '', 'cmp');

const v3 = new THREE.Vector3();
const toScreen = (x, y, z) => {
  v3.set(x - CENTER + blockA.group.position.x, y, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  // 멈춘 동안 시점이 바뀌면 그리기 전에 여기로 오므로 카메라 행렬을 먼저 맞춘다.
  camera.updateMatrixWorld();
  if (showing !== '3d' || !labelsOn) { labels.place([]); return; }
  const list = [];
  const put = (key, x, y, z, priority, keep = false) => { const s = toScreen(x, y, z); if (s) list.push({ key, ...s, priority, keep }); };
  put('mouth', CENTER, model.sample(CENTER, MOUTH.j - 10) + 12, MOUTH.j - 10, 9.5, true);
  const R = axisLength();
  if (R > 45) {
    const at = t => { const j = MOUTH.j + R * t; return [CENTER, model.sample(CENTER, j), j]; };
    let p = at(0.2); put('apex', p[0], p[1] + 7, p[2], 10, true);
    p = at(0.5); put('mid', p[0], p[1] + 6, p[2], 9, true);
    p = at(0.95); put('toe', p[0], p[1] + 5, p[2], 7, true);
    const path = model.calmPath;
    if (!model.flooding && path.length) {
      const find = t => { let b = path[0]; for (const q of path) if (Math.abs(q.t - t) < Math.abs(b.t - t)) b = q; return b; };
      const a = find(0.34), b = find(0.88);
      put('sink', a.x, model.sample(a.x, a.y) + 5, a.y, 8);
      put('spring', b.x, model.sample(b.x, b.y) + 5, b.y, 8);
    }
  }
  if (compare) {
    list.length = 0;
    // 블록 앞쪽 아래의 빈 바탕에 놓아 지형 위의 이름표와 겹치지 않게 한다.
    put('left', CENTER, -10, N + 16, 6, true);
    put('right', CENTER + 2 * COMPARE_GAP, -10, N + 16, 6, true);
  }
  labels.place(list);
}

// 실시간 단면: 계산이 실제로 쌓은 층을 그대로 그린다.
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const j0 = MOUTH.j - 26, j1 = N - 1, sx = W / (j1 - j0);
  const VE = 8.2, floorY = H - 28;
  const yOf = v => floorY - (v - 6) * VE;
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  // 기반암
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let j = j0; j <= j1; j++) ctx.lineTo((j - j0) * sx, yOf(m.base[j * N + CENTER]));
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = '#5a5249'; ctx.fill();
  // 쌓인 층: 층 두께 합이 실제 높이에 맞도록 맞춘다.
  for (let j = j0; j <= j1; j++) {
    const k = j * N + CENTER;
    const stack = m.section[j];
    const total = stack.reduce((s, l) => s + l.t, 0);
    const realT = m.h[k] - m.base[k];
    if (total <= 0 || realT <= 0) continue;
    const f = realT / total;
    let y = yOf(m.base[k]);
    for (const l of stack) {
      const dy = l.t * f * VE;
      ctx.fillStyle = GRAINS[l.c].color;
      ctx.fillRect((j - j0) * sx, y - dy, sx + 1, dy + 0.5);
      y -= dy;
    }
  }
  // 물
  if (m.flooding) {
    ctx.beginPath();
    for (let j = j0; j <= j1; j++) { const y = yOf(m.h[j * N + CENTER]) - 3; j === j0 ? ctx.moveTo(0, y) : ctx.lineTo((j - j0) * sx, y); }
    ctx.strokeStyle = '#59b7f0'; ctx.lineWidth = 4; ctx.stroke();
  }
  ctx.font = '700 26px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#ffd36b';
  ctx.fillText('A', 10, 32); ctx.fillText('B', W - 30, 32);
  ctx.fillStyle = '#f3f1ea'; ctx.font = '700 22px "Malgun Gothic",sans-serif';
  const mx = (MOUTH.j - j0) * sx;
  ctx.fillText('곡구', mx - 22, 32);
  ctx.strokeStyle = '#f3f1ea'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(mx, 42); ctx.lineTo(mx, yOf(m.h[MOUTH.j * N + CENTER]) - 6); ctx.stroke(); ctx.setLineDash([]);
}

const barsEl = document.getElementById('bars');
barsEl.innerHTML = GRAINS.map(g => `<div class="bar"><span class="name" style="color:${g.color}">${g.name}</span><div class="track"><i id="bar-${g.key}" style="background:${g.color}"></i></div></div>`).join('');
const noteEl = document.getElementById('now');
const NOTES = {
  empty: '빈 평지에서 시작합니다. 홍수가 나면 물과 토사가 좁은 골짜기를 따라 내려와 곡구로 나옵니다.',
  flood: '홍수입니다. 곡구를 벗어난 물은 넓게 퍼지며 힘이 약해집니다. 그래서 자갈이 먼저 멈추고, 모래는 더 가고, 진흙은 가장 멀리 갑니다. 쌓인 곳은 높아져 다음 물길은 낮은 쪽으로 옮겨 갑니다.',
  done: '선상지가 완성되었습니다. 곡구에 산지와 붙은 선정부터 선앙, 선단까지 입자가 작아지는 것을 단면에서 확인해 보세요. 평소의 물은 선앙에서 스며들었다가 선단에서 다시 솟아납니다.',
  calm: '홍수가 끝났습니다. 평소의 물은 선앙의 자갈과 모래 틈으로 스며들어 땅 위에서 사라졌다가 선단에서 다시 솟아납니다.',
};
function syncInfo() {
  const means = model.meanDistances();
  document.getElementById('barsNote').hidden = !compare;
  GRAINS.forEach((g, i) => { document.getElementById(`bar-${g.key}`).style.width = `${clamp(means[i] / 130) * 100}%`; });
  document.getElementById('floods').textContent = model.finished ? `홍수 ${model.floodCount}번으로 완성` : `홍수 ${model.floodCount}번째`;
  noteEl.textContent = model.finished ? NOTES.done : model.floodCount <= 1 && model.clock < 4 ? NOTES.empty : model.flooding ? NOTES.flood : NOTES.calm;
}

// 조작
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
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); frameSync(true); setPlaying(true); };
// 진행 막대: 누르거나 끌면 그 시점까지 처음부터 다시 계산해 옮긴다.
const progress = createProgressBar(document.getElementById('progHost'), {
  clock: () => model.clock, total: () => model.totalSeconds, finished: () => model.finished,
  reset: () => { model.reset(); if (compare) modelB.reset(); },
  step: dt => { model.tick(dt); if (compare) modelB.tick(dt); },
  pause: () => { const w = playing; setPlaying(false); return w; },
  resume: w => { settle = 0; frameSync(true); setPlaying(w); },
});
document.getElementById('fastBtn').onclick = e => { speed = speed === 1 ? 3 : 1; e.currentTarget.classList.toggle('on', speed === 3); e.currentTarget.textContent = speed === 3 ? '3배 빠르게' : '빠르게'; };
document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); dirty = true; };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  document.querySelectorAll(`[data-opt^="${name}:"]`).forEach(o => o.classList.toggle('on', o === b));
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.remove('on'));
  frameSync(true);
});
const markOptions = () => document.querySelectorAll('[data-opt]').forEach(o => {
  const [name, val] = o.dataset.opt.split(':');
  o.classList.toggle('on', model.options[name] === val);
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  model.applyPreset(b.dataset.preset);
  markOptions();
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.toggle('on', o === b));
  frameSync(true);
  setPlaying(true);
});

// 두 조건 비교: 왼쪽은 물이 적은 곳, 오른쪽은 물이 많은 곳. 비교 중에는 조건 줄과 등고선 보기를 숨긴다.
function setCompare(on) {
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 340 : 200;
  Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e });
  sun.shadow.camera.updateProjectionMatrix();
  document.body.classList.toggle('comparing', on);
  if (on) { panelBeforeCompare = document.body.classList.contains('panel-closed'); setPanel(true); }
  else setPanel(panelBeforeCompare);
  document.getElementById('compareBtn').classList.toggle('on', on);
  document.getElementById('sectionB').hidden = !on;
  document.getElementById('compareCap').hidden = !on;
  if (on) { setShowing('3d'); model.applyPreset('dry'); modelB.applyPreset('wet'); }
  else model.applyPreset('textbook');
  markOptions();
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.toggle('on', !on && o.dataset.preset === 'textbook'));
  setView(on ? 'compare' : 'oblique');
  frameSync(true);
  setPlaying(true);
}
document.getElementById('compareBtn').onclick = () => setCompare(!compare);
document.getElementById('compareEnd').onclick = () => setCompare(false);

let frame = 0;
function frameSync(all) {
  dirty = true;
  blockA.syncParticles();
  if (compare) blockB.syncParticles();
  if (all || frame % 2 === 0) { blockA.syncTerrain(); if (compare) blockB.syncTerrain(); }
  if (all || frame % 45 === 0) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 8 === 0) { drawSection(document.getElementById('section'), model); if (compare) drawSection(document.getElementById('sectionB'), modelB); syncInfo(); }
  if (all || frame % 45 === 0) drawMap();
  syncLabels();
}
// 계산이 없을 때는 다시 그리지 않는다. 계산이 필요한 때는 완성 전, 입자와 물방울이 남은 때, 완성 뒤 물이 자리 잡는 약 2초다.
const SETTLE_SECONDS = 2;
const busy = m => !m.finished || m.parcels.length > 0 || m.drops.length > 0;
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
    let remain = dt * speed;
    while (remain > 0) { const s = Math.min(remain, 1 / 30); model.tick(s); if (compare) modelB.tick(s); remain -= s; }
    frame++;
    frameSync(false);
  } else if (wasComputing) {
    frameSync(true); // 마지막 상태를 한 번 온전히 맞춘다.
  }
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
  advance(seconds) { setPlaying(false); for (let t = 0; t < seconds * 30; t++) { model.tick(1 / 30); if (compare) modelB.tick(1 / 30); } frameSync(true); renderer.render(scene, camera); return { clock: model.clock, flooding: model.flooding, means: model.meanDistances().map(v => +v.toFixed(1)), R: axisLength() }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  info: () => renderer.info.render,
};
window.__APP_READY = true;
